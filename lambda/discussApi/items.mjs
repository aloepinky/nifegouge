import { HttpError, parseBody, reply } from './http.mjs';
import {
  newestItem, itemMeta, itemRevision, itemHistory, createItem, saveItem, setItemHidden,
} from './store.mjs';
import {
  mirrorItem, rebuildItemsIndex, itemRecord, itemKey, deleteKey, presignFigure,
} from './mirror.mjs';
import { checkItem, checkSlug } from './lint.mjs';
import { cleanAuthor, cleanSummary, relinkEvent } from './syllabi.mjs';

// Discuss item pages. Open editing: anyone may publish a revision, every revision is kept,
// and a bad one is undone by restoring the one before it. What a revision records is who
// (a display name, optional) and why (a summary, required).

const ok = (extra) => reply(200, { success: true, ...extra });

function slugParam(event) {
  const slug = (event.queryStringParameters || {}).slug;
  if (!slug) throw new HttpError(400, 'slug is required');
  return slug.toLowerCase();
}

async function afterWrite(meta, row) {
  await mirrorItem(meta, row);
  await rebuildItemsIndex();
}

// ---------------------------------------------------------------------------------------
// Reads (the site reads the mirror; these exist for tools, history and freshness checks)

export async function getItemHandler(event) {
  const slug = slugParam(event);
  const found = await newestItem(slug);
  if (!found) throw new HttpError(404, 'No such item');
  return ok({ item: itemRecord(found.meta, found.row) });
}

export async function itemHistoryHandler(event) {
  const slug = slugParam(event);
  const meta = await itemMeta(slug);
  if (!meta) throw new HttpError(404, 'No such item');
  const revisions = await itemHistory(slug);
  return ok({
    slug,
    latestRev: meta.latestRev,
    hidden: !!meta.hidden,
    revisions: revisions.map((r) => ({
      rev: r.rev, author: r.author || '', summary: r.summary || '', createdAt: r.createdAt, baseRev: r.baseRev,
    })),
  });
}

export async function itemRevisionHandler(event) {
  const slug = slugParam(event);
  const rev = Number((event.queryStringParameters || {}).rev);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const row = await itemRevision(slug, rev);
  if (!row) throw new HttpError(404, 'No such revision');
  return ok({
    revision: {
      slug, rev, author: row.author || '', summary: row.summary || '', createdAt: row.createdAt,
      baseRev: row.baseRev, item: JSON.parse(row.docJson),
    },
  });
}

// ---------------------------------------------------------------------------------------
// Writes

export async function saveItemHandler(event) {
  const body = parseBody(event);
  const { slug, baseRev, item } = body;
  checkSlug(slug);
  if (!Number.isInteger(baseRev) || baseRev < 1) throw new HttpError(400, 'baseRev is required');
  const summary = cleanSummary(body.summary);
  if (!summary) throw new HttpError(400, 'Say what you changed: a summary is required');
  checkItem(item, slug);

  const meta = await itemMeta(slug);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such item');
  if (meta.latestRev !== baseRev) throw new HttpError(409, 'A newer revision exists', { rev: meta.latestRev });

  // No prose lint on the way in: the rules in discussRules.mjs are for the CLI and for a
  // style guide page, not for refusing a student's edit. The shape check above is the gate.
  const saved = await saveItem(slug, baseRev, item, { author: cleanAuthor(body.author), summary });
  await afterWrite(saved.meta, saved.row);
  return ok({ slug, rev: saved.row.rev, updatedAt: saved.row.createdAt });
}

