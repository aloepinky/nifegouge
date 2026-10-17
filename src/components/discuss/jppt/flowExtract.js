// Trace a JPPT's course-flow chart out of its page content streams.
//
// A line-for-line port of tools/extract-jppt-flow.py, which remains the tool that regenerates
// Delta's FLOW.js; read that file for why each pass is the way it is. jppt.test.js runs both on
// the Delta JPPT and requires this one to reproduce FLOW.js exactly, so the two cannot drift
// without a failing test. Keep the order of every loop and every tie-break identical to the
// Python: the output depends on them.
//
// Input is each page's decoded content stream as a byte string (see pdfSource.js). Output is
// the FLOW.js shape — { VIEWBOX, NODES, LEGEND, EDGES } — plus `warnings` for the flow editor.

// What the figure is called. A publication titles its chart what it likes, so these are tried
// in order and the first that matches any page wins: Delta and Echo print "COMPLETE COURSE
// FLOW", the T-44C Advanced syllabus "T-44C CORE COURSE FLOW", and the T-44C E-2D one
// "INTERMEDIATE E-2D MPTS COURSE FLOW". The loose title is last because both of the T-44C
// Advanced chart pages carry it and only the specific titles tell them apart.
const TITLES = ['COMPLETE COURSE FLOW', 'CORE COURSE FLOW', 'COURSE FLOW'];
// A syllabus flown by several communities prints a chart per community after the point they
// part company. The T-44C Advanced syllabus's is "T-44C POST - I4601 COURSE FLOW"; the dash
// between the two words is the publication's, so match on the two words alone.
const POST_TITLE = ['POST', 'COURSE FLOW'];
const PAGE_HEIGHT = 792.0;

const EDGE_SNAP = 6.0;
const ARROW_SNAP = 8.0;
const JUNCTION_SNAP = 1.5;
const ARROWHEAD_MAX = 9.0;

// Python's `bytes` \s, spelled out: JS \s also matches 0xA0 and would eat a byte Python keeps.
const WS = ' \\t\\n\\r\\f\\v';
// Python's str.isspace() over the latin-1 range, for .strip() and re.sub(r'\s+') on text. The
// control characters are the point, hence the lint exemptions.
/* eslint-disable no-control-regex */
const PY_SPACE = /[ \t\n\r\x0b\x0c\x1c-\x1f\x85\xa0]+/g;
const pyStrip = (s) => s.replace(/^[ \t\n\r\x0b\x0c\x1c-\x1f\x85\xa0]+|[ \t\n\r\x0b\x0c\x1c-\x1f\x85\xa0]+$/g, '');
/* eslint-enable no-control-regex */

// ---------------------------------------------------------------------------------------
// Content stream tokenizer
// ---------------------------------------------------------------------------------------

const TOKEN = new RegExp(
  `([${WS}\\x00]+)`
  + '|(%[^\\r\\n]*)'
  + '|(<<)|(>>)'
  + `|(<[0-9A-Fa-f${WS}]*>)`
  + `|(\\/[^${WS}\\/\\[\\]<>(){}%]*)`
  + '|([+-]?(?:\\d+\\.?\\d*|\\.\\d+))'
  + '|(\\[)|(\\])'
  + '|([{}])'
  + '|([A-Za-z\'"*][A-Za-z0-9\'"*]*)',
  'y'
);
const GROUPS = ['ws', 'comment', 'dopen', 'dclose', 'hexstr', 'name', 'num', 'aopen', 'aclose', 'brace', 'op'];

const isDigit = (c) => c >= '0' && c <= '9';

function scanString(buf, start) {
  let i = start;
  let depth = 0;
  let out = '';
  const map = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
  while (i < buf.length) {
    const c = buf[i];
    if (c === '\\') {
      const nxt = buf[i + 1];
      if (nxt !== undefined && map[nxt] !== undefined) {
        out += String.fromCharCode(map[nxt]);
        i += 2;
      } else if (nxt !== undefined && isDigit(nxt)) {
        let j = i + 1;
        let d = '';
        while (j < buf.length && isDigit(buf[j]) && d.length < 3) {
          d += buf[j];
          j += 1;
        }
        out += String.fromCharCode(parseInt(d, 8) & 0xff);
        i = j;
      } else if (nxt === '\n' || nxt === '\r') {
        i += 2;
      } else {
        out += nxt !== undefined ? nxt : '\\';
        i += 2;
      }
      continue;
    }
    if (c === '(') {
      depth += 1;
      if (depth > 1) out += '(';
      i += 1;
      continue;
    }
    if (c === ')') {
      depth -= 1;
      i += 1;
      if (depth === 0) return [out, i];
      out += ')';
      continue;
    }
    out += c;
    i += 1;
  }
  return [out, i];
}

function* tokenize(buf) {
  let i = 0;
  const n = buf.length;
  while (i < n) {
    if (buf[i] === '(') {
      const [s, next] = scanString(buf, i);
      i = next;
      yield ['str', s];
      continue;
    }
    TOKEN.lastIndex = i;
    const m = TOKEN.exec(buf);
    if (!m) {
      i += 1;
      continue;
    }
    i = TOKEN.lastIndex;
    let kind = null;
    for (let g = 0; g < GROUPS.length; g += 1) {
      if (m[g + 1] !== undefined) {
        kind = GROUPS[g];
        break;
      }
    }
    const tok = m[0];
    if (kind === 'ws' || kind === 'comment') continue;
    if (kind === 'num') {
      const v = parseFloat(tok);
      if (!Number.isNaN(v)) yield ['num', v];
    } else if (kind === 'name') {
      yield ['name', tok.slice(1)];
    } else if (kind === 'hexstr') {
      let h = tok.slice(1, -1).replace(/[ \t\n\r\f\v]/g, '');
      if (h.length % 2) h += '0';
      let s = '';
      for (let k = 0; k < h.length; k += 2) s += String.fromCharCode(parseInt(h.slice(k, k + 2), 16));
      yield ['str', s];
    } else if (['aopen', 'aclose', 'dopen', 'dclose', 'brace'].includes(kind)) {
      yield ['punct', tok];
    } else {
      yield ['op', tok];
    }
  }
}

// ---------------------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------------------

const IDENTITY = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

function mul(m, n) {
  const [a1, b1, c1, d1, e1, f1] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ];
}

function apply(m, x, y) {
  const [a, b, c, d, e, f] = m;
  return [a * x + c * y + e, b * x + d * y + f];
}

function scaleOf(m) {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1.0;
}

