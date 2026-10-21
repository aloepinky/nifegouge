// The T-54A's normal procedures for EPDrill. Pure data, no JSX, in the shape T44C/t44cNormals.js
// uses (see its header for every row field: challenge, reply, who, abbrev, num, action, replies,
// watch).
//
// The T-54A publishes its normals in two kinds, and NATOPS §7.2 keeps them apart: FLOWS are
// "executed from memory", laid out as a table by seat or crew position with the crew callouts in
// bold quotes; CHECKLISTS are "executed as a challenge-verification-response", read off. So they
// are two lists here and two sets on the page:
//
//   T54A_FLOWS        typed like the EPs, every step asterisked as performed from memory. The
//                     EPs page also adds them to the EPs when "Include Flows" is on.
//   T54A_CHECKLISTS   read, as the T-44C's Hollywood is: the lines are printed and a step is done
//                     by clicking its control. Never asterisked.
//
// A flow row is one line of the flow table, numbered as its own column numbers it (`num`), with
// the column it sits in as `who`: LS and RS, or PF and PM for the tables NATOPS splits that way.
// The LS column runs first and then the RS column, except in the Engine Start Flow, whose table
// sets each RS line against the LS line it goes with (RS 1 by LS 1, RS 2 by LS 2, RS 3 by LS 11),
// so there they interleave. `action` is the step's expanded flow (§7.x.x.1 and .2): its lettered
// sub-steps and NWCs, WARNING and CAUTION read off the rendered page. `replies` are the bold
// callouts printed under the step. A checklist row's `action` is the lettered sub-steps the
// checklist itself prints, where it prints any.
//
// `watch` lists the indications a step's expanded flow says to verify, check or monitor, where
// the poster draws them (T54A/t54aPoster.js): the MFD engine strip one gauge at a time, the CAS
// window, the vacuum and pneumatic gauges, the master warning lights and the fire push buttons.
// What the poster does not draw is never watched: IGN and AFX on the EICAS, the PFD clock, the
// battery ammeter and DC volt/loadmeters, aural tones and voice alerts.
//
// Source: NATOPS A1-T54A-NFM-000 Ch. 7 (15 NOV 2025, IC 04), §7.5 to §7.21, every table read from
// the rendered page. The pocket checklist (A1-T54A-NFM-500) prints no normal flows or checklists,
// only the GPU start and ECS configurations, and the FTI's Ch. 4 restates NATOPS without
// changing a line, so there is nothing to rule between. Two layout readings, each keeping the
// publication's words:
//   * the Go-Around/Missed Approach Procedure's step 4, "Left Seat (LS) selects Landing Gear UP",
//     is the step `Landing Gear - UP` with LS as its crewmember, and its closing "Verify landing
//     gear UP and lights out" a line under step 5;
//   * a step with no setting (`Verify Propellers Clear`, `Build the approach`) is answered with
//     the line alone.
// Left out: the GPU Start Procedure (§7.6.3, read challenge-response-response, and a variant of
// the start), the 10,000 Foot Actions chart (§7.13) and the ECS configurations (§7.7.5), which are
// reference tables rather than steps.

const item = (id, challenge, reply, who, extra = {}) => ({
  id, challenge, reply, text: reply ? `${challenge} - ${reply}` : challenge, who, ...extra,
});
const abbrev = (id, challenge, reply, who, extra = {}) => item(id, challenge, reply, who, { abbrev: true, ...extra });
// A flow line: from memory, numbered as its own column numbers it.
const flow = (id, num, challenge, reply, who, extra = {}) => item(id, challenge, reply, who, { critical: true, num, ...extra });

const say = (text, who) => ({ text, who });
const caution = (text) => ({ caution: text });
const warning = (text) => ({ warning: text });
const note = (text) => ({ note: text });
const trigger = (text) => ({ note: `Trigger: ${text}` });

// The pieces of the starter steps both engines repeat.
const STARTER_NOTE = note('The starters are limited to an operating period of 40 seconds on, 60 seconds off for two cycles; then 40 seconds on, 30 minutes off on the third.');
const HOT_START = caution('Introduction of fuel with max motoring below 15% may lead to a hot start (820-850 °C for 20 seconds, 850-1000 °C for 5 seconds or greater than 1000 °C for any amount of time).');
const ANTI_ICE_CAUTIONS = [
  caution('Failure to activate engine anti-ice during operations in ambient temperatures of 5 °C or below with visible moisture is present may result in abnormal engine operation.'),
  caution('Consideration should be given to turning on windshield anti-ice prior to flight into temperatures below 5 °C. Activating the system on a cold-soaked windshield may result in cracked windshield.'),
];
const FUEL_CUTOFF_CAUTION = caution('During ground operation and after the engine is started, if the condition lever is inadvertently moved to FUEL CUTOFF, attempting to relight the engine by moving the condition lever to LOW IDLE may result in severe engine damage.');
const PROP_RPM_NOTE = note('Moving the condition lever to high idle prior to prop RPM reaching 1,180 is permissible and may be necessary in order to reach 1,180 RPM.');

// ---------------------------------------------------------------------------------------
// Flows

// §7.5.1, p. 7.5-1
const BEFORE_START_FLOW = {
  id: 'f-before-start',
  title: 'Before Start Flow',
  normal: true,
  done: '"Before Start Checklist" (LS)',
  rows: [
    trigger('Cabin Door is closed and the PREFLIGHT INSPECTION is complete'),
    flow('fbs1', 1, 'Battery', 'Verify ON', 'LS'),
    flow('fbs2', 2, 'Lights', 'Set', 'LS', { action: ['a. Turn on beacon and navigation lights.'] }),
    flow('fbs3', 3, 'Power Quadrant', 'Set', 'LS', {
      watch: ['Condition Levers', 'Prop Levers', 'POWER levers'],
      action: [
        'a. Condition Levers — Fuel Cutoff, friction set.',
        'b. Prop Levers — Full Forward, friction set.',
        'c. Power Levers — Idle, friction set as required.',
        caution('Power Levers should not be moved into the GND FINE or REVERSE positions when the engines are not running as this will cause damage to the system.'),
        note('Ensure the Autothrottle self-test is complete prior to setting friction on the Power Levers.'),
      ],
    }),
    flow('fbs4', 1, 'Cabin Door', 'CAS message removed', 'RS', { watch: ['CAS Messages'] }),
    flow('fbs5', 2, 'Engine Fire Test', 'Checked', 'RS', {
      watch: ['Master Warning', 'ITT', 'Fire Extinguisher', 'CAS Messages'],
      action: [
        'a. Left Eng Fire Test switch — DET.',
        '(1) Both red MASTER WARNING lights illuminated. (2) Master Warning tone. (3) L Engine Fire CAS message illuminates. (4) FIRE indication over Left ITT. (5) Voice alerts sounds. (6) ENG FIRE PUSH TO EXT light illuminates.',
        'b. Left Eng Fire Test switch — EXT.',
        '(1) Amber DISCH and green OK elements illuminates on ENG FIRE EXTINGUISHER switch.',
        'c. Right Eng Fire Test switch — DET.',
        '(1) Both Red MASTER WARNING lights illuminated. (2) Master Warning tone. (3) R Engine Fire CAS message illuminates. (4) FIRE indication over Right ITT. (5) Voice alerts sounds. (6) ENG FIRE PUSH TO EXT light illuminates.',
        'd. Right Eng Fire Test switch — EXT.',
        '(1) Amber DISCH and green OK elements illuminates on ENG FIRE EXTINGUISHER switch.',
      ],
    }),
  ],
};

