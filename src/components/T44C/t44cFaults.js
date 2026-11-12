// Chaos: the things a T-44C normal checklist step is checked for, made to go wrong at random
// (the user, 2026-11-04). With the chaos slider above zero, each step listed here may draw one of
// its faults as it comes up; the student presses Discrepancy on seeing it, which puts it right
// (t44cEngineStore.js `discrepancy`) and says what could have caused it. Carrying on past it
// marks the step wrong and says the same.
//
// Pure data, read by t44cEngine.js (each fault's effect on the gauges and lights, by `id`) and
// the store (the drawing, and when it shows). A fault:
//
//   procedure, step   where it may be drawn: the step's id in t44cNormals.js
//   at                the event key after which it shows (a step's control, `<step>:<piece>` or
//                     `<step>#<n>`, as STEP_EVENTS keys them), or a function of the fault's
//                     drawn `params` giving one; neither, and it shows at once
//   when              instead, a test of the engine state (and params) for the moment it shows;
//                     with an `at` too, tested only once that control has gone in
//   early             a standing condition, drawn as the card opens rather than as its step
//                     does, so it shows before the step as it would in the aeroplane (with
//                     `when`, from when it could first be seen); it is still gone past only by
//                     a click on a later step
//   late              on Engine Runup 8, the last step, whose power levers run the test on
//                     their own: gone past when that test ends without a Discrepancy
//   pick(rand)        its random parameters: a side, a reading
//   what(params)      what the student saw, said once it is found or missed
//   causes(params)    what could cause it, from the publications (cited in the comments; the
//                     few the publications do not give are marked as the site's)
//
// The faults left out on purpose (the user, 2026-11-04): Before Start 9's FAULT WARNING not
// cancelling, every After Start 3 fault, Engine Runup 5's N1 out of rig, and the Engine Runup 8
// faults no publication gives a cause for. Engine Runup 4's two came back once the sim showed
// them (the user's notes, 2026-11-08).

const side = (rand) => (rand() < 0.5 ? 'L' : 'R');
const name = (s) => (s === 'L' ? 'left' : 'right');
const LH = (s) => (s === 'L' ? 'LH' : 'RH');
const oneOf = (rand, list) => list[Math.floor(rand() * list.length)];
const between = (rand, lo, hi) => lo + rand() * (hi - lo);

// Every cell of the annunciator panel as the poster draws it, left to right, top row then bottom
// (t44cPoster.js `lampTest`): all 30 light in the lamp test, the blank ones and those the model
// never lights included (the user, 2026-11-05). Null is a blank cell; its place says which.
export const LAMP_CELLS = [
  'LH GEN OUT', 'LH FUEL PRESSURE', 'LH NO FUEL TRANSFER', null, null, null, 'PROP SYNC ON',
  'CABIN DOOR OPEN', 'FUEL CROSSFEED', 'BAGGAGE DOOR OPEN', null, null, 'RH NO FUEL TRANSFER',
  'RH FUEL PRESSURE', 'RH GEN OUT',
  'LH FIRE', 'LH IGN IND', 'LH AUTOFEATHER ARMED', 'L CHIP DETECT', 'LH AUTO IGNITION ARMED', null,
  null, 'ALT WARN', 'PROP REV NOT READY', null, 'RH AUTO IGNITION ARMED', 'R CHIP DETECT',
  'RH AUTOFEATHER ARMED', 'RH IGN IND', 'RH FIRE',
];
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth',
  'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth'];
const cellName = (i) => LAMP_CELLS[i]
  || `The blank light ${ORDINAL[i % 15]} from the left in the ${i < 15 ? 'top' : 'bottom'} row`;

// The anti-ice heaters of the Full Anti-Ice/Deice Check, step 2, by sub-step.
export const HEATERS = { ai2a: 'pitot', ai2b: 'stall', ai2c: 'lip', ai2d: 'vent', ai2e: 'wshld' };
const HEATER_NAMES = { pitot: 'the pitot heat', stall: 'stall heat', vent: 'the fuel vent heat', wshld: 'windshield anti-ice' };

