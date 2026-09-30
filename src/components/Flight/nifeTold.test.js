import {
  TAKEOFF, LANDING, checkCg, forwardLimit, windFactor, cellFor, takeoffTable,
  takeoffDistances, landingDistances,
} from './nifeTold';

// A transcription slip in a table almost always breaks its order: every distance grows with
// altitude, with temperature and with weight.
const tables = [...Object.values(TAKEOFF), ...Object.values(LANDING)];

test('every table grows with altitude and temperature, and total exceeds ground roll', () => {
  const slips = [];
  tables.forEach(({ rows }, t) => {
    expect(rows).toHaveLength(9);
    rows.forEach((r, i) => {
      expect(r).toHaveLength(10);
      r.forEach((v, c) => {
        const where = `table ${t} row ${i} col ${c}`;
        if (c % 2 && v <= r[c - 1]) slips.push(`${where}: total not over ground roll`);
        if (c > 1 && v <= r[c - 2]) slips.push(`${where}: not over the colder column`);
        if (i && v <= rows[i - 1][c]) slips.push(`${where}: not over the row below`);
      });
    });
  });
  expect(slips).toEqual([]);
});

test('heavier takeoff tables are longer everywhere', () => {
  [[2200, 2400], [2400, 2550]].forEach(([a, b]) => {
    TAKEOFF[a].rows.forEach((r, i) => r.forEach((v, c) => expect(TAKEOFF[b].rows[i][c]).toBeGreaterThan(v)));
  });
});

test('CG envelope', () => {
  expect(forwardLimit(1800)).toBe(35);
  expect(forwardLimit(2550)).toBe(41);
  expect(forwardLimit(2250)).toBe(38);
  expect(checkCg(2250, 38).ok).toBe(true);
  expect(checkCg(2250, 37.99).ok).toBe(false);
  expect(checkCg(2400, 47.3).ok).toBe(true);
  expect(checkCg(2400, 47.31).why).toMatch(/aft/);
  expect(checkCg(2551, 44).why).toMatch(/maximum/);
  // Judged at the two places shown: 37.996 shows as 38.00.
  expect(checkCg(2250, 37.996).ok).toBe(true);
  expect(checkCg(0, 40)).toBeNull();
});

test('wind steps are conservative', () => {
  expect(windFactor(0)).toBe(1);
  expect(windFactor(8)).toBe(1);
  expect(windFactor(9)).toBeCloseTo(0.9);
  expect(windFactor(18)).toBeCloseTo(0.8);
  expect(windFactor(-1)).toBeCloseTo(1.1);
  expect(windFactor(-2)).toBeCloseTo(1.1);
  expect(windFactor(-3)).toBeCloseTo(1.2);
  expect(windFactor(-10)).toBeCloseTo(1.5);
  expect(windFactor(-11)).toBeNull();
});

test('cells round up', () => {
  expect(cellFor(121, 24)).toMatchObject({ alt: 1000, col: 30 });
  expect(cellFor(0, -5)).toMatchObject({ alt: 0, col: 0 });
  expect(cellFor(3000, 30)).toMatchObject({ alt: 3000, col: 30 });
  expect(cellFor(8001, 20).error).toBeTruthy();
  expect(cellFor(100, 41).error).toBeTruthy();
});

test('takeoff reads the next weight up', () => {
  expect(takeoffTable(2100)).toBe(2200);
  expect(takeoffTable(2201)).toBe(2400);
  expect(takeoffTable(2550)).toBe(2550);
  expect(takeoffTable(2551)).toBeNull();
  // 2,300 lbs, field 121 ft, 24 °C, calm: 2400 lbs, 1000 ft, 30 °C.
  expect(takeoffDistances(2300, { elevation: 121, temp: 24, headwind: 0 }))
    .toMatchObject({ weight: 2400, alt: 1000, col: 30, ground: 1015, total: 1785 });
  // 9 knots headwind takes 10% off.
  expect(takeoffDistances(2300, { elevation: 121, temp: 24, headwind: 9 }))
    .toMatchObject({ ground: 914, total: 1607 });
  expect(takeoffDistances(2300, { elevation: NaN, temp: 24, headwind: 0 })).toBeNull();
});

test('landing reads the 2550 table', () => {
  expect(landingDistances({ elevation: 97, temp: 15, headwind: -4 }))
    .toMatchObject({ alt: 1000, col: 20, ground: 726, total: 1662 });
});
