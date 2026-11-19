// /t44c/pattern — a T-44C flying the VFR landing pattern round a 5,000 ft runway in real time,
// with the crew's calls and the FTI's procedures popping up as they happen. The model is
// patternModel.js; this is its page: the pattern type, the flight's numbers in one line, the
// PF, PM and radio boxes, and the pattern drawn from above.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ABEAM, CALL_SIGN, GEOMETRY, RUNWAY, SCENARIOS, buildPass } from './patternModel';

const SPEEDS = [1, 2, 4];
const { GROOVE_X, R, TURN_X } = GEOMETRY;

// ---- The T-44C from above, in feet, nose to the right: white, with the international orange
// of the Navy trainer on the nose, wingtips and tail.
const FUSELAGE = 'M17 0C17-1.6 15-2.4 12-2.5L-6-2.6C-11-2.4-15-1.2-18.5-0.5L-18.5 0.5C-15 1.2-11 2.4-6 2.6L12 2.5C15 2.4 17 1.6 17 0Z';
const NOSE = 'M17 0C17-1.6 15.5-2.3 14-2.4L14 2.4C15.5 2.3 17 1.6 17 0Z';
const TAILCONE = 'M-11-2.05C-14-1.4-16-0.9-18.5-0.5L-18.5 0.5C-16 0.9-14 1.4-11 2.05Z';
const WINDSHIELD = 'M12.3-2.1L10.4-2.3L10.4 2.3L12.3 2.1Q12.9 0 12.3-2.1Z';
const WING = 'M3.5-2.5L1.8-25.1Q0-25.5-1.8-25.1L-3.5-2.5L-3.5 2.5L-1.8 25.1Q0 25.5 1.8 25.1L3.5 2.5Z';
const TIPS = 'M2.64-14L1.8-25.1Q0-25.5-1.8-25.1L-2.41-17ZM2.64 14L1.8 25.1Q0 25.5-1.8 25.1L-2.41 17Z';
const nacelle = (y) => `M10.8 ${y}C10.8 ${y - 1.1} 10 ${y - 1.6} 9 ${y - 1.6}L-3 ${y - 1.6}C-4.5 ${y - 1.4}-5.5 ${y - 0.6}-6 ${y}C-5.5 ${y + 0.6}-4.5 ${y + 1.4}-3 ${y + 1.6}L9 ${y + 1.6}C10 ${y + 1.6} 10.8 ${y + 1.1} 10.8 ${y}Z`;
const STAB = 'M-13.5-0.6L-15.5-8.6Q-16.6-8.9-17.6-8.6L-17.8-0.6L-17.8 0.6L-17.6 8.6Q-16.6 8.9-15.5 8.6L-13.5 0.6Z';
const FIN = 'M-10.5 0L-13-0.45L-18.8-0.3L-18.8 0.3L-13 0.45Z';
const SILHOUETTE = `${WING} ${STAB} ${FUSELAGE} ${nacelle(-8.2)} ${nacelle(8.2)}`;

// A prop turning (a blur), or stopped where an engine is out.
function Prop({ y, stopped }) {
  return stopped
    ? <line className="ptw-ac-blade" x1={11} y1={y - 3.9} x2={11} y2={y + 3.9} />
    : <ellipse className="ptw-ac-disc" cx={11} cy={y} rx={0.5} ry={3.9} />;
}

function T44C({ aob, dead }) {
  // Seen from above, a banked wing is foreshortened.
  const k = Math.cos((aob * Math.PI) / 180);
  return (
    <g transform={`scale(1 ${k.toFixed(3)})`}>
      <path className="ptw-ac-white" d={WING} />
      <path className="ptw-ac-orange" d={TIPS} />
      <path className="ptw-ac-orange" d={STAB} />
      <path className="ptw-ac-white" d={nacelle(-8.2)} />
      <path className="ptw-ac-white" d={nacelle(8.2)} />
      <path className="ptw-ac-white" d={FUSELAGE} />
      <path className="ptw-ac-orange" d={NOSE} />
      <path className="ptw-ac-orange" d={TAILCONE} />
      <path className="ptw-ac-orange" d={FIN} />
      <path className="ptw-ac-glass" d={WINDSHIELD} />
      {/* The left engine is -y here: up the page when heading right. */}
      <Prop y={-8.2} stopped={dead === 'left'} />
      <Prop y={8.2} stopped={dead === 'right'} />
    </g>
  );
}

