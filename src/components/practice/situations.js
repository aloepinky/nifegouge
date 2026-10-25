// Things that go wrong on a real flight, short of an emergency, that a student is expected to
// know how to handle: fuel at Joker or Bingo, minimum or emergency fuel, a wave-off, the Delta,
// a full pattern, lost communications, inadvertent cloud and a TCAS traffic advisory. Each is
// what sets it off (said by someone else), then the procedure from its publication, then what
// you say. Pure; the engine builds the steps with the helpers it hands in (`h`).
//
// What sets a situation off is described plainly (a fuel state, no answer on the radios); the
// calls the publications give no words for are made up for practice and flagged `generated`.

const FTI = (loc, pages) => ({ work: 'FAM FTI', loc, pages });
const CRM = (loc, pages) => ({ work: 'Course Rules Manual', loc, pages });

const FUEL_REF = FTI('§403 — Preflight Planning/Briefing', 'p. 4-4');
const BINGO_VOICE_REF = { work: 'NATOPS', loc: 'Ch. 1 — Warning Tones (Figure 1-54)', pages: 'p. 1-89' };
const DECLARE_REF = { work: 'TW-4 SOP', loc: 'Ch. 2 — Flight Procedures', pages: 'p. 2-2' };
const WAVE_OFF_REF = FTI('§610 — Wave-Off (Go-Around)', 'p. 6-26');
const DELTA_REF = CRM('Ch. 2 — Goliad Delta Pattern', 'p. 2-38');
const FULL_REF = CRM('Ch. 2 — Goliad Pattern Saturation', 'p. 2-32');
const NORDO_REF = CRM('App. B — Local VFR NORDO Procedures', 'p. B-1');
const IMC_REF = FTI('§708 — Unintentional Instrument Flight', 'p. 7-22');
const TCAS_REF = FTI('§304 — "See and Avoid" Doctrine', 'p. 3-5');
const TCAS_VOICE_REF = { work: 'NATOPS', loc: 'Ch. 1 — Traffic Collision Avoidance System', pages: 'p. 1-126' };

