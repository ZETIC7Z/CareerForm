"""Rebase every ``cell`` in ``src/lib/schema.json`` from the bundled workbook onto the
official CSC blank.

The workbook that shipped with the app is a *reflowed* variant of the genuine blank. The
correspondence between the two grids is measured from the printed captions rather than
guessed from cell numbers:

* every caption whose text appears exactly once in **both** workbooks is an anchor, and it
  contributes a row delta and a column delta;
* a schema cell moves by the delta of the anchors closest to it (rows first, then the
  column band it sits in), because the shifts are local — C1 shifts one row from the
  education table down, C2's signature block sits four rows higher, C3 swaps sections VI
  and VII, and C4's lower half is one column wider;
* a mapped cell that lands inside a merged range is snapped to that range's anchor, since
  that is the only cell a spreadsheet reads.

Every rebased field is then re-checked: the caption next to the *new* cell must still be
the caption that was next to the *old* one. Anything that fails is printed for review.

Usage:
    git show HEAD:assets/csc-2026.xlsx > tmp/reflowed.xlsx      # once
    python scripts/rebase-schema-cells.py                       # report only
    python scripts/rebase-schema-cells.py --write               # rewrite schema.json
"""
from pathlib import Path
import collections, json, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / 'src' / 'lib' / 'schema.json'
REFLOWED = ROOT / 'tmp' / 'reflowed.xlsx'
SHEETS = ['C1', 'C2', 'C3', 'C4']


def load_workbooks(official: Path):
    """Return (reflowed, official) openpyxl workbooks, exporting the reflowed one from git."""
    if not REFLOWED.exists():
        raw = subprocess.run(['git', 'show', 'HEAD:assets/csc-2026.xlsx'],
                             cwd=ROOT, capture_output=True, check=True).stdout
        REFLOWED.write_bytes(raw)
        print('exported the bundled workbook to', REFLOWED.relative_to(ROOT))
    import openpyxl
    return openpyxl.load_workbook(REFLOWED), openpyxl.load_workbook(official)


def split_ref(ref: str):
    match = re.match(r'([A-Z]+)(\d+)', ref)
    col = 0
    for ch in match.group(1):
        col = col * 26 + (ord(ch) - 64)
    return col, int(match.group(2))


def column_name(index: int) -> str:
    name = ''
    while index:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def captions_of(ws):
    """(col, row) → normalised caption text, for every string cell."""
    out = {}
    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and cell.value.strip():
                out[(cell.column, cell.row)] = ' '.join(cell.value.split())
    return out


def total_rows(workbook, name):
    return workbook[name].max_row


def text_index(captions):
    index = collections.defaultdict(list)
    for where, text in captions.items():
        index[text].append(where)
    return index


def lookup_columns(captions):
    """Columns that hold a long run of one-per-row values.

    Those are the workbook's data-validation source lists (countries, civil status, …).
    They are laid out independently of the printed form, so the rows they sit on carry no
    information about where a form row moved — using them as anchors derails the mapping.
    """
    by_column = collections.defaultdict(list)
    for (col, row), text in captions.items():
        by_column[col].append(row)
    excluded = set()
    for col, rows in by_column.items():
        rows.sort()
        run_start = previous = rows[0]
        for row in rows[1:] + [rows[-1] + 2]:
            if row - previous > 1:
                if previous - run_start + 1 >= 15:
                    for r in range(run_start, previous + 1):
                        excluded.add((col, r))
                run_start = row
            previous = row
    return excluded


def build_maps(reflowed, official):
    """Per sheet: the row and column deltas learned from the shared captions."""
    maps = {}
    for name in SHEETS:
        ours, theirs = captions_of(reflowed[name]), captions_of(official[name])
        ia, ib = text_index(ours), text_index(theirs)
        skip = lookup_columns(ours) | lookup_columns(theirs)
        row_votes = collections.defaultdict(collections.Counter)
        col_anchors = []                          # (row, col, delta) for the column bands
        for text, places in ia.items():
            if len(places) != 1 or len(ib.get(text, [])) != 1:
                continue
            (ca, ra) = places[0]
            if (ca, ra) in skip:
                continue
            (cb, rb) = ib[text][0]
            row_votes[ra][rb - ra] += 1
            col_anchors.append((ra, ca, cb - ca))
        row_delta = {row: votes.most_common(1)[0][0] for row, votes in row_votes.items()}
        maps[name] = dict(row_delta=row_delta, col_anchors=sorted(col_anchors),
                          rows=sorted(row_delta), looked_up=len(skip))
    return maps


def nearest(mapping: dict, keys: list, row: int, default: int) -> int:
    """The delta in force at ``row``.

    The anchor at or before the row wins rather than the closest one: a row inside a table
    belongs to the table's own block, and the next anchor below it is usually a different
    block (a continuation note, say) whose delta is a couple of rows out.
    """
    if not keys:
        return default
    import bisect
    position = bisect.bisect_right(keys, row)
    if position:
        return mapping[keys[position - 1]]
    return mapping[keys[0]]


