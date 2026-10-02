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
// control the NATOPS (A1-T54A-NFM-000, IC 04) names; none has been tuned with ?spots yet. The
// NATOPS settled two the placards could not: the autothrottles disconnect at the AT button on the
// right power lever (§2.17.2.7), and the autopilot at the AP/TRIM MASTER switch or the YD/AP DISC
// bar (§15.15.1).
//
// Five regions, every one a whole sub-panel off the sheet: the main instrument panel, the
// pilot's control wheel, the whole centre pedestal (power quadrant to the RUDDER BOOST switch),
// the fuel control and fuel breaker panel, and the circuit breaker panel.

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
          values: ['VXSE or VYSE', 'Pitch for 140 KIAS', 'As required', 'Vx', 'Below 181 KIAS'] },
        { box: [0.125, 0.392, 0.09, 0.14], label: 'Attitude indicator',
          action: 'Pitch',
          actions: ['Pitch', 'Wings', 'Roll'],
          values: {
            Pitch: ['Adjust to satisfy RA', 'Set and hold approximately 15 degrees noseup'],
            Wings: ['Level'],
            Roll: ['Continue planned lateral path'],
          } },
        // The engine strip down the left of the MFD. "Verify feathered" is read off it (prop
        // rpm), as the monitor step is: an instrument the step is worked against.
        { box: [0.373, 0.368, 0.062, 0.19], label: 'Engine instruments',
          action: 'Engine Instruments',
          actions: ['Engine Instruments', 'Propeller (inoperative engine)'],
          values: {
            'Engine Instruments': ['Monitor (1000 C Maximum) (PF, PM)'],
            'Propeller (inoperative engine)': ['Verify feathered'],
          } },

        // One step, one control, drawn at each end of the glareshield. Same `action`, different `id`.
        { id: 'fire-ext-left', box: [0.337, 0.103, 0.025, 0.045], label: 'LH engine fire push button',
          action: 'Fire Extinguisher', values: ['As required', 'As required (LS, RS)'] },
        { id: 'fire-ext-right', box: [0.612, 0.103, 0.025, 0.045], label: 'RH engine fire push button',
          action: 'Fire Extinguisher', values: ['As required', 'As required (LS, RS)'] },

        // The MASTER SWITCH bar is the gang bar; the generator switches sit under it.
        { box: [0.022, 0.793, 0.09, 0.018], label: 'Master switch gang bar',
          action: 'Gang bar', values: ['OFF'] },
        { box: [0.055, 0.811, 0.054, 0.025], label: 'Generators',
          action: 'Generators (one at a time)', values: ['OFF, RESET momentarily, then ON (LS)'] },
        // STBY DISPLAY powers the standby display unit, poster item 1.
        { box: [0.026, 0.855, 0.018, 0.03], label: 'Standby display',
          action: 'SDU Power', values: ['OFF'] },
        { box: [0.054, 0.888, 0.04, 0.036], label: 'Ignition and engine start',
          action: 'IGNITION AND ENGINE START switch',
          also: ['IGNITION AND ENGINE START switches'],
          values: ['OFF (1 sec)', 'STARTER ONLY (for the remainder of the 40 second time limit)',
            'OFF (at the 40 second time limit)', 'OFF', 'OFF (LS)'] },
        { box: [0.126, 0.748, 0.03, 0.034], label: 'Engine auto ignition',
          action: 'Autoignition', values: ['ARM (LS)'] },
        { box: [0.008, 0.958, 0.026, 0.042], label: 'Parking brake',
          action: 'Stop the aircraft and set the parking brake.' },
        { box: [0.342, 0.815, 0.022, 0.105], label: 'Landing gear handle',
          action: 'Landing Gear', also: ['Gear', 'Landing Gear (when climb established)'],
          values: ['UP', 'As required', 'DN'] },
        // Both BLEED AIR VALVES toggles under one box: the step names the affected engine's, and
        // they sit side by side.
        { box: [0.658, 0.88, 0.04, 0.04], label: 'Bleed air valves',
          action: 'Bleed Air Valve (affected engine(s))', values: ['PNEU & ENVIR OFF (RS)'] },
        // The YD/AP DISC bar on the flight guidance panel. AP/TRIM MASTER on the wheel does the
        // same (§15.15.1), so the yoke carries the step too.
        { id: 'yd-ap-disc', box: [0.592, 0.232, 0.031, 0.03], label: 'YD/AP DISC bar',
          action: 'Autopilot', values: ['Disengage'] },
        // The AT button on the right power lever, whose head the poster draws at the foot of this
        // panel: "the Autothrottle Disconnect (AT) button on the right power lever" (§2.17.2.7).
        { box: [0.398, 0.975, 0.034, 0.025], label: 'Autothrottle disconnect (AT) button',
          action: 'Autothrottles', values: ['Disengage', 'As required'] },
      ],
    },
    {
      id: 'yoke',
      label: "Pilot's Control Wheel",
      src: yokeSrc,
      alt: "T-54A pilot's control wheel, with its left grip drawn out beside it: MIC, pitch trim "
        + 'and the AP/TRIM MASTER switch',
      spots: [
        { box: [0.12, 0.32, 0.035, 0.06], label: 'AP/TRIM MASTER',
          action: 'AP/TRIM MASTER',
          actions: ['AP/TRIM MASTER', 'Autopilot'],
          values: {
            'AP/TRIM MASTER': ['Depress Fully and Hold'],
            Autopilot: ['Disengage'],
          } },
        { box: [0.14, 0.45, 0.7, 0.55], label: 'Control wheel',
          action: 'Control wheel',
          actions: ['Control wheel', 'Ailerons'],
          values: {
            'Control wheel': ['Rapidly forward', 'Pull out of dive by exerting smooth steady back pressure'],
            Ailerons: ['Neutralize'],
          } },
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
        { box: [0.04, 0.0, 0.36, 0.14], label: 'Power levers',
          action: 'POWER levers', also: ['Power'],
          values: ['IDLE', 'IDLE (PF)', 'GROUND FINE', 'REVERSE as required', 'As required',
            'As Required (PF)', 'Max Continuous',
            'Max Continuous, establish positive rate of climb (VXSE minimum)'] },
        { box: [0.46, 0.01, 0.18, 0.12], label: 'Prop levers',
          action: 'PROP lever',
          also: ['If propeller fails to feather, PROP lever (inoperative engine)'],
          values: ['FEATHER', 'FEATHER (PF)', 'Full Forward', 'Full Forward (PF)',
            'Attempt to adjust to normal operating range (PF)'] },
        { box: [0.67, 0.06, 0.25, 0.11], label: 'Condition levers',
          action: 'Condition Lever',
          also: ['Condition Lever(s)', 'CONDITION lever (11.5% N1 or above)'],
          values: ['FUEL CUTOFF', 'FUEL CUTOFF (PF)', 'LOW IDLE (PF)'] },
        { box: [0.70, 0.215, 0.12, 0.04], label: 'Flap handle',
          action: 'Flaps',
          values: ['UP', 'As required', 'APPROACH (unless already up)', 'Maintain current setting'] },
        { box: [0.29, 0.79, 0.05, 0.035], label: 'Rudder boost',
          action: 'RUDDER BOOST', values: ['OFF (PM)'] },
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
        { id: 'firewall-left', box: [0.15, 0.56, 0.058, 0.17], label: 'Left firewall shutoff valve',
          action: 'Firewall shutoff valve', also: ['Firewall Shutoff Valves (both)'],
          values: ['CLOSE', 'CLOSE (LS)', 'OPEN (LS)'] },
        { id: 'firewall-right', box: [0.785, 0.56, 0.058, 0.17], label: 'Right firewall shutoff valve',
          action: 'Firewall shutoff valve', also: ['Firewall Shutoff Valves (both)'],
          values: ['CLOSE', 'CLOSE (LS)', 'OPEN (LS)'] },
      ],
    },
    {
      id: 'cb',
      label: 'Circuit Breakers',
      src: cbSrc,
      alt: 'T-54A circuit breaker panel: engines, lights, warnings, weather, flight, electrical, '
        + 'environmental and avionics breakers, with RUDDER BOOST in the flight group',
      spots: [
        { box: [0.383, 0.578, 0.044, 0.05], label: 'Rudder boost circuit breaker',
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
    { label: 'Announce "Abort"', action: 'Announce "Abort"' },
    { label: 'Brakes', action: 'Brakes', values: ['As required'] },
    { label: 'Rudder', action: 'Rudder',
      values: ['Maintain directional control (PF)', 'Full deflection opposite the direction of the spin',
        'Neutralize once rotation has stopped'] },
    { label: 'Oxygen Mask/MIC', action: 'Oxygen Mask/MIC Switch', values: ['ON/100%/OXY (PF, PM, OBS)'] },
    { label: 'Crew', action: 'Crew', values: ['Alerted'] },
    { label: 'Descend', action: 'Descend', values: ['As required'] },
    { label: 'Maneuver', action: 'Maneuver as required.' },
    { label: 'Continue climb', action: 'Continue climb until all warnings cease and safe terrain clearance assured.' },
    { label: 'Evacuate Aircraft', action: 'Evacuate Aircraft' },
    { label: 'Land or ditch', action: 'Land or ditch immediately.' },
    { label: 'No restart', action: 'Do not attempt another start until the cause of the hot or hung start has been corrected.' },
    { label: 'Engine Clearing', action: 'Engine Clearing Procedure', values: ['Execute'] },
    { label: 'Emer Shutdown on Ground', action: 'Emergency Engine Shutdown on the Ground', values: ['Execute'] },
    { label: 'Emer Shutdown Checklist', action: 'Emergency Shutdown Checklist', values: ['Execute'] },
    { label: 'Windmilling Airstart', action: 'Windmilling Air Start', values: ['Execute'] },
    { label: 'Above 1,500 ft AGL', action: 'Above 1,500 feet AGL or established at VFR pattern Altitude',
      values: ['Go to Emergency Shutdown Checklist'] },
  ],
};

export const T54A_ALIASES = aliasesFrom(T54A_POSTER);

export const t54aRegion = (id) => T54A_POSTER.regions.find((r) => r.id === id);
