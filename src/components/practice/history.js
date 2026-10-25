// The flight with its history, so a step can be taken back (the left arrow), or the flight
// taken back to where a stage began (its button in the stage strip). Pure.
//
// `past` is every state before this one, oldest first, `now` this one. A mark is left each
// time a new stage comes on screen: the state then, and how much of `past` came before it.
// A stage passed through in one skip never came on screen, so has no mark.

import { current, reduce } from './engine';

// States share most of their structure, so a long history is cheap.
export const CAP = 1500;

export const phaseOf = (s) => (s.ep && !s.ep.situation ? 'Emergency' : current(s)?.phase) || null;

const markOf = (state, depth) => ({ phase: phaseOf(state), state, depth });

export const begin = (now) => ({ past: [], now, marks: [markOf(now, 0)] });

export function withHistory(h, action) {
  if (action.type === 'back') {
    if (!h.past.length) return h;
    const depth = h.past.length - 1;
    return { past: h.past.slice(0, depth), now: h.past[depth], marks: h.marks.filter((m) => m.depth <= depth) };
  }
  // Back to where the last time in `phase` began; everything since is dropped.
  if (action.type === 'backTo') {
    const at = h.marks.map((m) => m.phase).lastIndexOf(action.phase);
    if (at < 0 || h.marks[at].state === h.now) return h;
    const mark = h.marks[at];
    return { past: h.past.slice(0, Math.max(0, mark.depth)), now: mark.state, marks: h.marks.slice(0, at + 1) };
  }
  const now = reduce(h.now, action);
  if (now === h.now) return h;
  // The course rules, arriving after the flight has begun, go into every state kept too, so
  // going back never returns to a flight without them.
  if (action.type === 'legs') {
    return { past: h.past.map((p) => reduce(p, action)), now, marks: h.marks.map((m) => ({ ...m, state: reduce(m.state, action) })) };
  }
  if (action.type === 'type') return { ...h, now };
  let past = [...h.past, h.now];
  let marks = action.type === 'restart' ? [] : h.marks;
  if (past.length > CAP) {
    const drop = past.length - CAP;
    past = past.slice(drop);
    marks = marks.map((m) => ({ ...m, depth: m.depth - drop }));
  }
  const phase = phaseOf(now);
  if (action.type === 'restart' || (phase && phase !== phaseOf(h.now))) marks = [...marks, markOf(now, past.length)];
  return { past, now, marks };
}

// The stages the flight can be taken back to: begun on screen, and not the one it is in.
export const backable = (h) => new Set(h.marks.filter((m) => m.phase && m.state !== h.now && m.phase !== phaseOf(h.now)).map((m) => m.phase));
