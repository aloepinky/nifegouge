// The syllabus skeleton: stages, their training blocks, and the events in each block.
// Structure only — an event's discuss items live in EVENTS.js, and nothing here duplicates
// them. Stage and block are derived from the event ID rather than stored on the event, so
// there is one place to correct when a JPPT revision renumbers something.
//
// Verbatim from CNATRAINST 1542.166D (15 Jul 2024), chapters II through VIII.
//
// The event ID encodes its own place in the syllabus:
//
//         FAM  43  02
//         └┬┘  ││  └┬┘
//       stage  ││   └── event within the block; 90 is an exam or check event
//              │└────── block sequence within that media family
//              └─────── media: 1 academics/flight support, 2 UTD, 3 OFT, 4 aircraft, 6 VTD

// `graded` stages are the five the JPPT weights, and the five the stage nav renders. Ground
// training is here so the course-flow diagram can name its boxes, not to be browsed.
export const STAGES = [
  { id: 'FAM', label: 'Familiarization', weight: '20%', graded: true },
  { id: 'I', label: 'Instrument', weight: '25%', graded: true },
  { id: 'N', label: 'Navigation', weight: '5%', graded: true },
  { id: 'F', label: 'Formation', weight: '30%', graded: true },
  { id: 'CS', label: 'Capstone', weight: '20%', graded: true },
  { id: 'GND', label: 'Ground Training', weight: null, graded: false },
];

