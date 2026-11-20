// The T-44C Practice Flight's state: a pure reducer, so a whole flight can be walked in a test.
// It is its own flight, apart from the T-6's engine.js, which is built on the T-6's course rules.
//
// A flight is a run of stages in the order of the FTI's Figure 1-1. A stage is a list of steps,
// made when the flight reaches it, because what it holds depends on what has been flown. A step
// is a call (said, with any answer), a checklist (said by name), a rule (revealed piece by
// piece), a table of numbers, or a choice.

import { RUNWAYS, drawWind, homeRunwaysForWind, three } from '../card';
import { taxiIn, taxiOut } from '../taxi';
import { hasMarks, markFigures, unmark } from './marks';
import { T44C_EPS } from '../../T44C/t44cData';
import { CALLS, CHECKLISTS, EMERGENCY_BRIEFS, GENERATED } from './script';
import {
  AREAS, BEACHLINE_FIRST, BEACHLINE_LAST, BEACHLINE_REF, BEACHLINE_RUNWAY, CAB_INITIAL,
  CHEETAH_BLOCKS, ENTRY, EXIT, FOXTROT_LOW, KNGP_SIDE, KNGW_RUNWAYS, KNGW_SIDE, SEAGULL_BLOCKS, SHAMROCK_FIRST,
  SHAMROCK_REF, SHAMROCK_RUNWAY, SOUTHERN_ENTRY, SOUTHERN_OUT, SOUTHERN_PATTERN, SOUTHERN_PATTERN_REF, SUNRISE_ARRIVAL,
  SUNRISE_ENTRY, SUNRISE_OUT, TO_SUNRISE,
} from './routes';
import {
  CLEAN_STALL_RECOVERY, CLIMB_OUT,EMERGENCY_DESCENT, FULL_STOP, LINE_UP, MANEUVERS, MIN_ALT, PRE_STALL, PROFILES, SHUTDOWN,
  STALL_RECOVERY, TAKEOFF_ROLL, sseAltitudes,
} from './numbers';
import { drawCase } from './pattern/patternModel';
import { continues, endOf, lapLabel, lapLog, nextLaps, runwayIdOf, waveoffAt } from './patternLaps';

export { PROFILES };

// Pattern is every lap at either field, so a flight that works Cabaniss is in Pattern again after its
// Recovery to Navy Corpus. Landing is the full stop.
export const PHASES = ['Preflight', 'Ground Ops', 'Takeoff', 'Departure', 'Area Entry', 'High Work', 'Area Exit', 'Transit', 'Pattern', 'Recovery', 'Landing', 'Taxi back'];

const PHONETIC = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India',
  'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango',
  'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const ft = (n) => n.toLocaleString('en-US');
const angle = (a, b) => Math.abs(((Number(a) - b + 540) % 360) - 180);

// The closest of Cabaniss's runways to the wind; ties go to the first listed.
export const cabanissRunway = (windDir) => KNGW_RUNWAYS.reduce((best, r) => (angle(windDir, r.hdg) < angle(windDir, best.hdg) ? r : best)).rwy;
const group = (rwy) => (['13', '18'].includes(rwy) ? 13 : 31);

// What is made up for one flight, drawn once so that going back never changes it.
export function makeCard(rng = Math.random, given = {}) {
  const wind = drawWind(rng);
  // Only Montana (VT-31) flies the T-44 now.
  const prefix = 'MNTNA';
  const number = given.number || String(between(rng, 10, 99));
  const homes = homeRunwaysForWind(wind.windDir);
  const rwy = given.rwy || pick(rng, homes).rwy;
  return {
    prefix,
    number,
    callSign: `${prefix} ${number}`,
    atis: pick(rng, PHONETIC),
    windDir: wind.windDir,
    windSpeed: wind.windSpeed,
    altimeter: `${between(rng, 29, 30)}.${String(between(rng, 0, 99)).padStart(2, '0')}`,
    rwy,
    seagullBlock: given.seagullBlock || between(rng, 2, 4),
    cheetahPick: rng(),
    engine: pick(rng, ['left', 'right']),
    cabRwy: cabanissRunway(wind.windDir),
  };
}

// A new wind for the card: drawn at random, near a chosen KNGP runway (Primary's wind), or a typed
// direction; the runways at both fields follow it.
export function withWind(card, rng, mode, typedDir) {
  const preset = RUNWAYS.find((r) => r.rwy === mode);
  const drawn = drawWind(rng, preset ? preset.hdg : null);
  const windDir = typedDir !== undefined && /^\d{1,3}$/.test(String(typedDir)) ? three(Math.round(Number(typedDir) / 10) * 10) : drawn.windDir;
  const homes = homeRunwaysForWind(windDir);
  const rwy = preset && homes.some((r) => r.rwy === preset.rwy) ? preset.rwy : pick(rng, homes).rwy;
  return { ...card, windDir, windSpeed: typedDir !== undefined ? card.windSpeed : drawn.windSpeed, rwy, cabRwy: cabanissRunway(windDir) };
}

function blockFor(area, card) {
  const a = AREAS[area];
  if (a.family === 'seagull') {
    const b = SEAGULL_BLOCKS[card.seagullBlock];
    return { ...b, n: card.seagullBlock, label: `Block ${card.seagullBlock}` };
  }
  if (a.family === 'foxtrot') return { ...FOXTROT_LOW, label: 'Low Block' };
  const letters = Object.keys(CHEETAH_BLOCKS[area]);
  const letter = letters[Math.floor(card.cheetahPick * letters.length)];
  return { ...CHEETAH_BLOCKS[area][letter], letter, label: `Block ${letter}` };
}

// The way to a runway from the Echo run-up, where every T-44 starts (Course Rules Manual 3-1):
// Primary's routes. Primary leaves for the South Flow runways from Sierra, so those routes join
// Charlie from Echo by Yankee and Bravo, the way Primary's South Flow traffic comes back.
function taxiFromEcho(rwy) {
  return taxiOut(rwy).via.replace(/^Sierra/, 'Yankee, Bravo');
}

