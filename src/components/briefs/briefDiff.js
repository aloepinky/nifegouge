// Comparing a brief with the one it is about to replace.
//
// A wing reissues a guide for a handful of lines, and the upload's preview is where somebody
// decides whether to publish it. Reading two pages side by side to find what moved is what
// nobody actually does, so the preview is drawn as the new brief with the old one's deletions
// put back where they were and a mark on every part that is not the same.
//
// It is for looking at only. What publishes is the parsed brief; a struck-through line is a
// line that will be gone.

const norm = (text) => (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordsOf = (text) => norm(text).split(' ').filter(Boolean);
const linesOf = (text) => (text && text.trim() ? text.split('\n') : []);

// Dice on two names: enough to see that `IMC Penetration` has become `Penetration` rather
// than report one item removed and another added in its place.
function likeness(a, b) {
  const mine = new Set(wordsOf(a));
  const theirs = new Set(wordsOf(b));
  if (!mine.size || !theirs.size) return 0;
  const shared = [...mine].filter((w) => theirs.has(w)).length;
  return (2 * shared) / (mine.size + theirs.size);
}

// Which line became which. Removals come out ahead of the additions at the same place, so the
// merged text reads as the old line followed by the line that replaced it.
export function lineDiff(before, after) {
  const a = linesOf(before);
  const b = linesOf(after);
  const n = a.length;
  const m = b.length;
  const len = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      len[i][j] = a[i] === b[j] ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1]);
    }
  }
  const lines = [];
  const states = [];
  let i = 0;
  let j = 0;
  const take = (line, state) => { lines.push(line); states.push(state); };
  while (i < n && j < m) {
    if (a[i] === b[j]) { take(b[j], 'same'); i += 1; j += 1; } else if (len[i + 1][j] >= len[i][j + 1]) { take(a[i], 'removed'); i += 1; } else { take(b[j], 'added'); j += 1; }
  }
  while (i < n) { take(a[i], 'removed'); i += 1; }
  while (j < m) { take(b[j], 'added'); j += 1; }
  return { text: lines.join('\n'), states, same: states.every((s) => s === 'same') };
}

// Every new block in its own order, with each deleted block put back in front of whatever
// used to follow it. Blocks pair by name, then by how alike two names are, so a retitled
// section is one changed block rather than a removal and an addition.
export function pairUp(before, after, nameOf) {
  const taken = new Array(before.length).fill(false);
  const match = new Array(after.length).fill(-1);

  after.forEach((item, i) => {
    const j = before.findIndex((b, k) => !taken[k] && norm(nameOf(b)) === norm(nameOf(item)));
    if (j >= 0) { taken[j] = true; match[i] = j; }
  });
  after.forEach((item, i) => {
    if (match[i] >= 0) return;
    let best = -1;
    let score = 0.5;
    before.forEach((b, k) => {
      if (taken[k]) return;
      const s = likeness(nameOf(b), nameOf(item));
      if (s > score) { score = s; best = k; }
    });
    if (best >= 0) { taken[best] = true; match[i] = best; }
  });

  // Where the next block that is in both lists sits, for each position in the new one. A
  // block with nothing to pair with has no place of its own, so the deletions around it are
  // read against whatever does.
  const nextMatch = new Array(after.length).fill(before.length);
  for (let i = after.length - 1; i >= 0; i -= 1) {
    nextMatch[i] = match[i] >= 0 ? match[i] : (nextMatch[i + 1] == null ? before.length : nextMatch[i + 1]);
  }

  const out = [];
  let past = 0;
  const deletionsBefore = (limit) => {
    for (; past < limit; past += 1) {
      if (!taken[past]) out.push({ before: before[past], after: null });
    }
  };
  after.forEach((item, i) => {
    const j = match[i];
    // A deletion is drawn ahead of whatever replaced it, as a diff reads anywhere else.
    deletionsBefore(j >= 0 ? j : nextMatch[i]);
    if (j >= 0) past = Math.max(past, j + 1);
    out.push({ before: j >= 0 ? before[j] : null, after: item });
  });
  deletionsBefore(before.length);
  return out;
}