// One row per training block. `hx` is the programmed hours per event and only flight and
// simulator blocks have one; `blkName` is the short code the JPPT prints for academic blocks.
// An event carries a `title` only where the JPPT gives it one of its own — in a flight block
// every event is the block title, so the field is absent.
//
// Array order is the JPPT's flow order, not numeric block order: FAM61 really is flown before
// FAM13, and the stage nav lists blocks in the order a student meets them.
export const BLOCKS = [
  // ---- Ground training (chapter II) -------------------------------------------------
  {
    id: 'G01',
    stage: 'GND',
    media: 'Class',
    title: 'Administration/Indoctrination',
    hours: 22,
    blkName: 'ASI',
    events: [
      { id: 'G0101', title: 'Check-in' },
      { id: 'G0102', title: 'CNAF M-3710.7 Level-A Mission Readiness Training' },
      { id: 'G0103', title: 'Aviation Safety Program' },
      { id: 'G0104', title: 'Crew Resource Management' },
      { id: 'G0105', title: 'Culture of Ejection' },
      { id: 'G0106', title: 'Wheels Watch' },
      { id: 'G0107', title: 'TMS/Curriculum Review' },
      { id: 'G0108', title: 'Checkout' },
    ],
  },
  {
    id: 'SY01',
    stage: 'GND',
    media: 'Class',
    title: 'Systems 1',
    hours: 23.6,
    blkName: 'SYS1',
    events: [
      { id: 'SY0101', title: 'Introduction to T-6B Systems' },
      { id: 'SY0102', title: 'Aircraft Systems Tour' },
      { id: 'SY0103', title: 'Flight Controls' },
      { id: 'SY0104', title: 'Hydraulic 1' },
      { id: 'SY0105', title: 'Hydraulic 2' },
      { id: 'SY0106', title: 'Systems Review' },
      { id: 'SY0107', title: 'UFCP' },
      { id: 'SY0108', title: 'Flight Instruments 1' },
      { id: 'SY0109', title: 'Flight Instruments 2' },
      { id: 'SY0110', title: 'HUD' },
      { id: 'SY0111', title: 'Communication System' },
      { id: 'SY0112', title: 'Navigation Systems' },
      { id: 'SY0113', title: 'FMS' },
      { id: 'SY0114', title: 'Systems Review 2' },
      { id: 'SY0190', title: 'Systems 1 Exam' },
    ],
  },
  {
    id: 'SY02',
    stage: 'GND',
    media: 'Class',
    title: 'Systems 2',
    hours: 14.4,
    blkName: 'SYS2',
    events: [
      { id: 'SY0201', title: 'Electrical' },
      { id: 'SY0202', title: 'Fuel' },
      { id: 'SY0203', title: 'Electrical & Fuel Review' },
      { id: 'SY0204', title: 'Propulsion 1' },
      { id: 'SY0205', title: 'Propulsion 2' },
      { id: 'SY0206', title: 'Propulsion Review' },
      { id: 'SY0207', title: 'Environmental 1' },
      { id: 'SY0208', title: 'Environmental 2' },
      { id: 'SY0209', title: 'Canopy' },
      { id: 'SY0210', title: 'Ejection' },
      { id: 'SY0211', title: 'Systems Review 3' },
      { id: 'SY0290', title: 'Systems 2 Exam' },
    ],
  },
  {
    id: 'PR01',
    stage: 'GND',
    media: 'Class',
    title: 'Operating Procedures',
    hours: 9.0,
    blkName: 'PR',
    events: [
      { id: 'PR0101', title: 'Introduction to Operating Procedures' },
      // One event with two location variants — PR0102A at KNSE, PR0102B at KNGP. Kept as the
      // single event the JPPT counts, so the block still holds the five events it states.
      { id: 'PR0102', title: 'Normal Procedures', note: 'A at KNSE, B at KNGP' },
      { id: 'PR0103', title: 'Normal Checklist Lab', note: 'UTD' },
      { id: 'PR0104', title: 'Limitations' },
      { id: 'PR0105', title: 'Emergency Procedures' },
    ],
  },
  {
    id: 'G02',
    stage: 'GND',
    media: 'Class',
    title: 'Course Rules',
    hours: 5.5,
    blkName: 'CR',
    events: [
      { id: 'G0201', title: 'Course Rules' },
      { id: 'G0290', title: 'Course Rules Exam', note: 'progress/proficiency exam' },
    ],
  },
  {
    id: 'SY03',
    stage: 'GND',
    media: 'Class',
    title: 'Systems 3',
    hours: 4.0,
    blkName: 'FMS',
    events: [
      { id: 'SY0301', title: 'FMS Trainer 1' },
      { id: 'SY0302', title: 'FMS Trainer 2', note: 'prereq I4103' },
    ],
  },
  {
    id: 'G60',
    stage: 'GND',
    media: 'VTD',
    title: 'VTD Orientation',
    hours: 1.3,
    blkName: 'G',
    events: [{ id: 'G6001', title: 'VTD Orientation' }],
  },

  // ---- Familiarization (chapter IV) ------------------------------------------------
  {
    id: 'FAM11',
    stage: 'FAM',
    media: 'CAI/MIL/Lect',
    title: 'FAM Flight Procedures 1',
    hours: 9.0,
    blkName: 'FAMFP',
    events: [
      { id: 'FAM1101', title: 'TOLD Computations' },
      { id: 'FAM1102', title: 'Aerodynamics & Flight Controls' },
      { id: 'FAM1103', title: 'Fundamental Flight Controls' },
      { id: 'FAM1104', title: 'Ground Procedures' },
      { id: 'FAM1105', title: 'Flight Procedures' },
      { id: 'FAM1106', title: 'FAM Review 1' },
      { id: 'FAM1190', title: 'FAM Exam 1' },
    ],
  },
  {
    id: 'FAM12',
    stage: 'FAM',
    media: 'CAI/MIL/Lect',
    title: 'FAM Flight Procedures 2',
    hours: 10.3,
    blkName: 'FAMFP',
    events: [
      { id: 'FAM1201', title: 'Landing Procedures' },
      { id: 'FAM1202', title: 'Emergency Procedures' },
      { id: 'FAM1203', title: 'FAM Review 2' },
      { id: 'FAM1290', title: 'FAM Exam 2' },
      { id: 'FAM1204', title: 'Rear Cockpit Preflight' },
      { id: 'FAM1205', title: 'Night Procedures' },
      { id: 'FAM1206', title: 'Safe for Solo' },
      { id: 'FAM1207', title: 'Basic Aerobatics' },
      { id: 'FAM1208', title: 'Advanced Aerobatics' },
    ],
  },
  {
    id: 'FAM21',
    stage: 'FAM',
    media: 'UTD',
    title: 'FAM Cockpit Procedures',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'FAM1290, SY0301, G0102 through G0107',
    events: [{ id: 'FAM2101' }, { id: 'FAM2102' }],
  },
  {
    id: 'FAM22',
    stage: 'FAM',
    media: 'UTD/OFT',
    title: 'FAM Emergency Procedures Trainer',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'FAM2102, PR0105',
    events: [{ id: 'FAM2201' }, { id: 'FAM2202' }],
  },
  {
    id: 'FAM31',
    stage: 'FAM',
    media: 'OFT',
    title: 'Familiarization',
    hours: 3.9,
    hx: 1.3,
    prereqs: 'I2103, G0290',
    events: [{ id: 'FAM3101' }, { id: 'FAM3102' }, { id: 'FAM3103' }],
  },
  {
    id: 'FAM61',
    stage: 'FAM',
    media: 'VTD',
    title: 'Day Familiarization',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'FAM3103',
    events: [{ id: 'FAM6101' }, { id: 'FAM6102' }],
  },
  {
    id: 'FAM62',
    stage: 'FAM',
    media: 'VTD',
    title: 'Day Familiarization',
    hours: 3.9,
    hx: 1.3,
    prereqs: 'FAM6102',
    events: [{ id: 'FAM6201' }, { id: 'FAM6202' }, { id: 'FAM6203' }],
  },
  {
    id: 'FAM63',
    stage: 'FAM',
    media: 'VTD',
    title: 'RDO Pattern Party',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'FAM6203',
    events: [{ id: 'FAM6301' }, { id: 'FAM6302' }],
  },
  {
    id: 'FAM13',
    stage: 'FAM',
    media: 'Lect',
    title: 'FAM Flight 0',
    hours: 3.0,
    blkName: 'FAMFP',
    events: [{ id: 'FAM1301', title: 'Familiarization Flight 0' }],
  },
  {
    id: 'FAM41',
    stage: 'FAM',
    media: 'T-6B',
    title: 'Day Familiarization',
    hours: 6.0,
    hx: 1.5,
    prereqs: 'FAM1301',
    events: [{ id: 'FAM4101' }, { id: 'FAM4102' }, { id: 'FAM4103' }, { id: 'FAM4104' }],
  },
  {
    id: 'FAM32',
    stage: 'FAM',
    media: 'OFT',
    title: 'Familiarization',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'FAM4104',
    events: [{ id: 'FAM3201' }, { id: 'FAM3202' }],
  },
  {
    id: 'FAM33',
    stage: 'FAM',
    media: 'OFT',
    title: 'Familiarization',
    hours: 1.3,
    hx: 1.3,
    prereqs: 'FAM3202',
    events: [{ id: 'FAM3301' }],
  },
  {
    id: 'FAM64',
    stage: 'FAM',
    media: 'VTD',
    title: 'Advanced RDO Pattern Party',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'FAM3301',
    events: [{ id: 'FAM6401' }, { id: 'FAM6402' }],
  },
  {
    id: 'FAM42',
    stage: 'FAM',
    media: 'T-6B',
    title: 'Day Familiarization',
    hours: 6.4,
    hx: 1.6,
    prereqs: 'FAM6402',
    events: [{ id: 'FAM4201' }, { id: 'FAM4202' }, { id: 'FAM4203' }, { id: 'FAM4204' }],
  },
  {
    id: 'FAM43',
    stage: 'FAM',
    media: 'T-6B',
    title: 'Day Familiarization',
    hours: 6.8,
    hx: 1.7,
    prereqs: 'FAM4204',
    events: [{ id: 'FAM4301' }, { id: 'FAM4302' }, { id: 'FAM4303' }, { id: 'FAM4304' }],
  },
  {
    id: 'FAM44',
    stage: 'FAM',
    media: 'T-6B',
    title: 'FAM Check Flight',
    hours: 1.7,
    hx: 1.7,
    prereqs: 'FAM4304, FAM1206',
    events: [{ id: 'FAM4490' }],
  },
  {
    id: 'FAM45',
    stage: 'FAM',
    media: 'T-6B',
    title: 'FAM Solo Flight',
    hours: 1.5,
    hx: 1.5,
    prereqs: 'FAM4490',
    events: [{ id: 'FAM4501' }],
  },
  {
    id: 'FAM46',
    stage: 'FAM',
    media: 'T-6B',
    title: 'Night Familiarization',
    hours: 1.7,
    hx: 1.7,
    prereqs: 'FAM1205, N4101, N6101',
    events: [{ id: 'FAM4601' }],
  },
  {
    id: 'FAM34',
    stage: 'FAM',
    media: 'OFT',
    title: 'Familiarization',
    hours: 1.3,
    hx: 1.3,
    prereqs: 'FAM1208, FAM4501, I4490, F4290',
    events: [{ id: 'FAM3401' }],
  },
  {
    id: 'FAM47',
    stage: 'FAM',
    media: 'T-6B',
    title: 'FAM Aerobatics',
    hours: 5.1,
    hx: 1.7,
    prereqs: 'FAM3401',
    events: [{ id: 'FAM4701' }, { id: 'FAM4702' }, { id: 'FAM4703' }],
  },

  // ---- Instrument (chapter V) ------------------------------------------------------
  {
    id: 'IN11',
    stage: 'I',
    media: 'Class',
    title: 'Instruments 1',
    hours: 3.7,
    blkName: 'IN1',
    events: [
      { id: 'IN1101', title: 'Instrument Displays & Cross-check' },
      { id: 'IN1102', title: 'Turns, Climbs and Descents' },
      { id: 'IN1103', title: 'Basic Instrument Maneuvers' },
      { id: 'IN1104', title: 'Basic Instrument Review' },
    ],
  },
  {
    id: 'I21',
    stage: 'I',
    media: 'UTD',
    title: 'Basic Instruments',
    hours: 3.9,
    hx: 1.3,
    prereqs: 'IN1104',
    events: [{ id: 'I2101' }, { id: 'I2102' }, { id: 'I2103' }],
  },
  {
    id: 'IN12',
    stage: 'I',
    media: 'Class',
    title: 'Instruments 2',
    hours: 12.2,
    blkName: 'IN2',
    events: [
      { id: 'IN1201', title: 'Basic Radio Instrument Maneuvers' },
      { id: 'IN1202', title: 'Basic Radio Instrument Review' },
      { id: 'IN1203', title: 'Basic Radio Instrument Practice Lab' },
      { id: 'IN1204', title: 'Basic Holding Concepts' },
      { id: 'IN1205', title: 'Basic Holding Concepts Review' },
      { id: 'IN1206', title: 'Basic Holding Concepts Lab' },
      { id: 'IN1290', title: 'Basic Radio Instruments Exam' },
    ],
  },
  {
    id: 'IN13',
    stage: 'I',
    media: 'Class',
    title: 'Instruments 3',
    hours: 22.5,
    blkName: 'IN3',
    events: [
      { id: 'IN1301', title: 'FLIP 1' },
      { id: 'IN1302', title: 'FLIP 2' },
      { id: 'IN1303', title: 'NOTAM & Weather' },
      { id: 'IN1304', title: 'FLIP/NOTAM/Weather Review' },
      { id: 'IN1305', title: 'Mission Planning Computations' },
      { id: 'IN1306', title: 'IFR Mission Planning' },
      { id: 'IN1307', title: 'IFR Mission Planning Lab 1' },
      { id: 'IN1308', title: 'IFR Mission Planning Lab 2' },
      { id: 'IN1390', title: 'IFR Flight Planning Exam' },
    ],
  },
  {
    id: 'IN14',
    stage: 'I',
    media: 'Class',
    title: 'Instruments 4',
    hours: 20.6,
    blkName: 'IN4',
    events: [
      { id: 'IN1401', title: 'IFR Clearance, Taxi, ITO and Departure' },
      { id: 'IN1402', title: 'Enroute Procedures' },
      { id: 'IN1403', title: 'IFR Navigation Review 1' },
      { id: 'IN1404', title: 'Terminal Procedures' },
      { id: 'IN1405', title: 'Low Altitude Approaches' },
      { id: 'IN1406', title: 'IFR Navigation Review 2' },
      { id: 'IN1407', title: 'Final Approach' },
      { id: 'IN1408', title: 'Radar Approaches' },
      { id: 'IN1409', title: 'High Altitude Approaches' },
      { id: 'IN1410', title: 'Transition to Landing & Missed Approach' },
      { id: 'IN1411', title: 'IFR Navigation Review 3' },
      { id: 'IN1412', title: 'IFR Navigation Review 4' },
      // Wing variants of one event: IN1413A at TW-4, IN1413B at TW-5.
      { id: 'IN1413', title: 'Navigation Practice Lab', note: 'A at TW-4, B at TW-5' },
      { id: 'IN1490', title: 'IFR Navigation Exam' },
    ],
  },
  {
    id: 'IN15',
    stage: 'I',
    media: 'Class',
    title: 'Instruments 5',
    hours: 1.0,
    blkName: 'IN5',
    events: [{ id: 'IN1501', title: 'CRM Case Studies' }],
  },
  {
    id: 'I22',
    stage: 'I',
    media: 'UTD',
    title: 'Radio Instruments',
    hours: 3.9,
    hx: 1.3,
    prereqs: 'IN1501',
    events: [{ id: 'I2201' }, { id: 'I2202' }, { id: 'I2203' }],
  },
  {
    id: 'I61',
    stage: 'I',
    media: 'VTD',
    title: 'Radio Instruments',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'I2203',
    events: [{ id: 'I6101' }, { id: 'I6102' }],
  },
  {
    id: 'I31',
    stage: 'I',
    media: 'OFT',
    title: 'Radio Instruments',
    hours: 5.2,
    hx: 1.3,
    prereqs: 'I6102',
    events: [
      { id: 'I3101' },
      { id: 'I3102' },
      { id: 'I3103' },
      { id: 'I3104', note: 'simulated night; prereq FAM1205' },
    ],
  },
  {
    id: 'I62',
    stage: 'I',
    media: 'VTD',
    title: 'Radio Instruments',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'I3104',
    events: [{ id: 'I6201' }, { id: 'I6202' }],
  },
  {
    id: 'I41',
    stage: 'I',
    media: 'T-6B',
    title: 'Radio Instruments',
    hours: 4.8,
    hx: 1.6,
    prereqs: 'I6202, FAM1204',
    events: [
      { id: 'I4101', note: 'rear cockpit; paper publications only' },
      { id: 'I4102', note: 'rear cockpit; paper publications only' },
      { id: 'I4103', note: 'rear cockpit; paper publications only' },
    ],
  },
  {
    id: 'I32',
    stage: 'I',
    media: 'OFT',
    title: 'Radio Instruments',
    hours: 7.8,
    hx: 1.3,
    prereqs: 'SY0302',
    events: [
      { id: 'I3201' },
      { id: 'I3202' },
      { id: 'I3203' },
      { id: 'I3204' },
      { id: 'I3205', note: 'simulated night' },
      { id: 'I3206', note: 'simulated night' },
    ],
  },
  {
    id: 'I63',
    stage: 'I',
    media: 'VTD',
    title: 'Radio Instruments',
    hours: 1.3,
    hx: 1.3,
    prereqs: 'I3206',
    events: [{ id: 'I6301' }],
  },
  {
    id: 'I42',
    stage: 'I',
    media: 'T-6B',
    title: 'Radio Instruments',
    hours: 6.4,
    hx: 1.6,
    prereqs: 'I6301, N6101; FAM4601 for night front-cockpit landings',
    events: [{ id: 'I4201' }, { id: 'I4202' }, { id: 'I4203' }, { id: 'I4204' }],
  },
  {
    id: 'I43',
    stage: 'I',
    media: 'T-6B',
    title: 'Instrument Navigation',
    hours: 6.8,
    hx: 1.7,
    prereqs: 'I4204',
    events: [{ id: 'I4301' }, { id: 'I4302' }, { id: 'I4303' }, { id: 'I4304' }],
  },
  {
    id: 'I44',
    stage: 'I',
    media: 'T-6B',
    title: 'Instrument Check Flight',
    hours: 1.7,
    hx: 1.7,
    prereqs: 'I4304',
    events: [{ id: 'I4490' }],
  },

  // ---- Navigation (chapter VI) -----------------------------------------------------
  {
    id: 'NA11',
    stage: 'N',
    media: 'CAI/MIL',
    title: 'Navigation (VFR)',
    hours: 9.0,
    blkName: 'VNAV',
    events: [
      { id: 'NA1101', title: 'VFR Mission Planning' },
      { id: 'NA1102', title: 'Lost Procedures' },
      { id: 'NA1103', title: 'VFR Arrivals' },
      { id: 'NA1104', title: 'Strange Field Procedures' },
      { id: 'NA1105', title: 'VFR Navigation Review' },
      { id: 'NA1106', title: 'VFR Navigation Planning Lab' },
      { id: 'NA1190', title: 'VFR Navigation Exam' },
    ],
  },
  {
    id: 'N31',
    stage: 'N',
    media: 'OFT',
    title: 'Day Navigation',
    hours: 1.3,
    hx: 1.3,
    prereqs: 'NA1190',
    events: [{ id: 'N3101' }],
  },
  {
    id: 'N61',
    stage: 'N',
    media: 'VTD',
    title: 'Night Navigation',
    hours: 1.3,
    hx: 1.3,
    prereqs: 'N3101',
    events: [{ id: 'N6101' }],
  },
  {
    id: 'N41',
    stage: 'N',
    media: 'T-6B',
    title: 'Day Navigation',
    hours: 1.6,
    hx: 1.6,
    prereqs: 'N3101',
    events: [{ id: 'N4101' }],
  },

  // ---- Formation (chapter VII) -----------------------------------------------------
  {
    id: 'F11',
    stage: 'F',
    media: 'CAI/MIL',
    title: 'Formation',
    hours: 5.5,
    blkName: 'FFP',
    prereqs: 'FAM4501',
    events: [
      { id: 'F1101', title: 'Introduction to Formation Procedures' },
      { id: 'F1102', title: 'Formation Procedures' },
      { id: 'F1190', title: 'Formation Exam' },
    ],
  },
  {
    id: 'F12',
    stage: 'F',
    media: 'Lect',
    title: 'Formation Flight 0',
    hours: 2.0,
    blkName: 'FORM',
    prereqs: 'F1190',
    events: [{ id: 'F1201' }],
  },
  {
    id: 'F31',
    stage: 'F',
    media: 'OFT',
    title: 'Formation',
    hours: 1.3,
    hx: 1.3,
    prereqs: 'F1201',
    events: [{ id: 'F3101' }],
  },
  {
    id: 'F21',
    stage: 'F',
    media: 'UTD/MR',
    title: 'Formation',
    hours: 1.3,
    hx: 1.3,
    prereqs: 'F3101',
    events: [{ id: 'F2101', note: 'linked mixed-reality UTD flown with a formation partner' }],
  },
  {
    id: 'F41',
    stage: 'F',
    media: 'T-6B',
    title: 'Formation',
    hours: 6.4,
    hx: 1.6,
    prereqs: 'F2101',
    events: [{ id: 'F4101' }, { id: 'F4102' }, { id: 'F4103' }, { id: 'F4104' }],
  },
  {
    id: 'F42',
    stage: 'F',
    media: 'T-6B',
    title: 'Formation Check Flight',
    hours: 1.6,
    hx: 1.6,
    prereqs: 'F4104',
    events: [{ id: 'F4290' }],
  },

  // ---- Capstone (chapter VIII) -----------------------------------------------------
  {
    id: 'CS11',
    stage: 'CS',
    media: 'Lect',
    title: 'Capstone Flight 0',
    hours: 2.0,
    blkName: 'CSFP',
    prereqs: 'I4490 and F4290',
    events: [{ id: 'CS1101' }],
  },
  {
    id: 'CS21',
    stage: 'CS',
    media: 'UTD/MR',
    title: 'Advanced Formation Training',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'FAM4703, CS1101',
    events: [{ id: 'CS2101' }, { id: 'CS2102' }],
  },
  {
    id: 'CS31',
    stage: 'CS',
    media: 'OFT',
    title: 'Advanced Familiarization / Radio Instruments Training',
    hours: 2.6,
    hx: 1.3,
    prereqs: 'CS2102',
    events: [{ id: 'CS3101' }, { id: 'CS3102' }],
  },
  {
    id: 'CS41',
    stage: 'CS',
    media: 'T-6B',
    title: 'Capstone',
    hours: 3.4,
    hx: 1.7,
    prereqs: 'CS3102',
    events: [
      { id: 'CS4101', note: 'formation out-and-in' },
      { id: 'CS4102', note: 'formation out-and-in' },
    ],
  },
  {
    id: 'CS42',
    stage: 'CS',
    media: 'T-6B',
    title: 'Capstone Check Flight',
    hours: 1.7,
    hx: 1.7,
    prereqs: 'CS4102',
    events: [{ id: 'CS4290' }],
  },
];