def column_delta(anchors, row: int, col: int, band: int = 3) -> int:
    """The column shift in force around ``(row, col)``.

    A shift belongs to a band of rows *and* a region of columns, so only anchors in the
    neighbourhood may vote. A single non-zero vote is not enough: when a caption simply
    moved inside a wider merged cell (the official blank prints “VOCATIONAL / TRADE
    COURSE” across three columns, the reflowed one in a single cell) it looks like a column
    shift while the grid itself never moved.
    """
    votes = collections.Counter(a[2] for a in anchors
                                if abs(a[0] - row) <= band and abs(a[1] - col) <= 2)
    if not votes:
        return 0
    delta, count = votes.most_common(1)[0]
    return delta if delta == 0 or count >= 2 else 0


def merge_range(ws, col: int, row: int):
    for merged in ws.merged_cells.ranges:
        if merged.min_col <= col <= merged.max_col and merged.min_row <= row <= merged.max_row:
            return merged
    return None


def in_table(ws, row: int) -> bool:
    """Does this row carry table cell borders?

    Rows below a table look exactly like table rows in the cell values (both are empty), so
    the merged ranges are the only tell: a row of the printed table is made of merged data
    cells, while the blank space under the table has none. Writing a record there would put
    it outside the form's lines.
    """
    return any(m.min_row <= row <= m.max_row for m in ws.merged_cells.ranges)


def occupied(ws, col: int, row: int):
    """Is there already printed text in the cell (or the range) a field would write to?"""
    merged = merge_range(ws, col, row)
    if merged is None:
        value = ws.cell(row=row, column=col).value
        return isinstance(value, str) and bool(value.strip())
    for r in range(merged.min_row, merged.max_row + 1):
        for c in range(merged.min_col, merged.max_col + 1):
            value = ws.cell(row=r, column=c).value
            if isinstance(value, str) and value.strip():
                return True
    return False


def clamp_capacities(schema, had_cell, dropped):
    """Shrink a table's capacity to the records the official first sheet can hold.

    The bundled workbook crammed 28 work rows and 21 L&D rows onto its sheet; the official
    layout fits 24 and 7 before overflowing to sheets C6 and C5. Records past the capacity
    are listed on the PDF's additional-information page, but they must stop pointing at
    cells that now print the form's own captions.
    """
    report = []
    for key, table in schema['tables'].items():
        records = sorted({int(f['key'].split('.')[1]) for f in schema['fields']
                          if f['key'].startswith(key + '.') and f['key'].split('.')[1].isdigit()})
        complete = 0
        for index in records:
            fields = [f for f in schema['fields'] if f['key'].startswith('%s.%d.' % (key, index))]
            if not fields:
                break
            if all(f.get('cell') or not had_cell.get(f['key']) for f in fields):
                complete += 1
            else:
                break
        before = table.get('capacity')
        if complete and before and complete < before:
            table['capacity'] = complete
            report.append((key, before, complete))
    return report


def merge_anchor(ws, col: int, row: int):
    for merged in ws.merged_cells.ranges:
        if merged.min_col <= col <= merged.max_col and merged.min_row <= row <= merged.max_row:
            return merged.min_col, merged.min_row
    return col, row


def neighbourhood(captions, col: int, row: int):
    """The captions that identify a cell: nearest to its left, then nearest above it."""
    left = None
    for c in range(col - 1, max(1, col - 15) - 1, -1):
        if (c, row) in captions:
            left = captions[(c, row)]
            break
    above = None
    for r in range(row - 1, max(1, row - 5) - 1, -1):
        for c in range(max(1, col - 3), col + 4):
            if (c, r) in captions:
                above = captions[(c, r)]
                break
        if above:
            break
    return left, above


