import React, { useEffect, useState } from 'react';
import { accelerateStop, singleEngineClimb, stallSpeed } from './t44cCharts';

// The VT-31 / VT-35 TOLD card, laid out as the squadron prints it, blanks staggered in the
// card's three columns (`col`). Rows marked `calc` are worked out; the rest are typed. Rows
// marked `brief` are the three the squadron's sample circles, the ones briefed. What is typed
// is kept in this browser, so the card is as it was left.

const STORE_KEY = 't44cToldCard';

// The figure line 5 subtracts from, as written on the squadron's sample card.
const LANDING_WEIGHT = 9168;

// Takeoff Weight is suggested as Gross Weight less this, until someone types there.
const GROSS_TO_TAKEOFF = 60;

const HEADER = [
  [{ id: 'buno', label: 'Buno' }, { id: 'side', label: 'Side' }, { id: 'parking', label: 'Parking Space' }],
  [{ id: 'oxygen', label: 'Oxygen' }, { id: 'fuel', label: 'Fuel' }, { id: 'takeoffWeight', label: 'Takeoff Weight' }],
];

const WEIGHTS = [
  { id: 'operating', n: 1, label: 'Operating Weight', col: 1, note: '(from repetitive Form F if applicable)' },
  { id: 'crew', n: 2, label: 'Extra Crewmembers', col: 1 },
  { id: 'cargo', n: 3, label: 'Cargo', col: 1 },
  { gap: 'landing', over: String(LANDING_WEIGHT), col: 2 },
  { id: 'total', n: 4, label: 'Total (1-3)', col: 2, calc: true },
  { id: 'maxFuelLand', n: 5, label: 'Maximum Fuel to land', col: 2, calc: true },
  { id: 'maxFuelSide', n: 6, label: 'Max Fuel per side (Max fuel to land /2)', col: 3, calc: true, brief: true },
  { id: 'fuelLoad', n: 7, label: 'Fuel Load', col: 1, calc: true },
  { id: 'gross', n: 8, label: 'Gross Weight (#4 + #7)', col: 1, calc: true },
];

const PERFORMANCE = [
  { id: 'accelStop', label: 'Accelerate / Stop Distance', col: 1 },
  { id: 'noReverse', sub: 'a.', label: 'High Idle, No Reverse +900 feet', col: 2, calc: true, brief: true },
  { id: 'reverse', sub: 'b.', label: 'High Idle, Reverse - 700 feet', col: 2, calc: true },
  { gap: 'above-climb' },
  { id: 'singleEngineClimb', label: 'One Engine INOP Max Rate of Climb', col: 3, brief: true },
  { gap: 'below-climb' },
  { label: 'Stall Speeds' },
  { id: 'stallUp', sub: 'a.', label: 'Flaps Up (0), 0 AOB', col: 3 },
  { id: 'stallApproach', sub: 'b.', label: 'Flaps Approach (35), 30 AOB', col: 3 },
  { id: 'stallFull', sub: 'c.', label: 'Flaps Full (100), 0 AOB', col: 3 },
];

const IDS = [
  ...HEADER.flat().map((f) => f.id),
  ...[...WEIGHTS, ...PERFORMANCE].filter((r) => r.id && !r.calc).map((r) => r.id),
  'oat', 'pressureAlt', 'headwind',
];

// What the NATOPS charts need that the printed card has no line for.
const CHART_INPUTS = [
  { id: 'oat', label: 'OAT (°C)' },
  { id: 'pressureAlt', label: 'Pressure Altitude (ft)' },
  { id: 'headwind', label: 'Headwind (kts, minus for tailwind)' },
];

const blankCard = () => Object.fromEntries(IDS.map((id) => [id, '']));

function loadCard() {
  const card = blankCard();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    IDS.forEach((id) => { if (typeof (saved || {})[id] === 'string') card[id] = saved[id]; });
  } catch {
    // Nothing usable saved: start blank.
  }
  return card;
}

const num = (s) => (String(s).trim() === '' ? NaN : Number(s));
const shown = (n) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '');

const roundTo = (n, step) => Math.round(n / step) * step;

// Lines 4 to 8, the two accelerate/stop cases, and the suggestions. No crew or cargo counts as
// nothing; no operating weight or no fuel leaves blank whatever depends on it. A suggestion
// fills only an empty box: what is typed there stays, and is what later lines work from.
function worked(card, clearing) {
  const extra = (s) => (Number.isFinite(num(s)) ? num(s) : 0);
  const suggest = (id, n) => (card[id] !== '' || clearing === id ? card[id] : shown(n));
  const total = num(card.operating) + extra(card.crew) + extra(card.cargo);
  const maxFuelLand = LANDING_WEIGHT - total;
  const takeoffWeight = suggest('takeoffWeight', total + num(card.fuel) - GROSS_TO_TAKEOFF);
  const weight = num(takeoffWeight);
  const air = { oat: num(card.oat), pa: num(card.pressureAlt), weight };
  const accelStop = suggest('accelStop', roundTo(accelerateStop({ ...air, headwind: extra(card.headwind) }), 50));
  return {
    takeoffWeight,
    accelStop,
    singleEngineClimb: suggest('singleEngineClimb', roundTo(singleEngineClimb(air), 10)),
    stallUp: suggest('stallUp', Math.round(stallSpeed('up', weight))),
    stallApproach: suggest('stallApproach', Math.round(stallSpeed('approach', weight, 30))),
    stallFull: suggest('stallFull', Math.round(stallSpeed('full', weight))),
    total: shown(total),
    maxFuelLand: shown(maxFuelLand),
    maxFuelSide: shown(Math.round(maxFuelLand / 2)),
    fuelLoad: shown(num(card.fuel)),
    gross: shown(total + num(card.fuel)),
    noReverse: shown(num(accelStop) + 900),
    reverse: shown(num(accelStop) - 700),
  };
}

