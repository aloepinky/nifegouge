// The five single-engine cases of the T-44C's SSE landing pattern, for EPDrill, typed from
// memory like the EPs, in the Hollywood set's row shape (t44cNormals.js has the fields): each
// step a control and setting the poster can answer. Once a step is in, its `replies` (who says
// what) show under the card, and its `action` opens from them (EPDrill `calls`). Pure data, no
// JSX.
//
// The NATOPS steps keep the EP sheet's wording (t44cData.js), with its asterisk and dagger; what
// a case adds is the FTI's timing and the spoken concurrence around them.
//
// Sources, all read from the rendered page (the text layer loses the ¼ to ½ and the dashes):
//   * the cases: ME FTI §106 Pattern Work, item 5, Simulated Single-Engine (SSE) Landing Pattern, Cases 1 to 5,
//     pp. 1-37 to 1-40 (P-561 Rev 6 CH3);
//   * every spoken line: ME FTI Appendix F §F113, Figure F-1 Emergency Engine Shutdown
//     Checklist, pp. F-29 to F-30, and "Power up, rudder up, clean up" from §F113, p. F-28.
//
// The scope and order came from the TW-4 On-Wing Gouge Packet's "T-44 Emergency Phrases"
// (Mar 25). None of its own wording is used: a line the FTI does not print is left out.

const item = (id, challenge, reply, who, extra = {}) => ({ id, challenge, reply, text: `${challenge} - ${reply}`, who, ...extra });
const memory = (id, challenge, reply, who, extra = {}) => item(id, challenge, reply, who, { critical: true, ...extra });
const daggered = (id, challenge, reply, who, extra = {}) => memory(id, challenge, reply, who, { concur: true, ...extra });

const say = (text, who) => ({ text, who });
const act = (text, who) => ({ text, who, act: true });
const note = (text) => ({ note: text });
const warning = (text) => ({ warning: text });

const CONCUR_OR_SIMULATE = [say('Concur', 'PM'), act('or “Simulate”', 'PM')];

const BALL = 'nearly center the ball (¼ to ½ out towards the operating engine)';

// The first three items of the Emergency Shutdown Checklist, as Figure F-1 runs them.
const firstThree = (p) => [
  daggered(`${p}-pl`, 'Power Lever', 'IDLE', 'PF', {
    action: [
      'Accomplish Execution of the Emergency Engine Shutdown Checklist in the following manner (the word simulate will be used only during SSE training in the aircraft):',
      'Brief intentions. Identify the engine to be shut down and place finger on appropriate power lever. PM visually confirms correct power lever.',
      'Slowly retard power lever to idle.',
      warning('If the auto-feather system is activated, retarding either power lever before the feathering sequence is complete will deactivate the auto-feather circuit and prevent automatic feathering.'),
    ],
    replies: [
      say('This will be an emergency shutdown of the left/right engine.', 'PF'),
      say('Left/right Power lever – Idle, concur?', 'PF'),
      say('Concur', 'PM'),
    ],
  }),
  daggered(`${p}-prop`, 'Prop Lever', 'FEATHER', 'PF', {
    action: ['Identify prop to feather and point to appropriate prop lever. PM visually confirms correct prop lever and guards against inadvertent movement.'],
    replies: [say('Left/right Propeller – Feather, concur?', 'PF'), ...CONCUR_OR_SIMULATE],
  }),
  daggered(`${p}-cl`, 'Condition Lever', 'FUEL CUTOFF', 'PF', {
    action: ['Identify condition lever to close and point to appropriate condition lever. PM visually confirms correct condition lever and guards against inadvertent movement. IP may add power to the “feathered” engine to simulate decrease in drag.'],
    replies: [say('Left/right Condition lever – Fuel Cutoff concur?', 'PF'), ...CONCUR_OR_SIMULATE],
  }),
];

// Figure F-1's note after the third item: the prop check, then the props to 1900.
const propCheck = (p) => [
  item(`${p}-alt`, 'Alternate Prop Feather Checklist', 'As Required', 'PF', {
    action: ['If Prop Fails to Feather, at this point in the checklist, execute the Alternate Prop Feathering Checklist.'],
  }),
  item(`${p}-1900`, 'Prop Lever', '1900 RPM', 'PF', {
    action: ['If the prop is feathered, or upon completing the Alternate Prop Feather Checklist, pull the prop levers to 1900 RPM and continue the Emergency Shutdown Checklist in case of a confirmed/suspected fire or fuel leak. If there is no confirmed/suspected fire or fuel leak, continue with step 7 of the checklist.'],
  }),
];

