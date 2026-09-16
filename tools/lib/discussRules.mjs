// The discuss-item lint rules, as a pure module: no filesystem, no argv, no process.exit.
//
// Two consumers share it and must never drift apart. `tools/discuss-lint.js` runs it over the
// whole corpus from the command line, with the id baseline and the reporting that only make
// sense there. `lambda/discussApi` runs it on every save, so a contributor sees the same
// findings the maintainer would. The deploy workflow copies this file into the lambda
// directory; the copy is gitignored and never hand-edited.
//
// Every rule function takes a parsed item object (the data an item file exports) and returns
// `[level, rule, detail]` triples. Of the content rules, `unsourced-block` and
// `thin-justification` are errors: a block with no source has to argue for itself. The prose rules are
// advisory, since each is occasionally the publication's own wording and needs a person to
// adjudicate.

// ---------------------------------------------------------------------------------------
// Walking an item

// Every id on a page, in one flat list: the sections, their paragraphs, their list elements
// (and sub-elements), their figures, and the numbers rows.
export function idsOf(item) {
  const out = [];
  for (const n of item.numbers || []) out.push(`numbers/${n.id}`);
  // A subsection id is an anchor in its own right — it is on the rendered <section> and the
  // contents rail links to it — so it is recorded bare, like a section's, and losing one is
  // an error rather than an advisory.
  const body = (b, prefix) => {
    for (const p of b.paras || []) out.push(`${prefix}/${p.id}`);
    for (const f of b.figures || []) out.push(`${prefix}/fig:${f.id}`);
    for (const t of b.tables || []) out.push(`${prefix}/tbl:${t.id}`);
    const walk = (list, pfx) => {
      for (const x of list || []) {
        out.push(`${pfx}/${x.id}`);
        walk(x.sub, `${pfx}/${x.id}`);
      }
    };
    walk(b.items, prefix);
  };
  for (const s of item.sections || []) {
    out.push(`${s.id}`);
    body(s, s.id);
    for (const sub of s.subsections || []) {
      out.push(`${sub.id}`);
      body(sub, sub.id);
    }
  }
  return out;
}

// Every heading on a page, in reading order: the H2s and, under each, its H3s. The header
// rules do not care which level a heading is — an index entry is an index entry.
export function headingsOf(item) {
  const out = [];
  for (const s of item.sections || []) {
    out.push({ title: s.title, level: 2 });
    for (const sub of s.subsections || []) out.push({ title: sub.title, level: 3 });
  }
  return out;
}

// Every rendered string on a page, in reading order, tagged with where it came from. This is
// what the prose rules read. `references[].loc` is deliberately absent: its `Ch. 3 — Abort`
// form is the citation format CLAUDE.md specifies and every item file on the site uses it, so
// the em dash rule must not see it.
export function textsOf(item) {
  const out = [];
  const add = (kind, where, text) => {
    if (typeof text === 'string' && text.trim()) out.push({ kind, where, text });
  };
  add('prose', 'lede', item.lede);
  add('prose', 'note', item.note);
  for (const n of item.numbers || []) {
    add('label', `numbers/${n.id}`, n.label);
    add('label', `numbers/${n.id}`, n.value);
  }
  const body = (b, prefix) => {
    for (const p of b.paras || []) add('prose', `${prefix}/${p.id}`, p.text);
    for (const f of b.figures || []) add('caption', `${prefix}/fig:${f.id}`, f.caption);
    for (const t of b.tables || []) add('caption', `${prefix}/tbl:${t.id}`, t.caption);
    const walk = (list, pfx) => {
      for (const x of list || []) {
        add('list', `${pfx}/${x.id}`, x.text);
        walk(x.sub, `${pfx}/${x.id}`);
      }
    };
    walk(b.items, prefix);
  };
  for (const s of item.sections || []) {
    body(s, s.id);
    for (const sub of s.subsections || []) body(sub, sub.id);
  }
  return out;
}

// Which FTI an item draws on, taken from the references it already carries. That array is the
// item -> publication mapping; there is no second table to keep in step with it.
export function ftiOf(item) {
  const works = new Set(
    (item.references || [])
      .map((r) => r.work)
      .filter((w) => /\bFTI\b/.test(w))
      .map((w) => w.replace(/\s*FTI\s*$/, '')),
  );
  return [...works];
}

