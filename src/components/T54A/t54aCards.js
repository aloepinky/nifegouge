import React from 'react';
import { cardFieldsIn } from '../epsLimits/SingleLimits';
import { GRID } from './t54aGrid';

// Single Mode on the T-54A's limits page: the sheet one box at a time (the card shape and the
// blanks' sizes are in epsLimits/SingleLimits.js). Each box of the engine grid is a card named
// for its row and column, as the T-44C's are. The sheet's notes carry no blanks, so each is shown
// under every box it hangs on: its column's, its row's (Max Reverse, 8) and its own markers'.
// Except where it states the box's answer: notes 2 and 4 print the oil pressures and
// temperatures, so they are left off those columns' cards (and so off every card).
// A row the sheet prints under a table's heading and that says nothing without it (acceleration)
// takes that heading as its name.

export const NOTES = {
  1: { fields: [], body: () => <>Torque limit applies within range of 1,600 - 2,000 propeller rpm (N2). Below 1,600
    propeller rpm, torque is limited to 1100 ft-lb.</> },
  2: { fields: [], body: () => <>When gas generator speeds are above 27,000 rpm (72% N1) and oil temperatures are
    between +60 °C and +71 °C, normal oil pressures are:
    <ol type="a">
      <li>100 to 135 psi below 21,000 feet; 85 to 135 psi at 21,000 feet and above.</li>
      <li>Oil pressure between 60 and 85 psi is undesirable; it should be tolerated only for the completion of the
        flight, and then only at a reduced power setting not exceeding 1100 ft-lb torque. Oil pressure below 60 psi
        is unsafe; it requires that either the engine be shut down, or that a landing be made at the nearest
        suitable airport, using the minimum power required to sustain flight. Fluctuations of plus or minus 10 psi
        are acceptable.</li>
      <li>During extremely cold starts, oil pressure may reach 200 psi.</li>
    </ol>
  </> },
  3: { fields: [], body: () => <>A minimum oil temperature of +55 °C is recommended for fuel heater operation at
    take-off power.</> },
  4: { fields: [], body: () => <>Oil temperature limits are -40 °C and +110 °C. However, temperatures of between +99 °C
    and +110 °C are permitted for a maximum of 10 minutes.</> },
  5: { fields: [], body: () => <>These values are limited to 5 seconds.</> },
  6: { fields: [], body: () => <>High ITT at ground idle may be corrected by reducing accessory load and/or increasing
    N1 rpm.</> },
  7: { fields: [], body: () => <>Cruise torque values vary with altitude and temperature.</> },
  8: { fields: [], body: () => <>This operation is time limited to 1 minute.</> },
  9: { fields: [], body: () => <>To account for power setting accuracy and steady state fluctuations, inadvertent
    propeller excursions up to 2,040 rpm are time limited to 7 minutes.</> },
  10: { fields: [], body: () => <>To account for power setting accuracy and steady state fluctuations, inadvertent
    torque excursions up to 2275 ft-lb are time limited to 7 minutes.</> },
};

// The grid's column heads as the sheet prints them, and the notes each one hangs on.
const COLUMN_HEADS = [
  'TORQUE FT-LB/% (1)', 'MAXIMUM OBSERVED ITT °C', 'GAS GENERATOR RPM N1 %', 'PROP RPM N2', 'OIL PRESS PSI (2)',
  'OIL TEMP °C (3) (4)',
];
const COLUMN_NOTES = [[1], [], [], [], [], [3]];
const ROW_NOTES = { 'Max Reverse (8)': [8] };
const numbersIn = (marker) => (marker.match(/\d+/g) || []).map(Number);

const gridCards = GRID.flatMap(([row, ...cells]) => cells.flatMap((spec, i) => {
  const [field, marker] = Array.isArray(spec) ? spec : [spec];
  if (typeof field !== 'string') return [];
  const notes = [...COLUMN_NOTES[i], ...(ROW_NOTES[row] || []), ...(marker ? numbersIn(marker) : [])];
  return [{
    title: `${row} / ${COLUMN_HEADS[i]}`,
    fields: [field],
    body: (inp) => <>{inp(field, 'm')}{marker && <sup> {marker}</sup>}</>,
    notes: [...new Set(notes)].sort((a, b) => a - b),
  }];
}));

const line = (fields, body, title) => ({ title, fields, body, notes: [] });
const V = (s) => <>V<sub>{s}</sub></>;

