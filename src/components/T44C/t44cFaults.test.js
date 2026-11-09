import { initial, input, lampTest, lights, readouts, step, STEP_EVENTS } from './t44cEngine';
import { createT44CEngine } from './t44cEngineStore';
import { drawFault, FAULTS, faultById, faultText } from './t44cFaults';

// Chaos: each fault does what its `what` says to the gauges and lights, shows when it says, and
// the store finds it, or tells the drill it was gone past.

const fire = (s, procedure, key) => (STEP_EVENTS[procedure][key] || []).reduce(input, s);
const withFault = (s, id, params = {}) => {
  const f = drawFault(faultById(id), () => 0);
  return { ...s, faults: [...(s.faults || []), { ...f, params: { ...f.params, ...params } }] };
};
const seenNow = (s) => ({ ...s, faults: s.faults.map((f) => ({ ...f, seen: true })) });

describe('every fault', () => {
  it('names a step, says what it was and gives a cause', () => {
    for (const def of FAULTS) {
      const f = drawFault(def, () => 0.3);
      const t = faultText(f);
      expect(def.procedure && def.step).toBeTruthy();
      expect(t.what).toMatch(/\.$/);
      expect(t.causes.length).toBeGreaterThan(0);
      expect(STEP_EVENTS[def.procedure]).toBeDefined();
    }
  });
});

describe('Before Start', () => {
  const bs = (s, key) => fire(s, 'before-start', key);
  const base = initial('beforeStart');

  it('lights FUEL CROSSFEED with the crossfeed OPEN, unless the valve does not open', () => {
    expect(lights(bs(base, 'bs8#3'))).toContain('FUEL CROSSFEED');
    expect(lights(bs(base, 'bs8#4'))).not.toContain('FUEL CROSSFEED');
    expect(lights(bs(withFault(base, 'bs-xfeed-dark'), 'bs8#3'))).not.toContain('FUEL CROSSFEED');
    expect(lights(seenNow(bs(withFault(base, 'bs-xfeed-stuck'), 'bs8#4')))).toContain('FUEL CROSSFEED');
  });

  it('draws 11 A a boost pump, and nothing from a dead one', () => {
    let s = bs(bs(base, 'bs8:Left Boost Pump'), 'bs8:Right Boost Pump');
    // The gauges are dark until the battery is on.
    expect(readouts(step(s, 5)).B.amps).toBeUndefined();
    s = bs(s, 'bs8:Battery');
    expect(readouts(step(s, 5)).B.amps).toBe('-22');
    s = withFault(base, 'bs-boost-nodraw', { side: 'L' });
    s = step(bs(bs(bs(s, 'bs8:Left Boost Pump'), 'bs8:Right Boost Pump'), 'bs8:Battery'), 5);
    expect(readouts(s).B.amps).toBe('-11');
    expect(s.faults[0].seen).toBe(true);
  });

  it('leaves a FUEL PRESSURE light lit with the battery ON', () => {
    const s = step(bs(withFault(base, 'bs-fuelpress', { side: 'R' }), 'bs8:Battery'), 0.1);
    expect(lights(s)).toContain('R FUEL PRESSURE');
    expect(s.faults[0].seen).toBe(true);
    expect(lights(step(bs(base, 'bs8:Battery'), 0.1))).not.toContain('R FUEL PRESSURE');
  });

  it('lights every cell in the lamp test but a dead bulb, blank or not', () => {
    const on = bs(bs(base, 'bs8:Battery'), 'bs9:Press to Test');
    expect(lampTest(on)).toEqual({ dark: null });
    expect(lights(on)).toContain('FAULT WARNING');
    const gen = bs(bs(withFault(base, 'bs-bulb', { cell: 0 }), 'bs8:Battery'), 'bs9:Press to Test');
    expect(lampTest(gen)).toEqual({ dark: 0 });
    expect(lights(gen)).not.toContain('LH GEN OUT'); // dark though the generator is off
    expect(faultText(withFault(base, 'bs-bulb', { cell: 3 }).faults[0]).what).toMatch(/blank light fourth from the left in the top row/);
    const off = bs(on, 'bs9:FAULT WARNING');
    expect(lampTest(off)).toBeNull();
    expect(lights(off)).not.toContain('FAULT WARNING');
  });

  it('lights both FIRE lights for one turn of the test, or one side with a fault', () => {
    let s = step(bs(base, 'bs10'), 1);
    expect(lights(s)).toEqual(expect.arrayContaining(['LH FIRE', 'RH FIRE', 'LH FIRE EXT', 'RH FIRE EXT', 'FAULT WARNING']));
    s = step(s, 3);
    expect(lights(s)).not.toContain('RH FIRE');
    expect(lights(s)).toContain('FAULT WARNING'); // until pressed
    let f = step(withFault(bs(base, 'bs10'), 'bs-fire-zone', { side: 'L' }), 1);
    expect(lights(f)).toContain('RH FIRE');
    expect(lights(f)).not.toContain('LH FIRE');
    expect(f.faults[0].seen).toBe(true);
    f = step(f, 3);
    expect(lights(f)).not.toContain('RH FIRE');
  });

  it('leaves CABIN DOOR OPEN lit', () => {
    expect(lights(withFault(base, 'bs-door'))).toContain('Cabin Door');
    expect(lights(base)).not.toContain('Cabin Door');
  });
});

