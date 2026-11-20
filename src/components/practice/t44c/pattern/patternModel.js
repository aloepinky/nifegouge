// The T-44C VFR landing pattern, flown by a model on a 5,000 ft runway (Cabaniss 13, left
// traffic, no wind), with the calls and the FTI's procedures at their places. Pure: no JSX.
//
// A racetrack (the user, 2026-11-19): two half circles a mile across (ME FTI §106 p. 1-31,
// "approximately one mile abeam"), joined by the downwind and the runway centerline. The
// crosswind turn begins about 1,000 ft past the departure end at exactly 500 ft, levelling
// there if the climb gets to 500 first (p. 1-36); it rolls out on downwind abeam the same
// point. The 180 is abeam the groove: the approach turn begins there and rolls out on
// centerline 1,200 ft from the threshold at 250 ft (p. 1-32). Bank is whatever that radius
// takes at the airspeed, about 23° at 120 KIAS.
//
// A pass is a chain of legs, each with its airspeed and altitude along it; time comes from
// flying each foot at its airspeed. Touchdown to rotate (about 6 s) and rotate to 300 ft
// (about 13 s) are the student's stopwatch times; 120 KIAS comes a few seconds after rotation.
//
// x runs down the runway in the landing direction from the threshold, y to the left of it
// (the pattern side), in feet. Altitudes are AGL.

const KT = 1.68781; // ft/s per knot
const G = 32.174;
const NM = 6076;

export const RUNWAY = { length: 5000, width: 150 };
// Every runway at Cabaniss and Navy Corpus, its traffic direction from the TW-4 course rules
// (Navy Corpus Ch. 1 §c(1), Cabaniss Ch. 3 §(b)). Ends from OpenStreetMap (Cabaniss 13/31,
// Navy Corpus 13L/31R) and OurAirports (the rest); every runway is drawn 5,000 ft, but 13R/31L
// at 8,000.
const STRIPS = [
  // field, name, two runway numbers, their traffic, their ends, length
  ['kngw', 'Cabaniss', ['13', '31'], ['left', 'right'], [[27.70632, -97.44268], [27.69676, -97.43199]], 5000],
  ['kngw', 'Cabaniss', ['18', '36'], ['left', 'right'], [[27.7106, -97.4403], [27.6972, -97.44]], 5000],
  ['kngp', 'Navy Corpus', ['13L', '31R'], ['left', 'right'], [[27.695234, -97.2921179], [27.6856223, -97.2813226]], 5000],
  ['kngp', 'Navy Corpus', ['13R', '31L'], ['right', 'left'], [[27.7007008, -97.3015976], [27.6851997, -97.2841034]], 8000],
  ['kngp', 'Navy Corpus', ['18', '36'], ['right', 'left'], [[27.6992, -97.2885], [27.6855, -97.2885]], 5000],
  ['kngp', 'Navy Corpus', ['4', '22'], ['left', 'right'], [[27.6900997, -97.2974014], [27.6998005, -97.286499]], 5000],
];
export const RUNWAYS = STRIPS.flatMap(([field, name, nums, sides, ends, length]) => [0, 1].map((i) => ({
  id: `${field}-${nums[i]}`, field, name, number: nums[i], reciprocal: nums[1 - i], side: sides[i],
  label: `${name} ${nums[i]}`, length, heading: parseInt(nums[i], 10) * 10,
  ends: i ? [ends[1], ends[0]] : ends,
})));
const RUNWAY_BY_ID = Object.fromEntries(RUNWAYS.map((r) => [r.id, r]));
export const DEFAULT_RUNWAY = 'kngw-13';
export const CALL_SIGN = 'MNTNA 12';
export const ABEAM = NM;
const R = NM / 2; // both turns
const CLIMB_FPM = 1400; // at 1000 ft-lbs, 120 KIAS, gear down, approach flaps (the user)
const TOUCHDOWN_X = 500;
const turnX = (length) => length + 1000; // the crosswind turn, 1,000 ft past the departure end
const TURN_X = turnX(RUNWAY.length);
const GROOVE_X = -1200; // the groove, and abeam it the 180
const WAVEOFF_X = GROOVE_X + (50 / 250) * (TOUCHDOWN_X - GROOVE_X); // 200 ft on the SSE final

export const SCENARIOS = [
  { id: 'break', label: 'Break' },
  { id: 'approach', label: 'Approach flap' },
  { id: 'noflap', label: 'No flap' },
  { id: 'full', label: 'Full flap' },
  { id: 'sse', label: 'Single engine (SSE)' },
  { id: 'case1', label: 'Case 1. Takeoff to crosswind' },
  { id: 'case2', label: 'Case 2. Crosswind turn' },
  { id: 'case3', label: 'Case 3. Downwind' },
  { id: 'case4', label: 'Case 4. Approach turn' },
  { id: 'case5', label: 'Case 5. After the 90' },
];

const FTI = (pages) => ({ work: 'ME FTI', loc: '§106 — Pattern Work', pages });
const APPB = (pages) => ({ work: 'ME FTI', loc: 'App. B — Typical Briefs and Voice Procedures', pages });
const APPF = (loc, pages) => ({ work: 'ME FTI', loc: `App. F — ${loc}`, pages });
const NATOPS_SEWO = { work: 'T-44C NATOPS', loc: 'Single-Engine Waveoff/Missed Approach' };
// Gear and flaps are called before they move (NATOPS §22.4.5), "Landing gear up" by both pilots
// (ME FTI p. 1-11).
const NATOPS_ALT = { work: 'T-44C NATOPS', loc: 'Ch. 15 — Alternate Prop Feathering', pages: 'p. 15.14-2' };
const GEAR_UP = { work: 'ME FTI', loc: '§103 — Departure and Arrival Transitions', pages: 'p. 1-11' };
const CONFIG = { work: 'T-44C NATOPS', loc: 'Ch. 22 — Configuration Change', pages: 'p. 22.4-2' };
const CALLOUTS = { work: 'T-44C NATOPS', loc: 'Figure 22.4-4 — General Callouts', pages: 'p. 22.4-9' };

// Piecewise-linear over a fraction: [[fraction, value], ...].
function lerp(points, u) {
  if (u <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [u1, v1] = points[i];
    const [u0, v0] = points[i - 1];
    if (u <= u1) return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0 || 1);
  }
  return points[points.length - 1][1];
}
const flat = (v) => [[0, v], [1, v]];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ---- The legs of each pass.

const UP2_FROM = TOUCHDOWN_X + 870 + 2480; // where 300 ft comes
// Case 1's height at the crosswind turn: 420 ft at the usual place, climbing on as it is held.
const up2Top = (caseN, xwAt, opts) => Math.min(700, 300 + (120 * ((opts.upwindX || xwAt) - UP2_FROM)) / (xwAt - UP2_FROM));

