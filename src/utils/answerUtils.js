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
};

export function normalizeAnswer(str) {
  let s = str.toString().toLowerCase();
  s = s.replace(/[,\-–;()./]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return '';
  let words = s.split(' ');
  words = words.map(w => ABBREVS[w] ?? w);
  words = words.filter(w => w && !STOP_WORDS.has(w));
  words.sort();
  return words.join(' ');
}
