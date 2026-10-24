// The calls at an outlying field, sorted out of the course rules document by what the student
// decides: a break or a PEL to enter, a normal lap or a pattern PEL each time round, and, when
// the RDO says so, a discontinued entry. Pure.
//
// The document lists a leg's calls in order, each new part led by a `when` ("Once established
// at the 4 NM initial:", "PPEL/P:", "Or if the RDO is unable to accept an aircraft into the
// pattern:"). A part is a call with a `when` and the calls after it that have none; an "Or" part
// is the other way the one before it can go.

import { choicesFrom, fieldLabel, isAirfield, isPattern, feature, nameOf } from './legs';

const rawComms = (legs, id) => (legs && legs[id] && legs[id].comms) || [];
const ALT = /^Or\s*(?:…|\.\.\.)\s*$/;

// A call led "Or…" is the other way the call before it can go: kept in its place for a PEL
// where it asks for High-Key, dropped otherwise.
function resolveOr(comms, mode) {
  const out = [];
  comms.forEach((c) => {
    if (!ALT.test(c.when || '')) { out.push(c); return; }
    if (mode === 'pel' && /High-Key/i.test(c.text) && out.length) out[out.length - 1] = { ...c, when: out[out.length - 1].when };
  });
  return out;
}
const legComms = (legs, id, mode) => (isPattern(id) ? rawComms(legs, id) : resolveOr(rawComms(legs, id), mode));
const orPel = (legs, leg) => rawComms(legs, leg).some((c) => ALT.test(c.when || '') && /High-Key/i.test(c.text));

// A PEL into a towered field whose calls ask for High-Key but give no PEL calls (Waldron): the
// arrival's calls up to the initial, then High-Key and Low-Key to Tower, made up for practice
// in the words of Goliad's.
function towerPel(legs, leg) {
  if (!orPel(legs, leg)) return null;
  const calls = callsOf(partsOf(legComms(legs, leg, 'pel')));
  const upTo = calls.findIndex((c) => /initial|numbers/i.test(c.text));
  const before = upTo < 0 ? calls : calls.slice(0, upTo);
  const tower = calls.map((c) => /^(\w+ Tower),/.exec(c.text)).find(Boolean);
  if (!tower) return null;
  const made = (text) => ({ who: 'you', text, generated: true });
  return {
    opening: [],
    before: [...before, made(`${tower[1]}, (Call Sign), High-Key, (RWY #).`)],
    after: [made(`${tower[1]}, (Call Sign), Low-Key, gear down.`)],
  };
}

export function partsOf(comms) {
  const parts = [];
  comms.forEach((c) => {
    if (c.when || !parts.length) parts.push({ when: c.when || '', calls: [c] });
    else parts[parts.length - 1].calls.push(c);
  });
  return parts;
}

const shaped = (c) => ({
  who: !c.who || c.who === 'AIRCRAFT' ? 'you' : c.who,
  text: c.text,
  radio: c.radio,
  when: c.when,
});
const callsOf = (parts) => parts.flatMap((p) => p.calls.map(shaped));

const is = (re) => (p) => re.test(p.when);
const DISCONTINUED = /^Or if the RDO is unable/i;
const AT_180 = /180/;
const LOW_KEY = /^Low-Key/i;
const OR = /^Or\b/i;

export const fieldOfLeg = (id) => (feature(id)?.nextNode || []).find(isAirfield) || null;

// The parts of the field's pattern calls (every runway's pattern says the same).
function patternParts(legs, field) {
  const pattern = choicesFrom(field).find(isPattern);
  return pattern ? partsOf(legComms(legs, pattern)) : [];
}

// --- Entering --------------------------------------------------------------------------------

// A civilian field (Aransas County, Ingleside), as against a Navy one (an NOLF, a NAS): its
// calls go out on a CTAF to civilian traffic, so they never use the Navy's terms. High-Key is
// "high left/right overhead", Low-Key "high left/right base", a pattern PEL "high left/right
// crosswind", as Aransas County's own PPEL/P calls say them.
export const civilian = (field) => !!field && !/NOLF|NAS\b|NALF|Navy/i.test(fieldLabel(nameOf(field)));

