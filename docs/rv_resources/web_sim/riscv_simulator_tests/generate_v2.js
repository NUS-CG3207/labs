const fs = require('fs');
const path = require('path');

const origPath = path.resolve(__dirname, '../riscv_simulator.html');
const v2Path = path.resolve(__dirname, '../riscv_simulatorv2.html');
const bundlePath = path.resolve(__dirname, 'cm6_bundle.min.js');

const origHtml = fs.readFileSync(origPath, 'utf8');
const cm6Bundle = fs.readFileSync(bundlePath, 'utf8');

// 1. Update Title and Subtitle
let v2Html = origHtml;

v2Html = v2Html.replace(
  '<title>NUS-CG3207 RISC-V Simulator</title>',
  '<title>NUS-CG3207 RISC-V Simulator v2</title>'
);

v2Html = v2Html.replace(
  '<span class="subtitle">RV32GC — Assembler + Simulator</span>',
  '<span class="subtitle">RV32GC — Assembler + Simulator (CodeMirror 6)</span>'
);

// 2. Replace editor HTML layout (removing textarea & highlight-layer, adding cmEditorContainer)
const oldEditorHtml = `<div class="editor-wrapper">
          <div class="line-numbers" id="lineNumbers">1</div>
          <div class="code-area">
            <!-- In-Editor Floating Find & Replace Widget -->
            <div class="find-replace-panel" id="findReplacePanel" style="display:none;">
              <div class="find-row">
                <input type="text" id="findInput" placeholder="Find in editor (Enter / Shift+Enter)..."
                  spellcheck="false" oninput="updateFindMatches()" onkeydown="handleFindKey(event)">
                <span class="find-count" id="findCount">0/0</span>
                <button class="find-btn" id="findPrevBtn" onclick="findPrev()"
                  title="Previous match (Shift+Enter)">▲</button>
                <button class="find-btn" id="findNextBtn" onclick="findNext()" title="Next match (Enter)">▼</button>
                <button class="find-toggle-btn" id="findCaseBtn" onclick="toggleFindCase()"
                  title="Match case (Alt+C)">Aa</button>
                <button class="find-btn find-close" id="findCloseBtn" onclick="closeFindReplace()"
                  title="Close (Esc)">&times;</button>
              </div>
              <div class="find-row" id="replaceRow">
                <input type="text" id="replaceInput" placeholder="Replace with..." spellcheck="false"
                  onkeydown="if(event.key==='Enter')replaceCurrent()">
                <button class="find-action-btn" id="findReplaceBtn" onclick="replaceCurrent()"
                  title="Replace current occurrence">Replace</button>
                <button class="find-action-btn" id="findReplaceAllBtn" onclick="replaceAll()"
                  title="Replace all occurrences">All</button>
              </div>
            </div>
            <!-- In-Editor Autocomplete & Guidance Popup -->
            <div class="autocomplete-popup" id="editorAutocomplete" style="display:none;">
              <div class="ac-list" id="acList"></div>
              <div class="ac-doc" id="acDoc"></div>
            </div>
            <div class="editor-container">
              <div class="highlight-layer" id="highlightLayer"></div>
              <textarea id="asmEditor" spellcheck="false"
                onscroll="syncScroll(); if(typeof positionAutocomplete==='function')positionAutocomplete();"
                oninput="updateEditor()" placeholder="Write RISC-V assembly here..."></textarea>
            </div>
          </div>
        </div>`;

const newEditorHtml = `<div class="editor-wrapper">
          <div class="code-area" id="editorArea">
            <!-- In-Editor Floating Find & Replace Widget -->
            <div class="find-replace-panel" id="findReplacePanel" style="display:none;z-index:20;">
              <div class="find-row">
                <input type="text" id="findInput" placeholder="Find in editor (Enter / Shift+Enter)..."
                  spellcheck="false" oninput="updateFindMatches()" onkeydown="handleFindKey(event)">
                <span class="find-count" id="findCount">0/0</span>
                <button class="find-btn" id="findPrevBtn" onclick="findPrev()"
                  title="Previous match (Shift+Enter)">▲</button>
                <button class="find-btn" id="findNextBtn" onclick="findNext()" title="Next match (Enter)">▼</button>
                <button class="find-toggle-btn" id="findCaseBtn" onclick="toggleFindCase()"
                  title="Match case (Alt+C)">Aa</button>
                <button class="find-btn find-close" id="findCloseBtn" onclick="closeFindReplace()"
                  title="Close (Esc)">&times;</button>
              </div>
              <div class="find-row" id="replaceRow">
                <input type="text" id="replaceInput" placeholder="Replace with..." spellcheck="false"
                  onkeydown="if(event.key==='Enter')replaceCurrent()">
                <button class="find-action-btn" id="findReplaceBtn" onclick="replaceCurrent()"
                  title="Replace current occurrence">Replace</button>
                <button class="find-action-btn" id="findReplaceAllBtn" onclick="replaceAll()"
                  title="Replace all occurrences">All</button>
              </div>
            </div>
            <!-- In-Editor Autocomplete & Guidance Popup (Optional Fallback / Tooltip) -->
            <div class="autocomplete-popup" id="editorAutocomplete" style="display:none;z-index:25;">
              <div class="ac-list" id="acList"></div>
              <div class="ac-doc" id="acDoc"></div>
            </div>
            <div id="cmEditorContainer" style="flex:1;height:100%;min-height:0;overflow:hidden;position:relative;"></div>
          </div>
        </div>`;

if (v2Html.includes(oldEditorHtml)) {
  v2Html = v2Html.replace(oldEditorHtml, newEditorHtml);
  console.log('Successfully replaced editor HTML markup.');
} else {
  console.error('Could not find exact oldEditorHtml snippet! Checking normalized...');
  // Try flexible replace
  const startMarker = '<div class="editor-wrapper">';
  const endMarker = '<div class="console" id="console"></div>';
  const startIdx = v2Html.indexOf(startMarker);
  const endIdx = v2Html.indexOf(endMarker, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    v2Html = v2Html.substring(0, startIdx) + newEditorHtml + '\n        ' + v2Html.substring(endIdx);
    console.log('Replaced editor HTML by slice.');
  }
}

// 3. Inject CM6 Bundle Script before the main simulator script
const scriptTagMarker = '<script>';
const scriptIdx = v2Html.indexOf(scriptTagMarker);
if (scriptIdx !== -1) {
  const cm6ScriptTag = `<script>\n/* CodeMirror 6 Bundle */\n${cm6Bundle}\n</script>\n  `;
  v2Html = v2Html.substring(0, scriptIdx) + cm6ScriptTag + v2Html.substring(scriptIdx);
  console.log('Injected CM6 bundle script tag.');
}

