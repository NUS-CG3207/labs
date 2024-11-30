---
nav_exclude: true
---
# Work in progress - Cleanup Necessary
******* New features in V2 *******
- Ability to use the hexadecimal text dump from RARS directly without any conversion software or copy-pasting needed.
- Instruction and data memory sizes can be bigger than 128 words. Be mindful of the potentially increased synthesis time though.
- Addresses except IROM_BASE and DMEM_BASE are hierarchically derived instead of hard-coding.
- Byte and half-word write to data memory and 7-segment display (sb and sh support) - aligned memory addresses and pre-shifted/aligned data required. Please read the relevant comments and aaddutional instructions page carefully.
--Note: byte and half-word read don't require any Wrapper support - you can simply read the whole byte, extract the byte/half-word, and extend as necessary.
- Possible to use a different Memory Configuration from RARS, *except* supporting 32'hFFFF0000 as the MMIO base in the RARS default. MMIO_BASE = DMEM_BASE + 2**DMEM_DEPTH_BITS in all configs.
- Possible to use block RAMs (sync read) for instruction and data memories in the pipelined version. Allows faster synthesis times and possibly clock rates for larger memory sizes.
- Renamed for simplicity and concistency with assembly program labels: INSTR_MEM->IROM; DATA_CONST_MEM->DROM; DATA_VAR_MEM->DRAM. DROM and DROM combined into DMEM in v3
- Updated files: Wrapperv2.v, RVv2.v, and ProgramCounterv2.v (necessary only if the Memory Configuration is changed in RARS).

To use FPGA block RAMs for instruction and data memories in pipelined version (Allows faster synthesis times and possibly clock rates for larger memory sizes):
(Disclaimer: Not tested fully). Change to always@(posedge clk) where relevant. Read the comments for more info. 
If enabled, Instr, ReadData_in are delayed by 1 cycle. Therefore, what you get can be used as InstrD, ReadDataW directly. MMIO reads are also delayed. Register file outputs are RD1E and RD2E directly if it is done for the register file.

The required byte/half-word will still have to be extracted from ReadDataW and zero/sign extended in W stage if using lb/lbu/lh/lhu.

----------------------------------------------------------------
Sizes of various segments, base addresses, and peripheral address offsets.
----------------------------------------------------------------
Set the number of bits for the byte address. 
Depth (size) = 2**DEPTH_BITS. e.g.,if DEPTH_BITS = 9, depth = 512 bytes = 128 words. 
Make sure that the align directive in the assembly programme is set according to the sizes of the various segments.
The size of a data segment affects the *next* segment alignment and address.
Keep in mind that large memory sizes can cause synthesis times to be longer, esp if not using synch read (block RAM)

Base addresses of various segments
The RARS default memory configuration is IROM_BASE = 32'h00400000 and DMEM_BASE = 32'h10010000 in RARS.
The RARS default MMIO base is 32'hFFFF0000, but this is hard to support. So we use MMIO_BASE = DMEM_BASE + 2**DMEM_DEPTH_BITS in all memory configurations
We use compact memory configuration with .txt at 0 where IROM_BASE = 32'h00000000 and DMEM_BASE = 32'h00002000, but you can change this to either of the other two if you wish.