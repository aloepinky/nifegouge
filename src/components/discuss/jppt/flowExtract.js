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

const TITLE = 'COMPLETE COURSE FLOW';
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
  return { ops: [], pts: [], paint: null, clip: false, lw: 0.0, order: 0 };
}

const sigOf = (p) => p.ops.join(' ');

function bboxOf(p) {
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
      stack.push([ctm, lw]);
    } else if (op === 'Q') {
      if (stack.length) [ctm, lw] = stack.pop();
    } else if (op === 'cm') {
      const v = nums(6);
      if (v) ctm = mul(v, ctm);
    } else if (op === 'w') {
      const v = nums(1);
      if (v) lw = v[0];
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
        const [ox, oy] = apply(mul(tm, ctm), 0.0, 0.0);
        runs.push({ x: ox, y: oy, text, order });
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
};

function shapeOf(path) {
  const name = SHAPE_SIG[sigOf(path)];
  if (!name) return null;
  if (name === 'ellipse') {
    const [, , w, h] = bboxOf(path);
    if (w < 25 && h < 25) return 'circle';
  }
  return name;
}

function classify(paths) {
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
    if (STROKE_OPS.has(p.paint)) {
      const shape = shapeOf(p);
      if (shape && w >= 10.0 && w <= 60.0 && h >= 10.0 && h <= 25.0) {
        nodes.push([p, shape]);
        return;
      }
      if (p.ops.every((o) => o === 'm' || o === 'l') && p.pts.length >= 2) {
        connectors.push(p);
        return;
      }
      // A connector that hops over another with a little arc: the arc's two ends sit on the
      // line and its midpoint off it. Flatten the hop and keep the line.
      if (p.ops.every((o) => o === 'm' || o === 'l' || o === 'c') && p.ops.includes('l') && p.pts.length >= 3) {
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

export const CATEGORY_SLUG = {
  Flight: 'flight',
  'Check Flight': 'check',
  Simulator: 'sim',
  'Ground Training': 'ground',
  'CAI Test': 'cai',
  'Flt Support': 'support',
  'P/P Exam': 'exam',
  'Flow Connector': 'jump',
};

function inside(bbox, x, y, pad = 0.0) {
  const [bx, by, bw, bh] = bbox;
  return bx - pad <= x && x <= bx + bw + pad && by - pad <= y && y <= by + bh + pad;
}

function attachLabels(nodes, runs) {
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

function deriveCategories(labelled, leftover, warn) {
  const captions = [];
  const used = new Set();
  const isCaption = (t) => Object.prototype.hasOwnProperty.call(CATEGORY_SLUG, t);
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
      if (Math.abs(q.x - r.x) > 2.0 || r.y - q.y <= 0 || r.y - q.y > 12.0) return;
      const t = pyStrip(`${pyStrip(r.text)} ${pyStrip(q.text)}`.replace(PY_SPACE, ' '));
      if (!isCaption(t)) return;
      captions.push([(r.y + q.y) / 2.0, t, r.x]);
      used.add(i);
      used.add(j);
    });
  });
  const keys = labelled.filter((n) => !n.label);
  const mapping = {};
  const pairs = [];
  captions.forEach(([y, text, x]) => {
    let best = null;
    let bestd = 1e9;
    keys.forEach((k) => {
      const [kx, ky, , kh] = bboxOf(k.path);
      const d = Math.abs((ky + kh / 2.0) - y);
      if (kx > x) return;
      if (d < bestd) {
        best = k;
        bestd = d;
      }
    });
    if (best === null || bestd > 12.0) {
      warn(`Legend caption "${text}" found no key shape.`);
      return;
    }
    const kind = CATEGORY_SLUG[text];
    mapping[keyOf(best.shape, best.path.lw)] = kind;
    pairs.push([text, kind, best]);
  });
  return [mapping, pairs];
}

// The kind of a chart box, from the legend. A box whose shape and stroke weight the legend
// draws is that caption. Where the legend is no help — it draws two captions of one shape
// with the same weight (Echo's Ground Training and P/P Exam are both thin), or the chart uses
// a weight the legend never draws — the shape's captions are taken in legend order, top to
// bottom, and the chart's weights for that shape in order, thin to thick: the publication
// lists the lighter stroke first.
function categoryMapper(mapping, pairs, labelled, warn) {
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
      bands.forEach((b, i) => { ranked[shape][b] = entries[Math.min(i, entries.length - 1)].kind; });
      const names = entries.map((e) => `"${e.text}"`).join(' and ');
      warn(`The legend does not tell ${names} apart by stroke weight; the chart's ${shape === 'ellipse' ? 'ellipses' : `${shape} boxes`} were sorted by weight, lightest first.`);
    }
    return ranked[shape][keyOf(shape, lw).split('|')[1]];
  };
}

// ---------------------------------------------------------------------------------------
// Label -> event ids
// ---------------------------------------------------------------------------------------

const RANGE_RE = /^([A-Z]+)(\d+)([A-Z]?)(?:-(\d+))?$/;

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
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const seg = Math.hypot(dx, dy);
    if (seg < 1e-6) continue;
    const t = ((point[0] - ax) * dx + (point[1] - ay) * dy) / (seg * seg);
    if (t < -0.02 || t > 1.02) continue;
    if (dist(point, [ax + t * dx, ay + t * dy]) <= tol) return true;
  }
  return false;
}

