---
nav_order: 5
---
# Lab 3: Multiplication / Division units

## Tasks
Lab 3 involves 2 compulsory tasks and one open-ended task.

1) You will incorporate division (both signed and unsigned) into the MCycle unit given \[HDL simulation only\] (13 marks).

*   The design files can be found [here](https://github.com/NUS-CG3207/lab-skeletons/tree/main/lab3/vhdl) (VHDL) and [here](https://github.com/NUS-CG3207/lab-skeletons/tree/main/lab3/verilog) (Verilog - please do not change the non-blocking assignments in the IDLE\_PROCESS to blocking, as it is necessary to circumvent a certain non-deterministic behaviour from Verilog simulator). Please go through the comments carefully to understand its operation.
*   Simulate it using a good testbench, and synthesize the MCycle unit by setting it as the top-level module to make sure it synthesizes without warnings (unless you are sure it can be ignored) before doing the next task (incorporating it into the processor).
*   You can assume that the divisor is never zero.

2) Incorporate MCycle unit into your processor so that it can execute 32-bit variants of **mul** and **divu** for RISC-V (MUL and DIV for ARMc3) \[HDL simulation as well as hardware\] (7 marks).

*   For RISC-V, **mul** and **divu**  are available in the Multiply extension instruction set - implement the word (32-bit) versions. There is no DIV instruction in ARMv3, so DIV can be done by cannibalizing MLA instruction. The idea is to just use the format of MLA instruction, but the machine will be doing division instead. This will limit your ability to simulate in Keil assembler though. 
*   The destination register should contain quotient. The remainder can be discarded.
*   For RISC-V, **divu** performs unsigned division. (For ARMv3 assume DIV performs unsigned division.)
*   Since **mul**/MUL writes only the 32-bit result, there is no difference between signed and unsigned variants.
*   In ARMv3, multiplication instruction can set 'Z' and 'N' flags, but this functionality is not a requirement for Lab 3.
*   Your control unit will need to be modified to generate 'Start' and 'MCycleOp' control signals.
*   Complement of 'Busy' can be used as the write enable for the PC. This will stall the processor until the multicycle operation is complete.
*   Your datapath should be modified to make the appropriate connections to and from the MCycle unit. You will need a multiplexer and a control signal to combine the outputs from ALU and MCycle.
*   **div** (signed division) **mulh** variants (upper word) and **rem** variants (remainder) are not required to be implemented for RISC-V, though it takes very little extra effort (except maybe **mulhsu**). For ARM implementing instructions that generate 64-bit results (SMULL, UMULL, etc) is not a requirement.
*   You can refer to the ARM Architecture Reference Manual (uploaded on Canvas), page A4-66 for MUL instruction format and page A4-54 for MLA instruction format. 

3) You can improve the given **signed multiplier** implemented in step 1 to score marks for performance enhancement \[Post-synthesis simulation; showing on hardware is left to your discretion\] (5 marks).

    Some suggestions for improvement are given below. You need not do all of them. **Keep in mind that performance improvement carries only 5 marks**, and we will be evaluating only one improvement. The purpose is to incentivize some exploration. However, **spending too much time on this is not recommended**.

*   You can try different techniques to strike a good trade-off between hardware complexity and the number of cycles required for multiplication (for example, 16 cycles instead of 32 or 16, but with more hardware) - the multiplication implemented in the sample code is _very_ inefficient (intentionally).
*   You could use a single adder for multiplication and division within the MCycle unit. You could even take it one step further by reusing the same adder from the ALU (thus saving one additional adder, but will take a lot of effort, not worth 5 marks). The latter will need to modify the ports for the MCycle unit.
*   You can implement Booth's multiplication algorithm or other efficient algorithms you can find on the internet.
*   DO NOT implement a single cycle multiplier - FPGAs have built in multipliers/DSP units, which are inferred when you use '\*' operator. This is much more efficient than any array adder based multipliers you can implement, but we don't want to be using it in CG3207.

## Design Instructions

*   You are required to have your own, comprehensive program to have a convincing demo. **Only one assembly language program (and hence one bitstream) will be allowed for demo**.
*   If you are using the UART console, you can set the radix to hexadecimal in the 'Display' tab of RealTerm.

## Submission Info
* Lab 3 will be evaluated in **Week 9**. The presentation schedule can be found on Canvas. 
* Please upload the Lab 3 files to Canvas **within 1 hour of your demo in week 9**, including the following files:
    * **.v**/**vhd** files you have created/modified \[ RTL Sources, Testbench(es) \] 
    * **.bit** files 
    * **.s**/**.asm** files (assembly programs)
    * **.ppt** file - 1 to 4 slides showing performance enhancement techniques you have implemented as task (3) above.

in an archive with the filename **GroupXX****\_Monday/Friday\_Lab3.zip** (replace XX with your group number) and upload it to Canvas. One submission per group is sufficient – if there are multiple submissions, the file with the latest timestamp will be taken as the final submission. **_Do not_** zip and upload the complete project folder – only those files mentioned above should be included. **The files should be the exact same files that you used for the demo**.
