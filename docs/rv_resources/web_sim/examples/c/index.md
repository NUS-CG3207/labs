# C Example Index

Read by the simulator's **Example:** dropdown in C mode, in row order. Add a
program by adding a row here and dropping a matching `.c` file in this folder
— no HTML changes needed. Up to 15 rows; the simulator does not enforce that
limit, it is just what the menu is designed for.

`dip_led_c` is the one exception: it is also baked directly into
`riscv_simulator.html` (`BAKED_C_EXAMPLE`), so its *source* loads with no
server — compiling it still needs Godbolt regardless, same as every other C
example here. If you change this file's row for it, update that baked copy
too, or the two will say different things.

| Key | Label | File | Description |
|-----|-------|------|--------------|
| dip_led_c | DIP to LED (start here) | DIP_to_LED.c | DIP switches mirrored to LEDs — the one C example baked into the page, works with no server |
| basic_c | Basic Sum | basic.c | A short, complete program: sum = a + b + c |
| factorial_c | Factorial | factorial.c | Recursive factorial |
| fibonacci_c | Fibonacci | fibonacci.c | Fibonacci sequence |
| loop_c | Array Search | loop_array.c | Array search and accumulation |
| matrix_c | Matrix Multiply | matrix_multiply.c | 2x2 matrix multiplication |
| peripherals_c | MMIO Peripherals | peripherals.c | Nexys 4 MMIO peripherals and UART |
| hello_world_c | Hello World | HelloWorld.c | UART command echo with a greeting |
| hello_jal_c | Hello Subroutine | HelloWorld_jal_jalr.c | UART command echo, greeting printed by a function taking a parameter |
| circle_accel_c | Circle & Accel | Circle_delay_accel.c | Circle and delay accel |
| image_display_c | Image Display & Accel | ImageDisplay_autoadvance_accel.c | Image display autoadvance and accel |