// ---------------------------------------------------------------------------------------
// Heading rules

const ARTICLES = /^(the|a|an)\b/i;
const INTERROGATIVE = /^(when|what|why|how|where|if|who|whether|which)\b/i;
const PRONOUNS = /\b(it|its|they|them|their|these|those|one|ones)\b/i;
const SECOND_PERSON = /\b(you|your|yours)\b/i;

// -ing words that are ordinary nouns in this material rather than gerunds. A heading may open
// with one; what it may not do is take an object, which is the check below.
const NOUN_ING = new Set([
  'landing', 'lighting', 'timing', 'wing', 'planning', 'training', 'servicing',
  'running', 'outlying', 'working', 'arcing', 'holding', 'troubleshooting',
  'briefing', 'warning', 'heading', 'spacing', 'icing', 'crossing', 'ceiling',
  'bearing', 'clearing', 'everything',
]);

// What turns a noun into a gerund phrase: the word after it is an object or a particle, so the
// heading has become "doing something to something" rather than naming a subject.
const OBJECT_MARKER = new Set([
  'the', 'a', 'an', 'it', 'them', 'one', 'ones', 'its', 'their', 'this', 'that',
  'to', 'for', 'in', 'on', 'out', 'up', 'off', 'down', 'with', 'from', 'into',
  'and', 'or', 'before', 'after', 'away', 'ahead', 'about', 'over', 'under',
  'missed', 'through', 'at', 'by',
]);

// Capitalised mid-heading words that are proper nouns, roles or the publications' own
// notation ("6 Ts", "3 Cs") rather than Title Case creeping in.
const PROPER = new Set([
  'Wing', 'Lead', 'Post', 'Goliad', 'Corpus', 'Capstone',
  'Ts', 'Cs', 'Xs', 'Navy', 'Texan', 'Koch', 'Beatty', 'Whiting', 'Sherman',
]);

const STOPWORDS = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'to', 'in', 'for', 'on', 'at']);

const words = (t) => t.split(/\s+/).filter(Boolean);
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Publications that bind one squadron or one wing rather than the fleet. Material out of
// these carries its own section, headed with the publication's name, so a student at the
// other squadron can see which part of the page is theirs. Advisory, not an error: a page
// can be local end to end and say so in its lede, and the numbers on it are still right.
export const LOCAL_WORKS = new Set(['TW-4 SOP', 'VT-27 SOP', 'VT-28 SOP', 'TW-4 Formation Supplement']);

