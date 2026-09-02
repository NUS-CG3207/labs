const fs = require('fs');
const path = require('path');

const imgAsm = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.asm'), 'utf8');
const imgC = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.c'), 'utf8');

console.log('ImageDisplay C length:', imgC.length);
console.log('ImageDisplay ASM length:', imgAsm.length);