// 4. Construct CodeMirror 6 JS Integration
const cm6IntegrationCode = `
    // ============================================================
    // CODEMIRROR 6 RISC-V INTEGRATION & THEME
    // ============================================================

    const RISCV_INSTRUCTIONS_SET = new Set([
      'add','addi','sub','lui','auipc','and','andi','or','ori','xor','xori',
      'sll','slli','srl','srli','sra','srai','slt','slti','sltu','sltiu',
      'beq','bne','blt','bge','bltu','bgeu','jal','jalr','lb','lh','lw','lbu','lhu','sb','sh','sw',
      'fence','ecall','ebreak',
      'mul','mulh','mulhsu','mulhu','div','divu','rem','remu',
      'lr.w','sc.w','amoswap.w','amoadd.w','amoxor.w','amoand.w','amoor.w','amomin.w','amomax.w','amominu.w','amomaxu.w',
      'flw','fsw','fadd.s','fsub.s','fmul.s','fdiv.s','fsqrt.s','fsgnj.s','fsgnjn.s','fsgnjx.s',
      'fmin.s','fmax.s','fcvt.w.s','fcvt.wu.s','fmv.x.w','feq.s','flt.s','fle.s','fclass.s',
      'fcvt.s.w','fcvt.s.wu','fmv.w.x',
      'fld','fsd','fadd.d','fsub.d','fmul.d','fdiv.d','fsqrt.d','fsgnj.d','fsgnjn.d','fsgnjx.d',
      'fmin.d','fmax.d','fcvt.s.d','fcvt.d.s','feq.d','flt.d','fle.d','fclass.d','fcvt.w.d',
      'fcvt.wu.d','fcvt.d.w','fcvt.d.wu',
      'csrrw','csrrs','csrrc','csrrwi','csrrsi','csrrci','mret','sret','uret','wfi','sfence.vma',
      'li','la','lla','lga','mv','not','neg','negw','sext.w','nop','j','jr','ret','call','tail',
      'beqz','bnez','blez','bgez','bltz','bgtz','bgt','ble','bgtu','bleu','seqz','snez','sltz','sgtz',
      'fmv.s','fneg.s','fabs.s','fmv.d','fneg.d','fabs.d','pause'
    ]);

    const RISCV_REGISTERS_SET = new Set([
      'zero','ra','sp','gp','tp','t0','t1','t2','s0','fp','s1','a0','a1','a2','a3','a4','a5','a6','a7',
      's2','s3','s4','s5','s6','s7','s8','s9','s10','s11','t3','t4','t5','t6',
      'ft0','ft1','ft2','ft3','ft4','ft5','ft6','ft7','fs0','fs1','fa0','fa1','fa2','fa3','fa4','fa5',
      'fa6','fa7','fs2','fs3','fs4','fs5','fs6','fs7','fs8','fs9','fs10','fs11','ft8','ft9','ft10','ft11'
    ]);

    for (let i = 0; i < 32; i++) {
      RISCV_REGISTERS_SET.add('x' + i);
      RISCV_REGISTERS_SET.add('f' + i);
    }

    const RISCV_CSRS_SET = new Set([
      'mstatus','mie','mtvec','mepc','mcause','mtval','mip','misa','mvendorid','marchid','mimpid','mhartid',
      'mcycle','minstret','cycle','time','instret','fflags','frm','fcsr'
    ]);

    // RISC-V Custom Stream Parser for CodeMirror 6
    const riscvStreamParser = {
      token(stream, state) {
        if (stream.eatSpace()) return null;

        // Comments
        if (stream.match(/^[#;].*$/)) {
          return 'comment';
        }
        if (stream.match(/^\\/\\*.*?\\*\\//)) {
          return 'comment';
        }

        // Strings
        if (stream.match(/^"([^"\\\\]|\\\\.)*"/)) {
          return 'string';
        }
        if (stream.match(/^'([^'\\\\]|\\\\.)*'/)) {
          return 'string';
        }

        // Assembler Directives (.text, .data, .word, etc.)
        if (stream.match(/^\\.[a-zA-Z_]\\w*/)) {
          return 'meta';
        }

        // Relocation macros %hi(...), %lo(...), %pcrel_hi(...), etc.
        if (stream.match(/^%(?:hi|lo|pcrel_hi|pcrel_lo|tprel_hi|tprel_lo|tprel_add|gprel|got_pcrel_hi|call)\\b/)) {
          return 'operator';
        }

        // Numbers (Hex, Binary, Decimal)
        if (stream.match(/^0x[0-9a-fA-F]+/i) || stream.match(/^0b[01]+/i) || stream.match(/^-?\\b\\d+\\b/)) {
          return 'number';
        }

        // Labels (identifiers before :)
        if (stream.match(/^[a-zA-Z_.$][\\w.$]*(?=\\s*:)/)) {
          return 'labelName';
        }

        // Words: Instructions, Registers, CSRs, Identifiers
        const wordMatch = stream.match(/^[a-zA-Z_.$][\\w.$]*/);
        if (wordMatch) {
          const word = wordMatch[0].toLowerCase();
          if (RISCV_INSTRUCTIONS_SET.has(word)) {
            return 'keyword';
          }
          if (RISCV_REGISTERS_SET.has(word)) {
            return 'variableName';
          }
          if (RISCV_CSRS_SET.has(word)) {
            return 'propertyName';
          }
          return 'name';
        }

        // Punctuation
        if (stream.eat(/^[,():]/)) {
          return 'punctuation';
        }

        stream.next();
        return null;
      }
    };

    const riscvLanguage = CM6.StreamLanguage.define(riscvStreamParser);

    const riscvHighlightStyle = CM6.HighlightStyle.define([
      { tag: CM6.tags.keyword, color: '#89b4fa', fontWeight: '600' },          // RV Instructions (Blue)
      { tag: CM6.tags.variableName, color: '#a6e3a1' },                        // Registers (Green)
      { tag: CM6.tags.meta, color: '#f5c2e7', fontWeight: '600' },             // Directives (Pink)
      { tag: CM6.tags.labelName, color: '#fab387', fontWeight: 'bold' },       // Labels (Peach)
      { tag: CM6.tags.comment, color: '#6c7086', fontStyle: 'italic' },        // Comments (Gray)
      { tag: CM6.tags.number, color: '#f9e2af' },                               // Numbers/Immediates (Yellow)
      { tag: CM6.tags.string, color: '#a6e3a1' },                               // Strings (Green)
      { tag: CM6.tags.punctuation, color: '#cdd6f4' },                          // Punctuation (Lavender/White)
      { tag: CM6.tags.operator, color: '#89dceb', fontWeight: '600' },         // %hi, %lo macros (Cyan)
      { tag: CM6.tags.propertyName, color: '#cba6f7' }                         // CSRs (Mauve)
    ]);

    const riscvEditorTheme = CM6.EditorView.theme({
      "&": {
        color: "#cdd6f4",
        backgroundColor: "#181825",
        height: "100%",
        fontFamily: "'Consolas', 'Roboto Mono', 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
        fontSize: "13px"
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: "inherit",
        lineHeight: "20px"
      },
      ".cm-content": {
        caretColor: "#cba6f7",
        padding: "12px 8px 120px 8px",
        fontFamily: "inherit"
      },
      "&.cm-focused": {
        outline: "none"
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: "#cba6f7",
        borderLeftWidth: "2px"
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "rgba(203, 166, 247, 0.3) !important"
      },
      ".cm-gutters": {
        backgroundColor: "#181825",
        color: "#6c7086",
        borderRight: "1px solid #313244",
        paddingRight: "2px",
        userSelect: "none"
      },
      ".cm-lineNumbers": {
        minWidth: "36px",
        textAlign: "right"
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 6px 0 2px",
        cursor: "pointer"
      },
      ".cm-lineNumbers .cm-gutterElement:hover": {
        color: "#cdd6f4"
      },
      ".cm-activeLineGutter": {
        backgroundColor: "rgba(137, 180, 250, 0.12)",
        color: "#cdd6f4"
      },
      ".cm-activeLine": {
        backgroundColor: "rgba(137, 180, 250, 0.05)"
      },
      ".cm-execLine": {
        backgroundColor: "rgba(137, 180, 250, 0.18) !important",
        borderLeft: "3px solid #89b4fa"
      },
      ".cm-breakpoint-gutter": {
        width: "16px",
        paddingLeft: "2px",
        cursor: "pointer"
      },
      ".cm-breakpoint-dot": {
        color: "#f38ba8",
        fontSize: "14px",
        lineHeight: "20px",
        display: "inline-block",
        textAlign: "center",
        width: "14px",
        filter: "drop-shadow(0 0 4px rgba(243, 139, 168, 0.7))"
      },
      ".cm-lineNumbers .cm-gutterElement.cm-breakpoint-line-number": {
        color: "#f38ba8 !important",
        fontWeight: "bold !important",
        backgroundColor: "rgba(243, 139, 168, 0.25) !important",
        borderRadius: "4px",
        textShadow: "0 0 6px rgba(243, 139, 168, 0.6)"
      },
      ".cm-tooltip": {
        backgroundColor: "#181825 !important",
        border: "1px solid #45475a !important",
        borderRadius: "6px !important",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5) !important",
        color: "#cdd6f4 !important"
      },
      ".cm-tooltip-autocomplete": {
        backgroundColor: "#181825 !important",
        border: "1px solid #45475a !important",
        borderRadius: "6px !important",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5) !important",
        fontFamily: "inherit !important"
      },
      ".cm-tooltip-autocomplete > ul": {
        maxHeight: "260px !important",
        fontFamily: "inherit !important"
      },
      ".cm-tooltip-autocomplete > ul > li": {
        color: "#cdd6f4 !important",
        padding: "4px 8px !important"
      },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "rgba(137, 180, 250, 0.2) !important",
        color: "#cba6f7 !important"
      },
      ".cm-tooltip.cm-completionInfo": {
        backgroundColor: "#181825 !important",
        border: "1px solid #45475a !important",
        borderRadius: "6px !important",
        padding: "6px 10px !important",
        maxWidth: "420px !important",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5) !important"
      },
      ".cm-signature-tooltip": {
        backgroundColor: "#181825 !important",
        border: "1px solid #89b4fa !important",
        borderRadius: "6px !important",
        boxShadow: "0 6px 20px rgba(0,0,0,0.6) !important"
      }
    }, { dark: true });

    // Breakpoint & Execution Line Effects & Fields
    const setBreakpointsEffect = CM6.StateEffect.define();
    const setExecLineEffect = CM6.StateEffect.define();

    const breakpointGutterMarker = new class extends CM6.GutterMarker {
      toDOM() {
        const dot = document.createElement('span');
        dot.className = 'cm-breakpoint-dot';
        dot.innerHTML = '●';
        dot.title = 'Breakpoint';
        return dot;
      }
    };

    const breakpointLineNumberMarker = new class extends CM6.GutterMarker {
      get elementClass() {
        return 'cm-breakpoint-line-number';
      }
    };

    const breakpointStateField = CM6.StateField.define({
      create() {
        return {
          gutter: CM6.RangeSet.empty,
          lineNumbers: CM6.RangeSet.empty
        };
      },
      update(value, tr) {
        let gutter = value.gutter.map(tr.changes);
        let lineNumbers = value.lineNumbers.map(tr.changes);

        for (const e of tr.effects) {
          if (e.is(setBreakpointsEffect)) {
            const gutterBuilder = new CM6.RangeSetBuilder();
            const lnBuilder = new CM6.RangeSetBuilder();

            const sortedLines = [...e.value].sort((a,b) => a - b);
            for (const lineNo of sortedLines) {
              if (lineNo >= 1 && lineNo <= tr.state.doc.lines) {
                const line = tr.state.doc.line(lineNo);
                gutterBuilder.add(line.from, line.from, breakpointGutterMarker);
                lnBuilder.add(line.from, line.from, breakpointLineNumberMarker);
              }
            }
            gutter = gutterBuilder.finish();
            lineNumbers = lnBuilder.finish();
          }
        }
        return { gutter, lineNumbers };
      },
      provide: f => [
        CM6.lineNumberMarkers.from(f, v => v.lineNumbers)
      ]
    });

    const breakpointGutter = [
      breakpointStateField,
      CM6.gutter({
        class: 'cm-breakpoint-gutter',
        markers: v => v.state.field(breakpointStateField).gutter,
        initialSpacer: () => breakpointGutterMarker,
        domEventHandlers: {
          mousedown(view, line, event) {
            const lineNo = view.state.doc.lineAt(line.from).number;
            toggleBreakpoint(lineNo);
            return true;
          }
        }
      })
    ];

    const execLineField = CM6.StateField.define({
      create() { return CM6.Decoration.none; },
      update(execLines, tr) {
        execLines = execLines.map(tr.changes);
        for (const e of tr.effects) {
          if (e.is(setExecLineEffect)) {
            const lineNo = e.value;
            if (lineNo < 1 || lineNo > tr.state.doc.lines) {
              execLines = CM6.Decoration.none;
            } else {
              const line = tr.state.doc.line(lineNo);
              const dec = CM6.Decoration.line({
                attributes: { class: 'cm-execLine' }
              });
              execLines = CM6.Decoration.set([dec.range(line.from)]);
            }
          }
        }
        return execLines;
      },
      provide: f => CM6.EditorView.decorations.from(f)
    });

    let cmEditor = null;

    // Helper: format instruction signature with active operand parameter highlighted
    function formatActiveInstructionSignature(formatStr, operandIndex) {
      if (!formatStr) return '';
      const spaceIdx = formatStr.indexOf(' ');
      if (spaceIdx === -1) {
        return \`<span style="color:#89b4fa;font-weight:bold;">\${escapeHtml(formatStr)}</span>\`;
      }
      const mnem = formatStr.slice(0, spaceIdx);
      const operandPart = formatStr.slice(spaceIdx + 1);
      
      const operands = operandPart.split(',');
      const formattedOperands = operands.map((op, idx) => {
        const trimmed = op.trim();
        if (idx === operandIndex) {
          return \`<span style="color:#fab387;font-weight:bold;text-decoration:underline;background:rgba(250,179,135,0.2);padding:1px 4px;border-radius:3px;">\${escapeHtml(trimmed)}</span>\`;
        }
        return \`<span style="color:#cdd6f4;">\${escapeHtml(trimmed)}</span>\`;
      });
      
      return \`<span style="color:#89b4fa;font-weight:bold;">\${escapeHtml(mnem)}</span> \` + formattedOperands.join(', ');
    }

    // Live Signature Helper Tooltip (shows active instruction format while typing operands)
    function getSignatureTooltip(state) {
      const sel = state.selection.main;
      if (!sel.empty) return null;
      
      const line = state.doc.lineAt(sel.head);
      const textBefore = line.text.slice(0, sel.head - line.from);
      
      if (textBefore.includes('#') || textBefore.includes(';')) return null;
      
      const lineCtx = getAssemblyLineContext(textBefore);
      if (lineCtx.context !== 'OPERAND' || !lineCtx.activeMnemonic) return null;
      
      const activeInst = (typeof RISCV_AUTOCOMPLETE_DOCS !== 'undefined') ? RISCV_AUTOCOMPLETE_DOCS.find(
        d => (d.type === 'inst' || d.type === 'pseudo' || d.type === 'directive') && d.name.toLowerCase() === lineCtx.activeMnemonic
      ) : null;
      if (!activeInst) return null;
      
      return {
        pos: sel.head,
        above: true,
        arrow: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'cm-signature-tooltip';
          dom.style.cssText = 'padding:6px 10px;font-size:12px;background:#181825;color:#cdd6f4;border:1px solid #89b4fa;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.5);line-height:1.4;pointer-events:none;z-index:999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
          
          const sigHtml = formatActiveInstructionSignature(activeInst.format, lineCtx.operandIndex);
          dom.innerHTML = \`
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
              <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(137,180,250,0.2);color:#89b4fa;font-weight:bold;">PARAM \${lineCtx.operandIndex + 1}</span>
              <code style="font-family:monospace;font-size:12px;">\${sigHtml}</code>
            </div>
            <div style="font-size:11px;color:#a6adc8;">\${escapeHtml(activeInst.desc)}</div>
          \`;
          return { dom };
        }
      };
    }

    const signatureHelpField = CM6.StateField.define({
      create(state) {
        return getSignatureTooltip(state);
      },
      update(tooltip, tr) {
        if (tr.docChanged || tr.selection) {
          return getSignatureTooltip(tr.state);
        }
        return tooltip;
      },
      provide: f => CM6.showTooltip.computeN([f], state => {
        const val = state.field(f);
        return val ? [val] : [];
      })
    });

    // Hover Tooltip for Instructions, Registers, Directives, and Symbols
    const riscvHoverTooltip = CM6.hoverTooltip((view, pos, side) => {
      const line = view.state.doc.lineAt(pos);
      const lineText = line.text;
      const col = pos - line.from;
      
      const commentIdx = lineText.indexOf('#');
      if (commentIdx !== -1 && col >= commentIdx) return null;
      
      const match = lineText.slice(0, col).match(/([.\\w]+)$/);
      const wordStart = match ? col - match[1].length : col;
      const matchAfter = lineText.slice(col).match(/^([.\\w]+)/);
      const wordEnd = matchAfter ? col + matchAfter[1].length : col;
      
      if (wordStart === wordEnd) return null;
      const word = lineText.slice(wordStart, wordEnd);
      const wordLower = word.toLowerCase();
      
      const userSymbols = extractEditorSymbols(view.state.doc.toString());
      const allCandidates = [...userSymbols, ...(typeof RISCV_AUTOCOMPLETE_DOCS !== 'undefined' ? RISCV_AUTOCOMPLETE_DOCS : [])];
      const docItem = allCandidates.find(d => d.name.toLowerCase() === wordLower);
      if (!docItem) return null;
      
      return {
        pos: line.from + wordStart,
        end: line.from + wordEnd,
        above: true,
        create(view) {
          const dom = document.createElement('div');
          dom.className = 'cm-hover-tooltip';
          dom.style.cssText = 'padding:6px 10px;font-size:12px;max-width:360px;background:#1e1e2e;color:#cdd6f4;border:1px solid #45475a;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.4);line-height:1.45;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
          
          const badgeLabel = docItem.type === 'directive' ? 'dir' : docItem.type === 'register' ? 'reg' : docItem.type;
          
          dom.innerHTML = \`
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:10px;padding:1px 5px;border-radius:3px;font-weight:bold;text-transform:uppercase;background:#313244;color:#89b4fa;">\${badgeLabel}</span>
              <span style="font-weight:bold;color:#fab387;font-family:monospace;font-size:13px;">\${escapeHtml(docItem.format || docItem.name)}</span>
            </div>
            <div style="color:#cdd6f4;margin-bottom:3px;">\${escapeHtml(docItem.desc || '')}</div>
            \${docItem.meta ? \`<div style="font-size:11px;color:#a6adc8;border-top:1px solid #313244;padding-top:3px;margin-top:3px;">\${escapeHtml(docItem.meta)}</div>\` : ''}
          \`;
          return { dom };
        }
      };
    });

    // Autocomplete Source for CodeMirror 6 with Active Instruction Format Info
    function riscvAutocomplete(context) {
      const line = context.state.doc.lineAt(context.pos);
      const textBefore = line.text.slice(0, context.pos - line.from);

      if (textBefore.includes('#') || textBefore.includes(';')) return null;
      const quoteCount = (textBefore.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) return null;

      const word = context.matchBefore(/[.\\w]+/);
      const lineCtx = getAssemblyLineContext(textBefore);

      if (!word && !context.explicit) {
        return null;
      }

      const userSymbols = extractEditorSymbols(context.state.doc.toString());
      const allCandidates = [...userSymbols, ...(typeof RISCV_AUTOCOMPLETE_DOCS !== 'undefined' ? RISCV_AUTOCOMPLETE_DOCS : [])];

      const activeInstDoc = (lineCtx.context === 'OPERAND' && lineCtx.activeMnemonic && typeof RISCV_AUTOCOMPLETE_DOCS !== 'undefined') ? 
        RISCV_AUTOCOMPLETE_DOCS.find(d => (d.type === 'inst' || d.type === 'pseudo' || d.type === 'directive') && d.name.toLowerCase() === lineCtx.activeMnemonic) : null;

      const wordStr = word ? word.text.toLowerCase() : '';
      const options = [];
      const seen = new Set();

      for (const item of allCandidates) {
        const nameLower = item.name.toLowerCase();
        if (seen.has(nameLower)) continue;

        // Context filtering
        if (lineCtx.context === 'MNEMONIC') {
          if (item.type === 'register') continue;
        } else if (lineCtx.context === 'OPERAND') {
          if (item.type === 'inst' || item.type === 'pseudo' || item.type === 'directive') continue;
        }

        // Matching & scoring
        let boost = 0;
        if (wordStr) {
          if (nameLower.startsWith(wordStr)) {
            boost = nameLower === wordStr ? 100 : 50;
          } else if (wordStr.length >= 2 && nameLower.includes(wordStr)) {
            boost = 20;
          } else {
            continue;
          }
        }

        if (lineCtx.context === 'OPERAND') {
          const isJumpOrBranch = lineCtx.activeMnemonic && /^(j|jal|jalr|beq|bne|blt|bge|bltu|bgeu|beqz|bnez|blez|bgez|bltz|bgtz|bgt|ble|bgtu|bleu|call|tail|la)$/i.test(lineCtx.activeMnemonic);
          if (isJumpOrBranch && (item.type === 'label' || item.type === 'equ')) {
            boost += 40;
          } else if (item.type === 'register') {
            boost += 30;
          }
        }

        seen.add(nameLower);
        const badgeLabel = item.type === 'directive' ? 'dir' : item.type === 'register' ? 'reg' : item.type;

        options.push({
          label: item.name,
          type: item.type === 'directive' ? 'keyword' : item.type === 'register' ? 'variable' : item.type === 'label' ? 'constant' : 'function',
          detail: item.format || '',
          boost: boost,
          info: () => {
            const dom = document.createElement('div');
            dom.style.cssText = 'max-width:380px;font-size:12px;line-height:1.45;padding:6px 8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#cdd6f4;background:#181825;border-radius:4px;';
            
            let activeInstBanner = '';
            if (activeInstDoc) {
              const sigHtml = formatActiveInstructionSignature(activeInstDoc.format, lineCtx.operandIndex);
              activeInstBanner = \`
                <div style="background:rgba(137,180,250,0.12);border:1px solid rgba(137,180,250,0.3);border-radius:4px;padding:6px 8px;margin-bottom:8px;">
                  <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#89b4fa;font-weight:700;margin-bottom:2px;">
                    Active Instruction Format
                  </div>
                  <div style="font-family:monospace;font-size:12px;margin-bottom:2px;">\${sigHtml}</div>
                  <div style="color:#cdd6f4;font-size:11px;">\${escapeHtml(activeInstDoc.desc)}</div>
                  \${activeInstDoc.meta ? \`<div style="font-size:10px;color:#a6adc8;margin-top:2px;">\${escapeHtml(activeInstDoc.meta)}</div>\` : ''}
                </div>
              \`;
            }

            dom.innerHTML = \`
              \${activeInstBanner}
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                <span style="font-size:10px;padding:1px 5px;border-radius:3px;font-weight:bold;text-transform:uppercase;background:#313244;color:#89b4fa;">\${badgeLabel}</span>
                <span style="font-weight:bold;color:#cba6f7;font-family:monospace;font-size:13px;">\${escapeHtml(item.format || item.name)}</span>
              </div>
              <div style="color:#cdd6f4;margin-bottom:3px;">\${escapeHtml(item.desc || '')}</div>
              \${item.meta ? \`<div style="font-size:11px;color:#a6adc8;border-top:1px solid rgba(255,255,255,0.08);padding-top:3px;margin-top:3px;">\${escapeHtml(item.meta)}</div>\` : ''}
            \`;
            return dom;
          }
        });
      }

      return {
        from: word ? word.from : context.pos,
        options: options,
        validFor: /^[.\\w]*$/
      };
    }
`;

