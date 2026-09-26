import React from 'react';

// What a proposed edit changes, for someone deciding whether it is better. Each part of the
// question is shown once: unchanged parts plainly, changed ones with the removed words struck
// through and the added words marked, word by word, because an edit that fixes one number in a
// sentence is invisible to anyone asked to compare two whole sentences.

const tokens = (text) => (text || '').split(/(\s+)/).filter((t) => t !== '');

// Longest-common-subsequence diff over words (spaces kept as their own tokens), the same method
// as lineDiff in briefs/briefDiff.js one level down.
export function wordDiff(before, after) {
  const a = tokens(before);
  const b = tokens(after);
  const len = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      len[i][j] = a[i] === b[j] ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1]);
    }
  }
  const out = [];
  const push = (text, state) => {
    const last = out[out.length - 1];
    if (last && last.state === state) last.text += text;
    else out.push({ text, state });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push(b[j], 'same'); i += 1; j += 1; } else if (len[i + 1][j] >= len[i][j + 1]) { push(a[i], 'removed'); i += 1; } else { push(b[j], 'added'); j += 1; }
  }
  while (i < a.length) { push(a[i], 'removed'); i += 1; }
  while (j < b.length) { push(b[j], 'added'); j += 1; }
  return out;
}

const MARK = {
  same: {},
  removed: { textDecoration: 'line-through', color: '#8e1c12', background: '#fdecea', marginRight: '3px' },
  added: { color: '#003B4F', background: '#dff0f4', fontWeight: 600 },
};

function Diffed({ before, after }) {
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {wordDiff(before, after).map((part, i) => <span key={i} style={MARK[part.state]}>{part.text}</span>)}
    </span>
  );
}

const WRONG = ['incorrectAnswer1', 'incorrectAnswer2', 'incorrectAnswer3'];
const norm = (s) => (s || '').trim().toLowerCase();

// The wrong answers are a set, not a sequence: the quiz shuffles them, so moving one from the
// second box to the third is no change at all. Kept, dropped and new are listed as such.
function wrongAnswers(original, edit) {
  const before = WRONG.map((k) => original[k]).filter(Boolean);
  const after = WRONG.map((k) => edit[k]).filter(Boolean);
  const kept = after.filter((a) => before.some((b) => norm(b) === norm(a)));
  const added = after.filter((a) => !before.some((b) => norm(b) === norm(a)));
  const dropped = before.filter((b) => !after.some((a) => norm(a) === norm(b)));
  return { kept, added, dropped, changed: added.length > 0 || dropped.length > 0 };
}

function Row({ label, changed, children }) {
  return (
    <div style={{ padding: '8px 0', borderTop: '1px solid #eee' }}>
      <div style={{ fontSize: '12px', color: changed ? '#003B4F' : '#888', fontWeight: 600, marginBottom: '3px' }}>
        {label}{changed ? ' — changed' : ''}
      </div>
      <div style={{ fontSize: '14px', color: '#222' }}>{children}</div>
    </div>
  );
}

export default function EditDiff({ original, edit }) {
  if (!original) {
    return (
      <div style={{ fontSize: '14px', color: '#555', margin: '12px 0' }}>
        The question this edit changes is no longer in the quiz, so there is nothing to compare it with.
      </div>
    );
  }
  const text = (k) => ({ before: original[k] || '', after: edit[k] || '', changed: norm(original[k]) !== norm(edit[k]) });
  const q = text('question');
  const right = text('correctAnswer');
  const why = text('explanation');
  const lecture = text('lecture');
  const wrong = wrongAnswers(original, edit);
  const nothing = !q.changed && !right.changed && !why.changed && !lecture.changed && !wrong.changed;

  return (
    <div style={{ margin: '16px 0', padding: '10px 14px', border: '1px solid #cfdde2', borderRadius: '8px', background: '#fff', textAlign: 'left' }}>
      <div style={{ fontWeight: 700, color: '#01202C', marginBottom: '4px' }}>What this edit changes</div>
      {nothing && <div style={{ fontSize: '14px', color: '#555' }}>Only spacing or capitals.</div>}
      <Row label="Question" changed={q.changed}><Diffed before={q.before} after={q.after} /></Row>
      <Row label="Correct answer" changed={right.changed}><Diffed before={right.before} after={right.after} /></Row>
      <Row label="Wrong answers" changed={wrong.changed}>
        {wrong.kept.map((a) => <div key={`k${a}`}>{a}</div>)}
        {wrong.dropped.map((a) => <div key={`d${a}`} style={MARK.removed}>{a}</div>)}
        {wrong.added.map((a) => <div key={`a${a}`} style={MARK.added}>{a}</div>)}
      </Row>
      {(why.before || why.after) && (
        <Row label="Explanation" changed={why.changed}><Diffed before={why.before} after={why.after} /></Row>
      )}
      {lecture.changed && (
        <Row label="Lecture" changed><Diffed before={lecture.before} after={lecture.after} /></Row>
      )}
    </div>
  );
}
