// The NIFE TOLD card's figures and arithmetic, from the NIFE In-Flight Guide (NASCINST 3710.3E,
// 20 Aug 26): the card (p. 24), its instructions (pp. 26-27), the Center of Gravity Limits chart
// (p. 28) and the 180 HP takeoff and landing tables (pp. 29-30). The chart and tables are the
// 180 HP AFM supplement's; the POH assumes a 160 HP engine and is not used for any of this.
//
// Pure data and functions, so the tests can reach them without React.

export const ARMS = { front: 37, rear: 73, baggage: 95, fuel: 48 };
export const LBS_PER_GAL = 6;
export const STUDENT_FUEL_GAL = { first: 38, second: 21 };
export const BAGGAGE_LBS = 10;
export const TAXI_FUEL_LBS = 7;
export const FUEL_BURN_LBS = 100;

// Center of Gravity Limits, normal category: forward 35.0 in up to 1950 lbs, then a straight
// line to 41.0 in at 2550 lbs; aft 47.3 in; maximum 2550 lbs.
export const MAX_WEIGHT = 2550;
export const AFT_LIMIT = 47.3;
export const ENVELOPE = [[35, 1500], [35, 1950], [41, 2550], [AFT_LIMIT, 2550], [AFT_LIMIT, 1500]];

export function forwardLimit(weight) {
  if (weight <= 1950) return 35;
  return 35 + ((weight - 1950) * 6) / 600;
}

// The arm is judged as the card shows it, to two places, so the verdict agrees with the figure.
export function checkCg(weight, arm) {
  if (!(weight > 0) || !Number.isFinite(arm)) return null;
  const cg = Math.round(arm * 100) / 100;
  const fwd = Math.round(forwardLimit(weight) * 100) / 100;
  if (weight > MAX_WEIGHT) return { ok: false, why: `over the ${MAX_WEIGHT} lbs maximum` };
  if (cg < fwd) return { ok: false, why: `forward of the ${fwd.toFixed(2)} in limit at this weight` };
  if (cg > AFT_LIMIT) return { ok: false, why: `aft of the ${AFT_LIMIT} in limit` };
  return { ok: true };
}

export const ALTITUDES = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];
export const TEMPS = [0, 10, 20, 30, 40];

// One row per altitude; each row is ground roll then total over 50 ft, for 0, 10, 20, 30, 40 °C.
export const TAKEOFF = {
  2200: {
    liftOff: 45,
    at50: 53,
    rows: [
      [610, 1090, 660, 1165, 705, 1245, 760, 1335, 815, 1425],
      [670, 1190, 720, 1270, 775, 1360, 830, 1460, 890, 1560],
      [730, 1295, 785, 1390, 845, 1490, 910, 1600, 975, 1710],
      [800, 1420, 860, 1525, 930, 1635, 995, 1755, 1070, 1885],
      [875, 1560, 945, 1675, 1020, 1800, 1095, 1935, 1175, 2080],
      [965, 1715, 1040, 1850, 1120, 1990, 1205, 2140, 1295, 2305],
      [1060, 1895, 1145, 2045, 1235, 2205, 1325, 2380, 1425, 2565],
      [1170, 2100, 1260, 2270, 1360, 2455, 1465, 2655, 1575, 2870],
      [1290, 2335, 1395, 2535, 1505, 2745, 1620, 2980, 1745, 3235],
    ],
  },
  2400: {
    liftOff: 47,
    at50: 55,
    rows: [
      [745, 1320, 805, 1415, 865, 1520, 925, 1625, 995, 1745],
      [815, 1445, 880, 1550, 945, 1665, 1015, 1785, 1090, 1915],
      [895, 1585, 965, 1705, 1035, 1830, 1115, 1965, 1195, 2110],
      [980, 1740, 1055, 1875, 1135, 2020, 1225, 2170, 1315, 2335],
      [1075, 1920, 1160, 2070, 1250, 2235, 1345, 2405, 1445, 2595],
      [1185, 2125, 1275, 2295, 1375, 2480, 1485, 2680, 1595, 2900],
      [1305, 2360, 1410, 2555, 1520, 2770, 1635, 3005, 1760, 3260],
      [1440, 2635, 1555, 2860, 1680, 3115, 1810, 3390, 1950, 3700],
      [1590, 2960, 1720, 3230, 1860, 3530, 2005, 3865, 2165, 4245],
    ],
  },
  2550: {
    liftOff: 48,
    at50: 57,
    rows: [
      [860, 1520, 925, 1630, 995, 1750, 1070, 1880, 1160, 2015],
      [940, 1665, 1015, 1790, 1090, 1925, 1175, 2070, 1260, 2225],
      [1030, 1830, 1110, 1970, 1195, 2125, 1290, 2285, 1385, 2460],
      [1130, 2015, 1220, 2175, 1315, 2350, 1415, 2535, 1520, 2740],
      [1245, 2230, 1345, 2415, 1450, 2615, 1560, 2830, 1675, 3060],
      [1370, 2480, 1480, 2690, 1595, 2920, 1720, 3170, 1850, 3450],
      [1510, 2770, 1635, 3015, 1765, 3290, 1900, 3585, 2050, 3925],
      [1670, 3120, 1805, 3410, 1950, 3735, 2105, 4100, 2270, 4520],
      [1850, 3535, 2000, 3890, 2165, 4295, 2340, 4760, 2525, 5315],
    ],
  },
};

