// The six systems that have a diagram: the :tab value in /tw4/systems/:tab and its nav label.
//
// Split out from Systems.js so a consumer can name a system without importing the diagrams
// themselves — the discuss item pages link here, and pulling Systems.js in would drag all six
// schematics into the discuss bundle.
//
// Adding a system: one line here, plus its component in the DIAGRAMS map in Systems.js.
export const SYSTEM_TABS = [
  { id: 'hyds',  label: 'Hydraulics' },
  { id: 'prop',  label: 'Propeller' },
  { id: 'oil',   label: 'Oil' },
  { id: 'elec',  label: 'Electrical' },
  { id: 'obogs', label: 'OBOGS' },
  { id: 'fuel',  label: 'Fuel' },
];

export function getSystemTab(id) {
  return SYSTEM_TABS.find(t => t.id === id) || null;
}
