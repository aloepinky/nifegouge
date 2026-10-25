// A contact (FAM) flight, in the order it is flown, for the Practice Flight tab. Pure data, no
// JSX, so a tool can load it (tools/practice-verify.js checks every line against its page).
//
// Every word a pilot says here is the Checklist Study Guide's (COMTRAWINGFOURINST 1552.1,
// Enclosure (1)), or the FAM FTI's where it says so. Blanks stay blanks ("____ Volts"): the
// grader drops them, so the words around them are the answer.
//
// The course rules legs between takeoff and landing are not here: the student picks them as
// they fly, and their calls come from the course rules data (practice/legs.js).

const xcl = (loc, pages) => ({ work: 'Checklist Study Guide', loc: `Encl 1 — ${loc}`, pages });
const fti = (loc, pages) => ({ work: 'FAM FTI', loc, pages });

// A normal checklist is drilled by name only: the student says which checklist comes next,
// as the guide has every checklist announced. Its items are for the quad-fold and the EPs/Limits
// page, not here. `memory` is one the guide says is run from memory. Only the checklists run
// airborne are here: the page is for the flight's numbers, calls and course rules, and the
// ground checklists are left to the quad-fold.
const checklist = (title, loc, pages, extra) => ({ title, ref: xcl(loc || title, pages), ...extra });

export const CHECKLISTS = {
  ops: checklist('Operations Check', 'Operations Check (OPS Check)', 'p. 26', { memory: true, short: 'Ops Check', also: ['Ops Check'] }),
  climb: checklist('Climb Checklist', 'Climb Checklist (Passing 10,000 ft. MSL)', 'p. 27'),
  psa: checklist('Pre-Stalling, Spinning, and Aerobatic Checklist', null, 'p. 28'),
  descent: checklist('Descent Checklist', null, 'p. 28'),
  beforeLanding: checklist('Before Landing Checklist', null, 'p. 29', { memory: true }),
};

// Calls the guide prints outside any quad-fold checklist item: what is said between checklists
// (the quad-fold's own items, and the calls inside them, are for the EPs/Limits page). `who` is
// the speaker: `you`, `ip` (the rear cockpit), or a station on the radio. `radio` is the channel;
// where the guide prints none, it is the course rules document's KNGP page (ATIS UHF 1, Ground
// UHF 3, Tower UHF 4). A call written `{rwy}` takes the runway of the
// departure the student picked; the guide's own example is 13L.
const call = (who, text, ref, extra) => ({ who, text, ref, ...extra });

const PINS = xcl('Arriving at the aircraft', 'p. 4');
const TAXI = xcl('Taxi Checklist', 'p. 20');
const RADIOS = xcl("Before Taxi Checklist: UFCP and MFD's", 'p. 18');
const OUTBOUND = xcl('Base, Ground and Tower', 'p. 23');
const FLOW = { work: 'Course Rules Manual', loc: 'Ch. 2 — Ground Procedures', pages: 'p. 2-1' };
const TAKEOFF = xcl('Takeoff', 'p. 24');
const ROLL = xcl('Takeoff', 'p. 25');
const AFTER_TAKEOFF = xcl('After Takeoff Checklist', 'p. 25');
const OPS = xcl('Operations Check (OPS Check)', 'p. 27');
const GEAR = xcl('Before lowering the landing gear', 'p. 28');
const LANDING = xcl('Landing', 'p. 29');
const TAXI_BACK = xcl('After Landing Checklist', 'p. 30');
const LEAVING = xcl('Before Leaving Aircraft', 'p. 32');