const CROSSFEED_CIRCUIT = 'the same circuit opens the crossfeed valve and lights FUEL CROSSFEED';
const PARALLELING = 'An automatic paralleling fault in a generator control box: the generators are paralleled to balance the load between them.';
const FLIGHT_IDLE_STOPS = 'The propeller flight idle stops out of adjustment (a Low Pitch Torque check finds them).';
const LOAD_AT_LOW_N1 = 'A high generator load at low N1, which can take ITT past its limit.';
// The bottoms of the autofeather switches' tolerances: 410 - 50 and 200 - 40 (NATOPS §2.8.1.1).
const AF_LOW = { arm: 360, feather: 160 };
const BLEED_SUPPLY = 'The bleed air supply to the pneumatic system: its check valves or the 18 psi regulator.';

export const FAULTS = [
  // Before Start 8. NATOPS §2.9.6.2 (and its note), §2.9.5, §10.4 g and h.
  { id: 'bs-xfeed-dark', procedure: 'before-start', step: 'bs8', at: 'bs8#3',
    what: () => 'FUEL CROSSFEED did not light with the crossfeed OPEN.',
    causes: () => [`The crossfeed valve not opening: ${CROSSFEED_CIRCUIT}.`] },
  { id: 'bs-xfeed-stuck', procedure: 'before-start', step: 'bs8', at: 'bs8#4',
    what: () => 'FUEL CROSSFEED stayed lit with the crossfeed CLOSED.',
    causes: () => [`A crossfeed valve malfunction with the light held on: ${CROSSFEED_CIRCUIT}.`] },
  { id: 'bs-boost-nodraw', procedure: 'before-start', step: 'bs8', pick: (r) => ({ side: side(r) }),
    // Seen with its switch on, battery or not: the ammeter is on the hot battery bus (the user,
    // 2026-11-10).
    when: (s, p) => s.fuelSys.boost[p.side],
    what: (p) => `The ${name(p.side)} boost pump drew nothing on the battery ammeter.`,
    causes: () => ['A failed boost pump.', 'Its BOOST PUMP circuit breaker on the fuel panel, or its fuse on the hot battery bus.'] },
  { id: 'bs-fuelpress', procedure: 'before-start', step: 'bs8', pick: (r) => ({ side: side(r) }),
    when: (s) => s.elec.battery,
    what: (p) => `${LH(p.side)} FUEL PRESSURE stayed lit with the battery ON.`,
    causes: () => ['A failed boost pump.', 'The firewall valve still closed: the FUEL PRESSURE lights stay on with the boost pumps on until the firewall valves open.'] },
  // Before Start 9. NATOPS §7.2: the press-to-test checks are for faulty bulbs.
  { id: 'bs-bulb', procedure: 'before-start', step: 'bs9', at: 'bs9:Press to Test',
    pick: (r) => ({ cell: Math.floor(r() * LAMP_CELLS.length) }),
    what: (p) => `${cellName(p.cell)} did not light in the lamp test.`,
    causes: () => ['A burned-out bulb.'] },
  // Before Start 10, drawn as one turn of the switch, since the poster's knob cannot be turned
  // through its zones (the user, 2026-11-05). Three cases, each with its own causes (the user,
  // 2026-11-11), all from NATOPS §2.5 and §2.5.1 (p. 2.5-1): one side dark (each position checks
  // a detector and its circuits, a control amplifier and three detectors a nacelle); both dark
  // (the one FIRE DETR circuit breaker protects the system, and must be closed for the test); a
  // FIRE light on when it should not be (on the ground a cowling not closed properly, or the
  // aircraft headed toward a strong external light, gives an erroneous indication).
  { id: 'bs-fire-zone', procedure: 'before-start', step: 'bs10', pick: (r) => ({ side: side(r) }),
    // Not seen under bs-fire-all, which darkens both sides (at 100 percent both are drawn).
    when: (s) => !!s.fireZone && !(s.faults || []).some((f) => f.id === 'bs-fire-all'),
    what: (p) => `${LH(p.side)} FIRE and its FIRE EXT light did not light in the fire detector test.`,
    causes: () => ['A detector on that side, or its circuits.'] },
  { id: 'bs-fire-all', procedure: 'before-start', step: 'bs10',
    when: (s) => !!s.fireZone,
    what: () => 'No FIRE, FIRE EXT or FAULT WARNING light came on in the fire detector test.',
    causes: () => ['The FIRE DETR circuit breaker open. It protects the whole system and must be closed for the test.'] },
  { id: 'bs-fire-false', procedure: 'before-start', step: 'bs10', pick: (r) => ({ side: side(r) }),
    when: (s) => s.fireZone === 0,
    what: (p) => `${LH(p.side)} FIRE and its FIRE EXT light stayed lit with the test switch back at OFF.`,
    causes: () => ['An engine cowling not closed properly, or the aircraft headed toward a strong external light. Close the cowling or change heading for a valid check.'] },
  // Before Start 11. NATOPS Figure 12.2-1.
  { id: 'bs-door', procedure: 'before-start', step: 'bs11', early: true, when: (s) => s.elec.battery,
    what: () => 'CABIN DOOR OPEN stayed lit.',
    causes: () => ['The cabin door open or not secure.'] },

  // Left start 14. NATOPS Figure 4-1 notes 6 and 7; ME FTI Start 14.
  // A little rise is normal (about 45 °C at a load of 1.00, 9715; the model's normal start peaks
  // near 624); the fault is a spike past 850 (the user, 2026-11-08), a discrepancy from 640 on
  // (the user, 2026-11-10).
  { id: 'sl-itt-rise', procedure: 'start-left', step: 'sl14', when: (s) => s.engines.R.itt > 640,
    what: () => 'The right ITT rose past 640 °C with the right generator carrying the left start.',
    causes: () => [LOAD_AT_LOW_N1] },
  // Left start 21. NATOPS §2.10 and Start step 21's note. The current limiters are taken as good
  // before either start, so the gauge goes to zero only once the right generator is off after the
  // left start, which is what step 21 checks for (the user, 2026-11-08).
  { id: 'sl-fuel-zero', procedure: 'start-left', step: 'sl21', pick: (r) => ({ side: side(r) }),
    when: (s) => !s.engines.R.gen && s.engines.L.lit && s.engines.L.starter === 'off',
    what: (p) => `The ${name(p.side)} fuel quantity gauge read zero.`,
    causes: () => ['A failed current limiter on that side.'] },
  // Left start 22. NATOPS §2.10; the overvoltage and undervoltage figures are the Systems
  // Handout's.
  { id: 'sl-gen-out-R', procedure: 'start-left', step: 'sl22', at: 'sl22', params: { side: 'R' },
    what: () => 'RH GEN OUT stayed lit: the right generator did not come on line.',
    causes: () => ['The generator control box took it off line, for overvoltage (31 V), undervoltage (18 V) or reverse current.',
      'The switch not taken through RESET before ON.'],
    reset: [{ side: 'R', gen: true }] },
  { id: 'sl-gen-out-L', procedure: 'start-left', step: 'sl22b', at: 'sl22b', params: { side: 'L' },
    what: () => 'LH GEN OUT stayed lit: the left generator did not come on line.',
    causes: () => ['The generator control box took it off line, for overvoltage (31 V), undervoltage (18 V) or reverse current.',
      'The switch not taken through RESET before ON.'],
    reset: [{ side: 'L', gen: true }] },
  { id: 'sl-gen-split', procedure: 'start-left', step: 'sl22b', at: 'sl22b', pick: (r) => ({ side: side(r) }),
    what: () => 'The generator loads were not within 0.1 of each other.',
    causes: () => [PARALLELING] },

  // After Start 2. Systems Handout, generator control boxes: 28.25 ±0.8 V.
  { id: 'as-volts', procedure: 'after-start', step: 'as2',
    pick: (r) => ({ side: side(r), volts: oneOf(r, ['26.90', '27.20', '29.30', '29.60']) }),
    when: (s, p) => s.t < ((s.voltsUntil || {})[p.side] ?? -1),
    what: (p) => `The ${name(p.side)} bus read ${p.volts} V, outside 27.45 to 29.05.`,
    causes: () => ['Voltage regulation in that generator\'s control box, which holds 28.25 ±0.8 V.'] },
  // After Start 6. NATOPS §2.9.4, §2.9.4.2 note, §2.9.4.3; ME FTI After Start 6 note.
  { id: 'as-transfer', procedure: 'after-start', step: 'as6', pick: (r) => ({ side: side(r) }),
    at: (p) => (p.side === 'L' ? 'as6#2' : 'as6#4'),
    what: (p) => `${LH(p.side)} NO FUEL TRANSFER did not flicker as the ${name(p.side)} pump went to AUTO.`,
    causes: () => ['A failed transfer pump.', 'Its TRANSFER PUMP circuit breaker.',
      'Under 42 gallons in the nacelle tank, too little for a proper test.', 'The annunciator dim set too low to see the flicker.'] },
  // After Start 7. NATOPS §2.9.6.1: with a fuel bus lost or the pressure warning circuit faulty,
  // the valve gets no signal to open and the FUEL PRESSURE light does not light either. §2.9.5
  // and Figure 12.2-1: a failed boost pump in AUTO leaves the valve open and FUEL CROSSFEED on.
  { id: 'as-xfeed-noopen', procedure: 'after-start', step: 'as7', pick: (r) => ({ side: side(r) }),
    at: (p) => (p.side === 'L' ? 'as7#2' : 'as7#5'),
    what: (p) => `Neither ${LH(p.side)} FUEL PRESSURE nor FUEL CROSSFEED lit with the ${name(p.side)} boost pump OFF.`,
    causes: () => ['No signal to open the crossfeed valve from that side: a lost fuel bus, or a faulty pressure warning circuit.'] },
  { id: 'as-boost-failed', procedure: 'after-start', step: 'as7', pick: (r) => ({ side: side(r) }),
    at: (p) => (p.side === 'L' ? 'as7#3' : 'as7#6'),
    what: (p) => `FUEL CROSSFEED stayed lit with the ${name(p.side)} boost pump back ON.`,
    causes: () => ['A failed boost pump, still giving no pressure.'] },
  { id: 'as-xfeed-stuck', procedure: 'after-start', step: 'as7', pick: (r) => ({ side: side(r) }),
    at: (p) => (p.side === 'L' ? 'as7#4' : 'as7#7'),
    what: () => 'FUEL CROSSFEED stayed lit after CLOSED, then AUTO.',
    causes: () => [`A crossfeed valve malfunction with the light held on: ${CROSSFEED_CIRCUIT}.`] },
  // After Start 8. NATOPS §2.10; ME FTI After Start 8 and NATOPS Figure 4.3-1.
  { id: 'as-load-split', procedure: 'after-start', step: 'as8', early: true, pick: (r) => ({ side: side(r) }),
    what: () => 'The generator loads were not within 0.1 of each other.',
    causes: () => [PARALLELING] },
  { id: 'as-load-high', procedure: 'after-start', step: 'as8', early: true,
    what: () => 'The generator loads were above .5.',
    causes: () => ['The battery still recharging after the starts, or a high electrical load: N1 is raised to carry it.'] },

  // Engine Runup 3, once both levers are set. NATOPS Figure 4-1 notes 2, 3, 6, 7 and 10.
  { id: 'er-np-idle', procedure: 'engine-runup', step: 'er3', at: 'er3#2',
    pick: (r) => ({ side: side(r), np: oneOf(r, [850, 870, 1130, 1160]) }),
    what: (p) => `The ${name(p.side)} prop read ${p.np} rpm at idle, outside 900 to 1100.`,
    causes: () => [FLIGHT_IDLE_STOPS] },
  { id: 'er-itt-idle', procedure: 'engine-runup', step: 'er3', at: 'er3#2', pick: (r) => ({ side: side(r) }),
    what: (p) => `The ${name(p.side)} ITT read above 685 °C at idle.`,
    causes: () => [LOAD_AT_LOW_N1] },
  { id: 'er-oil-low', procedure: 'engine-runup', step: 'er3', at: 'er3#2',
    pick: (r) => ({ side: side(r), psi: oneOf(r, [32, 35, 37]) }),
    what: (p) => `The ${name(p.side)} oil pressure read ${p.psi} psi, under 40.`,
    // The cause is the site's: NATOPS gives only the action (shutdown below 40 psi on the ground).
    causes: () => ['Low oil quantity or an oil pump problem.'] },
  { id: 'er-n1-idle', procedure: 'engine-runup', step: 'er3', at: 'er3#2',
    pick: (r) => ({ side: side(r), n1: oneOf(r, ['50.2', '50.6', '55.4', '55.8']) }),
    what: (p) => `The ${name(p.side)} N1 read ${p.n1} percent at LOW IDLE, outside 51 to 54.`,
    // The site's: NATOPS's own cause (above 3,500 feet pressure altitude) does not apply at
    // Corpus; its Runup 8 caution speaks of a worn low idle stop.
    causes: () => ['A worn or misrigged low idle stop.'] },
  // Engine Runup 4, as the sim showed them (the user's notes, 2026-11-08). The causes are the
  // site's: NATOPS's Runup 4 note speaks only of the idle rpm afterwards.
  { id: 'er-mf-nofeather', procedure: 'engine-runup', step: 'er4', pick: (r) => ({ side: side(r) }),
    when: (s, p) => { const o = s.engines[p.side === 'L' ? 'R' : 'L']; return s.engines[p.side].prop === 'feather' && o.prop === 'feather' && o.np < 850 && s.engines[p.side].np > 900; },
    what: (p) => `The ${name(p.side)} prop did not feather with its lever at FEATHER.`,
    causes: () => ['The prop lever rigging to the governor\'s feathering valve, or the prop\'s feathering mechanism.'] },
  { id: 'er-mf-slow', procedure: 'engine-runup', step: 'er4', pick: (r) => ({ side: side(r) }),
    when: (s, p) => { const e = s.engines[p.side]; const o = s.engines[p.side === 'L' ? 'R' : 'L']; return e.visitedFeather && e.prop === 'fwd' && o.np > 900 && e.np < 750; },
    what: (p) => `The ${name(p.side)} prop was slow to come out of feather.`,
    causes: () => ['Low governor oil pressure to unfeather the prop, or the prop governor itself.'] },

  // Engine Runup 5. NATOPS Runup 5 (70 percent N1 or above), §2.20.6; Systems Handout (suction is
  // made from bleed air through a venturi).
  { id: 'er-short-idle', procedure: 'engine-runup', step: 'er5', at: 'er5#1',
    when: (s) => SETTLED(s) && s.engines.L.n1 < 66,
    what: () => 'N1 stopped short of 70 percent, and pneumatic pressure read under 12 psi.',
    causes: () => ['The condition levers not fully at HIGH IDLE: the check is made at 70 percent N1 or above.'] },
  { id: 'er-bleed-low', procedure: 'engine-runup', step: 'er5', at: 'er5#1',
    when: (s) => s.engines.L.n1 > 69,
    what: () => 'Pneumatic pressure read under 12 psi and suction under 4.3 in Hg at HIGH IDLE.',
    causes: () => [BLEED_SUPPLY] },
  // Engine Runup 6. NATOPS §2.8.3 and §2.8.3.1.
  { id: 'er-osg-fail', procedure: 'engine-runup', step: 'er6', at: 'er6#3',
    when: (s) => s.engines.L.np > 2110 || s.engines.R.np > 2110,
    what: () => 'Prop rpm went past 2100 with the PROP GOV TEST switch held, toward 2350.',
    causes: () => ['The test solenoid not resetting the overspeed governor to 1,900 to 2,100 rpm, or its PROP GOV circuit breaker.',
      'The overspeed governor itself.'] },
  // Engine Runup 7. NATOPS §15.14.1 for the second; the first's cause is the site's.
  { id: 'er-pgov-detent', procedure: 'engine-runup', step: 'er7',
    pick: (r) => ({ side: side(r), np: oneOf(r, [1540, 1560, 1840, 1860]) }),
    when: (s, p) => s.engines[p.side].prop === 'detent' && Math.abs(s.engines[p.side].np - p.np) < 20,
    what: (p) => `The ${name(p.side)} prop settled at ${p.np} rpm at the detent, outside 1600 to 1800.`,
    causes: () => ['The primary governor, or the prop lever rigging.'] },
  { id: 'er-pgov-return', procedure: 'engine-runup', step: 'er7', pick: (r) => ({ side: side(r) }),
    when: (s, p) => { const e = s.engines[p.side]; return e.visitedDetent && e.prop === 'fwd' && Math.abs(e.dnp) < 5 && e.np < 1850; },
    what: (p) => `The ${name(p.side)} prop did not come back to about 1900 rpm.`,
    causes: () => ['A primary governor malfunction.'] },
  // Engine Runup 8. ME FTI Runup 8d; NATOPS §2.8.1.1 (two torque-sensing switches, 410 ±50 and
  // 200 ±40, driving a dump valve through an autofeather relay).
  { id: 'er-af-dark', procedure: 'engine-runup', step: 'er8', at: 'er8', late: true, pick: (r) => ({ side: side(r) }),
    what: (p) => `${LH(p.side)} AUTOFEATHER ARMED did not light with the test switch held.`,
    causes: () => ['The power levers too far back: advance them slightly.'] },
  // Each is seen the moment the light changes outside its tolerance, or, a switch that is late,
  // once torque is below the tolerance's bottom (360, 160) with the light unchanged: the student
  // has to wait that long before saying so, and the test is stopped there (the user, 2026-11-08).
  { id: 'er-swap', procedure: 'engine-runup', step: 'er8', late: true, reset: [{ stopTest: true }],
    pick: (r) => ({ side: side(r), arm: Math.round(r() < 0.5 ? between(r, 300, 340) : between(r, 470, 500)) }),
    when: (s, p) => s.afTest && !!s.script && s.engines[p.side].trq < Math.max(p.arm, AF_LOW.arm),
    what: (p) => `The ${name(p.side)} lights swapped at ${p.arm} lb-ft, outside 410 ±50.`,
    causes: () => ['The 410 lb-ft torque-sensing switch on that engine out of tolerance.'] },
  { id: 'er-flash', procedure: 'engine-runup', step: 'er8', late: true, reset: [{ stopTest: true }],
    pick: (r) => ({ side: side(r), feather: Math.round(r() < 0.5 ? between(r, 120, 150) : between(r, 245, 270)) }),
    when: (s, p) => s.engines[p.side].feathering
      || (s.afTest && !!s.script && p.feather < AF_LOW.feather && s.engines[p.side].trq < AF_LOW.feather && s.engines[p.side].pwr > 0),
    what: (p) => `${LH(p.side)} AUTOFEATHER ARMED began flashing at ${p.feather} lb-ft, outside 200 ±40.`,
    causes: () => ['The 200 lb-ft torque-sensing switch on that engine out of tolerance.'] },
  { id: 'er-nofeather', procedure: 'engine-runup', step: 'er8', late: true, reset: [{ stopTest: true }], pick: (r) => ({ side: side(r) }),
    when: (s, p) => s.engines[p.side].feathering,
    what: (p) => `${LH(p.side)} AUTOFEATHER ARMED flashed, but the prop did not feather.`,
    causes: () => ['The autofeather relay, or the dump valve that releases the oil holding the blade angle.'] },

  // Before Takeoff 14. NATOPS Before Takeoff 14 note.
  { id: 'bt-fuel', procedure: 'before-takeoff', step: 'bt14', early: true, pick: (r) => ({ side: side(r) }),
    what: () => 'The two fuel gauges were more than 100 lb apart.',
    causes: () => ['Uneven fuel, or a fuel quantity gauging fault: note it for maintenance before the next flight.'] },

  // Full Anti-Ice/Deice Check 1. NATOPS §15.16 and §2.20.5 (the element, slip ring and brush
  // block are its parts; which of them is the site's).
  { id: 'ai-amps', procedure: 'anti-ice-check', step: 'ai1', at: 'ai1',
    pick: (r) => ({ amps: oneOf(r, ['0.0', '11.5', '12.5', '19.5', '21.0', '24.5']) }),
    what: (p) => `Prop amps read ${p.amps}, outside 14 to 18.`,
    causes: (p) => (Number(p.amps) === 0
      ? ['The prop deice switch not ON, or the system inoperative.']
      : ['A heating element, the slip ring or the brush block.']) },
  // Full Anti-Ice/Deice Check 2. NATOPS §19.1.4 and §2.20.3.2 for the lip boots; the dead
  // heater's cause is the site's.
  ...['ai2a', 'ai2b', 'ai2d', 'ai2e'].map((step) => ({
    id: `ai-heat-dead-${step}`, procedure: 'anti-ice-check', step, at: step, params: { heater: HEATERS[step] },
    what: () => `The generator load did not rise with ${HEATER_NAMES[HEATERS[step]]} on.`,
    causes: () => ['That heater\'s element, or its switch breaker.'] })),
  { id: 'ai-lip-rise', procedure: 'anti-ice-check', step: 'ai2c', at: 'ai2c',
    what: () => 'The generator load rose with the engine lip boots on, on the ground.',
    causes: () => ['A malfunction in the squat switch circuitry: the lip boots work only in flight.'] },
  // Full Anti-Ice/Deice Check 5. NATOPS §2.20.6.
  { id: 'ai-pneu-low', procedure: 'anti-ice-check', step: 'ai5', at: 'ai5',
    what: () => 'Pneumatic pressure read under 12 psi with the boots cycling.',
    causes: () => [BLEED_SUPPLY] },
];

// Both engines steady (Engine Runup 5's short HIGH IDLE has to have stopped climbing to show).
function SETTLED(s) {
  return ['L', 'R'].every((k) => Math.abs(s.engines[k].dn1) < 0.2);
}

export const faultById = (id) => FAULTS.find((f) => f.id === id);
// A procedure's faults for one step, or all of them with no step.
export const faultsFor = (procedure, step) => FAULTS.filter((f) => f.procedure === procedure && (step === null || f.step === step));

// A fault drawn for a step: its id, its parameters, and whether it shows yet.
export function drawFault(def, rand = Math.random) {
  const params = { ...(def.params || {}), ...(def.pick ? def.pick(rand) : {}) };
  return { id: def.id, params, seen: !def.at && !def.when, at: typeof def.at === 'function' ? def.at(params) : def.at || null };
}

// What the drill says about a fault, found or missed.
export function faultText(fault) {
  const def = faultById(fault.id);
  return { what: def.what(fault.params), causes: def.causes(fault.params) };
}
