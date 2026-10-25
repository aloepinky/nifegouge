/* eslint-disable no-loop-func -- the drivers below pick from the flight as it stands each time round */
import { EP_STEPS, activeRunway, areaRules, canSkipTo, current, isCue, options, reduce, runwayOk, situationsFor, start, typedAltitude } from './engine';
import { taxiIn, taxiOut } from './taxi';
import { flyOn } from './figures';
import { CALLS, CHECKLISTS, EP_PHASES } from './famScript';
import { QUAD_ACTIONS } from '../QuadfoldData';
import { CAN_GET_HOME, HOME, PLANS, choicesFrom, departures, fieldsAhead as fieldsAheadOf, groupOf, isAirfield, isArea, isPattern, labelOf } from './legs';
import { gradeStep } from './grade';
import { fieldOfLeg } from './fieldOps';
import { CAP, backable, begin, phaseOf, withHistory } from './history';
import { flightText } from './report';
import { limits, problemWith, transit } from './highWork';
import { FTI, FTI_CALLOUTS, FTI_NUMBERS } from './ftiProcedures';
import { fieldFigures, figuresOf } from './figures';
import { EP_LENGTHS, EP_TITLES } from '../EPDivsData';
import { crFeatures } from '../CourseRulesFeatures';

const fs = require('fs');
const path = require('path');

// The course rules document's legs, from the seed the Course Rules page was published from
// (gitignored; the leg-call tests skip without it).
const SEED = path.join(__dirname, '..', '..', '..', '_courserules-seed', 'tw4.json');
const DOC = fs.existsSync(SEED) ? JSON.parse(fs.readFileSync(SEED, 'utf8')) : null;
const LEGS = DOC ? DOC.legs : null;
const FIELDS = DOC ? DOC.airfields : null;
const withSeed = LEGS ? test : test.skip;

// A small seeded generator, so a failing flight can be flown again.
const rng = (seed) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

// Every choice on offer, a field's arrivals (offered as the field) one by one: a test can name
// the arrival it wants.
const optionIds = (s) => options(s).flatMap((o) => (o.legs ? [o.id, ...o.legs] : [o.id]));

// Fly a whole flight, answering every step correctly and picking legs at random; land full
// stop once the flight has been airborne long enough.
// `once` are picked the first time they are offered only.
function fly(seed, { maxLegs = 12, legs = null, first, once = [], card } = {}) {
  const r = rng(seed);
  const left = [...once];
  let s = start(legs, { rng: rng(seed + 7), card });
  let picked = 0;
  for (let n = 0; n < 5000 && !s.done; n++) {
    const step = current(s);
    if (step.kind === 'choose' || step.kind === 'ask') {
      // Into an outlying field, the runway in use (any other is refused); low work first, the field briefed.
      const fair = options(s).filter((o) => !['leg', 'runway'].includes(step.choose) || runwayOk(s, o.id));
      const toOlf = s.olf && !s.route.includes(s.olf) && step.choose === 'leg' ? fair.filter((o) => fieldOfLeg(o.id) === s.olf) : [];
      const opts = toOlf.length ? toOlf : fair;
      if (!opts.length) throw new Error(`no options at ${s.node} (${crFeatures[s.node]?.name}), route ${s.route.join(' > ')}`);
      const full = opts.find((o) => o.id === 'fullStop');
      const one = opts.find((o) => left.includes(o.id));
      if (one) left.splice(left.indexOf(one.id), 1);
      const pick = one || (first && opts.find((o) => [].concat(first).includes(o.id))) || (full && picked >= maxLegs ? full : opts[Math.floor(r() * opts.length)]);
      picked += 1;
      s = reduce(s, { type: 'choose', id: picked > maxLegs * 3 && full ? full.id : pick.id });
    } else {
      s = reduce(s, { type: 'revealAll' });
      s = reduce(s, { type: 'next' });
    }
  }
  return s;
}

test('every EP has its memory steps', () => {
  expect(EP_STEPS).toHaveLength(EP_TITLES.length);
  EP_STEPS.forEach((steps, i) => expect(steps).toHaveLength(EP_LENGTHS[i]));
  EP_STEPS.flat().forEach((t) => expect(t).not.toMatch(/​/));
});

test('every EP has a phase of flight, in EP_TITLES order', () => {
  expect(EP_PHASES.map((p) => p.title)).toEqual(EP_TITLES);
  EP_PHASES.forEach((p) => {
    expect(p.when.length).toBeGreaterThan(0);
    expect(p.ref.pages).toMatch(/^p\. /);
  });
});

const say = (s) => reduce(reduce(s, { type: 'revealAll' }), { type: 'next' });

// The brief: high or low work first, the area, the field; the first option of each.
const brief = (s) => {
  while (current(s).kind === 'choose' && current(s).phase === 'Preflight') {
    s = reduce(s, { type: 'choose', id: options(s)[0].id });
  }
  return s;
};

test('a step is said, then revealed, then left', () => {
  let s = start();
  s = brief(s);
  expect(current(s).text).toBe('Two Pins In');
  expect(reduce(s, { type: 'next' })).toBe(s);
  s = reduce(s, { type: 'reveal' });
  expect(s.cur.shown).toBe(true);
  s = reduce(s, { type: 'next' });
  expect(s.log[s.log.length - 1]).toMatchObject({ text: 'Two Pins In', result: 'said' });
  // The IP's answer waits to be heard.
  expect(current(s)).toMatchObject({ kind: 'reply', who: 'ip', text: 'Two Pins In' });
  s = reduce(s, { type: 'next' });
  expect(s.log[s.log.length - 1]).toMatchObject({ who: 'ip', text: 'Two Pins In', result: 'heard' });
});

test('a normal checklist is one step, its name, and the first is airborne', () => {
  let s = start(null, { card: { rwy: '13L' } });
  s = brief(s);
  while (current(s).kind !== 'checklist') s = say(s);
  expect(current(s).checklist).toBe('Operations Check');
  expect(current(s).stage).toBe('airborne');
  s = say(s);
  expect(s.log[s.log.length - 1]).toMatchObject({ kind: 'checklist', result: 'said' });
});

test('only the checklists run airborne are drilled', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = fly(seed);
    const lists = s.log.filter((l) => l.kind === 'checklist');
    expect(lists.length).toBeGreaterThan(0);
    lists.forEach((l) => expect(['Departure', 'Working area', 'Transit', 'Pattern', 'Recovery', 'Landing']).toContain(l.phase));
  }
});

// The words in a rendered quad-fold item: its "Hollywood" bubbles.
const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return textOf(node.props && node.props.children);
};
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

test('no call is one the quad-fold checklists already make', () => {
  const quad = squash(Object.values(QUAD_ACTIONS).map(textOf).join(' | '));
  Object.entries(CALLS).forEach(([group, calls]) => calls.forEach((c) => {
    // After Takeoff is the exception: it is said step by step, never called for by name.
    // ATIS and the clearance too, at the user's call: they are what the Before Taxi radios get.
    if (c.who !== 'you' || ['afterTakeoff', 'atis', 'clearanceDelivery', 'channel3'].includes(group)) return;
    const words = squash(c.text.replace(/\([^)]*\)/g, ' '));
    // Two-word replies ("Roger, Solo") are said all over; it's the calls themselves that count.
    if (words.split(' ').length < 3) return;
    expect(`${group}: ${quad.includes(words) ? 'in the quad-fold' : 'not'}`).toBe(`${group}: not`);
  }));
});

test('every checklist cites its page', () => {
  Object.values(CHECKLISTS).forEach((cl) => {
    expect(cl.ref.work).toBe('Checklist Study Guide');
    expect(cl.ref.pages).toMatch(/^p\. \d+$/);
  });
});

test('every leg offered can get back home', () => {
  const seen = new Set([HOME]);
  const queue = [HOME, ...departures()];
  while (queue.length) {
    const id = queue.shift();
    for (const n of choicesFrom(id)) {
      expect(CAN_GET_HOME.has(n)).toBe(true);
      if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  expect(departures().length).toBeGreaterThan(10);
});

test('a flight answered correctly starts on the ground and ends at shutdown', () => {
  const s = fly(1);
  expect(s.done).toBe(true);
  expect(s.ended).toBe(null);
  const said = s.log.map((l) => l.text);
  expect(s.log[0].result).toBe('choice');
  expect(said[said.indexOf('Two Pins In') - 1]).toMatch(/./);
  expect(said).not.toContain('Cockpit (All Flights)');
  expect(said).not.toContain('Before Taxi');
  expect(said).toContain('Before Landing');
  // After Takeoff is said item by item and never named.
  expect(said).toContain('Two positive rates, Gear');
  expect(said.some((x) => /^Gear up, Flaps up, at 1[2-4][05] knots$/.test(x))).toBe(true);
  expect(said).not.toContain('After Takeoff');
  expect(said.some((x) => /Checklist/.test(x) && !/checklist prior|Descent Checklist on|Climb Checklist as/.test(x))).toBe(false);
  expect(said).toContain('Two pins in, Off, Normal, Normal');
  expect(said[said.length - 1]).toBe('Roger, Solo');
  // Everything said is said (an unusual attitude's answers are picked, and marked).
  expect(s.log.filter((l) => !['auto', 'choice', 'heard'].includes(l.result) && l.kind !== 'choose').every((l) => l.result === 'said')).toBe(true);
  expect(said).not.toContain('ICS Check');
  expect(said).toContain('Switching ATIS');
  expect(said.some((t) => /^Nearest airfield is \w/.test(t))).toBe(true);
  // A normal checklist is one step, its name. The Operations Check comes after the departure
  // check-in and again leaving an outlying field for the working area.
  const ops = s.log.filter((l) => l.checklist === 'Operations Check' && l.kind === 'checklist');
  expect(ops.every((l) => l.text === 'Ops Check')).toBe(true);
  expect(ops).toHaveLength(s.order === 'low' ? 2 : 1);
});

test('500 random flights all reach shutdown', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const s = fly(seed);
    expect(s.done).toBe(true);
  }
});

test('a working area brings the PSA checklist and leaving it the Descent checklist', () => {
  let found = false;
  for (let seed = 1; seed <= 200 && !found; seed++) {
    const s = fly(seed);
    const said = s.log.map((l) => l.text);
    const psa = said.indexOf('Pre-Stalling, Spinning, and Aerobatic');
    if (psa < 0) continue;
    found = true;
    // Out of KINGS 4 the check-out aid takes in the Descent Checklist; elsewhere it is its own.
    const descent = said.indexOf('Descent');
    expect(s.plan === 'KINGS 4' ? descent === -1 : descent > psa).toBe(true);
  }
  expect(found).toBe(true);
});

test('nothing comes up on the ground; in the air, situations pause the flight and resume it', () => {
  let s = start();
  expect(situationsFor(s)).toHaveLength(0);
  expect(reduce(s, { type: 'situation' })).toBe(s);
  s = brief(s);
  while (!s.airborne) s = say(s);
  // Climbing out: a TCAS traffic advisory is one that can come up; the flight waits for it.
  expect(situationsFor(s).map((x) => x.id)).toContain('tcas');
  const before = current(s);
  s = reduce(s, { type: 'situation', rng: () => situationsFor(s).findIndex((x) => x.id === 'tcas') / situationsFor(s).length + 1e-9 });
  expect(s.ep.title).toBe('TCAS traffic advisory');
  expect(current(s)).toMatchObject({ kind: 'reply', who: 'TCAS', text: '"TRAFFIC, TRAFFIC"' });
  while (!s.ep.done) s = say(s);
  s = reduce(s, { type: 'resume' });
  expect(s.ep).toBe(null);
  expect(current(s)).toEqual(before);
});

test('a step marked to be typed is graded, placeholders aside', () => {
  const call = { kind: 'call', typed: true, answer: '(call sign), cleared for takeoff, runway 13L' };
  expect(gradeStep('Boomer 123, cleared for takeoff, runway 13L', call)).toBe('correct');
  expect(gradeStep('cleared for takeoff', call)).toBe('partial');
  expect(gradeStep('Two pins', { kind: 'call', answer: 'Two Pins In' })).toBe('partial');
  expect(gradeStep('On 24 volts', { kind: 'response', answer: 'On, ____ Volts' })).toBe('correct');
});

