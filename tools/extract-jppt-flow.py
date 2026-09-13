#!/usr/bin/env python
"""Trace the JPPT course-flow chart into src/components/discuss/jppt/__fixtures__/delta/FLOW.js.

The chart -- "T-6B JPPT COMPLETE COURSE FLOW", printed page I-3 of CNATRAINST 1542.166D --
is inline vector content, not an image: every box is a unit-space path under its own `cm`
matrix, every connector is an axis-aligned polyline, and the eight legend keys pair by
y-position with the eight legend captions. So the whole figure can be read out of the content
stream and re-emitted as SVG coordinates, which is what this script does.

Not part of the build. Run it when a new JPPT is published, then hand-check the output --
`--dry-run` prints the data file to stdout instead of writing it.

    PYTHONIOENCODING=utf-8:replace python tools/extract-jppt-flow.py --dry-run
    PYTHONIOENCODING=utf-8:replace python tools/extract-jppt-flow.py

PYTHONIOENCODING matters: the publication contains characters cp1252 cannot encode, and
without it the script dies partway through with a UnicodeEncodeError.

src/components/discuss/jppt/flowExtract.js is a line-for-line JavaScript port of this script,
run in the browser when someone uploads a JPPT. jppt.test.js requires the port to reproduce
FLOW.js exactly, so a change here must be made there too, and the test re-run.

Needs only the standard library. The object-table and stream-decompression passes are lifted
from _reference-docs/pdftext.py, which is a script rather than a module and so cannot be
imported without running it.
"""

import argparse
import math
import os
import re
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PDF = os.path.join(ROOT, '_reference-docs', 'Fundamental References', 'Delta JPPT.pdf')
OUT = os.path.join(ROOT, 'src', 'components', 'discuss', 'jppt', '__fixtures__', 'delta', 'FLOW.js')
SYLLABUS = os.path.join(ROOT, 'src', 'components', 'discuss', 'jppt', '__fixtures__', 'delta', 'SYLLABUS.js')

TITLE = 'COMPLETE COURSE FLOW'
PAGE_HEIGHT = 792.0

# Tolerances, all in PDF points. The endpoint tolerance is generous because a connector stops
# a little short of the box it points at; the junction tolerance is tight but not exact -- the
# ground-column spine stubs miss their trunk by 0.5 pt.
EDGE_SNAP = 6.0
ARROW_SNAP = 8.0
JUNCTION_SNAP = 1.5
ARROWHEAD_MAX = 9.0


# ---------------------------------------------------------------------------------------
# PDF object table (from _reference-docs/pdftext.py)
# ---------------------------------------------------------------------------------------

def load_objects(path):
    data = open(path, 'rb').read()
    obj = {}
    for m in re.finditer(rb'(?<![0-9])(\d+)\s+(\d+)\s+obj\b', data):
        s = m.end()
        e = data.find(b'endobj', s)
        obj[int(m.group(1))] = data[s:e if e > 0 else len(data)]

    # PDF 1.5+ packs most objects into compressed /ObjStm streams. Without this pass the
    # Delta JPPT yields zero pages.
    for num in list(obj):
        b = obj[num]
        head = b[:b.find(b'stream')] if b.find(b'stream') > 0 else b[:400]
        if b'/ObjStm' not in head:
            continue
        st = raw_stream(b)
        mn = re.search(rb'/N\s+(\d+)', head)
        mf = re.search(rb'/First\s+(\d+)', head)
        if not (st and mn and mf):
            continue
        n, first = int(mn.group(1)), int(mf.group(1))
        hdr = st[:first].split()
        for i in range(n):
            try:
                onum, ooff = int(hdr[2 * i]), int(hdr[2 * i + 1])
            except Exception:
                break
            end = first + int(hdr[2 * i + 3]) if 2 * i + 3 < len(hdr) else len(st)
            obj.setdefault(onum, st[first + ooff:end])
    return obj


def raw_stream(b):
    i = b.find(b'stream')
    if i < 0:
        return None
    j = i + 6
    if b[j:j + 2] == b'\r\n':
        j += 2
    elif b[j:j + 1] in (b'\n', b'\r'):
        j += 1
    # Prefer the declared /Length: slicing to `endstream` sweeps up the EOL before it, and
    # those bytes fail zlib's checksum on an otherwise fine stream.
    ml = re.search(rb'/Length\s+(\d+)', b[:i])
    cands = []
    if ml:
        cands.append(b[j:j + int(ml.group(1))])
    k = b.rfind(b'endstream')
    cands.append(b[j:k])
    cands.append(b[j:k].rstrip(b'\r\n'))
    if b'FlateDecode' not in b[:i]:
        return cands[0]
    for raw in cands:
        try:
            return zlib.decompress(raw)
        except Exception:
            pass
    for raw in cands:
        try:
            return zlib.decompressobj().decompress(raw)
        except Exception:
            pass
    return None


def page_objects(obj):
    out = []
    for num in sorted(obj):
        b = obj[num]
        if re.search(rb'/Type\s*/Page\b', b) and not re.search(rb'/Type\s*/Pages\b', b):
            out.append(num)
    return out


def page_content(obj, pnum):
    pb = obj.get(pnum, b'')
    nums = []
    mc = re.search(rb'/Contents\s+(\d+)\s+\d+\s+R', pb)
    if mc:
        n = int(mc.group(1))
        s = raw_stream(obj.get(n, b''))
        nums = [n] if s is not None else [
            int(x) for x in re.findall(rb'(\d+)\s+\d+\s+R', obj.get(n, b''))
        ]
    else:
        mc2 = re.search(rb'/Contents\s*\[(.*?)\]', pb, re.S)
        if mc2:
            nums = [int(x) for x in re.findall(rb'(\d+)\s+\d+\s+R', mc2.group(1))]
    return b''.join((raw_stream(obj.get(c, b'')) or b'') for c in nums)