export function headingViolations(title, item, seen) {
  const out = [];
  const w = words(title);
  const first = w[0] || '';

  if (ARTICLES.test(title)) out.push('article');
  if (INTERROGATIVE.test(title)) out.push('interrogative');
  if (PRONOUNS.test(title)) out.push('pronoun');
  if (SECOND_PERSON.test(title)) out.push('second-person');
  if (title.includes('?')) out.push('question');
  if (w.length > 4) out.push(`${w.length}-words`);

  // Gerund. Flagged when the opening -ing word is not an established noun here, or when it is
  // one but has taken an object — "Planning" is a subject, "Planning the circle" is an act.
  if (/ing$/i.test(first)) {
    const nounish = NOUN_ING.has(first.toLowerCase());
    const takesObject = w[1] && OBJECT_MARKER.has(w[1].toLowerCase().replace(/[^a-z]/g, ''));
    if (!nounish || takesObject) out.push('gerund');
  }

  // Sentence case. Acronyms stay upper (ILS, HUD, FAF), including their plurals — VORs,
  // NOTAMs, PELs, the A-B-Cs — so a trailing lowercase s is stripped before the test.
  // A heading that is a local publication's name is spelled as `references[].work` spells it,
  // which the sop-section rule requires, so "TW-4 Formation Supplement" is not Title Case.
  for (const x of LOCAL_WORKS.has(title.trim()) ? [] : w.slice(1)) {
    const bare = x.replace(/[^A-Za-z]/g, '');
    if (!bare) continue;
    const stem = bare.replace(/s$/, '');
    if (stem && stem === stem.toUpperCase()) continue;
    if (/^[A-Z]/.test(bare) && !PROPER.has(bare)) {
      out.push(`title-case:${bare}`);
      break;
    }
  }

  // Restates the page title: the heading picks up every significant word of the title and
  // adds at most one of its own. A heading that covers only part of the title is naming a
  // subtype and is doing real work — "Runway lighting" under *Airfield and runway lighting*,
  // "VOR/DME intersections" under *Intersections* — so it passes. "Trim requirements" under
  // *Trim* does not.
  const nt = norm(item.title);
  const nh = norm(title);
  const sig = (s) => s.split(' ').filter((x) => x && !STOPWORDS.has(x));
  const titleSig = sig(nt);
  const headingWords = nh.split(' ').filter(Boolean);
  const coversTitle = titleSig.length > 0 && titleSig.every((x) => headingWords.includes(x));
  const headingSig = sig(nh);
  const extra = headingSig.filter((x) => !titleSig.includes(x));
  // A word in front of the title narrows it to a subtype and is doing real work — "Incipient
  // spin" under *Spin*, "Post-stall gyration" under *Out-of-control flight*. A word after it
  // is filler that restates the title with a noun bolted on: "Trim requirements" under *Trim*.
  // Position is what separates them, and a one-word page title makes every subtype heading
  // look like a restatement without it.
  const trailing = extra.length === 1
    && headingSig.indexOf(extra[0]) > headingSig.findIndex((x) => titleSig.includes(x));
  if (coversTitle && (extra.length === 0 || trailing)) out.push('restates-title');

  if (seen.has(nh)) out.push('duplicate');
  seen.add(nh);

  return out;
}

// ---------------------------------------------------------------------------------------
// Prose rules
//
// WHY THESE ARE HERE. An item page is a compilation of source text, so the sentences a person
// writes are the ones no publication supports — see "Sourcing and prose" in CLAUDE.md. Most of
// that judgement cannot be mechanised, but the constructions it bans leave fingerprints, and
// the fingerprints are cheap to look for. Every one of them is advisory, the em dash included:
// they are house style, and a page can break all of them and still be sourced, or pass all of
// them and be invented. What is checked hard is whether a block has a source at all — see
// sourcingViolations() below.

const EM_DASH = /—/;

// Editorial framing. The writer is telling the reader how to weigh the material instead of
// stating it, which by construction is a claim no publication makes.
const FRAMING = [
  /\bthe point is\b/i, /\bwhat matters\b/i, /\bthe key is\b/i, /\bthe whole (point|basis|idea)\b/i,
  /\bultimately\b/i, /\bin practice\b/i, /\bnote that\b/i, /\bkeep in mind\b/i,
  /\bit is important to\b/i, /\bworth (knowing|carrying|noting)\b/i, /\bwhich is why\b/i,
  /\bthat is the\b/i, /\bthe thing to\b/i,
];

// X-not-Y antithesis. Two shapes: a negated clause answered by an affirmative one, and a
// trailing "…, not …" tacked onto a finished sentence.
const ANTITHESIS = [
  /\bis not\b[^.;]{0,70}\bit is\b/i,
  /\bnot\b[^.;]{0,40}\bbut\b[^.;]{0,40}\brather\b/i,
  /,\s*not\s+(a|an|the|to|because|something|what|how|why|by)\b/i,
];

// Colloquial verbs standing in for the publication's own. The source says "intercept",
// "maintain", "apply"; these are what a person reaches for when paraphrasing.
// "chase aircraft" is the publication's own noun, so it is excluded rather than reported
// every time a controlled ejection is discussed.
const COLLOQUIAL = /\b(chase(?!\s+(aircraft|plane|ship))|chases|chasing|grab|grabs|grabbing|fight|fights|fighting|ride|rides|riding|settle|settles|settling|creep|creeps|creeping)\b/i;

