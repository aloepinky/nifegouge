import { aliasesFrom } from '../epsLimits/controlMatch';

// The T-44C cockpit poster and its click targets. See epsLimits/CockpitPoster.js for how a
// record is drawn and epsLimits/SpotEditor.js (?spots, development builds) for how the boxes are
// measured — every `box` is [left, top, width, height] as FRACTIONS of its own region image.
//
// Four regions, and every one of them is a WHOLE sub-panel off the sheet. The publication draws
// six; tools/crop-posters.py cuts the four the EPs touch and cuts nothing in half. An earlier
// version took the gear handle and the environmental group out of the middle of the main
// instrument panel because they were easier to hit that way, and what it taught was a panel that
// does not exist. Recognising the panel by its whole shape, and knowing where a switch sits among
// its neighbours, is the thing this page is for.
//
// The two the EPs do not touch are the overhead (lights, wiper, free-air temp and the operating
// limitations placard) and the engine gauge / oxygen panel (supply pressure, gyro suction,
// pneumatic pressure, the emergency static source). Neither carries a control any step names.
//
// T44CEPsLimits.js lays them out: `main` is a band across the full width of the page, and the
// other three stack in a column beside the EP card — the power quadrant, then the fuel control
// panel, then the start, electrical and radio stack, which is the order they run down the centre
// console in the aeroplane.
//
// `values` is NOT a list a click steps through. Clicking the control a step names hands over that
// step's whole answer, setting and all (epsLimits/stepFlow.js). It is the record of every setting
// the EPs put this control to, and tools/check-posters.js fails on a step whose setting no record
// lists — which is how a hotspot authored against the wrong control gets caught.
//
// A note on the levers, because the figure does not label them: the pedestal runs POWER, PROP,
// CONDITION left to right, and the sheet captions only the last two (FEATHER on the props, FUEL
// CUT OFF on the condition levers). The power levers are the un-captioned pair carrying the
// REVERSE gate.

