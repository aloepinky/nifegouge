#!/usr/bin/env node
//
// What the NIFE question bank needs a person to look at, read from the mirror the site reads:
// questions whose wording duplicates another's, the lowest-scored questions, and the pending
// queue by age. Every line carries the question id to search for in the admin panel.
//
//   node tools/questions-report.mjs                   # the live mirror
//   node tools/questions-report.mjs --mirror=http://localhost:8787/mirror
//   node tools/questions-report.mjs --bottom=50
//
// Read-only. It changes nothing; the admin panel (/nife/questions?admin) is where things are
// hidden, restored or decided.

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const MIRROR = arg('mirror', 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com');
const BOTTOM = Number(arg('bottom', 30));

async function read(key) {
  const res = await fetch(`${MIRROR}/${key}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${key}: ${res.status}`);
  return res.json();
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const net = (q) => (q.upvotes || 0) - (q.downvotes || 0);
const short = (s, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const days = (iso) => Math.round((Date.now() - new Date(iso).getTime()) / 864e5);

const approved = (await read('questions/nife/approved.json')).questions;
const pending = await read('questions/nife/pending.json');
const byId = new Map(approved.map((q) => [q.questionId, q]));

console.log(`NIFE question bank: ${approved.length} in the quiz, ${pending.questions.length} pending (decided at ${pending.threshold} net)\n`);

// Duplicates: the same question text once punctuation and case are set aside. Whether the two
// are the same question is for a person: the answers are printed so that can be seen.
const groups = new Map();
for (const q of approved) {
  const key = `${q.topic}|${norm(q.question)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(q);
}
const dupes = [...groups.values()].filter((g) => g.length > 1);
console.log(`== Same wording, ${dupes.length} groups ==`);
for (const g of dupes) {
  console.log(`\n  "${short(g[0].question)}"  [${g[0].topic}]`);
  for (const q of g.sort((a, b) => net(b) - net(a))) {
    console.log(`    ${q.questionId}  ${String(net(q)).padStart(5)}  L${q.lecture || '-'}  ✓ ${short(q.correctAnswer, 50)}${q.explanation ? '  (explained)' : ''}`);
  }
}

console.log(`\n== Lowest scores, bottom ${BOTTOM} ==`);
console.log('  Downvotes never remove a question. These are the ones asking to be fixed or explained.\n');
for (const q of [...approved].sort((a, b) => net(a) - net(b)).slice(0, BOTTOM)) {
  console.log(`  ${String(net(q)).padStart(5)}  ${q.questionId}  [${q.topic} L${q.lecture || '-'}]${q.explanation ? ' (explained)' : ''}  ${short(q.question, 70)}`);
  console.log(`         ✓ ${short(q.correctAnswer, 80)}`);
}

console.log('\n== Pending, oldest first ==');
for (const q of pending.questions) {
  const kind = q.type === 'edit' ? (byId.has(q.originalQuestionId) ? 'edit' : 'edit of a question no longer in the quiz') : 'new';
  console.log(`  ${String(days(q.submittedAt)).padStart(4)}d  ${q.questionId}  ${q.approveCount || 0}/${q.rejectCount || 0}  ${kind}  [${q.topic}]  ${short(q.question, 60)}`);
}
