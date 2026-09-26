import { addPoint, branchEdge, connect, joinEdge, moveNode, movePoint, removePoint } from './flowOps';

// The arrow-editing operations. Every segment of a connector in these figures runs vertically
// or horizontally, and before this the editor did nothing to keep it that way: dragging a
// corner moved that one point and left a diagonal either side of it, and there was no way to
// add a corner or take one out at all.

const node = (id, x, y) => ({ id, label: id, kind: 'flight', x, y, w: 40, h: 14 });

// A above B, and C off to the right of both.
const doc = () => ({
  blocks: [],
  events: [],
  flow: {
    VIEWBOX: '0 0 300 300',
    LEGEND: [],
    NODES: [node('A', 10, 10), node('B', 10, 200), node('C', 200, 100)],
    EDGES: [
      { from: 'A', to: 'B', points: [[30, 24], [30, 200]] },
      { from: 'A', to: 'C', points: [[50, 17], [120, 17], [120, 107], [200, 107]] },
    ],
  },
});

const edge = (d, i) => d.flow.EDGES[i].points;
const axial = (points) => points.slice(1).every(([x, y], i) => {
  const [px, py] = points[i];
  return Math.abs(x - px) < 0.051 || Math.abs(y - py) < 0.051;
});

describe('movePoint', () => {
  test('takes the neighbours with it, so the lines either side stay straight', () => {
    // The elbow at [120, 17] dragged right and a little down.
    const out = movePoint(doc(), 1, 1, 143, 20);
    const pts = edge(out, 1);
    expect(axial(pts)).toBe(true);
    // Its own position is what was asked for, on the half-unit grid.
    expect(pts[1]).toEqual([143, 20]);
    // The run into it was horizontal, so the end it came from follows on y...
    expect(pts[0][1]).toBe(20);
    // ...and the run out of it was vertical, so the next corner follows on x.
    expect(pts[2][0]).toBe(143);
  });

  // An end can only follow its neighbour as far as its own box reaches. Dragged past that it
  // stays on the box and its one segment goes slanted, which is the point at which the route
  // wants another corner — and a corner can now be added. Squaring it by moving the end off
  // the box would be worse: an arrow would no longer start where it says it does.
  test('an end follows only as far as its box, and then holds', () => {
    const out = movePoint(doc(), 1, 1, 143, 60);
    const pts = edge(out, 1);
    const a = doc().flow.NODES[0];
    expect(pts[0]).toEqual([a.x + a.w, a.y + a.h]);
    expect(pts[1]).toEqual([143, 60]);
    // Everything the end is not part of is still square.
    expect(axial(pts.slice(1))).toBe(true);
  });

  test('keeps an end on its own box', () => {
    // Dragging the first point far outside A leaves it on A's boundary.
    const out = movePoint(doc(), 0, 0, 500, 500);
    const [x, y] = edge(out, 0)[0];
    const a = doc().flow.NODES[0];
    const onEdge = x === a.x || x === a.x + a.w || y === a.y || y === a.y + a.h;
    expect(onEdge).toBe(true);
    expect(x).toBeGreaterThanOrEqual(a.x);
    expect(x).toBeLessThanOrEqual(a.x + a.w);
    expect(y).toBeGreaterThanOrEqual(a.y);
    expect(y).toBeLessThanOrEqual(a.y + a.h);
  });

  test('squares a segment the tracer left crooked', () => {
    const d = doc();
    d.flow.EDGES[1].points = [[50, 17], [120, 19], [122, 107], [200, 107]];
    expect(axial(movePoint(d, 1, 1, 120, 19).flow.EDGES[1].points)).toBe(true);
  });
});

describe('addPoint', () => {
  test('puts a corner at the middle of the length chosen', () => {
    const out = addPoint(doc(), 0, 0);
    expect(edge(out, 0)).toEqual([[30, 24], [30, 112], [30, 200]]);
  });

  test('leaves an out-of-range length alone', () => {
    expect(edge(addPoint(doc(), 0, 5), 0)).toHaveLength(2);
  });
});

describe('removePoint', () => {
  test('takes a corner out and squares up what it joined', () => {
    const out = removePoint(doc(), 1, 1);
    const pts = edge(out, 1);
    expect(pts).toHaveLength(3);
    expect(axial(pts)).toBe(true);
  });

  test('will not take out an end, which belongs to its box', () => {
    const d = doc();
    expect(edge(removePoint(d, 1, 0), 1)).toHaveLength(4);
    expect(edge(removePoint(d, 1, 3), 1)).toHaveLength(4);
  });
});

test('connect routes a new arrow squarely', () => {
  const out = connect(doc(), 'B', 'C');
  const pts = out.flow.EDGES[out.flow.EDGES.length - 1].points;
  expect(axial(pts)).toBe(true);
});

// An arrow that meets another arrow rather than a second box. The publication draws plenty:
// I3501-2 on the E-2D chart puts its head on the trunk into I4401-3, and the stub into the B
// connector comes out of the side of the trunk below G0701-2. Before this the editor could say
// neither, and a join was drawn running alongside the trunk instead of into it.
describe('joinEdge', () => {
  test('puts its head on the trunk, and names where the trunk goes', () => {
    const d = doc();
    const made = joinEdge(d, 'C', 0, [30, 120]).flow.EDGES[2];
    expect(made.from).toBe('C');
    expect(made.to).toBe('B');
    expect(made.joinTo).toBe(true);
    expect(axial(made.points)).toBe(true);
    // It stops ON the trunk rather than carrying on to B's box.
    const end = made.points[made.points.length - 1];
    expect(end[0]).toBe(30);
    expect(end[1]).toBeGreaterThan(24);
    expect(end[1]).toBeLessThan(200);
  });

  test('meets the trunk at a right angle', () => {
    const d = doc();
    const pts = joinEdge(d, 'C', 0, [30, 120]).flow.EDGES[2].points;
    const [ax] = pts[pts.length - 2];
    const [bx] = pts[pts.length - 1];
    // The trunk is vertical, so the last length must be horizontal, not along it.
    expect(ax).not.toBe(bx);
  });

  test('refuses to join an arrow the box is already an end of', () => {
    const d = doc();
    expect(joinEdge(d, 'A', 0, [30, 120])).toBe(d);
    expect(joinEdge(d, 'B', 0, [30, 120])).toBe(d);
  });
});

