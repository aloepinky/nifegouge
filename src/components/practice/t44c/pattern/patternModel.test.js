import { ABEAM, FIELDS, GEOMETRY, RUNWAY, RUNWAYS, SCENARIOS, buildBreak, buildPass, drawCase, singleEngine, waveoffOf } from './patternModel';

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
  // Every break ends at the touchdown.
  const end = e.stateAt(e.duration);
  expect(near(end.x, GEOMETRY.TOUCHDOWN_X, 10)).toBe(true);
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
  const call180 = rw.tower ? `, ${rw.side} 180, three down and locked` : `, ${rw.side} base runway ${rw.number}, ${rw.said}.`;
  const callBreak = rw.tower ? `MNTNA 12, cleared for the ${rw.side} break.` : `, ${rw.side} overhead runway ${rw.number}.`;
  expect(p.events.some((x) => x.text.includes(call180))).toBe(true);
  expect(e.events.some((x) => x.text.endsWith(callBreak))).toBe(true);
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

// Every runway with every pattern it offers: the SSE full stop only where it fits.
const PAIRS = (keep) => RUNWAYS.filter(keep).flatMap((r) => PATTERNS.filter((id) => r.sseFullStop || id !== 'ssefs').map((id) => [r.id, id]));
test.each(PAIRS(() => true))('%s, %s: the field pattern and break altitudes', (rid, id) => {
  const rw = RUNWAYS.find((r) => r.id === rid);
  const p = buildPass(id, 'left', rid);
  expect(p.stateAt(markT(p, 'the180')).alt).toBe(rw.pa);
  let maxAlt = 0;
  sample(p, (s) => { expect(Number.isFinite(s.x + s.y + s.alt + s.kias)).toBe(true); maxAlt = Math.max(maxAlt, s.alt); });
  expect(maxAlt).toBe(rw.pa);
  expect(buildBreak(id, 'left', rid).stateAt(1).alt).toBe(rw.ba);
});

test.each(PAIRS((r) => r.tower))('%s, %s: calls to the tower, none on a CTAF', (rid, id) => {
  const radio = buildPass(id, 'left', rid).events.filter((x) => x.radio);
  expect(radio.some((x) => x.who === 'Tower')).toBe(true);
  expect(radio.some((x) => / traffic, /.test(x.text))).toBe(false);
});

test.each(PAIRS((r) => !r.tower))('%s, %s: crosswind in the crosswind turn and base at the 180 on the CTAF, nothing more, the crew quiet', (rid, id) => {
  const rw = RUNWAYS.find((r) => r.id === rid);
  const p = buildPass(id, 'left', rid);
  const radio = p.events.filter((x) => x.radio);
  expect(radio.some((x) => x.who === 'Tower')).toBe(false);
  expect(radio.map((x) => x.text)).toEqual([
    `${rw.said} traffic, MNTNA 12, ${rw.side} crosswind runway ${rw.number}, ${rw.said}.`,
    `${rw.said} traffic, MNTNA 12, ${rw.side} base runway ${rw.number}, ${rw.said}.`,
  ]);
  const [xw, base] = radio;
  expect(base.t).toBe(markT(p, 'the180'));
  expect(xw.t).toBeGreaterThanOrEqual(markT(p, 'crosswind') - 0.5);
  expect(xw.t).toBeLessThan(markT(p, 'downwind'));
  const crew = p.events.filter((x) => x.kind === 'say' && !x.radio);
  const clash = radio.filter((x) => crew.some((c) => c.t > x.t - 1.5 && c.t < x.t + x.text.length * 0.06));
  expect(clash).toHaveLength(0);
  // The overhead: numbers at the approach end, overhead as it breaks, no altitude, no "break".
  const said = buildBreak(id, 'left', rid).events.filter((x) => x.radio && x.t < 60).map((x) => x.text);
  expect(said).toEqual([`${rw.said} traffic, MNTNA 12, numbers runway ${rw.number}.`, `${rw.said} traffic, MNTNA 12, ${rw.side} overhead runway ${rw.number}.`]);
});

