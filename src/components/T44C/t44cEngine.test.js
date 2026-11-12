import { annLevel, blinking, gate, initial, input, lights, outcome, readouts, settled, startLeftFrom, step, STEP_EVENTS, stopwatch } from './t44cEngine';

// Each start run the way its clip ran it, clicks at the clip's own times, and read back at the
// clip's own frames (engine-videos-readings.md, beside the clips in _reference-docs).

// Run `state` to time `until`, applying each `[t, event]` as the clock passes it, and return the
// engine `side` at each time asked for in `reads`.
function run(state, events, until, side, reads = []) {
  let s = state;
  const out = {};
  const marks = [...events.map(([t, e]) => ({ t, e })), ...reads.map((t) => ({ t, read: true }))]
    .filter((m) => m.t <= until)
    .sort((a, b) => a.t - b.t);
  for (const m of marks) {
    if (m.t > s.t) s = step(s, m.t - s.t);
    if (m.read) out[m.t] = { ...s.engines[side] };
    else s = input(s, m.e);
  }
  if (until > s.t) s = step(s, until - s.t);
  return { s, out };
}

const near = (v, want, tol) => expect(Math.abs(v - want)).toBeLessThanOrEqual(tol);

describe('a normal battery start of the right engine (IMG_9714, 9716, 9713)', () => {
  // Starter at 3 s, fuel at 13 s, as IMG_9714 was flown.
  const events = [[3, { side: 'R', starter: 'on' }], [13, { side: 'R', cond: 'low' }]];
  const { out, s } = run(initial('cold'), events, 80, 'R', [6, 8, 12, 16, 16.9, 17.6, 28, 32, 40]);

  it('motors to the 17.5 percent plateau at the clip pace', () => {
    near(out[6].n1, 10.4, 1.5);
    near(out[8].n1, 14.4, 1.5);
    near(out[12].n1, 17.2, 0.5);
  });

  it('shows 102 pph before light-off, and lights 4 to 5 seconds after the fuel', () => {
    near(out[16].ff, 102, 4);
    expect(out[16.9].lit).toBe(false);
    expect(out[17.6].lit).toBe(true);
  });

  it('peaks between 650 and 690 °C and settles at low idle 51 to 54 percent', () => {
    near(out[28].itt, 658, 25);
    expect(out[32].n1).toBeGreaterThan(50);
    expect(s.engines.R.n1).toBeGreaterThanOrEqual(51);
    expect(s.engines.R.n1).toBeLessThanOrEqual(54);
    expect(s.engines.R.itt).toBeLessThan(685); // FTI: a normal start stabilises below 685 °C
  });

  it('lights RH IGN IND with the starter and both GEN OUT lights with the generators off', () => {
    const on = input(initial('cold'), { side: 'R', starter: 'on' });
    expect(lights(on)).toEqual(expect.arrayContaining(['RH IGN IND', 'LH GEN OUT', 'RH GEN OUT']));
    const off = input(on, { side: 'R', starter: 'off' });
    expect(lights(off)).not.toContain('RH IGN IND');
    expect(lights(input(off, { side: 'R', gen: true }))).not.toContain('RH GEN OUT');
  });
});

