import {NextResponse} from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function POST(req: Request) {
  try {
    const {name, dataUrl} = await req.json();
    if (!name || !dataUrl) {
      return NextResponse.json({error: 'Missing name or dataUrl'}, {status: 400});
    }

    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const outDir = 'C:\\Users\\Administrator\\Desktop\\RESULT TEST';
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, {recursive: true});
    }

    const filePath = path.join(outDir, name);
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ok: true, saved: filePath, size: buffer.length});
  } catch (error) {
    return NextResponse.json({error: String(error)}, {status: 500});
  }
}

export async function GET() {
  try {
    const photoPath = 'C:\\Users\\Administrator\\Desktop\\RESULT TEST\\passport_photo_enhanced_white_bg.jpg';
    const sigPath = 'C:\\Users\\Administrator\\Desktop\\RESULT TEST\\signature_black_ink_affixed.png';
    let photo = '';
    let signature = '';
    if (fs.existsSync(photoPath)) {
      photo = 'data:image/jpeg;base64,' + fs.readFileSync(photoPath).toString('base64');
    }
    if (fs.existsSync(sigPath)) {
      signature = 'data:image/png;base64,' + fs.readFileSync(sigPath).toString('base64');
    }
    return NextResponse.json({ photo, signature });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

