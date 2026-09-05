# RISC-V Simulator — User Guide

<p align="center">
  <a href="../riscv_simulator.html" target="_blank" rel="noopener">
    <img alt="Start the Simulator" src="https://img.shields.io/badge/▶%20Start%20the%20Simulator-2ea44f?style=for-the-badge">
  </a>
</p>

A RISC-V simulator built for **NUS CG3207**: write assembly or C, assemble or compile
it, then step or run it — either against a fast JS functional model, or against your
own synthesizable Verilog core (HDL mode) — while the Registers, Memory, Disassembly
and Peripherals panels (LEDs, DIP switches, push buttons, 7-segment display, OLED,
UART, accelerometer) update live as it executes.

Click the button above, or open [`riscv_simulator.html`](riscv_simulator.html)
yourself — nothing to install. **DIP to LED (start here)** works immediately either
way, in both languages; every other example needs the page served over `http://`
rather than opened directly from disk — see **§10, at the end of this guide**, if
that's news to you.

For the full specification — every MMIO register, the complete ISA table, the
changelog — see [`riscv_simulator_specs.md`](riscv_simulator_specs.md).

---

## 1. Your first five minutes

1. Pick something from **Example:** — **DIP to LED (start here)** is loaded already,
   in both languages, and is the one example guaranteed to load however you opened
   the page. Every other example is a file loaded on selection and needs the page
   served over `http://` — a local static server, or wherever it is hosted; opened
   straight from a downloaded copy (double-clicked, `file://`), only DIP to LED
   works, and the rest say so rather than silently doing nothing.
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
the editor. Fix and re-assemble; the message says what to write instead, and the full
list of what gets checked is in the [reference manual](riscv_simulator_specs.md).

One is worth knowing before you hit it: `sw t0, label` — a store to a symbol with no
third operand — is rejected. A store has no spare register to build the address in
(unlike a load, where the destination itself can be reused), so guessing one for you
could silently clobber a register you're using. Name it yourself: `sw t0, label, t1`.

`ecall` is worth knowing about: it works here, because the simulator implements the RARS
syscall services. It will not work on a processor with no trap support and no OS behind
it — use the MMIO peripherals for anything you intend to run on hardware. The
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
C mode therefore needs the network, the built-in examples included; assembly mode does
not. Compiler, optimisation level and ABI flags are under **⚙ Settings → Compiler**.

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

All 32 integer registers in hex and decimal. The **Content (Dec)** header has a small
±/U switch — signed by default, flip it for unsigned. The most recently written
register is highlighted. Click a value to edit it.

### Memory

Sub-tabs `[ Text | Data | Stack | MMIO ]`, an address box and a row count.

- **Word / Byte** — one 32-bit little-endian word per cell, or separate editable bytes.
  Word is the default. **Each row is one word**, never two — so on a narrow panel, a
  wrap only ever drops that row's own Content cell below its own Hex cell, and can't
  be mistaken for another word's. The third column follows the mode: **Content
  (ASCII)** in Byte mode, **Content (DEC)** in Word mode — with the same ±/U switch as
  Registers, in the column header, signed by default.
- **Text is read-only** — edit your source and re-assemble instead. Data and Stack are
  fully editable: click a cell and type, and it takes effect immediately.
- **MMIO is editable per-register, matching real hardware**: a write-only or
  read-write register (LED, 7SEG, UART TX, OLED, ...) sticks the moment you commit
  it, and the peripheral it drives updates right away — no need to Step first. A
  read-only register (DIP, PB, UART RX VALID, ACCEL DATA, CYCLECOUNT, ...) is greyed
  out and not editable, the same as hardware would ignore a write to it; its own
  name and access type (e.g. `DIP (RO):`) sits above its cell like a label, in place
  of an address you already picked to get there. (`UART RX` is the one deliberate
  exception — writing it injects a byte into the RX queue, a simulator-only way to
  feed input, not a real register write.)
- **Stack** counts *downwards*, the way the stack actually grows.
- Orange **labels** sit above the word they name, with a trailing `:` — `main:` —
  matching how the label reads in the program itself. Yellow bytes were written at
  runtime.
- **💾 Dump Text / 💾 Dump Data** export `AA_IROM.mem` / `AA_DMEM.mem` for Vivado.

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
| Push buttons | `0xFFFF0068` | L / C / R — click to **toggle**, or hold `←` `↓` `→` for a real **momentary** press (down = pressed, up = released) |
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
   You need the file that declares `module Wrapper`, your processor, and *every*
   submodule either of them instantiates. The wrapper is tagged **WRAPPER** in the list.
3. Close the dialog. The chip next to `JS | HDL` reports how many files it holds.
4. Assemble a program as usual, then **▶ Run**.

Your Verilog is never uploaded anywhere. It is compiled inside your browser by Icarus
Verilog, and it disappears when you close the tab — so you load it once per session.

### Requirements your Verilog must meet

The simulator never edits your design — it only wraps it in a testbench, the way you
would in Vivado. That testbench is generated automatically, which is what makes three
things about the Wrapper non-negotiable:

- **Exactly one file declares `module Wrapper`.** That is how your design is found at
  all; everything else hangs off it.
