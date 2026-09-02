# RISC-V Simulator — User Guide

A short, practical guide to using the CG3207 simulator. Open
[`riscv_simulator.html`](riscv_simulator.html) in a browser, or use the live copy at
<https://nus-cg3207.github.io/labs>. Nothing to install.

For the full specification — every MMIO register, the complete ISA table, the
changelog — see [`riscv_simulator.md`](riscv_simulator.md).

---

## 1. Your first five minutes

1. Pick something from **Example:** — **Basic (start here)** is the short, complete
   program to work from. In C mode the same entry is **Basic Sum (start here)**.
2. It assembles automatically. Press **▶ Run**.
3. Watch the **Registers** panel fill in, and the status bar report what happened.

That is the whole loop. Everything below is detail.

### The screen

```
+-----------------------------------------+---------------------------+
|  toolbar: modes, file, edit             |  Registers   |  Memory    |
|  toolbar: Assemble Run Step Back Reset  |              |            |
|  status bar                             |--------------|------------|
|                                         |  Peripherals | Disassembly|
|  code editor                            |              |            |
|                                         |              |            |
|-----------------------------------------|              |            |
|  console  (assembler + runtime output)  |              |            |
+-----------------------------------------+---------------------------+
```

- **`ASM | C`** — write RISC-V assembly, or C that is compiled for you.
- **`JS | HDL`** — run on the built-in model, or on your own Verilog processor
  ([§7](#7-running-your-own-verilog-hdl-mode)).
- **Panel chips** (Registers / Memory / Peripherals / Disassembly) show and hide panels.
  Show any combination; drag the separators to resize; click **⧉** on a panel header to
  float it. Your layout is remembered.
- **The console** under the editor carries assembler messages, `ecall` output and
  compiler errors. **Drag the bar above it** to make it taller; double-click to reset.
- **The status bar** is the line above the editor: the latest message on the left, and on
  the right the readout that is always there —
  `Cycles: 3 EST | Instr: 3 | PC: 0x0040000c`. `EST` means the cycle count is estimated
  from the CPI table; `HW` means it was counted by your Verilog. **PC** is the address of
  the instruction about to execute, and it is the one number worth watching while you
  step.

---

## 2. Writing and assembling a program

| Action | How |
|---|---|
| Load an example | **Example:** dropdown |
| Open your own file | **📂 Open** — `.asm`, `.s`, `.c`, `.h` (and `.v`, see [§7](#7-running-your-own-verilog-hdl-mode)) |
| Save your work | **💾 Save**, or `Ctrl/Cmd+S` |
| Assemble / compile | **⚙ Assemble**, or `Ctrl/Cmd+Enter` |

The **Assemble** button greys out once your code is assembled and up to date, and comes
back the moment you edit. Examples and opened files assemble themselves, so **Run** and
**Step** are live immediately.

**Errors** appear in the console with a line number, and the offending line is marked in
the editor. Fix and re-assemble.

### What the assembler will not let you do

It refuses several things that a looser assembler accepts and quietly gets wrong — a
missing operand (`add t0, t1` is not `add t0, t1, x0`), a surplus one, a shift by 32, a
value too wide for its directive, a duplicated label, a label named after a register, and
a store to a label without a named scratch register. Each message says what to write
instead. The full list is in the [reference manual](riscv_simulator.md).

`ecall` is worth knowing about: it works here, because the simulator implements the RARS
syscall services. It will not work on the CG3207 board, which has no trap support and no
OS behind it — use the MMIO peripherals for anything you intend to run on hardware. The
examples that use `ecall` say so at the top, and the console repeats it after each
assemble.

### Help while you type

- **Autocomplete** appears as you type — instructions at the start of a line, registers
  and labels in the operand positions. `Ctrl+Space` forces it open.
- A **signature tooltip** floats above the cursor showing the operand you are on
  (`PARAM 2: rs1`).
- **Hover** any mnemonic, register or label for a documentation card.
- `Ctrl/Cmd+F` / `Ctrl/Cmd+H` — find and replace.

### Writing C

Switch to **C**. The code is compiled by Compiler Explorer (Godbolt) and the resulting
assembly is what actually runs, so you can step through **C source lines** directly.
Every built-in C example ships pre-compiled, so they work with no network. Compiler,
optimisation level and ABI flags are under **⚙ Settings → Compiler**.

MMIO is available as macros: `LEDS`, `SWITCHES`, `BUTTONS`, `SEVSEG`, `UART_TX`,
`ACCEL_DATA`, `OLED_COL`, `OLED_ROW`, `OLED_DATA`, `OLED_CTRL`.

---

## 3. Running and debugging

| Button | Key | What it does |
|---|---|---|
| **▶ Run** / **⏸ Pause** / **▶ Resume** | `F5` | Run to the end, a breakpoint, or the instruction limit |
| **⏭ Step** | `F8` | One instruction (or one statement — see below) |
| **⏮ Back** | `Shift+F8` | Undo the last step, registers and memory included |
| **⟲ Reset** | | Back to the start, keeping the assembled program |

**Breakpoints**: click the gutter left of a line number, or press `F9`. The line number
turns red. If you pick a line with no instruction on it — a comment, a blank, a `}` —
the breakpoint **moves to the next real instruction** and the console tells you so.

**Step Back really does go back.** Registers, memory and peripheral state are all
restored; it is not a re-run from the start.

**Statement Stepping** (⚙ Settings → JS Simulation or HDL Simulation) makes one **Step**
cover a whole C statement, or a whole pseudo-instruction like `li x1, 0x12345678`,
instead of one machine instruction at a time. **Back** undoes exactly the same distance.

**A program that never ends** pauses itself after *Max Instructions Per Run*
(⚙ Settings → JS Simulation, default 100,000,000) rather than freezing the browser.

---

## 4. Reading the panels

### Registers

All 32 integer registers in hex and decimal. The most recently written register is
highlighted. Click a value to edit it.

### Memory

Sub-tabs `[ Code | Data | Stack | MMIO ]`, an address box and a row count.

- **Word / Byte** — one 32-bit little-endian word per cell, or separate editable bytes.
  Word is the default.
- **Code is read-only** — edit your source and re-assemble instead. Data, Stack and MMIO
  are editable: click a cell and type.
- **Stack** counts *downwards*, the way the stack actually grows.
- Orange **labels** sit above the word they name. Yellow bytes were written at runtime.
- **💾 Dump txt / 💾 Dump data** export `AA_IROM.mem` / `AA_DMEM.mem` for Vivado.

### Disassembly

What the processor actually executes, after pseudo-instructions are expanded — so
`li x1, 0x12345678` shows as the `lui` + `addi` pair it really is. The current
instruction is highlighted and scrolls into view. Label headers and jump targets
(`<loop>`) are annotated. Machine code can be shown as bytes or whole words, hex or
binary.

The **Native instruction** column names registers as the encoding does — `x0` to `x31`,
so `add t0, t0, t1` reads `add x5, x5, x6`. ABI names stay in **Original source** beside
it, which is what makes the two columns worth comparing. Only rows where a real
pseudo-instruction was expanded are coloured as such; a register renamed from `t0` to
`x5` is not an expansion.

### Peripherals

A simulated Nexys 4 board. Everything here is live — click it while the program is
paused and the program will see the change.

| Peripheral | Address | Notes |
|---|---|---|
| LEDs / DIP switches | `0xFFFF0060` / `0xFFFF0064` | Click a switch to flip it |
| Push buttons | `0xFFFF0068` | L / C / R |
| 7-segment | `0xFFFF0080` | 32-bit value as 8 hex digits |
| UART console | `0xFFFF0000`–`0xFFFF000C` | Type in the box and press **Send** |
| OLED 96×64 | `0xFFFF0020`–`0xFFFF002C` | Colour and auto-advance modes |
| Accelerometer + temp | `0xFFFF0040` | Sliders, and Flat / Tilt / Shake presets |
| Cycle counter | `0xFFFF00A0` | Cycles since reset |

The UART box takes **ASCII** (including `\r`, `\n`, `\xHH`) or **Hex** (`0x41, 0x0D`).
Tick **Buffer** to drip-feed a long string a few instructions apart, the way a real
terminal would.

---

## 5. Settings

**⚙ Settings…** has four tabs:

| Tab | What is in it |
|---|---|
| **⚡ Compiler** | C compiler, `-O` level, `-march`/`-mabi`, M-extension toggle (off by default) |
| **🗺 Linker** | Segment bases and sizes, stack top, MMIO base |
| **⏱ JS Simulation** | Statement Stepping · max instructions per run · cycles per instruction |
| **🔌 HDL Simulation** | Statement Stepping · your Verilog sources · everything for the hardware engine |

Changing anything on the **Compiler** tab clears the compiled program — what was loaded
no longer matches the settings — so compile again afterwards.

The **M extension is off by default**. With it off, a `*` or `%` in C compiles to a call
to a helper like `__mulsi3` that this assembler does not provide, and you will be told to
enable it.

> **On a real FPGA** the RAM size is fixed in hardware. If you raise the segment sizes
> beyond what your board provides or provisioned in HDL (whichever is lower), it will work here and fail there.

---

## 6. Keyboard shortcuts

| Key | Action |
|-----|--------|
| `F5` | Run / Pause / Resume |
| `F8` / `Shift+F8` | Step / Step back |
| `F9` | Toggle breakpoint on the cursor's line |
| `Ctrl/Cmd+Enter` | Assemble / Compile |
| `Ctrl/Cmd+S` | Save source |
| `Ctrl+Space` | Autocomplete |
| `Ctrl/Cmd+F` / `Ctrl/Cmd+H` | Find / Replace |
| `Tab` / `Shift+Tab` | Insert a tab, or indent / dedent a selection |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Esc` | Close find, autocomplete or the settings dialog |

Shortcuts are suppressed while you are typing in a text box, so `F5` in the UART field
types rather than runs.

---

## 7. Running your own Verilog (HDL mode)

This is the part that makes the simulator a lab tool rather than a toy: the **same
program, the same breakpoints and the same board** can be driven by the processor *you*
wrote.

### Getting started

1. Click **HDL** in the toolbar. The settings dialog opens on **🔌 HDL Simulation**,
   because nothing can happen until it has your sources.
2. **Drop your `.v` files anywhere on the page** — or use **browse…**, or **📂 Open**.
   You need `Wrapper.v`, `RV.v` and *every* submodule (`ALU.v`, `Decoder.v`, `Extend.v`,
   `PC_Logic.v`, `ProgramCounter.v`, `RegFile.v`, `Shifter.v`).
   The file containing `module Wrapper` is tagged **WRAPPER** in the list.
3. Close the dialog. The chip next to `JS | HDL` should read **9 files**.
4. Assemble a program as usual, then **▶ Run**.

Your Verilog is never uploaded anywhere. It is compiled inside your browser by Icarus
Verilog, and it disappears when you close the tab — so you load it once per session.

### What is different from JS mode

- **Run becomes Resume.** It continues to the next breakpoint, or to the end of what has
  been recorded, and records another *Cycles* worth when it gets there. **⟲ Reset**
  starts the hardware over.
- **Step and Back are instant**, and Back works — a run is recorded in full, and stepping
  moves through the recording rather than re-simulating.
- **Unwritten registers show `xxxxxxxx`, not `0`.** Real hardware powers up undefined,
  and pretending otherwise would hide exactly the bugs you are looking for.
- **`Cycles` counts real clock edges** (tagged `hw`) instead of the estimate JS mode
  shows (tagged `est`).
- **Flip a switch while paused** and the run is replayed with that change stamped at the
  current cycle. Everything before that point comes out identical, so you keep your
  place — and the very next instruction already sees the new value.

### Is my Verilog synthesisable?

Whenever you load sources, they are linted for things that do not survive synthesis —
delays, `$display`, `real`, unbounded loops, `casex`, a blocking assignment in a clocked
block, an incomplete sensitivity list on combinational logic. Anything found is listed
in the console with a file and a line. It never stops a simulation.

Treat it as a first pass, not a verdict — it catches common mistakes but does not prove
anything. To actually prove it, tick **Post-synthesis functional simulation**
(⚙ Settings → 🔌 HDL Simulation). Every run then happens twice: once as you wrote it, and
once as a gate-level netlist produced by **Yosys**. If the two behave differently you are
told the first point where they part company — which is what an inferred latch, an
incomplete sensitivity list, or a race between blocking assignments actually looks like.

Ticking that box downloads the synthesiser the first time you use it — about **13 MB**.
Nothing is fetched until you tick it, and your browser keeps it cached for a year, so
after the first time it starts immediately. Synthesis takes 20–35 seconds and is redone
only when your Verilog changes.

Your registers still come from the RTL run while this is on: synthesis turns the register
file into gates, so there is no register array left in the netlist to read. The PC,
memory and every peripheral are compared in full.

### Finding a bug in your processor

Tick **Cross-check against the JS model** (⚙ Settings → 🔌 HDL Simulation). After each
run, the same program is replayed on the functional model and you are told the **first
instruction where the two disagree**, with the cycle, the PC, the instruction word and
both values. That is almost always where the RTL bug is.

### Other things in the HDL tab

| Setting | Why you would touch it |
|---|---|
| **Cycles per Run / Resume** | How much to simulate at a time. Raise it for long programs. |
| **Record the architectural trace** | On by default; needed for Step and Back. |
| **Verilog standard** | Verilog-2005 by default; switch if your code needs it. |
| **Dump a VCD waveform** | Produces a **⭳ VCD** button in the toolbar; open it in GTKWave. |
| **Register file** | Detected automatically. Type a path only if detection fails. |
| **Save testbench** | The exact generated testbench, to run in Vivado or `iverilog` offline. |

---

## 8. Troubleshooting

| Symptom | What is going on |
|---|---|
| **Run and Step are greyed out** | The program is not assembled. Press **⚙ Assemble**. |
| **"Breakpoint set at line X (moved from line Y)"** | You put it on a line with no instruction; it moved to the next real one. |
| **Program pauses on its own** | It hit the instruction limit — usually an infinite loop. Raise it in ⚙ Settings → JS Simulation, or find the loop. |
| **A program only half runs — the circle does not close, the image is cut off** | It does not fit. The status bar after assembling says how many instructions too many. Raise **Code (.text) size** in ⚙ Settings → Linker, and `IROM_DEPTH_BITS` in your `Wrapper.v` for HDL mode. `Circle & Accel` needs both, especially at `-O0`. |
| **`'__mulsi3' is a libgcc helper…`**, or a warning about one right after compiling | Your C multiplies or divides but the M extension is off, so the compiler called a library routine that is not part of your program. Two ways out: tick **Include M extension** in ⚙ Settings → Compiler, or raise the optimisation level — from `-O1` up the compiler often turns a multiply by a constant into shifts and adds and the call disappears. That is why a program can work at `-Os` and fail at `-O0`. |
| **`'1' is a number, not a register`** | `add t0, t0, 1` needs three registers. For a constant use the immediate form: `addi t0, t0, 1`. |
| **`sw t0, var1 would need a scratch register…`** | Storing to a label takes two instructions, and the address has to be built somewhere. Say where: `sw t0, var1, t1` — and pick a register you are not using. Loads do not need this; `lw s3, var1` uses `s3` itself. |
| **`add takes 3 operands, but 2 were given`** | A missing operand used to be filled in with `x0`, so the program ran and was wrong. The message names the shape to write. |
| **`slli shift amount 32 is out of range`** | RV32 shifts by 0–31. A shift by 32 used to be masked down to a shift by **zero**. |
| **`256 does not fit in .byte`** | The value would be truncated to 0. Use `.half` or `.word`, or check the number. |
| **`Label 'x' is defined more than once`** | Every reference would resolve to the last definition. Rename one. |
| **`'t0' is a register name, so it cannot be used as a label`** | `j t0` would read `t0` as the register, not as your label. Rename it. |
| **`… offset that is not a multiple of the access size`** | A warning, not an error. `lw t0, 1(sp)` only works if the base register makes up the difference — and the Wrapper's data memory is word-addressed, so on the board it touches a different word. |
| **`This program uses ecall (N sites)`** | Information, not a problem. `ecall` works here because the simulator implements the RARS syscalls; the CG3207 hardware has no trap support and no OS behind it, so board programs should use the MMIO peripherals. |
| **A store to memory seems ignored** | Check the address is in Data, not Code. The code segment is read-only. |
| **C code will not compile** | Godbolt needs the network. The built-in C examples work offline; your own C does not. |
| **Nothing happens in HDL mode** | Check the chip beside `JS \| HDL`. Amber means no sources, or none of them declares `module Wrapper`. |
| **HDL: compile error** | The Verilog compiler's message is in the console under the editor, with file and line. Drag the console taller if it is long. |
| **Registers all show `xxxxxxxx` in HDL mode** | Either the hardware genuinely has not written them yet, or the register file could not be found — the Registers panel says which. |
| **HDL mode is slow** | It simulates every clock edge. Reduce *Cycles*, or use JS mode for long runs. |
| **Layout has gone strange** | Use the panel chips to show or hide panels; double-click a splitter to even it out. |

---

## 9. Where things are

| | |
|---|---|
| [`riscv_simulator.html`](riscv_simulator.html) | The simulator (both engines) |
| [`riscv_simulator_nohdl.html`](riscv_simulator_nohdl.html) | The same thing without the HDL engine |
| [`riscv_simulator.md`](riscv_simulator.md) | Full reference: MMIO map, ISA, syscalls, architecture, changelog |
| `riscv_simulator_tests/` | The automated test suite |
| [`vendor/`](vendor/README.md) | Local copies of CodeMirror, Icarus Verilog and Yosys, used when the CDN cannot be reached (needs the page served over `http://`) |
