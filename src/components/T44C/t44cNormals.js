// The T-44C's normal procedures for EPDrill's Hollywood and Memory Normals modes. Pure data, no
// JSX, in the shape T44C_EPS uses (t44cData.js), with three more row fields:
//
//   who      the crewmember(s) who reply, as the checklist card prints them ("PF, PM"). Shown
//            beside the box, never typed: the reply is the answer.
//   abbrev   the card's pound sign, an item of the abbreviated checklist.
//   num      a number printed instead of the running count, where the publication gives two
//            rows one number (Start Procedure step 22, both generators).
//
// `critical` (the asterisk) marks a step performed from memory. A procedure's `start` is the
// number its first step carries, so the two halves of the start procedure keep the FTI's
// numbering, 1 to 24.
//
// Sources, all read from the rendered page:
//   * the normal checklists: NATOPS Checklist 01-T44AAC-1C p. 1 (1 SEP 2023), whose replies are
//     the ones ME FTI §F100 says to give, "the exact reply per the checklist card";
//   * the start procedure: ME FTI §F102, pp. F-3 to F-7, "performed from memory";
//   * the full anti-ice/deice check: ME FTI §F105 item 6, pp. F-15, "must be memorized";
//   * the waveoff: NATOPS §7.18, every step asterisked, "shall be committed to memory";
//   * the pre-stall checks: ME FTI §104.4a, p. 1-17, "from memory".
//
// The card's blanks ("___ LBS") are kept as printed; normalizeAnswer drops underscores, so a
// student types the words around them.

const item = (id, action, value, who, extra = {}) => ({ id, text: `${action} - ${value}`, who, ...extra });
const abbrev = (id, action, value, who) => item(id, action, value, who, { abbrev: true });
const memory = (id, action, value, who) => item(id, action, value, who, { critical: true });

const BEFORE_START = {
  id: 'before-start',
  title: 'Before Start',
  rows: [
    abbrev('bs1', 'Parking Brake', 'SET', 'LS'),
    abbrev('bs2', 'Electrical Panel', 'SET', 'PF'),
    item('bs3', 'Landing Gear', 'DOWN', 'PF'),
    item('bs4', 'Flaps', 'CORRESPOND', 'PF, PM'),
    abbrev('bs5', 'Power Quadrant', 'SET', 'PF'),
    item('bs6', 'Lights', 'SET', 'LS'),
    item('bs7', 'Anti-Ice/Deice', 'OFF', 'LS'),
    item('bs8', 'Fuel Panel', 'CHECKED/SET', 'LS'),
    item('bs9', 'Annunciator Panel', 'CHECKED', 'PF'),
    item('bs10', 'Fire Detectors', 'CHECKED', 'PF, PM'),
    abbrev('bs11', 'Cabin Door', 'LOCKED', 'PF, OBS'),
  ],
};

// ME FTI §F102. The PF gives both the challenge and the reply for every step.
const START_RIGHT = {
  id: 'start-right',
  title: 'Start Procedure - Right Engine',
  rows: [
    { note: 'Brief: "This will be a battery start of the right engine. The left side is clear." (PF) "Right side clear." (PM) Two fingers in the windshield.' },
    memory('sr1', 'Right Starter', 'On, Ignition, rotation', 'PF'),
    memory('sr2', 'N1', 'Above 12 percent', 'PF'),
    memory('sr3', 'Condition Lever', 'LOW IDLE', 'PF'),
    memory('sr4', 'Fuel Flow', 'Note', 'PF'),
    memory('sr5', 'ITT and N1', 'Light-off, N1 stable above 50%', 'PF'),
    memory('sr6', 'Starter', 'OFF', 'PF'),
    memory('sr7', 'Oil Pressure', 'Thumbs up to lineman', 'PF'),
    memory('sr8', 'Right Condition Lever', 'High Idle', 'PF'),
    memory('sr9', 'Right Generator', 'Reset, On. Switch, Light, Load', 'PF'),
    { note: 'Control check and flap check.' },
    memory('sr10', 'Right Generator', 'Load below .5, OFF', 'PF'),
  ],
};

