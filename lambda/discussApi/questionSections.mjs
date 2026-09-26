import { HttpError, cleanText, parseBody, reply } from './http.mjs';
import {
  createQuestionSections, newestQuestionSections, questionSectionsHistory, questionSectionsMeta,
  questionSectionsRevision, saveQuestionSections,
} from './store.mjs';
import { putJson } from './mirror.mjs';

// The NIFE Questions tab's topics ("sections") and their lectures, as a document anyone may
// edit, because NIFE drops and adds topics and the quiz has to follow without a deploy. The
// same model as the jet logs: every save is a revision, a stale baseRev gets a 409, History
// restores any revision, nothing is deleted.
//
//   { school: 'NIFE', sections: [{ id, name, retired?, lectures: [{ id, name, retired? }] }] }
//
// Array order is display order. A question files itself under a section id and a lecture id,
// so an id, once saved, is never removed: a save that drops one is refused, and taking a topic
// or a lecture out of use is `retired: true`, which hides it and its questions and is undone by
// clearing it. A restore of an old revision puts back, retired, anything saved since that the
// old revision did not have, for the same reason.
//
// Mirrored to questions/nife/sections.json as { rev, updatedAt, author, summary, doc }.

export const SECTIONS_KEY = 'questions/nife/sections.json';
const LIST_ID = 'nife';
const MAX_SECTIONS = 50;
const MAX_LECTURES = 60;

const SECTION_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LECTURE_ID = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;

const cleanAuthor = (value) => cleanText(value, 40);
const cleanSummary = (value) => cleanText(value, 200);
const ok = (extra) => reply(200, { success: true, ...extra });

// The document as it will be stored: names trimmed, `retired` only where true, nothing else
// carried. Throws on anything malformed, and on any id `previous` had that this one drops.
export function checkSections(doc, previous) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.sections)) throw new HttpError(400, 'The sections document needs a list of sections');
  if (!doc.sections.length) throw new HttpError(400, 'There has to be at least one section');
  if (doc.sections.length > MAX_SECTIONS) throw new HttpError(400, `At most ${MAX_SECTIONS} sections`);
  const seen = new Set();
  const sections = doc.sections.map((s) => {
    const id = typeof s.id === 'string' ? s.id : '';
    const name = cleanText(s.name, 40);
    if (!SECTION_ID.test(id) || id.length > 40) throw new HttpError(400, `"${s.name || id}" needs an id of lowercase words joined by hyphens`);
    if (seen.has(id)) throw new HttpError(400, `Two sections share the id ${id}`);
    seen.add(id);
    if (!name) throw new HttpError(400, 'Every section needs a name');
    const lectures = Array.isArray(s.lectures) ? s.lectures : [];
    if (lectures.length > MAX_LECTURES) throw new HttpError(400, `${name} has more than ${MAX_LECTURES} lectures`);
    const seenLectures = new Set();
    const cleanLectures = lectures.map((l) => {
      const lid = typeof l.id === 'string' ? l.id : '';
      const lname = cleanText(l.name, 60);
      if (!LECTURE_ID.test(lid) || lid.length > 20) throw new HttpError(400, `A lecture in ${name} has a malformed id`);
      if (seenLectures.has(lid)) throw new HttpError(400, `Two lectures in ${name} share the id ${lid}`);
      seenLectures.add(lid);
      if (!lname) throw new HttpError(400, `Every lecture in ${name} needs a name`);
      return { id: lid, name: lname, ...(l.retired === true ? { retired: true } : {}) };
    });
    return { id, name, ...(s.retired === true ? { retired: true } : {}), lectures: cleanLectures };
  });
  if (previous) {
    for (const old of previous.sections) {
      const now = sections.find((s) => s.id === old.id);
      if (!now) throw new HttpError(400, `${old.name} cannot be removed, because questions are filed under it. Retire it instead.`);
      for (const lecture of old.lectures || []) {
        if (!now.lectures.some((l) => l.id === lecture.id)) {
          throw new HttpError(400, `${old.name}: ${lecture.name} cannot be removed. Retire it instead.`);
        }
      }
    }
  }
  return { school: 'NIFE', sections };
}

// `doc` with everything `current` has and it lacks put back at the end, retired.
function withNothingLost(doc, current) {
  const sections = doc.sections.map((s) => ({ ...s, lectures: [...s.lectures] }));
  for (const cur of current.sections) {
    const mine = sections.find((s) => s.id === cur.id);
    if (!mine) {
      sections.push({ ...cur, retired: true, lectures: cur.lectures.map((l) => ({ ...l })) });
      continue;
    }
    for (const lecture of cur.lectures) {
      if (!mine.lectures.some((l) => l.id === lecture.id)) mine.lectures.push({ ...lecture, retired: true });
    }
  }
  return { ...doc, sections };
}

