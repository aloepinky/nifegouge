import { useState, useRef, useEffect } from "react";
import { PropBriefingModal, PROP_INFO } from './PropModalData';
import { InfoModal } from '../hyds/HydraulicModalData';

const FONT = "'Courier New', monospace";

const WIRE_KEYFRAMES = `
  @keyframes wireFlow { to { stroke-dashoffset: -12; } }
  .wire-anim { stroke-dasharray: 8 4; animation: wireFlow 0.9s linear infinite; }
`;

const C = {
  bg:          '#080f18',
  text:        '#c8d8e8',
  muted:       '#6a8a9a',
  stroke:      '#2e3e52',
  hubBorder:   '#28405a',
  metal:       '#6a7a8a',
  metalMid:    '#4a5a6a',
  metalLight:  '#9aaaba',
  metalDark:   '#2a3a4a',
  spring:      '#b89820',
  oilMid:      '#2a70d0',
  oilLight:    '#5090e8',
  bladeEdge:   '#6a8aaa',
  counterEdge: '#8a9aaa',
  accent:      '#c8a820',
  fine:        '#38bc78',
};

// Zigzag spring path from (x0, y) rightward for totalWidth
function springPath(x0, y, totalWidth, coils = 8, amp = 10) {
  if (totalWidth < 5) return `M ${x0} ${y} L ${x0 + totalWidth} ${y}`;
  const cap = 4;
  const cw = (totalWidth - 2 * cap) / coils;
  let d = `M ${x0} ${y} L ${x0 + cap} ${y}`;
  for (let i = 0; i < coils; i++) {
    const xm = (x0 + cap + i * cw + cw / 2).toFixed(1);
    const xr = (x0 + cap + (i + 1) * cw).toFixed(1);
    const ya = i % 2 === 0 ? y - amp : y + amp;
    d += ` L ${xm} ${ya} L ${xr} ${y}`;
  }
  return d + ` L ${x0 + totalWidth} ${y}`;
}

// ── Layout constants ─────────────────────────────────────────────────────────
const HX = 330, HY = 268;        // blade root bore centre / rotation pivot
const Rr  = 38;                   // blade root bore radius
const HUB = { x: 279, y: 183, w: 100, h: 180 };
const CYL = { x: 382, y: 234, w: 170, h: 70  };
const SR  = 534;                  // spring fixed right-end x
const PISTON_LEFT_SPEED = 0.3; // max piston fraction moved left per frame (~5-6s full travel at 60fps)

// ── Feather reference vectors (all blade geometry defined at oil = 0) ────────
//
// Feather = blade at 86° from horizontal (piston axis).
// 86° CCW from the right-pointing piston axis → direction (-cos86°, -sin86°) in SVG (y-down).
const A86  = 4 * Math.PI / 180;
const fdx  = -Math.cos(A86);     // ≈ -0.0698  (slight leftward)
const fdy  = -Math.sin(A86);     // ≈ -0.9976  (strongly upward in SVG)

// Counterweight direction: 50° CW from blade (upper-right at feather)
const A50  = 85 * Math.PI / 180;
const rCW = 65
const cdx  = rCW * Math.cos(A50);  // ≈ 0.720
const cdy  = rCW * Math.sin(A50);  // ≈ -0.695


// Counterweight polygon points (feather frame, constant):
// True rectangle: long axis = pdx/pdy (perpendicular to blade diameter),
//                short axis = fdx/fdy (along blade diameter).
// Centre placed at cdx/cdy * 65 from hub — outside the bore in the cw direction.
const CW_CX = HX - cdx + 5, CW_CY = HY + cdy;
const wCW = 18; //CW width
const hCW = 110;
const diagCW = Math.sqrt(wCW*wCW+hCW*hCW)/2;
const angCW = A50-Math.atan(wCW/hCW);
const xCW = Math.cos(angCW)*diagCW;
const yCW = Math.sin(angCW)*diagCW;
const cwPts = [
  [CW_CX + xCW, CW_CY - yCW],
  [CW_CX + xCW-wCW*Math.sin(A50), CW_CY - yCW + wCW*Math.cos(A50)],
  [CW_CX + xCW-wCW*Math.sin(A50)-hCW*Math.cos(A50), CW_CY - yCW + wCW*Math.cos(A50)-hCW*Math.sin(A50)],
  [CW_CX + xCW-hCW*Math.cos(A50), CW_CY - yCW-hCW*Math.sin(A50)],
].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// SVG rotation to align airfoil polygon x-axis with blade span direction (fdx/fdy).
// Airfoil polygon: x = span (root→tip), y = thickness (upper/lower surface).
// Raw polygon bbox: x 59→12654 (chord=12594.8), y −1299→+620 (thickness=1919.4).
// Scale 0.01191 maps chord to 150 SVG px; y-flip puts camber on leading-edge side.
const bladeRotDeg = Math.atan2(fdy, fdx) * 180 / Math.PI;  // ≈ −94°

// ── Circuit breaker symbol (horizontal wire) ─────────────────────────
// x,y: centre of the CB crossing point. live: upstream power. isOpen: tripped.
function PropCB({ x, y, live, isOpen = false, onToggle, label }) {
  const r        = 5;
  const cr       = 2;
  const lift     = isOpen ? 4 : 0;
  const arcLive  = live && !isOpen;
  const color    = arcLive ? '#c8c830' : '#3a5060';
  const op       = arcLive ? 1 : 0.35;
  const arc      = `M ${x - r} ${y - 2} A ${r} ${r} 0 0 1 ${x + r} ${y - 2}`;
  const topY     = y - r - 2;
  return (
    <g style={{ cursor: onToggle ? 'pointer' : 'default' }} onClick={onToggle}>
      <g style={{ transform: `translateY(${-lift}px)`, transition: 'transform 0.18s ease' }}>
        {arcLive && <path d={arc} fill="none" stroke="#1e2e3e" strokeWidth={3.5} />}
        <path d={arc} fill="none" stroke={color} strokeWidth={1.5} opacity={op} />
        <line x1={x} y1={topY} x2={x} y2={topY - 3} stroke={color} strokeWidth={1} opacity={op} />
        <line x1={x - 3} y1={topY - 3} x2={x + 3} y2={topY - 3} stroke={color} strokeWidth={1} opacity={op} />
      </g>
      <circle cx={x - r} cy={y} r={cr} fill="#080f18" stroke={color} strokeWidth={0.8} strokeOpacity={op} />
      <circle cx={x + r} cy={y} r={cr} fill="#080f18" stroke={color} strokeWidth={0.8} strokeOpacity={op} />
      {label && (Array.isArray(label) ? label : [label]).map((line, i) => (
        <text key={i} x={x} y={y + cr + 7 + i * 7}
          style={{ fontFamily: FONT, fontSize: 5.5, fill: '#6a8a9a',
            textAnchor: 'middle', dominantBaseline: 'central', letterSpacing: '0.04em', pointerEvents: 'none' }}>
          {line}
        </text>
      ))}
    </g>
  );
}