const START_LEFT = {
  id: 'start-left',
  title: 'Start Procedure - Left Engine',
  start: 11,
  rows: [
    { note: 'Brief: "This will be a generator assisted start of the left engine. Left side\'s clear." (PF) "Right side\'s clear." (PM) One finger in the windshield.' },
    memory('sl11', 'Left Starter', 'On, Ignition, rotation', 'PF'),
    memory('sl12', 'N1', 'Above 12 percent', 'PF'),
    memory('sl13', 'Right Generator', 'Reset, On', 'PF'),
    memory('sl14', 'Right Engine', 'Monitor ITT', 'PF'),
    memory('sl15', 'Condition Lever', 'LOW IDLE', 'PF'),
    memory('sl16', 'Fuel Flow', 'Note', 'PF'),
    memory('sl17', 'ITT and N1', 'Light-off, N1 stable above 50%', 'PF'),
    memory('sl18', 'Left Starter', 'OFF', 'PF'),
    memory('sl19', 'Oil Pressure', 'Thumbs up to lineman', 'PF'),
    memory('sl20', 'Right Generator', 'OFF', 'PF'),
    memory('sl21', 'Fuel Quantity Indicators', 'Checked', 'PF'),
    memory('sl22', 'Right Generator', 'RESET, ON. Switch, light, load', 'PF'),
    { ...memory('sl22b', 'Left Generator', 'RESET, ON. Switch, light, load', 'PF'), num: 22 },
    memory('sl23', 'Right Condition Lever', 'LOW IDLE', 'PF'),
    memory('sl24', 'Fuel Control Heat', 'ON', 'PF'),
  ],
};

const AFTER_START = {
  id: 'after-start',
  title: 'After Start',
  rows: [
    item('as1', 'Environmental Controls', 'SET', 'RS'),
    item('as2', 'Generator Voltages', 'CHECKED', 'LS'),
    item('as3', 'AUX/BATT/Avionics Master', 'CHECKED/ON', 'PF'),
    item('as4', 'Oxygen Mask Mic', 'CHECKED, OPEN', 'PM, OBS'),
    item('as5', 'Seatbelts', 'FASTENED', 'PF, PM, OBS'),
    item('as6', 'Transfer Pumps', 'CHECKED/AUTO', 'LS'),
    item('as7', 'Crossfeed', 'CHECKED/AUTO', 'LS'),
    item('as8', 'Generator Load', 'CHECKED', 'LS'),
    item('as9', 'MFD', 'CHECKED/SET', 'PF'),
    item('as10', 'Transponder', 'AS REQUIRED', 'RS'),
    item('as11', 'Turn Indicator', 'CHECKED', 'PF'),
    item('as12', 'Brakes', 'CHECKED', 'PF, PM'),
  ],
};

const ENGINE_RUNUP = {
  id: 'engine-runup',
  title: 'Engine Runup',
  rows: [
    item('er1', 'Parking Brake', 'SET', 'LS'),
    abbrev('er2', 'ESIS', 'ON', 'PF'),
    abbrev('er3', 'Engine Instruments', 'CHECKED', 'PF'),
    abbrev('er4', 'Manual Feather', 'CHECKED', 'PF'),
    item('er5', 'Suction & Pneumatic Pressure', 'CHECKED', 'PF'),
    item('er6', 'Overspeed Governors', 'CHECKED', 'LS'),
    item('er7', 'Primary Governors', 'CHECKED', 'PF'),
    item('er8', 'Autofeather/Autoignition', 'CHECKED/OFF', 'LS'),
  ],
};

const BEFORE_TAKEOFF = {
  id: 'before-takeoff',
  title: 'Before Takeoff',
  rows: [
    item('bt1', 'Autopilot/Yaw Damp', 'CHECKED/DISENGAGED', 'PF, PM'),
    item('bt2', 'Controls', 'CHECKED', 'PF, PM'),
    item('bt3', 'Props', 'FULL FORWARD', 'PF'),
    item('bt4', 'Prop Sync', 'OFF', 'PF'),
    item('bt5', 'Autofeather', 'ARMED', 'LS'),
    item('bt6', 'Anti-Ice/Deice/Radar', 'CHECKED AS REQUIRED', 'PF, PM'),
    item('bt7', 'Pressurization', 'SET', 'PM'),
    item('bt8', 'Bleed Air Valves', 'AS REQUIRED', 'RS'),
    abbrev('bt9', 'Trim', 'CHECKED/SET', 'PF, PM'),
    abbrev('bt10', 'Flaps', 'CHECKED/UP', 'PF, PM'),
    abbrev('bt11', 'Altimeters', 'CHECKED/SET', 'PF, PM'),
    abbrev('bt12', 'FMS', 'CHECKED/SET', 'PF, PM'),
    abbrev('bt13', 'Flight Instruments', 'CHECKED/SET', 'PF, PM'),
    item('bt14', 'Fuel Quantity', '___ LBS, ___ LBS REQUIRED', 'PF'),
    abbrev('bt15', 'Crew', 'BRIEFED', 'PF'),
    { decision: 'AFTER CLEARED ONTO THE ACTIVE RUNWAY:' },
    abbrev('bt16', 'Lights', 'SET', 'LS'),
    abbrev('bt17', 'Anti-Ice/Deice', 'SET', 'LS'),
    abbrev('bt18', 'Transponder', 'SET', 'RS'),
    abbrev('bt19', 'Autoignition', 'ARMED', 'PM'),
    abbrev('bt20', 'Condition Levers', 'HIGH IDLE', 'PF'),
  ],
};

