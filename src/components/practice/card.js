// The flight card: what a student is told or assigned for one flight (call sign, squawk, the
// ATIS), made up afresh each flight, and the filling of every blank in a call from it. Pure.
//
// What is invented here is invented to be plausible, never cited:
// - the call sign and squawk follow the wing's pattern: "Our Call-Sign will be
//   BOOMER/RANGER/RUFNEK 7XX/8XX and we will squawk 55XX/56XX" (Checklist Study Guide, Encl 2);
// - the wind is rounded to ten degrees and blows within 30 degrees of the runway in use, at 4 to
//   15 knots; the runway is the one the ATIS would give for it;
// - the flow follows the runway: 13L/R, 18 and 22 are South Flow (taxi to the Sierra run-up),
//   04, 31L/R and 36 North Flow (the Compass Rose, then Ground to the Echo run-up) (Course
//   Rules Manual 2-1).

const PHONETIC = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India',
  'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango',
  'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];

// KNGP's runways, by how often a day's wind favours them; the 13s most of all.
const RUNWAYS = [
  { rwy: '13L', hdg: 130, weight: 4 },
  { rwy: '13R', hdg: 130, weight: 2 },
  { rwy: '31R', hdg: 310, weight: 1.5 },
  { rwy: '31L', hdg: 310, weight: 1 },
  { rwy: '18', hdg: 180, weight: 1 },
  { rwy: '36', hdg: 360, weight: 0.5 },
  { rwy: '04', hdg: 40, weight: 0.5 },
  { rwy: '22', hdg: 220, weight: 0.5 },
];
export const NORTH_FLOW = ['04', '31L', '31R', '36'];
export const FLOW_REF = { work: 'Course Rules Manual', loc: 'Ch. 2 — Ground Procedures', pages: 'p. 2-1' };

const SQUADRONS = ['Boomer', 'Ranger'];

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

function pickRunway(rng) {
  const total = RUNWAYS.reduce((n, r) => n + r.weight, 0);
  let at = rng() * total;
  return RUNWAYS.find((r) => (at -= r.weight) < 0) || RUNWAYS[0];
}

const three = (deg) => String(((deg % 360) + 360) % 360 || 360).padStart(3, '0');

export function makeCard(rng = Math.random, given = {}) {
  const runway = given.rwy ? RUNWAYS.find((r) => r.rwy === given.rwy) : pickRunway(rng);
  const dir = Math.round((runway.hdg + between(rng, -30, 30)) / 10) * 10;
  const hundred = pick(rng, ['7', '8']);
  const tail = String(between(rng, 0, 99)).padStart(2, '0');
  const drawn = pick(rng, SQUADRONS);
  const squadron = given.squadron || drawn;
  const side = `${hundred}${between(rng, 0, 4)}${tail.slice(1)}`;
  return {
    squadron,
    side,
    callSign: `${squadron} ${side}`,
    squawk: `${hundred === '7' ? '55' : '56'}${side.slice(1)}`,
    atis: pick(rng, PHONETIC),
    windDir: three(dir),
    windSpeed: between(rng, 4, 15),
    altimeter: (29.85 + between(rng, 0, 30) / 100).toFixed(2),
    rwy: runway.rwy,
    hdg: runway.hdg,
    north: NORTH_FLOW.includes(runway.rwy),
    areaPick: rng(),
    // KINGS 4's block for the high work, claimed on the way in.
    block: rng() < 0.5 ? 'high' : 'low',
    seed: rng(),
    // Another aircraft at the field, for the RDO to name.
    other: `${pick(rng, SQUADRONS)} ${pick(rng, ['7', '8'])}${between(rng, 10, 49)}`,
    // Climbing from PT RUSTY to 14,500 when Approach hands the flight to Houston Center.
    passing: (6500 + 500 * between(rng, 0, 8)).toLocaleString('en-US'),
    // Gear and flaps are up before 150 KIAS, after 110 for the flaps.
    cleanSpeed: 120 + 5 * between(rng, 0, 5),
    // The instructor, as the student addresses them for the whole flight.
    ip: rng() < 0.5 ? 'Sir' : "Ma'am",
    ...given,
  };
}

// Which way the wind crosses the runway, as the takeoff call says it.
export function crosswind(card) {
  const off = ((Number(card.windDir) - card.hdg + 540) % 360) - 180;
  if (Math.abs(off) < 5) return null;
  return off > 0 ? 'right to left' : 'left to right';
}

const wind = (card) => `${card.windDir} at ${card.windSpeed}`;

