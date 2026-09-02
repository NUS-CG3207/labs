const fs = require('fs');
const path = require('path');
const https = require('https');

async function compileGodbolt(sourceCode, compilerId = 'rv32-cgcc1420', optLevel = '-Os') {
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

async function testImageDisplay() {
  let imgC = fs.readFileSync(path.resolve(__dirname, '../ImageDisplay_autoadvance_accel.c'), 'utf8');
  imgC = imgC.replace('0xFFFFF0000', '0xFFFF0000');
  imgC = imgC.replace('delay(1000000);', '// Original hardware delay: 1,000,000 cycles (~10ms at 100MHz)\n        // delay(1000000);\n        // Reduced delay value for high-speed real-time simulation:\n        delay(50);');

  console.log('Compiling ImageDisplay with GCC 14.2 -Os...');
  const res = await compileGodbolt(imgC, 'rv32-cgcc1420', '-Os');
  console.log('ImageDisplay compiled exit code:', res.code, 'asm lines:', res.asm ? res.asm.length : 0);

  // Print first 40 asm instructions
  if (res.asm) {
    console.log('First 40 asm instructions:');
    res.asm.slice(0, 40).forEach(a => console.log('  ', a.text));
  }
}

testImageDisplay().catch(console.error);