// §7.6.1, pp. 7.6-1 to 7.6-4. When making a battery start, the right engine is started first.
const ENGINE_START_FLOW = {
  id: 'f-engine-start',
  title: 'Engine Start Flow',
  normal: true,
  rows: [
    trigger('By direction of the Pilot in Command'),
    flow('fes1', 1, 'Verify Propellers Clear', 'Signal Lineman', 'LS'),
    flow('fes2', 1, 'Verify Propellers Clear', '', 'RS'),
    flow('fes3', 2, 'IGNITION and ENGINE START', 'Right ON', 'LS', {
      watch: ['CAS Messages', 'N1'],
      action: [
        'a. R IGN displayed, R Fuel Press CAS message removed.',
        'b. Clock — Start.',
        STARTER_NOTE,
        'c. Verify rotation with N1 (13% N1 or above) and prop spinning.',
      ],
      replies: [say('Ignition', 'LS')],
    }),
    flow('fes4', 2, 'Right Engine Instruments', 'Monitor', 'RS'),
    flow('fes5', 3, 'Right Condition Lever', 'Low Idle', 'LS', {
      watch: ['Fuel Flow'],
      action: [
        'Right Condition Lever (max motoring – 13% N1 min) — LOW IDLE.',
        HOT_START,
        'a. Verify Fuel Flow indicated.',
        caution('Reintroduction of fuel into a hot engine (ITT 200 °C or greater) will result in engine damage.'),
        note('An abnormal hot start is less likely to occur if ITT is permitted to decrease below 180 °C before fuel is reintroduced.'),
      ],
    }),
    flow('fes6', 4, 'Right ITT and N1', 'Monitor', 'LS', {
      watch: ['ITT', 'N1'],
      action: ['Right ITT and N1 — Monitor (1,000 °C maximum).', 'a. Verify Lightoff with ITT increase.'],
      replies: [say('Lightoff', 'LS')],
    }),
    flow('fes7', 5, 'Right Oil Pressure', 'Check', 'LS', { action: ['a. Oil pressure should be indicated and rising.'] }),
    flow('fes8', 6, 'IGNITION and ENGINE START', 'Right OFF', 'LS', {
      watch: ['N1'],
      action: ['IGNITION and ENGINE START switch (50% N1 or above) — Right OFF.', 'a. Verify R IGN removed.', 'b. Stop clock.'],
      replies: [say('Starter OFF, Light Out', 'LS')],
    }),
    flow('fes9', 7, 'Right Engine Instruments', 'Checked', 'LS', {
      watch: ['ITT', 'Prop RPM', 'Oil Pressure', 'Oil Temperature'],
      action: ['a. ITT — 750 °C (Max).', 'b. Prop RPM — 1,180 (Min).', PROP_RPM_NOTE, 'c. Oil pressure — 60 psi (Min).', 'd. Oil temperature — –40 to 110 °C.'],
    }),
    flow('fes10', 8, 'Right Condition Lever', 'High Idle', 'LS', {
      watch: ['N1', 'Oil Temperature'],
      action: ['a. Verify N1 minimum 69%.', 'b. Verify oil temperature — –40 to 110 °C.'],
    }),
    flow('fes11', 9, 'Right Generator', 'RESET, then ON', 'LS', {
      watch: ['CAS Messages'],
      action: ['a. R DC Generator CAS message removed.', 'b. L DC Generator CAS message illuminated.'],
    }),
    flow('fes12', 10, 'Battery Ammeter/Loadmeter', 'Check', 'LS', { action: ['a. Verify battery is charging and loadmeter below 50%.'] }),
    flow('fes13', 11, 'IGNITION and ENGINE START', 'Left ON', 'LS', {
      watch: ['CAS Messages', 'N1'],
      action: [
        'a. L IGN DISPLAYED, L Fuel Press CAS message removed.',
        'b. Clock — Start.',
        STARTER_NOTE,
        'c. Verify rotation with N1 (13% N1 or above) and prop spinning.',
      ],
      replies: [say('Ignition', 'LS')],
    }),
    flow('fes14', 3, 'Left Engine Instruments', 'Monitor', 'RS'),
    flow('fes15', 12, 'Left Condition Lever', 'Low Idle', 'LS', {
      watch: ['Fuel Flow'],
      action: [
        'Left Condition Lever (max motoring – 13% N1 min) — LOW IDLE.',
        HOT_START,
        'a. Verify fuel flow.',
        note('Residual ITT above 200 °C may result in a hot start and ITT exceedance. Consideration should be given to either conducting an Engine Clearing Procedure or delay moving the Condition Lever to LOW IDLE until residual ITT is below 180 °C.'),
      ],
    }),
    flow('fes16', 13, 'Left ITT and N1', 'Monitor', 'LS', {
      watch: ['ITT', 'N1'],
      action: ['Left ITT and N1 — MONITOR (1,000 °C maximum).', 'a. Verify lightoff.'],
      replies: [say('Lightoff', 'LS')],
    }),
    flow('fes17', 14, 'Left Oil Pressure', 'Check', 'LS', { action: ['a. Oil pressure should be indicated and rising.'] }),
    flow('fes18', 15, 'IGNITION and ENGINE START', 'Left OFF', 'LS', {
      watch: ['N1'],
      action: ['IGNITION and ENGINE START switch (50% N1 or above) — Left OFF.', 'a. Verify L IGN removed.', 'b. Stop clock.'],
      replies: [say('Starter OFF, Light Out', 'LS')],
    }),
    flow('fes19', 16, 'Left Engine Instruments', 'Checked', 'LS', {
      watch: ['ITT', 'Prop RPM', 'Oil Pressure', 'Oil Temperature'],
      action: ['a. ITT — 750 °C (Max).', 'b. Prop RPM — 1,180 (Min).', PROP_RPM_NOTE, 'c. Oil Pressure — 60 psi (Min).', 'd. Oil Temperature — –40 to 110 °C.'],
    }),
    flow('fes20', 17, 'Left Condition Lever', 'High Idle', 'LS', {
      watch: ['N1', 'Oil Temperature'],
      action: ['a. Verify N1 minimum 69%.', 'b. Verify oil temp — -40 to 110 °C.'],
    }),
    flow('fes21', 18, 'Left and Right Condition Levers', 'Low Idle', 'LS', { action: [FUEL_CUTOFF_CAUTION] }),
    flow('fes22', 19, 'DC Volt/Loadmeters', 'Check', 'LS', {
      action: ['a. Check generator voltages read 27.5 – 29 volts.', note('24 volts or less may be indicative of a blown current limiter.')],
    }),
    flow('fes23', 20, 'Left Generator', 'RESET, then ON', 'LS', {
      watch: ['CAS Messages'],
      action: ['a. L DC Generator CAS messaged removed.', 'b. Check generator loads within 10% of each other.'],
    }),
  ],
};

