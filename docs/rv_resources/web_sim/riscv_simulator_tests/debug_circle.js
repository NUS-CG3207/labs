const fs = require('fs');
const path = require('path');
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  try {
    JSDOM = require(path.resolve(__dirname, 'node_modules/jsdom')).JSDOM;
  } catch (e2) {
    JSDOM = require('/home/rajesh/.gemini/antigravity-ide/brain/7780d698-8baa-4d51-9b54-596f69dcec55/scratch/node_modules/jsdom').JSDOM;
  }
}

async function debugCircle() {
  const html = fs.readFileSync(path.resolve(__dirname, '../riscv_simulator.html'), 'utf8');
const CM6_BUNDLE_SOURCE = fs.readFileSync(path.resolve(__dirname, 'cm6_bundle.min.js'), 'utf8');


  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost:8080/riscv_simulator.html',
    beforeParse(window) {
    window.__CM6_DISABLE_CDN = true; // prevent the loader from fetching the CDN bundle (jsdom layout limitations); tests pre-inject the local bundle
    // Pre-inject CodeMirror 6 so the app can boot even when the CDN is
    // unreachable. jsdom cannot run the ESM CDN bundles, and the local
    // fallback file cannot be fetched without a server, so load it directly.
    window.addEventListener('DOMContentLoaded', () => {
      try { window.eval(CM6_BUNDLE_SOURCE); } catch (e) { console.error('CM6 inject failed:', e.message); }
    });

      window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
      window.cancelAnimationFrame = (id) => clearTimeout(id);
      window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
      if (window.HTMLCanvasElement) {
        window.HTMLCanvasElement.prototype.getContext = () => ({
          createImageData: (w, h) => ({ data: new Uint8Array(w * h * 4) }),
          putImageData: () => {},
          fillRect: () => {},
          clearRect: () => {}
        });
      }
    }
  });

  const win = dom.window;
  await new Promise(r => setTimeout(r, 1000));

  console.log('=== 1. Testing Circle_delay_accel.asm (ASM baseline) ===');
  win.setLanguageMode('asm');
  win.loadExample('circle_accel');
  await win.assembleOnly();
  console.log(`ASM Circle assembled: ${win.machineCode.length} instructions`);

  // Let's run 5,000 steps and track OLED writes
  let oledWritesAsm = 0;
  for (let i = 0; i < 5000; i++) {
    const pc = win.pc;
    const inst = win.fetchInstruction(pc);
    // check if writing to OLED
    win.stepOnce();
    // check oled canvas or registers
  }
  console.log('ASM ran 5000 steps smoothly.');

  console.log('\n=== 2. Testing Circle_delay_accel.c in C mode ===');
  win.setLanguageMode('c');
  win.loadExample('circle_accel_c');
  await win.assembleOnly();
  console.log(`C Circle assembled: ${win.machineCode.length} instructions`);

  for (let i = 0; i < 5000; i++) {
    win.stepOnce();
  }
  console.log('C Circle ran 5000 steps. PC:', '0x' + win.pc.toString(16));
}

debugCircle().catch(console.error);
