import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { THEME, DIAGRAM_FONT } from '../diagramTheme';
import { OIL_VERBATIM, OIL_NUMBERS, OIL_EICAS, OIL_EPS, OIL_INFO } from './OilModalData';
import DiagramShell from '../DiagramShell';
import { InfoModal } from '../InfoModal';
import { Hot } from '../Hot';
import { T, Lbl, Ldr, El } from '../Notation';

// ─────────────────────────────────────────────────────────────────────────────
//  T-6B Oil System — NATOPS Figure 1-9
//
//  The page follows the figure's own drawing: the engine in profile with the prop
//  shaft at the left and the accessory section and oil tank at the right, the two
//  long headers along the bottom carrying the publication's own captions, and the
//  23 numbered parts called out by number alone. The number is the label — the name
//  is the modal title, exactly as the figure's key works. Hovering a part floats that
//  same title over it, so the drawing can be read without opening anything.
//
//  The engine is drawn in section and the plumbing is routed the way the figure routes
//  it: only the two captioned headers and the compressor bearing's own return run outside
//  the casing. Everything that feeds a bearing runs inside — up a riser into the internal
//  pressure gallery along the top of the engine, down through a strainer into the top of
//  each bearing, out of the bottom of it into a scavenge trumpet, and only then down
//  through the casing to whichever pump takes it.
//
//  The indication is NATOPS Figure 1-10, reproduced under the schematic: the row
//  whose PCL position, pressure band and time delay are all satisfied lights, and the
//  two annunciators above it read the lit rows. No wire runs from the schematic to
//  those annunciators — the table is the logic, not a component on the drawing.
// ─────────────────────────────────────────────────────────────────────────────

// ── Keyframes (dash cycles: 8+4=12, 6+5=11 — offsets are one full cycle ×2) ──
// The hover-ring rules and the signal-run chase are not here: DiagramShell injects
// the shared HOT_STYLES and SIGNAL_KEYFRAMES.
// The fluid lines carry no keyframes of their own — their dashes are driven from the
// simulation loop so the speed can change without the phase jumping. What is left here is
// nothing; DiagramShell still injects the shared signal-run chase for <El>.
const KEYFRAMES = '';

// ── Colors: shared THEME + NATOPS Figure 1-9 line-function colors ────────────
// Named by function, not severity. The figure's own legend is PRESSURE OIL /
// PROPELLER SUPPLY OIL / SCAVENGE OIL; here the two header captions name those
// functions in place, which is why this page carries no legend card.
const LOCAL = {
  pressureOil: '#c0392b', // PRESSURE OIL
  propOil:     '#2e8b57', // PROPELLER SUPPLY OIL — the only oil that leaves the engine
  scavengeOil: '#d4b81e', // SCAVENGE OIL
  breather:    '#8b9cad', // breather / vent — air, never flowing oil, always static
  senseLine:   '#8496a6',
  engineFill:  '#f4f6f8', engineStroke: '#9aa8b6',
  tankFill:    '#e9edf1',
  metalFill:   '#eef1f4', // pump and gearbox housings, a shade off the white boxes
  // Lit annunciator text runs brighter than the THEME status colors because it sits
  // on a black EICAS face.
  annWarning: '#f2453d', annCaution: '#e0b830',
};

const C = { ...THEME, ...LOCAL };
const FONT = DIAGRAM_FONT;

// ── Oil line: colored pipe + white animated dash overlay (site flow idiom) ───
//
//  Every `d` below is authored in the direction the oil actually moves — tank to
//  bearings on the pressure side, bearings to pumps to cooler on the scavenge side —
//  because the dashes travel along the path in the order its points are written.
//  The dashes are not a CSS animation. They are one phase accumulator, advanced every
//  frame by the current flow rate and written straight onto each path's dash offset. A
//  CSS animation would have to be re-timed whenever the rate changed, and re-timing one
//  mid-run recomputes its phase from elapsed time — which makes the dashes jump instead
//  of decelerate. So each variant carries a speed in user units per second and the length
//  of its dash cycle, and the loop does the rest.
const F_CFG = {
  press:  { color: C.pressureOil, width: 4,   dash: '8 4', speed: 18.5, cycle: 12 },
  prop:   { color: C.propOil,     width: 3.4, dash: '6 5', speed: 18.5, cycle: 11 },
  scav:   { color: C.scavengeOil, width: 3.4, dash: '6 5', speed: 14.2, cycle: 11 },
  breath: { color: C.breather,    width: 2 },
  sense:  { color: C.senseLine,   width: 1.6 },
};

// What rides on a scavenge line once the chip detector has something to detect: the
// white flow dashes give way to short grey marks travelling at the same speed, which is
// what ferrous debris in the returning oil looks like. The dash cycle is 8 units and the
// keyframe steps three of them, so the specks stay evenly spaced as they go round.
const CHIP_DASH = { color: '#5c6a78', width: 2.4, dash: '2 6', speed: 14.2, cycle: 8 };

// The class and the two data attributes are the whole contract with the animation setup:
// it finds every flowing overlay on the page and gives each one a timeline of its own
// length, so lines of different speeds keep their own cadence.
const FLOW_CLASS = 'dgm-flow';

// One Web Animations timeline per flowing line, driven by playbackRate rather than by a
// CSS duration: changing a CSS animation's duration re-maps its phase from elapsed time,
// which makes the dashes jump, where playbackRate keeps currentTime exactly where it is.
//
// The timeline is attached imperatively to a node React owns, so anything that replaces
// that node — a remount, a tab the browser decided to throw away work for — leaves the
// line with no animation and stops it for good. The loop re-attaches whatever is missing,
// which is why nothing here tries to keep a list of them.
const attachFlow = (n, rate) => {
  const cycle = +n.dataset.cy, speed = +n.dataset.sp;
  const a = n.animate(
    [{ strokeDashoffset: '0' }, { strokeDashoffset: String(-cycle) }],
    { duration: (cycle / speed) * 1000, iterations: Infinity, easing: 'linear' },
  );
  a.playbackRate = rate;
};

// `anim` is a rate rather than a flag: 1 is the system delivering normally, 0 is stopped.
// `true` still means 1 and `false` still means stopped.
function F({ d, v = 'press', anim = true, w, chips = false }) {
  const cfg = F_CFG[v];
  const rate = anim === true ? 1 : Number(anim) || 0;
  const ov = chips ? CHIP_DASH : { color: C.wireDash, width: 1.4, dash: cfg.dash, speed: cfg.speed, cycle: cfg.cycle };
  return (
    <g>
      <path d={d} fill="none" stroke={cfg.color} strokeWidth={w ?? cfg.width} />
      {rate > 0 && cfg.dash && (
        <path d={d} fill="none" stroke={ov.color} strokeWidth={ov.width}
          className={FLOW_CLASS} data-sp={ov.speed} data-cy={ov.cycle}
          style={{ strokeDasharray: ov.dash }} />
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component shapes
//
//  Drawn as the parts they are rather than as labelled boxes: a gear pump has gears
//  in it, a bearing has balls in a race, a filter has an element. The shape is what
//  carries the name now that the callouts are numbers.
// ─────────────────────────────────────────────────────────────────────────────

// Spur gear — the tooth ring is what makes a pump element read as a pump element.
function gearPath(cx, cy, r, n) {
  const ri = r * 0.86, ro = r * 1.14, step = (2 * Math.PI) / n;
  const p = (a, rad) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * step;
    d += `${i ? ' L ' : 'M '}${p(a, ri)} L ${p(a + step * 0.22, ro)} L ${p(a + step * 0.5, ro)} L ${p(a + step * 0.72, ri)}`;
  }
  return `${d} Z`;
}

const Gear = ({ cx, cy, r, teeth = 10, fill = C.box }) => (
  <g>
    <path d={gearPath(cx, cy, r, teeth)} fill={fill} stroke={C.text} strokeWidth={1} strokeLinejoin="round" />
    <circle cx={cx} cy={cy} r={r * 0.3} fill={C.boxAlt} stroke={C.text} strokeWidth={0.9} />
  </g>
);

// Gear pump element — one gear pair in a housing, drawn as the figure draws it: two
// tooth circles that touch and never overlap, because a gear pump seals by its teeth
// meshing at exactly that line. NATOPS calls the two halves of a dual-element pump the
// forward and aft elements, so each element is a symbol (and a click) of its own rather
// than one box carrying two numbers.
const PUMP_W = 40, PUMP_H = 22;
const PumpElement = ({ x, y, w = PUMP_W, h = PUMP_H }) => {
  const r = h * 0.34, ro = r * 1.14;     // pitch radius, then the tooth-tip radius
  const cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2.5} fill={C.metalFill} stroke={C.text} strokeWidth={1.1} />
      <Gear cx={x + w / 2 - ro} cy={cy} r={r} teeth={9} />
      <Gear cx={x + w / 2 + ro} cy={cy} r={r} teeth={9} />
    </g>
  );
};

// ── Bearings, in the section the rest of the drawing is in ──
// The engine is cut lengthwise, so a bearing shows as its races and one ball in
// section, above and below the shaft centreline — not as the ring of balls you would
// see looking down the shaft. Nothing else on this figure is drawn head-on.
const BRG_H = 18;                        // centreline to the outside of the outer race
const BRG_W = 26;

// Every stretch of shaft on the page is drawn the same way: one weight, rounded ends.
// The engine's three runs, the journal's own and the two stubs the tank bearings carry
// are all sections of the same hardware, so none of them may drift from the others.
const SHAFT_LINE = { stroke: C.engineStroke, strokeWidth: 3, strokeLinecap: 'round' };

// A shaft that carries one bearing gets a stub this far either side of it, the same
// length everywhere. A run that carries several is drawn end to end instead.
const SHAFT_STUB = 20;

const Bearing = ({ cx, cy, w = BRG_W }) => {
  const half = w / 2, S = 2, RT = 3.5, BR = 4.5;   // shaft half, race thickness, ball radius
  const race = y => <rect x={cx - half} y={y} width={w} height={RT} fill={C.boxAlt} stroke={C.text} strokeWidth={1} />;
  return (
    <g>
      {[1, -1].map(s => (
        <g key={s}>
          {race(s > 0 ? cy - S - RT : cy + S)}
          {race(s > 0 ? cy - BRG_H : cy + BRG_H - RT)}
          <circle cx={cx} cy={cy - s * (S + RT + BR)} r={BR} fill={C.box} stroke={C.text} strokeWidth={1} />
        </g>
      ))}
    </g>
  );
};

// Journal bearing — the same section, but a plain sleeve: the shaft rides on a film of
// pressure oil rather than on rolling elements, so the film is drawn in the oil's own
// color. That film is the bearing surface, which is why the pressure system has to feed it.
const JRN_H = 15;
const Journal = ({ cx, cy, w = 26 }) => {
  const half = w / 2, S = 2, FILM = 2.5, SH = JRN_H - S - FILM;
  return (
    <g>
      {[1, -1].map(s => (
        <g key={s}>
          <rect x={cx - half} y={s > 0 ? cy - JRN_H : cy + S + FILM} width={w} height={SH}
            fill={C.boxAlt} stroke={C.text} strokeWidth={1} />
          {/* The film, inset from the shell ends so it reads as the gap it is rather
              than as one more red pipe arriving at the gearbox. */}
          <line x1={cx - half + 3} y1={cy - s * (S + FILM / 2)} x2={cx + half - 3} y2={cy - s * (S + FILM / 2)}
            stroke={C.pressureOil} strokeWidth={1.2} />
        </g>
      ))}
      <line x1={cx - half} y1={cy} x2={cx + half} y2={cy} {...SHAFT_LINE} />
    </g>
  );
};

// Scavenge trumpet — the flared pickup the figure draws under every bearing and sump.
// Oil falls out of the bearing into the flare; the stem carries it to a scavenge pump.
const FUN_H = 12;
const Funnel = ({ cx, y, w = 26 }) => (
  <path d={`M ${cx - w / 2},${y} H ${cx + w / 2} L ${cx + 3},${y + FUN_H} H ${cx - 3} Z`}
    fill={C.scavengeOil} stroke={C.text} strokeWidth={1} strokeLinejoin="round" />
);

// Strainer — the figure's crosshatched square. Six of them on the drawing.
const Strainer = ({ x, y, s = 15 }) => (
  <g>
    <rect x={x} y={y} width={s} height={s} rx={1.5} fill={C.box} stroke={C.text} strokeWidth={1.1} />
    {[0.25, 0.5, 0.75].map(f => (
      <g key={f} stroke={C.stroke} strokeWidth={0.7}>
        <line x1={x + s * f} y1={y + 1} x2={x + 1} y2={y + s * f} />
        <line x1={x + s * f} y1={y + s - 1} x2={x + s - 1} y2={y + s * f} />
      </g>
    ))}
  </g>
);

// Main oil filter and check valve — one component, and one symbol for it: the figure's
// ring inside a ring, no larger than a strainer, because on this drawing it is one item
// in a chain rather than a vessel. There is no separate check valve on the page for the
// same reason NATOPS numbers only one part here.
const FilterRing = ({ cx, cy, r = 11 }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={C.box} stroke={C.text} strokeWidth={1.3} />
    <circle cx={cx} cy={cy} r={r * 0.48} fill={C.boxAlt} stroke={C.text} strokeWidth={1.1} />
  </g>
);

// Spring-loaded poppet — the bypass, filter bypass and pressure regulating valves.
// `rot` points the poppet the way it lifts.
const Poppet = ({ x, y, w = 22, h = 20, rot = 0 }) => (
  <g transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined}>
    <rect x={x} y={y} width={w} height={h} rx={2} fill={C.box} stroke={C.text} strokeWidth={1.1} />
    <path d={`M ${x + 3},${y + h - 4} L ${x + w / 2},${y + 5} L ${x + w - 3},${y + h - 4} Z`}
      fill={C.boxAlt} stroke={C.text} strokeWidth={0.9} strokeLinejoin="round" />
    <path d={`M ${x + w / 2 - 4},${y + 4} l 8,-0 m -8,-2.5 l 8,0`} stroke={C.text} strokeWidth={0.9} />
  </g>
);

