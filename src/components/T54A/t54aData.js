// The T-54A's EPs and limits as the Advanced exam asks them, off the two sheets the exam is
// handed out on: "T-54A EMERGENCY PROCEDURE CRITICAL ACTION MEMORY ITEMS & OPERATING LIMITS -
// 15 NOVEMBER 2025 Revision" (EP answer key, 31 JUL 26 update; limits answer key, 06 APR 26
// update). Pure data, no JSX — the shape `EPDrill` renders (see T44C/t44cData.js).
//
// Checked against the NATOPS, A1-T54A-NFM-000 with IC 04 (Ch. 13 to 16 for the procedures, Ch. 4
// for the limits). The sheet's 24 procedures are exactly the 24 the NATOPS asterisks, with the
// same steps in the same order, the daggers where the NATOPS puts them, and each decision line
// where the NATOPS prints it. Every limit agrees. Where the two differ it is in wording only, and
// the sheet's is kept, because it is what a student writes: "hot or hung start" (NATOPS "hot start
// or hung start"), no "(PF)" after Unscheduled Electric Trim's step 1 or Explosive Decompression's
// step 2, "15 degrees" for 15°. The pocket checklist still prints TCAS RA step 2 as
// "Autothrottles — Disengage"; IC 04 made it "As required", as the sheet has it.
//
// A row is a step ({ id, critical, text }: one box, answered as the sheet prints it), a decision
// line ({ decision }: the conditionals the blank sheet pre-prints), or a sub-step ({ sub }:
// numbered with its letter, the step count not advancing). Every numbered step on the sheet is a
// critical action memory item, so every one is asterisked; the dagger (`concur`) is "requires
// concurrence of both pilots", as on the T-44C sheet.
//
// The sheet's own wording is kept, crew positions (PF, PM, LS, RS, OBS) included, because that is
// what a student writes on the exam. Three changes, each so a right answer is not marked wrong
// or the step reads as one action:
//   * "Manuever as required" is spelled "Maneuver".
//   * "Fire extinguisher - As required (LS, RS" gets its closing parenthesis.
//   * Engine Failure After Takeoff prints "Go to Emergency Shutdown Checklist" on its own line
//     under step 6, unnumbered and not pre-printed on the blank sheet. It is step 6's action, so
//     it is part of step 6's answer.

const step = (id, action, value = '') => ({ id, critical: true, text: value ? `${action} - ${value}` : action });
const concur = (id, action, value = '') => ({ ...step(id, action, value), concur: true });

