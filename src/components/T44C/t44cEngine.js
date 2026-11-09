// The T-44C's two engines through the starts, the engine runup and the anti-ice/deice check, for
// those procedures' poster: what the digital windows on the ITT, torque, Np, N1 and fuel flow
// gauges read, what the needle gauges and fuel quantity read, and which annunciators are lit.
// Pure data and functions, no React; t44cEngineStore.js runs it against the clock and
// epsLimits/CockpitPoster.js draws it.
//
// Every curve here was read off the sim instructor station's repeater screen, filmed through
// starts on 2026-11-02 (_reference-docs/T44C Advanced/Fundamental References/Quadfold Videos
// and Photos/engine-videos.md lists the clips, engine-videos-readings.md every reading). The
// students in those clips were often slow or early, so a clip is evidence of how the engine
// answers an input, never of when the input belongs: every response below runs from the moment
// of its own input (starter on, condition lever out of cutoff, light-off, fuel cut off), so a
// late or early click shifts it exactly as it shifted in the clips. When an input belongs is the
// FTI's, and is checked by `gate`.
//
// Where the clips show nothing, nothing is invented, and each exception is marked where it is:
// the hot start's ITT past the point it was aborted (it has to go hot, or it is not a hot start),
// the overspeed governor's ceiling (the FTI's figure: no clip held the test switch long enough),
// and how fast a prop feathers by hand at idle (taken from the autofeather clip).
//
// The runup's levers are moved for the student, the way the clip's student moved them, once the
// step's control is clicked (`script`): a click cannot say how far a lever went, and the check
// is in watching what the gauges and lights do as it goes.
//
// Repeater digits are plain units whatever the dial captions say: ITT in °C, torque in lb-ft,
// Np in rpm, N1 in percent, fuel flow in pph.

import { faultById, HEATERS, LAMP_CELLS } from './t44cFaults';

export const SIDES = ['L', 'R'];

// What a student can choose to practise. The clip each one comes from is in its table below.
// The three no starts are the sim's (the user, 2026-11-08): no light-off (fuel flowing, nothing
// lights), no fuel flow (the condition lever in, FF at 0) and no rotation (IGN IND lit, N1 at 0).
export const SCENARIOS = [
  { id: 'normal', label: 'Normal start' },
  { id: 'long', label: 'Long start' },
  { id: 'hot', label: 'Hot start' },
  { id: 'hung', label: 'Hung start' },
  { id: 'noLightoff', label: 'No start (no light-off)' },
  { id: 'noFuel', label: 'No start (no fuel flow)' },
  { id: 'noRotation', label: 'No start (no rotation)' },
];

const AMBIENT = 30; // °C: every cold engine in the clips read 30, and the sim's RAT was 30 °C

// --------------------------------------------------------------------------------------------
// Curves

// [seconds, value] pairs; between them a straight line, past the last the last value.
const at = (pts, t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i += 1) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1];
      const [t1, v1] = pts[i];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return pts[pts.length - 1][1];
};
const end = (pts) => pts[pts.length - 1][0];

// First-order approach: how far a reading moves toward `target` in `dt` seconds.
const toward = (x, target, tau, dt) => x + (target - x) * (1 - Math.exp(-dt / tau));

// Motoring on the starter, before fuel. N1 climbs to a plateau, starting half a second after
// the switch (IMG_9714: on at 3 s, 2.3 % at 4 s, 10.4 at 6, 14.4 at 8, 17.5 at 16).
const MOTOR = {
  delay: 0.5,
  tau: 2.7,
  // 17.4 to 17.5 % on the starter alone (IMG_9710, 9712, 9713, 9714, 9728). With the condition
  // lever out of cutoff it creeps up before light-off shows on the ITT: IMG_9716 17.5 to 18.7
  // in the 4 s after the fuel, 9715 18.5 to 19.0, 9712 and 9714 a few tenths. It is the fuel
  // that moves it, not the other generator (the user's ruling, 2026-11-03).
  plateau: 17.5,
  fuelled: 18.3,
  fuelledTau: 3,
  np: 10, // rpm, the prop windmilling on the starter
  trq: 2,
};

// Fuel flow once the condition lever leaves cutoff: 102 pph within about two seconds (IMG_9714
// 80 then 99, 9716 57 then 96), whatever the engine is doing.
const FF_PRIMING = { target: 102, tau: 0.8 };

// Fuel cut off: flow is gone in two or three seconds (IMG_9712 164, 47, 6, 1), ITT falls about
// as fast in every clip whatever it fell from (9712 from 779, 9713 from 615, 9715 from 854), and
// N1 falls back to the starter's plateau, or toward nothing with the starter off (9712 after
// 42 s, 9710 after 43 s).
const SHUTDOWN = {
  ff: 0.7,
  itt: { target: 250, tau: 4.5, coolTau: 120 },
  n1: { onStarter: 4.5, off: 9 },
  np: 3,
  trq: 0.6,
};

// The scenarios, each timed from LIGHT-OFF (τ = 0). `lightoff` is the delay from the condition
// lever to light-off, which no student input moves (4 to 4.5 s in every normal clip, 5.5 in the
// hung one: within the FTI's 10 seconds).
const NORMAL = {
  lightoff: 4.2,
  // IMG_9716 and 9713 averaged; they agree to a few degrees and a few tenths. Their light-offs
  // fell half a second before a frame, hence the half seconds.
  itt: [[0, AMBIENT], [0.5, 73], [2.5, 205], [4.5, 387], [6.5, 533], [8.5, 579], [10.5, 658],
    [12.5, 653], [14.5, 614], [16.5, 608]],
  n1: [[0, 17.5], [0.5, 18.6], [2.5, 22.4], [4.5, 28.2], [6.5, 33.7], [8.5, 39.25], [10.5, 45.2],
    [12.5, 50.55], [14.5, 51.65]],
  // IMG_9716 to 16.5 s, then IMG_9714's longer tail as the prop comes up to speed.
  trq: [[0, MOTOR.trq], [0.5, 19], [2.5, 31], [4.5, 64], [6.5, 126], [8.5, 184], [10.5, 226],
    [12.5, 233], [14.5, 212], [16.5, 194], [19, 149], [21, 118], [23, 113], [25, 110], [29, 108]],
  np: [[0, MOTOR.np], [0.5, 22], [2.5, 56], [4.5, 96], [6.5, 169], [8.5, 232], [10.5, 272],
    [12.5, 309], [14.5, 356], [16.5, 415], [19, 513], [21, 659], [23, 768], [25, 845], [27, 893],
    [29, 924], [31, 942], [33, 954], [35, 961], [60, 973]],
  ff: [[0, 102], [2.5, 103], [4.5, 102], [6.5, 107], [8.5, 119], [10.5, 130], [12.5, 118],
    [14.5, 106], [16.5, 105], [20, 104]],
};

// A long start (the user, 2026-11-08): a normal start's curves drawn out in time, so N1 reaches
// 50 percent 41 seconds after the starter went on, past the starter's 40-second limit. The
// stretch is set at light-off from how long the starter has run by then; no clip shows one.
const LONG = { to50: 41 };

// When a normal start's N1 reaches 50 percent, after light-off.
const T50 = 10.5 + (2 * (50 - 45.2)) / (50.55 - 45.2);

// IMG_9715, the left engine with the right generator on: fuel flow overshoots to 163 against a
// normal start's 102 and ITT climbs past 850, where the student cut the fuel 9 seconds after
// light-off. N1, torque and Np kept a normal start's pace (40.9 % against 39 at 8 s, from an N1
// a percent higher at light-off).
const HOT = {
  lightoff: 4.5,
  ff: 163,
  itt: [[0, AMBIENT], [0.3, 63], [2.3, 335], [4.3, 617], [6.3, 792], [8.3, 854]],
  // Past the clip, which was cut off at 854: still climbing fast, 45 °C a second, to 1150 °C
  // (the user's figure, 2026-11-03), past the 925 at which the FTI says to abort and the 1090
  // start limit, and held there until the fuel is cut.
  beyond: { rate: 45, max: 1150 },
};

// IMG_9712, the right engine on the battery: N1 crawls to 34.6 % and stops while ITT keeps
// climbing, cut off 19 s after light-off at 779 °C.
const HUNG = {
  lightoff: 5.5,
  itt: [[0, AMBIENT], [1, 135], [3, 244], [5, 349], [7, 470], [9, 593], [11, 679], [13, 723],
    [15, 747], [17, 765], [19, 779]],
  n1: [[0, 17.4], [1, 19.2], [3, 21.7], [5, 24.4], [7, 27.3], [9, 29.6], [11, 31.4], [13, 32.7],
    [15, 33.6], [17, 34.2], [19, 34.6]],
  trq: [[0, MOTOR.trq], [1, 21], [3, 29], [5, 41], [7, 54], [9, 67], [11, 84], [13, 101],
    [15, 113], [17, 120], [19, 122]],
  np: [[0, MOTOR.np], [1, 37], [3, 64], [5, 76], [7, 97], [9, 124], [11, 150], [13, 174],
    [15, 189], [17, 200], [19, 209]],
  ff: [[0, 102], [1, 102], [3, 107], [5, 114], [7, 124], [9, 133], [11, 143], [13, 151],
    [15, 157], [17, 162], [19, 164]],
  // Where each was heading as the clip ended, by the slowing of its last few readings.
  beyond: { itt: [800, 10], n1: [35.2, 6], trq: [124, 6], np: [225, 8], ff: [168, 6] },
};

