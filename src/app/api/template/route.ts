import {NextResponse} from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(){
  try {
    const filePath = path.join(process.cwd(), 'public', 'csc-2026.pdf');
    const buffer = fs.readFileSync(filePath);
    return NextResponse.json({
      ok: true,
      template: buffer.toString('base64'),
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Template file not found' }, { status: 404 });
  }
}
