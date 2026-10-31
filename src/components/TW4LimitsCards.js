import React from 'react';
import { cardFieldsIn } from './epsLimits/SingleLimits';

// Single Mode on Primary's limits page: the T-6B sheet one box at a time, so a limit is recited
// from its name and not found by where it sits on the table. Each card is one box of the sheet;
// a note the box points to is shown under it. A note with blanks belongs to one card only (its
// blanks are answered once); a note without blanks is shown under every box that points to it.
// Note 4 belongs to the whole NP column, so it is a card of its own.
//
// The card shape and the blanks' sizes are in epsLimits/SingleLimits.js.

const N1 = <>N<sub>1</sub></>;
const NP = <>N<sub>P</sub></>;

export const NOTES = {
  1: { fields: [], body: () => <>{N1} values presented for PMU ON. With PMU OFF, {N1} may vary from these values.</> },
  2: {
    fields: ['note21', 'note22'],
    body: (inp) => <>With PMU OFF, permissible maximum {NP} is {inp('note21')} +/- {inp('note22')} %.</>,
  },
  3: { fields: [], body: () => <>Permissible at any operating condition “power setting” for completion of an in-flight emergency.</> },
  4: {
    fields: ['note41', 'note42'],
    body: (inp) => <>Avoid stabilized ground operation from {inp('note41')} to {inp('note42')} % {NP}</>,
  },
  5: {
    fields: ['note51', 'note52', 'note53'],
    body: (inp) => <>Operation in this range permitted only during aerobatics or spins, and {inp('note51')} to{' '}
      {inp('note52')} psi for {inp('note53')} seconds with PCL at IDLE</>,
  },
  6: {
    fields: ['note61', 'note62', 'note63'],
    body: (inp) => <>Normal oil pressure during steady state conditions is {inp('note61')} to {inp('note62')} psi.
      Operation at oil pressure less than {inp('note63')} psi at flight idle or above is indicative of oil
      system malfunction.</>,
  },
  7: {
    fields: ['note71'],
    body: (inp) => <>Acceptable for ground operation at and below {inp('note71')} % torque</>,
  },
  8: {
    fields: ['note81', 'note82', 'note83'],
    body: (inp) => <>The PMU will govern maximum torque at {inp('note81')} +/- {inp('note82')} %. Torque
      above {inp('note83')} % at a constant PCL setting and steady flight is indicative of a governing
      system malfunction.</>,
  },
  9: { fields: [], body: () => <>Allowable torque range with {NP} stabilized and PCL at IDLE.</> },
  10: {
    fields: ['note101', 'note102', 'note103'],
    body: (inp) => <>With the PMU on, torque between {inp('note101')} to {inp('note102')} % is possible
      following rapid PCL movement or aerobatic maneuvers. Torque above {inp('note103')} % is a limiting
      system malfunction.</>,
  },
};

const TORQUE = 'TORQUE %';
const ITT = 'ITT C MAX';
const N1COL = <>{N1} % (1)</>;
const NPCOL = <>{NP} % (4)</>;
const OILP = 'OIL PRESSURE psi';
const OILT = 'OIL TEMP C';

const engine = (col, row, fields, body, notes = []) => ({ title: <>{row} / {col}</>, fields, body, notes });
const line = (fields, body, title) => ({ title, fields, body, notes: [] });


const PROHIB = ['prohib1', 'prohib2', 'prohib3', 'prohib4', 'prohib5', 'prohib6', 'prohib7', 'prohib8',
  'prohib9', 'prohib10', 'prohib11'];

