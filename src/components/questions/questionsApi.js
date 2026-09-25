import { call, post, readMirror } from '../serverApi';

// Everything the Questions tab says to the server. Reads come from the mirror lambda/discussApi
// keeps (questions.mjs); every write goes to that function, which rebuilds the mirror before it
// answers, so a read after a write sees the write.

const APPROVED_KEY = 'questions/nife/approved.json';
const PENDING_KEY = 'questions/nife/pending.json';
const ADMIN_TOKEN_KEY = 'qAdminToken';
const VOTER_KEY = 'qVoterId';

// The topics a question can be filed under, in dropdown order. Phase 4 of the plan replaces
// this with a document anyone can edit; until then it is written once, here.
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

export async function loadPending() {
  const data = await readMirror(PENDING_KEY);
  return data && data.questions ? data.questions : [];
}

// 'submit-question' or 'edit-question'. Throws with `.status` 400/409 on a refusal.
export const sendQuestion = (endpoint, payload) => post(endpoint, payload);

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

export const moderate = (token, questionId, action) => call('moderate-question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
  body: JSON.stringify({ questionId, action }),
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
