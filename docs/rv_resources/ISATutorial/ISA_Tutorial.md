# RISC-V ISA Tutorial

A quick run-through to get you writing RISC-V assembly fast if you already
know ARMv7M. Full reference pages following CG3207 slides can be found on the left menu.

## The RISC-V mental model

- **Load/store architecture** — Only `lw` and `sw` touch memory. Every other
  instruction operates purely register-to-register/ immediate; there's no mixing of
  memory access with computation or branching.
- **No flags register** — Compare and branch are fused into one instruction:
  `beq`, `bne`, `blt`, `bge`, … There is no separate `CMP` — the comparison
  happens inside the branch itself.
- **≤ 2 source registers, ≤ 1 destination** — Every instruction reads at
  most two registers and writes at most one. This is why there's no
  `LDM`/`STM`, no `PUSH`/`POP`, no pre/post-index, single-instruction long multiplies, and no multiply-accumulate — and why the ISA
  stays simple and regular.

---

## Registers

| Group | Range | Use |
|---|---|---|
| **Special** | `x0, x1–x4` | `zero · ra · sp · gp · tp` — fixed roles, not general-purpose scratch |
| **Temporaries** | `t0–t6` | Caller-saved scratch registers. Free to clobber; a called function may overwrite them |
| **Saved** | `s0–s11` | Callee-saved. A function that uses these must restore them before returning |
| **Arguments** | `a0–a7` | Function arguments and return values. Caller-saved |

- **`x0` is hardwired to 0** — reads always return 0; writes are ignored.
  It's how `mv` and other conveniences are synthesized from `add`.
- **There is no visible PC** — unlike ARM's `R15`, the PC can't be read or
  written directly; only touched via `auipc`, `jal`, `jalr`, and branches.

Full ABI table and details: [Registers](registers.md).

---

## Instruction syntax

=== "Data processing & memory"

    ```asm
    add  t0, t1, t2   # t0 = t1 + t2   (data processing register type)
    addi t0, t0, 1    # t0 = t0 + 1    (data processing register immediate type)
    lw   t0, 0(s0)    # t0 = Mem[s0+0] (memory read)
    sw   t0, 4(s0)    # Mem[s0+4] = t0 (memory write)
    ```

    `addi`/`lw`/`sw` take a plain immediate — *no* leading `#`, unlike ARM.

=== "Branch vs. jump vs. jump-register"

    | Instr. | Example | Cond.? | Links? | Target |
    |---|---|:---:|:---:|---|
    | **Branch** | `blt t0,t1,LBL` | Yes | No | Label |
    | **Jump** — `jal` | `jal ra, LBL` | No | Yes (rd) | Label |
    | **Jump-reg** — `jalr` | `jalr ra,0(t0)` | No | Yes (rd) | Reg + offset |


!!! tip "Rule of thumb"

    Branches ask a question and can go either way - taken or not taken; `jal`/`jalr`
    is always taken, and can remember where they came from (link).

Full instruction tables: [Data Processing](dp-instructions.md) ·
[Memory](memory-instructions.md) · [Control](control-instructions.md).

---

## Constants and addresses

=== "lui"

    **`lui` — load upper immediate**

    ```asm
    lui  rd, imm20   # rd = imm20 << 12
    ```

    Sets bits `[31:12]` of `rd` directly; the lower 12 bits are cleared. The
    only base instruction that writes a register's upper bits.

=== "auipc"

    **`auipc` — add upper immediate to PC**

    ```asm
    auipc rd, imm20  # rd = PC + (imm20 << 12)
    ```

    Builds a PC-relative base address, 4 KiB-page at a time — RISC-V's
    mechanism for position-independent addressing.

!!! info "No ARM equivalent"

    ARM builds large constants via a PC-relative load
    (`LDR Rd, =const`), where the `const` can be a number or an address (label). In RISC-V, every 32-bit
    number or address is built from `lui`/`auipc` + `addi`.

=== "li (for numbers) expansion"

    ```asm
    li rd, imm   →   lui  rd, imm[31:12]
                      addi rd, rd, imm[11:0]
    ```

    *(li emits just addi if the constant fits in 12 bits)*

=== "la (for PC-relative addresses) expansion"

    ```asm
    la rd, LBL   →   auipc rd, Δ[31:12]
                      addi  rd, rd, Δ[11:0]
    ```

    *(Δ is PC-relative, so the code stays position-independent)*

---

## Putting it together

=== "Selection (if / else)"

    ```asm
        blez t0, else    # if x <= 0
        addi t1, t1, 1   # y++
        j    endif
    else:
        addi t1, t1, -1  # y--
    endif:
    ```

=== "Iteration (for loop)"

    ```asm
        li   t0, 10       # count = 10
    loop:
        beqz t0, done     # continue if count > 0; exit if count == 0
        addi t0, t0, -1   # count--
        j    loop
    done:
    ```

=== "Function call (add2();)"

    ```asm
    # caller
        li   a0, 4         # arg0
        li   a1, 7         # arg1
        call add2          # result = add2(arg0, arg1);
        # result in a0
        # rest of the caller statements, with a jump at the end
        
    add2:  # callee
        add  a0, a0, a1
        ret
    ```

!!! success "Notice"

    All three patterns use only branches, jumps, and plain register moves —
    no stack, no flags, no hidden state.

Full worked examples, including a stack-based function call:
[RISC-V Assembly](assembly.md).

---

## Quick reference

=== "Syntax patterns"

    ```asm
    op   rd, rs1, rs2    # DP, register
    op   rd, rs1, imm    # DP, immediate
    op   rd, imm(rs1)    # load
    op   rs2, imm(rs1)   # store
    op   rs1, rs2, LABEL # branch
    jal  rd, LABEL        # jump + link
    jalr rd, imm(rs1)     # jump + link, register target
    ```

