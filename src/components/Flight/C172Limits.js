import React from 'react';
import useLimitsDrill from '../epsLimits/useLimitsDrill';
import LimitsControls from '../epsLimits/LimitsControls';
import { C172_LIMITS } from './c172Data';

// NIFE's limits table: the C172 limits exam as it is handed out, one box per blank. The table
// is markup because it is a recreation of the sheet; the answers are data (c172Data.js). A
// limits table is bespoke to its school's exam, so it keeps its own look (`.limits-table`) rather
// than Primary's; the behaviour is the shared drill (useLimitsDrill).

// Blanks that belong to one instrument (tachMin, tachMax) share the stem before Min, Normal or
// Max, and are asked together in Random mode.
const stemOf = (key) => key.replace(/(Min|Normal|Max)$/, '');

const GROUPS = (() => {
  const byStem = new Map();
  for (const k of Object.keys(C172_LIMITS)) {
    const stem = stemOf(k);
    if (!byStem.has(stem)) byStem.set(stem, []);
    byStem.get(stem).push(k);
  }
  return [...byStem.values()].filter((g) => g.length > 1);
})();

function C172Limits({ isGameActive = false, onGameComplete }) {
  const drill = useLimitsDrill(C172_LIMITS, GROUPS, { isGameActive, onGameComplete });

  // One blank.
  const box = (key, placeholder, style) => (
    <input
      type="text"
      value={drill.value(key)}
      onChange={(e) => drill.onChange(key, e.target.value)}
      className={drill.inputClass(key)}
      placeholder={placeholder}
      style={style}
    />
  );
  const WIDE = { width: '100%' };

  return (
    <div className="limits-eps-container" onKeyDown={drill.onKeyDown}>
      <h1>Aircraft Limits</h1>
      <p className="page-subtitle">
        Do not include units, just numbers. For values with a range use the format "min-max" or "min to max"
      </p>
      <div className="limits-table-container">
        <table className="limits-table">
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Min</th>
              <th>Normal</th>
              <th>Caution</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Tachometer</td><td></td><td>{box('tachMin', 'RPM')}</td><td></td><td>{box('tachMax', 'RPM')}</td></tr>
            <tr><td>Oil Temp</td><td></td><td>{box('oilTempNormal', '°F')}</td><td></td><td>{box('oilTempMax', '°F')}</td></tr>
            <tr><td>Oil Press</td><td>{box('oilPressMin', 'PSI')}</td><td>{box('oilPressNormal', 'PSI')}</td><td></td><td>{box('oilPressMax', 'PSI')}</td></tr>
            <tr><td>Oil Quantity</td><td>{box('oilQuantMin', 'qts')}</td><td>{box('oilQuantNormal', 'qts')}</td><td></td><td>{box('oilQuantMax', 'qts')}</td></tr>
            <tr><td>Carb. Air Temp</td><td></td><td></td><td>{box('carbTemp', '°C', WIDE)}</td><td></td></tr>
            <tr><td>Starter Duty Cycle</td><td colSpan={4}>{box('starterDuty', undefined, WIDE)}</td></tr>
            <tr><td>Max Weight</td><td>{box('maxWeight', 'lbs')}</td></tr>
            <tr><td>Baggage Allowance</td><td>{box('baggage', 'lbs')}</td></tr>
            <tr><td>Fuel Capacity</td><td>{box('fuelCapacity', 'gal')}</td></tr>
            <tr><td>Max Crosswind</td><td>{box('maxCrosswind', 'kts')}</td></tr>
            <tr><td>Max Angle of Bank</td><td>{box('maxBank', '°')}</td></tr>
            <tr><td>Service Ceiling</td><td>{box('serviceCeiling', 'ft')}</td></tr>
            <tr><td>Wingspan</td><td>{box('wingspan', 'ft')}</td></tr>
            <tr><td>Limit Load Factors:</td><td></td></tr>
            <tr><td>Flaps Up:</td><td>{box('flapsUpMax', '+ to -')}</td></tr>
            <tr><td>Flaps Down:</td><td>{box('flapsDownMax', '+ to -')}</td></tr>
            <tr><td>V<sub>NE</sub></td><td>{box('vne', 'KIAS')}</td></tr>
            <tr><td>V<sub>NO</sub></td><td>{box('vno', 'KIAS')}</td></tr>
            <tr><td>V<sub>A</sub></td><td>{box('va', 'KIAS')}</td></tr>
            <tr><td>V<sub>FE</sub></td><td>{box('vfe', 'KIAS')}</td></tr>
            <tr><td>V<sub>Y</sub></td><td>{box('vy', 'KIAS')}</td></tr>
            <tr><td>V<sub>X</sub></td><td>{box('vx', 'KIAS')}</td></tr>
            <tr><td>V<sub>glide</sub></td><td>{box('vglide', 'KIAS')}</td></tr>
            <tr><td>V<sub>R</sub></td><td>{box('vr', 'KIAS')}</td></tr>
            <tr><td>V<sub>S</sub></td><td>{box('vs', 'KIAS')}</td></tr>
            <tr><td>V<sub>SO</sub></td><td>{box('vso', 'KIAS')}</td></tr>
          </tbody>
        </table>
      </div>
      <LimitsControls drill={drill} isGameActive={isGameActive} />
    </div>
  );
}

export default C172Limits;
