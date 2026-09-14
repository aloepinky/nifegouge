import { lintItem } from './discussRules.mjs';
import { HttpError, requireProgram } from './http.mjs';

// What the server checks before it stores an item.
//
// Two layers. `checkItem` is the structural half of the browser's edit/validate.js, redone
// here because the browser copy is not to be trusted and imports the browser registry anyway:
// the shape, the ids, the citations, the size. `lintForSave` then runs the shared rules and
// decides what blocks.
//
// The only blocking rule is the em dash, and it blocks only when a save *adds* one. Fifty-seven
// pages carried em dashes when the corpus was imported, and refusing every edit to those pages
// until somebody rewrites their dashes would turn a typo fix into a rewrite. A save that leaves
// the count where it was, or lowers it, goes through and carries the remaining dashes back as
// warnings; a save that raises it is refused with each location named.

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const RESERVED_SLUGS = new Set(['e', 'b', 's', 'upload', 'edit', 'new', 'history']);
export const MAX_ITEM_BYTES = 200 * 1024;

const ALLOWED_KEYS = new Set([
  'slug', 'title', 'lede', 'note', 'numbers', 'sections', 'seeAlso', 'references',
  'maneuver', 'stub', 'sourcingLead', 'generated', 'diagram', 'limits', 'aircraft', 'school',
]);

export function checkSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug) || slug.length > 80) {
    throw new HttpError(400, 'A slug is lowercase words joined by single hyphens');
  }
  if (RESERVED_SLUGS.has(slug)) throw new HttpError(400, `"${slug}" is reserved`);
}

const isArr = (v) => Array.isArray(v);
const isStr = (v) => typeof v === 'string';

// Every id on the page, and the refs each block carries. Mirrors edit/ids.js's allIds.
function walk(item, onId, onRefs) {
  for (const n of item.numbers || []) { onId(n.id, `numbers row`); onRefs(n.refs, `numbers row ${n.id}`); }
  const block = (b, where) => {
    onId(b.id, where);
    onRefs(b.refs, where);
    for (const p of b.paras || []) { onId(p.id, `${where} paragraph`); onRefs(p.refs, `${where}/${p.id}`); }
    for (const f of b.figures || []) { onId(f.id, `${where} figure`); onRefs(f.refs, `${where}/${f.id}`); }
    for (const t of b.tables || []) { onId(t.id, `${where} table`); onRefs(t.refs, `${where}/${t.id}`); }
    const list = (items) => {
      for (const x of items || []) {
        onId(x.id, `${where} list element`);
        onRefs(x.refs, `${where}/${x.id}`);
        list(x.sub);
      }
    };
    list(b.items);
  };
  for (const s of item.sections || []) {
    block(s, s.title || s.id);
    for (const sub of s.subsections || []) block(sub, `${s.title} / ${sub.title || sub.id}`);
  }
}

// Shape, ids and citations. Throws a 400 naming the first thing wrong.
export function checkItem(item, slug) {
  const bad = (msg) => { throw new HttpError(400, msg); };
  if (!item || typeof item !== 'object' || isArr(item)) bad('item must be an object');
  if (item.slug !== slug) bad('item.slug must match the slug being saved');
  if (!isStr(item.title) || !item.title.trim()) bad('The page has no title');
  requireProgram(item, 'The page');
  for (const key of Object.keys(item)) {
    if (!ALLOWED_KEYS.has(key)) bad(`Unknown field "${key}"`);
  }
  for (const key of ['numbers', 'sections', 'seeAlso', 'references']) {
    if (item[key] !== undefined && !isArr(item[key])) bad(`${key} must be an array`);
  }
  for (const key of ['lede', 'note', 'sourcingLead']) {
    if (item[key] !== undefined && !isStr(item[key])) bad(`${key} must be a string`);
  }
  if (Buffer.byteLength(JSON.stringify(item), 'utf8') > MAX_ITEM_BYTES) bad('The page is too large to store');

  const refNums = new Set();
  for (const r of item.references || []) {
    if (!r || !Number.isInteger(r.n)) bad('Every reference needs a number');
    if (refNums.has(r.n)) bad(`Two references share the number ${r.n}`);
    refNums.add(r.n);
    if (!isStr(r.work) || !r.work.trim()) bad(`Reference ${r.n} names no publication`);
  }

  const ids = new Set();
  walk(
    item,
    (id, where) => {
      if (!isStr(id) || !id.trim()) bad(`A ${where} has no id`);
      if (ids.has(id)) bad(`Duplicate id "${id}"`);
      ids.add(id);
    },
    (refs, where) => {
      if (refs === undefined) return;
      if (!isArr(refs)) bad(`${where}: refs must be an array`);
      for (const n of refs) {
        if (!refNums.has(n)) bad(`${where} cites reference ${n}, which is not in the list`);
      }
    },
  );

  const blocks = (b, where) => {
    if (!isStr(b.title) || !b.title.trim()) bad(`${where} has no heading`);
    for (const f of b.figures || []) {
      if (!isStr(f.src) || !f.src) bad(`Figure ${f.id} has no image`);
      if (!isStr(f.alt) || !f.alt.trim()) bad(`Figure ${f.id} has no alt text`);
    }
    for (const t of b.tables || []) {
      const cols = (t.cols || []).length;
      if (cols < 2) bad(`Table ${t.id} has fewer than two columns`);
      if (!isArr(t.rows) || !t.rows.length) bad(`Table ${t.id} has no rows`);
      t.rows.forEach((row, i) => {
        if (!isArr(row) || row.length !== cols) bad(`Table ${t.id}, row ${i + 1} has the wrong number of cells`);
      });
    }
  };
  for (const s of item.sections || []) {
    blocks(s, `Section "${s.title || s.id}"`);
    for (const sub of s.subsections || []) blocks(sub, `Subsection "${sub.title || sub.id}"`);
  }
}

const emDashes = (findings) => findings.filter((f) => f.rule === 'em-dash');

// -> { errors, warnings }, each `[{ rule, detail }]`. `baseItem` is the revision the save
// started from, or null for a brand-new page.
export function lintForSave(item, baseItem) {
  const findings = lintItem(item);
  const before = baseItem ? emDashes(lintItem(baseItem)).length : 0;
  const now = emDashes(findings);
  const strip = (f) => ({ rule: f.rule, detail: f.detail });
  if (now.length > before) {
    return {
      errors: now.map(strip),
      warnings: findings.filter((f) => f.rule !== 'em-dash').map(strip),
    };
  }
  return { errors: [], warnings: findings.map(strip) };
}
