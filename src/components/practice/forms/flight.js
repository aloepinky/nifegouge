// A formation flight for two: one flight, made from a short code, seen from either cockpit.
// Pure, no JSX.
//
// Two students sit side by side, one as Lead and one as Wing, on the same code, and click
// through together. They stay in step because nothing here depends on who is looking:
// - the code decides everything (the profile, the flight card, the order of the maneuvers);
//   nothing is chosen in flight;
// - the flight is one list of beats. A role only changes how a beat is drawn (`view`), never
//   what it holds;
// - every line said, signalled or flown by either aircraft costs one click (Reveal) for both
//   students, and a beat one more (Next). A station's line costs none: it shows when the line
//   before it is out. So both students make the same clicks, in the same order, every time.
//
// The roles are aircraft: Lead starts in 11 (the Designated Flight Lead's aircraft) and Wing in
// 12. At a lead change the aircraft swap positions, so each student flies both (FTI §410).

import { BEATS, LEFT_TRAFFIC } from './formsScript';
import { PHASES, PROFILES, segmentsFor } from './profiles';

// Codes are a profile letter and four characters, none of them easily misread.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SPAN = ALPHABET.length ** 4;

export function encodeCode(profile, seed) {
  let n = ((seed % SPAN) + SPAN) % SPAN;
  let out = '';
  for (let i = 0; i < 4; i++) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return `${profile}${out}`;
}

// A code as typed: any case, spaces or dashes, O for 0 and I or L for 1. Null if it isn't one.
export function decodeCode(text) {
  const s = String(text || '').toUpperCase().replace(/[\s-]/g, '');
  if (s.length !== 5 || !PROFILES[s[0]]) return null;
  let n = 0;
  for (const ch of s.slice(1).replace(/O/g, '0').replace(/[IL]/g, '1')) {
    const d = ALPHABET.indexOf(ch);
    if (d < 0) return null;
    n = n * 32 + d;
  }
  return { profile: s[0], seed: n };
}

export const randomCode = (profile, rnd = Math.random) => encodeCode(profile, Math.floor(rnd() * SPAN));

// A small seeded generator: the same seed, the same flight.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

const PHONETIC = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India',
  'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango',
  'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];

// KNGP's runways, weighted as the FAM flight weights them (card.js).
const RUNWAYS = [
  ['13L', 130, 4], ['13R', 130, 2], ['31R', 310, 1.5], ['31L', 310, 1],
  ['18', 180, 1], ['36', 360, 0.5], ['04', 40, 0.5], ['22', 220, 0.5],
];
const NORTH = ['04', '31L', '31R', '36'];

// Tactical call signs of two syllables at most (FTI §106 gives SPADE, RAIDER and HELLCAT; the
// Supplement uses RIPPER; Appendix C, Angry).
const TAC = ['RIPPER', 'RAIDER', 'SPADE', 'HELLCAT', 'ANGRY', 'RHINO'];

// Central's working altitudes: 6,500 to 14,500 in 2,000 ft steps (Course Rules Manual 2-15).
const ALTITUDES = [6500, 8500, 10500, 12500, 14500];

// The simulated emergency Lead declares for the low work's PEL. The Supplement's example is a
// fuel pressure light; the others are ones the FAM flight's PELs use.
const EPS = ['fuel pressure light', 'chip light', 'high fuel flow'];

const DIGIT = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
// An altitude as it is said: "six thousand five hundred", "one two thousand five hundred".
export function altWords(alt) {
  const thousands = Math.floor(alt / 1000);
  const hundreds = Math.round((alt % 1000) / 100);
  const t = String(thousands).split('').map((d) => DIGIT[d]).join(' ');
  return `${t} thousand${hundreds ? ` ${DIGIT[hundreds]} hundred` : ''}`;
}

const three = (deg) => String(((deg % 360) + 360) % 360 || 360).padStart(3, '0');