// `opts.upwindX`: Case 1 holds its crosswind turn there, the prop not yet feathered (ME FTI
// p. 1-38); `opts.dwExt`: the 180 delayed that many feet down the downwind, to finish the
// Landing Checklist (p. 1-36), the approach turn rolling out short of the groove.
function legs(id, length, opts = {}) {
  const xwAt = turnX(length);
  const ext = opts.dwExt || 0;
  const sse = id === 'sse';
  const caseN = id.startsWith('case') ? Number(id.slice(4)) : 0;
  const out = [];
  const L = (leg) => out.push(leg);

  if (sse) {
    // From the SSE wave-off at 200 ft on the last pass's final.
    // Climbing at 110 to 500 ft over the runway, then level there to the crosswind turn at
    // 120 KIAS (the user: 102 and 110 are climb speeds; level is 120, power as required).
    L({ id: 'waveoff', phase: 'SSE wave-off', line: 2600, kias: flat(110), alt: [[0, 200], [0.12, 192], [1, 350]] });
    L({ id: 'up2', phase: 'Upwind', toX: xwAt, kias: [[0, 110], [0.55, 110], [0.85, 120], [1, 120]], alt: [[0, 350], [0.55, 500], [1, 500]] });
  } else {
    L({ id: 'roll', phase: 'Touch-and-go', line: 870, kias: [[0, 90], [0.35, 82], [1, 91]], alt: flat(0) });
    // Rotate to 300 ft in 13 s, at 120 KIAS within a few seconds of rotating (the user: the
    // airplane gets there fast).
    L({ id: 'climb', phase: 'Upwind', line: 2480, kias: [[0, 91], [0.3, 120], [1, 120]], alt: [[0, 0], [0.08, 0], [1, 300]] });
    L({
      id: 'up2', phase: 'Upwind', toX: caseN === 1 && opts.upwindX ? opts.upwindX : xwAt,
      kias: caseN === 1 ? [[0, 120], [0.3, 104], [1, 110]] : flat(120),
      // 500 ft about 1,700 ft on, then level until the turn. On one engine a slow climb, the
      // same rate however long the upwind is held.
      alt: caseN === 1 ? [[0, 300], [1, up2Top(caseN, xwAt, opts)]] : [[0, 300], [0.8, 500], [1, 500]],
    });
  }
  // Climbing on one engine in the crosswind: 110 KIAS.
  const lost = sse || caseN === 1 || caseN === 2;
  const xwFrom = caseN === 1 ? up2Top(caseN, xwAt, opts) : 500;
  if (caseN === 2) {
    // Roll wings level to analyse, then continue the turn, a little tighter, to a mile abeam,
    // climbing at 110 to 800 ft, then level at 120.
    L({ id: 'xw1', phase: 'Crosswind', arc: R, angle: Math.PI / 4, kias: [[0, 120], [1, 116]], alt: [[0, 500], [1, 560]] });
    L({ id: 'xwLevel', phase: 'Crosswind', line: 1100, kias: [[0, 116], [1, 110]], alt: [[0, 560], [1, 590]] });
    L({ id: 'xw1b', phase: 'Crosswind', arcToY: ABEAM, kias: [[0, 110], [0.6, 110], [1, 120]], alt: [[0, 590], [0.6, 800], [1, 800]] });
  } else {
    // Two engines: 1000 ft-lbs climbs a steady 1400 ft/min (the user's figures; NATOPS has no
    // gear-down, approach-flap climb chart), level at 800 ft well before the downwind. One
    // engine climbs slower.
    const level = (((800 - xwFrom) / CLIMB_FPM) * 60 * 120 * KT) / (R * Math.PI);
    // On one engine: 110 climbing, then level at 800 and back to 120.
    const xwKias = sse ? [[0, 120], [0.08, 110], [0.7, 110], [0.95, 120], [1, 120]] : lost ? [[0, 110], [0.7, 110], [0.95, 120], [1, 120]] : flat(120);
    L({ id: 'xw1', phase: 'Crosswind', arc: R, angle: Math.PI, kias: xwKias, alt: lost ? [[0, xwFrom], [0.7, 800], [1, 800]] : [[0, xwFrom], [level, 800], [1, 800]] });
  }
  L({ id: 'dw', phase: 'Downwind', toX: GROOVE_X - ext, kias: flat(120), alt: flat(800) });
  // The approach turn: the 90 at 500 ft and 110 KIAS, the groove at 250 ft. On one engine 110
  // minimum to the threshold; without flaps, final at 110 and the threshold at 105.
  const single = sse || caseN >= 1;
  const finalK = single || id === 'noflap' ? 110 : 105;
  const crossK = single ? 110 : id === 'noflap' ? 105 : 95;
  // Rolled out short of the groove, it descends along the final at the final's slope.
  const rolled = ext ? Math.min(400, 250 + ext * (230 / 1200)) : 250;
  L({ id: 'app', phase: 'Approach turn', arc: R, angle: Math.PI, kias: [[0, 120], [0.5, 110], [1, finalK]], alt: [[0, 800], [0.5, 500], [1, rolled]] });
  if (ext) L({ id: 'final0', phase: 'Final', toX: GROOVE_X, kias: flat(finalK), alt: [[0, rolled], [1, 250]] });
  const toThreshold = (0 - GROOVE_X) / (TOUCHDOWN_X - GROOVE_X);
  if (sse) L({ id: 'final', phase: 'Final', toX: WAVEOFF_X, kias: flat(110), alt: [[0, 250], [1, 200]] });
  else L({ id: 'final', phase: 'Final', toX: TOUCHDOWN_X, kias: [[0, finalK], [toThreshold, crossK], [1, crossK - 5]], alt: [[0, 250], [toThreshold, 20], [1, 0]] });
  if (caseN) L({ id: 'rollout', phase: 'SSE full stop', line: 2600, kias: [[0, 105], [1, 12]], alt: flat(0) });
  return out;
}

