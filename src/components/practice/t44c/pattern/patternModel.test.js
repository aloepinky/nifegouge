import { ABEAM, CYCLE, EVENTS, FINAL_X, LAPS, stateAt, voiceLines } from './patternModel';

const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('each lap lasts the mean of the two passes timed, from touchdown', () => {
  expect(LAPS.map((l) => l.id)).toEqual(['touchdown', 'rotate', 'p300', 'crosswind', 'downwind', 'approach', 'final']);
  expect(LAPS[0].start).toBe(0);
  expect(CYCLE).toBeCloseTo((305.58 - 0.06) / 2, 1);
  LAPS.forEach((l) => expect(l.dur).toBeCloseTo((l.times[0] + l.times[1]) / 2, 6));
});

test('the marks fall where the FTI puts them', () => {
  const at = (id) => stateAt(LAPS.find((l) => l.id === id).start);
  expect(at('touchdown').alt).toBe(0);
  expect(near(at('rotate').kias, 91, 0.5)).toBe(true);
  expect(near(at('p300').alt, 300, 1)).toBe(true);
  expect(near(at('crosswind').alt, 500, 1)).toBe(true);
  expect(at('downwind').alt).toBe(800);
  expect(near(at('approach').y, ABEAM, 1)).toBe(true);
  expect(near(at('final').alt, 250, 1)).toBe(true);
  expect(near(at('final').x, FINAL_X, 1)).toBe(true);
  expect(near(at('final').y, 0, 1)).toBe(true);
  // The 90: halfway round the approach turn at 500 ft and 110 KIAS.
  const the90 = EVENTS.find((e) => e.id === 'the90');
  const s = stateAt(the90.t);
  expect(near(s.alt, 500, 2)).toBe(true);
  expect(near(s.kias, 110, 1)).toBe(true);
  expect(near(s.hdg, 220, 3)).toBe(true);
});

test('the ground track is continuous and closes on the touchdown point', () => {
  let prev = stateAt(0);
  for (let t = 0.1; t < CYCLE; t += 0.1) {
    const s = stateAt(t);
    expect(Math.hypot(s.x - prev.x, s.y - prev.y)).toBeLessThan(0.1 * 260);
    prev = s;
  }
  const end = stateAt(CYCLE - 1e-6);
  const start = stateAt(0);
  expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeLessThan(5);
});

test('no bank over 30 degrees, and the approach turn near the 26 of the notes', () => {
  let max = 0;
  for (let t = 0; t < CYCLE; t += 0.2) max = Math.max(max, stateAt(t).aob);
  expect(max).toBeLessThanOrEqual(30);
  const mid = stateAt(LAPS[5].start + LAPS[5].dur / 2);
  expect(near(mid.aob, 26, 2.5)).toBe(true);
});

test('every spoken line has a seat the recorder knows', () => {
  voiceLines().forEach((l) => expect(['PF', 'PM', 'OBS', 'Tower']).toContain(l.seat));
});
