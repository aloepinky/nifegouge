import { createHash } from 'node:crypto';
import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamo, CONFIG } from './clients.mjs';
import { HttpError, cleanText, ok, parseBody } from './http.mjs';
import { putJson } from './mirror.mjs';
import { itemId, isNamespaced } from './namespace.mjs';
import { touchedBy } from './pubMatch.mjs';
import { listItemMetas, newestItem } from './store.mjs';

// Outdated marks: the first thing a reader can do to a discussion item short of editing it.
//
// Two kinds, both counted one per browser:
//
//   - A section (or subsection, or the Numbers box) marked outdated on one page. The count
//     tints the section, fainter for one mark than for three.
//   - A publication reported updated: a section of it, a chapter, or the whole thing. Nothing
//     is stored on any page. The browser matches each report against the references a section
//     cites, so every section citing an updated part of a publication is tinted wherever it is.
//
// Both are undone by an edit: whoever publishes a section can say it is up to date, which
// clears its marks and records when (`cleared`), so a publication report made before that time
// no longer tints it. A report made after it does. And whoever publishes a page citing a
// reported publication can settle the report itself (`resolvePubs`), which takes it off every
// page at once: the way a reissue is closed out without an admin. If nobody ticks it, it
// settles on its own once every part it tints, on every page, has been said to be up to date
// since it was made (`settleCleared`). Its row keeps the parts still waiting, `open:
// { <school>/<slug>: [<target>] }`, worked out the first time a publish needs it (by reading
// every page) and kept current by each publish of a page it touches.
//
// Table DiscussOutdated, partition `id` (S), one row per page and one per report:
//   page#<school>/<slug>  { page, ver, marks: { <target>: { n, voters, notes, at } },
//                           cleared: { <target>|'*': iso } }
//   pub#<hash>            { ver, work, scope, part, school, n, voters, notes, first, at, hidden?,
//                           open?, resolved?: { at, by, page, rev, auto? } }
//
// The whole table is mirrored as one file after every write. It is small by nature (a row per
// page anyone has marked), and every page and the landing page need it all:
//
//   outdated/index.json   { generatedAt, pages: { <school>/<slug>: { marks: { <target>:
//                           { n, at, notes } }, cleared } }, pubs: [{ id, work, scope, part,
//                           school, n, at, notes }] }

const SCOPES = ['section', 'chapter', 'pub'];
const MAX_NOTES = 5;
const db = () => getDynamo();
const table = () => CONFIG.outdatedTable;
const now = () => new Date().toISOString();

async function getRow(id) {
  const out = await db().send(new GetCommand({ TableName: table(), Key: { id } }));
  return out.Item || null;
}

