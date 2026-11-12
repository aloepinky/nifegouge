import React, { useEffect, useState, useSyncExternalStore } from 'react';
import T44CLimits from './T44C/T44CLimits';
import VoiceChecklists from './T44C/VoiceChecklists';
import { T44C_EPS, T44C_EP_NWC } from './T44C/t44cData';
import { T44C_HOLLYWOOD, T44C_MEMORY_NORMALS } from './T44C/t44cNormals';
import { T44C_CASES } from './T44C/t44cCases';
import { SCENARIOS } from './T44C/t44cEngine';
import { createT44CEngine, RANDOM } from './T44C/t44cEngineStore';
import { T44C_POSTER, T44C_ALIASES, t44cRegion } from './T44C/t44cPoster';
import ActionButtons from './epsLimits/ActionButtons';
import { PosterRegion, usePoster } from './epsLimits/CockpitPoster';
import EPDrill from './epsLimits/EPDrill';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// Advanced's EPs/Limits page: the T-44C critical action memory items one at a time, and the
// operating limits sheet, in the shell the other two schools use.
//
// The poster layout is bespoke, the way Primary's is, because the T-44C's publication is one
// 36x24" sheet of six separate sub-panels and none of them is the shape of a side column. Each
// panel is drawn WHOLE — a crop that took half a schematic would teach a panel that does not
// exist — so they are arranged the way they sit in the aeroplane instead:
//
//   * the main instrument panel across the full width of the page, above everything. It is
//     2.16:1 and the densest thing on the sheet, so it gets every pixel the page has;
//   * the fuel control panel down the LEFT, because that is the side of the cockpit it is on,
//     with the steps no panel performs as buttons beneath it;
//   * the power quadrant and the start/electrical stack down the right, in that order, which is
//     the centre console read front to back.
//
// Hint therefore sits under the left column and Skip under the right, as on Primary.
//
// NIFE keeps the shared `CockpitPoster` band, because one drawing of one cockpit needs no
// arrangement. Both schools share `usePoster` and `PosterRegion`, so a click behaves identically
// on all three pages whatever shape the page is.
//
// `nwc` is what gives this page its NWC buttons and its Auto NWC toggle, the way Primary has
// them. A school with no NWC data passes nothing and simply has neither.

const TABS = [
  { id: 'eps', label: 'EPs/Cockpit' },
  { id: 'limits', label: 'Limits' },
  // Reached only by its address, /t44c/eps-limits/voice (the user, 2026-11-12).
  { id: 'voice', label: 'Voice Checklists', hidden: true },
];

const MAIN = t44cRegion('main');
const FUEL = t44cRegion('fuel');
// The side gauge panel (suction, pneumatic and oxygen pressure). It is on the right side of the
// cockpit; it hangs under the fuel panel here because that is where the page has room, and a
// gauge on screen in the wrong corner teaches more than a button with its name on.
const GAUGES = t44cRegion('gauges');
const CONSOLE = ['quadrant', 'elec'].map(t44cRegion);

// The Abnormal Start EP as a checklist line, for the Hollywood checklists, which do not list it
// but are sent to it when a start is aborted (EPDrill `detours`).
const DETOURS = T44C_EPS.filter((e) => e.id === 'abnormal-start').map((e) => ({
  ...e,
  rows: e.rows.map((r) => {
    if (!r.text) return r;
    const [challenge, ...rest] = r.text.split(' - ');
    return { ...r, challenge, reply: rest.join(' - ') };
  }),
}));

// Each slot is its own component, not a call inside one render function: EPDrill renders a slot
// only in Full Mode, so a hook called inline in a slot function would come and go with the
// Simple/Full switch. They hold no state between them — a click reads the open step and writes
// it (epsLimits/stepFlow.js), so three copies of `usePoster` cannot disagree about anything.
const useT44CPoster = (api) => usePoster({ poster: T44C_POSTER, aliases: T44C_ALIASES, ...api });

function MainPanel(api) {
  return <PosterRegion region={MAIN} view={useT44CPoster(api)} className="epl-band-frame--fluid" />;
}

function Console(api) {
  const view = useT44CPoster(api);
  return (
    <div className="t44c-console">
      {CONSOLE.map((region) => (
        <PosterRegion key={region.id} region={region} view={view} className="epl-band-frame--fluid" />
      ))}
    </div>
  );
}

// The start procedures' own controls, while the engine model runs (T44C/t44cEngine.js), right
// above the checklist card: which start to practise, Random start (a scenario drawn afresh for
// each start, and not shown until the start is aborted or done). There is no button for the
// Abnormal Start EP (removed, the user, 2026-11-04): a second press of the condition lever
// during a start opens it (EPDrill `abortedBy`), from the Hollywood checklists too.
// Under them, what the gauges said when a step went in too early, and once the start is over,
// which start it was. Text goes here, over the card, never in the side columns, which hold
// only controls (the user, 2026-11-04). The slot keeps its height on every card, so the card
// never moves.
// Chaos, on every card the model runs (2026-11-04): the slider sets the odds that a step goes
// wrong (T44C/t44cFaults.js), and Discrepancy is how the student says it has.
// What the (i) beside Chaos says, in plain sentences (the user, 2026-11-11).
const CHAOS_INFO = [
  'Chaos sets the chance that each check on the checklist goes wrong.',
  'A light may stay dark or a gauge may read out of limits.',
  'Press Malfunction when you see one or you\'ll be told what you missed.',
  'At 100% everything that can go wrong will go wrong.',
];