test('off a touch and go the flaps and the Landing Checklist are called together', () => {
  const said = buildPass('approach').events.filter((x) => x.kind === 'say' && !x.radio && x.t < 70).map((x) => `${x.who}: ${x.text}`);
  const i = said.indexOf('PF: Speed checks, flaps approach, Landing Checklist');
  expect(said.slice(i, i + 3)).toEqual(['PF: Speed checks, flaps approach, Landing Checklist', 'PM: Speed checks, flaps approach', 'PM: Flaps']);
});

test('runway limits (IFG p. 57): 4,490 by 75 ft for a touch and go, 4,900 by 100 for an SSE full stop', () => {
  expect(RUNWAYS.every((r) => r.length >= 4490 && r.width >= 75)).toBe(true);
  expect(RUNWAYS.some((r) => r.id === 'kpil-17')).toBe(false);
  expect(RUNWAYS.filter((r) => !r.sseFullStop).map((r) => r.id)).toEqual(['ktfp-13', 'ktfp-31', 'kpkv-14', 'kpkv-32', 'kvct-18', 'kvct-36', 'kpsx-18', 'kpsx-36', 'kali-17', 'kali-35']);
});

test('Victoria flies its 1,100 ft turboprop pattern, every other field 800 ft; Victoria and Corpus Christi break at 1,500', () => {
  expect(FIELDS.filter((f) => f.pa !== 800).map((f) => f.id)).toEqual(['kvct']);
  expect(FIELDS.filter((f) => f.ba !== 1000).map((f) => [f.id, f.ba])).toEqual([['kvct', 1500], ['kcrp', 1500]]);
});

// ---- How a pass ends: a touch and go, the SSE full stop, or the student's wave-off.

const sayings = (p) => p.events.filter((x) => x.kind === 'say').map((x) => x.text);
const minGap = (p) => {
  const last = {};
  return Math.min(...p.events.filter((x) => x.kind === 'say').map((x) => {
    const k = x.radio ? 'radio' : x.who;
    const gap = last[k] === undefined ? Infinity : x.t - last[k];
    last[k] = x.t;
    return gap;
  }));
};
const BRIEF = /^Once safely on the deck/;

test.each(PATTERNS.filter((id) => id !== 'ssefs'))('%s ends in a touch and go: cleared for the option, no full-stop brief, no rollout', (id) => {
  const p = buildPass(id, 'left', 'kngw-13', { feather: true, leak: 'fire' });
  const said = sayings(p);
  expect(said.some((x) => /180, three down and locked, touch-and-go\./.test(x))).toBe(true);
  expect(said).toContain('Reviewed complete, cleared option.');
  expect(said.some((x) => BRIEF.test(x) || /full-stop|Cleared to land/.test(x))).toBe(false);
  expect(p.marks.some((m) => m.key === 'fullstop')).toBe(false);
  expect(near(p.stateAt(p.duration).x, GEOMETRY.TOUCHDOWN_X, 10)).toBe(true);
  expect(p.stateAt(p.duration).alt).toBe(0);
});

test.each(['left', 'right'])('the SSE full stop, %s engine: the brief before the 180, cleared to land, rolled out to a slow taxi', (eng) => {
  const p = buildPass('ssefs', eng, 'kngp-13L');
  const brief = p.events.find((x) => BRIEF.test(x.text));
  expect(brief.t).toBeLessThan(markT(p, 'the180'));
  expect(brief.text).toContain(`reversing with the ${eng === 'left' ? 'right' : 'left'} engine`);
  expect(sayings(p).some((x) => /180, three down and locked, full-stop\./.test(x))).toBe(true);
  expect(sayings(p)).toContain('Reviewed complete, cleared full-stop.');
  expect(p.marks.some((m) => m.key === 'fullstop')).toBe(true);
  expect(p.stateAt(p.duration).kias).toBeLessThan(15);
  expect(minGap(p)).toBeGreaterThanOrEqual(1.1);
});

