import React from 'react';
import { lcsOps } from '../briefs/briefDiff';

// What a proposed edit changes, for someone deciding whether it is better. Each part of the
// question is shown once: unchanged parts plainly, changed ones with the removed words struck
// through and the added words marked, word by word, because an edit that fixes one number in a
// sentence is invisible to anyone asked to compare two whole sentences.

const tokens = (text) => (text || '').split(/(\s+)/).filter((t) => t !== '');

// Longest-common-subsequence diff over words (spaces kept as their own tokens), the same
// lcsOps as lineDiff in briefs/briefDiff.js one level down, with runs of one state joined.
export function wordDiff(before, after) {
  const out = [];
  lcsOps(tokens(before), tokens(after)).forEach(({ token, state }) => {
    const last = out[out.length - 1];
    if (last && last.state === state) last.text += token;
    else out.push({ text: token, state });
  });
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
        The question this edit changes has been removed, so there is nothing to compare it with.
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
      <div style={{ fontWeight: 700, color: '#01202C', marginBottom: '4px' }}>What changed</div>
      {nothing && <div style={{ fontSize: '14px', color: '#555' }}>Only the spacing changed.</div>}
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