export const T54A_EPS = [
  {
    id: 'abnormal-start-hot',
    title: 'Abnormal Start (Hot, Hung, IGN)',
    rows: [
      step('ash1', 'Condition Lever', 'FUEL CUTOFF'),
      step('ash2', 'IGNITION AND ENGINE START switch', 'OFF (1 sec)'),
      step('ash3', 'IGNITION AND ENGINE START switch', 'STARTER ONLY (for the remainder of the 40 second time limit)'),
      step('ash4', 'IGNITION AND ENGINE START switch', 'OFF (at the 40 second time limit)'),
      step('ash5', 'Do not attempt another start until the cause of the hot or hung start has been corrected.'),
    ],
  },
  {
    id: 'abnormal-start-no-light',
    title: 'Abnormal Start (No Light)',
    rows: [
      step('asnl1', 'Condition Lever', 'FUEL CUTOFF'),
      step('asnl2', 'IGNITION AND ENGINE START switch', 'OFF'),
      step('asnl3', 'Engine Clearing Procedure', 'Execute'),
    ],
  },
  {
    id: 'emer-shutdown-ground',
    title: 'Emergency Engine Shutdown on the Ground',
    rows: [
      step('esg1', 'Stop the aircraft and set the parking brake.'),
      step('esg2', 'Condition Lever(s)', 'FUEL CUTOFF'),
      { decision: 'If confirmed or suspected fire or fuel leak:' },
      step('esg3', 'Firewall Shutoff Valves (both)', 'CLOSE'),
      step('esg4', 'Fire Extinguisher', 'As required'),
      step('esg5', 'Gang bar', 'OFF'),
      step('esg6', 'SDU Power', 'OFF'),
      step('esg7', 'Evacuate Aircraft'),
    ],
  },
  {
    id: 'aborted-takeoff',
    title: 'Aborted Takeoff',
    rows: [
      step('abort1', 'Announce "Abort"'),
      step('abort2', 'Autothrottles', 'Disengage'),
      step('abort3', 'Power Levers', 'GROUND FINE'),
      step('abort4', 'Brakes', 'As required'),
      step('abort5', 'Power Levers', 'REVERSE as required'),
      { decision: 'If aircraft appears likely to depart the prepared surface:' },
      step('abort6', 'CONDITION levers', 'FUEL CUTOFF'),
      { decision: 'After aircraft comes to a stop:' },
      step('abort7', 'Emergency Engine Shutdown on the Ground', 'Execute'),
    ],
  },
  {
    id: 'eng-fail-after-takeoff',
    title: 'Engine Failure After Takeoff',
    rows: [
      step('efat1', 'Power', 'As required'),
      step('efat2', 'Landing Gear (when climb established)', 'UP'),
      step('efat3', 'Airspeed', 'VXSE or VYSE'),
      concur('efat4', 'Propeller (inoperative engine)', 'Verify feathered'),
      // The sheet prints "† a." with no asterisk, and the blank sheet leaves the whole line to be
      // written, condition included, so the condition is part of the answer rather than a
      // pre-printed decision line.
      { ...concur('efat4a', 'If propeller fails to feather, PROP lever (inoperative engine)', 'FEATHER'), critical: false, sub: 'a' },
      step('efat5', 'Flaps', 'UP'),
      step('efat6', 'Above 1,500 feet AGL or established at VFR pattern Altitude', 'Go to Emergency Shutdown Checklist'),
    ],
  },
  {
    id: 'emer-shutdown-checklist',
    title: 'Emergency Shutdown Checklist',
    rows: [
      concur('esc1', 'Condition lever', 'FUEL CUTOFF (PF)'),
      concur('esc2', 'PROP lever', 'FEATHER (PF)'),
      concur('esc3', 'Power Lever', 'IDLE (PF)'),
      concur('esc4', 'Firewall shutoff valve', 'CLOSE (LS)'),
      concur('esc5', 'Fire extinguisher', 'As required (LS, RS)'),
    ],
  },
  {
    id: 'eng-fail-second',
    title: 'Engine Failure (Second Engine)',
    rows: [
      step('efse1', 'Airspeed', 'Pitch for 140 KIAS'),
      { decision: 'If airstart is desired:' },
      step('efse2', 'Windmilling Air Start', 'Execute'),
      { decision: 'If airstart is not possible or undesired:' },
      step('efse3', 'Emergency Shutdown Checklist', 'Execute'),
      step('efse4', 'Land or ditch immediately.'),
    ],
  },
  {
    id: 'windmilling-airstart',
    title: 'Windmilling Airstart',
    rows: [
      concur('wa1', 'CONDITION lever', 'FUEL CUTOFF (PF)'),
      concur('wa2', 'PROP lever', 'Full Forward (PF)'),
      concur('wa3', 'POWER Lever', 'IDLE (PF)'),
      step('wa4', 'FIREWALL SHUTOFF VALVE', 'OPEN (LS)'),
      step('wa5', 'Autoignition', 'ARM (LS)'),
      step('wa6', 'CONDITION lever (11.5% N1 or above)', 'LOW IDLE (PF)'),
      step('wa7', 'Engine Instruments', 'Monitor (1000 C Maximum) (PF, PM)'),
      step('wa8', 'Power', 'As Required (PF)'),
    ],
  },
  {
    id: 'smoke-fire-fumes',
    title: 'Smoke, Fire, or Fumes Checklist',
    rows: [
      step('sff1', 'Oxygen Mask/MIC Switch', 'On/100%/OXY (PF, PM, OBS)'),
    ],
  },
  {
    id: 'dual-generator-failure',
    title: 'Dual Generator Failure',
    rows: [
      step('dgf1', 'IGNITION AND ENGINE START switches', 'OFF (LS)'),
      step('dgf2', 'Generators (one at a time)', 'OFF, RESET momentarily, then ON (LS)'),
    ],
  },
  {
    id: 'propeller-malfunction',
    title: 'Propeller Malfunction',
    rows: [
      step('pm1', 'PROP lever', 'Attempt to adjust to normal operating range (PF)'),
    ],
  },
  {
    id: 'spin-ocf-recovery',
    title: 'Spin/Out of Control Flight Recovery',
    rows: [
      step('spin1', 'POWER levers', 'IDLE'),
      step('spin2', 'Ailerons', 'Neutralize'),
      step('spin3', 'Control wheel', 'Rapidly forward'),
      step('spin4', 'Rudder', 'Full deflection opposite the direction of the spin'),
      step('spin5', 'Rudder', 'Neutralize once rotation has stopped'),
      step('spin6', 'Control Wheel', 'Pull out of dive by exerting smooth steady back pressure'),
    ],
  },
  {
    id: 'rudder-boost-malfunction',
    title: 'Rudder Boost Malfunction',
    rows: [
      step('rbm1', 'Rudder', 'Maintain directional control (PF)'),
      step('rbm2', 'RUDDER BOOST', 'OFF (PM)'),
      { decision: 'If condition persists:' },
      step('rbm3', 'Rudder boost circuit breaker (RS circuit breaker panel)', 'Pull (RS)'),
    ],
  },
  {
    id: 'unscheduled-electric-trim',
    title: 'Unscheduled Electric Trim Activation',
    rows: [
      step('ueta1', 'AP/TRIM MASTER', 'Depress Fully and Hold'),
    ],
  },
  {
    id: 'abnormal-pressurization',
    title: 'Abnormal Pressurization',
    rows: [
      step('ap1', 'Crew', 'Alerted'),
      step('ap2', 'Oxygen Mask/MIC switch', 'ON/100%/OXY (PF, PM, OBS)'),
    ],
  },
  {
    id: 'bleed-air-fail',
    title: 'Bleed Air Fail',
    rows: [
      step('baf1', 'Bleed Air Valve (affected engine(s))', 'PNEU & ENVIR OFF (RS)'),
    ],
  },
  {
    id: 'explosive-decompression',
    title: 'Explosive Decompression',
    rows: [
      step('ed1', 'Oxygen Mask/MIC Switch', 'ON/100%/OXY (PF, PM, OBS)'),
      step('ed2', 'Descend', 'As required'),
    ],
  },
  {
    id: 'emergency-descent',
    title: 'Emergency Descent Procedure',
    rows: [
      step('edp1', 'POWER levers', 'IDLE'),
      step('edp2', 'PROP levers', 'Full Forward'),
      step('edp3', 'Flaps', 'As required'),
      step('edp4', 'Landing Gear', 'As required'),
      step('edp5', 'Airspeed', 'As required'),
    ],
  },
  {
    id: 'pull-up-day',
    title: 'Pull Up Warning (Day/VMC)',
    rows: [
      step('pud1', 'Maneuver as required.'),
    ],
  },
  {
    id: 'pull-up-night',
    title: 'Pull Up Warning (Night/IMC)',
    rows: [
      { decision: 'Steps *1 through *5 are to be conducted simultaneously.' },
      step('pun1', 'Autopilot', 'Disengage'),
      step('pun2', 'Autothrottles', 'Disengage'),
      step('pun3', 'Wings', 'Level'),
      step('pun4', 'POWER levers', 'Max Continuous'),
      step('pun5', 'Airspeed', 'Vx'),
      step('pun6', 'Gear', 'UP'),
      step('pun7', 'Flaps', 'UP'),
      step('pun8', 'Continue climb until all warnings cease and safe terrain clearance assured.'),
    ],
  },
  {
    id: 'single-engine-go-around',
    title: 'Single-Engine Go-Around/Missed Approach',
    rows: [
      step('sega1', 'POWER levers', 'Max Continuous, establish positive rate of climb (VXSE minimum)'),
      step('sega2', 'Flaps', 'APPROACH (unless already up)'),
      step('sega3', 'Landing Gear', 'UP'),
      step('sega4', 'Flaps', 'UP'),
    ],
  },
  {
    id: 'tcas-ra',
    title: 'TCAS Resolution Advisory',
    rows: [
      step('tcas1', 'Autopilot', 'Disengage'),
      step('tcas2', 'Autothrottles', 'As required'),
      step('tcas3', 'POWER levers', 'As required'),
      step('tcas4', 'Pitch', 'Adjust to satisfy RA'),
      step('tcas5', 'Roll', 'Continue planned lateral path'),
      step('tcas6', 'Landing Gear', 'As required'),
      step('tcas7', 'Flaps', 'As required'),
    ],
  },
  {
    id: 'windshear',
    title: 'Windshear',
    rows: [
      step('ws1', 'Autopilot', 'Disengage'),
      step('ws2', 'Autothrottles', 'Disengage'),
      step('ws3', 'POWER levers', 'Max Continuous'),
      step('ws4', 'Pitch', 'Set and hold approximately 15 degrees noseup'),
      step('ws5', 'Landing Gear', 'UP'),
      step('ws6', 'Flaps', 'Maintain current setting'),
    ],
  },
  {
    id: 'hydraulic-fluid-low',
    title: 'Hydraulic Fluid Low',
    rows: [
      step('hfl1', 'Airspeed', 'Below 181 KIAS'),
      step('hfl2', 'Landing Gear', 'DN'),
    ],
  },
];

