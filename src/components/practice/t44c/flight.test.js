import { AREAS, KNGW_SIDE } from './routes';
import { markFigures } from './marks';
import { PROFILES } from './numbers';
import { PHASES, canBackTo, current, epsFor, reduce, start, totalOf, withHistory } from './flight';
import { lapLog } from './patternLaps';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textsOf = (step) => {
  if (step.kind === 'call' || step.kind === 'auto') return [step.text, ...(step.lead || []).map((r) => r.text), ...(step.replies || []).map((r) => r.text), step.radio].filter(Boolean);
  if (step.kind === 'rule') return step.rule.map((p) => p.text);
  if (step.kind === 'numbers') return step.rows.map((r) => r[1]);
  return [];
};

// Fly a whole flight, taking `pick` at every choice.
function fly(card, rng, pick) {
  let s = start({ rng, card });
  const seen = [];
  for (let i = 0; i < 4000 && !s.done; i++) {
    const step = current(s);
    expect(step).toBeTruthy();
    seen.push(step);
    textsOf(step).forEach((t) => {
      expect(typeof t).toBe('string');
      expect(t).not.toMatch(/\{\w+\}|undefined|null/);
    });
    s = step.kind === 'choose' ? reduce(s, { type: 'choose', id: pick(step, s) }) : reduce(s, { type: 'next' });
  }
  expect(s.done).toBe(true);
  return { s, seen };
}

const random = (rng) => (step) => {
  // Prefer to finish: a pass ends in a full stop and high work in leaving, sooner or later.
  const o = step.options;
  const done = o.find((x) => ['done', 'stop', 'leave'].includes(x.id));
  if (done && rng() < 0.4) return done.id;
  return o[Math.floor(rng() * o.length)].id;
};