describe('the abnormal starts', () => {
  it('a hung start stalls N1 near 35 percent while ITT climbs past 770 (IMG_9712)', () => {
    const events = [[1.5, { side: 'R', starter: 'on' }], [13.5, { side: 'R', cond: 'low' }]];
    const { out } = run(initial('cold', 'hung'), events, 50, 'R', [38, 50]);
    near(out[38].n1, 34.6, 1.5);
    near(out[38].itt, 779, 30);
    expect(out[50].n1).toBeLessThan(36);
  });

  it('a hot start is near 854 °C 9 seconds after light-off and runs past 925 if left alone (IMG_9715)', () => {
    const s0 = startLeftFrom(initial('rightRunning'), 'hot');
    const events = [[2, { side: 'R', gen: true }], [2, { side: 'L', starter: 'on' }], [17, { side: 'L', cond: 'low' }]];
    const { out } = run(s0, events, 50, 'L', [19, 30.5, 34, 45]);
    near(out[19].ff, 146, 25);
    near(out[30.5].itt, 854, 40);
    expect(out[34].itt).toBeGreaterThan(925); // still climbing fast past the clip
    expect(out[45].itt).toBe(1150); // and held at 1150 until the fuel is cut
  });

  it('with no light-off, fuel flows and ITT stays cold (IMG_9710)', () => {
    const events = [[3.5, { side: 'R', starter: 'on' }], [19, { side: 'R', cond: 'low' }]];
    const { out } = run(initial('cold', 'noLightoff'), events, 40, 'R', [28, 40]);
    near(out[28].ff, 102, 3);
    near(out[28].itt, 30, 1);
    expect(out[40].lit).toBe(false);
  });

  it('with no fuel flow, the condition lever is in and FF stays at 0 (the sim, 2026-11-08)', () => {
    const events = [[0, { side: 'R', starter: 'on' }], [12, { side: 'R', cond: 'low' }]];
    const { out } = run(initial('cold', 'noFuel'), events, 30, 'R', [25, 30]);
    expect(out[25].ff).toBeLessThan(1);
    expect(out[30].lit).toBe(false);
    near(out[30].n1, 17.5, 0.2);
  });

  it('with no rotation, IGN IND lights and N1 stays at 0 (the sim, 2026-11-08)', () => {
    const { s } = run(initial('cold', 'noRotation'), [[0, { side: 'R', starter: 'on' }]], 10, 'R');
    expect(s.engines.R.n1).toBe(0);
    expect(lights(s)).toContain('RH IGN IND');
  });

  it('a long start reaches 50 percent N1 41 s after the starter, whenever the fuel went in', () => {
    for (const fuelAt of [10, 13]) {
      let st = input(initial('cold', 'long'), { side: 'R', starter: 'on' });
      let t = 0;
      while (st.engines.R.n1 <= 50 && t < 80) {
        if (Math.abs(t - fuelAt) < 0.05) st = input(st, { side: 'R', cond: 'low' });
        st = step(st, 0.1);
        t += 0.1;
      }
      near(t, 41, 0.6);
    }
  });

  it('fuel cut off brings ITT below 790 °C at once and back toward the plateau on the starter', () => {
    const events = [[1.5, { side: 'R', starter: 'on' }], [13.5, { side: 'R', cond: 'low' }],
      [39, { side: 'starting', cond: 'cutoff' }]];
    const { out } = run(initial('cold', 'hung'), events, 60, 'R', [40, 44, 60]);
    expect(out[40].itt).toBeLessThan(790);
    near(out[44].itt, 456, 60);
    near(out[60].n1, 17.5, 1);
    near(out[60].ff, 0, 1);
  });
});

describe('the gates the FTI sets', () => {
  const started = input(initial('cold'), { side: 'R', starter: 'on' });

  it('holds fuel until N1 is above 12 percent', () => {
    expect(gate(step(started, 2), 'sr3')).toMatch(/12 percent/);
    expect(gate(step(started, 6), 'sr3')).toBeNull();
  });

  it('holds the right generator until high idle', () => {
    const idle = step(input(step(started, 8), { side: 'R', cond: 'low' }), 30);
    expect(gate(idle, 'sr9')).toMatch(/70 to 73 percent/);
    const high = step(input(idle, { side: 'R', cond: 'high' }), 10);
    expect(high.engines.R.n1).toBeGreaterThanOrEqual(70);
    expect(gate(high, 'sr9')).toBeNull();
    expect(gate(initial('rightRunning'), 'sl13')).toBeNull();
  });

  it('holds light-off and the starter until the gauges show them', () => {
    const fuelled = input(step(started, 8), { side: 'R', cond: 'low' });
    expect(gate(fuelled, 'sr5', 'ITT and N1 - Light-off,')).toMatch(/light-off/);
    const lit = step(fuelled, 6);
    expect(gate(lit, 'sr5', 'ITT and N1 - Light-off,')).toBeNull();
    expect(gate(lit, 'sr5', 'N1 stable above 50%')).toMatch(/50 percent/);
    expect(gate(lit, 'sr6')).toMatch(/50 percent/);
    const idle = step(lit, 20);
    expect(gate(idle, 'sr5', 'N1 stable above 50%')).toBeNull();
    expect(gate(idle, 'sr6')).toBeNull();
  });
});

