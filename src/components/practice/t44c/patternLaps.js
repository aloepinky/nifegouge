// The Practice Flight's pattern: from the initial call on, the flight is flown lap by lap on Pattern
// Work's model (pattern/patternModel.js), the break first, then whatever lap the student asks for
// at each touchdown. Pure: what a lap is, how it ends, what can follow it, and what it puts in the
// flight log.

import { CALL_SIGN, GEOMETRY, SCENARIOS, buildBreak, buildPass } from './pattern/patternModel';

// The runway in Pattern Work's terms: `kngp-13L`, `kngw-31`; the flight card writes 04 for 4.
export const runwayIdOf = (field, rwy) => `${field === 'KNGW' ? 'kngw' : 'kngp'}-${String(rwy).replace(/^0/, '')}`;

const LABEL = Object.fromEntries(SCENARIOS.map((x) => [x.id, x.label]));
LABEL.break = 'Overhead break';
LABEL.sseLand = 'SSE full stop';
const TWO_ENGINE = ['approach', 'noflap', 'full'];
const CASES = ['case1', 'case2', 'case3', 'case4', 'case5'];

export const lapLabel = (kind) => LABEL[kind] || kind;
export const singleEngine = (kind) => kind === 'sse' || kind === 'sseLand' || CASES.includes(kind);

// How a lap ends: on the runway for a touch-and-go, stopped, or waved off at 200 ft on one engine.
export const endOf = (kind) => (kind === 'sse' ? 'waveoff' : kind === 'sseLand' || CASES.includes(kind) ? 'fullstop' : 'touchdown');

const PROMPT = {
  touchdown: 'Touchdown. Next lap?',
  fullstop: 'Full stop. Next lap?',
  waveoff: 'SSE wave-off. Next lap?',
};

// What can follow a lap. After an SSE wave-off the engine is still out: another SSE pattern, or
// the SSE full stop. Otherwise any pattern, and at Navy Corpus a full stop to end the flight (none
// at Cabaniss, which is left by a departure).
export function nextLaps(end, field) {
  if (end === 'waveoff') return { prompt: PROMPT.waveoff, options: [{ id: 'sse', label: lapLabel('sse') }, { id: 'sseLand', label: lapLabel('sseLand') }] };
  const options = [...TWO_ENGINE, 'sse', ...CASES].map((id) => ({ id, label: lapLabel(id) }));
  if (field === 'KNGW') options.push({ id: 'leave', label: 'Depart Cabaniss' });
  else options.push({ id: 'stop', label: end === 'fullstop' ? 'Taxi in' : 'Full stop' });
  return { prompt: PROMPT[end], options };
}

// The break's numbers call and Tower's answer, left out where the break was cleared at the initial
// (Cabaniss answers "cleared for the break" to the initial call).
const NUMBERS = /numbers for the break|cleared for the (left|right) break/i;

// The SSE full stop from the 200 ft point on an SSE final: the last of a single-engine full-stop
// pass (Case 5's, its engine shut down by then), from the threshold on.
function sseLanding(engine, runwayId) {
  const p = buildPass('case5', engine, runwayId);
  const from = p.finalAt(GEOMETRY.WAVEOFF_X); // the SSE wave-off point, 200 ft on final
  const threshold = p.finalAt(0);
  const events = p.events.filter((e) => e.t >= threshold - 0.5).map((e) => ({ ...e, t: e.t - from }));
  return {
    ...p,
    id: 'sseLand',
    duration: p.duration - from,
    events,
    marks: p.marks.filter((m) => m.t >= from).map((m) => ({ ...m, t: m.t - from })),
    stateAt: (time) => ({ ...p.stateAt(time + from), t: time }),
  };
}

const cache = new Map();

// One lap, flown: `{ duration, events, marks, track, stateAt, field, … }`, the shape Pattern Work
// draws. Built once for each set of choices.
export function buildLap({ lap: kind, engine = 'left', runwayId, callSign, cleared, draw }) {
  const key = JSON.stringify([kind, engine, runwayId, callSign, cleared, draw]);
  if (cache.has(key)) return cache.get(key);
  let p;
  if (kind === 'break') p = buildBreak('approach', engine, runwayId);
  else if (kind === 'sseLand') p = sseLanding(engine, runwayId);
  else p = buildPass(kind, engine, runwayId, ...(draw ? [draw] : []));
  const said = (text) => (callSign ? String(text).split(CALL_SIGN).join(callSign) : text);
  const events = p.events
    .filter((e) => !(kind === 'break' && cleared && NUMBERS.test(e.text)))
    .map((e) => ({ ...e, text: said(e.text) }));
  const lap = { ...p, events, callSign: callSign || CALL_SIGN };
  if (cache.size > 40) cache.delete(cache.keys().next().value);
  cache.set(key, lap);
  return lap;
}

// A lap's words in the flight log, said up to `until` seconds (all of them when not given): the
// crew's lines, and the radio as the rest of the flight logs it, the PM's call on its channel and
// Tower's answer by the station's name.
export function lapLog(step, until = Infinity) {
  const lap = buildLap(step);
  return lap.events
    .filter((e) => e.kind === 'say' && e.t <= until)
    .map((e) => {
      if (e.radio && e.who === 'Tower') return { phase: step.phase, who: step.tower, text: e.text, other: true };
      if (e.radio) return { phase: step.phase, who: e.who, radio: step.channel, text: e.text };
      return { phase: step.phase, who: e.who, text: e.text };
    });
}
