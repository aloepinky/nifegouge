// /t44c/pattern — a T-44C flying touch-and-goes around a 5,000 ft runway in real time, saying
// the calls and doing the FTI's procedures as it goes. The model is patternModel.js; this is
// its page: the pattern drawn from above, the gauges, the stopwatch laps, and the script.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ABEAM, CALL_SIGN, CYCLE, EVENTS, FINAL_X, LAPS, MARKS, R, RUNWAY, TURN_X, stateAt, track, vsiAt,
} from './patternModel';
import CLIPS from '../../../T44C/voiceClips.json';

const SPEEDS = [1, 2, 4];
const SEATS = [['none', 'Watch'], ['PF', 'I say the PF lines'], ['PM', 'I say the PM lines']];
const refText = (r) => [r.work, r.loc, r.pages].filter(Boolean).join(', ');
const clipFor = (e) => {
  const file = CLIPS.clips[`${e.who}|${e.text}`];
  return file ? `${process.env.PUBLIC_URL || ''}/voice/t44c/${file}` : null;
};
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

const mmss = (s) => {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${String(m).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`;
};
const ss = (s) => s.toFixed(2);

// ---- Drawing. Feet, with the landing direction to the right and the pattern above.
const PAD = 900;
const VIEW = {
  x: FINAL_X - R - PAD,
  y: -(ABEAM + PAD),
  w: TURN_X + R - (FINAL_X - R) + 2 * PAD,
  h: ABEAM + 2 * PAD + 300,
};
const PATH = (() => {
  const pts = track(0.5);
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(0)} ${(-y).toFixed(0)}`).join(' ');
})();
// A T-44 from above, nose to the right, about three times its size so it can be seen.
const PLANE = 'M260 0 L200 -22 L60 -26 L30 -250 L-20 -250 L-30 -26 L-150 -20 L-190 -95 L-225 -95 L-215 0 L-225 95 L-190 95 L-150 20 L-30 26 L-20 250 L30 250 L60 26 L200 22 Z';
const LABEL_OFFSET = {
  touchdown: [60, 330, 'end'],
  rotate: [-20, 330, 'start'],
  props1900: [0, 330, 'middle'],
  crosswind: [260, 120, 'start'],
  downwind: [260, -160, 'start'],
  greens: [0, -260, 'middle'],
  approachTurn: [-120, -260, 'end'],
  the90: [200, 80, 'start'],
  final: [0, 330, 'middle'],
};

const STATIC_MAP = (
  <>
    <rect className="ptw-ground" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} />
    <path className="ptw-track" d={PATH} />
    <g>
      <rect className="ptw-runway" x={0} y={-RUNWAY.width / 2} width={RUNWAY.length} height={RUNWAY.width} />
      <line className="ptw-centerline" x1={260} y1={0} x2={RUNWAY.length - 260} y2={0} />
      <text className="ptw-rwy-number" x={150} y={0} transform={`rotate(90 150 0)`}>{RUNWAY.number}</text>
      <text className="ptw-rwy-number" x={RUNWAY.length - 150} y={0} transform={`rotate(-90 ${RUNWAY.length - 150} 0)`}>{RUNWAY.reciprocal}</text>
    </g>
    <g className="ptw-dim">
      <line x1={(TURN_X + FINAL_X) / 2} y1={-RUNWAY.width} x2={(TURN_X + FINAL_X) / 2} y2={-ABEAM + 120} />
      <text x={(TURN_X + FINAL_X) / 2 + 120} y={-ABEAM / 2}>{(ABEAM / 6076).toFixed(2)} nm abeam</text>
    </g>
  </>
);

function Marks({ now }) {
  return MARKS.map((m) => {
    const [dx, dy, anchor] = LABEL_OFFSET[m.id] || [0, -240, 'middle'];
    const passed = now >= EVENTS.find((e) => e.id === m.id).t;
    return (
      <g key={m.id} className={passed ? 'ptw-mark ptw-mark--passed' : 'ptw-mark'}>
        <circle cx={m.x} cy={-m.y} r={70} />
        <text x={m.x + dx} y={-m.y + dy} textAnchor={anchor}>{m.label}</text>
      </g>
    );
  });
}

function PatternMap({ s }) {
  const rot = -(s.psi * 180) / Math.PI;
  // The shadow falls behind and below as the aircraft climbs.
  const sh = Math.min(1, s.alt / 800) * 260;
  return (
    <svg className="ptw-map" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img"
      aria-label={`The pattern from above: ${s.lap.name}, ${Math.round(s.alt)} feet, ${Math.round(s.kias)} knots`}>
      {STATIC_MAP}
      <Marks now={s.t} />
      <g transform={`translate(${s.x + sh * 0.6} ${-s.y + sh}) rotate(${rot}) scale(1.6)`}>
        <path className="ptw-plane-shadow" d={PLANE} />
      </g>
      <g transform={`translate(${s.x} ${-s.y}) rotate(${rot}) rotate(0) scale(${1.6 + s.alt / 2000})`}>
        <path className="ptw-plane" d={PLANE} />
      </g>
    </svg>
  );
}

