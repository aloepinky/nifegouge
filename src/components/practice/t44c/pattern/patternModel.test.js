import { ABEAM, GEOMETRY, RUNWAY, RUNWAYS, SCENARIOS, buildBreak, buildPass, drawCase } from './patternModel';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const nearHdg = (a, b, tol) => Math.abs((((a - b) % 360) + 540) % 360 - 180) <= tol;
const sample = (pass, fn, dt = 0.25) => { for (let t = 0; t <= pass.duration; t += dt) fn(pass.stateAt(t), t); };
const PATTERNS = SCENARIOS.map((x) => x.id).filter((id) => id !== 'break');
const markT = (pass, key) => pass.marks.find((m) => m.key === key).t;

test('the legs off the runway keep the stopwatch times, and 500 ft at the turn', () => {
  const p = buildPass('approach');
  expect(near(markT(p, 'rotate'), 5.98, 0.4)).toBe(true);
  expect(near(markT(p, 'p300') - markT(p, 'rotate'), 13.08, 0.8)).toBe(true);
  const turn = p.stateAt(markT(p, 'crosswind'));
  expect(turn.alt).toBe(500);
  expect(near(turn.kias, 120, 0.5)).toBe(true);
  expect(near(turn.x, RUNWAY.length + 1000, 10)).toBe(true);
});

test('a racetrack: the 180 abeam the groove, 1,200 ft from the threshold', () => {
  const p = buildPass('approach');
  const at180 = p.stateAt(markT(p, 'the180'));
  const groove = p.stateAt(markT(p, 'groove'));
  expect(near(at180.x, -1200, 10)).toBe(true);
  expect(near(at180.y, ABEAM, 2)).toBe(true);
  expect(near(groove.x, -1200, 10)).toBe(true);
  expect(near(groove.y, 0, 2)).toBe(true);
  // Downwind begins abeam the crosswind turn.
  expect(near(p.stateAt(markT(p, 'downwind')).x, GEOMETRY.TURN_X, 10)).toBe(true);
});

test.each(PATTERNS)('%s: a mile abeam, 30° AOB at most, continuous', (id) => {
  const p = buildPass(id, 'right');
  let prev = p.stateAt(0);
  let maxAob = 0;
  let downwindY = null;
  sample(p, (s) => {
    expect(Math.hypot(s.x - prev.x, s.y - prev.y)).toBeLessThan(0.25 * 125 * 1.69 + 1);
    maxAob = Math.max(maxAob, s.aob);
    if (s.phase === 'Downwind') downwindY = s.y;
    prev = s;
  });
  expect(maxAob).toBeLessThanOrEqual(30.05);
  expect(near(downwindY, ABEAM, 1)).toBe(true);
  // Final on centerline.
  expect(near(p.stateAt(p.marks.find((m) => m.key === 'groove').t).y, 0, 2)).toBe(true);
});

test('the FTI numbers at the 90 and on final', () => {
  const p = buildPass('approach');
  const at90 = p.stateAt(markT(p, 'the90'));
  expect(near(at90.alt, 500, 2)).toBe(true);
  expect(near(at90.kias, 110, 1)).toBe(true);
  expect(near(at90.hdg, 220, 1)).toBe(true);
  const fin = p.stateAt(markT(p, 'groove'));
  expect(near(fin.alt, 250, 2)).toBe(true);
  expect(near(fin.kias, 105, 1)).toBe(true);
  expect(near(fin.x, -1200, 10)).toBe(true);
  expect(buildPass('noflap').stateAt(markT(buildPass('noflap'), 'groove')).kias).toBeCloseTo(110, 0);
});

test('configuration follows the calls', () => {
  const p = buildPass('approach');
  expect(p.stateAt(5).flaps).toBe('Up');
  expect(p.stateAt(markT(p, 'downwind')).flaps).toBe('Approach');
  expect(p.stateAt(markT(p, 'downwind')).props).toBe('1900 RPM');
  expect(p.stateAt(markT(p, 'groove')).props).toBe('Full forward');
  const f = buildPass('full');
  expect(f.stateAt(markT(f, 'groove')).flaps).toBe('Down');
  const n = buildPass('noflap');
  expect(n.stateAt(markT(n, 'groove')).flaps).toBe('Up');
  const c1 = buildPass('case1', 'left');
  expect(c1.stateAt(markT(c1, 'crosswind')).gear).toBe('Up');
  expect(c1.stateAt(markT(c1, 'the90')).gear).toBe('Down');
  expect(c1.events.some((e) => e.text === 'Left Propeller – Feather, concur?')).toBe(true);
});

test('one seat never says two things at once', () => {
  PATTERNS.forEach((id) => {
    const said = buildPass(id).events.filter((e) => e.kind === 'say');
    const last = {};
    const gaps = [];
    said.forEach((e) => {
      const k = e.radio ? 'radio' : e.who;
      gaps.push(last[k] === undefined ? Infinity : e.t - last[k]);
      last[k] = e.t;
    });
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(1.1);
  });
});

test('1400 ft/min at 1000 ft-lbs in the crosswind turn, then 600 ft-lbs level at 800', () => {
  const p = buildPass('approach');
  const t0 = markT(p, 'crosswind');
  const climbing = p.stateAt(t0 + 5);
  expect(climbing.power).toBe('1000 ft-lbs');
  expect(near(climbing.vsi, 1400, 20)).toBe(true);
  const level = p.stateAt(t0 + 20);
  expect(level.alt).toBe(800);
  expect(level.power).toBe('600 ft-lbs');
  expect(climbing.pitch).toBeGreaterThan(7);
  expect(climbing.pitch).toBeLessThan(10.5);
});

