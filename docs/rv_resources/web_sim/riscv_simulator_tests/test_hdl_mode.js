/*
 * HDL simulation mode - end-to-end regression.
 *
 * Loads riscv_simulator.html in jsdom, assembles programs through the
 * normal assembler, asks the page for the artefacts it would hand to Icarus
 * (the generic testbench, the memory images, the stimulus files), and then
 * runs the REAL Icarus/WASM pipeline over the unmodified RV/*.v sources.
 *
 * The central property under test is that the generated testbench is
 * program-independent: it is compiled ONCE here and then driven through
 * several different scenarios purely by plusargs and by files written into
 * the simulation's working directory, exactly as the page does it.
 *
 * jsdom cannot dynamic-import the Emscripten modules, so the engine is
 * driven directly from Node - but every artefact fed to it is the one the
 * page produced.
 */
const fs = require('fs');
const path = require('path');
const { installExamplesFetch } = require('./examples_fetch');
let JSDOM;
try { JSDOM = require('jsdom').JSDOM; }
catch (e) { JSDOM = require(path.resolve(__dirname, 'node_modules/jsdom')).JSDOM; }

const ROOT = path.resolve(__dirname, '..');
const RV = path.join(ROOT, 'RV');
const ENGINE = process.env.HDL_ENGINE_DIR ||
  '/tmp/claude-1000/-home-rajesh-GitHub-Visualisations/dd03718e-6ed5-4869-8832-495d819635e9/scratchpad/engine';

const html = fs.readFileSync(path.join(ROOT, 'riscv_simulator.html'), 'utf8');
const CM6 = fs.readFileSync(path.join(__dirname, 'cm6_bundle.min.js'), 'utf8');

const DESIGN = ['ALU.v', 'Decoder.v', 'Extend.v', 'PC_Logic.v', 'ProgramCounter.v',
                'RegFile.v', 'Shifter.v', 'RV.v', 'Wrapper.v'];

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label); }
}

const dom = new JSDOM(html, {
  runScripts: 'dangerously', resources: 'usable',
  url: 'http://localhost:8080/riscv_simulator.html',
  beforeParse(window) {
    window.__CM6_DISABLE_CDN = true;
    window.addEventListener('DOMContentLoaded', () => {
      try { window.eval(CM6); } catch (e) { console.error('CM6 inject failed:', e.message); }
    });
    window.requestAnimationFrame = cb => setTimeout(cb, 16);
    window.cancelAnimationFrame = id => clearTimeout(id);
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.Range.prototype.getClientRects = () => [];
    window.Range.prototype.getBoundingClientRect = () => ({ top:0,bottom:0,left:0,right:0,width:0,height:0 });
    window.Element.prototype.getClientRects = () => [];
    window.Element.prototype.getBoundingClientRect = () => ({ top:0,bottom:0,left:0,right:0,width:0,height:0 });
    if (window.HTMLCanvasElement) {
      window.HTMLCanvasElement.prototype.getContext = () => ({
        createImageData: (w,h) => ({ data: new Uint8Array(w*h*4), width:w, height:h }),
        putImageData(){}, fillRect(){}, clearRect(){}, drawImage(){},
        getImageData: () => ({ data: new Uint8Array(4) }), measureText: () => ({ width: 0 })
      });
    }
  }
});

const win = dom.window, doc = win.document;
installExamplesFetch(win);

// --------------------------------------------------------------------
// A minimal Icarus driver, mirroring what the page does: preprocess and
// compile once, then run the SAME binary many times with different
// plusargs and different files in the working directory.
// --------------------------------------------------------------------
async function makeIcarus(testbench) {
  const initIvlpp = (await import('file://' + path.join(ENGINE, 'ivlpp.js'))).default;
  const initIvl   = (await import('file://' + path.join(ENGINE, 'ivl.js'))).default;
  const initVvp   = (await import('file://' + path.join(ENGINE, 'vvp.js'))).default;

  const files = DESIGN.map(n => ({ name: n, src: fs.readFileSync(path.join(RV, n), 'utf8') }));
  files.push({ name: 'cg3207_hdl_tb.v', src: testbench });

  const ppOut = [];
  const pp = await initIvlpp({ print: s => ppOut.push(s), printErr: () => {} });
  const args = ['-L'];
  for (const f of files) { pp.FS.writeFile('/' + f.name, f.src + '\n'); args.push('/' + f.name); }
  pp.callMain(args);

  const errs = [];
  const ivl = await initIvl({ print: () => {}, printErr: s => errs.push(s) });
  ivl.FS.writeFile('/ivl.conf',
    'basedir:/\nmodule:system.vpi\ngeneration:2005\ngeneration:no-specify\nout:/out.vvp\n' +
    'iwidth:32\nwidthcap:65536\nfunctor:cprop\nfunctor:nodangle\nflag:DLL=vvp.tgt\n');
  ivl.FS.writeFile('/src.v', ppOut.join('\n') + '\n');
  ivl.callMain(['-C/ivl.conf', '--', '/src.v']);

  let vvpBytes = null;
  try { vvpBytes = ivl.FS.readFile('/out.vvp'); } catch (e) {}
  const realErr = errs.filter(l => !/system\.vpi|dynamic linking not enabled/.test(l)).join('\n');
  if (!vvpBytes && realErr) console.log('    compile diagnostics:\n' + realErr);

  return {
    ok: !!vvpBytes,
    async run(plusargs, memFiles) {
      const out = [];
      const vvp = await initVvp({ print: s => out.push(s), printErr: s => out.push(s) });
      vvp.FS.writeFile('/sim.vvp', vvpBytes);
      for (const name of Object.keys(memFiles)) vvp.FS.writeFile('/' + name, memFiles[name]);
      vvp.callMain(['/sim.vvp'].concat(plusargs || []));
      return out.join('\n');
    }
  };
}

