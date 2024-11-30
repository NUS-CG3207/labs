;----------------------------------------------------------------------------------
;--	License terms :
;--	You are free to use this code as long as you
;--		(i) DO NOT post it on any public repository;
;--		(ii) use it only for educational purposes;
;--		(iii) accept the responsibility to ensure that your implementation does not violate any intellectual property of ARM Holdings or other entities.
;--		(iv) accept that the program is provided "as is" without warranty of any kind or assurance regarding its suitability for any particular purpose;
;--		(v) send an email to rajesh.panicker@ieee.org briefly mentioning its use (except when used for the course CG3207 at the National University of Singapore);
;--		(vi) retain this notice in this file or any files derived from this.
;----------------------------------------------------------------------------------

	AREA    MYCODE, CODE, READONLY, ALIGN=9 
   	  ENTRY
	  
; ------- <code memory (ROM mapped to Instruction Memory) begins>
; Total number of instructions should not exceed 127 (126 excluding the last line 'halt B halt').
		MOV  R0, #0         ; R0 stores total
		MOV  R1, R15        ; It is interesting to note that R15 is read as PC+8 in ARM7. Here, R1 = PC+8 = 4 + 8 = 0xC
loop	
		ADD  R0, R0, R1
		SUBS R1, R1, #1
		BNE  loop			; loops 12 times as R1 = 12 in line 8.
		; some random instructions below to illustrate loads and stores - doesn't do anything meaningful
		LDR  R0, constant1	; 
		STR  R5, variable1  ; PC relative STRs are supported in ARM7 (ARMv3 ISA), unlike LPC1769/ARM Cortex M3 (ARMv7M ISA)
		LDR  R5, variable1	; load from a variable only after storing something to it (variables are in RAM - a volatile memory)
		LDR	 R2, variable1_addr	; to get the address of variable1 in R2. 
		; instead of the pseudo-instruction LDR	 R2, =variable1, use LDR R2, variable1_addr	and variable1_addr DCD variable1
		STR  R0, [R2]		; store using address of variable 1 as a pointer. *R2 = R0;
		STR  R0, [R2,#4] 	; *(R2+4) = R0;
halt	
		B    halt           ; infinite loop to halt computation. // A program should not "terminate" without an operating system to return control to
							; keep halt	B halt as the last line of your code.
; ------- <\code memory (ROM mapped to Instruction Memory) ends>


	AREA    CONSTANTS, DATA, READONLY, ALIGN=9 
; ------- <constant memory (ROM mapped to Data Memory) begins>
; All constants should be declared in this section. This section is read only (Only LDR, no STR).
; Total number of constants should not exceed 128 (124 excluding the 4 used for peripheral pointers).
; If a variable is accessed multiple times, it is better to store the address in a register and use it rather than load it repeatedly.

;Peripheral pointers
LEDS
		DCD 0x00000C00		; Address of LEDs. //volatile unsigned int * const LEDS = (unsigned int*)0x00000C00;  
DIPS
		DCD 0x00000C04		; Address of DIP switches. //volatile unsigned int * const DIPS = (unsigned int*)0x00000C04;
PBS
		DCD 0x00000C08		; Address of Push Buttons. Used only in Lab 2
UART
		DCD 0x00000C0C		; Address of UART. Used only in Lab 2

; Rest of the constants should be declared below.
DELAY_VAL   
		DCD  0x4			; The number of steps of delay // const unsigned int DELAY_VAL = 4;
variable1_addr
		DCD variable1		; address of variable1. Required since we are avoiding pseudo-instructions // unsigned int * const variable1_addr = &variable1;
constant1
		DCD 0xABCD1234		; // const unsigned int constant1 = 0xABCD1234;
string1   
		DCB  "Hello World!!!!",0	; // unsigned char string1[] = "Hello World!"; // assembler will issue a warning if the string size is not a multiple of 4, but the warning is safe to ignore
		
; ------- <constant memory (ROM mapped to Data Memory) ends>	


	AREA   VARIABLES, DATA, READWRITE, ALIGN=9
; ------- <variable memory (RAM mapped to Data Memory) begins>
; All variables should be declared in this section. This section is read-write.
; Total number of variables should not exceed 128. 
; No initialization possible in this region. In other words, you should write to a location before you can read from it (i.e., write to a location using STR before reading using LDR).

variable1
		DCD 0x00000000		;  // unsigned int variable1;
; ------- <variable memory (RAM mapped to Data Memory) ends>	

		END	
		
;const int* x;         // x is a non-constant pointer to constant data
;int const* x;         // x is a non-constant pointer to constant data 
;int*const x;          // x is a constant pointer to non-constant data
		