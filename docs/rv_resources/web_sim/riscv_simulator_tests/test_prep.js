const fs = require('fs');
const path = require('path');

// Let's test the sparse memory simulator with both Circle_delay_accel.c and ImageDisplay_autoadvance_accel.c
const simPath = '/home/rajesh/GitHub/Visualisations/riscv_simulator.html';
let simHtml = fs.readFileSync(simPath, 'utf8');

console.log('Testing patch preparation...');
