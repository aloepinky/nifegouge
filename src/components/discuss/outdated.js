import { useEffect, useSyncExternalStore } from 'react';
import { post, readMirror, voterId } from '../serverApi';
import { schoolNs } from '../programs';

// Outdated marks: a reader marks a section of a page outdated, or reports that a publication has
// been updated (a section of it, a chapter, or the whole thing). Both tint the sections they
// touch, fainter for one mark than for three, until someone publishes the section and says it
// is up to date. The server's side and the stored shapes are in lambda/discussApi/outdated.mjs;
// the whole set is one mirror file, `outdated/index.json`, read once and replaced by whatever a
// write sends back.
//
// Plain JS, no JSX: the parts that draw are in OutdatedMarks.js.

// ---------------------------------------------------------------------------------------
// The store

let index = null;
let loading = null;
const subs = new Set();

function set(next) {
  if (!next) return;
  index = next;
  subs.forEach((fn) => fn());
}

export const setOutdated = set;

function load() {
  if (!loading) {
    loading = readMirror('outdated/index.json')
      .then((d) => set(d || { pages: {}, pubs: [] }))
      // No marks is the page as it always was; the next visit tries again.
      .catch(() => { loading = null; });
  }
  return loading;
}

const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

const EMPTY = { pages: {}, pubs: [] };

// The marks on every page and the publication reports, or nothing yet.
export function useOutdated() {
  useEffect(() => { load(); }, []);
  return useSyncExternalStore(subscribe, () => index || EMPTY, () => index || EMPTY);
}

// ---------------------------------------------------------------------------------------
// What this browser has marked, so its own mark reads as taken and can be taken back. Kept with
// the time, because publishing a section clears everyone's marks on it, this one included.

const MINE_KEY = 'discussOutdatedMine';

function readMine() {
  try {
    return JSON.parse(localStorage.getItem(MINE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeMine(key, at) {
  const all = readMine();
  if (at) all[key] = at;
  else delete all[key];
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(all));
  } catch {
    // The mark is recorded; only this browser's memory of it is lost.
  }
}

export const pageKey = (school, slug) => `${schoolNs(school)}/${String(slug).toLowerCase()}`;

// When a section was last said to be up to date: its own clearing or the whole page's.
function clearedAt(entry, target) {
  const c = (entry && entry.cleared) || {};
  return [c[target], c['*']].filter(Boolean).sort().pop() || '';
}

export function markedByMe(school, slug, target, entry) {
  const at = readMine()[`${pageKey(school, slug)}#${target}`];
  return !!at && at > clearedAt(entry, target);
}

export async function markOutdated(school, slug, target, on, note) {
  const out = await post('mark-outdated', { school, slug, target, on, note, voter: voterId() });
  writeMine(`${pageKey(school, slug)}#${target}`, on ? new Date().toISOString() : null);
  set(out.outdated);
}

// -> { already } — true when this browser had reported the same thing before.
export async function reportOutdatedPub({ school, work, scope, part, note }) {
  const out = await post('report-outdated-pub', { school, work, scope, part, note, voter: voterId() });
  set(out.outdated);
  return { already: !!out.already };
}

// ---------------------------------------------------------------------------------------
// Matching a report to a reference
//
// A reference names its work and the section it cites (`loc`): `Ch. 4 — Operating
// Limitations`, `§403 — Chart Preparation`, `§12.2.3 — CAS Caution Messages`, `§1-1-9 — …`,
// `Appendix A — Glossary`. A report names a work and, for a chapter or a section, what the
// reader typed. The chapter is read off the section number the way each kind of publication
// numbers it: NATOPS and the AIM lead with it (§12.2.3, §1-1-9), an FTI's hundreds are its
// chapter (§403 is chapter 4, §1107 chapter 11).

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9§.-]+/g, ' ').replace(/\s+/g, ' ').trim();
const sameWork = (a, b) => norm(a) === norm(b);

