// ─────────────────────────────────────────────────────────────────────────────
//  FAM4204  —  Electrical System Modal Content
//  Sources: ELEC.pdf (TO 1T-6B-1CL-1 / NAVAIR A1-T6BAA-FCL-100),
//           Briefing_Outlines.pdf (FAM4204),
//           t-6b_electrical_system.pdf (T6BDriver.com)
//  Structure mirrors HydraulicModalData.js
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  VERBATIM
// ─────────────────────────────────────────────────────────────────────────────

export const ELEC_VERBATIM = {
  heading: 'Electrical System NATOPS Intro (helpful to memorize)',
  quote: `"The electrical system includes a 28 VDC, 300 amp starter/generator, an aerobatic 24 VDC lead-acid battery, a 24 VDC auxiliary battery, and an external power receptacle. Electrical power is distributed through the battery and generator buses connected by the bus tie switch. Circuit breakers, providing protection, are located in both cockpits; battery bus on the left console panels and generator bus on the right. Black circuit breaker collar extensions are installed to provide easy identification and operation of high-use circuit breakers."`,
};

// ─────────────────────────────────────────────────────────────────────────────
//  NUMBERS
// ─────────────────────────────────────────────────────────────────────────────

export const ELEC_NUMBERS = {
  heading: 'Electrical System Numbers',
  items: [
    { section: 'Normal Operating Values' },
    {
      value: '+50 to −2 A',
      label: 'Normal ammeter range inflight (positive = battery charging)',
      highlight: false,
    },
    {
      value: '28.0 – 28.5 V',
      label: 'Normal voltage — ground and inflight',
      highlight: false,
    },
    { section: 'Starter / Generator' },
    {
      value: '28 VDC  /  300 A',
      label: 'Starter/generator rated output voltage and amperage',
      highlight: false,
    },
    {
      value: '22.0 – 29.5 V',
      label: 'Voltage normal range',
      highlight: false,
    },
    {
      value: '<22 V, 29.6 – 32.2 V',
      label: 'Voltage caution range. Amber Text',
      highlight: 'caution',
    },
    {
      value: '>32.2 V',
      label: 'Voltage exceedance range. Red Text',
      highlight: 'warning',
    },
    {
      value: '≥ 25 V',
      label: 'Minimum generator voltage required to charge the battery',
      highlight: false,
    },
    {
      value: '≥ 27 V',
      label: 'Minimum generator voltage during ops checks',
      highlight: false,
    },
    { section: 'Main Battery' },
    {
      value: '24 VDC  /  42 Ah',
      label: 'Main battery — voltage and capacity',
      highlight: false,
    },
    {
      value: '≥ 23.5 V',
      label: 'Minimum battery voltage to attempt a battery ground start',
      highlight: true,
    },
    {
      value: '≥ 22 V',
      label: 'Minimum battery voltage to connect external power',
      highlight: true,
    },
    {
      value: '12.88 V',
      label: 'MFD Failure. Possibly preempted by BATT BUS warning.',
      highlight: 'warning',
    },
    {
      value: '~30 min',
      label: 'Battery bus operation time with Bus Tie OPEN and generator failed',
      highlight: false,
    },
    { section: 'Auxiliary Battery' },
    {
      value: '24 VDC  /  5 Ah',
      label: 'Auxiliary battery — voltage and capacity',
      highlight: false,
    },
    {
      value: '~30 min',
      label: 'Aux battery endurance powering BFI, Standby VHF, and Fire 1',
      highlight: false,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EICAS MESSAGES  —  order and color preserved from PCL
// ─────────────────────────────────────────────────────────────────────────────

export const ELEC_EICAS = {
  heading: 'Electrical System EICAS Messages',
  items: [
    // ── Warnings ─────────────────────────────────────────────────────────────
    {
      label: 'GEN BUS',
      color: 'warning',
      cause: 'Loss of the generator bus and associated avionics buses. Battery bus items remain powered.',
      response: 'Execute GENERATOR BUS INOPERATIVE. BUS TIE — NORM. Land as soon as practical.',
    },
    {
      label: 'BAT BUS',
      color: 'warning',
      cause: 'Loss of the battery bus and associated avionics buses, or current limiter failure. Accompanied by TRIM OFF, OIL PX, HYDR FL LO, PMU STATUS. Most noticeable: UFCP, center MFD, right MFD.',
      response: 'Execute BATTERY BUS INOPERATIVE. Descend below 10,000 ft, BUS TIE OPEN, AUX BAT ON, STBY VHF ON, execute Landing Gear Emergency Extension prior to landing.',
    },
    // ── Cautions ─────────────────────────────────────────────────────────────
    {
      label: 'GEN',
      color: 'warning',
      cause: 'Generator inoperative — voltmeter below 25 V, ammeter discharging. Also illuminates normally when starter switch is not in NORM.',
      response: 'Execute GENERATOR INOPERATIVE. STARTER — NORM, GEN — ON, GEN RESET — hold 1 sec. If still inop: descend below 10,000 ft, GEN OFF, BUS TIE OPEN. Land as soon as practical.',
    },
    {
      label: 'ADC FAIL',
      color: 'warning',
      cause: 'Air data computer failed. Primary airspeed, altimeter, and VSI inoperative. TAD, aural gear warning, and transponder mode C also lost.',
      response: 'Execute AIR DATA COMPUTER FAILURE. Reference BFI. ADC circuit breaker (right front console) — check, reset if open.',
    },
    {
      label: 'EDM FAIL',
      color: 'warning',
      cause: 'Engine data manager failed. Direct engine, fuel, electrical, and hydraulic monitoring lost. Displayed CAS messages are no longer monitoring their systems. PMU remains online.',
      response: 'Execute ENGINE DATA MANAGER FAIL. EDM circuit breakers (left and right front console) — check, reset if open. Land as soon as practical if EICAS engine displays do not return.',
    },
    {
      label: 'BUS TIE',
      color: 'caution',
      cause: 'BUS TIE switch open or bus tie relay failed — battery and generator buses isolated.',
      response: 'Execute BUS TIE INOPERATIVE. BUS TIE switch — NORM. If caution remains, land as soon as practical.',
    },
    {
      label: 'IAC XTALK FAIL',
      color: 'caution',
      cause: 'Loss of cross-talk between IAC 1 and IAC 2. Baro, bugs, minimums, heading, and other settings operate independently per cockpit. RPT ERROR posts if REPEAT is selected.',
      response: 'Execute IAC XTALK FAILURE. MFD/UFP REPEAT/NORM — NORM (both cockpits). Confirm altimeter settings in each cockpit.',
    },
    {
      label: 'XPDR FAIL',
      color: 'caution',
      cause: 'Transponder failed or transmitting in error. TCAS, ADS-B, mode C, and mode S may be affected for own-ship and other aircraft.',
      response: 'Execute XPDR FAILURE. XPDR circuit breaker (right front console) — check, reset if open. Confirm with ATC and comply with direction.',
    },
    {
      label: 'ADS-B FAIL',
      color: 'caution',
      cause: 'Transponder indicates ADS-B Out function failure. Own-ship direct effects are minor, but other aircraft and ATC lose ADS-B information.',
      response: 'Execute ADS-B OUT FAILURE. Confirm with ATC that ADS-B is missing or in error. Comply with ATC direction and adjust mission as required.',
    },
    {
      label: 'IAC (1/2) FAIL',
      color: 'caution',
      cause: 'Respective IAC has failed — loss of or erratic MFD displays. Front cockpit = IAC 1; rear cockpit = IAC 2.',
      response: 'Execute IAC FAILURE. Reference BFI, NORM/REPEAT — NORM, check IAC circuit breakers. If persists, pull and reset failed IAC CB after 5 seconds. Land as soon as practical.',
    },
    {
      label: 'IRS FAIL',
      color: 'caution',
      cause: 'Loss of attitude or heading display on HUD and MFD.',
      response: 'Execute IRS FAILURE. Reference BFI. IRS circuit breaker (left and right front console) — check, reset if open. Straight and level flight, monitor alignment. Land as soon as practical.',
    },
    {
      label: 'UFCP (1/2) FAIL',
      color: 'caution',
      cause: 'UFCP blank or data entry knob/system buttons non-functioning in the respective cockpit. Functions lost: FMS execute, Mag/True toggle, GS/CAS/TAS toggle, UFCP radio tuning.',
      response: 'Execute UFCP FAILURE. UFCP circuit breaker (left front or left rear console) — check, reset if open. Land as soon as practical.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EMERGENCY PROCEDURES
// ─────────────────────────────────────────────────────────────────────────────

export const ELEC_EPS = {
  heading: 'Electrical System Emergency Procedures',
  items: [
    {
      title: 'IAC FAILURE (SINGLE/DUAL)',
      subtitle: 'Loss of MFD Displays / Erratic Displays / Avionics Synchronization Errors',
      memory: false,
      indications: [
        'EICAS message',
        'Loss of or erratic MFD displays in one or both cockpits.',
        'Front cockpit = IAC 1; rear cockpit = IAC 2.',
      ],
      procedure: [
        'Backup flight instrument — REFERENCE AS REQUIRED.',
        'NORM/REPEAT switch — NORM (BOTH COCKPITS).',
        'IAC 1 and IAC 2 circuit breakers — CHECK, RESET IF OPEN.',
        'If failures persist:',
        'Failed IAC circuit breaker(s) — PULL, RESET AFTER 5 SECONDS.',
        'If failures persist:',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'IRS FAILURE',
      subtitle: 'Loss of Attitude or Heading Display on HUD and MFD',
      memory: false,
      indications: [
        'EICAS message',
        'Loss of attitude or heading display on HUD and MFD.',
      ],
      procedure: [
        'Backup flight instrument — REFERENCE AS REQUIRED.',
        'IRS circuit breaker (left and right front console) — CHECK, RESET IF OPEN.',
        'Straight and level unaccelerated flight — MAINTAIN, monitor alignment.',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'MFD FAILURE OR AVIONICS BUS FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'Loss of one or more MFD displays, with or without other avionics failures.',
      ],
      procedure: [
        'FOR MFD FAILURE WITH NO OTHER INDICATIONS:',
        'NORM/REPEAT switch (failed cockpit) — REPEAT.',
        'MFD circuit breaker — CHECK, RESET IF OPEN.',
        'FOR MFD FAILURE WITH OTHER AVIONICS FAILURES (NO GEN/BAT BUS WARNING):',
        'FWD/AFT AVI circuit breakers — CHECK, RESET IF OPEN.',
        'Backup flight instruments — REFERENCE AS REQUIRED.',
        'IF FWD AVIONICS GEN BUS REMAINS INOPERATIVE:',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL if FWD avionics gen bus remains inoperative.',
    },
    {
      title: 'UFCP FAILURE',
      subtitle: 'Blank Entry Windows / Data Entry Knob or System Button Non-Functioning',
      memory: false,
      indications: [
        'Blank UFCP entry windows, or data entry knob/system button non-functioning.',
      ],
      procedure: [
        'UFCP circuit breaker (left front or left rear console) — CHECK, RESET IF OPEN.',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'BACKUP FLIGHT INSTRUMENT DISPLAY FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'BFI display blank or failed.',
      ],
      procedure: [
        'Straight and level unaccelerated flight — ESTABLISH.',
        'STBY INST circuit breaker (left front/left rear console) — CHECK, RESET IF OPEN.',
        'AFT STBY circuit breaker (left front console) — CHECK, RESET IF OPEN.',
        'If display does not return:',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'ENGINE DATA MANAGER FAIL',
      subtitle: 'EDM FAIL Warning / EDM A or B INOP Advisory',
      memory: false,
      indications: [
        'EDM FAIL warning or EDM A/B INOP advisory on EICAS.',
        'If EDM FAIL remains: direct engine, fuel, electrical, hydraulic monitoring lost.',
      ],
      procedure: [
        'EDM circuit breakers (left and right front console) — CHECK, RESET IF OPEN.',
        'If EICAS engine displays do not return:',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL if EICAS engine displays do not return.',
    },
    {
      title: 'AIR DATA COMPUTER FAILURE',
      subtitle: 'ADC FAIL Warning / ADC A or B INOP Advisory',
      memory: false,
      indications: [
        'ADC FAIL warning or ADC A/B INOP advisory on EICAS.',
        'If ADC FAIL remains: airspeed, altimeter, VSI, TAD, aural gear warning, and transponder mode C inoperative.',
      ],
      procedure: [
        'Backup flight instrument — REFERENCE AS REQUIRED.',
        'ADC circuit breaker (right front console) — CHECK, RESET IF OPEN.',
      ],
      landing: 'No specific landing criteria — use BFI and AOA.',
    },
    {
      title: 'LOSS OF ICS/AUDIO',
      subtitle: '',
      memory: false,
      indications: [
        'Loss of intercom or audio in one or both cockpits.',
      ],
      procedure: [
        'COMM lead — SWITCH TO AUXILIARY CORD (affected cockpit).',
        'AUDIO circuit breaker — CHECK, RESET IF OPEN.',
        'If audio not re-established:',
        'EMR/NRM switch — SELECT EMR (BOTH).',
      ],
      landing: 'No specific landing criteria.',
    },
    {
      title: 'AOA COMPUTER FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'Loss of AOA indication in HUD and AOA indexer with gear down.',
      ],
      procedure: [
        'AOA circuit breaker (left front console) — CHECK, RESET IF OPEN.',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'GENERATOR INOPERATIVE',
      subtitle: '',
      memory: false,
      indications: [
        'GEN caution on EICAS.',
        'DC voltmeter below 25 V, ammeter discharging.',
      ],
      procedure: [
        'STARTER switch — NORM (BOTH).',
        'GEN switch — ON (FRONT OR BACK).',
        'GEN RESET — DEPRESS AND HOLD MINIMUM 1 SECOND.',
        'If generator remains inoperative:',
        'Descent below 10,000 ft MSL — INITIATE (AS REQUIRED).',
        'GEN switch — OFF (BOTH).',
        'BUS TIE switch — OPEN.',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'GENERATOR BUS INOPERATIVE',
      subtitle: '',
      memory: false,
      indications: [
        'GEN BUS warning on EICAS.',
        'Loss of generator bus and associated avionics buses.',
      ],
      procedure: [
        'BUS TIE switch — NORM.',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL.',
    },
    {
      title: 'BATTERY BUS INOPERATIVE',
      subtitle: '',
      memory: false,
      indications: [
        'BAT BUS warning on EICAS.',
        'Multiple simultaneous failures: TRIM OFF, OIL PX, HYDR FL LO, PMU STATUS.',
        'Most noticeable: UFCP, center MFD, right MFD.',
      ],
      procedure: [
        'Descent below 10,000 ft MSL — INITIATE (AS REQUIRED).',
        'BUS TIE switch — OPEN.',
        'AUX BAT switch — ON.',
        'Standby VHF — ON.',
        'LANDING GEAR EMERGENCY EXTENSION — EXECUTE PRIOR TO LANDING.',
      ],
      landing: 'Execute Landing Gear Emergency Extension prior to landing.',
    },
    {
      title: 'BUS TIE INOPERATIVE',
      subtitle: '',
      memory: false,
      indications: [
        'BUS TIE caution on EICAS with BUS TIE switch in NORM.',
      ],
      procedure: [
        'BUS TIE switch — NORM.',
        'If BUS TIE caution remains:',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL if BUS TIE caution remains.',
    },
    {
      title: 'BATTERY AND GENERATOR FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'Complete loss of main electrical power — MFDs, EICAS, and most systems inoperative.',
      ],
      procedure: [
        'Descent below 10,000 ft MSL — INITIATE (AS REQUIRED).',
        'AUX BAT switch — ON.',
        'Land as soon as possible.',
      ],
      landing: 'Land as soon as POSSIBLE.',
    },
    {
      title: 'ELECTRICAL FIRE',
      subtitle: '',
      memory: true,
      indications: [
        'Smoke, fumes, or burning smell with suspected electrical source.',
      ],
      procedure: [
        '*OBOGS — CHECK (BOTH): supply ON, concentration MAX, pressure EMERGENCY.',
        'Descent below 10,000 ft MSL — INITIATE (AS REQUIRED).',
        'PRESSURIZATION switch — RAM/DUMP.',
        'BLEED AIR INFLOW switch — OFF.',
        'If smoke/fire persists:',
        'BAT and GEN switches — OFF.',
        'AUX BAT switch — OFF (AS REQUIRED).',
        'CFS handle safety pin — REMOVE (BOTH).',
        'CFS — ROTATE 90° CCW AND PULL (IF NECESSARY).',
        'If smoke/fire ceases:',
        'Restore electrical power — AS REQUIRED.',
        'Land as soon as possible.',
      ],
      landing: 'Land as soon as POSSIBLE.',
    },
    {
      title: 'IAC XTALK FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'IAC XTALK amber message on EICAS.',
        'Settings (baro, bugs, minimums, etc.) now operate independently per cockpit.',
      ],
      procedure: [
        'MFD/UFP REPEAT/NORM switch — NORM (BOTH COCKPITS).',
      ],
      landing: 'No specific landing criteria.',
    },
    {
      title: 'ADS-B OUT FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'ADS-B FAIL on EICAS. Own-ship direct effects minor; ATC and other aircraft lose ADS-B info.',
      ],
      procedure: [
        'Confirm with ATC that ADS-B is missing or in error. Comply with ATC direction and adjust mission as required.',
      ],
      landing: 'No specific landing criteria.',
    },
    {
      title: 'XPDR FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'XPDR FAIL on EICAS. Transponder failed or transmitting in error.',
      ],
      procedure: [
        'XPDR circuit breaker (right front console) — CHECK, RESET IF OPEN.',
        'If normal operation does not resume:',
        'Confirm with ATC that transponder is not transmitting correctly. Comply with ATC direction and adjust mission as required.',
      ],
      landing: 'No specific landing criteria.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT INFO  —  click-through detail for diagram elements
// ─────────────────────────────────────────────────────────────────────────────

export const ELEC_INFO = {

  strgen: {
    title: 'Starter / Generator',
    items: [
      'Dual-use: acts as a starter during engine start, then switches to generator once the engine is self-sustaining.',
      '28 VDC / 300 amp — primary source of aircraft electrical power.',
      'Located on the left side of the engine accessory compartment; cooled by an air intake duct from the left engine cowl.',
      'Generator Control Unit (GCU) in the rear cockpit keeps output within limits.',
      'GEN switch in either cockpit is magnetically held and electrically interlocked — turning one ON trips the other to OFF.',
      'Generator may be reset with the GEN RESET button (either cockpit) or by cycling the GEN switch.',
      'When GEN warning illuminates, only the air conditioning is automatically shed.',
      'Power to the GEN switch itself comes through the GEN SW circuit breaker on the front cockpit generator bus.',
    ],
    photos: [
      { src: '/systems/elec/starter1.webp', caption: 'Starter / generator' },
      { src: '/systems/elec/starter2.webp', caption: 'Starter / generator' },
    ],
  },

  battery: {
    title: 'Main Battery (42 Ah)',
    items: [
      '24 VDC, 42 Ah aerobatic lead-acid battery.',
      'Located in the left side of the engine accessory compartment.',
      'Powers engine starts and the full electrical system (except air conditioning) when the generator is not available.',
      'With Bus Tie OPEN (generator bus shed), provides at least 30 minutes of power to battery bus items.',
      'BAT switch in either cockpit is magnetically held and electrically interlocked — turning one ON trips the other to OFF.',
      'Do not connect external power if battery voltage is below 22.0 V.',
      'Minimum 23.5 V required for a battery ground start.',
      'Charged by the generator (needs ≥25 V) with Bus Tie in NORM or by external power. Positive amps indicate the battery is charging',
    ],
    photos: [
      { src: '/systems/elec/Battery.webp', caption: 'Main battery (42 Ah)' },
    ],
  },

  auxbat: {
    title: 'Auxiliary Battery (5 Ah)',
    items: [
      '24 VDC, 5 Ah — located in the left avionics compartment (left E-bay).',
      'Controlled by the AUX BAT switch on the front cockpit right console only.',
      'In an emergency (battery and generator both failed), powers: Backup Flight Instrument (BFI), COM 2 / standby VHF, and Fire Detection Loop #1.',
      'Provides approximately 30 minutes of power — excessive radio transmissions reduce this.',
      'Normally charged through the Fwd Bat Bus via the generator; Bus Tie must be NORM to allow charging.',
      'Aux Bat will not charge if the AUX BAT circuit breaker (front cockpit battery bus panel) is popped.',
      'Power level tested by holding the AUX BAT test switch (system test panel, front cockpit) for ≥5 seconds — light must remain illuminated.',
    ],
    photos: [
      { src: '/systems/elec/auxbat.webp', caption: 'Auxiliary battery (5 Ah)' },
    ],
  },

  extpwr: {
    title: 'External Power Receptacle',
    items: [
      'Located on the left aft fuselage, below the left avionics bay door.',
      'Controlled by the BAT switch — battery switch must be ON and battery voltage ≥22 V before connecting.',
      'Distributes power on the battery bus side; also powers the starter branch and charges the battery.',
      'Aircraft is internally protected against external power over/under voltage — a voltage sensor between the receptacle and the external power relay will automatically disconnect external power if voltage exceeds limits.',
      'External power is disconnected once the engine reaches self-sustaining speed (~50% N1) and the starter relay opens.',
    ],
    photos: [
      { src: '/systems/elec/extpwr.webp', caption: 'External power receptacle' },
    ],
  },

  bustierly: {
    title: 'Bus Tie Switch',
    items: [
      'Located on the front cockpit right console only.',
      'NORM (closed): generator feeds both the generator bus and battery bus, and charges the battery.',
      'OPEN: battery and generator buses are isolated — BUS TIE caution illuminates on EICAS.',
      'With Bus Tie OPEN and generator failed: battery powers battery bus items only for at least 30 minutes.',
      'With Bus Tie OPEN and generator operative: generator continues to power only generator bus items; battery is not charged.',
      'Opening the bus tie during a generator failure sheds generator bus load, extending battery life.',
    ],
    photos: [],
  },

  avimstrrly: {
    title: 'Avionics Master Switch',
    items: [
      'Located on the front cockpit right console only.',
      'De-energizes the avionics master relays (relays close) to allow power to flow to the avionics buses.',
      'Fwd Bat Bus → Fwd Avi Bat Bus; Fwd Gen Bus → Fwd Avi Gen Bus.',
      'If the Avionics Master circuit breaker (Bat CB Panel) pops, the relays de-energize and close regardless of switch position — avionics buses will be powered even with the switch OFF.',
    ],
    photos: [],
  },

  hotbatbus: {
    title: 'Hot Battery Bus',
    items: [
      'Powered directly from the battery — always live whenever the battery is connected and has voltage, regardless of the BAT switch position.',
      'Circuit breakers are in the left side of the engine accessory compartment (not accessible in flight).',
      'Items: Clock, ELT, Chip Detector, Emergency Flaps, OBOGS, Ram Air Valve, FDR Maintenance, Battery Switch.',
    ],
    photos: [
      { src: '/systems/elec/hotbat.webp', caption: 'Hot battery bus' },
    ],
  },

  fwdbatbus: {
    title: 'Forward Battery Bus',
    items: [
      'Normally powered by the generator through the Bus Tie; powered by the battery alone if the generator fails.',
      'BAT BUS warning illuminates when this bus is inoperative or voltage drops below ~11.8 V.',
      'Key items: IAC 1, UFCP, RH MFD, PMU, EDM, HYD SYS, Landing Gear Control, Flap Control, Prop Sys, Trim, Starter, Boost Pump, Ignition, AOA, Audio. IE critical equipment',
      'Also supplies power to: Aft Bat Bus, Fwd Avi Bat Bus, and Aux Bat Bus.',
    ],
    photos: [],
  },

  fwdavibatbus: {
    title: 'Fwd Avionics Battery Bus',
    items: [
      'Powered by the Fwd Bat Bus via the Avionics Master relay.',
      'Powers the Center MFD in the front cockpit.',
      'Has both a bus-isolation CB and individual item CBs — all on the Battery CB Panel.',
    ],
    photos: [],
  },

  fwdauxbatbus: {
    title: 'Fwd Auxiliary Battery Bus',
    items: [
      'Normally powered by the Fwd Bat Bus; powered by the Aux Battery in an emergency (AUX BAT switch ON) for 30 minutes.',
      'Powers: Radio Relays, IRS, COM 2 / Standby VHF, STBY INST, and Fire 1.',
      'CB section labeled "STANDBY" on the Battery CB Panel.',
    ],
    photos: [],
  },

  aftbatbus: {
    title: 'Aft Battery Bus',
    items: [
      'Powered by the Fwd Bat Bus.',
      'Powers the rear cockpit UFCP and RH MFD.',
      'Bus CB on the Battery CB Panel — can be isolated from the front cockpit for single-pilot operations.',
    ],
    photos: [],
  },

  aftauxbatbus: {
    title: 'Aft Auxiliary Battery Bus',
    items: [
      'Powered by the Fwd Aux Bat Bus.',
      'Powers rear cockpit STBY INST.',
      'Bus CB on the Battery CB Panel — can be isolated from the front cockpit for single-pilot operations.',
    ],
    photos: [],
  },

  aftavibatbus: {
    title: 'Aft Avionics Battery Bus',
    items: [
      'Powered by the Fwd Avi Gen Bus (not the Fwd Avi Bat Bus — note the cross-side feed).',
      'Powers the Center MFD in the aft cockpit.',
      'Bus CB on the Battery CB Panel — can be isolated for single-pilot operations.',
    ],
    photos: [],
  },

  genbus: {
    title: 'Generator Bus (GEN BUS)',
    items: [
      'Top-level generator-side bus fed directly by the starter/generator.',
      'Powers the Fwd Gen Bus and also feeds the Cond Blower, Heat Exchanger Blower, and Bus Sense.',
      'GEN BUS warning illuminates when this bus (and its associated avionics buses) is lost.',
      'With Bus Tie NORM and generator operative, also charges the battery and feeds the battery bus.',
    ],
    photos: [],
  },

  fwdgenbus: {
    title: 'Forward Generator Bus',
    items: [
      'Powered when the GEN switch is placed ON.',
      'GEN BUS warning illuminates when this bus is inoperative.',
      'Highest-load item: Air Conditioning.',
      'Key items: Air Cond, Fuel Balance, NWS, TAD, Speed Brake, EDM, Fire Det #2, AOA/Pitot/TAT Heat, Side/Nav/Taxi Lights, Trim Indicator, Seat Adjust, DVR/DTS, HOTAS, Evaporator Blower, Audio, Generator switch, and Cockpit temp.',
      'Also supplies power to: Aft Gen Bus and Fwd Avi Gen Bus.',
    ],
    photos: [],
  },

  fwdavigenbus: {
    title: 'Fwd Avionics Generator Bus',
    items: [
      'Powered by the Fwd Gen Bus via the Avionics Master relay.',
      'Powers critical avionics for instrument flight.',
      'Items: IAC 2, LH MFD (front), ADC, IRS, RAD ALTM, DME, XPDR, TCAS, COM 1, Radio Relays, VHF NAV.',
      'Has both a bus-isolation CB and individual item CBs — all on the Generator CB Panel.',
      'Also supplies power to the Aft Avi Gen Bus and Aft Avi Bat Bus.',
    ],
    photos: [],
  },

  aftgenbus: {
    title: 'Aft Generator Bus',
    items: [
      'Powered by the Fwd Gen Bus.',
      'Powers rear cockpit generator bus items: Evap Blower, Seat Adj, Trim Ind, Side Lights, Audio.',
      'Bus CB on the Generator CB Panel — can be isolated for single-pilot operations.',
    ],
    photos: [],
  },

  aftavigenbus: {
    title: 'Aft Avionics Generator Bus',
    items: [
      'Powered by the Fwd Avi Gen Bus.',
      'Powers the LH MFD in the aft cockpit.',
      'Bus CB on the Generator CB Panel — can be isolated for single-pilot operations.',
    ],
    photos: [],
  },

  MFD: {
    title: 'Multi-Function Display (MFD)',
    items: [
      'Note: Automatic screen reversion behavior upon MFD failure is not depicted here.',
      'If a single MFD fails, the system ensures PFD and EICAS are always presented — PFD reverts center → left → right; EICAS reverts right → left → center.',
      'If two MFDs fail in the same cockpit, the remaining MFD reverts to PFD (airborne) or EICAS (on ground); pilot may then select any screen.',
      'Upon Master Caution or Master Warning, the remaining MFD automatically switches to EICAS while retaining follow-on screen access.',
    ],
    photos: [],
  },

};