// Landing, short field, flaps 30: the one table, at 2550 lbs.
export const LANDING = {
  2550: {
    at50: 62,
    rows: [
      [545, 1290, 565, 1320, 585, 1350, 605, 1380, 625, 1415],
      [565, 1320, 585, 1350, 605, 1385, 625, 1420, 650, 1450],
      [585, 1355, 610, 1385, 630, 1420, 650, 1455, 670, 1490],
      [610, 1385, 630, 1425, 655, 1460, 675, 1495, 695, 1530],
      [630, 1425, 655, 1460, 675, 1495, 700, 1535, 725, 1570],
      [655, 1460, 680, 1500, 705, 1535, 725, 1575, 750, 1615],
      [680, 1500, 705, 1540, 730, 1580, 755, 1620, 780, 1660],
      [705, 1545, 730, 1585, 760, 1625, 785, 1665, 810, 1705],
      [735, 1585, 760, 1630, 790, 1670, 815, 1715, 840, 1755],
    ],
  },
};

// Note 2: decrease distances 10% for each 9 knots headwind; with tailwinds up to 10 knots,
// increase them 10% for each 2 knots. Both are taken in whole steps the conservative way: a
// headwind counts only per full 9 knots, a tailwind per started 2 knots.
export const MAX_TAILWIND = 10;

export function windFactor(headwind) {
  if (headwind >= 0) return Math.max(0, 1 - 0.1 * Math.floor(headwind / 9));
  if (-headwind > MAX_TAILWIND) return null;
  return 1 + 0.1 * Math.ceil(-headwind / 2);
}

// Which table cell a condition reads: field elevation up to the next 1,000 ft (the guide's
// instruction), temperature up to the next 10 °C column; below 0 °C reads the 0 °C column.
export function cellFor(elevation, temp) {
  if (elevation > 8000) return { error: 'the tables stop at 8,000 ft' };
  if (temp > 40) return { error: 'the tables stop at 40°C' };
  const alt = Math.max(0, Math.ceil(elevation / 1000) * 1000);
  const col = Math.max(0, Math.ceil(temp / 10) * 10);
  return { alt, col, row: alt / 1000, index: (col / 10) * 2 };
}

// The takeoff table is the next weight up from the takeoff weight: 2200, 2400 or 2550 lbs.
export function takeoffTable(weight) {
  return [2200, 2400, 2550].find((w) => weight <= w) || null;
}

function distances(table, weight, cond) {
  const { elevation, temp, headwind } = cond;
  if (![elevation, temp, headwind].every(Number.isFinite)) return null;
  const cell = cellFor(elevation, temp);
  if (cell.error) return cell;
  const factor = windFactor(headwind);
  if (factor === null) return { error: `the tables allow tailwinds up to ${MAX_TAILWIND} knots` };
  const r = table.rows[cell.row];
  // In tenths, so 1000 × 1.1 comes out 1100 rather than a hair over and rounded up to 1101.
  const tenths = Math.round(factor * 10);
  const apply = (v) => Math.ceil((v * tenths) / 10);
  return {
    weight,
    alt: cell.alt,
    col: cell.col,
    factor,
    ground: apply(r[cell.index]),
    total: apply(r[cell.index + 1]),
  };
}

export function takeoffDistances(weight, cond) {
  if (!(weight > 0)) return null;
  const w = takeoffTable(weight);
  if (!w) return { error: `over the ${MAX_WEIGHT} lbs maximum` };
  return distances(TAKEOFF[w], w, cond);
}

export function landingDistances(cond) {
  return distances(LANDING[2550], 2550, cond);
}

// The airports the In-Flight Guide gives a page (pp. 7-19), with each runway's length and
// width as its diagram prints them, for the card's airport rows. Silverhill (p. 11) is left
// out: the guide marks it closed. Jeremiah Denton's page gives no field elevation.
export const IFG_AIRPORTS = [
  { id: 'KPNS', name: 'Pensacola Intl', elev: 121, runways: [['17/35', '7004 x 150'], ['08/26', '7000 x 150']] },
  { id: 'KJKA', name: 'Jack Edwards', elev: 17, runways: [['09/27', '6962 x 100'], ['17/35', '3596 x 75']] },
  { id: 'KBFM', name: 'Mobile Downtown', elev: 26, runways: [['14/32', '9618 x 150'], ['18/36', '7800 x 150']] },
  { id: '5R4', name: 'Foley', elev: 74, runways: [['18/36', '3700 x 74']] },
  { id: '2R4', name: 'Peter Prince', elev: 82, runways: [['18/36', '3701 x 75']] },
  { id: 'KCQF', name: 'Fairhope / Sonny Callahan', elev: 91, runways: [['01/19', '6604 x 100']] },
  { id: '2R5', name: 'St Elmo', elev: 132, runways: [['06/24', '3998 x 80']] },
  { id: 'KPQL', name: 'Trent Lott Intl', elev: 17, runways: [['17/35', '6501 x 150']] },
  { id: '1R8', name: 'Bay Minette', elev: 248, runways: [['08/26', '5500 x 79']] },
  { id: '0R1', name: 'Atmore', elev: 286, runways: [['18/36', '5001 x 80']] },
  { id: 'KCEW', name: 'Crestview', elev: 214, runways: [['17/35', '8006 x 150']] },
  { id: '4R9', name: 'Jeremiah Denton', elev: null, runways: [['12/30', '3000 x 80']] },
];