export function vars(s) {
  const c = s.card;
  const a = AREAS[s.area] || {};
  const home = s.field !== 'KNGW';
  const fieldRwy = home ? c.rwy : c.cabRwy;
  const b = s.block || {};
  return {
    cs: c.callSign,
    spot: 'Compass Rose',
    taxiOut: taxiFromEcho(c.rwy),
    taxiIn: taxiIn(c.rwy).via,
    exit: taxiIn(c.rwy).exit,
    atis: c.atis,
    wind: `${c.windDir} at ${c.windSpeed}`,
    altimeter: c.altimeter,
    rwy: c.rwy,
    cabRwy: c.cabRwy,
    fieldRwy,
    goal: a.family === 'seagull' ? 'Seagull' : a.family === 'foxtrot' ? 'Foxtrot' : 'Cheetah',
    briefGoal: a.family === 'seagull' ? `block ${b.word} ${a.word}` : a.name,
    area: a.name,
    areaWord: a.word,
    blockWord: b.word,
    blockN: b.n,
    blockLetter: b.letter,
    radial: a.radial === '156' ? '156' : '100',
    dme: a.dme,
    leaving: b.bottom ? ft(b.bottom) : '',
    dest: s.dest === 'KNGW' && a.radial === '156' ? 'Southern entry to Cabaniss' : 'Shamrock',
    approachTo: s.dest === 'KNGW' && a.radial === '156' ? 'Southern entry to Cabaniss' : 'course rules Shamrock',
    // RWY 36 from the south is direct to the numbers (Course Rules Manual p. 3-26).
    cabReport: c.cabRwy === '36' ? 'proceed direct to the numbers runway 36' : `report initial runway ${c.cabRwy}`,
    position: a.family === 'foxtrot' ? 'abeam Rockport' : 'abeam Baffin Bay',
    intent: 'Touch-and-Go',
    tower: home ? 'Navy Corpus Tower' : 'Cabaniss Tower',
    towerCh: home ? 'CH 4' : 'CH 15',
    side: home ? KNGP_SIDE[c.rwy] : KNGW_SIDE[c.cabRwy],
    cleared: 'option',
    engine: c.engine,
    baseName: 'Montana',
    one: 'number one',
    Engine: c.engine === 'left' ? 'Left' : 'Right',
  };
}

export const fill = (text, s, extra) => {
  const v = { ...vars(s), ...extra };
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (v[k] === undefined ? m : v[k]));
};

const fillFly = (fly, s) => {
  if (!fly) return null;
  const out = {};
  Object.entries(fly).forEach(([k, val]) => { out[k] = fill(val, s); });
  return out;
};

const call = (s, phase, def, extra = {}) => ({
  kind: 'call', phase, who: def.who, radio: def.radio ? fill(def.radio, s, extra.vars) : null,
  text: fill(def.text, s, extra.vars), ref: def.ref || null, generated: extra.generated === undefined ? (def.generated === undefined ? !def.ref : def.generated) : extra.generated, when: extra.when || null, lead: extra.lead || [], replies: extra.replies || [], fly: extra.fly || null, from: extra.from || null, note: extra.note || null,
});
const reply = (s, def, vs) => ({ who: def.who, text: fill(def.text, s, vs), generated: def.generated === undefined ? !def.ref : def.generated });
const auto = (s, phase, def, note) => ({ kind: 'auto', phase, who: def.who, radio: fill(def.radio, s), text: fill(def.text, s), generated: true, note: note || null });
const checklist = (phase, c) => ({ kind: 'checklist', phase, name: c.title, ref: c.ref });
// A rule as the T-6's are shown: its paragraphs with the figures marked. Only a paragraph with a
// figure is a stop; what a plain one puts on the readout goes with the stop beside it.
function rule(s, phase, title, r, given) {
  const paras = (given || r.pieces).map((x) => ({ text: markFigures(fill(x.t, s)), fly: fillFly(x.fly, s) }));
  const stops = [];
  let waiting = null;
  paras.forEach((p, para) => {
    if (hasMarks(p.text)) {
      stops.push({ para, from: 0, to: p.text.length, fly: waiting || p.fly ? { ...waiting, ...p.fly } : null });
      waiting = null;
    } else if (p.fly) {
      if (stops.length) stops[stops.length - 1].fly = { ...stops[stops.length - 1].fly, ...p.fly };
      else waiting = { ...waiting, ...p.fly };
    }
  });
  return { kind: 'rule', phase, title, ref: r.ref, leg: r.leg || null, rule: paras.map(({ text }) => ({ text })), pieces: stops, fly: waiting };
}
const numbers = (s, phase, title, def, vs) => ({
  kind: 'numbers', phase, title, ref: def.ref,
  rows: def.rows.map(([label, value]) => [label, value === null ? null : fill(value, s, vs)]),
});
// A prop lever row puts its setting on the readout.
export const isPropRow = (label) => /^prop$|prop levers?/i.test(label);
const choose = (phase, on, prompt, options) => ({ kind: 'choose', phase, on, prompt, options });

// Terminating with Departure or Approach, and the controller's answer.
const terminate = (s, phase) => call(s, phase, CALLS.approachTerminate, { replies: [reply(s, GENERATED.approachTermReply), reply(s, GENERATED.freqRead)] });
const terminateDeparture = (s, phase) => call(s, phase, CALLS.departureTerminate, { replies: [reply(s, GENERATED.departureTermReply), reply(s, GENERATED.freqRead)] });

// The Descent Checklist is run from a block above 10,000 feet, upon initial descent from it (FTI
// App. F, p. F-22). The Cruise Checklist is left out (the user's ruling, 2026-11-14).
const high = (s) => s.block.top > 10000;
const descent = (s, P) => (high(s) ? [checklist(P, CHECKLISTS.descent)] : []);

