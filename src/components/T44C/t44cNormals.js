// The T-44C's normal procedures for EPDrill. Pure data, no JSX, in the shape T44C_EPS uses
// (t44cData.js), with more row fields:
//
//   challenge, reply   the two halves of the line as the checklist card prints it; `text` (the
//                      answer, "Parking Brake - SET") is built from them.
//   who                the crewmember(s) the card prints against the reply ("PF, PM").
//   abbrev             the card's pound sign, an item of the abbreviated checklist.
//   num                a number printed instead of the running count, where the publication gives
//                      two rows one number (start procedure step 22, both generators).
//   action             the ME FTI Appendix F "Hollywood Checklist" ACTION column for the step: a
//                      list of lines (strings) and NWCs ({ note | caution | warning }).
//   replies            its RESPONSE column, in order: { text, who } for what the student in the
//                      left seat says (bold in the FTI), `ip: true` for what the instructor says
//                      (highlighted), `act: true` for a stage direction that is not spoken.
//   watch              the gauges and lights the action says to check, note, observe, verify or
//                      monitor, as poster wordings (t44cPoster.js). Clicking the control leaves
//                      the step yellow until each of them is clicked too, in any order, as
//                      Primary's Engine Start - MONITOR does (epsLimits/EPDrill.js `watchClick`).
//                      Only what the action names and the poster draws: never PFD flags or audio
//                      tones. A switch the action turns on only at night or in low visibility is
//                      left to the action text, since the card cannot say which it is.
//   watchOnly          the watch list is the whole step (the Lights steps' switches): no control
//                      click of its own, so a switch the step does not set is marked red.
//   controlApart       the step's control is a click of its own even where a watched piece also
//                      answers the step (Before Start 7: an anti-ice switch and both ice vanes).
//
// A procedure's `normal` draws its card with the checklist card's black title, so a normal
// memory procedure added to the EPs is never mistaken for one. `critical` (the asterisk) marks
// a step performed from memory. A procedure's `start` is its
// first step's number, so the two halves of the start procedure keep the FTI's 1 to 24, and
// `done` is the PM's closing call.
//
// Sources, all read from the rendered page:
//   * the checklist lines: NATOPS Checklist 01-T44AAC-1C p. 1 (1 SEP 2023), whose replies are the
//     ones ME FTI §F100 says to give, "the exact reply per the checklist card";
//   * every action and response, the start procedure and the full anti-ice/deice check: ME FTI
//     Appendix F, §F101 to §F112, pp. F-2 to F-28 (P-561 Rev 6 CH3);
//   * the waveoff: NATOPS §7.18, every step asterisked, "shall be committed to memory";
//   * the pre-stall checks: ME FTI §104.4a, p. 1-17, "from memory".
//
// Where they disagree, NATOPS rules the FTI and the FTI rules the checklist card (the user's
// ruling, 2026-10-12). So a line takes the FTI's reply where the card prints only "AS REQUIRED"
// (Secure 18, Control Lock: "INSTALLED"), the FTI's crewmember (Engine Runup 5 and 7: LS, where
// the card prints PF) and the FTI's pound sign (Descent 2); the full anti-ice/deice check is
// NATOPS §19.1.4's, not the FTI's (N1 70 percent and IDLE, pitot ON). The card's blanks
// ("___ LBS") are kept as printed; normalizeAnswer drops underscores.

const item = (id, challenge, reply, who, extra = {}) => ({ id, challenge, reply, text: `${challenge} - ${reply}`, who, ...extra });
const abbrev = (id, challenge, reply, who, extra = {}) => item(id, challenge, reply, who, { abbrev: true, ...extra });
const memory = (id, challenge, reply, who, extra = {}) => item(id, challenge, reply, who, { critical: true, ...extra });

const say = (text, who) => ({ text, who });
const ip = (text, who) => ({ text, who, ip: true });
const act = (text, who) => ({ text, who, act: true });
const note = (text) => ({ note: text });
const caution = (text) => ({ caution: text });
const warning = (text) => ({ warning: text });

const THREE_WAY = act('Perform 3-way change of controls.');

// ---------------------------------------------------------------------------------------
// F101

const BEFORE_START = {
  id: 'before-start',
  title: 'Before Start',
  done: '"BEFORE START CHECKLIST COMPLETE." (PM)',
  rows: [
    abbrev('bs1', 'Parking Brake', 'SET', 'LS', {
      action: [
        'LS ensures brake handle pulled out fully then brakes pumped firm.',
        note('Parking brakes may bleed off after setting. Ensure brakes are set by pulling parking brake handle out and then pumping brakes firm. The right seat pilot cannot set the parking brake.'),
      ],
      replies: [say('SET', 'LS')],
    }),
    abbrev('bs2', 'Electrical Panel', 'SET', 'PF', {
      action: ['PF ensures starter, auto-ignition, avionics master, aux battery, and battery/generator (gang bar) switches are OFF.'],
      replies: [say('SET', 'PF')],
    }),
    item('bs3', 'Landing Gear', 'DOWN', 'PF', {
      action: ['PF ensures landing gear handle is in the down position and J-hook engaged. Do not touch the landing gear handle on the ground.'],
      replies: [say('DOWN', 'PF')],
    }),
    item('bs4', 'Flaps', 'CORRESPOND', 'PF, PM', {
      action: ['PF and PM ensure flap handle corresponds visually with flap position. Flap indicator will be inoperative with no power on the aircraft, and needle in the 10 O\'clock position when battery off.'],
      replies: [say('CORRESPOND', 'PF'), ip('CORRESPOND', 'PM')],
    }),
    abbrev('bs5', 'Power Quadrant', 'SET', 'PF', {
      action: [
        'PF ensures condition lever(s) are at FUEL CUTOFF and sets friction.',
        'PF moves props from FEATHER to full forward and sets friction.',
        'PF ensures power levers are down and against the idle stop and sets friction.',
        caution('Positioning the power levers aft of idle while the engines are shut down will result in damage to the reversing mechanism.'),
      ],
      replies: [say('SET', 'PF')],
    }),
    item('bs6', 'Lights', 'SET', 'LS', {
      watch: ['Beacon'],
      watchOnly: true,
      action: [
        'Turn beacons on any time the engines are turning.',
        'Display navigation lights during the period 30 minutes before official sunset until 30 minutes after official sunrise, or at any time when prevailing visibility, as seen from the cockpit, is less than 3 statute miles. Turn on navigation lights during formation taxi.',
      ],
      replies: [say('SET', 'LS')],
    }),
    item('bs7', 'Anti-Ice/Deice', 'OFF', 'LS', {
      watch: ['Left Ice Vane', 'Right Ice Vane'],
      controlApart: true,
      action: ['LS ensures all anti-ice/deice switches are OFF and ice vane controls are in. Physically push ice vanes to the fully closed position.'],
      replies: [say('OFF', 'LS')],
    }),
    item('bs8', 'Fuel Panel', 'CHECKED/SET', 'LS', {
      watch: ['FUEL CROSSFEED', 'Battery Ammeter', 'Battery', 'L FUEL PRESSURE', 'R FUEL PRESSURE'],
      action: [
        'LS performs the following checks:',
        'a. Fuel panel circuit breakers — Set.',
        'b. Firewall valve switch guards — Shear wired.',
        'c. Crossfeed — Checked (open, when open, check for associated crossfeed annunciator light, then closed).',
        'd. Boost pumps — ON (observe battery ammeter draw).',
        'e. Battery — ON (check left and right fuel pressure lights off).',
      ],
      replies: [say('CHECKED/SET', 'LS')],
    }),
    item('bs9', 'Annunciator Panel', 'CHECKED', 'PF', {
      watch: ['Terrain Warning Lights', 'EMER 121.5', 'FAULT WARNING'],
      action: [
        'a. RS presses and holds Press-to-Test button. LS ensures all annunciator lights, "Terrain," "Pull Up," "Terrain NA," "ESIS On/Off" lights, and EMER 121.5 illuminated, and FAULT WARN light is flashing.',
        'b. LS presses the flashing FAULT WARN light to extinguish.',
      ],
      replies: [say('CHECKED', 'PF')],
    }),
    item('bs10', 'Fire Detectors', 'CHECKED', 'PF, PM', {
      watch: ['FAULT WARNING', 'LH FIRE', 'RH FIRE', 'LH FIRE EXT', 'RH FIRE EXT'],
      action: ['Rotate the Fire Detector Test switch clockwise and ensure illumination of the FAULT WARN, LH and RH FIRE annunciator, and LH and RH FIRE EXT PUSH TO EXT lights. LS first reports "Three" and RS responds "Two" at each selector position. Wait 3 seconds after positioning the switch to each zone to confirm a proper check, then switch to the next zone. Do not cancel the Fault Warning until switch is rotated back to the off position and the FIRE and FIRE EXT lights extinguish.'],
      replies: [say('CHECKED', 'PF'), ip('CHECKED', 'PM')],
    }),
    abbrev('bs11', 'Cabin Door', 'LOCKED', 'PF, OBS', {
      action: ['PF and OBS ensure the cabin door is locked and CABIN DOOR OPEN annunciator light is out.'],
      replies: [say('LOCKED', 'PF'), ip('LOCKED', 'OBS')],
    }),
  ],
};

// ---------------------------------------------------------------------------------------
// F102. "Start procedures and actions (up to the After Start Checklist) are performed from
// memory." The PF gives both the challenge and the reply for every step.

const STARTER_LIMITS = 'Starter use is time-limited to 40 seconds on, 60 seconds off, 40 seconds on, 60 seconds off, 40 seconds on, then 30 minutes off.';
const FUEL_FLOW = [
  'Note fuel flow (approximately 100 lbs/hr).',
  'If no fuel flow is indicated after moving the condition lever to low idle on an engine start, PF shall wait ten seconds to allow the engine to ignite. If no light-off occurs within ten seconds, execute Abnormal Start Procedure.',
  'If a discontinuation is required, maintain slight outboard pressure on the condition lever to prevent binding on the idle stop.',
];
const HOT_START = caution('If ITT is likely to exceed 925 ºC, execute Abnormal Start Procedure. Battery condition should be checked prior to subsequent start. If maintenance support is not available, refer to GPU start procedures. Report peak ITT and duration to maintenance if ITT exceeded 925 ºC during the start.');
const OIL_PRESSURE = [
  'Note 40 psi minimum. A normal start only requires the oil pressure above 40 psi and N1 and ITT stabilized (51-54% and below 685 ºC).',
  note('Because of the engine oil being more viscous at lower temperatures, Oil pressure may exceed 100 psi for start and warm-up.'),
  'PF then signals "thumbs up" to the lineman, indicating a normal start.',
];

