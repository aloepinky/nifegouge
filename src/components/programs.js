// The programs the site covers: what the top-left dropdown offers, and the same list wherever
// else a school is chosen. A brief, a page or a jet log names its school in its own words, so
// this is what keeps those words to the ones the navigation already knows — a brief filed
// under a school with no tab is a brief nobody can reach.

// Work that is built but not ready for readers. `DRAFT` is true on a dev server and false in
// a production build, so a half-finished tab is reachable while it is being written and simply
// is not there on the live site — the same idea as STYLE_GUIDE_DRAFT in discuss/SyllabusContext.js.
//
// It gates the NAVIGATION and the ROUTES, not the data: `programOf` and `isSchool` still answer
// for a draft program, so a brief or a page already tagged `Advanced` stays correctly filed and
// is not orphaned by being hidden. Take something live by deleting its `draft` flag.
export const DRAFT = process.env.NODE_ENV !== 'production';

// `briefs` and `discuss` say the program has that tab. The brief upload's School box offers only
// those, because a brief filed under a school with no tab is a brief nobody can reach. Set it
// on Advanced when the T-44C briefing guide goes up.
//
// `draft` hides the program from the navigation and unroutes it on the live site.
// `discuss: 'draft'` does the same for that one tab of an otherwise live program.
export const PROGRAMS = [
  { id: 'nife', label: 'NIFE', aircraft: 'C172', home: '/nife/about', base: '/nife', briefs: true, discuss: 'draft' },
  { id: 'tw4', label: 'Primary', aircraft: 'T-6B', home: '/tw4/about', base: '/tw4', briefs: true, discuss: true },
  { id: 't44c', label: 'Advanced', aircraft: 'T-44C', home: '/t44c/eps-limits', base: '/t44c', draft: true },
];

// Whether a thing flagged `true`, `'draft'` or falsy is shown here. A draft is shown on a dev
// server and hidden in a production build.
export const shown = (flag) => (flag === 'draft' ? DRAFT : !!flag);

// The programs the navigation offers: everything but a draft one on the live site.
export const navPrograms = () => PROGRAMS.filter((p) => !p.draft || DRAFT);

export const programName = (p) => `${p.label} - ${p.aircraft}`;

const norm = (text) => (text || '').trim().toLowerCase();

// The program a school's name belongs to, however it was typed.
export const programOf = (school) => PROGRAMS.find((p) => norm(p.label) === norm(school)) || null;

// Whether a brief, page or document belongs to this school. A document always carries one —
// the server refuses one without — so an unnamed school matches nothing rather than everything.
export const isSchool = (doc, school) => norm(doc && doc.school) === norm(school);

// A school's name as it appears in a stored key. A discuss page is identified by (school, slug),
// because NIFE and Primary both brief a turn pattern and they are different pages; the stored
// key is `<schoolNs>/<slug>`. Kept here because this is the module that owns what a school is.
// lambda/discussApi/namespace.mjs has the same three lines — the server cannot import from src,
// and the rule is small enough that a copy is cheaper than a build step. Change both together.
export const schoolNs = (school) => norm(school).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