// The remaining memory items, for a confirmed or suspected fire or fuel leak.
const fireItems = (p) => [
  { decision: 'IN CASE OF CONFIRMED/SUSPECTED FIRE OR FUEL LEAK, CONTINUE CHECKLIST.' },
  daggered(`${p}-fw`, 'Firewall Valve', 'CLOSED', 'PF', {
    action: ['Identify appropriate firewall valve by verifying corresponding power lever at idle. Because the firewall valves are aligned fore and aft, it is easy to make a mistake. Do not rush. Point at the appropriate firewall valve. PM visually confirms correct valve.'],
    replies: [say('Left/right firewall valve closed, concur?', 'PF'), ...CONCUR_OR_SIMULATE],
  }),
  daggered(`${p}-ext`, 'Fire Extinguisher', 'As Required', 'PF', {
    action: [
      'PF, PM decide if the fire extinguisher is required and point to the appropriate extinguisher. PF, PM visually confirm correct extinguisher.',
      'If the shutdown was caused by a fire light or a fuel leak on the side opposite the PF, the PF will direct the PM of the action to take. The PM will then point to the fire extinguisher and state the appropriate action.',
    ],
    replies: [
      say('Left fire extinguisher discharge, concur?', 'PF'), ...CONCUR_OR_SIMULATE,
      act('or'),
      say('Left fire extinguisher not required, concur?', 'PF'), say('Concur', 'PM'),
      act('Or, on the side opposite the PF:'),
      say('Discharge right fire extinguisher.', 'PF'), say('Right fire extinguisher discharge, concur?', 'PM'), say('Concur', 'PF'),
      act('or'),
      say('Right fire extinguisher not required, concur?', 'PF'), say('Concur', 'PM'),
    ],
  }),
  daggered(`${p}-bleed`, 'Bleed air valve', 'Closed', 'PM', {
    action: ['PF identifies left/right bleed air valve and directs PM to close bleed air valve or performs the action if flying as RS after receiving concurrence from PM. PM closes bleed air valve or simulates closing.'],
    replies: [
      say('Close left/right bleed air valve', 'PF'),
      say('Left/right bleed air valve closed, concur?', 'PM'),
      say('Concur', 'PF'),
    ],
  }),
  note('Decide if the rest of the checklist is required: “Continue the checklist” (PF). PM continues as directed.'),
];

const POWER_UP = [
  'Before securing an engine or immediately after an unexpected power loss, the “power up, rudder up, clean up” technique may be utilized.',
  'Power up: utilize available power as required to maintain airspeed or prevent loss of airspeed.',
  'Rudder up: utilize rudder as required to stop the heading change and maintain balanced flight. Trim out control pressures as time permits.',
  'Clean up: raise landing gear and flaps as required.',
];

const CASE_1 = {
  id: 'case-1',
  title: 'Case 1. Takeoff to Crosswind',
  rows: [
    note('If the malfunction has caused a power loss after takeoff, execute the ENGINE FAILURE AFTER TAKEOFF procedure through the first three steps of the Emergency Shutdown Checklist.'),
    memory('c1-power', 'Power', 'As Required', 'PF', { action: POWER_UP }),
    memory('c1-gear', 'Landing Gear', 'UP', 'PF'),
    memory('c1-speed', 'Airspeed', 'As Required (VXSE Or VYSE)', 'PF', {
      action: [
        'Identify the failed engine utilizing engine instruments (torque, ITT, N1, fuel flow) and required rudder. Your foot working hard to maintain heading is on the same side as the operating engine.',
        'Once you have reached 102 KIAS, raise the nose to stop any altitude loss, and accelerate to 110 KIAS. Banking 5° into the operating engine, while maintaining the ball nearly centered (¼ to ½ out towards the operating engine), is critical to optimizing single engine climb performance at low airspeed and high AOA.',
      ],
    }),
    ...firstThree('c1'),
    note('Hold the checklist momentarily and pull the props back to 1900 RPM. Reset maximum power and check to see if the prop feathered. If it did not, call for the Alternate Prop Feathering Checklist.'),
    ...propCheck('c1'),
    note('Once the prop has feathered, and with proper downwind interval, initiate the crosswind turn at 300’ AGL or above and continue the checklist.'),
    ...fireItems('c1'),
    note('Declare an emergency and continue the checklist as time permits. Climb to pattern altitude, and then accelerate to 120 KIAS.'),
  ],
};

