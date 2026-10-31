import React from 'react';
import { cardFieldsIn } from '../epsLimits/SingleLimits';
import { GRID } from './t44cGrid';

// Single Mode on Advanced's limits page: the T-44C sheet one box at a time (the card shape and
// the blanks' sizes are in epsLimits/SingleLimits.js). Each box of the engine grid is a card
// named for its row and column, as Primary's are. A note with blanks is shown under the one box
// it hangs on (note 4); one that hangs on a whole row or column, or on a box with no blank
// (notes 1, 2, 3, 5 and 10), is a card of its own. A note without blanks (6 to 8) is shown
// under every box it hangs on. Note 9 prints the torque limits themselves, so it is left off
// the torque cards (and so off every card).

export const NOTES = {
  1: { fields: ['note1N1Min', 'note1N1Max'], body: (inp) => <>N1 {inp('note1N1Min')} to {inp('note1N1Max')} %.</> },
  2: {
    fields: ['note2N1Min', 'note2N1Max'],
    body: (inp) => <>N1 {inp('note2N1Min')} to {inp('note2N1Max')} %. Ground operations above 3,500-foot
      pressure altitude (PA) may produce idle speeds as high as 83% N1 with condition levers at low idle.</>,
  },
  3: {
    fields: ['note3NormalMin', 'note3NormalMax', 'note3Undesirable', 'note3GroundMin', 'note3FlightMin'],
    body: (inp) => <>Normal oil pressure is {inp('note3NormalMin')} to {inp('note3NormalMax')} PSIG at power
      settings above 27,000 rpm (72%) N1, oil pressure below {inp('note3Undesirable')} PSIG is undesirable, and
      may be used only for completion of a flight, and then at a reduced power setting. Low oil pressure
      should be corrected prior to next flight. During ground operations, oil pressures
      below {inp('note3GroundMin')} PSIG require engine shutdown; during flight, oil pressure
      below {inp('note3FlightMin')} PSIG is unsafe and requires either engine shutdown or use of minimum power
      until a landing can be made.</>,
  },
  4: {
    fields: ['note4Itt'],
    body: (inp) => <>This value is time limited to two seconds. If ITT is likely to exceed {inp('note4Itt')} °C,
      discontinue start.</>,
  },
  5: {
    fields: ['note5N1Reduce'],
    body: (inp) => <>For every 10 °C below −30 °C ambient temperature, reduce maximum allowable N1
      by {inp('note5N1Reduce')} %.</>,
  },
  6: { fields: [], body: () => <>High ITT may be decreased by reducing accessory load and/or increasing N1 speed.</> },
  7: {
    fields: [],
    body: () => <>High generator loads at low N1 speeds may cause the ITT acceleration temperature limit to be
      exceeded. Observe the generator load limits.</>,
  },
  8: { fields: [], body: () => <>This power rating is intended for emergency use at the discretion of the pilot.</> },
  9: { fields: [], body: () => <>Torque limits between 1,900 and 2,200 rpm vary linearly between 1,315 and 1,520 ft-lb.</> },
  10: {
    fields: ['note10RpmMin', 'note10RpmMax'],
    body: (inp) => <>If propeller rpm does not read between {inp('note10RpmMin', 'm')} and {inp('note10RpmMax', 'm')} rpm
      with the power levers at idle and condition levers at low idle, perform a low pitch torque check to
      ensure propeller flight idle stops are correctly adjusted.</>,
  },
};

const note = (title, n) => ({ title, fields: [], body: () => null, notes: [n] });
const line = (fields, body, title) => ({ title, fields, body, notes: [] });

// The grid's column heads as the sheet prints them, footnote markers in brackets. The
// acceleration torque spans both torque columns.
const TORQUE = 'TORQUE FT-LB (9)';
const COLUMN_HEADS = [
  'MAX TIME', `${TORQUE} RPM 2,200`, `${TORQUE} RPM 1,900`, 'MAX OBSERVED ITT', 'N1% (5)', 'Np RPM (PROP)',
  'OIL PRESS PSI (3)', 'OIL TEMP °C',
];
const SIZE = { 0: 'l', 6: 'm', 7: 'm' }; // max time is words; oil pressure and temperature are ranges