# ---------------------------------------------------------------------------------------
# Content stream tokenizer
# ---------------------------------------------------------------------------------------
#
# A regex sweep over the raw stream is not good enough here: single-glyph strings inside TJ
# arrays -- `(F)4.9`, `(B)-4`, `(G)-50.3` -- look exactly like the F, B and G operators, and a
# shape's position lives in its `cm` matrix rather than in its path operands. So tokenize
# properly and interpret with a graphics-state stack.

TOKEN = re.compile(
    rb'''
      (?P<ws>[\s\x00]+)
    | (?P<comment>%[^\r\n]*)
    | (?P<dopen><<) | (?P<dclose>>>)
    | (?P<hexstr><[0-9A-Fa-f\s]*>)
    | (?P<name>/[^\s/\[\]<>(){}%]*)
    | (?P<num>[+-]?(?:\d+\.?\d*|\.\d+))
    | (?P<aopen>\[) | (?P<aclose>\])
    | (?P<brace>[{}])
    | (?P<op>[A-Za-z'"*][A-Za-z0-9'"*]*)
    ''',
    re.X,
)


def scan_string(buf, i):
    """Read a literal ( ... ) string starting at buf[i] == '('. Returns (bytes, next_index)."""
    depth = 0
    out = bytearray()
    while i < len(buf):
        c = buf[i:i + 1]
        if c == b'\\':
            nxt = buf[i + 1:i + 2]
            mp = {b'n': 10, b'r': 13, b't': 9, b'b': 8, b'f': 12,
                  b'(': 40, b')': 41, b'\\': 92}
            if nxt in mp:
                out.append(mp[nxt])
                i += 2
            elif nxt.isdigit():
                j, d = i + 1, b''
                while j < len(buf) and buf[j:j + 1].isdigit() and len(d) < 3:
                    d += buf[j:j + 1]
                    j += 1
                out.append(int(d, 8) & 0xFF)
                i = j
            elif nxt in (b'\n', b'\r'):
                i += 2
            else:
                out.append(nxt[0] if nxt else 92)
                i += 2
            continue
        if c == b'(':
            depth += 1
            if depth > 1:
                out.append(40)
            i += 1
            continue
        if c == b')':
            depth -= 1
            i += 1
            if depth == 0:
                return bytes(out), i
            out.append(41)
            continue
        out.append(c[0])
        i += 1
    return bytes(out), i


def tokenize(buf):
    i, n = 0, len(buf)
    while i < n:
        if buf[i:i + 1] == b'(':
            s, i = scan_string(buf, i)
            yield ('str', s)
            continue
        m = TOKEN.match(buf, i)
        if not m:
            i += 1
            continue
        i = m.end()
        kind = m.lastgroup
        tok = m.group()
        if kind in ('ws', 'comment'):
            continue
        if kind == 'num':
            try:
                yield ('num', float(tok))
            except ValueError:
                pass
        elif kind == 'name':
            yield ('name', tok[1:].decode('latin-1'))
        elif kind == 'hexstr':
            h = re.sub(rb'\s', b'', tok[1:-1])
            if len(h) % 2:
                h += b'0'
            try:
                yield ('str', bytes.fromhex(h.decode()))
            except ValueError:
                yield ('str', b'')
        elif kind in ('aopen', 'aclose', 'dopen', 'dclose', 'brace'):
            yield ('punct', tok.decode('latin-1'))
        else:
            yield ('op', tok.decode('latin-1'))


# ---------------------------------------------------------------------------------------
# Interpreter
# ---------------------------------------------------------------------------------------

IDENTITY = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def mul(m, n):
    """m x n, both (a,b,c,d,e,f) row-major PDF matrices."""
    a1, b1, c1, d1, e1, f1 = m
    a2, b2, c2, d2, e2, f2 = n
    return (
        a1 * a2 + b1 * c2,
        a1 * b2 + b1 * d2,
        c1 * a2 + d1 * c2,
        c1 * b2 + d1 * d2,
        e1 * a2 + f1 * c2 + e2,
        e1 * b2 + f1 * d2 + f2,
    )


def apply(m, x, y):
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)


def scale_of(m):
    a, b, c, d = m[0], m[1], m[2], m[3]
    return math.sqrt(abs(a * d - b * c)) or 1.0


PAINT_OPS = {'S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'n'}
FILL_OPS = {'f', 'F', 'f*', 'B', 'B*', 'b', 'b*'}
STROKE_OPS = {'S', 's', 'B', 'B*', 'b', 'b*'}


class Path(object):
    __slots__ = ('ops', 'pts', 'paint', 'clip', 'lw', 'order')

    def __init__(self):
        self.ops = []
        self.pts = []
        self.paint = None
        self.clip = False
        self.lw = 0.0
        self.order = 0

    @property
    def sig(self):
        return ' '.join(self.ops)

    @property
    def bbox(self):
        xs = [p[0] for p in self.pts]
        ys = [p[1] for p in self.pts]
        return (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))


class Run(object):
    """One text-showing operation, with the user-space origin of its baseline."""
    __slots__ = ('x', 'y', 'text', 'order')

    def __init__(self, x, y, text, order):
        self.x, self.y, self.text, self.order = x, y, text, order