withSeed('500 random flights with the course rules calls all reach shutdown', () => {
  for (let seed = 1; seed <= 500; seed++) expect(fly(seed, { legs: LEGS }).done).toBe(true);
});

withSeed('a departure with its own calls replaces the study guide\'s', () => {
  const s = fly(3, { legs: LEGS, first: ['high', 'KINGS 4'], card: { rwy: '13L' } });
  const { callSign, atis } = s.card;
  const said = s.log.map((l) => l.text);
  // To Ground, the departure by name, not the working area (Course Rules Manual 2-3).
  expect(said).toContain(`Navy Corpus Ground, ${callSign}, Sierra run-up, request taxi with information ${atis}, VFR RUSTY.`);
  expect(said.some((t) => t.startsWith(`Corpus Departure, ${callSign}, 500 feet off Navy Corpus, KINGS 4`))).toBe(true);
  expect(said.some((t) => /Sierra Run-up, taxi with/.test(t))).toBe(false);
});

test('the working area is picked before engine start, and the route to it is flown', () => {
  const s = fly(5, { first: ['high', 'KINGS 4'], card: { rwy: '13L' } });
  const picked = s.log.findIndex((l) => l.text === 'KINGS 4');
  expect(s.log[picked].result).toBe('choice');
  expect(picked).toBeLessThan(s.log.findIndex((l) => l.text === 'Switching ATIS'));
  const flown = s.log.filter((l) => l.kind === 'route').map((l) => l.text);
  expect(flown.slice(0, 2)).toEqual(['PT Rusty', 'Rusty Entry → KINGS 4']);
  expect(flown[2]).toMatch(/^Kings 4 MOA \d+$/);
});

test('every plan has a route off every runway it is offered for', () => {
  for (const rwy of ['13L', '13R', '31L', '31R', '18', '36', '04', '22']) {
    const s = reduce(start(null, { card: { rwy } }), { type: 'choose', id: 'high' });
    const opts = options(s);
    expect(opts.length).toBeGreaterThan(0);
    // Every area offered for each plan has a route, and the brief then goes.
    opts.forEach((o) => {
      let t = reduce(s, { type: 'choose', id: o.id });
      options(t).forEach((a) => {
        let u = reduce(t, { type: 'choose', id: a.id });
        if (current(u).choose === 'block') u = reduce(u, { type: 'choose', id: 'high' });
        expect(u.path).toBeTruthy();
      });
      t = null;
    });
  }
});

test('North Flow calls Ground from the Compass Rose; South Flow taxis to the Sierra run-up', () => {
  const north = fly(2, { first: ['high', 'KINGS 4'], card: { rwy: '31R' } });
  const n = north.log.map((l) => l.text);
  expect(n.some((t) => /Compass Rose/.test(t))).toBe(true);
  expect(n).toContain(`${north.card.callSign}, taxi to Echo run-up via Romeo, Echo`);
  expect(n).toContain(`Ground, ${north.card.callSign}, further taxi`);
  const south = fly(2, { first: ['high', 'KINGS 4'], card: { rwy: '13R' } });
  expect(south.log.some((l) => /SIERRA run-up/.test(l.text))).toBe(true);
  expect(south.log.some((l) => /Compass Rose/.test(l.text))).toBe(false);
});

test('blanks are filled: call sign, squawk-style side number, winds for the runway', () => {
  const s = fly(4, { card: { rwy: '13L' } });
  const text = s.log.map((l) => l.text).join(' | ');
  expect(text).not.toMatch(/\(call sign\)|\(ATIS code\)|___|XXXX/i);
  expect(s.card.callSign).toMatch(/^(Boomer|Ranger) [78]\d\d$/);
  expect(s.card.squawk).toBe(`${s.card.side[0] === '7' ? '55' : '56'}${s.card.side.slice(1)}`);
  const dir = Number(s.card.windDir);
  expect(dir % 10).toBe(0);
  expect(Math.abs(((dir - 130 + 540) % 360) - 180)).toBeLessThanOrEqual(30);
});

test('skipping a stage runs it for you and says what you were told', () => {
  let s = start(null, { card: { rwy: '13L' } });
  s = reduce(s, { type: 'skipPhase' });
  expect(current(s).phase).not.toBe('Preflight');
  expect(s.skipped.phase).toBe('Preflight');
  expect(s.skipped.told.some((l) => l.result === 'choice')).toBe(true);
  for (let n = 0; n < 40 && !s.done; n++) s = reduce(s, { type: 'skipPhase' });
  expect(s.done).toBe(true);
});

withSeed('calls keep only the alternative that fits the plan', () => {
  const s = fly(3, { legs: LEGS, first: ['high', 'KINGS 4'], card: { rwy: '13L' } });
  const said = s.log.map((l) => l.text);
  expect(said).toContain(`Corpus Departure, ${s.card.callSign}, 500 feet off Navy Corpus, KINGS 4.`);
  // (Leg names may have one: "From Goliad / KINGS 4". Calls may not.)
  expect(s.log.filter((l) => ['call', 'reply'].includes(l.kind) && / \/ /.test(l.text)).map((l) => l.text)).toEqual([]);
});

withSeed('low work first flies to the field, then on to the area', () => {
  const s = fly(6, { legs: LEGS, first: ['low', 'KINGS 4', 'Point-default-38', 'toArea'], card: { rwy: '13L' } });
  const said = s.log.map((l) => l.text);
  expect(said).toContain(`Corpus Departure, ${s.card.callSign}, 500 feet off Navy Corpus, course rules Goliad.`);
  const atGoliad = said.indexOf('Goliad NOLF (KNGT)');
  const toArea = said.indexOf('Depart for KINGS 4');
  expect(atGoliad).toBeGreaterThan(0);
  expect(toArea).toBeGreaterThan(atGoliad);
  expect(s.log.slice(toArea).some((l) => /^Kings 4 MOA/.test(l.text))).toBe(true);
});

withSeed('each leg flown asks for its course rule, blanks and all', () => {
  const s = fly(3, { legs: LEGS, first: ['high', 'KINGS 4'], card: { rwy: '13L' } });
  const rules = s.log.filter((l) => l.kind === 'rule' && /^Course rules/.test(l.text)).map((l) => l.text);
  expect(rules[0]).toBe('Course rules: KNGP Rusty Departures 13L');
  expect(rules).toContain('Course rules: Rusty Entry → KINGS 4');
});

test('a stage can be skipped to directly', () => {
  let s = start(null, { card: { rwy: '13L' } });
  s = reduce(s, { type: 'skipTo', phase: 'Takeoff' });
  expect(current(s).phase).toBe('Takeoff');
  expect(s.skipped.to).toBe('Takeoff');
  expect(s.skipped.told.some((l) => /taxi to runway 13L/.test(l.text))).toBe(true);
  s = reduce(s, { type: 'skipTo', phase: 'Pattern' });
  expect(current(s).phase).toBe('Pattern');
});

test('the ATIS fills in only once heard, and KINGS 4 climbs straight after its rule', () => {
  let s = start(null, { card: { rwy: '13L' } });
  expect(s.atisHeard).toBe(false);
  s = reduce(s, { type: 'skipTo', phase: 'Takeoff' });
  expect(s.atisHeard).toBe(true);
  expect(s.log.some((l) => /^Navy Corpus information /.test(l.text))).toBe(true);
});

withSeed('KINGS 4 runs the Climb checklist after the rule that climbs to 14,500, without asking', () => {
  const s = fly(3, { legs: LEGS, first: ['high', 'KINGS 4'], card: { rwy: '13L' } });
  const said = s.log.map((l) => l.text);
  const rule = said.indexOf('Course rules: Rusty Entry → KINGS 4');
  expect(said[rule + 1]).toBe('Climb');
  expect(s.log.some((l) => l.kind === 'ask' || /10,000 ft/.test(l.text))).toBe(false);
});

test('an IP is never named', () => {
  const s = fly(2, { first: ['high'] });
  expect(s.log.find((l) => /outbound$/.test(l.text)).text).toMatch(/\(IP rank and last name\)/);
});

// Fly to Goliad for low work and choose how to enter and how to go round.
// With `lap`, once round Goliad's pattern first.
const toGoliad = (seed, entry, lap) => fly(seed, {
  legs: LEGS, first: ['low', 'KINGS 4', 'Point-default-38', entry, lap, 'toArea'].filter(Boolean), card: { rwy: '13L' },
  once: lap ? ['Routes-Traffic Patterns-39'] : [],
});

withSeed('entering Goliad is a decision: break or PEL', () => {
  const brk = toGoliad(6, 'break').log.map((l) => l.text);
  expect(brk).toContain('Break');
  expect(brk.some((x) => /initial 11|initial \(RWY/.test(x) || /, initial /.test(x))).toBe(true);
  expect(brk.some((x) => /Practice PEL/.test(x))).toBe(false);
  const pel = toGoliad(6, 'pel').log.map((l) => l.text);
  expect(pel).toContain('PEL');
  expect(pel.some((x) => /Practice PEL/.test(x))).toBe(true);
  expect(pel.some((x) => /High-Key/.test(x))).toBe(true);
  expect(pel.some((x) => /, initial /.test(x))).toBe(false);
  // Goliad's arrival rule is all the 4 NM initial and the break: by a PEL, none of it.
  expect(brk.some((x) => /^Course rules: KNGT Arrivals/.test(x))).toBe(true);
  expect(pel.some((x) => /^Course rules: KNGT Arrivals/.test(x))).toBe(false);
  // A PEL picked brings the IP's simulated emergency: turn, climb, clean, then its steps.
  const sim = pel.findIndex((x) => /^Simulated, simulated, simulated, /.test(x));
  expect(sim).toBeGreaterThan(pel.indexOf('PEL'));
  expect(pel[sim + 1]).toBe('Turn, climb, clean');
  expect(brk.some((x) => /^Simulated, simulated/.test(x))).toBe(false);
});

withSeed('the RDO directs a discontinued entry about one time in three, and it is complied with', () => {
  let entries = 0;
  let told = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const said = toGoliad(seed, 'break').log.map((l) => l.text);
    entries += said.filter((x) => /^Goliad, landing\.$/.test(x)).length;
    for (let at = 0; at < said.length; at++) {
      if (!/execute discontinued entry/.test(said[at])) continue;
      told += 1;
      expect(said[at + 1]).toBe('Discontinued entry');
      expect(said.slice(at + 2).some((y) => /, initial /.test(y))).toBe(true);
    }
  }
  expect(told / entries).toBeGreaterThan(0.2);
  expect(told / entries).toBeLessThan(0.47);
});

withSeed('going round the pattern is a decision, and no Operations Check is run there', () => {
  let s = start(LEGS, { card: { rwy: '13L' } });
  let lapped = false;
  for (let n = 0; n < 3000 && !s.done; n++) {
    const now = current(s);
    if (now.kind !== 'choose' && now.kind !== 'ask') { s = reduce(s, { type: 'forward' }); continue; }
    const ids = optionIds(s).filter((x) => now.choose !== 'leg' || runwayOk(s, x));
    const want = ['low', 'KINGS 4', 'Point-default-38', 'break', 'ppel'].find((id) => ids.includes(id))
      || (now.choose === 'leg' && s.olf && !s.route.includes(s.olf) ? ids.find((x) => fieldOfLeg(x) === s.olf) : null);
    let id = want || ids[0];
    if (now.choose === 'field' && s.node === 'Point-default-38') id = lapped ? 'toArea' : ids.find((x) => x !== 'toArea');
    if (now.choose === 'lap') lapped = true;
    if (now.choose === 'field' && s.node === 'Point-default-95') id = 'fullStop';
    s = reduce(s, { type: 'choose', id });
  }
  const said = s.log.map((l) => l.text);
  const pick = said.indexOf('Pattern PEL');
  expect(pick).toBeGreaterThan(0);
  expect(said.slice(pick).some((x) => /Practice PEL|, initial /.test(x))).toBe(false);
  expect(said.slice(pick).some((x) => /crosswind pattern PEL/.test(x))).toBe(true);
  expect(said.slice(pick).some((x) => /Pattern Low-Key, gear down/.test(x))).toBe(true);
  expect(s.log.filter((l) => l.text === 'Operations Check').every((l) => l.phase !== 'Pattern')).toBe(true);
});

