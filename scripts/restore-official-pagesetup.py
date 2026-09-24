"""Restore the OFFICIAL CSC CS Form 212 print setup in the bundled PDS workbooks.

The workbook shipped with the app had its sheet print settings rewritten to a
non-standard 8in x 14in "folio" page with a 70% scale. Excel's own export of the
form uses A4 portrait at 100% scale, so every PDF/XLSX we produced came out with
the wrong page size and clipped pages.

This script copies the exact `<printOptions>`, `<pageMargins>`, `<pageSetup>` and
`<headerFooter>` values used by the genuine CSC template into the real (sheet
level) print settings of every page sheet, leaving `customSheetViews` untouched.

Usage:  python scripts/restore-official-pagesetup.py
"""
from pathlib import Path
import re, shutil, zipfile

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT / 'assets' / 'csc-2026.xlsx', ROOT / 'public' / 'csc-2026.xlsx']
SHEETS = ['xl/worksheets/sheet%d.xml' % i for i in range(1, 6)]

# Byte-for-byte copy of the genuine CSC workbook print settings (A4 portrait, 100%).
PRINT_OPTIONS = ('<printOptions headings="false" gridLines="false" gridLinesSet="true" '
                 'horizontalCentered="true" verticalCentered="false"/>')
PAGE_MARGINS = ('<pageMargins left="0.15" right="0.120138888888889" top="0.359722222222222" '
                'bottom="0.120138888888889" header="0.511811023622047" footer="0.511811023622047"/>')
PAGE_SETUP = ('<pageSetup paperSize="9" scale="100" fitToWidth="1" fitToHeight="1" '
              'pageOrder="downThenOver" orientation="portrait" blackAndWhite="false" '
              'draft="false" cellComments="none" horizontalDpi="300" verticalDpi="300" copies="1"/>')

# Page order in a worksheet XML: sheetPr, dimension, sheetViews, sheetFormatPr,
# cols, sheetData, ..., then printOptions/pageMargins/pageSetup/headerFooter.
TAIL = re.compile(r'<printOptions\b[^>]*/>|<pageMargins\b[^>]*/>|<pageSetup\b[^>]*/>'
                  r'|<headerFooter\b[^>]*>.*?</headerFooter>|<headerFooter\b[^>]*/>', re.S)
CHECK = re.compile(r'<pageSetup\b[^>]*/>')


BLOCK = (PRINT_OPTIONS + PAGE_MARGINS + PAGE_SETUP +
         '<headerFooter differentFirst="false" differentOddEven="false">'
         '<oddHeader></oddHeader><oddFooter></oddFooter></headerFooter>')


def patch(xml: str) -> tuple[str, bool]:
    """Rewrite only the print settings that follow customSheetViews.

    Returns (xml, changed). The print settings always form one contiguous run
    (`printOptions`, `pageMargins`, `pageSetup`, `headerFooter`) placed just
    before the drawing/controls parts, so the whole run is swapped atomically.
    """
    marker = xml.find('</customSheetViews>')
    head, tail = (xml[:marker], xml[marker:]) if marker >= 0 else ('', xml)

    matches = list(TAIL.finditer(tail))
    if not matches:
        return xml, False

    start, end = matches[0].start(), matches[-1].end()
    # Guard: the run must not swallow other worksheet elements.
    if TAIL.sub('', tail[start:end]).strip():
        raise SystemExit('print settings are interleaved with other elements')

    return head + tail[:start] + BLOCK + tail[end:], True


def main() -> None:
    for target in TARGETS:
        if not target.exists():
            print('skip (missing):', target.relative_to(ROOT))
            continue
        source = zipfile.ZipFile(target)
        items = [(i, source.read(i.filename)) for i in source.infolist()]
        source.close()

        tmp = target.with_suffix('.xlsx.tmp')
        changed = 0
        with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
            for info, data in items:
                if info.filename in SHEETS:
                    xml = data.decode('utf-8')
                    new, did = patch(xml)
                    if did:
                        changed += 1
                    data = new.encode('utf-8')
                out.writestr(info, data)
        shutil.move(tmp, target)
        print('%s — patched %d sheet(s)' % (target.relative_to(ROOT), changed))

    # Report what each page sheet now declares (verification aid).
    wb = zipfile.ZipFile(TARGETS[0])
    for sheet in SHEETS:
        if sheet not in wb.namelist():
            continue
        setups = CHECK.findall(wb.read(sheet).decode('utf-8'))
        print(sheet, setups[-1] if setups else 'NO PAGE SETUP')


if __name__ == '__main__':
    main()
