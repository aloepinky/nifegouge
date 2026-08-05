// ─────────────────────────────────────────────────────────────────────────────
//  T-6B Oil System — Modal Content (rendered by the shared BriefingModal)
//
//  A study reference, not a substitute for the publication: phrasing is short and
//  plain rather than quoted verbatim, matching the other systems pages. Content
//  follows the FAM4203 oil brief and the T6BDriver.com engine/oil deck, and never
//  contradicts NATOPS (TO 1T-6B-1, pp. 1-4 … 1-12). Where they disagree, NATOPS wins:
//    · inverted flight is 60 seconds, not 15 — the T6BDriver deck's figure is
//      superseded by Section V, which the site already carries in TW4Limits.js. The
//      fuel page records the identical correction for the flip-flop valve.
//    · the compressor bearing housed inside the oil tank is the REAR one, not the
//      front. The deck's scavenge slide has the two swapped. NATOPS does not break the
//      pair out at all, but the tank is cast integrally with the compressor air inlet
//      at the aft end of the engine, and Figure 1-9 draws the in-tank bearing aft of
//      the one out on the gas generator shaft. Geometry settles it.
//
//  EP steps come from the checklist publication (TO 1T-6B-1CL-1 / NAVAIR
//  A1-T6BAA-FCL-100, pp. EE-17 and EE-19) and are numbered as it numbers them. The
//  notes, warnings and cautions are deliberately left out — go to the publication for
//  those — except where the checklist's own trigger list is carried as `indications`.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  TAB DATA
// ─────────────────────────────────────────────────────────────────────────────

export const OIL_VERBATIM = {
  heading: 'Oil System NATOPS Intro (helpful to memorize)',
  quote: `"The oil system has a capacity of 18.5 U.S. quarts and provides a constant supply of filtered oil to the engine bearings, reduction gears, accessory drives, and propeller throughout normal and aerobatic flight maneuvers. Components include pressure, scavenge, cooling, and breather systems."`,
};

// ─────────────────────────────────────────────────────────────────────────────
//  NUMBERS
//  Red is reserved for what will actually hurt you — the red-arc pressure bands, the
//  maneuvering time limits. Amber for the caution thresholds. Capacity, servicing
//  windows and gearbox speeds stay plain.
// ─────────────────────────────────────────────────────────────────────────────