// §7.7.1, pp. 7.7-1 to 7.7-4
const BEFORE_TAXI_FLOW = {
  id: 'f-before-taxi',
  title: 'Before Taxi Flow',
  normal: true,
  done: '"Before Taxi Checklist" (LS)',
  rows: [
    trigger('After both engines are online and all indications are normal'),
    flow('fbt1', 1, 'Avionics Master', 'ON', 'LS', {
      action: [note('Wait for alignment prior to taxiing the aircraft. The pilot should cross-check the compass heading on the displays against the standby magnetic compass to make sure the headings agree.')],
    }),
    flow('fbt2', 2, 'Flight Controls', 'Checked', 'LS', { action: ['a. Check freedom of movement of the ailerons, elevator, and rudder.'] }),
    flow('fbt3', 3, 'Flaps', 'Checked', 'LS', {
      watch: ['Flap Indicator'],
      action: [
        'a. Select flaps DN, compare flap indication to lineman signal.',
        'b. Select flaps APP, compare flap indication to lineman signal.',
        'c. Select flaps UP, compare flap indication to lineman signal.',
      ],
    }),
    flow('fbt4', 4, 'Anti-ice/De-ice', 'Checked, as required', 'LS', {
      watch: ['CAS Messages'],
      action: [
        'A full Anti-ice/Deice check shall be conducted if flying through known or forecasted icing conditions.',
        note('Minimum anti-ice/deice checks include engine anti-ice, stall warning heat, pitot heat, and fuel vent heat.'),
        'a. Engine Anti-ice — Check. (1) Engine Anti-ice Actuators — STANDBY. (2) Engine Anti-ice — ON (L-R Eng Anti-Ice CAS message displayed). (3) Engine Anti-ice Actuators — MAIN. (4) Engine Anti-ice — OFF (L-R Eng Anti-Ice CAS message removed). (5) Engine Anti-ice — As required.',
        note('Either the MAIN or STANDBY actuator shall be operational on each engine before takeoff.'),
        'b. Pitot Heat — Checked. (1) Pitot Heat — ON then OFF (L-R Pitot Heat CAS message removed, then displayed).',
        caution('Prolonged use of pitot heat on the ground will damage the heating elements.'),
        'c. Ice Protection Equipment (if required) — Checked. (1) Electrothermal Prop Deice — Check.',
        caution('Operating propeller deice when the propellers are static may cause damage to the slip rings.'),
        '(a) Automatic Prop Deice — AUTO. (b) Deice Ammeter — 18 to 24 amps. Monitor for 180 seconds to ensure automatic timer operation. (c) Manual Prop Deice — Hold in MANUAL. Small deflection on both loadmeters indicates the manual system is operating. 1) Deice Ammeter — 0 AMPS. (d) Manual Prop Deice — Release. (e) Deice Ammeter — 18 to 24 amps. (f) Automatic Prop Deice — OFF.',
        note('Electrical current for the manual (backup) system is not registered on the propeller deice ammeter; however, it will be indicated as part of the airplane’s load on the loadmeters (small needle deflection) when the system is switched on.'),
        '(2) Surface Deice System — Check. (a) Pneumatic Pressure — Check. (b) Surface Deice Switch — SINGLE and release. Pneumatic Pressure — Will Decrease Momentarily. Check boots visually, where possible, for inflation and deflation. Inflation time is 6 seconds for wings, 4 seconds for horizontal stabilizer. (c) Surface Deice Switch — MANUAL and hold. Pneumatic Pressure — Will Decrease Momentarily. Check boots visually, where possible, for inflation. (d) Surface Deice Switch — Release. Check boots visually, where possible, for deflation.',
      ],
    }),
    flow('fbt5', 5, 'TCAS/Transponder', 'Checked, Set', 'LS', {
      action: [
        'a. Tuning Page — XPR/TFC — TEST.',
        '(1) The aural message “TCAS SYSTEM TEST OK” will be heard over the speakers and headsets at the conclusion of a successful test.',
        'b. Set aircraft ID as required.',
      ],
    }),
    flow('fbt6', 6, 'TAWS', 'Checked', 'LS', {
      action: [note('TAWS cannot be tested in flight.'), 'a. Select PFD on CCP.', 'b. Select Menu on CCP.', 'c. Select TAWS on dropdown.', 'd. Select test function.'],
    }),
    flow('fbt7', 7, 'SDU', 'Aligned', 'LS', { action: ['a. Ensure initialization is complete prior to taxiing.'] }),
    flow('fbt8', 8, 'Seatbelt', 'Fastened', 'LS'),
    flow('fbt9', 9, 'Beacon', 'Cycled, ON', 'LS', { action: ['Beacon — OFF momentarily then ON.'] }),
    flow('fbt10', 1, 'Environmental System', 'Set', 'RS', { action: ['a. Observe N1, ITT, and generator limits if air conditioning is used.'] }),
    flow('fbt11', 2, 'Flight Controls', 'Checked', 'RS', { action: ['a. Check freedom of movement of the ailerons, elevator, and rudder.'] }),
    flow('fbt12', 3, 'Vacuum and Pneumatic Pressure', 'Checked', 'RS', {
      watch: ['Bleed Air Valves', 'Vacuum', 'Pneumatic Pressure', 'CAS Messages'],
      action: [
        'a. Left and Right Bleed Air Valve — OPEN.',
        'b. Left Bleed Air Valve — PNEU and ENVIR OFF (L Bleed Air Off CAS message displayed).',
        'c. Vacuum Gauge and Pneumatic Pressure Gauge — GREEN ARC.',
        'd. Right Bleed Air Valve — PNEU and ENVIR OFF (L-R Bleed Air Off CAS message and L-R Bl Air Fail CAS message displayed).',
        'e. Vacuum Gauge and Pneumatic Pressure Gauge — ZERO.',
        'f. Left Bleed Air Valve — OPEN (L Bleed Air Off and L-R Bl Air Fail CAS message removed, R Bleed Air Off CAS message displayed).',
        'g. Vacuum Gauge and Pneumatic Pressure Gauge — GREEN ARC.',
        'h. Right Bleed Air Valve — OPEN (R Bleed Air Off CAS message removed).',
        'i. Bleed Air Valves — As required.',
      ],
    }),
    flow('fbt13', 4, 'ATIS', 'As required', 'RS'),
    flow('fbt14', 5, 'Seatbelt', 'Fastened', 'RS'),
  ],
};

