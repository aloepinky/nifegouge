// The TH-73A's memory items and operating limits, from the NATOPS flight manual, NAVAIR
// 01-H73A-1 (15 FEBRUARY 2026). Pure data, no JSX — the shape `EPDrill` renders (see
// T54A/t54aData.js).
//
// There is no exam sheet to copy. The Advanced helicopter syllabus (CNATRAINST 1542.186D, NAT01)
// sets an open-book and a closed-book NATOPS exam and nothing narrower, so:
//
//   * The EPs are every Chapter 12 procedure that carries an asterisked step. "Items indicated
//     with an asterisk (*) are considered Memory Items and shall be completed without reference to
//     the checklist" (§12.1.1). Only the asterisked steps are here; the non-memory steps that
//     follow them in some procedures (Engine RGB Chip's "6. Continue flight.") are the pocket
//     checklist's. The conditional lines the NATOPS prints between steps ("If fire is confirmed:")
//     are kept as decision lines. 37 procedures; the two Engine Chip tables and the two Fuel
//     Control System tables are each two procedures, as the NATOPS prints them.
//   * The limits are a selection from Chapter 4 (TH73ALimits.js says which), not a publication's
//     sheet.
//
// Every procedure was read off the rendered page, not the text extraction: the NATOPS prints each
// one as a LEGEND / CAUSE/REMARKS / CORRECTIVE ACTION table and pdftotext loses step 1 of most of
// them. The NATOPS wording is kept, down to its capitals ("START push-button", "STARTER
// pushbutton", "Fuel Panel switches" and "Fuel panel switches"), with the site's " - " between
// control and setting and the step's closing period dropped where the step is a control and a
// setting. A step that is a sentence keeps its period.
//
// A row is a step ({ id, critical, text }: one box, answered as the NATOPS prints it) or a
// decision line ({ decision }). Every step here is a memory item, so every one is asterisked; the
// TH-73A has no dagger.

const step = (id, action, value = '') => ({ id, critical: true, text: value ? `${action} - ${value}` : action });

