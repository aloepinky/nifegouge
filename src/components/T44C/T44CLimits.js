import React from 'react';
import useLimitsDrill from '../epsLimits/useLimitsDrill';
import { T44C_LIMITS, T44C_LIMIT_GROUPS } from './t44cData';

// Advanced's limits table: the T-44C operating limits sheet as it is handed out, one box per
// blank. The markup is a recreation of the sheet; the answers are data (t44cData.js) and the
// behaviour is the shared drill. A limits table is bespoke to its school's exam, so this keeps
// its own look (`.t44c-*`) rather than NIFE's `.limits-table` or Primary's inline styles.
//
// What the sheet prints itself is printed here: every "---", "Indication", "(Min)" and footnote
// marker, and the prose of notes 6 through 9, which carry no blanks.

const DASH = <span className="t44c-dash">---</span>;

// A row of the engine grid: the label, then its eight cells in column order. A cell is either a
// field key or one of the sheet's own printed cells.
const GRID = [
  ['MAX. ALLOWABLE', 'maxAllowTime', 'maxAllowTq2200', DASH, 'maxAllowItt', 'maxAllowN1', 'maxAllowNp', 'maxAllowOilP', 'maxAllowOilT'],
  ['MAX. CONTINUOUS (8)', 'maxContTime', 'maxContTq2200', 'maxContTq1900', 'maxContItt', 'maxContN1', 'maxContNp', 'maxContOilP', 'maxContOilT'],
  ['CRUISE CLIMB', 'cruiseClimbTime', 'cruiseClimbTq2200', 'cruiseClimbTq1900', 'cruiseClimbItt', 'cruiseClimbN1', 'cruiseClimbNp', 'cruiseClimbOilP', 'cruiseClimbOilT'],
  ['CRUISE', 'cruiseTime', 'cruiseTq2200', 'cruiseTq1900', 'cruiseItt', 'cruiseN1', 'cruiseNp', 'cruiseOilP', 'cruiseOilT'],
  ['HI-IDLE (1)', 'hiIdleTime', DASH, DASH, DASH, DASH, DASH, DASH, 'hiIdleOilT'],
  ['LO-IDLE (2)', 'loIdleTime', DASH, DASH, ['loIdleItt', '6'], DASH, DASH, ['loIdleOilP', '', '(Min)'], 'loIdleOilT'],
  ['STARTING', 'startingTime', DASH, DASH, ['startingItt', '4'], DASH, <span key="np">{DASH} <sup>10</sup></span>, <span key="ind">Indication</span>, ['startingOilT', '', '(MIN)']],
  ['ACCELERATION (7)', 'accelTime', 'accelTq', null, 'accelItt', 'accelN1', 'accelNp', DASH, 'accelOilT'],
  ['MAX. REVERSE', 'maxRevTime', DASH, DASH, 'maxRevItt', 'maxRevN1', 'maxRevNp', 'maxRevOilP', 'maxRevOilT'],
];

const COLUMNS = ['Max time', 'Torque at 2,200 rpm', 'Torque at 1,900 rpm', 'Max observed ITT', 'N1 percent', 'Np rpm', 'Oil pressure', 'Oil temperature'];