// ---- The pattern from above. Feet, landing direction to the right, the pattern above.
const PAD = 800;
const LEFT = GROOVE_X - R - PAD;
// Case 2's wings-level pause carries the crosswind turn out a little further.
const VIEW = { x: LEFT, y: -(ABEAM + PAD), w: TURN_X + R + 1500 - LEFT, h: ABEAM + 2 * PAD + 200 };
const AC_SCALE = 26;
const LABEL_AT = {
  touchdown: [-40, 380, 'start'],
  rotate: [0, -300, 'middle'],
  p300: [0, 380, 'middle'],
  crosswind: [300, 0, 'start'],
  downwind: [0, -300, 'middle'],
  the180: [0, -300, 'middle'],
  the90: [260, 90, 'start'],
  groove: [-150, -300, 'end'],
  fail: [0, -300, 'middle'],
  fullstop: [0, -300, 'middle'],
  waveoff: [0, 380, 'middle'],
  waveoffEnd: [0, 380, 'middle'],
};

// The notes from the user's pattern sketch, where the sketch puts them (its bank angles left
// off while they are in dispute).
const NOTE_LINE = 300;
const NOTES = [
  { x: 4300, y: 2300, anchor: 'start', lines: ['Upwind and crosswind', '300 ft: props 1900', '400 ft: “Clear left, going left”', '500 ft: turn', '600 ft: “Speed check, flaps approach,', '     Landing Checklist”'] },
  { x: 2400, y: 5500, anchor: 'middle', lines: ['Downwind: happy time', 'Landing Checklist, spacing, trim'] },
  { x: -3300, y: 4300, anchor: 'start', lines: ['The 180', 'Power, pitch, trim, turn, talk', '4 sec up trim, stare at the PFD', '~250 ft-lbs'] },
  { x: -3300, y: 2300, anchor: 'start', lines: ['The 90, 500 ft', '“Down and locked”', 'Look at the runway now'] },
  { x: -3300, y: 900, anchor: 'start', lines: ['300-200 ft', '“Props full forward…”'] },
  { x: -800, y: -380, anchor: 'middle', lines: ['~2 football fields'] },
];

function Notes() {
  return (
    <g className="ptw-notes">
      {NOTES.map((n) => (
        <text key={n.lines[0]} x={n.x} y={-n.y} textAnchor={n.anchor}>
          {n.lines.map((l, i) => (
            <tspan key={l} x={n.x} dy={i ? NOTE_LINE : 0} className={i === 0 ? 'ptw-note-head' : undefined}>{l}</tspan>
          ))}
        </text>
      ))}
    </g>
  );
}

// The torque the user sets at those marks, two engines only, beside their names.
const TORQUE = { crosswind: '1000 ft-lbs', downwind: '600 ft-lbs' };