// §7.8.1, p. 7.8-1
const TAXI_FLOW = {
  id: 'f-taxi',
  title: 'Taxi Flow',
  normal: true,
  rows: [
    trigger('When leaving the line area.'),
    flow('ftx1', 1, 'Lights', 'As required', 'LS', { action: ['a. The taxi light should be on during all taxi operations while the aircraft is moving.'] }),
    flow('ftx2', 2, 'Brakes', 'Check', 'LS'),
    flow('ftx3', 1, 'Brakes', 'Check', 'RS'),
  ],
};

// §7.10.2, pp. 7.10-3 to 7.10-4. The table's last two lines are the Pilot Flying's.
const LINEUP_FLOW = {
  id: 'f-lineup',
  title: 'Lineup Flow',
  normal: true,
  done: '"Lineup Checklist" (PF)',
  rows: [
    trigger('After cleared onto the active runway'),
    flow('flu1', 1, 'Autoignition', 'ARM', 'LS', { action: ['a. IGN Left and IGN Right displayed.'] }),
    flow('flu2', 2, 'Anti-Ice/De-Ice', 'Set', 'LS', {
      action: [
        'a. Stall Warning Heat — ON.',
        'b. Left and Right Pitot Heat — ON (L-R Pitot Heat CAS message removed).',
        'c. Left and Right Fuel Vent Heat — ON.',
        'd. Windshield Anti-ice — NORMAL.',
        'e. Prop De-ice — As required.',
        'f. Engine Anti-ice — As required (L-R Eng Anti-ice CAS message displayed if on).',
      ],
    }),
    flow('flu3', 3, 'Lights', 'Set', 'LS', { action: ['a. Turn on landing, taxi, strobe, and recognition lights.'] }),
    flow('flu4', 1, 'Bleed Air Valves', 'OPEN', 'RS'),
    flow('flu5', 2, 'Envir Bleed Air switch', 'As required', 'RS', {
      action: ['a. Select AUTO or LOW if OAT is greater than 10 °C.', 'b. Select AUTO or NORMAL if OAT is at or below 10 °C.'],
    }),
    flow('flu6', 4, 'Autothrottles', 'As required', 'PF', { action: ['a. A/T Power — Press once for A/T TAKEOFF or press twice for A/T OFF TAKEOFF.'] }),
    flow('flu7', 5, 'Condition Levers', 'HIGH IDLE', 'PF'),
  ],
};

// §7.12.1, pp. 7.12-1 to 7.12-2
const CLIMB_FLOW = {
  id: 'f-climb',
  title: 'Climb Flow',
  normal: true,
  done: '"Climb Checklist" (LS)',
  rows: [
    trigger('Landing Gear is up and passing 1,000 feet AGL.'),
    flow('fcl1', 1, 'Lights', 'Set', 'LS', { action: ['a. Turn off the Landing and Taxi lights.'] }),
    flow('fcl2', 2, 'Power', 'As required', 'LS'),
    flow('fcl3', 3, 'Props', 'As required', 'LS', { action: [note('Climb performance charts reflect maximum continuous power or 1800 rpm.')] }),
    flow('fcl4', 4, 'Anti-Ice/De-Ice', 'As required', 'LS', { action: ANTI_ICE_CAUTIONS }),
    flow('fcl5', 5, 'Engine Instruments', 'Checked', 'LS', { action: ['a. Verify normal engine indications.'] }),
    flow('fcl6', 1, 'Engine Instruments', 'Checked', 'RS', { action: ['a. Verify normal engine indications.'] }),
  ],
};

// §7.14.1, p. 7.14-1
const CRUISE_FLOW = {
  id: 'f-cruise',
  title: 'Cruise Flow',
  normal: true,
  done: '"Cruise Checklist" (PF)',
  rows: [
    trigger('Level off at cruise altitude.'),
    flow('fcr1', 1, 'Power', 'Set', 'PF', { action: [note('Refer to cruise charts in Chapter 30 for flight planning and cruise power settings.')] }),
    flow('fcr2', 2, 'Props', 'Set', 'PF', { action: ['a. Set either 1700 or 1800 RPM at PIC discretion.'] }),
    flow('fcr3', 3, 'Engine Instruments/Fuel Quantity', 'Checked', 'PF', {
      watch: ['Fuel Quantity'],
      action: ['a. Verify normal engine indications.', 'b. Check fuel quantity.'],
    }),
    flow('fcr4', 4, 'Altimeters', '___.___ Set', 'PF'),
    flow('fcr5', 1, 'Pressurization', 'Checked', 'PM', {
      action: [note('During high altitude operations or with High Elevation mode active, cabin altitude may exceed 10,000 feet without any flight crew alert.')],
    }),
    flow('fcr6', 2, 'Engine Instruments/Fuel Quantity', 'Checked', 'PM', {
      watch: ['Fuel Quantity'],
      action: ['a. Verify normal engine indications.', 'b. Check fuel quantity.'],
    }),
    flow('fcr7', 3, 'Altimeters', '___.___ Set', 'PM'),
  ],
};

// §7.15.1, p. 7.15-1
const DESCENT_FLOW = {
  id: 'f-descent',
  title: 'Descent Flow',
  normal: true,
  done: '"Descent Checklist" (PF)',
  rows: [
    trigger('Upon receiving a decent clearance below FL180 or upon initial descent from cruise altitude if lower.'),
    flow('fde1', 1, 'Altimeters', '___.___ Set', 'PF'),
    flow('fde2', 2, 'Anti-Ice/De-Ice', 'As required', 'PF', { action: ANTI_ICE_CAUTIONS }),
    flow('fde3', 1, 'Altimeters', '___.___ Set', 'PM'),
  ],
};

