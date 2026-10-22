import {
  HttpError, cleanAuthor, cleanSummary, cleanText, checkId, idParam, ok, parseBody, requireProgram,
} from './http.mjs';
import {
  courseRulesHistory, courseRulesMeta, courseRulesRevision, createCourseRules, newestCourseRules,
  saveCourseRules,
} from './store.mjs';
import { putJson } from './mirror.mjs';

// A wing's course rules: the words on the course rules page, as one document anyone may edit.
// The map itself (the KML and the route graph) stays in the site's code; this is everything
// written about it. The same model as the question sections: every save is a revision, a stale
// baseRev gets a 409, History restores any revision, nothing is deleted.
//
//   { id: 'tw4', aircraft, school, wing,
//     source: { publication, number?, date? },
//     legs: { '<featureId>': { rule: [{ text, heading? }], comms: [call], examples: [block], page? } },
//     airfields: { '<featureId>': { title, blocks: [{ heading?, lines: [text], warning? }] } } }
//
// A call is { when?, radio?, who?, text, after? }. An example block is { title, page?, from?,
// lines }: `page` is the comms script's page, `from` the manual's for a block built from it. A
// line is a call ({ radio?, who?, text, was? }), { note }, { label } or { manual, page }.
//
// The text is plain. `**bold**` is the only inline markup, and `[[words]]` in a rule marks a
// quiz blank. The page escapes everything before drawing it, so markup here is never HTML; a
// tag is refused anyway, so that the stored text stays what an editor sees.
//
// Keys are the page's feature ids (`Routes-Arrivals-12`), which come from the KML's order.
//
// Mirrored to courserules/<id>.json as { rev, updatedAt, author, summary, doc }.

const MAX_DOC_BYTES = 400 * 1024;
const FEATURE_ID = /^[A-Za-z][A-Za-z ]{0,30}-[A-Za-z ]{1,30}-\d{1,4}$/;
const TAG = /<\/?[a-z][^>]*>/i;

export const courseRulesKey = (id) => `courserules/${id}.json`;

// One string field: text, at most `max` characters, no HTML. `required` refuses a blank.
function field(value, where, max, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) throw new HttpError(400, `${where} is empty`);
    return undefined;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${where} must be text`);
  const text = cleanText(value, max + 1);
  if (text.length > max) throw new HttpError(400, `${where} is longer than ${max} characters`);
  if (TAG.test(text)) throw new HttpError(400, `${where} has HTML in it; write plain text`);
  if (required && !text) throw new HttpError(400, `${where} is empty`);
  return text || undefined;
}

// Every [[ is closed by a ]] before the next [[, and no mark is empty.
function checkMarks(text, where) {
  const open = text.split('[[').length - 1;
  const close = text.split(']]').length - 1;
  const marks = text.match(/\[\[([^[\]]*)\]\]/g) || [];
  if (open !== close || marks.length !== open) throw new HttpError(400, `${where}: a quiz blank is not closed`);
  if (marks.some((m) => !m.slice(2, -2).trim())) throw new HttpError(400, `${where}: a quiz blank is empty`);
}

// Drops the keys whose value is undefined, so a stored row carries only what was given.
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function list(value, where, max) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${where} must be a list`);
  if (value.length > max) throw new HttpError(400, `${where} has more than ${max} entries`);
  return value;
}

function checkCall(call, where) {
  if (!call || typeof call !== 'object') throw new HttpError(400, `${where} is not a call`);
  return compact({
    when: field(call.when, `${where}: when`, 200),
    radio: field(call.radio, `${where}: channel`, 40),
    who: field(call.who, `${where}: speaker`, 40),
    text: field(call.text, `${where}: words`, 600, { required: true }),
    after: field(call.after, `${where}: note`, 300),
  });
}

function checkExampleLine(line, where) {
  if (!line || typeof line !== 'object') throw new HttpError(400, `${where} is not a line`);
  if (line.label != null) return { label: field(line.label, where, 100, { required: true }) };
  if (line.note != null) return { note: field(line.note, where, 400, { required: true }) };
  if (line.manual != null) {
    return compact({
      manual: field(line.manual, where, 600, { required: true }),
      page: field(line.page == null ? line.page : String(line.page), `${where}: page`, 20),
    });
  }
  return compact({
    radio: field(line.radio, `${where}: channel`, 40),
    who: field(line.who, `${where}: speaker`, 40),
    text: field(line.text, `${where}: words`, 600, { required: true }),
    // The script's own wording, where the example corrects it: kept, not shown.
    was: field(line.was, `${where}: original wording`, 600),
  });
}

