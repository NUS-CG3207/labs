// Nexys 4 MMIO Peripherals Control
#define LEDS        (*(volatile unsigned int*)0xFFFF0060)
#define SWITCHES    (*(volatile unsigned int*)0xFFFF0064)
#define BUTTONS     (*(volatile unsigned int*)0xFFFF0068)
#define SEVSEG      (*(volatile unsigned int*)0xFFFF0080)
#define UART_TX     (*(volatile unsigned int*)0xFFFF000C)
#define ACCEL_DATA  (*(volatile unsigned int*)0xFFFF0040)

void uart_print(const char *str) {
    while (*str) {
        UART_TX = *str++;
    }
}

int main() {
    // 1. Output hex pattern to 7-segment display
    SEVSEG = 0x12345678;

    // 2. Set user LEDs
    LEDS = 0x55;

    // 3. Read switches and mirror to LEDs
    unsigned int sw = SWITCHES;
    LEDS = sw & 0xFF;

    // 4. Send greeting over UART
    uart_print("Hello from RISC-V C!\n");

    return 0;
}