// The notes without blanks a box shows: its row's and its own marker's.
const ROW_NOTES = { 'MAX. CONTINUOUS (8)': [8], 'ACCELERATION (7)': [7] };

const gridCards = GRID.flatMap(([row, ...cells]) => cells.flatMap((spec, i) => {
  const [field, marker, suffix] = Array.isArray(spec) ? spec : [spec];
  if (typeof field !== 'string') return [];
  const head = cells[i + 1] === null ? TORQUE : COLUMN_HEADS[i];
  const notes = [...(ROW_NOTES[row] || []), ...(marker ? [Number(marker)] : [])];
  return [{
    title: `${row} / ${head}`,
    fields: [field],
    body: (inp) => <>{inp(field, SIZE[i])}{marker && <sup> {marker}</sup>}{suffix && <> {suffix}</>}</>,
    notes,
  }];
}));

const V = (s) => <>V<sub>{s}</sub></>;

// In the sheet's order: the grid row by row, the notes, then down the left column and the right,
// then the fuel line.
export const CARDS = [
  ...gridCards,
  note('HI-IDLE (1)', 1),
  note('LO-IDLE (2)', 2),
  note('OIL PRESS PSI (3)', 3),
  note('N1% (5)', 5),
  note('LO-IDLE / Np RPM (10)', 10),

  line(['vmo'], (inp) => <>MAX DIVE/LEVEL FLIGHT ({V('MO')}): {inp('vmo')}</>),
  line(['vmoDecrease', 'vmoPerFt', 'vmoAboveFt'], (inp) => <>DECREASE {V('MO')} {inp('vmoDecrease')} KIAS
    FOR EVERY {inp('vmoPerFt', 'm')} FT ABOVE {inp('vmoAboveFt', 'm')} FT</>),
  line(['mmo'], (inp) => <>MACH LIMIT (M<sub>MO</sub>): {inp('mmo')}</>),
  line(['vsse'], (inp) => <>MINIMUM SAFE ONE ENGINE INOPERATIVE ({V('SSE')}): {inp('vsse')}</>),
  line(['vmca'], (inp) => <>MINIMUM CONTROLLABLE ({V('MCA')}): {inp('vmca')}</>),
  line(['va'], (inp) => <>MANEUVERING ({V('A')}): {inp('va')}</>),
  line(['vle'], (inp) => <>MAXIMUM LANDING GEAR EXTENDED ({V('LE')}): {inp('vle')}</>),
  line(['vlr'], (inp) => <>MAXIMUM LANDING GEAR RETRACTION ({V('LR')}): {inp('vlr')}</>),
  line(['vfe35', 'vfe100'], (inp) => <>
    <div>MAX FLAP EXTENSION/EXTENDED ({V('FE')}):</div>
    <div>APPROACH ({V('FE')}35): {inp('vfe35')}</div>
    <div>FULL ({V('FE')}100): {inp('vfe100')}</div>
  </>),
  line(['vx'], (inp) => <>BEST ANGLE OF CLIMB ({V('X')}): {inp('vx')}</>),
  line(['vy'], (inp) => <>BEST RATE OF CLIMB ({V('Y')}): {inp('vy')}</>),
  line(['vxse'], (inp) => <>BEST ANGLE OF CLIMB SINGLE ENGINE ({V('XSE')}): {inp('vxse')}</>),
  line(['vyse'], (inp) => <>BEST RATE OF CLIMB SINGLE ENGINE ({V('YSE')}): {inp('vyse')}</>),
  line(['maxRangeGlide'], (inp) => <>MAX RANGE GLIDE: {inp('maxRangeGlide')}</>),
  line(['maxEnduranceGlide'], (inp) => <>MAX ENDURANCE GLIDE: {inp('maxEnduranceGlide')}</>),
  line(['vmcg'], (inp) => <>MIN CONTROLLABLE SPEED ON GROUND ({V('MCG')}): {inp('vmcg')}</>),

  line(['pneumaticMin', 'pneumaticMax'],
    (inp) => <>PNEUMATIC PRESSURE NORM OPERATING RANGE: {inp('pneumaticMin')} - {inp('pneumaticMax')} PSI</>),
  line(['gyroMin', 'gyroMax'], (inp) => <>GYRO SUCTION NORM OPERATING RANGE: {inp('gyroMin')} - {inp('gyroMax')} inHg</>),
  line(['oxygenLocal', 'oxygenXc'],
    (inp) => <>MIN OXYGEN REQUIRED FOR LOCAL/X-C FLIGHT: {inp('oxygenLocal')} / {inp('oxygenXc')} PSI</>),
  line(['cabinDiff'], (inp) => <>MAXIMUM OPERATING CABIN PRESSURE DIFFERENTIAL: {inp('cabinDiff')} PSI</>),
  line(['tasAltRange'], (inp) => <>NORMAL TAS ALTITUDE RANGE: +/- {inp('tasAltRange')} FEET</>),
  line(['altitudeCeiling'], (inp) => <>ALTITUDE CEILING: {inp('altitudeCeiling', 'm')} FT</>),

  line(['starterCycleLength'], (inp) => <>STARTER DUTY CYCLE IS LIMITED TO THREE {inp('starterCycleLength', 'm')} CYCLES</>),
  line(['starterCool1'], (inp) => <>COOLING PERIOD AFTER 1ST STARTER CYCLE: {inp('starterCool1')} SECS</>),
  line(['starterCool2'], (inp) => <>COOLING PERIOD AFTER 2ND STARTER CYCLE: {inp('starterCool2')} SECS</>),
  line(['starterCool3'], (inp) => <>COOLING PERIOD AFTER 3RD STARTER CYCLE: {inp('starterCool3')} MINS</>),

  line(['dcGenVolt', 'dcGenTol'], (inp) => <>DC GENERATOR VOLTAGE: {inp('dcGenVolt')} ± {inp('dcGenTol')} VDC</>),
  line(['apuChargeVolts'], (inp) => <>MIN BATTERY VOLTAGE FOR APU CHARGE: {inp('apuChargeVolts')} VDC</>),
  line(['apuStartVolts'], (inp) => <>MIN BATTERY VOLTAGE FOR APU START: {inp('apuStartVolts')} VDC</>),
  line(['battStartVolts'], (inp) => <>MIN BATTERY VOLTAGE FOR BATT START: {inp('battStartVolts')} VDC</>),
  line(['propDeicerMin', 'propDeicerMax'],
    (inp) => <>PROP DEICER AMMETER NORMAL OPERATION: {inp('propDeicerMin')} - {inp('propDeicerMax')} AMPS</>),

  line(['prohib1', 'prohib2'], (inp) => <ol className="epl-single-list">
    <li>{inp('prohib1', 'full')}</li>
    <li>{inp('prohib2', 'full')}</li>
  </ol>, 'PROHIBITED MANEUVERS'),

  line(['accelCleanPos', 'accelCleanNeg'], (inp) => <>CLEAN: {inp('accelCleanPos')} TO {inp('accelCleanNeg')} G's</>),
  line(['accelFlapsPos', 'accelFlapsNeg'], (inp) => <>FULL FLAPS: {inp('accelFlapsPos')} TO {inp('accelFlapsNeg')} G's</>),

  line(['maxRamp'], (inp) => <>MAXIMUM RAMP: {inp('maxRamp', 'm')} POUNDS.</>),
  line(['maxTakeoff'], (inp) => <>MAXIMUM TAKEOFF: {inp('maxTakeoff', 'm')} POUNDS.</>),
  line(['maxLanding'], (inp) => <>MAXIMUM LANDING: {inp('maxLanding', 'm')} POUNDS</>),

  line(['landingType'], (inp) => <>{inp('landingType', 'l')} LANDINGS ONLY.</>),
  line(['maxSinkRate'], (inp) => <>MAXIMUM SINK RATE AT GROUND CONTACT: {inp('maxSinkRate', 'm')} FPM.</>),
  line(['maxCrosswind'], (inp) => <>MAXIMUM CROSSWIND COMPONENT: {inp('maxCrosswind')} KNOTS.</>),

  line(['fuelTotal', 'fuelUsable'], (inp) => <>THE TOTAL FUEL SYSTEM CAPACITY IS {inp('fuelTotal')} U.S. GALLONS, OF
    WHICH {inp('fuelUsable')} U.S. GALLONS ARE USABLE.</>),
];

export const cardFields = cardFieldsIn(NOTES);
