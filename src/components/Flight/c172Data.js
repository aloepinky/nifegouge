// The C172's EPs and limits as NIFE's exam asks them. Pure data, no JSX.
//
// An EP is a title and its rows in the order the exam sheet prints them. A row is a step
// ({ id, critical, text }: one box, answered as the checklist prints it, "Mixture - IDLE
// CUTOFF"), a decision line ({ decision }), or a line of fixed text ({ note }). This is the shape
// the EPs/Limits upload will produce for any aircraft; `EPDrill` renders it. A step's control is
// the text before " - ", which is how a control click finds and rewrites its step.

const step = (id, action, value = '') => ({ id, critical: true, text: value ? `${action} - ${value}` : action });

export const C172_EPS = [
  {
    id: 'efat',
    title: 'ENG FAIL AFTER TAKEOFF / FORCED LANDING',
    rows: [
      step('efat1', 'Airspeed', '68 KIAS'),
      step('efat2', 'Turn Towards Nearest Suitable Landing Site'),
      step('efat3', 'Fuel Selector', 'OFF'),
      step('efat4', 'Mixture', 'IDLE CUTOFF'),
      step('efat5', 'Flaps', 'AS REQ'),
      step('efat6', 'Mags', 'OFF'),
      step('efat7', 'Master', 'OFF'),
      step('efat8', 'Doors', 'UNLATCHED'),
    ],
  },
  {
    id: 'efif',
    title: 'ENGINE FAILURE IN FLIGHT',
    rows: [
      step('efif1', 'Airspeed', '68 KIAS'),
      step('efif2', 'Turn towards nearest suitable landing site'),
      { decision: 'If Restart Will Be Attempted' },
      step('efif3', 'Fuel Selector', 'BOTH'),
      step('efif4', 'Mixture', 'FULL RICH'),
      step('efif5', 'Throttle', 'FULL'),
      step('efif6', 'Carb Heat', 'ON'),
      step('efif7', 'Mags', 'BOTH (Start if prop stopped)'),
      step('efif8', 'Master', 'ON'),
      step('efif9', 'Primer', 'IN/LOCKED'),
    ],
  },
  {
    id: 'efiff',
    title: 'ENGINE FIRE IN FLIGHT',
    rows: [
      step('efiff1', 'Fuel Selector', 'OFF'),
      step('efiff2', 'Mixture', 'IDLE CUTOFF'),
      step('efiff3', 'Declare', 'MAYDAY'),
      step('efiff4', 'Master', 'OFF'),
      step('efiff5', 'Cabin Heat / Air', 'OFF'),
      step('efiff6', 'Turn Towards Nearest Suitable Landing Site'),
    ],
  },
  {
    id: 'abort',
    title: 'ABORT TAKEOFF',
    rows: [
      step('abort1', 'Throttle', 'IDLE'),
      step('abort2', 'Brakes', 'AS REQ'),
      step('abort3', 'Maintain Directional Control'),
      { decision: 'IF DUE TO FIRE/ENG FAIL' },
      step('abort4', 'Emergency Shutdown on Deck', 'EXECUTE'),
    ],
  },
  {
    id: 'esd',
    title: 'EMERGENCY SHUTDOWN ON DECK',
    rows: [
      step('esd1', 'Fuel Selector', 'OFF'),
      step('esd2', 'Mixture', 'IDLE CUTOFF'),
      step('esd3', 'Mags', 'OFF'),
      step('esd4', 'Master', 'OFF'),
      step('esd5', 'Aircraft', 'EVACUATE AS REQ'),
    ],
  },
  {
    id: 'efds',
    title: 'ENGINE FIRE DURING START',
    rows: [
      step('efds1', 'Cranking', 'CONTINUE'),
      { note: 'Continue until engine starts or until mags selected off.' },
      { decision: 'IF ENGINE STARTS' },
      step('efds2', 'Throttle', '1700 RPM (5 sec)'),
      step('efds3', 'Emergency Shutdown On Deck', 'EXECUTE'),
      { decision: 'IF ENGINE FAILS TO START' },
      step('efds4', 'Throttle', 'FULL'),
      step('efds5', 'Emergency Shutdown on Deck', 'EXECUTE'),
    ],
  },
  {
    id: 'elec',
    title: 'ELEC FIRE IN FLIGHT',
    rows: [
      step('elec1', 'Master', 'OFF'),
      step('elec2', 'Avionics Power Switch', 'OFF'),
      step('elec3', 'All Electrical Equipment', 'OFF'),
      step('elec4', 'Vents / Cabin Air', 'CLOSED'),
      { decision: 'IF FIRE REMAINS' },
      step('elec5', 'Fire Extinguisher', 'ACTIVATE AS REQ'),
      step('elec6', 'Cabin Windows', 'OPEN AS REQ'),
      step('elec7', 'Land As Soon As Possible'),
    ],
  },
];

// Field key to answer, one per input on the limits table. Ranges are written "min-max" or
// "min to max"; the checker accepts either.
export const C172_LIMITS = {
  tachMin: '2100-2450',
  tachMax: '2700',
  oilTempNormal: '100-245',
  oilTempMax: '245',
  oilPressMin: '25',
  oilPressNormal: '60-90',
  oilPressMax: '115',
  oilQuantMin: '6',
  oilQuantNormal: '6-7',
  oilQuantMax: '8',
  carbTemp: '-15 to 5',
  starterDuty: 'Crank 10 sec Cool 20 sec after 3 cycles 10 min cooling',
  maxWeight: '2550',
  baggage: '120',
  fuelCapacity: '43',
  maxCrosswind: '15',
  maxBank: '60',
  serviceCeiling: '14200',
  wingspan: '36',
  flapsUpMax: '3.8 to -1.52',
  flapsDownMax: '3 to 0',
  vne: '158',
  vno: '127',
  va: '105',
  vfe: '85',
  vy: '73',
  vx: '62',
  vglide: '68',
  vr: '55',
  vs: '50',
  vso: '40',
};