export const CALLS = {
  pins: [
    call('you', 'Two Pins In', PINS),
    call('ip', 'Two Pins In', PINS),
  ],
  // Item 19 of the Before Taxi Checklist sets the radios: ATIS, a clearance if the flight
  // needs one, then Ground. The ATIS itself is made up for the flight.
  atis: [
    call('you', 'Switching ATIS', RADIOS, { note: 'Copy ATIS and verify information is current within 1 hour of present time.' }),
    call('ATIS', 'Navy Corpus information (ATIS code), wind (wind), altimeter (altimeter), runway {rwy} in use.', null, { generated: true, atis: true, radio: 'CH 1 UHF' }),
  ],
  // The guide's sample clearance is the ZOMBIE1 flight plan, VFR to KINGS 4: only that flight
  // gets it.
  clearanceDelivery: [
    call('you', 'Switching Clearance', RADIOS, { note: 'If your flight profile requires a clearance.' }),
    call('you', 'Clearance Delivery, (call sign), Zombie ONE on request, ready to copy', RADIOS, { radio: 'CH 2 UHF' }),
    call('CLR', '(Call sign), for VFR flight following squawk XXXX', RADIOS),
    call('you', '(call sign), squawk XXXX', RADIOS),
    call('CLR', '(call sign), read-back correct', RADIOS),
  ],
  channel3: [
    call('you', 'Switching Channel 3', RADIOS, { note: 'Once complete with Clearance Delivery or if departing VFR without a clearance.' }),
  ],
  base: [
    call('you', 'Switching Base', OUTBOUND),
    call('you', '(Base name) base, Boomer/Ranger (Side #), (IP rank and last name), (Your rank and last name) outbound', OUTBOUND, { radio: 'CH 19 UHF' }),
    call('Base', 'Boomer/Ranger (Side #), Boomer/Ranger base has you outbound.', OUTBOUND),
  ],
  // Taxiing out: South Flow taxis to the Sierra run-up without a call; North Flow stops at the
  // Compass Rose and calls Ground for the Echo run-up (Course Rules Manual 2-1). The Ground call
  // is the departure's own course rules call where it has one; these are the guide's.
  toSierra: [
    call('note', 'The SIERRA run-up is inside the non-controlled movement area, and it is not necessary to call Ground for clearance to taxi to that area.', FLOW),
  ],
  toCompassRose: [
    call('note', 'Proceed to the Compass Rose and contact ground to taxi to the Echo run-up.', FLOW),
  ],
  groundNorth: [
    call('you', 'Navy Corpus Ground, at Compass Rose, taxi with (ATIS code), (VFR/IFR intentions)', TAXI, { radio: 'CH 3 UHF' }),
  ],
  toEcho: [
    call('GRD', '(call sign), taxi to Echo run-up via Romeo, Echo', TAXI),
    call('you', '(call sign), taxi via Romeo, Echo', TAXI),
  ],
  switchingGround: [
    call('you', 'Switching Ground', OUTBOUND),
  ],
  groundSouth: [
    call('you', 'Navy Corpus Ground, (call sign), Sierra Run-up, taxi with (ATIS code), (VFR/IFR intentions)', OUTBOUND, { radio: 'CH 3 UHF' }),
  ],
  furtherTaxi: [
    call('you', 'Ground, (call sign), further taxi', OUTBOUND, { radio: 'CH 3 UHF' }),
  ],
  // The guide's taxi clearance is for runway 13L; for any other runway the clearance is made up
  // for practice, the runway and no more.
  clearance13L: [
    call('GRD', '(call sign), taxi to runway 13L, via Sierra, Charlie, RWY 22, cross RWY 18', OUTBOUND),
    call('you', '(call sign), taxi runway 13L via Sierra, Charlie, 22, cross 18', OUTBOUND),
  ],
  clearance: [
    call('GRD', '(call sign), taxi to runway {rwy}', null, { generated: true }),
    call('you', '(call sign), taxi runway {rwy}', null, { generated: true }),
  ],
  crossing: [
    call('you', 'Clear, Left, Right and Above on ___', OUTBOUND, { note: 'Crossing an inactive runway you are cleared to cross, after clearing yourself visually.' }),
  ],
  tower: [
    call('you', 'Switching Tower', OUTBOUND),
    call('you', 'Navy Corpus Tower, (call sign), ready for departure', OUTBOUND, { radio: 'CH 4 UHF' }),
    call('TWR', '(call sign), winds are ___ at __ knots, runway {rwy}, cleared for takeoff.', TAKEOFF),
    call('you', '(call sign), cleared for takeoff, runway {rwy}', TAKEOFF),
    call('you', 'Clear, Left, Right and Above. Cleared for Takeoff', TAKEOFF),
  ],
  // The one checklist said item by item: "Do not call for or complete the After Takeoff
  // Checklist as you do for all other checklists" (step one starts it).
  afterTakeoff: [
    call('you', 'Two positive rates, Gear', AFTER_TAKEOFF),
    call('you', 'above 110, Flaps', xcl('After Takeoff Checklist', 'p. 26')),
    call('you', 'Gear up, Flaps up, at ____knots', xcl('After Takeoff Checklist', 'p. 26')),
    call('ip', 'Gear up, flaps up', xcl('After Takeoff Checklist', 'p. 26')),
  ],
  roll: [
    call('you', 'Winds are right to left (or left to right), cleared for takeoff.', ROLL),
    call('you', 'Instruments checked', ROLL),
    call('ip', 'Checked', ROLL),
    call('you', '60 knots, ____%, Good Flow', ROLL),
    call('you', '90 knots, rotate', ROLL),
  ],
  // A technique the guide gives for the end of the Operations Check.
  nearest: [
    call('you', 'Nearest airfield is ____', OPS, { note: 'Technique: include the nearest airfield and/or aircraft position at the end of the Operations Check (i.e. nearest airfield is Goliad five miles to the north).' }),
  ],
  gear: [
    call('you', 'Below 150, Gear', GEAR),
    call('ip', 'Clear', GEAR),
  ],
  fullStop: [
    call('you', 'Navy Corpus Tower, (call sign), 180 gear down, full stop', LANDING, { radio: 'CH 4 UHF' }),
    call('TWR', '(call sign), winds ____ at __kts, runway {rwy}, cleared to land.', LANDING),
    call('you', '(call sign), cleared to land, {rwy}', xcl('Landing', 'p. 30')),
  ],
  shortFinal: [
    call('you', 'Gear down, lights checked', xcl('Landing', 'p. 30')),
    call('ip', 'Gear down, lights checked', xcl('Landing', 'p. 30')),
  ],
  taxiBack: [
    call('you', 'Switching Ground', TAXI_BACK),
    call('you', 'Navy Corpus Ground, (call sign), Clear of the active on Yankee, Taxi to my line', TAXI_BACK, { radio: 'CH 3 UHF' }),
    call('you', 'Texan Base, (SIDE #) is back, aircraft\'s (UP/DOWN), (Quick-turn/Done for the day), looking for parking', TAXI_BACK, { radio: 'CH 29 UHF' }),
    call('you', 'Boomer/Ranger Base, (SIDE #) is back complete/incomplete', TAXI_BACK, { radio: 'CH 19 UHF' }),
  ],
  leaving: [
    call('you', 'Two pins in, Off, Normal, Normal', LEAVING),
    call('ip', 'Two pins in, Off, Normal, Normal, Solo', LEAVING),
    call('you', 'Roger, Solo', LEAVING),
  ],
};

