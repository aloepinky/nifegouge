import React from 'react';

// Single Mode on NIFE's limits page: the C172 sheet one box at a time (the card shape and the
// blanks' sizes are in epsLimits/SingleLimits.js). An instrument's boxes are cards named for its
// row and column, as the other schools' grids are; every other row is a card named by its label.
// The sheet shows a box's unit as the box's placeholder, which a filled box hides, so a card
// prints it after the box.

export const NOTES = {};

const box = (title, field, unit, size) => ({
  title, fields: [field], notes: [], body: (inp) => <>{inp(field, size)}{unit && <> {unit}</>}</>,
});
const V = (s) => <>V<sub>{s}</sub></>;

// In the sheet's order.
export const CARDS = [
  box('Tachometer / Normal', 'tachMin', 'RPM', 'm'),
  box('Tachometer / Max', 'tachMax', 'RPM'),
  box('Oil Temp / Normal', 'oilTempNormal', '°F', 'm'),
  box('Oil Temp / Max', 'oilTempMax', '°F'),
  box('Oil Press / Min', 'oilPressMin', 'PSI'),
  box('Oil Press / Normal', 'oilPressNormal', 'PSI', 'm'),
  box('Oil Press / Max', 'oilPressMax', 'PSI'),
  box('Oil Quantity / Min', 'oilQuantMin', 'qts'),
  box('Oil Quantity / Normal', 'oilQuantNormal', 'qts', 'm'),
  box('Oil Quantity / Max', 'oilQuantMax', 'qts'),
  box('Carb. Air Temp / Caution', 'carbTemp', '°C', 'm'),
  box('Starter Duty Cycle', 'starterDuty', null, 'full'),
  box('Max Weight', 'maxWeight', 'lbs', 'm'),
  box('Baggage Allowance', 'baggage', 'lbs'),
  box('Fuel Capacity', 'fuelCapacity', 'gal'),
  box('Max Crosswind', 'maxCrosswind', 'kts'),
  box('Max Angle of Bank', 'maxBank', '°'),
  box('Service Ceiling', 'serviceCeiling', 'ft', 'm'),
  box('Wingspan', 'wingspan', 'ft'),
  box('Limit Load Factors / Flaps Up', 'flapsUpMax', '(+ to -)', 'l'),
  box('Limit Load Factors / Flaps Down', 'flapsDownMax', '(+ to -)', 'l'),
  box(V('NE'), 'vne', 'KIAS'),
  box(V('NO'), 'vno', 'KIAS'),
  box(V('A'), 'va', 'KIAS'),
  box(V('FE'), 'vfe', 'KIAS'),
  box(V('Y'), 'vy', 'KIAS'),
  box(V('X'), 'vx', 'KIAS'),
  box(V('glide'), 'vglide', 'KIAS'),
  box(V('R'), 'vr', 'KIAS'),
  box(V('S'), 'vs', 'KIAS'),
  box(V('SO'), 'vso', 'KIAS'),
];

export const cardFields = (card) => card.fields;
