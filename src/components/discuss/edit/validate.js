// What the editor checks before it will save, and what it only warns about.
//
// Deliberately small, and deliberately not a port of tools/discuss-lint.js. The heading-style
// rules there carry the `NOUN_ING` and `PROPER` allowlists — the judgement calls about which
// gerunds are ordinary nouns and which capitalised words are the publications' own notation —
// and a second copy of those in the browser would drift from the first within a month. So the
// browser checks the things that are structurally wrong however the prose reads, and the edit
// bar points at the CLI for the rest.
//
// Errors block a save; warnings do not. A half-written draft has to be saveable, or the
// editor is only usable by somebody who can finish in one sitting.
import { allIds, anchorIds } from './ids';
import { getItemMeta } from '../registry';

function dupes(list) {
  const seen = new Set();
  const out = new Set();
  for (const id of list) {
    if (seen.has(id)) out.add(id);
    seen.add(id);
  }
  return [...out];
}

// Every slug an item points at: See also, and the two hatnote fields on every block. A
// `{ href, label }` entry is a link elsewhere and is not checked.
function linkedSlugs(item) {
  const out = [];
  const push = (s, where) => { if (typeof s === 'string') out.push({ slug: s, where }); };
  for (const s of item.seeAlso || []) push(s, 'See also');
  const block = (b, where) => {
    for (const s of b.main || []) push(s, `${where}, Main page`);
    for (const s of b.further || []) push(s, `${where}, Further information`);
  };
  for (const s of item.sections || []) {
    block(s, s.title);
    for (const sub of s.subsections || []) block(sub, sub.title);
  }
  return out;
}

// Every `refs` array on the page, with a label for the message.
function allRefs(item) {
  const out = [];
  for (const n of item.numbers || []) out.push({ refs: n.refs, where: `Numbers row ${n.id}` });
  const block = (b, where) => {
    if (b.refs) out.push({ refs: b.refs, where });
    for (const p of b.paras || []) out.push({ refs: p.refs, where: `${where} — ${p.id}` });
    for (const f of b.figures || []) out.push({ refs: f.refs, where: `${where} — ${f.id}` });
    for (const t of b.tables || []) out.push({ refs: t.refs, where: `${where} — ${t.id}` });
    const walk = (list) => {
      for (const x of list || []) {
        out.push({ refs: x.refs, where: `${where} — ${x.id}` });
        walk(x.sub);
      }
    };
    walk(b.items);
  };
  for (const s of item.sections || []) {
    block(s, s.title);
    for (const sub of s.subsections || []) block(sub, sub.title);
  }
  return out.filter((r) => r.refs && r.refs.length);
}

export function validate(item, baseIds) {
  const errors = [];
  const warnings = [];

  // --- ids: the one thing worth blocking a save over ------------------------------------
  const ids = allIds(item);
  for (const id of dupes(ids)) {
    errors.push(`Two parts of the page share the id "${id}". Remove one of them.`);
  }
  if (ids.some((id) => !id || !id.trim())) errors.push('A part of the page has no id.');

  if (baseIds && baseIds.length) {
    const now = new Set(ids);
    const anchors = new Set(anchorIds(item));
    const lostAnchors = [];
    const lostBlocks = [];
    for (const id of baseIds) {
      if (now.has(id)) continue;
      // A section or subsection id is a URL fragment and a contents-rail link as well as an
      // edit anchor, so losing one is an error. A paragraph id genuinely retires when a
      // prose section is rewritten as numbered steps — that is advisory.
      (anchors.has(id) ? lostAnchors : lostBlocks).push(id);
    }
    for (const id of lostAnchors) {
      errors.push(`The section "${id}" was renamed or removed, which would break links to it.`);
    }
    // Paragraph and list ids come and go as prose is rewritten; nothing hangs off them yet.
    void lostBlocks;
  }

  // --- required fields ------------------------------------------------------------------
  if (!item.title || !item.title.trim()) errors.push('The page has no title.');
  if (!item.aircraft || !item.aircraft.trim()) errors.push('The page names no aircraft.');
  if (!item.school || !item.school.trim()) errors.push('The page names no school.');

  const checkBlock = (b, label) => {
    if (!b.title || !b.title.trim()) errors.push(`A ${label} has no heading.`);
    const name = b.title && b.title.trim() ? `"${b.title}"` : `a ${label}`;
    (b.figures || []).forEach((f, i) => {
      if (!f.src) errors.push(`Figure ${i + 1} in ${name} has no image. Upload one.`);
      if (!f.alt || !f.alt.trim()) errors.push(`Figure ${i + 1} in ${name} needs alt text.`);
    });
    (b.paras || []).forEach((p, i) => {
      if (!p.text || !p.text.trim()) warnings.push(`Paragraph ${i + 1} in ${name} is empty.`);
    });
    // A ragged row is the one defect in this data shape that is invisible on the page and
    // wrong in the DOM: React renders the short row, the columns silently shift, and nothing
    // about the rendered table says which cell went missing. Same check tools/discuss-lint.js
    // makes — it is worth having in both places because the editor can prevent it.
    (b.tables || []).forEach((t, k) => {
      const cols = (t.cols || []).length;
      const tname = `Table ${k + 1} in ${name}`;
      if (!t.caption || !t.caption.trim()) errors.push(`${tname} has no caption.`);
      if (cols < 2) errors.push(`${tname} needs at least two columns.`);
      if (!(t.rows || []).length) errors.push(`${tname} has no rows.`);
      (t.rows || []).forEach((row, i) => {
        if (row.length !== cols) {
          errors.push(`${tname}, row ${i + 1} has ${row.length} cells but the table has ${cols} columns.`);
        }
      });
    });
    const walk = (list) => {
      (list || []).forEach((x, i) => {
        if (!x.text || !x.text.trim()) warnings.push(`List item ${i + 1} in ${name} is empty.`);
        walk(x.sub);
      });
    };
    walk(b.items);
  };
  for (const s of item.sections || []) {
    checkBlock(s, 'section');
    for (const sub of s.subsections || []) checkBlock(sub, 'subsection');
  }

  (item.numbers || []).forEach((n, i) => {
    if (!n.label || !n.label.trim()) warnings.push(`Numbers row ${i + 1} has no label.`);
    if (!n.value || !n.value.trim()) warnings.push(`Numbers row ${i + 1} has no value.`);
  });

  const refNums = new Set((item.references || []).map((r) => r.n));
  for (const r of item.references || []) {
    if (!r.work || !r.work.trim()) errors.push(`Reference ${r.n} names no publication.`);
  }
  if (dupes((item.references || []).map((r) => r.n)).length) {
    errors.push('Two references share a number.');
  }

  // --- links that go nowhere ------------------------------------------------------------
  for (const { refs, where } of allRefs(item)) {
    for (const n of refs) {
      if (!refNums.has(n)) errors.push(`${where} cites reference ${n}, which is not in the list.`);
    }
  }
  for (const { slug, where } of linkedSlugs(item)) {
    if (!getItemMeta(slug)) warnings.push(`${where} links "${slug}", and there is no page at that address.`);
  }

  return { errors, warnings, ok: errors.length === 0 };
}
