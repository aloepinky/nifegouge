// The Practice Flight's state: a pure reducer, so the whole flight can be walked in a test.
//
// The flight is a list of segments (a checklist, a run of calls, a choice of leg). A segment
// is turned into steps only when the flight reaches it, because what it holds can depend on
// what has been flown: the taxi calls name the departure, and a leg brings the checklists the
// guide says go with it (an Operations Check after check-in, the Pre-Stalling, Spinning and
// Aerobatic Checklist in a working area, the Descent Checklist leaving one, the Before Landing
// Checklist before every landing).
//
// A step is said (a checklist's name or a call), said by someone else (`auto`: it goes straight
// into the log), or a choice. A random EP freezes the flight where it is and drills that EP's
// memory steps, then the flight resumes or ends.
//
// Decisions come when a pilot makes them, not when the Course Rules page offers them: the
// working area is picked before engine start, as it is filed and briefed, and the course rules
// route to it is flown without asking; the runway is the ATIS's. Only from the area on is the
// flight picked leg by leg.

import {
  BEFORE_LANDING, CALLS, CHECKLISTS, EP_PHASES, FULL_STOP, GROUND, VOICE_REPORT, WHEN, WHEN_REF,
} from './famScript';
import {
  HOME, PLANS, TO_HOME, areaOf, choicesFrom, destinationsOf, fieldLabel, fieldOf, fieldsFor, groupOf,
  fieldsAhead, isAirfield, isArea, isPattern, labelOf, legCalls, nameOf, routeFromField, routeTo, routeToField, distancesTo,
  runwayOf, shortName, feature,
} from './legs';
import { fillCall, makeCard } from './card';
import {
  DISCONTINUE_REF, DISCONTINUE_RULE, canDiscontinue, chance, civilian, entryCalls, entryModes, fieldModes, fieldOfLeg, modeLabel,
  lapCalls, lapModes,
} from './fieldOps';
import { gradeStep } from './grade';
import { FTI, FTI_CALLOUTS, FTI_NUMBERS } from './ftiProcedures';
import {
  MANEUVERS, after, blockFor, ft, label as setupLabel, problemWith, setups, transit,
} from './highWork';
import { bandOf, fieldFigures, figuresOf, flyOn, radioOf } from './figures';
import { VT28 } from './vt28';
import { taxiIn, taxiOut } from './taxi';
import { EP_ANSWERS, EP_LENGTHS, EP_TITLES } from '../EPDivsData';

const clean = (s) => String(s).replace(/​/g, '').replace(/\s+/g, ' ').trim();

// "PEL - Execute" is said with the whole PEL, in the FTI's memory aid for the NATOPS PEL
// checklist (FAM FTI §704, p. 7-13).
const PEL_WORDS = 'Turn, climb/accelerate, clean, check, BIP, determine, deliver, reduce, lower, report';
const withPel = (step) => (/^PEL - EXECUTE$/i.test(step.trim()) ? `${step}\n${PEL_WORDS}` : step);

// Each EP's memory steps, in order: EP_ANSWERS is keyed step by step in EP_TITLES order, and
// EP_LENGTHS says how many steps each EP has.
export const EP_STEPS = (() => {
  const keys = Object.keys(EP_ANSWERS);
  let at = 0;
  return EP_LENGTHS.map((n) => keys.slice(at, (at += n)).map((k) => withPel(clean(EP_ANSWERS[k].join('')))));
})();

const COURSE_RULES = (id) => ({ work: 'Course Rules Manual', loc: labelOf(id) });

const GOLIAD = 'Point-default-38';
const TO_GOLIAD = distancesTo(GOLIAD);

// The departure asked for by name ("RUSTY"), or none for the Beach Line, which is asked for as
// plain "VFR" (Course Rules Manual 2-3, b(2)).
function departureName(s) {
  const dep = s.route && s.route[1];
  const m = /> (.+) Departures$/.exec(feature(dep)?.folderPath || '');
  return m && !/Beach/i.test(m[1]) ? m[1].toUpperCase() : null;
}

// What fills a call's blanks at this point in the flight (card.js does the filling).
function context(s, extra = {}) {
  const field = fieldOf(s.node);
  // The area being claimed is the planned one until the flight is in an area.
  const target = isArea(s.node) ? s.node : s.path && s.path[s.path.length - 1];
  const area = target ? /(\d+)\s*$/.exec(nameOf(target)) : null;
  // Which of a call's alternatives fit: the low-work field while it is still ahead, else the
  // working area; then wherever the leg being flown goes.
  const olfAhead = s.order === 'low' && s.olf && !s.route.includes(s.olf);
  const pel = s.entryPlan && s.entryPlan.mode === 'pel';
  const keywords = [
    ...(pel ? ['PPEL', 'High-Key'] : []),
    ...(s.recovery === 'straight' ? ['Straight-in'] : s.recovery === 'break' ? ['Full Stop'] : []),
    ...(olfAhead ? [shortName(s.olf), 'VFR to'] : s.plan ? [s.plan, s.plan.split(' ')[0]] : []),
    // The leg's own name first ("North to South Transition"), then where it goes.
    ...(extra.leg && nameOf(extra.leg).length > 3 ? [nameOf(extra.leg)] : []),
    ...(extra.leg ? destinationsOf(extra.leg).map((d) => String(d).split(' ')[0]) : []),
    ...(s.plan === 'KINGS 4' ? [s.card.block] : []),
  ];
  return {
    keywords,
    fieldCode: s.olf ? nameOf(s.olf) : undefined,
    // Home's runway is the ATIS's; an outlying field's is the one being flown to.
    rwy: (extra.leg && fieldOf(extra.leg) === 'KNGP') || s.node === HOME ? s.card.rwy : s.rwy || s.card.rwy,
    // To Ground, the departure by name, or plain VFR for the Beach Line (Course Rules Manual 2-3).
    intentions: departureName(s) ? `VFR ${departureName(s)}` : 'VFR',
    // A MUSTANG flight asks Departure for its half ("North MUSTANG"), not the transition leg.
    transition: /^MUSTANG (North|South)$/.test(s.plan || '') ? `${s.plan.split(' ')[1]} MUSTANG`
      : s.path && s.path[1] ? nameOf(s.path[1]) : undefined,
    nearest: field ? fieldLabel(field) : 'Navy Corpus',
    area: area ? area[1] : undefined,
    entry: s.entryPlan ? s.entryPlan.mode : undefined,
    ...extra,
  };
}

// --- Turning segments into steps ---------------------------------------------------------

// The course rules lead the second way a call can go with "Or…"; the call is said on its own.
const noteOf = (when) => {
  if (!when) return when;
  if (/^Or\s*(?:…|\.\.\.)\s*$/.test(when)) return null;
  return when.replace(/^Or\s+(\w)/, (m, c) => c.toUpperCase());
};

// Who a call is to, from its first words ("Corpus Departure, Boomer 710, ...").
const stationOf = (text) => String(text).split(',')[0].replace(/^99\s+/, '').trim();

// The buttons the guide's "Switching ..." calls go to (TW-4 In Flight Guide, p. 8).
const SWITCHING = {
  'Switching ATIS': ['CH 1 UHF', 'Navy Corpus ATIS'],
  'Switching Clearance': ['CH 2 UHF', 'Navy Corpus Clearance'],
  'Switching Channel 3': ['CH 3 UHF', 'Navy Corpus Ground'],
  'Switching Ground': ['CH 3 UHF', 'Navy Corpus Ground'],
  'Switching Base': ['CH 19 UHF', 'Boomer/Ranger Base'],
  'Switching Tower': ['CH 4 UHF', 'Navy Corpus Tower'],
};

function callSteps(calls, seg, s, ref, group, extra) {
  // At Goliad the RDO and the aircraft use the side number ("717"), not the whole call sign.
  const goliad = [extra && extra.leg, seg.leg, seg.legCalls, seg.out].some((x) => x && fieldOf(x) === 'KNGT');
  // The first time you give the RDO your call sign it is the whole of it ("Ranger 717").
  const base = context(s, extra);
  // On the CTAF ("Goliad traffic") it is always the whole call sign.
  const toRdo = (c) => c.who === 'you' && /^Goliad RDO/i.test(c.text);
  const named = s.log.some((l) => l.who === 'you' && /^Goliad RDO/i.test(l.text) && l.text.includes(s.card.callSign));
  const first = goliad && !named ? calls.findIndex(toRdo) : -1;
  return calls.map((c) => (SWITCHING[c.text] && !c.radio ? { ...c, radio: SWITCHING[c.text][0], station: SWITCHING[c.text][1] } : c)).map((c, i) => {
    const ctx = goliad && i !== first && !/^Goliad traffic/i.test(c.text) ? { ...base, sideOnly: true } : base;
    return {
    group,
    // Your calls are said and revealed; what the IP or a station says back is a step of its
    // own, to be heard and acknowledged; a note goes straight into the log.
    kind: c.who === 'you' ? 'call' : c.who === 'note' ? 'auto' : 'reply',
    who: c.who,
    radio: c.radio,
    text: fillCall(c.text, s.card, ctx),
    answer: fillCall(c.text, s.card, ctx),
    generated: c.generated,
    atis: c.atis,
    note: noteOf(c.note || c.when),
    after: c.after,
    example: c.example,
    // The channel the call is made on is where the readout's radio goes once it is said.
    sets: c.radio ? {
      ch: radioOf(c.radio),
      station: c.station || (c.who === 'you' ? stationOf(fillCall(c.text, s.card, ctx)) : c.who),
    } : null,
    ref: c.generated ? null : c.ref || ref,
    phase: seg.phase,
    stage: seg.stage,
    };
  });
}

// A normal checklist is one step: say which checklist it is, by its name ("Before Taxi").
// The guide's note on when it is run follows it into the log, so it doesn't give it away.
export const checklistName = (title) => title.replace(/ Checklist$/, '');

function checklistSteps(id, seg) {
  const cl = CHECKLISTS[id];
  const name = checklistName(cl.title);
  const base = { phase: seg.phase, stage: seg.stage, ref: cl.ref, checklist: name, memory: !!cl.memory };
  const steps = [{
    ...base,
    kind: 'checklist',
    who: 'you',
    text: cl.short || name,
    answer: [cl.short || name, name, ...(cl.also || [])],
  }];
  if (seg.when) steps.push({ ...base, kind: 'auto', who: 'note', text: seg.when, ref: seg.whenRef || cl.ref });
  return steps;
}

const departureLeg = (s) => s.route[1];

