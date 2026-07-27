// ─────────────────────────────────────────────────────────────────────────────
//  T-6B Fuel System — Modal Content (rendered by the shared BriefingModal)
//
//  A study reference, not a substitute for the publication: phrasing is kept short
//  and plain rather than quoted verbatim, matching the other systems pages. Content
//  follows the FAM4302 fuel brief and the pocket checklist, and never contradicts
//  NATOPS (TO 1T-6B-1, pp. 1-21 … 1-24). Where the brief and NATOPS disagree, NATOPS wins:
//    · boost pump comes up automatically with the PCL ABOVE idle (brief: "PMU when PCL to idle")
//    · flip-flop valve gives a minimum of 60 seconds inverted (brief: 15 seconds)
//    · L/R FUEL LO trips at approximately 110 lbs (one brief callout says 100)
//
//  EP entries carry the checklist steps only. The notes, warnings and cautions are
//  deliberately left out — go to the publication for those.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  TAB DATA
// ─────────────────────────────────────────────────────────────────────────────

export const FUEL_VERBATIM = {
  heading: 'Fuel System NATOPS Intro (helpful to memorize)',
  quote: `"The fuel system provides approximately 1100 pounds of usable fuel through the single-point refueling system. Approximately 100 pounds additional fuel is available if manually filled to the base of the filler neck in each wing tank. Single-point pressure refueling is the primary refueling method. Three integral tanks built into a single-piece wing provide fuel storage."`,
};

// ─────────────────────────────────────────────────────────────────────────────
//  NUMBERS
//  Red is reserved for the two real warnings (10 psi, 800 PPH), amber for the
//  caution thresholds. Capacities, probe bands and time limits stay plain.
// ─────────────────────────────────────────────────────────────────────────────

