import React, { useEffect, useMemo, useState } from 'react';
import {
  ARMS, LBS_PER_GAL, STUDENT_FUEL_GAL, BAGGAGE_LBS, TAXI_FUEL_LBS, FUEL_BURN_LBS,
  MAX_WEIGHT, AFT_LIMIT, ENVELOPE, MAX_TAILWIND, checkCg, takeoffDistances, landingDistances,
} from './nifeTold';

// The NIFE TOLD card, as the In-Flight Guide prints it (NASCINST 3710.3E, p. 24): weight and
// balance, distances, and the airport rows. It checks the takeoff and landing CG against the
// guide's Center of Gravity Limits chart and reads the distances off its 180 HP tables
// (nifeTold.js has the figures). The heading comes from the page above.
//
// What is typed is kept in this browser, so the card is as it was left.

const STORE_KEY = 'nifeToldCard';

const BLANK = {
  student: 'first',
  basic: { weight: '', moment: '' },
  front: { weight: '', arm: String(ARMS.front) },
  rear: { weight: '', arm: String(ARMS.rear) },
  baggage: { weight: String(BAGGAGE_LBS), arm: String(ARMS.baggage) },
  fuel: { weight: String(STUDENT_FUEL_GAL.first * LBS_PER_GAL), arm: String(ARMS.fuel) },
  taxi: { weight: String(TAXI_FUEL_LBS), arm: String(ARMS.fuel) },
  burn: { weight: String(FUEL_BURN_LBS), arm: String(ARMS.fuel) },
  takeoff: { elevation: '', temp: '', wind: '', windDir: 'head' },
  landing: { elevation: '', temp: '', wind: '', windDir: 'head' },
  airports: [0, 1, 2, 3].map(() => ({ airport: '', runway: '', size: '' })),
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved || typeof saved !== 'object') return BLANK;
    const card = { ...BLANK };
    Object.keys(BLANK).forEach((k) => {
      if (!(k in saved)) return;
      if (k === 'student') card.student = saved.student === 'second' ? 'second' : 'first';
      else if (k === 'airports') card.airports = BLANK.airports.map((a, i) => ({ ...a, ...(saved.airports || [])[i] }));
      else card[k] = { ...BLANK[k], ...saved[k] };
    });
    return card;
  } catch {
    return BLANK;
  }
}

function save(card) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(card));
  } catch {
    // Private mode: the card still works for this visit.
  }
}

const num = (s) => (String(s).trim() === '' ? NaN : Number(s));
const shown = (n, places = 0) => (Number.isFinite(n) ? n.toFixed(places) : '');

// Lines 2-5, 7 and 9 are weight × arm; line 1 is weight and moment from the aircraft's record.
function lineOf({ weight, arm }) {
  const w = num(weight);
  const a = num(arm);
  return { weight: w, arm: a, moment: w * a };
}

function total(w, m) {
  return { weight: w, moment: m, arm: w > 0 ? m / w : NaN };
}

function useWeights(card) {
  return useMemo(() => {
    const basicW = num(card.basic.weight);
    const basicM = num(card.basic.moment);
    const basic = { weight: basicW, moment: basicM, arm: basicW > 0 ? basicM / basicW : NaN };
    const front = lineOf(card.front);
    const rear = lineOf(card.rear);
    const baggage = lineOf(card.baggage);
    const fuel = lineOf(card.fuel);
    const taxi = lineOf(card.taxi);
    const burn = lineOf(card.burn);
    // A blank optional line (no one in back) counts as nothing; a blank basic weight leaves the
    // totals blank, since without it nothing below means anything.
    const add = (l) => (Number.isFinite(l.weight) ? l : { weight: 0, moment: 0 });
    const parts = [front, rear, baggage, fuel].map(add);
    const ready = Number.isFinite(basicW) && Number.isFinite(basicM);
    const rampW = ready ? parts.reduce((s, l) => s + l.weight, basicW) : NaN;
    const rampM = ready ? parts.reduce((s, l) => s + (Number.isFinite(l.moment) ? l.moment : 0), basicM) : NaN;
    const t = add(taxi);
    const b = add(burn);
    const ramp = total(rampW, rampM);
    const takeoff = total(rampW - t.weight, rampM - (t.moment || 0));
    const landing = total(takeoff.weight - b.weight, takeoff.moment - (b.moment || 0));
    return { basic, front, rear, baggage, fuel, ramp, taxi, takeoff, burn, landing };
  }, [card]);
}