=== "Pseudo-ops"

    ```asm
    li   rd, imm     # lui rd, imm[31:12]  ; addi rd, rd, imm[11:0]
    la   rd, LABEL   # auipc rd, d[31:12]  ; addi rd, rd, d[11:0]
    lw   rd, LABEL     # auipc rd, d[31:12]   ; lw rd, d[11:0](rd)
    sw   rs, LABEL, rt # auipc rt, d[31:12]   ; sw rs, d[11:0](rt)
    mv   rd, rs      # addi rd, rs, 0 - can be assembler-dependent
    j    LABEL       # jal  x0, LABEL
    ret              # jalr x0, 0(x1)
    call LABEL       # auipc x1, d[31:12]  ; jalr x1, d[11:0](x1)
    nop              # addi x0, x0, 0 - can be assembler-dependent
    beqz rs, LABEL   # beq  rs, x0, LABEL
    # d = the PC-relative delta to the label: LABEL - pc (where pc is the address of the auipc)
    ```

The full register ABI table[^regs], the branch/jump comparison[^branchjump],
and the data-processing, memory, and M-extension instruction tables[^instr]
are collected below for reference.

---

[^regs]:
    **Register ABI names**

    | Register | ABI Name | Description | Saver |
    |---|---|---|---|
    | `x0` | `zero` | Zero constant | — |
    | `x1` | `ra` | Return address | Caller |
    | `x2` | `sp` | Stack pointer | Callee |
    | `x3` | `gp` | Global pointer | — |
    | `x4` | `tp` | Thread pointer | — |
    | `x5`–`x7` | `t0`–`t2` | Temporaries | Caller |
    | `x8` | `s0` / `fp` | Saved / frame pointer | Callee |
    | `x9` | `s1` | Saved register | Callee |
    | `x10`–`x11` | `a0`–`a1` | Fn args / return values | Caller |
    | `x12`–`x17` | `a2`–`a7` | Fn args | Caller |
    | `x18`–`x27` | `s2`–`s11` | Saved registers | Callee |
    | `x28`–`x31` | `t3`–`t6` | Temporaries | Caller |

[^branchjump]:
    **Branch vs. jump vs. jump-register**

    | Instr. | Example | Conditional? | Links (rd = return addr)? | Target |
    |---|---|:---:|:---:|---|
    | **Branch** (B-type) | `blt t0, t1, LBL` | Yes | No | Label |
    | **Jump** — `jal` | `jal ra, LBL` | No (always) | Yes (rd) | Label |
    | **Jump-reg** — `jalr` | `jalr ra, 0(t0)` | No (always) | Yes (rd) | Register + offset |

    `ret` is a pseudo-instruction for `jalr x0, 0(ra)`.

[^instr]:
    **Data processing**

    | Inst | Description (C) | Inst | Description (C) |
    |---|---|---|---|
    | `add` | `rd = rs1 + rs2` | `addi` | `rd = rs1 + imm` |
    | `sub` | `rd = rs1 - rs2` | — | (no immediate form; negate and use addi) |
    | `xor` / `xori` | `rd = rs1 ^ rs2` / `imm` | `or` / `ori` | <code>rd = rs1 &#124; rs2</code> / `imm` |
    | `and` / `andi` | `rd = rs1 & rs2` / `imm` | `slt` / `slti` | `rd = (rs1 < rs2)?1:0` |
    | `sll` / `slli` | `rd = rs1 << rs2` / `imm[4:0]` | `sltu` / `sltiu` | unsigned `slt`/`slti` |
    | `srl` / `srli` | `rd = rs1 >> rs2` / `imm[4:0]` (logical) | `sra` / `srai` | arithmetic right shift |
    | `lui` | `rd = imm << 12` | `auipc` | `rd = PC + (imm << 12)` |

    **Memory**

    | Inst | Description (C) | Inst | Description (C) |
    |---|---|---|---|
    | `lb` / `lbu` | `rd = M[rs1+imm][7:0]` (sign / zero ext.) | `sb` | `M[rs1+imm][7:0] = rs2[7:0]` |
    | `lh` / `lhu` | `rd = M[rs1+imm][15:0]` (sign / zero ext.) | `sh` | `M[rs1+imm][15:0] = rs2[15:0]` |
    | `lw` | `rd = M[rs1+imm][31:0]` | `sw` | `M[rs1+imm][31:0] = rs2[31:0]` |

    No pre/post-increment addressing, no `LDM`/`STM` — increment the base
    register explicitly with `addi`.

    **Multiply / divide (M extension)**

    | Inst | Description (C) | Inst | Description (C) |
    |---|---|---|---|
    | `mul` | `rd = (rs1*rs2)[31:0]` | `div` / `divu` | `rd = rs1 / rs2` |
    | `mulh` / `mulhu` / `mulhsu` | `rd = (rs1*rs2)[63:32]` | `rem` / `remu` | `rd = rs1 % rs2` |


---

## Links and references

- Some tables are based on the work by (c) James Zhu. Modifications/corrections
  have been made to the original tables. The modified LaTeX files are available
  on request.
- [RISC-V reference card](https://git.tu-berlin.de/j.koeppeler/riscv_tool/-/blob/master/riscvcard_large.pdf)
  — a fantastic reference card, which is almost all we need.
- [RISC-V official specifications](https://raw.githubusercontent.com/mjosaarinen/rvvkeccak-dev/refs/heads/main/riscv-spec.pdf)
- [Wikipedia article on RISC-V](https://en.wikipedia.org/wiki/RISC-V) — has lots of info.
- [riscv.org](https://riscv.org) — the RISC-V website.