withSeed('the FTI procedures and VT-28 memory aids come where they are flown', () => {
  const s = fly(3, { legs: LEGS, first: ['high', 'KINGS 4', 'break'], card: { rwy: '13L' } });
  const said = s.log.map((l) => l.text);
  const at = (x) => said.indexOf(x);
  expect(at('FAM FTI: Takeoff')).toBeGreaterThan(at('Clear, Left, Right and Above. Cleared for Takeoff'));
  expect(at('FAM FTI: Takeoff')).toBeLessThan(at('90 knots, rotate'));
  // Out of KINGS 4: one of the squadron's checking-out aids, before the check-out with Houston
  // Center (the exit rule); it takes in the Descent Checklist, which does not follow.
  const out = said.findIndex((x) => /^VT-28 technique: Checking out of the MOA/.test(x));
  expect(out).toBeGreaterThan(0);
  expect(out).toBeLessThan(at('Course rules: leaving KINGS 4'));
  expect(at('Descent')).toBe(-1);
  // Then the manual's check-out with Center and the departing call on Common, and clear.
  const sign = s.card.callSign;
  // Bound for Goliad, Center is told so, and so is Common, then clear of the area.
  const toGoliad = said.indexOf(`Houston Center, ${sign}, Complete KINGS 4, Terminate Goliad.`);
  expect(toGoliad).toBeGreaterThan(said.indexOf('Course rules: leaving KINGS 4'));
  expect(said[toGoliad + 1]).toMatch(/departing area \d (high|low), Goliad\.$/);
  expect(said[toGoliad + 2]).toMatch(new RegExp(`^99 KINGS 4, ${sign} clear of area \\d (high|low)\\.$`));
  // Home: the break, then the downwind and the 180 before the landing call.
  expect(said.lastIndexOf('FAM FTI: The Break')).toBeGreaterThan(out);
  expect(said.lastIndexOf('FAM FTI: Approach')).toBeLessThan(said.findIndex((x) => /180 gear down, full stop/.test(x)));
});

withSeed('a Goliad lap and departure bring their procedures, as numbers only', () => {
  const s = toGoliad(6, 'break', 'lap');
  const said = s.log.map((l) => l.text);
  expect(said).toContain('FAM FTI: The Break');
  expect(said).toContain('FAM FTI: Touch-and-Go Landing');
  expect(said).not.toContain('FAM FTI: Outlying Field Departure');
  // The entry has no numbers of its own (they are the field's), and the pattern has no
  // squadron techniques.
  expect(said).not.toContain('FAM FTI: Outlying Field Entry');
  expect(said.some((x) => /^VT-28 technique: (Break|Departing|Touch|Remaining|Transition|PEL)/.test(x))).toBe(false);
  expect(s.log.filter((l) => /^FAM FTI/.test(l.text)).every((l) => l.kind === 'numbers')).toBe(true);
  const pel = toGoliad(6, 'pel').log.map((l) => l.text);
  expect(pel).toContain('FAM FTI: Precautionary Emergency Landing (PEL)');
});

test('every FTI number is a figure from its procedure, or says where it is from', () => {
  Object.entries(FTI_NUMBERS).forEach(([id, rows]) => {
    const text = FTI[id].rule.map((p) => p.text).join(' ').replace(/\[\[|\]\]/g, '').replace(/(\d),(\d{3})/g, '$1$2');
    // A reminder row (the Before Landing Checklist) has no figure.
    rows.filter(([, value]) => value === null).forEach(([label]) => expect(label).toBe('Before Landing Checklist'));
    rows.filter(([, value]) => value !== null).forEach(([label, value]) => {
      expect(label.length).toBeGreaterThan(0);
      expect(/[\d¾⅔]/.test(value)).toBe(true);
    });
    // A row whose figures are not the FTI's says whose they are.
    rows.filter(([, value, from]) => value !== null && from).forEach(([, , from]) => expect(from.length).toBeGreaterThan(10));
    rows.filter(([, value, from]) => value !== null && !from).forEach(([label, value]) => {
      // Each figure in the value (thousands without their commas) is in the FTI's text.
      const figures = value.replace(/(\d),(\d{3})/g, '$1$2').match(/\d+|[¾⅔]/g);
      const missing = figures.filter((f) => !new RegExp(`(^|[^\\d])${f}($|[^\\d])`).test(text));
      expect(`${id} ${label}: ${missing.join(', ')}`).toBe(`${id} ${label}: `);
    });
  });
});

test('callouts are lines to say, or cues in brackets', () => {
  Object.entries(FTI_CALLOUTS).forEach(([id, lines]) => {
    expect(FTI_NUMBERS[id]).toBeDefined();
    expect(lines.some((l) => !isCue(l))).toBe(true);
  });
  expect(isCue('[Before Landing Checklist]')).toBe(true);
  expect(isCue('(Pull)')).toBe(true);
  expect(isCue('Below 150, gear.')).toBe(false);
});

withSeed('skipped straight through, the flight is KINGS 4, then Goliad, then home', () => {
  let s = start(LEGS, { card: { rwy: '13L' } });
  for (let n = 0; n < 40 && !s.done; n++) s = reduce(s, { type: 'skipPhase' });
  expect(s.done).toBe(true);
  expect(s.plan).toBe('KINGS 4');
  const area = s.route.findIndex((id) => /^Working Areas-King/.test(id));
  const goliad = s.route.indexOf('Point-default-38');
  expect(area).toBeGreaterThan(0);
  expect(goliad).toBeGreaterThan(area);
  expect(s.route[s.route.length - 1]).toBe('Point-default-95');
});

withSeed('the stages run Departure, Working area, Transit, Pattern, Recovery, Landing', () => {
  let s = start(LEGS, { card: { rwy: '13L' } });
  for (let n = 0; n < 40 && !s.done; n++) s = reduce(s, { type: 'skipPhase' });
  const stages = s.log.map((l) => l.phase).filter((p, i, all) => p !== all[i - 1]);
  const airborne = stages.slice(stages.indexOf('Departure'), stages.lastIndexOf('Landing') + 1);
  expect(airborne).toEqual(['Departure', 'Working area', 'Transit', 'Pattern', 'Recovery', 'Landing']);
});

test('the Maintenance Area is never offered', () => {
  const maint = 'Working Areas-Mustang Maintenance-196';
  expect(Object.keys(crFeatures).some((id) => choicesFrom(id).includes(maint))).toBe(false);
  expect(PLANS.map((p) => p.id)).not.toContain('Mustang Maintenance Area');
});

withSeed('Goliad\'s course rule is asked during the RDO calls, and none round the pattern', () => {
  const s = toGoliad(6, 'break', 'lap');
  const said = s.log.map((l) => l.text);
  const landing = said.indexOf('Goliad, landing.');
  const rule = said.findIndex((x, i) => i > landing && /^Course rules: KNGT Arrivals/.test(x));
  const initial = said.findIndex((x, i) => i > landing && /, initial /.test(x));
  expect(rule).toBeGreaterThan(landing + 1);
  expect(rule).toBeLessThan(initial);
  // The Pattern stage starts at the entry, so its rule is the arrival's: none is a lap's.
  expect(s.log.filter((l) => /^Course rules: .* pattern$/.test(l.text))).toEqual([]);
});

withSeed('Houston Center is called passing an altitude in the climb to 14,500', () => {
  const s = fly(3, { legs: LEGS, first: ['high', 'KINGS 4'], card: { rwy: '13L' } });
  const call = s.log.find((l) => /^Houston Center, .*, passing /.test(l.text)).text;
  const alt = Number(/passing (\d{1,2},\d{3})/.exec(call)[1].replace(',', ''));
  expect(alt).toBeGreaterThanOrEqual(6500);
  expect(alt).toBeLessThanOrEqual(10500);
});

// An unusual attitude's right answer: the one not refused.
const cuaRight = (st) => options(st).map((o) => o.id).find((x) => !reduce(st, { type: 'choose', id: x }).cur.problem);

// High work: fly a KINGS 4 flight in a given block, picking the first good setup each time.
function highWork(block) {
  let s = start(LEGS, { card: { rwy: '13L', block } });
  for (let n = 0; n < 3000 && !s.done && !(s.flags.areaDone); n++) {
    const now = current(s);
    if (now.kind !== 'choose' && now.kind !== 'ask') { s = reduce(s, { type: 'forward' }); continue; }
    const ids = optionIds(s);
    let id = (now.choose === 'block' ? [block] : ['high', 'KINGS 4', 'run']).find((x) => ids.includes(x)) || ids[0];
    if (now.choose === 'cua') id = cuaRight(s);
    if (now.choose === 'altitude') {
      const { maneuver } = now;
      const { block } = s;
      id = ids.find((a) => !problemWith(maneuver, Number(a), block));
    }
    s = reduce(s, { type: 'choose', id });
  }
  return s;
}

withSeed('high work goes in the block\'s order and stays 500 feet inside it', () => {
  const high = highWork('high');
  const done = high.log.filter((l) => /^FAM FTI: (G-Warm|Power-On Stall|Spin|Power-Off Stall|Approach Turn Stall|Contact Unusual)/.test(l.text)).map((l) => l.text);
  // The unusual attitudes have no numbers of their own: their questions are the procedure.
  expect(done).toEqual(['FAM FTI: G-Warm Maneuver', 'FAM FTI: Power-On Stall', 'FAM FTI: Spin', 'FAM FTI: Power-Off Stall (ELP Stall)', 'FAM FTI: Approach Turn Stall']);
  const low = highWork('low');
  expect(low.log.filter((l) => /^FAM FTI: (G-Warm|Spin|Power-On)/.test(l.text)).map((l) => l.text)).toEqual(['FAM FTI: G-Warm Maneuver', 'FAM FTI: Spin', 'FAM FTI: Power-On Stall']);
});