export const TH73A_EPS = [
  // 12.3.1 Engine Failures
  {
    id: 'eng-fail-hover-ige',
    title: 'Engine Failure (Hover IGE)',
    rows: [
      step('hige1', 'Collective', 'Maintain initially then increase to cushion the touchdown'),
      step('hige2', 'Pedals', 'Control yaw rate'),
      step('hige3', 'Cyclic', 'Adjust to obtain skid level attitude'),
    ],
  },
  {
    id: 'eng-fail-takeoff',
    title: 'Engine Failure (Takeoff)',
    rows: [
      step('efto1', 'Collective', 'Lower immediately to stop NR decay'),
      step('efto2', 'Pedals', 'Control yaw rate'),
      step('efto3', 'Autorotative Landing', 'Complete'),
    ],
  },
  {
    id: 'eng-fail-hover-oge',
    title: 'Engine Failure (Hover OGE)',
    rows: [
      step('hoge1', 'Collective', 'Lower immediately to stop NR decay'),
      step('hoge2', 'Pedals', 'Control yaw rate'),
      step('hoge3', 'Cyclic', 'Forward to increase airspeed'),
      step('hoge4', 'Autorotative Landing', 'Complete'),
    ],
  },
  {
    id: 'eng-fail-cruise',
    title: 'Engine Failure (Cruise)',
    rows: [
      step('efcr1', 'Collective', 'Lower immediately to stop NR decay'),
      step('efcr2', 'Pedals', 'Control yaw rate'),
      step('efcr3', 'Cyclic', 'Adjust to desired airspeed'),
      { decision: 'If time and altitude permit:' },
      step('efcr4', 'MAYDAY', 'Transmit'),
      step('efcr5', 'Transponder', '7700'),
      step('efcr6', 'Engine Restart in Flight', 'As required'),
      { decision: 'If engine remains off/failed:' },
      step('efcr7', 'Autorotative Landing', 'Complete'),
    ],
  },
  {
    id: 'engine-restart-in-flight',
    title: 'Engine Restart in Flight',
    rows: [
      step('erif1', 'GEN switch', 'OFF'),
      step('erif2', 'Twist grip', 'OFF'),
      step('erif3', 'START push-button', 'Press and release'),
      { decision: 'When N1 reaches 10-20%:' },
      step('erif4', 'Twist grip', 'IDLE'),
      { decision: 'When starter drops out and N1 61 ±1%:' },
      step('erif5', 'Twist grip', 'FLT'),
      step('erif6', 'GEN switch', 'ON'),
    ],
  },
  // 12.3.2 Autorotation
  {
    id: 'autorotative-landing',
    title: 'Autorotative Landing',
    rows: [
      { decision: 'At approximately 150 feet:' },
      step('auto1', 'Cyclic', 'Flare to reduce forward speed'),
      { decision: 'At approximately 20-30 feet AGL:' },
      step('auto2', 'Collective', 'Increase to reduce rate of descent'),
      step('auto3', 'Cyclic', 'Forward to obtain skid level attitude'),
      step('auto4', 'Collective', 'Continue application to cushion touchdown'),
      step('auto5', 'Pedals', 'Maintain direction'),
      step('auto6', 'Emergency shutdown', 'Complete'),
    ],
  },
  // 12.3.3 Engine Oil System
  {
    id: 'engine-oil-pressure-low',
    title: 'Engine Oil Pressure Low',
    rows: [
      { decision: 'Engine oil pressure below 40 psi or 40-80 psi and decreasing:' },
      step('eopl1', 'Reduce power.'),
      step('eopl2', 'Monitor engine parameters.'),
      step('eopl3', 'Land as soon as possible.'),
    ],
  },
  {
    id: 'engine-oil-temperature-high',
    title: 'Engine Oil Temperature High',
    rows: [
      step('eoth1', 'Reduce power.'),
      step('eoth2', 'Monitor engine parameters.'),
      step('eoth3', 'Land as soon as possible.'),
    ],
  },
  // 12.3.4
  {
    id: 'abort-start',
    title: 'Abort Start',
    rows: [
      step('abst1', 'Twist grip', 'OFF'),
      step('abst2', 'IGN switch', 'OFF'),
      step('abst3', 'STARTER pushbutton', 'Continue to operate until ITT decreases to normal range'),
      step('abst4', 'Fuel Panel switches', 'OFF/CLOSED'),
    ],
  },
  // 12.3.5
  {
    id: 'engine-compressor-stall',
    title: 'Engine Compressor Stall',
    rows: [
      step('ecs1', 'Collective', 'Lower to clear the stall'),
      step('ecs2', 'Airspeed', '60-70 KIAS level flight'),
      step('ecs3', 'Land as soon as possible.'),
    ],
  },
  // 12.3.7 Malfunction of the Fuel Control System: two tables, overspeed and underspeed
  {
    id: 'fuel-control-overspeed',
    title: 'Malfunction of the Fuel Control System (Overspeed)',
    rows: [
      { decision: 'If the fuel control system malfunction causes an increase in power (overspeed):' },
      step('fcos1', 'Twist grip', 'Reduce until NR/N2 are in normal range'),
      step('fcos2', 'Collective/Twist grip', 'Coordinate'),
      step('fcos3', 'Land as soon as possible.'),
    ],
  },
  {
    id: 'fuel-control-underspeed',
    title: 'Malfunction of the Fuel Control System (Underspeed)',
    rows: [
      { decision: 'If the fuel control system malfunction causes a decrease in power (underspeed):' },
      step('fcus1', 'Collective', 'Lower to maintain NR'),
      step('fcus2', 'MAN/NOR selector', 'MAN'),
      step('fcus3', 'Twist grip', 'Slowly rotate toward MAX, as required'),
      step('fcus4', 'Collective/Twist grip', 'Coordinate'),
      step('fcus5', 'Land as soon as possible.'),
    ],
  },
  // 12.3.11 Engine Chip: two tables, RGB and AGB
  {
    id: 'engine-rgb-chip',
    title: 'Engine RGB Chip',
    rows: [
      step('rgb1', 'Reduce power.'),
      step('rgb2', 'Check for secondary indications.'),
      { decision: 'If secondary indications exist:' },
      step('rgb3', 'Land as soon as possible.'),
      { decision: 'The use of CHIP BURNER switch when the relative oil pressure is below limits is prohibited.' },
      { decision: 'If no secondary indications:' },
      step('rgb4', 'CHIP BURNER switch', 'Activate and release'),
      { decision: 'If the message does not extinguish or on the 4th ENG RGB CHIP message:' },
      step('rgb5', 'Land as soon as possible.'),
    ],
  },
  {
    id: 'engine-agb-chip',
    title: 'Engine AGB Chip',
    rows: [
      step('agb1', 'Reduce power.'),
      step('agb2', 'Land as soon as possible.'),
    ],
  },
  // 12.3.13
  {
    id: 'inadvertent-engine-shutdown',
    title: 'Inadvertent Engine Shutdown/Rapid Rise in ITT on Deck',
    rows: [
      step('ies1', 'Twist grip', 'OFF'),
      step('ies2', 'IGN switch', 'OFF'),
      step('ies3', 'GEN switch', 'OFF'),
      step('ies4', 'STARTER pushbutton', 'Press and hold until ITT decreases to normal range'),
      step('ies5', 'Fuel panel switches', 'OFF/CLOSED'),
    ],
  },
  // 12.5.1
  {
    id: 'transmission-malfunction',
    title: 'Transmission Malfunction',
    rows: [
      { decision: 'If failure is imminent:' },
      step('xmal1', 'Land immediately.'),
      { decision: 'If failure is not imminent:' },
      step('xmal2', 'Reduce power.'),
      step('xmal3', 'Monitor transmission parameters.'),
      step('xmal4', 'Land as soon as possible.'),
    ],
  },
  // 12.5.3
  {
    id: 'transmission-chip',
    title: 'Transmission Chip',
    rows: [
      { decision: 'If XMSN CHIP message is illuminated:' },
      step('xchp1', 'Check for secondary indications.'),
      { decision: 'If secondary indications exist:' },
      step('xchp2', 'Transmission Malfunction emergency procedure', 'Perform'),
      { decision: 'The use of CHIP BURNER switch when the relative oil pressure is below limits is prohibited.' },
      { decision: 'If no secondary indications:' },
      step('xchp3', 'CHIP BURNER switch', 'Activate and release'),
      { decision: 'If the message does not extinguish or on the 4th XMSN CHIP message:' },
      step('xchp4', 'Transmission Malfunction emergency procedure', 'Perform'),
    ],
  },
  // 12.6.1 Complete Loss of Tail Rotor Control
  {
    id: 'tail-rotor-thrust-hover',
    title: 'Loss of Tail Rotor Thrust in a Hover',
    rows: [
      step('trh1', 'Twist grip', 'IDLE'),
      step('trh2', 'Cyclic', 'Eliminate drift'),
      step('trh3', 'Collective', 'Increase to cushion the landing'),
    ],
  },
  {
    id: 'tail-rotor-thrust-cruise',
    title: 'Loss of Tail Rotor Thrust in Cruise Flight',
    rows: [
      step('trc1', 'Collective', 'Lower to eliminate yaw'),
      step('trc2', 'Airspeed', 'Adjust to reach a suitable landing site'),
      { decision: 'On reaching the point of intended landing:' },
      step('trc3', 'Autorotate.'),
      step('trc4', 'Twist grip', 'OFF prior to touchdown'),
    ],
  },
  // 12.6.3
  {
    id: 'tail-rotor-chip',
    title: 'Tail Rotor Chip',
    rows: [
      step('trch1', 'Reduce power.'),
      step('trch2', 'CHIP BURNER switch', 'Activate and release'),
      { decision: 'If the message does not extinguish or on the 4th TR BOX CHIP message:' },
      step('trch3', 'Land as soon as possible.'),
    ],
  },
  // 12.7.1
  {
    id: 'hydraulic-pressure-loss',
    title: 'Hydraulic System No. 1 or No. 2 Pressure Loss',
    rows: [
      step('hyd1', 'Establish VMC.'),
      step('hyd2', 'Avoid rapid movement of flight controls.'),
      step('hyd3', 'Airspeed', 'Reduce smoothly below 90 KIAS'),
      step('hyd4', 'Affected SERVO switch', 'OFF'),
      step('hyd5', 'Land as soon as possible.'),
    ],
  },
  // 12.9.8
  {
    id: 'emergency-dc-bus-failure',
    title: 'Emergency DC Bus Failure',
    rows: [
      { decision: 'If the EMER BUS circuit breaker has tripped, it may be reset (one attempt only) to potentially regain the Emergency Bus. If the Emergency Bus is regained, flight may be continued.' },
      step('edcb1', 'Land as soon as possible.'),
    ],
  },
  // 12.10.1
  {
    id: 'fuel-pump-failure',
    title: 'Fuel Pump 1 and/or Fuel Pump 2 Failure',
    rows: [
      { decision: 'If both pumps fail with 0 psi:' },
      step('fpf1', 'Land as soon as possible.'),
    ],
  },
  // 12.11 Fire Emergencies
  {
    id: 'engine-fire-in-flight',
    title: 'Engine Fire in Flight',
    rows: [
      step('efif1', 'Confirm fire.'),
      { decision: 'If fire is confirmed:' },
      step('efif2', 'Land immediately.'),
      { decision: 'If fire not confirmed:' },
      step('efif3', 'Land as soon as possible.'),
      { decision: 'When on deck:' },
      step('efif4', 'Emergency Shutdown', 'Complete'),
    ],
  },
  {
    id: 'cockpit-cabin-fire',
    title: 'Cockpit/Cabin Fire in Flight',
    rows: [
      step('ccf1', 'Air Conditioner/Vent/Heater switches', 'OFF'),
      step('ccf2', 'Vent knob', 'Push'),
      step('ccf3', 'Airspeed', 'Adjust, as required'),
      step('ccf4', 'Doors/Windows', 'Close'),
      { decision: 'If electrical source suspected:' },
      step('ccf5', 'Unnecessary electrical equipment', 'Secure'),
      step('ccf6', 'Fire extinguisher', 'As required'),
      { decision: 'If fire persists:' },
      step('ccf7', 'Land immediately.'),
      { decision: 'If fire extinguishes:' },
      step('ccf8', 'Land as soon as possible.'),
      { decision: 'When on deck:' },
      step('ccf9', 'Emergency Shutdown', 'Complete'),
    ],
  },
  {
    id: 'smoke-fume-elimination',
    title: 'Smoke/Fume Elimination',
    rows: [
      step('sfe1', 'VENT CKPT switch', 'ON'),
      step('sfe2', 'Vent knob', 'Pull'),
      step('sfe3', 'Airspeed', 'Adjust, as required'),
      step('sfe4', 'Doors/Windows', 'Open'),
      { decision: 'If smoke/fumes persist:' },
      step('sfe5', 'Slip or skid aircraft to eliminate smoke and fumes.'),
      step('sfe6', 'Land immediately.'),
      step('sfe7', 'Emergency Shutdown', 'Complete'),
      { decision: 'If smoke/fumes extinguish:' },
      step('sfe8', 'Land as soon as possible.'),
    ],
  },
  // 12.12 Ditching/Egress Emergencies
  {
    id: 'emergency-shutdown',
    title: 'Emergency Shutdown',
    rows: [
      step('esd1', 'Twist grip', 'OFF'),
      step('esd2', 'Fuel Panel switches', 'OFF/CLOSED'),
      step('esd3', 'Rotor brake', 'ON'),
      step('esd4', 'GEN switch', 'OFF'),
      step('esd5', 'BAT switch', 'OFF'),
      { decision: 'When rotor stops:' },
      step('esd6', 'Helicopter', 'Egress'),
    ],
  },
  {
    id: 'immediate-landing-ditching',
    title: 'Immediate Landing/Ditching',
    rows: [
      step('ild1', 'Crew and passengers', 'Alert'),
      step('ild2', 'Mayday', 'Transmit'),
      step('ild3', 'Transponder', '7700'),
      step('ild4', 'Doors', 'Open/Jettison, as required'),
      step('ild5', 'Landing light/Search light', 'As required'),
      { decision: 'When on deck:' },
      step('ild6', 'Emergency Shutdown', 'Complete'),
      { decision: 'If water landing:' },
      step('ild7', 'Underwater egress', 'Execute'),
    ],
  },
  {
    id: 'underwater-egress',
    title: 'Underwater Egress',
    rows: [
      step('uwe1', 'SEBD', 'Don, as required'),
      step('uwe2', 'Communication cords', 'Disconnect'),
      step('uwe3', 'Doors', 'Open/Jettison'),
      step('uwe4', 'Place hand on known reference point.'),
      { decision: 'Once all violent motion has stopped:' },
      step('uwe5', 'Harness', 'Release'),
      step('uwe6', 'Exit helicopter.'),
      { decision: 'After egress:' },
      step('uwe7', 'Swim clear and inflate LPU.'),
    ],
  },
  // 12.13.1 Weather Emergencies
  {
    id: 'lightning-strike',
    title: 'Lightning Strike',
    rows: [
      step('ltg1', 'Airspeed', 'Reduce below 80 KIAS'),
      step('ltg2', 'Maneuver smoothly.'),
      step('ltg3', 'Land as soon as possible.'),
    ],
  },
  {
    id: 'unusual-attitude-recovery',
    title: 'Unusual Attitude Recovery',
    rows: [
      step('uar1', 'Level Wings.'),
      step('uar2', 'Level the Nose.'),
      step('uar3', 'Center Ball.'),
      step('uar4', 'Stop any climb/descent.'),
      step('uar5', 'Control Airspeed.'),
      step('uar6', 'Regain Desired Flight Parameters.'),
    ],
  },
  // 12.13.5 External Hoist Malfunctions
  {
    id: 'hoist-load-jettison',
    title: 'Hoist Load Jettison',
    rows: [
      step('hlj1', 'HOIST CUT pushbutton guard', 'Lift. Verify HOIST CUT ARMD CAS message appears'),
      step('hlj2', 'HOIST CUT pushbutton', 'Press'),
    ],
  },
  {
    id: 'rescue-hoist-failure',
    title: 'Rescue Hoist Failure',
    rows: [
      step('rhf1', 'Cease hoisting.'),
    ],
  },
  {
    id: 'hoist-cable-fouled',
    title: 'Hoist Cable Fouled',
    rows: [
      step('hcf1', 'Pay out cable and attempt to free hang up.'),
    ],
  },
  {
    id: 'runaway-hoist',
    title: 'Runaway Hoist',
    rows: [
      step('rwh1', 'Notify Pilot.'),
      step('rwh2', 'Attempt to raise hoist.'),
      { decision: 'If payout continues:' },
      step('rwh3', 'HOIST OFF/ON control switch', 'OFF'),
    ],
  },
  // 12.13.9
  {
    id: 'rotor-brake-on',
    title: 'Rotor Brake On',
    rows: [
      { decision: 'In flight:' },
      step('rbo1', 'Rotor brake lever', 'Verify OFF'),
      step('rbo2', 'Land immediately.'),
      { decision: 'On the ground:' },
      step('rbo3', 'Rotor brake lever', 'Verify OFF'),
      step('rbo4', 'Emergency Shutdown', 'Complete'),
    ],
  },
  // 12.14.2.4
  {
    id: 'loss-of-torque-sensor-power',
    title: 'Loss of Torque Sensor Power',
    rows: [
      { decision: 'In any condition different from autorotation:' },
      step('ltsp1', 'Land as soon as possible.'),
    ],
  },
];

