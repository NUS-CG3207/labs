# NUS-CG3207 RISC-V Simulator (RV32GC) — Technical Specification, Architecture Manual & Developer Guide

## 1. Project Overview

**NUS-CG3207 RISC-V Simulator** is a high-performance, single-file web application ([`riscv_simulator.html`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator.html)) delivering a complete **RISC-V RV32GC (RV32I + M + A + F + D + C) Assembler, C Compiler, Emulator, and Visual Debugger**, powered by **CodeMirror 6** (the latest modular code editor engine) and **Compiler Explorer (Godbolt) REST API**.
Available live at [https://nus-cg3207.github.io/labs](https://nus-cg3207.github.io/labs). Vibe coded by Rajesh Panicker.

Designed for computer engineering students, hardware architects, and embedded systems developers, the simulator combines a modern CodeMirror 6 code editor supporting both **RISC-V Assembly** and **C Code**, custom syntax highlighting, live parameter signature help, hover inspection, breakpoint gutter with highlighted line numbers and smart snapping, two-pass assembler, non-blocking execution engine, real-time disassembly viewer with label headers, jump/branch target annotations, and C source line tags, step-by-step debugger with back-stepping history, statement stepping mode, interactive memory explorer with custom segment mapping and read-only code protection, downward-growing stack visualization, configurable instruction cycle timing, batch instruction execution chunking, a hardware-accurate simulation of the **Digilent Nexys 4 FPGA Board**, a standard 16550 **UART Serial Console**, a **96x64 Pixel OLED Display MMIO Peripheral** with multi-mode auto-advance, a **3-Axis Accelerometer & Temperature Sensor**, a **System Cycle Counter**, support for standard **RARS `ecall` Syscalls**, and 19 pre-loaded assembly & C example programs.

---

## 2. Architecture & Design System

### 2.1 Technology Stack & Core Philosophy
- **Zero External Dependencies / 100% Offline with Cloud Compilation Option**: Pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+) with an embedded, self-contained CodeMirror 6 bundle (`window.CM6`). Supports offline execution with built-in precompiled C mappings and online C compilation via the Godbolt REST API.
- **Theme & Aesthetics**: Dark mode theme inspired by the *Catppuccin Mocha* palette:
  - Base background: `#1e1e2e`
  - Mantle / Editor background: `#181825`
  - Surface / Panels: `#313244`
  - Primary accents: `#cba6f7` (Mauve)
  - Keywords: `#89b4fa` (Blue)
  - Registers / Strings: `#a6e3a1` (Green)
  - Directives / Types: `#f5c2e7` (Pink)
  - Labels: `#fab387` (Peach)
  - Immediates / Numbers: `#f9e2af` (Yellow)
  - Comments: `#6c7086` (Gray)
  - Errors / Breakpoints: `#f38ba8` (Red)
- **Responsive Layout**: Resizable two-pane layout using a custom draggable divider (`.splitter`). Optimized for desktop, tablet, and mobile viewports.
- **Typography Stack**: Modern system UI font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) with enhanced font weights (`500`–`650`) and high-contrast styling for crisp legibility across all panels.
- **Embedded Favicon & Microchip Branding**: Custom vector SVG microchip architecture icon and embedded data URI SVG favicon in `<head>`, displaying an integrated circuit package with central silicon die, gold bonding I/O pins, and central `RV` (RISC-V) core logo.
- **Unified Toolbar Controls**: Uniform button heights (`28px` on desktop, `32px` on mobile) and vertical alignment across standard buttons, icon controls, and dropdown selectors.

---

### 2.2 Dual-Language Architecture & CodeMirror 6 Engine

The simulator incorporates a state-of-the-art **CodeMirror 6** editor architecture mounted in `<div id="cmEditorContainer"></div>` with dynamic language reconfiguration via a `CM6.Compartment`:

```
+---------------------------------------------------------------------------------------+
|                                    CodeMirror 6 Editor                                |
|  +---------------------------------------------------------------------------------+  |
|  | [ RV32 ASM | C Code ]  Example: [ Basic Sum (C)                     ▼ ] 📂 💾 ↶ ↷ 🔍 |  |
|  +---------------------------------------------------------------------------------+  |
|  |  1 ● | #include <stdint.h>                                                      |  |
|  |  2   | #define LEDS (*(volatile uint32_t*)0xFFFF0060)                           |  |
|  |  3   | int main(void) {                                                         |  |
|  |  4 ➡ |     LEDS = 0x55;  /* <-- Active execution line (cm-execLine) */           |  |
|  |  5   |     return 0;                                                            |  |
|  |  6   | }                                                                        |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

#### 1. Language Mode Switcher (`[ RV32 ASM | C Code ]`)
- **Assembly Mode**: Activates `riscvStreamParser` with RISC-V instruction/register autocomplete and 11 assembly example programs.
- **C Code Mode**: Activates `cStreamParser` with C keyword/type autocomplete, `#define` MMIO macros (`LEDS`, `SWITCHES`, `BUTTONS`, `SEVSEG`, `UART_TX`, `ACCEL_DATA`, `OLED_COL`, `OLED_ROW`, `OLED_DATA`, `OLED_CTRL`), Godbolt compiler configuration modal, and 8 C example programs.