// A running engine, by its N1, props full forward: [N1, torque, Np, fuel flow, ITT]. Low idle is
// the starts' (IMG_9715 and 9716's long-started right engines: 52.0 %, 108 lb-ft, 973 rpm,
// 104 pph, 629 to 632 °C). The rest is IMG_9718's runup and 9741: high idle (71.5 %, 285 to
// 289 lb-ft, 1441 to 1478 rpm, 162 to 164 pph, 588 to 590 °C), the power levers slowly
// retracted through the autofeather check (82.1 % down to 66.7), the power set for it (83.3,
// 528 lb-ft, 1838 rpm), and 9737's power near 1900 rpm (85.6 to 86.2 %, 589 to 640 lb-ft, 1912
// to 1940 rpm). The ITT column is with no generator load (each clip less 45 °C a load unit;
// see GEN). The last row is past every clip, for the overspeed governor check only: the student
// in 9718 stopped at 1885 rpm, and 9737 did not do the check on camera. IMG_9731's right engine,
// alone at high idle through a left start, read lower (204 lb-ft, 569 °C, 1478 rpm, 159 pph).
const RUN = [
  [52.0, 108, 973, 104, 630],
  [66.7, 217, 1328, 135, 579],
  [69.4, 241, 1399, 141, 576],
  [71.5, 287, 1460, 163, 579],
  [73.9, 316, 1526, 166, 574],
  [75.8, 334, 1578, 173, 574],
  [77.2, 387, 1606, 190, 577],
  [79.3, 396, 1700, 189, 582],
  [82.1, 444, 1782, 206, 591],
  [83.3, 528, 1838, 228, 596],
  [85.9, 600, 1926, 257, 606],
  [86.2, 640, 1940, 261, 608],
  [89.0, 760, 2060, 295, 625], // extrapolated
  [92.0, 900, 2160, 330, 662], // extrapolated: the overspeed governor check's torque and ITT
  [96.0, 1080, 2360, 375, 705], // extrapolated: a failed overspeed governor's 2350 (the user)
];
const COLS = { trq: 1, np: 2, ff: 3, itt: 4 };
const run = (n1, k) => at(RUN.map((r) => [r[0], r[COLS[k]]]), n1);
// The N1 at which RUN's prop turns at `np` rpm, free of any governor.
const n1ForNp = (np) => at(RUN.map((r) => [r[COLS.np], r[0]]), np);

const idleN1 = (cond) => (cond === 'high' ? 71.5 : 52.0);

// LOW IDLE: N1 51.7 to 52.0 in every clip, and ITT drifting up from 608 to RUN's 630 over the
// first minute after a start. HIGH IDLE 71.5 % (9718, 9731, 9741). N1 accelerates at 2.85 %/s
// through a start and about 4 %/s from idle (9718: 53.2, 60.8, 69.3 in 4 s to high idle; 71.5,
// 76.2, 82.4, 86.2 with the power levers), and falls back fast (86.1 to 74.9 in 2 s). Torque and
// Np follow it a little behind (9718's Np to high idle: 584, 877, 1166, 1316, 1393, 1424).
const IDLE = {
  low: { n1: 52.0 },
  high: { n1: 71.5 },
  // The power lever's travel runs from LOW IDLE's N1 to NATOPS's 101.5 % maximum, and HIGH IDLE
  // adds its 19.5 % on top at the idle stop, fading out as the lever comes up (to the power
  // `fade`). An assumption fitted to the user's reading (2026-11-04): with the power levers left
  // where Runup 6 set 1900 rpm at HIGH IDLE, LOW IDLE for Runup 8 gives about 524 lb-ft, still
  // above the 460 the test needs. 9718's student read lower (372 to 388 lb-ft), having moved the
  // power levers in between.
  max: 101.5,
  fade: 2.36,
  ittDrift: { from: 608, over: 60 },
  // HIGH IDLE to LOW IDLE on the condition levers takes about 8 seconds (the user's sim
  // notes, 2026-11-08), slower than a power lever pulled back (9718's 86.1 to 74.9 in 2 s).
  n1: { rate: 2.85, runRate: 4, k: 0.9, decelTau: 1.5, idleDropTau: 2.7 },
  tau: 3,
  // Np close behind N1 under the governor: 9718's power up read N1 76.2, 82.4, 86.2 and Np
  // 1547, 1757, 1885 at the same 2-second marks, about a second behind.
  npTau: 1,
};

// What an accelerating engine adds over RUN: ITT overshoots about 20 °C for each percent a
// second (9718 to high idle: 696 °C at 4 %/s, against 590 settled) and fuel flow leads by about
// 7 pph a percent a second, and lags as much on the way down (173 at 4 %/s against 162; 143 as
// N1 fell at 5.6 %/s, against 170).
const ACCEL = { itt: 20, ff: 7, tau: 0.5 };

// Where the levers put N1: the condition lever's idle, and the power lever's share of the way
// from there to the maximum.
const leverAt = (cond, p, short = 0) => IDLE.low.n1 + (IDLE.max - IDLE.low.n1) * p
  + (idleN1(cond) - (cond === 'high' ? short : 0) - IDLE.low.n1) * (1 - p) ** IDLE.fade;