// Now let's replace the Editor setup and EditorHistory in UI section
// Find Section 6. UI FUNCTIONS
const uiSectionMarker = '// 6. UI FUNCTIONS\n    // ============================================================';

// We want to replace from `const editor = document.getElementById('asmEditor');` up to `// ============================================================ \n // PERIPHERALS`
const oldEditorUiStart = `const editor = document.getElementById('asmEditor');`;
const oldEditorUiEnd = `// ============================================================\n    // PERIPHERALS`;

const startUiIdx = v2Html.indexOf(oldEditorUiStart);
const endUiIdx = v2Html.indexOf(oldEditorUiEnd, startUiIdx);

if (startUiIdx !== -1 && endUiIdx !== -1) {
  const newUiCode = `
    const consoleEl = document.getElementById('console');
    const regBody = document.getElementById('regBody');
    const memView = document.getElementById('memView');
    const disassemblyDisplay = document.getElementById('disassemblyDisplay');
    const statusBar = document.getElementById('statusBar');

    // Track loaded/active filename for default save name suggestions
    let currentFileName = 'basic.asm';
    let lastAssembledCode = null;
    let heapPointer = 0x24000;

    const EXAMPLE_FILENAMES = {
      basic: 'basic.asm',
      rars_syscalls: 'rars_syscalls.asm',
      fib: 'fibonacci.asm',
      fact: 'factorial.asm',
      loop: 'loop_array.asm',
      io: 'io_mext.asm',
      dip_led: 'DIP_to_LED.asm',
      hello_world: 'HelloWorld.asm',
      hello_jal: 'HelloWorld_jal_jalr.asm',
      circle_accel: 'Circle_delay_accel.asm'
    };

    // In-Editor Find & Replace state globals
    let findCaseSensitive = false;
    let findMatches = [];
    let activeFindIndex = -1;

    ${cm6IntegrationCode}

    // CodeMirror 6 Compatibility Proxy
    const editor = {
      get value() {
        return cmEditor ? cmEditor.state.doc.toString() : '';
      },
      set value(newVal) {
        if (!cmEditor) return;
        const currentVal = cmEditor.state.doc.toString();
        if (currentVal !== newVal) {
          cmEditor.dispatch({
            changes: { from: 0, to: currentVal.length, insert: newVal }
          });
        }
      },
      get selectionStart() {
        return cmEditor ? cmEditor.state.selection.main.from : 0;
      },
      set selectionStart(pos) {
        if (!cmEditor) return;
        const to = cmEditor.state.selection.main.to;
        const maxPos = cmEditor.state.doc.length;
        const clampedPos = Math.max(0, Math.min(pos, maxPos));
        cmEditor.dispatch({
          selection: CM6.EditorSelection.single(clampedPos, Math.max(clampedPos, to))
        });
      },
      get selectionEnd() {
        return cmEditor ? cmEditor.state.selection.main.to : 0;
      },
      set selectionEnd(pos) {
        if (!cmEditor) return;
        const from = cmEditor.state.selection.main.from;
        const maxPos = cmEditor.state.doc.length;
        const clampedPos = Math.max(0, Math.min(pos, maxPos));
        cmEditor.dispatch({
          selection: CM6.EditorSelection.single(Math.min(from, clampedPos), clampedPos)
        });
      },
      get scrollTop() {
        return cmEditor ? cmEditor.scrollDOM.scrollTop : 0;
      },
      set scrollTop(v) {
        if (cmEditor) cmEditor.scrollDOM.scrollTop = v;
      },
      get scrollLeft() {
        return cmEditor ? cmEditor.scrollDOM.scrollLeft : 0;
      },
      set scrollLeft(v) {
        if (cmEditor) cmEditor.scrollDOM.scrollLeft = v;
      },
      focus() {
        if (cmEditor) cmEditor.focus();
      },
      setSelectionRange(start, end) {
        if (!cmEditor) return;
        const maxPos = cmEditor.state.doc.length;
        const s = Math.max(0, Math.min(start, maxPos));
        const e = Math.max(0, Math.min(end, maxPos));
        cmEditor.dispatch({
          selection: CM6.EditorSelection.single(s, e),
          effects: CM6.EditorView.scrollIntoView(s, { y: 'center' })
        });
      },
      dispatchEvent(event) {
        updateEditor();
      },
      addEventListener(event, handler) {},
      removeEventListener(event, handler) {}
    };

    // Editor History using CodeMirror 6 History
    const editorHistory = {
      get history() {
        const u = cmEditor ? CM6.undoDepth(cmEditor.state) : 0;
        const r = cmEditor ? CM6.redoDepth(cmEditor.state) : 0;
        return new Array(u + r + 1);
      },
      get currentIndex() {
        return cmEditor ? CM6.undoDepth(cmEditor.state) : 0;
      },
      undo() {
        if (cmEditor && CM6.undo(cmEditor)) {
          if (typeof updateToolbarButtonStates === 'function') updateToolbarButtonStates();
          return true;
        }
        return false;
      },
      redo() {
        if (cmEditor && CM6.redo(cmEditor)) {
          if (typeof updateToolbarButtonStates === 'function') updateToolbarButtonStates();
          return true;
        }
        return false;
      },
      initialState() {
        if (typeof updateToolbarButtonStates === 'function') updateToolbarButtonStates();
      },
      pushState() {
        if (typeof updateToolbarButtonStates === 'function') updateToolbarButtonStates();
      }
    };

    window.editor = editor;
    window.editorHistory = editorHistory;

    function log(msg, type = 'info') {
      const div = document.createElement('div');
      div.className = type;
      div.textContent = msg;
      consoleEl.appendChild(div);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function clearLog() {
      consoleEl.innerHTML = '';
    }

    function setStatus(msg, type = '') {
      statusBar.textContent = msg;
      statusBar.style.color = type === 'error' ? '#f38ba8' : type === 'success' ? '#a6e3a1' : '#a6adc8';
    }

    function syncScroll() {}

    function resetExecutionForSourceChange() {
      if (lastAssembledCode !== null && editor.value === lastAssembledCode) {
        return;
      }
      initializeState();
      execHistory = [];
      stepWriteLog = [];
      assembled = false;
      running = false;
      machineCode = [];
      currentExecLine = -1;
      lastExecutedRd = -1;
      updateRegisters();
      updateMemoryView();
      updateMachineCode();
      updateDisassembly();
      updateStats();
      hideExecMarker();
      if (typeof updateToolbarButtonStates === 'function') updateToolbarButtonStates();
    }

    function initSplitter() {
      const splitter = document.getElementById('mainSplitter');
      const rightPanel = document.querySelector('.right-panel');
      if (!splitter || !rightPanel) return;
      let dragging = false;
      const clamp = (w) => Math.max(220, Math.min(w, (window.innerWidth || 1200) - 320));

      splitter.addEventListener('pointerdown', (e) => {
        dragging = true;
        splitter.setPointerCapture(e.pointerId);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
      splitter.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const mainRect = splitter.parentElement.getBoundingClientRect();
        const width = mainRect.right - e.clientX;
        rightPanel.style.width = clamp(width) + 'px';
      });
      const stop = () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      splitter.addEventListener('pointerup', stop);
      splitter.addEventListener('pointercancel', stop);
    }

    function updateLineNumbers() {
      if (!cmEditor) return;
      cmEditor.dispatch({
        effects: setBreakpointsEffect.of(new Set(breakpoints))
      });
    }

    function highlightSyntax() {}

    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function updateEditor() {
      resetExecutionForSourceChange();
      const code = editor.value;
      if (code.trim()) {
        try {
          const mc = assemble(code, baseAddress);
          machineCode = mc;
          updateMachineCode();
          updateDisassembly();
        } catch (e) { }
      }
    }

    ${v2Html.substring(v2Html.indexOf('const RISCV_AUTOCOMPLETE_DOCS = ['), v2Html.indexOf('function updateRegisters() {'))}
`;

  v2Html = v2Html.substring(0, startUiIdx) + newUiCode + v2Html.substring(v2Html.indexOf('function updateRegisters() {'));
  console.log('Replaced Section 6 UI implementation with CodeMirror 6 setup.');
}