it('reads as the gauges print and comes to rest', () => {
  const r = readouts(initial('rightRunning'));
  // The left start finds the right engine at HIGH IDLE (IMG_9718 and 9741's both engines).
  expect(r.R).toMatchObject({ itt: '579', trq: '287', np: '1460', n1: '71.5', ff: '163', gen: '0.00', qty: '1194' });
  expect(r.S).toEqual({ suction: '5.9', pneumatic: '18.0', oxygen: '1550' });
  expect(r.L.itt).toBe('30');
  const running = input(initial('cold'), { side: 'R', starter: 'on' });
  expect(settled(running)).toBe(false);
});

describe('the needle gauges and the stopwatch', () => {
  const events = [[3, { side: 'R', starter: 'on' }], [13, { side: 'R', cond: 'low' }],
    [45, { side: 'R', starter: 'off' }], [45, { side: 'R', gen: true }]];
  const { out, s } = run(initial('cold'), events, 200, 'R', [12, 25, 44, 47]);

  it('reads oil pressure off N1, as IMG_9714 did', () => {
    near(out[12].oilP, 23, 3);
    expect(out[44].oilP).toBeGreaterThan(95);
  });

  it('pulls the battery to about 21 V on the starter and charges it once the generator is on', () => {
    let b = run(initial('cold'), events, 12, 'R').s.elec;
    near(b.volts, 21.2, 0.4);
    near(b.amps, -60, 1);
    b = run(initial('cold'), events, 50, 'R').s.elec;
    near(b.volts, 27.9, 0.2);
    near(b.amps, 60, 1);
  });

  it('shares one load between the generators, as IMG_9716 did', () => {
    // 9716: starter on at 5 s and off at 30.5, right generator on at 45.5, left at 53.
    const ev = [[5, { side: 'L', starter: 'on' }], [13.5, { side: 'L', cond: 'low' }],
      [30.5, { side: 'L', starter: 'off' }], [45.5, { side: 'R', gen: true }], [53, { side: 'L', gen: true }]];
    const base = startLeftFrom(initial('rightRunning'));
    const at = (t) => readouts(run(base, ev, t, 'L').s);
    near(Number(at(45.6).R.gen), 0.75, 0.03); // the right alone, as it comes on
    // Split evenly the moment the left joins (9716 read 0.38 each; the payback since then is
    // the user's 20 s figure, which 9716 doesn't show).
    expect(Number(at(55).R.gen)).toBe(Number(at(55).L.gen));
    expect(Number(at(55).R.gen)).toBeLessThan(Number(at(53.1).R.gen) + 0.001);
    // Paid back minutes on: the bus's own load through a start, 0.18 each.
    near(Number(at(600).R.gen), 0.18, 0.02);
    near(at(600).B.volts, 28.2, 0.1);
  });

  it("carries the other engine's start at 1.00, as IMG_9715 did", () => {
    const r = run(startLeftFrom(initial('rightRunning')),
      [[0, { side: 'R', gen: true }], [1, { side: 'L', starter: 'on' }]], 5, 'L').s;
    expect(readouts(r).R.gen).toBe('1.00');
  });

  it('pays a lone generator back to below .5 about 20 s after it comes on (the user, 2026-11-05)', () => {
    // 9716's 25.5 s of starter.
    const ev = [[0, { side: 'R', starter: 'on' }], [8, { side: 'R', cond: 'low' }],
      [25.5, { side: 'R', starter: 'off' }], [40, { side: 'R', gen: true }]];
    const at = (t) => Number(readouts(run(initial('cold'), ev, t, 'R').s).R.gen);
    near(at(40.1), 0.75, 0.03);
    expect(at(55)).toBeGreaterThan(0.5);
    expect(at(62)).toBeLessThan(0.5);
  });

  it('brings suction and pneumatic up only as N1 reaches idle', () => {
    const at25 = run(initial('cold'), events, 25, 'R').s.elec;
    expect(at25.pneumatic).toBeLessThan(0.1);
    near(s.elec.suction, 4.3, 0.2);
    near(s.elec.pneumatic, 6.2, 0.3);
  });

  it("shows the starter's own time, held once it is off", () => {
    const sw = stopwatch(run(initial('cold'), events, 30, 'R').s);
    expect(sw.starter).toMatchObject({ side: 'R', running: true });
    near(sw.starter.t, 27, 0.2);
    near(stopwatch(s).starter.t, 42, 0.2);
    expect(stopwatch(s).starter.running).toBe(false);
    expect(stopwatch(initial('cold')).starter).toBeNull();
  });

  it('runs the elapsed time clock only as it is pressed, apart from the starter', () => {
    const late = [[3, { side: 'R', starter: 'on' }], [5, { clock: 'toggle' }], [20, { clock: 'toggle' }]];
    const r = run(initial('cold'), late, 30, 'R').s;
    expect(stopwatch(r).clock).toEqual({ running: false, t: expect.any(Number) });
    near(stopwatch(r).clock.t, 15, 0.2);
    near(stopwatch(r).starter.t, 27, 0.2);
    expect(stopwatch(run(r, [[31, { clock: 'toggle' }]], 33, 'R').s).clock.running).toBe(true);
  });
});

