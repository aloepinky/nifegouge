// The T-44C's EPs and limits as the Advanced exam asks them, off the two sheets the exam is
// handed out on: "T-44C EMERGENCY PROCEDURE CRITICAL ACTION MEMORY ITEMS & OPERATING LIMITS".
// Pure data, no JSX — the shape `EPDrill` renders (see Flight/c172Data.js).
//
// A row is a step ({ id, critical, text }: one box, answered as the checklist prints it,
// "Condition Lever - FUEL CUTOFF"), a decision line ({ decision }: the sheet's pre-printed
// ALL-CAPS conditionals), or a line of fixed text ({ note }).
//
// Every step on this sheet is a critical action memory item, so every one is asterisked.
// `concur` is the sheet's dagger: NATOPS §12.1, "Daggered items require concurrence of both
// pilots."
//
// Two typos on the sheet are corrected here, because `gradeAnswer` would otherwise mark the
// right answer wrong: "Firewall Value" (NATOPS Ch. 15 prints Firewall Valve) and "As- Required".

const step = (id, action, value = '') => ({ id, critical: true, text: value ? `${action} - ${value}` : action });
const concur = (id, action, value = '') => ({ ...step(id, action, value), concur: true });

export const T44C_EPS = [
  {
    id: 'abnormal-start',
    title: 'Abnormal Start',
    rows: [
      step('as1', 'Condition Lever', 'FUEL CUTOFF (Dec. Below 790°C)'),
      step('as2', 'Starter', 'Starter Only (For The Remainder Of The 40 Seconds)'),
      step('as3', 'Starter', 'Off (at 40 seconds)'),
    ],
  },
  {
    id: 'emer-shutdown-deck',
    title: 'Emergency Shutdown on Deck',
    rows: [
      step('esod1', 'Stop the aircraft and set the parking brake.'),
      step('esod2', 'Condition Levers', 'FUEL CUTOFF'),
      { decision: 'IN CASE OF CONFIRMED/SUSPECTED FIRE OR FUEL LEAK, CONTINUE CHECKLIST. IF NOT, SECURE REMAINING ENGINE USING SECURE CHECKLIST.' },
      step('esod3', 'Firewall Valves', 'CLOSED'),
      step('esod4', 'Boost Pumps', 'OFF'),
      step('esod5', 'Fire Extinguisher', 'As Required'),
      step('esod6', 'AUX BATT Switch', 'OFF'),
      step('esod7', 'Gang Bar', 'OFF'),
      step('esod8', 'Evacuate Aircraft'),
    ],
  },
  {
    id: 'aborting-takeoff',
    title: 'Aborting Takeoff',
    rows: [
      step('abort1', 'Announce "Abort"'),
      step('abort2', 'Power Levers', 'IDLE'),
      step('abort3', 'Reverse', 'As Required'),
      step('abort4', 'Brakes', 'As Required'),
      { decision: 'IMMEDIATELY PRIOR TO DEPARTING THE PREPARED SURFACE:' },
      step('abort5', 'Condition Levers', 'FUEL CUTOFF'),
      { decision: 'AS SOON AS PRACTICABLE:' },
      step('abort6', 'Firewall Valves', 'Closed'),
      step('abort7', 'Boost Pumps', 'OFF'),
      step('abort8', 'Fire Extinguisher(s)', 'As Required'),
      step('abort9', 'AUX BATT Switch', 'OFF'),
      step('abort10', 'Gang Bar', 'OFF'),
      step('abort11', 'Evacuate Aircraft'),
    ],
  },
  {
    id: 'eng-fail-after-takeoff',
    title: 'Engine Failure After Takeoff',
    rows: [
      step('efat1', 'Power', 'As Required'),
      step('efat2', 'Landing gear', 'UP'),
      step('efat3', 'Airspeed', 'As Required (VXSE Or VYSE)'),
      step('efat4', 'Emergency Shutdown Checklist', 'Execute'),
    ],
  },
  {
    id: 'emer-shutdown-checklist',
    title: 'Emergency Shutdown Checklist',
    rows: [
      concur('esc1', 'Power Lever', 'IDLE'),
      concur('esc2', 'Prop Lever', 'FEATHER'),
      concur('esc3', 'Condition Lever', 'FUEL CUTOFF'),
      { decision: 'IN CASE OF CONFIRMED/SUSPECTED FIRE OR FUEL LEAK, CONTINUE CHECKLIST. IF PROP FAILS TO FEATHER, PROCEED TO ALTERNATE FEATHERING CHECKLIST.' },
      concur('esc4', 'Firewall Valve', 'CLOSED'),
      concur('esc5', 'Fire Extinguisher', 'As Required'),
      concur('esc6', 'Bleed air valve', 'Closed'),
    ],
  },
  {
    id: 'windmilling-airstart',
    title: 'Windmilling Airstart',
    rows: [
      concur('wa1', 'Power Lever (Failed Engine)', 'IDLE'),
      concur('wa2', 'Prop Lever (Failed Engine)', 'Pull Forward'),
      concur('wa3', 'Condition Lever (Failed Engine)', 'FUEL CUTOFF'),
      step('wa4', 'Firewall Valve', 'OPEN'),
      step('wa5', 'Autoignition', 'ARMED'),
      step('wa6', 'Condition Lever', 'LOW IDLE'),
      step('wa7', 'Power', 'As Required'),
    ],
  },
  {
    id: 'smoke-fire-unknown-origin',
    title: 'Smoke/Fire of Unknown Origin',
    rows: [
      step('sfuo1', 'Crew', 'Alerted'),
      step('sfuo2', 'Cabin Temperature Mode', 'OFF'),
      step('sfuo3', 'Vent Blower', 'AUTO'),
      step('sfuo4', 'Oxygen Mask/MIC Switches (100 Percent)', 'As Required'),
    ],
  },
  {
    id: 'smoke-fume-elimination',
    title: 'Smoke and Fume Elimination',
    rows: [
      step('sfe1', 'Oxygen Mask/MIC Switches (100 Percent)', 'As Required'),
      step('sfe2', 'Pressurization', 'DUMP'),
    ],
  },
  {
    id: 'fuel-leaks',
    title: 'Fuel Leaks',
    rows: [
      concur('fl1', 'Condition Lever', 'FUEL CUTOFF'),
      step('fl2', 'Emergency Shutdown Checklist', 'Execute'),
    ],
  },
  {
    id: 'primary-governor-failure',
    title: 'Primary Governor Failure/Malfunction',
    rows: [
      step('pgf1', 'Attempt To Adjust Prop RPM to Normal Operating Range'),
      concur('pgf2', 'Power Lever', 'IDLE'),
      concur('pgf3', 'Prop Lever', 'FEATHER'),
      step('pgf4', 'Alternate Prop Feather Checklist', 'As Required'),
      step('pgf5', 'Land as soon as possible.'),
    ],
  },
  {
    id: 'explosive-decompression',
    title: 'Explosive Decompression',
    rows: [
      step('ed1', 'Oxygen Mask/MIC Switches (100 Percent)', 'As Required'),
      step('ed2', 'Descend', 'As Required'),
    ],
  },
  {
    id: 'unscheduled-electric-trim',
    title: 'Unscheduled Electric Trim Activation',
    rows: [
      step('ueta1', 'A/P/Trim Disconnect (control wheel)', 'Depress Fully and Hold.'),
    ],
  },
  {
    id: 'emergency-descent',
    title: 'Emergency Descent Procedure',
    rows: [
      step('edp1', 'Power Levers', 'IDLE'),
      step('edp2', 'Props', 'Full Forward'),
      step('edp3', 'Flaps', 'As Required'),
      step('edp4', 'Landing Gear', 'As Required'),
      step('edp5', 'Airspeed', 'As Required'),
      step('edp6', 'Windshield Heat', 'As Required'),
    ],
  },
  {
    id: 'spin-ocf-recovery',
    title: 'Spin/Out of Control Flight Recovery',
    rows: [
      step('spin1', 'Power Levers', 'IDLE'),
      step('spin2', 'Rudder', 'Full Deflection Opposite Direction Of Turn Needle'),
      step('spin3', 'Control Wheel', 'Rapidly Forward'),
      step('spin4', 'Rudder', 'Neutralize After Rotation Stops'),
      step('spin5', 'Control Wheel', 'Pull Out Of Dive By Exerting Smooth, Steady Back Pressure'),
    ],
  },
  {
    id: 'terrain-warning',
    title: 'Terrain Warning (IMC or at Night)',
    rows: [
      step('tw1', 'Wings', 'Level'),
      step('tw2', 'Power', 'Max Continuous'),
      step('tw3', 'Pitch', 'As Required to set and maintain VX'),
      step('tw4', 'Flaps', 'Approach (Unless Already Up)'),
      step('tw5', 'Gear', 'UP'),
      step('tw6', 'Flaps', 'UP'),
      step('tw7', 'Props', '1900 RPM'),
      step('tw8', 'Continue Climb at Vx Until All Visual And Voice Warnings Cease'),
    ],
  },
  {
    id: 'single-engine-waveoff',
    title: 'Single-Engine Waveoff/Missed Approach',
    rows: [
      step('sewo1', 'Power', 'Max Continuous, Establish Positive Rate Of Climb (VXSE Minimum)'),
      step('sewo2', 'Flaps', 'APPROACH (Unless Already UP)'),
      step('sewo3', 'Landing Gear', 'UP'),
      step('sewo4', 'Flaps', 'UP'),
      step('sewo5', 'Prop', '1900 RPM'),
    ],
  },
  {
    id: 'low-altitude-windshear',
    title: 'Low Altitude Windshear',
    rows: [
      step('law1', 'Power', 'Max Continuous'),
      step('law2', 'Pitch', 'Set and Hold Approximately 15° Noseup'),
      step('law3', 'Landing Gear', 'UP'),
      step('law4', 'Flaps', 'Maintain Current Setting'),
    ],
  },
];

