#!/usr/bin/env python3
"""Draw BranchPred.svg: the pipeline's fetch side with branch prediction, in
the style of Microarch_pipelined.svg (data black, control blue, its mux,
adder, register and memory shapes), as the simulator implements it.

Against the course's original figure:
  - the target comes from the next-PC adder, PCNextE = (PCE or RD1FwdE) +
    ExtImmE when E jumps, else PCE + 4, so jalr is covered, and PCNextE is
    also the PC to recover to: no separate correction mux, no PCPlus4 or
    predicted target carried through D and E;
  - the BHT has a second read/write port at PCE instead of carrying PrPCSrc
    and PrBTA through the pipeline registers; the entry cannot change under
    a live instruction, since it is written only when that instruction
    mispredicts, which flushes everything younger;
  - each PrPCSrc is one bit, or a 2-bit counter whose top bit predicts.

  python3 tools/bp_figure.py        writes BranchPred.svg
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('BP_OUT') or os.path.join(ROOT, 'BranchPred.svg')
W, H = 2960, 1990

K = '#000000'       # data
B = '#0070C0'       # control
DATA, CTRL, BLOCK = 6.875, 3.4375, 8.02083
FONT = 'Arial,Arial_MSFontService,sans-serif'
out = []


def line(pts, colour=K, w=None):
    w = w or (CTRL if colour == B else DATA)
    out.append('<path d="M%s" stroke="%s" stroke-width="%g" stroke-miterlimit="8" fill="none"/>' % (
        ' '.join('%g %g' % p for p in pts), colour, w))


def shape(pts, colour=K, w=DATA, fill='none'):
    out.append('<path d="M%sZ" stroke="%s" stroke-width="%g" stroke-miterlimit="8" fill="%s"/>' % (
        ' '.join('%g %g' % p for p in pts), colour, w, fill))


def rect(x0, y0, x1, y1, colour=K, fill='none'):
    out.append('<rect x="%g" y="%g" width="%g" height="%g" stroke="%s" stroke-width="%g" stroke-miterlimit="8" fill="%s"/>' % (
        x0, y0, x1 - x0, y1 - y0, colour, BLOCK, fill))


def rounded(x0, y0, x1, y1, colour=B, r=20):
    out.append('<rect x="%g" y="%g" width="%g" height="%g" rx="%g" stroke="%s" stroke-width="%g" fill="none"/>' % (
        x0, y0, x1 - x0, y1 - y0, r, colour, BLOCK))


def text(s, x, y, size=37, colour=K, bold=False, anchor='start', rot=False):
    tr = ' transform="rotate(-90 %g %g)"' % (x, y) if rot else ''
    out.append('<text x="%g" y="%g" font-family="%s" font-size="%g" font-weight="%s" fill="%s" text-anchor="%s"%s>%s</text>' % (
        x, y, FONT, size, 700 if bold else 400, colour, anchor, tr, s))


def mux(x0, y0, h, labels, size=37):
    """A mux, 65 wide, inputs on the left; labels [(text, input y)]."""
    s = h * 0.273
    shape([(x0, y0), (x0 + 65, y0 + s), (x0 + 65, y0 + h - s), (x0, y0 + h)])
    for t, y in labels:
        text(t, x0 + 9, y + 14, size)
    return x0 + 65, y0 + h / 2            # the output


def adder(x0, y0, h):
    """The drawing's adder: 81 wide, notched in the middle of its left side."""
    s = h * 0.16
    m = y0 + h / 2
    shape([(x0, y0), (x0 + 81, y0 + s), (x0 + 81, y0 + h - s), (x0, y0 + h)], w=BLOCK)
    shape([(x0, m - 22), (x0 + 30, m), (x0, m + 22)], w=BLOCK)
    shape([(x0 - 12, m - 22), (x0 + 18, m), (x0 - 12, m + 22)], '#FFFFFF', BLOCK, '#FFFFFF')
    text('+', x0 + 38, m + 12, 46, bold=True)
    return x0 + 81, m


def clock(x, y, label=True):
    """A clock input on a top edge at x."""
    line([(x, y - 41), (x, y)], K, CTRL)
    shape([(x + 18.5, y + 1), (x, y + 25), (x - 18.5, y + 1)], K, CTRL, '#FFFFFF')
    if label:
        text('CLK', x - 32, y - 48, 37)


def bubble(x, y):
    out.append('<circle cx="%g" cy="%g" r="8.5" stroke="%s" stroke-width="%g" fill="none"/>' % (x, y, K, DATA))


def reg(x0, y0, x1, y1, name):
    rect(x0, y0, x1, y1, K, '#FFFFFF')
    clock((x0 + x1) / 2, y0)
    text(name, (x0 + x1) / 2, y0 + 70, 41, anchor='middle')


def xor(x, y):     # inputs at y -/+ 18 on the left; output at x + 74
    out.append('<path d="M%g %g Q%g %g %g %g Q%g %g %g %g Q%g %g %g %gZ" stroke="%s" stroke-width="%g" fill="none"/>' % (
        x, y - 40, x + 50, y - 40, x + 74, y, x + 50, y + 40, x, y + 40, x + 17, y, x, y - 40, K, DATA))
    out.append('<path d="M%g %g Q%g %g %g %g" stroke="%s" stroke-width="%g" fill="none"/>' % (
        x - 12, y - 40, x + 5, y, x - 12, y + 40, K, DATA))


