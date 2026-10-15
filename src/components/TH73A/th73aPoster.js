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
// NATOPS (01-H73A-1, Ch. 2) says which panel it is on: the GEN, BAT and IGN switches, CHIP BURN,
// the heater group and VENT CKPT on the overhead (§2.9, §2.19); the fresh air vent knob on the
// front console (§2.2, Figure 2.2-4, item 6; §2.19.1); the SERVO switch on the miscellaneous
// panel (§2.11); the start button, MAN/NOR switch, twist grip and the LDG LT / SRCH LT switches
// on the collective (§2.6, §2.20); the HOIST CUT (CABLE CUT) guarded switch on the pilot's
// cyclic (§2.21). The pilot flies from the right seat (§4.21), so Airspeed is the right PFD's
// tape.
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
        + 'MASTER CAUTION and MASTER WARNING lights at each end of the glareshield',
      spots: [
        // The pilot's PFD only: the airspeed tape down its left side.
        { box: [0.762, 0.245, 0.03, 0.26], label: 'Airspeed indicator',
          action: 'Airspeed',
          values: ['60-70 KIAS level flight', 'Adjust to reach a suitable landing site',
            'Reduce smoothly below 90 KIAS', 'Adjust, as required', 'Reduce below 80 KIAS'] },
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
      alt: 'TH-73A centre pedestal: the two audio panels, the flight director mode panel, the '
        + 'ELT and fresh air vent knob, the SERVO and AWG switches on the miscellaneous panel, '
        + 'the helipilot panel with SAS 1, SAS 2 and ATTD HOLD, the FUEL panel with PUMP 1, '
        + 'PUMP 2, XFER and the red FUEL VALVE switch, the CVRT panel, and the collective rising '
        + 'from the right with its head, START button, MAN/NOR switch and twist grip',
      spots: [
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
        { box: [0.6, 0.615, 0.3, 0.37], label: 'Collective',
          action: 'Collective',
          actions: ['Collective', 'Collective/Twist grip'],
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
        { box: [0.67, 0.185, 0.12, 0.15], label: 'HOIST CUT switch',
          action: 'HOIST CUT pushbutton',
          actions: ['HOIST CUT pushbutton', 'HOIST CUT pushbutton guard'],
          values: {
            'HOIST CUT pushbutton': ['Press'],
            'HOIST CUT pushbutton guard': ['Lift. Verify HOIST CUT ARMD CAS message appears'],
          } },
        { box: [0.19, 0.17, 0.47, 0.63], label: 'Cyclic',
          action: 'Cyclic',
          values: ['Adjust to obtain skid level attitude', 'Forward to increase airspeed',
            'Adjust to desired airspeed', 'Flare to reduce forward speed',
            'Forward to obtain skid level attitude', 'Eliminate drift'] },
      ],
    },
  ],

  // The steps with nothing on the poster to point at.
  //
  //   Pedals                                 on the floor, which the poster does not draw.
  //   Doors/Windows, Fire extinguisher, SEBD, Communication cords, Harness
  //                                          cabin equipment, not on a panel.
  //   Transponder                            set through the PFD menus, not a control head.
  //   Unnecessary electrical equipment       no one switch.
  //   MAYDAY, Crew and passengers, Notify Pilot, Land, Reduce power, Monitor, Check, Confirm,
  //   Autorotate, Establish VMC, Maneuver, Level, Center, Stop, Control, Regain, Slip or skid,
  //   Cease hoisting, Pay out cable, Attempt to raise hoist, Exit, Swim clear, Place hand
  //                                          spoken, flown or decided, not actuated.
  //   Complete / Perform / Execute           cross-references to another procedure.
  actions: [
    { label: 'Pedals', action: 'Pedals', values: ['Control yaw rate', 'Maintain direction'] },
    { label: 'Doors / Windows', action: 'Doors/Windows', also: ['Doors'],
      values: ['Close', 'Open', 'Open/Jettison, as required', 'Open/Jettison'] },
    { label: 'Transponder', action: 'Transponder', values: ['7700'] },
    { label: 'MAYDAY', action: 'MAYDAY', values: ['Transmit'] },
    { label: 'Fire extinguisher', action: 'Fire extinguisher', values: ['As required'] },
    { label: 'Electrical equipment', action: 'Unnecessary electrical equipment', values: ['Secure'] },
    { label: 'Crew and passengers', action: 'Crew and passengers', values: ['Alert'] },
    { label: 'Helicopter', action: 'Helicopter', values: ['Egress'] },
    { label: 'SEBD', action: 'SEBD', values: ['Don, as required'] },
    { label: 'Communication cords', action: 'Communication cords', values: ['Disconnect'] },
    { label: 'Harness', action: 'Harness', values: ['Release'] },
    { label: 'Land immediately', action: 'Land immediately.' },
    { label: 'Land as soon as possible', action: 'Land as soon as possible.' },
    { label: 'Reduce power', action: 'Reduce power.' },
    { label: 'Monitor engine', action: 'Monitor engine parameters.' },
    { label: 'Monitor transmission', action: 'Monitor transmission parameters.' },
    { label: 'Secondary indications', action: 'Check for secondary indications.' },
    { label: 'Confirm fire', action: 'Confirm fire.' },
    { label: 'Autorotate', action: 'Autorotate.' },
    { label: 'Establish VMC', action: 'Establish VMC.' },
    { label: 'Avoid rapid movement', action: 'Avoid rapid movement of flight controls.' },
    { label: 'Slip or skid', action: 'Slip or skid aircraft to eliminate smoke and fumes.' },
    { label: 'Maneuver smoothly', action: 'Maneuver smoothly.' },
    { label: 'Level wings', action: 'Level Wings.' },
    { label: 'Level nose', action: 'Level the Nose.' },
    { label: 'Center ball', action: 'Center Ball.' },
    { label: 'Stop climb/descent', action: 'Stop any climb/descent.' },
    { label: 'Control airspeed', action: 'Control Airspeed.' },
    { label: 'Regain parameters', action: 'Regain Desired Flight Parameters.' },
    { label: 'Place hand', action: 'Place hand on known reference point.' },
    { label: 'Exit helicopter', action: 'Exit helicopter.' },
    { label: 'Swim clear', action: 'Swim clear and inflate LPU.' },
    { label: 'Notify pilot', action: 'Notify Pilot.' },
    { label: 'Raise hoist', action: 'Attempt to raise hoist.' },
    { label: 'Cease hoisting', action: 'Cease hoisting.' },
    { label: 'Pay out cable', action: 'Pay out cable and attempt to free hang up.' },
    { label: 'Autorotative Landing', action: 'Autorotative Landing', values: ['Complete'] },
    { label: 'Engine Restart in Flight', action: 'Engine Restart in Flight', values: ['As required'] },
    { label: 'Emergency Shutdown', action: 'Emergency Shutdown', values: ['Complete'] },
    { label: 'Transmission Malfunction EP', action: 'Transmission Malfunction emergency procedure', values: ['Perform'] },
    { label: 'Underwater egress', action: 'Underwater egress', values: ['Execute'] },
  ],
};

export const TH73A_ALIASES = aliasesFrom(TH73A_POSTER);

export const th73aRegion = (id) => TH73A_POSTER.regions.find((r) => r.id === id);
