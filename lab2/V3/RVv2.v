`timescale 1ns / 1ps
/*
----------------------------------------------------------------------------------
-- Company: NUS	
-- Engineer: (c) Rajesh Panicker  
-- 
-- Create Date: 09/22/2020 06:49:10 PM
-- Module Name: RV
-- Project Name: CG3207 Project
-- Target Devices: Nexys 4 / Basys 3
-- Tool Versions: Vivado 2019.2
-- Description: RISC-V Processor Module
-- 
-- Dependencies: NIL
-- 
-- Revision:
-- Revision 0.01 - File Created
-- Additional Comments: The interface SHOULD NOT be modified (except making output reg) unless you modify Wrapper.v/vhd too. 
                        The implementation can be modified.
-- 
----------------------------------------------------------------------------------

----------------------------------------------------------------------------------
--	License terms :
--	You are free to use this code as long as you
--		(i) DO NOT post it on any public repository;
--		(ii) use it only for educational purposes;
--		(iii) accept the responsibility to ensure that your implementation does not violate anyone's intellectual property.
--		(iv) accept that the program is provided "as is" without warranty of any kind or assurance regarding its suitability for any particular purpose;
--		(v) send an email to rajesh<dot>panicker<at>ieee.org briefly mentioning its use (except when used for the course CG3207 at the National University of Singapore);
--		(vi) retain this notice in this file as well as any files derived from this.
----------------------------------------------------------------------------------
*/

//-- Save waveform file and add it to the project
//-- Reset and launch simulation if you add internal signals to the waveform window
// Change wire to reg if assigned inside a procedural (always) block. However, where it is easy enough, use assign instead of always.
// A 2-1 multiplexing can be done easily using an assign with a ternary operator
// For multiplexing with number of inputs > 2, a case construct within an always block is a natural fit. DO NOT to use nested ternary assignment operator as it hampers the readability of your code.


module RV(
    input CLK,
    input RESET,
    //input Interrupt,      // for optional future use.
    input [31:0] Instr,
    input [31:0] ReadData_in,       // v2: Renamed to support lb/lbu/lh/lhu
    output MemRead,
    output [3:0] MemWrite_out,		// v2: Changed to column-wise write enable to support sb/sw. Each column is a byte.
    output [31:0] PC,
    output [31:0] ALUResult,
    output [31:0] WriteData_out		// v2: Renamed to support sb/sw
    );
    
    // v2: Please read Lab 4 Enhancement: Implementing additional instructions on how to support lb/lbu/lh/lhu/sb/sh
        
    //RV Signals
    // v2: <Added to support lb/lbu/lh/lhu/sb/sh>
    wire [2:0] SizeSel;
    wire [31:0] ReadData;
    wire [31:0] WriteData;
    wire MemWrite;
    // v2: </Added to support lb/lbu/lh/lhu/sb/sh>

    // The signals that are commented out (except CLK) will need to be uncommented and attached a stage suffix for pipelining,
    //  except if the connection is within the same stage.

    // RegFile signals
    //wire CLK ;
    wire WE ;
    wire [4:0] rs1 ;
    wire [4:0] rs2 ;
    wire [4:0] rd ;
    wire [31:0] WD ;
    wire [31:0] R15 ;
    wire [31:0] RD1 ;
    wire [31:0] RD2 ;
    
    // Extend Module signals
    wire [2:0] ImmSrc ;
    wire [24:0] InstrImm ;
    wire [31:0] ExtImm ;
    
    // Decoder signals
    wire [6:0] Opcode ;
    wire [2:0] Funct3 ;
    wire [6:0] Funct7 ;
    wire [1:0] PCS ;
    wire RegWrite ;
    //wire MemWrite ;
    wire MemtoReg ;
    //wire [1:0] ALUSrcA ;
    wire ALUSrcB ;
    //wire [2:0] ImmSrc ;
    wire [3:0] ALUControl ;

    // PC_Logic signals
    //wire [1:0] PCS
    //wire [2:0] Funct3;
    //wire [2:0] ALUFlags;
    wire PCSrc;
      
    // ALU signals
    wire [31:0] Src_A ;
    wire [31:0] Src_B ;
    //wire [3:0] ALUControl ;
    //wire [31:0] ALUResult ;
    wire [2:0] ALUFlags ;
    
    // ProgramCounter signals
    //wire CLK ;
    //wire RESET ;
    wire WE_PC ;    
    wire [31:0] PC_IN ;
    //wire [31:0] PC ; 
        
    // Other internal signals here
    wire [31:0] PC_Offset ;
    wire [31:0] Result ;
    
    assign MemRead = MemtoReg; // This is needed for the proper functionality of some devices such as UART CONSOLE
    assign WE_PC = 1 ;  // Will need to control it for multi-cycle operations (Multiplication, Division) and/or Pipelining with hazard hardware.

    // v2: <Added to support lb/lbu/lh/lhu/sb/sh>
    assign ReadData = ReadData_in;       // Change datapath as appropriate if supporting lb/lbu/lh/lhu
    assign WriteData_out = WriteData;    // Change datapath as appropriate if supporting sb/sh
    assign MemWrite_out = {4{MemWrite}}; // Change datapath as appropriate if supporting sb/sh
    assign SizeSel = 3'b010;             // Change this to be generated by the Decoder (control) as appropriate if 
                                         // supporting lb/sb/lbu/lh/sh/lhu/lw/sw. Hint: funct3
    // v2: </Added to support lb/lbu/lh/lhu/sb/sh>


    // todo: other datapath connections here
	
    // Instantiate RegFile
    RegFile RegFile1( 
                    CLK,
                    WE,
                    rs1,
                    rs2,
                    rd,
                    WD,
                    RD1,
                    RD2     
                );
                
     // Instantiate Extend Module
    Extend Extend1(
                    ImmSrc,
                    InstrImm,
                    ExtImm
                );
                
    // Instantiate Decoder
    Decoder Decoder1(
                    Opcode,
                    Funct3,
                    Funct7,
                    PCS,
                    RegWrite,
                    MemWrite,
                    MemtoReg,
                    //ALUSrcA,
                    ALUSrcB,
                    ImmSrc,
                    ALUControl
                );
                
    // Instantiate PC_Logic
	PC_Logic PC_Logic1(
                    PCS,
                    Funct3,
                    ALUFlags,
                    PCSrc
		);
                
    // Instantiate ALU        
    ALU ALU1(
                    Src_A,
                    Src_B,
                    ALUControl,
                    ALUResult,
                    ALUFlags
                );                
    
    // Instantiate ProgramCounter    
    ProgramCounter ProgramCounter1(
                    CLK,
                    RESET,
                    WE_PC,    
                    PC_IN,
                    PC  
                );                             
endmodule