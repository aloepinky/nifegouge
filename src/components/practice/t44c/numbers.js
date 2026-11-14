// The numbers a T-44C student flies: Multi-Engine FTI Chapter One, §104 (high work) and §106
// (pattern), as bare tables for chair flying. Pure data, no JSX. A row is [label, value]; a row
// with a null value is a reminder and is not asked.

import { T44C_EPS } from '../../T44C/t44cData';

const f = (loc, pages) => ({ work: 'ME FTI', loc: `Ch. 1 — ${loc}`, pages });
const ft = (n) => `${n.toLocaleString('en-US')}'`;

// A NATOPS memory procedure's steps as rows, from the EPs/Limits sheet's data.
const epRows = (id) => T44C_EPS.find((e) => e.id === id).rows.filter((r) => r.text).map((r) => r.text.split(' - '));

const DITCH_REF ={ work: 'T-44C NATOPS', loc: 'Ch. 16 — Ditching Technique; ME FTI Ch. 1 — High-Work, p. 1-26', pages: 'p. 16.11-1' };

export const MANEUVERS = {
  lsc: {
    label: 'Level speed change',
    ref: f('High-Work', 'p. 1-15'),
    rows: [['Normal cruise', '150 KIAS'], ['Fast cruise', '170 KIAS'], ['Slow cruise', '130 KIAS'], ['Normal cruise', '150 KIAS']],
  },
  turns: {
    label: 'Turn pattern',
    ref: f('High-Work', 'p. 1-16'),
    rows: [['Airspeed', '150 KIAS'], ['Prop levers', '1900 RPM'], ['First turn', '30° bank, 180°'], ['Reversal', '30° bank, 180°'], ['Next turn', '45° bank, 360°'], ['Reversal', '45° bank, 360°'], ['Lead rollout', '1/3 the AOB']],
  },
  slow: {
    label: 'Slow flight',
    ref: f('High-Work', 'p. 1-16'),
    rows: [['Prop levers', '1900 RPM'], ['Start', '150 KIAS'], ['Power', '400 ft-lbs'], ['Flaps', 'Approach'], ['Landing gear', 'Down, Landing Checklist complete'], ['Stabilize', '100 KIAS'], ['Turn', '90° at 30° AOB, and back'], ['Flaps', 'Down'], ['Slow to', '90 KIAS'], ['Turn', '90° and reversal'], ['Recover: power', 'Max Continuous'], ['Flaps', 'Approach'], ['Landing gear', 'Up'], ['Flaps', 'Up'], ['Airspeed', '150 KIAS']],
  },
  stallClean: {
    label: 'Clean, power off stall',
    stall: true,
    clean: true,
    ref: f('High-Work', 'p. 1-18'),
    rows: [['Start', '150 KIAS'], ['Clearing turn', '30° AOB'], ['Power', '400 ft-lbs'], ['Wings level', 'After 90° of turn'], ['Power', 'Idle'], ['Stop trim', '100 KIAS']],
  },
  stallDirty: {
    label: 'Dirty, power off stall',
    stall: true,
    ref: f('High-Work', 'p. 1-18'),
    rows: [['Start', '150 KIAS'], ['Clearing turn', '30° AOB'], ['Power', '400 ft-lbs'], ['Flaps', 'Approach'], ['Landing gear', 'Down, Landing Checklist'], ['Wings level', 'After 90° of turn'], ['Flaps', 'Full down'], ['Power', 'Idle'], ['Stop trim', '100 KIAS']],
  },
  stallOn: {
    label: 'Dirty, power on stall',
    stall: true,
    ref: f('High-Work', 'p. 1-19'),
    rows: [['Start', '150 KIAS'], ['Clearing turn', '30° AOB'], ['Power', '400 ft-lbs'], ['Flaps', 'Approach'], ['Landing gear', 'Down, Landing Checklist'], ['Wings level', 'After 90° of turn'], ['Flaps', 'Full down'], ['Stop trim', '100 KIAS']],
  },
  stallTurn: {
    label: 'Approach turn stall',
    stall: true,
    ref: f('High-Work', 'p. 1-19'),
    rows: [['Start', '150 KIAS'], ['Clearing turn', '30° AOB'], ['Power', '400 ft-lbs'], ['Flaps', 'Approach'], ['Landing gear', 'Down, Landing Checklist'], ['After 90° of turn', 'Maintain 30° AOB'], ['Power', '300 ft-lbs'], ['Stop trim', '100 KIAS']],
  },
  // A single-engine maneuver is flown in three tables: `rows` up to the engine cut, the Emergency
  // Shutdown Checklist (`shutdown`: 'all', or 'three' for the memory items the dynamic cut holds
  // after), then `after`.
  sseAlt: {
    label: 'SSE at altitude',
    sse: true,
    shutdown: 'all',
    ref: f('High-Work', 'p. 1-21'),
    rows: [['Engine lost', '"Power up, rudder up, clean up"'], ['Power', 'Maximum available until continued flight is assured'], ['Directional control', 'Increase airspeed, or reduce power'], ['Rudder trim', 'Highly encouraged'], ['Prop and condition levers', 'Point, do not move'], ['Actual shutdown or feather', 'No lower than 4000 feet AGL']],
    after: {
      title: 'Back to two engines',
      ref: f('High-Work', 'p. 1-22'),
      rows: [['Feathered prop', 'Out of feather, up to idle RPM first'], ['Power', 'Slowly, then match the other engine'], ['Props', 'As appropriate, fine tune to reduce cabin noise']],
    },
  },
  sseWaveoff: {
    label: 'SSE wave-off at altitude',
    sse: true,
    shutdown: 'all',
    ref: f('High-Work', 'p. 1-24'),
    rows: [['Level off', '{alt800}, 120 KIAS, numbered heading'], ['Engine lost', '"Power up, rudder up, clean up"']],
    after: {
      title: 'SSE wave-off at altitude, after the shutdown',
      rows: [['"Approaching the 180"', 'Flaps and landing gear down, Landing Checklist'], ['Turn', 'Descending left turn'], ['The "90"', '{alt500}, 110 KIAS minimum'], ['Final', '{alt250}, 110 KIAS minimum, 120 maximum'], ['Prop levers', 'Full forward'], ['"Wave-off"', 'Single-Engine Waveoff memory items:'], ...epRows('single-engine-waveoff'), ['Ball', '¼ to ½ out towards the operating engine'], ['AOB into the operating engine', 'Up to 5º'], ['Airspeed', 'VXSE minimum, VYSE maximum'], ['Complete', 'Clean climb, trimmed, balanced flight']],
    },
  },
  dynamic: {
    label: 'Dynamic engine cut',
    min5000: true,
    shutdown: 'three',
    ref: f('High-Work', 'p. 1-24'),
    rows: [['Start', '150 KIAS, numbered heading'], ['Five', '5000 ft minimum'], ['Four', 'Propellers full forward'], ['Three', '300 ft/lbs torque'], ['Two', '2 degrees nose up trim'], ['One', 'Prop Sync Switch-Off'], ['Landing gear', 'Down, Landing Checklist'], ['Approaching 95 KIAS', 'Takeoff power, rotate 7-10 degrees up'], ['IP pulls a power lever', 'Raise your hand slightly'], ['Yaw', 'Stop it with rudder and aileron'], ['Airspeed', '91 KIAS (VSSE) minimum, accelerating to 102 KIAS (VXSE)/110 KIAS (VYSE)'], ['AOB into the operating engine', '5º maximum'], ['Engine Failure After Takeoff', 'Memory items:'], ...epRows('eng-fail-after-takeoff')],
    after: {
      title: 'Dynamic engine cut, after three items',
      ref: f('High-Work', 'p. 1-25'),
      rows: [['Checklist', 'Hold'], ['Prop levers', '1900 RPM'], ['Power', 'Reset maximum'], ['Prop not feathered', 'Alternate Feathering Checklist'], ['Fire or fuel leak', 'Continue with steps 4-6'], ['Otherwise', 'Declare an emergency, continue as time permits']],
    },
  },
  ditchOn: {
    label: 'Power on ditch',
    ref: DITCH_REF,
    rows: [['Landing gear', 'Up'], ['Flaps', 'Approach'], ['Rate of descent', '100 fpm, last 300 feet'], ['Airspeed', '90 KIAS'], ['No-flap', '100 knots'], ['Nose attitude', 'Controls airspeed'], ['Power', 'Controls rate of descent'], ['Wave-off', "No lower than 4000' AGL, both engines"]],
  },
  ditchSse: {
    label: 'SSE ditch',
    ref: DITCH_REF,
    rows: [['Descent', 'Emergency descent as appropriate'], ['Landing gear', 'Up'], ['Flaps', 'Approach'], ['Rate of descent', '100 fpm, last 300 feet'], ['Airspeed', '91 KIAS'], ['No-flap', '100 knots'], ['Ball', 'Centered'], ['Wave-off', "No lower than 4000' AGL, both engines"]],
  },
  ditchOff: {
    label: 'Power off ditch',
    ref: DITCH_REF,
    rows: [['Landing gear', 'Up'], ['Flaps', 'Up'], ['Maximum range glide', '130 KIAS'], ['Maximum endurance glide', '102 KIAS'], ['Restart', 'Both engines simultaneously'], ['Light-off', 'Within 10 seconds, or Emergency Engine Shutdown Checklist'], ['Flaps, about 200 feet AGL', 'Approach'], ['Water entry', '90 knots minimum, 500 fpm maximum'], ['No-flap water entry', '100 KIAS'], ['Wave-off', "No lower than 4000' AGL, both engines"]],
  },
  starter: {
    label: 'Starter-assisted airstart',
    ref: { work: 'T-44C NATOPS', loc: 'Ch. 15 — Starter-Assisted Airstart', pages: 'p. 15.4-1' },
    rows: [['Power lever (failed engine)', 'Idle'], ['Prop lever (failed engine)', 'Feather'], ['Condition lever (failed engine)', 'Fuel cutoff'], ['Cabin temperature mode', 'Off'], ['Vent blower', 'Auto'], ['Radar', 'Standby'], ['Anti-ice/deice', 'As required'], ['Firewall valve', 'Open'], ['Transfer pump', 'Auto'], ['Boost pump', 'On'], ['Crossfeed', 'Auto'], ['Generator (failed engine)', 'Off'], ['Starter (failed engine)', 'IGN & ENG START'], ['Condition lever', 'Low idle'], ['Starter (N1 above 50 percent)', 'Off'], ['Prop', 'Unfeather'], ['Power', 'As required'], ['Generator', 'Reset/on'], ['Fuel control heat', 'On'], ['Bleed air valve', 'As required'], ['Autoignition', 'Armed'], ['Condition lever', 'High idle'], ['Anti-ice/deice', 'As required'], ['Autofeather', 'As required'], ['Radar', 'As required'], ['Prop sync', 'As required'], ['Environmental controls', 'As required'], ['Instruments/nacelles', 'Checked']],
  },
  windmill: {
    label: 'Windmilling airstart',
    ref: { work: 'T-44C NATOPS', loc: 'Ch. 15 — Windmilling Airstart', pages: 'p. 15.4-2' },
    rows: epRows('windmilling-airstart'),
  },
};

