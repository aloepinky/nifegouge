import { call, post, readMirror } from '../serverApi';

// Everything the Questions tab says to the server. Reads come from the mirror lambda/discussApi
// keeps (questions.mjs); every write goes to that function, which rebuilds the mirror before it
// answers, so a read after a write sees the write.

const APPROVED_KEY = 'questions/nife/approved.json';
const PENDING_KEY = 'questions/nife/pending.json';
const ADMIN_TOKEN_KEY = 'qAdminToken';
const VOTER_KEY = 'qVoterId';

// The six topics the page had before the section list (./sections.js) became an editable
// document. Only a stand-in now, for a mirror that does not have the list yet.
export const TOPICS = [
  { id: 'aero', name: 'Aero' },
  { id: 'engines', name: 'Engines' },
  { id: 'frr', name: 'FR&R' },
  { id: 'nav', name: 'Nav' },
  { id: 'weather', name: 'Weather' },
  { id: 'ground', name: 'Ground School' },
];

export async function loadApproved() {
  const data = await readMirror(APPROVED_KEY);
  if (!data || !data.questions) throw new Error('No questions on the server.');
  return data.questions;
}

// The review queue, oldest first, and the net vote that decides an item. The threshold comes
// from the server; 5 is only what a mirror written before it carried the number means.
export async function loadPending() {
  const data = await readMirror(PENDING_KEY);
  return {
    questions: data && data.questions ? data.questions : [],
    threshold: data && data.threshold ? data.threshold : 5,
  };
}

// What this browser has done with each pending question: 'approve' / 'reject' / 'better' /
// 'worse' for a vote, 'skip' for passed over. Either way it is not offered again here.
const SEEN_KEY = 'votedPendingQuestions';

export function pendingSeen() {
  try {
    const saved = localStorage.getItem(SEEN_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function markPendingSeen(questionId, what) {
  const seen = { ...pendingSeen(), [questionId]: what };
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* private mode */ }
  return seen;
}

// A live question at or below this net score asks, once answered, for someone to suggest an
// edit. Downvotes never remove a question; they point people at fixing it.
export const DISPUTED_AT = -10;

// 'submit-question' or 'edit-question'. Throws with `.status` 400/409 on a refusal.
export const sendQuestion = (endpoint, payload) => post(endpoint, payload);

// A bulk upload, up to 100 at a time: { batchId, submitted: [{ index, questionId }],
// refused: [{ index, error }] }, indexes into `questions`.
export const sendQuestions = (questions, author) => post('submit-questions', { questions, author });

// A thumbs vote on a live question. `previous` is what this browser voted before, so a changed
// or withdrawn vote moves the count rather than adding to it.
export const voteOnQuestion = (questionId, vote, previous) => post('vote-question', { questionId, vote, previous });

// A vote on a pending question. Resolves to the server's count and, at the threshold, its
// decision (`outcome`); resolves to null on a 409, which means already voted or already decided.
export async function voteOnPending(questionId, vote) {
  try {
    return await post('vote-pending-question', { questionId, vote, voter: voterId() });
  } catch (err) {
    if (err.status === 409) return null;
    throw err;
  }
}

// Earlier versions of a question: { questionId, rev, history }. Read from the Lambda, not the
// mirror, since it is rarely wanted.
export const questionHistory = (questionId) => call(`question-history?id=${encodeURIComponent(questionId)}`);

// The admin operations. Each carries the token; the server refuses all of them without it.
const adminPost = (token, op, body) => call(op, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
  body: JSON.stringify(body),
});

export const moderate = (token, questionId, action) => adminPost(token, 'moderate-question', { questionId, action });
export const bulkModerate = (token, questionIds, action) => adminPost(token, 'bulk-moderate', { questionIds, action });
// 'hidden' takes a question out of the quiz, 'approved' puts it back, 'pending' sends a
// rejected one back for another vote.
export const setQuestionStatus = (token, questionId, status) => adminPost(token, 'set-question-status', { questionId, status });
export const restoreVersion = (token, questionId, rev) => adminPost(token, 'restore-question-version', { questionId, rev });

// Rows in neither mirror file: 'hidden', 'rejected', 'merged' or 'replaced'.
export const adminQuestions = (token, status) => call(`admin-questions?status=${encodeURIComponent(status)}`, {
  headers: { 'X-Admin-Token': token },
});

export function getAdminToken() {
  try { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch { return ''; }
}

export function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Private mode: the token lasts as long as the page.
  }
}

// This browser's voter id for community review: one vote per browser per pending question.
function voterId() {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------------------

export function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const LAST = ['all of the above', 'none of the above'];

// A question's choices in a random order, except that "all/none of the above" stays last,
// where it only makes sense.
export function answerChoices(q) {
  const answers = [q.correctAnswer, q.incorrectAnswer1, q.incorrectAnswer2, q.incorrectAnswer3].filter(Boolean);
  const isLast = (a) => LAST.some((phrase) => a.toString().toLowerCase().includes(phrase));
  return [...shuffle(answers.filter((a) => !isLast(a))), ...answers.filter(isLast)];
}

export const netScore = (q) => (q.upvotes || 0) - (q.downvotes || 0);

// Lectures present in a topic, numerically where they are numbers.
export function lecturesIn(questions, topic) {
  const found = new Set(questions
    .filter((q) => (q.topic || '').toLowerCase() === topic)
    .map((q) => q.lecture)
    .filter((l) => l !== undefined && l !== null && l !== '')
    .map(String));
  return [...found].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

export const inFilter = (topic, lecture) => (q) => (
  (q.topic || '').toLowerCase() === topic && (lecture === 'All' || String(q.lecture) === lecture)
);
