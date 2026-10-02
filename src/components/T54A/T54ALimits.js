import React from 'react';
import useLimitsDrill from '../epsLimits/useLimitsDrill';
import LimitsControls from '../epsLimits/LimitsControls';
import { T54A_LIMITS, T54A_LIMIT_GROUPS } from './t54aData';

// The T-54A operating limits sheet as it is handed out (15 NOV 25 revision, 06 APR 26 update),
// one box per blank. The markup is a recreation of the blank sheet; the answers are data
// (t54aData.js) and the behaviour is the shared drill.
//
// It wears the T-44C sheet's classes (`.t44c-*` in style.css) rather than its own. The two
// sheets are the same Advanced exam format, and while the T-54A is a draft, styles of its own in
// style.css would be the one part of it a production build still carried.
//
// What the blank sheet prints itself is printed here: every "---", the footnote markers, and
// notes 1 to 8 in full, which carry no blanks. Labels are the blank sheet's: it asks for V_LR
// where the answer key prints V_LO.

const DASH = <span className="t44c-dash">---</span>;

// A row of the engine grid: the label, then its six cells in column order. A cell is a field
// key, `[key, marker]` for a blank the sheet hangs a footnote on, or one of the sheet's own
// printed cells.
const GRID = [
  ['Starting', DASH, ['startingItt', '(5)'], DASH, DASH, DASH, 'startingOilT'],
  ['Low Idle', DASH, ['loIdleItt', '(6)'], 'loIdleN1', 'loIdleN2', 'loIdleOilP', 'loIdleOilT'],
  ['High Idle', DASH, DASH, 'hiIdleN1', DASH, DASH, 'hiIdleOilT'],
  ['Takeoff and Max Cont', ['takeoffTq', '(10)'], 'takeoffItt', 'takeoffN1', ['takeoffN2', '(9)'], 'takeoffOilP', 'takeoffOilT'],
  ['Cruise Climb', ['cruiseClimbTq', '(7)(10)'], 'cruiseClimbItt', 'cruiseClimbN1', ['cruiseClimbN2', '(9)'], 'cruiseClimbOilP', 'cruiseClimbOilT'],
  ['Max Cruise', ['maxCruiseTq', '(7)(10)'], 'maxCruiseItt', 'maxCruiseN1', ['maxCruiseN2', '(9)'], 'maxCruiseOilP', 'maxCruiseOilT'],
  ['Normal Cruise', ['normCruiseTq', '(7)(10)'], 'normCruiseItt', 'normCruiseN1', ['normCruiseN2', '(9)'], 'normCruiseOilP', 'normCruiseOilT'],
  ['Max Reverse (8)', DASH, 'maxRevItt', 'maxRevN1', 'maxRevN2', 'maxRevOilP', 'maxRevOilT'],
  ['TRANSIENT', ['transientTq', '(5)'], 'transientItt', 'transientN1', ['transientN2', '(5)'], 'transientOilP', 'transientOilT'],
];

const COLUMNS = ['Torque', 'Max observed ITT', 'N1 percent', 'Prop rpm N2', 'Oil pressure', 'Oil temperature'];

