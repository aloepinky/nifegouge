import { aliasesFrom } from '../epsLimits/controlMatch';

// The C172 cockpit poster and its click targets. See epsLimits/CockpitPoster.js for how a record
// is drawn and epsLimits/SpotEditor.js (?spots, development builds) for how the boxes are
// measured — every `box` is [left, top, width, height] as FRACTIONS of the image, so re-cropping
// the asset at another resolution leaves them where they are.
//
// The drawing is the C172P, which is what NIFE flies, and that is what makes this page work.
// It is carburetted, so CARB HT is on the panel where a fuel-injected 172R has nothing, and it
// draws the PRIMER, both yokes and the floor-mounted fuel selector. Every control the seven EPs
// name is on it, so only the steps that are not controls at all are left as buttons.
//
// One region: there is nothing to switch between, so CockpitPoster draws no region row.
//
// `values` is NOT a list a click steps through. Clicking the control a step names hands over that
// step's whole answer, setting and all (epsLimits/stepFlow.js). It is the record of every setting
// the EPs put this control to, and tools/check-posters.js fails on a step whose setting no record
// lists.

// Two columns of buttons, one either side of the EP card, for the steps no control performs.
// Split by what the student is doing: flying the aeroplane and preparing the cabin on one side,
// shutting down, fire and getting out on the other.
const ACTIONS_LEFT = [
  { label: 'TTNSLS', action: 'Turn Towards Nearest Suitable Landing Site' },
  { label: 'Directional Control', action: 'Maintain Directional Control' },
  { label: 'Land ASAP', action: 'Land As Soon As Possible' },
  { label: 'Brakes', action: 'Brakes', values: ['AS REQ'] },
  { label: 'Doors', action: 'Doors', values: ['UNLATCHED'] },
];

const ACTIONS_RIGHT = [
  { label: 'ESOD', action: 'Emergency Shutdown on Deck', values: ['EXECUTE'] },
  { label: 'Fire Extinguisher', action: 'Fire Extinguisher', values: ['ACTIVATE AS REQ'] },
  { label: 'Evacuate Aircraft', action: 'Aircraft', values: ['EVACUATE AS REQ'] },
  { label: 'Cabin Windows', action: 'Cabin Windows', values: ['OPEN AS REQ'] },
  { label: 'MAYDAY', action: 'Declare', values: ['MAYDAY'] },
];

export const C172_POSTER = {
  // Pre-scale: the page's own 0.8 transform reduces it. The drawing is 1.2:1, so without this
  // the default 500 would render it about half the width of a 2:1 panel and the placards would
  // go unreadable.
  bandHeight: 780,
  regions: [
    {
      id: 'panel',
      label: 'Cockpit',
      src: '/images/c172-panel.webp',
      alt: 'Cessna 172P cockpit: flight instruments left, radio stack centre, the switch row '
        + 'along the bottom with primer, magnetos, carb heat, throttle and mixture, both control '
        + 'yokes, and the fuel selector on the pedestal between the seats',
      spots: [
        { box: [0.182, 0.134, 0.071, 0.083], label: 'Airspeed indicator',
          action: 'Airspeed', values: ['68 KIAS'] },

        { box: [0.037, 0.51, 0.030, 0.035], label: 'Primer',
          action: 'Primer', values: ['IN/LOCKED'] },
        { box: [0.066, 0.46, 0.0215, 0.04], label: 'Master switch (ALT / BAT)',
          action: 'Master', values: ['OFF', 'ON'] },
        { box: [0.093, 0.508, 0.024, 0.03], label: 'Magneto / ignition key',
          action: 'Mags', also: ['Cranking'], values: ['OFF', 'BOTH (Start if prop stopped)', 'CONTINUE'] },
        // The switches, not the breakers. Everything from the magnetos across to x=0.35 is the
        // circuit breaker bank — the numbered circles — and turning all electrical equipment off
        // means the white rockers: TAXI LT and LDG LT above, PITOT HT, NAV LT, BCN LT and
        // STROBE LT below.
        { box: [0.325, 0.462, 0.056, 0.085], label: 'Electrical switch rockers',
          action: 'All Electrical Equipment', values: ['OFF'] },
        { box: [0.15, 0.52, 0.015, 0.020], label: 'Avionics power',
          action: 'Avionics Power Switch', values: ['OFF'] },

        { box: [0.395, 0.472, 0.035, 0.045], label: 'Carburettor heat',
          action: 'Carb Heat', values: ['ON'] },
        { box: [0.47, 0.454, 0.053, 0.068], label: 'Throttle',
          action: 'Throttle', values: ['IDLE', '1700 RPM (5 sec)', 'FULL'] },
        { box: [0.544, 0.457, 0.052, 0.065], label: 'Mixture',
          action: 'Mixture', values: ['IDLE CUTOFF', 'FULL RICH'] },
        { box: [0.622, 0.46, 0.045, 0.08], label: 'Wing flap lever',
          action: 'Flaps', values: ['AS REQ'] },

        { box: [0.728, 0.47, 0.027, 0.032], label: 'Cabin heat pull',
          action: 'Cabin Heat / Air', values: ['OFF'] },
        { box: [0.728, 0.514, 0.027, 0.032], label: 'Cabin air pull',
          action: 'Vents / Cabin Air', values: ['CLOSED'] },

        { box: [0.418, 0.865, 0.123, 0.130], label: 'Fuel selector',
          action: 'Fuel Selector', values: ['OFF', 'BOTH'] },

        // Both yokes carry both yoke steps. `actions` rather than `also`: these are two
        // different controls sharing one target, not two spellings of one, so they must not
        // become aliases of each other. A click writes whichever the checklist asks for next,
        // so it does the right thing whichever yoke is reached for. Both remain buttons too.
        { id: 'yoke-left', box: [0.104, 0.588, 0.275, 0.185], label: 'Left yoke',
          action: 'Turn Towards Nearest Suitable Landing Site',
          actions: ['Turn Towards Nearest Suitable Landing Site', 'Maintain Directional Control'] },
        { id: 'yoke-right', box: [0.605, 0.588, 0.275, 0.185], label: 'Right yoke',
          action: 'Turn Towards Nearest Suitable Landing Site',
          actions: ['Turn Towards Nearest Suitable Landing Site', 'Maintain Directional Control'] },
      ],
    },
  ],

  // The flat list is what aliasesFrom and tools/check-posters.js read; the pair is what the page
  // draws, one column either side of the EP card.
  actions: [...ACTIONS_LEFT, ...ACTIONS_RIGHT],
  actionColumns: [ACTIONS_LEFT, ACTIONS_RIGHT],
};

export const C172_ALIASES = aliasesFrom(C172_POSTER);
