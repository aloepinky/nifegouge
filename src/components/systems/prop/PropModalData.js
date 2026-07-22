// ─────────────────────────────────────────────────────────────────────────────
//  T-6B Propeller System — Modal Content (rendered by the shared BriefingModal)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  TAB DATA
// ─────────────────────────────────────────────────────────────────────────────

export const PROP_VERBATIM = {
  heading: 'Propeller System NATOPS Intro (helpful to memorize)',
  quote: `"The power turbine drives the aluminum 97-inch, fourbladed, constant-speed, variable-pitch, non-reversing, feathering propeller through the reduction gearbox. The propeller system is designed to maintain a constant speed of 2000 RPM (100% NP) during most flight conditions."`,
};
 
// ─────────────────────────────────────────────────────────────────────────────
//  NUMBERS
// ─────────────────────────────────────────────────────────────────────────────
 
export const PROP_NUMBERS = {
  heading: 'Propeller System Numbers',
  items: [
    { section: 'Propeller Physical Specs' },
    {
      value: '100%  MAX',
      label: 'NP maximum — normal operations with PMU on.',
      highlight: true,
    },
    {
      value: '100 ± 2%',
      label: 'Mechanical overspeed governor limit — activates when PMU is OFF',
      highlight: true,
    },
    {
      value: '46 – 50%  (ground)',
      label: 'NP ground idle range',
      highlight: true,
    },
    {
      value: '62 – 80%  NP',
      label: 'Avoid stabilized ground operation in this range (ground resonance)',
      highlight: true,
    },
    {
      value: '110%  (20 sec)',
      label: 'NP transient limit — permissible during in-flight emergency completion',
      highlight: 'caution',
    },
    {
      value: '2000 RPM  =  100% NP',
      label: 'Design constant-speed — maintained during most flight conditions',
      highlight: false,
    },
    {
      value: '15°',
      label: 'Fine (flat/low) pitch — minimum blade angle, maximum drag',
      highlight: false,
    },
    {
      value: '86°',
      label: 'Feather pitch — maximum blade angle, minimum drag for engine-out glide',
      highlight: false,
    },
    {
      value: '~2,750 ft-lbs',
      label: '100% torque at sea level, no airspeed (approximate)',
      highlight: false,
    },
    {
      value: '~2,900 ft-lbs',
      label: '100% torque at altitude — available up to roughly 12,000–16,000 ft MSL',
      highlight: false,
    },
  ],
};
 
// ─────────────────────────────────────────────────────────────────────────────
//  EICAS MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
 
export const PROP_EICAS = {
  heading: 'Propeller System EICAS Messages',
  items: [
    {
      label: 'PMU FAIL',
      color: 'warning',
      cause:
        'PMU has failed completely. Loss of automatic fuel scheduling, propeller governing, ground idle control, NP limiting above 80% at altitude, auto-abort capability, and airstart protection. Propeller will revert to mechanical overspeed governor (100 ± 2% NP). Engine remains controllable via PCL but response is no longer linear and limits are not automatically enforced.',
      response:
        'Execute PMU FAILURE EP. PCL — set minimum practical power, PMU — OFF, check circuit breakers, attempt PMU reset. If PMU cannot be restored, land as soon as practical.',
    },
    {
      label: 'PMU STATUS',
      color: 'caution',
      cause:
        'PMU has detected and accomodated a fault in-flight, or WOW switch failure. PMU remains online but has logged a detected anomaly. Also illuminates during normal ground operations when the WOW switch disagrees.',
      response:
        'Execute PMU FAULT EP. On the ground: toggle PMU switch. In the air: no corrective action available — PMU has deteected a discrepency in the WOW switch.',
    },
  ],
};
 
// ─────────────────────────────────────────────────────────────────────────────
//  EMERGENCY PROCEDURES
// ─────────────────────────────────────────────────────────────────────────────
 