def interpret(buf):
    """Walk the content stream, returning (paths, runs)."""
    ctm = IDENTITY
    lw = 1.0
    stack = []
    paths, runs = [], []
    cur = Path()
    pending_clip = False
    tm = tlm = IDENTITY
    leading = 0.0
    operands = []
    order = 0

    def flush(paint):
        nonlocal cur, pending_clip, order
        if cur.pts:
            cur.paint = paint
            cur.clip = pending_clip
            cur.lw = lw * scale_of(ctm)
            cur.order = order
            order += 1
            paths.append(cur)
        cur = Path()
        pending_clip = False

    def nums(k):
        vals = [o for o in operands if isinstance(o, float)]
        return vals[-k:] if len(vals) >= k else None

    for kind, tok in tokenize(buf):
        if kind in ('num', 'str', 'name', 'punct'):
            operands.append(tok if kind != 'num' else float(tok))
            continue
        op = tok

        if op == 'q':
            stack.append((ctm, lw))
        elif op == 'Q':
            if stack:
                ctm, lw = stack.pop()
        elif op == 'cm':
            v = nums(6)
            if v:
                ctm = mul(tuple(v), ctm)
        elif op == 'w':
            v = nums(1)
            if v:
                lw = v[0]
        elif op == 'gs':
            pass

        elif op == 'm':
            v = nums(2)
            if v:
                cur.ops.append('m')
                cur.pts.append(apply(ctm, v[0], v[1]))
        elif op == 'l':
            v = nums(2)
            if v:
                cur.ops.append('l')
                cur.pts.append(apply(ctm, v[0], v[1]))
        elif op in ('c', 'v', 'y'):
            k = 6 if op == 'c' else 4
            v = nums(k)
            if v:
                cur.ops.append('c')
                # Only the on-curve endpoint. For the 4-arc circles and the rounded-rect
                # corner arcs here the on-curve points sit at the extremes, so the bbox is
                # exact -- and including control points would inflate every ellipse.
                cur.pts.append(apply(ctm, v[-2], v[-1]))
        elif op == 're':
            v = nums(4)
            if v:
                x, y, w, h = v
                cur.ops.append('re')
                for px, py in ((x, y), (x + w, y), (x + w, y + h), (x, y + h)):
                    cur.pts.append(apply(ctm, px, py))
        elif op == 'h':
            cur.ops.append('h')
        elif op in ('W', 'W*'):
            pending_clip = True

        elif op in PAINT_OPS:
            flush(op)

        elif op == 'BT':
            tm = tlm = IDENTITY
        elif op == 'ET':
            pass
        elif op == 'Tm':
            v = nums(6)
            if v:
                tm = tlm = tuple(v)
        elif op in ('Td', 'TD'):
            v = nums(2)
            if v:
                if op == 'TD':
                    leading = -v[1]
                tlm = mul((1.0, 0.0, 0.0, 1.0, v[0], v[1]), tlm)
                tm = tlm
        elif op == 'TL':
            v = nums(1)
            if v:
                leading = v[0]
        elif op == 'T*':
            tlm = mul((1.0, 0.0, 0.0, 1.0, 0.0, -leading), tlm)
            tm = tlm
        elif op in ('Tj', 'TJ', "'", '"'):
            if op in ("'", '"'):
                tlm = mul((1.0, 0.0, 0.0, 1.0, 0.0, -leading), tlm)
                tm = tlm
            parts = []
            if op == 'TJ':
                for o in operands:
                    if isinstance(o, bytes):
                        parts.append(o.decode('latin-1'))
            else:
                for o in reversed(operands):
                    if isinstance(o, bytes):
                        parts.append(o.decode('latin-1'))
                        break
            text = ''.join(parts)
            if text.strip():
                ox, oy = apply(mul(tm, ctm), 0.0, 0.0)
                runs.append(Run(ox, oy, text, order))
                order += 1

        operands = []

    return paths, runs


# ---------------------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------------------

# Local path op-signature -> shape name. The two `m c c c c h` shapes are told apart by size:
# a flow-connector circle is 15 x 15, a ground-training ellipse is 45 x 17.3.
SHAPE_SIG = {
    'm l c l c l c l c h': 'roundrect',
    're': 'rect',
    'm c c c c h': 'ellipse',
    'm l l l l l l h': 'hex6',
    'm l l l l l l l l h': 'oct8',
}


def shape_of(path):
    name = SHAPE_SIG.get(path.sig)
    if name is None:
        return None
    if name == 'ellipse':
        _, _, w, h = path.bbox
        if w < 25 and h < 25:
            return 'circle'
    return name


def classify(paths):
    nodes, arrows, connectors, other = [], [], [], []
    for p in paths:
        if p.clip or p.paint == 'n':
            continue
        _, _, w, h = p.bbox
        if p.paint in FILL_OPS and max(w, h) <= ARROWHEAD_MAX:
            arrows.append(p)
            continue
        if p.paint in STROKE_OPS:
            shape = shape_of(p)
            if shape and 10.0 <= w <= 60.0 and 10.0 <= h <= 25.0:
                nodes.append((p, shape))
                continue
            if set(p.ops) <= {'m', 'l'} and len(p.pts) >= 2:
                connectors.append(p)
                continue
            # A connector that hops over another with a little arc: the arc's two ends sit
            # on the line and its midpoint off it. Flatten the hop and keep the line.
            if set(p.ops) <= {'m', 'l', 'c'} and 'l' in p.ops and len(p.pts) >= 3:
                pts = straighten(p.pts)
                if len(pts) >= 2:
                    q = Path()
                    q.ops, q.pts, q.paint, q.clip, q.lw, q.order = (
                        list(p.ops), pts, p.paint, p.clip, p.lw, p.order)
                    connectors.append(q)
                    continue
        other.append(p)
    return nodes, arrows, connectors, other


def straighten(pts):
    """Drop the off-axis midpoint of every hop, then any point collinear with its neighbours."""
    def same(u, v):
        return abs(u - v) <= 0.6
    kept = []
    for i, pt in enumerate(pts):
        if i == 0 or i == len(pts) - 1:
            kept.append(pt)
            continue
        a, b = pts[i - 1], pts[i + 1]
        axis = 0 if same(a[0], b[0]) else 1 if same(a[1], b[1]) else -1
        if axis == -1 or same(pt[axis], a[axis]):
            kept.append(pt)
    out = []
    for i, pt in enumerate(kept):
        if i == 0 or i == len(kept) - 1:
            out.append(pt)
            continue
        a, b = kept[i - 1], kept[i + 1]
        if (same(a[0], pt[0]) and same(pt[0], b[0])) or (same(a[1], pt[1]) and same(pt[1], b[1])):
            continue
        out.append(pt)
    return out


BANDS = ['thin', 'mid', 'thick']