// A chapter as one key: `4`, `a3`, `app a`, `encl 2`.
export function chapterKey(text) {
  const t = norm(text).replace(/^(chapter|ch\.?)\s*/, '');
  let m = /^(?:appendix|app\.?)\s*([a-z0-9]+)/.exec(t);
  if (m) return `app ${m[1]}`;
  m = /^(?:enclosure|encl\.?)\s*\(?([a-z0-9]+)/.exec(t);
  if (m) return `encl ${m[1]}`;
  m = /^([a-z]?)0*(\d+)\b/.exec(t);
  return m ? `${m[1]}${m[2]}` : t;
}

// The chapter a reference cites, as a key and as it would be written, or null.
export function chapterOf(ref) {
  const loc = String((ref && ref.loc) || '').trim();
  let m = /^(?:ch\.?|chapter)\s*([A-Z]?\d+)/i.exec(loc);
  if (m) return { key: chapterKey(m[1]), label: `Ch. ${m[1]}` };
  m = /^§\s*(\d+)[.-]\d/.exec(loc);
  if (m) return { key: chapterKey(m[1]), label: `Ch. ${Number(m[1])}` };
  m = /^§\s*(\d+)\b/.exec(loc);
  if (m) {
    const ch = m[1].length >= 3 ? String(Math.floor(Number(m[1]) / 100)) : String(Number(m[1]));
    return { key: ch, label: `Ch. ${ch}` };
  }
  m = /^(?:appendix|app\.)\s*([A-Z0-9]+)/i.exec(loc);
  if (m) return { key: `app ${m[1].toLowerCase()}`, label: `Appendix ${m[1]}` };
  m = /^(?:enclosure|encl\.)\s*\(?([A-Za-z0-9]+)\)?/i.exec(loc);
  if (m) return { key: `encl ${m[1].toLowerCase()}`, label: `Encl. (${m[1]})` };
  m = /^pp?\.\s*([A-Z]?\d+)-/i.exec(String((ref && ref.pages) || ''));
  if (m) return { key: chapterKey(m[1]), label: `Ch. ${m[1]}` };
  return null;
}

const sectionNumber = (text) => {
  const m = /^§?\s*(\d+(?:[.-]\d+)*)\b/.exec(norm(text));
  return m ? m[1] : null;
};

// A section reported updated covers the sections numbered under it: §12.2 covers §12.2.3.
function sectionMatches(loc, part) {
  const a = sectionNumber(loc);
  const b = sectionNumber(part);
  if (a && b) return a === b || a.startsWith(`${b}.`) || a.startsWith(`${b}-`);
  const l = norm(loc);
  const p = norm(part);
  if (!p) return false;
  const title = norm(String(loc || '').split('—').slice(1).join('—'));
  return l === p || l.startsWith(`${p} `) || (!!title && title === p);
}

export function refMatches(ref, report) {
  if (!ref || !sameWork(ref.work, report.work)) return false;
  if (report.scope === 'pub') return true;
  if (report.scope === 'chapter') {
    const ch = chapterOf(ref);
    return !!ch && ch.key === chapterKey(report.part);
  }
  return sectionMatches(ref.loc, report.part);
}

// How a report names what changed: "NATOPS", "NATOPS Ch. 4", "NATOPS §403 — Chart Preparation".
export function reportName(report) {
  if (report.scope === 'pub') return report.work;
  if (report.scope === 'chapter') {
    const key = chapterKey(report.part);
    return `${report.work} ${/^[a-z]?\d+$/.test(key) ? `Ch. ${key.toUpperCase()}` : report.part}`;
  }
  return `${report.work} ${report.part}`;
}

// ---------------------------------------------------------------------------------------
// A section's state

// The reference numbers a block cites: its own `refs` and every part's. A section's own blocks
// only, not its subsections', which carry marks of their own and are drawn inside it.
function refsIn(block) {
  const out = new Set(block.refs || []);
  const add = (b) => (b.refs || []).forEach((n) => out.add(n));
  const walk = (list) => (list || []).forEach((b) => {
    add(b);
    walk(b.sub);
  });
  walk(block.paras);
  walk(block.items);
  walk(block.tables);
  walk(block.figures);
  return out;
}

// The references a section's own blocks cite, in reference order, one per work and section:
// what its `[mark pub as outdated]` offers.
export function citedRefs(item, block) {
  const ns = refsIn(block);
  const seen = new Set();
  return (item.references || []).filter((r) => {
    const key = `${norm(r.work)}|${norm(r.loc)}`;
    if (!ns.has(r.n) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// { level: 0..3, marks, notes, pubs } for one section, subsection or the Numbers box (`target`
// 'numbers', `block` { refs } of every row). `marks` is readers' marks since the section was
// last said to be up to date; `pubs` the reports that touch a reference it cites, made since.
export function sectionState(data, school, item, target, block) {
  const entry = data.pages[pageKey(school, item.slug)];
  const mark = entry && entry.marks[target];
  const since = clearedAt(entry, target);
  const cited = [...refsIn(block)]
    .map((n) => (item.references || []).find((r) => r.n === n))
    .filter(Boolean);
  const pubs = (data.pubs || []).filter((p) => p.at > since && cited.some((ref) => refMatches(ref, p)));
  const marks = mark ? mark.n : 0;
  const total = marks + pubs.reduce((sum, p) => sum + (p.n || 1), 0);
  return {
    level: Math.min(3, total),
    marks,
    notes: mark ? mark.notes || [] : [],
    pubs,
    entry,
  };
}

// The Numbers box as a block: its rows' refs.
export const numbersBlock = (item) => ({ refs: (item.numbers || []).flatMap((n) => n.refs || []) });

// Every marked part of a page, with its heading, for the publish step to offer clearing.
export function markedParts(data, school, item) {
  const out = [];
  const consider = (id, title, block) => {
    const st = sectionState(data, school, item, id, block);
    if (st.level > 0) out.push({ id, title, level: st.level });
  };
  if ((item.numbers || []).length) consider('numbers', 'Numbers', numbersBlock(item));
  for (const s of item.sections || []) {
    consider(s.id, s.title, s);
    for (const sub of s.subsections || []) consider(sub.id, sub.title, sub);
  }
  return out;
}

// Whether a part of the page differs between two versions of it, for ticking it by default.
export function partChanged(before, after, id) {
  const find = (item) => {
    if (id === 'numbers') return item.numbers || null;
    for (const s of item.sections || []) {
      if (s.id === id) return { ...s, subsections: undefined };
      const sub = (s.subsections || []).find((x) => x.id === id);
      if (sub) return sub;
    }
    return null;
  };
  return JSON.stringify(find(before)) !== JSON.stringify(find(after));
}

// The reports a reference falls under, for its line in the References list.
export function reportsFor(data, ref) {
  return (data.pubs || []).filter((p) => refMatches(ref, p));
}
