# RISC-V Simulator — Summary

**File:** [`riscv_simulator.html`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator.html) · single-file web app · **Live:** <https://nus-cg3207.github.io/labs>

A self-contained, offline-capable **RISC-V RV32GC** assembler, C compiler front-end, emulator, and visual debugger built for the NUS **CG3207** computer architecture labs. Everything (editor engine, ISA tables, peripherals, examples) is embedded in one HTML file with zero external dependencies; C compilation optionally uses the Compiler Explorer (Godbolt) REST API but ships with precompiled offline mappings for all built-in examples.

---

## What it does

| Area | Capability |
|------|------------|
| **Editor** | Embedded CodeMirror 6 bundle (`window.CM6`). Toggles between **RV32 Assembly** and **C**, each with its own syntax highlighter, autocomplete, live signature help, and hover docs. Catppuccin Mocha dark theme. |
| **Assembler** | Two-pass assembler for RV32I + M + A + F + D + C, plus common pseudo-instructions. Emits disassembly with label header rows, jump/branch target annotations, and C source-line tags. |
| **C support** | Compiles via Godbolt (RV32 GCC / Clang, selectable `-O` level and ABI). Prepends a baremetal CRT0 shim that sets `sp`. Builds bidirectional PC↔C-line maps for source-level stepping and breakpoints. Clang 20.1.0 is the default compiler. |
| **Execution** | Non-blocking `requestAnimationFrame` loop, fixed `BATCH_SIZE = 10,000` instr/tick. Configurable run limit (`simMaxInstrPerRun`, default 100,000,000) auto-pauses infinite loops. Cycle-accurate CPI timing by instruction category. |
| **Debugging** | Run / Pause / Resume, Step, Step Back (full register+memory history), optional **Statement Stepping** (one C statement / multi-instr pseudo-op per step). Breakpoint gutter with smart snapping to the next valid instruction; highlighted breakpoint line numbers; active execution line tracking with auto-scroll. |
| **Memory view** | Tabbed `[ Code | Data | Stack | MMIO ]`. Code segment read-only; Data/Stack/MMIO editable. Stack shown in downward-decreasing address order. Little-endian word display. Code/data segment overflow warnings. Verilog `.mem` dumps (`AA_IROM.mem`, `AA_DMEM.mem`). |
| **Panel layout** | Registers / Memory / Peripherals / Disassembly are independent (not exclusive tabs): show any combination; ≤2 docked panels stack vertically, >2 form a **2×2 grid** (dock expands to half the window width) with draggable row/column splitters; detach any panel into a draggable, resizable floating window. Layout persists to `localStorage`. |
| **Settings** | One `⚙ Settings…` modal, 3 tabs: **Compiler** (toolchain, `-O`, march/mabi), **Linker** (segment bases/sizes, stack top, MMIO base — SPIM-style defaults), **Simulator** (statement stepping, run limit, per-category CPI). |

---

## Memory layout (SPIM-style defaults)

| Segment | Base | Size |
|---------|------|------|
| `.text` (code) | `0x00400000` | `0x200` (512 B / 128 instr) |
| `.data` | `0x10010000` | `0x200` |
| Stack top (`sp`) | `0x10010200` | (Data base + Data size; customizable) |
| MMIO base | `0xFFFF0000` | — |

## MMIO map (Nexys 4 board simulation)

