const fs = require('fs');
const path = require('path');

const origPath = '/home/rajesh/GitHub/Visualisations/riscv_simulator.html';
const v2Path = '/home/rajesh/GitHub/Visualisations/riscv_simulatorv2.html';
const bundlePath = '/home/rajesh/.gemini/antigravity-ide/brain/7780d698-8baa-4d51-9b54-596f69dcec55/scratch/cm6_bundle.min.js';

const origHtml = fs.readFileSync(origPath, 'utf8');
const cm6Bundle = fs.readFileSync(bundlePath, 'utf8');

console.log('Original file lines:', origHtml.split('\n').length);
console.log('CM6 Bundle size:', cm6Bundle.length);

// We will construct the updated HTML by replacing the editor HTML and JS sections
