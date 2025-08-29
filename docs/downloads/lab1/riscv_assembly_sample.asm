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

# ------- <code memory (Instruction Memory ROM) begins>
.text	## IROM segment: IROM_BASE to IROM_BASE+2^IROM_DEPTH_BITS-1
# Total number of real instructions should not exceed 2^IROM_DEPTH_BITS/4 (127 excluding the last line 'halt B halt' if IROM_DEPTH_BITS=9).
# Pseudoinstructions (e.g., li, la) may be implemented using more than one actual instruction. See the assembled code in the Execute tab of RARS

# You can also use the actual register numbers directly. For example, instead of s1, you can write x9

main:   
	lw s0, MMIO_BASE			# MMIO_BASE
	lw t1, LED_OFF
	add s1, s0, t1		# LEDS address = MMIO_BASE + LED_OFF
	lw t1, DIP_OFF
	add s2, s0, t1		# DIPS address = MMIO_BASE + DIP_OFF
loop:
	lw s3, DELAY_VAL		# reading the loop counter value
	lw s4, (s2)				# reading DIPS
	sw s4, (s1)				# writing to LEDS

wait:
	addi s3, s3, -1		# subtract 1
	beq s3, zero, loop	# exit the loop
	j wait			# continue in the loop

halt:	
	jal halt		# infinite loop to halt computation. A program should not "terminate" without an operating system to return control to
				# keep halt: jal halt as the last line of your code.
				
# ------- <code memory (Instruction Memory ROM) ends>			
				
				
				
					
#------- <Data Memory begins>									
.data  ## DR#----------------------------------------------------------------------------------
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

# ------- <code memory (Instruction Memory ROM) begins>
.text	## IROM segment: IROM_BASE to IROM_BASE+2^IROM_DEPTH_BITS-1
# Total number of real instructions should not exceed 2^IROM_DEPTH_BITS/4 (127 excluding the last line 'halt B halt' if IROM_DEPTH_BITS=9).
# Pseudoinstructions (e.g., li, la) may be implemented using more than one actual instruction. See the assembled code in the Execute tab of RARS

# You can also use the actual register numbers directly. For example, instead of s1, you can write x9

main:   
	lw s0, MMIO_BASE			# MMIO_BASE
	lw t1, LED_OFF
	add s1, s0, t1		# LEDS address = MMIO_BASE + LED_OFF
	lw t1, DIP_OFF
	add s2, s0, t1		# DIPS address = MMIO_BASE + DIP_OFF
loop:
	lw s3, DELAY_VAL		# reading the loop counter value
	lw s4, (s2)				# reading DIPS
	sw s4, (s1)				# writing to LEDS

wait:
	addi s3, s3, -1		# subtract 1
	beq s3, zero, loop	# exit the loop
	j wait			# continue in the loop

halt:	
	jal halt		# infinite loop to halt computation. A program should not "terminate" without an operating system to return control to
				# keep halt: jal halt as the last line of your code.
				
# ------- <code memory (Instruction Memory ROM) ends>			
				
				
				
					
#------- <Data Memory begins>									
.data  ## DROM segment: DMEM_BASE to DMEM_BASE+2^DMEM_DEPTH_BITS-1
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

MMIO_BASE: .word 0xFFFF0000	# Should be the same as the .mmio address based on the Memory Configuration set in the assembler/linker, and Wrapper.v

# Memory-mapped peripheral register offsets
UART_RX_VALID_OFF: 		.word 0x00 #RO, status bit
UART_RX_OFF: 			.word 0x04 #RO
UART_TX_READY_OFF: 		.word 0x08 #RO, status bit
UART_TX_OFF: 			.word 0x0C #WO
OLED_COL_OFF: 			.word 0x20 #WO
OLED_ROW_OFF: 			.word 0x24 #WO
OLED_DATA_OFF: 			.word 0x28 #WO
OLED_CTRL_OFF: 			.word 0x2C #WO
ACCEL_DATA_OFF: 		.word 0x40 #RO
ACCEL_DREADY_OFF: 		.word 0x44 #RO, status bit
LED_OFF: 			.word 0x60 #WO
DIP_OFF: 			.word 0x64 #RO
PB_OFF: 			.word 0x68 #RO
SEVENSEG_OFF: 			.word 0x80 #WO
CYCLECOUNT_OFF: 		.word 0xA0 #RO

# the above consumes 16 words = 64 bytes

DELAY_VAL: .word 4	# a constant, at location DMEM+0x40
string1:
.asciz "\r\nWelcome to CG3207...\r\n"	# string, at DMEM+0x44
var1: .word	1 		# a statically allocated variable (which can have an initial value, here 1), at location DMEM+0x60
# 100 bytes so far. Splitting the rest somewhat equally between heap and stack below.
heap: .space 188	# heap memory - can be used for dynamic allocation. Not using RARS heap default address here. DMEM+0x64 to DMEM+0x11F
stack: .space 224	# stack memory - can be used for function calls and local variables. DMEM+0x120 to DMEM+0x1FF.
stack_top:	# stack pointer can be initialised to this location (i.e., the address of stack_top)
				# stack grows downwards, so stack pointer should be decremented when pushing and incremented when popping

#------- <Data Memory ends>									
# DMEM segment: DMEM_BASE to DMEM_BASE+2^DMEM_DEPTH_BITS-1
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

MMIO_BASE: .word 0xFFFF0000	# Should be the same as the .mmio address based on the Memory Configuration set in the assembler/linker, and Wrapper.v

# Memory-mapped peripheral register offsets
UART_RX_VALID_OFF: 		.word 0x00 #RO, status bit
UART_RX_OFF: 			.word 0x04 #RO
UART_TX_READY_OFF: 		.word 0x08 #RO, status bit
UART_TX_OFF: 			.word 0x0C #WO
OLED_COL_OFF: 			.word 0x20 #WO
OLED_ROW_OFF: 			.word 0x24 #WO
OLED_DATA_OFF: 			.word 0x28 #WO
OLED_CTRL_OFF: 			.word 0x2C #WO
ACCEL_DATA_OFF: 		.word 0x40 #RO
ACCEL_DREADY_OFF: 		.word 0x44 #RO, status bit
LED_OFF: 			.word 0x60 #WO
DIP_OFF: 			.word 0x64 #RO
PB_OFF: 			.word 0x68 #RO
SEVENSEG_OFF: 			.word 0x80 #WO
CYCLECOUNT_OFF: 		.word 0xA0 #RO

# the above consumes 16 words = 64 bytes

DELAY_VAL: .word 4	# a constant, at location DMEM+0x40
string1:
.asciz "\r\nWelcome to CG3207...\r\n"	# string, at DMEM+0x44
var1: .word	1 		# a statically allocated variable (which can have an initial value, here 1), at location DMEM+0x60
# 100 bytes so far. Splitting the rest somewhat equally between heap and stack below.
heap: .space 188	# heap memory - can be used for dynamic allocation. Not using RARS heap default address here. DMEM+0x64 to DMEM+0x11F
stack: .space 224	# stack memory - can be used for function calls and local variables. DMEM+0x120 to DMEM+0x1FF.
stack_top:	# stack pointer can be initialised to this location (i.e., the address of stack_top)
				# stack grows downwards, so stack pointer should be decremented when pushing and incremented when popping

#------- <Data Memory ends>									
