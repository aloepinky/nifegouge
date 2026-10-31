import React from 'react';

// The T-44C engine grid's layout, shared by the table (T44CLimits.js) and Single Mode's cards
// (t44cCards.js).
export const DASH = <span className="t44c-dash">---</span>;

// A row of the engine grid: the label, then its eight cells in column order. A cell is either a
// field key or one of the sheet's own printed cells.
export const GRID = [
  ['MAX. ALLOWABLE', 'maxAllowTime', 'maxAllowTq2200', DASH, 'maxAllowItt', 'maxAllowN1', 'maxAllowNp', 'maxAllowOilP', 'maxAllowOilT'],
  ['MAX. CONTINUOUS (8)', 'maxContTime', 'maxContTq2200', 'maxContTq1900', 'maxContItt', 'maxContN1', 'maxContNp', 'maxContOilP', 'maxContOilT'],
  ['CRUISE CLIMB', 'cruiseClimbTime', 'cruiseClimbTq2200', 'cruiseClimbTq1900', 'cruiseClimbItt', 'cruiseClimbN1', 'cruiseClimbNp', 'cruiseClimbOilP', 'cruiseClimbOilT'],
  ['CRUISE', 'cruiseTime', 'cruiseTq2200', 'cruiseTq1900', 'cruiseItt', 'cruiseN1', 'cruiseNp', 'cruiseOilP', 'cruiseOilT'],
  ['HI-IDLE (1)', 'hiIdleTime', DASH, DASH, DASH, DASH, DASH, DASH, 'hiIdleOilT'],
  // The sheet hangs footnote 10 on STARTING's Np cell; NATOPS Figure 4.3-1 puts it on LO-IDLE's,
  // the row note 10 is about (prop rpm with the condition levers at low idle).
  ['LO-IDLE (2)', 'loIdleTime', DASH, DASH, ['loIdleItt', '6'], DASH, <span key="np">{DASH} <sup>10</sup></span>, ['loIdleOilP', '', '(Min)'], 'loIdleOilT'],
  ['STARTING', 'startingTime', DASH, DASH, ['startingItt', '4'], DASH, DASH, <span key="ind">Indication</span>, ['startingOilT', '', '(MIN)']],
  ['ACCELERATION (7)', 'accelTime', 'accelTq', null, 'accelItt', 'accelN1', 'accelNp', DASH, 'accelOilT'],
  ['MAX. REVERSE', 'maxRevTime', DASH, DASH, 'maxRevItt', 'maxRevN1', 'maxRevNp', 'maxRevOilP', 'maxRevOilT'],
];

export const COLUMNS = ['Max time', 'Torque at 2,200 rpm', 'Torque at 1,900 rpm', 'Max observed ITT', 'N1 percent', 'Np rpm', 'Oil pressure', 'Oil temperature'];