def key_of(shape, lw):
    """The (shape, stroke weight) pair the legend keys off. Weights come in three bands."""
    if lw < 0.72:
        band = 'thin'
    elif lw < 1.05:
        band = 'mid'
    else:
        band = 'thick'
    return (shape, band)


# ---------------------------------------------------------------------------------------
# Labels, legend, categories
# ---------------------------------------------------------------------------------------

CATEGORY_SLUG = {
    'Flight': 'flight',
    'Check Flight': 'check',
    'Simulator': 'sim',
    'Ground Training': 'ground',
    'CAI Test': 'cai',
    'Flt Support': 'support',
    'P/P Exam': 'exam',
    'Flow Connector': 'jump',
}
LEGEND_TEXTS = set(CATEGORY_SLUG)


def inside(bbox, x, y, pad=0.0):
    bx, by, bw, bh = bbox
    return (bx - pad) <= x <= (bx + bw + pad) and (by - pad) <= y <= (by + bh + pad)


def attach_labels(nodes, runs):
    """Give every node the text whose baseline origin falls inside it."""
    labelled, used = [], set()
    for path, shape in nodes:
        mine = [i for i, r in enumerate(runs)
                if i not in used and inside(path.bbox, r.x, r.y)]
        used.update(mine)
        mine.sort(key=lambda i: runs[i].order)
        label = re.sub(r'\s+', '', ''.join(runs[i].text for i in mine))
        labelled.append({'path': path, 'shape': shape, 'label': label})
    leftover = [r for i, r in enumerate(runs) if i not in used]
    return labelled, leftover


def derive_categories(labelled, leftover):
    """Pair each unlabelled key shape with its legend caption, giving (shape, weight) -> kind.

    This is what makes the categories evidence rather than guesswork: the publication draws
    its own key, so the mapping comes out of the page instead of out of the event ids.
    """
    captions, used = [], set()
    for i, r in enumerate(leftover):
        t = r.text.strip()
        if t in LEGEND_TEXTS:
            captions.append((r.y, t, r.x))
            used.add(i)
    # A caption printed on two lines ("Flow" over "Connector"): the run directly beneath,
    # left-aligned with it.
    for i, r in enumerate(leftover):
        if i in used:
            continue
        for j, q in enumerate(leftover):
            if j == i or j in used or i in used:
                continue
            if abs(q.x - r.x) > 2.0 or r.y - q.y <= 0 or r.y - q.y > 12.0:
                continue
            t = re.sub(r'\s+', ' ', '%s %s' % (r.text.strip(), q.text.strip())).strip()
            if t not in LEGEND_TEXTS:
                continue
            captions.append(((r.y + q.y) / 2.0, t, r.x))
            used.add(i)
            used.add(j)
    keys = [n for n in labelled if not n['label']]
    mapping, pairs = {}, []
    for y, text, x in captions:
        best, bestd = None, 1e9
        for k in keys:
            kx, ky, kw, kh = k['path'].bbox
            d = abs((ky + kh / 2.0) - y)
            if kx > x:            # the key sits left of its caption
                continue
            if d < bestd:
                best, bestd = k, d
        if best is None or bestd > 12.0:
            print('  WARNING: legend caption %r found no key shape' % text, file=sys.stderr)
            continue
        kind = CATEGORY_SLUG[text]
        mapping[key_of(best['shape'], best['path'].lw)] = kind
        pairs.append((text, kind, best))
    return mapping, pairs


def category_mapper(mapping, pairs, labelled):
    """The kind of a chart box, from the legend.

    A box whose shape and stroke weight the legend draws is that caption. Where the legend is
    no help -- it draws two captions of one shape with the same weight (Echo's Ground Training
    and P/P Exam are both thin), or the chart uses a weight the legend never draws -- the
    shape's captions are taken in legend order, top to bottom, and the chart's weights for
    that shape in order, thin to thick: the publication lists the lighter stroke first.
    """
    by_shape = {}
    for text, kind, key in pairs:
        kx, ky, kw, kh = key['path'].bbox
        by_shape.setdefault(key['shape'], []).append({
            'text': text, 'kind': kind, 'y': ky + kh / 2.0,
            'key': key_of(key['shape'], key['path'].lw)})
    for entries in by_shape.values():
        entries.sort(key=lambda e: -e['y'])
    bands_of = {}
    for n in labelled:
        if n['label']:
            bands_of.setdefault(n['shape'], set()).add(key_of(n['shape'], n['path'].lw)[1])
    ranked = {}

    def kind_for(shape, lw):
        entries = by_shape.get(shape, [])
        if not entries:
            return None
        direct = mapping.get(key_of(shape, lw))
        distinct = len(set(e['key'] for e in entries)) == len(entries)
        if distinct and direct is not None:
            return direct
        if len(entries) == 1:
            return entries[0]['kind']
        if shape not in ranked:
            bands = [b for b in BANDS if b in bands_of.get(shape, set())]
            ranked[shape] = {}
            for i, b in enumerate(bands):
                ranked[shape][b] = entries[min(i, len(entries) - 1)]['kind']
            names = ' and '.join('"%s"' % e['text'] for e in entries)
            print('  WARNING: the legend does not tell %s apart by stroke weight; the '
                  "chart's %s were sorted by weight, lightest first"
                  % (names, 'ellipses' if shape == 'ellipse' else '%s boxes' % shape),
                  file=sys.stderr)
        return ranked[shape].get(key_of(shape, lw)[1])

    return kind_for


# ---------------------------------------------------------------------------------------
# Label -> event ids
# ---------------------------------------------------------------------------------------

RANGE_RE = re.compile(r'^([A-Z]+)(\d+)([A-Z]?)(?:-(\d+))?$')