const START_RIGHT = {
  id: 'start-right',
  title: 'Start Procedure - Right Engine',
  normal: true,
  rows: [
    { note: 'Brief: "This will be a battery start of the right engine. The left side is clear." (PF) "Right side clear." (PM) Two fingers in the windshield.' },
    memory('sr1', 'Right Starter', 'On, Ignition, rotation', 'PF', {
      watch: ['RH IGN IND', 'N1', 'Elapsed Time Clock'],
      action: [
        'PF engages right starter with right hand (Keep hand on starter) while simultaneously starting elapsed time clock with left hand. Ensure RH IGN IND annunciator light is on and call "ignition." Call "rotation" when N1 increases, not when the prop begins to turn outside. Leave right hand anchored on the starter until moving it to the condition lever to introduce fuel.',
        'Starter use is time limited to 40 seconds on and 60 seconds off for two cycles, then 40 seconds on and 30 minutes off.',
        caution('Failure to adhere to starter limitations could cause damage to the starter.'),
      ],
      replies: [act('(start clock)'), say('On, Ignition, rotation')],
    }),
    memory('sr2', 'N1', 'Above 12 percent', 'PF', {
      action: ['Ensure N1 rising above 12%.'],
      replies: [say('Above 12 percent')],
    }),
    memory('sr3', 'Condition Lever', 'LOW IDLE', 'PF', {
      watch: ['Generator Voltages', 'N1'],
      action: [
        'Check battery voltage above 18 volts.',
        note('Battery voltage should be 18 volts or greater prior to moving the condition lever to LOW IDLE. If less than 18 volts, consideration should be given to terminating the start attempt. If residual voltage remains less than 18 volts a battery change or battery charging is needed before attempting a subsequent start.'),
        'PF moves right condition lever to Low Idle after N1 stabilized above 12%. PF mentally counts 10 seconds as a timing back-up. PM commences timing when PF moves condition lever to low idle and informs PF if there is no light-off within 10 seconds.',
        'PF keeps right hand anchored on the condition lever until moving it to turn the starter off.',
      ],
      replies: [say('LOW IDLE')],
    }),
    memory('sr4', 'Fuel Flow', 'Note', 'PF', { action: FUEL_FLOW }),
    memory('sr5', 'ITT and N1', 'Light-off, N1 stable above 50%', 'PF', {
      action: [
        '(1090 C maximum) PF should announce light-off from ITT gauge.',
        'Start ITT must not exceed 1,090 ºC for greater than 2 seconds.',
        HOT_START,
      ],
      replies: [say('Light-off'), say('N1 stable above 50%')],
    }),
    memory('sr6', 'Starter', 'OFF', 'PF', {
      watch: ['N1', 'Elapsed Time Clock'],
      action: ['Turn starter off when N1 greater than 50%.', 'Stop elapsed clock.', STARTER_LIMITS],
      replies: [say('OFF')],
    }),
    memory('sr7', 'Oil Pressure', 'Thumbs up to lineman', 'PF', {
      watch: ['ITT', 'N1'],
      action: OIL_PRESSURE,
      replies: [act('Thumbs up to lineman')],
    }),
    memory('sr8', 'Right Condition Lever', 'High Idle', 'PF', {
      watch: ['N1'],
      action: ['Advance to High Idle. Ensure N1 within High Idle limits.', 'Observe N1 gauge within 70-73% before responding.'],
      replies: [say('High Idle')],
    }),
    memory('sr9', 'Right Generator', 'Reset, On. Switch, Light, Load', 'PF', {
      watch: ['RH GEN OUT', 'Generator Load'],
      action: [
        'PF turns on right generator, notes RH GEN OUT annunciator light extinguished and load indication.',
        'Perform flight control and flap checks while allowing the battery to Recharge. Normal generator load will be 0.5 to 1.0 while the battery ammeter will read approximately 60 amp charge and battery voltage will read 28 VDC (Volts-Direct Current).',
        'Control check: The control check (minimum of rudder) and flap check should normally be completed prior to taxi, while a lineman is available to observe movement.',
        'PF places control wheel left wing down, right wing down, full aft, and full forward. PF reports control surface position. PM responds with position report.',
        note('Controls are checked smoothly and slowly for both correct response and freedom of movement. Check each control surface one at a time.'),
        'PF signals for a rudder check and follows the lineman\'s direction. Check full left, neutral, and full right rudder.',
        note('The signal for a rudder check is one hand held vertically, with left to right motion. At night, move flashlight beam left and right horizontally.'),
        'Flap check: PF signals for a flap check. Select flaps DOWN.',
        'PF passes the aircraft controls to the PM, who conducts a control Check and immediately returns controls to LS.',
        'Visually check position and indicator and report. PF signals for flaps to APPROACH. Select flaps to APPROACH. Visually check position and indicator and report. PF signals for flaps UP.',
        'Select flaps UP. Visually check position and indicator and report.',
        note('The signal for a flap check is the wrists held together horizontally with hands split and then follow lineman\'s direction. At night move flashlight beam up and down vertically.'),
      ],
      replies: [
        say('Reset, On'), say('Switch, Light, Load'),
        say('Left aileron up', 'PF'), ip('Down.', 'PM'), say('Aileron down.', 'PF'), ip('Up.', 'PM'),
        say('Elevator up.', 'PF'), ip('Up', 'PM'), say('Elevator down', 'PF'), ip('Down', 'PM'),
        THREE_WAY, act('PM conducts control check.'), THREE_WAY,
        say('Flaps selected DOWN. Indicate DOWN, checked DOWN.', 'PF'), ip('DOWN', 'PM'),
        say('Flaps selected APPROACH. Indicate APPROACH, checked APPROACH.', 'PF'), ip('APPROACH', 'PM'),
        say('Flaps selected UP. Indicate UP, checked UP.', 'PF'), ip('UP', 'PM'),
      ],
    }),
    { note: 'Control check and flap check.' },
    memory('sr10', 'Right Generator', 'Load below .5, OFF', 'PF', {
      watch: ['Generator Load'],
      action: ['PF checks right generator load and secures generator when load is below 0.5.'],
      replies: [say('Load below .5', 'PF'), say('OFF', 'PF')],
    }),
  ],
};

const GENERATOR_ON = (side) => [`PF turns on ${side} generator, notes ${side === 'right' ? 'RH' : 'LH'} GEN OUT annunciator light extinguished and load indication.`];

const START_LEFT = {
  id: 'start-left',
  title: 'Start Procedure - Left Engine',
  normal: true,
  // One procedure in two cards: in a random order the left engine still follows the right.
  after: 'start-right',
  start: 11,
  rows: [
    { note: 'Brief: "This will be a generator assisted start of the left engine. Left side\'s clear." (PF) "Right side\'s clear." (PM) One finger in the windshield.' },
    memory('sl11', 'Left Starter', 'On, Ignition, rotation', 'PF', {
      watch: ['LH IGN IND', 'N1', 'Elapsed Time Clock'],
      action: ['PF engages left starter with right hand while simultaneously starting elapsed time clock with left hand. Ensure LH IGN IND annunciator light on and call "ignition." Call "rotation" when N1 increases, not when the prop begins to turn outside. Leave right hand anchored on the starter until moving it to the condition lever to introduce fuel.'],
      replies: [act('(start clock)'), say('ON ignition, rotation')],
    }),
    memory('sl12', 'N1', 'Above 12 percent', 'PF', {
      action: ['Ensure N1 rising above 12%'],
      replies: [say('Above 12 percent')],
    }),
    memory('sl13', 'Right Generator', 'Reset, On', 'PF', {
      watch: ['RH GEN OUT'],
      action: ['PF turns on right generator and notes RH GEN OUT annunciator light extinguished.'],
      replies: [say('Reset, On')],
    }),
    memory('sl14', 'Right Engine', 'Monitor ITT', 'PF', {
      action: ['Pause momentarily to observe the right ITT. If ITT is likely to exceed 790 ºC, abort the start by turning off the left starter. Re-attempt the start with the right engine at 85% N1. A small rise in ITT is normal.'],
      replies: [say('Monitor ITT')],
    }),
    memory('sl15', 'Condition Lever', 'LOW IDLE', 'PF', {
      watch: ['N1'],
      action: ['PF moves left condition lever to LOW IDLE after N1 reaches 12% and the right generator has been turned on. PF mentally counts 10 seconds as timing back-up. PM commences timing for 10 seconds when PF moves condition lever to LOW IDLE. Leave right hand anchored on the condition lever until moving it to turn the starter off.'],
      replies: [say('LOW IDLE')],
    }),
    memory('sl16', 'Fuel Flow', 'Note', 'PF', { action: FUEL_FLOW }),
    memory('sl17', 'ITT and N1', 'Light-off, N1 stable above 50%', 'PF', {
      action: [
        'Monitor both engines',
        '(1090 C maximum) PF should announce light-off from ITT gauge.',
        'Start ITT must not exceed 1,090 ºC for greater than 2 seconds.',
        HOT_START,
      ],
      replies: [say('Light-off'), say('N1 stable above 50%')],
    }),
    memory('sl18', 'Left Starter', 'OFF', 'PF', {
      watch: ['N1', 'Elapsed Time Clock'],
      action: ['(50% N1 minimum)', 'Stop elapsed time clock.', STARTER_LIMITS],
      replies: [say('OFF')],
    }),
    memory('sl19', 'Oil Pressure', 'Thumbs up to lineman', 'PF', {
      watch: ['ITT', 'N1'],
      action: OIL_PRESSURE,
      replies: [act('Thumbs up to lineman')],
    }),
    memory('sl20', 'Right Generator', 'OFF', 'PF', {
      action: ['Place switch in the OFF position'],
      replies: [say('OFF')],
    }),
    memory('sl21', 'Fuel Quantity Indicators', 'Checked', 'PF', {
      watch: ['Left Fuel Quantity', 'Right Fuel Quantity'],
      action: [
        'PF ensures both fuel quantity indicators normal.',
        note('An absence of fuel quantity indications for either wing is indicative of a failure of the corresponding current limiter.'),
      ],
      replies: [say('Checked')],
    }),
    memory('sl22', 'Right Generator', 'RESET, ON. Switch, light, load', 'PF', {
      watch: ['RH GEN OUT', 'Generator Load'],
      action: GENERATOR_ON('right'),
      replies: [say('RESET, ON'), act('("Switch, light, load")')],
    }),
    memory('sl22b', 'Left Generator', 'RESET, ON. Switch, light, load', 'PF', {
      watch: ['LH GEN OUT', 'Generator Load'],
      num: 22,
      action: [...GENERATOR_ON('left'), 'Check that generator loads are within 0.1.'],
      replies: [say('RESET, ON'), act('("Switch, light, load")')],
    }),
    memory('sl23', 'Right Condition Lever', 'LOW IDLE', 'PF', {
      watch: ['N1'],
      action: ['Move to LOW IDLE position. Verify N1 gauge between 51-54%.'],
      replies: [say('LOW IDLE')],
    }),
    memory('sl24', 'Fuel Control Heat', 'ON', 'PF', {
      action: [
        'PF turns on fuel control heat switches.',
        caution('Operating with the FUEL CONTROL HEAT (ON) will damage the electrically heated anti-ice jacket unless the engine is running.'),
      ],
      replies: [say('ON')],
    }),
  ],
};