function entrySteps(s) {
  const P = 'Area Entry';
  const a = AREAS[s.area];
  const est = { alt: `${ft(s.block.bottom)}-${ft(s.block.top)}'` };
  const name = `To ${a.name}`;
  // Each transition is drawn from where this runway's departure crosses the beach.
  const from = (r) => ({ ...r, leg: `${r.leg} ${s.card.rwy}` });
  if (s.area === 'seagull-n') {
    const e = ENTRY['seagull-n'];
    return [
      rule(s, P, name, from(e.before)),
      terminateDeparture(s, P),
      call(s, P, GENERATED.seagullNorthCheckIn),
      rule(s, P, name, e.after),
      call(s, P, CALLS.seagullEstablished, { fly: est }),
    ];
  }
  if (a.family === 'seagull') {
    return [
      rule(s, P, name, from(ENTRY.central.before)),
      terminateDeparture(s, P),
      call(s, P, CALLS.seagullCheckIn),
      call(s, P, CALLS.seagullEstablished, { fly: est }),
    ];
  }
  if (a.family === 'foxtrot') {
    return [
      rule(s, P, name, from(ENTRY.foxtrot.before)),
      rule(s, P, 'Foxtrot entry', ENTRY.foxtrot.entry),
      terminateDeparture(s, P),
      call(s, P, GENERATED.foxtrotEntry, { fly: est }),
    ];
  }
  return [
    rule(s, P, name, from(ENTRY.cheetah.before)),
    rule(s, P, 'Cheetah entry', ENTRY.cheetah.entry),
    call(s, P, GENERATED.cheetahBase, { fly: est }),
  ];
}

// ---- The stages. Each returns its steps; NEXT says what follows it.

