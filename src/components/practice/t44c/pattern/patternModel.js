// The T-44C touch-and-go pattern, flown by a model on a 5,000 ft runway (Cabaniss 13, left
// traffic), in the time a student took to fly it. Pure: no JSX, so a tool can load it
// (tools/t44c-voice-record.js records its spoken lines).
//
// Time: each of the seven legs lasts what the user's stopwatch read, the mean of the two
// passes timed (the user, 2026-11-19), from touchdown. Shape: the FTI's numbers. The
// approach turn is a half circle flown in its lap's time at its speeds (120 to 105 KIAS), and
// that radius sets the downwind's distance abeam; the crosswind turn uses the same radius.
// The aircraft moves along each leg at its airspeed's shape, scaled to the lap's time.
//
// x runs down the runway in the landing direction from the threshold, y to the left of it
// (the pattern side), in feet. Altitudes are AGL.

const KT = 1.68781; // ft/s per knot
const G = 32.174;

export const RUNWAY = { length: 5000, width: 150, number: '13', reciprocal: '31', heading: 130, field: 'Cabaniss' };
export const CALL_SIGN = 'MNTNA 12';
const TOUCHDOWN_X = 500;

// The user's stopwatch, two passes (lap 1 to 7, then 8 to 14). A lap is named for the mark
// that starts it.
export const LAPS = [
  { id: 'touchdown', name: 'Touchdown', ends: 'Rotate', times: [6.31, 5.65] },
  { id: 'rotate', name: 'Rotate', ends: '300 ft', times: [13.25, 12.91] },
  { id: 'p300', name: '300 ft', ends: 'Crosswind turn', times: [7.30, 6.25] },
  { id: 'crosswind', name: 'Crosswind', ends: 'Downwind', times: [42.11, 40.44] },
  { id: 'downwind', name: 'Downwind', ends: 'Approach turn', times: [34.90, 32.89] },
  { id: 'approach', name: 'Approach turn', ends: 'Final', times: [38.04, 39.14] },
  { id: 'final', name: 'Final', ends: 'Touchdown', times: [11.25, 15.08] },
].map((l) => ({ ...l, dur: (l.times[0] + l.times[1]) / 2 }));

let acc = 0;
for (const l of LAPS) { l.start = acc; acc += l.dur; l.end = acc; }
export const CYCLE = acc;
const lap = (id) => LAPS.find((l) => l.id === id);

// Piecewise-linear profile over a lap: [[fraction, value], ...].
function lerp(points, u) {
  if (u <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [u1, v1] = points[i];
    const [u0, v0] = points[i - 1];
    if (u <= u1) return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0 || 1);
  }
  return points[points.length - 1][1];
}
// Smooth 0..1.
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// Airspeed and altitude through each lap, from the FTI (Ch. 1, Pattern Work): touch down near
// idle and slow, 91 KIAS rotate, 120 KIAS upwind at 300-500 ft, 120 KIAS crosswind and downwind
// at 800 ft, the 90 at 500 ft and 110 KIAS, final at 250 ft and 105 KIAS, threshold at 95.
const KIAS = {
  touchdown: [[0, 90], [0.4, 82], [1, 91]],
  rotate: [[0, 91], [0.7, 120], [1, 120]],
  p300: [[0, 120], [1, 120]],
  crosswind: [[0, 120], [1, 120]],
  downwind: [[0, 120], [1, 120]],
  approach: [[0, 120], [0.5, 110], [1, 105]],
  final: [[0, 105], [0.85, 95], [1, 90]],
};

// Distance covered over a lap at its airspeed shape: ∫v dt, sampled.
function lapDistance(id) {
  const l = lap(id);
  const n = 400;
  let d = 0;
  for (let i = 0; i < n; i += 1) d += lerp(KIAS[id], (i + 0.5) / n) * KT * (l.dur / n);
  return d;
}
// Fraction of a lap's distance covered at fraction u of its time: a cumulative table per lap,
// read between its points so the motion is smooth.
const CUM = {};
function distFraction(id, u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const n = 400;
  if (!CUM[id]) {
    const c = [0];
    for (let i = 0; i < n; i += 1) c.push(c[i] + lerp(KIAS[id], (i + 0.5) / n));
    CUM[id] = c.map((v) => v / c[n]);
  }
  const c = CUM[id];
  const k = Math.min(n - 1, Math.floor(u * n));
  return c[k] + (c[k + 1] - c[k]) * (u * n - k);
}

// The approach turn's altitude by how far round it is: the 90 at 500 ft, final at 250.
const APP_ALT = [[0, 800], [0.5, 500], [1, 250]];

