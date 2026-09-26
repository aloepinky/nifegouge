import { expand, blockOf, num } from '../jppt/flowExtract';

// The flow editor's operations, as pure functions over a syllabus document. Every one returns
// a new document and leaves its input alone, which is what lets the editor keep an undo
// history of whole documents without copying defensively.

export const KINDS = [
  ['flight', 'Flight'],
  ['check', 'Check Flight'],
  ['sim', 'Simulator'],
  ['ground', 'Ground Training'],
  ['cai', 'CAI Test'],
  ['support', 'Flt Support'],
  ['exam', 'P/P Exam'],
];

const snap = (v) => Math.round(v * 2) / 2;

function setFlow(doc, flow) {
  return { ...doc, flow: withRoles(flow) };
}

// A connector circle is an entrance or an exit by which way its arrows run — derived, exactly
// as the tracer derives it, so an edited chart never carries a stale role.
export function withRoles(flow) {
  const edges = flow.EDGES || [];
  return {
    ...flow,
    NODES: flow.NODES.map((n) => {
      if (n.kind !== 'jump') return n;
      const incoming = edges.some((e) => e.to === n.id);
      const outgoing = edges.some((e) => e.from === n.id);
      const role = incoming && !outgoing ? 'entrance' : outgoing && !incoming ? 'exit' : 'both';
      return n.role === role ? n : { ...n, role };
    }),
  };
}

// The viewBox the tracer would compute: everything drawn, plus 4 pt.
export function fitViewBox(flow) {
  const xs = [];
  const ys = [];
  const x1 = [];
  const y1 = [];
  [...(flow.NODES || []), ...(flow.LEGEND || [])].forEach((n) => {
    xs.push(n.x); ys.push(n.y); x1.push(n.x + n.w); y1.push(n.y + n.h);
  });
  (flow.EDGES || []).forEach((e) => e.points.forEach(([x, y]) => {
    xs.push(x); x1.push(x); ys.push(y); y1.push(y);
  }));
  if (!xs.length) return flow.VIEWBOX || '0 0 400 300';
  const pad = 4;
  const vx = Math.min(...xs) - pad;
  const vy = Math.min(...ys) - pad;
  return [vx, vy, Math.max(...x1) + pad - vx, Math.max(...y1) + pad - vy].map(num).join(' ');
}

// An edge end is attached to a box when the box is its from/to. Moving the box drags that end
// and the coordinate of its neighbour that keeps the first segment axis-aligned.
//
// A JOINED end is the exception: it sits on another arrow rather than on the box its `from` or
// `to` names, so moving that box must leave it where it is. See `joinEdge` for what the two
// flags mean.
function dragEnds(edges, id, dx, dy) {
  return edges.map((e) => {
    const head = e.from === id && !e.joinFrom;
    const tail = e.to === id && !e.joinTo;
    if (!head && !tail) return e;
    if (head && tail) return e;
    const pts = e.points.map((p) => [...p]);
    const shift = (i, j) => {
      const [x0, y0] = pts[i];
      if (pts[j]) {
        if (pts[j][1] === y0) pts[j][1] = num(pts[j][1] + dy);
        else if (pts[j][0] === x0) pts[j][0] = num(pts[j][0] + dx);
      }
      pts[i] = [num(x0 + dx), num(y0 + dy)];
    };
    if (head) shift(0, pts.length > 2 ? 1 : null);
    if (tail) shift(pts.length - 1, pts.length > 2 ? pts.length - 2 : null);
    return { ...e, points: pts };
  });
}

export function moveNode(doc, id, dx, dy) {
  const sx = snap(dx);
  const sy = snap(dy);
  if (!sx && !sy) return doc;
  const flow = doc.flow;
  return setFlow(doc, {
    ...flow,
    NODES: flow.NODES.map((n) => (n.id === id ? { ...n, x: num(n.x + sx), y: num(n.y + sy) } : n)),
    EDGES: dragEnds(flow.EDGES, id, sx, sy),
  });
}