const STAGES = {
  plan: () => [choose('Preflight', 'area', 'Which working area is this flight planned for?',
    Object.entries(AREAS).map(([id, a]) => ({ id, label: a.name, legs: [a.poly] })))],

  // Before takeoff, each exchange is one step: the PF's direction, the PM's call, the answer, the
  // PM's reply. The checklists are only named, where they fall.
  ground: (s) => {
    const P = 'Ground Ops';
    const named = (k) => checklist(P, CHECKLISTS[k]);
    const r = (def) => reply(s, def);
    const steps = [
      named('beforeStart'), named('rightStart'), named('leftStart'), named('afterStart'),
      { ...call(s, P, GENERATED.atis, { when: 'After Start Checklist, at MFD', lead: [r(CALLS.pfAtis)] }), atis: true },
      call(s, P, CALLS.base, { when: 'After Start Checklist, at Transponder', lead: [r(CALLS.pfBase), r(CALLS.pmRoger)], replies: [r(GENERATED.baseReply)] }),
      call(s, P, GENERATED.ground, { when: 'At the Compass Rose', lead: [r(CALLS.pfGround)], replies: [r(GENERATED.groundReply), r(GENERATED.groundRead)] }),
      named('runup'), named('beforeTakeoff'),
    ];
    if (AREAS[s.area].family === 'seagull') {
      steps.push(call(s, P, CALLS.seagullBlocks, { when: 'Before Takeoff Checklist, at FMS', lead: [r(CALLS.pfFms), r(CALLS.iHave), r(CALLS.youHave)], replies: [r(GENERATED.seagullAssigns), r(GENERATED.seagullReadback)] }));
    }
    steps.push(call(s, P, CALLS.crewBrief, {
      when: 'Before Takeoff Checklist, at Crew',
      replies: [r(GENERATED.toldBrief), r(CALLS.anyQuestions), r(GENERATED.pmNo), r(CALLS.briefed)],
      fly: { props: 'Full forward' },
      from: 'Crew brief',
    }));
    steps.push(call(s, P, CALLS.furtherTaxi, { when: 'Before Takeoff Checklist, after Crew', lead: [r(CALLS.holdYellow), r(CALLS.outOfYellow)], replies: [r(GENERATED.groundFurther), r(GENERATED.furtherRead)] }));
    steps.push(call(s, 'Takeoff', CALLS.numberOne, { when: 'Approaching the hold short', lead: [r(CALLS.pfTower)], generated: AREAS[s.area].family !== 'seagull', replies: [r(GENERATED.towerClears), r(CALLS.cleared)] }));
    return steps;
  },

  takeoff: (s) => {
    const P = 'Takeoff';
    const runway = BEACHLINE_RUNWAY[s.card.rwy];
    return [
      call(s, P, CALLS.clearLeftAbove, { replies: [reply(s, CALLS.clearRightAbove)] }),
      call(s, P, CALLS.continueChecklist),
      numbers(s, P, LINE_UP.title, LINE_UP),
      call(s, P, CALLS.checkedLeft, { replies: [reply(s, CALLS.checkedRight)] }),
      numbers(s, P, TAKEOFF_ROLL.title, TAKEOFF_ROLL),
      call(s, P, CALLS.rotate, { fly: { kias: '91 rotate' } }),
      numbers(s, P, CLIMB_OUT.title, CLIMB_OUT),
      rule(s, 'Departure', `Beachline departure, runway ${s.card.rwy}`, { ref: BEACHLINE_REF, leg: `Beachline departure ${s.card.rwy}`, pieces: [...BEACHLINE_FIRST, ...runway, ...BEACHLINE_LAST] }),
      call(s, 'Departure', GENERATED.departure, { when: 'When directed by Tower', lead: [reply(s, GENERATED.towerSwitch)], replies: [reply(s, GENERATED.departureReply), reply(s, GENERATED.departureRead)] }),
      checklist('Departure', CHECKLISTS.climb),
    ];
  },

  entry: (s) => entrySteps(s),

  highWork: (s) => {
    if (s.profile) {
      let briefed = false;
      const flown = PROFILES[s.profile].flatMap((id) => {
        const steps = maneuverSteps(s, id, briefed);
        briefed = briefed || !!MANEUVERS[id].stall;
        return steps;
      });
      return [numbers(s, 'High Work', MIN_ALT.title, MIN_ALT), ...flown];
    }
    const left = Object.entries(MANEUVERS).filter(([id]) => !s.flown.includes(id));
    const options = left.map(([id, m]) => ({ id, label: m.label }));
    if (s.flown.length) options.push({ id: 'done', label: 'Done, leave the area' });
    const first = s.flown.length ? [] : [numbers(s, 'High Work', MIN_ALT.title, MIN_ALT)];
    return [...first, choose('High Work', 'maneuver', s.flown.length ? 'Which maneuver next?' : 'High work: which maneuver first?', options)];
  },

  exit: (s) => {
    const P = 'Area Exit';
    const a = AREAS[s.area];
    if (a.family === 'seagull' && !s.dest) {
      return [choose(P, 'dest', 'Where are you going from the area?', [
        { id: 'KNGP', label: 'Navy Corpus' },
        { id: 'KNGW', label: 'Cabaniss' },
      ])];
    }
    const cab = s.dest === 'KNGW';
    // FTI §105's mnemonics, shown above each of their own steps: A-C-A-S-A to Cabaniss,
    // A-B-C to Navy Corpus (the user's ruling: A-B-C from every area; briefed before the
    // Approach Checklist, whose crew brief step is then just "briefed").
    const acasa = a.family === 'seagull' && cab;
    const letter = (step, letters, at) => ({ ...step, mnemonic: { letters, at } });
    const brief = call(s, P, CALLS.touchAndGoBrief, { replies: [reply(s, CALLS.anyQuestions), reply(s, GENERATED.pmNo), reply(s, CALLS.briefed)] });
    // The courtesy call and the request are one exchange: App. B, "Wait for Approach Control to
    // answer you, then go ahead with your request."
    const approach = call(s, P, CALLS.approachFirst, { replies: [reply(s, GENERATED.approachHello), reply(s, CALLS.approachRequest), reply(s, GENERATED.approachContact), reply(s, GENERATED.approachRead)] });
    const steps = [
      letter({ ...auto(s, P, GENERATED.atisAir), atis: true }, acasa ? 'ACASA' : 'ABC', 0),
    ];
    if (acasa) {
      steps.push(letter(call(s, P, GENERATED.cabanissAsk, { replies: [reply(s, GENERATED.cabanissRunway)] }), 'ACASA', 1));
      steps.push(letter(checklist(P, CHECKLISTS.approach), 'ACASA', 2));
      steps.push(brief);
    } else {
      steps.push(letter(brief, 'ABC', 1));
      steps.push(letter(checklist(P, CHECKLISTS.approach), 'ABC', 2));
    }
    const late = (step, at) => (acasa ? letter(step, 'ACASA', at) : step);
    const other = call(s, P, GENERATED.approachOther, { replies: [reply(s, GENERATED.approachContact), reply(s, GENERATED.approachRead)] });
    if (a.family === 'seagull') {
      steps.push(rule(s, P, 'Seagull exit', EXIT.common));
      // The descent radial is drawn on the map from the check-out with Seagull; its page follows
      // the call to Approach (the user's ruling).
      const radial = s.area === 'seagull-s'
        ? rule(s, P, 'South Seagull exit', cab ? EXIT.southCabaniss : EXIT.southHome)
        : rule(s, P, 'North and Central Seagull exit', EXIT.northCentral);
      steps.push({ ...late(call(s, P, CALLS.seagullLeaving), 3), leg: radial.leg });
      steps.push(late(approach, 4));
      steps.push(radial, ...descent(s, P));
      if (s.profile) steps.push(numbers(s, P, EMERGENCY_DESCENT.title, EMERGENCY_DESCENT));
      else {
        steps.push(choose(P, 'descent', 'Emergency descent on the descent radial?', [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No' },
        ]));
      }
      if (s.area === 'seagull-s' && !cab) steps.push(rule(s, 'Transit', 'Southern Arrival', EXIT.southernArrival));
      if (s.area !== 'seagull-s') steps.push(rule(s, 'Transit', 'Eastern Arrival', EXIT.easternArrival));
    } else if (a.family === 'foxtrot') {
      // The first piece is said in the block; the route out is drawn with the second.
      steps.push(rule(s, P, 'Foxtrot exit', { ...EXIT.foxtrot, leg: null }, EXIT.foxtrot.pieces.slice(0, 1)));
      steps.push(call(s, P, GENERATED.foxtrotLeaving), ...descent(s, P));
      steps.push(rule(s, P, 'Foxtrot exit', EXIT.foxtrot, EXIT.foxtrot.pieces.slice(1)));
      steps.push(other);
      if (s.profile) steps.push(numbers(s, P, EMERGENCY_DESCENT.title, EMERGENCY_DESCENT));
      steps.push(rule(s, 'Transit', 'Northern Arrival', EXIT.northern));
    } else {
      steps.push(call(s, P, GENERATED.cheetahLeaving));
      steps.push(rule(s, P, 'Cheetah exit', EXIT.cheetah), ...descent(s, P));
      steps.push(other);
      if (s.profile) steps.push(numbers(s, P, EMERGENCY_DESCENT.title, EMERGENCY_DESCENT));
      steps.push(rule(s, 'Transit', 'Southern Arrival', EXIT.southernArrival));
    }
    return steps;
  },

  arrival: (s) => {
    const P = 'Transit';
    const cab = s.dest === 'KNGW';
    const rwy = s.card.cabRwy;
    const initial = call(s, P, GENERATED.cabanissInitial, { replies: [reply(s, GENERATED.cabanissBreak)] });
    if (cab && s.area === 'seagull-s') {
      const g = group(rwy);
      return [
        rule(s, P, 'To Cabaniss, Southern Course Rules', SOUTHERN_ENTRY),
        terminate(s, P),
        call(s, P, GENERATED.cabanissSouthern, { replies: [reply(s, GENERATED.cabanissSouthernReply)] }),
        rule(s, P, `Pattern entry, runway ${rwy}`, { ref: SOUTHERN_PATTERN_REF, leg: `Chapman Ranch to Cabaniss ${rwy}`, pieces: SOUTHERN_PATTERN[g] }),
        // RWY 36 is direct to the numbers from the south: no initial to report.
        ...(rwy === '36' ? [] : [rule(s, P, 'Initial', CAB_INITIAL[g]), initial]),
      ];
    }
    if (cab) {
      return [
        terminate(s, P),
        rule(s, P, 'PT Shamrock', { ref: SHAMROCK_REF, leg: 'To PT Shamrock', pieces: SHAMROCK_FIRST }),
        rule(s, P, 'To PT Sunrise', TO_SUNRISE, TO_SUNRISE.pieces.slice(0, 1)),
        call(s, P, CALLS.towerShamrockSunrise, { replies: [reply(s, GENERATED.towerSunriseApproved)] }),
        rule(s, P, 'To PT Sunrise', TO_SUNRISE, TO_SUNRISE.pieces.slice(1)),
        call(s, P, CALLS.cabanissSunrise, { replies: [reply(s, GENERATED.cabanissSunriseReply)] }),
        rule(s, P, 'Cabaniss entry', { ...SUNRISE_ENTRY, leg: `PT Sunrise to Cabaniss ${rwy}` }),
        rule(s, P, 'Initial', CAB_INITIAL[group(rwy)]),
        initial,
      ];
    }
    return shamrockHome(s);
  },

  // From the initial call on, the pattern is flown on Pattern Work's model: the break, then a lap
  // at a time, the student choosing the next at each touchdown.
  pattern: (s, rng) => flyLap(s, 'break', rng),

  fromCabaniss: (s) => {
    const P = 'Recovery';
    const rwy = s.card.cabRwy;
    if (s.leave === 'southern') {
      return [
        call(s, P, GENERATED.cabanissSouthernOut, { replies: [reply(s, GENERATED.cabanissSouthernOutReply)] }),
        rule(s, P, 'Southern Departure', { ref: SOUTHERN_OUT.ref, leg: `${SOUTHERN_OUT.leg} ${rwy}`, pieces: [SOUTHERN_OUT.first[rwy === '36' ? 36 : group(rwy)], ...SOUTHERN_OUT.rest] }),
        call(s, P, GENERATED.departureSouthern, { replies: [reply(s, GENERATED.approachShamrock), reply(s, GENERATED.approachShamrockRead)] }),
        rule(s, P, 'Southern Arrival', EXIT.southernArrival),
        terminate(s, P),
        ...shamrockHome(s),
      ];
    }
    return [
      call(s, P, CALLS.cabanissDepart, { replies: [reply(s, GENERATED.cabanissSunriseApproved)] }),
      rule(s, P, 'To PT Sunrise', { ...(rwy === '31' ? SUNRISE_OUT[31] : SUNRISE_OUT.high), leg: `Cabaniss to PT Sunrise ${rwy}` }),
      rule(s, P, 'PT Sunrise', { ref: SUNRISE_ARRIVAL.ref, leg: `${SUNRISE_ARRIVAL.leg} ${s.card.rwy}`, pieces: [...SUNRISE_ARRIVAL.first, ...SUNRISE_ARRIVAL.runway[s.card.rwy]] }),
      call(s, P, CALLS.towerSunrise, { lead: [reply(s, GENERATED.cabanissToTower)], replies: [reply({ ...s, field: 'KNGP' }, GENERATED.towerSunriseReply)] }),
    ];
  },

  taxi: (s) => [
    call(s, 'Taxi back', CALLS.clearLeft, { replies: [reply(s, CALLS.clearRight)] }),
    checklist('Taxi back', CHECKLISTS.afterLanding),
    call(s, 'Taxi back', CALLS.taxiIn, { replies: [reply(s, GENERATED.groundIn), reply(s, GENERATED.groundInRead)] }),
    checklist('Taxi back', CHECKLISTS.secureFirst),
    call(s, 'Taxi back', CALLS.continueChecklist),
  ],
};