// In the sheet's order: the grid row by row, then down the left column and the right.
export const CARDS = [
  ...gridCards,

  line(['vmo', 'mmo'], (inp) => <>MAX DIVE/LEVEL FLIGHT ({V('MO')}): {inp('vmo')} KIAS / {inp('mmo')} MACH</>),
  line(['vsse'], (inp) => <>MINIMUM SAFE ONE ENGINE INOPERATIVE ({V('SSE')}): {inp('vsse')}</>),
  line(['vmcaAppr', 'vmcaUp'], (inp) => <>MINIMUM CONTROLLABLE ({V('MCA')}): {inp('vmcaAppr')} (flaps appr){' '}
    {inp('vmcaUp')} (flaps up)</>),
  line(['va'], (inp) => <>MANEUVERING ({V('A')}): {inp('va')}</>),
  line(['vle'], (inp) => <>MAXIMUM LANDING GEAR EXTENDED ({V('LE')}): {inp('vle')}</>),
  line(['vlr'], (inp) => <>MAXIMUM LANDING GEAR RETRACTION ({V('LR')}): {inp('vlr')}</>),
  line(['vfe40', 'vfe100'], (inp) => <>
    <div>MAX FLAP EXTENSION/EXTENDED ({V('FE')}):</div>
    <div>APPROACH ({V('FE')}40): {inp('vfe40')}</div>
    <div>FULL ({V('FE')}100): {inp('vfe100')}</div>
  </>),
  line(['vx'], (inp) => <>BEST ANGLE OF CLIMB ({V('X')}): {inp('vx')}</>),
  line(['vy'], (inp) => <>BEST RATE OF CLIMB ({V('Y')}): {inp('vy')}</>),
  line(['vxse'], (inp) => <>BEST ANGLE OF CLIMB SINGLE ENGINE ({V('XSE')}): {inp('vxse')}</>),
  line(['vyse'], (inp) => <>BEST RATE OF CLIMB SINGLE ENGINE ({V('YSE')}): {inp('vyse')}</>),
  line(['xwindUncoupled'], (inp) => <>MAX DEMONSTRATED CROSSWIND (UNCOUPLED): {inp('xwindUncoupled')}</>),
  line(['xwindCoupled'], (inp) => <>MAX DEMONSTRATED CROSSWIND (COUPLED): {inp('xwindCoupled')}</>),
  line(['tailwindCoupled'], (inp) => <>MAX DEMONSTRATED TAILWIND (COUPLED): {inp('tailwindCoupled')}</>),
  line(['vmcg'], (inp) => <>MIN CONTROLLABLE SPEED ON GROUND ({V('MCG')}): {inp('vmcg')}</>),
  line(['turbulentAir'], (inp) => <>TURBULENT AIR PENETRATION SPEED: {inp('turbulentAir')}</>),

  line(['pneumatic'], (inp) => <>PNEUMATIC PRESSURE NORM OPERATING RANGE: {inp('pneumatic', 'm')}</>),
  line(['gyroHigh', 'gyroLow'], (inp) => <>
    <div>GYROSUCTION NORMAL OPERATING RANGE:</div>
    <div>{inp('gyroHigh', 'm')} (15,000 to 35,000 FEET)</div>
    <div>{inp('gyroLow', 'm')} (Sea Level to 15,000 FEET)</div>
  </>),
  line(['cabinDiff'], (inp) => <>MAX OPERATING CABIN PRESSURE DIFFERENTIAL: {inp('cabinDiff')}</>),
  line(['cabinDiffCracked'], (inp) => <>MAX OPERATING CABIN PRESSURE DIFFERENTIAL (CRACKED WINDSHIELD):{' '}
    {inp('cabinDiffCracked')}</>),
  line(['tcasRange'], (inp) => <>NORMAL TCAS ALTITUDE RANGE: {inp('tcasRange')}</>),
  line(['fuelTotal', 'fuelUsable'], (inp) => <>FUEL SYSTEM CAPACITY: {inp('fuelTotal')} (total) {inp('fuelUsable')} (usable)</>),

  line(['starterCycle'], (inp) => <>STARTER DUTY CYCLE IS LIMITED TO THREE: {inp('starterCycle')} SECOND CYCLES</>),
  line(['starterCool1'], (inp) => <>COOLING PERIOD AFTER 1ST STARTER CYCLE: {inp('starterCool1')} SECS</>),
  line(['starterCool2'], (inp) => <>COOLING PERIOD AFTER 2ND STARTER CYCLE: {inp('starterCool2')} SECS</>),
  line(['starterCool3'], (inp) => <>COOLING PERIOD AFTER 3RD STARTER CYCLE: {inp('starterCool3')} MINS</>),

  line(['dcGenVolts'], (inp) => <>DC GENERATOR VOLTAGE: {inp('dcGenVolts', 'm')}</>),
  line(['gpuStartVolts'], (inp) => <>MIN BATTERY VOLTAGE FOR GPU START: {inp('gpuStartVolts')}</>),
  line(['battStartVolts'], (inp) => <>MIN BATTERY VOLTAGE FOR BATT START: {inp('battStartVolts')}</>),
  line(['propDeicerAmps'], (inp) => <>PROP DEICER AMMETER NORMAL OPERATION: {inp('propDeicerAmps', 'm')}</>),

  line(['prohib1', 'prohib2', 'prohib3'], (inp) => <ol className="epl-single-list">
    <li>{inp('prohib1', 'full')}</li>
    <li>{inp('prohib2', 'full')}</li>
    <li>{inp('prohib3', 'full')}</li>
  </ol>, 'PROHIBITED MANEUVERS'),

  line(['accelFlapsUp'], (inp) => <>FLAPS UP: {inp('accelFlapsUp', 'l')}</>, 'ACCELERATION LIMITATIONS'),
  line(['accelFlapsDown'], (inp) => <>FLAPS DOWN: {inp('accelFlapsDown', 'l')}</>, 'ACCELERATION LIMITATIONS'),

  line(['maxRamp'], (inp) => <>MAXIMUM RAMP: {inp('maxRamp', 'm')}</>),
  line(['maxTakeoff'], (inp) => <>MAXIMUM TAKEOFF: {inp('maxTakeoff', 'm')}</>),
  line(['maxLanding'], (inp) => <>MAXIMUM LANDING: {inp('maxLanding', 'm')}</>),
  line(['maxZeroFuel'], (inp) => <>MAXIMUM ZERO FUEL WEIGHT: {inp('maxZeroFuel', 'm')}</>),
  line(['ceiling'], (inp) => <>ALTITUDE CEILING: {inp('ceiling', 'm')}</>),
  line(['ceilingYdInop'], (inp) => <>ALTITUDE CEILING YD INOP: {inp('ceilingYdInop', 'm')}</>),
];

export const cardFields = cardFieldsIn(NOTES);