function T54ALimits({ isGameActive = false, onGameComplete }) {
  const drill = useLimitsDrill(T54A_LIMITS, T54A_LIMIT_GROUPS, { isGameActive, onGameComplete });

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
    if (Array.isArray(spec)) {
      const [key, marker] = spec;
      return <>{b(key, `${rowLabel} ${colLabel}`, 'wide')}<sup> {marker}</sup></>;
    }
    if (typeof spec === 'string') return b(spec, `${rowLabel} ${colLabel}`, 'fill');
    return spec;
  };

  return (
    <div className="limits-eps-container t44c-page" onKeyDown={drill.onKeyDown}>
      <h1>T-54A Operating Limits</h1>
      <p className="page-subtitle">
        Do not include units, just numbers. For values with a range use the format "min-max" or "min to max"
      </p>

      <div className="t44c-sheet">
        <div className="t44c-gridwrap">
          <table className="t44c-grid">
            <thead>
              <tr>
                <th colSpan={7} className="t44c-banner">ENGINE OPERATING LIMITS</th>
              </tr>
              <tr>
                <th>OPERATING<br />CONDITION</th>
                <th>TORQUE<br />FT-LB/% (1)</th>
                <th>MAXIMUM<br />OBSERVED<br />ITT °C</th>
                <th>GAS<br />GENERATOR<br />RPM N1 %</th>
                <th>PROP RPM<br />N2</th>
                <th>OIL PRESS<br />PSI (2)</th>
                <th>OIL TEMP °C<br />(3) (4)</th>
              </tr>
            </thead>
            <tbody>
              {GRID.map(([label, ...cells]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {cells.map((spec, i) => (
                    <td key={COLUMNS[i]}>{cell(spec, label, COLUMNS[i])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="t44c-banner t44c-banner--section">NOTES</div>
        <ol className="t44c-notes">
          <li>
            Torque limit applies within range of 1,600 - 2,000 propeller rpm (N2). Below 1,600 propeller rpm, torque
            is limited to 1100 ft-lb.
          </li>
          <li>
            When gas generator speeds are above 27,000 rpm (72% N1) and oil temperatures are between +60 °C and
            +71 °C, normal oil pressures are:
            <ol type="a">
              <li>100 to 135 psi below 21,000 feet; 85 to 135 psi at 21,000 feet and above.</li>
              <li>
                Oil pressure between 60 and 85 psi is undesirable; it should be tolerated only for the completion of
                the flight, and then only at a reduced power setting not exceeding 1100 ft-lb torque. Oil pressure
                below 60 psi is unsafe; it requires that either the engine be shut down, or that a landing be made at
                the nearest suitable airport, using the minimum power required to sustain flight. Fluctuations of
                plus or minus 10 psi are acceptable.
              </li>
              <li>During extremely cold starts, oil pressure may reach 200 psi.</li>
            </ol>
          </li>
          <li>A minimum oil temperature of +55 °C is recommended for fuel heater operation at take-off power.</li>
          <li>
            Oil temperature limits are -40 °C and +110 °C. However, temperatures of between +99 °C and +110 °C are
            permitted for a maximum of 10 minutes.
          </li>
          <li>These values are limited to 5 seconds.</li>
          <li>High ITT at ground idle may be corrected by reducing accessory load and/or increasing N1 rpm.</li>
          <li>Cruise torque values vary with altitude and temperature.</li>
          <li>This operation is time limited to 1 minute.</li>
        </ol>

        <div className="t44c-cols">
          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">AIRSPEED LIMITATIONS (KIAS)</div>
            <ul className="t44c-rows">
              <li>MAX DIVE/LEVEL FLIGHT (V<sub>MO</sub>): {b('vmo', 'VMO', 'sm')} KIAS / {b('mmo', 'VMO Mach', 'sm')} MACH</li>
              <li>MINIMUM SAFE ONE ENGINE INOPERATIVE (V<sub>SSE</sub>): {b('vsse', 'VSSE')}</li>
              <li>
                MINIMUM CONTROLLABLE (V<sub>MCA</sub>): {b('vmcaAppr', 'VMCA flaps approach', 'sm')} (flaps appr){' '}
                {b('vmcaUp', 'VMCA flaps up', 'sm')} (flaps up)
              </li>
              <li>MANEUVERING (V<sub>A</sub>): {b('va', 'VA')}</li>
              <li>MAXIMUM LANDING GEAR EXTENDED (V<sub>LE</sub>): {b('vle', 'VLE')}</li>
              <li>MAXIMUM LANDING GEAR RETRACTION (V<sub>LR</sub>): {b('vlr', 'VLR')}</li>
              <li>
                MAX FLAP EXTENSION/EXTENDED (V<sub>FE</sub>): APPROACH (V<sub>FE</sub>40): {b('vfe40', 'VFE approach')}
                <span className="t44c-subrow">FULL (V<sub>FE</sub>100): {b('vfe100', 'VFE full')}</span>
              </li>
              <li>BEST ANGLE OF CLIMB (V<sub>X</sub>): {b('vx', 'VX')}</li>
              <li>BEST RATE OF CLIMB (V<sub>Y</sub>): {b('vy', 'VY')}</li>
              <li>BEST ANGLE OF CLIMB SINGLE ENGINE (V<sub>XSE</sub>): {b('vxse', 'VXSE')}</li>
              <li>BEST RATE OF CLIMB SINGLE ENGINE (V<sub>YSE</sub>): {b('vyse', 'VYSE')}</li>
              <li>MAX DEMONSTRATED CROSSWIND (UNCOUPLED): {b('xwindUncoupled', 'Max demonstrated crosswind uncoupled')}</li>
              <li>MAX DEMONSTRATED CROSSWIND (COUPLED): {b('xwindCoupled', 'Max demonstrated crosswind coupled')}</li>
              <li>MAX DEMONSTRATED TAILWIND (COUPLED): {b('tailwindCoupled', 'Max demonstrated tailwind coupled')}</li>
              <li>MIN CONTROLLABLE SPEED ON GROUND (V<sub>MCG</sub>): {b('vmcg', 'VMCG')}</li>
              <li>TURBULENT AIR PENETRATION SPEED: {b('turbulentAir', 'Turbulent air penetration speed')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">GENERAL LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>PNEUMATIC PRESSURE NORM OPERATING RANGE: {b('pneumatic', 'Pneumatic pressure normal range')}</li>
              <li>
                GYROSUCTION NORMAL OPERATING RANGE: {b('gyroHigh', 'Gyro suction 15,000 to 35,000 feet')} (15,000 to 35,000 FEET)
                <span className="t44c-subrow">{b('gyroLow', 'Gyro suction sea level to 15,000 feet')} (Sea Level to 15,000 FEET)</span>
              </li>
              <li>MAX OPERATING CABIN PRESSURE DIFFERENTIAL: {b('cabinDiff', 'Max cabin pressure differential')}</li>
              <li>
                MAX OPERATING CABIN PRESSURE DIFFERENTIAL (CRACKED WINDSHIELD):{' '}
                {b('cabinDiffCracked', 'Max cabin pressure differential, cracked windshield')}
              </li>
              <li>NORMAL TCAS ALTITUDE RANGE: {b('tcasRange', 'Normal TCAS altitude range')}</li>
              <li>
                FUEL SYSTEM CAPACITY: {b('fuelTotal', 'Total fuel capacity', 'sm')} (total){' '}
                {b('fuelUsable', 'Usable fuel capacity', 'sm')} (usable)
              </li>
            </ul>
          </section>

          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">STARTER CYCLE LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>STARTER DUTY CYCLE IS LIMITED TO THREE: {b('starterCycle', 'Starter cycle length')}</li>
              <li>COOLING PERIOD AFTER 1ST STARTER CYCLE: {b('starterCool1', 'Cooling period after first cycle')}</li>
              <li>COOLING PERIOD AFTER 2ND STARTER CYCLE: {b('starterCool2', 'Cooling period after second cycle')}</li>
              <li>COOLING PERIOD AFTER THIRD STARTER CYCLE: {b('starterCool3', 'Cooling period after third cycle')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ELECTRICAL LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>DC GENERATOR VOLTAGE: {b('dcGenVolts', 'DC generator voltage', 'wide')}</li>
              <li>MIN BATTERY VOLTAGE FOR GPU START: {b('gpuStartVolts', 'Minimum battery voltage for GPU start')}</li>
              <li>MIN BATTERY VOLTAGE FOR BATT START: {b('battStartVolts', 'Minimum battery voltage for battery start')}</li>
              <li>PROP DEICER AMMETER NORMAL OPERATION: {b('propDeicerAmps', 'Prop deicer ammeter normal operation')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">PROHIBITED MANEUVERS</div>
            <ol className="t44c-rows t44c-rows--numbered">
              <li>{b('prohib1', 'Prohibited maneuver 1', 'lg')}</li>
              <li>{b('prohib2', 'Prohibited maneuver 2', 'lg')}</li>
              <li>{b('prohib3', 'Prohibited maneuver 3', 'lg')}</li>
            </ol>

            <div className="t44c-banner t44c-banner--section">ACCELERATION LIMITATIONS</div>
            <ul className="t44c-rows">
              <li><span className="t44c-tab">FLAPS UP:</span>{b('accelFlapsUp', 'Flaps up G limits', 'wide')}</li>
              <li><span className="t44c-tab">FLAPS DOWN:</span>{b('accelFlapsDown', 'Flaps down G limits', 'wide')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">WEIGHT LIMITATIONS</div>
            <ul className="t44c-rows">
              <li>MAXIMUM RAMP: {b('maxRamp', 'Maximum ramp weight')}</li>
              <li>MAXIMUM TAKEOFF: {b('maxTakeoff', 'Maximum takeoff weight')}</li>
              <li>MAXIMUM LANDING: {b('maxLanding', 'Maximum landing weight')}</li>
              <li>MAXIMUM ZERO FUEL WEIGHT: {b('maxZeroFuel', 'Maximum zero fuel weight')}</li>
              <li>ALTITUDE CEILING: {b('ceiling', 'Altitude ceiling')}</li>
              <li>ALTITUDE CEILING YD INOP: {b('ceilingYdInop', 'Altitude ceiling, yaw damper inoperative')}</li>
            </ul>
          </section>
        </div>
      </div>

      <LimitsControls drill={drill} isGameActive={isGameActive} />
    </div>
  );
}

export default T54ALimits;