describe('what moves N1 before light-off', () => {
  const on = [[0, { side: 'R', starter: 'on' }]];
  it('is the fuel: the condition lever lifts it off the plateau', () => {
    const dry = run(initial('cold', 'noLightoff'), on, 20, 'R').s.engines.R.n1;
    const fuelled = run(initial('cold', 'noLightoff'), [...on, [14, { side: 'R', cond: 'low' }]], 20, 'R').s.engines.R.n1;
    near(dry, 17.5, 0.1);
    expect(fuelled).toBeGreaterThan(dry + 0.4);
  });

  it("is not the other engine's generator", () => {
    const base = startLeftFrom(initial('rightRunning'));
    const left = [[0, { side: 'L', starter: 'on' }]];
    const without = run(base, left, 14, 'L').s.engines.L.n1;
    const withGen = run(base, [[0, { side: 'R', gen: true }], ...left], 14, 'L').s.engines.L.n1;
    expect(withGen).toBeCloseTo(without, 5);
  });
});

// The runup and the anti-ice/deice check, step events applied as the drill fires them.
const fireAll = (state, key, proc = key.startsWith('ai') ? 'anti-ice-check' : 'engine-runup') => (STEP_EVENTS[proc][key] || []).reduce(input, state);
const runFor = (state, seconds) => step(state, seconds);