// Centrifugal breather — the vaned rotor that spins oil mist out of the vented air.
const CentrifBreather = ({ cx, cy, r = 13 }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={C.box} stroke={C.text} strokeWidth={1.2} />
    {[0, 1, 2, 3, 4, 5].map(i => {
      const a = (i / 6) * 2 * Math.PI;
      const x0 = cx + r * 0.32 * Math.cos(a), y0 = cy + r * 0.32 * Math.sin(a);
      const x1 = cx + r * 0.94 * Math.cos(a + 0.55), y1 = cy + r * 0.94 * Math.sin(a + 0.55);
      return <path key={i} d={`M ${x0},${y0} Q ${cx + r * 0.7 * Math.cos(a + 0.1)},${cy + r * 0.7 * Math.sin(a + 0.1)} ${x1},${y1}`}
        fill="none" stroke={C.stroke} strokeWidth={1} />;
    })}
    <circle cx={cx} cy={cy} r={r * 0.24} fill={C.boxAlt} stroke={C.text} strokeWidth={0.9} />
  </g>
);

// Breather valve — a vent poppet off the top of the tank.
const BreatherValve = ({ cx, cy, r = 8 }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={C.box} stroke={C.text} strokeWidth={1.2} />
    <path d={`M ${cx - 4},${cy + 3} L ${cx},${cy - 4} L ${cx + 4},${cy + 3} Z`}
      fill={C.boxAlt} stroke={C.text} strokeWidth={0.9} strokeLinejoin="round" />
    <line x1={cx - 5.5} y1={cy + 4.5} x2={cx + 5.5} y2={cy + 4.5} stroke={C.text} strokeWidth={1} />
  </g>
);

// Pressure pickup element — the standpipe that draws oil out of the tank.
const Pickup = ({ x, y, dir = 1 }) => (
  <g stroke={C.text} strokeWidth={1.2} fill="none">
    <circle cx={x} cy={y} r={4.5} fill={C.box} />
    <path d={`M ${x},${y - 4.5 * dir} v ${-6 * dir}`} />
    <path d={`M ${x - 4.5},${y - 10.5 * dir} h 9`} strokeWidth={1.6} />
  </g>
);

// Tank drain — a stub with a plug on the bottom of the tank.
const Drain = ({ cx, y }) => (
  <g fill={C.box} stroke={C.text} strokeWidth={1.1}>
    <rect x={cx - 5} y={y} width={10} height={7} />
    <rect x={cx - 8} y={y + 7} width={16} height={5} rx={1.5} fill={C.boxAlt} />
  </g>
);

