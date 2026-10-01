// The arithmetic behind the NIFE Problem Generator tabs (Nav, Jet Log, FR&R, Weather).
// Pure: no React and no DOM, so navMath.test.js can pin every answer the tabs give.

export const randBetween = (min, max, random = Math.random) =>
  Math.floor(random() * (max - min + 1)) + min;

// A heading or course in 1–360: 360, never 0, and never negative.
export const wrapHeading = (deg) => ((deg % 360) + 360) % 360 || 360;

// Signed difference a − b in degrees, in −180..180.
const angleDiff = (a, b) => ((a - b) % 360 + 540) % 360 - 180;

// ---------------------------------------------------------------------------------------
// Nav (whiz wheel)

// How far to turn a log scale so `input` sits under the index.
export const turnToDegrees = (input) =>
  -360 * (Math.log10(input / Math.pow(10, Math.floor(Math.log10(input) - 1))) - 1);

const X1 = 0.000167710133972731;
const X2 = -0.0483548613736768;
const X3 = 4.5070725375605;

const staticPressure = (palt) =>
  101325 * Math.pow((288.15 / (288.15 - (6.5 / 1000) * (palt * 0.3048))), (9.80665 * 28.9644 / (8.31432 * 1000 * (-6.5 / 1000))));

// An estimate of the airspeed hairs (see public/Airspeeds.pdf), not the wheel itself.
export const tasFromCas = (temp, palt, cas) => {
  const psi = staticPressure(palt);
  const qc = 101325 * (Math.pow((1 + 0.2 * Math.pow((0.514444444 * cas / 340.29), 2)), (7 / 2)) - 1);
  const m = Math.sqrt(5 * (Math.pow(qc / psi + 1, 2 / 7) - 1));
  const a = Math.sqrt(1.4 * 287.053 * (temp + 273.15));
  return -X1 * Math.pow(m * a * 1.94384, 2) + (1 - X2) * (m * a * 1.94384) - X3;
};

// The exact inverse of tasFromCas: undo the hair fit in knots, then the atmosphere.
export const casFromTas = (temp, palt, tas) => {
  const tasKts = ((1 - X2) - Math.sqrt(Math.pow((1 - X2), 2) - 4 * X1 * (X3 + tas))) / (2 * X1);
  const a = Math.sqrt(1.4 * 287.053 * (temp + 273.15));
  const m = tasKts / 1.94384 / a;
  const qc = staticPressure(palt) * (Math.pow((1 + 0.2 * Math.pow(m, 2)), (7 / 2)) - 1);
  return 340.29 * Math.sqrt(5 * (Math.pow(qc / 101325 + 1, 2 / 7) - 1)) * 1.94384;
};

export const pressureAltitude = (calt, altim) => (29.92 - altim) * 1000 + calt;

// A time in hours, put in the unit the wheel reads it in: hours over 1.66, seconds under
// 0.027 (about 100 s), minutes between.
export const timeWithUnit = (hours) => {
  if (hours > 1.66) return { value: Number(hours.toFixed(1)), unit: 'hrs' };
  if (hours > 0.027) return { value: Number((hours * 60).toFixed(1)), unit: 'mins' };
  return { value: Number((hours * 3600).toFixed(1)), unit: 'secs' };
};

export const PER_HOUR = { hrs: 1, mins: 60, secs: 3600 };

// Preflight winds: course, TAS and the forecast wind give the crab and groundspeed.
// Crosswind, crab and headwind are signed: negative is L / headwind.
export const preflightWinds = ({ tc, tas, dir, kts }) => {
  const xw = kts * Math.sin((dir - tc) * Math.PI / 180);
  const ca = Math.round(180 / Math.PI * Math.asin(xw / tas));
  const th = wrapHeading(tc + ca);
  const hwtw = Math.round(-kts * Math.cos((dir - tc) * Math.PI / 180)) || 0;
  return { xw, ca, th, hwtw, gs: tas + hwtw };
};

// The direction the wind blows from, given its crosswind (− from the left) and
// headwind/tailwind (− head) components relative to a track.
const windFrom = (trk, xw, hwtw) => {
  let dir;
  if (Math.sign(hwtw) > 0) {
    dir = Math.round((trk - 180) % 360 - Math.sign(xw) * (180 / Math.PI * Math.atan(Math.abs(xw / hwtw)))) % 360;
  } else {
    dir = Math.round(trk + Math.sign(xw) * (180 / Math.PI * Math.atan(Math.abs(xw / hwtw)))) % 360;
  }
  return wrapHeading(dir);
};

// In-flight winds: heading, TAS, track and groundspeed give the wind. Drift is + right.
export const inflightWinds = ({ th, tas, trk, gs }) => {
  const da = angleDiff(trk, th);
  const xw = -Math.sin(da * Math.PI / 180) * tas;
  const hwtw = gs - tas;
  return { da, xw, hwtw, dir: windFrom(trk, xw, hwtw), vel: Math.round(Math.sqrt(xw * xw + hwtw * hwtw)) };
};