// 5. Replace highlightCurrentLine and toggleBreakpoint
const oldHlCurrentLine = `function highlightCurrentLine() {
      const hl = document.getElementById('highlightLayer');
      if (!hl) return;
      let marker = document.getElementById('execMarker');
      if (!marker) {
        marker = document.createElement('div');
        marker.id = 'execMarker';
        marker.className = 'exec-marker';
        hl.appendChild(marker);
      }
      if (currentExecLine < 1) { marker.style.display = 'none'; return; }
      marker.style.display = 'block';

      // Measure exact DOM line element position for 100% pixel-perfection across all devices and zoom levels
      const ln = document.getElementById('lineNumbers');
      if (ln && ln.children && ln.children[currentExecLine - 1]) {
        const lineEl = ln.children[currentExecLine - 1];
        marker.style.top = lineEl.offsetTop + 'px';
        marker.style.height = (lineEl.offsetHeight || 20) + 'px';
      } else {
        marker.style.top = (12 + (currentExecLine - 1) * 20) + 'px';
        marker.style.height = '20px';
      }
    }`;

const newHlCurrentLine = `function highlightCurrentLine() {
      if (!cmEditor) return;
      cmEditor.dispatch({
        effects: setExecLineEffect.of(currentExecLine)
      });
      if (currentExecLine >= 1 && currentExecLine <= cmEditor.state.doc.lines) {
        const line = cmEditor.state.doc.line(currentExecLine);
        cmEditor.dispatch({
          effects: CM6.EditorView.scrollIntoView(line.from, { y: 'center' })
        });
      }
    }`;

