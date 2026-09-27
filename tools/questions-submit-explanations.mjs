#!/usr/bin/env node
//
// Turns the decisions from the explanation review page into edits on the NIFE question bank.
// tools/question-explanations-drafts.json holds the 30 drafts (each checked against the
// NIFE student guide or lecture it cites); the decisions are the text the review page's "Copy my decisions"
// button produces, one "#N <choice>" per line.
//
//   node tools/questions-submit-explanations.mjs --decisions=decisions.txt --dry-run
//   node tools/questions-submit-explanations.mjs --decisions=decisions.txt [--author=Loevinger]
//        [--api=<base>] [--mirror=<base>]
//
// Every change goes in as an ordinary edit, through edit-question: it waits in the review queue
// like anyone's, and is approved by the community vote or in the admin panel. Nothing here
// approves anything. A question that already has a pending edit is reported and skipped, since
// the server takes one pending edit per question: decide that one first, then run this again.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const DRY = process.argv.includes('--dry-run');
const API = arg('api', 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss');
const MIRROR = arg('mirror', 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com');
const AUTHOR = arg('author', 'Loevinger');
const here = path.dirname(fileURLToPath(import.meta.url));
const drafts = JSON.parse(fs.readFileSync(path.join(here, 'question-explanations-drafts.json'), 'utf8'));

const file = arg('decisions');
if (!file) {
  console.error('Pass --decisions=<file> with the text the review page copied.');
  process.exit(1);
}

// "#12 Use this explanation" -> { 12: 'use' }. The labels are the review page's.
const LABELS = [
  [/^use this explanation/i, 'use'],
  [/^make the fix/i, 'fix'],
  [/^keep the key/i, 'keep'],
  [/^switch the key/i, 'switch'],
  [/^needs changes/i, 'change'],
  [/^(leave it out|leave as it is)/i, 'skip'],
];
const decisions = {};
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m = /^#(\d+)\s+(.*)$/.exec(line.trim());
  if (!m) continue;
  const hit = LABELS.find(([re]) => re.test(m[2]));
  if (!hit) throw new Error(`Line not understood: ${line}`);
  decisions[Number(m[1])] = hit[1];
}

// What "make the fix" and "switch the key" change, by draft number. The explanation is always
// the draft's, except #20, whose original explanation (public/explanations.json) comes back
// with the key it was written for.
const KEY_CHANGES = {
  9: () => ({ correct: { from: "6,000' MSL", to: "7,000' MSL" }, wrong: { from: "5,000' MSL", to: "6,000' MSL" } }),
  16: () => ({ swapWith: 'Ahead and to the right of you' }),
  20: () => ({ swapWith: 'Not enough information', explanationFrom: 'q_1758428269182_benpefmi9' }),
  25: () => ({ wrong: { from: 'Max speed 250 kts', to: 'Averages 100 to 150 kts, can exceed 250 kts' } }),
};

const WRONG = ['incorrectAnswer1', 'incorrectAnswer2', 'incorrectAnswer3'];
const norm = (s) => (s || '').trim().toLowerCase();

function applyChange(fields, change) {
  const out = { ...fields };
  if (change.correct) {
    if (norm(out.correctAnswer) !== norm(change.correct.from)) throw new Error(`the answer is no longer "${change.correct.from}"`);
    out.correctAnswer = change.correct.to;
  }
  if (change.wrong) {
    const k = WRONG.find((w) => norm(out[w]) === norm(change.wrong.from));
    if (!k) throw new Error(`"${change.wrong.from}" is not one of its wrong answers any more`);
    out[k] = change.wrong.to;
  }
  if (change.swapWith) {
    const k = WRONG.find((w) => norm(out[w]) === norm(change.swapWith));
    if (!k) throw new Error(`"${change.swapWith}" is not one of its wrong answers any more`);
    [out.correctAnswer, out[k]] = [out[k], out.correctAnswer];
  }
  return out;
}

async function read(key) {
  const res = await fetch(`${MIRROR}/${key}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${key}: ${res.status}`);
  return res.json();
}

const live = (await read('questions/nife/approved.json')).questions;
const pending = (await read('questions/nife/pending.json')).questions;
const oldExplanations = JSON.parse(fs.readFileSync(path.join(here, '..', 'public', 'explanations.json'), 'utf8'));

let sent = 0;
for (const d of drafts) {
  const choice = decisions[d.n];
  if (!choice) { console.log(`#${d.n}  no decision, skipped`); continue; }
  if (choice === 'change' || choice === 'skip') { console.log(`#${d.n}  ${choice === 'change' ? 'needs changes, skipped' : 'left out'}`); continue; }
  const q = live.find((x) => x.questionId === d.id);
  if (!q) { console.log(`#${d.n}  no longer in the quiz, skipped`); continue; }
  const waiting = pending.find((p) => p.originalQuestionId === d.id);
  if (waiting) { console.log(`#${d.n}  has a pending edit (${waiting.questionId}): decide that first, then run again`); continue; }

  let fields = {
    topic: q.topic, lecture: q.lecture || '', question: q.question, correctAnswer: q.correctAnswer,
    incorrectAnswer1: q.incorrectAnswer1 || '', incorrectAnswer2: q.incorrectAnswer2 || '', incorrectAnswer3: q.incorrectAnswer3 || '',
    explanation: d.explanation,
  };
  if ((choice === 'fix' || choice === 'switch') && KEY_CHANGES[d.n]) {
    const change = KEY_CHANGES[d.n](q);
    fields = applyChange(fields, change);
    if (change.explanationFrom) fields.explanation = oldExplanations[change.explanationFrom] || d.explanation;
  }
  const body = { ...fields, originalQuestionId: d.id, submittedBy: AUTHOR, type: 'edit' };
  if (DRY) {
    console.log(`#${d.n}  would submit: ✓ ${fields.correctAnswer} | ${fields.explanation.slice(0, 70)}…`);
    continue;
  }
  const res = await fetch(`${API}/edit-question`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const out = await res.json();
  console.log(`#${d.n}  ${res.ok ? `submitted as ${out.questionId}` : `refused: ${out.error}`}`);
  if (res.ok) sent += 1;
}
console.log(DRY ? 'Dry run: nothing sent.' : `${sent} edits submitted for review.`);
