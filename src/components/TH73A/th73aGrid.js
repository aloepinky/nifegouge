import React from 'react';

// The TH-73A engine grid's layout, shared by the table (TH73ALimits.js) and Single Mode's cards.
export const DASH = <span className="t44c-dash">---</span>;

// A row of the grid: the label, then its eight cells in column order, the NATOPS's own headings
// (§4.3 to §4.11): minimum, cautionary, continuous, take-off (5 minutes), maximum take-off
// (5 minutes), maximum, transient, and the transient's time limit. A cell is a field key,
// `[key, marker]` for a blank the sheet hangs a note on, or one of the sheet's own printed
// cells; a note's number is also printed on a row label, as the T-54A sheet prints "(8)" on
// Max Reverse. A marked cell may give its blank a width of its own (`[key, marker, size]`):
// the oil temperature's time limit holds "5 MINUTES", which the usual narrow blank cuts off. Every note has its number somewhere on the grid, and only those notes are
// printed. Every transient's time limit is asked, with its unit.
export const GRID = [
  // §4.3
  ['N1 % (2)', 'n1Min', ['n1Caut', '(1)'], 'n1Cont', 'n1Takeoff', 'n1Max', DASH, 'n1Trans', 'n1TransTime'],
  ['N2 % (3)', 'n2Min', 'n2Caut', 'n2Cont', DASH, DASH, 'n2Max', 'n2Trans', 'n2TransTime'],
  ['ITT °C', DASH, DASH, 'ittCont', 'ittTakeoff', 'ittMax', DASH, 'ittTrans', 'ittTransTime'],
  ['ITT STARTING °C (4)', DASH, DASH, DASH, DASH, DASH, 'ittStartMax', 'ittStartTrans', 'ittStartTransTime'],
  ['TORQUE %', DASH, DASH, 'trqCont', 'trqTakeoff', 'trqMax', DASH, 'trqTrans', 'trqTransTime'],
  // §4.4
  ['NR POWER-ON %', 'nrOnMin', 'nrOnCaut', 'nrOnCont', DASH, DASH, 'nrOnMax', 'nrOnTrans', 'nrOnTransTime'],
  ['NR POWER-OFF % (5)', 'nrOffMin', DASH, 'nrOffCont', DASH, DASH, 'nrOffMax', 'nrOffTrans', 'nrOffTransTime'],
  // §4.5
  ['FUEL PRESS PSI', DASH, 'fuelPressCaut', 'fuelPressCont', DASH, DASH, 'fuelPressMax', DASH, DASH],
  // §4.6
  ['ENG OIL PRESS PSI', 'engOilPMin', ['engOilPCaut', '(6)'], 'engOilPCont', DASH, DASH, ['engOilPMax', '(7)'], DASH, DASH],
  ['ENG OIL TEMP °C', DASH, DASH, 'engOilTCont', DASH, DASH, 'engOilTMax', 'engOilTTrans', ['engOilTTransTime', '(8)', 'wide']],
  // §4.7
  ['XMSN OIL PRESS PSI', 'xmsnOilPMin', 'xmsnOilPCaut', 'xmsnOilPCont', DASH, DASH, 'xmsnOilPMax', DASH, DASH],
  ['XMSN OIL TEMP °C', DASH, DASH, 'xmsnOilTCont', DASH, DASH, 'xmsnOilTMax', DASH, DASH],
  // §4.9, §4.10
  ['GENERATOR A', DASH, DASH, 'genCont', DASH, DASH, 'genMax', 'genTrans', 'genTransTime'],
  ['AUX GENERATOR A', DASH, DASH, 'auxGenCont', DASH, DASH, 'auxGenMax', 'auxGenTrans', 'auxGenTransTime'],
  // §4.11
  ['HYDRAULIC PSI', 'hydMin', 'hydCaut', 'hydCont', DASH, DASH, 'hydMax', DASH, DASH],
];

export const COLUMNS = ['Minimum', 'Cautionary', 'Continuous', 'Take-off', 'Maximum take-off', 'Maximum', 'Transient', 'Transient time limit'];