function StartControls({ engine, reset, epId, engineNote, discrepancy }) {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const starting = snap.active && (epId === 'start-right' || epId === 'start-left');
  const choose = (id) => { engine.setScenario(id); reset(); };
  const said = snap.active && (engineNote || (snap.outcome && `This was a ${snap.outcome.toLowerCase()}.`));
  const odds = Math.round((snap.chaos || 0) * 100);
  return (
    <div className="t44c-start">
      <div className="t44c-start-row">
        {/* Laid out on every card the model runs and hidden off the starts, so the row wraps
            the same way everywhere and the buttons under the card never move (the user,
            2026-11-09). */}
        {snap.active && (
        <span className={`t44c-start-pick${starting ? '' : ' t44c-start-pick--off'}`} aria-hidden={!starting}>
          <label>
            Start
            <select value={snap.scenario} onChange={(e) => choose(e.target.value)} tabIndex={starting ? 0 : -1}>
              {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              <option value={RANDOM}>Random</option>
            </select>
          </label>
          <button type="button" onClick={() => choose(RANDOM)} title="A start drawn at random, and not shown"
            tabIndex={starting ? 0 : -1}>
            Random start
          </button>
        </span>
        )}
        {snap.active && (
        <>
          <label className="t44c-chaos">
            <span className="t44c-info" tabIndex={0} aria-describedby="t44c-chaos-info">
              i
              <span className="t44c-info-box" id="t44c-chaos-info" role="tooltip">
                {CHAOS_INFO.map((s) => <span key={s}>{s}</span>)}
              </span>
            </span>
            Chaos
            <input type="range" min="0" max="100" step="5" value={odds}
              onChange={(e) => engine.setChaos(Number(e.target.value) / 100)} />
            <span className="t44c-chaos-value">{odds}%</span>
          </label>
          <button type="button" onClick={discrepancy}>Malfunction</button>
        </>
        )}
      </div>
      {snap.active && <p className="t44c-start-note" role="status">{said || ''}</p>}
    </div>
  );
}

function LeftSide(api) {
  const view = useT44CPoster(api);
  return (
    <div className="t44c-console">
      <PosterRegion region={FUEL} view={view} className="epl-band-frame--fluid" />
      <PosterRegion region={GAUGES} view={view} className="epl-band-frame--fluid" />
      <ActionButtons actions={T44C_POSTER.actions.filter((a) => api.mixed || (api.normalProcedure ? !a.ep : !a.normal))}
        aliases={T44C_ALIASES} {...api} />
    </div>
  );
}

// The EPs, with a button ("All Memory Procedures") that adds the normal procedures the
// publications say are done from memory (start, the full anti-ice/deice check, waveoff,
// pre-stall checks), and every normal checklist read as the FTI's Appendix F "Hollywood
// Checklist" runs them, the way Primary reads its Quadfold. With that button on, every card
// shows both kinds of cockpit button. See T44C/t44cNormals.js for the sources.
const SETS = [
  {
    id: 'eps',
    label: 'EPs',
    eps: T44C_EPS,
    nwc: T44C_EP_NWC,
    title: 'T-44C INTERACTIVE COCKPIT',
    footnote: '* DENOTES CRITICAL ACTION MEMORY ITEMS · † REQUIRES CONCURRENCE OF BOTH PILOTS',
    extra: { label: 'All Memory Procedures', eps: T44C_MEMORY_NORMALS },
  },
  {
    // `crew`: a box beside the card for whoever does the open step (EPDrill).
    id: 'hollywood', label: 'Hollywood', eps: T44C_HOLLYWOOD, nwc: null, normal: true, read: true, sequential: true, crew: true,
    title: 'T-44C INTERACTIVE COCKPIT', footnote: '* PERFORMED FROM MEMORY · # ABBREVIATED CHECKLIST ITEM',
  },
  // The SSE cases (T44C/t44cCases.js), typed from memory like the EPs, with each
  // step's spoken call shown once the step is in (`calls`). Also opened from Engine Failure After
  // Takeoff and the Emergency Shutdown Checklist (`practice` in t44cData.js).
  {
    id: 'cases', label: 'SSE Cases', eps: T44C_CASES, nwc: null, calls: true, sequential: true,
    title: 'T-44C SSE CASES', footnote: '* DENOTES CRITICAL ACTION MEMORY ITEMS · † REQUIRES CONCURRENCE OF BOTH PILOTS',
  },
];

function T44CEPs(game) {
  // One model for the page, so a start carries on into the Abnormal Start EP and back.
  const [engine] = useState(createT44CEngine);
  useEffect(() => () => engine.dispose(), [engine]);
  return (
    <EPDrill
      {...game}
      engine={engine}
      detours={DETOURS}
      sets={SETS}
      aliases={T44C_ALIASES}
      sideWidth={[300, 300]}
      top={(api) => <MainPanel {...api} />}
      above={(api) => (api.engine ? <StartControls {...api} /> : null)}
      left={(api) => <LeftSide {...api} />}
      right={(api) => <Console {...api} />}
    />
  );
}

function T44CEPsLimits() {
  return (
    <EPsLimitsShell
      school="Advanced"
      basePath="/t44c/eps-limits"
      tabs={TABS}
      epsTab="eps"
      limitsTab="limits"
      renderTab={(tab, game) => (tab === 'limits' ? <T44CLimits {...game} />
        : tab === 'voice' ? <VoiceChecklists /> : <T44CEPs {...game} />)}
    />
  );
}

export default T44CEPsLimits;
