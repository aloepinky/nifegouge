// The Jet Log Parameters panel holds two different kinds of number, and a shared jet log may
// carry only one of them.
//
// Some are properties of the profile being flown: how long a practice approach takes and what
// it burns, the T&G allowance, the hold. Those belong to the route, and a jet log that did not
// carry them would compute differently for whoever opened it — the nine Local and Capstone
// routes all set approach fuel to 75 lbs for exactly that reason.
//
// The rest are the pilot's and the day's: start fuel, the STTO allowance, the standard
// reserve. Publishing those into a shared corpus would put one person's fuel load on everybody
// else's flight plan, so a jet log never carries them and never overwrites them.
//
// That split is the reason this is an allowlist rather than "save whichever parameters differ
// from the defaults", which leaks the second kind the moment anyone has customised it.

export const DEFAULT_PARAMS = {
  startFuel: '1100',
  sttoTime: '1',
  sttoFuel: '50',
  holdTime: '15',
  approachTime: '10',
  approachFuel: '50',
  tngTime: '5',
  tngFuel: '25',
  stdReserve: '200',
  includeFinalApr: true,
};

export const ROUTE_PARAM_KEYS = [
  'holdTime', 'approachTime', 'approachFuel', 'tngTime', 'tngFuel', 'includeFinalApr',
];

// How the panel labels them, for the line in the publish panel that says what is riding along.
const LABELS = {
  holdTime: 'hold time',
  approachTime: 'approach time',
  approachFuel: 'approach fuel',
  tngTime: 'T&G time',
  tngFuel: 'T&G fuel',
  includeFinalApr: 'auto final approach fuel',
};

// What a published jet log carries: the route parameters this one changed, or nothing.
export function captureParams(params) {
  const out = {};
  for (const key of ROUTE_PARAM_KEYS) {
    if (params[key] !== DEFAULT_PARAMS[key]) out[key] = params[key];
  }
  return Object.keys(out).length ? out : undefined;
}

// Loading a jet log resets the route parameters and then applies the ones it carries, so a
// shared jet log computes the same for everyone who opens it. Without the reset, a route that
// set approach fuel to 75 left it at 75 for every jet log opened afterwards.
export function applyParams(params, logParams) {
  const out = { ...params };
  for (const key of ROUTE_PARAM_KEYS) out[key] = DEFAULT_PARAMS[key];
  return { ...out, ...(logParams || {}) };
}

// "approach fuel 75, T&G time 7" — the publish panel states what it is about to save.
export function describeParams(params) {
  const captured = captureParams(params);
  if (!captured) return '';
  return Object.keys(captured)
    .map((key) => `${LABELS[key] || key} ${captured[key] === true ? 'on' : captured[key] === false ? 'off' : captured[key]}`)
    .join(', ');
}
