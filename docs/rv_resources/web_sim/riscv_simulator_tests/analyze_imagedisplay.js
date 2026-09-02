const fs = require('fs');
const path = require('path');

// Let's inspect ImageDisplay_autoadvance_accel.c and ImageDisplay_autoadvance_accel.asm
const imgAsm = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.asm'), 'utf8');
const imgC = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.c'), 'utf8');

console.log('=== ImageDisplay ASM analysis ===');
console.log('ASM lines count:', imgAsm.split('\n').length);
console.log('First 50 lines of ImageDisplay.asm:');
console.log(imgAsm.split('\n').slice(0, 50).join('\n'));