// Everything a flight's students are told at the brief, drawn from its code.
export function makeFormCard(code) {
  const parsed = typeof code === 'string' ? decodeCode(code) : code;
  if (!parsed) return null;
  const profile = PROFILES[parsed.profile];
  const rng = mulberry32(parsed.seed * 2654435761 + parsed.profile.charCodeAt(0));
  const total = RUNWAYS.reduce((n, r) => n + r[2], 0);
  let at = rng() * total;
  const [rwy, hdg] = RUNWAYS.find((r) => (at -= r[2]) < 0) || RUNWAYS[0];
  const dir = Math.round((hdg + between(rng, -30, 30)) / 10) * 10;
  const off = ((dir - hdg + 540) % 360) - 180;
  const squadron = pick(rng, ['Boomer', 'Ranger']);
  const acid = String(between(rng, 0, 99)).padStart(2, '0');
  const side11 = String(between(rng, 1, 199)).padStart(3, '0');
  let side12 = String(between(rng, 1, 199)).padStart(3, '0');
  if (side12 === side11) side12 = String((Number(side11) % 199) + 1).padStart(3, '0');
  return {
    code: `${parsed.profile}${encodeCode(parsed.profile, parsed.seed).slice(1)}`,
    profile: profile.key,
    profileLabel: profile.label,
    event: profile.event,
    squadron,
    atc: `${squadron} 7${acid}`,
    squawk: `55${acid}`,
    tac: pick(rng, TAC),
    side11,
    side12,
    atis: pick(rng, PHONETIC),
    windDir: three(dir),
    windSpeed: between(rng, 4, 15),
    altimeter: (29.85 + between(rng, 0, 30) / 100).toFixed(2),
    rwy,
    north: NORTH.includes(rwy),
    // Lead lines up on the downwind side (FTI §300): a wind from the right puts Lead on the left.
    leadSide: off >= 0 ? 'Left' : 'Right',
    breakDir: LEFT_TRAFFIC.includes(rwy) ? 'left' : 'right',
    alt: pick(rng, ALTITUDES),
    // Which side of Lead Wing joins on after takeoff.
    wingSide: rng() < 0.5 ? 'Right' : 'Left',
    fuelPlan: profile.fuel,
    ep: pick(rng, EPS),
    rng,
  };
}

const AIRCRAFT = new Set(['lead', 'wing', '11', '12', 'both']);

// Every blank a line can have, filled from the card and the moment.
export function fill(text, card, vars = {}) {
  return String(text)
    .replace(/\(TAC\)/g, card.tac)
    .replace(/\(ATC\)/g, card.atc)
    .replace(/\(ATIS\)/g, card.atis)
    .replace(/\(wind\)/g, `${card.windDir} at ${card.windSpeed}`)
    .replace(/\(altimeter\)/g, card.altimeter)
    .replace(/\(altitude\)/g, altWords(card.alt))
    .replace(/\(EP\)/g, card.ep)
    .replace(/\(squadron\)/g, card.squadron)
    .replace(/\(side (11|12)\)/g, (m, ac) => card[`side${ac}`])
    .replace(/\(event\)/g, card.event)
    .replace(/\(break\)/g, card.breakDir)
    .replace(/\(fuel (11|12)\)/g, (m, ac) => String(vars[ac] ?? m))
    .replace(/\(reset\)/g, () => String(vars.reset ?? '(reset)'))
    .replace(/\{rwy\}/g, card.rwy);
}