function checkLeg(leg, id) {
  if (!leg || typeof leg !== 'object' || Array.isArray(leg)) throw new HttpError(400, `${id} is not a leg`);
  const rule = list(leg.rule, `${id}: course rule`, 40).map((p, i) => {
    const where = `${id}: course rule, paragraph ${i + 1}`;
    if (!p || typeof p !== 'object') throw new HttpError(400, `${where} is not a paragraph`);
    const text = field(p.text, where, 3000, { required: true });
    checkMarks(text, where);
    return compact({ text, heading: p.heading === true ? true : undefined });
  });
  const comms = list(leg.comms, `${id}: radio calls`, 60).map((c, i) => checkCall(c, `${id}: radio call ${i + 1}`));
  const examples = list(leg.examples, `${id}: example comms`, 20).map((b, i) => {
    const where = `${id}: example ${i + 1}`;
    if (!b || typeof b !== 'object') throw new HttpError(400, `${where} is not an example`);
    return compact({
      title: field(b.title, `${where}: title`, 200, { required: true }),
      page: field(b.page == null ? b.page : String(b.page), `${where}: page`, 20),
      from: field(b.from == null ? b.from : String(b.from), `${where}: manual pages`, 40),
      lines: list(b.lines, `${where}: lines`, 120).map((l, j) => checkExampleLine(l, `${where}, line ${j + 1}`)),
    });
  });
  return compact({
    rule: rule.length ? rule : undefined,
    comms: comms.length ? comms : undefined,
    examples: examples.length ? examples : undefined,
    page: field(leg.page, `${id}: manual page`, 20),
  });
}

function checkAirfield(card, id) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) throw new HttpError(400, `${id} is not an airfield card`);
  return {
    title: field(card.title, `${id}: title`, 200, { required: true }),
    blocks: list(card.blocks, `${id}: card`, 40).map((b, i) => {
      const where = `${id}: card block ${i + 1}`;
      if (!b || typeof b !== 'object') throw new HttpError(400, `${where} is not a block`);
      const lines = list(b.lines, `${where}: lines`, 60).map((l, j) => field(l, `${where}, line ${j + 1}`, 3000, { required: true }));
      return compact({
        heading: field(b.heading, `${where}: heading`, 200),
        lines,
        warning: b.warning === true ? true : undefined,
      });
    }),
  };
}

function checkKeys(object, where) {
  if (object == null) return [];
  if (typeof object !== 'object' || Array.isArray(object)) throw new HttpError(400, `${where} must be an object`);
  const keys = Object.keys(object);
  keys.forEach((k) => { if (!FEATURE_ID.test(k)) throw new HttpError(400, `${where}: ${k} is not a map feature`); });
  return keys;
}

// The document as it will be stored. Shape only: nothing about the words is checked.
export function checkCourseRules(doc, id) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new HttpError(400, 'doc must be an object');
  const program = requireProgram(doc, 'The course rules');
  const source = doc.source || {};
  const legs = {};
  for (const key of checkKeys(doc.legs, 'legs')) {
    const leg = checkLeg(doc.legs[key], key);
    if (Object.keys(leg).length) legs[key] = leg;
  }
  const airfields = {};
  for (const key of checkKeys(doc.airfields, 'airfields')) airfields[key] = checkAirfield(doc.airfields[key], key);
  const out = {
    id,
    ...program,
    wing: field(doc.wing, 'wing', 40, { required: true }),
    source: compact({
      publication: field(source.publication, 'The publication', 200, { required: true }),
      number: field(source.number, 'The instruction number', 100),
      date: field(source.date, 'The date', 40),
    }),
    legs,
    airfields,
  };
  if (Buffer.byteLength(JSON.stringify(out)) > MAX_DOC_BYTES) throw new HttpError(400, 'The course rules are too large to store');
  return out;
}

async function mirror(id, row) {
  await putJson(courseRulesKey(id), {
    rev: row.rev,
    updatedAt: row.createdAt,
    author: row.author || '',
    summary: row.summary || '',
    doc: JSON.parse(row.docJson),
  });
}

