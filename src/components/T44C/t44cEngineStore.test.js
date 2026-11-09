import { createT44CEngine, RANDOM } from './t44cEngineStore';

// The store against the clock is the browser's business; these are its decisions.

it('takes a second press of the condition lever during a start as an abort', () => {
  const engine = createT44CEngine();
  engine.open('start-right');
  // Before the fuel is in, the lever is the start's own step 3, not an abort.
  engine.fire('sr1');
  expect(engine.abortByLever(['Condition Lever'])).toBeNull();
  engine.fire('sr3');
  expect(engine.abortByLever(['Power Lever'])).toBeNull();
  expect(engine.abortByLever(['Condition Lever'])).toEqual({ epId: 'abnormal-start', stepId: 'as1' });
  // Once cut off, a further press is not an abort again.
  expect(engine.abortByLever(['Condition Lever'])).toBeNull();
  engine.dispose();
});

it('never says which start Random drew', () => {
  const engine = createT44CEngine();
  engine.open('start-right');
  engine.setScenario(RANDOM);
  expect(engine.getSnapshot().scenario).toBe(RANDOM);
  engine.setScenario('normal');
  engine.dispose();
});

it('jumps the engines on to the next step when a step is skipped', () => {
  const engine = createT44CEngine();
  engine.setScenario('normal');
  engine.open('start-right');
  // Right Starter skipped: N1 is above 12 percent for step 2.
  engine.skip(['sr1'], 'sr2');
  expect(Number(engine.getSnapshot().readouts.R.n1)).toBeGreaterThan(12);
  // Steps 3 and 4 skipped: light-off for step 5.
  engine.skip(['sr3'], 'sr4');
  engine.skip(['sr4'], 'sr5');
  expect(Number(engine.getSnapshot().readouts.R.itt)).toBeGreaterThan(30);
  // Step 5 skipped: N1 above 50 for the starter.
  engine.skip(['sr5'], 'sr6');
  expect(Number(engine.getSnapshot().readouts.R.n1)).toBeGreaterThan(50);
  engine.dispose();
});

it('skips the overspeed governor check to 1900 rpm with the switch released', () => {
  const engine = createT44CEngine();
  engine.open('engine-runup');
  engine.skip(['er5:Condition Lever', 'er5#1', 'er5', 'er5#2'], 'er6');
  expect(engine.getSnapshot().readouts.R.n1).toBe('71.5');
  engine.skip(['er6:Prop Lever', 'er6#1', 'er6', 'er6#2', 'er6:Power Lever', 'er6#3'], 'er7');
  expect(Math.abs(Number(engine.getSnapshot().readouts.R.np) - 1900)).toBeLessThan(25);
  engine.dispose();
});