// The procedures, in their publications' words; [[ ]] marks what is asked.
const JOKER = [
  { text: 'Joker fuel is set at pre-planned transition points in the sortie. For example, a Joker fuel of [[750 lbs]] might be used to depart the working area to ensure enough fuel to accomplish [[pattern operations]].' },
];
const BINGO = [
  { text: 'Bingo fuel is the fuel at which [[recovery]] should be initiated to arrive at the intended destination with the required fuel.' },
];
const DECLARE = [
  { text: 'Minimum fuel must be declared whenever the estimated usable fuel at the point of landing will be [[200 pounds]] or less. Emergency fuel must be declared whenever the estimated usable fuel at the point of landing will be [[120 pounds]] or less.' },
];
// A wave-off is a maneuver, so like the FTI's others it is its numbers and callouts, not its
// paragraphs (§610 3.a-d).
const WAVE_OFF_NUMBERS = [
  ['Climb at', '120 KIAS'],
  ['Flaps up at or above', '110 KIAS'],
  ['Power after flaps up', '60-70%'],
];
const WAVE_OFF_CALLOUTS = [
  '(PCL as required, wings level, ball centered, climbing attitude)',
  'Two positive rates, above 110, flaps.',
];
const DELTA = [
  { text: 'When advised by the RDO to enter the Delta Pattern, climb at [[120 KIAS]] from present position in the pattern to Delta pattern altitude while maintaining traffic interval.' },
  { text: 'On the upwind-leg, maintain [[1/4]] WTD to the non-pattern side; on the downwind-leg, maintain [[3/4]] WTD. Configuration is 120 KIAS, [[Gear Down, Flaps Up]].' },
  { text: 'When the RDO signals a return to normal operations, descend at [[120 KIAS]] to pattern altitude prior to commencing touch and go landings.' },
];
const FULL = [
  { text: 'If the pattern is full, aircraft attempting to enter may hold over the [[initial]] making [[right]] hand turns at thousand-foot increments starting at [[1500\']] MSL. Similar holding may be made above High-Key beginning at [[3500\']] MSL.' },
];
const NORDO = [
  { text: '[[Maintain VMC]]. Squawk [[7600]].' },
  { text: 'Make all radio calls "[[in the blind]]." Use frequencies appropriate for route of flight. Attempt to attain [[ATIS]] (as required).' },
];
// What App B says for where the flight is.
const NORDO_ROUTE = {
  departing: { text: 'On Course Rules Departure. Execute [[SHAMROCK re-entry]] procedure or join the Western Arrival at Point [[RUSTY]]. Rock wings at the numbers. Execute a normal break entry to the duty runway (use the [[inboard]] runway if the parallels are in use).' },
  arriving: { text: 'Established on a Course Rules Arrival. [[Continue the arrival]]. Rock wings at the numbers. Execute a normal break entry to the [[inboard]] runway.' },
  elsewhere: { text: 'Not Established on a Course Rules Arrival and Returning to KNGP. Execute area departure in accordance with normal course rules procedures. Climb or descend to [[3500\']] MSL. Fly direct to KNGP. Circle overhead at 3500\' MSL as necessary to determine duty runway if unable to obtain ATIS. Rolling final, look for [[Aldis lamp]] signal for permission to land.' },
};
const IMC = [
  { text: '[[Maintain aircraft control]].' },
  { text: 'Establish an [[instrument scan]] and check altitude.' },
  { text: 'If altitude below Maximum Elevation Figure (MEF) + [[1000 feet]] or Off Route Obstruction Clearance Altitude (OROCA), execute immediate [[climb]] to safe altitude turning away from known obstacles.' },
  { text: 'If altitude above MEF+1000 feet or OROCA, with smooth coordinated control inputs, get out of IMC [[the way it was entered]].' },
  { text: 'If unable to regain VMC, IP will contact nearest ATC facility and coordinate an IFR clearance. If swift contact cannot be made, Squawk [[7700]], declare an emergency, and use guard as appropriate.' },
];
const TCAS = [
  { text: 'If a TCAS advisory is encountered outside the landing pattern, [[cease dynamic maneuvering]] and attempt to gain [[visual contact]] with traffic. Do not make a traffic avoidance maneuver solely based on TCAS until you have acquired the traffic visually.' },
];