| Address | Access | Symbol | Purpose |
|---------|--------|--------|---------|
| `0xFFFF0000` / `0xFFFF0004` | RO | `UART_RX_VALID` / `UART_RX` | Serial receive status + data (pop on read) |
| `0xFFFF0008` / `0xFFFF000C` | RO / WO | `UART_TX_READY` / `UART_TX` | Serial transmit status + data |
| `0xFFFF0020`–`0xFFFF002C` | WO | `OLED_COL/ROW/DATA/CTRL` | 96×64 pixel OLED; `CTRL[3:0]` advance mode, `CTRL[7:4]` color format (8/16/24-bit) |
| `0xFFFF0040` / `0xFFFF0044` | RO | `ACCEL_DATA` / `ACCEL_DREADY` | Packed `[31:24]=Temp, [23:16]=X, [15:8]=Y, [7:0]=Z`, all 8-bit signed |
| `0xFFFF0060` / `0xFFFF0064` | WO / RO | `PERIPH_LED` / `PERIPH_DIP` | 16 output LEDs / 16 DIP switches |
| `0xFFFF0068` | RO | `PERIPH_PB` | Push buttons (bit 2 = BTNL, 1 = BTNC, 0 = BTNR) |
| `0xFFFF0080` | WO | `PERIPH_SEVENSEG` | 32-bit value → 8 hex digits on 7-segment |
| `0xFFFF00A0` | RO | `CYCLECOUNT` | Total instruction cycles since reset |

Peripheral panel also renders the OLED canvas (3× scale), accelerometer sliders with presets (Flat / Tilt X / Tilt Y / Shake / Zero), a UART console with ASCII/Hex I/O modes and configurable RX delay, and the LED / DIP / button / 7-segment board.

---

## Example programs (19 built-in)

**C (8):** Basic Sum, Factorial (recursive), Fibonacci, Array Search, 2×2 Matrix Multiply, MMIO Peripherals, Circle & Delay + Accel (`Circle_delay_accel.c`), Image Display + Accel (`ImageDisplay_autoadvance_accel.c`).

**Assembly (11):** basic sum, RARS syscalls demo, Fibonacci, Factorial (`5! = 120`), array loop, I/O + M-extension, DIP→LED, Hello World (UART), Hello World with `jal`/`jalr`, Circle + Accel, Image Display + Accel.

All C examples carry embedded precompiled Godbolt assembly so they run fully offline.

---

## ISA & syscalls

- **RV32I** base + **M** (mul/div), **A** (atomics), **F/D** (single/double float), **C** (compressed), plus pseudo-instructions (`li`, `la`, `mv`, `j`, `call`, `ret`, `beqz`, …).
- 32× integer registers `x0`–`x31` (`x0` hardwired 0, `sp` starts at 0), 32× float registers `f0`–`f31`, `PC`.
- **RARS `ecall` services:** print int/float/double/string/char/hex/binary/unsigned (1–4, 11, 34–36), read int/float/double/string/char (5–8, 12), `sbrk` (9), `MilliSleep` (40), `Exit` / `Exit2` (10 / 93).

## Key shortcuts

| Key | Action |
|-----|--------|
| `F5` | Run / Pause / Resume |
| `F8` / `Shift+F8` | Step forward / Step back |
| `F9` | Toggle breakpoint at cursor line |
| `Ctrl/Cmd+Enter` | Assemble / Compile |
| `Ctrl/Cmd+S` | Save source (`.asm` / `.c`) |
| `Ctrl+Space` | Trigger autocomplete |
| `Ctrl/Cmd+F` / `Ctrl/Cmd+H` | Find / Replace |
| `Tab` / `Shift+Tab` | Insert `\t` or indent / dedent selection |

---

## Tests

Node-based harness in [`riscv_simulator_tests/`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests) covering: full system integration, Godbolt C compilation + line mapping, all 19 baked examples, statement stepping, run-limit throttling, disassembly labels & warnings, disassembly machine-code Byte/Word & binary grouping, image-display rendering parity (ASM vs C), Tab/autocomplete behavior, breakpoint snapping & highlight, RV32GC instruction coverage (90+), multi-step execution correctness, dockable-panel 2×2 grid layout, and mobile on-screen-keyboard focus preservation.

---

## Current version

