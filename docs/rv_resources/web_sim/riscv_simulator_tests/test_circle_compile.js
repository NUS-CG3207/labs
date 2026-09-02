const fs = require('fs');
const path = require('path');
const https = require('https');

async function compileGodbolt(sourceCode, compilerId = 'rv32-cclang2010', optLevel = '-Os') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      source: sourceCode,
      options: {
        userArguments: `${optLevel} -march=rv32im -mabi=ilp32 -fno-pic -fno-pie`,
        compilerOptions: {
          skipAsm: false,
          executorRequest: false
        },
        filters: {
          binary: false,
          commentOnly: true,
          demangle: true,
          directives: true,
          execute: false,
          intel: false,
          labels: true,
          libraryCode: false,
          trim: true
        }
      }
    });

    const req = https.request({
      hostname: 'godbolt.org',
      port: 443,
      path: `/api/compiler/${encodeURIComponent(compilerId)}/compile`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 20000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testCircleCompilation() {
  let circleC = fs.readFileSync(path.resolve(__dirname, '../Circle_delay_accel.c'), 'utf8');
  circleC = circleC.replace('0xFFFFF0000', '0xFFFF0000');
  circleC = circleC.replace('delay(1000000);', '// Original hardware delay: 1,000,000 cycles (~10ms at 100MHz)\n        // delay(1000000);\n        // Reduced delay value for high-speed real-time simulation:\n        delay(50);');
  
  // Comment out UART printing for simulation speed like in Circle_delay_accel.asm
  circleC = circleC.replace('*UART_TX_ADDR = accel_reading >> i;', '// *UART_TX_ADDR = accel_reading >> i; // Commented out UART printing for simulation speed');
  circleC = circleC.replace('*UART_TX_ADDR = accel_reading_mag_byte >> 24;', '// *UART_TX_ADDR = accel_reading_mag_byte >> 24; // Commented out UART printing for simulation speed');

  console.log('Compiling Circle C with clang 20.1 -Os (matching Circle_delay_accel.asm line 1)...');
  const resClang = await compileGodbolt(circleC, 'rv32-cclang2010', '-Os');
  console.log('Clang 20.1 -Os exit code:', resClang.code, 'asm lines:', resClang.asm ? resClang.asm.length : 0);

  console.log('Compiling Circle C with GCC 14.2 -Os...');
  const resGcc = await compileGodbolt(circleC, 'rv32-cgcc1420', '-Os');
  console.log('GCC 14.2 -Os exit code:', resGcc.code, 'asm lines:', resGcc.asm ? resGcc.asm.length : 0);

  fs.writeFileSync(path.resolve(__dirname, '../Circle_delay_accel_modified.c'), circleC, 'utf8');
  fs.writeFileSync('/home/rajesh/.gemini/antigravity-ide/brain/95d297a7-ffb6-4ddb-b0b0-eaaba7b9f45e/scratch/circle_clang_os.json', JSON.stringify(resClang, null, 2));
}

testCircleCompilation().catch(console.error);