test.each(PATTERNS)('the break into %s: 45° at most, a mile abeam, into the downwind at 800 ft and 120 KIAS', (id) => {
  const e = buildBreak(id, 'right');
  let prev = e.stateAt(0);
  let maxAob = 0;
  sample(e, (s) => {
    expect(Math.hypot(s.x - prev.x, s.y - prev.y)).toBeLessThan(0.25 * 205 * 1.69 + 1);
    maxAob = Math.max(maxAob, s.aob);
    prev = s;
  });
  expect(maxAob).toBeLessThanOrEqual(45);
  const out = e.stateAt(e.rolloutT);
  expect(near(out.y, ABEAM, 1)).toBe(true);
  // Broken at the departure end, it rolls out just past the crosswind turn's point.
  expect(out.x).toBeLessThan(GEOMETRY.TURN_X + 600);
  expect(out.gear).toBe('Down');
  const at180 = e.stateAt(e.marks.find((m) => m.key === 'the180').t);
  expect(at180.alt).toBe(800);
  expect(near(at180.kias, 120, 0.5)).toBe(true);
  // The single-engine pattern takes over at its wave-off; the rest land and go round.
  const end = e.stateAt(e.duration);
  expect(near(end.x, id === 'sse' ? GEOMETRY.WAVEOFF_X : GEOMETRY.TOUCHDOWN_X, 10)).toBe(true);
  expect(e.stateAt(e.rolloutT).flaps).toBe(id === 'noflap' ? 'Up' : 'Approach');
  const said = e.events.filter((x) => x.kind === 'say');
  const last = {};
  const gaps = said.map((x) => {
    const k = x.radio ? 'radio' : x.who;
    const gap = last[k] === undefined ? Infinity : x.t - last[k];
    last[k] = x.t;
    return gap;
  });
  expect(Math.min(...gaps)).toBeGreaterThanOrEqual(1.1);
});

test.each(RUNWAYS.map((r) => r.id))('%s: its traffic side in the calls and headings, its length in the turns', (rid) => {
  const rw = RUNWAYS.find((r) => r.id === rid);
  const p = buildPass('approach', 'left', rid);
  const e = buildBreak('approach', 'left', rid);
  expect(p.events.some((x) => x.text.includes(`, ${rw.side} 180, three down and locked`))).toBe(true);
  expect(e.events.some((x) => x.text === `MNTNA 12, cleared for the ${rw.side} break.`)).toBe(true);
  expect(near(p.stateAt(markT(p, 'crosswind')).x, rw.length + 1000, 10)).toBe(true);
  expect(nearHdg(p.stateAt(0).hdg, rw.heading, 0.5)).toBe(true);
  expect(nearHdg(p.stateAt(markT(p, 'downwind') + 5).hdg, rw.heading + 180, 0.5)).toBe(true);
  // The 90 is 90° toward the traffic side of the downwind heading.
  const turn = rw.side === 'left' ? -90 : 90;
  expect(nearHdg(p.stateAt(markT(p, 'the90')).hdg, rw.heading + 180 + turn, 1)).toBe(true);
  expect(near(e.marks.find((m) => m.key === 'entry').x, -4500, 1)).toBe(true);
});

const DRAWS = [true, false].flatMap((feather) => ['none', 'fire', 'fuel'].map((leak) => ({ feather, leak })));
test.each(['case1', 'case2', 'case3'].flatMap((id) => ['left', 'right'].flatMap((eng) => DRAWS.map((d) => [id, eng, d.feather, d.leak]))))(
  '%s, %s engine, feathers %s, %s: continuous, one call at a time, Landing Checklist done by the 90',
  (id, eng, feather, leak) => {
    const p = buildPass(id, eng, 'kngw-13', { feather, leak });
    let prev = p.stateAt(0);
    let maxAob = 0;
    sample(p, (s) => {
      expect(Math.hypot(s.x - prev.x, s.y - prev.y)).toBeLessThan(0.25 * 125 * 1.69 + 1);
      maxAob = Math.max(maxAob, s.aob);
      prev = s;
    });
    expect(maxAob).toBeLessThanOrEqual(30.05);
    const said = p.events.filter((x) => x.kind === 'say');
    const last = {};
    const gaps = said.map((x) => {
      const k = x.radio ? 'radio' : x.who;
      const gap = last[k] === undefined ? Infinity : x.t - last[k];
      last[k] = x.t;
      return gap;
    });
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(1.1);
    const done = said.filter((x) => x.text === 'Landing Checklist complete').pop().t;
    expect(done).toBeLessThan(markT(p, 'the90'));
    expect(said.some((x) => /checklist\.$/i.test(x.text) && /^(Hold|Continue)/.test(x.text))).toBe(false);
    expect(said.some((x) => x.text === (leak === 'none' ? 'No.' : leak === 'fire' ? 'Yes, fire.' : 'Yes, fuel leak.'))).toBe(true);
    expect(said.some((x) => x.text === 'Alternate prop feathering checklist.')).toBe(!feather);
    // In Case 1 the crosswind turn waits for the prop.
    const feathered = said.find((x) => x.text === (feather ? 'Yes.' : 'Prop feathered.')).t;
    expect(id !== 'case1' || markT(p, 'crosswind') >= feathered).toBe(true);
  },
);

test('a draw is one of the outcomes', () => {
  const seq = [0.1, 0.9, 0.3, 0.1, 0.7, 0.6];
  const rand = () => seq.shift();
  expect(drawCase(rand)).toEqual({ feather: true, leak: 'fire' });
  expect(drawCase(rand)).toEqual({ feather: false, leak: 'fuel' });
  expect(drawCase(rand)).toEqual({ feather: true, leak: 'none' });
});