// The side a field's pattern is flown to: as its calls say it ("Left crosswind"), else its rule
// ("will be made to the left"), else left.
export function sideOf(legs, field) {
  const pattern = choicesFrom(field).find(isPattern);
  const leg = (legs && legs[pattern]) || {};
  const words = [...(leg.comms || []).map((c) => c.text), ...(leg.rule || []).map((p) => p.text)].join(' ');
  const m = /\b(left|right) (?:crosswind|base|downwind)\b|made to the (left|right)/i.exec(words);
  return m ? (m[1] || m[2]).toLowerCase() : 'left';
}

// The names of the ways in and round, as they are said at this field.
export function modeLabel(legs, field, mode) {
  const side = sideOf(legs, field);
  const civ = civilian(field);
  return {
    break: 'Break',
    pel: civ ? `PEL: high ${side} overhead` : 'PEL',
    lap: 'Normal lap',
    ppel: civ ? `Pattern PEL: high ${side} crosswind` : 'Pattern PEL',
  }[mode];
}

// A field whose pattern rule allows PPELs but whose calls have no Practice PEL (Aransas
// County: "Aircraft executing a PPEL must announce intentions on CTAF (CH 21 VHF) and report
// "High-Key" on KRKP common (CH 21 UHF)"): its PEL calls, made up for practice from that
// rule and the field's own CTAF calls. Null elsewhere.
function ruledPel(legs, field) {
  const pattern = choicesFrom(field).find(isPattern);
  const rule = ((legs && legs[pattern] && legs[pattern].rule) || []).map((p) => p.text.replace(/\[\[|\]\]/g, '')).join(' ');
  const ctaf = /CTAF \(CH (\d+) VHF\)/i.exec(rule);
  const common = /report "?High-Key"? on \w+ common \(CH (\d+) UHF\)/i.exec(rule);
  if (!/PPELs are authorized/i.test(rule) || !ctaf || !common) return null;
  const parts = partsOf(legComms(legs, pattern));
  const sample = parts.flatMap((p) => p.calls).find((c) => /Traffic, /.test(c.text));
  const m = sample && /^(.*? Traffic), .*, ([^,]+)\.$/.exec(sample.text);
  if (!m) return null;
  const made = (text, radio) => ({ who: 'you', text, radio, generated: true });
  const ppel = parts.filter(is(/PPEL\/P/i));
  // On the CTAF, civilian words; on the wing's own common, the rule's "High-Key".
  return {
    before: [
      made(`${m[1]}, (Call Sign), high ${sideOf(legs, field)} overhead, (RWY #), ${m[2]}.`, `CH ${ctaf[1]} VHF`),
      made('(Call Sign), High-Key', `CH ${common[1]} UHF`),
    ],
    after: callsOf(ppel).slice(-1),
  };
}

// What the arrival leg into a field offers: a break where it has calls at all, a PEL where the
// field's pattern calls have a Practice PEL or its pattern rule allows PPELs.
export function entryModes(legs, leg) {
  const field = fieldOfLeg(leg);
  if (!field || !legComms(legs, leg).length) return [];
  const pel = patternParts(legs, field).some(is(/Practice PEL/i)) || !!ruledPel(legs, field) || orPel(legs, leg);
  return pel ? ['break', 'pel'] : ['break'];
}

// The ways into a field, decided before leaving the working area for it.
export function fieldModes(legs, field) {
  if (!field) return [];
  const arrivals = Object.keys(legs || {}).filter((id) => fieldOfLeg(id) === field && !isPattern(id) && legComms(legs, id).length);
  return arrivals.length ? entryModes(legs, arrivals[0]) : [];
}

export const canDiscontinue = (legs, leg) => partsOf(legComms(legs, leg)).some(is(DISCONTINUED));

