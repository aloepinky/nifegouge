import { HttpError, cleanText, parseBody, reply, requireProgram } from './http.mjs';
import {
  briefHistory, briefMeta, briefRevision, newestBrief, createBrief, saveBrief, setBriefHidden,
} from './store.mjs';
import {
  deleteKey, briefKey, briefRecord, mirrorBrief, rebuildBriefsIndex,
} from './mirror.mjs';

// The briefs corpus: the mission briefing guides the briefs page shows, one document per
// guide. The same model as the jet logs and the item pages: anyone may publish, every save is
// a revision, a stale baseRev gets a 409, and nothing is ever deleted.
//
// A brief is generated in the browser from an uploaded guide PDF and then edited on the page.
// What is checked here is the shape the page renders, and nothing about the words: sections
// with ids and titles, items with ids and names, children nested at most three deep.

const MAX_DOC_BYTES = 200 * 1024;
const MAX_ID = 60;
const MAX_DEPTH = 3;

const ok = (extra) => reply(200, { success: true, ...extra });

const cleanTitle = (value) => cleanText(value, 200);
const cleanShort = (value) => cleanText(value, 40);
const cleanAuthor = (value) => cleanText(value, 40);
const cleanSummary = (value) => cleanText(value, 200);

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED = new Set(['told', 'upload']);

function checkBriefId(id) {
  if (typeof id !== 'string' || !id) throw new HttpError(400, 'id is required');
  if (id.length > MAX_ID) throw new HttpError(400, `An id is at most ${MAX_ID} characters`);
  if (!ID_RE.test(id)) throw new HttpError(400, 'An id is lowercase words joined by single hyphens');
  return id;
}

function idParam(event) {
  const params = event.queryStringParameters || {};
  const id = (params.id || '').toLowerCase();
  if (!id) throw new HttpError(400, 'id is required');
  return id;
}

const isText = (v) => v == null || typeof v === 'string';

function checkNodes(nodes, where, ids, depth) {
  if (nodes == null) return;
  if (!Array.isArray(nodes)) throw new HttpError(400, `${where}: children must be a list`);
  if (depth > MAX_DEPTH) throw new HttpError(400, `${where}: nested too deep`);
  nodes.forEach((node, i) => {
    const at = `${where}, line ${i + 1}`;
    if (!node || typeof node !== 'object') throw new HttpError(400, `${at} is not an object`);
    checkId(node.id, at, ids);
    if (!isText(node.text) || !isText(node.marker)) throw new HttpError(400, `${at}: text must be text`);
    checkNodes(node.children, at, ids, depth + 1);
  });
}

function checkId(id, where, ids) {
  if (typeof id !== 'string' || !id) throw new HttpError(400, `${where} has no id`);
  if (ids.has(id)) throw new HttpError(400, `${where}: the id ${id} is used twice`);
  ids.add(id);
}

// The document as it will be stored, with its id, title and program cleaned.
function checkBrief(brief, id) {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) {
    throw new HttpError(400, 'brief must be an object');
  }
  const title = cleanTitle(brief.title);
  if (!title) throw new HttpError(400, 'The brief needs a title');
  const program = requireProgram(brief, 'The brief');
  if (!isText(brief.note) || !isText(brief.short)) throw new HttpError(400, 'note and short must be text');
  if (!Array.isArray(brief.sections) || !brief.sections.length) {
    throw new HttpError(400, 'The brief needs at least one section');
  }
  const ids = new Set();
  brief.sections.forEach((section, s) => {
    const where = `Section ${s + 1}`;
    if (!section || typeof section !== 'object') throw new HttpError(400, `${where} is not an object`);
    checkId(section.id, where, ids);
    if (typeof section.title !== 'string') throw new HttpError(400, `${where} has no title`);
    if (section.column != null && section.column !== 1 && section.column !== 2) {
      throw new HttpError(400, `${where}: column must be 1 or 2`);
    }
    if (!isText(section.text)) throw new HttpError(400, `${where}: text must be text`);
    if (!Array.isArray(section.items)) throw new HttpError(400, `${where}: items must be a list`);
    section.items.forEach((item, i) => {
      const at = `${where}, item ${i + 1}`;
      if (!item || typeof item !== 'object') throw new HttpError(400, `${at} is not an object`);
      checkId(item.id, at, ids);
      if (typeof item.label !== 'string' || !item.label.trim()) throw new HttpError(400, `${at} has no name`);
      if (!isText(item.text)) throw new HttpError(400, `${at}: text must be text`);
      if (item.card != null && (!Array.isArray(item.card) || item.card.some((c) => typeof c !== 'string'))) {
        throw new HttpError(400, `${at}: card lines must be text`);
      }
      checkNodes(item.children, at, ids, 1);
    });
  });
  const doc = {
    ...brief,
    id,
    title,
    ...program,
    ...(brief.short != null ? { short: cleanShort(brief.short) } : {}),
  };
  if (Buffer.byteLength(JSON.stringify(doc)) > MAX_DOC_BYTES) {
    throw new HttpError(400, 'That brief is too large to store');
  }
  return doc;
}