const GONE = 'gone:';

// The fields at the head of a brief, and what to call them on screen.
const HEAD = [
  ['title', 'the title'],
  ['short', 'the name on the button'],
  ['note', 'the note at the foot'],
  ['aircraft', 'the aircraft'],
  ['school', 'the school'],
];

function textOf(block, key) {
  return (block && block[key]) || '';
}

// current, next: two brief documents. -> { doc, marks, counts, head }
//
// `doc` is the brief to draw: `next`, with what `current` had and `next` does not put back in
// place. `marks` is keyed by the id of a section or item in that document.
export function diffBriefs(current, next) {
  const marks = {};
  const counts = {
    sections: { added: 0, changed: 0, removed: 0 },
    items: { added: 0, changed: 0, removed: 0 },
  };

  const head = HEAD
    .filter(([key]) => (current[key] || '') !== (next[key] || ''))
    .map(([, name]) => name);

  const sections = pairUp(current.sections || [], next.sections || [], (s) => s.title)
    .map(({ before, after }) => {
      // A section that is gone: shown where it was, with everything in it struck through.
      if (!after) {
        counts.sections.removed += 1;
        marks[GONE + before.id] = { state: 'removed' };
        (before.items || []).forEach((it) => { marks[GONE + it.id] = { state: 'removed' }; });
        return {
          ...before,
          id: GONE + before.id,
          items: (before.items || []).map((it) => ({ ...it, id: GONE + it.id })),
        };
      }
      // A section the old brief never had.
      if (!before) {
        counts.sections.added += 1;
        marks[after.id] = { state: 'added' };
        (after.items || []).forEach((it) => { marks[it.id] = { state: 'added' }; });
        return after;
      }

      const text = lineDiff(textOf(before, 'text'), textOf(after, 'text'));
      const titleChanged = before.title !== after.title;
      const shapeChanged = !!before.fixed !== !!after.fixed
        || (before.column || 1) !== (after.column || 1)
        || !!before.break !== !!after.break;
      if (titleChanged || shapeChanged || !text.same) {
        counts.sections.changed += 1;
        marks[after.id] = { state: 'changed', title: titleChanged, lines: { text: text.states } };
      }

      const items = pairUp(before.items || [], after.items || [], (it) => it.label)
        .map((pair) => {
          if (!pair.after) {
            counts.items.removed += 1;
            marks[GONE + pair.before.id] = { state: 'removed' };
            return { ...pair.before, id: GONE + pair.before.id };
          }
          if (!pair.before) {
            counts.items.added += 1;
            marks[pair.after.id] = { state: 'added' };
            return pair.after;
          }
          const body = lineDiff(textOf(pair.before, 'text'), textOf(pair.after, 'text'));
          const sub = lineDiff(textOf(pair.before, 'subtext'), textOf(pair.after, 'subtext'));
          const labelChanged = pair.before.label !== pair.after.label;
          const fixedChanged = !!pair.before.fixed !== !!pair.after.fixed;
          if (!labelChanged && !fixedChanged && body.same && sub.same) return pair.after;
          counts.items.changed += 1;
          marks[pair.after.id] = {
            state: 'changed',
            label: labelChanged,
            lines: { text: body.states, subtext: sub.states },
          };
          return { ...pair.after, text: body.text, subtext: sub.text };
        });

      return { ...after, text: text.text, items };
    });

  return { doc: { ...next, sections }, marks, counts, head };
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// What the preview says above the brief. Plain counting: the reader goes and looks.
export function diffSummary({ counts, head }) {
  const parts = [];
  const say = (group, noun, nouns) => {
    if (group.added) parts.push(`${count(group.added, noun, nouns)} added`);
    if (group.changed) parts.push(`${count(group.changed, noun, nouns)} changed`);
    if (group.removed) parts.push(`${count(group.removed, noun, nouns)} removed`);
  };
  say(counts.items, 'item', 'items');
  say(counts.sections, 'section', 'sections');
  if (head.length) parts.push(`${head.join(', ')} changed`);
  if (!parts.length) return '0 items changed.';
  return `${parts.join(', ')}.`;
}