// The entry's calls before the Before Landing Checklist and after it. A break: the arrival's
// calls, the 180 call last; told to discontinue, the initial call, the RDO's direction, what
// the manual says to do, and the initial again. A PEL: the arrival's first calls, then the
// pattern's Practice PEL and High-Key calls, Low-Key last.
// `opening` is the calls up to the initial (the landing call and the RDO's answer), when the
// field's course rule is asked; `before` the rest up to the Before Landing Checklist.
export function entryCalls(legs, leg, mode, discontinued) {
  const parts = partsOf(legComms(legs, leg)).filter((p) => !DISCONTINUED.test(p.when));
  const initial = parts.findIndex(is(/initial/i));
  const opening = callsOf(initial < 0 ? [] : parts.slice(0, initial));
  const rest = initial < 0 ? parts : parts.slice(initial);
  if (mode === 'pel') {
    const pattern = patternParts(legs, fieldOfLeg(leg));
    if (!pattern.some(is(/Practice PEL/i)) && !ruledPel(legs, fieldOfLeg(leg)) && towerPel(legs, leg)) return towerPel(legs, leg);
    const ruled = !pattern.some(is(/Practice PEL/i)) && ruledPel(legs, fieldOfLeg(leg));
    // The arrival's calls up to its initial (KRKP's "Any Texans working Aransas County?"), then
    // the High-Key calls in place of the overhead's.
    if (ruled) return { opening: [...opening, ...callsOf(rest).filter((c) => !/initial|numbers|overhead/i.test(c.text))], ...ruled };
    return {
      opening,
      before: callsOf(pattern.filter(is(/Practice PEL|^High-Key/i))),
      after: callsOf(pattern.filter(is(LOW_KEY))),
    };
  }
  const before = rest.filter((p) => !AT_180.test(p.when));
  const after = callsOf(rest.filter(is(AT_180)));
  if (!discontinued || initial < 0) return { opening, before: callsOf(before), after };
  const told = partsOf(legComms(legs, leg)).find(is(DISCONTINUED));
  return {
    opening,
    before: callsOf(before).slice(0, 1),
    discontinued: callsOf([told]),
    again: callsOf(before),
    after,
  };
}

// --- Round the pattern --------------------------------------------------------------------

// A pattern PEL is offered where the field's pattern calls have one ("PPEL/P:", or the
// "pattern PEL" crosswind call and its "Pattern Low-Key").
export function lapModes(legs, pattern) {
  const parts = partsOf(legComms(legs, pattern));
  const ppel = parts.some((p) => /PPEL\/P/i.test(p.when) || (OR.test(p.when) && /Pattern Low-Key/i.test(p.calls[0].text)));
  return ppel ? ['lap', 'ppel'] : ['lap'];
}

// A lap: the crosswind call (as a touch and go) and the field's normal calls, its 180 call
// last. A pattern PEL: the crosswind call (as a pattern PEL) and the PPEL/P calls, Pattern
// Low-Key last.
export function lapCalls(legs, pattern, mode) {
  const parts = partsOf(legComms(legs, pattern));
  const crosswind = parts.filter(is(/^Crosswind/i));
  if (mode === 'ppel') {
    return {
      before: callsOf([...crosswind, ...parts.filter(is(/PPEL\/P/i))]),
      after: callsOf(parts.filter((p) => OR.test(p.when) && /Pattern Low-Key/i.test(p.calls[0].text))),
      keywords: ['pattern PEL'],
    };
  }
  const field = fieldOfLeg(pattern);
  const arrival = choicesFrom(field).length
    ? Object.keys(legs || {}).find((id) => (feature(id)?.nextNode || []).includes(field) && partsOf(legComms(legs, id)).some(is(AT_180)))
    : null;
  return {
    before: callsOf([...parts.filter((p) => p.when === ''), ...crosswind]),
    after: arrival ? callsOf(partsOf(legComms(legs, arrival)).filter(is(AT_180))) : [],
    keywords: ['touch & go'],
  };
}

// The RDO directs a discontinued entry about one entry in three: a number from 0 to 1 that is
// the same for the same flight and entry, so the reducer stays pure.
export function chance(seed, n) {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// What the manual says to do when told to discontinue (Course Rules Manual 2-34, (8)(b)).
export const DISCONTINUE_RULE = [
  { text: 'Immediately turn away from the normal traffic pattern a minimum of [[90]] degrees off the inbound runway heading while maintaining [[break altitude]] until clear of the airfield.' },
];
export const DISCONTINUE_REF = { work: 'Course Rules Manual', loc: 'Ch. 2 — GOLIAD Discontinued Entry', pages: 'p. 2-34' };