// FTI §707: emergency voice reports are made in the ISPI format.
export const VOICE_REPORT = {
  prompt: 'Emergency voice report format',
  answer: 'Identification, Situation, Position, Intention',
  ref: fti('§707 — Emergency Voice Reports', 'p. 7-21'),
};

// The flight's order. `phase` is what the top of the page says you are doing. The working area
// is picked first, as it is filed and briefed: it decides the departure and the calls to Ground
// and Departure. The legs flown after it are added by the engine as the student picks them.
export const GROUND = [
  { phase: 'Preflight', stage: 'preflight', choose: 'order' },
  { phase: 'Preflight', stage: 'preflight', choose: 'plan' },
  { phase: 'Preflight', stage: 'preflight', calls: 'pins' },
  { phase: 'Taxi', stage: 'ground', calls: 'atis' },
  { phase: 'Taxi', stage: 'ground', calls: 'clearanceDelivery' },
  { phase: 'Taxi', stage: 'ground', calls: 'channel3' },
  { phase: 'Taxi', stage: 'ground', calls: 'taxiOut' },
  { phase: 'Taxi', stage: 'ground', calls: 'base' },
  { phase: 'Taxi', stage: 'ground', calls: 'ground' },
  { phase: 'Taxi', stage: 'ground', calls: 'crossing' },
  { phase: 'Takeoff', stage: 'ground', calls: 'tower' },
  // The takeoff numbers come after the wind call, as the roll begins.
  { phase: 'Takeoff', stage: 'takeoff', calls: 'roll', slice: [0, 1] },
  { phase: 'Takeoff', stage: 'takeoff', fti: 'takeoffRoll' },
  { phase: 'Takeoff', stage: 'takeoff', calls: 'roll', slice: [1] },
  { phase: 'Departure', stage: 'afterTakeoff', calls: 'afterTakeoff' },
  { phase: 'Departure', stage: 'airborne', calls: 'departure' },
  { phase: 'Departure', stage: 'airborne', checklist: 'ops' },
  { phase: 'Departure', stage: 'airborne', calls: 'nearest' },
];

