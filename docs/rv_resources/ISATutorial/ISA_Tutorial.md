# Chapter 3A — RISC-V ISA

**Rajesh Panicker** · ECE, NUS · CG3207

---

!!! note "How to use these notes"

    - Not all slides will be covered in the lecture. The rest are left as a
      self-learning exercise.
    - Those in CAPS are ARM instructions / mnemonics, given for comparison.
    - Please ensure that you know the ARM instruction set first (covered in
      EE2028 / CG2028), as a lot of references and comparisons are made.

## Contents

<div class="grid cards" markdown>

- **[Background](background.md)** — architecture vs microarchitecture, RISC-V
  history, features, and the base instruction groups.
- **[Registers](registers.md)** — the 32 integer registers, the ABI names, `x0`,
  the PC, port limits, and the absence of flags.
- **[Instruction Formats](formats.md)** — R, I, S, B, U, J and how immediates
  are assembled by the Extend unit.
- **[Data Processing](dp-instructions.md)** — register, immediate and upper
  immediate instructions, `li` / `la`, and the M extension.
- **[Memory](memory-instructions.md)** — loads, stores, pseudoinstructions, and
  sign/zero extension.
- **[Control](control-instructions.md)** — conditional branches, `jal`, `jalr`,
  and how offsets are encoded.
- **[Assembly](assembly.md)** — selection, iteration, and function calls with
  the RISC-V calling convention.
- **[ISA Designer's Dilemma](isa-design.md)** — why the B-type immediate looks
  the way it does.

</div>

## Links and references

- Some tables are based on the work by (c) James Zhu. Modifications/corrections
  have been made to the original tables. The modified LaTeX files are available
  on request.
- [RISC-V reference card](https://git.tu-berlin.de/j.koeppeler/riscv_tool/-/blob/master/riscvcard_large.pdf)
  — a fantastic reference card, which is almost all we need.
- [RISC-V official specifications](https://raw.githubusercontent.com/mjosaarinen/rvvkeccak-dev/refs/heads/main/riscv-spec.pdf)
- [Wikipedia article on RISC-V](https://en.wikipedia.org/wiki/RISC-V) — has lots of info.
- [riscv.org](https://riscv.org) — the RISC-V website.

---

*Coming next: Single-cycle microarchitecture.*
