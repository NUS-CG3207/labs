// Serves examples/asm/*.asm and examples/c/*.c from local disk, so the
// page's own fetch() calls in loadExample() work under jsdom - which has no
// fetch of its own (confirmed: window.fetch is undefined there by default).
//
// This is the runtime counterpart of the offline godbolt_cache: without it,
// every example but `basic` fails to load under test, the same way it fails
// when the page is opened via file:// instead of http://.
//
// Install before any loadExample() call:
//   const { installExamplesFetch } = require('./examples_fetch');
//   installExamplesFetch(win);
//
// Safe to install alongside installGodboltCache()/a Godbolt fetch: only
// `examples/...` requests are intercepted here, anything else falls through
// to whatever fetch (if any) was already on the window, or fails closed.

const fs = require('fs');
const path = require('path');

const EXAMPLES_ROOT = path.resolve(__dirname, '..', 'examples');

function installExamplesFetch(win) {
  const existing = typeof win.fetch === 'function' ? win.fetch : null;
  win.fetch = async (url, opts) => {
    const m = String(url).match(/(?:^|\/)examples\/(asm|c)\/([^/?#]+)$/);
    if (m) {
      const filePath = path.join(EXAMPLES_ROOT, m[1], m[2]);
      try {
        const text = fs.readFileSync(filePath, 'utf8');
        return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) };
      } catch (e) {
        return { ok: false, status: 404, text: async () => '', json: async () => { throw e; } };
      }
    }
    if (existing) return existing(url, opts);
    throw new Error('examples_fetch: no handler for ' + url);
  };
  return win;
}

module.exports = { installExamplesFetch, EXAMPLES_ROOT };
