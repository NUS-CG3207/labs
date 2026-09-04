# RISC-V Simulator — Test Suites

This directory contains the automated test suites, bundling tools, and generator utilities for **[riscv_simulator.html](../riscv_simulator.html)** and **[riscv_simulator.md](../riscv_simulator.md)**.

---

## 📦 Prerequisites & Required Node Modules

To keep the repository clean and lightweight, `node_modules/` is **not** committed to Git. The dependencies needed to run the test suite or rebuild the bundle are:

### 1. Test Dependencies (Required for Running Tests)
- **`jsdom`** (`^24.0.0`): Headless DOM & HTML5 Canvas environment for executing browser scripts and testing CodeMirror 6 in Node.js.

```bash
# Install test dependencies
npm --prefix riscv_simulator_tests install
# or
cd riscv_simulator_tests && npm install
```

### 2. Build Dependencies (Optional — only if recompiling the CodeMirror 6 bundle from scratch)
- **`esbuild`** (`^0.20.0`): Fast bundler used to compile `cm6_entry.js` into `cm6_bundle.min.js`.
- **CodeMirror 6 Packages**:
  - `@codemirror/state`
  - `@codemirror/view`
  - `@codemirror/language`
  - `@codemirror/commands`
  - `@codemirror/search`
  - `@codemirror/autocomplete`
  - `@lezer/highlight`

> **Note**: `cm6_bundle.min.js` is already bundled and committed here, so `esbuild` and the `@codemirror/*` packages are **not** needed to run the tests.

---

## 📋 Quick Test Commands

```bash
# 1. Install dependencies (first time only)
cd riscv_simulator_tests && npm install

# 2. Run everything (all 18 suites, sequentially)
npm test
# or from the repo root:
npm --prefix riscv_simulator_tests test

# 3. Run one suite
npm run test:hdl          # or any other script in package.json
node riscv_simulator_tests/test_hdl_mode.js
```

Every suite in this directory is wired into `npm test`. There is no build step:
`riscv_simulator.html` is edited directly.

---

## 📂 Detailed File-by-File Documentation

### 1. `test_comprehensive_suite.js` — End-to-End System & Peripheral Integration Test
- **Purpose**: Validates full system integration across all layers of the simulator (CodeMirror 6 editor, assembler, CPU execution engine, stepping, Find & Replace, read-only memory protection, and Nexys 4 FPGA Board MMIO peripherals).
- **Test Scenarios & Assertions**:
  1. **Editor Proxy Facade**: Verifies bidirectional synchronization between `window.editor.value`, `selectionStart`, `selectionEnd`, and CodeMirror 6's document state.
  2. **In-Line Tab Precision**: Verifies pressing `Tab` at a collapsed cursor inserts a literal `\t` without auto-indenting or shifting the line.
  3. **Breakpoint Gutter & Snapping**: Tests setting a breakpoint on non-instruction lines (comments/directives) and verifies automatic snapping to line 5 (`li x1, 10`).
  4. **Two-Pass Assembler**: Confirms assembly of the `basic` example produces valid machine code with 0 errors.
  5. **Stepping & State History**: Single steps forward (`F8`), verifies register updates (`x1 = 10`), checks `currentExecLine = 6`, and executes `stepBack()` (`Shift+F8`) to confirm previous state restoration (`x1 = 0, PC = 0x00400000`).
  6. **All Pre-Loaded Examples**: Assembles all 5 standard built-in programs (`basic`, `fib`, `fact`, `loop`, `circle_accel`) with zero syntax or translation errors.
  7. **In-Editor Find & Replace**: Tests search match counting (`1/3` matches for `ecall`), single replacement (`replaceCurrent()`), and replace-all (`replaceAll()`).
  8. **Nexys 4 FPGA Board MMIO**: Tests memory reads/writes for LEDs (`0xFFFF0060`), 7-Segment SVG display (`0xFFFF0080`), 3-Axis Accelerometer (`0xFFFF0040`), and Cycle counter (`0xFFFF00A0`).
  9. **Memory Protection**: Verifies Code segment (`0x00400000`) is strictly read-only while Data (`0x10010000`), Stack, and MMIO regions are editable.
- **Run Command**: `node riscv_simulator_tests/test_comprehensive_suite.js`

---

### 2. `test_baked_examples_full.js` — Heaviest Built-in Examples, End to End
- **Purpose**: Compiles, assembles and runs the four most demanding built-in examples — two in Assembly, two in C — to the point where their output is visible on the peripherals.
- **Test Scenarios & Assertions**:
  - Tests `circle_accel` (ASM) and `circle_accel_c` (C): verifies pixel writes on 96x64 OLED display and UART terminal output (`"Tilt in various directions to see the colour change\r\n"`).
  - Tests `image_display_accel` (ASM) and `image_display_c` (C): verifies Mode 5 auto-advance rendering of 6,144 pixels and UART telemetry (`"Tilt X to observe the effect\r\n"`).
