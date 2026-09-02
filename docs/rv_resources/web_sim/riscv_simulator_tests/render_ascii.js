const fs = require('fs');
const path = require('path');

// Let's extract KarunaNew1 array and simulate drawing it
const imgC = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.c'), 'utf8');

// Parse KarunaNew1 bytes from C file
const startIdx = imgC.indexOf('KarunaNew1[]');
const openBrace = imgC.indexOf('{', startIdx);
const closeBrace = imgC.indexOf('}', openBrace);
const hexStr = imgC.slice(openBrace + 1, closeBrace);
const bytes = hexStr.split(',').map(s => parseInt(s.trim(), 16)).filter(n => !isNaN(n));

console.log('Parsed KarunaNew1 bytes count:', bytes.length); // should be 6144

// In mode 5 (column major, 64 cols x 96 rows):
// i = col (0..63), j = row (0..95)
// Let's create an ASCII art thumbnail (64 wide x 96 high, sampled every 2 pixels)
let lines = [];
for (let row = 0; row < 96; row += 2) {
  let line = '';
  for (let col = 0; col < 64; col++) {
    // byte at col * 96 + row
    const byte = bytes[col * 96 + row];
    line += byte < 0x80 ? '#' : ' ';
  }
  lines.push(line);
}
console.log('ASCII art rendering of KarunaNew1 (portrait 64x96):');
console.log(lines.join('\n'));