- **Its port list — name, width, direction and order — is fixed**, because the testbench
  connects to it *positionally*. Change a port and the testbench still compiles (Verilog
  does not check names on a positional connection), but it wires the wrong signal to the
  wrong pin with no error — so a mismatch shows up as nonsense on a peripheral, not as a
  rejected design. The exact port list is in the [reference manual](riscv_simulator_specs.md#53-the-wrapper-is-never-modified).
- **It owns an IROM and a DMEM, sized by two localparams** (`IROM_DEPTH_BITS`,
  `DMEM_DEPTH_BITS`) it declares, and loads them itself with its own `$readmemh` calls —
  the simulator assembles your program and writes the two files to match, it does not
  create the memories or a default size for you.

One more thing affects debugging, not simulation: the **Registers** panel wants a
32-entry array of 32-bit registers reachable somewhere inside the core your Wrapper
instantiates, whatever it is called or however it is wired — that is what **Register
file** auto-detects, and what typing a path there overrides if it cannot be found. A
program still runs correctly without it; you only lose the live register view, and the
Registers panel says so when that happens.

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
  place — and the very next instruction already sees the new value. **Not while it is
  actively running**, though: a Run computes its whole *Cycles* budget in one pass through
  Icarus, with no way to reach into that partway — the change is queued and only takes
  effect once the run reaches its end (or a breakpoint) and stops. A smaller *Cycles per
  Run/Resume* (⚙ Settings → 🔌 HDL Simulation) makes pauses — and the chance to change an
  input — come around more often.

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
| **A program stops part-way through** | It did not fit in the Code segment. The status bar after assembling says how many instructions too many. Raise **Code (.text) size** in ⚙ Settings → Linker, and the instruction-memory depth in your wrapper for HDL mode. Low optimisation levels make this more likely. |
| **A warning about `__mulsi3` or another libgcc helper** | Your C multiplies or divides but the M extension is off, so the compiler called a library routine that is not part of your program. Tick **Include M extension** in ⚙ Settings → Compiler, or raise the optimisation level — from `-O1` up a multiply by a constant often becomes shifts and adds and the call disappears. That is why a program can work at `-Os` and fail at `-O0`. |
| **`This program uses ecall (N sites)`** | Information, not a problem. `ecall` works here because the simulator implements the RARS syscalls. A processor with no trap support and no OS behind it will not run those programs, so use the MMIO peripherals for anything headed to hardware. |
| **A store to memory seems ignored** | Check the address is in Data, not Text. The text segment is read-only. |
| **An example will not load — the editor keeps its old content, and the console says `Failed to fetch`** | Every example but DIP to LED is a file the page fetches when you pick it, which needs `http://` — a local server, or wherever the page is hosted. Opened straight from a downloaded copy (`file://`), only DIP to LED loads. See the note at the top of this guide for how to serve it locally. |
| **C code will not compile** | C mode compiles on Godbolt's servers, so it needs the network — every C example included. |
| **Nothing happens in HDL mode** | Check the chip beside `JS \| HDL`. Amber means no sources, or none of them declares `module Wrapper`. |
| **HDL: compile error** | The Verilog compiler's message is in the console under the editor, with file and line. Drag the console taller if it is long. |
| **Registers all show `xxxxxxxx` in HDL mode** | Either the hardware genuinely has not written them yet, or the register file could not be found — the Registers panel says which. |
| **HDL mode is slow** | It simulates every clock edge. Reduce *Cycles*, or use JS mode for long runs. |
| **Layout has gone strange** | Use the panel chips to show or hide panels; double-click a splitter to even it out. |

---

## 9. Where things are

| | |
|---|---|
| [`riscv_simulator.html`](riscv_simulator.html) | The simulator |
| [`riscv_simulator.md`](riscv_simulator.md) | This guide |
| [`riscv_simulator_specs.md`](riscv_simulator_specs.md) | Full reference: MMIO map, ISA, syscalls, architecture, changelog |
| `examples/` | Every example but DIP to LED, one file each, listed in `asm/index.txt` / `c/index.txt` — add one by adding a row and a file, no HTML edit (needs the page served over `http://`) |
| `riscv_simulator_tests/` | The automated test suite |
| [`vendor/`](vendor/README.md) | Local copies of CodeMirror, Icarus Verilog and Yosys, used when the CDN cannot be reached (needs the page served over `http://`) |

---

## 10. Running it locally

Every example but **DIP to LED** assumes the page is served over `http://`, not
opened straight from disk. Opened directly (double-clicked, `file://`), the browser
itself refuses the page's own `fetch()` calls — not a broken link, and not something
a setting fixes — so only DIP to LED, baked directly into the page, loads; picking
anything else prints `Could not load '...': Failed to fetch` in the console.

**To get every example and C compilation, serve the repository root instead of
opening the file directly.** From a terminal, in the folder that contains
`riscv_simulator.html`:

```bash
python3 -m http.server 8000
```

Leave that running, then open <http://localhost:8000/riscv_simulator.html> — not the
file directly — and every example loads the same way DIP to LED does. The one server
covers every tab you point at that address; there is no need to restart it between
examples, only when you are done (`Ctrl+C`). No `python3`? Anything that serves
static files works the same way — `npx serve`, `php -S localhost:8000`, VS Code's
*Live Server* extension. The only requirement either way: `examples/` and `vendor/`
stay siblings of `riscv_simulator.html`, exactly as checked out.

"Host" here just means running a tiny local web server on your own machine; nothing
leaves it, and no account or real hosting is involved.
