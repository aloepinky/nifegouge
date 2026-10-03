// The programs the site covers: what the top-left dropdown offers, and the same list wherever
// else a school is chosen. A brief, a page or a jet log names its school in its own words, so
// this is what keeps those words to the ones the navigation already knows — a brief filed
// under a school with no tab is a brief nobody can reach.

// Work that is built but not ready for readers. `DRAFT` is true on a dev server and false in
// a production build, so a half-finished tab is reachable while it is being written and simply
// is not there on the live site.
//
// It gates the NAVIGATION and the ROUTES, not the data: `programOf` and `isSchool` still answer
// for a draft program, so a brief or a page already tagged `Advanced` stays correctly filed and
// is not orphaned by being hidden. Take something live by deleting its `draft` flag.
export const DRAFT = process.env.NODE_ENV !== 'production';

// `briefs` and `discuss` say the program has that tab. The brief upload's School box offers only
// those, because a brief filed under a school with no tab is a brief nobody can reach.
//
// `draft` hides the program from the navigation and unroutes it on the live site.
// `unlisted` hides it from the navigation on the live site but leaves its pages there, so a link
// to one works for whoever is sent it and nobody else finds it. A dev server lists it.
// `discuss: 'draft'` / `briefs: 'draft'` do the same for that one tab of an otherwise live
// program — read them through `shown()`, since `'draft'` is truthy.
export const PROGRAMS = [
  { id: 'nife', label: 'NIFE', aircraft: 'C172', home: '/nife/about', base: '/nife', briefs: true, discuss: true },
  { id: 'tw4', label: 'Primary', aircraft: 'T-6B', home: '/primary/about', base: '/primary', briefs: true, discuss: true },
  { id: 't44c', label: 'Advanced', aircraft: 'T-44C', home: '/t44c/about', base: '/t44c', briefs: true, discuss: true },
  // Unlisted while it is tested: its pages answer on the live site, but nothing links to them.
  // Take it live by deleting `unlisted`. Named Advanced in the menu, but a school of its own:
  // its briefs carry `school`, not the T-44C's word, so neither tab shows the other's.
  { id: 't54a', label: 'Advanced', school: 'T-54A', aircraft: 'T-54A', home: '/t54a/about', base: '/t54a', unlisted: true, briefs: true, discuss: 'draft' },
];

// Whether a thing flagged `true`, `'draft'` or falsy is shown here. A draft is shown on a dev
// server and hidden in a production build.
export const shown = (flag) => (flag === 'draft' ? DRAFT : !!flag);

// The programs the navigation offers: everything but a draft or unlisted one on the live site.
export const navPrograms = () => PROGRAMS.filter((p) => !(p.draft || p.unlisted) || DRAFT);

// Whether a program is listed here: on the program menu and the landing page.
export const listed = (p) => !!p && (!(p.draft || p.unlisted) || DRAFT);

// The program a path is under, if its pages are served here: an unlisted one is, a draft one
// on the live site is not.
export const programAt = (pathname) => PROGRAMS.find((p) => (pathname === p.base || pathname.startsWith(`${p.base}/`)) && (!p.draft || DRAFT)) || null;

// Addresses a program has moved from, oldest first: Primary was /tw4 until 2026-10-02. A link
// stored before the move (an event row's `href` on the server, a bookmark) is read through
// `currentPath`, and App.js redirects the old address itself.
const MOVED = [['/tw4', '/primary']];
export const currentPath = (path) => {
  const s = String(path || '');
  const hit = MOVED.find(([from]) => s === from || s.startsWith(`${from}/`) || s.startsWith(`${from}?`) || s.startsWith(`${from}#`));
  return hit ? hit[1] + s.slice(hit[0].length) : s;
};

export const programName = (p) => `${p.label} - ${p.aircraft}`;


// The pages each program has, in the order they are offered. This is the one list: the top
// bar's page menu renders it, and an About page's index is built from it (about/tabs.js), so
// the two can never disagree about what a program has or what order it comes in.
//
// A tab marked `draft` is shown on a dev server and left out of a production build, the way a
// draft program is. The page it points at is unrouted there too.
export const PROGRAM_TABS = {
  nife: [
    { to: '/nife/about', label: 'About' },
    { to: '/nife/questions', label: 'Questions' },
    { to: '/nife/nav', label: 'Problem Generator' },
    { to: '/nife/docs', label: 'Docs' },
    { to: '/nife/eps-limits', label: 'EPs/Limits' },
    { to: '/nife/discuss', label: 'Discussion Items' },
    { to: '/nife/briefs', label: 'Briefs/TOLD' },
  ],
  tw4: [
    { to: '/primary/about', label: 'About' },
    { to: '/primary/eps-limits', label: 'EPs/Limits' },
    { to: '/primary/docs', label: 'Docs' },
    { to: '/primary/discuss', label: 'Discussion Items' },
    { to: '/primary/briefs', label: 'Briefs/TOLD' },
    { to: '/primary/courserules', label: 'TW4 Course Rules' },
    { to: '/primary/systems', label: 'Systems' },
    { to: '/primary/jetlog', label: 'Jet Log' },
  ],
  t44c: [
    { to: '/t44c/about', label: 'About' },
    { to: '/t44c/eps-limits', label: 'EPs/Limits' },
    { to: '/t44c/discuss', label: 'Discussion Items' },
    { to: '/t44c/briefs', label: 'Briefs' },
  ],
  t54a: [
    { to: '/t54a/about', label: 'About' },
    { to: '/t54a/eps-limits', label: 'EPs/Limits' },
    { to: '/t54a/discuss', label: 'Discussion Items', draft: true },
    { to: '/t54a/briefs', label: 'Briefs' },
  ],
};

// The tabs of a program that are shown here: everything but a draft one on the live site.
export const shownTabs = (tabs) => (tabs || []).filter((t) => !t.draft || DRAFT);


const norm = (text) => (text || '').trim().toLowerCase();

// The word a program's briefs and pages are filed under: its label, unless it names its own.
export const schoolOf = (p) => p.school || p.label;

// The program a school's name belongs to, however it was typed.
export const programOf = (school) => PROGRAMS.find((p) => norm(schoolOf(p)) === norm(school)) || null;

// Whether a brief, page or document belongs to this school. A document always carries one —
// the server refuses one without — so an unnamed school matches nothing rather than everything.
export const isSchool = (doc, school) => norm(doc && doc.school) === norm(school);

// A school's name as it appears in a stored key. A discuss page is identified by (school, slug),
// because NIFE and Primary both brief a turn pattern and they are different pages; the stored
// key is `<schoolNs>/<slug>`. Kept here because this is the module that owns what a school is.
// lambda/discussApi/namespace.mjs has the same three lines — the server cannot import from src,
// and the rule is small enough that a copy is cheaper than a build step. Change both together.
export const schoolNs = (school) => norm(school).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
