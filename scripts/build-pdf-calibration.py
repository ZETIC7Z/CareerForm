"""Move the hand-tuned overlay constants from the old folio template onto the official blank.

``src/lib/pdf.ts`` still carries a few coordinates that were tuned by hand against the
previous 8in x 14in template: the signature and date cells and the "details" boxes of the
declaration questions. Those coordinates are still the right *intent*, so each one is
converted through worksheet space — legacy page → worksheet point (measured from the old
map) → official page (measured from the new render).

The tick lists are *not* converted: the official blank draws its own check boxes and the
rendered page is the only place their true position exists, so each mark is anchored to the
box it belongs to (see ``derive_ticks``). The VOCATIONAL / TRADE COURSE patch the previous
template needed is gone as well — the official blank prints that row correctly.

Usage:
    git show <rev>:src/lib/pdf-map.json   # must still be available as the legacy map
    python scripts/build-pdf-calibration.py
"""
from pathlib import Path
import json, re, statistics, subprocess, sys
from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / 'tmp' / 'map'
build_map = SourceFileLoader('build_map', str(ROOT / 'scripts' / 'build-pdf-map.py')).load_module()

LEGACY_HEIGHT = 1008.0                  # 8in x 14in template, in points
OFFICIAL_HEIGHT = 841.889763779528      # A4
LEGACY_REVISION = 'HEAD'                # revision the tuned constants belong to

# The printed caption of every tick box, exactly as the blank renders it. The mark is
# anchored to the box next to that caption.
TICK_LABELS = {
    'sex': [('Male', 'Male'), ('Female', 'Female')],
    'civilStatus': [('Single', 'Single'), ('Married', 'Married'), ('Widowed', 'Widowed'),
                    ('Separated', 'Separated'), ('Other', 'Other/s:')],
    'citizenship': [('Filipino', 'Filipino'), ('Dual Citizenship', 'Dual Citizenship')],
    'citizenshipBasis': [('By birth', 'by birth'), ('By naturalization', 'by naturalization')],
}
TICK_INSET = 0.9        # where the mark starts inside its box, as on the previous template
BOX_LABEL_GAP = 22      # a box and its caption are never further apart than this
# The render also emits each box's own glyph as a text run, which decodes to things like
# "0" or "FALSE". Those sit right against the box and would steal the caption's place.
GLYPH_ARTIFACTS = re.compile(r'^(?:FALSE|TRUE|\d+)$')

# Everything pdf.ts hardcodes for the previous template, verbatim.
LEGACY = {
    'boxes': {
        'citizenshipCountry': [0, 445, 184, 115, 10],
        'civilOther': [0, 135, 234, 115, 10],
        # Declaration case details: their worksheet cells are the non-anchor half of a
        # merged range, so they have no field box and are still drawn explicitly.
        'caseDate': [3, 469, 182, 90, 10],
        'caseStatus': [3, 444, 195, 116, 10],
    },
    'questionDetailY': [91, 101, 139, 180, 231, 268, 302, 327, 359, 424, 446, 468],
    'signatureBoxes': [
        [0, 98, 764.5, 260, 16.5], [1, 93, 768.0, 186, 17.5],
        [2, 140, 753.5, 203, 15.5], [3, 238, 630.0, 202, 44.0],
    ],
    'dateBoxes': [
        [0, 432, 764.5, 132, 16.5], [1, 356, 768.0, 218, 17.5],
        [2, 441, 753.5, 130, 15.5], [3, 238, 684.8, 202, 7.8],
    ],
}


def derive_ticks(page: int, boxes, runs):
    """Anchor each tick mark to the check box its caption belongs to.

    A box and its caption are side by side on one line: the caption starts just right of the
    box and is vertically centred on it. Anything further away belongs to another box.
    """
    def caption_for(box):
        """The caption of this box: sitting on its line, and centred on it.

        The horizontal gap alone would be misled — the form prints other short captions (a
        stray YES/NO pair, for instance) whose text happens to start closer to the box.
        """
        centre = box['y'] + box['h'] / 2
        best = None
        for run in runs:
            if not run['text'] or GLYPH_ARTIFACTS.match(run['text']):
                continue
            offset = abs((run['baseline'] - run['size'] * build_map.MARKER_ASCENT) - centre)
            if offset > box['h'] / 2 + 1.2:
                continue
            gap = run['x'] - (box['x'] + box['w'])
            if not (-1 <= gap <= BOX_LABEL_GAP):
                continue
            score = (round(offset, 2), gap)
            if best is None or score < best[0]:
                best = (score, run['text'])
        return best[1] if best else None

    marks = {}
    for box in boxes:
        text = caption_for(box)
        if text:
            marks.setdefault(text, box)
    return marks


def checked_marks(svg: Path):
    boxes = build_map.vector_boxes(svg)
    runs = build_map.collect_text(svg)
    return derive_ticks(0, boxes, runs), boxes, runs