async function afterWrite(meta, row) {
  await mirrorBrief(meta, row);
  await rebuildBriefsIndex();
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    || 'brief';
}

// ---------------------------------------------------------------------------------------
// Reads

export async function getBriefHandler(event) {
  const id = idParam(event);
  const found = await newestBrief(id);
  if (!found) throw new HttpError(404, 'No such brief');
  return ok({ brief: briefRecord(found.meta, found.row) });
}

export async function briefHistoryHandler(event) {
  const id = idParam(event);
  const meta = await briefMeta(id);
  if (!meta) throw new HttpError(404, 'No such brief');
  return ok({ id, latestRev: meta.latestRev, hidden: !!meta.hidden, revisions: await briefHistory(id) });
}

export async function briefRevisionHandler(event) {
  const id = idParam(event);
  const params = event.queryStringParameters || {};
  const rev = Number(params.rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const row = await briefRevision(id, rev);
  if (!row) throw new HttpError(404, 'No such revision');
  return ok({
    revision: {
      id,
      rev: row.rev,
      updatedAt: row.createdAt,
      author: row.author || '',
      summary: row.summary || '',
      brief: JSON.parse(row.docJson),
    },
  });
}

// ---------------------------------------------------------------------------------------
// Writes

// A new brief. The id is the one the document suggests (the upload names each guide by its
// stages: `fam-vnav-inav`), else one minted from the title; a taken id gets a short suffix.
// The conditional put in the store is what detects the collision, so there is no read first.
export async function publishBriefHandler(event) {
  const body = parseBody(event);
  const brief = body.brief;
  if (!brief || typeof brief !== 'object') throw new HttpError(400, 'brief is required');
  const suggested = (typeof brief.id === 'string' && ID_RE.test(brief.id) && brief.id.length <= 40)
    ? brief.id
    : slugify(cleanTitle(brief.title) || 'brief');
  // `told` and `upload` are pages of their own at /tw4/briefs/<id>, so no brief may take them.
  const base = RESERVED.has(suggested) ? `${suggested}-brief` : suggested;
  const meta = {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary) || 'Published',
    baseRev: 0,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = attempt === 0 ? base : `${base}-${Math.random().toString(16).slice(2, 6)}`;
    const doc = checkBrief(brief, id);
    try {
      const written = await createBrief(id, doc, meta);
      await afterWrite(written.meta, written.row);
      return ok({ id, rev: 1, updatedAt: written.row.createdAt });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 409)) throw error;
    }
  }
  throw new HttpError(500, 'Could not allocate an id; try again');
}

export async function saveBriefHandler(event) {
  const body = parseBody(event);
  const id = checkBriefId((body.id || '').toLowerCase());
  const baseRev = body.baseRev;
  if (!Number.isInteger(baseRev) || baseRev < 1) throw new HttpError(400, 'baseRev is required');
  const summary = cleanSummary(body.summary);
  if (!summary) throw new HttpError(400, 'Say what you changed: a summary is required');
  const brief = checkBrief(body.brief, id);

  const meta = await briefMeta(id);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such brief');
  if (meta.latestRev !== baseRev) {
    throw new HttpError(409, 'A newer revision exists', { rev: meta.latestRev });
  }

  const written = await saveBrief(id, baseRev, brief, { author: cleanAuthor(body.author), summary });
  await afterWrite(written.meta, written.row);
  return ok({ id, rev: written.row.rev, updatedAt: written.row.createdAt });
}

// Restoring publishes the old document as a new revision on top of the newest, so the history
// stays linear and the restore is itself undoable.
export async function restoreBriefHandler(event) {
  const body = parseBody(event);
  const id = checkBriefId((body.id || '').toLowerCase());
  const rev = Number(body.rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');

  const meta = await briefMeta(id);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such brief');
  if (rev === meta.latestRev) throw new HttpError(400, 'That is already the current revision');

  const old = await briefRevision(id, rev);
  if (!old) throw new HttpError(404, 'No such revision');

  const written = await saveBrief(id, meta.latestRev, JSON.parse(old.docJson), {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary) || `Restored revision ${rev}`,
  });
  await afterWrite(written.meta, written.row);
  return ok({ id, rev: written.row.rev, updatedAt: written.row.createdAt });
}

// ---------------------------------------------------------------------------------------
// Admin

export async function hideBriefHandler(event) {
  const body = parseBody(event);
  const id = checkBriefId((body.id || '').toLowerCase());
  const hidden = !!body.hidden;
  await setBriefHidden(id, hidden);
  if (hidden) {
    await deleteKey(briefKey(id));
  } else {
    const found = await newestBrief(id);
    if (found) await mirrorBrief(found.meta, found.row);
  }
  await rebuildBriefsIndex();
  return ok({ id, hidden });
}