def expand(label):
    """`FAM4301-4` -> the four events it covers. The trailing number replaces that many
    digits of the base id, so `IN1401-13` runs to IN1413 rather than to IN1413 read as 1-13."""
    m = RANGE_RE.match(label)
    if not m:
        return []
    prefix, digits, variant, end = m.groups()
    base = prefix + digits + variant
    if not end:
        return [base]
    k = len(end)
    if k > len(digits):
        return [base]
    head = digits[:-k]
    start = int(digits[-k:])
    stop = int(end)
    if stop < start:
        return [base]
    return ['%s%s%s' % (prefix, head, str(i).zfill(k)) for i in range(start, stop + 1)]


def block_of(event_id):
    m = re.match(r'^([A-Z]+)(\d\d)', event_id)
    return (m.group(1) + m.group(2)) if m else None


def syllabus_event_ids():
    try:
        src = open(SYLLABUS, encoding='utf-8').read()
    except IOError:
        print('  WARNING: SYLLABUS.js not found; skipping the cross-check', file=sys.stderr)
        return None
    return set(re.findall(r"\{\s*id:\s*'([A-Z0-9]+)'", src))


# ---------------------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------------------

def edge_midpoints(bbox):
    x, y, w, h = bbox
    return {
        'L': (x, y + h / 2.0),
        'R': (x + w, y + h / 2.0),
        'T': (x + w / 2.0, y + h),
        'B': (x + w / 2.0, y),
    }


def dist(p, q):
    return math.hypot(p[0] - q[0], p[1] - q[1])


def nearest_node(point, node_mids, tol):
    best, bestd = None, tol
    for nid, mids in node_mids.items():
        for side, m in mids.items():
            d = dist(point, m)
            if d <= bestd:
                best, bestd = (nid, side), d
    return best