// ---------------------------------------------------------------------------------------
// F103

const AFTER_START = {
  id: 'after-start',
  title: 'After Start',
  done: '"AFTER START CHECKLIST COMPLETE." (PM)',
  rows: [
    item('as1', 'Environmental Controls', 'SET', 'RS', {
      action: ['RS sets environmental controls as desired.'],
      replies: [ip('SET', 'RS')],
    }),
    item('as2', 'Generator Voltages', 'CHECKED', 'LS', {
      action: ['LS simultaneously presses both PRESS FOR VOLTS pushbuttons on DC BUS meters and checks voltages 27.45-29.05 Volts (28.25 ±0.8).'],
      replies: [say('CHECKED', 'LS')],
    }),
    item('as3', 'AUX/BATT/Avionics Master', 'CHECKED/ON', 'PF', {
      action: [
        'PF performs the following check:',
        'a. Momentarily place AUX/BATT switch to TEST then turn AUX/BATT switch to ON/ARMED position and verify the AUX/ON light illuminates and the RTU powers up.',
        'b. Turn the Avionics Master switch ON, confirm that the AUX/ON light extinguishes. Continue checklist steps 4 through 7 and wait for AHRS #1 and 2 to align before moving the aircraft. (approximately 40-50 seconds)',
        'c. Once Avionics Master and AUX/BATT are on, PF, PM, OBS don headsets and perform ICS checks.',
      ],
      replies: [say('ICS check', 'PF'), ip('Loud and clear, how me?', 'PM'), say('Loud and clear, CHECKED/ON', 'PF')],
    }),
    item('as4', 'Oxygen Mask Mic', 'CHECKED/OPEN', 'PM, OBS', {
      action: [
        'a. PM set MIC switches to MASK on all audio control panels (ACP).',
        'b. PM momentarily set each Oxygen mask to EMER, then return to 100%.',
        'c. Verify oxygen flow sound is heard through the speaker when selected in EMER.',
        'd. Set MIC switches to BOOM on all ACPs.',
      ],
      replies: [ip('CHECKED/OPEN', 'PM'), ip('CHECKED/OPEN', 'OBS')],
    }),
    item('as5', 'Seatbelts', 'FASTENED', 'PF, PM, OBS', {
      action: ['PF ensures all personnel have seatbelts fastened. The lap belt must be snug around the hips and not riding up toward the chest. The belts should operate freely.'],
      replies: [say('FASTENED', 'PF'), ip('FASTENED', 'OBS'), ip('FASTENED', 'PM')],
    }),
    item('as6', 'Transfer Pumps', 'CHECKED/AUTO', 'LS', {
      watch: ['LH NO FUEL TRANSFER', 'RH NO FUEL TRANSFER'],
      action: [
        'LS performs the following checks:',
        'a. LS holds TRANSFER TEST switch in L position and places left TRANSFER PUMP switch to AUTO. Check for a momentary flicker of LH NO FUEL TRANSFER annunciator light. Reset FAULT WARNING if illuminated.',
        'b. Repeat test for right transfer pump.',
        'c. Verify both pumps are in AUTO.',
        note('If flicker is not visible, check annunciator panel dim switch. If it is set too low, flicker may not be visible.'),
      ],
      replies: [say('CHECKED/AUTO', 'LS')],
    }),
    item('as7', 'Crossfeed', 'CHECKED/AUTO', 'LS', {
      watch: ['L FUEL PRESSURE', 'R FUEL PRESSURE', 'FUEL CROSSFEED'],
      action: [
        'LS performs the following checks:',
        'a. Crossfeed valve – AUTO',
        'b. Left boost pump – OFF',
        'c. LH FUEL PRESS annunciator light will illuminate and almost instantly go out as the crossfeed valve opens. Verify the FUEL CROSSFEED annunciator light on. Reset the FAULT WARNING light if illuminated.',
        'd. Left boost pump – ON',
        'e. Crossfeed valve – CLOSED then AUTO. Closing the crossfeed valve resets the system. Verify CROSSFEED annunciator extinguished.',
        'f. Repeat test (Steps b-e) for the right boost pump.',
        'g. Verify the crossfeed valve is in AUTO.',
      ],
      replies: [say('CHECKED/AUTO', 'LS')],
    }),
    item('as8', 'Generator Load', 'CHECKED', 'LS', {
      action: [
        'LS checks left and right generator load within 0.1. If either individual load is above .5 or field elevation is above 5000 feet, increase N1 to support the higher load. Match both condition levers at the same N1 setting if a position above LOW IDLE is required (refer to NATOPS, Figure 4.3-1).',
        '(0.5-0.75% load = 57% N1 or higher)',
      ],
      replies: [say('CHECKED', 'LS')],
    }),
    item('as9', 'MFD', 'CHECKED/SET', 'PF', {
      action: [
        'Set MFD switch to ON (if not already).',
        '"Switch Channel 1, copy ATIS."',
        'a. Verify self-test passed. Press LSK to allow database check.',
        'b. Check database currency and press LSK.',
        'c. Select TRFC on the MFD.',
        'd. Rotate the outer control knob, select TST on the display.',
        'e. Observe test pattern on display and verbal "TAS SYSTEM TEST OK."',
        'f. Set view to NORMAL for local training missions, set range as desired and rotate outer control knob clockwise to ON.',
        'g. Verify TERR N/A annunciator light is out.',
        'h. Select TERR on the MFD.',
        'i. Rotate the outer control knob, select TST on the display.',
        'j. Observe test pattern on display and verbal "EGPWS SYSTEM OK." Set range as desired.',
        'k. Select MAP and set overlay/range as desired using the Range Select keys to the right of the display. Typical setting is TAS overlay with range set to 10-20 NM.',
      ],
      replies: [say('Switch Channel 1, copy ATIS.'), say('CHECKED/SET', 'PF')],
    }),
    // The FTI hangs the brake check and the taxi out of the line on this step.
    item('as10', 'Transponder', 'STANDBY', 'RS', {
      action: [
        'Position transponder switch on reversionary panel as required. At most airfields the transponder will be in STBY.',
        'Brief the PM to "Hold the checklist. Keep me clear on the right during all taxi and ground ops. Let base know we are out of the chocks." Signal "brake check" to the lineman.',
        'When signaled to move forward, ensure the aircraft is clear of obstacles and report "Clear left." PM responds "Clear right." The pilot should then depress both brake pedals and push the brake handle in, taxiing slowly forward as directed for a brake check.',
        note('Larger airports may require transponders for taxi. Consideration Should be given to check appropriate publications for transponder Requirements prior to taxiing.'),
        'PF directs PM to "Select channel 3 and request taxi." Then, select channel 3 and request taxi.',
        'During taxi, it is extremely important to clear before crossing any runways or taxiways. Depart line area and enter taxiway. Note proper turn needle deflection as you turn onto the taxiway from the line area, ensure the Turn needle/Ball properly deflects. PF will report the following: "Needle Left/(Right)"',
        'Once on taxi centerline and after gaining taxi speed, slowly pull both power levers into reverse and note symmetric acceleration on both engine N1 gauges. Do not bring aircraft to a stop. Observing prop RPM gauge indications does not satisfy this check. The intent is to ensure symmetric "engine" spool-up not propeller spool-up. Utilize minimum reverse required to verify proper operation and then return power levers towards idle. Do not pull the powers levers to max reverse to conduct this check.',
        'Have the PM take the controls momentarily for a brake check.',
        'Direct the PM to "Continue the checklist." Do not taxi between runway/taxiway edge lighting while making final turn in the runup areas.',
        caution('Minimize use of reverse at slow taxi speeds. Use of reverse range in surface areas containing loose sand or small stones may cause propeller blade erosion.'),
      ],
      replies: [
        ip('STANDBY', 'RS'), act('(as required)'),
        say('Hold the checklist. Keep me clear on the right during all taxi and ground ops. Let base know we are out of the chocks.', 'PF'),
        ip('Roger', 'PM'), act('Perform brake check', 'PF'), act('Salute Lineman', 'PF'),
        ip('(Squadron) Base, (call-sign) out of the chocks', 'PM'),
        say('Select channel 3 and request taxi.', 'PF'),
        ip('Navy Corpus Ground, (call-sign), taxi VFR/IFR from (location) to the runup with (information)', 'PM'),
        act('PM repeats clearance to ATC'), act('PF confirms and announces clearance to the crew'),
        ip('Clear right', 'PM'), say('Clear left', 'PF'), say('Needle left', 'PF'),
        THREE_WAY, act('RS conducts brake check'), THREE_WAY,
        say('Continue the checklist', 'PF'),
      ],
    }),
    item('as11', 'Turn Indicator', 'CHECKED', 'PF', {
      action: ['Only one direction for turn needle is required.'],
      replies: [say('CHECKED', 'PF')],
    }),
    item('as12', 'Brakes', 'CHECKED', 'PF, PM', {
      replies: [say('CHECKED', 'PF'), ip('CHECKED', 'PM')],
    }),
  ],
};

// ---------------------------------------------------------------------------------------
// F104

