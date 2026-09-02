const fs = require('fs');
const path = require('path');

// Let's create a minimal simulator harness with sparse memory
function createSim() {
  const memPages = new Map();
  function getMemByte(addr) {
    const u = addr >>> 0;
    if (u >= 0xFFFF0000 && u < 0xFFFF0100) return mmioRead(u, 1);
    const p = memPages.get(u >>> 16);
    return p ? p[u & 0xFFFF] : 0;
  }
  function setMemByte(addr, val) {
    const u = addr >>> 0;
    if (u >= 0xFFFF0000 && u < 0xFFFF0100) return mmioWrite(u, val & 0xFF, 1);
    let p = memPages.get(u >>> 16);
    if (!p) {
      p = new Uint8Array(65536);
      memPages.set(u >>> 16, p);
    }
    p[u & 0xFFFF] = val & 0xFF;
  }
  function readMem(addr, size) {
    const u = addr >>> 0;
    if (u >= 0xFFFF0000 && u < 0xFFFF0100) return mmioRead(u, size);
    let val = 0;
    for (let i = 0; i < size; i++) {
      val |= (getMemByte(u + i) << (i * 8));
    }
    return val >>> 0;
  }
  function writeMem(addr, val, size) {
    const u = addr >>> 0;
    if (u >= 0xFFFF0000 && u < 0xFFFF0100) return mmioWrite(u, val, size);
    for (let i = 0; i < size; i++) {
      setMemByte(u + i, (val >> (i * 8)) & 0xFF);
    }
  }

  let oledCol = 0, oledRow = 0, oledData = 0, oledCtrl = 0;
  const oledBuffer = new Uint8Array(96 * 64 * 4);
  let pixelWrites = [];

  function writePixel(val) {
    const colorMode = (oledCtrl >> 4) & 0x0F;
    let r = 0, g = 0, b = 0;
    if (colorMode === 0x0) {
      const r3 = (val >> 5) & 0x07;
      const g3 = (val >> 2) & 0x07;
      const b2 = val & 0x03;
      r = (r3 * 255 / 7) | 0;
      g = (g3 * 255 / 7) | 0;
      b = (b2 * 255 / 3) | 0;
    } else {
      r = (val >>> 16) & 0xFF;
      g = (val >>> 8) & 0xFF;
      b = val & 0xFF;
    }
    const c = (oledCol < 0) ? 0 : (oledCol > 95 ? 95 : oledCol);
    const rIdx = (oledRow < 0) ? 0 : (oledRow > 63 ? 63 : oledRow);
    const idx = (rIdx * 96 + c) * 4;
    oledBuffer[idx] = r;
    oledBuffer[idx + 1] = g;
    oledBuffer[idx + 2] = b;
    oledBuffer[idx + 3] = 255;
    pixelWrites.push({ col: oledCol, row: oledRow, val, r, g, b });
  }

  function mmioRead(addr, size) {
    if (addr >= 0xFFFF0040 && addr < 0xFFFF0044) {
      // ACCEL_DATA: temp=25 (0x19), x=+1g (0x40), y=0, z=0 -> 0x19400000 or 0x19000040
      return 0x19400000;
    }
    if (addr >= 0xFFFF00A0 && addr < 0xFFFF00A4) {
      return 100000;
    }
    return 0;
  }

  function mmioWrite(addr, val, size) {
    if (addr === 0xFFFF0020) oledCol = (val & 0xFF) % 96;
    if (addr === 0xFFFF0024) oledRow = (val & 0xFF) % 64;
    if (addr === 0xFFFF002C) oledCtrl = val & 0xFF;
    if (addr === 0xFFFF0028) {
      oledData = val >>> 0;
      const mode = oledCtrl & 0x0F;
      if (mode === 0x0 || mode === 0x4 || mode === 0x5) {
        writePixel(oledData);
        if (mode === 0x4) {
          oledCol++;
          if (oledCol >= 96) {
            oledCol = 0;
            oledRow = (oledRow + 1) % 64;
          }
        } else if (mode === 0x5) {
          oledRow++;
          if (oledRow >= 64) {
            oledRow = 0;
            oledCol = (oledCol + 1) % 96;
          }
        }
      }
    }
  }

  return { readMem, writeMem, getMemByte, setMemByte, pixelWrites, getOledBuffer: () => oledBuffer };
}

console.log('Simulator harness ready.');
