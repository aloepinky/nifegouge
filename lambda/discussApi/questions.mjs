import { createHash } from 'node:crypto';
import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamo, CONFIG } from './clients.mjs';
import { HttpError, parseBody, reply } from './http.mjs';
import { putJson } from './mirror.mjs';

// The NIFE Questions tab: multiple-choice questions anyone may submit or edit, approved by the
// community voting on them in the quiz or by the admin. Moved here from lambda/submitQuestion
// for the admin token, the mirror and the deploy; the table, NIFEQuestions, is the one that
// function wrote, unchanged in shape.
//
// A row is `{ questionId, status, topic, lecture, question, correctAnswer, incorrectAnswer1-3,
// upvotes, downvotes, ... }`, and `status` is its whole lifecycle:
//
//   pending   a submission or an edit waiting on votes
//   approved  in the quiz
//   rejected  voted down, turned down by the admin, or superseded by a competing edit
//   replaced  an approved question an approved edit took the place of (`replacedBy`)
//
// Nothing is deleted. The function this replaced deleted a rejected submission, and deleted the
// original when an edit was approved, so a bad approval could not be undone and the original's
// explanation was orphaned. A row that leaves the quiz now keeps its words and says why.
//
// Reads never come here: every write rebuilds the two mirror files, and the page fetches them.
//
//   questions/nife/approved.json   { generatedAt, questions: [...] }  what the quiz draws from
//   questions/nife/pending.json    { generatedAt, questions: [...] }  what the community votes on
//
// Every row changes through `change()`: read, edit, put back conditional on the `ver` the read
// saw, retry on a clash. That is what makes a vote count and a threshold decision server-side
// facts rather than whatever the voter's browser last saw.

export const APPROVED_KEY = 'questions/nife/approved.json';
export const PENDING_KEY = 'questions/nife/pending.json';

// Net community votes that approve (+) or reject (-) a pending question.
export const THRESHOLD = 5;

const MAX_QUESTION = 1000;
const MAX_ANSWER = 500;
const MAX_TOPIC = 40;
const MAX_LECTURE = 40;

// What the mirror carries. Voter hashes, submitter names and moderation bookkeeping stay in the
// table: the page never reads them, and the hashes are nobody's business.
const PUBLIC = [
  'questionId', 'topic', 'lecture', 'question', 'correctAnswer', 'incorrectAnswer1',
  'incorrectAnswer2', 'incorrectAnswer3', 'upvotes', 'downvotes', 'createdAt', 'submittedAt',
  'type', 'originalQuestionId', 'approveCount', 'rejectCount',
];

const db = () => getDynamo();
const table = () => CONFIG.questionsTable;
const now = () => new Date().toISOString();

// Control characters out (newlines are kept), trimmed, capped.
function clip(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
}

function newId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function publicRow(row) {
  const out = {};
  for (const key of PUBLIC) if (row[key] !== undefined && row[key] !== null) out[key] = row[key];
  return out;
}

async function scanAll() {
  const rows = [];
  let start;
  do {
    const out = await db().send(new ScanCommand({
      TableName: table(),
      ...(start ? { ExclusiveStartKey: start } : {}),
    }));
    rows.push(...(out.Items || []));
    start = out.LastEvaluatedKey;
  } while (start);
  return rows;
}

async function getRow(questionId) {
  if (typeof questionId !== 'string' || !questionId) throw new HttpError(400, 'No question named');
  const out = await db().send(new GetCommand({ TableName: table(), Key: { questionId } }));
  return out.Item || null;
}

// Read a row, let `edit` change it in place, write it back only if nobody else wrote it in
// between. `edit` returns false to leave the row alone. Returns the row as written (or as read,
// when left alone).
async function change(questionId, edit, tries = 6) {
  for (let i = 0; i < tries; i += 1) {
    const row = await getRow(questionId);
    if (!row) throw new HttpError(404, 'Question not found');
    const seen = row.ver;
    if (edit(row) === false) return row;
    row.ver = (seen || 0) + 1;
    try {
      await db().send(new PutCommand({
        TableName: table(),
        Item: row,
        ConditionExpression: seen === undefined ? 'attribute_not_exists(ver)' : 'ver = :ver',
        ...(seen === undefined ? {} : { ExpressionAttributeValues: { ':ver': seen } }),
      }));
      return row;
    } catch (error) {
      if (error.name !== 'ConditionalCheckFailedException') throw error;
    }
  }
  throw new HttpError(409, 'Too many people are voting on this at once. Try again.');
}

// Both mirror files from one scan. Approved questions go out best-voted first, then newest,
// which is the order the function before this one served them in.
export async function rebuildQuestionsMirror() {
  const rows = await scanAll();
  const approved = rows.filter((r) => r.status === 'approved');
  const pending = rows.filter((r) => r.status === 'pending');
  const net = (r) => (r.upvotes || 0) - (r.downvotes || 0);
  approved.sort((a, b) => (net(b) - net(a)) || String(b.createdAt).localeCompare(String(a.createdAt)));
  pending.sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));
  const generatedAt = now();
  await putJson(APPROVED_KEY, { generatedAt, questions: approved.map(publicRow) });
  await putJson(PENDING_KEY, { generatedAt, questions: pending.map(publicRow) });
  return { approved: approved.length, pending: pending.length };
}

