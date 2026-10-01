import {
  wrapHeading, timeWithUnit, tasFromCas, casFromTas, pressureAltitude,
  preflightWinds, inflightWinds, tacanPointToPoint, zuluLocal, convertTimes, timeProblem,
  answerDiff, gradeAnswer, jetLog, JetLogInputError, gradeJetLogBox,
  setai, gradeSetai, vfrCruise, runwayIndex, RUNWAYS,
} from './navMath';

// A seeded random, so the sweeps below are the same every run.
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('headings', () => {
  test('wrap into 1-360', () => {
    expect(wrapHeading(0)).toBe(360);
    expect(wrapHeading(-3)).toBe(357);
    expect(wrapHeading(362)).toBe(2);
    expect(wrapHeading(360)).toBe(360);
  });
});

describe('Nav', () => {
  test('time picks the unit the wheel reads', () => {
    expect(timeWithUnit(2)).toEqual({ value: 2, unit: 'hrs' });
    expect(timeWithUnit(0.5)).toEqual({ value: 30, unit: 'mins' });
    expect(timeWithUnit(0.01)).toEqual({ value: 36, unit: 'secs' });
  });

  test('airspeed: CAS to TAS and back agree, and TAS rises with altitude', () => {
    for (const [temp, palt, cas] of [[15, 0, 200], [-5, 10000, 250], [-25, 22500, 350], [20, 5000, 110], [20, 22500, 350]]) {
      const tas = tasFromCas(temp, palt, cas);
      expect(casFromTas(temp, palt, tas)).toBeCloseTo(cas, 0);
    }
    expect(tasFromCas(15, 0, 200)).toBeCloseTo(200, -1);
    expect(tasFromCas(-5, 10000, 200)).toBeGreaterThan(tasFromCas(15, 0, 200) + 20);
    expect(pressureAltitude(5000, 29.42)).toBeCloseTo(5500);
  });

  test('preflight winds: a direct crosswind, a headwind, and TH never below 1', () => {
    expect(preflightWinds({ tc: 90, tas: 200, dir: 180, kts: 20 })).toMatchObject({ ca: 6, th: 96, hwtw: 0, gs: 200 });
    expect(preflightWinds({ tc: 90, tas: 200, dir: 90, kts: 20 })).toMatchObject({ ca: 0, th: 90, hwtw: -20, gs: 180 });
    expect(preflightWinds({ tc: 2, tas: 100, dir: 270, kts: 30 }).th).toBe(345);
    const random = seeded(1);
    for (let i = 0; i < 2000; i++) {
      const th = preflightWinds({
        tc: Math.floor(random() * 360), tas: 100 + Math.floor(random() * 300),
        dir: Math.floor(random() * 73) * 5, kts: 10 + Math.floor(random() * 40),
      }).th;
      expect(th).toBeGreaterThanOrEqual(1);
      expect(th).toBeLessThanOrEqual(360);
    }
  });

  // The wheel reads crosswind as TAS x sin(drift) and headwind as GS - TAS, which holds to
  // 4 degrees and 1 knot at 200+ knots TAS in winds up to 30 knots.
  test('in-flight winds read back the true wind, within the wheel method', () => {
    const random = seeded(2);
    for (let i = 0; i < 500; i++) {
      const tc = 1 + Math.floor(random() * 360);
      const tas = 200 + Math.floor(random() * 200);
      const dir = 5 + Math.floor(random() * 71) * 5;
      const kts = 10 + Math.floor(random() * 21);
      // Fly the true triangle and read the wind back.
      const wca = Math.asin(kts * Math.sin((dir - tc) * Math.PI / 180) / tas) * 180 / Math.PI;
      const gs = tas * Math.cos(wca * Math.PI / 180) - kts * Math.cos((dir - tc) * Math.PI / 180);
      const back = inflightWinds({ th: tc + wca, tas, trk: tc, gs });
      expect(Math.abs(((back.dir - dir) % 360 + 540) % 360 - 180)).toBeLessThanOrEqual(4);
      expect(Math.abs(back.vel - kts)).toBeLessThanOrEqual(1);
    }
  });

  test('in-flight winds: drift right means wind from the left', () => {
    // Heading 090, tracking 095, no head or tail component: straight across from the north.
    const w = inflightWinds({ th: 90, tas: 200, trk: 95, gs: 200 });
    expect(w.da).toBe(5);
    expect(w.xw).toBeLessThan(0);
    expect(w.dir).toBe(5);
  });

  test('TACAN point to point', () => {
    // 30 nm north of the station, target 40 nm east: 53 degrees short of east... the
    // course is atan2(40, -30) and the distance 50.
    expect(tacanPointToPoint({ bdhi: '360 FROM', r1: 30, t2: 90, r2: 40 })).toMatchObject({ course: 127, distance: 50 });
    // The same position read as a bearing TO the station.
    expect(tacanPointToPoint({ bdhi: '180 TO', r1: 30, t2: 90, r2: 40 })).toMatchObject({ course: 127, distance: 50 });
    expect(tacanPointToPoint({ bdhi: '90 FROM', r1: 10, t2: 270, r2: 10 })).toMatchObject({ course: 270, distance: 20 });
  });

  test('time conversion: local = UTC + ZD', () => {
    expect(zuluLocal(1030, 12)).toBe(2230);
    expect(zuluLocal(2230, -12)).toBe(1030);
    expect(convertTimes({ duration: '2+12', zd: 12, zd2: -11, given: 0, value: 1030 })).toEqual([1030, 2230, 42, 1342]);
  });

  test('time conversion: every generated problem solves back from any one time', () => {
    const random = seeded(3);
    for (let i = 0; i < 1000; i++) {
      const p = timeProblem(random);
      expect(p.zd2).toBeGreaterThanOrEqual(-12);
      expect(p.zd2).toBeLessThanOrEqual(12);
      expect(p.duration).toMatch(/^\d+\+\d\d$/);
      for (let given = 0; given < 4; given++) {
        expect(convertTimes({ duration: p.duration, zd: p.zd, zd2: p.zd2, given, value: p.times[given] })).toEqual(p.times);
      }
    }
  });

  test('checking reads L/H as negative and wraps headings and times', () => {
    expect(answerDiff('5 L', -5)).toBe(0);
    expect(answerDiff('20H', -20)).toBe(0);
    expect(answerDiff('2 hrs', 2)).toBe(0);
    expect(answerDiff('359', 1, 'deg')).toBe(2);
    expect(answerDiff('2359', 1, 'time')).toBe(2);
    expect(answerDiff('1259', 1300, 'time')).toBe(1);
    expect(gradeAnswer('4 R', -4, 100)).toBe('bg-red');
    expect(gradeAnswer('360', 1, 100, 'deg')).toBe('bg-green');
    expect(gradeAnswer('', 5, 100)).toBe(null);
  });
});