v2Html = v2Html.replace(oldHlCurrentLine, newHlCurrentLine);

const oldHideMarker = `function hideExecMarker() {
      const m = document.getElementById('execMarker');
      if (m) m.style.display = 'none';
    }`;

const newHideMarker = `function hideExecMarker() {
      currentExecLine = -1;
      if (cmEditor) {
        cmEditor.dispatch({
          effects: setExecLineEffect.of(-1)
        });
      }
    }`;

v2Html = v2Html.replace(oldHideMarker, newHideMarker);

// 6. Replace toggleBreakpoint
const oldToggleBp = `function toggleBreakpoint(line) {
      // Validate line number - must be positive
      if (!line || line < 1) {
        log('Invalid breakpoint line number.', 'warn');
        return;
      }

      // Get total number of lines in editor
      const totalLines = editor.value.split('\\n').length;

      // Validate against actual code lines (skip empty lines at end)
      let lastCodeLine = totalLines;
      for (let i = totalLines; i >= 1; i--) {
        const lineContent = editor.value.split('\\n')[i - 1];
        if (lineContent && lineContent.trim()) {
          lastCodeLine = i;
          break;
        }
      }

      if (line > lastCodeLine) {
        log(\`Invalid breakpoint: line \${line} is beyond code (max: \${lastCodeLine}).\`, 'warn');
        return;
      }

      if (breakpoints.has(line)) {
        breakpoints.delete(line);
        log(\`Breakpoint removed at line \${line}.\`, 'info');
      } else {
        breakpoints.add(line);
        log(\`Breakpoint set at line \${line}.\`, 'info');
      }
      updateLineNumbers();
      highlightCurrentLine();
    }`;