describe('the engine runup (IMG_9718, 9737)', () => {
  const idle = initial('runup');

  it('starts at low idle, both generators sharing the bus, the battery charged', () => {
    const r = readouts(idle);
    expect(r.L).toMatchObject({ n1: '52.0', np: '973', trq: '108', gen: '0.23', qty: '1180' });
    expect(r.R.qty).toBe('1172');
    expect(r.B).toMatchObject({ volts: '28.2', amps: '0', prop: '0.0' });
    expect(lights(idle)).toEqual([]);
    expect(outcome(idle)).toBeNull();
  });

  it('at HIGH IDLE overshoots ITT on the way up and settles at 71.5 percent (Runup 5)', () => {
    let s = fireAll(idle, 'er5:Condition Lever');
    s = runFor(s, 2.5);
    expect(s.engines.L.itt).toBeGreaterThan(640); // 9718: 696 at 4 %/s
    s = runFor(s, 20);
    near(s.engines.L.n1, 71.5, 0.2);
    near(s.engines.L.np, 1460, 25);
    near(s.engines.L.itt, 589, 10);
    near(s.engines.L.ff, 165, 6);
    near(s.elec.pneumatic, 18, 0.5);
  });

  it('feathers both props by hand and brings them back to 900 to 1100 rpm (Runup 4)', () => {
    let s = runFor(fireAll(idle, 'er4'), 9);
    expect(s.engines.L.np).toBeLessThan(800);
    expect(s.engines.L.trq).toBeGreaterThan(200); // 9718: 266 and 247 feathered
    s = runFor(s, 20);
    near(s.engines.L.np, 973, 30);
  });

  it('stops Np at the overspeed governor, then sets 1900 rpm (Runup 6)', () => {
    let s = runFor(fireAll(idle, 'er5:Condition Lever'), 20);
    // b. HIGH IDLE leaves the props under 1900 rpm; c. the test switch held, which moves nothing.
    s = runFor(fireAll(s, 'er6'), 2);
    expect(s.engines.R.np).toBeLessThan(1900);
    const trqBefore = s.engines.R.trq;
    const ittBefore = s.engines.R.itt;
    // d. The power levers again: Np stops in the 1900 to 2100 range while torque and ITT climb.
    s = fireAll(s, 'er6#3');
    let peak = 0;
    let trqPeak = 0;
    let ittPeak = 0;
    for (let i = 0; i < 160; i += 1) {
      s = runFor(s, 0.25);
      peak = Math.max(peak, s.engines.R.np);
      trqPeak = Math.max(trqPeak, s.engines.R.trq);
      ittPeak = Math.max(ittPeak, s.engines.R.itt);
    }
    expect(peak).toBeLessThanOrEqual(2001);
    expect(peak).toBeGreaterThan(1990);
    expect(trqPeak).toBeGreaterThan(trqBefore + 250);
    expect(ittPeak).toBeGreaterThan(ittBefore + 40);
    // e, f. Back to 1900 rpm and released.
    near(s.engines.R.np, 1900, 20);
    expect(s.engines.R.osgTest).toBe(false);
  });

  it('lights PROP REV NOT READY with a prop lever out of full forward', () => {
    const s = fireAll(idle, 'er7');
    expect(lights(runFor(s, 1))).toContain('PROP REV NOT READY');
    expect(lights(runFor(s, 10))).not.toContain('PROP REV NOT READY');
  });

  it('holds 1600 to 1800 rpm at the feather detent and comes back (Runup 7)', () => {
    let s = runFor(input(fireAll(idle, 'er5:Condition Lever'), { side: 'both', pwr: 85.3 }), 20);
    s = runFor(fireAll(s, 'er7'), 5);
    expect(s.engines.L.np).toBeGreaterThanOrEqual(1600);
    expect(s.engines.L.np).toBeLessThanOrEqual(1800);
    expect(s.engines.L.trq).toBeGreaterThan(620); // more torque at the same power
    s = runFor(s, 15);
    near(s.engines.L.np, 1906, 25);
  });

  it('runs the autofeather test, lights in the FTI order (Runup 8)', () => {
    // From the power set for 1900 rpm at HIGH IDLE, as Runup 7 leaves it.
    let s = runFor(input(fireAll(idle, 'er5:Condition Lever'), { side: 'both', pwr: 85.3 }), 20);
    // a. Condition levers to LOW IDLE: N1 comes down a little with the power levers where they
    // are, about 524 lb-ft, still above the 460 the test needs (the user, 2026-11-04).
    s = runFor(fireAll(s, 'er8:Condition Lever'), 8);
    near(s.engines.L.n1, 83.3, 0.6);
    near(s.engines.L.trq, 524, 20);
    expect(lights(fireAll(s, 'er8:Autoignition'))).toEqual(expect.arrayContaining(['LH AUTO IGNITION ARMED', 'RH AUTO IGNITION ARMED']));
    for (const k of ['er8:Autoignition', 'er8', 'er8:Power Lever']) s = fireAll(s, k);
    s = runFor(s, 4);
    expect(lights(s)).toEqual(expect.arrayContaining(['LH AUTO IGNITION ARMED', 'RH AUTO IGNITION ARMED',
      'LH AUTOFEATHER ARMED', 'RH AUTOFEATHER ARMED']));
    // The left power lever coming back: past 410 lb-ft the right's light and the left's
    // auto-ignition go out and the left igniter lights.
    const seen = { swap: false, flash: false, four: false };
    let lowest = 9999;
    for (let i = 0; i < 400 && s.script; i += 1) {
      s = runFor(s, 0.25);
      const lit = lights(s);
      if (lit.includes('LH IGN IND') && lit.includes('LH AUTOFEATHER ARMED') && !lit.includes('RH AUTOFEATHER ARMED')) seen.swap = true;
      if (blinking(s).includes('LH AUTOFEATHER ARMED')) seen.flash = true;
      if (seen.flash && !s.engines.L.feathering && lit.filter((w) => /ARMED/.test(w)).length === 4) seen.four = true;
      lowest = Math.min(lowest, s.engines.L.np);
    }
    expect(seen).toEqual({ swap: true, flash: true, four: true });
    expect(lowest).toBeLessThan(800);
    expect(s.script).toBeNull();
    // Both at idle, the test switch released and the ENG AUTO IGN switches off: no lights.
    expect(lights(s)).toEqual([]);
  });

  it('burns fuel off the quantity gauges at the flow shown', () => {
    const s = runFor(idle, 360);
    near(Number(readouts(s).L.qty), 1180 - 104 * 0.1 - 2, 3);
  });
});