// Field key to answer, one per blank on the operating limits sheet. Ranges are written
// "min-max" or "min to max"; the checker accepts either, and ignores units and a leading "+".
//
// Cells the sheet prints itself are not here: every "---" in the engine grid, "Indication" in
// STARTING's oil-pressure cell, and the "(Min)" and footnote markers beside a value.
//
// The filled key leaves three blanks that the sheet asks, because its own sentence is truncated
// mid-cell. NATOPS supplies them, marked NATOPS below:
//   note3GroundMin, note3FlightMin  40 PSIG each   (NAVAIR 01-T44AAC-1, Figure 4.3-1 note 3)
//   vfe100                          140 KIAS       (NAVAIR 01-T44AAC-1, §4.4.1.7.b)
// The sheet's leading "MAX FLAP EXTENSION/EXTENDED (VFE): ____" blank is not asked: neither the
// key nor NATOPS states a single VFE, which publishes approach and full only.
export const T44C_LIMITS = {
  // OPERATING LIMITS grid. MAX. ALLOWABLE at 1,900 rpm is "---" on the sheet (Figure 4.3-1).
  maxAllowTime: '5 MINUTES',
  maxAllowTq2200: '1315',
  maxAllowItt: '790',
  maxAllowN1: '101.5',
  maxAllowNp: '2200',
  maxAllowOilP: '85-100',
  maxAllowOilT: '10-99',

  maxContTime: 'CONTINUOUS',
  maxContTq2200: '1315',
  maxContTq1900: '1520',
  maxContItt: '790',
  maxContN1: '101.5',
  maxContNp: '2200',
  maxContOilP: '85-100',
  maxContOilT: '10-99',

  cruiseClimbTime: 'CONTINUOUS',
  cruiseClimbTq2200: '1315',
  cruiseClimbTq1900: '1520',
  cruiseClimbItt: '765',
  cruiseClimbN1: '101.5',
  cruiseClimbNp: '2200',
  cruiseClimbOilP: '85-100',
  cruiseClimbOilT: '10-99',

  cruiseTime: 'CONTINUOUS',
  cruiseTq2200: '1315',
  cruiseTq1900: '1520',
  cruiseItt: '740',
  cruiseN1: '101.5',
  cruiseNp: '2200',
  cruiseOilP: '85-100',
  cruiseOilT: '10-99',

  hiIdleTime: 'CONTINUOUS',
  hiIdleOilT: '-40-99',

  loIdleTime: 'CONTINUOUS',
  loIdleItt: '685',
  loIdleOilP: '40',
  loIdleOilT: '-40-99',

  startingTime: '40 SECONDS',
  startingItt: '1090',
  startingOilT: '-40',

  accelTime: '2 SECONDS',
  accelTq: '2100',
  accelItt: '850',
  accelN1: '102.6',
  accelNp: '2420',
  accelOilT: '10-99',

  maxRevTime: '1 MINUTE',
  maxRevItt: '790',
  maxRevN1: '86',
  maxRevNp: '2100',
  maxRevOilP: '85-100',
  maxRevOilT: '10-99',

  // NOTES
  note1N1Min: '70',
  note1N1Max: '73',
  note2N1Min: '51',
  note2N1Max: '54',
  note3NormalMin: '85',
  note3NormalMax: '100',
  note3Undesirable: '85',
  note3GroundMin: '40', // NATOPS
  note3FlightMin: '40', // NATOPS
  note4Itt: '925',
  note5N1Reduce: '2.2',
  note10RpmMin: '900',
  note10RpmMax: '1100',

  // AIRSPEED LIMITATIONS (KIAS)
  vmo: '227',
  vmoDecrease: '4',
  vmoPerFt: '1000',
  vmoAboveFt: '15500',
  mmo: '.48',
  vsse: '91',
  vmca: '86',
  va: '153',
  vle: '155',
  vlr: '145',
  vfe35: '174',
  vfe100: '140', // NATOPS
  vx: '102',
  vy: '108',
  vxse: '102',
  vyse: '110',
  maxRangeGlide: '130',
  maxEnduranceGlide: '102',
  vmcg: '63',

  // STARTER CYCLE LIMITATIONS. NATOPS §4.2.3 gives the cooling periods as 60 seconds, 60
  // seconds, then 30 minutes; the sheet asks for the bare figures and prints no units.
  starterCycleLength: '40 SECOND',
  starterCool1: '60',
  starterCool2: '60',
  starterCool3: '30',

  // ELECTRICAL LIMITATIONS
  dcGenVolt: '28.25',
  dcGenTol: '.8',
  apuChargeVolts: '18',
  apuStartVolts: '20',
  battStartVolts: '22',
  propDeicerMin: '14',
  propDeicerMax: '18',

  // PROHIBITED MANEUVERS
  prohib1: 'INTENTIONAL SPINS',
  prohib2: 'AEROBATIC MANEUVERS',

  // ACCELERATION LIMITATIONS. Stored without the leading "+", which gradeLimit ignores.
  accelCleanPos: '3.0',
  accelCleanNeg: '-1.0',
  accelFlapsPos: '2.0',
  accelFlapsNeg: '0.0',

  // GENERAL LIMITATIONS
  pneumaticMin: '12',
  pneumaticMax: '20',
  gyroMin: '4.3',
  gyroMax: '5.9',
  oxygenLocal: '1000',
  oxygenXc: '1500',
  cabinDiff: '4.7',
  tasAltRange: '2700',
  altitudeCeiling: '31000',

  // WEIGHT LIMITATIONS
  maxRamp: '9710',
  maxTakeoff: '9650',
  maxLanding: '9168',

  // LANDING LIMITATIONS
  landingType: 'FLARED',
  maxSinkRate: '600',
  maxCrosswind: '20',

  // FUEL
  fuelTotal: '387.6',
  fuelUsable: '384',
};