// Field key to answer, one per blank on the operating limits sheet. Ranges are written
// "min-max" or "min to max"; the checker accepts either, and ignores units, "(min)" and a
// leading "+".
//
// Cells the sheet prints itself are not here: every "---" in the engine grid, and the footnote
// markers. The notes carry no blanks. The sheet prints notes 1 to 8 and hangs markers (9) and
// (10) on cells without printing either note; both are on the next page of NATOPS Figure 4.2-3.
export const T54A_LIMITS = {
  // ENGINE OPERATING LIMITS
  startingItt: '850-1000',
  startingOilT: '-40',

  loIdleItt: '750',
  loIdleN1: '61',
  loIdleN2: '1180',
  loIdleOilP: '60',
  loIdleOilT: '-40 to 110',

  hiIdleN1: '69',
  hiIdleOilT: '-40 to 110',

  takeoffTq: '2230',
  takeoffItt: '820',
  takeoffN1: '104',
  takeoffN2: '2000',
  takeoffOilP: '90-135',
  takeoffOilT: '0-110',

  cruiseClimbTq: '2230',
  cruiseClimbItt: '775',
  cruiseClimbN1: '104',
  cruiseClimbN2: '2000',
  cruiseClimbOilP: '90-135',
  cruiseClimbOilT: '0-110',

  maxCruiseTq: '2230',
  maxCruiseItt: '820',
  maxCruiseN1: '104',
  maxCruiseN2: '2000',
  maxCruiseOilP: '90-135',
  maxCruiseOilT: '10-99',

  normCruiseTq: '2230',
  normCruiseItt: '775',
  normCruiseN1: '104',
  normCruiseN2: '2000',
  normCruiseOilP: '90-135',
  normCruiseOilT: '0-110',

  maxRevItt: '750',
  maxRevN1: '88',
  maxRevN2: '1900',
  maxRevOilP: '90-135',
  maxRevOilT: '0-99',

  transientTq: '2750',
  transientItt: '850',
  transientN1: '104',
  transientN2: '2200',
  transientOilP: '40-200',
  transientOilT: '0-110',

  // AIRSPEED LIMITATIONS (KIAS)
  vmo: '259',
  mmo: '0.58',
  vsse: '104',
  vmcaAppr: '87',
  vmcaUp: '92',
  va: '181',
  vle: '181',
  vlr: '163',
  vfe40: '200',
  vfe100: '157',
  vx: '100',
  vy: '125',
  vxse: '105',
  vyse: '116',
  xwindUncoupled: '25',
  xwindCoupled: '16',
  tailwindCoupled: '10',
  vmcg: '84',
  turbulentAir: '170',

  // STARTER CYCLE LIMITATIONS
  starterCycle: '40',
  starterCool1: '60',
  starterCool2: '60',
  starterCool3: '30',

  // ELECTRICAL LIMITATIONS
  dcGenVolts: '27.5-29.0',
  gpuStartVolts: '20',
  battStartVolts: '23',
  propDeicerAmps: '18-24',

  // PROHIBITED MANEUVERS
  prohib1: 'AEROBATIC FLIGHT',
  prohib2: 'INTENTIONAL SPINS',
  prohib3: 'LANDING RATES GREATER THAN 600 FPM',

  // ACCELERATION LIMITATIONS
  accelFlapsUp: '-1.27 to 3.17',
  accelFlapsDown: '0 to 2',

  // GENERAL LIMITATIONS
  pneumatic: '12-20',
  gyroHigh: '2.8-4.3',
  gyroLow: '4.3-5.9',
  cabinDiff: '6.6',
  cabinDiffCracked: '4.6',
  tcasRange: '2700',
  fuelTotal: '549',
  fuelUsable: '544',

  // WEIGHT LIMITATIONS
  maxRamp: '12590',
  maxTakeoff: '12500',
  maxLanding: '12500',
  maxZeroFuel: '11000',
  ceiling: '35000',
  ceilingYdInop: '17000',
};