function chain(segsIn, nodeMids) {
  let segs = segsIn;
  let joins = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < segs.length; i += 1) {
      for (const ei of [0, -1]) {
        const pt = ei === 0 ? segs[i][0] : segs[i][segs[i].length - 1];
        if (nearestNode(pt, nodeMids, EDGE_SNAP)) continue;
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

function resolveEdges(nodes, connectors, arrows) {
  const nodeMids = nodes.map((n) => [n.id, edgeMidpoints(n.bbox)]);
  const heads = arrows.map((a) => [
    a.pts.reduce((s, p) => s + p[0], 0) / a.pts.length,
    a.pts.reduce((s, p) => s + p[1], 0) / a.pts.length,
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
      const { pts } = arrows[i];
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
      if (end) return { id: end[0], tail: rest };
      const onward = hostTarget(j, rest[rest.length - 1], depth + 1);
      return onward ? { id: onward.id, tail: rest.concat(onward.tail) } : null;
    }
    return null;
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
    if (r.headA || r.headB || r.outA || r.outB) {
      const forward = r.headB && !r.headA ? true : r.headA ? false : r.outA;
      const start = forward ? pts[0] : pts[pts.length - 1];
      const end = forward ? pts[pts.length - 1] : pts[0];
      const endApex = forward ? r.apexB : r.apexA;
      src = forward ? aId : bId;
      dst = forward ? bId : aId;
      order = forward ? [...pts] : [...pts].reverse();
      if (src === null) src = hostSource(i, start);
      // A stub too short to clear its own box snaps both ends to it (Delta's FAM1204 is
      // 3.5 pt long); the arrow leaves the box, so its far end is wherever it joins.
      if (dst !== null && dst === src) dst = null;
      if (dst === null) {
        const joined = hostTarget(i, end) || (endApex && hostTarget(i, endApex));
        if (joined) {
          dst = joined.id;
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
          dst = joined.id;
          order = (aId ? [...pts] : [...pts].reverse()).concat(joined.tail);
        }
      }
    }
    if (src === undefined) {
      if (aId === null) aId = hostSource(i, pts[0]);
      if (bId === null) bId = hostSource(i, pts[pts.length - 1]);
      if (bId && !aId) {
        src = aId;
        dst = bId;
        order = [...pts];
      } else {
        src = bId;
        dst = aId;
        order = [...pts].reverse();
      }
    }
    if (!src || !dst || src === dst) {
      unresolved.push([r, src, dst]);
      return;
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

// -> { VIEWBOX, NODES, LEGEND, EDGES, warnings, page } or throws with a reason to show.
export function extractFlow(pageContents, { knownEventIds = null } = {}) {
  const warnings = [];
  const warn = (msg) => warnings.push(msg);

  let target = null;
  pageContents.forEach((buf, index) => {
    const [paths, runs] = interpret(buf);
    const text = runs.map((r) => r.text).join('');
    if (!text.replace(/ /g, '').includes(TITLE.replace(/ /g, ''))) return;
    if (target === null || paths.length > target.paths.length) target = { page: index + 1, paths, runs };
  });
  if (!target) throw new Error(`No page titled "${TITLE}" was found in this PDF.`);
  if (target.paths.length < 50) {
    throw new Error(`"${TITLE}" appears on page ${target.page}, but nothing is drawn there. The chart may be a scanned image, which cannot be traced.`);
  }

  const [nodesRaw, arrows, connectors] = classify(target.paths);
  const [labelled, leftover] = attachLabels(nodesRaw, target.runs);
  const [mapping, pairs] = deriveCategories(labelled, leftover, warn);
  if (pairs.length < Object.keys(CATEGORY_SLUG).length) {
    warn(`The legend keyed ${pairs.length} of ${Object.keys(CATEGORY_SLUG).length} box categories.`);
  }

  const legend = pairs.map(([text, kind, key]) => ({
    kind, label: text, shape: key.shape, bbox: bboxOf(key.path),
  }));

  const kindFor = categoryMapper(mapping, pairs, labelled, warn);
  const nodes = [];
  const jumpSeen = {};
  const missing = [];
  labelled.forEach((n) => {
    if (!n.label) return;
    let kind = kindFor(n.shape, n.path.lw);
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
      const events = expand(n.label);
      if (!events.length) warn(`Cannot read box label "${n.label}" as event ids.`);
      rec.events = events;
      if (events.length) rec.block = blockOf(events[0]);
      if (knownEventIds) events.forEach((e) => { if (!knownEventIds.has(e)) missing.push([n.label, e]); });
    }
    nodes.push(rec);
  });
  missing.forEach(([label, e]) => warn(`Box ${label} names ${e}, which the syllabus text does not list.`));

  const [edges, unresolved] = resolveEdges(nodes, connectors, arrows);
  unresolved.forEach(([, src, dst]) => {
    warn(`A connector could not be resolved (${src || '?'} to ${dst || '?'}). Draw it in the editor.`);
  });

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
    return { kind: k.kind, label: k.label, shape: k.shape, x: num(x), y: num(flip(y, h)), w: num(w), h: num(h) };
  });
  const EDGES = edges.map((e) => ({
    from: e.from,
    to: e.to,
    points: e.points.map(([px, py]) => [num(px), num(flip(py, 0))]),
  }));

  return { VIEWBOX, NODES, LEGEND, EDGES, warnings, page: target.page };
}
