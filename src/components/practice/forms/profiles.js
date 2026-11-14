// The three formation profiles, as the order of beats each is flown in (formsScript.js). Pure.
//
// The parade sequence is the TW-4 Formation Supplement's (I.3, p. 1): a full sequence is
// 4 turns (2 into and 2 away, alternating VMC and IMC), a crossunder, 4 turns, a crossunder and
// a breakup and rendezvous, then a lead change and the same again from the other seat. A half
// sequence has two fewer turns on each side and one crossunder. High work is the Supplement's
// sample cruise form profile (V, p. 25): cruise maneuvering, then tail chase. Low work is the
// practice PEL into McCampbell-Porter after a half sequence (III, p. 15). Fuel plans are the
// Supplement's standard ones (I.7, p. 5): entering Central with 900, then each Joker and the
// Bingo.

export const PROFILES = {
  F: { key: 'F', label: 'Full sequence', event: 'F4101', fuel: [680, 380], side: 'full' },
  H: { key: 'H', label: 'Half sequence + high work', event: 'F4104', fuel: [680, 380], side: 'high' },
  L: { key: 'L', label: 'Half sequence + low work', event: 'F4103', fuel: [725, 550, 380], side: 'half', low: true },
};

export const PHASES = ['Ground', 'Takeoff', 'Departure', 'Working area', 'Low work', 'Recovery', 'Landing', 'Taxi back'];

const seg = (phase, beat, args) => ({ phase, beat, args });

const GROUND = ['tacCheckIn', 'canopy', 'squawk', 'readyTaxi', 'atis', 'ground', 'runup', 'integrity', 'base', 'furtherTaxi', 'tower']
  .map((b) => seg('Ground', b));
const TAKEOFF = ['lineup', 'intervalTakeoff'].map((b) => seg('Takeoff', b));
const DEPARTURE = [
  ...['afterTakeoff', 'departure', 'toCentral', 'channel18'].map((b) => seg('Departure', b)),
  seg('Working area', 'firstOps'),
];

// One student's turn as Wing. `rng` decides the order of the turns (which comes first, into
// or away, and whether the first turn away is VMC or IMC) and whether Wing underruns.
function turns(n, rng, imcFirst) {
  const intoFirst = rng() < 0.5;
  const out = [];
  let away = 0;
  for (let i = 0; i < n; i++) {
    const into = (i % 2 === 0) === intoFirst;
    if (into) out.push({ into: true });
    else out.push({ into: false, imc: (away++ % 2 === 0) === imcFirst });
  }
  return out.map((args) => seg('Working area', 'turn', args));
}

function side(kind, rng) {
  const imcFirst = rng() < 0.5;
  if (kind === 'full') {
    return [
      ...turns(4, rng, imcFirst), seg('Working area', 'crossunder'),
      ...turns(4, rng, !imcFirst), seg('Working area', 'crossunder'),
      seg('Working area', 'breakup', { underrun: rng() < 0.4 }), seg('Working area', 'terminateBR'),
    ];
  }
  const parade = [...turns(2, rng, imcFirst), seg('Working area', 'crossunder'), ...turns(2, rng, !imcFirst)];
  if (kind === 'high') return [...parade, seg('Working area', 'cruise'), seg('Working area', 'tailChase')];
  return [...parade, seg('Working area', 'breakup', { underrun: rng() < 0.4 }), seg('Working area', 'terminateBR')];
}

const RTB = [
  seg('Recovery', 'cruiseOut'), seg('Recovery', 'leaveCentral'), seg('Recovery', 'shamrock'),
  seg('Landing', 'theBreak'), seg('Landing', 'landing'), seg('Taxi back', 'taxiBack'),
];

// The whole flight, in order.
export function segmentsFor(profile, rng) {
  const first = side(profile.side, rng);
  const second = side(profile.side, rng);
  const middle = [
    ...first,
    seg('Working area', 'leadChange'),
    seg('Working area', 'opsAfterLeadChange', { reset: profile.low ? 'Joker' : 'Bingo' }),
    ...second,
    seg('Working area', 'leadChange'),
  ];
  if (!profile.low) return [...GROUND, ...TAKEOFF, ...DEPARTURE, ...middle, ...RTB];
  return [
    ...GROUND, ...TAKEOFF, ...DEPARTURE, ...middle,
    seg('Low work', 'awos', { reset: 'Bingo' }), seg('Low work', 'tacOverEight'), seg('Low work', 'sectionPel'),
    seg('Recovery', 'leaveKtfp'), seg('Recovery', 'shamrock'),
    seg('Landing', 'theBreak'), seg('Landing', 'landing'), seg('Taxi back', 'taxiBack'),
  ];
}
