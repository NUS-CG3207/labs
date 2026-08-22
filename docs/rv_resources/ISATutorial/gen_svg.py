#!/usr/bin/env python3
"""Generate vector (SVG) versions of the figures in Chapter 3A: RISC-V ISA.

Every value drawn here is transcribed from the source slides -- nothing invented.
"""
import os
from xml.sax.saxutils import escape

OUT = "/mnt/user-data/outputs/riscv-isa-docs/docs/assets"
os.makedirs(OUT, exist_ok=True)

SANS = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
MONO = "'SFMono-Regular', 'DejaVu Sans Mono', Menlo, Consolas, monospace"

INK = "#1c1c1c"
MUTED = "#5b6570"
LINE = "#43505c"
FILL_A = "#ffffff"
FILL_B = "#eef2f6"
FILL_HL = "#fff3bf"
FILL_ACCENT = "#dbe9f7"
BG = "#ffffff"
BORDER = "#d3dae1"


def header(w, h, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" role="img" aria-label="{escape(title)}">\n'
        f'<title>{escape(title)}</title>\n'
        f'<rect x="0" y="0" width="{w}" height="{h}" rx="6" fill="{BG}" stroke="{BORDER}"/>\n'
    )


def txt(x, y, s, size=11, anchor="middle", family=SANS, fill=INK, weight="normal",
        style="normal"):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" '
            f'fill="{fill}" text-anchor="{anchor}" font-weight="{weight}" '
            f'font-style="{style}">{escape(s)}</text>\n')


def fit(text, width, maxsize=11, minsize=5.0, ratio=0.60):
    """Shrink font so `text` fits inside `width` px."""
    if not text:
        return maxsize
    size = (width - 6.0) / (ratio * len(text))
    return max(minsize, min(maxsize, size))


def write(name, body):
    path = os.path.join(OUT, name)
    with open(path, "w") as f:
        f.write(body + "</svg>\n")
    print("wrote", path)


# --------------------------------------------------------------------------
# 1. Instruction-format / encoding diagrams  (fields given as (hi, lo, top, bottom))
# --------------------------------------------------------------------------
def format_diagram(name, title, rows, ruler_row=0, cell=26.0, namecol=62.0,
                   rowh=30.0, subrow=True, gaps=None):
    """rows: list of dicts {name, fields:[(hi,lo,top,bottom)], label(optional left label)}"""
    gaps = gaps or {}
    left = 46.0
    grid_w = 32 * cell
    w = left + grid_w + namecol + 14
    top_pad = 26.0
    heights = []
    for r in rows:
        has_sub = any(f[3] for f in r["fields"])
        heights.append(rowh + (rowh * 0.72 if has_sub else 0))
    h = top_pad + sum(heights) + sum(gaps.get(i, 0) for i in range(len(rows))) + 14

    s = header(w, h, title)

    def xof(bit):          # left edge of bit `bit`
        return left + (31 - bit) * cell

    y = top_pad
    for idx, r in enumerate(rows):
        y += gaps.get(idx, 0)
        has_sub = any(f[3] for f in r["fields"])
        top_h = rowh
        sub_h = rowh * 0.72 if has_sub else 0

        # bit ruler above the designated row
        if idx == ruler_row or r.get("ruler"):
            for (hi, lo, _t, _b) in r["fields"]:
                x0, x1 = xof(hi), xof(lo) + cell
                if hi == lo:
                    s += txt((x0 + x1) / 2, y - 6, str(hi), 9.5, "middle", SANS, MUTED)
                else:
                    s += txt(x0 + 2, y - 6, str(hi), 9.5, "start", SANS, MUTED)
                    s += txt(x1 - 2, y - 6, str(lo), 9.5, "end", SANS, MUTED)

        if r.get("left"):
            s += txt(left - 8, y + top_h / 2 + 4, r["left"], 12, "end", SANS, INK, "bold")

        for (hi, lo, tlabel, blabel) in r["fields"]:
            x0, x1 = xof(hi), xof(lo) + cell
            fw = x1 - x0
            s += (f'<rect x="{x0:.1f}" y="{y:.1f}" width="{fw:.1f}" height="{top_h:.1f}" '
                  f'fill="{FILL_A}" stroke="{LINE}" stroke-width="1"/>\n')
            s += txt(x0 + fw / 2, y + top_h / 2 + 4, tlabel,
                     fit(tlabel, fw, 11.5), "middle", SANS, INK)
            if has_sub:
                s += (f'<rect x="{x0:.1f}" y="{y + top_h:.1f}" width="{fw:.1f}" '
                      f'height="{sub_h:.1f}" fill="{FILL_B}" stroke="{LINE}" '
                      f'stroke-width="1"/>\n')
                if blabel:
                    s += txt(x0 + fw / 2, y + top_h + sub_h / 2 + 3.5, blabel,
                             fit(blabel, fw, 10), "middle", MONO, INK)

        if r.get("name"):
            s += txt(left + grid_w + 8, y + top_h / 2 + 4, r["name"], 12, "start",
                     SANS, INK, "bold")
        y += top_h + sub_h

    write(name, s)


