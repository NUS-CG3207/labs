const fs = require('fs');
const html = fs.readFileSync('riscv_simulator.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
const js = match[1];

eval(js);

// Test with loop example (has hex offsets)
console.log("=== Testing 'loop' example ===");
const loopCode = document ? null : `# Loop with Memory Access
# Sum array elements
.text
main:
    # Initialize array in memory
    addi  x1, x0, 10     # x1 = 10
    addi  x2, x0, 20     # x2 = 20
    addi  x3, x0, 30     # x3 = 30
    addi  x4, x0, 40     # x4 = 40
    addi  x5, x0, 50     # x5 = 50
    
    sw    x1, 0x100(x0)  # Store values
    sw    x2, 0x104(x0)
    sw    x3, 0x108(x0)
    sw    x4, 0x10C(x0)
    sw    x5, 0x110(x0)
    
    # Sum them
    addi  x6, x0, 0      # sum = 0
    addi  x7, x0, 5      # count = 5
    addi  x8, x0, 0      # index = 0
    
sum_loop:
    beq   x8, x7, finish # if index == count, done
    lw    x9, 0x100(x8)  # load array[index]
    add   x6, x6, x9     # sum += value
    addi  x8, x8, 4      # index += 4
    j     sum_loop
    
finish:
    sw    x6, 0x200(x0)  # store sum
    j     finish`;

// We need to mock document for the functions that reference it
// But assemble() doesn't need document - let's test it directly

try {
    const result = assemble(loopCode);
    let hasErrors = false;
    for (const item of result) {
        if (item.error) {
            console.log(`ERROR at ${item.address.toString(16)}: ${item.error}`);
            hasErrors = true;
        }
    }
    if (!hasErrors) {
        console.log(`SUCCESS: ${result.length} instructions assembled`);
        for (const item of result) {
            console.log(`  0x${item.address.toString(16)}: ${item.bytes.map(b => b.toString(16).padStart(2,'0')).join(' ')} | ${item.text}`);
        }
    }
} catch(e) {
    console.log('Assembly error:', e.message);
}

// Test the basic example
console.log("\n=== Testing 'basic' example ===");
const basicCode = `# Basic RISC-V Example
.text
main:
    addi  x1, x0, 10
    addi  x2, x0, 20
    addi  x3, x0, 30
    add   x4, x1, x2
    add   x5, x4, x3
    sw    x5, 0(x0)
loop:
    j loop`;

try {
    const result = assemble(basicCode);
    let hasErrors = false;
    for (const item of result) {
        if (item.error) {
            console.log(`ERROR at ${item.address.toString(16)}: ${item.error}`);
            hasErrors = true;
        }
    }
    if (!hasErrors) {
        console.log(`SUCCESS: ${result.length} instructions assembled`);
    }
} catch(e) {
    console.log('Assembly error:', e.message);
}