describe('the left start', () => {
  it('spikes the right ITT past 850 with the generator carrying the start, not before', () => {
    let s = withFault(input(initial('rightRunning'), { side: 'R', gen: true }), 'sl-itt-rise');
    expect(step(s, 12).engines.R.itt).toBeLessThan(700);
    s = step(input(s, { side: 'L', starter: 'on' }), 12);
    expect(s.engines.R.itt).toBeGreaterThan(850);
    expect(s.faults[0].seen).toBe(true);
  });

  it('reads zero on a fuel gauge only once the right generator is off after the left start', () => {
    const before = withFault(initial('rightRunning'), 'sl-fuel-zero', { side: 'L' });
    expect(readouts(step(before, 1)).L.qty).not.toBe('0');
    const ev = [{ side: 'R', gen: true }, { side: 'L', starter: 'on' }];
    let s = step(ev.reduce(input, before), 12);
    s = step(input(s, { side: 'L', cond: 'low' }), 25);
    s = step(input(s, { side: 'L', starter: 'off' }), 2);
    expect(readouts(s).L.qty).not.toBe('0'); // right generator still on: not yet
    s = step(input(s, { side: 'R', gen: false }), 0.2);
    expect(readouts(s).L.qty).toBe('0');
  });

  it('keeps a generator off line, and splits the loads', () => {
    const s = fire(withFault(initial('rightRunning'), 'sl-gen-out-R'), 'start-left', 'sl22');
    expect(lights(s)).toContain('RH GEN OUT');
    let both = fire(fire(initial('rightRunning'), 'start-left', 'sl22'), 'start-left', 'sl22b');
    both = step(withFault(both, 'sl-gen-split', { side: 'L' }), 10);
    const r = readouts(both);
    expect(Number(r.L.gen) - Number(r.R.gen)).toBeGreaterThan(0.15);
  });
});

describe('After Start', () => {
  const as = (s, key) => fire(s, 'after-start', key);
  const base = initial('afterStart');

  it('reads a bad bus voltage only while that button is held', () => {
    let s = withFault(base, 'as-volts', { side: 'R', volts: '29.60' });
    s = step(input(s, { pressVolts: 'R' }), 0.5);
    expect(readouts(s).R.gen).toBe('29.60');
    expect(s.faults[0].seen).toBe(true);
    expect(readouts(step(s, 4)).R.gen).not.toBe('29.60');
  });

  it('does not flicker a dead transfer pump', () => {
    const s = as(withFault(base, 'as-transfer', { side: 'L' }), 'as6#2');
    expect(lights(s)).not.toContain('LH NO FUEL TRANSFER');
    expect(lights(as(base, 'as6#2'))).toContain('LH NO FUEL TRANSFER');
  });

  it('lights neither light with no open signal from a side', () => {
    let s = as(as(withFault(base, 'as-xfeed-noopen', { side: 'L' }), 'as7#1'), 'as7#2');
    s = step(s, 2);
    expect(lights(s)).not.toContain('L FUEL PRESSURE');
    expect(lights(s)).not.toContain('FUEL CROSSFEED');
  });

  it('keeps FUEL CROSSFEED lit with a failed pump back on, or a stuck valve', () => {
    let s = step(as(as(as(base, 'as7#1'), 'as7#2'), 'as7#3'), 1);
    expect(lights(seenNow(withFault(s, 'as-boost-failed')))).toContain('FUEL CROSSFEED');
    s = step(as(s, 'as7#4'), 1);
    expect(lights(seenNow(withFault(s, 'as-xfeed-stuck')))).toContain('FUEL CROSSFEED');
  });

  it('splits or raises the generator loads', () => {
    const r = readouts(withFault(base, 'as-load-high'));
    expect(Number(r.L.gen)).toBeGreaterThan(0.5);
    const sp = readouts(withFault(base, 'as-load-split', { side: 'R' }));
    expect(Number(sp.R.gen) - Number(sp.L.gen)).toBeGreaterThan(0.1);
  });
});

