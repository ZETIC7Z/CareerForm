"""Render the bundled workbook's four form pages into ``public/csc-2026.pdf``.

The live preview and every filled PDF start from this file, so it has to be the official
blank's own render: A4 portrait with the print setup the workbook declares (C1 76%, C2 78%,
C3 76%, C4 86%). The seven continuation sheets (C5–C11) are hidden for the render — they are
separate printouts in the official form, and without that the export would be eleven pages.

Usage:  python scripts/render-template-pdf.py
"""
from pathlib import Path
import re, shutil, subprocess, zipfile

TRIM = 'scripts/trim-pdf.mjs'

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / 'assets' / 'csc-2026.xlsx'
TARGET = ROOT / 'public' / 'csc-2026.pdf'
STAGE = ROOT / 'tmp' / 'template-render.xlsx'
SOFFICE = 'C:/Program Files/LibreOffice/program/soffice.exe'
FORM_SHEETS = 4


def hide_continuations(source: Path, target: Path) -> int:
    """Copy the workbook, hiding every sheet after the four form pages."""
    book = zipfile.ZipFile(source)
    items = [(info, book.read(info.filename)) for info in book.infolist()]
    book.close()
    hidden = 0
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as out:
        for info, data in items:
            if info.filename == 'xl/workbook.xml':
                xml = data.decode('utf8')
                seen = [0]

                def hide(match):
                    """Sheets are listed in tab order: everything after the form is a
                    continuation sheet and must not be exported."""
                    nonlocal hidden
                    seen[0] += 1
                    if seen[0] <= FORM_SHEETS:
                        return match.group(0)
                    hidden += 1
                    return '<sheet name="%s" sheetId="%s" state="hidden" r:id="%s"/>' % (
                        match.group(1), match.group(2), match.group(3))

                xml = re.sub(r'<sheet name="([^"]*)" sheetId="(\d+)"(?: state="hidden")? r:id="(rId\d+)"/>',
                             hide, xml)
                data = xml.encode('utf8')
            out.writestr(info, data)
    return hidden


def print_areas(book: Path) -> list:
    """The form's own extent on each page sheet: `A1:R265` is the lookup list, not the form.

    Column Q carries the country pick-list and runs to row 265, so without an explicit print
    area every export of this workbook is ten pages of form plus lists. The form itself never
    reaches past column P. The four page sheets get a print area covering exactly the cells
    they print.
    """
    import openpyxl
    wb = openpyxl.load_workbook(book)
    names = []
    for index, sheet in enumerate(wb.worksheets[:FORM_SHEETS]):
        footer_row = footer_col = 1
        for row in sheet.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and cell.value.strip().startswith('CS FORM 212'):
                    footer_row, footer_col = cell.row, max(footer_col, cell.column)
        for merged in sheet.merged_cells.ranges:
            if merged.min_row == footer_row:
                footer_col = max(footer_col, merged.max_col)
        names.append((index, sheet.title, footer_row, footer_col))
    return names


def with_print_areas(xml: str, areas: list) -> str:
    block = ''.join("<definedName name=\"_xlnm.Print_Area\" localSheetId=\"%d\">'%s'!$A$1:$%s$%d</definedName>"
                    % (index, title, chr(64 + col), row) for index, title, row, col in areas)
    if '<definedNames>' in xml:
        return xml.replace('<definedNames>', '<definedNames>' + block, 1)
    return xml.replace('</sheets>', '</sheets><definedNames>' + block + '</definedNames>', 1)


def main() -> None:
    if not BOOK.exists():
        raise SystemExit('missing %s' % BOOK.relative_to(ROOT))
    STAGE.parent.mkdir(parents=True, exist_ok=True)
    hidden = hide_continuations(BOOK, STAGE)
    print('staged %s with %d continuation sheet(s) hidden' % (STAGE.relative_to(ROOT), hidden))
    areas = print_areas(BOOK)
    book = zipfile.ZipFile(STAGE)
    items = [(info, book.read(info.filename)) for info in book.infolist()]
    book.close()
    with zipfile.ZipFile(STAGE, 'w', zipfile.ZIP_DEFLATED) as out:
        for info, data in items:
            if info.filename == 'xl/workbook.xml':
                data = with_print_areas(data.decode('utf8'), areas).encode('utf8')
            out.writestr(info, data)
    print('print areas: ' + ', '.join('%s!A1:%s%d' % (title, chr(64 + col), row)
                                      for _, title, row, col in areas))
    subprocess.run([SOFFICE, '--headless', '--convert-to', 'pdf',
                    '--outdir', str(STAGE.parent), str(STAGE)], check=True, capture_output=True)
    rendered = STAGE.with_suffix('.pdf')
    shutil.move(rendered, TARGET)
    # LibreOffice exports the hidden continuation sheets too; the app fills four pages.
    subprocess.run(['node', TRIM, str(TARGET.relative_to(ROOT)), str(FORM_SHEETS)],
                   cwd=ROOT, check=True)
    print('wrote %s (%.1f KB)' % (TARGET.relative_to(ROOT), TARGET.stat().st_size / 1024))


if __name__ == '__main__':
    main()