// What each on-wing event flies at altitude, in the order listed. An Emergency Descent is on every
// event, flown on the way out of the area. Manual Gear Extension (3201) is left off: it is only
// done in the simulator.
const STALLS = ['stallClean', 'stallDirty', 'stallOn', 'stallTurn'];
const DITCHES = ['ditchOn', 'ditchSse', 'ditchOff'];
export const PROFILES = {
  FAM4101: ['lsc', 'turns', 'slow', ...STALLS],
  FAM4102: ['lsc', 'turns', 'slow', ...STALLS, 'dynamic', 'ditchOn'],
  FAM4103: ['turns', 'slow', ...STALLS, 'sseAlt', 'sseWaveoff', 'dynamic', ...DITCHES],
  FAM4104: ['turns', 'slow', ...STALLS, 'sseAlt', 'sseWaveoff', 'dynamic', ...DITCHES],
  FAM3201: ['turns', 'slow', ...STALLS, 'sseWaveoff', 'dynamic', ...DITCHES],
  FAM4201: ['lsc', 'turns', 'slow', ...STALLS, 'dynamic', ...DITCHES, 'starter', 'windmill'],
  FAM4202: ['turns', 'slow', ...STALLS, 'dynamic', ...DITCHES, 'starter', 'windmill'],
};

