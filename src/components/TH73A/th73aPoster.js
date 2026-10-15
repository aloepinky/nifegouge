import { aliasesFrom } from '../epsLimits/controlMatch';
import overheadSrc from './images/th73a-overhead.webp';
import panelSrc from './images/th73a-panel.webp';
import pedestalSrc from './images/th73a-pedestal.webp';
import cyclicSrc from './images/th73a-cyclic.webp';

// The TH-73A cockpit poster and its click targets, in the T-44C's shape (T44C/t44cPoster.js has
// the long account of how a record works). Every `box` is [left, top, width, height] as
// FRACTIONS of its own region image; tools/crop-posters.py cuts the regions from the Leonardo
// Training Academy poster (TH-73A Cockpit Poster Rev 1B).
//
// The images are imported from this directory rather than served from public/, because the
// TH-73A is unlisted and an import is only emitted by a build that uses it.
//
// Four regions, every one a whole sub-panel off the sheet: the overhead panel (with the rotor
// brake handle beside it), the instrument panel, the whole centre pedestal with the collective
// rising out of it, and the pilot's cyclic grip. Where the memory items name a control, the
// NATOPS (01-H73A-1) says which panel it is on: the GEN, BAT and IGN switches, CHIP BURN, the
// heater group and VENT CKPT on the overhead (§2.9, §2.19); the fresh air vent knob on the front
// console (§2.2, Figure 2.2-4, item 6; §2.19.1); the SERVO switch on the miscellaneous panel
// (§2.11); the start button, MAN/NOR switch, twist grip and the LDG LT / SRCH LT switches on the
// collective (§2.6, §2.20); the HOIST CUT (CABLE CUT) guarded switch and the HOIST control switch
// on the pilot's cyclic (§2.21, §7); the EMERG FREQ annunciator switch, which also sets the
// transponder to 7700 (§2.2); the ICS/TX switch on each audio control panel, one of the three
// PTTs (§14.2). The pilot flies from the right seat (§4.21), so Airspeed is the right PFD's tape
// and the engine page the right MFD.
//
// The rule for what is a target and what is a button: a step is a target wherever the control
// that does it is drawn, and a button only where nothing on the sheet does it. So "Reduce
// power." is the collective (power is the collective in a helicopter), "Level Wings." the
// cyclic, "Monitor engine parameters." the MFD engine page, and "Attempt to raise hoist." the
// HOIST switch on the cyclic. The buttons that remain are listed with their reasons at the foot.
//
// Every box was read off a 5% grid over the region image; none has been tuned on the page yet
// (`?spots=<region>` does that).