// ---- Readouts.
function Gauges({ s }) {
  const vsi = Math.round(vsiAt(s.t) / 50) * 50;
  const cells = [
    ['Airspeed', `${Math.round(s.kias)}`, 'KIAS'],
    ['Altitude', `${Math.max(0, Math.round(s.alt / 10) * 10)}`, 'ft AGL'],
    ['Vertical speed', `${vsi > 0 ? '+' : ''}${vsi}`, 'ft/min'],
    ['Bank', `${Math.round(s.aob)}°`, s.aob >= 1 ? 'left' : ''],
    ['Heading', String(Math.round(s.hdg) || 360).padStart(3, '0'), ''],
    ['Flaps', s.flaps, ''],
    ['Gear', s.gear, '3 green'],
    ['Prop levers', s.props, ''],
    ['Power', s.power, ''],
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

// ---- The stopwatch: this pass's laps against the two passes timed.
function Stopwatch({ s, pass, onJump }) {
  return (
    <div className="ptw-card">
      <div className="ptw-watch">
        <span className="ptw-watch-time">{mmss(s.t)}</span>
        <span className="ptw-watch-pass">Pass {pass}</span>
      </div>
      <table className="ptw-laps">
        <thead>
          <tr><th scope="col">Lap</th><th scope="col">Now</th><th scope="col">Pass 1</th><th scope="col">Pass 2</th></tr>
        </thead>
        <tbody>
          {LAPS.map((l) => {
            const live = l === s.lap;
            const done = s.t >= l.end;
            return (
              <tr key={l.id} className={live ? 'ptw-lap ptw-lap--now' : 'ptw-lap'}>
                <th scope="row"><button type="button" className="ptw-link" onClick={() => onJump(l.start)} title={`Start at ${l.name}`}>{l.name}</button></th>
                <td>{done ? ss(l.dur) : live ? ss(s.t - l.start) : ''}</td>
                <td>{ss(l.times[0])}</td>
                <td>{ss(l.times[1])}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr><th scope="row">Pattern</th><td>{ss(CYCLE)}</td><td>{ss(LAPS.reduce((n, l) => n + l.times[0], 0))}</td><td>{ss(LAPS.reduce((n, l) => n + l.times[1], 0))}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---- The script, by lap, the line now said lit.
const BY_LAP = LAPS.map((l) => ({ lap: l, events: EVENTS.filter((e) => e.t >= l.start && e.t < l.end) }));

function Script({ now, onJump, listRef }) {
  const lastIdx = EVENTS.reduce((n, e, i) => (e.t <= now ? i : n), -1);
  const current = EVENTS[lastIdx];
  return (
    <div className="ptw-card ptw-script" ref={listRef}>
      {BY_LAP.map(({ lap, events }) => (
        <section key={lap.id} className="ptw-script-lap">
          <h3 className="ptw-script-head">{lap.name}</h3>
          <ol>
            {events.map((e) => (
              <li key={e.id} data-now={e === current ? 'true' : undefined}
                className={`ptw-line ptw-line--${e.who.toLowerCase()}${e.kind === 'do' ? ' ptw-line--do' : ''}${e === current ? ' ptw-line--now' : e.t > now ? ' ptw-line--ahead' : ''}`}>
                <button type="button" className="ptw-line-time" onClick={() => onJump(e.t)} title="Start here">{e.t.toFixed(1)}</button>
                <span className="ptw-who">{e.who}</span>
                <span className="ptw-said">
                  {e.kind === 'say' ? `“${e.text}”` : e.text}
                  {e.note && <span className="ptw-note">{e.note}</span>}
                  <span className="ptw-ref">{e.technique ? 'Technique' : e.generated ? 'Generated comms' : e.ref ? refText(e.ref) : ''}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

// ---- Voice: the recorded clip of a line where there is one, else the browser's voice.
function useVoice() {
  const queue = useRef([]);
  const busy = useRef(false);
  const audio = useRef(null);
  const next = useCallback(() => {
    const item = queue.current.shift();
    if (!item) { busy.current = false; return; }
    // A line more than a few seconds late is dropped rather than said out of place.
    if (performance.now() - item.at > 4000) { next(); return; }
    busy.current = true;
    const done = () => next();
    const clip = clipFor(item.e);
    const tts = () => {
      if (!canSpeak) { setTimeout(done, 600); return; }
      const u = new SpeechSynthesisUtterance(item.e.text.replace(/MNTNA/g, 'Montana'));
      u.rate = 1.1;
      u.pitch = { PF: 0.9, PM: 1, OBS: 1.2, Tower: 1.1 }[item.e.who] || 1;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    };
    if (clip) {
      if (!audio.current) audio.current = new Audio();
      const a = audio.current;
      a.onended = done;
      a.onerror = () => { a.onerror = null; a.onended = null; tts(); };
      a.src = clip;
      a.play().catch(() => { a.onended = null; a.onerror = null; tts(); });
    } else tts();
  }, []);
  const say = useCallback((e) => {
    queue.current.push({ e, at: performance.now() });
    if (!busy.current) next();
  }, [next]);
  const hush = useCallback(() => {
    queue.current = [];
    busy.current = false;
    if (audio.current) { audio.current.onended = null; audio.current.pause(); }
    if (canSpeak) window.speechSynthesis.cancel();
  }, []);
  return { say, hush };
}

export default function PatternWork() {
  const [t, setT] = useState(0);
  const [pass, setPass] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sound, setSound] = useState(true);
  const [seat, setSeat] = useState('none');
  const live = useRef({ t: 0, pass: 1, speed, sound, seat });
  live.current.speed = speed;
  live.current.sound = sound;
  live.current.seat = seat;
  const { say, hush } = useVoice();
  const listRef = useRef(null);

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.25, (now - last) / 1000) * live.current.speed;
      last = now;
      const from = live.current.t;
      let to = from + dt;
      let wrapped = false;
      if (to >= CYCLE) { to -= CYCLE; wrapped = true; }
      // Every line crossed this frame is said, unless it is the student's own.
      const v = live.current;
      if (v.sound && v.speed === 1) {
        const crossed = EVENTS.filter((e) => e.kind === 'say' && e.who !== v.seat && (wrapped ? e.t > from || e.t <= to : e.t > from && e.t <= to));
        crossed.forEach(say);
      }
      live.current.t = to;
      if (wrapped) { live.current.pass += 1; setPass(live.current.pass); }
      setT(to);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, say]);

  useEffect(() => { if (!playing || !sound || speed !== 1) hush(); }, [playing, sound, speed, hush]);
  useEffect(() => hush, [hush]);

  const jump = useCallback((to) => {
    hush();
    // A hair before the line, so it is said as it is passed.
    live.current.t = Math.max(0, to - 0.05);
    setT(live.current.t);
    setPlaying(true);
  }, [hush]);
  const restart = () => { hush(); live.current.t = 0; live.current.pass = 1; setPass(1); setT(0); setPlaying(false); };

  // Space plays and pauses.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The line being said kept in view in the script, scrolling only the script.
  const s = useMemo(() => stateAt(t), [t]);
  const nowId = EVENTS.reduce((n, e) => (e.t <= t ? e.id : n), null);
  useEffect(() => {
    const box = listRef.current;
    const el = box && box.querySelector('[data-now="true"]');
    if (!el || !playing) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 40 || top > box.scrollTop + box.clientHeight - 80) box.scrollTo({ top: top - 60, behavior: 'smooth' });
  }, [nowId, playing]);

  return (
    <div className="ptw-page">
      <div className="ptw-head">
        <h1 className="ptw-title">Pattern Work</h1>
        <p className="ptw-intro">
          Touch-and-goes on runway {RUNWAY.number} at {RUNWAY.field}, left traffic, 5,000 ft, no wind, flown in the time a student
          took (the mean of two timed passes). The calls are said as they come; the PM and Tower are on the radio as {CALL_SIGN}.
        </p>
      </div>
      <div className="ptw-controls">
        <button type="button" className="ptw-btn ptw-btn--go" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : t > 0 ? 'Resume' : 'Fly'}</button>
        <button type="button" className="ptw-btn" onClick={restart}>Restart</button>
        <label className="ptw-field">
          <span>Speed</span>
          <select className="ptw-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((x) => <option key={x} value={x}>{x}×</option>)}
          </select>
        </label>
        <label className="ptw-field">
          <span>Seat</span>
          <select className="ptw-select" value={seat} onChange={(e) => setSeat(e.target.value)}>
            {SEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="ptw-check">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
          <span>Sound{speed !== 1 ? ' (at 1× only)' : ''}</span>
        </label>
      </div>
      <div className="ptw-body">
        <div className="ptw-main">
          <div className="ptw-card ptw-map-card">
            <div className="ptw-now">
              <span className="ptw-now-lap">{s.lap.name}</span>
              <span className="ptw-now-next">next: {s.lap.ends} in {(s.lap.end - s.t).toFixed(1)} s</span>
            </div>
            <PatternMap s={s} />
            <Gauges s={s} />
          </div>
          <Stopwatch s={s} pass={pass} onJump={jump} />
        </div>
        <Script now={t} onJump={jump} listRef={listRef} />
      </div>
    </div>
  );
}