export const PRE_STALL = {
  title: 'Pre-stall checks',
  ref: f('High-Work', 'p. 1-17'),
  rows: [['Spin Recovery Procedures', 'Briefed per NATOPS'], ['Loose gear', 'Stowed'], ['Altitude', '5000 feet AGL minimum'], ['Yaw damp', 'Off'], ['Prop levers', '1900 RPM'], ['Stall Speeds', 'Reviewed']],
};
// One recovery in the FTI for every stall; its configuration steps are dropped where the stall
// is flown without them (clean: flaps and gear already up).
const RECOVER = [['Power', 'Max Continuous'], ['Nose attitude', 'Adjust to break stall'], ['Wings', 'Level'], ['Ball', 'Center']];
export const STALL_RECOVERY = {
  title: 'Stall recovery',
  ref: f('High-Work', 'p. 1-20'),
  rows: [...RECOVER, ['Flaps', 'Approach, 85 KIAS or greater'], ['Landing gear', 'Up, positive rate of climb'], ['Flaps', 'Up'], ['Airspeed', 'VY']],
};
export const CLEAN_STALL_RECOVERY = { ...STALL_RECOVERY, rows: [...RECOVER, ['Airspeed', 'VY']] };

// The altitudes of the SSE wave-off in this block: a 1000 foot altitude plus 800.
export function sseAltitudes(block) {
  const base = Math.ceil((block.bottom - 250) / 1000) * 1000;
  return { alt800: ft(base + 800), alt500: ft(base + 500), alt250: ft(base + 250) };
}

