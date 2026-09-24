"""Derive ``src/lib/pdf-map.json`` from a real A4 render of the official form.

Every field cell gets a unique ``Z0000Z`` marker, the sheet is printed with the official
A4 setup, and the rendered marker tells us exactly where that cell landed on the page.
Because the official form stacks tables whose rules overlap, asking "which borders
surround this marker" is ambiguous; instead the marker positions calibrate the mapping
from worksheet points to PDF points, one anchor per column and per row. Rows are rounded
to device pixels by the print engine, which is precisely why this has to be measured on
the page instead of computed from the workbook.

Usage:  python scripts/build-pdf-map.py
"""
from pathlib import Path
import json, math, re, statistics
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / 'tmp' / 'map'
SVG_NS = '{http://www.w3.org/2000/svg}'
PAGE_POINTS = 595.303937007874          # A4 width; the SVG viewBox spans 21001 units
VIEWBOX_UNITS = 21001.0
UNIT = PAGE_POINTS / VIEWBOX_UNITS      # SVG unit (0.01 mm) → PDF point
CELL_PAD = 0.9                          # cell text inset, subtracted from mapped edges
MARKER_ASCENT = 0.35                    # baseline → visual centre of a text run


def parse_transform(value):
    a, b, c, d, e, f = 1.0, 0.0, 0.0, 1.0, 0.0, 0.0
    for name, args in re.findall(r'(\w+)\s*\(([^)]*)\)', value or ''):
        nums = [float(v) for v in re.split(r'[,\s]+', args.strip()) if v]
        if name == 'translate':
            e += nums[0] * a + (nums[1] if len(nums) > 1 else 0.0) * c
            f += nums[0] * b + (nums[1] if len(nums) > 1 else 0.0) * d
        elif name == 'matrix':
            na, nb, nc, nd, ne, nf = nums
            a, b, c, d, e, f = (na * a + nb * c, na * b + nb * d,
                                nc * a + nd * c, nc * b + nd * d,
                                ne * a + nf * c + e, ne * b + nf * d + f)
        elif name == 'scale':
            sx, sy = nums[0], nums[-1]
            a, b, c, d = a * sx, b * sx, c * sy, d * sy
    return a, b, c, d, e, f


def compose(outer, inner):
    a, b, c, d, e, f = outer
    na, nb, nc, nd, ne, nf = inner
    return (na * a + nb * c, na * b + nb * d, nc * a + nd * c,
            nc * b + nd * d, ne * a + nf * c + e, ne * b + nf * d + f)


def collect_text(path: Path):
    """Every rendered text run of an SVG, in PDF points measured from the top-left."""
    root = ET.parse(path).getroot()
    runs = []

    def size_of(el, fallback):
        for node in [el, *list(el.iter())]:
            value = node.get('font-size')
            if value:
                return float(re.sub(r'[^0-9.]', '', value) or 10)
        return fallback

    def walk(el, matrix, skipped, inherited):
        tag = el.tag.replace(SVG_NS, '')
        if tag in ('defs', 'glyph', 'font', 'clipPath', 'symbol', 'mask') or 'BoundingBox' in (el.get('class') or ''):
            skipped = True
        size = el.get('font-size') or inherited
        if el.get('transform'):
            matrix = compose(matrix, parse_transform(el.get('transform')))
        for child in el:
            walk(child, matrix, skipped, size)
        if skipped or tag != 'text':
            return
        positions = [c for c in el.iter()
                     if c.tag.endswith('tspan') and c.get('x') is not None and c.get('y') is not None]
        for anchor in (positions or [el]):
            content = ''.join(c.text or '' for c in anchor.iter() if c.tag.endswith('tspan'))
            x, y = float(anchor.get('x') or 0), float(anchor.get('y') or 0)
            tx = matrix[0] * x + matrix[2] * y + matrix[4]
            ty = matrix[1] * x + matrix[3] * y + matrix[5]
            runs.append(dict(text=content.strip(), x=tx * UNIT, baseline=ty * UNIT,
                             size=size_of(anchor, 10.0) * UNIT * math.hypot(matrix[0], matrix[1])))
    walk(root, (1, 0, 0, 1, 0, 0), False, None)
    return runs