const BLOCK_INDEX = BLOCKS.reduce((acc, b) => {
  acc[b.id] = b;
  return acc;
}, {});

// Every event in the syllabus, flattened to { id, title, note, block, stage }. `title` falls
// back to the block title, which is what a flight or simulator event is actually called.
export const SYLLABUS_EVENTS = BLOCKS.flatMap((block) =>
  block.events.map((e) => ({
    id: e.id,
    title: e.title || block.title,
    note: e.note || null,
    block: block.id,
    stage: block.stage,
  }))
);

const EVENT_INDEX = SYLLABUS_EVENTS.reduce((acc, e) => {
  acc[e.id] = e;
  return acc;
}, {});

export const STAGE_INDEX = STAGES.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});

// Case-insensitive, mirroring getEvent in EVENTS.js — these ids reach us from the URL and
// from the search box.
export function getBlock(id) {
  return (id && BLOCK_INDEX[id.toUpperCase()]) || null;
}

export function getStage(id) {
  return (id && STAGE_INDEX[id.toUpperCase()]) || null;
}

// The syllabus row for an event id, whether or not EVENTS.js has content for it.
export function syllabusEvent(id) {
  return (id && EVENT_INDEX[id.toUpperCase()]) || null;
}

// The block an event belongs to. Derived from the registry rather than parsed out of the id,
// so the A/B variants (PR0102A, IN1413A) resolve like any other event.
export function blockOf(eventId) {
  const e = syllabusEvent(eventId);
  return e ? BLOCK_INDEX[e.block] : null;
}