F = lambda hi, lo, t, b=None: (hi, lo, t, b)

# --- Slide 12: the six base instruction formats -----------------------------
format_diagram(
    "instruction-formats.svg",
    "RISC-V base instruction formats: R, I, S, B, U and J type",
    [
        {"name": "R-type", "fields": [F(31, 25, "funct7"), F(24, 20, "rs2"),
                                      F(19, 15, "rs1"), F(14, 12, "funct3"),
                                      F(11, 7, "rd"), F(6, 0, "opcode")]},
        {"name": "I-type", "fields": [F(31, 20, "imm[11:0]"), F(19, 15, "rs1"),
                                      F(14, 12, "funct3"), F(11, 7, "rd"),
                                      F(6, 0, "opcode")]},
        {"name": "S-type", "fields": [F(31, 25, "imm[11:5]"), F(24, 20, "rs2"),
                                      F(19, 15, "rs1"), F(14, 12, "funct3"),
                                      F(11, 7, "imm[4:0]"), F(6, 0, "opcode")]},
        {"name": "B-type", "fields": [F(31, 25, "imm[12|10:5]"), F(24, 20, "rs2"),
                                      F(19, 15, "rs1"), F(14, 12, "funct3"),
                                      F(11, 7, "imm[4:1|11]"), F(6, 0, "opcode")]},
        {"name": "U-type", "fields": [F(31, 12, "imm[31:12]"), F(11, 7, "rd"),
                                      F(6, 0, "opcode")]},
        {"name": "J-type", "fields": [F(31, 12, "imm[20|10:1|11|19:12]"),
                                      F(11, 7, "rd"), F(6, 0, "opcode")]},
    ],
)

# --- Slide 15: add x18, x0, x9  (mv s2, s1) ---------------------------------
format_diagram(
    "enc-add.svg",
    "Encoding of add x18, x0, x9 as an R-type instruction",
    [{"name": "R-type",
      "fields": [F(31, 25, "funct7", "0000 000"), F(24, 20, "rs2", "0 1001 (9)"),
                 F(19, 15, "rs1", "0000 0 (0)"), F(14, 12, "funct3", "000"),
                 F(11, 7, "rd", "1001 0 (18)"), F(6, 0, "opcode", "011 0011")]}],
)

# --- Slide 17: auipc x9, 2  and  addi x9, x9, 0x3f4 -------------------------
format_diagram(
    "enc-auipc-addi.svg",
    "Encoding of auipc x9, 2 and addi x9, x9, 0x3f4",
    [
        {"name": "U-type", "left": "auipc", "ruler": True,
         "fields": [F(31, 12, "imm[31:12]", "0000 0000 0000 0000 0010  (0x00002)"),
                    F(11, 7, "rd", "0100 1 (9)"), F(6, 0, "opcode", "001 0111")]},
        {"name": "I-type", "left": "addi", "ruler": True,
         "fields": [F(31, 20, "imm[11:0]", "0011 1111 0100  (0x3f4)"),
                    F(19, 15, "rs1", "0100 1 (9)"), F(14, 12, "funct3", "000"),
                    F(11, 7, "rd", "0100 1 (9)"), F(6, 0, "opcode", "001 0011")]},
    ],
    ruler_row=-1, gaps={1: 30},
)

