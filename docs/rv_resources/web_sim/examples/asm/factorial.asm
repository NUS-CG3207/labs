# Factorial — compute 5! = 120
# ⚠ ecall is a simulator convenience — real hardware needs trap support in the processor AND an OS/ISR to service it, and the CG3207 Wrapper has neither. Use the MMIO peripherals for real I/O.
.text
main:
	li	x1, 5	# n
	li	x2, 1	# result
	li	x3, 1	# counter
loop:
	bgt	x3, x1, done
	mul	x2, x2, x3
	addi	x3, x3, 1
	j	loop
done:
	la	x28, result
	sw	x2, 0(x28)
	li	a7, 1
	mv	a0, x2
	ecall
	li	a7, 10
	ecall
.data
result: .word 0
