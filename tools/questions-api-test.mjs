#!/usr/bin/env node
//
// End-to-end checks of the NIFE question ops in lambda/discussApi (questions.mjs), run in
// process against the fakes in tools/lib/fakeAws.mjs: no server, no AWS account.
//
//   node tools/questions-api-test.mjs
//
// Exits non-zero if any check fails. Add a check here with every new question op.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAMBDA = path.join(ROOT, 'lambda', 'discussApi');

process.env.DISCUSS_ADMIN_TOKEN = 'test-token';
// The deploy workflow copies the lint rules in; do the same so index.mjs resolves.
fs.copyFileSync(path.join(ROOT, 'tools', 'lib', 'discussRules.mjs'), path.join(LAMBDA, 'discussRules.mjs'));

const load = (file) => import(pathToFileURL(file));
const { FakeDynamo, FakeS3 } = await load(path.join(ROOT, 'tools', 'lib', 'fakeAws.mjs'));
const { setClients } = await load(path.join(LAMBDA, 'clients.mjs'));
const { handler } = await load(path.join(LAMBDA, 'index.mjs'));

const mirrorDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questions-test-'));
const dynamo = new FakeDynamo(null);
setClients({ dynamo, s3: new FakeS3(mirrorDir) });

// ---------------------------------------------------------------------------------------
// A small bank: five approved questions across two topics, one pending edit.

const approvedRow = (n, topic, extra = {}) => ({
  questionId: `q_seed_${n}`,
  status: 'approved',
  topic,
  lecture: '1',
  question: `Seed question ${n}?`,
  correctAnswer: `Right ${n}`,
  incorrectAnswer1: `Wrong ${n}a`,
  incorrectAnswer2: `Wrong ${n}b`,
  incorrectAnswer3: `Wrong ${n}c`,
  upvotes: 10 * n,
  downvotes: n,
  createdAt: `2025-09-2${n}T00:00:00.000Z`,
  submittedBy: 'migration',
  editHistory: [],
  ...extra,
});

const table = dynamo.table('NIFEQuestions');
for (const [n, topic] of [[1, 'aero'], [2, 'aero'], [3, 'aero'], [4, 'weather'], [5, 'weather']]) {
  const row = approvedRow(n, topic);
  table[row.questionId] = row;
}
table.q_seed_edit = {
  ...approvedRow(9, 'aero'),
  questionId: 'q_seed_edit',
  status: 'pending',
  type: 'edit',
  originalQuestionId: 'q_seed_1',
  submittedAt: '2026-07-30T00:00:00.000Z',
  approveCount: 1,
  rejectCount: 0,
};

// ---------------------------------------------------------------------------------------

