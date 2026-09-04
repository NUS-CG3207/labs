// Godbolt output for the built-in C examples, captured once so the suites do
// not need the network.
//
// This used to live inside riscv_simulator.html as `cPrecompiled` — 379 KB of
// JSON, a third of the whole file — and later moved here keyed by example
// name against `window.cExamples`. Both are gone now: every example but
// `basic` was taken out of the page entirely and lives in examples/asm/ and
// examples/c/, fetched at runtime (see examples_fetch.js for the matching
// test-side fetch shim). So this cache is now keyed by filename, not example
// name, and matches by reading those same files off disk rather than asking
// the page for its own copy of the text — the page does not keep one any
// more.
//
// Install it before compiling C in a jsdom window:
//
//   const { installGodboltCache } = require('./godbolt_cache');
//   installGodboltCache(win);
//
// It hooks `window.__mockGodboltResponse`, which the page consults when the
// live API is unreachable, and matches on the exact source text against
// examples/c/*.c — so an edited program misses, exactly as the embedded
// cache did.
//
// To refresh an entry after changing a C example, POST examples/c/<file>.c to
//   https://godbolt.org/api/compiler/rv32-cclang2010/compile
// and store the response JSON under that filename in godbolt_cache.json.

const fs = require('fs');
const path = require('path');

const C_EXAMPLES_DIR = path.resolve(__dirname, '..', 'examples', 'c');
const CACHE = require('./godbolt_cache.json');

function installGodboltCache(win) {
  win.__mockGodboltResponse = (source) => {
    const wanted = String(source == null ? '' : source).trim();
    let files;
    try { files = fs.readdirSync(C_EXAMPLES_DIR).filter(f => f.endsWith('.c')); }
    catch (e) { return null; }
    for (const file of files) {
      const content = fs.readFileSync(path.join(C_EXAMPLES_DIR, file), 'utf8').trim();
      if (content === wanted) return CACHE[file] || null;
    }
    return null;
  };
  return win;
}

module.exports = { CACHE, installGodboltCache };