// A new page starts as a stub. With `link`, the event row that named it is pointed at it in
// the same request, so the hub shows the new page without anyone editing the list.
export async function createItemHandler(event) {
  const body = parseBody(event);
  const slug = typeof body.slug === 'string' ? body.slug.toLowerCase() : body.slug;
  checkSlug(slug);
  const title = typeof body.title === 'string' ? body.title.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
  if (!title) throw new HttpError(400, 'A title is required');
  const item = { slug, title, stub: true };
  const lead = typeof body.sourcingLead === 'string' ? body.sourcingLead.trim().slice(0, 600) : '';
  if (lead) item.sourcingLead = lead;
  const author = cleanAuthor(body.author);
  const summary = cleanSummary(body.summary) || 'Created the page';

  const existing = await itemMeta(slug);
  if (existing) throw new HttpError(409, 'A page with that slug already exists');

  const created = await createItem(slug, item, { author, summary });
  await afterWrite(created.meta, created.row);

  const out = { slug, rev: 1, linked: false };
  const link = body.link;
  if (link && typeof link === 'object') {
    const { syllabusId, eventId, label } = link;
    if ([syllabusId, eventId, label].every((v) => typeof v === 'string' && v)) {
      try {
        out.syllabusRev = await relinkEvent(syllabusId, eventId, label, slug, { author });
        out.linked = true;
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
        out.linkError = error.message;
      }
    }
  }
  return ok(out);
}

// Restoring is publishing an old document as a new revision, so history stays linear and the
// undo of a restore is another restore.
export async function restoreItemHandler(event) {
  const body = parseBody(event);
  const { slug, rev } = body;
  checkSlug(slug);
  if (!Number.isInteger(rev) || rev < 1) throw new HttpError(400, 'rev is required');
  const meta = await itemMeta(slug);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such item');
  if (rev === meta.latestRev) throw new HttpError(400, 'That is already the current revision');
  const old = await itemRevision(slug, rev);
  if (!old) throw new HttpError(404, 'No such revision');
  const item = JSON.parse(old.docJson);
  const saved = await saveItem(slug, meta.latestRev, item, {
    author: cleanAuthor(body.author),
    summary: cleanSummary(body.summary) || `Restored revision ${rev}`,
  });
  await afterWrite(saved.meta, saved.row);
  return ok({ slug, rev: saved.row.rev, updatedAt: saved.row.createdAt });
}

export async function figureUploadUrlHandler(event) {
  const body = parseBody(event);
  checkSlug(body.slug);
  const name = typeof body.name === 'string' ? body.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) : '';
  if (!name) throw new HttpError(400, 'A file name is required');
  const meta = await itemMeta(body.slug);
  if (!meta || meta.hidden) throw new HttpError(404, 'No such item');
  const signed = await presignFigure(body.slug, name);
  return ok(signed);
}

// ---------------------------------------------------------------------------------------
// Admin

// Bulk load. Skips slugs that exist unless `overwrite`, which appends a revision. Never lints:
// the corpus is what it is, and the linter reports on it rather than gating it.
export async function importItemsHandler(event) {
  const body = parseBody(event);
  if (!Array.isArray(body.items) || !body.items.length) throw new HttpError(400, 'items must be a non-empty array');
  if (body.items.length > 50) throw new HttpError(400, 'At most 50 items per request');
  const imported = [];
  const skipped = [];
  for (const item of body.items) {
    const slug = item && item.slug;
    checkSlug(slug);
    checkItem(item, slug);
    const meta = await itemMeta(slug);
    if (meta && !body.overwrite) {
      skipped.push(slug);
      continue;
    }
    const written = meta
      ? await saveItem(slug, meta.latestRev, item, { author: 'migration', summary: 'Re-imported' })
      : await createItem(slug, item, { author: 'migration', summary: 'Imported' });
    await mirrorItem(written.meta, written.row);
    imported.push(slug);
  }
  // One index rebuild per batch rather than per item.
  await rebuildItemsIndex();
  return ok({ imported, skipped });
}

export async function hideItemHandler(event) {
  const body = parseBody(event);
  checkSlug(body.slug);
  const hidden = !!body.hidden;
  await setItemHidden(body.slug, hidden);
  if (hidden) {
    await deleteKey(itemKey(body.slug));
  } else {
    const found = await newestItem(body.slug);
    if (found) await mirrorItem(found.meta, found.row);
  }
  await rebuildItemsIndex();
  return ok({ slug: body.slug, hidden });
}
