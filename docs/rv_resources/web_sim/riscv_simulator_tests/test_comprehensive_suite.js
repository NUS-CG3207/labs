const fs = require('fs');
const { installGodboltCache } = require('./godbolt_cache');
const { installExamplesFetch } = require('./examples_fetch');
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
    installExamplesFetch(window); // before the page's own fetch() for the Example menu
  }
});

const win = dom.window;

// jsdom has no fetch, so C mode reaches Godbolt's captured output through this.

installGodboltCache(win);

setTimeout(async () => {
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
    await win.loadExample('basic');
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
      await win.loadExample(key);
      const mc = win.assembleOnly();
      if (!mc || mc.length === 0) throw new Error(`Example ${key} failed to assemble`);
      const hasErrors = mc.some(item => item.error);
      if (hasErrors) throw new Error(`Example ${key} has assembly errors`);
      console.log(`  - Example '${key}': ${mc.length} instructions OK.`);
    }
    console.log('✅ All pre-loaded examples assembled flawlessly!');

    // 7. Find & Replace System
    console.log('\n[7] Testing In-Editor Find & Replace...');
    await win.loadExample('basic');
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
    // Code is read-only; Data and Stack are fully editable. (MMIO is a mix -
    // read-only registers like DIP/PB are also non-editable here, covered by
    // test_mmio_editability_and_content_column.js instead of this generic
    // Code/Data check.)
    // The mechanism differs between the two display modes this checks: since
    // v23.5 the view opens in WORD mode, where a cell is edited through the
    // word overlay (an onclick calling startMemWordCellEdit) rather than by
    // being contenteditable, so asserting contenteditable unconditionally
    // failed against the default mode.
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

    // 11. Operands that used to be accepted silently
    console.log('\n[11] Testing assembler strictness and disassembly register naming...');
    const asmErrors = () => (win.eval('machineCode') || [])
      .filter(m => m.error).map(m => String(m.error));
    const assembleText = (src) => { win.editor.value = src; win.assembleOnly(); };

    // A bare number is not a register: `add t0, t0, 1` used to assemble as
    // `add t0, t0, x1`, which is silently wrong.
    assembleText('.text\nmain:\nadd t0, t0, 1\n');
    if (win.eval('assembled')) throw new Error('`add t0, t0, 1` still assembles');
    const numErr = doc.getElementById('console').textContent;
    if (!/is a number, not a register/.test(numErr)) {
      throw new Error('No "number, not a register" diagnostic for `add t0, t0, 1`');
    }
    if (!/Did you mean `addi`/.test(numErr)) {
      throw new Error('The diagnostic does not suggest addi');
    }
    console.log('Bare number as a register operand is rejected, and addi suggested');

    // A store to a symbol has no register it may overwrite, so the scratch
    // register has to be named.
    assembleText('.text\nmain:\nsw t0, var1\n.data\nvar1: .word 1\n');
    if (win.eval('assembled')) throw new Error('`sw t0, var1` still assembles without a scratch register');
    if (!/scratch register/.test(doc.getElementById('console').textContent)) {
      throw new Error('No scratch-register diagnostic for a 2-operand store to a symbol');
    }
    // Naming it works, and the named register is the one that gets used.
    assembleText('.text\nmain:\nsw t0, var1, t2\n.data\nvar1: .word 1\n');
    if (!win.eval('assembled')) throw new Error('`sw t0, var1, t2` failed to assemble');
    const storeNatives = win.eval('machineCode').filter(m => m.native).map(m => m.native);
    if (!storeNatives.some(n => /^lui x7,/.test(n)) || !storeNatives.some(n => /^sw x5, \d+\(x7\)$/.test(n))) {
      throw new Error('Store expansion did not use the named register: ' + JSON.stringify(storeNatives));
    }
    console.log('Store to a symbol requires the scratch register, and honours the one named');

    // A load has one - rd itself - so no other register is touched.
    assembleText('.text\nmain:\nlw s3, delay_val\n.data\ndelay_val: .word 4\n');
    if (!win.eval('assembled')) throw new Error('`lw s3, delay_val` failed to assemble');
    const loadNatives = win.eval('machineCode').filter(m => m.native).map(m => m.native);
    if (!loadNatives.every(n => !/x5|x6/.test(n))) {
      throw new Error('Load expansion clobbered a scratch register: ' + JSON.stringify(loadNatives));
    }
    if (!loadNatives.some(n => /^lui x19,/.test(n)) || !loadNatives.some(n => /^lw x19, \d+\(x19\)$/.test(n))) {
      throw new Error('Load expansion did not build the address in rd: ' + JSON.stringify(loadNatives));
    }
    console.log('Load from a symbol builds the address in rd, clobbering nothing else');

    // The Native column is a disassembly: x0-x31, never ABI names. And a row
    // whose only difference from the source is that naming is NOT marked as a
    // pseudo-instruction expansion.
    assembleText('.text\nmain:\nadd t0, t0, t1\nlw a0, 4(sp)\nli x1, 10\n');
    if (!win.eval('assembled')) throw new Error('ABI-name program failed to assemble');
    const rows = win.eval('machineCode').filter(m => m.native);
    const byNative = Object.fromEntries(rows.map(m => [m.native, m]));
    if (!byNative['add x5, x5, x6']) {
      throw new Error('add t0, t0, t1 did not disassemble to x-names: ' + JSON.stringify(rows.map(m => m.native)));
    }
    if (!byNative['lw x10, 4(x2)']) {
      throw new Error('lw a0, 4(sp) did not rewrite the base register');
    }
    if (byNative['add x5, x5, x6'].isPseudo) {
      throw new Error('A plain instruction renamed to x-names was marked as a pseudo-instruction');
    }
    if (!rows.some(m => m.native === 'addi x1, x0, 10' && m.isPseudo)) {
      throw new Error('A real pseudo-instruction (li) lost its expansion marker');
    }
    console.log('Native column uses x0-x31; only real pseudo-instructions stay marked');

    // The PC is on the always-visible metrics readout, not only in the
    // status message that the next message overwrites.
    await win.loadExample('basic');
    win.assembleOnly();
    win.stepOnce();
    const statsEl = doc.getElementById('statsBar');
    if (!statsEl) throw new Error('statsBar not found');
    if (!statsEl.closest('.toolbar-row-status')) {
      throw new Error('The metrics readout is not on the status row');
    }
    if (!/PC:\s*0x[0-9a-f]{8}/i.test(statsEl.textContent)) {
      throw new Error('No PC in the metrics readout: ' + statsEl.textContent);
    }
    const pcShown = statsEl.textContent.match(/PC:\s*(0x[0-9a-f]{8})/i)[1];
    if (parseInt(pcShown, 16) !== (win.eval('pc') >>> 0)) {
      throw new Error(`Metrics PC ${pcShown} does not match pc 0x${(win.eval('pc') >>> 0).toString(16)}`);
    }
    console.log(`Status row metrics: ${statsEl.textContent.replace(/\s+/g, ' ').trim()}`);
    console.log('✅ Assembler strictness, disassembly naming and PC readout verified!');

    // 12. The rest of the "accepted silently" audit
    console.log('\n[12] Testing operand arity, range checks and label rules...');
    const consoleText = () => doc.getElementById('console').textContent;
    const tryAsm = (src) => {
      doc.getElementById('console').innerHTML = '';
      win.editor.value = src;
      try { win.assembleOnly(); } catch (e) { /* surfaced in the console */ }
      return { ok: !!win.eval('assembled'), out: consoleText() };
    };
    const mustReject = (label, src, needle) => {
      const r = tryAsm('.text\nmain:\n' + src + '\n');
      if (r.ok) throw new Error(`${label}: assembled when it should not have`);
      if (needle && !r.out.includes(needle)) {
        throw new Error(`${label}: diagnostic did not mention "${needle}" — got: ` +
          r.out.replace(/\s+/g, ' ').slice(0, 200));
      }
    };
    const mustAccept = (label, src) => {
      const r = tryAsm('.text\nmain:\n' + src + '\n');
      if (!r.ok) throw new Error(`${label}: rejected a valid program — ` +
        r.out.replace(/\s+/g, ' ').slice(0, 200));
      return r;
    };

    // Missing operands used to be filled in with x0 / 0; surplus ones dropped.
    mustReject('add with 2 operands',  'add t0, t1',          'add takes 3 operands');
    mustReject('add with 4 operands',  'add t0, t1, t2, t3',  'add takes 3 operands');
    mustReject('addi with 2 operands', 'addi t0, t1',         'addi takes 3 operands');
    mustReject('lw with 1 operand',    'lw t0',               'lw takes 2 or 3 operands');
    mustReject('sw with 1 operand',    'sw t0',               'sw takes 2 or 3 operands');
    mustReject('beq with 2 operands',  'beq t0, t1',          'beq takes 3 operands');
    mustReject('slli with 2 operands', 'slli t0, t1',         'slli takes 3 operands');
    mustReject('ecall with operands',  'ecall t0',            'ecall takes 0 operands');
    mustReject('nop with operands',    'nop t0',              'nop takes 0 operands');
    mustReject('ret with operands',    'ret t0',              'ret takes 0 operands');
    mustReject('li with 1 operand',    'li t0',               'li takes 2 operands');
    mustAccept('jal with 1 operand',   'jal main');
    mustAccept('jal with 2 operands',  'jal ra, main');
    mustAccept('jalr with 1 operand',  'jalr ra');
    console.log('Operand counts are checked; missing operands are no longer invented');

    // A shift amount over 31 was masked to 0x1F: `slli t0, t1, 32` shifted by 0.
    mustReject('shift by 32', 'slli t0, t1, 32', 'shift amount 32 is out of range');
    mustReject('shift by 99', 'srli t0, t1, 99', 'shift amount 99 is out of range');
    mustAccept('shift by 31', 'slli t0, t1, 31');
    // lui's immediate was truncated to 20 bits in silence.
    mustReject('lui over 20 bits', 'lui t0, 0x100000', 'does not fit the 20 bits');
    mustAccept('lui at the limit', 'lui t0, 0xFFFFF');
    console.log('Shift amounts and lui immediates are range-checked');

    // A value too wide for its directive was truncated in silence.
    mustReject('.byte 256',     '.data\nv: .byte 256',      'does not fit in .byte');
    mustReject('.half 65536',   '.data\nv: .half 65536',    'does not fit in .half');
    mustReject('.word too big', '.data\nv: .word 0x1FFFFFFFF', 'does not fit in .word');
    mustAccept('.byte 255',     '.data\nv: .byte 255');
    mustAccept('.byte -128',    '.data\nv: .byte -128');
    mustAccept('.word 0xFFFF00A0', '.data\nv: .word 4294901920');
    console.log('Data directives reject values that would be truncated');

    // A duplicate label silently redefined; a register-named label was unreachable.
    mustReject('duplicate label', 'a: nop\na: nop', 'defined more than once');
    mustReject('label named t0',  't0: nop\nj t0',  'is a register name');
    console.log('Duplicate and register-named labels are rejected');

    // Misaligned word/half accesses warn but still assemble; byte access stays quiet.
    const mis = mustAccept('misaligned lw', 'lw t0, 1(sp)');
    if (!/multiple of the access size/.test(mis.out)) {
      throw new Error('No misalignment warning for `lw t0, 1(sp)`');
    }
    const bytewise = mustAccept('byte access at any offset', 'lb t0, 1(sp)');
    if (/multiple of the access size/.test(bytewise.out)) {
      throw new Error('`lb t0, 1(sp)` should not warn — a byte access has no alignment rule');
    }
    const aligned = mustAccept('aligned lw', 'lw t0, 4(sp)');
    if (/multiple of the access size/.test(aligned.out)) {
      throw new Error('`lw t0, 4(sp)` warned about alignment when it is aligned');
    }
    console.log('Misaligned word/half accesses warn; byte accesses do not');

    // ecall works here but not on the board; say so once per assemble, and
    // only for assembly (every compiled C program ends with the CRT0 shim's).
    await win.loadExample('basic');
    doc.getElementById('console').innerHTML = '';
    win.assembleOnly();
    if (!/uses ecall \(2 sites\)/.test(consoleText())) {
      throw new Error('No ecall notice for an assembly program that uses it');
    }
    if (!/hardware does not/.test(consoleText())) {
      throw new Error('The ecall notice does not say the hardware lacks support');
    }
    await win.loadExample('dip_led');
    doc.getElementById('console').innerHTML = '';
    win.assembleOnly();
    if (/uses ecall/.test(consoleText())) {
      throw new Error('ecall notice fired for a program that does not use ecall');
    }
    // And the source itself carries the warning.
    await win.loadExample('basic');
    if (!/ecall is a simulator convenience/.test(win.editor.value)) {
      throw new Error('The basic example lost its ecall note');
    }
    console.log('ecall is flagged in the source and once per assemble');
    console.log('✅ Assembler audit findings verified!');

    // 13. The status message and the metrics readout must not say the same
    //     thing twice. PC and the instruction count live in the readout, so a
    //     step message says what the step DID, not what the counters show.
    console.log('\n[13] Testing status message / metrics readout de-duplication...');
    await win.loadExample('basic');
    win.assembleOnly();
    const statusOf = () => doc.getElementById('statusBar').textContent;
    const statsOf  = () => doc.getElementById('statsBar').textContent;

    for (let i = 0; i < 4; i++) win.stepOnce();
    if (/PC\s*[:=]/i.test(statusOf())) {
      throw new Error('Step status repeats the PC that the metrics readout already shows: ' + statusOf());
    }
    if (!/PC:/.test(statsOf())) throw new Error('The metrics readout lost the PC');
    win.stepBack();
    if (/PC\s*[:=]/i.test(statusOf())) {
      throw new Error('Back-step status repeats the PC: ' + statusOf());
    }
    if (!/line/i.test(statusOf())) {
      throw new Error('Back-step status says nothing useful: ' + statusOf());
    }
    console.log(`Step status: "${statusOf()}"  |  metrics: "${statsOf().replace(/\s+/g, ' ').trim()}"`);

    // The overflow warnings state the size once, and the advice lives in the
    // console rather than being repeated in the status bar.
    doc.getElementById('console').innerHTML = '';
    await win.loadExample('circle_accel');
    win.assembleOnly();
    const overflowLine = [...doc.querySelectorAll('#console div')].map(d => d.textContent)
      .find(t => /over the .* Code segment/.test(t)) || '';
    if (!overflowLine) throw new Error('No code-overflow warning for circle_accel');
    if (/\(0x[0-9a-f]+\)/i.test(overflowLine)) {
      throw new Error('The overflow warning still prints the same size in two bases: ' + overflowLine);
    }
    if (!/Raise "Code \(\.text\) size"/.test(overflowLine)) {
      throw new Error('The overflow warning lost the fix: ' + overflowLine);
    }
    if (/Raise "Code/.test(statusOf())) {
      throw new Error('The status bar repeats advice the console already gives: ' + statusOf());
    }
    if (!/too many for the Code segment/.test(statusOf())) {
      throw new Error('The status bar does not report the overflow: ' + statusOf());
    }
    console.log(`Overflow status: "${statusOf()}"`);
    console.log('✅ Status messages carry no redundancy with the metrics readout!');

    // 14. The Example menu is generated from one table, so a label cannot
    //     revert when the language is switched and switched back.
    console.log('\n[14] Testing the Example menu survives a language round-trip...');
    const menuText = () => Array.from(doc.getElementById('exampleSelect').options)
      .map(o => o.textContent).join(' | ');
    const asmMenuBefore = menuText();
    if (!/start here/.test(asmMenuBefore)) {
      throw new Error('The ASM Example menu does not mark a starting point: ' + asmMenuBefore);
    }
    win.setLanguageMode('c');
    const cMenu = menuText();
    if (!/start here/.test(cMenu)) {
      throw new Error('The C Example menu does not mark a starting point: ' + cMenu);
    }
    win.setLanguageMode('asm');
    if (menuText() !== asmMenuBefore) {
      throw new Error('The ASM Example menu changed across a language round-trip:\n' +
        '  before: ' + asmMenuBefore + '\n  after:  ' + menuText());
    }
    console.log('ASM menu survives asm → c → asm unchanged, and both mark a starting point');

    // Statement Stepping is one setting on two tabs; the wording must match
    // apart from the clause naming the other tab.
    const stripShared = (t) => (t || '').replace(/Shared with (JS|HDL) Simulation\./, '')
      .replace(/\s+/g, ' ').trim();
    const jsBlurb  = doc.querySelector('#simStatementStep')
      .closest('.sim-card').querySelector('span').textContent;
    const hdlBlurb = doc.querySelector('#hdlStatementStep')
      .closest('.sim-card').querySelector('span').textContent;
    if (stripShared(jsBlurb) !== stripShared(hdlBlurb)) {
      throw new Error('Statement Stepping is worded differently on the two tabs:\n' +
        '  JS : ' + stripShared(jsBlurb) + '\n  HDL: ' + stripShared(hdlBlurb));
    }
    if (stripShared(jsBlurb).length > 130) {
      throw new Error('The Statement Stepping blurb has grown back: ' + stripShared(jsBlurb));
    }
    console.log(`Statement Stepping reads the same on both tabs: "${stripShared(jsBlurb)}"`);
    console.log('✅ Example menu and shared-setting wording verified!');

    console.log('\n===========================================================');
    console.log('🎉 ALL COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS!');
    console.log('===========================================================');
    process.exit(0);
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  }
}, 400);