withSeed('a setup that would break the block is refused, with the reason', () => {
  let s = start(LEGS, { card: { rwy: '13L', block: 'high' } });
  for (let n = 0; n < 3000 && !(current(s).kind === 'choose' && current(s).choose === 'altitude'); n++) {
    const now = current(s);
    if (now.kind !== 'choose' && now.kind !== 'ask') { s = reduce(s, { type: 'forward' }); continue; }
    const ids = optionIds(s);
    s = reduce(s, { type: 'choose', id: ['high', 'KINGS 4', 'run'].find((x) => ids.includes(x)) || ids[0] });
  }
  expect(current(s).maneuver).toBe('gWarm');
  // Arriving on the transition layer, westbound at 14,200, outside the block: the first setup
  // climbs into it.
  expect(s.alt).toBe(14200);
  expect(options(s).every((o) => /^Climb to/.test(o.label))).toBe(true);
  // Typed: any altitude, written any usual way.
  expect(reduce(s, { type: 'choose', id: 'high' }).cur.problem).toMatch(/Type an altitude/);
  s = reduce(s, { type: 'choose', id: '18.0' });
  // The maneuver brief is the numbers' first line.
  expect(current(s).kind).toBe('numbers');
  expect(current(s).brief).toMatch(/^Alright (Sir|Ma'am), this next maneuver will be a G-ex\. We are three Cs complete and at 200-220 KIAS\.$/);
  expect(s.fly.alt.v).toBe("18,000' MSL");
  s = say(s);
  expect(s.fly.kias.v).toBe('200-220 KIAS');
  // The next maneuver is the student's pick.
  expect(current(s).choose).toBe('maneuver');
  expect(optionIds(s)).toEqual(['powerOnStall', 'spin', 'elpStall', 'landingPatternStall']);
  s = reduce(s, { type: 'choose', id: 'powerOnStall' });
  expect(current(s).maneuver).toBe('powerOnStall');
  // The readout has where the G-Warm left you.
  expect(s.fly.alt.v).toBe(`${s.alt.toLocaleString('en-US')}' MSL`);
  // Power-on stall gains up to 2,000': set up at the ceiling, 21,500', and it would bust 21,500'.
  const refused = reduce(s, { type: 'choose', id: '21500' });
  expect(current(refused)).toBe(current(s));
  expect(refused.cur.problem).toMatch(/above 21,500'/);
});

withSeed('skipping through the high work never busts the block', () => {
  for (let seed = 1; seed <= 30; seed++) {
    let s = start(LEGS, { rng: rng(seed), card: { rwy: '13L' } });
    // Each maneuver's setup and result, from the log of choices the skip made.
    for (let n = 0; n < 60 && !s.done; n++) s = reduce(s, { type: 'skipPhase' });
    expect(s.done).toBe(true);
    // Five set up (contact unusual attitudes are not): a skip flies each once.
    expect(s.hwDone).toBe(5);
    const { floor, ceiling } = limits(s.block);
    s.altTrack.forEach((alt) => {
      expect(alt).toBeGreaterThanOrEqual(floor);
      expect(alt).toBeLessThanOrEqual(ceiling);
    });
    expect(s.done).toBe(true);
  }
});

// --- What to fly: the readout ---------------------------------------------------------------

test('a paragraph says what it leaves you flying', () => {
  expect(figuresOf("HDG [[135°]] until [[High Bridge]]. Thence.")).toEqual({ hdg: '135°' });
  expect(figuresOf("Turn direct to [[PT RUSTY]]. Climb and maintain [[2500']] MSL and [[200]] KIAS until clear of Class D airspace (4.3nm), then [[240]] KIAS. When instructed by tower, switch Corpus Departure (CH [[12]] UHF) and state intentions/transition. When cleared on course by Approach, climb and maintain [[5500']] MSL."))
    .toEqual({ alt: "5,500' MSL", hdg: 'direct PT RUSTY', kias: '240 KIAS', ch: 'CH 12 UHF', station: 'Corpus Departure' });
  // Someone else's altitude is not yours.
  expect(figuresOf("Thence turn HDG [[105]]° toward the beach line and climb to [[2500']] MSL. Be alert for traffic established on the southern arrival at [[1000']] MSL.").alt).toBe("2,500' MSL");
  // A band is limits, not an altitude to fly.
  expect(figuresOf("High Block [[15000']] MSL to [[22000']] MSL.").alt).toBeUndefined();
  // Only the flow in use.
  const flows = "For South flow traffic, RWY s 13 L/R, 18, 22, establish a descent and level off at [[800']]MSL. For North flow traffic, RWYs 4, 31 L/R, 36, establish a descent and level off at [[500']] MSL.";
  expect(figuresOf(flows, { north: false }).alt).toBe("800' MSL");
  expect(figuresOf(flows, { north: true }).alt).toBe("500' MSL");
  // The ASOS is listened to; the channel to be on is the RDO's.
  expect(figuresOf('switch ch [[15]] UHF/VHF after getting ASOS on ch [[14]] UHF once clear of the MOA.').ch).toBe('CH 15 UHF');
});

withSeed('a field\'s page gives its pattern figures', () => {
  const g = fieldFigures(FIELDS['Point-default-38']);
  expect([g.break, g.pattern, g.highKey, g.lowKey]).toEqual(["1,300' MSL", "1,100' MSL", "3,300' MSL", "1,800' MSL"]);
  expect(g.heading('11')).toBe('106°');
  expect(g.heading('29')).toBe('296°');
});

withSeed('a rule is revealed a piece at a time, each change of altitude or airspeed its own', () => {
  let s = start(LEGS, { card: { rwy: '13R' }, fields: FIELDS });
  s = brief(s);
  while (current(s).kind !== 'rule') s = say(s);
  expect(current(s).leg).toBe('KNGP Rusty Departures 13R');
  const seen = [];
  while (!s.cur.shown) {
    s = reduce(s, { type: 'forward' });
    seen.push([s.fly.alt && s.fly.alt.v, s.fly.kias && s.fly.kias.v, s.fly.hdg && s.fly.hdg.v]);
  }
  // HDG 135, direct PT RUSTY, 2,500 and 200, then 240, the switch to Departure, then 5,500.
  expect(seen).toEqual([
    [undefined, undefined, '135°'],
    [undefined, undefined, 'direct PT RUSTY'],
    ["2,500' MSL", '200 KIAS', 'direct PT RUSTY'],
    ["2,500' MSL", '240 KIAS', 'direct PT RUSTY'],
    ["2,500' MSL", '240 KIAS', 'direct PT RUSTY'],
    ["5,500' MSL", '240 KIAS', 'direct PT RUSTY'],
  ]);
  expect(s.fly.uhf).toMatchObject({ v: 'CH 12 UHF', station: 'Corpus Departure' });
  s = reduce(s, { type: 'forward' });
  expect(current(s).kind).toBe('call');
  expect(current(s).radio).toBe('CH 12 UHF');
});

withSeed('the readout follows the flight: KINGS 4, Goliad\'s pattern, home', () => {
  let s = start(LEGS, { card: { rwy: '13R', block: 'high' }, fields: FIELDS });
  const seen = [];
  for (let n = 0; n < 4000 && !s.done; n++) {
    const now = current(s);
    if (now.kind === 'choose' || now.kind === 'ask') {
      const ids = optionIds(s);
      let id = ['high', 'KINGS 4', 'break', 'lap'].find((x) => ids.includes(x)) || ids[0];
      const { block } = s;
      if (now.choose === 'altitude') id = ids.find((a) => !problemWith(now.maneuver, Number(a), block));
      if (now.choose === 'cua') id = cuaRight(s);
      if (now.choose === 'leg' && s.flags.inArea) id = ids.find((x) => /^Routes-Arrivals-4[2-5]$/.test(x) && runwayOk(s, x)) || id;
      if (now.choose === 'field') id = s.node === 'Point-default-95' ? 'fullStop' : ids.find((x) => /Departures/.test(x)) || ids[0];
      s = reduce(s, { type: 'choose', id });
    } else s = reduce(s, { type: 'forward' });
    seen.push({ text: now.text, fly: s.fly });
  }
  expect(s.done).toBe(true);
  // The readout once the step is done with.
  const at = (re) => [...seen].reverse().find((x) => re.test(x.text || '')).fly;
  expect(at(/^Course rules: Rusty Entry/).alt.v).toBe("14,500' MSL");
  expect(at(/^Course rules: Rusty Entry/).uhf.v).toBe('CH 20 UHF');
  expect(at(/^Course rules: KINGS 4$/).vhf).toMatchObject({ v: 'CH 22 VHF', station: 'Houston Center' });
  expect(at(/^Goliad RDO, .*, initial /).alt.v).toBe("1,300' MSL");
  expect(at(/^Goliad RDO, .*, initial /).uhf.v).toBe('CH 15 UHF');
  // Done with Center, the VHF is on Goliad's CTAF for the position report.
  expect(at(/^Goliad RDO, .*, initial /).vhf).toMatchObject({ v: 'CH 15 VHF', station: 'Goliad CTAF' });
  // The first gear call is Goliad's downwind, the last home's.
  expect(seen.find((x) => /^Below 150, Gear$/.test(x.text || '')).fly.alt.v).toBe("1,100' MSL");
  expect(at(/^Below 150, Gear$/).alt.v).toBe("800' MSL");
  expect(at(/180 gear down, full stop$/).alt.v).toBe("800' MSL");
  expect(s.fly.alt).toBeUndefined();
  expect(s.fly.uhf.v).toBe('CH 19 UHF');
});

// --- High work picked as you go, briefed, and scored for transit ------------------------------

test('transit is scored against the least it could have been', () => {
  const block = { bottom: 15000, top: 22000 };
  // Arriving at 14,500: the G-Warm can be set up no lower than 16,000 (500 inside, 500 lost).
  expect(transit([{ maneuver: 'gWarm', at: 16000, alt: 15800 }], block, 14500)).toEqual({ climbed: 1500, descended: 0, spent: 1500, best: 1500, order: ['gWarm'] });
  // The best order, not the order flown: the power-on stall's climb first, then the spin's
  // and ELP stall's losses, each set up where the last left off.
  const flown = [
    { maneuver: 'gWarm', at: 16000, alt: 16000 },
    { maneuver: 'spin', at: 19000, alt: 16500 },
    { maneuver: 'powerOnStall', at: 16500, alt: 18500 },
    { maneuver: 'elpStall', at: 18500, alt: 17000 },
  ];
  const t = transit(flown, block, 14500);
  expect(t.spent).toBe(1500 + 3000);
  // 1,500 into the block, the power-on stall's climb, the ELP stall, then 1,300 up for the spin
  // (whose start, 700 above its setup, must be 13,500 and its end inside the block).
  expect(t.order).toEqual(['gWarm', 'powerOnStall', 'elpStall', 'spin']);
  expect(t.best).toBe(1500 + 1300);
  // Climbing higher than needed is spent for nothing.
  expect(transit([{ maneuver: 'gWarm', at: 18000, alt: 17800 }], block, 14500).best).toBe(1500);
  expect(transit([{ maneuver: 'gWarm', at: 18000, alt: 17800 }], block, 14500).spent).toBe(3500);
});

withSeed('the student picks each maneuver, briefs it, and hears the transit before CUAs', () => {
  let s = start(LEGS, { card: { rwy: '13L' } });
  const briefs = [];
  const maneuvers = [];
  let spinStep = null;
  for (let n = 0; n < 3000 && !s.flags.areaDone; n++) {
    const now = current(s);
    if (now.brief) briefs.push(now.brief);
    if (now.kind === 'numbers' && now.text === 'FAM FTI: Spin') spinStep = now;
    if (now.kind !== 'choose' && now.kind !== 'ask') { s = say(s); continue; }
    const ids = optionIds(s);
    let id = ['high', 'KINGS 4', 'run'].find((x) => ids.includes(x)) || ids[0];
    const { block } = s;
    if (now.choose === 'altitude') id = ids.find((a) => !problemWith(now.maneuver, Number(a), block));
    if (now.choose === 'cua') id = cuaRight(s);
    if (now.choose === 'maneuver') maneuvers.push(ids);
    s = reduce(s, { type: 'choose', id });
  }
  const said = s.log.map((l) => l.text);
  // Five briefs: none for contact unusual attitudes; the G-Warm is a G-ex; one title throughout.
  expect(briefs).toHaveLength(5);
  expect(briefs[0]).toMatch(/will be a G-ex\./);
  expect(new Set(briefs.map((x) => x.split(',')[0])).size).toBe(1);
  // The spin's callouts, and three unusual attitudes answered PCL then stick.
  // The altitude as the spin starts, a little above the setup, and either way round.
  // The spin is briefed with its way round, and the callout spins that way.
  const spin = spinStep.callouts.find((x) => /, stalled, /.test(x));
  expect(spin).toMatch(/^\d+\.\d, stalled, \d+ knots rising, full (left|right), recover, PCL idle, controls neutral, altitude checked, recover from unusual attitude\.$/);
  expect(spinStep.brief).toMatch(new RegExp(`will be a spin to the ${/full (left|right)/.exec(spin)[1]}\\.`));
  expect(spinStep.callouts[spinStep.callouts.length - 1]).toBe('Oil pressure in the green, power coming in.');
  const setup = s.hwFlown.find((f) => f.maneuver === 'spin').at;
  expect(Number(spin.split(',')[0]) * 1000).toBeGreaterThanOrEqual(setup + 650);
  expect(Number(spin.split(',')[0]) * 1000).toBeLessThanOrEqual(setup + 850);
  // One unusual attitude, never called inverted, answered PCL then stick.
  expect(said.filter((x) => /: PCL: (MAX|IDLE|As required)$/.test(x))).toHaveLength(1);
  expect(said.filter((x) => /: control stick: /.test(x))).toHaveLength(1);
  expect(said.filter((x) => /: (PCL|control stick): /.test(x)).some((x) => /inverted/i.test(x.split(':')[0]))).toBe(false);
  // Another power-on stall is always on offer (up to three); with all flown, the CUAs follow
  // without a choice.
  expect(maneuvers[1]).toEqual(['powerOnStall', 'spin', 'elpStall', 'landingPatternStall']);
  expect(maneuvers[2]).toEqual(['spin', 'elpStall', 'landingPatternStall', 'powerOnStall']);
  expect(maneuvers.some((ids) => ids.includes('cuas'))).toBe(false);
  // The altitude check, the CUA brief handing the IP the controls, then the attitude (no
  // airspeed in it).
  const report = said.findIndex((x) => /^Between maneuvers you climbed .* total\. The minimum possible flying the same maneuvers in the optimal order \(/.test(x));
  const handOver = said.findIndex((x) => /^(Sir|Ma'am), ready for contact UAs\. You have the controls\.$/.test(x));
  expect(report).toBeGreaterThan(0);
  expect(handOver).toBe(report + 1);
  expect(handOver).toBeLessThan(said.findIndex((x) => /: PCL: /.test(x)));
  expect(said.filter((x) => /: PCL: /.test(x)).some((x) => /KIAS/.test(x))).toBe(false);
  expect(said).not.toContain('FAM FTI: Contact Unusual Attitudes');
  expect(said.indexOf('FAM FTI: G-Warm Maneuver')).toBeLessThan(report);
});

withSeed('checking out of KINGS 4 is the student\'s pick of GOOFTWAR or ABCDONT', () => {
  const s = fly(3, { legs: LEGS, first: ['high', 'KINGS 4', 'abcdont'], card: { rwy: '13L' } });
  const said = s.log.map((l) => l.text);
  expect(said).toContain('ABCDONT');
  expect(said.some((x) => /^VT-28 technique: Checking out of the MOA: ABCDONT/.test(x))).toBe(true);
});

withSeed('a pattern PEL starts with a simulated emergency: turn, climb, clean, then its step', () => {
  const s = toGoliad(6, 'break', 'ppel');
  const at = s.log.findIndex((l) => /^Simulated, simulated, simulated, (chip light|high fuel flow|fire light)\.$/.test(l.text));
  expect(at).toBeGreaterThan(0);
  expect(s.log[at + 1].text).toBe('Turn, climb, clean');
  // The EP's steps, together.
  // "PEL - Execute" is said with the whole PEL after it.
  expect(s.log[at + 2].text).toMatch(/^(PCL - MINIMUM NECESSARY.*\n)?PEL - EXECUTE\nTurn, climb\/accelerate, clean, check, BIP, determine, deliver, reduce, lower, report$/s);
});

withSeed('a call\'s second way is said without its "Or…"', () => {
  // Round Goliad's pattern on a pattern PEL, noting what each call shows with it.
  let s = start(LEGS, { card: { rwy: '13L' } });
  const notes = [];
  let lowKey = false;
  const want = ['low', 'KINGS 4', 'Point-default-38', 'break', 'ppel'];
  for (let n = 0; n < 3000 && !lowKey; n++) {
    const now = current(s);
    if (now.kind === 'choose' || now.kind === 'ask') {
      const ids = optionIds(s).filter((x) => !['leg', 'runway'].includes(now.choose) || runwayOk(s, x));
      const pattern = now.choose === 'field' ? ids.find((x) => /Traffic Patterns/.test(x)) : null;
      const intoField = now.choose === 'leg' ? ids.find((x) => fieldOfLeg(x) === 'Point-default-38') : null;
      s = reduce(s, { type: 'choose', id: want.find((x) => ids.includes(x)) || pattern || intoField || ids[0] });
    } else {
      if (now.note) notes.push(now.note);
      if (/Pattern Low-Key, gear down/.test(now.text || '')) lowKey = true;
      s = say(s);
    }
  }
  expect(lowKey).toBe(true);
  expect(notes.length).toBeGreaterThan(0);
  expect(notes.every((x) => !/^Or\b/.test(x))).toBe(true);
});

test('the flight is on the map only once it is airborne', () => {
  let s = start();
  expect(s.airborne).toBe(false);
  s = brief(s);
  expect(s.route.length).toBeGreaterThan(1);
  expect(s.airborne).toBe(false);
  for (let n = 0; n < 200 && current(s).phase !== 'Departure'; n++) s = say(s);
  expect(s.airborne).toBe(true);
});

// --- Taxi, radios, ATIS, and the way into KRKP --------------------------------------------

test('taxi routes follow the KNGP diagram, out from the run-up and in to the line', () => {
  // Every runway taxied on or across is cleared: 22 is taxied on, 18 and 13L crossed.
  expect(taxiOut('13R')).toEqual({ runUp: 'Sierra', via: 'Sierra, Charlie, runway 22, cross 18 and 13L', crossed: ['22', '18', '13L'] });
  expect(taxiOut('36')).toEqual({ runUp: 'Echo', via: 'Echo, Yankee, cross 31R and 31L, Zulu', crossed: ['31R', '31L'] });
  expect(taxiOut('04').via).toBe('Echo, cross 31R, 36 and 31L');
  expect(taxiIn('31R')).toEqual({ exit: 'runway 4', via: 'runway 4, cross 36, Charlie', crossed: ['4', '36'] });
  // South Flow traffic comes back through Bravo.
  expect(taxiIn('18').via).toBe('Echo, cross 13L, Yankee, Bravo');
  expect(taxiIn('22').via).toBe('Echo, cross 13R, 18 and 13L, Yankee, Bravo');
  for (const rwy of ['13L', '13R', '18', '22', '04', '31L', '31R', '36']) {
    expect(taxiOut(rwy)).toBeTruthy();
    expect(taxiIn(rwy)).toBeTruthy();
  }
});

test('the radios are paired until the VHF is given its own channel', () => {
  let f = flyOn({}, { ch: 'CH 4 UHF', station: 'Navy Corpus Tower' }, 'x');
  expect(f.vhf).toMatchObject({ v: 'CH 4 VHF', station: 'backup' });
  f = flyOn(f, { chans: [{ ch: 'CH 22 VHF', station: 'Houston Center' }, { ch: 'CH 20 UHF', station: 'KINGS 4 MOA Common' }] }, 'x');
  expect([f.uhf.v, f.vhf.v]).toEqual(['CH 20 UHF', 'CH 22 VHF']);
  f = flyOn(f, { ch: 'CH 15 UHF' }, 'x');
  expect(f.vhf.v).toBe('CH 22 VHF');
  f = flyOn(f, { vhf: null }, 'x');
  expect(f.vhf.v).toBe('CH 15 VHF');
  expect(figuresOf('Contact Houston Center on 135.05 (VHF CH [[22]]) for clearance into the MOA. Once cleared, switch KINGS 4 MOA Common (UHF CH [[20]]).').chans)
    .toEqual([{ ch: 'CH 22 VHF', station: 'Houston Center' }, { ch: 'CH 20 UHF', station: 'KINGS 4 MOA Common' }]);
});

test('a setup altitude is typed any usual way', () => {
  expect(['17500', "17,500'", '17.5', '17500 MSL'].map(typedAltitude)).toEqual([17500, 17500, 17500, 17500]);
  expect(typedAltitude('high')).toBeNull();
});

// Fly MUSTANG North, then into KRKP, then home by Shamrock.
function mustangToKrkp(entry) {
  let s = start(LEGS, { card: { rwy: '31R' }, fields: FIELDS });
  const steps = [];
  for (let n = 0; n < 4000 && !s.done; n++) {
    const now = current(s);
    if (now.kind === 'choose' || now.kind === 'ask') {
      const ids = optionIds(s);
      let id = ['high', 'MUSTANG North', 'skip', entry].find((x) => ids.includes(x)) || ids[0];
      const { block } = s;
      if (now.choose === 'altitude') id = ids.find((a) => !problemWith(now.maneuver, Number(a), block));
      if (now.choose === 'cua') id = cuaRight(s);
      if (now.choose === 'leg' && s.flags.inArea) id = ids.find((x) => /^Routes-Arrivals-2[5-8]$/.test(x) && runwayOk(s, x)) || id;
      if (now.choose === 'leg' && !s.flags.inArea && ids.includes('Routes-Arrivals-104')) id = 'Routes-Arrivals-104';
      if (now.choose === 'field') id = s.node === 'Point-default-21' ? ids.find((x) => /Departures/.test(x)) : 'fullStop';
      s = reduce(s, { type: 'choose', id });
    } else {
      steps.push(now);
      s = say(s);
    }
  }
  return { s, steps };
}

withSeed('into KRKP from the MUSTANG areas: only the MUSTANG way in, after the check-out', () => {
  const { s, steps } = mustangToKrkp('break');
  expect(s.done).toBe(true);
  const said = s.log.map((l) => l.text);
  const krkp = steps.find((x) => x.kind === 'rule' && /^Course rules: KRKP Arrivals/.test(x.text));
  const words = krkp.rule.map((p) => p.text).join(' ');
  expect(words).toMatch(/North MUSTANG/);
  expect(words).not.toMatch(/Woodsboro|GOLIAD/);
  expect(said.some((x) => /Woodsboro/.test(x))).toBe(false);
  // The check-out, with the area flown, before anything at KRKP.
  const out = said.findIndex((x) => /^Corpus Approach, .*, complete in MUSTANG \d/.test(x));
  expect(out).toBeGreaterThan(0);
  expect(out).toBeLessThan(said.findIndex((x) => /^Any Texans working Aransas County/.test(x)));
  // Home: the ATIS again before asking Approach for Shamrock "with information".
  const ask = said.findIndex((x) => /Course Rules SHAMROCK with information/i.test(x));
  expect(said.slice(out + 1, ask).includes('Switching ATIS')).toBe(true);
  expect(said[ask - 1]).toMatch(/^Navy Corpus information [\w-]+, .*runway 31R in use\.$/);
  // Back on the ground, the route to the line from where the runway was left.
  expect(said).toContain(`Navy Corpus Ground, ${s.card.callSign}, Clear of the active on runway 4, Taxi to my line`);
  expect(said).toContain(`${s.card.callSign}, taxi to the line via runway 4, cross 36, Charlie`);
});

withSeed('into KRKP, a civilian field: the entry is decided in the area, in civilian words', () => {
  const { s } = mustangToKrkp('pel');
  const said = s.log.map((l) => l.text);
  // Decided before the check-out, which then asks for High-Key.
  const pick = said.indexOf('PEL: high left overhead');
  const out = said.findIndex((x) => /^Corpus Approach, .*, complete in MUSTANG \d/.test(x));
  expect(pick).toBeGreaterThan(0);
  expect(pick).toBeLessThan(out);
  expect(said[out]).toMatch(/request High-Key into Aransas County$/);
  // On the CTAF, "high left overhead"; on KRKP common, the rule's "High-Key".
  const rwy = activeRunway(s, 'Point-default-21');
  expect(said.some((x) => new RegExp(`^Aransas County Traffic, .*, high left overhead, ${rwy}, Aransas County\\.$`).test(x))).toBe(true);
  expect(said.some((x) => /^Aransas County Traffic, .*High-Key|Low-Key|practice PEL/.test(x) && /Traffic/.test(x))).toBe(false);
  expect(said.some((x) => /^\w+ \d+, High-Key$/.test(x))).toBe(true);
  // A break decided on asks for the field, not its High-Key.
  const brk = mustangToKrkp('break').s.log.map((l) => l.text);
  expect(brk.find((x) => /complete in MUSTANG \d/.test(x))).toMatch(/request Aransas County$/);
});

// --- Departures, blocks, and what is left to do --------------------------------------------

// Walk a flight to a condition, picking `want` where offered (or what `pick` says).
function walk(s, want, until, pick = () => null) {
  for (let n = 0; n < 4000 && !s.done && !until(s); n++) {
    const now = current(s);
    if (now.kind === 'choose' || now.kind === 'ask') {
      const ids = optionIds(s).filter((x) => !['leg', 'runway'].includes(now.choose) || runwayOk(s, x));
      const toOlf = s.olf && !s.route.includes(s.olf) && now.choose === 'leg' ? ids.find((x) => fieldOfLeg(x) === s.olf) : null;
      let id = want.find((x) => ids.includes(x)) || toOlf || ids[0];
      const { block } = s;
      if (now.choose === 'altitude') id = ids.find((a) => !problemWith(now.maneuver, Number(a), block));
      if (now.choose === 'cua') id = cuaRight(s);
      id = pick(s, now, ids) || id;
      s = reduce(s, { type: 'choose', id });
    } else s = say(s);
  }
  return s;
}

withSeed('a MUSTANG flight asks for its half and is given its area; the Beach Line climbs to 5,500 at 240', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'MUSTANG North', 'skip'], (x) => x.flags.inArea);
  const said = s.log.map((l) => l.text);
  // Not asked in the brief.
  expect(said.some((x) => /^Mustang North \d$/.test(x) && s.log.find((l) => l.text === x).result === 'choice')).toBe(false);
  expect(said.some((x) => /^Corpus Departure, .*, 500 feet off Navy Corpus, North MUSTANG\.$/.test(x))).toBe(true);
  expect(said.some((x) => /^\w+ \d+, Corpus Departure, radar contact, work MUSTANG \d\.$/.test(x))).toBe(true);
  const at = (re) => s.log.findIndex((l) => re.test(l.text));
  expect(at(/^Course rules: Foxtrot\/North Mustang Transition/)).toBeGreaterThan(0);
});

withSeed('the Beach Line transition: 5,500 and the manual\'s 240 KIAS, each when revealed', () => {
  let s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'MUSTANG North', 'skip'], (x) => current(x).kind === 'rule' && /Transition/.test(current(x).text));
  const step = current(s);
  expect(step.rule[step.rule.length - 1].cite).toBe('Course Rules Manual 2-3, VFR Departures');
  while (!s.cur.shown) s = reduce(s, { type: 'forward' });
  expect(s.fly.alt.v).toBe("5,500' MSL");
  expect(s.fly.kias.v).toBe('240 KIAS');
});

withSeed('KINGS 4\'s block is picked right before claiming it on KINGS 4 Common', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4'], (x) => x.flags.inArea, (x, now) => (now.choose === 'block' ? 'low' : null));
  const said = s.log.map((l) => l.text);
  const pick = said.indexOf('Low block');
  expect(pick).toBeGreaterThan(said.indexOf('Switching ATIS'));
  expect(said[pick + 1]).toMatch(/^99 KINGS 4, anybody working area \d low\?$/);
  // The area too, just before the block, and the claim names it.
  const area = said[pick - 1];
  expect(area).toMatch(/^Kings 4 MOA \d$/);
  expect(s.log[pick - 1].phase).not.toBe('Preflight');
  expect(said[pick + 1]).toContain(`area ${area.slice(-1)} low`);
  expect(s.block.name).toBe('Low block');
});

