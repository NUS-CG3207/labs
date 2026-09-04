# Sum an array of 5 numbers using memory
# ⚠ ecall is a simulator convenience — real hardware needs trap support in the processor AND an OS/ISR to service it, and the CG3207 Wrapper has neither. Use the MMIO peripherals for real I/O.
.text
main:
	la	x28, arr	# pointer to array
	li	x1, 10
	li	x2, 20
	li	x3, 30
	li	x4, 40
	li	x5, 50
	sw	x1, 0(x28)
	sw	x2, 4(x28)
	sw	x3, 8(x28)
	sw	x4, 12(x28)
	sw	x5, 16(x28)
	li	x6, 0	# sum
	li	x7, 5	# count
	li	x8, 0	# index
sum_loop:
	beq	x8, x7, finish
	lw	x9, 0(x28)
	add	x6, x6, x9
	addi	x28, x28, 4
	addi	x8, x8, 1
	j	sum_loop
finish:
	li	a7, 1
	mv	a0, x6
	ecall
	li	a7, 10
	ecall
.data
arr: .word 0, 0, 0, 0, 0