// `h` (from the engine): { phase, airborne, inArea, atOlf, atGoliad, directed, toGoliadInitial,
// inLap, homeBound, station, fuelDone, rule(rule, ref, label), say(text, more), hear(who, text, more) }.
export const SITUATIONS = [
  {
    id: 'joker',
    title: 'Joker fuel',
    fits: (h) => h.airborne && !h.fuelDone && ((h.inArea && h.highWorkLeft) || (h.atOlf && h.inLap)),
    steps: (h) => [
      h.hear('Fuel', 'Fuel quantity at Joker, 750 pounds.', { plain: true }),
      h.rule(JOKER, FUEL_REF, 'Joker fuel'),
      h.say(h.inArea ? 'Sir, that\'s Joker. Departing the area for the pattern work.' : 'Sir, that\'s Joker. Departing the pattern.', { generated: true }),
    ],
    effect: (h) => (h.inArea ? 'leaveArea' : 'leaveField'),
  },
  {
    id: 'bingo',
    title: 'Bingo fuel',
    fits: (h) => h.airborne && !h.bingo && !h.homeBound && (h.inArea || h.atOlf),
    steps: (h) => [
      h.hear('EICAS', '"Bingo, Bingo"', { plain: true, ref: BINGO_VOICE_REF }),
      h.rule(BINGO, FUEL_REF, 'Bingo fuel'),
      h.say('Sir, that\'s Bingo. Recovering to Navy Corpus.', { generated: true }),
    ],
    effect: () => 'bingo',
  },
  {
    id: 'fuel',
    title: 'Fuel at landing',
    fits: (h) => h.airborne && h.homeBound && !h.declared,
    steps: (h) => {
      // About one time in three, emergency fuel.
      const emergency = h.roll < 1 / 3;
      const pounds = emergency ? 110 : 180;
      return [
        h.hear('Fuel', `Estimated fuel at landing: ${pounds} pounds.`, { plain: true }),
        h.rule(DECLARE, DECLARE_REF, 'Minimum and emergency fuel'),
        h.say(`${h.station}, (call sign), ${emergency ? 'declaring emergency fuel' : 'minimum fuel'}, ${pounds} pounds.`, { generated: true, radio: h.radio }),
      ];
    },
    effect: () => 'declared',
  },
  {
    id: 'waveOff',
    title: 'Wave-off',
    fits: (h) => h.airborne && h.directed && h.inLap,
    steps: (h) => [
      h.hear(h.fieldStation, `(call sign), wave off.`, { generated: true }),
      h.numbers(WAVE_OFF_NUMBERS, WAVE_OFF_CALLOUTS, WAVE_OFF_REF, 'Wave-Off (Go-Around)'),
      h.say('(call sign), waving off.', { generated: true }),
    ],
    effect: () => 'relap',
  },
  {
    id: 'delta',
    title: 'Runway change: the Delta',
    fits: (h) => h.airborne && h.atGoliad && h.inLap,
    steps: (h) => [
      h.hear('RDO', 'All aircraft, Goliad RDO, runway change, enter the Delta.', { generated: true }),
      h.rule(DELTA, DELTA_REF, 'Delta pattern'),
      h.say('(AC ID), Crosswind, Delta.', { ref: DELTA_REF }),
      h.say('(AC ID), 180, Delta.', { ref: DELTA_REF }),
      h.hear('RDO', 'All aircraft, Goliad RDO, resume normal operations.', { generated: true }),
    ],
    effect: () => 'relap',
  },
  {
    id: 'full',
    title: 'Pattern full',
    fits: (h) => h.airborne && h.toGoliadInitial,
    steps: (h) => [
      h.hear('RDO', '(call sign), Goliad RDO, the pattern is full.', { generated: true }),
      h.rule(FULL, FULL_REF, 'Pattern saturation'),
      h.say('(call sign), holding over the initial, 1,500.', { generated: true }),
      h.hear('RDO', '(call sign), Goliad RDO, you are cleared in, report the initial.', { generated: true }),
    ],
  },
  {
    id: 'nordo',
    title: 'Lost communications',
    fits: (h) => h.airborne && ['Departure', 'Transit', 'Recovery'].includes(h.phase),
    steps: (h) => [
      h.hear('Radios', 'No answer on UHF or VHF, and no sidetone.', { plain: true }),
      h.rule([...NORDO, NORDO_ROUTE[h.phase === 'Departure' ? 'departing' : h.phase === 'Recovery' ? 'arriving' : 'elsewhere']], NORDO_REF, 'VFR NORDO'),
      h.hear('Radios', 'Two-way communication is back.', { plain: true }),
    ],
  },
  {
    id: 'imc',
    title: 'Into a cloud',
    fits: (h) => h.airborne && (h.inArea || ['Transit', 'Departure', 'Recovery'].includes(h.phase)),
    steps: (h) => [
      h.hear('Outside', 'You fly into a cloud you did not see coming. No horizon.', { plain: true }),
      h.rule(IMC, IMC_REF, 'Unintentional instrument flight'),
    ],
  },
  {
    id: 'tcas',
    title: 'TCAS traffic advisory',
    fits: (h) => h.airborne && !['Pattern', 'Landing'].includes(h.phase),
    steps: (h) => [
      h.hear('TCAS', '"TRAFFIC, TRAFFIC"', { plain: true, ref: TCAS_VOICE_REF }),
      h.rule(TCAS, TCAS_REF, 'TCAS advisory'),
      h.say('Traffic, 2 o\'clock, slightly high, no factor.', { generated: true }),
    ],
  },
];
