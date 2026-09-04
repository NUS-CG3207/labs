// DIP switches mirrored to LEDs, continuously (C translation of DIP_to_LED.asm)
#define IROM_BASE 0x00400000		// Should be the same as the .txt address based on the Memory Configuration set in the assembler/linker, 
                                        // Wrapper.v and the PC default value as well as reset value in **ProgramCounter.v** 
#define DMEM_BASE 0x10010000   	// Should be the same as the .data address based on the Memory Configuration set in the assembler/linker, and Wrapper.v
#define DMEM_SIZE 0x200         // 2**DMEM_DEPTH_BITS, as in Wrapper.v
#define MMIO_BASE 0xFFFF0000   // Should be the same as the .mmio address based on the Memory Configuration set in the assembler/linker, and Wrapper.v
#define STACK_INIT DMEM_BASE + DMEM_SIZE // Top of RAM to allow stack to grow downwards

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

#define DELAY_COUNT 4 // matches the wait loop in DIP_to_LED.asm

int main()
{
    asm volatile("li sp, %0" : : "i" (STACK_INIT)); //inline assembly to init sp. Registers cant be accessed explicitly in pure C
    volatile unsigned int* DIP_ADDR = (unsigned int*) (MMIO_BASE+DIP_OFF);
    volatile unsigned int* LED_ADDR = (unsigned int*) (MMIO_BASE+LED_OFF);

    while (1)
    {
        *LED_ADDR = *DIP_ADDR;   // mirror the switches onto the LEDs

        // small delay before sampling again, so the LEDs are not being
        // rewritten on literally every cycle
        for (volatile unsigned int i = DELAY_COUNT; i > 0; i--);
    }
    return 0;
}
