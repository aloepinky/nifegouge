// What is said on a T-44C contact flight, for the Practice Flight tab. Pure data, no JSX, so a
// tool can load it (tools/practice-t44c-verify.js finds every line in its publication).
//
// Every call here is the Multi-Engine FTI's (P-561, Appendix B), its blanks filled from the
// flight: {cs} the call sign, {rwy} the runway, and so on. A call the FTI does not print is in
// GENERATED, says so on the page, and is not checked against anything.
//
// `who` is the seat that says it. The FTI gives the radios to the PM ("Traditionally, the PM is
// tasked with checklist management, radio communications") and the student practices both seats.

const b = (loc, pages) => ({ work: 'ME FTI', loc: `App. B — ${loc}`, pages });
const ch1 = (loc, pages) => ({ work: 'ME FTI', loc: `Ch. 1 — ${loc}`, pages });

const f = (loc, pages) => ({ work: 'ME FTI', loc: `App. F — ${loc}`, pages });

const RADIO = 'Radio Procedures';
const BRIEF = 'Normal Briefings';

export const CALLS = {
  // Before takeoff: the PF's direction, then the PM's call, as Appendix F runs them.
  pfAtis: { who: 'PF', text: 'Switch Channel 1, copy ATIS.', ref: f('After Start Checklist', 'p. F-9') },
  pfBase: { who: 'PF', text: 'Hold the checklist. Keep me clear on the right during all taxi and ground ops. Let base know we are out of the chocks.', ref: f('After Start Checklist', 'p. F-9') },
  pmRoger: { who: 'PM', text: 'Roger', ref: f('After Start Checklist', 'p. F-9') },
  base: { who: 'PM', radio: 'VHF 140.325', text: '{baseName} Base, {cs} out of the chocks', ref: f('After Start Checklist', 'p. F-9') },
  pfGround: { who: 'PF', text: 'Select channel 3 and request taxi.', ref: f('After Start Checklist', 'p. F-10') },
  pfFms: { who: 'PF', text: 'Hold the checklist. You have the controls. I will be heads down.', ref: f('Before Takeoff Checklist', 'p. F-17') },
  iHave: { who: 'PM', text: 'I have the controls.', ref: ch1('Ground Operations', 'p. 1-10') },
  youHave: { who: 'PF', text: 'You have the controls.', ref: ch1('Ground Operations', 'p. 1-10') },
  holdYellow: { who: 'PF', text: 'Hold the checklist. Check me out of the yellow. Request further taxi.', ref: f('Before Takeoff Checklist', 'p. F-19') },
  furtherTaxi: { who: 'PM', radio: 'CH 3', text: 'Navy Corpus Ground, {cs}, request further taxi.', ref: f('Before Takeoff Checklist', 'p. F-19') },
  pfTower: { who: 'PF', text: 'Switch to channel 4 and request takeoff clearance.', ref: f('Before Takeoff Checklist', 'p. F-19') },
  numberOne: { who: 'PM', radio: 'CH 4', text: 'Navy Corpus Tower, {cs}, runway {rwy}, {one}, holding short, VFR to {goal}. Ready for departure', ref: f('Before Takeoff Checklist', 'p. F-19') },
  cleared: { who: 'PM', radio: 'CH 4', text: 'Cleared for takeoff, runway {rwy}, {cs}', ref: f('Before Takeoff Checklist', 'p. F-19') },
  seagullBlocks: { who: 'PM', radio: 'CH 19', text: 'Seagull, {cs}, request blocks available.', ref: b(RADIO, 'p. B-1') },
  departureTerminate: { who: 'PM', radio: 'CH 8', text: 'Corpus Departure, {cs}, terminate.', ref: b(RADIO, 'p. B-3') },
  seagullCheckIn: { who: 'PM', radio: 'CH 19', text: 'Seagull, {cs}, on the 130 climb radial, passing three thousand for block {blockWord} {areaWord}.', ref: b(RADIO, 'p. B-3') },
  seagullEstablished: { who: 'PM', radio: 'CH 19', text: 'Seagull, {cs}, established block {blockWord} {areaWord}.', ref: b(RADIO, 'p. B-3') },
  seagullLeaving: { who: 'PM', radio: 'CH 19', text: 'Seagull, {cs}, approaching the {radial} descent radial at {dme} DME, vacating block {blockWord}, leaving {leaving} ft, terminate.', ref: b(RADIO, 'p. B-3') },
  approachFirst: { who: 'PM', radio: 'CH 8', text: 'Corpus Approach, {cs}.', ref: b(RADIO, 'p. B-3') },
  approachRequest: { who: 'PM', radio: 'CH 8', text: 'Corpus Approach, {cs}, {leaving} ft, on the CRP {radial} at {dme} DME, course rules to {dest}, with information {atis}.', ref: b(RADIO, 'p. B-3') },
  approachTerminate: { who: 'PM', radio: 'CH 8', text: 'Corpus Approach, {cs}, terminate.', ref: b(RADIO, 'p. B-3') },
  towerShamrock: { who: 'PM', radio: 'CH 4', text: 'Navy Corpus Tower, {cs}, Point Shamrock, {intent}.', ref: b(RADIO, 'p. B-4') },
  towerShamrockSunrise: { who: 'PM', radio: 'CH 4', text: 'Navy Corpus Tower, {cs}, Point Shamrock, Sunrise transition on request.', ref: b(RADIO, 'p. B-4') },
  towerSunrise: { who: 'PM', radio: 'CH 4', text: 'Navy Corpus Tower, {cs}, Point Sunrise, {intent}.', ref: b(RADIO, 'p. B-4') },
  cabanissSunrise: { who: 'PM', radio: 'CH 15', text: 'Cabaniss Tower, {cs}, Point Sunrise, Touch-and-Go.', ref: b(RADIO, 'p. B-4') },
  initial: { who: 'PM', radio: 'CH 4', text: 'Navy Corpus Tower, {cs}, initial runway {rwy}.', ref: b(RADIO, 'p. B-4') },
  numbers: { who: 'PM', radio: 'CH 4', text: 'Navy Corpus Tower, {cs}, numbers for the break.', ref: b(RADIO, 'p. B-4') },
  abeam: { who: 'PM', radio: '{towerCh}', text: '{tower}, {cs}, {side} 180, three down and locked, {intent}.', ref: b(RADIO, 'p. B-4') },
  cabanissDepart: { who: 'PM', radio: 'CH 15', text: 'Cabaniss Tower, {cs}, Sunrise on request.', ref: b(RADIO, 'p. B-4') },
  taxiIn: { who: 'PM', radio: 'CH 3', text: 'Navy Corpus Ground, {cs}, clear on {exit}, taxi to my line.', ref: b(RADIO, 'p. B-4') },

  crewBrief: { who: 'PF', text: "Back me up on the power quadrant and monitor all engine and flight instruments. Call out any malfunctions. All malfunctions will be handled in accordance with NATOPS. Call rotate at 91 knots and note the time of takeoff. This will be a course rules departure to {briefGoal}. In the event of an emergency return, I'll maintain VMC, and request downwind.", ref: f('Before Takeoff Checklist', 'p. F-19') },
  anyQuestions: { who: 'PF', text: 'Any questions?', ref: f('Before Takeoff Checklist', 'p. F-19') },
  briefed: { who: 'PF', text: 'Briefed', ref: f('Before Takeoff Checklist', 'p. F-19') },
  touchAndGoBrief: { who: 'PF', text: "Once safely on the runway, I'll call Reset Flaps, Trim and advance the power levers to 12 o'clock. You reset flaps and trim. Call Go with engines spooled up. Call Rotate at VR with takeoff power set.", ref: b(BRIEF, 'p. B-8') },
  sseFullStopBrief: { who: 'PF', text: 'Once safely on the deck, I will bring both power levers over the detent, reversing with the {engine} engine, maintaining centerline with opposite rudder and aileron and forward yoke pressure. If rudder effectiveness is lost, I will bring both power levers toward flight idle.', ref: b('Emergency Briefings', 'p. B-10') },

  outOfYellow: { who: 'PM', text: "You're out of the yellow.", ref: f('Before Takeoff Checklist', 'p. F-19') },
  clearLeft: { who: 'PF', text: 'Clear left.', ref: f('Before Takeoff Checklist', 'p. F-19') },
  clearRight: { who: 'PM', text: 'Clear right.', ref: f('Before Takeoff Checklist', 'p. F-19') },
  clearLeftAbove: { who: 'PF', text: 'Clear left and above', ref: f('Before Takeoff Checklist', 'p. F-19') },
  clearRightAbove: { who: 'PM', text: 'Clear right and above', ref: f('Before Takeoff Checklist', 'p. F-19') },
  continueChecklist: { who: 'PF', text: 'Continue the checklist.', ref: f('Before Takeoff Checklist', 'p. F-19') },
  checkedLeft: { who: 'PF', text: 'Checked left', ref: ch1('Departure and Arrival Transitions', 'p. 1-11') },
  checkedRight: { who: 'PM', text: 'Checked right', ref: ch1('Departure and Arrival Transitions', 'p. 1-11') },
  rotate: { who: 'PM', text: 'Rotate', ref: ch1('Departure and Arrival Transitions', 'p. 1-11') },
  review: { who: 'PF', text: 'Props full forward, down and locked, review me complete.', ref: ch1('Pattern Work', 'p. 1-32') },
  reviewed: { who: 'PM', text: 'Reviewed complete, cleared {cleared}.', ref: ch1('Pattern Work', 'p. 1-32') },
  resetFlapsTrim: { who: 'PF', text: 'Reset Flaps and Trim', ref: ch1('Pattern Work', 'p. 1-35') },
  flaps: { who: 'PM', text: 'Flaps', ref: ch1('Pattern Work', 'p. 1-35') },
  trim: { who: 'PM', text: 'Trim', ref: ch1('Pattern Work', 'p. 1-35') },
  go: { who: 'PM', text: 'Go', ref: ch1('Pattern Work', 'p. 1-35') },
  rotateTg: { who: 'PM', text: 'Rotate', ref: ch1('Pattern Work', 'p. 1-35') },
};

