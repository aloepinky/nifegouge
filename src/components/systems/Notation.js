// ─────────────────────────────────────────────────────────────────────────────
//  Shared schematic notation for the T-6B systems diagrams.
//
//  The text presets, the multi-line label, the leader line, and the two connections
//  that are not fluid: an electrical signal run and a mechanical linkage. Every
//  diagram draws these the same way — they say "this is a label", "this wire is
//  energized", not anything about the system being drawn.
//
//  Written first on the fuel page and then copied into oil and obogs, each copy
//  picking up one more optional parameter: `El` reversed on fuel only, and the one
//  signal-run animation ran under three different keyframe names. Consolidated here
//  so the fourth diagram inherits it instead of re-typing it.
//
//  Fluid lines deliberately stay with each diagram: their colors, widths and dash
//  cadences are the system, not the notation.
// ─────────────────────────────────────────────────────────────────────────────
import { THEME, DIAGRAM_FONT } from './diagramTheme';

const C = THEME;
const FONT = DIAGRAM_FONT;

// Injected once per page by DiagramShell, next to HOT_STYLES, so a diagram gets the
// signal-run chase by using <El> and declares only its own fluid keyframes.
export const SIGNAL_KEYFRAMES = `
  @keyframes signalFlow    { to { stroke-dashoffset: -18; } }
  @keyframes signalFlowRev { to { stroke-dashoffset:  18; } }
`;

// ── Text style presets ──
// h: component headings. sym: symbol and placard text. mini: readouts and captions.
export const T = {
  h:    { fontFamily: FONT, fill: C.text,  fontSize: 10,  fontWeight: 700, textAnchor: 'middle', dominantBaseline: 'central' },
  sym:  { fontFamily: FONT, fill: C.text,  fontSize: 7.5, fontWeight: 700, textAnchor: 'middle', dominantBaseline: 'central' },
  mini: { fontFamily: FONT, fill: C.muted, fontSize: 6.5, fontWeight: 700, textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' },
};

// ── Multi-line label ──
export function Lbl({ x, y, lines, anchor = 'middle', size = 8.5, fill = C.text, lh = 9.5, bold = true }) {
  const arr = Array.isArray(lines) ? lines : [lines];
  return (
    <text style={{ fontFamily: FONT, fontSize: size, fontWeight: bold ? 700 : 400, fill }} textAnchor={anchor}>
      {arr.map((l, i) => <tspan key={i} x={x} y={y + i * lh}>{l}</tspan>)}
    </text>
  );
}

// ── Leader line (label → component) ──
export const Ldr = ({ d }) => <path d={d} fill="none" stroke={C.stroke} strokeWidth={0.7} />;

// ── Electrical signal run ──
// An energized run is two paths sharing one dash pattern: a wider grey one under a
// narrower neon one, so each bar gets a thin edge while the gaps between them stay
// empty. The runs read as a flicker of current rather than as another weighted line
// competing with the plumbing. The grey edge is the de-energized line's own color,
// which keeps a run continuous with itself as it switches state.
//
// `rev` flips the chase where the path happens to be drawn against the direction the
// signal actually travels — rewriting the path would be the honest fix, but some runs
// are drawn back-to-front so they cross the schematic cleanly.
export const El = ({ d, live = false, rev = false }) => {
  if (!live) return <path d={d} fill="none" stroke={C.muted} strokeWidth={1.1} strokeDasharray="5 4" opacity={0.9} />;
  // Both paths mount together, so their animations stay in phase and the edge tracks
  // the bar it is outlining.
  const bars = { strokeDasharray: '5 4', animation: `${rev ? 'signalFlowRev' : 'signalFlow'} 1.1s linear infinite` };
  return (
    <g>
      <path d={d} fill="none" stroke={C.muted}      strokeWidth={2.8} style={bars} />
      <path d={d} fill="none" stroke={C.signalLive} strokeWidth={1.8} style={bars} />
    </g>
  );
};

// ── Mechanical linkage (a control acting on a component, carrying no fluid) ──
export const Mech = ({ d }) => <path d={d} fill="none" stroke={C.muted} strokeWidth={1.4} strokeDasharray="12 6" />;
