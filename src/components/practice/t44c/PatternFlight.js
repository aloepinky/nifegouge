// The Practice Flight's pattern, flown in place of its step card and map: Pattern Work's comms,
// FTI procedures, numbers and drawing, one lap at a time. A lap flies itself; at its end (the
// touchdown, a full stop, or the wave-off the student calls between the groove and the
// touchdown) the page stops and the flight asks for the next lap.
// What is said goes into the flight log as it is said.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RUNWAYS } from './pattern/patternModel';
import { Comms, Gauges, PatternView, Procedures, WaveoffButton, frameOf } from './pattern/PatternWork';
import { buildLap, lapLog } from './patternLaps';

const SPEEDS = [1, 2, 4];

// The drawing of a lap: for the break, the approach-flap pattern it joins drawn under it.
function useLap(step) {
  const lap = useMemo(() => buildLap(step), [step]);
  const under = useMemo(() => (step.lap === 'break' ? buildLap({ ...step, lap: 'approach' }) : lap), [step, lap]);
  const runway = RUNWAYS.find((r) => r.id === step.runwayId);
  const fr = useMemo(() => frameOf(runway, under), [runway, under]);
  return { lap, under, fr, inBreak: step.lap === 'break' };
}

// `step` is the lap: flying, or (`ended`) stopped at its end while the next is chosen, at its
// wave-off if it was waved off.
export default function PatternFlight({ step, ended, onDone, onWaveoff, onSaid, view, setView, speed, setSpeed }) {
  const { lap, under, fr, inBreak } = useLap(step);
  const endT = step.waveT === undefined ? lap.duration : step.waveT;
  const [t, setT] = useState(ended ? endT : 0);
  const [playing, setPlaying] = useState(!ended);
  const live = useRef({ t: ended ? endT : 0 });
  live.current.speed = speed;
  live.current.duration = lap.duration;
  live.current.onDone = onDone;

  useEffect(() => {
    if (!playing || ended) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const v = live.current;
      v.t = Math.min(v.duration, v.t + (Math.min(250, now - last) / 1000) * v.speed);
      last = now;
      setT(v.t);
      if (v.t >= v.duration) { v.onDone(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, ended]);

  // The words said so far, for the flight log.
  const said = useMemo(() => lapLog(step, t).length, [step, t]);
  useEffect(() => { if (onSaid) onSaid(said); }, [onSaid, said]);

  // Space pauses and resumes, as on Pattern Work.
  useEffect(() => {
    if (ended) return undefined;
    const onKey = (e) => {
      if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ended]);

  // A circle on the drawing puts the aircraft there, within this lap.
  const jump = (to) => {
    if (ended) return;
    live.current.t = Math.max(0, Math.min(to, lap.duration - 0.01));
    setT(live.current.t);
  };
  const s = lap.stateAt(t);
  const single = /^(sse|case)/.test(step.lap);

  return (
    <>
      {!ended && (
        <div className="pf-pattern">
          <div className="ptw-controls">
            <button type="button" className="ptw-btn ptw-btn--go" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Resume'}</button>
            <WaveoffButton pass={lap} t={t} onWaveoff={onWaveoff} />
            <span className="pf-pattern-lap">{step.title}{single ? `, ${step.engine} engine` : ''}</span>
            <label className="ptw-field">
              <span>Speed</span>
              <select className="ptw-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((x) => <option key={x} value={x}>{x}×</option>)}
              </select>
            </label>
            <button type="button" className="ptw-btn" onClick={onDone} title="To the end of this lap">Skip lap</button>
          </div>
          <Comms pass={lap} now={t} speed={speed} />
          <Procedures pass={lap} now={t} />
        </div>
      )}
      <div className="ptw-card">
        <Gauges s={s} />
        <PatternView
          pass={under} entry={inBreak ? lap : null} inBreak={inBreak} s={s}
          onJump={inBreak ? () => {} : jump} onBreak={jump}
          fr={fr} single={single} satellite={view === 'satellite'} setView={setView} following={playing && !ended}
        />
      </div>
    </>
  );
}
