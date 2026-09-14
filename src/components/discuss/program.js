// The aircraft and the school a page or a syllabus is for: "T-6B" and "Primary". Every page
// and every syllabus carries both, because a page with the same title can exist for another
// aircraft or another school, and nothing else tells them apart. Plain JS, no JSX.

// What the site was written for, and what a new page or upload is offered first.
export const DEFAULT_PROGRAM = { aircraft: 'T-6B', school: 'Primary' };

// The pair off anything that carries it: an item, a document, a record, a syllabus.
export function programOf(x) {
  return {
    aircraft: (x && typeof x.aircraft === 'string' && x.aircraft.trim()) || '',
    school: (x && typeof x.school === 'string' && x.school.trim()) || '',
  };
}

// "T-6B Primary", or as much of it as is known.
export function programLabel(x) {
  const p = programOf(x);
  return [p.aircraft, p.school].filter(Boolean).join(' ');
}

// The pair with the defaults filled in where `x` has nothing.
export function withDefaultProgram(x, fallback = DEFAULT_PROGRAM) {
  const p = programOf(x);
  const f = programOf(fallback);
  return {
    aircraft: p.aircraft || f.aircraft || DEFAULT_PROGRAM.aircraft,
    school: p.school || f.school || DEFAULT_PROGRAM.school,
  };
}

// The values already in use, for a picker's suggestions: the defaults first, then whatever
// the pages carry, each once.
export function knownPrograms(entries) {
  const aircraft = new Set([DEFAULT_PROGRAM.aircraft]);
  const schools = new Set([DEFAULT_PROGRAM.school]);
  (entries || []).forEach((e) => {
    const p = programOf(e);
    if (p.aircraft) aircraft.add(p.aircraft);
    if (p.school) schools.add(p.school);
  });
  return { aircraft: [...aircraft], schools: [...schools] };
}

// A guess from a publication's text: the first aircraft designation and the first training
// school word on its opening pages. A JPPT's title page says "T-6B JOINT PRIMARY PILOT
// TRAINING", which is both.
const AIRCRAFT_RE = /\b(T-6[AB]?|T-45[A-C]?|TH-73[A]?|TH-57[BC]?|T-44[A-C]?|TC-12[B]?|T-34C|T-39[GN]?|T-38[AC]?|T-1A)\b/;
const SCHOOL_RE = /\b(primary|intermediate|advanced)\b/i;

export function guessProgram(text) {
  const out = {};
  const a = AIRCRAFT_RE.exec(text || '');
  if (a) out.aircraft = a[1];
  const s = SCHOOL_RE.exec(text || '');
  if (s) out.school = s[1].charAt(0).toUpperCase() + s[1].slice(1).toLowerCase();
  return out;
}