describe('the anti-ice/deice check (IMG_9719, 9741)', () => {
  it('reads 16.5 prop amps and about 0.035 more load a generator with the prop deice on', () => {
    const s = runFor(fireAll(initial('runup'), 'ai1'), 2);
    expect(readouts(s).B.prop).toBe('16.5');
    near(Number(readouts(s).L.gen), 0.265, 0.01);
    const off = fireAll(s, 'ai6');
    expect(readouts(off).B.prop).toBe('0.0');
  });
});

it('runs a running engine on: it burns fuel, so it never settles', () => {
  expect(settled(initial('runup'))).toBe(false);
  expect(settled(initial('cold'))).toBe(true);
});

describe("After Start (the FTI's action; no clip shows these lights)", () => {
  const ev = (s, k) => (STEP_EVENTS['after-start'][k] || []).reduce(input, s);
  it('lights FUEL PRESSURE for a moment, then FUEL CROSSFEED until the boost pump is back on', () => {
    let s = ev(ev(initial('afterStart'), 'as7#1'), 'as7#2');
    expect(lights(s)).toContain('L FUEL PRESSURE');
    s = step(s, 1);
    expect(lights(s)).not.toContain('L FUEL PRESSURE');
    expect(lights(s)).toContain('FUEL CROSSFEED');
    // The boost pump back on closes the valve (the user, 2026-11-04).
    s = step(ev(s, 'as7#3'), 1);
    expect(lights(s)).toEqual([]);
    s = step(ev(ev(s, 'as7#4'), 'as7#5'), 1);
    expect(lights(s)).toContain('FUEL CROSSFEED');
    s = step(ev(ev(s, 'as7#6'), 'as7#7'), 1);
    expect(lights(s)).toEqual([]);
  });

  it('flickers NO FUEL TRANSFER as each transfer pump goes to AUTO with the test held', () => {
    const s = ev(initial('afterStart'), 'as6#2');
    expect(lights(s)).toContain('LH NO FUEL TRANSFER');
    expect(lights(step(s, 1))).toEqual([]);
  });

  it('adds the avionics to the generator load', () => {
    const s = initial('afterStart');
    near(Number(readouts(s).L.gen), 0.18, 0.01);
    near(Number(readouts(ev(s, 'as3')).L.gen), 0.23, 0.01);
  });
});