const PATTERN = f('Pattern Work', 'p. 1-32');

export const BREAK = {
  title: 'Break',
  ref: f('Pattern Work', 'p. 1-29'),
  rows: [['Enter', 'Wings level, 200 KIAS'], ['Bank', 'Not to exceed 45°'], ['Power', 'Idle'], ['Approach flaps', '174 KIAS maximum'], ['Landing gear', '155 KIAS maximum'], ['Downwind', '120 KIAS, 1 mile abeam']],
};

const AROUND = [['Prop levers', 'Above 300 ft: 1900 RPM'], ['Upwind', '300-500 ft, 120 KIAS'], ['Crosswind turn', '30° AOB maximum, 120 KIAS'], ['Passing 600 ft', 'Flaps approach']];
const NO_FLAP_AROUND = [['Prop levers', 'Above 300 ft: 1900 RPM'], ['Upwind', '300-500 ft, 120 KIAS'], ['Crosswind turn', '30° AOB maximum, 120 KIAS'], ['Passing 600 ft', 'Flaps stay up']];
const DOWNWIND = [['Downwind', '800 ft, 120 KIAS'], ['Landing Checklist', 'Complete']];

export const LAPS = {
  approach: {
    label: 'Approach flap',
    ref: PATTERN,
    around: AROUND,
    rows: [...DOWNWIND, ['The 90', '500 ft, 110 KIAS'], ['Roll onto final', '250 ft, 105 KIAS'], ['Prop levers', 'Full forward'], ['Cross the threshold', '95 KIAS']],
  },
  noFlap: {
    label: 'No-flap',
    ref: f('Pattern Work', 'p. 1-33'),
    around: NO_FLAP_AROUND,
    rows: [...DOWNWIND, ['The 90', '500 ft, 110 KIAS'], ['Roll onto final', '250 ft, 110 KIAS'], ['Prop levers', 'Full forward'], ['Cross the threshold', '105 KIAS']],
  },
  fullFlap: {
    label: 'Full flap',
    ref: f('Pattern Work', 'p. 1-34'),
    around: AROUND,
    rows: [...DOWNWIND, ['The 90', '500 ft, 110 KIAS'], ['Flaps', 'Down after the 90'], ['Roll onto final', '250 ft, 105 KIAS'], ['Prop levers', 'Full forward'], ['Cross the threshold', '95 KIAS']],
  },
  sse: {
    label: 'SSE',
    ref: f('Pattern Work', 'p. 1-41'),
    sse: true,
    around: [['Gear and flaps', 'Up, 300-500 ft'], ['Prop levers', '1900 RPM'], ['Climb', '110 KIAS (102 KIAS min)']],
    rows: [['Downwind', '800 ft, 120 KIAS'], ['Approaching the 180', 'Flaps approach, gear down, Landing Checklist'], ['The 90', '500 ft, 110 KIAS (min)'], ['Final', '250 ft, 110 KIAS (min)'], ['Prop levers', 'Full forward'], ['Cross the threshold', '110 KIAS']],
  },
};

export const WAVEOFF = {
  title: 'Wave-off',
  ref: f('Pattern Work', 'p. 1-36'),
  rows: [['Power', 'As required, positive rate of climb (VX minimum)'], ['Flaps', 'Approach (unless already up)'], ['Landing gear', 'Up'], ['Flaps', 'Up'], ['Prop levers', '1900 RPM'], ['Offset', 'Slightly, to the pattern side'], ['Level at', '500 feet unless cleared downwind']],
};

export const SSE_WAVEOFF = {
  title: 'SSE wave-off',
  ref: f('Pattern Work', 'p. 1-42'),
  rows: [['Minimum altitude to initiate', "200'"], ['Procedure', 'NATOPS Single Engine Wave-off'], ['Copilot', 'Reports "landing gear up" before the props are retarded to 1900'], ['Prop levers', '1900 RPM'], ['Airspeed', '102-110 KIAS']],
};

// ---- The takeoff (§103), the climb, and the calls that have no one place in the flight.