def print_area(book: Path) -> list:
    """Per page sheet: (index, title, last row, last column) of the form's own extent.

    A sheet's used range is not its printed extent — `A1:R265` is the country pick-list, not
    the form — so the extent is read off the sheet's own footer, which prints across the
    bottom row of every page of the form. Without it a single sheet exports as several pages.
    """
    import openpyxl
    workbook = openpyxl.load_workbook(book)
    areas = []
    for index, sheet in enumerate(workbook.worksheets):
        row = column = 1
        for line in sheet.iter_rows():
            for cell in line:
                if isinstance(cell.value, str) and cell.value.strip().startswith('CS FORM 212'):
                    row, column = cell.row, max(column, cell.column)
        for merged in sheet.merged_cells.ranges:
            if merged.min_row == row:
                column = max(column, merged.max_col)
        areas.append((index, sheet.title, row, column))
    return areas


def print_area_name(entry) -> str:
    index, title, row, column = entry
    return "<definedName name=\"_xlnm.Print_Area\" localSheetId=\"%d\">'%s'!$A$1:$%s$%d</definedName>" % (
        index, title, chr(64 + column), row)


def vector_boxes(path: Path, min_size: float = 4.0, max_size: float = 9.0):
    """Every small square the page draws, in PDF points measured from the top-left.

    These are the form's check boxes. They are workbook *shapes*, not cells, so the rendered
    page is the only place their true position exists — which is exactly why the tick marks
    are anchored to them instead of being carried over from the previous template.
    """
    root = ET.parse(path).getroot()
    found = []

    def corners(el, matrix):
        def apply(x, y):
            return ((matrix[0] * x + matrix[2] * y + matrix[4]) * UNIT,
                    (matrix[1] * x + matrix[3] * y + matrix[5]) * UNIT)
        tag = el.tag.replace(SVG_NS, '')
        if tag == 'rect':
            x, y = float(el.get('x') or 0), float(el.get('y') or 0)
            w, h = float(el.get('width') or 0), float(el.get('height') or 0)
            return [apply(x, y), apply(x + w, y + h)]
        if tag in ('path', 'polygon'):
            values = re.findall(r'-?\d+\.?\d*', el.get('d') or el.get('points') or '')
            numbers = [float(v) for v in values]
            if len(numbers) >= 4 and len(numbers) % 2 == 0:
                return [apply(numbers[i], numbers[i + 1]) for i in range(0, len(numbers), 2)]
        return None

    def walk(el, matrix, skipped):
        tag = el.tag.replace(SVG_NS, '')
        if tag in ('defs', 'glyph', 'font', 'clipPath', 'symbol', 'mask'):
            skipped = True
        if el.get('transform'):
            matrix = compose(matrix, parse_transform(el.get('transform')))
        points = None if skipped else corners(el, matrix)
        if points:
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            w, h = max(xs) - min(xs), max(ys) - min(ys)
            if min_size <= w <= max_size and min_size <= h <= max_size:
                found.append(dict(x=min(xs), y=min(ys), w=w, h=h))
        for child in el:
            walk(child, matrix, skipped)

    walk(root, (1, 0, 0, 1, 0, 0), False)

    # A box is drawn as an outer rectangle plus an inset one; keep the largest per centre.
    kept = {}
    for box in found:
        centre = (round(box['x'], 1), round(box['y'], 1))
        if centre not in kept or box['w'] > kept[centre]['w']:
            kept[centre] = box
    return sorted(kept.values(), key=lambda b: (b['y'], b['x']))


