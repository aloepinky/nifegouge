import React from 'react';

// The T-54A engine grid's layout, shared by the table (T54ALimits.js) and Single Mode's cards.
export const DASH = <span className="t44c-dash">---</span>;

// A row of the engine grid: the label, then its six cells in column order. A cell is a field
// key, `[key, marker]` for a blank the sheet hangs a footnote on, or one of the sheet's own
// printed cells.
export const GRID = [
  ['Starting', DASH, ['startingItt', '(5)'], DASH, DASH, DASH, 'startingOilT'],
  ['Low Idle', DASH, ['loIdleItt', '(6)'], 'loIdleN1', 'loIdleN2', 'loIdleOilP', 'loIdleOilT'],
  ['High Idle', DASH, DASH, 'hiIdleN1', DASH, DASH, 'hiIdleOilT'],
  ['Takeoff and Max Cont', ['takeoffTq', '(10)'], 'takeoffItt', 'takeoffN1', ['takeoffN2', '(9)'], 'takeoffOilP', 'takeoffOilT'],
  ['Cruise Climb', ['cruiseClimbTq', '(7)(10)'], 'cruiseClimbItt', 'cruiseClimbN1', ['cruiseClimbN2', '(9)'], 'cruiseClimbOilP', 'cruiseClimbOilT'],
  ['Max Cruise', ['maxCruiseTq', '(7)(10)'], 'maxCruiseItt', 'maxCruiseN1', ['maxCruiseN2', '(9)'], 'maxCruiseOilP', 'maxCruiseOilT'],
  ['Normal Cruise', ['normCruiseTq', '(7)(10)'], 'normCruiseItt', 'normCruiseN1', ['normCruiseN2', '(9)'], 'normCruiseOilP', 'normCruiseOilT'],
  ['Max Reverse (8)', DASH, 'maxRevItt', 'maxRevN1', 'maxRevN2', 'maxRevOilP', 'maxRevOilT'],
  ['TRANSIENT', ['transientTq', '(5)'], 'transientItt', 'transientN1', ['transientN2', '(5)'], 'transientOilP', 'transientOilT'],
];

export const COLUMNS = ['Torque', 'Max observed ITT', 'N1 percent', 'Prop rpm N2', 'Oil pressure', 'Oil temperature'];