withSeed('once the high and low work are done, only the way home is offered', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4', 'break'],
    (x) => x.done,
    (x, now, ids) => {
      if (now.choose === 'leg' && x.flags.inArea) return ids.find((i) => /^Routes-Arrivals-4[2-5]$/.test(i) && runwayOk(x, i));
      if (now.choose === 'field' && x.node !== HOME) return ids.find((i) => /Departures/.test(i));
      return null;
    });
  // Out of Goliad after the area: straight home (the one way left is flown without asking),
  // never back into a working area.
  const after = s.route.slice(s.route.lastIndexOf('Point-default-38') + 1);
  expect(s.done).toBe(true);
  expect(after.some(isArea)).toBe(false);
  expect(after[after.length - 1]).toBe(HOME);
  expect(after.filter((id) => !isAirfield(id)).every((id) => fieldsAheadOf(id).includes(HOME) || isPattern(id) || /Shamrock|KNGP/.test(labelOf(id)))).toBe(true);
});

// --- Only what is this flight's; Waldron; the radios and the reveal ---------------------------

withSeed('an area\'s rule keeps only what is this flight\'s', () => {
  const base = start(LEGS, { card: { rwy: '13L' } });
  const words = (r) => (r || []).map((p) => p.text).join(' ');
  // MUSTANG 7 has its half's altitudes and exit as well as its own special rules.
  const seven = areaRules({ ...base, heading: 'Point-Arrivals-78' }, 'Working Areas-Mustang-198');
  expect(words(seven.entry)).toMatch(/Working altitudes/);
  expect(words(seven.entry)).toMatch(/If working MUSTANG areas 5, 6, 7, or 8/);
  expect(words(seven.entry)).not.toMatch(/Solos/);
  expect(words(seven.exit)).toMatch(/When complete Areas 5-8/);
  // Bound for Waldron, not home: no "If returning to KNGP".
  expect(words(seven.exit)).not.toMatch(/If returning to KNGP/);
  // MUSTANG 3: none of the 5-8 sentences.
  const three = areaRules({ ...base, heading: 'Routes-Arrivals-108' }, 'Working Areas-Mustang-197');
  expect(words(three.entry) + words(three.exit)).not.toMatch(/5, 6, 7, or 8|Areas 5-8/);
  expect(words(three.exit)).toMatch(/If returning to KNGP/);
});

