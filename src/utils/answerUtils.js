const STOP_WORDS = new Set(['a','an','the','and','or','of','for','by','with','to','in','on','at','be','is']);

const ABBREVS = {
  'req':  'required',
  'pwr':  'power',
  'eng':  'engine',
  'gen':  'generator',
  'elec': 'electrical',
  'emer': 'emergency',
  'xfr':  'transfer',
  'incr': 'increase',
  'decr': 'decrease',
  'gnd':  'ground',
  'lbs':  'pounds',
};

export function normalizeAnswer(str) {
  let s = str.toString().toLowerCase();
  // Strip zero-width/soft-hyphen invisible Unicode that appears in answer keys
  s = s.replace(/[​‌‍﻿­]/g, '');
  s = s.replace(/[,\-–;()./]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return '';
  let words = s.split(' ');
  words = words.map(w => ABBREVS[w] ?? w);
  words = words.filter(w => w && !STOP_WORDS.has(w));
  words.sort();
  return words.join(' ');
}

// One typed answer against its key: 'correct', 'partial' (every word typed is in the key but
// something is missing), 'incorrect', or '' for a blank box. An empty key accepts anything.
// This is Primary's EP checker, shared so every school's EPs grade the same way.
//
// A key made only of words normalizeAnswer drops ("ON", "IN") would normalize to nothing and
// accept any answer at all, so those are compared word for word instead.
export function gradeAnswer(user, correct) {
  const bare = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (bare(correct) && !normalizeAnswer(correct)) {
    if (!bare(user)) return '';
    return bare(user) === bare(correct) ? 'correct' : 'incorrect';
  }
  const u = normalizeAnswer(user || '');
  const c = normalizeAnswer(correct || '');
  if (u === c) return u === '' && c !== '' ? '' : 'correct';
  if (u === '') return '';
  if (c === '') return 'correct';
  const key = new Set(c.split(' '));
  return u.split(' ').every((w) => key.has(w)) ? 'partial' : 'incorrect';
}

// A limit: numbers compared as numbers (7 is 7.0), ranges written with "to" or "-", and the
// punctuation around them ignored. Every school's limits table uses it.
// A limit that is words (a starter duty cycle, a prohibited maneuver) is graded as an EP step
// is, word for word in any order.
export function gradeLimit(user, correct) {
  if (String(user || '').trim() === '') return '';
  const numeric = /^\s*-?[\d.]+\s*((to|-|–)\s*-?[\d.]+)?\s*$/i.test(String(correct));
  if (!numeric) return normalizeAnswer(user) === normalizeAnswer(correct) ? 'correct' : 'incorrect';
  // A limit that is a number is its numbers and nothing else: units, words and punctuation are
  // ignored, so "2,700 RPM MAX" is 2700 and "871 to 1000" is 871 and 1000. A range written with
  // a hyphen matches one written with "to".
  const un = numbersIn(user);
  const cn = numbersIn(correct);
  return un.length === cn.length && un.every((n, i) => n === cn[i]) ? 'correct' : 'incorrect';
}

// The numbers in an answer, in the order they are written. A hyphen between two digits is a
// range and is spelled out first, so what is left of a minus sign is a sign: -40 is not 40, and
// the sheet prints no sign outside the box.
function numbersIn(s) {
  const text = String(s || '')
    .replace(/[–—]/g, '-')
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/(\d)\s*-\s*(\d)/g, '$1 to $2');
  return (text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}
