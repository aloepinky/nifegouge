// ─────────────────────────────────────────────────────────────────────────────
//  Component click targets for the systems schematics.
//
//  Every part of a diagram that opens a detail modal gets the same cue: a teal ring
//  that fades in on hover. Started on the fuel diagram; the other three had
//  click-through detail with no hover cue at all, so a reader had to guess which
//  symbols were live.
//
//  Two forms, because the diagrams have two kinds of click target:
//    <Hot>     wraps a bare symbol — paints it, then the ring, then a transparent hit
//              shape on top so the whole area takes the click even where the symbol is
//              made of thin strokes with no fill.
//    <HotRing> for components that already own their <g> and a filled rect that takes
//              the click (hyds/elec Box, Bus, CBList) — just the ring, dropped in after
//              the children so nothing paints over it.
//
//  Both need the parent <g> (or the wrapper Hot makes) to carry className="dgm-hot".
// ─────────────────────────────────────────────────────────────────────────────
import { THEME } from './diagramTheme';

// Injected once per page by DiagramShell, so no diagram has to remember to add it.
export const HOT_STYLES = `
  .dgm-hot { cursor: pointer; }
  .dgm-hot-ring { opacity: 0; transition: opacity 0.12s; }
  .dgm-hot:hover .dgm-hot-ring { opacity: 0.55; }
`;

// Ring geometry, in the three shapes the schematics actually need: a rect (most
// components), a closed path (fuel's trapezoidal wing tanks, where a rect would read as
// a mistake), and a circle (elec's starter/generator).
//
// `out` pushes the shape outward by that many user units. A component that already draws
// its own border needs it: a 1 px ring laid on top of a 1.5 px stroke is a ring nobody
// can see. Sitting just outside the border, against the page, it reads. `out` moves the
// ring only — in <Hot> the hit shape stays exactly where the caller put it.
function ringShape({ x, y, w, h, r = 4, d, cx, cy, rc, out = 0 }, extra) {
  if (d) return <path d={`${d} Z`} {...extra} />;
  if (rc != null) return <circle cx={cx} cy={cy} r={rc + out} {...extra} />;
  return <rect x={x - out} y={y - out} width={w + out * 2} height={h + out * 2} rx={r} {...extra} />;
}

// One teal everywhere — the ring says "clickable", never "what kind of thing this is",
// so it deliberately takes no color prop.
export function HotRing(shape) {
  return ringShape(shape, {
    className: 'dgm-hot-ring',
    fill: 'none',
    stroke: THEME.accent,
    strokeWidth: 1,
  });
}

// The pointer handlers are forwarded rather than swallowed into `shape` so a diagram
// can hang more than the ring off a hover — the oil page names the part it is over.
export function Hot({ onClick, onMouseEnter, onMouseLeave, children, ...shape }) {
  return (
    <g className="dgm-hot" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
      <HotRing {...shape} />
      {ringShape({ ...shape, out: 0 }, { fill: 'transparent', stroke: 'none' })}
    </g>
  );
}