test('a point is named with where it leads', () => {
  expect(labelOf('Point-Arrivals-78')).toBe('Camel Humps → Waldron NOLF (KNWL)');
});

// Fly MUSTANG South to Waldron, entering as `entry`.
const toWaldron = (entry) => walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'MUSTANG South', 'skip', entry],
  (x) => x.route.includes('Point-default-50') && current(x).choose === 'field',
  (x, now, ids) => (now.choose === 'leg' && (x.flags.inArea || x.flags.areaDone) ? ids.find((i) => /Point-Arrivals-78|Routes-Arrivals-8[6-9]/.test(i) && runwayOk(x, i)) : null));

withSeed('into Waldron by a break or a PEL: each says only its own request', () => {
  const flown = toWaldron('break');
  const rwy = activeRunway(flown, 'Point-default-50');
  const brk = flown.log.map((l) => l.text);
  // Asked once, at the check-out, not again on the arrival.
  expect(brk.filter((x) => /course rules to Waldron\.?$/.test(x))).toHaveLength(1);
  expect(brk.some((x) => /request High-Key to Waldron/.test(x))).toBe(false);
  expect(brk.some((x) => x.endsWith(`Initial ${rwy}.`))).toBe(true);
  // The check-out names where it is going.
  expect(brk.find((x) => /complete in MUSTANG \d/.test(x))).toMatch(/course rules to Waldron$/);
  const pelFlown = toWaldron('pel');
  const pelRwy = activeRunway(pelFlown, 'Point-default-50');
  const pel = pelFlown.log.map((l) => l.text);
  expect(pel.filter((x) => /request High-Key to Waldron\.?$/.test(x))).toHaveLength(1);
  expect(pel.some((x) => /course rules to Waldron\.$/.test(x))).toBe(false);
  expect(pel.some((x) => /^Waldron Tower, \w+ \d+, High-Key, \d+\.$/.test(x) && x.endsWith(`, ${pelRwy}.`))).toBe(true);
  expect(pel.some((x) => /Initial \d+\.$/.test(x))).toBe(false);
});

withSeed('a lone leg is flown without asking', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4'], (x) => x.flags.inArea);
  // PT Rusty leads only to the Rusty Entry: never offered alone.
  expect(s.log.filter((l) => l.result === 'choice' && /^Rusty Entry/.test(l.text))).toHaveLength(0);
  expect(s.log.some((l) => l.kind === 'route' && /^Rusty Entry/.test(l.text))).toBe(true);
});

test('a "Switching" call turns the radio, and a call\'s channel is revealed before the call', () => {
  let s = brief(start());
  while (current(s).text !== 'Switching ATIS') s = say(s);
  expect(current(s).radio).toBe('CH 1 UHF');
  s = reduce(s, { type: 'reveal' });
  expect(s.cur.shown).toBe(false);
  expect(s.fly.uhf.v).toBe('CH 1 UHF');
  expect(s.fly.vhf.v).toBe('CH 1 VHF');
  s = reduce(s, { type: 'reveal' });
  expect(s.cur.shown).toBe(true);
});

test('the squadron can be changed, and a restart keeps it', () => {
  let s = start(null, { card: { squadron: 'Boomer' } });
  expect(s.card.callSign).toMatch(/^Boomer \d+$/);
  s = reduce(s, { type: 'squadron', squadron: 'Ranger' });
  expect(s.card.callSign).toMatch(/^Ranger \d+$/);
  expect(reduce(s, { type: 'restart' }).card.squadron).toBe('Ranger');
});

test('the channel is asked only when a call switches to it', () => {
  let s = brief(start());
  while (current(s).text !== 'Switching ATIS') s = say(s);
  // Switching: the channel first.
  s = reduce(s, { type: 'reveal' });
  expect(s.cur.shown).toBe(false);
  s = reduce(s, { type: 'next' });
  s = reduce(s, { type: 'reveal' });
  s = reduce(s, { type: 'next' });
  // The ATIS itself is heard on that channel; the next call made on a channel already set is
  // revealed at once.
  for (let n = 0; n < 200; n++) {
    const now = current(s);
    if (now.kind === 'call' && now.radio && s.fly.uhf && s.fly.uhf.v === now.radio) break;
    s = say(s);
  }
  const now = current(s);
  expect(now.radio).toBe(s.fly.uhf.v);
  s = reduce(s, { type: 'reveal' });
  expect(s.cur.shown).toBe(true);
});

// --- Home by a straight-in; Goliad's side numbers; the ATIS off the CTAF ---------------------

// Out of the area straight home by the Goliad Arrival to PT SHAMROCK.
const homeByShamrock = (x, now, ids) => (now.choose === 'leg' && x.flags.inArea ? ids.find((i) => /Goliad Arrivals/.test(labelOf(i))) : null);

withSeed('home by a straight-in: its own rule and calls, no break', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4', 'straight'], (x) => x.done, homeByShamrock);
  const said = s.log.map((l) => l.text);
  const pick = said.indexOf('Straight-in');
  expect(pick).toBeGreaterThan(0);
  expect(said.slice(pick).some((x) => /SHAMROCK, Straight-in$/.test(x))).toBe(true);
  expect(said.slice(pick)).not.toContain('FAM FTI: The Break');
  expect(said.slice(pick).some((x) => /Numbers 13L$/.test(x))).toBe(false);
  expect(said.slice(pick).some((x) => /^Navy Corpus Tower, \w+ \d+, final, gear down$/.test(x))).toBe(true);
  expect(said.slice(pick)).toContain('Before Landing');
});

withSeed('home by the overhead: the straight-in paragraphs are left out', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4', 'break'], (x) => x.done, homeByShamrock);
  const rule = s.log.findIndex((l) => l.text === 'Course rules: PT Shamrock → Corpus Christi NAS (KNGP)');
  expect(rule).toBeGreaterThan(0);
  expect(s.log.slice(rule).some((l) => /SHAMROCK, Full Stop$/.test(l.text))).toBe(true);
});

withSeed('at Goliad the side number stands for the call sign', () => {
  const s = toGoliad(6, 'break');
  const side = s.card.side;
  const goliad = s.log.filter((l) => /^Goliad RDO, /.test(l.text));
  expect(goliad.length).toBeGreaterThan(1);
  // Setting up for the initial, a position report on the CTAF, with the whole call sign, after
  // the RDO gives the runway and before the initial.
  const said = s.log.map((l) => l.text);
  const traffic = said.findIndex((x) => x === `Goliad traffic, ${s.card.callSign}, inbound from PT Rusty for the initial runway 11, Goliad`);
  expect(traffic).toBeGreaterThan(said.findIndex((x) => /^Goliad landing 11\./.test(x)));
  expect(traffic).toBeLessThan(said.indexOf(goliad[0].text));
  // The first call gives the whole call sign; after it, the side number.
  expect(goliad[0].text).toBe(`Goliad RDO, ${s.card.callSign}, initial 11.`);
  goliad.slice(1).forEach((l) => expect(l.text).toMatch(new RegExp(`^Goliad RDO, ${side},`)));
});