const norm = (s) => (s || '').trim().toLowerCase();

function readFields(body) {
  const fields = {
    topic: clip(body.topic, MAX_TOPIC).toLowerCase(),
    lecture: clip(String(body.lecture ?? ''), MAX_LECTURE),
    question: clip(body.question, MAX_QUESTION),
    correctAnswer: clip(body.correctAnswer, MAX_ANSWER),
    incorrectAnswer1: clip(body.incorrectAnswer1, MAX_ANSWER),
    incorrectAnswer2: clip(body.incorrectAnswer2, MAX_ANSWER),
    incorrectAnswer3: clip(body.incorrectAnswer3, MAX_ANSWER),
  };
  if (!fields.topic || !fields.question || !fields.correctAnswer) {
    throw new HttpError(400, 'A question needs a topic, the question and its correct answer.');
  }
  const answers = [fields.correctAnswer, fields.incorrectAnswer1, fields.incorrectAnswer2, fields.incorrectAnswer3]
    .map(norm).filter(Boolean);
  if (answers.length < 2) throw new HttpError(400, 'A question needs at least one wrong answer.');
  // The quiz marks an answer correct by its text, so two choices reading the same would both
  // light up green.
  if (new Set(answers).size !== answers.length) throw new HttpError(400, 'Two of the answers are the same.');
  return fields;
}

function pendingRow(fields, body, extra) {
  const stamp = now();
  return {
    questionId: newId(),
    ...fields,
    status: 'pending',
    submittedBy: clip(body.submittedBy, 60) || 'anonymous',
    submittedAt: stamp,
    createdAt: stamp,
    upvotes: 0,
    downvotes: 0,
    approveCount: 0,
    rejectCount: 0,
    voters: [],
    ...extra,
  };
}

async function putNew(row) {
  await db().send(new PutCommand({
    TableName: table(),
    Item: row,
    ConditionExpression: 'attribute_not_exists(questionId)',
  }));
}

// POST submit-question { topic, lecture?, question, correctAnswer, incorrectAnswer1-3 }
export async function submitQuestionHandler(event) {
  const body = parseBody(event);
  const row = pendingRow(readFields(body), body, { type: 'new', editHistory: [] });
  await putNew(row);
  await rebuildQuestionsMirror();
  return reply(200, { success: true, questionId: row.questionId });
}

const answerSet = (r) => new Set(
  [r.correctAnswer, r.incorrectAnswer1, r.incorrectAnswer2, r.incorrectAnswer3].map(norm).filter(Boolean),
);

// POST edit-question { originalQuestionId, ...the fields of submit-question }
// One pending edit per question at a time, and an edit that changes nothing is refused.
export async function editQuestionHandler(event) {
  const body = parseBody(event);
  const fields = readFields(body);
  const original = await getRow(body.originalQuestionId);
  if (!original) throw new HttpError(404, 'Original question not found');
  if (original.status !== 'approved') {
    throw new HttpError(409, 'That question has changed since this page loaded. Reload and try again.');
  }

  const rows = await scanAll();
  if (rows.some((r) => r.status === 'pending' && r.originalQuestionId === original.questionId)) {
    throw new HttpError(409, 'An edit is already pending review for this question. Check back after the community votes on it.');
  }

  const a = answerSet(original);
  const b = answerSet(fields);
  const sameAnswers = a.size === b.size && [...a].every((x) => b.has(x));
  if (norm(original.question) === norm(fields.question) && sameAnswers) {
    throw new HttpError(400, 'This edit is identical to the existing question. Make a meaningful change before submitting.');
  }

  const row = pendingRow(fields, body, {
    type: 'edit',
    originalQuestionId: original.questionId,
    editHistory: [...(original.editHistory || []), original.questionId],
  });
  await putNew(row);
  await change(original.questionId, (o) => {
    o.hasPendingEdit = true;
    o.latestEditId = row.questionId;
  });
  await rebuildQuestionsMirror();
  return reply(200, { success: true, questionId: row.questionId });
}

const VOTES = ['good', 'bad'];
const COUNTER = { good: 'upvotes', bad: 'downvotes' };

// POST vote-question { questionId, vote: 'good'|'bad'|null, previous: 'good'|'bad'|null }
// A thumbs up or down on an approved question. `previous` is what this browser voted before,
// so changing or withdrawing a vote moves the count back rather than adding to it; the old
// function only ever incremented, and every changed mind counted twice.
export async function voteQuestionHandler(event) {
  const body = parseBody(event);
  const vote = VOTES.includes(body.vote) ? body.vote : null;
  const previous = VOTES.includes(body.previous) ? body.previous : null;
  if (vote === previous) throw new HttpError(400, 'Nothing to change');
  const row = await change(body.questionId, (q) => {
    if (q.status !== 'approved') throw new HttpError(409, 'That question is no longer in the quiz.');
    if (previous) q[COUNTER[previous]] = Math.max(0, (q[COUNTER[previous]] || 0) - 1);
    if (vote) q[COUNTER[vote]] = (q[COUNTER[vote]] || 0) + 1;
  });
  await rebuildQuestionsMirror();
  return reply(200, { success: true, upvotes: row.upvotes || 0, downvotes: row.downvotes || 0 });
}