// Blanks asked together in Random mode: one row of the engine grid, the two ends of a range,
// the parts of one sentence. Everything else is asked on its own.
export const T44C_LIMIT_GROUPS = [
  ['maxAllowTime', 'maxAllowTq2200', 'maxAllowItt', 'maxAllowN1', 'maxAllowNp', 'maxAllowOilP', 'maxAllowOilT'],
  ['maxContTime', 'maxContTq2200', 'maxContTq1900', 'maxContItt', 'maxContN1', 'maxContNp', 'maxContOilP', 'maxContOilT'],
  ['cruiseClimbTime', 'cruiseClimbTq2200', 'cruiseClimbTq1900', 'cruiseClimbItt', 'cruiseClimbN1', 'cruiseClimbNp', 'cruiseClimbOilP', 'cruiseClimbOilT'],
  ['cruiseTime', 'cruiseTq2200', 'cruiseTq1900', 'cruiseItt', 'cruiseN1', 'cruiseNp', 'cruiseOilP', 'cruiseOilT'],
  ['hiIdleTime', 'hiIdleOilT'],
  ['loIdleTime', 'loIdleItt', 'loIdleOilP', 'loIdleOilT'],
  ['startingTime', 'startingItt', 'startingOilT'],
  ['accelTime', 'accelTq', 'accelItt', 'accelN1', 'accelNp', 'accelOilT'],
  ['maxRevTime', 'maxRevItt', 'maxRevN1', 'maxRevNp', 'maxRevOilP', 'maxRevOilT'],
  ['note1N1Min', 'note1N1Max'],
  ['note2N1Min', 'note2N1Max'],
  ['note3NormalMin', 'note3NormalMax', 'note3Undesirable', 'note3GroundMin', 'note3FlightMin'],
  ['note10RpmMin', 'note10RpmMax'],
  ['vmoDecrease', 'vmoPerFt', 'vmoAboveFt'],
  ['vfe35', 'vfe100'],
  ['starterCycleLength', 'starterCool1', 'starterCool2', 'starterCool3'],
  ['dcGenVolt', 'dcGenTol'],
  ['propDeicerMin', 'propDeicerMax'],
  ['prohib1', 'prohib2'],
  ['accelCleanPos', 'accelCleanNeg'],
  ['accelFlapsPos', 'accelFlapsNeg'],
  ['pneumaticMin', 'pneumaticMax'],
  ['gyroMin', 'gyroMax'],
  ['oxygenLocal', 'oxygenXc'],
  ['maxRamp', 'maxTakeoff', 'maxLanding'],
  ['maxSinkRate', 'maxCrosswind'],
  ['fuelTotal', 'fuelUsable'],
];