// TACAN point to point. `bdhi` reads like "123 TO" or "123 FROM"; the answer is the
// course and distance from you to the target.
export const tacanPointToPoint = ({ bdhi, r1, t2, r2 }) => {
  const reading = Number(String(bdhi).match(/\d+/g).join(''));
  let t1 = /TO/.test(String(bdhi)) ? reading - 180 : reading;
  if (t1 < 0) t1 += 360;

  const x1 = r1 * Math.cos(t1 * Math.PI / 180);
  const y1 = r1 * Math.sin(-t1 * Math.PI / 180);
  const x2 = r2 * Math.cos(t2 * Math.PI / 180);
  const y2 = r2 * Math.sin(-t2 * Math.PI / 180);

  const distance = Math.round(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2));
  let course = Math.round(Math.atan((y2 - y1) / (x2 - x1)) * 180 / Math.PI);
  if ((x2 - x1) < 0) course -= 180;
  if (course < 0) course += 360;
  return { t1, course: 360 - course, distance };
};

// Local and UTC, as HHMM numbers. Local = UTC + ZD.
export const zuluLocal = (time, zd) => {
  let hours = (Math.floor(time / 100) - zd) % 24;
  if (hours < 0) hours += 24;
  return hours * 100 + time % 100;
};

const toMinutes = (hhmm) => Math.floor(hhmm / 100) * 60 + (hhmm % 100);
const fromMinutes = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return Math.floor(m / 60) * 100 + m % 60;
};

// Time conversion. Given the duration ("2+05"), both zone descriptions and any one of
// the four times (index 0 departure LT, 1 departure UTC, 2 arrival UTC, 3 arrival LT),
// returns all four.
export const convertTimes = ({ duration, zd, zd2, given, value }) => {
  const [hours, minutes] = String(duration).split('+').map(Number);
  const flight = hours * 60 + minutes;
  let depUtc;
  if (given === 0) depUtc = zuluLocal(value, zd);
  else if (given === 1) depUtc = value;
  else {
    const arrUtc = given === 2 ? value : zuluLocal(value, zd2);
    depUtc = fromMinutes(toMinutes(arrUtc) - flight);
  }
  const arrUtc = fromMinutes(toMinutes(depUtc) + flight);
  return [zuluLocal(depUtc, -zd), depUtc, arrUtc, zuluLocal(arrUtc, -zd2)];
};

// A time conversion problem: departure LT, a 2–17 h flight, and zone descriptions in
// ±12 with the arrival zone roughly the hours flown away.
export const timeProblem = (random = Math.random) => {
  const r = (min, max) => randBetween(min, max, random);
  const time1 = r(0, 23) * 100 + r(0, 59);
  const hours = r(2, 17);
  const minutes = r(0, 59);
  const zd = r(-12, 12);
  const zd2 = ((zd + hours + r(-3, 3) + 12) % 25 + 25) % 25 - 12;
  const duration = `${hours}+${String(minutes).padStart(2, '0')}`;
  return { duration, zd, zd2, times: convertTimes({ duration, zd, zd2, given: 0, value: time1 }) };
};

// How far a typed answer is from the solution. "5 L" and "20 H" are negative (a unit such
// as "hrs" is not a direction); headings wrap at 360 and clock times at midnight.
export const answerDiff = (userInput, solution, kind) => {
  if (kind === 'time') {
    const digits = userInput.replace(/\D/g, '');
    if (!digits) return NaN;
    const diff = Math.abs(toMinutes(Number(digits)) - toMinutes(solution)) % 1440;
    return Math.min(diff, 1440 - diff);
  }
  let userValue = parseFloat(userInput);
  if (/\d\s*[LH]\s*$/i.test(userInput)) userValue *= -1;
  if (kind === 'deg') return Math.abs(angleDiff(userValue, solution));
  return Math.abs(userValue - solution);
};

// Green within 2% of the scale, yellow within 5%. A zero answer (no scale) must be exact.
export const gradeAnswer = (userInput, solution, denominator, kind) => {
  const diff = answerDiff(String(userInput).trim(), solution, kind);
  if (isNaN(diff)) return null;
  const percentError = solution === 0 && !kind
    ? (diff < 0.01 ? 0 : 100)
    : Math.abs(100 * diff / denominator);
  return percentError <= 2 ? 'bg-green' : percentError <= 5 ? 'bg-yellow' : 'bg-red';
};

// ---------------------------------------------------------------------------------------
// Jet Log. Each box's answer is worked from the boxes it depends on, as typed, and comes
// back as the text the box shows. A box that can't be read throws JetLogInputError, whose
// message tells the student what to type.

