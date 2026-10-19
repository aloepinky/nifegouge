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
// the placards could not: the autothrottles disconnect at the AT button on the right power lever
// (§2.17.2.7), which the power lever box stands for, and the autopilot at the AP/TRIM MASTER
// switch or the YD/AP DISC bar (§15.15.1).
//
// Five regions, every one a whole sub-panel off the sheet: the main instrument panel, the
// pilot's control wheel, the whole centre pedestal (power quadrant to the RUDDER BOOST switch),
// the fuel control and fuel breaker panel, and the circuit breaker panel.
//
// The normal flows and checklists (T54A/t54aNormals.js) ride on the same poster. Their targets
// sit in each region's "rough, tune with ?spots" block, drawn after the tuned ones so a small
// target inside a larger one (a gauge on the MFD's engine strip) wins the click. A tuned record
// that a normal step also names carries the step's wording in `also` (another spelling of the
// same control) or `actions` (another control on the same target) and the step's setting in
// `values`; its box is unchanged. The engine strip is one target per gauge, each also answering
// for `Engine Instruments`, so the EP steps worked against the whole strip still answer anywhere
// on it.

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
        { box: [0.106, 0.398, 0.019, 0.122], label: 'Airspeed indicator',
          action: 'Airspeed',
          actions: ['Airspeed', 'VREF'],
          values: {
            Airspeed: ['VXSE or VYSE', 'Pitch for 140 KIAS', 'As required', 'Vx', 'Below 181 KIAS'],
          } },
        { box: [0.125, 0.392, 0.09, 0.14], label: 'Attitude indicator',
          action: 'Pitch',
          actions: ['Pitch', 'Wings', 'Roll', 'Flight Instruments'],
          values: {
            Pitch: ['Adjust to satisfy RA', 'Set and hold approximately 15 degrees noseup'],
            Wings: ['Level'],
            Roll: ['Continue planned lateral path'],
          } },
        // The engine strip down the left of the MFD. "Verify feathered" is read off it (prop
        // rpm), as the monitor step is: an instrument the step is worked against.
        { box: [0.373, 0.368, 0.043, 0.22], label: 'Engine instruments',
          action: 'Engine Instruments',
          also: ['Right Engine Instruments', 'Left Engine Instruments'],
          actions: ['Engine Instruments', 'Propeller (inoperative engine)', 'Engine Instruments/Fuel Quantity'],
          values: {
            'Engine Instruments': ['Monitor (1000 C Maximum) (PF, PM)', 'Monitor', 'Checked', 'Check'],
            'Propeller (inoperative engine)': ['Verify feathered'],
          } },

        // One step, one control, drawn at each end of the glareshield. Same `action`, different `id`.
        { id: 'fire-ext-left', box: [0.343, 0.11, 0.026, 0.045], label: 'LH engine fire push button',
          action: 'Fire Extinguisher', values: ['As required', 'As required (LS, RS)'] },
        { id: 'fire-ext-right', box: [0.619, 0.11, 0.026, 0.045], label: 'RH engine fire push button',
          action: 'Fire Extinguisher', values: ['As required', 'As required (LS, RS)'] },

        // The MASTER SWITCH bar is the gang bar; the generator switches sit under it.
        { box: [0.022, 0.8, 0.09, 0.013], label: 'Master switch gang bar',
          action: 'Gang bar', values: ['OFF'] },
        { box: [0.061, 0.814, 0.045, 0.023], label: 'Generators',
          action: 'Generators (one at a time)', also: ['Right Generator', 'Left Generator'],
          values: ['OFF, RESET momentarily, then ON (LS)', 'RESET, then ON'] },
        // STBY DISPLAY powers the standby display unit, poster item 1.
        { box: [0.029, 0.858, 0.013, 0.03], label: 'Standby display',
          action: 'SDU Power', also: ['SDU'], values: ['OFF'] },
        { box: [0.056, 0.912, 0.035, 0.025], label: 'Ignition and engine start',
          action: 'IGNITION AND ENGINE START switch',
          also: ['IGNITION AND ENGINE START switches', 'IGNITION and ENGINE START'],
          values: ['OFF (1 sec)', 'STARTER ONLY (for the remainder of the 40 second time limit)',
            'OFF (at the 40 second time limit)', 'OFF', 'OFF (LS)',
            'Right ON', 'Right OFF', 'Left ON', 'Left OFF'] },
        { box: [0.128, 0.755, 0.026, 0.033], label: 'Engine auto ignition',
          action: 'Autoignition', actions: ['Autoignition', 'Autofeather/Autoignition'],
          values: { Autoignition: ['ARM (LS)', 'ARM', 'OFF'] } },
        { box: [0.01, 0.968, 0.023, 0.035], label: 'Parking brake',
          action: 'Stop the aircraft and set the parking brake.',
          actions: ['Stop the aircraft and set the parking brake.', 'Parking Brake'] },
        { box: [0.345, 0.816, 0.016, 0.103], label: 'Landing gear handle',
          action: 'Landing Gear', also: ['Gear', 'Landing Gear (when climb established)'],
          values: ['UP', 'As required', 'DN', 'Down/Locked'] },
        // Both BLEED AIR VALVES toggles under one box: the step names the affected engine's, and
        // they sit side by side.
        { box: [0.665, 0.9, 0.032, 0.026], label: 'Bleed air valves',
          action: 'Bleed Air Valve (affected engine(s))', also: ['Bleed Air Valves'],
          values: ['PNEU & ENVIR OFF (RS)', 'OPEN', 'ENVIR OFF'] },
        // The YD/AP DISC bar on the flight guidance panel. AP/TRIM MASTER on the wheel does the
        // same (§15.15.1), so the yoke carries the step too.
        { id: 'yd-ap-disc', box: [0.593, 0.234, 0.031, 0.027], label: 'YD/AP DISC bar',
          action: 'Autopilot', actions: ['Autopilot', 'Autopilot/Yaw Damp'],
          values: { Autopilot: ['Disengage'] } },

        // Rough, tune with ?spots: the targets the normal flows and checklists add.
        // Glareshield: both MASTER WARNING lights (the Engine Fire Test lights them) and the SDU.
        { id: 'master-warning-left', box: [0.183, 0.105, 0.025, 0.035], label: 'MASTER WARNING light (pilot)',
          action: 'Master Warning' },
        { id: 'master-warning-right', box: [0.781, 0.103, 0.024, 0.035], label: 'MASTER WARNING light (copilot)',
          action: 'Master Warning' },
        { box: [0.445, 0.07, 0.088, 0.145], label: 'Standby display unit (SDU)',
          action: 'SDU', values: ['Aligned', 'Checked, On'] },
        // The MFD engine strip, a target per row. The strip-wide Engine Instruments box above
        // stays for its EP steps; each gauge answers for it too.
        { box: [0.374, 0.373, 0.040, 0.030], label: 'Torque',
          action: 'Torque', actions: ['Torque', 'Engine Instruments', 'Engine Instruments/Fuel Quantity'] },
        { box: [0.374, 0.405, 0.040, 0.028], label: 'ITT',
          action: 'ITT', actions: ['ITT', 'Right ITT and N1', 'Left ITT and N1', 'Engine Instruments', 'Engine Instruments/Fuel Quantity'] },
        { box: [0.374, 0.435, 0.040, 0.024], label: 'Prop RPM',
          action: 'Prop RPM',
          actions: ['Prop RPM', 'Propeller (inoperative engine)', 'Engine Instruments', 'Engine Instruments/Fuel Quantity'],
          values: { 'Propeller (inoperative engine)': ['Verify feathered'] } },
        { box: [0.374, 0.460, 0.040, 0.010], label: 'N1',
          action: 'N1', actions: ['N1', 'Right ITT and N1', 'Left ITT and N1', 'Engine Instruments', 'Engine Instruments/Fuel Quantity'] },
        { box: [0.374, 0.472, 0.040, 0.010], label: 'Oil pressure',
          action: 'Oil Pressure', also: ['Right Oil Pressure', 'Left Oil Pressure'],
          actions: ['Oil Pressure', 'Engine Instruments', 'Engine Instruments/Fuel Quantity'] },
        { box: [0.374, 0.482, 0.040, 0.010], label: 'Oil temperature',
          action: 'Oil Temperature', actions: ['Oil Temperature', 'Engine Instruments', 'Engine Instruments/Fuel Quantity'] },
        { box: [0.374, 0.492, 0.040, 0.010], label: 'Fuel flow',
          action: 'Fuel Flow', actions: ['Fuel Flow', 'Engine Instruments', 'Engine Instruments/Fuel Quantity'] },
        { box: [0.374, 0.504, 0.040, 0.018], label: 'Cabin altitude and rate',
          action: 'Cabin Altitude' },
        { box: [0.374, 0.524, 0.040, 0.023], label: 'Flap position indicator',
          action: 'Flap Indicator' },
        { box: [0.374, 0.550, 0.040, 0.048], label: 'CAS messages',
          action: 'CAS Messages', values: ['Checked'] },
        // The lower sub-panel, left to right.
        { box: [0.026, 0.812, 0.016, 0.026], label: 'BAT switch',
          action: 'Battery', values: ['Verify ON'] },
        { box: [0.076, 0.753, 0.014, 0.03], label: 'Avionics master power',
          action: 'Avionics Master', values: ['ON', 'OFF'] },
        { id: 'engine-anti-ice', box: [0.124, 0.80, 0.040, 0.10], label: 'Engine anti-ice',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { box: [0.121, 0.902, 0.018, 0.04], label: 'Autofeather switch',
          action: 'Autofeather', actions: ['Autofeather', 'Autofeather/Autoignition'],
          values: { Autofeather: ['ARM', 'OFF', 'As required'] } },
        { box: [0.155, 0.905, 0.016, 0.035], label: 'Prop governor test switch',
          action: 'Governors and Rudder Boost' },
        { box: [0.297, 0.739, 0.020, 0.032], label: 'Prop sync',
          action: 'Prop Sync', values: ['As required', 'On'] },
        // The exterior lights are two groups, LANDING to RECOG and BEACON with STROBE; either is
        // Lights. The beacon toggle inside the second is a target of its own.
        { id: 'lights-row', box: [0.244, 0.794, 0.090, 0.043], label: 'Exterior lights',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { id: 'ice-protection', box: [0.244, 0.840, 0.090, 0.11], label: 'Ice protection',
          action: 'Anti-Ice/De-Ice', values: ['Checked, as required', 'Set', 'As required'] },
        { id: 'lights-beacon-strobe', box: [0.369, 0.793, 0.031, 0.052], label: 'Beacon and strobe lights',
          action: 'Lights', values: ['Set', 'As required', 'Off'] },
        { box: [0.374, 0.799, 0.012, 0.035], label: 'Beacon',
          action: 'Beacon', actions: ['Beacon', 'Lights'],
          values: { Beacon: ['Cycled, ON'], Lights: ['Set', 'As required', 'Off'] } },
        { box: [0.376, 0.856, 0.012, 0.024], label: 'GEAR DOWN light',
          action: 'Landing Gear Indicator' },
        { box: [0.572, 0.79, 0.09, 0.10], label: 'Environmental controls',
          action: 'Environmental System', also: ['ECS', 'ECS Mode'], values: ['Set', 'OFF'] },
        { box: [0.640, 0.900, 0.014, 0.03], label: 'Envir bleed air switch',
          action: 'Envir Bleed Air switch', values: ['As required'] },
        { box: [0.709, 0.913, 0.029, 0.03], label: 'Engine fire test switches',
          action: 'Engine Fire Test', values: ['Checked'] },
        { box: [0.821, 0.771, 0.036, 0.073], label: 'Vacuum gauge',
          action: 'Vacuum', actions: ['Vacuum', 'Vacuum and Pneumatic Pressure'] },
        { box: [0.912, 0.771, 0.036, 0.073], label: 'Pneumatic pressure gauge',
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
        { id: 'ap-trim-master-grip', box: [0.123, 0.33, 0.03, 0.06], label: 'AP/TRIM MASTER',
          action: 'AP/TRIM MASTER',
          actions: ['AP/TRIM MASTER', 'Autopilot', 'Autopilot/Yaw Damp'],
          values: {
            'AP/TRIM MASTER': ['Depress Fully and Hold'],
            Autopilot: ['Disengage'],
          } },
        { id: 'ap-trim-master-top', box: [0.329, 0.21, 0.036, 0.085], label: 'AP/TRIM MASTER',
          action: 'AP/TRIM MASTER',
          actions: ['AP/TRIM MASTER', 'Autopilot', 'Autopilot/Yaw Damp'],
          values: {
            'AP/TRIM MASTER': ['Depress Fully and Hold'],
            Autopilot: ['Disengage'],
          } },
        { box: [0.1, 0.45, 0.886, 0.55], label: 'Control wheel',
          action: 'Control wheel',
          actions: ['Control wheel', 'Ailerons', 'Flight Controls', 'Controls'],
          values: {
            'Control wheel': ['Rapidly forward', 'Pull out of dive by exerting smooth steady back pressure'],
            Ailerons: ['Neutralize'],
          } },

        // Rough, tune with ?spots. The pitch trim switch, drawn twice like AP/TRIM MASTER.
        { id: 'pitch-trim-grip', box: [0.037, 0.29, 0.063, 0.055], label: 'Pitch trim switch',
          action: 'Electric Trim' },
        { id: 'pitch-trim-top', box: [0.24, 0.068, 0.077, 0.15], label: 'Pitch trim switch',
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
        // (§2.17.2.7). Drawn the size of a lever end, it is too small for a target of its own.
        { box: [0.04, 0.0, 0.36, 0.15], label: 'Power levers',
          action: 'POWER levers', also: ['Power'],
          actions: ['POWER levers', 'Autothrottles', 'Power Quadrant'],
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
        { box: [0.675, 0.065, 0.24, 0.09], label: 'Condition levers',
          action: 'Condition Lever',
          also: ['Condition Lever(s)', 'CONDITION lever (11.5% N1 or above)', 'Right Condition Lever',
            'Left Condition Lever', 'Left and Right Condition Levers'],
          actions: ['Condition Lever', 'Power Quadrant', 'HIGH IDLE'],
          values: ['FUEL CUTOFF', 'FUEL CUTOFF (PF)', 'LOW IDLE (PF)', 'LOW IDLE', 'HIGH IDLE'] },
        { box: [0.70, 0.225, 0.12, 0.04], label: 'Flap handle',
          action: 'Flaps',
          values: ['UP', 'As required', 'APPROACH (unless already up)', 'Maintain current setting',
            'Checked', 'Checked, As Required'] },
        { box: [0.29, 0.8, 0.05, 0.02], label: 'Rudder boost',
          action: 'RUDDER BOOST', values: ['OFF (PM)', 'On'] },

        // Rough, tune with ?spots: the targets the normal flows and checklists add.
        { id: 'trim-elevator', box: [0.028, 0.155, 0.11, 0.17], label: 'Elevator trim wheel',
          action: 'Trim' },
        { id: 'trim-aileron', box: [0.161, 0.30, 0.31, 0.12], label: 'Aileron trim',
          action: 'Trim' },
        { id: 'trim-rudder', box: [0.517, 0.348, 0.328, 0.115], label: 'Rudder tab',
          action: 'Trim' },
        // The crew oxygen handle, PULL ON / SYSTEM READY.
        { box: [0.05, 0.481, 0.894, 0.014], label: 'Oxygen',
          action: 'Oxygen', values: ['Open, 100%', 'Closed'] },
        // The pilot's cursor control panel: TAWS is tested from its PFD and MENU keys, TCAS from TFC.
        { box: [0.033, 0.506, 0.206, 0.101], label: 'Cursor control panel',
          action: 'TAWS', actions: ['TAWS', 'TCAS/Transponder'] },
        { box: [0.25, 0.508, 0.50, 0.099], label: 'FMS keypad',
          action: 'FMS' },
        { id: 'baro-left', box: [0.117, 0.652, 0.055, 0.022], label: 'BARO knob (pilot)',
          action: 'Altimeters' },
        { id: 'baro-right', box: [0.813, 0.652, 0.055, 0.022], label: 'BARO knob (copilot)',
          action: 'Altimeters' },
        { box: [0.061, 0.787, 0.133, 0.038], label: 'Pressurization controls',
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
        { id: 'firewall-left', box: [0.15, 0.58, 0.058, 0.16], label: 'Left firewall shutoff valve',
          action: 'Firewall shutoff valve', also: ['Firewall Shutoff Valves (both)'],
          values: ['CLOSE', 'CLOSE (LS)', 'OPEN (LS)'] },
        { id: 'firewall-right', box: [0.785, 0.58, 0.058, 0.16], label: 'Right firewall shutoff valve',
          action: 'Firewall shutoff valve', also: ['Firewall Shutoff Valves (both)'],
          values: ['CLOSE', 'CLOSE (LS)', 'OPEN (LS)'] },

        // Rough, tune with ?spots. The fuel control panel as a whole, then the controls on it,
        // each of which answers for the whole panel too.
        { box: [0.081, 0.132, 0.827, 0.381], label: 'Fuel control panel',
          action: 'Fuel Panel', values: ['Checked, Auto'] },
        { box: [0.473, 0.173, 0.039, 0.056], label: 'Crossfeed flow switch',
          action: 'Crossfeed', actions: ['Crossfeed', 'Fuel Panel'], values: { Crossfeed: ['OFF'] } },
        { id: 'fuel-qty-left', box: [0.2, 0.229, 0.2, 0.238], label: 'Left fuel quantity',
          action: 'Fuel Quantity', actions: ['Fuel Quantity', 'Fuel Panel'] },
        { id: 'fuel-qty-right', box: [0.585, 0.229, 0.2, 0.238], label: 'Right fuel quantity',
          action: 'Fuel Quantity', actions: ['Fuel Quantity', 'Fuel Panel'] },
      ],
    },
    {
      id: 'cb',
      label: 'Circuit Breakers',
      src: cbSrc,
      alt: 'T-54A circuit breaker panel: engines, lights, warnings, weather, flight, electrical, '
        + 'environmental and avionics breakers, with RUDDER BOOST in the flight group',
      spots: [
        { box: [0.39, 0.58, 0.035, 0.04], label: 'Rudder boost circuit breaker',
          action: 'Rudder boost circuit breaker (RS circuit breaker panel)', values: ['Pull (RS)'] },
      ],
    },
  ],

  // The steps with nothing on the poster to point at.
  //
  //   Rudder, Brakes                   on pedals the poster does not draw.
  //   Oxygen Mask/MIC Switch           the masks and MIC switches are not drawn.
  //   Announce, Crew, Descend, Evacuate, Land or ditch, Maneuver, Continue climb, Do not
  //   attempt another start            spoken, flown or decided, not actuated.
  //   Execute / Go to ... Checklist    cross-references to another procedure.
  actions: [
    { label: 'Announce "Abort"', ep: true, action: 'Announce "Abort"' },
    { label: 'Brakes', action: 'Brakes', values: ['As required', 'Check', 'Checked, set'] },
    { label: 'Rudder', ep: true, action: 'Rudder',
      values: ['Maintain directional control (PF)', 'Full deflection opposite the direction of the spin',
        'Neutralize once rotation has stopped'] },
    { label: 'Oxygen Mask/MIC', ep: true, action: 'Oxygen Mask/MIC Switch', values: ['ON/100%/OXY (PF, PM, OBS)'] },
    { label: 'Crew', action: 'Crew', values: ['Alerted', 'Briefed'] },
    { label: 'Descend', ep: true, action: 'Descend', values: ['As required'] },
    { label: 'Maneuver', ep: true, action: 'Maneuver as required.' },
    { label: 'Continue climb', ep: true, action: 'Continue climb until all warnings cease and safe terrain clearance assured.' },
    { label: 'Evacuate Aircraft', ep: true, action: 'Evacuate Aircraft' },
    { label: 'Land or ditch', ep: true, action: 'Land or ditch immediately.' },
    { label: 'No restart', ep: true, action: 'Do not attempt another start until the cause of the hot or hung start has been corrected.' },
    { label: 'Engine Clearing', ep: true, action: 'Engine Clearing Procedure', values: ['Execute'] },
    { label: 'Emer Shutdown on Ground', ep: true, action: 'Emergency Engine Shutdown on the Ground', values: ['Execute'] },
    { label: 'Emer Shutdown Checklist', ep: true, action: 'Emergency Shutdown Checklist', values: ['Execute'] },
    { label: 'Windmilling Airstart', ep: true, action: 'Windmilling Air Start', values: ['Execute'] },
    { label: 'Above 1,500 ft AGL', ep: true, action: 'Above 1,500 feet AGL or established at VFR pattern Altitude',
      values: ['Go to Emergency Shutdown Checklist'] },

    // The normal flows' and checklists' steps with nothing on the poster to point at: the
    // battery ammeter and DC volt/loadmeters, radar, minimums and the cabin door are not drawn,
    // and the rest are looked, said or done outside.
    { label: 'Verify Propellers Clear', action: 'Verify Propellers Clear', values: ['Signal Lineman'], normal: true },
    { label: 'Battery Ammeter/Loadmeter', action: 'Battery Ammeter/Loadmeter', values: ['Check'], normal: true },
    { label: 'DC Volt/Loadmeters', action: 'DC Volt/Loadmeters', values: ['Check', 'Checked'], normal: true },
    { label: 'Cabin Door', action: 'Cabin Door', values: ['CAS message removed', 'Locked, light out'], normal: true },
    { label: 'Seatbelt', action: 'Seatbelt', values: ['Fastened'], normal: true },
    { label: 'ATIS', action: 'ATIS', values: ['As required'], normal: true },
    { label: 'Radar', action: 'Radar', values: ['As required'], normal: true },
    { label: 'Minimums', action: 'Minimums', normal: true },
    { label: 'Build the approach', action: 'Build the approach.', normal: true },
    { label: 'Brief the approach', action: 'Brief the approach.', normal: true },
    { label: 'Go-Around', action: 'Go-Around', normal: true },
    { label: 'Control Lock', action: 'Control Lock', values: ['As required'], normal: true },
    { label: 'Wheels', action: 'Wheels', values: ['Chocked'], normal: true },
  ],
};

export const T54A_ALIASES = aliasesFrom(T54A_POSTER);

export const t54aRegion = (id) => T54A_POSTER.regions.find((r) => r.id === id);