// The notes, warnings and cautions NATOPS prints with these procedures, keyed by the step they
// follow. A key that is an EP's own id carries the ones the publication puts before the steps,
// or in the section the procedure belongs to, and the EP's title bar opens those.
//
// Every one of these was read off the rendered page. `pdftotext` recovers the *body* of a block
// but drops the WARNING and CAUTION labels entirely — they are vector art, not text, and the
// extraction has zero of either against 189 "Note"s — so which of the three a block is cannot be
// read from the text layer. Guessing would be worse than useless: a warning is about injury and
// a caution about damage. Aborting Takeoff's two blocks are WARNINGs, not the CAUTIONs the bare
// text suggests. Render the page before adding to this.
//
// Only the steps the exam sheet carries are covered. NATOPS prints more against the later,
// non-memory steps of several of these procedures; those steps are not on the sheet, so their
// blocks are not here.
export const T44C_EP_NWC = {
  // Abnormal Start — NATOPS §13.1
  'abnormal-start': {
    warnings: [],
    cautions: [],
    notes: ['If the condition lever is not moved to low idle during the start sequence or the battery voltage is below 18V, place the starter switch OFF. Motoring the engine is not required.'],
  },
  as3: {
    warnings: [],
    cautions: ['Failure to adhere to starter limitations could cause damage to the starter.'],
    notes: ['If starting attempt is discontinued and another start is to be attempted, allow the engine to come to a complete stop and observe starter limitations before another start is attempted.'],
  },

  // Emergency Shutdown on Deck — NATOPS §13.2
  esod1: {
    warnings: [],
    cautions: [],
    notes: ['Confirm, if possible, that fire actually exists by checking engine instruments and nacelles.'],
  },
  esod5: {
    warnings: [],
    cautions: [],
    notes: ['The engine fire extinguisher is a single-shot system with one cylinder for each engine. Do not attempt engine restart until the cause of the fire is determined and corrected.'],
  },

  // Aborting Takeoff — NATOPS §14.1
  abort3: {
    warnings: [
      'Mechanical stops incorporated in the throttle quadrant prevent rapid movement of the power levers from the beta range to the flight range. Downward pressure must be applied to the power levers to permit movement into the flight range and allow power to be added.',
      'A misrigged linkage between a power lever and corresponding propeller could cause directional control problems while reversing during an aborted takeoff or landing rollout. If directional control problems are encountered while reversing, advance both power levers toward FLIGHT IDLE to minimize the effects or asymmetric propeller reversal. Maintain directional control with rudder, nosewheel steering, and brakes.',
    ],
    cautions: [],
    notes: [],
  },
  abort4: {
    warnings: [
      'Single-engine reversing may be applied if required. Use extreme caution if takeoff surface is not hard and dry.',
      'Part XI accelerate-stop distances are increased by approximately 900 feet with the condition levers at HIGH IDLE and no reverse is utilized.',
    ],
    cautions: [],
    notes: [],
  },

  // Engine Failure After Takeoff — NATOPS §14.3
  efat3: {
    warnings: ['If the autofeather system is being used, retarding either power lever before the feathering sequence is completed will deactivate the autofeather circuit and prevent automatic feathering.'],
    cautions: [],
    notes: [],
  },
  efat4: {
    warnings: ['A positive single-engine rate of climb will not be obtained in any configuration with the inoperative engine propeller windmilling.'],
    cautions: [],
    notes: [],
  },

  // Emergency Shutdown Checklist — NATOPS §15.2
  esc1: {
    warnings: ['If the autofeather system is being used, retarding either power lever before the feathering sequence is completed will deactivate the autofeather circuit and prevent automatic feathering.'],
    cautions: [],
    notes: [],
  },
  esc6: {
    warnings: ['If the bleed air valve is left open, smoke or fumes may enter through the pressurization system.'],
    cautions: [],
    notes: [],
  },

  // Windmilling Airstart — NATOPS §15.4.2, under the cautions §15.4 sets for airstarts generally
  'windmilling-airstart': {
    warnings: [],
    cautions: [
      'Unless a greater emergency exists, the cause for engine failure should be determined before attempting an airstart.',
      'Above 20,000 feet, starts tend to be hotter. During engine acceleration to idle speed, it may be necessary to periodically cycle the condition lever to FUEL CUTOFF to avoid an over temperature.',
      'Electrical loads not consistent with flight conditions should be reduced.',
    ],
    notes: [],
  },
  wa5: {
    warnings: [],
    cautions: ['Windmilling airstarts above 20,000 feet or below 2,200 prop rpm may exceed ITT limitations.'],
    notes: [],
  },
  wa6: {
    warnings: ['If engine was shut down by closing the firewall valve, time to light-off during restart may exceed 10 seconds.'],
    cautions: [],
    notes: ['Indicated airspeed of 130 KIAS or greater would increase the airflow through the engine and decrease start time (for N1 to reach 50 percent) and the likelihood of an overtemp.'],
  },

  // Smoke/Fire of Unknown Origin — NATOPS §15.7
  sfuo3: {
    warnings: ['Repeated or prolonged exposure to and/or inhalation of high concentrations of extinguishing agent or its decomposition products should be avoided. The liquid may cause frostbite if allowed to contact the skin.'],
    cautions: [],
    notes: ['If the fire source is known, immediately turn off all affected electrical circuits and fight the fire with the hand-held fire extinguishers. If fire source cannot be isolated, continue the checklist.'],
  },
  sfuo4: {
    warnings: ['Avoid the use of 100 percent oxygen near an open flame.'],
    cautions: [],
    notes: [
      'When the MIC switch is placed in the MASK position, the respective speaker comes on automatically, which may cause significant feedback.',
      'The speaker circuit breaker at the respective crew position can be pulled to disable the speaker.',
      'If the speaker is disabled, use of the individual headset will be required for audio.',
    ],
  },

  // Smoke and Fume Elimination — NATOPS §15.8
  sfe1: {
    warnings: [],
    cautions: [],
    notes: [
      'When the MIC switch is placed in the MASK position, the respective speaker comes on automatically, which may cause significant feedback.',
      'The speaker circuit breaker at the respective crew position can be pulled to disable the speaker.',
      'If the speaker is disabled, use of the individual headset will be required for audio.',
    ],
  },
  sfe2: {
    warnings: ['Standby magnetic compass suspension fluid is highly flammable and toxic. The fumes will irritate eyes, cause dizziness, induce nausea, and may lead to unconsciousness. If standby magnetic compass leakage occurs, perform the Smoke and Fume Elimination checklist, consider securing affected electrical equipment and land as soon as possible.'],
    cautions: [],
    notes: [
      'Nauseating fumes from residual desalination solution can enter the cockpit via bleed air for air-conditioning/pressurization and are often detected immediately after takeoff.',
      'Provided no secondary indications exist, closing the bleed air valves will significantly reduce the intensity of the nauseating fumes.',
    ],
  },

  // Primary Governor Failure/Malfunction — NATOPS §15.14.1
  'primary-governor-failure': {
    warnings: [],
    cautions: ['Certain failures of the primary governor will cause the speed control as well as the minimum blade angle control (beta valve) to be inoperative. In this case, aircraft control will be marginal at lower airspeeds and lower engine power settings. Extended flight and/or landing with an overspeeding prop is therefore strongly discouraged.'],
    notes: [],
  },
  pgf3: {
    warnings: ['Prop rpm exceeding 2,420 may result in reduction gearbox failure and/or Np turbine damage.'],
    cautions: [],
    notes: [
      'The engine with the disabled prop may be operated to provide electrical power.',
      'The right prop may not fully feather with the prop sync on.',
      'A fully feathered prop will still be turning at approximately 200 rpm with the engine running.',
    ],
  },

  // Explosive Decompression — NATOPS §15.19
  ed1: {
    warnings: [],
    cautions: [],
    notes: [
      'When the MIC switch is placed in the MASK position, the respective speaker comes on automatically, which may cause significant feedback.',
      'The speaker circuit breaker at the respective crew position can be pulled to disable the speaker.',
      'If the speaker is disabled, use of the individual headset will be required for audio.',
    ],
  },

  // Emergency Descent Procedure — NATOPS §15.20
  edp6: {
    warnings: [],
    cautions: ['Do not exceed airframe limitations.'],
    notes: [],
  },

  // Unscheduled Electric Trim Activation — NATOPS §15.22.2
  ueta1: {
    warnings: [],
    cautions: [],
    notes: ['Autopilot will disengage when the disconnect switch is depressed.'],
  },

  // Spin/Out of Control Flight Recovery — NATOPS §15.23.1
  spin5: {
    warnings: [
      'Abrupt pullout during spin recovery could result in excessive wing loading and a secondary stall or structural damage.',
      'Do not exceed 3g’s during pullout in a clean configuration or 2g’s if flaps are fully extended.',
    ],
    cautions: [],
    notes: [],
  },

  // Terrain Warning — NATOPS §15.26.2
  'terrain-warning': {
    warnings: [],
    cautions: [],
    notes: ['For ditching, off-airport landings, or operations at airfields not in the EGPWS database, inhibit TAWS by selecting the TERR INHB function on the MFD.'],
  },

  // Single-Engine Waveoff/Missed Approach — NATOPS §16.2
  sewo2: {
    warnings: ['A single-engine full-flap waveoff is left to the discretion of the pilot, but is not recommended because of the poor waveoff capability of the aircraft in this configuration.'],
    cautions: [],
    notes: [],
  },
  sewo3: {
    warnings: ['The landing gear is raised when the rate of descent has been stopped or there is no possibility of a touchdown.'],
    cautions: [],
    notes: [],
  },
  sewo5: {
    warnings: [],
    cautions: [],
    notes: ['Reducing propeller rpm to 1,900 reduces drag, enhancing climb performance.'],
  },

  // Low-Altitude Windshear — NATOPS §16.3
  law4: {
    warnings: [
      'If stall warning is encountered during windshear recovery, aft control wheel pressure should be relaxed only slightly to lessen angle of attack and allow the aircraft to exit stall.',
      'It is imperative that the pilot fly a constant nose-high attitude with maximum allowable power set. The pilot should disregard airspeed. When any type of windshear is encountered, it shall be reported to the controller immediately.',
    ],
    cautions: [],
    notes: [],
  },
};
