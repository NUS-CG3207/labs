# RISC-V Assembly

## Selection

```c
// Doing static (storage class) memory allocation here. The variables are
// global to the compilation unit / block / function, and has a lifetime
// that is the entire program.
static int x = x_init_val;
static int y = y_init_val;
static int z = z_init_val;

// inside some function
x++;
if (x > 0)
{
    y++;
}
else
{
    y--;
}
z = x + y;
```

```asm
.text
    # inside some function
    # Load the values of 'x' and 'y' via lw pseudoinstrn
    lw t0, x                    # Load x into register t0
    lw t1, y                    # Load y into register t1

    # x++
    addi t0, t0, 1              # Increment x (t0 = t0 + 1)
    sw t0, x, t3                # Store the updated value of x

    # if (x > 0)
    bgtz t0, greater_than_zero  # Branch if x > 0

    # Else branch: y--
    addi t1, t1, -1             # Decrement y (t1 = t1 - 1)
    sw t1, y, t3                # Store the updated value of y.
                                # sw pseudoinstrn requires a temp register
                                # to be specified. Here, t3 is used throughout
    j update_z                  # Jump to update_z to skip the 'then' branch

greater_than_zero:
    # y++
    addi t1, t1, 1              # Increment y (t1 = t1 + 1)
    sw t1, y, t3                # Store the updated value of y

update_z:
    # z = x + y
    add t2, t0, t1              # t2 = x + y
    sw t2, z, t3                # Store the value of z

.data
# Declare vars x,y,z
x: .word x_init_val
y: .word y_init_val
z: .word z_init_val
```

## Iteration

```c
// Doing static memory allocation here.
// C variable / array declarations not shown.

// inside some fn
for (i = 0; i < n; i++)
{
    x[i] = y[i] + 1;
}
```

```asm
.text
    # inside some fn
    lw t0, n                # Load n into register t0 (t0 = n)
    li t1, 0                # Initialize i to 0 (t1 = i)
    la t4, y                # Get the starting address of y
    la t5, x                # Get the starting address of x

loop:
    # Check if i < n
    bge t1, t0, exit_loop   # If i >= n, exit loop

    # Load y[i] into t2
    slli t3, t1, 2          # i * 4 (for byte offset)
    add t6, t4, t3          # base + offset
    lw t2, 0(t6)            # Load y[i] into t2

    # x[i] = y[i] + 1
    addi t2, t2, 1          # t2 = y[i] + 1
    add t6, t5, t3          # base + offset
    sw t2, 0(t6)            # Store the result in x[i]

    # Increment i
    addi t1, t1, 1          # i++

    # Repeat the loop
    j loop

exit_loop:
    # Exit loop, to the rest of the function

.data
# Example array 'x' and 'y' with 5 elements each
x: .word 0, 0, 0, 0, 0
y: .word 1, 2, 3, 4, 5
# Number of elements, n = 5
n: .word 5
```

## Function call

The C code used for both the caller and the callee below:

```c
// Caller
void fn1() {
    // z1 and z2 are globals
    // x and y are local variables that use registers or stack
    int x = 20;
    int y = 30;
    z1 = fn2(x, y);
    x++;
    y++;
    z2 = x + y;
}

// Callee
int fn2(int p, int q) {
    int temp = p + q;
    return temp;
}
```

### Caller

```asm
# Caller function (which could be a callee of some other fn)
fn1:
    # Prologue: Save callee saved registers: s$ modified by fn1.
    addi sp, sp, -4     # Make space on the stack (full descending)
    sw s0, 0(sp)        # Save whatever was in s0 as we modify s0 in fn1

    # Initialize variables in registers
    li s0, 20           # Load 20 into s0 (x = 20)
    li t0, 30           # Load 30 into t0 (y = 30)

    # Save caller saved registers: a$, ra, t$
    addi sp, sp, -8     # Make space on the stack
    sw t0, 0(sp)        # Store t0 (y) to stack
    sw ra, 4(sp)        # Store ra

    # Call fn2(20, 30), result in a0
    mv a0, s0           # First argument (p = 20)
    mv a1, t0           # Second argument (q = 30)
    call fn2            # jal ra, fn2
    sw a0, z1, t0       # Store the result (z1 = 50)

    # Restore caller saved registers: a$, ra, t$
    lw ra, 4(sp)        # Restore ra from stack
    lw t1, 0(sp)        # Restore y (to t1 this time)
    addi sp, sp, 8      # Restore sp

    # x++ and y++
    addi s0, s0, 1      # x++. x = 21
    addi t1, t1, 1      # y++. y = 31
    add t2, s0, t1      # x+y = 52
    sw t2, z2, t3       # Store the result (z2 = 52)

    # Epilogue: Restore callee saved regs: s$ modified by fn1
    lw s0, 0(sp)        # Restore s0 from stack
    addi sp, sp, 4      # Restore the stack pointer
    ret                 # Return to caller: jalr x0, ra, 0
```

!!! note

    Could reuse `t0` instead of using `t1`, `t2`, `t3` above, but no benefit as
    there is no more function call before `ret`.

!!! warning "Alignment"

    The RISC-V ABI requires `sp` to stay 16-byte aligned. The example here
    doesn't follow that perfectly, for simplicity.

### Callee

```asm
# Callee function.
# Arguments: p in a0, q in a1.
# Returns: temp (p + q) in a0
fn2:
    # Prologue: Save callee saved registers: s$ to stack
    # No need to save caller saved registers as fn2 does
    # not call any function (i.e., is not a caller)
    addi sp, sp, -4     # Make space on the stack
    sw s0, 0(sp)        # Save s0 to stack

    add s0, a0, a1      # temp = p + q
    mv a0, s0           # Return temp in a0

    # Epilogue: Restore callee saved registers: s$ from stack
    lw s0, 0(sp)        # Restore s0 from stack
    addi sp, sp, 4      # Restore sp
    jr ra               # Return to caller: jalr x0, ra, 0 (ret)
```

## Function considerations

- For local variables, memory is allocated and deallocated automatically in the
  stack, or they are kept in registers.
- Modifying globals (`z1`, `z2`) from a function should be avoided as it goes
  against modularity of functions.
    - Done here just for illustration.
- There is no need to save and restore `ra` (caller saved) each time before
  calling a function.
    - Sufficient to save it once at the beginning of a function and restore it
      at the end.

!!! tip "Self-study"

    - Read up more about the RV calling convention — how data bigger than 32
      bits are passed and returned, how a large number of parameters are dealt
      with, etc.!
    - Read up / experiment with how local variables are allocated in a function,
      stack frame, frame pointer, etc.
    - [godbolt.org](https://godbolt.org/) is a great tool. Choose the correct
      language (C) and the compiler/ISA (RISC-V rv32gc clang).

!!! question "Think about it"

    What if the callee function is farther than the range of `jal`?
