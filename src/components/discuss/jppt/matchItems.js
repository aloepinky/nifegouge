// A JPPT discuss-item phrase, resolved to the page that already answers it.
//
// The index is every wording the Delta syllabus has already tied to a page: each event row's
// verbatim JPPT `label`, each `href` row's label, and each page's own title. A new JPPT mostly
// reuses Delta's phrasing, so most phrases resolve exactly; the rest differ in punctuation,
// plurals or a word or two ("VFR field entry - departure (AIM)", "crosswind landings",
// "formation tactical voice communications"), which is what the looser passes are for.
//
// Match order, first hit wins:
//   1. exact, after normalising case and punctuation
//   2. the same, ignoring plurals — second, not first, because "maneuvering speed" and
//      "maneuvering speeds" are two different pages
//   3. the same, with spaces removed ("airstart" / "air-start")
//   4. token-set Dice coefficient >= DICE_MIN against the best candidate
//   5. every word of a multi-word candidate appears in the phrase, with at most MAX_EXTRA
//      words to spare: "formation tactical voice communications" contains "formation
//      communications"
// Anything else is left unmatched and renders as "no page yet".
//
// The candidates come from data loaded at runtime, so the matcher is built rather than a
// module constant: `buildMatcher(events, items)` takes the Delta events and the item index.

const DICE_MIN = 0.8;
const MAX_EXTRA = 2;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from',
  'if', 'able', 'discuss',
]);

function stem(word) {
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokens(text, { stemmed = true } = {}) {
  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w));
  return stemmed ? words.map(stem) : words;
}

function dice(a, b) {
  let common = 0;
  a.forEach((w) => { if (b.has(w)) common += 1; });
  return (2 * common) / (a.size + b.size);
}

// -> { matchDetail(label), matchLabel(label), candidates }
export function buildMatcher(events, items) {
  // One candidate per distinct wording (unstemmed), carrying every page that wording is tied
  // to and how often, so a tie goes to the page the registry uses it for most.
  const byKey = new Map();
  const add = (text, target) => {
    const raw = tokens(text, { stemmed: false });
    if (!raw.length) return;
    const k = raw.join(' ');
    if (!byKey.has(k)) {
      const stemmed = raw.map(stem);
      byKey.set(k, {
        key: k,
        stemKey: stemmed.join(' '),
        squashed: raw.join(''),
        set: new Set(stemmed),
        targets: new Map(),
      });
    }
    const t = byKey.get(k).targets;
    const id = target.slug ? `s:${target.slug}` : `h:${target.href}`;
    t.set(id, { target, n: ((t.get(id) || {}).n || 0) + 1 });
  };
  (events || []).forEach((event) => {
    (event.items || []).forEach((row) => {
      if (row.slug) add(row.label, { slug: row.slug });
      else if (row.href) add(row.label, { href: row.href });
    });
  });
  (items || []).forEach((item) => add(item.title, { slug: item.slug }));
  const candidates = [...byKey.values()].map((c) => {
    const ranked = [...c.targets.values()].sort((a, b) => b.n - a.n);
    return { ...c, uses: ranked.reduce((n, t) => n + t.n, 0), ranked };
  });

  const group = (keyFn) => {
    const map = new Map();
    candidates.forEach((c) => {
      const k = keyFn(c);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(c);
    });
    map.forEach((list) => list.sort((a, b) => b.uses - a.uses));
    return map;
  };
  const byExact = group((c) => c.key);
  const byStem = group((c) => c.stemKey);
  const bySquashed = group((c) => c.squashed);

  const result = (c, how, score) => ({
    target: { ...c.ranked[0].target },
    how,
    score,
    // More than one means the wording is ambiguous in the registry itself: "arcing" is the
    // Arcing page on I2202 and the arcing approach on I6102.
    alternatives: c.ranked.map((t) => ({ ...t.target })),
  });

  // { target: { slug } | { href } | null, how, score, alternatives }
  const matchDetail = (label) => {
    const raw = tokens(label, { stemmed: false });
    if (!raw.length) return { target: null, how: null, score: 0, alternatives: [] };

    const exact = byExact.get(raw.join(' '));
    if (exact) return result(exact[0], 'exact', 1);

    const stemmed = raw.map(stem);
    const plural = byStem.get(stemmed.join(' '));
    if (plural) return result(plural[0], 'exact', 1);

    const squashed = bySquashed.get(raw.join(''));
    if (squashed) return result(squashed[0], 'squashed', 1);

    const set = new Set(stemmed);
    let similar = null;
    let contains = null;
    candidates.forEach((c) => {
      const d = dice(set, c.set);
      const better = (cur) => !cur || d > cur.score || (d === cur.score && c.uses > cur.c.uses);
      if (d >= DICE_MIN && better(similar)) similar = { c, score: d };
      if (
        c.set.size >= 2
        && [...c.set].every((w) => set.has(w))
        && set.size - c.set.size <= MAX_EXTRA
        && better(contains)
      ) {
        contains = { c, score: d };
      }
    });
    if (similar) return result(similar.c, 'similar', similar.score);
    if (contains) return result(contains.c, 'contains', contains.score);
    return { target: null, how: null, score: 0, alternatives: [] };
  };

  // The row fields to merge onto `{ label }`: `{ slug }`, `{ href }` or nothing.
  const matchLabel = (label) => {
    const { target } = matchDetail(label);
    return target ? { ...target } : {};
  };

  return { matchDetail, matchLabel, candidates };
}

// Wordings the Delta registry already treats as one item even though they contain a comma or
// an "and": "ATF, ATS, CTS and MIF", "brief and debrief", "smoke and fume elimination". The
// extractor guards these so the comma split does not cut through them.
export function protectedPhrases(events, items) {
  const set = new Set();
  const add = (t) => {
    if (!t || !(/,/.test(t) || /\band\b/i.test(t))) return;
    const lower = t.toLowerCase();
    set.add(lower);
    // The same list with or without the serial comma: "lead, lag and pure pursuit".
    if (lower.includes(',')) set.add(lower.replace(/,? and /, ', and ')).add(lower.replace(/, and /, ' and '));
  };
  (events || []).forEach((e) => (e.items || []).forEach((row) => add(row.label)));
  (items || []).forEach((item) => add(item.title));
  return [...set].sort((a, b) => b.length - a.length);
}