export function resizeNode(doc, id, corner, dx, dy) {
  const flow = doc.flow;
  return setFlow(doc, {
    ...flow,
    NODES: flow.NODES.map((n) => {
      if (n.id !== id) return n;
      let { x, y, w, h } = n;
      if (corner.includes('e')) w = Math.max(10, snap(w + dx));
      if (corner.includes('s')) h = Math.max(10, snap(h + dy));
      if (corner.includes('w')) {
        const nw = Math.max(10, snap(w - dx));
        x = num(x + (w - nw));
        w = nw;
      }
      if (corner.includes('n')) {
        const nh = Math.max(10, snap(h - dy));
        y = num(y + (h - nh));
        h = nh;
      }
      if (n.kind === 'jump') h = w;
      return { ...n, x, y, w, h };
    }),
  });
}

const near = (a, b) => Math.abs(a - b) <= 0.05;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// An end of a connector belongs to the box it is attached to, so it slides along that box's
// sides rather than leaving them. The side is whichever one the wanted position is nearest,
// which is what lets a drag take an end round a corner onto another side instead of stopping
// dead at the one it started on.
// Near the middle of a side, an end settles ON the middle. That is where the publication
// attaches nearly every arrow, and without it an end left a couple of tenths off centre looks
// wrong against the boxes above and below it and cannot be fixed by eye.
//
// It applies only to the end somebody is DRAGGING. An end being carried along by a corner's
// squaring has to land exactly where that leaves it, or the snap pulls it off the line it was
// just straightened onto and puts the bend straight back.
const MIDDLE_SNAP = 3.5;
const toMiddle = (v, lo, hi) => {
  const mid = (lo + hi) / 2;
  return Math.abs(v - mid) <= MIDDLE_SNAP ? mid : clamp(v, lo, hi);
};

function onBoxSide(node, [x, y], dragged = false) {
  if (!node) return [x, y];
  const { x: bx, y: by, w, h } = node;
  const fit = dragged ? toMiddle : clamp;
  const sides = [
    [Math.abs(x - bx), [bx, fit(y, by, by + h)]],
    [Math.abs(x - (bx + w)), [bx + w, fit(y, by, by + h)]],
    [Math.abs(y - by), [fit(x, bx, bx + w), by]],
    [Math.abs(y - (by + h)), [fit(x, bx, bx + w), by + h]],
  ];
  return sides.reduce((best, cur) => (cur[0] < best[0] ? cur : best))[1];
}

// Every segment of a connector in these figures runs vertically or horizontally. So a corner
// takes its neighbours with it rather than leaving a diagonal behind: the segment keeps the
// axis it had and the neighbour follows on the other one. A segment the tracer left slightly
// off-axis is squared by the same rule, which is how a crooked one gets straightened.
function square(pts, j, i, was) {
  const flat = Math.abs(was[j][1] - was[i][1]) <= Math.abs(was[j][0] - was[i][0]);
  return flat ? [pts[j][0], pts[i][1]] : [pts[i][0], pts[j][1]];
}

// The ends put back on their boxes, after whatever the squaring did to them. `dragged` is the
// point in hand, if it is one of them. A joined end belongs to another arrow rather than to the
// box its `from`/`to` names, so it is left wherever it has been put.
function seatEnds(pts, edge, flow, dragged = -1) {
  const last = pts.length - 1;
  const at = (id) => flow.NODES.find((n) => n.id === id);
  const out = pts.map((p) => [...p]);
  if (!edge.joinFrom) out[0] = onBoxSide(at(edge.from), out[0], dragged === 0);
  if (last > 0 && !edge.joinTo) out[last] = onBoxSide(at(edge.to), out[last], dragged === last);
  return out;
}

const withPoints = (doc, edgeIndex, points) => setFlow(doc, {
  ...doc.flow,
  EDGES: doc.flow.EDGES.map((e, i) => (i === edgeIndex
    ? { ...e, points: points.map(([x, y]) => [num(x), num(y)]) }
    : e)),
});

export function movePoint(doc, edgeIndex, pointIndex, x, y) {
  const flow = doc.flow;
  const edge = flow.EDGES[edgeIndex];
  if (!edge) return doc;
  const was = edge.points;
  const pts = was.map((p) => [...p]);
  const last = pts.length - 1;
  pts[pointIndex] = [snap(x), snap(y)];
  if (pointIndex > 0) pts[pointIndex - 1] = square(pts, pointIndex - 1, pointIndex, was);
  if (pointIndex < last) pts[pointIndex + 1] = square(pts, pointIndex + 1, pointIndex, was);
  return withPoints(doc, edgeIndex, seatEnds(pts, edge, flow, pointIndex));
}

