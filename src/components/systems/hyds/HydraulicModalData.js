// ─────────────────────────────────────────────────────────────────────────────
//  FAM4202  —  Hydraulic System Modal Content + InfoModal Component
//  Sources: Briefing_Outlines.pdf, T6BDriver.com Hydraulic System Slideshow
//  Keep all modal text and the shared InfoModal component here.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { THEME, DIAGRAM_FONT } from '../diagramTheme';

const FONT = DIAGRAM_FONT;
const MC = {
  bg:     THEME.bg,
  stroke: THEME.stroke,
  text:   THEME.text,
  muted:  THEME.muted,
};

// ─────────────────────────────────────────────────────────────────────────────
//  BRIEFING TAB DATA
// ─────────────────────────────────────────────────────────────────────────────

export const HYD_VERBATIM = {
  heading: 'Hydraulic System NATOPS Intro (helpful to memorize)',
  quote: `"The hydraulic system consists of one engine driven pump with approximately a 5 quart capacity. The system incorporates a pressure relief valve (3250 to 3500 psi) in the main and emergency systems to prevent damage from high system pressure."`,
};

export const HYD_NUMBERS = {
  heading: 'Hydraulic System Numbers',
  items: [
  {
    value: '3000 ± 120 psi',
    label: 'Normal operating pressure — main and emergency systems',
    highlight: false,
  },
  {
    value: '2880 – 3120 psi',
    label: 'HYD PRESS gauge — green (normal) arc',
    highlight: false,
  },
  {
    value: '1800 – 2880 psi, 3120-3500',
    label: 'HYD PRESS gauge — white (scale) arc',
    highlight: false,
  },
  {
    value: '< 1800  /  > 3500 psi',
    label: 'HYD PX out-of-limits (CHK ENG). HYD PRESS gauge — yellow (caution) arc',
    highlight: true,
  },
  {
    value: '5 qt  /  1 qt',
    label: 'Total system capacity  /  HYD FL LO caution threshold',
    highlight: true,
  },
  {
    value: '2400 ± 150 psi',
    label: 'EHYD PX LO caution threshold (accumulator)',
    highlight: true,
  },
  {
    value: '3250 – 3500 psi',
    label: 'Pressure relief valve activation range',
    highlight: false,
  },
  {
    value: '0.25 GPM  /  0.5 qt',
    label: 'Emergency hydraulic fuse limit  /  max fluid loss allowed by fuse',
    highlight: false,
  },
  {
    value: '600 fpm  (3.7 G)  —  185 ± 5 psi tire',
    label: 'Normal landing limit at normal tire pressure',
    highlight: false,
  },
  {
    value: '780 fpm  (5.1 G)  —  225 ± 5 psi tire',
    label: 'Maximum landing limit at max tire pressure',
    highlight: false,
  },
  ],
};

export const HYD_EICAS = {
  heading: 'Hydraulic System EICAS Messages',
  items: [
    {
      label: 'HYD FL LO',
      color: 'caution',
      cause: 'Fluid level in reservoir below 1 quart. Note: with HYD FL LO and pressure still above 1800 psi, sufficient fluid remains to lower gear and flaps with the main system. HYD FL LO caution and associated pressure display are NOT available if the Hydraulic System circuit breaker is open.',
      response: 'Execute HYDRAULIC SYSTEM MALFUNCTIONS.',
    },
    {
      label: 'EHYD PX LO',
      color: 'caution',
      cause: 'Accumulator pressure drops below 2400 ± 150 psi. Will normally illuminate after emergency gear extension when flaps are subsequently selected. If EHYD PX LO appears together with HYD FL LO, this indicates a leak AND the fuse failed to close — main system fluid may be depleting. EHYD PX LO remains available even if the Hydraulic System circuit breaker is open.',
      response: 'Execute HYDRAULIC SYSTEM MALFUNCTIONS.',
    },
    {
      label: 'CHK ENG',
      color: 'caution',
      cause: 'HYD pressure below 1800 psi or above 3500 psi. Below 1800 psi the system should be considered unusable.',
      response: 'Monitor HYD PX gauge. Execute HYDRAULIC SYSTEM MALFUNCTIONS.',
    },
    {
      label: 'NWS ON',
      color: 'advisory',
      cause: 'Nose wheel steering selector valve is engaged — rudder pedals are connected to the nose wheel.',
      response: 'Advisory only. Do not execute minimum-radius differential braking turns with NWS on.',
    },
    {
      label: 'SPDBRK OUT',
      color: 'advisory',
      cause: 'Speed brake is deployed (70° extension from stowed position).',
      response: 'Advisory only. Speed brake retracts automatically when flaps are moved out of UP or PCL is moved to MAX.',
    },
  ],
};

