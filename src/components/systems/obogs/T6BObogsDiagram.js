import { useState, useEffect, useRef, useCallback } from 'react';
import { THEME, DIAGRAM_FONT } from '../diagramTheme';
import { OBOGS_VERBATIM, OBOGS_NUMBERS, OBOGS_EICAS, OBOGS_EPS, OBOGS_INFO } from './ObogsModalData';
import DiagramShell from '../DiagramShell';
import { InfoModal } from '../InfoModal';
import { Hot } from '../Hot';
import { T, Lbl, Ldr, El, Mech } from '../Notation';

// ── Keyframes (dash cycles: 8+4=12, 6+5=11 — offsets are one full cycle ×2) ──
// The hover-ring rules and the signal-run chase are not here: DiagramShell injects
// the shared HOT_STYLES and SIGNAL_KEYFRAMES.
const KEYFRAMES = `
  @keyframes oxyFlowA { to { stroke-dashoffset: -24; } }
  @keyframes oxyFlowB { to { stroke-dashoffset: -22; } }
`;

// ── Colors: shared THEME + OBOGS line-function colors ────────────────────────
// Two blues separated by value rather than hue, so the run reads as one system in
// which the air *becomes* oxygen — and so red / amber / green stay reserved for
// WARNING / CAUTION / advisory. Cabin ambient air is deliberately grey: what comes
// through an open anti-suffocation valve is not oxygen and should not look like it.
const LOCAL = {
  bleedLine:   '#2b6f96', // ENGINE BLEED AIR — dark, unconditioned
  oxyLine:     '#57a9e0', // OXYGEN — the sky-blue conductor the white dashes ride on
  // CABIN AMBIENT AIR through an open ASV, and any line not flowing. Named for its
  // function but deliberately the same grey as every other unpowered stroke.
  ambientLine: THEME.stroke,
  senseLine:   '#8496a6', // reference pressure, drains, monitor sensing — never flowing
  unitFill:    '#e4e9ee', // the OBOGS unit enclosure
  seatFill:    '#dde3e9',
  pilotFill:   '#c6d1da',
  pilotStroke: '#7d8f9f',
  ringGreen:   '#2e8b57', // the emergency oxygen handle's own color, not a status color
  // Lit annunciator text runs brighter than the THEME status colors because it sits
  // on a black EICAS face.
  annWarning: '#f2453d', annCaution: '#e0b830', annAdvisory: '#4fbf6b',
  // Regulator lever bodies. These are hardware placard colors copied off the panel
  // photo — a red pressure lever, a white concentration lever, a green supply lever —
  // not status colors. Nothing else on the page paints a control red or green.
  leverRed:   '#c0392b', leverRedEdge:   '#8e2a1f',
  leverGreen: '#2f9e5f', leverGreenEdge: '#1e7042',
};

const C = { ...THEME, ...LOCAL };
const FONT = DIAGRAM_FONT;

// ── Boxed click target ──
// Most components on the page are a plain box that opens its own description, and the
// box and its hover ring are the same rectangle — so the geometry is written once here
// instead of twice at every call site, where the two could silently drift apart.
const HotBox = ({ x, y, w, h, r = 2, sw = 1, fill = C.box, stroke = C.text, onClick, children }) => (
  <Hot x={x} y={y} w={w} h={h} r={r} onClick={onClick}>
    <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={sw} />
    {children}
  </Hot>
);

// ── Flow line: colored conductor + white animated dash overlay (site flow idiom) ──
//
//  The dashes travel along the path in the order its points are written, so every `d`
//  below is authored in the direction the fluid actually moves — regulator up to the
//  mask, not mask down to the regulator.
const F_CFG = {
  bleed:   { color: C.bleedLine,   width: 4,   dash: '8 4', dur: 1.30, kf: 'oxyFlowA' },
  oxy:     { color: C.oxyLine,     width: 4,   dash: '8 4', dur: 1.30, kf: 'oxyFlowA' },
  hose:    { color: C.oxyLine,     width: 3,   dash: '6 5', dur: 1.19, kf: 'oxyFlowB' },
  ambient: { color: C.ambientLine, width: 2.6, dash: '6 5', dur: 1.70, kf: 'oxyFlowB' },
  sense:   { color: C.senseLine,   width: 1.6 },
};

