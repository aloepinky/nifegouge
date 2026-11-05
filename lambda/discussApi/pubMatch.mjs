// Which sections of a page a publication report touches: the server's copy of the matching in
// src/components/discuss/outdated.js (refMatches, refsIn and the parts they use), which is what
// tints a section in the browser. The Lambda is deployed on its own and cannot import src/, so
// the two are kept as copies and tools/outdated-api-test.mjs checks they agree. Change both.

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9§.-]+/g, ' ').replace(/\s+/g, ' ').trim();
const sameWork = (a, b) => norm(a) === norm(b);

export function chapterKey(text) {
  const t = norm(text).replace(/^(chapter|ch\.?)\s*/, '');
  let m = /^(?:appendix|app\.?)\s*([a-z0-9]+)/.exec(t);
  if (m) return `app ${m[1]}`;
  m = /^(?:enclosure|encl\.?)\s*\(?([a-z0-9]+)/.exec(t);
  if (m) return `encl ${m[1]}`;
  m = /^([a-z]?)0*(\d+)\b/.exec(t);
  return m ? `${m[1]}${m[2]}` : t;
}

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

// The parts of a page a report tints: section and subsection ids, and 'numbers' for the
// Numbers box, as the browser's sectionState reads them.
export function touchedBy(item, report) {
  const refs = (item && item.references) || [];
  const hits = (block) => [...refsIn(block)].some((n) => refMatches(refs.find((r) => r.n === n), report));
  const out = [];
  const numbers = (item && item.numbers) || [];
  if (numbers.length && hits({ refs: numbers.flatMap((x) => x.refs || []) })) out.push('numbers');
  for (const s of (item && item.sections) || []) {
    if (hits(s)) out.push(s.id);
    for (const sub of s.subsections || []) if (hits(sub)) out.push(sub.id);
  }
  return out;
}
