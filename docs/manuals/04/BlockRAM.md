---
nav_exclude: true
---
# Using Block RAMs

- Possible to use block RAMs (sync read) for instruction and data memories in the pipelined version. Allows faster synthesis times and possibly clock rates for larger memory sizes.
To use FPGA block RAMs for instruction and data memories in pipelined version (Allows faster synthesis times and possibly clock rates for larger memory sizes):
(Disclaimer: Not tested fully). Change to always@(posedge clk) where relevant. Read the comments for more info. 
If enabled, Instr, ReadData_in are delayed by 1 cycle. Therefore, what you get can be used as InstrD, ReadDataW directly. MMIO reads are also delayed. Register file outputs are RD1E and RD2E directly if it is done for the register file.