describe('the 2026-11-04 rulings', () => {
  const fire = (s, p, k) => (STEP_EVENTS[p][k] || []).reduce(input, s);

  it('takes light-off the moment ITT reads above 30', () => {
    let s = fire(initial('cold'), 'start-right', 'sr1');
    s = step(fire(step(s, 13), 'start-right', 'sr3'), 0.1);
    while (!s.engines.R.lit) s = step(s, 0.1);
    while (Math.round(s.engines.R.itt) <= 30) {
      expect(gate(s, 'sr5', null)).not.toBeNull();
      s = step(s, 0.1);
    }
    expect(gate(s, 'sr5', null)).toBeNull();
  });

  it('refuses Abnormal Start 3 before the starter has run 40 seconds', () => {
    let s = fire(initial('cold', 'hot'), 'start-right', 'sr1');
    s = fire(step(fire(step(s, 13), 'start-right', 'sr3'), 10), 'abnormal-start', 'as1');
    s = fire(s, 'abnormal-start', 'as2');
    expect(gate(s, 'as3', null, 'abnormal-start')).toMatch(/40 seconds/);
    expect(gate(s, 'as3', null, 'after-start')).toBeNull(); // After Start's as3 is the avionics
    s = step(s, 18);
    expect(gate(s, 'as3', null, 'abnormal-start')).toBeNull();
  });

  it('reads 28.25 on a volt-loadmeter for 3 s after its PRESS FOR VOLTS button', () => {
    let s = input(initial('afterStart'), { pressVolts: 'L' });
    expect(readouts(step(s, 1)).L.gen).toBe('28.25');
    expect(readouts(step(s, 1)).R.gen).not.toBe('28.25');
    s = step(s, 3.1);
    expect(readouts(s).L.gen).not.toBe('28.25');
  });

  it('rings Np, then ITT and torque, then nothing through the overspeed governor check', () => {
    let s = step(fire(initial('runup'), 'engine-runup', 'er5:Condition Lever'), 20);
    s = step(fire(fire(s, 'engine-runup', 'er6'), 'engine-runup', 'er6#3'), 0.2);
    expect(s.highlight).toEqual(['Prop RPM']);
    const seen = [];
    for (let i = 0; i < 300 && s.script; i += 1) {
      s = step(s, 0.1);
      const k = s.highlight.join(',');
      if (seen[seen.length - 1] !== k) seen.push(k);
    }
    expect(seen).toEqual(['Prop RPM', 'ITT,Torque', '']);
  });

  it('rings torque, then Np, through each side of the autofeather test', () => {
    let s = step(fire(initial('runup'), 'engine-runup', 'er5:Condition Lever'), 20);
    s = step(fire(fire(s, 'engine-runup', 'er6'), 'engine-runup', 'er6#3'), 40);
    s = step(fire(s, 'engine-runup', 'er8:Condition Lever'), 8);
    s = fire(fire(s, 'engine-runup', 'er8:Autoignition'), 'engine-runup', 'er8');
    s = fire(s, 'engine-runup', 'er8:Power Lever');
    const seen = [];
    for (let i = 0; i < 3000 && s.script; i += 1) {
      s = step(s, 0.1);
      const k = (s.highlight || []).join(',');
      if (seen[seen.length - 1] !== k) seen.push(k);
    }
    expect(seen).toEqual(['Torque', 'Prop RPM', 'Torque', 'Prop RPM', '']);
  });
});