**v23.7** — Disassembly machine-code binary grouping + LSB hint, and panel-grid layout fixes:
- **Binary machine code groups each byte's 8 digits together**: in the Disassembly Machine-code column, binary output now keeps the **8 binary digits of a byte contiguous** — **Byte mode** renders separate bytes (`xxxxxxxx xxxxxxxx …`, space-separated, in memory order) and **Word mode** renders one whole 32-bit word with its bytes **underscore-separated** (`xxxxxxxx_xxxxxxxx_xxxxxxxx_xxxxxxxx`). Hex output is unchanged: bytes are space-separated in Byte mode (`xx xx xx xx`) and a single 8-digit word in Word mode.
- **"LSB to the left / LSB to the right" hint**: the Disassembly toolbar now shows a cyan **LSB hint** beside the `[ Byte | Word ]` pill — **`LSB to the left`** in Byte mode (bytes in memory order) and **`LSB to the right`** in Word mode (one whole little-endian word) — matching the Memory-view endianness legend.
- **No mid-byte wrapping**: the machine-code cell CSS no longer uses `word-break: break-all` (which could split a byte's digits across rows); it now wraps only at byte boundaries so the bytes stay readable while remaining responsive on narrow panels.
- **3-panel grid no longer leaves a blank 4th cell**: with exactly 3 visible panels the 2×2 grid's second row holds only the third panel, which now **stretches across the full row width** (a persisted column width no longer keeps it narrow). A `.panel-dock-row-single` rule enforces `flex: 1 1 0` for the lone panel.
- **Main-splitter drag no longer shifts the panels area**: the dock width is no longer re-forced up to 50% on every relayout (`updateDockWidthForGrid` no longer uses a grow-only `Math.max(current, target)`), and `.right-panel` now allows shrinking below its content width (`min-width: 0`). Dragging the main splitter resizes the panel columns responsively instead of moving the whole panels area left / leaving blank space on the right.
- New regression suites: `riscv_simulator_tests/test_disassembly_machine_code.js` and 7 new grid-layout assertions in `riscv_simulator_tests/test_panel_grid.js`.

**v23.6** — UART hex-mode & mobile keyboard fixes:
- **Hex input now parses as hex**: in Hex mode, comma-separated bytes like `0x41, 0x0d` (or bare `41, 0d`, or `69h`) are interpreted as hex bytes, so `0x41, 0x0d` transmits the same bytes as `A\r`. Non-hex / >0xFF tokens are skipped.
- **Hex output display persists**: the terminal renders UART_TX output as `0xHH` bytes in Hex mode and **stays hex** across program-run batches, stepping, mode toggles, and resets (previously `updatePeripherals()` snapped the display back to ASCII). Switching to ASCII re-renders the same bytes as raw text.
- **Mobile keyboard stays open**: the transmit field now uses `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="send"`, and the global F5/F8/F9/Ctrl+Enter/Ctrl+S shortcuts are suppressed while any form field is focused — so typing into the UART console (or any input) is not interrupted on phones. **v23.6 hardening**: when the Android soft keyboard opens/closes it fires a `window` `resize` (visual viewport); the panel-layout `resize` handler now **skips relayout entirely while a form field is focused**, and `applyPanelDock()` **captures and restores the focused field + caret** after any relayout — so the keyboard is never dismissed by panel reflow mid-typing. New regression suite: `riscv_simulator_tests/test_mobile_keyboard_focus.js`.

**v23.5** — Disassembly machine-code Byte/Word toggle (Word default), Word default for Memory, and accelerometer tilt start direction:
- **Disassembly machine-code `[ Byte | Word ]` toggle**: a **segmented `[ Byte | Word ]` pill** in the Disassembly toolbar (same styling as the Memory toggle) switches the **Machine-code** column between the classic separate bytes (`xx xx xx xx`) and one **whole 8-digit little-endian 32-bit hex word** per 4-byte chunk. **Word is the default**.
- **Word is the default everywhere**: the **Memory view also opens in Word mode** on load (Word button pre-highlighted, word-mode legend shown).
- **Accelerometer `Tilt X` / `Tilt Y` first click is now $-1g$**: the first click tilts the selected axis to `-64` (`0xC0` = $-1g$), the second flips to `+64` (`+1g`), repeating alternately; the button tooltips read "Toggle Tilt X/Y (-1g / +1g)".

**v23.4** — Streamlined Memory-view toolbar & legend:
- **Two-row Memory toolbar**: Row 1 = `Addr` + `[ Code | Data | Stack | MMIO ]` + **↻ refresh**; Row 2 = `Rows` + a **segmented `[ Byte | Word ]`** display-mode toggle (a two-button pill with the active mode highlighted, replacing the old bare checkbox).
- **Word-mode legend**: when Word view is active the legend shows *"each row = two 32-bit words · Full word (LSB to the right)"* (never called "big endian" — RISC-V is little-endian); byte mode keeps *"groups of 4 bytes = one 32-bit little endian (LSB to the left) word"*. The little-endian hint stays cyan.
- **Legend as its own row** with syntax highlighting mirroring the code editor: `label` in **orange** (`#fab387`), `highlighted bytes` in **yellow** (`#ffe08f`), `Data/Stack/MMIO: editable` in **blue** (`#89b4fa`).
- **Code/data symbol labels**: any label whose address falls inside a row is anchored **directly above the word it belongs to** in orange (`mem-row-label` + `mem-row-label-anchor`), so with two words per row it's always clear which word the label refers to (e.g. `main` above the first word on the `0x00400000` row). **Non-word-aligned** labels (e.g. a `.byte`/`.asciz` symbol at `+2` inside a word) show their exact byte address in a hover tooltip. Disassembly **label names now also orange** (`#fab387`, matching the Code window / Memory view) and **pseudoinstructions in the Original-source column are blue** (`#89b4fa`) — a colour swap freeing orange exclusively for labels.
- **Cleaner empty state**: the "All panels are hidden" hint is now a compact single line with a grid icon and emphasised panel names (no more `<br>`-cluttered two-liner).

**v23.3** — Memory byte/word view toggle, M-extension compiler checkbox, and auto-assemble on load:
- **Memory View toggle**: a **segmented `[ Byte | Word ]`** control in the Memory toolbar flips between the classic separate-editable-bytes view (single-click byte edit, double-click word edit) and a **whole-32-bit-word view** where each aligned 4-byte group renders as one 8-digit little-endian hex word. Word cells are click-editable via the word overlay (code segment stays read-only), ASCII column and symbol labels are preserved, and the legend hint updates to match the active mode.
- **Compiler options — M extension checkbox**: Settings → Compiler now has a tiny **"Include M extension (RV32I + M — mul/div)"** checkbox (checked by default) that automatically rewrites the Architecture & ABI flags text box between `-march=rv32im -mabi=ilp32` and `-march=rv32i -mabi=ilp32`. Both "Reset Defaults" paths restore the checkbox.
- **Auto-assemble on load**: loading an example or file (and the initial boot example) now assembles immediately in ASM mode, so **Run and Step are active right away** and the **Assemble button is disabled** until the source is edited. Editing the code re-enables Assemble and disables Run/Step. The **Memory (code/data) view now refreshes immediately** after Assemble/Compile (previously only the Disassembly window updated).

**v23.0** — 2×2 docking grid: when more than two inspector panels are docked they arrange in a 2×2 grid (2 rows × 2 columns) and the dock expands to half the window width; draggable column (`.panel-hsplitter`) and row (`.panel-vsplitter`) separators resize the grid, with row heights and column widths persisted.

**v22.0** — Dockable/detachable inspector panels: Registers, Memory, Peripherals, and Disassembly are no longer mutually-exclusive tabs; they can be stacked in the side column or torn off into floating windows, with layout persisted to `localStorage`.

**v21.0** — Clang 20.1.0 stable as default compiler; accurate C data-segment sizing (ignores debug sections); fixed false-positive overflow warnings on small programs; code-segment overflow warning in `assemble()`; removed duplicate C data-section warnings.

See §12 of [`riscv_simulator.md`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator.md) for the full v1–v22 changelog and the exhaustive specification.