describe('the engine runup', () => {
  const er = (s, key) => fire(s, 'engine-runup', key);
  const base = initial('runup');

  it('reads an engine instrument out of limits once both levers are set', () => {
    const s = seenNow(withFault(base, 'er-oil-low', { side: 'L', psi: 35 }));
    expect(readouts(s).L.oilP).toBe('35');
    expect(readouts(seenNow(withFault(base, 'er-np-idle', { side: 'R', np: 1160 }))).R.np).toBe('1160');
    expect(Number(readouts(seenNow(withFault(base, 'er-itt-idle', { side: 'R' }))).R.itt)).toBeGreaterThan(685);
  });

  it('stops short of HIGH IDLE with the pneumatic pressure low', () => {
    const s = step(er(withFault(base, 'er-short-idle'), 'er5#1'), 25);
    expect(s.engines.L.n1).toBeLessThan(66);
    expect(Number(readouts(s).S.pneumatic)).toBeLessThan(12);
    expect(s.faults[0].seen).toBe(true);
  });

  it('runs past 2100 rpm with the overspeed governor not reset', () => {
    let s = step(er(base, 'er5:Condition Lever'), 20);
    s = withFault(step(er(s, 'er6'), 1), 'er-osg-fail');
    s = er(s, 'er6#3');
    let peak = 0;
    for (let i = 0; i < 400 && s.script; i += 1) { s = step(s, 0.1); peak = Math.max(peak, s.engines.L.np); }
    expect(peak).toBeGreaterThan(2320); // toward 2350, as the sim showed (the user, 2026-11-08)
    expect(peak).toBeLessThan(2360);
    expect(s.faults[0].seen).toBe(true);
  });

  it('settles out of range at the detent, or does not come back', () => {
    let s = withFault(step(er(base, 'er5:Condition Lever'), 20), 'er-pgov-detent', { side: 'L', np: 1540 });
    s = step(input(s, { side: 'both', pwrNp: 1900 }), 10);
    s = step(er(s, 'er7'), 5);
    expect(s.faults[0].seen).toBe(true);
    let r = withFault(step(input(step(er(base, 'er5:Condition Lever'), 20), { side: 'both', pwrNp: 1900 }), 10), 'er-pgov-return', { side: 'R' });
    r = step(er(r, 'er7'), 15);
    expect(r.engines.R.np).toBeLessThan(1800);
    expect(r.faults[0].seen).toBe(true);
  });

  it('leaves one prop unfeathered, or slow out of feather (Runup 4)', () => {
    let s = withFault(base, 'er-mf-nofeather', { side: 'R' });
    s = step(er(s, 'er4'), 6);
    expect(s.engines.L.np).toBeLessThan(850);
    expect(s.engines.R.np).toBeGreaterThan(900);
    expect(s.faults[0].seen).toBe(true);
    let w = withFault(base, 'er-mf-slow', { side: 'L' });
    w = step(er(w, 'er4'), 9);
    expect(w.faults[0].seen).toBe(false); // both still feathered
    w = step(w, 4);
    expect(w.engines.R.np).toBeGreaterThan(900);
    expect(w.engines.L.np).toBeLessThan(750);
    expect(w.faults[0].seen).toBe(true);
  });

  it('shows a late switch only once torque is below its tolerance, and stops the test when found', () => {
    let n = step(input(er(base, 'er5:Condition Lever'), { side: 'both', pwr: 85.3 }), 20);
    n = step(er(n, 'er8:Condition Lever'), 8);
    n = withFault(er(er(n, 'er8:Autoignition'), 'er8'), 'er-swap', { side: 'L', arm: 320 });
    n = er(n, 'er8:Power Lever');
    for (let i = 0; i < 900 && !n.faults[0].seen; i += 1) n = step(n, 0.1);
    expect(n.faults[0].seen).toBe(true);
    expect(n.engines.L.trq).toBeLessThan(361);
    expect(n.engines.L.trq).toBeGreaterThan(330); // before the late switch itself
    const stopped = input(n, { stopTest: true });
    expect(stopped.script).toBeNull();
    expect(stopped.engines.L.pwrGoal).toBe(0);
  });

  it('puts a torque switch out of tolerance, or does not feather', () => {
    const s = er(withFault({ ...base, afTest: true }, 'er-swap', { side: 'L', arm: 480 }), 'er8:Power Lever');
    expect(step(s, 0.5).auto.L.arm).toBe(480);
    const f = er(withFault({ ...base, afTest: true }, 'er-flash', { side: 'R', feather: 260 }), 'er8:Power Lever');
    expect(step(f, 0.5).auto.R.feather).toBe(260);
    // Through the real test: the left light flashes, and its prop holds its rpm.
    let n = step(input(er(base, 'er5:Condition Lever'), { side: 'both', pwr: 85.3 }), 20);
    n = step(er(n, 'er8:Condition Lever'), 8);
    n = withFault(er(er(n, 'er8:Autoignition'), 'er8'), 'er-nofeather', { side: 'L' });
    n = er(n, 'er8:Power Lever');
    for (let i = 0; i < 600 && !n.engines.L.feathering; i += 1) n = step(n, 0.1);
    expect(n.engines.L.feathering).toBe(true);
    const before = n.engines.L.np;
    n = step(n, 5);
    expect(n.faults[0].seen).toBe(true);
    expect(n.engines.L.np).toBeGreaterThan(before - 150);
  });
});

