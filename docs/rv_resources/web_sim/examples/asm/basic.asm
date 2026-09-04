# Basic RISC-V — a simple, complete program to start from: sum = a + b + c
# ⚠ ecall is a simulator convenience — real hardware needs trap support in the processor AND an OS/ISR to service it, and the CG3207 Wrapper has neither. Use the MMIO peripherals for real I/O.
.text
main:
	li	x1, 10	# a = 10
	li	x2, 20	# b = 20
	li	x3, 30	# c = 30
	add	x4, x1, x2
	add	x5, x4, x3	# x5 = sum
	la	x28, result
	sw	x5, 0(x28)	# result = sum
	li	a7, 1	# print_int (prints to status log)
	mv	a0, x5
	ecall
	li	a7, 10	# exit
	ecall
.data
result: .word 0
