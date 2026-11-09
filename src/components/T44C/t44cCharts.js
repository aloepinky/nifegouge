// Placeholder performance estimates for the T-44C TOLD card: curves read by eye off NAVAIR
// 01-T44AAC-1 Figures 26.5-1 (accelerate-stop), 27.1-2 (one engine inoperative climb) and
// 25.12-1 (stall speeds). They reproduce the figures' worked examples (t44cCharts.test.js)
// but are only as good as the reading. Everything off a chart returns NaN; nothing extrapolates
// past a chart's stated limits. A pressure altitude below sea level reads as sea level.

// Straight lines between the points of an ascending xs, the end segments carried on.
function lerp(xs, ys, x) {
  let i = 0;
  while (i < xs.length - 2 && x > xs[i + 1]) i += 1;
  return ys[i] + ((x - xs[i]) / (xs[i + 1] - xs[i])) * (ys[i + 1] - ys[i]);
}

const onPolyline = (points, x) => lerp(points.map((p) => p[0]), points.map((p) => p[1]), x);

const MAX_CHART_ALT = 10000; // Read only this far up; the climb chart itself goes on to 20,000 ft.

// The temperature panels run from ISA - 30 to ISA + 37 °C.
function readAltitudePanel(lines, oat, pa) {
  const alt = Math.max(pa, 0);
  if (!(alt <= MAX_CHART_ALT)) return NaN;
  if (oat > 52 - alt / 500 || oat < -15 - alt / 500) return NaN;
  return lerp(lines.map((l) => l.alt), lines.map((l) => onPolyline(l.points, oat)), alt);
}

const GUIDE_WEIGHTS = [7000, 8000, 9000, 9400, 9650];

// `guides` holds each weight guideline's height at GUIDE_WEIGHTS, lowest guideline first. The
// reference line stands at 9650 lb.
function readWeightPanel(guides, atReference, weight) {
  if (!(weight >= 7000 && weight <= 9650)) return NaN;
  const atWeight = guides.map((g) => lerp(GUIDE_WEIGHTS, g, weight));
  return lerp(guides.map((g) => g[4]), atWeight, atReference);
}

// Figure 26.5-1: [°C, feet at reference line 1] along each pressure altitude.
const STOP_ALTITUDES = [
  { alt: 0, points: [[-15, 3117], [15, 3533], [35, 3835], [52, 4150]] },
  { alt: 2000, points: [[-19, 3327], [11, 3800], [20, 3950], [48, 4483]] },
  { alt: 4000, points: [[-23, 3590], [7, 4083], [20, 4350], [29, 4550], [44, 4900]] },
  { alt: 6000, points: [[-27, 3860], [3, 4457], [20, 4850], [28, 4993], [34, 5150], [40, 5383]] },
  { alt: 8000, points: [[-31, 4143], [-1, 4800], [20, 5350], [28, 5600], [36, 5983]] },
  { alt: 10000, points: [[-35, 4473], [-5, 5200], [19, 6017], [27, 6417], [32, 6733]] },
];

const STOP_GUIDES = [
  [2796, 2934, 3112, 3190, 3299],
  [3197, 3360, 3562, 3725, 3842],
  [3574, 3774, 4029, 4163, 4321],
  [3988, 4200, 4479, 4662, 4856],
  [4382, 4613, 4966, 5136, 5343],
  [4747, 5019, 5404, 5623, 5891],
  [5100, 5465, 5873, 6110, 6377],
  [5477, 5890, 6341, 6584, 6912],
];

// The wind panel, its lines fitted straight: headwind to 30 knots, tailwind to 10.
function applyWind(distance, headwind) {
  if (headwind > 30 || headwind < -10) return NaN;
  if (headwind >= 0) return distance - (341 + 0.1466 * distance) * (headwind / 30);
  return distance + (380 + 0.167 * distance) * (-headwind / 10);
}

export function accelerateStop({ oat, pa, weight, headwind = 0 }) {
  const reference = readAltitudePanel(STOP_ALTITUDES, oat, pa);
  return applyWind(readWeightPanel(STOP_GUIDES, reference, weight), headwind);
}

// Figure 27.1-2: [°C, feet per minute at the reference line].
const CLIMB_ALTITUDES = [
  { alt: 0, points: [[-15, 590], [8.5, 546], [35, 507], [44.6, 504], [51.5, 466]] },
  { alt: 2000, points: [[-18.6, 567], [40, 484], [48.3, 423]] },
  { alt: 4000, points: [[-22.7, 540], [35, 450], [44.2, 362]] },
  { alt: 6000, points: [[-27, 523], [29.6, 418], [40, 296]] },
  { alt: 8000, points: [[-31, 504], [20, 385], [35.4, 212]] },
  { alt: 10000, points: [[-35.7, 469], [9, 363], [32.2, 124]] },
];

const CLIMB_GUIDES = [
  [407, 256, 110, 60, 23],
  [510, 331, 200, 144, 102],
  [605, 423, 292, 230, 188],
  [706, 518, 381, 309, 267],
  [815, 613, 462, 393, 351],
  [927, 709, 535, 482, 440],
  [997, 801, 605, 552, 510],
  [1075, 879, 697, 630, 588],
];

export function singleEngineClimb({ oat, pa, weight }) {
  return readWeightPanel(CLIMB_GUIDES, readAltitudePanel(CLIMB_ALTITUDES, oat, pa), weight);
}

// Figure 25.12-1, as straight-line fits: knots at no bank for a weight in pounds.
const STALL_FITS = {
  up: (weight) => 0.00425 * weight + 44.625,
  approach: (weight) => 0.003 * weight + 51.5,
  full: (weight) => 0.00184211 * weight + 59.68421,
};

export function stallSpeed(flaps, weight, bankDegrees = 0) {
  if (!(weight >= 7000 && weight <= 9650)) return NaN;
  // The bank curves as one fit: the knots added over the no-bank speed.
  return STALL_FITS[flaps](weight) + 0.00668033 * bankDegrees ** 2;
}