#### 2. Embedded Standalone CM6 Bundle (`window.CM6`)
Contains all necessary CodeMirror 6 and Lezer packages compiled into a single IIFE bundle:
- `@codemirror/state`: `EditorState`, `StateField`, `StateEffect`, `RangeSet`, `RangeSetBuilder`, `EditorSelection`, `Transaction`, `Facet`, `Compartment`.
- `@codemirror/view`: `EditorView`, `GutterMarker`, `gutter`, `lineNumbers`, `lineNumberMarkers`, `highlightActiveLine`, `highlightActiveLineGutter`, `showTooltip`, `hoverTooltip`, `drawSelection`, `dropCursor`.
- `@codemirror/language`: `StreamLanguage`, `HighlightStyle`, `syntaxHighlighting`, `bracketMatching`.
- `@codemirror/commands`: `history`, `historyKeymap`, `defaultKeymap`, `indentWithTab`, `indentMore`, `indentLess`, `undo`, `redo`.
- `@codemirror/search`: `openSearchPanel`, `closeSearchPanel`, `findNext`, `findPrevious`, `replaceNext`, `replaceAll`.
- `@codemirror/autocomplete`: `autocompletion`, `completionKeymap`, `startCompletion`, `closeCompletion`, `acceptCompletion`.
- `@lezer/highlight`: `tags` (keyword, typeName, variableName, meta, labelName, comment, number, string, punctuation, operator, propertyName).

#### 3. Custom Syntax Highlighters
- **RISC-V Assembly Tokenizer (`riscvStreamParser`)**: Instructions (`#89b4fa`), Registers (`#a6e3a1`), Directives (`#f5c2e7`), Labels (`#fab387`), Numbers (`#f9e2af`), Comments (`#6c7086`), Relocation Macros (`#89dceb`), CSRs (`#cba6f7`).
- **C Language Tokenizer (`cStreamParser`)**: Types (`#f5c2e7`), Keywords (`#89b4fa`), Preprocessor Directives (`#f5c2e7`), Strings/Chars (`#a6e3a1`), Numbers/Hex/Binary (`#f9e2af`), Operators (`#89dceb`), Macros/Properties (`#cba6f7`), Comments (`#6c7086`).

---

### 2.3 Visual Debugging & Breakpoint System

#### 1. Interactive Breakpoint Gutter with Drop-Shadow Glow
- Clickable breakpoint gutter (`.cm-breakpoint-gutter`) and line numbers margin.
- Active breakpoints display a vibrant red circular badge (`●`, `#f38ba8`) with soft drop-shadow glow.
- Synchronized bidirectionally with the simulator's internal `breakpoints` Set and the `F9` toggle shortcut.

#### 2. Highlighted Breakpoint Line Numbers
- When a breakpoint is set on a line, **the line number alone in the line numbers gutter is highlighted** with bold red text (`#f38ba8`), a soft red rounded background pill, and a text glow alongside the breakpoint dot marker (`●`).
- The code line itself remains un-tinted while editing/waiting so that there is no visual ambiguity, leaving full line highlighting exclusively for the active execution line when execution reaches or stops at that point.

#### 3. Smart Breakpoint Snapping to Next Valid Instruction
- If a user clicks or sets a breakpoint on a line that does not contain an executable instruction (e.g. comments, directives, blank lines, closing braces `}`, or bare function signatures):
  - The simulator automatically resolves the line and **moves the breakpoint to the next valid executable instruction/statement line**.
  - The console status log provides clear feedback: `Breakpoint set at line X (moved from line Y to next valid instruction).`

#### 4. Unambiguous Execution Line Tracking (`cm-execLine`)
- When execution actually reaches a breakpoint (or during `Step (F8)`, `Back (Shift+F8)`, `Run (F5)`), the active instruction line is prominently highlighted with a blue background (`rgba(137, 180, 250, 0.18)`) and a 3px blue left accent border (`#89b4fa`), and automatically scrolls smoothly into view (`CM6.EditorView.scrollIntoView`).

---

### 2.4 Advanced Editing, IntelliSense & Guidance Features

#### 1. Context-Aware IntelliSense Autocomplete (`riscvAutocomplete`)
- **Mnemonic Position**: At the start of a statement, completions offer matching RV32I/M/A/F/D/C instructions, pseudo-instructions, and directives with full syntax formats and descriptions.
- **Operand Position & Active Instruction Locking**: Once a mnemonic is established on the line (e.g. after typing `addi ` or `sw `), completions filter to Registers (`x0`–`x31`), Labels, and Equates, and show active instruction operand parameter highlights (e.g. `PARAM 1: rd`, `PARAM 2: rs1`, `PARAM 3: imm`).
- **C Autocomplete**: Suggests standard C types (`int`, `uint32_t`, `size_t`, `void`), keywords (`return`, `if`, `while`, `for`, `struct`, `volatile`), preprocessor directives (`#include`, `#define`), and FPGA MMIO macros (`LEDS`, `SWITCHES`, `BUTTONS`, `SEVSEG`, `UART_TX`, `ACCEL_DATA`, `OLED_COL`, `OLED_ROW`, `OLED_DATA`, `OLED_CTRL`).

#### 2. Live Signature Helper Floating Tooltip (`signatureHelpField`)
- While the cursor is in the operand section of any instruction (e.g. `addi |` or `sw x1, 4(|)`), a floating tooltip appears above the cursor displaying the instruction's signature with the **active parameter dynamically highlighted** in bold peach/cyan with an underline.

#### 3. Interactive Hover Tooltips (`riscvHoverTooltip`)
- Hovering the mouse over any instruction mnemonic, register name, directive, or declared label displays a styled documentation card with its syntax format, description, and encoding/line metadata.

#### 4. Precision Tab & Indentation Engine
- **In-line Tab Insertion**: When the cursor is collapsed, pressing `Tab` inserts a literal `\t` at the cursor position without shifting or auto-indenting the whole line.
- **Block Indentation**: When a block of text is selected, `Tab` indents the entire selection (`indentMore`), and `Shift+Tab` unindents (`indentLess`).

#### 5. Floating Find & Replace Panel (`Ctrl+F` / `Ctrl+H`)
- Real-time search match counter (`findCount`), next/previous navigation (`Enter` / `Shift+Enter`), case-sensitivity toggle (`Alt+C`), single replacement, and replace-all with full undo history tracking.

#### 6. Backward-Compatible Editor Facade
- Provides a drop-in proxy object `window.editor` exposing `.value`, `.selectionStart`, `.selectionEnd`, `.scrollTop`, `.scrollLeft`, `.focus()`, `.setSelectionRange()`, `.addEventListener()`, and `.removeEventListener()`.

