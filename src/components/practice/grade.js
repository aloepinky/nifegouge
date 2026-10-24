// Grading a typed line. Checklist responses and EP steps are graded as the EPs/Limits page
// grades them (gradeAnswer: every word, any order, blanks and punctuation ignored). A call has
// placeholders the student fills with their own words ("(call sign)" becomes "Boomer 123"),
// so those drop out of the key and extra words are allowed: what counts is the call's own
// words. All of them is correct, most of them partial.

import { gradeAnswer } from '../../utils/answerUtils';

// Every word of a call counts, the small ones too ("Two Pins In").
const words = (s) => String(s).toLowerCase().replace(/[​_]/g, '')
  .replace(/[^a-z0-9%']+/g, ' ').split(' ').filter(Boolean);

export function gradeCall(user, key) {
  if (!String(user || '').trim()) return '';
  const want = words(String(key).replace(/\([^)]*\)/g, ' '));
  if (want.length === 0) return 'correct';
  const said = new Set(words(user));
  const hit = want.filter((w) => said.has(w)).length;
  if (hit === want.length) return 'correct';
  return hit / want.length >= 0.6 ? 'partial' : 'incorrect';
}

// A key may be a list of acceptable answers ("On" or "Off"); the best grade among them counts.
const RANK = { correct: 3, partial: 2, incorrect: 1, '': 0 };

// A response with a blank ("On, ____ Volts") is said with a reading in it, so the numbers the
// student reads out are not counted against them.
function gradeResponse(user, key) {
  const read = /_/.test(key) ? String(user || '').replace(/[\d.,%]+/g, ' ') : user;
  if (/_/.test(key) && String(user || '').trim() && !String(read).trim()) return 'partial';
  return gradeAnswer(read, key);
}

export function gradeStep(user, step) {
  const keys = Array.isArray(step.answer) ? step.answer : [step.answer];
  const grade = step.kind === 'call' ? gradeCall : gradeResponse;
  return keys.map((k) => grade(user, k)).sort((a, b) => RANK[b] - RANK[a])[0];
}
