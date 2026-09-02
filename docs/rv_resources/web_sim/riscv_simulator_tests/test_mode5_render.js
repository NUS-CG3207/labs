const fs = require('fs');
const path = require('path');

// Let's test the canvas buffer mapping
function testRender() {
  const imgC = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.c'), 'utf8');
  const startIdx = imgC.indexOf('KarunaNew1[]');
  const openBrace = imgC.indexOf('{', startIdx);
  const closeBrace = imgC.indexOf('}', openBrace);
  const hexStr = imgC.slice(openBrace + 1, closeBrace);
  const bytes = hexStr.split(',').map(s => parseInt(s.trim(), 16)).filter(n => !isNaN(n));

  // Simulate Mode 5:
  // oledRow goes 0..95, oledCol goes 0..63
  let oledRow = 0, oledCol = 0;
  const oledWidth = 64, oledHeight = 96;
  const buffer = new Uint8Array(oledWidth * oledHeight * 4);

  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 96; j++) {
      const val = bytes[i * 96 + j];
      const r3 = (val >> 5) & 0x07;
      const g3 = (val >> 2) & 0x07;
      const b2 = val & 0x03;
      const r = (r3 * 255 / 7) | 0;
      const g = (g3 * 255 / 7) | 0;
      const b = (b2 * 255 / 3) | 0;

      const idx = (oledRow * oledWidth + oledCol) * 4;
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = 255;

      // Autoadvance mode 5:
      oledRow++;
      if (oledRow >= 96) {
        oledRow = 0;
        oledCol = (oledCol + 1) % 64;
      }
    }
  }

  console.log(`Rendered ${buffer.length} buffer bytes for portrait 64x96!`);
  console.log(`Final oledCol: ${oledCol}, oledRow: ${oledRow}`);
}

testRender();