const PAINT_OPS = new Set(['S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'n']);
const FILL_OPS = new Set(['f', 'F', 'f*', 'B', 'B*', 'b', 'b*']);
const STROKE_OPS = new Set(['S', 's', 'B', 'B*', 'b', 'b*']);

function newPath() {
  return { ops: [], pts: [], paint: null, clip: false, lw: 0.0, dashed: false, order: 0 };
}

const sigOf = (p) => p.ops.join(' ');

export function bboxOf(p) {
  const xs = p.pts.map((q) => q[0]);
  const ys = p.pts.map((q) => q[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return [minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY];
}

const TEXT_OPS = new Set(['Tj', 'TJ', "'", '"']);

function interpret(buf) {
  let ctm = IDENTITY;
  let lw = 1.0;
  // Whether the current dash pattern draws a broken line: a legend keys its optional flow to one.
  let dashed = false;
  const stack = [];
  const paths = [];
  const runs = [];
  let cur = newPath();
  let pendingClip = false;
  let tm = IDENTITY;
  let tlm = IDENTITY;
  let leading = 0.0;
  let operands = [];
  let order = 0;

  const flush = (paint) => {
    if (cur.pts.length) {
      cur.paint = paint;
      cur.clip = pendingClip;
      cur.lw = lw * scaleOf(ctm);
      cur.dashed = dashed;
      cur.order = order;
      order += 1;
      paths.push(cur);
    }
    cur = newPath();
    pendingClip = false;
  };

  const nums = (k) => {
    const vals = operands.filter((o) => typeof o === 'number');
    return vals.length >= k ? vals.slice(vals.length - k) : null;
  };

  for (const [kind, tok] of tokenize(buf)) {
    if (kind === 'num') {
      operands.push(tok);
      continue;
    }
    if (kind === 'str') {
      operands.push({ str: tok });
      continue;
    }
    if (kind === 'name' || kind === 'punct') {
      operands.push({ other: tok });
      continue;
    }
    const op = tok;

    if (op === 'q') {
      stack.push([ctm, lw, dashed]);
    } else if (op === 'Q') {
      if (stack.length) [ctm, lw, dashed] = stack.pop();
    } else if (op === 'cm') {
      const v = nums(6);
      if (v) ctm = mul(v, ctm);
    } else if (op === 'w') {
      const v = nums(1);
      if (v) lw = v[0];
    } else if (op === 'd') {
      // `[3.96 2.83] 0 d` dashes, `[] 0 d` is solid: the last number is the phase.
      const vals = operands.filter((o) => typeof o === 'number');
      dashed = vals.slice(0, -1).some((v) => v > 0);
    } else if (op === 'm' || op === 'l') {
      const v = nums(2);
      if (v) {
        cur.ops.push(op);
        cur.pts.push(apply(ctm, v[0], v[1]));
      }
    } else if (op === 'c' || op === 'v' || op === 'y') {
      const v = nums(op === 'c' ? 6 : 4);
      if (v) {
        cur.ops.push('c');
        cur.pts.push(apply(ctm, v[v.length - 2], v[v.length - 1]));
      }
    } else if (op === 're') {
      const v = nums(4);
      if (v) {
        const [x, y, w, h] = v;
        cur.ops.push('re');
        const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        for (let k = 0; k < corners.length; k += 1) cur.pts.push(apply(ctm, corners[k][0], corners[k][1]));
      }
    } else if (op === 'h') {
      cur.ops.push('h');
    } else if (op === 'W' || op === 'W*') {
      pendingClip = true;
    } else if (PAINT_OPS.has(op)) {
      flush(op);
    } else if (op === 'BT') {
      tm = IDENTITY;
      tlm = IDENTITY;
    } else if (op === 'Tm') {
      const v = nums(6);
      if (v) {
        tm = v;
        tlm = v;
      }
    } else if (op === 'Td' || op === 'TD') {
      const v = nums(2);
      if (v) {
        if (op === 'TD') leading = -v[1];
        tlm = mul([1.0, 0.0, 0.0, 1.0, v[0], v[1]], tlm);
        tm = tlm;
      }
    } else if (op === 'TL') {
      const v = nums(1);
      if (v) leading = v[0];
    } else if (op === 'T*') {
      tlm = mul([1.0, 0.0, 0.0, 1.0, 0.0, -leading], tlm);
      tm = tlm;
    } else if (TEXT_OPS.has(op)) {
      if (op === "'" || op === '"') {
        tlm = mul([1.0, 0.0, 0.0, 1.0, 0.0, -leading], tlm);
        tm = tlm;
      }
      const parts = [];
      if (op === 'TJ') {
        operands.forEach((o) => { if (o && o.str !== undefined) parts.push(o.str); });
      } else {
        for (let k = operands.length - 1; k >= 0; k -= 1) {
          if (operands[k] && operands[k].str !== undefined) {
            parts.push(operands[k].str);
            break;
          }
        }
      }
      const text = parts.join('');
      if (pyStrip(text)) {
        const m = mul(tm, ctm);
        const [ox, oy] = apply(m, 0.0, 0.0);
        // `turned` is text set down the page rather than across it. Nothing the Python port
        // does reads it; it is here for the band splitting below, which the Python has no
        // need of. Every other field is as it was.
        runs.push({
          x: ox, y: oy, text, order, turned: Math.abs(m[1]) > Math.abs(m[0]),
        });
        order += 1;
      }
    }

    operands = [];
  }

  return [paths, runs];
}

// ---------------------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------------------

const SHAPE_SIG = {
  'm l c l c l c l c h': 'roundrect',
  re: 'rect',
  'm c c c c h': 'ellipse',
  'm l l l l l l h': 'hex6',
  'm l l l l l l l l h': 'oct8',
  // The START and END capsules of the TH-73A's charts: a stadium, two straight sides and two
  // half-circles, which the figure draws in the flow like a box.
  'm l c c l c c h': 'capsule',
};

// `s` and `b` close the subpath before painting it — they are `h S` and `h B` written as one
// operator — so a writer using them leaves the `h` out and the shape matches no signature.
// Put it back. The Delta and Echo JPPTs stroke with `S` and write their own `h`; the T-44C
// syllabi close with `s`, and without this every ellipse, rounded box and hexagon on their
// charts is dropped.
const CLOSING_PAINT = new Set(['s', 'b', 'b*']);

function shapeOf(path) {
  const sig = sigOf(path);
  let name = SHAPE_SIG[sig]
    || (CLOSING_PAINT.has(path.paint) ? SHAPE_SIG[`${sig} h`] : undefined);
  // A box drawn as four straight lines back to its first point, which the TH-73A's charts do
  // for one box per sheet.
  if (!name && /^m l l l l( h)?$/.test(sig) && path.pts.length === 5 && dist(path.pts[0], path.pts[4]) < 0.1) name = 'rect';
  if (!name) return null;
  if (name === 'ellipse') {
    const [, , w, h] = bboxOf(path);
    if (w < 25 && h < 25) return 'circle';
  }
  return name;
}

// A key drawn as a filled ring rather than a stroked outline: the TH-73A legends' Self Study
// octagon is the outline's fill, nested octagons in one MCG and one long seam-joined subpath
// in another. Neither matches a stroked signature, so the shape is read off the fill's convex
// hull (its vertex count, and whether the outline is curved) and the ring's thickness, the
// hull's inset to the points inside it, stands in for the stroke weight.
function hullOf(ptsIn) {
  const pts = [...ptsIn].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    list.forEach((q) => {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    });
    return out;
  };
  const lower = half(pts);
  const upper = half([...pts].reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function ringOf(p) {
  if (p.pts.length < 12) return null;
  const hull = hullOf(p.pts);
  // Vertices a hair apart, or on a straight run, are one corner.
  const corners = hull.filter((q, i) => {
    const a = hull[(i + hull.length - 1) % hull.length];
    const b = hull[(i + 1) % hull.length];
    if (dist(a, q) < 0.3) return false;
    const turn = (q[0] - a[0]) * (b[1] - q[1]) - (q[1] - a[1]) * (b[0] - q[0]);
    return Math.abs(turn) > 0.2 * dist(a, q) * dist(q, b);
  });
  const curved = p.ops.includes('c');
  const shape = curved
    ? ({ 4: 'ellipse', 8: 'roundrect' })[corners.length]
    : ({ 4: 'rect', 6: 'hex6', 8: 'oct8' })[corners.length];
  if (!shape) return null;
  // The points the hull does not pass through are the ring's inner edge.
  const inner = p.pts.filter((q) => !hull.some((h) => dist(h, q) < 0.05));
  if (inner.length < 3) return null;
  const [, , ow] = bboxOf(p);
  const [, , iw] = bboxOf({ pts: inner });
  return { shape, lw: (ow - iw) / 2 };
}

export function classify(paths) {
  const nodes = [];
  const arrows = [];
  const connectors = [];
  const other = [];
  paths.forEach((p) => {
    if (p.clip || p.paint === 'n') return;
    const [, , w, h] = bboxOf(p);
    if (FILL_OPS.has(p.paint) && Math.max(w, h) <= ARROWHEAD_MAX) {
      arrows.push(p);
      return;
    }
    if (FILL_OPS.has(p.paint)) {
      const ring = ringOf(p);
      if (ring && w >= 10.0 && w <= 60.0 && h >= 9.5 && h <= 25.0) {
        nodes.push([{ ...p, lw: ring.lw }, ring.shape]);
        return;
      }
    }
    if (STROKE_OPS.has(p.paint)) {
      const shape = shapeOf(p);
      if (shape && w >= 10.0 && w <= 60.0 && h >= 9.5 && h <= 25.0) {
        nodes.push([p, shape]);
        return;
      }
      if (p.ops.every((o) => o === 'm' || o === 'l') && p.pts.length >= 2) {
        connectors.push(p);
        return;
      }
      // A connector that hops over another with a little arc: the arc's two ends sit on the
      // line and its midpoint off it. Flatten the hop and keep the line. A closed one (`h`) is
      // a box drawn with a seam in its outline, which `promoteBoxes` reads by the id inside it.
      if (p.ops.every((o) => o === 'm' || o === 'l' || o === 'c' || o === 'h') && p.ops.includes('l') && p.pts.length >= 3) {
        const pts = straighten(p.pts);
        if (pts.length >= 2) {
          connectors.push({ ...p, pts });
          return;
        }
      }
    }
    other.push(p);
  });
  return [nodes, arrows, connectors, other];
}

// Drop the off-axis midpoint of every hop, then any point collinear with its neighbours.
function straighten(ptsIn) {
  const same = (u, v) => Math.abs(u - v) <= 0.6;
  let pts = ptsIn.filter((p, i) => {
    if (i === 0 || i === ptsIn.length - 1) return true;
    const [a, b] = [ptsIn[i - 1], ptsIn[i + 1]];
    const axis = same(a[0], b[0]) ? 0 : same(a[1], b[1]) ? 1 : -1;
    return axis === -1 || same(p[axis], a[axis]);
  });
  pts = pts.filter((p, i) => {
    if (i === 0 || i === pts.length - 1) return true;
    const [a, b] = [pts[i - 1], pts[i + 1]];
    return !((same(a[0], p[0]) && same(p[0], b[0])) || (same(a[1], p[1]) && same(p[1], b[1])));
  });
  return pts;
}

const BANDS = ['thin', 'mid', 'thick'];

function keyOf(shape, lw) {
  let band;
  if (lw < 0.72) band = 'thin';
  else if (lw < 1.05) band = 'mid';
  else band = 'thick';
  return `${shape}|${band}`;
}

// ---------------------------------------------------------------------------------------
// Labels, legend, categories
// ---------------------------------------------------------------------------------------

// Every caption a legend has been seen to print, and the kind it keys. A publication spells
// these its own way — the T-6B JPPTs write "Flt Support" where the T-44C ones write "Flight
// Support" — and a caption not listed here is not read as a legend caption at all, so the
// shapes it keys fall through to `categoryMapper`'s ordering. Add the spelling rather than
// leave a chart to guess.
//
// "Alternate Flow" is deliberately absent: the T-44C legends key it to a dashed LINE, not to
// a box, so there is no shape for it to name.
const CATEGORY_SLUG = {
  Flight: 'flight',
  'Check Flight': 'check',
  Simulator: 'sim',
  'Simulator Check': 'simcheck',
  'Check Sim': 'simcheck',
  'Ground Training': 'ground',
  'CAI Test': 'cai',
  'Flt Support': 'support',
  'Flight Support': 'support',
  'P/P Exam': 'exam',
  'Flow Connector': 'jump',
  // The TH-73A's MCGs key their legend inside the shapes: a thin octagon is a CAI lesson and
  // a thick one an exam; Self Study is a thin octagon too, so a box on the chart can only ever
  // read as CAI (the upper of the two in the legend); MIL is the thin hexagon Delta keys as
  // Flt Support.
  'Ground Trng': 'ground',
  CAI: 'lesson',
  Exam: 'test',
  'Self Study': 'study',
  MIL: 'support',
};

// Captions keyed to something other than a box: a dashed line for the optional flow, and a
// filled capsule for the START and END markers. Neither keys a box category, but both are
// part of the legend the publication prints, and are drawn in the chart's legend as such.
const SAMPLE_SLUG = {
  'Opt Flow': 'opt',
  'Alternate Flow': 'opt',
  'Start / End': 'terminal',
  'Start/End': 'terminal',
};

// The same, with the spaces taken out and folded to lower case, which is the shape a label
// reaches us in: `attachLabels` joins a box's text runs without spaces.
const CAPTION_INSIDE = {};
Object.keys(CATEGORY_SLUG).forEach((text) => {
  CAPTION_INSIDE[text.replace(/ /g, '').toLowerCase()] = text;
});

function inside(bbox, x, y, pad = 0.0) {
  const [bx, by, bw, bh] = bbox;
  return bx - pad <= x && x <= bx + bw + pad && by - pad <= y && y <= by + bh + pad;
}

export function attachLabels(nodes, runs) {
  const labelled = [];
  const used = new Set();
  nodes.forEach(([path, shape]) => {
    const bbox = bboxOf(path);
    const mine = [];
    runs.forEach((r, i) => {
      if (!used.has(i) && inside(bbox, r.x, r.y)) mine.push(i);
    });
    mine.forEach((i) => used.add(i));
    mine.sort((a, b) => runs[a].order - runs[b].order);
    const label = mine.map((i) => runs[i].text).join('').replace(PY_SPACE, '');
    labelled.push({ path, shape, label });
  });
  const leftover = runs.filter((r, i) => !used.has(i));
  return [labelled, leftover];
}

// `samples` are the paths that are not boxes (the connectors and everything else drawn),
// among which a caption of SAMPLE_SLUG finds its key. The third value returned lists the
// samples taken as keys, so the caller can keep them out of the chart's connectors.
export function deriveCategories(labelled, leftover, warn, samples = []) {
  const captions = [];
  const used = new Set();
  const has = (o, t) => Object.prototype.hasOwnProperty.call(o, t);
  const isCaption = (t) => has(CATEGORY_SLUG, t) || has(SAMPLE_SLUG, t);
  leftover.forEach((r, i) => {
    const t = pyStrip(r.text);
    if (isCaption(t)) {
      captions.push([r.y, t, r.x]);
      used.add(i);
    }
  });
  // A caption printed on two lines ("Flow" over "Connector"): the run directly beneath,
  // left-aligned with it.
  leftover.forEach((r, i) => {
    if (used.has(i)) return;
    leftover.forEach((q, j) => {
      if (j === i || used.has(j) || used.has(i)) return;
      // Left-aligned within a hair, or centred one over the other (the TH-73A's "Flow" over
      // "Connector"); only a pair that reads as a known caption is taken either way.
      if (Math.abs(q.x - r.x) > 12.0 || r.y - q.y <= 0 || r.y - q.y > 12.0) return;
      const t = pyStrip(`${pyStrip(r.text)} ${pyStrip(q.text)}`.replace(PY_SPACE, ' '));
      if (!isCaption(t)) return;
      // The two lines are kept, so the legend can print the caption as the publication did.
      captions.push([(r.y + q.y) / 2.0, t, Math.min(r.x, q.x), [pyStrip(r.text), pyStrip(q.text)]]);
      used.add(i);
      used.add(j);
    });
  });
  const keys = labelled.filter((n) => !n.label);
  const mapping = {};
  const pairs = [];
  const taken = [];

  // A legend may print its caption INSIDE the key instead of beside it — the T-44C E-2D chart
  // does, while Delta and the T-44C Advanced chart set theirs alongside. Such a key arrives as
  // an ordinary labelled box, so it is keyed here and flagged, because it is a legend entry
  // and must not also be drawn as a box of the chart.
  labelled.forEach((n) => {
    if (!n.label) return;
    const text = CAPTION_INSIDE[n.label.toLowerCase()];
    if (!text) return;
    n.isLegendKey = true;
    n.captionInside = true;
    const kind = CATEGORY_SLUG[text];
    mapping[keyOf(n.shape, n.path.lw)] = kind;
    pairs.push([text, kind, n]);
  });

  captions.forEach(([y, text, x, lines]) => {
    let best = null;
    let bestd = 1e9;
    if (has(SAMPLE_SLUG, text)) {
      const kind = SAMPLE_SLUG[text];
      // The optional-flow key is a short dashed line; the START/END key a filled capsule
      // (curved, which tells it from the white rectangle printed behind a caption).
      const wanted = kind === 'opt'
        ? (p) => p.dashed && STROKE_OPS.has(p.paint) && p.pts.length === 2
        : (p) => FILL_OPS.has(p.paint) && p.ops.includes('c') && bboxOf(p)[2] >= 10.0 && bboxOf(p)[3] >= 6.0;
      samples.forEach((p) => {
        if (!wanted(p)) return;
        const [kx, ky, , kh] = bboxOf(p);
        const d = Math.abs((ky + kh / 2.0) - y);
        if (kx > x || d >= bestd) return;
        best = p;
        bestd = d;
      });
      if (best === null || bestd > 12.0) {
        warn(`Legend caption "${text}" found no key shape.`);
        return;
      }
      const bb = bboxOf(best);
      // The key and anything drawn over it (a capsule is filled, then stroked).
      samples.forEach((p) => {
        const pb = bboxOf(p);
        if (pb.every((v, k) => Math.abs(v - bb[k]) <= 0.5)) taken.push(p);
      });
      pairs.push([text, kind, { path: best, shape: kind === 'opt' ? 'line' : 'capsule' }, lines]);
      return;
    }
    // The Flow Connector key is a circle with a letter in it on the TH-73A's charts, so for
    // that caption a lettered circle is a key too.
    const pool = text === 'Flow Connector' ? labelled.filter((n) => !n.label || /^[A-Z]$/.test(n.label)) : keys;
    // The key is the shape on the caption's row immediately to its left: nearest by the gap to
    // the caption, then by height. The Tilt-Rotor MCG's chart connectors B and D share the
    // legend circle's row, and B's height is the nearer, so height alone picks the wrong one.
    let bestGap = 1e9;
    pool.forEach((k) => {
      const [kx, ky, kw, kh] = bboxOf(k.path);
      const d = Math.abs((ky + kh / 2.0) - y);
      if (kx > x || d > 12.0) return;
      const gap = x - (kx + kw);
      if (gap < bestGap - 2.0 || (Math.abs(gap - bestGap) <= 2.0 && d < bestd)) {
        best = k;
        bestd = d;
        bestGap = gap;
      }
    });
    if (best === null) {
      warn(`Legend caption "${text}" found no key shape.`);
      return;
    }
    const kind = CATEGORY_SLUG[text];
    if (best.label) {
      best.isLegendKey = true;
      // A lettered circle keeps its letter, which the legend prints inside it.
      if (/^[A-Z]$/.test(best.label)) best.letter = best.label;
    }
    mapping[keyOf(best.shape, best.path.lw)] = kind;
    pairs.push([text, kind, best, lines]);
  });
  return [mapping, pairs, taken];
}

// The kind of a chart box, from the legend. A box whose shape and stroke weight the legend
// draws is that caption. Where the legend is no help — it draws two captions of one shape
// with the same weight (Echo's Ground Training and P/P Exam are both thin), or the chart uses
// a weight the legend never draws — the shape's captions are taken in legend order, top to
// bottom, and the chart's weights for that shape in order, thin to thick: the publication
// lists the lighter stroke first.
export function categoryMapper(mapping, pairs, labelled, warn) {
  const byShape = {};
  pairs.forEach(([text, kind, key]) => {
    const [, ky, , kh] = bboxOf(key.path);
    (byShape[key.shape] = byShape[key.shape] || []).push({
      text, kind, y: ky + kh / 2.0, key: keyOf(key.shape, key.path.lw),
    });
  });
  Object.values(byShape).forEach((list) => list.sort((a, b) => b.y - a.y));
  const bandsOf = {};
  labelled.filter((n) => n.label).forEach((n) => {
    (bandsOf[n.shape] = bandsOf[n.shape] || new Set()).add(keyOf(n.shape, n.path.lw).split('|')[1]);
  });
  const ranked = {};
  return (shape, lw) => {
    const entries = byShape[shape] || [];
    if (!entries.length) return undefined;
    const direct = mapping[keyOf(shape, lw)];
    const distinct = new Set(entries.map((e) => e.key)).size === entries.length;
    if (distinct && direct !== undefined) return direct;
    if (entries.length === 1) return entries[0].kind;
    if (!ranked[shape]) {
      const bands = BANDS.filter((b) => (bandsOf[shape] || new Set()).has(b));
      ranked[shape] = {};
      // A caption whose shape and weight no other caption shares keys its own band outright,
      // and only the captions drawn alike (the TH-73A's CAI and Self Study, both the thin
      // octagon) are sorted into the bands left over, upper caption first.
      const bandOf = (e) => e.key.split('|')[1];
      const unique = entries.filter((e) => entries.filter((o) => o.key === e.key).length === 1);
      const shared = entries.filter((e) => !unique.includes(e));
      const free = shared.length ? bands.filter((b) => !unique.some((e) => bandOf(e) === b)) : bands;
      const pool = shared.length ? shared : entries;
      if (shared.length) unique.forEach((e) => { ranked[shape][bandOf(e)] = e.kind; });
      free.forEach((b, i) => { ranked[shape][b] = pool[Math.min(i, pool.length - 1)].kind; });
      const names = pool.map((e) => `"${e.text}"`).join(' and ');
      warn(`The legend does not tell ${names} apart by stroke weight; the chart's ${shape === 'ellipse' ? 'ellipses' : `${shape} boxes`} were sorted by weight, lightest first.`);
    }
    return ranked[shape][keyOf(shape, lw).split('|')[1]];
  };
}

// ---------------------------------------------------------------------------------------
// Label -> event ids
// ---------------------------------------------------------------------------------------

// A student letter may follow the range too: the TH-73A's charts print "NAV0101-2A".
const RANGE_RE = /^([A-Z]+)(\d+)([A-Z]?)(?:-(\d+)[A-Z]?)?$/;

// `FAM4301-4` -> the four events it covers. Also used by the flow editor's events field.
export function expand(label) {
  const m = RANGE_RE.exec(label);
  if (!m) return [];
  const [, prefix, digits, variant, end] = m;
  const base = prefix + digits + variant;
  if (!end) return [base];
  const k = end.length;
  if (k > digits.length) return [base];
  const head = digits.slice(0, digits.length - k);
  const start = parseInt(digits.slice(digits.length - k), 10);
  const stop = parseInt(end, 10);
  if (stop < start) return [base];
  const out = [];
  for (let i = start; i <= stop; i += 1) out.push(`${prefix}${head}${String(i).padStart(k, '0')}`);
  return out;
}

export function blockOf(eventId) {
  const m = /^([A-Z]+)(\d\d)/.exec(eventId);
  return m ? m[1] + m[2] : null;
}

// ---------------------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------------------

function edgeMidpoints(bbox) {
  const [x, y, w, h] = bbox;
  return [
    ['L', [x, y + h / 2.0]],
    ['R', [x + w, y + h / 2.0]],
    ['T', [x + w / 2.0, y + h]],
    ['B', [x + w / 2.0, y]],
  ];
}

function dist(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

function nearestNode(point, nodeMids, tol) {
  let best = null;
  let bestd = tol;
  nodeMids.forEach(([nid, mids]) => {
    mids.forEach(([side, m]) => {
      const d = dist(point, m);
      if (d <= bestd) {
        best = [nid, side];
        bestd = d;
      }
    });
  });
  return best;
}

// The point's right-angle projection onto the segment a-b.
function footOn(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const seg = dx * dx + dy * dy;
  if (seg < 1e-9) return [a[0], a[1]];
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / seg));
  return [a[0] + t * dx, a[1] + t * dy];
}

// The index of the segment of `pts` the point lies on, or -1.
function segmentOn(point, pts, tol) {
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const seg = Math.hypot(dx, dy);
    if (seg < 1e-6) continue;
    const t = ((point[0] - ax) * dx + (point[1] - ay) * dy) / (seg * seg);
    if (t < -0.02 || t > 1.02) continue;
    if (dist(point, [ax + t * dx, ay + t * dy]) <= tol) return i;
  }
  return -1;
}

function pointOnPath(point, pts, tol) {
  return segmentOn(point, pts, tol) !== -1;
}

// `headBases` (the bus reading only): a line end an arrowhead sits on is a head end, not a
// continuation, so two lines meeting there stay two lines. The Tilt-Rotor MCG runs two lines
// into one head on LND0201T's frame; chained, the head would sit mid-line and name nothing.
function chain(segsIn, nodeMids, headBases = null) {
  let segs = segsIn;
  let joins = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < segs.length; i += 1) {
      for (const ei of [0, -1]) {
        const pt = ei === 0 ? segs[i][0] : segs[i][segs[i].length - 1];
        if (nearestNode(pt, nodeMids, EDGE_SNAP)) continue;
        if (headBases && headBases.some((b) => dist(b, pt) <= HEAD_BASE_SNAP)) continue;
        const partners = [];
        for (let j = 0; j < segs.length; j += 1) {
          if (j === i) continue;
          for (const ej of [0, -1]) {
            const q = ej === 0 ? segs[j][0] : segs[j][segs[j].length - 1];
            if (dist(q, pt) <= JUNCTION_SNAP) partners.push([j, ej]);
          }
        }
        if (partners.length !== 1) continue;
        const [j, ej] = partners[0];
        const head = ei === -1 ? segs[i] : [...segs[i]].reverse();
        const tail = ej === 0 ? segs[j] : [...segs[j]].reverse();
        const merged = head.concat(tail.slice(1));
        segs = segs.filter((s, k) => k !== i && k !== j).concat([merged]);
        joins += 1;
        changed = true;
        break;
      }
      if (changed) break;
    }
  }
  return [segs, joins];
}

// A path that closes by drawing back to its first point records that point twice, which pulls
// the centroid towards it — far enough that a base corner of an arrowhead can sit farther from
// the centroid than its tip does, and the head is then read as pointing the other way. Delta
// and Echo write their heads `m l c h`, where `h` closes without repeating a point; the T-44C
// syllabi write `m l c l`, closing by hand. Dropping the repeat makes the two the same figure.
const ring = (pts) => (
  pts.length > 2
    && Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 0.01
    && Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 0.01
    ? pts.slice(0, -1)
    : pts
);

export function resolveEdges(nodes, connectors, arrows) {
  const nodeMids = nodes.map((n) => [n.id, edgeMidpoints(n.bbox)]);
  const headPts = arrows.map((a) => ring(a.pts));
  const heads = headPts.map((pts) => [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ]);
  // The arrowhead at an end, if one sits there: its apex, the vertex farthest from the
  // centroid, and which way it points. A head pointing on along the line's direction of
  // travel into this end is the arrow into the box there; one pointing back down the line is
  // the figure marking this end as the arrow's source (Delta draws FAM1204's that way).
  // The apex matters because a connector stops at the base of its head, and a long head
  // puts that base outside the snap tolerance while the apex touches the box.
  const headAt = (p, prev) => {
    const ux = p[0] - prev[0];
    const uy = p[1] - prev[1];
    const ulen = Math.hypot(ux, uy) || 1;
    let best = null;
    heads.forEach((c, i) => {
      const d = dist(c, p);
      if (d > ARROW_SNAP || (best && d >= best.d)) return;
      const pts = headPts[i];
      let apex = pts[0];
      pts.forEach((q) => { if (dist(q, c) > dist(apex, c)) apex = q; });
      const ax = apex[0] - c[0];
      const ay = apex[1] - c[1];
      const along = (ax * ux + ay * uy) / ((Math.hypot(ax, ay) || 1) * ulen);
      // A head square to the line is another connector's, passing close by: the spine's
      // arrow into PR0101-5 sits beside the start of SY0301's stub.
      if (Math.abs(along) < 0.7) return;
      best = { d, i, apex, incoming: along >= 0 };
    });
    return best;
  };

  const [segs] = chain(connectors.map((p) => [...p.pts]), nodeMids);

  const raw = segs.map((pts) => {
    const a = pts[0];
    const b = pts[pts.length - 1];
    const ha = headAt(a, pts[1]);
    const hb = headAt(b, pts[pts.length - 2]);
    let ra = nearestNode(a, nodeMids, EDGE_SNAP) || (ha && nearestNode(ha.apex, nodeMids, EDGE_SNAP)) || null;
    let rb = nearestNode(b, nodeMids, EDGE_SNAP) || (hb && nearestNode(hb.apex, nodeMids, EDGE_SNAP)) || null;
    // Two boxes drawn touching leave a connector a few points long between them, and both
    // of its ends snap to the nearer box. Give the ends different boxes, the closest pair.
    if (ra && rb && ra[0] === rb[0]) {
      let best = null;
      nodeMids.forEach(([na, midsA]) => midsA.forEach(([sa, ma]) => {
        const da = dist(a, ma);
        if (da > EDGE_SNAP) return;
        nodeMids.forEach(([nb, midsB]) => midsB.forEach(([sb, mb]) => {
          const db = dist(b, mb);
          if (nb === na || db > EDGE_SNAP) return;
          if (!best || da + db < best.d) best = { d: da + db, ra: [na, sa], rb: [nb, sb] };
        }));
      }));
      if (best) [ra, rb] = [best.ra, best.rb];
    }
    // One head within reach of both ends of a short connector belongs to the end it is nearer.
    let atA = ha;
    let atB = hb;
    if (ha && hb && ha.i === hb.i) {
      if (ha.d < hb.d) atB = null;
      else if (hb.d < ha.d) atA = null;
    }
    return {
      pts,
      a: ra,
      b: rb,
      headA: !!(atA && atA.incoming),
      headB: !!(atB && atB.incoming),
      outA: !!(atA && !atA.incoming),
      outB: !!(atB && !atB.incoming),
      apexA: atA ? atA.apex : null,
      apexB: atB ? atB.apex : null,
    };
  });

  // An end that hit no box may be glued to another connector. Follow the host to its own
  // node end; that is the real source.
  const hostSource = (idx, point, depth = 0) => {
    if (depth > 4) return null;
    for (let j = 0; j < raw.length; j += 1) {
      if (j === idx) continue;
      const other = raw[j];
      if (pointOnPath(point, other.pts, JUNCTION_SNAP)) {
        if (other.a && !other.headA) return other.a[0];
        if (other.b && !other.headB) return other.b[0];
        const tail = other.headB ? other.pts[0] : other.pts[other.pts.length - 1];
        return hostSource(j, tail, depth + 1);
      }
    }
    return null;
  };

  // The mirror image: an end that arrives on another connector joins it, and goes where it
  // goes. The host's remaining points come back too, so the edge runs all the way to its box
  // rather than stopping in the middle of a line.
  const hostTarget = (idx, point, depth = 0) => {
    if (depth > 4) return null;
    for (let j = 0; j < raw.length; j += 1) {
      if (j === idx) continue;
      const other = raw[j];
      const k = segmentOn(point, other.pts, JUNCTION_SNAP);
      if (k === -1) continue;
      if (!other.headA && !other.headB) return null;
      const forward = other.headB && !other.headA;
      const foot = footOn(point, other.pts[k], other.pts[k + 1]);
      const rest = [foot].concat(forward ? other.pts.slice(k + 1) : other.pts.slice(0, k + 1).reverse());
      const end = forward ? other.b : other.a;
      if (end) return { id: end[0], side: end[1], tail: rest };
      const onward = hostTarget(j, rest[rest.length - 1], depth + 1);
      return onward ? { id: onward.id, side: onward.side, tail: rest.concat(onward.tail) } : null;
    }
    return null;
  };

  // The figure stops a line at the base of its arrowhead, and a little short of the box it
  // leaves. The rendered arrow is a line with its head at the line's end, so the line has to
  // run to the box: move the end onto the side it snapped to, along the line's own axis, the
  // way the editor draws an arrow between two boxes. Every arrow into one side then ends at
  // the same point and draws one head.
  const bboxOfNode = Object.fromEntries(nodes.map((n) => [n.id, n.bbox]));
  const onSide = (pt, id, side) => {
    const [x, y, w, h] = bboxOfNode[id];
    if (side === 'L') return [x, pt[1]];
    if (side === 'R') return [x + w, pt[1]];
    if (side === 'T') return [pt[0], y + h];
    return [pt[0], y];
  };

  const edges = [];
  const unresolved = [];
  raw.forEach((r, i) => {
    const { pts } = r;
    let aId = r.a ? r.a[0] : null;
    let bId = r.b ? r.b[0] : null;

    let src;
    let dst;
    let order;
    let srcSide = null;
    let dstSide = null;
    if (r.headA || r.headB || r.outA || r.outB) {
      const forward = r.headB && !r.headA ? true : r.headA ? false : r.outA;
      const start = forward ? pts[0] : pts[pts.length - 1];
      const end = forward ? pts[pts.length - 1] : pts[0];
      const endApex = forward ? r.apexB : r.apexA;
      src = forward ? aId : bId;
      dst = forward ? bId : aId;
      srcSide = (forward ? r.a : r.b) ? (forward ? r.a : r.b)[1] : null;
      dstSide = (forward ? r.b : r.a) ? (forward ? r.b : r.a)[1] : null;
      order = forward ? [...pts] : [...pts].reverse();
      if (src === null) src = hostSource(i, start);
      // A stub too short to clear its own box snaps both ends to it (Delta's FAM1204 is
      // 3.5 pt long); the arrow leaves the box, so its far end is wherever it joins.
      if (dst !== null && dst === src) {
        dst = null;
        dstSide = null;
      }
      if (dst === null) {
        const joined = hostTarget(i, end) || (endApex && hostTarget(i, endApex));
        if (joined) {
          dst = joined.id;
          dstSide = joined.side;
          order = order.concat(joined.tail);
        }
      }
    } else {
      // No head at either end. A stub from a box to another connector is that box joining
      // the connector's flow: an arrow *into* the box would carry its own head. Only when
      // the joined connector goes nowhere does the older reading apply, where the stub is a
      // branch off a trunk and the trunk's source is its source.
      if ((aId === null) !== (bId === null)) {
        const boxEnd = aId ? aId : bId;
        const free = aId ? pts[pts.length - 1] : pts[0];
        const joined = hostTarget(i, free);
        if (joined && joined.id !== boxEnd) {
          src = boxEnd;
          srcSide = (aId ? r.a : r.b)[1];
          dst = joined.id;
          dstSide = joined.side;
          order = (aId ? [...pts] : [...pts].reverse()).concat(joined.tail);
        }
      } else if (aId === null && bId === null) {
        // Neither end on a box: a line that leaves one connector and arrives on another,
        // carrying the first's source to the second's destination. FAM2101-5's branch to
        // FAM6101-2 in Echo turns into a stub that already carries the head.
        const tryWay = (from, to, reversed) => {
          const s0 = hostSource(i, from);
          const t0 = s0 ? hostTarget(i, to) : null;
          if (!s0 || !t0 || t0.id === s0) return false;
          src = s0;
          dst = t0.id;
          dstSide = t0.side;
          order = (reversed ? [...pts].reverse() : [...pts]).concat(t0.tail);
          return true;
        };
        if (!tryWay(pts[0], pts[pts.length - 1], false)) tryWay(pts[pts.length - 1], pts[0], true);
      }
    }
    if (src === undefined) {
      const snappedA = r.a;
      const snappedB = r.b;
      if (aId === null) aId = hostSource(i, pts[0]);
      if (bId === null) bId = hostSource(i, pts[pts.length - 1]);
      if (bId && !aId) {
        src = aId;
        dst = bId;
        srcSide = snappedA ? snappedA[1] : null;
        dstSide = snappedB ? snappedB[1] : null;
        order = [...pts];
      } else {
        src = bId;
        dst = aId;
        srcSide = snappedB ? snappedB[1] : null;
        dstSide = snappedA ? snappedA[1] : null;
        order = [...pts].reverse();
      }
    }
    if (!src || !dst || src === dst) {
      unresolved.push([r, src, dst]);
      return;
    }
    // Moving an end onto its box side is a straight extension only when the segment beside it
    // runs INTO that side. Where it runs across — the line passes the box and turns to meet it
    // — moving the point would bend that segment into a diagonal, so the point stays where it
    // is as a corner and the move adds one orthogonal step to the box. The T-44C Advanced
    // chart's dashed I3201-4 branch and its return into I3401-2 are both drawn this way.
    const bends = (pt, moved, next) => {
      if (!next) return false;
      const near = (u, v) => Math.abs(u - v) <= 0.05;
      if (!near(moved[1], pt[1]) && near(next[1], pt[1])) return true;
      if (!near(moved[0], pt[0]) && near(next[0], pt[0])) return true;
      return false;
    };
    if (srcSide) {
      const moved = onSide(order[0], src, srcSide);
      order = bends(order[0], moved, order[1]) ? [moved, ...order] : [moved, ...order.slice(1)];
    }
    if (dstSide) {
      const last = order.length - 1;
      const moved = onSide(order[last], dst, dstSide);
      order = bends(order[last], moved, order[last - 1])
        ? [...order, moved]
        : [...order.slice(0, last), moved];
    }
    // Joining a host lands on a point the host already has; keep each corner once.
    order = order.filter((q, k) => k === 0 || dist(q, order[k - 1]) > 0.05);
    // A trunk that feeds a bus resolves to the same pair as the bus's own branch, and the
    // branch already draws the whole route. One edge per pair.
    if (edges.some((e) => e.from === src && e.to === dst)) return;
    edges.push({ from: src, to: dst, points: order });
  });
  return [edges, unresolved];
}

// ---------------------------------------------------------------------------------------
// Bus edges (JS only; the Python regenerates Delta, which never needs this)
// ---------------------------------------------------------------------------------------
//
// The TH-73A's MCGs draw their flow as buses rather than as one arrow per pair of boxes: a box
// leaves by a headless stub onto a shared line, the shared line carries one head per
// destination (a dashed bus has heads at both ends), a head may point into a junction on
// another line rather than into a box, a line may leave a block's frame rather than its last
// box, and START/END capsules sit in the middle of a route. Read as one source end and one
// target end per connector, that inverts every bus and strands every stub, so such a chart is
// read as a graph instead: every arrowhead names a target, every headless end on a box names a
// source, and the sources of a target are the boxes reached by walking back from its head
// through the junctions, never forward along another head. Every source then gets its own edge
// to the target, drawn along the route the walk took, so a bus with four sources and two
// destinations is eight edges that overlap on the bus, which is what the figure draws.
//
// Used only when the pairwise reading leaves many connectors unresolved (traceChart), so the
// JPPTs and the T-54A MCG keep the reading their fixtures and live charts were made with.

const HEAD_BASE_SNAP = 3.0;
const HEAD_BOX_SNAP = 8.0;
const BUS_JOIN_SNAP = 3.5;

// A head read against the line it may sit on: its tip is the vertex farthest along the line's
// direction of travel, its base the middle of the other two. A squat head (4 wide, 3.4 tall on
// the Tilt-Rotor MCG's third sheet) puts its base corners farther from its centroid than its
// tip, so the centroid cannot say which vertex is the tip; the line can.
function headGeometry(head, out) {
  const pts = ring(head.pts);
  const along = (q) => q[0] * out[0] + q[1] * out[1];
  let apex = pts[0];
  pts.forEach((q) => { if (along(q) > along(apex)) apex = q; });
  const rest = pts.filter((q) => q !== apex);
  const base = rest.length
    ? [rest.reduce((s, p) => s + p[0], 0) / rest.length, rest.reduce((s, p) => s + p[1], 0) / rest.length]
    : apex;
  // The base runs square to the line; read the other way round, a neighbouring head's corner
  // would pass for a tip with a slanting base.
  let square = true;
  if (rest.length === 2) {
    const bx = rest[1][0] - rest[0][0];
    const by = rest[1][1] - rest[0][1];
    const cos = (bx * out[0] + by * out[1]) / ((Math.hypot(bx, by) || 1) * (Math.hypot(out[0], out[1]) || 1));
    square = Math.abs(cos) < 0.35;
  }
  return { apex, base, dir: [apex[0] - base[0], apex[1] - base[1]], square };
}

// The points of `pts` from the point `p` to the point `q`, both of which lie on it. On a
// closed outline (a START/END capsule) the route cuts straight across.
function alongPath(pts, p, q, closed) {
  if (closed) return [p, q];
  const ip = segmentOn(p, pts, BUS_JOIN_SNAP);
  const iq = segmentOn(q, pts, BUS_JOIN_SNAP);
  if (ip === -1 || iq === -1) return [p, q];
  if (ip < iq) return [p, ...pts.slice(ip + 1, iq + 1), q];
  if (ip > iq) return [p, ...pts.slice(iq + 1, ip + 1).reverse(), q];
  return [p, q];
}

// Where two orthogonal polylines cross, each in the middle of one of its own segments.
function crossingOf(aPts, bPts) {
  const level = (p, q, k) => Math.abs(p[k] - q[k]) < 0.5;
  const within = (v, p, q) => v >= Math.min(p, q) - 0.5 && v <= Math.max(p, q) + 0.5;
  for (let i = 0; i < aPts.length - 1; i += 1) {
    for (let j = 0; j < bPts.length - 1; j += 1) {
      const [a1, a2] = [aPts[i], aPts[i + 1]];
      const [b1, b2] = [bPts[j], bPts[j + 1]];
      let x;
      if (level(a1, a2, 0) && level(b1, b2, 1)) x = [a1[0], b1[1]];
      else if (level(a1, a2, 1) && level(b1, b2, 0)) x = [b1[0], a1[1]];
      else continue;
      if (!within(x[0], a1[0], a2[0]) || !within(x[1], a1[1], a2[1]) || !within(x[0], b1[0], b2[0]) || !within(x[1], b1[1], b2[1])) continue;
      if ([a1, a2, b1, b2].some((p) => dist(p, x) <= BUS_JOIN_SNAP)) continue;
      return x;
    }
  }
  return null;
}

// Whether a direction points into a box through the side named, or out of it.
const intoSide = (side, [dx, dy]) => (side === 'L' ? dx > 0 : side === 'R' ? dx < 0 : side === 'T' ? dy < 0 : dy > 0);

export function resolveBusEdges(nodes, connectors, arrows, frames = []) {
  const nodeMids = nodes.map((n) => [n.id, edgeMidpoints(n.bbox)]);
  const bboxOfNode = Object.fromEntries(nodes.map((n) => [n.id, n.bbox]));
  const heads = arrows;
  const closed = (pts) => pts.length > 3 && dist(pts[0], pts[pts.length - 1]) < 0.1;
  const headBases = arrows.map((a) => {
    const pts = ring(a.pts);
    return [pts.reduce((t, q) => t + q[0], 0) / pts.length, pts.reduce((t, q) => t + q[1], 0) / pts.length];
  });
  const [chained] = chain(connectors.filter((p) => !closed(p.pts)).map((p) => [...p.pts]), nodeMids, headBases);
  const segs = [
    ...chained.map((pts) => ({ pts, ends: [], closed: false })),
    ...connectors.filter((p) => closed(p.pts)).map((p) => ({ pts: [...p.pts], ends: [], closed: true })),
  ];

  // The box a point is on, through a side its direction agrees with: a head points into the
  // box, a tail leaves it. Then the box inside a frame whose side the point is on, nearest the
  // point: a line leaving a block's frame leaves its last event.
  const boxAt = (pt, dir, tol) => {
    let best = null;
    nodeMids.forEach(([id, mids]) => mids.forEach(([side, m]) => {
      const d = dist(pt, m);
      if (d > tol || !intoSide(side, dir)) return;
      if (!best || d < best.d) best = { d, hit: [id, side] };
    }));
    return best ? best.hit : null;
  };
  const onFrameSide = (pt, [x, y, w, h]) => {
    const nearX = Math.abs(pt[0] - x) <= EDGE_SNAP || Math.abs(pt[0] - (x + w)) <= EDGE_SNAP;
    const nearY = Math.abs(pt[1] - y) <= EDGE_SNAP || Math.abs(pt[1] - (y + h)) <= EDGE_SNAP;
    const withinX = pt[0] >= x - EDGE_SNAP && pt[0] <= x + w + EDGE_SNAP;
    const withinY = pt[1] >= y - EDGE_SNAP && pt[1] <= y + h + EDGE_SNAP;
    return (nearX && withinY) || (nearY && withinX);
  };
  const frameBoxes = frames.map((f) => {
    const [fx, fy, fw, fh] = f;
    return { bbox: f, inside: nodes.filter((n) => n.bbox[0] >= fx - 1 && n.bbox[1] >= fy - 1 && n.bbox[0] + n.bbox[2] <= fx + fw + 1 && n.bbox[1] + n.bbox[3] <= fy + fh + 1) };
  });
  const frameBoxAt = (pt) => {
    for (const f of frameBoxes) {
      if (!f.inside.length || !onFrameSide(pt, f.bbox)) continue;
      let best = null;
      f.inside.forEach((n) => edgeMidpoints(n.bbox).forEach(([side, m]) => {
        const d = dist(pt, m);
        if (!best || d < best.d) best = { d, hit: [n.id, side] };
      }));
      if (best) return best.hit;
    }
    return null;
  };
  // Every other segment the point sits on: a point where three lines meet is on all of them.
  const joinsAt = (pt, self) => {
    const out = [];
    segs.forEach((s, j) => {
      if (j === self) return;
      const at = segmentOn(pt, s.pts, BUS_JOIN_SNAP);
      if (at !== -1) { out.push({ seg: j, foot: footOn(pt, s.pts[at], s.pts[at + 1]) }); return; }
      if (s.closed) {
        // A START/END capsule's rounded ends were flattened to their chords by the hop
        // straightener, so a line that met the arc now stops short of the outline by the arc's
        // radius: a point within that reach of the outline's box is on the capsule.
        const xs = s.pts.map((q) => q[0]);
        const ys = s.pts.map((q) => q[1]);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const reach = (y1 - y0) / 2 + BUS_JOIN_SNAP;
        if (pt[0] >= x0 - reach && pt[0] <= x1 + reach && pt[1] >= y0 - BUS_JOIN_SNAP && pt[1] <= y1 + BUS_JOIN_SNAP) out.push({ seg: j, foot: pt });
        return;
      }
      const first = s.pts[0];
      const last = s.pts[s.pts.length - 1];
      if (dist(pt, first) <= BUS_JOIN_SNAP) out.push({ seg: j, foot: first });
      else if (dist(pt, last) <= BUS_JOIN_SNAP) out.push({ seg: j, foot: last });
    });
    return out;
  };

  // Each end: its head (the head whose base sits at the end, pointing on along the line),
  // the box it is on, else the segments it joins, else the frame it leaves.
  segs.forEach((s, i) => {
    if (s.closed) return;
    [0, 1].forEach((k) => {
      const pt = k === 0 ? s.pts[0] : s.pts[s.pts.length - 1];
      const prev = k === 0 ? s.pts[1] : s.pts[s.pts.length - 2];
      const out = [pt[0] - prev[0], pt[1] - prev[1]];
      let head = null;
      heads.forEach((a) => {
        const h = headGeometry(a, out);
        if (!h.square || dist(h.base, pt) > HEAD_BASE_SNAP) return;
        if (h.dir[0] * out[0] + h.dir[1] * out[1] <= 0) return;
        if (!head || dist(h.base, pt) < dist(head.base, pt)) head = h;
      });
      // A box the point touches wins; then a line it sits on; then, for a head, a box a
      // little further off (a hand-drawn box that stops short of its arrow); then a frame.
      const probe = head ? head.apex : pt;
      let box = head ? boxAt(probe, head.dir, EDGE_SNAP) : boxAt(probe, out, EDGE_SNAP);
      let joins = [];
      // A head on a block's frame points into the block whether or not another line ends at
      // that head too: the Tilt-Rotor MCG runs two lines into one head on LND0201T's frame.
      let viaFrame = false;
      if (!box && head) {
        box = frameBoxAt(probe);
        viaFrame = !!box;
      }
      if (!box) {
        joins = joinsAt(probe, i);
        if (!joins.length && head) box = boxAt(probe, head.dir, HEAD_BOX_SNAP);
        if (!joins.length && !box) {
          box = frameBoxAt(probe);
          viaFrame = !!box;
        }
      }
      // A head end whose base sits on another line is also fed by that line: a dashed bus
      // starts on the stub it branches from and puts its own head beside the stub's.
      const feeders = head ? joinsAt(pt, i) : [];
      s.ends.push({ pt, head, box, joins, viaFrame, feeders });
    });
    // A headless line from a junction to a box flows downstream: into the box when the box
    // lies below the junction (the Tilt-Rotor MCG draws its exit connectors so, and a sheet or
    // two drops a head), out of it when the box lies above.
    s.ends.forEach((e, k) => {
      const o = s.ends[1 - k];
      if (e.head || !e.box || o.head || o.box || !o.joins.length || e.pt[1] >= o.pt[1] - 2) return;
      e.head = { apex: e.pt, base: e.pt, dir: [0, 0], square: true };
    });
    // A stub too short to clear its box snaps both ends to it: the tail is then on nothing.
    const [a, b] = s.ends;
    if (a.box && b.box && a.box[0] === b.box[0]) {
      const tail = a.head ? b : b.head ? a : null;
      if (tail) {
        tail.box = null;
        tail.joins = joinsAt(tail.pt, i);
        tail.feeders = [];
      }
    }
  });

  // Links between segments. A head on another segment feeds it. A headless end on another
  // segment is fed by it when this segment carries a head somewhere, and is a bus joint
  // (either way) when it does not.
  const into = segs.map(() => []);
  const both = segs.map(() => []);
  segs.forEach((s, i) => {
    const hasHead = s.ends.some((e) => e.head);
    s.ends.forEach((e) => {
      e.joins.forEach((j) => {
        if (e.head) into[j.seg].push({ seg: i, at: j.foot, from: e.pt });
        else if (hasHead) into[i].push({ seg: j.seg, at: e.pt, from: j.foot });
        else {
          both[i].push({ seg: j.seg, at: e.pt, from: j.foot });
          both[j.seg].push({ seg: i, at: j.foot, from: e.pt });
        }
      });
      // Not the line this head points into, and not a line that leaves the box it points
      // into: those are the head's own target and the box's own exit, within a hair of its base.
      e.feeders
        .filter((j) => !e.joins.some((x) => x.seg === j.seg))
        .filter((j) => !(e.box && segs[j.seg].ends.some((x) => x.box && x.box[0] === e.box[0])))
        .forEach((j) => into[i].push({ seg: j.seg, at: e.pt, from: j.foot }));
    });
  });

  // A line with a head, no source box and nothing arriving at its ends is fed where another
  // line crosses it: a dashed bus drawn straight across the stub it branches from. The figure
  // hops a line over one it does not join, so a flat crossing is a junction.
  segs.forEach((s, i) => {
    if (s.closed || !s.ends.some((e) => e.head) || into[i].length || s.ends.some((e) => !e.head && e.box)) return;
    segs.forEach((t, j) => {
      if (j === i || t.closed) return;
      const x = crossingOf(s.pts, t.pts);
      if (x) into[i].push({ seg: j, at: x, from: x });
    });
  });

  const onSide = (pt, id, side) => {
    const [x, y, w, h] = bboxOfNode[id];
    if (side === 'L') return [x, pt[1]];
    if (side === 'R') return [x + w, pt[1]];
    if (side === 'T') return [pt[0], y + h];
    return [pt[0], y];
  };
  const bends = (pt, moved, next) => {
    if (!next) return false;
    const near = (u, v) => Math.abs(u - v) <= 0.05;
    if (!near(moved[1], pt[1]) && near(next[1], pt[1])) return true;
    if (!near(moved[0], pt[0]) && near(next[0], pt[0])) return true;
    return false;
  };

  const edges = [];
  const unresolved = [];
  // An end on a block's frame carries on from the frame's edge to the middle of the box's side
  // with a square corner: the frame is not drawn, so an arrow stopping at it would float.
  const jog = (pt, id, side) => {
    const [x, y, w, h] = bboxOfNode[id];
    const mid = side === 'L' ? [x, y + h / 2] : side === 'R' ? [x + w, y + h / 2] : side === 'T' ? [x + w / 2, y + h] : [x + w / 2, y];
    return side === 'L' || side === 'R' ? [[pt[0], mid[1]], mid] : [[mid[0], pt[1]], mid];
  };
  const finish = (points, src, target, srcFrame = false) => {
    let order = points.filter((q, k) => k === 0 || dist(q, points[k - 1]) > 0.05);
    if (srcFrame) {
      order = [...jog(order[0], src[0], src[1]).reverse(), ...order];
    } else {
      const movedA = onSide(order[0], src[0], src[1]);
      order = bends(order[0], movedA, order[1]) ? [movedA, ...order] : [movedA, ...order.slice(1)];
    }
    const last = order.length - 1;
    if (target.viaFrame) {
      order = [...order, ...jog(order[last], target.id, target.side)];
    } else {
      const movedB = onSide(order[last], target.id, target.side);
      order = bends(order[last], movedB, order[last - 1]) ? [...order, movedB] : [...order.slice(0, last), movedB];
    }
    order = order.filter((q, k) => k === 0 || dist(q, order[k - 1]) > 0.05);
    // The figure's lines run straight up and down and straight across; one drawn a point or
    // two off true, or a route that meets a junction a point off its line, gets a corner at
    // its end instead of a slant.
    const squared = [order[0]];
    for (let k = 1; k < order.length; k += 1) {
      const a = squared[squared.length - 1];
      const b = order[k];
      if (Math.abs(a[0] - b[0]) > 0.6 && Math.abs(a[1] - b[1]) > 0.6) {
        squared.push(Math.abs(a[0] - b[0]) < Math.abs(a[1] - b[1]) ? [a[0], b[1]] : [b[0], a[1]]);
      }
      squared.push(b);
    }
    return squared.filter((q, k) => k === 0 || dist(q, squared[k - 1]) > 0.05);
  };
  // A sheet drawn with no arrowheads at all (the Tilt-Rotor MCG's third) flows down the page:
  // a line between two boxes runs from the higher one.
  if (!heads.length) {
    segs.forEach((s) => {
      const [a, b] = s.ends;
      if (!a || !a.box || !b.box || a.box[0] === b.box[0]) return;
      const down = a.pt[1] >= b.pt[1];
      const src = down ? a.box : b.box;
      const target = down ? { id: b.box[0], side: b.box[1] } : { id: a.box[0], side: a.box[1] };
      if (edges.some((x) => x.from === src[0] && x.to === target.id)) return;
      edges.push({ from: src[0], to: target.id, points: finish(down ? [...s.pts] : [...s.pts].reverse(), src, target) });
    });
    return [edges, unresolved, segs];
  }
  // Walk back from a target's head: `at` is where the flow leaves segment i towards the
  // target; `route` the points from there to the target. Every source box found gets an edge.
  const walk = (i, at, route, seen, target, found, viaJoint = false) => {
    if (seen.has(i)) return;
    seen.add(i);
    const s = segs[i];
    s.ends.forEach((e) => {
      if (e.head || !e.box || e.box[0] === target.id) return;
      found.push({ src: e.box, points: [...alongPath(s.pts, e.pt, at, s.closed), ...route], viaJoint, srcFrame: e.viaFrame });
    });
    into[i].forEach((l) => walk(l.seg, l.from, [...alongPath(s.pts, l.at, at, s.closed), ...route], seen, target, found, viaJoint));
    both[i].forEach((l) => walk(l.seg, l.from, [...alongPath(s.pts, l.at, at, s.closed), ...route], seen, target, found, true));
  };
  // The figure flows down the page. A source reached only through a headless joint, with no
  // head to say which way the joint runs, is not one when the target sits above it: a line
  // that stops a hair short of a bus it does not join reads as joined otherwise.
  const centreY = (id) => bboxOfNode[id][1] + bboxOfNode[id][3] / 2;
  const upstream = (src, target) => centreY(target.id) > centreY(src[0]) + 6;
  segs.forEach((s, i) => {
    s.ends.forEach((e) => {
      if (!e.head || !e.box) return;
      const target = { id: e.box[0], side: e.box[1], viaFrame: e.viaFrame };
      const found = [];
      walk(i, e.pt, [e.head.apex], new Set(), target, found);
      if (!found.length) {
        unresolved.push([null, null, target.id, e.head.apex]);
        return;
      }
      found.forEach(({ src, points, viaJoint, srcFrame }) => {
        if (src[0] === target.id || edges.some((x) => x.from === src[0] && x.to === target.id)) return;
        if (viaJoint && upstream(src, target)) return;
        edges.push({ from: src[0], to: target.id, points: finish(points, src, target, srcFrame) });
      });
    });
  });
  // A segment with a box at one end and nothing at the other is a line the figure drew to
  // nowhere this reading knows: say so, as the pairwise reading does.
  segs.forEach((s) => {
    const boxed = s.ends.filter((e) => e.box).map((e) => e.box[0]);
    const loose = s.ends.some((e) => !e.box && !e.joins.length);
    if (loose && boxed.length === 1 && !edges.some((x) => x.from === boxed[0] || x.to === boxed[0])) unresolved.push([null, boxed[0], null, s.pts[0]]);
  });
  // The reading itself rides along third, for a debugging harness; callers take the first two.
  return [edges, unresolved, segs];
}

// ---------------------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------------------

const flip = (y, h) => PAGE_HEIGHT - (y + h);

// Python's '%.1f' % v, then .rstrip('0').rstrip('.'): round half to even on an exact tie, which
// toFixed does not do.
export function num(v) {
  const t = v * 10;
  let s;
  if (Number.isInteger(t * 2) && !Number.isInteger(t)) {
    const lo = Math.floor(t);
    s = ((lo % 2 === 0 ? lo : lo + 1) / 10).toFixed(1);
  } else {
    s = v.toFixed(1);
  }
  if (s === '-0.0') s = '0.0';
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return Number(s || '0');
}

function numStr(v) {
  return String(num(v));
}

const squash = (s) => s.replace(/ /g, '');

// Every page interpreted once, so several titles can be tried without re-reading the document.
// The core chart and the per-community charts are looked for in the same contents, so the pages
// are kept per contents array and the second search reuses the first's. Neither pass changes them.
const readCache = new WeakMap();
export function readPages(pageContents) {
  if (readCache.has(pageContents)) return readCache.get(pageContents);
  const pages = pageContents.map((buf, index) => {
    const [paths, runs] = interpret(buf);
    return { page: index + 1, paths, runs, text: runs.map((r) => r.text).join('') };
  });
  readCache.set(pageContents, pages);
  return pages;
}

// The matching page with the most drawn on it, so a table-of-contents line loses to the figure.
// The comparison is `>`, so the first of equals wins, as it did when this was inline.
function pickPage(pages, test) {
  let target = null;
  pages.forEach((p) => {
    if (!test(p)) return;
    if (target === null || p.paths.length > target.paths.length) target = p;
  });
  return target;
}

function findChartPage(pages, titles) {
  const holds = (p, title) => squash(p.text).includes(squash(title));
  for (const title of titles) {
    const hit = pickPage(pages, (p) => holds(p, title));
    if (hit) return { ...hit, title };
  }
  return null;
}

// A box the figure draws as a closed line rather than a shape (the SNA MCG's NGT3001-2A is a
// rounded box with two straight sides, stroked as one closed path) reaches here as a closed
// connector. One of box size with an event id inside it is a box.
const EVENT_TEXT = /^[A-Z]{1,3}\d{4}[A-Z]?(-\d{1,2}[A-Z]?)?\*?$/;
function promoteBoxes(nodes, connectors, runs) {
  const keep = [];
  connectors.forEach((p) => {
    const { pts } = p;
    const closed = dist(pts[0], pts[pts.length - 1]) < 0.1 || p.ops.includes('h') || CLOSING_PAINT.has(p.paint);
    const closedShape = pts.length >= 4 && pts.length <= 12 && closed;
    const bbox = bboxOf(p);
    const [, , w, h] = bbox;
    const text = closedShape && w >= 10 && w <= 60 && h >= 9.5 && h <= 25
      ? runs.filter((r) => inside(bbox, r.x, r.y, 4)).sort((a, b) => a.order - b.order).map((r) => r.text).join('').replace(PY_SPACE, '')
      : '';
    if (text && EVENT_TEXT.test(text)) nodes.push([{ ...p, promoted: true }, 'roundrect']);
    else keep.push(p);
  });
  return keep;
}

// One chart, from the paths and text runs of a page or of one region of a page.
//
// `categories` is the { mapping, pairs } another chart derived from its legend. A chart drawn
// without a legend of its own — the per-community charts share the core chart's — cannot key
// its own shapes, so it borrows them and reports no legend of its own to draw.
function traceChart(paths, runs, { knownEventIds = null, categories = null, warn, resolver = 'auto' }) {
  const [nodesRaw0, arrows, connectors0, other] = classify(paths);
  const nodesRaw = [...nodesRaw0];
  let connectors = promoteBoxes(nodesRaw, connectors0, runs);
  const [labelled, leftover0] = attachLabels(nodesRaw, runs);
  // A promoted box is drawn narrower than its label, which starts a hair outside it.
  let leftover = leftover0;
  labelled.filter((n) => !n.label && n.path.promoted).forEach((n) => {
    const bbox = bboxOf(n.path);
    const mine = leftover.filter((r) => inside(bbox, r.x, r.y, 4));
    n.label = mine.sort((a, b) => a.order - b.order).map((r) => r.text).join('').replace(PY_SPACE, '');
    leftover = leftover.filter((r) => !mine.includes(r));
  });
  let mapping;
  let pairs;
  if (categories) {
    ({ mapping, pairs } = categories);
  } else {
    // A caption that found no key already warns for itself in deriveCategories, and the
    // legends differ in how many captions they print, so there is no count to check here.
    let taken;
    [mapping, pairs, taken] = deriveCategories(labelled, leftover, warn, [...connectors, ...other]);
    connectors = connectors.filter((p) => !taken.includes(p));
  }

  // `inside` marks a key whose caption the publication prints INSIDE the shape rather than
  // beside it. The renderer has to know: a caption drawn beside a key of a legend laid out in
  // two columns lands on top of the next column's shapes.
  const legend = categories ? [] : pairs.map(([text, kind, key, lines]) => ({
    kind,
    label: text,
    shape: key.shape,
    bbox: bboxOf(key.path),
    inside: !!key.captionInside,
    ...(key.letter ? { letter: key.letter } : {}),
    ...(lines ? { lines } : {}),
  }));

  const kindFor = categoryMapper(mapping, pairs, labelled, warn);
  const nodes = [];
  const jumpSeen = {};
  const missing = [];
  const terminals = {};
  labelled.forEach((n) => {
    if (!n.label || n.isLegendKey) return;
    // The START and END capsules are the figure's own notation, not events: drawn, and the
    // arrows out of START and into END read like any other, but they open nothing.
    const term = /^(START|END)(TRAINING)?$/.exec(n.label);
    if (term) {
      terminals[term[1]] = (terminals[term[1]] || 0) + 1;
      nodes.push({
        id: `${term[1].toLowerCase()}-${terminals[term[1]]}`,
        label: term[2] ? `${term[1]} ${term[2]}` : term[1],
        kind: 'terminal',
        bbox: bboxOf(n.path),
      });
      return;
    }
    // A box stroked as a capsule but labelled as an event (the SNA MCG's NGT3001-2A, a rounded
    // box with two straight sides) is the rounded box it looks like, not a START/END marker.
    let kind = kindFor(n.shape === 'capsule' ? 'roundrect' : n.shape, n.path.lw);
    if (kind === undefined) {
      warn(`${n.label} matches no legend key.`);
      kind = 'other';
    }
    const rec = { label: n.label, kind, bbox: bboxOf(n.path) };
    if (kind === 'jump') {
      const letter = n.label;
      jumpSeen[letter] = (jumpSeen[letter] || 0) + 1;
      rec.id = `jump-${letter}-${jumpSeen[letter]}`;
      rec.letter = letter;
    } else {
      rec.id = n.label;
      // A box may carry a footnote marker the publication prints beside it, as the T-44C
      // Advanced chart's `T0101-2*` does. The label keeps it, because that is what the figure
      // prints; the event ids are read from the label without it.
      let spanned = expand(n.label.replace(/[*†‡]+$/, ''));
      // A caption printed hard against a box ("DAY4390A Check Flight") can start inside it
      // and join its label. The event token is then the label, and the rest is the caption.
      if (!spanned.length) {
        const m = /^([A-Z]{1,3}\d{4}[A-Z]?(?:-\d{1,2}[A-Z]?)?)[A-Za-z-]/.exec(n.label);
        if (m && expand(m[1]).length) {
          warn(`Box "${n.label}" read as ${m[1]}; the rest is a caption printed beside it.`);
          rec.label = m[1];
          rec.id = m[1];
          spanned = expand(m[1]);
        }
      }
      if (!spanned.length) warn(`Cannot read box label "${n.label}" as event ids.`);
      // A label spans the block's NUMBERING, not a run of events that all exist. The T-44C
      // chart's `G1001-90` covers G1001 to G1090, where the block holds seven — G1001 to G1006
      // and the exam, G1090 — so the other 83 numbers are not events and must not be carried
      // as if they were. Keep the ones the syllabus lists; a label that matches none of them is
      // kept whole, because then the mismatch is real and the warning below has to name it.
      // The TH-73A's charts print the student letter on every box ("GND0301A"), which the
      // syllabus text drops from the event id; a lettered id the syllabus does not list is read
      // as the id it does list without the letter.
      const unlettered = (e) => (knownEventIds && !knownEventIds.has(e) && knownEventIds.has(e.replace(/[A-Z]$/, '')) ? e.replace(/[A-Z]$/, '') : e);
      const listed = knownEventIds ? spanned.map(unlettered).filter((e) => knownEventIds.has(e)) : spanned;
      const events = listed.length ? listed : spanned;
      rec.events = events;
      if (events.length) rec.block = blockOf(events[0]);
      if (knownEventIds && !listed.length) events.forEach((e) => missing.push([n.label, e]));
    }
    nodes.push(rec);
  });
  missing.forEach(([label, e]) => warn(`Box ${label} names ${e}, which the syllabus text does not list.`));

  // A chart drawn as buses (the TH-73A's) leaves the pairwise reading with a long list of
  // connectors it could not place. The graph reading is tried then, and kept when it does
  // better; extractFlow then asks for it on every sheet of that chart (`resolver: 'bus'`), since
  // a sheet with few connectors would otherwise be read the other way.
  let [edges, unresolved] = resolver === 'bus' ? [[], []] : resolveEdges(nodes, connectors, arrows);
  let usedBus = false;
  if (resolver === 'bus' || (resolver === 'auto' && unresolved.length > BUS_THRESHOLD)) {
    const frames = other
      .filter((p) => STROKE_OPS.has(p.paint) && p.ops.every((o) => o === 'm' || o === 're'))
      .map((p) => bboxOf(p))
      .filter(([, , w, h]) => w > 60 || h > 25);
    const alt = resolveBusEdges(nodes, connectors, arrows, frames);
    if (resolver === 'bus' || alt[1].length < unresolved.length) {
      [edges, unresolved] = alt;
      usedBus = true;
    }
  }
  unresolved.forEach(([, src, dst]) => {
    warn(`A connector could not be resolved (${src || '?'} to ${dst || '?'}). Draw it in the editor.`);
  });

  // An arrow that runs mostly along dashed lines is the optional flow the legend keys as
  // "Opt Flow", and is drawn dashed.
  const dashedLines = connectors.filter((p) => p.dashed);
  if (dashedLines.length) {
    edges.forEach((e) => {
      let total = 0;
      let on = 0;
      e.points.slice(1).forEach((q, k) => {
        const a = e.points[k];
        const len = dist(a, q);
        total += len;
        if (dashedLines.some((p) => pointOnPath([(a[0] + q[0]) / 2, (a[1] + q[1]) / 2], p.pts, 1.0))) on += len;
      });
      if (total > 0 && on * 2 >= total) e.dashed = true;
    });
  }

  nodes.forEach((n) => {
    if (n.kind !== 'jump') return;
    const incoming = edges.some((e) => e.to === n.id);
    const outgoing = edges.some((e) => e.from === n.id);
    n.role = incoming && !outgoing ? 'entrance' : outgoing && !incoming ? 'exit' : 'both';
  });

  const xs = [...nodes.map((n) => n.bbox[0]), ...legend.map((k) => k.bbox[0])];
  const ys = [...nodes.map((n) => n.bbox[1]), ...legend.map((k) => k.bbox[1])];
  const x1 = [...nodes.map((n) => n.bbox[0] + n.bbox[2]), ...legend.map((k) => k.bbox[0] + k.bbox[2])];
  const y1 = [...nodes.map((n) => n.bbox[1] + n.bbox[3]), ...legend.map((k) => k.bbox[1] + k.bbox[3])];
  edges.forEach((e) => e.points.forEach(([px, py]) => {
    xs.push(px); x1.push(px); ys.push(py); y1.push(py);
  }));
  const pad = 4.0;
  const vx = Math.min(...xs) - pad;
  const vy2 = Math.max(...y1) + pad;
  const vw = (Math.max(...x1) + pad) - vx;
  const vh = vy2 - (Math.min(...ys) - pad);
  const VIEWBOX = [vx, PAGE_HEIGHT - vy2, vw, vh].map(numStr).join(' ');

  const NODES = nodes.map((n) => {
    const [x, y, w, h] = n.bbox;
    const row = { id: n.id, label: n.label, x: num(x), y: num(flip(y, h)), w: num(w), h: num(h), kind: n.kind };
    if (n.letter) {
      row.letter = n.letter;
      row.role = n.role || 'both';
    }
    if (n.block) row.block = n.block;
    if (n.events && n.events.length) row.events = n.events;
    return row;
  });
  const LEGEND = legend.map((k) => {
    const [x, y, w, h] = k.bbox;
    const row = { kind: k.kind, label: k.label, shape: k.shape, x: num(x), y: num(flip(y, h)), w: num(w), h: num(h) };
    if (k.inside) row.inside = true;
    if (k.letter) row.letter = k.letter;
    if (k.lines) row.lines = k.lines;
    return row;
  });
  const EDGES = edges.map((e) => ({
    from: e.from,
    to: e.to,
    points: e.points.map(([px, py]) => [num(px), num(flip(py, 0))]),
    ...(e.dashed ? { dashed: true } : {}),
  }));

  return { VIEWBOX, NODES, LEGEND, EDGES, categories: { mapping, pairs }, usedBus, unresolvedCount: unresolved.length };
}

// How many connectors the pairwise reading may leave unresolved before a chart is read as buses:
// counted on one sheet, or over every sheet of a chart printed on several, since a bus chart
// whose sheets each fall short of this together fall well past it (the SNA MCG's leave 6 to 9
// a sheet, 30 in all; the T-54A's two sheets leave 4, the T-44C's one sheet 7).
const BUS_THRESHOLD = 10;

// -> { VIEWBOX, NODES, LEGEND, EDGES, warnings, page, categories } or throws with a reason
// to show.
export function extractFlow(pageContents, { knownEventIds = null } = {}) {
  const warnings = [];
  const warn = (msg) => warnings.push(msg);

  const target = findChartPage(readPages(pageContents), TITLES);
  if (!target) throw new Error('No course flow chart was found in this PDF.');
  if (target.paths.length < 50) {
    throw new Error(`"${target.title}" appears on page ${target.page}, but nothing is drawn there. The chart may be a scanned image, which cannot be traced.`);
  }

  const chart = traceChart(target.paths, target.runs, { knownEventIds, warn });
  // A page that only mentions a course flow, ruled like a table, has paths but no boxes, and
  // its chart would have no extent to draw at.
  if (chart.NODES.length < 2) {
    throw new Error(`"${target.title}" appears on page ${target.page}, but no boxes could be traced there.`);
  }

  // A chart too long for one page is continued on the next under the same title, the two
  // halves joined by a lettered connector: the T-54A MCG draws ground school on I-5, down to
  // (A), and the flight stages from (A) on I-7. Each page is traced as the chart it is and the
  // pages are stacked, top to bottom, so the course reads as one chart, as the connector says it
  // is. Nothing here runs for a chart that fits one page.
  const more = continuationPages(readPages(pageContents), target)
    .map((p) => {
      const own = [];
      const traced = traceChart(p.paths, p.runs, { knownEventIds, warn: (m) => own.push(m) });
      return traced.NODES.length >= 2 ? { ...traced, page: p.page, warnings: own, source: p } : null;
    })
    .filter(Boolean);
  if (!more.length) return { ...chart, warnings, page: target.page, pages: [target.page] };
  let sheets = [{ ...chart, page: target.page, warnings, source: target }, ...more].sort((a, b) => a.page - b.page);
  // One chart, one reading: a sheet read as buses makes the others buses too, and so does a
  // chart whose sheets together leave more unresolved than one sheet is allowed.
  const pairwiseLeft = sheets.reduce((n, s) => n + (s.usedBus ? 0 : s.unresolvedCount), 0);
  if (sheets.some((s) => s.usedBus) || pairwiseLeft > BUS_THRESHOLD) {
    sheets = sheets.map((s) => {
      if (s.usedBus) return s;
      const own = [];
      const traced = traceChart(s.source.paths, s.source.runs, { knownEventIds, categories: s.LEGEND.length ? null : null, warn: (m) => own.push(m), resolver: 'bus' });
      return { ...traced, page: s.page, warnings: own, source: s.source };
    });
  }
  // A sheet with no legend of its own keys its shapes by the fullest legend among the sheets:
  // the TH-73A MCG prints its legend on the first of five sheets only. Such a sheet is traced
  // again with that legend's categories, so its boxes are not all "other".
  const legendFrom = sheets.reduce((a, b) => (b.LEGEND.length > a.LEGEND.length ? b : a));
  sheets = sheets.map((s) => {
    if (s.LEGEND.length || !legendFrom.LEGEND.length) return s;
    const own = [];
    const traced = traceChart(s.source.paths, s.source.runs, { knownEventIds, categories: legendFrom.categories, warn: (m) => own.push(m), resolver: s.usedBus ? 'bus' : 'auto' });
    return { ...traced, page: s.page, warnings: own, source: s.source };
  });
  return {
    ...stackCharts(sheets),
    warnings: sheets.flatMap((s) => s.warnings),
    page: sheets[0].page,
    pages: sheets.map((s) => s.page),
  };
}

// The other pages that carry the same chart's title and a chart: near the one picked, since a
// continuation follows its first half (a blank verso may sit between them), and never a
// per-community page, whose title also ends COURSE FLOW.
const CONTINUATION_SPAN = 3;

function continuationPages(pages, target) {
  const holds = (p, title) => squash(p.text).includes(squash(title));
  const sheets = pages.filter((p) => p.page !== target.page
    && holds(p, target.title)
    && !POST_TITLE.every((t) => holds(p, t))
    // The TH-73A MCG's last sheet draws six boxes and a connector and little else.
    && p.paths.length >= 20
    && boxesOf(p.paths).length >= MIN_REGION_BOXES);
  // A chart over many sheets (the TH-73A MCG's runs to five, each a blank verso apart) is
  // walked sheet by sheet from the one picked, forward and back: a sheet counts when it sits
  // within the span of the last one counted, so the whole run is found whichever sheet the
  // picker chose, and a chart further off is still another chart.
  const found = [];
  const nearest = (from, dir) => sheets
    .filter((p) => !found.includes(p) && Math.sign(p.page - from) === dir && Math.abs(p.page - from) <= CONTINUATION_SPAN)
    .sort((a, b) => Math.abs(a.page - from) - Math.abs(b.page - from))[0];
  [1, -1].forEach((dir) => {
    for (let next = nearest(target.page, dir); next; next = nearest(next.page, dir)) found.push(next);
  });
  return found;
}

// Charts traced page by page, in page order, as one: each sheet is moved down to start a little
// below the last, its connectors renumbered so the letters still pair across the join (the
// second sheet's (A) is `jump-A-2`), and the fullest legend kept — a continued chart repeats
// only the keys its own page needs.
const STACK_GAP = 24.0;

function stackCharts(sheets) {
  const viewOf = (s) => s.VIEWBOX.split(' ').map(Number);
  const NODES = [];
  const EDGES = [];
  const seen = {};
  let box = null;
  let bottom = null;
  let legendFrom = sheets[0];
  sheets.forEach((s) => {
    if (s.LEGEND.length > legendFrom.LEGEND.length) legendFrom = s;
  });
  let LEGEND = [];
  const bands = [];
  sheets.forEach((s) => {
    const [vx, vy, vw, vh] = viewOf(s);
    const dy = bottom === null ? 0 : num(bottom + STACK_GAP - vy);
    bands.push({ caption: captionOf(s.source), y: num(vy + dy), h: num(vh) });
    const ids = {};
    s.NODES.forEach((n) => {
      const row = { ...n, y: num(n.y + dy) };
      if (n.letter) {
        seen[n.letter] = (seen[n.letter] || 0) + 1;
        row.id = `jump-${n.letter}-${seen[n.letter]}`;
      } else if (n.kind === 'terminal') {
        // END is printed on every sheet the course can end on; each capsule keeps its own id.
        const base = n.id.replace(/-\d+$/, '');
        seen[base] = (seen[base] || 0) + 1;
        row.id = `${base}-${seen[base]}`;
      }
      ids[n.id] = row.id;
      NODES.push(row);
    });
    s.EDGES.forEach((e) => EDGES.push({
      ...e,
      from: ids[e.from] || e.from,
      to: ids[e.to] || e.to,
      points: e.points.map(([px, py]) => [px, num(py + dy)]),
    }));
    if (s === legendFrom) LEGEND = s.LEGEND.map((k) => ({ ...k, y: num(k.y + dy) }));
    const top = vy + dy;
    box = box
      ? [Math.min(box[0], vx), box[1], Math.max(box[0] + box[2], vx + vw) - Math.min(box[0], vx), top + vh - box[1]]
      : [vx, top, vw, vh];
    bottom = top + vh;
  });
  // The sheets, in the stacked chart's own coordinates, each with the caption the publication
  // prints over it: CourseFlow shows them one at a time, captioned so.
  return { VIEWBOX: box.map(numStr).join(' '), NODES, LEGEND, EDGES, sheets: bands, categories: legendFrom.categories };
}

// The title the publication prints over a chart sheet ("AHTS COURSE FLOW (1 OF 5)"): the text
// runs on the line that holds "COURSE FLOW", in reading order.
function captionOf(page) {
  if (!page || !page.runs) return '';
  const holds = (t) => squash(t).toUpperCase().includes('COURSEFLOW');
  const hit = page.runs.find((r) => holds(r.text))
    || page.runs.find((r, i) => holds(page.runs.slice(i, i + 4).map((q) => q.text).join('')));
  if (!hit) return '';
  const line = page.runs.filter((r) => Math.abs(r.y - hit.y) < 1.5 && !r.turned).sort((a, b) => a.x - b.x);
  // Runs carry no widths, so a title set in two runs is joined without its space; the one
  // word boundary every caption has is put back.
  return pyStrip(line.map((r) => r.text).join('').replace(PY_SPACE, ' ')).replace(/(\S)COURSE FLOW/, '$1 COURSE FLOW');
}

// ---------------------------------------------------------------------------------------
// Per-community charts
//
// A syllabus several communities fly prints one chart each for the part of the course after
// they part company, and prints them all on one page, stacked in bands ruled off from each
// other and headed with the community's name. The T-44C Advanced syllabus's page I-7 draws
// five: USN P-8 and E-6 side by side in the top band, then USMC C-130, USCG and TILT-ROTOR.
//
// None of this is in tools/extract-jppt-flow.py. That tool regenerates Delta's FLOW.js and no
// T-6B JPPT prints a per-community chart, so the band splitting lives here alone; the passes
// the two share are still line for line.
// ---------------------------------------------------------------------------------------

// The rules between the bands are not drawn: they are TYPED. Whoever made the figure ruled one
// community's chart off from the next with a row of hyphens, and turned one on its side to
// divide the two communities that share the top band. So a separator is a text run of nothing
// but dashes, and `turned` says which way it cuts. Nothing is drawn there at all, which is why
// looking for a long stroke finds none.
//
// The T-44C Advanced page types three across (127 and 86 characters, in two runs each, because
// the row spans two table cells) and one down (60 characters, at the foot of the top band).
const SEPARATOR = /^[\s\-‐-―_]{6,}$/;
// Below this a region is a stray mark or a heading, not a chart.
const MIN_REGION_BOXES = 3;
const MIN_REGION_PATHS = 8;

// Running heads, the page number and the figure's own title: text that sits at the top of a
// band without naming it.
const NOT_A_LABEL = [/^CNATRAINST/i, /^\d{1,2}\s+\S+\s+\d{4}$/, /^[IVX]+-\d+$/, /COURSE\s*FLOW/i];

const midOf = (p) => {
  const [x, y, w, h] = bboxOf(p);
  return [x + w / 2.0, y + h / 2.0];
};

const within = (v, lo, hi) => v > lo && v <= hi;

const isSeparator = (r) => SEPARATOR.test(r.text);

// Where the typed rules cut, deduplicated: a rule spanning two table cells is two runs at one
// position. Ascending.
function separatorCuts(runs, turned) {
  const at = runs.filter((r) => isSeparator(r) && !!r.turned === turned).map((r) => num(turned ? r.x : r.y));
  return [...new Set(at)].sort((a, b) => a - b);
}

// The boxes a chart is built from: the shapes `classify` would take as nodes, by size alone,
// since a region is being found rather than read.
export function boxesOf(paths) {
  return paths.filter((p) => {
    if (p.clip || p.paint === 'n' || !STROKE_OPS.has(p.paint)) return false;
    const [, , w, h] = bboxOf(p);
    return w >= 10.0 && w <= 60.0 && h >= 10.0 && h <= 25.0;
  });
}

// The community a band is headed with: its topmost text, once the page's own furniture and
// anything that reads as a list of event ids are set aside.
function regionLabel(runs) {
  const named = runs
    .map((r) => ({ r, text: pyStrip(r.text.replace(PY_SPACE, ' ')) }))
    .filter(({ text }) => text.length > 1 && text.length <= 30)
    .filter(({ text }) => !expand(text).length)
    .filter(({ text }) => !NOT_A_LABEL.some((re) => re.test(text)));
  if (!named.length) return null;
  named.sort((a, b) => (b.r.y - a.r.y) || (a.r.x - b.r.x));
  return named[0].text;
}

const slugOf = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// -> [{ id, label, VIEWBOX, NODES, LEGEND, EDGES }], and the warnings each band raised.
// `categories` is the core chart's, since this page draws no legend of its own.
export function extractPostFlows(pageContents, { knownEventIds = null, categories = null, corePage = null } = {}) {
  const warnings = [];
  const warn = (msg) => warnings.push(msg);

  const pages = readPages(pageContents);
  const target = pickPage(
    pages,
    (p) => p.page !== corePage && POST_TITLE.every((t) => squash(p.text).includes(squash(t))),
  );
  if (!target || target.paths.length < 50) return { postFlows: [], warnings, page: null };

  const boxes = boxesOf(target.paths);
  const bandEdges = [-Infinity, ...separatorCuts(target.runs, false), Infinity];
  const regions = [];
  let band = 0;
  // Top of the page down, so the communities come out in the order the figure prints them.
  for (let i = bandEdges.length - 1; i > 0; i -= 1) {
    const hi = bandEdges[i];
    const lo = bandEdges[i - 1];
    const inBand = (p) => within(midOf(p)[1], lo, hi);
    if (boxes.filter(inBand).length < MIN_REGION_BOXES) continue;
    const bandPaths = target.paths.filter(inBand);
    const bandRuns = target.runs.filter((r) => within(r.y, lo, hi));
    const colEdges = [-Infinity, ...separatorCuts(bandRuns, true), Infinity];
    band += 1;
    for (let k = 0; k < colEdges.length - 1; k += 1) {
      const left = colEdges[k];
      const right = colEdges[k + 1];
      const inCell = (p) => within(midOf(p)[0], left, right);
      if (boxes.filter(inBand).filter(inCell).length < MIN_REGION_BOXES) continue;
      const cell = bandPaths.filter(inCell);
      if (cell.length < MIN_REGION_PATHS) continue;
      const runs = bandRuns.filter((r) => within(r.x, left, right) && !isSeparator(r));
      // Which band it came from. Two communities drawn in one band are drawn together because
      // the publication treats them together, and that is worth keeping: it is the only thing
      // that relates one community's chart to another's.
      regions.push({ paths: cell, runs, band });
    }
  }

  const seen = {};
  const postFlows = [];
  regions.forEach((region, i) => {
    const label = regionLabel(region.runs) || `Chart ${i + 1}`;
    const chart = traceChart(region.paths, region.runs, { knownEventIds, categories, warn });
    if (chart.NODES.length < 2) return;
    let id = slugOf(label) || `chart-${i + 1}`;
    seen[id] = (seen[id] || 0) + 1;
    if (seen[id] > 1) id = `${id}-${seen[id]}`;
    const { VIEWBOX, NODES, LEGEND, EDGES } = chart;
    postFlows.push({ id, label, band: region.band, VIEWBOX, NODES, LEGEND, EDGES });
  });
  return { postFlows, warnings, page: target.page };
}