// "climb to 14,500 MSL", "Maintain 14,500' MSL": a climb through 10,000 ft.
const CLIMBS_HIGH = /\b(?:climb to|climb and maintain|maintain)\s+(?:\[\[)?1\d,?\d{3}/i;
const climbsHigh = (rule) => !!rule && rule.some((p) => CLIMBS_HIGH.test(p.text));

// A leg's course rule, said from memory: its paragraphs with the marked words (headings,
// altitudes, channels, airspeeds, fixes) blanked, revealed at once. Only a rule with marks.
const MARK = /\[\[([^[\]]+)\]\]/;
export const ruleOf = (s, id) => {
  const rule = (s.legs && s.legs[id] && s.legs[id].rule) || [];
  return rule.some((p) => MARK.test(p.text)) ? rule : null;
};

// A rule said from memory is revealed a paragraph at a time; each paragraph's figures
// (altitude, heading, airspeed, channel) go to the readout as it is revealed.
export const marked = (rule) => rule.map((p, i) => (MARK.test(p.text) ? i : -1)).filter((i) => i >= 0);
// A rule is said a piece at a time, so every change of altitude, airspeed, heading or channel is
// a point to stop and say it: each sentence with a blank is a piece, and a sentence that changes
// twice ("2500' MSL and 200 KIAS until clear of Class D airspace, then 240 KIAS") is two, split at
// its "then". A sentence with no blank goes with the piece before it (or after, leading). Each
// piece's figures go to the readout as it is revealed; a sentence for the other flow gives none.
export function piecesOf(rule, north) {
  const pieces = [];
  rule.forEach((p, para) => {
    if (p.heading || !MARK.test(p.text)) return;
    const cuts = [0];
    for (const m of p.text.matchAll(/(?<=\.)\s+(?=\S)|(?<=,\s+)(?=then\b)/g)) cuts.push(m.index + m[0].length);
    const spans = cuts.map((from, i) => ({ from, to: i + 1 < cuts.length ? cuts[i + 1] : p.text.length }));
    const joined = [];
    spans.forEach((sp) => {
      const text = p.text.slice(sp.from, sp.to);
      const last = joined[joined.length - 1];
      if (!MARK.test(text) && last) last.to = sp.to;
      else if (last && !MARK.test(p.text.slice(last.from, last.to))) last.to = sp.to;
      else joined.push({ ...sp });
    });
    joined.forEach((sp) => {
      const text = p.text.slice(sp.from, sp.to);
      const other = north ? /^\s*For South flow/i : /^\s*For North flow/i;
      pieces.push({ para, ...sp, figs: other.test(text) ? {} : figuresOf(text, { north }) });
    });
  });
  return pieces;
}

const ruleStep = (rule, s, rest) => ({
  kind: 'rule', who: 'you', group: 'rule', rule, pieces: piecesOf(rule, s.card.north), ...rest,
});

// The Course Rules Manual's own rule for every VFR departure (2-3): "Climb at 180 KIAS and level
// off at 200 KIAS. Once clear of Class D airspace (2.5nm), transit at 240 KIAS". Said on the leg
// after a departure whose rule does not give the 240 itself (the Beach Line's).
const CLASS_D = {
  text: 'Once clear of Class D airspace (2.5nm), transit at [[240]] KIAS unless otherwise required due to weather or directed by Corpus Approach.',
  cite: 'Course Rules Manual 2-3, VFR Departures',
};
const CLASS_D_REF = { work: 'Course Rules Manual', loc: 'Ch. 2 — VFR Departures', pages: 'p. 2-3' };
const needsClassD = (s, id) => s.route.length === 2 && s.route[0] === HOME && id !== s.route[1]
  && !((ruleOf(s, s.route[1]) || []).some((p) => /\[\[240\]\]/.test(p.text)));

function ruleSteps(id, seg, s) {
  const own = trimRule(ruleOf(s, id), seg.entry === 'pel' ? { ...s, pelEntry: true } : s, null);
  const rule = seg.classD ? [...(own || []), CLASS_D] : own;
  if (!rule || !rule.length) return [];
  return [ruleStep(rule, s, {
    leg: labelOf(id), phase: seg.phase, stage: seg.stage, text: `Course rules: ${labelOf(id)}`, ref: COURSE_RULES(id),
  })];
}

// A working area's course rule, split where the manual splits it: what is said entering the
// area (its altitudes and entry) and what is said leaving it. The KINGS 4 areas other than 1
// say "See Kings 1".
const KINGS_1 = 'Working Areas-King-203';
// MUSTANG 5-8 have only their special rules; the rest is their half's (North 1, South 3).
const MUSTANG_BASE = { 'MUSTANG North': 'Working Areas-Mustang-191', 'MUSTANG South': 'Working Areas-Mustang-197' };
const EXIT = /^(?:special\s+)?exit/i;
function areaRule(s, id) {
  // A MUSTANG area's rule is read whole even where it has no blanks (most have none yet).
  const whole = (x) => (s.legs && s.legs[x] && s.legs[x].rule && s.legs[x].rule.length ? s.legs[x].rule : null);
  const own = ruleOf(s, id) || (MUSTANG_BASE[groupOf(id)] && whole(id)) || null;
  const base = MUSTANG_BASE[groupOf(id)];
  if (own && base && base !== id && !own.some((p) => /Working altitudes/i.test(p.text))) {
    const split = (r) => { const cut = r.findIndex((p) => p.heading && EXIT.test(p.text)); return cut < 0 ? [r, []] : [r.slice(0, cut), r.slice(cut)]; };
    const [baseIn, baseOut] = split(whole(base) || []);
    const [ownIn, ownOut] = split(own);
    return [...baseIn, ...ownIn, ...baseOut, ...ownOut];
  }
  return own || (groupOf(id) === 'KINGS 4' ? ruleOf(s, KINGS_1) : null);
}

// The sentences of a rule that are this flight's: none for solos, none for MUSTANG areas other
// than the one being worked ("If working MUSTANG areas 5, 6, 7, or 8", "When complete Areas
// 5-8"), "If returning to KNGP" only when it is, and a way out of a MUSTANG half only for the
// arrival it names. A heading left with nothing under it goes too.
function trimRule(rule, s, out) {
  if (!rule) return rule;
  const target = isArea(s.node) ? s.node : s.path && s.path[s.path.length - 1];
  const mustang = /^MUSTANG/.test(groupOf(target) || '');
  const num = target ? (/(\d+)\s*$/.exec(nameOf(target)) || [])[1] : null;
  const going = out ? [labelOf(out), ...destinationsOf(out), ...fieldsAhead(out).map(nameOf)].join(' ') : null;
  const home = out ? out === HOME || fieldsAhead(out).includes(HOME) : null;
  const keep = (sentence) => {
    const t = sentence.replace(/\[\[|\]\]/g, '');
    if (/\bsolos?\b/i.test(t)) return false;
    if (mustang && num && /MUSTANG|\bareas\b/i.test(t)) {
      const m = /\bareas?\s+(\d(?:\s*(?:,|\/|-|or|and)\s*\d)*)/i.exec(t);
      if (m) {
        const nums = new Set();
        m[1].replace(/(\d)\s*-\s*(\d)/g, (x, a, b) => { for (let n = +a; n <= +b; n++) nums.add(String(n)); return ''; })
          .match(/\d/g)?.forEach((d) => nums.add(d));
        if (!nums.has(num)) return false;
      }
    }
    if (home === false && /^If returning to KNGP/i.test(t)) return false;
    // Into a field by a PEL, the initial, the break and the overhead are not flown.
    if (s.pelEntry && /\binitial\b|\bbreak\b|overhead maneuver|report the numbers/i.test(t)) return false;
    // At PT SHAMROCK the straight-in's own sentences (2-65) are for a straight-in only.
    if (s.recovery === 'break' && /straight-in|establish a descent and level off|^Approaching the initial reporting point/i.test(t)) return false;
    if (s.recovery === 'break' && /^For North flow traffic/i.test(t)) return false;
    if (going !== null && /^Departing (North|South) MUSTANG.*(northern|southern) arrival/i.test(t)) {
      return new RegExp(/northern/i.test(t) ? 'North Arrivals|Shamrock' : 'South Arrivals|Shamrock', 'i').test(going);
    }
    return true;
  };
  const kept = rule.map((p) => {
    if (p.heading) return p;
    const sentences = p.text.split(/(?<=\.)\s+(?=\S)/);
    const left = sentences.filter(keep);
    return left.length ? { ...p, text: left.join(' ') } : null;
  }).filter(Boolean);
  return kept.filter((p, i) => !p.heading || (kept[i + 1] && !kept[i + 1].heading));
}

export function areaRules(s, id) {
  const rule = trimRule(areaRule(s, id), { ...s, node: id }, s.heading);
  if (!rule) return { entry: null, exit: null };
  const cut = rule.findIndex((p) => p.heading && EXIT.test(p.text));
  // A paragraph for one way in or out ("NOLF Goliad to KINGS 4 MOA: ...", "If exiting MOA to go
  // to Goliad, ...") is said only by the flight that goes that way.
  const way = (p) => {
    const m = /^(?:NOLF\s+)?(\w+) to KINGS 4|^If exiting MOA to go to (\w+)/i.exec(p.text);
    const places = (r) => [labelOf(r), fieldOfLeg(r) ? fieldLabel(nameOf(fieldOfLeg(r))) : '', ...destinationsOf(r)].join(' ');
    return !m || [...s.route, ...(s.heading ? [s.heading] : [])].some((r) => new RegExp(m[1] || m[2], 'i').test(places(r)));
  };
  // A part with nothing to say is none; one with no blanks is still said (read through).
  const part = (r) => { const kept = r.filter(way); return kept.some((p) => !p.heading) ? kept : null; };
  const exits = rule.slice(cut + 1).filter((p) => !(p.heading && EXIT.test(p.text)));
  return cut < 0 ? { entry: part(rule), exit: null } : { entry: part(rule.slice(0, cut)), exit: part(exits) };
}
const areaId = (s, id) => (ruleOf(s, id) || groupOf(id) !== 'KINGS 4' ? id : KINGS_1);

// Calls made up for practice from the KNGP Diagram (taxi.js), on Ground.
const made = (list) => list.map(([who, text]) => ({ who, text, radio: who === 'you' ? 'CH 3 UHF' : undefined, generated: true }));

function taxiClearance(s, seg) {
  const way = taxiOut(s.card.rwy);
  if (!way) return callSteps(CALLS.clearance, seg, s, undefined, 'ground');
  return callSteps(made([
    ['GRD', `(call sign), taxi to runway {rwy} via ${way.via}`],
    ['you', `(call sign), taxi runway {rwy} via ${way.via}`],
  ]), seg, s, undefined, 'ground');
}

// "Clear, Left, Right and Above on 18" for each runway a taxi route crosses.
function crossings(s, seg, way) {
  return (way ? way.crossed : []).flatMap((r) => callSteps(CALLS.crossing, seg, s, undefined, 'crossing', { crossing: r }));
}

// The departure's own Ground call from the course rules, said from `position`; the guide's
// `fallback` where the course rules have none.
function groundCall(s, seg, fallback, position) {
  const own = legCalls(departureLeg(s), s.legs).ground;
  const dep = departureName(s);
  if (!own.length) return callSteps(CALLS[fallback], seg, s, undefined, 'ground', { position });
  return callSteps(own, seg, s, COURSE_RULES(departureLeg(s)), 'ground', { position, keywords: dep ? [dep] : [] })
    .map((c) => (dep && !/VFR/.test(c.text) ? { ...c, text: c.text.replace(new RegExp(`, ${dep}\\.$`), `, VFR ${dep}.`), answer: c.answer.replace(new RegExp(`, ${dep}\\.$`), `, VFR ${dep}.`) } : c));
}

function expand(seg, s) {
  if (seg.checklist) return checklistSteps(seg.checklist, seg);
  const north = s.card.north;
  // South Flow taxis to the Sierra run-up without a call; North Flow calls Ground from the
  // Compass Rose for the Echo run-up.
  if (seg.calls === 'taxiOut') {
    if (!north) return callSteps(CALLS.toSierra, seg, s, undefined, 'taxiOut');
    return [
      ...callSteps(CALLS.toCompassRose, seg, s, undefined, 'taxiOut'),
      ...groundCall(s, seg, 'groundNorth', 'Compass Rose'),
      ...callSteps(CALLS.toEcho, seg, s, undefined, 'ground'),
    ];
  }
  if (seg.calls === 'ground') {
    return [
      ...callSteps(CALLS.switchingGround, seg, s, undefined, 'ground'),
      ...(north ? callSteps(CALLS.furtherTaxi, seg, s, undefined, 'ground') : groundCall(s, seg, 'groundSouth', 'Sierra run-up')),
      ...(s.card.rwy === '13L' ? callSteps(CALLS.clearance13L, seg, s, undefined, 'ground') : taxiClearance(s, seg)),
    ];
  }
  // Clearing each runway the taxi crosses, out or back.
  if (seg.calls === 'crossing') return crossings(s, seg, taxiOut(s.card.rwy));
  // Back on the ground: Ground's call from where the runway was left, the route to the line and
  // its crossings, then the base calls.
  if (seg.calls === 'taxiBack') {
    const way = taxiIn(s.rwy || s.card.rwy);
    const [switching, ground, ...bases] = CALLS.taxiBack;
    const exit = way ? { exit: way.exit } : {};
    return [
      ...callSteps([switching, ground], seg, s, undefined, 'taxiBack', exit),
      ...(way ? [
        ...callSteps(made([
          ['GRD', `(call sign), taxi to the line via ${way.via}`],
          ['you', `(call sign), taxi to the line via ${way.via}`],
        ]), seg, s, undefined, 'taxiBack'),
        ...crossings(s, seg, way),
      ] : []),
      ...callSteps(bases, seg, s, undefined, 'taxiBack'),
    ];
  }
  // Only the flight the guide's sample clearance is for (VFR to KINGS 4) gets one.
  if (seg.calls === 'clearanceDelivery' && s.plan !== 'KINGS 4') return [];
  // The departure's own course rules calls, once airborne (the check-in with Departure is the
  // course rules', not the After Takeoff Checklist's).
  if (seg.calls === 'departure') {
    // A MUSTANG flight is given its area by Departure ("On initial check-in, Approach will
    // coordinate a working block"); the answer is made up for practice.
    const area = /^MUSTANG/.test(s.plan || '') && s.path ? /(\d+)\s*$/.exec(nameOf(s.path[s.path.length - 1])) : null;
    return [
      ...ruleSteps(departureLeg(s), seg, s),
      ...callSteps(legCalls(departureLeg(s), s.legs).air, seg, s, COURSE_RULES(departureLeg(s)), 'departure', { leg: departureLeg(s) }),
      ...(area ? callSteps([
        { who: 'DEP', text: `(call sign), Corpus Departure, radar contact, work MUSTANG ${area[1]}.`, generated: true },
        { who: 'you', text: `(call sign), work MUSTANG ${area[1]}.`, radio: 'CH 8 UHF', generated: true },
      ], seg, s, undefined, 'departure') : []),
    ];
  }
  if (seg.calls) return callSteps(CALLS[seg.calls].slice(...(seg.slice || [0])), seg, s, undefined, seg.calls);
  if (seg.rule) {
    return [...ruleSteps(seg.rule, seg, s), ...(seg.then ? callSteps(seg.then, seg, s, COURSE_RULES(seg.rule), 'leg', { leg: seg.rule }) : [])];
  }
  if (seg.kingsOut) {
    const { area, bound } = seg.kingsOut;
    const num = (/(\d+)\s*$/.exec(nameOf(area)) || [])[1];
    const block = s.card.block;
    const to = bound && nameOf(bound);
    const pel = s.entryPlan && s.entryPlan.mode === 'pel';
    const intent = to === 'KNGT' ? (pel ? 'PPEL Goliad' : 'Goliad') : to === 'KRKP' ? 'Aransas County' : 'Course Rules SHAMROCK';
    return callSteps([
      { who: 'you', radio: 'CH 22 VHF', text: `Houston Center, (call sign), Complete KINGS 4, Terminate${to === 'KNGT' ? ' Goliad' : ''}.` },
      { who: 'you', radio: 'CH 20 UHF', text: `99 KINGS 4, (call sign) departing area ${num} ${block}, ${intent}.` },
      { who: 'you', radio: 'CH 20 UHF', text: `99 KINGS 4, (call sign) clear of area ${num} ${block}.`, generated: true },
    ], seg, s, KINGS_EXIT_REF, 'leg', { leg: area });
  }
  if (seg.callList) {
    return callSteps(seg.callList, seg, s, seg.ref || COURSE_RULES(seg.leg), 'field',
      seg.keywords ? { keywords: seg.keywords } : { leg: seg.leg });
  }
  // An FTI procedure is said as its numbers only, a line at a time, for chair flying.
  if (seg.fti) {
    const proc = FTI[seg.fti];
    const rows = FTI_NUMBERS[seg.fti] || [];
    if (!rows.length) return [];
    // A high work maneuver is briefed to the IP first, said with its numbers: what it is, the
    // three Cs, the airspeed. Contact unusual attitudes are not: the IP has the controls.
    const m = seg.brief && MANEUVERS[seg.fti];
    const what = seg.fti === 'spin' ? `${m.brief} to the ${spinOf(s).side}` : m && m.brief;
    const brief = m && m.brief && seg.fti !== 'cuas'
      ? `Alright ${s.card.ip}, this next maneuver will be ${what}. We are three Cs complete${m.entry ? ` and at ${m.entry}` : ''}.`
      : null;
    const callouts = seg.fti === 'spin' && seg.brief ? spinOf(s).callouts : FTI_CALLOUTS[seg.fti] || [];
    return [{
      kind: 'numbers', who: 'you', group: 'fti', rows, brief, callouts, entry: brief && m.entry, phase: seg.phase, stage: seg.stage, ref: proc.ref,
      sets: brief && m.entry ? { kias: m.entry } : null,
      leg: `FAM FTI: ${proc.title}`, text: `FAM FTI: ${proc.title}`,
    }];
  }
  // Contact unusual attitudes: the IP puts the aircraft in an attitude and gives it back; the
  // student says what to do with the PCL, then the stick.
  if (seg.cua) {
    return ['pcl', 'stick'].map((part) => ({
      kind: 'choose', choose: 'cua', part, attitude: seg.cua, phase: seg.phase, stage: seg.stage, ref: FTI.cuas.ref,
      text: `${seg.cua.text}: ${part === 'pcl' ? 'PCL' : 'control stick'}`,
    }));
  }
  // A squadron memory aid, said from memory as a course rule is.
  if (seg.vt28) {
    const proc = VT28[seg.vt28];
    return [ruleStep(proc.rule, s, {
      phase: seg.phase, stage: seg.stage, ref: proc.ref, technique: true,
      leg: `VT-28 technique: ${proc.title}`, text: `VT-28 technique: ${proc.title}`,
    })];
  }
  if (seg.ruleList) {
    return [ruleStep(seg.ruleList, s, {
      leg: seg.label, phase: seg.phase, stage: seg.stage, text: seg.label, ref: seg.ref,
    })];
  }
  if (seg.legCalls) {
    const bound = seg.out && (fieldOfLeg(seg.out) || fieldsAhead(seg.out).find((f) => f !== HOME));
    const otherwise = bound && bound !== HOME ? `course rules to ${shortName(bound)}` : undefined;
    const straight = s.recovery === 'straight' && fieldOf(seg.legCalls) === 'KNGP';
    const calls = legCalls(seg.legCalls, s.legs).air.slice(...(seg.slice || [0])).filter((c) => !straight || !/Numbers/i.test(c.text));
    return callSteps(calls, seg, s, COURSE_RULES(seg.legCalls), 'leg', { leg: seg.out || seg.legCalls, otherwise })
      .map((c) => ({ ...c, leg: labelOf(seg.legCalls) }));
  }
  // Every other maneuver flown: no choice left. The altitude check, then the IP told the
  // student is ready for contact unusual attitudes, and one attitude, made up here.
  if (seg.choose === 'maneuver' && maneuversLeft(s)[0] === 'cuas') {
    let k = 0;
    const rng = () => chance(s.card.seed, 500 + (s.hwDone || 0) * 10 + k++);
    const handOver = `${s.card.ip}, ready for contact UAs.`;
    return [
      ...expand({ ...seg, choose: undefined, transit: true }, s),
      { kind: 'call', who: 'you', group: 'cua', text: handOver, answer: handOver, phase: seg.phase, stage: seg.stage, ref: FTI.cuas.ref },
      ...expand({ ...seg, choose: undefined, cua: cuaAttitude(rng) }, s),
    ];
  }
  if (seg.choose) return [{ kind: 'choose', choose: seg.choose, leg: seg.leg, field: seg.field, goliad: seg.goliad, phase: seg.phase, stage: seg.stage }];
  if (seg.setup) {
    return [{ kind: 'choose', choose: 'altitude', maneuver: seg.setup, phase: seg.phase, stage: seg.stage, text: MANEUVERS[seg.setup].label }];
  }
  // Before contact unusual attitudes: the altitude the high work spent getting to its setups.
  if (seg.transit) {
    const t = transit(s.hwFlown || [], s.block, s.block.arrive);
    const over = t.spent - t.best;
    return [{
      kind: 'reply', who: 'Altitude check', plain: true, phase: seg.phase, stage: seg.stage,
      text: `Between maneuvers you climbed ${ft(t.climbed)} and descended ${ft(t.descended)} for ${ft(t.spent)} total. `
        + `The minimum possible flying the same maneuvers in the optimal order (${t.order.map((m) => MANEUVERS[m].label.toLowerCase()).join(', ')}), was ${ft(t.best)}`
        + `${over > 0 ? `, so ${ft(over)} more than needed.` : '. No altitude wasted.'}`,
    }];
  }
  // A pattern PEL starts with the IP's simulated emergency: turn, climb, clean, then its step.
  if (seg.simEp) {
    const sim = SIM_EPS[seg.simEp];
    const base = { phase: seg.phase, stage: seg.stage, sim: sim.title, checklist: `Simulated ${sim.title.toLowerCase()}` };
    // Turn, climb, clean; then the EP's memory steps, said together.
    const answers = [TCC, sim.keys.map((k) => withPel(clean(EP_ANSWERS[k].join('')))).join('\n')];
    return [
      { ...base, kind: 'reply', who: 'ip', text: `Simulated, simulated, simulated, ${sim.call}.` },
      ...answers.map((text, n) => ({
        ...base, kind: 'response', who: 'you', text, answer: text, item: n + 1, of: answers.length,
        ref: n ? EP_PHASES[EP_TITLES.indexOf(sim.ep)].ref : seg.tccRef || FTI.patternPel.ref,
      })),
    ];
  }
  if (seg.ask) return [{ kind: 'ask', ask: seg.ask, phase: seg.phase, stage: seg.stage, text: WHEN.climb, ref: WHEN_REF.climb }];
  return [];
}

// --- Moving along -------------------------------------------------------------------------

const logOf = (step, result, said) => ({
  kind: step.kind,
  phase: step.phase,
  who: step.who,
  radio: step.radio,
  text: step.text,
  checklist: step.checklist,
  challenge: step.challenge,
  result,
  said,
  ep: step.ep,
  plain: step.plain,
});

const blank = () => ({ typed: '', result: '', first: '', shown: false, hint: false });

// The next leg of the planned route, when the flight is waiting on a leg choice and has not
// reached its working area. The area itself is part of the plan: the calls on the way claim it.
function planned(s) {
  const at = s.steps[s.at];
  if (s.done || !at || at.kind !== 'choose' || at.choose !== 'leg' || !s.path || s.planDone) return null;
  return s.path[s.path.indexOf(s.node) + 1] || null;
}

// Airborne, a call "with information" the ATIS is made only once it has been copied again: the
// ATIS is listened to first (it is good for an hour, so the one copied on deck is not).
function withAtis(steps, seg, s) {
  if (!AIRBORNE.has(seg.stage) || s.atisAirborne) return steps;
  const at = steps.findIndex((x) => x.kind === 'call' && /with information/i.test(x.text));
  if (at < 0) return steps;
  // Copied off the CTAF or the RDO, before going to Approach: after the last call on any other
  // station in this segment, or at its start (before a rule that sends the flight to Approach).
  let put = 0;
  steps.slice(0, at).forEach((x, i) => { if ((x.kind === 'call' || x.kind === 'reply') && !/Approach|Departure/i.test(x.text.split(',')[0])) put = i + 1; });
  return [...steps.slice(0, put), ...callSteps(CALLS.atis, seg, s, undefined, 'atis', { rwy: s.card.rwy }), ...steps.slice(put)];
}

// A spin's way round (briefed) and its callouts (the user's, 2026-10-25): the altitude on the
// altimeter as it starts, the setup plus the 700-800 feet gained slowing to it, and the
// airspeed, all different each spin.
function spinOf(s) {
  const n = s.hwDone || 0;
  const r = (k) => chance(s.card.seed, 300 + n * 10 + k);
  const [up, top] = MANEUVERS.spin.climbFirst;
  const at = (s.setupAt || 13500) + up + 50 * Math.floor(r(0) * ((top - up) / 50 + 1));
  const kts = 60 + 5 * Math.floor(r(1) * 7);
  const side = r(2) < 0.5 ? 'left' : 'right';
  return {
    side,
    callouts: [
      'Power coming to idle, nose coming up.',
      'Gear horn acknowledged.',
      'Stick shaker, little bit of rudder.',
      'Full stall.',
      `${(at / 1000).toFixed(1)}, stalled, ${kts} knots rising, full ${side}, recover, PCL idle, controls neutral, altitude checked, recover from unusual attitude.`,
      'Oil pressure in the green, power coming in.',
    ],
  };
}

const KINGS_EXIT_REF = { work: 'Course Rules Manual', loc: 'Ch. 2 — KINGS 4 MOA Exit', pages: 'p. 2-28' };
const PT_SHAMROCK = 'Point-Arrivals-113';
const STRAIGHT_IN_REF = { work: 'Course Rules Manual', loc: 'Ch. 2 — SNA VFR Straight-In from PT SHAMROCK', pages: 'p. 2-65' };

// Once off the ground the flight goes on the map.
const AIRBORNE = new Set(['afterTakeoff', 'airborne']);

// Go past the current step: pull the next segment when this one is used up, and put every
// line someone else says straight into the log, until a step waits on the student.
function step(s) {
  let { steps, at, segments, fly, airborne } = s;
  const log = [...s.log];
  at += 1;
  for (;;) {
    while (at >= steps.length) {
      if (!segments.length) return { ...s, steps, at, segments, log, fly, airborne, cur: blank(), done: true };
      const [seg, ...rest] = segments;
      segments = rest;
      if (seg.enterAs) {
        // Into the field the way decided in the area.
        const into = enter({ ...s, log, fly, airborne, segments, entryPlan: null }, seg.enterAs, (s.entryPlan && s.entryPlan.mode) || 'break');
        ({ segments } = into);
        s = { ...s, entries: into.entries, node: into.node, route: into.route, entryPlan: null };
        steps = [];
        at = 0;
        continue;
      }
      steps = withAtis(expand(seg, { ...s, segments }), seg, s);
      // What a segment says to fly (a field's break altitude at its initial) shows when the
      // flight gets there.
      if (seg.fly) fly = flyOn(fly, seg.fly.figs, seg.fly.from);
      if (AIRBORNE.has(seg.stage)) airborne = true;
      at = 0;
    }
    if (steps[at].kind !== 'auto') break;
    log.push(logOf(steps[at], 'auto'));
    at += 1;
  }
  return { ...s, steps, at, segments, log, fly, airborne, cur: blank() };
}

// A leg choice with one leg in it is no choice.
function onlyLeg(s) {
  const at = s.steps[s.at];
  if (s.done || s.ep || !at || at.kind !== 'choose' || at.choose !== 'leg') return null;
  const opts = options(s);
  return opts.length === 1 ? opts[0].id : null;
}

// ...and a leg the plan already decides is flown, not asked.
function advance(s) {
  let next = step(s);
  for (let n = 0; n < 50; n++) {
    const leg = planned(next) || onlyLeg(next);
    if (!leg) return next;
    const flown = { kind: 'route', phase: phaseOfLeg(leg, next.flags, next.route), who: 'route', text: labelOf(leg), result: 'auto' };
    next = step(fly({ ...next, log: [...next.log, flown] }, leg));
  }
  return next;
}

// `legs` is the course rules document's legs, for their radio calls; without it the flight
// still flies, with the study guide's own calls where a leg would have given its own.
// `card` overrides any part of the made-up flight card (the tests pin the runway).
export function start(legs = null, { rng = Math.random, card, fields = null } = {}) {
  return advance({
    legs, baseLegs: legs, fields, fly: {}, airborne: false, card: makeCard(rng, card), atisHeard: false, order: null, plan: null, olf: null, path: null, planDone: false, skipped: null,
    steps: [], at: -1, segments: GROUND, log: [], route: [HOME], node: HOME, rwy: null,
    entries: 0, alt: null, block: null, hwDone: 0, hwFlown: [],
    flags: { inArea: false, areaDone: false, descentDone: false },
    ep: null, done: false, ended: null, cur: blank(),
  });
}

export const current = (s) => (s.ep ? s.ep.steps[s.ep.at] : s.steps[s.at]);

// The options a choice step offers, as { id, label }.
export function options(s) {
  const now = current(s);
  if (!now) return [];
  if (now.kind === 'ask') {
    return [{ id: 'run', label: 'Climbing through 10,000 ft' }, { id: 'skip', label: 'Staying below 10,000 ft' }];
  }
  if (now.kind !== 'choose') return [];
  if (now.choose === 'order') {
    return [{ id: 'high', label: 'High work first' }, { id: 'low', label: 'Low work first' }];
  }
  if (now.choose === 'plan') {
    const pick = s.card.areaPick;
    return [...PLANS].sort((a, b) => (b.id === 'KINGS 4') - (a.id === 'KINGS 4'))
      .filter((p) => routeTo(p.id, s.card.rwy, pick) && (s.order !== 'low' || fieldsFor(p.id, s.card.rwy, pick).length))
      .map((p) => ({ id: p.id, label: p.label }));
  }
  if (now.choose === 'entry') {
    return entryModes(s.legs, now.leg).map((id) => ({ id, label: modeLabel(s.legs, fieldOfLeg(now.leg), id) }));
  }
  if (now.choose === 'entryPlan') {
    return fieldModes(s.legs, now.field).map((id) => ({ id, label: modeLabel(s.legs, now.field, id) }));
  }
  if (now.choose === 'altitude') {
    return setups(s.alt, s.block).map((a) => ({ id: String(a), label: setupLabel(a, s.alt) }));
  }
  if (now.choose === 'maneuver') {
    const flown = (s.hwFlown || []).map((f) => f.maneuver);
    return maneuversLeft(s).map((m) => ({ id: m, label: `${MANEUVERS[m].label}${flown.includes(m) ? ' (again)' : ''}` }));
  }
  if (now.choose === 'area') {
    return areasFor(s).map(({ id, pick }) => ({ id, label: nameOf(id), pick }));
  }
  if (now.choose === 'block') {
    return [{ id: 'high', label: 'High block' }, { id: 'low', label: 'Low block' }];
  }
  if (now.choose === 'cua') return CUA_ANSWERS[now.part];
  if (now.choose === 'checkout') {
    return [{ id: 'gooftwar', label: 'GOOFTWAR' }, { id: 'abcdont', label: 'ABCDONT' }];
  }
  if (now.choose === 'recovery') {
    return [{ id: 'break', label: 'Overhead break' }, { id: 'straight', label: 'Straight-in' }];
  }
  if (now.choose === 'lap') {
    return lapModes(s.legs, now.leg).map((id) => ({ id, label: modeLabel(s.legs, s.node, id) }));
  }
  if (now.choose === 'olf') {
    return fieldsFor(s.plan, s.card.rwy, s.card.areaPick).map((id) => ({ id, label: labelOf(id) }));
  }
  if (now.choose === 'field') {
    const field = s.node;
    const legs = choicesFrom(field).filter((id) => inUse(s, id))
      .map((id) => ({ id, label: isPattern(id) ? `Touch and go: ${labelOf(id)}` : labelOf(id) }));
    if (field === HOME) return [{ id: 'fullStop', label: 'Full stop' }, ...legs.filter((o) => isPattern(o.id))];
    // Low work done: the flight goes on to its working area by the course rules.
    if (!s.planDone && field === s.olf) {
      return [{ id: 'toArea', label: `Depart for ${s.plan}` }, ...legs.filter((o) => isPattern(o.id))];
    }
    return stillToDo(s, legs);
  }
  const all = choicesFrom(s.node).filter((id) => inUse(s, id));
  // Arriving at the planned working area: which of its areas.
  const areas = s.plan && !s.planDone ? all.filter((id) => groupOf(id) === s.plan) : [];
  return areas.length ? areas.map((id) => ({ id, label: labelOf(id) })) : stillToDo(s, all.map((id) => ({ id, label: labelOf(id) })));
}

// Once the high work is done no leg back into a working area is offered, once the low work is
// done none to an outlying field, and with both done only the way home. (Never all of them: a
// choice that would leave nothing keeps everything.)
function stillToDo(s, ids) {
  const high = s.flags.areaDone;
  const low = s.route.some((r) => isAirfield(r) && r !== HOME) && !isAirfield(s.node);
  const ok = (id) => {
    if (isPattern(id) || id === 'fullStop' || id === 'toArea') return true;
    const ahead = isAirfield(id) ? [id] : fieldsAhead(id);
    if (high && low) return id === HOME || ahead.includes(HOME);
    if (high && (isArea(id) || (!ahead.length && !isAirfield(id)))) return false;
    if (low && ahead.length && !ahead.includes(HOME)) return false;
    return true;
  };
  const kept = ids.filter((o) => ok(o.id));
  return kept.length ? kept : ids;
}

// Home's runway legs are only offered for the runway in use: the ATIS has given it, so an
// arrival or pattern for any other runway is not a choice. (Outlying fields have no ATIS here.)
function inUse(s, id) {
  if (fieldOf(id) !== 'KNGP') return true;
  const name = feature(id)?.name || '';
  if (!/^\d{2}[LRC]?(\/\d{2}[LRC]?)?$/.test(name)) return true;
  return name.split('/').includes(s.card.rwy);
}

// The flight's stages, as the strip at the top names them. Departure: home to the first working
// area or outlying field. Transit: between the two. Pattern: at an outlying field, from its entry
// to leaving it. Recovery: the course rules home. Landing: at home, from the entry to the full stop.
const phaseAt = (field) => (field === HOME ? 'Landing' : 'Pattern');

function phaseOfLeg(id, flags, route) {
  if (isArea(id)) return 'Working area';
  if (isPattern(id)) return fieldOf(id) === 'KNGP' ? 'Landing' : 'Pattern';
  if (isAirfield(id)) return phaseAt(id);
  const olfDone = route.some((r) => isAirfield(r) && r !== HOME);
  if (!flags.areaDone && !flags.inArea && !olfDone) return 'Departure';
  const ahead = fieldsAhead(id);
  const home = ahead.includes(HOME);
  const olf = ahead.some((f) => f !== HOME);
  if (home && !olf) return 'Recovery';
  if (olf && !home) return 'Transit';
  // A leg on to a working area, or one that can still go either way.
  return ahead.length && flags.areaDone && olfDone ? 'Recovery' : 'Transit';
}

// Where the flight is coming from, in words: the last working area or field and any transition
// flown since ("Mustang North 1 MUSTANG North", "KNGT Goliad").
function originOf(s) {
  const at = [...s.route].reverse().findIndex((r) => isArea(r) || isAirfield(r));
  if (at < 0) return '';
  const from = s.route[s.route.length - 1 - at];
  const since = s.route.slice(s.route.length - at);
  return [nameOf(from), isArea(from) ? groupOf(from) : shortName(from), ...since.map(nameOf)].join(' ').toLowerCase();
}

// A heading that names where a flight comes from ("North MUSTANG/South-North Transition:",
// "GOLIAD/KINGS 4 MOA"), and whether it is this flight's.
const ORIGIN = /MUSTANG|GOLIAD|KINGS|FOXTROT|CENTRAL|WALDRON|CABANISS|Transition/i;
const isOrigin = (heading) => !!heading && ORIGIN.test(heading) && !/^(?:special\s+)?(?:entry|exit)/i.test(heading);
const fromHere = (heading, origin) => heading.replace(/:\s*$/, '').split('/')
  .some((alt) => alt.toLowerCase().split(/[\s-]+/).filter(Boolean).every((w) => origin.includes(w)));

// The leg `id` with only its parts for this flight's way in: a rule's sections under another
// origin's heading are left out, and so are that origin's own calls (the ones that name its
// fixes or altitudes, "Over Woodsboro", "at 2500"). Where no heading is this flight's, all stay.
function legsFrom(s, id) {
  const base = s.baseLegs || s.legs;
  const leg = base && base[id];
  if (!leg) return base;
  const origin = originOf(s);
  const heads = (leg.rule || []).filter((p) => p.heading && isOrigin(p.text));
  if (!origin || !heads.length || !heads.some((h) => fromHere(h.text, origin))) return base;
  const rule = [];
  const others = [];
  let keep = true;
  (leg.rule || []).forEach((p) => {
    if (p.heading) keep = !isOrigin(p.text) || fromHere(p.text, origin);
    if (keep) rule.push(p);
    else if (!p.heading) others.push(p);
  });
  const theirs = new Set(others.flatMap((p) => [...p.text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].replace(/['~°]/g, '').trim()))
    .filter((w) => /[A-Za-z]/.test(w) || Number(w.replace(/,/g, '')) >= 100));
  const comms = [];
  let mine = true;
  (leg.comms || []).forEach((c) => {
    if (c.when && isOrigin(c.when)) mine = fromHere(c.when, origin);
    if (mine || ![...theirs].some((w) => c.text.includes(w))) comms.push(mine ? c : { ...c, when: isOrigin(c.when || '') ? '' : c.when });
  });
  return { ...base, [id]: { ...leg, rule, comms } };
}

// A Shamrock arrival that says to contact Corpus Approach but has no call for it: the check-in,
// made up for practice, where the flight has not already asked Approach for course rules
// Shamrock.
function shamrockCall(s, id) {
  if (!/Shamrock Arrivals$/.test(feature(id)?.folderPath || '') || s.shamrockCalled) return null;
  const text = ((s.legs && s.legs[id] && s.legs[id].rule) || []).map((p) => p.text.replace(/\[\[|\]\]/g, '')).join(' ');
  const m = /Corpus Approach \(CH (\d+)/i.exec(text);
  if (!m) return null;
  return [{ who: 'you', text: 'Corpus Approach, (call sign), course rules Shamrock with information (ATIS code)', radio: `CH ${m[1]} UHF`, generated: true }];
}

// Fly a leg: what comes with it goes in front of the rest of the flight.
function fly(s, id) {
  // A leg's rule and calls for the way this flight comes to it (KRKP's arrivals have a part for
  // the MUSTANG areas and one for Goliad and KINGS 4).
  s = { ...s, legs: legsFrom(s, id) };
  const flags = { ...s.flags };
  const air = { stage: 'airborne' };
  const segs = [];
  const planDone = s.planDone || (isArea(id) && groupOf(id) === s.plan);
  // Leaving a working area: the checks go with the leg out of it, before the area's exit rule.
  const leaving = phaseOfLeg(id, { ...flags, inArea: false, areaDone: true }, s.route);
  if (flags.inArea && !isArea(id)) {
    // Bound for an outlying field: break or PEL is decided in the area, before checking out,
    // since the check-out says which.
    const bound = fieldOfLeg(id) || fieldsAhead(id).find((f) => f !== HOME);
    if (bound && bound !== HOME && fieldModes(s.legs, bound).length > 1) segs.push({ ...air, phase: leaving, choose: 'entryPlan', field: bound });
    // Checking out of KINGS 4: GOOFTWAR bound for Goliad, ABCDONT otherwise, said before the
    // check-out with Houston Center (the exit rule). Both take in the Descent Checklist and the
    // Operations Check, so neither follows on its own.
    if (groupOf(s.node) === 'KINGS 4') {
      const goliad = /Goliad/.test(labelOf(id)) || destinationsOf(id).some((d) => /Goliad/.test(d));
      segs.push({ ...air, phase: leaving, choose: 'checkout', goliad });
      flags.descentDone = true;
    }
    const { exit } = areaRules({ ...s, heading: id }, s.node);
    // Out of the area, the heading is to where the leg goes.
    const to = fieldOfLeg(id) ? fieldLabel(nameOf(fieldOfLeg(id))) : destinationsOf(id)[0] || labelOf(id);
    const toward = { figs: { hdg: `toward ${to}` }, from: `leaving ${groupOf(s.node)}` };
    segs.push({ ...air, phase: leaving, ...(exit
      ? { ruleList: exit, label: `Course rules: leaving ${groupOf(s.node)}`, ref: COURSE_RULES(areaId(s, s.node)) }
      : {}), fly: toward });
    // An area's own calls are its check-out ("complete in MUSTANG 1").
    if (legCalls(s.node, s.legs).air.length) segs.push({ ...air, phase: leaving, legCalls: s.node, out: id });
    // KINGS 4 has no calls of its own in the document: the manual's check-out with Houston
    // Center and the departing call on Common, then clear of the area.
    if (groupOf(s.node) === 'KINGS 4') segs.push({ ...air, phase: leaving, kingsOut: { area: s.node, bound } });
  }
  if (flags.inArea && !isArea(id)) {
    flags.inArea = false;
    flags.areaDone = true;
    if (!flags.descentDone) {
      flags.descentDone = true;
      segs.push({ ...air, phase: leaving, checklist: 'descent', when: WHEN.descent, whenRef: WHEN_REF.descent });
    }
  }
  // Out of an outlying field and on to the working area: an Operations Check before entering
  // the block.
  if (isAirfield(s.node) && s.node !== HOME && !isPattern(id)) flags.opsDue = true;
  if (isArea(id) && flags.opsDue && !flags.inArea) {
    flags.opsDue = false;
    segs.push({ ...air, phase: phaseOfLeg(id, flags, s.route), checklist: 'ops', when: WHEN.opsPattern, whenRef: WHEN_REF.opsPattern });
  }
  const phase = phaseOfLeg(id, flags, s.route);
  const next = { ...s, flags, planDone };
  if (id === PT_SHAMROCK && !s.recovery) segs.push({ ...air, phase, choose: 'recovery' });
  // Home by a straight-in (Course Rules Manual 2-65): configured and the Before Landing Checklist
  // approaching the initial, then the base or final call, and a full stop.
  if (id === HOME && s.recovery === 'straight') {
    const last = [...s.route].reverse().find((r) => !isAirfield(r));
    const rwy = runwayOf(last) || s.card.rwy;
    const report = s.card.north ? 'right base, gear down' : 'final, gear down';
    const call = { who: 'you', text: `Navy Corpus Tower, (call sign), ${report}`, radio: 'CH 4 UHF', ref: STRAIGHT_IN_REF };
    return {
      ...next, node: id, rwy, route: [...s.route, id],
      segments: [
        ...segs,
        ...BEFORE_LANDING.map((b) => ({ ...b, phase: 'Landing' })),
        { stage: 'airborne', phase: 'Landing', callList: [call, ...CALLS.fullStop.slice(1)], ref: STRAIGHT_IN_REF, leg: last },
        ...FULL_STOP.filter((x) => x.fti !== 'approach' && x.calls !== 'fullStop'),
        ...s.segments,
      ],
    };
  }
  if (isAirfield(id)) {
    const f = patternFly(s, id, id === HOME ? s.card.rwy : s.rwy);
    segs.push({ ...air, phase, fti: 'theBreak', fly: f.initial });
    segs.push(...BEFORE_LANDING.map((b, i) => ({ ...b, phase, ...(i ? {} : { fly: f.downwind }) })));
    segs.push({ ...air, phase, choose: 'field' });
    return { ...next, node: id, route: [...s.route, id], segments: [...segs, ...s.segments] };
  }
  // Course rules are asked in transit. Round the pattern it is calls and procedures only, and
  // a leg into a field is asked during the RDO's calls (landing()).
  const entering = !isPattern(id) && fieldOfLeg(id) && fieldOfLeg(id) !== HOME ? entryModes(s.legs, id) : [];
  // A working area's rule is its entry half (the exit half is said leaving it).
  if (isArea(id)) {
    const { entry } = areaRules(s, id);
    if (entry && !flags.inArea) segs.push({ ...air, phase, ruleList: entry, label: `Course rules: ${groupOf(id)}`, ref: COURSE_RULES(areaId(s, id)) });
  } else if (ruleOf(s, id) && !isPattern(id) && !entering.length) segs.push({ ...air, phase, rule: id, classD: needsClassD(s, id) });
  else if (needsClassD(s, id)) segs.push({ ...air, phase, ruleList: [CLASS_D], label: 'Course rules: VFR departures', ref: CLASS_D_REF });
  // A rule that climbs through 10,000 ft (KINGS 4's "climb to 14,500 MSL") brings the Climb
  // Checklist straight after it.
  if (!flags.climbDone && climbsHigh(ruleOf(s, id))) {
    flags.climbDone = true;
    segs.push({ ...air, phase, checklist: 'climb', when: WHEN.climb, whenRef: WHEN_REF.climb });
  }
  // Into an outlying field with an RDO's calls: a break or a PEL is decided first.
  if (entering.length) {
    // The field's runway is the arrival's ("KNGT Arrivals 11").
    const arriving = { ...next, node: id, rwy: runwayOf(id) || s.rwy, route: [...s.route, id] };
    // Decided in the area (or only one way in): straight in. Otherwise decided now.
    const planned = s.entryPlan && s.entryPlan.field === fieldOfLeg(id) && entering.includes(s.entryPlan.mode) ? s.entryPlan.mode : null;
    if (entering.length > 1 && !planned && !segs.some((x) => x.choose === 'entryPlan')) {
      segs.push({ ...air, phase: 'Pattern', choose: 'entry', leg: id });
      return { ...arriving, segments: [...segs, ...s.segments] };
    }
    if (segs.some((x) => x.choose === 'entryPlan')) {
      // Leaving the area straight into the field: the choice made there decides the entry.
      segs.push({ ...air, phase: 'Pattern', enterAs: id });
      return { ...arriving, segments: [...segs, ...s.segments] };
    }
    // What leaving the area brings (its exit rule, check-out, Descent Checklist) comes first.
    const entered = enter({ ...arriving, entryPlan: null, segments: s.segments }, id, planned || 'break');
    return { ...entered, segments: [...segs, ...entered.segments] };
  }
  // A pattern's calls are its lap's (lap()), never the whole list.
  if (!isPattern(id) && !isArea(id) && legCalls(id, s.legs).air.length) {
    const calls = legCalls(id, s.legs).air;
    const claim = calls.findIndex((c) => /^99 KINGS 4/.test(c.text));
    if (claim >= 0 && !s.blockPicked) {
      if (claim > 0) segs.push({ ...air, phase, legCalls: id, slice: [0, claim] });
      if (!s.area) segs.push({ ...air, phase, choose: 'area' });
      segs.push({ ...air, phase, choose: 'block' }, { ...air, phase, legCalls: id, slice: [claim] });
    } else segs.push({ ...air, phase, legCalls: id });
  }
  else if (shamrockCall(s, id)) {
    const ruled = segs.findIndex((x) => x.rule === id);
    if (ruled >= 0) segs[ruled] = { ...segs[ruled], then: shamrockCall(s, id) };
    else segs.push({ ...air, phase, leg: id, callList: shamrockCall(s, id) });
  }
  if (isArea(id)) {
    if (!flags.inArea) {
      flags.inArea = true;
      // Elsewhere (the MUSTANG areas) whether the flight climbs through 10,000 ft is asked.
      if (!flags.climbDone) segs.push({ ...air, phase, ask: 'climb' });
      // Working the area, heading and airspeed are the maneuvers'.
      segs.push({ ...air, phase, checklist: 'psa', when: WHEN.psa, whenRef: WHEN_REF.psa, fly: { figs: { hdg: null, kias: null } } });
      // High work: each maneuver set up at an altitude the student picks, then said.
      const block = blockFor(groupOf(id), s.card.block);
      if (block) {
        segs.push({ ...air, phase, choose: 'maneuver' });
        return { ...next, flags, alt: block.arrive, block, hwFlown: [], node: id, route: [...s.route, id], segments: [...segs, { ...air, phase, choose: 'leg' }, ...s.segments] };
      }
    }
    segs.push({ ...air, phase, choose: 'leg' });
    return { ...next, node: id, route: [...s.route, id], segments: [...segs, ...s.segments] };
  }
  // Round the pattern (no Operations Check here): a normal lap or a pattern PEL is decided
  // first, where the field has calls for one.
  if (isPattern(id)) {
    const field = (feature(id).nextNode || []).find(isAirfield) || s.node;
    const at = { ...next, node: field, rwy: runwayOf(id) || s.rwy, route: [...s.route, id, field] };
    if (lapModes(s.legs, id).length > 1 && legCalls(id, s.legs).air.length) {
      return { ...at, segments: [...segs, { ...air, phase, choose: 'lap', leg: id }, ...s.segments] };
    }
    return lap({ ...at, segments: [...segs, ...s.segments] }, id, 'lap');
  }
  segs.push({ ...air, phase, choose: 'leg' });
  return { ...next, node: id, route: [...s.route, id], segments: [...segs, ...s.segments] };
}

// The landing at the end of an entry or a lap: the calls before the Before Landing Checklist,
// the checklist, the calls after it, then what to do at the field.
// `procs` are the FTI procedures and memory aids that go with it: `first` before the calls,
// `turn` after them (the break), `downwind` after the checklist (the transition and the 180).
// What a field's pattern is flown at, from its page in the course rules document: the initial
// at break altitude on runway heading, downwind at pattern altitude on the reciprocal, a PEL's
// high key and a pattern PEL's low key. Nothing where the document isn't loaded.
function patternFly(s, field, rwy) {
  const f = fieldFigures(s.fields && s.fields[field]);
  if (!f) return {};
  const at = (figs, what) => ({ figs, from: `${nameOf(field)} ${what}` });
  const hdg = f.heading(rwy);
  const recip = hdg && `${String((parseInt(hdg, 10) + 180) % 360).padStart(3, '0')}°`;
  // The pattern's 120 KIAS is the FTI's (§604 g, §606 a, §607 d).
  return {
    initial: at({ alt: f.break, hdg: hdg && `${hdg}, runway ${rwy}`, kias: null }, 'break altitude'),
    downwind: at({ alt: f.pattern, hdg: recip && `${recip}, downwind`, kias: '120 KIAS' }, 'pattern altitude'),
    upwind: at({ alt: f.pattern, hdg: hdg && `${hdg}, upwind`, kias: '120 KIAS' }, 'pattern altitude'),
    highKey: f.highKey ? at({ alt: f.highKey }, civilian(field) ? 'high overhead' : 'high key') : null,
    lowKey: f.lowKey ? at({ alt: f.lowKey }, civilian(field) ? 'high base' : 'low key') : null,
  };
}

function landing(s, phase, leg, calls, keywords, procs = {}, fly = {}) {
  const air = { stage: 'airborne', phase, leg, keywords };
  const said = (list = []) => list.map((p) => ({ ...air, ...p }));
  return [
    // Into a field: the landing call and the RDO's answer, then the field's course rule.
    ...(calls.opening ? [{ ...air, callList: calls.opening, fly: fly.opening }, ...(ruleOf(s, leg) ? [{ ...air, rule: leg }] : [])] : []),
    ...said(procs.first).map((p, i) => (i || !fly.first ? p : { ...p, fly: fly.first })),
    { ...air, callList: calls.before, fly: fly.before },
    ...(calls.discontinued ? [
      { ...air, callList: calls.discontinued },
      { ...air, ruleList: DISCONTINUE_RULE, label: 'Discontinued entry', ref: DISCONTINUE_REF },
      { ...air, callList: calls.again },
    ] : []),
    ...said(procs.turn),
    ...BEFORE_LANDING.map((b, i) => ({ ...b, phase, ...(i || !fly.downwind ? {} : { fly: fly.downwind }) })),
    ...said(procs.downwind),
    { ...air, callList: calls.after },
    { ...air, choose: 'field' },
  ];
}

const DOWNWIND = [{ fti: 'approach' }];
const ENTRY = {
  break: { first: [{ fti: 'olfEntry' }], turn: [{ fti: 'theBreak' }], downwind: DOWNWIND },
  pel: { first: [{ fti: 'pel' }] },
};
const LAP = {
  lap: { first: [{ fti: 'touchAndGo' }], downwind: DOWNWIND },
  ppel: { first: [{ fti: 'patternPel' }] },
};

// Setting up for Goliad's initial or high key, a position report with intentions on the CTAF
// (Course Rules Manual 2-30, which gives no wording; this is made up for practice): from the
// area worked, or from the point the arrival left.
function goliadTraffic(s, mode) {
  const area = [...s.route].reverse().find(isArea);
  const num = area && (/(\d+)\s*$/.exec(nameOf(area)) || [])[1];
  const from = s.route[s.route.length - 2];
  const where = num ? `departing ${num} ${s.card.block}` : `inbound from ${nameOf(from).replace(/^From\s+/, '')}`;
  const intent = mode === 'pel' ? 'for high key' : 'for the initial';
  return {
    who: 'you', radio: 'CH 15 VHF', station: 'Goliad CTAF', generated: true,
    text: `Goliad traffic, (call sign), ${where} ${intent} runway ${s.rwy}, Goliad`,
    note: 'Course Rules Manual 2-30: give position reports with intentions on CH 15 VHF while setting up for the 4 NM initial or high key.',
  };
}

// Enter an outlying field by a break or a PEL. About one break in three, where the field's
// calls have one, the RDO directs a discontinued entry: the student does as the manual says
// and calls the initial again.
function enter(s, leg, mode) {
  const field = fieldOfLeg(leg);
  const n = s.entries || 0;
  const discontinued = mode === 'break' && canDiscontinue(s.legs, leg) && chance(s.card.seed, n) < 1 / 3;
  const found = entryCalls(s.legs, leg, mode, discontinued);
  const calls = fieldOf(leg) === 'KNGT' ? { ...found, opening: [...(found.opening || []), goliadTraffic(s, mode)] } : found;
  const f = patternFly(s, field, s.rwy);
  const fly = mode === 'pel' ? { before: f.highKey, downwind: f.lowKey } : { before: f.initial, downwind: f.downwind };
  // Into the field's pattern, done with Center on the VHF.
  const segs = landing(s, phaseAt(field), leg, calls, undefined, ENTRY[mode], { ...fly, opening: { figs: { vhf: null } } })
    .map((x) => (x.rule === leg ? { ...x, entry: mode } : x));
  return { ...s, entries: n + 1, node: field, route: [...s.route, field], segments: [...segs, ...s.segments] };
}

// The emergencies an IP simulates to start a pattern PEL, and the memory steps that follow
// turn, climb, clean (FAM FTI §705 a-c): the chip light's (TO 1T-6B-1CL-1, CHIP DETECTOR
// WARNING), high fuel flow's (HIGH FUEL FLOW), and a fire light's with the fire not confirmed
// (FIRE IN FLIGHT, "IF FIRE IS NOT CONFIRMED").
const TCC = 'Turn, climb, clean';
const SIM_EPS = {
  chip: { call: 'chip light', title: 'Chip light', ep: 'CHIP DETECTOR WARNING', keys: ['cdw1', 'cdw2'] },
  fuelFlow: { call: 'high fuel flow', title: 'High fuel flow', ep: 'HIGH FUEL FLOW', keys: ['hff1'] },
  fire: { call: 'fire light', title: 'Fire light', ep: 'FIRE IN FLIGHT', keys: ['fif5'] },
};
const SIM_ORDER = Object.keys(SIM_EPS);
// Before a PEL into a field: one of them, then turn, climb, clean (FAM FTI §704).
const simulated = (s, now) => ({
  ...seg(now), stage: 'airborne', tccRef: FTI.pel.ref,
  simEp: SIM_ORDER[Math.floor(chance(s.card.seed, 250 + (s.entries || 0)) * SIM_ORDER.length)],
});

function lap(s, pattern, mode) {
  const calls = lapCalls(s.legs, pattern, mode);
  const phase = fieldOf(pattern) === 'KNGP' ? 'Landing' : 'Pattern';
  const f = patternFly(s, s.node, s.rwy);
  const fly = mode === 'ppel' ? { first: f.upwind, downwind: f.lowKey } : { first: f.upwind, downwind: f.downwind };
  const laps = s.laps || 0;
  const sim = mode === 'ppel' ? [{ stage: 'airborne', phase, simEp: SIM_ORDER[Math.floor(chance(s.card.seed, 200 + laps) * SIM_ORDER.length)] }] : [];
  return { ...s, laps: laps + 1, segments: [...sim, ...landing(s, phase, pattern, calls, calls.keywords, LAP[mode], fly), ...s.segments] };
}

// A segment where a step is, for what a choice puts after it.
const seg = (now) => ({ phase: now.phase, stage: now.stage });

// The brief, after the plan: which of its areas, KINGS 4's block, and (low work first) the
// field; then the flight is planned off the runway in use and goes.
function briefNext(s) {
  const at = { phase: 'Preflight', stage: 'preflight' };
  const ask = (choose) => advance({ ...s, segments: [{ ...at, choose }, ...s.segments] });
  // A MUSTANG area is Departure's to give; a KINGS 4 area and block are picked in the air, right
  // before claiming them on KINGS 4 Common.
  if (!s.area && !/^MUSTANG|^KINGS 4$/.test(s.plan || '')) return ask('area');
  if (s.order === 'low') return ask('olf');
  const path = routeTo(s.plan, s.card.rwy, s.card.areaPick);
  return advance({
    ...s, path, node: path[0], rwy: s.card.rwy, route: [HOME, path[0]],
    segments: [...s.segments, { phase: 'Departure', stage: 'airborne', choose: 'leg' }],
  });
}

// A setup altitude typed for a maneuver (setups() offers the usual ones).
function setUp(s, now, typed) {
  const at = typedAltitude(typed);
  if (at === null) return { ...s, cur: { ...s.cur, result: 'incorrect', problem: 'Type an altitude, like 17500 or 17.5.' } };
  const problem = problemWith(now.maneuver, at, s.block);
  if (problem) return { ...s, cur: { ...s.cur, result: 'incorrect', problem } };
  const n = s.hwDone || 0;
  const alt = after(now.maneuver, at, chance(s.card.seed, 100 + n));
  const label = MANEUVERS[now.maneuver].label;
  const logged = { ...s, log: [...s.log, { ...logOf(now, 'choice'), text: setupLabel(at, s.alt), who: 'choice' }] };
  // The readout has the setup altitude while the maneuver is said, and where it left you after.
  return advance({
    ...logged, alt, setupAt: at, hwDone: n + 1, lastManeuver: now.maneuver, altTrack: [...(s.altTrack || []), at, alt],
    hwFlown: [...(s.hwFlown || []), { maneuver: now.maneuver, at, alt }],
    fly: flyOn(s.fly, { alt: `${ft(at)} MSL` }, `set up for the ${label.toLowerCase()}`),
    pendingAlt: { figs: { alt: `${ft(alt)} MSL` }, from: `after the ${label.toLowerCase()}` },
  });
}

// The maneuvers still to fly, in the block's order: the G-Warm first, contact unusual attitudes
// last, the rest in the order the student picks.
// A power-on stall can be flown again, to climb (to the spin's altitude, say), up to three in
// all; once every maneuver has been flown, contact unusual attitudes are all that is left.
const MAX_POWER_ON = 3;
function maneuversLeft(s) {
  const flown = (s.hwFlown || []).map((f) => f.maneuver);
  const order = s.block ? s.block.order : [];
  if (!flown.includes('gWarm')) return ['gWarm'];
  const left = order.filter((m) => m !== 'gWarm' && m !== 'cuas' && !flown.includes(m));
  if (!left.length) return ['cuas'];
  const again = flown.filter((m) => m === 'powerOnStall').length < MAX_POWER_ON;
  // The ones not yet flown first, in the block's order; another power-on stall last.
  return [...left, ...(again && !left.includes('powerOnStall') ? ['powerOnStall'] : [])];
}

// The areas of the plan a flight can be filed to off the runway in use, each with the `pick`
// that names it to the route search (areaOf).
function areasFor(s) {
  const all = (PLANS.find((p) => p.id === s.plan) || {}).areas || [];
  return all.map((id, i) => ({ id, pick: (i + 0.5) / all.length }))
    .filter(({ pick }) => routeTo(s.plan, s.card.rwy, pick) && (s.order !== 'low' || fieldsFor(s.plan, s.card.rwy, pick).length))
    .sort((a, b) => nameOf(a.id).localeCompare(nameOf(b.id), 'en', { numeric: true }));
}

// The setup altitude as typed: "17500", "17,500", "17.5" (thousands).
export function typedAltitude(text) {
  const t = String(text).replace(/[,'\s]|ft|msl/gi, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Math.round((n < 100 ? n * 1000 : n) / 50) * 50;
}

// Contact unusual attitudes (FAM FTI §906): a nose-high attitude is recovered with the PCL to
// MAX and a roll past 90° towards inverted until the nose approaches the horizon; a nose-low one
// with the PCL to IDLE and a roll to the nearest horizon; near inverted, rolling the shortest
// way upright, adding power as required.
const CUA_ANSWERS = {
  pcl: [{ id: 'max', label: 'MAX' }, { id: 'idle', label: 'IDLE' }, { id: 'asReq', label: 'As required' }],
  stick: [
    { id: 'noseHigh', label: 'Roll past 90° AOB towards inverted until the nose approaches the horizon, then back stick to the nearest horizon' },
    { id: 'noseLow', label: 'Roll to the nearest horizon, then raise the nose to the horizon' },
    { id: 'inverted', label: 'Roll in the shortest direction to upright' },
  ],
};
const CUA_RIGHT = { high: { pcl: 'max', stick: 'noseHigh' }, low: { pcl: 'idle', stick: 'noseLow' }, inverted: { pcl: 'asReq', stick: 'inverted' } };

// An attitude the IP gives back: nose high and slow, nose low and fast, or near inverted.
export function cuaAttitude(rng = Math.random) {
  const rolls = [rng(), rng(), rng(), rng(), rng()];
  const r = (k) => rolls[k];
  const type = ['high', 'low', 'inverted'][Math.floor(r(0) * 3)];
  const side = r(1) < 0.5 ? 'left' : 'right';
  const step = (lo, hi, k, by = 5) => lo + by * Math.floor(r(k) * ((hi - lo) / by + 1));
  if (type === 'high') {
    const pitch = step(30, 60, 2); const bank = step(0, 60, 3, 10);
    return { type, text: `Nose ${pitch}° high, ${bank ? `${bank}° ${side} wing down` : 'wings level'}` };
  }
  if (type === 'low') {
    const pitch = step(30, 60, 2); const bank = step(30, 90, 3, 10);
    return { type, text: `Nose ${pitch}° low, ${bank}° ${side} wing down` };
  }
  const bank = step(150, 180, 3); const pitch = step(0, 10, 2);
  // Near inverted, said as what the instruments show, not named.
  return { type, text: `${bank}° of bank to the ${side}, nose ${pitch ? `${pitch}° low` : 'on the horizon'}` };
}

function choose(s, id, rng = Math.random) {
  const now = current(s);
  // A setup altitude is typed, any altitude at all; one that breaks the block or the maneuver
  // is refused, and said why.
  if (now && now.choose === 'altitude') return setUp(s, now, id);
  const opt = options(s).find((o) => o.id === id);
  if (!opt) return s;
  const logged = { ...s, log: [...s.log, { ...logOf(now, 'choice'), text: opt.label, who: 'choice' }] };
  if (now.kind === 'ask') {
    const segs = id === 'run' ? [{ phase: now.phase, stage: now.stage, checklist: 'climb' }] : [];
    return advance({ ...logged, flags: { ...s.flags, climbDone: id === 'run' }, segments: [...segs, ...s.segments] });
  }
  if (now.choose === 'order') return advance({ ...logged, order: id });
  // A PEL picked, here or in the area: the IP's simulated emergency comes straight after.
  if (now.choose === 'entry') {
    const into = enter(logged, now.leg, id);
    return advance(id === 'pel' ? { ...into, segments: [simulated(logged, now), ...into.segments] } : into);
  }
  if (now.choose === 'entryPlan') {
    const planned = { ...logged, entryPlan: { field: now.field, mode: id } };
    return advance(id === 'pel' ? { ...planned, segments: [simulated(logged, now), ...s.segments] } : planned);
  }
  if (now.choose === 'lap') return advance(lap(logged, now.leg, id));
  if (now.choose === 'checkout') return advance({ ...logged, segments: [{ ...seg(now), vt28: id }, ...s.segments] });
  if (now.choose === 'recovery') return advance({ ...logged, recovery: id });
  // A maneuver picked: set it up, brief it, say its numbers, then pick the next. Before the
  // last, contact unusual attitudes, the altitude spent getting to the setups.
  if (now.choose === 'maneuver') {
    // Contact unusual attitudes are never picked: they follow the last maneuver (expand).
    const segs = [
      { ...seg(now), setup: id }, { ...seg(now), fti: id, brief: true },
      { ...seg(now), choose: 'maneuver' },
    ];
    return advance({ ...logged, segments: [...segs, ...s.segments] });
  }
  // An unusual attitude: the PCL, then the stick. A wrong one is said so, and tried again.
  if (now.choose === 'cua') {
    if (CUA_RIGHT[now.attitude.type][now.part] !== id) {
      return { ...s, cur: { ...s.cur, result: 'incorrect', problem: `Not for ${now.attitude.text.toLowerCase()}.` } };
    }
    const said = { ...logOf(now, s.cur.result ? 'partial' : 'correct'), text: `${now.text}: ${opt.label}`, who: 'you' };
    return advance({ ...s, log: [...s.log, said] });
  }
  if (now.choose === 'area') {
    const picked = { ...logged, area: id, card: { ...s.card, areaPick: opt.pick } };
    if (now.phase === 'Preflight') return briefNext(picked);
    // Picked in the air: the route ends in it instead.
    const prev = s.path && s.path[s.path.length - 2];
    const path = prev && choicesFrom(prev).includes(id) ? [...s.path.slice(0, -1), id] : s.path;
    return advance({ ...picked, path });
  }
  if (now.choose === 'block') return advance({ ...logged, blockPicked: true, card: { ...s.card, block: id } });
  // The working area (and, for low work first, the field), picked in the brief. They fix the
  // departure off the runway in use (flown after takeoff) and the course rules route on.
  const depart = (st, path) => advance({
    ...st, path, node: path[0], rwy: s.card.rwy, route: [HOME, path[0]],
    segments: [...st.segments, { phase: 'Departure', stage: 'airborne', choose: 'leg' }],
  });
  if (now.choose === 'plan') return briefNext({ ...logged, plan: id, area: null, blockPicked: false });
  if (now.choose === 'olf') return depart({ ...logged, olf: id }, routeToField(id, s.card.rwy));
  if (id === 'toArea') {
    const path = routeFromField(s.olf, areaOf(s.plan, s.card.areaPick));
    return advance(fly({ ...logged, path }, path[0]));
  }
  if (id === 'fullStop') {
    const last = [...s.route].reverse().find((r) => !isAirfield(r));
    const rwy = runwayOf(last) || s.rwy;
    return advance({ ...logged, rwy, segments: [...FULL_STOP, ...s.segments] });
  }
  return advance(fly(logged, id));
}

// --- Skipping a stage ---------------------------------------------------------------------

// The choice a skip makes: a full stop at home, otherwise the leg fewest legs from home (a
// departure rather than another pattern, at an outlying field).
// Skipped through, a flight is the usual one: high work in KINGS 4, then Goliad, then home.
function skipChoice(s, target) {
  const now = current(s);
  if (now.kind === 'ask') return 'skip';
  const opts = options(s).map((o) => o.id);
  if (now.choose === 'plan' && opts.includes('KINGS 4')) return 'KINGS 4';
  if (now.choose === 'olf' && opts.includes(GOLIAD)) return GOLIAD;
  if (now.choose === 'altitude') return opts.find((a) => !problemWith(now.maneuver, Number(a), s.block)) || opts[0];
  if (now.choose === 'cua') return CUA_RIGHT[now.attitude.type][now.part];
  if (now.choose === 'block') return s.card.block;
  if (now.choose === 'checkout') return now.goliad ? 'gooftwar' : 'abcdont';
  if (['order', 'plan', 'area', 'olf', 'entry', 'entryPlan', 'lap', 'maneuver', 'recovery'].includes(now.choose)) return opts[0];
  if (now.choose === 'leg' && (s.flags.areaDone || s.flags.inArea)) {
    if (!s.route.includes(GOLIAD) && opts.some((id) => TO_GOLIAD[id] !== undefined)) {
      return opts.reduce((best, id) => ((TO_GOLIAD[id] ?? 99) < (TO_GOLIAD[best] ?? 99) ? id : best), opts[0]);
    }
  }
  if (target === 'Pattern' && now.choose === 'field') {
    const pattern = opts.find((id) => isPattern(id));
    if (pattern) return pattern;
  }
  if (opts.includes('toArea')) return 'toArea';
  if (opts.includes('fullStop')) return 'fullStop';
  const legs = now.choose === 'field' ? opts.filter((id) => !isPattern(id)) : opts;
  const pool = legs.length ? legs : opts;
  return pool.reduce((best, id) => ((TO_HOME[id] ?? 99) < (TO_HOME[best] ?? 99) ? id : best), pool[0]);
}

// Run the rest of the stage: every step said for you and every choice made, until the flight
// is into the next stage. What the student would have been told on the way (clearances, the
// legs flown, what was picked) is kept to show them.
function skipPhase(s, target) {
  const from = current(s)?.phase;
  const before = s.log.length;
  for (let n = 0; n < 3000 && !s.done; n++) {
    const now = current(s);
    if (!now || (now.phase !== from && now.kind !== 'auto')) break;
    if (now.kind === 'reply') s = answered(s, 'heard');
    else s = TYPED.has(now.kind) ? answered(s, 'skipped') : choose(s, skipChoice(s, target));
  }
  const told = s.log.slice(before).filter((l) => l.result === 'choice' || l.kind === 'route'
    || (l.kind === 'reply' && l.who !== 'ip'));
  return { ...s, skipped: { phase: from, told } };
}

// Skip stage after stage until the flight is in `target` (or over).
function skipTo(s, target) {
  const from = current(s)?.phase;
  const told = [];
  for (let n = 0; n < 60 && !s.done && current(s)?.phase !== target; n++) {
    s = skipPhase(s, target);
    told.push(...s.skipped.told);
  }
  return { ...s, skipped: { phase: from, to: target, told } };
}

// --- The student's actions ----------------------------------------------------------------

// What saying a step leaves on the readout: a call's channel, every paragraph of a rule not
// yet revealed, and after a maneuver, the altitude it left you at.
function flown(s, now) {
  let fly = s.fly || {};
  if (now.sets) fly = flyOn(fly, now.sets, now.leg || null);
  if (now.kind === 'rule' && now.pieces) {
    now.pieces.slice(s.cur.upTo || 0).forEach((p) => { fly = flyOn(fly, p.figs, now.leg); });
  }
  if (now.kind === 'numbers' && s.pendingAlt) return { ...s, fly: flyOn(fly, s.pendingAlt.figs, s.pendingAlt.from), pendingAlt: null };
  return { ...s, fly };
}

// How many lines of a step are revealed one at a time: a rule's marked paragraphs, a
// procedure's numbers; everything else at once.
// A call's channel is asked first only when the call switches to it; on the channel already
// set, the call is all there is to say.
// A callout in brackets or parentheses is a reminder or a cue: shown, not said.
export const isCue = (line) => /^[[(].*[\])]\.?$/.test(line);
export const switchesChannel = (step, fly) => {
  if (step.kind !== 'call' || !step.radio || !/CH\s*\d/.test(step.radio)) return false;
  const ch = radioOf(step.radio);
  const on = fly && fly[bandOf(ch)];
  return !on || on.v !== ch;
};
export const linesOf = (step, fly) => (step.kind === 'rule' ? Math.max(1, (step.pieces || []).length)
  : step.kind === 'numbers' ? step.rows.filter((r) => r[1] !== null).length + (step.brief ? 1 : 0)
    + (step.callouts || []).filter((c) => !isCue(c)).length
    : switchesChannel(step, fly) ? 2 : 1);

// Reveal the next line (or `all` of them); a rule's paragraphs up to it go to the readout.
function reveal(s, all) {
  const now = current(s);
  // Whether the call switches is judged before its channel is set.
  const total = s.cur.total || linesOf(now, s.fly);
  const was = s.cur.upTo || 0;
  const upTo = all ? total : Math.min(total, was + 1);
  let { fly } = s;
  // A call's channel (and a brief's airspeed) is its first line; the channel it replaces is
  // kept to show.
  let chFrom = s.cur.chFrom;
  if (now.sets && upTo >= 1 && was < 1) {
    if (now.sets.ch) chFrom = (fly[bandOf(now.sets.ch)] || {}).v || null;
    fly = flyOn(fly, now.sets, now.leg || null);
  }
  if (now.kind === 'rule' && now.pieces) {
    now.pieces.slice(was, upTo).forEach((p) => { fly = flyOn(fly, p.figs, now.leg); });
  }
  return { ...s, fly, cur: { ...s.cur, upTo, chFrom, total, shown: upTo >= total } };
}

function answered(s, result) {
  const now = current(s);
  if (now.atis) s = { ...s, atisHeard: true, atisAirborne: s.airborne };
  if (now.kind === 'call' && /^Corpus Approach,.*Shamrock/i.test(now.text)) s = { ...s, shamrockCalled: true };
  if (!s.ep) s = flown(s, now);
  const entry = logOf(now, result, s.cur.typed);
  if (s.ep) {
    const ep = { ...s.ep, at: s.ep.at + 1, log: [...s.ep.log, entry] };
    return { ...s, log: [...s.log, { ...entry, ep: ep.title }], ep: { ...ep, done: ep.at >= ep.steps.length }, cur: blank() };
  }
  return advance({ ...s, log: [...s.log, entry] });
}

// The steps the student says (and reveals); the other kinds are said for them or are choices.
export const TYPED = new Set(['call', 'response', 'checklist', 'rule', 'numbers']);

export function reduce(s, action) {
  if (action.type === 'legs') return { ...s, legs: action.legs, baseLegs: action.legs, fields: action.fields || s.fields };
  if (action.type === 'skipPhase') return s.done || s.ep ? s : skipPhase(s);
  if (action.type === 'skipTo') return s.done || s.ep ? s : skipTo(s, action.phase);
  const out = act(s, action);
  // What a skip told you stays on screen until the flight moves on.
  return out.skipped && (out.at !== s.at || out.steps !== s.steps || out.ep !== s.ep) ? { ...out, skipped: null } : out;
}

function act(s, action) {
  if (s.done && action.type !== 'restart') return s;
  const now = current(s);
  switch (action.type) {
    case 'restart':
      return start(s.baseLegs || s.legs, { fields: s.fields, card: { squadron: s.card.squadron } });
    case 'squadron': {
      // Boomer (VT-27) or Ranger (VT-28): the call sign from here on.
      const card = { ...s.card, squadron: action.squadron, callSign: `${action.squadron} ${s.card.side}` };
      return { ...s, card };
    }
    case 'type':
      return { ...s, cur: { ...s.cur, typed: action.text, result: '' } };
    case 'check': {
      if (!now || s.cur.shown || !now.typed) return s;
      const result = gradeStep(s.cur.typed, now);
      if (!result) return s;
      const first = s.cur.first || result;
      if (result === 'correct') return answered({ ...s, cur: { ...s.cur, first } }, first === 'correct' && !s.cur.hint ? 'correct' : 'partial');
      return { ...s, cur: { ...s.cur, result, first } };
    }
    case 'hint':
      return { ...s, cur: { ...s.cur, hint: true } };
    case 'reveal':
      if (now && now.kind === 'reply') return answered(s, 'heard');
      return now && TYPED.has(now.kind) && !s.cur.shown ? reveal(s, false) : s;
    case 'revealAll':
      return now && TYPED.has(now.kind) && !s.cur.shown ? reveal(s, true) : s;
    case 'next':
      // A step is said and then revealed; one marked `typed` that was revealed was looked up.
      // A reply is heard and acknowledged.
      if (now && now.kind === 'reply') return answered(s, 'heard');
      return s.cur.shown ? answered(s, now.typed ? 'shown' : 'said') : s;
    case 'forward':
      // One key through the flight: reveal what is to be said, then go on; a reply, go on.
      if (!now || s.ep?.done) return s;
      if (now.kind === 'reply') return answered(s, 'heard');
      if (!TYPED.has(now.kind)) return s;
      return s.cur.shown ? answered(s, now.typed ? 'shown' : 'said') : reveal(s, false);
    case 'choose':
      return choose(s, action.id, action.rng);
    case 'randomEp':
      return randomEp(s, action.rng || Math.random);
    case 'resume':
      return s.ep?.done ? { ...s, ep: null, cur: blank() } : s;
    case 'end':
      return { ...s, done: true, ended: s.ep?.title || 'Ended', ep: null, cur: blank() };
    default:
      return s;
  }
}

// --- Emergencies --------------------------------------------------------------------------

export function stageOf(s) {
  return current(s)?.stage || null;
}

export function epsFor(s) {
  const stage = stageOf(s);
  return EP_PHASES.map((p, i) => ({ ...p, i })).filter((p) => p.when.includes(stage));
}

function randomEp(s, rng) {
  if (s.ep) return s;
  const fit = epsFor(s);
  if (!fit.length) return s;
  const pick = fit[Math.floor(rng() * fit.length)];
  const base = { phase: 'Emergency', stage: stageOf(s), ep: EP_TITLES[pick.i], ref: pick.ref };
  const steps = EP_STEPS[pick.i].map((text, n) => ({
    ...base, kind: 'response', who: 'you', text, answer: text, item: n + 1, of: EP_STEPS[pick.i].length,
    challenge: EP_TITLES[pick.i],
  }));
  if (stageOf(s) === 'airborne' || stageOf(s) === 'afterTakeoff') {
    steps.push({ ...base, kind: 'response', who: 'you', text: VOICE_REPORT.answer, answer: VOICE_REPORT.answer, challenge: VOICE_REPORT.prompt, ref: VOICE_REPORT.ref, voice: true });
  }
  return {
    ...s,
    ep: { title: EP_TITLES[pick.i], ends: !!pick.ends, ref: pick.ref, steps, at: 0, log: [], done: false },
    log: [...s.log, { phase: 'Emergency', who: 'ep', text: EP_TITLES[pick.i], result: 'auto', ep: EP_TITLES[pick.i] }],
    cur: blank(),
  };
}

export { nameOf, fieldOf };