const t = (pages) => f('Departure and Arrival Transitions', pages);

export const LINE_UP = {
  title: 'Taking the runway',
  ref: t('p. 1-11'),
  rows: [['Before crossing the hold short', 'Clear the downwind, base, final and runway'], ['PF, taxiing on', 'Lights, anti-ice, condition levers high idle'], ['PM, taxiing on', 'Transponder, autoignition armed'], ['"High idle" response', 'Only with N1 70-73%'], ['Aligned with the centerline', '70-80% N1'], ['Check', 'Wing and nacelle: fuel caps, panels, no leaks. Instruments and props stabilized. Heading aligned with the runway']],
};

export const TAKEOFF_ROLL = {
  title: 'Takeoff roll',
  ref: t('p. 1-11'),
  rows: [['Power', 'Max continuous, smoothly'], ['Autofeather armed lights', 'Illuminated passing 90% N1 power lever position'], ['PM', 'Hand backing up the power levers'], ['Only calls on the runway', '"Rotate," "abort," or the malfunction'], ['VR', '91 KIAS'], ['Pitch', '7-10 degrees up']],
};

export const CLIMB_OUT = {
  title: 'After takeoff',
  ref: t('p. 1-12'),
  rows: [['"Landing gear up"', 'Airborne, increasing altitude and positive VSI'], ['Prop levers', '1900 RPM, after the landing gear indicates up'], ['Cruise climb, SL-10K', '150 KIAS, 1900 RPM, cruise climb power'], ['Climb Checklist', "Above 1000' AGL"], ['Flight director, FGP', "Not until gear up, props 1900, through 400' AGL"]],
};

export const MIN_ALT = {
  title: 'Training minimums (AGL)',
  ref: t('p. 1-13'),
  rows: [['Full stalls', '8000 feet'], ['Dynamic Engine Cut, Approach to Stalls', '5000 feet'], ['Ditching recovery, slow flight, actual shutdown', '4000 feet'], ['Initiate recovery from emergency descent', '2000 feet'], ['Recovered from emergency descent, overwater seat changes', '1000 feet'], ['Overland seat changes', '800 feet'], ['SSE after takeoff', '300 feet'], ['SSE wave-off', '200 feet'], ['Normal wave-off', '100 feet']],
};

export const EMERGENCY_DESCENT = {
  title: 'Emergency descent',
  ref: f('Area Departure', 'p. 1-29'),
  rows: [['Power levers', 'Idle'], ['Prop levers', 'Full forward'], ['Airspeed', '227 KIAS, 2200 RPM'], ['Commence recovery', 'No lower than 2000 feet AGL'], ['Complete recovery', 'No lower than 1000 feet AGL'], ['Recover', 'Pitch and power first'], ['Prop levers', '1900 RPM, as you arrest the rate of descent']],
};

export const TOUCH_AND_GO = {
  title: 'Touch and go',
  ref: f('Pattern Work', 'p. 1-35'),
  rows: [['PF: power levers', "12 o'clock, spool up"], ['PM "Go"', 'Flaps and trim set, props minimum 2000 RPM'], ['PF: power', 'Maximum allowable, minimum 1000 ft-lbs'], ['Rotate', 'Minimum 91 KIAS, takeoff power set'], ['Less than 2000 ft remaining', 'Continue the takeoff'], ['Climb', '120 KIAS, 7-10 degrees up']],
};

export const FULL_STOP = {
  title: 'Full stop',
  ref: f('Pattern Work', 'p. 1-34'),
  rows: [['Nose-wheel on the runway', 'Power levers over the detent, smoothly into reverse'], ['Landed with props at 1900', 'Slowly full forward before reverse'], ['After Landing Checklist', 'Not until clear of the runway']],
};

export const SHUTDOWN = {
  title: 'Emergency shutdown',
  ref: { work: 'ME FTI', loc: 'App. F — Emergencies', pages: 'p. F-29' },
  three: 7, // rows through the third memory item, Condition lever - Fuel Cutoff
  rows: [['PF', '"This will be an emergency shutdown of the {engine} engine."'], ['PF', '"{Engine} Power lever - Idle, concur?"'], ['PM', '"Concur"'], ['PF', '"{Engine} Propeller - Feather, concur?"'], ['PM', '"Concur" or "Simulate"'], ['PF', '"{Engine} Condition lever - Fuel Cutoff concur?"'], ['PM', '"Concur" or "Simulate"'], ['Prop feathered: prop levers', '1900 RPM'], ['Fire or fuel leak', 'Firewall valve, fire extinguisher and bleed air, each "concur?"']],
};
