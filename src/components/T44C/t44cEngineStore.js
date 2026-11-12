import { annLevel, blinking, bothRunning, faultSeen, faultsAt, gate, gateOf, initial, input, lampTest, lights, MODEL_LIGHTS, outcome, PROCEDURES, readouts, SCENARIOS, settled, startLeftFrom, step, STARTER_LIMIT, STEP_EVENTS, stopwatch } from './t44cEngine';
import { drawFault, faultById, faultsFor, faultText } from './t44cFaults';

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
// Chaos: the odds, 0 to 1, that a step with faults draws one as it comes up (t44cFaults.js).
const CHAOS_KEY = 't44cChaos';
const readChaos = () => {
  try {
    const v = Number(window.localStorage.getItem(CHAOS_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0;
  } catch {
    return 0;
  }
};
// The step an event key belongs to: `er6#4` and `er8:Power Lever` are Engine Runup 6 and 8's.
const stepOfKey = (key) => key.split(/[:#]/)[0];
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
  let chaos = readChaos();
  // Each step draws once a run (the procedure's steps already drawn for), and a fault the student
  // goes past is told to the drill through `onMiss`.
  let drawnFor = new Set();
  // The open card's step ids in order (EPDrill, through `arm`): a fault is gone past by a click
  // on a later step, not an earlier one.
  let order = [];
  // The Engine Runup 8 faults whose scripted test has begun while they were in sight.
  let lateRan = new Set();
  // The step open now, which the Discrepancy button looks at first.
  let openStep = null;
  const missListeners = new Set();
  let procedure = null;
  let state = null;
  let snapshot = { active: false };
  let timer = null;
  let last = 0;
  const listeners = new Set();

  const publish = () => {
    snapshot = state && procedure
      ? { active: true, procedure, scenario, chaos, outcome: outcome(state), readouts: readouts(state), lights: lights(state), blinking: blinking(state), lampTest: lampTest(state), drives: MODEL_LIGHTS,
        highlight: state.highlight ?? null, annLevel: annLevel(state),
        // The stopwatch only on the starts, which time their starters (the user, 2026-11-04).
        stopwatch: TIMED.has(procedure) ? stopwatch(state) : null, starterLimit: STARTER_LIMIT }
      : { active: false, scenario, chaos };
    listeners.forEach((l) => l());
  };

  const faults = () => (state && state.faults) || [];
  // Faults put right (found or gone past): taken off, and each one's `reset` applied.
  const clear = (list) => {
    if (!list.length) return;
    state = { ...state, faults: faults().filter((f) => !list.includes(f)) };
    for (const f of list) for (const e of faultById(f.id).reset || []) state = input(state, e);
  };
  // Faults the student went past: cleared, and the drill told which step each was and what.
  const missed = (list) => {
    if (!list.length) return;
    clear(list);
    for (const f of list) {
      lateRan.delete(f.id);
      const told = { stepId: faultById(f.id).step, ...faultText(f) };
      missListeners.forEach((l) => l(told));
    }
  };
  const at = (id) => order.indexOf(id);
  // Whether step `id` comes after step `than` on the card.
  const later = (id, than) => (at(id) >= 0 && at(than) >= 0 ? at(id) > at(than) : id !== than);

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
    // A fault on Engine Runup 8 is gone past when its test, once begun, ends.
    const ended = [];
    for (const f of faults()) {
      if (!f.seen || !faultById(f.id).late) continue;
      if (state.script) lateRan.add(f.id);
      else if (lateRan.has(f.id)) ended.push(f);
    }
    missed(ended);
    publish();
    if (settled(state)) stop();
  };

  const run = () => {
    if (timer || !state) return;
    last = performance.now();
    timer = setInterval(tick, TICK_MS);
  };

  const fresh = (kind) => {
    drawnFor = new Set();
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
      if (changed || again) {
        drawnFor = new Set();
        // Next or Previous with a fault in sight: gone past, as a click on the next step would be.
        if (state) state = faultSeen(state);
        if (changed && state) missed(faults().filter((f) => f.seen));
        if (state) state = { ...state, faults: [] };
        lateRan = new Set();
      }
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

    // The step now open (EPDrill), and the card's steps in order: with chaos on, the step may
    // draw one of its faults, once a run. A fault that is a standing condition (`early`: a door
    // not secure, the loads split or high) is drawn as the card opens instead, so it is there
    // before its step as it would be in the aeroplane. Faults do not wait on each other: a
    // standing one left showing never stops the steps after it drawing theirs, so at 100
    // percent every step that can go wrong does (the user, 2026-11-08). At 100 percent a step
    // draws every one of its faults, not one: every single thing that can go wrong does (the
    // user, 2026-11-11).
    arm(stepId, stepIds) {
      if (!state || !procedure || !stepId) return;
      if (stepIds) order = stepIds;
      openStep = stepId;
      const roll = (step, early) => {
        const key = early ? `${step}(early)` : step;
        if (drawnFor.has(key)) return;
        drawnFor.add(key);
        const defs = faultsFor(procedure, step).filter((d) => !!d.early === early);
        if (!defs.length || !(Math.random() < chaos)) return;
        const picked = chaos >= 1 ? defs : [defs[Math.floor(Math.random() * defs.length)]];
        state = faultSeen({ ...state, faults: [...faults(), ...picked.map((def) => drawFault(def))] });
      };
      const before = state.faults;
      if (!drawnFor.has('(card)')) {
        drawnFor.add('(card)');
        [...new Set(faultsFor(procedure, null).filter((d) => d.early).map((d) => d.step))]
          .forEach((step) => roll(step, true));
      }
      roll(stepId, false);
      if (state.faults !== before) {
        publish();
        run();
      }
    },

    // The Discrepancy button. The faults the student can see are found: put right, and what each
    // was and what could cause it are the answer (a list). Those of the open step and the steps
    // before it are taken first, so a standing fault shown early (CABIN DOOR OPEN from the
    // battery on) stays lit while an earlier step's goes; it is found by itself when nothing else
    // is showing (the user, 2026-11-08). Null when nothing is wrong yet.
    discrepancy() {
      if (!state) return null;
      state = faultSeen(state);
      const seen = faults().filter((f) => f.seen);
      if (!seen.length) return null;
      const due = seen.filter((f) => !openStep || !later(faultById(f.id).step, openStep));
      const found = due.length ? due : seen;
      clear(found);
      for (const f of found) lateRan.delete(f.id);
      publish();
      run();
      return found.map(faultText);
    },

    onMiss(l) {
      missListeners.add(l);
      return () => missListeners.delete(l);
    },

    chaos: () => chaos,
    setChaos(v) {
      chaos = Math.min(1, Math.max(0, v));
      try { window.localStorage.setItem(CHAOS_KEY, String(chaos)); } catch { /* private window */ }
      publish();
    },

    // A step's control went in: whatever it does to the engines.
    fire(stepId) {
      if (!state || !procedure) return;
      // A control of another step, with a fault in sight: the student has gone past it. Not one
      // of the faulted step's own clicks, so the click that shows a fault (RH GEN OUT staying lit
      // as the right generator goes on) is never itself the miss (the user, 2026-11-05).
      state = faultSeen(state);
      missed(faults().filter((f) => f.seen && later(stepOfKey(stepId), faultById(f.id).step)));
      // A fault's own control: it shows from here, or with a `when`, is watched from here.
      state = faultsAt(state, stepId);
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
      // A skipped step's faults go with it.
      const skipped = new Set(keys.map(stepOfKey));
      state = { ...state, highlight: null, faults: faults().filter((f) => !skipped.has(faultById(f.id).step)) };
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
      if (e.starter === 'off') return null;
      // No rotation (N1 still at nothing seconds after the starter): the fuel is already off, so
      // the condition lever clicked confirms it at FUEL CUTOFF and opens the Abnormal Start.
      const still = e.cond === 'cutoff' && e.starterT > 3 && e.n1 < 5;
      if (e.cond === 'cutoff' && !still) return null;
      if (!still) state = input(state, { side: 'starting', cond: 'cutoff' });
      else state = { ...state, engines: { ...state.engines, [state.starting]: { ...e, aborted: true } } };
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