// Field key to answer, one per blank on the limits sheet (TH73ALimits.js lays it out). Ranges are
// written "min-max"; the checker accepts "min to max" too, and ignores units. A transient's time
// limit is written with its unit ("30 SECONDS", "5 MINUTES"), as the T-44C sheet's time column
// is; the checker folds "sec" and "min" onto those words. Every figure is NATOPS Chapter 4's,
// read off the rendered page; the section is named beside each group.
export const TH73A_LIMITS = {
  // §4.3 POWERPLANT LIMITATIONS: Figures 4.3-1 to 4.3-4
  n1Min: '51',
  n1Caut: '51-60',
  n1Cont: '60-100.1',
  n1Takeoff: '100.1-103.2',
  n1Max: '103.2',
  n1Trans: '103.8',
  n1TransTime: '30 SECONDS',

  n2Min: '95',
  n2Caut: '95-101',
  n2Cont: '101-103',
  n2Max: '103',
  n2Trans: '108',
  n2TransTime: '10 SECONDS',

  ittCont: '755',
  ittTakeoff: '755-810',
  ittMax: '810',
  ittTrans: '860',
  ittTransTime: '5 SECONDS',

  trqCont: '100',
  trqTakeoff: '100-108.5',
  trqMax: '108.5',
  trqTrans: '115',
  trqTransTime: '6 SECONDS',

  ittStartMax: '870',
  ittStartTrans: '1090',
  ittStartTransTime: '2 SECONDS',

  // §4.4 ROTOR LIMITATIONS (NR)
  nrOnMin: '95',
  nrOnCaut: '95-101',
  nrOnCont: '101-103',
  nrOnMax: '103',
  nrOnTrans: '108',
  nrOnTransTime: '10 SECONDS',

  nrOffTrans: '80',
  nrOffMin: '90',
  nrOffCont: '90-110',
  nrOffMax: '110',
  nrOffTransTime: '10 SECONDS',

  // §4.5 FUEL SYSTEM LIMITATIONS
  fuelPressCaut: '0-7',
  fuelPressCont: '7-25',
  fuelPressMax: '25',
  fuelReserve: '142',
  fuelMinLanding: '50',
  fuelSideward: '22',

  // §4.6 ENGINE LUBRICATION SYSTEM LIMITATIONS
  engOilPMin: '40',
  engOilPCaut: '40-80',
  engOilPCont: '80-110',
  engOilPMax: '110',
  engOilTCont: '10-115',
  engOilTMax: '115',
  engOilTTrans: '127',
  engOilTTransTime: '5 MINUTES',

  // §4.7 MAIN TRANSMISSION LUBRICATION SYSTEM LIMITATIONS
  xmsnOilPMin: '30',
  xmsnOilPCont: '30-55',
  xmsnOilPCaut: '55-70',
  xmsnOilPMax: '70',
  xmsnOilTCont: '0-115',
  xmsnOilTMax: '115',

  // §4.8 ENGINE STARTER LIMITATIONS
  battOn: '40',
  battOff: '60',
  battCool: '30',
  extOn: '25',
  extOff: '30',
  extCool: '30',

  // §4.9 and §4.10 GENERATOR LOAD LIMITATIONS
  genCont: '0-200',
  genMax: '200',
  genTrans: '300',
  genTransTime: '5 SECONDS',
  auxGenCont: '0-150',
  auxGenMax: '150',
  auxGenTrans: '150',
  auxGenTransTime: '5 SECONDS',

  // §4.11 HYDRAULIC SYSTEM LIMITATIONS
  hydMin: '1200',
  hydCaut: '1200-1400',
  hydCont: '1400-1600',
  hydMax: '1600',

  // §4.12 AIRSPEED LIMITATIONS (IAS), §4.18.2 and §4.19.3
  vnePlacard: '152',
  vneIfr: '145',
  vmini: '60',
  vminApp: '60',
  vmaxApp: '130',
  vMinAuto: '60',
  vTakeoffPower: '75',
  vDoorsOpen: '85',
  vDoorsMoving: '70',
  vSearchlight: '120',
  vTouchdown: '50',
  vOneHelipilot: '130',
  rocOneHelipilot: '750',
  vFdHelipilotInop: '100',

  // §4.13 ALTITUDE and §4.14 AMBIENT AIR TEMPERATURE LIMITATIONS
  maxAltitude: '15000',
  oatMin: '-25',
  oatMax: '50',
  oatLapse: '2',

  // §4.15 SLOPE TAKEOFF AND LANDING LIMITATIONS
  slopeNoseUp: '12',
  slopeSideUp: '10',
  slopeNoseDown: '2',
  slopeNoseDownClear: '5',

  // §4.16 WEIGHT LIMITATIONS
  gwGround: '6393',
  gwMax: '6283',
  gwMin: '3803',
  gwExternal: '6944',

  // §4.18 HELIPILOT and §4.19 FLIGHT DIRECTOR LIMITATIONS
  muhAttentive: '500',
  muhManual: '250',
  muhOneInop: '500',
  fdMuhCruise: '500',
  fdMuhApproach: '50',
  ilsGradient: '3.0',
  ilsDescent: '1000',

  // §4.20.5 and §4.20.2
  rotorBrakeNr: '40',
  chipBurnerMax: '3',

  // The figures in the grid's notes (TH73ALimits.js numbers them on the cells), as the T-44C
  // sheet asks the figures in its notes. The N2 caution's five percentages are five blanks.
  note2N1Idle: '60',
  note3N2Indicated: '103',
  note3ActualMin: '102.50',
  note3ActualMax: '103.49',
  note3TransientBegins: '103.01',
  note3Protracted: '103',
  note4IttTen: '870',
  note4IttTwo: '980',
  note5Split: '1',
  note6N1: '72',
  note7OilPress: '110',
  note8N1: '61',

  // §4.24 PROHIBITED MANEUVERS and §4.23 PROHIBITED OPERATIONS
  prohib1: 'AEROBATIC MANEUVERS',
  prohib2: 'PROTRACTED OPERATIONS IN THE AVOID AREAS OF THE HEIGHT VELOCITY DIAGRAM',
  prohib3: 'INTENTIONAL ENTRY INTO RETREATING BLADE STALL',
  prohibOp1: 'ICING CONDITIONS',
  prohibOp2: 'ANY DOORS OPEN/REMOVED OR AN EXTERNAL LOAD',
};

