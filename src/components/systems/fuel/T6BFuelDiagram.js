import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { THEME, DIAGRAM_FONT } from '../diagramTheme';
import { FUEL_VERBATIM, FUEL_NUMBERS, FUEL_EICAS, FUEL_EPS, FUEL_INFO } from './FuelModalData';
import DiagramShell from '../DiagramShell';
import { InfoModal } from '../InfoModal';
import { Hot } from '../Hot';
import { T, Lbl, Ldr, El, Mech } from '../Notation';

// ── Keyframes (dash cycles: 8+4=12, 6+5=11, 5+5=10 — offsets are one full cycle ×2) ──
// The hover-ring rules and the signal-run chase are not here: DiagramShell injects
// the shared HOT_STYLES and SIGNAL_KEYFRAMES.
const KEYFRAMES = `
  @keyframes fuelFlowA { to { stroke-dashoffset: -24; } }
  @keyframes fuelFlowB { to { stroke-dashoffset: -22; } }
  @keyframes fuelFlowC { to { stroke-dashoffset: -20; } }
  .fuel-paused * { animation-play-state: paused !important; }
`;

// ── Colors: shared THEME + NATOPS line-function colors (named by function, not severity) ──
const LOCAL = {
  feedLine:   '#c0392b', // ENGINE FEED (red)
  motiveLine: '#2e8b57', // MOTIVE FLOW / RETURN FLOW (green)
  refuelLine: '#d4b81e', // SINGLE POINT REFUEL/DEFUEL (yellow)
  purgeLine:  '#5b9bd5', // PURGE LINE (blue)
  tankFill: '#d9dee4', tankStroke: '#8a97a5', collectorFill: '#cfd6dd',
  ventLine: '#8b9cad',
  annWarning: '#f2453d', annCaution: '#e0b830', annAdvisory: '#4fbf6b',
};

const C = { ...THEME, ...LOCAL };
const FONT = DIAGRAM_FONT;

// ── Fuel line: colored pipe + white animated dash overlay (site flow idiom) ──
// spd scales dash speed (>1 faster, <1 slower) — used to speed motive supply and
// slow motive return across the jet pumps.
const F_CFG = {
  feed:   { color: C.feedLine,   width: 4,   dash: '8 4', dur: 1.30, kf: 'fuelFlowA' },
  motive: { color: C.motiveLine, width: 3.2, dash: '6 5', dur: 1.19, kf: 'fuelFlowB' },
  purge:  { color: C.purgeLine,  width: 3,   dash: '5 5', dur: 1.4, kf: 'fuelFlowC' },
  refuel:     { color: C.refuelLine, width: 3.2 },
  refuelFlow: { color: C.refuelLine, width: 3.2, dash: '6 5', dur: 1.25, kf: 'fuelFlowB' },
  vent:       { color: C.ventLine,   width: 2 },
};

function F({ d, v = 'feed', anim = true, w, spd = 1 }) {
  const cfg = F_CFG[v];
  return (
    <g>
      <path d={d} fill="none" stroke={cfg.color} strokeWidth={w ?? cfg.width} />
      {anim && cfg.dash && (
        <path d={d} fill="none" stroke={C.wireDash} strokeWidth={1.4}
          style={{ strokeDasharray: cfg.dash, animation: `${cfg.kf} ${(cfg.dur / spd).toFixed(3)}s linear infinite` }} />
      )}
    </g>
  );
}

// Motive dash speed either side of the jet pumps. Supply — before the pumps — runs at F's
// own base speed, the same visual rate as the engine-feed line, so those runs pass no spd
// prop at all. Only the return side, after the pumps, is marked: half that.
const MOTIVE_SLOW = 0.5;

// Per-side quantity, 0 → MAX_FUEL. The collector holds 40 lbs that the collector fuel
// probe splits evenly between the two tank indications, so each side reads 20 lbs above
// what its wing physically holds and a full aircraft is 550 + 550 = 1100 lbs. Modelling
// that split into the side totals is what makes the gauge honest at both ends: 550 per
// bar when full, and a true 0 lbs aboard when both bars read empty.
const MAX_FUEL           = 550;

// Single-point refuel runs at a constant rate: a full 0 → MAX_FUEL fill takes REFUEL_SECS,
// so a partial fill is proportionally shorter. Each wing's pilot valve flashes over the
// final PILOT_FLASH_SECS of its own fill (i.e. the last REFUEL_RATE·PILOT_FLASH_SECS lbs),
// then its shutoff valve flashes for SHUTOFF_FLASH_SECS.
const REFUEL_SECS        = 15;
const PILOT_FLASH_SECS   = 1.5;
const SHUTOFF_FLASH_SECS = 5;
const REFUEL_RATE        = MAX_FUEL / REFUEL_SECS;          // lbs/s per wing (≈36.7)
const PILOT_LBS          = REFUEL_RATE * PILOT_FLASH_SECS;  // final-stretch band (≈55 lbs)

// ── Fuel probes ──────────────────────────────────────────────────────────────
// Seven probes: three per wing plus the collector probe.
//
// The three wing probes hand off to each other as the tank empties, each sensing one
// band of that side's indication. A failed one reads the bottom of its own band, so
// while it is the active probe the indication sits at that floor and does not move
// until the next probe takes over — which is why a failure outside the active band
// shows no imbalance at all.
const PROBE_BANDS = [
  { id: 'outer', min: 445 },
  { id: 'mid',   min: 308 },
  { id: 'inner', min: 20 },
];
const PROBE_IDS = ['L-outer', 'L-mid', 'L-inner', 'R-outer', 'R-mid', 'R-inner', 'collector'];

// The collector probe has no band: it is always active, always splitting the collector's
// 40 lbs evenly between the two indications. Losing it simply takes 20 lbs off each side
// at every quantity, rather than pinning anything to a floor.
const COLLECTOR_SHARE = 20;

// Indicated quantity for one side given which of its probes (if any) has failed.
const indicate = (qty, failId) => {
  if (failId === 'coll') return Math.max(0, qty - COLLECTOR_SHARE);
  for (const b of PROBE_BANDS) {
    if (qty > b.min) return failId === b.id ? b.min : qty;
  }
  return qty;                      // below the inner probe — only the collector share left
};

// The collector probe feeds both sides; a wing probe feeds only its own.
const sideFail = (failedProbe, side) =>
  failedProbe === 'collector' ? 'coll'
    : failedProbe && failedProbe.startsWith(`${side}-`) ? failedProbe.slice(2)
      : null;

// Pre-check: with the pre-check valve open, single-point pressure reaches the level
// control pilot valves through the pre-check lines. PRECHECK_ARM_SECS later the pilot
// valves sense it and run the identical shutoff sequence a tank does when it tops off —
// pilot valves flash for PILOT_FLASH_SECS, then the level control shutoff valves latch
// closed and flash for SHUTOFF_FLASH_SECS, which is what stops the refuel.
const PRECHECK_ARM_SECS  = 1;

// Defuel drains the wings through the collector and out the single-point adapter at
// DEFUEL_RATE; once dry, its level control shutoff valve highlights briefly.
const DEFUEL_RATE        = 100;                             // lbs/s per wing
const DEFUEL_FLASH_SECS  = 2;

// Fuel low level float switches trip at FUEL_LO_LBS per side. The fuel quantity bars go
// yellow at the same point the FUEL LO warning is meaningful — BARS_YELLOW_LBS is the
// gauge's own caution band, read off the ×100 scale, not the switch setting.
const FUEL_LO_LBS        = 110;
const BARS_YELLOW_LBS    = 150;

// Fuel balance. The system tolerates BAL_TOLERANCE_LBS between the tanks; in AUTO it
// holds the lighter tank's valve shut for up to BAL_ATTEMPT_MS trying to close the gap,
// then gives up, reopens both and latches the caution.
const BAL_TOLERANCE_LBS  = 30;
const BAL_ATTEMPT_MS     = 2000;

// Sim fuel imbalance: how far apart the tanks are pushed. The floor sits above
// BAL_TOLERANCE_LBS so the fault always trips, and the ceiling stays wide enough that
// AUTO cannot claw it back inside BAL_ATTEMPT_MS.
const IMBALANCE_MIN      = 35;
const IMBALANCE_MAX      = 80;

// Low fuel pressure. Two equally likely presentations:
//   'cyclic' — the low pressure switch and the boost pump chase each other through three
//     phases of PX_CYCLE_SECS each: FUEL PX lit with the pump off, then the pump running
//     with the warning cleared, then neither as the switch releases the pump — and round
//     again as pressure decays. FUEL PX and BOOST PUMP are never lit together, because the
//     pump running is exactly what clears the warning. BOOST PUMP ON breaks the cycle.
//   'steady' — the switch commands the pump on and pressure still never recovers, so both
//     FUEL PX and BOOST PUMP stay illuminated together. Nothing the pilot selects clears it.
const PX_MODES      = ['cyclic', 'steady'];
const PX_CYCLE_SECS = 1;
const PX_SEQUENCE   = [1, 2, 0];               // phase per slot: FUEL PX → boost pump → clear

// Firewall shutoff: the engine feed is cut at the valve immediately; the engine then
// winds down and all remaining lines stop after FW_FLAMEOUT_SECS.
const FW_FLAMEOUT_SECS   = 0.5;

// ── NATOPS legend symbols (shared between legend + diagram body) ─────────────
// Check valve — box with a thin shafted arrow in the flow direction (default points +x; use rot)
const CheckValve = ({ x, y, rot = 0 }) => (
  <g transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} stroke={C.text} fill="none">
    <rect x={x - 6} y={y - 4.5} width={12} height={9} fill={C.box} strokeWidth={0.9} />
    <line x1={x - 3.5} y1={y} x2={x + 3} y2={y} strokeWidth={0.9} />
    <path d={`M ${x + 0.5},${y - 2} L ${x + 3.5},${y} L ${x + 0.5},${y + 2}`} strokeWidth={0.9} strokeLinejoin="round" strokeLinecap="round" />
  </g>
);

const TValve = ({ x, y, open = true }) => (
  <g>
    <rect x={x - 8} y={y - 6} width={16} height={12} fill={open ? C.box : C.boxAlt} stroke={C.text} strokeWidth={1} />
    <text x={x} y={y + 0.5} style={{ ...T.sym, fill: open ? C.text : C.muted }}>TV</text>
    {!open && <path d={`M ${x - 8},${y + 6} L ${x + 8},${y - 6}`} stroke={C.muted} strokeWidth={1.3} />}
  </g>
);