// Calls made up for practice. The FTI prints sample calls for Seagull, Navy Corpus and Cabaniss
// only; these fill what it leaves out, in the same pattern.
export const GENERATED = {
  ground: { who: 'PM', radio: 'CH 3', generated: false, text: 'Navy Corpus Ground, {cs} at Compass Rose with {atis}, taxi to runup' },
  baseReply: { who: 'Base', text: '{cs}, {baseName} base got you out' },
  groundRead: { who: 'PM', text: 'Taxi to Echo runups via Charlie Romeo, Echo, {cs}.' },
  furtherRead: { who: 'PM', text: 'Taxi to runway {rwy} via {taxiOut}, {cs}.' },
  groundInRead: { who: 'PM', text: 'Taxi to my line via {taxiIn}, {cs}.' },
  pmNo: { who: 'PM', text: 'No.', generated: false },
  toldBrief: { who: 'PF', generated: false, text: 'TOLD: max fuel per side to land ____, accelerate-stop no reverse ____ feet, one engine inop max rate of climb ____ feet per minute.' },
  atis: { who: 'ATIS', radio: 'CH 1', text: 'Navy Corpus information {atis}, wind {wind}, altimeter {altimeter}, runway {rwy} in use.' },
  groundReply: { who: 'Ground', radio: 'CH 3', text: '{cs}, taxi to Echo runups via Charlie Romeo, Echo.' },
  towerSwitch: { who: 'Tower', text: '{cs}, switch Departure.' },
  departure: { who: 'PM', radio: 'CH 8', generated: false, text: 'Corpus Departure, {cs}, 500 feet off Navy Corpus, course rules to {goal}.' },
  // Primary's Departure answer (practice/engine.js), with the course rules in place of a MUSTANG area.
  departureReply: { who: 'Departure', radio: 'CH 8', text: '{cs}, Corpus Departure, radar contact, proceed course rules {goal}.' },
  departureRead: { who: 'PM', radio: 'CH 8', text: 'Course rules {goal}, {cs}.' },
  // Departure's and Approach's answers, in Primary's words (practice/engine.js, fieldOps.js).
  departureTermReply: { who: 'Departure', radio: 'CH 8', text: '{cs}, radar service terminated, frequency change approved.' },
  approachHello: { who: 'Approach', radio: 'CH 8', text: '{cs}, Corpus Approach.' },
  approachContact: { who: 'Approach', radio: 'CH 8', text: '{cs}, Corpus Approach, radar contact, proceed {approachTo}.' },
  approachRead: { who: 'PM', radio: 'CH 8', text: 'Proceed {approachTo}, {cs}.' },
  approachShamrock: { who: 'Approach', radio: 'CH 8', text: '{cs}, Corpus Approach, radar contact, proceed course rules Shamrock.' },
  approachShamrockRead: { who: 'PM', radio: 'CH 8', text: 'Proceed course rules Shamrock, {cs}.' },
  approachTermReply: { who: 'Approach', radio: 'CH 8', text: '{cs}, radar service terminated, frequency change approved.' },
  freqRead: { who: 'PM', text: 'Frequency change approved, {cs}.' },
  // Navy Corpus Tower's answers to the Shamrock and Sunrise calls.
  towerShamrockReply: { who: 'Tower', radio: 'CH 4', text: '{cs}, Navy Corpus Tower, report initial runway {rwy}.' },
  cabanissToTower: { who: 'Cabaniss', radio: 'CH 15', text: '{cs}, contact Navy Corpus Tower.' },
  towerSunriseReply: { who: 'Tower', radio: 'CH 4', text: '{cs}, Navy Corpus Tower, runway {rwy}, report the numbers.' },
  // Cabaniss Tower, made up in the pattern of Navy Corpus's.
  cabanissSunriseReply: { who: 'Cabaniss', radio: 'CH 15', text: '{cs}, Cabaniss Tower, enter the Wagon Wheel, report initial runway {cabRwy}.' },
  cabanissSouthernReply: { who: 'Cabaniss', radio: 'CH 15', text: '{cs}, Cabaniss Tower, {cabReport}.' },
  cabanissInitial: { who: 'PM', radio: 'CH 15', text: 'Cabaniss Tower, {cs}, initial runway {cabRwy}.' },
  cabanissBreak: { who: 'Cabaniss', radio: 'CH 15', text: '{cs}, Cabaniss Tower, cleared for the break runway {cabRwy}.' },
  cabanissSouthernOutReply: { who: 'Cabaniss', radio: 'CH 15', text: '{cs}, Southern Departure approved, contact Corpus Approach when clear.' },
  towerClears: { who: 'Tower', radio: 'CH 4', text: '{cs}, winds are {wind}, runway {rwy}, cleared for takeoff.' },
  groundFurther: { who: 'Ground', radio: 'CH 3', text: '{cs}, taxi to runway {rwy} via {taxiOut}.' },
  seagullAssigns: { who: 'Seagull', radio: 'CH 19', text: '{cs}, block {blockWord} {areaWord}.' },
  seagullReadback: { who: 'PM', radio: 'CH 19', text: 'Block {blockWord} {areaWord}, {cs}.' },
  seagullNorthCheckIn: { who: 'PM', radio: 'CH 19', text: 'Seagull, {cs}, CRP 100/26, passing three thousand five hundred for block {blockWord} north.' },
  foxtrotEntry: { who: 'PM', radio: 'UHF 337.8', text: 'Foxtrot, {cs}, entering {area}, low block.' },
  foxtrotLeaving: { who: 'PM', radio: 'UHF 337.8', text: 'Foxtrot, {cs}, departing {area}, low block, returning to Navy Corpus.' },
  cheetahBase: { who: 'PM', radio: 'VHF 140.325', text: 'T-44 base, {cs}, entering {area}, request block {blockLetter}.' },
  cheetahLeaving: { who: 'PM', radio: 'VHF 140.325', text: 'T-44 base, {cs}, vacating {area} block {blockLetter}, returning to Navy Corpus.' },
  approachOther: { who: 'PM', radio: 'CH 8', text: 'Corpus Approach, {cs}, {position}, course rules to Shamrock, with information {atis}.' },
  atisAir: { who: 'ATIS', radio: 'CH 1', text: 'Navy Corpus information {atis}, wind {wind}, altimeter {altimeter}, runway {rwy} in use.' },
  cabanissAsk: { who: 'PM', radio: 'CH 15', text: 'Cabaniss Tower, {cs}, {area}, request landing runway.' },
  cabanissRunway: { who: 'Cabaniss', radio: 'CH 15', text: '{cs}, landing runway {cabRwy}.' },
  cabanissSouthern: { who: 'PM', radio: 'CH 15', text: 'Cabaniss Tower, {cs}, Chapman Ranch, field in sight, Touch-and-Go.' },
  cabanissSouthernOut: { who: 'PM', radio: 'CH 15', text: 'Cabaniss Tower, {cs}, Southern Departure on request.' },
  departureSouthern: { who: 'PM', radio: 'CH 8', text: 'Corpus Approach, {cs}, off Cabaniss, 1,000 ft, Southern Departure to Shamrock.' },
  towerBreak: { who: 'Tower', radio: '{towerCh}', text: '{cs}, cleared for the break runway {fieldRwy}.' },
  towerOption: { who: 'Tower', radio: '{towerCh}', text: '{cs}, runway {fieldRwy}, cleared for the option.' },
  towerFullStop: { who: 'Tower', radio: '{towerCh}', text: '{cs}, runway {fieldRwy}, cleared to land.' },
  towerSunriseApproved: { who: 'Tower', radio: 'CH 4', text: '{cs}, Sunrise transition approved.' },
  cabanissSunriseApproved: { who: 'Cabaniss', radio: 'CH 15', text: '{cs}, Sunrise approved, contact Navy Corpus Tower when directed.' },
  groundIn: { who: 'Ground', radio: 'CH 3', text: '{cs}, taxi to your line via {taxiIn}.' },
};