const leverN1 = (e, fx = {}) => leverAt(e.cond, e.pwr, fx.shortIdle || 0);
// The lever position that gives `n1` at a condition-lever setting (0 at or below its idle).
const leverFor = (cond, n1) => {
  if (n1 <= idleN1(cond)) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (leverAt(cond, mid) < n1) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

// A generator's load adds about 45 °C a load unit to its engine's ITT and 8 pph to its fuel
// flow: IMG_9714 614 to 657 °C at 1.00, 9715 631 to 668 at 1.00, 9716 629 to 663 at 0.75.
const GEN = { itt: 45, ff: 8, tau: 3 };

// The props. FEATHER: Np falls toward 400 rpm (9718 opened on both props feathered at low idle,
// 395 and 415 rpm, with torque up at 266 and 247 lb-ft) about as 9718's autofeathering props
// fell (1328, 1248, 1114 rpm 2 s apart; 1564 to 1100 in 10 s): a 14-second time constant, made
// 11 since the user found the sim's autofeather slightly faster (notes, 2026-11-08). The
// primary governor check, the levers at the feather detent, holds Np near 1710 (9737's 1704;
// FTI 1600 to 1800) at the same power, so torque rises (611 to 773 lb-ft). The overspeed
// governor, its test switch held, stops Np at 2000 (the FTI's 1900 to 2100; no clip shows it).
const PROP = {
  feathered: 400,
  featherTau: 11,
  featherTrq: 150, // lb-ft a feathered prop adds at low idle, fading out by 67 % N1
  detent: 1710,
  overspeed: 2000,
  // Where a failed overspeed governor lets Np go with the test switch held: 2350 rpm, as the
  // sim showed it (the user, 2026-11-08), past the primary governor's 2200 (NATOPS §2.8.3).
  osgFailed: 2350,
};

// ENG AUTO IGN on: AUTO IGNITION ARMED above about 410 lb-ft, the igniters firing (IGN IND)
// below it (9718: both IGN IND at 372 and 388 lb-ft, both ARMED at 547 and 552). Autofeather
// test held: each AUTOFEATHER ARMED light while the OTHER engine is above 410, so pulling one
// power lever back puts out the other side's light first; below about 225 lb-ft the armed
// engine's prop feathers and its light flashes (9718: feathering began between 223 and 216 on
// the left, 235 and 214 on the right; FTI 410 ±50 and 200 ±40).
// Each engine's two torque switches are drawn afresh for every autofeather test, within the
// FTI's tolerances: a normal distribution cut off at the tolerance, its standard deviation half
// the tolerance, so values near 410 and 200 come up most (the user, 2026-11-04). An unfeathering
// engine's switch resets 35 lb-ft above where it tripped (9718's 225 and 260; a guess).
const AUTO = { arm: 410, armTol: 50, feather: 200, featherTol: 40, reset: 35 };
const truncNormal = (mean, tol, rand = Math.random) => {
  for (;;) {
    const z = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    const x = z * (tol / 2);
    if (Math.abs(x) <= tol) return mean + x;
  }
};
const drawAuto = (rand) => ({ arm: truncNormal(AUTO.arm, AUTO.armTol, rand),
  feather: truncNormal(AUTO.feather, AUTO.featherTol, rand) });
// An engine's switch points: as drawn for this test, else the FTI's nominal figures.
const autoOf = (state, side) => (state.auto && state.auto[side]) || AUTO;

// The prop deice ammeter: 16.5 A whenever it is on (IMG_9719, 9741), which costs each generator
// about 0.035 of load (9719: 0.29 to 0.25 when it went off; 9741 0.26 at high idle against
// 9718's 0.23). With the avionics on after the start, the bus takes 0.23 a generator (9718,
// 9737). The other anti-ice loads, and the boots on the pneumatic gauge, no clip shows.
const DEICE = { amps: 16.5, load: 0.07 };
const BUS_RUNNING = 0.46;

// Fuel quantity, pounds a side: 1194 and 1194 at the start of every start clip (IMG_9710,
// 9714), 1180 and 1172 as 9718's runup began. It goes down by what the fuel flow burns (9718:
// 1180 to 1174 in 124 s at 160 to 260 pph).
const FUEL = { cold: { L: 1194, R: 1194 }, runup: { L: 1180, R: 1172 } };

// The FUEL QUANTITY TOTAL-NACELLE switch (NATOPS §2.9.8): at NACELLE each gauge shows its nacelle
// tank only. A nacelle tank holds 61 gallons and is used down to 42, then kept between 42 and 51
// by its transfer pump until the wing tanks are empty (NATOPS §2.9); at the FTI's JP-5 6.75 lb a
// gallon (ME FTI, fuel planning). Taken as full at the start.
const NACELLE = { full: 61 * 6.75, low: 42 * 6.75 };
const nacelleOf = (total, burned) => (total <= NACELLE.low ? total : Math.max(NACELLE.low, NACELLE.full - burned));

// The fuel panel's switches, for After Start 6 and 7, and the lights they light, from the FTI's
// action (no clip shows them): a boost pump off with the crossfeed at AUTO lights its FUEL
// PRESSURE light, which goes out "almost instantly" as the crossfeed valve opens and lights
// FUEL CROSSFEED (taken as half a second); the pump back on closes the valve and puts the light
// out, and CLOSED then AUTO resets the system. A transfer pump put to AUTO with the TRANSFER
// TEST switch held flickers its NO FUEL TRANSFER light (taken as 0.4 s).
const XFEED = { opens: 0.5, flicker: 0.4 };
const FUEL_SYS = () => ({ xfeed: 'auto', boost: { L: true, R: true }, open: false, openT: 0, flicker: [] });

// Oil pressure follows N1, a little behind it: motoring (IMG_9714 11 psi at 10.4 %, 23 at 17.4)
// and accelerating (36 at 19.4, 82 at 29.9, 101 from 47), and a little lower as the oil warms
// (9716's right engine 94 psi at 57 °C, 9719's 93 to 95 at 55 to 61). High idle 97 to 99
// (9718, 9731, 9741). A stopped engine reads 4 psi (every cold clip). Oil temperature climbs from 30 °C by about a degree in 15 s at first
// (9714 31 at 32 s, 32 at 46 s) toward the 55 to 61 °C of engines running for some minutes.
const OIL = {
  press: [[0, 4], [10.4, 11], [14.4, 17], [17.4, 23], [19.4, 36], [24.3, 53], [29.9, 82],
    [35.2, 95], [41, 99], [47, 101], [52, 101], [71.5, 99]],
  warmDrop: 0.25, // psi per °C above 30, at idle
  pressTau: 1,
  temp: { running: 62, tau: 400, coolTau: 900 },
};

// The bleed-air gauges, off the higher of the two engines' N1: 0.0 through the whole start
// (IMG_9712 hung at 31 %, 9714 at 29.9 %), coming up as N1 reaches idle (9714 1.8 in. Hg and
// 0.9 psi at 51.1 %, then 4.3 and 6.2), 4.3 and 6.2 at low idle on one engine or two (9715,
// 9716, 9719), 5.9 and 18.0 at high idle (9718, 9731, 9741).
const BLEED = {
  suction: [[48, 0], [51.5, 4.3], [71.5, 5.9]],
  pneumatic: [[48, 0], [52, 6.2], [71.5, 18.0]],
  tau: 1.5,
  oxygen: 1550, // psi, on every clip
};

// The battery and the generators. A battery start pulls the battery to about 21 V on the
// starter, 19.5 once the fuel is in, recovering to 21 as N1 nears 50 %, with the ammeter pegged
// at -60 (IMG_9713, 9714, 9716); motoring dry it sags further (9710, about 0.035 V/s). With a
// generator on line the other engine's start holds 23.4 V and -57 A, the ammeter swinging to
// +60 as the start accelerates (9715). No starter: 23.7 V and -22 A on the battery alone (9715,
// 9728), lower for a battery a start has drawn on (9716, 23.0 after its start). Charging: 27.9 V
// with one generator, 28.1 with two, the ammeter pegged at +60 the whole time (9714, 9716);
// 28.2 V and 0 A charged (9719, 9741).
//
// The generators SHARE one load, split evenly between those on line (IMG_9716: the right alone
// 0.75, then 0.38 and 0.39 the moment the left joins, the total unchanged; the user's reading,
// 2026-11-03). The load is the bus's own plus what the battery is owed, which grows with every
// second a battery start runs its starter. Two clips fix both: 9716's 25.5 s of starter left
// one generator at 0.75, 9714's 42 s at 1.00, the end of the gauge; so about 0.36 for the bus
// through a start and 0.0152 for each starter-second. (Later, with more switched on, 9718 and
// 9741 read 0.23 to 0.26 a generator, both on and the battery charged; the model runs only for
// the starts.) It is not the engine's speed: N1 is raised to carry a high load, not the reverse.
// A generator carrying the other engine's start reads 1.00 (9715). The battery is owed for every
// second its starter ran, generator-assisted or not: 9716's is a battery start, and that the
// FTI's assisted left start leaves the same is the user's reading of it (2026-11-04: about 0.75
// with the right generator on after the left start, 0.38 a side once the left joins). Paid back
// from the moment a generator is on line, on a 19-second time constant, so a lone generator
// after a 23 to 29 s start is below .5 (Start step 10) about 20 s after it came on (the user's
// figure, 2026-11-05). That overrides 9716, whose total held 0.75 to 0.77 for the 20 s it
// showed after the generator came on, the ammeter pegged throughout; no clip times the fall
// (filming-list.md item 1).
const ELEC = {
  start: { motoring: 21.2, fuelled: 19.5, recovered: 21.0, amps: -60, drySag: 0.035, sagAfter: 15 },
  assisted: { volts: 23.4, amps: -57, charged: 27.0 },
  battery: { volts: 23.7, amps: -22, drop: 2.6 },
  charging: { one: 27.9, two: 28.1, full: 28.2, amps: 60, taper: 0.03 },
  load: { bus: 0.36, perStarterSecond: 0.0152, max: 0.8, full: 1.0 },
  rechargeTau: 19, // seconds; what the battery is owed falls on this with a generator on line
  tau: 0.5,
};

// After Start 2: with its PRESS FOR VOLTS pushbutton pressed, each volt-loadmeter reads its bus
// voltage (NATOPS §2.10.5), 28.25 ±0.8 V (ME FTI, After Start 2; the user, 2026-11-04: the gauges
// should read 28.25). The button is held in the aircraft; here a click holds it 3 seconds (the
// user).
const VOLTS = { reads: '28.25', held: 3 };

// The anti-ice heaters' generator load, shared between the generators on line. No clip shows
// them (filming-list.md item 31): the site's guesses, small beside the bus, and none for the lip
// boots, which work only in flight (NATOPS §2.20.3.2).
const HEAT_LOAD = { pitot: 0.04, stall: 0.02, lip: 0, vent: 0.03, wshld: 0.1 };

// Chaos (t44cFaults.js): the faults drawn so far on this card, each `{ id, params, seen }`, as
// many at once as the chaos slider draws (at 100 percent, one on every step that has any; the
// user, 2026-11-08). `drawn` is a fault's parameters while it is drawn at all. A light that
// fails to come on is dark from the start; one that stays lit is lit only once the fault is
// `seen`, when it should have gone out.
const faultsOf = (state) => state.faults || [];
const faultOf = (state, test) => faultsOf(state).find(test) || null;
const drawn = (state, id) => { const f = faultOf(state, (x) => x.id === id); return f ? f.params : null; };
const drawnLike = (state, prefix) => { const f = faultOf(state, (x) => x.id.startsWith(prefix)); return f ? f.params : null; };

// The boost pumps drawing on the battery, less a dead one (chaos).
const pumpsOn = (state) => {
  if (!state.fuelSys) return 2;
  const nd = drawn(state, 'bs-boost-nodraw');
  return SIDES.filter((k) => state.fuelSys.boost[k] && !(nd && nd.side === k)).length;
};

// Marks each drawn fault seen once its `when` holds.
export function faultSeen(state) {
  const list = faultsOf(state);
  let changed = false;
  const next = list.map((f) => {
    if (f.seen) return f;
    const def = faultById(f.id);
    if (!(def && def.when && def.when(state, f.params))) return f;
    changed = true;
    return { ...f, seen: true };
  });
  return changed ? { ...state, faults: next } : state;
}

// The engine side of a fault, for stepEngine: its own engine's.
const engineFx = (state, side) => {
  const fx = {};
  if (side === 'R' && drawn(state, 'sl-itt-rise')) fx.ittAdd = 290;
  const mf = drawn(state, 'er-mf-nofeather');
  if (mf && mf.side === side) fx.noManualFeather = true;
  const slow = drawn(state, 'er-mf-slow');
  if (slow && slow.side === side) fx.slowUnfeather = true;
  if (drawn(state, 'er-short-idle')) fx.shortIdle = 11;
  if (drawn(state, 'er-osg-fail')) fx.osgFail = true;
  const det = drawn(state, 'er-pgov-detent');
  if (det && det.side === side) fx.detent = det.np;
  const ret = drawn(state, 'er-pgov-return');
  if (ret && ret.side === side) fx.returnCap = 1770;
  const nf = drawn(state, 'er-nofeather');
  if (nf && nf.side === side) fx.noFeather = true;
  return fx;
};

// --------------------------------------------------------------------------------------------
// State

const cold = () => ({
  starter: 'off', // 'on' (start and ignition), 'only' (STARTER ONLY: motoring, no ignition), 'off'
  starterT: 0, // seconds since the starter was engaged
  cond: 'cutoff', // 'cutoff' | 'low' | 'high'
  fuelT: 0, // seconds of fuel before light-off
  lit: false,
  litT: 0,
  everLit: false,
  aborted: false,
  scenario: 'normal',
  plateauOffset: 0, // N1 at light-off above the starter's plateau, faded out as the start runs
  gen: false,
  genG: 0, // the generator's load on its engine, eased in
  pwr: 0, // the power lever, 0 at IDLE to 1 full forward
  pwrGoal: 0,
  pwrRate: null, // lever travel a second while it is being eased, or null for at once
  prop: 'fwd', // 'fwd' | 'feather' | 'detent' (the primary governor check)
  osgTest: false,
  autoIgn: false,
  feathering: false, // the autofeather has the prop
  dn1: 0, // N1's rate of change, %/s, smoothed
  dnp: 0, // Np's, rpm/s
  n1: 0,
  itt: AMBIENT,
  trq: 0,
  np: 0,
  ff: 0,
  oilP: 0,
  oilT: AMBIENT,
});

// A started engine settled at an idle: the left start finds the right engine at HIGH IDLE,
// where Start step 8 put it and step 23 takes it back to LOW IDLE (IMG_9731's right engine sat
// at 71.5 % through the left start).
const running = (cond = 'high', oilT = 37) => ({
  ...cold(),
  cond,
  lit: true,
  everLit: true,
  litT: 999,
  n1: IDLE[cond].n1,
  itt: run(IDLE[cond].n1, 'itt'),
  trq: run(IDLE[cond].n1, 'trq'),
  np: run(IDLE[cond].n1, 'np'),
  ff: run(IDLE[cond].n1, 'ff'),
  oilT, // 37: IMG_9715's right engine, a few minutes after its start
  oilP: 99,
});

// `kind`: 'cold' (both engines cold, the right start's), 'rightRunning' (the left start's) or
// 'runup' (both at LOW IDLE, both generators on and the battery charged: the Engine Runup and
// the anti-ice/deice check; oil 48 and 58 °C as 9718 began).
// `starting` is the engine the procedure starts, which takes the scenario. `elec` is the
// battery and the bleed-air gauges, shared by both engines; `deficit` is what the battery is
// owed, in generator load (0 charged, 0.39 after a 25-second battery start). `lastStarter` is the starter whose time the
// stopwatch shows under its own; `clock` is the elapsed time clock the student starts and stops.
export function initial(kind = 'cold', scenario = 'normal') {
  // Before Start: both engines cold, the boost pumps and the battery still off (Before Start 8
  // turns them on). The boost pumps draw on the battery ammeter from the hot battery bus.
  if (kind === 'beforeStart') {
    const s = initial('cold', scenario);
    return { ...s, starting: null, fuelSys: { ...FUEL_SYS(), boost: { L: false, R: false } },
      elec: { ...s.elec, battery: false, amps: 0 } };
  }
  if (kind === 'runup' || kind === 'afterStart') {
    const L = { ...running('low', 48), gen: true, genG: BUS_RUNNING / 2 };
    const R = { ...running('low', 58), gen: true, genG: BUS_RUNNING / 2 };
    return {
      t: 0, starting: null, engines: { L, R }, fuel: { ...FUEL.runup }, afTest: false, script: null,
      fuelSys: FUEL_SYS(),
      // After Start finds the avionics off; the runup finds them on (After Start 3).
      elec: { volts: ELEC.charging.full, amps: 0, deficit: 0, battery: true, heat: {},
        bus: kind === 'afterStart' ? ELEC.load.bus : BUS_RUNNING, propDeice: false,
        suction: at(BLEED.suction, IDLE.low.n1), pneumatic: at(BLEED.pneumatic, IDLE.low.n1) },
      lastStarter: null, clock: { running: false, t: 0 },
    };
  }
  const right = kind === 'rightRunning' ? running() : cold();
  const left = cold();
  const starting = kind === 'rightRunning' ? 'L' : 'R';
  const engines = { L: left, R: right };
  engines[starting] = { ...engines[starting], scenario };
  const base = { volts: ELEC.battery.volts, amps: ELEC.battery.amps, deficit: 0, bus: ELEC.load.bus, propDeice: false,
    battery: true, heat: {} };
  const elec = kind === 'rightRunning'
    // The right start's battery paid back by Start step 10, its generator off below .5.
    ? { ...base, suction: at(BLEED.suction, IDLE.high.n1), pneumatic: at(BLEED.pneumatic, IDLE.high.n1) }
    : { ...base, suction: 0, pneumatic: 0 };
  return { t: 0, starting, engines, elec, fuel: { ...FUEL.cold }, afTest: false, script: null,
    fuelSys: FUEL_SYS(), lastStarter: null, clock: { running: false, t: 0 } };
}

// The left start straight after the right one: the right engine as the student left it, the
// left cold with the scenario.
export function startLeftFrom(state, scenario = 'normal') {
  return { ...state, starting: 'L', engines: { ...state.engines, L: { ...cold(), scenario } } };
}

const scen = (e) => (e.scenario === 'hot' ? HOT : e.scenario === 'hung' ? HUNG : NORMAL);

// --------------------------------------------------------------------------------------------
// Inputs

// One input: `{ side, starter }`, `{ side, cond }`, `{ side, gen }`, `{ side, pwr, rate }`,
// `{ side, prop }`, `{ side, osgTest }`, `{ side, autoIgn }`, `{ afTest }`, `{ propDeice }`,
// `{ script }` or `{ clock: 'toggle' }`. `side` 'starting' is whichever engine the procedure is
// starting (the Abnormal Start EP's steps name no side), 'both' both. The clock is the elapsed
// time key: a press stops it if it is running, else starts it again from zero, as a start is
// timed afresh. A script is a list of `{ do: [inputs], if? }`, `{ wait: seconds }` and
// `{ until: (state) => boolean, max: seconds }`, run in order as the clock goes.
export function input(state, event) {
  if (event.clock) {
    return { ...state, clock: state.clock.running ? { ...state.clock, running: false } : { running: true, t: 0 } };
  }
  if (event.script) return { ...state, script: { steps: event.script, i: 0, t: 0 } };
  // A discrepancy found mid-test: the test stopped there, the power levers back to IDLE and the
  // feathering props released (the switches stay, so the test can be run again).
  if (event.stopTest) {
    const engines = Object.fromEntries(SIDES.map((k) => [k, { ...state.engines[k], pwr: 0, pwrGoal: 0, pwrRate: null, feathering: false }]));
    return { ...state, script: null, highlight: [], engines };
  }
  // The gauges to ring while a scripted check runs (by their poster wordings), in place of the
  // click's own; [] rings none, null hands back to the click's.
  if (event.highlight !== undefined) return { ...state, highlight: event.highlight };
  // A PRESS FOR VOLTS button held: that volt-loadmeter reads bus volts for a few seconds.
  if (event.pressVolts) {
    return { ...state, voltsUntil: { ...(state.voltsUntil || {}), [event.pressVolts]: state.t + VOLTS.held } };
  }
  // The battery switch; the annunciator lamp test held; FAULT WARNING flashing until pressed;
  // the fire detector test switch's zone (0 OFF); an anti-ice heater on or off.
  if (event.battery !== undefined) return { ...state, elec: { ...state.elec, battery: event.battery } };
  if (event.annTest !== undefined) return { ...state, annTest: event.annTest };
  // The annunciator DIM knob checked (annLevel); the FUEL QUANTITY switch.
  if (event.annDim) return { ...state, dimFrom: state.t };
  if (event.qtySel) return { ...state, qtySel: state.qtySel === 'nacelle' ? 'total' : 'nacelle' };
  if (event.faultWarn !== undefined) return { ...state, faultWarn: event.faultWarn };
  if (event.fireZone !== undefined) return { ...state, fireZone: event.fireZone };
  if (event.heat) return { ...state, elec: { ...state.elec, heat: { ...(state.elec.heat || {}), [event.heat]: true } } };
  if (event.heatOff) return { ...state, elec: { ...state.elec, heat: {} } };
  if (event.xfeed || event.boost || event.flicker) {
    const f = { ...(state.fuelSys || FUEL_SYS()) };
    if (event.xfeed) {
      // 'reset' is CLOSED then AUTO, one movement of the switch; OPEN opens the valve whatever
      // the pressure (NATOPS §2.9.6.1).
      f.xfeed = event.xfeed === 'reset' ? 'auto' : event.xfeed;
      f.open = event.xfeed === 'open';
    }
    if (event.boost) f.boost = { ...f.boost, ...event.boost };
    // Both boost pumps on again: the valve closes and FUEL CROSSFEED goes out (the user,
    // 2026-11-04).
    if (f.boost.L && f.boost.R) f.open = false;
    if (event.boost && Object.values(event.boost).includes(false)) f.openT = 0;
    // Chaos: a transfer pump that does not flicker its light.
    const tp = drawn(state, 'as-transfer');
    const dark = tp && event.flicker === `${tp.side === 'L' ? 'LH' : 'RH'} NO FUEL TRANSFER`;
    if (event.flicker && !dark) f.flicker = [...f.flicker, { light: event.flicker, until: state.t + XFEED.flicker }];
    return { ...state, fuelSys: f };
  }
  if (event.afTest !== undefined) return { ...state, afTest: event.afTest };
  // New switch points for each engine (`rand` for tests).
  if (event.drawAuto) {
    const rand = typeof event.drawAuto === 'function' ? event.drawAuto : Math.random;
    const auto = { L: drawAuto(rand), R: drawAuto(rand) };
    // Chaos: a torque switch out of tolerance.
    const sw = drawn(state, 'er-swap');
    if (sw) auto[sw.side] = { ...auto[sw.side], arm: sw.arm };
    const fl = drawn(state, 'er-flash');
    if (fl) auto[fl.side] = { ...auto[fl.side], feather: fl.feather };
    return { ...state, auto };
  }
  if (event.propDeice !== undefined) return { ...state, elec: { ...state.elec, propDeice: event.propDeice } };
  if (event.side === 'both') {
    return ['L', 'R'].reduce((s2, side) => input(s2, { ...event, side }), state);
  }
  const side = event.side === 'starting' ? state.starting : event.side;
  const e = { ...state.engines[side] };
  if (event.starter) {
    if (e.starter === 'off' && event.starter !== 'off') e.starterT = 0;
    e.starter = event.starter;
  }
  if (event.cond) {
    if (e.cond === 'cutoff' && event.cond !== 'cutoff') e.fuelT = 0;
    // Fuel cut on an engine being started: the start is aborted.
    if (event.cond === 'cutoff' && e.cond !== 'cutoff' && e.starter !== 'off') e.aborted = true;
    // HIGH IDLE to LOW IDLE: N1 comes down at the condition lever's pace (IDLE.n1.idleDropTau).
    if (e.cond === 'high' && event.cond === 'low') e.idleDrop = true;
    e.cond = event.cond;
    if (event.cond === 'cutoff') e.lit = false;
  }
  // Chaos: a generator that does not come on line.
  const out = drawn(state, `sl-gen-out-${side}`);
  if (event.gen !== undefined && !(out && event.gen)) e.gen = event.gen;
  if (event.pwr !== undefined || event.pwrNp !== undefined) {
    // Said as the N1 wanted at the condition lever's present setting (`pwr`), or the prop rpm
    // wanted (`pwrNp`), and a rate in percent N1 a second; kept as the lever's position, which
    // stays put if the condition lever moves.
    const n1 = event.pwrNp !== undefined ? n1ForNp(event.pwrNp) : event.pwr;
    e.pwrGoal = n1 ? leverFor(e.cond, n1) : 0;
    e.pwrRate = event.rate ? event.rate / (IDLE.max - IDLE.low.n1) : null;
    if (!e.pwrRate) e.pwr = e.pwrGoal;
  }
  // The lever stopped where it is (the student stops pulling once the light flashes).
  if (event.pwrHold) e.pwrGoal = e.pwr;
  if (event.bus !== undefined) return { ...state, elec: { ...state.elec, bus: event.bus } };
  if (event.prop) e.prop = event.prop;
  if (event.prop === 'detent') e.visitedDetent = true;
  if (event.prop === 'feather') e.visitedFeather = true;
  if (event.osgTest !== undefined) e.osgTest = event.osgTest;
  if (event.autoIgn !== undefined) e.autoIgn = event.autoIgn;
  const lastStarter = event.starter && event.starter !== 'off' ? side : state.lastStarter;
  return { ...state, lastStarter, engines: { ...state.engines, [side]: e } };
}

// --------------------------------------------------------------------------------------------
// Time

// `load` is this engine's generator load (0 off line).
function stepEngine(e0, dt, load = 0, fx = {}) {
  const e = { ...e0 };
  const n1Before = e.n1;
  const npBefore = e.np;
  // The power lever, moved at its own pace when it is being eased.
  if (e.pwr !== e.pwrGoal) {
    const d = e.pwrRate ? e.pwrRate * dt : Infinity;
    e.pwr = e.pwr < e.pwrGoal ? Math.min(e.pwrGoal, e.pwr + d) : Math.max(e.pwrGoal, e.pwr - d);
  }
  const motoring = e.starter !== 'off';
  if (motoring) e.starterT += dt;
  // A no start with no fuel flow: the condition lever in, and nothing reaching the engine.
  const fuel = e.cond !== 'cutoff' && e.scenario !== 'noFuel';
  // The fuel, not the starter, lifts N1 off the plateau before light-off.
  const plateau = fuel && e.starter === 'on' ? MOTOR.fuelled : MOTOR.plateau;
  const plateauTau = fuel && e.n1 >= MOTOR.plateau - 0.5 ? MOTOR.fuelledTau : MOTOR.tau;

  // Light-off: fuel for long enough, with the engine turning and the igniters firing. STARTER
  // ONLY gives no ignition, so fuel then never lights.
  if (fuel && !e.lit) {
    e.fuelT += dt;
    const lights = e.scenario !== 'noLightoff' && e.starter === 'on' && e.n1 > 10;
    if (lights && e.fuelT >= scen(e).lightoff) {
      e.lit = true;
      e.everLit = true;
      e.litT = 0;
      e.plateauOffset = Math.max(0, e.n1 - MOTOR.plateau);
      e.stretch = e.scenario === 'long' ? Math.max(1, (LONG.to50 - e.starterT) / T50) : 1;
    }
  }
  if (e.lit) e.litT += dt;

  e.genG = toward(e.genG, load, GEN.tau, dt);
  const genItt = GEN.itt * e.genG;
  const genFf = GEN.ff * e.genG;

  if (e.lit) {
    const s = scen(e);
    // A long start runs the same curves slower (LONG).
    const t = e.litT / (e.stretch || 1);
    // Where N1 is going: the condition lever's idle, or higher where the power lever asks.
    const idle = { n1: leverN1(e, fx) };
    const inTable = (pts) => pts && t <= end(pts) && e.cond !== 'high' && !e.pwr;

    // N1
    const n1Table = s.n1 || NORMAL.n1;
    if (inTable(n1Table)) {
      // Faded over the first 3 s, by when the table has climbed past where it started.
      e.n1 = Math.max(at(n1Table, t), at(n1Table, 0) + e.plateauOffset * Math.max(0, 1 - t / 3));
    } else if (s === HUNG) {
      e.n1 = toward(e.n1, HUNG.beyond.n1[0], HUNG.beyond.n1[1], dt);
    } else if (e.n1 < idle.n1) {
      const rate = e.n1 >= 50 ? IDLE.n1.runRate : IDLE.n1.rate;
      e.n1 = Math.min(idle.n1, e.n1 + Math.min(rate, IDLE.n1.k * (idle.n1 - e.n1)) * dt);
    } else {
      if (e.idleDrop && (e.pwr > 0 || e.n1 < idle.n1 + 0.3)) e.idleDrop = false;
      e.n1 = toward(e.n1, idle.n1, e.idleDrop ? IDLE.n1.idleDropTau : IDLE.n1.decelTau, dt);
    }
    e.dn1 = toward(e.dn1, (e.n1 - n1Before) / dt, ACCEL.tau, dt);
    const accel = s !== HUNG && !inTable(NORMAL.n1);

    // ITT
    if (inTable(s.itt)) {
      e.itt = at(s.itt, t) + genItt;
    } else if (s === HOT) {
      e.itt = Math.min(HOT.beyond.max, e.itt + HOT.beyond.rate * dt);
    } else if (s === HUNG) {
      e.itt = toward(e.itt, HUNG.beyond.itt[0], HUNG.beyond.itt[1], dt);
    } else {
      const settledItt = run(e.n1, 'itt');
      const drift = e.n1 > IDLE.low.n1 + 1 ? settledItt
        : IDLE.ittDrift.from + (settledItt - IDLE.ittDrift.from)
          * Math.min(1, Math.max(0, t - end(NORMAL.itt)) / IDLE.ittDrift.over);
      const over = accel ? ACCEL.itt * Math.max(0, e.dn1) : 0;
      // A chaos ITT rise grows with the generator's load (the left start's, on the right engine).
      e.itt = toward(e.itt, drift + genItt + over + (fx.ittAdd || 0) * Math.min(1, e.genG), IDLE.tau, dt);
    }

    // Torque and Np, through the prop
    const free = run(e.n1, 'np');
    let npGoal = free;
    if (e.prop === 'detent') npGoal = Math.min(free, fx.detent || PROP.detent);
    // Chaos: a test solenoid that does not reset the overspeed governor (see PROP.osgFailed).
    if (e.osgTest) npGoal = Math.min(npGoal, fx.osgFail ? PROP.osgFailed : PROP.overspeed);
    if (fx.returnCap && e.visitedDetent && e.prop === 'fwd') npGoal = Math.min(npGoal, fx.returnCap);
    const feathered = (e.prop === 'feather' && !fx.noManualFeather) || (e.feathering && !fx.noFeather);
    // Chaos: a prop slow to come out of feather (Runup 4) unfeathers on a longer time constant.
    const unfeatherTau = fx.slowUnfeather && e.visitedFeather && e.prop === 'fwd' ? 8 : IDLE.npTau;
    // The same power through a prop held slower is more torque.
    const trqGoal = run(e.n1, 'trq') * (feathered ? 1 : free / Math.max(1, npGoal))
      + (e.prop === 'feather' ? PROP.featherTrq * Math.min(1, Math.max(0, 1 - (e.n1 - IDLE.low.n1) / 15)) : 0);
    for (const k of ['trq', 'np']) {
      const pts = s[k] || NORMAL[k];
      if (inTable(pts)) e[k] = at(pts, t);
      else if (s === HUNG) e[k] = toward(e[k], HUNG.beyond[k][0], HUNG.beyond[k][1], dt);
      else if (k === 'np' && feathered) e.np = toward(e.np, PROP.feathered, PROP.featherTau, dt);
      else e[k] = toward(e[k], k === 'np' ? npGoal : trqGoal, k === 'np' ? unfeatherTau : IDLE.tau, dt);
    }

    // Fuel flow
    // The hot start's is one figure, held until the engine is near idle (past the clip).
    const ffPts = Array.isArray(s.ff) ? s.ff : NORMAL.ff;
    if (s === HOT && e.n1 < 50) e.ff = toward(e.ff, HOT.ff, FF_PRIMING.tau, dt);
    else if (inTable(ffPts)) e.ff = toward(e.ff, at(ffPts, t) + genFf, 0.5, dt);
    else if (s === HUNG) e.ff = toward(e.ff, HUNG.beyond.ff[0], HUNG.beyond.ff[1], dt);
    else e.ff = toward(e.ff, run(e.n1, 'ff') + genFf + (accel ? ACCEL.ff * e.dn1 : 0), IDLE.tau / 2, dt);
  } else {
    // Not burning: motoring on the starter, or running down.
    // A no start with no rotation: the starter engaged and the igniters firing, nothing turning.
    const turns = motoring && e.starterT > MOTOR.delay && e.scenario !== 'noRotation';
    if (turns) {
      e.n1 = e.n1 <= plateau ? toward(e.n1, plateau, plateauTau, dt) : toward(e.n1, plateau, SHUTDOWN.n1.onStarter, dt);
    } else if (!motoring) {
      e.n1 = toward(e.n1, 0, SHUTDOWN.n1.off, dt);
    }
    const spinning = turns;
    e.np = toward(e.np, spinning ? MOTOR.np : 0, SHUTDOWN.np, dt);
    e.trq = toward(e.trq, spinning ? MOTOR.trq : 0, SHUTDOWN.trq, dt);
    e.itt = e.itt > SHUTDOWN.itt.target + 10
      ? toward(e.itt, SHUTDOWN.itt.target, SHUTDOWN.itt.tau, dt)
      : toward(e.itt, AMBIENT, SHUTDOWN.itt.coolTau, dt);
    if (fuel) {
      const ff = e.scenario === 'hot' ? HOT.ff : FF_PRIMING.target;
      e.ff = toward(e.ff, ff, FF_PRIMING.tau, dt);
    } else {
      e.ff = toward(e.ff, 0, SHUTDOWN.ff, dt);
    }
  }

  e.dnp = toward(e.dnp, (e.np - npBefore) / dt, ACCEL.tau, dt);

  // Oil, off N1 whatever the engine is doing.
  const warm = e.n1 > 45 ? OIL.warmDrop * Math.max(0, e.oilT - AMBIENT) : 0;
  e.oilP = toward(e.oilP, Math.max(0, at(OIL.press, e.n1) - warm), OIL.pressTau, dt);
  e.oilT = e.lit ? toward(e.oilT, OIL.temp.running, OIL.temp.tau, dt) : toward(e.oilT, AMBIENT, OIL.temp.coolTau, dt);
  return e;
}

// One generator's load: full while it carries the other engine's start, else its even share of
// the bus (with the prop deice, if it is on) and of what the battery is owed.
const genLoad = (e, otherStarting, el, online, heat = 0) => {
  if (!e.gen) return 0;
  if (otherStarting) return ELEC.load.full;
  const bus = (el.bus ?? ELEC.load.bus) + (el.propDeice ? DEICE.load : 0) + heat;
  return Math.min(ELEC.load.full, (bus + el.deficit) / Math.max(1, online));
};
// The heaters on, less a dead one and plus lip boots heating on the ground (chaos).
const heatOf = (state) => Object.keys((state.elec && state.elec.heat) || {}).reduce((sum, h) => {
  const dead = drawnLike(state, 'ai-heat-dead');
  if (dead && dead.heater === h) return sum;
  return sum + (h === 'lip' && drawn(state, 'ai-lip-rise') ? 0.06 : HEAT_LOAD[h] || 0);
}, 0);
const loadsOf = (state) => {
  const { L, R } = state.engines;
  const online = L.gen + R.gen;
  const heat = heatOf(state);
  const loads = {
    L: genLoad(L, R.starter !== 'off', state.elec, online, heat),
    R: genLoad(R, L.starter !== 'off', state.elec, online, heat),
  };
  // Chaos: the loads split unevenly, or high.
  const split = drawn(state, 'sl-gen-split') || drawn(state, 'as-load-split');
  if (split && L.gen && R.gen) {
    const other = split.side === 'L' ? 'R' : 'L';
    loads[split.side] += 0.12;
    loads[other] = Math.max(0, loads[other] - 0.12);
  }
  if (drawn(state, 'as-load-high')) for (const k of SIDES) if (state.engines[k].gen) loads[k] += 0.33;
  return loads;
};

function stepElec(el, engines, dt, pumps = 2) {
  const { L, R } = engines;
  const online = L.gen || R.gen;
  const starter = [L, R].find((e) => e.starter !== 'off');
  let volts;
  let amps;
  let { deficit } = el;
  if (starter) {
    deficit = Math.min(ELEC.load.max, deficit + ELEC.load.perStarterSecond * dt);
  }
  if (starter && online) {
    // Generator assisted: the battery charging as the start accelerates.
    const f = starter.lit ? Math.min(1, Math.max(0, (starter.n1 - 20) / 15)) : 0;
    volts = ELEC.assisted.volts + (ELEC.assisted.charged - ELEC.assisted.volts) * f;
    amps = ELEC.assisted.amps + (ELEC.charging.amps - ELEC.assisted.amps) * f;
  } else if (starter) {
    const s = ELEC.start;
    if (starter.lit) volts = s.fuelled + (s.recovered - s.fuelled) * Math.min(1, Math.max(0, (starter.n1 - 25) / 25));
    else if (starter.cond !== 'cutoff' && starter.starter === 'on') volts = s.fuelled;
    else volts = s.motoring - s.drySag * Math.max(0, starter.starterT - s.sagAfter);
    amps = s.amps;
  } else if (online) {
    const c = ELEC.charging;
    deficit *= Math.exp(-dt / ELEC.rechargeTau);
    if (deficit < 1e-4) deficit = 0;
    const owed = Math.min(1, deficit / c.taper); // pegged at +60 until nearly paid back
    volts = c.full - ((L.gen && R.gen ? c.full - c.two : c.full - c.one) * owed);
    amps = c.amps * owed;
  } else {
    volts = ELEC.battery.volts - ELEC.battery.drop * deficit;
    // The -22 A of the clips is with both boost pumps on (Before Start 8d leaves them so): taken as
    // 11 A a pump, the site's split.
    amps = ELEC.battery.amps * (pumps / 2);
  }
  // Bleed air from whichever engine is turning faster.
  const n1 = Math.max(L.n1, R.n1);
  return {
    ...el,
    volts: toward(el.volts, volts, ELEC.tau, dt),
    amps: toward(el.amps, amps, ELEC.tau, dt),
    deficit,
    suction: toward(el.suction, at(BLEED.suction, n1), BLEED.tau, dt),
    pneumatic: toward(el.pneumatic, at(BLEED.pneumatic, n1), BLEED.tau, dt),
  };
}

function stepFuelSys(f, h, t, noOpen = null) {
  if (!f) return f;
  // Chaos: no open signal from one side (After Start 7).
  const off = SIDES.some((k) => !f.boost[k] && k !== noOpen);
  const openT = off && f.xfeed === 'auto' && !f.open ? f.openT + h : f.openT;
  return {
    ...f,
    openT,
    open: f.open || (off && f.xfeed === 'auto' && openT >= XFEED.opens),
    flicker: f.flicker.filter((x) => x.until > t),
  };
}

// The autofeather, with its test switch held: each engine armed while the other is above
// AUTO.arm, and an armed engine's prop feathering below AUTO.feather until its torque is back
// above AUTO.unfeather.
const armed = (state, side) => {
  const other = side === 'L' ? 'R' : 'L';
  return state.afTest && state.engines[other].trq > autoOf(state, other).arm;
};
function autofeather(state) {
  const engines = { ...state.engines };
  for (const side of SIDES) {
    const e = engines[side];
    const on = armed(state, side) && e.lit;
    const { feather } = autoOf(state, side);
    const feathering = on && (e.feathering ? e.trq < feather + AUTO.reset : e.trq < feather);
    if (feathering !== e.feathering) engines[side] = { ...e, feathering };
  }
  return { ...state, engines };
}

// A script's next steps, as far as the clock has reached.
function runScript(state, h) {
  let s = state;
  for (let guard = 0; s.script && guard < 50; guard += 1) {
    const { steps, i, t } = s.script;
    const st = steps[i];
    if (!st) return { ...s, script: null };
    if (st.do) {
      const apply = !st.if || st.if(s);
      const next = { ...s, script: { steps, i: i + 1, t: 0 } };
      s = apply ? st.do.reduce(input, next) : next;
    } else if (st.wait !== undefined) {
      if (t + h < st.wait) return { ...s, script: { steps, i, t: t + h } };
      s = { ...s, script: { steps, i: i + 1, t: 0 } };
    } else if (st.until) {
      if (!st.until(s) && t + h < (st.max ?? Infinity)) return { ...s, script: { steps, i, t: t + h } };
      s = { ...s, script: { steps, i: i + 1, t: 0 } };
    } else {
      s = { ...s, script: { steps, i: i + 1, t: 0 } };
    }
  }
  return s;
}

// Advance the clock. Integrates in tenth-second steps so a long frame cannot jump a curve.
export function step(state, dt) {
  let s = state;
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(0.1, left);
    s = runScript(s, h);
    const loads = loadsOf(s);
    const { L, R } = s.engines;
    const engines = { L: stepEngine(L, h, loads.L, engineFx(s, 'L')), R: stepEngine(R, h, loads.R, engineFx(s, 'R')) };
    const pumps = pumpsOn(s);
    const noOpen = drawn(s, 'as-xfeed-noopen');
    const clock = s.clock.running ? { ...s.clock, t: s.clock.t + h } : s.clock;
    const fuel = s.fuel && {
      L: Math.max(0, s.fuel.L - (engines.L.ff * h) / 3600),
      R: Math.max(0, s.fuel.R - (engines.R.ff * h) / 3600),
    };
    s = faultSeen(autofeather({ ...s, t: s.t + h, engines, elec: stepElec(s.elec, engines, h, pumps), clock, fuel, fuel0: s.fuel0 || s.fuel,
      fuelSys: stepFuelSys(s.fuelSys, h, s.t + h, noOpen && noOpen.side) }));
    left -= h;
  }
  return s;
}