// Chip detector — the magnetic probe in the reduction gearbox drain, sitting on the
// drain line with its probes reaching up into the sump, and the CHIP lamp beside it. It
// is the one oil-system warning that does not come from the SCU, so it lights at its
// source rather than with the OIL PX pair under the table.
const ChipDetector = ({ cx, y, lit }) => (
  <g>
    <rect x={cx - 13} y={y} width={26} height={16} rx={2} fill={C.metalFill} stroke={C.text} strokeWidth={1.1} />
    <path d={`M ${cx - 6},${y} v -7 M ${cx + 6},${y} v -7`} stroke={C.text} strokeWidth={2} />
    <circle cx={cx + 28} cy={y + 6} r={6.5}
      fill={lit ? C.annWarning : C.boxAlt} stroke={lit ? C.warningBorder : C.stroke} strokeWidth={1.2} />
    <text x={cx + 28} y={y + 21} style={{ ...T.mini, fontSize: 8, fill: lit ? C.warningText : C.muted }}>CHIP</text>
  </g>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Naming — one source for what a part is called
//
//  A click target carries only its OIL_INFO key. That key supplies both the record the
//  click opens and the title the hover floats above the part, so the name on the
//  drawing can never drift from the heading in the modal. It travels by context because
//  every one of the forty targets needs it and none of them needs anything else from
//  the page — the value is memoized once, so nothing re-renders on account of it.
// ─────────────────────────────────────────────────────────────────────────────
const PartCtx = createContext({ open: () => {}, name: () => {} });

// Where the hover label sits: centred just above the click area, in the two shapes the
// page actually uses (a rect for everything, a circle for the gauge).
const nameAnchor = s => (s.rc != null
  ? { x: s.cx, y: s.cy - s.rc - 10 }
  : { x: s.x + s.w / 2, y: s.y - 10 });

/** A click target that names itself. `k` is the OIL_INFO key; the rest is the hot shape. */
function Named({ k, children, ...shape }) {
  const ctx = useContext(PartCtx);
  return (
    <Hot
      {...shape}
      onClick={() => ctx.open(k)}
      onMouseEnter={() => ctx.name(k, nameAnchor(shape))}
      onMouseLeave={() => ctx.name(null)}
    >
      {children}
    </Hot>
  );
}

// ── Numbered callout ──
// The figure's own convention: a plain number with a hairline leader, no name. The
// transparent disc under the number sits inside the same <g> the Hot makes, so the
// number itself takes the click along with the part.
const Num = ({ n, x, y }) => (
  <g>
    <text x={x} y={y} style={{ ...T.sym, fontSize: 9, fill: C.text }}>{n}</text>
    <circle cx={x} cy={y} r={8} fill="transparent" />
  </g>
);

/**
 * A numbered part: the drawn shape, its callout number, and an optional leader from
 * the number to the shape. `hot` is the click area (the shape's own bounds).
 */
const Part = ({ n, tx, ty, ldr, children, ...rest }) => (
  <Named {...rest}>
    {children}
    {ldr && <Ldr d={ldr} />}
    <Num n={n} x={tx} y={ty} />
  </Named>
);

// The hover name. Drawn last so it sits over whatever it lands on, and painted with a
// halo in the page background rather than in a box — the drawing is dense enough
// without another rectangle appearing in it. Teal, the same cue as the hover ring.
const HoverName = ({ hv }) => hv && (
  <text
    x={Math.max(74, Math.min(806, hv.x))} y={Math.max(14, hv.y)}
    style={{
      fontFamily: FONT, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em',
      fill: C.accent, textAnchor: 'middle', dominantBaseline: 'central',
      paintOrder: 'stroke', stroke: C.bg, strokeWidth: 5, strokeLinejoin: 'round',
      pointerEvents: 'none',
    }}
  >{hv.title}</text>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Oil pressure gauge geometry
//
//  270° sweep, 0 to 220 psi, bottom-left to bottom-right. The band radii and the
//  NATOPS arc set are the whole point of the instrument, so they are built from the
//  published breakpoints rather than eyeballed.
// ─────────────────────────────────────────────────────────────────────────────
// Level with the indication chain rather than under it: the gauge is the left-hand end
// of that chain and the PCL the right-hand end, sitting the same distance out from the
// chain on each side. Every dimension below is a fraction of GR, so the whole instrument
// scales from that one number.
const GCX = 254, GCY = 508, GR = 66, GMAX = 220;
const G_RING_R = GR * 0.846, G_RING_W = GR * 0.135;   // the arc band and its width
const G_FACE_R = GR * 0.75;                            // dark face inside the band
const G_TICK_R = GR * 0.635, G_MIN_R = GR * 0.69;      // how far a numbered / plain tick reaches
const G_LBL_R  = GR * 0.545;                           // the scale numbers
const G_NDL_R  = GR * 0.73, G_HUB = GR * 0.065;        // needle tip and hub
const gA  = v => -135 + 270 * (Math.max(0, Math.min(GMAX, v)) / GMAX);
const gPt = (deg, r) => {
  const t = (deg * Math.PI) / 180;
  return [GCX + r * Math.sin(t), GCY - r * Math.cos(t)];
};
const gArc = (v0, v1, r) => {
  const [x0, y0] = gPt(gA(v0), r);
  const [x1, y1] = gPt(gA(v1), r);
  return `M ${x0},${y0} A ${r},${r} 0 ${gA(v1) - gA(v0) > 180 ? 1 : 0} 1 ${x1},${y1}`;
};

// NATOPS Figure 5-1 oil pressure markings, in the order they are painted.
const GAUGE_BANDS = [
  { from: 0,   to: 40,  color: '#c0392b' },  // red arc — exceedance
  { from: 40,  to: 90,  color: '#d8a521' },  // amber arc — caution
  { from: 90,  to: 120, color: '#2e8b57' },  // green arc — normal
  { from: 120, to: 200, color: '#d8dee6' },  // white arc — scale
  { from: 200, to: 220, color: '#c0392b' },  // red arc — exceedance
];
const GAUGE_RADIALS = [40, 200];                    // red radial minimum / maximum
const GAUGE_TICKS   = [20, 60, 100, 140, 180, 220]; // numbered scale marks
const GAUGE_MINOR   = [40, 80, 120, 160, 200];      // and the plain ones between them

// The needle takes the color of the band it is sitting in, which is the whole reason the
// arcs are there: the pointer says green / amber / red before the number is read at all.
const gBand = v => (GAUGE_BANDS.find(b => v >= b.from && v < b.to) || GAUGE_BANDS[GAUGE_BANDS.length - 1]).color;

// Readout stack, in the HYD PRESS gauge's proportions: the value large, PSI under it,
// the gauge's own name under that.
// The 220 mark lands beside the readout on a 270° sweep, so the value is kept a shade
// smaller than the HYD gauge's and the scale numbers sit a shade further out.
const G_VAL_Y = GCY + 15, G_VAL_FS = 17;
const G_PSI_Y = GCY + 33, G_NAME_Y = GCY + 44, G_SUB_FS = 9;
const G_LBL_FS = 8;

// The bands, ticks and numbers never change — only the needle and the readout do.
const GAUGE_FACE = (
  <g>
    <circle cx={GCX} cy={GCY} r={GR} fill={C.gaugeFace} stroke={C.gaugeBezel} strokeWidth={2} />
    {GAUGE_BANDS.map(b => (
      <path key={b.from} d={gArc(b.from, b.to, G_RING_R)} fill="none" stroke={b.color} strokeWidth={G_RING_W} />
    ))}
    {GAUGE_RADIALS.map(v => {
      const [x0, y0] = gPt(gA(v), G_FACE_R);
      const [x1, y1] = gPt(gA(v), GR - 1);
      return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#f2453d" strokeWidth={2.4} />;
    })}
    {/* Inner face, so the arcs read as a ring with the scale marked inside it */}
    <circle cx={GCX} cy={GCY} r={G_FACE_R} fill={C.gaugeFaceInner} />
    {GAUGE_MINOR.map(v => {
      const [x0, y0] = gPt(gA(v), G_FACE_R);
      const [x1, y1] = gPt(gA(v), G_MIN_R);
      return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#ffffff" strokeWidth={1} />;
    })}
    {GAUGE_TICKS.map(v => {
      const [x0, y0] = gPt(gA(v), G_FACE_R);
      const [x1, y1] = gPt(gA(v), G_TICK_R);
      const [lx, ly] = gPt(gA(v), G_LBL_R);
      return (
        <g key={v}>
          <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#ffffff" strokeWidth={1.4} />
          <text x={lx} y={ly} style={{ ...T.mini, fontSize: G_LBL_FS, fill: C.gaugeText }}>{v}</text>
        </g>
      );
    })}
    <text x={GCX} y={G_NAME_Y} style={{ ...T.mini, fontSize: G_SUB_FS, fill: C.gaugeTick }}>OIL PRESS</text>
  </g>
);

const Gauge = ({ psi }) => {
  const a = gA(psi);
  const [nx, ny]   = gPt(a, G_NDL_R);        // tip
  const [b1x, b1y] = gPt(a + 90, G_HUB);     // and the two corners of its base
  const [b2x, b2y] = gPt(a - 90, G_HUB);
  return (
    <g>
      {GAUGE_FACE}
      <polygon points={`${nx},${ny} ${b1x},${b1y} ${b2x},${b2y}`} fill={gBand(psi)} />
      <circle cx={GCX} cy={GCY} r={G_HUB} fill="#8a9aaa" />
      <text x={GCX} y={G_VAL_Y} style={{ ...T.sym, fontSize: G_VAL_FS, fill: C.gaugeText }}>
        {Math.round(psi)}
      </text>
      <text x={GCX} y={G_PSI_Y} style={{ ...T.mini, fontSize: G_SUB_FS, fill: C.gaugeTick }}>PSI</text>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  PCL — the only cockpit control on this page
//
//  Two modes, one button apiece, because that is all the PCL is on this page: it moves
//  no oil, it selects which set of SCU thresholds is armed. The lit segment is the one
//  the table below is being read against.
// ─────────────────────────────────────────────────────────────────────────────
// No panel around it — the two buttons and their placard are the control. It sits just
// right of the indication chain, because what it selects is the SCU's thresholds.
const PCL_CX = 624;
const PCL_SEG_W = 62, PCL_SEG_H = 18, PCL_SEG_GAP = 4;
const PCL_TITLE_Y = 480, PCL_SEG_Y = 488;

const PCL_MODES = [
  { label: 'IDLE',       val: false },
  { label: 'ABOVE IDLE', val: true  },
];

const PclQuadrant = ({ above, onSelect }) => (
  <g>
    <text x={PCL_CX} y={PCL_TITLE_Y} style={{ ...T.sym, fontSize: 8.5, letterSpacing: '0.12em' }}>PCL</text>

    {PCL_MODES.map((o, i) => {
      const on = above === o.val;
      const x = PCL_CX - PCL_SEG_W - PCL_SEG_GAP / 2 + i * (PCL_SEG_W + PCL_SEG_GAP);
      return (
        <g key={o.label} className="dgm-hot" onClick={() => onSelect(o.val)}>
          <rect x={x} y={PCL_SEG_Y} width={PCL_SEG_W} height={PCL_SEG_H} rx={3}
            fill={on ? C.accent : C.boxAlt}
            stroke={on ? C.accent : C.stroke} strokeWidth={1.1} />
          <text x={x + PCL_SEG_W / 2} y={PCL_SEG_Y + PCL_SEG_H / 2} style={{
            ...T.sym, fontSize: 8, letterSpacing: '0.06em',
            fill: on ? '#ffffff' : C.muted,
          }}>{o.label}</text>
        </g>
      );
    })}
  </g>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Indication chain — transducers → EDM → SCU → EICAS
//
//  Drawn as the chain it is rather than a row of four boxes: both transducers feed the
//  EDM below them, the EDM feeds the SCU below it, and the two of them light the one
//  screen beside them. The boxes are deliberately small — on this page they are the
//  path a reading takes, not the subject.
// ─────────────────────────────────────────────────────────────────────────────
// Each box is only as wide as its own longest line: the width is derived from the text
// rather than shared, so no box carries padding it has not earned.
const IND_H = 22;
const IND_PAD = 5;      // horizontal padding inside a box
const IND_CHAR = 4.15;  // Courier New advance at 6.5 with the T.sym tracking
const indW = lines => Math.round(Math.max(...lines.map(l => l.length)) * IND_CHAR) + IND_PAD * 2;

const TRX_T_L = ['OIL TEMPERATURE', 'TRANSDUCER'];
const TRX_P_L = ['OIL PRESSURE', 'TRANSDUCER'];
const EDM_L   = ['ENGINE DATA', 'MANAGER (EDM)'];
const SCU_L   = ['SIGNAL CONDITIONING', 'UNIT (SCU)'];
const TRX_T_W = indW(TRX_T_L), TRX_P_W = indW(TRX_P_L);
const EDM_W   = indW(EDM_L),   SCU_W   = indW(SCU_L);

// Four rows, close-coupled. The EDM is centred under the transducer pair; the SCU sits
// square under the pressure transducer, because pressure is the only reading that ever
// reaches it; the screen goes back to the EDM's centreline underneath them both.
const TRX_T_X = 366, TRX_P_X = 454;
const TRX_P_CX = TRX_P_X + TRX_P_W / 2;
const IND_CX   = (TRX_T_X + TRX_P_X + TRX_P_W) / 2;
const EDM_X    = IND_CX - EDM_W / 2;
const SCU_X    = TRX_P_CX - SCU_W / 2;
const TRX_Y = 436, EDM_Y = 470, SCU_Y = 504;

const IndBox = ({ x, y, w, lines, alert = false }) => (
  <>
    <rect x={x} y={y} width={w} height={IND_H} rx={2}
      fill={alert ? C.warningTint : C.box}
      stroke={alert ? C.warningText : C.text} strokeWidth={alert ? 1.6 : 1.1} />
    {lines.map((l, i) => (
      <text key={l} x={x + w / 2} y={y + (i ? 15 : 7)} style={{ ...T.sym, fontSize: 6.5 }}>{l}</text>
    ))}
  </>
);

// ── EICAS ──
// A dark screen that is blank until something lights it, which is what the real one
// does: a message that is not posted is not on the glass at all. The lit ones sit on one
// line in the cockpit's own order — OIL PX warning, CHIP, OIL PX caution — packed to the
// left, so a single message reads hard against the left edge exactly as it would in the
// aircraft. Severity is the text color and nothing else, which is why the two OIL PX
// messages are the same word in red and amber. CHIP is up here with them because it is
// an EICAS warning, but it comes straight off the detector in the gearbox and never
// touches the SCU.
const ANN_LIT = { warn: C.annWarning, caution: C.annCaution };

const EICAS_FS = 11, EICAS_CHAR = EICAS_FS * 0.7, EICAS_GAP = 16, EICAS_PAD = 10;
const EICAS_W = 176, EICAS_H = 30;
const EICAS_X = IND_CX - EICAS_W / 2;
const EICAS_Y = 542;

const EicasScreen = ({ redPx, chip, amberPx }) => {
  const lit = [
    redPx   && { text: 'OIL PX', kind: 'warn' },
    chip    && { text: 'CHIP',   kind: 'warn' },
    amberPx && { text: 'OIL PX', kind: 'caution' },
  ].filter(Boolean);

  let cursor = EICAS_X + EICAS_PAD;
  const placed = lit.map(m => {
    const at = cursor;
    cursor += m.text.length * EICAS_CHAR + EICAS_GAP;
    return { ...m, x: at };
  });

  return (
    <g>
      <rect x={EICAS_X} y={EICAS_Y} width={EICAS_W} height={EICAS_H} rx={3}
        fill={C.panelFace} stroke="#0a1622" strokeWidth={1} />
      {placed.map(m => (
        <text key={m.text + m.kind} x={m.x} y={EICAS_Y + EICAS_H / 2} style={{
          fontFamily: FONT, fontSize: EICAS_FS, fontWeight: 700, letterSpacing: '0.10em',
          fill: ANN_LIT[m.kind], textAnchor: 'start', dominantBaseline: 'central',
        }}>{m.text}</text>
      ))}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  NATOPS Figure 1-10 — Oil Pressure Warning/Caution
//
//  Reproduced row for row, in the publication's own wording and case. This is the
//  page's EICAS: the row that is satisfied lights, and the two annunciators above it
//  are the union of the lit rows.
// ─────────────────────────────────────────────────────────────────────────────
const TB_X = 40, TB_R = 840;
const TB_COLS = [40, 156, 506, 654, 840];        // PCL | condition | delay | message
const TB_HEAD_Y = 612, TB_ROW_H = 26;
const TB_TOP = TB_HEAD_Y, TB_BOT = TB_HEAD_Y + TB_ROW_H * 6;

const AMBER_ABOVE_S = 10;                // NATOPS: 40 – 90 psi for 10 seconds, above idle
const BOTH_IDLE_S   = 5;                 // NATOPS: 15 – 40 psi for 5 seconds or more, at idle

// ── Table type size ──
// One number for every cell in the table; the header runs half a point above it. This is
// the knob to turn if the table wants to read larger or smaller.
const TB_FS = 10;
const TB_HEAD_FS = TB_FS + 0.5;
const TB_CAP_FS = TB_FS - 2;

// `msg` is a list of pieces, not a string, because a row can post one message of each
// severity and each piece has to be painted in its own color — a row that reads
// "Red OIL PX, Amber OIL PX" all in red is telling the student the wrong thing twice.
const RED = 'red', AMBER = 'amber';
const TB_ROWS = [
  { id: 'i1', pcl: 'IDLE',       cond: 'Oil Pressure between 15 and 40 psi', delay: 'None',              msg: [['Amber OIL PX', AMBER]],                red: false, amber: true },
  { id: 'i2', pcl: 'IDLE',       cond: 'Oil Pressure between 15 and 40 psi', delay: '5 Seconds or more', msg: [['Red OIL PX,', RED], ['Amber OIL PX', AMBER]], red: true,  amber: true },
  { id: 'i3', pcl: 'IDLE',       cond: 'Oil Pressure 15 psi or below',       delay: 'None',              msg: [['Red OIL PX', RED]],                    red: true,  amber: false },
  { id: 'a1', pcl: 'Above IDLE', cond: 'Oil Pressure between 40 and 90 psi', delay: '10 Seconds',        msg: [['Amber OIL PX', AMBER]],                red: false, amber: true },
  { id: 'a2', pcl: 'Above IDLE', cond: 'Oil Pressure to 40 psi or below',    delay: 'None',              msg: [['Red OIL PX', RED]],                    red: true,  amber: false },
];

const rowY = i => TB_HEAD_Y + TB_ROW_H * (i + 1);

// Frame, rules and every fixed string. Only the row tints and the two countdown
// cells are state-dependent, and those are drawn under and over this.
const TABLE_CHROME = (
  <g>
    <rect x={TB_X} y={TB_TOP} width={TB_R - TB_X} height={TB_BOT - TB_TOP} fill="none" stroke={C.text} strokeWidth={1.2} />
    <line x1={TB_X} y1={TB_HEAD_Y + TB_ROW_H} x2={TB_R} y2={TB_HEAD_Y + TB_ROW_H} stroke={C.text} strokeWidth={1.2} />
    {TB_ROWS.slice(1).map((r, i) => (
      <line key={r.id} x1={TB_X} y1={rowY(i + 1)} x2={TB_R} y2={rowY(i + 1)} stroke={C.stroke} strokeWidth={0.7} />
    ))}
    {TB_COLS.slice(1, 4).map(x => (
      <line key={x} x1={x} y1={TB_TOP} x2={x} y2={TB_BOT} stroke={C.stroke} strokeWidth={0.7} />
    ))}

    {['PCL Position', 'Oil Pressure Condition', 'Time Delay', 'Warning/Caution'].map((h, i) => (
      <text key={h} x={(TB_COLS[i] + TB_COLS[i + 1]) / 2} y={TB_HEAD_Y + TB_ROW_H / 2}
        style={{ ...T.sym, fontSize: TB_HEAD_FS }}>{h}</text>
    ))}

    {TB_ROWS.map((r, i) => (
      <g key={r.id}>
        <text x={TB_COLS[0] + 8} y={rowY(i) + TB_ROW_H / 2}
          style={{ ...T.sym, fontSize: TB_FS, fontWeight: 400, textAnchor: 'start' }}>{r.pcl}</text>
        <text x={TB_COLS[1] + 8} y={rowY(i) + TB_ROW_H / 2}
          style={{ ...T.sym, fontSize: TB_FS, fontWeight: 400, textAnchor: 'start' }}>{r.cond}</text>
      </g>
    ))}

    <text x={(TB_X + TB_R) / 2} y={TB_BOT + 14} style={{ ...T.mini, fontSize: TB_CAP_FS, fontWeight: 400, fontStyle: 'italic' }}>
      Figure 1-10. Oil Pressure Warning/Caution
    </text>
  </g>
);

function Fig110Table({ active, delayLeft }) {
  return (
    <g>
      {/* Row tints, under the rules so the grid stays crisp */}
      {TB_ROWS.map((r, i) => active[r.id] && (
        <rect key={r.id} x={TB_X} y={rowY(i)} width={TB_R - TB_X} height={TB_ROW_H}
          fill={r.red ? C.warningTint : C.cautionTint} />
      ))}

      {TABLE_CHROME}

      {/* Time delay and message cells: the delay counts its published time down in
          place while the pressure is in band, and the message names its own color. */}
      {TB_ROWS.map((r, i) => {
        const left = delayLeft[r.id];
        return (
          <g key={r.id}>
            <text x={TB_COLS[2] + 8} y={rowY(i) + TB_ROW_H / 2} style={{
              ...T.sym, fontSize: TB_FS, fontWeight: left != null ? 700 : 400, textAnchor: 'start',
              fill: left != null ? (r.red ? C.warningText : C.cautionText) : C.text,
            }}>
              {left != null ? `${r.delay} — ${left.toFixed(1)}` : r.delay}
            </text>
            <text x={TB_COLS[3] + 8} y={rowY(i) + TB_ROW_H / 2} style={{
              ...T.sym, fontSize: TB_FS, fontWeight: active[r.id] ? 700 : 400, textAnchor: 'start',
            }}>
              {r.msg.map(([text, kind], j) => (
                <tspan key={text} dx={j ? 4 : 0} fill={kind === RED ? C.warningText : C.cautionText}>{text}</tspan>
              ))}
            </text>
          </g>
        );
      })}

      {/* The header row is the click target for the logic write-up */}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Static chrome — built once at module load so React skips reconciling it during
//  the 20 Hz simulation commit. Anything added here must stay state-independent.
// ─────────────────────────────────────────────────────────────────────────────

// ── The levels the whole drawing is hung off ──
// Two of them are inside the casing and three are outside it, which is the point: a
// bearing is fed and drained internally, and oil only leaves the engine once it is on
// its way to the prop, to a scavenge pump or to the cooler.
const GAL_Y   = 148;   // internal pressure gallery, along the top of the gas generator
const SHAFT   = 201;   // shaft centreline — every bearing is sectioned about it
const BRG_TOP = SHAFT - BRG_H;   // where a gallery drop enters a bearing
const BRG_BOT = SHAFT + BRG_H;   // where the scavenge trumpet catches it
const FUN_Y   = BRG_BOT + 4;     // trumpet mouth
const FUN_B   = FUN_Y + FUN_H;   // trumpet stem
const SCAV_B  = 356;   // upper return line — the turbine end, to the forward element
const SCAV_A  = 372;   // lower return line — the reduction gearbox, to the aft element
const CP_RET  = 344;   // the gas generator compressor bearing's own return to the tank
const PRESS_Y = 412;   // pressure oil header, along the bottom of the engine

// The two housings the oil runs inside. There is no accessory gearbox box: Figure 1-9
// never draws one. What its key calls the accessory section is the front of the oil tank
// itself, carrying a compressor bearing at its front end and the accessory drives at its
// back, each over the scavenge element that drains it.
//
// The tank runs deeper than the power section because its two bearings sit on the shaft
// centreline like every other bearing on the page, and the whole pressure and scavenge
// stack has to fit underneath them. The casing steps down at the section divider to
// carry it, which is what the accessory case does on the engine.
const RGB = { x: 140, y: 154, w: 122, h: 110 };   // reduction gearbox
const TNK = { x: 548, y: 118, w: 200, h: 196 };   // oil tank

// ── Inside the tank: the pressure section ──
// Read it bottom to top, the way Figure 1-9 plumbs it. Each pickup owns one suction
// manifold and one pump element the whole way; both elements discharge upward into one
// manifold, and that manifold rises through the main filter to the tank top.
const TK_HDR    = 140;   // filtered-oil header along the top of the tank
const TK_OUT    = 536;   // outlet, down the outside of the tank to the bottom header
const TK_FILT   = 639;   // the main filter, and the riser it sits on
const TK_FILT_Y = 220;

const TK_S19   = 680;    // inverted pickup and its suction lane → forward element
const TK_S18   = 670;    // normal pickup and its suction lane   → aft element
const TK_SUC_F = 310;    // forward element suction manifold, along the tank floor
const TK_SUC_A = 304;    // aft element suction manifold — what the regulating valve relieves into

const TK_REG    = 574;   // pressure regulating valve, left of both pump elements
const TK_PUMP_Y = 281, TK_PH = 18, TK_PW = 34;
const TK_P19 = 590, TK_P18 = 630;
const TK_C19 = TK_P19 + TK_PW / 2;   // the forward element's ports, and the filter riser
const TK_C18 = TK_P18 + TK_PW / 2;   // the aft element's ports
const TK_DISCH = 276;                // discharge manifold, above both elements
const TK_FLOOR = TNK.y + TNK.h;      // tank floor
const PUMP_N_Y = TK_FLOOR + 12;      // callout row for the bottom of the tank, in the casing wall

// ── Inside the tank: the two bearings it carries ──
// The compressor bearing sits at the front of the tank and the accessory gearbox bearing
// at the rear, each over the internal scavenge element that drains it. Both are on
// SHAFT, not near it: the gas generator shaft runs straight out of the power section
// into the accessory case, so these two are sectioned about the same centreline as the
// compressor and power turbine bearings out in the engine. The pickups sit aft of the
// compressor bearing rather than forward of it, where the tank actually carries them.
const AGB_Y  = SHAFT;
const BRG_CP = 574;                   // compressor bearing, front of the tank
const BRG_AG = 713;                   // accessory gearbox bearing, rear of the tank
const FUN_Y_TK = AGB_Y + BRG_H + 4;   // trumpet mouth under either tank bearing
const FUN_B_TK = FUN_Y_TK + FUN_H;    // and its stem
const TK_RET = 237;                   // the compressor-bearing return, into the forward element
const TK_RET_L = BRG_CP - 12;         // where that return turns down for the elements
const TK_I16 = 685, TK_I15 = 720, TK_ISC_Y = 249, ISC_W = 26, ISC_H = 18;
const TK_C16 = TK_I16 + ISC_W / 2;
const TK_C15 = TK_I15 + ISC_W / 2;    // the aft element sits directly under BRG_AG
const ISC_OUT = 271;                  // where both internal elements discharge

// ── Along the top of the tank ──
// Figure 1-9 runs three parts across the tank crown, front to back: the vent poppet at
// the front corner, the filler and dipstick neck standing out of the top, and the
// centrifugal breather at the back. Each has one origin, so its symbol, its click
// target, its callout and its captions all move together when the part is nudged.
const BV_CX = 600, BV_CY = 128, BV_R = 8;    //  9. breather valve
const CB_CX = 734, CB_CY = 145, CB_R = 12;   // 11. centrifugal breather

// 10. Oil filler and dipstick, drawn the way Figure 1-9 draws it and the way it is
// fitted: a filler cap standing proud of the tank crown with the dipstick running
// diagonally down into the tank. Its line threads the corridor between the filter bypass
// valve and the accessory gearbox bearing, so nothing else on the drawing moves for it.
// Two endpoints are the whole part — cap, blade, click target and callout follow them.
const DIP_X0 = 708, DIP_Y0 = 98;    // the filler cap, above the crown
const DIP_X1 = 676, DIP_Y1 = 244;   // the free end, down in the tank
const DIP_ANG = (Math.atan2(DIP_X0 - DIP_X1, DIP_Y1 - DIP_Y0) * 180) / Math.PI;

// The click target follows the rod instead of boxing it: a bounding rect around a line
// this diagonal would swallow the bearing beside it.
const DIP_HOT = (() => {
  const dx = DIP_X1 - DIP_X0, dy = DIP_Y1 - DIP_Y0, len = Math.hypot(dx, dy);
  const px = (-dy / len) * 8, py = (dx / len) * 8;   // 8 units either side of the rod
  return `M ${DIP_X0 + px},${DIP_Y0 + py} L ${DIP_X0 - px},${DIP_Y0 - py}`
       + ` L ${DIP_X1 - px},${DIP_Y1 - py} L ${DIP_X1 + px},${DIP_Y1 + py}`;
})();

// ── Oil level sight glass, on the right wall of the tank ──
// Figure 1-8 rather than 1-9, and the one part on the page whose colors are its own
// placard rather than a status: the window is red above MAX HOT and below MIN with green
// between them. Same red and green as the oil pressure gauge arcs, so the page carries
// one of each. It sits on the tank's right wall above the aft internal scavenge element,
// in the band the centrifugal breather's callout used to take up. MAX HOT is split across
// the window rather than stacked beside it, which is what buys the captions their size:
// three letters a side fits where seven in a row did not.
const SG_X = 736, SG_Y = 161, SG_W = 12, SG_H = 32;
const SG_MAX = SG_Y + 8;    // top of the green band — MAX HOT
const SG_MIN = SG_Y + 24;   // bottom of the green band — MIN
const SG_FS = 8;
// What is behind the glass, in one narrow column: oil standing two thirds up the green,
// and empty glass above it. The column runs from halfway up the lower red band to halfway
// up the upper one, so the window shows a level rather than a full tube of colour.
const SG_TUBE_TOP = SG_Y + (SG_MAX - SG_Y) / 2;               // halfway up the top red
const SG_TUBE_BOT = SG_MIN + (SG_Y + SG_H - SG_MIN) / 2;      // halfway up the bottom red
const SG_OIL_Y = SG_MIN - (SG_MIN - SG_MAX) * (2 / 3);        // the level itself
const SG_OIL_W = 5, SG_OIL = '#f0e3a0', SG_EMPTY = '#0b1826';
const SG_RED = '#c0392b', SG_GREEN = '#2e8b57';

// The external scavenge pump, outside the gearbox and clear to the right of the tank,
// and the manifold all four elements share on the way to the cooler.
const EXT_F = 784, EXT_A = 828, EXT_Y = 200;
const EXT_FC = EXT_F + PUMP_W / 2, EXT_AC = EXT_A + PUMP_W / 2;
const COOL_Y = 140;

// ── The two pressure risers ──
// The figure runs exactly two lines up off the bottom header, and they divide the
// engine between them: the left one feeds everything forward of the free-turbine gap —
// the gearbox, the propeller and the power turbine bearings — and the middle one, which
// climbs through the gap itself, feeds the compressor bearings and nothing else.
// 1. Propeller interface unit — a placard-sized box on top of the gearbox, fed on its
// left face and delivering out of its bottom into the hollow propeller shaft.
const PIU_X = 166, PIU_Y = 120, PIU_W = 24, PIU_H = 16;
const PIU_CX = PIU_X + PIU_W / 2, PIU_CY = PIU_Y + PIU_H / 2;

const RISER_L = 146;
const RISER_M = 438;
const RGB_GAL = 172;   // the gearbox gallery, above the gear teeth
const GAL_L   = 410;   // the left gallery ends at the aft power turbine bearing
const GAL_R   = 468;   // the middle gallery ends at the one compressor bearing out here

// The gearbox sump sits below the gears rather than on the shaft line, so it gets its
// own pair rather than reusing the bearing trumpet's.
const RGB_SUMP  = 234;
const RGB_CX    = 222;    // the sump, its drain and the chip detector all sit on this line
const RGB_DRAIN = RGB_SUMP + FUN_H;

// Where the bearings sit along the two shafts. Only one of the two compressor bearings
// is out here: the other is at the front of the oil tank, fed from the filtered header.
const PT_FWD = 366, PT_AFT = 410;    // power turbine, off the left gallery
const CP_AFT = 468;                  // compressor, off the middle one

// ── 6. The six oil strainers ──
// One on each feed downstream of the main oil filter, which is what NATOPS says they
// are: one on the left riser, one on the gearbox gallery's journal-bearing drop, one on
// each bearing drop out in the engine, and one on the drop to the bearing in the tank.
const STRAINERS = [
  { x: RISER_L - 7.5, y: 296,     tx: 124,   ty: 303.5 },   // the left riser, feeding the whole gearbox
  { x: 268.5,         y: 164.5,   tx: 296,   ty: 172   },   // gearbox gallery, first stage journal bearing
  { x: PT_FWD - 7.5,  y: 158,     tx: 345.5, ty: 165.5 },   // left gallery, forward power turbine bearing
  { x: PT_AFT - 7.5,  y: 158,     tx: 389.5, ty: 165.5 },   // left gallery, aft power turbine bearing
  { x: CP_AFT - 7.5,  y: 158,     tx: 447.5, ty: 165.5 },   // middle gallery, the compressor bearing
  { x: BRG_CP - 7.5,  y: 158,     tx: 556,   ty: 167, ldr: 'M 560,165 L 565,165' },   // the tank drop, off the filtered header

  // And one on each scavenge line outside the tank, straight after the trumpet that
  // collects it — Figure 1-9 screens the returning oil before it reaches a pump, which
  // is the same 6 as the rest. The gearbox one sits below its chip detector, because the
  // detector is what the drain meets first.
  { x: PT_FWD - 7.5,  y: 241,     tx: 345,   ty: 249, ldr: 'M 349,249 H 357' },   // forward power turbine bearing
  { x: PT_AFT - 7.5,  y: 241,     tx: 389,   ty: 249, ldr: 'M 393,249 H 401' },   // aft power turbine bearing
  { x: CP_AFT - 7.5,  y: 241,     tx: 490,   ty: 249, ldr: 'M 486,249 H 477' },   // the compressor bearing out on the shaft
  { x: RGB_CX - 7.5,  y: 310,     tx: 200,   ty: 318, ldr: 'M 204,318 H 213' },   // reduction gearbox drain, below the chip detector
];

// The engine in profile, as the figure draws it: thin prop shaft at the left,
// stepping up through the reduction gearbox and the gas generator to the accessory
// section and the oil tank at the right.
const ENG_OUTER = 'M 56,186 H 100 V 156 H 128 V 140 H 250 V 128 H 306 V 116 H 470 V 104 H 768 V 328 H 516 V 310 H 470 V 300 H 306 V 288 H 250 V 276 H 128 V 250 H 100 V 216 H 56 Z';
const ENG_INNER = 'M 68,198 H 112 V 168 H 140 V 152 H 262 V 140 H 318 V 128 H 482 V 116 H 756 V 316 H 528 V 298 H 482 V 288 H 318 V 276 H 262 V 264 H 140 V 238 H 112 V 204 H 68 Z';

const ENGINE = (
  <>
    <defs>
      <pattern id="oilEngWall" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={6} stroke={C.engineStroke} strokeWidth={0.7} opacity={0.55} />
      </pattern>
    </defs>
    {/* Outline, then the casing wall hatched between the outer and inner contours —
        the figure's own cutaway convention, and what keeps the long gas generator
        section from reading as an empty box. */}
    <path d={ENG_OUTER} fill={C.engineFill} stroke={C.engineStroke} strokeWidth={1.6} strokeLinejoin="round" />
    <path d={`${ENG_OUTER} ${ENG_INNER}`} fillRule="evenodd" fill="url(#oilEngWall)" stroke="none" />
    <path d={ENG_INNER} fill="none" stroke={C.engineStroke} strokeWidth={0.9} strokeLinejoin="round" />
    <line x1={280} y1={130} x2={280} y2={288} stroke={C.engineStroke} strokeWidth={0.8} strokeDasharray="4 4" />
    <line x1={516} y1={106} x2={516} y2={304} stroke={C.engineStroke} strokeWidth={0.8} strokeDasharray="4 4" />

    {/* The three shafts the numbered bearings carry, with the gap between the second
        and the third that makes this a free turbine: the power turbine drives the
        gearbox and nothing connects it to the gas generator. The pressure riser that
        feeds the internal gallery climbs through that gap. */}
    {/* The power turbine's run is drawn end to end because it carries three stations —
        the journal bearing and both power turbine bearings. The gas generator carries a
        single bearing out here, so it gets a stub the same length as the tank's two
        rather than a tail running aft to nothing. */}
    <g {...SHAFT_LINE}>
      <line x1={68}  y1={SHAFT} x2={182} y2={SHAFT} />
      <line x1={262} y1={SHAFT} x2={424} y2={SHAFT} />
      <line x1={CP_AFT - SHAFT_STUB} y1={SHAFT} x2={CP_AFT + SHAFT_STUB} y2={SHAFT} />
    </g>

    {/* Section names sit above the engine, clear of the parts mounted on top of it */}
    <Lbl x={196} y={86} lines={['REDUCTION GEARBOX']} size={8} fill={C.muted} />
    <Lbl x={398} y={90} lines={['GAS GENERATOR AND POWER SECTION']} size={8} fill={C.muted} />
    {/* Sits left of centre over its section: the cooler return drops into the tank
        crown at x=650 and the caption would read straight through it. */}
    <Lbl x={572} y={58} lh={11} lines={['ACCESSORY SECTION AND OIL TANK', '18.5 U.S. QUARTS']} size={8} fill={C.muted} />
  </>
);

const LABELS = (
  <>
    {/* The two headers carry the figure's own captions. They are the legend.
        The scavenge caption sits right of the gearbox risers rather than under them —
        the two pressure risers cross that band on their way up into the gearbox. */}
    <Lbl x={300} y={388} anchor="middle" size={7} lh={9} fill={C.muted}
      lines={['SCAVENGE OIL FROM PROPELLER', 'AND REDUCTION GEARBOX']} />
    <Lbl x={230} y={427} anchor="middle" size={7} lh={9} fill={C.muted}
      lines={['OIL SUPPLY TO PROPELLER', 'AND REDUCTION GEARBOX']} />

    <Lbl x={26} y={172} anchor="start" size={6.5} lh={8.5} fill={C.muted}
      lines={['OIL SUPPLY', 'TO PROPELLER']} />
    {/* The cooler is off-figure — NATOPS shows only where the oil goes and comes back.
        Its two captions are its click target, since they are the only thing on the page
        that is actually the cooler. */}
    <Named k="oilcooler" x={612} y={21} w={76} h={14} r={2}>
      <Lbl x={650} y={30} size={8} fill={C.muted} lines={['FROM OIL COOLER']} />
    </Named>
    <Named k="oilcooler" x={805} y={79} w={67} h={14} r={2}>
      <Lbl x={838} y={88} size={8} lh={11} fill={C.muted} lines={['TO OIL COOLER']} />
    </Named>
    <Lbl x={BV_CX} y={94} size={8} fill={C.muted} lines={['BREATHER VENT']} />

    <text x={840} y={TB_BOT + 14} style={{ fontFamily: FONT, fontSize: 7, fill: C.muted, textAnchor: 'end', letterSpacing: '0.08em' }}>
      T-6B NATOPS OIL SYSTEM SCHEMATIC — FIGURE 1-9
    </text>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Simulation constants
//
//  Nothing here needs the compression the OBOGS page uses: the two SCU times are
//  already wall-clock seconds, so they run at their true published values. Only the
//  pressure ramp is a choice — slow enough that both timers are demonstrable inside
//  their own bands, which is the whole reason to watch it.
// ─────────────────────────────────────────────────────────────────────────────
const NOMINAL_PSI  = 100;   // mid green arc
const LOSS_RATE    = 3.5;   // psi/s while Sim Oil PX Loss is held on
const RECOVER_RATE = 15;    // psi/s back to nominal when it is released
const NUISANCE_S   = 2.5;   // how long the momentary amber stays up

// CHIP is contamination, and contamination is the gearbox coming apart: hold the warning
// long enough and the pressure goes with it. The delay is a teaching beat, not a
// published figure — long enough to read the message, short enough to see the result.
const CHIP_SEIZE_S = 5;     // seconds of CHIP before the pressure lets go
const SEIZE_RATE   = 40;    // psi/s once it does

// A pump losing its prime does not switch off, it winds down: the oil runs at full speed
// down to 40 psi, then slows off linearly and is stopped by 10, which on this page is
// what a seized engine looks like. Quantised to tenths because the duration is a CSS
// animation — re-timing it on every 20 Hz commit would jitter the dashes instead of
// decelerating them, so the rate steps rather than sliding.
// Truly linear now that the phase is ours: the rate is a plain ramp with no steps in it,
// and it reaches zero exactly at FLOW_STOP.
const FLOW_FULL = 40, FLOW_STOP = 10;
const flowRate = psi => Math.max(0, Math.min(1, (psi - FLOW_STOP) / (FLOW_FULL - FLOW_STOP)));

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
function T6BOilDiagram() {
  const [pclAbove, setPclAbove] = useState(true);   // the only cockpit control
  const [simLoss,  setSimLoss]  = useState(false);
  const [simChip,  setSimChip]  = useState(false);
  const [scuMode,  setScuMode]  = useState(null);   // null | 'nuisance' | 'failed'

  const [psi,       setPsi]       = useState(NOMINAL_PSI);
  const [amberHold, setAmberHold] = useState(0);    // seconds in the 40 – 90 band, above idle
  const [bothHold,  setBothHold]  = useState(0);    // seconds in the 15 – 40 band, at idle

  const [nuisanceT, setNuisanceT] = useState(0);
  const [chipT,     setChipT]     = useState(0);    // seconds the CHIP warning has been up
  const [infoKey, setInfoKey] = useState(null);
  const [hover,   setHover]   = useState(null);     // { title, x, y } — the name under the pointer

  // Stable, so <Named> never re-renders on account of the context itself.
  const parts = useMemo(() => ({
    open: k => setInfoKey(k),
    name: (k, at) => setHover(k ? { title: OIL_INFO[k]?.title ?? '', ...at } : null),
  }), []);

  // ── Derived state — the Figure 1-10 rows, evaluated one for one. Everything the
  //    page shows (row tints, countdowns, annunciators) reads from these. ──
  const idleBand  = !pclAbove && psi > 15 && psi < 40;
  const aboveBand = pclAbove && psi > 40 && psi < 90;

  const active = {
    i1: idleBand,
    i2: idleBand && bothHold >= BOTH_IDLE_S,
    i3: !pclAbove && psi <= 15,
    a1: aboveBand && amberHold >= AMBER_ABOVE_S,
    a2: pclAbove && psi <= 40,
  };

  // A published delay still running: the cell shows it counting down in place.
  const delayLeft = {
    i2: idleBand && bothHold < BOTH_IDLE_S ? BOTH_IDLE_S - bothHold : null,
    a1: aboveBand && amberHold < AMBER_ABOVE_S ? AMBER_ABOVE_S - amberHold : null,
  };

  const scuFailed   = scuMode === 'failed';
  const scuNuisance = scuMode === 'nuisance';

  const redPx   = TB_ROWS.some(r => r.red && active[r.id]) || scuFailed;
  const amberPx = TB_ROWS.some(r => r.amber && active[r.id]) || scuFailed || scuNuisance;
  const flow = flowRate(psi);

  // Stale-closure guard: one mutable mirror written every render, read by the loop.
  const sim = useRef({});
  sim.current = { simLoss, simChip, chipT, aboveBand, idleBand, flow };
  const svgEl = useRef(null);

  useEffect(() => {
    const STEP = 1 / 20;                            // commit at 20 Hz, not per frame
    let raf, last = performance.now(), acc = 0, heal = 0;
    const tick = now => {
      raf = requestAnimationFrame(tick);
      const frame = Math.min(0.1, (now - last) / 1000);
      last = now;

      // Twice a second, give a dash timeline back to any flow line that has lost one.
      // Attaching is per-node and never cancels a healthy neighbour, so a line that is
      // still running keeps its phase and only the stopped one restarts.
      heal += frame;
      if (heal >= 0.5) {
        heal = 0;
        const el = svgEl.current;
        if (el) el.querySelectorAll(`.${FLOW_CLASS}`).forEach(n => {
          if (n.getAnimations().length === 0) attachFlow(n, sim.current.flow);
        });
      }

      acc += frame;
      if (acc < STEP) return;
      const dt = acc;
      acc = 0;
      const s = sim.current;

      // Every setter below bails out when the value is unchanged, so a settled
      // diagram costs nothing.
      setChipT(t => (s.simChip ? t + dt : (t === 0 ? t : 0)));
      setPsi(p => {
        const seizing = s.chipT >= CHIP_SEIZE_S;
        const falling = s.simLoss || seizing;
        const target = falling ? 0 : NOMINAL_PSI;
        if (p === target) return p;
        const diff = target - p;
        const rate = seizing ? SEIZE_RATE : falling ? LOSS_RATE : RECOVER_RATE;
        const step = Math.sign(diff) * rate * dt;
        return Math.abs(step) >= Math.abs(diff) ? target : p + step;
      });
      setAmberHold(h => (s.aboveBand ? Math.min(AMBER_ABOVE_S, h + dt) : (h === 0 ? h : 0)));
      setBothHold(h => (s.idleBand ? Math.min(BOTH_IDLE_S, h + dt) : (h === 0 ? h : 0)));
      setNuisanceT(v => (v > 0 ? Math.max(0, v - dt) : v));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Flow animation ──
  // Rebuilt when the dash pattern itself changes — chip specks are a different cycle
  // length, so their timelines have to be different timelines.
  useEffect(() => {
    const el = svgEl.current;
    if (!el) return;
    el.querySelectorAll(`.${FLOW_CLASS}`).forEach(n => {
      n.getAnimations().forEach(a => a.cancel());
      attachFlow(n, sim.current.flow);
    });
  }, [simChip]);

  // Rate changes touch playbackRate and nothing else, so the phase never moves.
  useEffect(() => {
    const el = svgEl.current;
    if (!el) return;
    el.querySelectorAll(`.${FLOW_CLASS}`).forEach(n => {
      n.getAnimations().forEach(a => { a.playbackRate = flow; });
    });
  }, [flow]);

  // The momentary amber puts itself out — that is the point of it.
  useEffect(() => {
    if (scuMode === 'nuisance' && nuisanceT === 0) setScuMode(null);
  }, [scuMode, nuisanceT]);

  // Pressing the SCU button is a coin flip, and the coin is the lesson: the pressure
  // never leaves the green arc either way, so the gauge cannot tell you which one you
  // got — only whether the amber is still there five seconds later can.
  const pressScu = () => {
    if (scuMode) { setScuMode(null); setNuisanceT(0); return; }
    if (Math.random() < 0.5) { setScuMode('nuisance'); setNuisanceT(NUISANCE_S); }
    else setScuMode('failed');
  };

  return (
    <DiagramShell
      keyframes={KEYFRAMES}
      briefing={{
        verbatim: OIL_VERBATIM, numbers: OIL_NUMBERS, eicas: OIL_EICAS, eps: OIL_EPS,
        sortMemoryFirst: true, conditionalSteps: true, valueMinWidth: 190,
      }}
      sims={[
        // Top row: the one that may turn out to be nothing. It goes red only once the
        // coin has landed on a real failure. The two that always mean something are
        // together underneath it.
        { active: scuMode !== null, onClick: pressScu,          label: 'SCU Fault',   kind: scuFailed ? 'warn' : 'caution', col: 2, row: 1 },
        { active: simLoss, onClick: () => setSimLoss(v => !v),  label: 'Oil PX Loss', kind: 'warn', col: 1, row: 2 },
        { active: simChip, onClick: () => setSimChip(v => !v),  label: 'Chip Detect', kind: 'warn', col: 2, row: 2 },
      ]}
    >
      <>
        {infoKey && OIL_INFO[infoKey]?.items?.length > 0 && (
          <InfoModal {...OIL_INFO[infoKey]} onClose={() => setInfoKey(null)} theme={C} />
        )}

        <svg ref={svgEl} viewBox="0 0 880 800" width="100%" style={{ display: 'block' }}
          onMouseLeave={() => setHover(null)}>
        <PartCtx.Provider value={parts}>
          {ENGINE}

          {/* ══════════════ HOUSINGS ══════════════ */}
          {/* The three things the oil runs *inside* are painted before the plumbing,
              so the lines that cross them stay visible on top of their fill. */}
          <Named k="rgb" x={RGB.x} y={RGB.y} w={RGB.w} h={RGB.h} r={3}>
            <rect x={RGB.x} y={RGB.y} width={RGB.w} height={RGB.h} rx={3}
              fill={C.metalFill} stroke={C.text} strokeWidth={1.2} />
            <text x={210} y={160} style={{ ...T.mini, fontSize: 5.5 }}>30,000 RPM → 2,000 RPM</text>
          </Named>

          <Named k="oiltank" x={TNK.x} y={TNK.y} w={TNK.w} h={TNK.h} r={10}>
            <rect x={TNK.x} y={TNK.y} width={TNK.w} height={TNK.h} rx={10}
              fill={C.tankFill} stroke={C.text} strokeWidth={1.4} />
          </Named>

          {/* ── 10. Oil filler and dipstick ── */}
          {/* The tube is one line drawn twice: a dark rod with a lighter one on top of
              it, which is the figure's pair of parallel tube walls, and a cap square to
              the rod where it leaves the crown. Drawn here rather than with the other
              tank internals so the plumbing crosses in front of it: the stick reaches
              down past the header, it does not run along the outside of the tank. */}
          <Part n="10" k="dipstick" tx={732} ty={95} ldr="M 728,96 L 718,98"
            d={DIP_HOT} x={DIP_X1} y={DIP_Y0} w={DIP_X0 - DIP_X1} h={DIP_Y1 - DIP_Y0}>
            <line x1={DIP_X0} y1={DIP_Y0} x2={DIP_X1} y2={DIP_Y1}
              stroke={C.text} strokeWidth={3.4} strokeLinecap="round" />
            <line x1={DIP_X0} y1={DIP_Y0} x2={DIP_X1} y2={DIP_Y1}
              stroke={C.box} strokeWidth={1.6} strokeLinecap="round" />
            <rect x={DIP_X0 - 8} y={DIP_Y0 - 3.5} width={16} height={7} rx={2}
              fill={C.box} stroke={C.text} strokeWidth={1.2}
              transform={`rotate(${DIP_ANG} ${DIP_X0} ${DIP_Y0})`} />
          </Part>

          {/* ══════════════ SCAVENGE OIL ══════════════ */}
          {/* Drawn first so the pressure lines cross over it, as in Figure 1-9.

              Three return lines leave the engine, and the figure keeps them apart the
              whole way. The reduction gearbox drain runs straight back to the aft external
              element; both power turbine bearings collect on the upper line into the
              forward one; and the compressor bearing out on the shaft gets a line of its
              own, dropping below the casing and running aft to the forward *internal*
              element — the same element the compressor bearing at the front of the tank
              drains into. Every source is a trumpet under a bearing or a sump, inside the
              casing, and the oil only leaves the engine on the drop to its pump. */}
          <F d={`M ${RGB_CX},${RGB_DRAIN} V ${SCAV_A} H ${EXT_AC} V ${EXT_Y + PUMP_H}`} v="scav" anim={flow} chips={simChip} />
          <F d={`M ${PT_FWD},${FUN_B} V ${SCAV_B} H ${EXT_FC} V ${EXT_Y + PUMP_H}`} v="scav" anim={flow} chips={simChip} />
          <F d={`M ${PT_AFT},${FUN_B} V ${SCAV_B}`} v="scav" anim={flow} chips={simChip} />

          {/* The accessory gearbox bearing sits directly on top of the aft element. */}
          <F d={`M ${BRG_AG},${FUN_B_TK} V ${TK_RET + 3} H ${TK_RET_L} V ${ISC_OUT} H ${TK_C15} V ${TK_ISC_Y + ISC_H}`} v="scav" anim={flow} chips={simChip} />
          {/* Both compressor bearings drain to the forward internal element: the one at
              the front of the tank straight down into the return, the one out in the gas
              generator by its own low line around the front of the accessory section. */}
          <F d={`M ${CP_AFT},${FUN_B} V ${CP_RET} H ${TK_C16} V ${TK_ISC_Y}`} v="scav" anim={flow} chips={simChip} />
          <F d={`M ${BRG_CP},${FUN_B_TK} V ${TK_RET + 3}`} v="scav" anim={flow} chips={simChip} />

          {/* All four elements discharge into one manifold and share the single line to
              the cooler; the cooled oil comes back into the top of the tank. */}
          <F d={`M ${TK_C16},${TK_ISC_Y + ISC_H} V ${TK_RET + 8} H 772 V ${COOL_Y}`} v="scav" anim={flow} chips={simChip} />
          <F d={`M ${TK_C15},${TK_ISC_Y + ISC_H} V ${TK_RET + 9}`} v="scav" anim={flow} chips={simChip} />
          <F d={`M 772,${COOL_Y} H ${EXT_AC}`} v="scav" anim={flow} chips={simChip} />
          <F d={`M ${EXT_FC},${EXT_Y} V ${COOL_Y}`} v="scav" anim={flow} chips={simChip} />
          <F d={`M ${EXT_AC},${EXT_Y} V 112`} v="scav" anim={flow} chips={simChip} />
          <path d={`M ${EXT_AC - 6},112 L ${EXT_AC},100 L ${EXT_AC + 6},112 Z`} fill={C.scavengeOil} />
          <path d={`M ${644},32 L ${650},44 L ${656},32 Z`} fill={C.scavengeOil} />
          <F d={`M 650,44 V ${TNK.y}`} v="scav" anim={flow} chips={simChip} />

          {/* The trumpets themselves, on top of the lines that leave them */}
          <Funnel cx={RGB_CX} y={RGB_SUMP} w={22} />
          <Funnel cx={PT_FWD} y={FUN_Y} />
          <Funnel cx={PT_AFT} y={FUN_Y} />
          <Funnel cx={CP_AFT} y={FUN_Y} />
          {/* One under each tank bearing — they drain to different elements */}
          <Funnel cx={BRG_CP} y={FUN_Y_TK} w={22} />
          <Funnel cx={BRG_AG} y={FUN_Y_TK} w={22} />

          {/* ══════════════ PRESSURE OIL ══════════════ */}
          {/* Tank internals, in the order the oil goes through them. Each pickup owns its
              own suction manifold and its own element the whole way — that is the point of
              carrying two of each, and it is why the forward element's riser is drawn
              hopping the aft element's manifold rather than joining it. Both elements
              discharge upward into one manifold; that manifold climbs through the main
              filter and its check valve to the header along the tank top, which feeds the
              two bearings the tank carries and then leaves for the engine.

              The pickups sit aft of the compressor bearing, so the inverted one's lane
              runs the depth of the tank between the regulating valve and the forward
              element. Where it crosses the valve's two legs the crossed line is the one
              that hops — the same idiom as the forward element's riser hopping the aft
              element's suction manifold, and for the same reason: nothing joins here. */}
          <F d={`M ${TK_S19},164 V ${TK_SUC_F} H ${TK_C19} V ${TK_PUMP_Y}`} anim={flow} w={3} />
          <F d={`M ${TK_S18 + 0.3},260 V ${TK_SUC_A} H ${TK_C18} V ${TK_PUMP_Y + TK_PH}`} anim={flow} w={3} />
          <F d={`M ${TK_C18},${TK_SUC_A} H ${TK_REG} V ${TK_PUMP_Y + TK_PH}`} anim={flow} w={3} />

          {/* Discharge: both elements up into one manifold, and the manifold up through
              the filter. The regulating valve is the third leg off that manifold — it
              takes pump discharge, sets the delivered pressure, and dumps what it spills
              back into the aft element's suction, which is the element it bypasses. */}
          <F d={`M ${TK_C18},${TK_PUMP_Y} V ${TK_DISCH} H ${TK_FILT}`} anim={flow} w={3} />
          <F d={`M ${TK_C19},${TK_PUMP_Y} V ${TK_DISCH} H ${TK_FILT} V ${TK_FILT_Y + 11}`} anim={flow} w={3} />
          <F d={`M ${TK_REG},${TK_PUMP_Y} V ${TK_DISCH-10} H ${TK_FILT-1}`} anim={flow} w={3} />

          {/* The filter bypass carries nothing while the filter is clear, so nothing moves
              in it — but it is pressure oil piping, and drawing it grey read as a sensing
              line and buried the valve nobody could find. Same treatment as the transducer
              taps: the fluid's own color, no dashes. */}
          <F d={`M ${TK_FILT},${TK_FILT_Y + 11} H ${TK_FILT-30} V ${TK_FILT_Y - 11} H ${TK_FILT}`} anim={false} w={3} />

          {/* Straight off the filter: the header along the tank top, one drop to the
              bearing at each end of the tank, and one line out to the engine. */}
          <F d={`M ${TK_FILT},${TK_FILT_Y - 11} V ${TK_HDR}`} anim={flow} w={3} />
          <F d={`M ${TK_FILT},${TK_HDR} H ${BRG_AG} V ${AGB_Y - BRG_H}`} anim={flow} w={3} />
          <F d={`M ${TK_FILT},${TK_HDR} H ${TK_OUT} V ${PRESS_Y} H ${RISER_L} V ${RGB_GAL}`} anim={flow} />
          <F d={`M ${BRG_CP},${TK_HDR} V ${AGB_Y - BRG_H}`} anim={flow} w={3} />

          {/* ── The left riser ── */}
          {/* Up the front face of the gearbox to the propeller interface unit, with the
              gearbox gallery branching off it above the gear teeth and running on out of
              the gearbox and up into the engine gallery. Everything forward of the
              free-turbine gap is on this one line. */}
          <F d={`M ${RISER_L},${RGB_GAL} V ${PIU_CY} H ${PIU_X}`} anim={flow} w={3} />
          <F d={`M ${RISER_L},${RGB_GAL} H 276`} anim={flow} w={3} />
          <F d={`M 200,${RGB_GAL} V 180`} anim={flow} w={3} />
          <F d={`M 240,${RGB_GAL} V 181`} anim={flow} w={3} />
          <F d={`M 276,${RGB_GAL} V ${BRG_TOP}`} anim={flow} w={3} />
          <F d={`M 276,${RGB_GAL} V ${GAL_Y} H ${GAL_L}`} anim={flow} w={3} />
          <F d={`M ${PT_FWD},${GAL_Y} V ${BRG_TOP}`} anim={flow} w={3} />
          <F d={`M ${PT_AFT},${GAL_Y} V ${BRG_TOP}`} anim={flow} w={3} />

          {/* ── The middle riser ── */}
          {/* Climbs through the free-turbine gap — the one place a riser can cross the
              engine without cutting a shaft — and feeds the compressor bearing, which is
              all it feeds. Its pair is at the front of the tank, fed off the header. */}
          <F d={`M ${RISER_M},${PRESS_Y} V ${GAL_Y} H ${GAL_R}`} anim={flow} w={3} />
          <F d={`M ${CP_AFT},${GAL_Y} V ${BRG_TOP}`} anim={flow} w={3} />

          {/* Out through the hollow propeller shaft. The oil never leaves the engine:
              it drops out of the interface unit into the gearbox and runs forward inside
              the shaft, which is how the real piping does it. */}
          <g>
            <F d={`M ${PIU_CX},${PIU_Y + PIU_H} V ${SHAFT} H 40`} v="prop" anim={flow} />
            <path d={`M 46,${SHAFT - 6} L 30,${SHAFT} L 46,${SHAFT + 6} Z`} fill={C.propOil} />
          </g>

          {/* Transducer taps — dead ends off the pressure line, so nothing flows in them.
              Each drops onto its own transducer's centreline, derived so the two cannot
              come adrift of the boxes again. */}
          <F d={`M ${TRX_T_X + TRX_T_W / 2},${PRESS_Y} V ${TRX_Y}`} anim={false} w={2.6} />
          <F d={`M ${TRX_P_CX},${PRESS_Y} V ${TRX_Y}`} anim={false} w={2.6} />

          {/* ══════════════ BREATHER ══════════════ */}
          {/* Two separate devices, not one chain: the breather valve vents the tank, and
              the centrifugal breather in the opposite corner spins oil mist out of the
              air the accessory drives vent. Air, not oil, and never animated. */}
          <F d={`M ${BV_CX},${BV_CY - BV_R} V 104`} v="breath" anim={false} />

          {/* ══════════════ TANK INTERNALS ══════════════ */}
          {/* Pickups — unnumbered in the figure, but the reason the system works
              inverted, so both are their own click target. Both stand aft of the
              compressor bearing, at opposite ends of the tank's depth: the inverted one
              near the crown feeds the forward pump element, the normal one down on the
              floor feeds the aft. */}
          <Named k="invertedpickup" x={TK_S19 - 8} y={146} w={17} h={19} r={3}>
            <Pickup x={TK_S19} y={160} dir={1} />
          </Named>
          <Named k="normalpickup" x={TK_S18 - 8} y={246} w={17} h={19} r={3}>
            <Pickup x={TK_S18} y={260} dir={1} />
          </Named>

          {/* ── 9. Breather valve, in the top of the tank ── */}
          <Part n="9" k="breathervalve" tx={BV_CX - 26} ty={BV_CY + 3}
            ldr={`M ${BV_CX - 22},${BV_CY + 1} L ${BV_CX - 10},${BV_CY}`}
            x={BV_CX - BV_R - 0.5} y={BV_CY - BV_R - 0.5} w={BV_R * 2 + 1} h={BV_R * 2 + 1} r={BV_R + 1}>
            <BreatherValve cx={BV_CX} cy={BV_CY} r={BV_R} />
          </Part>

          {/* ── 11. Centrifugal breather, in the opposite top corner of the tank ── */}
          {/* Its number goes up out of the tank on a long leader, the way the figure
              calls it out, which leaves the wall below the breather to the sight glass. */}
          <Part n="11" k="centrifbreather" tx={762} ty={96} ldr={`M 758,100 L ${CB_CX + 9},${CB_CY - 10}`}
            x={CB_CX - CB_R} y={CB_CY - CB_R} w={CB_R * 2} h={CB_R * 2} r={CB_R}>
            <CentrifBreather cx={CB_CX} cy={CB_CY} r={CB_R} />
          </Part>

          {/* ── 12. Main oil filter and check valve — one part, one symbol ── */}
          <Part n="12" k="mainfilter" tx={TK_FILT + 25} ty={TK_FILT_Y} ldr={`M ${TK_FILT + 19},${TK_FILT_Y} H ${TK_FILT + 12}`} cx={TK_FILT} cy={TK_FILT_Y} rc={13}>
            <FilterRing cx={TK_FILT} cy={TK_FILT_Y} r={11} />
          </Part>

          {/* ── 22. Filter bypass valve, on the loop around the filter ── */}
          <Part n="22" k="filterbypassvalve" tx={TK_FILT-34} ty={TK_FILT_Y-24}
            ldr={`M ${TK_FILT-34},${TK_FILT_Y-20} V ${TK_FILT_Y-12}`}
            x={TK_FILT-45} y={TK_FILT_Y-10} w={22} h={20} r={2}>
            <Poppet x={TK_FILT-45} y={TK_FILT_Y-10} />
          </Part>

          {/* ── 21. Pressure regulating valve. It sits left of both pump elements, on the
                 long pair of lines that take discharge off the manifold above them and
                 return what it spills to the aft element's suction below — so the element
                 it bypasses is the aft one. ── */}
          <Part n="21" k="pressureregvalve" tx={TK_REG - 14} ty={PUMP_N_Y} ldr={`M ${TK_REG - 10},${PUMP_N_Y - 6} L ${TK_REG},${TK_PUMP_Y + TK_PH + 2}`}
            x={TK_REG - 11} y={TK_PUMP_Y} w={22} h={TK_PH} r={2}>
            <Poppet x={TK_REG - 11} y={TK_PUMP_Y} h={TK_PH} />
          </Part>

          {/* ── 18 / 19. Pressure pump elements, one on each pickup. The numbers sit under
                 their elements rather than off a corner, 19 pulled inboard of its centre
                 to clear the tank drain hanging off the floor beside it. ── */}
          <Part n="19" k="pressurepumpfwd" tx={TK_C19 - 11} ty={PUMP_N_Y} ldr={`M ${TK_C19 - 9},${PUMP_N_Y - 6} L ${TK_C19 - 4},${TK_PUMP_Y + TK_PH + 2}`}
            x={TK_P19} y={TK_PUMP_Y} w={TK_PW} h={TK_PH} r={3}>
            <PumpElement x={TK_P19} y={TK_PUMP_Y} w={TK_PW} h={TK_PH} />
          </Part>
          <Part n="18" k="pressurepumpaft" tx={TK_C18} ty={PUMP_N_Y} ldr={`M ${TK_C18},${PUMP_N_Y - 6} V ${TK_PUMP_Y + TK_PH + 2}`}
            x={TK_P18} y={TK_PUMP_Y} w={TK_PW} h={TK_PH} r={3}>
            <PumpElement x={TK_P18} y={TK_PUMP_Y} w={TK_PW} h={TK_PH} />
          </Part>

          {/* ── The two bearings the tank carries. Figure 1-9 numbers neither: the
                 compressor bearing at the front of the tank shares the 8 out in the
                 engine, and the accessory drive bearing is never called out at all. The
                 accessory one sits directly over the element that drains it; the
                 compressor one returns aft to the same forward element that takes the
                 compressor bearing out on the shaft. ── */}
          {/* Each carries its own stub of shaft, the way every other bearing on the page
              does. They are all on AGB_Y = SHAFT, so the stubs read as one shaft without a
              bar drawn across the tank's plumbing. */}
          <Named k="compressorbearings" x={BRG_CP - 14} y={AGB_Y - BRG_H - 2} w={28} h={BRG_H * 2 + 4} r={4}>
            <line x1={BRG_CP - SHAFT_STUB} y1={AGB_Y} x2={BRG_CP + SHAFT_STUB} y2={AGB_Y} {...SHAFT_LINE} />
            <Bearing cx={BRG_CP} cy={AGB_Y} w={22} />
          </Named>
          <Named k="agb" x={BRG_AG - 14} y={AGB_Y - BRG_H - 2} w={28} h={BRG_H * 2 + 4} r={4}>
            <line x1={BRG_AG - SHAFT_STUB} y1={AGB_Y} x2={BRG_AG + SHAFT_STUB} y2={AGB_Y} {...SHAFT_LINE} />
            <Bearing cx={BRG_AG} cy={AGB_Y} w={22} />
          </Named>

          {/* ── 15 / 16. Internal scavenge pump, at the back of the tank ── */}
          {/* Both are called out from below and outboard. 16 clears x=698, where its own
              return climbs from the gas generator compressor bearing. */}
          <Part n="16" k="intscavengefwd" tx={712} ty={291} ldr="M 710,285 L 705,270" x={TK_I16} y={TK_ISC_Y} w={ISC_W} h={ISC_H} r={3}>
            <PumpElement x={TK_I16} y={TK_ISC_Y} w={ISC_W} h={ISC_H} />
          </Part>
          <Part n="15" k="intscavengeaft" tx={750} ty={293} ldr="M 744,287 L 738,269" x={TK_I15} y={TK_ISC_Y} w={ISC_W} h={ISC_H} r={3}>
            <PumpElement x={TK_I15} y={TK_ISC_Y} w={ISC_W} h={ISC_H} />
          </Part>

          {/* ── 17. Bypass valve, on the return into the forward internal element ── */}
          <Part n="17" k="bypassvalve" tx={720} ty={TK_FLOOR - 4} ldr={`M 716,${TK_FLOOR - 6} L 709,${TK_FLOOR - 7}`}
            x={686} y={TK_FLOOR - 16} w={22} h={16} r={2}>
            <Poppet x={686} y={TK_FLOOR - 16} h={16} />
          </Part>

          {/* ── 20. Oil tank drain ── */}
          <Part n="20" k="oiltankdrain" tx={620} ty={PUMP_N_Y + 12} x={612} y={TK_FLOOR} w={16} h={14} r={2}>
            <Drain cx={620} y={TK_FLOOR} />
          </Part>

          {/* ── 13 / 14. External scavenge pump, outside the gearbox and right of the
                 tank, where Figure 1-9 puts it ── */}
          <Part n="14" k="extscavengefwd" tx={824} ty={184} x={EXT_F} y={EXT_Y} w={PUMP_W} h={PUMP_H} r={3}>
            <PumpElement x={EXT_F} y={EXT_Y} />
          </Part>
          <Part n="13" k="extscavengeaft" tx={868} ty={184} x={EXT_A} y={EXT_Y} w={PUMP_W} h={PUMP_H} r={3}>
            <PumpElement x={EXT_A} y={EXT_Y} />
          </Part>

          {/* ══════════════ WHAT THE PRESSURE OIL FEEDS ══════════════ */}
          {/* ── 1. Propeller interface unit, on top of the reduction gearbox ── */}
          {/* Sized to its own placard: the riser arrives on its left face at PIU_CY and
              the propeller supply leaves the bottom, so the box is only as big as the
              three letters on it. */}
          <Part n="1" k="piu" tx={206} ty={114} ldr="M 202,116 L 194,124"
            x={PIU_X} y={PIU_Y} w={PIU_W} h={PIU_H} r={2}>
            <rect x={PIU_X} y={PIU_Y} width={PIU_W} height={PIU_H} rx={2} fill={C.box} stroke={C.text} strokeWidth={1.2} />
            <text x={PIU_CX} y={PIU_CY} style={{ ...T.sym, fontSize: 7 }}>PIU</text>
          </Part>

          {/* ── 2 / 3. Reduction gear stages, meshing on the shaft centreline ── */}
          <Part n="2" k="secondstagegears" tx={192} ty={254} x={179} y={180} w={42} h={42} r={21}>
            <Gear cx={200} cy={SHAFT} r={18} teeth={13} />
          </Part>
          <Part n="3" k="firststagegears" tx={250} ty={254} x={221} y={182} w={39} h={39} r={19}>
            <Gear cx={240} cy={SHAFT} r={17} teeth={12} />
          </Part>

          {/* ── 4. First stage journal bearing, on the input shaft where the torque
                 shaft drives the gearbox ── */}
          <Part n="4" k="journalbearing" tx={302} ty={230} ldr="M 296,228 L 288,218"
            x={263} y={SHAFT - JRN_H} w={26} h={JRN_H * 2} r={3}>
            <Journal cx={276} cy={SHAFT} />
          </Part>

          {/* ── 23. Reduction gearbox oil drain and chip detector ── */}
          <Part n="23" k="rgbdrainchip" tx={178} ty={294} ldr="M 184,292 L 206,282"
            x={RGB_CX - 13} y={274} w={26} h={16} r={2}>
            <ChipDetector cx={RGB_CX} y={274} lit={simChip} />
          </Part>

          {/* ── 5. Torque shaft assembly ── */}
          <Part n="5" k="torqueshaft" tx={322} ty={176} x={296} y={SHAFT - 8} w={52} h={16} r={8}>
            <rect x={296} y={SHAFT - 8} width={52} height={16} rx={8} fill={C.box} stroke={C.text} strokeWidth={1.2} />
            <line x1={304} y1={SHAFT} x2={340} y2={SHAFT} stroke={C.stroke} strokeWidth={1.2} strokeDasharray="4 3" />
          </Part>

          {/* ── 7. Power turbine bearings — the figure draws two and numbers them both
                 7, so both targets open the one record. ── */}
          <Part n="7" k="turbinebearings" tx={388} ty={138}
            x={PT_FWD - 13} y={BRG_TOP} w={PT_AFT - PT_FWD + 26} h={BRG_H * 2} r={4}>
            <Bearing cx={PT_FWD} cy={SHAFT} />
            <Bearing cx={PT_AFT} cy={SHAFT} />
          </Part>

          {/* ── 8. Compressor bearings. Only one of the pair is out here on the shaft —
                 the other is housed inside the oil tank, drawn at the back of it, and
                 both targets open the one record. ── */}
          <Part n="8" k="compressorbearings" tx={492} ty={138} ldr="M 488,142 L 478,168"
            x={CP_AFT - 14} y={BRG_TOP} w={28} h={BRG_H * 2} r={4}>
            <Bearing cx={CP_AFT} cy={SHAFT} />
          </Part>

          {/* ── 6. Oil strainers. Six instances of one part: the figure numbers every
                 one of them 6, and they all open the same record. ── */}
          {STRAINERS.map(s => (
            <Part key={`${s.x}-${s.y}`} n="6" k="strainer" tx={s.tx} ty={s.ty} ldr={s.ldr} x={s.x} y={s.y} w={15} h={15} r={2}>
              <Strainer x={s.x} y={s.y} />
            </Part>
          ))}

          {/* Sight glass — Figure 1-8 rather than 1-9, but it is the thing students are
              told not to use, so it stays on the tank. The two bands are clipped to the
              pill so the window keeps one outline, and each caption sits level with the
              band boundary it names. */}
          <Named k="sightglass" x={SG_X} y={SG_Y} w={SG_W} h={SG_H} r={SG_W / 2}>
            <defs>
              <clipPath id="oilSightGlass">
                <rect x={SG_X} y={SG_Y} width={SG_W} height={SG_H} rx={SG_W / 2} />
              </clipPath>
            </defs>
            <g clipPath="url(#oilSightGlass)">
              <rect x={SG_X} y={SG_Y} width={SG_W} height={SG_H} fill={SG_RED} />
              <rect x={SG_X} y={SG_MAX} width={SG_W} height={SG_MIN - SG_MAX} fill={SG_GREEN} />
              <rect x={SG_X + (SG_W - SG_OIL_W) / 2} y={SG_TUBE_TOP}
                width={SG_OIL_W} height={SG_OIL_Y - SG_TUBE_TOP} fill={SG_EMPTY} />
              <rect x={SG_X + (SG_W - SG_OIL_W) / 2} y={SG_OIL_Y}
                width={SG_OIL_W} height={SG_TUBE_BOT - SG_OIL_Y} fill={SG_OIL} />
            </g>
            <rect x={SG_X} y={SG_Y} width={SG_W} height={SG_H} rx={SG_W / 2}
              fill="none" stroke={C.text} strokeWidth={1.1} />
            <text x={SG_X - 4} y={SG_MAX} style={{ ...T.mini, fontSize: SG_FS, textAnchor: 'end' }}>MAX</text>
            <text x={SG_X + SG_W + 4} y={SG_MAX} style={{ ...T.mini, fontSize: SG_FS, textAnchor: 'start' }}>HOT</text>
            <text x={SG_X + SG_W + 4} y={SG_MIN} style={{ ...T.mini, fontSize: SG_FS, textAnchor: 'start' }}>MIN</text>
          </Named>

          {/* The cooler is off-figure: NATOPS shows only the two arrows, so the arrows
              are its click target. */}

          {/* ══════════════ INDICATION CHAIN ══════════════ */}
          {/* Pressure goes transducer → EDM → SCU → EICAS, on the Figure 1-10 logic in
              the table below. Temperature goes transducer → EDM and never touches the
              SCU, which is why there is no OIL TEMP message — only a gauge with arcs.
              The EDM's own run to the screen is the indications; the SCU's is the two
              OIL PX messages. */}
          <Named k="temptransducer" x={TRX_T_X} y={TRX_Y} w={TRX_T_W} h={IND_H} r={2}>
            <IndBox x={TRX_T_X} y={TRX_Y} w={TRX_T_W} lines={TRX_T_L} />
          </Named>

          <Named k="pxtransducer" x={TRX_P_X} y={TRX_Y} w={TRX_P_W} h={IND_H} r={2}>
            <IndBox x={TRX_P_X} y={TRX_Y} w={TRX_P_W} lines={TRX_P_L} />
          </Named>

          {/* Both data runs drop straight into the EDM's top face. They are live whenever
              the aircraft is: a transducer reads every second of every flight, and the
              OIL PX EP turns on being able to say which of them the cockpit believes. */}
          <El d={`M ${TRX_T_X + TRX_T_W / 2},${TRX_Y + IND_H} V ${EDM_Y - 6} H ${EDM_X + 18} V ${EDM_Y}`} live />
          <El d={`M ${TRX_P_CX},${TRX_Y + IND_H} V ${EDM_Y - 6} H ${EDM_X + EDM_W - 18} V ${EDM_Y}`} live />

          <Named k="edm" x={EDM_X} y={EDM_Y} w={EDM_W} h={IND_H} r={2}>
            <IndBox x={EDM_X} y={EDM_Y} w={EDM_W} lines={EDM_L} />
          </Named>

          <El d={`M ${IND_CX},${EDM_Y + IND_H} V ${SCU_Y - 6} H ${TRX_P_CX} V ${SCU_Y}`} live />
          <El d={`M ${EDM_X},${EDM_Y + IND_H / 2} H ${EDM_X - 20} V ${EICAS_Y}`} live />

          <Named k="scu" x={SCU_X} y={SCU_Y} w={SCU_W} h={IND_H} r={2}>
            <IndBox x={SCU_X} y={SCU_Y} w={SCU_W} lines={SCU_L} alert={scuFailed} />
          </Named>
          {/* A real SCU failure gets struck through: the box is still passing something
              to the screen, and what it is passing is wrong. */}
          {scuFailed && (
            <g stroke={C.warningText} strokeWidth={2.4} strokeLinecap="round" pointerEvents="none">
              <line x1={SCU_X + 4} y1={SCU_Y + 4} x2={SCU_X + SCU_W - 4} y2={SCU_Y + IND_H - 4} />
              <line x1={SCU_X + SCU_W - 4} y1={SCU_Y + 4} x2={SCU_X + 4} y2={SCU_Y + IND_H - 4} />
            </g>
          )}
          <El d={`M ${TRX_P_CX},${SCU_Y + IND_H} V ${EICAS_Y}`} live />

          {/* ══════════════ COCKPIT ══════════════ */}
          <Gauge psi={psi} />

          <PclQuadrant above={pclAbove} onSelect={setPclAbove} />

          {/* The screen the chain lights. What decides the two OIL PX rows is the logic
              in the table underneath; CHIP is on the same screen but comes from the
              detector in the gearbox, which is why it lights there as well. */}
          <text x={EICAS_X} y={EICAS_Y - 9} style={{ ...T.mini, fontSize: 8, textAnchor: 'start' }}>EICAS</text>
          <EicasScreen redPx={redPx} chip={simChip} amberPx={amberPx} />

          {/* ══════════════ NATOPS FIGURE 1-10 ══════════════ */}
          <Fig110Table active={active} delayLeft={delayLeft} />

          {LABELS}

          {/* Last, so the name of the part under the pointer sits over everything */}
          <HoverName hv={hover} />
        </PartCtx.Provider>
        </svg>
      </>
    </DiagramShell>
  );
}

export default T6BOilDiagram;