export class JetLogInputError extends Error {}

const MESSAGES = {
  wind: 'Enter winds as direction/speed, for example 270/20.',
  hwtw: 'Enter headwind or tailwind as knots then H or T, for example 15H.',
  xw: 'Enter crosswind as knots then L or R, for example 10L.',
  ca: 'Enter crab angle as degrees then L or R, for example 4R.',
  da: 'Enter drift angle as degrees then L or R, for example 5L.',
  ata: 'Enter ATA as HH:MM or HH:MM:SS, for example 10:30.',
};

const num = (text) => parseFloat(String(text).match(/-?\d+(\.\d+)?/)?.[0] ?? 0);

// "10L" → −10, "15 kts H" → −15, "20T" → 20. A bare zero ("0", "0kts") is 0.
const signed = (text, negative, positive, message) => {
  const t = String(text);
  const m = t.match(new RegExp(`(-?\\d+)(?:\\s*\\w+)?\\s*([${negative}${positive}])`, 'i'));
  if (m) {
    const value = Math.abs(parseFloat(m[1]));
    return m[2].toUpperCase() === negative ? -value : value;
  }
  if (/^\s*0+(\.0+)?\s*[a-z]*\s*$/i.test(t)) return 0;
  throw new JetLogInputError(message);
};

const lettered = (value, negative, positive, spaced = false) => {
  const v = Math.round(value);
  const gap = spaced ? ' ' : '';
  return v < 0 ? `${-v}${gap}${negative}` : v > 0 ? `${v}${gap}${positive}` : '0';
};

const wind = (text) => {
  const m = String(text).match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (!m) throw new JetLogInputError(MESSAGES.wind);
  return { dir: parseFloat(m[1]), kts: parseFloat(m[2]) };
};

export const jetLog = {
  hwtw: (winds, course) => {
    const { dir, kts } = wind(winds);
    return lettered(-kts * Math.cos((dir - num(course)) * Math.PI / 180), 'H', 'T');
  },
  xw: (winds, course) => {
    const { dir, kts } = wind(winds);
    return lettered(kts * Math.sin((dir - num(course)) * Math.PI / 180), 'L', 'R');
  },
  gs: (tas, hwtw) => `${num(tas) + signed(hwtw, 'H', 'T', MESSAGES.hwtw)}kts`,
  ca: (tas, xw) => {
    const x = signed(xw, 'L', 'R', MESSAGES.xw);
    return lettered(180 / Math.PI * Math.asin(x / num(tas)), 'L', 'R');
  },
  th: (course, ca) => `${wrapHeading(num(course) + signed(ca, 'L', 'R', MESSAGES.ca))}T`,
  // ETE in minutes, to a tenth.
  ete: (gs, dist) => Math.round(600 * num(dist) / num(gs)) / 10,
  // The same ETE as h+m+s.
  altEte: (ete) => {
    const total = Math.round(num(ete) * 60);
    return `${Math.floor(total / 3600)}+${Math.floor(total / 60) % 60}+${total % 60}`;
  },
  eta: (ata, ete) => {
    const m = String(ata).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) throw new JetLogInputError(MESSAGES.ata);
    const start = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3] ?? '0', 10);
    const total = (start + Math.round(num(ete) * 60)) % 86400;
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
  },
  fuel: (pph, ete) => `${Math.round(num(pph) * num(ete) / 60)}#`,
  efr: (afr, fuel) => `${num(afr) - num(fuel)}#`,
  // In flight: drift is track minus heading.
  da: (track, th) => lettered(angleDiff(num(track), num(th)), 'L', 'R', true),
  inflightGs: (ete, dist) => `${Math.round(num(dist) / (num(ete) / 60))}kts`,
  inflightXw: (tas, da) => {
    const d = signed(da, 'L', 'R', MESSAGES.da);
    return lettered(-Math.sin(d * Math.PI / 180) * num(tas), 'L', 'R');
  },
  inflightHwtw: (tas, gs) => lettered(num(gs) - num(tas), 'H', 'T'),
  inflightWind: (xw, hwtw, track) => {
    const x = signed(xw, 'L', 'R', MESSAGES.xw);
    const h = signed(hwtw, 'H', 'T', MESSAGES.hwtw);
    return `${windFrom(num(track), x, h)}/${Math.round(Math.sqrt(x * x + h * h))}kts`;
  },
};

// A box's direction letter, if its answer has one ("10L", "20 T").
const directionOf = (text) => String(text).match(/\d\s*([LRHT])(?![a-z])/i)?.[1]?.toUpperCase() ?? null;

