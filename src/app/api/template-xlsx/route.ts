import {NextResponse} from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(){
  try {
    const filePath = path.join(process.cwd(), 'assets', 'csc-2026.xlsx');
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'inline; filename="csc-2026.xlsx"',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Template spreadsheet not found', {status: 404});
  }
}
