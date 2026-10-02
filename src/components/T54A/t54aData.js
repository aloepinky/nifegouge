// The T-54A's EPs and limits as the Advanced exam asks them, off the two sheets the exam is
// handed out on: "T-54A EMERGENCY PROCEDURE CRITICAL ACTION MEMORY ITEMS & OPERATING LIMITS -
// 15 NOVEMBER 2025 Revision" (EP answer key, 31 JUL 26 update; limits answer key, 06 APR 26
// update). Pure data, no JSX — the shape `EPDrill` renders (see T44C/t44cData.js).
//
// The two sheets are the only source. The T-54A NATOPS (A1-T54A-NFM-000) and its pocket
// checklist are marked CUI, and nothing marked CUI goes on this site — so, unlike the T-44C's,
// these steps are not checked against NATOPS, and there are no NWCs.
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
// markers. Notes 1 to 8 are printed in full and carry no blanks. The grid hangs markers (9) and
// (10) on cells, but neither sheet prints a note 9 or 10.
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