def interpolator(points):
    """Piecewise-linear, monotone map through (input, output) anchors, with extrapolation."""
    pts = sorted(points)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]

    def evaluate(value):
        if value <= xs[0]:
            return ys[0] + (value - xs[0]) * ((ys[1] - ys[0]) / (xs[1] - xs[0]) if len(xs) > 1 else 1.0)
        if value >= xs[-1]:
            return ys[-1] + (value - xs[-1]) * ((ys[-1] - ys[-2]) / (xs[-1] - xs[-2]) if len(xs) > 1 else 1.0)
        index = max(i for i, x in enumerate(xs) if x <= value)
        span = xs[index + 1] - xs[index]
        ratio = 0.0 if span == 0 else (value - xs[index]) / span
        return ys[index] + ratio * (ys[index + 1] - ys[index])

    return evaluate


def build_page(page: int, info: dict, markers: dict):
    cells = info['geometry'][str(page)]['fields']
    runs = collect_text(MAP / ('marked-%d.svg' % page))
    measured = {}
    for run in runs:
        match = re.fullmatch(r'Z(\d{4})Z', run['text'] or '')
        if not match:
            continue
        marker = markers.get(int(match.group(1)))
        if not marker or marker['page'] != page:
            continue
        cell = cells.get(marker['key'])
        if cell:
            measured[marker['key']] = (cell, run)

    # One anchor per distinct column edge / row centre, using the median of every
    # marker that shares it — this filters out print-engine rounding of single rows.
    by_left, by_right, by_centre = {}, {}, {}
    for cell, run in measured.values():
        by_left.setdefault(round(cell['left'], 2), []).append(run['x'])
        by_right.setdefault(round(cell['right'], 2), []).append(run['x'])
        by_centre.setdefault(round((cell['top'] + cell['bottom']) / 2, 2), []).append(
            run['baseline'] - run['size'] * MARKER_ASCENT)

    left_anchors = [(edge, statistics.median(v) - CELL_PAD) for edge, v in by_left.items()]
    centre_anchors = [(edge, statistics.median(v)) for edge, v in by_centre.items()]
    gx = interpolator(left_anchors)
    gy = interpolator(centre_anchors)

    # The right edge sits between the next column's anchor and ours; extrapolating the
    # local slope from the left anchors keeps merged cells correctly wide.
    def right_edge(cell):
        return gx(cell['right'])

    def top_edge(cell):
        centre = (cell['top'] + cell['bottom']) / 2
        height = cell['bottom'] - cell['top']
        scale = 1.0
        if height:
            scale = (gy(centre + height / 2) - gy(centre - height / 2)) / height
        return gy(centre) - height * scale / 2

    boxes, widths = {}, []
    for key, (cell, _) in measured.items():
        left, right = gx(cell['left']), right_edge(cell)
        top, bottom = top_edge(cell), top_edge(cell) + (cell['bottom'] - cell['top'])
        height = cell['bottom'] - cell['top'] - 2 - 3
        box = dict(page=page, x=round(left + 2, 2), y=round(top + 2, 2),
                   w=round(max(4, right - left - 4), 2), h=round(max(5, height), 2))
        boxes[key] = box
        widths.append(box['w'])
    return boxes


def main() -> None:
    info = json.loads((MAP / 'geometry.json').read_text(encoding='utf8'))
    markers = {m['index']: m for m in info['markers']}
    boxes = {}
    for page in range(info['pages']):
        page_boxes = build_page(page, info, markers)
        print('page %d: %d boxes' % (page, len(page_boxes)))
        boxes.update(page_boxes)

    widths = [b['w'] for b in boxes.values()]
    heights = [b['h'] for b in boxes.values()]
    print('width %.1f..%.1f  height %.1f..%.1f  degenerate %d'
          % (min(widths), max(widths), min(heights), max(heights),
             sum(1 for w in widths if w <= 0) + sum(1 for h in heights if h <= 0)))

    target = ROOT / 'src' / 'lib' / 'pdf-map.json'
    target.write_text(json.dumps(boxes, indent=2, sort_keys=True) + '\n', encoding='utf8')
    print('wrote %s with %d boxes' % (target.relative_to(ROOT), len(boxes)))


if __name__ == '__main__':
    main()