// Writes the newest revision to the mirror again (rebuild-index 'courserules').
export async function remirrorCourseRules(id) {
  const found = await newestCourseRules(id);
  if (!found) return null;
  await mirror(id, found.row);
  return found.row.rev;
}

const bodyId = (body) => checkId(String(body.id || '').toLowerCase());

// ---------------------------------------------------------------------------------------

// GET get-courserules?id=   -> { rev, updatedAt, author, summary, doc }
export async function getCourseRulesHandler(event) {
  const id = idParam(event);
  const found = await newestCourseRules(id);
  if (!found) throw new HttpError(404, 'No such course rules');
  const { row } = found;
  return ok({ rev: row.rev, updatedAt: row.createdAt, author: row.author || '', summary: row.summary || '', doc: JSON.parse(row.docJson) });
}

// POST save-courserules { id, baseRev, doc, author?, summary }   -> { rev, updatedAt }; 400; 409
export async function saveCourseRulesHandler(event) {
  const body = parseBody(event);
  const id = bodyId(body);
  const baseRev = body.baseRev;
  if (!Number.isInteger(baseRev) || baseRev < 1) throw new HttpError(400, 'baseRev is required');
  const summary = cleanSummary(body.summary);
  if (!summary) throw new HttpError(400, 'Say what you changed: a summary is required');
  const meta = await courseRulesMeta(id);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such course rules');
  if (meta.latestRev !== baseRev) throw new HttpError(409, 'Someone saved the course rules since you opened them', { rev: meta.latestRev });
  const doc = checkCourseRules(body.doc, id);
  const written = await saveCourseRules(id, baseRev, doc, { author: cleanAuthor(body.author), summary });
  await mirror(id, written.row);
  return ok({ rev: written.row.rev, updatedAt: written.row.createdAt });
}

// GET courserules-history?id=   -> { id, latestRev, revisions: [{ rev, author, summary, createdAt }] }
export async function courseRulesHistoryHandler(event) {
  const id = idParam(event);
  const meta = await courseRulesMeta(id);
  if (!meta) throw new HttpError(404, 'No such course rules');
  return ok({ id, latestRev: meta.latestRev, revisions: await courseRulesHistory(id) });
}

// GET courserules-revision?id=&rev=   -> { revision: { rev, updatedAt, author, summary, doc } }
export async function courseRulesRevisionHandler(event) {
  const id = idParam(event);
  const rev = Number((event.queryStringParameters || {}).rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const row = await courseRulesRevision(id, rev);
  if (!row) throw new HttpError(404, 'No such revision');
  return ok({ revision: { rev: row.rev, updatedAt: row.createdAt, author: row.author || '', summary: row.summary || '', doc: JSON.parse(row.docJson) } });
}

// POST restore-courserules { id, rev, author?, summary? }   -> { rev, updatedAt }
// The old document becomes a new revision on top of the newest, so a restore is itself undoable.
export async function restoreCourseRulesHandler(event) {
  const body = parseBody(event);
  const id = bodyId(body);
  const rev = Number(body.rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const meta = await courseRulesMeta(id);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such course rules');
  if (rev === meta.latestRev) throw new HttpError(400, 'That is already the current revision');
  const old = await courseRulesRevision(id, rev);
  if (!old) throw new HttpError(404, 'No such revision');
  const doc = checkCourseRules(JSON.parse(old.docJson), id);
  const written = await saveCourseRules(id, meta.latestRev, doc, {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary) || `Restored revision ${rev}`,
  });
  await mirror(id, written.row);
  return ok({ rev: written.row.rev, updatedAt: written.row.createdAt });
}

// POST import-courserules (admin) { id, doc, author?, summary? }   -> { rev: 1 }; 409 once it exists
// How a wing's course rules first come to exist. It seeds once: after that, every change is a
// revision made on the site.
export async function importCourseRulesHandler(event) {
  const body = parseBody(event);
  const id = bodyId(body);
  const doc = checkCourseRules(body.doc, id);
  const written = await createCourseRules(id, doc, {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary) || 'The course rules as they stood when they became editable',
  });
  await mirror(id, written.row);
  return ok({ rev: written.row.rev });
}