// Fly the legs: a sample every few feet with its time, place, track and figures.
function fly(spec, x0, y0 = 0) {
  const step = 6;
  const pts = [];
  let x = x0;
  let y = y0;
  let psi = 0;
  let t = 0;
  const seg = {};
  for (const leg of spec) {
    let len;
    if (leg.spiral !== undefined) {
      // The break: a level left turn to the reciprocal at one bank angle while the speed bleeds
      // off, so the radius shrinks with the square of the speed; the bank is the one that rolls
      // out at the given y (the FTI: adjust AOB to roll out about a mile abeam). Its profiles run
      // over the heading turned.
      const n = 360;
      const dpsi = Math.PI / n;
      const v2 = (f) => (lerp(leg.kias, f) * KT) ** 2;
      let reach = 0;
      for (let i = 0; i < n; i += 1) reach += v2((i + 0.5) / n) * Math.sin(psi + (i + 0.5) * dpsi) * dpsi;
      const k = (leg.spiral - y) / reach;
      seg[leg.id] = { start: Math.max(0, pts.length - 1) };
      for (let i = 0; i <= n; i += 1) {
        const f = i / n;
        if (i > 0) {
          const ds = k * v2((i - 0.5) / n) * dpsi;
          t += ds / (((lerp(leg.kias, f) + lerp(leg.kias, (i - 1) / n)) / 2) * KT);
          const mid = psi + dpsi / 2;
          x += Math.cos(mid) * ds;
          y += Math.sin(mid) * ds;
          psi += dpsi;
        }
        if (i === 0 && pts.length) continue;
        pts.push({ t, x, y, psi, kias: lerp(leg.kias, f), alt: lerp(leg.alt, f), leg: leg.id, phase: leg.phase, f, r: k * v2(f) });
      }
      seg[leg.id].end = pts.length - 1;
      continue;
    }
    if (leg.arcToY !== undefined) {
      // A left turn on to the downwind heading, its radius set so it rolls out at that y.
      leg.angle = Math.PI - psi;
      leg.arc = (leg.arcToY - y) / (1 + Math.cos(psi));
    }
    if (leg.line) len = leg.line;
    else if (leg.arc) len = leg.arc * leg.angle;
    else if (leg.toX !== undefined) len = Math.abs(leg.toX - x);
    else len = Math.abs(leg.toY - y);
    const n = Math.max(1, Math.round(len / step));
    const ds = len / n;
    seg[leg.id] = { start: Math.max(0, pts.length - 1) };
    for (let i = 0; i <= n; i += 1) {
      const f = i / n;
      const kias = lerp(leg.kias, f);
      if (i > 0) {
        const vPrev = lerp(leg.kias, (i - 1) / n);
        t += ds / (((kias + vPrev) / 2) * KT);
        if (leg.arc) {
          const dpsi = ds / leg.arc;
          const mid = psi + dpsi / 2;
          x += Math.cos(mid) * ds;
          y += Math.sin(mid) * ds;
          psi += dpsi;
        } else {
          x += Math.cos(psi) * ds;
          y += Math.sin(psi) * ds;
        }
      }
      if (i === 0 && pts.length) continue; // the joint is the last leg's end
      pts.push({ t, x, y, psi, kias, alt: lerp(leg.alt, f), leg: leg.id, phase: leg.phase, f, r: leg.arc || 0 });
    }
    seg[leg.id].end = pts.length - 1;
  }
  // Bank for each turn's radius at its speed, eased in and out over two seconds.
  const raw = pts.map((p) => (p.r ? (Math.atan(((p.kias * KT) ** 2) / (G * p.r)) * 180) / Math.PI : 0));
  let lo = 0;
  let hi = 0;
  let sum = 0;
  pts.forEach((p) => {
    while (hi < pts.length && pts[hi].t <= p.t + 1) { sum += raw[hi]; hi += 1; }
    while (pts[lo].t < p.t - 1) { sum -= raw[lo]; lo += 1; }
    p.aob = sum / (hi - lo);
  });
  return { pts, seg, duration: t };
}

// Pitch: the flight path angle plus an angle of attack. The attack angle is 2° at 150 KIAS
// clean, from the user's BI pattern gouge (straight and level at 650 ft-lbs +2°, climbing 500
// ft/min +3°, descending 800 ft/min -1°: each about 2° above the flight path), growing as the
// square of the slowing and with bank. The flaps' share is an estimate (no source gives it):
// 1° less with approach flaps, 2° with full. It puts the 1400 ft/min climb at about 9° nose
// up, inside the FTI's 7-10° (p. 1-35).
const FLARE_PITCH = 7;
const FLARE_FROM = 60;
function pitchOf({ leg, f, alt, kias, vsi, aob, flaps }) {
  // Touchdown in a takeoff attitude, 7° nose up (the user), then the nose lowered to the runway.
  if (leg === 'roll' || leg === 'rollout') return Math.max(0, 1 - f / 0.2) * FLARE_PITCH;
  if (leg === 'climb' && alt <= 0) return Math.min(1, f / 0.08) * 7; // rotating
  const v = kias * KT;
  const gamma = (Math.atan2(vsi / 60, v) * 180) / Math.PI;
  const flapsOff = flaps === 'Down' ? 2 : flaps === 'Approach' ? 1 : 0;
  const alpha = 2 * (150 / kias) ** 2 / Math.cos((aob * Math.PI) / 180) - flapsOff;
  const pitch = gamma + alpha;
  // The flare: from 60 ft the nose comes up to the takeoff attitude by touchdown.
  if (leg === 'final' && alt < FLARE_FROM) {
    const k = 1 - alt / FLARE_FROM;
    return pitch + (FLARE_PITCH - pitch) * k;
  }
  return pitch;
}

function find(pts, t) {
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].t <= t) lo = m; else hi = m; }
  const a = pts[lo];
  const b = pts[hi];
  return [a, b, b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0];
}

// Where the aircraft is and how it is set up at a time, from its flown samples and the events
// that change its configuration.
function stateFn(pts, duration, init, events, runway) {
  const turning = runway.side === 'left' ? -1 : 1;
  const changes = events.filter((x) => x.set);
  const configAt = (t) => {
    const c = { ...init };
    for (const x of changes) { if (x.t > t) break; Object.assign(c, x.set); }
    return c;
  };
  const altAt = (t) => { const [a, b, k] = find(pts, t); return a.alt + (b.alt - a.alt) * k; };
  return (time) => {
    const t = Math.max(0, Math.min(duration, time));
    const [a, b, k] = find(pts, t);
    const mix = (p) => a[p] + (b[p] - a[p]) * k;
    const psi = mix('psi');
    const t0 = Math.max(0, t - 0.3);
    const t1 = Math.min(duration, t + 0.3);
    const vsi = t1 > t0 ? ((altAt(t1) - altAt(t0)) / (t1 - t0)) * 60 : 0;
    const config = configAt(t);
    const kias = mix('kias');
    const aob = mix('aob');
    return {
      t, x: mix('x'), y: mix('y'), psi, alt: mix('alt'), kias, aob,
      hdg: ((runway.heading + (turning * psi * 180) / Math.PI) % 360 + 360) % 360,
      vsi,
      pitch: pitchOf({ leg: a.leg, f: a.f, alt: mix('alt'), kias, vsi, aob, flaps: config.flaps }),
      phase: a.phase,
      ...config,
    };
  };
}

// The Landing Checklist as the crew says it (ME FTI App. F), with the gear lowered first when
// it is still up.
function landingChecklist(flapsWord, gearDown) {
  return [
    ['PF', gearDown ? 'Speed checks, landing gear down, Landing Checklist' : 'Landing Checklist'],
    ...(gearDown ? [['PM', 'Speed checks, landing gear down', { gear: 'Down' }]] : []),
    ['PM', 'Flaps'], ['PF', flapsWord], ['PM', flapsWord],
    ['PM', 'Landing Gear'], ['PF', 'Down, locked'], ['PM', 'Down, locked'],
    ['PM', 'Lights'], ['PF', 'Set'],
    ['PM', 'Landing Checklist complete'],
  ];
}