const fam = (loc, pages) => ({ work: 'ME FTI', loc: `Ch. 1 — ${loc}`, pages });

// Checklists are named when they are run and nothing more. `find` is the words the check tool
// looks for where the short name is not the FTI's own.
const app = (loc, pages) => ({ work: 'ME FTI', loc: `App. F — ${loc}`, pages });
export const CHECKLISTS = {
  beforeStart: { title: 'Before Start', ref: app('Before Start Checklist', 'p. F-2') },
  rightStart: { title: 'Right Start', find: 'Start Procedures', ref: app('Start Procedures', 'p. F-3') },
  leftStart: { title: 'Left Start', find: 'Start Procedures', ref: app('Start Procedures', 'p. F-3') },
  afterStart: { title: 'After Start', ref: app('After Start Checklist', 'p. F-8') },
  runup: { title: 'Engine Runup', ref: app('Engine Runup Checklist', 'p. F-11') },
  beforeTakeoff: { title: 'Before Takeoff', ref: app('Before Takeoff Checklist', 'p. F-14') },
  climb: { title: 'Climb', ref: app('Climb Checklist', 'p. F-21') },
  descent: { title: 'Descent', ref: app('Descent Checklist', 'p. F-22') },
  approach: { title: 'Approach', ref: app('Approach Checklist', 'p. F-23') },
  landing: { title: 'Landing', ref: app('Landing Checklist', 'p. F-24') },
  afterLanding: { title: 'After Landing', ref: app('After Landing Checklist', 'p. F-25') },
  secure: { title: 'Secure', ref: app('Secure Checklist', 'p. F-26') },
};

