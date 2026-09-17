import { HttpError, cleanText, parseBody, reply } from './http.mjs';
import {
  jetLogHistory, jetLogMeta, jetLogRevision, newestJetLog, createJetLog, saveJetLog,
  setJetLogHidden,
} from './store.mjs';
import {
  deleteKey, jetLogKey, jetLogRecord, mirrorJetLog, rebuildJetLogsIndex,
} from './mirror.mjs';

// The jet log corpus: the saved flight plans the jet log page offers under Preset Jet Logs.
// The same model as the item pages — anyone may publish, every save is a revision, a stale
// baseRev gets a 409, and nothing is ever deleted.
//
// A jet log is a data document with no prose in it, so there is no lint here. What is checked
// is the shape: an id that is a slug, a name, and a group and folder short enough to read.
// Deliberately no enum of groups or folders: a server-side list would mean a Lambda deploy to
// add a folder, which is the friction this feature exists to remove.

const MAX_DOC_BYTES = 200 * 1024;
const MAX_ID = 60;

const ok = (extra) => reply(200, { success: true, ...extra });

const cleanName = (value) => cleanText(value, 60);
const cleanAuthor = (value) => cleanText(value, 40);
const cleanSummary = (value) => cleanText(value, 200);
const cleanFiling = (value) => cleanText(value, 40);

// A slug, like an item's. Kept here rather than imported from lint.mjs, which pulls in the
// prose rules the deploy copies in at build time.
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkLogId(id) {
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

// The document as it will be stored. Nothing is rewritten: tools/jetlog-migrate.js --verify
// compares the mirrored document against its source byte for byte.
function checkJetLog(log, id) {
  if (!log || typeof log !== 'object' || Array.isArray(log)) {
    throw new HttpError(400, 'log must be an object');
  }
  if (typeof log.name !== 'string' || !log.name.trim()) {
    throw new HttpError(400, 'The jet log needs a name');
  }
  if (log.id !== id) throw new HttpError(400, 'The jet log carries a different id');
  for (const field of ['group', 'folder']) {
    if (log[field] != null && typeof log[field] !== 'string') {
      throw new HttpError(400, `${field} must be text`);
    }
    if (typeof log[field] === 'string' && log[field].length > 40) {
      throw new HttpError(400, `A ${field} name is at most 40 characters`);
    }
  }
  if (log.mode !== 'VFR' && log.mode !== 'IFR') throw new HttpError(400, 'mode must be VFR or IFR');
  const bytes = Buffer.byteLength(JSON.stringify(log));
  if (bytes > MAX_DOC_BYTES) throw new HttpError(400, 'That jet log is too large to store');
  return log;
}

async function afterWrite(meta, row) {
  await mirrorJetLog(meta, row);
  await rebuildJetLogsIndex();
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    || 'jetlog';
}

// ---------------------------------------------------------------------------------------
// Reads

export async function getJetLogHandler(event) {
  const id = idParam(event);
  const found = await newestJetLog(id);
  if (!found) throw new HttpError(404, 'No such jet log');
  return ok({ jetlog: jetLogRecord(found.meta, found.row) });
}

export async function jetLogHistoryHandler(event) {
  const id = idParam(event);
  const meta = await jetLogMeta(id);
  if (!meta) throw new HttpError(404, 'No such jet log');
  const revisions = await jetLogHistory(id);
  return ok({
    id,
    latestRev: meta.latestRev,
    hidden: !!meta.hidden,
    revisions,
  });
}

export async function jetLogRevisionHandler(event) {
  const id = idParam(event);
  const params = event.queryStringParameters || {};
  const rev = Number(params.rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const row = await jetLogRevision(id, rev);
  if (!row) throw new HttpError(404, 'No such revision');
  return ok({
    revision: {
      id,
      rev: row.rev,
      updatedAt: row.createdAt,
      author: row.author || '',
      summary: row.summary || '',
      log: JSON.parse(row.docJson),
    },
  });
}

// ---------------------------------------------------------------------------------------
// Writes

// A new jet log. The id is minted from the name, with a short suffix against collisions; the
// conditional put in the store is what detects one, so there is no read first.
export async function publishJetLogHandler(event) {
  const body = parseBody(event);
  const log = body.log;
  if (!log || typeof log !== 'object') throw new HttpError(400, 'log is required');
  const name = cleanName(log.name);
  if (!name) throw new HttpError(400, 'The jet log needs a name');

  const meta = {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary) || 'Published',
    baseRev: 0,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(16).slice(2, 6);
    const id = `${slugify(name)}-${suffix}`;
    const doc = checkJetLog({
      ...log,
      id,
      name,
      group: cleanFiling(log.group),
      folder: cleanFiling(log.folder),
    }, id);
    try {
      const written = await createJetLog(id, doc, meta);
      await afterWrite(written.meta, written.row);
      return ok({ id, rev: 1, updatedAt: written.row.createdAt });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 409)) throw error;
    }
  }
  throw new HttpError(500, 'Could not allocate an id; try again');
}