def foot_on(point, a, b):
    """The point's right-angle projection onto the segment a-b."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    seg = dx * dx + dy * dy
    if seg < 1e-9:
        return (a[0], a[1])
    t = max(0.0, min(1.0, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / seg))
    return (a[0] + t * dx, a[1] + t * dy)


def segment_on(point, pts, tol):
    """The index of the segment of `pts` the point lies on, or -1."""
    for i in range(len(pts) - 1):
        ax, ay = pts[i]
        bx, by = pts[i + 1]
        dx, dy = bx - ax, by - ay
        seg = math.hypot(dx, dy)
        if seg < 1e-6:
            continue
        t = ((point[0] - ax) * dx + (point[1] - ay) * dy) / (seg * seg)
        if t < -0.02 or t > 1.02:
            continue
        if dist(point, (ax + t * dx, ay + t * dy)) <= tol:
            return i
    return -1


def point_on_path(point, pts, tol):
    return segment_on(point, pts, tol) != -1


def chain(segs, node_mids):
    """Join polylines that are two halves of one connector, and only those.

    Some connectors are emitted as several stroked paths meeting at a corner, so they have to
    be joined or each piece looks like an edge of its own. But a fan-out is emitted as several
    *complete* paths sharing a trunk, and joining those would wire the siblings to each other.
    The distinction: only join at a point that reaches no box and where exactly two path ends
    meet. A fan-out's shared point is where both paths *start*, at a box; a bus T-junction has
    one end arriving and none leaving, so neither is touched here.
    """
    joins = 0
    changed = True
    while changed:
        changed = False
        for i in range(len(segs)):
            for ei in (0, -1):
                pt = segs[i][ei]
                if nearest_node(pt, node_mids, EDGE_SNAP):
                    continue
                partners = [(j, ej) for j in range(len(segs)) if j != i
                            for ej in (0, -1) if dist(segs[j][ej], pt) <= JUNCTION_SNAP]
                if len(partners) != 1:
                    continue
                j, ej = partners[0]
                head = segs[i] if ei == -1 else list(reversed(segs[i]))
                tail = segs[j] if ej == 0 else list(reversed(segs[j]))
                merged = head + tail[1:]
                segs = [s for k, s in enumerate(segs) if k not in (i, j)] + [merged]
                joins += 1
                changed = True
                break
            if changed:
                break
    return segs, joins


def resolve_edges(nodes, connectors, arrows):
    """Each polyline is one candidate edge; the arrowhead near an end names the head.

    Arrowheads must not be deduped by position: a fan-in stacks one arrowhead per source at a
    single point, so eight sources arrive as eight coincident heads.
    """
    node_mids = {n['id']: edge_midpoints(n['bbox']) for n in nodes}
    heads = [(sum(p[0] for p in a.pts) / len(a.pts),
              sum(p[1] for p in a.pts) / len(a.pts)) for a in arrows]

    # The arrowhead at an end, if one sits there: its apex, the vertex farthest from the
    # centroid, and which way it points. A head pointing on along the line's direction of
    # travel into this end is the arrow into the box there; one pointing back down the line
    # is the figure marking this end as the arrow's source (Delta draws FAM1204's that way).
    # The apex matters because a connector stops at the base of its head, and a long head
    # puts that base outside the snap tolerance while the apex touches the box.
    def head_at(p, prev):
        ux, uy = p[0] - prev[0], p[1] - prev[1]
        ulen = math.hypot(ux, uy) or 1.0
        best = None
        for i, c in enumerate(heads):
            d = dist(c, p)
            if d > ARROW_SNAP or (best is not None and d >= best['d']):
                continue
            pts = arrows[i].pts
            apex = pts[0]
            for q in pts:
                if dist(q, c) > dist(apex, c):
                    apex = q
            ax, ay = apex[0] - c[0], apex[1] - c[1]
            along = (ax * ux + ay * uy) / ((math.hypot(ax, ay) or 1.0) * ulen)
            # A head square to the line is another connector's, passing close by: the
            # spine's arrow into PR0101-5 sits beside the start of SY0301's stub.
            if abs(along) < 0.7:
                continue
            best = {'d': d, 'i': i, 'apex': apex, 'incoming': along >= 0}
        return best

    segs, joins = chain([list(p.pts) for p in connectors], node_mids)
    print('  joined %d split connector path(s) -> %d polylines' % (joins, len(segs)),
          file=sys.stderr)

    raw = []
    for pts in segs:
        a, b = pts[0], pts[-1]
        ha = head_at(a, pts[1])
        hb = head_at(b, pts[-2])
        ra = nearest_node(a, node_mids, EDGE_SNAP) or (ha and nearest_node(ha['apex'], node_mids, EDGE_SNAP)) or None
        rb = nearest_node(b, node_mids, EDGE_SNAP) or (hb and nearest_node(hb['apex'], node_mids, EDGE_SNAP)) or None
        # Two boxes drawn touching leave a connector a few points long between them, and
        # both of its ends snap to the nearer box. Give the ends different boxes, the
        # closest pair.
        if ra and rb and ra[0] == rb[0]:
            best = None
            for na, mids_a in node_mids.items():
                for sa, ma in mids_a.items():
                    da = dist(a, ma)
                    if da > EDGE_SNAP:
                        continue
                    for nb, mids_b in node_mids.items():
                        for sb, mb in mids_b.items():
                            db = dist(b, mb)
                            if nb == na or db > EDGE_SNAP:
                                continue
                            if best is None or da + db < best['d']:
                                best = {'d': da + db, 'ra': (na, sa), 'rb': (nb, sb)}
            if best:
                ra, rb = best['ra'], best['rb']
        # One head within reach of both ends of a short connector belongs to the end it is
        # nearer.
        at_a, at_b = ha, hb
        if ha and hb and ha['i'] == hb['i']:
            if ha['d'] < hb['d']:
                at_b = None
            elif hb['d'] < ha['d']:
                at_a = None
        raw.append({
            'pts': pts, 'a': ra, 'b': rb,
            'head_a': bool(at_a and at_a['incoming']),
            'head_b': bool(at_b and at_b['incoming']),
            'out_a': bool(at_a and not at_a['incoming']),
            'out_b': bool(at_b and not at_b['incoming']),
            'apex_a': at_a['apex'] if at_a else None,
            'apex_b': at_b['apex'] if at_b else None,
        })

    # An end that hit no box may be glued to another connector. Follow the host to its own
    # node end; that is the real source.
    def host_source(idx, point, depth=0):
        if depth > 4:
            return None
        for j, other in enumerate(raw):
            if j == idx:
                continue
            if point_on_path(point, other['pts'], JUNCTION_SNAP):
                if other['a'] and not other['head_a']:
                    return other['a'][0]
                if other['b'] and not other['head_b']:
                    return other['b'][0]
                tail = other['pts'][0] if other['head_b'] else other['pts'][-1]
                return host_source(j, tail, depth + 1)
        return None

    # The mirror image: an end that arrives on another connector joins it, and goes where
    # it goes. The host's remaining points come back too, so the edge runs all the way to
    # its box rather than stopping in the middle of a line.
    def host_target(idx, point, depth=0):
        if depth > 4:
            return None
        for j, other in enumerate(raw):
            if j == idx:
                continue
            k = segment_on(point, other['pts'], JUNCTION_SNAP)
            if k == -1:
                continue
            if not other['head_a'] and not other['head_b']:
                return None
            forward = other['head_b'] and not other['head_a']
            foot = foot_on(point, other['pts'][k], other['pts'][k + 1])
            rest = [foot] + (other['pts'][k + 1:] if forward else list(reversed(other['pts'][:k + 1])))
            end = other['b'] if forward else other['a']
            if end:
                return {'id': end[0], 'side': end[1], 'tail': rest}
            onward = host_target(j, rest[-1], depth + 1)
            return ({'id': onward['id'], 'side': onward['side'], 'tail': rest + onward['tail']}
                    if onward else None)
        return None

    # The figure stops a line at the base of its arrowhead, and a little short of the box it
    # leaves. The rendered arrow is a line with its head at the line's end, so the line has
    # to run to the box: move the end onto the side it snapped to, along the line's own
    # axis, the way the editor draws an arrow between two boxes. Every arrow into one side
    # then ends at the same point and draws one head.
    bbox_of_node = {n['id']: n['bbox'] for n in nodes}

    def on_side(pt, nid, side):
        x, y, w, h = bbox_of_node[nid]
        if side == 'L':
            return (x, pt[1])
        if side == 'R':
            return (x + w, pt[1])
        if side == 'T':
            return (pt[0], y + h)
        return (pt[0], y)

    UNSET = object()
    edges, unresolved = [], []
    for i, r in enumerate(raw):
        pts = r['pts']
        a_id = r['a'][0] if r['a'] else None
        b_id = r['b'][0] if r['b'] else None

        src = dst = order = UNSET
        src_side = dst_side = None
        if r['head_a'] or r['head_b'] or r['out_a'] or r['out_b']:
            forward = True if (r['head_b'] and not r['head_a']) else (False if r['head_a'] else r['out_a'])
            start = pts[0] if forward else pts[-1]
            end = pts[-1] if forward else pts[0]
            end_apex = r['apex_b'] if forward else r['apex_a']
            src = a_id if forward else b_id
            dst = b_id if forward else a_id
            src_snap = r['a'] if forward else r['b']
            dst_snap = r['b'] if forward else r['a']
            src_side = src_snap[1] if src_snap else None
            dst_side = dst_snap[1] if dst_snap else None
            order = list(pts) if forward else list(reversed(pts))
            if src is None:
                src = host_source(i, start)
            # A stub too short to clear its own box snaps both ends to it (Delta's FAM1204
            # is 3.5 pt long); the arrow leaves the box, so its far end is wherever it joins.
            if dst is not None and dst == src:
                dst = None
                dst_side = None
            if dst is None:
                joined = host_target(i, end) or (end_apex and host_target(i, end_apex)) or None
                if joined:
                    dst = joined['id']
                    dst_side = joined['side']
                    order = order + joined['tail']
        else:
            # No head at either end. A stub from a box to another connector is that box
            # joining the connector's flow: an arrow *into* the box would carry its own
            # head. Only when the joined connector goes nowhere does the older reading
            # apply, where the stub is a branch off a trunk and the trunk's source is its
            # source.
            if (a_id is None) != (b_id is None):
                box_end = a_id if a_id else b_id
                free = pts[-1] if a_id else pts[0]
                joined = host_target(i, free)
                if joined and joined['id'] != box_end:
                    src, dst = box_end, joined['id']
                    src_side = (r['a'] if a_id else r['b'])[1]
                    dst_side = joined['side']
                    order = (list(pts) if a_id else list(reversed(pts))) + joined['tail']
            elif a_id is None and b_id is None:
                # Neither end on a box: a line that leaves one connector and arrives on
                # another, carrying the first's source to the second's destination.
                # FAM2101-5's branch to FAM6101-2 in Echo turns into a stub that already
                # carries the head.
                for start, end, reverse in ((pts[0], pts[-1], False), (pts[-1], pts[0], True)):
                    s0 = host_source(i, start)
                    t0 = host_target(i, end) if s0 else None
                    if not s0 or not t0 or t0['id'] == s0:
                        continue
                    src, dst, dst_side = s0, t0['id'], t0['side']
                    order = (list(reversed(pts)) if reverse else list(pts)) + t0['tail']
                    break
        if src is UNSET:
            snapped_a, snapped_b = r['a'], r['b']
            if a_id is None:
                a_id = host_source(i, pts[0])
            if b_id is None:
                b_id = host_source(i, pts[-1])
            if b_id and not a_id:
                src, dst, order = a_id, b_id, list(pts)
                src_side = snapped_a[1] if snapped_a else None
                dst_side = snapped_b[1] if snapped_b else None
            else:
                src, dst, order = b_id, a_id, list(reversed(pts))
                src_side = snapped_b[1] if snapped_b else None
                dst_side = snapped_a[1] if snapped_a else None

        if not src or not dst or src == dst:
            unresolved.append((r, src, dst))
            continue
        if src_side:
            order[0] = on_side(order[0], src, src_side)
        if dst_side:
            order[-1] = on_side(order[-1], dst, dst_side)
        # Joining a host lands on a point the host already has; keep each corner once.
        order = [q for k, q in enumerate(order) if k == 0 or dist(q, order[k - 1]) > 0.05]
        # A trunk that feeds a bus resolves to the same pair as the bus's own branch, and the
        # branch already draws the whole route. One edge per pair.
        if any(e['from'] == src and e['to'] == dst for e in edges):
            continue
        edges.append({'from': src, 'to': dst, 'points': order})
    return edges, unresolved


# ---------------------------------------------------------------------------------------
# Emit
# ---------------------------------------------------------------------------------------

def flip(y, h):
    """PDF y-up to SVG y-down. Done here so the runtime does no arithmetic."""
    return PAGE_HEIGHT - (y + h)


def num(v):
    return ('%.1f' % v).rstrip('0').rstrip('.') or '0'


def render(nodes, legend, edges, viewbox, source):
    L = []
    L.append('// The JPPT course-flow chart, traced from %s.' % source)
    L.append('//')
    L.append('// Generated by tools/extract-jppt-flow.py. Regenerate rather than hand-edit the')
    L.append('// geometry: a new JPPT prints the same figure, so a re-run is the whole update.')
    L.append('// Coordinates are already in SVG space (y down), and `kind` comes from the shape and')
    L.append("// stroke weight the publication's own legend keys off.")
    L.append('')
    L.append("export const VIEWBOX = '%s';" % viewbox)
    L.append('')
    L.append('export const NODES = [')
    for n in nodes:
        x, y, w, h = n['bbox']
        row = "  { id: '%s', label: '%s', x: %s, y: %s, w: %s, h: %s, kind: '%s'" % (
            n['id'], n['label'], num(x), num(flip(y, h)), num(w), num(h), n['kind'])
        if n.get('letter'):
            row += ", letter: '%s', role: '%s'" % (n['letter'], n.get('role', 'both'))
        if n.get('block'):
            row += ", block: '%s'" % n['block']
        if n.get('events'):
            row += ', events: [%s]' % ', '.join("'%s'" % e for e in n['events'])
        L.append(row + ' },')
    L.append('];')
    L.append('')
    L.append('// The publication draws its own key. Kept in place so the trace stays faithful.')
    L.append('export const LEGEND = [')
    for k in legend:
        x, y, w, h = k['bbox']
        L.append("  { kind: '%s', label: '%s', shape: '%s', x: %s, y: %s, w: %s, h: %s },"
                 % (k['kind'], k['label'], k['shape'], num(x), num(flip(y, h)), num(w), num(h)))
    L.append('];')
    L.append('')
    L.append('export const EDGES = [')
    for e in edges:
        pts = ', '.join('[%s, %s]' % (num(px), num(flip(py, 0))) for px, py in e['points'])
        L.append("  { from: '%s', to: '%s', points: [%s] }," % (e['from'], e['to'], pts))
    L.append('];')
    L.append('')
    return '\n'.join(L)


# ---------------------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dry-run', action='store_true',
                    help='print the data file to stdout instead of writing it')
    ap.add_argument('--pdf', default=PDF)
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        sys.exit('not found: %s\n_reference-docs is gitignored -- the publication must be '
                 'present locally to regenerate the trace.' % args.pdf)

    print('reading %s' % os.path.basename(args.pdf), file=sys.stderr)
    obj = load_objects(args.pdf)
    pages = page_objects(obj)
    print('  %d objects, %d pages' % (len(obj), len(pages)), file=sys.stderr)

    # Find the chart by its title rather than by page number, so a JPPT revision that moves it
    # needs no edit here. The title also appears in the table of contents, so take the
    # candidate that actually draws something -- the figure is a few hundred paths, the
    # contents entry is a dozen.
    target = None
    for idx, pnum in enumerate(pages, 1):
        buf = page_content(obj, pnum)
        paths, runs = interpret(buf)
        text = ''.join(r.text for r in runs)
        if TITLE.replace(' ', '') not in text.replace(' ', ''):
            continue
        print('  candidate: page %d (obj %d), %d paths' % (idx, pnum, len(paths)),
              file=sys.stderr)
        if target is None or len(paths) > len(target[2]):
            target = (idx, pnum, paths, runs)
    if not target:
        sys.exit('could not find a page titled %r' % TITLE)
    if len(target[2]) < 50:
        sys.exit('found %r on page %d but it draws only %d paths -- that is the contents '
                 'entry, not the figure' % (TITLE, target[0], len(target[2])))

    idx, pnum, paths, runs = target
    print('  chart on physical page %d (obj %d): %d paths, %d text runs'
          % (idx, pnum, len(paths), len(runs)), file=sys.stderr)

    nodes_raw, arrows, connectors, other = classify(paths)
    print('  %d node shapes, %d arrowheads, %d connectors, %d other'
          % (len(nodes_raw), len(arrows), len(connectors), len(other)), file=sys.stderr)

    labelled, leftover = attach_labels(nodes_raw, runs)
    mapping, pairs = derive_categories(labelled, leftover)
    print('  legend: %d of 8 categories keyed' % len(pairs), file=sys.stderr)
    for text, kind, key in sorted(pairs, key=lambda p: p[0]):
        print('    %-16s %-10s lw %.3f -> %s'
              % (text, key['shape'], key['path'].lw, kind), file=sys.stderr)

    legend = []
    for text, kind, key in pairs:
        legend.append({'kind': kind, 'label': text, 'shape': key['shape'],
                       'bbox': key['path'].bbox})

    known = syllabus_event_ids()
    kind_for = category_mapper(mapping, pairs, labelled)
    nodes, jump_seen, tally, missing = [], {}, {}, []
    for n in labelled:
        if not n['label']:
            continue                                    # a legend key, handled above
        kind = kind_for(n['shape'], n['path'].lw)
        if kind is None:
            print('  WARNING: %s (%s, lw %.3f) matches no legend key'
                  % (n['label'], n['shape'], n['path'].lw), file=sys.stderr)
            kind = 'other'
        tally[kind] = tally.get(kind, 0) + 1
        rec = {'label': n['label'], 'kind': kind, 'bbox': n['path'].bbox}
        if kind == 'jump':
            letter = n['label']
            jump_seen[letter] = jump_seen.get(letter, 0) + 1
            rec['id'] = 'jump-%s-%d' % (letter, jump_seen[letter])
            rec['letter'] = letter
        else:
            rec['id'] = n['label']
            events = expand(n['label'])
            if not events:
                print('  WARNING: cannot expand label %r' % n['label'], file=sys.stderr)
            rec['events'] = events
            if events:
                rec['block'] = block_of(events[0])
            if known is not None:
                for e in events:
                    if e not in known:
                        missing.append((n['label'], e))
        nodes.append(rec)

    print('  %d labelled boxes: %s' % (
        len(nodes), ', '.join('%s %d' % (k, v) for k, v in sorted(tally.items()))),
        file=sys.stderr)
    print('  jump letters: %s' % ', '.join('%s x%d' % kv for kv in sorted(jump_seen.items())),
          file=sys.stderr)

    if missing:
        print('  WARNING: %d event id(s) not in SYLLABUS.js:' % len(missing), file=sys.stderr)
        for label, e in missing:
            print('    %s -> %s' % (label, e), file=sys.stderr)
    elif known is not None:
        total = sum(len(n.get('events') or []) for n in nodes)
        print('  cross-check: all %d expanded event ids exist in SYLLABUS.js' % total,
              file=sys.stderr)

    edges, unresolved = resolve_edges(nodes, connectors, arrows)
    print('  %d edges resolved, %d unresolved' % (len(edges), len(unresolved)), file=sys.stderr)
    for r, src, dst in unresolved:
        print('  WARNING: unresolved connector %s -> %s  %s' % (
            src, dst, ' '.join('(%.1f,%.1f)' % p for p in r['pts'])), file=sys.stderr)

    # A jump circle is an entrance or an exit depending on which way its arrows run. Derived,
    # not asserted: which circles pair with which is the publication's business, and this file
    # makes no claim about it beyond the shared letter.
    for n in nodes:
        if n['kind'] != 'jump':
            continue
        incoming = any(e['to'] == n['id'] for e in edges)
        outgoing = any(e['from'] == n['id'] for e in edges)
        n['role'] = ('entrance' if incoming and not outgoing else
                     'exit' if outgoing and not incoming else 'both')

    xs = [n['bbox'][0] for n in nodes] + [k['bbox'][0] for k in legend]
    ys = [n['bbox'][1] for n in nodes] + [k['bbox'][1] for k in legend]
    x1 = [n['bbox'][0] + n['bbox'][2] for n in nodes] + [k['bbox'][0] + k['bbox'][2] for k in legend]
    y1 = [n['bbox'][1] + n['bbox'][3] for n in nodes] + [k['bbox'][1] + k['bbox'][3] for k in legend]
    for e in edges:
        for px, py in e['points']:
            xs.append(px); x1.append(px); ys.append(py); y1.append(py)
    pad = 4.0
    vx, vy2 = min(xs) - pad, max(y1) + pad
    vw = (max(x1) + pad) - vx
    vh = vy2 - (min(ys) - pad)
    viewbox = '%s %s %s %s' % (num(vx), num(PAGE_HEIGHT - vy2), num(vw), num(vh))
    print('  viewBox %s' % viewbox, file=sys.stderr)

    source = 'CNATRAINST 1542.166D (15 Jul 2024) p. I-3, "T-6B JPPT COMPLETE COURSE FLOW"'
    out = render(nodes, legend, edges, viewbox, source)

    if args.dry_run:
        sys.stdout.write(out)
    else:
        with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(out)
        print('wrote %s (%d nodes, %d legend keys, %d edges)'
              % (os.path.relpath(OUT, ROOT), len(nodes), len(legend), len(edges)),
              file=sys.stderr)


if __name__ == '__main__':
    main()