# --- Slide 21: sw x9, 0xffc(x18)  and  lb x20, 0xffc(x18) -------------------
format_diagram(
    "enc-sw-lb.svg",
    "Encoding of sw x9, 0xffc(x18) and lb x20, 0xffc(x18)",
    [
        {"name": "S-type", "left": "sw", "ruler": True,
         "fields": [F(31, 25, "imm[11:5]", "1111 111"), F(24, 20, "rs2", "0 1001 (9)"),
                    F(19, 15, "rs1", "1001 0 (18)"), F(14, 12, "funct3", "010"),
                    F(11, 7, "imm[4:0]", "1110 0"), F(6, 0, "opcode", "010 0011")]},
        {"name": "I-type", "left": "lb", "ruler": True,
         "fields": [F(31, 20, "imm[11:0]", "1111 1111 1100  (0xffc)"),
                    F(19, 15, "rs1", "1001 0 (18)"), F(14, 12, "funct3", "000"),
                    F(11, 7, "rd", "1010 0 (20)"), F(6, 0, "opcode", "000 0011")]},
    ],
    ruler_row=-1, gaps={1: 30},
)

# --- Slide 24: bne x20, x0, 0xfffffff8  and  jal x1, 0xfffffff0 -------------
format_diagram(
    "enc-bne-jal.svg",
    "Encoding of bne x20, x0, -8 and jal x1, -16",
    [
        {"name": "B-type", "left": "bne", "ruler": True,
         "fields": [F(31, 25, "imm[12|10:5]", "1|111 111"),
                    F(24, 20, "rs2", "0 0000 (0)"), F(19, 15, "rs1", "1010 0 (20)"),
                    F(14, 12, "funct3", "001"), F(11, 7, "imm[4:1|11]", "1100|1"),
                    F(6, 0, "opcode", "110 0011")]},
        {"name": "J-type", "left": "jal", "ruler": True,
         "fields": [F(31, 12, "imm[20|10:1|11|19:12]",
                      "1|111 1111 000|1|1111 1111"),
                    F(11, 7, "rd", "0 0001 (1)"), F(6, 0, "opcode", "110 1111")]},
    ],
    ruler_row=-1, gaps={1: 30},
)

# --- Slides 31 / 32: S vs B format comparison -------------------------------
format_diagram(
    "sb-format-option2.svg",
    "S-type and B-type immediate fields as chosen by the RISC-V designers",
    [
        {"name": "S-type", "fields": [F(31, 25, "imm[11:5]"), F(24, 20, "rs2"),
                                      F(19, 15, "rs1"), F(14, 12, "funct3"),
                                      F(11, 7, "imm[4:0]"), F(6, 0, "opcode")]},
        {"name": "B-type", "fields": [F(31, 25, "imm[12|10:5]"), F(24, 20, "rs2"),
                                      F(19, 15, "rs1"), F(14, 12, "funct3"),
                                      F(11, 7, "imm[4:1|11]"), F(6, 0, "opcode")]},
    ],
)

format_diagram(
    "sb-format-option3.svg",
    "Hypothetical option 3: a more regular S-type and B-type immediate layout",
    [
        {"name": "S-type", "fields": [F(31, 25, "imm[11:5]"), F(24, 20, "rs2"),
                                      F(19, 15, "rs1"), F(14, 12, "funct3"),
                                      F(11, 7, "imm[4:0]"), F(6, 0, "opcode")]},
        {"name": "B-type", "fields": [F(31, 25, "imm[12:6]"), F(24, 20, "rs2"),
                                      F(19, 15, "rs1"), F(14, 12, "funct3"),
                                      F(11, 7, "imm[5:1]"), F(6, 0, "opcode")]},
    ],
)