export const T44C_POSTER = {
  regions: [
    {
      id: 'main',
      label: 'Main Instrument Panel',
      src: '/images/t44c-main.webp',
      alt: 'T-44C main instrument panel: the annunciator row and both fire extinguisher push '
        + 'buttons on the glareshield, pilot and copilot PFDs either side of the engine gauges '
        + 'and navigation displays, and the lower sub-panel with the lights, anti-ice and heat '
        + 'switch rows, the landing gear handle, the environmental group and the breaker stacks',
      spots: [
        // The pilot's PFD. Airspeed is the tape and pitch and bank are the attitude sphere beside
        // it, so the two targets abut exactly as the two readouts do. Only the left seat's is a
        // target: the student flies from it, and ringing both would say the copilot's display is
        // an alternative rather than a duplicate.
        { box: [0.139, 0.289, 0.022, 0.138], label: 'Airspeed indicator',
          action: 'Airspeed',
          // The Vx climb takes BOTH this tape and the terrain warning lights below, because the
          // step is "climb at Vx UNTIL the warnings cease" and you are working both. Each supplies
          // its own half of the step's text and the box stays yellow until the other arrives.
          actions: ['Airspeed', 'Continue Climb at Vx Until All Visual And Voice Warnings Cease'],
          values: { Airspeed: ['As Required (VXSE Or VYSE)', 'As Required'] },
          fills: { 'Continue Climb at Vx Until All Visual And Voice Warnings Cease': 'Continue Climb at Vx' } },
        // One target, two controls, and a settings list for each — see `valuesFor` in
        // controlMatch.js. Pitch and bank are read off one sphere, so splitting it into two boxes
        // would invent a division the instrument does not have.
        { box: [0.161, 0.288, 0.066, 0.139], label: 'Attitude indicator',
          action: 'Pitch',
          // Pitch and bank, and nothing else. The Control Wheel steps were tried here and taken
          // back out: you do not fly off the attitude indicator outside real IMC, so standing it
          // in for the yoke is an abstraction too far. The yoke is not drawn, so those steps are
          // buttons.
          actions: ['Pitch', 'Wings'],
          values: {
            Pitch: ['As Required to set and maintain VX', 'Set and Hold Approximately 15° Noseup'],
            Wings: ['Level'],
          } },

        // One step, one control, drawn at each end of the glareshield. Same `action`, different
        // `id` — the same arrangement as the firewall valves on the fuel panel.
        { id: 'fire-ext-left', box: [0.244, 0.167, 0.027, 0.045], label: 'LH fire extinguisher',
          action: 'Fire Extinguisher', also: ['Fire Extinguisher(s)'], values: ['As Required'] },
        { id: 'fire-ext-right', box: [0.73, 0.168, 0.026, 0.045], label: 'RH fire extinguisher',
          action: 'Fire Extinguisher', also: ['Fire Extinguisher(s)'], values: ['As Required'] },

        // The step names this instrument: "Full Deflection Opposite Direction Of Turn Needle".
        { box: [0.492, 0.294, 0.054, 0.117], label: 'Turn needle',
          action: 'Rudder', also: ['Turn Indicator'],
          values: ['Full Deflection Opposite Direction Of Turn Needle', 'Neutralize After Rotation Stops', 'CHECKED'] },
        // All three lights under one box. The step is to keep climbing until the visual warnings
        // cease, and these are the visual warnings.
        { id: 'terrain-warnings', box: [0.496, 0.252, 0.047, 0.035],
          label: 'Terrain warning lights',
          action: 'Continue Climb at Vx Until All Visual And Voice Warnings Cease',
          fills: 'Until All Visual And Voice Warnings Cease' },

        { box: [0.275, 0.826, 0.012, 0.02], label: 'Windshield anti-ice',
          action: 'Windshield Heat', also: ['WSHLD ANTI-ICE'], values: ['As Required', 'BOTH, Then PILOT'] },
        // The knurled knob on the yellow housing that hangs below the bottom edge of the sub-panel,
        // which is where the PARKING BRAKE placard's leader arrow points — down and to the right of
        // the placard. The first cut of this box was on the placard and the arrow instead, which is
        // the label for the control rather than the control.
        { box: [0.361, 0.944, 0.027, 0.052], label: 'Parking brake',
          action: 'Stop the aircraft and set the parking brake.', also: ['Parking Brake'], values: ['SET', 'RELEASED'] },

        { box: [0.592, 0.764, 0.019, 0.121], label: 'Landing gear handle',
          action: 'Landing Gear', also: ['Landing gear', 'Gear'], values: ['UP', 'As Required', 'DOWN', 'DOWN/LOCKED'] },
        { box: [0.629, 0.769, 0.011, 0.027], label: 'Vent blower',
          action: 'Vent Blower', values: ['AUTO'] },
        { box: [0.715, 0.737, 0.03, 0.059], label: 'Cabin temperature mode',
          action: 'Cabin Temperature Mode', values: ['OFF'] },
        // Both BLEED AIR VALVE toggles under one box. They are about six painted pixels apart and
        // the step moves them together, so a target per switch would be two things nobody can hit
        // where one thing everybody can hit says the same.
        { box: [0.626, 0.839, 0.031, 0.036], label: 'Bleed air valves',
          action: 'Bleed air valve', values: ['Closed', 'OPEN or CLOSED'] },

        // ---- For the normal checklists (Hollywood). Boxes ROUGH, placed 2026-10-12 off a grid
        // and not yet checked by eye: tune them with ?spots before trusting them. ----
        { box: [0.263, 0.036, 0.464, 0.057], label: 'Annunciator panel',
          action: 'Annunciator Panel', values: ['CHECKED'] },
        { box: [0.335, 0.143, 0.333, 0.078], label: 'Autopilot (FGP)',
          action: 'Autopilot/Yaw Damp', also: ['Yaw damp'], values: ['CHECKED/DISENGAGED', 'Off'] },
        // The engine gauges, one target per row: each row is the pair, left engine and right, so
        // one box per instrument rather than one per dial. A step that names a gauge needs THAT
        // gauge; "Engine Instruments" is any of them, oil and fuel flow included (the user's
        // ruling, 2026-10-12). "ITT and N1" needs both: each supplies its half of the step and
        // the line stays yellow until the other arrives. N1 is the gauge the sheet labels NG.
        // The four boxes split the one the user tuned for the whole column, 2026-10-12.
        { id: 'gauge-itt', box: [0.319, 0.234, 0.086, 0.091], label: 'ITT',
          action: 'ITT', also: ['Right Engine'],
          actions: ['ITT', 'ITT and N1', 'Engine Instruments'],
          values: { ITT: ['Monitor ITT'], 'ITT and N1': ['Light-off, N1 stable above 50%'], 'Engine Instruments': ['CHECKED'] },
          fills: { 'ITT and N1': 'ITT and N1 - Light-off,' } },
        { id: 'gauge-trq', box: [0.319, 0.334, 0.085, 0.087], label: 'Torque',
          action: 'Torque', actions: ['Torque', 'Engine Instruments'],
          values: { 'Engine Instruments': ['CHECKED'] } },
        { id: 'gauge-np', box: [0.319, 0.429, 0.085, 0.089], label: 'Prop RPM (Np)',
          action: 'Prop RPM', actions: ['Prop RPM', 'Engine Instruments'],
          values: { 'Engine Instruments': ['CHECKED'] } },
        { id: 'gauge-n1', box: [0.319, 0.528, 0.085, 0.084], label: 'N1 (NG)',
          action: 'N1', actions: ['N1', 'ITT and N1', 'Engine Instruments'],
          values: {
            N1: ['Above 12 percent', '70 percent (both engines)', 'IDLE (both engines)'],
            'ITT and N1': ['Light-off, N1 stable above 50%'],
            'Engine Instruments': ['CHECKED'],
          },
          fills: { 'ITT and N1': 'N1 stable above 50%' } },
        { box: [0.415, 0.278, 0.069, 0.154], label: 'ESIS',
          action: 'ESIS', values: ['ON', 'OFF'] },
        { box: [0.226, 0.285, 0.027, 0.143], label: 'Altimeter (pilot PFD)',
          action: 'Altimeters', values: ['CHECKED/SET', 'SET', '___.___ SET', '____.____ SET'] },
        { box: [0.417, 0.442, 0.133, 0.177], label: 'MFD',
          action: 'MFD', values: ['CHECKED/SET'] },
        { box: [0.552, 0.262, 0.127, 0.325], label: 'Radio tuning unit',
          action: 'Radios/NAVAIDs', values: ['SET'] },
        { box: [0.32, 0.626, 0.084, 0.088], label: 'Oil pressure and temperature',
          action: 'Oil Pressure', actions: ['Oil Pressure', 'Engine Instruments'],
          values: { 'Oil Pressure': ['Thumbs up to lineman'], 'Engine Instruments': ['CHECKED'] } },
        { box: [0.406, 0.625, 0.085, 0.089], label: 'Fuel flow',
          action: 'Fuel Flow', actions: ['Fuel Flow', 'Engine Instruments'],
          values: { 'Fuel Flow': ['Note'], 'Engine Instruments': ['CHECKED'] } },
        { box: [0.099, 0.693, 0.09, 0.066], label: 'Generator volt-loadmeters',
          action: 'Generator Voltages', also: ['Generator Load'], values: ['CHECKED'] },
        { box: [0.259, 0.748, 0.152, 0.035], label: 'Lights switches',
          action: 'Lights', values: ['SET', 'OFF'] },
        { box: [0.258, 0.823, 0.012, 0.024], label: 'De-ice cycle',
          action: 'DE-ICE CYCLE', values: ['SINGLE, Then MANUAL'] },
        { box: [0.352, 0.827, 0.013, 0.024], label: 'Autofeather',
          action: 'Autofeather', also: ['Autofeather/Autoignition'], values: ['ARMED', 'OFF', 'CHECKED/OFF'] },
        { box: [0.382, 0.826, 0.012, 0.024], label: 'Prop governor test',
          action: 'Overspeed Governors', values: ['CHECKED'] },
        { box: [0.448, 0.828, 0.01, 0.018], label: 'Prop sync',
          action: 'Prop Sync', values: ['OFF'] },
        { box: [0.259, 0.883, 0.028, 0.034], label: 'Pitot heat',
          action: 'LEFT & RIGHT PITOT', values: ['ON'] },
        { box: [0.291, 0.883, 0.029, 0.035], label: 'Fuel control heat',
          action: 'Fuel Control Heat', values: ['ON', 'OFF'] },
        { box: [0.325, 0.883, 0.011, 0.033], label: 'Prop deice',
          action: 'Propeller deicer', also: ['Propeller deice'], values: ['ON', 'OFF (if not previously secured)'] },
        { box: [0.34, 0.882, 0.012, 0.035], label: 'Stall heat',
          action: 'Stall Heat', values: ['ON'] },
        { box: [0.365, 0.886, 0.029, 0.036], label: 'Engine lip boots',
          action: 'LEFT & RIGHT ENG LIP BOOT', values: ['ON'] },
        { box: [0.398, 0.886, 0.028, 0.032], label: 'Fuel vent heat',
          action: 'LEFT & RIGHT FUEL VENT', values: ['ON'] },
        { box: [0.464, 0.751, 0.016, 0.05], label: 'Fire detection test',
          action: 'Fire Detectors', values: ['CHECKED'] },
        { box: [0.585, 0.674, 0.009, 0.029], label: 'Transponder',
          action: 'Transponder', values: ['STANDBY', 'SET'] },
      ],
    },
    {
      id: 'quadrant',
      label: 'Power Quadrant',
      src: '/images/t44c-quadrant.webp',
      alt: 'T-44C pedestal: power, prop and condition levers with the reverse and feather gates, '
        + 'friction locks, the flap handle and the aileron and rudder trim wheels',
      spots: [
        { box: [0.11, 0.02, 0.3, 0.3], label: 'Power levers',
          action: 'Power Lever',
          also: ['Power Levers', 'Power Lever (Failed Engine)', 'Power'],
          values: ['IDLE', 'As Required', 'Max Continuous',
            'Max Continuous, Establish Positive Rate Of Climb (VXSE Minimum)', 'As required, Establish Positive Rate of Climb (VX minimum)'] },
        { box: [0.2894, 0.3657, 0.163, 0.12], label: 'Reverse',
          action: 'Reverse', values: ['As Required'] },
        { box: [0.4388, 0.042, 0.2072, 0.283], label: 'Prop levers',
          action: 'Prop Lever',
          // The last of these is a step phrased as a sentence rather than "control - setting", so
          // it reads as its own control until it is said here that it is this lever.
          also: ['Prop Lever (Failed Engine)', 'Prop', 'Props',
            'Attempt To Adjust Prop RPM to Normal Operating Range',
            // The normal checklists' prop-lever checks: feathering by hand and the primary
            // governor check are both done on these levers.
            'Manual Feather', 'Primary Governors'],
          values: ['FEATHER', 'Full Forward', '1900 RPM', 'CHECKED', '1,900 rpm'] },
        { box: [0.71, 0.07, 0.259, 0.239], label: 'Condition levers',
          action: 'Condition Lever',
          also: ['Condition Levers', 'Condition Lever (Failed Engine)', 'Right Condition Lever'],
          values: ['FUEL CUTOFF', 'LOW IDLE', 'FUEL CUTOFF (Dec. Below 790°C)', 'HIGH IDLE'] },
        { box: [0.65, 0.462, 0.17, 0.115], label: 'Flap handle',
          action: 'Flaps',
          values: ['UP', 'APPROACH (Unless Already UP)', 'Approach (Unless Already Up)',
            'As Required', 'Maintain Current Setting', 'CORRESPOND', 'CHECKED/UP', 'Up/Approach/Down'] },

        // Normal checklists. Rough, 2026-10-12: tune with ?spots. Three wheels, one step.
        { id: 'trim-elevator', box: [0.11, 0.322, 0.08, 0.334], label: 'Elevator trim',
          action: 'Trim', values: ['CHECKED/SET', 'SET ZERO'] },
        { id: 'trim-aileron', box: [0.231, 0.666, 0.24, 0.186], label: 'Aileron trim',
          action: 'Trim', values: ['CHECKED/SET', 'SET ZERO'] },
        { id: 'trim-rudder', box: [0.611, 0.754, 0.233, 0.178], label: 'Rudder trim',
          action: 'Trim', values: ['CHECKED/SET', 'SET ZERO'] },
      ],
    },
    {
      id: 'fuel',
      label: 'Fuel Control',
      src: '/images/t44c-fuel.webp',
      alt: 'T-44C fuel control panel: left and right fuel quantity gauges, transfer pump, boost '
        + 'pump and crossfeed switches, and the red firewall valve handles at each end',
      spots: [
        // One step, one control, drawn at each end of the panel. Same `action`, different `id`.
        { id: 'firewall-left', box: [0.15, 0.78, 0.06, 0.2], label: 'Left firewall valve',
          action: 'Firewall Valve', also: ['Firewall Valves'], values: ['CLOSED', 'OPEN'] },
        { id: 'firewall-right', box: [0.785, 0.78, 0.055, 0.2], label: 'Right firewall valve',
          action: 'Firewall Valve', also: ['Firewall Valves'], values: ['CLOSED', 'OPEN'] },
        { id: 'boost-left', box: [0.132, 0.339, 0.044, 0.073], label: 'Left boost pump',
          action: 'Boost Pumps', values: ['OFF'] },
        { id: 'boost-right', box: [0.813, 0.346, 0.046, 0.066], label: 'Right boost pump',
          action: 'Boost Pumps', values: ['OFF'] },

        // Normal checklists. Rough, 2026-10-12: tune with ?spots.
        { id: 'transfer-left', box: [0.13, 0.209, 0.048, 0.069], label: 'Left transfer pump',
          action: 'Transfer Pumps', values: ['CHECKED/AUTO', 'OFF'] },
        { id: 'transfer-right', box: [0.813, 0.201, 0.046, 0.081], label: 'Right transfer pump',
          action: 'Transfer Pumps', values: ['CHECKED/AUTO', 'OFF'] },
        { box: [0.811, 0.473, 0.048, 0.072], label: 'Crossfeed',
          action: 'Crossfeed', values: ['CHECKED/AUTO', 'CLOSED'] },
        { id: 'fuel-qty-left', box: [0.201, 0.261, 0.203, 0.258], label: 'Left fuel quantity',
          action: 'Fuel Quantity', also: ['Fuel Quantity Indicators', 'Fuel Quantity (Current Limiters)'],
          values: ['___ LBS, ___ LBS REQUIRED', 'Checked', 'CHECKED'] },
        { id: 'fuel-qty-right', box: [0.581, 0.264, 0.205, 0.255], label: 'Right fuel quantity',
          action: 'Fuel Quantity', also: ['Fuel Quantity Indicators', 'Fuel Quantity (Current Limiters)'],
          values: ['___ LBS, ___ LBS REQUIRED', 'Checked', 'CHECKED'] },
      ],
    },
    {
      id: 'elec',
      label: 'Start & Electrical',
      src: '/images/t44c-elec.webp',
      alt: 'T-44C right subpanel: ignition and engine start, engine auto ignition, avionics '
        + 'master, inverters, auxiliary battery, the master switch gang bar, the FMS, the audio '
        + 'and TACAN panels, the cabin pressurization controls and the circuit breaker panels',
      spots: [
        // Abnormal Start names the starter on two steps running. Both are answered by clicking
        // it twice: a click fills the open step and the next click moves to the next open one.
        { box: [0.163, 0.041, 0.15, 0.032], label: 'Ignition and engine start',
          action: 'Starter', also: ['Right Starter', 'Left Starter'],
          values: ['Starter Only (For The Remainder Of The 40 Seconds)', 'Off (at 40 seconds)', 'On, Ignition, rotation', 'OFF'] },
        { box: [0.161, 0.134, 0.152, 0.035], label: 'Engine auto ignition',
          action: 'Autoignition', values: ['ARMED', 'OFF'] },
        // NATOPS §20.4.1 calls this out by name: "MIC MASK/BOOM Selector Switch -- This two
        // position switch enables the appropriate crew member to select either the boom mike or
        // the oxygen mask position for transmitting." The step is "Oxygen masks/MIC switches (100
        // percent)", and this is the MIC switches half. The 100-percent half is the diluter-demand
        // regulator on the side console (§2.19.2), which the sheet does not draw — a named control
        // that is drawn gets a target even when its partner is missing.
        { id: 'mic-pilot', box: [0.359, 0.47, 0.028, 0.03], label: "Pilot's MIC MASK/BOOM",
          action: 'Oxygen Mask/MIC Switches (100 Percent)', also: ['Oxygen Mask Mic'], values: ['As Required', 'CHECKED/OPEN'] },
        { id: 'mic-copilot', box: [0.841, 0.47, 0.028, 0.03], label: "Copilot's MIC MASK/BOOM",
          action: 'Oxygen Mask/MIC Switches (100 Percent)', values: ['As Required'] },
        { box: [0.376, 0.232, 0.044, 0.036], label: 'Auxiliary battery',
          action: 'AUX BATT Switch', values: ['OFF'] },
        { box: [0.0855, 0.32, 0.306, 0.022], label: 'Master switch gang bar',
          action: 'Gang Bar', also: ['Gangbar'], values: ['OFF'] },
        { box: [0.36, 0.902, 0.048, 0.037], label: 'Cabin pressurization dump',
          action: 'Pressurization', values: ['DUMP'] },

        // Normal checklists. Rough, 2026-10-12: tune with ?spots. The two generator switches sit
        // on the master-switch bar, inside the gang bar's box, so they come after it and are drawn
        // over it; the gang bar's own box is left as it was.
        { box: [0.056, 0.225, 0.045, 0.041], label: 'Avionics master',
          action: 'Avionics Master', also: ['AUX/BATT/Avionics Master', 'AUX BATT/Avionics Master'],
          values: ['CHECKED/ON', 'OFF'] },
        { box: [0.218, 0.34, 0.04, 0.033], label: 'GEN NO 1 (left)',
          action: 'Left Generator', values: ['RESET, ON. Switch, light, load'] },
        { box: [0.313, 0.34, 0.041, 0.031], label: 'GEN NO 2 (right)',
          action: 'Right Generator',
          values: ['Reset, On. Switch, Light, Load', 'Load below .5, OFF', 'Reset, On', 'OFF', 'RESET, ON. Switch, light, load'] },
        { box: [0.477, 0.01, 0.494, 0.404], label: 'FMS',
          action: 'FMS', values: ['CHECKED/SET', 'SET'] },
        { id: 'tacan', box: [0, 0.53, 0.486, 0.122], label: 'TACAN',
          action: 'Radios/NAVAIDs', values: ['SET'] },
        { id: 'cabin-controller', box: [0.145, 0.915, 0.052, 0.039], label: 'Cabin pressure controller',
          action: 'Pressurization', values: ['SET', 'CHECKED', 'CHECKED/DEPRESSURIZED'] },
      ],
    },
  ],

  // What is left after the poster: the steps with nothing on the sheet to point at. A step that
  // HAS a target does not keep a button as well — five of these went when their controls were
  // found, because a second way to answer a step you can already click is a second thing to read
  // past, and one of them (Adjust Prop RPM) had become an alias of the prop lever and was
  // answering five other steps under a caption that described none of them.
  //
  //   Announce "Abort" / Crew - Alerted   spoken, not actuated. The cabin CABIN SIGN switch was
  //                                       considered for Crew and declined: it alerts passengers,
  //                                       not the other pilot, and a target that teaches the wrong
  //                                       switch is worse than no target. Worth revisiting if the
  //                                       side consoles are ever cut as a region.
  //   Brakes - As Required                toe brakes, on rudder pedals the sheet does not draw.
  //                                       The RUDDER TAB wheel on the pedestal is trim, and the
  //                                       parking brake is a different control.
  //   Evacuate Aircraft                   no door or exit on the sheet.
  //   Land as soon as possible.           a decision, not a control.
  //   Emergency Shutdown Checklist        cross-references to another checklist.
  //   Alternate Prop Feather Checklist
  //
  // Two more turn on the control wheel, which the sheet does not draw anywhere. NATOPS settles
  // both. Figure 1.2-3 callout 12 is "PITCH TRIM/AP/YD DISCONNECT & MIC SWITCHES" and §2.12.1
  // says "a microphone, AP/YD/trim disconnect, elevator trim and map light is incorporated in each
  // control wheel", so:
  //
  //   A/P/Trim Disconnect (control wheel)   the step names the wheel-mounted switch. §20.6 lists
  //                                         seven ways to disconnect and treats the wheel switch
  //                                         and the FGP's AP/YD DISC switch-bar as two of them, so
  //                                         the YD/AP DISC drawn on the autopilot controller is a
  //                                         DIFFERENT named control, not this one. Button.
  //   Control Wheel - Rapidly Forward       the attitude indicator was tried as a stand-in and
  //                                         rejected: you do not fly off it outside real IMC.
  //                                         Button.
  // `ep` marks a button only the EPs use and `normal` one only the normal checklists use, so each
  // card shows only its own (T44CEPsLimits.js); Brakes and Crew serve both.
  actions: [
    { label: 'Announce "Abort"', action: 'Announce "Abort"', ep: true },
    { label: 'Brakes', action: 'Brakes', values: ['As Required', 'CHECKED'] },
    { label: 'Crew', action: 'Crew', values: ['Alerted', 'BRIEFED'] },
    { label: 'Control Wheel', action: 'Control Wheel', values: ['Rapidly Forward', 'Pull Out Of Dive By Exerting Smooth, Steady Back Pressure'], ep: true },
    { label: 'A/P Trim Disconnect', action: 'A/P/Trim Disconnect (control wheel)', values: ['Depress Fully and Hold.'], ep: true },
    { label: 'Descend', action: 'Descend', values: ['As Required'], ep: true },
    { label: 'Evacuate Aircraft', action: 'Evacuate Aircraft', ep: true },
    { label: 'Land ASAP', action: 'Land as soon as possible.', ep: true },
    { label: 'Emer Shutdown Checklist', action: 'Emergency Shutdown Checklist', values: ['Execute'], ep: true },
    { label: 'Alt Prop Feather Checklist', action: 'Alternate Prop Feather Checklist', values: ['As Required'], ep: true },

    // The normal checklists' steps with nothing on the sheet to point at: a check of the whole
    // aircraft or crew, a control the sheet does not draw (the cabin door, the oxygen supply,
    // the control lock, the engine gauge panel's suction gauge), or a group too spread out to
    // box. `normal` keeps them off the EPs, which never name them; EPDrill shows them only on a
    // normal procedure's card.
    { label: 'Electrical Panel', action: 'Electrical Panel', values: ['SET'], normal: true },
    { label: 'Power Quadrant', action: 'Power Quadrant', values: ['SET'], normal: true },
    { label: 'Fuel Panel', action: 'Fuel Panel', values: ['CHECKED/SET'], normal: true },
    { label: 'Anti-Ice/Deice', action: 'Anti-Ice/Deice', also: ['Anti-Ice/Deice/Radar'],
      values: ['OFF', 'SET', 'CHECKED AS REQUIRED'], normal: true },
    { label: 'Cabin Door', action: 'Cabin Door', values: ['LOCKED'], normal: true },
    { label: 'Environmental Controls', action: 'Environmental Controls', values: ['SET'], normal: true },
    { label: 'Seatbelts', action: 'Seatbelts', values: ['FASTENED'], normal: true },
    { label: 'Controls', action: 'Controls', values: ['CHECKED'], normal: true },
    { label: 'Suction & Pneumatic', action: 'Suction & Pneumatic Pressure', values: ['CHECKED'], normal: true },
    { label: 'Flight Instruments', action: 'Flight Instruments', also: ['PFDs/FGP/ESIS'],
      values: ['CHECKED/SET', 'SET'], normal: true },
    { label: 'Minimums', action: 'Minimums', values: ['____ SET'], normal: true },
    { label: 'Instruments/Nacelles', action: 'Instruments/Nacelles', values: ['CHECKED'], normal: true },
    { label: 'Pressurization/Oxygen', action: 'Pressurization/Oxygen', values: ['CHECKED'], normal: true },
    { label: 'Oxygen', action: 'Oxygen', values: ['CLOSED'], normal: true },
    { label: 'Control Lock', action: 'Control Lock', values: ['INSTALLED'], normal: true },
    { label: 'Wheels', action: 'Wheels', values: ['CHOCKED'], normal: true },
    { label: 'Spin Recovery', action: 'Spin Recovery Procedures', values: ['Briefed per NATOPS'], normal: true },
    { label: 'Loose Gear', action: 'Loose gear', values: ['Stowed'], normal: true },
    { label: 'Altitude', action: 'Altitude', values: ['5000 feet AGL minimum'], normal: true },
    { label: 'Stall Speeds', action: 'Stall Speeds', values: ['Reviewed'], normal: true },
  ],
};

export const T44C_ALIASES = aliasesFrom(T44C_POSTER);

export const t44cRegion = (id) => T44C_POSTER.regions.find((r) => r.id === id);
