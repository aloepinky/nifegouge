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
  credit: 'Panel diagrams from the T-44C cockpit poster, NAVAIR, December 2021',
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
        { id: 'fire-ext-left', box: [0.243, 0.165, 0.029, 0.05], label: 'LH fire extinguisher',
          action: 'Fire Extinguisher', also: ['Fire Extinguisher(s)'], values: ['As Required'] },
        { id: 'fire-ext-right', box: [0.729, 0.165, 0.029, 0.05], label: 'RH fire extinguisher',
          action: 'Fire Extinguisher', also: ['Fire Extinguisher(s)'], values: ['As Required'] },

        // The step names this instrument: "Full Deflection Opposite Direction Of Turn Needle".
        { box: [0.490, 0.294, 0.056, 0.118], label: 'Turn needle',
          action: 'Rudder',
          values: ['Full Deflection Opposite Direction Of Turn Needle', 'Neutralize After Rotation Stops'] },
        // All three lights under one box. The step is to keep climbing until the visual warnings
        // cease, and these are the visual warnings.
        { id: 'terrain-warnings', box: [0.496, 0.252, 0.047, 0.032],
          label: 'Terrain warning lights',
          action: 'Continue Climb at Vx Until All Visual And Voice Warnings Cease',
          fills: 'Until All Visual And Voice Warnings Cease' },

        { box: [0.275, 0.826, 0.013, 0.025], label: 'Windshield anti-ice',
          action: 'Windshield Heat', values: ['As Required'] },
        // The knurled knob on the yellow housing that hangs below the bottom edge of the sub-panel,
        // which is where the PARKING BRAKE placard's leader arrow points — down and to the right of
        // the placard. The first cut of this box was on the placard and the arrow instead, which is
        // the label for the control rather than the control.
        { box: [0.361, 0.944, 0.027, 0.051], label: 'Parking brake',
          action: 'Stop the aircraft and set the parking brake.' },

        { box: [0.592, 0.759, 0.019, 0.126], label: 'Landing gear handle',
          action: 'Landing Gear', also: ['Landing gear', 'Gear'], values: ['UP', 'As Required'] },
        { box: [0.629, 0.767, 0.011, 0.030], label: 'Vent blower',
          action: 'Vent Blower', values: ['AUTO'] },
        { box: [0.716, 0.737, 0.028, 0.06], label: 'Cabin temperature mode',
          action: 'Cabin Temperature Mode', values: ['OFF'] },
        // Both BLEED AIR VALVE toggles under one box. They are about six painted pixels apart and
        // the step moves them together, so a target per switch would be two things nobody can hit
        // where one thing everybody can hit says the same.
        { box: [0.626, 0.839, 0.031, 0.036], label: 'Bleed air valves',
          action: 'Bleed air valve', values: ['Closed'] },
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
            'Max Continuous, Establish Positive Rate Of Climb (VXSE Minimum)'] },
        { box: [0.2894, 0.3657, 0.163, 0.12], label: 'Reverse',
          action: 'Reverse', values: ['As Required'] },
        { box: [0.4388, 0.05, 0.2082, 0.28], label: 'Prop levers',
          action: 'Prop Lever',
          // The last of these is a step phrased as a sentence rather than "control - setting", so
          // it reads as its own control until it is said here that it is this lever.
          also: ['Prop Lever (Failed Engine)', 'Prop', 'Props',
            'Attempt To Adjust Prop RPM to Normal Operating Range'],
          values: ['FEATHER', 'Full Forward', '1900 RPM'] },
        { box: [0.71, 0.07, 0.26, 0.26], label: 'Condition levers',
          action: 'Condition Lever',
          also: ['Condition Levers', 'Condition Lever (Failed Engine)'],
          values: ['FUEL CUTOFF', 'LOW IDLE', 'FUEL CUTOFF (Dec. Below 790°C)'] },
        { box: [0.65, 0.46, 0.17, 0.13], label: 'Flap handle',
          action: 'Flaps',
          values: ['UP', 'APPROACH (Unless Already UP)', 'Approach (Unless Already Up)',
            'As Required', 'Maintain Current Setting'] },
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
        { id: 'boost-left', box: [0.13, 0.33, 0.05, 0.09], label: 'Left boost pump',
          action: 'Boost Pumps', values: ['OFF'] },
        { id: 'boost-right', box: [0.812, 0.33, 0.05, 0.09], label: 'Right boost pump',
          action: 'Boost Pumps', values: ['OFF'] },
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
        { box: [0.16, 0.04, 0.15, 0.04], label: 'Ignition and engine start',
          action: 'Starter',
          values: ['Starter Only (For The Remainder Of The 40 Seconds)', 'Off (at 40 seconds)'] },
        { box: [0.16, 0.14, 0.15, 0.04], label: 'Engine auto ignition',
          action: 'Autoignition', values: ['ARMED'] },
        // NATOPS §20.4.1 calls this out by name: "MIC MASK/BOOM Selector Switch -- This two
        // position switch enables the appropriate crew member to select either the boom mike or
        // the oxygen mask position for transmitting." The step is "Oxygen masks/MIC switches (100
        // percent)", and this is the MIC switches half. The 100-percent half is the diluter-demand
        // regulator on the side console (§2.19.2), which the sheet does not draw — a named control
        // that is drawn gets a target even when its partner is missing.
        { id: 'mic-pilot', box: [0.359, 0.47, 0.028, 0.03], label: "Pilot's MIC MASK/BOOM",
          action: 'Oxygen Mask/MIC Switches (100 Percent)', values: ['As Required'] },
        { id: 'mic-copilot', box: [0.841, 0.47, 0.028, 0.03], label: "Copilot's MIC MASK/BOOM",
          action: 'Oxygen Mask/MIC Switches (100 Percent)', values: ['As Required'] },
        { box: [0.37, 0.23, 0.05, 0.04], label: 'Auxiliary battery',
          action: 'AUX BATT Switch', values: ['OFF'] },
        { box: [0.0855, 0.323, 0.3, 0.06], label: 'Master switch gang bar',
          action: 'Gang Bar', values: ['OFF'] },
        { box: [0.36, 0.9, 0.05, 0.04], label: 'Cabin pressurization dump',
          action: 'Pressurization', values: ['DUMP'] },
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
  actions: [
    { label: 'Announce "Abort"', action: 'Announce "Abort"' },
    { label: 'Brakes', action: 'Brakes', values: ['As Required'] },
    { label: 'Crew', action: 'Crew', values: ['Alerted'] },
    { label: 'Control Wheel', action: 'Control Wheel', values: ['Rapidly Forward', 'Pull Out Of Dive By Exerting Smooth, Steady Back Pressure'] },
    { label: 'A/P Trim Disconnect', action: 'A/P/Trim Disconnect (control wheel)', values: ['Depress Fully and Hold.'] },
    { label: 'Descend', action: 'Descend', values: ['As Required'] },
    { label: 'Evacuate Aircraft', action: 'Evacuate Aircraft' },
    { label: 'Land ASAP', action: 'Land as soon as possible.' },
    { label: 'Emer Shutdown Checklist', action: 'Emergency Shutdown Checklist', values: ['Execute'] },
    { label: 'Alt Prop Feather Checklist', action: 'Alternate Prop Feather Checklist', values: ['As Required'] },
  ],
};

export const T44C_ALIASES = aliasesFrom(T44C_POSTER);

export const t44cRegion = (id) => T44C_POSTER.regions.find((r) => r.id === id);