// ---- A pass: where the aircraft is, and what is said and done, by time.

// What the Cases' checks turn out to be: the prop feathers or not, and the fire or fuel leak
// question; drawn by the page for each pass, this when none is given.
export const PLAIN = { feather: true, leak: 'none' };
export const drawCase = (rand = Math.random) => {
  const r = rand();
  return { feather: rand() >= 0.25, leak: r < 0.25 ? 'fire' : r < 0.5 ? 'fuel' : 'none' };
};

// A pass is flown, its calls laid on it, and flown again where they need more room: the
// crosswind turn held until the prop is feathered, the 180 delayed for the Landing Checklist.
export function buildPass(id, engine = 'left', runwayId = DEFAULT_RUNWAY, draw = PLAIN) {
  let opts = {};
  let p = passCore(id, engine, runwayId, draw, opts);
  for (let i = 0; i < 4 && p.needs; i += 1) {
    opts = p.needs;
    p = passCore(id, engine, runwayId, draw, opts);
  }
  // The 180 delayed only as far as it must be, a little at a time.
  for (let ext = 400; p.late && ext <= 12000; ext += 400) p = passCore(id, engine, runwayId, draw, { ...opts, dwExt: ext });
  return p;
}

function passCore(id, engine, runwayId, draw, opts) {
  const field = RUNWAY_BY_ID[runwayId];
  const side = field.side;
  const other = side === 'left' ? 'right' : 'left';
  const { pts, seg, duration } = fly(legs(id, field.length, opts), id === 'sse' ? WAVEOFF_X : TOUCHDOWN_X);
  const sse = id === 'sse';
  const caseN = id.startsWith('case') ? Number(id.slice(4)) : 0;
  const single = sse || caseN > 0;
  const e = engine;
  const E = cap(e);
  const good = e === 'left' ? 'right' : 'left';

  // A leg's own samples (its first point is the last leg's end).
  const leg = (legId) => pts.slice(seg[legId].start, seg[legId].end + 1).filter((p, i) => i > 0 || p.leg === legId);
  const start = (legId) => pts[seg[legId].start].t;
  const atF = (legId, f) => (leg(legId).find((p) => p.f >= f) || pts[seg[legId].end]).t;
  const atAlt = (legId, a) => {
    const ps = leg(legId);
    const up = ps[ps.length - 1].alt >= ps[0].alt;
    return (ps.find((p) => (up ? p.alt >= a : p.alt <= a)) || ps[ps.length - 1]).t;
  };
  const atX = (legId, x) => {
    const ps = leg(legId);
    const dir = Math.sign(ps[ps.length - 1].x - ps[0].x);
    return (ps.find((p) => (p.x - x) * dir >= 0) || ps[ps.length - 1]).t;
  };

  // The user's torques are for the approach-flap pattern; with no flaps or full flaps the
  // power is different, so those patterns show none (the user, 2026-11-19).
  const torques = !(id === 'noflap' || id === 'full');
  const tq = (v) => (torques ? v : 'As required');
  const back = torques ? 'power back to 600 ft-lbs for 120 KIAS' : 'power back for 120 KIAS';
  const events = [];
  const add = (t, who, kind, text, extra = {}) => events.push({ t, who, kind, text, ...extra });
  const marks = [];
  const mark = (t, label, key) => marks.push({ t, label, key });

  const init = {
    flaps: id === 'noflap' ? 'Up' : id === 'full' ? 'Down' : 'Approach',
    gear: 'Down',
    props: 'Full forward',
    power: sse ? 'Max continuous' : 'Idle',
    engines: sse ? `${E}: zero thrust (simulated feather)` : 'Both',
  };

  // The 180 call and Tower's answer, kept clear of any checklist running past it.
  let quiet = null;
  const checklist = (t0, flapsWord, gearDown) => {
    let t = t0;
    landingChecklist(flapsWord, gearDown).forEach(([who, text, set]) => {
      if (quiet && t > quiet[0] - 1 && t < quiet[1]) t = quiet[1];
      add(t, who, 'say', text, { ref: APPF('Landing Checklist', 'p. F-24'), ...(set ? { set } : {}) });
      t += 1.7;
    });
    return t;
  };
  // After the first three items: `check`, the FTI's hold, the props to 1900 and the two
  // questions (ME FTI pp. 1-26 and 1-38; the questions as crews ask them), then on; `hold`, the
  // rest left for later (Cases 4 and 5: on deck or after a wave-off).
  let featherT = 0; // when the prop is known feathered
  const shutdown = (t0, { after } = {}) => {
    let t = t0;
    const say = (dt, who, text, set) => {
      t += dt;
      add(t, who, 'say', text, { ref: APPF('Emergency Engine Shutdown Checklist', 'p. F-29'), ...(set ? { set } : {}) });
    };
    say(0, 'PF', `This will be an emergency shutdown of the ${e} engine.`);
    say(2.6, 'PF', `${E} Power lever – Idle, concur?`);
    say(1.6, 'PM', 'Concur');
    say(1.1, 'PF', `${E} Propeller – Feather, concur?`);
    say(1.8, 'PM', 'Simulate', { engines: after === 'check' && !draw.feather ? `${E}: failed, prop windmilling (simulated)` : `${E}: zero thrust (simulated feather)` });
    say(1.1, 'PF', `${E} Condition lever – Fuel Cutoff concur?`);
    say(1.8, 'PM', 'Simulate');
    if (after === 'check') {
      // The PF's questions and calls in the on-wing gouge's words (no tag: the user, 2026-11-19);
      // the PM's answers, which no publication prints, are generated. What is done, from the FTI
      // and NATOPS.
      const tq2 = (dt, who, text, extra = {}) => { t += dt; add(t, who, 'say', text, { ...(who === 'PM' ? { generated: true } : {}), ...extra }); };
      add(t + 0.4, 'PF', 'do', 'Hold the checklist momentarily: props 1900 RPM, reset maximum power, check to see if the prop feathered', { ref: FTI('p. 1-38'), set: { props: '1900 RPM' } });
      tq2(1.2, 'PF', 'Did the prop feather?');
      if (draw.feather) tq2(1.2, 'PM', 'Yes.');
      else {
        tq2(1.2, 'PM', 'No.');
        tq2(1.2, 'PF', 'Alternate prop feathering checklist.');
        add(t + 0.2, 'PF', 'do', `Alternate Prop Feathering: condition lever (${e}) FUEL CUTOFF, at least 500 ft-lbs on the ${good} engine, autofeather switch held in TEST until the prop feathers (LS)`, { ref: NATOPS_ALT });
        tq2(4.5, 'PM', 'Prop feathered.', { set: { engines: `${E}: zero thrust (simulated feather)` } });
      }
      featherT = t;
      tq2(1.2, 'PF', 'Is it a fire or fuel leak?');
      if (draw.leak === 'none') {
        tq2(1.2, 'PM', 'No.');
        add(t + 0.2, 'PF', 'do', 'No fire or fuel leak: declare an emergency and continue the Emergency Shutdown Checklist as time permits', { ref: FTI('p. 1-26') });
      } else {
        tq2(1.2, 'PM', draw.leak === 'fire' ? 'Yes, fire.' : 'Yes, fuel leak.');
        add(t + 0.2, 'PF', 'do', 'Fire or fuel leak: continue the Emergency Shutdown Checklist with steps 4-6', { ref: FTI('p. 1-26') });
        const f1 = (dt, who, text) => { t += dt; add(t, who, 'say', text, { ref: APPF('Emergency Engine Shutdown Checklist', 'p. F-29') }); };
        f1(1.2, 'PF', `${E} firewall valve closed, concur?`);
        f1(1.8, 'PM', 'Simulate');
        // The PF in the left seat runs the left extinguisher; the right one is the PM's.
        const fire = draw.leak === 'fire';
        if (e === 'left') {
          f1(1.2, 'PF', fire ? 'Left fire extinguisher discharge, concur?' : 'Left fire extinguisher not required, concur?');
          f1(1.8, 'PM', fire ? 'Simulate' : 'Concur');
        } else if (fire) {
          f1(1.2, 'PF', 'Discharge right fire extinguisher.');
          f1(1.4, 'PM', 'Right fire extinguisher discharge, concur?');
          f1(1.6, 'PF', 'Concur');
        } else {
          f1(1.2, 'PF', 'Right fire extinguisher not required, concur?');
          f1(1.8, 'PM', 'Concur');
        }
        f1(1.2, 'PF', `Close ${e} bleed air valve`);
        f1(1.4, 'PM', `${E} bleed air valve closed, concur?`);
        f1(1.6, 'PF', 'Concur');
      }
      tq2(1.2, 'PF', 'Declare an emergency.');
    }
    return t;
  };
  let busyUntil = 0;
  const needs = { ...opts };
  let late = false; // the Landing Checklist not done by the 90
  const failure = (t0) => {
    mark(t0, 'Engine failure', 'fail');
    add(t0, 'PM', 'do', `Simulates a ${e} engine failure`, { set: { engines: `${E}: failed (simulated)` } });
  };

  // ---- Off the runway, or off the last final.
  if (sse) {
    mark(0, 'SSE wave-off (200 ft AGL)', 'waveoff');
    add(0, 'PF', 'do', 'Power max continuous, positive rate of climb, VXSE minimum', { ref: NATOPS_SEWO });
    add(1.2, 'PF', 'do', 'Flaps approach (unless already up)', { ref: NATOPS_SEWO });
    add(2.6, 'PM', 'say', 'Landing gear up', { ref: FTI('p. 1-42'), set: { gear: 'Up' } });
    add(4.4, 'PF', 'do', 'Flaps up', { ref: NATOPS_SEWO, set: { flaps: 'Up' } });
    add(5.6, 'PF', 'do', 'Props 1900 RPM', { ref: NATOPS_SEWO, set: { props: '1900 RPM' } });
    add(7.2, 'PF', 'do', 'Offset slightly to the pattern side, 102-110 KIAS', { ref: FTI('p. 1-42') });
  } else {
    mark(0, 'Touchdown', 'touchdown');
    add(0, 'PF', 'do', 'Touchdown, main mounts first, power levers at idle', { ref: FTI('p. 1-34') });
    add(0.7, 'PF', 'say', 'Reset Flaps and Trim', { ref: FTI('p. 1-35') });
    add(1.0, 'PF', 'do', "Power levers to 12 o'clock", { ref: FTI('p. 1-35'), set: { power: "12 o'clock" } });
    add(1.6, 'PM', 'say', 'Flaps', { ref: FTI('p. 1-35'), set: { flaps: 'Up' } });
    add(2.7, 'PM', 'say', 'Trim', { ref: FTI('p. 1-35') });
    add(3.9, 'PM', 'say', 'Go', { ref: FTI('p. 1-35') });
    add(4.2, 'PF', 'do', 'Takeoff power, 1000 ft-lbs minimum', { ref: FTI('p. 1-35'), set: { power: 'Takeoff' } });
    mark(start('climb'), 'Rotate', 'rotate');
    add(start('climb'), 'PM', 'say', 'Rotate', { ref: FTI('p. 1-35') });
    const t300 = start('up2');
    mark(t300, 'Props 1900 (300 ft AGL)', 'p300');
    if (caseN === 1) {
      failure(t300);
      add(t300 + 0.8, 'PF', 'do', 'Power up, rudder up, clean up', { ref: APPF('Emergency Procedures', 'p. F-28'), set: { power: 'Max' } });
      // The memory items of Engine Failure After Takeoff (NATOPS §14.3), said as what is set, in
      // the on-wing gouge's words (the user, 2026-11-19: NATOPS says what to do, not what to say).
      add(t300 + 1.0, 'PF', 'say', 'Power max allowable, landing gear up, airspeed 102.', {});
      add(t300 + 4.2, 'PM', 'say', 'Landing gear up', { ref: GEAR_UP, set: { gear: 'Up' } });
      add(t300 + 4.4, 'PF', 'do', 'At 102 KIAS raise the nose, accelerate to 110, 5° bank into the good engine', { ref: FTI('p. 1-38') });
      busyUntil = shutdown(t300 + 5.2, { after: 'check' }) + 1.4;
    } else {
      add(t300, 'PF', 'do', 'Takeoff power still set, props 1900 RPM', { ref: FTI('p. 1-35'), set: { props: '1900 RPM' } });
      const t400 = atAlt('up2', 400);
      add(t400, 'PF', 'say', `Clear ${side}, going ${side}`, { technique: true });
      add(t400 + 1.4, 'PM', 'say', `Clear ${other}`, { ref: FTI('p. 1-31') });
      add(atAlt('up2', 500), 'PF', 'do', `Level at 500 ft until the crosswind turn: ${back}`, { ref: FTI('p. 1-36'), set: { power: tq('600 ft-lbs') } });
    }
  }
  const txw = start('xw1');
  // Case 1 turns once the prop is feathered: the upwind held until then.
  if (caseN === 1 && featherT > txw - 0.5) {
    const at = pts[seg.xw1.start];
    needs.upwindX = at.x + (featherT - txw + 1) * at.kias * KT;
  }
  mark(txw, 'Crosswind', 'crosswind');
  if (!single || caseN >= 2) add(txw, 'PF', 'do', 'Crosswind turn at 500 ft, 1,000 ft past the departure end, 120 KIAS', { ref: FTI('p. 1-31'), set: { power: tq('1000 ft-lbs') } });
  else add(txw, 'PF', 'do', 'Once the prop has feathered, with proper downwind interval, crosswind turn at 300 ft AGL or above, climbing at 110 KIAS', { ref: FTI('p. 1-38'), set: { power: 'Max continuous' } });
  // On one engine: climb to pattern altitude, then accelerate to 120 KIAS and reduce power.
  if (sse || caseN === 1 || caseN === 2) {
    const climbLeg = caseN === 2 ? 'xw1b' : 'xw1';
    add(atAlt(climbLeg, 800), 'PF', 'do', 'Pattern altitude, then accelerate to 120 KIAS, power as required', { ref: FTI('p. 1-38'), set: { power: 'As required' } });
  }
  if (sse) add(atAlt('up2', 500), 'PF', 'do', 'Level at 500 ft until the crosswind turn: 120 KIAS, power as required', { ref: FTI('p. 1-36'), set: { power: 'As required' } });

  // Level at 800 ft in the crosswind turn, power back for 120 KIAS.
  if (!(sse || caseN === 1 || caseN === 2)) {
    add(atAlt('xw1', 800), 'PF', 'do', `Level at 800 ft: ${back}`, { ref: FTI('p. 1-31'), set: { power: tq('600 ft-lbs') } });
  }

  // ---- Passing 600 ft: flaps approach and the Landing Checklist (gear already down).
  if (!sse && caseN !== 1 && caseN !== 2) {
    const t600 = atAlt('xw1', 600);
    if (id === 'noflap') {
      add(t600, 'PF', 'do', 'Passing 600 ft: flaps stay up', { ref: FTI('p. 1-31') });
      checklist(t600 + 1, 'Up');
    } else {
      add(t600, 'PF', 'say', 'Speed checks, flaps approach', { ref: APPF('Landing Checklist', 'p. F-24') });
      add(t600 + 1.4, 'PM', 'say', 'Speed checks, flaps approach', { ref: CONFIG, set: { flaps: 'Approach' } });
      checklist(t600 + 2.8, 'Approach');
    }
  }
  if (caseN === 2) {
    const t0 = start('xwLevel');
    failure(t0 - 0.6);
    add(t0, 'PF', 'do', 'Roll wings level to analyse', { ref: FTI('p. 1-39') });
    add(t0 + 1.2, 'PF', 'do', 'Power up, rudder up, clean up', { ref: APPF('Emergency Procedures', 'p. F-28'), set: { power: 'Max' } });
    add(t0 + 1.6, 'PF', 'say', 'Landing gear up, flaps up.', {});
    add(t0 + 2.8, 'PM', 'say', 'Landing gear up', { ref: GEAR_UP, set: { gear: 'Up' } });
    add(t0 + 3, 'PF', 'do', 'Nearly center the ball (¼ to ½ out toward the good engine), 102 KIAS minimum, 110 VYSE. Continue the turn', { ref: FTI('p. 1-39') });
    busyUntil = shutdown(start('xw1b') + 1, { after: 'check' }) + 1.4;
    add(busyUntil - 0.4, 'PF', 'do', 'Climb to pattern altitude, then 120 KIAS', { ref: FTI('p. 1-39') });
  }

  // ---- Downwind.
  const tdw = start('dw');
  mark(tdw, 'Downwind', 'downwind');
  if (sse || caseN === 1 || caseN === 2) add(tdw, 'PF', 'do', 'Downwind: 800 ft, 120 KIAS, about a mile abeam', { ref: FTI('p. 1-31') });
  else {
    add(tdw, 'PF', 'do', 'Downwind: 800 ft, 120 KIAS, trimmed, about a mile abeam', { ref: FTI('p. 1-31') });
    add(tdw + 7, 'PF', 'do', 'Rudder trim centered by the 180', { ref: FTI('p. 1-30') });
  }
  const t180 = start('app'); // abeam the groove
  quiet = [t180 - 0.4, t180 + 12.6];
  if (caseN === 3) {
    const t0 = tdw + 0.5;
    failure(t0);
    add(t0 + 0.8, 'PF', 'do', 'Power on the good engine, nearly center the ball, 120 KIAS and pattern altitude', { ref: FTI('p. 1-39'), set: { power: 'As required' } });
    add(t0 + 2.4, 'PF', 'do', 'Short of midfield: clean up, gear and flaps up', { ref: FTI('p. 1-39') });
    add(t0 + 2.6, 'PF', 'say', 'Landing gear up, flaps up', { ref: CONFIG });
    add(t0 + 3.8, 'PM', 'say', 'Landing gear up, flaps up', { ref: CONFIG, set: { gear: 'Up', flaps: 'Up' } });
    busyUntil = shutdown(t0 + 4, { after: 'check' }) + 1.4;
    add(busyUntil - 0.8, 'PF', 'do', 'Landing Checklist complete no later than the 90, 110 KIAS minimum to the 90', { ref: FTI('p. 1-40') });
  }
  // On one engine, approaching the 180: flaps approach, gear down, Landing Checklist; and
  // before it, the SSE full-stop brief.
  if (sse || caseN === 1 || caseN === 2 || caseN === 3) {
    let briefEnd = 0;
    if (caseN === 1 || caseN === 2) {
      // Gone from the screen at the next call (the user: the boxes have no room for both).
      const tb = Math.max(t180 - 38, busyUntil);
      add(tb, 'PF', 'say', `Once safely on the deck, I will bring both power levers over the detent, reversing with the ${good} engine, maintaining centerline with opposite rudder and aileron and forward yoke pressure. If rudder effectiveness is lost, I will bring both power levers toward flight idle.`, { ref: APPB('p. B-10'), hold: 13, yields: true });
      briefEnd = tb + 13;
    }
    const tc = Math.max(t180 - 22, busyUntil, briefEnd);
    add(tc, 'PF', 'say', 'Speed checks, flaps approach', { ref: FTI('p. 1-41') });
    add(tc + 1.4, 'PM', 'say', 'Speed checks, flaps approach', { ref: CONFIG, set: { flaps: 'Approach' } });
    // The Landing Checklist may run into the approach turn but is done by the 90 (ME FTI
    // p. 1-40); only when it cannot be is the 180 delayed (p. 1-36), the exception, since the
    // pattern is shared with other traffic (the user, 2026-11-19).
    const done = checklist(tc + 3, 'Approach', true) - 1.7;
    if (done > atF('app', 0.5) - 2) late = true;
  }

  // ---- The 180 and the approach turn.
  const intent = sse ? 'low approach' : caseN ? 'full-stop' : 'touch-and-go';
  const cleared = sse ? 'low approach' : caseN ? 'full-stop' : 'option';
  const tower = sse ? 'cleared low approach' : caseN ? 'cleared to land' : 'cleared for the option';
  mark(t180, 'The 180', 'the180');
  add(t180 - 0.4, 'PF', 'do', 'Three green lights', { ref: FTI('p. 1-31') });
  add(t180, 'PM', 'say', `${field.name} Tower, ${CALL_SIGN}, ${side} 180, three down and locked, ${intent}.`, { radio: true, ref: APPB('p. B-4') });
  add(t180 + 4.8, 'Tower', 'say', `${CALL_SIGN}, runway ${field.number}, ${tower}.`, { radio: true, generated: true });
  // Every clearance is read back by the PM and confirmed by the PF (NATOPS: ATC clearance).
  const readback = sse ? 'Cleared low approach' : caseN ? 'Cleared to land' : 'Cleared for the option';
  add(t180 + 8.4, 'PM', 'say', `${readback}, runway ${field.number}, ${CALL_SIGN}.`, { radio: true, generated: true, ref: CALLOUTS });
  add(t180 + 11.4, 'PF', 'say', `${readback}.`, { generated: true, ref: CALLOUTS });
  const tTurn = t180 + 0.3;
  const oneEngineTurn = sse || (caseN >= 1 && caseN <= 3);
  if (oneEngineTurn) add(tTurn, 'PF', 'do', 'Approach turn: 110 KIAS minimum to the 90', { ref: FTI('p. 1-40'), set: { power: 'As required' } });
  else {
    add(tTurn, 'PF', 'do', 'Approach turn: reduce power, continuous descending, decelerating turn to the groove', { ref: FTI('p. 1-32'), set: { power: tq('~250 ft-lbs') } });
  }
  let case4End = 0;
  if (caseN === 4) {
    const t0 = Math.max(atF('app', 0.12), t180 + 12.6); // after the clearance is read back
    failure(t0);
    add(t0 + 0.8, 'PF', 'do', 'Power on the good engine, 110 KIAS minimum, nearly center the ball, continue the turn. Gear stays down', { ref: FTI('p. 1-40'), set: { power: 'As required' } });
    case4End = shutdown(t0 + 3);
  }

  const t90 = atF('app', 0.5);
  mark(t90, 'The 90', 'the90');
  // The 500 ft aural tone (radar altimeter minimums set to 500 ft for pattern work).
  // Answered once the shutdown items in progress are said (Case 4).
  const tDL = Math.max(t90, case4End);
  add(tDL, 'PF', 'say', 'Down and locked', { ref: CALLOUTS, note: '500 ft tone' });
  add(tDL + 1.4, 'PM', 'say', 'Down and locked', { ref: CALLOUTS });
  if (id === 'full') add(t90 + 1.6, 'PF', 'do', 'Select flaps down after the 90, but before rolling onto final', { ref: FTI('p. 1-34'), set: { flaps: 'Down' } });
  if (caseN === 5) {
    const t0 = t90 + 2;
    failure(t0);
    add(t0 + 0.8, 'PF', 'do', 'Slight power on the good engine, 110 KIAS to the threshold, aircraft control first', { ref: FTI('p. 1-40'), set: { power: 'As required' } });
    busyUntil = shutdown(t0 + 2.6) + 1.4;
  }
  const tReview = Math.max(seg.final0 ? atAlt('final0', 300) : atAlt('app', 300), busyUntil);
  add(tReview, 'PF', 'say', 'Props full forward, down and locked, review me complete.', { ref: FTI('p. 1-32'), set: { props: 'Full forward' } });
  add(tReview + 3.4, 'PM', 'say', `Reviewed complete, cleared ${cleared}.`, { ref: FTI('p. 1-32') });

  // ---- Final.
  const tFinal = start('final');
  mark(tFinal, 'The groove', 'groove');
  const finalK = single || id === 'noflap' ? 110 : 105;
  const crossK = single ? 110 : id === 'noflap' ? 105 : 95;
  add(tFinal, 'PF', 'do', `The groove: 250 ft, ${finalK} KIAS, 1,200 ft from the threshold, aim at the numbers`, { ref: FTI(single ? 'p. 1-41' : id === 'noflap' ? 'p. 1-33' : 'p. 1-32'), set: { power: 'As required' } });
  if (!sse) mark(atX('final', 0), 'Threshold', 'threshold');
  if (!sse) add(atX('final', 0), 'PF', 'do', `Cross the threshold at ${crossK} KIAS, slowly close the power levers, flare`, { ref: FTI(single ? 'p. 1-41' : 'p. 1-33'), set: { power: 'Closing to idle' } });
  if (caseN) {
    const tr = start('rollout');
    mark(duration, 'SSE full stop', 'fullstop');
    add(tr, 'PF', 'do', 'Power levers idle, both over the detent', { ref: FTI('p. 1-41'), set: { power: 'Idle' } });
    add(tr + 1.5, 'PF', 'do', `Slowly ease the ${good} engine into reverse. Rudder for yaw, brakes and power for centerline`, { ref: FTI('p. 1-41'), set: { power: 'Reverse' } });
    add(tr + 4.5, 'PF', 'do', `Yoke full forward, aileron into the ${e} engine, to a slow taxi`, { ref: FTI('p. 1-41') });
  }

  events.sort((a, b) => a.t - b.t);
  const stateAt = stateFn(pts, duration, init, events, field);

  const placed = marks.map((m) => { const s = stateAt(m.t); return { ...m, x: s.x, y: s.y }; });
  const track = pts.filter((_, i) => i % 6 === 0 || i === pts.length - 1).map((p) => [p.x, p.y]);
  // The speeds to remember at each mark, and which differ from the approach-flap pattern's.
  const speeds = {
    rotate: { kias: 91 },
    crosswind: { kias: single ? 110 : 120, differs: single },
    downwind: { kias: 120 },
    the90: { kias: 110, note: id === 'full' ? 'Flaps - Down' : null, differs: id === 'full' },
    groove: { kias: finalK, differs: finalK !== 105 },
    threshold: { kias: crossK, differs: crossK !== 95 },
  };
  return {
    id, engine, field, duration, events, marks: placed, track, stateAt, speeds, torques,
    // When the pass is at an x on its downwind.
    downwindAt: (x) => atX('dw', x),
    finalAt: (x) => atX('final', x),
    // How far it reaches past the departure end, for the drawing.
    reach: Math.max(...pts.map((p) => p.x)),
    reachBack: Math.min(...pts.map((p) => p.x)),
    dwExt: opts.dwExt || 0,
    // More room its calls need, if any.
    needs: needs.upwindX !== opts.upwindX ? needs : null,
    late,
  };
}