describe('the anti-ice check', () => {
  const ai = (s, key) => fire(s, 'anti-ice-check', key);
  const base = initial('runup');
  const load = (s) => Number(readouts(s).L.gen) + Number(readouts(s).R.gen);

  it('raises the load with each heater, none with a dead one, and with lip boots only by fault', () => {
    expect(load(ai(base, 'ai2a'))).toBeGreaterThan(load(base));
    expect(load(ai(withFault(base, 'ai-heat-dead-ai2a'), 'ai2a'))).toBeCloseTo(load(base), 5);
    expect(load(ai(base, 'ai2c'))).toBeCloseTo(load(base), 5);
    expect(load(ai(withFault(base, 'ai-lip-rise'), 'ai2c'))).toBeGreaterThan(load(base));
    expect(load(fire(ai(base, 'ai2e'), 'anti-ice-check', 'ai4:Condition Lever'))).toBeCloseTo(load(base), 5);
  });

  it('reads prop amps and pneumatic pressure out of range', () => {
    expect(readouts(ai(withFault(base, 'ai-amps', { amps: '11.5' }), 'ai1')).B.prop).toBe('11.5');
    expect(readouts(seenNow(withFault(base, 'ai-pneu-low'))).S.pneumatic).toBe('9.8');
  });
});