function F({ d, v = 'oxy', anim = true }) {
  const cfg = F_CFG[v];
  return (
    <g>
      <path d={d} fill="none" stroke={cfg.color} strokeWidth={cfg.width} />
      {anim && cfg.dash && (
        <path d={d} fill="none" stroke={C.wireDash} strokeWidth={1.4}
          style={{ strokeDasharray: cfg.dash, animation: `${cfg.kf} ${cfg.dur}s linear infinite` }} />
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Simulation constants
//
//  NATOPS timings run to minutes. Every clock here is compressed to wall-clock
//  seconds, and every readout is labelled with the true NATOPS value counting down
//  in mm:ss — the behavior stays teachable and the number on screen is still the one
//  to memorize. The REAL / SIM pairs are what the countdown scales between.
// ─────────────────────────────────────────────────────────────────────────────
const WARMUP_REAL_S     = 240;  // NATOPS: 4 minute sensor warm-up
const WARMUP_SIM_S      = 12;
const IBIT_DROP_REAL_S  = 25;   // NATOPS: concentration drops in 20 – 30 s
const IBIT_DROP_SIM_S   = 2.5;
const IBIT_CLEAR_REAL_S = 120;  // NATOPS: warning extinguishes within 2 minutes
const IBIT_CLEAR_SIM_S  = 8;
const EMERG_REAL_S      = 600;  // NATOPS: approximately 10 minutes of emergency oxygen
const EMERG_SIM_S       = 20;

// The plenum is a reserve, not a bottle — NATOPS publishes no duration, only the four
// things it depends on. A few seconds of hold-up is enough to show that delivery
// outlives production.
const PLENUM_DRAIN_S = 6;
const PLENUM_FILL_S  = 2;

const BREATH_S = 4;             // one full breathing cycle; the blinker shows the inhale

const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ─────────────────────────────────────────────────────────────────────────────
//  Fixed geometry
//
//  The page follows NATOPS Figure 1-97: cockpits and indications across the top,
//  the bleed run and the OBOGS unit across the bottom, one oxygen manifold between
//  them. BLEED_Y is the unit's vertical centreline — bleed in from the engine, product
//  out to the plenum and the internal spine all share it, as in the figure.
// ─────────────────────────────────────────────────────────────────────────────
// viewBox. It starts below y=0 and ends above the old 568: the schematic sits inside a
// card that supplies its own padding, so any blank band inside the viewBox is padding
// twice over. SVG_H is also what converts a lever drag from client pixels to user units.
const SVG_W = 870, SVG_Y0 = 8, SVG_H = 532;
const MANIFOLD_Y = 228;         // the oxygen distribution line, plenum → both regulators
const HOSE_DX    = 110;         // each cockpit's supply hose, relative to its own origin

const REAR_OX  = 26;
const FRONT_OX = 350;

const PANEL_W = 176;
const PANEL_H = 108;
const PANEL_Y = 60;
const REAR_PX  = 146;
const FRONT_PX = 470;

const UNIT_X = 350, UNIT_Y = 302, UNIT_W = 364, UNIT_H = 156;
const BLEED_Y = UNIT_Y + UNIT_H / 2;                    // 380 — the unit's centreline
const PLENUM_X = 730, PLENUM_W = 58, PLENUM_CX = PLENUM_X + PLENUM_W / 2;

// EICAS. Each warning wire enters the face level with the message it drives — OBOGS
// FAIL from the left, OBOGS TEMP from the right — so a reader can follow either one
// back to its cause without untangling a shared bundle.
const EICAS_X = 672, EICAS_W = 178, EICAS_R = EICAS_X + EICAS_W;
const FAIL_ANN_Y = 76, TEMP_ANN_Y = 116;
const FAIL_IN_Y = FAIL_ANN_Y + 12;                      // 88
const TEMP_IN_Y = TEMP_ANN_Y + 12;                      // 128

const FAIL_Y = 482;             // the OBOGS FAIL collector along the bottom
const TEMP_Y = 498;             // the OBOGS TEMP wire, on its own

// ─────────────────────────────────────────────────────────────────────────────
//  NATOPS-style symbol primitives
// ─────────────────────────────────────────────────────────────────────────────

// Shutoff valve — circle with a lever that rotates 90° CCW when closed
const Sov = ({ x, y, r = 8, closed = false }) => (
  <g stroke={C.text} strokeWidth={1.1}>
    <circle cx={x} cy={y} r={r} fill={C.box} />
    <g style={{
      transformBox: 'view-box', transformOrigin: `${x}px ${y}px`,
      transform: closed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.4s ease',
    }}>
      <path d={`M ${x - r * 0.62},${y + r * 0.62} L ${x + r * 0.62},${y - r * 0.62}`} />
      <path d={`M ${x + r * 0.62},${y - r * 0.62} l ${r * 0.42},${-r * 0.42}`} strokeWidth={1.8} />
    </g>
  </g>
);

// Check / nonreturn valve — box with a shafted arrow in the flow direction
const CheckValve = ({ x, y }) => (
  <g stroke={C.text} fill="none">
    <rect x={x - 7} y={y - 5.5} width={14} height={11} fill={C.box} strokeWidth={0.9} />
    <line x1={x - 4} y1={y} x2={x + 3.5} y2={y} strokeWidth={0.9} />
    <path d={`M ${x + 0.5},${y - 2.4} L ${x + 4},${y} L ${x + 0.5},${y + 2.4}`}
      strokeWidth={0.9} strokeLinejoin="round" strokeLinecap="round" />
  </g>
);

// Sensing switch — a small placarded box that tints when it has tripped. The placard is
// optional: only the high temp switch has a published threshold worth printing inside it.
const Sensor = ({ x, y, label, w = 28, h = 14, tripped = false, kind = 'warning' }) => {
  const tint = kind === 'warning' ? C.warningTint : C.cautionTint;
  const edge = kind === 'warning' ? C.warningText : C.cautionText;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={2}
        fill={tripped ? tint : C.box} stroke={tripped ? edge : C.text} strokeWidth={tripped ? 1.6 : 1} />
      {label && (
        <text x={x} y={y + 0.5} style={{ ...T.sym, fill: tripped ? edge : C.text, fontSize: 6 }}>{label}</text>
      )}
    </g>
  );
};

// Drain — a leg off the line with the NATOPS drain tick
const Drain = ({ x, y1, y2 }) => (
  <g stroke={C.senseLine} strokeWidth={1.6} fill="none">
    <path d={`M ${x},${y1} V ${y2}`} />
    <path d={`M ${x - 5},${y2} H ${x + 5}`} strokeWidth={2} />
    <path d={`M ${x - 3},${y2 + 4} H ${x + 3}`} strokeWidth={1.4} />
  </g>
);

// Heat exchanger — the NATOPS box. Plain: a cooling-matrix zigzag inside it is drawing,
// not system information, and the label and the drain below it already say what it does.
const HeatEx = ({ x, y, w, h }) => (
  <rect x={x} y={y} width={w} height={h} rx={2} fill={C.box} stroke={C.text} strokeWidth={1.2} />
);

// Anti-suffocation valve — the opposing-triangle valve symbol, the same idiom the
// electrical page uses for its current limiters. Purely mechanical: supply pressure
// holds it shut and the pilot's own inhalation cracks it open, so nothing on the panel
// drives it and it is drawn in one fixed position.
const Asv = ({ x, y }) => (
  <g stroke={C.text} strokeWidth={1} fill={C.box}>
    <polygon points={`${x - 6},${y - 7} ${x + 6},${y - 7} ${x},${y}`} />
    <polygon points={`${x - 6},${y + 7} ${x + 6},${y + 7} ${x},${y}`} />
  </g>
);

// Reserve bar — the plenum's charge
const Bar = ({ x, y, w, h, pct, color }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={2} fill={C.boxAlt} stroke={C.stroke} strokeWidth={0.8} />
    <rect x={x + 1.5} y={y + 1.5} width={Math.max(0, (w - 3) * pct)} height={h - 3} rx={1} fill={color} />
  </g>
);

// ── EICAS annunciator (lit/unlit) ──
// Both severities light as colored text on the black EICAS face — only the text color
// separates warning from caution, as on the real screen, so the face never changes.
const ANN_LIT = { warn: C.annWarning, caution: C.annCaution };
const ANN_UNLIT = '#3d4f60';

const ANN_W = 154, ANN_H = 24;

const Ann = ({ x, y, text, kind, on = false }) => (
  <g>
    <rect x={x} y={y} width={ANN_W} height={ANN_H} rx={2} fill={C.panelFace} stroke="#0a1622" strokeWidth={1} />
    <text x={x + ANN_W / 2} y={y + 13}
      style={{
        fontFamily: FONT, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.10em',
        fill: on ? ANN_LIT[kind] : ANN_UNLIT, textAnchor: 'middle', dominantBaseline: 'central',
      }}>
      {text}
    </text>
  </g>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Vertical lever
//
//  The real regulator levers slide in a vertical slot with their position placards
//  printed beside them (Figure 1-98). `options` runs top to bottom and each carries
//  the state value it selects, so a lever's on-screen order can differ from the state
//  encoding — MAX sits above NORMAL on the concentration lever.
//
//  All three levers share the same slot travel (LEVER_SPAN); the pressure lever just
//  has a detent in the middle of it. A lever can be dragged down its slot or moved by
//  clicking a placard row — which is why a lever cannot also open its own InfoModal, so
//  the panel's OXYGEN title does that.
// ─────────────────────────────────────────────────────────────────────────────
const LEVER_SPAN = 40;

function VSel({ x, y, options, value, onSelect, placards = 'right', hitW, body, edge, band }) {
  const right = placards === 'right';
  const n = options.length;
  const gap = LEVER_SPAN / (n - 1);
  const i = Math.max(0, options.findIndex(o => o.value === value));

  // While the pointer is down, `drag` holds the lever's live offset down the slot so the
  // body tracks the finger instead of jumping detent to detent. It selects whichever
  // detent it is nearest on the way; releasing clears the offset and the transition below
  // settles the lever onto that detent.
  const [drag, setDrag] = useState(null);
  const grab = useRef(null);

  const svgY = e => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    return (e.clientY - r.top) * (SVG_H / r.height);
  };
  const onDown = e => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    grab.current = { y: svgY(e), off: gap * i };
    setDrag(gap * i);
  };
  const onMove = e => {
    if (!grab.current) return;
    const off = Math.min(LEVER_SPAN, Math.max(0, grab.current.off + svgY(e) - grab.current.y));
    setDrag(off);
    const k = Math.round(off / gap);
    if (options[k].value !== value) onSelect(options[k].value);
  };
  const onUp = () => { grab.current = null; setDrag(null); };

  return (
    <g>
      <rect x={x - 3} y={y - 9} width={6} height={LEVER_SPAN + 18} rx={3}
        fill={C.boxAlt} stroke={C.stroke} strokeWidth={0.7} />
      {options.map((o, k) => (
        <line key={`t${o.label}`} x1={x - 3} y1={y + gap * k} x2={x + 3} y2={y + gap * k}
          stroke={C.stroke} strokeWidth={0.6} />
      ))}

      {options.map((o, k) => (
        <g key={o.label} className="dgm-hot" onClick={() => onSelect(o.value)}>
          {right ? (
            <>
              <circle cx={x + 9} cy={y + gap * k} r={1.4} fill={i === k ? C.text : C.muted} />
              <text x={x + 13} y={y + gap * k} style={{
                ...T.mini, fontSize: 6, textAnchor: 'start',
                fill: i === k ? C.text : C.muted, fontWeight: i === k ? 700 : 400,
              }}>{o.label}</text>
            </>
          ) : (
            <text x={x - 10} y={y + gap * k} style={{
              ...T.mini, fontSize: 6.5, textAnchor: 'end',
              fill: i === k ? C.text : C.muted, fontWeight: i === k ? 700 : 400,
            }}>{o.label}</text>
          )}
          {/* Hit rows are sized so a lever never steals the neighbouring lever's placards */}
          <rect
            x={right ? x - 8 : x - 30} y={y + gap * k - 9}
            width={right ? hitW : 38} height={18} fill="transparent" />
        </g>
      ))}

      {/* Banded lever body, sliding to the selected position. Last, so it takes the pointer
          rather than the placard hit row it is sitting on top of. */}
      <g
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{
          transformBox: 'view-box', transformOrigin: '0px 0px',
          transform: `translate(0px, ${drag ?? gap * i}px)`,
          transition: drag == null ? 'transform 0.25s ease' : 'none',
          cursor: 'ns-resize', touchAction: 'none', userSelect: 'none',
        }}>
        <rect x={x - 5} y={y - 8} width={10} height={16} rx={2} fill={body} stroke={edge} strokeWidth={0.8} />
        <rect x={x - 5} y={y - 2.5} width={10} height={5} fill={band} />
        {/* A finger is wider than the lever */}
        <rect x={x - 9} y={y - 11} width={18} height={22} fill="transparent" />
      </g>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Oxygen pressure regulator panel
//
//  Laid out from the panel photo rather than from the schematic: OXYGEN and the FLOW
//  blinker top left, BIT top right, then three vertical levers of equal travel —
//  pressure (red), concentration (white, with the maximum concentration light above
//  it), supply (green). Drawn in the page's light palette; the real panel face is
//  black, and the EICAS screen is the only dark element here.
// ─────────────────────────────────────────────────────────────────────────────
const SCREWS = [[10, 10], [10, 54], [10, 98], [166, 10], [166, 54], [166, 98]];
const LEVER_Y = 52;             // top detent of all three levers, relative to the panel

const PRESS_OPTS = [
  { label: 'EMERGENCY', value: 0 },
  { label: 'NORMAL',    value: 1 },
  { label: 'TEST MASK', value: 2 },
];
const CONC_OPTS = [
  { label: 'MAX',    value: 1 },
  { label: 'NORMAL', value: 0 },
];
const SUPPLY_OPTS = [
  { label: 'ON',  value: 1 },
  { label: 'OFF', value: 0 },
];

function RegPanel({
  x, y, supply, conc, press, maxConc, flowLit, bitReady,
  onSupply, onConc, onPress, onBit, onInfo,
}) {
  return (
    <g>
      <rect x={x} y={y} width={PANEL_W} height={PANEL_H} rx={4} fill={C.box} stroke={C.stroke} strokeWidth={1.2} />
      {SCREWS.map(([sx, sy]) => (
        <g key={`${sx}-${sy}`}>
          <circle cx={x + sx} cy={y + sy} r={2.6} fill={C.boxAlt} stroke={C.stroke} strokeWidth={0.7} />
          <line x1={x + sx - 1.7} y1={y + sy - 1.7} x2={x + sx + 1.7} y2={y + sy + 1.7} stroke={C.stroke} strokeWidth={0.7} />
        </g>
      ))}

      {/* OXYGEN is the panel's own placard and the click target for its description */}
      <Hot x={x + 24} y={y + 6} w={42} h={18} r={2} onClick={() => onInfo('regulator')}>
        <text x={x + 45} y={y + 15} style={{ ...T.sym, fontSize: 8.5, letterSpacing: '0.1em' }}>OXYGEN</text>
      </Hot>

      {/* ── FLOW blinker ── */}
      <text x={x + 34} y={y + 31} style={{ ...T.mini, fontSize: 6.5, fill: C.text }}>FLOW</text>
      <HotBox x={x + 50} y={y + 23} w={24} h={15} r={3} fill={C.boxAlt} onClick={() => onInfo('flowindicator')}>
        <rect x={x + 53} y={y + 26} width={18} height={9} rx={1} fill={flowLit ? '#ffffff' : '#101c28'} />
        <line x1={x + 62} y1={y + 26} x2={x + 62} y2={y + 35} stroke={flowLit ? '#101c28' : '#2b3c4c'} strokeWidth={1} />
      </HotBox>

      {/* ── BIT ── */}
      <Hot x={x + 100} y={y + 7} w={24} h={16} r={2} onClick={() => onInfo('bitbutton')}>
        <text x={x + 112} y={y + 15} style={{ ...T.sym, fontSize: 8, letterSpacing: '0.1em' }}>BIT</text>
      </Hot>
      <g className="dgm-hot" onClick={onBit}>
        <circle cx={x + 140} cy={y + 15} r={7.5}
          fill={bitReady ? C.accent : C.boxAlt} stroke={bitReady ? C.accentDeep : C.stroke} strokeWidth={1} />
        <circle cx={x + 140} cy={y + 15} r={4} fill="none" stroke={bitReady ? '#ffffff' : C.stroke} strokeWidth={0.8} />
      </g>

      {/* ── Maximum concentration light. Unlabelled on the real panel; the click-through
             says what it means. ── */}
      <Hot x={x + 82} y={y + 28} w={12} h={12} r={6} onClick={() => onInfo('maxconclight')}>
        <circle cx={x + 88} cy={y + 34} r={6}
          fill={maxConc ? C.annAdvisory : C.boxAlt} stroke={maxConc ? C.advisoryBorder : C.stroke} strokeWidth={1} />
      </Hot>

      {/* ── SUPPLY ── */}
      <text x={x + 140} y={y + 36} style={{ ...T.sym, fontSize: 7.5, letterSpacing: '0.1em' }}>SUPPLY</text>

      {/* ── The three levers, equal travel, panel-photo colors ── */}
      <VSel x={x + 28} y={y + LEVER_Y} options={PRESS_OPTS} value={press} onSelect={onPress} hitW={58}
        body={C.leverRed} edge={C.leverRedEdge} band="#ffffff" />
      <VSel x={x + 88} y={y + LEVER_Y} options={CONC_OPTS} value={conc} onSelect={onConc} hitW={38}
        body="#ffffff" edge={C.text} band={C.boxAlt} />
      <VSel x={x + 152} y={y + LEVER_Y} options={SUPPLY_OPTS} value={supply} onSelect={onSupply} placards="left"
        body={C.leverGreen} edge={C.leverGreenEdge} band="#ffffff" />

      {/* The concentration lever's slot placard, as printed on the panel */}
      <text x={x + 101} y={y + LEVER_Y + LEVER_SPAN / 2} style={{ ...T.mini, fontSize: 6, textAnchor: 'start' }}>OXYGEN</text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Cockpit — simplified pilot, mask, CRU-60/P, hose ASV, emergency oxygen
//
//  The NATOPS figure draws full-body pilots; nothing about them carries system
//  information, so they collapse to a seat outline, a helmet and a mask. What is kept
//  is everything the oxygen actually passes through. The emergency bottle is drawn
//  upright against the seat back, where it lives on the aircraft.
// ─────────────────────────────────────────────────────────────────────────────
function Cockpit({ ox, label, supplyOn, delivery, emergSecs, breathIn, maskOn, onSel }) {
  const X = ox;
  const H = X + HOSE_DX;
  // Oxygen reaches this mask whenever this cockpit's supply lever is ON and the
  // system — or the plenum reserve behind it — is still delivering.
  const oxyToMask = supplyOn && delivery;
  const emergLive = emergSecs > 0;
  const maskFed   = oxyToMask || emergLive;
  // Off the face, the mask hangs on the pilot's chest on a slack hose. Oxygen keeps
  // coming out of it — that free flow is exactly why concentration to both regulators
  // drops — so it stays painted with whatever is in it.
  const mx = maskOn ? X + 58 : X + 44;
  const my = maskOn ? 77 : 104;

  return (
    <g>
      <text x={X + 50} y={20} style={{ ...T.h, fontSize: 9, letterSpacing: '0.16em' }}>{label}</text>

      {/* ── Seat + pilot ── */}
      <path d={`M ${X + 10},154 V 56 a 6 6 0 0 1 6,-6 h 12 a 6 6 0 0 1 6,6 V 138 h 52 a 6 6 0 0 1 6,6 v 4 a 6 6 0 0 1 -6,6 Z`}
        fill={C.seatFill} stroke={C.stroke} strokeWidth={1} />
      <path d={`M ${X + 38},90 h 20 a 10 10 0 0 1 10,10 v 38 h -30 Z`}
        fill={C.pilotFill} stroke={C.pilotStroke} strokeWidth={1} />
      <circle cx={X + 50} cy={76} r={13} fill={C.pilotFill} stroke={C.pilotStroke} strokeWidth={1} />

      {/* ── Emergency oxygen: an upright bottle on the seat back, contents gage above,
             green ring below, hose round to the CRU-60/P. Grey until the ring is
             pulled — nothing is in that line before then. ── */}
      <F d={`M ${X + 4},128 H ${X + 16} V 182 H ${X + 92} V 118 H ${X + 86}`}
        v={emergLive ? 'hose' : 'ambient'} anim={emergLive} />

      <line x1={X - 5} y1={50} x2={X - 5} y2={62} stroke={C.text} strokeWidth={1.4} />
      <Hot x={X - 13} y={34} w={16} h={16} r={8} onClick={() => onSel('contentsgage')}>
        <circle cx={X - 5} cy={42} r={8} fill={C.gaugeFace} stroke={C.gaugeBezel} strokeWidth={1} />
        <path d={`M ${X - 5},42 L ${X - 5 + (emergLive ? 5 : 0)},${42 - (emergLive ? 4 : 6)}`}
          stroke={C.gaugeText} strokeWidth={1.2} />
      </Hot>
      <text x={X + 8} y={42} style={{ ...T.mini, fontSize: 5.5, textAnchor: 'start' }}>CONTENTS GAGE</text>

      <HotBox x={X - 14} y={60} w={18} h={74} r={9} sw={1.1} onClick={() => onSel('emergencyoxygen')}>
        <text x={X - 5} y={97} transform={`rotate(-90 ${X - 5} 97)`} style={{ ...T.sym, fontSize: 6 }}>EMER O2</text>
      </HotBox>

      {/* Green ring — pull to feed this seat's CRU-60/P straight from the bottle */}
      <g className="dgm-hot" onClick={() => onSel('emergencyoxygen', 'pull')}>
        <line x1={X - 5} y1={134} x2={X - 5} y2={144} stroke={C.ringGreen} strokeWidth={2} />
        <circle cx={X - 5} cy={150} r={6} fill="none" stroke={C.ringGreen} strokeWidth={2.6} />
        <circle cx={X - 5} cy={150} r={12} fill="transparent" />
      </g>
      <text x={X - 5} y={166} style={{ ...T.mini, fontSize: 5.5, fill: emergLive ? C.warningText : C.muted }}>
        {emergLive ? mmss(EMERG_REAL_S * (emergSecs / EMERG_SIM_S)) : 'GREEN RING'}
      </text>

      {/* ── Oxygen path, drawn in the direction it flows: breathing regulator up the
             supply hose, through the hose ASV and the CRU-60/P, into the mask ── */}
      <F d={`M ${H},220 V 118 H ${X + 86}`} v={oxyToMask ? 'hose' : 'ambient'} anim={oxyToMask} />
      <Hot x={H - 8} y={170} w={16} h={16} r={2} onClick={() => onSel('hoseasv')}>
        <Asv x={H} y={178} />
      </Hot>
      <Lbl x={X + 92} y={198} lines={['HOSE ANTI-', 'SUFFOCATION VALVE']} anchor="end" size={5.5} lh={8} />

      <HotBox x={X + 70} y={112} w={16} h={12} r={2} onClick={() => onSel('cru60p')}>
        <text x={X + 78} y={118} style={{ ...T.sym, fontSize: 5.5 }}>CRU</text>
      </HotBox>

      <F d={maskOn
        ? `M ${X + 80},114 C ${X + 88},106 ${X + 90},88 ${X + 72},83`
        : `M ${X + 80},114 C ${X + 76},113 ${X + 70},110 ${X + 58},110`}
        v={maskFed ? 'hose' : 'ambient'} anim={maskFed} />

      {/* Mask — blue while oxygen reaches it, grey when the pilot is on cabin air. It is
          also a control: clicking it takes it off the face, which with the supply lever ON
          is what a mask-down OBOGS FAIL looks like. The MASK placard beside it is the
          click-through to the description, the way the panel's OXYGEN title is. */}
      <Hot x={mx} y={my} w={14} h={12} r={3} onClick={() => onSel('mask', 'doff')}>
        <rect x={mx} y={my} width={14} height={12} rx={3}
          fill={maskFed ? C.oxyLine : C.ambientLine} stroke={C.pilotStroke} strokeWidth={1} />
      </Hot>
      {maskOn && maskFed && breathIn && (
        <circle cx={X + 65} cy={83} r={10} fill="none" stroke={C.oxyLine} strokeWidth={1.2} opacity={0.45} />
      )}
      <Hot x={X + 74} y={62} w={26} h={11} r={2} onClick={() => onSel('mask')}>
        {/* The placard says which state it is in — a 14 px rect moving 27 px down the page
            is a quiet cue on its own. Not red: the mask is a component, not an annunciator. */}
        <text x={X + 76} y={68} style={{ ...T.mini, fontSize: 5.5, textAnchor: 'start',
          fill: maskOn ? C.muted : C.text }}>{maskOn ? 'MASK ON' : 'MASK OFF'}</text>
      </Hot>

      {/* Breathing regulator and ASV (panel mounted), sitting on the oxygen manifold */}
      <Hot x={H - 8} y={MANIFOLD_Y - 8} w={16} h={16} r={2} onClick={() => onSel('regasv')}>
        <Asv x={H} y={MANIFOLD_Y} />
      </Hot>
      <Lbl x={H} y={246} lines={['BREATHING REGULATOR', 'AND ASV (PANEL MOUNTED)']} size={5.5} lh={8} />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Static chrome — built once at module load so React skips reconciling it.
//  Anything added here must stay state-independent.
// ─────────────────────────────────────────────────────────────────────────────
const LABELS = (
  <>
    {/* ── Bleed supply run ── */}
    <Lbl x={16} y={396} lines={['ENGINE', 'BLEED AIR']} anchor="start" size={7.5} />

    <Lbl x={86} y={326} lines={['SHUTOFF', 'VALVE']} size={7.5} />
    <Ldr d="M 92,340 L 104,372" />

    <Lbl x={144} y={348} lines={['HEAT EXCHANGER']} size={7} />
    <Ldr d="M 144,354 L 144,370" />

    <Lbl x={178} y={326} lines={['HIGH TEMP SWITCH']} size={7} />
    <Ldr d="M 186,332 L 194,354" />

    <Lbl x={300} y={326} lines={['LOW PRESSURE SWITCH']} size={7} />
    <Ldr d="M 288,332 L 258,354" />

    {/* Four drains. Three on the supply line — the OBOGS drain off the bottom of the heat
        exchanger, where the cooling actually condenses the water, and one either side of
        the low pressure switch — plus the unit's own, off the water separator. That last
        one is labelled beside its tick rather than under it: the OBOGS FAIL collector runs
        along the bottom where the placard would otherwise go. */}
    <Lbl x={144} y={426} lines={['OBOGS DRAIN']} size={7} />
    <Lbl x={228} y={420} lines={['DRAIN']} size={7} />
    <Lbl x={292} y={420} lines={['DRAIN']} size={7} />
    <Lbl x={368} y={470} lines={['DRAIN']} anchor="end" size={7} />

    {/* The water separator box is too narrow to hold a placard, so its label sits above
        it on a leader. */}
    <Lbl x={384} y={336} lines={['WATER', 'SEPARATOR']} size={6.5} lh={9} />
    <Ldr d="M 382,348 L 379,358" />

    {/* ── Right column. The nonreturn valve is labelled from below: the composition
           controller's delivery line comes down into the manifold just left of it. ── */}
    <Lbl x={676} y={402} lines={['NONRETURN', 'VALVE']} size={6.5} lh={8.5} />
    <Ldr d="M 686,394 L 697,388" />

    {/* ── Left column ── */}
    {/* Sits below the corner of its own sense line rather than level with it: the tighter
        viewBox puts that row level with the breathing regulator placards. */}
    <Lbl x={14} y={282} lines={['COCKPIT REFERENCE', 'PRESSURE']} anchor="start" size={7.5} />

    {/* ── Source reference ── */}
    <text x={858} y={530} style={{ fontFamily: FONT, fontSize: 7, fill: C.muted, textAnchor: 'end', letterSpacing: '0.08em' }}>
      T-6B NATOPS OXYGEN SYSTEM SCHEMATIC — FIGURE 1-97
    </text>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
function T6BObogsDiagram() {
  // Cockpit controls. Each value is the state that lever's placard selects.
  const [rearSupply,  setRearSupply]  = useState(0);   // 0 OFF, 1 ON
  const [frontSupply, setFrontSupply] = useState(0);
  const [rearConc,    setRearConc]    = useState(0);   // 0 NORMAL, 1 MAX
  const [frontConc,   setFrontConc]   = useState(0);
  const [rearPress,   setRearPress]   = useState(1);   // 0 EMERGENCY, 1 NORMAL, 2 TEST MASK
  const [frontPress,  setFrontPress]  = useState(1);
  const [rearMask,    setRearMask]    = useState(true);
  const [frontMask,   setFrontMask]   = useState(true);

  // Sim faults. No internal-failure button: an internal failure is a real OBOGS FAIL
  // cause, but nothing in the cockpit induces or clears one, so simulating it teaches
  // nothing the BIT wire on the schematic does not already say.
  const [simLowPress, setSimLowPress] = useState(false);
  const [simLowConc,  setSimLowConc]  = useState(false);
  const [simTemp,     setSimTemp]     = useState(false);

  // Compressed clocks, all in wall-clock seconds remaining
  const [warmup, setWarmup] = useState(WARMUP_SIM_S);
  const [ibit,   setIbit]   = useState(0);
  const [emergF, setEmergF] = useState(0);
  const [emergR, setEmergR] = useState(0);
  const [plenum, setPlenum] = useState(0);             // 0 … 1 reserve
  // Only the inhale/exhale half of the breathing cycle is ever read, so only that
  // boolean is state. The phase itself lives in a ref — committing the float would
  // re-render the whole diagram 20 times a second for a value nothing displays.
  const [breathIn, setBreathIn] = useState(true);

  const [infoKey, setInfoKey] = useState(null);
  // Stable, so the memoized InfoModal can bail out — it re-binds its keydown
  // listener whenever onClose changes identity.
  const closeInfo = useCallback(() => setInfoKey(null), []);

  // ── Derived state — one const per condition, so the annunciators, the lines and
  //    the component readouts all read from the same place.
  //    The engine is assumed running: either supply lever ON gives the OBOGS both
  //    28 VDC and P3 bleed air. Low bleed pressure is the Sim Low Press fault. ──
  const systemPowered = rearSupply === 1 || frontSupply === 1;   // either lever ON runs OBOGS
  const lowPressFail  = systemPowered && simLowPress;            // never inhibited by warm-up
  const warmingUp     = systemPowered && warmup > 0;
  const ibitDropping  = ibit > IBIT_CLEAR_SIM_S;
  const ibitFailing   = ibit > 0 && ibit <= IBIT_CLEAR_SIM_S;
  // A mask off the face with that seat's supply lever ON free-flows oxygen out of the
  // system and drops concentration to *both* regulators — the monitor's cause, not the
  // low pressure switch's, which senses bleed air upstream of the whole unit.
  const maskOff       = (rearSupply === 1 && !rearMask) || (frontSupply === 1 && !frontMask);
  const concFail      = systemPowered && !warmingUp && (simLowConc || ibitFailing || maskOff);
  const obogsFail     = lowPressFail || concFail;
  const obogsTemp     = systemPowered && simTemp;
  const maxConc       = rearConc === 1 || frontConc === 1;
  const producing     = systemPowered && !simLowPress;
  const delivery      = producing || plenum > 0.02;              // the plenum outlives production
  const bitReady      = systemPowered && !warmingUp && ibit === 0;

  // Stale-closure guard: one mutable mirror written every render, read by the loop.
  const sim = useRef({});
  sim.current = { systemPowered, producing };

  const breathPhase = useRef(0);

  useEffect(() => {
    const STEP = 1 / 20;                              // commit at 20 Hz, not per frame
    let raf, last = performance.now(), acc = 0;
    const tick = now => {
      raf = requestAnimationFrame(tick);
      const frame = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += frame;
      if (acc < STEP) return;
      const dt = acc;
      acc = 0;
      const s = sim.current;

      // Every setter below bails out when the value is unchanged, so a settled
      // diagram costs nothing: it commits twice per breathing cycle, not 20 times
      // a second.
      if (s.systemPowered) setWarmup(w => Math.max(0, w - dt));
      setIbit(v => (v > 0 ? Math.max(0, v - dt) : v));
      setEmergF(v => (v > 0 ? Math.max(0, v - dt) : v));
      setEmergR(v => (v > 0 ? Math.max(0, v - dt) : v));
      setPlenum(p => (s.producing
        ? Math.min(1, p + dt / PLENUM_FILL_S)
        : Math.max(0, p - dt / PLENUM_DRAIN_S)));
      breathPhase.current = (breathPhase.current + dt) % BREATH_S;
      setBreathIn(breathPhase.current < BREATH_S * 0.45);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Deactivation or a loss of power restarts the 4 minute inhibit, per NATOPS. This is
  // also the "reset the regulators" path — both supply levers OFF, then ON, re-runs the
  // power-up BIT and is the only cockpit action that can clear an internal failure.
  useEffect(() => {
    if (!systemPowered) { setWarmup(WARMUP_SIM_S); setIbit(0); }
  }, [systemPowered]);

  // Two cockpit parts are controls as well as components — the green ring and the mask.
  // A second argument names the action, so each stays a single click target and every
  // other click still opens that component's description.
  const cockpitSel = (setEmerg, setMask) => (key, action) =>
    action === 'pull' ? setEmerg(EMERG_SIM_S)
      : action === 'doff' ? setMask(m => !m)
      : setInfoKey(key);
  const selectRear  = cockpitSel(setEmergR, setRearMask);
  const selectFront = cockpitSel(setEmergF, setFrontMask);

  const pressBit = () => { if (bitReady) setIbit(IBIT_DROP_SIM_S + IBIT_CLEAR_SIM_S); };

  const warmReal = WARMUP_REAL_S * (warmup / WARMUP_SIM_S);
  const ibitReal = ibitDropping
    ? IBIT_DROP_REAL_S * ((ibit - IBIT_CLEAR_SIM_S) / IBIT_DROP_SIM_S)
    : IBIT_CLEAR_REAL_S * (ibit / IBIT_CLEAR_SIM_S);

  // The monitor is what the warm-up inhibits and what the I-BIT exercises, so both
  // compressed clocks read out on the monitor itself rather than in a status box.
  const monitorLine =
    !systemPowered ? 'UNPOWERED'
      : warmingUp    ? `INHIBITED — WARM-UP ${mmss(warmReal)} OF 4:00`
      : ibitDropping ? `I-BIT — CONCENTRATION DROPPING ${mmss(ibitReal)} OF 0:25`
      : ibitFailing  ? `I-BIT — OBOGS FAIL CLEARS IN ${mmss(ibitReal)} OF 2:00`
      : concFail     ? `LOW O2 PARTIAL PRESSURE — ${maskOff && !simLowConc ? 'MASK OFF' : 'OBOGS FAIL'}`
      : 'COMPOSITION / CONCENTRATION NORMAL';

  const concLines = maxConc
    ? ['55 – 95 % (MAX)']
    : ['25 – 70 % ≤15K', '45 – 95 % >15K'];

  return (
    <DiagramShell
      keyframes={KEYFRAMES}
      briefing={{
        verbatim: OBOGS_VERBATIM, numbers: OBOGS_NUMBERS, eicas: OBOGS_EICAS, eps: OBOGS_EPS,
        sortMemoryFirst: true, conditionalSteps: true, valueMinWidth: 170,
      }}
      sims={[
        // One severity per row: the caution alone on the top row, the two OBOGS FAIL causes
        // along the bottom, each named for the wire it lights on the schematic. The empty
        // top-left cell is deliberate.
        { active: simTemp,     onClick: () => setSimTemp(v => !v),     label: 'OBOGS TEMP',     kind: 'caution', col: 2, row: 1 },
        { active: simLowPress, onClick: () => setSimLowPress(v => !v), label: 'Low Press FAIL', kind: 'warn',    col: 1, row: 2 },
        { active: simLowConc,  onClick: () => setSimLowConc(v => !v),  label: 'Low PPO2 FAIL',  kind: 'warn',    col: 2, row: 2 },
      ]}
    >
      {({ openBriefing }) => (<>
        {infoKey && OBOGS_INFO[infoKey] && (
          <InfoModal {...OBOGS_INFO[infoKey]} onClose={closeInfo} theme={C} />
        )}

        <svg viewBox={`0 ${SVG_Y0} ${SVG_W} ${SVG_H}`} width="100%" style={{ display: 'block' }}>

          {/* ══ Oxygen distribution: plenum → manifold → both breathing regulators. Blue
                while the plenum is putting something into it, whether that is live
                production or the reserve behind it; grey when there is nothing left. ══ */}
          <F d={`M ${PLENUM_CX},354 V ${MANIFOLD_Y}`} v={delivery ? 'oxy' : 'ambient'} anim={delivery} />
          <F d={`M ${PLENUM_CX},${MANIFOLD_Y} H ${REAR_OX + HOSE_DX}`} v={delivery ? 'oxy' : 'ambient'} anim={delivery} />

          {/* ══ Cockpits ══ */}
          <Cockpit ox={REAR_OX} label="REAR" supplyOn={rearSupply === 1} delivery={delivery}
            emergSecs={emergR} breathIn={breathIn} maskOn={rearMask} onSel={selectRear} />
          <Cockpit ox={FRONT_OX} label="FRONT" supplyOn={frontSupply === 1} delivery={delivery}
            emergSecs={emergF} breathIn={breathIn} maskOn={frontMask} onSel={selectFront} />

          {/* ══ Oxygen pressure regulator panels. The flow indicator is driven by breaths
                taken through the regulator, so with that seat's mask off the face it goes
                dark and stays dark. ══ */}
          <RegPanel
            x={REAR_PX} y={PANEL_Y}
            supply={rearSupply} conc={rearConc} press={rearPress}
            maxConc={maxConc} flowLit={rearSupply === 1 && delivery && breathIn && rearMask} bitReady={bitReady}
            onSupply={setRearSupply} onConc={setRearConc} onPress={setRearPress}
            onBit={pressBit} onInfo={setInfoKey}
          />
          <RegPanel
            x={FRONT_PX} y={PANEL_Y}
            supply={frontSupply} conc={frontConc} press={frontPress}
            maxConc={maxConc} flowLit={frontSupply === 1 && delivery && breathIn && frontMask} bitReady={bitReady}
            onSupply={setFrontSupply} onConc={setFrontConc} onPress={setFrontPress}
            onBit={pressBit} onInfo={setInfoKey}
          />

          {/* Each panel's levers act on the regulator body down on the manifold */}
          <Mech d={`M ${REAR_PX + 20},${PANEL_Y + PANEL_H} V 220 H ${REAR_OX + HOSE_DX + 8}`} />
          <Mech d={`M ${FRONT_PX + 20},${PANEL_Y + PANEL_H} V 220 H ${FRONT_OX + HOSE_DX + 8}`} />

          {/* ══ EICAS — both cockpits show the identical pair ══ */}
          <rect x={EICAS_X} y={56} width={EICAS_W} height={108} rx={4} fill={C.panelFace} stroke={C.gaugeBezel} strokeWidth={2} />
          {[
            { y: FAIL_ANN_Y, text: 'OBOGS FAIL', kind: 'warn',    on: obogsFail },
            { y: TEMP_ANN_Y, text: 'OBOGS TEMP', kind: 'caution', on: obogsTemp },
          ].map(a => (
            <Hot key={a.text} x={EICAS_X + 12} y={a.y} w={ANN_W} h={ANN_H} r={2} onClick={() => openBriefing('eicas')}>
              <Ann x={EICAS_X + 12} {...a} />
            </Hot>
          ))}

          {/* ══ 28 VDC → OBOGS unit ══ */}
          <HotBox x={596} y={272} w={118} h={28} r={3} sw={1.1} onClick={() => setInfoKey('hotbatbus')}>
            <text x={655} y={281} style={{ ...T.sym, fontSize: 6.5 }}>28 VDC FROM GEN</text>
            <text x={655} y={292} style={{ ...T.sym, fontSize: 6.5 }}>THROUGH HOT BAT BUS</text>
          </HotBox>

          {/* ══ OBOGS unit enclosure — component placement follows Figure 1-97. Painted
                here, before the supply run, because it is background: the bleed line then
                crosses the wall as one unbroken path instead of being cut in two by the
                enclosure's fill and rejoined with a visible seam. Everything the enclosure
                holds is drawn further down. ══ */}
          <rect x={UNIT_X} y={UNIT_Y} width={UNIT_W} height={UNIT_H} rx={4}
            fill={C.unitFill} stroke={C.text} strokeWidth={1.4} />

          {/* ══ Bleed air supply run — the P3 port through the unit wall into the water
                separator, on the unit's centreline. Split at the shutoff valve, which is
                painted over the seam, because the two halves say different things.

                Color is what is in the line, animation is whether it is moving. Engine
                bleed stands at the valve whatever the levers are doing, so the upstream
                half is always blue; past a shut valve the run is empty, so it goes grey.
                Under a low pressure fault the air is still in the run and it stays blue —
                what has failed is the pressure, so both halves simply stop moving. ══ */}
          <F d={`M 16,${BLEED_Y} H 104`} v="bleed" anim={producing} />
          <F d={`M 104,${BLEED_Y} H 370`} v={systemPowered ? 'bleed' : 'ambient'} anim={producing} />
          <path d={`M 22,${BLEED_Y - 6} L 36,${BLEED_Y} L 22,${BLEED_Y + 6} Z`} fill={C.bleedLine} />

          <HotBox x={44} y={369} w={44} h={22} r={3} onClick={() => setInfoKey('p3port')}>
            <text x={66} y={376} style={{ ...T.sym, fontSize: 6 }}>L P3</text>
            <text x={66} y={385} style={{ ...T.sym, fontSize: 6 }}>PORT</text>
          </HotBox>

          <Hot x={96} y={372} w={16} h={16} r={8} onClick={() => setInfoKey('shutoffvalve')}>
            <Sov x={104} y={BLEED_Y} r={6} closed={!systemPowered} />
          </Hot>
          <Mech d="M 104,388 V 402" />
          <text x={104} y={410} style={{ ...T.mini, fontSize: 5.5 }}>SUPPLY LEVER</text>

          <Hot x={134} y={370} w={20} h={20} r={2} onClick={() => setInfoKey('heatexchanger')}>
            <HeatEx x={134} y={370} w={20} h={20} />
          </Hot>

          {/* The first drain hangs off the bottom of the heat exchanger — the cooling is
              what condenses the water — and the other two bracket the low pressure
              switch. */}
          <Hot x={136} y={390} w={16} h={22} r={2} onClick={() => setInfoKey('drains')}>
            <Drain x={144} y1={390} y2={408} />
          </Hot>
          {[228, 292].map(dx => (
            <Hot key={dx} x={dx - 8} y={BLEED_Y} w={16} h={30} r={2} onClick={() => setInfoKey('drains')}>
              <Drain x={dx} y1={BLEED_Y} y2={402} />
            </Hot>
          ))}

          <line x1={196} y1={369} x2={196} y2={BLEED_Y} stroke={C.text} strokeWidth={1} />
          <Hot x={182} y={355} w={28} h={14} r={2} onClick={() => setInfoKey('hightempswitch')}>
            <Sensor x={196} y={362} label="200°F" tripped={obogsTemp} kind="caution" />
          </Hot>

          {/* No placard inside this one — the low pressure switch has no published
              threshold to print, so the box is only as wide as a symbol needs to be. */}
          <line x1={254} y1={369} x2={254} y2={BLEED_Y} stroke={C.text} strokeWidth={1} />
          <Hot x={246} y={355} w={16} h={14} r={2} onClick={() => setInfoKey('lowpressswitch')}>
            <Sensor x={254} y={362} w={16} tripped={lowPressFail} kind="warning" />
          </Hot>

          {/* ══ OBOGS unit contents ══ */}
          <HotBox x={358} y={308} w={40} h={16} r={2} onClick={() => setInfoKey('obogsunit')}>
            <text x={378} y={316} style={{ ...T.sym, fontSize: 7, letterSpacing: '0.08em' }}>OBOGS</text>
          </HotBox>

          {/* Water separator — inside the unit, first thing the bleed air meets after it
              crosses the wall. Its drain leaves the middle of the box and runs down out
              through the unit floor. */}
          <HotBox x={370} y={358} w={18} h={44} r={2} onClick={() => setInfoKey('waterseparator')} />
          <Drain x={379} y1={402} y2={466} />

          <HotBox x={400} y={346} w={74} h={68} r={2} onClick={() => setInfoKey('pressregsov')}>
            <text x={437} y={358} style={{ ...T.sym, fontSize: 6.5 }}>PRESSURE</text>
            <text x={437} y={369} style={{ ...T.sym, fontSize: 6.5 }}>REGULATOR/</text>
            <text x={437} y={380} style={{ ...T.sym, fontSize: 6.5 }}>SHUTOFF</text>
            <text x={437} y={391} style={{ ...T.sym, fontSize: 6.5 }}>VALVE</text>
            <text x={437} y={405} style={{ ...T.mini, fontSize: 6, fill: systemPowered ? C.accent : C.muted }}>
              {systemPowered ? 'OPEN' : 'CLOSED'}
            </text>
          </HotBox>

          <HotBox x={512} y={314} w={100} h={34} r={2} onClick={() => setInfoKey('compositioncontroller')}>
            <text x={562} y={325} style={{ ...T.sym, fontSize: 6.5 }}>COMPOSITION</text>
            <text x={562} y={337} style={{ ...T.sym, fontSize: 6.5 }}>CONTROLLER</text>
          </HotBox>

          {/* The concentrator sits on the unit's centreline: the bleed air runs straight
              out of the pressure regulator/shutoff valve into it. */}
          <HotBox x={512} y={362} w={100} h={36} r={2} onClick={() => setInfoKey('concentrator')}>
            <text x={562} y={371} style={{ ...T.sym, fontSize: 6.5 }}>CONCENTRATOR</text>
            {producing
              ? concLines.map((l, i) => (
                <text key={l} x={562} y={382 + i * 9} style={{ ...T.sym, fontSize: 6, fill: C.accent }}>{l}</text>
              ))
              : <text x={562} y={386} style={{ ...T.sym, fontSize: 6, fill: C.muted }}>— — —</text>}
          </HotBox>

          {/* The monitor is a box with a readout under it, not a banner — the status line is
              what it is telling you, so it sits outside the component. The box is centred
              on its sensing line up to the composition controller. */}
          <HotBox x={443} y={432} w={110} h={20} r={2}
            fill={concFail ? C.warningTint : C.box}
            stroke={concFail ? C.warningText : C.text} sw={concFail ? 1.6 : 1}
            onClick={() => setInfoKey('monitor')}>
            <text x={498} y={442} style={{ ...T.sym, fontSize: 6.5, fill: concFail ? C.warningText : C.text }}>MONITOR</text>
          </HotBox>
          <text x={498} y={470} style={{ ...T.mini, fontSize: 5.5,
            fill: concFail ? C.warningText : C.muted }}>
            {monitorLine}
          </text>

          <Hot x={690} y={370} w={20} h={20} r={2} onClick={() => setInfoKey('nonreturnvalve')}>
            <CheckValve x={700} y={BLEED_Y} />
          </Hot>

          {/* The monitor samples the product and the composition controller acts on it,
              and the composition controller in turn acts on the concentrator. NATOPS does
              not say what either link carries, so both are plain sensing lines rather than
              claimed to be electrical. Drawn before the pipes so the bleed run crosses
              over the riser rather than appearing to break it. */}
          <F d="M 498,432 V 331 H 512" v="sense" anim={false} />
          <F d="M 562,348 V 362" v="sense" anim={false} />

          {/* Flow through the unit: one straight run along the centreline, water separator
              to concentrator to nonreturn valve, with the composition controller putting
              its product into the same manifold just short of the valve. */}
          <F d={`M 388,${BLEED_Y} H 400`} v={systemPowered ? 'bleed' : 'ambient'} anim={producing} />
          <F d={`M 474,${BLEED_Y} H 512`} v={systemPowered ? 'bleed' : 'ambient'} anim={producing} />
          {/* The product side carries oxygen only while the concentrator is making it —
              nothing is standing in these lines the way bleed air stands in the supply
              run, so they go grey rather than blue-and-still. */}
          <F d={`M 612,${BLEED_Y} H 693`} v={producing ? 'oxy' : 'ambient'} anim={producing} />
          <F d={`M 612,331 H 680 V ${BLEED_Y}`} v={producing ? 'oxy' : 'ambient'} anim={producing} />
          {/* Downstream of the nonreturn valve nothing flows unless the unit is actually
              producing — the plenum feeds the cockpits, not itself. */}
          <F d={`M 707,${BLEED_Y} H ${PLENUM_X}`} v={producing ? 'oxy' : 'ambient'} anim={producing} />

          {/* ══ Cockpit reference pressure — a sense line into the monitor, which is what
                references the delivered oxygen to cockpit pressure ══ */}
          <F d="M 6,248 V 442 H 443" v="sense" anim={false} />
          <Hot x={0} y={268} w={12} h={40} r={3} onClick={() => setInfoKey('cockpitrefpressure')} />

          {/* ══ Plenum ══ */}
          <HotBox x={PLENUM_X} y={354} w={PLENUM_W} h={52} r={4} sw={1.2} onClick={() => setInfoKey('plenum')}>
            <text x={PLENUM_CX} y={366} style={{ ...T.sym, fontSize: 7 }}>PLENUM</text>
            <Bar x={PLENUM_X + 8} y={376} w={PLENUM_W - 16} h={10} pct={plenum} color={C.oxyLine} />
            <text x={PLENUM_CX} y={396} style={{ ...T.mini, fontSize: 5 }}>
              {producing ? 'CHARGED' : plenum > 0.02 ? 'RESERVE' : 'DEPLETED'}
            </text>
          </HotBox>

          {/* ══ Warning signals. Two separate wires, as in the figure: the three OBOGS FAIL
                causes collect onto one riser on the right of the unit and enter the screen
                level with OBOGS FAIL from the left; the high temp switch has its own and
                enters level with OBOGS TEMP from the right.

                The BIT wire is drawn but never lights: an internal failure is a real third
                cause of OBOGS FAIL and belongs on the schematic, but there is nothing the
                cockpit can do to induce or clear one, so it is not a sim fault. ══ */}
          <El d={`M 254,382 V ${FAIL_Y} H 800 V 448`} live={lowPressFail} />
          <El d="M 554,448 H 800" live={concFail} />
          <El d="M 554,438 H 750 V 425" />
          <El d={`M 800,448 V 180 H 659 V ${FAIL_IN_Y} H ${EICAS_X}`} live={obogsFail} />
          <El d={`M 196,382 V ${TEMP_Y} H 860 V ${TEMP_IN_Y} H ${EICAS_R}`} live={obogsTemp} />

          {/* Each wire is named where it leaves its source, and the name takes that
              source's color when it is live. */}
          {[
            { x: 256, y: 461, w: 72, h: 14, tx: 258, ty: 469, text: 'LOW PRESSURE',      lit: lowPressFail, on: C.warningText, info: 'lowpressswitch' },
            { x: 738, y: 413, w: 24, h: 12, tx: 743, ty: 420, text: 'BIT',               lit: false,        on: C.muted,       info: 'bit' },
            { x: 718, y: 450, w: 75, h: 12, tx: 720, ty: 457, text: 'LOW PPO2 WARNING',  lit: concFail,     on: C.warningText, info: 'monitor' },
            { x: 196, y: 504, w: 76, h: 14, tx: 196, ty: 512, text: 'HIGH TEMP WARNING', lit: obogsTemp,    on: C.cautionText, info: 'hightempswitch' },
          ].map(({ x, y, w, h, tx, ty, text, lit, on, info }) => (
            <Hot key={text} x={x} y={y} w={w} h={h} r={2} onClick={() => setInfoKey(info)}>
              <text x={tx} y={ty} style={{ ...T.mini, fontSize: 6.5, textAnchor: 'start',
                fill: lit ? on : C.muted }}>{text}</text>
            </Hot>
          ))}

          {LABELS}
        </svg>
      </>)}
    </DiagramShell>
  );
}

export default T6BObogsDiagram;
