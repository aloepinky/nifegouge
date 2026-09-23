import { useEffect, useRef, useState } from 'react';
import { gradeLimit } from '../../utils/answerUtils';

// The behaviour every school's limits table shares: Random mode, live checking, Next Answer,
// All Answers, Reset, and the game hand-off. What the table *looks* like stays bespoke to its
// school's exam sheet — see CLAUDE.md — so this holds no markup at all.
//
//   answers   { fieldKey: 'the answer' }, one entry per blank on the sheet
//   groups    blanks that are asked together in Random mode, as arrays of field keys: the two
//             ends of a range, the cells of one row of an engine grid. A key in no group is
//             asked on its own. Order inside a group is kept; the groups themselves shuffle.
//
// Random mode walks the open blanks one group at a time, each turning green and moving on the
// moment it is right. A game runs Random mode and ends when the last blank is right.

function focusHint() {
  setTimeout(() => {
    const el = document.querySelector('.correct-answer-hint-input');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      if (el.select) el.select();
    }
  }, 100);
}

// The open blanks in a shuffled order, with each group's members kept adjacent and in the
// order they were written. A group whose members are all answered already drops out.
function shuffledGroups(open, groups) {
  const owner = new Map();
  groups.forEach((g, i) => g.forEach((k) => owner.set(k, i)));
  const buckets = [];
  const at = new Map();
  for (const k of open) {
    const key = owner.has(k) ? `g${owner.get(k)}` : `k${k}`;
    if (!at.has(key)) { at.set(key, buckets.length); buckets.push([]); }
    buckets[at.get(key)].push(k);
  }
  for (let i = buckets.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [buckets[i], buckets[j]] = [buckets[j], buckets[i]];
  }
  return buckets.flat();
}

export default function useLimitsDrill(answers, groups = [], { isGameActive = false, onGameComplete } = {}) {
  const KEYS = Object.keys(answers);
  const [data, setData] = useState({});
  const [results, setResults] = useState({});
  const [queue, setQueue] = useState(null); // the Random-mode order, or null when off
  const [at, setAt] = useState(0);
  const locked = useRef(null);

  const current = queue ? queue[at] : null;

  const stopRandom = () => { setQueue(null); setAt(0); };

  const startRandom = () => {
    const open = KEYS.filter((k) => results[k] !== 'correct');
    if (!open.length) return;
    setQueue(shuffledGroups(open, groups));
    setAt(0);
    focusHint();
  };

  useEffect(() => {
    if (isGameActive) startRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameActive]);

  const advance = () => {
    locked.current = null;
    if (at + 1 >= queue.length) {
      stopRandom();
      if (isGameActive) onGameComplete?.();
      return;
    }
    setAt(at + 1);
    focusHint();
  };

  const onChange = (field, value) => {
    if (locked.current === field) return;
    setData((d) => ({ ...d, [field]: value }));
    if (field === current && gradeLimit(value, answers[field]) === 'correct') {
      locked.current = field;
      setResults((r) => ({ ...r, [field]: 'correct' }));
      setTimeout(advance, 300);
      return;
    }
    setResults((r) => ({ ...r, [field]: '' }));
  };

  const check = () => {
    const out = {};
    for (const k of KEYS) out[k] = gradeLimit(data[k], answers[k]);
    setResults(out);
    if (isGameActive && KEYS.every((k) => out[k] === 'correct')) onGameComplete?.();
  };

  const next = () => {
    const field = current || KEYS.find((k) => results[k] !== 'correct');
    if (!field) return;
    setData((d) => ({ ...d, [field]: answers[field] }));
    setResults((r) => ({ ...r, [field]: 'correct' }));
    if (current) { locked.current = field; setTimeout(advance, 300); }
  };

  const all = () => {
    setData({ ...answers });
    setResults(Object.fromEntries(KEYS.map((k) => [k, 'correct'])));
    stopRandom();
  };

  const reset = () => {
    setData({});
    setResults({});
    stopRandom();
  };

  const inputClass = (field) => {
    if (field === current) return 'correct-answer-hint-input';
    if (results[field] === 'correct') return 'correct-answer';
    if (results[field] === 'incorrect') return 'incorrect-answer';
    return '';
  };

  // Enter in any answer box checks, on every EPs and limits page.
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') check();
  };

  return {
    value: (field) => data[field] || '',
    onChange,
    inputClass,
    queue,
    at,
    check,
    next,
    all,
    reset,
    toggleRandom: () => (queue ? stopRandom() : startRandom()),
    onKeyDown,
  };
}
