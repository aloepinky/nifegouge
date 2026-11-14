// A formation flight (two T-6Bs, F4101 to F4104) for the Practice Flight tab, beat by beat.
// Pure: no JSX, so a tool can load it (tools/practice-forms-verify.js checks every line
// against its page).
//
// Every word here is the Formation FTI's (CNATRA P-766, Rev 06-26), or, where the FTI leaves a
// thing to local procedure, the TW-4 Formation Supplement's, the TW-4 Briefing Guide's
// (COMTRAWINGFOURINST 1552.1, Encl 3) or the Course Rules Manual's. Where the FTI and the
// Supplement word the same thing differently, the FTI's wording is used. A line nobody
// printed is marked `generated`.
//
// A beat is one exchange: the lines said, signalled or flown, in order. Each builder takes the
// flight being built (`c`, made in flight.js) and returns a beat. `c.line` places a line by who
// says it: 'lead' and 'wing' are positions (which aircraft that is changes at a lead change);
// '11' and '12' are aircraft (the Designated Flight Lead's is always 11, FTI §106 and
// Supplement p. 8); 'both' is something each aircraft does; anything else is a station.

const fti = (loc, pages) => ({ work: 'F FTI', loc, pages });
const supp = (loc, pages) => ({ work: 'TW-4 Formation Supplement', loc, pages });
const brief = (loc, pages) => ({ work: 'TW-4 Briefing Guide', loc: `Encl 3 — ${loc}`, pages });
const crm = (loc, pages) => ({ work: 'Course Rules Manual', loc, pages });
const xcl = (loc, pages) => ({ work: 'Checklist Study Guide', loc: `Encl 1 — ${loc}`, pages });

const COMMS = fti('§106 — Formation Communications', 'p. 1-9');
const SIGNALS = fti('§106 — Formation Communications', 'p. 1-11');
const APPC = fti('Appendix C — Communications and Radio Calls', 'p. C-1');
const APPC2 = fti('Appendix C — Communications and Radio Calls', 'p. C-2');
const APPC3 = fti('Appendix C — Communications and Radio Calls', 'p. C-3');
const APPB = (fig, pages) => fti(`Appendix B — ${fig}`, pages);
const OUTBOUND = fti('§201 — Outbound', 'p. 2-1');
const TAXI = fti('§202 — Taxi', 'p. 2-2');
const RUNUP = fti('§202 — Taxi', 'p. 2-4');
const LINEUP = fti('§300 — Line-up', 'p. 3-1');
const INTERVAL = fti('§301 — Interval Takeoff', 'p. 3-2');
const CLIMBOUT = fti('§303 — Initial Rendezvous/Departure/Climb-out Following Interval Takeoff', 'p. 3-3');
const RUNNING = fti('§304 — Running Rendezvous', 'p. 3-3');
const UNDERRUN = fti('§306 — Rendezvous Underrun', 'p. 3-7');
const TURNS = fti('§403 — Parade Turns', 'p. 4-5');
const XUNDER = fti('§404 — Cross-under', 'p. 4-9');
const BR = fti('§405 — Breakup and Rendezvous', 'p. 4-12');
const CRUISE = fti('§406 — Cruise Formation', 'p. 4-20');
const CRUISE_M = fti('§407 — Cruise Maneuvering', 'p. 4-23');
const TAIL = fti('§408 — Tail Chase Exercise', 'p. 4-26');
const TERMINATE = fti('§409 — Terminate and Knock-it-off Procedures', 'p. 4-28');
const LEAD_CHANGE = fti('§410 — Lead Change Procedure', 'p. 4-29');
const RECOVERY = fti('§501 — VFR Course Rules Recovery', 'p. 5-1');
const SPEED_BRAKE = fti('§502 — Speed Brake Use', 'p. 5-2');
const BREAK = fti('§503 — The Break', 'p. 5-2');
const TAXI_IN = fti('§510 — Recovery Taxi', 'p. 5-7');
const SECTION_PEL = fti('§606 — Section Precautionary Emergency Landing (PEL)', 'p. 6-7');

const SUPP_GROUND = supp('II. Formation Sequence Communication Script — Ground Operations', 'p. 8');
const SUPP_DEPART = supp('II. Formation Sequence Communication Script — Departure', 'p. 9');
const SUPP_RTB = supp('II. Formation Sequence Communication Script — Return to Base', 'p. 12');
const SUPP_COURSE = supp('I. General Overview and Guidance — Course Rules', 'p. 4');
const SUPP_MISC = supp('I. General Overview and Guidance — Miscellaneous', 'p. 6');
const SUPP_SEQUENCE = supp('I. General Overview and Guidance — Basic Formation Sequence', 'p. 1');
const SUPP_KTFP = supp('III. Outlying Field (OLF) Operations — McCampbell-Porter Airport (KTFP)', 'p. 15');
const SUPP_CRUISE = supp('V. Cruise Maneuvering and Tail Chase', 'p. 21');
const KTFP = crm('Ch. 2 — Ingleside Regional Airport', 'p. 2-57');
const KTFP_OUT = crm('Ch. 2 — Ingleside Regional Airport', 'p. 2-58');
const CENTRAL_OUT = crm('Ch. 2 — Primary Working Areas', 'p. 2-16');
const GOLIAD_ARRIVAL = crm('Ch. 2 — Goliad Arrival', 'p. 2-62');
const PATTERN = crm('Ch. 1 — Field Information', 'p. 1-5');
const COMM_PLAN = brief('Communications and Crew Coordination', 'p. 2');
const IDENT = brief('Communications and Crew Coordination', 'p. 3');