def legacy_map():
    raw = subprocess.run(['git', 'show', '%s:src/lib/pdf-map.json' % LEGACY_REVISION],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(raw)


def legacy_calibration(info, old_map, page: int):
    """Worksheet point → legacy PDF point for one page, calibrated per column and row.

    Each page is a separate worksheet with its own grid, so the calibration is always
    built per page — pooling two sheets would destroy the monotonicity it relies on.
    """
    by_left, by_centre = {}, {}
    for key, cell in info['geometry'][str(page)]['fields'].items():
        box = old_map.get(key)
        if not box or box['page'] != page:
            continue
        by_left.setdefault(round(cell['left'], 2), []).append(box['x'] + 2)
        by_centre.setdefault(round((cell['top'] + cell['bottom']) / 2, 2), []).append(box['y'] + box['h'] / 2 + 3)
    if len(by_left) < 2 or len(by_centre) < 2:
        raise SystemExit('page %d: not enough legacy anchors' % page)
    gx = build_map.interpolator([(e, statistics.median(v)) for e, v in by_left.items()])
    gy = build_map.interpolator([(e, statistics.median(v)) for e, v in by_centre.items()])
    sheet_x = sorted({round(c['left'], 2) for c in info['geometry'][str(page)]['fields'].values()})
    sheet_y = sorted({round((c['top'] + c['bottom']) / 2, 2)
                      for c in info['geometry'][str(page)]['fields'].values()})
    return gx, gy, build_map.interpolator([(gx(s), s) for s in sheet_x]), \
        build_map.interpolator([(gy(s), s) for s in sheet_y])


def official_calibration(page, info, markers):
    cells = info['geometry'][str(page)]['fields']
    by_left, by_centre = {}, {}
    for run in build_map.collect_text(MAP / ('marked-%d.svg' % page)):
        match = re.fullmatch(r'Z(\d{4})Z', run['text'] or '')
        if not match:
            continue
        marker = markers.get(int(match.group(1)))
        if not marker or marker['page'] != page:
            continue
        cell = cells.get(marker['key'])
        if not cell:
            continue
        by_left.setdefault(round(cell['left'], 2), []).append(run['x'])
        by_centre.setdefault(round((cell['top'] + cell['bottom']) / 2, 2), []).append(
            run['baseline'] - run['size'] * build_map.MARKER_ASCENT)
    gx = build_map.interpolator([(e, statistics.median(v) - build_map.CELL_PAD) for e, v in by_left.items()])
    gy = build_map.interpolator([(e, statistics.median(v)) for e, v in by_centre.items()])
    return gx, gy


def main() -> None:
    info = json.loads((MAP / 'geometry.json').read_text(encoding='utf8'))
    markers = {m['index']: m for m in info['markers']}
    old_map = legacy_map()

    official = {page: official_calibration(page, info, markers) for page in range(info['pages'])}
    legacy = {page: legacy_calibration(info, old_map, page) for page in range(info['pages'])}

    def convert(page: int, x: float, y_top: float):
        """Legacy top-down point → official A4 point, routed through worksheet space."""
        _, _, to_sheet_x, to_sheet_y = legacy[page]
        gx, gy = official[page]
        return gx(to_sheet_x(x)), gy(to_sheet_y(y_top))

    def rect(page, x, y, w, h):
        """Convert a legacy top-down rectangle into an official A4 one."""
        ax, ay = convert(page, x, y)
        bx, by = convert(page, x + w, y + h)
        return [page, round(ax, 2), round(ay, 2), round(abs(bx - ax), 2), round(abs(by - ay), 2)]

    output = {'page': {'width': build_map.PAGE_POINTS, 'height': OFFICIAL_HEIGHT},
              'ticks': {}, 'boxes': {}, 'questionTicks': [], 'questionDetailY': [],
              'signatureBoxes': [], 'dateBoxes': []}

    # Tick marks are anchored to the check boxes the blank actually prints, not converted.
    marks, _boxes, _runs = checked_marks(MAP / 'marked-0.svg')
    for group, entries in TICK_LABELS.items():
        group_marks = []
        for value, caption in entries:
            box = marks.get(caption)
            if box is None:
                raise SystemExit('no check box found next to %r' % caption)
            group_marks.append([value, round(box['x'] + TICK_INSET, 2), round(box['y'], 2)])
        output['ticks'][group] = group_marks

    for name, (page, x, y, w, h) in LEGACY['boxes'].items():
        output['boxes'][name] = rect(page, x, y, w, h)

    # The declaration page is a two-column answer table: the YES and NO captions head the
    # two columns once, and every question then has one box in each. So the columns are
    # measured from those headings and each row is read off them.
    question_boxes = build_map.vector_boxes(MAP / 'marked-3.svg')
    question_runs = build_map.collect_text(MAP / 'marked-3.svg')
    headings = derive_ticks(3, question_boxes, question_runs)
    if 'YES' not in headings or 'NO' not in headings:
        raise SystemExit('the answer-column headings were not found on the declaration page')
    yes_column, no_column = headings['YES']['x'], headings['NO']['x']
    rows = {}
    for box in question_boxes:
        if abs(box['x'] - yes_column) <= 3 or abs(box['x'] - no_column) <= 3:
            rows.setdefault(round(box['y'] / 5), []).append(box)
    output['questionTicks'] = []
    for _, pair in sorted(rows.items()):
        if len(pair) < 2:
            continue
        pair.sort(key=lambda b: b['x'])
        output['questionTicks'].append([round(pair[0]['x'] + TICK_INSET, 2),
                                        round(pair[-1]['x'] + TICK_INSET, 2),
                                        round(pair[0]['y'], 2)])
    if len(output['questionTicks']) != 12:
        raise SystemExit('expected 12 declaration rows, found %d' % len(output['questionTicks']))
    output['questionDetailY'] = [round(convert(3, 443, y)[1], 2) for y in LEGACY['questionDetailY']]
    output['signatureBoxes'] = [rect(*entry) for entry in LEGACY['signatureBoxes']]
    output['dateBoxes'] = [rect(*entry) for entry in LEGACY['dateBoxes']]

    target = ROOT / 'src' / 'lib' / 'pdf-calibration.json'
    target.write_text(json.dumps(output, indent=2) + '\n', encoding='utf8')
    print('wrote %s' % target.relative_to(ROOT))
    print('ticks     :', {group: entries for group, entries in output['ticks'].items()})
    print('questions :', output['questionTicks'][:3], '…')
    print('signature :', output['signatureBoxes'])
    print('date      :', output['dateBoxes'])


if __name__ == '__main__':
    main()