// §7.16, pp. 7.16-1 to 7.16-2
const APPROACH_FLOW = {
  id: 'f-approach',
  title: 'Approach Flow',
  normal: true,
  done: '"Approach Checklist" (PF)',
  rows: [
    trigger('Obtain ATIS.'),
    flow('fap1', 1, 'Build the approach.', '', 'PF', {
      action: [
        'a. Set applicable NAVAIDs, radios, and inbound course.',
        'b. Load the approach in the FMS if required.',
        note('Failure to select an approach from the FMS will cause undesirable TAWS alerts and will not program the pressurization controller with landing airfield information.'),
        'c. Set Baro/Radio minimums for the approach.',
        'd. Check and set VREF.',
        'e. TAWS — As required.',
        'f. Determine target speed.',
      ],
    }),
    flow('fap2', 2, 'Brief the approach.', '', 'PF'),
    flow('fap3', 1, 'Build the approach.', '', 'PM', {
      action: [
        'a. Set applicable NAVAIDs, radios, and inbound course.',
        'b. Load the approach in the FMS if required.',
        'c. Set Baro/Radio minimums for the approach.',
        'd. Check and set VREF.',
        'e. Determine target speed.',
      ],
    }),
    flow('fap4', 2, 'Pressurization', 'Checked, Set', 'PM', {
      action: [
        'a. Check landing destination airfield altitude, set as required.',
        caution('If the pilot changes to a landing destination at a different airfield altitude, the cabin may require depressurization using the cabin press switch before landing.'),
      ],
    }),
  ],
};

// §7.19.1, p. 7.19-1. One table: the call, then the PF and PM columns in time order, with the
// two conditions it is printed against as its decision lines.
const GO_AROUND = {
  id: 'f-go-around',
  title: 'Go-Around/Missed Approach Procedure',
  normal: true,
  rows: [
    trigger('Anytime a go-around is called.'),
    flow('fga1', 1, 'Go-Around', '', 'PF, PM', {
      action: [warning('Raising the landing gear with a rate of descent may result in a gear-up landing.')],
      replies: [say('Go-Around.')],
    }),
    flow('fga2', 2, 'Power', 'As required', 'PF', { replies: [say('Flaps Approach', 'PF')] }),
    flow('fga3', 3, 'Flaps', 'APPROACH (Unless already UP)', 'PM', { replies: [say('Flaps Approach', 'PM')] }),
    { decision: '0 VSI or greater' },
    flow('fga4', 4, 'Landing Gear', 'UP', 'LS', {
      action: ['Left Seat (LS) selects Landing Gear UP.'],
      replies: [say('Gear Up', 'PF'), say('Gear Up', 'PM')],
    }),
    { decision: 'Above VYSE' },
    flow('fga5', 5, 'Flaps', 'UP', 'PM', { replies: [say('Flaps Up', 'PF'), say('Flaps Up', 'PM')] }),
    { note: 'Verify landing gear UP and lights out. (PM)' },
  ],
};

// §7.20.1, pp. 7.20-1 to 7.20-2. Four groups: PF, PM, LS, RS.
const AFTER_LANDING_FLOW = {
  id: 'f-after-landing',
  title: 'After Landing Flow',
  normal: true,
  done: '"After Landing Checklist" (PF)',
  rows: [
    trigger('Once clear of the active runway.'),
    flow('fal1', 1, 'Condition Levers', 'Low Idle', 'PF', { action: [caution('During ground operation and after the engine is started, if the condition lever is inadvertently moved to FUEL CUTOFF, do not attempt to relight the engine by moving the condition lever to LOW IDLE or severe engine damage may occur.')] }),
    flow('fal2', 1, 'Pressurization', 'Checked Depressurized', 'PM'),
    flow('fal3', 2, 'Flaps', 'UP', 'PM'),
    flow('fal4', 3, 'Trim', 'Set', 'PM', { action: ['a. Set for takeoff or for engine shutdown.'] }),
    flow('fal5', 1, 'Autoignition', 'Off', 'LS'),
    flow('fal6', 2, 'Anti-Ice/De-Ice', 'Set', 'LS'),
    flow('fal7', 3, 'Lights', 'Set', 'LS', { action: ['a. Turn off landing, strobe, and recognition lights.'] }),
    flow('fal8', 1, 'Bleed Air Valves', 'ENVIR OFF', 'RS', { action: [note('L-R Bleed Air Off CAS message displayed if ENVIR OFF.')] }),
  ],
};

// §7.21.1, pp. 7.21-1 to 7.21-2
const SECURE_FLOW = {
  id: 'f-secure',
  title: 'Secure Flow',
  normal: true,
  done: '"Secure Checklist" (LS)',
  rows: [
    trigger('Once Parking Brake is Set'),
    flow('fse1', 1, 'Crossfeed', 'OFF', 'LS', { action: ['a. If the Standby Boost Pumps were used in flight, secure them during this step.'] }),
    flow('fse2', 2, 'Avionics Master', 'OFF', 'LS'),
    flow('fse3', 3, 'SDU', 'OFF', 'LS'),
    flow('fse4', 4, 'Autofeather', 'OFF', 'LS'),
    flow('fse5', 5, 'Condition Lever(s)', 'FUEL CUTOFF', 'LS', {
      watch: ['ITT', 'N1'],
      action: [
        'a. Ensure ITT is stabilized for 1 minute prior to selecting FUEL CUTOFF.',
        'b. Monitor ITT and N1 for normal indications during shutdown.',
        'c. If ITT fails to decrease, refer to the Engine Clearing procedure.',
        caution('Failure to conduct Engine Clearing procedure may result in engine damage.'),
      ],
    }),
    flow('fse6', 1, 'ECS Mode', 'Off', 'RS', { action: ['a. Cockpit/Cabin Blower — Auto.'] }),
  ],
};

// ---------------------------------------------------------------------------------------
// Checklists

// §7.5.2, p. 7.5-2
const BEFORE_START_CHECKLIST = {
  id: 'c-before-start',
  title: 'Before Start Checklist',
  done: '"BEFORE START CHECKLIST COMPLETE."',
  rows: [
    item('cbs1', 'SDU', 'Checked, On', 'LS'),
    item('cbs2', 'Parking Brake', 'Set', 'LS'),
    item('cbs3', 'Lights', 'Set', 'LS'),
    item('cbs4', 'Fuel Panel', 'Checked, Auto', 'LS'),
    item('cbs5', 'Power Quadrant', 'Set', 'LS'),
    item('cbs6', 'Oxygen', 'Open, 100%', 'LS'),
    item('cbs7', 'Engine Fire Test', 'Checked', 'RS'),
    item('cbs8', 'Cabin Door', 'Locked, light out', 'RS'),
  ],
};