// Navy Corpus from PT Shamrock: the course rule for the runway, the calls, and the break.
function shamrockHome(s) {
  const P = s.leave ? 'Recovery' : 'Transit';
  const steps = [];
  if (!s.leave) steps.push(terminate(s, P));
  steps.push(rule(s, P, 'PT Shamrock', { ref: SHAMROCK_REF, leg: 'To PT Shamrock', pieces: SHAMROCK_FIRST }));
  steps.push(call(s, P, CALLS.towerShamrock, { replies: [reply({ ...s, field: 'KNGP' }, GENERATED.towerShamrockReply)] }));
  steps.push(rule(s, P, `To the initial, runway ${s.card.rwy}`, { ref: SHAMROCK_REF, leg: `Shamrock to KNGP ${s.card.rwy}`, pieces: SHAMROCK_RUNWAY[s.card.rwy] }));
  steps.push(call(s, P, CALLS.initial));
  return steps;
}

const NEXT = {
  plan: () => 'ground',
  ground: () => 'takeoff',
  takeoff: () => 'entry',
  entry: () => 'highWork',
  highWork: (s) => (s.hwDone || s.profile ? 'exit' : 'highWork'),
  exit: () => 'arrival',
  arrival: () => 'pattern',
  pattern: () => 'taxi',
  fromCabaniss: () => 'pattern',
  taxi: () => null,
};

// ---- What a choice does.

// A lap flown on the pattern model, then the choice at its end. A lap that flies on from the last
// one's wave-off begins there, an SSE pattern keeping that lap's engine; any other draws its
// engine, and a Case what its checks turn out to be.
function flyLap(s, kind, rng = Math.random) {
  const fly = flyStep(s, kind, 'Pattern', rng);
  const end = endOf(kind);
  const { prompt, options } = nextLaps(end, s.field);
  return [fly, { ...choose('Pattern', 'lap', prompt, options), end, engine: fly.engine }];
}