def main() -> None:
    write = '--write' in sys.argv
    official_path = next((a for a in sys.argv[1:] if a.endswith('.xlsx')), None)
    official_path = Path(official_path) if official_path else ROOT / 'assets' / 'csc-2026.xlsx'

    reflowed, official = load_workbooks(official_path)
    maps = build_maps(reflowed, official)
    # Always rebase the committed schema, so re-running the script can never compound an
    # earlier mapping.
    committed = subprocess.run(['git', 'show', 'HEAD:src/lib/schema.json'],
                               cwd=ROOT, capture_output=True)
    schema = json.loads(committed.stdout.decode('utf8') if committed.returncode == 0
                        else SCHEMA.read_text(encoding='utf8'))

    had_cell = {f['key']: bool(f.get('cell')) for f in schema['fields']}
    moved, unchanged, failed, stranded, lost = [], 0, [], [], []
    for field in schema['fields']:
        ref = field.get('cell')
        if not ref:
            continue
        page = field['page']
        name = SHEETS[page]
        col, row = split_ref(ref)
        info = maps[name]
        new_row = row + nearest(info['row_delta'], info['rows'], row, 0)
        new_col = col + column_delta(info['col_anchors'], row, col)
        new_col, new_row = merge_anchor(official[name], new_col, new_row)
        target = column_name(new_col) + str(new_row)
        if in_table(reflowed[name], row) and not in_table(official[name], new_row):
            # The row moved into the blank space under the official table.
            stranded.append((name, ref, field['key'], target))
            field.pop('cell', None)
            lost.append((name, ref, field['key'], target))
            continue
        if occupied(official[name], new_col, new_row):
            # The caption is printed *inside* many data cells of this form, so a target that
            # was already occupied before the rebase is normal; a target that only became
            # occupied is a row the official blank spends on the form's own text and the
            # field has no home on this sheet any more.
            if occupied(reflowed[name], col, row):
                pass
            else:
                stranded.append((name, ref, field['key'], target))
                field.pop('cell', None)
                lost.append((name, ref, field['key'], target))
                continue

        ours_caps, theirs_caps = captions_of(reflowed[name]), captions_of(official[name])
        old_context = neighbourhood(ours_caps, col, row)
        new_context = neighbourhood(theirs_caps, new_col, new_row)
        tokens = lambda s: set(re.findall(r'[a-z]{3,}', (s or '').lower()))
        shared = any(tokens(a) & tokens(b)
                     for a in old_context if a for b in new_context if b)
        identical = [a or '' for a in old_context] == [b or '' for b in new_context]
        # Section numbers legitimately change: the official blank numbers L&D 29 and
        # voluntary work 30, the reflowed one has them the other way round.
        numbers = [c for c in (*old_context, *new_context) if c]
        renumbered = bool(numbers) and all(re.fullmatch(r'\d+\.?', c) for c in numbers)
        if any(old_context) and not (shared or identical or renumbered):
            failed.append((name, ref, column_name(new_col) + str(new_row), field['key'],
                           ' | '.join(x for x in old_context if x), ' | '.join(x for x in new_context if x)))

        new_ref = target
        if new_ref == ref:
            unchanged += 1
        else:
            moved.append((name, ref, new_ref, field['key']))
            field['newCell'] = new_ref

    for name in SHEETS:
        deltas = collections.Counter(maps[name]['row_delta'].values())
        print('  %-3s anchors %-4d of %d rows, row deltas %s, lookup cells skipped %d' % (
            name, len(maps[name]['row_delta']), total_rows(reflowed, name), dict(deltas),
            maps[name]['looked_up']))
    print('cells checked: %d, moved: %d, unchanged: %d, context mismatches: %d'
          % (len(moved) + unchanged + len(failed), len(moved), unchanged, len(failed)))
    for entry in moved[:12]:
        print('   %-3s %-6s -> %-6s  %s' % entry)
    if len(moved) > 12:
        print('   … %d more' % (len(moved) - 12))
    for entry in failed[:20]:
        print('   MISMATCH %-3s %-6s -> %-6s %-26s %s  =>  %s' % entry)
    if len(failed) > 20:
        print('   … %d more mismatches' % (len(failed) - 20))

    # Apply the mapped cells first: the capacity pass below must see the new coordinates,
    # not the ones the reflowed workbook used.
    for field in schema['fields']:
        if 'newCell' in field:
            field['cell'] = field.pop('newCell')

    capacities = clamp_capacities(schema, had_cell, lost)
    # Records past the capacity are listed on the PDF's additional-information page, so their
    # cells must go: leaving them behind would write those records into whatever the official
    # sheet prints further down (the continuation note, the signature block).
    limits = {key: table['capacity'] for key, table in schema['tables'].items()}
    dropped_past_capacity = 0
    for field in schema['fields']:
        parts = field['key'].split('.')
        if len(parts) > 2 and parts[1].isdigit() and int(parts[1]) >= limits.get(parts[0], 10 ** 6):
            if field.pop('cell', None):
                dropped_past_capacity += 1
    print('cells cleared because their record is past the sheet capacity: %d' % dropped_past_capacity)
    print('fields with no free cell on the official blank: %d' % len(stranded))
    print('table capacities clamped to the official first sheet: %s'
          % ', '.join('%s %s→%s' % row for row in capacities))
    for name, ref, key, target in stranded[:64]:
        print('   %-3s %-6s -> %-6s %s (the official form prints text there)' % (name, ref, target, key))
    if len(stranded) > 64:
        print('   … %d more' % (len(stranded) - 64))

    if write:
        SCHEMA.write_text(json.dumps(schema, indent=2) + '\n', encoding='utf8')
        print('wrote', SCHEMA.relative_to(ROOT))
    else:
        print('report only — pass --write to rewrite src/lib/schema.json')


if __name__ == '__main__':
    main()
