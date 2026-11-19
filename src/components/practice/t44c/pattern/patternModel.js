// The T-44C VFR landing pattern, flown by a model on a 5,000 ft runway (Cabaniss 13, left
// traffic, no wind), with the calls and the FTI's procedures at their places. Pure: no JSX.
//
// A pass is a chain of legs (lines and left turns), each with its airspeed and altitude along
// it; time comes from flying each foot at its airspeed. The legs off the runway keep the
// student's stopwatch times (the user, 2026-11-19: touchdown to rotate about 6 s, rotate to
// 300 ft about 13 s, 300 ft to the crosswind turn about 7 s). The rest is the FTI's (ME FTI
// §106 Pattern Work, pp. 1-30 to 1-42): downwind about a mile abeam (the user: 1 nm), 30° AOB
// in the crosswind turn, the approach turn begun just past abeam the numbers and rolled out on
// centerline 1,200 ft from the threshold at 250 ft, and the airspeeds and altitudes of
// Figures 1-3, 1-4 and 1-6. "3 big potatoes" past the 180 is the user's.
//
// x runs down the runway in the landing direction from the threshold, y to the left of it
// (the pattern side), in feet. Altitudes are AGL.

const KT = 1.68781; // ft/s per knot
const G = 32.174;
const NM = 6076;

export const RUNWAY = { length: 5000, width: 150, number: '13', reciprocal: '31', heading: 130, field: 'Cabaniss' };
export const CALL_SIGN = 'MNTNA 12';
export const ABEAM = NM;
const TOUCHDOWN_X = 500;
const TURN_X = TOUCHDOWN_X + 870 + 2425 + 1372; // the crosswind turn, at 500 ft on the upwind
const XW_R = 2207; // 30° AOB at 120 KIAS
const THE_180_X = 0; // abeam the numbers
const APPROACH_X = THE_180_X - 3 * 120 * KT; // three seconds on
const ROLLOUT_X = -1200; // on final, 1,000-1,200 ft from the threshold
// The approach turn's two quarters, wide then tighter, so that it begins just past the numbers,
// ends 1,200 ft short of the threshold, and is a mile across.
const APP_R1 = (ABEAM + (APPROACH_X - ROLLOUT_X)) / 2;
const APP_R2 = ABEAM - APP_R1;
const WAVEOFF_X = ROLLOUT_X + (50 / 250) * (TOUCHDOWN_X - ROLLOUT_X); // 200 ft on the SSE final