const newToggleBp = `function findNextValidInstructionLine(targetLine) {
      const totalLines = cmEditor ? cmEditor.state.doc.lines : (editor ? editor.value.split('\\n').length : 1);
      if (targetLine < 1) targetLine = 1;
      if (targetLine > totalLines) targetLine = totalLines;

      // 1. If currently assembled and code is up to date, use machineCode source mapping
      if (assembled && Array.isArray(machineCode) && machineCode.length > 0 && lastAssembledCode === (editor ? editor.value : null)) {
        const validLines = [];
        for (const item of machineCode) {
          if (!item.error && item.line && !validLines.includes(item.line)) {
            validLines.push(item.line);
          }
        }
        validLines.sort((a, b) => a - b);
        if (validLines.length > 0) {
          if (validLines.includes(targetLine)) return targetLine;
          const next = validLines.find(l => l >= targetLine);
          if (next !== undefined) return next;
          return validLines[validLines.length - 1];
        }
      }

      // 2. Parse source lines to find next executable instruction
      function checkLineIsInstruction(lineNo) {
        let text = '';
        if (cmEditor) {
          if (lineNo < 1 || lineNo > cmEditor.state.doc.lines) return false;
          text = cmEditor.state.doc.line(lineNo).text;
        } else {
          const allLines = editor ? editor.value.split('\\n') : [];
          if (lineNo < 1 || lineNo > allLines.length) return false;
          text = allLines[lineNo - 1];
        }

        let code = text.split('#')[0].split(';')[0].trim();
        if (!code) return false;

        const labelMatch = code.match(/^([a-zA-Z_.$][\\w.$]*\\s*:\\s*)(.*)$/);
        if (labelMatch) {
          code = labelMatch[2].trim();
          if (!code) return false;
        }

        if (code.includes('=')) return false;
        if (code.startsWith('.')) return false;

        const m = code.match(/^([a-zA-Z_.$][\\w.$]*)/);
        if (!m) return false;
        const mnem = m[1].toLowerCase();

        if (typeof INSTRUCTIONS !== 'undefined' && INSTRUCTIONS[mnem]) return true;
        if (typeof PSEUDO_INSTRUCTIONS !== 'undefined' && PSEUDO_INSTRUCTIONS[mnem]) return true;
        if (typeof RISCV_INSTRUCTIONS_SET !== 'undefined' && RISCV_INSTRUCTIONS_SET.has(mnem)) return true;

        return false;
      }

      if (checkLineIsInstruction(targetLine)) {
        return targetLine;
      }

      for (let i = targetLine + 1; i <= totalLines; i++) {
        if (checkLineIsInstruction(i)) {
          return i;
        }
      }

      for (let i = targetLine - 1; i >= 1; i--) {
        if (checkLineIsInstruction(i)) {
          return i;
        }
      }

      return targetLine;
    }

    function toggleBreakpoint(requestedLine) {
      if (!requestedLine || requestedLine < 1) {
        log('Invalid breakpoint line number.', 'warn');
        return;
      }

      const effectiveLine = findNextValidInstructionLine(requestedLine);
      const isMoved = (effectiveLine !== requestedLine);

      if (breakpoints.has(effectiveLine)) {
        breakpoints.delete(effectiveLine);
        log(\`Breakpoint removed at line \${effectiveLine}.\`, 'info');
      } else {
        breakpoints.add(effectiveLine);
        if (isMoved) {
          log(\`Breakpoint set at line \${effectiveLine} (moved from line \${requestedLine} to next valid instruction).\`, 'info');
        } else {
          log(\`Breakpoint set at line \${effectiveLine}.\`, 'info');
        }
      }
      updateLineNumbers();
      highlightCurrentLine();
    }`;