// The geometry.
const ROLL = lapDistance('touchdown');
const CLIMB = lapDistance('rotate');
const UPWIND = lapDistance('p300');
const FINAL = lapDistance('final');
export const ROTATE_X = TOUCHDOWN_X + ROLL;
export const X300 = ROTATE_X + CLIMB;
export const TURN_X = X300 + UPWIND; // crosswind turn begins
export const R = lapDistance('approach') / Math.PI; // approach turn radius
export const FINAL_X = TOUCHDOWN_X - FINAL; // rollout on final, where the approach turn begins and ends
export const ABEAM = 2 * R; // downwind, distance abeam
// The 180: three seconds before the approach turn ("3 big potatoes", the user's notes).
const POTATOES = 3;

const deg = (r) => (r * 180) / Math.PI;

// Where the aircraft is and what it shows, t seconds after touchdown.
export function stateAt(time) {
  const t = ((time % CYCLE) + CYCLE) % CYCLE;
  const l = LAPS.find((x) => t < x.end) || LAPS[LAPS.length - 1];
  const u = (t - l.start) / l.dur;
  const kias = lerp(KIAS[l.id], u);
  const f = distFraction(l.id, u);
  let x;
  let y;
  let psi; // track, radians, counterclockwise from the landing direction
  let alt;
  let turnR = 0;
  if (l.id === 'touchdown') {
    x = TOUCHDOWN_X + ROLL * f; y = 0; psi = 0; alt = 0;
  } else if (l.id === 'rotate') {
    x = ROTATE_X + CLIMB * f; y = 0; psi = 0;
    // Off the ground a second and a half after rotation, 300 ft at the lap's end.
    const lift = 1.5 / l.dur;
    alt = u < lift ? 0 : 300 * Math.pow((u - lift) / (1 - lift), 1.15);
  } else if (l.id === 'p300') {
    x = X300 + UPWIND * f; y = 0; psi = 0; alt = 300 + 200 * u;
  } else if (l.id === 'crosswind') {
    const th = Math.PI * f;
    x = TURN_X + R * Math.sin(th); y = R - R * Math.cos(th); psi = th; turnR = R;
    // 500 to 800 ft, level a quarter of the leg before the downwind mark.
    alt = 500 + 300 * ease(Math.min(1, u / 0.75));
  } else if (l.id === 'downwind') {
    x = TURN_X - (TURN_X - FINAL_X) * f; y = ABEAM; psi = Math.PI; alt = 800;
  } else if (l.id === 'approach') {
    const th = Math.PI * f;
    x = FINAL_X - R * Math.sin(th); y = R + R * Math.cos(th); psi = Math.PI + th; turnR = R;
    // By how far round the turn, so the 90 is 500 ft.
    alt = lerp(APP_ALT, f);
  } else {
    x = FINAL_X + FINAL * f; y = 0; psi = 0;
    // A steady descent to the numbers, then the flare.
    alt = lerp([[0, 250], [0.82, 30], [1, 0]], u);
  }
  // Bank for that radius at that speed, rolled in and out over two seconds.
  let aob = 0;
  if (turnR) {
    const v = kias * KT;
    const ramp = Math.min(1, (t - l.start) / 2, (l.end - t) / 2);
    aob = deg(Math.atan((v * v) / (G * turnR))) * Math.max(0, ramp);
  }
  const hdg = ((RUNWAY.heading - deg(psi)) % 360 + 360) % 360;
  return { t, lap: l, u, x, y, psi, alt, kias, aob, hdg, ...configAt(t) };
}

// Vertical speed, feet per minute, from the altitude a moment either side.
export function vsiAt(t) {
  const d = 0.25;
  const from = Math.max(0, t - d); // not back round into the last pass's flare
  return ((stateAt(t + d).alt - stateAt(from).alt) / (t + d - from)) * 60;
}

// The airplane's configuration, by the time of the call that changes it.
export function configAt(t) {
  const at = (id) => EVENTS.find((e) => e.id === id).t;
  const flaps = t >= at('flapsApproach') + 1.5 ? 'Approach' : t >= at('reset') + 1 ? 'Up' : 'Approach';
  let props = 'Full forward';
  if (t >= at('props1900') && t < at('review')) props = '1900 RPM';
  let power;
  if (t < at('reset')) power = 'Idle';
  else if (t < at('go')) power = "12 o'clock";
  else if (t < at('props1900')) power = 'Takeoff (1000 ft-lbs min)';
  else if (t < at('crosswind')) power = 'Takeoff';
  else if (t < at('approachTurn')) power = 'As required, 120 KIAS';
  else if (t < at('final')) power = '~250 ft-lbs';
  else if (t < at('threshold')) power = 'As required';
  else power = 'Closing to idle';
  return { flaps, props, power, gear: 'Down' };
}