export const OIL_NUMBERS = {
  heading: 'Oil System Numbers',
  items: [
    { section: 'Capacity & Servicing' },
    {
      value: '18.5 quarts',
      label: 'Total oil system capacity',
      highlight: false,
    },
    {
      value: '30 minutes, 15 – 20 minutes',
      label: 'Maximum oil servicing time, recommended servicing time range',
      highlight: false,
    },
    {
      value: 'Up to 4 psi',
      label: 'OIL PX may display with or without the engine seized',
      highlight: false,
    },

    { section: 'Oil Pressure' },
    {
      value: '90 – 120 psi',
      label: 'TAKEOFF/MAX',
      highlight: false,
    },
    {
      value: '200 psi',
      label: 'IDLE MAX',
      highlight: 'warning',
    },
    {
      value: '40 – 130 psi',
      label: 'Transient range permitted for aerobatics and spins',
      highlight: false,
    },
    {
      value: '15 – 40 psi',
      label: 'Transient range permitted at PCL IDLE for 5 seconds',
      highlight: false,
    },

    { section: 'Oil Temperature' },
    {
      value: '10 – 105 °C',
      label: 'TAKEOFF/MAX',
      highlight: false,
    },
    {
      value: '−40 to 105 °C',
      label: 'Ground range',
      highlight: false,
    },
    {
      value: '106 – 110 °C',
      label: 'Amber arc — caution. Transient for 10 minutes, or ground operations below 20% torque',
      highlight: 'caution',
    },

    { section: 'Flight Maneuvering (NATOPS Section V)' },
    {
      value: '60 seconds',
      label: 'INVERTED FLIGHT',
      highlight: false,
    },
    {
      value: '5 seconds',
      label: 'INTENTIONAL ZERO G FLIGHT.',
      highlight: false,
    },
    {
      value: '60 seconds',
      label: 'NEGATIVE G OPERATIONS',
      highlight: false,
    },
    {
      value: '30 seconds',
      label: 'FLIGHT BELOW −2.5 G',
      highlight: false,
    },
    {
      value: '60 seconds',
      label: 'MIN. POS Gs UPRIGHT BEFORE ADDITIONAL NEG Gs',
      highlight: false,
    },

    { section: 'Reduction Gearbox' },
    {
      value: '30,000 → 2,000 RPM',
      label: 'Two-stage planetary gear reduction ratio from power turbine shaft speed to propeller speed',
      highlight: false,
    }
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EICAS
//  Two OIL PX messages off one transducer, plus CHIP off a completely separate
//  sensor in the reduction gearbox. Both OIL PX messages route through the SCU;
//  CHIP does not.
// ─────────────────────────────────────────────────────────────────────────────

export const OIL_EICAS = {
  heading: 'Oil System EICAS Messages',
  items: [
    {
      label: 'OIL PX',
      color: 'warning',
      cause: 'SCU triggered by severely low oil pressure according to Table 1-10.',
      response: 'Execute the second half of OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE.',
    },
    {
      label: 'OIL PX',
      color: 'caution',
      cause: 'SCU triggered by low oil pressure according to Table 1-10.',
      response: 'Execute OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE. Terminate the maneuver and check oil pressure.',
    },
    {
      label: 'CHIP',
      color: 'warning',
      cause: 'Chip detector in the bottom of the reduction gearbox has detected ferrous material in the oil.',
      response: 'Execute CHIP DETECTOR WARNING.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EMERGENCY PROCEDURES
//  Checklist steps only. Every step in both of these procedures is asterisked in
//  the publication, so both are critical action procedures. The diagram passes
//  conditionalSteps, which turns the two "If ..." lines into unnumbered conditions.
// ─────────────────────────────────────────────────────────────────────────────

export const OIL_EPS = {
  heading: 'Oil System Emergency Procedures',
  items: [
    {
      title: 'OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE',
      subtitle: 'Critical Action Procedure — all four steps are memory items',
      memory: true,
      indications: [
        'Red OIL PX annunciator illuminated.',
        'Amber OIL PX annunciator illuminated.',
        'Oil pressure fluctuations.',
        'Oil temperature out of limits.',
        'Visibly confirmed leaking oil from the aircraft.',
      ],
      procedure: [
        'If only amber OIL PX caution illuminates:',
        'Terminate maneuver.',
        'Check oil pressure; if pressure is normal, continue operations.',
        'If red OIL PX warning illuminates and/or amber OIL PX caution remains illuminated for 5 seconds, oil pressure fluctuations, or oil temperature out of limits:',
        'PCL — MINIMUM NECESSARY TO INTERCEPT ELP; AVOID UNNECESSARY PCL MOVEMENTS.',
        'PEL — EXECUTE.',
      ],
    },
    {
      title: 'CHIP DETECTOR WARNING',
      subtitle: 'Critical Action Procedure — both steps are memory items',
      memory: true,
      indications: [
        'Red CHIP warning on the EICAS.',
      ],
      procedure: [
        'PCL — MINIMUM NECESSARY TO INTERCEPT ELP; AVOID UNNECESSARY PCL MOVEMENTS.',
        'PEL — EXECUTE.',
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT DETAIL (InfoModal)
//
//  The schematic calls its parts out by number alone, the way NATOPS Figure 1-9
//  does, so the title of each record below is the name that figure gives the number
//  in front of it — 1 through 23 in the figure's own order, then the parts the figure
//  labels in text rather than numbering.
//
//  One <Hot> target per record, except the oil strainer: the figure numbers six
//  separate strainers 6, and all six targets open the one record.
//
//  Photos live in public/systems/oil/ and go only on the parts there is a photograph
//  of — InfoModal renders text-only records without one, so an unphotographed part
//  simply has no `photos` key.
// ─────────────────────────────────────────────────────────────────────────────

export const OIL_INFO = {

  // Records carry only what the T6BDriver deck teaches and what NATOPS publishes as a
  // number. Parts the deck does not cover are named and nothing more: they keep a title
  // so the drawing can say what they are on hover, and have no `items`, so clicking one
  // opens nothing rather than opening a paragraph that restates the label.

  // ── Tank and servicing ─────────────────────────────────────────────────────

  oiltank: {
    title: 'Oil Tank',
    items: [
      'Accessible in the accessory compartment, left side. Capacity 18.5 U.S. quarts.',
      'Holds both pickup elements, the oil pump and the oil filter.',
    ],
    photos: [
      { src: '/systems/oil/tank.webp', caption: 'Oil tank — accessory compartment, left side' },
      { src: '/systems/oil/tank2.webp', caption: 'Oil tank — accessory compartment, right side' },
    ],
  },

  dipstick: {
    title: '10. Oil Filler and Dipstick',
    items: [
      'Use the dipstick to check oil level. The sight glass is not to be used.',
      'Service the level within 30 minutes of shutdown; check 15 to 20 minutes after shutdown for the most accurate result.',
      'Normal level is between ADD and MAX HOT. At or below ADD, service to MAX HOT.',
    ],
    photos: [
      { src: '/systems/oil/dipstick.webp', caption: 'Filler cap and dipstick' },
      { src: '/systems/oil/tank.webp', caption: 'Dipstick and sight gauge on the tank' },
    ],
  },

  sightglass: {
    title: 'Oil Level Sight Glass',
    items: [
      'Not to be used for checking oil level. Use the dipstick.',
    ],
    photos: [
      { src: '/systems/oil/tank.webp', caption: 'Sight gauge, left side of the accessory compartment' },
    ],
  },

  // ── Pressure system ────────────────────────────────────────────────────────

  normalpickup: {
    title: 'Pressure Pickup — Normal',
    items: [
      'Submerged element, picking up oil near the centre of the tank.',
    ],
  },

  invertedpickup: {
    title: 'Pressure Pickup — Inverted Flight',
    items: [
      'Second element, picking up oil near the top of the tank for inverted flight.',
      'It does not remove the Section V limits: 60 seconds inverted, 5 seconds intentional zero G.',
    ],
  },

  pressurepumpfwd: {
    title: '19. Pressure Pump (Forward Element)',
    items: [
      'One element of the oil pump. Internal to the oil tank, run by the accessory gearbox.',
    ],
  },

  pressurepumpaft: {
    title: '18. Pressure Pump (Aft Element)',
    items: [
      'The other element of the oil pump. Internal to the oil tank, run by the accessory gearbox.',
    ],
  },

  mainfilter: {
    title: '12. Main Oil Filter and Check Valve',
    items: [
      'In the tank, right side. Filters the oil before it is used.',
    ],
    photos: [
      { src: '/systems/oil/tank2.webp', caption: 'Oil filter, right side of the accessory compartment' },
    ],
  },

  filterbypassvalve: {
    title: '22. Filter Bypass Valve',
    items: [
      'Bypasses the oil filter if it becomes clogged.',
    ],
  },

  pressureregvalve: { title: '21. Pressure Regulating Valve' },
  bypassvalve:      { title: '17. Bypass Valve' },
  strainer:         { title: '6. Oil Strainer' },

  // ── Where the pressure oil goes ────────────────────────────────────────────

  agb: {
    title: 'Accessory Gearbox',
    items: [
      'Runs and powers the accessories: starter/generator, hydraulic pump, engine-driven low pressure fuel pump, oil pumps, external oil scavenge pump and the FMU.',
    ],
  },

  compressorbearings: {
    title: '8. Compressor Bearings',
    items: [
      'The rear bearing is housed inside the oil tank and scavenged by the internal pump. The front one is scavenged by the external pump.',
    ],
  },
  turbinebearings: {
    title: '7. Power Turbine Bearings',
    items: [
      'Scavenged by the external scavenge pump.',
    ],
  },
  torqueshaft:        { title: '5. Torque Shaft Assembly' },
  firststagegears:    { title: '3. First Stage Reduction Gears' },
  secondstagegears:   { title: '2. Second Stage Reduction Gears' },
  journalbearing:     { title: '4. First Stage Journal Bearing' },

  rgb: {
    title: 'Reduction Gearbox (RGB)',
    items: [
      'Reduces power turbine speed from 30,000 RPM to the 2,000 RPM propeller speed.',
      'Engine power is measured by the torque it produces. The chip detector is mounted on the bottom of it.',
    ],
  },

  piu: {
    title: '1. Propeller Interface Unit (PIU)',
    items: [
      'Regulates oil to the propeller pitch change mechanism in response to power requests from the PMU.',
    ],
    photos: [
      { src: '/systems/oil/piu.webp', caption: 'PIU on top of the reduction gearbox' },
    ],
  },

  // ── Scavenge and cooling ───────────────────────────────────────────────────

  intscavengefwd: {
    title: '16. Internal Scavenge Pump (Forward Element)',
    items: [
      'One element of the internal scavenge pump, a dual-element gear-type pump inside the oil tank.',
      'Scavenges the accessory gearbox bearings and the rear compressor bearing, and sends the oil through the oil cooler before it returns to the tank.',
    ],
  },

  intscavengeaft: {
    title: '15. Internal Scavenge Pump (Aft Element)',
    items: [
      'The other element of the internal scavenge pump, a dual-element gear-type pump inside the oil tank.',
      'Scavenges the accessory gearbox bearings and the rear compressor bearing, and sends the oil through the oil cooler before it returns to the tank.',
    ],
  },

  extscavengefwd: {
    title: '14. External Scavenge Pump (Forward Element)',
    items: [
      'One element of the external scavenge pump, a dual-element gear-type pump outside the oil tank.',
      'Shares the same AGB drive shaft as the engine-driven low pressure fuel pump.',
      'Scavenges the front compressor bearing, the turbine bearings, the RGB bearings and the prop system, and sends the oil through the oil cooler before it returns to the tank.',
    ],
    photos: [
      { src: '/systems/oil/externalscavenge.webp', caption: 'External scavenge pump' },
      { src: '/systems/oil/externalscavenge-chip.webp', caption: 'External scavenge lines' },
    ],
  },

  extscavengeaft: {
    title: '13. External Scavenge Pump (Aft Element)',
    items: [
      'The other element of the external scavenge pump, a dual-element gear-type pump outside the oil tank.',
      'Shares the same AGB drive shaft as the engine-driven low pressure fuel pump.',
      'Scavenges the front compressor bearing, the turbine bearings, the RGB bearings and the prop system, and sends the oil through the oil cooler before it returns to the tank.',
    ],
    photos: [
      { src: '/systems/oil/externalscavenge.webp', caption: 'External scavenge pump' },
      { src: '/systems/oil/externalscavenge-chip.webp', caption: 'External scavenge lines' },
    ],
  },

  oilcooler: {
    title: 'Oil Cooler',
    items: [
      'The oil system is air cooled: scavenged oil routes through the cooler before it returns to the tank.',
    ],
    photos: [
      { src: '/systems/oil/cooler.webp', caption: 'Oil cooler intake, lower aft cowl' },
    ],
  },

  rgbdrainchip: {
    title: '23. Reduction Gearbox Oil Drain and Chip Detector',
    items: [
      'Mounted on the bottom of the reduction gearbox. Detects ferrous material in the oil.',
      'Illuminates the red CHIP warning on the EICAS, indicating oil contamination.',
    ],
    photos: [
      { src: '/systems/oil/externalscavenge-chip.webp', caption: 'Chip detector under the reduction gearbox' },
    ],
  },

  breathervalve:   { title: '9. Breather Valve' },
  centrifbreather: { title: '11. Centrifugal Breather' },
  oiltankdrain:    { title: '20. Oil Tank Drain' },

  // ── Indication chain ───────────────────────────────────────────────────────

  pxtransducer: {
    title: 'Oil Pressure Transducer',
    items: [
      'Senses oil pressure downstream of the main pump and sends it to the EDM.',
      'Powered through the OIL TRX circuit breaker. Without power the display indicates 0, not low.',
    ],
  },

  temptransducer: {
    title: 'Oil Temperature Transducer',
    items: [
      'Senses oil temperature downstream of the main pump and sends it to the EDM.',
      'Flight 10 to 105 °C, transient 106 to 110 °C. Ground −40 to 105 °C.',
    ],
  },

  edm: {
    title: 'Engine Data Manager (EDM)',
    items: [
      'Receives the pressure and temperature data.',
      'Temperature goes to the EICAS gauge; pressure goes on to the SCU.',
    ],
  },

  scu: {
    title: 'Signal Conditioning Unit (SCU)',
    items: [
      'Illuminates the OIL PX warning or OIL PX caution on the EICAS.',
      'Prevents nuisance caution lights on start.',
      'A momentary OIL PX caution while maneuvering is possible and may not indicate a malfunction.',
      'Both messages with normal oil pressure on the gauge indicates an SCU failure.',
    ],
  },
};