// ME FTI §F105 item 6, the full check. Required when icing is anticipated and on the first leg
// of a cross-country; otherwise the reply to item 6 is "Pitot heat checked".
const ANTI_ICE_CHECK = {
  id: 'anti-ice-check',
  title: 'Full Anti-Ice/Deice Check',
  rows: [
    memory('ai1', 'Propeller deicer', 'ON', 'PF'),
    { note: 'PM calls "30 seconds" x4. PROP AMPS 14 to 18 in each of the 4 phases, 2 minute minimum.' },
    { decision: '2. Place the following anti-icing systems ON and monitor load for proper indication:' },
    { ...memory('ai2a', 'LEFT & RIGHT PITOT', '(checked during preflight)', 'PF'), sub: 'a' },
    { ...memory('ai2b', 'Stall Heat', 'ON', 'PF'), sub: 'b' },
    { ...memory('ai2c', 'LEFT & RIGHT ENG LIP BOOT', 'ON', 'PF'), sub: 'c' },
    { ...memory('ai2d', 'LEFT & RIGHT FUEL VENT', 'ON', 'PF'), sub: 'd' },
    { ...memory('ai2e', 'WSHLD ANTI-ICE', 'BOTH, Then PILOT', 'PF'), sub: 'e' },
    { note: '3. Upon completion of anti-ice checks, place all switches OFF. FUEL CONTROL HEAT remains ON.' },
    { ...memory('ai4', 'Condition levers', 'HIGH IDLE', 'PF'), num: 4 },
    { ...memory('ai5', 'DE-ICE CYCLE', 'SINGLE, Then MANUAL', 'PF'), num: 5 },
    { note: 'Boots inflate, then deflate in 7 to 8 seconds in SINGLE. Pneumatic pressure 12 to 20 psi.' },
    { ...memory('ai6', 'Condition levers', 'LOW IDLE', 'PF'), num: 6 },
    { ...memory('ai7', 'Propeller deice', 'OFF (if not previously secured)', 'PF'), num: 7 },
  ],
};

const CLIMB = {
  id: 'climb',
  title: 'Climb',
  rows: [
    abbrev('cl1', 'Landing Gear', 'UP', 'PM'),
    abbrev('cl2', 'Flaps', 'UP', 'PM'),
    abbrev('cl3', 'Instruments/Nacelles', 'CHECKED', 'PF, PM'),
    abbrev('cl4', 'Lights', 'SET', 'LS'),
    item('cl5', 'Autofeather', 'AS REQUIRED', 'LS'),
    item('cl6', 'Prop Sync', 'AS REQUIRED', 'PF'),
    item('cl7', 'Pressurization', 'CHECKED', 'PM'),
  ],
};

const CRUISE = {
  id: 'cruise',
  title: 'Cruise',
  rows: [
    item('cr1', 'Instruments/Nacelles', 'CHECKED', 'PF, PM'),
    item('cr2', 'Altimeters', '____.____ SET', 'PF, PM'),
    item('cr3', 'Pressurization/Oxygen', 'CHECKED', 'PM'),
  ],
};

const DESCENT = {
  id: 'descent',
  title: 'Descent',
  rows: [
    item('de1', 'Altimeters', 'SET', 'PF, PM'),
    item('de2', 'Pressurization', 'SET', 'PM'),
  ],
};

const APPROACH = {
  id: 'approach',
  title: 'Approach',
  rows: [
    item('ap1', 'Pressurization', 'SET', 'PM'),
    item('ap2', 'Autofeather', 'ARMED', 'LS'),
    item('ap3', 'Prop Sync', 'OFF', 'PF'),
    abbrev('ap4', 'FMS', 'AS REQUIRED', 'PF, PM'),
    abbrev('ap5', 'Radios/NAVAIDs', 'SET', 'PF, PM'),
    abbrev('ap6', 'PFDs/FGP/ESIS', 'SET', 'PF, PM'),
    abbrev('ap7', 'Altimeters', '____.____ SET', 'PF, PM'),
    abbrev('ap8', 'Minimums', '____ SET', 'PF, PM'),
    abbrev('ap9', 'Crew', 'BRIEFED', 'PF'),
  ],
};