export default function T6BPropDiagram() {
  // oil is animated/derived from pcl — not directly user-controlled
  const [oil, setOilState] = useState(0);
  const oilRef    = useRef(0);
  const oilAnimRef = useRef(null);
  const [offTransition, setOffTransition] = useState(false); // true while animating out of off zone

  // Tube fill factor (0–1): animates independently from oil at a gentler rate
  // so drain and refill both look quick-but-visible rather than instant or too fast.
  const [tubeFill, setTubeFill] = useState(0);
  const tubeFillRef  = useRef(0);
  const tubeFillAnim = useRef(null);

  // Piston fraction (0=feather, 1=fine pitch): snaps right with oil, rate-limited leftward.
  // Only moves once the oil fill's right edge reaches pistonMin (derived from layout geometry).
  const [pistonFrac, setPistonFrac] = useState(0);
  const pistonFracRef  = useRef(0);
  const pistonFracAnim = useRef(null);


  const [pcl, setPcl] = useState(-0.15); // -0.15 = OFF, 0 = IDLE, 1 = MAX
  const [cutoffLifted, setCutoffLifted] = useState(false);
  const [pmuOff, setPmuOff] = useState(false);
  const [cbPropSys, setCbPropSys] = useState(false);
  const [uncommandedFeather, setUncommandedFeather] = useState(false);
  const cutoffTimerRef = useRef(null);
  const svgRef = useRef(null);
  const pclDraggingRef = useRef(false);
  const pclGroupRef = useRef(null);

  // iOS Safari ignores touch-action on inner SVG elements, and React registers
  // touch listeners as passive, so preventing page scroll while dragging the
  // PCL needs native non-passive listeners on the lever group.
  useEffect(() => {
    const el = pclGroupRef.current;
    if (!el) return;
    const prevent = (e) => e.preventDefault();
    el.addEventListener('touchstart', prevent, { passive: false });
    el.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      el.removeEventListener('touchstart', prevent);
      el.removeEventListener('touchmove', prevent);
    };
  }, []);
  const [briefingTab, setBriefingTab] = useState(null);
  const [infoKey, setInfoKey] = useState(null);

  const torque   = pcl <= 0 ? 0 : Math.round(pcl * 100);
  const elecLive = pcl < 0;                        // PCL in OFF — feeds upper junction
  const psvLive  = elecLive && !pmuOff;             // PSV circuit: also needs PMU NORM
  const fdsUpstreamLive = elecLive || uncommandedFeather;           // FDS path up to CB: normal OR faulty energization
  const fdsLive  = fdsUpstreamLive && !cbPropSys;                  // FDS circuit: CB can always break the fault

  // ── Oil pressure formula ─────────────────────────────────────────────────
  // Engine off → 0.  Idle (pcl=0) → 100 %.
  // torque 0–75 %:  oilPx = -0.75 * t + 100
  // torque > 75 %:  oilPx = sqrt(225*(100-t)/4) + 6.35
  const c = 0.55
  const b = 1/25*(1/(2*c))**2
  const a = 1/(2*c*b)-(-75*c+100)
  function computeTargetOil(pclVal) {
    if (pclVal < 0) return 0;
    const t = pclVal * 100;
    const oilPx = t <= 75
      ? -c * t + 100
      : Math.sqrt((100 - t) /b) -a;
    return Math.max(0, Math.min(1, oilPx / 100));
  }

  // Animate oil whenever pcl changes.
  // offTransition stays true from when pcl goes negative until oil finishes
  // animating back up to the curve — keeps the dot on the off-trace line
  // for the full return journey rather than snapping the instant pcl crosses 0.
  useEffect(() => {
    const bothClosed = pcl < 0 && pmuOff && cbPropSys;
    // When both valves are closed, oil can only leak slowly and floors at the
    // minimum oil level seen in normal operation (max-torque oil pressure ~31%).
    const oilFloor  = 0;
    const effectiveFault = uncommandedFeather && !cbPropSys;
    let oilTarget = effectiveFault ? 0 : Math.max(oilFloor, computeTargetOil(pcl));
    if(bothClosed){ oilTarget = 0.273}
    if (pcl < 0 || effectiveFault) setOffTransition(true);
    cancelAnimationFrame(oilAnimRef.current);

    function animate() {
      const diff = oilTarget - oilRef.current;
      if (Math.abs(diff) < 0.005) {
        oilRef.current = oilTarget;
        setOilState(oilTarget);
        if (pcl >= 0 && !effectiveFault) setOffTransition(false);
        return;
      }
      let oilRate = 0.05;
      if (bothClosed) oilRate = 0.0008;
      else if (pcl < 0 || effectiveFault) oilRate = 0.075;
      else if (pmuOff) oilRate = 0.005;
      if(oilRef.current<0.3125) oilRate = oilRate/20; //70/(CYL.x + 5 - 230)*0.3125/0.6875;
      if (pmuOff & oilRef.current<0.3125 & !effectiveFault) oilRate = 0.00025;
      const step = Math.sign(diff) * oilRate;
      oilRef.current += Math.abs(step) > Math.abs(diff) ? diff : step;
      console.log('oil:', oilRef.current.toFixed(4));
      setOilState(oilRef.current);
      oilAnimRef.current = requestAnimationFrame(animate);
    }
    oilAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(oilAnimRef.current);
  }, [pcl, pmuOff, cbPropSys, uncommandedFeather]); // eslint-disable-line react-hooks/exhaustive-deps


  // Piston animation: reads oilRef each frame.
  // Oil fill right edge = extTubeLeft(230) + oil * maxFillW(227).
  // Piston only starts moving once that edge reaches pistonMin(387).
  // Snaps right instantly with oil; rate-limited leftward.
  useEffect(() => {
    function animate() {
      const oilNow = oilRef.current;
      let target = 0;
      if (oilNow < 0.3125) {
        target = (oilNow / 0.3125) * 0.31;
      } else {
        target = 0.31 + (oilNow - 0.3125) / 0.6875 * 0.69;
      }
      const diff = target - pistonFracRef.current;
      if (Math.abs(diff) > 0.0005) {
        if (diff > 0) {
          pistonFracRef.current = target;
        } else {
          pistonFracRef.current = Math.max(target, pistonFracRef.current - PISTON_LEFT_SPEED);
        }
        setPistonFrac(pistonFracRef.current);
      }
      pistonFracAnim.current = requestAnimationFrame(animate);
    }
    pistonFracAnim.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(pistonFracAnim.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drain tube fill: two independent animations — one per valve tap.
  // Each fills while pcl<0 AND tubeFillRef > its threshold, then drains once
  // the main line drops below that threshold (or pcl returns to idle).
  // Adjust thresholds to tune when each tap runs dry.
  const PSV_DRAIN_THRESH = 0.02;   // PSV tap drains once main drops below this
  const FDS_DRAIN_THRESH = 0.05;   // FDS tap drains once main drops below this

  const [psvDrainFill, setPsvDrainFill] = useState(0);
  const psvDrainFillRef  = useRef(0);
  const psvDrainFillAnim = useRef(null);
  const [psvDrainFilling, setPsvDrainFilling] = useState(true);
  const psvDrainFillingRef = useRef(true);

  const [fdsDrainFill, setFdsDrainFill] = useState(0);
  const fdsDrainFillRef  = useRef(0);
  const fdsDrainFillAnim = useRef(null);
  const [fdsDrainFilling, setFdsDrainFilling] = useState(true);
  const fdsDrainFillingRef = useRef(true);

  function makeDrainEffect(thresh, live, forceActive, fillRef, fillAnim, setFill, fillingRef, setFilling) {
    return function animate() {
      const target = ((forceActive || (pcl < 0 && live)) && oilRef.current > thresh) ? 1 : 0;
      const filling = target === 1;
      if (filling !== fillingRef.current) {
        fillingRef.current = filling;
        setFilling(filling);
      }
      const diff = target - fillRef.current;
      if (Math.abs(diff) < 0.005) {
        fillRef.current = target;
        setFill(target);
        if (pcl < 0 || forceActive) fillAnim.current = requestAnimationFrame(animate);
        return;
      }
      const drainRate = 0.1;
      const step = Math.sign(diff) * drainRate;
      fillRef.current += Math.abs(step) > Math.abs(diff) ? diff : step;
      setFill(fillRef.current);
      fillAnim.current = requestAnimationFrame(animate);
    };
  }

  useEffect(() => {
    cancelAnimationFrame(psvDrainFillAnim.current);
    const animate = makeDrainEffect(
      PSV_DRAIN_THRESH, psvLive, false, psvDrainFillRef, psvDrainFillAnim,
      setPsvDrainFill, psvDrainFillingRef, setPsvDrainFilling
    );
    psvDrainFillAnim.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(psvDrainFillAnim.current);
  }, [pcl, pmuOff]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cancelAnimationFrame(fdsDrainFillAnim.current);
    const animate = makeDrainEffect(
      FDS_DRAIN_THRESH, fdsLive, uncommandedFeather && !cbPropSys, fdsDrainFillRef, fdsDrainFillAnim,
      setFdsDrainFill, fdsDrainFillingRef, setFdsDrainFilling
    );
    fdsDrainFillAnim.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(fdsDrainFillAnim.current);
  }, [pcl, cbPropSys, uncommandedFeather]); // eslint-disable-line react-hooks/exhaustive-deps

  // PCL lever geometry
  const pclTrackTop    = 160;
  const pclTrackBottom = 330;
  const pclCX          = 50;
  const pclOffY        = 360; // OFF zone bottom (below IDLE)
  const pclLeverY      = pcl >= 0
    ? pclTrackBottom - pcl * (pclTrackBottom - pclTrackTop)
    : pclTrackBottom + (-pcl / 0.15) * (pclOffY - pclTrackBottom);

  function handleCutoffClick() {
    setCutoffLifted(v => !v);
  }

  function handlePclDrag(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (svgPt.y <= pclTrackBottom) {
      const raw = 1 - (svgPt.y - pclTrackTop) / (pclTrackBottom - pclTrackTop);
      setPcl(Math.max(0, Math.min(1, raw)));
    } else if (cutoffLifted || pcl < 0) {
      // Allow entry into OFF zone only if guard is lifted; once there, move freely
      const raw = -((svgPt.y - pclTrackBottom) / (pclOffY - pclTrackBottom)) * 0.15;
      setPcl(Math.max(-0.15, raw));
    }
  }

  // Torque gauge constants
  // Angle convention: standard math (0=right, CW on screen = increasing angle in SVG y-down)
  // Gauge: 0% at 120° (lower-left / 7 o'clock), sweeps CW 300° to 420°=60° (lower-right / 5 o'clock)
  const TCX = 722, TCY = 108, TR = 60;
  function gaugeAngleDeg(t) { return 150 + (t / 110) * 240; }

  // ── Derived values ───────────────────────────────────────────────────────

  // Piston position computed first — blade and cam are tied to it, not to oil directly.
  const pistonMin = CYL.x + 5; // leftmost (feather) position
  const extTubeLeft = 230;   // left edge of extended housing (past drain taps at 240/260)
  let nominalPistonLeft = pistonMin
  let oilLeftPiston = 0.3125*(pistonMin - extTubeLeft)/(pistonMin - extTubeLeft+0.31*70)
  if(oil >  oilLeftPiston & oil < 0.3125){
      nominalPistonLeft = pistonMin + 0.31*70*(oil-oilLeftPiston)/(0.3125-oilLeftPiston)
  }else if (oil >= 0.3125){
      nominalPistonLeft = pistonMin + (0.31 + (oil - 0.3125) / 0.6875 * 0.69) * 70
  }
  // Oil channel: main tube extends left to extTubeLeft to cover drain taps,
  // core fill physics still anchored at HUB.x (the port fitting).
  const oilTubeX = HUB.x;

  // Fill: aims for nominal piston, gated by tubeFill animation (0→1)
  const fillMaxW       = Math.max(0, nominalPistonLeft - oilTubeX);
  const oilFillW       = fillMaxW * tubeFill;
  const fillRightEdge  = oilTubeX + oilFillW;

  // Oil level: pixel width of the oil fill, derived from oil pressure.
  // oilLevel: pixel fill width. Piecewise linear — matches piston fraction mapping.
  // oil=0 → 0, oil=0.3125 → pistonMin-extTubeLeft+0.31*70, oil=1 → pistonMin-extTubeLeft+70
  let oilLevel;
  if (oil < 0.3125) {
    oilLevel = (pistonMin - extTubeLeft + 0.31 * 70) * (oil / 0.3125);
  } else {
    oilLevel = pistonMin - extTubeLeft + (0.31 + (oil - 0.3125) / 0.6875 * 0.69) * 70;
  }

  // Piston: directly derived from oil — same piecewise formula as oilLevel.
  let derivedPistonFrac = 0
  if(oil >  oilLeftPiston & oil < 0.3125){
      derivedPistonFrac = 0.31*(oil-oilLeftPiston)/(0.3125-oilLeftPiston)
  }else if (oil >= 0.3125){
    derivedPistonFrac = 0.31 + (oil - 0.3125) / 0.6875 * 0.69;
  }
  const pistonLeft = pistonMin + derivedPistonFrac * 70;

  const pistonRight = pistonLeft + 52;

  // Piston fraction (0 = feather, 1 = fine pitch): single source of truth for blade + cam
  const pistonFraction = (pistonLeft - pistonMin) / 70;

  // Assembly rotation driven by piston, not oil
  // CCW: feather (upper-left) → fine pitch (near-horizontal left)
  const assemblyRot = pistonFraction * 71;
  const rotRad      = assemblyRot * Math.PI / 180;

  // Current blade direction after assembly rotation
  const bdx = fdx * Math.cos(rotRad) - fdy * Math.sin(rotRad);
  const bdy = fdx * Math.sin(rotRad) + fdy * Math.cos(rotRad);

  // Blade pitch angle from the horizontal (piston axis)
  const pitchDeg = Math.round(90-Math.atan2(-bdy, -bdx) * 180 / Math.PI);
  const idealBladeAngle   = 86 - computeTargetOil(pcl) * 71;  // from graph curve at current PCL
  const bladeDelta = Math.trunc(pitchDeg - idealBladeAngle);


  const displayedTorque = Math.ceil(torque *(1 + 0.017*bladeDelta))
  const needleAngle = gaugeAngleDeg(Math.min(displayedTorque, 110)) * Math.PI / 180;

  // Cam follower tied to piston — slides right as piston advances
  const camX = HX - 22 + pistonFraction * 44;

  // Piston rod: horizontal shaft from cam follower right face to piston left face
  const rodX1 = camX + 12;

  // Cam follower geometry: rectangle body with notch cut from top; pin on bore circle
  const pinY   = HY - Math.sqrt(Rr * Rr - (camX - HX) * (camX - HX));
  const pinR   = 5;
  const cfT    = HY - 38;          // body top
  const cfB    = HY + 26;          // body bottom
  const nB     = cfT + 15;         // notch bottom (18 px deep from body top)
  // Rectangle outline with rectangular notch cut from the top-centre
  const cfPath = [
    `M ${camX - 12} ${cfB}`,
    `L ${camX - 12} ${cfT}`,
    `L ${camX - 7}  ${cfT}`,
    `L ${camX - 7}  ${nB}`,
    `L ${camX + 7}  ${nB}`,
    `L ${camX + 7}  ${cfT}`,
    `L ${camX + 12} ${cfT}`,
    `L ${camX + 12} ${cfB}`,
    'Z',
  ].join(' ');

  // Feathering spring: from piston right face to fixed cylinder end
  const spLeft = pistonRight + 2;
  const spW    = Math.max(16, SR - spLeft);

  // Arc indicator: from vertical (straight up) sweeping CCW to current blade position
  const Ra      = 120;
  const arcEndX = HX + bdx * Ra;   // current blade direction point
  const arcEndY = HY + bdy * Ra;



  // Shorthand for toFixed(1) used on SVG coordinates
  const fp = n => n.toFixed(1);

  // ── Tab button config ────────────────────────────────────────────────
  const TABS = [
    { id: 'verbatim', label: 'NATOPS INTRO' },
    { id: 'numbers',  label: 'NUMBERS'  },
    { id: 'eicas',    label: 'EICAS'    },
    { id: 'eps',      label: 'EPs'      },
  ];

  return (
    <div style={{ background: C.bg, width: '100%', minHeight: '100vh' }}>
    <div style={{
      background: C.bg, padding: '12px 10px', borderRadius: 8,
      maxWidth: 860, margin: '0 auto', fontFamily: FONT, color: C.text,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>

        {/* LEFT — briefing tabs (2×2 grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, maxWidth: 'calc(50% - 4px)', minWidth: 0 }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setBriefingTab(t => t === id ? null : id)}
              style={{
                background: briefingTab === id ? 'rgba(55,138,221,0.18)' : 'transparent',
                border: `0.5px solid ${briefingTab === id ? '#378ADD' : C.stroke}`,
                color: briefingTab === id ? '#5ab8e8' : C.muted,
                padding: '6px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
                letterSpacing: '0.08em', fontFamily: FONT,
                fontWeight: briefingTab === id ? 700 : 400,
                transition: 'all 0.15s',
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* RIGHT — sim fault buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, maxWidth: 'calc(50% - 4px)', minWidth: 0 }}>
          <button onClick={() => setUncommandedFeather(v => !v)} style={{
            background: uncommandedFeather ? '#cc2222' : 'transparent',
            border: `1px solid ${uncommandedFeather ? '#991010' : C.stroke}`,
            color: uncommandedFeather ? '#f8e0e0' : C.muted,
            padding: '6px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
            letterSpacing: '0.06em', fontFamily: FONT,
            fontWeight: uncommandedFeather ? 700 : 400,
            minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {uncommandedFeather ? '● UNCOMMANDED PROP FEATHER' : '▷ SIM UNCOMMANDED PROP FEATHER'}
          </button>
        </div>

      </div>
      

      {/* ── Attribution ── */}
      <div style={{ textAlign: 'center', margin: '6px 0', fontSize: 9, letterSpacing: '0.12em', color: '#3a6a8a' }}>
        IMAGES &amp; COMPONENT DESCRIPTIONS SOURCED FROM{' '}
        <span style={{ color: '#5ab8e8', fontWeight: 700, letterSpacing: '0.14em' }}>T6BDRIVER.COM</span>
      </div>

      {/* Briefing modal overlay */}
      {briefingTab && (
        <PropBriefingModal tab={briefingTab} onClose={() => setBriefingTab(null)} />
      )}
      {infoKey && PROP_INFO[infoKey] && (
        <InfoModal {...PROP_INFO[infoKey]} onClose={() => setInfoKey(null)} />
      )}

      <svg ref={svgRef} viewBox="0 0 820 470" width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <style>{WIRE_KEYFRAMES}</style>
        <defs>

          <linearGradient id="pp-hub" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#172534" />
            <stop offset="100%" stopColor="#090e18" />
          </linearGradient>
          <linearGradient id="pp-metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#9aaaba" />
            <stop offset="45%"  stopColor="#6a7a8a" />
            <stop offset="100%" stopColor="#2a3a4a" />
          </linearGradient>
          <linearGradient id="pp-blade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#4a6880" />
            <stop offset="50%"  stopColor="#7aaac8" />
            <stop offset="100%" stopColor="#4a6880" />
          </linearGradient>
          {/* Clip counterweight to outside the bore circle */}
          <clipPath id="pp-cw-clip" clipPathUnits="userSpaceOnUse">
            <path fillRule="evenodd" d={
              `M 0 0 H 820 V 460 H 0 Z ` +
              `M ${HX} ${HY - Rr} ` +
              `a ${Rr} ${Rr} 0 1 0 0.001 0 Z`
            } />
          </clipPath>
        </defs>

        {/* ════════════════════════════════════════════
            FIXED CYLINDER
        ════════════════════════════════════════════ */}
        <rect x={CYL.x} y={CYL.y} width={CYL.w} height={CYL.h} rx={5}
          fill="#0b1820" stroke="#28405a" strokeWidth={1.8} />
        {/* Bore interior */}
        <rect x={CYL.x + 4} y={CYL.y + 6} width={CYL.w - 22} height={CYL.h - 12} rx={3}
          fill="#07101a" stroke="#1a2e40" strokeWidth={0.7} />
        {/* End cap */}
        <rect x={CYL.x + CYL.w - 15} y={CYL.y - 4} width={19} height={CYL.h + 8} rx={6}
          fill="#12202e" stroke="#28405a" strokeWidth={1.5} />
        {/* Structural ribs */}
        {[0.3, 0.6].map((frac, i) => (
          <line key={i}
            x1={CYL.x + CYL.w * frac} y1={CYL.y}
            x2={CYL.x + CYL.w * frac} y2={CYL.y + CYL.h}
            stroke="#1c2e40" strokeWidth={1.2} />
        ))}
        <text x={CYL.x + CYL.w / 2} y={CYL.y + CYL.h + 14}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.05em' }}>
          FIXED CYLINDER
        </text>

        {/* ════════════════════════════════════════════
            HUB BODY
        ════════════════════════════════════════════ */}
        <rect x={HUB.x} y={HUB.y} width={HUB.w} height={HUB.h} rx={9}
          fill="url(#pp-hub)" stroke={C.hubBorder} strokeWidth={2} />

        {/* ════════════════════════════════════════════
            OIL PRESSURE INLET  (left hub wall)
        ════════════════════════════════════════════ */}
        {/* Port fitting */}
        <rect x={HUB.x - 9} y={HY - 7} width={10} height={14} rx={2}
          fill="#0b1820" stroke={C.hubBorder} strokeWidth={0.8} />

        {/* ════════════════════════════════════════════
            PIU  (Propeller Interface Unit — oil source)
            Right edge abuts main tube left edge (extTubeLeft=230)
        ════════════════════════════════════════════ */}
        <g onClick={() => setInfoKey('piu')} style={{ cursor: 'pointer' }}>
          <rect x={174} y={HY - 13} width={56} height={26} rx={3}
            fill="#0c1824" stroke={C.oilLight} strokeWidth={1.2} />
          <text x={202} y={HY+2}
            style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, fill: C.oilLight, textAnchor: 'middle', letterSpacing: '0.10em' }}>
            PIU
          </text>
        </g>

        {/* ════════════════════════════════════════════
            COUNTERWEIGHT  (rotates with blade, rendered behind bore circle)
        ════════════════════════════════════════════ */}
        <g transform={`rotate(${assemblyRot.toFixed(2)}, ${HX}, ${HY})`} clipPath="url(#pp-cw-clip)">
          <polygon points={cwPts} fill="#4a5868" stroke={C.counterEdge} strokeWidth={1.2} />
        </g>

        {/* ════════════════════════════════════════════
            BLADE ROOT BORE CIRCLE
        ════════════════════════════════════════════ */}
        <circle cx={HX} cy={HY} r={Rr}
          fill="none" stroke="#2a4060" strokeWidth={1.5} />
        <circle cx={HX} cy={HY} r={Rr - 5}
          fill="none" stroke="#1a2e3a" strokeWidth={0.7} opacity={0.6} />
        {oil === 0 && <>
          <text x={HX+80} y={HUB.y + HUB.h - 14}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted, textAnchor: 'middle' }}>
          BLADE
        </text>
          <text x={HX+78} y={HUB.y + HUB.h - 4}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted, textAnchor: 'middle' }}>
          ROOT
        </text>
        <line x1={HX+70} y1={HUB.y + HUB.h - 20} x2={HX + 27} y2={HY+30}
          stroke={C.muted} strokeWidth={0.5} opacity={0.5} />
        </>}

        {/* ════════════════════════════════════════════
            FORK ASSEMBLY + CAM FOLLOWER
            (above bore circle, below oil tube)
        ════════════════════════════════════════════ */}
        {/* Travel axis guide */}
        <line x1={HX - Rr} y1={HY} x2={HX + Rr} y2={HY}
          stroke="#1a3050" strokeWidth={0.9} strokeDasharray="3 2" />
        {/* Fork assembly body (rectangle with cutout) */}
        <path d={cfPath} fill={C.metalDark} stroke={C.metalLight} strokeWidth={1.2} />
        {/* Cam follower — circle whose centre rides on the bore circle arc */}
        <circle cx={camX} cy={pinY} r={pinR} fill={C.metal} stroke={C.metalLight} strokeWidth={1.2} />

        {/* ════════════════════════════════════════════
            OIL CHANNEL TUBE  (covers fork assembly in the tube region)
        ════════════════════════════════════════════ */}
        {/* Drain tube housings — rendered before main tube so main tube overlaps junction */}
        <rect x={240} y={HY} width={4} height={80}
          fill="#07101a" stroke="#1a2e40" strokeWidth={0.5} />
        <rect x={240}
          y={psvDrainFilling ? HY : HY + 80 * (1 - psvDrainFill)}
          width={4} height={psvDrainFill * 80}
          fill="#2060c0" opacity={0.75} />
        <rect x={260} y={HY} width={4} height={114}
          fill="#07101a" stroke="#1a2e40" strokeWidth={0.5} />
        <rect x={260}
          y={fdsDrainFilling ? HY : HY + 114 * (1 - fdsDrainFill)}
          width={4} height={fdsDrainFill * 114}
          fill="#2060c0" opacity={0.75} />
        {/* Tube housing — rendered after drain tubes so it overlaps the junction points */}
        <rect x={extTubeLeft} y={HY - 8} width={SR - extTubeLeft} height={16}
          fill="#07101a" stroke="#1a2e40" strokeWidth={0.8} />
        {/* Oil fill — width tied directly to oil level */}
        {/* width={Math.max(0, oil * (pistonMin-extTubeLeft))} */}
        <rect x={extTubeLeft} y={HY - 7}
          width={Math.max(0, oilLevel)}
          height={14} fill="#2060c0" opacity={0.75} />
        
        {/* ════════════════════════════════════════════
            FEATHERING SPRING  (over the tube)
        ════════════════════════════════════════════ */}
        <path d={springPath(spLeft, HY, spW)}
          fill="none" stroke={C.spring} strokeWidth={2.2} strokeLinecap="round" />
        {/* Fixed right stop */}
        <line x1={SR} y1={HY - 16} x2={SR} y2={HY + 16}
          stroke={C.spring} strokeWidth={3} />
        <text x={(spLeft + SR) / 2} y={CYL.y - 10}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.accent, textAnchor: 'middle', letterSpacing: '0.06em' }}>
          FEATHERING SPRING
        </text>

        {/* ════════════════════════════════════════════
            OIL DRAIN LINES  (tapped off the inlet at HUB left wall)
            Prop Servo Valve at x=242 (shallower), Feather Dump Sol. at x=262 (deeper)
        ════════════════════════════════════════════ */}
        {/* ── Prop Servo Valve ── */}
        <g onClick={() => setInfoKey('propservo')} style={{ cursor: 'pointer' }}>
          <rect x={234} y={348} width={16} height={16} rx={2}
            fill="#0a1828" stroke={C.oilLight} strokeWidth={1.5} />
          {!psvLive && <>
            <line x1={234} y1={348} x2={250} y2={364} stroke={C.oilLight} strokeWidth={1} />
            <line x1={250} y1={348} x2={234} y2={364} stroke={C.oilLight} strokeWidth={1} />
          </>}
          <line x1={242} y1={364} x2={242} y2={386} stroke={C.oilLight} strokeWidth={1.5} />
          <polygon points={`242,391 238,381 246,381`} fill={C.oilLight} />
          <text x={230} y={353}
            style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'end', letterSpacing: '0.03em' }}>
            PROP SERVO
          </text>
          <text x={230} y={361}
            style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'end', letterSpacing: '0.03em' }}>
            VALVE
          </text>
        </g>

        {/* ── Feather Dump Solenoid Valve ── */}
        <g onClick={() => setInfoKey('featherdump')} style={{ cursor: 'pointer' }}>
          <rect x={254} y={382} width={16} height={16} rx={2}
            fill="#0a1828" stroke={C.oilLight} strokeWidth={1.5} />
          {!fdsLive && <>
            <line x1={254} y1={382} x2={270} y2={398} stroke={C.oilLight} strokeWidth={1} />
            <line x1={270} y1={382} x2={254} y2={398} stroke={C.oilLight} strokeWidth={1} />
          </>}
          <line x1={262} y1={398} x2={262} y2={420} stroke={C.oilLight} strokeWidth={1.5} />
          <polygon points={`262,425 258,415 266,415`} fill={C.oilLight} />
          <text x={274} y={382}
            style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'start', letterSpacing: '0.03em' }}>
            FEATHER DUMP
          </text>
          <text x={274} y={390}
            style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'start', letterSpacing: '0.03em' }}>
            SOLENOID
          </text>
          <text x={274} y={398}
            style={{ fontFamily: FONT, fontSize: 6, fill: C.muted, textAnchor: 'start', letterSpacing: '0.03em' }}>
            VALVE
          </text>
        </g>

        {/* ════════════════════════════════════════════
            PISTON ROD  (cam follower right face → piston left face)
        ════════════════════════════════════════════ */}
        <line x1={rodX1} y1={HY} x2={pistonLeft} y2={HY}
          stroke={C.metal} strokeWidth={4.5} strokeLinecap="round" />

        {/* ════════════════════════════════════════════
            SLIDING PISTON  (inside cylinder, dynamic)
        ════════════════════════════════════════════ */}
        <rect x={pistonLeft} y={HY - 24} width={52} height={48} rx={4}
          fill="url(#pp-metal)" stroke={C.metalLight} strokeWidth={1.2} opacity={1} />
        {/* Piston rings */}
        {[11, 25, 38].map(dx => (
          <line key={dx}
            x1={pistonLeft + dx} y1={HY - 22}
            x2={pistonLeft + dx} y2={HY + 22}
            stroke={C.metalLight} strokeWidth={0.9} />
        ))}
        <text x={pistonLeft + 26} y={HY + 33}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.04em' }}>
          SLIDING PISTON
        </text>