export async function saveJetLogHandler(event) {
  const body = parseBody(event);
  const id = checkLogId((body.id || '').toLowerCase());
  const baseRev = body.baseRev;
  if (!Number.isInteger(baseRev) || baseRev < 1) throw new HttpError(400, 'baseRev is required');
  const summary = cleanSummary(body.summary);
  if (!summary) throw new HttpError(400, 'Say what you changed: a summary is required');

  const name = cleanName(body.log && body.log.name);
  if (!name) throw new HttpError(400, 'The jet log needs a name');
  const log = checkJetLog({
    ...body.log,
    id,
    name,
    group: cleanFiling(body.log.group),
    folder: cleanFiling(body.log.folder),
  }, id);

  const meta = await jetLogMeta(id);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such jet log');
  if (meta.latestRev !== baseRev) {
    throw new HttpError(409, 'A newer revision exists', { rev: meta.latestRev });
  }

  const written = await saveJetLog(id, baseRev, log, { author: cleanAuthor(body.author), summary });
  await afterWrite(written.meta, written.row);
  return ok({ id, rev: written.row.rev, updatedAt: written.row.createdAt });
}

// Restoring publishes the old document as a new revision on top of the newest, so the history
// stays linear and the restore is itself undoable.
export async function restoreJetLogHandler(event) {
  const body = parseBody(event);
  const id = checkLogId((body.id || '').toLowerCase());
  const rev = Number(body.rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');

  const meta = await jetLogMeta(id);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such jet log');
  if (rev === meta.latestRev) throw new HttpError(400, 'That is already the current revision');

  const old = await jetLogRevision(id, rev);
  if (!old) throw new HttpError(404, 'No such revision');
  const log = JSON.parse(old.docJson);

  const written = await saveJetLog(id, meta.latestRev, log, {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary) || `Restored revision ${rev}`,
  });
  await afterWrite(written.meta, written.row);
  return ok({ id, rev: written.row.rev, updatedAt: written.row.createdAt });
}

// ---------------------------------------------------------------------------------------
// Admin

// The seeding path for tools/jetlog-migrate.js. The document is stored exactly as it arrives,
// which is what lets that tool's --verify compare the mirror against its source.
export async function importJetLogsHandler(event) {
  const body = parseBody(event);
  if (!Array.isArray(body.logs) || !body.logs.length) {
    throw new HttpError(400, 'logs must be a non-empty array');
  }
  if (body.logs.length > 50) throw new HttpError(400, 'At most 50 jet logs per request');

  const imported = [];
  const skipped = [];
  for (const log of body.logs) {
    const id = checkLogId((log && log.id) || '');
    checkJetLog(log, id);
    const meta = await jetLogMeta(id);
    if (meta && !body.overwrite) {
      skipped.push(id);
      continue;
    }
    const written = meta
      ? await saveJetLog(id, meta.latestRev, log, { author: 'migration', summary: 'Re-imported' })
      : await createJetLog(id, log, { author: 'migration', summary: 'Imported' });
    await mirrorJetLog(written.meta, written.row);
    imported.push(id);
  }
  await rebuildJetLogsIndex();
  return ok({ imported, skipped });
}

export async function hideJetLogHandler(event) {
  const body = parseBody(event);
  const id = checkLogId((body.id || '').toLowerCase());
  const hidden = !!body.hidden;
  await setJetLogHidden(id, hidden);
  if (hidden) {
    await deleteKey(jetLogKey(id));
  } else {
    const found = await newestJetLog(id);
    if (found) await mirrorJetLog(found.meta, found.row);
  }
  await rebuildJetLogsIndex();
  return ok({ id, hidden });
}
