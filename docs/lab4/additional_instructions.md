---
nav_order: 4
parent: "Lab 4: (Near) Complete Processor + Pipelining + Bells + Whistles"
---
# Lab 4 Enhancement: Implementing additional instructions

You may choose to implement some additional instructions for your processor for your enhancement, or features of instructions that have not been fully implemented. The score you get for this will depend on how much additional logic you need to add for these features.

## Suggestions for RISC-V
  
* Add support for byte and half-word load and store: `lb`, `lh`, `lbu`, `lhu`, `sb`, `sbu`.

ReadData_in is the whole word that contains the word/half-word/byte you want.
You need to extract out what you want, with sign/zero(`u`) extension as required by the instruction.  
For example, when running `lbu` (load byte unsigned) instruction, if the last 2 bits of the address is 2'b01, and the address location specified in the instruction has 8'hAB, ReadData_in is 32'hxxxxABxx. ReadData, the word to be written into the destination register is 32'h000000AB (0s as MSBs as it is `lbu`).  
For `lb`, ReadData_in[15] should be replicated to the 24 MSBs. You have to do this conversion.

WriteData_out is a word, with word/byte/half-word aligned to where you wish to write it to within the word. The MemWrite_out bits of every byte to be modified should be 1. For example,when running `sb` (store byte) instruction, if the last 2 bits of the address is 2'b10 and the byte to be written is 8'hAB (or 32'b000000AB), WriteData_out should be 32'hxxABxxxx and MemWrite_out should be 4'h0100.You have to do this conversion.  
Another example: when running `sh` (store halfword), if the last 2 bits of the address is 2'b10 and the half-word to be written is 16'hABCD (or 32'h0000ABCD), WriteData_out should be 32'hABCDxxxx and MemWrite_out should be 4'h1100. You have to do this conversion.

CAUTION: Unaligned data reads and writes are NOT supported.
If the instruction is `lh`/`lhu`/`sh` (load/store halfword), the data memory address should be divisble by 2 (the last bit should be 0)
If the instruction is `lw`/`sw`, the data memory address should be divisible by 4 (the last two bits should be 0s)

Potential enhancement: Unaligned requests can be detected and used to generate interrupts by editing the wrapper. This interrupt could be used to do a software emulation of unaligned access via aligned access.

* Other ISA extensions: see the [RISC-V Specification](https://riscv.org/wp-content/uploads/2019/12/riscv-spec-20191213.pdf) for ideas.

## Suggestions for ARM

* Implement all 16 Data Processing instructions. See Section "A3.4 Data processing instructions" in page A3-9 to A3-11 (page 75) of ARM [Architecture Reference Manual](https://canvas.nus.edu.sg/courses/62251/files/folder/Lab%20Resources?preview=4733362) for the details of the instructions. Page A3-11 has links to Sections 4.xx where the instruction behavior is explained in more detail. Make sure you look at the ARM (32-bit) instructions, not Thumb (16-bit) instructions.
  * It mainly involves modifying the ALU and the ALU Decoder.
  * The C flag has to be an output from the CondLogic component/module, to act as an input for the ALU component/module (to support ADC instruction).
  * Implement it efficiently, hopefully without additional adders.
* Support the additional multiplication instructions like `SMULL` and `UMULL`. There is not much point in implementing `SMLAL` and `UMLAL` since we already cannibalized the `MLA` instruction for division.
* Support other instructions like `SWP` and `BL`.
* Support other variants of existing instructions such as pre-indexed and post-indexed `LDR`/`STR`, Register Shifted Register Src2, `MUL` setting `Z` and `N` flags, etc.
* Support Src2 for DP instructions with rotated immediates.
  * You can use the same shifter unit that we have used so far. Just make the appropriate connections.
  * This will need a 32-bit mux at the shifter input, a 1-bit mux for `Shamt5[0]` (which is '0' when _rot_ is used), as well as a 2-bit mux for sh (which is "11" for immediate Src2) - all the muxes can be controlled using the same control signal.
  * An alternative (more hardware efficient) is to move the shifter after the multiplexer controlled by `ALUSrc` (i.e., to just before SrcB of the ALU), and you can continue to use the same `ALUSrc` control signal. This will eliminate the need for a 32-bit multiplexer. However, you will need a 5-bit multiplexer for Shamt5, with a 2-bit control signal - select `Shamt5` for register Src2, (`Shamt5[4:1], 0`) for immediate Src2 and `00000` for all others. A 2-bit mux for sh will be required too, which selects "11" for immediate Src2, sh for register Src2, and either for all others (as the shift amount is zero for others anyway).
* Your shifter could be modified to generate a carry ('C') based on the last bit that is shifted out (`shifter_carry_out`). This can be used to set the carry flag for instructions such as `MOVS`, `ANDS`, `ORRS`, etc. (see ARM reference manual for the explanation of `MOVS` etc.).
  * This will require `FlagW` to be used differently (now that 'C' and 'V' are not always written together).
  * Effective 'C' will be instruction-dependent - need more logic to channel the appropriate carry into the input of 'C' flipflop/register. This logic can be inside the ALU (in which case the carry from the shifter will have to be an input to the ALU) or in the main ARM module.

### Tips for ARM

* You may require additional read/write ports for the register file. You could also use micro-operations to avoid the need for more than 2 read ports / more than two write ports for some of the instructions - you will need additional logic to write results one by one over two cycles while PC is stalled. For example, for `SMULL`, `UMULL` etc, you can have an internal register (which is not in the visible register set) for storing the second word, to be written in the second cycle. You will also need to generate two sets of control signals - one for the first cycle and one for the second cycle. A multiplexer is required to select one of the two sets of control signals which are passed to the E pipeline register over successive clock cycles.
* You don't have to worry about how xPSR is dealt with in the special case of Rd=R15 as mentioned in the manual.
* Note that when I bit of the instruction is 0, and bit 7 and bit 4 of the instruction are both 1's, the instruction is not a usual DP instruction (could be `MUL` etc.).
* You can modify the ARM processor to work even for `LDR PC,..` without that much of an effort. If `LDR` with PC as destination needs to be supported, we need to create a separate signal `PCWriteLDR` specifically for this case. `PCWriteLDRM + PCWriteLDRW` should stall D and Flush E., in addition to `PCSrcE` flushing D and E (effectively, we will be flushing 4 instructions). You will need to retain the multiplexer as in the original circuit to enable the result read from the memory to go into PC. So essentially, you will have 2 multiplexers for PC input - one as in the original branch, and one for early BTA.
* Forwarding data from W to D will allow you to write register file at the positive edge, which will most likely reduce your critical path and improve the frequency at which your processor can operate.
