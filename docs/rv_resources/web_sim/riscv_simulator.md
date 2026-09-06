# RISC-V Simulator User Guide

<p align="center">
  <a href="riscv_simulator.html" target="_blank" rel="noopener">
    <img alt="Start the Simulator" src="https://img.shields.io/badge/▶%20Start%20the%20Simulator-2ea44f?style=for-the-badge">
  </a>
</p>

A RISC-V simulator built for **NUS CG3207**: write assembly or C, assemble or compile
it, then step or run it, either against a fast JS functional model or against your
own synthesizable Verilog core (HDL mode), while the Registers, Memory, Disassembly
and Peripherals panels (LEDs, DIP switches, push buttons, 7-segment display, OLED,
UART, accelerometer) update live as it executes.

Click the button above, or open [`riscv_simulator.html`](riscv_simulator.html)
yourself: nothing to install. **DIP to LED (start here)** works either way, in both
languages; every other example needs the page served over `http://` ([§10](#10-running-it-locally)).

---

## 1. Your first five minutes

1. Pick something from **Example:**. **DIP to LED (start here)** loads regardless of
   how you opened the page; every other example needs `http://` ([§10](#10-running-it-locally)).
2. It assembles automatically. Press **▶ Run**.
3. Watch the **Registers** panel fill in, and the status bar report what happened.

That is the whole loop. Everything below is detail.

### The screen

| Control | What it does |
|---|---|
| `ASM \| C` | RISC-V assembly, or C compiled for you |
| `JS \| HDL` | The built-in model, or your own Verilog processor ([§7](#7-running-your-own-verilog-hdl-mode)) |
| Panel chips (Registers / Memory / Peripherals / Disassembly / Locals) | Show, hide or float any combination; drag to resize. Layout is remembered. |
| Console (below the editor) | Assembler messages, `ecall` output, compiler errors. Drag its top bar to resize. |
| Status bar | `Cycles: 3 EST \| Instr: 3 \| PC: 0x0040000c`. `EST`/`HW` is estimated vs. Verilog-counted cycles; **PC** is the next instruction to execute. |

---

## 2. Writing and assembling a program

| Action | How |
|---|---|
| Load an example | **Example:** dropdown |
| Open your own file | **📂 Open**: `.asm`, `.s`, `.c`, `.h` (and `.v`, see [§7](#7-running-your-own-verilog-hdl-mode)) |
| Save your work | **💾 Save**, or `Ctrl/Cmd+S` |
| Assemble / compile | **⚙ Assemble**, or `Ctrl/Cmd+Enter` |

The **Assemble** button greys out once your code is assembled and up to date, and comes
back the moment you edit. Examples and opened files assemble themselves, so **Run** and
**Step** are live immediately.

**Errors** appear in the console with a line number, and the offending line is marked in
the editor. Fix and re-assemble.

`ecall` works here because the simulator implements the RARS syscall services, but it
won't work on a processor with no trap support and no OS behind it, so use the MMIO
peripherals for anything headed to hardware. Examples that use it say so at the top, and
the console repeats it after each assemble.

### Help while you type

- **Autocomplete** appears as you type: instructions at the start of a line, registers
  and labels in the operand positions. `Ctrl+Space` forces it open.
- A **signature tooltip** floats above the cursor showing the operand you are on
  (`PARAM 2: rs1`).
- **Hover** any mnemonic, register or label for a documentation card.
- `Ctrl/Cmd+F` / `Ctrl/Cmd+H`: find and replace.

### Writing C

Switch to **C**. The code is compiled by Compiler Explorer (Godbolt) and the resulting
assembly is what actually runs, so you can step through **C source lines** directly.
C mode therefore needs the network, the built-in examples included; assembly mode does
not. Compiler, optimisation level and ABI flags are under **⚙ Settings → Compiler**.

MMIO is available as macros: `LEDS`, `SWITCHES`, `BUTTONS`, `SEVSEG`, `UART_TX`,
`ACCEL_DATA`, `OLED_COL`, `OLED_ROW`, `OLED_DATA`, `OLED_CTRL`.

Hover a C variable while it's in scope, or open the **Locals** panel, to see where it
actually lives in memory (derived from the compiled stack layout, so it's best-effort,
not real debug info). Useful once a bug turns out to be a wrong address rather than
wrong logic.

---

## 3. Running and debugging

| Button | Key | What it does |
|---|---|---|
| **▶ Run** / **⏸ Pause** / **▶ Resume** | `F5` | Run to the end, a breakpoint, or the instruction limit |
| **⏭ Step** | `F8` | One instruction (or one statement, see below) |
| **⏮ Back** | `Shift+F8` | Undo the last step, registers and memory included |
| **⟲ Reset** | | Back to the start, keeping the assembled program |

**Breakpoints**: click the gutter left of a line number, or press `F9`. If you pick a
line with no instruction on it (a comment, a blank, a `}`), the breakpoint moves to the
next real instruction and the console says so.

**Step Back** restores registers, memory and peripheral state; it isn't a re-run from
the start.

**Statement Stepping** (⚙ Settings → JS Simulation or HDL Simulation) makes one **Step**
cover a whole C statement, or a whole pseudo-instruction like `li x1, 0x12345678`,
instead of one machine instruction at a time. **Back** undoes exactly the same distance.

**A program that never ends** pauses itself after *Max Instructions Per Run*
(⚙ Settings → JS Simulation, default 100,000,000) rather than freezing the browser.

---

## 4. Reading the panels

### Registers

All 32 integer registers in hex and decimal. The **Content (Dec)** header has a small
±/U switch: signed by default, flip it for unsigned. The most recently written
register is highlighted. Click a value to edit it.

### Memory

Sub-tabs `[ Text | Data | Stack | MMIO ]`, an address box and a row count.

- **Word / Byte**: one 32-bit little-endian word per row, or separate editable bytes.
  Word is the default; the third column is **Content (ASCII)** in Byte mode, **Content
  (DEC)** in Word mode, with the same ±/U switch as Registers.
- **Text** is read-only; edit your source and re-assemble instead. **Data** and
  **Stack** are freely editable: click a cell and type.
- **MMIO is editable per register, matching hardware**: a writable register (LED, 7SEG,
  UART TX, OLED, ...) commits the moment you type, no need to Step first; a read-only
  one (DIP, PB, UART RX VALID, ACCEL DATA, CYCLECOUNT, ...) is greyed out, the same as
  hardware ignoring a write to it. (`UART RX` is the exception: writing it queues a
  byte for the program to read, not a real register write.)
- **Stack** counts *downwards*, the way the stack actually grows.
- Orange **labels** sit above the word they name, with a trailing `:`, like `main:`.
  Yellow bytes were written at runtime.
- **💾 Dump Text / 💾 Dump Data** export `AA_IROM.mem` / `AA_DMEM.mem` for Vivado.

### Disassembly

What the processor actually executes, after pseudo-instructions are expanded, so
`li x1, 0x12345678` shows as the `lui` + `addi` pair it really is. Label headers and
jump targets (`<loop>`) are annotated; machine code can be shown as bytes or whole
words, hex or binary.

The **Native instruction** column names registers as the encoding does: `x0` to `x31`,
so `add t0, t0, t1` reads `add x5, x5, x6`. ABI names stay in **Original source** beside
it. Only rows where a real pseudo-instruction was expanded are coloured as such; a
register renamed from `t0` to `x5` is not an expansion.

### Locals (C mode)

For the function the PC is currently in: each local's name, address and value (hex,
signed and unsigned). Best-effort, derived from the compiled stack layout rather than
real debug info, so it can miss an unusual declaration. Hidden outside C mode.

### Peripherals

A simulated Nexys 4 board. Everything here is live: click it while the program is
paused and the program will see the change. The course's own
[memory map](https://nus-cg3207.github.io/labs/rv_resources/rv_memmap/) and
[peripherals reference](https://nus-cg3207.github.io/labs/rv_resources/peripherals/)
cover these registers in full.

Click a section's title to fold or unfold it — LEDs & DIP Switches starts open,
everything else starts folded, and a section unfolds itself the first time your
program actually reads or writes it. Fold one back down and it stays that way until
you assemble a different program.

| Peripheral | Address | Notes |
|---|---|---|
| LEDs / DIP switches | `0xFFFF0060` / `0xFFFF0064` | Click a switch to flip it |
| Push buttons | `0xFFFF0068` | L / C / R: click to **toggle**, or hold `←` `↓` `→` for a real **momentary** press (down = pressed, up = released) |
| 7-segment | `0xFFFF0080` | 32-bit value as 8 hex digits |
| UART console | `0xFFFF0000`–`0xFFFF000C` | Type in the box and press **Send** |
| OLED 96×64 | `0xFFFF0020`–`0xFFFF002C` | Colour and auto-advance modes |
| Accelerometer + temp | `0xFFFF0040` | Sliders, Flat / Tilt / Shake presets, or hold `X`/`Y`/`Z`/`T` and press `←`/`→` to nudge that axis (T = temperature) |
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

Changing anything on the **Compiler** tab clears the compiled program: what was loaded
no longer matches the settings, so compile again afterwards.

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
2. **Drop your `.v` files anywhere on the page**, or use **browse…**, or **📂 Open**.
   You need the file that declares `module Wrapper`, your processor, and *every*
   submodule either of them instantiates. The wrapper is tagged **WRAPPER** in the list.
3. Close the dialog. The chip next to `JS | HDL` reports how many files it holds.
4. Assemble a program as usual, then **▶ Run**.

Your Verilog is never uploaded anywhere. It is compiled inside your browser by Icarus
Verilog, and it disappears when you close the tab, so you load it once per session.

### Requirements your Verilog must meet

The simulator never edits your design; it only wraps it in a testbench, the way you
would in Vivado. That testbench is generated automatically, which is what makes three
things about the Wrapper non-negotiable:

- **Exactly one file declares `module Wrapper`.** That is how your design is found at
  all; everything else hangs off it.
- **Its port list (name, width, direction and order) is fixed**, because the testbench
  connects to it *positionally*. Change a port and the testbench still compiles (Verilog
  doesn't check names on a positional connection), but it wires the wrong signal to the
  wrong pin with no error, so a mismatch shows up as nonsense on a peripheral, not as a
  rejected design. Start from the
  [wrapper template](https://github.com/NUS-CG3207/labs/tree/main/docs/code_templates/Asst_02),
  which also has the other modules you will need for the eventual Nexys 4 / Nexys 4 DDR /
  Nexys A7 build.
- **It owns an IROM and a DMEM, sized by two localparams** (`IROM_DEPTH_BITS`,
  `DMEM_DEPTH_BITS`) it declares, and loads them itself with its own `$readmemh` calls.
  The simulator assembles your program and writes the two files to match; it doesn't
  create the memories or a default size for you.

One more thing affects debugging, not simulation: the **Registers** panel wants a
32-entry array of 32-bit registers reachable somewhere inside the core your Wrapper
instantiates, whatever it is called or however it is wired. That's what **Register
file** auto-detects, and what typing a path there overrides if it can't be found. A
program still runs correctly without it; you only lose the live register view, and the
Registers panel says so when that happens.

### What is different from JS mode

- **Run becomes Resume.** It continues to the next breakpoint, or to the end of what has
  been recorded, and records another *Cycles* worth when it gets there. **⟲ Reset**
  starts the hardware over.
- **Step and Back are instant**, and Back works: a run is recorded in full, and stepping
  moves through the recording rather than re-simulating.
- **Unwritten registers show `xxxxxxxx`, not `0`.** Real hardware powers up undefined,
  and pretending otherwise would hide exactly the bugs you are looking for.
- **`Cycles` counts real clock edges** (tagged `hw`) instead of the estimate JS mode
  shows (tagged `est`).
- **Flip a switch (or send UART input) while paused**, and it's stamped in at the
  current cycle when you Resume: everything recorded before that point stays identical,
  so you keep your place, and the very next instruction already sees the new value.
- **Not while a Run is actually in progress, though.** Icarus computes a whole Run's
  *Cycles* budget in one uninterruptible pass, so the browser is essentially frozen
  until it stops, at its end or at a breakpoint; a change you make mid-run just waits
  until then. JS mode has no such restriction, you can change an input at any point
  while it's running. There's a real trade-off here: a smaller *Cycles per Run/Resume*
  (⚙ Settings → 🔌 HDL Simulation) gives more frequent chances to change an input, but
  means clicking Run more times to get through a long program, such as one that
  displays an image on the OLED.

### Is my Verilog synthesisable?

Whenever you load sources, they are linted for things that don't survive synthesis:
delays, `$display`, `real`, unbounded loops, `casex`, a blocking assignment in a clocked
block, an incomplete sensitivity list on combinational logic. Anything found is listed
in the console with a file and a line. It never stops a simulation.

Treat it as a first pass, not a verdict: it catches common mistakes but doesn't prove
anything. To actually prove it, tick **Post-synthesis functional simulation**
(⚙ Settings → 🔌 HDL Simulation). Every run then happens twice: once as you wrote it, and
once as a gate-level netlist produced by **Yosys**. If the two behave differently, you're
told the first point where they part company. That's what an inferred latch, an
incomplete sensitivity list, or a race between blocking assignments actually looks like.

Ticking that box downloads the synthesiser the first time you use it, about **13 MB**.
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
| **Program pauses on its own** | It hit the instruction limit, usually an infinite loop. Raise it in ⚙ Settings → JS Simulation, or find the loop. |
| **A program stops part-way through** | It did not fit in the Code segment. The status bar after assembling says how many instructions too many. Raise **Code (.text) size** in ⚙ Settings → Linker, and the instruction-memory depth in your wrapper for HDL mode. Low optimisation levels make this more likely. |
| **A warning about `__mulsi3` or another libgcc helper** | Your C multiplies or divides but the M extension is off, so the compiler called a library routine that is not part of your program. Tick **Include M extension** in ⚙ Settings → Compiler, or raise the optimisation level: from `-O1` up, a multiply by a constant often becomes shifts and adds and the call disappears. That is why a program can work at `-Os` and fail at `-O0`. |
| **`This program uses ecall (N sites)`** | Information, not a problem. `ecall` works here because the simulator implements the RARS syscalls; a processor with no trap support and no OS behind it will not run those programs, so use the MMIO peripherals for anything headed to hardware. |
| **A store to memory seems ignored** | Check the address is in Data, not Text. The text segment is read-only. |
| **An example will not load (the editor keeps its old content, and the console says `Failed to fetch`)** | Needs `http://`, see [§10](#10-running-it-locally). |
| **C code will not compile** | C mode compiles on Godbolt's servers, so it needs the network, every C example included. |
| **Nothing happens in HDL mode** | Check the chip beside `JS \| HDL`. Amber means no sources, or none of them declares `module Wrapper`. |
| **HDL: compile error** | The Verilog compiler's message is in the console under the editor, with file and line. Drag the console taller if it is long. |
| **Registers all show `xxxxxxxx` in HDL mode** | Either the hardware genuinely has not written them yet, or the register file could not be found; the Registers panel says which. |
| **HDL mode is slow** | It simulates every clock edge. Reduce *Cycles*, or use JS mode for long runs. |
| **Layout has gone strange** | Use the panel chips to show or hide panels; double-click a splitter to even it out. |

---

## 9. Where things are

| | |
|---|---|
| [`riscv_simulator.html`](riscv_simulator.html) | The simulator |
| [`riscv_simulator.md`](riscv_simulator.md) | This guide |
| [`riscv_simulator_specs.md`](riscv_simulator_specs.md) | Full reference: MMIO map, ISA, syscalls, architecture, changelog |
| `examples/` | Every example but DIP to LED, one file each, listed in `asm/index.txt` / `c/index.txt`; add one by adding a row and a file, no HTML edit (needs the page served over `http://`) |
| `riscv_simulator_tests/` | The automated test suite |
| [`vendor/`](vendor/README.md) | Local copies of CodeMirror, Icarus Verilog and Yosys, used when the CDN cannot be reached (needs the page served over `http://`) |

---

## 10. Running it locally

Every example but **DIP to LED** assumes the page is served over `http://`, not opened
straight from disk. Opened directly (double-clicked, `file://`), the browser refuses
the page's own `fetch()` calls, so only DIP to LED, baked directly into the page,
loads; picking anything else prints `Could not load '...': Failed to fetch` in the
console.

**To get every example and C compilation, serve the repository root instead of
opening the file directly.** From a terminal, in the folder that contains
`riscv_simulator.html`:

```bash
python3 -m http.server 8000
```

Leave that running, then open <http://localhost:8000/riscv_simulator.html>, not the
file directly, and every example loads the same way DIP to LED does. The one server
covers every tab you point at that address; there is no need to restart it between
examples, only when you are done (`Ctrl+C`). No `python3`? Anything that serves
static files works the same way: `npx serve`, `php -S localhost:8000`, VS Code's
*Live Server* extension. The only requirement either way: `examples/` and `vendor/`
stay siblings of `riscv_simulator.html`, exactly as checked out.
