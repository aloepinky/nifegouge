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

// Every slug an item points at: See also, and the two hatnote fields on every block.
function linkedSlugs(item) {
  const out = [];
  for (const s of item.seeAlso || []) out.push({ slug: s, where: 'See also' });
  const block = (b, where) => {
    for (const s of b.main || []) out.push({ slug: s, where: `${where} — Main page` });
    for (const s of b.further || []) out.push({ slug: s, where: `${where} — Further information` });
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
    errors.push(`Duplicate id "${id}" — an id is an anchor and has to be unique on the page.`);
  }
  if (ids.some((id) => !id || !id.trim())) errors.push('A block has an empty id.');

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
    for (const id of lostAnchors) errors.push(`Section id "${id}" no longer exists.`);
    if (lostBlocks.length) {
      warnings.push(
        `${lostBlocks.length} block id${lostBlocks.length > 1 ? 's' : ''} removed since this ` +
          `draft started (${lostBlocks.slice(0, 4).join(', ')}${lostBlocks.length > 4 ? '…' : ''}). ` +
          'Anything written against them is orphaned.'
      );
    }
  }

  // --- required fields ------------------------------------------------------------------
  if (!item.title || !item.title.trim()) errors.push('The page has no title.');

  const checkBlock = (b, label) => {
    if (!b.title || !b.title.trim()) errors.push(`A ${label} has no heading.`);
    for (const f of b.figures || []) {
      if (!f.src) errors.push(`Figure ${f.id} has no image path.`);
      if (!f.alt || !f.alt.trim()) {
        errors.push(`Figure ${f.id} has no alt text. Alt is required and is not the caption.`);
      }
    }
    for (const p of b.paras || []) {
      if (!p.text || !p.text.trim()) warnings.push(`Paragraph ${p.id} is empty.`);
    }
    // A ragged row is the one defect in this data shape that is invisible on the page and
    // wrong in the DOM: React renders the short row, the columns silently shift, and nothing
    // about the rendered table says which cell went missing. Same check tools/discuss-lint.js
    // makes — it is worth having in both places because the editor can prevent it.
    for (const t of b.tables || []) {
      const cols = (t.cols || []).length;
      if (!t.caption || !t.caption.trim()) errors.push(`Table ${t.id} has no caption.`);
      if (cols < 2) errors.push(`Table ${t.id} has fewer than two columns.`);
      if (!(t.rows || []).length) errors.push(`Table ${t.id} has no rows.`);
      (t.rows || []).forEach((row, i) => {
        if (row.length !== cols) {
          errors.push(`Table ${t.id}, row ${i + 1} has ${row.length} cells of ${cols}.`);
        }
      });
      if (cols === 2 && (t.rows || []).length <= 3) {
        warnings.push(`Table ${t.id} is ${cols}×${t.rows.length} — check it is not a list.`);
      }
    }
    const walk = (list) => {
      for (const x of list || []) {
        if (!x.text || !x.text.trim()) warnings.push(`List element ${x.id} is empty.`);
        walk(x.sub);
      }
    };
    walk(b.items);
  };
  for (const s of item.sections || []) {
    checkBlock(s, 'section');
    for (const sub of s.subsections || []) checkBlock(sub, 'subsection');
  }

  for (const n of item.numbers || []) {
    if (!n.label || !n.label.trim()) warnings.push(`Numbers row ${n.id} has no label.`);
    if (!n.value || !n.value.trim()) warnings.push(`Numbers row ${n.id} has no value.`);
    else if (!/\d/.test(n.value)) {
      warnings.push(`Numbers row "${n.label}" has no digits in its value — a number is a number.`);
    }
  }

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
    if (!getItemMeta(slug)) warnings.push(`${where} links "${slug}", which is not a discussion item.`);
  }

  return { errors, warnings, ok: errors.length === 0 };
}