// Jet pump (eductor nozzle) — drawn pointing +x (discharge to the right)
const JetPump = ({ x, y, rot = 0 }) => (
  <g transform={`rotate(${rot} ${x} ${y})`} stroke={C.text} strokeWidth={1}>
    <path d={`M ${x - 9},${y - 5.5} L ${x + 1},${y - 2.5} H ${x + 9} V ${y + 2.5} H ${x + 1} L ${x - 9},${y + 5.5} Z`} fill={C.box} />
    <path d={`M ${x - 4},${y} H ${x + 6}`} strokeWidth={0.8} />
  </g>
);

const SoRefuel = ({ x, y, hot }) => (
  <g stroke={hot ? C.warningText : C.text} strokeWidth={hot ? 1.6 : 1} fill={hot ? C.warningTint : C.box}>
    <rect x={x - 6} y={y - 6} width={12} height={12} />
    <path d={`M ${x - 6},${y - 6} L ${x + 6},${y + 6} M ${x + 6},${y - 6} L ${x - 6},${y + 6}`} />
  </g>
);

const SoDefuel = ({ x, y, hot }) => (
  <g stroke={hot ? C.warningText : C.text} strokeWidth={hot ? 1.6 : 1} fill="none">
    <circle cx={x} cy={y} r={6} fill={hot ? C.warningTint : C.box} />
    <circle cx={x} cy={y} r={2.8} />
  </g>
);

const PilotValve = ({ x, y, hot }) => (
  <g stroke={hot ? C.warningText : C.text} strokeWidth={hot ? 1.6 : 1}>
    <rect x={x - 6} y={y - 6} width={12} height={12} fill={hot ? C.warningTint : C.box} />
    <circle cx={x} cy={y} r={3} fill="none" />
  </g>
);

const CL = ({ x, y, l }) => (
  <g>
    <circle cx={x} cy={y} r={6} fill={C.box} stroke={C.text} strokeWidth={1} />
    <text x={x} y={y + 0.5} style={T.sym}>{l}</text>
  </g>
);

const Probe = ({ x, y, failed }) => (
  <g stroke={C.text} strokeWidth={1} fill="none">
    <circle cx={x} cy={y} r={5.5} fill={failed ? C.warningTint : C.box} />
    <path d={`M ${x},${y} L ${x + 3.2},${y - 3.2}`} />
    <path d={`M ${x},${y + 5.5} V ${y + 9}`} />
    {failed && (
      <path d={`M ${x - 8},${y - 8} L ${x + 8},${y + 8} M ${x + 8},${y - 8} L ${x - 8},${y + 8}`}
        stroke={C.warningText} strokeWidth={2.6} strokeLinecap="round" />
    )}
  </g>
);

const FloatValve = ({ x, y }) => (
  <g>
    <rect x={x - 9} y={y - 6} width={18} height={12} fill={C.box} stroke={C.text} strokeWidth={1} />
    <text x={x} y={y + 0.5} style={T.sym}>FV</text>
  </g>
);

const BoostPump = ({ x, y, on = false }) => (
  <g stroke={on ? C.accent : C.text} strokeWidth={1.1}>
    <circle cx={x} cy={y} r={9} fill={on ? '#dcebf0' : C.box} />
    {[30, 150, 270].map(a => (
      <path key={a} d={`M ${x},${y} L ${x + 6.5 * Math.cos((a * Math.PI) / 180)},${y + 6.5 * Math.sin((a * Math.PI) / 180)}`} />
    ))}
    <circle cx={x} cy={y} r={2} fill={on ? C.accent : C.text} stroke="none" />
  </g>
);

const Filter = ({ x, y }) => (
  <g stroke={C.text} strokeWidth={1.1}>
    <circle cx={x} cy={y} r={9} fill={C.box} />
    <path d={`M ${x - 6},${y + 3} l 3,-6 l 3,6 l 3,-6 l 3,6`} fill="none" strokeWidth={1} />
  </g>
);

// Bowtie valve symbol (shutoff / manifold / pre-check valves)
const Bowtie = ({ x, y, rot = 0 }) => (
  <path d={`M ${x - 7},${y - 5} L ${x + 7},${y + 5} L ${x + 7},${y - 5} L ${x - 7},${y + 5} Z`}
    transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
    fill={C.box} stroke={C.text} strokeWidth={1} />
);

// Firewall shutoff valve — circle with lever; the lever rotates 90° CCW when closed
const Sov = ({ x, y, closed = false }) => (
  <g stroke={C.text} strokeWidth={1.1}>
    <circle cx={x} cy={y} r={7} fill={C.box} />
    <g style={{
      transformBox: 'view-box', transformOrigin: `${x}px ${y}px`,
      transform: closed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.4s ease',
    }}>
      <path d={`M ${x - 4.5},${y + 4.5} L ${x + 4.5},${y - 4.5}`} />
      <path d={`M ${x + 4.5},${y - 4.5} l 3.2,-3.2`} strokeWidth={1.8} />
    </g>
  </g>
);

// Engine-driven pump — circle with X
const EngPump = ({ x, y, r = 7 }) => (
  <g stroke={C.text} strokeWidth={1.1} fill="none">
    <circle cx={x} cy={y} r={r} fill={C.box} />
    <path d={`M ${x - r * 0.6},${y - r * 0.6} L ${x + r * 0.6},${y + r * 0.6} M ${x + r * 0.6},${y - r * 0.6} L ${x - r * 0.6},${y + r * 0.6}`} />
  </g>
);

// ── EICAS annunciator (lit/unlit) ──
// Every severity lights as colored text on the black EICAS face — only the text color
// separates warning from caution from advisory, as on the real screen, so the face color
// never changes and only the foreground is per-kind.
const ANN_LIT = { warn: C.annWarning, caution: C.annCaution, advisory: C.annAdvisory };
const ANN_UNLIT = '#3d4f60';

const Ann = ({ x, y, text, kind, on = false }) => {
  const fg = on ? ANN_LIT[kind] : ANN_UNLIT;
  return (
    <g>
      <rect x={x} y={y} width={100} height={21} rx={2} fill={C.panelFace} stroke="#0a1622" strokeWidth={1} />
      <text x={x + 50} y={y + 11.5} style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 700, fill: fg, textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.05em' }}>{text}</text>
    </g>
  );
};

// ── Cockpit state button (same idiom as the Electrical diagram switches) ──
function Btn({ x, y, title, states, state, onClick }) {
  const on = state !== 0;
  const s = on
    ? { fill: C.accent, stroke: C.accentDeep, text: '#ffffff' }
    : { fill: C.boxAlt, stroke: C.stroke,     text: C.muted };
  const lines = Array.isArray(title) ? title : [title];
  return (
    <g style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      {lines.map((l, i) => (
        <text key={i} x={x} y={y - 18 - (lines.length - 1 - i) * 9}
          style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
          {l}
        </text>
      ))}
      <circle cx={x} cy={y} r={13} fill={s.fill} stroke={s.stroke} strokeWidth={0.9} />
      <text x={x} y={y}
        style={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, fill: s.text, textAnchor: 'middle', dominantBaseline: 'central' }}>
        {states[state]}
      </text>
    </g>
  );
}

// ── Relay lifting-arm contact (same symbol as the Electrical diagram) ──
// Flipped horizontally vs. elec: the hinge is the right terminal and the free
// end swings on the left, lifting upward when open.
const SwArm = ({ x, y, on }) => {
  const color = on ? C.accent : C.wireDead;
  return (
    <g>
      <circle cx={x} cy={y} r={1.8} fill={color} />
      <circle cx={x + 20} cy={y} r={1.8} fill={color} />
      <line x1={x + 20} y1={y} x2={x} y2={on ? y : y - 9} stroke={color} strokeWidth={1.2} />
    </g>
  );
};