// --------------------------------------------------------------------------------------------
// What the panel shows

// The digital windows, as the gauges print them: whole numbers, N1 to a tenth. The needle-only
// gauges (oil, battery, generators, suction, pneumatic, oxygen) read as the instructor
// station's repeater shows them: oil temperature and pressure whole, battery volts to a tenth
// and amps whole, generator load to a hundredth, suction and pneumatic to a tenth.
const whole = (v) => String(Math.round(v));
const pos = (v) => String(Math.max(0, Math.round(v)));
export function readouts(state) {
  // Before Start 8: the gauges come on with the battery (the user's sim notes, 2026-11-08). The
  // oxygen supply gauge is taken as a direct-reading one and shows throughout.
  if (state.elec.battery === false) return { L: {}, R: {}, B: {}, S: { oxygen: String(BLEED.oxygen) } };
  const out = {};
  const loads = loadsOf(state);
  for (const side of SIDES) {
    const e = state.engines[side];
    out[side] = {
      itt: whole(e.itt),
      trq: pos(e.trq),
      np: pos(e.np),
      n1: Math.max(0, e.n1).toFixed(1),
      ff: pos(e.ff),
      oilT: whole(e.oilT),
      oilP: pos(e.oilP),
      gen: state.t < ((state.voltsUntil || {})[side] ?? -1) ? VOLTS.reads : loads[side].toFixed(2),
      // The fuel gauges read pounds; the repeater shows them whole.
      qty: whole(!state.fuel ? 0 : state.qtySel === 'nacelle'
        ? nacelleOf(state.fuel[side], (state.fuel0 || state.fuel)[side] - state.fuel[side]) : state.fuel[side]),
    };
  }
  const el = state.elec;
  out.B = { volts: el.volts.toFixed(1), amps: whole(el.amps), prop: (el.propDeice ? DEICE.amps : 0).toFixed(1) };
  out.S = { suction: Math.max(0, el.suction).toFixed(1), pneumatic: Math.max(0, el.pneumatic).toFixed(1),
    oxygen: String(BLEED.oxygen) };
  return chaosReadouts(state, out);
}