describe('the store', () => {
  let rand;
  beforeEach(() => { rand = jest.spyOn(Math, 'random').mockReturnValue(0); });
  afterEach(() => rand.mockRestore());

  it('draws nothing with chaos at zero', () => {
    const engine = createT44CEngine();
    engine.setChaos(0);
    engine.open('before-start');
    engine.arm('bs11');
    expect(engine.discrepancy()).toBeNull();
    engine.dispose();
  });

  it('draws a fault, finds it on Discrepancy, and puts it right', () => {
    const engine = createT44CEngine();
    engine.setChaos(1);
    engine.open('before-start');
    engine.arm('bs1'); // the door is a standing fault, drawn as the card opens
    expect(engine.discrepancy()).toBeNull(); // nothing lit before the battery
    engine.fire('bs8:Battery');
    expect(engine.getSnapshot().lights).toContain('Cabin Door');
    const found = engine.discrepancy();
    expect(found[0].what).toMatch(/CABIN DOOR OPEN/);
    expect(engine.getSnapshot().lights).not.toContain('Cabin Door');
    expect(engine.discrepancy()).toBeNull();
    engine.dispose();
  });

  it('takes the click that shows a fault as no miss, and the next step click as one', () => {
    const engine = createT44CEngine();
    const told = [];
    engine.onMiss((t) => told.push(t));
    engine.setChaos(1);
    engine.setChaos(0);
    engine.open('start-left');
    engine.arm('sl11'); // no standing fault
    engine.setChaos(1);
    engine.arm('sl22'); // RH GEN OUT stays lit as the right generator goes on
    engine.fire('sl22');
    expect(told).toEqual([]);
    expect(engine.getSnapshot().lights).toContain('RH GEN OUT');
    engine.fire('sl22b'); // on to the left generator without seeing it
    expect(told).toEqual([expect.objectContaining({ stepId: 'sl22', what: expect.stringMatching(/RH GEN OUT/) })]);
    engine.dispose();
  });

  it('takes leaving the card with a fault in sight as a miss', () => {
    const engine = createT44CEngine();
    const told = [];
    engine.onMiss((t) => told.push(t));
    engine.setChaos(1);
    engine.open('before-start');
    engine.arm('bs1', ['bs1', 'bs8', 'bs9', 'bs10', 'bs11']);
    engine.fire('bs8:Battery');
    engine.fire('bs9:Press to Test'); // an earlier step than the door's: no miss
    expect(told).toEqual([]);
    engine.open('start-right');
    expect(told).toEqual([expect.objectContaining({ stepId: 'bs11' })]);
    engine.dispose();
  });

  it('tells the drill when a fault is gone past, and draws once a run', () => {
    const engine = createT44CEngine();
    const told = [];
    engine.onMiss((t) => told.push(t));
    engine.setChaos(1);
    engine.open('after-start');
    engine.arm('as8');
    engine.fire('as9');
    expect(told).toEqual([expect.objectContaining({ stepId: 'as8' })]);
    engine.arm('as8');
    expect(engine.discrepancy()).toBeNull();
    engine.dispose();
  });

  it('leaves CABIN DOOR OPEN lit while a later fault is drawn and found (the user, 2026-11-08)', () => {
    const engine = createT44CEngine();
    engine.setChaos(1);
    engine.open('before-start');
    engine.arm('bs1', ['bs1', 'bs8', 'bs9', 'bs10', 'bs11']);
    engine.fire('bs8:Battery');
    expect(engine.getSnapshot().lights).toContain('Cabin Door');
    engine.arm('bs9'); // a dead bulb, drawn with the door still showing
    engine.fire('bs9:Press to Test');
    const found = engine.discrepancy();
    expect(found).toHaveLength(1);
    expect(found[0].what).toMatch(/did not light in the lamp test/);
    expect(engine.getSnapshot().lights).toContain('Cabin Door');
    engine.arm('bs11');
    expect(engine.discrepancy()[0].what).toMatch(/CABIN DOOR OPEN/);
    engine.dispose();
  });

  it('waits for a fault to show before Discrepancy finds it', () => {
    const engine = createT44CEngine();
    engine.setChaos(1);
    engine.setChaos(0);
    engine.open('before-start');
    engine.arm('bs1'); // the door not drawn
    engine.setChaos(1);
    engine.arm('bs8'); // the first of its faults: FUEL CROSSFEED dark, shown at the crossfeed OPEN
    expect(engine.discrepancy()).toBeNull();
    engine.fire('bs8#3');
    expect(engine.discrepancy()[0].what).toMatch(/FUEL CROSSFEED/);
    engine.dispose();
  });
});

describe('Engine Runup 8 faults', () => {
  it('are gone past only once the test has run, not the moment they show', () => {
    jest.useFakeTimers();
    const rand = jest.spyOn(Math, 'random').mockReturnValue(0);
    const engine = createT44CEngine();
    const told = [];
    engine.onMiss((t) => told.push(t));
    engine.setChaos(1);
    engine.open('engine-runup');
    engine.arm('er8'); // the first of its faults: an AUTOFEATHER ARMED light dark on test
    engine.fire('er8:Condition Lever');
    engine.fire('er8:Autoignition');
    engine.fire('er8');
    jest.advanceTimersByTime(3000);
    expect(told).toEqual([]);
    engine.fire('er8:Power Lever');
    jest.advanceTimersByTime(200000);
    expect(told).toEqual([expect.objectContaining({ stepId: 'er8' })]);
    engine.dispose();
    rand.mockRestore();
    jest.useRealTimers();
  });
});