describe('branchEdge', () => {
  test('leaves the trunk and runs to a box, carrying the trunk’s source', () => {
    const d = doc();
    const made = branchEdge(d, 0, [30, 120], 'C').flow.EDGES[2];
    expect(made.from).toBe('A');
    expect(made.to).toBe('C');
    expect(made.joinFrom).toBe(true);
    expect(axial(made.points)).toBe(true);
    // It starts on the trunk...
    expect(made.points[0][0]).toBe(30);
    // ...and ends on C's own side, where the arrowhead belongs.
    const c = d.flow.NODES[2];
    expect(made.points[made.points.length - 1]).toEqual([c.x, c.y + (c.h / 2)]);
  });

  test('is one straight line where the box is level with the trunk', () => {
    // C's middle is level with the A -> B trunk, so the stub is a single length, which is what
    // the publication draws into the B connector.
    expect(branchEdge(doc(), 0, [30, 120], 'C').flow.EDGES[2].points).toHaveLength(2);
  });
});

// A joined end belongs to the arrow it sits on, not to the box its from/to names.
describe('a joined end', () => {
  test('stays put when the box named at that end is moved', () => {
    const joined = joinEdge(doc(), 'C', 0, [30, 120]);
    const was = joined.flow.EDGES[2].points;
    const out = moveNode(joined, 'B', 20, 20);
    expect(out.flow.EDGES[2].points).toEqual(was);
    // The trunk's own end, which is on B, did move.
    expect(out.flow.EDGES[0].points[1]).toEqual([50, 220]);
  });

  test('is not dragged back onto that box when the arrow is rerouted', () => {
    const joined = joinEdge(doc(), 'C', 0, [30, 120]);
    const pts = joined.flow.EDGES[2].points;
    const out = movePoint(joined, 2, pts.length - 1, 30, 150);
    const end = out.flow.EDGES[2].points[out.flow.EDGES[2].points.length - 1];
    expect(end).toEqual([30, 150]);
  });
});

// Where an arrow meets a box and where a branch meets a trunk are both places the publication
// is consistent about, and neither can be hit by eye on a half-unit grid.
describe('snapping', () => {
  test('an end dragged near the middle of a side settles on it', () => {
    const a = doc().flow.NODES[0];
    const middle = a.y + (a.h / 2);
    // Dropped on A's right side two units below centre.
    const out = movePoint(doc(), 1, 0, a.x + a.w, middle + 2);
    expect(edge(out, 1)[0]).toEqual([a.x + a.w, middle]);
  });

  test('but an end only carried along by a corner lands where that leaves it', () => {
    // Squaring must win here, or the snap puts back the bend it just took out.
    const out = movePoint(doc(), 1, 1, 143, 20);
    expect(edge(out, 1)[0][1]).toBe(20);
    expect(axial(edge(out, 1))).toBe(true);
  });

  // Where a branch meets a trunk is never the click: the click only says WHICH length.
  test('a branch meets a trunk level with its own box, making one straight line', () => {
    const d = doc();
    const c = d.flow.NODES[2];
    // Clicked well down the trunk, nowhere near C.
    const made = joinEdge(d, 'C', 0, [30, 185]).flow.EDGES[2];
    expect(made.points[made.points.length - 1]).toEqual([30, c.y + (c.h / 2)]);
  });

  // The tracer's coordinates are not on the half-unit grid the editor snaps to, and a join
  // rounded onto it would sit beside the arrow rather than on it.
  test('takes the arrow’s own coordinate exactly, grid or no grid', () => {
    const d = doc();
    d.flow.EDGES[0].points = [[30.3, 24], [30.3, 200]];
    const made = joinEdge(d, 'C', 0, [30.3, 120]).flow.EDGES[2];
    expect(made.points[made.points.length - 1][0]).toBe(30.3);
  });

  test('and at the middle of the length where it cannot reach that far', () => {
    const d = doc();
    // A short length well above C: nothing on it is level with C, so the middle it is.
    d.flow.EDGES[0].points = [[30, 24], [30, 60]];
    const made = joinEdge(d, 'C', 0, [30, 50]).flow.EDGES[2];
    expect(made.points[made.points.length - 1]).toEqual([30, 42]);
  });
});

// An arrow in these figures is never slanted, so the last corner is a special case: taking it
// out can only be done where the two boxes have a straight line between them.
describe('the last corner', () => {
  test('comes out as a straight line where the boxes line up', () => {
    const d = doc();
    // A is directly above B, so their one corner is redundant.
    d.flow.EDGES[0].points = [[30, 24], [30, 112], [30, 200]];
    const pts = edge(removePoint(d, 0, 1), 0);
    expect(pts).toHaveLength(2);
    expect(axial(pts)).toBe(true);
  });

  test('stays where the boxes are set on the diagonal', () => {
    const d = doc();
    // A (10..50, 10..24) and C (200..240, 100..114) overlap on neither axis.
    d.flow.EDGES[1].points = [[50, 17], [200, 17], [200, 107]];
    expect(removePoint(d, 1, 1)).toBe(d);
  });
});