// A corner added at the middle of a segment, so a connector can be taken round something.
export function addPoint(doc, edgeIndex, segIndex) {
  const edge = doc.flow.EDGES[edgeIndex];
  if (!edge || segIndex < 0 || segIndex >= edge.points.length - 1) return doc;
  const [ax, ay] = edge.points[segIndex];
  const [bx, by] = edge.points[segIndex + 1];
  const mid = [snap((ax + bx) / 2), snap((ay + by) / 2)];
  return withPoints(doc, edgeIndex, [
    ...edge.points.slice(0, segIndex + 1), mid, ...edge.points.slice(segIndex + 1),
  ]);
}

// The one straight line between two boxes, where there is one: their sides can only be joined
// without a corner where the boxes overlap on an axis, and the line runs down the middle of
// that overlap.
function straightBetween(a, b) {
  const lx = Math.max(a.x, b.x);
  const rx = Math.min(a.x + a.w, b.x + b.w);
  if (lx <= rx) {
    const x = snap((lx + rx) / 2);
    return b.y >= a.y + a.h ? [[x, a.y + a.h], [x, b.y]] : [[x, a.y], [x, b.y + b.h]];
  }
  const ty = Math.max(a.y, b.y);
  const by = Math.min(a.y + a.h, b.y + b.h);
  if (ty <= by) {
    const y = snap((ty + by) / 2);
    return b.x >= a.x + a.w ? [[a.x + a.w, y], [b.x, y]] : [[a.x, y], [b.x + b.w, y]];
  }
  return null;
}

// Only a corner comes out: the two ends belong to their boxes and stay. What the corner joined
// is squared up afterwards, so taking a jog out does not leave a diagonal where it was.
//
// Taking out the LAST corner is refused where it cannot be done squarely. Two boxes set on the
// diagonal from each other have no straight line between them, so removing it could only leave
// a slanted one, and an arrow in these figures is never slanted. The editor asks this function
// whether it would do anything and greys the control when it would not, so the rule lives here
// and not in two places.
export function removePoint(doc, edgeIndex, pointIndex) {
  const flow = doc.flow;
  const edge = flow.EDGES[edgeIndex];
  if (!edge || pointIndex <= 0 || pointIndex >= edge.points.length - 1) return doc;
  const was = edge.points.filter((_, i) => i !== pointIndex);
  const pts = was.map((p) => [...p]);
  const j = pointIndex - 1;
  const k = pointIndex;
  if (k <= pts.length - 1 && !near(pts[j][0], pts[k][0]) && !near(pts[j][1], pts[k][1])) {
    // Only a middle point may be moved to square the join; an end is its box's.
    if (k !== pts.length - 1) pts[k] = square(pts, k, j, was);
    else if (j !== 0) pts[j] = square(pts, j, k, was);
    else if (edge.joinTo) pts[k] = square(pts, k, j, was);
    else if (edge.joinFrom) pts[j] = square(pts, j, k, was);
    else {
      // Both are ends on boxes, so nothing between them can be moved: the arrow has to be
      // re-laid as the one straight line its two boxes allow, or left alone. A joined end,
      // handled just above, is not on a box and so is free to be the one that moves.
      const at = (id) => flow.NODES.find((n) => n.id === id);
      const straight = straightBetween(at(edge.from), at(edge.to));
      if (!straight) return doc;
      return withPoints(doc, edgeIndex, straight);
    }
  }
  return withPoints(doc, edgeIndex, seatEnds(pts, edge, flow));
}

export function updateNode(doc, id, patch) {
  const flow = doc.flow;
  return setFlow(doc, {
    ...flow,
    NODES: flow.NODES.map((n) => (n.id === id ? { ...n, ...patch } : n)),
  });
}