// ---- The break, into a chosen pattern (ME FTI §106 p. 1-29): wings level at 200 KIAS over
// the runway at 1,000 ft (the course rules' overhead, slightly offset to the pattern side), the
// numbers call, then, when cleared, a level turn at idle to the downwind about a mile abeam,
// approach flaps below 174 KIAS and the gear below 155 on the way round. On the downwind it
// slows to 120 KIAS, descends to 800 ft and from there flies that pattern's downwind, approach
// and landing; the patterns that start with an engine out come in as the approach-flap pattern
// does, the single-engine one taking over at its wave-off at 200 ft. Cleared for the break at the numbers, it waits and breaks at
// the departure end (the user), left or right with the runway's traffic.
const BREAK_FROM = -4500; // where the drawing picks it up, inbound
const OVERHEAD_Y = 150; // the offset to the pattern side (Cabaniss course rules: 100-200 ft)
const BREAK_LEGS = (length) => [
  { id: 'overhead', phase: 'Break entry', toX: length, kias: flat(200), alt: flat(1000) },
  { id: 'break', phase: 'The break', spiral: ABEAM, kias: [[0, 200], [1, 140]], alt: flat(1000) },
  { id: 'bdw', phase: 'Downwind', line: 5000, kias: [[0, 140], [0.3, 120], [1, 120]], alt: [[0, 1000], [0.3, 1000], [1, 800]] },
];

