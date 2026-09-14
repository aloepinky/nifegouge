import { HttpError, cleanText, parseBody, reply, requireProgram } from './http.mjs';
import { newestSyllabus, putSyllabus, listSyllabi, setSyllabusHidden } from './store.mjs';
import {
  mirrorSyllabus, rebuildSyllabiIndex, syllabusRecord, syllabusEntry, syllabusKey, deleteKey,
} from './mirror.mjs';

// Syllabus documents: the Delta Primary registry and every JPPT anyone has uploaded. The
// document shape is what jppt/parseJppt.js produces and SyllabusContext.fromDoc renders:
//
//   { version, aircraft, school, source, stages, blocks: [{ ..., briefed, events }],
//     events: [{ ..., items }], flow }
//
// Moved in from lambda/discussSyllabi with two additions: every write mirrors the newest
// document to S3, and a revision records who saved it and why.

export const DELTA_ID = 'delta-primary';
const MAX_DOC_BYTES = 350 * 1024; // under DynamoDB's 400 KB item limit, with room for the rest
const MAX_NAME = 80;
const MAX_AUTHOR = 40;
const MAX_SUMMARY = 200;

export const cleanName = (name) => cleanText(name, MAX_NAME);
export const cleanAuthor = (author) => cleanText(author, MAX_AUTHOR);
export const cleanSummary = (summary) => cleanText(summary, MAX_SUMMARY);

// Shape, not content: enough that the site can render what comes back.
export function checkDoc(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return 'doc must be an object';
  try {
    requireProgram(doc, 'The syllabus');
  } catch (error) {
    return error.message;
  }
  const flow = doc.flow;
  if (!flow || !Array.isArray(flow.NODES) || !Array.isArray(flow.EDGES)) return 'doc.flow needs NODES and EDGES';
  if (typeof flow.VIEWBOX !== 'string') return 'doc.flow.VIEWBOX must be a string';
  for (const key of ['stages', 'blocks', 'events']) {
    if (!Array.isArray(doc[key])) return `doc.${key} must be an array`;
  }
  for (const n of flow.NODES) {
    if (!n || typeof n.id !== 'string' || !['x', 'y', 'w', 'h'].every((k) => Number.isFinite(n[k]))) {
      return 'every flow node needs an id and a numeric x, y, w and h';
    }
  }
  for (const b of doc.blocks) {
    if (!b || typeof b.id !== 'string' || !Array.isArray(b.events)) return 'every block needs an id and events';
  }
  for (const e of doc.events) {
    if (!e || typeof e.id !== 'string' || !Array.isArray(e.items)) return 'every event needs an id and items';
    for (const row of e.items) {
      if (!row || typeof row.label !== 'string') return `every item row on ${e.id} needs a label`;
    }
  }
  const json = JSON.stringify(doc);
  if (Buffer.byteLength(json, 'utf8') > MAX_DOC_BYTES) return 'the syllabus is too large to store';
  return null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'syllabus';
}

async function afterWrite(row) {
  await mirrorSyllabus(row);
  await rebuildSyllabiIndex();
}

// ---------------------------------------------------------------------------------------
// Handlers

export async function listSyllabiHandler() {
  const rows = (await listSyllabi()).filter((r) => !r.hidden);
  return reply(200, {
    success: true,
    syllabi: rows.map(syllabusEntry),
  });
}

export async function getSyllabusHandler(event) {
  const id = (event.queryStringParameters || {}).id;
  if (!id) throw new HttpError(400, 'id is required');
  const row = await newestSyllabus(id);
  if (!row || row.hidden) throw new HttpError(404, 'No such syllabus');
  return reply(200, { success: true, syllabus: syllabusRecord(row) });
}