# --------------------------------------------------------------------------
# 2. ExtImm bit-source grids
# --------------------------------------------------------------------------
def bit_grid(name, title, rows, highlight=(), bold_zero_rows=(), cell=24.0,
             labelw=58.0, rowh=22.0, legend=None, side_labels=("ExtImm bits",
                                                              "Instr bits")):
    """rows: list of (label, [32 strings]) drawn MSB(31) first."""
    left = labelw
    w = left + 32 * cell + 14
    header_h = 24.0
    h = 30 + header_h + rowh * len(rows) + (26 if legend else 12)
    s = header(w, h, title)

    y0 = 26.0
    # column highlight bands
    for col in highlight:
        x = left + (31 - col) * cell
        s += (f'<rect x="{x:.1f}" y="{y0:.1f}" width="{cell:.1f}" '
              f'height="{header_h + rowh * len(rows):.1f}" fill="{FILL_HL}"/>\n')

    # header row: ExtImm bit index
    s += txt(left - 6, y0 + header_h / 2 + 4, "ExtImm", 9.5, "end", SANS, MUTED)
    for i in range(32):
        bit = 31 - i
        x = left + i * cell
        s += (f'<rect x="{x:.1f}" y="{y0:.1f}" width="{cell:.1f}" height="{header_h:.1f}" '
              f'fill="none" stroke="{LINE}" stroke-width="0.8"/>\n')
        s += txt(x + cell / 2, y0 + header_h / 2 + 4, str(bit), 9.5, "middle",
                 SANS, MUTED, "bold")
    s += (f'<rect x="{left:.1f}" y="{y0:.1f}" width="{32 * cell:.1f}" '
          f'height="{header_h:.1f}" fill="none" stroke="{LINE}" stroke-width="1.4"/>\n')

    y = y0 + header_h
    for ridx, (label, cells) in enumerate(rows):
        s += txt(left - 6, y + rowh / 2 + 4, label, 11.5, "end", SANS, INK, "bold")
        for i, v in enumerate(cells):
            x = left + i * cell
            zero_inserted = (label in bold_zero_rows) and v == "0"
            fill = "none"
            s += (f'<rect x="{x:.1f}" y="{y:.1f}" width="{cell:.1f}" height="{rowh:.1f}" '
                  f'fill="{fill}" stroke="{LINE}" stroke-width="0.8"/>\n')
            s += txt(x + cell / 2, y + rowh / 2 + 3.5, v, 9.5, "middle", MONO,
                     "#b02a37" if zero_inserted else INK,
                     "bold" if zero_inserted else "normal")
        s += (f'<rect x="{left:.1f}" y="{y:.1f}" width="{32 * cell:.1f}" '
              f'height="{rowh:.1f}" fill="none" stroke="{LINE}" stroke-width="1.4"/>\n')
        y += rowh

    if legend:
        s += txt(left, y + 16, legend, 10, "start", SANS, MUTED)
    write(name, s)


SIGN = "31"


def row(*groups):
    out = []
    for g in groups:
        if isinstance(g, tuple):
            out.extend([str(g[0])] * g[1])
        else:
            out.append(str(g))
    assert len(out) == 32, len(out)
    return out


U_ROW = row(*[str(b) for b in range(31, 11, -1)], ("0", 12))
J_ROW = row((SIGN, 12), *[str(b) for b in range(19, 11, -1)], "20",
            *[str(b) for b in range(30, 20, -1)], "0")
I_ROW = row((SIGN, 20), *[str(b) for b in range(31, 19, -1)])
S_ROW = row((SIGN, 21), *[str(b) for b in range(30, 24, -1)],
            "11", "10", "9", "8", "7")
B_ROW = row((SIGN, 20), "7", *[str(b) for b in range(30, 24, -1)],
            "11", "10", "9", "8", "0")
MUX_ROW = row("0", ("1", 19), "3", ("1", 6), ("2", 5))

# Slide 13
bit_grid(
    "immediate-extension.svg",
    "Source instruction bit for every bit of the extended immediate, per format",
    [("U", U_ROW), ("J", J_ROW), ("I", I_ROW), ("S", S_ROW), ("B", B_ROW),
     ("#muxes", MUX_ROW)],
    bold_zero_rows=("U", "J", "B"),
    legend="Each cell gives the Instr bit that drives that ExtImm bit. "
           "Entries in bold red are 0s inserted by the Extend unit (part of the left "
           "shift), not taken from Instr.",
)

# Slide 31 (option 2 = actual RISC-V) -- bits 11 and 0 are the only muxed ones
bit_grid(
    "sb-immediate-option2.svg",
    "ExtImm bit sources for S and B under the actual RISC-V encoding",
    [("S", S_ROW), ("B", B_ROW)],
    highlight=(11, 0), bold_zero_rows=("B",),
    legend="Only the highlighted bits 11 and 0 differ between S and B: two 1-bit "
           "2-to-1 muxes (the one for bit 0 is just an AND gate).",
)

# Slide 32 (option 3)
B_ROW_OPT3 = row((SIGN, 20), *[str(b) for b in range(30, 24, -1)],
                 "11", "10", "9", "8", "7", "0")
bit_grid(
    "sb-immediate-option3.svg",
    "ExtImm bit sources for S and B under the hypothetical regular option 3",
    [("S", S_ROW), ("B", B_ROW_OPT3)],
    highlight=tuple(range(0, 12)), bold_zero_rows=("B",),
    legend="Bits 11 down to 0 all differ between S and B: twelve 1-bit 2-to-1 muxes.",
)