export const SCENARIOS = [
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

function legs(id) {
  const sse = id === 'sse';
  const caseN = id.startsWith('case') ? Number(id.slice(4)) : 0;
  const out = [];
  const L = (leg) => out.push(leg);

  if (sse) {
    // From the SSE wave-off at 200 ft on the last pass's final.
    L({ id: 'waveoff', phase: 'SSE wave-off', line: 2600, kias: flat(110), alt: [[0, 200], [0.12, 192], [1, 300]] });
    L({ id: 'up2', phase: 'Upwind', toX: TURN_X, kias: flat(110), alt: [[0, 300], [1, 400]] });
  } else {
    L({ id: 'roll', phase: 'Touch-and-go', line: 870, kias: [[0, 90], [0.35, 82], [1, 91]], alt: flat(0) });
    L({ id: 'climb', phase: 'Upwind', line: 2425, kias: [[0, 91], [0.6, 120], [1, 120]], alt: [[0, 0], [0.1, 0], [1, 300]] });
    L({
      id: 'up2', phase: 'Upwind', toX: TURN_X,
      kias: caseN === 1 ? [[0, 120], [0.35, 104], [1, 110]] : flat(120),
      alt: caseN === 1 ? [[0, 300], [1, 380]] : [[0, 300], [1, 500]],
    });
  }
  // Climbing on one engine in the crosswind: 110 KIAS, slower.
  const lost = sse || caseN === 1 || caseN === 2;
  const xwFrom = sse ? 400 : caseN === 1 ? 380 : 500;
  let xwMid;
  if (caseN === 2) {
    // Roll wings level to analyse, then continue the turn.
    L({ id: 'xw1', phase: 'Crosswind', arc: XW_R, angle: Math.PI / 4, kias: [[0, 120], [1, 116]], alt: [[0, 500], [1, 560]] });
    L({ id: 'xwLevel', phase: 'Crosswind', line: 1100, kias: [[0, 116], [1, 110]], alt: [[0, 560], [1, 580]] });
    L({ id: 'xw1b', phase: 'Crosswind', arc: XW_R, angle: Math.PI / 4, kias: flat(110), alt: [[0, 580], [1, 620]] });
    xwMid = 620;
  } else {
    xwMid = xwFrom + (800 - xwFrom) * 0.4;
    L({ id: 'xw1', phase: 'Crosswind', arc: XW_R, angle: Math.PI / 2, kias: flat(lost ? 110 : 120), alt: [[0, xwFrom], [1, xwMid]] });
  }
  const xwHigh = xwMid + (800 - xwMid) * 0.45;
  L({ id: 'xwLeg', phase: 'Crosswind', toY: ABEAM - XW_R, kias: flat(lost ? 110 : 120), alt: [[0, xwMid], [1, xwHigh]] });
  L({ id: 'xw2', phase: 'Crosswind', arc: XW_R, angle: Math.PI / 2, kias: flat(lost ? 110 : 120), alt: [[0, xwHigh], [0.8, 800], [1, 800]] });
  L({ id: 'dw', phase: 'Downwind', toX: APPROACH_X, kias: lost ? [[0, 110], [0.25, 120], [1, 120]] : flat(120), alt: flat(800) });
  // The approach turn: the 90 at 500 ft and 110 KIAS, final at 250 ft. On one engine 110
  // minimum to the threshold; without flaps, final at 110 and the threshold at 105.
  const single = sse || caseN >= 1;
  const finalK = single || id === 'noflap' ? 110 : 105;
  const crossK = single ? 110 : id === 'noflap' ? 105 : 95;
  L({ id: 'app1', phase: 'Approach turn', arc: APP_R1, angle: Math.PI / 2, kias: caseN === 4 ? [[0, 120], [0.3, 113], [1, 110]] : [[0, 120], [1, 110]], alt: [[0, 800], [1, 500]] });
  L({ id: 'app2', phase: 'Approach turn', arc: APP_R2, angle: Math.PI / 2, kias: [[0, 110], [1, finalK]], alt: [[0, 500], [1, 250]] });
  const toThreshold = (0 - ROLLOUT_X) / (TOUCHDOWN_X - ROLLOUT_X);
  if (sse) L({ id: 'final', phase: 'Final', toX: WAVEOFF_X, kias: flat(110), alt: [[0, 250], [1, 200]] });
  else L({ id: 'final', phase: 'Final', toX: TOUCHDOWN_X, kias: [[0, finalK], [toThreshold, crossK], [1, crossK - 5]], alt: [[0, 250], [toThreshold, 20], [1, 0]] });
  if (caseN) L({ id: 'rollout', phase: 'SSE full stop', line: 2600, kias: [[0, 105], [1, 12]], alt: flat(0) });
  return out;
}

// Fly the legs: a sample every few feet with its time, place, track and figures.
function fly(id) {
  const spec = legs(id);
  const step = 6;
  const pts = [];
  let x = id === 'sse' ? WAVEOFF_X : TOUCHDOWN_X;
  let y = 0;
  let psi = 0;
  let t = 0;
  const seg = {};
  for (const leg of spec) {
    let len;
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

function find(pts, t) {
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].t <= t) lo = m; else hi = m; }
  const a = pts[lo];
  const b = pts[hi];
  return [a, b, b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0];
}

// ---- A pass: where the aircraft is, and what is said and done, by time.

