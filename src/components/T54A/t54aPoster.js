import { aliasesFrom } from '../epsLimits/controlMatch';
import mainSrc from './images/t54a-main.webp';
import yokeSrc from './images/t54a-yoke.webp';
import pedestalSrc from './images/t54a-pedestal.webp';
import fuelSrc from './images/t54a-fuel.webp';
import cbSrc from './images/t54a-cb.webp';

// The T-54A cockpit poster and its click targets, in the T-44C's shape (T44C/t44cPoster.js has
// the long account of how a record works). Every `box` is [left, top, width, height] as
// FRACTIONS of its own region image; tools/crop-posters.py cuts the regions.
//
// The images are imported from this directory rather than served from public/, because the
// T-54A is a draft and an import is only emitted by a build that uses it (T54A-DRAFT). When it
// goes live, they can move to public/images/ like the T-44C's, or stay; either works.
//
// Every box was read off a grid over the region image, then checked on an overlay against the
// control the NATOPS (A1-T54A-NFM-000, IC 04) names, then tuned by hand. The NATOPS settled two
// the placards could not: the autothrottles disconnect at the AT button on the right power lever,
// which the power lever box stands for, or at the SDU's A/T PWR key (§2.17.2.7), and the
// autopilot at the AP/TRIM MASTER switch or the YD/AP DISC bar (§15.15.1).
//
// Five regions, every one a whole sub-panel off the sheet: the main instrument panel, the
// pilot's control wheel, the whole centre pedestal (power quadrant to the RUDDER BOOST switch),
// the fuel control and fuel breaker panel, and the circuit breaker panel.
//
// The normal flows and checklists (T54A/t54aNormals.js) ride on the same poster. Their targets
// sit in each region's "rough, tune with ?spots" block. A tuned record that a normal step also
// names carries the step's wording in `also` (another spelling of the same control) or `actions`
// (another control on the same target) and the step's setting in `values`; its box is unchanged.
//
// No target covers a whole panel. A step that checks a panel ("Engine Instruments", "Fuel
// Panel", "Lights", "Anti-Ice/De-Ice") is answered by any control or gauge on it, each boxed
// tight on its own, as on the T-44C's.

// The wordings that name the whole engine strip, and the settings the steps give them. Each
// gauge on the strip answers all of them.
const ENGINE_INSTRUMENTS = ['Engine Instruments', 'Right Engine Instruments', 'Left Engine Instruments',
  'Engine Instruments/Fuel Quantity'];