describe('Jet Log', () => {
  test('preflight leg', () => {
    expect(jetLog.hwtw('270/20', '090')).toBe('20T');
    expect(jetLog.xw('270/20', '090')).toBe('0');
    expect(jetLog.xw('180/20', '090')).toBe('20R');
    expect(jetLog.gs('250', '20T')).toBe('270kts');
    expect(jetLog.ca('250', '20R')).toBe('5R');
    expect(jetLog.th('090', '5R')).toBe('95T');
    expect(jetLog.th('002', '5L')).toBe('357T');
    expect(jetLog.ete('270kts', '100')).toBe(22.2);
    expect(jetLog.altEte('22.2')).toBe('0+22+12');
    expect(jetLog.fuel('500', '22.2')).toBe('185#');
    expect(jetLog.efr('3000', '185#')).toBe('2815#');
  });

  test('a wind straight across the course leaves zero headwind the next box can read', () => {
    expect(jetLog.hwtw('180/20', '090')).toBe('0');
    expect(jetLog.gs('250', '0')).toBe('250kts');
    expect(jetLog.inflightHwtw('250', '250')).toBe('0');
    expect(jetLog.inflightWind('10L', '0', '090')).toBe('360/10kts');
  });

  test('ETA carries seconds into minutes into hours', () => {
    expect(jetLog.eta('10:59:30', '0.5')).toBe('11:00:00');
    expect(jetLog.eta('23:50', '20')).toBe('00:10:00');
    expect(jetLog.eta('10:00', '22.2')).toBe('10:22:12');
  });

  test('in-flight leg', () => {
    expect(jetLog.da('095', '90T')).toBe('5 R');
    expect(jetLog.inflightGs('20', '90')).toBe('270kts');
    expect(jetLog.inflightXw('250', '5 R')).toBe('22L');
    expect(jetLog.inflightHwtw('250', '270kts')).toBe('20T');
    expect(jetLog.inflightWind('22L', '20T', '095')).toBe('323/30kts');
  });

  test('a box it cannot read says what to type', () => {
    expect(() => jetLog.hwtw('westerly 20', '090')).toThrow(JetLogInputError);
    expect(() => jetLog.hwtw('westerly 20', '090')).toThrow('for example 270/20');
    expect(() => jetLog.gs('250', '20')).toThrow('H or T');
    expect(() => jetLog.eta('10.30', '5')).toThrow('HH:MM');
  });

  test('every box reads the box before it, across a sweep of legs', () => {
    const random = seeded(4);
    for (let i = 0; i < 500; i++) {
      const winds = `${Math.floor(random() * 36) * 10}/${Math.floor(random() * 40)}`;
      const course = String(1 + Math.floor(random() * 360));
      const tas = String(150 + Math.floor(random() * 200));
      const hwtw = jetLog.hwtw(winds, course);
      const xw = jetLog.xw(winds, course);
      const gs = jetLog.gs(tas, hwtw);
      const ca = jetLog.ca(tas, xw);
      expect(jetLog.th(course, ca)).toMatch(/^\d+T$/);
      const ete = jetLog.ete(gs, '100');
      expect(jetLog.eta('10:00', String(ete))).toMatch(/^\d\d:\d\d:\d\d$/);
      const track = String(wrapHeading(Number(course) + 3));
      const da = jetLog.da(track, `${course}T`);
      const ixw = jetLog.inflightXw(tas, da);
      const ihw = jetLog.inflightHwtw(tas, gs);
      expect(jetLog.inflightWind(ixw, ihw, track)).toMatch(/^\d+\/\d+kts$/);
    }
  });

  test('grading', () => {
    expect(gradeJetLogBox('20H', '20T', 150)).toBe('red');
    expect(gradeJetLogBox('20 T', '20T', 150)).toBe('green');
    expect(gradeJetLogBox('0', '0', 100)).toBe('green');
    expect(gradeJetLogBox('360', '1T', 100, true)).toBe('green');
    expect(gradeJetLogBox('22.3', '22.2', 100)).toBe('green');
    expect(gradeJetLogBox('250', '185#', 200)).toBe('red');
  });
});

