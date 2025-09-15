# Assignment 2: Implementation of a RISC-V 32-bit (RV32I) Processor

!!! success "Final"
    This page is now final. Updates will be minimal, and will be <span style="color: brown;">highlighted</span>. 

!!! info

    Assignment 2 consists of 1 task, with 2 subtasks, for a total of **30 points**. 

    Assignment 2 is a group exercise. You will be assessed as a group, but scored individually. 

## Objective

In this assignment, we will be implementing the basic RISC-V (or ARM!) processor supporting only limited 32-bit integer instructions.

### Requirements

=== "RISC-V"

    Implement the following instructions:

    *   `add`, `addi`, `sub`, `and`, `andi`, `or`, `ori`
    *   `lw`, `sw`
    *   `beq`, `bne`, `jal` (without linking, that is, without saving the return address). 
    *   `lui`,` auipc`
    *   `sll`, `srl`, `sra`

=== "ARM"

    Implement the following instructions:

    * `LDR`, `STR` (Both with positive immediate offsets)
    * `AND`, `OR`, `ADD`, `SUB` (Where `Src2` is register or immediate without shifts)
    * `B`
    * `CMP`
    * `LDR`, `STR`
    * Immediate shift support for `Src2` in DP instructions (i.e. `LSL`, `LSR`, `ASR`, `ROR`) (3 points)