export async function publishSyllabusHandler(event) {
  const body = parseBody(event);
  const name = cleanName(body.name);
  if (!name) throw new HttpError(400, 'A name is required');
  const problem = checkDoc(body.doc);
  if (problem) throw new HttpError(400, problem);
  const meta = { author: cleanAuthor(body.author), summary: cleanSummary(body.summary) || 'Uploaded', baseRev: 0 };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(16).slice(2, 6);
    const id = `${slugify(name)}-${suffix}`;
    try {
      const row = await putSyllabus(id, 1, name, body.doc, meta);
      await afterWrite(row);
      return reply(200, { success: true, id, rev: 1 });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 409)) throw error;
    }
  }
  throw new HttpError(500, 'Could not allocate an id; try again');
}

export async function saveSyllabusHandler(event) {
  const body = parseBody(event);
  const { id, baseRev } = body;
  if (typeof id !== 'string' || !Number.isInteger(baseRev)) throw new HttpError(400, 'id and baseRev are required');
  const problem = checkDoc(body.doc);
  if (problem) throw new HttpError(400, problem);

  const current = await newestSyllabus(id);
  if (!current || current.hidden) throw new HttpError(404, 'No such syllabus');
  if (current.rev !== baseRev) throw new HttpError(409, 'A newer revision exists', { rev: current.rev });
  const name = cleanName(body.name) || current.name;
  const row = await putSyllabus(id, baseRev + 1, name, body.doc, {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary),
    baseRev,
  });
  await afterWrite(row);
  return reply(200, { success: true, id, rev: row.rev });
}

// Admin. Loads a document under a chosen id: Delta Primary on migration, or a repaired
// document in place of a bad one. Appends a revision if the id exists unless the body says
// otherwise, so nothing is ever overwritten.
export async function importSyllabusHandler(event) {
  const body = parseBody(event);
  const { id } = body;
  if (typeof id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(id)) throw new HttpError(400, 'id must be a slug');
  const name = cleanName(body.name);
  if (!name) throw new HttpError(400, 'A name is required');
  const problem = checkDoc(body.doc);
  if (problem) throw new HttpError(400, problem);
  const current = await newestSyllabus(id);
  if (current && !body.replace) throw new HttpError(409, 'That syllabus exists; pass replace to add a revision');
  const rev = current ? current.rev + 1 : 1;
  const row = await putSyllabus(id, rev, name, body.doc, {
    author: 'migration',
    summary: current ? 'Re-imported' : 'Imported',
    baseRev: current ? current.rev : 0,
  });
  await afterWrite(row);
  return reply(200, { success: true, id, rev });
}

export async function hideSyllabusHandler(event) {
  const body = parseBody(event);
  if (typeof body.id !== 'string') throw new HttpError(400, 'id is required');
  const hidden = !!body.hidden;
  const row = await setSyllabusHidden(body.id, hidden);
  if (hidden) await deleteKey(syllabusKey(body.id));
  else await mirrorSyllabus(row);
  await rebuildSyllabiIndex();
  return reply(200, { success: true, id: body.id, hidden });
}

// ---------------------------------------------------------------------------------------
// Relinking an event row to a page that was just created

// Replaces the first `{ label }` row on `eventId` whose label matches and which has no page
// yet with `{ slug, label }`, as a new revision. No client baseRev: the change is a targeted
// row replacement, so it is merged on the server and retried if a save lands in between.
export async function relinkEvent(syllabusId, eventId, label, slug, meta) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await newestSyllabus(syllabusId);
    if (!current || current.hidden) throw new HttpError(404, 'No such syllabus');
    const doc = JSON.parse(current.docJson);
    const ev = (doc.events || []).find((e) => e.id.toUpperCase() === eventId.toUpperCase());
    if (!ev) throw new HttpError(404, `No such event ${eventId}`);
    const row = (ev.items || []).find((r) => r.label === label && !r.slug && !r.href);
    if (!row) throw new HttpError(404, `No unlinked "${label}" on ${eventId}`);
    row.slug = slug;
    try {
      const saved = await putSyllabus(syllabusId, current.rev + 1, current.name, doc, {
        author: meta.author,
        summary: `Linked "${label}" on ${eventId} to ${slug}`,
        baseRev: current.rev,
      });
      await afterWrite(saved);
      return saved.rev;
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 409)) throw error;
    }
  }
  throw new HttpError(409, 'The syllabus kept changing; link the row by hand');
}