export function buildBreak(id = 'approach', engine = 'left', runwayId = DEFAULT_RUNWAY) {
  const field = RUNWAY_BY_ID[runwayId];
  const side = field.side;
  const baseId = ['approach', 'noflap', 'full'].includes(id) ? id : 'approach';
  const base = buildPass(baseId, engine, runwayId);
  const noflap = baseId === 'noflap';
  const { pts, seg, duration } = fly(BREAK_LEGS(field.length), BREAK_FROM, OVERHEAD_Y);
  const inLeg = (legId) => pts.slice(seg[legId].start, seg[legId].end + 1);
  const when = (legId, test) => (inLeg(legId).find(test) || pts[seg[legId].end]).t;

  const events = [];
  const add = (t, who, kind, text, extra = {}) => events.push({ t, who, kind, text, ...extra });
  const tn = when('overhead', (p) => p.x >= 0);
  const tb = pts[seg.break.start].t;
  const tr = pts[seg.bdw.start].t;
  add(0, 'PF', 'do', 'Enter the break following course rules, wings level at 200 KIAS', { ref: FTI('p. 1-29') });
  add(tn, 'PM', 'say', `${field.name} Tower, ${CALL_SIGN}, numbers for the break.`, { radio: true, ref: APPB('p. B-4') });
  add(tn + 3.6, 'Tower', 'say', `${CALL_SIGN}, cleared for the ${side} break.`, { radio: true, generated: true });
  add(tn + 6.6, 'PM', 'say', `Cleared for the ${side} break, ${CALL_SIGN}.`, { radio: true, generated: true, ref: CALLOUTS });
  add(tn + 9.4, 'PF', 'say', `Cleared for the ${side} break.`, { generated: true, ref: CALLOUTS });
  add(tb, 'PF', 'do', `At the departure end, smoothly roll into a level ${side} bank, not to exceed 45°, power to idle`, { ref: FTI('p. 1-29'), set: { power: 'Idle' } });
  if (!noflap) {
    const t174 = when('break', (p) => p.kias <= 174);
    add(t174, 'PF', 'do', 'Select approach flaps (174 KIAS maximum) and anticipate ballooning', { ref: FTI('p. 1-29') });
    add(t174, 'PF', 'say', 'Speed checks, flaps approach', { ref: APPF('Landing Checklist', 'p. F-24') });
    add(t174 + 1.4, 'PM', 'say', 'Speed checks, flaps approach', { ref: CONFIG, set: { flaps: 'Approach' } });
  }
  const t155 = when('break', (p) => p.kias <= 155);
  add(t155, 'PF', 'do', 'Select landing gear down (155 KIAS maximum) and complete the Landing Checklist', { ref: FTI('p. 1-29') });
  let t = t155;
  landingChecklist(noflap ? 'Up' : 'Approach', true).forEach(([who, text, set]) => {
    add(t, who, 'say', text, { ref: APPF('Landing Checklist', 'p. F-24'), ...(set ? { set } : {}) });
    t += 1.7;
  });
  add(tr, 'PF', 'do', 'Roll out on downwind with the runway on the lift detector, about 1 mile abeam', { ref: FTI('p. 1-29') });
  add(when('bdw', (p) => p.kias <= 120), 'PF', 'do', 'Slow to 120 KIAS on downwind, then descend to pattern altitude', { ref: FTI('p. 1-29'), set: { power: 'As required' } });
  add(duration, 'PF', 'do', 'Downwind: 800 ft, 120 KIAS, trimmed, about a mile abeam', { ref: FTI('p. 1-31'), set: { power: base.torques ? '600 ft-lbs' : 'As required' } });
  events.sort((a, b) => a.t - b.t);

  const init = { flaps: 'Up', gear: 'Up', props: '1900 RPM', power: 'As required', engines: 'Both' };
  const own = stateFn(pts, duration, init, events, field);

  // From here that pass, on its downwind at the same place, to the touchdown; for the single-
  // engine pattern, to its wave-off.
  const tj = base.downwindAt(pts[pts.length - 1].x);
  const end = id === 'sse' ? base.finalAt(WAVEOFF_X) : base.duration;
  const shift = duration - tj;
  const later = base.events.filter((e) => e.t >= tj && e.t < end).map((e) => ({ ...e, t: e.t + shift }));
  const stateAt = (time) => (time <= duration ? own(time) : { ...base.stateAt(time - shift), t: time });
  // The one circle of its own is at the break entry, off the pattern's line.
  const marks = [
    { t: 0, label: 'Break entry', key: 'entry', x: BREAK_FROM, y: OVERHEAD_Y },
    ...base.marks.filter((m) => m.t >= tj && m.t < end).map((m) => ({ ...m, t: m.t + shift })),
  ];
  // The break's own line: from the drawing's edge to the rollout on downwind.
  const total = duration + (end - tj);
  const track = pts.filter((p, i) => p.t <= tr && (i % 6 === 0 || p.t === tr)).map((p) => [p.x, p.y]);
  return {
    id: 'break', engine, field, duration: total, events: [...events, ...later], marks, track, stateAt,
    speeds: { ...base.speeds, entry: { kias: 200 } }, torques: base.torques, rolloutT: tr,
  };
}

