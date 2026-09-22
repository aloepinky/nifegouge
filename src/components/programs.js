// The programs the site covers: what the top-left dropdown offers, and the same list wherever
// else a school is chosen. A brief, a page or a jet log names its school in its own words, so
// this is what keeps those words to the ones the navigation already knows — a brief filed
// under a school with no tab is a brief nobody can reach.

export const PROGRAMS = [
  { id: 'nife', label: 'NIFE', aircraft: 'C172', home: '/nife/about', base: '/nife' },
  { id: 'tw4', label: 'Primary', aircraft: 'T-6B', home: '/tw4/about', base: '/tw4' },
];

export const programName = (p) => `${p.label} - ${p.aircraft}`;

const norm = (text) => (text || '').trim().toLowerCase();

// The program a school's name belongs to, however it was typed.
export const programOf = (school) => PROGRAMS.find((p) => norm(p.label) === norm(school)) || null;

// Whether a brief, page or document belongs to this school. A document always carries one —
// the server refuses one without — so an unnamed school matches nothing rather than everything.
export const isSchool = (doc, school) => norm(doc && doc.school) === norm(school);
