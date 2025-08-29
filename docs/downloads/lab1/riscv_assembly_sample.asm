#----------------------------------------------------------------------------------
#-- (c) Rajesh Panicker
#--	License terms :
#--	You are free to use this code as long as you
#--		(i) DO NOT post it on any public repository;
#--		(ii) use it only for educational purposes;
#--		(iii) accept the responsibility to ensure that your implementation does not violate anyone's intellectual property.
#--		(iv) accept that the program is provided "as is" without warranty of any kind or assurance regarding its suitability for any particular purpose;
#--		(v) send an email to rajesh<dot>panicker<at>ieee.org briefly mentioning its use (except when used for the course CG3207 at the National University of Singapore);
#--		(vi) retain this notice in this file and any files derived from this.
#----------------------------------------------------------------------------------

# This sample program for RISC-V simulation using RARS

.eqv MMIO_BASE 0xFFFF0000
# Memory-mapped peripheral register offsets
.eqv UART_RX_VALID_OFF 			0x00 #RO, status bit
.eqv UART_RX_OFF			0x04 #RO
.eqv UART_TX_READY_OFF			0x08 #RO, status bit
.eqv UART_TX_OFF			0x0C #WO
.eqv OLED_COL_OFF			0x20 #WO
.eqv OLED_ROW_OFF			0x24 #WO
.eqv OLED_DATA_OFF			0x28 #WO
.eqv OLED_CTRL_OFF			0x2C #WO
.eqv ACCEL_DATA_OFF			0x40 #RO
.eqv ACCEL_DREADY_OFF			0x44 #RO, status bit
.eqv DIP_OFF				0x64 #RO
.eqv PB_OFF				0x68 #RO
.eqv LED_OFF				0x60 #WO
.eqv SEVENSEG_OFF			0x80 #WO
.eqv CYCLECOUNT_OFF			0xA0 #RO

# ------- <code memory (Instruction Memory ROM) begins>
.text	## IROM segment: IROM_BASE to IROM_BASE+2^IROM_DEPTH_BITS-1
# Total number of real instructions should not exceed 2^IROM_DEPTH_BITS/4 (127 excluding the last line 'halt B halt' if IROM_DEPTH_BITS=9).
# Pseudoinstructions (e.g., li, la) may be implemented using more than one actual instruction. See the assembled code in the Execute tab of RARS

# You can also use the actual register numbers directly. For example, instead of s1, you can write x9

main:
	li s0, MMIO_BASE		# MMIO_BASE. Implemented as lui+addi
	# Could have done lw s0,MMIO_BASE (ARM style) instead of the li above, provided MMIO_BASE: .word 0xFFFF0000 was declared in the .data (DMEM) section instead of .eqv
	addi s0, s0, LED_OFF		# LED address = MMIO_BASE + LED_OFF
	li  s1, DIP_OFF			# note that this li doesn't translate to lui, unlike the li in line 41.
	add s1, s0, s1			# DIP address = MMIO_BASE + DIP_OFF. Could have been done in a way similar to LED address, but done this way to have a DP reg instruction
loop:
	lw s3, delay_val		# reading the loop counter value
	lw s4, (s2)			# reading DIPS
	sw s4, (s1)			# writing to LEDS

wait:
	addi s3, s3, -1		# subtract 1
	beq s3, zero, loop	# exit the loop
	jal zero, wait		# continue in the loop (could also have written j wait).

halt:	
	j halt		# infinite loop to halt computation. A program should not "terminate" without an operating system to return control to
				# keep halt: j halt as the last line of your code so that there is a 'dead end' beyond which execution will not proceed.
				
# ------- <code memory (Instruction Memory ROM) ends>			
				
								
#------- <Data Memory begins>									
.data  ## DMEM segment: DMEM_BASE to DMEM_BASE+2^DMEM_DEPTH_BITS-1
# Total number of constants+variables should not exceed 2^DMEM_DEPTH_BITS/4 (128 if DMEM_DEPTH_BITS=9).
# This kind of a data memory is slightly unrealistic and possible only in FPGAs. 
# In embedded systems, the data memory has two parts - constants stored in a ROM/Flash (non-volatile) and variables stored in RAM. 
#   Constants are available for reading without a prior writing (and can't normally be written). 
#	Variables that are initialized are explicitly set to their initial value via writes (sw instructions). Variables should't be read (lw) without a prior write (sw) somewhere.
# In desktop systems, the data memory is typically all RAM, but has constants stored in read-only area that is initalised explicitly via writes (sw) and are not modified further.
#   As with embedded systems, variables that are initialized are explicitly set to their initial value via writes (sw instructions). Variables should't be read (lw) without a prior write (sw) somewhere.
# In contrast, the FPGA-based systems often have a more flexible memory architecture*, allowing for RAM to be used like ROM, i.e., variables are auto-initialised - can be read without prior writes, but can also be modified.
#	*At least the way it is used in our case, which necessitates the memory to be small and implemented using block or distributed RAMs available within the FPGA fabric and initialised using GSR.

DMEM:

delay_val: .word 4	# a constant, at location DMEM+0x00
string1:
.asciz "\r\nWelcome to CG3207..\r\n"	# string, from DMEM+0x4 to DMEM+0x1F (
var1: .word	1 		# a statically allocated variable (which can have an initial value, say 1), at location DMEM+0x60
# Food for thought: What will be the address of var1 if string1 had one extra character, say  "..." instead of ".."? Hint: words are word-aligned.

.align 9	# To set the address at this point to be 512-byte aligned, i.e., DMEM+0x200
STACK_INIT:	# Stack pointer can be initialised to this location - DMEM+0x200 (i.e., the address of stack_top)
				# stack grows downwards, so stack pointer should be decremented when pushing and incremented when popping.
				# stack can be used for function calls and local variables.
			# Not allocating any heap, as it is unlikely to be used in this simple program. If we need dynamic memory allocation,
				# we need to allocate heap and would typically use a heap manager.
#------- <Data Memory ends>													