describe('T-44C practice flight', () => {
  test('hundreds of flights, every way, reach the line with every blank filled', () => {
    const areas = new Set();
    const fields = new Set();
    for (let seed = 1; seed <= 400; seed++) {
      const rng = seeded(seed);
      const { s, seen } = fly({}, rng, random(rng));
      areas.add(s.area);
      fields.add(s.dest);
      // Taxi back: After Landing, then Ground, then Secure 1 to 6 and the PF's continue in the spot.
      const back = [...new Set(seen.filter((x) => x.phase === 'Taxi back'))].map((x) => x.name || x.text);
      expect(back.slice(1)).toEqual(['After Landing', back[2], 'Secure, steps 1 to 6', 'Continue the checklist.']);
      expect(back[2]).toMatch(/Ground, .*taxi to my line/);
      expect(seen.some((x) => x.kind === 'call' && /taxi to my line/.test(x.text))).toBe(true);
    }
    expect(areas.size).toBe(Object.keys(AREAS).length);
    expect(fields.has('KNGW')).toBe(true);
    expect(fields.has('KNGP')).toBe(true);
  });

  test('every step belongs to a phase of the flight, in order but for the Taxi back', () => {
    const rng = seeded(7);
    const { seen } = fly({}, rng, random(rng));
    seen.forEach((step) => expect(PHASES).toContain(step.phase));
  });

  test('the stages run in order, Pattern again only after a Recovery from Cabaniss, and Landing is the full stop', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const rng = seeded(seed);
      const { seen } = fly({}, rng, random(rng));
      const order = seen.map((x) => x.phase).filter((p, i, all) => p !== all[i - 1]);
      order.slice(1).forEach((p, i) => {
        const back = PHASES.indexOf(p) < PHASES.indexOf(order[i]);
        expect(back ? `${order[i]}>${p}` : 'forward').toBe(back ? 'Recovery>Pattern' : 'forward');
      });
      expect(order.slice(-2)).toEqual(['Landing', 'Taxi back']);
      expect([...new Set(seen.filter((x) => x.phase === 'Landing'))].map((x) => x.title)).toEqual(['Full stop']);
    }
  });

  test('Foxtrot and Cheetah recover to Navy Corpus: the manual gives them no Cabaniss arrival', () => {
    ['foxtrot-1', 'foxtrot-2', 'cheetah-n', 'cheetah-s'].forEach((area) => {
      const rng = seeded(11);
      const { seen, s } = fly({}, rng, (step) => (step.on === 'area' ? area : random(rng)(step)));
      expect(s.dest).toBe('KNGP');
      expect(seen.some((x) => x.on === 'dest')).toBe(false);
    });
  });

  test('a Cabaniss flight from South Seagull flies the Southern entry and then the home field', () => {
    const rng = seeded(3);
    const { seen, s } = fly({}, rng, (step) => {
      if (step.on === 'area') return 'seagull-s';
      if (step.on === 'dest') return 'KNGW';
      return random(rng)(step);
    });
    expect(seen.some((x) => x.kind === 'rule' && /Southern Course Rules/.test(x.title))).toBe(true);
    const cabCalls = seen.filter((x) => x.kind === 'call' && x.radio === 'CH 15');
    expect(cabCalls.length).toBeGreaterThan(0);
    expect(s.field).toBe('KNGP');
  });

  test('the 180 call names the pattern side at each field', () => {
    const rng = seeded(21);
    const { seen, s } = fly({ rng: undefined }, rng, (step) => {
      if (step.on === 'area') return 'seagull-n';
      if (step.on === 'dest') return 'KNGW';
      return random(rng)(step);
    });
    const abeam = seen.filter((x) => x.kind === 'fly').flatMap((x) => lapLog(x)).find((l) => /Cabaniss Tower.*180/.test(l.text));
    expect(abeam.text).toContain(`${KNGW_SIDE[s.card.cabRwy]} 180`);
  });

  test('from the initial call the pattern is flown: the break, then a lap at each touchdown, all of it in the log', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = seeded(seed);
      const { seen, s } = fly({}, rng, random(rng));
      const flown = seen.filter((x) => x.kind === 'fly');
      expect(flown[0].lap).toBe('break');
      // Right after the initial call or the Tower's report-the-numbers (from Cabaniss by Sunrise).
      const i = seen.indexOf(flown[0]);
      const before = seen[i - 1];
      if (!(before.kind === 'rule' && /^Pattern entry/.test(before.title))) expect(before.kind).toBe('call');
      expect(seen.some((x) => x.kind === 'rule' && x.title === 'The overhead')).toBe(false);
      flown.filter((x) => x.phase === 'Pattern').forEach((x) => {
        const next = seen[seen.indexOf(x) + 1];
        expect(next.kind === 'choose' && next.on === 'lap').toBe(true);
        // The flight's own call sign, never Pattern Work's.
        lapLog(x).forEach((l) => expect(l.text).not.toMatch(/MNTNA 12(?!\d)/));
        if (x.lap === 'break' && x.cleared) expect(lapLog(x).some((l) => /numbers for the break/.test(l.text))).toBe(false);
      });
      // Each lap is the one chosen: the break opens on the overhead, an SSE pass on its wave-off.
      flown.forEach((x) => {
        const first = (lapLog(x)[0] || {}).text;
        if (x.lap === 'break') expect(first).toMatch(x.cleared ? /flaps approach|Landing Checklist/ : /numbers for the break/);
        if (['approach', 'noflap', 'full'].includes(x.lap)) expect(first).toBe('Reset Flaps and Trim');
        if (x.lap === 'sse') expect(first).toBe('Landing gear up');
      });
      const said = s.log.filter((l) => l.phase === 'Pattern').map((l) => l.text);
      expect(said.some((t) => /180, three down and locked/.test(t))).toBe(true);
    }
  });

  test('a call is one reveal, then Next moves on; a rule reveals piece by piece', () => {
    let s = start({ rng: seeded(5) });
    s = reduce(s, { type: 'choose', id: 'seagull-c' });
    while (current(s).kind !== 'call') s = reduce(s, { type: 'readNext' });
    const ground = current(s);
    expect(ground.kind).toBe('call');
    expect(totalOf(ground)).toBe(1);
    s = reduce(s, { type: 'reveal' });
    expect(s.cur.shown).toBe(true);
    s = reduce(s, { type: 'next' });
    expect(current(s)).not.toBe(ground);
  });

  test('Back returns exactly the earlier flight, and an emergency freezes the step it interrupts', () => {
    let h = { past: [], now: start({ rng: seeded(9) }) };
    const first = h.now;
    h = withHistory(h, { type: 'choose', id: 'foxtrot-1' });
    expect(h.now.area).toBe('foxtrot-1');
    h = withHistory(h, { type: 'back' });
    expect(h.now).toBe(first);
    h = withHistory(h, { type: 'choose', id: 'foxtrot-1' });
    h = withHistory(h, { type: 'next' });
    const before = current(h.now);
    h = withHistory(h, { type: 'ep' }, () => 0);
    expect(current(h.now).kind).toBe('ep');
    const n = totalOf(current(h.now));
    for (let i = 0; i <= n; i++) h = withHistory(h, { type: 'next' });
    expect(current(h.now)).toBe(before);
  });

  test('before takeoff runs in the order given, each exchange one step, with the checklists named', () => {
    let s = start({ rng: seeded(31), card: { rwy: '13L' } });
    s = reduce(s, { type: 'choose', id: 'seagull-c' });
    expect(s.steps.map((x) => x.name || x.text.slice(0, 24))).toEqual([
      'Before Start', 'Right Start', 'Left Start', 'After Start',
      expect.stringMatching(/^Navy Corpus information/), expect.stringMatching(/Base, /), expect.stringMatching(/^Navy Corpus Ground/),
      'Engine Runup', 'Before Takeoff',
      expect.stringMatching(/^Seagull/), expect.stringMatching(/^Back me up/), expect.stringMatching(/^Navy Corpus Ground/), expect.stringMatching(/^Navy Corpus Tower/),
    ]);
    const calls = s.steps.filter((x) => x.kind === 'call');
    calls.filter((x) => !/^Back me up/.test(x.text)).forEach((x) => {
      expect(x.lead[0].who).toBe('PF');
      if (x.replies.length) expect(x.replies[x.replies.length - 1].who).toBe(/Base, /.test(x.text) ? 'Base' : 'PM');
    });
    const brief = calls.find((x) => /^Back me up/.test(x.text));
    expect(brief.replies.some((r) => /TOLD.*____/.test(r.text))).toBe(true);
    expect(brief.replies.map((r) => r.text)).toContain('No.');
    expect(brief.replies.some((r) => /out of the yellow/.test(r.text))).toBe(false);
    const further = calls.find((x) => /further taxi/.test(x.text));
    expect(further.lead[0].text).toBe('Hold the checklist. Check me out of the yellow. Request further taxi.');
    expect(further.replies[0].text).toMatch(/taxi to runway 13L via Yankee, Bravo, Charlie, runway 22, cross 18\.$/);
    expect(further.replies[0].text).not.toMatch(/number one/);
    expect(further.replies[1].text).toMatch(/^Taxi to runway 13L .*MN|^Taxi to runway 13L .*ST/);
    const tower = calls.find((x) => /^Navy Corpus Tower/.test(x.text));
    expect(tower.text).toMatch(/number one, holding short/);
    expect(tower.replies[0].text).toMatch(/winds are \d{3} at \d+, runway 13L, cleared for takeoff\.$/);
    calls.forEach((x) => expect(x.when).toBeTruthy());
  });

  test('after takeoff: Tower switches you, the call to Departure, then the Climb Checklist', () => {
    let s = start({ rng: seeded(35) });
    s = reduce(s, { type: 'choose', id: 'seagull-c' });
    while (!/further taxi/.test(current(s).text || '')) s = reduce(s, { type: 'readNext' });
    s = reduce(s, { type: 'readNext' });
    s = reduce(s, { type: 'readNext' });
    const texts = s.steps.map((x) => x.text || x.name || x.title);
    expect(texts.some((t) => /Landing gear up/.test(t))).toBe(false);
    const at = s.steps.findIndex((x) => /Corpus Departure/.test(x.text || ''));
    expect(s.steps[at].lead[0]).toMatchObject({ who: 'Tower', text: expect.stringMatching(/switch Departure/) });
    expect(s.steps[at].text).toMatch(/, 500 feet off Navy Corpus, course rules to Seagull\.$/);
    expect(s.steps[at + 1].name).toBe('Climb');
  });

  test('a course rule marks its figures and leaves the runway numbers alone', () => {
    expect(markFigures("31R: HDG 315°. Passing 300' AGL execute right turn HDG 105°.")).toBe("31R: HDG [[315°]]. Passing [[300']] AGL execute right turn HDG [[105°]].");
    expect(markFigures("proceed to the CRP 130/026 fix at 2500' MSL")).toBe("proceed to the CRP [[130/026]] fix at [[2500']] MSL");
    expect(markFigures('contact SEAGULL at 26 DME, no later than 33.8 DME.')).toBe('contact SEAGULL at [[26]] DME, no later than [[33.8]] DME.');
    expect(markFigures('maintain 200 KIAS, contact Tower (CH 4)')).toBe('maintain [[200]] KIAS, contact Tower (CH [[4]])');
    expect(markFigures('RWY 18, 22. Report initial')).toBe('RWY 18, 22. Report initial');
  });

  test('every rule figure is a stop, and revealing one fills only that stop', () => {
    const rng = seeded(61);
    const { seen } = fly({}, rng, random(rng));
    const rules = seen.filter((x) => x.kind === 'rule');
    expect(rules.length).toBeGreaterThan(3);
    rules.forEach((x) => x.pieces.forEach((p) => expect(x.rule[p.para].text).toContain('[[')));
  });

  test('every high work profile flies its maneuvers in order and goes on to the area exit', () => {
    Object.keys(PROFILES).forEach((profile, n) => {
      ['seagull-c', 'foxtrot-1', 'cheetah-n'].forEach((area) => {
        const rng = seeded(70 + n);
        let s = start({ rng, profile });
        const seen = [];
        for (let i = 0; i < 4000 && !s.done; i++) {
          const step = current(s);
          seen.push(step);
          if (step.kind === 'choose') {
            expect(step.on).not.toBe('maneuver');
            expect(step.on).not.toBe('descent');
            s = reduce(s, { type: 'choose', id: step.on === 'area' ? area : random(rng)(step) });
          } else s = reduce(s, { type: 'next' });
        }
        expect(s.done).toBe(true);
        expect(s.flown).toEqual(PROFILES[profile]);
        expect([...new Set(seen)].filter((x) => x.title === 'Emergency descent')).toHaveLength(1);
        expect([...new Set(seen)].filter((x) => x.title === 'Pre-stall checks')).toHaveLength(1);
        expect(seen.some((x) => /Manual/i.test(x.title || ''))).toBe(false);
      });
    });
  });

  test('FAM4201 runs ditches then airstarts, and a None flight still asks', () => {
    expect(PROFILES.FAM4201.slice(-5)).toEqual(['ditchOn', 'ditchSse', 'ditchOff', 'starter', 'windmill']);
    let s = start({ rng: seeded(90) });
    expect(s.profile).toBe('');
    s = reduce(s, { type: 'choose', id: 'foxtrot-1' });
    while (current(s).kind !== 'choose') s = reduce(s, { type: 'readNext' });
    expect(current(s).on).toBe('maneuver');
  });

  test('A-C-A-S-A rides over its steps to Cabaniss, A-B-C over the brief-first exit to Navy Corpus', () => {
    const exitLetters = (dest, area = 'seagull-n') => {
      const rng = seeded(97);
      let s = start({ rng, profile: 'FAM4101' });
      const seen = [];
      for (let i = 0; i < 4000 && !s.done; i++) {
        const step = current(s);
        if (!seen.includes(step)) seen.push(step);
        if (step.kind === 'choose') s = reduce(s, { type: 'choose', id: step.on === 'area' ? area : step.on === 'dest' ? dest : step.options[step.options.length - 1].id }, rng);
        else s = reduce(s, { type: 'next' }, rng);
      }
      return seen.filter((x) => x.mnemonic).map((x) => `${x.mnemonic.letters[x.mnemonic.at]}${x.mnemonic.at} ${x.kind === 'checklist' ? x.name : x.lines ? 'call' : x.kind}`);
    };
    expect(exitLetters('KNGW').map((x) => x.split(' ')[0])).toEqual(['A0', 'C1', 'A2', 'S3', 'A4']);
    ['seagull-n', 'foxtrot-1', 'cheetah-s'].forEach((area) => {
      const abc = exitLetters('KNGP', area);
      expect(abc.map((x) => x.split(' ')[0])).toEqual(['A0', 'B1', 'C2']);
      expect(abc[2]).toMatch(/Approach/);
    });
  });

  test('single-engine maneuvers run the cut, the shutdown, then what follows; a clean stall recovers clean', () => {
    const tables = (id) => {
      let s = start({ rng: seeded(98) });
      s = reduce(s, { type: 'choose', id: 'seagull-c' });
      while (current(s).on !== 'maneuver') s = reduce(s, { type: 'readNext' });
      s = reduce(s, { type: 'choose', id });
      return s.steps.slice(s.at).filter((x) => x.kind === 'numbers').map((x) => x.title);
    };
    expect(tables('sseAlt')).toEqual(['SSE at altitude', 'Emergency shutdown', 'Back to two engines']);
    expect(tables('dynamic')).toEqual(['Dynamic engine cut', 'Emergency shutdown, first three items', 'Dynamic engine cut, after three items']);
    let s = start({ rng: seeded(99) });
    s = reduce(s, { type: 'choose', id: 'seagull-c' });
    while (current(s).on !== 'maneuver') s = reduce(s, { type: 'readNext' });
    s = reduce(s, { type: 'choose', id: 'stallClean' });
    const recovery = s.steps.find((x) => x.title === 'Stall recovery');
    expect(recovery.rows.map((r) => r[0])).not.toContain('Flaps');
    expect(start({ rng: seeded(5) }).card.callSign).toMatch(/^MNTNA \d+$/);
  });

  test('every leg a flight draws is a line on the map, for every runway at both fields', () => {
    // eslint-disable-next-line global-require
    const kmlText = require('fs').readFileSync(require('path').resolve(__dirname, '../../../../public/kml/t44c-routes.kml'), 'utf8');
    const names = new Set([...kmlText.matchAll(/<name>([^<]*)<\/name>/g)].map((m) => m[1]));
    const legs = new Set();
    for (let n = 0; n < 160; n++) {
      const rng = seeded(500 + n);
      let s = start({ rng });
      for (let i = 0; i < 4000 && !s.done; i++) {
        const step = current(s);
        if (step.leg) legs.add(step.leg);
        s = reduce(s, step.kind === 'choose' ? { type: 'choose', id: random(rng)(step) } : { type: 'next' }, rng);
      }
      s.route.forEach((r) => legs.add(r));
    }
    expect([...legs].filter((l) => !names.has(l))).toEqual([]);
    expect([...legs].some((l) => /^Cabaniss Southern Departure \d+$/.test(l))).toBe(true);
    expect([...legs].some((l) => /^Shamrock to KNGP /.test(l))).toBe(true);
  });

  test('a stage ahead is skipped to, and a stage begun is gone back to from its start', () => {
    let h = { past: [], now: start({ rng: seeded(31) }) };
    h = withHistory(h, { type: 'choose', id: 'foxtrot-1' }, seeded(32));
    h = withHistory(h, { type: 'next' }, seeded(33));
    h = withHistory(h, { type: 'skipTo', phase: 'Area Exit' }, seeded(34));
    expect(current(h.now).phase).toBe('Area Exit');
    expect(canBackTo(h, 'Ground Ops')).toBe(true);
    const back = withHistory(h, { type: 'backTo', phase: 'Ground Ops' }, seeded(35));
    expect(current(back.now).phase).toBe('Ground Ops');
    expect(back.now.at).toBe(0);
    expect(withHistory(h, { type: 'skipTo', phase: 'Preflight' }, seeded(36))).toBe(h);
  });

  test('the wind: a runway picked in Preflight is the runway; random every time draws a new one leaving the area', () => {
    let s = start({ rng: seeded(41) });
    expect(s.windPick).toBe('every');
    s = reduce(s, { type: 'wind', pick: '31R' }, seeded(42));
    expect(s.card.rwy).toBe('31R');
    s = reduce(s, { type: 'wind', windDir: '135' }, seeded(43));
    expect(s.card.windDir).toBe('140');
    expect(['13L', '13R']).toContain(s.card.rwy);
    let every = reduce(start({ rng: seeded(44) }), { type: 'choose', id: 'foxtrot-1' }, seeded(45));
    const before = every.card.atis;
    for (let i = 0; i < 3000 && current(every).phase !== 'Area Exit'; i++) {
      const step = current(every);
      every = reduce(every, step.kind === 'choose' ? { type: 'choose', id: step.options[step.options.length - 1].id } : { type: 'next' }, seeded(46 + i));
    }
    expect(every.card.atis).not.toBe(before);
  });

  test('the ATIS is not copied until it is heard, and the readout says what set each value', () => {
    let s = reduce(start({ rng: seeded(61) }), { type: 'wind', pick: '13L' }, seeded(62));
    expect(s.heardAtis).toBeUndefined();
    s = reduce(s, { type: 'choose', id: 'seagull-c' });
    while (!current(s).atis) s = reduce(s, { type: 'readNext' });
    expect(s.heardAtis).toBeUndefined();
    s = reduce(s, { type: 'readNext' });
    expect(s.heardAtis.rwy).toBe('13L');
    while (!s.fly.radio) s = reduce(s, { type: 'readNext' });
    expect(s.flyFrom.radio).toMatch(/Base|Ground|ATIS|Navy Corpus/);
  });

  test('skipping Preflight flies Central Seagull with no high work profile', () => {
    const h = withHistory({ past: [], now: start({ rng: seeded(95) }) }, { type: 'skipPhase' }, seeded(96));
    expect(h.now.area).toBe('seagull-c');
    expect(h.now.profile).toBe('');
    expect(current(h.now).phase).toBe('Ground Ops');
  });

  test('every runway has a taxi route out from Echo and back to the line, Sierra never', () => {
    ['13L', '13R', '18', '22', '31L', '31R', '36', '04'].forEach((rwy) => {
      const s = reduce(start({ rng: seeded(50), card: { rwy } }), { type: 'choose', id: 'foxtrot-1' });
      const further = s.steps.find((x) => /further taxi/.test(x.text || ''));
      expect(further.replies[0].text).toMatch(new RegExp(`taxi to runway ${rwy} via \\S`));
      expect(further.replies[0].text).not.toMatch(/Sierra/);
    });
  });

  test('Foxtrot and Cheetah have no BTN 19 call; no Cruise Checklist; Descent above 10,000 feet, once the descent starts', () => {
    let s = start({ rng: seeded(33) });
    s = reduce(s, { type: 'choose', id: 'foxtrot-1' });
    expect(s.steps.some((x) => /^Seagull/.test(x.text || ''))).toBe(false);
    [[2, false], [3, false], [4, true]].forEach(([block, cruise]) => {
      const rng = seeded(40 + block);
      const { seen } = fly({ seagullBlock: block }, rng, (step) => (step.on === 'area' ? 'seagull-c' : random(rng)(step)));
      expect(seen.some((x) => x.name === 'Cruise')).toBe(false);
      expect(seen.some((x) => x.name === 'Descent')).toBe(cruise);
      // After the descent radial's page, never before it.
      const d = seen.findIndex((x) => x.name === 'Descent');
      if (cruise) expect(seen.findIndex((x) => /Seagull exit$/.test(x.title || '') && x.title !== 'Seagull exit')).toBeLessThan(d);
    });
  });

  test('every emergency a phase offers exists', () => {
    PHASES.forEach((p) => epsFor(p).forEach((ep) => expect(ep.title).toBeTruthy()));
    expect(epsFor('Preflight')).toEqual([]);
  });
});