// FTI §105's area departure mnemonics, kept here for the verifier; flight.js lays each letter
// over its own step.
export const CUES = {
  acasa: { text: 'ATIS, Cabaniss, Approach Checklist, Seagull, Approach', ref: fam('Area Departure', 'p. 1-28') },
  abc: { text: 'ATIS, Brief, Checklist', ref: fam('Area Departure', 'p. 1-28') },
};

// The FTI's suggested emergency briefs (App. B, B103). Brackets are the IP's side.
const AHRS = b('Emergency Briefings', 'p. B-9');
const PFD = b('Emergency Briefings', 'p. B-10');
export const EMERGENCY_BRIEFS = [
  {
    id: 'dual-ahrs',
    title: 'Dual AHRS Failure',
    ref: AHRS,
    rows: [
      { text: 'I have lost my AHRS. How is yours?' },
      { decision: 'IP states his has failed as well' },
      { text: 'Are we able to proceed VMC?' },
      { decision: 'If "no," continue' },
      { text: 'Check the circuit breakers and the reversionary panel.' },
      { text: "I am on the ESIS, turn off the 'big five,' are you familiar with the characteristics of the wet compass?" },
      { text: 'Call out my cardinal headings and update my ESIS heading when I rollout. You have the comms, declare an emergency, and request no-gyro vectors for a PAR/ASR.' },
      { text: 'Break out NATOPS and run the Dual AHRS Failure checklist.' },
    ],
  },
  {
    id: 'dual-pfd',
    title: 'Dual PFD Failure',
    ref: PFD,
    rows: [
      { text: 'I have lost my PFD. How is yours?' },
      { decision: 'IP states his has failed as well' },
      { text: 'Are we able to proceed VMC?' },
      { decision: 'If "no," continue' },
      { text: 'Check the circuit breakers and the rheostats.' },
      { text: 'I am on the ESIS, you have the comms, declare an emergency, and request vectors for a [applicable approach].' },
    ],
  },
];
