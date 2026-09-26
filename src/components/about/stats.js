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

const chartBlocks = (flow) => new Set(((flow && flow.NODES) || []).filter((n) => n.block).map((n) => n.block));

// The blocks one community flies, for a syllabus that splits: the course flow's, plus its own
// chart's. Between them the two figures name every block that community sees, which is what
// the publication draws them to say. Checked against 1542.168C's own per-community totals —
// USN P-8 32 flights and 69.5 hours, E-6 31 and 67.5, USMC C-130 34 and 72.9 — and all three
// come out of this exactly, so the charts are a sound statement of who flies what.
export function platformBlocks(doc, platform) {
  if (!platform) return null;
  const blocks = chartBlocks(doc.flow);
  chartBlocks(platform).forEach((b) => blocks.add(b));
  return blocks;
}

const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// The course-length row a community's chart names. The two lists are written differently —
// the chart says TILT-ROTOR where Course Data says USN/USMC Tilt-Rotor — so an exact match is
// tried first and then containment, and an ambiguous match is no match.
function matchRow(rows, platform) {
  const want = squash(platform && platform.label);
  if (!want) return null;
  const exact = rows.filter((r) => squash(r.label) === want);
  if (exact.length) return exact[0];
  const held = rows.filter((r) => squash(r.label).includes(want));
  return held.length === 1 ? held[0] : null;
}

// Course Data does not list every community a syllabus draws a chart for: 1542.168C gives the
// E-6 its own CIN and its own chart but no Training Days. Where that happens the community
// takes the row of the one it SHARES A BAND with on the figure, because a band is the
// publication grouping two communities as one course — the E-6 is drawn beside USN P-8, and
// its own flight table differs from the P-8's by a single solo. Failing that there is no row,
// and no course length is shown rather than an invented one.
export function platformRow(rows, platform, all = []) {
  if (!platform) return null;
  const direct = matchRow(rows, platform);
  if (direct) return direct;
  if (platform.band == null) return null;
  const sibling = all.find((f) => f !== platform && f.band === platform.band && matchRow(rows, f));
  return sibling ? matchRow(rows, sibling) : null;
}

// `platform` is one of `doc.postFlows`, for a syllabus that splits: the figures are then that
// community's rather than the whole document's. Without one they are the document's, which is
// the union of every community and is what a syllabus that does not split has anyway.
export function syllabusStats(doc, platform = null) {
  const only = platformBlocks(doc, platform);
  const keep = (id) => !only || only.has(id);
  // `doc.events[].block` is not dependable — a few blocks whose header runs the Blk Name
  // column into the id leave it holding that name — so the mapping comes from the block
  // rows, which own their own event lists.
  const blockOf = new Map();
  (doc.blocks || []).forEach((b) => (b.events || []).forEach((e) => blockOf.set(e.id, b.id)));

  let flights = 0;
  let sims = 0;
  // A block's `hours` is the whole block's, so a flight block's is its flight hours. NIFE's
  // blocks carry none, and then there is no figure rather than a zero.
  let flightHours = null;
  (doc.blocks || []).forEach((b) => {
    if (!keep(b.id)) return;
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
  const all = length ? (length.rows || []) : [];
  const picked = platform ? platformRow(all, platform, doc.postFlows || []) : null;
  const rows = platform ? (picked ? [picked] : []) : (length ? pickCourseRows(doc.school, all) : []);
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
    discussItems: (doc.events || [])
      .filter((e) => keep(blockOf.get(e.id)))
      .reduce((n, e) => n + (e.items || []).length, 0),
  };
}

// What a school's syllabi differ BY, which is what a label naming them should say. The
// aircraft is the school's own and the school is the tile the label sits under, so both come
// off the name: "T-44C P-8 Advanced" is listed as "P-8" and "T-44C E-2D Intermediate" as
// "E-2D".
//
// A name with nothing left but a word like "Syllabus" keeps what it had: NIFE's is called
// "NIFE Syllabus", and "Syllabus" alone would say less than the whole name does.
const LEVELS = /\b(?:primary|intermediate|advanced|nife)\b/gi;
const GENERIC = /^(?:syllabus|syllabi|course|mpts|mcg|jppt)$/i;

export function platformName(record) {
  const aircraft = String((record.doc && record.doc.aircraft) || record.aircraft || '').trim();
  let out = String(record.name || '');
  if (aircraft) out = out.split(aircraft).join(' ');
  out = out.replace(LEVELS, ' ').replace(/\s+/g, ' ').trim();
  const words = out.split(' ').filter(Boolean);
  if (!words.length || words.every((w) => GENERIC.test(w))) return record.name;
  return out;
}

// A syllabus several communities fly is named for one of them, so the tile names them all:
// the 23 weeks of the T-44C Advanced course are 23 weeks for every one of its five. The chart
// labels are the publication's own, which is what they are trimmed from — the service that
// operates the aircraft is not what a student calls the track, and a name the publication
// sets in capitals is a word rather than an acronym once it is longer than four letters.
const SERVICE = /^(?:USN|USMC|USAF|USA|IMT)\s+/i;
const titleCase = (w) => w.charAt(0) + w.slice(1).toLowerCase();

export function communityName(label) {
  const out = String(label || '').replace(SERVICE, '').trim() || String(label || '');
  // Counted over the whole name rather than each hyphenated part, or TILT-ROTOR keeps its
  // four-letter half and comes out as "TILT-Rotor".
  const letters = out.replace(/[^A-Za-z]/g, '');
  if (letters.length < 5 || letters !== letters.toUpperCase()) return out;
  return out.split('-').map(titleCase).join('-');
}

// What a course-length figure is FOR: every community the syllabus trains, or the syllabus
// itself where it draws no per-community charts.
export function coveredBy(record) {
  const flows = (record.doc && record.doc.postFlows) || [];
  return flows.length ? flows.map((f) => communityName(f.label)) : [platformName(record)];
}

// A school's course length for the landing page: one entry per distinct figure, so Delta and
// Echo, both 28 production weeks, are one number rather than the same number twice. Syllabi
// that differ each get their own entry, named for what it covers.
export function weekGroups(records) {
  const groups = [];
  (records || []).forEach((record) => {
    const st = syllabusStats(record.doc);
    if (st.weeks == null) return;
    const same = groups.find((g) => g.weeks === st.weeks && g.label === st.weeksLabel);
    if (same) same.names.push(...coveredBy(record));
    else groups.push({ weeks: st.weeks, label: st.weeksLabel, names: coveredBy(record) });
  });
  return groups;
}

// One row per syllabus for the About page's Discussion Items panel.
export function syllabusRows(records) {
  return (records || []).map((record) => ({
    id: record.id,
    name: record.name,
    discussItems: syllabusStats(record.doc).discussItems,
  }));
}

// One row per brief for the About page's Briefs panel.
export function briefRows(records) {
  return (records || []).map((r) => ({ aircraft: r.brief.aircraft, words: briefWords(r.brief) }));
}
