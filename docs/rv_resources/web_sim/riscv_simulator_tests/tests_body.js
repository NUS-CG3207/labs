function assembleok(label, src) {
  const out = assemble(src);
  const errs = out.filter(i => i.error);
  if (errs.length) {
    console.log('[' + label + '] ERRORS:');
    errs.forEach(e => console.log('   line ' + e.line + ': ' + e.error + '  (' + e.asmLine + ')'));
  }
  return out;
}
function hex32(v){ return '0x' + ((v>>>0).toString(16).padStart(8,'0')); }

console.log('=== li 0x20000 (reported bug) ===');
let out = assembleok('li', 'main:\n  li x28, 0x20000\n  j done\ndone:\n  j done\n');
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' '):'ERR')+' | '+i.text));
resetAll();
const prog = assemble('main:\n  li x28, 0x20000\n  j done\ndone:\n  j done\n');
loadProgram(prog);
pc = 0x10000;
pc = decodeAndExecute(fetchInstruction(0x10000), 0x10000);
console.log('  x28 after li =', hex32(regs[28]), regs[28] === 0x20000 ? 'PASS' : 'FAIL');

console.log('=== li 0x1FFFFF (rounding carry) ===');
resetAll();
loadProgram(assemble('main:\n  li x1, 0x1FFFFF\n'));
pc = 0x10000;
pc = decodeAndExecute(fetchInstruction(pc), pc);   // lui
pc = decodeAndExecute(fetchInstruction(pc), pc);   // addi
console.log('  x1 =', hex32(regs[1]), regs[1]===0x1FFFFF ? 'PASS':'FAIL');

console.log('=== lui x5, 0x10000 ===');
resetAll();
loadProgram(assemble('main:\n  lui x5, 0x10000\n'));
pc=0x10000;
pc = decodeAndExecute(fetchInstruction(pc), pc);
console.log('  x5 =', hex32(regs[5]), regs[5]===0x10000000?'PASS':'FAIL');

console.log('=== .data / la / .word / .equ ===');
const dataCode = [
'.equ  N, 5',
'.text',
'main:',
'  la  x28, data0',
'  lw  x1, 0(x28)',
'  lw  x2, 4(x28)',
'  addi x3, x3, N',
'  j done',
'.data',
'data0: .word 40, 50',
'data1: .half 7, 8',
'.byte 1, 2',
'mybuf: .space 4',
'msg: .asciiz "Hi"',
'.align 2',
'dw: .dword 0x1122334455667788',
'.text',
'done:',
'  j done'
].join('\n');
out = assembleok('data', dataCode);
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.length+'B':'ERR')+' | '+(i.text||'')));
console.log('  data0 label =', hex32(labels['data0']), labels['data0']===0x20000?'PASS(0x20000)':'addr-not-0x20000');
console.log('  msg label =', labels['msg']!==undefined?hex32(labels['msg']):'MISSING');
resetAll();
loadProgram(assemble(dataCode));
console.log('  mem[.word 40] =', readMem(0x20000,4), readMem(0x20000,4)===40?'PASS (little-endian)':'wrong');
console.log('  msg first char =', JSON.stringify(labels['msg']!==undefined?String.fromCharCode(readMem(labels['msg']||0,1)):''));

console.log('=== branch pseudo + call/tail/la expansion ===');
out = assembleok('pseudo', 'main:\n  beqz x1, there\n  bnez x2, there\n  j there\n  jal there\nthere:\n  call func\nfunc:\n  ret\n');
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(''):'ERR')+' | '+i.text));

console.log('=== lw rd, label (direct, out-of-12-bit-range) ===');
const lwLabelCode = [
'.text',
'main:',
'  lw s3, delay_val',
'  j done',
'.data',
'delay_val: .word 0x12345678',
'.text',
'done:',
'  j done'
].join('\n');
out = assembleok('lwlabel', lwLabelCode);
const lwHasErr = out.some(i=>i.error);
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' '):'ERR')+' | '+i.text));
console.log('  lw-label no assembler error:', lwHasErr ? 'FAIL' : 'PASS');
// Verify expansion: lui x5, hi(delay_val); lw s3, lo(x5) loads the stored word.
if (!lwHasErr) {
  const toHexBytes = arr => arr.map(b => b.toString(16).padStart(2, '0')).join('');
  const deadAddr = labels['delay_val'];
  const upper = deadAddr >>> 12;
  const lower = deadAddr & 0xFFF;
  // lui x5, upper ; lw s3, lower(x5)
  const luiEnc = (upper << 12) | (5 << 7) | 0b0110111;
  const lwEnc = (lower << 20) | (5 << 15) | (0b010 << 12) | (19 << 7) | 0b0000011;
  const expLui = toHexBytes([luiEnc & 0xFF, (luiEnc>>8)&0xFF, (luiEnc>>16)&0xFF, (luiEnc>>24)&0xFF]);
  const expLw = toHexBytes([lwEnc & 0xFF, (lwEnc>>8)&0xFF, (lwEnc>>16)&0xFF, (lwEnc>>24)&0xFF]);
  const gotLui = toHexBytes(out[0].bytes);
  const gotLw = toHexBytes(out[1].bytes);
  console.log('  lui+load expansion correct:', (gotLui === expLui && gotLw === expLw) ? 'PASS' : `FAIL (got ${gotLui},${gotLw} want ${expLui},${expLw})`);
}

console.log('=== li x6, -1 ===');
resetAll();
loadProgram(assemble('main:\n  li x6, -1\n'));
pc=0x10000;
pc = decodeAndExecute(fetchInstruction(pc), pc);
console.log('  x6 =', hex32(regs[6]), regs[6]===-1?'PASS':'FAIL');

console.log('=== mv / ret / jr / nop / neg ===');
out = assembleok('misc', 'main:\n  mv x10, x11\n  nop\n  ret\n  jr x4\n  neg x5, x6\n');
out.forEach(i=>console.log(' 0x'+i.address.toString(16)+': '+(i.bytes?i.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' '):'ERR')+' | '+i.text));

console.log('=== jump & branch offset calculation tests ===');
const jumpBranchCode = [
  '.text',
  'main:',
  '  addi x1, x0, 5',
  '  addi x2, x0, 5',
  '  beq  x1, x2, target',  // +12 byte offset (PC 0x10008 to target 0x10014)
  '  addi x3, x0, 99',
  '  j    end',             // +16 byte offset (PC 0x10010 to end 0x10020)
  'target:',
  '  addi x3, x0, 42',
  '  j    loop',            // -4 byte offset (PC 0x10018 to loop 0x1001c)
  'loop:',
  '  jal  x0, 0',           // 0 byte offset (PC 0x1001c to 0x1001c)
  'end:',
  '  jalr x1'
].join('\n');