# --------------------------------------------------------------------------
# 3. Register file block diagram (slides 8-10)
# --------------------------------------------------------------------------
def register_file():
    w, h = 470, 260
    s = header(w, h, "Register file with three 5-bit address ports, one 32-bit write "
                     "data port, a write enable and two 32-bit read data ports")
    bx, by, bw, bh = 170, 60, 150, 160
    s += (f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="4" '
          f'fill="{FILL_ACCENT}" stroke="{LINE}" stroke-width="1.6"/>\n')
    s += (f'<text x="{bx + bw / 2}" y="{by + bh / 2}" font-family="{SANS}" '
          f'font-size="15" font-weight="bold" fill="{INK}" text-anchor="middle">'
          f'<tspan x="{bx + bw / 2}" dy="-6">Register</tspan>'
          f'<tspan x="{bx + bw / 2}" dy="18">File</tspan></text>\n')

    def port(x1, y, x2, label, width, side="left"):
        nonlocal s
        s += (f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{LINE}" '
              f'stroke-width="1.4"/>\n')
        # slash + bit-width annotation
        mx = (x1 + x2) / 2
        s += (f'<line x1="{mx - 5}" y1="{y + 6}" x2="{mx + 5}" y2="{y - 6}" '
              f'stroke="{LINE}" stroke-width="1.2"/>\n')
        s += txt(mx + 2, y - 9, str(width), 9.5, "middle", SANS, MUTED)
        if side == "left":
            s += txt(x2 + 6, y + 4, label, 12, "start", SANS, INK)
        else:
            s += txt(x1 - 6, y + 4, label, 12, "end", SANS, INK)

    port(70, 90, bx, "rs1", 5)
    port(70, 125, bx, "rs2", 5)
    port(70, 165, bx, "rd", 5)
    port(70, 195, bx, "WD", 32)
    port(bx + bw, 100, 400, "RD1", 32, "right")
    port(bx + bw, 165, 400, "RD2", 32, "right")

    # WE input on top
    s += (f'<line x1="{bx + 100}" y1="30" x2="{bx + 100}" y2="{by}" stroke="{LINE}" '
          f'stroke-width="1.4"/>\n')
    s += (f'<line x1="{bx + 95}" y1="48" x2="{bx + 105}" y2="38" stroke="{LINE}" '
          f'stroke-width="1.2"/>\n')
    s += txt(bx + 110, 42, "1", 9.5, "start", SANS, MUTED)
    s += txt(bx + 100, 24, "WE", 12, "middle", SANS, INK)

    # CLK triangle input
    s += (f'<line x1="{bx + 40}" y1="30" x2="{bx + 40}" y2="{by}" stroke="{LINE}" '
          f'stroke-width="1.4"/>\n')
    s += (f'<polygon points="{bx + 33},{by} {bx + 47},{by} {bx + 40},{by + 12}" '
          f'fill="none" stroke="{LINE}" stroke-width="1.4"/>\n')
    s += txt(bx + 40, 24, "CLK", 12, "middle", SANS, INK)

    s += txt(w / 2, h - 14, "32 x 32-bit integer registers  \u2014  x0 is hardwired to 0",
             11, "middle", SANS, MUTED)
    write("register-file.svg", s)


register_file()


# --------------------------------------------------------------------------
# 4. Abstraction layers (slide 2)
# --------------------------------------------------------------------------
def abstraction_layers():
    layers = ["Application Software", "Operating Systems", "Architecture",
              "Microarchitecture", "Logic", "Digital Circuits", "Analog Circuits",
              "Devices", "Physics"]
    bw, bh, gap = 230, 30, 4
    w = 300
    h = 34 + len(layers) * (bh + gap) + 26
    s = header(w, h, "Levels of abstraction in a computing system, from application "
                     "software down to physics")
    y = 26
    for name in layers:
        emph = name == "Architecture"
        s += (f'<rect x="{(w - bw) / 2}" y="{y}" width="{bw}" height="{bh}" rx="3" '
              f'fill="{FILL_ACCENT if emph else FILL_A}" stroke="{LINE}" '
              f'stroke-width="{1.6 if emph else 1}"/>\n')
        s += txt(w / 2, y + bh / 2 + 4.5, name, 12.5, "middle", SANS, INK,
                 "bold" if emph else "normal")
        y += bh + gap
    s += txt(w / 2, y + 16, "after Harris and Harris", 10, "middle", SANS, MUTED,
             style="italic")
    write("abstraction-layers.svg", s)


abstraction_layers()
print("done")