function Blank({ id, label, card, set, numeric = true, readOnly = false, brief = false, onBlur }) {
  return (
    <td className={`t44c-told-blank${brief ? ' is-brief' : ''}`}>
      <input
        type="text"
        inputMode={numeric ? 'decimal' : undefined}
        value={card[id]}
        onChange={readOnly ? undefined : (e) => set(id, e.target.value)}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        onBlur={onBlur}
        aria-label={label}
      />
    </td>
  );
}

function Row({ row, card, set, onBlur }) {
  // The card leaves a line empty here; `over` is printed in it above the blank in column `col`.
  if (row.gap) {
    return (
      <tr className="t44c-told-gap">
        <td />
        {[1, 2, 3].map((col) => <td key={col}>{col === row.col ? row.over : null}</td>)}
      </tr>
    );
  }
  const label = (
    <>
      {row.n && <span className="t44c-told-n">{row.n}</span>}
      {row.sub && <span className="t44c-told-n">{row.sub}</span>}
      {row.label}
    </>
  );
  const labelClass = `t44c-told-label${row.sub ? ' is-sub' : ''}`;
  if (!row.col) return <tr><td colSpan={4} className={labelClass}>{label}</td></tr>;
  return (
    <tr>
      <td className={labelClass}>{label}</td>
      {[1, 2, 3].map((col) => {
        if (col === row.col) {
          return <Blank key={col} id={row.id} label={row.label} card={card} set={set} readOnly={row.calc} brief={row.brief} onBlur={onBlur} />;
        }
        if (row.note && col === row.col + 1) {
          return <td key={col} colSpan={3 - row.col} className="t44c-told-note told-unit">{row.note}</td>;
        }
        if (row.note && col > row.col) return null;
        return <td key={col} />;
      })}
    </tr>
  );
}

function T44CTold() {
  const [card, setCard] = useState(loadCard);
  // Backspacing a suggested box to nothing leaves it empty while the cursor is in it, so the
  // suggestion doesn't jump back mid-edit.
  const [clearing, setClearing] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(card));
    } catch {
      // Private mode: the card still works for this visit.
    }
  }, [card]);

  const set = (id, value) => setCard((c) => ({ ...c, [id]: value }));
  const values = { ...card, ...worked(card, clearing) };
  const type = (id, value) => {
    setClearing(value === '' ? id : null);
    set(id, value);
  };
  const leave = () => setClearing(null);

  return (
    <div className="told-card-container t44c-told">
      <div className="t44c-told-charts">
        {CHART_INPUTS.map((f) => (
          <label key={f.id}>
            {f.label}
            <input type="text" inputMode="text" value={card[f.id]} onChange={(e) => set(f.id, e.target.value)} />
          </label>
        ))}
      </div>

      <div className="t44c-told-card">
        <table className="told-table t44c-told-head">
          <thead>
            <tr><th colSpan={6}>VT-31 / VT-35 Takeoff-Landing Data Card (TOLD)</th></tr>
          </thead>
          <tbody>
            {HEADER.map((line) => (
              <tr key={line[0].id}>
                {line.map((f) => (
                  <React.Fragment key={f.id}>
                    <td className="t44c-told-label">{f.label}</td>
                    <Blank
                      id={f.id}
                      label={f.label}
                      card={values}
                      set={type}
                      numeric={f.id !== 'parking'}
                      onBlur={leave}
                    />
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {[WEIGHTS, PERFORMANCE].map((rows) => (
          <table className="told-table t44c-told-lines" key={rows[0].id}>
            <tbody>
              {rows.map((row) => <Row key={row.gap || row.label} row={row} card={values} set={type} onBlur={leave} />)}
            </tbody>
          </table>
        ))}
      </div>

      <p className="t44c-told-foot">
        Form F data based on standard configuration: 2 pilots and 2 seats aft. Any other configuration
        requires a new Form F.
      </p>

      <p className="t44c-told-foot">
        Accelerate/stop, rate of climb, and stall speeds based on NATOPS Figures 26.5-1, 27.1-2, and 25.12-1.
      </p>

      <div className="t44c-told-actions">
        <button type="button" onClick={() => setCard(blankCard())}>Clear All</button>
      </div>
    </div>
  );
}

export default T44CTold;