def gate_or(x, y):
    out.append('<path d="M%g %g Q%g %g %g %g Q%g %g %g %g Q%g %g %g %gZ" stroke="%s" stroke-width="%g" fill="none"/>' % (
        x, y - 40, x + 50, y - 40, x + 74, y, x + 50, y + 40, x, y + 40, x + 17, y, x, y - 40, K, DATA))


def gate_and(x, y):
    out.append('<path d="M%g %g L%g %g A40 40 0 0 1 %g %g L%g %gZ" stroke="%s" stroke-width="%g" fill="none"/>' % (
        x, y - 40, x + 34, y - 40, x + 34, y + 40, x, y + 40, K, DATA))


def comparator(x, y):  # inputs at y -/+ 18; output at x + 70
    shape([(x, y - 44), (x + 70, y), (x, y + 44)], K, DATA)
    text('≠', x + 10, y + 13, 38, bold=True)


# ---------------------------------------------------------------- the figure
Y_NEXT, Y_MISS = 110, 175      # rails along the top

# PC mux: PCNextE (1) to recover, PredPCF (0) otherwise.
mx, my = mux(60, 420, 210, [('1', 470), ('0', 580)])
line([(mx, my), (230, my)])
text("PC'", 138, my - 12, 32)
rect(230, 425, 310, 623)
clock(270, 425)
text('PC', 285, 560, 46, bold=True, rot=True)
bubble(270, 632)
line([(270, 641), (270, 720)], B)
text('StallF', 258, 715, 32, B, anchor='end')

# PCF: instruction memory, D register, and the BHT's first read port.
line([(310, 525), (820, 525)])
text('PCF', 322, 510)
rect(820, 410, 1054, 748)
text('A', 836, 540, 46)
text('RD', 980, 612, 46)
text('Instr', 912, 690, 46, bold=True, rot=True)
text('Memory', 967, 720, 46, bold=True, rot=True)
line([(1054, 600), (1180, 600)])
text('InstrF', 1066, 586, 34)
line([(770, 525), (770, 830), (1180, 830)])
text('PCF', 790, 818)

# Pipeline registers D and E.
RY0, RY1 = 380, 880
reg(1180, RY0, 1234, RY1, 'D')
reg(1560, RY0, 1614, RY1, 'E')
text('EN', 1203, RY1 - 10, 28, rot=True)
text('CLR', 1228, RY1 - 10, 28, rot=True)
text('CLR', 1598, RY1 - 10, 28, rot=True)
bubble(1196, RY1 + 9)
line([(1196, RY1 + 18), (1196, RY1 + 60)], B)
line([(1221, RY1), (1221, RY1 + 60)], B)
line([(1587, RY1), (1587, RY1 + 60)], B)
text('StallD', 1196, RY1 + 95, 32, B, anchor='end')
text('FlushD', 1210, RY1 + 95, 32, B)
text('FlushE', 1587, RY1 + 95, 32, B, anchor='middle')
line([(1234, 600), (1360, 600)])
text('InstrD', 1248, 586, 34)
text('to Decoder', 1368, 612, 32)
line([(1234, 830), (1560, 830)])
text('PCD', 1370, 818)
line([(1420, 560), (1560, 560)])
text('ExtImmD', 1380, 546, 34)

# E: the next-PC adder works out PCNextE for E's instruction.
line([(1614, 560), (1860, 560)])
text('ExtImmE', 1628, 546, 34)
line([(1614, 830), (1860, 830)])
text('PCE', 1630, 818, 34)
rounded(1630, 380, 1800, 460)
text('PC Logic', 1715, 433, 32, B, True, 'middle')
o1 = mux(1860, 440, 170, [('0', 486), ('1', 560)])
line([(1820, 486), (1860, 486)])
text('4', 1790, 500, 40, bold=True)
o2 = mux(1860, 720, 170, [('1', 760), ('0', 830)])
line([(1780, 650), (1780, 760), (1860, 760)])
text('RD1FwdE', 1640, 640, 34)
ax, ay = adder(1990, 480, 380)
line([o1, (1990, o1[1])])
line([o2, (1990, o2[1])])
# PCSrcE: the two selects, and on to the predictor.
line([(1800, 420), (1892, 420), (1892, 450)], B)
line([(1892, 420), (1950, 420), (1950, 690), (1892, 690), (1892, 730)], B)
text('PCSrcE', 1806, 408, 28, B)
text('[0]', 1900, 470, 26, B)
text('[1]', 1902, 684, 26, B)

# PCNextE: back to the PC mux, to the comparator, and into the BHT.
line([(ax, ay), (2110, ay), (2110, Y_NEXT), (30, Y_NEXT), (30, 470), (60, 470)])
text('PCNextE', 2122, ay - 14, 37, bold=True)
text('BTAE if PCSrcE,', 2122, ay + 30, 30)
text('else PCE + 4', 2122, ay + 64, 30)