export function buildPass(id, engine = 'left') {
  const { pts, seg, duration } = fly(id);
  const sse = id === 'sse';
  const caseN = id.startsWith('case') ? Number(id.slice(4)) : 0;
  const single = sse || caseN > 0;
  const e = engine;
  const E = cap(e);
  const good = e === 'left' ? 'right' : 'left';
  const Good = cap(good);

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
    const lines = [
      ['PF', gearDown ? 'Speed checks, landing gear down, Landing Checklist' : 'Landing Checklist'],
      ...(gearDown ? [['PM', 'Speed checks, landing gear down']] : []),
      ['PM', 'Flaps'], ['PF', flapsWord], ['PM', flapsWord],
      ['PM', 'Landing Gear'], ['PF', 'Down, locked'], ['PM', 'Down, locked'],
      ['PM', 'Lights'], ['PF', 'Set'],
      ['PM', 'Landing Checklist complete'],
    ];
    let t = t0;
    lines.forEach(([who, text], i) => {
      if (quiet && t > quiet[0] - 1 && t < quiet[1]) t = quiet[1];
      add(t, who, 'say', text, {
        ref: APPF('Landing Checklist', 'p. F-24'),
        ...(gearDown && i === 1 ? { set: { gear: 'Down' } } : {}),
      });
      t += 1.7;
    });
    return t;
  };
  const shutdown = (t0, { check } = {}) => {
    let t = t0;
    const say = (dt, who, text, set) => {
      t += dt;
      add(t, who, 'say', text, { ref: APPF('Emergency Engine Shutdown Checklist', 'p. F-29'), ...(set ? { set } : {}) });
    };
    say(0, 'PF', `This will be an emergency shutdown of the ${e} engine.`);
    say(3.2, 'PF', `${E} Power lever – Idle, concur?`);
    say(2.2, 'PM', 'Concur');
    say(1.2, 'PF', `${E} Propeller – Feather, concur?`);
    say(2.4, 'PM', 'Simulate', { engines: `${E}: zero thrust (simulated feather)` });
    say(1.2, 'PF', `${E} Condition lever – Fuel Cutoff concur?`);
    say(2.6, 'PM', 'Simulate');
    if (check) {
      add(t + 1.4, 'PF', 'do', 'Prop feathered: props 1900 RPM. No fire or fuel leak', { ref: APPF('Emergency Engine Shutdown Checklist', 'p. F-29'), set: { props: '1900 RPM' } });
      t += 3.6;
      add(t, 'PF', 'say', 'Continue the checklist.', { ref: APPF('Emergency Engine Shutdown Checklist', 'p. F-30') });
    }
    return t;
  };
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
      add(t300 + 0.8, 'PF', 'do', 'Power up, rudder up, clean up', { ref: APPF('Emergency Procedures', 'p. F-28'), set: { power: `${Good} max` } });
      add(t300 + 2.2, 'PF', 'do', 'Landing gear up', { ref: FTI('p. 1-37'), set: { gear: 'Up' } });
      add(t300 + 3.4, 'PF', 'do', 'At 102 KIAS raise the nose, accelerate to 110, 5° bank into the good engine', { ref: FTI('p. 1-38') });
      const t = shutdown(t300 + 5.5);
      add(t + 1.4, 'PF', 'do', 'Hold the checklist: props 1900 RPM, reset maximum power, check the prop feathered', { ref: FTI('p. 1-38'), set: { props: '1900 RPM' } });
      add(t + 4.6, 'PF', 'say', 'Continue the checklist.', { ref: FTI('p. 1-38') });
      add(t + 7, 'PF', 'do', 'Crosswind turn at 300 ft or above with downwind interval. Declare an emergency', { ref: FTI('p. 1-38') });
    } else {
      add(t300, 'PF', 'do', 'Takeoff power still set, props 1900 RPM', { ref: FTI('p. 1-35'), set: { props: '1900 RPM' } });
      const t400 = atAlt('up2', 400);
      add(t400, 'PF', 'say', 'Clear left, going left', { technique: true });
      add(t400 + 1.4, 'PM', 'say', 'Clear right', { ref: FTI('p. 1-31') });
    }
  }
  const txw = start('xw1');
  mark(txw, 'Crosswind', 'crosswind');
  if (!single || caseN >= 2) add(txw, 'PF', 'do', 'Crosswind turn: 30° AOB maximum, 120 KIAS', { ref: FTI('p. 1-31'), set: { power: 'As required' } });
  else add(txw, 'PF', 'do', 'Crosswind turn, 110 KIAS climbing', { ref: FTI('p. 1-41') });

  // ---- Passing 600 ft: flaps approach and the Landing Checklist (gear already down).
  if (!sse && caseN !== 1 && caseN !== 2) {
    const t600 = atAlt('xw1', 600);
    if (id === 'noflap') {
      add(t600, 'PF', 'do', 'Passing 600 ft: flaps stay up', { ref: FTI('p. 1-31') });
      checklist(t600 + 1, 'Up');
    } else {
      add(t600, 'PF', 'say', 'Speed checks, flaps approach', { ref: APPF('Landing Checklist', 'p. F-24'), set: { flaps: 'Approach' } });
      checklist(t600 + 1.4, 'Approach');
    }
  }
  if (caseN === 2) {
    const t0 = start('xwLevel');
    failure(t0 - 0.6);
    add(t0, 'PF', 'do', 'Roll wings level to analyse', { ref: FTI('p. 1-39') });
    add(t0 + 1.2, 'PF', 'do', 'Power up, rudder up, clean up', { ref: APPF('Emergency Procedures', 'p. F-28'), set: { power: `${Good} max`, gear: 'Up' } });
    add(t0 + 3, 'PF', 'do', 'Nearly center the ball (¼ to ½ out toward the good engine), 102 KIAS minimum, 110 VYSE. Continue the turn', { ref: FTI('p. 1-39') });
    const t = shutdown(start('xw1b') + 1, { check: true });
    add(t + 2, 'PF', 'do', 'Declare an emergency. Climb to pattern altitude, then 120 KIAS', { ref: FTI('p. 1-39') });
  }

  // ---- Downwind.
  const tdw = start('dw');
  mark(tdw, 'Downwind', 'downwind');
  if (sse || caseN === 1 || caseN === 2) add(tdw, 'PF', 'do', 'Pattern altitude, then accelerate to 120 KIAS', { ref: FTI('p. 1-38'), set: { power: `${Good} as required` } });
  else {
    add(tdw, 'PF', 'do', 'Downwind: 800 ft, 120 KIAS, trimmed, about a mile abeam', { ref: FTI('p. 1-31') });
    if (!caseN) add(tdw + 2.5, 'PF', 'do', 'Landing Checklist, spacing, trim', { technique: true });
    add(tdw + 7, 'PF', 'do', 'Rudder trim centered by the 180', { ref: FTI('p. 1-30') });
  }
  const t180 = atX('dw', THE_180_X);
  quiet = [t180 - 0.4, t180 + 7];
  let busyUntil = 0;
  if (caseN === 3) {
    const t0 = tdw + 1.5;
    failure(t0);
    add(t0 + 0.8, 'PF', 'do', 'Power on the good engine, nearly center the ball, 120 KIAS and pattern altitude', { ref: FTI('p. 1-39'), set: { power: `${Good} as required` } });
    add(t0 + 2.4, 'PF', 'do', 'Short of midfield: clean up, gear and flaps up', { ref: FTI('p. 1-39'), set: { gear: 'Up', flaps: 'Up' } });
    busyUntil = shutdown(t0 + 4) + 1.6;
    add(busyUntil - 0.8, 'PF', 'do', 'Landing Checklist complete no later than the 90, 110 KIAS minimum to the 90', { ref: FTI('p. 1-40') });
  }
  // On one engine, approaching the 180: flaps approach, gear down, Landing Checklist; and
  // before it, the SSE full-stop brief.
  if (sse || caseN === 1 || caseN === 2 || caseN === 3) {
    if (caseN === 1 || caseN === 2) {
      add(t180 - 38, 'PF', 'say', `Once safely on the deck, I will bring both power levers over the detent, reversing with the ${good} engine, maintaining centerline with opposite rudder and aileron and forward yoke pressure. If rudder effectiveness is lost, I will bring both power levers toward flight idle.`, { ref: APPB('p. B-10'), hold: 13 });
    }
    const tc = Math.max(t180 - 22, busyUntil);
    add(tc, 'PF', 'say', 'Speed checks, flaps approach', { ref: FTI('p. 1-41'), set: { flaps: 'Approach' } });
    checklist(tc + 1.6, 'Approach', true);
  }

  // ---- The 180 and the approach turn.
  const intent = sse ? 'low approach' : caseN ? 'full-stop' : 'touch-and-go';
  const cleared = sse ? 'low approach' : caseN ? 'full-stop' : 'option';
  const tower = sse ? 'cleared low approach' : caseN ? 'cleared to land' : 'cleared for the option';
  mark(t180, 'The 180', 'the180');
  add(t180 - 0.4, 'PF', 'do', 'Three green lights', { ref: FTI('p. 1-31') });
  add(t180, 'PM', 'say', `${RUNWAY.field} Tower, ${CALL_SIGN}, left 180, three down and locked, ${intent}.`, { radio: true, ref: APPB('p. B-4') });
  add(t180 + 4.8, 'Tower', 'say', `${CALL_SIGN}, runway ${RUNWAY.number}, ${tower}.`, { radio: true, generated: true });
  const tTurn = start('app1');
  mark(tTurn, 'Approach turn', 'approach');
  const oneEngineTurn = sse || (caseN >= 1 && caseN <= 3);
  if (oneEngineTurn) add(tTurn, 'PF', 'do', 'Approach turn: 110 KIAS minimum to the 90', { ref: FTI('p. 1-40'), set: { power: `${caseN >= 4 ? 'Both' : Good} as required` } });
  else {
    add(tTurn, 'PF', 'do', 'Approach turn: reduce power, continuous descending, decelerating turn, 30° AOB maximum', { ref: FTI('p. 1-32'), set: { power: '~250 ft-lbs' } });
    add(tTurn + 1.2, 'PF', 'do', 'PPTTT, 4 seconds up trim, stare at the PFD, about 250 ft-lbs', { technique: true });
  }
  if (caseN === 4) {
    const t0 = atF('app1', 0.25);
    failure(t0);
    add(t0 + 0.8, 'PF', 'do', 'Power on the good engine, 110 KIAS minimum, nearly center the ball, continue the turn. Gear stays down', { ref: FTI('p. 1-40'), set: { power: `${Good} as required` } });
    shutdown(t0 + 3);
  }

  const t90 = start('app2');
  mark(t90, 'The 90', 'the90');
  add(t90, 'PF', 'say', 'Down and locked', { technique: true, note: 'Look at the runway now' });
  if (id === 'full') add(t90 + 1.6, 'PF', 'do', 'Flaps down, after the 90 and before rolling onto final', { ref: FTI('p. 1-34'), set: { flaps: 'Down' } });
  if (caseN === 5) {
    const t0 = t90 + 2;
    failure(t0);
    add(t0 + 0.8, 'PF', 'do', 'Slight power on the good engine, 110 KIAS to the threshold, aircraft control first', { ref: FTI('p. 1-40'), set: { power: `${Good} as required` } });
    busyUntil = shutdown(t0 + 2.6) + 1.4;
  }
  const tReview = Math.max(atAlt('app2', 300), busyUntil);
  add(tReview, 'PF', 'say', 'Props full forward, down and locked, review me complete.', { ref: FTI('p. 1-32'), set: { props: 'Full forward' } });
  add(tReview + 3.4, 'PM', 'say', `Reviewed complete, cleared ${cleared}.`, { ref: FTI('p. 1-32') });

  // ---- Final.
  const tFinal = start('final');
  mark(tFinal, 'Final', 'final');
  const finalK = single || id === 'noflap' ? 110 : 105;
  const crossK = single ? 110 : id === 'noflap' ? 105 : 95;
  add(tFinal, 'PF', 'do', `Final: 250 ft, ${finalK} KIAS, aim at the numbers`, { ref: FTI(single ? 'p. 1-41' : id === 'noflap' ? 'p. 1-33' : 'p. 1-32'), set: { power: 'As required' } });
  if (sse) mark(duration, 'SSE wave-off (200 ft AGL)', 'waveoffEnd');
  else add(atX('final', 0), 'PF', 'do', `Cross the threshold at ${crossK} KIAS, slowly close the power levers, flare`, { ref: FTI(single ? 'p. 1-41' : 'p. 1-33'), set: { power: 'Closing to idle' } });
  if (caseN) {
    const tr = start('rollout');
    mark(duration, 'SSE full stop', 'fullstop');
    add(tr, 'PF', 'do', 'Power levers idle, both over the detent', { ref: FTI('p. 1-41'), set: { power: 'Idle' } });
    add(tr + 1.5, 'PF', 'do', `Slowly ease the ${good} engine into reverse. Rudder for yaw, brakes and power for centerline`, { ref: FTI('p. 1-41'), set: { power: `${Good} reverse` } });
    add(tr + 4.5, 'PF', 'do', `Yoke full forward, aileron into the ${e} engine, to a slow taxi`, { ref: FTI('p. 1-41') });
  }

  events.sort((a, b) => a.t - b.t);
  const changes = events.filter((x) => x.set);
  const configAt = (t) => {
    const c = { ...init };
    for (const x of changes) { if (x.t > t) break; Object.assign(c, x.set); }
    return c;
  };
  const altAt = (t) => { const [a, b, k] = find(pts, t); return a.alt + (b.alt - a.alt) * k; };

  const stateAt = (time) => {
    const t = Math.max(0, Math.min(duration, time));
    const [a, b, k] = find(pts, t);
    const mix = (p) => a[p] + (b[p] - a[p]) * k;
    const psi = mix('psi');
    const t0 = Math.max(0, t - 0.3);
    const t1 = Math.min(duration, t + 0.3);
    return {
      t, x: mix('x'), y: mix('y'), psi, alt: mix('alt'), kias: mix('kias'), aob: mix('aob'),
      hdg: ((RUNWAY.heading - (psi * 180) / Math.PI) % 360 + 360) % 360,
      vsi: t1 > t0 ? ((altAt(t1) - altAt(t0)) / (t1 - t0)) * 60 : 0,
      phase: a.phase,
      ...configAt(t),
    };
  };

  const placed = marks.map((m) => { const s = stateAt(m.t); return { ...m, x: s.x, y: s.y }; });
  const track = pts.filter((_, i) => i % 6 === 0 || i === pts.length - 1).map((p) => [p.x, p.y]);
  return { id, engine, duration, events, marks: placed, track, stateAt };
}

export const GEOMETRY = { TOUCHDOWN_X, TURN_X, XW_R, APPROACH_X, ROLLOUT_X, APP_R1, APP_R2, WAVEOFF_X };
