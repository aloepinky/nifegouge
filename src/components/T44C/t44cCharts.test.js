import { accelerateStop, singleEngineClimb, stallSpeed } from './t44cCharts';

// The worked examples printed on the NATOPS figures.
const EXAMPLE = { oat: 35, pa: 50, weight: 9400 };

test('Figure 26.5-1 example: 3400 feet with 10 knots on the nose', () => {
  expect(Math.round(accelerateStop({ ...EXAMPLE, headwind: 10 }) / 100) * 100).toBe(3400);
});

test('Figure 27.1-2 example: 550 feet per minute', () => {
  expect(Math.round(singleEngineClimb(EXAMPLE) / 10) * 10).toBe(550);
});

test('Figure 25.12-1 example: 84.5 knots wings level, 91 at 30 degrees', () => {
  expect(stallSpeed('up', 9400)).toBeCloseTo(84.5, 0);
  expect(stallSpeed('up', 9400, 30)).toBeCloseTo(91, 0);
});

test('the squadron sample card at 9412 pounds: 85, 77; flaps approach at 30 AOB reads 86', () => {
  expect(Math.round(stallSpeed('up', 9412))).toBe(85);
  expect(Math.round(stallSpeed('full', 9412))).toBe(77);
  expect(Math.round(stallSpeed('approach', 9412, 30))).toBe(86);
});

test('off the chart is NaN', () => {
  expect(accelerateStop({ oat: 60, pa: 0, weight: 9000 })).toBeNaN();
  expect(accelerateStop({ ...EXAMPLE, weight: 9700 })).toBeNaN();
  expect(accelerateStop({ ...EXAMPLE, headwind: -15 })).toBeNaN();
  expect(singleEngineClimb({ ...EXAMPLE, pa: 12000 })).toBeNaN();
  expect(stallSpeed('up', 6000)).toBeNaN();
});

test('headwind shortens, tailwind lengthens, and height and heat cost', () => {
  const calm = accelerateStop(EXAMPLE);
  expect(accelerateStop({ ...EXAMPLE, headwind: 10 })).toBeLessThan(calm);
  expect(accelerateStop({ ...EXAMPLE, headwind: -5 })).toBeGreaterThan(calm);
  expect(accelerateStop({ ...EXAMPLE, pa: 4000 })).toBeGreaterThan(calm);
  expect(singleEngineClimb({ ...EXAMPLE, pa: 4000 })).toBeLessThan(singleEngineClimb(EXAMPLE));
});

test('a pressure altitude below sea level reads as sea level', () => {
  expect(accelerateStop({ ...EXAMPLE, pa: -200 })).toBe(accelerateStop({ ...EXAMPLE, pa: 0 }));
});