// Blanks asked together in Random mode: one row of the engine grid, one NR column, one system's
// pressures or temperatures, the two ends of a pair. Everything else is asked on its own.
export const TH73A_LIMIT_GROUPS = [
  ['n1Min', 'n1Caut', 'n1Cont', 'n1Takeoff', 'n1Max', 'n1Trans', 'n1TransTime'],
  ['n2Min', 'n2Caut', 'n2Cont', 'n2Max', 'n2Trans', 'n2TransTime'],
  ['ittCont', 'ittTakeoff', 'ittMax', 'ittTrans', 'ittTransTime'],
  ['trqCont', 'trqTakeoff', 'trqMax', 'trqTrans', 'trqTransTime'],
  ['ittStartMax', 'ittStartTrans', 'ittStartTransTime'],
  ['nrOnMin', 'nrOnCaut', 'nrOnCont', 'nrOnMax', 'nrOnTrans', 'nrOnTransTime'],
  ['nrOffMin', 'nrOffCont', 'nrOffMax', 'nrOffTrans', 'nrOffTransTime'],
  ['fuelPressCaut', 'fuelPressCont', 'fuelPressMax'],
  ['fuelReserve', 'fuelMinLanding', 'fuelSideward'],
  ['engOilPMin', 'engOilPCaut', 'engOilPCont', 'engOilPMax'],
  ['engOilTCont', 'engOilTMax', 'engOilTTrans', 'engOilTTransTime'],
  ['xmsnOilPMin', 'xmsnOilPCont', 'xmsnOilPCaut', 'xmsnOilPMax'],
  ['xmsnOilTCont', 'xmsnOilTMax'],
  ['battOn', 'battOff', 'battCool'],
  ['extOn', 'extOff', 'extCool'],
  ['genCont', 'genMax', 'genTrans', 'genTransTime'],
  ['auxGenCont', 'auxGenMax', 'auxGenTrans', 'auxGenTransTime'],
  ['hydMin', 'hydCaut', 'hydCont', 'hydMax'],
  ['vmini', 'vminApp', 'vmaxApp'],
  ['vDoorsOpen', 'vDoorsMoving'],
  ['vOneHelipilot', 'rocOneHelipilot'],
  ['oatMin', 'oatMax', 'oatLapse'],
  ['slopeNoseUp', 'slopeSideUp', 'slopeNoseDown', 'slopeNoseDownClear'],
  ['gwGround', 'gwMax', 'gwMin', 'gwExternal'],
  ['muhAttentive', 'muhManual', 'muhOneInop'],
  ['fdMuhCruise', 'fdMuhApproach'],
  ['ilsGradient', 'ilsDescent'],
  ['note3N2Indicated', 'note3ActualMin', 'note3ActualMax', 'note3TransientBegins', 'note3Protracted'],
  ['note4IttTen', 'note4IttTwo'],
  ['prohib1', 'prohib2', 'prohib3'],
  ['prohibOp1', 'prohibOp2'],
];

