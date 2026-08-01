// ─────────────────────────────────────────────────────────────────────────────
//  T-6B OBOGS — Modal Content (rendered by the shared BriefingModal)
//
//  A study reference, not a substitute for the publication: phrasing is kept short
//  and plain rather than quoted verbatim, matching the other systems pages. Content
//  follows the OBOGS brief and the T6BDriver.com deck, and never contradicts NATOPS
//  (TO 1T-6B-1, pp. 1-173 … 1-176, Change 1). Where they disagree, NATOPS wins:
//    · sensor warm-up is 4 minutes (the T6BDriver deck predates Change 1 and says 3)
//    · two ASVs per cockpit — one in the regulator (low resistance), one at the base
//      of the main supply hose (high resistance) — plus a third built into the
//      CRU-60/P connector. One brief counts "three" by lumping all three together.
//
//  EP steps come from the checklist publication (TO 1T-6B-1CL-1 / NAVAIR
//  A1-T6BAA-FCL-100, pp. ED-3 … ED-7 and ED-19) and are numbered as it numbers them.
//  Sub-steps a…d are folded into their parent step so the numbering on screen matches
//  the checklist. The notes, warnings and cautions are deliberately left out — go to
//  the publication for those.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  TAB DATA
// ─────────────────────────────────────────────────────────────────────────────

export const OBOGS_VERBATIM = {
  heading: 'OBOGS NATOPS Intro (helpful to memorize)',
  quote: `"The aircraft has an on-board oxygen generating system (OBOGS). The OBOGS provides each pilot with an automatically regulated oxygen supply which has a slight positive pressure and no duration limitations. Oxygen is extracted from conditioned bleed air by pressure swing adsorption using a molecular sieve."`,
};

// ─────────────────────────────────────────────────────────────────────────────
//  NUMBERS
//  Red is reserved for the two that will actually hurt you (the 10 minute bottle,
//  the 10,000 ft floor); amber for the caution thresholds. Concentrations, timings
//  and bus voltages stay plain.
// ─────────────────────────────────────────────────────────────────────────────

