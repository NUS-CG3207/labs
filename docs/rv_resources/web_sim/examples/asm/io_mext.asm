# M-extension arithmetic + ecall demo
# ⚠ ecall is a simulator convenience — real hardware needs trap support in the processor AND an OS/ISR to service it, and the CG3207 Wrapper has neither. Use the MMIO peripherals for real I/O.
.text
main:
	li	x1, 7
	li	x2, 8
	mul	x3, x1, x2	# 56
	div	x4, x3, x2	# 7
	rem	x5, x3, x1	# 0
	la	x28, results
	sw	x3, 0(x28)
	sw	x4, 4(x28)
	sw	x5, 8(x28)
	li	a7, 1	# print_int
	mv	a0, x3
	ecall
	li	a7, 10	# exit
	ecall
.data
results: .word 0, 0, 0
