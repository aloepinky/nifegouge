import { HttpError, parseBody, reply, requireProgram } from './http.mjs';
import {
  newestItem, itemMeta, itemRevision, itemHistory, createItem, saveItem, setItemHidden,
  setRevisionAuthor,
} from './store.mjs';
import {
  mirrorItem, rebuildItemsIndex, itemRecord, itemKey, deleteKey, presignFigure, putJson,
} from './mirror.mjs';
import { checkItem, checkSlug } from './lint.mjs';
import { cleanAuthor, cleanSummary, relinkEvent } from './syllabi.mjs';
import { itemId, splitItemId, isNamespaced, schoolNs } from './namespace.mjs';

// Discuss item pages. Open editing: anyone may publish a revision, every revision is kept,
// and a bad one is undone by restoring the one before it. What a revision records is who
// (a display name, optional) and why (a summary, required).

const ok = (extra) => reply(200, { success: true, ...extra });

function slugParam(event) {
  const slug = (event.queryStringParameters || {}).slug;
  if (!slug) throw new HttpError(400, 'slug is required');
  return slug.toLowerCase();
}

const schoolParam = (event) => (event.queryStringParameters || {}).school || '';

// A page's stored key carries its school (see namespace.mjs). This finds the key a page
// actually lives at: the namespaced one, or the bare one it had before schools were part of
// the identity. Both are accepted for as long as the migration is in flight, which is what
// lets a read keep working whichever side of it the page is on.
async function findItem(school, slug) {
  if (school) {
    const id = itemId(school, slug);
    if (id !== slug) {
      const meta = await itemMeta(id);
      if (meta) return { key: id, meta };
    }
  }
  const legacy = await itemMeta(slug);
  // A legacy row belongs to whichever school it was tagged with. It answers for that school
  // only — otherwise Primary's `turn-pattern`, which has not been migrated yet, would look
  // like NIFE's and block NIFE from having one, which is the collision this exists to end.
  if (!legacy) return { key: null, meta: null };
  const owner = (legacy.flags || {}).school;
  if (school && owner && schoolNs(owner) !== schoolNs(school)) return { key: null, meta: null };
  return { key: slug, meta: legacy };
}

// The same, refusing a page that is missing or taken down.
async function requireItem(school, slug) {
  const found = await findItem(school, slug);
  if (!found.meta || found.meta.hidden) throw new HttpError(404, 'No such item');
  return found;
}

// Through the cutover the site is still asking for a page's old, bare address while the page
// itself has moved to a namespaced one. So a namespaced write is mirrored to the old address
// too, and the two never disagree. On by default — there is no window in which it needs
// turning on, and forgetting would silently stale the live site; retire it by setting
// DISCUSS_LEGACY_MIRROR=off once the client has cut over, then delete this.
const LEGACY_MIRROR = process.env.DISCUSS_LEGACY_MIRROR !== 'off';

async function afterWrite(meta, row) {
  await mirrorItem(meta, row);
  if (LEGACY_MIRROR && isNamespaced(meta.slug)) {
    const { ns, slug } = splitItemId(meta.slug);
    // Only where a legacy row for this page actually exists, and only where it is THIS page's
    // own predecessor. A new page must never write the bare address: NIFE's `crm` doing so
    // would overwrite `items/crm.json`, which is Primary's, with a C172 document.
    const legacy = await itemMeta(slug);
    if (legacy && schoolNs((legacy.flags || {}).school) === ns) {
      await putJson(itemKey(slug), itemRecord(meta, row));
    }
  }
  await rebuildItemsIndex();
}

// ---------------------------------------------------------------------------------------
// Reads (the site reads the mirror; these exist for tools, history and freshness checks)

export async function getItemHandler(event) {
  const slug = slugParam(event);
  const { key } = await findItem(schoolParam(event), slug);
  const found = key ? await newestItem(key) : null;
  if (!found) throw new HttpError(404, 'No such item');
  return ok({ item: itemRecord(found.meta, found.row) });
}