function PatternMap({ pass, s, onJump, single }) {
  const path = useMemo(() => pass.track.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(0)} ${(-y).toFixed(0)}`).join(' '), [pass]);
  const rot = -(s.psi * 180) / Math.PI;
  const lift = Math.min(1, s.alt / 800);
  const dead = /simulated feather|failed/.test(s.engines) ? pass.engine : null;
  const squash = Math.cos((s.aob * Math.PI) / 180).toFixed(3);
  return (
    <svg className="ptw-map" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img"
      aria-label={`The pattern from above. ${s.phase}, ${Math.round(s.alt)} feet, ${Math.round(s.kias)} knots`}>
      <rect className="ptw-ground" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} />
      <path className="ptw-track" d={path} />
      <rect className="ptw-runway" x={0} y={-RUNWAY.width / 2} width={RUNWAY.length} height={RUNWAY.width} />
      <line className="ptw-centerline" x1={300} y1={0} x2={RUNWAY.length - 300} y2={0} />
      <text className="ptw-rwy-number" x={150} y={0} transform="rotate(90 150 0)">{RUNWAY.number}</text>
      <text className="ptw-rwy-number" x={RUNWAY.length - 150} y={0} transform={`rotate(-90 ${RUNWAY.length - 150} 0)`}>{RUNWAY.reciprocal}</text>
      <g className="ptw-dim">
        <line x1={1600} y1={-RUNWAY.width} x2={1600} y2={-ABEAM + 150} />
        <text x={1760} y={-ABEAM / 2}>1 nm</text>
      </g>
      <Notes />
      {pass.marks.map((m) => {
        const [dx, dy, anchor] = LABEL_AT[m.key] || [0, -300, 'middle'];
        return (
          <g key={`${m.key}-${m.t}`} className={`ptw-mark${s.t >= m.t ? ' ptw-mark--passed' : ''}${m.key === 'fail' ? ' ptw-mark--fail' : ''}`}
            role="button" tabIndex={0} aria-label={`Go to ${m.label}`}
            onClick={() => onJump(m.t)}
            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onJump(m.t); } }}>
            <title>{`Go to ${m.label}`}</title>
            <circle className="ptw-mark-hit" cx={m.x} cy={-m.y} r={320} />
            <circle className="ptw-mark-dot" cx={m.x} cy={-m.y} r={80} />
            <text x={m.x + dx} y={-m.y + dy} textAnchor={anchor}>
              {m.label}
              {!single && TORQUE[m.key] && <tspan className="ptw-mark-torque"> {TORQUE[m.key]}</tspan>}
            </text>
          </g>
        );
      })}
      <g className="ptw-ac-shadow" transform={`translate(${s.x + lift * 220} ${-s.y + lift * 380}) rotate(${rot}) scale(${AC_SCALE})`}>
        <path d={SILHOUETTE} transform={`scale(1 ${squash})`} />
      </g>
      <g transform={`translate(${s.x} ${-s.y}) rotate(${rot}) scale(${AC_SCALE * (1 + lift * 0.18)})`}>
        <T44C aob={s.aob} dead={dead} />
      </g>
    </svg>
  );
}

// ---- The flight's numbers, a box each.
function Gauges({ s, single }) {
  // In scan order: power, attitude, then airspeed and altitude.
  const cells = [
    ['Power', s.power, ''],
    ['AOB', `${Math.round(s.aob)}°`, ''],
    ['Nose', `${s.pitch >= 0.5 ? '+' : ''}${Math.round(s.pitch)}°`, ''],
    ['Airspeed', Math.round(s.kias), 'KIAS'],
    ['Altitude', Math.max(0, Math.round(s.alt / 10) * 10), 'ft AGL'],
    ['Heading', String(Math.round(s.hdg) || 360).padStart(3, '0'), ''],
    ['Flaps', s.flaps, ''],
    ['Gear', s.gear, ''],
    ['Prop levers', s.props, ''],
    ...(single ? [['Engines', s.engines, '']] : []),
  ];
  return (
    <dl className="ptw-gauges">
      {cells.map(([k, v, unit]) => (
        <div key={k} className="ptw-gauge">
          <dt>{k}</dt>
          <dd><span className="ptw-gauge-value">{v}</span>{unit && <span className="ptw-gauge-unit"> {unit}</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---- The boxes. A line shows for as long as it takes to read, a box only while it has one.
const holdOf = (e) => e.hold || (e.kind === 'say'
  ? Math.min(6, Math.max(2.2, 1.4 + e.text.length * 0.055))
  : Math.min(6, Math.max(3, 2.2 + e.text.length * 0.03)));
const LEAVE = 0.3;

function Box({ lines, now, cls, label, speed }) {
  if (!lines.length) return null;
  return (
    <div className={`ptw-box ${cls}`}>
      <span className="ptw-box-who">{label}</span>
      {lines.map((e) => {
        const leaving = now > e.t + (holdOf(e) - LEAVE) * speed;
        return (
          <p key={`${e.t}-${e.text}`} className={`ptw-box-line${e.kind === 'do' ? ' ptw-box-line--do' : ''}${leaving ? ' ptw-box-line--leaving' : ''}`}>
            {e.from && <span className="ptw-box-from">{e.from}: </span>}
            {e.kind === 'say' ? `“${e.text}”` : e.text}
            {e.note && <span className="ptw-box-note"> {e.note}</span>}
            {e.technique && <span className="ptw-box-tag">Technique</span>}
            {e.generated && <span className="ptw-box-tag">Generated comms</span>}
          </p>
        );
      })}
    </div>
  );
}

// The crew's words and the radio. Tower's box sits over the crew's: no one in the cockpit
// talks while the radio does.
function Comms({ pass, now, speed }) {
  // A line's time on screen is in wall seconds, so it reads as long at 4×.
  const live = pass.events.filter((e) => e.kind === 'say' && now >= e.t && now < e.t + holdOf(e) * speed);
  const last2 = (xs) => xs.slice(-2);
  const radio = last2(live.filter((e) => e.radio).map((e) => ({ ...e, from: e.who === 'Tower' ? `${RUNWAY.field} Tower` : CALL_SIGN })));
  const pf = last2(live.filter((e) => !e.radio && e.who === 'PF'));
  const pm = last2(live.filter((e) => !e.radio && e.who === 'PM'));
  return (
    <div className="ptw-comms" aria-live="polite">
      <div className="ptw-comms-pf"><Box lines={pf} now={now} cls="ptw-box--pf" label="PF" speed={speed} /></div>
      <div className="ptw-comms-pm"><Box lines={pm} now={now} cls="ptw-box--pm" label="PM" speed={speed} /></div>
      {radio.length > 0 && <div className="ptw-comms-radio"><Box lines={radio} now={now} cls="ptw-box--radio" label="Tower" speed={speed} /></div>}
    </div>
  );
}

// The FTI's procedure being flown, always on: the newest step and the one before it.
const refText = (r) => [r.work, r.loc, r.pages].filter(Boolean).join(', ');
function Procedures({ pass, now }) {
  const done = pass.events.filter((e) => e.kind === 'do' && e.t <= now);
  const shown = done.length ? done.slice(-2) : pass.events.filter((e) => e.kind === 'do').slice(0, 1);
  return (
    <div className="ptw-fti" aria-live="polite">
      <span className="ptw-box-who">FTI procedures</span>
      {shown.map((e, i) => (
        <p key={`${e.t}-${e.text}`} className={i === shown.length - 1 ? 'ptw-fti-line ptw-fti-line--now' : 'ptw-fti-line'}>
          <span className="ptw-fti-who">{e.who}</span>
          <span className="ptw-fti-text">{e.text}</span>
          {e.ref && <span className="ptw-fti-ref">{refText(e.ref)}</span>}
        </p>
      ))}
    </div>
  );
}

export default function PatternWork() {
  const [scenario, setScenario] = useState('approach');
  const [engine, setEngine] = useState('left');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const model = useMemo(() => buildPass(scenario, engine), [scenario, engine]);
  const live = useRef({ t: 0 });
  live.current.speed = speed;
  live.current.duration = model.duration;

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const v = live.current;
      v.t += (Math.min(250, now - last) / 1000) * v.speed;
      last = now;
      if (v.t >= v.duration) v.t = 0; // round again
      setT(v.t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // A circle on the drawing puts the aircraft there; the pass carries on if it was flying.
  const jump = (to) => { live.current.t = Math.min(to, model.duration - 0.01); setT(live.current.t); };
  // A new pattern starts from its beginning.
  useEffect(() => { live.current.t = 0; setT(0); }, [scenario, engine]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const s = model.stateAt(t);
  const single = scenario === 'sse' || scenario.startsWith('case');

  return (
    <div className="ptw-page">
      <div className="ptw-controls">
        <label className="ptw-field">
          <span>Pattern</span>
          <select className="ptw-select" value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        {single && (
          <label className="ptw-field">
            <span>Engine</span>
            <select className="ptw-select" value={engine} onChange={(e) => setEngine(e.target.value)}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
        )}
        <button type="button" className="ptw-btn ptw-btn--go" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : t > 0 ? 'Resume' : 'Fly'}</button>
        <label className="ptw-field">
          <span>Speed</span>
          <select className="ptw-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((x) => <option key={x} value={x}>{x}×</option>)}
          </select>
        </label>
      </div>
      <Comms pass={model} now={t} speed={speed} />
      <Procedures pass={model} now={t} />
      <div className="ptw-card">
        <Gauges s={s} single={single} />
        <PatternMap pass={model} s={s} onJump={jump} single={single} />
      </div>
      <p className="ptw-foot">
        Runway {RUNWAY.number} at {RUNWAY.field}, 5,000 ft, left traffic, no wind. ME FTI §106 Pattern Work, Figures 1-3, 1-4 and 1-6.
      </p>
    </div>
  );
}