withSeed('the ATIS is copied off the RDO, before the rule that goes to Approach', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['low', 'KINGS 4', 'Point-default-38', 'break', 'toArea', 'break'], (x) => x.done,
    (x, now, ids) => (now.choose === 'leg' && x.flags.inArea ? ids.find((i) => /Goliad Arrivals/.test(labelOf(i))) : null));
  const said = s.log.map((l) => l.text);
  const ask = said.findIndex((x) => /^Corpus Approach, .*course rules Shamrock with information/i.test(x));
  expect(ask).toBeGreaterThan(0);
  const atis = said.lastIndexOf('Switching ATIS', ask);
  const rule = said.lastIndexOf('Course rules: Goliad Arrivals → PT Shamrock', ask);
  expect(atis).toBeGreaterThan(0);
  expect(atis).toBeLessThan(rule);
});

withSeed('a PEL planned out of KINGS 4: clear of the area, then the simulated EP, then Goliad', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4', 'pel'], (x) => x.done,
    (x, now, ids) => (now.choose === 'leg' && x.flags.inArea ? ids.find((i) => /^KNGT Arrivals/.test(labelOf(i))) : null));
  const said = s.log.map((l) => l.text);
  const sign = s.card.callSign;
  const leaving = said.indexOf('Course rules: leaving KINGS 4');
  const center = said.indexOf(`Houston Center, ${sign}, Complete KINGS 4, Terminate Goliad.`);
  const departing = said.findIndex((x) => /^99 KINGS 4, .* departing area \d (high|low), PPEL Goliad\.$/.test(x));
  const clear = said.findIndex((x) => /^99 KINGS 4, .* clear of area/.test(x));
  const sim = said.findIndex((x) => /^Simulated, simulated, simulated, /.test(x));
  const goliad = said.indexOf('Course rules: leaving KINGS 4', leaving + 1);
  expect(leaving).toBeGreaterThan(0);
  expect(center).toBeGreaterThan(leaving);
  expect(departing).toBe(center + 1);
  expect(clear).toBe(departing + 1);
  expect(sim).toBeGreaterThan(clear);
  // The way to Goliad (its ASOS, then CH 15) only after the clear call and the EP.
  expect(goliad).toBeGreaterThan(sim);
  expect(said.filter((x) => /^Simulated, simulated/.test(x))).toHaveLength(1);
});

withSeed('a Waldron PEL: the Practice PEL entry and its calls, never the touch and go', () => {
  const s = toWaldron('pel');
  const said = s.log.map((l) => l.text);
  // The check-out asks for High-Key at Waldron, not another field's.
  expect(said.find((x) => /complete in MUSTANG \d/.test(x))).toMatch(/request High-Key to Waldron$/);
  expect(said.some((x) => /Touch and Go/i.test(x))).toBe(false);
  expect(said.some((x) => /Aransas County/.test(x))).toBe(false);
  // The manual's PPEL entry in place of the overhead's route.
  const rule = s.log.find((l) => l.kind === 'rule' && /KNWL/.test(l.text));
  expect(rule).toBeDefined();
  expect(said.some((x) => /Cooling Ponds|Shrimp Ponds/.test(x))).toBe(false);
  // Asked at the check-out; Approach answers direct Waldron with the runway ("Approach will
  // relay landing runway"); approaching High-Key, terminate; to Tower, intentions first, then
  // High-Key when told to report it.
  const ask = said.findIndex((x) => /complete in MUSTANG \d, request High-Key to Waldron$/.test(x));
  const rwy = activeRunway(s, 'Point-default-50');
  const runway = said.findIndex((x) => x.endsWith(`Corpus Approach, proceed direct Waldron, Waldron landing runway ${rwy}.`));
  const term = said.findIndex((x) => /approaching High-Key, terminate\.$/.test(x));
  const intent = said.findIndex((x) => /^Waldron Tower, .*, request practice PEL, runway \d+\.$/.test(x));
  const high = said.findIndex((x) => /^Waldron Tower, .*, High-Key, \d+\.$/.test(x) && x.endsWith(`, ${rwy}.`));
  expect(ask).toBeGreaterThan(0);
  expect(runway).toBe(ask + 1);
  expect(said.filter((x) => /request High-Key to Waldron/.test(x))).toHaveLength(1);
  expect(term).toBeGreaterThan(runway);
  expect(intent).toBe(term + 1);
  expect(said[intent + 1].endsWith(`Waldron Tower, runway ${rwy}, report High-Key.`)).toBe(true);
  expect(high).toBe(intent + 2);
});

withSeed('leaving Waldron, Tower is told; going home, the call picks SHAMROCK and the runway half', () => {
  let s = toWaldron('break');
  s = walk(s, ['fullStop'], (x) => x.done, (x, now, ids) => {
    if (now.choose === 'field') return ids.find((i) => /East Departures/.test(labelOf(i)));
    return null;
  });
  const said = s.log.map((l) => l.text);
  const tower = said.findIndex((x) => /^Waldron Tower, .*, departing to the east, terminate\.$/.test(x));
  expect(tower).toBeGreaterThan(0);
  const app = said.find((x) => /^Corpus Approach, .* with information/.test(x) && /Waldron|Power Plant/.test(x));
  expect(app).toMatch(/, (off Waldron|Abeam the Power Plant) with information \w[\w-]*, course rules SHAMROCK\.$/);
  expect(said.some((x) => /\w\/\w/.test(x) && !/NF\/TO|\d\/\d/.test(x))).toBe(false);
});

withSeed('the Shamrock check-in says where it is made, and is said once', () => {
  const goliad = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4'], (x) => x.done,
    (x, now, ids) => (now.choose === 'leg' && x.flags.inArea ? ids.find((i) => /Goliad Arrivals/.test(labelOf(i))) : null));
  expect(goliad.log.map((l) => l.text)).toContain(`Corpus Approach, ${goliad.card.callSign} at Woodsboro, course rules Shamrock with information ${goliad.card.atis}`);
  // Home from KINGS 4: no field named, Course Rules SHAMROCK, then clear.
  const home = goliad.log.map((l) => l.text);
  const center = home.indexOf(`Houston Center, ${goliad.card.callSign}, Complete KINGS 4, Terminate.`);
  expect(center).toBeGreaterThan(0);
  expect(home[center + 1]).toMatch(/departing area \d (high|low), Course Rules SHAMROCK\.$/);
  expect(home[center + 2]).toMatch(/clear of area \d (high|low)\.$/);
  const north = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'MUSTANG North', 'skip'], (x) => x.done,
    (x, now, ids) => (now.choose === 'leg' && x.flags.inArea ? ids.find((i) => /North Arrivals/.test(labelOf(i))) : null));
  const said = north.log.map((l) => l.text);
  expect(said.filter((x) => /^Corpus Approach, .*(Course Rules|course rules) SHAMROCK with information/i.test(x))).toHaveLength(1);
});

withSeed('low work first on MUSTANG: Waldron for South, Aransas County for North, by practice links', () => {
  const brief = (plan) => {
    let s = start(LEGS, { card: { rwy: '13L' } });
    s = reduce(s, { type: 'choose', id: 'low' });
    const plans = optionIds(s);
    s = reduce(s, { type: 'choose', id: plan });
    return { s, plans };
  };
  const { plans } = brief('MUSTANG South');
  expect(plans).toEqual(expect.arrayContaining(['KINGS 4', 'MUSTANG South', 'MUSTANG North']));
  [['MUSTANG South', 'Point-default-50'], ['MUSTANG North', 'Point-default-21']].forEach(([plan, field]) => {
    let { s } = brief(plan);
    s = walk(s, [field, 'break', 'toArea', 'skip'], (x) => x.done);
    expect(s.done).toBe(true);
    expect(s.route).toContain(field);
    expect(s.route.findIndex((r) => groupOf(r) === plan)).toBeGreaterThan(s.route.indexOf(field));
  });
});

// --- The audit: random flights, with back, emergencies and skips, never break ------------

const PHASES = ['Taxi', 'Takeoff', 'Departure', 'Pattern', 'Transit', 'Working area', 'Recovery', 'Landing', 'Taxi back'];
// The page's own history (history.js): back a step, or back to where a stage began.
const back = (h) => withHistory(h, { type: 'back' });
const act = (h, action) => withHistory(h, action);
// Left unfilled on purpose: the base call's names, which the student says.
const MEANT = /\(IP rank and last name\)|\(Your rank and last name\)/g;
const LEFTOVER = /(?:^|[^\d])[A-Za-z]+\/[A-Za-z]+|\bXXX\b|___|\((?:call sign|RWY|position|altitude|AC ID)[^)]*\)/i;
const SLASH_OK = /NF\/TO\/LDG|climb\/accelerate|Foxtrot\/North Mustang|AOA ball/i;

function fuzz(seed, plan, order) {
  const r = rng(seed);
  let h = begin(start(LEGS, { rng: rng(seed + 3), fields: FIELDS }));
  const begun = Date.now();
  const problems = [];
  for (let n = 0; n < 6000 && !h.now.done; n++) {
    const s = h.now;
    if (s.ep && s.ep.done) { h = act(h, { type: 'resume' }); continue; }
    const now = current(s);
    if (!now) { problems.push(`no step, not done, after ${s.log.slice(-2).map((l) => l.text).join(' | ')}`); break; }
    const roll = r();
    if (roll < 0.04 && h.past.length) { h = back(h); continue; }
    if (roll < 0.045) {
      const to = [...backable(h)];
      if (to.length) { h = act(h, { type: 'backTo', phase: to[Math.floor(r() * to.length)] }); continue; }
    }
    if (roll < 0.05) { h = act(h, { type: 'situation', rng: r }); continue; }
    if (roll < 0.06) {
      const t0 = Date.now();
      h = act(h, { type: 'skipTo', phase: PHASES[Math.floor(r() * PHASES.length)] });
      if (Date.now() - t0 > 2000) problems.push(`slow skip ${Date.now() - t0} ms`);
      continue;
    }
    if (now.kind === 'choose' || now.kind === 'ask') {
      const ids = optionIds(s);
      if (!ids.length) { problems.push(`no options for ${now.choose} at ${labelOf(s.node)}`); break; }
      let id = ids[Math.floor(r() * ids.length)];
      if (now.choose === 'order') id = order;
      if (now.choose === 'plan' && ids.includes(plan)) id = plan;
      if (now.choose === 'altitude') id = ids.find((a) => !problemWith(now.maneuver, Number(a), s.block)) || ids[0];
      if (now.choose === 'cua') id = cuaRight(s);
      // Land in the end: after a while, the way home.
      if (s.log.length > 400 && ids.includes('fullStop')) id = 'fullStop';
      h = act(h, { type: 'choose', id });
    } else h = { ...h, now: say(s) };
  }
  if (!h.now.done) problems.push(`not done after ${h.now.log.length} lines at ${labelOf(h.now.node)}`);
  if (h.now.route.filter(isArea).length > 1) problems.push(`a working area flown twice: ${h.now.route.filter(isArea).map(labelOf).join(', ')}`);
  if (Date.now() - begun > 8000) problems.push(`slow flight ${Date.now() - begun} ms`);
  h.now.log.filter((l) => ['call', 'reply'].includes(l.kind) && l.text).forEach((l) => {
    const t = l.text.replace(MEANT, '');
    if (LEFTOVER.test(t.replace(SLASH_OK, ''))) problems.push(`unfilled: ${l.text}`);
  });
  return problems;
}