---

### 2.5 Multi-Row Responsive Toolbar & Button State Lifecycle

```
+-----------------------------------------------------------------------------------------------------------------+
| Row 1: [ ASM | C ]  Example: [ Basic Sum (C) ▼ ]  📂 Open  💾 Save   |   ↶ Undo  ↷ Redo  🔍 Find                 |
| Row 2: ⚙ Assemble   ▶ Run   ⏭ Step   ⏮ Back   ⟲ Reset   |   💾 Dump txt  💾 Dump data  ⚙ Settings…  Cycles: 0 | Instr: 0 |
| Row 3: Status: Ready                                                                                            |
+-----------------------------------------------------------------------------------------------------------------+
```

#### 1. Structured Toolbar Layout
- **Row 1 (Source & Editing)**: Language Toggle (`[ ASM | C ]`), Example selector, File operations (`📂 Open`, `💾 Save`), and Editor controls (`↶ Undo`, `↷ Redo`, `🔍 Find`).
- **Row 2 (Simulation & Controls)**: Execution controls (`⚙ Assemble`, `▶ Run` / `⏸ Pause` / `▶ Resume`, `⏭ Step`, `⏮ Back`, `⟲ Reset`), Memory dump exports (`💾 Dump txt`, `💾 Dump data`), Settings (`⚙ Settings…`), and Live Metrics (`Cycles: X | Instr: Y`).
- **Row 3 (Status Message Bar)**: Dedicated full-width status line providing real-time feedback with distinct color-coded alert levels (`info`, `success`, `warning`, `error`).
- **Mobile Responsive 4-Row Design**: Automatically reorganizes into 4 dedicated rows on mobile screens with touch-friendly `32px` heights and wrapped layout. Relocated memory dump buttons keep execution controls uncluttered.

#### 2. Intelligent UX Button State Lifecycle
All toolbar action buttons dynamically track runtime and editor state:
- **Assemble (`#btnAssemble`)**: Active when code is newly loaded or modified; inactive (`disabled`, tooltip: `"Program is already assembled and up to date"`) once assembled.
- **Undo (`#btnUndo`) & Redo (`#btnRedo`)**: Track CodeMirror 6's native transaction history depth via `CM6.undoDepth` and `CM6.redoDepth`.
- **Run / Pause / Resume (`#runPauseBtn`)**: Inactive when unassembled; shows `▶ Run` when ready; morphs into `⏸ Pause` while running; shows `▶ Resume` when paused mid-execution.
- **Step Forward (`#btnStep`) & Step Back (`#btnBack`)**: Step forward is active when assembled and paused; Step back is active whenever instruction execution history exists (`execHistory.length > 0`).
- **Reset (`#btnReset`)**: Active during execution; resets registers/peripherals while maintaining assembled status so the user can immediately step or run without re-assembling.

---

## 3. C Language Support & Godbolt Compiler Integration

### 3.1 REST API Compilation Pipeline
- Compiles C code via `POST https://godbolt.org/api/compiler/<id>/compile` targeting RV32 GCC / Clang (`rv32-cgcc1420`, `rv32-cgcctrunk`, `rv32-cclang2010`, `rv32-cclang`).
- Passes configurable optimization levels (`-O0 (Debug, Recommended)`, `-O1`, `-O2`, `-Os`, `-O3`) and ABI flags (`-march=rv32im -mabi=ilp32 -fno-pic -fno-pie`).
- Automatically prepends a dynamic baremetal CRT0 startup shim that sets the stack pointer `sp` to the configured Stack Top (`dataBase + dataSize`):
  ```assembly
  .text
  .globl _start
  _start:
      li sp, 0x20200       # Set sp to Data Base + Data Size
      call main            # Call C main()
      li a7, 10            # Exit syscall
      ecall
  __halt:
      j __halt
  ```

### 3.2 Source-to-Assembly Bidirectional Line Mapping
- Parses Godbolt's emitted assembly array (`res.asm[i].source.line`) and establishes bidirectional mappings:
  - `pcToCLineMap`: Maps execution address $PC \rightarrow \text{C Line}$
  - `cLineToPcsMap`: Maps $\text{C Line} \rightarrow [PC_1, PC_2, \dots]$
  - `cLineToFirstPcMap`: Maps $\text{C Line} \rightarrow \text{First } PC$
- Maps startup preamble (`_start` to `call main`) to the `main()` function entry line.

### 3.3 C Source-Level Stepping & Debugging
- **Single Stepping (`F8` / `⏭ Step`)**: Highlights the active C source statement in CodeMirror 6 while advancing the underlying RV32 machine code.
- **Step Back (`Shift+F8` / `⏮ Back`)**: Restores CPU registers, memory, and active C line highlighting.
- **Breakpoints in C**: Click on C source lines to toggle breakpoints with smart line snapping; `▶ Run` (`F5`) halts on active C lines.
- **Offline Precompiled C Cache**: All 8 pre-loaded C examples include precompiled Godbolt assembly JSON mappings embedded directly in `riscv_simulator.html`, ensuring instantaneous offline simulation without network access.

---

## 4. Execution Engine & Disassembly Architecture

### 4.1 Execution Control & Timing Model
- **Non-Blocking Simulation Loop**: Uses `requestAnimationFrame` with chunked batch execution to maintain a responsive 60 FPS UI while executing high-throughput simulations.
- **Configurable Batch Limit (`maxInstructionsPerCycle`)**: Configurable via the Simulator tab in Settings (default `100,000` instructions per cycle, range $1$ to $10,000,000$), allowing users to balance raw throughput against UI refresh frequency for computationally heavy loops.
- **Statement Stepping (Fast Mode)**:
  - When enabled via `⚙ Settings…` $\rightarrow$ **Simulator** (`simStatementStep`), stepping forward (`F8`) executes all machine instructions belonging to the current C statement or multi-instruction pseudo-op in a single discrete step.
  - Step back (`Shift+F8`) cleanly undoes the multi-instruction statement step in one operation.