function flyStep(s, kind, P, rng = Math.random) {
  const home = s.field !== 'KNGW';
  const rwy = home ? s.card.rwy : s.card.cabRwy;
  const from = continues(kind, s.lapFrom) ? s.lapFrom : null;
  const engine = from && from.single && s.patEngine ? s.patEngine : rng() < 0.5 ? 'left' : 'right';
  const fly = {
    kind: 'fly', phase: P, lap: kind, title: lapLabel(kind), engine,
    ...(from ? { from } : {}),
    runwayId: runwayIdOf(s.field, rwy), callSign: s.card.callSign,
    // Cabaniss clears the break at the initial; from the south to runway 36 there is no initial.
    cleared: kind === 'break' && !home && rwy !== '36',
    draw: kind.startsWith('case') ? drawCase(rng) : null,
    tower: home ? 'Tower' : 'Cabaniss', channel: home ? 'CH 4' : 'CH 15',
    ref: { work: 'ME FTI', loc: '§106 — Pattern Work', pages: 'p. 1-29' },
    // The Cabaniss circuit on the map, so a departure from it joins on.
    ...(kind === 'break' && !home ? { leg: `Cabaniss pattern ${rwy}` } : {}),
  };
  return fly;
}

// One maneuver's tables. The pre-stall checks come once, before the first stall.
function maneuverSteps(s, id, preStallDone) {
  const m = MANEUVERS[id];
  const P = 'High Work';
  const steps = [];
  if (m.stall && !preStallDone) steps.push(numbers(s, P, PRE_STALL.title, PRE_STALL));
  const alts = m.sse ? sseAltitudes(s.block) : null;
  steps.push(numbers(s, P, m.label, m, alts));
  if (m.shutdown === 'all') steps.push(numbers(s, P, SHUTDOWN.title, SHUTDOWN));
  if (m.shutdown === 'three') steps.push(numbers(s, P, `${SHUTDOWN.title}, first three items`, { ...SHUTDOWN, rows: SHUTDOWN.rows.slice(0, SHUTDOWN.three) }));
  if (m.after) steps.push(numbers(s, P, m.after.title, { ref: m.after.ref || m.ref, rows: m.after.rows }, alts));
  if (m.stall) steps.push(numbers(s, P, STALL_RECOVERY.title, m.clean ? CLEAN_STALL_RECOVERY : STALL_RECOVERY));
  return steps;
}

const CHOSEN = {
  area: (s, id) => {
    const block = blockFor(id, s.card);
    return { ...s, area: id, block, dest: AREAS[id].family === 'seagull' ? null : 'KNGP', route: [...s.route, AREAS[id].poly] };
  },
  maneuver: (s, id) => {
    if (id === 'done') return { ...s, hwDone: true };
    const m = MANEUVERS[id];
    return { ...s, flown: [...s.flown, id], preStall: s.preStall || !!m.stall, steps: [...s.steps, ...maneuverSteps(s, id, s.preStall)] };
  },
  dest: (s, id) => ({ ...s, dest: id }),
  descent: (s, id) => {
    if (id !== 'yes') return s;
    const steps = [...s.steps];
    steps.splice(s.at + 1, 0, numbers(s, 'Area Exit', EMERGENCY_DESCENT.title, EMERGENCY_DESCENT));
    return { ...s, steps };
  },
  lap: (s, id, rng) => {
    if (id === 'leave') return { ...s, leave: 'pending', steps: [...s.steps, choose('Recovery', 'leave', 'Which way out of Cabaniss?', [
      { id: 'sunrise', label: 'Sunrise' },
      { id: 'southern', label: 'Southern Departure' },
    ])] };
    const ended = s.steps[s.at];
    const n = { ...s, lapEnd: ended.end, patEngine: ended.engine, lapFrom: ended.from || null };
    if (id === 'stop') return { ...n, finished: true, steps: [...s.steps, numbers(s, 'Landing', FULL_STOP.title, FULL_STOP)] };
    return { ...n, lapKind: id, laps: s.laps + 1, steps: [...s.steps, ...flyLap(n, id, rng)] };
  },
  leave: (s, id) => ({ ...s, leave: id }),
};

// ---- Moving through the flight.

export const current = (s) => (s.done ? null : s.steps[s.at]);

// A step in a few words, for the status bar's Now and Next.
export function describe(step) {
  if (!step) return '';
  if (step.kind === 'checklist') return `${step.name} Checklist`;
  if (step.kind === 'rule' || step.kind === 'numbers' || step.kind === 'ep' || step.kind === 'fly') return step.title;
  if (step.kind === 'choose') return step.prompt;
  if (step.kind === 'auto') return step.who;
  if (step.kind === 'call') return step.radio ? `Call ${step.text.split(',')[0]}` : `"${step.text.length > 40 ? `${step.text.slice(0, 40)}…` : step.text}"`;
  return '';
}

// What comes after the step on now: the next in this stage, or the first of the next stage. After
// a choice it depends on the pick.
export function nextOf(s) {
  const step = current(s);
  if (!step || step.kind === 'choose') return '';
  if (s.at + 1 < s.steps.length) return describe(s.steps[s.at + 1]);
  const stage = NEXT[s.stage](s);
  if (!stage) return 'Flight complete';
  const first = STAGES[stage](s)[0];
  return first ? `${first.phase}: ${describe(first)}` : '';
}

export const totalOf = (step) => {
  if (!step) return 0;
  if (step.kind === 'rule') return step.pieces.length;
  if (step.kind === 'numbers') return step.rows.length;
  if (step.kind === 'ep') return step.rows.filter((r) => r.text).length;
  if (step.kind === 'call' || step.kind === 'checklist') return 1;
  return 0;
};

const fresh = { upTo: 0, shown: false };

