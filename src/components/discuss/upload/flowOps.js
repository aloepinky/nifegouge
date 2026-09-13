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
function dragEnds(edges, id, dx, dy) {
  return edges.map((e) => {
    if (e.from !== id && e.to !== id) return e;
    const pts = e.points.map((p) => [...p]);
    const shift = (i, j) => {
      const [x0, y0] = pts[i];
      if (pts[j]) {
        if (pts[j][1] === y0) pts[j][1] = num(pts[j][1] + dy);
        else if (pts[j][0] === x0) pts[j][0] = num(pts[j][0] + dx);
      }
      pts[i] = [num(x0 + dx), num(y0 + dy)];
    };
    if (e.from === id && e.to === id) return e;
    if (e.from === id) shift(0, pts.length > 2 ? 1 : null);
    if (e.to === id) shift(pts.length - 1, pts.length > 2 ? pts.length - 2 : null);
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

export function movePoint(doc, edgeIndex, pointIndex, x, y) {
  const flow = doc.flow;
  return setFlow(doc, {
    ...flow,
    EDGES: flow.EDGES.map((e, i) => (i !== edgeIndex ? e : {
      ...e,
      points: e.points.map((p, j) => (j === pointIndex ? [snap(x), snap(y)] : p)),
    })),
  });
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
    EDGES: flow.EDGES.map((e, i) => (i !== index ? e : { from: e.to, to: e.from, points: [...e.points].reverse() })),
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
  const drawn = new Set(nodes.flatMap((n) => n.events || []));
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
