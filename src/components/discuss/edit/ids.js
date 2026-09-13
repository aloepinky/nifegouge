// Id minting for the edit layer.
//
// Every rule in this file descends from one fact, the one `tools/discuss-lint.js` exists to
// enforce: an id is the seam a community edit attaches to, so renaming one orphans whatever
// somebody wrote against it. The editor therefore **never renumbers**. Deleting `li-p2` from
// a three-paragraph section leaves `li-p1` and `li-p3` where they are, and the next new
// paragraph is `li-p4` — not the `li-p2` the gap invites.
//
// A new id continues the series its siblings are already in, so an id minted in the browser
// is indistinguishable from one typed into the file by hand. Where there is no series to
// continue, the prefix is derived the way the corpus derives it: initials of the section id
// (`entry` → `en-p1`, `reading-it` → `ri-p1`), `num-` for infobox rows, `fig-` for figures.

// Split `en-p12` into { base: 'en-p', num: 12, width: 2 }. Returns null for an id with no
// trailing number — a hand-written id like `minimums` is a name, not a series.
function parseSeries(id) {
  const m = /^(.*?)(\d+)$/.exec(id || '');
  if (!m) return null;
  return { base: m[1], num: parseInt(m[2], 10), width: m[2].length };
}

// The prefix the corpus would use for a section's own blocks: initials of a multi-word id,
// first two letters of a single-word one. `phases` → `ph`, `reading-it` → `ri`.
function initials(sectionId) {
  const words = String(sectionId || '').split('-').filter(Boolean);
  if (words.length === 0) return 'x';
  if (words.length === 1) return words[0].slice(0, 2).toLowerCase();
  return words.map((w) => w[0]).join('').slice(0, 3).toLowerCase();
}

// Every id anywhere on the page, flat. Mirrors `idsOf` in tools/discuss-lint.js, minus the
// path prefixes — here the question is only "is this string already taken".
export function allIds(item) {
  const out = [];
  for (const n of item.numbers || []) out.push(n.id);
  const body = (b) => {
    for (const p of b.paras || []) out.push(p.id);
    for (const f of b.figures || []) out.push(f.id);
    for (const t of b.tables || []) out.push(t.id);
    const walk = (list) => {
      for (const x of list || []) {
        out.push(x.id);
        walk(x.sub);
      }
    };
    walk(b.items);
  };
  for (const s of item.sections || []) {
    out.push(s.id);
    body(s);
    for (const sub of s.subsections || []) {
      out.push(sub.id);
      body(sub);
    }
  }
  return out.filter(Boolean);
}

// The ids that are anchors — a section or subsection id is on the rendered element and is
// linked from the contents rail, so losing one breaks a URL as well as an annotation.
export function anchorIds(item) {
  const out = [];
  for (const s of item.sections || []) {
    out.push(s.id);
    for (const sub of s.subsections || []) out.push(sub.id);
  }
  return out.filter(Boolean);
}

// Continue the series the siblings are in; failing that, start one at `fallbackBase`.
// `taken` is the whole page's id list, so a new id never collides with a distant section's.
function mint(siblings, fallbackBase, fallbackWidth, taken) {
  const series = (siblings || []).map((s) => parseSeries(s.id)).filter(Boolean);

  let base = fallbackBase;
  let width = fallbackWidth;
  if (series.length) {
    // The most common base among the siblings, so one odd id does not derail the series.
    const counts = {};
    for (const s of series) counts[s.base] = (counts[s.base] || 0) + 1;
    base = Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a));
    width = Math.max(...series.filter((s) => s.base === base).map((s) => s.width));
  }

  // Highest number already used on this base anywhere on the page, +1. Scanning the page
  // rather than the siblings is what keeps a deleted id from being handed out again.
  let next = 0;
  for (const id of taken) {
    const p = parseSeries(id);
    if (p && p.base === base) next = Math.max(next, p.num);
  }
  next += 1;

  let candidate = `${base}${String(next).padStart(width, '0')}`;
  while (taken.includes(candidate)) {
    next += 1;
    candidate = `${base}${String(next).padStart(width, '0')}`;
  }
  return candidate;
}

export function newParaId(item, block, sectionId) {
  return mint(block.paras, `${initials(sectionId)}-p`, 1, allIds(item));
}

export function newBulletId(item, block, sectionId) {
  return mint(block.items, `${initials(sectionId)}-`, 2, allIds(item));
}

export function newFigureId(item, block) {
  return mint(block.figures, 'fig-', 2, allIds(item));
}

export function newTableId(item, block) {
  return mint(block.tables, 'tbl-', 2, allIds(item));
}

export function newNumberId(item) {
  return mint(item.numbers, 'num-', 2, allIds(item));
}

// Sub-bullets take their parent's id and a letter, as the corpus does: cc-01 → cc-01a.
export function newSubBulletId(item, parent) {
  const taken = allIds(item);
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (const c of letters) {
    const candidate = `${parent.id}${c}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${parent.id}-${taken.length + 1}`;
}

// A section id is a name, not a series — it is the URL fragment, so it reads as words. It is
// derived from the heading and never typed: while a section is new its id follows whatever
// the heading says, and at its first save it fixes for good. Nothing about it is shown,
// because there is no decision here for a person to make.
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

// `excludeId` is the id the section currently holds, left out of the taken set so a section
// re-deriving its own id does not collide with itself and drift to `-2` on every keystroke.
export function newSectionId(item, title, excludeId) {
  const taken = allIds(item)
    .filter((id) => id !== excludeId)
    .concat(['top', 'numbers', 'see-also', 'references']);
  const base = slugify(title) || 'section';
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