// The flight as it is being built: who is leading, which side Wing is on, the fuel.
function builder(card) {
  const { rng } = card;
  const c = {
    card,
    lead: '11',
    side: card.wingSide,
    fuelIndex: 0,
    target: 900,
    last: { 11: 1000, 12: 1000 },
    get wing() { return c.lead === '11' ? '12' : '11'; },
    get otherSide() { return c.side === 'Right' ? 'Left' : 'Right'; },
    swap() {
      c.lead = c.wing;
      // The old Lead slides aft and joins on the side away from where the old Wing was.
      c.side = c.otherSide;
    },
    crossSides() { c.side = c.otherSide; },
    // Each aircraft's fuel at an Ops Check, rounded down to 10 lb: near 900 entering the area,
    // then near the Joker or Bingo just reached, never more than last time.
    fuelNow() {
      const spread = c.target === 900 ? [-40, 40] : [-20, 0];
      const out = {};
      ['11', '12'].forEach((ac) => {
        const f = Math.floor((c.target + between(rng, spread[0], spread[1])) / 10) * 10;
        out[ac] = Math.min(f, c.last[ac] - 10);
        c.last[ac] = out[ac];
      });
      // A fuel state set at this check is the one the next check is made near.
      if (c.pending !== undefined) {
        c.target = c.pending;
        c.pending = undefined;
      }
      return out;
    },
    // Entering the area: Joker moves by half the lowest fuel's difference from 900 when that is
    // 30 lb or more (Supplement p. 5); otherwise it stands as briefed and is not reset.
    jokerUpdate() {
      const f = c.fuelNow();
      c.peek = f;
      const low = Math.min(f['11'], f['12']);
      const joker = card.fuelPlan[0];
      c.target = joker;
      if (Math.abs(low - 900) < 30) return null;
      const value = joker + (low - 900) / 2;
      c.target = value;
      return { name: 'Joker', value };
    },
    nextFuel(name) {
      c.fuelIndex = Math.min(c.fuelIndex + 1, card.fuelPlan.length - 1);
      const value = card.fuelPlan[c.fuelIndex];
      c.pending = value;
      return { name, value };
    },
    line(by, text, ref, extra = {}) {
      const ac = by === 'lead' ? c.lead : by === 'wing' ? c.wing : by === '11' || by === '12' ? by : by === 'both' ? 'both' : null;
      const pos = ac === 'both' || ac === null ? null : ac === c.lead ? 'lead' : 'wing';
      const kind = extra.kind || (AIRCRAFT.has(by) ? 'call' : by === 'note' ? 'note' : 'station');
      const { vars, ...rest } = extra;
      return {
        ...rest,
        by,
        ac,
        pos,
        kind,
        raw: text,
        text: fill(text.replace(/\(lead #\)/g, c.lead).replace(/\(wing #\)/g, c.wing), card, vars),
        ref: ref || null,
        counts: ac !== null,
        leadIs: c.lead,
      };
    },
  };
  return c;
}

// The flight: its card and its beats, from a code.
export function buildFlight(code) {
  const card = makeFormCard(code);
  if (!card) return null;
  const profile = PROFILES[card.profile];
  const c = builder(card);
  // The first Ops Check's figures are drawn when the Joker is worked out, then said.
  const fuelNow = c.fuelNow;
  c.fuelNow = () => {
    if (c.peek) {
      const f = c.peek;
      c.peek = null;
      return f;
    }
    return fuelNow();
  };
  const beats = segmentsFor(profile, card.rng).map((s, i) => {
    const leader = c.lead;
    const side = c.side;
    const made = BEATS[s.beat](c, s.args || {});
    const lines = made.lines.filter(Boolean);
    return {
      id: `${i}-${s.beat}`,
      name: s.beat,
      phase: s.phase,
      title: made.title,
      note: made.note || null,
      lines,
      clicks: lines.filter((l) => l.counts).length,
      leader,
      side,
    };
  });
  const { rng, ...plain } = card;
  return { code: card.code, card: plain, profile, beats };
}

export const phasesOf = (flight) => PHASES.filter((p) => flight.beats.some((b) => b.phase === p));

// ---- Clicking through: the same state on both screens. ----

// `at` is the beat on screen (-1 is the brief, beats.length the end); `upTo` how many of its
// counted lines are out.
export const begin = (flight) => ({ flight, at: -1, upTo: 0 });

export const beatOf = (s) => (s.at >= 0 ? s.flight.beats[s.at] : null);
export const isShown = (s) => {
  const b = beatOf(s);
  return !b || s.upTo >= b.clicks;
};
export const isDone = (s) => s.at >= s.flight.beats.length;

export function reduce(s, action) {
  const n = s.flight.beats.length;
  const b = beatOf(s);
  switch (action.type) {
    case 'reveal':
      if (!b || isShown(s)) return s;
      return { ...s, upTo: s.upTo + 1 };
    case 'revealAll':
      if (!b) return s;
      return { ...s, upTo: b.clicks };
    case 'next':
      if (isDone(s)) return s;
      if (b && !isShown(s)) return s;
      return { ...s, at: s.at + 1, upTo: 0 };
    case 'forward':
      return reduce(s, { type: b && !isShown(s) ? 'reveal' : 'next' });
    case 'back':
      if (s.upTo > 0) return { ...s, upTo: 0 };
      if (s.at <= -1) return s;
      return { ...s, at: s.at - 1, upTo: 0 };
    case 'skipTo': {
      const i = s.flight.beats.findIndex((x) => x.phase === action.phase);
      return i < 0 ? s : { ...s, at: i, upTo: 0 };
    }
    case 'goTo':
      return { ...s, at: Math.max(-1, Math.min(n, action.at)), upTo: 0 };
    case 'restart':
      return { ...s, at: -1, upTo: 0 };
    default:
      return s;
  }
}

// ---- Seeing it from one cockpit. ----

const STATION = { ATIS: 'ATIS', AWOS: 'AWOS', GRD: 'Ground', TWR: 'Tower', DEP: 'Departure', APP: 'Approach', Base: 'Base', ip: 'IP' };

// A beat as one student sees it: each line with whether it is theirs, who says it, and whether
// it is out yet. `role` is the aircraft: '11' (started as Lead) or '12' (started as Wing).
export function view(s, role) {
  const b = beatOf(s);
  if (!b) return null;
  let counted = 0;
  let open = true;
  const lines = b.lines.map((l) => {
    let shown;
    if (l.counts) {
      shown = counted < s.upTo;
      counted += 1;
      open = shown;
    } else {
      // A station's line comes out with the line before it.
      shown = open;
    }
    const mine = l.ac === 'both' || l.ac === role;
    const who = l.ac === 'both' ? (l.kind === 'row' ? '' : 'Both')
      : l.ac ? `${l.ac === role ? 'You' : l.pos === 'lead' ? 'Lead' : 'Wing'} (${l.ac})`
        : l.kind === 'note' ? 'Note' : STATION[l.by] || l.by;
    return { ...l, mine, who, shown, next: l.counts && counted === s.upTo + 1 };
  });
  return { ...b, lines, mine: b.leader === role ? 'lead' : 'wing', youLead: lines.length ? lines[lines.length - 1].leadIs === role : b.leader === role };
}

// What one aircraft's radios are set to, and who leads, once the lines out so far are done.
export function readout(s, role) {
  const out = { pri: null, aux: null, lead: '11', side: s.flight.card.wingSide };
  const apply = (l) => {
    if (l.kind === 'switch' && (l.ac === 'both' || l.ac === role)) out[l.radio.toLowerCase()] = { v: l.to, station: l.station };
    out.lead = l.leadIs;
  };
  const beats = s.flight.beats;
  const upto = Math.min(s.at, beats.length);
  for (let i = 0; i < upto; i++) beats[i].lines.forEach(apply);
  const b = beatOf(s);
  if (b) {
    out.lead = b.leader;
    let counted = 0;
    for (const l of b.lines) {
      if (l.counts) {
        if (counted >= s.upTo) break;
        counted += 1;
      }
      apply(l);
    }
  }
  out.youLead = out.lead === role;
  return out;
}

// The beat counter both screens show, so two students can check they're together.
export const position = (s) => ({
  beat: Math.max(0, Math.min(s.at + 1, s.flight.beats.length)),
  of: s.flight.beats.length,
  line: s.upTo,
  lines: beatOf(s) ? beatOf(s).clicks : 0,
});
