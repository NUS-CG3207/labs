---
nav_order: 8
---
# RISC-V Memory Map

### Memory Map of OUR\* RISC-V Processor

\*This memory map is not compliant with any standards/recommendations. It is just the choice/design of the CG3207 lecturer.

The data memory is further divided into constant (ROM) and variable memories (RAM).

| Address                     | Attributes      | DESCRIPTION                                                                                                                                                                                                                                        |
|-----------------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0x00000000 to 0x000001FC    | RO (Read Only)  | Instruction memory (ROM). 128 words. Word addressable - only multiples of 4 are valid addresses. This might cause warnings about 2 unused bits, but that's ok.                                                                                     |
| 0x00002000 to 0x000021FC    | RO              | Data (Constant) memory (ROM). 128 words. Word addressable - only multiples of 4 are valid addresses.                                                                                                                                               |
| 0x00002200 to 0x000023FC    | RW (Read/Write) | Data (Variable) memory (RAM). 128 words. Word addressable - only multiples of 4 are valid addresses.                                                                                                                                               |
| 0x00                  | WO (Write Only) | LED[15:8]. Only the least significant 8 bits written to this location are used. LED[7] is used to show the divided clock. LED[6:0] shows PC[8:2]. PC[1:0] will always be 0 and hence not shown.                                                    |
| 0x04                  | RO              | DIP switches. Only the least significant 16 bits read from this location are valid, corresponding to SW[15:0].                                                                                                                                     |
| 0x08                  | RO              | PushButton switches. [2:0] →  BTNL, BTNC, BTNR. Only the least significant 3 bits read from this location are valid. BTND is used as RESET and BTNU is used as PAUSE.                                                                              |
| 0x0C                  | WO              | 7-Segment LED display. The data written to this location will appear as an 8-digit hexadecimal number on the display. For the Basys 3 board, the two half-words will keep displaying in alternation.                                          |
| 0x10                  | RW              | UART Console (both in and out). UART Settings : Baud Rate 115200. 8-bit. No Parity. 1 Stop bit. More details given below. Only the least significant 8 bits in this location can be read/written. UART and RealTerm is a good console application. |
| 0x14                  | RO              | CONSOLE_IN_valid.                                                                                                                                                                                                                                  |
| 0x18                  | RO              | CONSOLE_OUT_ready.                                                                                                                                                                                                                                 |

#define IROM_BASE 0x00400000		// Should be the same as the .txt address based on the Memory Configuration set in the assembler/linker, 
                                        // Wrapper.v and the PC default value as well as reset value in **ProgramCounter.v** 
   // range is IROM_BASE to IROM_BASE+2^IROM_DEPTH_BITS-1
//# Total number of real instructions should not exceed 2^IROM_DEPTH_BITS/4 (127 excluding the last line 'halt B halt' if IROM_DEPTH_BITS=9).

#define DMEM_BASE 0x10010000   	// Should be the same as the .data address based on the Memory Configuration set in the assembler/linker, and Wrapper.v
#define DMEM_SIZE 0x400         // 2**DMEM_DEPTH_BITS, as in Wrapper.v
// range is DMEM_BASE to DMEM_BASE+2^DMEM_DEPTH_BITS-1
// # Total number of constants+variables should not exceed 2^DMEM_DEPTH_BITS/4 (128 if DMEM_DEPTH_BITS=9).


#define MMIO_BASE 0xFFFFF0000   // Should be the same as the .mmio address based on the Memory Configuration set in the assembler/linker, and Wrapper.v

// Memory-mapped peripheral register offsets
#define UART_RX_VALID_OFF	0x00 //RO, status bit
#define UART_RX_OFF 		0x04 //RO
#define UART_TX_READY_OFF	0x08 //RO, status bit
#define UART_TX_OFF 		0x0C //WO
#define OLED_COL_OFF 		0x20 //WO
#define OLED_ROW_OFF 		0x24 //WO
#define OLED_DATA_OFF 		0x28 //WO
#define OLED_CTRL_OFF 		0x2C //WO 
#define ACCEL_DATA_OFF 		0x40 //RO
#define ACCEL_DREADY_OFF 	0x44 //RO, status bit
#define LED_OFF 			0x60 //WO
#define DIP_OFF 			0x64 //RO
#define PB_OFF  			0x68 //RO
#define SEVENSEG_OFF 		0x80 //WO
#define CYCLECOUNT_OFF 		0xA0 //RO

#### Table 1: Memory map summary

### Endianness

The instruction and data memory are WORD addressable (NOT byte-addressable) for our labs. => Endianness doesn't matter for our hardware. Endianness matters only when each byte in the memory has an address, but we read/write one word (4 bytes) in one go. For example, if we store two words 0xABCD1234 and 0xEF567890 in the memory starting at the address 0x00000000, the two words will be stored at word addresses 0x00000000 and 0x00000004 respectively. In a system with a little-endian processor like RISC-V, the byte address 0x00000000 will have the content 0x34, byte address 0x00000001 will have the content 0x12, byte address 0x00000003 will have the content 0xAB, byte address 0x00000004 will have the content 0x90, byte address 0x00000007 will have the content 0xEF. 

In CG3207 labs, we use a system that cannot deal with byte addresses such as 0x00000001 and 0x00000002*. We can only send word addresses (addresses which are multiples of 4), i.e., like 0x00000000 and 0x00000004, and get the corresponding 32-bit contents. Hence, for our hardware, endianness doesn't matter*.

*unless you explicitly enable it by adding support for lb/lbu/lh/lhu/sb/sh.
