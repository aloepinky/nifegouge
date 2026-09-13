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
    }
    other.push(p);
  });
  return [nodes, arrows, connectors, other];
}

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
  leftover.forEach((r) => {
    const t = pyStrip(r.text);
    if (Object.prototype.hasOwnProperty.call(CATEGORY_SLUG, t)) captions.push([r.y, t, r.x]);
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

// Delta's three hand-resolved connectors. See REPAIRS in the Python for each one's reason. On
// any other JPPT they match nothing, and the flow editor is where those connectors get fixed.
const REPAIRS = [
  {
    at: [367.0, 619.9],
    why: 'FAM1206 ends on another connector rather than on a box.',
    from: 'FAM1206',
    to: 'FAM4490',
    points: [[367.0, 619.9], [367.0, 597.0], [308.8, 597.0]],
  },
  {
    at: [358.1, 366.1],
    why: 'FAM1204 joins the collector that also carries I6201-2.',
    from: 'FAM1204',
    to: 'I4101-3',
    points: [[358.1, 366.1], [367.0, 366.1], [367.0, 449.1], [376.6, 449.1]],
  },
  {
    at: [474.0, 275.6],
    why: 'Redundant trunk off jump-F-3.',
    drop: true,
  },
];

// Unlike the Python, a repair that matches nothing is reported only when another one did: on a
// JPPT other than Delta none will, and three warnings about Delta's figure would be noise.
function applyRepairs(unresolved) {
  const edges = [];
  const matched = new Set();
  const leftover = [];
  unresolved.forEach((item) => {
    const { pts } = item[0];
    let hit = null;
    for (let i = 0; i < REPAIRS.length; i += 1) {
      if (Math.min(dist(REPAIRS[i].at, pts[0]), dist(REPAIRS[i].at, pts[pts.length - 1])) <= 1.0) {
        hit = i;
        break;
      }
    }
    if (hit === null) {
      leftover.push(item);
      return;
    }
    matched.add(hit);
    const rep = REPAIRS[hit];
    if (!rep.drop) edges.push({ from: rep.from, to: rep.to, points: rep.points.map((p) => [...p]) });
  });
  const unmatched = matched.size ? REPAIRS.filter((r, i) => !matched.has(i)) : [];
  return [edges, unmatched, leftover];
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

  const [segs] = chain(connectors.map((p) => [...p.pts]), nodeMids);

  const raw = segs.map((pts) => {
    const a = pts[0];
    const b = pts[pts.length - 1];
    return {
      pts,
      a: nearestNode(a, nodeMids, EDGE_SNAP),
      b: nearestNode(b, nodeMids, EDGE_SNAP),
      headA: heads.some((h) => dist(h, a) <= ARROW_SNAP),
      headB: heads.some((h) => dist(h, b) <= ARROW_SNAP),
    };
  });

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

  const edges = [];
  const unresolved = [];
  raw.forEach((r, i) => {
    const { pts } = r;
    let aId = r.a ? r.a[0] : null;
    let bId = r.b ? r.b[0] : null;
    if (aId === null) aId = hostSource(i, pts[0]);
    if (bId === null) bId = hostSource(i, pts[pts.length - 1]);

    let src;
    let dst;
    let order;
    if (r.headB || (!r.headA && bId && !aId)) {
      src = aId;
      dst = bId;
      order = [...pts];
    } else {
      src = bId;
      dst = aId;
      order = [...pts].reverse();
    }
    if (!src || !dst || src === dst) {
      unresolved.push([r, src, dst]);
      return;
    }
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

  const nodes = [];
  const jumpSeen = {};
  const missing = [];
  labelled.forEach((n) => {
    if (!n.label) return;
    let kind = mapping[keyOf(n.shape, n.path.lw)];
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
  const [repaired, unmatched, left] = applyRepairs(unresolved);
  edges.push(...repaired);
  unmatched.forEach((rep) => warn(`Repair at (${rep.at[0]}, ${rep.at[1]}) matched nothing. ${rep.why}`));
  left.forEach(([, src, dst]) => {
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