function enter(given, stage, rng = Math.random) {
  // The pattern is at Cabaniss the first time a flight bound there reaches one; Navy Corpus after.
  let s = stage === 'pattern' ? { ...given, field: given.dest === 'KNGW' && !given.leave ? 'KNGW' : 'KNGP' } : given;
  // "Random every time": the ATIS copied leaving the area is a new one, with a new wind, and so
  // perhaps a new runway at either field.
  if (stage === 'exit' && s.windPick === 'every') s = { ...s, card: { ...withWind(s.card, rng, 'every'), atis: PHONETIC[(PHONETIC.indexOf(s.card.atis) + 1) % PHONETIC.length] } };
  const flown = stage === 'highWork' && s.profile ? PROFILES[s.profile] : s.flown;
  return landOn({ ...s, flown, stage, steps: STAGES[stage](s, rng), at: 0, cur: fresh });
}

// The ATIS as last copied, for the flight card: nothing until the ATIS is heard (Primary's "not
// yet copied"), whatever the wind picked in Preflight.
const heard = (s) => ({ ...s, heardAtis: { atis: s.card.atis, windDir: s.card.windDir, windSpeed: s.card.windSpeed, altimeter: s.card.altimeter, rwy: s.card.rwy } });

// A rule draws its leg on the map as soon as it comes up; a broadcast ATIS is heard as it comes up.
function landOn(given) {
  const s = given.steps[given.at]?.atis && given.steps[given.at].kind === 'auto' ? heard(given) : given;
  const step = s.steps[s.at];
  if (step && step.leg && !s.route.includes(step.leg)) return { ...s, route: [...s.route, step.leg] };
  return s;
}

function logged(s, step) {
  const add = [];
  const base = { phase: step.phase };
  if (step.kind === 'call' || step.kind === 'auto') {
    (step.lead || []).forEach((r) => add.push({ ...base, who: r.who, text: r.text }));
    add.push({ ...base, who: step.who, radio: step.radio, text: step.text });
    (step.replies || []).forEach((r) => add.push({ ...base, who: r.who, text: r.text, other: true }));
  } else if (step.kind === 'checklist') add.push({ ...base, who: 'PF', text: step.name });
  else if (step.kind === 'rule') step.rule.forEach((p) => add.push({ ...base, who: 'Rule', text: unmark(p.text), plain: true }));
  else if (step.kind === 'numbers') add.push({ ...base, who: 'Numbers', text: step.title, plain: true });
  else if (step.kind === 'ep') add.push({ ...base, who: 'EP', text: step.title, plain: true });
  else if (step.kind === 'fly') add.push(...lapLog(step));
  return add;
}

// Move past the current step, into the next stage if this one is finished.
function forward(s, rng) {
  const step = s.steps[s.at];
  const log = [...s.log, ...logged(s, step)];
  // A rule with no figure to stop on still sets the readout as it is passed.
  const moved = { ...(step.kind === 'rule' && step.fly ? setFly(s, step.fly, sourceOf(step)) : s), log };
  if (s.at + 1 < s.steps.length) return landOn({ ...moved, at: s.at + 1, cur: fresh });
  const nextStage = NEXT[s.stage](s);
  if (!nextStage) return { ...moved, done: true, cur: fresh };
  return enter(moved, nextStage, rng);
}

// What set a readout value, shown under it as Primary's readout does: the rule or table by its
// title, a radio call by the station called, any other call by its words.
function sourceOf(step) {
  if (step.kind === 'rule' || step.kind === 'numbers') return step.title;
  if (step.from) return step.from;
  if (step.radio) return step.text.split(',')[0];
  return step.text && step.text.length <= 24 ? `"${step.text}"` : step.phase;
}
function setFly(s, values, from) {
  const flyFrom = { ...s.flyFrom };
  Object.keys(values).forEach((k) => { flyFrom[k] = from; });
  return { ...s, fly: { ...s.fly, ...values }, flyFrom };
}

function revealOne(s, step) {
  const upTo = s.cur.upTo + 1;
  const total = totalOf(step);
  let n = step.atis ? heard(s) : s;
  const from = sourceOf(step);
  if (step.kind === 'rule' && step.pieces[upTo - 1].fly) n = setFly(n, step.pieces[upTo - 1].fly, from);
  // The readout takes the setting alone: the row's own words say when.
  if (step.kind === 'numbers' && isPropRow(step.rows[upTo - 1][0])) n = setFly(n, { props: (/1900 RPM|Full forward|Unfeather|Feather/i.exec(step.rows[upTo - 1][1]) || [step.rows[upTo - 1][1]])[0] }, from);
  if (step.kind === 'call' && step.radio) n = setFly(n, { radio: step.radio }, from);
  if (step.kind === 'call' && step.fly) n = setFly(n, step.fly, from);
  return { ...n, cur: { upTo, shown: upTo >= total } };
}

const EPS_BY_PHASE = {
  'Ground Ops': ['emer-shutdown-deck'],
  Takeoff: ['aborting-takeoff', 'eng-fail-after-takeoff', 'low-altitude-windshear'],
  Pattern: ['eng-fail-after-takeoff', 'single-engine-waveoff', 'low-altitude-windshear'],
};
const AIRBORNE = ['emer-shutdown-checklist', 'windmilling-airstart', 'smoke-fire-unknown-origin', 'smoke-fume-elimination', 'fuel-leaks',
  'primary-governor-failure', 'explosive-decompression', 'unscheduled-electric-trim', 'emergency-descent', 'spin-ocf-recovery'];
const EP_PHASES = ['Ground Ops', 'Takeoff', 'Departure', 'Area Entry', 'High Work', 'Area Exit', 'Transit', 'Pattern', 'Recovery'];

export const epsFor = (phase) => {
  if (!EP_PHASES.includes(phase)) return [];
  const eps = (EPS_BY_PHASE[phase] || AIRBORNE).map((id) => T44C_EPS.find((e) => e.id === id)).filter(Boolean);
  return EPS_BY_PHASE[phase] ? eps : [...eps, ...EMERGENCY_BRIEFS];
};