// Read a row (or start one from `fresh`), let `edit` change it in place, write it back only if
// nobody else wrote it in between. The same optimistic loop as questions.mjs.
async function change(id, fresh, edit, tries = 6) {
  for (let i = 0; i < tries; i += 1) {
    const row = (await getRow(id)) || fresh();
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
  throw new HttpError(409, 'Too many people are marking this at once. Try again.');
}

// A browser's id, hashed with what it voted on so two votes cannot be joined. As in
// questions.mjs: an id stops the accidental second vote, not a determined one.
function voterOf(body, on) {
  const id = typeof body.voter === 'string' ? body.voter : '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) throw new HttpError(400, 'This browser could not be identified');
  return createHash('sha256').update(`${on}|${id}`).digest('hex').slice(0, 16);
}

const addNote = (notes, text, at) => (
  text ? [...(notes || []), { text, at }].slice(-MAX_NOTES) : (notes || [])
);

// The ids a reader can mark on a page: its sections, their subsections and the Numbers box.
// Not the lead, the gouge, See also or the references, which have no marks of their own.
export function targetsOf(item) {
  const ids = new Set();
  for (const s of (item && item.sections) || []) {
    ids.add(s.id);
    for (const sub of s.subsections || []) ids.add(sub.id);
  }
  if (item && Array.isArray(item.numbers) && item.numbers.length) ids.add('numbers');
  return ids;
}

const pageRowId = (school, slug) => `page#${itemId(school, slug)}`;
const freshPage = (school, slug) => () => ({
  id: pageRowId(school, slug), page: itemId(school, slug), marks: {}, cleared: {},
});

// ---------------------------------------------------------------------------------------
// Mirror

async function allRows() {
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

export async function rebuildOutdatedMirror() {
  const rows = await allRows();

  const pages = {};
  const pubs = [];
  for (const row of rows) {
    if (row.id.startsWith('page#')) {
      const marks = {};
      for (const [target, m] of Object.entries(row.marks || {})) {
        if (m.n > 0) marks[target] = { n: m.n, at: m.at, notes: (m.notes || []).map((x) => x.text) };
      }
      const cleared = row.cleared || {};
      if (Object.keys(marks).length || Object.keys(cleared).length) pages[row.page] = { marks, cleared };
    } else if (row.id.startsWith('pub#') && !row.hidden && row.n > 0) {
      pubs.push({
        id: row.id.slice(4),
        work: row.work,
        scope: row.scope,
        part: row.part || '',
        school: row.school || '',
        n: row.n,
        at: row.at,
        notes: (row.notes || []).map((x) => x.text),
      });
    }
  }
  pubs.sort((a, b) => b.at.localeCompare(a.at));
  const index = { generatedAt: now(), pages, pubs };
  await putJson('outdated/index.json', index);
  return index;
}

// ---------------------------------------------------------------------------------------
// Ops

// POST mark-outdated { school, slug, target, on, note?, voter }
// `on: false` takes this browser's mark back. The page's newest revision is read so a mark
// can only land on a section the page has.
export function markOutdatedHandler(findTargets) {
  return async (event) => {
    const body = parseBody(event);
    const { school, slug, target } = body;
    if (typeof target !== 'string' || !target) throw new HttpError(400, 'Which section?');
    const targets = await findTargets(school, slug);
    if (!targets.has(target)) throw new HttpError(404, 'That section is not on this page');
    const on = body.on !== false;
    const note = cleanText(body.note, 200);
    const voter = voterOf(body, `${itemId(school, slug)}#${target}`);
    const at = now();

    await change(pageRowId(school, slug), freshPage(school, slug), (row) => {
      const m = row.marks[target] || { n: 0, voters: [], notes: [] };
      const voted = m.voters.includes(voter);
      if (on === voted) return false;
      if (on) {
        m.voters = [...m.voters, voter];
        m.n += 1;
        m.notes = addNote(m.notes, note, at);
        m.at = at;
      } else {
        m.voters = m.voters.filter((v) => v !== voter);
        m.n = Math.max(0, m.n - 1);
      }
      row.marks[target] = m;
    });
    return ok({ outdated: await rebuildOutdatedMirror() });
  };
}

// The key a report is counted under: the same part of the same publication, however it was
// typed. "Ch. 4", "chapter 4" and "4" are one chapter.
export function partKey(scope, part) {
  let p = String(part || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (scope === 'chapter') p = p.replace(/^(chapter|ch\.?)\s*/, '');
  return p;
}

// POST report-outdated-pub { school, work, scope: 'section'|'chapter'|'pub', part?, note?, voter }
export async function reportOutdatedPubHandler(event) {
  const body = parseBody(event);
  const work = cleanText(body.work, 80);
  if (!work) throw new HttpError(400, 'Which publication?');
  const scope = SCOPES.includes(body.scope) ? body.scope : null;
  if (!scope) throw new HttpError(400, 'Say whether a section, a chapter or the whole publication changed');
  const part = scope === 'pub' ? '' : cleanText(body.part, 120);
  if (scope !== 'pub' && !part) throw new HttpError(400, `Which ${scope}?`);
  const note = cleanText(body.note, 200);
  const school = cleanText(body.school, 40);
  const key = `${work.toLowerCase()}|${scope}|${partKey(scope, part)}`;
  const id = `pub#${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
  const voter = voterOf(body, key);
  const at = now();

  let already = false;
  await change(id, () => ({
    id, work, scope, part, school, n: 0, voters: [], notes: [], first: at,
  }), (row) => {
    if (row.voters.includes(voter)) {
      already = true;
      return false;
    }
    // Every vote moves the report's time on, and a part cleared before it is tinted again, so
    // what it tints is worked out afresh at the next publish (also when it had settled).
    delete row.open;
    row.voters = [...row.voters, voter];
    row.n += 1;
    row.notes = addNote(row.notes, note, at);
    row.at = at;
    // A report brought back after being taken down starts again.
    if (row.hidden) {
      delete row.hidden;
      row.n = 1;
    }
  });
  return ok({ already, outdated: await rebuildOutdatedMirror() });
}

// Called by save-item after a revision is written: the publisher said these sections (or, with
// '*', the whole page) are up to date. Their marks go and the time is recorded.
export async function clearOutdated(school, slug, targets) {
  const list = (Array.isArray(targets) ? targets : []).filter((t) => typeof t === 'string' && t).slice(0, 200);
  if (!list.length) return null;
  const at = now();
  await change(pageRowId(school, slug), freshPage(school, slug), (row) => {
    for (const t of list) {
      if (t === '*') {
        row.marks = {};
      } else if (row.marks[t]) {
        row.marks[t] = { ...row.marks[t], n: 0, voters: [] };
      }
      row.cleared[t] = at;
    }
  });
  return rebuildOutdatedMirror();
}

// Called by save-item after a revision is written: the publisher said these publication reports
// are dealt with, the site now follows the new edition, so the report stops tinting every page,
// not just this one. Only a report on a work this page cites can be settled from it. The report
// is not deleted: its count goes to zero (so the mirror leaves it out), and who settled it from
// which revision is kept. A later report of the same part counts from zero again.
const sameWork = (a, b) => String(a || '').toLowerCase().replace(/\s+/g, ' ').trim()
  === String(b || '').toLowerCase().replace(/\s+/g, ' ').trim();
export async function resolvePubs(school, slug, item, ids, { author, rev } = {}) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).filter((x) => typeof x === 'string' && /^[0-9a-f]{16}$/.test(x)))].slice(0, 20);
  if (!list.length) return null;
  const cited = ((item && item.references) || []).map((r) => r.work);
  const at = now();
  let settled = 0;
  for (const id of list) {
    const row = await getRow(`pub#${id}`);
    if (!row || row.hidden || !(row.n > 0) || !cited.some((w) => sameWork(w, row.work))) continue;
    await change(row.id, () => null, (r) => {
      if (!(r.n > 0)) return false;
      r.n = 0;
      r.voters = [];
      r.resolved = { at, by: author || '', page: itemId(school, slug), rev: rev || null };
    });
    settled += 1;
  }
  return settled ? rebuildOutdatedMirror() : null;
}

// When a part of a page was last said to be up to date: its own clearing or the whole page's.
const clearedAt = (pageRow, target) => {
  const c = (pageRow && pageRow.cleared) || {};
  return [c[target], c['*']].filter(Boolean).sort().pop() || '';
};
// The parts of `item` that `report` still tints: those it touches, less those said to be up to
// date after it was made.
const stillTinted = (item, report, pageRow) => touchedBy(item, report)
  .filter((t) => !(clearedAt(pageRow, t) > report.at));

// Every page's newest document, keyed as the outdated rows key pages. A page at both its
// namespaced key and its legacy bare one is read once, at the namespaced key (as the index does).
async function everyPage() {
  const metas = (await listItemMetas()).filter((m) => !m.hidden);
  const taken = new Set(metas.filter((m) => isNamespaced(m.slug)).map((m) => m.slug));
  const wanted = metas
    .map((m) => ({ m, id: isNamespaced(m.slug) ? m.slug : itemId((m.flags || {}).school, m.slug) }))
    .filter(({ m, id }) => isNamespaced(m.slug) || !taken.has(id));
  // Some 1,400 pages across the schools, two reads each: 25 at a time, inside the Lambda's 30 s.
  const out = [];
  for (let i = 0; i < wanted.length; i += 25) {
    const batch = await Promise.all(wanted.slice(i, i + 25).map(async ({ m, id }) => {
      const newest = await newestItem(m.slug);
      return newest ? { id, item: JSON.parse(newest.row.docJson) } : null;
    }));
    out.push(...batch.filter(Boolean));
  }
  return out;
}

// Called by save-item after the clearing and settling above: the reports this page touches (or
// touched) have the page's parts that are still tinted written down, and a report with none left
// anywhere settles itself. Returns the rebuilt mirror when anything settled, else null.
export async function settleCleared(school, slug, item, { rev } = {}) {
  const pageId = itemId(school, slug);
  const rows = await allRows();
  const pageRows = new Map(rows.filter((r) => r.id.startsWith('page#')).map((r) => [r.page, r]));
  const live = rows.filter((r) => r.id.startsWith('pub#') && !r.hidden && r.n > 0);
  let pages = null; // read once, only if a report has never had its parts worked out
  let settled = 0;
  for (const report of live) {
    const here = stillTinted(item, report, pageRows.get(pageId));
    if (!report.open && !touchedBy(item, report).length) continue;
    if (report.open && !report.open[pageId] && !here.length) continue;
    let open = report.open;
    if (!open) {
      pages = pages || await everyPage();
      open = {};
      for (const p of pages) {
        // This page as just saved, not as the store read it a moment ago.
        const parts = p.id === pageId ? here : stillTinted(p.item, report, pageRows.get(p.id));
        if (parts.length) open[p.id] = parts;
      }
    } else {
      open = { ...open };
      if (here.length) open[pageId] = here;
      else delete open[pageId];
    }
    const done = Object.keys(open).length === 0;
    await change(report.id, () => null, (r) => {
      if (!(r.n > 0) || r.hidden) return false;
      if (done) {
        r.n = 0;
        r.voters = [];
        delete r.open;
        r.resolved = { at: now(), by: '', page: pageId, rev: rev || null, auto: true };
      } else {
        r.open = open;
      }
    });
    if (done) settled += 1;
  }
  return settled ? rebuildOutdatedMirror() : null;
}

// POST hide-outdated-pub (admin) { id, hidden }: takes down a report made in error.
export async function hideOutdatedPubHandler(event) {
  const body = parseBody(event);
  if (typeof body.id !== 'string' || !body.id) throw new HttpError(400, 'id is required');
  const id = `pub#${body.id}`;
  if (!(await getRow(id))) throw new HttpError(404, 'No such report');
  await change(id, () => null, (row) => {
    if (body.hidden === false) delete row.hidden;
    else row.hidden = true;
  });
  return ok({ outdated: await rebuildOutdatedMirror() });
}