const ENGINE_INSTRUMENT_VALUES = {
  'Engine Instruments': ['Monitor (1000 C Maximum) (PF, PM)', 'Monitor', 'Checked', 'Check'],
  'Right Engine Instruments': ['Monitor', 'Checked'],
  'Left Engine Instruments': ['Monitor', 'Checked'],
  'Engine Instruments/Fuel Quantity': ['Checked'],
};
const gauge = (box, label, action, more = [], values = {}) => ({
  id: `gauge-${action.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, box, label, action,
  actions: [action, ...more, ...ENGINE_INSTRUMENTS],
  values: { ...ENGINE_INSTRUMENT_VALUES, ...values },
});

// The fuel control panel's "Checked, Auto": any switch or gauge on it.
const FUEL_PANEL = { 'Fuel Panel': ['Checked, Auto'] };

export const T54A_POSTER = {
  regions: [
    {
      id: 'main',
      label: 'Main Instrument Panel',
      src: mainSrc,
      alt: 'T-54A main instrument panel: the standby display, master warning and caution lights '
        + 'and both engine fire push buttons on the glareshield, the flight guidance panel, pilot '
        + 'and copilot PFDs either side of the MFD, and the lower sub-panel with the master switch '
        + 'and generators, ignition and engine start, engine auto-ignition, standby display, the '
        + 'landing gear handle, the environmental and bleed air group, and the parking brake',
      spots: [
        // The pilot's PFD only: the student flies from the left seat.
        { box: [0.106, 0.396, 0.019, 0.125], label: 'Airspeed indicator',
          action: 'Airspeed',
          actions: ['Airspeed', 'VREF'],
          values: {
            Airspeed: ['VXSE or VYSE', 'Pitch for 140 KIAS', 'As required', 'Vx', 'Below 181 KIAS'],
          } },
        { box: [0.125, 0.39, 0.09, 0.141], label: 'Attitude indicator',
          action: 'Pitch',
          actions: ['Pitch', 'Wings', 'Roll', 'Flight Instruments'],
          values: {
            Pitch: ['Adjust to satisfy RA', 'Set and hold approximately 15 degrees noseup'],
            Wings: ['Level'],
            Roll: ['Continue planned lateral path'],
          } },
        // "Above 1,500 feet AGL" is read off the altitude tape or the
        // radio altitude, the green readout under the attitude indicator. The tape and the VSI
        // beside it also answer the climb and descent the control wheel flies.
        { box: [0.215, 0.393, 0.019, 0.127], label: 'Altitude tape',
          action: 'Above 1,500 feet AGL or established at VFR pattern Altitude',
          actions: ['Above 1,500 feet AGL or established at VFR pattern Altitude', 'Descend',
            'Continue climb until all warnings cease and safe terrain clearance assured.'],
          values: {
            'Above 1,500 feet AGL or established at VFR pattern Altitude': ['Go to Emergency Shutdown Checklist'],
            Descend: ['As required'],
          } },
        { box: [0.236, 0.41, 0.009, 0.105], label: 'Vertical speed indicator',
          action: 'Descend',
          actions: ['Descend', 'Continue climb until all warnings cease and safe terrain clearance assured.'],
          values: { Descend: ['As required'] } },
        { box: [0.168, 0.534, 0.014, 0.012], label: 'Radio altitude',
          action: 'Above 1,500 feet AGL or established at VFR pattern Altitude',
          values: ['Go to Emergency Shutdown Checklist'] },
        // One step, one control, drawn at each end of the glareshield. Same `action`, different `id`.
        { id: 'fire-ext-left', box: [0.342, 0.109, 0.028, 0.046], label: 'LH engine fire push button',
          action: 'Fire Extinguisher', values: ['As required', 'As required (LS, RS)'] },
        { id: 'fire-ext-right', box: [0.618, 0.109, 0.027, 0.046], label: 'RH engine fire push button',
          action: 'Fire Extinguisher', values: ['As required', 'As required (LS, RS)'] },

        // The MASTER SWITCH bar is the gang bar; the generator switches sit under it.
        { box: [0.022, 0.8, 0.09, 0.013], label: 'Master switch gang bar',
          action: 'Gang bar', values: ['OFF'] },
        { box: [0.062, 0.813, 0.044, 0.02], label: 'Generators',
          action: 'Generators (one at a time)', also: ['Right Generator', 'Left Generator'],
          values: ['OFF, RESET momentarily, then ON (LS)', 'RESET, then ON'] },
        // STBY DISPLAY powers the standby display unit, poster item 1.
        { box: [0.03, 0.86, 0.012, 0.03], label: 'Standby display',
          action: 'SDU Power', also: ['SDU'], values: ['OFF'] },
        { box: [0.058, 0.912, 0.033, 0.025], label: 'Ignition and engine start',
          action: 'IGNITION AND ENGINE START switch',
          also: ['IGNITION AND ENGINE START switches', 'IGNITION and ENGINE START'],
          values: ['OFF (1 sec)', 'STARTER ONLY (for the remainder of the 40 second time limit)',
            'OFF (at the 40 second time limit)', 'OFF', 'OFF (LS)',
            'Right ON', 'Right OFF', 'Left ON', 'Left OFF'] },
        { box: [0.128, 0.757, 0.026, 0.031], label: 'Engine auto ignition',
          action: 'Autoignition', actions: ['Autoignition', 'Autofeather/Autoignition'],
          values: { Autoignition: ['ARM (LS)', 'ARM', 'OFF'] } },
        // "Brakes - Checked, set": "Set indicates the condition of the parking brake" (§7, the
        // Engine Runup note), so that one Brakes step is answered here; the others are the pedals.
        { box: [0.013, 0.97, 0.02, 0.038], label: 'Parking brake',
          action: 'Stop the aircraft and set the parking brake.',
          actions: ['Stop the aircraft and set the parking brake.', 'Parking Brake', 'Brakes'],
          values: { Brakes: ['Checked, set'] } },
        { box: [0.344, 0.816, 0.018, 0.103], label: 'Landing gear handle',
          action: 'Landing Gear', also: ['Gear', 'Landing Gear (when climb established)'],
          values: ['UP', 'As required', 'DN', 'Down/Locked'] },
        // Both BLEED AIR VALVES toggles under one box: the step names the affected engine's, and
        // they sit side by side.
        { box: [0.664, 0.899, 0.034, 0.026], label: 'Bleed air valves',
          action: 'Bleed Air Valve (affected engine(s))', also: ['Bleed Air Valves'],
          values: ['PNEU & ENVIR OFF (RS)', 'OPEN', 'ENVIR OFF'] },
        // The YD/AP DISC bar on the flight guidance panel. AP/TRIM MASTER on the wheel does the
        // same (§15.15.1), so the yoke carries the step too.
        { id: 'yd-ap-disc', box: [0.593, 0.234, 0.031, 0.027], label: 'YD/AP DISC bar',
          action: 'Autopilot', actions: ['Autopilot', 'Autopilot/Yaw Damp'],
          values: { Autopilot: ['Disengage'] } },

        // The mic selector knob over each seat's audio control panel
        // (§20.1, "mic selector switch ... mounted directly above the ACP"), MIC OXY / NORM.
        { id: 'mic-oxy-left', box: [0.072, 0.375, 0.018, 0.034], label: 'MIC OXY/NORM selector (pilot)',
          action: 'Oxygen Mask/MIC Switch', also: ['Oxygen Mask/MIC switches'],
          values: ['ON/100%/OXY (PF, PM, OBS)', 'ON/OXY (PF, PM, OBS)'] },
        { id: 'mic-oxy-right', box: [0.898, 0.374, 0.018, 0.034], label: 'MIC OXY/NORM selector (copilot)',
          action: 'Oxygen Mask/MIC Switch', also: ['Oxygen Mask/MIC switches'],
          values: ['ON/100%/OXY (PF, PM, OBS)', 'ON/OXY (PF, PM, OBS)'] },

        // Rough, tune with ?spots: the targets the normal flows and checklists add.
        // Glareshield: both MASTER WARNING lights (the Engine Fire Test lights them) and the SDU.
        { id: 'master-warning-left', box: [0.183, 0.105, 0.025, 0.035], label: 'MASTER WARNING light (pilot)',
          action: 'Master Warning' },
        { id: 'master-warning-right', box: [0.781, 0.103, 0.024, 0.035], label: 'MASTER WARNING light (copilot)',
          action: 'Master Warning' },
        { box: [0.444, 0.057, 0.09, 0.101], label: 'Standby display unit (SDU)',
          action: 'SDU', values: ['Aligned', 'Checked, On'] },
        // The A/T PWR key on the SDU bezel "engages/disengages the autothrottle system" (§2.9.5.1),
        // the second of the two disconnects §2.17.2.7 names; the power levers stand for the first.
        { box: [0.539, 0.058, 0.010, 0.017], label: 'A/T PWR button',
          action: 'Autothrottles', also: ['Autothrottle', 'A/T Power'],
          values: ['Disengage', 'As required'] },
        // The MFD engine strip, a target per row, each answering for the whole strip. "Verify
        // feathered" is read off the prop rpm, an instrument the step is worked against.
        gauge([0.374, 0.376, 0.040, 0.028], 'Torque', 'Torque'),
        gauge([0.374, 0.406, 0.040, 0.028], 'ITT', 'ITT', ['Right ITT and N1', 'Left ITT and N1']),
        gauge([0.374, 0.435, 0.04, 0.025], 'Prop RPM', 'Prop RPM', ['Propeller (inoperative engine)'],
          { 'Propeller (inoperative engine)': ['Verify feathered'] }),
        gauge([0.374, 0.461, 0.040, 0.010], 'N1', 'N1', ['Right ITT and N1', 'Left ITT and N1']),
        { ...gauge([0.374, 0.473, 0.040, 0.009], 'Oil pressure', 'Oil Pressure'),
          also: ['Right Oil Pressure', 'Left Oil Pressure'] },
        gauge([0.374, 0.483, 0.040, 0.009], 'Oil temperature', 'Oil Temperature'),
        gauge([0.374, 0.493, 0.040, 0.010], 'Fuel flow', 'Fuel Flow'),
        { box: [0.374, 0.505, 0.040, 0.017], label: 'Cabin altitude and rate',
          action: 'Cabin Altitude' },
        { box: [0.374, 0.525, 0.040, 0.022], label: 'Flap position indicator',
          action: 'Flap Indicator' },
        { box: [0.374, 0.552, 0.04, 0.039], label: 'CAS messages',
          action: 'CAS Messages', values: ['Checked'] },
        // The lower sub-panel, left to right.
        { box: [0.03, 0.812, 0.011, 0.023], label: 'BAT switch',
          action: 'Battery', values: ['Verify ON'] },
        { box: [0.076, 0.75, 0.012, 0.028], label: 'Avionics master power',
          action: 'Avionics Master', values: ['ON', 'OFF'] },
        // ENGINE ANTI-ICE, LEFT and RIGHT over the two ACTUATORS switches; any is Anti-Ice/De-Ice.
        { id: 'engine-anti-ice-left', box: [0.128, 0.816, 0.009, 0.025], label: 'Left engine anti-ice',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'engine-anti-ice-right', box: [0.15, 0.816, 0.009, 0.023], label: 'Right engine anti-ice',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'actuators-left', box: [0.127, 0.859, 0.011, 0.025], label: 'Left engine anti-ice actuators',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'actuators-right', box: [0.149, 0.859, 0.01, 0.025], label: 'Right engine anti-ice actuators',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { box: [0.126, 0.909, 0.01, 0.027], label: 'Autofeather switch',
          action: 'Autofeather', actions: ['Autofeather', 'Autofeather/Autoignition'],
          values: { Autofeather: ['ARM', 'OFF', 'As required'] } },
        { box: [0.155, 0.913, 0.01, 0.026], label: 'Prop governor test switch',
          action: 'Governors and Rudder Boost' },
        { box: [0.297, 0.745, 0.016, 0.029], label: 'Prop sync',
          action: 'Prop Sync', values: ['As required', 'On'] },
        // The exterior lights, LANDING (left and right) to RECOG, then BEACON and STROBE: any is
        // Lights, and the beacon is also its own step.
        { id: 'light-landing-left', box: [0.247, 0.808, 0.009, 0.028], label: 'Left landing light',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { id: 'light-landing-right', box: [0.261, 0.808, 0.01, 0.028], label: 'Right landing light',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { id: 'light-taxi', box: [0.276, 0.808, 0.01, 0.028], label: 'Taxi light',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { id: 'light-ice', box: [0.291, 0.808, 0.01, 0.028], label: 'Ice light',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { id: 'light-nav', box: [0.307, 0.798, 0.009, 0.029], label: 'Navigation lights',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { id: 'light-recog', box: [0.321, 0.808, 0.01, 0.029], label: 'Recognition lights',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { box: [0.374, 0.799, 0.009, 0.029], label: 'Beacon',
          action: 'Beacon', actions: ['Beacon', 'Lights'],
          values: { Beacon: ['Cycled, ON'], Lights: ['Set', 'As required', 'Off'] } },
        { id: 'light-strobe', box: [0.387, 0.806, 0.01, 0.033], label: 'Strobe lights',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        // ICE PROTECTION: windshield, prop, fuel vent, deice cycle, stall warn and pitot heat; any
        // is Anti-Ice/De-Ice.
        { id: 'wshld-pilot', box: [0.25, 0.868, 0.01, 0.021], label: 'Windshield anti-ice (pilot)',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'wshld-copilot', box: [0.266, 0.868, 0.01, 0.02], label: 'Windshield anti-ice (copilot)',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'prop-deice-auto', box: [0.281, 0.868, 0.01, 0.031], label: 'Prop deice AUTO',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'prop-deice-manual', box: [0.294, 0.869, 0.011, 0.018], label: 'Prop deice MANUAL',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'fuel-vent-left', box: [0.308, 0.868, 0.009, 0.02], label: 'Fuel vent heat (left)',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'fuel-vent-right', box: [0.321, 0.869, 0.01, 0.019], label: 'Fuel vent heat (right)',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'deice-cycle', box: [0.261, 0.922, 0.01, 0.021], label: 'Deice cycle',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'stall-warn-heat', box: [0.277, 0.922, 0.009, 0.03], label: 'Stall warning heat',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'pitot-left', box: [0.289, 0.922, 0.009, 0.03], label: 'Pitot heat (left)',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'pitot-right', box: [0.301, 0.922, 0.01, 0.03], label: 'Pitot heat (right)',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { box: [0.372, 0.861, 0.012, 0.024], label: 'GEAR DOWN light',
          action: 'Landing Gear Indicator' },
        // ENVIRONMENTAL: the cockpit and cabin blower and temperature knobs, the MODE knob (the
        // one that turns it OFF) and MAN TEMP.
        { id: 'env-mode', box: [0.645, 0.830, 0.019, 0.039], label: 'Environmental mode',
          action: 'Environmental System', also: ['ECS', 'ECS Mode'], values: ['Set', 'OFF'] },
        { id: 'env-cockpit-blower', box: [0.576, 0.827, 0.019, 0.042], label: 'Cockpit blower',
          action: 'Environmental System', values: ['Set'] },
        { id: 'env-cockpit-temp', box: [0.607, 0.829, 0.019, 0.04], label: 'Cockpit temperature',
          action: 'Environmental System', values: ['Set'] },
        { id: 'env-cabin-blower', box: [0.576, 0.906, 0.019, 0.039], label: 'Cabin blower',
          action: 'Environmental System', values: ['Set'] },
        { id: 'env-cabin-temp', box: [0.607, 0.906, 0.019, 0.039], label: 'Cabin temperature',
          action: 'Environmental System', values: ['Set'] },
        { id: 'env-man-temp', box: [0.687, 0.837, 0.009, 0.019], label: 'Manual temperature',
          action: 'Environmental System', values: ['Set'] },
        { box: [0.642, 0.902, 0.01, 0.021], label: 'Envir bleed air switch',
          action: 'Envir Bleed Air switch', values: ['As required'] },
        { id: 'fire-test-left', box: [0.709, 0.919, 0.01, 0.019], label: 'Engine fire test (left)',
          action: 'Engine Fire Test', values: ['Checked'] },
        { id: 'fire-test-right', box: [0.727, 0.919, 0.01, 0.019], label: 'Engine fire test (right)',
          action: 'Engine Fire Test', values: ['Checked'] },
        { box: [0.821, 0.752, 0.041, 0.081], label: 'Vacuum gauge',
          action: 'Vacuum', actions: ['Vacuum', 'Vacuum and Pneumatic Pressure'] },
        { box: [0.908, 0.751, 0.043, 0.083], label: 'Pneumatic pressure gauge',
          action: 'Pneumatic Pressure', actions: ['Pneumatic Pressure', 'Vacuum and Pneumatic Pressure'] },
      ],
    },
    {
      id: 'yoke',
      label: "Pilot's Control Wheel",
      src: yokeSrc,
      alt: "T-54A pilot's control wheel, with its left grip drawn out beside it: MIC, pitch trim "
        + 'and the AP/TRIM MASTER switch',
      spots: [
        // Drawn twice: on the grip drawn out beside the wheel, and from above on the wheel's left
        // horn (the red button). Same control, different `id`.
        { id: 'ap-trim-master-grip', box: [0.123, 0.325, 0.03, 0.062], label: 'AP/TRIM MASTER',
          action: 'AP/TRIM MASTER',
          actions: ['AP/TRIM MASTER', 'Autopilot', 'Autopilot/Yaw Damp'],
          values: {
            'AP/TRIM MASTER': ['Depress Fully and Hold'],
            Autopilot: ['Disengage'],
          } },
        { id: 'ap-trim-master-top', box: [0.329, 0.211, 0.04, 0.095], label: 'AP/TRIM MASTER',
          action: 'AP/TRIM MASTER',
          actions: ['AP/TRIM MASTER', 'Autopilot', 'Autopilot/Yaw Damp'],
          values: {
            'AP/TRIM MASTER': ['Depress Fully and Hold'],
            Autopilot: ['Disengage'],
          } },
        { box: [0.1, 0.391, 0.886, 0.616], label: 'Control wheel',
          action: 'Control wheel',
          // The flown steps too: descend, maneuver, climb, land or ditch.
          actions: ['Control wheel', 'Ailerons', 'Flight Controls', 'Controls', 'Descend',
            'Maneuver as required.', 'Continue climb until all warnings cease and safe terrain clearance assured.',
            'Land or ditch immediately.'],
          values: {
            'Control wheel': ['Rapidly forward', 'Pull out of dive by exerting smooth steady back pressure'],
            Ailerons: ['Neutralize'],
            Descend: ['As required'],
          } },

        // Rough, tune with ?spots. The pitch trim switch, drawn twice like AP/TRIM MASTER.
        { id: 'pitch-trim-grip', box: [0.032, 0.29, 0.075, 0.063], label: 'Pitch trim switch',
          action: 'Electric Trim' },
        { id: 'pitch-trim-top', box: [0.24, 0.054, 0.079, 0.188], label: 'Pitch trim switch',
          action: 'Electric Trim' },
      ],
    },
    {
      id: 'pedestal',
      label: 'Pedestal',
      src: pedestalSrc,
      alt: 'T-54A centre pedestal: power, prop and condition levers with the reverse and feather '
        + 'gates, the flap handle, the trim wheels, the FMS keypad and display controls, and low '
        + 'down the pressurization controls and the RUDDER BOOST switch',
      spots: [
        // The power levers also stand for the AT button on the right one's head, the knob its "AT"
        // placard points to: "the Autothrottle Disconnect (AT) button on the right power lever"
        // (§2.17.2.7), and for the GO AROUND button placarded on the left one's. Drawn the size
        // of a lever end, neither is big enough for a target of its own.
        { box: [0.045, 0, 0.352, 0.151], label: 'Power levers',
          action: 'POWER levers', also: ['Power'],
          actions: ['POWER levers', 'Autothrottles', 'Power Quadrant', 'Go-Around'],
          values: {
            'POWER levers': ['IDLE', 'IDLE (PF)', 'GROUND FINE', 'REVERSE as required', 'As required',
              'As Required (PF)', 'Max Continuous',
              'Max Continuous, establish positive rate of climb (VXSE minimum)', 'Set'],
            Autothrottles: ['Disengage', 'As required'],
            'Power Quadrant': ['Set'],
          } },
        { box: [0.47, 0.008, 0.16, 0.1], label: 'Prop levers',
          action: 'PROP lever',
          also: ['If propeller fails to feather, PROP lever (inoperative engine)', 'Props', 'Prop Lever(s)'],
          actions: ['PROP lever', 'Power Quadrant', 'Manual Feather'],
          values: ['FEATHER', 'FEATHER (PF)', 'Full Forward', 'Full Forward (PF)',
            'Attempt to adjust to normal operating range (PF)', 'As required', 'Set'] },
        { box: [0.675, 0.063, 0.24, 0.09], label: 'Condition levers',
          action: 'Condition Lever',
          also: ['Condition Lever(s)', 'CONDITION lever (11.5% N1 or above)', 'Right Condition Lever',
            'Left Condition Lever', 'Left and Right Condition Levers'],
          actions: ['Condition Lever', 'Power Quadrant', 'HIGH IDLE'],
          values: ['FUEL CUTOFF', 'FUEL CUTOFF (PF)', 'LOW IDLE (PF)', 'LOW IDLE', 'HIGH IDLE'] },
        { box: [0.692, 0.229, 0.12, 0.029], label: 'Flap handle',
          action: 'Flaps',
          values: ['UP', 'As required', 'APPROACH (unless already up)', 'Maintain current setting',
            'Checked', 'Checked, As Required'] },
        { box: [0.292, 0.799, 0.044, 0.02], label: 'Rudder boost',
          action: 'RUDDER BOOST', values: ['OFF (PM)', 'On'] },

        // Rough, tune with ?spots: the targets the normal flows and checklists add.
        { id: 'trim-elevator', box: [0.028, 0.155, 0.117, 0.172], label: 'Elevator trim wheel',
          action: 'Trim' },
        { id: 'trim-aileron', box: [0.186, 0.322, 0.261, 0.091], label: 'Aileron trim',
          action: 'Trim' },
        { id: 'trim-rudder', box: [0.554, 0.356, 0.245, 0.084], label: 'Rudder tab',
          action: 'Trim' },
        // The crew oxygen handle, PULL ON / SYSTEM READY.
        { box: [0.05, 0.484, 0.898, 0.012], label: 'Oxygen',
          action: 'Oxygen', values: ['Open, 100%', 'Closed'] },
        // The pilot's cursor control panel: TAWS is tested from its PFD and MENU keys, TCAS from TFC.
        { id: 'ccp-pfd', box: [0.185, 0.509, 0.049, 0.011], label: 'CCP PFD key',
          action: 'TAWS' },
        { id: 'ccp-menu', box: [0.041, 0.534, 0.049, 0.011], label: 'CCP MENU key',
          action: 'TAWS' },
        { box: [0.041, 0.521, 0.049, 0.012], label: 'CCP TFC key',
          action: 'TCAS/Transponder' },
        // The ATIS is tuned on a COM radio with each CCP's TUNE knob.
        { id: 'com-tune-left', box: [0.108, 0.508, 0.058, 0.020], label: 'COM TUNE knob (pilot)',
          action: 'ATIS', values: ['As required'] },
        { id: 'com-tune-right', box: [0.830, 0.508, 0.058, 0.020], label: 'COM TUNE knob (copilot)',
          action: 'ATIS', values: ['As required'] },
        // Building the approach is loading it in the FMS, and the minimums are set in its
        // Vspeeds/Mins window (§21.2.6.5).
        { box: [0.25, 0.508, 0.50, 0.099], label: 'FMS keypad',
          action: 'FMS', actions: ['FMS', 'Build the approach.', 'Minimums'] },
        { id: 'baro-left', box: [0.122, 0.653, 0.062, 0.022], label: 'BARO knob (pilot)',
          action: 'Altimeters' },
        { id: 'baro-right', box: [0.813, 0.652, 0.061, 0.022], label: 'BARO knob (copilot)',
          action: 'Altimeters' },
        // The TILT knob beside each BARO knob is the weather radar's
        // control on the Single Knob Panel (§2.9.1.7).
        { id: 'tilt-left', box: [0.323, 0.653, 0.094, 0.022], label: 'Radar TILT knob (pilot)',
          action: 'Radar', values: ['As required'] },
        { id: 'tilt-right', box: [0.583, 0.652, 0.094, 0.022], label: 'Radar TILT knob (copilot)',
          action: 'Radar', values: ['As required'] },
        // CABIN PRESS (DUMP, PRESS, TEST) and PRESS MODE (ALT, NORM): either is Pressurization.
        { id: 'cabin-press', box: [0.074, 0.802, 0.042, 0.017], label: 'Cabin press switch',
          action: 'Pressurization' },
        { id: 'press-mode', box: [0.134, 0.802, 0.055, 0.02], label: 'Press mode switch',
          action: 'Pressurization' },
      ],
    },
    {
      id: 'fuel',
      label: 'Fuel Control',
      src: fuelSrc,
      alt: 'T-54A fuel control panel: left and right fuel quantity gauges, standby pump, '
        + 'transfer and crossfeed switches, and below it the fuel circuit breaker panel with the '
        + 'red guarded FIREWALL SHUTOFF VALVE switches at each end',
      spots: [
        // One control drawn at each end of the panel. Same `action`, different `id`.
        { id: 'firewall-left', box: [0.152, 0.583, 0.051, 0.16], label: 'Left firewall shutoff valve',
          action: 'Firewall shutoff valve', also: ['Firewall Shutoff Valves (both)'],
          values: ['CLOSE', 'CLOSE (LS)', 'OPEN (LS)'] },
        { id: 'firewall-right', box: [0.786, 0.583, 0.047, 0.16], label: 'Right firewall shutoff valve',
          action: 'Firewall shutoff valve', also: ['Firewall Shutoff Valves (both)'],
          values: ['CLOSE', 'CLOSE (LS)', 'OPEN (LS)'] },

        // Rough, tune with ?spots. Every switch and gauge on the fuel control panel, each of which
        // answers for the whole panel.
        { id: 'standby-pump-left', box: [0.129, 0.187, 0.043, 0.058], label: 'Left standby pump',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { id: 'standby-pump-right', box: [0.813, 0.187, 0.044, 0.058], label: 'Right standby pump',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { id: 'aux-transfer-left', box: [0.129, 0.304, 0.044, 0.064], label: 'Left aux transfer override',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { id: 'aux-transfer-right', box: [0.814, 0.304, 0.045, 0.064], label: 'Right aux transfer override',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { id: 'no-transfer-left', box: [0.128, 0.418, 0.046, 0.062], label: 'Left NO TRANSFER light',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { id: 'no-transfer-right', box: [0.813, 0.418, 0.046, 0.062], label: 'Right NO TRANSFER light',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { id: 'fuel-qty-switch', box: [0.475, 0.421, 0.033, 0.059], label: 'Fuel quantity MAIN/AUXILIARY switch',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { box: [0.475, 0.177, 0.033, 0.047], label: 'Crossfeed flow switch',
          action: 'Crossfeed', actions: ['Crossfeed', 'Fuel Panel'],
          values: { Crossfeed: ['OFF'], ...FUEL_PANEL } },
        { id: 'fuel-qty-left', box: [0.200, 0.233, 0.200, 0.228], label: 'Left fuel quantity',
          action: 'Fuel Quantity', actions: ['Fuel Quantity', 'Fuel Panel'], values: FUEL_PANEL },
        { id: 'fuel-qty-right', box: [0.584, 0.233, 0.199, 0.228], label: 'Right fuel quantity',
          action: 'Fuel Quantity', actions: ['Fuel Quantity', 'Fuel Panel'], values: FUEL_PANEL },
      ],
    },
    {
      id: 'cb',
      label: 'Circuit Breakers',
      src: cbSrc,
      alt: 'T-54A circuit breaker panel: engines, lights, warnings, weather, flight, electrical, '
        + 'environmental and avionics breakers, with RUDDER BOOST in the flight group',
      spots: [
        { box: [0.391, 0.58, 0.035, 0.041], label: 'Rudder boost circuit breaker',
          action: 'Rudder boost circuit breaker (RS circuit breaker panel)', values: ['Pull (RS)'] },
      ],
    },
  ],

  // The steps with nothing on the poster to point at. A button with `actions` stands for several
  // steps and answers with whichever of them the card asks for next.
  //
  //   Rudder Pedals      the pedals are not drawn ("Brakes - Checked, set" is the parking
  //                      brake, on the poster).
  //   Announce, Crew, Evacuate, Verify Propellers Clear, Brief the approach
  //                      said, briefed or signalled, not actuated.
  //   No restart         decided, not actuated. (The flown steps are on the control wheel.)
  //   Engine Clearing, Emer Shutdown, Windmilling Airstart
  //                      cross-references to another procedure.
  //   Overhead meters    the battery ammeter and volt-loadmeters, on the overhead panel (§2.8).
  //   Cabin Door, Seatbelt, Control Lock, Wheels
  //                      not on the panel.
  actions: [
    { label: 'Rudder Pedals', action: 'Rudder', actions: ['Rudder', 'Brakes'],
      values: {
        Rudder: ['Maintain directional control (PF)', 'Full deflection opposite the direction of the spin',
          'Neutralize once rotation has stopped'],
        Brakes: ['As required', 'Check'],
      } },
    { label: 'Announce "Abort"', ep: true, action: 'Announce "Abort"' },
    { label: 'Crew', action: 'Crew', values: ['Alerted', 'Briefed'] },
    { label: 'Evacuate Aircraft', ep: true, action: 'Evacuate Aircraft' },
    { label: 'Verify Propellers Clear', normal: true, action: 'Verify Propellers Clear', values: ['Signal Lineman'] },
    { label: 'Brief the approach', normal: true, action: 'Brief the approach.' },
    { label: 'No restart', ep: true,
      action: 'Do not attempt another start until the cause of the hot or hung start has been corrected.' },
    { label: 'Engine Clearing', ep: true, action: 'Engine Clearing Procedure', values: ['Execute'] },
    { label: 'Emer Shutdown', ep: true, action: 'Emergency Engine Shutdown on the Ground',
      actions: ['Emergency Engine Shutdown on the Ground', 'Emergency Shutdown Checklist'],
      values: {
        'Emergency Engine Shutdown on the Ground': ['Execute'],
        'Emergency Shutdown Checklist': ['Execute'],
      } },
    { label: 'Windmilling Airstart', ep: true, action: 'Windmilling Air Start', values: ['Execute'] },
    { label: 'Overhead meters', normal: true, action: 'Battery Ammeter/Loadmeter',
      actions: ['Battery Ammeter/Loadmeter', 'DC Volt/Loadmeters'],
      values: {
        'Battery Ammeter/Loadmeter': ['Check'],
        'DC Volt/Loadmeters': ['Check', 'Checked'],
      } },
    { label: 'Cabin Door', normal: true, action: 'Cabin Door', values: ['CAS message removed', 'Locked, light out'] },
    { label: 'Seatbelt', normal: true, action: 'Seatbelt', values: ['Fastened'] },
    { label: 'Control Lock', normal: true, action: 'Control Lock', values: ['As required'] },
    { label: 'Wheels', normal: true, action: 'Wheels', values: ['Chocked'] },
  ],
};

export const T54A_ALIASES = aliasesFrom(T54A_POSTER);

export const t54aRegion = (id) => T54A_POSTER.regions.find((r) => r.id === id);