// Personification. The aircraft, its controls and the forces on it do not have intentions.
const AGENTS = '(aircraft|airplane|jet|engine|propeller|prop|pmu|seat|controls?|stick|rudder|nose|wing|gear|flaps?)';
const PERSONIFIED = new RegExp(`\\b${AGENTS}\\s+(\\w+\\s+){0,2}(decides?|wants?|tries|trying|knows?|refuses?|thinks?|likes?|prefers?|remembers?|forgets?)\\b`, 'i');

// Verbless fragments used for emphasis. Narrow on purpose: a short sentence carrying no
// finite verb at all. Anything longer is a judgement call the linter would get wrong. Read
// over paragraph prose only: a Numbers label is a noun phrase by design, and a list element
// is usually the publication's own imperative ("Maintain proper position"), which the
// register rule says to reproduce rather than pad into a sentence.
const FINITE = /\b(is|are|was|were|be|been|being|has|have|had|does|do|did|will|would|can|could|may|might|must|shall|should|comes?|goes?|gets?|makes?|means?|gives?|takes?|gains?|gain|gives|gets|gives)\b/i;
// A word that may be the sentence's verb. Plural nouns end in -s too, so an -s word that is
// the first word, or the last word straight after a count or determiner, is taken as the noun
// it almost always is. Without that, "Two decisions." and "Three steps." pass as sentences.
// Only the last word: in "Four constraints go with it" the verb is the word after the noun.
const VERBISH = /\w+(s|ed|ing)$/i;
const COUNT_OR_DET = /^(the|a|an|two|three|four|five|six|seven|eight|nine|ten|\d+|some|many|all|both|several|these|those|no)$/i;

function hasVerbish(w) {
  return w.some((x, i) => {
    if (!VERBISH.test(x)) return false;
    if (!/s$/i.test(x)) return true;
    if (i === 0) return false;
    return !(i === w.length - 1 && COUNT_OR_DET.test(w[i - 1]));
  });
}

function fragments(text) {
  // A period inside a number (0.75) or an abbreviation (In.Hg, 3-52.1) is not a sentence
  // boundary, and neither is a colon inside a time (10:30). Mask those before splitting, or
  // every decimal on the page reads as a fragment.
  const masked = text.replace(/(\w)[.:](?=\w)/g, '$1');
  // A colon ends a fragment too: a one- or two-word lead-in ("Worked:", "Two decisions:") is a
  // label standing in for a sentence, and splitting only on . and ; folded it into whatever
  // followed.
  return (masked.match(/[^.;:]+[.;:]/g) || [])
    .map((s) => ({ colon: s.endsWith(':'), s: s.replace(/[.;:]$/, '').trim() }))
    .filter(({ colon, s }) => {
      const w = words(s);
      if (colon ? w.length > 2 : (w.length < 2 || w.length > 6)) return false;
      if (!w.length || FINITE.test(s)) return false;
      // A lone word before a colon is a label whatever its ending: "Worked:" is not a clause.
      if (colon && w.length === 1) return true;
      // A pronoun opening the sentence is its subject, and the base-form verb after it
      // ("They combine:") carries no ending to find.
      if (/^(i|we|you|he|she|it|they)$/i.test(w[0])) return false;
      return !hasVerbish(w);
    })
    .map(({ colon, s }) => (colon ? `${s}:` : s));
}