v2Html = v2Html.replace(oldToggleBp, newToggleBp);

// Replace scrollToCursor
const oldScrollToCursor = `function scrollToCursor(ed) {
      const lineNo = ed.value.substring(0, ed.selectionStart).split('\\n').length;
      const ln = document.getElementById('lineNumbers');
      if (ln && ln.children && ln.children[lineNo - 1]) {
        const top = ln.children[lineNo - 1].offsetTop;
        ed.scrollTop = Math.max(0, top - 80);
        syncScroll();
      }
    }`;

const newScrollToCursor = `function scrollToCursor(ed) {
      if (cmEditor) {
        const pos = cmEditor.state.selection.main.head;
        cmEditor.dispatch({
          effects: CM6.EditorView.scrollIntoView(pos, { y: 'center' })
        });
      }
    }`;

v2Html = v2Html.replace(oldScrollToCursor, newScrollToCursor);

// 7. Replace initialization at the bottom of the script
const oldInitEnd = `updateToolbarButtonStates();

    window.loadExample = loadExample;`;

const newInitEnd = `function initCodeMirrorEditor() {
      const container = document.getElementById('cmEditorContainer');
      if (!container) return;

      const initialText = (typeof examples !== 'undefined' && examples && examples.basic) ? examples.basic : \`# Basic RISC-V — compute sum = a + b + c
.text
main:
\tli\tx1, 10\t# a = 10
\tli\tx2, 20\t# b = 20
\tli\tx3, 30\t# c = 30
\tadd\tx4, x1, x2
\tadd\tx5, x4, x3\t# x5 = sum
\tla\tx28, result
\tsw\tx5, 0(x28)\t# result = sum
\tli\ta7, 1\t# print_int (prints to status log)
\tmv\ta0, x5
\tecall
\tli\ta7, 10\t# exit
\tecall
.data
result: .word 0
\`;

      const startState = CM6.EditorState.create({
        doc: initialText,
        extensions: [
          CM6.lineNumbers({
            domEventHandlers: {
              mousedown(view, line, event) {
                const lineNo = view.state.doc.lineAt(line.from).number;
                toggleBreakpoint(lineNo);
                return true;
              }
            }
          }),
          breakpointGutter,
          execLineField,
          signatureHelpField,
          riscvHoverTooltip,
          CM6.highlightActiveLineGutter(),
          CM6.highlightActiveLine(),
          CM6.history(),
          CM6.drawSelection(),
          CM6.dropCursor(),
          CM6.bracketMatching(),
          riscvLanguage,
          CM6.syntaxHighlighting(riscvHighlightStyle),
          riscvEditorTheme,
          CM6.autocompletion({
            override: [riscvAutocomplete],
            defaultKeymap: true,
            activateOnTyping: true,
            maxRenderedOptions: 40
          }),
          CM6.keymap.of([
            ...CM6.historyKeymap,
            ...CM6.defaultKeymap,
            ...CM6.completionKeymap,
            {
              key: "Tab",
              run: (view) => {
                if (CM6.acceptCompletion && CM6.acceptCompletion(view)) return true;
                const { state, dispatch } = view;
                if (state.selection.ranges.every(r => r.empty)) {
                  dispatch(state.changeByRange(range => ({
                    changes: { from: range.from, insert: '\t' },
                    range: CM6.EditorSelection.cursor(range.from + 1)
                  })));
                  return true;
                }
                return CM6.indentMore(view);
              },
              shift: CM6.indentLess
            },
            {
              key: "Ctrl-Space",
              run: CM6.startCompletion
            },
            {
              key: "Mod-f",
              run: () => { openFindReplace(false); return true; }
            },
            {
              key: "Mod-h",
              run: () => { openFindReplace(true); return true; }
            },
            {
              key: "Escape",
              run: () => {
                const panel = document.getElementById('findReplacePanel');
                if (panel && panel.style.display !== 'none') {
                  closeFindReplace();
                  return true;
                }
                return false;
              }
            },
            {
              key: "F5",
              run: () => { toggleRunPause(); return true; }
            },
            {
              key: "F8",
              run: () => { stepOnce(); return true; }
            },
            {
              key: "Shift-F8",
              run: () => { stepBack(); return true; }
            },
            {
              key: "F9",
              run: (view) => {
                const lineNo = view.state.doc.lineAt(view.state.selection.main.head).number;
                toggleBreakpoint(lineNo);
                return true;
              }
            },
            {
              key: "Mod-Enter",
              run: () => { assembleOnly(); return true; }
            },
            {
              key: "Mod-s",
              run: () => { saveFile(); return true; }
            }
          ]),
          CM6.EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              updateEditor();
            }
          })
        ]
      });

      cmEditor = new CM6.EditorView({
        state: startState,
        parent: container
      });
      window.cmEditor = cmEditor;

      updateEditor();
    }

    window.initCodeMirrorEditor = initCodeMirrorEditor;

    // Initialize CodeMirror 6 upon DOM load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initCodeMirrorEditor();
        updateToolbarButtonStates();
      });
    } else {
      initCodeMirrorEditor();
      updateToolbarButtonStates();
    }

    window.stepOnce = stepOnce;
    window.stepBack = stepBack;
    window.resetAll = resetAll;
    window.toggleBreakpoint = toggleBreakpoint;
    window.findNextValidInstructionLine = findNextValidInstructionLine;
    window.formatActiveInstructionSignature = formatActiveInstructionSignature;
    window.riscvAutocomplete = riscvAutocomplete;
    window.getRegs = () => regs;
    window.getPc = () => pc;
    window.getMachineCode = () => machineCode;
    window.getBreakpoints = () => breakpoints;
    window.getCurrentExecLine = () => currentExecLine;
    try {
      Object.defineProperty(window, 'regs', { get: () => regs, configurable: true });
      Object.defineProperty(window, 'pc', { get: () => pc, configurable: true });
      Object.defineProperty(window, 'machineCode', { get: () => machineCode, configurable: true });
      Object.defineProperty(window, 'breakpoints', { get: () => breakpoints, configurable: true });
      Object.defineProperty(window, 'currentExecLine', { get: () => currentExecLine, configurable: true });
    } catch (e) {}

    window.loadExample = loadExample;`;

v2Html = v2Html.replace(oldInitEnd, newInitEnd);

// Write to riscv_simulatorv2.html
fs.writeFileSync(v2Path, v2Html, 'utf8');
console.log('Wrote riscv_simulatorv2.html successfully. Size:', v2Html.length);