// §7.7.4, p. 7.7-4
const BEFORE_TAXI_CHECKLIST = {
  id: 'c-before-taxi',
  title: 'Before Taxi Checklist',
  done: '"BEFORE TAXI CHECKLIST COMPLETE."',
  rows: [
    item('cbt1', 'DC Volt/Loadmeters', 'Checked', 'LS'),
    item('cbt2', 'Avionics Master', 'ON', 'LS'),
    item('cbt3', 'HIGH IDLE', 'Checked', 'LS'),
    item('cbt4', 'Anti-Ice/De-Ice', 'Checked, as required', 'LS'),
    item('cbt5', 'TCAS/Transponder', 'Checked/Set', 'LS'),
    item('cbt6', 'TAWS', 'Checked', 'LS'),
    item('cbt7', 'Controls', 'Checked', 'LS, RS'),
    item('cbt8', 'Vacuum and Pneumatic Pressure', 'Checked', 'RS'),
    item('cbt9', 'ECS', 'Set', 'RS'),
    item('cbt10', 'Seatbelt', 'Fastened', 'LS, RS, OBS'),
    item('cbt11', 'Beacon', 'Cycled, ON', 'LS'),
  ],
};

// §7.9, pp. 7.9-1 to 7.9-2. Read challenge-response: the RS reads the challenge and the LS
// responds after executing the required steps from memory. Pound sign = the abbreviated runup.
const ENGINE_RUNUP_CHECKLIST = {
  id: 'c-engine-runup',
  title: 'Engine Runup Checklist',
  done: '"ENGINE RUNUP CHECKLIST COMPLETE."',
  rows: [
    abbrev('cer1', 'Brakes', 'Checked, set', 'LS', { action: [note('Set indicates the condition of the parking brake.')] }),
    abbrev('cer2', 'Manual Feather', 'Checked', 'LS', {
      watch: ['Prop RPM'],
      action: ['a. Ensure Prop RPM falls below 900.', 'b. Move the Prop Levers Full Forward ensuring a minimum RPM of 1180.'],
    }),
    item('cer3', 'Governors and Rudder Boost', 'Checked', 'LS', {
      watch: ['RUDDER BOOST', 'Prop RPM'],
      action: [
        'a. Rudder Boost — Verify ON.',
        'b. Prop Governor Test switch — Hold in TEST.',
        'c. For each engine individually: (1) Power Lever — Increase until the prop is stabilized at 1800 to 1910 RPM while ITT and torque continue to increase. (2) Power Lever — Continue to increase until Rudder movement is noted. (3) Power Lever — Idle. (4) Repeat for other engine. (5) Prop Governor Test switch — Release.',
        'd. Prop Governor: (1) Power Levers — Set minimum 600 ft-lb. (2) Prop Levers — Retard to Detent (Note RPM decrease, 1600-1640). (3) Prop Levers — Full Forward. (4) Power Levers — Idle.',
      ],
    }),
    item('cer4', 'Autofeather/Autoignition', 'Checked/OFF', 'LS', {
      watch: ['Autofeather', 'Autoignition', 'Torque'],
      action: [
        'a. Autoignition — ARM. (1) Left IGN and Right IGN displayed.',
        'b. Power Levers — Approximately 500 ft-lb torque. (1) Left IGN and Right IGN removed.',
        'c. AUTOFEATHER switch — Hold to TEST (Left AFX and Right AFX displayed on EICAS).',
        'd. For each engine individually: (1) Power Lever — Retard. (2) At approximately 410 ft-lb — Opposite AFX removed. (3) At approximately 260 ft-lb — Both Left AFX and Right AFX removed (Prop Starts to Feather). (4) Power Lever — Advance back to 500 ft-lb.',
        note('Autofeather annunciator will cycle on and off with each fluctuation of torque as the propeller feathers.'),
        'e. Power Levers — Idle. (1) Left IGN and Right IGN displayed. (2) Left AFX and Right AFX removed, neither prop feathers.',
        'f. AUTOFEATHER switch — Release.',
        'g. Autoignition — OFF (Left IGN and Right IGN removed).',
      ],
    }),
  ],
};