{/* rotating blade assembly moved to end — rendered on top of everything */}

        {/* Fork assembly labels — only shown at feather (oil=0) */}
        {oil === 0 && <>
          <text x={camX - 115} y={HY + 50}
            style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted, textAnchor: 'start', letterSpacing: '0.04em' }}>
            FORK
          </text>
          <text x={camX - 115} y={HY + 60}
            style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted, textAnchor: 'start', letterSpacing: '0.04em' }}>
            ASSEMBLY
          </text>
          <line x1={camX - 70} y1={HY + 48} x2={camX - 13} y2={HY + 22}
          stroke={C.muted} strokeWidth={0.5} opacity={0.5} />
          <text x={camX + 100} y={pinY - 34}
            style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted, textAnchor: 'start', letterSpacing: '0.04em' }}>
            CAM FOLLOWER
          </text>
          <line x1={camX + 100} y1={pinY - 30} x2={camX + 6} y2={pinY }
          stroke={C.muted} strokeWidth={0.5} opacity={0.5} />
        </>}

        {/* ════════════════════════════════════════════
            PITCH ANGLE ARC INDICATOR
            Arc sweeps from blade direction to vertical (feather) reference.
            Label shows angle from horizontal (piston axis).
        ════════════════════════════════════════════ */}
        {/* Vertical reference dashed line (0° from vertical = feather reference) */}
        <line x1={HX} y1={HY - Rr - 5} x2={HX} y2={HY - Ra - 14}
          stroke={C.muted} strokeWidth={0.8} strokeDasharray="4 3" />
        {/* Wedge fill — from vertical, sweeping CCW to blade */}
        <path d={`M ${HX} ${HY} L ${HX} ${HY - Ra} A ${Ra} ${Ra} 0 0 0 ${fp(arcEndX)} ${fp(arcEndY)} Z`}
          fill={`${C.oilMid}18`} />
        {/* Arc edge */}
        <path d={`M ${HX} ${HY - Ra} A ${Ra} ${Ra} 0 0 0 ${fp(arcEndX)} ${fp(arcEndY)}`}
          fill="none" stroke={C.oilMid} strokeWidth={0.9} />
        {(pitchDeg === 15 || pitchDeg === 86) && (() => {
          const mx = bdx / 2, my = (-1 + bdy) / 2;
          const len = Math.sqrt(mx*mx + my*my);
          return <text x={fp(HX + (mx/len) * (Ra + 8))} y={fp(HY + (my/len) * (Ra + 8))}
            style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, fill: C.muted, textAnchor: 'middle', dominantBaseline: 'central' }}>
            {pitchDeg}°
          </text>;
        })()}

        {/* ════════════════════════════════════════════
            STATIC COMPONENT LABELS
        ════════════════════════════════════════════ */}
        {/* COUNTERWEIGHT */}
        {oil === 0 && <>
        <text x={HX + 46} y={HUB.y -30}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted }}>
          COUNTERWEIGHT
        </text>
        <line x1={HX + 46} y1={HUB.y - 30} x2={HX+5} y2={HUB.y-5}
          stroke={C.muted} strokeWidth={0.5} opacity={0.5} />
        </>}

        {/* PROPELLER BLADE */}
        {oil === 0 && <>
          <text x={HX - 150} y={HY+20}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted }}>PROPELLER</text>
        <text x={HX - 150} y={HY+28}
          style={{ fontFamily: FONT, fontSize: 7.5, fill: C.muted }}>BLADE</text>
        <line x1={HX -115} y1={HY+20} x2={HX - 90} y2={HY+0}
          stroke={C.muted} strokeWidth={0.5} opacity={0.5} />
        </>}



        {/* ════════════════════════════════════════════
            TORQUE vs OIL PRESSURE GRAPH
        ════════════════════════════════════════════ */}
        {(() => {
          // Box bounds (fits between torque dial bottom ~177 and pitch readout top 372)
          const GL = 650, GT = 183, GW = 150, GH = 163;
          // Plot area inside box
          const px0 = GL + 28;          // left edge (room for y-axis labels)
          const py0 = GT + 12;          // top edge
          const pw  = GW - 28 - 7;     // plot width  = 115
          const ph  = GH - 12 - 20;    // plot height = 151
          const pxR = px0 + pw;
          const pyB = py0 + ph;

          // Build curve: torque 0–100, oilPx 0–100
          const pts = [];
          for (let t = 0; t <= 100; t++) {
            const o = t <= 75
                ? -c * t + 100
                : Math.sqrt((100 - t) /b) -a;
            pts.push(`${(px0 + (t / 100) * pw).toFixed(1)},${(pyB - (o / 100) * ph).toFixed(1)}`);
          }
          const curvePath = `M ${pts.join(' L ')}`;

          const offBandW  = 16;
          const offCenter = px0 - offBandW / 2;
          // Off region: dot traces the diagonal line parameterised by oil (top=idle, bottom=off)
          // Normal region: dot snaps instantly to the correct curve position
          // onOffRegion stays true while animating out of off zone so the dot
          // traces the line back up rather than snapping when pcl crosses 0.
          const onOffRegion = pcl <= 0 || offTransition;
          const curX = onOffRegion
            ? offCenter + oil * (px0 - offCenter)
            : px0 + (torque / 100) * pw;
          const curY = onOffRegion
            ? pyB - oil * ph
            : pyB - computeTargetOil(pcl) * ph;

          return (<>
            {/* Box */}
            <rect x={GL} y={GT} width={GW} height={GH} rx={4}
              fill="#0c1824" stroke={C.stroke} strokeWidth={0.8} />
            {/* Plot background */}
            <rect x={px0} y={py0} width={pw} height={ph}
              fill="#070e16" stroke="#1a2e40" strokeWidth={0.5} />

            {/* Grid lines */}
            {[25, 50, 75].map(t => {
              const x = (px0 + (t / 100) * pw).toFixed(1);
              return <line key={`vg${t}`} x1={x} y1={py0} x2={x} y2={pyB}
                stroke="#1a2e40" strokeWidth={0.5} strokeDasharray="2 3" />;
            })}
            {[25, 50, 75].map(o => {
              const y = (pyB - (o / 100) * ph).toFixed(1);
              return <line key={`hg${o}`} x1={px0} y1={y} x2={pxR} y2={y}
                stroke="#1a2e40" strokeWidth={0.5} strokeDasharray="2 3" />;
            })}

            {/* Curve */}
            <path d={curvePath} fill="none" stroke={C.oilLight} strokeWidth={1.5} strokeLinejoin="round" />

            {/* Off-region band: sits to the left of the 0 torque mark */}
            <rect x={px0 - offBandW} y={py0} width={offBandW} height={ph}
              fill="#3a0808" opacity={0.75} />
            {/* Trace line: full 0–100% path down the centre of the band */}
            <line x1={px0} y1={py0} x2={offCenter} y2={pyB}
              stroke="#cc3333" strokeWidth={1.2} strokeLinecap="round" />
            {/* Right border of off band (at torque=0) */}
            <line x1={px0} y1={py0} x2={px0} y2={pyB}
              stroke="#cc3333" strokeWidth={1} />

            {/* Indicator: vertical line from x-axis up to dot */}
            <line x1={curX.toFixed(1)} y1={pyB} x2={curX.toFixed(1)} y2={curY.toFixed(1)}
              stroke={onOffRegion ? '#cc3333' : C.accent} strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={curX.toFixed(1)} cy={curY.toFixed(1)} r={2.8}
              fill={onOffRegion ? '#cc3333' : C.accent} />

            {/* X-axis tick labels */}
            {[0, 25, 50, 75, 100].map(t => (
              <text key={`xl${t}`}
                x={(px0 + (t / 100) * pw).toFixed(1)} y={pyB + 10}
                style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'middle' }}>
                {t}
              </text>
            ))}
            {/* Y-axis tick labels */}
            {[0, 50, 100].map(o => (
              <text key={`yl${o}`}
                x={px0 - 4} y={(pyB - (o / 100) * ph + 2.5).toFixed(1)}
                style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'end' }}>
                {o}%
              </text>
            ))}

            {/* Axis titles */}
            <text x={(px0 + pw / 2).toFixed(1)} y={GT + GH - 3}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.06em' }}>
              TORQUE %
            </text>
            <text
              x={GL + 7} y={(py0 + ph / 2).toFixed(1)}
              transform={`rotate(-90,${GL + 7},${(py0 + ph / 2).toFixed(1)})`}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.06em' }}>
              OIL PX %
            </text>
          </>);
        })()}

        {/* ════════════════════════════════════════════
            BLADE ANGLE vs TORQUE GRAPH
        ════════════════════════════════════════════ */}
        {(() => {
          const GL = 650, GT2 = 356, GW = 150, GH2 = 98;
          const px0 = GL + 28;
          const py0 = GT2 + 12;
          const pw  = GW - 28 - 7;
          const ph  = GH2 - 12 - 20;
          const pxR = px0 + pw;
          const pyB = py0 + ph;
          const angMax = 90; // x-axis upper bound (degrees)

          // Build curve: iterate torque 0–100, compute blade angle = 86 - oil*71
          const pts2 = [];
          for (let t = 0; t <= 100; t++) {
            const oilVal = t <= 75
              ? (-c * t + 100) / 100
              : (Math.sqrt((100 - t) / b) - a) / 100;
            const ang = 86 - oilVal * 71;
            pts2.push(`${(px0 + (ang / angMax) * pw).toFixed(1)},${(pyB - (t / 100) * ph).toFixed(1)}`);
          }
          const curvePath2 = `M ${pts2.join(' L ')}`;

          // Key x positions
          const pxIdleAng    = px0 + (15   / angMax) * pw;  // angle at idle (oil=1)
          const pxMaxTqAng   = px0 + (63.8 / angMax) * pw;  // angle at max torque (oil=0.3125)
          const pxFeatherAng = px0 + (86   / angMax) * pw;  // feather angle (oil=0)

          // Dot: normal region snaps instantly; off/transition slides horizontally at y=pyB
          const onOffRegion2 = pcl <= 0 || offTransition;
          const curAngle = 86 - oil * 71;
          const curX2 = onOffRegion2
            ? px0 + (curAngle / angMax) * pw
            : px0 + ((86 - computeTargetOil(pcl) * 71) / angMax) * pw;
          const curY2 = onOffRegion2
            ? pyB
            : pyB - (torque / 100) * ph;

          return (<>
            {/* Box */}
            <rect x={GL} y={GT2} width={GW} height={GH2} rx={4}
              fill="#0c1824" stroke={C.stroke} strokeWidth={0.8} />
            {/* Plot background */}
            <rect x={px0} y={py0} width={pw} height={ph}
              fill="#070e16" stroke="#1a2e40" strokeWidth={0.5} />


            {/* Grid lines */}
            {[20, 40, 60, 80].map(ag => {
              const x = (px0 + (ag / angMax) * pw).toFixed(1);
              return <line key={`vg2${ag}`} x1={x} y1={py0} x2={x} y2={pyB}
                stroke="#1a2e40" strokeWidth={0.5} strokeDasharray="2 3" />;
            })}
            {[25, 50, 75].map(tq => {
              const y = (pyB - (tq / 100) * ph).toFixed(1);
              return <line key={`hg2${tq}`} x1={px0} y1={y} x2={pxR} y2={y}
                stroke="#1a2e40" strokeWidth={0.5} strokeDasharray="2 3" />;
            })}

            {/* Curve */}
            <path d={curvePath2} fill="none" stroke={C.oilLight} strokeWidth={1.5} strokeLinejoin="round" />

            {/* Indicator: vertical line from x-axis up to dot */}
            <line x1={curX2.toFixed(1)} y1={pyB} x2={curX2.toFixed(1)} y2={curY2.toFixed(1)}
              stroke={onOffRegion2 ? '#cc3333' : C.accent} strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={curX2.toFixed(1)} cy={curY2.toFixed(1)} r={2.8}
              fill={onOffRegion2 ? '#cc3333' : C.accent} />

            {/* Y-axis tick labels */}
            {[0, 50, 100].map(tq => (
              <text key={`yl2${tq}`}
                x={px0 - 4} y={(pyB - (tq / 100) * ph + 2.5).toFixed(1)}
                style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'end' }}>
                {tq}%
              </text>
            ))}

            {/* Axis titles */}
            <text x={(px0 + pw / 2).toFixed(1)} y={GT2 + GH2 - 3}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.06em' }}>
              BLADE ANGLE °
            </text>
            <text
              x={GL + 7} y={(py0 + ph / 2).toFixed(1)}
              transform={`rotate(-90,${GL + 7},${(py0 + ph / 2).toFixed(1)})`}
              style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.06em' }}>
              TORQUE %
            </text>
          </>);
        })()}

        {/* Note under graphs */}
        <text x={532} y={462}
          style={{ fontFamily: FONT, fontSize: 8, fill: '#3a5a70', textAnchor: 'start', fontStyle: 'italic' }}>
          Note: Full pitch-change behavior not described in NATOPS.
        </text>
        <text x={528} y={472}
          style={{ fontFamily: FONT, fontSize: 8, fill: '#3a5a70', textAnchor: 'start', fontStyle: 'italic' }}>
          Diagram is rough estimate built to develop intuition only.
        </text>

        {/* ════════════════════════════════════════════
            PCL — POWER CONTROL LEVER  (left side)
        ════════════════════════════════════════════ */}
        {/* Track body (IDLE → MAX) */}
        <rect x={pclCX - 9} y={pclTrackTop} width={18}
          height={pclTrackBottom - pclTrackTop} rx={4}
          fill="#060d14" stroke="#1a2e40" strokeWidth={1} />
        {/* OFF zone extension — always visible */}
        <rect x={pclCX - 9} y={pclTrackBottom} width={18}
          height={pclOffY - pclTrackBottom} rx={0}
          fill="#1a0000" stroke="#6a1010" strokeWidth={1} strokeDasharray="3 2" />
        {/* Detent lines: IDLE, ~60%, MAX */}
        {[0, 0.6, 1].map((f, i) => {
          const gy = pclTrackBottom - f * (pclTrackBottom - pclTrackTop);
          return <line key={i} x1={pclCX - 9} y1={gy} x2={pclCX + 9} y2={gy}
            stroke="#2a4060" strokeWidth={1} />;
        })}
        <text x={pclCX} y={pclTrackTop - 20}
          style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, fill: C.text, textAnchor: 'middle', letterSpacing: '0.12em' }}>
          PCL
        </text>
        <text x={pclCX} y={pclTrackTop - 7}
          style={{ fontFamily: FONT, fontSize: 7, fill: C.accent, textAnchor: 'middle', letterSpacing: '0.08em' }}>
          MAX
        </text>
        <text x={pclCX} y={pclTrackBottom + 12}
          style={{ fontFamily: FONT, fontSize: 7, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.08em' }}>
          IDLE
        </text>
        {/* OFF label — always visible */}
        <text x={pclCX} y={pclOffY + 12}
          style={{ fontFamily: FONT, fontSize: 7, fill: '#cc2222', textAnchor: 'middle', letterSpacing: '0.08em', fontWeight: 700 }}>
          OFF
        </text>

        {/* ════════════════════════════════════════════
            PMU → PIU CONTROL WIRE
            Routes from PMU top centre → right clear of PCL track → up → PIU left wall
        ════════════════════════════════════════════ */}
        {(() => {
          const effectiveFault = uncommandedFeather && !cbPropSys;
          const pmuWireLive = !pmuOff && pcl >= 0 && !effectiveFault
            && Math.abs(oil - computeTargetOil(pcl)) > 0.005;
          const wC = (on) => on ? '#c8c830' : '#4a6a8a';
          const wCl = (on) => on ? 'wire-anim' : undefined;
          return (
            <path
              d={`M 50,${pclOffY + 38} H 65 V 268 H 174`}
              fill="none"
              stroke={wC(pmuWireLive)}
              strokeWidth={1.2}
              className={wCl(pmuWireLive)}
            />
          );
        })()}

        {/* ════════════════════════════════════════════
            PMU BUTTON  (below PCL)
        ════════════════════════════════════════════ */}
        {(() => {
          const bx = pclCX - 14, by = pclOffY + 38, bw = 28, bh = 22;
          return (
            <g onClick={() => setPmuOff(v => !v)} style={{ cursor: 'pointer' }}>
              <rect x={bx} y={by} width={bw} height={bh} rx={3}
                fill={pmuOff ? '#2a0505' : '#051a0a'}
                stroke={pmuOff ? '#cc2222' : '#28a050'} strokeWidth={1.2} />
              <text x={bx + bw / 2} y={by + 8}
                style={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, fill: C.muted, textAnchor: 'middle', letterSpacing: '0.10em', pointerEvents: 'none' }}>
                PMU
              </text>
              <text x={bx + bw / 2} y={by + 18}
                style={{ fontFamily: FONT, fontSize: 7.5, fontWeight: 700, fill: pmuOff ? '#cc2222' : '#44cc66', textAnchor: 'middle', letterSpacing: '0.08em', pointerEvents: 'none' }}>
                {pmuOff ? 'OFF' : 'NORM'}
              </text>
            </g>
          );
        })()}

        {/* ════════════════════════════════════════════
            ELECTRICAL LINES
            PMU → right to x=90 → up to lower junction (90,364)
            PCL OFF right wall → right to upper junction (90,344)
            Upper junction (90,344):
              - down to lower junction (90,364) → right to PSV bottom-left
              - right → down to FDS solenoid (fork)
            Live (animated yellow) when PCL is in OFF position.
        ════════════════════════════════════════════ */}
        {(() => {
          const wC  = (on) => on ? '#c8c830' : '#4a6a8a';
          const wCl = (on) => on ? 'wire-anim' : undefined;
          return (<>
            {/* PMU wire: dead when PMU is OFF */}
            <path d={`M ${pclCX + 14},${pclOffY + 49} H 110 V 364`}
              fill="none" stroke={wC(psvLive)} strokeWidth={1.2} className={wCl(psvLive)} />
            {/* PCL OFF right wall → upper junction */}
            <path d={`M 59,344 H 62 A 3 3 0 0 1 68,344 H 90`}
              fill="none" stroke={wC(fdsUpstreamLive)} strokeWidth={1.2} className={wCl(fdsUpstreamLive)} />
            {/* Upper junction → down to lower junction → right to PSV: dead when PMU OFF */}
            <path d={`M 90,344 V 364 H 234`}
              fill="none" stroke={wC(psvLive)} strokeWidth={1.2} className={wCl(psvLive)} />
            {/* FDS branch: upper junction → CB left terminal */}
            <path d={`M 90,344 H 170`}
              fill="none" stroke={wC(fdsUpstreamLive)} strokeWidth={1.2} className={wCl(fdsUpstreamLive)} />
            {/* FDS branch: CB right terminal → right → down to FDS solenoid */}
            <path d={`M 180,344 H 254 V 382`}
              fill="none" stroke={wC(fdsLive)} strokeWidth={1.2} className={wCl(fdsLive)} />
            {/* Lower junction dot (PSV circuit) */}
            <circle cx={110} cy={364} r={2.5} fill={wC(psvLive)} />
            {/* Endpoint dots */}
            <circle cx={234} cy={364} r={2} fill={wC(psvLive)} />
            <circle cx={254} cy={382} r={2} fill={wC(fdsLive)} />
            {/* PROP SYS CB on FDS wire — interactive */}
            <PropCB x={175} y={344} live={fdsUpstreamLive} isOpen={cbPropSys}
              onToggle={() => setCbPropSys(v => !v)} label="PROP SYS" />
          </>);
        })()}

        {/* ════════════════════════════════════════════
            ENGINE CUTOFF GUARD  (left of PCL track)
            Hinged at bottom; rotates open when clicked.
            Stays lifted for 3 s then snaps closed.
        ════════════════════════════════════════════ */}
        <g
          onClick={handleCutoffClick}
          style={{
            transform: cutoffLifted ? 'rotate(-78deg)' : 'rotate(0deg)',
            transformOrigin: '50% 100%',
            transformBox: 'fill-box',
            transition: 'transform 0.35s ease-out',
            cursor: cutoffLifted ? 'default' : 'pointer',
          }}
        >
          {/* Guard body — red pentagonal plate */}
          <polygon
            points={`10,285 36,285 36,345 23,354 10,345`}
            fill={cutoffLifted ? '#8b1010' : '#c01818'}
            stroke={cutoffLifted ? '#5a0808' : '#e03030'}
            strokeWidth={1.2}
          />
          {/* Inner bevel highlight */}
          <polygon
            points={`14,289 32,289 32,341 23,348 14,341`}
            fill="none"
            stroke={cutoffLifted ? '#6a1010' : '#e05050'}
            strokeWidth={0.6}
            opacity={0.6}
          />
          {/* "ENGINE" label */}
          <text x={23} y={310}
            style={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, fill: '#ffffff', textAnchor: 'middle', letterSpacing: '0.04em', pointerEvents: 'none' }}>
            ENGINE
          </text>
          {/* "CUTOFF" label */}
          <text x={23} y={321}
            style={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, fill: '#ffffff', textAnchor: 'middle', letterSpacing: '0.04em', pointerEvents: 'none' }}>
            CUTOFF
          </text>
          {/* Hinge pin */}
          <circle cx={23} cy={352} r={2.5} fill="#2a3a4a" stroke="#4a6a8a" strokeWidth={0.8} />
        </g>

        {/* PCL lever — rendered after cutoff guard so it sits on top */}
        <g
          ref={pclGroupRef}
          onPointerDown={e => {
            pclDraggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            handlePclDrag(e);
          }}
          onPointerMove={e => { if (pclDraggingRef.current) handlePclDrag(e); }}
          onPointerUp={() => { pclDraggingRef.current = false; }}
          onPointerCancel={() => { pclDraggingRef.current = false; }}
          style={{ cursor: 'ns-resize', touchAction: 'none' }}
        >
          {/* Invisible hit area covering the track column — grabbing anywhere
              along it drags the lever, which the visible 40x20 handle is too
              small for on phones. Split in two so the lower part stays clear
              of the cutoff guard (x 10-36, y 285-354) to its left. */}
          <rect x={pclCX - 26} y={pclTrackTop - 14} width={52}
            height={285 - (pclTrackTop - 14)} fill="transparent" />
          <rect x={38} y={285} width={42}
            height={pclOffY + 26 - 285} fill="transparent" />
          <rect x={pclCX - 20} y={pclLeverY - 10} width={40} height={20} rx={3}
            fill="url(#pp-metal)" stroke={pcl < 0 ? '#cc2222' : C.metalLight} strokeWidth={1.2} />
          {[-6, 0, 6].map(dx => (
            <line key={dx}
              x1={pclCX + dx} y1={pclLeverY - 7}
              x2={pclCX + dx} y2={pclLeverY + 7}
              stroke={C.metalDark} strokeWidth={1} opacity={0.5} />
          ))}
        </g>
        {/* PCL % readout */}
        <text x={pclCX} y={pclOffY + 26}
          style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, fill: pcl < 0 ? '#cc2222' : C.text, textAnchor: 'middle' }}>
          {pcl < 0 ? 'OFF' : `${Math.round(pcl * 100)}%`}
        </text>

        {/* ════════════════════════════════════════════
            NP READOUT BOX  (above torque dial)
        ════════════════════════════════════════════ */}
        {(() => {
          const effectiveFault = uncommandedFeather && !cbPropSys;
          const targetOil = (pcl < 0 || effectiveFault) ? 0 : computeTargetOil(pcl);
          const propMoving = Math.abs(oil - targetOil) > 0.005;
          // oil decreasing toward lower target = power increasing; oil increasing = power decreasing
          const powerIncreasing = oil > targetOil;

          // Normal NP value (used as recovery target during fault transition)
          let normalNP;
          if (pcl < 0) {
            normalNP = Math.round(oil * 100);
          } else {
            normalNP = Math.min(100, Math.round(50 + (pcl / 0.27) * 50));
          }

          // During uncommanded feather: erroneous 20–70% range; interpolates back via tubeFill when CB pulled
          let npCorrection = 0;
          if(uncommandedFeather & oil < .3125){
            npCorrection = 0.011*bladeDelta
          } else if(pmuOff){
            npCorrection = 0.02 * Math.sign(bladeDelta)
          }
          let npPct = Math.round(normalNP*(1 - npCorrection));
          console.log(npCorrection, normalNP, npCorrection*normalNP, oil)
          const npAlert = (npPct >= 62 && npPct <= 80) || npPct >= 102;

          const bh = 26, by = 7, bw = 88, bx = TCX - bw / 2;

          return (
            <g>
              <rect x={bx} y={by} width={bw} height={bh} rx={3}
                fill={npAlert ? '#cc0000' : '#000000'} stroke="#ffffff" strokeWidth={1} />
              <text x={bx + 8} y={by + bh / 2 + 1}
                style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, fill: npAlert ? '#000000' : '#ffffff', textAnchor: 'start', dominantBaseline: 'middle', letterSpacing: '0.08em' }}>
                {`NP ${String(npPct).padStart(3)}%`}
              </text>
            </g>
          );
        })()}

        {/* ════════════════════════════════════════════
            TORQUE DIAL  (upper right)
            Gauge: 0% at 120° (lower-left), sweeps CW 300° to 60° (lower-right).
            sweep-flag=1 (CW visually in SVG y-down), large-arc=1 for 300° arc.
        ════════════════════════════════════════════ */}
        {(() => {
          const startA  = 145 * Math.PI / 180;
          const fullEndA = (95 + 300) * Math.PI / 180;
          const sx = TCX + TR * Math.cos(startA), sy = TCY + TR * Math.sin(startA);
          const ex = TCX + TR * Math.cos(fullEndA), ey = TCY + TR * Math.sin(fullEndA);
          const nex = TCX + (TR - 11) * Math.cos(needleAngle);
          const ney = TCY + (TR - 11) * Math.sin(needleAngle);
          return (<>
            {/* Outer bezel */}
            <circle cx={TCX} cy={TCY} r={TR + 9} fill="#060d14" stroke="#1a2e40" strokeWidth={1.5} />
            {/* Face */}
            <circle cx={TCX} cy={TCY} r={TR} fill="#070e16" stroke="#0a1828" strokeWidth={0.5} />
            {/* Static arc: white 0–100%, red 100–110% */}
            {(() => {
              const a100 = gaugeAngleDeg(100) * Math.PI / 180;
              const mx = TCX + TR * Math.cos(a100), my = TCY + TR * Math.sin(a100);
              return (<>
                {/* White segment: 0% → 100% (CW, large arc ~273°) */}
            <path
                  d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${TR} ${TR} 0 1 1 ${mx.toFixed(1)} ${my.toFixed(1)}`}
                  fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
                {/* Red segment: 100% → 110% (CW, small arc ~27°) */}
              <path
                  d={`M ${mx.toFixed(1)} ${my.toFixed(1)} A ${TR} ${TR} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
                  fill="none" stroke="#ff3030" strokeWidth={4} strokeLinecap="round" />
              </>);
            })()}
            {/* Tick marks + inside labels: 0, 10, 20 … 110, all uniform */}
            {Array.from({ length: 12 }, (_, i) => {
              const t = i * 10;
              const θ = gaugeAngleDeg(t) * Math.PI / 180;
              const cosθ = Math.cos(θ), sinθ = Math.sin(θ);
              // Tick: uniform length, along the arc
              const r1 = TR - 8, r2 = TR - 2;
              // Label: inset further from the arc
              const lr = TR - 13;
              return <g key={i}>
                <line
                  x1={(TCX + r1 * cosθ).toFixed(1)} y1={(TCY + r1 * sinθ).toFixed(1)}
                  x2={(TCX + r2 * cosθ).toFixed(1)} y2={(TCY + r2 * sinθ).toFixed(1)}
                  stroke={C.muted} strokeWidth={0.9} />
                <text
                  x={(TCX + lr * cosθ).toFixed(1)}
                  y={(TCY + lr * sinθ + 3).toFixed(1)}
                  style={{ fontFamily: FONT, fontSize: 6.5, fill: C.muted, textAnchor: 'middle' }}>
                  {t}
                </text>
              </g>;
            })}
            {/* Needle: white, red above 100% */}
            <line x1={TCX.toFixed(1)} y1={TCY.toFixed(1)}
              x2={nex.toFixed(1)} y2={ney.toFixed(1)}
              stroke={displayedTorque > 100 ? '#ff3030' : '#ffffff'} strokeWidth={2} strokeLinecap="round" />
            {/* Center pivot */}
            <circle cx={TCX} cy={TCY} r={4} fill={C.metal} stroke={C.metalLight} strokeWidth={0.8} />
            {/* Torque readout — matches needle; erroneous during fault, recovers with tubeFill */}
            {displayedTorque > 100 && (
              <rect x={TCX - 18} y={TCY + 17} width={36} height={26} rx={2} fill="#cc0000" />
            )}
            <text x={TCX} y={TCY + 29}
              style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, fill: '#ffffff', textAnchor: 'middle' }}>
              {displayedTorque}
            </text>
            <text x={TCX} y={TCY + 39}
              style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, fill: '#ffffff', textAnchor: 'middle' }}>
              %
            </text>
            <text x={TCX} y={TCY + 50}
              style={{ fontFamily: FONT, fontSize: 7.5, fill: '#ffffff', textAnchor: 'middle', letterSpacing: '0.1em' }}>
              TORQUE
            </text>
          </>);
        })()}

        {/* ════════════════════════════════════════════
            ROTATING BLADE ASSEMBLY  (last = on top of all other elements)
            Defined at feather (oil=0). SVG rotate() handles pitch.
            CCW rotation (negative degrees) = decreasing pitch angle.
        ════════════════════════════════════════════ */}
        <g transform={`rotate(${assemblyRot.toFixed(2)}, ${HX}, ${HY})`}>
          {/* ── PROPELLER BLADE (real airfoil planform polygon) ──
               Transform chain (applied right-to-left):
               1. translate(-59.18, 0)  — move leading edge to origin
               2. scale(0.01191, -0.01191) — 150px chord + y-flip
               3. rotate(bladeRotDeg)   — align chord with blade span direction
               4. translate(HX, HY)     — root at bore centre               */}
          <polygon
            points="12653.958671,60.214758 12017.922491,-114.348835 11382.390103,-281.48151 10112.458857,-584.133973 8843.913036,-847.742631 7577.130483,-1062.357611 6312.363095,-1215.384137 5049.988714,-1299.139397 3790.511132,-1298.635606 2534.182243,-1206.315899 1908.599728,-1085.280103 1285.158325,-902.655854 974.445205,-781.116267 664.865616,-628.089741 357.679033,-407.303321 205.786037,-243.319339 59.182846,70.290579 225.433887,325.334789 385.513488,404.178086 703.531577,495.238315 1020.164242,544.861732 1336.041219,576.726515 1967.165436,614.258947 2597.030175,620.304439 3855.500175,588.313708 5113.214489,540.075717 6370.676907,480.37648 7627.88743,413.246324 8884.72011,338.433356 10141.426841,257.448947 11398.007625,171.426629 12026.109096,125.83354 12653.958671,80.366399"
            transform={`translate(${HX+40}, ${HY+5}) rotate(${bladeRotDeg.toFixed(2)}) scale(0.01191, -0.01191) translate(-59.182846, 0)`}
            fill="url(#pp-blade)" stroke={C.bladeEdge} strokeWidth={84} opacity={0.6}
          />
        </g>{/* end rotating assembly */}
      </svg>

    </div>
    </div>
  );
}