test('random flights with back, emergencies and skips: no throw, no dead end, nothing unfilled', () => {
  const found = new Map();
  const cases = ['KINGS 4', 'MUSTANG North', 'MUSTANG South', 'FOXTROT']
    .flatMap((plan) => ['high', 'low'].flatMap((order) => Array.from({ length: 12 }, () => [plan, order])));
  cases.forEach(([plan, order], i) => {
    const seed = i + 1;
    let problems;
    try { problems = fuzz(seed, plan, order); } catch (e) { problems = [`threw: ${e.message} ${e.stack.split('\n')[1]}`]; }
    problems.forEach((p) => found.set(p, `${plan} ${order} seed ${seed}`));
  });
  expect([...found].map(([p, where]) => `${where}: ${p}`)).toEqual([]);
}, 600000);

withSeed('Skip to Pattern on a MUSTANG flight is quick and lands at its field, not home', () => {
  ['MUSTANG North', 'MUSTANG South', 'FOXTROT'].forEach((plan) => {
    let s = start(LEGS, { card: { rwy: '13L' } });
    s = reduce(s, { type: 'choose', id: 'high' });
    s = reduce(s, { type: 'choose', id: plan });
    const t0 = Date.now();
    const out = reduce(s, { type: 'skipTo', phase: 'Pattern' });
    expect(Date.now() - t0).toBeLessThan(3000);
    // FOXTROT has no field of its own: nothing to skip to, and the stage button says so.
    if (plan === 'FOXTROT') expect(canSkipTo(s, 'Pattern')).toBe(false);
    else expect(current(out).phase).toBe('Pattern');
  });
});

// --- Situations: what each one does to the flight ------------------------------------------

// Make situation `id` come up now, say it through, and go back to the flight.
function happen(s, id) {
  const fit = situationsFor(s).map((x) => x.id);
  expect(fit).toContain(id);
  s = reduce(s, { type: 'situation', rng: () => (fit.indexOf(id) + 0.5) / fit.length });
  // Every rule in it is cited; every line nobody published is marked generated.
  // (What sets it off is described, not said: `plain`.)
  s.ep.steps.forEach((x) => expect(!!x.ref || !!x.generated || !!x.plain || x.kind === 'call').toBe(true));
  s.ep.steps.filter((x) => x.kind === 'rule').forEach((x) => expect(x.ref).toBeDefined());
  while (!s.ep.done) s = say(s);
  return reduce(s, { type: 'resume' });
}
const inTheArea = () => walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4'], (x) => current(x).choose === 'maneuver' && x.hwFlown.length === 1);

withSeed('Joker in the area ends the high work: the next thing is the way out', () => {
  const s = happen(inTheArea(), 'joker');
  expect(s.flags.joker).toBe(true);
  expect(current(s).choose).toBe('leg');
  expect(situationsFor(s).map((x) => x.id)).not.toContain('joker');
});

withSeed('Bingo in the area: out of it and home, no field, no more area', () => {
  let s = happen(inTheArea(), 'bingo');
  expect(s.flags.bingo).toBe(true);
  s = walk(s, [], (x) => x.done);
  const after = s.route.slice(s.route.findIndex((r) => isArea(r)) + 1);
  expect(after.some((r) => isArea(r) || (isAirfield(r) && r !== HOME))).toBe(false);
  expect(s.done).toBe(true);
});

withSeed('a wave-off at Goliad goes round again: the next thing is the field choice', () => {
  let s = walk(start(LEGS, { card: { rwy: '13L' } }), ['low', 'KINGS 4', 'Point-default-38', 'break', 'Routes-Traffic Patterns-39', 'lap'],
    (x) => x.node === 'Point-default-38' && current(x).kind === 'call' && /180/.test(current(x).text));
  s = happen(s, 'waveOff');
  expect(current(s).choose).toBe('field');
  expect(s.log.some((l) => /, waving off\.$/.test(l.text))).toBe(true);
});

withSeed('the pattern full at Goliad: hold, then cleared in, then the initial', () => {
  let s = walk(start(LEGS, { card: { rwy: '13L' } }), ['low', 'KINGS 4', 'Point-default-38', 'break'], (x) => current(x).kind === 'call' && /^Goliad RDO, .*initial/.test(current(x).text));
  const initial = current(s);
  s = happen(s, 'full');
  expect(current(s)).toEqual(initial);
  expect(s.log.some((l) => /holding over the initial/.test(l.text))).toBe(true);
});

withSeed('recovering, fuel at landing is declared to whoever you are talking to', () => {
  let s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4'], (x) => x.airborne && current(x).phase === 'Recovery',
    (x, now, ids) => (now.choose === 'leg' && x.flags.inArea ? ids.find((i) => /Goliad Arrivals/.test(labelOf(i))) : null));
  s = happen(s, 'fuel');
  expect(s.log.some((l) => /^Corpus Approach, .*, (minimum fuel|declaring emergency fuel), \d+ pounds\.$/.test(l.text))).toBe(true);
  expect(situationsFor(s).map((x) => x.id)).not.toContain('fuel');
});

// --- History: back a step, back to a stage; the report for testers -------------------------

withSeed('a stage begun can be gone back to: the flight is where that stage began, all since gone', () => {
  let h = begin(start(LEGS, { card: { rwy: '13L' } }));
  for (let n = 0; n < 400 && phaseOf(h.now) !== 'Working area'; n++) {
    const now = current(h.now);
    if (now.kind === 'choose' || now.kind === 'ask') {
      const ids = options(h.now).map((o) => o.id);
      h = withHistory(h, { type: 'choose', id: ['high', 'KINGS 4', 'run'].find((x) => ids.includes(x)) || ids[0] });
    } else h = withHistory(h, { type: 'forward' });
  }
  expect(phaseOf(h.now)).toBe('Working area');
  expect([...backable(h)]).toEqual(expect.arrayContaining(['Preflight', 'Taxi', 'Takeoff', 'Departure']));
  const taxi = h.marks.find((m) => m.phase === 'Taxi');
  const back = withHistory(h, { type: 'backTo', phase: 'Taxi' });
  expect(back.now).toBe(taxi.state);
  expect(phaseOf(back.now)).toBe('Taxi');
  expect(back.past).toHaveLength(taxi.depth);
  expect(back.marks.map((m) => m.phase)).not.toContain('Departure');
  // Then on again, and back a step at a time to the very start.
  let b = back;
  while (b.past.length) b = withHistory(b, { type: 'back' });
  expect(phaseOf(b.now)).toBe('Preflight');
  expect(b.marks).toHaveLength(1);
});

test('the history keeps at most CAP states back', () => {
  let h = begin(start(LEGS, { card: { rwy: '13L' } }));
  for (let n = 0; n < CAP + 50; n++) h = withHistory(h, { type: 'squadron', squadron: n % 2 ? 'Boomer' : 'Ranger' });
  expect(h.past).toHaveLength(CAP);
});

withSeed('the report for testers says the plan, the route, the choices and the last lines', () => {
  const s = walk(start(LEGS, { card: { rwy: '13L' } }), ['high', 'KINGS 4'], (x) => x.flags.inArea);
  const text = flightText(s, { url: 'http://localhost/primary/practice', when: new Date('2026-10-25T12:00:00Z') });
  expect(text.split('\n').slice(0, 2)).toEqual(['Practice Flight report', '2026-10-25T12:00:00.000Z http://localhost/primary/practice']);
  expect(text).toMatch(new RegExp(`Call sign ${s.card.callSign}, runway 13L`));
  expect(text).toMatch(/Plan: high work first, KINGS 4/);
  expect(text).toMatch(/Route: Corpus Christi NAS \(KNGP\) → KNGP Rusty Departures 13L → /);
  expect(text).toMatch(/Choices: High work first \/ KINGS 4/);
  expect(text.split('\n').length).toBeLessThanOrEqual(9 + 25);
});


withSeed('out of MUSTANG North to Aransas County: the acronym, its weather, then the runway by the wind; Approach clears you direct; then the EP', () => {
  let s = start(LEGS, { card: { rwy: '13L', windDir: '150', windSpeed: 12 }, fields: FIELDS });
  let refused = null;
  // As the student does: the field, the acronym, its weather, then its runway.
  s = walk(s, ['high', 'MUSTANG North', 'skip', 'pel', 'abcdont'], (x) => x.done || (x.node === 'Point-default-21' && current(x).choose === 'field'), (x, now, ids) => {
    if (now.choose === 'leg' && x.flags.inArea) return ids.find((i) => i === 'to:Point-default-21');
    if (now.choose === 'runway') {
      const wrong = options(x).map((o) => o.id).find((i) => !runwayOk(x, i));
      if (wrong && !refused) refused = reduce(x, { type: 'choose', id: wrong }).cur.problem;
      return ids.find((i) => runwayOk(x, i));
    }
    return null;
  });
  const fieldOpts = options(s).map((o) => labelOf(o.id));
  const said = s.log.map((l) => l.text);
  const at = (re) => said.findIndex((x) => re.test(x));
  // Wind 150: runway 14, not 18 (or the reciprocals).
  expect(activeRunway(s, 'Point-default-21')).toBe('14');
  expect(refused).toMatch(/^With the wind 150 at 12, runway \d+ would not be the active runway\.$/);
  // The field, the acronym, the weather (VHF, no letter), then the runway: all in the area.
  const field = said.indexOf('Aransas County Airport (KRKP)');
  const aid = at(/^VT-28 technique: Checking out of the MOA/);
  const wx = at(/^Aransas County automated weather observation\. Wind 150 at 12\./);
  const runway = said.indexOf('Runway 14');
  const out = at(/complete in MUSTANG \d/);
  expect(field).toBeGreaterThan(0);
  expect(aid).toBeGreaterThan(field);
  expect(wx).toBeGreaterThan(aid);
  expect(s.log[wx].radio).toBe('119.275 VHF');
  expect(runway).toBeGreaterThan(wx);
  expect(out).toBeGreaterThan(runway);
  // Approach clears you direct and terminates you; then the IP's simulated emergency.
  const direct = at(/Corpus Approach, proceed direct Rockport, radar service terminated, frequency change approved\.$/);
  const sim = at(/^Simulated, simulated, simulated, /);
  expect(direct).toBe(out + 1);
  expect(said[direct + 1]).toMatch(/, direct Rockport, frequency change approved\.$/);
  expect(sim).toBeGreaterThan(direct + 1);
  // In: the rule, the self-announce (from the south off areas 2 and 6, else the west), then
  // KRKP Common; no second "terminate".
  const area = (/(\d+)$/.exec(labelOf(s.route.find((r) => isArea(r)))) || [])[1];
  const rule = at(/^Course rules: KRKP Arrivals 14$/);
  const announce = at(/^Aransas County Traffic, .*, 10 miles to the (south|west).*inbound for a high left overhead/);
  expect(rule).toBeGreaterThan(sim);
  expect(announce).toBe(rule + 1);
  expect(said[announce]).toMatch(['2', '6'].includes(area) ? /to the south/ : /to the west/);
  expect(said[announce + 1]).toBe('Any Texans working Aransas County?');
  expect(said[announce + 2]).toMatch(/is inbound for High-Key\.$/);
  expect(said.some((x) => /^Corpus Approach, .*, terminate\.$/.test(x))).toBe(false);
  // At the field: the pattern and departures for runway 14 only.
  expect(fieldOpts.every((o) => /14/.test(o))).toBe(true);
});

test('about four landings in ten round a pattern are waved off', () => {
  let landings = 0;
  let waved = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const s = fly(seed, { legs: LEGS });
    const said = s.log.map((l) => l.text);
    // Every landing round a pattern ends in the choice of what next (another lap, a departure, a full stop).
    landings += s.log.filter((l) => l.result === 'choice' && /^(Touch and go|Full stop|Depart for)|Departures/.test(l.text)).length;
    waved += said.filter((x) => /, waving off\.$/.test(x)).length;
  }
  expect(landings).toBeGreaterThan(100);
  expect(waved / landings).toBeGreaterThan(0.25);
  expect(waved / landings).toBeLessThan(0.55);
});