// ---- On the ground: a runway's ends, for the satellite view. x runs down the runway on its
// true bearing from the approach end, y to the pattern side.
const FT_PER_DEG = 111320 * 3.28084;
export function siteOf(runwayId) {
  const rw = RUNWAY_BY_ID[runwayId];
  const [a, b] = rw.ends;
  const k = rw.side === 'left' ? 1 : -1;
  const cosLat = Math.cos((a[0] * Math.PI) / 180);
  const bearing = Math.atan2((b[1] - a[1]) * cosLat, b[0] - a[0]); // radians, true
  // A point of the drawing, in feet, as [lat, lon].
  const toLatLng = (x, y) => {
    const left = bearing - Math.PI / 2;
    const north = x * Math.cos(bearing) + k * y * Math.cos(left);
    const east = x * Math.sin(bearing) + k * y * Math.sin(left);
    return [a[0] + north / FT_PER_DEG, a[1] + east / (FT_PER_DEG * cosLat)];
  };
  return { bearingDeg: (bearing * 180) / Math.PI, lat: a[0], toLatLng };
}

export const GEOMETRY = { TOUCHDOWN_X, TURN_X, GROOVE_X, R, WAVEOFF_X };
export const geometryOf = (length) => ({ ...GEOMETRY, TURN_X: turnX(length) });