export const FUEL_NUMBERS = {
  heading: 'Fuel System Numbers',
  items: [
    { section: 'Usable Fuel' },
    {
      value: '530 / 40 / 530',
      label: 'Left wing / collector / right wing, single-point refuel — 1100 lbs total',
      highlight: false,
    },
    {
      value: '580 / 40 / 580',
      label: 'Over the wing, gravity refuel — 1200 lbs total',
      highlight: false,
    },

    { section: 'Fuel Probes' },
    {
      value: '7 probes  (3 / 1 / 3)',
      label: 'Three per wing, one in the collector',
      highlight: false,
    },
    {
      value: '445 ± 50 lbs',
      label: 'Outer probe lower limit',
      highlight: false,
    },
    {
      value: '308 ± 50 lbs',
      label: 'Middle probe lower limit',
      highlight: false,
    },
    {
      value: '≈ 20 lbs',
      label: 'Inner probe lower limit — the collector splits its 40 lbs evenly between the two tanks',
      highlight: false,
    },

    { section: 'Fuel Balance' },
    {
      value: '≥ 20 lbs  /  30 sec',
      label: 'Auto fuel balance kicks in. Closes transfer valve to the light tank, so only the heavy tank feeds the collector',
      highlight: false,
    },
    {
      value: '30 lbs  /  2 min',
      label: 'Not back under 30 lbs in time — FUEL BAL caution, auto balance quits',
      highlight: 'caution',
    },
    {
      value: '50 lbs',
      label: 'Maximum allowable lateral fuel imbalance',
      highlight: 'caution',
    },

    { section: 'Warning / Caution Thresholds' },
    {
      value: '< 10 psi',
      label: 'FUEL PX — low pressure switch activates the boost pump',
      highlight: 'warning',
    },
    {
      value: '≥ 800 PPH',
      label: 'Fuel system malfunction and possible engine failure',
      highlight: 'warning',
    },
    {
      value: '≈ 110 lbs',
      label: 'L / R FUEL LO activated — optical sensors, independent of the probes',
      highlight: 'caution',
    },
    {
      value: '150 lbs',
      label: 'EICAS fuel bars and total turn yellow — aerobatics prohibited below 150 lbs per side',
      highlight: 'caution',
    },

    { section: 'Time Limits' },
    {
      value: '10 hours',
      label: 'High pressure pump suction feeding',
      highlight: false,
    },
    {
      value: '60 seconds',
      label: 'Inverted flight fuel, from the flip-flop pickup valve',
      highlight: false,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EICAS
//  Covers all seven annunciators on the diagram; L and R FUEL LO share an entry.
// ─────────────────────────────────────────────────────────────────────────────

export const FUEL_EICAS = {
  heading: 'Fuel System EICAS Messages',
  items: [
    {
      label: 'FUEL PX',
      color: 'warning',
      cause: 'Low pressure switch senses under 10 psi in the motive flow/return flow supply line.',
      response: 'Execute LOW FUEL PRESSURE. If it stays lit, the high pressure pump is suction feeding — 10 hour limit, no airstart.',
    },
    {
      label: 'FUEL BAL',
      color: 'caution',
      cause: 'Indicated imbalance over 30 lbs for 2 minutes, or a fuel probe failure. Auto balance shuts off.',
      response: 'Execute FUEL IMBALANCE. Reset with FUEL BAL to MAN/RESET then back to AUTO — may take several tries, and will not fix a failed probe.',
    },
    {
      label: 'FP FAIL',
      color: 'caution',
      cause: 'Fuel probe failure, always paired with FUEL BAL. That tank reads down to the next probe once the failed one is in use.',
      response: 'Execute FUEL PROBE MALFUNCTION. Auto balance is gone; do not balance manually — the imbalance may not be real.',
    },
    {
      label: 'L / R FUEL LO',
      color: 'caution',
      cause: 'Under about 110 lbs in that wing. Optical sensors, independent of the probes and gauges, so they stay honest through a probe failure.',
      response: 'No prescribed procedure.',
    },
    {
      label: 'BOOST PUMP',
      color: 'advisory',
      cause: 'Boost pump running — switch ON, low pressure switch with the PCL above IDLE, or any time the starter is engaged.',
      response: 'Normal for start. In flight, look for a FUEL PX warning with it.',
    },
    {
      label: 'M FUEL BAL',
      color: 'advisory',
      cause: 'FUEL BAL switch in MAN/RESET, which enables the MANUAL FUEL BAL switch.',
      response: 'Normal while balancing by hand. Back to AUTO once corrected, then watch that it holds.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EMERGENCY PROCEDURES
//  Checklist steps only. Stored in brief order; the diagram passes sortMemoryFirst,
//  which floats the two critical-action EPs to the top at render.
// ─────────────────────────────────────────────────────────────────────────────

export const FUEL_EPS = {
  heading: 'Fuel System Emergency Procedures',
  items: [
    {
      title: 'LOW FUEL PRESSURE',
      subtitle: 'Critical Action Procedure',
      memory: true,
      indications: [
        'FUEL PX warning.',
        'BOOST PUMP advisory may come up on its own.',
      ],
      procedure: [
        'PEL — EXECUTE.',
        'BOOST PUMP switch — ON.',
      ],
      landing: 'Land as soon as POSSIBLE',
    },
    {
      title: 'FUEL IMBALANCE',
      subtitle: '',
      memory: false,
      indications: [
        'FUEL BAL caution.',
        'Gauges split. Expect heavier lateral stick forces.',
      ],
      procedure: [
        'Fuel gages — VERIFY IMBALANCE AND CHECK FOR FUEL LEAKS.',
        'FUEL BAL circuit breaker (right front console) — CHECK, RESET IF OPEN.',
        'FUEL BAL switch — MAN/RESET.',
        'MANUAL FUEL BAL switch — TO LOW TANK.',
        'Fuel gages — MONITOR.',
        'If fuel imbalance is corrected:',
        'MANUAL FUEL BAL switch — OFF.',
        'FUEL BAL switch — AUTO, IF DESIRED.',
      ],
    },
    {
      title: 'LEAKING FUEL FROM WING',
      subtitle: '',
      memory: false,
      indications: [
        'Visible leak, or an imbalance that keeps growing.',
        'Burn from the leaking tank — selecting the NON-LEAKING tank stops its motive flow, so the engine draws from the leaking side.',
      ],
      procedure: [
        'Aircraft structure — VISUALLY INSPECT FOR SIGN OF LEAKAGE.',
        'IF LEAKING FUEL OVERBOARD:',
        'FUEL BAL switch — MAN/RESET.',
        'MANUAL FUEL BAL switch — TO NON-LEAKING TANK.',
        'MANUAL FUEL BAL switch — TO LEAKING TANK ONCE EMPTY.',
        'Land as soon as possible.',
      ],
      landing: 'Land as soon as POSSIBLE.',
    },
    {
      title: 'FUEL PROBE MALFUNCTION',
      subtitle: '',
      memory: false,
      indications: [
        'FP FAIL caution with FUEL BAL caution.',
        'Quantity may read low, often as a rapid drop in indication.',
        'Auto balance is inoperative; do not balance manually.',
      ],
      procedure: [
        'Fuel gages and fuel flow — VERIFY INDICATIONS.',
        'EDM circuit breakers (left and right front console) — CHECK, RESET IF OPEN.',
        'Land as soon as practical if fuel state cannot be verified.',
      ],
      landing: 'Land as soon as PRACTICAL if fuel state cannot be verified.',
    },
    {
      title: 'HIGH FUEL FLOW',
      subtitle: 'Critical Action Procedure — no associated warning or caution',
      memory: true,
      indications: [
        'Fuel flow 800 PPH or greater.',
        'No EICAS message for it — the flow indication is the only cue.',
      ],
      procedure: [
        'IF FUEL FLOW IS 800 PPH OR GREATER:',
        'PEL — EXECUTE.',
      ],
      landing: 'Land as soon as POSSIBLE',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT INFO  —  click-through detail for diagram elements
//  Keyed to the click targets in T6BFuelDiagram.js. Left and right wings share one
//  entry each, as do the seven fuel probes: the parts are identical, and splitting
//  them would only duplicate the text.
// ─────────────────────────────────────────────────────────────────────────────

export const FUEL_INFO = {

  // ── Engine / center column ─────────────────────────────────────────────────

  pcl: {
    title: 'Power Control Lever',
    items: [
      'Commands the FMU two ways: mechanically through a cable, and electrically through the PMU.',
      'Above IDLE is the condition the low pressure switch needs before it can bring the boost pump up on its own.',
      'Pulling the PCL to cutoff shuts the FMU, which is what stops fuel to the engine on a normal shutdown.',
    ],
  },

  pmu: {
    title: 'PMU (Power Management Unit)',
    items: [
      'Carries the PCL’s electrical fuel schedule to the FMU.',
      'Fuel is only part of what it does — see the Propeller page for the full picture.',
    ],
  },

  fmu: {
    title: 'FMU (Fuel Management Unit)',
    items: [
      'Takes its inputs from the PCL, by cable and through the PMU.',
      'Meters the required amount of fuel to the flow divider and returns the excess to the high pressure pump.',
      'Mounted on the engine accessory section aft of the firewall, alongside the generator and the oil tank.',
      'From the flow divider, fuel goes to the manifold and nozzles — see TO ENGINE.',
    ],
    photos: [
      { src: '/systems/fuel/FMU.webp', caption: 'FMU on the engine accessory section, aft of the firewall' },
    ],
  },

  ffxmit: {
    title: 'Fuel Flow Transmitter',
    items: [
      'Flowmeter sitting between the FMU and the flow divider.',
      'Senses fuel flow to the engine and sends it to the EICAS through the EDM, in pounds per hour.',
    ],
  },

  toengine: {
    title: 'Fuel Manifold and Nozzles',
    items: [
      'The flow divider routes fuel through primary and secondary delivery tubes to 14 manifold adapters surrounding the gas generator case.',
      'Each adapter holds a fuel spray nozzle that protrudes into the combustion chamber.',
      'Two spray patterns: a mist for start, and a stream for sustainment.',
    ],
    photos: [
      { src: '/systems/fuel/toengine.webp', caption: 'Fuel manifold and nozzles around the gas generator case' },
    ],
  },

  hppump: {
    title: 'Engine Driven High Pressure Fuel Pump',
    items: [
      'Raises pressure again to feed the FMU.',
      'The engine will NOT run without it — failure means flameout, and it cannot be restarted.',
      'Returns unused fuel to the collector tank through the purge line.',
      'If both the electric boost pump and the low pressure pump fail, this pump suction feeds: the engine keeps running, but no airstart is possible.',
      'Suction feed operation is limited to 10 hours.',
    ],
  },

  lppump: {
    title: 'Engine Driven Low Pressure Fuel Pump',
    items: [
      'Raises fuel pressure in the line to feed the high pressure pump.',
      'Shares a common shaft with the external oil scavenge pump in the accessory compartment.',
      'The engine can keep running without it — the electric boost pump is its backup.',
      'Motive flow is tapped immediately downstream, so motive flow problems can point back to this pump.',
    ],
    photos: [
      { src: '/systems/fuel/lowpxpump.webp', caption: 'Engine driven low pressure fuel pump and the external oil scavenge pump' },
    ],
  },

  lpswitch: {
    title: 'Low Pressure Switch',
    items: [
      'Senses pressure in the motive flow/return flow supply line.',
      'Below 10 psi it activates the red FUEL PX warning and turns the electric boost pump on.',
    ],
  },

  purgeline: {
    title: 'Purge Line',
    items: [
      'Returns unused fuel from the engine driven high pressure pump to the collector tank.',
      'Runs aft through the firewall and drops into the top of the collector.',
    ],
  },

  filter: {
    title: 'Fuel Filter',
    items: [
      'Filters fuel before it reaches the engine driven pumps and the engine.',
      'Located in the single-point refueling bay, aft of the firewall.',
      'Carries a bypass indicator so maintenance can tell when the element has been bypassed.',
    ],
    photos: [
      { src: '/systems/fuel/bay1.webp', caption: 'Fuel filter and its bypass indicator' },
    ],
  },

  mxsov: {
    title: 'Maintenance Shutoff Valve',
    items: [
      'Manually operated — there is no cockpit control for it.',
      'Isolates the fuel system for engine or fuel filter maintenance.',
      'One of the two manual shutoff valves in the supply line to the engine; the firewall shutoff valve is the other.',
    ],
    photos: [
      { src: '/systems/fuel/bay1.webp', caption: 'Maintenance shutoff valve in the refueling bay' },
    ],
  },

  fwsov: {
    title: 'Firewall Shutoff Valve',
    items: [
      'Stops fuel flow to the engine. Controlled by the firewall shutoff handle on the front cockpit left console — front cockpit only.',
      'Lift the handle guard, rotate it out of the way, then pull the handle up 2 to 2.5 inches. Push the handle down to reset.',
      'Cable-operated, so it works with no electrical power.',
      'The same handle also closes the hydraulic and bleed air firewall valves.',
      'The valve itself is in the left side single-point refueling bay.',
    ],
    photos: [
      { src: '/systems/fuel/bay2.webp', caption: 'Refueling bay — the firewall shutoff valve sits behind this panel' },
      { src: '/systems/fuel/bay3.webp', caption: 'Firewall shutoff valve and its handle cable' },
    ],
  },

  // ── Collector tank ─────────────────────────────────────────────────────────

  collector: {
    title: 'Collector Tank',
    items: [
      'Holds 40 lbs of usable fuel and is the only tank that feeds the engine.',
      'Kept full and at a low positive pressure by the transfer jet pumps in both wings.',
      'Holds the primary jet pump, the fuel pickup (flip-flop) valve, the electric boost pump, the manifold valve and the collector fuel probe.',
      'Wing fuel gravity feeds inboard to it as well, so it keeps filling even with no motive flow.',
      'The purge line returns unused high pressure pump fuel here.',
    ],
  },

  primaryjet: {
    title: 'Primary Jet Pump',
    items: [
      'Same venturi principle as the transfer jet pumps, with no moving parts, powered off the motive flow line.',
      'Primary means of moving collector fuel out to the engine driven low pressure pump.',
      'Draws through the fuel pickup (flip-flop) valve.',
      'Its output merges with the electric boost pump at the manifold valve.',
    ],
  },

  flipflop: {
    title: 'Fuel Pickup (Flip-Flop Valve)',
    items: [
      'Fuel pickup valve in the collector tank that supplies the primary jet pump.',
      'A weighted rod closes off the normal pickup and opens the inverted flight pickup when the aircraft rolls inverted.',
      'Provides a minimum of 60 seconds of fuel regardless of orientation.',
      'Also prevents air ingestion into the fuel system.',
      'Negative G operating limits are in Section V — the valve is not a licence to stay inverted.',
    ],
  },

  manifoldvalve: {
    title: 'Manifold Valve',
    items: [
      'Directs fuel from either the primary jet pump or the electric boost pump into the main fuel line.',
      'Everything the engine burns leaves the collector tank through here.',
    ],
  },

  boostpump: {
    title: 'Electric Boost Pump',
    items: [
      'Provides fuel for engine start and backs up the engine driven low pressure pump.',
      'Sits in the collector tank and merges with the primary jet pump at the manifold valve.',
      'BOOST PUMP switch on the right forward switch panel, both cockpits. ON hard-selects the pump; ARM lets it come up on its own.',
      'In ARM it runs whenever the starter is engaged, regardless of fuel pressure, whenever the low pressure switch calls for it, and when the PMU calls it at IDLE.',
      'The green BOOST PUMP advisory illuminates any time the pump is running.',
      'BOOST PUMP circuit breaker is on the front cockpit battery bus (left console).',
    ],
  },

  starterrelay: {
    title: 'Starter Relay',
    items: [
      'Closes with the starter switch.',
      'Powers the electric boost pump any time the starter is engaged, regardless of fuel pressure — which is why BOOST PUMP is a normal advisory during start.',
    ],
  },

  // ── Wing tanks ─────────────────────────────────────────────────────────────

  wingtank: {
    title: 'Wing Fuel Tank',
    items: [
      'Three integral tanks are built into the single-piece wing: one per wing plus the collector.',
      'Single-point refuel gives 530 lbs a wing and 40 in the collector — 1100 lbs total.',
      'Over the wing gives 580 lbs a wing — 1200 lbs total, about 100 lbs more.',
      'Wing tanks feed the collector only. Fuel never transfers from one wing to the other.',
      'Fuel gravity drains from the outboard cavities to the inboard cavities, where the transfer jet pumps pick it up.',
    ],
  },

  transferjet: {
    title: 'Transfer Jet Pump',
    items: [
      'Two per wing tank, with no moving parts.',
      'Uses a venturi effect off the motive flow line to draw fuel from the wing and push it to the collector.',
      'Keeps the collector full and at a low positive pressure.',
      'If motive flow stops, wing fuel still gravity feeds inboard toward the collector.',
    ],
  },

  transfervalve: {
    title: 'Transfer Valve (Solenoid Valve)',
    items: [
      'One valve per wing, in that wing’s motive flow line.',
      'Closed, it stops motive flow to that wing’s transfer jet pumps, so that tank stops transferring while the other keeps feeding the collector.',
      'Auto balance closes the valve to the LIGHT tank once the wings are 20 lbs or more apart for 30 seconds.',
      'MANUAL FUEL BAL L or R closes that wing’s valve; OFF opens both. The switch is only live with FUEL BAL in MAN/RESET.',
      'Selecting the NON-leaking tank is what makes the engine burn from a leaking wing.',
      'FUEL BAL circuit breaker is on the front cockpit generator bus (right front console).',
    ],
  },

  probe: {
    title: 'Fuel Level Probe',
    items: [
      'Seven probes: outer, middle and inner in each wing, plus one in the collector.',
      'Each wing probe senses one band as the tank empties — outer to approximately 445 ± 50 lbs, middle to approximately 308 ± 50 lbs, inner to approximately 20 lbs.',
      'The collector probe has no band. It always splits the collector’s 40 lbs evenly, adding 20 lbs to each side’s indication.',
      'A failed probe illuminates FP FAIL and FUEL BAL and shuts off auto balance.',
      'If the failed probe is not the one in use, the gauge shows no imbalance at all. Once it does come into use, that tank’s indication drops to the next probe and sits there.',
      'Do not balance manually with FP FAIL illuminated — the indicated imbalance may not be real.',
      'Quantity indicating runs through the EDM; its circuit breakers are on the left and right front console.',
    ],
  },

  lowlevel: {
    title: 'Fuel Low Level Sensor',
    items: [
      'One optical sensor in each wing tank.',
      'Illuminates the L FUEL LO or R FUEL LO caution below approximately 110 lbs in that tank.',
      'Completely independent of the fuel probes and the quantity gauges, so it stays honest through a probe failure.',
      'FUEL QTY LO circuit breaker is on the front cockpit battery bus.',
    ],
  },

  floatvalve: {
    title: 'Float Valve',
    items: [
      'Sits at the outboard end of the tank, on its own line to the overboard outlet.',
      'The tank’s main vent path — air leaves through it as fuel goes in.',
      'Closes when fuel reaches it, so a full tank or banked aircraft does not vent fuel outboard.',
      'Once closed, the pressure relief check valves provide pressure balance.',
    ],
  },

  ventsystem: {
    title: 'Vent System',
    items: [
      'Each wing tank is vented, and a cross vent line joins the two wings.',
      'Venting prevents both fuel spillage and a vacuum forming in the tank as fuel is used.',
      'Vacuum relief lines let air back in; pressure relief lines let excess pressure out.',
      'Parking on a ramp with more than 1% slope may vent fuel overboard through a pressure relief valve.',
    ],
  },

  reliefvalve: {
    title: 'Pressure Relief Valve',
    items: [
      'Protects the tank from over-pressurization by venting overboard.',
      'Passive — there is no cockpit control.',
      'Parking on a ramp with more than 1% slope may vent fuel overboard through it.',
    ],
  },

  fillerport: {
    title: 'Gravity Filler Port',
    items: [
      'Over-the-wing filler cap on each wing, used for gravity refueling.',
      'Gives about 100 lbs (roughly 15 gallons) more than single-point — 1200 lbs total instead of 1100.',
      'Fills that wing only. The wings then gravity feed the collector.',
      'Seat the cap with the arrow forward and the tab folded aft.',
    ],
    photos: [
      { src: '/systems/fuel/overthewing.webp', caption: 'Over-the-wing fuel cap' },
    ],
  },

  // ── Single-point refuel / defuel ───────────────────────────────────────────

  adapter: {
    title: 'Pressure Refueling/Defueling Adapter',
    items: [
      'Single-point connection in the left wing root refueling bay.',
      'Primary refueling method — fills all three tanks simultaneously to 1100 lbs.',
      'The same adapter is used to defuel the aircraft.',
    ],
    photos: [
      { src: '/systems/fuel/singlepoint.webp', caption: 'Single-point refueling connection in the left wing root bay' },
    ],
  },

  precheckvalve: {
    title: 'Pre-Check Valve',
    items: [
      'One per wing, in the refueling bay, operated by hand before single-point refueling.',
      'Tests the level control shutoff system: it pressurizes the pilot line as though the tank were full.',
      'The level control shutoff valve should close and fuel flow should stop — proving the tank will shut off on its own when it fills.',
    ],
    photos: [
      { src: '/systems/fuel/singlepoint.webp', caption: 'LH/RH pre-check valves in the refueling bay' },
    ],
  },

  pilotvalve: {
    title: 'Level Control Pilot Valve',
    items: [
      'At the outboard end of each wing tank.',
      'Senses the tank is full and signals the level control shutoff valve down the pilot line.',
      'The pre-check valve exercises this same signal path on the ground before refueling.',
    ],
  },

  lcsovrefuel: {
    title: 'Level Control Shutoff Valve (Refuel Only)',
    items: [
      'In each wing’s single-point fill line.',
      'Closes on the pilot valve’s signal, ending that wing’s fill at 530 lbs.',
      'This is the valve the pre-check confirms before fuel is put in the aircraft.',
    ],
  },

  lcsovdefuel: {
    title: 'Level Control Shutoff Valve (Defuel Only)',
    items: [
      'In the collector tank, and only in the path during defueling.',
      'Opens the collector to the defuel line so the collector can be drained back out through the adapter.',
    ],
  },

  refueldefuelvalve: {
    title: 'Refuel/Defuel Valve',
    items: [
      'Butterfly type check valve admitting single-point fuel up into the collector tank.',
      'One-directional — blocks collector fuel from flowing back down into the refuel line.',
    ],
  },

  // ── Indicating ─────────────────────────────────────────────────────────────

  edm: {
    title: 'EDM (Engine Data Manager)',
    items: [
      'Runs both the fuel quantity indicating system and the auto balance system, and sends the results to the EICAS.',
      'Auto balance keeps the wing tanks within 20 lbs of each other.',
      'A 20 lb imbalance held for 30 seconds closes the transfer valve to the light tank, so only the heavy tank feeds the collector.',
      'If the imbalance is not back under 30 lbs within 2 minutes, the FUEL BAL caution illuminates and auto balance shuts off.',
      'Reset by moving FUEL BAL to MAN/RESET and back to AUTO. It may take several resets, and it will not fix a failed probe.',
      'EDM circuit breakers are on the left and right front console.',
    ],
  },

  fuelqty: {
    title: 'Fuel Quantity Indicator',
    items: [
      'In the EICAS environmental area — one bar per wing tank plus a totalizer.',
      'The collector’s 40 lbs is split evenly between the two bars, 20 lbs a side.',
      'Bars and total turn yellow at 150 lbs.',
      'Aerobatics are prohibited with indications below 150 lbs per side.',
      'BINGO is pilot-set through the UFCP, 0 to 1200 lbs, default 400. A "BINGO, BINGO" audio alert sounds when the totalizer reaches the set value and keeps sounding until a lower value is set.',
    ],
  },

};