// In the sheet's order: the engine table row by row, then down the left column and the right.
export const CARDS = [
  engine(TORQUE, 'TAKEOFF/MAX', ['takeoffTorque'], (inp) => <>{inp('takeoffTorque')} (8)</>, [8]),
  engine(ITT, 'TAKEOFF/MAX', ['takeoffITT'], (inp) => <>{inp('takeoffITT')} MAX</>),
  engine(N1COL, 'TAKEOFF/MAX', ['takeoffN1'], (inp) => <>{inp('takeoffN1')} MAX</>, [1]),
  engine(NPCOL, 'TAKEOFF/MAX', ['takeoffNp'], (inp) => <>{inp('takeoffNp')} MAX (2)</>, [2]),
  engine(OILP, 'TAKEOFF/MAX', ['takeoffOilPressMin', 'takeoffOilPressMax'],
    (inp) => <>{inp('takeoffOilPressMin')} to {inp('takeoffOilPressMax')} (6)</>, [6]),
  engine(OILT, 'TAKEOFF/MAX', ['takeoffOilTempMin', 'takeoffOilTempMax'],
    (inp) => <>{inp('takeoffOilTempMin')} to {inp('takeoffOilTempMax')}</>),

  engine(TORQUE, 'IDLE', ['idleTorqueMin', 'idleTorqueMax'],
    (inp) => <>{inp('idleTorqueMin')} to {inp('idleTorqueMax')} %(9) (ground)</>, [9]),
  engine(ITT, 'IDLE', ['idleITT'], (inp) => <>{inp('idleITT')} MAX</>),
  engine(N1COL, 'IDLE', ['idleN1GroundBottom', 'idleN1GroundTop', 'idleN1Flight'], (inp) => <>
    <div>{inp('idleN1GroundBottom')} to {inp('idleN1GroundTop')} (ground)</div>
    <div>{inp('idleN1Flight')} Min (flight)</div>
  </>, [1]),
  engine(NPCOL, 'IDLE', ['idleNpGroundBottom', 'idleNpGroundTop'],
    (inp) => <>{inp('idleNpGroundBottom')} to {inp('idleNpGroundTop')} (ground)</>),
  engine(OILP, 'IDLE', ['idleOilPress'], (inp) => <>{inp('idleOilPress')} Min</>),
  engine(OILT, 'IDLE', ['idleOilTempGroundMin', 'idleOilTempGroundMax', 'idleOilTempFlightMin',
    'idleOilTempFlightMax', 'idleOilTempCautionMin', 'idleOilTempCautionMax'], (inp) => <>
    <div>{inp('idleOilTempGroundMin')} to {inp('idleOilTempGroundMax')} (Grnd)</div>
    <div>{inp('idleOilTempFlightMin')} to {inp('idleOilTempFlightMax')} (Flt)</div>
    <div>{inp('idleOilTempCautionMin')} to {inp('idleOilTempCautionMax')} (7)</div>
  </>, [7]),

  engine(ITT, 'START', ['startITT5sec', 'startITTTime'],
    (inp) => <>{inp('startITT5sec', 'm')} ({inp('startITTTime')} sec)</>),
  engine(OILP, 'START', ['startOilPress'], (inp) => <>{inp('startOilPress')} Max</>),
  engine(OILT, 'START', ['startOilTemp'], (inp) => <>{inp('startOilTemp')} Min</>),

  engine(TORQUE, 'TRANSIENT', ['transientTorque5secMin', 'transientTorque5secMax', 'transientTorqueTime'],
    (inp) => <>{inp('transientTorque5secMin')} to {inp('transientTorque5secMax')} ({inp('transientTorqueTime')} sec) (10)</>, [10]),
  engine(ITT, 'TRANSIENT', ['transientITT20sec', 'transientITTTime'],
    (inp) => <>{inp('transientITT20sec', 'm')} ({inp('transientITTTime')} sec)</>),
  engine(N1COL, 'TRANSIENT', ['transientN1'], (inp) => <>{inp('transientN1')} MAX</>, [1]),
  engine(NPCOL, 'TRANSIENT', ['transientNp20sec', 'transientNpTime'],
    (inp) => <>{inp('transientNp20sec')} ({inp('transientNpTime')} sec) (3)</>, [3]),
  engine(OILP, 'TRANSIENT', ['transientOilPressMin', 'transientOilPressMax'],
    (inp) => <>{inp('transientOilPressMin')} to {inp('transientOilPressMax')} (5)</>, [5]),
  engine(OILT, 'TRANSIENT', ['transientOilTemp10minMin', 'transientOilTemp10minMax', 'transientOilTempTime'],
    (inp) => <>{inp('transientOilTemp10minMin')} to {inp('transientOilTemp10minMax')} ({inp('transientOilTempTime')} minutes)</>),

  { title: NPCOL, fields: [], body: () => null, notes: [4] },

  line(['vleVfe'], (inp) => <>MAXIMUM AIRSPEED GEAR DOWN (V<sub>LE</sub>) & FLAP DOWN (V<sub>FE</sub>) {inp('vleVfe')} KIAS</>),
  line(['vmo', 'mmo'], (inp) => <>MAX OPERATING (V<sub>MO</sub>) {inp('vmo')} KIAS / MAX MACH (M<sub>MO</sub>) {inp('mmo')} MACH</>),
  line(['turbPen'], (inp) => <>TURBULENT AIR PENETRATION SPEED, MAXIMUM: {inp('turbPen')} KIAS</>),

  line(PROHIB, (inp) => <ol className="epl-single-list">
    {PROHIB.map((f) => <li key={f}>{inp(f, 'full')}</li>)}
  </ol>, 'PROHIBITED MANEUVERS'),
  line(['iceFeet', 'iceType'],
    (inp) => <>THE AIRCRAFT HAS BEEN APPROVED ONLY FOR TRANSIT THROUGH {inp('iceFeet', 'm')} FEET OF {inp('iceType', 'l')} ICE.</>),
  line(['minBattVolt'], (inp) => <>MINIMUM BATTERY VOLTAGE: {inp('minBattVolt')} VOLTS</>),
  line(['hydCautionMin', 'hydCautionMax'],
    (inp) => <>HYDRAULIC CAUTION: &lt; {inp('hydCautionMin')} PSI, &gt; {inp('hydCautionMax')} PSI</>),
  line(['fuelCaution'], (inp) => <>FUEL CAUTION LIGHT: &lt; {inp('fuelCaution')} POUNDS IN RESPECTIVE WING TANK</>),
  line(['cockpitPress', 'cockpitPressTol'],
    (inp) => <>COCKPIT PRESSURIZATION SCHEDULE LIMIT: {inp('cockpitPress')} +/- {inp('cockpitPressTol')} PSI</>),

  line(['starterCycles'], (inp) => <>STARTER DUTY CYCLE IS LIMITED TO FOUR {inp('starterCycles', 'm')} CYCLES</>),
  line(['coolingFirst'], (inp) => <>COOLING PERIOD AFTER FIRST STARTER CYCLE {inp('coolingFirst', 'm')}</>),
  line(['coolingSecond'], (inp) => <>COOLING PERIOD AFTER SECOND STARTER CYCLE {inp('coolingSecond', 'm')}</>),
  line(['coolingThird'], (inp) => <>COOLING PERIOD AFTER THIRD STARTER CYCLE {inp('coolingThird', 'm')}</>),
  line(['coolingFourth'], (inp) => <>COOLING PERIOD AFTER FOURTH STARTER CYCLE {inp('coolingFourth', 'm')}</>),

  line(['invertedFlight'], (inp) => <>INVERTED FLIGHT {inp('invertedFlight')} sec</>),
  line(['zeroG'], (inp) => <>INTENTIONAL ZERO G FLIGHT {inp('zeroG')} sec</>),
  line(['negG'], (inp) => <>NEGATIVE G OPERATIONS {inp('negG')} sec</>),
  line(['negG25'], (inp) => <>DO NOT EXCEED -2.5 G FOR LONGER THAN {inp('negG25')} sec</>),
  line(['minPosG'], (inp) => <>MIN. POS Gs UPRIGHT BEFORE ADDITIONAL NEG Gs {inp('minPosG')} sec</>),

  line(['symCleanPos', 'symCleanNeg'], (inp) => <>SYMMETRIC CLEAN + {inp('symCleanPos')} TO {inp('symCleanNeg')} Gs</>),
  line(['symGearFlapsPos', 'symGearFlapsNeg'],
    (inp) => <>SYMMETRIC GEAR & FLAPS EXTENDED + {inp('symGearFlapsPos')} TO {inp('symGearFlapsNeg')} Gs</>),
  line(['asymCleanPos', 'asymCleanNeg'], (inp) => <>ASYMMETRIC CLEAN + {inp('asymCleanPos')} TO {inp('asymCleanNeg')} Gs</>),
  line(['asymGearFlapsPos', 'asymGearFlapsNeg'],
    (inp) => <>ASYMMETRIC GEAR & FLAPS EXTENDED + {inp('asymGearFlapsPos')} TO {inp('asymGearFlapsNeg')} Gs</>),
  line(['negOne', 'bankAngleChange'], (inp) => <>UNCOORDINATED ROLLING MANEUVERS INITIATED AT {inp('negOne')} G
    SHALL BE LIMITED TO A {inp('bankAngleChange')} DEGREE BANK ANGLE CHANGE</>),

  line(['minBattStart'], (inp) => <>MIN VOLTAGE FOR BATTERY START {inp('minBattStart')} VOLTS</>),
  line(['maxCrosswindDry'], (inp) => <>MAX CROSSWIND FOR DRY RUNWAY {inp('maxCrosswindDry')} KNOTS</>),
  line(['maxCrosswindWet'], (inp) => <>MAX CROSSWIND FOR WET RUNWAY {inp('maxCrosswindWet')} KNOTS</>),
  line(['maxCrosswindIcy'], (inp) => <>MAX CROSSWIND FOR ICY RUNWAY {inp('maxCrosswindIcy')} KNOTS</>),
  line(['maxTailwind'], (inp) => <>MAX TAILWIND COMPONENT FOR TAKEOFF {inp('maxTailwind')} KNOTS</>),
  line(['maxFuelFlow'], (inp) => <>MAXIMUM FUEL FLOW {inp('maxFuelFlow')} PPH OR LESS</>),
];

// Every answer a card asks for: its own blanks, then its notes'.
export const cardFields = cardFieldsIn(NOTES);