// The warnings, cautions and notes the NATOPS prints with these procedures, keyed by the step they
// follow. A key that is an EP's own id carries the ones printed before the steps (and the ones
// printed in the table's CAUSE/REMARKS column), and the EP's title bar opens those. Each bullet of
// a bulleted block is its own entry.
//
// Every one was read off the rendered page: the WARNING and CAUTION labels are drawn, not text.
// Only the memory steps are covered: where the NATOPS prints a note after a later, non-memory step
// (Engine RGB Chip, Transmission Chip, Tail Rotor Chip, Hoist Load Jettison, Runaway Hoist), it is
// hung on the last memory step, because it closes the procedure the student is reciting.
const ENGINE_FAILURE_WARNING = 'This emergency may result in engine failure.';
const IGNITION_CONTINUOUS = 'Pilots may consider using the continuous function of the ignition switch until landing is assured.';
const N1_FLAMEOUT = 'N1 decreasing below 51% will cause engine flame out.';
const CHIP_BURNER_GROUND = 'The CHIP BURNER switch shall not be used to suppress a chip caution light when the aircraft is on the ground.';
const CHIP_BURNER_THREE = 'The CHIP BURNER can be activated 3 times per flight.';
const CHIP_FLICKER = 'Flickering or intermittent CHIP indications should be considered a singular chip event.';