function NumberCell({ value, onChange, label, minus }) {
  return (
    <td className={minus ? 'told-minus' : undefined}>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace('-', ''))}
        aria-label={label}
      />
    </td>
  );
}

function Shown({ value, places, minus }) {
  const text = shown(value, places);
  return <td className={`told-calc${minus && text ? ' told-minus' : ''}`}>{text}</td>;
}

// The Center of Gravity Limits chart, drawn small, with the takeoff and landing points on it.
const X0 = 34;
const X1 = 48;
const Y0 = 1500;
const Y1 = 2600;
const W = 300;
const H = 200;
const PAD = { l: 38, r: 8, t: 8, b: 26 };
const px = (cg) => PAD.l + ((cg - X0) / (X1 - X0)) * (W - PAD.l - PAD.r);
const py = (wt) => H - PAD.b - ((wt - Y0) / (Y1 - Y0)) * (H - PAD.t - PAD.b);
const ENVELOPE_POINTS = ENVELOPE.map(([cg, wt]) => `${px(cg)},${py(wt)}`).join(' ');
const GRID = (
  <g className="told-cg-grid">
    {Array.from({ length: X1 - X0 + 1 }, (_, i) => X0 + i).map((cg) => (
      <g key={`x${cg}`}>
        <line x1={px(cg)} x2={px(cg)} y1={py(Y0)} y2={py(Y1)} />
        {cg % 2 === 0 && <text x={px(cg)} y={H - PAD.b + 12} textAnchor="middle">{cg}</text>}
      </g>
    ))}
    {Array.from({ length: (Y1 - Y0) / 100 + 1 }, (_, i) => Y0 + i * 100).map((wt) => (
      <g key={`y${wt}`}>
        <line x1={px(X0)} x2={px(X1)} y1={py(wt)} y2={py(wt)} />
        {wt % 200 === 0 && <text x={PAD.l - 4} y={py(wt) + 3} textAnchor="end">{wt}</text>}
      </g>
    ))}
    <text x={(PAD.l + W - PAD.r) / 2} y={H - 2} textAnchor="middle">CG, inches aft of datum</text>
  </g>
);

const onChart = (p) => p.weight >= Y0 && p.weight <= Y1 && p.arm >= X0 && p.arm <= X1;

function CgChart({ takeoff, landing }) {
  const pts = [['T/O', takeoff, 'told-cg-to'], ['LDG', landing, 'told-cg-ldg']]
    .filter(([, p]) => Number.isFinite(p.arm) && onChart(p));
  return (
    <svg className="told-cg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Center of gravity limits, with the takeoff and landing points">
      {GRID}
      <polygon className="told-cg-envelope" points={ENVELOPE_POINTS} />
      {pts.length === 2 && (
        <line className="told-cg-shift" x1={px(takeoff.arm)} y1={py(takeoff.weight)} x2={px(landing.arm)} y2={py(landing.weight)} />
      )}
      {pts.map(([label, p, cls]) => (
        <g key={label} className={cls}>
          <circle cx={px(p.arm)} cy={py(p.weight)} r="4" />
          <text x={px(p.arm) + 7} y={py(p.weight) + (label === 'T/O' ? -4 : 11)}>{label}</text>
        </g>
      ))}
    </svg>
  );
}

function Verdict({ name, point }) {
  const result = checkCg(point.weight, point.arm);
  if (!result) return <li className="told-cg-none">{name}: enter line 1.</li>;
  return (
    <li className={result.ok ? 'told-cg-ok' : 'told-cg-out'}>
      {name}: {shown(point.weight)} lbs at {shown(point.arm, 2)} in, {result.ok ? 'within limits' : result.why}.
    </li>
  );
}

function condOf(c) {
  const wind = num(c.wind);
  return { elevation: num(c.elevation), temp: num(c.temp), headwind: c.windDir === 'tail' ? -wind : wind };
}

// Landing conditions left blank are the takeoff's, shown greyed as the box's placeholder.
function landingCond(takeoff, landing) {
  const pick = (k) => (String(landing[k]).trim() === '' ? takeoff[k] : landing[k]);
  const windBlank = String(landing.wind).trim() === '';
  return {
    elevation: pick('elevation'),
    temp: pick('temp'),
    wind: windBlank ? takeoff.wind : landing.wind,
    windDir: windBlank ? takeoff.windDir : landing.windDir,
  };
}

