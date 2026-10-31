import React from 'react';
import { cardFieldsIn } from '../epsLimits/SingleLimits';
import { GRID } from './th73aGrid';

// Single Mode on the TH-73A's limits page: the sheet one box at a time (the card shape and the
// blanks' sizes are in epsLimits/SingleLimits.js). Each box of the grid is a card named for its
// row and column, as the T-44C's are. A note with blanks is shown under the one box it hangs on
// (6, 7, 8); one that hangs on a whole row (2 to 5) is a card of its own. Note 1, with no blank,
// is shown under its box. A row that says nothing without its table's heading (the slope limits,
// the starter) takes that heading as its name.

export const NOTES = {
  1: { fields: [], body: () => <>Autorotation only.</> },
  2: {
    fields: ['note2N1Idle'],
    body: (inp) => <>IDLE N1 may decrease below {inp('note2N1Idle')}% when the generator and other aircraft systems
      are turned on. This is normal.</>,
  },
  3: {
    fields: ['note3N2Indicated', 'note3ActualMin', 'note3ActualMax', 'note3TransientBegins', 'note3Protracted'],
    body: (inp) => <>Caution: An N2 indication of {inp('note3N2Indicated')}% corresponds with an actual N2 value
      of {inp('note3ActualMin')}% to {inp('note3ActualMax')}%. The N2 transient region begins
      at {inp('note3TransientBegins')}%. Protracted operation at N2 values of {inp('note3Protracted')}% should be
      avoided to minimize the possibility of N2 overspeed.</>,
  },
  4: {
    fields: ['note4IttTen', 'note4IttTwo'],
    body: (inp) => <>A linear variation applies above {inp('note4IttTen')} °C, ten seconds, and {inp('note4IttTwo')} °C,
      two seconds.</>,
  },
  5: { fields: ['note5Split'], body: (inp) => <>Power-Off is an N2/NR split by {inp('note5Split')}% or more.</> },
  6: { fields: ['note6N1'], body: (inp) => <>With N1 &lt;{inp('note6N1')}%.</> },
  7: {
    fields: ['note7OilPress'],
    body: (inp) => <>During cold starting conditions the oil pressure can temporarily exceed {inp('note7OilPress')} psi;
      it reduces as oil temperature increases.</>,
  },
  8: { fields: ['note8N1'], body: (inp) => <>With N1 at {inp('note8N1')} ±1%.</> },
};

const COLUMN_HEADS = [
  'MINIMUM', 'CAUTIONARY', 'CONTINUOUS', 'TAKE-OFF (5 MIN)', 'MAX TAKE-OFF (5 MIN)', 'MAXIMUM', 'TRANSIENT',
  'TRANSIENT TIME LIMIT',
];
const numbersIn = (marker) => (marker.match(/\d+/g) || []).map(Number);

const gridCards = GRID.flatMap(([row, ...cells]) => cells.flatMap((spec, i) => {
  const [field, marker] = Array.isArray(spec) ? spec : [spec];
  if (typeof field !== 'string') return [];
  return [{
    title: `${row} / ${COLUMN_HEADS[i]}`,
    fields: [field],
    body: (inp) => <>{inp(field, i === 7 ? 'l' : 'm')}{marker && <sup> {marker}</sup>}</>,
    notes: marker ? numbersIn(marker) : [],
  }];
}));

const note = (title, n) => ({ title, fields: [], body: () => null, notes: [n] });
const line = (fields, body, title) => ({ title, fields, body, notes: [] });
const V = (s) => <>V<sub>{s}</sub></>;

const STARTER = 'ENGINE STARTER LIMITATIONS';
const SLOPE = 'SLOPE TAKEOFF AND LANDING';

