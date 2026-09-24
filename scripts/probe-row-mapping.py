"""Probe the row correspondence between the bundled workbook and the authentic blank.

The bundled `assets/csc-2026.xlsx` turned out to be a reflowed variant of the official
form: on C3 sections VI and VII are swapped, several rows shifted, and some C1 captions
were lost. Before rebasing the field map onto the official blank we need to know how
cleanly each row of the old layout matches a row of the official one.

Usage:  python scripts/probe-row-mapping.py "C:/path/to/csc_pds_blank.xlsx"
"""
from pathlib import Path
import sys
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ['C1', 'C2', 'C3', 'C4']


def profile(ws):
    """Row → the set of caption strings printed on that row."""
    rows = {}
    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and cell.value.strip():
                rows.setdefault(cell.row, []).append(' '.join(cell.value.split()))
    return rows


def similarity(a, b):
    tokens = set(' '.join(a).lower().split())
    other = set(' '.join(b).lower().split())
    if not tokens or not other:
        return 0.0
    return len(tokens & other) / len(tokens | other)


def main() -> None:
    official = openpyxl.load_workbook(sys.argv[1] if len(sys.argv) > 1 else 'csc_pds_blank.xlsx')
    current = openpyxl.load_workbook(ROOT / 'assets' / 'csc-2026.xlsx')

    for name in SHEETS:
        ours = profile(current[name])
        theirs = profile(official[name])
        print('=== %s  ours %d caption rows, official %d' % (name, len(ours), len(theirs)))
        ambiguous = 0
        for row in sorted(ours):
            best, score = None, 0.0
            for target, captions in theirs.items():
                candidate = similarity(ours[row], captions)
                if candidate > score:
                    best, score = target, candidate
            marker = 'exact' if score > 0.999 else ('ok' if score > 0.5 else 'WEAK')
            if score <= 0.5:
                ambiguous += 1
            print('   ours r%-3d -> official r%-3s  %-5s  %s' % (row, best, marker, ' | '.join(ours[row])[:66]))
        print('   rows with no confident match:', ambiguous)


if __name__ == '__main__':
    main()
