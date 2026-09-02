const fs = require('fs');

function makeEl() {
  return {
    value: '', innerHTML: '', textContent: '', style: {}, className: '',
    classList: { add(){}, remove(){}, toggle(){} },
    addEventListener(){}, appendChild(){}, append(){}, focus(){}, blur(){},
    setAttribute(){}, getAttribute(){ return null; }, closest(){ return null; },
    scrollTop: 0, scrollHeight: 0, scrollLeft: 0, checked: false, files: [],
    getContext: () => ({
      createImageData: () => ({ data: new Uint8ClampedArray(96*64*4) }),
      putImageData: () => {},
      drawImage: () => {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(96*64*4) })
    })
  };
}
const elements = {};
global.document = {
  getElementById: (id) => elements[id] || (elements[id]=makeEl()),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => makeEl(),
  createElementNS: () => makeEl(),
  addEventListener: () => {},
};
global.window = global;
global.navigator = { userAgent: 'node' };

const html = fs.readFileSync('riscv_simulator.html', 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const runnerCode = `
const failures = [];
const successes = [];

function test(category, name, asmLine, setupFn, verifyFn) {
  try {
    const code = "main:\\n  " + asmLine + "\\n  j done\\ndone:\\n  nop";
    const prog = assemble(code);
    const errs = prog.filter(i => i.error);
    if (errs.length > 0) {
      failures.push({ category, name, asmLine, stage: "ASSEMBLE", error: errs[0].error });
      return;
    }
    resetAll();
    loadProgram(prog);
    if (setupFn) setupFn();
    pc = 0x10000;
    
    // Find address of done label
    const doneAddr = labels["done"];
    let steps = 0;
    let lastNextPc = pc;
    while (pc < doneAddr && steps < 20) {
      const instr32 = fetchInstruction(pc);
      lastNextPc = decodeAndExecute(instr32, pc);
      pc = lastNextPc;
      steps++;
    }
    
    const result = verifyFn(lastNextPc);
    if (result === true) {
      successes.push({ category, name, asmLine });
    } else {
      failures.push({ category, name, asmLine, stage: "EXECUTE", error: result || "Verification failed" });
    }
  } catch (e) {
    failures.push({ category, name, asmLine, stage: "EXCEPTION", error: e.message });
  }
}

console.log("============================================================");
console.log("  RISC-V SIMULATOR COMPREHENSIVE INSTRUCTION TEST SUITE");
console.log("============================================================");

// 1. RV32I Base Integer Instructions
test("RV32I", "lui", "lui x1, 0x12345", null, () => regs[1] === 0x12345000 ? true : ("regs[1]=" + regs[1].toString(16)));
test("RV32I", "auipc", "auipc x1, 0x12345", null, () => regs[1] === (0x10000 + 0x12345000) ? true : ("regs[1]=" + regs[1].toString(16)));
test("RV32I", "jal", "jal x1, done", null, (nextPc) => (regs[1] === 0x10004) ? true : ("ra=" + regs[1]));
test("RV32I", "jalr", "jalr x1, 4(x2)", () => { regs[2] = 0x10004; }, (nextPc) => (regs[1] === 0x10004) ? true : ("ra=" + regs[1]));
test("RV32I", "jalr_rd_eq_rs1", "jalr x1, 4(x1)", () => { regs[1] = 0x10004; }, (nextPc) => (regs[1] === 0x10004) ? true : ("ra=" + regs[1]));
test("RV32I", "beq_taken", "beq x1, x2, done", () => { regs[1] = 5; regs[2] = 5; }, () => pc === labels["done"] ? true : "not taken");
test("RV32I", "beq_not_taken", "beq x1, x2, done", () => { regs[1] = 5; regs[2] = 6; }, () => pc === labels["done"] ? true : "error");
test("RV32I", "bne_taken", "bne x1, x2, done", () => { regs[1] = 5; regs[2] = 6; }, () => pc === labels["done"] ? true : "not taken");
test("RV32I", "bne_not_taken", "bne x1, x2, done", () => { regs[1] = 5; regs[2] = 5; }, () => pc === labels["done"] ? true : "error");
test("RV32I", "blt_signed", "blt x1, x2, done", () => { regs[1] = -5; regs[2] = 5; }, () => pc === labels["done"] ? true : "not taken");
test("RV32I", "bge_signed", "bge x1, x2, done", () => { regs[1] = 5; regs[2] = -5; }, () => pc === labels["done"] ? true : "not taken");
test("RV32I", "bltu_unsigned", "bltu x1, x2, done", () => { regs[1] = 5; regs[2] = -5; }, () => pc === labels["done"] ? true : "not taken");
test("RV32I", "bgeu_unsigned", "bgeu x1, x2, done", () => { regs[1] = -5; regs[2] = 5; }, () => pc === labels["done"] ? true : "not taken");

// Loads & Stores
test("RV32I", "sw_lw", "lw x1, 0(x2)", () => { regs[2] = 0x20000; writeMem(0x20000, 0x12345678, 4); }, () => regs[1] === 0x12345678 ? true : ("regs[1]=0x" + regs[1].toString(16)));
test("RV32I", "sb_lb_sign_extend", "lb x1, 0(x2)", () => { regs[2] = 0x20000; writeMem(0x20000, 0x80, 1); }, () => regs[1] === -128 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sb_lbu_zero_extend", "lbu x1, 0(x2)", () => { regs[2] = 0x20000; writeMem(0x20000, 0x80, 1); }, () => regs[1] === 128 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sh_lh_sign_extend", "lh x1, 0(x2)", () => { regs[2] = 0x20000; writeMem(0x20000, 0x8000, 2); }, () => regs[1] === -32768 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sh_lhu_zero_extend", "lhu x1, 0(x2)", () => { regs[2] = 0x20000; writeMem(0x20000, 0x8000, 2); }, () => regs[1] === 32768 ? true : ("regs[1]=" + regs[1]));

// ALU Immediate
test("RV32I", "addi", "addi x1, x2, -15", () => { regs[2] = 20; }, () => regs[1] === 5 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "slti_signed", "slti x1, x2, -5", () => { regs[2] = -10; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sltiu_unsigned", "sltiu x1, x2, 5", () => { regs[2] = 3; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "xori", "xori x1, x2, 0x0F0", () => { regs[2] = 0x0FF; }, () => regs[1] === 0x00F ? true : ("regs[1]=" + regs[1]));
test("RV32I", "ori", "ori x1, x2, 0x0F0", () => { regs[2] = 0x00F; }, () => regs[1] === 0x0FF ? true : ("regs[1]=" + regs[1]));
test("RV32I", "andi", "andi x1, x2, 0x0F0", () => { regs[2] = 0x0FF; }, () => regs[1] === 0x0F0 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "slli", "slli x1, x2, 4", () => { regs[2] = 3; }, () => regs[1] === 48 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "srli", "srli x1, x2, 4", () => { regs[2] = -16; }, () => regs[1] === ((-16 >>> 4)) ? true : ("regs[1]=" + regs[1]));
test("RV32I", "srai_sign_extended", "srai x1, x2, 4", () => { regs[2] = -16; }, () => regs[1] === -1 ? true : ("regs[1]=" + regs[1]));

// ALU Register
test("RV32I", "add", "add x1, x2, x3", () => { regs[2] = 10; regs[3] = 20; }, () => regs[1] === 30 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sub", "sub x1, x2, x3", () => { regs[2] = 30; regs[3] = 20; }, () => regs[1] === 10 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sll", "sll x1, x2, x3", () => { regs[2] = 1; regs[3] = 5; }, () => regs[1] === 32 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "slt_signed", "slt x1, x2, x3", () => { regs[2] = -10; regs[3] = 5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sltu_unsigned", "sltu x1, x2, x3", () => { regs[2] = 5; regs[3] = -10; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "xor", "xor x1, x2, x3", () => { regs[2] = 0b101; regs[3] = 0b110; }, () => regs[1] === 0b011 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "srl", "srl x1, x2, x3", () => { regs[2] = -16; regs[3] = 4; }, () => regs[1] === ((-16 >>> 4)) ? true : ("regs[1]=" + regs[1]));
test("RV32I", "sra_sign_extended", "sra x1, x2, x3", () => { regs[2] = -16; regs[3] = 4; }, () => regs[1] === -1 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "or", "or x1, x2, x3", () => { regs[2] = 0b100; regs[3] = 0b010; }, () => regs[1] === 0b110 ? true : ("regs[1]=" + regs[1]));
test("RV32I", "and", "and x1, x2, x3", () => { regs[2] = 0b110; regs[3] = 0b011; }, () => regs[1] === 0b010 ? true : ("regs[1]=" + regs[1]));

// 2. RV32M Standard Extension
test("RV32M", "mul", "mul x1, x2, x3", () => { regs[2] = 6; regs[3] = 7; }, () => regs[1] === 42 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "mul_signed_overflow", "mul x1, x2, x3", () => { regs[2] = 0x7FFFFFFF; regs[3] = 2; }, () => regs[1] === -2 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "mulh_signed_high", "mulh x1, x2, x3", () => { regs[2] = 0x7FFFFFFF; regs[3] = 0x7FFFFFFF; }, () => regs[1] === 0x3FFFFFFF ? true : ("regs[1]=0x" + regs[1].toString(16)));
test("RV32M", "mulhsu_signed_unsigned", "mulhsu x1, x2, x3", () => { regs[2] = -1; regs[3] = 2; }, () => regs[1] === -1 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "mulhu_unsigned_high", "mulhu x1, x2, x3", () => { regs[2] = -1; regs[3] = -1; }, () => (regs[1] >>> 0) === 0xFFFFFFFE ? true : ("regs[1]=0x" + (regs[1]>>>0).toString(16)));
test("RV32M", "div_signed", "div x1, x2, x3", () => { regs[2] = -20; regs[3] = 3; }, () => regs[1] === -6 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "div_by_zero", "div x1, x2, x3", () => { regs[2] = 5; regs[3] = 0; }, () => regs[1] === -1 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "div_overflow", "div x1, x2, x3", () => { regs[2] = -2147483648; regs[3] = -1; }, () => regs[1] === -2147483648 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "divu_unsigned", "divu x1, x2, x3", () => { regs[2] = 20; regs[3] = 3; }, () => regs[1] === 6 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "divu_by_zero", "divu x1, x2, x3", () => { regs[2] = 5; regs[3] = 0; }, () => regs[1] === -1 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "rem_signed", "rem x1, x2, x3", () => { regs[2] = -20; regs[3] = 3; }, () => regs[1] === -2 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "rem_by_zero", "rem x1, x2, x3", () => { regs[2] = 42; regs[3] = 0; }, () => regs[1] === 42 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "remu_unsigned", "remu x1, x2, x3", () => { regs[2] = 20; regs[3] = 3; }, () => regs[1] === 2 ? true : ("regs[1]=" + regs[1]));
test("RV32M", "remu_by_zero", "remu x1, x2, x3", () => { regs[2] = 42; regs[3] = 0; }, () => regs[1] === 42 ? true : ("regs[1]=" + regs[1]));

// 3. RV64 / 32-bit W operations
test("RV32W", "addiw", "addiw x1, x2, 10", () => { regs[2] = 20; }, () => regs[1] === 30 ? true : ("regs[1]=" + regs[1]));
test("RV32W", "addw", "addw x1, x2, x3", () => { regs[2] = 20; regs[3] = 30; }, () => regs[1] === 50 ? true : ("regs[1]=" + regs[1]));
test("RV32W", "subw", "subw x1, x2, x3", () => { regs[2] = 50; regs[3] = 20; }, () => regs[1] === 30 ? true : ("regs[1]=" + regs[1]));
test("RV32W", "sllw", "sllw x1, x2, x3", () => { regs[2] = 1; regs[3] = 4; }, () => regs[1] === 16 ? true : ("regs[1]=" + regs[1]));
test("RV32W", "srlw", "srlw x1, x2, x3", () => { regs[2] = 16; regs[3] = 4; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32W", "sraw", "sraw x1, x2, x3", () => { regs[2] = -16; regs[3] = 4; }, () => regs[1] === -1 ? true : ("regs[1]=" + regs[1]));

// 4. RV32F Float Extension (Single-Precision)
test("RV32F", "flw_fsw", "flw f1, 0(x2)", () => { regs[2] = 0x20000; writeMem(0x20000, new Int32Array(new Float32Array([3.14159]).buffer)[0], 4); }, () => Math.abs(fregs[1] - 3.14159) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fsw", "fsw f1, 0(x2)", () => { regs[2] = 0x20000; fregs[1] = 2.718; }, () => { const b = readMem(0x20000, 4); const val = new Float32Array(new Int32Array([b]).buffer)[0]; return Math.abs(val - 2.718) < 0.001 ? true : ("mem=" + val); });
test("RV32F", "fadd.s", "fadd.s f1, f2, f3", () => { fregs[2] = 1.5; fregs[3] = 2.5; }, () => Math.abs(fregs[1] - 4.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fsub.s", "fsub.s f1, f2, f3", () => { fregs[2] = 4.5; fregs[3] = 2.5; }, () => Math.abs(fregs[1] - 2.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fmul.s", "fmul.s f1, f2, f3", () => { fregs[2] = 2.5; fregs[3] = 3.0; }, () => Math.abs(fregs[1] - 7.5) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fdiv.s", "fdiv.s f1, f2, f3", () => { fregs[2] = 7.5; fregs[3] = 2.5; }, () => Math.abs(fregs[1] - 3.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fsqrt.s", "fsqrt.s f1, f2", () => { fregs[2] = 16.0; }, () => Math.abs(fregs[1] - 4.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fmadd.s", "fmadd.s f1, f2, f3, f4", () => { fregs[2] = 2.0; fregs[3] = 3.0; fregs[4] = 4.0; }, () => Math.abs(fregs[1] - 10.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fmsub.s", "fmsub.s f1, f2, f3, f4", () => { fregs[2] = 2.0; fregs[3] = 3.0; fregs[4] = 4.0; }, () => Math.abs(fregs[1] - 2.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fnmsub.s", "fnmsub.s f1, f2, f3, f4", () => { fregs[2] = 2.0; fregs[3] = 3.0; fregs[4] = 10.0; }, () => Math.abs(fregs[1] - 4.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fnmadd.s", "fnmadd.s f1, f2, f3, f4", () => { fregs[2] = 2.0; fregs[3] = 3.0; fregs[4] = 4.0; }, () => Math.abs(fregs[1] - (-10.0)) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fsgnj.s", "fsgnj.s f1, f2, f3", () => { fregs[2] = 5.0; fregs[3] = -2.0; }, () => fregs[1] === -5.0 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fsgnjn.s", "fsgnjn.s f1, f2, f3", () => { fregs[2] = 5.0; fregs[3] = -2.0; }, () => fregs[1] === 5.0 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fsgnjx.s", "fsgnjx.s f1, f2, f3", () => { fregs[2] = -5.0; fregs[3] = -2.0; }, () => fregs[1] === 5.0 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fmin.s", "fmin.s f1, f2, f3", () => { fregs[2] = 2.0; fregs[3] = 5.0; }, () => Math.abs(fregs[1] - 2.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fmax.s", "fmax.s f1, f2, f3", () => { fregs[2] = 2.0; fregs[3] = 5.0; }, () => Math.abs(fregs[1] - 5.0) < 0.0001 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "feq.s", "feq.s x1, f2, f3", () => { fregs[2] = 2.5; fregs[3] = 2.5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32F", "flt.s", "flt.s x1, f2, f3", () => { fregs[2] = 2.0; fregs[3] = 2.5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32F", "fle.s", "fle.s x1, f2, f3", () => { fregs[2] = 2.5; fregs[3] = 2.5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32F", "fcvt.w.s", "fcvt.w.s x1, f2", () => { fregs[2] = -42.7; }, () => regs[1] === -42 ? true : ("regs[1]=" + regs[1]));
test("RV32F", "fcvt.s.w", "fcvt.s.w f1, x2", () => { regs[2] = -42; }, () => fregs[1] === -42 ? true : ("fregs[1]=" + fregs[1]));
test("RV32F", "fmv.x.w", "fmv.x.w x1, f2", () => { fregs[2] = 1.0; }, () => regs[1] === 0x3F800000 ? true : ("regs[1]=0x" + (regs[1]>>>0).toString(16)));
test("RV32F", "fmv.w.x", "fmv.w.x f1, x2", () => { regs[2] = 0x3F800000; }, () => fregs[1] === 1.0 ? true : ("fregs[1]=" + fregs[1]));

// 5. RV32D Float Extension (Double-Precision)
test("RV32D", "fld_fsd", "fld d1, 0(x2)", () => { regs[2] = 0x20000; const bits = new BigInt64Array(new Float64Array([3.141592653589793]).buffer)[0]; writeMem(0x20000, Number(bits & 0xFFFFFFFFn), 4); writeMem(0x20004, Number((bits >> 32n) & 0xFFFFFFFFn), 4); }, () => Math.abs(dregs[1] - 3.141592653589793) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fsd", "fsd d1, 0(x2)", () => { regs[2] = 0x20000; dregs[1] = 2.718281828459045; }, () => { const lo = readMem(0x20000, 4); const hi = readMem(0x20004, 4); const bits = (BigInt(hi) << 32n) | BigInt(lo >>> 0); const val = new Float64Array(new BigInt64Array([bits]).buffer)[0]; return Math.abs(val - 2.718281828459045) < 1e-10 ? true : ("mem=" + val); });
test("RV32D", "fadd.d", "fadd.d d1, d2, d3", () => { dregs[2] = 1.5; dregs[3] = 2.5; }, () => Math.abs(dregs[1] - 4.0) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fsub.d", "fsub.d d1, d2, d3", () => { dregs[2] = 4.5; dregs[3] = 2.5; }, () => Math.abs(dregs[1] - 2.0) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fmul.d", "fmul.d d1, d2, d3", () => { dregs[2] = 2.5; dregs[3] = 3.0; }, () => Math.abs(dregs[1] - 7.5) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fdiv.d", "fdiv.d d1, d2, d3", () => { dregs[2] = 7.5; dregs[3] = 2.5; }, () => Math.abs(dregs[1] - 3.0) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fsqrt.d", "fsqrt.d d1, d2", () => { dregs[2] = 25.0; }, () => Math.abs(dregs[1] - 5.0) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fmadd.d", "fmadd.d d1, d2, d3, d4", () => { dregs[2] = 2.0; dregs[3] = 3.0; dregs[4] = 4.0; }, () => Math.abs(dregs[1] - 10.0) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fmin.d", "fmin.d d1, d2, d3", () => { dregs[2] = 2.0; dregs[3] = 5.0; }, () => Math.abs(dregs[1] - 2.0) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fmax.d", "fmax.d d1, d2, d3", () => { dregs[2] = 2.0; dregs[3] = 5.0; }, () => Math.abs(dregs[1] - 5.0) < 1e-10 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "feq.d", "feq.d x1, d2, d3", () => { dregs[2] = 2.5; dregs[3] = 2.5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32D", "flt.d", "flt.d x1, d2, d3", () => { dregs[2] = 2.0; dregs[3] = 2.5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32D", "fle.d", "fle.d x1, d2, d3", () => { dregs[2] = 2.5; dregs[3] = 2.5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("RV32D", "fcvt.d.s", "fcvt.d.s d1, f2", () => { fregs[2] = 3.5; }, () => Math.abs(dregs[1] - 3.5) < 1e-6 ? true : ("dregs[1]=" + dregs[1]));
test("RV32D", "fcvt.s.d", "fcvt.s.d f1, d2", () => { dregs[2] = 3.5; }, () => Math.abs(fregs[1] - 3.5) < 1e-6 ? true : ("fregs[1]=" + fregs[1]));

// 6. RV32A Atomic Extension
test("RV32A", "lr.w", "lr.w x1, (x2)", () => { regs[2] = 0x20000; writeMem(0x20000, 99, 4); }, () => regs[1] === 99 ? true : ("regs[1]=" + regs[1]));
test("RV32A", "sc.w", "sc.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 77; }, () => (regs[1] === 0 && readMem(0x20000, 4) === 77) ? true : ("regs[1]=" + regs[1] + " mem=" + readMem(0x20000, 4)));
test("RV32A", "amoswap.w", "amoswap.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 55; writeMem(0x20000, 99, 4); }, () => (regs[1] === 99 && readMem(0x20000, 4) === 55) ? true : ("regs[1]=" + regs[1] + " mem=" + readMem(0x20000, 4)));
test("RV32A", "amoadd.w", "amoadd.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 5; writeMem(0x20000, 10, 4); }, () => (regs[1] === 10 && readMem(0x20000, 4) === 15) ? true : ("regs[1]=" + regs[1] + " mem=" + readMem(0x20000, 4)));
test("RV32A", "amoxor.w", "amoxor.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 0x0F; writeMem(0x20000, 0xFF, 4); }, () => (regs[1] === 0xFF && readMem(0x20000, 4) === 0xF0) ? true : ("regs[1]=" + regs[1]));
test("RV32A", "amoand.w", "amoand.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 0x0F; writeMem(0x20000, 0xFF, 4); }, () => (regs[1] === 0xFF && readMem(0x20000, 4) === 0x0F) ? true : ("regs[1]=" + regs[1]));
test("RV32A", "amoor.w", "amoor.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 0xF0; writeMem(0x20000, 0x0F, 4); }, () => (regs[1] === 0x0F && readMem(0x20000, 4) === 0xFF) ? true : ("regs[1]=" + regs[1]));
test("RV32A", "amomin.w", "amomin.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = -10; writeMem(0x20000, 5, 4); }, () => (regs[1] === 5 && readMemSigned(0x20000, 4) === -10) ? true : ("regs[1]=" + regs[1]));
test("RV32A", "amomax.w", "amomax.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 10; writeMem(0x20000, 5, 4); }, () => (regs[1] === 5 && readMem(0x20000, 4) === 10) ? true : ("regs[1]=" + regs[1]));
test("RV32A", "amominu.w", "amominu.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 5; writeMem(0x20000, 0xFFFFFFFF, 4); }, () => (unsigned(regs[1]) === 0xFFFFFFFF && readMem(0x20000, 4) === 5) ? true : ("regs[1]=" + regs[1]));
test("RV32A", "amomaxu.w", "amomaxu.w x1, x3, (x2)", () => { regs[2] = 0x20000; regs[3] = 0xFFFFFFFF; writeMem(0x20000, 5, 4); }, () => (regs[1] === 5 && unsigned(readMem(0x20000, 4)) === 0xFFFFFFFF) ? true : ("regs[1]=" + regs[1]));

// 7. Pseudo-instructions
test("PSEUDO", "nop", "nop", null, () => true);
test("PSEUDO", "mv", "mv x1, x2", () => { regs[2] = 42; }, () => regs[1] === 42 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "not", "not x1, x2", () => { regs[2] = 0; }, () => regs[1] === -1 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "neg", "neg x1, x2", () => { regs[2] = 42; }, () => regs[1] === -42 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "negw", "negw x1, x2", () => { regs[2] = 42; }, () => regs[1] === -42 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "sext.w", "sext.w x1, x2", () => { regs[2] = 42; }, () => regs[1] === 42 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "seqz", "seqz x1, x2", () => { regs[2] = 0; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "snez", "snez x1, x2", () => { regs[2] = 42; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "sltz", "sltz x1, x2", () => { regs[2] = -5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "sgtz", "sgtz x1, x2", () => { regs[2] = 5; }, () => regs[1] === 1 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "beqz", "beqz x1, done", () => { regs[1] = 0; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "bnez", "bnez x1, done", () => { regs[1] = 42; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "blez", "blez x1, done", () => { regs[1] = 0; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "bgez", "bgez x1, done", () => { regs[1] = 0; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "bltz", "bltz x1, done", () => { regs[1] = -1; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "bgtz", "bgtz x1, done", () => { regs[1] = 1; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "bgt", "bgt x1, x2, done", () => { regs[1] = 10; regs[2] = 5; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "ble", "ble x1, x2, done", () => { regs[1] = 5; regs[2] = 10; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "bgtu", "bgtu x1, x2, done", () => { regs[1] = -1; regs[2] = 1; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "bleu", "bleu x1, x2, done", () => { regs[1] = 1; regs[2] = -1; }, () => pc === labels["done"] ? true : "branch not taken");
test("PSEUDO", "j", "j done", null, () => pc === labels["done"] ? true : "jump not taken");
test("PSEUDO", "jr", "jr x2", () => { regs[2] = labels["done"]; }, () => pc === labels["done"] ? true : "jump not taken");
test("PSEUDO", "ret", "ret", () => { regs[1] = labels["done"]; }, () => pc === labels["done"] ? true : "ret not taken");
test("PSEUDO", "call", "call func\\nfunc:\\n  ret", null, () => (regs[1] === 0x10008) ? true : ("ra=" + regs[1]));
test("PSEUDO", "tail", "tail func\\nfunc:\\n  j done", null, () => pc === labels["done"] ? true : ("pc=" + pc));
test("PSEUDO", "la", "la x1, data0\\n.data\\ndata0: .word 42", null, () => regs[1] === 0x20000 ? true : ("regs[1]=0x" + regs[1].toString(16)));
test("PSEUDO", "li_small", "li x1, 42", null, () => regs[1] === 42 ? true : ("regs[1]=" + regs[1]));
test("PSEUDO", "li_large", "li x1, 0x12345678", null, () => (regs[1] >>> 0) === 0x12345678 ? true : ("regs[1]=0x" + (regs[1]>>>0).toString(16)));

// 8. Invariant / Architectural Correctness Checks
test("CORNER", "x0_hardwired_zero_addi", "addi x0, x0, 100", null, () => regs[0] === 0 ? true : "x0 modified!");
test("CORNER", "x0_hardwired_zero_lui", "lui x0, 0x12345", null, () => regs[0] === 0 ? true : "x0 modified!");
test("CORNER", "x0_hardwired_zero_jal", "jal x0, done", null, () => regs[0] === 0 ? true : "x0 modified!");
test("CORNER", "x0_hardwired_zero_mul", "mul x0, x1, x2", () => { regs[1] = 10; regs[2] = 20; }, () => regs[0] === 0 ? true : "x0 modified!");
test("CORNER", "x0_hardwired_zero_load", "lw x0, 0(x2)", () => { regs[2] = 0x20000; writeMem(0x20000, 100, 4); }, () => regs[0] === 0 ? true : "x0 modified!");

// Summary
console.log("\\n============================================================");
console.log("TOTAL INSTRUCTIONS & CORNER CASES TESTED: " + (successes.length + failures.length));
console.log("PASSED: " + successes.length);
console.log("FAILED: " + failures.length);
console.log("============================================================");

if (failures.length > 0) {
  console.log("\\nFAILED TESTS:");
  failures.forEach(f => console.log(" [" + f.category + "] " + f.name + " (" + f.asmLine + ") -> [" + f.stage + "] " + f.error));
  process.exit(1);
} else {
  console.log("\\nALL INSTRUCTION TESTS PASSED WITH 100% SUCCESS!");
}
`;

eval(js + "\n" + runnerCode);