const CASE_2 = {
  id: 'case-2',
  title: 'Case 2. Crosswind Turn',
  rows: [
    note('If the malfunction has caused a power loss: roll wings level to allow proper analysis and better control of the aircraft.'),
    item('c2-power', 'Power', 'As Required', 'PF', {
      action: [`Add power on the operating engine (as required), ${BALL} and clean up the aircraft. Maintain a minimum of 102 KIAS (Vxse) or 110 KIAS (Vyse).`],
    }),
    item('c2-gear', 'Landing Gear', 'UP', 'PF'),
    item('c2-flaps', 'Flaps', 'UP', 'PF'),
    note('After establishing coordinated flight, continue the crosswind turn.'),
    ...firstThree('c2'),
    ...propCheck('c2'),
    ...fireItems('c2'),
    note('Declare an emergency and continue the checklist as time permits. Climb to pattern altitude, and then accelerate to 120 KIAS.'),
  ],
};

const CASE_3 = {
  id: 'case-3',
  title: 'Case 3. Downwind',
  rows: [
    item('c3-power', 'Power', 'As Required', 'PF', {
      action: [`Add power on the remaining engine (as required), ${BALL} and clean up if required to maintain 120 KIAS and pattern altitude.`],
    }),
    item('c3-gear', 'Landing Gear', 'As Required', 'PF', {
      action: ['Use good judgment to make your decision whether or not to cleanup. High gross weight, high density altitude, and/or other traffic in the pattern may require that you clean up in order to maintain pattern altitude. If the decision is made to clean up, raise both the gear and the flaps; however, if the emergency (Case 3) occurs nearing the 180 position, it may not be necessary or advisable to cleanup. (Midfield and beyond is a good rule of thumb).'],
    }),
    item('c3-flaps', 'Flaps', 'As Required', 'PF'),
    ...firstThree('c3'),
    ...propCheck('c3'),
    ...fireItems('c3'),
    note('Declare an emergency, and continue the checklist as time permits.'),
    note('Just prior to the 180, if attitude and airspeed permit:'),
    item('c3-flaps-app', 'Flaps', 'APPROACH', 'PF'),
    item('c3-gear-down', 'Landing Gear', 'DOWN', 'PF', {
      action: [
        'Complete the Landing Checklist (if not previously completed). The PM is responsible for making radio calls.',
        'If altitude and/or airspeed do not permit lowering of the flaps and landing gear, inform the PM and Tower you are holding the landing gear until reaching the pattern profile.',
        'If the Landing Checklist is interrupted, it shall be reinitiated from the beginning.',
      ],
    }),
    note('Maintain a minimum of 110 KIAS to the 90. The Landing Checklist shall be complete no later than the 90.'),
  ],
};

const CASE_4 = {
  id: 'case-4',
  title: 'Case 4. Approach Turn',
  rows: [
    item('c4-power', 'Power', 'As Required', 'PF', {
      action: [`Add power on the operating engine (as required) while maintaining 110 KIAS minimum, ${BALL} and continue the approach turn. Do not raise the landing gear unless executing a wave-off.`],
    }),
    note('When a fire/fuel leak is discovered past the 180 position, only the first three memory items of the Emergency Shutdown Checklist are required. You may complete the checklist if able, but not at the expense of maintaining solid BAW.'),
    ...firstThree('c4'),
    note('After a wave-off is executed, the pilot should call for the remainder of the applicable procedure/checklist as appropriate. Once the memory items have been completed, the remainder of the checklist will be completed on deck.'),
  ],
};

const CASE_5 = {
  id: 'case-5',
  title: 'Case 5. After the 90',
  rows: [
    item('c5-power', 'Power', 'As Required', 'PF', {
      action: ['Only slight additional power is normally required. The need for power is usually most noticeable nearing the runway. Maintain directional control and crosswind corrections, ensuring sufficient power to sustain 110 KIAS to the threshold.'],
    }),
    note('Accomplish the first three memory items (optional); however, do not sacrifice aircraft control to complete the memory items.'),
    ...firstThree('c5'),
    note('In the event the memory items cannot be accomplished, indicate that you will land the aircraft and then deal with the emergency on the deck.'),
  ],
};

export const T44C_CASES = [CASE_1, CASE_2, CASE_3, CASE_4, CASE_5];