// Who is voting, as far as a site without accounts can tell: an id the browser makes once and
// keeps. Not the caller's address, because a squadron's students share addresses (one apartment
// complex, one Wi-Fi network) and an address rule would count them all as one voter. A browser
// id stops the accidental second vote, not a determined one; that is what the admin panel and
// nothing ever being deleted are for. Hashed with the question so two questions' voters cannot
// be joined.
function voterOf(body) {
  const id = typeof body.voter === 'string' ? body.voter : '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  return createHash('sha256').update(`${body.questionId}|${id}`).digest('hex').slice(0, 16);
}

// Approve a pending row: it enters the quiz, and if it is an edit, the question it edits leaves
// it as `replaced` and any competing edit of that question is rejected as superseded.
async function approve(questionId, by) {
  let decided = false;
  const row = await change(questionId, (q) => {
    decided = false;
    if (q.status !== 'pending') return false;
    q.status = 'approved';
    q.moderatedAt = now();
    q.moderatedBy = by;
    decided = true;
  });
  if (!decided || row.type !== 'edit' || !row.originalQuestionId) return;
  const originalId = row.originalQuestionId;
  await change(originalId, (o) => {
    o.status = 'replaced';
    o.replacedBy = questionId;
    o.replacedAt = now();
    o.hasPendingEdit = false;
  }).catch((error) => { if (!(error instanceof HttpError && error.status === 404)) throw error; });
  const rivals = (await scanAll()).filter((r) => (
    r.status === 'pending' && r.originalQuestionId === originalId && r.questionId !== questionId
  ));
  for (const r of rivals) {
    await change(r.questionId, (q) => {
      if (q.status !== 'pending') return false;
      q.status = 'rejected';
      q.rejectedReason = 'superseded';
      q.moderatedAt = now();
      q.moderatedBy = by;
    });
  }
}

async function reject(questionId, by) {
  const row = await change(questionId, (q) => {
    if (q.status !== 'pending') return false;
    q.status = 'rejected';
    q.moderatedAt = now();
    q.moderatedBy = by;
  });
  if (row.type !== 'edit' || !row.originalQuestionId) return;
  await change(row.originalQuestionId, (o) => {
    if (o.latestEditId !== questionId) return false;
    o.hasPendingEdit = false;
    delete o.latestEditId;
  }).catch((error) => { if (!(error instanceof HttpError && error.status === 404)) throw error; });
}

// POST vote-pending-question { questionId, vote: 'approve'|'reject' }
// The count and the decision are both made here. At a net of +THRESHOLD the question is
// approved, at -THRESHOLD rejected, before the response goes back.
export async function votePendingHandler(event) {
  const body = parseBody(event);
  // 'good' and 'bad' are what the quiz's thumbs sent on a new submission until 2026-09-25;
  // a page loaded before then still sends them.
  const up = ['approve', 'better', 'good'].includes(body.vote);
  const down = ['reject', 'worse', 'bad'].includes(body.vote);
  if (!up && !down) throw new HttpError(400, 'A vote is approve or reject');
  const voter = voterOf(body);

  const row = await change(body.questionId, (q) => {
    if (q.status !== 'pending') throw new HttpError(409, 'This question has already been decided.');
    const voters = Array.isArray(q.voters) ? q.voters : [];
    if (voter && voters.includes(voter)) throw new HttpError(409, 'You have already voted on this question.');
    if (up) q.approveCount = (q.approveCount || 0) + 1;
    else q.rejectCount = (q.rejectCount || 0) + 1;
    if (voter) q.voters = [...voters, voter];
  });

  const approveCount = row.approveCount || 0;
  const rejectCount = row.rejectCount || 0;
  const netScore = approveCount - rejectCount;
  let outcome = null;
  if (netScore >= THRESHOLD) {
    await approve(row.questionId, 'community-threshold');
    outcome = 'approved';
  } else if (netScore <= -THRESHOLD) {
    await reject(row.questionId, 'community-threshold');
    outcome = 'rejected';
  }
  await rebuildQuestionsMirror();
  return reply(200, { success: true, approveCount, rejectCount, netScore, threshold: THRESHOLD, outcome });
}

// POST moderate-question (admin) { questionId, action: 'approve'|'reject' }
export async function moderateQuestionHandler(event) {
  const body = parseBody(event);
  const row = await getRow(body.questionId);
  if (!row) throw new HttpError(404, 'Question not found');
  if (row.status !== 'pending') throw new HttpError(409, `This question is already ${row.status}.`);
  if (body.action === 'approve') await approve(row.questionId, 'admin');
  else if (body.action === 'reject') await reject(row.questionId, 'admin');
  else throw new HttpError(400, 'An action is approve or reject');
  const out = await rebuildQuestionsMirror();
  return reply(200, { success: true, ...out });
}