// Every blank a call can have, filled from the card and where the flight is. `at` carries what
// depends on the moment: { position, field, rwy, crossing, area, nearest, intentions }.
export function fillCall(text, card, at = {}) {
  if (!card) return text;
  const rwy = at.rwy || card.rwy;
  const cross = crosswind({ ...card, hdg: card.hdg });
  // At a field that uses side numbers (Goliad), the side number stands for the call sign.
  const sign = at.sideOnly ? card.side : card.callSign;
  const other = at.sideOnly ? card.other.split(' ').pop() : card.other;
  return String(text)
    .replace(/\((?:tac )?call sign\)/gi, sign)
    .replace(/\[call sign\]/gi, sign)
    .replace(/\(side #\)/gi, card.side)
    .replace(/\(Base name\) base/g, `${card.squadron} base`)
    .replace(/Boomer\/Ranger/g, card.squadron)
    .replace(/\(ATIS code\)/g, card.atis)
    .replace(/\(wind\)/g, `${card.windDir} at ${card.windSpeed}`)
    .replace(/\(altimeter\)/g, card.altimeter)
    .replace(/information (ALPHA|ALFA)\b/g, `information ${card.atis}`)
    .replace(/\((?:VFR\/IFR|VFR) inten[st]ions\)/g, at.intentions || 'VFR')
    .replace(/\(position\)/g, at.position || 'Sierra run-up')
    .replace(/\(Transition\)/g, at.transition || '(Transition)')
    .replace(/\{rwy\}/g, rwy)
    .replace(/\(RWY ?#\)/g, rwy)
    // Waldron's calls are written for runway 13 ("Report the initial RWY 13", "Initial 13",
    // "Numbers 13") on every arrival: the runway in use.
    .replace(/\b(Report the initial RWY|Initial|Numbers) 13\b(?![LRC])/g, `$1 ${rwy}`)
    .replace(/\(#\) in the pattern/g, '1 in the pattern')
    .replace(/\(Call Sign #2\)/g, other)
    .replace(/__ miles to the \(cardinal direction\)/g, '5 miles to the south')
    .replace(/winds are ___ at __ knots/g, `winds are ${wind(card)} knots`)
    .replace(/winds ____ at __kts/g, `winds ${wind(card)}`)
    .replace(/Winds are right to left \(or left to right\)/g, cross ? `Winds are ${cross}` : 'Winds are calm')
    .replace(/60 knots, ____%/g, '60 knots, 100%')
    .replace(/at ____ ?knots/g, `at ${card.cleanSpeed} knots`)
    .replace(/Clear, Left, Right and Above on ___/g, `Clear, Left, Right and Above on ${at.crossing || '18'}`)
    .replace(/\b(complete in MUSTANG) \d+/g, (m, a) => (at.area ? `${a} ${at.area}` : m))
    .replace(/Clear of the active on Yankee/g, `Clear of the active on ${at.exit || 'Yankee'}`)
    .replace(/Nearest airfield is ____/g, `Nearest airfield is ${at.nearest || 'Navy Corpus'}`)
    .replace(/(Houston Center, [^,]+, passing )\(altitude\)/g, `$1${card.passing}`)
    // Goliad's High-Key is 3300' (Course Rules Manual 2-28); the PEL call is made 3-5 NM out.
    .replace(/\(altitude\), Practice PEL/g, '3,300, Practice PEL')
    .replace(/squawk XXXX/g, `squawk ${card.squawk}`)
    .replace(/\(UP\/DOWN\)/g, 'up')
    .replace(/\(Quick-turn\/Done for the day\)/g, 'done for the day')
    .replace(/complete\/incomplete/g, 'complete')
    .replace(/area ____ ?\(?high ?\/ ?low\)?/g, `area ${at.area || '1'} ${card.block}`)
    .replace(/area ____ ?\(?low ?\/ ?high\)?/g, `area ${at.area || '1'} ${card.block}`)
    .replace(/VFR to XXX/g, `VFR to ${at.fieldCode || 'XXX'}`)
    .replace(/\(AC ID\)/g, sign)
    .replace(/\s+\(((?:[^()]|\([^()]*\))*\/(?:[^()]|\([^()]*\))*)\)/g, (m, alts) => ` ${choose(alts.split('/'), at.keywords, at.otherwise)}`)
    .split(', ').map((clause) => (clause.includes(' / ') ? choose(clause.split(' / '), at.keywords, at.otherwise) : clause)).join(', ')
    .replace(/\b(climbing|descending)\/(climbing|descending)\b/g, (m, a) => a)
    // The choices a call writes with a bare slash, settled by the flight: leaving Waldron by its
    // East departure, "off Waldron" from upwind and "Abeam the Power Plant" from the 180; home,
    // or on to the working area; and from upwind or downwind out of a field.
    .replace(/Abeam the Power Plant\/off Waldron/g, at.departFrom === 'downwind' ? 'Abeam the Power Plant' : 'off Waldron')
    .replace(/course rules SHAMROCK\/Request South MUSTANG/gi, at.areaAhead ? 'Request South MUSTANG' : 'course rules SHAMROCK')
    .replace(/\bupwind\/downwind\b/g, at.departFrom || 'upwind')
    // Off Aransas County with the area still ahead, the intention is the area, not home ("state
    // intentions (Northern Arrival/Request a working area)").
    .replace(/(Off Aransas County), Course Rules SHAMROCK (with information [\w-]+)/, (m, a, b) => (at.areaAhead ? `${a} ${b}, request North MUSTANG` : m))
    // A break decided on: the field asked for, not its High-Key.
    .replace(/request High-Key into /g, (m) => (at.entry === 'break' ? 'request ' : m));
}

// Of a call's alternatives ("KINGS 4 / course rules Goliad / VFR to KNGT"), the one that fits
// this flight: the first naming one of `keywords` (most telling first), else a Course Rules
// one, else the first. A clause's ending punctuation stays with the clause.
function choose(alts, keywords = [], otherwise) {
  const opts = alts.map((a) => a.trim());
  const end = /[.?!]$/.exec(opts[opts.length - 1]);
  const bare = opts.map((a) => a.replace(/[.?!]$/, ''));
  const lower = bare.map((a) => a.toLowerCase());
  let at = -1;
  for (const k of keywords.map((w) => String(w).toLowerCase()).filter(Boolean)) {
    at = lower.findIndex((a) => a.includes(k));
    if (at >= 0) break;
  }
  // Where none fits and the flight is bound somewhere the call has no words for, it says so.
  if (at < 0 && otherwise) return otherwise + (end ? end[0] : '');
  if (at < 0) at = lower.findIndex((a) => a.includes('course rules'));
  if (at < 0) at = 0;
  return bare[at] + (end ? end[0] : '');
}