// Every prose rule over every rendered string on the page. One report per rule per string, so
// a paragraph with three em dashes is one line and not three.
export function proseViolations(item) {
  const out = [];
  for (const { kind, where, text } of textsOf(item)) {
    if (EM_DASH.test(text)) out.push(['info', 'em-dash', where]);
    const framing = FRAMING.find((re) => re.test(text));
    if (framing) out.push(['info', 'editorial-framing', `${where}: ${text.match(framing)[0]}`]);
    const anti = ANTITHESIS.find((re) => re.test(text));
    if (anti) out.push(['info', 'antithesis', `${where}: ${text.match(anti)[0].slice(0, 48)}`]);
    const colloquial = text.match(COLLOQUIAL);
    if (colloquial) out.push(['info', 'colloquial-verb', `${where}: ${colloquial[0]}`]);
    const person = text.match(PERSONIFIED);
    if (person) out.push(['info', 'personification', `${where}: ${person[0]}`]);
    const frag = kind === 'prose' && fragments(text)[0];
    if (frag) out.push(['info', 'verbless-fragment', `${where}: ${frag}`]);
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// Structural rules

// Canonical running order. Headings outside this list are domain-specific and carry no rank,
// so they sit wherever the page needs them; the ranked ones must not cross each other.
// Recognition sits ahead of Recovery: you notice the spin before you recover from it, and
// that is the order NATOPS and the FTIs state them in.
const ORDER = [
  'definition', 'purpose', 'applicability', 'aerodynamics', 'causes', 'parameters',
  'indications', 'recognition', 'entry', 'procedure', 'technique',
  'recovery', 'recovery criteria', 'limitations', 'variations', 'common errors',
];
const rankOf = (title) => ORDER.indexOf(norm(title));

const wordsIn = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;

// A count word followed by the kind of thing being counted. "Seven elements", "four ways",
// "two separate reasons" — the passage is about to enumerate, and the enumeration is what
// the reader wants to scan.
const COUNTED = /\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(\w+\s+){0,2}(elements|kinds|types|things|items|steps|ways|methods|parts|categories|classes|phases|rules|criteria|indications|errors|sources|reasons|options|cases)\b/i;

// Headings that name a set of named things rather than a single subject. The members are
// what the reader is looking for, so each wants its own heading.
const SET_TITLE = /^(categories|types|kinds|classes|components|phases|stages|parts|methods|techniques|variations|modes|options|elements|configurations|the three|sources)\b/i;

// Advisory checks on one prose block — a section or a subsection, since either can carry
// paragraphs. Both are reported, never failed: each needs a person to say which fix applies.
function proseAdvice(block, where) {
  const out = [];
  const paras = block.paras || [];
  if (!paras.length || (block.items || []).length) return out;
  const w = paras.reduce((n, p) => n + wordsIn(p.text), 0);

  // COMPRESSED LIST. Prose that announces a count and then runs the series inline. The set is
  // the content and it is being scanned, not read, so it wants to be a list — the seven
  // elements of a clearance were a sentence until the middle five were numbered and bolded.
  if (paras.length <= 2 && w <= 90
      && paras.some((p) => COUNTED.test(p.text)
        && (p.text.includes(':') || (p.text.match(/,/g) || []).length >= 3))) {
    out.push(['info', 'compressed-list', where]);
  }

  // IMPLIED SUBSECTIONS. A heading that names a set of named things — Categories, Phases,
  // Variations — followed by several paragraphs is one paragraph per member, and the members
  // have no headings. Out-of-control flight was the case: three paragraphs under Categories,
  // and a reader after the incipient spin had to read two of them to reach it. Promote each
  // member to a subsection and it is in the contents rail instead.
  if (SET_TITLE.test(block.title || '') && paras.length >= 2 && !(block.subsections || []).length) {
    out.push(['info', 'implied-subsections', `${where}, ${paras.length} paragraphs`]);
  }

  return out;
}

// UNSOURCED BLOCK. Every paragraph, list element, table and figure traces to a publication, or
// it carries `unsourced: '<why this exists without one>'` and a person has argued for it. This
// is the rule behind "Sourcing and prose": a page is compiled from the publications, so a block
// no publication supports is by default a sentence someone composed. crosswind-computations
// passed every prose check with a lede, a whole section and a citation none of its sources
// made, because each of those read as ordinary prose. No regex can see an invented sentence;
// a missing source is visible every time.
//
// Coverage runs downward the way ItemPage renders it: a section's `refs` cover its subsections,
// a subsection's cover its blocks, a list element's cover its sub-elements. `unsourced` on any
// of those levels covers the same span, so a local-knowledge section is justified once rather
// than on every paragraph. The lede and the Numbers rows are not blocks and are not checked.
//
// The justification is data only. Nothing renders it; it is for the next person to decide
// whether the argument still holds.
const MIN_JUSTIFICATION_WORDS = 10;

export function sourcingViolations(item) {
  const out = [];
  if (item.stub || item.generated) return out;
  const cited = (x) => Array.isArray(x.refs) && x.refs.length > 0;
  const justified = (x) => typeof x.unsourced === 'string' && x.unsourced.trim() !== '';
  const thin = (x, where) => {
    if (justified(x) && wordsIn(x.unsourced) < MIN_JUSTIFICATION_WORDS) {
      out.push(['error', 'thin-justification', `${where}: ${wordsIn(x.unsourced)} words`]);
    }
  };

  const block = (b, where, coveredAbove) => {
    thin(b, where);
    const covered = coveredAbove || cited(b) || justified(b);
    const bare = [];
    const leaf = (x, label) => {
      thin(x, `${where} / ${label}`);
      if (!covered && !cited(x) && !justified(x)) bare.push(label);
    };
    for (const p of b.paras || []) leaf(p, p.id);
    for (const f of b.figures || []) leaf(f, `fig:${f.id}`);
    for (const t of b.tables || []) leaf(t, `tbl:${t.id}`);
    const walk = (list, above) => {
      for (const x of list || []) {
        thin(x, `${where} / ${x.id}`);
        const here = above || cited(x) || justified(x);
        if (!here) bare.push(x.id);
        walk(x.sub, here);
      }
    };
    walk(b.items, covered);
    if (bare.length) out.push(['error', 'unsourced-block', `${where}: ${bare.join(', ')}`]);
    return covered;
  };

  for (const s of item.sections || []) {
    const covered = block(s, s.title, false);
    for (const sub of s.subsections || []) block(sub, `${s.title} / ${sub.title}`, covered);
  }
  return out;
}

// The works a block cites, resolved through the page's reference list. A block with no refs
// of its own inherits its section's, the same collapse ItemPage does.
function worksCited(block, item, inherited) {
  const byN = new Map((item.references || []).map((r) => [r.n, r.work]));
  const ns = new Set();
  const add = (refs) => (refs || []).forEach((n) => ns.add(n));
  const own = (block.refs && block.refs.length) ? block.refs : inherited;
  add(own);
  for (const p of block.paras || []) add(p.refs);
  for (const li of block.items || []) add(li.refs);
  for (const f of block.figures || []) add(f.refs);
  for (const t of block.tables || []) add(t.refs);
  return [...ns].map((n) => byN.get(n)).filter(Boolean);
}

// SOP SECTION. A section sourced wholly to one squadron or wing publication and not headed
// with that publication's name. Nothing on the rendered page then says the rule is local,
// and the reference marker at the end of the section is the only clue.
function sopAdvice(block, item, where, inherited, parentTitle) {
  const works = worksCited(block, item, inherited);
  if (!works.length || !works.every((w) => LOCAL_WORKS.has(w))) return [];
  const only = [...new Set(works)];
  if (only.length !== 1) return [];
  if ((block.title || '').trim() === only[0]) return [];
  // A topical subsection under a section already headed for the publication is the shape the
  // rule asks for on a page that is local throughout, so it is not flagged again here.
  if ((parentTitle || '').trim() === only[0]) return [];
  return [['info', 'sop-section', `${where}, ${only[0]} only`]];
}

export function structureViolations(item) {
  const out = [];
  const sections = item.sections || [];
  if (item.stub || item.generated || !sections.length) return out;

  // Every heading on the page in reading order, H2s and H3s alike. Procedure and Common
  // errors are just as present as subsections — crosswind-takeoff-and-landings carries both
  // under Landing, because §609 publishes them for the landing and not for the takeoff —
  // and a check that only read the H2s would report that page as missing them both.
  const all = [];
  for (const s of sections) {
    all.push(s);
    for (const sub of s.subsections || []) all.push(sub);
  }
  const titles = all.map((s) => norm(s.title));
  const proc = all.find((s) => norm(s.title) === 'procedure');
  const ce = all.findIndex((s) => norm(s.title) === 'common errors');
  const ftis = ftiOf(item);

  // A Procedure that is a list must be an ordered one — the sequence is the content. A
  // Procedure written as prose (the I FTI states several that way) is left alone.
  if (proc && (proc.items || []).length && !proc.numbered && !proc.ep) {
    out.push(['error', 'procedure-not-numbered', 'Procedure']);
  }

  if (ce !== -1 && ce !== all.length - 1) {
    out.push(['error', 'common-errors-not-last', all[all.length - 1].title]);
  }

  // Ranked headings must not cross. Reported once, naming the pair.
  let lastRank = -1;
  let lastTitle = null;
  for (const s of sections) {
    const r = rankOf(s.title);
    if (r === -1) continue;
    if (r < lastRank) {
      out.push(['error', 'order', `${s.title} after ${lastTitle}`]);
      break;
    }
    lastRank = r;
    lastTitle = s.title;
  }

  // Advisory. The linter cannot know whether this item's FTI section actually publishes a
  // Procedure or a Common Errors block — the VNAV FTI publishes neither anywhere — so a
  // missing one is reported and does not fail the run unless --strict is passed.
  if (ftis.length && !titles.includes('procedure')) {
    out.push(['info', 'no-procedure', ftis.join('+')]);
  }
  if (item.maneuver && !titles.includes('common errors')) {
    out.push(['info', 'no-common-errors', ftis.join('+') || 'no FTI cited']);
  }

  for (const s of sections) {
    out.push(...proseAdvice(s, s.title));
    out.push(...sopAdvice(s, item, s.title, null));
    for (const sub of s.subsections || []) {
      out.push(...proseAdvice(sub, `${s.title} / ${sub.title}`));
      out.push(...sopAdvice(sub, item, `${s.title} / ${sub.title}`, s.refs, s.title));
    }
  }

  out.push(...sourcingViolations(item));
  out.push(...tableViolations(item));
  out.push(...retiredContent(item));
  out.push(...ledeRepeated(item));
  out.push(...natopsCitations(item));

  return out;
}

// A ragged table row is the one defect in this data shape that is invisible on the page and
// wrong in the DOM: React renders the short row, the columns silently shift, and nothing
// about the rendered page says which cell went missing. Checked here rather than trusted.
export function tableViolations(item) {
  const out = [];
  const seen = new Set();
  const check = (block, where) => {
    for (const t of block.tables || []) {
      const at = `${where} / ${t.id}`;
      if (seen.has(t.id)) out.push(['error', 'table-duplicate-id', at]);
      seen.add(t.id);
      if (!t.caption) out.push(['error', 'table-no-caption', at]);
      const cols = (t.cols || []).length;
      if (cols < 2) {
        out.push(['error', 'table-too-few-columns', at]);
        continue;
      }
      // Two columns of parallel facts is a list wearing a border. A table earns itself by
      // having two axes or by being scanned under time pressure, so a two-column one is
      // reported for adjudication rather than failed — max holding speeds is two columns
      // and is correct as a table. The floor is two rows rather than three: three rows is
      // where a lookup starts (alternate filing minimums has exactly three and is read one
      // row at a time), while two is a sentence with a rule drawn through it.
      if (cols === 2 && (t.rows || []).length <= 2) {
        out.push(['info', 'table-could-be-a-list', `${at}, ${cols}x${(t.rows || []).length}`]);
      }
      (t.rows || []).forEach((row, i) => {
        if (row.length !== cols) {
          out.push(['error', 'table-ragged-row', `${at}, row ${i + 1} has ${row.length} of ${cols}`]);
        }
      });
      if (!(t.rows || []).length) out.push(['error', 'table-no-rows', at]);
    }
  };
  for (const s of item.sections || []) {
    check(s, s.title);
    for (const sub of s.subsections || []) check(sub, `${s.title} / ${sub.title}`);
  }
  return out;
}

// Material the site owner has ruled off the pages. Each entry was cut on purpose and then put
// back by a later rewrite that found it in a publication and took its presence there as
// licence, which is why it is an error rather than advice: finding it in the 3710 or an old
// FTI edition is how it came back. Add to this list whenever a removal is a decision rather
// than a tidy-up, with the reason, so the next writer meets the reason before the source.
export const RETIRED = [
  {
    // Narrow on purpose: WAAS as a satellite system is ordinary AIM material (NOTAM categories
    // name it), so the rule fires on the receiver classes and planning allowances, not the word.
    pattern: /\bTSO-C1(29|45|46|96)\b|\bnon-WAAS\b|\bWAAS (GPS )?receivers?\b|\bLPV[- ]capable\b/i,
    why: 'the 3710 GPS receiver allowances are fleet material; students plan GPS at the alternate to the I FTI §1001 rule alone',
  },
  {
    pattern: /\binverse[- ]C\b/i,
    why: 'the inverse C circling icon was removed from charts in August 2025; the six-row radii table by category and circling MDA is the only current one',
  },
];

// Every rendered string plus the table cells and alt text textsOf leaves out, since a retired
// rule can sit in a table as easily as in a paragraph.
export function retiredContent(item) {
  const out = [];
  const strings = textsOf(item).map(({ where, text }) => ({ where, text }));
  const extra = (b, prefix) => {
    for (const t of b.tables || []) {
      (t.rows || []).forEach((row, i) => row.forEach((cell) => strings.push({ where: `${prefix}/tbl:${t.id} row ${i + 1}`, text: String(cell) })));
    }
    for (const f of b.figures || []) {
      strings.push({ where: `${prefix}/fig:${f.id} alt`, text: f.alt || '' });
      for (const img of f.images || []) strings.push({ where: `${prefix}/fig:${f.id} alt`, text: img.alt || '' });
    }
  };
  for (const s of item.sections || []) {
    extra(s, s.id);
    for (const sub of s.subsections || []) extra(sub, sub.id);
  }
  for (const { where, text } of strings) {
    for (const r of RETIRED) {
      const m = text.match(r.pattern);
      if (m) out.push(['error', 'retired-content', `${where}: "${m[0]}" (${r.why})`]);
    }
  }
  return out;
}

// LEDE REPEATED. The lede summarizes the page; a sentence of it copied word for word into a
// section says the same thing twice in one screen. Sentences split at a period or semicolon
// (a period inside a number or an abbreviation is not a boundary), are compared case- and
// whitespace-insensitively, and ones under six words are ignored, since a short sentence
// recurring is as likely to be a checklist phrase as a copy.
const LEDE_MIN_WORDS = 6;
const plain = (t) => t.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export function ledeRepeated(item) {
  if (!item.lede) return [];
  const sentences = (item.lede.match(/(?:[^.;]|\.(?=\w))+/g) || [])
    .map(plain)
    .filter((x) => words(x).length >= LEDE_MIN_WORDS);
  const out = [];
  for (const { kind, where, text } of textsOf(item)) {
    if (where === 'lede' || kind === 'label') continue;
    const body = plain(text);
    const hit = sentences.find((x) => body.includes(x));
    if (hit) out.push(['info', 'lede-repeated', `${where}: "${hit.slice(0, 60)}"`]);
  }
  return out;
}

// NATOPS CITATION. NATOPS numbers its chapters but not its sections, so a reference names the
// chapter, the section as printed and the section's first page: `Ch. 3 — Engine Failure`.
export function natopsCitations(item) {
  return (item.references || [])
    .filter((r) => r.work === 'NATOPS' && !/^Ch\. [A-Z]?\d+(-\d+)? — \S/.test(r.loc || ''))
    .map((r) => ['info', 'natops-citation', `ref ${r.n}: ${r.loc}`]);
}

// ---------------------------------------------------------------------------------------
// The whole set at once, for a caller that wants one answer rather than the pieces.
//
// Returns every finding as `{ level, rule, detail }`, with heading findings folded in as
// `rule: 'heading'`. Levels are `error` and `info`; the caller decides what blocks.
export function lintItem(item) {
  const out = [];
  const seen = new Set();
  for (const h of headingsOf(item)) {
    const v = headingViolations(h.title, item, seen);
    if (v.length) {
      out.push({
        level: 'error',
        rule: 'heading',
        detail: `${h.level === 3 ? 'sub-heading' : 'heading'} '${h.title}' [${v.join(', ')}]`,
      });
    }
  }
  for (const [level, rule, detail] of [...proseViolations(item), ...structureViolations(item)]) {
    out.push({ level, rule, detail });
  }
  return out;
}

export default lintItem;
