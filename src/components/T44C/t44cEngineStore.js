import { blinking, bothRunning, gate, gateOf, initial, input, lights, MODEL_LIGHTS, outcome, PROCEDURES, readouts, SCENARIOS, settled, startLeftFrom, step, STARTER_LIMIT, STEP_EVENTS, stopwatch } from './t44cEngine';

// t44cEngine.js run against the clock, for EPDrill: the drill says which procedure is open and
// which step's control went in, and the poster subscribes to what the windows and lights show
// (epsLimits/CockpitPoster.js, through useSyncExternalStore). The clock ticks only while a
// start procedure is open and the engines are still changing, and only the poster's overlay
// re-renders on a tick, never the drill.
//
// The scenario the student picked is kept in the browser (`t44cStartScenario`), and applies to
// the engine the next start procedure starts. `random` picks one of them afresh for each start
// and does not say which while the start runs: the snapshot carries the choice, and the
// scenario drawn only as `outcome`, once the start is aborted or done.

const KEY = 't44cStartScenario';
export const RANDOM = 'random';
const draw = (choice) => (choice === RANDOM
  ? SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)].id
  : choice);
const TICK_MS = 100;
const TIMED = new Set(['start-right', 'start-left', 'abnormal-start']);

const readScenario = () => {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === RANDOM || SCENARIOS.some((s) => s.id === v) ? v : 'normal';
  } catch {
    return 'normal';
  }
};

export function createT44CEngine() {
  let scenario = readScenario();
  let procedure = null;
  let state = null;
  let snapshot = { active: false };
  let timer = null;
  let last = 0;
  const listeners = new Set();

  const publish = () => {
    snapshot = state && procedure
      ? { active: true, procedure, scenario, outcome: outcome(state), readouts: readouts(state), lights: lights(state), blinking: blinking(state), drives: MODEL_LIGHTS,
        highlight: state.highlight ?? null,
        // The stopwatch only on the starts, which time their starters (the user, 2026-11-04).
        stopwatch: TIMED.has(procedure) ? stopwatch(state) : null, starterLimit: STARTER_LIMIT }
      : { active: false, scenario };
    listeners.forEach((l) => l());
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const tick = () => {
    const now = performance.now();
    // A tab in the background is given a tick a second or less; a long gap is still integrated
    // (in tenth-second steps) so the start has moved on as far as the clock has.
    state = step(state, Math.min(60, (now - last) / 1000));
    last = now;
    publish();
    if (settled(state)) stop();
  };

  const run = () => {
    if (timer || !state) return;
    last = performance.now();
    timer = setInterval(tick, TICK_MS);
  };

  const fresh = (kind) => {
    state = initial(kind, draw(scenario));
    publish();
    run();
  };

  return {
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot: () => snapshot,

    // The open procedure. A start procedure finds the engines as it says (cold, or the right
    // engine running); the Abnormal Start EP keeps them as they are; anything else switches the
    // model off. `again` is Reset: the same procedure from its beginning.
    open(epId, again = false) {
      const kind = PROCEDURES[epId];
      if (kind === undefined) {
        procedure = null;
        stop();
        publish();
        return;
      }
      const changed = epId !== procedure;
      const prev = procedure;
      procedure = epId;
      if (kind === null) {
        if (!state) state = initial('cold', draw(scenario));
        publish();
        run();
        return;
      }
      // Straight on from the right start, the right engine running: the left start picks it up
      // as it is, as Hollywood runs the two.
      if (changed && !again && epId === 'start-left' && prev === 'start-right' && state && state.engines.R.lit) {
        state = startLeftFrom(state, draw(scenario));
        publish();
        run();
        return;
      }
      // After Start, the runup and the anti-ice check carry on with the engines as the last
      // procedure left them, if both are running, as Hollywood runs them one after another.
      if (changed && !again && (kind === 'afterStart' || kind === 'runup') && bothRunning(state)) {
        state = { ...state, script: null, afTest: false, starting: null };
        publish();
        run();
        return;
      }
      if (changed || again) fresh(kind);
    },

    // Null when the step's input may go in now, else what the gauges say instead.
    gate(stepId, piece) {
      if (!state || !procedure) return null;
      return gate(state, stepId, piece, procedure);
    },

    // A step's control went in: whatever it does to the engines.
    fire(stepId) {
      if (!state || !procedure) return;
      // Any click hands the rings back to the click, from a scripted check's.
      const had = state.highlight != null;
      state = { ...state, highlight: null };
      const events = (STEP_EVENTS[procedure] || {})[stepId];
      if (!events) {
        if (had) publish();
        return;
      }
      for (const e of events) state = input(state, e);
      publish();
      run();
    },

    // A step skipped: what its controls do (`keys`, in the order the drill gives them), and the
    // engines brought on at once to where they would be for the next step (`nextId`): until its
    // gate passes, or, with no gate, until any scripted lever moves are done and N1 has
    // settled. Two minutes at most, so a hung start does not run for ever.
    skip(keys, nextId) {
      if (!state || !procedure) return;
      const events = STEP_EVENTS[procedure] || {};
      state = { ...state, highlight: null };
      for (const k of keys) for (const e of events[k] || []) state = input(state, e);
      const ready = (s) => {
        if (s.script) return false;
        if (nextId && gateOf(nextId, procedure)) return gate(s, nextId, null, procedure) === null;
        return ['L', 'R'].every((side) => Math.abs(s.engines[side].dn1) < 0.05
          && Math.abs(s.engines[side].dnp) < 5);
      };
      // A couple of seconds first, so a lever just moved has started the engine moving.
      for (let t = 0; t < 120 && (t < 2 || !ready(state)); t += 0.25) state = step(state, 0.25);
      publish();
      run();
    },

    // A control that does something to the engines whatever step is open (a PRESS FOR VOLTS
    // button): its `engineInput`.
    poke(event) {
      if (!state || !procedure) return;
      state = input(state, event);
      publish();
      run();
    },

    // The elapsed time key, or the stopwatch standing in for it, was pressed.
    toggleClock() {
      if (!state || !procedure) return;
      state = input(state, { clock: 'toggle' });
      publish();
      run();
    },

    // A condition lever pressed again while a start is under way, fuel already in and the
    // starter still engaged: the student is aborting it. The fuel is cut on that engine, and the
    // answer says which procedure and step that click was, for the drill to open: the Abnormal
    // Start EP, whose first step is Condition Lever - FUEL CUTOFF. Null when it is not that.
    abortByLever(wordings) {
      if (!state || (procedure !== 'start-right' && procedure !== 'start-left')) return null;
      if (!wordings.some((w) => /condition lever/i.test(w))) return null;
      const e = state.engines[state.starting];
      if (e.cond === 'cutoff' || e.starter === 'off') return null;
      state = input(state, { side: 'starting', cond: 'cutoff' });
      publish();
      run();
      return { epId: 'abnormal-start', stepId: 'as1' };
    },

    scenario: () => scenario,
    setScenario(id) {
      scenario = id;
      try { window.localStorage.setItem(KEY, id); } catch { /* private window */ }
      const kind = procedure ? PROCEDURES[procedure] : undefined;
      if (kind) fresh(kind);
      else publish();
    },

    dispose: stop,
  };
}