// ── Wing tank (parametric mirror: mir=1 left, mir=-1 right) ──────────────────
// cx = inboard edge; X(d) = distance d outboard of the inboard edge.
// flow = motive flow reaching this tank (transfer valve open).
// low  = tank below FUEL_LO_LBS — the fuel low level sensor glows amber.
// flowing = engine drawing fuel (wings not empty) — motive lines stop when false.
// refuelLive = single-point refuel in progress — the yellow fill line animates.
// precheckLive = pre-check valve open under refuel pressure — the top pre-check run
//   and the pilot riser animate inboard→outboard, up to the level control pilot valve.
// pilotHot = final stretch of the timed fill — pilot valve red, skinny tube slows.
// shutoffHot = tank just topped off — shutoff valve flashes red.
// failProbe = 'outer' | 'mid' | 'inner' when one of this wing's probes has failed.
// onSel = opens a component's detail modal. Both wings map to the same FUEL_INFO keys —
//   the parts are identical, so there is nothing to say about one that is not true of the other.
//
// Memoized: the sim commits state at SIM_HZ whether or not anything a wing draws has
// changed, and each wing expands to a few hundred SVG nodes. Every prop is a primitive
// except onSel, which is a setState function and so stable — a shallow compare skips
// both wings on the great majority of ticks.
const Tank = memo(function Tank({ mir, flow, low, flowing, refuelLive, precheckLive, pilotHot, shutoffHot, failProbe, onSel }) {
  const cx = mir === 1 ? 335 : 535;
  const X = d => cx - mir * d;
  const yT = d => 572 + d * 0.108;      // sloping top edge
  const inb = mir === 1 ? 0 : 180;      // arrow/jet-pump rotation, discharge inboard
  const valb = mir === 1 ? 180 : 0;      // arrow/jet-pump rotation, discharge inboard
  const IN = 30;                        // inboard wall inset — shaved back for center routing room

  return (
    <g>
      {/* Tank shell — inboard wall shaved back by IN to open center routing space */}
      <Hot d={`M ${X(IN)},${yT(IN)} L ${X(295)},${yT(295)} L ${X(295)},810 L ${X(IN)},810`}
        onClick={() => onSel('wingtank')}>
        <polygon points={`${X(IN)},${yT(IN)} ${X(295)},${yT(295)} ${X(295)},810 ${X(IN)},810`}
          fill={C.tankFill} stroke={C.tankStroke} strokeWidth={1.2} />
      </Hot>

      {/* Vent plumbing: float valve → vacuum relief line; pressure relief line */}
      <Hot x={Math.min(X(317), X(295)) - 3} y={755} w={Math.abs(X(317) - X(295)) + 6} h={31}
        onClick={() => onSel('ventsystem')}>
        <rect x={X(300)-5} y={760} width={10} height={10} fill={C.box} stroke={C.text} strokeWidth={1} />
        <CheckValve x={X(300)} y={777} rot={-90} />
        <CheckValve x={X(311)} y={765} rot={valb} />
      </Hot>
      <F v="vent" anim={false} d={`M ${X(317)},765 H ${X(325)} V 840 H ${X(230)} V 860`} />
      <F v="vent" anim={false} d={`M ${X(295)},798 H ${X(310)} V 840`} />
      <F v="vent" anim={false} d={`M ${X(300)},783 V 815 H ${X(280)} V 835`} />
      <rect x={X(280)-2} y={820} width={4} height={10} fill={C.box} stroke={C.text} strokeWidth={1} />
      <rect x={X(230)-2} y={845} width={4} height={10} fill={C.box} stroke={C.text} strokeWidth={1} />

      {/* Single point refuel/defuel (static yellow): fuel enters on the bottom fill
          run through the level control shutoff valves, and the tank vents out the
          level control pilot valve at the outboard end — that pre-check return runs
          back inboard along the tank top wall (the only diagonal in the diagram) */}
      {/* Thick single-point main up to the level control shutoff valve, thin after.
          The horizontal fill run (up to the level control pilot valve) is live during
          refuel; the top pre-check run and the pilot riser only come alive during a
          pre-check, flowing inboard→outboard down onto the pilot valve. */}
      <F v={refuelLive ? 'refuelFlow' : 'refuel'} spd={pilotHot ? 0.35 : 1} d={`M ${X(53)},757 H ${X(255)}`} />
      <F v={precheckLive ? 'refuelFlow' : 'refuel'} d={`M ${X(0)},${yT(0) + 12} L ${X(255)},${yT(255) + 12}`} />
      <F v={precheckLive ? 'refuelFlow' : 'refuel'} d={`M ${X(255)},${yT(255) + 10.5} V 751`} />
      <Hot x={X(255) - 9} y={748} w={18} h={18} onClick={() => onSel('pilotvalve')}>
        <PilotValve x={X(255)} y={757} hot={pilotHot} />
      </Hot>

      {/* Motive flow (animated green): TV → splits into two branches, each with a
          transfer jet pump, rejoining on the inner vertical → out to the collector */}
      <F v="motive" anim={flow && flowing} d={`M ${X(73)},658 V 602 H ${X(72)}`} />
      <F v="motive" anim={flow && flowing} d={`M ${X(73)},658 V 781 H ${X(72)}`} />
      <F v="motive" anim={flow && flowing} spd={MOTIVE_SLOW} d={`M ${X(54)},602 H ${X(7)} V 695`} />
      <F v="motive" anim={flow && flowing} spd={MOTIVE_SLOW} d={`M ${X(54)},781 H ${X(7)} V 695`} />
      {/* Transfer valve is drawn at the top level (after the center motive lines)
          so it sits on top of the line rather than being painted over. */}
      {[602, 781].map(yj => (
        <Hot key={yj} x={X(63) - 11} y={yj - 8} w={22} h={16} onClick={() => onSel('transferjet')}>
          <JetPump x={X(63)} y={yj} rot={inb} />
        </Hot>
      ))}

      {/* Level-control / servicing symbols */}
      <Hot x={X(53) - 9} y={748} w={18} h={18} onClick={() => onSel('lcsovrefuel')}>
        <SoRefuel x={X(53)} y={757} hot={shutoffHot} />
      </Hot>
      <Hot x={X(278) - 8} y={724} w={16} h={16} r={8} onClick={() => onSel('fillerport')}>
        <CL x={X(278)} y={732} l="F" />
      </Hot>
      <Hot x={X(178) - 8} y={724} w={16} h={16} r={8} onClick={() => onSel('reliefvalve')}>
        <CL x={X(178)} y={732} l="R" />
      </Hot>
      <Hot x={X(285) - 11} y={790} w={22} h={16} onClick={() => onSel('floatvalve')}>
        <FloatValve x={X(285)} y={798} />
      </Hot>

      {/* Fuel level probes on their signal bus — always live: the probes never stop
          sensing. Both wings feed the one riser at the right wing's outboard end, so
          the left bus runs inboard and the right bus runs back outboard. */}
      <El d={`M ${X(267)},770 L ${X(0)},770`} live rev={mir === -1} />
      {[['outer', 267], ['mid', 223], ['inner', 115]].map(([band, d]) => (
        <Hot key={band} x={X(d) - 8} y={762} w={16} h={20} onClick={() => onSel('probe')}>
          <Probe x={X(d)} y={770} failed={failProbe === band} />
        </Hot>
      ))}

      {/* Fuel low level sensor — glows amber when the tank drops below 110 lbs */}
      <Hot x={X(40) - 11} y={805} w={22} h={19} onClick={() => onSel('lowlevel')}>
        {low && <rect x={X(40) - 9} y={807} width={18} height={15} rx={3} fill={C.annCaution} opacity={0.4} />}
        <rect x={X(40) - 6} y={810} width={12} height={9} fill={low ? C.annCaution : C.box} stroke={low ? '#8a6a00' : C.text} strokeWidth={1} />
        <circle cx={X(40)} cy={814.5} r={1.6} fill={low ? '#5a4400' : C.text} />
      </Hot>

      {/* Relief line labels (bottom margins) */}
      <Lbl x={X(310)} y={855} lines={['VACUUM', 'RELIEF', 'LINE']} size={8} />
      <Lbl x={X(260)} y={870} lines={['PRESSURE', 'RELIEF LINE']} size={8} />
      <Ldr d={`M ${X(250)},862 L ${X(234)},853`} />
      <Ldr d={`M ${X(300)},847 L ${X(284)},830`} />
    </g>
  );
});

// ── Static chrome ────────────────────────────────────────────────────────────
// The legend and the label/leader-line layers never depend on simulation state, but
// together they are roughly half the elements in the schematic. Built once at module
// load, they keep the same element identity on every render, so React skips
// reconciling these subtrees entirely instead of re-diffing them 20× a second.
// Anything added here must stay state-independent.

const LEGEND = (
  <>
    <rect x={8} y={8} width={854} height={122} fill={C.box} stroke={C.stroke} strokeWidth={1} rx={3} />
    <text x={435} y={20} style={{ ...T.h, fontSize: 9, letterSpacing: '0.15em' }}>LEGEND</text>

    {/* Col 1 — line functions */}
    {[
      { c: C.feedLine,   l: 'ENGINE FEED' },
      { c: C.motiveLine, l: 'MOTIVE FLOW/RETURN FLOW' },
      { c: C.refuelLine, l: 'SINGLE POINT REFUEL/DEFUEL' },
      { c: C.purgeLine,  l: 'PURGE LINE' },
    ].map(({ c, l }, i) => (
      <g key={l}>
        <rect x={24} y={31 + i * 15} width={28} height={9} fill={c} stroke={C.stroke} strokeWidth={0.5} />
        <text x={60} y={36 + i * 15} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>{l}</text>
      </g>
    ))}
    {/* Electrical shows both states side by side — dead run, then energized */}
    <El d="M 24,96 H 46" />
    <El d="M 52,96 H 74" live />
    <text x={82} y={96} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>ELECTRICAL CONNECTION/SIGNAL</text>
    <Mech d="M 24,112 H 74" />
    <text x={82} y={112} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>MECHANICAL CONNECTION</text>

    {/* Col 2 — symbols */}
    <CheckValve x={330} y={38} />
    <text x={348} y={38} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>CHECK VALVE</text>
    <TValve x={330} y={62} />
    <text x={348} y={57} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>TRANSFER VALVE</text>
    <text x={348} y={67} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>(SOLENOID VALVE)</text>
    <JetPump x={330} y={86} />
    <text x={348} y={86} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>TRANSFER JET PUMP</text>
    <SoRefuel x={330} y={110} />
    <text x={348} y={105} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>LEVEL CONTROL SHUTOFF</text>
    <text x={348} y={115} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>VALVE (REFUEL ONLY)</text>

    {/* Col 3 — symbols */}
    <SoDefuel x={620} y={34} />
    <text x={638} y={29} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>LEVEL CONTROL SHUTOFF</text>
    <text x={638} y={39} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>VALVE (DEFUEL ONLY)</text>
    <PilotValve x={620} y={53} />
    <text x={638} y={53} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>LEVEL CONTROL PILOT VALVE</text>
    <CL x={620} y={69} l="F" />
    <text x={638} y={69} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>GRAVITY FILLER PORT</text>
    <CL x={620} y={85} l="R" />
    <text x={638} y={85} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>PRESSURE RELIEF VALVE</text>
    <Probe x={620} y={101} />
    <text x={638} y={101} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>FUEL LEVEL PROBE</text>
    <FloatValve x={620} y={119} />
    <text x={638} y={119} style={{ ...T.sym, textAnchor: 'start', fontWeight: 400, fontSize: 8 }}>FLOAT VALVE</text>
  </>
);

// Top center / left labels — everything above the REFUEL/DEFUEL buttons, which are
// stateful and so stay inline in the component between the two label layers.
const LABELS_UPPER = (
  <>
    <Lbl x={400} y={145} lines={['FUEL FLOW', 'TRANSMITTER']} />
    <Ldr d="M 400,155 L 448,247" />
    <Lbl x={350} y={170} lines={['FUEL', 'MANAGEMENT', 'UNIT']} />
    <Ldr d="M 350,190 L 433,264" />
    <Lbl x={270} y={255} lines={['ENGINE DRIVEN', 'HIGH PRESSURE', 'FUEL PUMP']} />
    <Ldr d="M 290,275 L 437,290" />
    <Lbl x={262} y={290} lines={['ENGINE DRIVEN', 'LOW PRESSURE', 'FUEL PUMP']} />
    <Ldr d="M 295,300 L 396,308" />
    <Lbl x={250} y={338} lines={['FIREWALL', 'SHUTOFF VALVE']} />
    <Ldr d="M 298,344 L 377,351" />
    <Lbl x={250} y={392} lines={['FUEL FILTER']} />
    <Ldr d="M 285,392 L 375,392" />
    <Lbl x={232} y={444} lines={['PRESSURE REFUELING/', 'DEFUELING ADAPTER']} />
    <Ldr d="M 292,450 L 341,447" />
  </>
);

