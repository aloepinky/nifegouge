// The Practice Flight's pattern: from the initial call on, the flight is flown lap by lap on Pattern
// Work's model (pattern/patternModel.js), the break first, then whatever lap the student asks for
// at each touchdown or wave-off. Pure: what a lap is, how it ends, what can follow it, and what it
// puts in the flight log.

import { CALL_SIGN, SCENARIOS, buildBreak, buildPass, singleEngine, waveoffOf } from './pattern/patternModel';

// The runway in Pattern Work's terms: `kngp-13L`, `kngw-31`; the flight card writes 04 for 4.
export const runwayIdOf = (field, rwy) => `${field === 'KNGW' ? 'kngw' : 'kngp'}-${String(rwy).replace(/^0/, '')}`;

const LABEL = Object.fromEntries(SCENARIOS.map((x) => [x.id, x.label]));
LABEL.break = 'Overhead break';
const TWO_ENGINE = ['approach', 'noflap', 'full'];
const CASES = ['case1', 'case2', 'case3', 'case3b', 'case4', 'case5'];

export const lapLabel = (kind) => LABEL[kind] || kind;
export { singleEngine };

// How a lap ends unless the student waves off: a touch and go, or stopped (the SSE full stop).
export const endOf = (kind) => (kind === 'ssefs' ? 'fullstop' : 'touchdown');

const PROMPT = {
  touchdown: 'Touchdown. Next lap?',
  fullstop: 'Full stop. Next lap?',
  waveoff: 'Wave-off. Next lap?',
  ssewaveoff: 'SSE wave-off. Next lap?',
};

// What can follow a lap. After an SSE wave-off the engine is still out: another SSE pattern, or
// the SSE full stop. After a wave-off on both engines, any pattern (no full stop: there was no
// landing). Otherwise any pattern, and at Navy Corpus a full stop to end the flight (none at
// Cabaniss, which is left by a departure).
export function nextLaps(end, field) {
  if (end === 'ssewaveoff') return { prompt: PROMPT.ssewaveoff, options: ['sse', 'ssefs'].map((id) => ({ id, label: lapLabel(id) })) };
  const options = [...TWO_ENGINE, 'sse', 'ssefs', ...CASES].map((id) => ({ id, label: lapLabel(id) }));
  if (field === 'KNGW') options.push({ id: 'leave', label: 'Depart Cabaniss' });
  else if (end !== 'waveoff') options.push({ id: 'stop', label: end === 'fullstop' ? 'Taxi in' : 'Full stop' });
  return { prompt: PROMPT[end], options };
}

// The student's wave-off `t` seconds into a lap: how it ends, and where the next lap begins.
export function waveoffAt(step, t) {
  const w = waveoffOf(buildLap(step), t);
  return { end: w.from.single ? 'ssewaveoff' : 'waveoff', from: w.from };
}
// Whether a lap flies on from that wave-off: the SSE pattern and the SSE full stop from an SSE
// one, a two-engine pattern from a wave-off on both; any other lap starts from its own start.
export const continues = (kind, from) => !!from && (from.single ? ['sse', 'ssefs'].includes(kind) : TWO_ENGINE.includes(kind));

// The break's numbers call and Tower's answer, left out where the break was cleared at the initial
// (Cabaniss answers "cleared for the break" to the initial call).
const NUMBERS = /numbers for the break|cleared for the (left|right) break/i;

const cache = new Map();

// One lap, flown: `{ duration, events, marks, track, stateAt, field, … }`, the shape Pattern Work
// draws. Built once for each set of choices.
// `from`: the wave-off it begins with.
export function buildLap({ lap: kind, engine = 'left', runwayId, callSign, cleared, draw, from }) {
  const key = JSON.stringify([kind, engine, runwayId, callSign, cleared, draw, from]);
  if (cache.has(key)) return cache.get(key);
  let p;
  if (kind === 'break') p = buildBreak('approach', engine, runwayId);
  else p = buildPass(kind, engine, runwayId, draw || undefined, from || null);
  const said = (text) => (callSign ? String(text).split(CALL_SIGN).join(callSign) : text);
  const events = p.events
    .filter((e) => !(kind === 'break' && cleared && NUMBERS.test(e.text)))
    .map((e) => ({ ...e, text: said(e.text) }));
  const lap = { ...p, events, callSign: callSign || CALL_SIGN };
  if (cache.size > 40) cache.delete(cache.keys().next().value);
  cache.set(key, lap);
  return lap;
}

// A lap's words in the flight log, said up to `until` seconds (all of them when not given; a lap
// waved off, up to its wave-off): the crew's lines, and the radio as the rest of the flight logs
// it, the PM's call on its channel and Tower's answer by the station's name.
export function lapLog(step, until = Infinity) {
  const lap = buildLap(step);
  const upTo = Math.min(until, step.waveT === undefined ? Infinity : step.waveT);
  return lap.events
    .filter((e) => e.kind === 'say' && e.t <= upTo)
    .map((e) => {
      if (e.radio && e.who === 'Tower') return { phase: step.phase, who: step.tower, text: e.text, other: true };
      if (e.radio) return { phase: step.phase, who: e.who, radio: step.channel, text: e.text };
      return { phase: step.phase, who: e.who, text: e.text };
    });
}