describe('Weather (SETAI)', () => {
  test('high to low, look out below', () => {
    const s = setai({ depPres: 30.12, assAlt: 5000, fieldEle: 500, arrPres: 29.82 });
    expect(s.situation).toBe('H → L');
    expect(s.error).toBeCloseTo(300);
    expect(s.trueAlt).toBeCloseTo(4700);
    expect(s.absolute).toBeCloseTo(4200);
    expect(s.indicated).toBeCloseTo(800);
  });

  test('grading in feet', () => {
    expect(gradeSetai('4,705', 4700)).toBe('bg-green');
    expect(gradeSetai('4730', 4700)).toBe('bg-yellow');
    expect(gradeSetai('4800', 4700)).toBe('bg-red');
    expect(gradeSetai('', 4700)).toBe('');
    expect(gradeSetai('0', 0)).toBe('bg-green');
  });
});

describe('FR&R', () => {
  const layers = (ceiling) => [{ type: 'SCT', altitude: 3000 }, { type: 'BKN', altitude: ceiling }];

  test('VFR cruising altitude', () => {
    // Course 177 wants odd + 500.
    expect(vfrCruise({ airClass: 'E', visibility: 3, cloudLayers: layers(7300), course: 177 }).altitude).toBe(5500);
    // Course 182 wants even + 500.
    expect(vfrCruise({ airClass: 'E', visibility: 3, cloudLayers: layers(7300), course: 182 }).altitude).toBe(6500);
    // Under a 10,400 ceiling the aircraft is below 10,000, so 500 ft clearance.
    expect(vfrCruise({ airClass: 'E', visibility: 5, cloudLayers: layers(10400), course: 182 }).altitude).toBe(8500);
    expect(vfrCruise({ airClass: 'E', visibility: 5, cloudLayers: layers(10400), course: 10 }).altitude).toBe(9500);
    // At or above 10,000 it is 1,000 ft: 11,000, then even + 500 for course 182, odd for 010.
    expect(vfrCruise({ airClass: 'E', visibility: 5, cloudLayers: layers(12000), course: 182 }).altitude).toBe(10500);
    expect(vfrCruise({ airClass: 'E', visibility: 5, cloudLayers: layers(12000), course: 10 }).altitude).toBe(9500);
    expect(vfrCruise({ airClass: 'A', visibility: 5, cloudLayers: layers(12000), course: 10 }).answer).toMatch(/Class A/);
    expect(vfrCruise({ airClass: 'E', visibility: 2, cloudLayers: layers(12000), course: 10 }).answer).toMatch(/Vis/);
  });

  test('runway indicators', () => {
    const N = 0, E = 2, S = 4, W = 6;
    // Tetrahedron points into the wind: land towards its point.
    expect(RUNWAYS[runwayIndex({ relative: false, indicator: 0, flagDirection: E })]).toBe('Runway 09');
    // Windsock points downwind: land the other way.
    expect(RUNWAYS[runwayIndex({ relative: false, indicator: 1, flagDirection: E })]).toBe('Runway 27');
    // Heading north, windsock pointing towards you (blowing from ahead): land north.
    expect(RUNWAYS[runwayIndex({ direction: N, to: true, relative: true, randPosi: 0, indicator: 1 })]).toBe('Runway 36');
    // Arriving from the south is heading north too.
    expect(RUNWAYS[runwayIndex({ direction: S, to: false, relative: true, randPosi: 0, indicator: 1 })]).toBe('Runway 36');
    // Heading west, windsock pointing to your left (south): wind from the north.
    expect(RUNWAYS[runwayIndex({ direction: W, to: true, relative: true, randPosi: 1, indicator: 1 })]).toBe('Runway 36');
    // Heading north, windsock pointing towards you and to your right: wind from the NW.
    expect(RUNWAYS[runwayIndex({ direction: N, to: true, relative: true, randPosi: 0, randPosi2: 3, indicator: 1 })]).toBe('Runway 32');
  });
});