// The newest document, or null before one has been imported. questions.mjs checks a
// submission's topic and lecture against it.
export async function currentSections() {
  const found = await newestQuestionSections(LIST_ID);
  return found ? JSON.parse(found.row.docJson) : null;
}

async function mirror(row) {
  await putJson(SECTIONS_KEY, {
    rev: row.rev,
    updatedAt: row.createdAt,
    author: row.author || '',
    summary: row.summary || '',
    doc: JSON.parse(row.docJson),
  });
}

// Writes the newest revision to the mirror again; rebuild-index 'questions' calls it, so a mirror
// that has lost the file (or a dev server started from a copy of the table) gets it back.
export async function remirrorSections() {
  const found = await newestQuestionSections(LIST_ID);
  if (!found) return null;
  await mirror(found.row);
  return found.row.rev;
}

// ---------------------------------------------------------------------------------------

// POST save-question-sections { baseRev, doc, author?, summary }   -> { rev }; 400; 409
export async function saveSectionsHandler(event) {
  const body = parseBody(event);
  const baseRev = body.baseRev;
  if (!Number.isInteger(baseRev) || baseRev < 1) throw new HttpError(400, 'baseRev is required');
  const summary = cleanSummary(body.summary);
  if (!summary) throw new HttpError(400, 'Say what you changed: a summary is required');
  const found = await newestQuestionSections(LIST_ID);
  if (!found) throw new HttpError(404, 'There is no sections list yet');
  if (found.meta.latestRev !== baseRev) throw new HttpError(409, 'Someone saved the sections since you opened them', { rev: found.meta.latestRev });
  const doc = checkSections(body.doc, JSON.parse(found.row.docJson));
  const written = await saveQuestionSections(LIST_ID, baseRev, doc, { author: cleanAuthor(body.author), summary });
  await mirror(written.row);
  return ok({ rev: written.row.rev, updatedAt: written.row.createdAt });
}

// GET question-sections-history   -> { latestRev, revisions: [{ rev, author, summary, createdAt }] }
export async function sectionsHistoryHandler() {
  const meta = await questionSectionsMeta(LIST_ID);
  if (!meta) throw new HttpError(404, 'There is no sections list yet');
  return ok({ latestRev: meta.latestRev, revisions: await questionSectionsHistory(LIST_ID) });
}

// GET question-sections-revision?rev=   -> { revision: { rev, updatedAt, author, summary, doc } }
export async function sectionsRevisionHandler(event) {
  const rev = Number((event.queryStringParameters || {}).rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const row = await questionSectionsRevision(LIST_ID, rev);
  if (!row) throw new HttpError(404, 'No such revision');
  return ok({ revision: { rev: row.rev, updatedAt: row.createdAt, author: row.author || '', summary: row.summary || '', doc: JSON.parse(row.docJson) } });
}

// POST restore-question-sections { rev, author?, summary? }   -> { rev }
// The old document becomes a new revision on top of the newest, so a restore is itself undone
// from History; anything it would drop comes back retired (see the top of this file).
export async function restoreSectionsHandler(event) {
  const body = parseBody(event);
  const rev = Number(body.rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const found = await newestQuestionSections(LIST_ID);
  if (!found) throw new HttpError(404, 'There is no sections list yet');
  const old = await questionSectionsRevision(LIST_ID, rev);
  if (!old) throw new HttpError(404, 'No such revision');
  const current = JSON.parse(found.row.docJson);
  const doc = checkSections(withNothingLost(JSON.parse(old.docJson), current), current);
  const summary = cleanSummary(body.summary) || `Restored revision ${rev}`;
  const written = await saveQuestionSections(LIST_ID, found.meta.latestRev, doc, { author: cleanAuthor(body.author), summary });
  await mirror(written.row);
  return ok({ rev: written.row.rev });
}

// POST import-question-sections (admin) { doc }   -> { rev: 1 }; 409 once one exists
// How the list first comes to exist.
export async function importSectionsHandler(event) {
  const body = parseBody(event);
  const doc = checkSections(body.doc, null);
  const written = await createQuestionSections(LIST_ID, doc, { author: cleanAuthor(body.author), summary: cleanSummary(body.summary) || 'The sections as they stood when they became editable' });
  await mirror(written.row);
  return ok({ rev: written.row.rev });
}