function T44CLimits({ isGameActive = false, onGameComplete }) {
  const drill = useLimitsDrill(T44C_LIMITS, T44C_LIMIT_GROUPS, { isGameActive, onGameComplete });

  // One blank. `label` is what a screen reader reads; `size` sets how wide it draws.
  const b = (key, label, size = 'md') => (
    <input
      type="text"
      aria-label={label}
      className={`t44c-blank t44c-blank--${size} ${drill.inputClass(key)}`}
      value={drill.value(key)}
      onChange={(e) => drill.onChange(key, e.target.value)}
    />
  );

  const cell = (spec, rowLabel, colLabel) => {
    if (spec === null) return null;
    if (Array.isArray(spec)) {
      const [key, marker, suffix] = spec;
      return (
        <>
          {b(key, `${rowLabel} ${colLabel}`, 'sm')}
          {marker && <sup> {marker}</sup>}
          {suffix && <span className="t44c-unit"> {suffix}</span>}
        </>
      );
    }
    if (typeof spec === 'string') return b(spec, `${rowLabel} ${colLabel}`, 'fill');
    return spec;
  };

  return (
    <div className="limits-eps-container t44c-page" onKeyDown={drill.onKeyDown}>
      <h1>T-44C Operating Limits</h1>
      <p className="page-subtitle">
        Do not include units, just numbers. For values with a range use the format "min-max" or "min to max"
      </p>

      <div className="t44c-sheet">
        <div className="t44c-gridwrap">
          <table className="t44c-grid">
            <thead>
              <tr>
                <th aria-hidden="true" />
                <th colSpan={8} className="t44c-banner">OPERATING LIMITS</th>
              </tr>
              <tr>
                <th rowSpan={2}>OPERATING<br />CONDITION</th>
                <th rowSpan={2}>MAX<br />TIME</th>
                <th colSpan={2}>TORQUE FT-LB <sup>(9)</sup></th>
                <th rowSpan={2}>MAX<br />OBSERVED<br />ITT</th>
                <th rowSpan={2}>N1% <sup>(5)</sup></th>
                <th rowSpan={2}>Np RPM<br />(PROP)</th>
                <th rowSpan={2}>OIL PRESS<br />PSI <sup>(3)</sup></th>
                <th rowSpan={2}>OIL TEMP °C</th>
              </tr>
              <tr>
                <th>RPM<br />2,200</th>
                <th>RPM<br />1,900</th>
              </tr>
            </thead>
            <tbody>
              {GRID.map(([label, ...cells]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {cells.map((spec, i) => (
                    spec === null ? null : (
                      <td key={COLUMNS[i]} colSpan={cells[i + 1] === null ? 2 : 1}>
                        {cell(spec, label, COLUMNS[i])}
                      </td>
                    )
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="t44c-banner t44c-banner--section">NOTES</div>
        <ol className="t44c-notes">
          <li>N1 {b('note1N1Min', 'Note 1 N1 minimum', 'sm')} to {b('note1N1Max', 'Note 1 N1 maximum', 'sm')} %.</li>
          <li>
            N1 {b('note2N1Min', 'Note 2 N1 minimum', 'sm')} to {b('note2N1Max', 'Note 2 N1 maximum', 'sm')} %.
            Ground operations above 3,500-foot pressure altitude (PA) may produce idle speeds as high as 83% N1
            with condition levers at low idle.
          </li>
          <li>
            Normal oil pressure is {b('note3NormalMin', 'Note 3 normal oil pressure minimum', 'sm')} to{' '}
            {b('note3NormalMax', 'Note 3 normal oil pressure maximum', 'sm')} PSIG at power settings above
            27,000 rpm (72%) N1, oil pressure below {b('note3Undesirable', 'Note 3 undesirable oil pressure', 'sm')} PSIG
            is undesirable, and may be used only for completion of a flight, and then at a reduced power setting.
            Low oil pressure should be corrected prior to next flight. During ground operations, oil pressures
            below {b('note3GroundMin', 'Note 3 ground shutdown oil pressure', 'sm')} PSIG require engine shutdown;
            during flight, oil pressure below {b('note3FlightMin', 'Note 3 in-flight unsafe oil pressure', 'sm')} PSIG
            is unsafe and requires either engine shutdown or use of minimum power until a landing can be made.
          </li>
          <li>
            This value is time limited to two seconds. If ITT is likely to exceed{' '}
            {b('note4Itt', 'Note 4 ITT limit', 'sm')} °C, discontinue start.
          </li>
          <li>
            For every 10 °C below −30 °C ambient temperature, reduce maximum allowable N1 by{' '}
            {b('note5N1Reduce', 'Note 5 N1 reduction', 'sm')} %.
          </li>
          <li>High ITT may be decreased by reducing accessory load and/or increasing N1 speed.</li>
          <li>High generator loads at low N1 speeds may cause the ITT acceleration temperature limit to be exceeded. Observe the generator load limits.</li>
          <li>This power rating is intended for emergency use at the discretion of the pilot.</li>
          <li>Torque limits between 1,900 and 2,200 rpm vary linearly between 1,315 and 1,520 ft-lb.</li>
          <li>
            If propeller rpm does not read between {b('note10RpmMin', 'Note 10 minimum rpm', 'sm')} and{' '}
            {b('note10RpmMax', 'Note 10 maximum rpm', 'sm')} rpm with the power levers at idle and condition
            levers at low idle, perform a low pitch torque check to ensure propeller flight idle stops are
            correctly adjusted.
          </li>
        </ol>

        <div className="t44c-cols">
          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">AIRSPEED LIMITATIONS (KIAS)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>MAX DIVE/LEVEL FLIGHT (V<sub>MO</sub>): {b('vmo', 'VMO')}</li>
              <li>
                DECREASE V<sub>MO</sub> {b('vmoDecrease', 'VMO decrease', 'sm')} KIAS FOR EVERY{' '}
                {b('vmoPerFt', 'VMO decrease interval', 'sm')} FT ABOVE {b('vmoAboveFt', 'VMO decrease above altitude', 'sm')} FT
              </li>
              <li>MACH LIMIT (M<sub>MO</sub>): {b('mmo', 'MMO')}</li>
              <li>MINIMUM SAFE ONE ENGINE INOPERATIVE (V<sub>SSE</sub>): {b('vsse', 'VSSE')}</li>
              <li>MINIMUM CONTROLLABLE (V<sub>MCA</sub>): {b('vmca', 'VMCA')}</li>
              <li>MANEUVERING (V<sub>A</sub>): {b('va', 'VA')}</li>
              <li>MAXIMUM LANDING GEAR EXTENDED (V<sub>LE</sub>): {b('vle', 'VLE')}</li>
              <li>MAXIMUM LANDING GEAR RETRACTION (V<sub>LR</sub>): {b('vlr', 'VLR')}</li>
              <li>
                MAX FLAP EXTENSION/EXTENDED (V<sub>FE</sub>):{' '}
                APPROACH (V<sub>FE</sub>35): {b('vfe35', 'VFE approach')}
                <span className="t44c-subrow">FULL (V<sub>FE</sub>100): {b('vfe100', 'VFE full')}</span>
              </li>
              <li>BEST ANGLE OF CLIMB (V<sub>X</sub>): {b('vx', 'VX')}</li>
              <li>BEST RATE OF CLIMB (V<sub>Y</sub>): {b('vy', 'VY')}</li>
              <li>BEST ANGLE OF CLIMB SINGLE ENGINE (V<sub>XSE</sub>): {b('vxse', 'VXSE')}</li>
              <li>BEST RATE OF CLIMB SINGLE ENGINE (V<sub>YSE</sub>): {b('vyse', 'VYSE')}</li>
              <li>MAX RANGE GLIDE: {b('maxRangeGlide', 'Max range glide')}</li>
              <li>MAX ENDURANCE GLIDE: {b('maxEnduranceGlide', 'Max endurance glide')}</li>
              <li>MIN CONTROLLABLE SPEED ON GROUND (V<sub>MCG</sub>): {b('vmcg', 'VMCG')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">GENERAL LIMITATIONS</div>
            <ul className="t44c-rows t44c-rows--center">
              <li>
                PNEUMATIC PRESSURE NORM OPERATING RANGE: {b('pneumaticMin', 'Pneumatic pressure minimum', 'sm')} -{' '}
                {b('pneumaticMax', 'Pneumatic pressure maximum', 'sm')} PSI
              </li>
              <li>
                GYRO SUCTION NORM OPERATING RANGE: {b('gyroMin', 'Gyro suction minimum', 'sm')} -{' '}
                {b('gyroMax', 'Gyro suction maximum', 'sm')} inHg
              </li>
              <li>
                MIN OXYGEN REQUIRED FOR LOCAL/X-C FLIGHT: {b('oxygenLocal', 'Minimum oxygen local', 'sm')} /{' '}
                {b('oxygenXc', 'Minimum oxygen cross-country', 'sm')} PSI
              </li>
              <li>MAXIMUM OPERATING CABIN PRESSURE DIFFERENTIAL: {b('cabinDiff', 'Cabin pressure differential')} PSI</li>
              <li>NORMAL TAS ALTITUDE RANGE: +/- {b('tasAltRange', 'Normal TAS altitude range')} FEET</li>
              <li>ALTITUDE CEILING: {b('altitudeCeiling', 'Altitude ceiling')} FT</li>
            </ul>
          </section>

          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">STARTER CYCLE LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>STARTER DUTY CYCLE IS LIMITED TO THREE {b('starterCycleLength', 'Starter cycle length', 'wide')} CYCLES</li>
              <li>COOLING PERIOD AFTER FIRST STARTER CYCLE: {b('starterCool1', 'Cooling period after first cycle')}</li>
              <li>COOLING PERIOD AFTER SECOND STARTER CYCLE: {b('starterCool2', 'Cooling period after second cycle')}</li>
              <li>COOLING PERIOD AFTER THIRD STARTER CYCLE: {b('starterCool3', 'Cooling period after third cycle')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ELECTRICAL LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>DC GENERATOR VOLTAGE: {b('dcGenVolt', 'DC generator voltage')} ± {b('dcGenTol', 'DC generator voltage tolerance', 'sm')} VDC</li>
              <li>MIN BATTERY VOLTAGE FOR APU CHARGE: {b('apuChargeVolts', 'Minimum battery voltage for APU charge')} VDC</li>
              <li>MIN BATTERY VOLTAGE FOR APU START: {b('apuStartVolts', 'Minimum battery voltage for APU start')} VDC</li>
              <li>MIN BATTERY VOLTAGE FOR BATT START: {b('battStartVolts', 'Minimum battery voltage for battery start')} VDC</li>
              <li>
                PROP DEICER AMMETER NORMAL OPERATION: {b('propDeicerMin', 'Prop deicer ammeter minimum', 'xs')}-{' '}
                {b('propDeicerMax', 'Prop deicer ammeter maximum', 'xs')} AMPS
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">PROHIBITED MANEUVERS</div>
            <ol className="t44c-rows t44c-rows--numbered">
              <li>{b('prohib1', 'Prohibited maneuver 1', 'lg')}</li>
              <li>{b('prohib2', 'Prohibited maneuver 2', 'lg')}</li>
            </ol>

            <div className="t44c-banner t44c-banner--section">ACCELERATION LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>
                <span className="t44c-tab">CLEAN:</span>
                {b('accelCleanPos', 'Clean positive G limit', 'sm')} TO {b('accelCleanNeg', 'Clean negative G limit', 'sm')} G's
              </li>
              <li>
                <span className="t44c-tab">FULL FLAPS:</span>
                {b('accelFlapsPos', 'Full flaps positive G limit', 'sm')} TO {b('accelFlapsNeg', 'Full flaps negative G limit', 'sm')} G's
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">WEIGHT LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>MAXIMUM RAMP: {b('maxRamp', 'Maximum ramp weight')} POUNDS.</li>
              <li>MAXIMUM TAKEOFF: {b('maxTakeoff', 'Maximum takeoff weight')} POUNDS.</li>
              <li>MAXIMUM LANDING: {b('maxLanding', 'Maximum landing weight')} POUNDS</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">LANDING LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>{b('landingType', 'Landing type', 'wide')} LANDINGS ONLY.</li>
              <li>MAXIMUM SINK RATE AT GROUND CONTACT: {b('maxSinkRate', 'Maximum sink rate')} FPM.</li>
              <li>MAXIMUM CROSSWIND COMPONENT: {b('maxCrosswind', 'Maximum crosswind component')} KNOTS.</li>
            </ul>
          </section>
        </div>

        <p className="t44c-fuel">
          THE TOTAL FUEL SYSTEM CAPACITY IS {b('fuelTotal', 'Total fuel capacity')} U.S. GALLONS, OF WHICH{' '}
          {b('fuelUsable', 'Usable fuel capacity')} U.S. GALLONS ARE USABLE.
        </p>
      </div>

      {drill.queue && (
        <div className="epl-limits-progress">Random Mode: Limit {drill.at + 1} of {drill.queue.length}</div>
      )}
      {!isGameActive && (
        <div className="button-row" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button type="button" onClick={drill.next}>Next Answer</button>
          <button type="button" onClick={drill.all}>All Answers</button>
          <button type="button" onClick={drill.check}>Check Answers</button>
          <button type="button" onClick={drill.reset}>Reset</button>
          <button type="button" className={`epl-random${drill.queue ? ' active' : ''}`} aria-pressed={!!drill.queue}
            onClick={drill.toggleRandom}>
            Random Mode
          </button>
        </div>
      )}
    </div>
  );
}

export default T44CLimits;