- **Cycle-Accurate CPI Timing**: Instruction execution accrues cycles according to categorized CPI settings (ALU/Basic, Multiply/Divide, Load, Store, Branch, Jump, Floating Point, System/Syscall).

### 4.2 Disassembly Viewer with Label Headers & Annotations
- **Label Header Rows (`.disasm-label-row`)**: Disassembly renders distinct label headers (e.g. `main:`, `loop:`, `factorial:`) preceding the target instruction address in both Assembly and C modes.
- **Jump / Branch Target Annotations (`.disasm-target-label`)**: Numeric and hexadecimal jump/branch offsets (e.g. `jal 0x10040`) are automatically annotated with human-readable target label badges (e.g. `<main>`, `<loop>`).
- **C Source Line Tags (`.disasm-cline-tag`)**: Instructions compiled from C display source line number and statement text (e.g. `[Line 10: total += arr[i];]`).
- **Disassembly Auto-Scrolling**: The active execution instruction row (`.current-native`) automatically scrolls into view during stepping, step back, and breakpoint halts.

---

## 5. Unified Settings & Linker Architecture

The simulator consolidates Compiler options, Memory layout / Linker settings, and Simulator timing into a single **`⚙ Settings…`** button opening a 3-tab modal dialog:

```
+---------------------------------------------------------------------------------------------------+
| ⚙ Settings & Configuration                                                                     [×] |
+---------------------------------------------------------------------------------------------------+
| [ ⚡ Compiler ]  [ 🗺 Linker ]  [ ⏱ Simulator ]                                                   |
+---------------------------------------------------------------------------------------------------+
| ⚡ Compiler Tab:                                                                                  |
|    - RISC-V 32-bit Compiler: [ Clang 20.1.0 (Stable, Default) | Clang Trunk | GCC 14.2.0 | GCC Trunk ]|
|    - Optimization Level:     [ -O0 (Debug) | -O1 | -O2 | -Os | -O3 ]                              |
|    - Architecture & ABI:     [ -march=rv32im -mabi=ilp32 ]                                        |
+---------------------------------------------------------------------------------------------------+
| 🗺 Linker Tab:                                                                                    |
|    ⚠️ FPGA Hardware Notice: On target FPGA boards (e.g. Basys 3 / Nexys 4), physical RAM size is   |
|       fixed in hardware. Exceeding configured sizes or elevating stack outside physical RAM will   |
|       cause execution failure or memory wrap-around on real FPGA hardware!                        |
|    - Code (.text) base: [ 0x10000 ]   Code (.text) size: [ 0x200 ]                                |
|    - Data (.data) base: [ 0x20000 ]   Data (.data) size: [ 0x200 ]                                |
|    - Stack top (sp):    [ 0x20200 ]   (Default: Data Base + Data Size; user customizable)         |
|    - MMIO base:         [ 0xFFFF0000 ]                                                            |
+---------------------------------------------------------------------------------------------------+
| ⏱ Simulator Tab:                                                                                  |
|    [☑] Statement Stepping (Fast Mode) — executes all instructions for a statement in 1 step       |
|    Max Instructions (Batch Chunk): [ 100000 ]                                             |
|    Cycles Per Instruction (CPI): Basic ALU: 1 | Mul/Div: 2 | Load: 2 | Store: 2 | Branch/Jump: 1   |
+---------------------------------------------------------------------------------------------------+
| [ Reset Defaults ]                                                               [ Apply & Close ] |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Memory Model & Segment Mapping

### 6.1 Tabbed Memory View & Protection Model
- **Tabbed Navigation**: `[ Code | Data | Stack | MMIO ]`.
- **Read-Only Code Protection**: The **Code (.text)** segment in the Memory View is strictly read-only to prevent accidental program corruption during inspection, while **Data**, **Stack**, and **MMIO** regions retain full interactive byte- and word-level editing.
- **Downward Decreasing Stack View**: The **Stack** tab renders addresses in **downward decreasing order** (`0x20200`, `0x201F8`, `0x201F0`...) to accurately visualize the downward growth of the RISC-V stack.
- **Hardware Boundary Checks & Warnings**:
  - **Code Segment Overflow**: Emits a warning if assembled instructions exceed configured `codeSize` (default `0x200` / 512 B / 128 instructions).
  - **Data Segment Overflow**: Emits a warning and safely adjusts the startup stack pointer if data allocations exceed configured `dataSize` (default `0x200` / 512 B).
  - Alerts users of potential memory wrap-around on fixed-size physical FPGA block RAM (IROM/DMEM).
- **Verilog Memory Dumps**:
  - Code segment $\rightarrow$ **`AA_IROM.mem`** (`💾 Dump txt`).
  - Data segment $\rightarrow$ **`AA_DMEM.mem`** (`💾 Dump data`).
  - Formatted with `// @<HEX_ADDR>` address comments for FPGA testbench synthesis compatibility.

