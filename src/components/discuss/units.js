// Whose section is it. A Primary page carries the wing and squadron rules of both training
// wings, one section per publication, titled with the publication's name (`VT-28 SOP`,
// `TW-5 SOP`). A reader who has said which squadron they fly with gets the other units'
// sections folded, so the page reads as theirs. Pure data and functions, no JSX.

// The Primary squadrons, in the order the picker lists them: wing by wing.
export const SQUADRONS = [
  { id: 'VT-27', wing: 'TW-4' },
  { id: 'VT-28', wing: 'TW-4' },
  { id: 'VT-2', wing: 'TW-5' },
  { id: 'VT-3', wing: 'TW-5' },
  { id: 'VT-6', wing: 'TW-5' },
];

// The wing's own publications. A squadron's are named for it (`VT-2 Formation Supplement`).
const WING_WORKS = {
  'TW-4 SOP': 'TW-4',
  'TW-4 Formation Supplement': 'TW-4',
  'TW-4 Briefing Guide': 'TW-4',
  'TW-5 SOP': 'TW-5',
};

const BY_ID = new Map(SQUADRONS.map((q) => [q.id, q]));

// -> { wing, squadron } for a squadron's section, { wing, squadron: null } for a wing's, or
// null for a section that belongs to everyone.
export function ownerOf(title) {
  const t = (title || '').trim();
  if (WING_WORKS[t]) return { wing: WING_WORKS[t], squadron: null };
  const m = /^(VT-\d+)\s/.exec(t);
  const q = m && BY_ID.get(m[1]);
  return q ? { wing: q.wing, squadron: q.id } : null;
}

// Whether a section is another unit's for a reader at `squadron`. Nothing is another unit's
// until the reader has picked one; their own wing's sections are theirs too.
export function isOthers(title, squadron) {
  const q = BY_ID.get(squadron);
  const o = ownerOf(title);
  if (!q || !o) return false;
  return o.squadron ? o.squadron !== q.id : o.wing !== q.wing;
}

// Whether a page has local sections from more than one unit, which is when a picker helps.
export function hasSeveralUnits(sections) {
  const owners = new Set();
  for (const s of sections || []) {
    const o = ownerOf(s.title);
    if (o) owners.add(o.squadron || o.wing);
  }
  return owners.size > 1;
}

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