const jbOut = assembleok('jump_branch', jumpBranchCode);
// beq x1, x2, target at 0x10008: offset is 12 (0xC), expect 63 86 20 00
const beqEnc = jbOut[2].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  beq offset 12 byte encoding:', beqEnc === '63 86 20 00' ? 'PASS' : `FAIL (${beqEnc})`);

// j end at 0x10010: target is end (0x10020), offset is 16 (0x10), expect 6f 00 00 01
const jEndEnc = jbOut[4].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  j end offset 16 byte encoding:', jEndEnc === '6f 00 00 01' ? 'PASS' : `FAIL (${jEndEnc})`);

// jal x0, 0 (self jump) at 0x1001c (jbOut[7]): offset is 0, expect 6f 00 00 00
const selfJEnc = jbOut[7].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  self jump (0 offset) encoding:', selfJEnc === '6f 00 00 00' ? 'PASS' : `FAIL (${selfJEnc})`);

// Verify runtime execution of beq branch
resetAll();
loadProgram(jbOut);
pc = 0x10000;
// Step 1: addi x1, x0, 5 -> pc=0x10004
// Step 2: addi x2, x0, 5 -> pc=0x10008
// Step 3: beq x1, x2, target -> pc=0x10014 (target)
// Step 4: addi x3, x0, 42 -> pc=0x10018, regs[3]=42
for (let step = 0; step < 4; step++) {
  pc = decodeAndExecute(fetchInstruction(pc), pc);
}
console.log('  beq target execution pc =', hex32(pc), pc === 0x10018 ? 'PASS' : `FAIL (pc=${hex32(pc)})`);
console.log('  x3 after branch execution =', regs[3], regs[3] === 42 ? 'PASS' : `FAIL (x3=${regs[3]})`);

console.log('=== bare label load offset test (DIP_to_LED pattern) ===');
const dipCode = [
  '.text',
  'main:',
  '  lw s1, LED_ADDR',
  '  sw s4, (s1)',
  'wait:',
  '  addi s3, s3, -1',
  '  beq s3, zero, loop',
  '  jal zero, wait',
  'loop:',
  '  j main',
  '.data',
  'LED_ADDR: .word 0xFFFF0060'
].join('\n');
const dipOut = assembleok('dip_pattern', dipCode);
// jal zero, wait is at 0x10014; wait: is at 0x1000c (addi s3, s3, -1); offset -8 -> expect 6f f0 9f ff
const jalWaitEnc = dipOut[5].bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
console.log('  jal zero, wait target (0x1000c addi) encoding:', jalWaitEnc === '6f f0 9f ff' ? 'PASS' : `FAIL (${jalWaitEnc})`);

console.log('=== Circle_delay_accel.asm Execution & Accelerometer Visualisation ===');
const circleAsm = fs.readFileSync('Circle_delay_accel.asm', 'utf8');
const circleProg = assembleok('circle_accel', circleAsm);
loadProgram(circleProg);

const circlePresets = [
  { name: 'Flat (Z=+1g) [Blue]',  x: 0,  y: 0,  z: 64, exp: [0, 0, 128] },
  { name: 'Tilt X (+1g) [Red]',   x: 64, y: 0,  z: 0,  exp: [128, 0, 0] },
  { name: 'Tilt Y (+1g) [Green]', x: 0,  y: 64, z: 0,  exp: [0, 128, 0] },
  { name: 'Tilt X+Y [Yellow]',    x: 64, y: 64, z: 0,  exp: [128, 128, 0] },
];

for (const cp of circlePresets) {
  accelX = cp.x; accelY = cp.y; accelZ = cp.z; accelTemp = 25; accelDready = 1;
  let pxCount = 0; let cColor = null;
  const oldWrite = writeOledPixel;
  writeOledPixel = function(val) {
    pxCount++; oldWrite(val);
    const idx = (oledRow * 96 + oledCol) * 4;
    cColor = [oledBuffer[idx], oledBuffer[idx+1], oledBuffer[idx+2]];
  };
  while (pc !== labels['.LBB0_10']) { executeOne(); }
  writeOledPixel = oldWrite;
  const colPass = cColor && cColor[0] === cp.exp[0] && cColor[1] === cp.exp[1] && cColor[2] === cp.exp[2];
  console.log(`  ${cp.name}: pixels=${pxCount} (${pxCount===2533?'PASS':'FAIL'}), color=RGB(${cColor}) (${colPass?'PASS':'FAIL'})`);
  totalCycles = regs[11];
  while (pc !== labels['.LBB0_1']) { executeOne(); }
}

console.log('=== Breakpoint Resume & Step-Then-Run Verification ===');
const bpCode = [
  'main:',
  '  addi x1, x0, 0',
  '  addi x2, x0, 5',
  'loop:',
  '  addi x1, x1, 1',
  '  bne x1, x2, loop',
  '  j done',
  'done:',
  '  nop'
].join('\n');

editor.value = bpCode;
resetAll();
breakpoints.clear();
breakpoints.add(5); // Breakpoint on line 5 ("addi x1, x1, 1")