// A stage's blocks in JPPT flow order — the order a student meets them, which is not the
// numeric order of the block ids.
export function blocksIn(stageId) {
  const id = stageId && stageId.toUpperCase();
  return BLOCKS.filter((b) => b.stage === id);
}

// The five stages the JPPT weights. Ground training is excluded: every academic block's
// Discuss Items entry reads "None", so there is nothing to browse to.
export function gradedStages() {
  return STAGES.filter((s) => s.graded);
}

// The blocks that carry no discuss items on this site. Nothing in them is listed anywhere: not
// in the stage nav, not in the search index, and not as a link on the course-flow chart.
//
// This is data, not a derivation, because every rule that looks right is wrong. "The 2000, 3000,
// 4000 and 6000 blocks" is the shape of it and misses four: the three Flight 0 lecture blocks
// (FAM13, F12, CS11) carry items, because briefing the flight is the whole event, and G60 is a
// VTD block that carries none. The course-flow figure agrees with the media digit rather than
// with this list, because its categories classify media — G6001 is drawn Simulator — so the
// figure cannot be used to check it either. All 58 block sections were read to build this.
//
// The list follows the publication exactly: a block is here only if its entry reads "Discuss
// Items. None." G01 (seat height and rudder pedal adjustment, on G0102) and F12 (Formation
// Flight 0) name items and so are briefed, whether or not a brief-table page for them turns out
// to be worth writing. That is for whoever writes the pages to decide, not for this list.
const NO_DISCUSS_ITEMS = new Set([
  'G02', 'G60', 'SY01', 'SY02', 'SY03', 'PR01',
  'FAM11', 'FAM12',
  'IN11', 'IN12', 'IN13', 'IN14', 'IN15',
  'NA11', 'F11',
]);

// Accepts a block id, an event id, or a block row — the chart and the search hold event ids,
// the nav holds block rows.
export function hasDiscussItems(idOrBlock) {
  if (!idOrBlock) return false;
  const block = typeof idOrBlock === 'string'
    ? (BLOCK_INDEX[idOrBlock.toUpperCase()] || blockOf(idOrBlock))
    : idOrBlock;
  return !!block && !NO_DISCUSS_ITEMS.has(block.id);
}

// What is browsable. The academics, exams and ground training are not listed anywhere — not in
// the stage nav, not in the search index — because there is nothing in them to reach. They
// appear only on the course-flow chart, faded, where their job is to show the sequence.
export function briefedBlocksIn(stageId) {
  return blocksIn(stageId).filter(hasDiscussItems);
}

export const BRIEFED_EVENTS = SYLLABUS_EVENTS.filter((e) => hasDiscussItems(e.id));

export const BRIEFED_BLOCKS = BLOCKS.filter(hasDiscussItems);