// Chaos (t44cFaults.js): what a drawn fault does to the readings.
function chaosReadouts(state, out) {
  const put = (k, gauge, v) => { out[k] = { ...out[k], [gauge]: String(v) }; };
  const pressed = (k) => state.t < ((state.voltsUntil || {})[k] ?? -1);
  for (const f of faultsOf(state)) {
    const p = f.params;
    switch (f.id) {
      case 'as-volts': if (pressed(p.side)) put(p.side, 'gen', p.volts); break;
      // From the right generator going off after the left start (the start broke it).
      case 'sl-fuel-zero': if (f.seen) put(p.side, 'qty', 0); break;
      case 'bt-fuel': put(p.side, 'qty', Math.round(Number(out[p.side].qty) - 135)); break;
      case 'er-np-idle': if (f.seen) put(p.side, 'np', p.np); break;
      case 'er-itt-idle':
        if (f.seen) {
          put(p.side, 'itt', Math.max(Number(out[p.side].itt), 700) + 6);
          put(p.side, 'gen', (Number(out[p.side].gen) + 0.3).toFixed(2));
        }
        break;
      case 'er-oil-low': if (f.seen) put(p.side, 'oilP', p.psi); break;
      case 'er-n1-idle': if (f.seen) put(p.side, 'n1', p.n1); break;
      case 'er-bleed-low':
        if (f.seen) { put('S', 'pneumatic', '9.6'); put('S', 'suction', '3.9'); }
        break;
      case 'ai-amps': if (state.elec.propDeice) put('B', 'prop', p.amps); break;
      case 'ai-pneu-low': if (f.seen) put('S', 'pneumatic', '9.8'); break;
      default:
    }
  }
  return out;
}