describe('the autofeather switch points', () => {
  it('draws each within the FTI tolerance, most often near 410 and 200', () => {
    const arms = [];
    const feathers = [];
    for (let i = 0; i < 2000; i += 1) {
      const a = input(initial('runup'), { drawAuto: true }).auto.L;
      arms.push(a.arm);
      feathers.push(a.feather);
    }
    expect(Math.min(...arms)).toBeGreaterThanOrEqual(360);
    expect(Math.max(...arms)).toBeLessThanOrEqual(460);
    expect(Math.min(...feathers)).toBeGreaterThanOrEqual(160);
    expect(Math.max(...feathers)).toBeLessThanOrEqual(240);
    const near = arms.filter((x) => Math.abs(x - 410) < 25).length;
    const far = arms.filter((x) => Math.abs(x - 410) >= 25).length;
    expect(near).toBeGreaterThan(far * 1.5);
  });

  it('swaps the lights at the drawn point', () => {
    const s = { ...initial('runup'), afTest: true, auto: { L: { arm: 440, feather: 190 }, R: { arm: 380, feather: 210 } } };
    const at = (lt, rt) => lights({ ...s, engines: { L: { ...s.engines.L, trq: lt, autoIgn: true }, R: { ...s.engines.R, trq: rt, autoIgn: true } } });
    expect(at(430, 500)).toContain('LH IGN IND'); // below its 440
    expect(at(430, 500)).not.toContain('RH AUTOFEATHER ARMED');
    expect(at(450, 390)).not.toContain('RH IGN IND'); // above its 380
    expect(at(450, 390)).toContain('LH AUTOFEATHER ARMED');
  });
});

describe('After Start 3', () => {
  it('lights AUX TEST, then AUX ON, and puts AUX ON out with the avionics master', () => {
    const fire = (s, key) => STEP_EVENTS['after-start'][key].reduce(input, s);
    let s = fire(initial('bothRunning'), 'as3:AUX BATT Switch');
    expect(lights(s)).toContain('AUX TEST');
    s = step(s, 1.5);
    expect(lights(s)).toContain('AUX ON');
    expect(lights(s)).not.toContain('AUX TEST');
    s = fire(s, 'as3');
    expect(lights(s)).not.toContain('AUX ON');
  });
});

describe('the sim notes of 2026-11-08', () => {
  it('takes about 8 s from HIGH IDLE to LOW IDLE on the condition levers', () => {
    let s = initial('runup');
    s = step(input(s, { side: 'both', cond: 'high' }), 25);
    s = input(s, { side: 'both', cond: 'low' });
    let t = 0;
    while (s.engines.L.n1 > 53 && t < 30) { s = step(s, 0.1); t += 0.1; }
    near(t, 8, 1.5);
  });

  it('keeps the gauges dark until the battery is on', () => {
    const s = initial('beforeStart');
    expect(readouts(s).L.itt).toBeUndefined();
    // The battery voltmeter is on the hot battery bus (the user, 2026-11-10).
    expect(readouts(s).B.volts).toBe('23.7');
    expect(readouts(input(s, { battery: true })).L.itt).toBe('30');
  });
});

describe('the DIM knob and the fuel quantity switch', () => {
  it('reads the nacelle tanks at NACELLE, and the total again at TOTAL (NATOPS §2.9.8)', () => {
    let s = step(initial('runup'), 1);
    const total = Number(readouts(s).L.qty);
    s = input(s, { qtySel: true });
    near(Number(readouts(s).L.qty), 412, 2); // 61 gallons at 6.75 lb
    s = input(s, { qtySel: true });
    expect(Number(readouts(s).L.qty)).toBe(total);
  });

  it('fades the annunciators evenly to out and back to full bright, twice', () => {
    const s = input(initial('runup'), { annDim: true });
    const at = (t) => Math.round(annLevel(step(s, t)) * 100) / 100;
    expect([0, 0.3125, 0.625, 0.9375, 1.25, 1.875, 2.75].map(at)).toEqual([1, 0.5, 0, 0.5, 1, 0, 1]);
  });
});