// 1. Initial Run -> stops at line 5 before execution
runProgram();
const bpPass1 = (pc === 0x10008 && regs[1] === 0 && currentExecLine === 5);
console.log('  Initial Run (stops at BP line 5):', bpPass1 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 2. Resume Run directly from BP -> advances x1 to 1 and loops back to line 5 BP
runProgram();
const bpPass2 = (pc === 0x10008 && regs[1] === 1 && currentExecLine === 5);
console.log('  Resume Run directly from BP (iter 1):', bpPass2 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 3. Step Once -> executes line 5, advances to line 6
stepOnce();
const bpPass3 = (pc === 0x1000c && regs[1] === 2 && currentExecLine === 6);
console.log('  Step Once after BP (advances to line 6, x1=2):', bpPass3 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 4. Run from after step -> continues loop without resetting and hits line 5 BP on next iteration
runProgram();
const bpPass4 = (pc === 0x10008 && regs[1] === 2 && currentExecLine === 5);
console.log('  Run from after step (continues to next iter BP):', bpPass4 ? 'PASS' : `FAIL (pc=0x${pc.toString(16)}, x1=${regs[1]}, line=${currentExecLine})`);

// 5. Clear BP and run to completion
breakpoints.clear();
runProgram();
const bpPass5 = (regs[1] === 5 && programFinished === true);
console.log('  Clear BP and Run to completion (x1=5, finished=true):', bpPass5 ? 'PASS' : `FAIL (x1=${regs[1]}, finished=${programFinished})`);

// 6. Run after program finished -> restarts fresh from beginning
runProgram();
const bpPass6 = (regs[1] === 5 && programFinished === true);
console.log('  Run after finished (re-assembles and runs from start):', bpPass6 ? 'PASS' : `FAIL (x1=${regs[1]}, finished=${programFinished})`);

console.log('=== UART Send, MMIO Peek, and Program Switch Verification ===');
// 1. Send UART character 'A' (0x41)
document.getElementById('uartInputMode').value = 'ascii';
document.getElementById('uartInputText').value = 'A';
document.getElementById('uartAutoSendCheck').checked = false;
sendUartInput();

const uartPass1 = (uartRxQueue.length === 1 && uartRxQueue[0] === 0x41);
console.log('  UART send \'A\' into RX FIFO:', uartPass1 ? 'PASS' : `FAIL (queue=${JSON.stringify(uartRxQueue)})`);

const rxValidVal = readMem(0xFFFF0000, 1, true);
const rxDataVal = readMem(0xFFFF0004, 1, true);
const badgeRxValid = document.getElementById('badgeRxValid').innerText;
const uartPass2 = (rxValidVal === 1 && rxDataVal === 0x41 && badgeRxValid === '1' && uartRxQueue.length === 1);
console.log('  RX_VALID=1 and RX=0x41 before CPU read (peek non-destructive):', uartPass2 ? 'PASS' : `FAIL (rxVal=${rxValidVal}, rxData=0x${rxDataVal.toString(16)}, badge=${badgeRxValid}, qLen=${uartRxQueue.length})`);

// 2. CPU instruction reads 0xFFFF0004 -> consumes 'A'
const cpuRead = readMem(0xFFFF0004, 1, false);
const rxValidAfter = readMem(0xFFFF0000, 1, true);
const badgeRxValidAfter = document.getElementById('badgeRxValid').innerText;
const uartPass3 = (cpuRead === 0x41 && uartRxQueue.length === 0 && rxValidAfter === 0 && badgeRxValidAfter === '0');
console.log('  CPU readMem consumes byte and clears RX_VALID to 0:', uartPass3 ? 'PASS' : `FAIL (cpuRead=0x${cpuRead.toString(16)}, qLen=${uartRxQueue.length}, rxVal=${rxValidAfter})`);

// 3. Write to UART_TX (0xFFFF000C)
writeMem(0xFFFF000C, 0x48, 1); // 'H'
writeMem(0xFFFF000C, 0x69, 1); // 'i'
const uartPass4 = (uartTxBuffer === 'Hi');
console.log('  UART TX write outputs to terminal buffer (\'Hi\'):', uartPass4 ? 'PASS' : `FAIL (uartTxBuffer=${uartTxBuffer})`);

// 4. Switching assembly program clears serial console and resets peripherals
loadExample('basic');
const uartPass5 = (uartTxBuffer === '' && uartRxQueue.length === 0 && document.getElementById('badgeRxValid').innerText === '0');
console.log('  Switching example clears serial console & resets UART state:', uartPass5 ? 'PASS' : `FAIL (tx=${uartTxBuffer}, qLen=${uartRxQueue.length})`);

// 4b. Hex mode: input parsing interprets tokens as hex bytes (0x-prefixed or bare)
const hexModeEl = document.getElementById('uartInputMode');
const hexInputEl = document.getElementById('uartInputText');
hexModeEl.value = 'hex';
hexInputEl.value = '0x41, 0x0d, 48, 69h, 0D';
uartRxQueue = [];
sendUartInput();
const hexQueue = JSON.stringify(uartRxQueue);
const hexParsePass = (hexQueue === JSON.stringify([0x41, 0x0D, 0x48, 0x69, 0x0D]));
console.log('  UART hex send "0x41, 0x0d, 48, 69h, 0D" -> 5 bytes (0x41,0x0D,0x48,0x69,0x0D):', hexParsePass ? 'PASS' : `FAIL (queue=${hexQueue})`);

// Invalid hex tokens are skipped (zz, 0xGG, >0xFF) without erroring
hexInputEl.value = '0x41, zz, 0xGG, 300, 0d';
uartRxQueue = [];
sendUartInput();
const hexQueue2 = JSON.stringify(uartRxQueue);
const hexSkipPass = (hexQueue2 === JSON.stringify([0x41, 0x0D]));
console.log('  UART hex send skips invalid tokens (zz, 0xGG, 300):', hexSkipPass ? 'PASS' : `FAIL (queue=${hexQueue2})`);

// Hex output: UART_TX writes render as hex and persist across updatePeripherals
uartTxBuffer = '';
uartTxBytes = [];
writeMem(0xFFFF000C, 0x41, 1); // 'A'
writeMem(0xFFFF000C, 0x0D, 1); // '\r'
updatePeripherals();
const hexTermText = document.getElementById('uartTerminal').innerText;
const hexDisplayPass = (hexTermText === '0x41 0x0D');
console.log('  UART hex terminal shows "0x41 0x0D" after updatePeripherals:', hexDisplayPass ? 'PASS' : `FAIL (text=${JSON.stringify(hexTermText)})`);

// Switching back to ASCII re-renders the same bytes as raw text
hexModeEl.value = 'ascii';
updatePeripherals();
const asciiTermText = document.getElementById('uartTerminal').innerText;
const asciiReRenderPass = (asciiTermText === 'A\r');
console.log('  Switching to ASCII re-renders terminal as raw buffer:', asciiReRenderPass ? 'PASS' : `FAIL (text=${JSON.stringify(asciiTermText)})`);

// Reset clears the byte log so the hex display is cleared too
hexModeEl.value = 'hex';
resetAll();
const clearedTermText = document.getElementById('uartTerminal').innerText;
const hexResetPass = (clearedTermText === '(Terminal output will appear here...)');
console.log('  Reset clears UART terminal display (hex mode):', hexResetPass ? 'PASS' : `FAIL (text=${JSON.stringify(clearedTermText)})`);

// 5. Verify Stack Pointer (x2 / sp) is 0 on reset
resetAll();
const spResetPass = (regs[2] === 0);
console.log('  Stack Pointer (x2 / sp) is 0 on reset (hardware spec):', spResetPass ? 'PASS' : `FAIL (sp=0x${regs[2].toString(16)})`);

// 6. Segment address change triggers re-assembly
const segTestCode = [
  '.text',
  'main:',
  '  la x1, mydata',
  '  lw x2, 0(x1)',
  '.data',
  'mydata: .word 0x12345678'
].join('\n');

editor.value = segTestCode;
assembleOnly();

// Change segment addresses to Code=0x40000, Data=0x80000
document.getElementById('ms-code').value = '0x40000';
document.getElementById('ms-data').value = '0x80000';
document.getElementById('ms-stack').value = '0x90000';
document.getElementById('ms-mmio').value = '0xFFFF0000';
applyMemSegments();

const segPass1 = (baseAddress === 0x40000 && dataBase === 0x80000 && labels['mydata'] === 0x80000 && readMem(0x80000, 4) === 0x12345678 && machineCode[0].address === 0x40000 && assembled === true);
console.log('  applyMemSegments() re-assembles code & data to new addresses:', segPass1 ? 'PASS' : `FAIL (base=0x${baseAddress.toString(16)}, data=0x${dataBase.toString(16)}, lbl=0x${labels['mydata']?.toString(16)})`);

// Restore default segment addresses
resetMemSegments();
const segPass2 = (baseAddress === 0x10000 && dataBase === 0x20000 && labels['mydata'] === 0x20000 && readMem(0x20000, 4) === 0x12345678 && machineCode[0].address === 0x10000 && assembled === true);
console.log('  resetMemSegments() re-assembles back to default addresses:', segPass2 ? 'PASS' : `FAIL (base=0x${baseAddress.toString(16)}, data=0x${dataBase.toString(16)}, lbl=0x${labels['mydata']?.toString(16)})`);

// 7. Save filename suggestions and memory dump names
loadExample('circle_accel');
const namePass1 = (currentFileName === 'Circle_delay_accel.asm');
loadExample('basic');
const namePass2 = (currentFileName === 'basic.asm');
console.log('  Default save filename derived from loaded example/file:', (namePass1 && namePass2) ? 'PASS' : `FAIL (circle=${currentFileName})`);

const memDumpText = buildMemFileText(machineCode.filter(i => !i.error && i.bytes));
const memCommentPass = memDumpText.includes('// @') && !memDumpText.match(/^@[0-9a-fA-F]+/m);
console.log('  Memory dump @ address line is commented with //:', memCommentPass ? 'PASS' : 'FAIL');

// 8. Find match highlighting & navigation
editor.value = 'addi x1, x0, 10\naddi x2, x1, 20\naddi x3, x2, 30';
updateEditor();
openFindReplace(false);
document.getElementById('findInput').value = 'addi';
updateFindMatches();
const hlLayer = document.getElementById('highlightLayer');
const hasActiveMark = hlLayer.innerHTML.includes('hl-find-active') && hlLayer.innerHTML.includes('addi');
const hasMatchMark = hlLayer.innerHTML.includes('hl-find-match');
findNext();
const navigatedActive = (activeFindIndex === 1);
closeFindReplace();
const clearedHighlights = !hlLayer.innerHTML.includes('hl-find-active') && !hlLayer.innerHTML.includes('hl-find-match');
const findHighlightPass = hasActiveMark && hasMatchMark && navigatedActive && clearedHighlights;
console.log('  In-editor live Find match highlighting & navigation:', findHighlightPass ? 'PASS' : 'FAIL');

// 9. ACCEL_DATA packing {temperature, X, Y, Z} MSB down to LSB
accelTemp = 25; // 0x19
accelX = 64;    // 0x40
accelY = -64;   // 0xC0 (-64 in 8-bit = 0xC0)
accelZ = 127;   // 0x7F
const packedAccel = readMem(0xFFFF0040, 4);
const expPacked = (((25 & 0xFF) << 24) | ((64 & 0xFF) << 16) | ((-64 & 0xFF) << 8) | (127 & 0xFF)) >>> 0;
const accelZByte = readMem(0xFFFF0040, 1);
const accelYByte = readMem(0xFFFF0041, 1);
const accelXByte = readMem(0xFFFF0042, 1);
const accelTByte = readMem(0xFFFF0043, 1);
const accelPackingPass = (packedAccel === expPacked) && (accelZByte === 127) && (accelYByte === 0xC0) && (accelXByte === 64) && (accelTByte === 25);
console.log('  ACCEL_DATA packing {temp, X, Y, Z} & byte offsets:', accelPackingPass ? 'PASS' : 'FAIL');

// 10. Tilt preset toggle (-1g / +1g)
setAccelPreset('flat');
const flatZ = accelZ === 64 && accelX === 0 && accelY === 0;
setAccelPreset('tiltX'); // 1st click -> -64 (-1g)
const tiltX1 = accelX === -64;
setAccelPreset('tiltX'); // 2nd click -> +64 (+1g)
const tiltX2 = accelX === 64;
setAccelPreset('tiltY'); // 1st click -> -64 (-1g)
const tiltY1 = accelY === -64;
setAccelPreset('tiltY'); // 2nd click -> +64 (+1g)
const tiltY2 = accelY === 64;
const tiltTogglePass = flatZ && tiltX1 && tiltX2 && tiltY1 && tiltY2;
console.log('  Accelerometer Tilt X/Y toggle between -1g and +1g:', tiltTogglePass ? 'PASS' : 'FAIL');

// 11. RARS Syscall Execution (print_int, print_string, print_hex, print_char, exit)
resetAll();
const rarsAsm = [
  '.text',
  'main:',
  '  la a0, msg',
  '  li a7, 4',     // print_string
  '  ecall',
  '  li a0, 42',
  '  li a7, 1',     // print_int
  '  ecall',
  '  li a0, 0x1234',
  '  li a7, 34',    // print_hex
  '  ecall',
  '  li a0, 65',    // 'A'
  '  li a7, 11',    // print_char
  '  ecall',
  '  li a7, 10',    // exit
  '  ecall',
  '.data',
  'msg: .asciz "SyscallTest:"'
].join('\n');
editor.value = rarsAsm;
assembleOnly();
running = true;
const logCountBefore = consoleEl.childNodes.length;
let steps = 0;
while (running && steps < 30) {
  executeOne();
  steps++;
}
const logsAfter = consoleEl.childNodes.slice(logCountBefore).map(n => n.textContent);
const hasStr = logsAfter.includes('SyscallTest:');
const hasInt = logsAfter.includes('42');
const hasHex = logsAfter.some(l => l.toLowerCase() === '0x00001234');
const hasChar = logsAfter.includes('A');
const rarsPass = hasStr && hasInt && hasHex && hasChar;
console.log('  RARS ecall syscalls (print_string, int, hex, char, exit):', rarsPass ? 'PASS' : 'FAIL');

console.log('=== Visual Peripheral Status vs MMIO Address Location Contents Verification ===');

// 1. LEDs (0xFFFF0060)
writeMem(0xFFFF0060, 0x5A, 4);
updatePeripherals();
const ledValWord = readMem(0xFFFF0060, 4);
const ledValByte0 = readMem(0xFFFF0060, 1);
const ledDomMatch = [0,1,2,3,4,5,6,7].every(i => {
  const el = document.getElementById('led' + i);
  const shouldBeOn = !!(0x5A & (1 << i));
  return el && el.classList.contains('on') === shouldBeOn;
});
console.log('  LEDs (0xFFFF0060) MMIO word=0x' + ledValWord.toString(16) + ', byte=0x' + ledValByte0.toString(16) + ' vs DOM state:', (ledValWord === 0x5A && ledValByte0 === 0x5A && ledDomMatch) ? 'PASS' : 'FAIL');

// 2. DIP Switches (0xFFFF0064)
dipSwitches = 0xA5C3;
updatePeripherals();
const dipValWord = readMem(0xFFFF0064, 4);
const dipValHalf = readMem(0xFFFF0064, 2);
const dipValByte0 = readMem(0xFFFF0064, 1);
const dipValByte1 = readMem(0xFFFF0065, 1);
const dipDomMatch = Array.from({length: 16}, (_, i) => i).every(i => {
  const el = document.getElementById('dip' + i);
  const shouldBeOn = !!(0xA5C3 & (1 << i));
  return el && el.classList.contains('on') === shouldBeOn;
});
console.log('  DIP Switches (0xFFFF0064) MMIO word=0x' + dipValWord.toString(16) + ', half=0x' + dipValHalf.toString(16) + ', bytes=(0x' + dipValByte0.toString(16) + ',0x' + dipValByte1.toString(16) + ') vs DOM state:', (dipValWord === 0xA5C3 && dipValHalf === 0xA5C3 && dipValByte0 === 0xC3 && dipValByte1 === 0xA5 && dipDomMatch) ? 'PASS' : 'FAIL');

// 3. Push Buttons (0xFFFF0068)
pbState = 0b101; // BTNL=1, BTNC=0, BTNR=1
updatePeripherals();
const pbValWord = readMem(0xFFFF0068, 4);
const pbValByte = readMem(0xFFFF0068, 1);
const pbL = document.getElementById('pbBtnL');
const pbC = document.getElementById('pbBtnC');
const pbR = document.getElementById('pbBtnR');
const pbDomMatch = pbL.classList.contains('pressed') && !pbC.classList.contains('pressed') && pbR.classList.contains('pressed');
console.log('  Push Buttons (0xFFFF0068) MMIO word=' + pbValWord + ' vs DOM state (L=1,C=0,R=1):', (pbValWord === 5 && pbValByte === 5 && pbDomMatch) ? 'PASS' : 'FAIL');

// 4. 7-Segment Display (0xFFFF0080)
writeMem(0xFFFF0080, 0x89ABCDEF, 4);
updatePeripherals();
const sevValWord = readMem(0xFFFF0080, 4);
const sevValByte0 = readMem(0xFFFF0080, 1);
const sevValByte1 = readMem(0xFFFF0081, 1);
const sevValByte2 = readMem(0xFFFF0082, 1);
const sevValByte3 = readMem(0xFFFF0083, 1);
const sevContainer = document.getElementById('sevsegContainer');
const sevDomMatch = (sevsegState === '89ABCDEF' && sevContainer.childNodes.length === 8);
console.log('  7-Segment (0xFFFF0080) MMIO word=0x' + sevValWord.toString(16) + ' vs visual state ' + sevsegState + ' (8 digits):', (sevValWord === 0x89ABCDEF && sevValByte0 === 0xEF && sevValByte1 === 0xCD && sevValByte2 === 0xAB && sevValByte3 === 0x89 && sevDomMatch) ? 'PASS' : 'FAIL');

// 5. UART Serial Console (0xFFFF0000 - 0xFFFF000C)
uartRxQueue = [0x54, 0x45, 0x53, 0x54]; // 'TEST'
uartTxBuffer = '';
updatePeripherals();
const rxValidBefore = readMem(0xFFFF0000, 4);
const txReadyVal = readMem(0xFFFF0008, 4);
const rxPeekByte = readMem(0xFFFF0004, 4, true); // peek
const badgeRxBefore = document.getElementById('badgeRxValid').innerText;
const queueCountBefore = document.getElementById('uartQueueCount').innerText;

// Consume 1 byte via CPU MMIO read
const rxReadByte1 = readMem(0xFFFF0004, 1, false);
// Write 2 bytes to UART_TX (0xFFFF000C)
writeMem(0xFFFF000C, 0x4F, 1); // 'O'
writeMem(0xFFFF000C, 0x4B, 1); // 'K'
updatePeripherals();
const termOutput = document.getElementById('uartTerminal').innerText;
const uartPass = (rxValidBefore === 1 && badgeRxBefore === '1' && queueCountBefore.includes('4') && txReadyVal === 1 && rxPeekByte === 0x54 && rxReadByte1 === 0x54 && uartRxQueue.length === 3 && termOutput === 'OK');
console.log('  UART (0xFFFF0000-0xFFFF000C) RX_VALID/TX_READY/RX Peek/Pop & TX Terminal text ("' + termOutput + '"):', uartPass ? 'PASS' : 'FAIL');

// 6. OLED Display (0xFFFF0020 - 0xFFFF002C)
writeMem(0xFFFF0020, 48, 4); // COL = 48
writeMem(0xFFFF0024, 32, 4); // ROW = 32
writeMem(0xFFFF002C, 0x00, 4); // CTRL = vary_pixel_data 8-bit
writeMem(0xFFFF0028, 0b11100000, 4); // DATA = Red (3R-3G-2B: 7,0,0 -> 255,0,0)
updatePeripherals();
const oledColRead = readMem(0xFFFF0020, 4);
const oledRowRead = readMem(0xFFFF0024, 4);
const oledCtrlRead = readMem(0xFFFF002C, 4);
const oledDataRead = readMem(0xFFFF0028, 4);
const oledColUI = document.getElementById('oledColVal').innerText;
const oledRowUI = document.getElementById('oledRowVal').innerText;
const oledCtrlUI = document.getElementById('oledCtrlVal').innerText;
const oledModeDesc = document.getElementById('oledModeDesc').innerText;
const pixelIndex = (32 * 96 + 48) * 4;
const isPixelRed = (oledBuffer[pixelIndex] === 255 && oledBuffer[pixelIndex+1] === 0 && oledBuffer[pixelIndex+2] === 0);
const oledPass = (oledColRead === 48 && oledColUI === '48' && oledRowRead === 32 && oledRowUI === '32' && oledCtrlRead === 0 && oledCtrlUI === '0x00' && oledModeDesc.includes('vary_pixel_data_mode') && isPixelRed);
console.log('  OLED Display (0xFFFF0020-0xFFFF002C) Registers, UI labels & FrameBuffer pixel at (48,32):', oledPass ? 'PASS' : 'FAIL');

// 7. 3-Axis Accelerometer & Temperature Sensor (0xFFFF0040 - 0xFFFF0044)
accelX = 64;   // +1.00g (0x40)
accelY = -32;  // -0.50g (0xE0)
accelZ = 0;    // +0.00g (0x00)
accelTemp = 28; // 28°C (0x1C)
accelDready = true;
updatePeripherals();
const vm_accelPacked = readMem(0xFFFF0040, 4);
const vm_accelZByte = readMem(0xFFFF0040, 1);
const vm_accelYByte = readMem(0xFFFF0041, 1);
const vm_accelXByte = readMem(0xFFFF0042, 1);
const vm_accelTempByte = readMem(0xFFFF0043, 1);
const vm_accelDreadyRead = readMem(0xFFFF0044, 4);
const vm_badgeDready = document.getElementById('badgeAccelDready').innerText;
const vm_accelXUI = document.getElementById('accelXVal').innerText;
const vm_accelYUI = document.getElementById('accelYVal').innerText;
const vm_accelZUI = document.getElementById('accelZVal').innerText;
const vm_accelTempUI = document.getElementById('accelTempVal').innerText;
const vm_expectedPacked = (((28 & 0xFF) << 24) | ((64 & 0xFF) << 16) | ((-32 & 0xFF) << 8) | (0 & 0xFF)) >>> 0;
const vm_accelPass = (vm_accelPacked === vm_expectedPacked && vm_accelZByte === 0 && vm_accelYByte === (256 - 32) && vm_accelXByte === 64 && vm_accelTempByte === 28 && vm_accelDreadyRead === 1 && vm_badgeDready === '1' && vm_accelXUI.includes('+1.00g') && vm_accelYUI.includes('-0.50g') && vm_accelZUI.includes('+0.00g') && vm_accelTempUI.includes('28°C'));
console.log('  Accelerometer & Temp (0xFFFF0040-0xFFFF0044) Packed 32-bit {temp,X,Y,Z} (0x' + vm_accelPacked.toString(16) + ') & UI values:', vm_accelPass ? 'PASS' : 'FAIL');

// 8. Cycle Counter (0xFFFF00A0)
totalCycles = 987654;
updatePeripherals();
const vm_cycleRead = readMem(0xFFFF00A0, 4);
const vm_cycleUI = document.getElementById('badgeCycleCount').innerText;
const vm_cyclePass = (vm_cycleRead === 987654 && vm_cycleUI === '987654');
console.log('  Cycle Counter (0xFFFF00A0) MMIO word=' + vm_cycleRead + ' vs UI Badge=' + vm_cycleUI + ':', vm_cyclePass ? 'PASS' : 'FAIL');

// 9. Memory View Table HTML Rendering for MMIO Window
document.getElementById('memAddr').value = '0xFFFF0000';
document.getElementById('memRows').value = '24';
updateMemoryView();
const vm_memHtml = document.getElementById('memView').innerHTML;
const vm_memViewHasUart = vm_memHtml.includes('UART RX VALID RO 0xFFFF0000') && vm_memHtml.includes('UART RX RO 0xFFFF0004');
const vm_memViewHasOled = vm_memHtml.includes('OLED COL WO 0xFFFF0020') && vm_memHtml.includes('OLED ROW WO 0xFFFF0024');
const vm_memViewHasAccel = vm_memHtml.includes('ACCEL DATA RO 0xFFFF0040') && vm_memHtml.includes('ACCEL DREADY RO 0xFFFF0044');
const vm_memViewHasLeds = vm_memHtml.includes('LED WO 0xFFFF0060') && vm_memHtml.includes('DIP RO 0xFFFF0064');
const vm_memViewHasPB = vm_memHtml.includes('PB RO 0xFFFF0068');
const vm_memViewHas7Seg = vm_memHtml.includes('7SEG WO 0xFFFF0080');
const vm_memViewHasCycles = vm_memHtml.includes('CYCLECOUNT RO 0xFFFF00A0');
const vm_memViewPass = vm_memViewHasUart && vm_memViewHasOled && vm_memViewHasAccel && vm_memViewHasLeds && vm_memViewHasPB && vm_memViewHas7Seg && vm_memViewHasCycles;
console.log('  Memory View Window (0xFFFF0000) Annotation Descriptors & Table rendering:', vm_memViewPass ? 'PASS' : 'FAIL');

console.log('=== UI Button Inactive / Active Lifecycle & UX Verification ===');

// 1. Pristine / Unassembled State (e.g. fresh example loaded)
lastAssembledCode = null;
assembled = false;
resetAll();
editorHistory.initialState();
updateToolbarButtonStates();

const b_assemble = document.getElementById('btnAssemble');
const b_undo = document.getElementById('btnUndo');
const b_redo = document.getElementById('btnRedo');
const b_run = document.getElementById('runPauseBtn');
const b_step = document.getElementById('btnStep');
const b_back = document.getElementById('btnBack');
const b_reset = document.getElementById('btnReset');
const b_dumptxt = document.getElementById('btnDumpTxt');
const b_dumpdata = document.getElementById('btnDumpData');

const s1_pass = (b_assemble.disabled === false && b_undo.disabled === true && b_redo.disabled === true && b_run.disabled === true && b_step.disabled === true && b_back.disabled === true && b_reset.disabled === true && b_dumptxt.disabled === true && b_dumpdata.disabled === true);
console.log('  Unassembled / Fresh state (Assemble enabled; Run, Step, Back, Reset, Dumps disabled):', s1_pass ? 'PASS' : `FAIL (assemble=${b_assemble.disabled}, undo=${b_undo.disabled}, redo=${b_redo.disabled}, run=${b_run.disabled}, step=${b_step.disabled}, back=${b_back.disabled}, reset=${b_reset.disabled})`);

// 2. Undo / Redo Lifecycle
editor.value = 'main:\n  li x1, 10\n';
editorHistory.pushState();
updateToolbarButtonStates();
const undoCan_pass = (b_undo.disabled === false && b_redo.disabled === true);
editorHistory.undo();
const undoDone_pass = (b_undo.disabled === true && b_redo.disabled === false);
editorHistory.redo();
const redoDone_pass = (b_undo.disabled === false && b_redo.disabled === true);
console.log('  Undo / Redo dynamic enable/disable lifecycle:', (undoCan_pass && undoDone_pass && redoDone_pass) ? 'PASS' : 'FAIL');

// 3. Assemble Only -> Assemble becomes DISABLED (already assembled); Run & Step become enabled; Back & Reset remain disabled; Dumps become enabled
editor.value = 'main:\n  addi x1, zero, 10\n  addi x2, zero, 20\n  add x3, x1, x2\n';
assembleOnly();
const s2_pass = (b_assemble.disabled === true && b_run.disabled === false && b_step.disabled === false && b_back.disabled === true && b_reset.disabled === true && b_dumptxt.disabled === false && b_dumpdata.disabled === false);
console.log('  Assembled state (Assemble disabled; Run/Step/Dumps enabled; Back/Reset disabled):', s2_pass ? 'PASS' : `FAIL (assemble=${b_assemble.disabled}, run=${b_run.disabled}, step=${b_step.disabled}, back=${b_back.disabled}, reset=${b_reset.disabled})`);

// 4. Step 1 Instruction -> Back & Reset become enabled; Run becomes 'Resume'; Assemble remains disabled
stepOnce();
const s3_pass = (b_assemble.disabled === true && b_back.disabled === false && b_reset.disabled === false && b_run.disabled === false && b_run.innerText.includes('Resume'));
console.log('  After Step 1 (Back enabled, Reset enabled, Run morphs to Resume, Assemble disabled):', s3_pass ? 'PASS' : `FAIL (assemble=${b_assemble.disabled}, back=${b_back.disabled}, reset=${b_reset.disabled}, runText=${b_run.innerText})`);

// 5. Step Back -> History emptied, Back becomes disabled again
stepBack();
const s4_pass = (b_back.disabled === true && execHistory.length === 0);
console.log('  After Step Back to origin (Back disabled again):', s4_pass ? 'PASS' : `FAIL (back=${b_back.disabled}, histLen=${execHistory.length})`);

// 6. Reset All -> Preserves assembled state! Assembling is NOT required. Run & Step remain enabled, Reset disabled, Assemble disabled
stepOnce();
resetAll();
const s5_pass = (b_reset.disabled === true && b_assemble.disabled === true && b_run.disabled === false && b_step.disabled === false);
console.log('  After Reset (Assembling NOT required; Run/Step enabled; Reset/Assemble disabled):', s5_pass ? 'PASS' : `FAIL (assemble=${b_assemble.disabled}, reset=${b_reset.disabled}, run=${b_run.disabled}, step=${b_step.disabled})`);

// 7. Modifying code -> Assembling required again! (Assemble enabled; Run/Step disabled)
editor.value += '  addi x4, zero, 40\n';
updateEditor();
const s6_pass = (b_assemble.disabled === false && b_run.disabled === true && b_step.disabled === true);
console.log('  After Code Modified (Assemble enabled; Run/Step disabled until assembled):', s6_pass ? 'PASS' : `FAIL (assemble=${b_assemble.disabled}, run=${b_run.disabled}, step=${b_step.disabled})`);

// 8. Line Numbers & Highlight Layer Bottom Spacer Alignment Verification
loadExample('circle_accel');
const lineNumHtml = document.getElementById('lineNumbers').innerHTML;
const hlLayerHtml = document.getElementById('highlightLayer').innerHTML;
const hasLineNumSpacer = lineNumHtml.includes('height:120px');
const hasHlLayerSpacer = hlLayerHtml.includes('height:120px');

// Test scrolling sync
editor.scrollTop = 1450;
editor.scrollLeft = 40;
syncScroll();
const scrollSyncPass = (highlightLayer.scrollTop === 1450 && highlightLayer.scrollLeft === 40 && lineNumbers.scrollTop === 1450);
const bottomAlignmentPass = hasLineNumSpacer && hasHlLayerSpacer && scrollSyncPass;
console.log('  Line Numbers & Highlight Layer Bottom Spacer & Scroll Alignment:', bottomAlignmentPass ? 'PASS' : `FAIL (lineSpacer=${hasLineNumSpacer}, hlSpacer=${hasHlLayerSpacer}, sync=${scrollSyncPass})`);

// 9. In-Editor Autocomplete & RARS-Style Live Guidance Verification
console.log('=== In-Editor Autocomplete & Live Guidance (RARS-Style IntelliSense) Verification ===');

// Dynamic label and equate extraction
const testSource = `.equ LED_BASE, 0xFFFF0060
BUFFER_SIZE = 256

.text
main:
  li a0, 10
loop_target:
  addi a0, a0, -1
  bnez a0, loop_target
  ret
`;
const symbols = extractEditorSymbols(testSource);
const hasLedEqu = symbols.some(s => s.name === 'LED_BASE' && s.type === 'equ');
const hasBufEqu = symbols.some(s => s.name === 'BUFFER_SIZE' && s.type === 'equ');
const hasMainLbl = symbols.some(s => s.name === 'main' && s.type === 'label');
const hasLoopLbl = symbols.some(s => s.name === 'loop_target' && s.type === 'label');
const symbolExtractionPass = hasLedEqu && hasBufEqu && hasMainLbl && hasLoopLbl;
console.log('  Dynamic Symbol Extraction (Labels & Equates):', symbolExtractionPass ? 'PASS' : `FAIL (LED_BASE=${hasLedEqu}, BUFFER_SIZE=${hasBufEqu}, main=${hasMainLbl}, loop_target=${hasLoopLbl})`);

// Instruction & pseudo-instruction typing trigger
editor.value = testSource + '  ad';
editor.selectionStart = editor.selectionEnd = editor.value.length;
updateAutocomplete();
const hasAdd = acMatches.some(m => m.name === 'add');
const hasAddi = acMatches.some(m => m.name === 'addi');
const hasAddDoc = acMatches.find(m => m.name === 'addi')?.format.includes('addi rd, rs1, imm');
const acInstPass = acActive && hasAdd && hasAddi && hasAddDoc;
console.log('  Instruction Mnemonic Autocomplete & Format Guidance (typing "ad"):', acInstPass ? 'PASS' : `FAIL (active=${acActive}, hasAdd=${hasAdd}, hasAddi=${hasAddi}, hasDoc=${hasAddDoc})`);

// Directive autocomplete trigger
editor.value = testSource + '  .w';
editor.selectionStart = editor.selectionEnd = editor.value.length;
updateAutocomplete();
const hasWordDir = acMatches.some(m => m.name === '.word' && m.type === 'directive');
console.log('  Directive Autocomplete (typing ".w"):', (acActive && hasWordDir) ? 'PASS' : 'FAIL');

// Context-Aware Operand & Register Filtering (typing "sw x" -> registers x0..x31, NOT xor!)
editor.value = testSource + '  sw x';
editor.selectionStart = editor.selectionEnd = editor.value.length;
updateAutocomplete();
const hasX1Reg = acMatches.some(m => m.name === 'x1' && m.type === 'register');
const hasNoXor = !acMatches.some(m => m.name === 'xor' || m.name === 'xori');
const isInstLockedToSw = (acActiveInstDoc && acActiveInstDoc.name === 'sw' && acActiveInstDoc.format.includes('sw rs2, offset(rs1)'));
const swOperandPass = acActive && hasX1Reg && hasNoXor && isInstLockedToSw;
console.log('  Context-Aware Register Autocomplete & Instruction Lock (typing "sw x" -> x0..x31, excludes "xor"):', swOperandPass ? 'PASS' : `FAIL (hasX1=${hasX1Reg}, hasNoXor=${hasNoXor}, isSwLocked=${!!isInstLockedToSw})`);

// Context-Aware Mnemonic position (typing "xo" at line start -> "xor", "xori")
editor.value = testSource + '  xo';
editor.selectionStart = editor.selectionEnd = editor.value.length;
updateAutocomplete();
const hasXorMnemonic = acMatches.some(m => m.name === 'xor' && m.type === 'inst');
const hasNoRegistersAtStart = !acMatches.some(m => m.type === 'register');
const mnemonicPass = acActive && hasXorMnemonic && hasNoRegistersAtStart;
console.log('  Mnemonic Context at Line Start (typing "xo" -> "xor", excludes registers):', mnemonicPass ? 'PASS' : 'FAIL');

// User label autocomplete trigger
editor.value = testSource + '  j loop_';
editor.selectionStart = editor.selectionEnd = editor.value.length;
updateAutocomplete();
const hasLoopMatch = acMatches.some(m => m.name === 'loop_target' && m.type === 'label');
console.log('  User Label Autocomplete (typing "loop_"):', (acActive && hasLoopMatch) ? 'PASS' : 'FAIL');

// Select item insertion test
selectAutocomplete(0);
const insertionPass = editor.value.endsWith('loop_target');
console.log('  Autocomplete Item Selection & Replacement Insertion:', insertionPass ? 'PASS' : 'FAIL');

// Keyboard navigation & dismissal
editor.value = testSource + '  ad';
editor.selectionStart = editor.selectionEnd = editor.value.length;
updateAutocomplete();
const initialSel = acSelectedIndex;
handleAutocompleteKeydown({ key: 'ArrowDown', preventDefault(){} });
const nextSel = acSelectedIndex;
handleAutocompleteKeydown({ key: 'Escape', preventDefault(){} });
const dismissPass = (!acActive && initialSel === 0 && nextSel === 1);
console.log('  Keyboard Navigation (ArrowDown) & Dismissal (Escape):', dismissPass ? 'PASS' : 'FAIL');

// Comment and string guard test (no autocomplete popup inside comments)
editor.value = testSource + '  # addi x1, ';
editor.selectionStart = editor.selectionEnd = editor.value.length;
updateAutocomplete();
const commentGuardPass = (!acActive && acMatches.length === 0);
console.log('  Comment Guard (no popup inside # comments):', commentGuardPass ? 'PASS' : 'FAIL');

// 10. Load & Store Pseudo-Instructions Assembler & Execution Verification (sw, lw, sb, sh, lla, lga, FP pseudos)
console.log('=== Load & Store Pseudo-Instructions (sw, lw, sb, sh, lla, lga) Verification ===');

// Check editor documentation shows both native and pseudo formats for lw and sw
const lwDoc = RISCV_AUTOCOMPLETE_DOCS.find(d => d.name === 'lw');
const swDoc = RISCV_AUTOCOMPLETE_DOCS.find(d => d.name === 'sw');
const lwDocPass = lwDoc && lwDoc.format.includes('lw rd, symbol') && lwDoc.format.includes('offset(rs1)');
const swDocPass = swDoc && swDoc.format.includes('sw rs2, symbol') && swDoc.format.includes('offset(rs1)');
console.log('  Editor Guidance Format for lw (native + pseudo):', lwDocPass ? 'PASS' : 'FAIL');
console.log('  Editor Guidance Format for sw (native + pseudo):', swDocPass ? 'PASS' : 'FAIL');

// Test sw rs2, symbol (2-operand store pseudo) and sw rs2, symbol, rt (3-operand store pseudo)
const storePseudoProg = `.data
  .word 0
my_store_var: .word 0
my_store_byte: .byte 0
my_store_half: .half 0

.text
main:
  li x10, 0x12345678
  sw x10, my_store_var       # 2-operand sw pseudo (auto temp reg)
  
  li x11, 0xDEADBEEF
  sw x11, my_store_var, x7   # 3-operand sw pseudo (explicit temp reg x7 / t2)
  
  li x12, 0x5A
  sb x12, my_store_byte      # 2-operand sb pseudo
  
  li x13, 0x7654
  sh x13, my_store_half      # 2-operand sh pseudo
  
  lw x14, my_store_var, x28  # 3-operand lw pseudo (explicit temp reg x28)
  lla x15, my_store_var      # lla pseudo
  
  ret
`;

// Assemble and execute
resetAll();
const storeProg = assemble(storePseudoProg);
loadProgram(storeProg);
pc = 0x10000;
for (let s = 0; s < 30; s++) {
  if (pc < 0x10000 || pc >= 0x10000 + storeProg.length * 4) break;
  pc = decodeAndExecute(fetchInstruction(pc), pc);
}

// Verify memory and registers
const varAddr = labels['my_store_var'];
const byteAddr = labels['my_store_byte'];
const halfAddr = labels['my_store_half'];

const readWordVal = (readMem(varAddr, 4) >>> 0);
const readByteVal = readMem(byteAddr, 1);
const readHalfVal = readMem(halfAddr, 2);
const x14Val = (regs[14] >>> 0);
const x15Val = regs[15];

const swExecPass = (readWordVal === 0xDEADBEEF);
const sbExecPass = (readByteVal === 0x5A);
const shExecPass = (readHalfVal === 0x7654);
const lw3ArgPass = (x14Val === 0xDEADBEEF);
const llaPass = (x15Val === varAddr);

console.log('  sw rs2, symbol (2-arg & 3-arg store pseudo execution):', swExecPass ? 'PASS' : `FAIL (val=0x${(readWordVal>>>0).toString(16)})`);
console.log('  sb & sh pseudo-instructions execution:', (sbExecPass && shExecPass) ? 'PASS' : `FAIL (byte=0x${readByteVal.toString(16)}, half=0x${readHalfVal.toString(16)})`);
console.log('  lw rd, symbol, rt (3-arg load pseudo execution):', lw3ArgPass ? 'PASS' : `FAIL (x14=0x${(x14Val>>>0).toString(16)})`);
console.log('  lla rd, symbol (Load Local Address pseudo):', llaPass ? 'PASS' : `FAIL (x15=0x${(x15Val>>>0).toString(16)})`);

console.log('=== Comprehensive Instruction Set Verification (RV32I, RV32M, RV32F, RV32D, RV32A, Pseudo) ===');
require('./test_all_instructions.js');

console.log('DONE');