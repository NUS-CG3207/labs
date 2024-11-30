---
nav_order: 2
parent: "Lab 4: (Near) Complete Processor + Pipelining + Bells + Whistles"
---
# Lab 4: Implementing Pipelining

This page will guide you through how to implement basic pipelining for the mandatory task for Lab 4.

## Notes

* The WE of the PC given in the templates is active high, while the one given in the pipelined design (Chapter 6) is active low. You might want to change the PC WE in the templates to active low to be consistent.
* Even though the pipeline registers are shown as big registers storing a lot of stuff, each data stored can be thought of as being in a separate register. In other words, in your HDL code, you don't have to try and 'collect' all the bits to form a single register entity.

## Systematic procedure for Pipelining

Follow these steps to implement pipelining.

1. Start by inserting the appropriate suffixes (F/D/E/M/W) for each wire, port, register, and signal. Refer to slide 11 of chapter 6 for this. For every signal that goes through multiple pipeline stages, it will need to be split into two signals, separated by a pipeline register. **Note:** Generally, the signals going into every component will have the same suffix, since every component is part of one and only one pipeline stage. The exception to this is the register file, where `A3` and `WD3` (ARM) or `WD` (RISC-V).

2. Make the appropriate datapath connection(s) for every signal going through a pipeline register. Some connections were made implicitly, such as ALUControl. These connections will need to be made explicitly. For RISC-V, a multiplexer must be inserted to select between `PC_F` and `PC_E`, controlled by `PCSrc_E`. Remember to change the datatype from `wire` to `reg` where necessary.

* **Verilog**: Use a combinational always block with non-blocking assignments. For example:

  ``` verilog
  always @(*) begin
   ExtImm_E <= ExtImm_D;
  end
  ```

  in ARM.v or RV.v

* **VHDL**: Use a concurrent statement (**NOT** inslude a clocked process for now). For example, `ExtImm_E <= ExtImm_D;` in ARM.vhd

3. Verify that your design works **EXACTLY as it did previously**, without any changes to the assembly language program. We have NOT yet inferred any registers, so there should not be any pipelining going on (yet!). If something has broken, now is a good time to debug it.

4. Now, we implement the pipeline registers.

* **VHDL**: Move all the signals that are supposed to go through a particular pipeline register into one clocked process in ARM/RISC-V architecture (everything in one big clocked process is fine too, but it is better to keep it in separate processes for better organization).
  * **Verilog**: Change the combinational `always @(*)` to `always @(posedge clk)`.

5. Initialize all all your signals and registers to zero Add a condition that sets all these signals and registers to zero when RESET is asserted, and otherwise, assigns the RHS to the LHS at the clock edge.

6. Modify the Register file slightly, to read the clock at negative edges:

* **VHDL**: `CLK'event and CLK='1'` becomes `CLK'event and CLK='0'`.
* **Verilog**: `always @(posedge clk)` becomes `always @(negedge clk)`.

7. Your processor should now be pipelined, your old program may not work as it did. You will need to add `NOP`s wherever there is any kind of hazard, to avoid these. For a start, just insert NOPs such that each pair of instructions having a data hazard is spaced by at least 2 instructions (for example, insert 2 NOPs if the two instructions are consecutive). After each branch, insert 4 NOPs.

8. Verify that your design works as it used to (it will just be slower because of all the NOPs).

For hazard resolution hardware (not a basic requirement), follow the design in Chapter 5. Do it systematically and incrementally, one hazard at a time, and testing at each step.

## Increasing the clock speed

Now that you have pipelined your processor, you might be able to run it without any clock division, at the full 100 MHz, especially if your program memory and data memory are small. Change `CLK_DIV_BITS` to test if this is the case.

However, note that even with the standard 5-stage pipeline, 100 MHz may not always be achievable, especially if your memory size is big.
Up to ~430 MHz is possible though unlikely with a 5-stage pipeline. To increase the clock beyond 100 MHz, you will need to make use of the FPGA built-in clocking resource called MMCM (which uses phase-locked loops). This can be configured using a clocking wizard.

Tip for faster clock speeds:
Identify the bottleneck by looking at that timing report.

* Use smaller memories.
* For larger memories, use block ram templates, and allow at least 2 clock edges, and maybe even 3 for a read. This of course is a major design change as the pipeline is no longer 5 stage
* Use a hierarchy of memories.
* If the bottleneck is the execute stage, try to make it shorter by moving the PC logic to M stage.