- **Run Command**: `node riscv_simulator_tests/test_baked_examples_full.js`

---

### 3. `test_c_godbolt_simulation.js` — Compiler Explorer (Godbolt) C Compilation Pipeline
- **Purpose**: Verifies online Godbolt REST API compilation, CRT0 startup shim injection, bidirectional source-to-assembly line mapping, C breakpoints, and C variable inspection across standard C examples (`basic_c`, `factorial_c`, `fibonacci_c`, `loop_c`, `matrix_c`, `peripherals_c`).
- **Run Command**: `node riscv_simulator_tests/test_c_godbolt_simulation.js`

---

### 4. `test_new_c_simulation.js` — Advanced C Simulation & Peripheral Integration Test
- **Purpose**: Tests simulation of the complex C examples (`Circle_delay_accel.c`, `ImageDisplay_autoadvance_accel.c`), against both live Godbolt output and a response injected by the harness, verifying midpoint circle drawing, OLED Mode 5 auto-advance row-major rendering, accelerometer sensor polling, and 7-segment display output.
- **Run Command**: `node riscv_simulator_tests/test_new_c_simulation.js`

---

### 5. `test_statement_stepping.js` — Statement-Level Stepping & Step Back Test
- **Purpose**: Verifies **Statement Stepping (Fast Mode)** in both C and Assembly modes.
- **Test Scenarios & Assertions**:
  - Asserts that stepping forward (`F8`) advances through all machine instructions belonging to the active C statement or multi-instruction pseudo-op in a single discrete step.
  - Asserts that stepping back (`Shift+F8`) restores all CPU registers, memory, and highlighted source lines in a single step.
- **Run Command**: `node riscv_simulator_tests/test_statement_stepping.js`

---

### 6. `test_sim_max_instructions_setting.js` — Simulation Batch Limit & Settings Sync Test
- **Purpose**: Verifies the **Max Instructions / Batch (UI Cycle)** configuration in the Simulator Settings tab.
- **Test Scenarios & Assertions**:
  - Confirms default value of `100,000` (`#simMaxInstrPerCycle`).
  - Tests modal synchronization when opening settings, applying custom values (e.g. `50,000`), and resetting defaults.
  - Verifies runtime execution throttling with custom batch chunk sizes.
- **Run Command**: `node riscv_simulator_tests/test_sim_max_instructions_setting.js`

---

### 7. `test_disassembly_labels_and_warnings.js` — Disassembly Labels & Linker Notice Test
- **Purpose**: Verifies disassembly formatting, label header rows (`.disasm-label-row`), jump/branch target annotations (`.disasm-target-label`), and the FPGA Hardware Memory Notice in the Linker settings tab.
- **Run Command**: `node riscv_simulator_tests/test_disassembly_labels_and_warnings.js`

---

### 8. `test_reset_and_image_display.js` — Reset Override & OLED Mode 5 Rendering Test
- **Purpose**: Tests that pressing Reset halts any running infinite loop simulation and returns cleanly to ready state. Validates pixel-for-pixel accuracy of OLED Mode 5 auto-advance rendering between C and Assembly implementations.
- **Run Command**: `node riscv_simulator_tests/test_reset_and_image_display.js`

---

### 9. `test_tab_and_autocomplete.js` — Tab Key & IntelliSense Autocomplete Test
- **Purpose**: Focuses on CodeMirror 6 keyboard event handling, custom Tab indentation rules, operand-locked autocomplete documentation, and dynamic parameter signature highlighting.
- **Run Command**: `node riscv_simulator_tests/test_tab_and_autocomplete.js`

---

### 10. `test_breakpoint_highlight_and_snap.js` — Breakpoint Snapping & Line Number Highlight Test
- **Purpose**: Verifies that setting breakpoints on non-instruction lines (comments, directives, labels) snaps to the next executable instruction, and verifies visual gutter styling (line number highlight alone without line background tint).
- **Run Command**: `node riscv_simulator_tests/test_breakpoint_highlight_and_snap.js`

---

### 11. `test_jsdom.js` — DOM Lifecycle, Stepping & UI Simulation Test
- **Purpose**: Simulates a complete headless browser session using JSDOM to test DOM structure, editor rendering, stepping, breakpoints, and example loading.
- **Run Command**: `node riscv_simulator_tests/test_jsdom.js`