// The stopwatch: the elapsed time clock as the student runs it, and under it the time the last
// starter engaged has actually been on (held once it is off; null before any), so the two can
// be compared. NATOPS gives the starter 40 seconds at a time.
export const STARTER_LIMIT = 40;
export function stopwatch(state) {
  const side = state.lastStarter;
  const e = side && state.engines[side];
  return {
    clock: { ...state.clock },
    starter: e ? { side, t: e.starterT, running: e.starter !== 'off' } : null,
  };
}

// The annunciators the engines light, by their poster wordings. Only what the repeater showed
// lit through the clips: each IGN IND while its starter is engaged for a start (IMG_9712,
// 9714, 9715, 9716) or while ENG AUTO IGN is on below AUTO.arm (9718), each AUTO IGNITION ARMED
// above it, each AUTOFEATHER ARMED while armed (see AUTO; 9718, 9737), and each GEN OUT while
// its generator is off line (9714's RH GEN OUT out as its generator came on; 9715's as the right
// generator took the left start). The fuel pressure lights stayed out with the boost pumps on,
// as Before Start leaves them. 9718 and 9737 also lit PROP REV NOT READY with the prop levers
// out of full forward, which the poster's annunciator panel does not draw.
export function lights(state) {
  const out = [];
  for (const side of SIDES) {
    const e = state.engines[side];
    const name = side === 'L' ? 'LH' : 'RH';
    const autoBelow = e.autoIgn && e.lit && e.trq < autoOf(state, side).arm;
    if (e.starter === 'on' || autoBelow) out.push(`${name} IGN IND`);
    if (e.autoIgn && e.lit && !autoBelow) out.push(`${name} AUTO IGNITION ARMED`);
    if (armed(state, side) && e.lit) out.push(`${name} AUTOFEATHER ARMED`);
    // GEN OUT once the battery is on (Before Start 8e), as the panel is then powered.
    if (!e.gen && state.elec.battery !== false) out.push(`${name} GEN OUT`);
  }
  // Gear down (on the ground, always) and a prop lever out of full forward (9718, 9737).
  if (SIDES.some((side) => state.engines[side].prop !== 'fwd')) out.push('PROP REV NOT READY');
  const f = state.fuelSys;
  if (f) {
    const noOpen = drawn(state, 'as-xfeed-noopen');
    for (const side of SIDES) {
      if (!f.boost[side] && !f.open && state.engines[side].lit && !(noOpen && noOpen.side === side)) out.push(`${side} FUEL PRESSURE`);
    }
    if (f.open) out.push('FUEL CROSSFEED');
    f.flicker.forEach((x) => out.push(x.light));
  }
  // Before Start 10: the test lights FAULT WARNING, both FIRE lights and both FIRE EXT lights
  // (NATOPS §2.5).
  if (state.fireZone) {
    const fz = drawn(state, 'bs-fire-zone');
    for (const side of SIDES) {
      if (fz && fz.side === side) continue;
      const n = side === 'L' ? 'LH' : 'RH';
      out.push(`${n} FIRE`, `${n} FIRE EXT`);
    }
  }
  if (state.faultWarn) out.push('FAULT WARNING');
  return chaosLights(state, out);
}

