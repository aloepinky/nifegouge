import { countWords } from '../briefs/firstLetters';

// The numbers an About page shows at a glance, counted from the data each tab already renders
// rather than typed in, so they cannot fall behind an edit to the EPs, a limits sheet, a brief
// or a syllabus. Pure functions; SchoolStats.js does the fetching.

const NWC_KINDS = ['warnings', 'cautions', 'notes'];
const nwcCount = (record) => NWC_KINDS.reduce((n, k) => n + ((record && record[k]) || []).length, 0);

// An EP list in the shared shape (Flight/c172Data.js): steps are rows with text. `nwc` is keyed
// by a step's id, or by an EP's own id for what the publication prints before the procedure.
export function epListStats(eps, nwc = null) {
  const steps = eps.flatMap((ep) => ep.rows.filter((r) => r.id && r.text));
  const keys = eps.flatMap((ep) => [ep.id, ...ep.rows.map((r) => r.id).filter(Boolean)]);
  return {
    eps: eps.length,
    steps: steps.length,
    words: steps.reduce((n, s) => n + countWords(s.text), 0),
    nwcs: nwc ? keys.reduce((n, k) => n + nwcCount(nwc[k]), 0) : null,
  };
}

// Primary's EPs are in EPDivsData.js's own shape: an answer key of fragments per step, and the
// NWC keys of each procedure listed in EP_NWC_GROUPS.
export function primaryEpStats({ titles, answers, nwc, nwcGroups }) {
  const text = (fragments) => [].concat(fragments).join('').replace(/​/g, '');
  const steps = Object.values(answers);
  return {
    eps: titles.length,
    steps: steps.length,
    words: steps.reduce((n, s) => n + countWords(text(s)), 0),
    nwcs: nwcGroups.flat().reduce((n, k) => n + nwcCount(nwc[k]), 0),
  };
}

// The words of a brief a student says from memory. Only text that opens and closes can be: an
// unfixed item's `text`, which is also all first-letter mode hides (BriefView.js). A fixed item
// or section, a section's own text and subtext are always on screen, so none is counted.
//
// Within that, each school's guide marks what is memorized its own way:
//
// - Primary's guide puts the words said aloud in quotation marks and wraps them in
//   instructions ("Brief history of airsickness if applicable."), so only quoted words count.
//   A quote the guide opens and never closes runs to the end of the block.
// - NIFE's guide quotes almost nothing (20 words of 840), so its text counts whole, less the
//   items that are looked up rather than memorized and the line that only names the pubs.
const SAID_RULES = {
  primary: { quotedOnly: true },
  nife: { skipItems: [/^crew day and rest$/i, /^told$/i, /^profile\b/i] },
};
// Never counted, in any brief: it says where the procedure is, not what it is. The guide prints
// it both as "Brief IAW: …" (Wave Off) and "Brief memory items IAW: …" (the three EP items).
const SKIP_LINES = [/^\s*brief (memory items )?iaw:? nife ifg and nife fti\.?\s*$/i];

function quotedWords(text) {
  let n = 0;
  const re = /[“"]([^”"]*)(?:[”"]|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    n += countWords(m[1]);
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return n;
}

export function briefWords(brief, school = brief.school) {
  const rules = SAID_RULES[String(school || '').toLowerCase()] || {};
  const count = (text) => {
    if (!text) return 0;
    const kept = text.split('\n').filter((l) => !SKIP_LINES.some((re) => re.test(l))).join('\n');
    return rules.quotedOnly ? quotedWords(kept) : countWords(kept);
  };
  return (brief.sections || [])
    .filter((s) => !s.fixed)
    .flatMap((s) => s.items || [])
    .filter((item) => !item.fixed)
    .filter((item) => !(rules.skipItems || []).some((re) => re.test((item.label || '').trim())))
    .reduce((n, item) => n + count(item.text), 0);
}

// Flights and sims, by event number. Every event numbered 2000 or above is one or the other,
// and nothing below 2000 is either (1000s are ground training). Of those, an event whose
// block's media names the aircraft (`T-6B`, `Single Engine Land Aircraft`) is a flight, and
// every other device is a sim: OFT, UTD, UTD/MR, and the VTD and CPT trainers too.
const eventNumber = (id) => {
  const m = /(\d{4})/.exec(id || '');
  return m ? Number(m[1]) : null;
};
const isFlightMedia = (media, aircraft) => !!media && (media === aircraft || /aircraft|flight/i.test(media));
const tenth = (n) => Math.round(n * 10) / 10;

// Which of the publication's course-length rows a school means, summed. The JPPT prints a row
// per wing and course and this site is written from TW-4; the NIFE MCG prints NIFE 1 (ground)
// and NIFE 2 (flight), which are one school end to end. Anything else takes the first row.
export function pickCourseRows(school, rows) {
  if (/^nife$/i.test(school || '')) return rows;
  if (/^primary$/i.test(school || '')) {
    const tw4 = rows.filter((r) => /^TW-4 Primary\b/i.test(r.label));
    if (tw4.length) return tw4;
  }
  return rows.slice(0, 1);
}

export function syllabusStats(doc) {
  let flights = 0;
  let sims = 0;
  // A block's `hours` is the whole block's, so a flight block's is its flight hours. NIFE's
  // blocks carry none, and then there is no figure rather than a zero.
  let flightHours = null;
  (doc.blocks || []).forEach((b) => {
    if (isFlightMedia(b.media, doc.aircraft) && b.hours != null) flightHours = (flightHours || 0) + b.hours;
    (b.events || []).forEach((e) => {
      const n = eventNumber(e.id);
      if (n == null || n < 2000) return;
      if (isFlightMedia(b.media, doc.aircraft)) flights += 1;
      else sims += 1;
    });
  });
  const sumOf = (list, k) => list.reduce((n, r) => n + (r[k] || 0), 0);

  const length = doc.courseLength;
  const rows = length ? pickCourseRows(doc.school, length.rows || []) : [];
  return {
    weeks: rows.length ? tenth(sumOf(rows, 'weeks')) : null,
    weeksLabel: length ? length.weeksLabel : null,
    trainingDays: rows.length ? tenth(sumOf(rows, 'trainingDays')) : null,
    rows: rows.map((r) => r.label),
    flights,
    sims,
    flightHours: flightHours == null ? null : tenth(flightHours),
    // Every discuss item the JPPT lists against an event, counted per event: an item briefed
    // at three events is three items to prepare.
    discussItems: (doc.events || []).reduce((n, e) => n + (e.items || []).length, 0),
  };
}