---

### 12. `test_all_instructions_v2.js` — Full RV32GC Instruction Set Assembler Coverage
- **Purpose**: Verifies that the assembler correctly translates all 90+ supported instructions and pseudo-ops across RV32I, RV32M, RV32A, RV32F, RV32D, and RV32C extensions without syntax errors.
- **Run Command**: `node riscv_simulator_tests/test_all_instructions_v2.js`

---

### 13. `test_execution_programs.js` — Algorithmic Simulation Execution Test
- **Purpose**: Validates multi-step CPU execution, branch resolution, arithmetic correctness, and register state across Factorial ($5! = 120$) and Fibonacci ($F_9 = 34, F_{10} = 55$).
- **Run Command**: `node riscv_simulator_tests/test_execution_programs.js`

---

### 14. `test_mobile_keyboard_focus.js` — Mobile On-Screen Keyboard Focus Preservation
- **Purpose**: Regression test for the mobile UART console keyboard issue. When the on-screen soft keyboard opens/closes on Android it fires a `window` `resize` (the visual viewport shrinks). This test verifies that while a form field (UART input, memory box, find/replace) is focused:
  - A `resize` event does **not** relayout the panel stack (the guarded resize handler returns early), so the focused input keeps focus and the keyboard stays open.
  - If `applyPanelDock()` *does* run for any other reason, it captures the active form field + caret position before moving panels and restores both afterwards.
  - Resizing with a non-form focus (e.g. a `<button>`) still performs the normal panel relayout.
- **Run Command**: `node riscv_simulator_tests/test_mobile_keyboard_focus.js`

---

