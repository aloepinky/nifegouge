// What "the current question" means, and what clicking a control does to it. Both cockpits ask
// this file, so they cannot answer differently.
//
// Primary (TW4Cockpit.js) and the shared drill (EPDrill.js) are otherwise unlike each other -
// different data, different matching, different markup - and these two rules got written twice
// because of it. They drifted, the way two copies of a rule do, and it showed on the page: the
// drill ran on to the next step where Primary stayed on the one you had just got wrong, and it
// wrote a setting you had not asked for. So here they are once.

export const FILL = 'fill';
export const PARTIAL = 'partial';
export const WRONG = 'wrong';

// RULE 1 - the open step is the first one that is EMPTY, or that holds only part of its answer.
//
// Two things follow, and they are what a student feels:
//
//   * a wrong click writes NOTHING (rule 2), so the box it marked red is still empty and still
//     open. The next click comes back to it rather than running on down the checklist.
//   * a box holding half its answer is still open, so whatever supplies the other half can
//     finish it.
//
// A box you TYPED a wrong answer into is not open. It has text in it, and reopening it would
// leave Hint and Skip unable to reach past your own mistake. Retype it, or press Check.
//
// `at` reads the three things a step has, whatever the page calls them: `value` is what is in the
// box, `result` is its marking, and `answer` is what the checklist says - a string in the drill,
// an array of fragments on Primary. A step with nothing to answer is skipped either way.
export function openStep(fields, at) {
  for (const field of fields) {
    if (String(at.answer(field) ?? '') === '') continue;
    const value = at.value(field);
    if (value === undefined || value === '' || at.result(field) === 'partial') return field;
  }
  return null;
}

// RULE 2 - a click either fills the open step's own answer or marks it red and writes nothing.
//
// `matched` is how much of that step's answer the clicked control accounts for, out of `total`.
// All of it fills the box with the checklist's own text, setting and all, and marks it correct.
// Some of it writes that much and marks it partial, which leaves the step open for the control
// that supplies the rest - Primary needs this for the steps that name three switches at once
// (BAT, GEN and AUX BAT). None of it writes NOTHING and marks the box red.
//
// The drill used to make the click choose the setting as well, cycling a list of them on repeat
// clicks. It reads like the better exercise and is not: the cycle has no idea which step it is
// answering, so the first click on the flap handle wrote UP at a step asking for APPROACH, the
// student moved on, and Check marked half of Single-Engine Waveoff wrong. What a poster tests is
// whether you know WHICH CONTROL a step means, and it has to answer that question cleanly.
export function clickOutcome(matched, total) {
  if (matched >= total) return FILL;
  return matched > 0 ? PARTIAL : WRONG;
}
