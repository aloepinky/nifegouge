// Whose section is it. A page carries the wing and squadron rules of every unit that flies the
// course, each in a section of its own, and the writer marks such a section with the unit it
// belongs to (`section.unit`, set in the section editor). A reader who has said which squadron
// they fly with gets the other units' sections folded, so the page reads as theirs.
//
// The mark is the writer's call. The publications a section cites and its heading are only
// grounds for an advisory (`suggestUnit`), never for folding: a section can cite one squadron's
// SOP and still say something everyone needs. Pure data and functions, no JSX.

// Every unit a section can be marked for, wings first, then squadrons wing by wing. `school`
// limits a squadron to the program it trains; a wing serves every program it hosts.
export const UNITS = [
  { id: 'TW-4', wing: 'TW-4' },
  { id: 'TW-5', wing: 'TW-5' },
  { id: 'VT-27', wing: 'TW-4', school: 'Primary' },
  { id: 'VT-28', wing: 'TW-4', school: 'Primary' },
  { id: 'VT-2', wing: 'TW-5', school: 'Primary' },
  { id: 'VT-3', wing: 'TW-5', school: 'Primary' },
  { id: 'VT-6', wing: 'TW-5', school: 'Primary' },
  { id: 'VT-31', wing: 'TW-4', school: 'Advanced' },
  { id: 'VT-35', wing: 'TW-4', school: 'Advanced' },
];

const BY_ID = new Map(UNITS.map((u) => [u.id, u]));
const isWing = (u) => u.id === u.wing;

// The units a writer can pick on a page of this school, and the squadrons a reader can.
export const unitsFor = (school) => UNITS.filter((u) => !u.school || u.school === school);
export const squadronsFor = (school) => unitsFor(school).filter((u) => !isWing(u));

// A marked section's unit, or null for a section that belongs to everyone (or carries a mark
// this list no longer knows).
export const unitOf = (section) => (section && BY_ID.get(section.unit)) || null;

// Whether a section is another unit's for a reader at `squadron`. Nothing is another unit's
// until the reader has picked one; their own wing's sections are theirs too.
export function isOthers(section, squadron) {
  const q = BY_ID.get(squadron);
  const u = unitOf(section);
  if (!q || !u) return false;
  return isWing(u) ? u.wing !== q.wing : u.id !== q.id;
}

// Whether a page has marked sections from more than one unit, which is when a picker helps.
export function hasSeveralUnits(sections) {
  return new Set((sections || []).map(unitOf).filter(Boolean).map((u) => u.id)).size > 1;
}

// --- advisories --------------------------------------------------------------------------

// The publications that bind one wing or one squadron. A squadron's are named for it.
const WING_WORKS = {
  'TW-4 SOP': 'TW-4',
  'TW-4 Formation Supplement': 'TW-4',
  'TW-4 Briefing Guide': 'TW-4',
  'Course Rules Manual': 'TW-4',
  'KNGP IFG': 'TW-4',
  'TW-5 SOP': 'TW-5',
};

// The unit a publication belongs to, or null for one that binds everybody.
export function unitOfWork(work) {
  const w = (work || '').trim();
  if (WING_WORKS[w]) return WING_WORKS[w];
  const m = /^(VT-\d+)\s/.exec(w);
  return m && BY_ID.has(m[1]) ? m[1] : null;
}

// The unit a heading names: a publication's name, or a squadron's at its start.
export function unitOfHeading(title) {
  const t = (title || '').trim();
  return WING_WORKS[t] || unitOfWork(`${t} `);
}

// Every reference a section cites, its subsections and its blocks included.
function citedWorks(section, references) {
  const byN = new Map((references || []).map((r) => [r.n, r.work]));
  const ns = new Set();
  const walk = (b) => {
    if (!b || typeof b !== 'object') return;
    if (Array.isArray(b)) { b.forEach(walk); return; }
    (b.refs || []).forEach((n) => ns.add(n));
    for (const [k, v] of Object.entries(b)) if (k !== 'refs' && typeof v === 'object') walk(v);
  };
  walk(section);
  return [...ns].map((n) => byN.get(n)).filter(Boolean);
}

// For an unmarked section that looks like one unit's: { unit, why } with why 'sources' (every
// publication it cites is that unit's) or 'heading'. Null when it looks like everyone's.
export function suggestUnit(section, references) {
  const works = citedWorks(section, references);
  const owners = new Set(works.map(unitOfWork));
  if (works.length && owners.size === 1 && !owners.has(null)) return { unit: [...owners][0], why: 'sources' };
  const h = unitOfHeading(section.title);
  return h ? { unit: h, why: 'heading' } : null;
}

// --- the reader's choice -----------------------------------------------------------------

export const SQUADRON_KEY = 'discussSquadron';

export function readSquadron() {
  try {
    const v = window.localStorage.getItem(SQUADRON_KEY);
    return BY_ID.has(v) ? v : '';
  } catch (e) {
    return '';
  }
}

export function writeSquadron(v) {
  try {
    if (v) window.localStorage.setItem(SQUADRON_KEY, v);
    else window.localStorage.removeItem(SQUADRON_KEY);
  } catch (e) {
    // Private windows refuse storage; the choice then lasts the visit.
  }
}