// In the sheet's order: the grid row by row, the row notes, then down the left column and the
// right.
export const CARDS = [
  ...gridCards,
  note('N1 % (2)', 2),
  note('N2 % (3)', 3),
  note('ITT STARTING °C (4)', 4),
  note('NR POWER-OFF % (5)', 5),

  line(['fuelReserve'], (inp) => <>PLANNED FUEL RESERVE (NO. 1 CELL): {inp('fuelReserve')} LB</>),
  line(['fuelMinLanding'], (inp) => <>MINIMUM FUEL ON LANDING (NO. 1 CELL): {inp('fuelMinLanding')} LB</>),
  line(['fuelSideward'], (inp) => <>SIDEWARD FLIGHT OR CROSSWIND HOVER MAY FLAME OUT BELOW: {inp('fuelSideward')} LB</>),

  line(['battOn', 'battOff', 'battCool'], (inp) => <>ON BATTERY: {inp('battOn')} SEC ON, {inp('battOff')} SEC OFF, TWICE,
    THEN {inp('battCool')} MINUTES OFF</>, STARTER),
  line(['extOn', 'extOff', 'extCool'], (inp) => <>EXTERNAL POWER: {inp('extOn')} SEC ON, {inp('extOff')} SEC OFF, TWICE,
    THEN {inp('extCool')} MINUTES OFF</>, STARTER),

  line(['slopeNoseUp'], (inp) => <>NOSE-UP: {inp('slopeNoseUp')} DEG</>, SLOPE),
  line(['slopeSideUp'], (inp) => <>SIDE-UP: {inp('slopeSideUp')} DEG</>, SLOPE),
  line(['slopeNoseDown'], (inp) => <>NOSE-DOWN: {inp('slopeNoseDown')} DEG</>, SLOPE),
  line(['slopeNoseDownClear'], (inp) => <>NOSE-DOWN (UNOBSTRUCTED TAIL): {inp('slopeNoseDownClear')} DEG</>, SLOPE),

  line(['gwGround'], (inp) => <>MAX GROSS WEIGHT FOR GROUND OPERATIONS: {inp('gwGround', 'm')} LB</>),
  line(['gwMax'], (inp) => <>MAXIMUM GROSS WEIGHT: {inp('gwMax', 'm')} LB</>),
  line(['gwMin'], (inp) => <>MINIMUM GROSS WEIGHT FOR FLIGHT: {inp('gwMin', 'm')} LB</>),
  line(['gwExternal'], (inp) => <>MAX GROSS WEIGHT WITH LOAD ON CARGO HOOK: {inp('gwExternal', 'm')} LB</>),

  line(['rotorBrakeNr'], (inp) => <>ROTOR BRAKE ONLY AFTER SHUTDOWN WITH NR BELOW: {inp('rotorBrakeNr')} %</>),
  line(['chipBurnerMax'], (inp) => <>MAX CHIPS CLEARED PER DETECTION SYSTEM PER FLIGHT: {inp('chipBurnerMax')}</>),

  line(['muhAttentive'], (inp) => <>BOTH HELIPILOTS, FLY ATTENTIVE BELOW: {inp('muhAttentive')} FT AGL</>),
  line(['muhManual'], (inp) => <>BOTH HELIPILOTS, FLY MANUALLY BELOW: {inp('muhManual')} FT AGL</>),
  line(['muhOneInop'], (inp) => <>ONE HELIPILOT INOP, FLY MANUALLY BELOW: {inp('muhOneInop')} FT AGL</>),
  line(['fdMuhCruise'], (inp) => <>FD MIN USE HEIGHT, CRUISE/CLIMB/DESCENT: {inp('fdMuhCruise')} FT AGL</>),
  line(['fdMuhApproach'], (inp) => <>FD MIN USE HEIGHT, APPROACH: {inp('fdMuhApproach')} FT AGL</>),
  line(['ilsGradient'], (inp) => <>ILS STEEPEST APPROACH GRADIENT: {inp('ilsGradient')} DEG</>),
  line(['ilsDescent'], (inp) => <>ILS MAXIMUM RATE OF DESCENT: {inp('ilsDescent')} FT/MIN</>),

  line(['vnePlacard'], (inp) => <>{V('NE')} PLACARD, SEA LEVEL: {inp('vnePlacard')}</>),
  line(['vneIfr'], (inp) => <>{V('NE')} MAX IFR AIRSPEED (LESSER OF {V('NE')} POWER ON OR): {inp('vneIfr')}</>),
  line(['vmini'], (inp) => <>{V('MINI')} MIN IFR AIRSPEED: {inp('vmini')}</>),
  line(['vminApp'], (inp) => <>{V('MIN APP')} MIN IFR APPROACH AIRSPEED: {inp('vminApp')}</>),
  line(['vmaxApp'], (inp) => <>{V('MAX APP')} MAX IFR APPROACH AIRSPEED: {inp('vmaxApp')}</>),
  line(['vMinAuto'], (inp) => <>MIN AUTOROTATION AIRSPEED (NO EXTERNAL REFS): {inp('vMinAuto')}</>),
  line(['vTakeoffPower'], (inp) => <>MAX AIRSPEED WITH TORQUE 100 TO 108.5%: {inp('vTakeoffPower')}</>),
  line(['vDoorsOpen'], (inp) => <>{V('NE')} ONE OR BOTH DOORS OPEN OR REMOVED: {inp('vDoorsOpen')}</>),
  line(['vDoorsMoving'], (inp) => <>{V('NE')} DURING DOORS OPENING AND CLOSING: {inp('vDoorsMoving')}</>),
  line(['vSearchlight'], (inp) => <>MAX SPEED, SEARCHLIGHT EXTENSION/RETRACTION: {inp('vSearchlight')}</>),
  line(['vTouchdown'], (inp) => <>MAX TOUCHDOWN SPEED AFTER ENGINE FAILURE: {inp('vTouchdown')} KT</>),
  line(['vOneHelipilot'], (inp) => <>ONE HELIPILOT INOPERATIVE, MAX AIRSPEED: {inp('vOneHelipilot')}</>),
  line(['rocOneHelipilot'], (inp) => <>ONE HELIPILOT INOPERATIVE, MAX RATE OF CLIMB: {inp('rocOneHelipilot')} FPM</>),
  line(['vFdHelipilotInop'], (inp) => <>FD ENGAGED, ANY HELIPILOT INOP, MAX AIRSPEED: {inp('vFdHelipilotInop')}</>),

  line(['maxAltitude'], (inp) => <>MAXIMUM OPERATING ALTITUDE: {inp('maxAltitude', 'm')} FT HP</>),
  line(['oatMin'], (inp) => <>MINIMUM AMBIENT AIR TEMPERATURE: {inp('oatMin')} °C</>),
  line(['oatMax'], (inp) => <>MAXIMUM SEA LEVEL AMBIENT AIR TEMPERATURE: {inp('oatMax')} °C</>),
  line(['oatLapse'], (inp) => <>MAXIMUM DECREASES EVERY 1000 FT BY: {inp('oatLapse')} °C</>),

  line(['prohib1', 'prohib2', 'prohib3'], (inp) => <ol className="epl-single-list">
    <li>{inp('prohib1', 'full')}</li>
    <li>{inp('prohib2', 'full')}</li>
    <li>{inp('prohib3', 'full')}</li>
  </ol>, 'PROHIBITED MANEUVERS'),
  line(['prohibOp1', 'prohibOp2'], (inp) => <ol className="epl-single-list">
    <li>OPERATING IN {inp('prohibOp1', 'l')}</li>
    <li>IFR OPERATIONS WITH {inp('prohibOp2', 'full')}</li>
  </ol>, 'PROHIBITED OPERATIONS'),
];

export const cardFields = cardFieldsIn(NOTES);
