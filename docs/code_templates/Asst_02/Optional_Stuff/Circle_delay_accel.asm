# Output of Circle_delay_accel.c when compiled using RISC-V rv32gc clang 20.1.0 (C language, not C++) with -Os directive (via godbolt.org)

# Make sure all instructions used below (many are pseudoinstructions, assemble and check for real instructions) are implemented in your HDL.

# Assemble this using RARS. Dump memory => .txt as AA_IROM.mem and .data as AA_DMEM.mem, in hexadecimal text format.

# Important note: This program requires more than 128 instructions. The IROM_DEPTH_BITS has to be adjusted accordingly.
# DMEM_DEPTH_BITS need not be changed, as the program uses only 1 word in data memory for storing a constant. No variables at all!

main:
        addi    sp, sp, -32
        sw      ra, 28(sp)
        sw      s0, 24(sp)
        sw      s1, 20(sp)
        sw      s2, 16(sp)
        sw      s3, 12(sp)
        sw      s4, 8(sp)
# The previous 7 instructions can be deleted safely. There is no caller for main() here
        lui     s0, 1048560
        lui     sp, 65552
        addi    sp, sp, 512
        li      s2, 24
        lui     s1, 1044480
        lui     s3, %hi(CYCLECOUNT_ADDR)
        lui     a0, 244
        addi    s4, a0, 576
.LBB0_1:
        li      a3, 0
        lw      a0, 64(s0)
        sw      a0, 128(s0)
        li      a2, 24
.LBB0_2:
        mv      a1, a2
.LBB0_3:
        lw      a2, 8(s0)
        beqz    a2, .LBB0_3
        srl     a2, a0, a1
        sw      a2, 12(s0)
.LBB0_5:
        lw      a2, 8(s0)
        beqz    a2, .LBB0_5
        sub     a2, s2, a1
        sll     a5, a0, a2
        and     a4, a5, s1
        bgez    a5, .LBB0_8
        neg     a4, a4
.LBB0_8:
        srl     a2, a4, a2
        srli    a4, a4, 24
        add     a3, a3, a2
        sw      a4, 12(s0)
        addi    a2, a1, -8
        bnez    a1, .LBB0_2
        slli    a3, a3, 1
        li      a0, 48
        li      a1, 32
        li      a2, 28
        call    drawFilledMidpointCircleSinglePixelVisit
        lw      a0, %lo(CYCLECOUNT_ADDR)(s3)
        lw      a1, 0(a0)
        add     a1, a1, s4
.LBB0_10:
        lw      a2, 0(a0)
        bltu    a2, a1, .LBB0_10
        j       .LBB0_1

drawFilledMidpointCircleSinglePixelVisit:
        bltz    a2, .LBB1_19
        li      t1, 0
        lui     t3, 1048560
        li      a6, 1
        sub     t0, a6, a2
        li      a7, 33
.LBB1_2:
        mv      t2, t1
        add     a4, t1, a1
        sw      a4, 36(t3)
        sw      a7, 44(t3)
        sw      a3, 40(t3)
        bltz    a2, .LBB1_8
        sub     t1, a0, a2
        slli    t4, a2, 1
        addi    t4, t4, 1
        mv      a4, t4
        mv      a5, t1
.LBB1_4:
        sw      a5, 32(t3)
        addi    a4, a4, -1
        addi    a5, a5, 1
        bnez    a4, .LBB1_4
        beqz    t2, .LBB1_10
        sub     a4, a1, t2
        sw      a4, 36(t3)
        sw      a7, 44(t3)
        sw      a3, 40(t3)
.LBB1_7:
        sw      t1, 32(t3)
        addi    t4, t4, -1
        addi    t1, t1, 1
        bnez    t4, .LBB1_7
        j       .LBB1_10
.LBB1_8:
        beqz    t2, .LBB1_10
        sub     a4, a1, t2
        sw      a4, 36(t3)
        sw      a7, 44(t3)
        sw      a3, 40(t3)
.LBB1_10:
        addi    t1, t2, 1
        bltz    t0, .LBB1_17
        bge     t2, a2, .LBB1_16
        sub     t4, a0, t2
        add     a4, a2, a1
        sw      a4, 36(t3)
        sw      a7, 44(t3)
        sw      a3, 40(t3)
        mv      a4, a6
        mv      a5, t4
.LBB1_13:
        sw      a5, 32(t3)
        addi    a4, a4, -1
        addi    a5, a5, 1
        bnez    a4, .LBB1_13
        sub     a4, a1, a2
        sw      a4, 36(t3)
        sw      a7, 44(t3)
        sw      a3, 40(t3)
        mv      a4, a6
.LBB1_15:
        sw      t4, 32(t3)
        addi    a4, a4, -1
        addi    t4, t4, 1
        bnez    a4, .LBB1_15
.LBB1_16:
        addi    a2, a2, -1
        sub     a4, t1, a2
        slli    a4, a4, 1
        addi    a4, a4, 2
        j       .LBB1_18
.LBB1_17:
        slli    a4, t1, 1
        addi    a4, a4, 1
.LBB1_18:
        add     t0, t0, a4
        addi    a6, a6, 2
        blt     t2, a2, .LBB1_2
.LBB1_19:
        ret

delay:
        lui     a1, %hi(CYCLECOUNT_ADDR)
        lw      a1, %lo(CYCLECOUNT_ADDR)(a1)
        lw      a2, 0(a1)
        add     a0, a0, a2
.LBB2_1:
        lw      a2, 0(a1)
        bltu    a2, a0, .LBB2_1
        ret

drawHorizontalLine:
        lui     a4, 1048560
        sw      a2, 36(a4)
        li      a2, 33
        sw      a2, 44(a4)
        sw      a3, 40(a4)
        blt     a1, a0, .LBB3_3
        addi    a1, a1, 1
.LBB3_2:
        sw      a0, 32(a4)
        addi    a0, a0, 1
        bne     a1, a0, .LBB3_2
.LBB3_3:
        ret

.data	# The only line that needs to be added manually

CYCLECOUNT_ADDR:
        .word   4294901920

# The following lines can be deleted
.Ldebug_list_header_start0:
        .half   5
        .byte   4
        .byte   0
        .word   33
.Ldebug_list_header_end0: