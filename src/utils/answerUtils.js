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
  // A time limit is written as a word on the sheets ("5 MINUTES", "40 SECONDS"), so the
  // singular and the usual shorthands all have to land on one spelling.
  'min':     'minutes',
  'mins':    'minutes',
  'minute':  'minutes',
  'sec':     'seconds',
  'secs':    'seconds',
  'second':  'seconds',
};

// `keep` is stop words that are not filler here, and are compared like any other word.
export function normalizeAnswer(str, keep) {
  let s = str.toString().toLowerCase();
  // Strip zero-width/soft-hyphen invisible Unicode that appears in answer keys
  s = s.replace(/[​‌‍﻿­]/g, '');
  // The degree sign drops out rather than becoming a space, so "790°C" is "790C" and nobody has
  // to find the symbol on a keyboard to answer a temperature limit.
  s = s.replace(/°/g, '');
  s = s.replace(/[,\-–;()./]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return '';
  let words = s.split(' ');
  words = words.map(w => ABBREVS[w] ?? w);
  words = words.filter(w => w && (!STOP_WORDS.has(w) || (keep && keep.has(w))));
  words.sort();
  return words.join(' ');
}

// One typed answer against its key: 'correct', 'partial' (every word typed is in the key but
// something is missing), 'incorrect', or '' for a blank box. An empty key accepts anything.
// This is Primary's EP checker, shared so every school's EPs grade the same way.
//
// In a step's setting (after " - ") ON and IN are positions, not filler: "Master - ON" needs the
// ON, and "Master" alone is partial. A key with no setting is all setting when it is nothing but
// stop words ("ON"), or it would accept any answer at all.
const POSITIONS = new Set(['on', 'in']);

export function gradeAnswer(user, correct) {
  const key = String(correct || '');
  const at = key.indexOf(' - ');
  const setting = at >= 0 ? key.slice(at + 3) : normalizeAnswer(key) ? '' : key;
  const said = normalizeAnswer(setting, STOP_WORDS).split(' ');
  const keep = new Set(at >= 0 ? said.filter((w) => POSITIONS.has(w)) : said);
  const u = normalizeAnswer(user || '', keep);
  const c = normalizeAnswer(key, keep);
  if (u === c) return u === '' && c !== '' ? '' : 'correct';
  if (u === '') return '';
  if (c === '') return 'correct';
  const words = new Set(c.split(' '));
  return u.split(' ').every((w) => words.has(w)) ? 'partial' : 'incorrect';
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
  // A number written without its leading zero is still that number: the sheets print ".48 Mach"
  // and "±.8 VDC", and a student typing 0.48 has not got it wrong.
  return (text.match(/-?(?:\d+(?:\.\d+)?|\.\d+)/g) || []).map(Number);
}