const LABELS_LOWER = (
  <>
    <Lbl x={245} y={484} lines={['PRE-CHECK VALVE']} />
    <Ldr d="M 290,484 L 338,478" />
    <Lbl x={255} y={528} lines={['MANIFOLD VALVE']} />
    <Ldr d="M 297,532 L 377,558" />
    <Lbl x={95} y={570} lines={['PRE-CHECK', 'LINE']} />
    <Ldr d="M 95,580 L 82,610" />
    <Lbl x={188} y={570} lines={['PILOT', 'LINE']} />
    <Ldr d="M 188,580 L 180,755" />

    {/* Right side */}
    <Lbl x={560} y={323} lines={['PURGE LINE']} anchor="start" />
    <Ldr d="M 556,318 L 499,308" />
    <Lbl x={560} y={355} lines={['FIREWALL']} anchor="start" />
    <Ldr d="M 556,352 L 530,340" />
    <Lbl x={560} y={378} lines={['MAINTENANCE', 'SHUTOFF VALVE']} anchor="start" />
    <Ldr d="M 556,375 L 390,412" />
    <Lbl x={560} y={430} lines={['LOW PRESSURE', 'SWITCH']} anchor="start" />
    <Ldr d="M 556,430 L 435,420" />
    <Lbl x={560} y={460} lines={['MOTIVE SUPPLY LINE']} anchor="start" />
    <Ldr d="M 556,455 L 432,432" />
    <Lbl x={560} y={492} lines={['PRIMARY JET PUMP']} anchor="start" />
    <Ldr d="M 556,492 L 393,657" />
    <Lbl x={560} y={514} lines={['FUEL PICKUP', '(FLIP-FLOP VALVE)']} anchor="start" />
    <Ldr d="M 556,519 L 391,678" />
    <Lbl x={562} y={556} lines={['REFUEL/DEFUEL VALVE']} anchor="start" />
    <Ldr d="M 558,556 L 380,780" />

    {/* Tanks / bottom */}
    <Lbl x={230} y={680} lines={['GRAVITY', 'FEED', 'LINES']} />
    <Ldr d="M 245,692 L 345,727" />
    <Lbl x={640} y={680} lines={['GRAVITY', 'FEED', 'LINES']} />
    <Ldr d="M 618,692 L 522,727" />
    <Lbl x={340} y={828} lines={['BUTTERFLY TYPE', 'CHECK VALVE']} />
    <Ldr d="M 340,820 L 367,768" />
    <Lbl x={440} y={822} lines={['ELECTRIC', 'BOOST PUMP']} />
    <Ldr d="M 440,812 L 404,790" />
    <Lbl x={636} y={832} lines={['CROSS VENT LINE']} size={8} />
    <Ldr d="M 640,825 L 630,800" />
    <Lbl x={240} y={840} lines={['FUEL LOW', 'LEVEL SENSOR']} size={8} />
    <Ldr d="M 250,830 L 288,815" />
    <Lbl x={620} y={860} lines={['FUEL LOW', 'LEVEL SENSOR']} size={8} />
    <Ldr d="M 610,850 L 583,815" />

    {/* Source reference */}
    <text x={858} y={928} style={{ fontFamily: FONT, fontSize: 7, fill: C.muted, textAnchor: 'end', letterSpacing: '0.08em' }}>
      T-6B NATOPS FUEL SYSTEM SCHEMATIC
    </text>
  </>
);