No extra points will be awarded for performance enhancements / adding support for more instructions (that's for Labs 3 and 4). However, a lack of convincing demos (with carefully crafted assembly language programs) can result in the deduction of points.

## Design Files

The design files can be found here - [Lab\_2\_Template\_files](https://github.com/NUS-CG3207/labs/tree/main/lab2). Download them and import them into a new Vivado project, using the same settings as Assignment 1.

!!! warning
    The FPGA part number we need is `xc7a100tcsg324-1`. Using the wrong, or any random, part number, will **not** work. Actually, even worse - it will work until we try to generate the bitstream, and then error out. ~Fun!

### File hierarchy

Described below is the file/module hierarchy for the project we will use. Note that we do **NOT** simulate the `TOP_Nexys` module. Instead, the system is designed such that we can simulate the `Wrapper` module, using `test_Wrapper.v` as a testbench. We can assume `TOP_Nexys` works correctly without simulation, as long as the `Wrapper` is correctly implemented.

This means we have two similar, but slightly different, module hierarchies for simulation and for hardware.

#### For simulation and testing

    test_Wrapper.v                  // Top level module for simulation
        |
        - Wrapper.v                 // Unit under test for simulation
            |
            - RV.v                  // Our CPU!
                |
                - ALU.v
                    |
                    - Shifter.v
                - Decoder.v
                - Extend.v
                - PC_Logic.v
                - ProgramCounter.v
                - RegFile.v

#### For hardware implementation

    - TOP_Nexys.vhd             // Top level module for hardware implementation
        |
        - ADXL362Ctrl.vhd
            |
            - SPI-If.vhd
        - pmodoledrgb_bitmap.vhd
        - uart.vhd
        - Wrapper.v               // Unit under test for simulation
            |
            - RV.v                  // Our CPU!
                |
                - ALU.v
                    |
                    - Shifter.v
                - Decoder.v
                - Extend.v
                - PC_Logic.v
                - ProgramCounter.v
                - RegFile.v

### Setting up the project

Import all the relevant files into your project - all the .v files, as well as `TOP_Nexys.vhd` and `uart.vhd`, `ADXL362Ctrl.vhd`, `SPI_If.vhd`, `pmodoledrgb_bitmap.vhd` - irrespective of whether you use these peripherals.

!!! warning
    It is very important to ensure that the top-level module is set correctly in our project: `TOP_Nexys` for implementation, and `test_Wrapper` for simulation. The Top module can be set independently for implementation and simulation. Simply right-click the appropriate file under Design Sources or Simulation Sources, and click "Set as Top". The module selected as the top should appear in bold with a small, grey-and-green icon by its side.

    If we just select `TOP_Nexys` as the top module for implementation, Vivado may automatically select it as the top module for simulation as well. We do not want this, so remember to set `test_Wrapper` as the top module for simulation. 

Choose the appropriate constraint file for your board.[^1] The files are pretty self-explanatory. It is possible to mix VHDL and Verilog files in the same project. Note that TOP/uart.vhd is the same as that for the ARM version. All other files have differences, though in many cases, the differences are minor.

[^1]:
    It is a good idea to delay importing the constraints file and the TOP\_<board>.vhd file until you are ready to test on hardware. Not having the constraints file during the design / simulation phase can help avoid some warnings related to synthesis when you try synthesizing a module that does not have the interfaces specified in the constraints file. Alternatively, import it, but keep it disabled until you need it in Project Manager > Sources > Constraints > right-click and Disable File.

!!! tip
    We have found that AI tools (ChatGPT in particular) is pretty decent at converting our Verilog template files into VHDL. If you are a VHDL fan (as some of the teaching team are), feel free to try this.

### Why does the Wrapper exist?

`Wrapper` is a convenient testbed to plug our processor (RV) into and simulate it using `test_Wrapper` as the testbench - see below for more details on how to modify the `test_Wrapper` appropriately. `Wrapper` provides instruction/data memory and a set of abstract peripherals with easy-to-view signals. The abstract peripherals of the Wrapper are converted to real protocol/interfacing signals by `TOP_Nexys.vhd`. For example, `UART_RX`/`UART_TX` (parallel) of the Wrapper to `RX`/`TX` (serial, external signals) of UART, anode and cathode activation signals of the 7-segment display. Writing a testbench to simulate RV directly is unnecessary. The Wrapper is not very modular, but was kept that way to make it self-contained and hence avoid having too many files.

`Wrapper.v` for ARM and RISC-V are almost identical. The only notable difference is in the memory map, and also the fact that the wrapper for ARM has not been updated since 2024.

## What code to modify

There are basically 4 files we need to populate / modify  - **PC_Logic.v** , **Decoder.v** , **RV.v** ; we will also need to add our code / constant memories hex values into **Wrapper.v**. A 5th file, **ALU.v** should also be modified to incorporate shifts.

There are 5 files we must populate/modify:

1. `ALU.v`: we must modify the ALU to incorporate shifts.
2. `Decoder.v`
3. `PC_Logic.v`
4. `RV.v`
5. `Wrapper.v`: we need to add our Instruction and Data ROMs here. This can be done in the same way as [Assignment 1](../../Asst_01/Asst_01/#design-guide).
6. `TOP_Nexys.vhd`: we may need to modify `CLK_DIV_BITS` depending on the processor clock speed we want to achieve (we can keep it to a low number like 5 if we are using UART). This need not be changed for simulation as `TOP_Nexys.vhd` is not simulated. Changing CLK_DIV_BITS to 0 causes the frequency to be 100 MHz, but unless you do lots of optimizations such as pipelining.

You are expected to know the functionality of all components of the RISC-V processor (RV module and its sub-modules*), irrespective of who wrote it - you or your teammate or provided as a part of the templates or assisted by AI (in which case you should declare the prompts used as a comment, and also verbally to the evaluator). You need not understand `TOP`. A fair understanding of `Wrapper` is essential; a deeper understanding is recommended though not mandatory.

*For assignment #2, a deeper understanding of the shifter component is not essential. For future assignments, it is.

!!! tip
    Read the comments (especially about the input and output ports / interfaces) in the `Wrapper.v` carefully.

## Guidelines

The following section is an extensive set of design guidelines that you must follow for this (and subsequent) assignments. There are a lot, so we have broken them down into subsections to make it easier to read and understand them all. Which is really, really, really important.

### Designing the ALU

All arithmetic, logical, and shift operations on 32-bit numbers should be done in the ALU, except for the new PC (PC+ aka PC_IN) computation.

We should use `+` on 32-bit numbers only in 2 statements: one to compute the new PC value, and one statement in ALU. In other words, only 2 32-bit adders can be used in the whole system. A single-cycle processor cannot be implemented with less than 2 adders, but a multi-cycle design can be - this will require the ALU to be used for PC increment in a second cycle for the same instructions.

You are not required to implement your own carry look ahead or ripple carry adders. The `+` operator synthesizes a circuit that makes use of the built-in carry acceleration logic built into most FPGAs.[^2] However, if you insist on implementing your own adder logic for the sake of learning, please go ahead. It will use the general-purpose fabric/routing, which will almost certainly be slower (doesn't matter for lower frequencies though).

[^2]: carry chain, carry lookahead logic - Google for CARRY4

`=` should not be used on 32-bit numbers for Lab 2.The comparison for conditional branch should be done inside the ALU through subtraction. `=` may be used in other places such as the control unit, to implement multiplexers in the datapath, for checking the value of counter(s) for Lab 3 MCycle unit, etc., but this comparison is done on values that are much less than 32 bits.[^3]

[^3]: We may need `=` on 32-bit numbers in Lab 4 if we are implementing branch prediction, but that is optional and far away from where we are now :).

All Shift operations on 32-bit numbers should be done in the Shifter unit.

### General hardware design

**DO NOT create additional entities/modules**. Components such as multiplexers are easily implemented using when-else / with-select / if / case statements. Leave PC_Logic and Decoder separate (do not combine them into one ControlUnit entity). However, the interfaces for entities could be modified slightly to meet the design requirements.

DO NOT modify the ports of the entity RISC-V, unless you want to take responsibility for the wrapper module.

It is a good idea to use `-` (VHDL) or `X` (Verilog) for don't cares, as it could simplify the combinational logic. However, there are 2 points to note:

1. Using don't cares with signals which change the processor state (RegWrite, PCSrc, MemWrite) would make the system vulnerable to illegal instructions.
2. Don't cares can cause different behavior in simulation and synthesis. Don't cares are treated as don't cares in simulation, whereas in synthesis, it could be a random 0 or 1 (whichever simplifies logic better).

Reset resets only the program counter. The register initial values are not guaranteed to be zero. This requires you to write to a register before using/reading it.

You can add more peripherals (RGB LED, accelerometer, VGA display, etc.) to the Wrapper if you wish. The corresponding changes will also need to be done in the top-level .vhd and .xdc files.

### Simulation

We **must** simulate our design and verify its functionality. All debugging should be done in simulation, not in hardware. Furthermore, while developing and testing our design, we should also try synthesizing to ensure that our design is synthesizable without avoidable warnings and errors.

It will be incredibly useful to learn how to use debugging options such as single stepping, breakpoints, running for a specified time, etc. These can help tremendously. However, note that some options such as single stepping work a bit differently from conventional software debugging, due to the inherent parallel nature of HDLs, as well as the fact that non-blocking assignments do not have an instantaneous effect on the LHS. Some additional info is given in the Tips section, and there is a demo on this during the assignment briefing.

### Assembly Programming

Use your own, well-crafted assembly language programs for a convincing demo (to demonstrate that all the required instructions and variants work). **One single program demonstrating all the features is desirable**. Conversely, make sure that your program only uses the features that you have already implemented; notably, we cannot use any multiplication operations, nor many shift operations or `xor`. If you were unable to implement some of the required instructions, make sure your assembly program doesn't use those, otherwise the demo will be quite disappointing.

By 'convincing demo', what we mean is having an assembly language program that tests all the features of all instructions of a particular type. For example, if you demonstrate `addi`, you don't really have to show `andi`, `ori` as it can be expected to work, as the datapath activated is the same. Instructions such as conditional branches should be used such as both possibilities - i.e., branch taken and branch not taken should be demonstrated. In other words, it should provide an exhaustive 'coverage' of your HDL code. Your program should be crafted such that if one instruction misbehaves, the overall behavior of the program should be different (this is the case for most programs, as long as you use the result from every instruction in a subsequent instruction).

Please follow the instructions in the [RISC-V Programming](../../rv_resources/rv_programming.md) page to configure RARS and to write programs. The .hex file generated by the program is inserted into the ROMs within Wrapper.v directly to "program" the RISC-V processor. Note: Instruction and data memory sizes can be bigger than 128 words. Be mindful of the potentially increased synthesis time though. Addresses except `IROM_BASE` and `DMEM_BASE` are hierarchically derived instead of hard-coding.

Simulate your assembly language program thoroughly - else when something goes wrong, you won't know if the problem is with your HDL code (hardware) or the assembly language program (software).

The Assignment 1 program may be a good place to start while you work on the hardware; modify it to only use the instructions you have implemented, and maybe add more instructions as you implement them.

Byte (`sb`) and half-word (`sh`) writes are supported for data memory and peripherals like the 7-segment display. Ensure memory addresses are aligned, and data is pre-shifted/aligned accordingly.

!!! tip
    Byte and half-word read don't require any Wrapper support - you can simply read the whole byte, extract the byte/half-word, and extend as necessary.

The provided assembly language programs are neither meant to be comprehensive programs that tests everything. Do not use the programs under Optional_Stuff as your first program. Use the DIP_to_LED.asm instead. Even this will need appropriate modifications to include instructions such as **DP reg type**, **bne**, and shifts in a meaningful manner.

The `test_Wrapper.v` you use is specific to the assembly language program being run. It simulates the scenario of giving inputs externally manually/from sensors, and getting the output on various displays/UART. Depending on the inputs your .asm program expect, the stimuli of your testbench will have to change too.

You could use the program that you simulated in RARS in Lab 1 as a starting point if you have implemented `lui` and `auipc`. However, you will need to make appropriate modifications to include instructions such as R type, `bne`, and shifts in a meaningful manner. The `test_Wrapper` should be modified to give appropriate stimuli, as mentioned in the previous point. You can use it even before incorporating `lui` and `auipc`, but you will need to change it such that s1 and s2 are loaded from memory.

There is no requirement that you should use all the peripherals supported by the Wrapper. As long as your demo is convincing, it is fine to use only a limited set of peripherals (say, LEDs and DIP switches \- at least one input and one output). [RISC-V Memory Map](../../rv_resources/rv_memmap.md) page has more details about the address and usage of the supported peripherals.

To use a C compiler to generate code, please follow the instructions at [Using Compiled Code](../../rv_resources/using_compiled_code.md). However, note that this works only if the compiler does not generate any instruction that your processor doesn't support at this point.

## Tips

The following section details some tips and tricks that will make your life a lot easier. We recommend at least reading them and being aware these are all possible, even if you do not actually use all of this information.

### Hardware design tips

* Re-run synthesis if you have changed the .mem file contents, even when the tool tells you that synthesis is up to date.

* Synthesize modules that you edit, such as decoder and conditional logic by setting them as top-level modules even before simulation. The synthesis tool is much smarter than the simulation tool - **synthesis reports and warnings** can give you a wealth of information.

* Looking at RTL Analysis > Open Elaborated design gives you insights into the schematic (block design) inferred from your code. This can be very useful in debugging. Pay particular attention to the bit widths for each connection etc. You can get even more information from the synthesis report.

* If you try to run the design from a 100 MHz clock directly (`CLK_DIV_BITS = 0`, i.e., without dividing the clock), you will most certainly get a critical warning that the timing constraints are not met (Why?).  Your design may or may not work on hardware, and it is unreliable even if it works. A pipelined design (Lab 4) should work directly from 100 MHz.

* The default processor clock frequency is 5 MHz which is ideal for UART, but too fast for LEDs - you will see the LEDs constantly lit, but different LEDs may have different brightness (why?). To see the output on LEDs, you need to have the LEDs changing state slow enough. There are two ways to do it:
    1. by using a slow clock for the processor. This is done by setting the `CLK_DIV_BITS` to a value of around 26.
    2. by having a fast clock `CLK_DIV_BITS = 1` for 50MHz), but using software delays (using a high value for `DELAY_VAL` between LED writes).

    However, note that you should use a very low `DELAY_VAL` during simulation. Else, you might have to run simulation for a long time to get past the delay. Make sure you change either of them to a high value before implementation/bitstream generation. Similar considerations apply while sending data via UART.

* By default, Vivado will run significantly slower in Windows than in Linux, due to the differences in the number of threads used. A workaround is mentioned [in the AMD documentation](https://docs.amd.com/r/2021.2-English/ug904-vivado-implementation/Multithreading-with-the-Vivado-Tools)

* To implement `lui` and `auipc`, you will need to have a multiplexer at `SrcA`. The `ALUSrcA` control signal needs to be implemented properly too.

* The signals connected to the ports are given the same name as the ports themselves. So making the datapath connection is as easy as having a concurrent statement (VHDL) such as `Opcode <= Instr(6 downto 0)` / continuous assignment (Verilog) such as `assign Opcode = Instr[6:0]`.

### Simulation tips and tricks

* Please **SIMULATE** your design before spending your time on bitstream generation. Make sure your design synthesizes without warnings (if at all there are warnings, you should know the reasons, and you should ensure that the warnings do not affect the functionality). If you don't simulate and click 'generate bitstream' hoping it would work on the board, you are probably wasting your time. This can't be emphasized enough.

* You can get a very very good sense of whether your design will work on hardware by doing a **post-synthesis functional simulation** by Simulation > Run Simulation > Post-synthesis functional simulation (Instead of the usual Behavioural Simulation).
  * The same testbench can be used, so it requires zero extra effort.
  * Debugging is much harder than it is with behavioral simulation as some internal signals are optimized away and/or renamed (still easier than it is with hardware).
  * For post-synthesis functional simulation, _either_ the Wrapper or the TOP should be set as the top-level module for synthesis, and then the module should be synthesized before it can be (post-synthesis) simulated. Note, however, though that setting the Wrapper as top for synthesis will cause a lot of warnings as there are mismatches in location constriants with the .xdc file; the top level module for synthesis will have to be changed back to TOP anyway for implementation.

* Make sure that the HDL testbench, .asm, .mem always correspond.

* Relaunch simulation after changing .mem.

* A self-checking testbench can be quite useful. You may use LLM tools for that. Tools such as Claude tends to do a better job than ChatGPT for this (in our experience). Declare LLM tool+version, and prompts used as a comment. For example, the [test_Wrapper_DIP_to_LED.v](../../code_templates/Asst_02/test_Wrapper_DIP_to_LED.v) is convereted to sel-checking [test_Wrapper_DIP_to_LED_self_checking.v](../../code_templates/Asst_02/test_Wrapper_DIP_to_LED_self_checking.v) via a prompt that is declared as a comment in the latter file.

* You can go into the subunits and see their value for each instruction (Scope-Objects) - this is much easier than what most of you think. This is more powerful than dragging the various signals into the waveform. Note that the values you see are those at the time the simulation has stopped/paused, not the time corresponding to the yellow vertical bar in the waveforms window. Double-clicking the Scope-Objects will lead you to the source code - you can then hover the mouse pointer above various objects to see their values.

* Make sure your radix in the waveform window / Scope-Objects is set correctly. Looking at hexadecimal and assuming them to be decimal or vice versa is a common mistake. Saving the waveform window (`.wcfg`) and adding it to the project will ensure that such settings get saved. For UART input/output, setting the radix to ASCII can be useful.

* Have the RARS simulator side by side so that you can compare the register/memory values between that in RARS and HDL register/memory objects. While you single step in RARS, you can also run by 10 more ns to have the same effect in HDL simulation. It helps to have the PC and Instr values in the waveform window to see the correspondence between RARS and HDL simulations, i.e., to ensure that you are looking at the same instruction on the two tools.

* Don't forget to **Relaunch** simulation (not just Restart) once you have made any changes to your HDL.

### Expected warnings

* **Warning about `indices_reg`**: This is related to the seven-segment display and can be ignored.

* **Warnings about `Funct7` bits other than `Funct7[5]` being unused**: This is also expected.

* **Warnings about `Shifter` connections and `ALUFlags`**: may appear until you connect them. After connecting them, they should go away.

* **Warnings (~100 in number) about unconnected stuff being removed**: chances are that you haven't initialized the ROMs.

* If you are synthesizing after setting a module other than TOP as the top-level module, you will get warnings such as those below. If your intention is to check the synthesizability of modules one by one, these warnings can be safely ignored (Why?).
  * `'set_property' expects at least one object.`
  * `create_clock:No valid object(s) found for '-objects [get_ports CLK_undiv]'`

## Submission Info

* You will have to demonstrate your design during your designated lab session in **Week 7**. The presentation schedule can be found on Canvas.
* One single program demonstrating all the features is desirable.
* Please upload a _single archive_ containing all the relevant files to Canvas within 1 hour of your demo.
* Include:
  * `.vhd`/`.v` files you have created/modified (RTL Sources, Testbench(es))
  * `.bit` files
  * `.asm` and `.c` (if applicable) files
  * a `readme.txt`, mentioning the purpose of each file (only those you have created/modified) briefly

in an archive with the filename `Assignment2_<lab day><group number>.zip`, e.g. Assignment2_Monday01.zip. One submission per group is sufficient – if there are multiple submissions, the file with the latest timestamp will be taken as the final submission.

!!! warning
    **_Do not_** zip and upload the complete project folder – only those files mentioned above should be included. **The files should be the exact same files that you used for the demo**.

## Conclusion

Congratulations on completing Assignment 2! You now have a somewhat-working RISC-V CPU that can run some real programs. This is no small achievement, and now is a good time to pat yourself on the back for what you've achieved so far.

The next two assignments will build upon, extend, and improve this CPU, to a very impressive design by the end. We hope you're as excited for this as us!

!!! success "What we have learned"
    *The basic microarchitecture for a simple, single-cycle RISC-V CPU.
    * How to use Vivado and HDL to implement a fairly complex design on an FPGA.
    *The importance of proper simulation to verify functionality, as well as the steps to create this.
    * How to write assembly language programs, and how they are executed by a CPU.