export async function itemHistoryHandler(event) {
  const slug = slugParam(event);
  const { key, meta } = await findItem(schoolParam(event), slug);
  if (!meta) throw new HttpError(404, 'No such item');
  const revisions = await itemHistory(key);
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
  const { key } = await findItem(schoolParam(event), slug);
  const row = key ? await itemRevision(key, rev) : null;
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

  // The school on the document being saved is what names the page's namespace.
  const { key, meta } = await requireItem(item && item.school, slug);
  if (meta.latestRev !== baseRev) throw new HttpError(409, 'A newer revision exists', { rev: meta.latestRev });

  // No prose lint on the way in: the rules in discussRules.mjs are for the CLI and for a
  // style guide page, not for refusing a student's edit. The shape check above is the gate.
  const saved = await saveItem(key, baseRev, item, { author: cleanAuthor(body.author), summary });
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
  const item = { slug, title, ...requireProgram(body, 'The page'), stub: true };
  const lead = typeof body.sourcingLead === 'string' ? body.sourcingLead.trim().slice(0, 600) : '';
  if (lead) item.sourcingLead = lead;
  const author = cleanAuthor(body.author);
  const summary = cleanSummary(body.summary) || 'Created the page';

  // A new page is created at its namespaced key. The check looks for a page in *this* school:
  // another school having the same slug is not a clash, which is the point of the namespace.
  const key = itemId(item.school, slug);
  const existing = (await findItem(item.school, slug)).meta;
  if (existing) throw new HttpError(409, 'A page with that slug already exists');

  const created = await createItem(key, item, { author, summary });
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
  const { key, meta } = await requireItem(body.school, slug);
  if (rev === meta.latestRev) throw new HttpError(400, 'That is already the current revision');
  const old = await itemRevision(key, rev);
  if (!old) throw new HttpError(404, 'No such revision');
  const item = JSON.parse(old.docJson);
  // A revision from before the page was tagged comes back tagged as the page is now.
  if (!item.aircraft || !item.school) {
    const current = await itemRevision(key, meta.latestRev);
    const now = current ? JSON.parse(current.docJson) : {};
    item.aircraft = item.aircraft || now.aircraft;
    item.school = item.school || now.school;
  }
  const saved = await saveItem(key, meta.latestRev, item, {
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
  // Keyed by the page's stored key, so two schools' figures for the same slug never collide.
  // Figures already uploaded keep their addresses: a figure `src` is stored as an absolute URL.
  const { key } = await requireItem(body.school, body.slug);
  const signed = await presignFigure(key, name);
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
    const { key, meta } = await findItem(item && item.school, slug);
    if (meta && !body.overwrite) {
      skipped.push(slug);
      continue;
    }
    const written = meta
      ? await saveItem(key, meta.latestRev, item, { author: 'migration', summary: 'Re-imported' })
      : await createItem(itemId(item && item.school, slug), item, { author: 'migration', summary: 'Imported' });
    await mirrorItem(written.meta, written.row);
    imported.push(slug);
  }
  // One index rebuild per batch rather than per item.
  await rebuildItemsIndex();
  return ok({ imported, skipped });
}

// Rewrites the name shown on a page's revisions: every revision authored `from` becomes `to`.
// For a name that should never have been on a revision; the pages themselves do not change,
// and the page is re-mirrored if its newest revision was one of them.
export async function setAuthorHandler(event) {
  const body = parseBody(event);
  checkSlug(body.slug);
  const from = typeof body.from === 'string' ? body.from : '';
  const to = cleanAuthor(body.to);
  if (!to) throw new HttpError(400, 'to is required');
  const { key, meta } = await findItem(body.school, body.slug);
  if (!meta) throw new HttpError(404, 'No such item');
  const revs = await setRevisionAuthor(key, from, to);
  if (revs.includes(meta.latestRev) && !meta.hidden) {
    const found = await newestItem(key);
    if (found) await mirrorItem(found.meta, found.row);
  }
  return ok({ slug: body.slug, revs });
}

export async function hideItemHandler(event) {
  const body = parseBody(event);
  // With `exact` the caller names a stored key, which carries a school and so cannot pass the
  // bare-slug rule; its slug half still has to.
  checkSlug(body.exact ? splitItemId(body.slug).slug : body.slug);
  const hidden = !!body.hidden;
  // `exact` addresses one stored key and nothing else, which is how a legacy row is retired
  // once its namespaced twin is live and the client has cut over. Without it, hiding resolves
  // the page the way every other op does.
  const key = body.exact ? body.slug : (await findItem(body.school, body.slug)).key;
  if (!key) throw new HttpError(404, 'No such item');
  await setItemHidden(key, hidden);
  if (hidden) {
    await deleteKey(itemKey(key));
  } else {
    const found = await newestItem(key);
    if (found) await mirrorItem(found.meta, found.row);
  }
  await rebuildItemsIndex();
  return ok({ slug: body.slug, hidden });
}