// ── Main component ───────────────────────────────────────────────────────────
function T6BFuelDiagram() {
  const [starter,    setStarter]    = useState(false); // AUTO/RESET engaged
  const [fuelBalMan, setFuelBalMan] = useState(false); // FUEL BAL MAN/RESET vs AUTO
  const [manBal,     setManBal]     = useState(0);     // 0 OFF, 1 L, 2 R (only with MAN)
  const [boost,      setBoost]      = useState(false); // BOOST PUMP ON vs ARM

  // Live fuel state: quantity per side (lbs), engine draw rate (PPH), quick-fill flag
  const [leftFuel,  setLeftFuel]  = useState(MAX_FUEL);
  const [rightFuel, setRightFuel] = useState(MAX_FUEL);
  const [pph,       setPph]       = useState(200);
  const [service,   setService]   = useState(0);       // 0 none, 1 REFUEL (fill), 2 DEFUEL (empty)
  const [paused,    setPaused]    = useState(false);   // freeze the whole simulation

  // Auto fuel balance state machine
  const [autoArmed,      setAutoArmed]      = useState(true);  // AUTO may attempt a 2 s balance
  const [autoCloseSide,  setAutoCloseSide]  = useState(0);     // 0 none, 1 L, 2 R (auto-held tank)
  const [fuelBalCaution, setFuelBalCaution] = useState(false); // FUEL BAL caution lit
  const balStartRef = useRef(null);                            // wall-clock start of the current attempt

  // Per-wing refuel flash state (each wing tops off on its own schedule).
  const [leftPilotFlash,   setLeftPilotFlash]   = useState(false);
  const [rightPilotFlash,  setRightPilotFlash]  = useState(false);
  const [leftShutoffFlash, setLeftShutoffFlash] = useState(false);
  const [rightShutoffFlash, setRightShutoffFlash] = useState(false);
  const [defuelFlash,      setDefuelFlash]      = useState(false);
  // Servicing-valve highlight timers (s): per-wing post-top-off, and post-drain defuel.
  const refuelRef = useRef({ leftShut: null, rightShut: null, defuel: null });

  // Pre-check valve (manual, closed on the ground until the pre-check is run) and the
  // sequence it drives: 0 idle, 1 pressure reaching the pilot valves, 2 valves closing.
  const [precheck,      setPrecheck]      = useState(false);
  const [precheckPhase, setPrecheckPhase] = useState(0);
  const precheckRef = useRef({ t: null });                       // sequence elapsed (s)

  // Firewall shutoff handle (pulled = valve closed). Feed is cut at once; the engine
  // flames out FW_FLAMEOUT_SECS later, stopping every line.
  const [fwShutoff,  setFwShutoff]  = useState(false);
  const [fwFlameout, setFwFlameout] = useState(false);

  // Sim faults. The probe fault latches (one of the seven picked at random each time it is
  // armed); the imbalance fault is a one-shot nudge, so it only flashes to acknowledge the
  // press. Low fuel PX is still a placeholder.
  const [failedProbe,  setFailedProbe]  = useState(null);
  const [simImbalance, setSimImbalance] = useState(false);
  const [pxFault,      setPxFault]      = useState(null);     // null | 'cyclic' | 'steady'
  const [pxPhase,      setPxPhase]      = useState(0);        // 0 clear, 1 FUEL PX, 2 pump, 3 both
  const imbalRef = useRef(null);                              // press-feedback timeout id
  const pxRef    = useRef({ t: 0 });                          // cycle position (s)
  useEffect(() => () => clearTimeout(imbalRef.current), []);

  const toggleProbeFail = () =>
    setFailedProbe(p => (p ? null : PROBE_IDS[Math.floor(Math.random() * PROBE_IDS.length)]));

  const togglePxFault = () =>
    setPxFault(f => (f ? null : PX_MODES[Math.floor(Math.random() * PX_MODES.length)]));

  // Shift the tanks IMBALANCE_MIN…IMBALANCE_MAX lbs apart, side chosen at random. Fuel
  // moves from the light side to the heavy one as far as there is room at the top; with
  // full tanks there is none, so it all comes off the light side instead. That way the
  // fault fires from any starting quantity rather than silently doing nothing when full.
  // Everything downstream is the existing balance machinery: AUTO holds the light tank,
  // fails to catch up inside its 2 s window, opens both valves and latches FUEL BAL.
  const induceImbalance = () => {
    const gap        = IMBALANCE_MIN + Math.random() * (IMBALANCE_MAX - IMBALANCE_MIN);
    const heavyIsLeft = Math.random() < 0.5;
    const up   = Math.min(gap / 2, MAX_FUEL - (heavyIsLeft ? leftFuel : rightFuel));
    const down = gap - up;
    const raise = f => Math.min(MAX_FUEL, f + up);
    const drop  = f => Math.max(0, f - down);
    if (heavyIsLeft) { setLeftFuel(raise);  setRightFuel(drop); }
    else             { setRightFuel(raise); setLeftFuel(drop); }

    setSimImbalance(true);
    clearTimeout(imbalRef.current);
    imbalRef.current = setTimeout(() => setSimImbalance(false), 700);
  };

  // Briefing tabs — which of the four NATOPS tabs the modal is showing (null = closed).
  // Component detail — which FUEL_INFO entry the modal is showing (null = closed).
  const [infoKey, setInfoKey] = useState(null);
  // Stable, so the memoized InfoModal can bail out — it re-binds its keydown
  // listener whenever onClose changes identity.
  const closeInfo = useCallback(() => setInfoKey(null), []);
  const fwRef = useRef({ t: null });                          // flameout countdown elapsed (s)

  const toggleFwShutoff = () => {
    const nv = !fwShutoff;
    setFwShutoff(nv);
    setFwFlameout(false);                                     // clear any prior flameout
    fwRef.current.t = nv ? 0 : null;                          // pulled → start countdown; restored → cancel
  };

  // MANUAL FUEL BAL is only live in MAN; leaving MAN forces it back to OFF.
  // Switching MAN → AUTO re-arms the 2-second auto-balance attempt.
  const toggleFuelBalMan = () => {
    const enteringAuto = fuelBalMan;
    setFuelBalMan(v => !v);
    setManBal(0);
    if (enteringAuto) setAutoArmed(true);
  };

  // BOOST PUMP ON, or ARM with the start sequence, holds the pump up continuously. In ARM
  // the low pressure switch runs it for one phase of the cyclic fault — the phase after
  // FUEL PX, never during it, since the running pump is what clears the warning.
  const boostHeld    = boost || starter;               // ARM + start → auto-run
  const boostRunning = boostHeld || pxPhase === 2 || pxPhase === 3;
  const pxLit        = pxPhase === 1 || pxPhase === 3; // FUEL PX warning
  const lpCommand    = pxPhase === 2 || pxPhase === 3; // low pressure switch calling for the pump
  // Transfer-valve state: MAN uses the MANUAL FUEL BAL knob; AUTO uses the auto-
  // balance closure (holds the lighter tank so the heavier drains toward it).
  const leftFlow  = fuelBalMan ? !(manBal === 1) : !(autoCloseSide === 1);
  const rightFlow = fuelBalMan ? !(manBal === 2) : !(autoCloseSide === 2);

  // Indicated quantity — what the probes report, and the only thing the gauge, the total
  // and the fuel balance system can see. Equal to the actual quantity unless the failed
  // probe happens to be the one currently sensing that side.
  const leftFail  = sideFail(failedProbe, 'L');
  const rightFail = sideFail(failedProbe, 'R');
  const leftInd   = indicate(leftFuel,  leftFail);
  const rightInd  = indicate(rightFuel, rightFail);

  // The fuel low level sensors are float switches, not probes. NATOPS: "the low fuel
  // warning lights will continue to provide an accurate indication of minimum fuel level"
  // with FP FAIL — so these read actual fuel and stay truthful through a probe failure.
  const leftLow  = leftFuel  < FUEL_LO_LBS;
  const rightLow = rightFuel < FUEL_LO_LBS;
  // Engine feed / motive / purge animate only while fuel remains aboard.
  const flowing    = leftFuel + rightFuel > 0;
  const shutoffFlash = leftShutoffFlash || rightShutoffFlash;
  // Servicing (either direction), the post-fill shutoff flash, and the firewall flameout
  // all stop the engine — nothing else flows while the aircraft is on the single-point
  // adapter, while the shutoff valves latch, or once the engine dies.
  const engineOn   = flowing && service === 0 && !shutoffFlash && !fwFlameout;
  const feedLive   = engineOn && !fwShutoff;      // feed past the firewall valve — cut at once
  const refuelLive = service === 1;              // single-point refuel line comes alive
  const defuelLive = service === 2;              // defuel path (collector → adapter) comes alive
  // Pre-check lines run for the whole sequence — pressure holds on the pilot valves
  // until the level control shutoff valves latch, which stops everything at once.
  const precheckLive = precheckPhase !== 0;

  // Latest values for the animation loop (avoids stale closures inside rAF).
  const sim = useRef({});
  sim.current = { pph, service, paused, leftFlow, rightFlow, fuelBalMan, leftFuel, rightFuel, autoArmed, autoCloseSide, fuelBalCaution, shutoffFlash, leftPilotFlash, rightPilotFlash, leftShutoffFlash, rightShutoffFlash, fwFlameout, fwShutoff, precheck, precheckPhase, defuelFlash, failedProbe, pxFault, pxPhase, boostHeld };

  // Fill / drain + auto-balance loop. Draw = PPH lbs per MINUTE (60× real time) →
  // PPH/60 lb/s, split across the open transfer valves; a shut valve routes all
  // flow to the other wing. QUICK FILL snaps both sides straight back to MAX_FUEL.
  //
  // The loop commits state at SIM_HZ, not once per frame. Every commit re-renders the
  // whole schematic — several hundred SVG nodes — and at 60 fps that saturated the main
  // thread badly enough that route changes could not get through until the sim was
  // paused. Physics still integrates the full accumulated dt, so burn rates are
  // unchanged; only the number of React renders drops.
  useEffect(() => {
    const STEP = 1 / 20;                                  // commit at 20 Hz
    let raf, last = performance.now(), acc = 0;
    const tick = now => {
      raf = requestAnimationFrame(tick);                  // always queue the next frame
      const frame = Math.min(0.1, (now - last) / 1000); last = now;
      const s = sim.current;
      if (s.paused) return;                               // frozen — no time accrues
      acc += frame;
      if (acc < STEP) return;                             // not due yet
      const dt = acc; acc = 0;

      // ── service / drain: REFUEL fills each wing at a constant rate, DEFUEL empties, else engine draw ──
      const RF = refuelRef.current;
      let nl = s.leftFuel, nr = s.rightFuel;
      if (s.service === 1) {
        nl = Math.min(MAX_FUEL, s.leftFuel  + REFUEL_RATE * dt);
        nr = Math.min(MAX_FUEL, s.rightFuel + REFUEL_RATE * dt);
        // Rising-edge top-off → start that wing's shutoff-flash timer.
        if (s.leftFuel  < MAX_FUEL && nl >= MAX_FUEL && RF.leftShut  === null) RF.leftShut  = 0;
        if (s.rightFuel < MAX_FUEL && nr >= MAX_FUEL && RF.rightShut === null) RF.rightShut = 0;
        setLeftFuel(nl);
        setRightFuel(nr);
        if (nl >= MAX_FUEL && nr >= MAX_FUEL) setService(0);    // both topped off → end service
      } else if (s.service === 2) {
        nl = Math.max(0, s.leftFuel  - DEFUEL_RATE * dt);
        nr = Math.max(0, s.rightFuel - DEFUEL_RATE * dt);
        setLeftFuel(nl);
        setRightFuel(nr);
        if (nl <= 0 && nr <= 0) {
          if (RF.defuel === null) RF.defuel = 0;                // just went dry → highlight the valve
          setService(0);                                        // …and end the defuel
        }
      } else if (!s.shutoffFlash && !s.fwShutoff) {
        // Engine draw only while the feed lines are live — no drain during the shutoff
        // flash or once the firewall handle cuts the feed (lines dead → indicator holds).
        const open = (s.leftFlow ? 1 : 0) + (s.rightFlow ? 1 : 0);
        if (open > 0) {
          const per = (s.pph / 60) * dt / open;
          if (s.leftFlow)  setLeftFuel(f  => Math.max(0, f - per));
          if (s.rightFlow) setRightFuel(f => Math.max(0, f - per));
        }
      }

      // ── pre-check: refuel pressure with the pre-check valve open reaches the pilot
      // valves after PRECHECK_ARM_SECS. From there it is the top-off sequence verbatim:
      // pilot valves flash for PILOT_FLASH_SECS while fuel keeps flowing, then the
      // shutoff valves latch (handed to the same timers a topped-off wing uses), which
      // is what ends the refuel and flashes them for SHUTOFF_FLASH_SECS. ──
      const PC = precheckRef.current;
      if (!s.precheck) PC.t = null;                              // valve closed → sequence aborts
      else if (s.service === 1 || PC.t !== null) PC.t = (PC.t ?? 0) + dt;
      if (PC.t !== null && PC.t >= PRECHECK_ARM_SECS + PILOT_FLASH_SECS) {
        PC.t = null;
        RF.leftShut = 0; RF.rightShut = 0;                       // shutoff valves latch closed
        setService(0);                                           // …which stops the refuel
      }
      const pcPhase = PC.t === null ? 0 : (PC.t < PRECHECK_ARM_SECS ? 1 : 2);
      if (pcPhase !== s.precheckPhase) setPrecheckPhase(pcPhase);

      // Pilot valve flashes over each wing's final fill band (last ≈55 lbs before full),
      // and on both wings at once during the pre-check sequence.
      const lp = pcPhase === 2 || (s.service === 1 && nl >= MAX_FUEL - PILOT_LBS && nl < MAX_FUEL);
      const rp = pcPhase === 2 || (s.service === 1 && nr >= MAX_FUEL - PILOT_LBS && nr < MAX_FUEL);
      if (lp !== s.leftPilotFlash)  setLeftPilotFlash(lp);
      if (rp !== s.rightPilotFlash) setRightPilotFlash(rp);

      // Shutoff valve flashes for 5 s after that wing tops off (pause-safe elapsed).
      if (RF.leftShut  !== null) { RF.leftShut  += dt; if (RF.leftShut  >= SHUTOFF_FLASH_SECS) RF.leftShut  = null; }
      if (RF.rightShut !== null) { RF.rightShut += dt; if (RF.rightShut >= SHUTOFF_FLASH_SECS) RF.rightShut = null; }
      const ls = RF.leftShut  !== null, rs = RF.rightShut !== null;
      if (ls !== s.leftShutoffFlash)  setLeftShutoffFlash(ls);
      if (rs !== s.rightShutoffFlash) setRightShutoffFlash(rs);

      // Defuel level control shutoff valve highlights for 2 s once the wings are dry.
      if (RF.defuel !== null) { RF.defuel += dt; if (RF.defuel >= DEFUEL_FLASH_SECS) RF.defuel = null; }
      const dfl = RF.defuel !== null;
      if (dfl !== s.defuelFlash) setDefuelFlash(dfl);

      // ── low fuel pressure ── steady sits with both lit; cyclic walks PX_SEQUENCE a slot
      // at a time. Holding the pump up manually restores pressure in the cyclic case only.
      const PX = pxRef.current;
      const period = PX_CYCLE_SECS * PX_SEQUENCE.length;
      let phase = 0;                                  // 0 clear, 1 FUEL PX, 2 pump, 3 both
      if (s.pxFault === 'steady') {
        // The switch takes the same slot to bring the pump up as it does in the cyclic
        // case — it just fails to restore pressure, so both stay lit from there on.
        if (PX.t < PX_CYCLE_SECS) PX.t += dt;
        phase = PX.t < PX_CYCLE_SECS ? 1 : 3;
      } else if (s.pxFault === 'cyclic' && !s.boostHeld) {
        PX.t += dt;
        if (PX.t >= period) PX.t -= period;
        phase = PX_SEQUENCE[Math.floor(PX.t / PX_CYCLE_SECS)];
      } else {
        PX.t = 0;                                     // no fault, or pump held on → restart lit
      }
      if (phase !== s.pxPhase) setPxPhase(phase);

      // ── firewall shutoff: 0.5 s after the handle is pulled, the engine flames out ──
      const fw = fwRef.current;
      if (fw.t !== null) {
        fw.t += dt;
        if (fw.t >= FW_FLAMEOUT_SECS && !s.fwFlameout) setFwFlameout(true);
      }

      // ── fuel balance ──
      const diff = s.leftFuel - s.rightFuel;
      const absDiff = Math.abs(diff);
      if (s.failedProbe !== null) {
        // NATOPS: automatic fuel balancing is not available with FP FAIL. The system has
        // lost a sensor, so it stops closing valves entirely — MANUAL FUEL BAL still works.
        if (s.autoCloseSide !== 0) setAutoCloseSide(0);
        balStartRef.current = null;
      } else if (s.fuelBalMan) {
        // MAN: no auto closure (the pilot drives MANUAL FUEL BAL)
        if (s.autoCloseSide !== 0) setAutoCloseSide(0);
        balStartRef.current = null;
      } else if (s.autoArmed && absDiff > BAL_TOLERANCE_LBS) {
        // AUTO: hold the lighter tank shut so the heavier catches down
        if (balStartRef.current === null) balStartRef.current = now;
        if (now - balStartRef.current >= BAL_ATTEMPT_MS) {
          balStartRef.current = null;              // gave up — open both, latch caution
          setAutoArmed(false);
          if (s.autoCloseSide !== 0) setAutoCloseSide(0);
        } else {
          const lighter = diff > 0 ? 2 : 1;        // left heavier → close R, else close L
          if (s.autoCloseSide !== lighter) setAutoCloseSide(lighter);
        }
      } else {
        // balanced (within tolerance) or disarmed — both valves open
        if (s.autoCloseSide !== 0) setAutoCloseSide(0);
        balStartRef.current = null;
      }
      // Caution: MAN shows it any time the tanks are outside tolerance; AUTO only after a
      // failed attempt. A probe failure lights it outright — NATOPS pairs FUEL BAL with FP
      // FAIL whether or not the failed probe is the one in use, so the gauge is the tie-breaker.
      const outOfTol = absDiff > BAL_TOLERANCE_LBS;
      const caution = s.failedProbe !== null
        || (s.fuelBalMan ? outOfTol : (!s.autoArmed && outOfTol));
      if (caution !== s.fuelBalCaution) setFuelBalCaution(caution);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <DiagramShell
      keyframes={KEYFRAMES}
      briefing={{
        verbatim: FUEL_VERBATIM, numbers: FUEL_NUMBERS, eicas: FUEL_EICAS, eps: FUEL_EPS,
        sortMemoryFirst: true, conditionalSteps: true, valueMinWidth: 150,
      }}
      // Three buttons in a two-column grid, so one row is always short: the warning-level
      // fault takes the top row on its own, pinned right, and the two cautions fill the
      // row beneath it.
      sims={[
        { active: pxFault !== null,     onClick: togglePxFault,   label: 'Low Fuel PX',     kind: 'warn',    col: 2, row: 1 },
        { active: failedProbe !== null, onClick: toggleProbeFail, label: 'Fuel Probe Fail', kind: 'caution', col: 1, row: 2 },
        { active: simImbalance,         onClick: induceImbalance, label: 'Fuel Imbalance',  kind: 'caution', col: 2, row: 2 },
      ]}
    >
      {({ openBriefing }) => (<>
        {infoKey && FUEL_INFO[infoKey] && (
          <InfoModal {...FUEL_INFO[infoKey]} onClose={closeInfo} theme={C} />
        )}

        <svg viewBox="0 0 870 935" width="100%" style={{ display: 'block' }} className={paused ? 'fuel-paused' : undefined}>

          {LEGEND}

          {/* ═══ FUSELAGE OUTLINE + FIREWALL ═══ */}
          <rect x={338} y={337} width={190} height={474} fill="none" stroke="#c3ccd4" strokeWidth={1} />
          <path d="M 338,340 H 528" stroke="#8fa0b0" strokeWidth={5} opacity={0.45} />

          {/* ═══ WING TANKS ═══ */}
          <Tank mir={1} flow={leftFlow} low={leftLow} flowing={engineOn} refuelLive={refuelLive}
            precheckLive={precheckLive} pilotHot={leftPilotFlash} shutoffHot={leftShutoffFlash}
            failProbe={failedProbe === 'collector' ? null : leftFail} onSel={setInfoKey} />
          <Tank mir={-1} flow={rightFlow} low={rightLow} flowing={engineOn} refuelLive={refuelLive}
            precheckLive={precheckLive} pilotHot={rightPilotFlash} shutoffHot={rightShutoffFlash}
            failProbe={failedProbe === 'collector' ? null : rightFail} onSel={setInfoKey} />

          {/* ═══ COLLECTOR TANK (center fuselage — all engine feed originates here) ═══ */}
          {/* Drawn before its internals, so each of those keeps its own click. */}
          <Hot x={362} y={558} w={48} h={252} r={2} onClick={() => setInfoKey('collector')}>
            <rect x={362} y={558} width={48} height={252} fill={C.collectorFill} stroke={C.tankStroke} strokeWidth={1.2} />
          </Hot>

          {/* Gravity feed lines: wing tanks → collector (drawn first — run in the background) */}
          <path d="M 305,727 H 362 M 305,733 H 362" stroke={C.stroke} strokeWidth={0.9} fill="none" />
          <path d="M 410,727 H 565 M 410,733 H 565" stroke={C.stroke} strokeWidth={0.9} fill="none" />

          {/* Cross vent line under the fuselage. Two hit bands rather than one so the
              run does not steal clicks where it crosses the collector tank. */}
          <F v="vent" anim={false} d="M 100,800 H 770 " />
          {[[100, 262], [410, 360]].map(([hx, hw]) => (
            <Hot key={hx} x={hx} y={794} w={hw} h={10} r={2} onClick={() => setInfoKey('ventsystem')} />
          ))}

          {/* ═══ SINGLE POINT REFUEL/DEFUEL (static yellow) ═══
              adapter → main pipe → manifold valve → bottom line only (fills the tank
              bottom runs + collector); perimeter returns join at the pre-check valve,
              which goes independently to the adapter; top runs are the pilot/pre-check
              header off that riser */}
          {/* Main pipe — adapter ↔ bottom fill line. Refuel runs down from the adapter;
              defuel is the same pipe run backwards, up and out to the adapter. */}
          <F v={refuelLive || defuelLive ? 'refuelFlow' : 'refuel'} w={5}
            d={defuelLive ? 'M 420,757 V 448 H 362' : 'M 362,448 H 420 V 757'} />
          {/* Bottom fill line — horizontal run across the fuselage; live during refuel.
              The stretch between the main pipe and the refuel/defuel valve is shared:
              it feeds outboard on refuel and inboard on defuel. */}
          <F v={refuelLive || defuelLive ? 'refuelFlow' : 'refuel'} w={5}
            d={defuelLive ? 'M 374,757 H 420' : 'M 420,757 H 374'} />
          <F v={refuelLive ? 'refuelFlow' : 'refuel'} w={5} d="M 420,757 H 581.5" />
          <F v={refuelLive ? 'refuelFlow' : 'refuel'} w={5} d="M 374,757 H 288.5" />
          <F v={refuelLive ? 'refuelFlow' : 'refuel'} w={5} d="M 282,750 V 748" />
          <F v={refuelLive ? 'refuelFlow' : 'refuel'} w={5} d="M 587.5,750 V 748" />
          {/* Collector risers — defuel only: level control shutoff valve (defuel only)
              → butterfly check valve → bottom line → up the main pipe to the adapter */}
          <F v={defuelLive ? 'refuelFlow' : 'refuel'} w={2.4} d="M 374,776 V 769" />
          <F v={defuelLive ? 'refuelFlow' : 'refuel'} w={2.4} d="M 374,761 V 757" />
          {/* Pre-check lines — one per wing, both routed through the pre-check valve
              and then independently to the adapter. Drawn adapter → valve → tank so
              the dashes run outboard toward the level control pilot valves. */}
          <F v={precheckLive ? 'refuelFlow' : 'refuel'} d="M 356,450 V 477.5 H 338" />
          <F v={precheckLive ? 'refuelFlow' : 'refuel'} d="M 333,482 H 352 V 584 H 335" />
          <F v={precheckLive ? 'refuelFlow' : 'refuel'} d="M 333,473 H 444 V 584 H 535" />
          {/* Adapter */}
          <Hot x={338} y={436} w={28} h={24} onClick={() => setInfoKey('adapter')}>
            <rect x={342} y={440} width={20} height={16} rx={3} fill={C.box} stroke={C.text} strokeWidth={1.1} />
            <path d="M 346,444 h 12 M 346,448 h 12 M 346,452 h 12" stroke={C.text} strokeWidth={0.8} />
          </Hot>
          {/* Pre-check valve — manual, closed by default. Click the valve body or its
              indicator to open it; open under refuel pressure runs the pre-check. */}
          <g className="dgm-hot" onClick={() => setPrecheck(v => !v)}>
            <rect x={329} y={464} width={20} height={28} fill="transparent" />
            <rect x={338} y={471} width={7} height={14} rx={1}
              fill={precheck ? C.accent : C.box} stroke={C.text} strokeWidth={1.1} />
            <rect x={284} y={462} width={46} height={13} rx={3}
              fill={precheck ? C.accent : C.boxAlt}
              stroke={precheck ? C.accentDeep : C.stroke} strokeWidth={0.9} />
            <text x={307} y={468.5} style={{
              fontFamily: FONT, fontSize: 7, fontWeight: 700, letterSpacing: '0.06em',
              fill: precheck ? '#ffffff' : C.muted, textAnchor: 'middle', dominantBaseline: 'central',
            }}>
              {precheck ? 'OPEN' : 'CLOSED'}
            </text>
          </g>
          {/* Refuel/defuel valve (fills the collector during pressure refueling) —
              check valve pointing up into the collector */}
          <Hot x={366} y={756} w={17} h={16} onClick={() => setInfoKey('refueldefuelvalve')}>
            <CheckValve x={374} y={765} rot={-90} />
          </Hot>

          {/* ═══ MOTIVE SUPPLY (animated green): tap downstream of the LP pump →
              low pressure switch → three branches ═══ */}
          <F v="motive" anim={engineOn} d="M 428,309 V 622" />
          <CheckValve x={428} y={362} rot={90} />
          <F v="motive" anim={leftFlow && engineOn} d="M 428,622 H 353 V 659 H 263" />
          <F v="motive" anim={rightFlow && engineOn} d="M 428,659 H 607" />
          <F v="motive" anim={engineOn} d="M 428,622 V 659 H 393" />
          {/* Return flow: rejoined branches route to the collector tank */}
          <F v="motive" anim={leftFlow && engineOn} spd={MOTIVE_SLOW} d="M 328,695 H 362" />
          <F v="motive" anim={rightFlow && engineOn} spd={MOTIVE_SLOW} d="M 542,695 H 410" />
          {/* Low pressure switch on the motive return line — goes red while it is sensing
              low pressure, i.e. in step with the FUEL PX warning it drives */}
          <Hot x={418} y={410} w={20} h={20} r={10} onClick={() => setInfoKey('lpswitch')}>
            <circle cx={428} cy={420} r={5.5} fill={pxLit ? C.warningTint : C.box}
              stroke={pxLit ? C.warningText : C.text} strokeWidth={pxLit ? 1.7 : 1.1} />
            <text x={428} y={420.5} style={{ ...T.sym, fontSize: 6.5, fill: pxLit ? C.warningText : C.text }}>P</text>
          </Hot>
          {/* Transfer valves — drawn on top of the motive line, just before each tank */}
          <Hot x={302} y={649} w={22} h={20} onClick={() => setInfoKey('transfervalve')}>
            <TValve x={313} y={659} open={leftFlow} />
          </Hot>
          <Hot x={546} y={649} w={22} h={20} onClick={() => setInfoKey('transfervalve')}>
            <TValve x={557} y={659} open={rightFlow} />
          </Hot>

          {/* ═══ PURGE LINE (animated blue): HP pump → down → collector tank top ═══ */}
          <F v="purge" anim={engineOn} d="M 466,290 H 497 V 316 H 404 V 558" />
          <CheckValve x={404} y={352} rot={90} />

          {/* ═══ ENGINE FEED (animated red) — originates in the collector tank ═══ */}
          {/* Left leg: flip-flop pickup → primary jet pump → up  to firewall shutoff valve*/}
          <F anim={engineOn} d="M 376,659 H 370 V 568 H 385 V 350" />
          {/* Right leg: electric boost pump → up (flows when the pump runs) */}
          <F anim={boostRunning && engineOn} d="M 398,773 V 568 H 386" />
          {/* Spine above the firewall valve → LP/HP pump → engine — cut at once on shutoff */}
          <F anim={feedLive} d="M 385,350 V 309 H 452 V 224" />
          {/* Where the fuel system hands off to the engine — the manifold and nozzles */}
          <Hot x={430} y={190} w={40} h={38} onClick={() => setInfoKey('toengine')}>
            <path d="M 452,216 L 447,226 L 457,226 Z" fill={C.feedLine} stroke="none" />
            <Lbl x={450} y={200} lines={['TO', 'ENGINE']} size={9} />
          </Hot>

          {/* Manifold valve — where the jet pump, flip-flop and boost pump outputs
              join and leave the collector as engine feed */}
          <Hot x={376} y={551} w={18} h={18} onClick={() => setInfoKey('manifoldvalve')}>
            <Bowtie x={385} y={560} rot={90} />
          </Hot>

          {/* Collector tank internals */}
          {/* Fuel probe — aligned with the butterfly valve, just below the motive inlet */}
          <Hot x={360} y={699} w={16} h={20} onClick={() => setInfoKey('probe')}>
            <Probe x={368} y={707} failed={failedProbe === 'collector'} />
          </Hot>
          <Hot x={373} y={650} w={22} h={16} onClick={() => setInfoKey('primaryjet')}>
            <JetPump x={384} y={659} rot={180} />
          </Hot>
          <path d="M 384,662 V 672" stroke={C.text} strokeWidth={1.2} fill="none" />
          <Hot x={374} y={668} w={20} h={20} r={10} onClick={() => setInfoKey('flipflop')}>
            <circle cx={384} cy={678} r={5.5} fill={C.box} stroke={C.text} strokeWidth={1.1} />
          </Hot>
          <Hot x={365} y={774} w={18} h={17} onClick={() => setInfoKey('lcsovdefuel')}>
            <SoDefuel x={374} y={782} hot={defuelFlash} />
          </Hot>
          <Hot x={387} y={771} w={22} h={22} r={11} onClick={() => setInfoKey('boostpump')}>
            <BoostPump x={398} y={782} on={boostRunning} />
          </Hot>

          {/* ═══ CENTER COLUMN COMPONENTS (drawn over the lines) ═══ */}
          {/* Maintenance shutoff valve — engine feed line, just upstream of the filter */}
          <Hot x={376} y={404} w={18} h={18} onClick={() => setInfoKey('mxsov')}>
            <Bowtie x={385} y={413} rot={90} />
          </Hot>
          <Hot x={374} y={381} w={22} h={22} r={11} onClick={() => setInfoKey('filter')}>
            <Filter x={385} y={392} />
          </Hot>
          <Hot x={374} y={341} w={22} h={22} r={11} onClick={() => setInfoKey('fwsov')}>
            <Sov x={385} y={352} closed={fwShutoff} />
          </Hot>
          <Hot x={393} y={298} w={22} h={22} r={11} onClick={() => setInfoKey('lppump')}>
            <EngPump x={404} y={309} />
          </Hot>
          {/* Engine-driven high pressure pump (gear pump) + FMU + transmitter */}
          <Hot x={435} y={279} w={34} h={22} onClick={() => setInfoKey('hppump')}>
            <rect x={438} y={282} width={28} height={16} rx={2} fill={C.box} stroke={C.text} strokeWidth={1.1} />
            {[447, 457].map(x => <circle key={x} cx={x} cy={290} r={3.2} fill="none" stroke={C.text} strokeWidth={0.9} />)}
          </Hot>
          <Hot x={431} y={256} w={42} h={22} onClick={() => setInfoKey('fmu')}>
            <rect x={434} y={258} width={36} height={18} rx={3} fill={C.boxAlt} stroke={C.text} strokeWidth={1.1} />
            <text x={452} y={267.5} style={{ ...T.h, fontSize: 8 }}>FMU</text>
          </Hot>
          {/* Fuel flow transmitter — skinny box with a slash through it */}
          <Hot x={443} y={236} w={18} h={18} onClick={() => setInfoKey('ffxmit')}>
            <rect x={448} y={238} width={8} height={14} rx={1} fill={C.box} stroke={C.text} strokeWidth={1.1} />
            <line x1={448} y1={252} x2={456} y2={238} stroke={C.text} strokeWidth={0.9} />
          </Hot>

          {/* ═══ FUEL FLOW CONTROLS (above the PCL) — quick fill + PPH draw slider ═══ */}
          <foreignObject x={108} y={131} width={150} height={50}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontFamily: FONT }}>
              <button onClick={() => { setService(0); setLeftFuel(MAX_FUEL); setRightFuel(MAX_FUEL); }}
                style={{
                  fontFamily: FONT, fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '1px 10px', cursor: 'pointer', color: C.text,
                  background: C.boxAlt, border: `1px solid ${C.accent}`, borderRadius: 3,
                }}>
                QUICK FILL
              </button>
              <input type="range" min={200} max={680} step={10} value={pph}
                onChange={e => setPph(Number(e.target.value))}
                style={{ width: '94%', accentColor: C.accent, margin: 0 }} />
              <div style={{ fontSize: 8, fontWeight: 700, color: C.text }}>{`${pph} PPH (60x)`}</div>
            </div>
          </foreignObject>

          {/* Pause / play — freezes the whole simulation, next to the PCL.
              The glyph is drawn rather than typed: the ‖ and ▶ characters render as
              hairlines at this size. */}
          <foreignObject x={144} y={181} width={22} height={20}>
            <button onClick={() => setPaused(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3.5,
                width: '100%', height: '100%', boxSizing: 'border-box', padding: 0,
                cursor: 'pointer', background: paused ? C.accent : C.boxAlt,
                border: `1px solid ${C.accent}`, borderRadius: 3,
              }}>
              {paused
                ? <span style={{
                    width: 0, height: 0, marginLeft: 2,
                    borderLeft: '10px solid #ffffff',
                    borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
                  }} />
                : [0, 1].map(i => (
                    <span key={i} style={{ width: 2.5, height: 12, background: C.text, borderRadius: 1 }} />
                  ))}
            </button>
          </foreignObject>

          {/* ═══ POWER CONTROL LEVER + FIREWALL SHUTOFF HANDLE (mechanical) ═══ */}
          <Mech d="M 214,197 H 320 V 270 H 434" />
          {/* PCL → PMU → FMU: the PCL commands the FMU electrically while the engine runs */}
          <El d="M 214,186 H 330 V 265 H 434" live={engineOn} />
          <Hot x={167} y={177} w={50} h={28} onClick={() => setInfoKey('pcl')}>
            <rect x={170} y={180} width={44} height={22} rx={3} fill={C.boxAlt} stroke={C.text} strokeWidth={1.1} />
            <text x={192} y={191.5} style={{ ...T.h, fontSize: 8 }}>PCL</text>
          </Hot>
          <Lbl x={192} y={213} lines={['POWER CONTROL', 'LEVER']} />
          {/* PMU (power management unit) — inline on the PCL → FMU electrical signal */}
          <Hot x={262} y={175} w={36} h={21} onClick={() => setInfoKey('pmu')}>
            <rect x={265} y={178} width={30} height={15} rx={3} fill={C.boxAlt} stroke={C.text} strokeWidth={1.1} />
            <text x={280} y={185.5} style={{ ...T.h, fontSize: 8 }}>PMU</text>
          </Hot>

          <Mech d="M 150,344 V 352 H 377" />
          {/* Firewall shutoff handle — click to pull: the T lifts and lengthens, the
              valve rotates closed, engine feed is cut, and the engine flames out shortly. */}
          <g className="dgm-hot" onClick={toggleFwShutoff}>
            <g style={{
              transformBox: 'view-box', transformOrigin: '150px 334px',
              transform: fwShutoff ? 'translateY(-5px) scaleY(1.2)' : 'none',
              transition: 'transform 0.35s ease',
            }}>
              <line x1={150} y1={342} x2={150} y2={325} stroke={C.text} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
              <line x1={141} y1={325} x2={159} y2={325} stroke={C.text} strokeWidth={2.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
            <rect x={138} y={334} width={24} height={8} rx={3} fill={fwShutoff ? C.accent : C.boxAlt} stroke={C.text} strokeWidth={1} />
          </g>
          <Lbl x={140} y={372} lines={['FIREWALL', 'SHUTOFF HANDLE']} />

          {/* ═══ FUEL QTY DISPLAY + EDM + EICAS ANNUNCIATORS ═══ */}
          <rect x={525} y={152} width={64} height={102} rx={4} fill={C.panelFace} stroke={C.gaugeBezel} strokeWidth={2} />
          <text x={557} y={163} style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, fill: C.gaugeText, textAnchor: 'middle' }}>FUEL QTY</text>
          <text x={557} y={173} style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, fill: C.gaugeText, textAnchor: 'middle' }}>LBS X 100</text>
          {(() => {
            const yBot = 240, yTop = 179, uh = (yBot - yTop) / 7;   // scale 0..7 (×100 lbs)
            const yOf = v => yBot - v * uh;
            const bw = 10;                                          // bar width
            // Dynamic bars: fill turns yellow below BARS_YELLOW_LBS.
            // Driven by the indicated quantity — a failed probe pins its bar to the floor
            // of the band it was sensing.
            const bars = [{ key: 'L', x: 535, val: leftInd / 100, dir: 1 }, { key: 'R', x: 569, val: rightInd / 100, dir: -1 }];
            const ticks = [];
            for (let v = 0; v <= 7.0001; v += 0.5) ticks.push(Number(v.toFixed(1)));
            return (
              <>
                {bars.map(({ key, x, val, dir }) => {
                  const inner = dir > 0 ? x + bw : x;              // inner edge (toward center)
                  const yVal = yOf(val);
                  const fill = val < BARS_YELLOW_LBS / 100 ? C.annCaution : '#ffffff';
                  return (
                    <g key={key}>
                      {/* track + white (yellow when low) fuel column */}
                      <rect x={x} y={yTop} width={bw} height={yBot - yTop} fill="none" stroke={C.gaugeTick} strokeWidth={0.8} />
                      <rect x={x + 0.6} y={yVal} width={bw - 1.2} height={yBot - yVal} fill={fill} />
                      {/* yellow caution spine — 1/3 bar width, inner-aligned to touch the ticks (0..1.5) */}
                      <rect x={dir > 0 ? x + bw - bw / 3 : x} y={yOf(1.5)} width={bw / 3} height={yBot - yOf(1.5)} fill={C.annCaution} />
                      {/* ticks point inward to the shared number column; yellow at/below 1.5 */}
                      {ticks.map(v => {
                        const major = Number.isInteger(v);
                        const len = major ? 5 : 3;
                        return (
                          <line key={v} x1={inner} y1={yOf(v)} x2={inner + dir * len} y2={yOf(v)}
                            stroke={v <= 1.5 ? C.annCaution : C.gaugeTick} strokeWidth={major ? 1 : 0.7} />
                        );
                      })}
                    </g>
                  );
                })}
                {/* thick red baseline across both bars — interrupted for the 0 */}
                <line x1={535} y1={yBot} x2={552} y2={yBot} stroke={C.feedLine} strokeWidth={2.5} />
                <line x1={562} y1={yBot} x2={579} y2={yBot} stroke={C.feedLine} strokeWidth={2.5} />
                {/* shared center number column (0..7), all white */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(v => (
                  <text key={v} x={557} y={yOf(v)}
                    style={{ fontFamily: FONT, fontSize: 6, fill: C.gaugeText, textAnchor: 'middle', dominantBaseline: 'central' }}>{v}</text>
                ))}
              </>
            );
          })()}
          <text x={557} y={248} style={{ fontFamily: FONT, fontSize: 6.5, fill: C.gaugeText, textAnchor: 'middle' }}>{`TOTAL ${Math.round(leftInd + rightInd)} LBS`}</text>
          {/* Laid over the finished gauge rather than wrapped around it — the bars are
              built in an IIFE, and the hit rect works the same either way. */}
          <Hot x={522} y={149} w={70} h={108} onClick={() => setInfoKey('fuelqty')} />

          <Hot x={633} y={266} w={38} h={24} onClick={() => setInfoKey('edm')}>
            <rect x={637} y={270} width={30} height={16} rx={3} fill={C.box} stroke={C.text} strokeWidth={1.1} />
            <text x={652} y={278.5} style={{ ...T.h, fontSize: 9 }}>EDM</text>
          </Hot>

          {/* Annunciators open the EICAS briefing tab — FUEL_EICAS stays the one place
              each message's cause and response is written down. */}
          {[
            { y: 150, text: 'FUEL PX',    kind: 'warn',     on: pxLit },
            { y: 176, text: 'FUEL BAL',   kind: 'caution',  on: fuelBalCaution },
            { y: 202, text: 'L FUEL LO',  kind: 'caution',  on: leftLow },
            { y: 228, text: 'R FUEL LO',  kind: 'caution',  on: rightLow },
            { y: 254, text: 'FP FAIL',    kind: 'caution',  on: failedProbe !== null },
            { y: 280, text: 'BOOST PUMP', kind: 'advisory', on: boostRunning },
            { y: 306, text: 'M FUEL BAL', kind: 'advisory', on: fuelBalMan },
          ].map(({ y, text, kind, on }) => (
            <Hot key={text} x={748} y={y} w={100} h={21} r={2} onClick={() => openBriefing('eicas')}>
              <Ann x={748} y={y} text={text} kind={kind} on={on} />
            </Hot>
          ))}

          {/* ═══ ELECTRICAL SIGNAL RUNS ═══
              Each run comes alive with the signal it actually carries, so the diagram
              shows which circuits a given switch or fault energizes. Where the geometry
              was drawn back-to-front against the signal, `rev` turns the dashes around;
              where several sources share a trunk, the trunk is split out so it lights
              for any of them rather than only the first. */}
          {/* EDM → fuel qty display (always indicating); fuel flow transmitter → display */}
          <El d="M 652,270 V 258 H 500 V 205 H 520" live />
          <El d="M 595,205 H 610 V 145 H 430" live={feedLive} rev />
          {/* EDM → M FUEL BAL advisory; EDM → FUEL BAL caution */}
          <El d="M 668,278 H 710 V 316 H 748" live={fuelBalMan} />
          <El d="M 748,186 H 680 V 278" live={fuelBalCaution} rev />

          {/* Probe buses → EDM; LP switch → FUEL PX warning */}
          <El d="M 335,770 H 537" live />
          <El d="M 368,716 V 770" live />
          <El d="M 802,765 V 330 H 652 V 285" live />
          <El d="M 625,430 H 700 V 160 H 748" live={pxLit} />
          {/* Fuel balance: MAN/RESET arms the knob, which drives the transfer valve
              solenoids — energized only while a valve is being held closed */}
          <El d="M 400,845 V 840 H 440 V 845" live={fuelBalMan} />
          <El d="M 440,880 V 900 H 520 V 815" live={!leftFlow || !rightFlow} />
          <El d="M 520,815 H 557 V 665" live={!rightFlow} />
          <El d="M 520,815 H 313 V 665" live={!leftFlow} />
          {/* Boost pump switch → boost pump; starter switch → starter relay → boost circuit;
              low pressure switch → the same circuit when it calls the pump up on its own.
              The switch leg carries only what the pilot selects — the low pressure switch
              runs the pump through the relay side, so during FUEL PX this leg stays dead
              until BOOST PUMP is actually moved to ON. */}
          <El d="M 485,875 H 500" live={boost} />
          <El d="M 500,875 V 837 H 398 V 790" live={boostHeld} />
          <El d="M 320,880 V 905 H 550 V 885" live={starter} />
          <El d="M 530,885 H 500 V 875" live={starter} />
          <El d="M 407,788 H 822 V 330 H 860 V 290 H 848" live={boostRunning} />
          <El d="M 475,788 V 420 H 430" live={lpCommand} rev />
          {/* Fuel low level sensors → L/R FUEL LO, sharing the run up the right margin */}
          <El d="M 295,820 V 915 H 575 V 845" live={leftLow} />
          <El d="M 575,820 V 845" live={rightLow} />
          <El d="M 575,845 H 869 V 215" live={leftLow || rightLow} />
          <El d="M 869,215 H 848" live={leftLow} />
          <El d="M 869,240 H 848" live={rightLow} />

          {/* ═══ COCKPIT SWITCH PANEL (interactive) ═══ */}
          <Btn x={320} y={875} title={['STARTER', 'AUTO/RESET']} states={['NORM', 'AUTO']}
            state={starter ? 1 : 0} onClick={() => setStarter(v => !v)} />
          <Btn x={360} y={875} title={['IGNITION']} states={['NORM', 'ON']} state={0} />
          <Btn x={400} y={875} title={['FUEL BAL', 'MAN/RESET']} states={['AUTO', 'MAN']}
            state={fuelBalMan ? 1 : 0} onClick={toggleFuelBalMan} />
          <Btn x={440} y={875} title={['MANUAL', 'FUEL BAL']} states={['OFF', 'L', 'R']}
            state={manBal} onClick={fuelBalMan ? () => setManBal(v => (v + 1) % 3) : undefined} />
          <Btn x={480} y={875} title={['BOOST', 'PUMP']} states={['ARM', 'ON']}
            state={boost ? 1 : 0} onClick={() => setBoost(v => !v)} />

          {/* Starter relay — lifting-arm contact, closes with the starter switch */}
          <Hot x={525} y={872} w={30} h={20} onClick={() => setInfoKey('starterrelay')}>
            <SwArm x={530} y={885} on={starter} />
          </Hot>
          <Lbl x={610} y={900} lines={['STARTER', 'RELAY']} size={8} />
          <Ldr d="M 592,900 L 555,888" />

          {LABELS_UPPER}
          {/* REFUEL / DEFUEL — single-point servicing controls, right of the label,
              outside the firewall outline */}
          <foreignObject x={284} y={404} width={52} height={40}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: FONT }}>
              {[['REFUEL', 1], ['DEFUEL', 2]].map(([label, mode]) => (
                <button key={label} onClick={() => setService(sv => sv === mode ? 0 : mode)}
                  style={{
                    fontFamily: FONT, fontSize: 7, fontWeight: 700, letterSpacing: '0.04em',
                    padding: '2px 0', cursor: 'pointer', color: service === mode ? '#fff' : C.text,
                    background: service === mode ? C.accent : C.boxAlt,
                    border: `1px solid ${C.accent}`, borderRadius: 3,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </foreignObject>
          {LABELS_LOWER}

          {/* Two components whose symbol already owns a simulation control: the pre-check
              valve opens and closes, and the purge line is just a run of pipe. Their detail
              hangs off the label instead, laid over LABELS_LOWER so it takes the click. */}
          <Hot x={204} y={476} w={82} h={17} onClick={() => setInfoKey('precheckvalve')} />
          <Hot x={557} y={315} w={57} h={17} onClick={() => setInfoKey('purgeline')} />
        </svg>
      </>)}
    </DiagramShell>
  );
}

export default T6BFuelDiagram;
