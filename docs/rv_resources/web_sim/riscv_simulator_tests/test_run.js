const fs = require('fs');
global.NodeFilter = { SHOW_TEXT: 4 };
global.Event = class Event { constructor(t){ this.type = t; } };
function makeEl(tag = 'div') {
  let _innerHTML = '';
  let _textContent = '';
  const classes = new Set();
  const el = {
    tagName: tag.toUpperCase(),
    value: '', style: {},
    get className() { return Array.from(classes).join(' '); },
    set className(v) { classes.clear(); (v || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
    get textContent() { return _textContent || (_innerHTML ? _innerHTML.replace(/<[^>]+>/g, '') : ''); },
    set textContent(v) { _textContent = (v === null || v === undefined) ? '' : String(v); _innerHTML = _textContent; },
    get innerText() { return (_innerHTML ? _innerHTML.replace(/<[^>]+>/g, '') : _textContent); },
    set innerText(v) { _textContent = (v === null || v === undefined) ? '' : String(v); _innerHTML = _textContent; },
    get innerHTML() { return _innerHTML; },
    set innerHTML(v) { _innerHTML = (v === null || v === undefined) ? '' : String(v); _textContent = _innerHTML.replace(/<[^>]+>/g, ''); if (v === '') this.childNodes = []; },
    classList: {
      add(c){ classes.add(c); },
      remove(c){ classes.delete(c); },
      toggle(c, force){
        if (force === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          else { classes.add(c); return true; }
        } else if (force) {
          classes.add(c); return true;
        } else {
          classes.delete(c); return false;
        }
      },
      contains(c){ return classes.has(c); }
    },
    addEventListener(){}, dispatchEvent(){ return true; }, appendChild(c){ if(c) el.childNodes.push(c); return c; },
    insertBefore(n, ref){ const idx = el.childNodes.indexOf(ref); if(idx>=0) el.childNodes.splice(idx,0,n); else el.childNodes.push(n); return n; },
    removeChild(c){ const idx = el.childNodes.indexOf(c); if(idx>=0) el.childNodes.splice(idx,1); return c; },
    append(){}, focus(){}, blur(){}, select(){},
    setSelectionRange(s, e){ this.selectionStart=s; this.selectionEnd=e; },
    setAttribute(){}, getAttribute(){ return null; }, closest(){ return null; },
    querySelector(){ return null; }, querySelectorAll(){ return []; }, scrollIntoView(){},
    scrollTop: 0, scrollLeft: 0, scrollHeight: 0, checked: false, files: [],
    childNodes: [],
    parentNode: null,
    nextSibling: null,
    getContext() {
      return {
        createImageData: () => ({ data: new Uint8ClampedArray(96*64*4) }),
        putImageData: () => {},
        drawImage: () => {},
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(96*64*4) })
      };
    }
  };
  return el;
}
function makeTextNode(text) {
  return { nodeValue: text, textContent: text, parentNode: null, nextSibling: null };
}
const elements = {};
global.document = {
  getElementById(id){ if(!elements[id]) elements[id]=makeEl(); return elements[id]; },
  querySelectorAll(){ return []; },
  querySelector(){ return null; },
  createElement(tag){ return makeEl(tag); },
  createElementNS(ns, tag){ return makeEl(tag); },
  createTextNode(text){ return makeTextNode(text); },
  createTreeWalker(root, filter){
    let idx = 0;
    const nodes = [];
    function scan(node) {
      if (node && node.nodeValue !== undefined) nodes.push(node);
      if (node && node.childNodes) node.childNodes.forEach(scan);
    }
    scan(root);
    return {
      nextNode(){ return nodes[idx++] || null; }
    };
  },
  addEventListener(){},
};
global.window = global;
global.navigator = { userAgent: 'node' };
global.FileReader = class { constructor(){ this.onload=null; this.onerror=null; } readAsText(){} };

const html = fs.readFileSync('riscv_simulator.html', 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tests = fs.readFileSync('tests_body.js', 'utf8');
eval(js + '\n' + tests);