# Mispredict: the PC mux's select, and the flushes.
line([(2800, 1640), (2860, 1640), (2860, Y_MISS), (92, Y_MISS), (92, 432)], B)
text('Mispredict', 2640, Y_MISS - 12, 37, B, True)
text('FlushD = Mispredict,  FlushE = Mispredict + lwStall', 1150, Y_MISS - 12, 32, B)

# BHT: read port 1 at PCF in Fetch; read/write port 2 at PCE in Execute.
bx0, by0, bx1, by1 = 240, 1100, 560, 1470
text('BHT', (bx0 + bx1) / 2, by0 - 16, 46, bold=True, anchor='middle')
rect(bx0, by0, bx1, by1)
line([(bx0 + 90, by0), (bx0 + 90, by1)], K, 4)
for y in range(by0 + 60, by1 - 30, 62):
    line([(bx0, y), (bx1, y)], K, 3)
text('PrPCSrc', bx0 + 45, by0 + 38, 22, anchor='middle')
text('PrBTA', bx0 + 205, by0 + 42, 34, anchor='middle')
clock(bx1 - 46, by0, label=False)
text('CLK', bx1 - 36, by0 - 20, 30)
# Port 1: the index, and the prediction for F's instruction.
line([(360, 525), (360, 1030), (190, 1030), (190, 1690)])
line([(190, 1180), (bx0 - 6, 1180)], K)
shape([(bx0 - 22, 1166), (bx0, 1180), (bx0 - 22, 1194)], K, 3, K)
text('PCF[k+1:2]', 175, 1160, 30, anchor='end')
# PCF + 4, and the prediction mux.
line([(190, 1690), (240, 1690)])
fx, fy = adder(240, 1630, 250)
line([(206, 1830), (240, 1830)])
text('4', 212, 1818, 40, bold=True)
line([(fx, fy), (470, fy)])
text('PCPlus4F', 330, fy - 12, 28)
line([(400, by1), (400, 1640), (470, 1640)])
text('PrBTAF', 390, 1630, 28, rot=True)
line([(530, by1), (530, 1560), (502, 1560), (502, 1610)], B)
text('PrPCSrcF', 540, 1580, 30, B)
px, py = mux(470, 1590, 230, [('1', 1640), ('0', fy)])
line([(px, py), (590, py), (590, 1940), (12, 1940), (12, 580), (60, 580)])
text('PredPCF', 604, 1930, 37, bold=True)

# Port 2, from and to Execute.
PORTS = [(1150, 'PCE[k+1:2]', K), (1195, 'PCNextE', K), (1240, 'PCSrcE', B), (1285, 'PrPCSrcE', B),
         (1330, 'PrBTAE', K), (1380, 'WE_PrPCSrc (Branch Mispredicted)', B), (1425, 'WE_PrBTA (BTA Mispredicted)', B)]
for y, name, c in PORTS:
    text(name, bx1 + 14, y - 10, 28, c)
line([(1700, 830), (1700, 1150), (bx1, 1150)])
line([(2110, ay), (2110, 1195), (bx1, 1195)])
line([(1950, 690), (1980, 690), (1980, 1240), (bx1, 1240)], B)

# Execute's check: was the prediction F used for this instruction right?
GX = 2440
line([(bx1, 1285), (2400, 1285), (2400, 1542), (GX, 1542)], B)            # PrPCSrcE
line([(bx1, 1330), (2360, 1330), (2360, 1692), (GX, 1692)])              # PrBTAE
line([(2110, 1195), (2320, 1195), (2320, 1728), (GX, 1728)])             # PCNextE
line([(1980, 1240), (2420, 1240), (2420, 1640), (2540, 1640), (2540, 1672), (2570, 1672)], B)  # PCSrcE
line([(2420, 1578), (GX, 1578)], B)
xor(GX, 1560)
comparator(GX, 1710)
line([(GX + 70, 1710), (2570, 1710)])
gate_and(2570, 1690)
line([(GX + 74, 1560), (2715, 1560), (2715, 1622), (2726, 1622)], B)
line([(2644, 1690), (2715, 1690), (2715, 1658), (2726, 1658)], B)
gate_or(2726, 1640)
# The writes: PrPCSrc on a branch misprediction, PrBTA on a BTA one.
line([(2560, 1560), (2560, 1380), (bx1, 1380)], B)
line([(2680, 1690), (2680, 1425), (bx1, 1425)], B)
text('Branch Mispredicted = PrPCSrcE ⊕ PCSrcE', 1760, 1840, 34, B)
text('BTA Mispredicted = PCSrcE · (PrBTAE ≠ PCNextE)', 1760, 1886, 34, B)
text('(a 2-bit PrPCSrc counter steps on every instruction)', 1760, 1932, 30, B)

svg = ('<svg width="%d" height="%d" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" overflow="hidden">'
       '<rect width="100%%" height="100%%" fill="#FFFFFF"/>%s</svg>\n') % (W, H, W, H, ''.join(out))
open(OUT, 'w').write(svg)
print('wrote', os.path.relpath(OUT, ROOT))