export function start({ rng = Math.random, card, profile = '', windPick = 'every' } = {}) {
  const made = makeCard(rng, card);
  // A runway's wind is drawn for it; a random wind is the card's own.
  const c = RUNWAYS.some((r) => r.rwy === windPick) ? withWind(made, rng, windPick) : made;
  const s = {
    card: c, profile, windPick, area: null, block: null, dest: null, field: 'KNGP', leave: null, stage: 'plan', steps: [], at: 0, cur: fresh,
    log: [], fly: {}, flyFrom: {}, route: ['KNGP'], done: false, flown: [], preStall: false, hwDone: false, laps: 0, lapKind: null, finished: false,
  };
  return enter(s, 'plan', rng);
}

export function reduce(s, action, rng = Math.random) {
  const step = current(s);
  switch (action.type) {
    case 'reveal': {
      if (!step || s.cur.shown || totalOf(step) === 0) return s;
      return revealOne(s, step);
    }
    case 'revealAll': {
      if (!step) return s;
      let n = s;
      while (!n.cur.shown && totalOf(step) > 0) n = revealOne(n, step);
      return n;
    }
    case 'next': {
      if (!step || step.kind === 'choose') return s;
      if (totalOf(step) > 0 && !s.cur.shown) return revealOne(s, step);
      return forward(s, rng);
    }
    case 'readNext': {
      if (!step || step.kind === 'choose') return s;
      let n = s;
      while (!n.cur.shown && totalOf(step) > 0) n = revealOne(n, step);
      return forward(n, rng);
    }
    case 'choose': {
      if (!step || step.kind !== 'choose' || !step.options.some((o) => o.id === action.id)) return s;
      const chosen = step.options.find((o) => o.id === action.id);
      const log = [...s.log, { phase: step.phase, who: 'Choice', text: chosen.label, plain: true }];
      const n = CHOSEN[step.on]({ ...s, log }, action.id, rng);
      if (step.on === 'dest') return enter(n, 'exit', rng);
      if (step.on === 'leave') return enter({ ...n, laps: 0 }, 'fromCabaniss', rng);
      if (n.at + 1 < n.steps.length) return landOn({ ...n, at: n.at + 1, cur: fresh });
      const nextStage = NEXT[n.stage](n);
      if (!nextStage) return { ...n, done: true, cur: fresh };
      return enter(n, nextStage, rng);
    }
    // The student waves off, `t` seconds into the lap: the lap ends there, and the choice after it
    // is the one a wave-off offers.
    case 'waveoff': {
      if (!step || step.kind !== 'fly' || step.lap === undefined) return s;
      const after = s.steps[s.at + 1];
      if (!after || after.kind !== 'choose' || after.on !== 'lap') return s;
      const { end, from } = waveoffAt(step, action.t);
      const { prompt, options } = nextLaps(end, s.field);
      const steps = [...s.steps];
      steps[s.at] = { ...step, waveT: action.t };
      steps[s.at + 1] = { ...choose(after.phase, 'lap', prompt, options), end, engine: step.engine, from };
      return forward({ ...s, steps }, rng);
    }
    case 'ep': {
      if (!step || step.kind === 'ep') return s;
      const list = epsFor(step.phase);
      if (!list.length) return s;
      const ep = list[Math.floor(rng() * list.length)];
      const steps = [...s.steps];
      steps.splice(s.at, 0, { kind: 'ep', phase: step.phase, title: ep.title, rows: ep.rows, ref: ep.ref || { work: 'T-44C EP sheet', loc: 'Critical action memory items' } });
      return { ...s, steps, cur: fresh };
    }
    case 'profile': {
      if (!step || step.on !== 'area' || (action.id && !PROFILES[action.id])) return s;
      return { ...s, profile: action.id };
    }
    case 'wind': {
      // Preflight only: how the wind is drawn (Primary's choices), a new draw, or a typed direction.
      if (!step || step.on !== 'area') return s;
      const mode = action.pick || s.windPick;
      if (!['every', 'once'].includes(mode) && !RUNWAYS.some((r) => r.rwy === mode)) return s;
      return { ...s, windPick: mode, card: withWind(s.card, rng, mode, action.windDir) };
    }
    default:
      return s;
  }
}

// One step of a skip. Skipping Preflight flies Central Seagull; any other choice skipped takes the
// last offered.
function skipStep(n, rng) {
  const step = current(n);
  const skipped = step.kind === 'choose' && (step.on === 'area' ? 'seagull-c' : step.options[step.options.length - 1].id);
  return reduce(n, skipped ? { type: 'choose', id: skipped } : { type: 'next' }, rng);
}

// The stages that Back can return to the start of: those begun since the history began.
export const canBackTo = (h, phase) => h.past.some((p) => current(p)?.phase === phase);

export function withHistory(h, action, rng) {
  if (action.type === 'back') {
    if (!h.past.length) return h;
    return { past: h.past.slice(0, -1), now: h.past[h.past.length - 1] };
  }
  if (action.type === 'restart') return { past: [], now: start({ rng, profile: h.now.profile, windPick: h.now.windPick }) };
  // A stage already begun: back to where it began, everything since dropped.
  if (action.type === 'backTo') {
    const i = h.past.findIndex((p) => current(p)?.phase === action.phase);
    if (i < 0) return h;
    return { past: h.past.slice(0, i), now: h.past[i] };
  }
  // A stage ahead: the flight runs on to it as Skip stage would.
  if (action.type === 'skipTo') {
    let n = h.now;
    for (let i = 0; i < 4000 && !n.done && current(n).phase !== action.phase; i++) n = skipStep(n, rng);
    if (n.done || n === h.now) return h;
    return { past: [...h.past, h.now], now: n };
  }
  if (action.type === 'skipPhase') {
    const phase = current(h.now)?.phase;
    let n = h.now;
    for (let i = 0; i < 2000 && !n.done && current(n).phase === phase; i++) n = skipStep(n, rng);
    return { past: [...h.past, h.now], now: n };
  }
  const now = reduce(h.now, action, rng);
  if (now === h.now) return h;
  if (action.type === 'profile' || action.type === 'wind') return { past: h.past, now };
  return { past: [...h.past, h.now].slice(-1500), now };
}
