const fs = require('fs');
const stepFile = process.argv[2];
const outFile = process.argv[3];
const txt = fs.readFileSync(stepFile, 'utf8');
const match = txt.match(/data:image\/[a-zA-Z0-9]+;base64,([^"\\]+)/);
if (match) {
  fs.writeFileSync(outFile, Buffer.from(match[1], 'base64'));
  console.log('Saved to', outFile, 'size:', fs.statSync(outFile).size);
} else {
  console.log('Could not find base64 image data');
}