// Before Start 9's lamp test: every cell of the annunciator panel lit (the poster's `lampTest`
// grid draws them), but a drawn dead bulb, by its place in t44cFaults.js LAMP_CELLS. Null when
// the test is not held.
export function lampTest(state) {
  if (!state.annTest) return null;
  const bulb = drawn(state, 'bs-bulb');
  return { dark: bulb ? bulb.cell : null };
}

// Chaos (t44cFaults.js): what a drawn fault does to the lights.
// The poster's wording for a lamp-test cell where the placard differs.
const CELL_WORDING = { 'LH FUEL PRESSURE': 'L FUEL PRESSURE', 'RH FUEL PRESSURE': 'R FUEL PRESSURE', 'CABIN DOOR OPEN': 'Cabin Door' };

function chaosLights(state, lit) {
  let out = lit;
  // A dead bulb stays dark in the lamp test even where the model would light it (GEN OUT).
  const bulb = state.annTest && drawn(state, 'bs-bulb');
  const dead = bulb && LAMP_CELLS[bulb.cell];
  if (dead) out = out.filter((w) => w !== (CELL_WORDING[dead] || dead));
  const drop = (w) => { out = out.filter((x) => x !== w); };
  for (const f of faultsOf(state)) {
    const p = f.params;
    const side = p.side === 'L' ? 'LH' : 'RH';
    switch (f.id) {
      case 'bs-xfeed-dark': drop('FUEL CROSSFEED'); break;
      case 'bs-xfeed-stuck': if (f.seen) out.push('FUEL CROSSFEED'); break;
      case 'bs-fuelpress': if (state.elec.battery) out.push(`${p.side} FUEL PRESSURE`); break;
      case 'bs-door': out.push('Cabin Door'); break;
      case 'sl-gen-out-L': case 'sl-gen-out-R': break; // the generator stays off: GEN OUT as usual
      case 'as-boost-failed': case 'as-xfeed-stuck': if (f.seen) out.push('FUEL CROSSFEED'); break;
      case 'er-af-dark': if (state.afTest) drop(`${side} AUTOFEATHER ARMED`); break;
      default:
    }
  }
  return [...new Set(out)];
}

// The lit lights that flash: an AUTOFEATHER ARMED light while its prop feathers (FTI).
export function blinking(state) {
  return [...SIDES.filter((side) => state.engines[side].feathering)
    .map((side) => `${side === 'L' ? 'LH' : 'RH'} AUTOFEATHER ARMED`), ...(state.faultWarn ? ['FAULT WARNING'] : [])];
}

// The lights this file drives: the poster draws these from the model, never as a click's ring.
export const MODEL_LIGHTS = ['LH IGN IND', 'RH IGN IND', 'LH GEN OUT', 'RH GEN OUT',
  'LH AUTO IGNITION ARMED', 'RH AUTO IGNITION ARMED', 'LH AUTOFEATHER ARMED', 'RH AUTOFEATHER ARMED',
  'L FUEL PRESSURE', 'R FUEL PRESSURE', 'FUEL CROSSFEED', 'LH NO FUEL TRANSFER', 'RH NO FUEL TRANSFER',
  'PROP REV NOT READY', 'FAULT WARNING', 'LH FIRE', 'RH FIRE', 'LH FIRE EXT', 'RH FIRE EXT',
  'Cabin Door', 'Annunciator Lights'];

// Whether the engines have stopped changing, so the clock can rest. A running engine never has:
// its fuel quantity goes down.
// The DIM knob's check (the user, 2026-11-08): from full bright the lights fade evenly to out,
// come back evenly to full bright, and do it once more, DIM_SWEEP seconds each way. The lit
// lights' level now, 1 full bright to 0 out.
const DIM_SWEEP = 1.25; // so one cycle, out and back, is 2.5 s (the user, 2026-11-08)
const DIM_CHECK = 4 * DIM_SWEEP;
export const annLevel = (state) => {
  const d = state.t - (state.dimFrom ?? -Infinity);
  if (!(d >= 0 && d < DIM_CHECK)) return 1;
  const x = (d % (2 * DIM_SWEEP)) / DIM_SWEEP; // 0 to 2 over one sweep down and up
  return x <= 1 ? 1 - x : x - 1;
};

export function settled(state) {
  const charging = (state.engines.L.gen || state.engines.R.gen) && state.elec.deficit > 0.01;
  const checking = state.t - (state.dimFrom ?? -Infinity) < DIM_CHECK;
  return !charging && !checking && !state.clock.running && !state.script && SIDES.every((side) => {
    const e = state.engines[side];
    const still = e.starter === 'off' && e.cond === 'cutoff' && e.n1 < 0.05 && e.itt < AMBIENT + 1;
    return still && Math.abs(e.genG) < 0.01;
  });
}

// The start's scenario, once the start is over and saying so gives nothing away: the fuel cut
// with the starter still engaged (aborted), or the starter off with the engine at idle. Null
// while the start is under way, so Random stays hidden until then, and outside the starts.
export function outcome(state) {
  if (!state.starting) return null;
  const e = state.engines[state.starting];
  const over = e.aborted || (e.starter === 'off' && e.everLit && e.n1 > 50);
  if (!over) return null;
  const s = SCENARIOS.find((x) => x.id === e.scenario);
  return s ? s.label : null;
}

// --------------------------------------------------------------------------------------------
// The procedures

// Which procedures run the engines, and how each one finds them. `null` keeps them as they are,
// so the Abnormal Start EP opened from a start carries on with that start. After Start, the
// runup and the anti-ice check pick the engines up as the last of them left them, both
// running, and otherwise find them at LOW IDLE (t44cEngineStore.js `open`).
export const PROCEDURES = {
  'before-start': 'beforeStart',
  'start-right': 'cold',
  'start-left': 'rightRunning',
  'abnormal-start': null,
  'after-start': 'afterStart',
  'engine-runup': 'runup',
  'anti-ice-check': 'runup',
  'before-takeoff': 'runup',
};

// Whether a state can be carried into a procedure that wants both engines running.
export const bothRunning = (state) => !!state && SIDES.every((side) => {
  const e = state.engines[side];
  return e.lit && e.cond !== 'cutoff' && e.starter === 'off';
});