function uniqueId(flow, base) {
  const ids = new Set(flow.NODES.map((n) => n.id));
  if (!ids.has(base)) return base;
  let i = 2;
  while (ids.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

// A box's id follows its label, as the tracer's does, so long as the new one is free. Edges are
// renamed with it.
export function relabelNode(doc, id, label) {
  const flow = doc.flow;
  const node = flow.NODES.find((n) => n.id === id);
  if (!node) return doc;
  let nextId = id;
  if (node.kind !== 'jump' && label && label !== id) {
    nextId = uniqueId({ NODES: flow.NODES.filter((n) => n.id !== id) }, label);
  }
  const events = node.kind === 'jump' ? undefined : expand(label);
  return setFlow(doc, {
    ...flow,
    NODES: flow.NODES.map((n) => {
      if (n.id !== id) return n;
      const next = { ...n, id: nextId, label };
      if (node.kind === 'jump') next.letter = label;
      else if (events.length) {
        next.events = events;
        next.block = blockOf(events[0]);
      }
      return next;
    }),
    EDGES: flow.EDGES.map((e) => ({
      ...e,
      from: e.from === id ? nextId : e.from,
      to: e.to === id ? nextId : e.to,
    })),
  });
}

export function addNode(doc, kind) {
  const flow = doc.flow;
  const [vx, vy, vw, vh] = (flow.VIEWBOX || '0 0 400 300').split(' ').map(Number);
  const jump = kind === 'jump';
  const id = uniqueId(flow, jump ? 'jump-A' : 'NEW');
  const node = jump
    ? { id, label: 'A', x: num(vx + vw / 2), y: num(vy + vh / 2), w: 15, h: 15, kind: 'jump', letter: 'A', role: 'both' }
    : { id, label: id, x: num(vx + vw / 2), y: num(vy + vh / 2), w: 45, h: 15, kind };
  return [setFlow(doc, { ...flow, NODES: [...flow.NODES, node] }), id];
}

export function removeNode(doc, id) {
  const flow = doc.flow;
  return setFlow(doc, {
    ...flow,
    NODES: flow.NODES.filter((n) => n.id !== id),
    EDGES: flow.EDGES.filter((e) => e.from !== id && e.to !== id),
  });
}

export function removeEdge(doc, index) {
  const flow = doc.flow;
  return setFlow(doc, { ...flow, EDGES: flow.EDGES.filter((e, i) => i !== index) });
}

export function reverseEdge(doc, index) {
  const flow = doc.flow;
  return setFlow(doc, {
    ...flow,
    EDGES: flow.EDGES.map((e, i) => (i !== index ? e : {
      ...e,
      from: e.to,
      to: e.from,
      // Whichever end sat on another arrow still does; it is now the other one.
      joinFrom: e.joinTo || undefined,
      joinTo: e.joinFrom || undefined,
      points: [...e.points].reverse(),
    })),
  });
}

// An orthogonal route between facing sides: across then down for boxes side by side, down
// then across for boxes stacked, the way the publication draws its connectors.
export function connect(doc, fromId, toId) {
  const flow = doc.flow;
  const a = flow.NODES.find((n) => n.id === fromId);
  const b = flow.NODES.find((n) => n.id === toId);
  if (!a || !b || a === b) return doc;
  const ac = [a.x + a.w / 2, a.y + a.h / 2];
  const bc = [b.x + b.w / 2, b.y + b.h / 2];
  let points;
  if (Math.abs(bc[0] - ac[0]) >= Math.abs(bc[1] - ac[1])) {
    const right = bc[0] >= ac[0];
    const s = [right ? a.x + a.w : a.x, ac[1]];
    const t = [right ? b.x : b.x + b.w, bc[1]];
    const mx = (s[0] + t[0]) / 2;
    points = s[1] === t[1] ? [s, t] : [s, [mx, s[1]], [mx, t[1]], t];
  } else {
    const down = bc[1] >= ac[1];
    const s = [ac[0], down ? a.y + a.h : a.y];
    const t = [bc[0], down ? b.y : b.y + b.h];
    const my = (s[1] + t[1]) / 2;
    points = s[0] === t[0] ? [s, t] : [s, [s[0], my], [t[0], my], t];
  }
  const edge = { from: fromId, to: toId, points: points.map(([x, y]) => [num(x), num(y)]) };
  return setFlow(doc, { ...flow, EDGES: [...flow.EDGES, edge] });
}

// Which length of a route a point falls on.
function nearestOn(points, [px, py]) {
  let best = { index: 0, d: Infinity };
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = (dx * dx) + (dy * dy);
    const t = len ? Math.max(0, Math.min(1, (((px - ax) * dx) + ((py - ay) * dy)) / len)) : 0;
    const d = Math.hypot(px - (ax + (t * dx)), py - (ay + (t * dy)));
    if (d < best.d) best = { index: i, d };
  }
  return best;
}

// Where along a length of another arrow a branch should meet it. One coordinate is fixed — the
// branch has to be ON the arrow — and the free one runs along it. Put that one level with the
// box's own centre, which makes the branch a single straight line, wherever the length reaches
// that far: that is how the publication draws the stub into the B connector, straight out of
// the side of the trunk below G0701-2. Where the length does not reach, its MIDDLE is the tidy
// answer, so two branches onto one trunk meet it at the same place and neither lands wherever
// the click happened to fall.
function joinFoot(points, index, node) {
  const [ax, ay] = points[index];
  const [bx, by] = points[index + 1];
  const vertical = Math.abs(bx - ax) <= Math.abs(by - ay);
  // Only the free coordinate is snapped to the grid. The other one is the arrow's own, taken
  // exactly: rounded to a half unit it would sit a tenth beside the line instead of on it.
  if (vertical) {
    const c = node.y + (node.h / 2);
    const inside = c >= Math.min(ay, by) && c <= Math.max(ay, by);
    return { foot: [ax, snap(inside ? c : (ay + by) / 2)], vertical };
  }
  const c = node.x + (node.w / 2);
  const inside = c >= Math.min(ax, bx) && c <= Math.max(ax, bx);
  return { foot: [snap(inside ? c : (ax + bx) / 2), ay], vertical };
}

// A square route between a box and a point on another arrow, meeting that arrow at RIGHT
// ANGLES: a branch onto a vertical trunk arrives horizontally, one onto a horizontal trunk
// arrives from above or below. Anything else would run alongside the trunk and read as two
// arrows drawn on top of each other. Returned box end first.
function routeJoin(node, [fx, fy], hostVertical) {
  const cx = node.x + (node.w / 2);
  const cy = node.y + (node.h / 2);
  if (hostVertical) {
    const side = fx >= cx ? node.x + node.w : node.x;
    if (near(cy, fy)) return [[side, cy], [fx, fy]];
    // Dead in line with the trunk: step out of a side first, since coming straight down it
    // would meet the trunk end-on.
    if (near(cx, fx)) return [[side, cy], [side, fy], [fx, fy]];
    const ey = fy >= cy ? node.y + node.h : node.y;
    return [[cx, ey], [cx, fy], [fx, fy]];
  }
  const ey = fy >= cy ? node.y + node.h : node.y;
  if (near(cx, fx)) return [[cx, ey], [fx, fy]];
  if (near(cy, fy)) return [[cx, ey], [fx, ey], [fx, fy]];
  const ex = fx >= cx ? node.x + node.w : node.x;
  return [[ex, cy], [fx, cy], [fx, fy]];
}

// ---- arrows that meet other arrows -------------------------------------------------------
//
// The publication draws plenty of connectors that never touch a second box. I3501-2 on the
// E-2D chart runs down and puts its head on the trunk between I3401-2 and I4401-3; the stub
// into the B connector beside FAM2101-3 comes out of the middle of the trunk below G0701-2.
// Both are ordinary steps in the flow drawn short, and the editor has to be able to say them.
//
// What is stored is still a step from one BOX to another: `from` and `to` name boxes in every
// case, so the chart, `orderBlocks` and `checks` go on reading an arrow the one way they always
// have. The flags say only that one END of the drawn line sits on another arrow instead of on
// the box it names, which is what stops that end being seated on the box or dragged along with
// it:
//
//   joinTo   — the head lands on another arrow. `to` is that arrow's own destination, because
//              the flow carries on down the trunk from there.
//   joinFrom — the tail leaves another arrow. `from` is that arrow's own source.

// An arrow from a box that puts its head on another arrow.
export function joinEdge(doc, fromId, hostIndex, at) {
  const flow = doc.flow;
  const host = flow.EDGES[hostIndex];
  const a = flow.NODES.find((n) => n.id === fromId);
  if (!host || !a || host.from === fromId || host.to === fromId) return doc;
  const { index } = nearestOn(host.points, at);
  const { foot, vertical } = joinFoot(host.points, index, a);
  const points = routeJoin(a, foot, vertical);
  const edge = { from: fromId, to: host.to, joinTo: true, points: points.map(([x, y]) => [num(x), num(y)]) };
  return setFlow(doc, { ...flow, EDGES: [...flow.EDGES, edge] });
}

// An arrow that leaves another arrow and runs to a box.
export function branchEdge(doc, hostIndex, at, toId) {
  const flow = doc.flow;
  const host = flow.EDGES[hostIndex];
  const b = flow.NODES.find((n) => n.id === toId);
  if (!host || !b || host.from === toId || host.to === toId) return doc;
  const { index } = nearestOn(host.points, at);
  const { foot, vertical } = joinFoot(host.points, index, b);
  const points = routeJoin(b, foot, vertical).reverse();
  const edge = { from: host.from, to: toId, joinFrom: true, points: points.map(([x, y]) => [num(x), num(y)]) };
  return setFlow(doc, { ...flow, EDGES: [...flow.EDGES, edge] });
}

export function fit(doc) {
  return { ...doc, flow: { ...doc.flow, VIEWBOX: fitViewBox(doc.flow) } };
}

// ---- the block behind a box ------------------------------------------------------------

export function setBriefed(doc, blockId, briefed) {
  const block = doc.blocks.find((b) => b.id === blockId);
  if (!block) return doc;
  const blocks = doc.blocks.map((b) => (b.id === blockId ? { ...b, briefed } : b));
  // A block switched on needs an event row for each of its events, even an empty one, so every
  // event in it is a link.
  const have = new Set(doc.events.map((e) => e.id));
  const added = briefed
    ? block.events.filter((e) => !have.has(e.id)).map((e) => ({
      id: e.id,
      title: e.title || block.title,
      block: block.blkName || block.id,
      media: block.media || null,
      hours: block.hx != null ? block.hx : null,
      prereqs: block.prereqs || null,
      syllabusNotes: null,
      items: [],
    }))
    : [];
  return { ...doc, blocks, events: [...doc.events, ...added] };
}

export function updateBlock(doc, blockId, patch) {
  return { ...doc, blocks: doc.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) };
}