// Grades a typed box against the worked answer: 'green' within 2% of the box's scale,
// 'yellow' within 10%, else 'red'. A heading wraps at 360 (its T means true); anything
// else with a direction letter is red if the letter is wrong.
export const gradeJetLogBox = (userText, answerText, denominator, heading = false) => {
  const answer = String(answerText);
  const answerNum = num(answer);
  const userNum = num(userText);
  let diff = Math.abs(userNum - answerNum);
  if (heading) {
    diff = Math.abs(angleDiff(userNum, answerNum));
  } else {
    const want = directionOf(answer);
    if (want !== null && answerNum !== 0 && directionOf(userText) !== want) return 'red';
  }
  const percent = (diff / denominator) * 100;
  return percent <= 2 ? 'green' : percent <= 10 ? 'yellow' : 'red';
};

// ---------------------------------------------------------------------------------------
// Weather (SETAI): flying a leg on the departure altimeter setting into a field whose
// setting differs.

export const setai = ({ depPres, assAlt, fieldEle, arrPres }) => {
  const trueAlt = (arrPres - (depPres - assAlt / 1000)) * 1000;
  return {
    situation: arrPres <= depPres ? 'H → L' : 'L → H',
    error: Math.abs((depPres - arrPres) * 1000),
    trueAlt,
    absolute: trueAlt - fieldEle,
    indicated: (depPres - (arrPres - fieldEle / 1000)) * 1000,
  };
};

// Every SETAI answer is in feet; 0.01 inHg is 10 ft.
export const gradeSetai = (user, correct) => {
  const value = parseFloat(String(user).replace(/,/g, ''));
  if (isNaN(value)) return '';
  const off = Math.abs(value - correct);
  return off <= 10 ? 'bg-green' : off <= 50 ? 'bg-yellow' : 'bg-red';
};

// ---------------------------------------------------------------------------------------
// FR&R

// Maximum VFR cruising altitude under the lowest ceiling: clear of cloud by 500 ft below
// 10,000 ft MSL and 1,000 ft at or above it, then the hemispheric rule (magnetic course
// 0–179 odd thousands + 500, 180–359 even + 500). `lines` are the steps drawn.
export const vfrCruise = ({ airClass, visibility, cloudLayers, course }) => {
  if (airClass === 'A') return { answer: 'VFR not allowed (Class A)', lines: [] };
  if (visibility < 3) return { answer: 'VFR not allowed (Vis < 3 SM)', lines: [] };

  const ceilings = cloudLayers.filter(l => l.type === 'BKN' || l.type === 'OVC').map(l => l.altitude);
  if (!ceilings.length) return { answer: 'No ceiling found', lines: [] };
  const ceiling = Math.min(...ceilings);

  const lines = [{ lineAlt: ceiling, text: '', textAlt: ceiling, ceiling }];
  const clearance = ceiling - 500 < 10000 ? 500 : 1000;
  const firstAlt = ceiling - clearance;
  lines.push({ lineAlt: firstAlt, text: `-${clearance}`, textAlt: firstAlt + clearance / 2, ceiling });

  let finalAlt = Math.round(firstAlt / 1000) * 1000 - 500;
  const dif = finalAlt - firstAlt;
  if (dif !== 0) lines.push({ lineAlt: finalAlt, text: `${dif}`, textAlt: finalAlt - dif / 2, ceiling });

  const thousand = Math.floor(finalAlt / 1000);
  const wantOdd = course < 180;
  if ((thousand % 2 === 1) !== wantOdd) {
    finalAlt -= 1000;
    lines.push({ lineAlt: finalAlt, text: '-1000', textAlt: finalAlt + 500, ceiling });
  }
  return { answer: `${finalAlt.toLocaleString()} ft`, altitude: finalAlt, lines };
};

// Runways in eighths of the compass, index 0 = Runway 18 (landing south).
export const RUNWAYS = ['Runway 18', 'Runway 23', 'Runway 27', 'Runway 32', 'Runway 36', 'Runway 05', 'Runway 09', 'Runway 14'];

// The runway for a runway-indicator problem. `direction` is an eighth (0 = N); `to` means
// heading towards it, else arriving from it. A relative indicator points `randPosi` (0
// towards you, 1 left, 2 away, 3 right, plus `randPosi2` in complex mode); otherwise it
// points to `flagDirection`. `indicator` 0 is the tetrahedron (points into the wind),
// 1 the windsock (points downwind).
export const runwayIndex = ({ direction, to, relative, randPosi, randPosi2, indicator, flagDirection }) => {
  if (!relative) return indicator === 0 ? (flagDirection + 4) % 8 : flagDirection;
  const base = to ? (direction + 4) % 8 : direction;
  const offset = randPosi2 != null ? randPosi + randPosi2 : 2 * randPosi;
  let index = (base + offset) % 8;
  if (indicator === 0) index = (index + 4) % 8;
  // Towards-you and right-of-you average across north, not south.
  if ([randPosi, randPosi2].includes(0) && [randPosi, randPosi2].includes(3)) index = (index + 4) % 8;
  return index;
};
