import { ABEAM, SCENARIOS, buildPass } from './patternModel';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const sample = (pass, fn, dt = 0.25) => { for (let t = 0; t <= pass.duration; t += dt) fn(pass.stateAt(t), t); };
const markT = (pass, key) => pass.marks.find((m) => m.key === key).t;

test('the legs off the runway keep the stopwatch times', () => {
  const p = buildPass('approach');
  expect(near(markT(p, 'rotate'), 5.98, 0.4)).toBe(true);
  expect(near(markT(p, 'p300') - markT(p, 'rotate'), 13.08, 0.8)).toBe(true);
  expect(near(markT(p, 'crosswind') - markT(p, 'p300'), 6.78, 0.4)).toBe(true);
});

test.each(SCENARIOS.map((s) => s.id))('%s: a mile abeam, 30° AOB at most, continuous', (id) => {
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
  expect(near(p.stateAt(p.marks.find((m) => m.key === 'final').t).y, 0, 2)).toBe(true);
});

test('the FTI numbers at the 90 and on final', () => {
  const p = buildPass('approach');
  const at90 = p.stateAt(markT(p, 'the90'));
  expect(near(at90.alt, 500, 2)).toBe(true);
  expect(near(at90.kias, 110, 1)).toBe(true);
  expect(near(at90.hdg, 220, 1)).toBe(true);
  const fin = p.stateAt(markT(p, 'final'));
  expect(near(fin.alt, 250, 2)).toBe(true);
  expect(near(fin.kias, 105, 1)).toBe(true);
  expect(near(fin.x, -1200, 10)).toBe(true);
  expect(buildPass('noflap').stateAt(markT(buildPass('noflap'), 'final')).kias).toBeCloseTo(110, 0);
});

test('configuration follows the calls', () => {
  const p = buildPass('approach');
  expect(p.stateAt(5).flaps).toBe('Up');
  expect(p.stateAt(markT(p, 'downwind')).flaps).toBe('Approach');
  expect(p.stateAt(markT(p, 'downwind')).props).toBe('1900 RPM');
  expect(p.stateAt(markT(p, 'final')).props).toBe('Full forward');
  const f = buildPass('full');
  expect(f.stateAt(markT(f, 'final')).flaps).toBe('Down');
  const n = buildPass('noflap');
  expect(n.stateAt(markT(n, 'final')).flaps).toBe('Up');
  const c1 = buildPass('case1', 'left');
  expect(c1.stateAt(markT(c1, 'crosswind')).gear).toBe('Up');
  expect(c1.stateAt(markT(c1, 'the90')).gear).toBe('Down');
  expect(c1.events.some((e) => e.text === 'Left Propeller – Feather, concur?')).toBe(true);
});

test('one seat never says two things at once', () => {
  SCENARIOS.forEach(({ id }) => {
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