// §7.10.1, pp. 7.10-1 to 7.10-3
const BEFORE_TAKEOFF_CHECKLIST = {
  id: 'c-before-takeoff',
  title: 'Before Takeoff Checklist',
  done: '"BEFORE TAKEOFF CHECKLIST COMPLETE."',
  rows: [
    item('cbto1', 'Autopilot/Yaw Damp', 'Checked/Disengaged', 'PF, PM', {
      action: [
        'a. Elevator — Forward position.',
        'b. Autopilot — Engage (AP and YD displayed on PFD).',
        'c. Rudder Pedals — Check for added resistance.',
        'd. Electric Pitch Trim — Operate UP (AP disengages with operation and the YD remains engaged). (1) Autopilot — Engage. (2) Electric Pitch Trim — Operate DOWN (AP disengages with operation and the YD remains engaged).',
        'e. Elevator — Centered.',
        'f. Autopilot — Engage. (1) Apply rearward pressure on the elevator — Pitch trim travels nose down. (2) Apply forward pressure on the elevator — Pitch trim travels nose-up.',
        'g. AP/TRIM MASTER — Depress to first level, momentary AP and YD displayed on PFD then removed.',
        'h. Autopilot — Check (PM). (1) Autopilot — Engage. (2) AP/TRIM MASTER — Depress to first level, momentary AP and YD displayed on PFD then removed.',
      ],
    }),
    item('cbto2', 'Electric Trim', 'Checked', 'PF, PM', {
      action: [
        'a. Pitch Trim switch — Check Operation. (1) Move each dual-element switch fore and aft — Verify trim is inoperative. (2) Move both dual-element switches fore and aft — Verify trim operates nose down and nose up. (3) Ensure left seat’s trim switch overrides right seat’s trim switch.',
        'b. AP/TRIM MASTER — Press to second level and hold, trim stops, TRIM displayed on PFD.',
        'c. Release AP/TRIM MASTER Switch — TRIM removed.',
        'd. Repeat Steps a through c for the PM.',
        note('Operation of the electric elevator trim system should occur only when both elements of the dual-element switch are activated. Any movement of the elevator trim wheel while activating only one element denotes a system malfunction.'),
      ],
    }),
    abbrev('cbto3', 'Trim', 'Set', 'PF, PM', { action: ['a. Verify set in the takeoff position (0 aileron, 0 rudder, takeoff band).'] }),
    abbrev('cbto4', 'Autofeather', 'ARM', 'LS', { watch: ['CAS Messages'], action: ['a. Autofeather Off CAS message removed.'] }),
    item('cbto5', 'Radar', 'As required', 'PF', {
      action: [
        note('Radar check is required for planned flights into IMC.'),
        'a. Cog Wheel — Select.', 'b. Radar Mode — Select.',
        'c. Radar — Test. (1) A good radar test will be indicated by a single 4 color sweep.',
        'd. Radar Mode — Standby.',
      ],
    }),
    item('cbto6', 'Props', 'Full Forward', 'PF', { action: ['a. Verify Prop Levers are Full Forward.'] }),
    abbrev('cbto7', 'Flaps', 'Checked, As Required', 'PF, PM'),
    abbrev('cbto8', 'Rudder Boost', 'On', 'PM'),
    abbrev('cbto9', 'FMS', 'Checked/Set', 'PF, PM', {
      action: ['a. Verify position/database.', 'b. Plan route.', 'c. Input fuel and performance data.', 'd. Set symbols on map(s).'],
    }),
    abbrev('cbto10', 'Altimeters', '____.____/Set', 'PF, PM', {
      action: ['a. Set current altimeter settings on both PFDs and SDU.', 'b. Set mins as required.'],
    }),
    abbrev('cbto11', 'Flight Instruments', 'Checked/Set', 'PF, PM', {
      action: [
        'a. Compare flight information on both PFDs and SDU. Note any comparators or warning flags.',
        'b. Set and select V-speeds. (1) Refer to Takeoff Speeds — Flaps UP, Figure 28.1-22 or Flaps APPROACH, Figure 28.1-23.',
        'c. Set radios and NAVAIDs.', 'd. Set transponder code and verify aircraft ID.', 'e. Select NAV and BRG source.',
        'f. Set desired display format.', 'g. Set course, speed, HDG, and ALT settings.', 'h. Check battery ammeter — 0 to 10 amps.',
      ],
    }),
    abbrev('cbto12', 'Pressurization', 'Checked', 'PM', {
      action: ['a. Verify/set landing field elevation (System Summary page).', 'b. Verify Cabin Press switch — PRESS.'],
    }),
    abbrev('cbto13', 'Fuel quantity', 'Checked, ____ lb', 'PF', {
      action: [note('The T-54A is not equipped with a fuel totalizer. Total fuel quantity is the sum of Main fuel tank and Aux fuel tank.')],
    }),
    abbrev('cbto14', 'CAS Messages', 'Checked', 'PF, PM', {
      action: ['a. Verify no abnormal amber/red CAS messages.', note('L-R Pitot Heat CAS message displayed is normal.')],
    }),
    abbrev('cbto15', 'Crew', 'Briefed', 'PF', {
      action: ['a. Conduct a takeoff brief including at a minimum the following: (1) Taxi route to active runway. (2) Departure. (3) Performance. (4) Aborts/Abnormals.'],
    }),
  ],
};

// §7.10.5, p. 7.10-4
const LINEUP_CHECKLIST = {
  id: 'c-lineup',
  title: 'Lineup Checklist',
  done: '"LINEUP CHECKLIST COMPLETE."',
  rows: [
    item('clu1', 'Autoignition', 'ARM', 'LS'),
    item('clu2', 'Anti-ice/De-ice', 'Set', 'LS'),
    item('clu3', 'Lights', 'Set', 'LS'),
    item('clu4', 'Bleed Air Valves', 'OPEN', 'RS'),
    item('clu5', 'Autothrottles', 'As required', 'PF'),
    item('clu6', 'Condition Levers', 'HIGH IDLE', 'PF'),
  ],
};

// §7.12.4, p. 7.12-2
const CLIMB_CHECKLIST = {
  id: 'c-climb',
  title: 'Climb Checklist',
  done: '"CLIMB CHECKLIST COMPLETE."',
  rows: [
    abbrev('ccl1', 'Landing Gear', 'Up', 'PM'),
    abbrev('ccl2', 'Flaps', 'Up', 'PM'),
    abbrev('ccl3', 'Lights', 'Set', 'LS'),
    abbrev('ccl4', 'Engine Instruments', 'Checked', 'PM'),
    item('ccl5', 'Prop Sync', 'As required', 'LS', { action: [note('The Prop Sync should be secured for high altitude training maneuvers.')] }),
    item('ccl6', 'Anti-ice/De-ice', 'Set', 'LS', {
      action: [
        warning('Windshield failure or severe damage may occur if windshield heat is initially actuated above 10,000 feet.'),
        caution('Failure to reduce engine torque prior to selecting the Engine Anti-Ice OFF may result in an engine torque limit exceedance. Consider reducing engine torque to less than 2000 ft-lbs prior to selecting Engine Anti-Ice OFF.'),
      ],
    }),
    item('ccl7', 'Pressurization', 'Checked', 'PM', {
      watch: ['Cabin Altitude'],
      action: ['a. Ensure cabin altitude, cabin rate of climb and differential pressure are indicating expected values.'],
    }),
  ],
};

// §7.14.4, pp. 7.14-1 to 7.14-2
const CRUISE_CHECKLIST = {
  id: 'c-cruise',
  title: 'Cruise Checklist',
  done: '"CRUISE CHECKLIST COMPLETE."',
  rows: [
    item('ccr1', 'Power', 'Set', 'PF'),
    item('ccr2', 'Props', 'Set', 'PF'),
    item('ccr3', 'Autofeather', 'As required', 'LS', { action: [note('The Autofeather may be secured for high altitude maneuvers.')] }),
    item('ccr4', 'Engine Instruments/Fuel Quantity', 'Checked', 'LS, RS'),
    item('ccr5', 'Altimeters', '___.___ Set', 'LS, RS'),
    item('ccr6', 'Pressurization', 'Checked', 'RS'),
  ],
};

// §7.15.4, p. 7.15-1
const DESCENT_CHECKLIST = {
  id: 'c-descent',
  title: 'Descent Checklist',
  done: '"DESCENT CHECKLIST COMPLETE."',
  rows: [
    item('cde1', 'Anti-Ice/De-Ice', 'As required', 'PF'),
    item('cde2', 'Altimeters', '___.___', 'PF, PM'),
  ],
};

