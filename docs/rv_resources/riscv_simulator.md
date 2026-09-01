# NUS-CG3207 RISC-V Simulator (RV32GC)

**Reference manual, architecture guide and changelog.**

| File | What it is |
|---|---|
| [`riscv_simulator.html`](riscv_simulator.html) | The simulator. Single file, no build step, works offline. Runs programs on either of **two execution engines** — the built-in JavaScript functional model, or **your own Verilog processor** compiled and simulated in the browser. |
| [`riscv_simulator_nohdl.html`](riscv_simulator_nohdl.html) | The same simulator without the HDL engine — kept for anyone who wants the smaller, functional-only build. |

**Live:** <https://nus-cg3207.github.io/labs> · Vibe coded by Rajesh Panicker.

A self-contained **RISC-V RV32GC** assembler, C compiler front-end, emulator and
visual debugger built for the NUS **CG3207** computer architecture labs. The editor
engine, ISA tables, peripherals and every example program are embedded in one HTML
file with no external dependencies at runtime. C compilation optionally uses the
Compiler Explorer (Godbolt) REST API, but ships with precompiled offline mappings for
all built-in examples, so nothing needs the network.

---

## At a glance

| Area | Capability |
|------|------------|
| **Two engines** | A `JS \| HDL` toggle in the toolbar chooses what Run, Step and Back actually execute: the built-in RV32GC interpreter, or your uploaded Verilog through **Icarus Verilog compiled to WebAssembly**. Everything else — registers, memory, peripherals, breakpoints — is shared. See [§5](#5-hdl-simulation-mode-your-verilog-in-the-browser). |
| **Editor** | Embedded CodeMirror 6 bundle (`window.CM6`). Toggles between **RV32 Assembly** and **C**, each with its own syntax highlighter, autocomplete, live signature help and hover docs. Catppuccin Mocha dark theme. |
| **Assembler** | Two-pass assembler for RV32I + M + A + F + D + C, plus common pseudo-instructions. Emits disassembly with label header rows, jump/branch target annotations and C source-line tags. |
| **C support** | Compiles via Godbolt (RV32 GCC / Clang, selectable `-O` level and ABI). Prepends a baremetal CRT0 shim that sets `sp`. Builds bidirectional PC↔C-line maps for source-level stepping and breakpoints. Clang 20.1.0 is the default compiler. |
| **Execution** | Non-blocking `requestAnimationFrame` loop, fixed `BATCH_SIZE = 10,000` instr/tick. Configurable run limit (default 100,000,000) auto-pauses infinite loops. Cycle-accurate CPI timing by instruction category. |
| **Debugging** | Run / Pause / Resume, Step, Step Back (full register + memory history), optional **Statement Stepping** (one C statement or multi-instruction pseudo-op per step) — in **both** engines. Breakpoint gutter with smart snapping to the next valid instruction; highlighted breakpoint line numbers; active execution line tracking with auto-scroll. |
| **Memory view** | Tabbed `[ Code \| Data \| Stack \| MMIO ]`. Code segment read-only; Data/Stack/MMIO editable. Stack shown in downward-decreasing address order. Little-endian word display. Segment overflow warnings. Verilog `.mem` dumps (`AA_IROM.mem`, `AA_DMEM.mem`). |
| **Panel layout** | Registers / Memory / Peripherals / Disassembly are independent panels, not exclusive tabs: show any combination; ≤2 docked panels stack vertically, >2 form a **2×2 grid** with draggable row/column splitters; detach any panel into a floating window. Layout persists to `localStorage`. The three data panels share one header design with always-visible draggable column separators and frozen header rows. The Peripherals panel is deliberately untouched. |
| **Console** | One console under the editor carries the assembler, the runtime and the Verilog compiler (tagged `[HDL]`). **Resizable** — drag the bar above it, double-click to reset; the height is remembered. |
| **Settings** | One `⚙ Settings…` modal, 4 tabs: **Compiler**, **Linker**, **JS Simulation**, **HDL Simulation**. See [§6](#6-settings). |

### Memory layout (SPIM-style defaults)

| Segment | Base | Size |
|---------|------|------|
| `.text` (code) | `0x00400000` | `0x200` (512 B / 128 instr) |
| `.data` | `0x10010000` | `0x200` |
| Stack top (`sp`) | `0x10010200` | (Data base + Data size; customizable) |
| MMIO base | `0xFFFF0000` | — |

### MMIO map (Nexys 4 board simulation)

| Address | Access | Symbol | Purpose |
|---------|--------|--------|---------|
| `0xFFFF0000` / `0xFFFF0004` | RO | `UART_RX_VALID` / `UART_RX` | Serial receive status + data (pop on read) |
| `0xFFFF0008` / `0xFFFF000C` | RO / WO | `UART_TX_READY` / `UART_TX` | Serial transmit status + data |
| `0xFFFF0020`–`0xFFFF002C` | WO | `OLED_COL/ROW/DATA/CTRL` | 96×64 pixel OLED; `CTRL[3:0]` advance mode, `CTRL[7:4]` colour format (8/16/24-bit) |
| `0xFFFF0040` / `0xFFFF0044` | RO | `ACCEL_DATA` / `ACCEL_DREADY` | Packed `[31:24]=Temp, [23:16]=X, [15:8]=Y, [7:0]=Z`, all 8-bit signed |
| `0xFFFF0060` / `0xFFFF0064` | WO / RO | `PERIPH_LED` / `PERIPH_DIP` | 16 output LEDs / 16 DIP switches |
| `0xFFFF0068` | RO | `PERIPH_PB` | Push buttons (bit 2 = BTNL, 1 = BTNC, 0 = BTNR) |
| `0xFFFF0080` | WO | `PERIPH_SEVENSEG` | 32-bit value → 8 hex digits on 7-segment |
| `0xFFFF00A0` | RO | `CYCLECOUNT` | Cycles since reset — a CPI estimate in JS mode, real clock edges in HDL mode |

The full behavioural map is in [§7.2](#72-complete-mmio-address-map).

---

## 1. Project overview

**NUS-CG3207 RISC-V Simulator** is a single-file web application delivering a complete
**RISC-V RV32GC (RV32I + M + A + F + D + C) assembler, C compiler, emulator and visual
debugger**, powered by **CodeMirror 6** and the **Compiler Explorer (Godbolt) REST API** —
plus an optional second execution engine that runs *your own Verilog processor* through
**Icarus Verilog compiled to WebAssembly**.

Designed for computer engineering students, hardware architects and embedded systems
developers, it combines a modern editor supporting both **RISC-V Assembly** and **C**,
custom syntax highlighting, live parameter signature help, hover inspection, a
breakpoint gutter with highlighted line numbers and smart snapping, a two-pass
assembler, a non-blocking execution engine, a real-time disassembly viewer with label
headers and jump/branch target annotations, a step-by-step debugger with back-stepping
history and statement stepping, an interactive memory explorer with custom segment
mapping and read-only code protection, downward-growing stack visualisation,
configurable instruction cycle timing, a hardware-accurate simulation of the
**Digilent Nexys 4 FPGA board**, a 16550 **UART serial console**, a **96×64 pixel OLED
display**, a **3-axis accelerometer & temperature sensor**, a **system cycle counter**,
**RARS `ecall` syscalls**, and 19 pre-loaded assembly and C example programs.

The distinguishing feature is that the same program, the same breakpoints and the same
peripheral panels drive **either** a functional model **or** real RTL — so a student can
run a program to see what it *should* do, then run it again on the processor they wrote.


---

## 2. Architecture & design system

### 2.1 Technology stack & core philosophy
- **Offline-First with CDN-Optimized CodeMirror 6**: Pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+) with CodeMirror 6 loaded from **jsDelivr CDN** as native ESM modules (assembled into a single `window.CM6` namespace by a tiny bootstrap loader) with an automatic **local fallback** (`riscv_simulator_tests/cm6_bundle.min.js`) when the CDN is unreachable — so the simulator still boots 100% offline. Supports offline execution with built-in precompiled C mappings and online C compilation via the Godbolt REST API.
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


### 2.2 Dual-language architecture & the CodeMirror 6 engine

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

#### 2. CodeMirror 6 Loading (`window.CM6`)
The editor engine is bootstrapped by a tiny loader script that fetches a **single self-contained CodeMirror 6 bundle** (`riscv_simulator_tests/cm6_bundle.min.js`, one copy of every `@codemirror/*` / `@lezer/*` package) from **jsDelivr** (served from this repo's GitHub raw file), with a **local IIFE fallback** (`riscv_simulator_tests/cm6_bundle.min.js`) loaded automatically if the CDN is unreachable (offline / CSP-blocked). Loading the individual `@codemirror/*` ESM packages separately (as was done originally) does **not** work — each jsDelivr `+esm` bundle inlines its own `@lezer/common` internals, so `StreamLanguage`/`HighlightStyle` extensions built against one instance fail `EditorState` validation ("Unrecognized extension value") and syntax highlighting silently breaks. A single pre-bundled unit guarantees every package shares one instance. The app defers its editor bootstrap (`bootSimulator()`) until `window.CM6` exists, so load timing is non-blocking. The namespace exposes:
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


### 2.3 Visual debugging & breakpoints

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


### 2.4 Advanced editing, IntelliSense & guidance

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


### 2.5 Dockable & detachable inspector panels

The four right-side inspector views — **Registers**, **Memory**, **Peripherals**, and **Disassembly** — are no longer mutually-exclusive tabs. Each is an independently toggled panel that can be stacked in the side column or torn off into a floating window.

```
+---------------------------------------------------+
| ● Registers   ● Memory   ○ Peripherals  ⟳ Disasm  |   <- toolbar chips (● shown, ⟳ = detached)
+---------------------------------------------------+
| With ≤2 docked panels:                           |
|  REGISTERS                              ⧉   ✕    |
|  ============== drag to resize ================= |
|  MEMORY                                 ⧉   ✕    |
|                                                   |
| With >2 docked panels (2×2 grid):                |
| +----------------------------+  +--------------+ |
| | REGISTERS          ⧉   ✕  |  | MEMORY  ⧉  ✕ | |
| | ...                       |  | ...          | |
| | ========== drag ==========|  |===== drag ====| |
| | PERIPHERALS        ⧉   ✕  |  | DISASM  ⧉  ✕ | |
| | ...                       |  | ...          | |
| +----------------------------+  +--------------+ |
|         +--------------------------------------+
|         | DISASSEMBLY (floating)      ▣    ✕   |  <- draggable by header,
|         |  0x00400000  ...                    |     resizable from any edge
|         +--------------------------------------+
```

- **Toolbar chips (`#panelChip-*`)**: Clicking a chip shows or hides that panel. A filled mauve dot marks a visible panel; a blue haloed dot marks one that is currently detached/floating.
- **Docked stack (`.panel-stack`)**: Visible non-floating panels arrange in the right column. With **≤2 docked panels** they stack vertically, each with an injected header bar (`.panel-hdr`) carrying a title, a **⧉ float / ▣ dock** toggle, and a **✕ hide** button. A `.panel-vsplitter` between adjacent docked panels drags to redistribute height (double-click resets to an even split).
- **2×2 grid layout**: With **>2 docked panels** the panels automatically arrange as a **2×2 grid** (2 rows × 2 columns) — row 1 holds the first ⌈n/2⌉ panels, row 2 the rest. The dock expands to **50% of the window width** so each panel is about a quarter of the screen, and returns to the user's previous width when fewer panels are shown. A draggable **`.panel-hsplitter`** resizes the two columns, while the **`.panel-vsplitter`** resizes the two rows (double-click either to even out). Per-row heights and per-panel column widths persist.
- **Floating panels (`.tab-content.panel-floating`)**: `position: fixed`, dragged by their header, resized natively from any edge (`resize: both`). They render above the editor but below the Settings modal, and stay clamped inside the viewport on window resize.
- **Persistence**: Which panels are shown, their order, docked row heights, per-panel column widths, and floating positions/sizes are saved to `localStorage` under `rvsim.panelDock.v1` and restored on reload. Defaults to Registers-only, docked (unchanged first-run layout).
- **Intra-panel column-resize separators**: Each of the three data panels — **Registers**, **Memory**, and **Disassembly** — draws an always-visible hairline **`.col-resizer`** separator at every column boundary but the last (`#`/`Name`/`Value (Hex)` in Registers, `Addr`/`Machine code`/`Native instruction` in Disassembly, `Addr`/`Content (Hex)` in Memory's column-header bar). The line thickens to mauve under the pointer and has an 11px hit area, so the boundaries are discoverable at a glance rather than having to be hunted for. All three panels share one header design (small uppercase labels) and one separator, and all three **freeze their header row** (`position: sticky`) so it stays put while the rows scroll under it — the shared `.panel-body` is the scrollport, so the toolbar/legend above scrolls away while the header pins to the top of the panel. Only the vertical axis is pinned: a header still scrolls sideways in step with its data when a narrow panel scrolls horizontally.
- **How the columns are sized** (`PANEL_COLS` / `applyPanelColLayout()`): every column has a px width. Columns marked `grow: 0` (`#`, `Name`, `Addr`, `Machine code`, `Content (Hex)`) hold their content-sized width and **never scale up just because the panel got wider**; the `grow`-weighted columns (the Value pair, `Native instruction` + `Original source`, `Content (ASCII)`) share out whatever surplus the panel has beyond that — so the surplus goes to the text, not to short fixed-length data. When the panel is *narrower* than the sum of the minimums nothing is crushed: the widths hold and the panel **scrolls horizontally** instead. That is what keeps the wrapping off any single column — the text columns take up the slack first (they have the largest span between `min` and `fit`), and past that point the whole row scrolls.
- **Dragging a separator** behaves like a spreadsheet: the first movement pins every column at its current rendered width, then only the dragged column's width changes — so **everything to its right keeps its width and simply shifts along**. Pinning happens on the first *move*, never on a plain click. **Double-click** any separator to unpin the whole panel and return to the automatic layout. Pinned widths persist per panel under `rvsim.panelColW.<panel>`. A `ResizeObserver` re-runs the layout whenever a panel is resized. The **Peripherals** panel is deliberately left untouched.
- **Live updates**: All four panels keep refreshing (`updateRegisters`, `updateMemoryView`, `updateDisassembly`, `updatePeripherals`) on every step/run/reset regardless of visibility, so any combination of open panels stays current. Disassembly auto-scroll to the current-PC row fires whenever that panel is visible in either mode.
- **Compatibility**: The legacy `switchTab(name)` entry point still exists and now means "ensure this panel is visible and refreshed".
- **Empty state (all panels hidden)**: When every docked panel is hidden on desktop the panel area shows a compact single-line hint — *"All panels are hidden — use the buttons above to show Registers, Memory, Peripherals, or Disassembly"* — with a subtle grid icon and the panel names emphasised in a lighter tone (`.panel-stack-empty`). The old two-line `<br>`-split message was replaced for a cleaner look.
- **Mobile (`≤ 800px`)**: The panels revert to a **classic tabbed view** — the chip strip becomes a mutually-exclusive tab bar and exactly one panel is shown at a time (tapping a chip switches to that panel and shows it even if it was hidden on desktop). Detaching, the 2×2 grid and all splitters are disabled; the floating/⧉/✕ header controls are hidden. The mobile tab selection is **ephemeral** — it never changes the persisted desktop visibility, so opening the simulator on a wide screen restores your docked/grid layout exactly. Even if **all panels are hidden** in the persisted desktop layout, the tabbed view still shows exactly one tab (falling back to Registers) so the panel area is never empty on mobile. The main editor/dock splitter is clamped so the code editor always keeps at least 360px (and is re-clamped on window resize), so a wide dock can never push the editor off-screen or leave blank space on the right.

---


### 2.6 Multi-row responsive toolbar & button state lifecycle

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

### 2.7 The console

One console sits under the editor and carries everything: assembler diagnostics,
runtime messages, `ecall` output, and the Verilog toolchain's output tagged `[HDL]`.
There is no second console anywhere — an HDL compile error and an assembler error
appear in the same place, in the order they happened.

It is **resizable**: drag the bar above it, or double-click that bar to return to the
default 140 px. The height is remembered in `localStorage` (`rvsim.consoleHeight.v1`).
That matters because a Verilog compile error can run to many lines, while a working
session wants the space back for the editor.

The **status bar** below it carries the one-line "what is happening right now" message —
including the HDL engine's progress (`HDL: compiling…`, `HDL: simulating 2000 cycles…`).


---


## 3. C language support & Godbolt integration

### 3.1 REST API compilation pipeline
- Compiles C code via `POST https://godbolt.org/api/compiler/<id>/compile` targeting RV32 GCC / Clang (`rv32-cgcc1420`, `rv32-cgcctrunk`, `rv32-cclang2010`, `rv32-cclang`).
- Passes configurable optimization levels (`-O0 (Debug, Recommended)`, `-O1`, `-O2`, `-Os`, `-O3`) and ABI flags (`-march=rv32im -mabi=ilp32 -fno-pic -fno-pie`).
- Automatically prepends a dynamic baremetal CRT0 startup shim that sets the stack pointer `sp` to the configured Stack Top (`dataBase + dataSize`):
  ```assembly
  .text
  .globl _start
  _start:
      li sp, 0x10010200    # Set sp to Data Base + Data Size (0x10010000 + 0x200)
      call main            # Call C main()
      li a7, 10            # Exit syscall
      ecall
  __halt:
      j __halt
  ```

### 3.2 Source-to-assembly bidirectional line mapping
- Parses Godbolt's emitted assembly array (`res.asm[i].source.line`) and establishes bidirectional mappings:
  - `pcToCLineMap`: Maps execution address $PC \rightarrow \text{C Line}$
  - `cLineToPcsMap`: Maps $\text{C Line} \rightarrow [PC_1, PC_2, \dots]$
  - `cLineToFirstPcMap`: Maps $\text{C Line} \rightarrow \text{First } PC$
- Maps startup preamble (`_start` to `call main`) to the `main()` function entry line.

### 3.3 C source-level stepping & debugging
- **Single Stepping (`F8` / `⏭ Step`)**: Highlights the active C source statement in CodeMirror 6 while advancing the underlying RV32 machine code.
- **Step Back (`Shift+F8` / `⏮ Back`)**: Restores CPU registers, memory, and active C line highlighting.
- **Breakpoints in C**: Click on C source lines to toggle breakpoints with smart line snapping; `▶ Run` (`F5`) halts on active C lines.
- **Offline Precompiled C Cache**: All 8 pre-loaded C examples include precompiled Godbolt assembly JSON mappings embedded directly in `riscv_simulator.html`, ensuring instantaneous offline simulation without network access.

---

## 4. Execution engines

The toolbar's `JS | HDL` pill chooses which engine Run, Step, Back and Reset drive.
Everything around them — the editor, breakpoints, the registers/memory/disassembly
panels and the whole peripheral board — is shared, so switching engines changes what is
executing, not what you are looking at.

| | Functional (JS) | Hardware (HDL) |
|---|---|---|
| Executes | Built-in RV32GC interpreter | Your uploaded `.v` sources |
| Stepping | Live, one instruction at a time | Through a recording — forwards *and* backwards |
| Run / Resume / breakpoints | Yes | Yes — Resume seeks the recording to the next breakpoint |
| Registers panel | Live | Read out of your register file by hierarchical reference |
| Memory panel | Live | Driven by the Wrapper's actual DMEM writes |
| LEDs / 7-seg / OLED / UART | Live | Driven by your hardware's pins |
| Unwritten registers | Shown as `0` | Shown as `xxxxxxxx` — the hardware truth |
| `Cycles` readout | CPI-table estimate, tagged `est` | Real clock edges, tagged `hw` |
| Speed | Millions of instr/sec | ~40k–200k cycles/sec |

**Only one engine ever executes.** Switching away from a running functional simulation
pauses it first (its state is kept, so switching back and pressing Resume carries on),
and the engine toggle is locked while an HDL run is in flight. Before this was enforced,
the JavaScript engine would keep running underneath the HDL view, advancing the cycle
and instruction counters until it hit the JS run limit.

Switching engines does not throw a recording away. Each switch lands on the instruction
the other engine had reached, so you can step through the RTL, hop to the functional
model to get somewhere quickly, and come back to the hardware at the same instruction.


### 4.1 The functional engine: control & timing model
- **Non-Blocking Simulation Loop**: Uses `requestAnimationFrame` with an internal batch size (`BATCH_SIZE = 10,000` instructions per event-loop tick) to maintain a responsive 60 FPS UI while executing high-throughput simulations.
- **Configurable Run Limit (`simMaxInstrPerRun`)**: Configurable via **⚙ Settings → ⏱ JS Simulation** (default `100,000,000` instructions per run, range $1$ to $2,000,000,000$), automatically pausing long-running or infinite loops after the specified limit.
- **Statement Stepping (Fast Mode)**:
  - When enabled via `⚙ Settings…` $\rightarrow$ **⏱ JS Simulation** or **🔌 HDL Simulation** (the same setting, offered on both tabs), stepping forward (`F8`) executes all machine instructions belonging to the current C statement or multi-instruction pseudo-op in a single discrete step.
  - Step back (`Shift+F8`) cleanly undoes the multi-instruction statement step in one operation.
  - It applies to **both engines**: in HDL mode a Step seeks that same distance through the recording, and Back covers exactly the same distance in reverse.
- **Cycle-Accurate CPI Timing**: Instruction execution accrues cycles according to categorized CPI settings (ALU/Basic, Multiply/Divide, Load, Store, Branch, Jump, Floating Point, System/Syscall).

### 4.2 Disassembly viewer with label headers & annotations
- **Label Header Rows (`.disasm-label-row`)**: Disassembly renders distinct label headers (e.g. `main:`, `loop:`, `factorial:`) preceding the target instruction address in both Assembly and C modes. Label names (`.disasm-label-name`) are rendered in **orange** (`#fab387`) — the same colour as labels in the Code window and the Memory-view row labels.
- **Jump / Branch Target Annotations (`.disasm-target-label`)**: Numeric and hexadecimal jump/branch offsets (e.g. `jal 0x00400040`) are automatically annotated with human-readable target label badges (e.g. `<main>`, `<loop>`).
- **Machine-code display mode (segmented `[ Byte | Word ]`)**: The Disassembly toolbar has a **segmented `[ Byte | Word ]` pill** under the Machine-code column — **Word is the default**. Word mode renders each aligned 4-byte group as one whole 8-digit little-endian 32-bit hex word (`xxxxxxxx`); Byte mode renders the classic separate bytes (`xx xx xx xx`). Both modes group in 4-byte chunks (multi-word data stays chunked). The selected mode is visually highlighted and persists across re-assembles.
- **Original-source pseudoinstructions (`.code-list .pseudo`)**: The *Original source* column for a pseudoinstruction is coloured **blue** (`#89b4fa`), a simple colour swap from orange — freeing orange exclusively for labels (the code window, memory view, and disassembly labels all use `#fab387` consistently).
- **C Source Line Tags (`.disasm-cline-tag`)**: Instructions compiled from C display source line number and statement text (e.g. `[Line 10: total += arr[i];]`).
- **Fixed data columns / elastic text columns**: **Addr** and **Machine code** are `grow: 0` columns — sized so the hex address / machine-code word fits on one line, and never stretched when the panel widens. **Native instruction** and **Original source** carry the `grow` weight and **split any surplus between them equally**, so neither is left alone to absorb it. Both wrap at word boundaries first (`word-break: normal`) rather than chopping mnemonics mid-token; below the minimum widths the table stops shrinking and the panel scrolls. Widths come from the table's `<colgroup>`, written by `applyPanelColLayout()` — see the panel-layout section above.
- **Disassembly Auto-Scrolling**: The active execution instruction row (`.current-native`) automatically scrolls into view during stepping, step back, and breakpoint halts.

---

## 5. HDL simulation mode: your Verilog in the browser

Switch the toolbar pill from **JS** to **HDL** and Run, Step and Back stop executing the
JavaScript model and start executing *your RTL*. The assembled program is handed to your
design exactly the way Vivado does it — as `AA_IROM.mem` / `AA_DMEM.mem` read by your
Wrapper's own `$readmemh` — and everything your hardware does (LEDs, 7-segment, OLED,
UART, register writes, memory writes, the PC) is fed back into the simulator's existing
panels.


### 5.1 Using it

1. **Switch to HDL** — the `JS | HDL` pill in the toolbar. The engine (~2.7 MB of
   WASM) begins loading, and with no sources yet loaded the **🔌 HDL Simulation**
   settings tab opens by itself, because nothing else can happen until it has them.
2. **Load your Verilog** — drop `.v` files **anywhere on the page**, open them with
   **📂 Open**, or use *browse…* on that tab. Include `Wrapper.v`, `RV.v` and **every**
   submodule (`ALU.v`, `Decoder.v`, `Extend.v`, `PC_Logic.v`, `ProgramCounter.v`,
   `RegFile.v`, `Shifter.v`). The file holding `module Wrapper` is tagged in the list,
   and a chip next to the `JS | HDL` pill shows the count — turning amber if there is
   no Wrapper among them.
3. **Assemble a program** as usual (any example, or your own).
4. **Run**, then **Step** / **Back** to move through what the hardware did.
   **Run** becomes **Resume** once there is a recording; **Reset** (⟲) is how you
   ask for a fresh one.

Switching between **JS** and **HDL** does not throw anything away. The recording
survives the trip, and each switch lands on the instruction the other engine had
reached — so you can step through the RTL, hop to the functional model to get
somewhere quickly, and come back to the hardware at the same instruction. Only one
engine ever executes: switching away from a running functional simulation pauses it
first, and the engine toggle is locked while an HDL run is in flight.

### 5.2 Where everything lives (there is no HDL panel)

Everything the hardware engine needs is done **once per session**, so it lives in
**⚙ Settings** rather than holding a panel open for the whole run. The panel layout is
the same four panels it has always been — Registers, Memory, Peripherals, Disassembly.

| Where | What |
|---|---|
| ⚙ → **🔌 HDL Simulation** | sources · cycle budget · Trace · Verilog standard · VCD · cross-check · register-file path · *Save testbench* — see [§6](#6-settings) |
| **Toolbar** | Run / Resume · Step · Back · Reset · the source chip · **⭳ VCD**, once a run has produced one |
| **Console** (under the editor) | the engine's output, tagged `[HDL]`, next to the assembler's |
| **Status bar** | what the engine is doing right now |

The source chip beside the `JS | HDL` pill is the standing answer to "is my Verilog
loaded?" — `9 files` with the names on hover, or an amber `⚠ no Verilog` / `⚠ no Wrapper`.
Clicking it opens the tab that manages them.

Two readouts worth naming, because they look identical and are not: the toolbar's
**Cycles** is tagged `est` in JS mode (an estimate from the per-instruction table) and
`hw` in HDL mode (real clock edges counted by your simulation). The cycles table
affects only the first.

Nothing is bundled: the Verilog is always yours, uploaded per session.

### 5.3 The Wrapper is never modified

The simulator only ever *instantiates* your `Wrapper`; it does not read, rewrite or
patch it. Everything it needs, it generates around it as a **testbench** — the same
thing you would write by hand in Vivado. Use **Save testbench** to get that exact file
for offline use with Vivado or `iverilog`.

---


### 5.4 The testbench is generic

The generated testbench contains **no assembled code, no switch settings and no input
data**. Every one of those is supplied at *run* time:

| Setting | How it arrives |
|---|---|
| Cycle budget, trace level | `+CYCLES=`, `+TRACE=` plusargs |
| DIP, buttons, accelerometer at reset | `+DIP=`, `+PB=`, `+ACCEL=`, `+ADRDY=` plusargs |
| Waveform dump | `+VCD` plusarg |
| Timed input changes | `stim.mem` — `<cycle> <code> <value>` triples |
| UART input | `uart_rx.mem` — `<cycle> <byte>` pairs |
| The program itself | `AA_IROM.mem` / `AA_DMEM.mem`, via your Wrapper's `$readmemh` |

Two consequences worth knowing:

* **It compiles once.** The binary is cached against a hash of your sources, so a
  re-run, a step or an input change skips `ivlpp` and `ivl` entirely — a few hundred
  milliseconds instead of a few seconds.
* **The saved testbench stands alone.** Every plusarg has a working default, so
  `iverilog -o sim *.v cg3207_hdl_tb.v && vvp sim` runs it with no arguments at all.
  Nothing about it is specific to the program you happened to have loaded.

`TRACE` levels: `0` silent, `1` peripherals only, `2` (default) adds the architectural
trace. Your own `$display` output passes through to the HDL console untouched.

### 5.5 Which clock edge, and why it matters

A timestamp in `stim.mem` or `uart_rx.mem` means **in force during that cycle**, so
an input stamped at cycle *C* is already settled when the instruction of cycle *C*
reads it. The testbench therefore drives it one edge earlier, at the edge that
*starts* cycle *C* — these are nonblocking assignments, and driving them at the edge
that ends *C* would let the instruction read the previous value.

The same reasoning runs the other way. `LED_OUT`, `SEVENSEGHEX`, `UART_TX_valid`,
`OLED_Write` and `UART_RX_ack` are all `output reg` in the Wrapper: the write made by
the instruction of cycle *C* lands at the edge that ends *C* and is only readable
during *C+1*. They are sampled on the **falling** edge, where the new value is
visible but the trace still sits inside step *C* — so the effect is attributed to the
instruction that caused it rather than to the one after it. `MemWrite_out` is
combinational and stays on the rising edge, alongside the instruction record.

Get either of these wrong and everything looks one instruction late: change a DIP
switch while paused on the load that reads it and the old value comes back; write the
LED register and the display updates one Step behind. Section 11 of the test suite pins
both directions down.

### 5.6 Reading the register file

Register values come from a hierarchical reference into your design. Two tiers, by how
much they can be trusted:

* **Guaranteed** — the Wrapper is fixed, so `dut.PC`, `dut.Instr`, `dut.MemWrite_out`,
  `dut.ALUResult` and `dut.WriteData_out` always exist. The PC, the instruction stream
  and every memory write come from these, and work for *any* core behind that Wrapper.
* **Discovered** — the register bank lives in code you can change. The page looks for a
  32-entry array of 32-bit regs reachable under the Wrapper's core instance, and reports
  what it found under the *Register file* field; type a path there to override it.

Writes are detected by comparing the array against a shadow copy on the falling clock
edge, so **only the array is ever named** — renaming your register file's ports, or the
module itself, cannot break the trace. If the path cannot be resolved at all, the run
falls back to a Wrapper-only testbench: you lose the register view, not the simulation.

### 5.7 The UART console follows the hardware

`UART_RX_ack` is reported as its own event, so the console's RX FIFO drains exactly
when your hardware takes a byte — `RX_VALID` falls back to 0 on the instruction that
reads `0xFFFF0004`, and comes back if you step *back* over it. Nothing about the
console is guessed from the program.

A **buffered** send has no drip feed here (nothing steps the functional engine's
instruction counter), so the whole sequence is queued at once, spaced by the same
instruction gap you asked for, and delivered on that schedule inside the recording.

### 5.8 Memory images

`IROM_DEPTH_BITS` and `DMEM_DEPTH_BITS` are read out of *your* Wrapper, so a design
with an enlarged IROM gets a correspondingly sized image. If the program needs more
instruction words than your IROM holds, the console says so rather than letting the
Wrapper quietly fetch NOPs past the end.

Images are built from the assembled memory image, so gaps inside a segment keep their
addresses. Words past the end of the program are left uninitialised (`X`), matching
what Vivado does with a short `$readmemh` file — the resulting "Not enough words"
notice is expected and is filtered from the console.

---


### 5.9 Execution model: record, then scrub

`vvp` runs to `$finish` and cannot be paused mid-flight, so **stepping does not drive
the simulator at all**. A run records the whole simulation once — one record per PC
change, plus register writes, memory writes and peripheral activity — and Step and Back
move through that recording.

This is better than live stepping on every axis that matters here:

* stepping is instant, because nothing is re-simulated;
* **Back works**, which no real Verilog simulator offers;
* the recording keys on *PC changes*, not on cycles, so it stays correct if you make
  your core multi-cycle or pipelined (`WE_PC` is hardwired to 1 in the single-cycle
  template, but need not be).

Untick **Trace** to record peripheral activity only. That is slightly faster, and
disables Step.

### 5.10 Run, Resume and breakpoints

Breakpoints work exactly as they do in the functional engine — they are source lines,
and the recording is searched by mapping each recorded PC back to its line.

* **Run** (no recording yet) simulates, then stops at the first breakpoint, or at the
  end of the budget if none is hit.
* **Resume** continues from wherever you are to the next breakpoint. With no
  breakpoints it runs to the end of what has been recorded.
* **Resume at the end of the recording** records another *Cycles* worth and carries
  on — that is the "run for another N cycles" button.
* **Reset** (⟲) discards the recording, so the next Run starts the hardware from
  reset again.

**Statement Stepping** applies here too. With it on, one **Step** covers every machine
instruction the current source line expands to — a `la` pseudo-op, or a C statement —
by seeking that far through the recording, and **Back** covers exactly the same
distance in reverse.

*Cycles* keeps one meaning throughout: how much a fresh Run records, and how much each
Resume adds. It is never rewritten behind your back. Stepping past the end of the
recording also extends it, geometrically rather than by one increment, so a long
program does not re-simulate on every step. If the PC has stopped advancing (a halt,
or a tight self-loop) the console says so instead.

### 5.11 Changing an input while paused

Because the simulation is deterministic, a change made mid-run does not have to break
the illusion. Flip a DIP switch, press a button, move the accelerometer or type into the
UART console while paused, and the change is **timestamped at the current cycle** and
the run replayed. Everything before that point comes out bit-identical, so you land
exactly where you were with the change now in effect. It costs one re-simulation —
typically a few hundred milliseconds, since the compile is cached.

This is what `stim.mem` and `uart_rx.mem` are for: the timeline of inputs is data the
testbench reads, not something baked into it.

### 5.12 Cross-checking against the functional model

Tick **Cross-check vs JS model** and each run is followed by a replay of the same
program on the JavaScript interpreter, comparing the PC sequence and every register
write. It reports the *first* instruction where the two disagree, with the cycle, PC,
instruction word and both values — which is usually exactly where an RTL bug is.

Off by default: it costs a second execution of the whole program.

One expected false alarm: if the program reads UART input, the two engines deliver it
on different schedules and will diverge there legitimately.

---


### 5.13 Where the engine comes from

Three Emscripten modules, tried in order:

1. `https://cdn.jsdelivr.net/gh/senolgulgonul/verisim@main/`
2. `https://senolgulgonul.github.io/verisim/`
3. `verisim/` next to this file — **drop the six files there for offline use**
   (`ivlpp.js/.wasm`, `ivl.js/.wasm`, `vvp.js/.wasm`)

The pipeline mirrors what the `iverilog` driver does natively:

| Stage | Module | In -> out |
|---|---|---|
| Preprocess | `ivlpp` | all `.v` sources -> one expanded source (shared macro table) |
| Compile | `ivl` | expanded source -> `.vvp` bytecode |
| Run | `vvp` | `.vvp` + plusargs + input files -> stdout + optional VCD |

Files move between stages through each module's in-memory filesystem; nothing touches
your disk.

> **Licensing.** These WASM modules are builds of **Icarus Verilog** and carry the
> **GPL** — see [Licensing note](#licensing-note) at the end of this document.

---

### 5.14 Limitations

- **A step is a recording, not a live simulation.** Editing a register value by hand,
  or setting a breakpoint the hardware does not know about, has no effect on the RTL —
  the recording is what the hardware actually did.
- **Registers depend on discovery.** A register file that is not a 32-entry array of
  32-bit regs needs its path typed in by hand. When it cannot be reached at all the
  Registers panel says so in place of the values, rather than showing zeros that were
  never read from your hardware — the PC, instructions, memory and peripherals all
  come from the fixed Wrapper and keep working.
- **Long runs are slow**: roughly 40k-200k cycles/sec. A program that needs millions of
  cycles is better run in JS mode.
- **First run downloads ~2.7 MB** of WASM (cached afterwards).
- Requires a browser context that allows cross-origin `import()` — serve over `http://`
  rather than opening the file with `file://`, or host the engine locally.

---

## 6. Settings

One **`⚙ Settings…`** button opens a 4-tab modal. The two simulation tabs are named for
the engine they configure, so a setting's scope is visible from where it sits.

```
+---------------------------------------------------------------------------------------------------+
| ⚙ Settings & Configuration                                                                     [×] |
+---------------------------------------------------------------------------------------------------+
| [ ⚡ Compiler ]  [ 🗺 Linker ]  [ ⏱ JS Simulation ]  [ 🔌 HDL Simulation ]                        |
+---------------------------------------------------------------------------------------------------+
| ⚡ Compiler:  RISC-V 32-bit Compiler [ Clang 20.1.0 (default) | Clang Trunk | GCC 14.2.0 | Trunk ]  |
|              Optimization [ -O0 (Debug) | -O1 | -O2 | -Os | -O3 ]                                 |
|              Architecture & ABI [ -march=rv32im -mabi=ilp32 ]  [x] Include M extension            |
+---------------------------------------------------------------------------------------------------+
| 🗺 Linker:   ⚠️ FPGA Hardware Notice — physical RAM size is fixed in hardware; exceeding the       |
|              configured sizes will fail or wrap around on a real board.                           |
|              Code (.text) base [ 0x00400000 ]  size [ 0x200 ]                                     |
|              Data (.data) base [ 0x10010000 ]  size [ 0x200 ]                                     |
|              Stack top (sp)    [ 0x10010200 ]  MMIO base [ 0xFFFF0000 ]                           |
+---------------------------------------------------------------------------------------------------+
| ⏱ JS Simulation:                                                                                  |
|   BOTH ENGINES     [x] Statement Stepping (Fast Mode)                                             |
|   JAVASCRIPT MODEL Max Instructions Per Run [ 100000000 ]                                         |
|                    Cycles per instruction category (CPI) …                                        |
+---------------------------------------------------------------------------------------------------+
| 🔌 HDL Simulation:                                                                                |
|   BOTH ENGINES     [x] Statement Stepping (Fast Mode)                                             |
|   PROCESSOR SOURCES   drop .v files / browse…   [Wrapper.v ▸ WRAPPER] [RV.v] [ALU.v] …            |
|                       [ Clear files ] [ Save testbench ]                                          |
|   RECORDING        Cycles per Run / Resume [ 2000 ]   [x] Record the architectural trace          |
|   COMPILER&OUTPUT  Verilog standard [ Verilog-2005 ]  [ ] VCD   [ ] Cross-check vs JS model       |
|   REGISTER FILE    [ dut.RV1.RegFile1.RegBank ]  (detected automatically)                         |
+---------------------------------------------------------------------------------------------------+
| [ Reset Defaults ]                                                               [ Apply & Close ] |
+---------------------------------------------------------------------------------------------------+
```

**Statement Stepping applies to both engines**, so it appears at the top of both
simulation tabs — one setting with two controls, kept in step: ticking it on either
turns it on for both.

On the **JS Simulation** tab the settings are **dimmed, not hidden** while the HDL
engine is the one running. A setting you can still find, that tells you why it is doing
nothing, beats one that has quietly vanished — or worse, one that silently does nothing.

**Apply & Close** reloads the program only when the **memory layout actually changed**.
Ticking a checkbox no longer resets execution and discards an HDL recording.

**Reset Defaults** on the HDL tab restores the settings but **keeps your loaded
sources** — those are your work, and *Clear files* is right there.


---


## 7. Memory model & segment mapping

### 7.1 Tabbed memory view & protection model
- **Tabbed Navigation**: `[ Code | Data | Stack | MMIO ]`.
- **Two-row Memory toolbar**:
  - **Row 1**: `Addr` (hex address input) · region sub-tabs `[ Code | Data | Stack | MMIO ]` · a **↻ refresh** button.
  - **Row 2**: `Rows` (number of rows to display) · a **segmented `[ Byte | Word ]` display-mode toggle** (an explicit two-button pill, not a bare checkbox — the active mode is visually highlighted, matching the sub-tab styling).
- **Byte / Word View Toggle**: The **`[ Byte | Word ]`** segmented control in the Memory toolbar switches between the classic **byte view** (separate editable bytes, single-click byte edit / double-click word edit) and a **whole-word view** where each aligned 4-byte group renders as one 8-digit little-endian 32-bit hex word. **Word is the default mode** on load. Word cells are click-editable via the same word overlay (code segment stays read-only), the ASCII column and symbol labels are preserved, and the legend hint updates to match the active mode:
  - **Byte mode**: `groups of 4 bytes = one 32-bit little endian (LSB to the left) word`.
  - **Word mode**: `each row = two 32-bit words · Full word (LSB to the right)` (deliberately *not* called "big endian" — RISC-V is little-endian; the words are shown whole).
- **Legend / colour key (own row)**: The legend is a dedicated row beneath the toolbar with syntax highlighting that mirrors the code editor:
  - `label` is rendered in **orange** (`#fab387`, the same colour used for labels in the CodeMirror syntax theme) = symbol defined at that row's address.
  - `highlighted bytes` in **yellow** (`#ffe08f`) = bytes written at runtime.
  - `Data/Stack/MMIO: editable (Code: read-only)` in **blue** (`#89b4fa`).
  - The little-endian hint in **cyan** (`#00ffff`).
- **Symbol / segment label annotations**: In addition to the MMIO register descriptors, any **code or data label** whose address falls inside a row is rendered **directly above the word it belongs to** in orange (`#fab387`, `.mem-row-label`), e.g. `main` above the first word on the `0x00400000` row. The label is anchored to the exact 4-byte word containing the symbol (`.mem-row-label-anchor` wraps the label above the word cell / byte group), so it's clear at a glance which word a label refers to. Labels spanning a word's bytes are listed comma-separated, exactly like the disassembly view's address→label mapping. For a **non-word-aligned** label (e.g. a `.byte`/`.asciz` symbol that lands at `+2` within a word), hovering the label reveals its **exact byte address** in a tooltip (e.g. `Symbol at 0x10010002`) — no visual clutter, just a hover hint.
- **Read-Only Code Protection**: The **Code (.text)** segment in the Memory View is strictly read-only to prevent accidental program corruption during inspection, while **Data**, **Stack**, and **MMIO** regions retain full interactive byte- and word-level editing.
- **Downward Decreasing Stack View**: The **Stack** tab renders addresses in **downward decreasing order** (`0x10010200`, `0x100101F8`, `0x100101F0`...) to accurately visualize the downward growth of the RISC-V stack.
- **Hardware Boundary Checks & Warnings**:
  - **Code Segment Overflow**: Emits a warning if assembled instructions exceed configured `codeSize` (default `0x200` / 512 B / 128 instructions).
  - **Data Segment Overflow**: Emits a warning and safely adjusts the startup stack pointer if data allocations exceed configured `dataSize` (default `0x200` / 512 B).
  - Alerts users of potential memory wrap-around on fixed-size physical FPGA block RAM (IROM/DMEM).
- **Verilog Memory Dumps**:
  - Code segment $\rightarrow$ **`AA_IROM.mem`** (`💾 Dump txt`).
  - Data segment $\rightarrow$ **`AA_DMEM.mem`** (`💾 Dump data`).
  - Formatted with `// @<HEX_ADDR>` address comments for FPGA testbench synthesis compatibility.

### 7.2 Complete MMIO address map

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


## 8. Peripherals & FPGA board simulation

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

### 8.1 96×64 pixel OLED display (`0xFFFF0020`–`0xFFFF002C`)
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

### 8.2 3-axis accelerometer & temperature sensor (`0xFFFF0040`–`0xFFFF0044`)
- **`0xFFFF0040` (RO)**: `ACCEL_DATA` — 32-bit packed `{temperature, X, Y, Z}` from **MSB to LSB**:
  - `[31:24]`: **Temperature** (8-bit signed integer, $-40..+85^\circ\text{C}$, default `25` / `0x19`, offset `+3`).
  - `[23:16]`: **X Acceleration** (8-bit signed integer, $\pm 2g$, default `0` / `0x00` = $0.00g$, offset `+2`).
  - `[15:8]`: **Y Acceleration** (8-bit signed integer, $\pm 2g$, default `0` / `0x00` = $0.00g$, offset `+1`).
  - `[7:0]`: **Z Acceleration** (8-bit signed integer, $\pm 2g$, default `+64` / `0x40` = $+1.00g$, offset `+0`).
- **`0xFFFF0044` (RO)**: `ACCEL_DREADY` — Bit 0 = 1 when data is ready.
- **Interactive Controls & Presets**: Range sliders for X, Y, Z ($\pm 128$), temperature slider, live $g$-force calculation, and presets (`Flat`, `Tilt X ±1g`, `Tilt Y ±1g`, `Shake ±2g`, `Zero All`). The **`Tilt X` / `Tilt Y`** presets are toggles: the **first click sets the axis to $-1g$** (X or Y to `-64`/`0xC0`, Z to `0`), and the second click flips to `+1g` (`+64`), repeating alternately.

### 8.3 UART serial console (`0xFFFF0000`–`0xFFFF000C`)
- Memory-mapped serial terminal with independent output buffer, auto-sequencer delay, hex/ASCII I/O modes, and responsive flex wrapping.
- **ASCII mode**: Type raw text (including escapes such as `\r`, `\n`, `\t`, `\xHH`); the terminal echoes the raw characters as they are transmitted.
- **Hex mode**: Type **comma-separated hex bytes** — each token is interpreted as a hex byte with or without the `0x`/`0X` prefix (e.g. `0x48, 0x69, 0x0D` or `48, 69, 0D`; a single trailing `h` suffix such as `69h` is also accepted). Tokens larger than `0xFF` or non-hex tokens are silently skipped. The terminal **output re-renders live as `0xHH` bytes** (e.g. `0x41 0x0D`) and stays in hex view across program-run batches, steppers, and resets — switching the mode back to ASCII re-renders the same transmitted bytes as raw text.
- **Mobile-friendly input**: the transmit field uses `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, and `enterkeyhint="send"`, and the global keyboard shortcuts (F5/F8/F9/Ctrl+Enter/Ctrl+S) are suppressed while any form field is focused, so the on-screen keyboard stays open and typing is not interrupted.

---


## 9. Pre-loaded example programs

The simulator comes pre-loaded with **19 rich example programs** (11 in Assembly and 8 in C):

### 9.1 C examples (8)
1. **`basic_c` (Basic Sum)**: Computes sum = $a + b + c$ with local variables and function calls.
2. **`factorial_c` (Factorial)**: Recursive factorial computation demonstrating stack frames and base cases.
3. **`fibonacci_c` (Fibonacci)**: Iterative Fibonacci series generator storing values in an array.
4. **`loop_c` (Array Search)**: Searches for an element in an integer array and accumulates totals.
5. **`matrix_c` (Matrix Multiply)**: $2 \times 2$ integer matrix multiplication with nested loops.
6. **`peripherals_c` (MMIO Peripherals)**: Reads DIP switches and buttons, writes to LEDs, 7-Segment display, and outputs greeting string over UART.
7. **`circle_accel_c` (Circle & Delay Accel - `Circle_delay_accel.c`)**: Implements the Midpoint Circle Algorithm on the OLED display, polls accelerometer X/Y tilt, animates circle positions, outputs frame counts to the 7-Segment display, and sends UART telemetry.
8. **`image_display_c` (Image Display & Accel - `ImageDisplay_autoadvance_accel.c`)**: High-performance OLED graphics rendering using Auto-Advance Mode 5 (`autoadvance_row`), displaying 96x64 8-bit color bitmap artwork (`Uphill.png` / `Downhill.png`), responding dynamically to X-axis accelerometer tilt, and logging status messages to the UART terminal.

### 9.2 Assembly examples (11)
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


All C examples carry embedded precompiled Godbolt assembly, so they run fully offline.
The `DIP_to_LED` and `HelloWorld` assembly examples double as the HDL mode's smoke
tests — they exercise a DIP read, an LED write and the full UART handshake against real
RTL in a few hundred cycles.


---


## 10. Processor state, ISA reference & RARS syscalls

### 10.1 Register bank structure
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

### 10.2 Supported instruction set (RV32GC)
- **RV32I Base**: `add`, `sub`, `and`, `or`, `xor`, `sll`, `srl`, `sra`, `slt`, `sltu`, `addi`, `andi`, `ori`, `xori`, `slli`, `srli`, `srai`, `slti`, `sltiu`, `lui`, `auipc`, `lw`, `lh`, `lhu`, `lb`, `lbu`, `sw`, `sh`, `sb`, `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`, `jal`, `jalr`, `fence`, `ecall`, `ebreak`.
- **RV32M Extension**: `mul`, `mulh`, `mulhsu`, `mulhu`, `div`, `divu`, `rem`, `remu`.
- **RV32A Extension**: `lr.w`, `sc.w`, `amoswap.w`, `amoadd.w`, `amoxor.w`, `amoand.w`, `amoor.w`, `amomin.w`, `amomax.w`, `amomin.u`, `amomax.u`.
- **RV32F / RV32D Extension**: `flw`, `fsw`, `fadd.s`, `fsub.s`, `fmul.s`, `fdiv.s`, `fsqrt.s`, `feq.s`, `flt.s`, `fle.s`, `fcvt.w.s`, `fcvt.s.w`, `fld`, `fsd`, `fadd.d`, `fsub.d`, `fmul.d`, `fdiv.d`.
- **RV32C Extension**: `c.addi`, `c.li`, `c.lui`, `c.mv`, `c.add`, `c.sub`, `c.and`, `c.or`, `c.xor`, `c.lw`, `c.sw`, `c.j`, `c.jr`, `c.jalr`, `c.beqz`, `c.bnez`, `c.slli`, `c.srli`, `c.srai`, `c.andi`, `c.nop`, `c.ebreak`.
- **Pseudo-Instructions**: `li`, `la`, `mv`, `not`, `neg`, `j`, `jr`, `ret`, `call`, `tail`, `nop`, `beqz`, `bnez`, `blez`, `bgez`, `bltz`, `bgtz`, `bgt`, `ble`, `seqz`, `snez`, `sltz`, `sgtz`.

### 10.3 RARS `ecall` syscall services

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


## 11. Keyboard shortcuts

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

## 12. Automated test suite

A Node/jsdom harness lives in [`riscv_simulator_tests/`](riscv_simulator_tests). Every
suite loads the real `riscv_simulator.html`, so the tests exercise the shipped file
rather than a copy of its logic.

| Test script | Target subsystem & scenarios |
|-------------|------------------------------|
| `test_comprehensive_suite.js` | Full system integration: editor proxy facade, Tab precision, breakpoints, assembler, stepping, history undo, FPGA MMIO registers, toolbar layout. |
| `test_hdl_mode.js` | **HDL mode, end to end (120 assertions).** Drives the real Icarus/WASM pipeline over the unmodified `RV/*.v` sources — see below. |
| `test_panel_grid.js` | Dockable-panel 2×2 grid layout, splitters, per-panel column sizing and persistence. |
| `test_c_godbolt_simulation.js` | Godbolt REST API compilation, bidirectional line mapping, C breakpoints and C stepping. |
| `test_new_c_simulation.js` | Offline and live verification for `Circle_delay_accel.c` and `ImageDisplay_autoadvance_accel.c`. |
| `test_baked_examples_full.js` | Compilation and execution of all 19 built-in examples using offline precompiled mappings. |
| `test_statement_stepping.js` | Statement Stepping in both C and ASM, multi-instruction execution and discrete step back. |
| `test_sim_max_instructions_setting.js` | Run-limit setting and execution-loop throttling. |
| `test_disassembly_labels_and_warnings.js` | Label header rendering, jump/branch target annotations, FPGA hardware notice. |
| `test_disassembly_machine_code.js` | Machine-code Byte/Word modes and binary byte grouping. |
| `test_reset_and_image_display.js` | OLED auto-advance mode 5 rendering fidelity, ASM/C pixel parity, peripheral reset. |
| `test_tab_and_autocomplete.js` | CM6 key handling, literal Tab insertion, block indent, operand autocomplete, signature help. |
| `test_breakpoint_highlight_and_snap.js` | Breakpoint snapping from comments/blanks/directives, gutter highlight pill. |
| `test_all_instructions_v2.js` | RV32GC translation coverage across 90+ instructions and pseudo-ops. |
| `test_execution_programs.js` | Multi-step execution and register assertions for Factorial ($5! = 120$) and Fibonacci ($F_9=34$, $F_{10}=55$). |
| `test_mobile_keyboard_focus.js` | On-screen-keyboard focus preservation across panel relayout. |
| `test_jsdom.js` | Boot smoke test under jsdom. |

### 12.1 The HDL suite

`test_hdl_mode.js` is the one that needs real tooling: it loads the page, assembles
through the normal assembler, asks the page for the artefacts it would hand to Icarus
(the generic testbench, the memory images, the stimulus files), then runs the **real**
Icarus pipeline over the unmodified `RV/*.v` sources.

- **Discovery** finds `dut.RV1.RegFile1.RegBank`, and still finds it after the module,
  the instance and the array are all renamed.
- **The testbench is program-independent**: byte-identical Verilog for two different
  programs with different switch settings, and no DIP value anywhere in it.
- **One compile, many runs**: the same binary gives `LED=0xad` for `+DIP=bead` and
  `LED=0x72` for `+DIP=0072`, and runs standalone with no plusargs at all.
- **The trace** starts at the reset vector, never reports a write to `x0`, captures the
  DIP value landing in a register and the store to the LED MMIO address.
- **Stepping** reaches the right state either side of the instruction that reads the
  DIP switches, and **stepping back undoes the register write**.
- **A mid-run input change** takes effect (`0xad` → `0xff`) while the history before it
  stays bit-identical — the property the whole interaction model rests on.
- **MMIO timing, both directions**: an input changed while paused is read by the very
  next instruction (not the one after it), and the LED shows its new value as soon as
  the storing instruction completes.
- **Breakpoints**: Resume stops on the breakpoint line, resumes to the next time that
  line is reached, and runs to the end of the recording when there are none.
- **RX_VALID**: both bytes are acknowledged, the FIFO empties on the instruction that
  reads each one, and stepping back puts the byte back.
- **Statement Stepping in HDL**: with it off a Step is one machine instruction; with it
  on a Step covers the whole source line, and Back undoes exactly that.
- **`HelloWorld`**: `'A'` + CR delivered through `uart_rx.mem` produces the echo *and*
  the greeting stored in DMEM, exercising `UART_RX`/`valid`/`ack` and `UART_TX`/`valid`.

```bash
node riscv_simulator_tests/test_hdl_mode.js
```

The engine is expected at the path in `HDL_ENGINE_DIR`; point it at a folder holding the
six engine files to run the full pipeline offline. **Node 20+** is required — the
Emscripten modules are ES modules using `import.meta`.

All 15 suites above pass against `riscv_simulator.html`.

`test_comprehensive_suite.js` §9 checks the memory-view protection model in **both**
display modes, because the mechanism differs between them: in **word** mode (the default
since v23.5) a cell is edited through the word overlay — an `onclick` calling
`startMemWordCellEdit` — while in **byte** mode it is `contenteditable="true"`. The rule
being verified is the same either way: the code segment is read-only, and
data/stack/MMIO are editable.

---

## 13. Version history

Newest first. Versions before v15.0 are grouped.

| Version | Milestone description & features implemented |
|---------|----------------------------------------------|
| **v24.1 (MMIO Timing, Resume & Breakpoints, Settings Reorganisation)** | Fixed MMIO being **one instruction late in both directions**. Inputs are nonblocking assignments, so a value stamped at cycle *C* was driven at the edge that *ends* C and only settled during *C+1* — the instruction of cycle *C* read the previous value; the testbench now drives at `cyc + 1`, so a timestamp means "in force during that cycle". On the way out, every peripheral signal the Wrapper exposes is an `output reg`, so it is now sampled on the **falling edge**, where it is readable but the trace still sits inside the causing step — previously correct only by Icarus's block ordering. **Run became Resume**: it continues to the next breakpoint, or to the end of the recording, and records another *Cycles* worth when it reaches the end; breakpoints are matched by mapping recorded PCs back to source lines. **`UART_RX_ack` is traced**, so the console's RX FIFO drains on the instruction that reads it and refills when you step back. Fixed **both engines running at once** — switching JS→HDL left the functional timer chain advancing the counters until it hit the JS run limit; it is now paused on the switch and the toggle is locked during an HDL run. **Statement Stepping now works in HDL mode**, seeking over a whole source line. **The HDL panel was retired**: everything it held is done once per session, so it moved to a new **🔌 HDL Simulation** settings tab, its output to the shared console tagged `[HDL]`, and its status to the status bar — returning the dock to four panels. The Simulator tab became **⏱ JS Simulation**, with Statement Stepping mirrored on both. Sources can be dropped **anywhere on the page** or opened with 📂 Open, a toolbar chip reports what is loaded, and switching to HDL with nothing loaded opens the tab that asks for it. The **console became resizable** (drag, double-click to reset, height remembered). Also: Apply & Close no longer reloads the program unless the memory layout changed, an input moved during a re-simulation is queued rather than dropped, the Registers panel explains itself when the register file cannot be reached, and `riscv_simulator.html` / `riscv_simulator_nohdl.html` were swapped so the two-engine build is the canonical one. Test suite grown to 120 HDL assertions. |
| **v24.0 (HDL Simulation Mode — Your Verilog in the Browser)** | Added a **second execution engine**. A `JS | HDL` toolbar pill switches Run/Step/Back from the JavaScript functional model to **your own Verilog processor**, compiled and simulated in the browser by **Icarus Verilog built to WebAssembly** (`ivlpp` → `ivl` → `vvp`, loaded at runtime from a CDN with a local fallback). The simulator **generates a program-independent testbench** around your unmodified `Wrapper` — no assembled code, no switch settings, no input data in the Verilog; everything arrives at run time through plusargs (`+CYCLES`, `+TRACE`, `+DIP`, `+PB`, `+ACCEL`, `+VCD`) and through `stim.mem` / `uart_rx.mem`, so **one compile serves every run, every step and every input change**. The register file is located by **discovery** (a 32×32-bit array reachable under the Wrapper's core instance) and read by hierarchical reference, with writes detected by **shadow-comparing the array on the falling edge** so no write-port signal has to be named and a renamed port cannot break the trace. Because `vvp` cannot be paused, a run **records the whole simulation** and Step/Back navigate the recording — which makes stepping instant and, unlike any real Verilog simulator, makes **stepping backwards** possible. Unwritten registers render `xxxxxxxx`, not `0`. Optional **cross-check** replays the same program on the functional model and reports the first instruction where the two disagree. |
| **v23.8 (Intra-Panel Column-Resize Separators, Unified Data-Panel Headers & No-Stretch Columns)** | Gave the three data panels — **Registers**, **Memory** (a new `.mem-col-header` label bar above the hex dump) and **Disassembly** — **one shared header design** (small uppercase labels) and an **always-visible hairline separator** (`.col-resizer`, 11px hit area) at every column boundary but the last, replacing three different header styles and a separator that was invisible until hovered. Column sizing moved into a single `PANEL_COLS` / `applyPanelColLayout()` model driving each table's `<colgroup>` (and Memory's `--mem-*-w` custom properties): `grow: 0` columns (`#`, `Name`, `Addr`, `Machine code`, `Content (Hex)`) hold their content-sized width and are never stretched when the panel widens, while the `grow`-weighted columns (the Value pair, `Native instruction` + `Original source`, `Content (ASCII)`) **share the surplus between them** — no single column is left to absorb it alone. A panel narrower than the sum of the minimums **scrolls horizontally** instead of crushing a column, and the text columns now wrap at word boundaries rather than `break-all` mid-mnemonic. **Dragging is spreadsheet-style**: the first movement pins every column at its rendered width, then only the dragged column changes, so everything to its right keeps its width and shifts along; double-click any separator to unpin the panel. A `ResizeObserver` re-runs the layout on panel resize. This replaced an earlier attempt whose `width: 1%` on the elastic columns **collapsed the last two columns while ballooning the first two** — in a fixed-layout table where every column has a specified width, surplus space is shared out *in proportion to those widths*. Memory's `Content (Hex)` | `Content (ASCII)` boundary is now clamped to the hex data's measured natural width so the separator can no longer be dragged back over the bytes. All three headers are **frozen** (`position: sticky`) so they stay put while their rows scroll, and Memory's columns are labelled **Addr / Content (Hex) / Content (ASCII)**. Widths persist per panel under `rvsim.panelColW.<panel>`; **Peripherals** is untouched. New regression assertions in `riscv_simulator_tests/test_panel_grid.js` (sections [16]–[18]). |
| **v23.7 (Disassembly Binary Byte Grouping & Panel-Grid Layout Fixes)** | Binary machine code now keeps each **byte's 8 digits contiguous** — Byte mode renders space-separated bytes in memory order, Word mode renders one 32-bit word with its bytes **underscore-separated** (`xxxxxxxx_xxxxxxxx_xxxxxxxx_xxxxxxxx`). Added a cyan **LSB hint** beside the `[ Byte | Word ]` pill — *LSB to the left* in Byte mode, *LSB to the right* in Word mode — matching the Memory-view endianness legend. Dropped `word-break: break-all` from the machine-code cell so a byte's digits can no longer split across rows. Fixed the **3-panel grid leaving a blank 4th cell** (the lone second-row panel now stretches across the full row via `.panel-dock-row-single`), and fixed the **main-splitter drag shifting the panels area** (`updateDockWidthForGrid` no longer force-grows the dock to 50% on every relayout; `.right-panel` allows `min-width: 0`). New suite `test_disassembly_machine_code.js` plus 7 grid-layout assertions in `test_panel_grid.js`. |
| **v23.6 (UART Hex-Mode & Mobile Keyboard Fixes)** | Fixed **Hex input parsing**: comma-separated hex bytes are now interpreted as hex (`0x41`, `41`, `69h` → `0x41`), not decimal, so `0x41, 0x0d` transmits the same bytes as `A\r`. Fixed the **terminal hex display** being overwritten back to ASCII: the peripheral refresh path now renders through the same hex-aware terminal renderer, so UART_TX bytes stay as `0xHH` in Hex mode across run batches, stepping, mode toggles and resets (and `uartTxBytes` is cleared on reset). Added **mobile keyboard fixes**: the transmit field uses `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"` and `enterkeyhint="send"`, and the global F5/F8/F9/Ctrl+Enter/Ctrl+S shortcuts are suppressed while any form field is focused so the on-screen keyboard stays open. |
| **v23.5 (Disassembly Machine-code Byte/Word Toggle & Word-as-Default + Accelerometer Tilt Start Direction)** | Added a **segmented `[ Byte | Word ]` pill to the Disassembly toolbar** (matching the Memory toolbar's toggle) that switches the **Machine-code** column between the classic separate bytes (`xx xx xx xx`) and one **whole 8-digit little-endian 32-bit hex word** per 4-byte chunk — **Word is the default** there and everywhere: the **Memory view now also opens in Word mode** (default `memViewMode = 'word'`, Word button pre-highlighted, word-mode legend shown on load). Both toggles stay in sync with their panel state and persist across re-assembles. Also flipped the **Accelerometer `Tilt X` / `Tilt Y` preset start direction**: the **first click now tilts to $-1g$** (`-64`/`0xC0`), and the second click flips to `+1g` (`+64`) — the tooltips now read "Toggle Tilt X/Y (-1g / +1g)". |
| **v23.4 (Two-Row Memory Toolbar, Segmented Byte/Word Toggle & Row Symbol Labels)** | Restructured the Memory toolbar into **two clean rows**: Row 1 = `Addr` input, the `[ Code | Data | Stack | MMIO ]` region sub-tabs and the **↻ refresh** button; Row 2 = `Rows` input and a **segmented `[ Byte | Word ]` pill** replacing the old bare "Word" checkbox (the active mode is visually highlighted). The **legend moved to its own row** with syntax highlighting that mirrors the code editor: `label` in orange (`#fab387`), `highlighted bytes` in yellow (`#ffe08f`), `Data/Stack/MMIO: editable` in blue (`#89b4fa`) and the endianness hint in cyan (`#00ffff`). The **word-mode legend** now reads *"each row = two 32-bit words · Full word (LSB to the right)"* (deliberately not called "big endian"); byte mode keeps the *"little endian (LSB to the left)"* wording. Any **code or data label** whose address falls inside a row is now annotated **directly above the word it belongs to** in orange (`.mem-row-label-anchor` stacks `.mem-row-label` over the matching word cell / 4-byte group, so with two words per row it's always clear which word a label refers to); **non-word-aligned** labels additionally expose their exact byte address via a hover tooltip. Disassembly **label names turned orange** (`#fab387`, matching the Code window and Memory view) while **pseudoinstructions in the Original-source column switched to blue** (`#89b4fa`) — a simple colour swap that frees orange exclusively for labels. The **"All panels are hidden" empty state** was de-cluttered into a compact single line with a grid icon and emphasised panel names (`.panel-stack-empty-panels`). |
| **v23.3 (Memory Byte/Word View Toggle, M-Extension Checkbox & Auto-Assemble on Load)** | Added a **Byte ↔ Word view switch** to the Memory toolbar: the classic byte view (separate editable bytes, single-click byte / double-click word edit) and a **whole-32-bit-word view** where each aligned 4-byte group renders as one 8-digit little-endian hex word with click-to-edit word cells (code segment stays read-only), ASCII column and symbol labels preserved, and a legend hint that adapts to the active mode. Added an **"Include M extension (RV32I + M — mul/div)"** checkbox to Settings → Compiler that automatically rewrites the Architecture & ABI flags between `-march=rv32im -mabi=ilp32` and `-march=rv32i -mabi=ilp32` (both reset paths restore it). Assembly programs now **auto-assemble on load** (examples, files, and the initial boot example) so **Run/Step are immediately active** and Assemble is disabled until the source is edited; editing re-enables Assemble and disables Run/Step. The **Memory view now refreshes immediately after Assemble/Compile** (previously only the Disassembly window updated) via new `updateMemoryView()`/`updateMemSubTabs()` calls in the assemble/compile success paths. |
| **v23.2 (CDN-Loaded CodeMirror 6 & Natural Mobile Panel Scrolling)** | Replaced the ~800 KB duplicated inline CodeMirror 6 bundle with a **tiny bootstrap loader** that loads the **single self-contained CM6 bundle** (`riscv_simulator_tests/cm6_bundle.min.js`, one copy of every package so `EditorState`/`StreamLanguage`/`HighlightStyle` share consistent instances) from jsDelivr, with an **automatic local fallback** to the same file when the CDN is unreachable — the app still boots 100% offline. An earlier attempt assembled `window.CM6` from separate jsDelivr ESM packages (`@codemirror/state@6.5.2`, `view@6.36.5`, `language@6.11.3`, `commands@6.9.0`, `autocomplete@6.19.1`, `@lezer/highlight@1.2.3`), but that produced **duplicate `@lezer/common`/`@codemirror/view` instances** which broke extension validation ("Unrecognized extension value") and silently killed syntax highlighting; the single-bundle loader fixes this. `riscv_simulator.html` shrank from 1.8 MB → 1.0 MB (~45% smaller). The editor bootstrap (`initCodeMirrorEditor`) now runs only after `window.CM6` is available (polling `bootSimulator`), and CM6-derived extensions are built lazily in `buildEditorExtensions()`. On **mobile (≤ 800px)** the active tab is no longer compressed by the desktop docked flex-basis logic: the JS skips inline `flex`/`height` styling in mobile mode so the active panel expands to its full natural content height (`flex: 0 0 auto; height: auto; overflow: visible`) and the **page scrolls naturally** instead of trapping content in a small inner scrollbox. The automated jsdom suites now **pre-inject** the local bundle in `beforeParse` (jsdom cannot run the CDN script fetch), preserving offline test coverage. |
| **v23.1 (Mobile Tabbed View, Splitter Clamp & Responsive 7-Segment)** | On **mobile (≤ 800px)** the panels return to a **classic tabbed view**: the chip strip becomes a mutually-exclusive tab bar showing exactly one panel at a time, with floating/grid/splitters disabled and the header ⧉/✕ controls hidden — while the mobile tab selection stays **ephemeral** so the persisted desktop dock/grid layout is never altered. If the persisted desktop layout has **all panels hidden**, the tabbed view still shows one tab (falling back to Registers) so the panel area is never empty. The **main editor/dock splitter** is now **clamped** so the code editor always keeps ≥360px (and is re-clamped on window resize), eliminating the blank space / starved-editor overflow when the dock is dragged wide or the window is shrunk. The **7-Segment display** now **scales responsively** to its panel width (SVG digits keep their 22:40 ratio via `aspect-ratio`; the `.periph-pair` wraps automatically so the display gets full width in narrow 2×2-grid cells) instead of staying a fixed 20px — no more horizontal scrolling in small fields. |
| **v23.0 (2×2 Docking Grid & Draggable Column Splitters)** | When **more than two panels are docked**, the right-side inspector now arranges them in a **2×2 grid** (2 rows × 2 columns) instead of a 4×1 stack. The dock expands to **50% of the window width** (each panel ≈ ¼ screen) and returns to the previous width when ≤2 panels are shown. Added draggable **`.panel-hsplitter`** column separators (vertical, `col-resize`) alongside the existing `.panel-vsplitter` row separators; both drag to resize and double-click to even out. Per-row heights (`panelDock.rowHeights`) and per-panel column widths (`wbasis`) persist to `localStorage`. The 3-panel case renders as 2+1 (row 1 two columns, row 2 one panel). |
| **v22.0 (Dockable & Detachable Inspector Panels)** | Replaced the mutually-exclusive right-side tab strip with **independently toggled panels**: Registers, Memory, Peripherals, and Disassembly can now be shown at the same time, **stacked vertically** in a resizable `.panel-stack` (drag the `.panel-vsplitter` between panels; double-click to even out), or **detached** into `position: fixed` floating windows that drag by their header bar and resize from any edge. Toolbar buttons became **toggle chips** with visible/floating status dots; each panel gained an injected header (`.panel-hdr`) with **⧉ float / ▣ dock** and **✕ hide** controls. Layout (shown set, order, docked heights, floating rects) persists to `localStorage` (`rvsim.panelDock.v1`); first-run layout is unchanged (Registers only). All panels refresh regardless of visibility; disassembly current-PC auto-scroll now fires in both docked and floating modes. Legacy `switchTab(name)` retained as an "ensure visible" alias. Detaching is disabled on `≤ 800px` viewports (inline accordion fallback). |
| **v21.0 (Clang Stable Compiler Default & Dual Segment Boundary Overflow Warnings)** | Set **RISC-V Clang 20.1.0 (Stable)** (`rv32-cclang2010`) as the default C compiler across UI selection, settings resets, and compiler fallback resolution. Fixed C data segment byte sizing to accurately categorize `.data`, `.rodata`, `.bss`, `.sdata`, `.sbss`, `.tdata`, `.tbss` while strictly ignoring debug info sections (`.debug_*`, `.comment`, `.note*`). Fixed false-positive overflow warnings and premature stack adjustments on small C programs. Added **Code Segment Overflow Warning** in `assemble()` when assembled instructions exceed configured `codeSize` (`0x200` / 512 B), triggering for `Circle & Accel` and `Image Display & Accel` at `-O0`. Eliminated duplicate data section warnings in C mode. |
| **v20.0 (Run Limit Fix, SPIM-Style Memory Layout & UART Console Polish)** | Fixed **Max Instructions Per Run** to correctly pause execution after the configured total instruction count (previously only controlled per-tick batch size); now uses a fixed internal `BATCH_SIZE=10,000` per JS event-loop tick for UI responsiveness. Default raised to **100,000,000**. Updated default memory layout to **SPIM-style** addresses: `.text` base `0x00400000`, `.data` base `0x10010000`, MMIO base `0xFFFF0000`; fixed a `pc >= memory.length` bounds check that immediately stopped execution at the new `.text` base — replaced with `pc >= mmioBase`. **UART Console**: simplified input-mode dropdown to **ASCII / Hex**; text input grows to fill remaining width; placeholder updates dynamically — ASCII shows `ASCII text incl. extended — \r, \n, …`, Hex shows `Comma-separated hex bytes — 0x48, 0x69, 0x0D, …`. Increased push-button gap from 4 px to 10 px. **Assembler**: confirmed no implicit alignment padding is inserted between byte-oriented directives (`.asciz`, `.byte`) and subsequent labels — addresses advance by exactly the directive's byte count, matching GAS/RARS behaviour. |
| **v19.0 (OLED Auto-Advance Mode 5, Image Display Examples & Batch Instruction Throttling)** | Implemented **OLED Auto-Advance Mode 5 (`autoadvance_row`)** for high-throughput column-major bitmap image rendering. Added pre-loaded **Image Display & Accel** examples in both C (`ImageDisplay_autoadvance_accel.c`) and Assembly (`ImageDisplay_autoadvance_accel.asm`) rendering 96x64 8-bit color bitmap graphics with dynamic accelerometer tilt responsiveness and UART logging. Added configurable **Max Instructions (Batch Limit)** setting in the Simulator Settings tab (`simMaxInstrPerCycle`, default `100,000`), allowing fine-tuning of execution chunk size for high-speed simulation without browser freezing. Expanded automated test suite with full offline precompiled verification (`test_baked_examples_full.js`, `test_sim_max_instructions_setting.js`). |
| **v18.0 (Disassembly Labels, Target Annotations, FPGA Hardware Warning & Statement Stepping)** | Added dedicated **Disassembly Label Header Rows** (`.disasm-label-row`) and **Jump/Branch Target Annotations** (`.disasm-target-label`) in both ASM and C modes. Added **FPGA Hardware Memory Notice** box in the Linker settings tab alerting users to real hardware RAM constraints and stack overflow risks. Implemented **Statement Stepping (Fast Mode)** executing all underlying machine instructions for a C statement or multi-instruction pseudo-op in a single step with 1-click step back. Relocated memory dump buttons to the simulation/config toolbar for cleaner layout balance. |
| **v17.0 (C Compilation via Godbolt, Unified Settings & Advanced Memory View)** | Integrated full C language simulation via **Compiler Explorer (Godbolt) REST API** (RV32 GCC & Clang) with bidirectional line mapping, C source-level stepping, step back, and C breakpoints. Consolidated settings into a unified 3-tab modal (**Compiler**, **Linker**, **Simulator**) with settable segment sizes and user-customizable Stack Top ($\text{Data Base} + \text{Data Size}$). Added Disassembly view auto-scroll on stepping, tabbed Memory navigation (`[ Code | Data | Stack | MMIO ]`) with **downward decreasing address ordering for the Stack tab**, read-only code memory protection, and pre-loaded C examples including `Circle_delay_accel.c`. |
| **v16.0 (Typography Contrast & 4-Row Mobile Toolbar)** | Upgraded UI typography stack to modern system UI (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) with enhanced font weights (`500`–`650`) and crisp contrast. Restructured desktop toolbar into 2 clean rows with CPI and Linker segments aligned with Stats on row 2. Restructured mobile toolbar into **4 dedicated rows** with larger touch targets (`32px` height) that never overflow when Run toggles to Resume. |
| **v15.0 (CodeMirror 6 Engine Upgrade)** | **Major Architecture Overhaul**: Upgraded editor to **CodeMirror 6** with standalone offline bundle (`window.CM6`). Implemented custom RISC-V stream tokenizer & Catppuccin Mocha theme, **interactive breakpoint gutter with highlighted line numbers alone**, **smart breakpoint snapping to next valid executable instruction**, **live floating parameter signature helper (`signatureHelpField`)**, **interactive hover tooltips (`riscvHoverTooltip`)**, **active instruction format banner in operand autocompletions**, **precision in-line `\t` Tab key insertion**, native transaction undo/redo history, and complete backward compatibility proxy facade. |
| **v12.0 – v14.0** | Intelligent UX button state lifecycle management, in-editor IntelliSense autocomplete, extended load/store pseudo-instructions, and 60 FPS visual rendering optimization. |
| **v7.0 – v11.0** | 96x64 Pixel OLED Display MMIO peripheral, 3-Axis Accelerometer & Temperature Sensor `{temp, X, Y, Z}`, System Cycle Counter (`0xFFFF00A0`), RARS `ecall` syscall engine, and mobile viewport enhancements. |
| **v1.0 – v6.0** | Basic RV32GC simulator core, two-pass assembler, non-blocking engine, Nexys 4 FPGA LEDs/DIP switches/buttons/7-segment, UART Serial Console, escape sequence parser, and double-height dual-rectangle 3D DIP switches. |

---

## Licensing note

The Verilog engine used by HDL mode consists of builds of **Icarus Verilog**, which are
derivative works under the **GPL**. They are *loaded at runtime from an external URL*,
not bundled into `riscv_simulator.html`. If you plan to redistribute a copy with the
binaries alongside it, check that this is compatible with your own licensing terms
first.

Your Verilog sources are never bundled with the page and are never uploaded anywhere —
they are compiled inside your browser and live only in that tab.
