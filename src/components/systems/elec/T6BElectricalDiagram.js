import { useState, useEffect, useRef, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';
import { ELEC_VERBATIM, ELEC_NUMBERS, ELEC_EICAS, ELEC_EPS, ELEC_INFO } from './ElectricalModalData';
import { InfoModal } from '../hyds/HydraulicModalData';
import BriefingModal from '../BriefingModal';
import { THEME, DIAGRAM_FONT, WIRE_KEYFRAMES } from '../diagramTheme';

const KEYFRAMES = WIRE_KEYFRAMES + `
  @keyframes wireFlowRev { to { stroke-dashoffset:  12; } }
  @keyframes wireFlowDim { to { stroke-dashoffset:  -7; } }
  .wire-anim-rev { stroke-dasharray: 8 4; animation: wireFlowRev 0.9s linear infinite; }
  .wire-anim-dim { stroke-dasharray: 4 3; animation: wireFlowDim 0.7s linear infinite; }
  @keyframes eicasFlash  { 0%,100%{opacity:1} 25%{opacity:0.1} 50%{opacity:1} 75%{opacity:0.1} }
`;

// ── Colors: shared THEME + electrical bus colors ─────────────────────
const LOCAL = {
  hot: '#b07800', bat: '#1565c0', gen: '#b83838', avi: '#6a3db8', aux: '#007070',
  wire: THEME.wireLive,
};

const C = { ...THEME, ...LOCAL };

// ── Text style presets ───────────────────────────────────────────────
const FONT = DIAGRAM_FONT;
const T = {
  h: { fontFamily: FONT, fill: C.text,  fontSize: 9,   fontWeight: 700, textAnchor: 'middle', dominantBaseline: 'central' },
  s: { fontFamily: FONT, fill: C.muted, fontSize: 7.5, textAnchor: 'middle', dominantBaseline: 'central' },
  t: { fontFamily: FONT, fill: C.muted, fontSize: 7,   textAnchor: 'middle', dominantBaseline: 'central' },
};

// ── Clickable component box ──────────────────────────────────────────
function Box({ x, y, w, h, rx = 3, id, sel, onSel, hi, children }) {
  const active = id && sel === id;
  const color  = hi ?? C.bat;
  return (
    <g style={{ cursor: id ? 'pointer' : 'default' }} onClick={id ? () => onSel(id) : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={rx}
        fill={active ? `${color}22` : C.box}
        stroke={active ? color : C.stroke}
        strokeWidth={active ? 0.9 : 0.5} />
      {children}
    </g>
  );
}

// ── Colored bus bar ──────────────────────────────────────────────────
function Bus({ x, y, w, label, color, id, sel, onSel }) {
  const active = id && sel === id;
  return (
    <g style={{ cursor: id ? 'pointer' : 'default' }} onClick={id ? () => onSel(id) : undefined}>
      <rect x={x} y={y} width={w} height={10} rx={2} fill={color} opacity={active ? 1 : 0.88} />
      {active && <rect x={x-1} y={y-1} width={w+2} height={12} rx={2} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />}
      <text x={x + w / 2} y={y + 5}
        style={{ fontFamily: FONT, fontSize: 6.5, fontWeight: 700, fill: '#04080e',
          textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
        {label}
      </text>
    </g>
  );
}

// ── Switch — lifting arm symbol ───────────────────────────────────────
function Sw({ x, y, isOn = false, onToggle, isLive = false}) {
  const color = isOn & isLive ? C.wire : C.wireDead;
  const mid   = y + 9;
  const lc    = x + 4;
  const rc    = x + 24;
  return (
    <g style={{ cursor: 'pointer' }} onClick={onToggle}>
      <circle cx={lc} cy={mid} r={1.8} fill={color} />
      <circle cx={rc} cy={mid} r={1.8} fill={color} />
      {isOn
        ? <line x1={lc} y1={mid} x2={rc} y2={mid}   stroke={color} strokeWidth={1.2} />
        : <line x1={lc} y1={mid} x2={rc} y2={mid-9} stroke={color} strokeWidth={1.2} />
      }
    </g>
  );
}

// ── Relay — box with wire separated on both sides ─────────────────────
// OFF: wire terminates at box walls with visible internal gap
// ON:  gap bridges, box tinted live-wire color
// live: controls color/animation — defaults to isOn if not provided
function Rly({ x, y, label, isOn = false, live, onToggle }) {
  const powered = live !== undefined ? live : isOn;
  const color = powered ? C.wire : C.wireDead;
  const mid   = y + 9;
  const bx    = x, bw = 16, bh = 12; // relay box

  return (
    <g style={{ cursor: 'pointer' }} onClick={onToggle}>
      {/* Background cover — masks any wire passing behind the relay */}
      <rect x={bx - 1} y={mid - bh/2 - 1} width={bw + 2} height={bh + 2} rx={1} fill={C.bg} />
      {/* Relay box */}
      <rect x={bx} y={mid - bh/2} width={bw} height={bh} rx={1}
        fill={powered ? `${C.wire}1a` : C.box} stroke={color} strokeWidth={0.7} />
      {/* Left wire — stops at box left wall */}
      <line x1={x} y1={mid} x2={x+4} y2={mid} stroke={color} strokeWidth={1} />
      {/* Bridge line when ON */}
      {isOn && (
        <line x1={bx+4} y1={mid} x2={bx+bw-4} y2={mid} stroke={color} strokeWidth={1} />
      )}
      {!isOn && (
        <line x1={bx+4} y1={mid-3} x2={bx+bw-4} y2={mid-3} stroke={color} strokeWidth={1} />
      )}
      {/* Right wire — starts at box right wall */}
      <line x1={bx+bw-4} y1={mid} x2={bx+bw} y2={mid} stroke={color} strokeWidth={1} />
      {/* Label below */}
      <text x={x+bw/2} y={y-1}
        style={{ fontFamily: FONT, fontSize: 5.5, fill: color,
          textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.03em' }}>
        {Array.isArray(label)
          ? label.map((line, i) => <tspan key={i} x={x+bw/2} dy={i === 0 ? -(label.length - 1) * 7 : 7}>{line}</tspan>)
          : label}
      </text>
    </g>
  );
}

// ── Panel dashed outline ─────────────────────────────────────────────
function Panel({ x, y, w, h, label }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5}
        fill="none" stroke={C.stroke} strokeWidth={0.5} strokeDasharray="5 3" />
      <text x={x + w / 2} y={y - 5}
        style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted,
          textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.09em' }}>
        {label}
      </text>
    </g>
  );
}

// ── EICAS electrical display ─────────────────────────────────────────
// x,y: top-left. on=false → blank (powered off). amps/volts are numbers.
function EICASDisplay({ x, y, w = 82, h = 38, on = true, amps = 0, volts = 0 }) {
  const DG = '#ffffff'; // display green
  const sign = amps >= 0 ? '+' : '−';
  const ampsStr = `${sign}${Math.abs(Math.round(amps))} AMPS`;
  const voltsStr = `${volts.toFixed(1)} VOLTS`;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2}
        fill="#000" stroke={C.bat} strokeWidth={0.7} />
      {on && (
        <>
          <text x={x + w / 2} y={y + h * 0.36}
            style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, fill: DG,
              textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
            {ampsStr}
          </text>
          <text x={x + w / 2} y={y + h * 0.72}
            style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, fill: DG,
              textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
            {voltsStr}
          </text>
        </>
      )}
    </g>
  );
}

// ── Wire segment ─────────────────────────────────────────────────────
// d: SVG path string, e.g. "M 10 20 L 50 20 L 50 80"
// live: false → faint static grey dashes; true → animated yellow over dark pipe
function Wire({ d, live = false, reverse = false, dim = false }) {
  if (!live) {
    return <path d={d} stroke={C.stroke} strokeWidth={1.5} fill="none"
      opacity={0.5} />;
  }
  if (dim) {
    return (
      <g>
        <path d={d} stroke={C.wireDim} strokeWidth={2.5} fill="none" />
        <path d={d} fill="none" stroke={C.wireDash} strokeWidth={1}
          className="wire-anim-dim" />
      </g>
    );
  }
  return (
    <g>
      <path d={d} stroke={C.wire} strokeWidth={3.5} fill="none" />
      <path d={d} fill="none" stroke={C.wireDash} strokeWidth={1.5}
        className={reverse ? 'wire-anim-rev' : 'wire-anim'} />
    </g>
  );
}

// ── Wire crossover hop ───────────────────────────────────────────────
// Place on the wire that jumps OVER the other.
// x,y: center of the crossing point
// dir: 'h' = horizontal wire hopping (arc bulges up)
//      'v' = vertical wire hopping (arc bulges right)
// live: match to the Wire's live prop
const HopLayerContext = createContext(null);

function HopShape({ x, y, dir = 'h', live = false, dim = false, r = 5 }) {
  const color = live ? (dim ? C.wireDim : C.wire) : C.stroke;
  const opacity = live ? 1 : 0.35;
  const arc = dir === 'h'
    ? `M ${x - r} ${y} A ${r} ${r} 0 0 1 ${x + r} ${y}`
    : `M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r}`;
  return (
    <g>
      <path d={arc} fill="none" stroke={color} strokeWidth={live ? (dim ? 2.5 : 3.5) : 1.5} opacity={opacity} />
      {live && <path d={arc} fill="none" stroke={C.wireDash} strokeWidth={dim ? 1 : 1.5} />}
    </g>
  );
}

function Hop(props) {
  const hopLayer = useContext(HopLayerContext);
  const shape = <HopShape {...props} />;
  return hopLayer ? createPortal(shape, hopLayer) : shape;
}

// ── Ground symbol — x,y is the tip (top of stem) ────────────────────
function Ground({ x, y }) {
  return (
    <g>
      <line x1={x - 8} y1={y}   x2={x + 8} y2={y}   stroke={C.stroke} strokeWidth={1} />
      <line x1={x - 5.5} y1={y + 4} x2={x + 5.5} y2={y + 4} stroke={C.stroke} strokeWidth={1} />
      <line x1={x - 3} y1={y + 8} x2={x + 3} y2={y + 8} stroke={C.stroke} strokeWidth={1} />
    </g>
  );
}

// ── Circuit breaker symbol ───────────────────────────────────────────
// x,y: center of the crossing point (same as Hop).
// The arc + T lifts upward when open, leaving the terminal circles behind.
function CB({ x, y, isOpen = false, live = false, dim = false, onToggle, label, legend = false}) {
  const r        = 5;
  const lift     = isOpen ? 4 : 0;
  const arcLive  = live && !isOpen;
  const liveColor  = dim ? C.wireDim : C.wire;
  const arcColor   = legend ? C.muted : (arcLive ? liveColor : C.stroke);
  const arcOpacity = (legend || arcLive) ? 1 : 0.35;
  const arc  = `M ${x - r} ${y-2} A ${r} ${r} 0 0 1 ${x + r} ${y-2}`;
  const topY = y - r - 2;
  const tStem = 3;
  const tBar  = 6;
  const cr = 2;
  return (
    <g style={{ cursor: onToggle ? 'pointer' : 'default' }} onClick={onToggle}>
      {/* Arc + T — translate upward when open */}
      <g style={{ transform: `translateY(${-lift}px)`, transition: 'transform 0.18s ease' }}>
        {arcLive && <path d={arc} fill="none" stroke={liveColor} strokeWidth={dim ? 2.5 : 3.5} />}
        <path d={arc} fill="none" stroke={arcLive ? C.wireDash : arcColor}
          strokeWidth={dim ? 1 : 1.5} opacity={arcOpacity} />
        <line x1={x} y1={topY} x2={x} y2={topY - tStem}
          stroke={arcColor} strokeWidth={1} opacity={arcOpacity} />
        <line x1={x - tBar/2} y1={topY - tStem} x2={x + tBar/2} y2={topY - tStem}
          stroke={arcColor} strokeWidth={1} opacity={arcOpacity} />
      </g>
      {/* Solid background circles — full opacity fill to mask wires */}
      <circle cx={x - r} cy={y} r={cr} fill={C.bg} stroke="none" />
      <circle cx={x + r} cy={y} r={cr} fill={C.bg} stroke="none" />
      {/* Stroked rings on top with controlled opacity */}
      <circle cx={x - r} cy={y} r={cr} fill="none"
        stroke={arcColor} strokeWidth={0.8} strokeOpacity={arcOpacity} />
      <circle cx={x + r} cy={y} r={cr} fill="none"
        stroke={arcColor} strokeWidth={0.8} strokeOpacity={arcOpacity} />
      {/* Optional label below — string or string[] */}
      {label && (Array.isArray(label) ? label : [label]).map((line, i) => (
        <text key={i} x={x} y={y + cr + 7 + i * 7}
          style={{ fontFamily: FONT, fontSize: 5.5, fill: C.muted,
            textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
          {line}
        </text>
      ))}
    </g>
  );
}

// ── Current limiter symbol ───────────────────────────────────────────
// Placed on a vertical wire: circle → down-triangle → up-triangle → circle
function Limiter({ cx, cy, color = C.muted }) {
  const r = 2;
  const s = 9;
  const h = s * Math.sqrt(3) / 2; // ≈ 7.79
  const gap = 1.5;
  const tcY = cy - h/2 - gap - r;
  const bcY = cy + h/2 + gap + r;
  const dtY = cy - h/2 - gap;     // down-triangle base y
  const utY = cy + h/2 + gap;     // up-triangle base y
  return (
    <g>
      <circle cx={cx} cy={tcY} r={r} fill={C.bg} stroke={color} strokeWidth={0.8} />
      <polygon points={`${cx-s/2},${dtY} ${cx+s/2},${dtY} ${cx},${cy}`}
        fill={C.bg} stroke={color} strokeWidth={0.8} />
      <polygon points={`${cx-s/2},${utY} ${cx+s/2},${utY} ${cx},${cy}`}
        fill={C.bg} stroke={color} strokeWidth={0.8} />
      <circle cx={cx} cy={bcY} r={r} fill={C.bg} stroke={color} strokeWidth={0.8} />
    </g>
  );
}

// ── CB item list (1 or 2 columns) ────────────────────────────────────
function CBList({ x, y, items, cols = 2, colW = 148, rowH = 9, color, extraH = 0, live = false, id, sel, onSel }) {
  const perCol = Math.ceil(items.length / cols);
  const totalH = perCol * rowH;
  const totalW = cols * colW;
  const active = id && sel === id;
  return (
    <g style={{ cursor: id ? 'pointer' : 'default' }} onClick={id ? () => onSel(id) : undefined}>
      {color && (
        <rect x={x - 3} y={y - 2} width={totalW + 6} height={totalH + 4 + extraH} rx={2}
          fill={live ? `${color}33` : `${color}0d`} stroke={active ? color : color} strokeWidth={active ? 1 : 0.5} opacity={active ? 1 : 0.7} />
      )}
      {items.map((item, i) => {
        const col = i < perCol ? 0 : 1;
        const row = col === 0 ? i : i - perCol;
        return (
          <text key={i} x={x + col * colW + 3} y={y + row * rowH + 5}
            style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted,
              textAnchor: 'start', dominantBaseline: 'central' }}>
            {item}
          </text>
        );
      })}
    </g>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function T6BElectricalDiagram() {
  const [sel, setSel] = useState(null);
  const pick = (id) => setSel(s => s === id ? null : id);
  const [hopLayer, setHopLayer] = useState(null);
  const [briefingTab, setBriefingTab] = useState(null);
  const [extPwrInfo, setExtPwrInfo] = useState(false);
  const [extPwrConn, setExtPwrConn] = useState(false);
  const [simGenBusInop,  setSimGenBusInop]  = useState(false);
  const [simBatBusInop,  setSimBatBusInop]  = useState(false);
  const [simBusTieInop,  setSimBusTieInop]  = useState(false);
  const [simGenFail,     setSimGenFail]     = useState(false);
  const [flashingMsgs,   setFlashingMsgs]   = useState(new Set());
  const flashMsg = (label) => {
    setFlashingMsgs(s => new Set([...s, label]));
    setTimeout(() => setFlashingMsgs(s => { const n = new Set(s); n.delete(label); return n; }), 5000);
  };
  useEffect(() => { if (simGenBusInop) flashMsg('GEN BUS'); }, [simGenBusInop]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (simBatBusInop) flashMsg('BAT BUS'); }, [simBatBusInop]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (simGenFail)    flashMsg('GEN');     }, [simGenFail]);     // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (simBusTieInop) flashMsg('BUS TIE'); }, [simBusTieInop]); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS = [
    { id: 'verbatim', label: 'NATOPS Intro' },
    { id: 'numbers',  label: 'Numbers'      },
    { id: 'eicas',    label: 'EICAS'        },
    { id: 'eps',      label: 'EPs'          },
  ];

  const [sw, setSw] = useState({
    fBat: false, fGen: false, fAuxBat: false,
    fStarter: 0, fAviMstr: false, fBusTie: true,
    rGen: false, rBat: false, rStarter: 0,
    fStrAuto: false, rStrAuto: false, // relay-engaged flag set by AUTO/RESET, cleared at N1>=60
  });
  const tog    = (k) => setSw(s => ({ ...s, [k]: !s[k] }));
  const togTri = (k) => setSw(s => ({ ...s, [k]: (s[k] + 1) % 3 }));
  // Starter toggle: sets auto-engage flag when going to AUTO/RESET, clears it otherwise
  const togStarter = (k) => setSw(s => {
    const next = (s[k] + 1) % 3;
    const autoKey = k === 'fStarter' ? 'fStrAuto' : 'rStrAuto';
    // Second AUTO/RESET press while auto-start is in progress → abort, clear the flag
    if (next === 1 && s[autoKey]) return { ...s, [k]: next, [autoKey]: false };
    return { ...s, [k]: next, [autoKey]: next === 1 && n1 < 50 };
  });
  // Battery switches are mutually exclusive — turning one on turns the other off
  const togBat = (k) => setSw(s => s[k]
    ? { ...s, [k]: false }
    : { ...s, fBat: k === 'fBat', rBat: k === 'rBat' });
  // GEN can only turn ON when STR RLY is open (neither starter in MANUAL) and N1 > 50
  const togGen = (k) => setSw(s => {
    if (s[k]) return { ...s, [k]: false };                          // always allow OFF
    const strActive = s.fStarter === 2 || s.rStarter === 2;
    if (strActive || n1 <= 50) return s;                            // block ON
    return { ...s, fGen: k === 'fGen', rGen: k === 'rGen' }; // mutual exclusion
  });

  const [rly, setRly] = useState({ busRly: false, extRly: false });
  const togRly = (k) => setRly(s => ({ ...s, [k]: !s[k] }));

  // Derived relay states
  const batRlyOn  = sw.fBat || sw.rBat;
  const batRlyOnRear  = sw.rBat;
  const strRlyOn  = sw.fStarter === 2 || sw.rStarter === 2 || sw.fStrAuto || sw.rStrAuto;
  const genRlyOn  = (sw.fGen  || sw.rGen) & !strRlyOn;
  // EP sim overrides — applied to power-flow derivations only, not switch/relay display state
  const effStrRlyOn = strRlyOn || simGenFail;
  const effGenRlyOn = (sw.fGen || sw.rGen) & !effStrRlyOn;
  const effBusTie   = sw.fBusTie && !simBusTieInop;
  // Battery wire direction: flows OUT of battery when bat-only; INTO battery when gen or ext pwr is charging
  const extPwrActive  = extPwrConn && batRlyOn;
  const batIsCharging = extPwrActive || (effGenRlyOn && effBusTie);
  const batWireLive   = true;//batRlyOn || batIsCharging;
  // The battery→BAT RLY path runs right-to-left (toward battery).
  // Forward animation = charging; reversed animation = battery sourcing.
  const batWireReverse = !batIsCharging;
  const [cb, setCb] = useState({ fwdBatAux: false, fwdAvi: false, extPwr: false });
  const togCb = (k) => setCb(s => ({ ...s, [k]: !s[k] }));

  // AUX BAT switches flip when fAuxBat is on (SW1 defaults true, SW2 defaults false)
  const auxSw1On  = !sw.fAuxBat;
  const auxSw2On  =  sw.fAuxBat;

  // Bus liveness — used for CBList backgrounds
  const fwdBatBusLive  = !simBatBusInop && (batRlyOn || (effBusTie && effGenRlyOn));
  const fwdGenBusLive  = !simGenBusInop && (effGenRlyOn || (effBusTie && batRlyOn));
  const fwdAviBatLive  = (sw.fAviMstr && fwdBatBusLive) || (cb.fwdAvi && fwdBatBusLive);
  const fwdAviGenLive  = (sw.fAviMstr && fwdGenBusLive) || (cb.fwdAvi && fwdGenBusLive);
  const auxBatBusLive  = (auxSw2On & !cb.fwdBatAux) || (auxSw1On & fwdBatBusLive);

  // EICAS electrical display
  const eicasOn = fwdBatBusLive || fwdAviGenLive;
  const [eicasAmps,  setEicasAmps]  = useState(0);
  const [eicasVolts, setEicasVolts] = useState(24);
  const eicasRef = useRef({ amps: 0, volts: 24, tAmps: 0, tVolts: 24 });
  useEffect(() => {
    const r = eicasRef.current;
    const newTarget = () => {
      r.tAmps  = batIsCharging ? -1 + Math.random() * 11 : -(15 + Math.random() * 10);
      r.tVolts = batIsCharging ? 28 + Math.random() * 0.5 : 23.2 + Math.random() * 0.7;
    };
    newTarget();
    const wobbleId = setInterval(newTarget, 20000);
    const lerpId   = setInterval(() => {
      r.amps  += (r.tAmps  - r.amps)  * 0.12;
      r.volts += (r.tVolts - r.volts) * 0.12;
      setEicasAmps(r.amps);
      setEicasVolts(r.volts);
    }, 50);
    return () => { clearInterval(wobbleId); clearInterval(lerpId); };
  }, [batIsCharging]); // eslint-disable-line react-hooks/exhaustive-deps
  const [n1, setN1] = useState(0);  // starter/generator N1 %
  const n1Ref = useRef(0);
  n1Ref.current = n1;

  // Ramp N1 linearly to 60% over 20s while bat relay and starter relay are both closed
  useEffect(() => {
    if (!batRlyOn || (!strRlyOn & n1Ref.current < 50) || n1Ref.current >= 60) return;
    const RATE = 60 / (20 * 1000); // % per ms
    const startTime = Date.now();
    const startN1   = n1Ref.current;
    const id = setInterval(() => {
      const next = Math.min(startN1 + RATE * (Date.now() - startTime), 60);
      setN1(next);
      if (next >= 60) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [batRlyOn, strRlyOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // AUTO/RESET spring-back: return to NORM after 1 second
  useEffect(() => {
    if (sw.fStarter !== 1) return;
    const id = setTimeout(() => setSw(s => s.fStarter === 1 ? { ...s, fStarter: 0 } : s), 1000);
    return () => clearTimeout(id);
  }, [sw.fStarter]);
  useEffect(() => {
    if (sw.rStarter !== 1) return;
    const id = setTimeout(() => setSw(s => s.rStarter === 1 ? { ...s, rStarter: 0 } : s), 1000);
    return () => clearTimeout(id);
  }, [sw.rStarter]);

  // Decay N1 rapidly to 0 if battery is turned off or starter relay drops before N1 reaches 50%
  const n1ShouldDecay = n1 > 0 && (!batRlyOn || (!strRlyOn && n1 < 50));
  useEffect(() => {
    if (!n1ShouldDecay) return;
    const DECAY_RATE = 60 / (4 * 1000); // drop from 60% to 0 in ~4s
    const startTime = Date.now();
    const startN1 = n1Ref.current;
    const id = setInterval(() => {
      const next = Math.max(startN1 - DECAY_RATE * (Date.now() - startTime), 0);
      setN1(next);
      if (next <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [n1ShouldDecay]); // eslint-disable-line react-hooks/exhaustive-deps

  // AUTO/RESET: open relay once N1 reaches 60% by clearing the auto-engage flags; MANUAL unaffected
  const n1AtThreshold = n1 >= 50;
  useEffect(() => {
    if (!n1AtThreshold) return;
    setSw(s => ({ ...s, fStrAuto: false, rStrAuto: false }));
  }, [n1AtThreshold]);

  // Layout constants
  const MY = 22;    // main bus wire Y-center
  const CW = 60; // column width
  const RY = 270; // relay box top Y (16px tall, centered on MY)
  const LY = 180; // heigh of hot bat bus
  const LX = 115, LW = 120; // left panel X + width
  const RX = 555, RW = 120; // right panel X + width

  return (
    <div style={{ background: C.bg, width: '100%', minHeight: '100vh' }}>
      <div style={{
        background: C.bg, borderRadius: 8, padding: 12,
        fontFamily: FONT, color: C.text,
        minWidth: 340, maxWidth: 900, margin: '0 auto',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>

          {/* LEFT — briefing tabs (2×2 grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, maxWidth: 'calc(50% - 4px)', minWidth: 0 }}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setBriefingTab(t => t === id ? null : id)}
                style={{
                  background: briefingTab === id ? C.accent : C.box,
                  border: `1px solid ${briefingTab === id ? C.accent : C.stroke}`,
                  color: briefingTab === id ? '#ffffff' : C.accent,
                  padding: '7px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'sans-serif', fontWeight: 600,
                  transition: 'all 0.15s',
                  minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* RIGHT — EP fault sims */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxWidth: 'calc(50% - 4px)', minWidth: 0 }}>
            {[
              { active: simGenBusInop, set: setSimGenBusInop, label: 'Gen Bus Inop', bg: C.simWarnBg, border: C.simWarnBorder, tc: C.simWarnText },
              { active: simBatBusInop, set: setSimBatBusInop, label: 'Bat Bus Inop', bg: C.simWarnBg, border: C.simWarnBorder, tc: C.simWarnText },
              { active: simBusTieInop, set: setSimBusTieInop, label: 'Bus Tie Inop', bg: C.simCautBg, border: C.simCautBorder, tc: C.simCautText },
              { active: simGenFail,    set: setSimGenFail,    label: 'Gen Failure',  bg: C.simWarnBg, border: C.simWarnBorder, tc: C.simWarnText },
            ].map(({ active, set, label, bg, border, tc }) => (
              <button key={label} onClick={() => set(v => !v)} style={{
                background: active ? bg : C.box,
                border: `1px solid ${active ? border : C.stroke}`,
                color: active ? tc : C.muted,
                padding: '7px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                fontFamily: 'sans-serif', fontWeight: 600,
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {`Sim ${label}`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Attribution ── */}
        <div style={{ textAlign: 'center', margin: '6px 0', fontSize: 9, letterSpacing: '0.12em', color: C.muted }}>
          IMAGES &amp; COMPONENT DESCRIPTIONS SOURCED FROM{' '}
          <span style={{ color: C.text, fontWeight: 700, letterSpacing: '0.14em' }}>T6BDRIVER.COM</span>
        </div>

        {/* ── SVG Schematic ── */}
        {briefingTab && (
          <BriefingModal tab={briefingTab} onClose={() => setBriefingTab(null)}
            verbatim={ELEC_VERBATIM} numbers={ELEC_NUMBERS} eicas={ELEC_EICAS} eps={ELEC_EPS}
            sortMemoryFirst conditionalSteps />
        )}
        {extPwrInfo && ELEC_INFO['extpwr'] && (
          <InfoModal
            title={ELEC_INFO['extpwr'].title}
            items={ELEC_INFO['extpwr'].items}
            photos={ELEC_INFO['extpwr'].photos ?? []}
            onClose={() => setExtPwrInfo(false)}
            theme={C}
          />
        )}
        {sel && ELEC_INFO[sel] && (
          <InfoModal
            title={ELEC_INFO[sel].title}
            items={ELEC_INFO[sel].items}
            photos={ELEC_INFO[sel].photos ?? []}
            onClose={() => setSel(null)}
            theme={C}
          />
        )}
        <style>{KEYFRAMES}</style>
        <HopLayerContext.Provider value={hopLayer}>
        <svg viewBox="0 0 760 730" width="100%" style={{ display: 'block' }}>

          {/* ═══════════════════════════════════════════════════════════
              TOP ROW — Power Sources
          ═══════════════════════════════════════════════════════════ */}

          {/* EXT PWR Connect/Disconnect button — to the left of the pill */}
          {(() => {
            const active = extPwrConn;
            const color = active ? C.wire : C.muted;
            const bx = 5, by = 13, bw = 38, bh = 18;
            return (
              <g style={{ cursor: 'pointer' }} onClick={() => setExtPwrConn(v => !v)}>
                <rect x={bx} y={by} width={bw} height={bh} rx={2}
                  fill={active ? `${C.wire}22` : 'transparent'}
                  stroke={active ? C.wire : C.stroke} strokeWidth={0.6} />
                <text x={bx + bw / 2} y={by + 6}
                  style={{ fontFamily: FONT, fontSize: 5.5, fontWeight: 700, fill: color,
                    textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
                  {active ? 'UNPLUG' : 'PLUG IN'}
                </text>
                <text x={bx + bw / 2} y={by + 13}
                  style={{ fontFamily: FONT, fontSize: 5.5, fontWeight: 700, fill: color,
                    textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
                  EXT PWR
                </text>
              </g>
            );
          })()}

          {/* EXT PWR source — horizontal pill with 3 terminal circles */}
          {(() => {
            const px = 50, py = 14, pw = 40, ph = 16, pr = 8;
            const cy = py + ph / 2;
            const cr = 4;
            const [cx1, cx2, cx3] = [px + 8, px + 20, px + 32];
            const active = extPwrConn;
            return (
              <g style={{ cursor: 'pointer' }} onClick={() => setExtPwrInfo(true)}>
                {/* Pill body */}
                <rect x={px} y={py} width={pw} height={ph} rx={pr}
                  fill={active ? `${C.wire}18` : C.box}
                  stroke={active ? C.wire : C.stroke} strokeWidth={active ? 0.9 : 0.5} />
                {/* Terminal circles */}
                {[cx1, cx2, cx3].map((cx, i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={cr}
                      fill={active ? `${C.wire}22` : C.boxAlt}
                      stroke={active ? C.wire : C.stroke} strokeWidth={0.7} />
                    <text x={cx} y={cy}
                      style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700,
                        fill: active ? C.wire : C.muted,
                        textAnchor: 'middle', dominantBaseline: 'central' }}>
                      {i === 0 ? '−' : '+'}
                    </text>
                  </g>
                ))}
                {/* Status label above */}
                <text x={px + pw / 2} y={py - 5}
                  style={{ fontFamily: FONT, fontSize: 6, fontWeight: 700,
                    fill: active ? C.wire : C.stroke,
                    textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.07em' }}>
                  {active ? 'CONNECTED' : 'DISCONNECTED'}
                </text>
                {/* Label */}
                <text x={px + pw / 2} y={py + ph + 16}
                  style={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, fill: active ? C.wire : C.muted,
                    textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.08em' }}>
                  EXT PWR
                </text>
              </g>
            );
          })()}
          {/* Wires from EXT PWER */}
          <Wire d={`M 90 22 272 22`} live={extPwrActive} />
          <Rly x={272} y={13} label={['EXT PWR', 'RLY']} isOn={batRlyOn} live={extPwrActive}/>
          <Wire d={`M 288 22 325 22 L 325 78`} live={extPwrActive} />
          <Wire d={`M 70 30 70 40 L ${155-5} 40`} live={extPwrActive} dim/>
          <CB x={155} y={40} isOpen={cb.extPwr} onToggle={() => togCb('extPwr')} label={['EXT', 'PWR']}  live={extPwrActive} dim/>
          <Wire d={`M ${155+7} 40 L 280 40`} live={extPwrActive} dim/>
          {/* Voltage Sense — overlays wire after EXT PWR CB */}
          {(() => {
            const vx = 210, vy = 40;
            const rw = 22, rh = 5;
            const live = extPwrActive && !cb.extPwr;
            const col = live ? C.wire : C.muted;
            return (
              <g>
                <rect x={vx - rw / 2} y={vy - rh / 2} width={rw} height={rh}
                  fill={C.bg} stroke={col} strokeWidth={0.6} opacity={live ? 1 : 1} />
                <text x={vx} y={vy + rh / 2 + 6}
                  style={{ fontFamily: FONT, fontSize: 5.5, fill: col, opacity: live ? 1 : 0.45,
                    textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.07em' }}>
                  VOLTAGE SENSE
                </text>
              </g>
            );
          })()}

          {/* Battery 42Ah */}
          {/* Ground wire: up from − terminal, left, down to ground symbol */}
          <Wire d={`M 236 ${LY-104} L 236 ${LY-110} L 211 ${LY-110} L 211 ${LY-100}`} />
          <Ground x={211} y={LY-100} />
          <circle cx={236} cy={LY-102} r={2} fill="none" stroke={C.stroke} strokeWidth={0.5} />
          <circle cx={259} cy={LY-102} r={2} fill="none" stroke={C.stroke} strokeWidth={0.5} />
          <Box x={230} y={LY-100} w={35} h={20} id="battery" sel={sel} onSel={pick} hi={C.bat}>
            <text x={234} y={LY-93} style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'start' }}>-</text>
            <text x={257} y={LY-93} style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'start' }}>+</text>
            <text x={248} y={LY-72} style={T.h}>BATTERY</text>
            <text x={248} y={LY-62} style={{ ...T.s, fill: C.bat }}>42Ah</text>
          </Box>

          {/* Starter / Generator */}
          <Wire d={`M 660 ${LY-77} L 660 ${LY-61}`} />
          <Ground x={660} y={LY-61} />
          <g style={{ cursor: 'pointer' }} onClick={() => pick('strgen')}>
            <circle cx={660} cy={LY-102} r={25}
              fill={sel === 'strgen' ? `${C.gen}22` : C.box}
              stroke={sel === 'strgen' ? C.gen : C.stroke}
              strokeWidth={sel === 'strgen' ? 0.9 : 0.5} />
            {/* Top terminal (12 o'clock) */}
            <circle cx={660} cy={LY-129} r={2} fill="none" stroke={C.stroke} strokeWidth={0.5} />
            {/* 9 o'clock terminal */}
            <circle cx={633} cy={LY-102} r={2} fill="none" stroke={C.stroke} strokeWidth={0.5} />
            {/* N1 display */}
            <text x={660} y={LY-108}
              style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700,
                fill: C.text, textAnchor: 'middle', dominantBaseline: 'central' }}>
              {Math.round(n1)}
            </text>
            <text x={660} y={LY-98} style={T.h}>%</text>
            <text x={660} y={LY-90} style={T.h}>N1</text>
            <text x={660} y={LY-44} style={T.h}>STARTER/</text>
            <text x={660} y={LY-32} style={T.h}>GENERATOR</text>
            <text x={673} y={LY-132} style={T.h}>STR</text>
            <text x={625} y={LY-95} style={T.h}>GEN</text>
            <text x={660} y={LY-23} style={{ ...T.s, fill: C.gen }}>(300A)</text>
          </g>
          {/* Quick Start / Quick Shutdown button */}
          {(() => {
            const isRunning = n1 > 0;
            const color = isRunning ? C.gen : C.bat;
            const bx = 693, by = LY - 113, bw = 40, bh = 20;
            return (
              <g style={{ cursor: 'pointer' }} onClick={() => setN1(isRunning ? 0 : 60)}>
                <rect x={bx} y={by} width={bw} height={bh} rx={2}
                  fill={`${color}22`} stroke={color} strokeWidth={0.6} />
                <text x={bx + bw / 2} y={by + 6}
                  style={{ fontFamily: FONT, fontSize: 5.5, fontWeight: 700, fill: color,
                    textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.05em' }}>
                  QUICK
                </text>
                <text x={bx + bw / 2} y={by + 14}
                  style={{ fontFamily: FONT, fontSize: 5.5, fontWeight: 700, fill: color,
                    textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.05em' }}>
                  {isRunning ? 'STOP' : 'START'}
                </text>
              </g>
            );
          })()}

          {/* SHUNT TO STARTER GENERATOR*/}
          <Wire d={`M 325 78 381 22 L 580 22`} live={batRlyOn} dim={!strRlyOn} />
          <Rly x={580} y={13} label={['STR', 'RLY']} isOn={strRlyOn} live={batRlyOn && strRlyOn} />
          <Wire d={`M 600 22 L 660 22 L 660 49`} live={batRlyOn && strRlyOn} />
          {/* STARTER RELAY TO STARTER SWITCH*/}
          <Wire d={`M 440 197 420 197 L 420 268 L ${464-5} 268`} live = {strRlyOn && (sw.fStrAuto || sw.fStarter !=0)}/>
          <Hop x={464} y={268} dir="h" live = {strRlyOn && (sw.fStrAuto || sw.fStarter !=0)}/>
          <Wire d={`M ${464+5} 268 L ${499-5} 268`} live = {strRlyOn && (sw.fStrAuto || sw.fStarter !=0)}/>
          <Hop x={499} y={268} dir="h" live = {strRlyOn && (sw.fStrAuto || sw.fStarter !=0)}/>
          <Wire d={`M ${499+5} 268 L ${545-5} 268`} live = {strRlyOn && (sw.fStrAuto || sw.fStarter !=0)}/>
          <Hop x={545} y={268} dir="h" live = {strRlyOn && (sw.fStrAuto || sw.fStarter !=0)}/>
          <Wire d={`M ${545+5} 268 L 588 268 L 588 245`} live = {strRlyOn && (sw.fStrAuto || sw.fStarter !=0)}/>
          <Wire d={`M 588 245 L 588 28`} live = {strRlyOn}/>
          {/* STARTER RELAY TO REAR STARTER SWITCH*/}
          <Wire d={`M 600 245 589 245`} live = {strRlyOn && (sw.rStrAuto || sw.rStarter !=0)}/>

          {/* ═══════════════════════════════════════════════════════════
              MAIN BUS WIRE  (horizontal, y=MY)
          ═══════════════════════════════════════════════════════════ */}
          <Wire d={`M 631 ${LY-102} ${588+5} ${LY-102}`}  live={n1AtThreshold && !effStrRlyOn}/>
          <Hop x={588} y={LY-102} dir="h"  live={n1AtThreshold && !effStrRlyOn}/>
          <Wire d={`M ${588-5} ${LY-102} 536 ${LY-102}`}  live={n1AtThreshold && !effStrRlyOn}/>
          <Wire d={`M 520 ${LY-102} 390 ${LY-102}`} live={effGenRlyOn} />
          <Wire d={`M 390 ${LY-102} 386 ${LY-102}`} live={effBusTie && batRlyOn || effGenRlyOn} reverse={!effGenRlyOn}  />
          <Wire d={`M 370 ${LY-102} 325 ${LY-102}`} live={batRlyOn || (effBusTie && effGenRlyOn)}  reverse={!effGenRlyOn || !effBusTie}  />
          <Wire d={`M 325 ${LY-102} 316 ${LY-102}`} live={batRlyOn || (effBusTie && effGenRlyOn)} reverse={batWireReverse}/>
          <Wire d={`M 300 ${LY-102} 290 ${LY-102}`} live={batRlyOn || (effBusTie && effGenRlyOn)} reverse={batWireReverse}/>
          <Wire d={`M 290 ${LY-102} ${280+5} ${LY-102}`} live={batWireLive} reverse={batWireReverse} />
          <Hop x={280} y={LY-102} dir="h" live={batWireLive} />
          <Wire d={`M ${280-5} ${LY-102} 262 ${LY-102}`} live={batWireLive} reverse={batWireReverse} />
          <Rly x={300} y={LY-111} label={['BAT', 'RLY']} isOn={batRlyOn} />
          <Rly x={370} y={LY-111} label={['BUS', 'TIE', 'RLY']} isOn={sw.fBusTie} live={effBusTie && batRlyOn} onToggle={() => pick('bustierly')} />
          <Rly x={520} y={LY-111} label={['GEN', 'RLY']} isOn={genRlyOn} live={n1AtThreshold && !effStrRlyOn && effGenRlyOn}/>
          {/* BUS TIE TO BAT BUS*/}
          <Wire d={`M 366 ${LY-102} 366 ${LY+99} L 235 ${LY+99}`} live={fwdBatBusLive} />
          {/* BUS TIE TO BUS TIE SWITCH*/}
          <Wire d={`M 499 260 L 499 285 L ${464+5} 285`} live={sw.fBusTie} dim />
          <Hop x={464} y={285} dir="h" live={sw.fBusTie} dim />
          <Wire d={`M ${464-5} 285 L ${405+5} 285`} live={sw.fBusTie} dim />
          <Hop x={405} y={285} dir="h" live={sw.fBusTie} dim />
          <Wire d={`M ${405-5} 285 L ${390+5} 285`} live={sw.fBusTie} dim />
          <Hop x={390} y={285} dir="h" live={sw.fBusTie} dim />
          <Wire d={`M ${390-5} 285 L 378 285 L 378 ${LY-96}`} live={sw.fBusTie} dim />
          {/* BUS TIE TO GEN BUS*/}
          <Wire d={`M 390 ${LY-102} 390 ${RY+67} L ${405-5} ${RY+67}`} live={fwdGenBusLive}  />
          <Hop x={405} y={RY+67} dir="h"  live={fwdGenBusLive}/>
          <Wire d={`M ${405+5} ${RY+67} L ${464-5} ${RY+67}`}  live={fwdGenBusLive}/>
          <Hop x={464} y={RY+67} dir="h"  live={fwdGenBusLive}/>
          <Wire d={`M ${464+5} ${RY+67} L 555 ${RY+67}`}  live={fwdGenBusLive}/>
          {/* SHUNT TO EICAS*/}
          <Wire d={`M 346 ${LY-102} 346 ${LY-50} L ${290+5} ${LY-50}`}  live={batRlyOn || (effBusTie && effGenRlyOn)}/>
          <Hop x={290} y={LY-50} dir="h"  live={batRlyOn || (effBusTie && effGenRlyOn)}/>
          <Wire d={`M ${290-5} ${LY-50} L 150 ${LY-50}`} live={batRlyOn || (effBusTie && effGenRlyOn)}/>
          <EICASDisplay x={68} y={LY-50-19} on={eicasOn} amps={eicasAmps} volts={eicasVolts} />
          {/* EICAS-style EP warning messages below display — only when display is powered */}
          {(fwdAviGenLive || fwdAviBatLive || fwdBatBusLive) && [
            simGenBusInop && { label: 'GEN BUS', color: C.eicasWarning },
            simBatBusInop && { label: 'BAT BUS', color: C.eicasWarning },
            simGenFail    && { label: 'GEN',     color: C.eicasWarning },
            simBusTieInop && { label: 'BUS TIE', color: C.eicasCaution },
          ].filter(Boolean).map((msg, i) => (
            <text key={msg.label} x={90} y={LY - 25 + i * 10}
              style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, fill: msg.color,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.12em',
                animation: flashingMsgs.has(msg.label) ? 'eicasFlash 1.333s ease-in-out 3' : 'none' }}>
              {msg.label}
            </text>
          ))}

          {/* ═══════════════════════════════════════════════════════════
              HOT BAT BUS  (direct from battery, always live)
          ═══════════════════════════════════════════════════════════ */}
          {/* Tap from battery left terminal down to HOT BAT BUS */}
          <Bus x={LX} y={LY+11} w={LW} label="HOT BAT BUS" color={C.hot} id="hotbatbus" sel={sel} onSel={pick} />
          <CBList x={LX} y={LY+25} cols={2} colW={CW} color={C.hot} live={true} id="hotbatbus" sel={sel} onSel={pick} items={[
            'RAM AIR VALVE', 'CLOCKS', 'ELT', 'BATTERY',
            'OBOGS', 'EMERG FLAPS', 'FWD MAINT', 'SPARE',
          ]} />
          <Wire d={`M 290 ${LY-102} 290 ${LY+16} L ${LX+LW} ${LY+16}`} live={true} />

          {/* ═══════════════════════════════════════════════════════════
              FRONT LH CB PANEL
          ═══════════════════════════════════════════════════════════ */}
          <Panel x={LX-5} y={LY+90} w={LW+10} h={243} label="FRONT LH CB PANEL" />

          {/* FWD BAT BUS — drop from main bus */}
          <Bus x={LX} y={LY+94} w={LW} label="FWD BAT BUS" color={C.bat} id="fwdbatbus" sel={sel} onSel={pick} />
          {/* Left column (col 0) + Right column (col 1) CB items */}
          <CBList x={LX} y={LY+107} cols={2} colW={CW} color={C.bat} extraH={9} live={fwdBatBusLive} id="fwdbatbus" sel={sel} onSel={pick} items={[
            'AIL/EL TRIM', 'IAC 1', 'AVI MSTR', 'HYD SYS', 'COLL', 'START', 'FDR',
            'LDGGR CONT', 'PMU', 'FLAP CONT', 'BOOST PUMP', 'EDM', 'AUDIO',
            'UTIL', 'IGN', 'PROP SYS', 'FUEL QTY LO', 'FLDT', 'UFCP',
            'INST', 'OIL TRX', 'AOA', 'LDG', 'BAT SW', 'INFLOW SYS', 'RH MFD',
          ]} />
          {/* AFT BAT label box — bottom-left of FWD BAT BUS CBList */}
          <g>
            <rect x={LX-3} y={LY+225} width={44} height={10} rx={2}
              fill={C.box} stroke={C.bat} strokeWidth={0.6} />
            <text x={LX+19} y={LY+230}
              style={{ fontFamily: FONT, fontSize: 6, fontWeight: 700, fill: C.bat,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
              AFT BAT
            </text>
          </g>
          {/* 26 items × rowH=9: 13 rows × 9 = 117px → items end y≈282 */}

          {/* Wire: FLDT (FWD BAT BUS col-1 row-4) → FWD AVI BAT BUS header */}
          <Wire d={`M ${LX+LW+3} ${LY+148} ${267-5} ${LY+148}`} live={fwdBatBusLive} />
          <Wire d={`M ${267+5} ${LY+148} ${LX+LW+60} ${LY+148}`} live={fwdBatBusLive} />
          <CB x={267} y={LY+148} live={fwdBatBusLive} isOpen={cb.fwdAvi} onToggle={() => togCb('fwdAvi')} label={['FWD','AVI']}/>
          <Wire d={`M ${LX+LW+75} ${LY+148} ${LX+LW+80} ${LY+148} L ${LX+LW+80} ${LY+245} L ${LX+LW} ${LY+245}`} live={fwdAviBatLive}/>
          <Rly x={LX + 180} y={LY+139} label={['AVI', 'MSTR', 'RLY']} isOn={sw.fAviMstr||cb.fwdAvi} live={fwdAviBatLive} onToggle={() => pick('avimstrrly')} />

          {/* FWD AVI BAT BUS */}
          <Bus x={LX} y={LY+240} w={LW} label="FWD AVI BAT BUS" color={C.avi} id="fwdavibatbus" sel={sel} onSel={pick} />
          <CBList x={LX} y={LY+253} cols={1} colW={CW*2} color={C.avi} extraH={9} live={fwdAviBatLive} id="fwdavibatbus" sel={sel} onSel={pick} items={['CTR MFD']} />
          {/* AFT AVI label box*/}
          <g>
            <rect x={LX-3} y={LY+263} width={44} height={10} rx={2}
              fill={C.box} stroke={C.avi} strokeWidth={0.6} />
            <text x={LX+19} y={LY+268}
              style={{ fontFamily: FONT, fontSize: 6, fontWeight: 700, fill: C.avi,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
              AFT AVI
            </text>
          </g>

          {/* FWD AUX BAT BUS */}
          <Bus x={LX} y={LY+278} w={LW} label="FWD AUX BAT BUS" color={C.aux} id="fwdauxbatbus" sel={sel} onSel={pick} />
          <CBList x={LX} y={LY+291} cols={2} colW={CW} color={C.aux} live={auxBatBusLive} id="fwdauxbatbus" sel={sel} onSel={pick} items={[
            'RADIO RLYS', 'STBY INST', 'COM2', 'FIRE 1', 'IRS', '','',''
          ]} />
          {/* STBYLTS and AFT STBY label boxes*/}
          <g>
            <rect x={LX+LW-41} y={LY+308} width={44} height={10} rx={2}
              fill={C.box} stroke={C.aux} strokeWidth={0.6} />
            <text x={LX+LW-19} y={LY+313}
              style={{ fontFamily: FONT, fontSize: 6, fontWeight: 700, fill: C.aux,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
              STBY LTS
            </text>
            <rect x={LX+LW-41} y={LY+318} width={44} height={10} rx={2}
              fill={C.box} stroke={C.aux} strokeWidth={0.6} />
            <text x={LX+LW-19} y={LY+323}
              style={{ fontFamily: FONT, fontSize: 6, fontWeight: 700, fill: C.aux,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
              AFT STBY
            </text>
          </g>
          {/* Wire: AFT STBY → AFT AUX BAT BUS header (outside right) */}
          <Wire d={`M ${LX+LW+3} ${LY+323} L ${LX+LW+30} ${LY+323} L ${LX+LW+30} ${LY+401} L ${LX+LW} ${LY+401}`} live={auxBatBusLive}/>

          {/* ═══════════════════════════════════════════════════════════
              AFT LH CB PANEL
          ═══════════════════════════════════════════════════════════ */}
          <Panel x={LX-5} y={LY+348} w={LW+10} h={100} label="AFT LH CB PANEL" />

          {/* Wire: AFT BAT box → AFT BAT BUS — split at hop over AFT AVI wire */}
          <Wire d={`M ${LX-3} ${LY+229} L ${LX-20} ${LY+229} L ${LX-20} ${LY+357} L ${LX-12-5} ${LY+357}`} live={fwdBatBusLive}/>
          <Hop x={LX-12} y={LY+357} dir="h" live={fwdBatBusLive}/>
          <Wire d={`M ${LX-12+5} ${LY+357} L ${LX} ${LY+357}`} live={fwdBatBusLive}/>

          {/* AFT BAT BUS */}
          <Bus x={LX} y={LY+352} w={LW} label="AFT BAT BUS" color={C.bat} id="aftbatbus" sel={sel} onSel={pick} />
          <CBList x={LX} y={LY+365} cols={2} colW={CW} color={C.bat} live={fwdBatBusLive} id="aftbatbus" sel={sel} onSel={pick} items={[
            'UFCP', 'AUDIO', 'UTIL LT',
            'INST LT', 'FLDT', 'RH MFD',
          ]} />

          {/* AFT AUX BAT BUS */}
          {/* Vertical feed from FWD AUX BAT BUS */}
          <Bus x={LX} y={LY+396} w={LW} label="AFT AUX BAT BUS" color={C.aux} id="aftauxbatbus" sel={sel} onSel={pick} />
          <CBList x={LX} y={LY+409} cols={1} colW={CW*2} color={C.aux} live={auxBatBusLive} id="aftauxbatbus" sel={sel} onSel={pick} items={['STBY INST']} />

          {/* Wire: AFT AVI box → AFT AVI BAT BUS (outside left) */}
          <Wire d={`M ${LX-3} ${LY+268} L ${LX-12} ${LY+268} L ${LX-12} ${LY+426} L ${LX} ${LY+426}`}  live={fwdAviBatLive}/>

          {/* AFT AVI BAT BUS */}
          {/* Vertical feed from FWD AVI BAT BUS */}
          <Bus x={LX} y={LY+421} w={LW} label="AFT AVI BAT BUS" color={C.avi} id="aftavibatbus" sel={sel} onSel={pick} />
          <CBList x={LX} y={LY+434} cols={1} colW={CW*2} color={C.avi} live={fwdAviBatLive} id="aftavibatbus" sel={sel} onSel={pick} items={['CTR MFD']} />

          {/* ═══════════════════════════════════════════════════════════
              COCKPIT SWITCH PANELS
          ═══════════════════════════════════════════════════════════ */}
          {(() => {
            const r = 10;
            const SLV_ON  = { fill: C.accent, stroke: C.accentDeep, text: '#ffffff' };
            const SLV_OFF = { fill: C.boxAlt, stroke: C.stroke, text: C.muted };

            const cBtn = (cx, cy, label, isOn, key, labelAbove = false, states = ['OFF', 'ON'], onToggle = () => tog(key)) => {
              const s = isOn ? SLV_ON : SLV_OFF;
              return (
                <g key={key} style={{ cursor: 'pointer' }} onClick={onToggle}>
                  {labelAbove && (
                    <text x={cx} y={cy - r - 5}
                      style={{ fontFamily: FONT, fontSize: 5.5, fill: C.muted,
                        textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
                      {label}
                    </text>
                  )}
                  <circle cx={cx} cy={cy} r={r} fill={s.fill} stroke={s.stroke} strokeWidth={0.9} />
                  <text x={cx} y={cy}
                    style={{ fontFamily: FONT, fontSize: 5.5, fontWeight: 700, fill: s.text,
                      textAnchor: 'middle', dominantBaseline: 'central' }}>
                    {isOn ? states[1] : states[0]}
                  </text>
                  {!labelAbove && (
                    <text x={cx} y={cy + r + 6}
                      style={{ fontFamily: FONT, fontSize: 5.5, fill: C.muted,
                        textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
                      {label}
                    </text>
                  )}
                </g>
              );
            };

            // 3-state button: 0=NORM, 1=AUTO/RESET, 2=MANUAL
            const STARTER_LABELS = ['NORM', 'AUTO/RESET', 'MANUAL'];
            const triBtn = (cx, cy, label, val, key, labelAbove = false, onToggle = () => togTri(key)) => {
              const active = val !== 0;
              const s = active ? SLV_ON : SLV_OFF;
              return (
                <g key={key} style={{ cursor: 'pointer' }} onClick={onToggle}>
                  {labelAbove && (
                    <text x={cx} y={cy - r - 5}
                      style={{ fontFamily: FONT, fontSize: 5.5, fill: C.muted,
                        textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
                      {label}
                    </text>
                  )}
                  <circle cx={cx} cy={cy} r={r} fill={s.fill} stroke={s.stroke} strokeWidth={0.9} />
                  {STARTER_LABELS[val].split('/').map((part, i, arr) => (
                    <text key={i} x={cx} y={cy + (i - (arr.length - 1) / 2) * 5}
                      style={{ fontFamily: FONT, fontSize: 4.5, fontWeight: 700, fill: s.text,
                        textAnchor: 'middle', dominantBaseline: 'central' }}>
                      {part}
                    </text>
                  ))}
                  {!labelAbove && (
                    <text x={cx} y={cy + r + 6}
                      style={{ fontFamily: FONT, fontSize: 5.5, fill: C.muted,
                        textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
                      {label}
                    </text>
                  )}
                </g>
              );
            };

            const sBtn = (x, y, w, h, label, isOn, key) => {
              const s = isOn ? SLV_ON : SLV_OFF;
              return (
                <g key={key} style={{ cursor: 'pointer' }} onClick={() => tog(key)}>
                  {label.split(' ').map((word, i, arr) => (
                    <text key={i} x={x + w / 2} y={y - 5 - (arr.length - 1 - i) * 7}
                      style={{ fontFamily: FONT, fontSize: 5.5, fill: C.muted,
                        textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em' }}>
                      {word}
                    </text>
                  ))}
                  <rect x={x} y={y} width={w} height={h} rx={2}
                    fill={s.fill} stroke={s.stroke} strokeWidth={0.9} />
                  <text x={x + w / 2} y={y + h / 2}
                    style={{ fontFamily: FONT, fontSize: 5.5, fontWeight: 700, fill: s.text,
                      textAnchor: 'middle', dominantBaseline: 'central' }}>
                    {isOn ? 'ON' : 'OFF'}
                  </text>
                </g>
              );
            };

            const FX = 440, FY = 125, FW = 120, FH = 135;
            const fL = FX + 14; // left-align start

            const RCX = 600, RCY = 170, RCW = 85, RCH = 90;
            const rcL = RCX + 14;

            const sp = 35; // spacing between button centers
            const row1Y = FY + 33;
            const row2Y = FY + 72;
            const row3Y = FY + 113;

            return (
              <g>
                {/* FRONT COCKPIT */}
                <rect x={FX} y={FY} width={FW} height={FH} rx={4}
                  fill="none" stroke={C.stroke} strokeWidth={0.7} />
                <text x={FX + 7} y={FY + 10}
                  style={{ fontFamily: FONT, fontSize: 7, fill: C.muted,
                    textAnchor: 'start', dominantBaseline: 'central', letterSpacing: '0.1em' }}>
                  FRONT COCKPIT
                </text>

                {/* Row 1: BAT, GEN, AUX BAT — left-aligned, label below */}
                {cBtn(fL + r,        row1Y, 'BATT',     sw.fBat,     'fBat', false, ['OFF','ON'], () => togBat('fBat'))}
                {cBtn(fL + r + sp,   row1Y, 'GEN',     sw.fGen,     'fGen', false, ['OFF','ON'], () => togGen('fGen'))}
                {cBtn(fL + r + sp*2, row1Y, 'AUX BAT', sw.fAuxBat,  'fAuxBat', true)}

                {/* Row 2: STARTER — left-aligned, label above */}
                {triBtn(fL + r, row2Y, 'STARTER', sw.fStarter, 'fStarter', true, () => togStarter('fStarter'))}

                {/* Row 3: AVIONICS MASTER (square) + BUS TIE (circle) — left-aligned, labels above */}
                {sBtn(fL, row3Y - 8, 20, 20, 'AVIONICS MASTER', sw.fAviMstr, 'fAviMstr')}
                {cBtn(fL + r + sp, row3Y, 'BUS TIE', sw.fBusTie, 'fBusTie', true, ['OPEN', 'NORM'])}

                {/* REAR COCKPIT */}
                <rect x={RCX} y={RCY} width={RCW} height={RCH} rx={4}
                  fill="none" stroke={C.stroke} strokeWidth={0.7} />
                <text x={RCX + 7} y={RCY + 10}
                  style={{ fontFamily: FONT, fontSize: 7, fill: C.muted,
                    textAnchor: 'start', dominantBaseline: 'central', letterSpacing: '0.1em' }}>
                  REAR COCKPIT
                </text>

                {/* Row 1: GEN, BAT — left-aligned, label below */}
                {cBtn(rcL + r, row1Y-FY+RCY, 'BATT', sw.rBat, 'rBat', false, ['OFF','ON'], () => togBat('rBat'))}
                {cBtn(rcL + r + sp,     row1Y-FY+RCY, 'GEN', sw.rGen, 'rGen', false, ['OFF','ON'], () => togGen('rGen'))}

                {/* Row 2: STARTER — left-aligned, label above */}
                {triBtn(rcL + r, row2Y-FY+RCY, 'STARTER', sw.rStarter, 'rStarter', true, () => togStarter('rStarter'))}
              </g>
            );
          })()}

          {/* Wire: AVIONICS MASTER switch → horizontal bus → both AVI MSTR relays */}
          {/* Stem: down from switch bottom center */}
          <Wire d={`M 464 260 L 464 ${LY+210}`} live={sw.fAviMstr} dim/>
          {/* Horizontal bus below both relays */}
          <Wire d={`M ${LX+LW+80-5} ${LY+210} L ${LX+188} ${LY+210}`} live={sw.fAviMstr} dim/>
          <Hop x={LX+LW+80} y={LY+210} dir="h" live={sw.fAviMstr} dim/>
          <Wire d={`M 400 ${LY+210} L ${LX+LW+80+5} ${LY+210}`} live={sw.fAviMstr} dim/>
          <Hop x={405} y={LY+210} dir="h" live={sw.fAviMstr} dim/>
          <Wire d={`M 464 ${LY+210} L 410 ${LY+210}`} live={sw.fAviMstr} dim/>
          <Wire d={`M 464 ${LY+210} L 472 ${LY+210}`} live={sw.fAviMstr} dim/>
          <Hop x={477} y={LY+210} dir="h" live={sw.fAviMstr} dim/>
          <Wire d={`M ${477+5} ${LY+210} L ${RX-50-5} ${LY+210}`} live={sw.fAviMstr} dim/>
          <Hop x={RX-50} y={LY+210} dir="h" live={sw.fAviMstr} dim/>
          <Wire d={`M ${RX-50+5} ${LY+210} L ${RX-35} ${LY+210}`} live={sw.fAviMstr} dim/>
          {/* Up into AVI MSTR relay left terminal */}
          <Wire d={`M ${LX+188} ${LY+210} L ${LX+188} ${LY+154}`} live={sw.fAviMstr} dim/>
          {/* Up into GEN AVI relay left terminal */}
          <Wire d={`M ${RX-35} ${LY+210} L ${RX-35} ${RY+113}`} live={sw.fAviMstr} dim/>
          {/* BATT SWITCH TO EXT PWR RLY */}
          <Wire d={`M 463 125 463 100 `} live={batRlyOn & !batRlyOnRear} dim/>
          <Wire d={`M 463 100 L ${390+5} 100`} live={batRlyOn} dim/>
          <Hop x={390} y={100} dir="h" live={batRlyOn} dim/>
          <Wire d={`M ${390-5} 100 L ${378+5} 100`} live={batRlyOn} dim/>
          <Hop x={378} y={100} dir="h" live={batRlyOn} dim/>
          <Wire d={`M ${378-5} 100 L ${366+5} 100`} live={batRlyOn} dim/>
          <Hop x={366} y={100} dir="h" live={batRlyOn} dim/>
          <Wire d={`M ${366-5} 100 L ${346+5} 100`} live={batRlyOn} dim/>
          <Hop x={346} y={100} dir="h" live={batRlyOn} dim/>
          <Wire d={`M ${346-5} 100 L ${290+5} 100`} live={batRlyOn} dim/>
          <Wire d={`M 308 100 L 308 85`} live={batRlyOn} dim/>
          <Hop x={290} y={100} dir="h" live={batRlyOn} dim/>
          <Wire d={`M ${290-5} 100 L 280 100 L 280 28`} live={batRlyOn} dim/>
          <Wire d={`M 623 170 623 100 L ${588+5} 100`} live={batRlyOnRear} dim/>
          <Hop x={588} y={100} dir="h" live={batRlyOnRear} dim/>
          <Wire d={`M ${588-5} 100 L ${575+5} 100`} live={batRlyOnRear} dim/>
          <Hop x={575} y={100} dir="h" live={batRlyOnRear} dim/>
          <Wire d={`M ${575-5} 100 L ${528+5} 100`} live={batRlyOnRear} dim/>
          <Hop x={528} y={100} dir="h" live={batRlyOnRear} dim/>
          <Wire d={`M ${528-5} 100 L 463 100`} live={batRlyOnRear} dim/>
          {/* GEN SWITCH TO GEN RLY */}
          <Wire d={`M 499 125 499 110 L 528 110`} live={effGenRlyOn && sw.fGen}  dim/>
          <Wire d={`M 528 110 L 528 85`} live={effGenRlyOn}  dim/>
          <Wire d={`M 660 170 660 165 L 630 165 L 630 110 L ${623+5} 110`} live={effGenRlyOn && sw.rGen}  dim/>
          <Hop x={623} y={110} dir="h" live={effGenRlyOn && sw.rGen}  dim/>
          <Wire d={`M ${623-5} 110 L ${588+5} 110`} live={effGenRlyOn && sw.rGen}  dim/>
          <Hop x={588} y={110} dir="h" live={effGenRlyOn && sw.rGen}  dim/>
          <Wire d={`M ${588-5} 110 L ${575+5} 110`} live={effGenRlyOn && sw.rGen}  dim/>
          <Hop x={575} y={110} dir="h" live={effGenRlyOn && sw.rGen}  dim/>
          <Wire d={`M ${575-5} 110 L 528 110`} live={effGenRlyOn && sw.rGen}  dim/>
          {/* AUX BAT SWITCH TO AUX BAT RLY */}
          <Wire d={`M 535 125 535 120 L ${499+5} 120`} live={sw.fAuxBat} dim/>
          <Hop x={499} y={120} dir="h" live={sw.fAuxBat} dim/>
          <Wire d={`M ${499-5} 120 L ${463+5} 120`} live={sw.fAuxBat} dim/>
          <Hop x={463} y={120} dir="h" live={sw.fAuxBat} dim/>
          <Wire d={`M ${463-5} 120 L 405 120 L 405 ${RY+240} L 354 ${RY+240} L 354 ${RY+234}`} live={sw.fAuxBat} dim/>

          {/* ═══════════════════════════════════════════════════════════
              GEN BUS  (above / outside FRONT RH CB PANEL) id="genbus"
          ═══════════════════════════════════════════════════════════ */}
          {/* Drop from after GEN RLY → GEN BUS */}
          <Bus x={RX} y={RY} w={RW} label="GEN BUS" color={C.gen} sel={sel} onSel={pick} />
          <CBList x={RX} y={RY+13} cols={2} colW={CW} color={C.gen} live={n1AtThreshold && !effStrRlyOn && !simGenBusInop} sel={sel} onSel={pick} items={[
            'COND BLOWER', 'HEAT EXCH BLOWER', 'BUS SENSE'
          ]} />
          <Wire d={`M 575 ${LY-102} 575 ${RY-8} L ${RX-10} ${RY-8} L ${RX-10} ${RY+5} L ${RX} ${RY+5}`} live={n1AtThreshold && !effStrRlyOn && !simGenBusInop} />

          {/* ═══════════════════════════════════════════════════════════
              FRONT RH CB PANEL
          ═══════════════════════════════════════════════════════════ */}
          <Panel x={RX-5} y={RY+58} w={RW+10} h={205} label="FRONT RH CB PANEL" />
      

          {/* FWD GEN BUS (RH) — same bus, separate drop from main */}
          <Bus x={RX} y={RY+62} w={RW} label="FWD GEN BUS" color={C.gen} id="fwdgenbus" sel={sel} onSel={pick} />
          <CBList x={RX} y={RY+75} cols={2} colW={CW} color={C.gen} live={fwdGenBusLive} id="fwdgenbus" sel={sel} onSel={pick} items={[
            'AIR COND', 'FUEL BAL', 'TEST', 'CKPT TEMP', 'SIDE', "TRIM IND", 'NAV', 'EDM', 'TAD', 'SPEED BRAKE', 'EVAP BLWR', 'TAXI',
            'GEN SW', 'AOA HT', 'PITOT HT', 'NWS', 'FIRE 2', 'SEAT ADJ','DVR/DTS', 'HOTAS', 'TAT', 'AUDIO', '', '',
          ]} />
          {/* AFT GEN label box*/}
          <g>
            <rect x={RX+RW-41} y={RY+175} width={44} height={10} rx={2}
              fill={C.box} stroke={C.gen} strokeWidth={0.6} />
            <text x={RX+RW-19} y={RY+180}
              style={{ fontFamily: FONT, fontSize: 6, fontWeight: 700, fill: C.gen,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
              AFT GEN
            </text>
          </g>
          {/* 20 items, 10/col, rowH=9 → items end y≈233 */}

          {/* Wire: just below TEST (FWD GEN BUS col-0 row-3) → FWD AVI GEN BUS header */}
          <Wire d={`M ${RX-3} ${RY+107} L ${541+5} ${RY+107}`} live={fwdGenBusLive} />
          <Wire d={`M ${541-5} ${RY+107} L ${RX-26} ${RY+107}`} live={fwdGenBusLive} />
          <CB x={541} y={RY+107} live={fwdGenBusLive} isOpen={cb.fwdAvi} onToggle={() => togCb('fwdAvi')} label={['FWD','AVI']}/>
          <Rly x={RX-43} y={RY+98} label={['AVI', 'MSTR', 'RLY']} isOn={sw.fAviMstr||cb.fwdAvi} onToggle={() => pick('avimstrrly')} />
          <Wire d={`M ${RX-44} ${RY+107} L ${RX-50} ${RY+107} L ${RX-50} ${RY+195} L ${RX} ${RY+195}`}  live={fwdAviGenLive}/>

          {/* FWD AVI GEN BUS — fed from GEN BUS */}
          <Bus x={RX} y={RY+190} w={RW} label="FWD AVI GEN BUS" color={C.avi} id="fwdavigenbus" sel={sel} onSel={pick} />
          <CBList x={RX} y={RY+204} cols={2} colW={CW} color={C.avi} live={fwdAviGenLive} id="fwdavigenbus" sel={sel} onSel={pick} items={[
            'ADC', 'COM1', 'IRS', 'RAD ALTM', 'DME', 'XPDR',
            'TCAS', 'IAC 2', 'RADIO RLYS', 'LH MFD', 'VHF NAV',
          ]} />
          {/* AFT AVI label box*/}
          <g>
            <rect x={RX+RW-41} y={RY+250} width={44} height={10} rx={2}
              fill={C.box} stroke={C.avi} strokeWidth={0.6} />
            <text x={RX+RW-19} y={RY+255}
              style={{ fontFamily: FONT, fontSize: 6, fontWeight: 700, fill: C.avi,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.06em' }}>
              AFT AVI
            </text>
          </g>
          {/* 10 items, 5/col, rowH=9 → items end y≈330 */}

          {/* ═══════════════════════════════════════════════════════════
              AFT RH CB PANEL
          ═══════════════════════════════════════════════════════════ */}
          <Panel x={RX-5} y={RY+276} w={RW+10} h={77} label="AFT RH CB PANEL" />

          {/* Wire: AFT GEN box → AFT GEN BUS (outside right, inner column) — split at hop */}
          <Wire d={`M ${RX+RW+3} ${RY+180} L ${RX+RW+18} ${RY+180} L ${RX+RW+18} ${RY+285} L ${RX+RW+15} ${RY+285}`}  live={fwdGenBusLive} />
          <Wire d={`M ${RX+RW+5} ${RY+285} L ${RX+RW} ${RY+285}`} live={fwdGenBusLive} />

          {/* AFT GEN BUS */}
          <Bus x={RX} y={RY+280} w={RW} label="AFT GEN BUS" color={C.gen} id="aftgenbus" sel={sel} onSel={pick} />
          <CBList x={RX} y={RY+292} cols={2} colW={CW} color={C.gen} live={fwdGenBusLive} id="aftgenbus" sel={sel} onSel={pick} items={[
            'EVAP BLWR', 'SEAT ADJ', 'TRIM IND', 'SIDE LTS', 'AUDIO',
          ]} />

          {/* Wire: AFT AVI box → AFT AVI GEN BUS (outside right, outer column) */}
          <Wire d={`M ${RX+RW+3} ${RY+255} L ${RX+RW+10} ${RY+255} L ${RX+RW+10} ${RY+330} L ${RX+RW} ${RY+330}`}   live={fwdAviGenLive}/>
          {/* Hop: AFT GEN wire jumps over AFT AVI wire at their crossing */}
          <Hop x={RX+RW+10} y={RY+285} dir="h" live={fwdGenBusLive} />

          {/* AFT AVI GEN BUS */}
          <Bus x={RX} y={RY+325} w={RW} label="AFT AVI GEN BUS" color={C.avi} id="aftavigenbus" sel={sel} onSel={pick} />
          <CBList x={RX} y={RY+338} cols={1} colW={CW*2} color={C.avi} live={fwdAviGenLive} id="aftavigenbus" sel={sel} onSel={pick} items={['LH MFD']} />

          {/* ═══════════════════════════════════════════════════════════
              CENTER — AUX BAT (5Ah) + AVI MSTR feed
          ═══════════════════════════════════════════════════════════ */}

          <Wire d={`M 454 ${RY+196} L 454 ${RY+186} L 432 ${RY+186} L 432 ${RY+200}`} />
          <Ground x={432} y={RY+200} />
          <circle cx={454} cy={RY+198} r={2} fill="none" stroke={C.stroke} strokeWidth={0.5} />
          <circle cx={477} cy={RY+198} r={2} fill="none" stroke={C.stroke} strokeWidth={0.5} />
          <Box x={448} y={RY+200} w={35} h={20} id="auxbat" sel={sel} onSel={pick} hi={C.aux}>
            <text x={452} y={RY+207} style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'start' }}>-</text>
            <text x={475} y={RY+207} style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'start' }}>+</text>
            <text x={466} y={RY+228} style={T.h}>AUX BAT</text>
            <text x={466} y={RY+239} style={{ ...T.s, fill: C.aux }}>(5Ah)</text>
          </Box>
          {/* Two switches to the left of AUX BAT, vertically stacked */}
          <Sw x={340} y={RY+173} label="SW 1" isOn={auxSw1On} />
          <Sw x={340} y={RY+201} label="SW 2" isOn={auxSw2On} />
          {/* Relay for switches — closes when AUX BAT is on */}
          <Rly x={346} y={RY+220} isOn={sw.fAuxBat} />
          {/* Mechanical linkage dashed line — relay to switches */}
          <line x1={354} y1={RY+182} x2={354} y2={RY+220}
            stroke={C.muted} strokeWidth={0.7} strokeDasharray="2 3" opacity={0.6} />
          {/* Wires from switches to buses*/}
          <Wire d={`M 342 ${RY+210}  332 ${RY+210}`} live = {auxSw2On & !cb.fwdBatAux}/>
          <Wire d={`M 332 ${RY+210} L 320 ${RY+210} L 320 ${LY+283} L ${LX+LW} ${LY+283}`} live = {auxBatBusLive}/>
          <Wire d={`M 342 ${RY+182} L 332 ${RY+182} L 332 ${RY+210}`} live = {auxSw1On && fwdBatBusLive}/>
          <Wire d={`M ${LX+LW+3} ${RY+135} L ${LX+LW+75} ${RY+135}`} live = {fwdBatBusLive}/>
          <Hop x={LX+LW+80} y={RY+135} dir="h"  live = {fwdBatBusLive}/>
          <Wire d={`M ${LX+LW+85} ${RY+135} L 364 ${RY+135} L 364 ${RY+180}`}  live = {fwdBatBusLive}/>

          {/* Wire: AUX BAT + circle → STBY LTS (45° up-right, then down, then left) */}
          <Wire d={`M 478 ${RY+196} L ${478+18} ${RY+178} L ${478+18} ${LY+335} L ${LX+LW+45} ${LY+335} L ${LX+LW+45} ${LY+313} L ${LX+LW+3} ${LY+313}`} live={true}/>
          {/* Wire: AUX BAT + circle → Switch */}
          <Wire d={`M 476 ${RY+196} L 458 ${RY+178} L ${438+5} ${RY+178}`} live={true} />
          <Wire d={`M ${438-5} ${RY+178} L ${478-60} ${RY+178} L ${478-60} ${RY+210} L 410 ${RY+210}`} live={!cb.fwdBatAux} />
          <CB x={438} y={RY+178} live={true} isOpen={cb.fwdBatAux} onToggle={() => togCb('fwdBatAux')} label={['AUX', 'BAT']} />
          <Hop x={405} y={RY+210} dir="h" live={!cb.fwdBatAux} />
          <Wire d={`M 400 ${RY+210} L 364 ${RY+210}`} live={!cb.fwdBatAux} />
          <Wire d={`M ${478-60} ${RY+210} L ${478-60} ${RY+229} L 410 ${RY+229}`} live={!cb.fwdBatAux} dim/>
          <Hop x={405} y={RY+229} dir="h" live={!cb.fwdBatAux} dim/>
          <Wire d={`M 400 ${RY+229} L 362 ${RY+229}`} live={!cb.fwdBatAux} dim/>
          {/* Wire: FWD BAT BUS (LDG row height) → AUX BAT + circle */}
          <Wire d={`M ${LX+LW+3} ${LY+193} L ${268-5} ${LY+193}`} live={fwdBatBusLive && !cb.fwdBatAux} />
          <Wire d={`M ${268+5} ${LY+193} L ${LX+188-5} ${LY+193}`} live={fwdBatBusLive && !cb.fwdBatAux} />
          <CB x={268} y={LY+193} live={fwdBatBusLive} label={['AUX', 'BAT']} isOpen={cb.fwdBatAux} onToggle={() => togCb('fwdBatAux')} />
          <Hop x={LX+188} y={LY+193} dir="h"  live={fwdBatBusLive && !cb.fwdBatAux}/>
          <Wire d={`M ${LX+188+5} ${LY+193} L ${LX+LW+80-5} ${LY+193}`}  live={fwdBatBusLive && !cb.fwdBatAux}/>
          <Hop x={LX+LW+80} y={LY+193} dir="h"  live={fwdBatBusLive && !cb.fwdBatAux}/>
          <Wire d={`M ${LX+LW+80+5} ${LY+193} L ${405-5} ${LY+193}`}  live={fwdBatBusLive && !cb.fwdBatAux}/>
          <Hop x={405} y={LY+193} dir="h"  live={fwdBatBusLive && !cb.fwdBatAux}/>
          <Wire d={`M ${405+5} ${LY+193} L ${464-5} ${LY+193}`}  live={fwdBatBusLive && !cb.fwdBatAux}/>
          <Hop x={464} y={LY+193} dir="h"  live={fwdBatBusLive && !cb.fwdBatAux}/>
          <Wire d={`M ${464+5} ${LY+193} L 477 ${LY+193} L 477 ${RY+196}`}  live={fwdBatBusLive && !cb.fwdBatAux}/>

          {/* Limiter symbols — drawn last to overlay wires */}
          <Limiter cx={366} cy={LY+0} />
          <Limiter cx={390} cy={LY+0} />

          {/* ── EP Failure overlays ── */}
          {simGenBusInop  && <RedX cx={RX + RW/2} cy={RY + 129}     size={85} />}
          {simBatBusInop  && <RedX cx={LX + LW/2} cy={LY + 170}    size={85} />}
          {simBusTieInop  && <RedX cx={378}        cy={LY - 102}    size={10} />}
          {simGenFail     && <RedX cx={660}         cy={LY - 102}   size={30} />}
          {/* Shunt symbol — overlays EICAS horizontal wire */}
          <Shunt cx={346} cy={LY-102} />

          {/* ── MFD screenshot ── */}
          <image href="/systems/elec/MFDs.png" x={250} y={550} width={310} height={89}
            preserveAspectRatio="xMidYMid meet"
            style={{ cursor: 'pointer' }} onClick={() => pick('MFD')} />
          {!fwdAviGenLive && <rect x={307}       y={560} width={53} height={70} fill="black" />}
          {!fwdAviBatLive && <rect x={307 + 72} y={560} width={53} height={70} fill="black" />}
          {!fwdBatBusLive && <rect x={307 + 143} y={560} width={53} height={70} fill="black" />}

          {/* ── Bottom Legend ── */}
          <g transform="translate(0, +5)">
            <rect x={330} y={645} width={150} height={75} rx={4}
              fill={C.box} stroke={C.stroke} strokeWidth={0.5} />
            <text x={400} y={652}
              style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted,
                textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.09em' }}>
              LEGEND
            </text>
            <line x1={330} y1={659} x2={480} y2={659} stroke={C.stroke} strokeWidth={0.4} />

            {/* ── Column 1: Circuit Breaker, Relay, Ground ── */}
            <g style={{ pointerEvents: 'none', cursor: 'default' }}>
              <CB x={345} y={672} legend={true}/>
            </g>
            <text x={355} y={668}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted,
                textAnchor: 'start', dominantBaseline: 'central', letterSpacing: '0.05em' }}>
              CIRCUIT BREAKER
            </text>

            <g style={{ pointerEvents: 'none', cursor: 'default' }}>
              <Rly x={338} y={680} label="" />
            </g>
            <text x={357} y={688}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted,
                textAnchor: 'start', dominantBaseline: 'central', letterSpacing: '0.05em' }}>
              RELAY
            </text>

            <Ground x={347} y={702} />
            <text x={358} y={706}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted,
                textAnchor: 'start', dominantBaseline: 'central', letterSpacing: '0.05em' }}>
              GROUND
            </text>

            {/* ── Column 2: Limiter, Switch ── */}
            <Limiter cx={430} cy={670} />
            <text x={440} y={670}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted,
                textAnchor: 'start', dominantBaseline: 'central', letterSpacing: '0.05em' }}>
              LIMITERS
            </text>

            <g style={{ pointerEvents: 'none', cursor: 'default' }}>
              <Sw x={410} y={690} />
            </g>
            <text x={441} y={695}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted,
                textAnchor: 'start', dominantBaseline: 'central', letterSpacing: '0.05em' }}>
              SWITCH
            </text>
          </g>

          {/* Hop layer — always painted last so hops sit on top of all wires */}
          <g ref={setHopLayer} />
        </svg>
        </HopLayerContext.Provider>
      </div>
    </div>
  );
}

// ── Shunt symbol ─────────────────────────────────────────────────────
// Horizontal: [+□]──[thin rect]──[□−]  with "SHUNT" label above
function Shunt({ cx, cy, color = C.muted }) {
  const sqS  = 6;     // square side
  const rectW = 8;   // skinny middle rectangle width
  const rectH = 4;    // skinny middle rectangle height
  const gap  = 0;     // gap between elements
  const lsX  = cx - rectW / 2 - gap - sqS;  // left square left edge
  const rsX  = cx + rectW / 2 + gap;         // right square left edge
  return (
    <g>
      <text x={cx} y={cy - sqS / 2 - 5}
        style={{ fontFamily: FONT, fontSize: 6, fill: color,
          textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.1em' }}>
        SHUNT
      </text>
      {/* Left terminal square with + */}
      <rect x={lsX} y={cy - sqS / 2} width={sqS} height={sqS}
        fill={C.bg} stroke={color} strokeWidth={0.6} />
      <text x={lsX + sqS / 2} y={cy}
        style={{ fontFamily: FONT, fontSize: 8, fill: color,
          textAnchor: 'middle', dominantBaseline: 'central' }}>
        +
      </text>
      {/* Middle skinny rectangle */}
      <rect x={cx - rectW / 2} y={cy - rectH / 2} width={rectW} height={rectH}
        fill={C.bg} stroke={color} strokeWidth={0.6} />
      {/* Right terminal square with − */}
      <rect x={rsX} y={cy - sqS / 2} width={sqS} height={sqS}
        fill={C.bg} stroke={color} strokeWidth={0.6} />
      <text x={rsX + sqS / 2} y={cy}
        style={{ fontFamily: FONT, fontSize: 8, fill: color,
          textAnchor: 'middle', dominantBaseline: 'central' }}>
        −
      </text>
    </g>
  );
}

// ── Red X failure overlay ─────────────────────────────────────────────
function RedX({ cx, cy, size = 14 }) {
  const h = size / 2;
  return (
    <g opacity={0.55}>
      <line x1={cx - h} y1={cy - h} x2={cx + h} y2={cy + h} stroke={C.warningText} strokeWidth={2} strokeLinecap="round" />
      <line x1={cx + h} y1={cy - h} x2={cx - h} y2={cy + h} stroke={C.warningText} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}