// §7.16.3, p. 7.16-2
const APPROACH_CHECKLIST = {
  id: 'c-approach',
  title: 'Approach Checklist',
  done: '"APPROACH CHECKLIST COMPLETE."',
  rows: [
    item('cap1', 'AUTOFEATHER', 'ARM', 'LS'),
    item('cap2', 'Prop Sync', 'On', 'LS'),
    abbrev('cap3', 'Flight Instruments', 'Set', 'PF, PM'),
    abbrev('cap4', 'VREF', '___ Set', 'PF, PM'),
    item('cap5', 'TAWS', 'As required', 'PF'),
    abbrev('cap6', 'Altimeters', '___.___ Set', 'PF, PM'),
    abbrev('cap7', 'Minimums', '___ Set', 'PF, PM'),
    abbrev('cap8', 'Crew', 'Briefed', 'PF'),
    abbrev('cap9', 'Pressurization', 'Checked, Set', 'PM', {
      action: [note('With TAWS, if either a non-precision or visual approach is being used at an airport and there is an active ILS frequency at the airport tuned into NAV 1, then unwarranted "GLIDESLOPE" cautions may be annunciated.')],
    }),
  ],
};

// §7.18.1, p. 7.18-1
const LANDING_CHECKLIST = {
  id: 'c-landing',
  title: 'Landing Checklist',
  done: '"LANDING CHECKLIST COMPLETE."',
  rows: [
    item('cla1', 'Flaps', 'As required', 'PF, PM', { action: ['a. Crew may inhibit the flap override aural cue to eliminate nuisance alert.'] }),
    item('cla2', 'Props', 'Full Forward', 'PF', {
      action: ['a. If the PF sets the propellers full forward and they do not indicate 2000 rpm, the PM may adjust them to 2000 rpm.'],
    }),
    item('cla3', 'Landing Gear', 'Down/Locked', 'PF, PM', { watch: ['Landing Gear Indicator'] }),
    item('cla4', 'Lights', 'Set', 'LS', {
      action: [
        'a. Turn on landing and taxi lights.',
        warning('Overriding the landing gear warning horn in the traffic pattern or during final segment of an instrument approach could result in a gear-up landing.'),
        warning('Landing with the yaw damp on, may limit rudder authority resulting in runway departure, loss of aircraft control and fireball.'),
        caution('Moving the power levers into the beta range with the prop levers not full forward (HIGH RPM), may result in engine damage.'),
        note('Under certain meteorological conditions, landing lights may induce vertigo. Landing and taxi lights are not required to be on for high altitude maneuvers.'),
      ],
    }),
  ],
};

// §7.20.4, p. 7.20-2
const AFTER_LANDING_CHECKLIST = {
  id: 'c-after-landing',
  title: 'After Landing Checklist',
  done: '"AFTER LANDING CHECKLIST COMPLETE."',
  rows: [
    item('cal1', 'Condition levers', 'LOW IDLE', 'PF'),
    item('cal2', 'Autoignition', 'OFF', 'LS'),
    item('cal3', 'Anti-Ice/De-Ice', 'Set', 'LS'),
    item('cal4', 'Lights', 'Set', 'LS'),
    item('cal5', 'Pressurization', 'Checked Depressurized', 'PM'),
    item('cal6', 'Bleed Air Valves', 'ENVIR OFF', 'RS'),
    item('cal7', 'Flaps', 'UP', 'PM'),
    item('cal8', 'Trim', 'Set', 'PM'),
  ],
};

// §7.21.4, p. 7.21-2
const SECURE_CHECKLIST = {
  id: 'c-secure',
  title: 'Secure Checklist',
  done: '"SECURE CHECKLIST COMPLETE."',
  rows: [
    item('cse1', 'Crossfeed', 'OFF', 'LS'),
    item('cse2', 'Avionics Master', 'OFF', 'LS'),
    item('cse3', 'SDU', 'OFF', 'LS'),
    item('cse4', 'Autofeather', 'OFF', 'LS'),
    item('cse5', 'ECS', 'OFF', 'RS'),
    item('cse6', 'Condition Lever(s)', 'FUEL CUTOFF', 'LS'),
    item('cse7', 'Prop Lever(s)', 'FEATHER', 'LS'),
    item('cse8', 'DC Volt/Loadmeters', 'Checked', 'LS'),
    item('cse9', 'Oxygen', 'Closed', 'RS'),
    item('cse10', 'Lights', 'Off', 'LS', {
      action: ['a. Beacon and navigation lights should remain on until the propellers have stopped rotating.', 'b. Secure overhead lights.'],
    }),
    item('cse11', 'Gang Bar', 'Off', 'LS'),
    item('cse12', 'Control Lock', 'As required', 'LS', {
      action: [
        'a. Install power quadrant and aileron lock if required.',
        'b. Pull the rudder gust lock tab on the pilot floor and insert the rudder lock pin if required.',
        caution('Towing with the rudder gust lock installed may result in steering linkage damage.'),
      ],
    }),
    item('cse13', 'Wheels', 'Chocked', 'LS', { action: ['a. Ensure external covers and tiedowns installed for off station operations.'] }),
    item('cse14', 'Parking Brake', 'As required', 'LS', {
      action: [
        'a. The parking brake is normally left off and wheel chocks installed if the airplane is to be left unattended. Do not set the parking brake if towing is anticipated.',
        caution('Change in the ambient temperature can cause the brakes to release or to exert excessive pressures, damaging the system.'),
      ],
    }),
  ],
};

// Every flow, in the order they are run. Typed from memory, like the EPs.
export const T54A_FLOWS = [
  BEFORE_START_FLOW, ENGINE_START_FLOW, BEFORE_TAXI_FLOW, TAXI_FLOW, LINEUP_FLOW, CLIMB_FLOW,
  CRUISE_FLOW, DESCENT_FLOW, APPROACH_FLOW, GO_AROUND, AFTER_LANDING_FLOW, SECURE_FLOW,
];

// Every checklist, in the order they are run. Read, not typed: see EPDrill `read`.
export const T54A_CHECKLISTS = [
  BEFORE_START_CHECKLIST, BEFORE_TAXI_CHECKLIST, ENGINE_RUNUP_CHECKLIST, BEFORE_TAKEOFF_CHECKLIST,
  LINEUP_CHECKLIST, CLIMB_CHECKLIST, CRUISE_CHECKLIST, DESCENT_CHECKLIST, APPROACH_CHECKLIST,
  LANDING_CHECKLIST, AFTER_LANDING_CHECKLIST, SECURE_CHECKLIST,
];