export const FULL_STOP = [
  { phase: 'Landing', stage: 'airborne', fti: 'approach' },
  { phase: 'Landing', stage: 'airborne', calls: 'fullStop' },
  { phase: 'Landing', stage: 'airborne', calls: 'shortFinal' },
  { phase: 'Taxi back', stage: 'ground', calls: 'taxiBack', fly: { figs: { alt: null, hdg: null, kias: null } } },
  { phase: 'Taxi back', stage: 'preflight', calls: 'leaving' },
];

// Before landing anywhere: the gear call, then the Before Landing Checklist (flown as the
// overhead break's downwind; the guide's example).
export const BEFORE_LANDING = [
  { stage: 'airborne', calls: 'gear' },
  { stage: 'airborne', checklist: 'beforeLanding' },
];

// When each in-flight checklist is run, in the guide's words.
export const WHEN = {
  ops: 'The first Operations Check must be performed shortly after initial check-in with Departure during climb out to altitude.',
  opsPattern: 'Subsequent Operation Checks are typically performed at least once every 15-20 minutes for the duration of the flight, including while operating in the landing pattern.',
  climb: 'Complete the Climb Checklist as the aircraft passes 10,000\' MSL to ensure the OBOGS and pressurization systems are functioning normally.',
  psa: 'Conduct the Pre-Stalling, Spinning and Aerobatic checklist prior to conducting any Stall, Spin, OCF or Aerobatic maneuvers.',
  descent: 'Perform the Descent Checklist on your initial descent from the working areas or after transiting greater than 100nm.',
};
export const WHEN_REF = {
  ops: xcl('Operations Check (OPS Check)', 'p. 26'),
  opsPattern: xcl('Operations Check (OPS Check)', 'p. 26'),
  climb: xcl('Climb Checklist', 'p. 27'),
  psa: xcl('Pre-Stalling, Spinning, and Aerobatic Checklist', 'p. 27'),
  descent: xcl('Descent Checklist', 'p. 28'),
};

// Which emergencies can happen where, by the NATOPS Chapter 3 heading each is under.
const natops = (loc, pages) => ({ work: 'NATOPS', loc: `Ch. 3 — ${loc}`, pages });
const GROUND_EP = natops('Ground Emergencies', 'p. 3-4');
const TAKEOFF_EP = natops('Takeoff Emergencies', 'p. 3-5');
const INFLIGHT_EP = natops('In-flight Emergencies', 'p. 3-7');
const LANDING_EP = natops('Landing Emergencies', 'p. 3-46');
const inflight = { when: ['airborne'], ref: INFLIGHT_EP };

// One row per EP_TITLES entry, in its order (EPDivsData.js). `ends` is an emergency the
// flight does not go on from.
export const EP_PHASES = [
  { title: 'ABORT START PROCEDURE', when: ['start'], ref: GROUND_EP },
  { title: 'EMERGENCY ENGINE SHUTDOWN ON THE GROUND', when: ['start', 'ground'], ends: true, ref: GROUND_EP },
  { title: 'EMERGENCY GROUND EGRESS', when: ['start', 'ground'], ends: true, ref: GROUND_EP },
  { title: 'ABORT', when: ['takeoff'], ref: TAKEOFF_EP },
  { title: 'ENGINE FAILURE IMMEDIATELY AFTER TAKEOFF', when: ['afterTakeoff'], ends: true, ref: TAKEOFF_EP },
  { title: 'ENGINE FAILURE DURING FLIGHT', ...inflight },
  { title: 'IMMEDIATE AIRSTART (PMU NORM)', ...inflight },
  { title: 'UNCOMMANDED POWER CHANGES / LOSS OF POWER/ UNCOMMANDED PROPELLER FEATHER', ...inflight },
  { title: 'COMPRESSOR STALLS', ...inflight },
  { title: 'INADVERTENT DEPARTURE FROM CONTROLLED FLIGHT', ...inflight },
  { title: 'FIRE IN FLIGHT', ...inflight },
  { title: 'SMOKE AND FUME ELIMINATION/ELECTRICAL FIRE', ...inflight },
  { title: 'CHIP DETECTOR WARNING', ...inflight },
  { title: 'OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE', ...inflight },
  { title: 'LOW FUEL PRESSURE', ...inflight },
  { title: 'HIGH FUEL FLOW', ...inflight },
  { title: 'OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS', ...inflight },
  { title: 'EJECT', when: ['airborne'], ends: true, ref: INFLIGHT_EP },
  { title: 'FORCED LANDING', when: ['airborne'], ends: true, ref: LANDING_EP },
  { title: 'PRECAUTIONARY EMERGENCY LANDING (PEL)', when: ['airborne'], ref: LANDING_EP },
];