### 6.2 Complete MMIO Address Map
| MMIO Address | Size | Access | Symbol | Description & Behavioral Rules | Row Annotation in Memory View |
|--------------|------|--------|--------|--------------------------------|-------------------------------|
| `0xFFFF0000` | 4 B  | Read   | `UART_RX_VALID` | Bit 0 = 1 if data is available in `UART_RX` queue. | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0004` | 4 B  | Read   | `UART_RX` | Reading returns and pops next 8-bit character from queue. | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0008` | 4 B  | Read   | `UART_TX_READY` | Bit 0 = 1 when `UART_TX` is ready (always `1`). | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF000C` | 4 B  | Write  | `UART_TX` | Transmits 8-bit character to UART terminal. | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF0020` | 4 B  | Write  | `OLED_COL` | Pixel column index ($0..95$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0024` | 4 B  | Write  | `OLED_ROW` | Pixel row index ($0..63$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0028` | 4 B  | Write  | `OLED_DATA` | Writing color word sets pixel & triggers advance. | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF002C` | 4 B  | Write  | `OLED_CTRL` | Control mode (bits `[3:0]` advance mode, bits `[7:4]` format). | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF0040` | 4 B  | Read   | `ACCEL_DATA` | Packed 32-bit `[31:24] Temp, [23:16] X, [15:8] Y, [7:0] Z`. | `[ACCEL DATA RO 0xFFFF0040 · ACCEL DREADY RO 0xFFFF0044]` |
| `0xFFFF0044` | 4 B  | Read   | `ACCEL_DREADY` | Bit 0 = 1 when new reading is available. | `[ACCEL DATA RO 0xFFFF0040 · ACCEL DREADY RO 0xFFFF0044]` |
| `0xFFFF0060` | 4 B  | Write  | `PERIPH_LED` | User Output LEDs (bits `[15:0]`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0064` | 4 B  | Read   | `PERIPH_DIP` | 16-bit DIP Switch inputs (`SW15`..`SW0`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0068` | 4 B  | Read   | `PERIPH_PB` | Push Buttons (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR). | `[PB RO 0xFFFF0068]` |
| `0xFFFF0080` | 4 B  | Write  | `PERIPH_SEVENSEG` | 32-bit value displayed as 8 hex digits on 7-Segment. | `[7SEG WO 0xFFFF0080]` |
| `0xFFFF00A0` | 4 B  | Read   | `CYCLECOUNT` | Total instruction cycles elapsed since reset (`totalCycles`). | `[CYCLECOUNT RO 0xFFFF00A0]` |

---

## 7. Peripherals & FPGA Board Simulation

```
+---------------------------------------------------------------------------------------------------+
|                                 COMPACT NEXYS 4 FPGA PERIPHERAL BOARD                             |
|                                                                                                   |
|  UART Serial Console (115200 8N1) 0xFFFF0000–0xFFFF000C        RX_VALID: 0  ·  TX_READY: 1         |
|  [Terminal Output Box]                                                                            |
|  Line 1: [ Mode: ASCII/Hex ] [ Text Box ] [ Send ] [ Clear ]                                      |
|  Line 2: [☑ Buffer] [ 10 ▲▼ ] instr delay  ·  RX Queue: 0 bytes (empty)                            |
|                                                                                                   |
|  OLED 96x64 Pixel Display (0xFFFF0020–0xFFFF002C)              [ Clear Display ]                  |
|  [ 288x192 3x Canvas ]             OLED_COL: 0 (0-95)  ·  OLED_ROW: 0 (0-63)  ·  OLED_CTRL: 0x00  |
|                                    Advance Mode: 0..5  ·  Color Format: 8-bit / 16-bit / 24-bit    |
|                                                                                                   |
|  3-Axis Accelerometer & Temp (0xFFFF0040–0xFFFF0044)           DREADY: 1  ·  Cycles: 1234          |
|  X Axis: [----|----] 0 (0x00, +0.00g)   Y Axis: [----|----] 0 (0x00, +0.00g)                      |
|  Z Axis: [----|--O-] 64 (0x40, +1.00g)   Temp:   [---|-----] 25°C (0x19)                           |
|  Presets: [Flat (Z=+1g)] [Tilt X (±1g)] [Tilt Y (±1g)] [Shake (±2g)] [Zero All]                   |
|                                                                                                   |
|  [P8][P7][P6][P5][P4][P3][P2]   [CLK]   [L7][L6][L5][L4][L3][L2][L1][L0]   (16 LEDs)              |
|  LED15------------------LED9    LED8    LED7----------------------LED0                            |
|                                                                                                   |
|  [SW15]--------------[SW9]     [SW8]    [SW7]--------------------[SW0]   (16 Dual-Rect 22px DIPs)  |
|                                                                                                   |
|  Push Buttons: [L] [C] [R] (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR)  7-Segment: [0 0 0 0 0 0 0 0]   |
+---------------------------------------------------------------------------------------------------+
```

### 7.1 96x64 Pixel OLED Display Peripheral (`0xFFFF0020`–`0xFFFF002C`)
- **Resolution**: 96 Columns $\times$ 64 Rows ($288\text{px} \times 192\text{px}$ canvas at 3x scale).
- **Color Formats (`OLED_CTRL[7:4]`)**:
  - `0x0`: 8-bit Color (3-Red, 3-Green, 2-Blue)
  - `0x1`: 16-bit Color (5-Red, 6-Green, 5-Blue / RGB565)
  - `0x2`: 24-bit RGB Color (8-Red, 8-Green, 8-Blue)
- **Advance Modes (`OLED_CTRL[3:0]`)**:
  - `0x0` (`vary_pixel_data_mode`): Writing `OLED_DATA` updates the current pixel without modifying coordinates.
  - `0x1` (`vary_col_mode`): Writing `OLED_DATA` updates pixel and increments column index (`col = (col + 1) % 96`).
  - `0x2` (`vary_row_mode`): Writing `OLED_DATA` updates pixel and increments row index (`row = (row + 1) % 64`).
  - `0x4` (`autoadvance_col`): Column auto-advances across line; wraps to next row when reaching column 95.
  - `0x5` (`autoadvance_row`): Row auto-advances down column; wraps to next column when reaching row 63. Perfect for column-major framebuffer streams.

### 7.2 3-Axis Accelerometer & Temperature Sensor (`0xFFFF0040`–`0xFFFF0044`)
- **`0xFFFF0040` (RO)**: `ACCEL_DATA` — 32-bit packed `{temperature, X, Y, Z}` from **MSB to LSB**:
  - `[31:24]`: **Temperature** (8-bit signed integer, $-40..+85^\circ\text{C}$, default `25` / `0x19`, offset `+3`).
  - `[23:16]`: **X Acceleration** (8-bit signed integer, $\pm 2g$, default `0` / `0x00` = $0.00g$, offset `+2`).
  - `[15:8]`: **Y Acceleration** (8-bit signed integer, $\pm 2g$, default `0` / `0x00` = $0.00g$, offset `+1`).
  - `[7:0]`: **Z Acceleration** (8-bit signed integer, $\pm 2g$, default `+64` / `0x40` = $+1.00g$, offset `+0`).
- **`0xFFFF0044` (RO)**: `ACCEL_DREADY` — Bit 0 = 1 when data is ready.
- **Interactive Controls & Presets**: Range sliders for X, Y, Z ($\pm 128$), temperature slider, live $g$-force calculation, and presets (`Flat`, `Tilt X ±1g`, `Tilt Y ±1g`, `Shake ±2g`, `Zero All`).

### 7.3 UART Serial Console (`0xFFFF0000`–`0xFFFF000C`)
- Memory-mapped serial terminal with independent output buffer, auto-sequencer delay, hex/ASCII transmission modes, and responsive flex wrapping.

---

## 8. Pre-Loaded Example Programs Catalog

The simulator comes pre-loaded with **19 rich example programs** (11 in Assembly and 8 in C):

### 8.1 C Mode Example Programs (8 Examples)
1. **`basic_c` (Basic Sum)**: Computes sum = $a + b + c$ with local variables and function calls.
2. **`factorial_c` (Factorial)**: Recursive factorial computation demonstrating stack frames and base cases.
3. **`fibonacci_c` (Fibonacci)**: Iterative Fibonacci series generator storing values in an array.
4. **`loop_c` (Array Search)**: Searches for an element in an integer array and accumulates totals.
5. **`matrix_c` (Matrix Multiply)**: $2 \times 2$ integer matrix multiplication with nested loops.
6. **`peripherals_c` (MMIO Peripherals)**: Reads DIP switches and buttons, writes to LEDs, 7-Segment display, and outputs greeting string over UART.
7. **`circle_accel_c` (Circle & Delay Accel - `Circle_delay_accel.c`)**: Implements the Midpoint Circle Algorithm on the OLED display, polls accelerometer X/Y tilt, animates circle positions, outputs frame counts to the 7-Segment display, and sends UART telemetry.
8. **`image_display_c` (Image Display & Accel - `ImageDisplay_autoadvance_accel.c`)**: High-performance OLED graphics rendering using Auto-Advance Mode 5 (`autoadvance_row`), displaying 96x64 8-bit color bitmap artwork (`Uphill.png` / `Downhill.png`), responding dynamically to X-axis accelerometer tilt, and logging status messages to the UART terminal.

### 8.2 Assembly Mode Example Programs (11 Examples)
1. **`basic` (`basic.asm`)**: Basic sum = $a + b + c$ utilizing integer registers and syscalls.
2. **`rars_syscalls` (`rars_syscalls.asm`)**: Comprehensive demonstration of RARS `ecall` services (print string, integer, hex, char, exit).
3. **`fib` (`fibonacci.asm`)**: Computes Fibonacci numbers in registers `x1`–`x5`.
4. **`fact` (`factorial.asm`)**: Calculates $5! = 120$ using recursion and stack management.
5. **`loop` (`loop_array.asm`)**: Array initialization and element accumulation loop.
6. **`io` (`io_mext.asm`)**: I/O operations combined with RV32M multiply instructions (`mul`, `div`).
7. **`dip_led` (`DIP_to_LED.asm`)**: Direct hardware loop copying 16-bit DIP switch states directly to output LEDs.
8. **`hello_world` (`HelloWorld.asm`)**: Direct character-by-character UART transmission of "Hello World".
9. **`hello_jal` (`HelloWorld_jal_jalr.asm`)**: Modular UART printing subroutine utilizing `jal` and `jalr`.
10. **`circle_accel` (`Circle_delay_accel.asm`)**: Complete assembly implementation of OLED circle rendering and accelerometer integration.
11. **`image_display_accel` (`ImageDisplay_autoadvance_accel.asm`)**: Assembly implementation of 96x64 image display using auto-advance mode 5 and accelerometer tilt detection.

---

## 9. Processor Execution State, ISA Reference & RARS Syscalls

### 9.1 Register Bank Structure
Models 32 32-bit integer registers (`x0`–`x31`), 32 floating-point registers (`f0`–`f31`), and the Program Counter (`PC`). Register `x0` is hardwired to `0x00000000`.
- **Hardware-Accurate Stack Pointer**: `sp` (register `x2`) is initialized to `0x00000000` on reset as per RISC-V hardware specification.

```
+-----+------+-------------------+-------------------+
|  #  | Name |    Value (Hex)    |    Value (Dec)    |
+-----+------+-------------------+-------------------+
| x0  | zero | 0x00000000        | 0                 |
| x1  | ra   | 0x00010040        | 65600             |
| x2  | sp   | 0x00000000        | 0                 |
| ... | ...  | ...               | ...               |
+-----+------+-------------------+-------------------+
```

### 9.2 Complete Supported Instruction Set (RV32GC)
- **RV32I Base**: `add`, `sub`, `and`, `or`, `xor`, `sll`, `srl`, `sra`, `slt`, `sltu`, `addi`, `andi`, `ori`, `xori`, `slli`, `srli`, `srai`, `slti`, `sltiu`, `lui`, `auipc`, `lw`, `lh`, `lhu`, `lb`, `lbu`, `sw`, `sh`, `sb`, `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`, `jal`, `jalr`, `fence`, `ecall`, `ebreak`.
- **RV32M Extension**: `mul`, `mulh`, `mulhsu`, `mulhu`, `div`, `divu`, `rem`, `remu`.
- **RV32A Extension**: `lr.w`, `sc.w`, `amoswap.w`, `amoadd.w`, `amoxor.w`, `amoand.w`, `amoor.w`, `amomin.w`, `amomax.w`, `amomin.u`, `amomax.u`.
- **RV32F / RV32D Extension**: `flw`, `fsw`, `fadd.s`, `fsub.s`, `fmul.s`, `fdiv.s`, `fsqrt.s`, `feq.s`, `flt.s`, `fle.s`, `fcvt.w.s`, `fcvt.s.w`, `fld`, `fsd`, `fadd.d`, `fsub.d`, `fmul.d`, `fdiv.d`.
- **RV32C Extension**: `c.addi`, `c.li`, `c.lui`, `c.mv`, `c.add`, `c.sub`, `c.and`, `c.or`, `c.xor`, `c.lw`, `c.sw`, `c.j`, `c.jr`, `c.jalr`, `c.beqz`, `c.bnez`, `c.slli`, `c.srli`, `c.srai`, `c.andi`, `c.nop`, `c.ebreak`.
- **Pseudo-Instructions**: `li`, `la`, `mv`, `not`, `neg`, `j`, `jr`, `ret`, `call`, `tail`, `nop`, `beqz`, `bnez`, `blez`, `bgez`, `bltz`, `bgtz`, `bgt`, `ble`, `seqz`, `snez`, `sltz`, `sgtz`.

### 9.3 Standard RARS `ecall` Syscall Services

| Syscall Code (`a7`) | Name | Inputs | Outputs / Effects | Destination |
|---------------------|------|--------|-------------------|-------------|
| `1` | `PrintInt` | `a0` = integer to print | Prints decimal integer | Status Log Console |
| `2` | `PrintFloat` | `fa0` = single-precision float | Prints float value | Status Log Console |
| `3` | `PrintDouble` | `fa0` = double-precision float | Prints double value | Status Log Console |
| `4` | `PrintString` | `a0` = address of null-terminated string | Prints null-terminated string | Status Log Console |
| `5` | `ReadInt` | None | `a0` = integer entered by user | User Input Prompt |
| `6` | `ReadFloat` | None | `fa0` = float entered by user | User Input Prompt |
| `7` | `ReadDouble` | None | `fa0` = double entered by user | User Input Prompt |
| `8` | `ReadString` | `a0` = destination buffer, `a1` = max length | Reads string into memory at `a0` | User Input Prompt |
| `9` | `Sbrk` | `a0` = number of bytes to allocate | `a0` = address of allocated block | Dynamic Heap |
| `10` | `Exit` | None | Halts execution cleanly | Execution Engine |
| `11` | `PrintChar` | `a0` = ASCII character code | Prints character | Status Log Console |
| `12` | `ReadChar` | None | `a0` = ASCII character code | User Input Prompt |
| `34` | `PrintIntHex` | `a0` = integer | Prints `0x...` hexadecimal string | Status Log Console |
| `35` | `PrintIntBinary` | `a0` = integer | Prints `0b...` binary string | Status Log Console |
| `36` | `PrintIntUnsigned` | `a0` = unsigned integer | Prints unsigned decimal value | Status Log Console |
| `40` | `MilliSleep` | `a0` = milliseconds to delay | Pauses execution delay | Simulator Timer |
| `93` | `Exit2` | `a0` = exit return code | Halts execution with return code | Execution Engine |

---

## 10. Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
|----------|--------|-------|
| `F5` | Toggle Run / Pause / Resume | Global / Editor |
| `F8` | Single Step Forward | Global / Editor |
| `Shift+F8` | Step Back (Undo Instruction) | Global / Editor |
| `F9` | Toggle Breakpoint at Cursor Line (Auto-snapping to valid instruction) | Global / Editor |
| `Ctrl+Enter` / `Cmd+Enter` | Assemble / Compile Source Program | Global / Editor |
| `Ctrl+S` / `Cmd+S` | Save Source File (`.asm` / `.c`) | Global / Editor |
| `Ctrl+Space` | Manually Trigger Autocomplete & IntelliSense | Editor |
| `Ctrl+F` / `Cmd+F` | Open Find & Replace (Focus Find) | Editor |
| `Ctrl+H` / `Cmd+H` | Open Find & Replace (Focus Replace) | Editor |
| `Esc` | Close Find & Replace Panel / Dismiss Autocomplete / Close Settings Modal | Global / Editor |
| `Enter` / `Shift+Enter` | Next / Previous Search Match | Find Box |
| `Alt+C` | Toggle Case-Sensitive Search | Find Box |
| `Tab` | Insert `\t` (Cursor) / Indent Selection (Block) / Accept Completion | Editor |
| `Shift+Tab` | Unindent / Dedent Selected Lines | Editor |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo (CM6 Native Transaction History) | Editor |

---

## 11. Automated Test Suite & Verification Framework

The simulator includes an automated test harness located in [`riscv_simulator_tests/`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests):

| Test Script | Target Subsystem & Scenarios Tested |
|-------------|-------------------------------------|
| [`test_comprehensive_suite.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_comprehensive_suite.js) | Full system integration: editor proxy facade, Tab precision, breakpoints, assembler, stepping, history undo, FPGA MMIO registers, and toolbar layout. |
| [`test_c_godbolt_simulation.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_c_godbolt_simulation.js) | Godbolt REST API compilation, bidirectional line mapping, C breakpoints, and C stepping across `basic_c`, `factorial_c`, `fibonacci_c`, `loop_c`, `matrix_c`, `peripherals_c`. |
| [`test_new_c_simulation.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_new_c_simulation.js) | Offline and live simulation verification for newly added C examples (`Circle_delay_accel.c`, `ImageDisplay_autoadvance_accel.c`). |
| [`test_baked_examples_full.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_baked_examples_full.js) | Validates compilation and execution of all 19 built-in examples (11 ASM + 8 C) using offline precompiled mappings. |
| [`test_statement_stepping.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_statement_stepping.js) | Statement Stepping mode verification in both C and ASM modes, confirming multi-instruction execution and discrete step back. |
| [`test_sim_max_instructions_setting.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_sim_max_instructions_setting.js) | Verification of `maxInstructionsPerCycle` batch chunk setting in the Simulator Settings tab and execution loop throttling. |
| [`test_disassembly_labels_and_warnings.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_disassembly_labels_and_warnings.js) | Disassembly label header rendering, jump/branch target label annotations, and FPGA Hardware Notice box in Linker settings. |
| [`test_reset_and_image_display.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_reset_and_image_display.js) | Image Display auto-advance mode 5 rendering fidelity, pixel matching between ASM and C modes, UART output, and peripheral reset behavior. |
| [`test_tab_and_autocomplete.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_tab_and_autocomplete.js) | CodeMirror 6 keyboard event handling, literal Tab insertion at collapsed cursor, block indentation, operand autocomplete filtering, and signature help formatting. |
| [`test_breakpoint_highlight_and_snap.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_breakpoint_highlight_and_snap.js) | Breakpoint snapping from comments, blank lines, and directives to executable instructions, and gutter line number highlight pill verification. |
| [`test_all_instructions_v2.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_all_instructions_v2.js) | RV32GC instruction set translation coverage across 90+ instructions and pseudo-ops. |
| [`test_execution_programs.js`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests/test_execution_programs.js) | Multi-step CPU execution, algorithmic correctness, and register state assertions for Factorial ($5! = 120$) and Fibonacci ($F_9 = 34, F_{10} = 55$). |

---

## 12. Version History & Milestone Changelog

| Version | Milestone Description & Features Implemented |
|---------|----------------------------------------------|
| **v1.0 – v6.0** | Basic RV32GC simulator core, two-pass assembler, non-blocking engine, Nexys 4 FPGA LEDs/DIP switches/buttons/7-segment, UART Serial Console, escape sequence parser, and double-height dual-rectangle 3D DIP switches. |
| **v7.0 – v11.0** | 96x64 Pixel OLED Display MMIO peripheral, 3-Axis Accelerometer & Temperature Sensor `{temp, X, Y, Z}`, System Cycle Counter (`0xFFFF00A0`), RARS `ecall` syscall engine, and mobile viewport enhancements. |
| **v12.0 – v14.0** | Intelligent UX button state lifecycle management, in-editor IntelliSense autocomplete, extended load/store pseudo-instructions, and 60 FPS visual rendering optimization. |
| **v15.0 (CodeMirror 6 Engine Upgrade)** | **Major Architecture Overhaul**: Upgraded editor to **CodeMirror 6** with standalone offline bundle (`window.CM6`). Implemented custom RISC-V stream tokenizer & Catppuccin Mocha theme, **interactive breakpoint gutter with highlighted line numbers alone**, **smart breakpoint snapping to next valid executable instruction**, **live floating parameter signature helper (`signatureHelpField`)**, **interactive hover tooltips (`riscvHoverTooltip`)**, **active instruction format banner in operand autocompletions**, **precision in-line `\t` Tab key insertion**, native transaction undo/redo history, and complete backward compatibility proxy facade. |
| **v16.0 (Typography Contrast & 4-Row Mobile Toolbar)** | Upgraded UI typography stack to modern system UI (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) with enhanced font weights (`500`–`650`) and crisp contrast. Restructured desktop toolbar into 2 clean rows with CPI and Linker segments aligned with Stats on row 2. Restructured mobile toolbar into **4 dedicated rows** with larger touch targets (`32px` height) that never overflow when Run toggles to Resume. |
| **v17.0 (C Compilation via Godbolt, Unified Settings & Advanced Memory View)** | Integrated full C language simulation via **Compiler Explorer (Godbolt) REST API** (RV32 GCC & Clang) with bidirectional line mapping, C source-level stepping, step back, and C breakpoints. Consolidated settings into a unified 3-tab modal (**Compiler**, **Linker**, **Simulator**) with settable segment sizes and user-customizable Stack Top ($\text{Data Base} + \text{Data Size}$). Added Disassembly view auto-scroll on stepping, tabbed Memory navigation (`[ Code | Data | Stack | MMIO ]`) with **downward decreasing address ordering for the Stack tab**, read-only code memory protection, and pre-loaded C examples including `Circle_delay_accel.c`. |
| **v18.0 (Disassembly Labels, Target Annotations, FPGA Hardware Warning & Statement Stepping)** | Added dedicated **Disassembly Label Header Rows** (`.disasm-label-row`) and **Jump/Branch Target Annotations** (`.disasm-target-label`) in both ASM and C modes. Added **FPGA Hardware Memory Notice** box in the Linker settings tab alerting users to real hardware RAM constraints and stack overflow risks. Implemented **Statement Stepping (Fast Mode)** executing all underlying machine instructions for a C statement or multi-instruction pseudo-op in a single step with 1-click step back. Relocated memory dump buttons to the simulation/config toolbar for cleaner layout balance. |
| **v19.0 (OLED Auto-Advance Mode 5, Image Display Examples & Batch Instruction Throttling)** | Implemented **OLED Auto-Advance Mode 5 (`autoadvance_row`)** for high-throughput column-major bitmap image rendering. Added pre-loaded **Image Display & Accel** examples in both C (`ImageDisplay_autoadvance_accel.c`) and Assembly (`ImageDisplay_autoadvance_accel.asm`) rendering 96x64 8-bit color bitmap graphics with dynamic accelerometer tilt responsiveness and UART logging. Added configurable **Max Instructions (Batch Limit)** setting in the Simulator Settings tab (`simMaxInstrPerCycle`, default `100,000`), allowing fine-tuning of execution chunk size for high-speed simulation without browser freezing. Expanded automated test suite with full offline precompiled verification (`test_baked_examples_full.js`, `test_sim_max_instructions_setting.js`). |