let failures = 0;
function ok(condition, message) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${message}`);
  if (!condition) failures += 1;
}

// The handler logs one line per request for CloudWatch; that is noise here.
const quiet = (fn) => async (...args) => {
  const log = console.log;
  console.log = () => {};
  try { return await fn(...args); } finally { console.log = log; }
};

const op = quiet(async (name, { body, method = 'POST', headers = {}, query } = {}) => {
  const out = await handler({
    httpMethod: method,
    path: `/discuss/${name}`,
    pathParameters: { proxy: name },
    queryStringParameters: query || null,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? null : JSON.stringify(body),
  });
  return { status: out.statusCode, ...JSON.parse(out.body || '{}') };
});

const admin = { 'X-Admin-Token': 'test-token' };
const mirror = (name) => JSON.parse(fs.readFileSync(path.join(mirrorDir, 'questions', 'nife', `${name}.json`), 'utf8')).questions;
const row = (id) => dynamo.table('NIFEQuestions')[id];
const voter = (n) => `browser-${n}-abcdef`;

// The mirror
let r = await op('rebuild-index', { body: { what: 'questions' }, headers: admin });
ok(r.questions && r.questions.approved === 5 && r.questions.pending === 1, `rebuild counts ${JSON.stringify(r.questions)}`);
const approved = mirror('approved');
ok(approved[0].questionId === 'q_seed_5', 'approved mirror is best-voted first');
ok(!('submittedBy' in approved[0]) && !('voters' in approved[0]), 'mirror carries no private fields');

// The admin token
r = await op('moderate-question', { body: { questionId: 'q_seed_edit', action: 'reject' } });
ok(r.status === 401, `moderate without the token is refused (${r.status})`);
r = await op('rebuild-index', { body: { what: 'questions' } });
ok(r.status === 401, `rebuild without the token is refused (${r.status})`);
r = await op('moderate-question', { body: { questionId: 'q_seed_2', action: 'reject' }, headers: admin });
ok(r.status === 409, `the admin cannot reject a live question (${r.status})`);

// Thumbs votes move rather than add
r = await op('vote-question', { body: { questionId: 'q_seed_3', vote: 'good', previous: null } });
ok(r.upvotes === 31 && r.downvotes === 3, 'upvote adds one');
r = await op('vote-question', { body: { questionId: 'q_seed_3', vote: 'bad', previous: 'good' } });
ok(r.upvotes === 30 && r.downvotes === 4, 'a changed vote moves');
r = await op('vote-question', { body: { questionId: 'q_seed_3', vote: null, previous: 'bad' } });
ok(r.upvotes === 30 && r.downvotes === 3, 'a withdrawn vote comes back off');
ok(mirror('approved').find((q) => q.questionId === 'q_seed_3').downvotes === 3, 'the mirror follows the votes');

// Submission and community approval
r = await op('submit-question', { body: { topic: 'Aero', lecture: '2', question: 'New question?', correctAnswer: 'A', incorrectAnswer1: 'B' } });
const fresh = r.questionId;
ok(Boolean(fresh), 'a new question is accepted');
ok(mirror('pending').some((q) => q.questionId === fresh && q.topic === 'aero'), 'it is on the pending mirror, topic lowercased');
r = await op('vote-pending-question', { body: { questionId: fresh, vote: 'approve', voter: voter(1) } });
ok(r.netScore === 1 && r.outcome === null, 'first approval counts');
r = await op('vote-pending-question', { body: { questionId: fresh, vote: 'approve', voter: voter(1) } });
ok(r.status === 409, `the same browser cannot vote twice (${r.status})`);
for (const n of [2, 3, 4]) r = await op('vote-pending-question', { body: { questionId: fresh, vote: 'approve', voter: voter(n) } });
ok(r.netScore === 4 && r.outcome === null, 'four approvals are not enough');
r = await op('vote-pending-question', { body: { questionId: fresh, vote: 'approve', voter: voter(5) } });
ok(r.outcome === 'approved', 'the fifth approval approves');
ok(mirror('approved').some((q) => q.questionId === fresh), 'an approved question enters the quiz');
r = await op('vote-pending-question', { body: { questionId: fresh, vote: 'approve', voter: voter(6) } });
ok(r.status === 409, 'no votes after the decision');

// The thumbs on a page loaded before 2026-09-25 send 'good' / 'bad'
r = await op('submit-question', { body: { topic: 'aero', question: 'Legacy thumbs?', correctAnswer: 'A', incorrectAnswer1: 'B' } });
const legacy = r.questionId;
r = await op('vote-pending-question', { body: { questionId: legacy, vote: 'good', voter: voter(21) } });
ok(r.approveCount === 1 && r.rejectCount === 0, "a legacy 'good' counts as an approval");
r = await op('vote-pending-question', { body: { questionId: legacy, vote: 'bad', voter: voter(22) } });
ok(r.rejectCount === 1, "a legacy 'bad' counts as a rejection");
r = await op('vote-pending-question', { body: { questionId: legacy, vote: 'maybe', voter: voter(23) } });
ok(r.status === 400, `an unknown vote is refused (${r.status})`);

// Community rejection keeps the row
r = await op('submit-question', { body: { topic: 'nav', question: 'Bad?', correctAnswer: 'z', incorrectAnswer1: 'y' } });
const bad = r.questionId;
for (const n of [11, 12, 13, 14, 15]) r = await op('vote-pending-question', { body: { questionId: bad, vote: 'reject', voter: voter(n) } });
ok(r.outcome === 'rejected', 'five rejections reject');
ok(row(bad) && row(bad).status === 'rejected', 'a rejected question is kept, not deleted');

// Edits
const orig = row('q_seed_2');
const editBody = (changes) => ({
  originalQuestionId: 'q_seed_2',
  topic: orig.topic,
  lecture: orig.lecture,
  question: orig.question,
  correctAnswer: orig.correctAnswer,
  incorrectAnswer1: orig.incorrectAnswer1,
  incorrectAnswer2: orig.incorrectAnswer2,
  incorrectAnswer3: orig.incorrectAnswer3,
  ...changes,
});
r = await op('edit-question', { body: editBody({}) });
ok(r.status === 400, `an identical edit is refused (${r.status})`);
r = await op('edit-question', { body: editBody({ question: `${orig.question} (edited)` }) });
const edit = r.questionId;
ok(Boolean(edit), 'an edit is accepted');
r = await op('edit-question', { body: editBody({ question: `${orig.question} (again)` }) });
ok(r.status === 409, `a second pending edit is refused (${r.status})`);
r = await op('moderate-question', { body: { questionId: edit, action: 'approve' }, headers: admin });
ok(r.success, 'the admin approves the edit');
const live = mirror('approved');
ok(live.some((q) => q.questionId === edit) && !live.some((q) => q.questionId === 'q_seed_2'), 'the edit is live and the original is out of the quiz');
ok(row('q_seed_2').status === 'replaced' && row('q_seed_2').replacedBy === edit, 'the original is kept as replaced');

// Validation
r = await op('submit-question', { body: { topic: '', question: 'x', correctAnswer: 'y' } });
ok(r.status === 400, `a question with no topic is refused (${r.status})`);
r = await op('submit-question', { body: { topic: 'aero', question: 'Only one answer?', correctAnswer: 'Yes' } });
ok(r.status === 400, `a question with no wrong answer is refused (${r.status})`);
r = await op('submit-question', { body: { topic: 'aero', question: 'Twins?', correctAnswer: 'Same', incorrectAnswer1: ' same ', incorrectAnswer2: 'Other' } });
ok(r.status === 400, `a question with two identical answers is refused (${r.status})`);
r = await op('edit-question', { body: editBody({ originalQuestionId: 'q_seed_3', question: 'Seed question 3?', correctAnswer: 'Right 3', incorrectAnswer1: 'right 3' }) });
ok(r.status === 400, `an edit with two identical answers is refused (${r.status})`);

fs.rmSync(mirrorDir, { recursive: true, force: true });
console.log(failures ? `${failures} FAILED` : 'ALL PASS');
process.exit(failures ? 1 : 0);