export const TH73A_EP_NWC = {
  // Engine Failure (Cruise) — NATOPS §12.3.1.4
  efcr1: {
    warnings: [],
    cautions: ['Keep rotor speed between 90 and 110% NR.'],
    notes: [],
  },
  efcr3: {
    warnings: [],
    cautions: [],
    notes: [
      'An engine failure does not disengage the flight director. If the flight director had been engaged, consideration should be given to pressing the FD STBY button to prevent the autopilot from repositioning the cyclic as the aircraft tries to maintain FD parameters.',
      'Minimum rate of descent is approximately 60 KIAS and 90% NR.',
      'Maximum glide is approximately 95 KIAS and 90% NR.',
      'Minimum glide is approximately 60 KIAS and 100% NR.',
    ],
  },

  // Engine Restart in Flight — NATOPS §12.3.1.5
  'engine-restart-in-flight': {
    warnings: [],
    cautions: ['When the cause of an engine failure is due to a mechanical issue, do not attempt a restart.'],
    notes: ['Engine restart has not been tested in flight.'],
  },

  // Autorotative Landing — NATOPS §12.3.2.1
  auto5: {
    warnings: [],
    cautions: ['In case of contact on the aft portion of the landing skid, avoid counteracting the pitch down with cyclic.'],
    notes: [],
  },

  // Engine Oil Pressure Low — NATOPS §12.3.3.1
  'engine-oil-pressure-low': {
    warnings: [ENGINE_FAILURE_WARNING],
    cautions: [],
    notes: [],
  },
  eopl3: {
    warnings: [],
    cautions: [],
    notes: ['Engine oil pressure may enter the cautionary range during practice autorotations.'],
  },

  // Abort Start — NATOPS §12.3.4
  'abort-start': {
    warnings: [],
    cautions: [
      'An excessive rise in ITT, ITT rapidly accelerating through 870 °C, and/or low battery voltage on starter engagement, indicates an increased potential for a hot start and may require aborting the start to preclude exceeding ITT start limits.',
      'Monitor engine start and if light off does not occur within 10 seconds after the twist grip is set to IDLE, abort the start.',
    ],
    notes: [],
  },
  abst4: {
    warnings: [],
    cautions: ['Failure to utilize a GPU/battery cart on subsequent start attempts may result in a hot start.'],
    notes: [],
  },

  // Engine Compressor Stall — NATOPS §12.3.5
  'engine-compressor-stall': {
    warnings: [ENGINE_FAILURE_WARNING],
    cautions: [],
    notes: [],
  },
  ecs3: {
    warnings: [],
    cautions: [],
    notes: [
      'If some usable power exists but level flight cannot be maintained, that power may be utilized to effect a landing or minimize rate of descent enroute to a suitable site for autorotation.',
      IGNITION_CONTINUOUS,
    ],
  },

  // Malfunction of the Fuel Control System — NATOPS §12.3.7
  fcos1: {
    warnings: [N1_FLAMEOUT],
    cautions: [],
    notes: [],
  },
  fcos3: {
    warnings: [],
    cautions: [],
    notes: ['An overspeed may result in an EEC failure.', IGNITION_CONTINUOUS],
  },
  'fuel-control-underspeed': {
    warnings: ['When using the MAN, the engine response is directly related to the rate at which the engine throttle is rotated. Additional care is required during engine acceleration. Monitor cockpit indicators closely to avoid the possibility of over temperature, over torque, over speed or engine surge.'],
    cautions: [],
    notes: ['An initial dead band (no engine response) may occur while operating in MAN.'],
  },
  fcus4: {
    warnings: [
      'Rapid movement of the throttle in MAN may result in engine over temp, over torque, over speed or engine surge.',
      N1_FLAMEOUT,
    ],
    cautions: [],
    notes: [],
  },
  fcus5: {
    warnings: [],
    cautions: [],
    notes: [IGNITION_CONTINUOUS],
  },

  // Engine Chip — NATOPS §12.3.11
  rgb5: {
    warnings: [],
    cautions: [],
    notes: [CHIP_BURNER_GROUND, CHIP_BURNER_THREE],
  },
  agb2: {
    warnings: [],
    cautions: [],
    notes: ['CHIP BURNER is not available with an ENG AGB CHIP.'],
  },

  // Inadvertent Engine Shutdown/Rapid Rise in ITT on Deck — NATOPS §12.3.13
  ies5: {
    warnings: [],
    cautions: ['Attempting to immediately restart an engine or returning the twist grip to IDLE, after an inadvertent shutdown may result in engine damage.'],
    notes: [],
  },

  // Transmission Malfunction — NATOPS §12.5.1
  'transmission-malfunction': {
    warnings: ['Possible indications of imminent transmission failure may include: yaw attitude excursions with no control input, an increase in power required for a fixed collective setting, increased noise, increased vibrations, or abnormal fumes.'],
    cautions: [],
    notes: [],
  },
  xmal4: {
    warnings: [],
    cautions: [],
    notes: ['Transiting at a minimum power required airspeed and low altitude may permit a quick flare and immediate landing in the event of an imminent transmission failure.'],
  },

  // Transmission Chip — NATOPS §12.5.3
  xchp4: {
    warnings: [],
    cautions: [],
    notes: [CHIP_BURNER_GROUND, CHIP_BURNER_THREE, CHIP_FLICKER],
  },

  // Loss of Tail Rotor Thrust — NATOPS §12.6.1
  trh3: {
    warnings: [],
    cautions: ['A slight rotation to the right can be expected on touchdown.'],
    notes: [],
  },
  trc2: {
    warnings: [],
    cautions: [],
    notes: ['An increase in power necessitates an increase in speed to prevent the helicopter from excessive yaw.'],
  },

  // Tail Rotor Chip — NATOPS §12.6.3
  'tail-rotor-chip': {
    warnings: [
      'Be prepared for complete loss of tail rotor thrust.',
      'High power settings may result in tail rotor gearbox failure.',
    ],
    cautions: [],
    notes: [],
  },
  trch3: {
    warnings: [],
    cautions: [],
    notes: [CHIP_BURNER_GROUND, CHIP_BURNER_THREE, CHIP_FLICKER],
  },

  // Hydraulic System No. 1 or No. 2 Pressure Loss — NATOPS §12.7.1
  hyd2: {
    warnings: [],
    cautions: ['Pull-up maneuvers and bank angles beyond 25 degrees may result in excessive flight control loads.'],
    notes: [],
  },
  hyd5: {
    warnings: [],
    cautions: [],
    notes: [
      'Tail rotor pedals are not boosted when the hydraulic system No. 1 fails.',
      'Rapid power changes with 1 SERVO off can result in an excessive yaw that may not be controlled with unboosted pedals.',
      'Unboosted pedals may be insufficient to counteract right yaw with strong right crosswinds.',
    ],
  },

  // Emergency DC Bus Failure — NATOPS §12.9.8
  edcb1: {
    warnings: [],
    cautions: ['ITT reference signal lost. Reduce ITT limit by 30 °C.'],
    notes: ['ICS operation may be restored with ACP switches in BK-UP or EMER.'],
  },

  // Fuel Pump 1 and/or Fuel Pump 2 Failure — NATOPS §12.10.1
  fpf1: {
    warnings: [],
    cautions: [],
    notes: [
      IGNITION_CONTINUOUS,
      'Any flight time with both fuel pumps OFF or failed must be reported to maintenance. Ground operations with both fuel pumps OFF or failed need not be restricted.',
    ],
  },

  // Engine Fire in Flight — NATOPS §12.11.1
  'engine-fire-in-flight': {
    warnings: [ENGINE_FAILURE_WARNING],
    cautions: [],
    notes: [],
  },

  // Cockpit/Cabin Fire in Flight — NATOPS §12.11.2
  ccf7: {
    warnings: [],
    cautions: ['If the fire is not completely extinguished, increasing ventilation may aggravate the problem.'],
    notes: [],
  },

  // Immediate Landing/Ditching — NATOPS §12.12.3
  'immediate-landing-ditching': {
    warnings: [
      'Jettisoning the left cockpit door in forward flight may cause catastrophic damage to the tail rotor.',
      'Failure to remain strapped in the aircraft until all violent motion stops may result in injury or incapacitation.',
    ],
    cautions: [],
    notes: [],
  },

  // Underwater Egress — NATOPS §12.12.4
  'underwater-egress': {
    warnings: [
      'Inflation of LPU inside of aircraft will impede egress.',
      'Failure to jettison doors prior to water entry may prevent opening of doors until cabin fills with water. Cabin misalignment due to water landing may also prevent opening of doors.',
      'Failure to disconnect ICS cords may impede egress.',
    ],
    cautions: [],
    notes: [],
  },

  // Hoist Load Jettison — NATOPS §12.13.5.1
  hlj2: {
    warnings: [],
    cautions: [],
    notes: ['Cut cable as close to hoist as possible.'],
  },

  // Rescue Hoist Failure — NATOPS §12.13.5.3
  rhf1: {
    warnings: ['If for any reason hoist stops during raising or lowering operations do not attempt to free it by actuating the controller. Continued operation may cause total cable failure.'],
    cautions: [],
    notes: [],
  },

  // Runaway Hoist — NATOPS §12.13.5.5
  rwh3: {
    warnings: [],
    cautions: [],
    notes: ['If safe landing area available place personnel/cargo on deck, manually disconnect load, recover hoist cable hand over hand.'],
  },
};
