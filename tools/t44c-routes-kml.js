#!/usr/bin/env node
//
// Writes public/kml/t44c-routes.kml, the T-44C Practice Flight's map, from the fixes the Course
// Rules Manual and the In Flight Guide give. Run it after changing a route here:
//
//   node tools/t44c-routes-kml.js
//
// CRP radial/DME fixes are computed from the VORTAC and its station declination. Landmarks without
// a published position (the beach crossing, Port Royal offshore points) are placed by eye off the
// In Flight Guide's plates, so the lines are study aids, not navigation.

const fs = require('fs');
const path = require('path');
const { kmlPlacemarks } = require('./lib/kmlFolders');

const CRP = [27.903766, -97.444881];
const VAR = 9; // CRP's station declination, degrees east.

function fix(radial, dme) {
  const t = ((radial + VAR) * Math.PI) / 180;
  const lat = CRP[0] + (dme * Math.cos(t)) / 60;
  const lon = CRP[1] + (dme * Math.sin(t)) / (60 * Math.cos((CRP[0] * Math.PI) / 180));
  return [lat, lon];
}

// Points along a DME arc, every two degrees or so.
function arc(from, to, dme) {
  const n = Math.ceil(Math.abs(to - from) / 2);
  return Array.from({ length: n + 1 }, (_, i) => fix(from + ((to - from) * i) / n, dme));
}

const P = {
  KNGP: [27.6901, -97.2877], KNGW: [27.7045, -97.4408], shamrock: [27.7563, -97.1704], sunrise: [27.7055, -97.3612],
  dimmit: [27.6901, -97.2446], portRoyal: [27.7425, -97.1268], chapman: [27.585, -97.423], offPortRoyal: [27.735, -97.11],
  rkp: [28.0871, -97.0427], nineMile: [28.0327, -97.0265], causeway: [27.8944, -97.1281], foxSouth: [28.13, -96.8],
  penascal: [27.274, -97.443],
};