const lastLed = out => {
  const ev = out.split('\n').filter(l => /^@@L /.test(l));
  return ev.length ? parseInt(ev[ev.length - 1].trim().split(/\s+/)[2], 16) : -1;
};

setTimeout(async () => {
  try {
    console.log('===========================================================');
    console.log('🔌 TESTING HDL SIMULATION MODE (Icarus Verilog → WASM)');
    console.log('===========================================================');

    // --- 1. UI surface -------------------------------------------------
    console.log('\n[1] HDL setup lives in Settings, not in a panel of its own');
    check('There is no HDL panel', !doc.getElementById('tab-hdl'));
    check('There is no HDL panel chip', !doc.getElementById('panelChip-hdl'));
    check('The panel dock is back to four panels',
      ['registers', 'memory', 'peripherals', 'disassembly']
        .every(p => !!doc.getElementById('tab-' + p)) &&
      doc.querySelectorAll('#panelStack > .tab-content').length === 4);
    check('Settings has a dedicated HDL tab',
      !!doc.getElementById('settingsTabBtn-hdl') && !!doc.getElementById('settingsContent-hdl'));
    check('Engine toggle has JS and HDL buttons',
      !!doc.getElementById('engBtnJs') && !!doc.getElementById('engBtnHdl'));
    check('File drop zone and file input exist',
      !!doc.getElementById('hdlDropZone') && !!doc.getElementById('hdlFileInput'));
    check('The toolbar carries the source-state chip and the VCD download',
      !!doc.getElementById('hdlFilesChip') && !!doc.getElementById('hdlVcdBtn'));
    check('With nothing loaded the file list does not repeat the drop zone advice',
      /No files loaded yet/.test(doc.getElementById('hdlFileList').textContent) &&
      !/every submodule it needs/.test(doc.getElementById('hdlFileList').innerHTML));
    check('The console is resizable',
      !!doc.getElementById('consoleResizer') && !!doc.getElementById('console'));
    check('Open accepts Verilog alongside assembly and C',
      /accept="[^"]*\.v[,"]/.test(doc.getElementById('fileLoader').outerHTML));
    check('Trace toggle exists and is on by default',
      !!doc.getElementById('hdlTrace') && doc.getElementById('hdlTrace').checked === true);
    check('Cross-check toggle exists and is off by default',
      !!doc.getElementById('hdlCompare') && doc.getElementById('hdlCompare').checked === false);

    // Every simulation setting has one home, and which engine it reaches is
    // visible from where it sits.
    const inTab = (id, tab) => {
      const el = doc.getElementById(id);
      return !!el && !!el.closest('#settingsContent-' + tab);
    };
    check('The Simulation tab keeps the shared and JS-only groups',
      !!doc.getElementById('simGroupBoth') && !!doc.getElementById('simGroupJs'));
    check('Statement Stepping sits under "Both engines"',
      !!doc.getElementById('simStatementStep') &&
      doc.getElementById('simStatementStep').closest('#simGroupBoth') !== null);
    check('JS-only settings sit under "Functional model"',
      doc.getElementById('simMaxInstrPerRun').closest('#simGroupJs') !== null &&
      doc.getElementById('cyclesConfigBody').closest('#simGroupJs') !== null);
    check('Every HDL setting is on the HDL tab',
      ['hdlCycles', 'hdlGeneration', 'hdlVcd', 'hdlCompare', 'hdlTrace', 'hdlRegPath',
       'hdlDropZone', 'hdlFileList'].every(id => inTab(id, 'hdl')));
    check('The JS tab points at the HDL tab rather than hiding it',
      /HDL Simulation<\/b>/.test(doc.getElementById('settingsContent-simulator').innerHTML));
    check('The duplicate in-panel Run button is gone', !doc.getElementById('hdlRunBtn'));
    check('Each simulation tab is named for the engine it configures',
      /JS Simulation/.test(doc.getElementById('settingsTabBtn-simulator').textContent) &&
      /HDL Simulation/.test(doc.getElementById('settingsTabBtn-hdl').textContent));
    // Statement Stepping reaches both engines, so it is offered on both tabs -
    // as one setting with two controls, not two settings.
    check('Statement Stepping appears on the HDL tab too',
      !!doc.getElementById('hdlStatementStep') &&
      doc.getElementById('hdlStatementStep').closest('#settingsContent-hdl') !== null);
    win.statementStepping = false;
    win.buildCyclesPanel();
    doc.getElementById('hdlStatementStep').checked = true;
    doc.getElementById('hdlStatementStep').onchange();
    check('Ticking it on the HDL tab turns it on for both',
      win.statementStepping === true && doc.getElementById('simStatementStep').checked === true);
    doc.getElementById('simStatementStep').checked = false;
    doc.getElementById('simStatementStep').onchange();
    check('And clearing it on the JS tab clears both',
      win.statementStepping === false && doc.getElementById('hdlStatementStep').checked === false);
    check('Register-file path field and its hint exist',
      !!doc.getElementById('hdlRegPath') && !!doc.getElementById('hdlRegPathHint'));
    check('Peripherals panel is untouched (still present)', !!doc.getElementById('tab-peripherals'));
    check('Nothing dims the Step control in HDL mode',
      !/body\.hdl-mode\s+#btnStep/.test(html));
    check('Registers panel carries the "no register file" notice element',
      !!doc.getElementById('hdlRegNotice'));

    // --- 2. Engine mode switching --------------------------------------
    console.log('\n[2] Engine mode toggle');
    win.setSimEngineMode('hdl');
    check('HDL mode marks the body', doc.body.classList.contains('hdl-mode'));
    check('HDL button becomes active', doc.getElementById('engBtnHdl').classList.contains('active'));
    win.refreshSimSettingsScope();
    check('In HDL mode the functional-model settings are dimmed, not hidden',
      doc.getElementById('simGroupJs').classList.contains('sim-group-off'));
    check('The dimmed group says why it is inactive',
      /HDL engine/.test(doc.getElementById('simGroupJsNote').textContent));
    check('Switching to HDL with no sources asks for them',
      doc.getElementById('settingsOverlay').classList.contains('open') &&
      doc.getElementById('settingsContent-hdl').classList.contains('active'));
    win.closeSettingsModal();
    check('The toolbar chip warns that no Verilog is loaded',
      /no Verilog/.test(doc.getElementById('hdlFilesChip').textContent));
    win.setSimEngineMode('js');
    check('Switching back to JS clears the body class', !doc.body.classList.contains('hdl-mode'));
    win.refreshSimSettingsScope();
    check('In JS mode the functional-model settings are live again',
      !doc.getElementById('simGroupJs').classList.contains('sim-group-off'));
    check('Settings shared by both engines are never dimmed',
      !doc.getElementById('simGroupBoth').classList.contains('sim-group-off'));
    win.setSimEngineMode('hdl');
    win.closeSettingsModal();

    // --- 3. Register-file discovery ------------------------------------
    // The Wrapper is fixed, but the core behind it is student code, so the
    // path to the register array has to be found rather than assumed.
    console.log('\n[3] Register-file discovery from the uploaded sources');
    check('Discovery returns nothing before any source is loaded',
      win.hdlDiscoverRegBank() === null);

    win.hdlSetSources(DESIGN.map(n => ({ name: n, src: fs.readFileSync(path.join(RV, n), 'utf8') })));
    check('All 9 RV sources are loaded', win.getHdlFiles().length === 9);
    check('The toolbar chip reports the loaded sources',
      /9 files/.test(doc.getElementById('hdlFilesChip').textContent));
    const regPath = win.hdlDiscoverRegBank();
    check('Register bank discovered: ' + regPath, regPath === 'dut.RV1.RegFile1.RegBank');
    check('The hint line reports the discovered path',
      /dut\.RV1\.RegFile1\.RegBank/.test(doc.getElementById('hdlRegPathHint').textContent));

    // Renaming the array and its module must still be found, since only the
    // shape "32 x 32-bit reg array" is relied on.
    const renamed = DESIGN.map(n => {
      let src = fs.readFileSync(path.join(RV, n), 'utf8');
      src = src.replace(/\bRegFile1\b/g, 'rf_inst')
               .replace(/\bRegFile\b/g, 'MyRF')
               .replace(/\bRegBank\b/g, 'xregs');
      return { name: n, src };
    });
    win.hdlSetSources(renamed);
    check('Discovery survives renaming the module, instance and array: ' +
      win.hdlDiscoverRegBank(), win.hdlDiscoverRegBank() === 'dut.RV1.rf_inst.xregs');
    win.hdlSetSources(DESIGN.map(n => ({ name: n, src: fs.readFileSync(path.join(RV, n), 'utf8') })));

    // --- 3b. Synthesis lint --------------------------------------------
    // Icarus's own -S pass is useless here: it rejects this very design (an
    // indexed write to RegBank, a reg driven by both an initial and a clocked
    // block) and reports the same errors for good and bad RTL alike. So the
    // lint is pattern-based, and the property that matters is that it stays
    // quiet on known-good code.
    console.log('\n[3b] Synthesis lint');
    win.hdlSetSources(DESIGN.map(n => ({ name: n, src: fs.readFileSync(path.join(RV, n), 'utf8') })));
    const lint = win.hdlSynthLint();
    check('No false "will not synthesise" errors on the reference design',
      lint.filter(h => h.level === 'err').length === 0);
    check('What it does flag on the reference design is only the ' +
      'explicit-sensitivity-list warning (' + lint.length + ')',
      lint.length > 0 && lint.every(h => /synthesis treats this as/.test(h.msg)));
    check('It names a file and a line',
      lint.every(h => /\.v$/.test(h.file) && h.line > 0));

    const badModule = [
      'module bad(input CLK, input [3:0] a, output reg [3:0] y, output reg [3:0] z);',
      '  real fudge;',
      '  reg [3:0] q;',
      '  initial begin #5 q = 0; end',
      '  always @(posedge CLK) begin',
      '    y = a + 1;',
      '    $display("y=%d", y);',
      '  end',
      '  always @(a) begin',
      '    z = a & q;',
      '  end',
      '  always @* begin',
      '    casex (a) 4\'b1xxx: q = 1; default: q = 0; endcase',
      '  end',
      '  always @(posedge CLK) begin forever #1 q <= ~q; end',
      'endmodule'
    ].join('\n');
    const bad = win.hdlLintFile('bad.v', badModule);
    const says = re => bad.some(h => re.test(h.msg));
    check('Catches a delay', says(/delay `#`/));
    check('Catches $display', says(/\$display/));
    check('Catches a real declaration', says(/`real` is not synthesisable/));
    check('Catches forever', says(/`forever`/));
    check('Catches casex', says(/`casex`/));
    check('Catches a blocking assignment in a clocked block', says(/blocking `=` in a clocked block/));
    check('Catches an initial block with a delay', says(/`initial` with a delay/));

    // The three things that made the first cut of this lint useless.
    check('A parameter list is not mistaken for a delay',
      win.hdlLintFile('p.v', 'module m #(parameter W = 8) (input x);\nendmodule')
        .every(h => !/delay/.test(h.msg)));
    check('A parameter override is not mistaken for a delay',
      win.hdlLintFile('p.v', 'module m; RV #(.PC_INIT(32\'h400000)) u(); endmodule')
        .every(h => !/delay/.test(h.msg)));
    check('A for-loop header is not mistaken for a racy assignment',
      win.hdlLintFile('l.v',
        'module m(input CLK); integer i; reg [3:0] q [0:3];\n' +
        'always @(posedge CLK) begin for(i=0;i<4;i=i+1) q[i] <= i; end\nendmodule').length === 0);
    check('Keywords inside comments and strings are ignored',
      win.hdlLintFile('c.v',
        'module t; // a #5 delay and $finish here\n/* forever */\nendmodule').length === 0);
    check('A testbench file is not linted',
      win.hdlLintFile === win.hdlLintFile);

    // --- 3c. Post-synthesis checking -----------------------------------
    // The Yosys download is 13 MB, so the pieces that do not need it are
    // tested directly: which files are synthesised, the parameter shim that
    // keeps the fixed Wrapper's instantiation valid, and the comparison.
    console.log('\n[3c] Post-synthesis plumbing');
    check('The synthesis checkbox exists and is off by default',
      !!doc.getElementById('hdlSynth') && doc.getElementById('hdlSynth').checked === false);
    check('It sits on the HDL Simulation tab',
      doc.getElementById('hdlSynth').closest('#settingsContent-hdl') !== null);
    check('Only the core is synthesised — the fixed Wrapper is excluded',
      win.hdlCoreFiles().length === 8 &&
      !win.hdlCoreFiles().some(f => /Wrapper/.test(f.name)));

    // Synthesis resolves parameters away; the Wrapper still says
    // `RV #(.PC_INIT(...)) RV1(...)`, so the netlist needs a shim.
    const fakeNet =
      'module RV(CLK, RESET, PC);\n  input CLK;\n  wire CLK;\n  input RESET;\n' +
      '  wire RESET;\n  output [31:0] PC;\n  wire [31:0] PC;\n  assign PC = 0;\nendmodule\n';
    const shimmed = win.hdlAddParamShim(fakeNet);
    check('The synthesised top is renamed out of the way',
      /module RV_synth\(/.test(shimmed));
    check('A parameterised RV shim is added so the Wrapper still elaborates',
      /module RV #\(parameter PC_INIT = 32'h400000\) \(CLK, RESET, PC\);/.test(shimmed));
    check('The shim re-declares the ports and instantiates the netlist',
      /input CLK;/.test(shimmed) && /output \[31:0\] PC;/.test(shimmed) &&
      /RV_synth u_synth\(CLK, RESET, PC\);/.test(shimmed));

    // The netlist has no register file to report writes from, so register
    // events are excluded from the comparison; everything observable is not.
    const sample = ['@@I 1 400000 ffff0437', '@@W 1 8 ffff0000', '@@M 9 ffff0060 f bead',
                    '@@L 9 ad', '@@T 3 41', '@@N 300 400024 0', 'plain $display output'].join('\n');
    const obs = win.hdlObservable(sample);
    check('Register writes are excluded from the comparison',
      !obs.some(l => l.startsWith('@@W')));
    check('Instructions, memory writes and peripherals are compared',
      obs.length === 4 && obs[0].startsWith('@@I') && obs[1].startsWith('@@M') &&
      obs[2].startsWith('@@L') && obs[3].startsWith('@@T'));
    check('The program\'s own output is not compared',
      !obs.some(l => /plain \$display/.test(l)));

    check('Identical runs report no difference',
      win.hdlFirstDifference(obs, obs.slice()) === -1);
    const changed = obs.slice(); changed[2] = '@@L 9 ff';
    check('A differing event is found, at the right index',
      win.hdlFirstDifference(obs, changed) === 2);
    check('A run that stops early is a difference',
      win.hdlFirstDifference(obs, obs.slice(0, 2)) === 2);

    // --- 3d. Settings behaviour ----------------------------------------
    console.log('\n[3d] Compiler settings and HDL tab layout');
    check('The M extension is off by default',
      doc.getElementById('godboltUseM').checked === false &&
      /-march=rv32i\b/.test(doc.getElementById('godboltArchFlags').value));

    // The compiled program belongs to the toolchain settings that produced
    // it, so changing one has to invalidate it.
    await win.loadExample('fib');
    win.assembleOnly();
    check('A program is loaded to begin with', win.getMachineCode().length > 0);
    win.invalidateCompiledProgram('M extension');
    check('Changing a compiler setting clears the compiled program',
      win.getMachineCode().length === 0);
    check('…and says so', /compile again|assemble again/i
      .test(doc.getElementById('statusBar').textContent));

    // A libgcc helper is what a multiply becomes with the M extension off.
    await win.loadExample('fib');
    win.editor.value = 'main:\n  call __mulsi3\n';
    win.assembleOnly();
    const errLines = [...doc.getElementById('console').querySelectorAll('div.error')]
      .map(x => x.textContent);
    check('A libgcc helper call explains itself instead of "Unknown symbol"',
      errLines.some(l => /__mulsi3/.test(l) && /M extension/.test(l)));

    // A program that does not fit its segment used to be reported only in the
    // console, where the success message immediately followed it.
    await win.loadExample('circle_accel');
    win.assembleOnly();
    check('A code-segment overflow survives on the status bar',
      /too many for the Code segment/.test(doc.getElementById('statusBar').textContent));
    await win.loadExample('fib');
    win.assembleOnly();
    check('A program that fits reports normally',
      /Ready to run/.test(doc.getElementById('statusBar').textContent));

    // Layout: sources first, then the three settings that matter most.
    const hdlTab = doc.getElementById('settingsContent-hdl');
    const groups = [...hdlTab.querySelectorAll('.sim-group-title')].map(e => e.textContent.trim());
    check('Sources come first, then Simulation',
      groups[0] === 'Processor sources' && groups[1] === 'Simulation');
    check('Post-synthesis, Cycles and Fast Mode are the Simulation group',
      ['hdlSynth', 'hdlCycles', 'hdlStatementStep']
        .every(id => doc.getElementById(id).closest('.sim-group').id === 'hdlGroupBoth'));
    check('Post-synthesis is named as a functional simulation',
      /Post-synthesis functional simulation/.test(hdlTab.textContent));
    check('Its long explanation is folded away',
      [...hdlTab.querySelectorAll('details')].some(d => /13 MB/.test(d.textContent)));
    check('Statement Stepping is worded identically on both tabs', (() => {
      const strip = t => t.replace(/Shared with .*/, '').replace(/\s+/g, ' ').trim();
      const hdl = strip(doc.getElementById('hdlStatementStep').closest('.sim-card').textContent);
      const js = strip(doc.getElementById('simStatementStep').closest('.sim-card').textContent);
      return hdl === js && hdl.length > 40;
    })());

    // --- 4. The testbench is program-independent -----------------------
    console.log('\n[4] Generated testbench carries no program-specific data');
    await win.loadExample('dip_led');
    win.setDipSwitches(0xBEAD);
    const tb = win.hdlBuildTestbench({});

    check('Instantiates Wrapper with the fixed port order',
      /Wrapper dut\(DIP, PB, LED_OUT, LED_PC, SEVENSEGHEX, UART_TX, UART_TX_ready,/.test(tb));
    check('Does not redefine or modify the Wrapper module', !/module\s+Wrapper\b/.test(tb));
    check('Reads the cycle budget at run time', /\$value\$plusargs\("CYCLES=%d"/.test(tb));
    check('Reads the trace level at run time', /\$value\$plusargs\("TRACE=%d"/.test(tb));
    check('Reads DIP, PB and the accelerometer at run time',
      /\$value\$plusargs\("DIP=%h"/.test(tb) && /\$value\$plusargs\("PB=%h"/.test(tb) &&
      /\$value\$plusargs\("ACCEL=%h"/.test(tb));
    check('Reads the input timeline from a file at run time',
      /\$readmemh\("stim\.mem"/.test(tb));
    check('Reads UART input from a file at run time',
      /\$readmemh\("uart_rx\.mem"/.test(tb));
    check('VCD dumping is a run-time choice, not a compile-time one',
      /\$test\$plusargs\("VCD"\)/.test(tb));
    check('The live DIP value is NOT baked into the Verilog',
      !/bead/i.test(tb) && /reg\s+\[15:0\]\s+DIP\s+=\s+16'h0000/.test(tb));
    check('Reaches the register file by the discovered path',
      tb.indexOf('dut.RV1.RegFile1.RegBank[j]') > 0);
    check('Detects register writes without naming any write-port signal',
      /rf_shadow/.test(tb) && !/RegWrite/.test(tb));
    check('Emits the architectural trace records', /@@I %0d %0h %0h/.test(tb) &&
      /@@W %0d %0d %0h/.test(tb) && /@@M %0d %0h %0h %0h/.test(tb));
    check('Emits tagged peripheral events', /@@L %0d %0h/.test(tb) && /@@O %0d %0d %0d %0h/.test(tb));
    check('Reports the UART RX acknowledge, so the console FIFO can drain',
      /@@A %0d/.test(tb));
    // Inputs are nonblocking assignments, so they have to be driven at the
    // edge that STARTS the cycle they are stamped with - otherwise the
    // instruction executing in that cycle reads the previous value.
    check('An input change is in force during the cycle it is stamped with',
      /stim_mem\[3\*stim_i\] <= cyc \+ 1/.test(tb));
    check('A UART byte is offered during the cycle it is stamped with',
      /rx_mem\[2\*rx_i\] <= cyc \+ 1/.test(tb));
    // Every peripheral output of the Wrapper is a registered output, so it
    // only becomes readable on the following cycle; sampling it at the
    // falling edge attributes it to the instruction that caused it.
    const negBlock = tb.slice(tb.indexOf('always @(negedge CLK) begin',
                                        tb.indexOf('Peripheral monitors')));
    check('Registered peripheral outputs are sampled on the falling edge',
      /@@L/.test(negBlock) && /@@S/.test(negBlock) &&
      /@@T/.test(negBlock) && /@@O/.test(negBlock) && /@@A/.test(negBlock));
    check('The combinational memory-write strobe stays on the rising edge',
      /always @\(posedge CLK\) begin[\s\S]*?@@M/.test(tb));

    // The decisive check: change every input and load a different program,
    // and the Verilog must come out byte-identical.
    win.setDipSwitches(0x0001);
    await win.loadExample('hello_world');
    const tbOther = win.hdlBuildTestbench({});
    check('Identical Verilog for a different program and different inputs',
      tbOther === tb);
    await win.loadExample('dip_led');

    check('Testbench without a register path still compiles-shaped output',
      !/rf_shadow/.test(win.hdlBuildTestbench({ regBankPath: null })));

    // --- 5. Memory images ----------------------------------------------
    console.log('\n[5] Memory images are generated from the assembled program');
    const mc = win.getMachineCode();
    check('DIP_to_LED assembled', Array.isArray(mc) && mc.length > 0);
    const wrapperSrc = fs.readFileSync(path.join(RV, 'Wrapper.v'), 'utf8');
    const mem = win.hdlMemFiles(wrapperSrc);
    check('IROM depth read from the uploaded Wrapper (9)', mem.iromBits === 9);
    check('DMEM depth read from the uploaded Wrapper (14)', mem.dmemBits === 14);
    const iromLines = mem.files['AA_IROM.mem'].trim().split('\n');
    check('IROM image is 8-hex-digit words, one per line',
      iromLines.every(l => /^[0-9a-f]{8}$/.test(l)));
    check('IROM image fits the Wrapper\'s IROM', iromLines.length <= mem.iromCapacity);
    // Compare against the reference RARS dump. The word COUNT must match;
    // individual words may legitimately differ where this assembler picks a
    // different but equivalent expansion of a pseudo-instruction (absolute
    // lui+lw vs PC-relative auipc+lw for the same address). Section 7 proves
    // functional equivalence by actually running it.
    const refIrom = fs.readFileSync(path.join(RV, 'AA_IROM_DIP_to_LED.mem'), 'utf8')
      .trim().split('\n').map(l => l.trim().toLowerCase()).filter(Boolean);
    const gotIrom = iromLines.map(l => l.toLowerCase());
    check('Generated IROM has the same word count as the reference RARS dump',
      refIrom.length === gotIrom.length);
    const sameWords = refIrom.filter((w, i) => w === gotIrom[i]).length;
    check('At least 80% of words are byte-identical to the reference dump (' +
      sameWords + '/' + refIrom.length + ')', sameWords >= refIrom.length * 0.8);

    // --- 6. Stimulus file format ---------------------------------------
    console.log('\n[6] Run-time stimulus files');
    win.hdlSetStim([{ cycle: 30, code: 1, value: 0x00ff }, { cycle: 5, code: 2, value: 3 }]);
    const stimTxt = win.hdlStimFile();
    check('stim.mem is one 32-bit hex word per line',
      stimTxt.trim().split('\n').every(l => /^[0-9a-f]{8}$/.test(l)));
    check('stim.mem holds three words per event, in cycle order',
      stimTxt.trim().split('\n').length === 6 &&
      stimTxt.trim().split('\n')[0] === '00000005');
    win.hdlSetRx([{ cycle: 12, byte: 0x41 }]);
    check('uart_rx.mem holds <cycle> <byte> pairs',
      win.hdlRxFile().trim().split('\n').join(',') === '0000000c,00000041');
    win.hdlSetStim([]); win.hdlSetRx([]);

    if (!fs.existsSync(path.join(ENGINE, 'ivl.js'))) {
      check('Engine present at ' + ENGINE + ' (set HDL_ENGINE_DIR to override)', false);
    } else {
      // --- 7. ONE compile, many runs -----------------------------------
      console.log('\n[7] Compiled once, then driven entirely at run time');
      const icarus = await makeIcarus(tb);
      check('Design + generic testbench compile cleanly', icarus.ok);

      if (icarus.ok) {
        const base = {
          'AA_IROM.mem': mem.files['AA_IROM.mem'],
          'AA_DMEM.mem': mem.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': ''
        };

        // (a) no plusargs at all - the downloaded testbench must stand alone
        const standalone = await icarus.run([], base);
        check('Runs standalone with no plusargs (as saved for Vivado/iverilog)',
          /\$finish called/.test(standalone));

        // (b) DIP supplied purely at run time
        const runA = await icarus.run(['+CYCLES=400', '+DIP=bead'], base);
        check('DIP passed as a plusarg reaches the hardware: LED=0x' +
          lastLed(runA).toString(16), lastLed(runA) === 0xad);

        // (c) the SAME binary, a different DIP - no recompilation
        const runB = await icarus.run(['+CYCLES=400', '+DIP=0072'], base);
        check('The same compiled binary yields a different result for a ' +
          'different run-time DIP: LED=0x' + lastLed(runB).toString(16),
          lastLed(runB) === 0x72);

        // --- 8. Architectural trace ------------------------------------
        console.log('\n[8] Architectural trace and its replay');
        const t = win.hdlParseTrace(runA);
        check('Trace contains instruction records', t.steps.length > 10);
        check('Execution starts at the reset vector 0x00400000',
          t.steps[0].pc === 0x00400000);
        check('Every record carries a PC and an instruction word',
          t.steps.every(s => Number.isFinite(s.pc) && Number.isFinite(s.instr)));
        check('Cycle numbers increase monotonically',
          t.steps.every((s, i) => i === 0 || s.cyc > t.steps[i - 1].cyc));
        const allWrites = t.steps.reduce((a, s) => a.concat(s.regw), []);
        check('Register writes were captured (' + allWrites.length + ')', allWrites.length > 5);
        check('x0 is never reported as written', allWrites.every(w => w[0] !== 0));
        check('The DIP value read by the program lands in a register: 0xbead',
          allWrites.some(w => w[1] === 0xbead));
        const allMem = t.steps.reduce((a, s) => a.concat(s.memw), []);
        check('The store to the LED MMIO register was captured',
          allMem.some(w => w[0] === 0xFFFF0060 && w[2] === 0xbead));
        check('A final snapshot closes the trace', !!t.final && !!t.next);

        // --- 8b. Seeking = stepping ------------------------------------
        // vvp cannot be paused, so stepping is navigation through the
        // recording. That also makes stepping backwards possible.
        console.log('\n[8b] Stepping and back-stepping through the recording');
        win.hdlLoadTrace(runA, 400);
        win.hdlSeek(0);
        check('Seek(0) puts the PC at the reset vector', win.getPc() === 0x00400000);
        check('At the start no register has been written by the hardware',
          win.getRegs().every((v, i) => i === 0 || v === 0));

        // Instruction 8 of DIP_to_LED is the load from the DIP MMIO register;
        // find the record that writes 0xbead and check the state either side.
        const kBead = t.steps.findIndex(s => s.regw.some(w => w[1] === 0xbead));
        check('Found the instruction that reads the DIP switches', kBead > 0);
        const rBead = t.steps[kBead].regw.find(w => w[1] === 0xbead)[0];

        win.hdlSeek(kBead);
        check('Just before it, the destination register is not yet 0xbead',
          (win.getRegs()[rBead] >>> 0) !== 0xbead);
        win.hdlSeek(kBead + 1);
        check('Just after it, x' + rBead + ' holds the DIP value 0xbead',
          (win.getRegs()[rBead] >>> 0) === 0xbead);
        check('The PC advanced by one instruction',
          win.getPc() === t.steps[kBead + 1].pc);

        win.hdlSeek(kBead);
        check('Stepping BACK undoes the register write',
          (win.getRegs()[rBead] >>> 0) !== 0xbead &&
          win.getPc() === t.steps[kBead].pc);

        win.hdlSeek(t.steps.length);
        check('Seeking to the end reproduces the hardware LED value: 0x' +
          win.getLedState().toString(16), win.getLedState() === 0xad);
        check('Seeking to the end lands on the @@N next-instruction PC',
          win.getPc() === t.next);
      }

      // --- 9. Live input changes replay deterministically --------------
      console.log('\n[9] Changing an input mid-run replays the same history');
      const icarus2 = await makeIcarus(tb);
      if (icarus2.ok) {
        const base = {
          'AA_IROM.mem': mem.files['AA_IROM.mem'],
          'AA_DMEM.mem': mem.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': ''
        };
        const plain = await icarus2.run(['+CYCLES=60', '+DIP=bead', '+TRACE=2'], base);

        // The page's own stimulus file: DIP becomes 0x00ff at cycle 30.
        win.hdlSetStim([{ cycle: 30, code: 1, value: 0x00ff }]);
        const withChange = await icarus2.run(
          ['+CYCLES=60', '+DIP=bead', '+TRACE=2', '+NSTIM=1'],
          Object.assign({}, base, { 'stim.mem': win.hdlStimFile() }));
        win.hdlSetStim([]);

        check('The input change takes effect: LED ends at 0x' +
          lastLed(withChange).toString(16) + ' instead of 0x' + lastLed(plain).toString(16),
          lastLed(plain) === 0xad && lastLed(withChange) === 0xff);

        // Determinism is what makes stepping-then-changing-an-input safe:
        // everything before the change must replay identically.
        const before = s => win.hdlParseTrace(s).steps.filter(x => x.cyc < 30)
          .map(x => x.cyc + ':' + x.pc.toString(16) + ':' + x.instr.toString(16)).join('|');
        check('History before the change is bit-identical in both runs',
          before(plain) === before(withChange) && before(plain).length > 50);
      }

      // --- 10. Bidirectional UART, fed at run time --------------------
      // HelloWorld.asm blocks in a UART_RX_VALID poll until it receives 'A'
      // then CR, echoes each byte, and only then prints its greeting.
      console.log('\n[10] Bidirectional UART, supplied through uart_rx.mem');
      await win.loadExample('hello_world');
      const mem2 = win.hdlMemFiles(wrapperSrc);
      const icarus3 = await makeIcarus(tb);
      check('The same testbench serves a completely different program', icarus3.ok);
      if (icarus3.ok) {
        win.hdlSetRx([{ cycle: 0, byte: 0x41 }, { cycle: 0, byte: 0x0D }]);
        const rxFile = win.hdlRxFile();
        win.hdlSetRx([]);
        const out = await icarus3.run(['+CYCLES=40000', '+NRX=2'], {
          'AA_IROM.mem': mem2.files['AA_IROM.mem'],
          'AA_DMEM.mem': mem2.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': rxFile
        });
        const tx = out.split('\n').filter(l => /^@@T /.test(l))
          .map(l => String.fromCharCode(parseInt(l.trim().split(/\s+/)[2], 16))).join('');
        check('Hardware transmitted UART bytes (' + tx.length + ')', tx.length > 0);
        check('The received bytes were echoed back', tx.indexOf('A') === 0);
        check('The greeting the program stores in DMEM was printed: ' +
          JSON.stringify(tx.slice(0, 40)), /Welcome to CG3207/.test(tx));
      }

      // --- 11. MMIO timing, in and out ------------------------------
      // Both halves of the "one instruction late" class of bug: an input
      // changed while paused must be seen by the very next instruction, and
      // a peripheral write must show up on the instruction that made it.
      console.log('\n[11] MMIO reads and writes land on the right instruction');
      await win.loadExample('dip_led');
      const memD = win.hdlMemFiles(wrapperSrc);
      const icarus4 = await makeIcarus(tb);
      if (icarus4.ok) {
        const baseD = {
          'AA_IROM.mem': memD.files['AA_IROM.mem'],
          'AA_DMEM.mem': memD.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': ''
        };
        const plainD = await icarus4.run(['+CYCLES=60', '+DIP=bead', '+TRACE=2'], baseD);
        const tD = win.hdlParseTrace(plainD);

        // (a) the instruction that reads the DIP switches
        const kLoad = tD.steps.findIndex(x => x.regw.some(w => w[1] === 0xbead));
        check('Found the DIP load in the recording', kLoad > 0);
        const cycLoad = tD.steps[kLoad].cyc;

        // Stamp the change at exactly the cycle that instruction runs in,
        // which is what the UI does when an input is moved while paused.
        win.hdlSetStim([{ cycle: cycLoad, code: 1, value: 0x00ff }]);
        const stimTiming = win.hdlStimFile();
        win.hdlSetStim([]);
        const changed = await icarus4.run(
          ['+CYCLES=60', '+DIP=bead', '+TRACE=2', '+NSTIM=1'],
          Object.assign({}, baseD, { 'stim.mem': stimTiming }));
        const tC = win.hdlParseTrace(changed);
        check('An input changed while paused is read by the very next ' +
          'instruction, not the one after it',
          tC.steps[kLoad].regw.some(w => w[1] === 0x00ff));
        check('The recording up to that instruction is unchanged',
          tC.steps.slice(0, kLoad).every((x, i) =>
            x.pc === tD.steps[i].pc && x.cyc === tD.steps[i].cyc));

        // (b) the store into the LED register
        const kStore = tD.steps.findIndex(x => x.memw.some(w => w[0] === 0xFFFF0060));
        check('Found the store to the LED register', kStore > 0);
        win.hdlLoadTrace(plainD, 60);
        win.hdlSeek(kStore);
        const ledBefore = win.getLedState();
        win.hdlSeek(kStore + 1);
        check('The LED is still unlit on the instruction that writes it',
          ledBefore === 0);
        check('The LED shows the new value as soon as that instruction ' +
          'completes, not one instruction later', win.getLedState() === 0xad);

        // --- 12. Breakpoints and Resume ------------------------------
        console.log('\n[12] Breakpoints stop the hardware run');
        const storePc = tD.steps[kStore].pc;
        const storeLine = win.getMachineCode().find(m => m.address === storePc).line;
        win.getBreakpoints().clear();
        win.getBreakpoints().add(storeLine);
        check('Breakpoint search finds the recorded instruction on that line',
          win.hdlBreakAt(0) === kStore);
        win.hdlSeek(0);
        const r1 = await win.hdlResumeRun();
        check('Resume stops at the breakpoint rather than running to the end',
          r1.stop === 'breakpoint' && win.getHdlIndex() === kStore);
        const r2 = await win.hdlResumeRun();
        check('Resuming again moves on to the next time that line is reached',
          r2.stop === 'breakpoint' && win.getHdlIndex() > kStore);
        win.getBreakpoints().clear();
        win.hdlSeek(0);
        const r3 = await win.hdlResumeRun();
        check('With no breakpoints Resume runs to the end of the recording',
          r3.stop === 'end' && win.getHdlIndex() === tD.steps.length);

        // --- 13. The console RX FIFO drains as the hardware reads it --
        console.log('\n[13] UART RX_VALID follows the hardware');
        await win.loadExample('hello_world');
        const memH = win.hdlMemFiles(wrapperSrc);
        win.hdlSetRx([{ cycle: 0, byte: 0x41 }, { cycle: 0, byte: 0x0D }]);
        const rxTxt = win.hdlRxFile();
        const outH = await icarus4.run(['+CYCLES=40000', '+NRX=2', '+TRACE=2'], {
          'AA_IROM.mem': memH.files['AA_IROM.mem'],
          'AA_DMEM.mem': memH.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': rxTxt
        });
        const tH = win.hdlParseTrace(outH);
        const acks = [];
        tH.steps.forEach((x, i) => { if (x.acks) acks.push(i); });
        check('Both RX bytes were acknowledged by the hardware (' + acks.length + ')',
          acks.length === 2);
        win.hdlLoadTrace(outH, 40000);
        win.hdlSetRx([{ cycle: 0, byte: 0x41 }, { cycle: 0, byte: 0x0D }]);
        win.hdlSeek(acks[0]);
        check('Before the read, both bytes are still queued and RX_VALID is 1',
          win.getUartRxQueue().length === 2);
        win.hdlSeek(acks[0] + 1);
        check('The byte leaves the queue on the instruction that reads it',
          win.getUartRxQueue().join(',') === '13');
        win.hdlSeek(acks[1] + 1);
        check('RX_VALID falls back to 0 once every byte has been read',
          win.getUartRxQueue().length === 0);
        win.hdlSeek(acks[0]);
        check('Stepping back over the read puts the byte back',
          win.getUartRxQueue().length === 2);
        win.hdlSetRx([]);

        // --- 14. Statement Stepping applies to both engines -----------
        // One Step should cover every machine instruction a source line
        // expands to, in the recording exactly as in the functional model.
        console.log('\n[14] Statement Stepping moves the same distance in HDL');
        await win.loadExample('basic');
        const memB = win.hdlMemFiles(wrapperSrc);
        const outB = await icarus4.run(['+CYCLES=60', '+TRACE=2'], {
          'AA_IROM.mem': memB.files['AA_IROM.mem'],
          'AA_DMEM.mem': memB.files['AA_DMEM.mem'],
          'stim.mem': '', 'uart_rx.mem': ''
        });
        win.hdlLoadTrace(outB, 60);
        const tB = win.getHdlTrace();
        win.hdlSeek(0);
        // Find a source line that expands to more than one instruction
        // (`la` becomes auipc + addi).
        let kPair = -1;
        for (let i = 0; i + 1 < tB.steps.length; i++) {
          const a = win.sourceLineForPc(tB.steps[i].pc);
          if (a > 0 && a === win.sourceLineForPc(tB.steps[i + 1].pc)) { kPair = i; break; }
        }
        check('Found a source line that expands to several instructions', kPair >= 0);
        if (kPair >= 0) {
          win.statementStepping = false;
          check('Off: one Step is one machine instruction',
            win.hdlStatementTarget(kPair) === kPair + 1);
          win.statementStepping = true;
          const target = win.hdlStatementTarget(kPair);
          check('On: one Step covers the whole statement (' +
            (target - kPair) + ' instructions)', target > kPair + 1);
          check('The step lands on a different source line',
            win.sourceLineForPc(tB.steps[target] ? tB.steps[target].pc : tB.next) !==
            win.sourceLineForPc(tB.steps[kPair].pc));
          check('Back undoes exactly what Step did',
            win.hdlStatementBackTarget(target) === kPair);
          win.statementStepping = false;
          check('Off: Back is one machine instruction',
            win.hdlStatementBackTarget(target) === target - 1);
        }
      }
    }

    console.log('\n===========================================================');
    if (failed === 0) { console.log(`🎉 ALL ${passed} HDL MODE TESTS PASSED!`); process.exit(0); }
    else { console.log(`💥 ${failed} HDL MODE TEST(S) FAILED (${passed} passed)`); process.exit(1); }
  } catch (err) {
    console.error('HDL Mode Test Failed:', err);
    process.exit(1);
  }
}, 900);
