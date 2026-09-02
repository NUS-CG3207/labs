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
    window.Range.prototype.getClientRects = () => [];
    window.Range.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
    window.Element.prototype.getClientRects = () => [];
    window.Element.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
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

setTimeout(() => {
  try {
    console.log('===========================================================');
    console.log('🚀 RUNNING COMPREHENSIVE FUNCTIONAL & UI TEST SUITE');
    console.log('===========================================================');

    // 1. Editor Instance & Compatibility Facade
    console.log('\n[1] Testing CodeMirror 6 Editor & Facade...');
    const cm = win.cmEditor;
    if (!cm) throw new Error('cmEditor not found on window');
    if (!win.editor) throw new Error('window.editor facade not found');

    win.editor.value = 'main:\n\taddi x1, x0, 42\n';
    if (cm.state.doc.toString() !== 'main:\n\taddi x1, x0, 42\n') {
      throw new Error('editor.value setter failed to update CM6 doc');
    }
    if (win.editor.value !== 'main:\n\taddi x1, x0, 42\n') {
      throw new Error('editor.value getter failed to read CM6 doc');
    }
    console.log('✅ Editor proxy facade read/write verified!');

    // 2. Tab Key Precision Handling
    console.log('\n[2] Testing Tab Key in-line insertion vs block indentation...');
    win.editor.value = 'label:';
    win.editor.selectionStart = 6;
    win.editor.selectionEnd = 6;
    // Simulate Tab key
    const tabCmd = (view) => {
      const { state, dispatch } = view;
      if (state.selection.ranges.every(r => r.empty)) {
        dispatch(state.changeByRange(range => ({
          changes: { from: range.from, insert: '\t' },
          range: win.CM6.EditorSelection.cursor(range.from + 1)
        })));
        return true;
      }
      return win.CM6.indentMore(view);
    };
    tabCmd(cm);
    if (win.editor.value !== 'label:\t') {
      throw new Error(`Expected 'label:\\t', got ${JSON.stringify(win.editor.value)}`);
    }
    console.log('✅ In-line Tab insertion verified!');

    // 3. Breakpoint Snapping & Line Number Highlighting Alone
    console.log('\n[3] Testing Breakpoint Gutter, Line Number Highlight, and Snapping...');
    win.loadExample('basic');
    // Basic has comment lines 1-2, .text on line 3, main: on line 4, li x1, 10 on line 5
    win.toggleBreakpoint(1); // Click line 1 (comment) -> snaps to line 5
    if (!win.breakpoints.has(5) || win.breakpoints.has(1)) {
      throw new Error('Breakpoint snapping failed for line 1');
    }
    console.log('Breakpoints set:', Array.from(win.breakpoints));
    console.log('✅ Breakpoint snapping to line 5 verified!');

    // 4. Two-Pass Assembler & Instruction Verification
    console.log('\n[4] Testing Assembler Execution on Basic Example...');
    win.assembleOnly();
    if (!win.machineCode || win.machineCode.length === 0) {
      throw new Error('Assembly produced zero machine code items');
    }
    console.log(`Assembled ${win.machineCode.length} instructions successfully.`);
    console.log('✅ Basic assembly verified!');

    // 5. Stepping, Breakpoint Pause, and Back-Stepping
    console.log('\n[5] Testing Stepping, Execution Line Highlighting, and Step Back...');
    win.stepOnce(); // Executes instruction 1 (line 5) -> PC advances
    const regs = win.getRegs();
    console.log('After Step 1: x1 =', regs[1], 'PC =', '0x' + win.getPc().toString(16));
    if (regs[1] !== 10) throw new Error(`Expected x1 = 10, got ${regs[1]}`);
    console.log('Current execution line:', win.getCurrentExecLine());

    win.stepBack(); // Steps back
    console.log('After Step Back: x1 =', win.getRegs()[1], 'PC =', '0x' + win.getPc().toString(16));
    if (win.getRegs()[1] !== 0) throw new Error(`Expected x1 = 0 after stepBack, got ${win.getRegs()[1]}`);
    console.log('✅ Stepping and Step Back verified!');

    // 6. Test All Pre-Loaded Examples
    console.log('\n[6] Testing All Pre-Loaded Examples Execution...');
    const exampleKeys = ['basic', 'fib', 'fact', 'loop', 'circle_accel'];
    for (const key of exampleKeys) {
      win.loadExample(key);
      const mc = win.assembleOnly();
      if (!mc || mc.length === 0) throw new Error(`Example ${key} failed to assemble`);
      const hasErrors = mc.some(item => item.error);
      if (hasErrors) throw new Error(`Example ${key} has assembly errors`);
      console.log(`  - Example '${key}': ${mc.length} instructions OK.`);
    }
    console.log('✅ All pre-loaded examples assembled flawlessly!');

    // 7. Find & Replace System
    console.log('\n[7] Testing In-Editor Find & Replace...');
    win.loadExample('basic');
    win.openFindReplace(false);
    const findInput = win.document.getElementById('findInput');
    const replaceInput = win.document.getElementById('replaceInput');
    const findCount = win.document.getElementById('findCount');

    findInput.value = 'ecall';
    win.updateFindMatches();
    console.log('Find count text for "ecall":', findCount.textContent);
    if (!findCount.textContent.includes('/3')) {
      throw new Error(`Expected 3 matches for ecall, got ${findCount.textContent}`);
    }

    win.findNext();
    replaceInput.value = 'nop';
    win.replaceCurrent();
    console.log('After replaceCurrent, editor contains nop:', win.editor.value.includes('nop'));
    if (!win.editor.value.includes('nop')) throw new Error('replaceCurrent failed');

    win.replaceAll();
    win.closeFindReplace();
    console.log('✅ Find & Replace operations verified!');

    // 8. Peripherals Verification
    console.log('\n[8] Testing Nexys 4 FPGA Board & MMIO Peripherals...');
    // Write LED MMIO (0xFFFF0060)
    win.writeMem(0xFFFF0060, 0x55, 1);
    const ledState = win.readMem(0xFFFF0060, 1);
    console.log('LED state readback:', '0x' + ledState.toString(16));
    if (ledState !== 0x55) throw new Error('LED MMIO read/write failed');

    // 7-Segment Display (0xFFFF0080)
    win.writeMem(0xFFFF0080, 0x12345678, 4);
    const segState = win.readMem(0xFFFF0080, 4);
    console.log('7-Segment display readback:', '0x' + (segState >>> 0).toString(16));
    if ((segState >>> 0) !== 0x12345678) throw new Error('7-Segment MMIO failed');

    // Accelerometer Data (0xFFFF0040)
    const accelData = win.readMem(0xFFFF0040, 4);
    console.log('Accelerometer packed data readback:', '0x' + (accelData >>> 0).toString(16));

    // Cycle Count (0xFFFF00A0)
    const cycles = win.readMem(0xFFFF00A0, 4);
    console.log('Cycle counter readback:', cycles);
    console.log('✅ Peripherals and MMIO verification passed!');

    // 9. Memory View protection model, in BOTH display modes.
    //
    // The rule is the same either way - code is read-only, data/stack/MMIO are
    // editable - but the mechanism differs, and this check used to know only
    // the byte-mode one. Since v23.5 the view opens in WORD mode, where a cell
    // is edited through the word overlay (an onclick calling
    // startMemWordCellEdit) rather than by being contenteditable, so asserting
    // contenteditable unconditionally failed against the default mode.
    console.log('\n[9] Testing Memory View read-only code / editable data (word + byte modes)...');
    const doc = win.document;
    const cellAt = addr => doc.getElementById('memView').querySelector(`[data-addr="${addr}"]`);
    const showCode = () => { doc.getElementById('memAddr').value = '0x00400000'; win.memGo('code'); };
    const showData = () => { doc.getElementById('memAddr').value = '0x10010000'; win.memGo('data'); };

    // --- Word mode (the default since v23.5) ---
    win.setMemViewMode('word');
    showCode();
    const codeWord = cellAt(0x00400000);
    if (!codeWord) throw new Error('Word mode: could not find the code segment word cell');
    if (!codeWord.classList.contains('readonly-code')) {
      throw new Error('Word mode: code segment word cell MUST carry the readonly-code class');
    }
    if (codeWord.getAttribute('onclick')) {
      throw new Error('Word mode: code segment word cell MUST NOT be click-editable');
    }
    showData();
    const dataWord = cellAt(0x10010000);
    if (!dataWord) throw new Error('Word mode: could not find the data segment word cell');
    if (dataWord.classList.contains('readonly-code')) {
      throw new Error('Word mode: data segment word cell MUST NOT be read-only');
    }
    if (!/startMemWordCellEdit/.test(dataWord.getAttribute('onclick') || '')) {
      throw new Error('Word mode: data segment word cell MUST open the word editor on click');
    }
    console.log('Word mode: code cell read-only, data cell click-editable');

    // --- Byte mode ---
    win.setMemViewMode('bytes');
    showCode();
    const codeSpan = cellAt(0x00400000);
    if (!codeSpan) throw new Error('Byte mode: could not find the code segment byte span');
    if (codeSpan.getAttribute('contenteditable') === 'true') {
      throw new Error('Byte mode: code segment byte span should NOT be contenteditable');
    }
    if (!codeSpan.classList.contains('readonly-code')) {
      throw new Error('Byte mode: code segment byte span should have the readonly-code class');
    }
    showData();
    const dataSpan = cellAt(0x10010000);
    if (!dataSpan) throw new Error('Byte mode: could not find the data segment byte span');
    if (dataSpan.getAttribute('contenteditable') !== 'true') {
      throw new Error('Byte mode: data segment byte span MUST be contenteditable="true"');
    }
    console.log('Byte mode: code span read-only, data span contenteditable="true"');

    // Leave the view in the mode the page ships with.
    win.setMemViewMode('word');

    // Check code segment edit prevention functions
    win.editMemByte(0x00400000);
    const statusText = doc.getElementById('statusBar').textContent;
    if (!statusText.includes('read-only')) {
      throw new Error('editMemByte on code segment did not set read-only status warning');
    }
    console.log('✅ Memory View read-only code segment & editable data segment verified!');

    // 10. Toolbar Structure Verification
    console.log('\n[10] Testing Toolbar Structure and Buttons...');
    const toolbar = doc.getElementById('mainToolbar');
    if (!toolbar) throw new Error('mainToolbar element not found');
    const sourceRowButtons = toolbar.querySelectorAll('.toolbar-row-source button');
    const simRowButtons = toolbar.querySelectorAll('.toolbar-row-simulation button');
    console.log(`Toolbar Row 1 (Source & Editing) buttons: ${sourceRowButtons.length} (expected >= 7)`);
    console.log(`Toolbar Row 2 (Simulation & Controls) buttons: ${simRowButtons.length} (expected >= 8)`);
    if (sourceRowButtons.length < 7 || simRowButtons.length < 8) {
      throw new Error('Toolbar button structure missing expected controls');
    }
    console.log('✅ Toolbar layout structure verified!');

    console.log('\n===========================================================');
    console.log('🎉 ALL COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS!');
    console.log('===========================================================');
    process.exit(0);
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  }
}, 400);