// Straight legs joined by a short turn at each corner: the corner is cut `nm` back along both legs
// (or half the shorter leg) and joined by a curve. The user's rule: lines stay straight, curves only
// join them, and only an arc the course rules define (the Wagon Wheel) is drawn round (`round`).
const COS = Math.cos((27.7 * Math.PI) / 180);
function fillet(pts, nm = 0.4) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const len = (p, q) => Math.hypot((q[0] - p[0]) * 60, (q[1] - p[1]) * 60 * COS);
    const d = Math.min(nm, len(a, b) / 2, len(b, c) / 2);
    const toward = (p, q, dist) => { const f = dist / (len(p, q) || 1); return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; };
    const p1 = toward(b, a, d);
    const p2 = toward(b, c, d);
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      out.push([(1 - t) ** 2 * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0], (1 - t) ** 2 * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// A defined arc, drawn round through its traced points (Chaikin). The ends stay.
function round(pts, passes = 3) {
  let out = pts;
  for (let n = 0; n < passes; n++) {
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const [a, b] = [out[i], out[i + 1]];
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

// ---- Navy Corpus, from Primary's map: the same Shamrock and Sunrise arrivals (Course Rules Manual
// Plates 3-15 and the Sunrise Arrival), drawn there turn by turn for each runway.
const PRIMARY = kmlPlacemarks(path.resolve(__dirname, '..', 'public', 'kml', 'course-rules.kml'));
const KNGP_RUNWAYS = ['04', '13L', '13R', '18', '22', '31L', '31R', '36'];
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function primaryLine(folder, rwy, from) {
  const f = PRIMARY.find((p) => p.path.includes('(KNGP) Corpus Christi NAS') && p.path[p.path.length - 1] === folder && p.name === rwy);
  if (!f) throw new Error(`Primary's map has no ${folder} ${rwy}`);
  // Some are drawn from the runway out; every one here is flown from `from`.
  const c = near(f.coords[0], from) <= near(f.coords[f.coords.length - 1], from) ? f.coords : [...f.coords].reverse();
  return near(c[0], from) > 1e-4 ? [from, ...c] : c;
}

// ---- Cabaniss. Runway ends from OpenStreetMap (the manual's 18/36 is 17/35 there); the Wagon
// Wheel traced off Plate 3-11, scaled by its HEB and field (about 95 px a nautical mile).
const KNGW_END = { 13: [27.70632, -97.44268], 31: [27.69676, -97.43199], 18: [27.7096, -97.44049], 36: [27.69729, -97.44051] };
const KNGW_OPP = { 13: '31', 31: '13', 18: '36', 36: '18' };
const plate = (x, y) => [27.7033 - (y - 712) / 95 / 60, -97.4387 + (x - 556) / (95 * 60 * Math.cos((27.7 * Math.PI) / 180))];
const HEB = [27.68508, -97.38891]; // Staples at Saratoga
const FUEL_TANK = plate(563, 1055);
// Around the wheel, clockwise from the south, to the landfill (the RWY 13/18 initial).
const WEST_OF_WHEEL = [plate(474, 941), plate(425, 880), plate(410, 800), plate(433, 712)];
const INTO = {
  13: [plate(455, 672), plate(500, 660), KNGW_END[13]],
  18: [plate(450, 640), plate(490, 600), plate(535, 610), KNGW_END[18]],
  31: [plate(690, 800), plate(640, 780), KNGW_END[31]],
  36: [plate(700, 838), plate(600, 845), plate(560, 815), KNGW_END[36]],
};
const fromHeb = (rwy) => (['13', '18'].includes(rwy) ? [HEB, plate(700, 905), plate(600, 960), ...WEST_OF_WHEEL, ...INTO[rwy]] : [HEB, ...INTO[rwy]]);
// RWY 31's left initial, 2 NM out on the extended centerline.
const INITIAL_31 = [27.6724, -97.4063];
const fromSouth = (rwy) => ({
  13: [FUEL_TANK, ...WEST_OF_WHEEL, ...INTO[13]],
  18: [FUEL_TANK, ...WEST_OF_WHEEL, ...INTO[18]],
  31: [FUEL_TANK, INITIAL_31, KNGW_END[31]],
  36: [FUEL_TANK, plate(560, 815), KNGW_END[36]],
}[rwy]);
// Off the runway: the takeoff, then the turn each departure gives.
const takeoff = (rwy) => [KNGW_END[rwy], KNGW_END[KNGW_OPP[rwy]]];
const SUNRISE_OUT = {
  13: [...takeoff('13'), [27.692, -97.424], HEB],
  18: [...takeoff('18'), [27.689, -97.437], [27.684, -97.42], HEB],
  36: [...takeoff('36'), [27.716, -97.437], [27.712, -97.41]],
  31: [...takeoff('31'), [27.7135, -97.437], [27.7081, -97.4182]], // the right 180
};
// South of the Power Plant (the bend in Farm Road 70), then 100° past the Shrimp Ponds to the
// Intracoastal, and the Southern Arrival: one WTD off the beach, Port Royal, PT Shamrock.
const TURN_100 = [27.6, -97.394];
// HDG 100° (109° true) from the turn, one straight line to the beach line, then north.
const BEACH_100 = (() => {
  const t = (109 * Math.PI) / 180;
  const nm = ((-97.215 - TURN_100[1]) * 60 * COS) / Math.sin(t);
  return [TURN_100[0] + (nm * Math.cos(t)) / 60, -97.215];
})();
const SOUTHERN_ARRIVAL = [BEACH_100, [27.65, -97.155], P.offPortRoyal, P.portRoyal, P.shamrock];

// Cabaniss traffic patterns (Course Rules Manual p. 3-30: 13, 18 left; 31, 36 right), the downwind
// 1 NM from the runway (ME FTI p. 1-29, "1 mile abeam"): upwind past the far end, a turn to the
// downwind, the downwind past the threshold, and a turn to a short final.
function pattern(rwy) {
  const T = KNGW_END[rwy];
  const D = KNGW_END[KNGW_OPP[rwy]];
  const xy = (p) => [(p[1] - T[1]) * 60 * COS, (p[0] - T[0]) * 60]; // NM east, north of T
  const ll = ([x, y]) => [T[0] + y / 60, T[1] + x / (60 * COS)];
  const d = xy(D);
  const L = Math.hypot(d[0], d[1]);
  const u = [d[0] / L, d[1] / L];
  const left = ['13', '18'].includes(rwy);
  const n = left ? [-u[1], u[0]] : [u[1], -u[0]]; // toward the pattern side
  const at = (along, out) => [u[0] * along + n[0] * out, u[1] * along + n[1] * out];
  const turn = (cAlong, from, to) => Array.from({ length: 13 }, (_, i) => {
    const a = from + ((to - from) * i) / 12;
    return at(cAlong + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a));
  });
  const ext = 0.3; // upwind past the far end, final straight before the threshold
  const pts = [
    at(0, 0), at(L + ext, 0),
    ...turn(L + ext, -Math.PI / 2, Math.PI / 2), // crosswind turn, out to the downwind
    at(-ext, 1),
    ...turn(-ext, Math.PI / 2, (3 * Math.PI) / 2), // the 180 to final
    at(0, 0),
  ];
  return pts.map(ll);
}
const SOUTHERN_OUT = {
  13: [...takeoff('13'), [27.688, -97.424], [27.675, -97.418]],
  18: [...takeoff('18'), [27.688, -97.439], [27.675, -97.434]],
  31: [...takeoff('31'), [27.714, -97.449], [27.704, -97.456], [27.692, -97.451], [27.675, -97.444]],
  36: [...takeoff('36'), [27.714, -97.432], [27.703, -97.426], [27.69, -97.426], [27.675, -97.42]],
};

const close = (pts) => [...pts, pts[0]];
const dms = (d, m, s) => d + m / 60 + s / 3600;
const WP = {
  1: [dms(26, 55, 23.44), -dms(97, 21, 18.41)], 2: [dms(26, 54, 59.62), -dms(97, 10, 25.87)],
  3: [dms(26, 32, 57.25), -dms(97, 19, 21.99)], 4: [dms(26, 33, 28.67), -dms(97, 3, 42.3)],
  5: [dms(26, 10, 7.24), -dms(97, 17, 24.17)], 6: [dms(26, 10, 7.19), -dms(96, 58, 17.97)],
};
// ---- The Beachline Departure (Plate 3-1), from Primary's map: Plate 2-2 is the same drawing, turn
// for turn, and Primary traced it runway by runway. Each ends where the 105° heading crosses the
// beach, and every transition starts from that crossing.
const departure = (rwy) => {
  const f = PRIMARY.find((p) => p.path[p.path.length - 1] === 'Beach Line Departures' && p.name === rwy);
  if (!f) throw new Error(`Primary's map has no Beach Line Departure ${rwy}`);
  // Some are drawn from the beach in; every one here is flown out to it (east).
  return f.coords[0][1] < f.coords[f.coords.length - 1][1] ? f.coords : [...f.coords].reverse();
};

// The Gulf beach (OpenStreetMap coastline, its easternmost shore at each latitude), north to south.
const BEACH = [[27.75, -97.1114], [27.7, -97.1422], [27.6, -97.201], [27.5, -97.2567], [27.4, -97.3018],
  [27.3, -97.3388], [27.2, -97.3642], [27.1, -97.3771], [27.0, -97.3782], [26.9, -97.3677]];
const beachSouthOf = (lat, until) => BEACH.filter(([la]) => la < lat - 0.02 && la > until);
// Where a radial crosses the beach.
function radialAtBeach(radial) {
  for (let dme = 10; dme < 60; dme += 0.1) {
    const [la, lo] = fix(radial, dme);
    const i = BEACH.findIndex(([b]) => b < la);
    if (i < 1) continue;
    const [a, b] = [BEACH[i - 1], BEACH[i]];
    const shore = a[1] + ((b[1] - a[1]) * (la - a[0])) / (b[0] - a[0]);
    if (lo >= shore) return [la, lo];
  }
  throw new Error(`CRP ${radial} never reaches the beach`);
}
const CRP156_BEACH = radialAtBeach(156);
// Baffin Bay's mouth on the Laguna Madre, about 27.27° N; abeam it on the beach.
const ABEAM_BAFFIN = [27.27, -97.346];

// Foxtrot: Primary's half-WTD track up the beach (its Foxtrot/North MUSTANG Transition), joined from
// the crossing where the 105° heading meets it.
const FOX_TRACK = [[27.6699, -97.0977], [27.8316, -96.9991], [27.9607, -96.8989], [28.0959, -96.7623], [28.1648, -96.6657]];
function meetTrack(from, trueHdg, [a, b]) {
  // from + t·h meets a + u·(b − a), in nautical miles east/north of `from`.
  const xy = (p) => [(p[1] - from[1]) * 60 * COS, (p[0] - from[0]) * 60];
  const h = [Math.sin((trueHdg * Math.PI) / 180), Math.cos((trueHdg * Math.PI) / 180)];
  const A = xy(a);
  const d = [xy(b)[0] - A[0], xy(b)[1] - A[1]];
  const den = h[0] * d[1] - h[1] * d[0];
  const t = (A[0] * d[1] - A[1] * d[0]) / den;
  return [from[0] + (t * h[1]) / 60, from[1] + (t * h[0]) / (60 * COS)];
}
const HDG_105 = 109; // 105° magnetic, as Primary's departures fly it

const CHEETAH_EDGE = WP[1]; // where the beach meets North CHEETAH's top edge
const transitions = (b) => ({
  'To North Seagull': fillet([b, fix(100, 26), fix(90, 32)], 1),
  'To Central/South Seagull': fillet([b, fix(130, 26), fix(130, 33.8)], 1),
  'To Foxtrot': fillet([b, meetTrack(b, HDG_105, FOX_TRACK), ...FOX_TRACK.slice(1)], 1.5),
  'To Cheetah': fillet([b, ...beachSouthOf(b[0], CHEETAH_EDGE[0]), CHEETAH_EDGE], 0.8),
});

const LINES = {
  'North/Central Seagull exit': fillet([fix(100, 33), fix(100, 26), P.portRoyal, P.shamrock], 1),
  'South Seagull exit': fillet([fix(156, 60), fix(156, 45), fix(156, 38), [27.4, -97.17], P.offPortRoyal, P.portRoyal, P.shamrock], 1),
  'South Seagull to Cabaniss': fillet([fix(156, 60), fix(156, 43), P.penascal, fix(178, 28), P.chapman, FUEL_TANK], 1),
  'Foxtrot to Shamrock': fillet([P.foxSouth, P.rkp, P.nineMile, P.causeway, P.shamrock], 0.8),
  // North along the beach to the CRP 156R, then out to the Southern Arrival, one WTD off the beach.
  'Cheetah to Shamrock': fillet([CHEETAH_EDGE, ...[...beachSouthOf(CRP156_BEACH[0], CHEETAH_EDGE[0])].reverse(), CRP156_BEACH,
    [27.65, -97.155], P.offPortRoyal, P.portRoyal, P.shamrock], 0.8),
  'Shamrock to PT Sunrise': [P.shamrock, P.sunrise],
};
KNGP_RUNWAYS.forEach((rwy) => {
  const out = departure(rwy);
  LINES[`Beachline departure ${rwy}`] = out;
  Object.entries(transitions(out[out.length - 1])).forEach(([n, pts]) => { LINES[`${n} ${rwy}`] = pts; });
});
KNGP_RUNWAYS.forEach((rwy) => {
  LINES[`Shamrock to KNGP ${rwy}`] = primaryLine('PT Shamrock', rwy, P.shamrock);
  LINES[`PT Sunrise to KNGP ${rwy}`] = primaryLine('Sunrise Transition / South Arrivals', rwy, P.sunrise);
});
['13', '18', '31', '36'].forEach((rwy) => {
  const wheel = ['13', '18'].includes(rwy); // only 13 and 18 fly the Wagon Wheel
  LINES[`PT Sunrise to Cabaniss ${rwy}`] = wheel ? [P.sunrise, ...round(fromHeb(rwy), 2)] : fillet([P.sunrise, ...fromHeb(rwy)], 0.25);
  LINES[`Chapman Ranch to Cabaniss ${rwy}`] = wheel ? [P.chapman, ...round(fromSouth(rwy), 2)] : fillet([P.chapman, ...fromSouth(rwy)], 0.25);
  LINES[`Cabaniss to PT Sunrise ${rwy}`] = fillet([...SUNRISE_OUT[rwy], P.sunrise], 0.25);
  LINES[`Cabaniss pattern ${rwy}`] = pattern(rwy);
  LINES[`Cabaniss Southern Departure ${rwy}`] = fillet([...SOUTHERN_OUT[rwy], TURN_100, ...SOUTHERN_ARRIVAL], 0.4);
});

const AREAS = {
  'Seagull North': close([fix(100, 33), fix(72, 50), ...arc(72, 100, 60)]),
  'Seagull Central': close([fix(100, 33), ...arc(100, 130, 60), fix(130, 33.8)]),
  'Seagull South': close([fix(130, 33.8), ...arc(130, 156, 60), fix(141, 39)]),
  'Foxtrot 1': close([[28.2116, -96.5796], [28.3323, -96.3473], [28.4958, -96.4716], [28.3287, -96.6855]]),
  'Foxtrot 2': close([[28.1779, -96.8661], [28.0931, -96.7617], [28.1621, -96.6634], [28.2116, -96.5796], [28.3287, -96.6855]]),
  'Cheetah North': close([WP[1], WP[2], WP[4], WP[3]]),
  'Cheetah South': close([WP[3], WP[4], WP[6], WP[5]]),
};
// Landmarks: the course rules' named points, drawn with each leg that names them and kept on the
// map once the leg is flown (as Primary's map does). Primary's own positions where it has them.
const primaryPoint = (name) => {
  const f = PRIMARY.find((p) => p.name === name && p.coords.length === 1);
  if (!f) throw new Error(`Primary's map has no point ${name}`);
  return f.coords[0];
};
const LANDMARK = {
  'TAMUCC NW Corner': primaryPoint('TAMUCC NW Corner'),
  'High Bridge': primaryPoint('High Bridge'),
  'Low Bridge': primaryPoint('Low Bridge'),
  'PT Dimmit': primaryPoint('PT DIMMIT'),
  'Oso Bridge (West Side)': primaryPoint('Oso Bridge (West Side)'),
  'Port Royal': primaryPoint('Port Royal'),
  'Aransas Pass Causeway': primaryPoint('Aransas Pass Causeway'),
  '9 Mile Point': primaryPoint('9 Mile Point'),
  'Aransas County (KRKP)': P.rkp,
  'Twin Rigs (CRP 100/26)': fix(100, 26),
  'CRP 130/26': fix(130, 26),
  'CRP 156/45': fix(156, 45),
  'CRP 156/43': fix(156, 43),
  'CRP 156/38': fix(156, 38),
  'PT Penascal': P.penascal,
  'Postage Stamp (CRP 178/28)': fix(178, 28),
  'Chapman Ranch': P.chapman,
  'Fuel Tank': FUEL_TANK,
  HEB: HEB,
  'Blue Roof House': plate(474, 941),
  Landfill: plate(433, 712),
  'South of the Power Plant': TURN_100,
  'CRP 156R at the beach': CRP156_BEACH,
  'Abeam Baffin Bay': ABEAM_BAFFIN,
};
const LANDMARKS_OF = {
  'North/Central Seagull exit': ['Twin Rigs (CRP 100/26)', 'Port Royal'],
  'South Seagull exit': ['CRP 156/45', 'CRP 156/38', 'Port Royal'],
  'South Seagull to Cabaniss': ['CRP 156/43', 'PT Penascal', 'Postage Stamp (CRP 178/28)', 'Chapman Ranch'],
  'Foxtrot to Shamrock': ['Aransas County (KRKP)', '9 Mile Point', 'Aransas Pass Causeway'],
  'Cheetah to Shamrock': ['CRP 156R at the beach', 'Port Royal'],
};
KNGP_RUNWAYS.forEach((rwy) => {
  // 13L/R fly to the High Bridge; 18 and 22 turn to 105° until abeam it (Plate 3-1).
  LANDMARKS_OF[`Beachline departure ${rwy}`] = ['13L', '13R', '18', '22'].includes(rwy) ? ['High Bridge'] : [];
  LANDMARKS_OF[`To North Seagull ${rwy}`] = ['Twin Rigs (CRP 100/26)'];
  LANDMARKS_OF[`To Central/South Seagull ${rwy}`] = ['CRP 130/26'];
  LANDMARKS_OF[`To Cheetah ${rwy}`] = ['CRP 156R at the beach', 'Abeam Baffin Bay'];
  const north = ['13L', '13R', '18', '22'].includes(rwy); // ~255° towards TAMUCC; the rest ~200° to the High Bridge
  LANDMARKS_OF[`Shamrock to KNGP ${rwy}`] = north ? ['TAMUCC NW Corner'] : ['High Bridge', 'PT Dimmit', ...(['04', '36'].includes(rwy) ? ['Low Bridge'] : [])];
  LANDMARKS_OF[`PT Sunrise to KNGP ${rwy}`] = ['18', '22'].includes(rwy) ? ['TAMUCC NW Corner'] : ['04', '31L', '31R', '36'].includes(rwy) ? ['Oso Bridge (West Side)'] : [];
});
['13', '18', '31', '36'].forEach((rwy) => {
  const wheel = ['13', '18'].includes(rwy) ? ['Blue Roof House', 'Landfill'] : [];
  LANDMARKS_OF[`PT Sunrise to Cabaniss ${rwy}`] = ['HEB', ...wheel];
  LANDMARKS_OF[`Chapman Ranch to Cabaniss ${rwy}`] = ['Chapman Ranch', 'Fuel Tank', ...wheel];
  LANDMARKS_OF[`Cabaniss Southern Departure ${rwy}`] = ['South of the Power Plant', 'Port Royal'];
});
Object.entries(LANDMARKS_OF).forEach(([leg, names]) => names.forEach((n) => {
  if (!LINES[leg]) throw new Error(`No line ${leg}`);
  if (!LANDMARK[n]) throw new Error(`No landmark ${n}`);
}));

const POINTS = { KNGP: P.KNGP, Cabaniss: P.KNGW, 'PT Shamrock': P.shamrock, 'PT Sunrise': P.sunrise, 'To PT Shamrock': P.shamrock, ...LANDMARK };

const coord = ([lat, lon]) => `${lon.toFixed(5)},${lat.toFixed(5)},0`;
const placemark = (name, geom, data = '') => `  <Placemark><name>${name}</name>${data}${geom}</Placemark>`;
const landmarksData = (leg) => (LANDMARKS_OF[leg] ? `<ExtendedData><Data name="landmarks"><value>${LANDMARKS_OF[leg].join('|')}</value></Data></ExtendedData>` : '');
const body = [
  ...Object.entries(POINTS).map(([n, p]) => placemark(n, `<Point><coordinates>${coord(p)}</coordinates></Point>`)),
  ...Object.entries(LINES).map(([n, pts]) => placemark(n, `<LineString><coordinates>${pts.map(coord).join(' ')}</coordinates></LineString>`, landmarksData(n))),
  ...Object.entries(AREAS).map(([n, pts]) => placemark(n, `<Polygon><outerBoundaryIs><LinearRing><coordinates>${pts.map(coord).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>`)),
];
const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>T-44C course rules routes</name>\n${body.join('\n')}\n</Document>\n</kml>\n`;
const out = path.resolve(__dirname, '..', 'public', 'kml', 't44c-routes.kml');
fs.writeFileSync(out, kml);
console.log(`Wrote ${out}: ${body.length} placemarks.`);
