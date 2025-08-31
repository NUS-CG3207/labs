---
nav_order: 8
---
# RISC-V Memory Map

### Memory Map of OUR RISC-V Processor

Assuming default memory configuration, IROM_DEPTH_BITS = DMEM_DEPTH_BITS = 9.

| Address                     | Attributes      | Name                      |DESCRIPTION |
|-----------------------------|-----------------|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0x00000000 to 0x000001FC    | RO (Read Only)  | Instruction memory (IROM) | 128 words (0x200 bytes) - total number of instructions should not exceed this (127 excluding the last line 'halt B halt'). Word addressable - only multiples of 4 are valid addresses. This might cause warnings about 2 unused bits, but that's ok.|
| 0x00002000 to 0x000021FC    | RW (Read-Write - See notes below) | Data memory (DMEM)|128 words (0x200 bytes) - Total number of constants+variables should not exceed this. Word addressable - only multiples of 4 are valid addresses.|
| 0xFFFF0000                  | RO              | UART_RX_VALID             | Data can be read from UART_RX (is valid) only when the LSBit of this register is set. |
| 0xFFFF0004                  | RO              | UART_RX                   | UART Receive (input, from keyboard). UART Settings : Baud Rate 115200. 8-bit. No Parity. 1 Stop bit. Only LSByte is valid. RealTerm is a good console application.|
| 0xFFFF0008                  | RO              | UART_TX_READY             | Data can be written to UART_TX only when the LSBit of this register is set|
| 0xFFFF000C                  | WO (Write Only) | UART_TX                   | UART Transmit (output, to display). Only LSByte is writeable. Same settings as RX|
| 0xFFFF0020                  | WO              | OLED_COL                  | The OLED pixel column index, between 0 and 95.|
| 0xFFFF0024                  | WO              | OLED_ROW                  | The OLED pixel row index, between 0 and 63.|
| 0xFFFF0028                  | WO              | OLED_DATA                 |Please see the [peripherals](peripherals.md#oled) page for details on choosing OLED data format via OLED_CTRL register.|
| 0xFFFF002C                  | WO              | OLED_CTRL                 | Controls OLED data format and modes of operation.|
| 0xFFFF0040                  | RO              | ACCEL_DATA                | Please see the [peripherals](peripherals.md#accelerometer) page for details on accelerometer data format.|
| 0xFFFF0044                  | RO              | ACCEL_DREADY              | A new reading is available if the LSBit of this register is set. Not necessary to check this if ACCEL_DATA is read at a low frequency (a few times a second).|
| 0xFFFF0060                  | WO              | LED                       | LED[7:0]. Only the least significant 8 bits written to this location are used. LED[8] is used to show the divided clock. LED[15:9] shows PC[8:2]. PC[1:0] will always be 0 and hence not shown.|
| 0xFFFF0064                  | RO              | DIP                       | DIP switches. Only the least significant 16 bits read from this location are valid, corresponding to SW[15:0].|
| 0xFFFF0068                  | RO              | PB                        | PushButton switches. [2:0] →  BTNL, BTNC, BTNR. Only the least significant 3 bits read from this location are valid. BTND is used as RESET and BTNU is used as PAUSE.|
| 0xFFFF0080                  | WO              | SEVENSEG                  | 7-Segment LED display. The data written to this location will appear as an 8-digit hexadecimal number on the display. For the Basys 3 board, the two half-words will keep displaying in alternation.|
| 0xFFFF00A0                  | RO              | CYCLECOUNT                |Cycles elapsed since the system came out of reset.|


#### Table 1: Memory map summary

### A Note on Data Memory.

This kind of a data memory is slightly unrealistic and possible only in FPGAs. 

In embedded systems, the data memory has two parts - constants stored in a ROM/Flash (non-volatile) and variables stored in RAM. 
Constants are available for reading without a prior writing (and can't normally be written). 
Variables that are initialized are explicitly set to their initial value via writes (sw instructions). Variables should't be read (lw) without a prior write (sw) somewhere.

In desktop systems, the data memory is typically all RAM, but has constants stored in read-only area that is initalised explicitly via writes (sw) and are not modified further.
As with embedded systems, variables that are initialized are explicitly set to their initial value via writes (sw instructions). Variables should't be read (lw) without a prior write (sw) somewhere.

In contrast, the FPGA-based systems often have a more flexible memory architecture*, allowing for RAM to be used like ROM, i.e., variables are auto-initialised - can be read without prior writes, but can also be modified.

*At least the way it is used in our case, which necessitates the memory to be small and implemented using block or distributed RAMs available within the FPGA fabric and initialised using GSR.


### Sizes of various segments, base addresses, and peripheral address offsets.


The RARS default memory configuration is as follows.

* IROM_BASE = 0x00400000. This should be the same as the .txt address based on the Memory Configuration set in the assembler/linker, Wrapper.v and the PC default value as well as reset value in ProgramCounter.v
* DMEM_BASE is 0x10010000   	// Should be the same as the .data address based on the Memory Configuration set in the assembler/linker, Wrapper.v, C program.
* MMIO_BASE is 0xFFFFF0000   // Should be the same as the .mmio address based on the Memory Configuration set in the assembler/linker, Wrapper.v, C program.


It is possible to change the configuration to others supported by RARS, such as compact with .txt at 0. MMIO base can be changed freely in any configuration, though if you need to use RARS simulated peripherals, it to be the default value.

Instruction and data memory sizes can be bigger than 128 words. Be mindful of the potentially increased synthesis time though, esp if not using synch read (block RAM).

DMEM_DEPTH_BITS = 9. DMEM_SIZE = 2**DMEM_DEPTH_BITS = 0x200 = 512 bytes = 128 words by default. Changing this will need changes to Wrapper.v. Set STACK_INIT in C / asm program (via .align in asm, via DMEM_SIZE) in C.

IROM_DEPTH_BITS=9. Changing this will need changes to Wrapper.v

### Endianness

The instruction and data memory are WORD addressable (NOT byte-addressable) for our labs. => Endianness doesn't matter for our hardware. Endianness matters only when each byte in the memory has an address, but we read/write one word (4 bytes) in one go. 

For example, if we store two words 0xABCD1234 and 0xEF567890 in the memory starting at the address 0x00000000, the two words will be stored at word addresses 0x00000000 and 0x00000004 respectively. In a system with a little-endian processor like RISC-V, the byte address 0x00000000 will have the content 0x34, byte address 0x00000001 will have the content 0x12, byte address 0x00000003 will have the content 0xAB, byte address 0x00000004 will have the content 0x90, byte address 0x00000007 will have the content 0xEF. 

In CG3207 labs, we use a system that cannot deal with byte addresses such as 0x00000001 and 0x00000002*. We can only send word addresses (addresses which are multiples of 4), i.e., like 0x00000000 and 0x00000004, and get the corresponding 32-bit contents. Hence, for our hardware, endianness doesn't matter*.

*unless you explicitly enable it by adding support for lb/lbu/lh/lhu/sb/sh - which is optional, and for later assignments.