export const OBOGS_NUMBERS = {
  heading: 'OBOGS Numbers',
  items: [
    { section: 'Oxygen Concentration' },
    {
      value: '25 – 70 %',
      label: 'Concentration lever NORMAL, sea level to 15,000 ft MSL',
      highlight: false,
    },
    {
      value: '45 – 95 %',
      label: 'Concentration lever NORMAL, 15,000 to 31,000 ft MSL',
      highlight: false,
    },
    {
      value: '55 – 95 %',
      label: 'Either concentration lever MAX. The 55 % floor is with both pilots drawing on the system; solo it runs higher',
      highlight: false,
    },

    { section: 'Temperature' },
    {
      value: '200 °F',
      label: 'High temp switch activates the OBOGS TEMP caution',
      highlight: 'caution',
    },

    { section: 'Timing' },
    {
      value: '4 minutes',
      label: 'Power-up BIT sensor warm-up. OBOGS FAIL is inhibited for concentration and internal failure — the low pressure switch still lights it',
      highlight: false,
    },

    { section: 'Emergency Oxygen' },
    {
      value: '10 minutes',
      label: 'Emergency oxygen bottle duration. Once pulled it cannot be shut off, and pressure tapers before the bottle is actually empty',
      highlight: 'warning',
    },
    {
      value: '1800 psi',
      label: 'Minimum cylinder charge at 70 °F',
      highlight: false,
    },
    {
      value: '± 3.5 psi per °F',
      label: 'Add or subtract this from 1800 for each degree above or below 70 °F',
      highlight: false,
    },

    { section: 'Altitude' },
    {
      // The checklist keys these two to different altitudes — the green ring to cockpit
      // altitude, the descent to aircraft pressure altitude — so they are separate rows.
      value: '10,000 ft cockpit altitude',
      label: 'Above this cockpit altitude the GREEN RING is required. At or below it, pulling the ring is optional',
      highlight: 'warning',
    }
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EICAS
//  Only two messages, but OBOGS FAIL has three unrelated causes and that is the
//  whole point of the message — the cause line spells all three out.
// ─────────────────────────────────────────────────────────────────────────────

export const OBOGS_EICAS = {
  heading: 'OBOGS EICAS Messages',
  items: [
    {
      label: 'OBOGS FAIL',
      color: 'warning',
      cause: 'Any one of three: low bleed air pressure upstream of the concentrator (low pressure switch), low oxygen concentration (monitor), or an internal failure caught by the OBOGS BIT. Illumination is a positive indication of a system malfunction.',
      response: 'Execute OBOGS FAIL MESSAGE. If it will not clear, execute OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS.',
    },
    {
      label: 'OBOGS TEMP',
      color: 'caution',
      cause: 'High temp switch senses OBOGS ducting above 200 °F — the heat exchanger is not cooling the bleed air enough. Considered a failure of the OBOGS system.',
      response: 'Execute OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EMERGENCY PROCEDURES
//  Checklist steps only. The diagram passes sortMemoryFirst, so the critical-action
//  EPs float to the top at render, and conditionalSteps, which turns the
//  "Below 10,000 feet MSL:" line into an unnumbered condition.
// ─────────────────────────────────────────────────────────────────────────────

export const OBOGS_EPS = {
  heading: 'OBOGS Emergency Procedures',
  items: [
    {
      title: 'OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS',
      subtitle: 'Critical Action Procedure — steps 1 through 3 are the memory items',
      memory: true,
      indications: [
        'OBOGS FAIL warning, OBOGS TEMP caution, or physiological symptoms with no message at all.',
        'Zeolite dust — respiratory irritation, coughing, or white dust in the mask — appears with no OBOGS FAIL illumination.',
      ],
      procedure: [
        'GREEN RING — PULL (AS REQUIRED) (BOTH).',
        'DESCENT BELOW 10,000 FEET MSL — INITIATE.',
        'OBOGS SUPPLY LEVER — OFF (BOTH).',
        'Emergency Oxygen Hose — CHECK (BOTH).',
        'Rate and depth of breathing — NORMALIZE (BOTH).',
        'Below 10,000 Feet MSL:',
        'PRESSURIZATION switch — RAM/DUMP.',
        'BLEED AIR INFLOW switch — OFF.',
        'Oxygen mask — REMOVE (AS REQUIRED) (BOTH).',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'SMOKE AND FUME ELIMINATION',
      subtitle: 'Critical Action Procedure — step 1 is the memory item',
      memory: true,
      indications: [
        'Smoke or fumes in the cockpit.',
      ],
      procedure: [
        'OBOGS — CHECK (BOTH). Supply lever ON, concentration lever MAX, pressure lever EMERGENCY.',
        'Descent below 10,000 ft MSL — INITIATE (AS REQUIRED).',
        'PRESSURIZATION switch — RAM/DUMP.',
        'BLEED AIR INFLOW switch — OFF.',
        'If smoke/fire persists:',
        'BAT and GEN switches — OFF.',
        'AUX BAT switch — OFF (AS REQUIRED).',
        'CFS handle safety pin — REMOVE (BOTH).',
        'CFS — ROTATE 90° COUNTERCLOCKWISE AND PULL (IF NECESSARY).',
        'If smoke/fire ceases:',
        'Restore electrical power — AS REQUIRED.',
        'Land as soon as possible.',
      ],
      landing: 'Land as soon as POSSIBLE.',
    },
    {
      title: 'OBOGS FAIL MESSAGE',
      subtitle: 'Not a critical action procedure — the checklist you run before committing to the CAP above',
      memory: false,
      indications: [
        'OBOGS FAIL warning with no physiological symptoms. Recognize physiological symptoms at any point and go straight to OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS.',
      ],
      procedure: [
        'OBOGS — CHECK (BOTH). Supply lever ON, concentration lever MAX, pressure lever EMERGENCY, flow indicator CHECK for normal operation.',
        'Oxygen hose/CRU-60/P connection — CHECK (BOTH).',
        'Oxygen mask — CHECK FOR LEAKS (BOTH).',
        'If OBOGS supply levers were OFF or a leak identified and OBOGS FAIL extinguishes:',
        'CONTINUE MISSION.',
        'Otherwise:',
        'OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS Checklist — EXECUTE.',
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT INFO  —  click-through detail for diagram elements
//  Keyed to the click targets in T6BObogsDiagram.js. Front and rear share one entry
//  per component: the parts are identical, and splitting them would only duplicate
//  the text. No photos yet — nothing exists under public/systems/obogs/.
// ─────────────────────────────────────────────────────────────────────────────

export const OBOGS_INFO = {

  // ── Bleed air supply ───────────────────────────────────────────────────────

  p3port: {
    title: 'Left Side P3 Port',
    items: [
      'Tap off the compressor section of the engine, on the gas generator side (left). The accessory section is the right side.',
      'This port supplies bleed air to the OBOGS only.',
      'No engine means no bleed air: an inflight engine failure, or a total loss of electrical power, takes the OBOGS with it.',
    ],
    photos: [
      { src: '/systems/obogs/p3port.webp', caption: 'Left side P3 port on the gas generation section' },
    ],
  },

  shutoffvalve: {
    title: 'P3 Shutoff Valve',
    items: [
      'Controlled by the supply lever on either oxygen pressure regulator — the mechanical link on the diagram.',
      'Opens to admit P3 bleed air into the OBOGS. Either supply lever ON opens it; both must be OFF to close it.',
    ],
    photos: [
      { src: '/systems/obogs/shutoffvalve.webp', caption: 'Shutoff valve in the bleed line, accessory section (right side)' },
    ],
  },

  heatexchanger: {
    title: 'Heat Exchanger',
    items: [
      'Cools the bleed air down to something the OBOGS can use. Cooling often condenses water out of it, which is what the drains are for.',
      'Divided into two sections: one cools the anti-G, canopy seal and OBOGS air, the other handles all remaining ECS functions.',
      'Air reaches it through the cooling air inlet duct in the nose. On the ground a flap covers that duct, and the WOW switch runs a blower to push air across the exchanger instead.',
    ],
    photos: [
      { src: '/systems/obogs/heatexchanger.webp', caption: 'Cooling air inlet, the OBOGS line, and the heat exchanger below it' },
    ],
  },

  hightempswitch: {
    title: 'High Temperature Switch',
    items: [
      'Measures temperature in the OBOGS ducting.',
      'Above 200 °F it lights the amber OBOGS TEMP caution.',
      'Indicates that the heat exchanger is not cooling the bleed air sufficiently.',
    ],
  },

  drains: {
    title: 'Condensation Drains',
    items: [
      'Four drains: three in the supply line — the OBOGS drain off the heat exchanger itself, where the cooling condenses the water, and one either side of the low pressure switch — plus the OBOGS unit’s own off the water separator.',
      'They dump the moisture that condenses out of the bleed air as the heat exchanger cools it.',
      'The water separator inside the OBOGS unit takes out what the drains leave behind.',
    ],
  },

  lowpressswitch: {
    title: 'Low Pressure Switch',
    items: [
      'Senses bleed air pressure upstream of the OBOGS concentrator.',
      'Low pressure lights the red OBOGS FAIL warning.',
      'This is the one OBOGS FAIL cause the pilot can do anything about: advance the PCL and see whether the warning extinguishes.',
      'Before engine start, or with any loss of bleed air, OBOGS FAIL is lit from this switch and is normal. It goes out once the bleed air line pressurizes.',
      'It is also the only OBOGS FAIL source that still works during the 4 minute warm-up.',
    ],
  },

  // ── The OBOGS unit ─────────────────────────────────────────────────────────

  obogsunit: {
    title: 'OBOGS Unit',
    items: [
      'Located in the left avionics bay, placarded OXYGEN.',
      'Powered by the hot battery bus at 28 VDC, with no pilot-resettable circuit breaker.',
      'Extracts oxygen from the conditioned bleed air by pressure swing adsorption using a molecular sieve.',
      'Contains the water separator, pressure regulator/shutoff valve, concentrator, composition controller and monitor.',
      'Activation and settings come from either cockpit’s oxygen pressure regulator.',
      'Because it sits on the hot battery bus, leaving a supply lever ON after shutdown will drain the aircraft battery.',
    ],
    photos: [
      { src: '/systems/obogs/obogsunit.webp', caption: 'OBOGS unit in the left avionics bay' },
    ],
  },

  waterseparator: {
    title: 'Water Separator',
    items: [
      'Inside the OBOGS unit. Actively pulls water out of the bleed air that the upstream drains missed.',
      'Drains what it collects to an external vent.',
    ],
  },

  pressregsov: {
    title: 'Pressure Regulator / Shutoff Valve',
    items: [
      'Opens when either cockpit’s supply lever is ON.',
      'Also tied to the pressure lever, which sets whether NORMAL, EMERGENCY or TEST MASK pressure is delivered.',
    ],
  },

  concentrator: {
    title: 'Concentrator',
    items: [
      'Sets oxygen concentration as commanded by the concentration levers with the molecular sieve.',
      'In NORMAL the concentration is scheduled against altitude: 25 to 70% from sea level to 15,000 ft MSL, and 45 to 95% from 15,000 to 31,000 ft MSL.',
      'With either concentration lever in MAX it supplies the highest possible concentration to both regulators — 95% oxygen and 5% inert gas at best, as low as 55% with two pilots breathing on it.',
      'Actual concentration depends on concentrator efficiency, bleed air pressure, cabin altitude and how hard the crew is breathing.',
      'The I-BIT works by opening a valve in here that lets ambient air into the concentration monitor.',
    ],
  },

  compositioncontroller: {
    title: 'Composition Controller',
    items: [
      'Controls the gas composition — the mixture of gas types in the product air.',
    ],
  },

  monitor: {
    title: 'Monitor',
    items: [
      'Monitors both the composition and the concentration of the air being produced.',
      'Low oxygen partial pressure lights OBOGS FAIL — the LOW PPO2 WARNING line on the schematic.',
      'Inhibited for the first 4 minutes after activation while the sensor warms up. There is no indication of concentration failure status during that window.',
      'What the I-BIT exercises: the concentrator lets ambient air in, concentration drops, and the monitor lights OBOGS FAIL.',
    ],
  },

  bit: {
    title: 'Built-In Test (BIT) — Internal Failure',
    items: [
      'Power-up BIT runs on first activation of the system. The sensor warm-up period is 4 minutes.',
      'During warm-up, OBOGS FAIL is inhibited for concentration and internal failure — but the low pressure switch can still light it.',
      'At the end of warm-up, OBOGS FAIL illuminates if the self-test found an internal failure, and stays lit until the failure clears by self-test or by resetting the regulators.',
      'Following OBOGS deactivation or a loss of electrical power, the 4 minute inhibit starts over.',
    ],
  },

  nonreturnvalve: {
    title: 'Nonreturn Valve',
    items: [
      'One-way valve between the OBOGS unit and the plenum.',
      'Good product air passes into the plenum and cannot flow back — which is what lets the plenum hold a reserve when the unit stops producing.',
    ],
  },

  plenum: {
    title: 'Plenum',
    items: [
      'Storage volume for finished oxygen, downstream of the nonreturn valve.',
      'Provides a limited supply in the event of an OBOGS failure.',
    ],
  },

  cockpitrefpressure: {
    title: 'Cockpit Reference Pressure',
    items: [
      'A sense line that references cockpit pressure back to the OBOGS.',
      'It is how the delivered oxygen keeps its slight positive pressure relative to the cockpit rather than an absolute value, as the cabin altitude changes.',
    ],
  },

  hotbatbus: {
    title: '28 VDC — Hot Battery Bus',
    items: [
      'OBOGS power. Hot battery bus, with no pilot-resettable circuit breaker.',
      'The supply levers are the only OBOGS power switch there is — both OFF is the only way to remove the load.',
      'Leaving a regulator on after shutdown drains the battery even with everything else off.',
      'OBOGS is inoperative once the main battery is depleted, or with a battery failure.',
    ],
  },

  // ── Cockpit ────────────────────────────────────────────────────────────────

  regulator: {
    title: 'Oxygen Pressure Regulator (Panel Mounted)',
    items: [
      'Panel-mounted on the right side console of each cockpit.',
      'Controls OBOGS electrical power and oxygen flow for its own cockpit.',
      'Carries the supply lever, concentration lever, pressure lever, BIT button, flow indicator (blinker) and maximum concentration light.',
      'SUPPLY — ON or OFF. ON opens the P3 shutoff valve and the OBOGS unit’s pressure regulator/shutoff valve, both of which the two cockpits share. If either regulator’s supply lever is ON the OBOGS is operative; both must be OFF to disable it. OFF cuts electrical power and oxygen flow to that cockpit’s own regulator.',
      'CONCENTRATION — NORMAL or MAX. NORMAL schedules concentration against altitude. Either lever in MAX drives the concentrator to maximum for both regulators.',
      'PRESSURE — EMERGENCY, NORMAL or TEST MASK. NORMAL is a slight positive pressure on top of what you demand; EMERGENCY is positive pressure for cockpit fire or hypoxia; TEST MASK is a highly pressurized flow to check the face-to-mask seal.',
      '"Gang-loading" is ON / MAX / EMERGENCY — the response to hypoxia symptoms or a loss of cabin pressure.',
    ],
  },

  bitbutton: {
    title: 'BIT Button',
    items: [
      'Activates the initiated BIT (I-BIT), any time after engine start and the 4 minute warm-up.',
      'Verifies that the OBOGS sensor and the OBOGS FAIL warning are both working.',
      'Momentarily pushing it opens a valve in the concentrator, letting ambient air into the concentration monitor.',
      'Concentration drops below normal in about 20 to 30 seconds and OBOGS FAIL should illuminate.',
      'Once the valve closes and concentration recovers, OBOGS FAIL should extinguish within 2 minutes.',
      'If OBOGS FAIL came up with a down or loose mask and did not clear on its own after securing it, an I-BIT that passes means no further action is required.',
    ],
  },

  flowindicator: {
    title: 'Flow Indicator (Blinker)',
    items: [
      'Gives a visual indication of oxygen flow through the regulator.',
      'Each breath in activates it, and it shows for the duration of that flow.',
      'Blinking without you breathing in points at a leak in the mask or hose assembly.',
    ],
  },

  maxconclight: {
    title: 'Maximum Concentration Light',
    items: [
      'Green light on the regulator panel.',
      'Illuminates any time either concentration lever is in MAX — not just your own, because MAX on one lever drives both regulators.',
    ],
  },

  regasv: {
    title: 'Regulator Anti-Suffocation Valve',
    items: [
      'The low-resistance ASV, built into the oxygen regulator.',
      'Lets you breathe cockpit ambient air in the event of OBOGS failure.',
    ],
  },

  hoseasv: {
    title: 'Hose Anti-Suffocation Valve',
    items: [
      'The high-resistance ASV, at the base of the main oxygen supply hose.',
      'Second of the two ASVs in each cockpit; the other is inside the regulator.',
    ],
    photos: [
      { src: '/systems/obogs/anitsuffocationvalve.webp', caption: 'Hose ASV where the supply hose meets the console' },
    ],
  },

  cru60p: {
    title: 'CRU-60/P Connector',
    items: [
      'Standard restraint harness connector. Links the aircraft oxygen supply hose from the panel-mounted regulator to your mask.',
      'Also connects to the emergency oxygen hose, giving you a separate emergency supply.',
      'Has its own built-in anti-suffocation valve plus an overpressure relief valve, which activates when the main oxygen supply is disconnected from it.',
      'As emergency oxygen flow tapers off, breathing through this ASV becomes increasingly noticeable and uncomfortable.',
    ],
  },

  emergencyoxygen: {
    title: 'Emergency Oxygen (Green Ring)',
    items: [
      'Ejection seat oxygen supply, selected manually by the green handle on the left side of the seat. Supplied through the CRU-60/P.',
      'Approximately 10 minutes of oxygen. Once activated it cannot be shut off and runs until the cylinder is depleted.',
      'It is unregulated, so pressure tapers off and it feels depleted before the 10 minutes are up — oxygen is still flowing.',
      'Pull sharply up and aft. Several attempts may be needed, and pull force can be as high as 40 pounds.',
      'Above 10,000 ft cockpit altitude, pulling it is required. At or below 10,000 ft it is optional — ambient cockpit air holds enough oxygen pressure.',
      'High pressure air makes talking to the other crewmember or ATC harder.',
    ],
  },

  contentsgage: {
    title: 'Emergency Oxygen Contents Gage',
    items: [
      'Reads the charge in that seat’s emergency oxygen cylinder.',
      'The cylinder is charged to 1800 psi minimum at 70 °F.',
      'Indicated pressure moves with temperature. To approximate an acceptable bottle pressure, add or subtract 3.5 psi for each degree above or below 70 °F.',
    ],
  },

  mask: {
    title: 'Oxygen Mask',
    items: [
      'Fed from the panel-mounted regulator through the supply hose and the CRU-60/P.',
      'Operating with the mask down or loose fitting reduces oxygen concentration to both regulators and may induce an OBOGS FAIL warning.',
      'If OBOGS fails with the mask down or loose, secure the mask. For extended mask-down operation, put that cockpit’s supply lever to OFF instead.',
      'White dust inside the mask is a zeolite indication from the concentrator — and it comes with no OBOGS FAIL light.',
    ],
  },
};