// Blanks asked together in Random mode: one row of the engine grid, the two ends of a pair, the
// parts of one line. Everything else is asked on its own.
export const T54A_LIMIT_GROUPS = [
  ['startingItt', 'startingOilT'],
  ['loIdleItt', 'loIdleN1', 'loIdleN2', 'loIdleOilP', 'loIdleOilT'],
  ['hiIdleN1', 'hiIdleOilT'],
  ['takeoffTq', 'takeoffItt', 'takeoffN1', 'takeoffN2', 'takeoffOilP', 'takeoffOilT'],
  ['cruiseClimbTq', 'cruiseClimbItt', 'cruiseClimbN1', 'cruiseClimbN2', 'cruiseClimbOilP', 'cruiseClimbOilT'],
  ['maxCruiseTq', 'maxCruiseItt', 'maxCruiseN1', 'maxCruiseN2', 'maxCruiseOilP', 'maxCruiseOilT'],
  ['normCruiseTq', 'normCruiseItt', 'normCruiseN1', 'normCruiseN2', 'normCruiseOilP', 'normCruiseOilT'],
  ['maxRevItt', 'maxRevN1', 'maxRevN2', 'maxRevOilP', 'maxRevOilT'],
  ['transientTq', 'transientItt', 'transientN1', 'transientN2', 'transientOilP', 'transientOilT'],
  ['vmo', 'mmo'],
  ['vmcaAppr', 'vmcaUp'],
  ['vfe40', 'vfe100'],
  ['xwindUncoupled', 'xwindCoupled', 'tailwindCoupled'],
  ['starterCycle', 'starterCool1', 'starterCool2', 'starterCool3'],
  ['gpuStartVolts', 'battStartVolts'],
  ['prohib1', 'prohib2', 'prohib3'],
  ['accelFlapsUp', 'accelFlapsDown'],
  ['gyroHigh', 'gyroLow'],
  ['cabinDiff', 'cabinDiffCracked'],
  ['fuelTotal', 'fuelUsable'],
  ['maxRamp', 'maxTakeoff', 'maxLanding', 'maxZeroFuel'],
  ['ceiling', 'ceilingYdInop'],
];