export const PROP_EPS = {
  heading: 'Propeller System Emergency Procedures',
  items: [
    {
      title: 'UNCOMMANDED POWER CHANGES/LOSS OF POWER/UNCOMMANDED PROP FEATHER',
      subtitle: 'Used Whenever Unexpected Power Loss or Thrust Reduction Occurs',
      memory: true,
      indications: [
        'Most apparent indication: uncommanded reduction in power or thrust.',
        'May include: NP spike due to feather, torque decay, N1 decay, lower fuel flow.',
        'Could indicate PMU fault, PIU fault, oil/engine/fuel system contamination, propeller dump solenoid failure, or prop sleeve touchdown.',
        'Uncommanded propeller feather: rapid NP drop below 40% without pilot input. Torque spike.',
      ],
      procedure: [
        'PCL — MID RANGE.',
        'PMU SWITCH — OFF.',
        'PROP SYS CIRCUIT BREAKER (left front console) — PULL, IF NP STABLE BELOW 40%.',
        'PCL — AS REQUIRED.',
        'If power is sufficient for continued flight:',
        'PEL — EXECUTE.',
        'If power is insufficient to complete PEL:',
        'PROP SYS circuit breaker — RESET; AS REQUIRED.',
        'PCL — OFF.',
        'FIREWALL SHUTOFF handle — PULL.',
        'Execute Forced Landing or Eject.',
      ],
      landing: 'PEL if power sufficient. Forced Landing or Eject if power insufficient to complete PEL.',
    },
    {
      title: 'PMU FAILURE',
      subtitle: '',
      memory: false,
      indications: [
        'Simultaneous PMU FAIL warning and PMU STATUS caution on EICAS.',
        'Possible step change in power.',
      ],
      procedure: [
        'PCL — MINIMUM PRACTICAL FOR FLIGHT.',
        'PMU switch — OFF.',
        'IGN, START, and PMU circuit breakers (left front console) — CHECK, RESET IF NECESSARY.',
        'PMU switch — NORM (attempt second reset if necessary).',
        'If PMU reset is unsuccessful:',
        'PMU switch — OFF.',
        'Land as soon as practical.',
      ],
      landing: 'Land as soon as PRACTICAL if PMU cannot be restored.',
    },
    {
      title: 'PMU FAULT',
      subtitle: '',
      memory: false,
      indications: [
        'PMU STATUS caution on EICAS.',
      ],
      procedure: [
        'ON GROUND: PMU switch — OFF, THEN NORM. If PMU STATUS caution remains illuminated, confirm source of fault prior to flight.',
        'IN FLIGHT: PMU has detected a discrepancy in the weight-on-wheels switch. A reset is not possible.',
      ],
      landing: 'No specific landing criteria.',
    },
  ],
};
 
// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT INFO  —  click-through detail for diagram elements
// ─────────────────────────────────────────────────────────────────────────────
 
export const PROP_INFO = {

  propservo: {
    title: 'Prop Servo Valve',
    items: [
      'Used when engine is shut down with PCL and PMU in NORM — does not function if PMU is OFF.',
      'PMU sends a signal to the valve upon PCL cutoff.',
      'Quickly drains oil out of the pitch change mechanism, allowing springs and counterweights to drive blades to feather.',
      'Activates alongside the Feather Dump Solenoid Valve when PCL is moved to cutoff.',
    ],
    photos: [],
  },

  featherdump: {
    title: 'Feather Dump Solenoid Valve',
    items: [
      'Activated by micro-switches when PCL is moved to cutoff position.',
      'Receives power from the PROP SYS circuit breaker.',
      'Does not require any signal from the PMU — functions regardless of PMU state.',
      'Activates alongside the Prop Servo Valve when PCL is moved to cutoff.',
    ],
    photos: [],
  },

  piu: {
    title: 'PIU (Propeller Interface Unit)',
    items: [
      'Located on top of the RGB.',
      'Responds to power requests from the PMU by regulating oil flow to the pitch change mechanism.',
      'Electronically governed by the PMU to maintain 100% NP under normal operations.',
      'Contains a backup mechanical overspeed governor — used if PMU is turned off or fails.',
      'Backup governor keeps prop RPM at 100±2% NP.',
    ],
    photos: [{ src: '/systems/prop/piu.png', caption: 'PIU mounted on top of the RGB' }],
  },
};