// What is said and done, by time. `who` is a seat (PF, PM, OBS) or Tower; `say` lines are
// spoken, `do` lines shown. `ref` is the publication; `technique` is the user's notes
// (the pattern sketch), shown as technique.
const CH1 = (pages) => ({ work: 'ME FTI', loc: 'Ch. 1 — Pattern Work', pages });
const APPB = { work: 'ME FTI', loc: 'App. B — Radio Procedures', pages: 'p. B-4' };
const APPF = { work: 'ME FTI', loc: 'App. F — Landing Checklist', pages: 'p. F-24' };

const T = {
  td: lap('touchdown').start,
  rotate: lap('rotate').start,
  p300: lap('p300').start,
  xw: lap('crosswind').start,
  dw: lap('downwind').start,
  app: lap('approach').start,
  fin: lap('final').start,
};
// The moment an altitude is passed in the crosswind turn.
const xwAlt = (a) => T.xw + lap('crosswind').dur * 0.75 * inverseEase((a - 500) / 300);
function inverseEase(v) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) { const m = (lo + hi) / 2; if (ease(m) < v) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// The moment the approach turn passes an altitude (800 → 500 → 250 ft).
function appAlt(a) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) { const m = (lo + hi) / 2; if (lerp(APP_ALT, distFraction('approach', m)) > a) lo = m; else hi = m; }
  return T.app + lap('approach').dur * (lo + hi) / 2;
}
// The moment the final crosses the threshold (x = 0).
const thresholdT = (() => {
  const l = lap('final');
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) { const m = (lo + hi) / 2; if (FINAL_X + FINAL * distFraction('final', m) < 0) lo = m; else hi = m; }
  return l.start + l.dur * (lo + hi) / 2;
})();

const ev = (id, t, who, kind, text, extra = {}) => ({ id, t, who, kind, text, ...extra });

const LANDING = (t0) => {
  const lines = [
    ['PF', 'Landing Checklist'],
    ['PM', 'Flaps'], ['PF', 'Approach'], ['PM', 'Approach'],
    ['PM', 'Landing Gear'], ['PF', 'Down, locked'], ['PM', 'Down, locked'],
    ['PM', 'Lights'], ['PF', 'Set'],
    ['PM', 'Landing Checklist complete'],
  ];
  return lines.map(([who, text], i) => ev(`landing${i}`, t0 + 1.6 * (i + 1), who, 'say', text, { ref: APPF }));
};