// The notes, warnings and cautions the NATOPS prints with these procedures, keyed by the step
// they follow. A key that is an EP's own id carries the ones printed before the steps, in the
// section the procedure belongs to, and the EP's title bar opens those. Each bullet of a bulleted
// block is its own entry.
//
// Every one was read off the rendered page: the WARNING and CAUTION labels are drawn, not text,
// and a text-only read cannot tell them apart. Only the critical action steps are covered, as on
// the T-44C's: where the NATOPS prints more against a later, non-memory step (Dual Generator
// Failure, Propeller Malfunction, Hydraulic Fluid Low), it is not here.
const AT_DISCONNECT = 'Failure to press and hold the A/T Disconnect button on the power lever for at least one quarter second may result in the autothrottles remaining engaged despite the A/T Disconnect button being pressed.';
const POWER_STOPS = 'Engine damage will occur if POWER levers are advanced to the forward mechanical stops, however climb performance will improve.';
const OXYGEN_NORM = 'For prolonged flight below 20,000 feet with the oxygen mask on, switching the oxygen mask selector to NORM will increase the duration of oxygen available.';
const TERRAIN_ALERT = 'In the event of a terrain alert, the MFD will automatically switch to TOPO+R and auto range to 5 miles.';

export const T54A_EP_NWC = {
  // Aborted Takeoff — NATOPS §14.1
  abort2: {
    warnings: ['If autothrottles are manually overridden, a failure to disengage the autothrottles will result in the autothrottles returning to their previously set position and may result in an inadvertent runway departure.'],
    cautions: [],
    notes: [AT_DISCONNECT],
  },
  abort3: {
    warnings: ['An unrecoverable yaw and runway departure will occur if both power levers are brought to idle or into GND FINE with an asymmetric uncontrollable high power condition.'],
    cautions: [],
    notes: [],
  },
  abort5: {
    warnings: ['If single-engine reverse is used too aggressively, a loss of aircraft directional control may occur. Consideration should be given to both the runway condition and length before utilizing single-engine reverse.'],
    cautions: [],
    notes: [],
  },

  // Engine Failure After Takeoff — NATOPS §14.2
  efat4a: {
    warnings: [
      'Retarding the failed engine power lever prior to the autofeathering system completing the feather cycle, will deactivate the autofeather circuit and prevent automatic feathering.',
      'While a lack of engine oil pressure will eventually result in the propeller moving to feather and the autofeathering system should provide immediate propeller feathering, any delay in propeller feathering may result in insufficient climb rate.',
    ],
    cautions: [],
    notes: [],
  },

  // Emergency Shutdown Checklist — NATOPS §15.1.1
  esc3: {
    warnings: [],
    cautions: [],
    notes: ['Full thrust on operating engine is not available without setting operating propeller to 2,000 rpm.'],
  },

  // Windmilling Airstart — NATOPS §15.4.2, under what §15.4 prints for airstarts generally
  'windmilling-airstart': {
    warnings: [],
    cautions: [
      'The pilot should determine the reason for engine failure before attempting an airstart. Do not attempt an airstart if N1 indicates zero and mechanical failure is suspected.',
      'Airstarts may not be possible above 25,000 feet. Descend to a lower altitude if necessary. Above 20,000 feet, starts tend to be hotter. During engine acceleration to idle speed, it may become necessary to cycle the condition lever into FUEL CUTOFF to avoid an over-temperature.',
    ],
    notes: ['Electrical loads not required for current flight conditions should be reduced.'],
  },
  wa6: {
    warnings: [],
    cautions: ['Airspeeds below 140 KIAS may result in a hot start.'],
    notes: [],
  },

  // Smoke, Fire, or Fumes Checklist — NATOPS §15.5.1
  'smoke-fire-fumes': {
    warnings: [],
    cautions: [],
    notes: ['If conditions permit and the source is definitively known, consideration should be given to immediately securing the source prior to initiating the Smoke, Fire, or Fumes Checklist.'],
  },
  sff1: {
    warnings: [
      'Anytime the smoke or fumes become the greatest threat execute the Smoke or Fumes Elimination Checklist without delay to prevent aircrew incapacitation.',
      'Prolonged use of EMER setting will deplete oxygen supply prematurely and may result in loss of consciousness or crew incapacitation.',
    ],
    cautions: [],
    notes: [],
  },

  // Spin/Out of Control Flight Recovery — NATOPS §15.12.2
  spin6: {
    warnings: ['Pulling out of the resulting dive too abruptly could result in excessive wing loading and a secondary stall or structural damage.'],
    cautions: [],
    notes: [],
  },

  // Unscheduled Electric Trim Activation — NATOPS §15.12.4
  ueta1: {
    warnings: [],
    cautions: [],
    notes: ['Autopilot will disengage when the AP/TRIM MASTER is depressed.'],
  },

  // Abnormal Pressurization — NATOPS §15.14.1
  ap1: {
    warnings: [],
    cautions: [],
    notes: ['Adequate oxygen pressure is not provided to passengers for sustained flight above 34,000 feet. The highest recommended altitude for sustained flight is 25,000 feet.'],
  },
  ap2: {
    warnings: [],
    cautions: [],
    notes: [OXYGEN_NORM],
  },

  // Bleed Air Fail — NATOPS §15.14.3
  baf1: {
    warnings: [],
    cautions: [],
    notes: ['With both Bleed Air Valves selected to PNEU & ENVIR OFF, the aircraft will eventually depressurize.'],
  },

  // Explosive Decompression — NATOPS §15.14.8
  ed1: {
    warnings: [],
    cautions: [],
    notes: [OXYGEN_NORM],
  },

  // Pull Up Warning — NATOPS §15.26.1, whose note stands over both procedures
  'pull-up-day': {
    warnings: [],
    cautions: [],
    notes: [TERRAIN_ALERT],
  },
  'pull-up-night': {
    warnings: [],
    cautions: [],
    notes: [TERRAIN_ALERT],
  },
  pun2: {
    warnings: [],
    cautions: [],
    notes: [AT_DISCONNECT],
  },
  pun4: {
    warnings: [],
    cautions: [POWER_STOPS],
    notes: [],
  },
  pun8: {
    warnings: ['Alerts cease (by design) before the aircraft is at an altitude where a safe level off can be performed. Terrain may remain a threat.'],
    cautions: [],
    notes: [],
  },

  // Single-Engine Go-Around/Missed Approach — NATOPS §16.2
  sega2: {
    warnings: ['A single-engine full-flap go-around is left to the discretion of the crew but is not recommended because of the poor go-around capability of the aircraft in this configuration.'],
    cautions: [],
    notes: [],
  },
  sega3: {
    warnings: ['The landing gear is raised when the rate of descent has been stopped or there is no possibility of a touchdown, to prevent a gear up landing.'],
    cautions: [],
    notes: [],
  },

  // TCAS Resolution Advisory — NATOPS §15.27.1 (IC 04)
  tcas2: {
    warnings: ['Disengaging the autothrottles during an active TCAS RA will remove RA guidance (aural and visual) and display TCAS TA Only information for approximately 10 seconds. This may lead to improper action by aircrew and increase the risk of a midair collision. If not clear of conflict, the RA guidance will return after approximately 10 seconds.'],
    cautions: [],
    notes: [AT_DISCONNECT],
  },
  tcas7: {
    warnings: ['Comply with the RA if there is a conflict between the RA and air traffic control. Continuing to comply with ATC may compromise aircraft separation.'],
    cautions: [],
    notes: [
      'The PF and PM shall attempt to establish visual contact and call out any conflicting traffic.',
      'If an RA response requires deviation from an ATC clearance, return to the current ATC clearance or follow any subsequent change to clearance after the traffic conflict is resolved or the "CLEAR OF CONFLICT" is heard.',
      'After responding to the RA, the flight crew shall notify ATC as soon as practicable.',
    ],
  },

  // Windshear — NATOPS §16.3
  ws2: {
    warnings: [],
    cautions: [],
    notes: [AT_DISCONNECT],
  },
  ws3: {
    warnings: [],
    cautions: [POWER_STOPS],
    notes: [],
  },
  ws6: {
    warnings: ['If stall warning is encountered during windshear recovery, aft yoke pressure should be reduced only slightly to lessen angle of attack and allow the aircraft to exit stall.'],
    cautions: [],
    notes: [],
  },

  // Hydraulic Fluid Low — NATOPS §16.6.1
  'hydraulic-fluid-low': {
    warnings: ['If the landing gear relay circuit breaker is open or if the hydraulic fluid sensor is inoperative, the HYD FLUID LOW CAS message will not illuminate regardless of the hydraulic fluid level.'],
    cautions: [],
    notes: [],
  },
};