// A box naming a block the text never produced: add it, with the box's events, to a stage.
export function addBlockFor(doc, node, stageId) {
  if (!node.block || doc.blocks.some((b) => b.id === node.block)) return doc;
  const block = {
    id: node.block,
    stage: stageId,
    media: null,
    title: node.block,
    hours: null,
    events: (node.events || []).map((id) => ({ id })),
    briefed: false,
  };
  return { ...doc, blocks: [...doc.blocks, block] };
}

// What the editor lists under "Check before publishing". None of it blocks a save.
export function checks(doc) {
  const out = [];
  const nodes = doc.flow.NODES.filter((n) => n.kind !== 'jump');
  const blockIds = new Set(doc.blocks.map((b) => b.id));
  const eventIds = new Set(doc.blocks.flatMap((b) => b.events.map((e) => e.id)));
  // Whether a block is drawn is asked of EVERY chart the document carries. A syllabus that
  // splits draws the blocks after the split on its per-community charts, not on the course
  // flow, so counting only the course flow reports T32, T33, N01 and the rest as missing when
  // each is on the chart it belongs to. The checks below this one stay with the course flow,
  // which is the chart this editor edits.
  const charts = [doc.flow, ...(doc.postFlows || [])];
  const drawn = new Set(charts.flatMap((f) => (f.NODES || [])
    .filter((n) => n.kind !== 'jump')
    .flatMap((n) => n.events || [])));
  const nodeIds = new Set(doc.flow.NODES.map((n) => n.id));

  nodes.forEach((n) => {
    if (!n.block) out.push({ id: n.id, text: `${n.label}: no block. Set its label to event ids (FAM4301-4) or name the block.` });
    else if (!blockIds.has(n.block)) out.push({ id: n.id, text: `${n.label}: block ${n.block} is not in the syllabus text.` });
    (n.events || []).filter((e) => !eventIds.has(e)).forEach((e) => {
      out.push({ id: n.id, text: `${n.label}: ${e} is not in the syllabus text.` });
    });
  });
  doc.blocks.forEach((b) => {
    const missing = b.events.map((e) => e.id).filter((e) => !drawn.has(e));
    if (missing.length === b.events.length && b.events.length) {
      out.push({ text: `Block ${b.id} (${b.title}) has no box on the chart.` });
    } else if (missing.length) {
      out.push({ text: `Block ${b.id}: ${missing.join(', ')} not in any box.` });
    }
  });
  doc.flow.EDGES.forEach((e) => {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) out.push({ text: `An arrow from ${e.from} to ${e.to} is missing an end.` });
  });
  return out;
}