export const HYD_EPS = {
  heading: 'Hydraulic System Emergency Procedures',
  items: [
    {
      title: 'HYDRAULIC SYSTEM MALFUNCTIONS',
      memory: false,
      indications: [
        'HYD FL LO or EHYD PX LO caution.',
        'Loss of hydraulic pressure without either caution — may indicate pump failure.',
        'HYD FL LO with 0 psi — check and reset HYD SYS circuit breaker on battery bus panel.',
      ],
      procedure: [
        'Check hydraulic pressure, slow to ≤150 KIAS.',
        'Lower gear (emergency extension if pressure below 1800 psi), extend flaps as required.',
        'Land as soon as practical.',
      ],
      nwcs: [
        'EHYD PX LO + HYD FL LO together suggests a leak where the fuse failed to close — lower gear before fluid is fully depleted.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'LANDING GEAR MALFUNCTION',
      memory: false,
      indications: [
        'Gear does not indicate fully UP with handle UP, or fully DOWN with handle DOWN.',
        'Execute anytime gear indications are abnormal.',
      ],
      procedure: [
        'Stay below 150 KIAS.',
        'Attempt to lower gear normally; check hydraulic pressure, lamp test, and circuit breakers.',
        'Cycle handle and perform maneuvers to shake gear down.',
        'Get an external visual confirmation if possible.',
        'If conditions resolve → Emergency Extension. If unsafe conditions remain → Landing with Unsafe Gear Indications.',
      ],
      nwcs: [
        'Safe gear-down indications: 3 green lights across both cockpits, AOA indexer illuminated, and/or landing/taxi lights on.',
        'If main gear shows down and locked with inboard doors closed (no red lights), nose gear may be assumed down and locked.',
        'A tripped LDGGR CONT CB causes loss of all position/handle lights and makes WOW switches revert to in-air mode on rollout — loss of ground idle RPM and NWS.',
      ],
      landing: 'Land as soon as PRACTICAL once any safe gear indication is obtained.',
    },
    {
      title: 'LANDING GEAR EMERGENCY EXTENSION',
      memory: false,
      indications: [
        'Directed from Hydraulic System Malfunctions (pressure below 1800 psi).',
        'Directed from Landing Gear Malfunction (unable to reset LDGGR CONT CB, or unsafe conditions remain after cycling).',
      ],
      procedure: [
        'Slow to ≤150 KIAS, lower gear handle.',
        'Pull the EMER LDG GR handle.',
        'Check gear lights, then extend flaps as required.',
        'If indications are still unsafe → Landing with Unsafe Gear Indications.',
      ],
      nwcs: [
        'Normal safe indications after emergency extension: 2 green main gear, 2 red main gear doors, 1 green nose gear, red light in gear handle.',
        'Once pulled, gear and flap retraction is NOT possible — maintenance reset required.',
        'EHYD PX LO is expected after flap selection.',
        'Do not land or taxi across raised arresting cables with main gear doors open.',
      ],
      landing: 'Land as soon as PRACTICAL. If indications remain unsafe, execute Landing with Unsafe Gear Indications.',
    },
    {
      title: 'LANDING WITH UNSAFE GEAR INDICATIONS',
      memory: false,
      indications: [
        'Directed from Landing Gear Malfunction or Emergency Extension when safe gear-down indications cannot be obtained.',
        'Treat any gear not fully extended as retracted.',
      ],
      procedure: [
        'Raise gear if able, reduce fuel, configure flaps, lock harnesses.',
        'Execute the landing technique appropriate for your gear configuration.',
        'PCL off and firewall shutoff pulled when landing is assured.',
        'Emergency ground egress as required after stopping.',
      ],
      nwcs: [
        'Gear-UP landing preferred if any gear is confirmed unsafe — flat, power-on, straight-in approach.',
        'Nose gear only down: consider controlled ejection.',
        'Main gear only: hold nose off as long as possible; avoid heavy braking — risk of forward fuselage damage.',
        'One main gear: touch down on the extended-gear side; hold opposite wing up as long as possible.',
        'Forceful nose contact may render CFS inoperative or make the canopy impossible to open.',
      ],
      landing: 'Land as soon as POSSIBLE. Gear-UP landing preferred if any gear is confirmed unsafe. Technique varies by configuration — refer to PCL.',
    },
    {
      title: 'LANDING WITH COCKED NOSE WHEEL',
      memory: false,
      indications: [
        'Nose wheel not aligned with aircraft centerline — confirmed by chase aircraft or tower.',
        'A cocked nose wheel typically straightens on runway contact, but be ready to act if directional control becomes difficult.',
      ],
      procedure: [
        'Stay ≤150 KIAS, do not retract gear.',
        'Confirm deflection with chase or tower.',
        'Straight-in approach; hold nose off runway as long as possible; use rudder and differential braking to track straight.',
        'If directional control is good and NWS works — taxi in. Otherwise stop and tow.',
      ],
      nwcs: [
        'If deflection is greater than 45°, consider diverting to a wider runway if fuel permits.',
      ],
      landing: 'Land as soon as PRACTICAL. Hold nose off runway as long as possible. Stop and tow if directional control cannot be maintained.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT CLICK INFO
// ─────────────────────────────────────────────────────────────────────────────

export const HYD_INFO = {

  edp: {
    title: 'Engine Driven Pump',
    items: [
      'Located in the engine accessory section — small but powerful pump.',
      'Pressurizes the system to 3000 ± 120 psi.',
      'Registers pressure on the EICAS gauge before the prop moves on start, and after the prop stops turning on shutdown — useful for pre-flight checks.',
      'Single pump — there is no electric backup.',
      'Downstream check valve prevents backflow of fluid into the pump.',
    ],
    photos: [
      { src: '/systems/hyds/hydpump.png', caption: 'Engine driven hydraulic pump' },
    ],
  },

  reservoir: {
    title: 'Hydraulic Reservoir',
    items: [
      'Holds 5 quarts of hydraulic fluid and supplies it to the pump.',
      'Contains a pressure reducer piston that steps line pressure from 3000 psi down to ~50 psi inside the reservoir.',
      'Ports excess pressure overboard through the overboard relief valve.',
      'HYD FL LO caution when fluid drops below 1 quart.',
      'If HYD FL LO is present but pressure is still above 1800 psi, sufficient fluid remains to lower gear and flaps with the main system.',
      'Fluid quantity is read by a green indicator rod in the hydraulic service bay behind the right wing — the rod must be in the correct green band depending on whether the accumulator is charged or discharged.',
    ],
    photos: [
      { src: '/systems/hyds/hydcompartment.png', caption: 'Hydraulic service compartment' },
    ],
  },

  fwsov: {
    title: 'Firewall Shutoff Valve',
    items: [
      'Controlled by the Firewall Shutoff Handle in the front cockpit only.',
      'Handle lifts vertically and is held down by a pliable clip.',
      'Cuts off hydraulic fluid from flowing aft of the firewall — used during fire or major hydraulic emergency.',
      'Valve is located in the right side maintenance access bay.',
      'Cable-actuated — no electrical dependency.',
    ],
    photos: [
      { src: '/systems/hyds/fwsh.png', caption: 'Firewall shutoff handle' },
      { src: '/systems/hyds/fwshclose.png', caption: 'Firewall shutoff handle (close-up)' },
    ],
  },

  overboard: {
    title: 'Overboard Relief Valve',
    items: [
      'Protects the reservoir from over-pressurization.',
      'Vents excess pressure overboard if the reservoir pressure reducer piston is unable to further absorb the pressure.',
      'Passive valve — no cockpit control.',
    ],
  },

  returnfilter: {
    title: 'Return Line Filter',
    items: [
      'Filters fluid returning from actuators before it re-enters the reservoir.',
      'Protects the reservoir and pump from downstream contamination.',
    ],
  },

  cvalve: {
    title: 'Check Valve',
    items: [
      'Prevents backflow of fluid from the airframe side into the engine driven pump.',
      'Allows one-directional flow only — pump to system.',
    ],
  },

  filter: {
    title: 'Hydraulic Filter',
    items: [
      'Filters the pressurized supply line after the check valve.',
      'Located on the airframe (cockpit) side of the firewall.',
    ],
  },

  pxtx: {
    title: 'Pressure Transmitter',
    items: [
      'Measures hydraulic pressure after the filter.',
      'Sends signal to the Engine Data Manager (EDM), which displays it on the EICAS HYD PRESS gauge.',
      'Triggers a CHK ENG caution when pressure falls below 1800 psi — at this point the system should be considered unusable.',
      'EICAS pressure display and HYD FL LO caution are NOT available if the Hydraulic System circuit breaker (on battery bus panel, front cockpit left side) is pulled.',
      'EHYD PX LO remains available even with the circuit breaker open.',
    ],
  },

  relief: {
    title: '3500 psi System Relief Valve',
    items: [
      'Prevents over-pressurization from damaging the main hydraulic system.',
      'Activates at 3250–3500 psi.',
      'Directs excess pressure to the reservoir reduction piston; ports overboard through the overboard relief valve if the piston cannot absorb it.',
      'Passive valve — no cockpit control.',
    ],
  },

  slide: {
    title: 'Slide Valve Assembly',
    items: [
      'Isolates the main hydraulic system from the emergency system when the EMER LDG GR handle is pulled.',
      'Prevents main-system pressure from interfering with emergency system operation.',
      'Can ONLY be reset by maintenance on the ground — once activated in flight it cannot be undone.',
    ],
  },

  nws: {
    title: 'Nose Wheel Steering (NWS)',
    items: [
      'Tapped from the supply line after the check valve but before the Power Package — always pressurized when the engine is running.',
      'Activated by the NWS button on the stick; engages the NWS selector valve and illuminates the NWS ON advisory on CAS.',
      'Connects rudder pedals to the nose wheel — allows ±12° of left/right nose wheel deflection.',
      'Actuator assembly has an internal centering mechanism that also helps prevent nose wheel shimmy.',
      'A friction collar on the nose gear strut provides additional shimmy damping.',
      'NWS has NO emergency backup — it is main-system powered only.',
      'GROUND STEERING: NWS is the primary method (ramp speeds only, large turn radius around wing tip). Differential braking is secondary (80° free castor, must manually center nose wheel — no auto-centering). Do not use NWS on full-deflection brake turns.',
    ],
  },

    ldggear: {
    title: 'Main Landing Gear Actuators',
    items: [
      'One hydraulic actuator per main gear — moves the gear by pulling/pushing the side brace.',
      'Normal extend/retract cycle: 6 seconds. Inboard doors are the first and last thing to move in every cycle.',
      'Mechanically held UP: a tang on the bottom of the strut is captured by a mechanical uplock when the inboard doors close — releases automatically when the doors open.',
      'Hydraulically held DOWN: the actuator activates an internal downlock, keeping pressure in the cylinder to lock the gear in place.',
      'Limitations: VLE 150 kts, +2.5/-0.0 G symmetric, +2.0/-0.0 G asymmetric.',
      'Landing limits: 600 fpm (3.7 G) at 185 ± 5 psi tire pressure / 780 fpm (5.1 G) at 225 ± 5 psi.',
      'Gear handle power: LDG GR CONT circuit breaker on battery bus panel.',
      'Right WOW switch engages a downlock pin to prevent handle movement on the ground.',
      'Green gear lights = that gear is down and locked. Red main gear lights = inboard door not up and locked.',
    ],
    photos: [
      { src: '/systems/hyds/gearparts.png', caption: 'Main landing gear components' },
      { src: '/systems/hyds/gearparts2.png', caption: 'Main landing gear components' },
      { src: '/systems/hyds/gearparts3.png', caption: 'Main landing gear components' },
      { src: '/systems/hyds/gearparts4.png', caption: 'Main landing gear components' },
      { src: '/systems/hyds/fewgearparts.png', caption: 'Main landing gear components' },
    ],
  },

  nosegear: {
    title: 'Nose Gear Actuator',
    items: [
      'Hydraulically actuated — the nose leg actuator moves the folding strut to extend or retract the nose gear.',
      'Hydraulically held UP: the actuator activates an internal uplock, keeping pressure in the cylinder.',
      'Mechanically held DOWN: the spring strut forces the folding strut over-center on extension, providing a positive mechanical lock.',
      'Nose gear doors are operated mechanically by the strut as it moves — there is no separate hydraulic door actuator.',
      'Shares the same gear selector valve circuit as the main gear actuators.',
      'Red nose gear light = gear in transit (not down and locked).',
    ],
    photos: [
      { src: '/systems/hyds/nosegearparts.png', caption: 'Nose gear parts' },
      { src: '/systems/hyds/nosegearparts2.png', caption: 'Nose gear parts' },
      { src: '/systems/hyds/smallnosegear.png', caption: 'Nose gear close-up' },
      { src: '/systems/hyds/nosegearhyds.png', caption: 'Nose gear hydraulic components' },
    ],
  },

  geardoor: {
    title: 'Landing Gear Door Selector Valve',
    items: [
      'Separate electrically-actuated selector valve — sequences the inboard doors independently of gear position.',
      'Inboard doors open first and close last in every normal gear cycle.',
      'Outboard main gear doors are mechanically linked to the main strut via a rod — no hydraulic actuator.',
      'Nose gear doors are mechanically operated by the nose gear strut as it retracts into position — no separate actuator.',
      'After emergency gear extension, inboard doors remain open and cannot be retracted — no hydraulic pressure available to close them.',
    ],
    photos: [
      { src: '/systems/hyds/widedoor.png', caption: 'Inboard gear door (wide view)' },
      { src: '/systems/hyds/smalldoor.png', caption: 'Inboard gear door' },
    ],
  },

  spdbrk: {
    title: 'Speed Brake',
    items: [
      'Single ventral plate located on the belly of the aircraft between the flaps.',
      'Actuator pushes plate 70° into the windstream from the stowed position.',
      'Internal hydraulic uplock keeps the speed brake retracted when hydraulic pressure is lost — if airborne with SB out and hydraulics fail, SB should blow up and lock retracted.',
      'No speed restriction for use.',
      'Automatically retracts when: flaps are moved out of UP position, or PCL is moved to MAX.',
      'Pitch compensation: linked to the elevator trim tab to counteract (but not fully eliminate) pitch change tendency when extended.',
      'SPDBRK OUT advisory illuminates on CAS when deployed.',
      'Three-position, guarded switch on the PCL — spring-loaded to center. Switch forward = retract; switch aft = extend.',
      'NO emergency backup — speed brake is main-system powered only.',
    ],
    photos: [
      { src: '/systems/hyds/speedbrake.png', caption: 'Speed brake' },
    ],
  },

  flaps: {
    title: 'Flaps',
    items: [
      'Split flaps — flaps split away from the wing form; position cannot be seen from the cockpit.',
      'Two flap panels on each side (four total).',
      'TO position: 23° deflection — good lift.',
      'LDG position: 50° deflection — good drag.',
      'TO and LDG positions have separate selector valves in the manifold.',
      'When a position is selected, the respective selector valve directs hydraulic pressure to the actuator, which pushes the flap actuator strut, rotates the torque tube, and moves the flap segments.',
      'Flap position indicator in each cockpit — pointer moves to intermediate position between marks during extension/retraction.',
      'Power (normal): FLAP CONT circuit breaker on battery bus panel.',
      'Power (emergency): EMER FLAP circuit breaker on hot battery bus panel — automatically switched when EMER LDG GR handle is pulled.',
      'Limitations: VFE 150 kts, +2.5/-0.0 G symmetric, +2.0/-0.0 G asymmetric.',
    ],
    photos: [
      { src: '/systems/hyds/flaps.png', caption: 'Flap system' },
    ],
  },

  accum: {
    title: 'Emergency Accumulator',
    items: [
      'Stores hydraulic pressure for one-time emergency use.',
      'Helium pre-charge of approximately 3000 psi on one side of the accumulator diaphragm pushes pressure against the stored fluid.',
      'Continuously charged by the main hydraulic system whenever pressure is available — excess fluid from charging returns to the reservoir.',
      'EHYD PX LO caution if accumulator pressure drops below 2400 ± 150 psi.',
      'Operates independently of the engine — accumulator pressure is available after flameout.',
      'Manual Pressure Release Handle in the hydraulic service bay allows ground discharge for accurate fluid quantity measurement — fluid returns to reservoir.',
    ],
  },

  fuse: {
    title: 'Hydraulic Fuse',
    items: [
      'Limits fluid loss in the emergency system circuit.',
      'Fluid flow to the emergency system is limited to 0.25 GPM.',
      'If flow exceeds 0.25 GPM (indicating a leak downstream), the fuse closes to isolate the emergency circuit — maximum fluid loss is 0.5 quarts.',
      'A check valve downstream of the fuse prevents backflow through it.',
      'Non-resettable in flight — maintenance action required on the ground.',
      'If EHYD PX LO and HYD FL LO are both present, this indicates a leak AND the fuse failed to close, potentially depleting main system fluid.',
    ],
  },

  ecvalve: {
    title: 'Emergency Check Valve',
    items: [
      'Prevents backflow from the emergency system circuit back into the main supply line.',
      'Ensures one-directional flow — main system charges the accumulator but cannot be back-fed by it.',
    ],
  },

  emerldggr: {
    title: 'LDG Gear Emergency Extension Selector Valve',
    items: [
      'Opened by pulling the EMER LDG GR handle (located above the landing gear control unit and flap gauge).',
      'To operate: push the silver button in the center of the handle, then pull — handle extends approximately ¾ inch.',
      'Releases emergency accumulator pressure and ports it to: the slide valve assembly (isolating the main system), the landing gear actuators, and the inboard gear door actuators.',
      'Inboard gear doors open and all three gears extend regardless of landing gear handle position.',
      'Inboard gear doors REMAIN extended — they cannot be retracted after emergency extension.',
      'Expected indications after actuation: 3 green (gear down) and 3 red (inboard doors extended).',
      'Remaining pressure is ported to the flap emergency extension solenoid.',
      'System can only be reset by maintenance on the ground.',
    ],
  },

  emerflaps: {
    title: 'Flap Emergency Extension Solenoid',
    items: [
      'Electrically actuated solenoid — powered through the EMER FLAP circuit breaker on the hot battery bus when the EMER LDG GR handle is pulled.',
      'Allows selection of TO or LDG flaps using the normal flap selector — extension is NOT automatic like the landing gear.',
      'Do not select flaps until after the landing gear is confirmed down.',
      'Flaps cannot be raised after emergency extension.',
      'EHYD PX LO will normally illuminate after emergency gear extension when flaps are subsequently selected.',
    ],
  },

  erelief: {
    title: 'Emergency 3500 PSI Pressure Relief Valve',
    items: [
      'Protects the emergency system (accumulator side) from over-pressurization.',
      'Opens at 3250–3500 psi to vent excess pressure back to the reservoir.',
      'Passive valve — no cockpit control.',
      'Separate from the main system relief valve.',
    ],
  },

  hyddump: {
    title: 'Manual Pressure Release Handle',
    items: [
      'Located in the hydraulic service bay (ground maintenance access only).',
      'Discharges the emergency accumulator to the reservoir.',
      'Used on the ground to normalize fluid quantity for accurate measurement — when accumulator is charged, some fluid is stored there rather than in the reservoir, causing the green indicator rod to shift.',
      'After releasing, the green indicator rod shifts to the "accumulator discharged" green band.',
    ],
    photos: [
      { src: '/systems/hyds/hyddump.png', caption: 'Manual pressure release handle' },
    ],
  },

};

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED INFO MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function InfoModal({ title, items = [], photos = [], onClose, theme = MC }) {
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPhotoIdx(i => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft')  setPhotoIdx(i => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, photos.length]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bg,
          border: `0.5px solid ${theme.stroke}`,
          borderRadius: 7,
          width: '100%', maxWidth: 480,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          fontFamily: FONT,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowY: 'auto', padding: '14px 18px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', color: theme.text }}>
              {title?.toUpperCase()}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: theme.muted, fontSize: 16, lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0,
              }}
            >×</button>
          </div>

          {items.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 14, color: theme.muted, fontSize: 11, lineHeight: 1.8 }}>
              {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}

          {photos.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {/* Photo */}
              <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', border: `0.5px solid ${theme.stroke}` }}>
                <img
                  src={photos[photoIdx].src}
                  alt={photos[photoIdx].caption ?? ''}
                  style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'contain' }}
                />
                {/* Prev / Next buttons */}
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 36,
                      background: 'rgba(0,0,0,0.30)', border: 'none', cursor: 'pointer',
                      color: theme.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>‹</button>
                    <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: 36,
                      background: 'rgba(0,0,0,0.30)', border: 'none', cursor: 'pointer',
                      color: theme.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>›</button>
                  </>
                )}
              </div>
              {/* Caption + counter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                <span style={{ fontSize: 9, color: theme.muted, letterSpacing: '0.06em' }}>
                  {photos[photoIdx].caption}
                </span>
                {photos.length > 1 && (
                  <span style={{ fontSize: 9, color: theme.muted, letterSpacing: '0.06em' }}>
                    {photoIdx + 1} / {photos.length}
                  </span>
                )}
              </div>
              {/* Dot indicators */}
              {photos.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 6 }}>
                  {photos.map((_, i) => (
                    <div key={i} onClick={() => setPhotoIdx(i)} style={{
                      width: 5, height: 5, borderRadius: '50%', cursor: 'pointer',
                      background: i === photoIdx ? theme.text : theme.stroke,
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '6px 18px', borderTop: `0.5px solid ${theme.stroke}`,
          color: theme.muted, fontSize: 8, letterSpacing: '0.08em', flexShrink: 0,
        }}>
          CLICK OUTSIDE OR PRESS ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}