export const TH73A_POSTER = {
  regions: [
    {
      id: 'panel',
      label: 'Instrument Panel',
      src: panelSrc,
      alt: 'TH-73A instrument panel: the copilot\'s PFD and MFD on the left, the standby '
        + 'instrument and clock in the centre, the pilot\'s MFD and PFD on the right, with the '
        + 'MASTER CAUTION and MASTER WARNING lights and the EMERG FREQ switch at each end of '
        + 'the glareshield',
      spots: [
        // The pilot's PFD only: the airspeed tape down its left side.
        { box: [0.762, 0.245, 0.03, 0.26], label: 'Airspeed indicator',
          action: 'Airspeed',
          values: ['60-70 KIAS level flight', 'Adjust to reach a suitable landing site',
            'Reduce smoothly below 90 KIAS', 'Adjust, as required', 'Reduce below 80 KIAS'] },
        // The pilot's MFD, on the FULL ENGINE page the checklist sets it to (3710.30B, step 30):
        // the engine and transmission gauges a "monitor" step is read off, and where the chip
        // EPs' secondary indications (oil pressure and temperature, §12.5) are looked for. An
        // instrument the step is worked against, as the T-54A's engine strip is.
        { box: [0.56, 0.25, 0.17, 0.55], label: "Pilot's MFD, engine page",
          action: 'Monitor engine parameters.',
          actions: ['Monitor engine parameters.', 'Monitor transmission parameters.',
            'Check for secondary indications.'] },
        // The pilot's PFD's attitude display (the PFI area, Figure 2.14-3): regaining flight
        // parameters is flown against it.
        { box: [0.80, 0.27, 0.085, 0.2], label: 'Attitude indicator',
          action: 'Regain Desired Flight Parameters.' },
        // The slip indicator: the mechanical ball built into the bottom of each display bezel
        // (§2.14.1.2, item 4; §11.1.3.3 "the integral slip indicator"). Centring the ball and
        // slipping or skidding are read off it; the pedals button answers them too.
        { box: [0.815, 0.825, 0.035, 0.045], label: 'Slip indicator',
          action: 'Center Ball.',
          actions: ['Center Ball.', 'Slip or skid aircraft to eliminate smoke and fumes.'] },
        // The EMERG FREQ annunciator switch sets both radios to guard AND the transponder to
        // 7700 (§2.2.2.1, item 2). Drawn at each end of the glareshield; the pilot's is on the
        // right. Same `action`, different `id`.
        { id: 'emerg-freq-pilot', box: [0.94, 0.84, 0.035, 0.07], label: 'EMERG FREQ switch',
          action: 'Transponder', values: ['7700'] },
        { id: 'emerg-freq-copilot', box: [0.408, 0.085, 0.028, 0.07], label: 'EMERG FREQ switch',
          action: 'Transponder', values: ['7700'] },
      ],
    },
    {
      id: 'overhead',
      label: 'Overhead Panel',
      src: overheadSrc,
      alt: 'TH-73A overhead panel: the circuit breaker rows at the top, then the switch panel '
        + 'with CHIP BURN, the heater system and VENT CKPT switches, the auxiliary generator, '
        + 'IGN, and the BUS, GEN and BAT switches, with the red rotor brake handle to its right',
      spots: [
        { box: [0.23, 0.465, 0.055, 0.05], label: 'Chip burner switch',
          action: 'CHIP BURNER switch', values: ['Activate and release'] },
        { box: [0.565, 0.465, 0.06, 0.05], label: 'Hoist OFF/ON switch',
          action: 'HOIST OFF/ON control switch', values: ['OFF'] },
        // The HEATER SYSTEM, MIX and S/OFF switches and the AIR COND switch, as one group; the
        // step names the three systems together.
        { box: [0.18, 0.595, 0.185, 0.065], label: 'Heater and air conditioner switches',
          action: 'Air Conditioner/Vent/Heater switches', values: ['OFF'] },
        { box: [0.37, 0.595, 0.05, 0.065], label: 'Cockpit vent switch',
          action: 'VENT CKPT switch', values: ['ON'] },
        { box: [0.46, 0.665, 0.055, 0.06], label: 'Ignition switch',
          action: 'IGN switch', values: ['OFF'] },
        { box: [0.565, 0.67, 0.05, 0.05], label: 'Generator switch',
          action: 'GEN switch', values: ['OFF', 'ON'] },
        { box: [0.615, 0.67, 0.05, 0.05], label: 'Battery switch',
          action: 'BAT switch', values: ['OFF'] },
        { box: [0.745, 0.415, 0.095, 0.385], label: 'Rotor brake handle',
          action: 'Rotor brake', also: ['Rotor brake lever'], values: ['ON', 'Verify OFF'] },
      ],
    },
    {
      id: 'pedestal',
      label: 'Pedestal and Collective',
      src: pedestalSrc,
      alt: 'TH-73A centre pedestal: the two audio control panels, the flight director mode '
        + 'panel, the ELT and fresh air vent knob, the SERVO and AWG switches on the '
        + 'miscellaneous panel, the helipilot panel with SAS 1, SAS 2 and ATTD HOLD, the FUEL '
        + 'panel with PUMP 1, PUMP 2, XFER and the red FUEL VALVE switch, the CVRT panel, and the '
        + 'collective rising from the right with its head, START button, MAN/NOR switch and '
        + 'twist grip',
      spots: [
        // Both audio control panels, for their ICS/TX switch: one of the pilots' three PTTs
        // (§14.2.4), and the only one the sheet draws (the cyclic trigger is on the front of
        // the grip, out of view). A MAYDAY is a radio transmission, keyed here.
        { box: [0.05, 0.005, 0.5, 0.17], label: 'Audio control panels, ICS/TX',
          action: 'MAYDAY', values: ['Transmit'] },
        { box: [0.62, 0.17, 0.09, 0.05], label: 'Fresh air vent knob',
          action: 'Vent knob', values: ['Push', 'Pull'] },
        { box: [0.19, 0.283, 0.08, 0.04], label: 'Servo switch',
          action: 'Affected SERVO switch', values: ['OFF'] },
        // PUMP 1, PUMP 2, XFER PUMP and the FUEL VALVE together: the step secures the panel.
        { box: [0.125, 0.41, 0.31, 0.06], label: 'Fuel panel',
          action: 'Fuel Panel switches', values: ['OFF/CLOSED'] },
        // The LDG LT and SRCH LT switches on the collective head.
        { box: [0.595, 0.44, 0.2, 0.038], label: 'Landing and search light switches',
          action: 'Landing light/Search light', values: ['As required'] },
        { box: [0.6, 0.48, 0.06, 0.03], label: 'Start button',
          action: 'START push-button', also: ['STARTER pushbutton'],
          values: ['Press and release', 'Continue to operate until ITT decreases to normal range',
            'Press and hold until ITT decreases to normal range'] },
        { box: [0.685, 0.5, 0.085, 0.028], label: 'MAN/NOR switch',
          action: 'MAN/NOR selector', values: ['MAN'] },
        { box: [0.675, 0.53, 0.1, 0.075], label: 'Twist grip',
          action: 'Twist grip',
          values: ['OFF', 'IDLE', 'FLT', 'Reduce until NR/N2 are in normal range',
            'Slowly rotate toward MAX, as required', 'OFF prior to touchdown'] },
        // The collective lever. Power is the collective in a helicopter, so "Reduce power." is
        // here; so are entering autorotation (collective down) and stopping a climb or descent.
        { box: [0.6, 0.615, 0.3, 0.37], label: 'Collective',
          action: 'Collective',
          actions: ['Collective', 'Collective/Twist grip', 'Reduce power.', 'Autorotate.',
            'Stop any climb/descent.'],
          values: {
            Collective: ['Maintain initially then increase to cushion the touchdown',
              'Lower immediately to stop NR decay', 'Increase to reduce rate of descent',
              'Continue application to cushion touchdown', 'Lower to clear the stall',
              'Lower to maintain NR', 'Increase to cushion the landing', 'Lower to eliminate yaw'],
            'Collective/Twist grip': ['Coordinate'],
          } },
      ],
    },
    {
      id: 'cyclic',
      label: "Pilot's Cyclic",
      src: cyclicSrc,
      alt: "TH-73A pilot's cyclic grip: the trim hat, WIPER and HOIST switches, FD STBY, the "
        + 'guarded CARGO REL and HOIST CUT switches, HOOK LOAD, FTR and MASTER RESET',
      spots: [
        { box: [0.745, 0.088, 0.174, 0.214], label: 'HOIST CUT switch',
          action: 'HOIST CUT pushbutton',
          actions: ['HOIST CUT pushbutton', 'HOIST CUT pushbutton guard'],
          values: {
            'HOIST CUT pushbutton': ['Press'],
            'HOIST CUT pushbutton guard': ['Lift. Verify HOIST CUT ARMD CAS message appears'],
          } },
        // The HOIST control switch (UP/DN) on the pilot's cyclic (§7, hoist checks): raising,
        // paying out, and ceasing are all this switch.
        { box: [0.441, 0.06, 0.217, 0.121], label: 'HOIST control switch',
          action: 'Attempt to raise hoist.',
          actions: ['Attempt to raise hoist.', 'Pay out cable and attempt to free hang up.',
            'Cease hoisting.'] },
        // The grip. Attitude and airspeed are the cyclic in a helicopter, so the unusual
        // attitude recovery's wings, nose and airspeed steps are here, and so is handling it
        // gently (the hydraulic loss and lightning strike steps).
        { box: [0.065, 0.295, 0.651, 0.67], label: 'Cyclic',
          action: 'Cyclic',
          actions: ['Cyclic', 'Level Wings.', 'Level the Nose.', 'Control Airspeed.',
            'Avoid rapid movement of flight controls.', 'Maneuver smoothly.'],
          values: {
            Cyclic: ['Adjust to obtain skid level attitude', 'Forward to increase airspeed',
              'Adjust to desired airspeed', 'Flare to reduce forward speed',
              'Forward to obtain skid level attitude', 'Eliminate drift'],
          } },
      ],
    },
  ],

  // The steps nothing on the sheet performs. Each one is here for one of five reasons, and no
  // other reason is accepted:
  //
  //   not drawn      the control exists but the poster does not draw it. Only the pedals: the
  //                  sheet stops at the pedestal. Centring the ball and slipping or skidding
  //                  are the pedals too (and the slip indicator on the PFD answers them as well).
  //   cabin          equipment that is not on a panel: the doors and windows, the harness, the
  //                  ICS cords, the SEBD, the cockpit fire extinguisher (a stowed bottle, §7).
  //   spoken         said, not switched: one button for alerting the crew and passengers and
  //                  for the aircrewman notifying the pilot.
  //   decided        a judgment with no one control: the two landing criteria (§12.1.1, a
  //                  button each, since which one applies is what several EPs test), which
  //                  electrical equipment is unnecessary, whether a fire is confirmed (looked
  //                  at, not switched), establishing VMC, and the egress actions a body does
  //                  (one Evacuate button for leaving the helicopter, on land or under water).
  //                  Checking a chip's secondary indications is the MFD engine page.
  //   cross-ref      a step that names another procedure to go and do. Flagged `xref`, and the
  //                  page draws them in the right column under the pedestal, apart from the
  //                  rest.
  //
  // Order: the buttons a step names most often come first, and the cross-references in their
  // own run, sorted the same way; a tie keeps the order the steps first appear in. The count beside each is the number of memory steps it answers (tools/check-posters.js
  // pairs them; the counts here were read off that pairing on 2026-10-15).
  actions: [
    // 18
    { label: 'Land ASAP', action: 'Land as soon as possible.' },
    // 7: not drawn
    { label: 'Pedals', action: 'Pedals',
      actions: ['Pedals', 'Center Ball.', 'Slip or skid aircraft to eliminate smoke and fumes.'],
      values: { Pedals: ['Control yaw rate', 'Maintain direction'] } },
    // 5
    { label: 'Land immediately', action: 'Land immediately.' },
    // 4: cabin
    { label: 'Doors / Windows', action: 'Doors/Windows', also: ['Doors'],
      values: ['Close', 'Open', 'Open/Jettison, as required', 'Open/Jettison'] },
    // 2
    { label: 'Evacuate', action: 'Helicopter',
      actions: ['Helicopter', 'Exit helicopter.'],
      values: { Helicopter: ['Egress'] } },
    // 2: spoken
    { label: 'Alert crew', action: 'Crew and passengers',
      actions: ['Crew and passengers', 'Notify Pilot.'],
      values: { 'Crew and passengers': ['Alert'] } },
    // 1 each, in order of first appearance
    { label: 'Establish VMC', action: 'Establish VMC.' },
    { label: 'Confirm fire', action: 'Confirm fire.' },
    { label: 'Unnecessary electrical equipment', action: 'Unnecessary electrical equipment', values: ['Secure'] },
    { label: 'Fire extinguisher', action: 'Fire extinguisher', values: ['As required'] },
    { label: 'SEBD', action: 'SEBD', values: ['Don, as required'] },
    { label: 'Communication cords', action: 'Communication cords', values: ['Disconnect'] },
    { label: 'Place hand on reference', action: 'Place hand on known reference point.' },
    { label: 'Harness', action: 'Harness', values: ['Release'] },
    { label: 'Swim clear', action: 'Swim clear and inflate LPU.' },
    // cross-ref: 6, 3, 2, then 1 each
    { label: 'Emergency Shutdown', action: 'Emergency Shutdown', values: ['Complete'], xref: true },
    { label: 'Autorotative Landing', action: 'Autorotative Landing', values: ['Complete'], xref: true },
    { label: 'Transmission Malfunction EP', action: 'Transmission Malfunction emergency procedure', values: ['Perform'], xref: true },
    { label: 'Engine Restart in Flight', action: 'Engine Restart in Flight', values: ['As required'], xref: true },
    { label: 'Underwater egress', action: 'Underwater egress', values: ['Execute'], xref: true },
  ],
};

export const TH73A_ALIASES = aliasesFrom(TH73A_POSTER);

export const th73aRegion = (id) => TH73A_POSTER.regions.find((r) => r.id === id);