test.each(PATTERNS)('%s: the wave-off is open from the groove to the touchdown', (id) => {
  const p = buildPass(id);
  const [a, b] = p.waveoffWindow;
  expect(a).toBe(markT(p, 'groove'));
  expect(near(p.stateAt(a).alt, 250, 2)).toBe(true);
  expect(p.stateAt(b).alt).toBe(0);
  expect(near(p.stateAt(b).x, GEOMETRY.TOUCHDOWN_X, 10)).toBe(true);
});

// A wave-off at each of three places on final: the groove, 200 ft and 100 ft.
const ON_FINAL = PATTERNS.flatMap((id) => [250, 200, 100].map((alt) => [id, alt]));
test.each(ON_FINAL)('%s, waved off at %i ft: the memory items, then round the pattern, continuous', (id, alt) => {
  const p = buildPass(id, 'right', 'kngw-13', { feather: false, leak: 'fuel' });
  const [a, b] = p.waveoffWindow;
  let t = a;
  while (t < b && p.stateAt(t).alt > alt) t += 0.05;
  const s = p.stateAt(t);
  const w = waveoffOf(p, t);
  // On one engine above 200 ft an SSE wave-off; below it, and on two engines, a wave-off on both.
  const sse = singleEngine(id) && s.alt >= 200;
  expect(w.from.single).toBe(sse);
  expect(w.id).toBe(sse ? (id === 'ssefs' ? 'ssefs' : 'sse') : ['noflap', 'full'].includes(id) ? id : 'approach');
  const q = buildPass(w.id, 'right', 'kngw-13', p.draw, w.from);
  // It picks up where the aircraft was.
  const q0 = q.stateAt(0);
  expect(near(q0.x, s.x, 3)).toBe(true);
  expect(near(q0.alt, s.alt, 3)).toBe(true);
  expect(q.marks[0].key).toBe('waveoff');
  const said = sayings(q);
  expect(said.slice(0, 2)).toEqual(['Landing gear up', 'Landing gear up']);
  expect(q.stateAt(8).gear).toBe('Up');
  expect(q.stateAt(8).flaps).toBe('Up');
  expect(q.stateAt(8).props).toBe('1900 RPM');
  // Gear down again and the Landing Checklist done by the 90.
  expect(q.stateAt(markT(q, 'the90')).gear).toBe('Down');
  const done = q.events.filter((x) => x.text === 'Landing Checklist complete').pop().t;
  expect(done).toBeLessThan(markT(q, 'the90'));
  // A Case 4 or 5 waved off on one engine finishes its shutdown checklist after the wave-off.
  const owes = sse && (id === 'case4' || id === 'case5');
  expect(said.includes('Did the prop feather?')).toBe(owes);
  expect(said.includes('Alternate prop feathering checklist.')).toBe(owes);
  expect(said.includes(`Right firewall valve closed, concur?`)).toBe(owes);
  expect(q.engine).toBe('right');
  let prev = q0;
  let maxAob = 0;
  sample(q, (x) => {
    expect(Math.hypot(x.x - prev.x, x.y - prev.y)).toBeLessThan(0.25 * 125 * 1.69 + 1);
    expect(x.alt).toBeGreaterThanOrEqual(0);
    maxAob = Math.max(maxAob, x.aob);
    prev = x;
  });
  expect(maxAob).toBeLessThanOrEqual(30.05);
  expect(minGap(q)).toBeGreaterThanOrEqual(1.1);
  // Engines after the wave-off: one still out on an SSE wave-off, both otherwise.
  expect(/zero thrust|failed/.test(q.stateAt(30).engines)).toBe(sse);
});

test('a wave-off off the break goes round its pattern', () => {
  const e = buildBreak('noflap', 'left');
  const [a, b] = e.waveoffWindow;
  expect(b).toBeCloseTo(e.duration, 0);
  const w = waveoffOf(e, (a + b) / 2);
  expect(w.id).toBe('noflap');
  expect(w.from.single).toBe(false);
});