// The visual signals, as Appendix B draws them: what Lead does, and what it means.
export const SIGNAL = {
  runup: { name: 'Run-up', how: 'Raises two fingers in back/forth motion', means: 'Perform normal engine runup', ref: APPB('Figure B-2 Takeoff Signals', 'p. B-2') },
  thumbsUp: { name: 'Thumbs-up', how: 'Thumbs-up or head nod', means: 'Affirmative', ref: APPB('Figure B-1 General Signals', 'p. B-1') },
  turn: { name: 'Turn', how: 'Head nodded right/left', means: 'I am turning right/left', ref: APPB('Figure B-4 General Airborne Signals (2)', 'p. B-4') },
  cruise: { name: 'Cruise', how: 'Thumb waved backward alternating over each shoulder', means: 'Take cruise position', ref: APPB('Figure B-5 General Airborne Signals (3)', 'p. B-5') },
  breakup: { name: 'Breakup', how: 'Lead describes back and forth motion with two fingers', means: 'Breakup', ref: APPB('Figure B-5 General Airborne Signals (3)', 'p. B-5') },
  crossunder: { name: 'Cross-under', how: 'Lead holds up right/left forearm vertically with clenched fist', means: 'Wingman crossunder to right/left', ref: APPB('Figure B-6 General Airborne Signals (4)', 'p. B-5') },
  kissOff: { name: 'Kiss-off', how: 'Lead blows kiss to wingman (bunch finger, then spread)', means: "I'm leaving formation", ref: APPB('Figure B-7 General Airborne Signals (5)', 'p. B-6') },
  leadChange: { name: 'Lead change', how: 'Lead pats self on head, points to wingman', means: 'Lead change', ref: APPB('Figure B-7 General Airborne Signals (5)', 'p. B-6') },
  tailChase: { name: 'Tail chase', how: 'Pistol cocking motion', means: 'Prepare to start tail-chase exercise', ref: APPB('Figure B-7 General Airborne Signals (5)', 'p. B-6') },
};

// The cadence Lead says over the ICS as a signal is passed (FTI §106, p. 1-11 to 1-12).
const CADENCE = 'Wingman in position. Area clear. Pass-2-3. Look.';
const BR_CADENCE = 'Wingman in position. Area clear. Break-it-up. Look.';

// A signal passed by Lead and Wing's head nod: two lines.
function signalled(c, key, { side, cadence = CADENCE } = {}) {
  const s = SIGNAL[key];
  const how = side ? s.how.replace('right/left', side) : s.how;
  return [
    c.line('lead', `${s.name} signal`, s.ref, { kind: 'signal', how, ics: cadence }),
    c.line('wing', 'Head nod', SIGNALS, { kind: 'signal' }),
  ];
}

// A numbers row: what each position flies. A row with one value is the same for both.
const row = (c, label, lead, wing, ref) => c.line('both', label, ref, { kind: 'row', lead, wing: wing === undefined ? lead : wing });

const checklist = (c, title, ref) => c.line('both', title, ref, { kind: 'checklist' });

// An Operations Check over the TAC: 11 answers first wherever it is, Lead directs it, and a
// new Joker or Bingo is read back (FTI §107, Appendix C).
// The figures are placeholders filled from the flight: `(fuel 11)`, `(fuel 12)`, `(reset)`.
export function opsCheck(c, { reset } = {}) {
  const vars = { ...c.fuelNow(), ...(reset ? { reset: reset.value } : {}) };
  const lines = [checklist(c, 'Operations Check', xcl('Operations Check (OPS Check)', 'p. 26'))];
  if (c.lead === '11') {
    lines.push(c.line('lead', '(TAC) flight, OPS Check. (TAC) 11, (fuel 11), Good G.', APPC2, { vars }));
    lines.push(c.line('wing', '(TAC) 12, (fuel 12), Good G.', APPC2, { vars }));
  } else {
    lines.push(c.line('lead', '(TAC) flight, OPS Check.', APPC2));
    lines.push(c.line('wing', '(TAC) 11, (fuel 11), Good G.', APPC2, { vars }));
    lines.push(c.line('lead', '(TAC) 12, (fuel 12), Good G.', APPC2, { vars }));
  }
  if (reset) {
    lines.push(c.line('lead', `(TAC) flight, reset ${reset.name} (reset).`, APPC2, { vars, ...(reset.note ? { note: reset.note } : {}) }));
    lines.push(c.line('wing', '(TAC) (wing #), (reset).', APPC2, { vars }));
  }
  return lines;
}

const terminate = (c) => [
  c.line('lead', '(TAC) flight, terminate.', APPC3),
  c.line('11', '(TAC) 11, terminate', APPC3),
  c.line('12', '(TAC) 12, terminate.', APPC3),
];

const trainingComplete = (c) => [
  c.line('wing', '(TAC) (wing #), training complete.', APPC3),
  c.line('lead', '(TAC) (lead #).', APPC3),
];

const switchTo = (c, who, radio, to, station, ref, extra) => c.line(who, `${radio} ${to}`, ref, { kind: 'switch', radio, to, station, ...extra });