### 15. `test_disassembly_machine_code.js` — Disassembly Machine-Code Byte/Word & Binary Rendering
- **Purpose**: Regression test for the Disassembly **Machine-code** column:
  - **Word mode** renders one whole 8-digit little-endian hex word per 4-byte chunk; **Byte mode** renders separate space-separated hex bytes in memory order.
  - **Binary mode** groups the 8 digits of each byte together and separates bytes with **spaces in Byte mode** and **underscores in Word mode** (so a byte's digits are never split across rows).
  - The toolbar **`LSB to the left` / `LSB to the right`** hint updates with the active mode.
  - The `Byte`/`Word` toggle buttons stay in sync, and the CSS no longer forces mid-byte wrapping.
- **Run Command**: `node riscv_simulator_tests/test_disassembly_machine_code.js`

---

### 16. `test_instruction_semantics.js` — Instruction Execution Semantics (136 cases)
- **Purpose**: For every instruction, run it and check the answer. `test_all_instructions_v2.js` only proves a long program assembles without errors; this one proves the result is right, which exercises **encoder → machine code → decoder → execution** end to end. The encoder and the interpreter are separate code paths, so a mistake in either shows up as a wrong number.
- **Covers**: all of RV32I (register-register, register-immediate, the upper-immediate pair, every load and store width with its sign- or zero-extension, all six branches, `jal`/`jalr`/`call`/`ret`), the M extension including division by zero and the sign of `rem`, `x0` semantics, and the pseudo-instructions.
- **Expected values are worked out from the RISC-V spec**, not read off the simulator — a check that agrees with the implementation by construction tests nothing.
- **Boundary cases are deliberate.** The suite was mutation-tested: 12 seeded faults (`SRAI` made logical, `SLTI`'s `<` made `<=`, `BGE`'s `>=` made `>`, `SUB` encoded with `ADD`'s funct7, `XORI` as `ORI`, `BLTU` as `BLT`, `LHU` sign-extending, `mv`/`neg`/`snez`/`sgtz`/`seqz` expansions corrupted). Two initially slipped through — `SLTI` and `seqz`, both because no case sat on the boundary — and cases were added until all 12 were caught.
- **Run Command**: `npm run test:semantics`

---

### 17. `test_hdl_mode.js` — HDL Simulation Mode, End to End (159 assertions)
- **Purpose**: The only suite that drives real external tooling. It loads the page, assembles through the normal assembler, asks the page for the artefacts it would hand to Icarus (the generated testbench, the memory images, the stimulus files), then runs the **real** Icarus/WASM pipeline over the unmodified `RV/*.v` sources.
- **Covers**: settings layout, engine toggle, register-file discovery (including after the module, instance and array are all renamed), synthesis lint, post-synthesis plumbing, compiler-setting invalidation, the program-independent testbench, MMIO timing in both directions, breakpoints and Resume, `UART_RX_valid` behaviour, and Statement Stepping through the recording.
- **Requires**: the `RV/` sources, which are gitignored — the engine-backed sections skip cleanly without them.
- **Run Command**: `npm run test:hdl`

---

### 18. `test_panel_grid.js` sections [16]–[18] — Intra-panel Column-Resize Separators & Column Sizing
- **Purpose**: Regression coverage for the per-column `.col-resizer` separators and the `PANEL_COLS`/`applyPanelColLayout()` sizing model (also part of the 2×2 grid suite):
  - **[16]** All three panels freeze their header row (`position: sticky`), Disassembly's is a real `<thead>`, Memory's columns read `Addr` / `Content (Hex)` / `Content (ASCII)`, and `.col-resizer` separators exist for **Registers** (3: `#`, `Name`, `Value (Hex)`), **Memory** (2: `Addr`, `Content (Hex)`, in the `.mem-col-header` bar), and **Disassembly** (3: `Addr`, `Machine code`, `Native instruction`) but **not** for **Peripherals** (deliberately untouched).
  - **[17]** Both tables carry a 4-`<col>` `<colgroup>` and every column gets an explicit px width; `Addr`/`Machine code` sit at their content-sized widths. With the panel body's `clientWidth` stubbed to a real value, widening the panel **does not stretch** `Addr`/`Machine code` while `Native`+`Source` absorb the surplus **equally**; a too-narrow panel holds the natural widths and scrolls via the table's `min-width` instead of crushing a column. Guards the `width: 1%` regression that collapsed the last two columns while ballooning the first two.
  - **[18]** Dragging a separator resizes only that column while the columns to its right keep their widths (spreadsheet behaviour) and the table's `min-width` grows with it; the first move pins the whole row; a click without dragging pins nothing; double-click clears every pinned width for the panel. Also covers Memory's `--mem-*-w` custom properties staying in sync between the data rows and the header bar (shared `min-width` so they scroll together) and the `Content (Hex)` column being clamped to its floor rather than draggable back over the hex data.
- **Run Command**: `node riscv_simulator_tests/test_panel_grid.js`

---

## 🛠️ The CodeMirror bundle

### `cm6_bundle.min.js` & `cm6_entry.js`
- **`cm6_entry.js`**: Source entrypoint that imports CodeMirror 6 and Lezer modules and attaches them to `window.CM6`.
- **`cm6_bundle.min.js`**: Minified single-file IIFE bundle created with esbuild (`esbuild cm6_entry.js --bundle --minify --outfile=cm6_bundle.min.js`). Contains zero external dependencies and runs 100% offline.


---

## 🌐 examples/ and the Godbolt cache

Every example but `dip_led` / `dip_led_c` lives outside `riscv_simulator.html` entirely, in
[`../examples/`](../examples/) (`asm/*.asm`, `c/*.c`) — the page `fetch()`es one when
it is selected. jsdom has no `fetch`, so two shims stand in for it:

- **`examples_fetch.js`**: `installExamplesFetch(win)` patches `window.fetch` to serve
  `examples/asm/*` and `examples/c/*` straight off disk, so `win.loadExample(name)`
  works under test exactly as it would over `http://`. Install it before any
  `loadExample()` call for anything but `dip_led` / `dip_led_c` — those two are still
  baked into the page, so they need no shim and no `await` either.
- **`godbolt_cache.json` / `godbolt_cache.js`**: Godbolt's compiler output for the
  eleven C examples, captured once, so C mode's live-compile path — also unreachable
  under jsdom — doesn't have to run under test. `installGodboltCache(win)` feeds the
  captured output in through the page's `window.__mockGodboltResponse` hook, matching
  the incoming source against `examples/c/*.c` read fresh off disk, and is keyed by
  **filename**, not example name, since that is the only identity the page and the
  test both still agree on now that `window.cExamples` is gone. This data used to be
  embedded in `riscv_simulator.html` as `cPrecompiled` (379 KB, a third of the file);
  it moved to a `cExamples`-keyed cache in v24.6, then to this filename-keyed one in
  v24.10 when the examples themselves left the page. **After editing a C example,
  refresh its entry**, or its suite runs against stale assembly: POST
  `examples/c/<file>.c` to `https://godbolt.org/api/compiler/rv32-cclang2010/compile`
  and store the response under that filename in `godbolt_cache.json`. This is *only*
  for compiling a C example, not for loading its source — `dip_led_c` still needs an
  entry here despite being baked, since baking only skips the fetch, not Godbolt.

Both `async` — `loadExample()` fetches, and C-mode `assembleOnly()` calls Godbolt (or
the mock) — so every call to either for a non-baked example, or in C mode, needs
`await`.