export const EVENTS = [
  ev('touchdown', T.td, 'PF', 'do', 'Touchdown, main mounts first, power levers at idle', { mark: 'Touchdown', ref: CH1('p. 1-34') }),
  ev('reset', T.td + 0.7, 'PF', 'say', 'Reset Flaps and Trim', { ref: CH1('p. 1-35') }),
  ev('twelve', T.td + 1.0, 'PF', 'do', "Power levers to 12 o'clock", { ref: CH1('p. 1-35') }),
  ev('flaps', T.td + 1.6, 'PM', 'say', 'Flaps', { ref: CH1('p. 1-35') }),
  ev('flapsUp', T.td + 1.9, 'PM', 'do', 'Flaps up for takeoff', { ref: CH1('p. 1-35') }),
  ev('trim', T.td + 2.4, 'PM', 'say', 'Trim', { ref: CH1('p. 1-35') }),
  ev('obsFlaps', T.td + 2.7, 'OBS', 'do', 'Checks flaps up', { ref: CH1('p. 1-30') }),
  ev('go', T.td + 3.4, 'PM', 'say', 'Go', { note: 'Flaps set, trim set, props 2000 RPM minimum, engines spooled up', ref: CH1('p. 1-35') }),
  ev('takeoffPower', T.td + 3.7, 'PF', 'do', 'Takeoff power, 1000 ft-lbs minimum', { ref: CH1('p. 1-35') }),
  ev('rotate', T.rotate, 'PM', 'say', 'Rotate', { mark: 'Rotate', note: '91 KIAS, takeoff power set', ref: CH1('p. 1-35') }),
  ev('climb', T.rotate + 2, 'PF', 'do', '7-10° nose up for 120 KIAS, hand on the power levers until well clear of the ground', { ref: CH1('p. 1-35') }),
  ev('props1900', T.p300, 'PF', 'do', 'Takeoff power still set, props 1900 RPM', { mark: '300 ft', ref: CH1('p. 1-35') }),
  ev('clearLeft', T.p300 + 3.2, 'PF', 'say', 'Clear left, going left', { note: '400 ft', technique: true }),
  ev('clearRight', T.p300 + 4.6, 'PM', 'say', 'Clear right', { ref: CH1('p. 1-31') }),
  ev('crosswind', T.xw, 'PF', 'do', 'Crosswind turn at 500 ft: 30° AOB maximum, 120 KIAS', { mark: 'Crosswind', ref: CH1('p. 1-31') }),
  ev('flapsApproach', xwAlt(600), 'PF', 'say', 'Speed checks, flaps approach', { note: 'Passing 600 ft, 174 KIAS or less', ref: CH1('p. 1-31') }),
  ev('flapsSet', xwAlt(600) + 0.9, 'PM', 'do', 'Flap handle to APPROACH', { ref: APPF }),
  ...LANDING(xwAlt(600) + 0.6),
  ev('downwind', T.dw, 'PF', 'do', 'Downwind: 800 ft, 120 KIAS, trimmed, about a mile abeam with the lift detector on the runway edge', { mark: 'Downwind', ref: CH1('p. 1-31') }),
  ev('happy', T.dw + 2, 'PF', 'do', 'Landing Checklist, spacing, trim', { technique: true }),
  ev('rudderTrim', T.dw + 8, 'PF', 'do', 'Rudder trim centered by the 180', { ref: CH1('p. 1-30') }),
  ev('greens', T.app - POTATOES - 0.6, 'PF', 'do', 'Three green lights', { mark: 'The 180', ref: CH1('p. 1-31') }),
  ev('abeam', T.app - POTATOES, 'PM', 'say', `${RUNWAY.field} Tower, ${CALL_SIGN}, left 180, three down and locked, touch-and-go.`, { radio: true, ref: APPB }),
  ev('tower', T.app - POTATOES + 4.4, 'Tower', 'say', `${CALL_SIGN}, runway ${RUNWAY.number}, cleared for the option.`, { radio: true, generated: true }),
  ev('approachTurn', T.app, 'PF', 'do', 'Approach turn: reduce power, continuous descending, decelerating turn to final, 30° AOB maximum', { mark: 'Approach turn', ref: CH1('p. 1-32') }),
  ev('pptt', T.app + 0.5, 'PF', 'do', 'PPTTT, 26° AOB, 4 seconds up trim, stare at the PFD, about 250 ft-lbs', { technique: true }),
  ev('the90', appAlt(500), 'PF', 'say', 'Down and locked', { mark: 'The 90', note: '500 ft, 110 KIAS. Look at the runway now', technique: true }),
  ev('review', appAlt(300), 'PF', 'say', 'Props full forward, down and locked, review me complete.', { note: 'Props full forward at the same point each pass', ref: CH1('p. 1-32') }),
  ev('obsGreens', appAlt(300) + 2.4, 'OBS', 'do', 'Checks three green lights and props full forward', { ref: CH1('p. 1-30') }),
  ev('reviewed', appAlt(300) + 3.0, 'PM', 'say', 'Reviewed complete, cleared option.', { ref: CH1('p. 1-32') }),
  ev('final', T.fin, 'PF', 'do', 'Final: 250 ft, 105 KIAS, aim at the numbers, centerline between your legs', { mark: 'Final', ref: CH1('p. 1-32') }),
  ev('threshold', thresholdT, 'PF', 'do', 'Cross the threshold at 95 KIAS, slowly close the power levers, flare', { ref: CH1('p. 1-33') }),
].sort((a, b) => a.t - b.t);

// Map labels: where each mark falls.
export const MARKS = EVENTS.filter((e) => e.mark).map((e) => {
  const s = stateAt(e.t);
  return { id: e.id, label: e.mark, x: s.x, y: s.y };
});

// The whole ground track, for drawing.
export function track(step = 0.5) {
  const pts = [];
  for (let t = 0; t <= CYCLE; t += step) { const s = stateAt(Math.min(t, CYCLE - 1e-6)); pts.push([s.x, s.y]); }
  return pts;
}

// Every line spoken, by seat, for the voice recorder.
export function voiceLines() {
  return EVENTS.filter((e) => e.kind === 'say').map((e) => ({ seat: e.who, say: e.text }));
}

export const THRESHOLD_T = thresholdT;
