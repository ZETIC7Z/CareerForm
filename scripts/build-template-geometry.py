"""Derive the PDS field geometry and render one marker sheet page per file.

``tmp/map/geometry.json`` records the exact rectangle of every schema field's merged
cell measured in *sheet points* (column widths / row heights taken straight from the
workbook), and ``tmp/map/marked-<page>.svg`` is a real LibreOffice render of the same
workbook at the official A4 print setup with a unique ``Z0000Z`` marker inside every
field cell. Comparing the two gives the exact text boxes used by ``src/lib/pdf-map.json``.

Usage:  python scripts/build-template-geometry.py
"""
from pathlib import Path
import json, re, shutil, subprocess, zipfile
import xml.etree.ElementTree as ET
from importlib.machinery import SourceFileLoader

build_map = SourceFileLoader('build_map', str(Path(__file__).resolve().parent / 'build-pdf-map.py')).load_module()

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'csc-2026.xlsx'
OUT = ROOT / 'tmp' / 'map'
SOFFICE = 'C:/Program Files/LibreOffice/program/soffice.exe'
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
MDW = 7.0                      # max digit width in px (Calibri 11 @ 96 dpi)
PAGES = 4


def col_width_points(chars: float) -> float:
    """Excel column width (characters) → points, using the documented formula."""
    pixels = int((256 * chars + int(128 / MDW)) / 256 * MDW)
    return pixels * 72 / 96


def split_ref(ref: str):
    match = re.match(r'([A-Z]+)(\d+)', ref)
    col = 0
    for ch in match.group(1):
        col = col * 26 + (ord(ch) - 64)
    return col, int(match.group(2))


def parse_sheet(xml: str):
    root = ET.fromstring(xml)
    fmt = root.find(f'{{{NS}}}sheetFormatPr')
    default_w = float(fmt.get('defaultColWidth', '9.3359375')) if fmt is not None else 9.3359375
    default_h = float(fmt.get('defaultRowHeight', '12.75')) if fmt is not None else 12.75

    widths = {}
    for col in root.iter(f'{{{NS}}}col'):
        if col.get('hidden') == '1':
            value = 0.0
        elif col.get('width') is not None:
            value = float(col.get('width'))
        else:
            continue
        for index in range(int(col.get('min')), int(col.get('max')) + 1):
            widths[index] = value

    heights = {}
    for row in root.iter(f'{{{NS}}}row'):
        index = int(row.get('r'))
        if row.get('hidden') == '1':
            heights[index] = 0.0
        elif row.get('ht') is not None:
            heights[index] = float(row.get('ht'))

    merges = {}
    for merge in root.iter(f'{{{NS}}}mergeCell'):
        first, last = merge.get('ref').split(':')
        c1, r1 = split_ref(first)
        c2, r2 = split_ref(last)
        for c in range(c1, c2 + 1):
            for r in range(r1, r2 + 1):
                merges[(c, r)] = (c1, r1, c2, r2)

    max_col = max(widths) if widths else 1
    max_row = max(heights) if heights else 1
    xs = [0.0]
    for c in range(1, max_col + 42):
        xs.append(xs[-1] + col_width_points(widths.get(c, default_w)))
    ys = [0.0]
    for r in range(1, max_row + 12):
        ys.append(ys[-1] + heights.get(r, default_h))
    return xs, ys, merges


def rect_of(xs, ys, merges, ref: str):
    col, row = split_ref(ref)
    c1, r1, c2, r2 = merges.get((col, row), (col, row, col, row))
    return dict(left=xs[c1 - 1], top=ys[r1 - 1], right=xs[c2], bottom=ys[r2])


