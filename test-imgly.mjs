import { removeBackground } from '@imgly/background-removal';
import fs from 'node:fs';

async function run() {
  try {
    const inputPath = 'C:\\Users\\Administrator\\Downloads\\Picsart_26-07-13_00-27-34-379.jpg';
    const buffer = fs.readFileSync(inputPath);
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    console.log('Input blob size:', blob.size);
    console.log('Running removeBackground with @imgly/background-removal...');
    const resultBlob = await removeBackground(blob, {
      model: 'isnet_quint8', // fast quantized model
    });
    console.log('Result blob size:', resultBlob.size);
    const arrayBuffer = await resultBlob.arrayBuffer();
    const outBuffer = Buffer.from(arrayBuffer);
    fs.writeFileSync('C:\\Users\\Administrator\\Desktop\\RESULT TEST\\test_imgly_out.png', outBuffer);
    console.log('Successfully saved to test_imgly_out.png! Size:', outBuffer.length);
  } catch (err) {
    console.error('Error running removeBackground in node:', err);
  }
}
run();