// The beats. Each is `(c) => ({ title, lines, ... })`; flight.js adds the phase and the id.
export const BEATS = {
  // Ground: set up together, start together (FTI Ch. 2, Appendix C).
  tacCheckIn: (c) => ({
    title: 'TAC check-in',
    lines: [
      switchTo(c, 'both', 'AUX', 'TAC AUX', 'Tactical', OUTBOUND, { note: 'Set the briefed TAC AUX frequency once the battery is turned on.' }),
      c.line('lead', '(TAC) flight, check AUX', OUTBOUND),
      c.line('11', '(TAC) 11', OUTBOUND),
      c.line('12', '(TAC) 12', OUTBOUND),
    ],
  }),
  canopy: (c) => ({
    title: 'Canopy coordination',
    note: 'Closing the canopy together is the cue to begin the Engine Start (Auto) checklist.',
    lines: [
      c.line('lead', '(TAC) flight, Ready Canopy', APPC),
      c.line('11', '(TAC) 11, ready', APPC),
      c.line('12', '(TAC) 12, ready', APPC),
      c.line('lead', '(TAC) flight, close canopy', APPC),
      c.line('11', '(TAC) 11', APPC),
      c.line('12', '(TAC) 12', APPC),
      checklist(c, 'Engine Start (Auto) Checklist', xcl('Engine Start (Auto) Checklist', 'p. 12')),
    ],
  }),
  squawk: (c) => ({
    title: 'Before taxi: squawk and TCAS',
    lines: [
      checklist(c, 'Before Taxi Checklist', xcl('Before Taxi Checklist', 'p. 14')),
      row(c, 'Squawk', `${c.card.squawk}, the Designated Flight Lead's code`, undefined, IDENT),
      row(c, 'Transponder', 'Active', 'Standby, same code', IDENT),
      row(c, 'TCAS', 'Usually carried by Lead', 'Test, then standby', SUPP_MISC),
      row(c, 'FMS flight number', 'Own', "The Designated Flight Lead's", SUPP_MISC),
    ],
  }),
  readyTaxi: (c) => ({
    title: 'Ready to taxi',
    lines: [
      c.line('lead', '(TAC), ready taxi', SUPP_GROUND),
      c.line('wing', '12', SUPP_GROUND),
    ],
  }),
  atis: (c) => ({
    title: 'ATIS',
    note: 'All aircraft in the flight monitor and copy ATIS and set the transponder code and altimeter.',
    lines: [
      switchTo(c, 'both', 'PRI', 'CH 1 UHF', 'Navy Corpus ATIS', OUTBOUND),
      c.line('ATIS', 'Navy Corpus information (ATIS), wind (wind), altimeter (altimeter), runway {rwy} in use.', null, { generated: true }),
    ],
  }),
  ground: (c) => (c.card.north ? {
    title: 'Ground: taxi to the Echo run-up',
    lines: [
      switchTo(c, 'both', 'PRI', 'CH 3 UHF', 'Navy Corpus Ground', COMM_PLAN, { note: 'All frequency changes will be auto-switch unless briefed.' }),
      c.line('lead', 'Navy Corpus Ground, (ATC), flight of 2, ready for taxi at Charlie Romeo intersection, information (ATIS), VFR Central', SUPP_GROUND),
      c.line('GRD', '(ATC) and flight, taxi to Echo runup via Romeo-Echo', SUPP_GROUND),
      c.line('lead', '(ATC) and flight, taxi to Echo runup via Romeo-Echo', SUPP_GROUND),
      row(c, 'Taxi', 'Lead', 'Trail: no closer than 1 plane length (Lead\'s wingspan fills the HUD)', TAXI),
    ],
  } : {
    title: 'Taxi to the Sierra run-up',
    lines: [
      switchTo(c, 'both', 'PRI', 'CH 3 UHF', 'Navy Corpus Ground', COMM_PLAN, { note: 'All frequency changes will be auto-switch unless briefed.' }),
      c.line('note', 'Both aircraft taxi to Sierra runup for South Flow (no Ground call required).', supp('II. Formation Sequence Communication Script — Ground Operations', 'p. 9')),
      row(c, 'Taxi', 'Lead', 'Trail: no closer than 1 plane length (Lead\'s wingspan fills the HUD)', TAXI),
    ],
  }),
  runup: (c) => ({
    title: 'Run-up',
    lines: [
      row(c, 'Run-up position', 'Room for hand signals and a visual inspection of both aircraft', 'Abeam Lead, nose wheel centered. Never overlap wings.', RUNUP),
      checklist(c, 'Overspeed Governor Checklist', xcl('Overspeed Governor Checklist', 'p. 20')),
      checklist(c, 'Before Takeoff Checklist', xcl('Before Takeoff Checklist', 'p. 21')),
    ],
  }),
  // FTI §202: CCPSTFALL ("C C POST FALL"), each aircraft inspecting the other.
  integrity: (c) => ({
    title: 'Integrity check',
    note: 'CCPSTFALL, sounded out as "C C POST FALL". The O is no item.',
    lines: [
      row(c, 'Cockpit', 'Upper restraints, Seat Safety Pin (if visible)', undefined, RUNUP),
      row(c, 'Cowlings (engine)', 'secured', undefined, RUNUP),
      row(c, 'Panels/Doors', 'secured', undefined, RUNUP),
      row(c, 'Struts', 'proper strut extension', undefined, RUNUP),
      row(c, 'Tires', 'proper inflation', undefined, RUNUP),
      row(c, 'Flaps', 'takeoff position', undefined, RUNUP),
      row(c, 'Antennas', 'secured', undefined, RUNUP),
      row(c, 'Leaks', 'none visible', undefined, RUNUP),
      row(c, 'Lights', 'anti-collision lights/NAV lights', undefined, RUNUP),
      c.line('wing', 'Thumbs-up, held until Lead returns it', RUNUP, { kind: 'signal' }),
      c.line('lead', 'Thumbs-up', RUNUP, { kind: 'signal' }),
    ],
  }),
  base: (c) => ({
    title: 'Outbound with Base',
    lines: [
      switchTo(c, 'lead', 'PRI', 'CH 19 UHF', `${c.card.squadron} Base`, COMM_PLAN, { generated: true }),
      c.line('lead', '(squadron) Base, (squadron) (side 11), (IP rank and last name), (rank and last name), and (squadron) (side 12), (IP rank and last name), (rank and last name), (event), outbound', SUPP_GROUND),
      c.line('Base', '(squadron) (side 11) and (squadron) (side 12), base has you outbound', SUPP_GROUND),
      switchTo(c, 'lead', 'PRI', 'CH 3 UHF', 'Navy Corpus Ground', COMM_PLAN, { generated: true }),
    ],
  }),
  furtherTaxi: (c) => {
    const known = c.card.north ? c.card.rwy === '31R' : c.card.rwy === '13L';
    const route = c.card.north ? 'Echo-Yankee' : 'Charlie-Runway 22, cross Runway 18';
    const clearance = known ? `(ATC) and flight, taxi to Runway ${c.card.north ? '31 right' : '13 left'} via ${route}` : '(ATC) and flight, taxi to runway {rwy}';
    return {
      title: 'Ground: taxi to the runway',
      lines: [
        c.card.north
          ? c.line('lead', 'Navy Corpus Ground, (ATC) and flight, further taxi', SUPP_GROUND)
          : c.line('lead', 'Navy Corpus Ground, (ATC) and flight, ready for taxi at the bottleneck, information (ATIS), VFR Central', SUPP_GROUND),
        c.line('GRD', clearance, known ? SUPP_GROUND : null, known ? undefined : { generated: true }),
        c.line('lead', clearance, known ? SUPP_GROUND : null, known ? undefined : { generated: true }),
      ],
    };
  },
  tower: (c) => ({
    title: 'Tower',
    lines: [
      switchTo(c, 'both', 'PRI', 'CH 4 UHF', 'Navy Corpus Tower', supp('II. Formation Sequence Communication Script — Ground Operations', 'p. 9'), { note: 'When 200 feet prior to the hold short, both aircraft auto switch to tower frequency.' }),
      c.line('lead', 'Navy Corpus Tower, (ATC), flight of 2, ready for departure', supp('II. Formation Sequence Communication Script — Ground Operations', 'p. 9')),
      c.line('TWR', '(ATC) and flight, winds (wind), cleared for takeoff, runway {rwy}', supp('II. Formation Sequence Communication Script — Ground Operations', 'p. 9')),
      c.line('lead', '(ATC) and flight, cleared for takeoff, runway {rwy}', supp('II. Formation Sequence Communication Script — Ground Operations', 'p. 9')),
    ],
  }),

  // Takeoff: an interval takeoff, five seconds apart (FTI §300-§301).
  lineup: (c) => ({
    title: 'Line-up',
    lines: [
      checklist(c, 'Lineup Checklist', xcl('Lineup Checklist', 'p. 24')),
      row(c, 'Side of the runway', `${c.card.leadSide} (the downwind side)`, `${c.card.leadSide === 'Left' ? 'Right' : 'Left'}: center of your side`, LINEUP),
      row(c, 'Position', 'Room for Wing to turn and taxi forward', "Your wing's leading edge in line with the trailing edge of Lead's horizontal stabilizer", LINEUP),
      row(c, 'Transponder', 'Active', 'Standby', SUPP_MISC),
    ],
  }),
  intervalTakeoff: (c) => ({
    title: 'Interval takeoff',
    lines: [
      c.line('lead', `${SIGNAL.runup.name} signal`, SIGNAL.runup.ref, { kind: 'signal', how: SIGNAL.runup.how }),
      c.line('wing', 'Head nod', INTERVAL, { kind: 'signal' }),
      row(c, 'Torque', '30%', undefined, INTERVAL),
      c.line('wing', 'Thumbs-up (or the radio for any discrepancy)', INTERVAL, { kind: 'signal' }),
      c.line('lead', 'Thumbs-up, look forward, kiss-off', INTERVAL, { kind: 'signal' }),
      row(c, 'Takeoff', 'Maximum power, keep your side of the runway', 'Begin your roll five seconds after Lead (about 1000 ft.)', INTERVAL),
    ],
  }),

  // Departure: join on the climb and fly the course rules to Central.
  afterTakeoff: (c) => ({
    title: 'Climb-out and join',
    lines: [
      checklist(c, 'After Takeoff Checklist', xcl('After Takeoff Checklist', 'p. 25')),
      row(c, 'Clear of the pattern', '80% Torque, 160 KIAS (8-10° nose up)', 'Lead on or slightly above the horizon; inside of any departure turn', CLIMBOUT),
      row(c, 'Turns before the join', 'No more than 30° AOB', null, CLIMBOUT),
      row(c, 'Closure', null, "No more than 40 KIAS in excess of Lead's airspeed", RUNNING),
      row(c, 'Inside 1000\'', null, 'Lead drifts aft from the 11/1 o\'clock: gradually reduce power', RUNNING),
      row(c, 'Never', null, "Approach Lead from the 6 o'clock", RUNNING),
      row(c, 'Crossunder', null, 'Not before climbing through 300\' AGL', SUPP_MISC),
      row(c, 'Once joined', 'Up to 90% torque, 180 KIAS (or the briefed climb speed)', 'Parade', CLIMBOUT),
    ],
  }),
  departure: (c) => ({
    title: 'Departure',
    lines: [
      c.line('TWR', '(ATC) and flight, contact departure', SUPP_DEPART),
      c.line('lead', '(ATC) and flight, switching departure', SUPP_DEPART),
      switchTo(c, 'both', 'PRI', 'CH 8 UHF', 'Corpus Departure', crm('Ch. 2 — Beach-Line Departure', 'p. 2-4'), { note: 'Contact and formation training events must contact Corpus Departure via the UHF radio.' }),
      c.line('lead', 'Corpus Departure, (ATC), flight of 2, 500 feet off Navy Corpus, course rules Central', SUPP_DEPART),
      c.line('DEP', '(ATC) and flight, ident, all altitudes available', SUPP_DEPART),
      c.line('lead', '(ATC) and flight, ident, request (altitude)', SUPP_DEPART),
      c.line('DEP', '(ATC) and flight, radar contact, proceed course rules Central, (altitude)', SUPP_DEPART),
      c.line('lead', '(ATC) and flight proceed course rules Central, (altitude)', SUPP_DEPART),
    ],
  }),
  toCentral: (c) => ({
    title: 'Course rules to Central',
    lines: [
      ...(c.card.north ? [
        c.line('both', 'When clear of the traffic pattern, execute a climbing turn to heading [[105]] at [[160]] KIAS, using [[80%]] torque until Wing is joined.', SUPP_COURSE, { kind: 'rule' }),
        c.line('both', 'Continue climb to [[2500\']] MSL, accelerate to [[200]] KIAS when level, switch BTN [[8]] when instructed, and maintain Wing in briefed position.', SUPP_COURSE, { kind: 'rule' }),
        c.line('both', 'Passing the beach line, continue climb to working altitude.', SUPP_COURSE, { kind: 'rule' }),
      ] : [
        c.line('both', 'Lead will level at [[500\']] MSL, set [[54%]] torque, and maintain [[200]] KIAS until Wing is joined.', SUPP_COURSE, { kind: 'rule' }),
        c.line('both', 'Abeam the [[high bridge]], execute a climbing turn to heading [[105]] at [[160]] KIAS, using [[80%]] torque until Wing is joined.', SUPP_COURSE, { kind: 'rule' }),
        c.line('both', 'Continue climb to working altitude ([[6,500-14,500\']] MSL).', SUPP_COURSE, { kind: 'rule' }),
      ]),
      c.line('both', 'At NGP [[10]] DME while remaining outside of Central\'s eastern and southern boundaries, turn north to ~[[035]] heading to parallel Central\'s eastern boundary.', SUPP_COURSE, { kind: 'rule' }),
      c.line('both', 'Level off at [[5,500\']] if not North of the extended southern boundary of Central to ensure clearance from the Maintenance Area.', SUPP_COURSE, { kind: 'rule' }),
      ...(c.card.alt > 10000 ? [checklist(c, 'Climb Checklist', xcl('Climb Checklist (Passing 10,000 ft. MSL)', 'p. 27'))] : []),
    ],
  }),
  channel18: (c) => ({
    title: 'Central common',
    lines: [
      c.line('DEP', '(ATC) and flight, switch to my frequency, channel one eight', SUPP_DEPART),
      c.line('lead', '(ATC) and flight, switching channel one eight', SUPP_DEPART),
      switchTo(c, 'both', 'PRI', 'CH 18 UHF', 'Central Common', crm('Ch. 2 — Primary Working Areas', 'p. 2-15')),
      c.line('lead', '99 Central, (TAC) flight of 2, working (altitude)', supp('II. Formation Sequence Communication Script — Departure', 'p. 10')),
      c.line('both', 'At [[500\']] below the assigned working altitude, Lead may turn the flight into Central and initiate the ops check call.', SUPP_COURSE, { kind: 'rule' }),
    ],
  }),
  // Entering the area: the first Ops Check, and Joker updated off the lowest fuel when it is
  // 30 lb or more from the briefed 900 (Supplement p. 5).
  firstOps: (c) => {
    const reset = c.jokerUpdate();
    return {
      title: 'Ops Check',
      lines: [...opsCheck(c, { reset }), checklist(c, 'Pre-Stalling, Spinning, and Aerobatic Checklist', xcl('Pre-Stalling, Spinning, and Aerobatic Checklist', 'p. 28'))],
    };
  },

  // The parade sequence (FTI Ch. 4).
  turn: (c, { into, imc }) => {
    const dir = into ? c.side : c.otherSide;
    const lines = [
      c.line('lead', `${SIGNAL.turn.name} signal`, SIGNAL.turn.ref, { kind: 'signal', how: `Head nodded ${dir.toLowerCase()}` }),
      row(c, 'Bank', '30° AOB for about 180°', "Match Lead's angle of bank and roll rate", TURNS),
    ];
    if (into) {
      lines.push(row(c, 'Roll about', null, "Lead's longitudinal axis", TURNS));
      lines.push(row(c, 'Checkpoints', null, 'The same parade checkpoints', TURNS));
      lines.push(row(c, 'Power', null, 'Reduce slightly (shorter radius); add a little on the rollout', TURNS));
    } else if (imc) {
      lines.push(row(c, 'Roll about', null, "Lead's longitudinal axis", TURNS));
      lines.push(row(c, 'Checkpoints', null, 'The standard parade sight picture', TURNS));
      lines.push(row(c, 'Power', null, 'More power and more back stick; a larger reduction on the rollout', TURNS));
    } else {
      lines.push(row(c, 'Roll about', null, 'Your own longitudinal axis', TURNS));
      lines.push(row(c, 'Altitude', null, "The underside of Lead's fuselage on the horizon", TURNS));
      lines.push(row(c, 'Closeness', null, "Lead's CFS door tangent to the trailing edge of the wing", TURNS));
      lines.push(row(c, 'Power', null, 'Add power (greater turn radius)', TURNS));
    }
    return { title: `Parade turn ${into ? 'into' : 'away from'} Wing${into ? '' : imc ? ' (IMC)' : ' (VMC)'}: ${dir.toLowerCase()}`, lines };
  },
  crossunder: (c) => {
    const to = c.otherSide;
    const lines = [
      ...signalled(c, 'crossunder', { side: to.toLowerCase() }),
      row(c, 'Lead', 'A steady platform and enough straight-away', null, XUNDER),
      row(c, 'Step-down', null, 'Exhaust stack tangent to the leading edge of the wing', XUNDER),
      row(c, 'Nose-to-tail', null, 'UHF antenna over the dihedral bend of the wing', XUNDER),
      row(c, 'Across', null, 'Slight wing dip toward Lead; no faster than a walking pace, shrimp eyes', XUNDER),
      row(c, 'Never', null, "Your nose under any part of Lead's aircraft", XUNDER),
    ];
    c.crossSides();
    return { title: `Cross-under to the ${to.toLowerCase()}`, lines };
  },
  breakup: (c, { underrun }) => {
    const lines = [
      ...signalled(c, 'breakup', { cadence: BR_CADENCE }),
      c.line('lead', `${SIGNAL.kissOff.name} signal`, SIGNAL.kissOff.ref, { kind: 'signal', how: SIGNAL.kissOff.how }),
      row(c, 'Break', `Level, away from Wing (${c.otherSide.toLowerCase()}), MAX power, 2-4 Gs, 200 KIAS, 180°`, 'Same direction 3 seconds later ("1, 2, go")', BR),
      row(c, 'In trail', 'Roll out, reset power for 200 KIAS', "800-1,000' in trail, 50-100' step-up, 200 KIAS", BR),
      c.line('wing', '(TAC) (wing #), set', BR),
      row(c, 'Rendezvous', '30° AOB turn on altitude, 200 KIAS power setting', 'Lead pursuit, 45-60° AOB, Lead on the horizon', BR),
      row(c, 'Bearing', null, "Top of the leading edge of Lead's vertical stabilizer on the leading edge of the outboard wingtip", BR),
      row(c, 'Corrections', null, 'STICK TO STAB', BR),
    ];
    if (underrun) {
      lines.push(row(c, 'Underrun', null, 'LOWER, LEVEL, IDLE, BOARDS, PASS BELOW AND BEHIND', UNDERRUN));
      lines.push(c.line('wing', '(TAC) (wing #), underrun.', APPC2));
      lines.push(c.line('lead', '(TAC) (lead #)', UNDERRUN));
      lines.push(c.line('ip', '(TAC) (wing #), cleared back to the inside.', APPC2));
    }
    lines.push(row(c, 'Join-up', null, 'At one to two wingspans: in like a V, out like a J, to the VMC turn away position', BR));
    return { title: underrun ? 'Breakup and rendezvous (underrun)' : 'Breakup and rendezvous', lines };
  },
  terminateBR: (c) => ({ title: 'Terminate', lines: terminate(c) }),
  // FTI §410. The swap happens between the signal and the slide aft: from then on 'lead' is the
  // aircraft that took it.
  leadChange: (c) => {
    const lines = [
      c.line('lead', `${SIGNAL.leadChange.name} signal`, LEAD_CHANGE, { kind: 'signal', how: 'Pat the side of your helmet closest to Wing three times with your opposite hand while looking forward, then turn your head and point your hand at Wing' }),
      c.line('wing', 'Pat your helmet once on the side closest to Lead, then a single chopping motion and look forward', LEAD_CHANGE, { kind: 'signal' }),
    ];
    c.swap();
    lines.push(
      row(c, 'New Lead', 'Maintain airspeed, altitude and heading; look forward', null, LEAD_CHANGE),
      row(c, 'Wingtip clearance', null, 'About 20\' (a slight wing dip away)', LEAD_CHANGE),
      row(c, 'Step-down', null, "Lead's pitot tube bisecting the fuselage, above the CFS door, below the ejection seat danger triangle", LEAD_CHANGE),
      row(c, 'Then', null, "Straight back past the 3/9 line to Lead's bearing line, then up the bearing line to parade", LEAD_CHANGE),
      c.line('wing', '(TAC) (wing #), strangled.', LEAD_CHANGE),
      c.line('lead', '(TAC) (lead #), TCAS/XPDR on.', LEAD_CHANGE),
    );
    return { title: `Lead change: ${c.lead} has the lead`, lines };
  },
  opsAfterLeadChange: (c, { reset }) => ({ title: 'Ops Check', lines: opsCheck(c, { reset: reset && c.nextFuel(reset) }) }),

  // Cruise maneuvering and tail chase (FTI §407-§408).
  cruise: (c) => ({
    title: 'Cruise maneuvering',
    lines: [
      ...signalled(c, 'cruise'),
      c.line('lead', '(TAC) flight, call set.', CRUISE_M),
      row(c, 'Power', '80%', '80% approaching the cruise position', CRUISE_M),
      row(c, 'Cruise position', null, "60° bearing line, about 20' step-down, three to six plane lengths", CRUISE),
      c.line('wing', '(TAC) (wing #), set.', CRUISE_M),
      row(c, 'First turn', 'Into Wing', null, CRUISE_M),
      row(c, 'Limits', 'No more than 120° AOB, no less than 1G', null, CRUISE_M),
      row(c, 'Level turns', '45°-60° bank, ~2 Gs', 'Lead, lag and pure pursuit within the cruise position', SUPP_CRUISE),
      row(c, 'Wingovers', '~120° (Maximum), 3-4 Gs', 'Stab to Star', SUPP_CRUISE),
      ...trainingComplete(c),
      ...terminate(c),
      c.line('lead', '(TAC) (wing #), cleared to board.', CRUISE_M),
    ],
  }),
  tailChase: (c) => ({
    title: 'Tail chase',
    note: 'The G warm-up is flown with the breakup, before tail chase.',
    lines: [
      ...signalled(c, 'tailChase'),
      row(c, 'Before the break', 'MAX power, descend slightly, accelerate to a minimum of 220 KIAS', 'Parade', TAIL),
      c.line('lead', `${SIGNAL.kissOff.name} signal`, SIGNAL.kissOff.ref, { kind: 'signal', how: SIGNAL.kissOff.how }),
      row(c, 'Break', "MAX power, 4G's, at least 180° of turn", "3 seconds after Lead, MAX power, 4-5G's", TAIL),
      c.line('wing', '(TAC) (wing #), set.', TAIL),
      row(c, 'Position', null, "800-1000 ft in trail, offset to Lead's 5 or 7 o'clock", TAIL),
      row(c, 'Lead limits', "Between 1G and 6G's, no slower than 110 KIAS", null, TAIL),
      row(c, 'Floor', "6000' AGL or 500' above the bottom of the block, whichever is higher", undefined, TAIL),
      row(c, 'Never', 'Split-S or Immelmann', undefined, TAIL),
      ...trainingComplete(c),
      ...terminate(c),
      c.line('lead', '(TAC) (wing #), cleared to board.', CRUISE_M),
    ],
  }),

  // Leaving the area for home (FTI §501, Supplement II.4).
  cruiseOut: (c) => ({
    title: 'Cruise, Ops Check, weather',
    lines: [
      c.line('lead', '(TAC), cleared to cruise, ops check, get weather', SUPP_RTB),
      c.line('wing', '(wing #)', SUPP_RTB),
      row(c, 'Admin cruise', null, "Parade altitude and bearing; Lead's pitot tube in line with and above the exhaust stack", CRUISE),
      switchTo(c, 'wing', 'PRI', 'CH 1 UHF', 'Navy Corpus ATIS', SUPP_RTB, { generated: true, note: 'Lead monitors the area frequency while Wing gets the weather.' }),
      c.line('ATIS', 'Navy Corpus information (ATIS), wind (wind), altimeter (altimeter), runway {rwy} in use.', null, { generated: true }),
      switchTo(c, 'wing', 'PRI', 'CH 18 UHF', 'Central Common', SUPP_RTB, { generated: true }),
      checklist(c, 'Descent Checklist', xcl('Descent Checklist', 'p. 28')),
      ...opsCheck(c),
      c.line('wing', '(ATIS), (wind), (altimeter), {rwy}', RECOVERY, { note: 'IWAR: Information code, Winds, Altimeter, Runway.' }),
      c.line('lead', '(lead #), copies', SUPP_RTB),
    ],
  }),
  leaveCentral: (c) => ({
    title: 'Leaving Central',
    lines: [
      c.line('lead', '99 Central, (TAC), flight of two, complete (altitude), course rules Shamrock', SUPP_RTB),
      switchTo(c, 'both', 'PRI', 'CH 8 UHF', 'Corpus Approach', SUPP_RTB, { note: 'Both aircraft automatically switch to approach frequency.' }),
      c.line('lead', 'Corpus Approach, (ATC), flight of 2, complete Central (altitude) with (ATIS), course rules Shamrock', SUPP_RTB),
      c.line('APP', '(ATC) and flight, proceed course rules Shamrock', SUPP_RTB),
      c.line('lead', '(ATC) and flight, proceed course rules Shamrock', SUPP_RTB),
      c.line('both', 'Initiate a descent after clearing the lateral boundaries of the Central area, just north of Fish Pass.', CENTRAL_OUT, { kind: 'rule' }),
      c.line('both', 'Heading east, perpendicular to the beach line (~[[105°]]), turn LEFT towards PT SHAMROCK upon reaching [[14]] DME or [[1/2]] working altitude, whichever comes first.', CENTRAL_OUT, { kind: 'rule' }),
      c.line('both', 'Maintain [[1000\']] MSL and join the [[Eastern]] Arrival to PT SHAMROCK.', CENTRAL_OUT, { kind: 'rule' }),
      row(c, 'Descent', 'No less than 20% torque (never less than 15%)', null, SPEED_BRAKE),
      c.line('lead', '(TAC) flight, standby speed brake', APPC2),
      c.line('lead', 'Speed brake, now.', APPC2),
    ],
  }),
  shamrock: (c) => ({
    title: 'Shamrock',
    lines: [
      row(c, 'Approaching Shamrock', 'Slow the flight to 200 KIAS', 'Back to parade on the proper side for the break', supp('I. General Overview and Guidance — Course Rules departing Central', 'p. 5')),
      c.line('lead', 'Corpus Approach, (ATC) and flight, Shamrock', SUPP_RTB),
      c.line('APP', '(ATC) and flight, terminate', SUPP_RTB),
      c.line('lead', '(ATC) and flight, terminate', SUPP_RTB),
      switchTo(c, 'both', 'PRI', 'CH 4 UHF', 'Navy Corpus Tower', SUPP_RTB, { note: 'Both aircraft automatically switch to Tower frequency.' }),
      c.line('lead', 'Navy Corpus Tower, (ATC), flight of 2, Shamrock, full stop', SUPP_RTB),
      c.line('TWR', '(ATC) and flight, report the initial {rwy}', SUPP_RTB),
      c.line('lead', '(ATC) and flight, report initial {rwy}', SUPP_RTB),
    ],
  }),
  theBreak: (c) => ({
    title: 'The break',
    lines: [
      c.line('lead', 'Navy Corpus Tower, (ATC) and flight, numbers {rwy}', SUPP_RTB),
      c.line('TWR', '(ATC) and flight, (break) break approved', SUPP_RTB),
      c.line('lead', '(ATC) and flight, (break) break', SUPP_RTB),
      c.line('lead', 'Quick look at Wing, kiss-off', BREAK, { kind: 'signal' }),
      row(c, 'Break', `${c.card.breakDir[0].toUpperCase()}${c.card.breakDir.slice(1)}, away from Wing`, '3 seconds after Lead', BREAK),
      row(c, 'Spacing', null, "A minimum of 1500 ft nose to tail; roll out outside Lead's downwind", BREAK),
      checklist(c, 'Before Landing Checklist', xcl('Before Landing Checklist', 'p. 29')),
    ],
  }),
  landing: (c) => ({
    title: 'Landing',
    lines: [
      c.line('lead', 'Navy Corpus Tower, (ATC) and flight, 180, gear down, full stop', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
      c.line('TWR', '(ATC) and flight, cleared to land {rwy}, dash two report gear down', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
      c.line('lead', '(ATC) and flight, cleared to land {rwy}', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
      c.line('wing', 'Dash 2, gear down', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
      c.line('TWR', 'Dash 2, roger gear', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
      row(c, 'Landing', 'Centerline', 'Centerline, 1500 feet behind Lead', supp('I. General Overview and Guidance — Miscellaneous', 'p. 7')),
    ],
  }),
  taxiBack: (c) => {
    const known = c.card.rwy === '13L';
    const clear = known ? 'clear of 13L on Delta' : 'clear of {rwy}';
    return {
      title: 'Taxi back',
      lines: [
        row(c, 'Clearing the runway', 'Clear the hold-short with room for Wing; After Landing Checklist', 'Clear of the hold-short: first three steps of the After Landing Checklist, then a thumbs up', TAXI_IN),
        switchTo(c, 'both', 'PRI', 'CH 3 UHF', 'Navy Corpus Ground', TAXI_IN, { note: 'Both aircraft automatically switch to the ground frequency.' }),
        c.line('lead', `Navy Corpus Ground, (ATC), flight of 2, ${clear}, taxi to my line`, known ? supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14') : null, known ? undefined : { generated: true }),
        c.line('GRD', '(ATC) and flight, taxi to your line', null, { generated: true }),
        c.line('lead', '(ATC) and flight, taxi to my line', null, { generated: true }),
        c.line('lead', '(TAC) (wing #), cleared to get parking and call base', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
        c.line('wing', '(wing #)', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
        c.line('note', 'Wing calls Texan Base for parking first (report back to Lead where to park on VHF tactical frequency) and the appropriate base second while Lead monitors ground frequency.', supp('II. Formation Sequence Communication Script — Return to Base', 'p. 14')),
      ],
    };
  },

  // Low work: a section PEL into McCampbell-Porter (KTFP) after the half sequence (Supplement
  // III; FTI §606).
  awos: (c, { reset } = {}) => ({
    title: 'Cruise and the KTFP weather',
    lines: [
      c.line('lead', '(TAC), cleared to cruise, ops check, get weather', SUPP_RTB),
      c.line('wing', '(wing #)', SUPP_RTB),
      switchTo(c, 'wing', 'AUX', '118.775', 'KTFP AWOS', SUPP_KTFP, { note: 'Wing will be off of VHF tactical frequency: both aircraft use BTN 18 within the section if needed.' }),
      c.line('AWOS', 'McCampbell-Porter automated weather, wind (wind), altimeter (altimeter).', null, { generated: true }),
      switchTo(c, 'wing', 'AUX', 'TAC AUX', 'Tactical', SUPP_KTFP, { generated: true }),
      ...opsCheck(c, { reset: reset && c.nextFuel(reset) }),
    ],
  }),
  tacOverEight: (c) => ({
    title: 'TAC over eight',
    note: 'A double switch: tactical frequency in UHF over BTN 8 in VHF. Chair fly it to avoid communicating on the wrong frequency.',
    lines: [
      c.line('lead', '99 Central, (TAC) flight of two, complete (altitude), practice PEL/overhead McCampbell-Porter', SUPP_KTFP),
      c.line('lead', '(TAC), push TAC over eight', SUPP_KTFP),
      c.line('wing', '(wing #)', SUPP_KTFP),
      switchTo(c, 'both', 'PRI', 'TAC PRI', 'Tactical', SUPP_KTFP),
      switchTo(c, 'both', 'AUX', 'CH 8 VHF', 'Corpus Approach', SUPP_KTFP),
      c.line('lead', '(TAC)', SUPP_KTFP),
      c.line('wing', '(wing #)', SUPP_KTFP),
      c.line('lead', 'Corpus Approach, (ATC), flight of two, complete Central (altitude), request practice PEL/overhead McCampbell-Porter with weather and NOTAMs', SUPP_KTFP),
      c.line('APP', '(ATC) and flight, proceed as requested', SUPP_KTFP),
    ],
  }),
  sectionPel: (c) => ({
    title: 'Section PEL',
    lines: [
      c.line('lead', '(TAC) (wing #), cleared to perch, simulated (EP), executing practice PEL', SUPP_KTFP),
      c.line('wing', '(wing #)', SUPP_KTFP),
      row(c, 'High-Key', "3000'", undefined, KTFP),
      row(c, 'Low-Key', "1500'", undefined, KTFP),
      row(c, 'Pattern', "800', left traffic", undefined, KTFP),
      row(c, 'To High Key', 'Maneuver and configure as appropriate; report setting 4-6% torque over the tactical frequency', "The support position: match the emergency aircraft's configuration", SECTION_PEL),
      switchTo(c, 'both', 'AUX', 'VHF 122.7', 'KTFP CTAF', KTFP, { generated: true, note: 'Standard CTAF calls must be made on VHF 122.7. When Approach is left is not printed.' }),
      c.line('lead', 'McCampbell-Porter traffic, (ATC) flight of two, high key, practice PEL, McCampbell-Porter', null, { generated: true }),
      c.line('lead', '(TAC) (wing #), cleared to detach', SUPP_KTFP),
      c.line('wing', '(wing #)', SUPP_KTFP),
      row(c, 'Detached', 'Continue the PPEL', 'TCAS on, transponder active with your own squawk and Flight Number', SUPP_KTFP),
      c.line('note', 'After separate PPELs are completed, both aircraft can expect to remain in the pattern for touch and goes. Once both IPs are satisfied all training is complete (on TAC) or after hitting bingo fuel, IPs will coordinate a join up and departure for transit to KCRP or KNGP.', supp('III. Outlying Field (OLF) Operations — McCampbell-Porter Airport (KTFP)', 'p. 16')),
    ],
  }),
  leaveKtfp: (c) => ({
    title: 'Leaving McCampbell-Porter',
    lines: [
      switchTo(c, 'both', 'PRI', 'CH 6 UHF', 'Corpus Approach', KTFP_OUT, { generated: true }),
      switchTo(c, 'both', 'AUX', 'TAC AUX', 'Tactical', KTFP_OUT, { generated: true }),
      c.line('both', 'Depart the pattern northbound (~[[350°]]) towards [[Bayside]].', KTFP_OUT, { kind: 'rule' }),
      c.line('both', 'Climb and maintain [[1000\']] MSL.', KTFP_OUT, { kind: 'rule' }),
      c.line('both', 'Contact Corpus Approach (CH [[6]] UHF) to join the [[Goliad Arrival]].', KTFP_OUT, { kind: 'rule' }),
      c.line('lead', 'Corpus Approach, (ATC), flight of two, off McCampbell-Porter, 1,000, course rules Shamrock', null, { generated: true }),
      c.line('APP', '(ATC) and flight, proceed course rules Shamrock', null, { generated: true }),
      c.line('both', 'Fly [[~155°]] to the [[Port Bay Bridge]].', GOLIAD_ARRIVAL, { kind: 'rule' }),
      c.line('both', 'Reaching the bridge descend to [[1000\']] MSL and fly direct to the [[Aransas Causeway]] (~150°) to join the Northern Arrival.', GOLIAD_ARRIVAL, { kind: 'rule' }),
      c.line('APP', '(ATC) and flight, change to approach local channel 8', null, { generated: true }),
      switchTo(c, 'both', 'PRI', 'CH 8 UHF', 'Corpus Approach', null, { generated: true }),
    ],
  }),
};

// The pattern direction at Navy Corpus, which decides the break (Course Rules Manual 1-5).
export const LEFT_TRAFFIC = ['13L', '31L', '36', '04'];
export const PATTERN_REF = PATTERN;
export const SEQUENCE_REF = SUPP_SEQUENCE;
export const COMM_REF = COMMS;
export const TERMINATE_REF = TERMINATE;