function DistanceRow({ name, result }) {
  if (!result) return <tr><td>{name}</td><td className="told-calc" /><td className="told-calc" /></tr>;
  if (result.error) return <tr><td>{name}</td><td colSpan="2" className="told-calc told-off">Off the chart: {result.error}</td></tr>;
  return (
    <tr>
      <td>{name}</td>
      <td className="told-calc">{result.ground}</td>
      <td className="told-calc">{result.total}</td>
    </tr>
  );
}

function wording(result) {
  if (!result || result.error) return null;
  const alt = result.alt ? `${result.alt} ft` : 'sea level';
  const pct = Math.round((result.factor - 1) * 100);
  const wind = pct ? `, ${Math.abs(pct)}% ${pct < 0 ? 'less' : 'more'} for wind` : '';
  return `${result.weight} lbs table, ${alt}, ${result.col}°C${wind}`;
}

function ToldCard() {
  const [card, setCard] = useState(load);
  useEffect(() => save(card), [card]);
  const w = useWeights(card);

  const set = (line, field) => (value) => setCard((c) => ({ ...c, [line]: { ...c[line], [field]: value } }));
  const setStudent = (student) => setCard((c) => ({
    ...c, student, fuel: { ...c.fuel, weight: String(STUDENT_FUEL_GAL[student] * LBS_PER_GAL) },
  }));
  const setAirport = (i, field) => (e) => setCard((c) => ({
    ...c, airports: c.airports.map((a, j) => (j === i ? { ...a, [field]: e.target.value } : a)),
  }));

  const toCond = card.takeoff;
  const ldgCond = landingCond(card.takeoff, card.landing);
  const toDist = takeoffDistances(w.takeoff.weight, condOf(toCond));
  const ldgDist = landingDistances(condOf(ldgCond));

  const row = (n, name, line, opts = {}) => (
    <tr className={opts.sum ? 'told-summary-row' : undefined}>
      <td>{n}</td>
      <td>{name}</td>
      {opts.sum ? <Shown value={w[line].weight} /> : <NumberCell value={card[line].weight} onChange={set(line, 'weight')} label={`${name} weight`} minus={opts.minus} />}
      {opts.sum || line === 'basic' ? <Shown value={w[line].arm} places={2} /> : <NumberCell value={card[line].arm} onChange={set(line, 'arm')} label={`${name} arm`} />}
      {line === 'basic' ? <NumberCell value={card.basic.moment} onChange={set('basic', 'moment')} label="Basic empty moment" /> : <Shown value={w[line].moment} minus={opts.minus} />}
    </tr>
  );

  const condRow = (label, field, unit) => (
    <tr>
      <td>{label} <span className="told-unit">{unit}</span></td>
      {['takeoff', 'landing'].map((k) => (
        <td key={k}>
          <input
            type="number"
            inputMode="decimal"
            value={card[k][field]}
            placeholder={k === 'landing' ? card.takeoff[field] : undefined}
            onChange={(e) => set(k, field)(e.target.value)}
            aria-label={`${k} ${label}`}
          />
        </td>
      ))}
    </tr>
  );

  return (
    <div className="told-card-container">
      <div className="told-header">
        <label className="told-header-item">
          Student
          <select value={card.student} onChange={(e) => setStudent(e.target.value)}>
            <option value="first">1st to fly ({STUDENT_FUEL_GAL.first} gal)</option>
            <option value="second">2nd to fly ({STUDENT_FUEL_GAL.second} gal)</option>
          </select>
        </label>
        <button type="button" className="brief-link" onClick={() => setCard(BLANK)}>clear card</button>
      </div>

      <table className="told-table told-wb">
        <thead>
          <tr>
            <th colSpan="2">Weight &amp; Balance</th>
            <th>Weight (lbs)</th>
            <th>Arm (in)</th>
            <th>Moment</th>
          </tr>
        </thead>
        <tbody>
          {row(1, 'Basic Empty Wt.', 'basic')}
          {row(2, 'Pilot/Front Pax', 'front')}
          {row(3, 'Rear Seat', 'rear')}
          {row(4, 'Baggage', 'baggage')}
          {row(5, 'Fuel (6 lbs/gal)', 'fuel')}
          {row(6, 'Ramp Wt.', 'ramp', { sum: true })}
          {row(7, 'Start/Taxi/Runup', 'taxi', { minus: true })}
          {row(8, 'Takeoff Wt.', 'takeoff', { sum: true })}
          {row(9, 'Est. Fuel Burn', 'burn', { minus: true })}
          {row(10, 'Landing Wt.', 'landing', { sum: true })}
        </tbody>
      </table>

      <div className="told-cg">
        <CgChart takeoff={w.takeoff} landing={w.landing} />
        <ul className="told-cg-verdicts">
          <Verdict name="Takeoff" point={w.takeoff} />
          <Verdict name="Landing" point={w.landing} />
        </ul>
      </div>

      <table className="told-table told-cond">
        <thead>
          <tr><th>Conditions</th><th>Takeoff</th><th>Landing</th></tr>
        </thead>
        <tbody>
          {condRow('Field elevation', 'elevation', 'ft')}
          {condRow('Temperature', 'temp', '°C')}
          <tr>
            <td>Wind <span className="told-unit">kts</span></td>
            {['takeoff', 'landing'].map((k) => (
              <td key={k} className="told-wind">
                <select
                  value={card[k].windDir}
                  onChange={(e) => set(k, 'windDir')(e.target.value)}
                  aria-label={`${k} headwind or tailwind`}
                >
                  <option value="head">Head</option>
                  <option value="tail">Tail</option>
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  value={card[k].wind}
                  placeholder={k === 'landing' ? card.takeoff.wind : undefined}
                  onChange={(e) => set(k, 'wind')(e.target.value.replace('-', ''))}
                  aria-label={`${k} wind component`}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <table className="told-table told-dist">
        <thead>
          <tr><th>Distances</th><th>Ground Roll</th><th>50ft Obstacle</th></tr>
        </thead>
        <tbody>
          <DistanceRow name="Takeoff" result={toDist} />
          <DistanceRow name="Landing" result={ldgDist} />
        </tbody>
      </table>
      {(wording(toDist) || wording(ldgDist)) && (
        <p className="told-dist-from">
          {wording(toDist) && <>Takeoff: {wording(toDist)}. </>}
          {wording(ldgDist) && <>Landing: {wording(ldgDist)}.</>}
        </p>
      )}

      <table className="told-table told-airports">
        <thead>
          <tr><th>Airport</th><th>Runway</th><th>Length/Width</th></tr>
        </thead>
        <tbody>
          {card.airports.map((a, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>
              <td><input type="text" value={a.airport} onChange={setAirport(i, 'airport')} aria-label={`Airport ${i + 1}`} /></td>
              <td><input type="text" value={a.runway} onChange={setAirport(i, 'runway')} aria-label={`Runway ${i + 1}`} /></td>
              <td><input type="text" value={a.size} onChange={setAirport(i, 'size')} aria-label={`Length and width ${i + 1}`} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="told-notes">
        <h3>Instructions</h3>
        <ul>
          <li>Line 1: basic weight and moment from sw.myflighttrain.com → Schedules → click the tail number (left column).</li>
          <li>Line 2: instructor + student actual weight. Line 3: one person in back, if applicable.</li>
          <li>Line 5: the 1st student to fly assumes {STUDENT_FUEL_GAL.first} gal ({STUDENT_FUEL_GAL.first * LBS_PER_GAL} lbs), the 2nd {STUDENT_FUEL_GAL.second} gal ({STUDENT_FUEL_GAL.second * LBS_PER_GAL} lbs).</li>
          <li>Line 9: 1.5 hr flight + 0.5 hr reserve at 8 gal/hr = 96 lbs, rounded up to {FUEL_BURN_LBS}.</li>
          <li>CG limits are the 180 HP AFM supplement&apos;s ({MAX_WEIGHT} lbs max, aft limit {AFT_LIMIT} in). Don&apos;t use the POH: it assumes a 160 HP engine.</li>
          <li>Distances are from the 180 HP tables: takeoff at the next weight up (2200, 2400 or 2550 lbs), landing at 2550 lbs, flaps 30. Elevation rounds up to the next 1,000 ft and temperature to the next 10°C.</li>
          <li>Wind: 10% less for each full 9 knots of headwind; 10% more for each 2 knots of tailwind, up to {MAX_TAILWIND} knots.</li>
          <li>The takeoff figures assume a short field takeoff, which NIFE doesn&apos;t use, so actual numbers will differ.</li>
        </ul>
      </div>
    </div>
  );
}

export default ToldCard;