const LANDING = {
  id: 'landing',
  title: 'Landing',
  rows: [
    item('la1', 'Flaps', 'AS REQUIRED', 'PF, PM'),
    item('la2', 'Landing Gear', 'DOWN/LOCKED', 'PF, PM'),
    item('la3', 'Lights', 'SET', 'LS'),
  ],
};

const AFTER_LANDING = {
  id: 'after-landing',
  title: 'After Landing',
  rows: [
    item('al1', 'Condition Levers', 'LOW IDLE', 'PF'),
    item('al2', 'Transponder', 'AS REQUIRED', 'RS'),
    item('al3', 'Flaps', 'UP', 'PM'),
    item('al4', 'Autoignition', 'OFF', 'PM'),
    item('al5', 'Pressurization', 'CHECKED/DEPRESSURIZED', 'PM'),
    item('al6', 'Bleed Air Valves', 'AS REQUIRED', 'RS'),
    item('al7', 'Lights', 'AS REQUIRED', 'LS'),
    item('al8', 'Anti-Ice/Deice', 'OFF', 'LS'),
  ],
};

const SECURE = {
  id: 'secure',
  title: 'Secure',
  rows: [
    abbrev('se1', 'Transfer Pumps', 'OFF', 'LS'),
    item('se2', 'Crossfeed', 'CLOSED', 'LS'),
    item('se3', 'Autofeather', 'OFF', 'LS'),
    abbrev('se4', 'Fuel Control Heat', 'OFF', 'LS'),
    item('se5', 'Trim', 'SET ZERO', 'PM'),
    item('se6', 'ESIS', 'OFF', 'PM'),
    abbrev('se7', 'Parking Brake', 'SET', 'LS'),
    item('se8', 'AUX BATT/Avionics Master', 'OFF', 'PF'),
    abbrev('se9', 'Cabin Temperature Mode', 'OFF', 'RS'),
    abbrev('se10', 'Vent Blower', 'AUTO', 'RS'),
    abbrev('se11', 'Prop(s)', 'FEATHER', 'PF'),
    abbrev('se12', 'Condition Lever(s)', 'FUEL CUTOFF', 'PF'),
    item('se13', 'Boost Pumps', 'OFF', 'LS'),
    item('se14', 'Fuel Quantity (Current Limiters)', 'CHECKED', 'LS'),
    item('se15', 'Oxygen', 'CLOSED', 'PM'),
    item('se16', 'Lights', 'OFF', 'LS'),
    item('se17', 'Gangbar', 'OFF', 'LS'),
    item('se18', 'Control Lock', 'AS REQUIRED', 'LS'),
    item('se19', 'Wheels', 'CHOCKED', 'LS'),
    item('se20', 'Parking Brake', 'AS REQUIRED', 'LS'),
  ],
};

// NATOPS §7.18. Not an emergency procedure, so it is not on the EP sheet, but every step is
// asterisked.
const WAVEOFF = {
  id: 'waveoff',
  title: 'Waveoff/Missed Approach',
  rows: [
    memory('wo1', 'Power', 'As required, Establish Positive Rate of Climb (VX minimum)'),
    memory('wo2', 'Flaps', 'APPROACH (unless already UP)'),
    memory('wo3', 'Landing Gear', 'UP'),
    memory('wo4', 'Flaps', 'UP'),
    memory('wo5', 'Props', '1,900 rpm'),
  ],
};

// ME FTI §104.4a, before the first stall entry.
const PRE_STALL = {
  id: 'pre-stall',
  title: 'Pre-Stall Checks',
  rows: [
    memory('ps1', 'Spin Recovery Procedures', 'Briefed per NATOPS'),
    memory('ps2', 'Loose gear', 'Stowed'),
    memory('ps3', 'Altitude', '5000 feet AGL minimum'),
    memory('ps4', 'Yaw damp', 'Off'),
    memory('ps5', 'Props', '1900 RPM'),
    memory('ps6', 'Stall Speeds', 'Reviewed'),
  ],
};

// Every normal checklist, in the order they are run, with the full anti-ice/deice check after
// the Before Takeoff Checklist whose item 6 calls for it.
export const T44C_HOLLYWOOD = [
  BEFORE_START, START_RIGHT, START_LEFT, AFTER_START, ENGINE_RUNUP, BEFORE_TAKEOFF,
  ANTI_ICE_CHECK, CLIMB, CRUISE, DESCENT, APPROACH, LANDING, AFTER_LANDING, SECURE,
];

// Only the normal procedures the publications say are done from memory.
export const T44C_MEMORY_NORMALS = [START_RIGHT, START_LEFT, ANTI_ICE_CHECK, WAVEOFF, PRE_STALL];