// Engine Runup 6, 7 and 8, the levers moved as the FTI's action moves them (ME FTI §F104,
// t44cNormals.js). 6: the power levers set a little under 1900 rpm, the test switch held, then
// the power levers again: up until Np stops rising in the 1900 to 2100 range while torque and
// ITT go on climbing, then back to 1900 rpm and the switch released (the user's order,
// 2026-11-04). 7: props to the feather detent and back. 8: the condition levers to LOW IDLE
// (about 524 lb-ft at the 1900 rpm setting), power advanced only if a torque is below 460; then
// each power lever eased back at 9718's pace (about 1 % N1 a second, 12 lb-ft a second) until
// its light flashes, and held there while its prop feathers below 800 rpm, the left advanced to 500 lb-ft again, and the right only
// once all four lights are back; then both to IDLE, the test switch released and the ENG AUTO
// IGN switches off (steps g and h).
const below800 = (side) => (s) => s.engines[side].np < 800;
const FOUR = ['LH AUTO IGNITION ARMED', 'RH AUTO IGNITION ARMED', 'LH AUTOFEATHER ARMED', 'RH AUTOFEATHER ARMED'];
const fourLit = (s) => FOUR.every((w) => lights(s).includes(w)) && !SIDES.some((side) => s.engines[side].feathering);
// The gauges ringed as the checks run (the user, 2026-11-04): in the overspeed governor check
// Np until it stops rising, then ITT and torque until the power comes back, then none; in the
// autofeather test torque as each power lever comes back, until that light flashes, then Np
// a second after it starts flashing, through the feather and back, and none once both power
// levers are at IDLE.
const NP = ['Prop RPM'];
const OSG_UP = [
  { do: [{ highlight: NP }, { side: 'both', pwr: 92, rate: 2 }] },
  { if: (s) => !!drawn(s, 'er-osg-fail'), do: [{ side: 'both', pwr: 96, rate: 2 }] },
  { until: (s) => (drawn(s, 'er-osg-fail') ? Math.max(s.engines.L.np, s.engines.R.np) > PROP.osgFailed - 15
    : s.engines.L.np >= PROP.overspeed - 5 && s.engines.R.np >= PROP.overspeed - 5), max: 25 },
  { do: [{ highlight: ['ITT', 'Torque'] }] },
  { wait: 3 },
  { do: [{ highlight: [] }, { side: 'both', pwrNp: 1900, rate: 3 }] },
  { wait: 5 },
  { do: [{ side: 'both', osgTest: false }] },
];
// Before Start 10: the FIRE DETECTION switch at a test position for the FTI's 3 seconds, then
// OFF; FAULT WARNING flashes until it is pressed after. One turn, not the three zones: the
// poster's knob cannot be turned through them (the user, 2026-11-05).
const FIRE_TEST = [
  { do: [{ fireZone: 1 }, { faultWarn: true }] }, { wait: 3 },
  { do: [{ fireZone: 0 }] },
];
const PRIMARY_GOV = [
  { do: [{ side: 'both', prop: 'detent' }] },
  { wait: 6 },
  { do: [{ side: 'both', prop: 'fwd' }] },
];
const MANUAL_FEATHER = [
  { do: [{ side: 'both', prop: 'feather' }] },
  { wait: 10 },
  { do: [{ side: 'both', prop: 'fwd' }] },
];
const flashing = (side) => (s) => s.engines[side].feathering;
const AUTOFEATHER_TEST = [
  { do: [{ drawAuto: true }, { highlight: ['Torque'] }] },
  { if: (s) => SIDES.some((side) => s.engines[side].trq < 460), do: [{ side: 'both', pwr: 83.3 }] },
  { until: fourLit, max: 10 },
  { wait: 2 },
  { do: [{ side: 'L', pwr: IDLE.low.n1, rate: 1 }] },
  { until: flashing('L'), max: 60 },
  { do: [{ side: 'L', pwrHold: true }] },
  { wait: 1 },
  { do: [{ highlight: NP }] },
  { until: below800('L'), max: 60 },
  { do: [{ side: 'L', pwr: 83.3 }] },
  { until: fourLit, max: 20 },
  { wait: 2 },
  { do: [{ highlight: ['Torque'] }, { side: 'R', pwr: IDLE.low.n1, rate: 1 }] },
  { until: flashing('R'), max: 60 },
  { do: [{ side: 'R', pwrHold: true }] },
  { wait: 1 },
  { do: [{ highlight: NP }] },
  { until: below800('R'), max: 60 },
  { do: [{ highlight: [] }, { side: 'both', pwr: 0 }] },
  { wait: 4 },
  { do: [{ afTest: false }] },
  { wait: 2 },
  { do: [{ side: 'both', autoIgn: false }] },
];

// What a step's control does to the engines, by procedure and step id: the start procedures,
// After Start, the engine runup and the anti-ice/deice check in t44cNormals.js and the Abnormal
// Start EP in t44cData.js (whose ids After Start's repeat, hence the procedure). `<step>:<piece>`
// is one of a step's watched pieces (its `watch`) clicked, `<step>#<n>` the nth piece of its
// `sequence`.
export const STEP_EVENTS = {
  'before-start': {
    // 8: c, the crossfeed OPEN then CLOSED; d, the boost pumps; e, the battery.
    'bs8#3': [{ xfeed: 'open' }],
    'bs8#4': [{ xfeed: 'closed' }],
    'bs8:Left Boost Pump': [{ boost: { L: true } }],
    'bs8:Right Boost Pump': [{ boost: { R: true } }],
    'bs8:Battery': [{ battery: true }],
    // 9: the lamp test held until FAULT WARNING is pressed.
    'bs9:Press to Test': [{ annTest: true }, { faultWarn: true }],
    'bs9:FAULT WARNING': [{ annTest: false }, { faultWarn: false }],
    // 10: the fire detector test, then FAULT WARNING pressed.
    bs10: [{ script: FIRE_TEST }],
    'bs10:FAULT WARNING': [{ faultWarn: false }, { fireZone: 0 }],
  },
  'start-right': {
    sr1: [{ side: 'R', starter: 'on' }],
    sr3: [{ side: 'R', cond: 'low' }],
    sr6: [{ side: 'R', starter: 'off' }],
    sr8: [{ side: 'R', cond: 'high' }],
    sr9: [{ side: 'R', gen: true }],
    sr10: [{ side: 'R', gen: false }],
  },
  'start-left': {
    sl11: [{ side: 'L', starter: 'on' }],
    sl13: [{ side: 'R', gen: true }],
    sl15: [{ side: 'L', cond: 'low' }],
    sl18: [{ side: 'L', starter: 'off' }],
    sl20: [{ side: 'R', gen: false }],
    sl22: [{ side: 'R', gen: true }],
    sl22b: [{ side: 'L', gen: true }],
    sl23: [{ side: 'R', cond: 'low' }],
  },
  'after-start': {
    // 3: the avionics master on adds its load (0.36 to 0.46 between the start and runup clips).
    as3: [{ bus: BUS_RUNNING }],
    // 6: TRANSFER TEST held to L, the left pump to AUTO; then R and the right.
    'as6#2': [{ flicker: 'LH NO FUEL TRANSFER' }],
    'as6#4': [{ flicker: 'RH NO FUEL TRANSFER' }],
    // 7: crossfeed AUTO; left boost OFF, ON; crossfeed CLOSED then AUTO (one click); the right.
    'as7#1': [{ xfeed: 'auto' }],
    'as7#2': [{ boost: { L: false } }],
    'as7#3': [{ boost: { L: true } }],
    'as7#4': [{ xfeed: 'reset' }],
    'as7#5': [{ boost: { R: false } }],
    'as7#6': [{ boost: { R: true } }],
    'as7#7': [{ xfeed: 'reset' }],
  },
  'engine-runup': {
    'er3:Power Lever': [{ side: 'both', pwr: 0 }],
    'er3:Condition Lever': [{ side: 'both', cond: 'low' }],
    'er4:Power Lever': [{ side: 'both', pwr: 0 }],
    er4: [{ script: MANUAL_FEATHER }],
    'er5:Condition Lever': [{ side: 'both', cond: 'high' }],
    // 6: the test switch held, then the power levers up into the overspeed governor. HIGH IDLE
    // leaves the props under 1900 rpm, so b needs no lever of its own (the user, 2026-11-08).
    er6: [{ side: 'both', osgTest: true }],
    'er6#3': [{ script: OSG_UP }],
    er7: [{ script: PRIMARY_GOV }],
    'er8:Condition Lever': [{ side: 'both', cond: 'low' }],
    'er8:Autoignition': [{ side: 'both', autoIgn: true }],
    er8: [{ afTest: true }],
    'er8:Power Lever': [{ script: AUTOFEATHER_TEST }],
  },
  'anti-ice-check': {
    ai1: [{ propDeice: true }],
    ...Object.fromEntries(Object.entries(HEATERS).map(([step, heat]) => [step, [{ heat }]])),

    // 3, between the steps: every anti-ice switch OFF, then N1 to 70 percent.
    'ai4:Condition Lever': [{ heatOff: true }, { side: 'both', cond: 'high' }],
    ai6: [{ propDeice: false }],
    'ai7:Condition Lever': [{ side: 'both', cond: 'low' }],
  },
  'before-takeoff': {
    bt20: [{ side: 'both', cond: 'high' }],
  },
  'abnormal-start': {
    as1: [{ side: 'starting', cond: 'cutoff' }],
    as2: [{ side: 'starting', starter: 'only' }],
    as3: [{ side: 'starting', starter: 'off' }],
  },
};

const pct = (n) => `${Math.max(0, n).toFixed(1)} percent`;

// When a step's input belongs, from the FTI's action for it (ME FTI Appendix F §F102,
// t44cNormals.js). A click before then is marked wrong and moves nothing, and the reason is
// said. `piece` is the part of a two-piece step the click supplied (ITT and N1). Null when the
// click may go in.
// Whether a step has a gate at all.
// `procedure` tells the Abnormal Start EP's ids from After Start's, which repeat them.
const GATED = new Set(['sr2', 'sl12', 'sr3', 'sl15', 'sr4', 'sl16', 'sr5', 'sl17', 'sr6', 'sl18', 'sr9', 'sl13']);
export const gateOf = (stepId, procedure) => GATED.has(stepId)
  || (procedure === 'abnormal-start' && stepId === 'as3');

export function gate(state, stepId, piece, procedure) {
  // Abnormal Start 3, "Starter - Off (at 40 seconds)": by the starter's own time, not the
  // student's clock (the user, 2026-11-04).
  if (procedure === 'abnormal-start') {
    const s = state.starting && state.engines[state.starting];
    if (stepId !== 'as3' || !s || s.starter === 'off') return null;
    return s.starterT >= STARTER_LIMIT ? null
      : `The starter has run ${Math.floor(s.starterT)} seconds. It goes off at 40 seconds.`;
  }
  const side = stepId.startsWith('sl') ? 'L' : 'R';
  const e = state.engines[side];
  switch (stepId) {
    case 'sr2': case 'sl12':
      return e.n1 > 12 ? null : `N1 is ${pct(e.n1)}: not yet above 12 percent.`;
    case 'sr3': case 'sl15':
      return e.n1 > 12 ? null : `N1 is ${pct(e.n1)}. Fuel goes in after N1 is stable above 12 percent.`;
    case 'sr4': case 'sl16':
      return e.ff >= 50 ? null : 'No fuel flow is indicated yet.';
    case 'sr5': case 'sl17':
      // The N1 gauge supplies "N1 stable above 50%", the ITT gauge "ITT and N1 - Light-off,".
      if (piece && /stable/.test(piece)) {
        return e.lit && e.n1 > 50 ? null : `N1 is ${pct(e.n1)}: not yet stable above 50 percent.`;
      }
      // Light-off is the moment ITT reads above the 30 °C it sat at (the user, 2026-11-04).
      return e.lit && Math.round(e.itt) > AMBIENT ? null : 'There is no light-off on the ITT gauge.';
    case 'sr6': case 'sl18':
      return e.lit && e.n1 > 50 ? null : `N1 is ${pct(e.n1)}. The starter goes off when N1 is greater than 50 percent.`;
    // The right generator goes on with the right engine at HIGH IDLE: Start step 8, "Observe N1
    // gauge within 70-73% before responding", comes first, and the left start's step 13 finds it
    // there still.
    case 'sr9': case 'sl13': {
      const r = state.engines.R;
      return r.lit && r.n1 >= 70 ? null : `Right N1 is ${pct(r.n1)}. The generator goes on at HIGH IDLE, N1 70 to 73 percent.`;
    }
    default:
      return null;
  }
}