def build_marked(page: int, marker_start: int, fields):
    """Single-page marked workbook: only the requested sheet stays visible."""
    source = zipfile.ZipFile(SOURCE)
    items = {info.filename: source.read(info.filename) for info in source.infolist()}

    styles = ET.fromstring(items['xl/styles.xml'])
    fonts = styles.find(f'{{{NS}}}fonts')
    font = ET.SubElement(fonts, f'{{{NS}}}font')
    ET.SubElement(font, f'{{{NS}}}sz', val='5')
    ET.SubElement(font, f'{{{NS}}}name', val='Arial')
    font_id = len(fonts) - 1
    fonts.set('count', str(len(fonts)))
    xfs = styles.find(f'{{{NS}}}cellXfs')

    name = 'xl/worksheets/sheet%d.xml' % (page + 1)
    root = ET.fromstring(items[name])
    data = root.find(f'{{{NS}}}sheetData')
    markers = []
    for offset, field in enumerate(fields):
        index = marker_start + offset
        markers.append(dict(index=index, key=field['key'], page=page, cell=field['cell']))
        row_no = int(re.search(r'\d+', field['cell']).group(0))
        row = data.find(f'{{{NS}}}row[@r="{row_no}"]')
        if row is None:
            raise SystemExit('row %s missing on sheet %d' % (row_no, page))
        cell = row.find(f'{{{NS}}}c[@r="{field["cell"]}"]')
        if cell is None:
            cell = ET.SubElement(row, f'{{{NS}}}c', r=field['cell'])
        style = cell.get('s', '0')
        xf = ET.fromstring(ET.tostring(xfs[int(style)]))
        xf.set('fontId', str(font_id))
        xf.set('applyFont', '1')
        align = xf.find(f'{{{NS}}}alignment')
        if align is None:
            align = ET.SubElement(xf, f'{{{NS}}}alignment')
        align.attrib.clear()
        align.set('horizontal', 'left')
        align.set('vertical', 'center')
        xfs.append(xf)
        cell.clear()
        cell.set('r', field['cell'])
        cell.set('s', str(len(xfs) - 1))
        cell.set('t', 'inlineStr')
        ET.SubElement(ET.SubElement(cell, f'{{{NS}}}is'), f'{{{NS}}}t').text = 'Z%04dZ' % index
    items[name] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    xfs.set('count', str(len(xfs)))
    items['xl/styles.xml'] = ET.tostring(styles, encoding='utf-8', xml_declaration=True)

    # Drop every other sheet so the render is exactly one page.
    #
    # Hiding them is not enough: LibreOffice exports hidden sheets anyway, and because each
    # page is drawn at its own origin the resulting SVG holds every page on top of each
    # other — which silently mixes their captions into whatever measures text positions.
    book = items['xl/workbook.xml'].decode('utf-8')

    def drop(match):
        return match.group(0) if int(match.group(1)) == page + 1 else ''

    book = re.sub(r'<sheet [^>]*r:id="rId(\d+)"[^>]*/>', drop, book)
    # The workbook's names point at sheets that no longer exist, which makes the file
    # unreadable; the only name this render needs is the print area of the remaining sheet.
    _, title, last_row, last_col = build_map.print_area(SOURCE)[page]
    area = (0, title, last_row, last_col)
    block = '<definedNames>' + build_map.print_area_name(area) + '</definedNames>'
    if '<definedNames>' in book:
        book = re.sub(r'<definedNames>.*?</definedNames>', block, book, flags=re.S)
    else:
        book = book.replace('</sheets>', '</sheets>' + block, 1)
    items['xl/workbook.xml'] = book.encode('utf-8')
    for name in list(items):
        if re.fullmatch(r'xl/worksheets/sheet\d+\.xml', name) and name != 'xl/worksheets/sheet%d.xml' % (page + 1):
            del items[name]

    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / ('marked-%d.xlsx' % page)
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as out:
        for key, data in items.items():
            out.writestr(key, data)
    return target, markers


def convert(src: Path, fmt: str) -> Path:
    args = [SOFFICE, '-env:UserInstallation=file:///C:/tmp/lo-pds-profile', '--headless']
    if fmt == 'svg':
        args += ['--infilter=draw_pdf_import']
    args += ['--convert-to', fmt, '--outdir', str(src.parent), str(src)]
    subprocess.run(args, check=True, capture_output=True)
    return src.with_suffix('.' + fmt)


schema = json.loads((ROOT / 'src' / 'lib' / 'schema.json').read_text(encoding='utf8'))
source = zipfile.ZipFile(SOURCE)
geometry = {}
all_markers = []
for page in range(PAGES):
    name = 'xl/worksheets/sheet%d.xml' % (page + 1)
    if name not in source.namelist():
        continue
    xs, ys, merges = parse_sheet(source.read(name).decode('utf8'))
    fields = {}
    for field in schema['fields']:
        if field.get('cell') and field['page'] == page:
            fields[field['key']] = rect_of(xs, ys, merges, field['cell'])
    geometry[str(page)] = {'fields': fields, 'xs': xs[:24], 'ys': ys[:80]}

    ordered = [dict(key=key, cell=field['cell'])
               for field in schema['fields']
               if field.get('cell') and field['page'] == page
               for key in [field['key']]]

shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir(parents=True, exist_ok=True)

# Sheet sizes are read first, then each page is rendered on its own.
for page in range(PAGES):
    name = 'xl/worksheets/sheet%d.xml' % (page + 1)
    if name not in source.namelist():
        continue
    xs, ys, merges = parse_sheet(source.read(name).decode('utf8'))
    fields, field_rects = [], {}
    for field in schema['fields']:
        if field.get('cell') and field['page'] == page:
            fields.append(field)
            field_rects[field['key']] = rect_of(xs, ys, merges, field['cell'])
    geometry[str(page)] = {'fields': field_rects}
    book, markers = build_marked(page, len(all_markers), fields)
    all_markers.extend(markers)
    pdf = convert(book, 'pdf')
    convert(pdf, 'svg')
    print('page %d: %d fields, render %s' % (page, len(fields), pdf.name))

(OUT / 'geometry.json').write_text(
    json.dumps({'geometry': geometry, 'markers': all_markers, 'pages': PAGES}, indent=1),
    encoding='utf8')
print('total markers:', len(all_markers))