const ENGINE_RUNUP = {
  id: 'engine-runup',
  title: 'Engine Runup',
  done: '"ENGINE RUNUP CHECKLIST COMPLETE." (PM)',
  rows: [
    item('er1', 'Parking Brake', 'SET', 'LS', {
      action: ['LS ensures brake handle pulled out fully and brakes pumped firm. PF will keep both feet on the brakes for the entire Runup Checklist. PM will notify the PF if movement is detected and will immediately depress the brakes if any movement is noted.'],
      replies: [say('SET', 'LS'), say('Monitor for movement during runup.', 'PF')],
    }),
    abbrev('er2', 'ESIS', 'ON', 'PF', {
      action: [
        'Do not taxi until the ESIS has aligned.',
        note('Typical alignment time for the Standby Attitude Indicator is approximately 2-3 minutes with a maximum expected alignment time of 6 minutes.'),
      ],
      replies: [say('ON', 'PF')],
    }),
    abbrev('er3', 'Engine Instruments', 'CHECKED', 'PF', {
      watch: ['ITT', 'Torque', 'Prop RPM', 'N1', 'Fuel Flow', 'Oil Pressure'],
      action: [
        'LS ensures both power levers are at IDLE and condition levers are at LOW IDLE. The main point of this check is to ensure N1 is at LOW IDLE to commence Engine Runup if previously increased to support a high generator load after starting engines.',
        warning('Whenever moving the condition levers to LOW IDLE, pinch the levers together, and then move the levers very slowly. If a LOW IDLE stop is weak, or a lever is moved rapidly, flameout may result. Should flameout occur, do not move the condition lever back to LOW IDLE bring it fully into FUEL CUTOFF. The engine may be restarted using the appropriate checklist.'),
        note('The indicator dial and pointer is the primary indication of each indicator. As such and due to possible internal unit of measure limits, minor differences between the dial and the digital indication may be seen.'),
        'LS checks all engine instruments for normal indications:',
        'a. ITT – 685 ºC maximum',
        'b. Torque – 100-200 lb.ft',
        'c. Prop RPM – 900-1100 RPM',
        'd. N1 – 51-54%',
        'e. Fuel flow – 100 lbs/hr (approximately)',
        'f. Oil temp – -40-99 ºC',
        'g. Oil press – 40-100 PSI',
      ],
      replies: [say('CHECKED', 'PF')],
    }),
    abbrev('er4', 'Manual Feather', 'CHECKED', 'PF', {
      watch: ['Prop RPM'],
      action: [
        'LS performs the following checks:',
        'Power levers – IDLE, prop RPM stabilized. (Power must be at idle). Pull prop levers aft through detent to FEATHER. Check that props will feather, then advance to FULL FORWARD. Prop rpm should return to 900 to 1,100 rpm.',
        note('If propeller RPM does not read between 900 and 1,100 rpm with the power levers at idle and the condition levers at low idle, perform a Low Pitch Torque check (check flight item 5 in paragraph 10.6 of the NATOPS) to ensure propeller flight idle stops are correctly adjusted.'),
      ],
      replies: [say('CHECKED', 'PF')],
    }),
    item('er5', 'Suction & Pneumatic Pressure', 'CHECKED', 'LS', {
      action: [
        'LS ensures suction 4.3-5.9 inches Hg (5.1 ±0.8) and pneumatic pressure 12-20 PSI (16 ±4).',
        'a. Condition levers — HIGH IDLE',
        'b. Verify N1 stabilizes between 70% - 73%',
      ],
      replies: [say('CHECKED', 'LS')],
    }),
    item('er6', 'Overspeed Governors', 'CHECKED', 'LS', {
      watch: ['Prop RPM', 'ITT', 'Torque'],
      action: [
        'a. Prop levers – full forward',
        'b. Adjust power levers to ensure prop RPM less than 1900 RPM.',
        'c. PROP GOV TEST switch – TEST (up position)',
        'Maintain a firm grip on the switch. DO NOT release the switch while the test is being performed. An abrupt surge in prop rpm may result.',
        'd. Slowly advance power levers until prop RPM stops increasing (1900-2100 RPM). ITT and Torque should continue to increase while prop RPM remains stabilized. A properly paced check will not result in high torque.',
        'e. Retract power levers to set 1900 prop RPM.',
        'f. Release PROP GOV TEST switch.',
      ],
      replies: [say('CHECKED', 'LS')],
    }),
    item('er7', 'Primary Governors', 'CHECKED', 'LS', {
      watch: ['Prop RPM'],
      action: [
        'a. Check power levers to set 1900 prop RPM.',
        'b. Smoothly move both prop levers aft until reaching the feather detent. This will be felt as increased resistance. Be careful not to allow prop levers to enter into the FEATHER position. If FEATHER is inadvertently selected, bring the props forward immediately.',
        'c. Ensure prop RPM stabilized between 1600-1800 RPM.',
        'c. Slowly advance prop levers full forward.',
        'd. Verify prop RPM returns to approximately 1900 RPM.',
      ],
      replies: [say('CHECKED', 'LS')],
    }),
    item('er8', 'Autofeather/Autoignition', 'CHECKED/OFF', 'LS', {
      watch: ['LH AUTO IGNITION ARMED', 'RH AUTO IGNITION ARMED', 'LH AUTOFEATHER ARMED', 'RH AUTOFEATHER ARMED', 'LH IGN IND', 'RH IGN IND', 'Torque', 'Prop RPM'],
      action: [
        'LS performs the following checks:',
        'a. Condition levers - LOW IDLE',
        'b. Power levers – confirm greater than 460 lb.ft torque.',
        'c. ENG AUTO IGN SWITCHES (2) – ON. Observe LH and RH AUTO IGNITION ARMED annunciator lights (green) illuminated.',
        'd. AUTO-FEATHER switch – HOLD TO TEST (down position); observe (2) green AUTO-FEATHER ARMED annunciator lights illuminated. If lights do not come on, advance the power levers slightly.',
        'e. Left power lever – Retract slowly. As torque reaches 410 ±50 lb.ft, check RH AUTO-FEATHER ARMED annunciator light out, LH AUTO IGNITION ARMED annunciator light out and LH IGN IND annunciator light (amber) illuminated. At 200 ±40 lb.ft check LH AUTO-FEATHER ARMED annunciator light flashing. This indicates the prop is feathering. After prop RPM decreases below 800 RPM, advance left power lever to 500 lb.ft torque (approximately). Note both the AUTO-FEATHER ARMED annunciator lights and AUTO IGNITION ARMED lights are illuminated (four green lights).',
        'f. Right power lever – Retract slowly. As torque reaches 410 ±50 lb.ft, check LH AUTO-FEATHER ARMED annunciator light out, RH AUTO IGNITION ARMED annunciator light out and RH IGN IND annunciator light illuminated. At 200 ±40 lb.ft check RH AUTO-FEATHER ARMED annunciator light flashing. This indicates the prop is feathering. After prop RPM decreases Below 800 RPM, retract both power levers to idle.',
        'g. AUTO-FEATHER TEST switch – Release after noting right prop feathering cycle terminated and right prop RPM increasing.',
        'h. ENG AUTO IGN switches (2) – Off. Ensure both IGN IND annunciator lights out.',
        note('After the Engine Runup Checklist is complete, the PF shall reset N1 via the condition levers as appropriate per NATOPS Figure 4.3-1.'),
      ],
      replies: [
        say('Call my lights.', 'PF'), ip('Four lights', 'PM'),
        ip('Swap', 'PM'), say('408', 'PF'), act('(call out torque values for each checkpoint)', 'PF'), ip('Flashing', 'PM'), say('213', 'PF'), ip('All four', 'PM'),
        ip('Swap', 'PM'), say('417', 'PF'), ip('Flashing', 'PM'), say('206', 'PF'),
        say('CHECKED/OFF', 'LS'),
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------------------
// F105

const BEFORE_TAKEOFF = {
  id: 'before-takeoff',
  title: 'Before Takeoff',
  done: '"BEFORE TAKEOFF CHECKLIST COMPLETE." (PM)',
  rows: [
    item('bt1', 'Autopilot/Yaw Damp', 'CHECKED/DISENGAGED', 'PF, PM', {
      action: [
        'PF and PM perform the following checks:',
        'a. PF engages the autopilot and presses the AP/YD disconnect button on the pilot\'s control wheel. Observe that the autopilot disengages and is accompanied by a warning horn and PFD indication. PF then ensures flight controls operate freely. All that is required is small movement of the control wheel and rudder pedals to ensure there are no servos binding.',
        'b. PF engages autopilot and directs the PM to press the AP/YD disconnect button on the control wheel. Observe that the autopilot disengages and is accompanied by a warning horn and PFD indication. PM then ensures flight controls operate freely.',
        'Verify AP is disengaged and select AP disconnect bar to the down position. PF and PM press their respective FD button on the FGP to remove command bars from PFD.',
        warning('Engagement of the yaw damp during takeoff or landing may result in severe directional control problems.'),
        caution('Do not check the autopilot while taxiing. Do not attempt to move the controls while the AP is engaged. Damage to the AP servos will result.'),
        note('Observe momentary flashing red AP text on top of PFD and audible warning horn during the disconnect.'),
      ],
      replies: [say('CHECKED/DISENGAGED', 'PF'), ip('CHECKED/DISENGAGED', 'PM')],
    }),
    item('bt2', 'Controls', 'CHECKED', 'PF, PM', {
      action: ['Check as previously described, if not already checked. A second check is unnecessary.'],
      replies: [say('CHECKED', 'PF'), ip('CHECKED', 'PM')],
    }),
    item('bt3', 'Props', 'FULL FORWARD', 'PF', {
      action: ['PF ensures props full forward.'],
      replies: [say('FULL FORWARD', 'PF')],
    }),
    item('bt4', 'Prop Sync', 'OFF', 'PF', {
      action: ['PF ensures Prop sync off.'],
      replies: [say('OFF', 'PF')],
    }),
    item('bt5', 'Autofeather', 'ARMED', 'LS', {
      action: ['LS moves Auto-feather switch to armed.'],
      replies: [say('ARMED', 'LS')],
    }),
    item('bt6', 'Anti-Ice/Deice/Radar', 'CHECKED AS REQUIRED', 'PF, PM', {
      watch: ['Generator Load'],
      action: [
        'Full anti-ice/deice checks are practiced during cockpit procedures trainers (CPTs) and must be memorized.',
        'If flight into icing conditions is anticipated and/or on the first leg of a cross-country flight, full anti-ice/deice checks must be completed. Monitor load meter to ensure each system is operational and minimum N1 is maintained for the load condition. When required, conduct anti-ice/deice checks per NATOPS Chapter 19. If not required, PF and PM respond, "Pitot heat checked" since this was previously checked during the Preflight Inspection NATOPS 7.2.1.2',
        'Radar Test: Test the radar if utilization is anticipated in flight.',
        'a. Ensure both PFDs are in 120 format using R1 soft key.',
        'b. Ensure RLSK on PFD shows RDR as selected (Display is BLUE).',
        'c. PF Selects Radar button on Display Control Panel (DCP), System should be in STBY.',
        'd. Ensure STAB is selected ON.',
        'e. Ensure GAIN is in NORM.',
        'f. Ensure SECTOR SCAN is OFF.',
        'g. Ensure TARGET is OFF.',
        'h. Using the MENU ADVANCE knob, PF selects TST on the display.',
        'i. Observe test sweeps on both PFDs. Verify both patterns display on each PFD (6-line test pattern and 5-line pattern). Both seats verbalize "5" and "6".',
        'j. PF selects STBY using MENU ADVANCE knob.',
      ],
      replies: [
        act('For pitot only check:'), say('Pitot Heat CHECKED', 'PF'), ip('CHECKED', 'PM'),
        act('For full check respond:'), say('Give 30 second intervals', 'PF'), ip('30 seconds x4', 'PM'),
        say('Radar CHECKED/STANDBY', 'PF'), ip('Radar CHECKED/STANDBY', 'PM'),
      ],
    }),
    item('bt7', 'Pressurization', 'SET', 'PM', {
      action: [
        'PM sets:',
        'a. Rate control knob to midpoint of travel (approximately one o\'clock position).',
        'b. Cabin controller to field elevation plus the correction factor per NATOPS Figure 2.18-5.',
        'Ensure Press mode selector switch is in "Press" for initial takeoff of the day. Moving to "Dump" after takeoff is permitted, as long as the aircraft is not pressurizing with the bleed air valves closed. If the aircraft pressurizes, one of the bleed air valves is open and the flight should not be continued.',
      ],
      replies: [ip('SET', 'PM')],
    }),
    item('bt8', 'Bleed Air Valves', 'OPEN or CLOSED', 'RS', {
      action: ['RS sets bleed air valves as required.'],
      replies: [ip('OPEN or CLOSED', 'RS'), act('(as required)')],
    }),
    abbrev('bt9', 'Trim', 'CHECKED/SET', 'PF, PM', {
      action: [
        '(normally 0, 0, 2 up)',
        'PF and PM perform the following check:',
        'a. Split switch (on control wheel) – Individually move each half of split switch and note the elevator trim wheel does not move. Do not rush the check.',
        'b. Split switch – Move both halves of split switch and note smooth movement of the trim wheel. Perform check in both directions. While trim wheel is moving during the second half of the check, depress and hold the red AP/YD button (to the second detent) on the control wheel to disengage the electric trim. Note the trim wheel stops and a red TRIM annunciator illuminates on the PFD. Release the AP/YD button, and note trim re-engages before releasing the split switch.',
        'c. PF normally sets the following: Aileron – 0, Rudder – 0, Elevator – 2 up',
        'Checking of electric trim is only required for the first takeoff of the day. When utilizing the abbreviated before takeoff checklist, it is not required to re-check electric trim.',
        note('At high gross weights and aft center of gravity (cg), consideration should be given to utilizing less nose-up trim for takeoff.'),
      ],
      replies: [say('CHECKED/SET', 'PF'), ip('CHECKED/SET', 'PM')],
    }),
    abbrev('bt10', 'Flaps', 'CHECKED/UP', 'PF, PM', {
      watch: ['Flap Position Indicator'],
      action: ['Check as previously described, if not already checked. Visually confirm the flap handle, flap position indicator, and flaps are all in the UP position.'],
      replies: [say('CHECKED/UP', 'PF'), ip('CHECKED/UP', 'PM')],
    }),
    abbrev('bt11', 'Altimeters', 'CHECKED/SET', 'PF, PM', {
      watch: ['ESIS'],
      action: [
        'PF and PM perform the following checks:',
        'a. Barometric Altimeter (BA): Set the current altimeter setting on both PFDs and ESIS. Ensure no comparators or warning flags visible on PFD. Ensure the barometric altimeter indicates within ±75 feet of airport elevation and compare LS, RS and ESIS altimeter readings. See the airport diagram for specific field elevations.',
        'b. Set BARO/RA minimums as required.',
        'c. Radar Altimeter (RA): PF depress radio altimeter test button to verify proper indications. Both altimeters should show a rise of 50 feet and the green RAD ALT display should show 50 ±5 feet.',
        'd. Set and select V SPEEDS (VT-102, VR-91, VREF-110. Select VT, VR, and VREF for display.)',
        'A typical response would be: (PF) "PFD set 30.12 reading 30 feet, ESIS set 30.12 reading 30 feet. RADALT checks." (PM) "Set 30.12, reading 30 feet, RADALT checks" and reports any discrepancies.',
      ],
      replies: [
        say('PFD set 30.12 reading 30 feet, ESIS set 30.12 reading 30 feet. RADALT checks.'), say('CHECKED/SET', 'PF'),
        ip('Set 30.12, reading 30 feet, RADALT checks'), ip('CHECKED/SET', 'PM'),
      ],
    }),
    abbrev('bt12', 'FMS', 'CHECKED/SET', 'PF, PM', {
      action: [
        'PF will tell PM to "Hold the checklist," and contact clearance delivery (or Seagull Radar if necessary) in accordance with the Typical Briefs and Voice Procedures Appendix to copy the IFR clearance if appropriate.',
        'Before going heads down to load FMS data, the controls should be passed to the PM.',
        'Typical response would be "You have the controls. I will be heads down."',
        'Using the IFR clearance information, or typical VFR configuration, set up FMS for flight as follows:',
        'a. Status – Verify FMS database is current and ensure UTC time and date correct.',
        'b. Pos Init – MANDATORY, Use RSK 6 on STATUS page. Set FMS position to GPS position using RSK 4.',
        'c. FPLN – For RI events, enter departure and destination airports on FPLN page. For Familiarization events, when loading a ROUTE for a working area, a full flight plan will load. There is no need to enter a departure or destination when loading a ROUTE. Once the FPLN or ROUTE is loaded, verify the waypoints are correct on the LEGS page. Then call for the PF to verify the waypoints. Once PF verifies, Press EXEC button. Select LEGS and inhibit the waypoints from sequencing using RSK 1. In order to activate the fuel functions within the FMS, Select PERF INIT (RSK 6) at the bottom right of the FPLN page.',
        'd. Select the Manual Fuel entry (LSK 4) and enter current total fuel load in lbs. (typical training load 2400 lbs.).',
        'e. Check RAIM if required – IDX button then GPS CTL. Enter destination airfield, ETA, and verify RAIM availability.',
        'Refer to current CNAF M-3710.7 for predictive RAIM check requirements.',
      ],
      replies: [
        say('Hold the checklist', 'PF'), say('You have the controls. I will be heads down.', 'PF'), THREE_WAY,
        say('For IFR clearance, call clearance delivery. For VFR, deconflict on BTN 19 if using Seagull working areas.'),
        say('Load Route or flight plan as desired.', 'PM'), say('Verify', 'PM'),
        act('Check 120 Map mode, verify correct routing,'), ip('Execute', 'PF'), THREE_WAY,
        say('CHECKED/SET', 'PF'), ip('CHECKED/SET', 'PM'),
      ],
    }),
    abbrev('bt13', 'Flight Instruments', 'CHECKED/SET', 'PF, PM', {
      watch: ['PFD', 'ESIS'],
      action: [
        'PF and PM check flight instruments for proper indications:',
        'a. Compare flight information on both Primary Flight Displays (PFDs) and the Electronic Standby Instrument System (ESIS). Note any comparators or warning flags.',
        'b. V/UHF radio: Check squelch on and verify function switch TR+G. Set desired display intensity by pressing ENT then 8 for dim or 9 for bright. Select desired MAN or PRESET frequency. Set desired frequency.',
        'c. VHF radio: PF will depress EMER 121.5 button and ensure button is illuminated with frequency displayed in RTU active window. After depressing the button, wait approximately 5-7 seconds and observe the frequency changes color from green to amber to green with two tones heard. If no tones are heard after 5-7 seconds, tune up local ATIS and retest. The frequency switch to 121.5 should be instantaneous with the depression of the button and the ATIS broadcast should cease. This will show a successful frequency switch to EMER 121.5. Reset the EMER 121.5 button to return RTU to normal functionality. Set appropriate frequency in preset and active.',
        'd. NAV1 / NAV2 / ADF: Set appropriate frequencies in preset and active using RTU. Tune and identify NAVAIDs. Repeat for NAV2 after depressing ½ hard key on RTU. Set appropriate frequency in ADF window on RTU.',
        'e. Set XPNDR in accordance with assigned squawk or SOPs. Set ADS-B call-sign on RTU ATC or FMS TUN page 2/2.',
        'f. TACAN: On TACAN control head, tune appropriate frequency, verify ON/OFF switch is ON, A/A or A/G switch is in A/G position, and X/Y band selector switch is flipped to appropriate band.',
        'g. PFD: LS and RS select desired NAV sources for CDI, PRESET, bearing source 1 and bearing source 2 on PFDs. Set CDI source as appropriate. Set desired PFD display format.',
        'h. FGP: set departure speed using SPEED knob, desired altitude using ALT select knob, and heading as desired using HDG knob. Set ESIS course as appropriate.',
        note('V1, VR, and V2 are automatically removed from the airspeed tape at 150 KIAS'),
      ],
      replies: [say('CHECKED/SET', 'PF'), ip('CHECKED/SET', 'PM')],
    }),
    item('bt14', 'Fuel Quantity', '___ LBS, ___ LBS REQUIRED', 'PF', {
      watch: ['Left Fuel Quantity', 'Right Fuel Quantity'],
      action: [
        'Compare actual fuel load with preflight fuel calculations requirements in accordance with SOP and CNAF M-3710.7 minima.',
        note('With full fuel tanks left and right, quantity indicators with TOTAL selected should indicate within 100 pounds of each other. With NACELLE selected, the maximum difference should be 50 pounds. In either case, quantity shall be outside the yellow arcs and the discrepancy must be noted on the appropriate maintenance form for correction prior to the next flight.'),
      ],
      replies: [say('__lbs, __lbs required', 'PF')],
    }),
    // The FTI hangs the crew brief and the taxi to the hold short on this step.
    abbrev('bt15', 'Crew', 'BRIEFED', 'PF', {
      action: [
        'Brief the PM in accordance with the Typical Briefs and Voice Procedures Appendix, as appropriate. At a minimum, brief the PM On the takeoff, instrument departure procedures, and intended type of recovery if an emergency is encountered after takeoff.',
        'May include any other information deemed helpful for the flight, particularly TOLD data. Other items may include:',
        'N– NOTAMs/Notes',
        'O– Obstacles',
        'T– Terrain/Trouble Ts',
        'A– Airfield/Airspace',
        'M– Mins/eMergencies',
        'S– Speeds/TOLD',
        'WX– Weather/BASH',
        'Check nacelle fuel quantities to ensure it is "out of the yellow" cautionary range.',
        'PM Calls ground for further taxi. PF repeats clearance internally.',
        'Taxi to the Hold Short: Approaching the hold-short, switch to channel 4 and request takeoff clearance. If there is sufficient time prior to being cleared onto the runway, the PF is encouraged to check total and nacelle fuel quantities prior to takeoff clearance to minimize takeoff delays once cleared.',
        'PF repeats clearance internally.',
        'After cleared to line up and wait or for takeoff: Visually clear the downwind, base, final, and the runway for traffic. Then direct the PM to "continue" the Before Takeoff Checklist while crossing the hold short line and taxiing into position for takeoff.',
      ],
      replies: [
        say('Back me up on the power quadrant and monitor all engine and flight instruments. Call out any malfunctions. All malfunctions will be handled in accordance with NATOPS. Call rotate at 91 knots and note the time of takeoff. This will be a course rules departure to (working area). In the event of an emergency return, I\'ll maintain VMC, and request downwind.'),
        act('-Brief TOLD'), say('Any questions?', 'PF'), say('Briefed', 'PF'),
        say('Hold the checklist. Check me out of the yellow. Request further taxi.', 'PF'), ip('You\'re out of the yellow.', 'PM'),
        ip('Navy Corpus Ground, (call-sign), request further taxi.', 'PM'),
        act('Ground delivers clearance, PM repeats clearance to ATC.'), act('PF confirms and announces clearance to the crew'),
        say('Clear left.', 'PF'), ip('Clear right.', 'PM'),
        ip('Navy Corpus Tower, (call-sign), runway ##, #1(or #2), holding short, VFR to (location). Ready for departure', 'PM'),
        act('Tower gives takeoff clearance.'), ip('(call-sign), cleared for takeoff, runway ##', 'PM'),
        act('PF confirms and announces clearance to the crew.'),
        say('Clear left and above', 'PF'), ip('Clear right and above', 'PM'), say('Continue the checklist.', 'PF'),
      ],
    }),
    { decision: 'AFTER CLEARED ONTO THE ACTIVE RUNWAY:' },
    abbrev('bt16', 'Lights', 'SET', 'LS', {
      watch: ['Left Landing Light', 'Right Landing Light', 'Taxi Light', 'Beacon', 'Strobe'],
      watchOnly: true,
      action: [
        'LS places the following switches on:',
        'a. LEFT and RIGHT LANDING',
        'b. TAXI',
        'c. NAV (night or when visibility is less than 3 statute miles)',
        'd. ICE (night only)',
        'e. BEACON (already on)',
        'f. STROBE (before taking the active runway for departure)',
      ],
      replies: [say('SET', 'LS')],
    }),
    abbrev('bt17', 'Anti-Ice/Deice', 'SET', 'LS', {
      action: [
        'LS turns on anti-ice/deice equipment per NATOPS Chapter 19. Normally, only the left and right pitot heat is necessary.',
        caution('Pitot heat should not be left ON for extended ground operations, as prolonged ground operation without cooling airflow may damage the heating element.'),
      ],
      replies: [say('SET', 'LS')],
    }),
    abbrev('bt18', 'Transponder', 'SET', 'RS', {
      action: ['RS switches XPDR switch below RTU from STBY to ON.'],
      replies: [ip('SET', 'RS')],
    }),
    abbrev('bt19', 'Autoignition', 'ARMED', 'PM', {
      action: ['PM sets both RH and LH ENG AUTO IGN switches to ARM'],
      replies: [ip('ARMED', 'PM')],
    }),
    abbrev('bt20', 'Condition Levers', 'HIGH IDLE', 'PF', {
      watch: ['N1'],
      action: [
        'PF places both condition levers full forward and verifies 70-73% N1 with power levers at idle.',
        'When lined up and ready for takeoff: Check left wing/nacelle for fuel caps in place, panels secure, and no fluid leaks. Check PFD and ESIS headings aligned with the runway, no abnormal flags, and engine instruments/props stabilized. Confirm there are no malfunctions and ready for takeoff, report "checked left." The RS will do the same for the right wing/instruments and report "checked right." Release the brakes and place both feet on the lower portion of the rudder pedals. Commence takeoff roll per NATOPS.',
      ],
      replies: [say('HIGH IDLE', 'PF'), ip('BEFORE TAKEOFF CHECKLIST COMPLETE.', 'PM'), say('Checked left', 'LS'), ip('Checked right', 'RS')],
    }),
  ],
};

// The full check. NATOPS §19.1.4 (p. 19.1-2), which ME FTI §F105 item 6 (p. F-15) calls for and
// says "must be memorized"; NATOPS rules where the FTI differs (its "Condition levers — HIGH /
// LOW IDLE", pitot "checked during preflight", fuel control heat left on, the last two steps
// swapped). The responses are the FTI's, which NATOPS does not give. Required when icing is
// forecast (NATOPS) and on the first leg of a cross-country (FTI); otherwise the reply to Before
// Takeoff item 6 is "Pitot heat checked". Neither publication gives a crewmember for these steps.
const ANTI_ICE_CHECK = {
  id: 'anti-ice-check',
  title: 'Full Anti-Ice/Deice Check',
  normal: true,
  rows: [
    memory('ai1', 'Propeller deicer', 'ON', undefined, {
      watch: ['Prop Amps'],
      action: [
        'Commence timing. Assure PROP AMPS indicate 14 to 18 during each of the 4 phases. The timer will switch phases approximately every 30 seconds. Momentary needle deflection may be visible as propeller heat cycles between phases. Secure the system after amperage is checked during the fourth phase (2 minutes minimum). Additional anti-ice and deice checks may be performed while the propeller is being checked.',
        caution('Monitor load meters during anti-icing equipment checks to prevent exceeding operating limits. Increase N1 if required in accordance with Figure 4.3-1.'),
      ],
      replies: [say('Give 30 second intervals', 'PF'), ip('30 seconds x4', 'PM')],
    }),
    { note: 'PM calls "30 seconds" x4. PROP AMPS 14 to 18 in each of the 4 phases, 2 minute minimum.' },
    { decision: '2. Place the following anti-icing systems ON and monitor load for proper indication:' },
    memory('ai2a', 'LEFT & RIGHT PITOT', 'ON', undefined, { watch: ['Generator Load'], sub: 'a' }),
    memory('ai2b', 'Stall Heat', 'ON', undefined, { watch: ['Generator Load'], sub: 'b' }),
    memory('ai2c', 'LEFT & RIGHT ENG LIP BOOT', 'ON', undefined, {
      watch: ['Generator Load'],
      sub: 'c',
      action: ['No rise in load should be evident during ground activation of engine lip boots. A rise in load indicates a malfunction in squat switch circuitry.'],
    }),
    memory('ai2d', 'LEFT & RIGHT FUEL VENT', 'ON', undefined, { watch: ['Generator Load'], sub: 'd' }),
    memory('ai2e', 'WSHLD ANTI-ICE', 'BOTH, Then PILOT', undefined, { watch: ['Generator Load'], sub: 'e' }),
    { note: '3. Upon completion of anti-ice checks, place all switches OFF.' },
    memory('ai4', 'N1', '70 percent (both engines)', undefined, { num: 4 }),
    memory('ai5', 'DE-ICE CYCLE', 'SINGLE, Then MANUAL', undefined, {
      watch: ['Pneumatic Pressure', 'Gyro Suction'],
      num: 5,
      action: [
        'Check wing and tail boot automatically inflate, then deflate in 7 to 8 seconds when SINGLE is selected. Check pneumatic pressure is 12 to 20 psi. Repeat the same check in MANUAL, disregarding cycle time.',
      ],
      replies: [
        act('(At DE-ICE CYCLE– SINGLE)'),
        act('Wing de-ice boots:'), say('Inflate', 'PF'), ip('Inflate', 'PM'),
        act('Pneumatic pressure indicator:'), say('Pressure', 'PF'),
        act('Tail de-ice boots:'), say('Inflate', 'PF'), ip('Inflate', 'PM'), say('Deflate', 'PF'), ip('Deflate', 'PM'),
        act('Gyro suction indicator:'), say('Suction', 'PF'),
        act('Wing de-ice boots:'), say('Deflate', 'PF'), ip('Deflate', 'PM'),
        act('(Repeat for MANUAL, releasing switch to deflate)'),
      ],
    }),
    { note: 'Boots inflate, then deflate in 7 to 8 seconds in SINGLE. Pneumatic pressure 12 to 20 psi.' },
    memory('ai6', 'Propeller deice', 'OFF (if not previously secured)', undefined, { num: 6 }),
    memory('ai7', 'N1', 'IDLE (both engines)', undefined, {
      num: 7,
      replies: [say('CHECKED', 'PF'), ip('CHECKED', 'PM')],
    }),
  ],
};

// ---------------------------------------------------------------------------------------
// F106 to F108

const INSTRUMENTS_NACELLES = [
  'LS looks outside and checks the left wing and nacelle for fluid leaks, loose panels, and any other discrepancies. LS then checks engine and flight instruments, and fuel quantities (return quantity switch to TOTAL). RS also looks outside and checks the right wing and nacelle for fluid leaks, loose panels, and any other discrepancies. RS then checks engine and flight instruments for discrepancies. If there are no discrepancies, the appropriate checklist response is "checked" for both pilots.',
  'Utilize ice lights for wing checks at night.',
];

const CLIMB = {
  id: 'climb',
  title: 'Climb',
  done: '"CLIMB CHECKLIST COMPLETE" (PM)',
  rows: [
    abbrev('cl1', 'Landing Gear', 'UP', 'PM', {
      watch: ['Gear Down Lights'],
      action: ['PM ensures landing gear handle up, light in landing gear handle extinguished, and three green lights out.'],
      replies: [ip('UP', 'PM')],
    }),
    abbrev('cl2', 'Flaps', 'UP', 'PM', {
      watch: ['Flap Position Indicator'],
      action: ['PM ensures flap handle UP and flap gauge indicating UP. A visual check of flap position is not required unless experiencing a malfunction.'],
      replies: [ip('UP', 'PM')],
    }),
    abbrev('cl3', 'Instruments/Nacelles', 'CHECKED', 'PF, PM', {
      watch: ['Engine Instruments', 'PFD', 'Left Fuel Quantity', 'Right Fuel Quantity'],
      action: INSTRUMENTS_NACELLES,
      replies: [say('CHECKED', 'PF'), ip('CHECKED', 'PM')],
    }),
    abbrev('cl4', 'Lights', 'SET', 'LS', {
      action: ['LS turns landing, taxi, and ice lights OFF.', '(PM reports "Abbreviated Climb Checklist complete" or continues with full checklist.)'],
      replies: [say('SET', 'LS')],
    }),
    item('cl5', 'Autofeather', 'OFF', 'LS', {
      action: ['LS selects AUTO-FEATHER switch OFF, unless low altitude operations requiring auto-feather are planned.'],
      replies: [say('OFF', 'LS'), act('(as required)')],
    }),
    item('cl6', 'Prop Sync', 'OFF', 'PF', {
      action: ['PF sets 1900 RPM on left propeller RPM, then fine-tunes the right (PF) propeller to minimize audible modulation, then selects prop sync ON (as required) if desired. Prop sync is not typically used for high-work, and as such is typically left off for most flights.'],
      replies: [say('OFF', 'PF'), act('(as required)')],
    }),
    item('cl7', 'Pressurization', 'CHECKED', 'PM', {
      watch: ['Cabin Altitude', 'Cabin Climb'],
      action: [
        'Once airborne, pressurization setting is at the discretion of the PIC.',
        'Pressurized, PM checks: - Depending on ambient altitude and system efficiency, the differential (short needle) should increase from zero as the cabin pressurizes. The long needle will indicate cabin altitude. If desired cabin pressure indications are not correct, call for the Loss of Pressurization checklist.',
        'Unpressurized, PM checks: - Differential (short needle) should remain at zero while the cabin altitude climbs with the aircraft (long needle). Cabin altitude should indicate approximately the same as the barometric altimeter. The cabin rate of climb should indicate the approximate aircraft rate of climb. The PRESS switch may now be moved to DUMP at PIC discretion.',
      ],
      replies: [ip('CHECKED', 'PM')],
    }),
  ],
};

const CRUISE = {
  id: 'cruise',
  title: 'Cruise',
  done: '"CRUISE CHECKLIST COMPLETE" (PM)',
  rows: [
    item('cr1', 'Instruments/Nacelles', 'CHECKED', 'PF, PM', {
      watch: ['Engine Instruments', 'PFD', 'Left Fuel Quantity', 'Right Fuel Quantity'],
      action: INSTRUMENTS_NACELLES,
      replies: [say('CHECKED', 'PF'), ip('CHECKED', 'PM')],
    }),
    item('cr2', 'Altimeters', 'SET', 'PF, PM', {
      action: ['If below FL 180, ensure current altimeter setting (within 100 NM) is set. If FL 180 or above, set STD by depressing the BARO knob center.'],
      replies: [say('SET', 'PF'), ip('SET', 'PM')],
    }),
    item('cr3', 'Pressurization/Oxygen', 'CHECKED', 'PM', {
      action: ['PM checks cabin altitude and differential. Verify proper indications and cabin altitude no higher than 10,000 feet. Ensure oxygen pressure within limits (1,000 psi local, 1,500 psi cross country).'],
      replies: [ip('CHECKED', 'PM')],
    }),
  ],
};

const DESCENT = {
  id: 'descent',
  title: 'Descent',
  done: '"DESCENT CHECKLIST COMPLETE" (PM)',
  rows: [
    item('de1', 'Altimeters', '___.___ SET', 'PF, PM', {
      action: [
        note('Approximately 75 percent N1 (single engine 85 percent N1) is required to maintain the pressurization schedule during descent.'),
        'Set regional altimeter setting (within 100 NM). If still above FL 180, you may leave STD set until descending through FL 180, then set regional altimeter. If proceeding to an uncontrolled field, set the ASOS altimeter setting within 25 NM of the field.',
      ],
      replies: [say('___.___ SET', 'PF'), ip('___.___ SET', 'PM')],
    }),
    abbrev('de2', 'Pressurization', 'SET', 'PM', {
      action: ['PM sets pressurization controller to the destination elevation plus 500 feet (corrected for reported altimeter setting). Refer to NATOPS Figure 2.18-5.'],
      replies: [ip('SET', 'PM')],
    }),
  ],
};

// ---------------------------------------------------------------------------------------
// F109 to F112

const APPROACH = {
  id: 'approach',
  title: 'Approach',
  done: '"APPROACH CHECKLIST COMPLETE" or "ABBREVIATED APPROACH CHECKLIST COMPLETE" (PM)',
  rows: [
    item('ap1', 'Pressurization', 'SET', 'PM', {
      action: ['PM sets pressurization controller to the destination field elevation plus 500 feet (corrected for reported altimeter setting), or verifies the correct setting if previously performed. Refer to NATOPS Figure 2-18-5.'],
      replies: [ip('SET', 'PM')],
    }),
    item('ap2', 'Autofeather', 'ARMED', 'LS', {
      action: ['LS selects AUTO-FEATHER switch to ARMED.'],
      replies: [say('ARMED', 'LS')],
    }),
    item('ap3', 'Prop Sync', 'OFF', 'PF', {
      action: ['PF selects prop sync OFF.', '(PM commences Abbreviated Approach Checklist at Step 4 if appropriate.)'],
      replies: [say('OFF', 'PF')],
    }),
    abbrev('ap4', 'FMS', 'SET', 'PF, PM', {
      action: ['PF directs PM to set appropriate destination and airways in the active FPLN page. PM also loads the current approach for the destination Airport.'],
      replies: [say('SET', 'PF'), ip('SET', 'PM')],
    }),
    abbrev('ap5', 'Radios/NAVAIDs', 'SET', 'PF, PM', {
      action: ['PF directs PM to set all applicable radios and NAVAIDs as required for arrival and approach. Utilize the RTU, CDU TUNE page, and TACAN to ensure all applicable NAVAIDs are set.'],
      replies: [say('SET', 'PF'), ip('SET', 'PM')],
    }),
    abbrev('ap6', 'PFDs/FGP/ESIS', 'SET', 'PF, PM', {
      action: [
        'a. Set PFD display as follows: PF and PM set primary nav source, preset nav source, #1 and #2 bearing pointers as required for the approach.',
        'b. Set FGP as follows: PF sets Course in the left CDI and directs the PM to set HDG, ALT, and Speed as required by the type of approach or to enhance situational awareness.',
        'c. Set ESIS final approach course if applicable.',
      ],
      replies: [say('SET', 'PF'), ip('SET', 'PM')],
    }),
    abbrev('ap7', 'Altimeters', '____.____ SET', 'PF, PM', {
      watch: ['ESIS'],
      action: ['PF and PM set destination altimeter setting in PFDs and ESIS.'],
      replies: [say('___.___ SET', 'PF'), ip('___.___ SET', 'PM')],
    }),
    abbrev('ap8', 'Minimums', '____ SET', 'PF, PM', {
      action: [
        'Sets BARO MIN to appropriate MDA, DH or DA and RA MIN to appropriate HAT or HAA. PF shall display Barometric Altimeter mins and the PM shall display Radar Altimeter minimums. During VFR pattern work, PF shall set the Barometric Altimeter minimums to 500\' above field elevation. PM shall set the Radar Altimeter minimums to 500\'.',
        'The BARO MINS will not display in the Altitude Select window on the PFD unless CPL arrow is selected to the side with BARO MINS selected.',
      ],
      replies: [say('____ SET', 'PF'), ip('____ SET', 'PM')],
    }),
    abbrev('ap9', 'Crew', 'BRIEFED', 'PF', {
      action: [
        'PF briefs PM on the approach and landing in accordance with the NATOPS, FTI, and Typical Briefs and Voice Procedures Appendix. At the completion of the brief, PF asks "Any questions?" PF answers questions and then responds "Briefed." PF ensures crew and passengers are ready for landing.',
        'For VFR arrival, brief course rules or visual arrival. Brief Touch and Go prior to landing.',
        warning('Overriding the landing gear warning horn in the traffic pattern or during final segment of an instrument approach could result in a landing gear-up landing.'),
        note('Cancellation of the wheels warning horn shall be at the direction of the Pilot flying; however, shall not be overridden in the traffic pattern or during the final segment of an instrument approach.'),
      ],
      replies: [say('BRIEFED', 'PF')],
    }),
  ],
};

const LANDING = {
  id: 'landing',
  title: 'Landing',
  done: '"LANDING CHECKLIST COMPLETE" (PM)',
  rows: [
    item('la1', 'Flaps', 'Up/Approach/Down', 'PF, PM', {
      watch: ['Flap Position Indicator'],
      action: ['PF checks that the flap handle and flap indicator agree and reports position. A visual check of flap position is not required unless experiencing a malfunction.'],
      replies: [say('Up/Approach/Down', 'PF'), act('(as required)'), ip('Up/Approach/Down', 'PM')],
    }),
    item('la2', 'Landing Gear', 'DOWN/LOCKED', 'PF, PM', {
      watch: ['Gear Down Lights'],
      action: ['PF waits for all three indicators to turn green and the light in the landing gear handle to go out, then reports "Down/locked." PM verifies three green lights and landing gear handle down with no red light, then responds "Down/locked."'],
      replies: [say('DOWN/LOCKED', 'PF'), ip('DOWN/LOCKED', 'PM')],
    }),
    item('la3', 'Lights', 'SET', 'LS', {
      action: [
        'LS turns on the landing and taxi lights.',
        warning('Overriding the landing gear warning horn in the traffic pattern or during final segment of an instrument approach could result in a gear-up landing.'),
        caution('Engagement of the yaw damp during takeoff or landing may result in severe directional control problems.'),
        'Before landing, ensure the prop levers are placed to the full forward (HIGH RPM) position.',
        note('Under certain meteorological conditions, landing lights may induce vertigo.'),
      ],
      replies: [say('SET', 'LS')],
    }),
  ],
};

const AFTER_LANDING = {
  id: 'after-landing',
  title: 'After Landing',
  done: '"AFTER LANDING CHECKLIST COMPLETE" (PM)',
  rows: [
    item('al1', 'Condition Levers', 'LOW IDLE', 'PF', {
      watch: ['N1'],
      action: [
        'PF slowly places condition levers to LOW IDLE. Whenever moving condition levers to LOW IDLE pinch the levers together to prevent inadvertent FUEL CUTOFF. Observe N1 between 51-54% prior to responding.',
        caution('If low idle stop is worn and/or condition levers are moved rapidly back to low idle, a flameout may occur. Returning the condition lever to low idle immediately or adding power with the power levers can result in an overtemp or explosion. If flameout occurs, execute Emergency Shutdown On Deck Checklist, Paragraph 13.2.'),
      ],
      replies: [say('LOW IDLE', 'PF')],
    }),
    item('al2', 'Transponder', 'STANDBY', 'RS', {
      action: [
        'RS selects transponder to STBY. (as required)',
        note('Busier airports may incorporate ASDE-X and require transponders to remain on for taxi. Consideration should be given to checking appropriate publications for transponder requirements prior to taxiing.'),
      ],
      replies: [ip('STANDBY', 'RS')],
    }),
    item('al3', 'Flaps', 'UP', 'PM', {
      watch: ['Flap Position Indicator'],
      action: ['PM selects flaps UP and/or verifies flaps are UP by checking flap indicator. A visual check of flap position is not required unless experiencing a malfunction.'],
      replies: [ip('UP', 'PM')],
    }),
    item('al4', 'Autoignition', 'OFF', 'PM', {
      action: ['PM secures or verifies auto-ignition is off.'],
      replies: [ip('OFF', 'PM')],
    }),
    item('al5', 'Pressurization', 'CHECKED/DEPRESSURIZED', 'PM', {
      watch: ['Cabin Altitude'],
      action: ['PM checks cabin altitude indicating field elevation (approximately same as barometric altimeter) and differential indicating zero. This ensures the cabin is not pressurized. If cabin is still pressurized, select DUMP.'],
      replies: [ip('CHECKED/DEPRESSURIZED', 'PM')],
    }),
    item('al6', 'Bleed Air Valves', 'CLOSED', 'RS', {
      action: ['RS closes bleed air valves. If PF desires for the valves to remain open, PF briefs PM to leave the valves open. This would only be applicable if taxiing back for takeoff and the cabin door is not to be opened.'],
      replies: [ip('CLOSED', 'RS'), act('(as required)')],
    }),
    item('al7', 'Lights', 'SET', 'LS', {
      action: [
        'LS places the following switches OFF:',
        'a. LEFT and RIGHT LANDING',
        'b. TAXI (leave on if low visibility or night)',
        'c. NAV (leave on if low visibility or night)',
        'd. ICE (turn on in line area to illuminate wingtips at night)',
        'e. STROBE (clear all active runways prior to securing strobes)',
      ],
      replies: [say('SET', 'LS'), act('(as required)')],
    }),
    item('al8', 'Anti-Ice/Deice', 'OFF', 'LS', {
      action: ['LS secures all anti-ice/deice equipment. Leave left and right fuel control heat on if further flight is intended.'],
      replies: [say('OFF', 'LS')],
    }),
  ],
};

const SECURE = {
  id: 'secure',
  title: 'Secure',
  done: '"SECURE CHECKLIST COMPLETE" (PM)',
  rows: [
    abbrev('se1', 'Transfer Pumps', 'OFF', 'LS', { action: ['LS selects both transfer pumps OFF.'], replies: [say('OFF', 'LS')] }),
    item('se2', 'Crossfeed', 'CLOSED', 'LS', { action: ['LS selects crossfeed CLOSED.'], replies: [say('CLOSED', 'LS')] }),
    item('se3', 'Autofeather', 'OFF', 'LS', { action: ['LS selects Auto-feather OFF.'], replies: [say('OFF', 'LS')] }),
    abbrev('se4', 'Fuel Control Heat', 'OFF', 'LS', { action: ['LS selects both fuel control heat switches OFF.'], replies: [say('OFF', 'LS')] }),
    item('se5', 'Trim', 'SET ZERO', 'PM', {
      action: ['PM manually sets elevator, aileron, and rudder trim wheels to zero.'],
      replies: [ip('SET zero', 'PM')],
    }),
    item('se6', 'ESIS', 'OFF', 'PM', {
      action: [
        'PM selects ESIS power button OFF.',
        'PM Checks in with Base "Safe on deck" and contacts Pegasus base for a parking spot.',
        'When reaching the parking spot and lineman gives the "Stop" signal, PF will tell the PM to "continue the checklist."',
      ],
      replies: [ip('OFF', 'PM'), say('Hold the checklist.', 'PF'), say('Continue the checklist.', 'PF')],
    }),
    abbrev('se7', 'Parking Brake', 'SET', 'LS', { action: ['LS pulls brake handle and pumps brake pedals until firm.'], replies: [say('SET', 'LS')] }),
    item('se8', 'AUX BATT/Avionics Master', 'OFF', 'PF', {
      action: ['PF selects AUX BATT and AVIONICS MASTER switches to OFF.'],
      replies: [say('OFF', 'PF')],
    }),
    abbrev('se9', 'Cabin Temperature Mode', 'OFF', 'RS', { action: ['RS selects cabin temperature mode OFF.'], replies: [ip('OFF', 'RS')] }),
    abbrev('se10', 'Vent Blower', 'AUTO', 'RS', { action: ['RS selects vent blower AUTO.'], replies: [ip('AUTO', 'RS')] }),
    abbrev('se11', 'Prop(s)', 'FEATHER', 'PF', {
      watch: ['Prop RPM'],
      action: ['PF ensures both power levers at flight idle then pulls both prop levers into FEATHER and ensures prop RPM immediately starts to decrease. There is no need to wait for the Props to fully feather before continuing the checklist.'],
      replies: [say('FEATHER', 'PF')],
    }),
    abbrev('se12', 'Condition Lever(s)', 'FUEL CUTOFF', 'PF', {
      watch: ['ITT'],
      action: ['PF ensures ITT has been below 650 °C for at least 1 minute. PF places both hands on condition levers and selects FUEL CUTOFF. PF notes ITT decrease and monitors engine instruments for a normal shutdown.'],
      replies: [say('FUEL CUTOFF', 'PF')],
    }),
    item('se13', 'Boost Pumps', 'OFF', 'LS', { action: ['LS selects both boost pumps OFF.'], replies: [say('OFF', 'LS')] }),
    item('se14', 'Fuel Quantity (Current Limiters)', 'CHECKED', 'LS', {
      watch: ['Left Fuel Quantity', 'Right Fuel Quantity'],
      action: ['LS notes normal indication on left and right fuel quantity indicators. If either indicator reads zero, a current limiter is blown.'],
      replies: [say('CHECKED', 'LS')],
    }),
    item('se15', 'Oxygen', 'CLOSED', 'PM', {
      action: ['Push Oxygen Push/Pull knob and release pressure by placing diluter control lever on the mask regulator in the "EMER" position until O2 hose indicator is red. Then set diluter control lever back to "100%."'],
      replies: [ip('CLOSED', 'PM')],
    }),
    item('se16', 'Lights', 'OFF', 'LS', {
      watch: ['Left Landing Light', 'Right Landing Light', 'Taxi Light', 'Ice Light', 'Strobe'],
      watchOnly: true,
      action: ['Turn off all interior and exterior lights except NAV (if required) and BEACON. Turn NAV (if required) and BEACON off once prop rotation has stopped. Return all rheostats to the full counter-clockwise position. Turn OFF both utility lights and return them to the overhead receptacle.'],
      replies: [say('OFF', 'LS')],
    }),
    item('se17', 'Gangbar', 'OFF', 'LS', { replies: [say('OFF', 'LS')] }),
    item('se18', 'Control Lock', 'INSTALLED', 'LS', {
      action: [
        'LS installs control lock. Ensure chain is not tangled, then:',
        'a. Place guard around engine prop controls, open side facing aft.',
        'b. Pull control wheel aft until hole is visible in tube. Push control wheel forward approximately 2 inches until hole in the tube and hole in column are lined up. Slide pin into top hole. Route chain around left side of column.',
        'c. Adjust rudder pedals fully aft. Displace left pedal slightly Forward and slide metal rod into cylinder on right pedal. Push rod into cylinder enough to allow clearance to move Left pedal back to original position. Slide rod into cylinder on left pedal.',
      ],
      replies: [say('INSTALLED', 'LS'), act('(as required)')],
    }),
    item('se19', 'Wheels', 'CHOCKED', 'LS', { replies: [say('CHOCKED', 'LS')] }),
    item('se20', 'Parking Brake', 'RELEASED', 'LS', {
      action: ['Release the parking brake upon receiving confirmation that the wheels are chocked. Consideration should be given to keeping the parking brake set if parked on an icy or inclined ramp and/or prop wash/jet blast are present.'],
      replies: [say('RELEASED', 'LS'), act('(as required)')],
    }),
  ],
};

// ---------------------------------------------------------------------------------------
// Memory items that are not EPs

// NATOPS §7.18. Not an emergency procedure, so it is not on the EP sheet, but every step is
// asterisked.
const WAVEOFF = {
  id: 'waveoff',
  title: 'Waveoff/Missed Approach',
  normal: true,
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
  normal: true,
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
// the Before Takeoff Checklist whose item 6 calls for it. Read, not typed: see EPDrill `read`.
export const T44C_HOLLYWOOD = [
  BEFORE_START, START_RIGHT, START_LEFT, AFTER_START, ENGINE_RUNUP, BEFORE_TAKEOFF,
  ANTI_ICE_CHECK, CLIMB, CRUISE, DESCENT, APPROACH, LANDING, AFTER_LANDING, SECURE,
];

// The normal procedures the publications say are done from memory, typed like the EPs. The EPs
// page adds them to the EPs when its "All Memory Procedures" button is on.
export const T44C_MEMORY_NORMALS = [START_RIGHT, START_LEFT, ANTI_ICE_CHECK, WAVEOFF, PRE_STALL];
