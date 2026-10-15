import React from 'react';
import useLimitsDrill from '../epsLimits/useLimitsDrill';
import LimitsControls from '../epsLimits/LimitsControls';
import { TH73A_LIMITS, TH73A_LIMIT_GROUPS } from './th73aData';

// The TH-73A operating limits as a sheet to fill in from memory. Unlike the other schools' sheets
// this is not a recreation of an exam handout: the Advanced helicopter syllabus sets a closed-book
// NATOPS exam and no limits sheet, so this is the site's own selection from NATOPS Chapter 4 (the
// section is named in each banner), laid out like the Advanced sheets. The answers are data
// (th73aData.js) and the behaviour is the shared drill.
//
// It wears the T-44C sheet's classes (`.t44c-*` in style.css), as the T-54A's does. The engine
// grid runs across the top. Below it the left column is the systems, and because the rotor,
// fuel pressure, oil, generator and hydraulic limits all share the NATOPS's five headings
// (minimum, cautionary, continuous, maximum, transient) they are one grid rather than a run of
// prose rows, with the starter duty cycle a small grid under it; then slope, weight, and the
// rotor brake and chip burner rules. The right column is the airspeeds, altitude and
// temperature, helipilot and flight director, and the prohibited lists. A list of one-blank
// rows is right-aligned, as the T-44C's airspeed list is, so the blanks line up.
//
// Left out on purpose: the CG envelopes (charts), the hoist and cargo hook limits, the baggage
// compartment, minimum crew and the IFR equipment list.

const DASH = <span className="t44c-dash">---</span>;

// A row of a grid: the label, then its cells in column order. A cell is a field key,
// `[key, marker]` for a blank with a note printed beside it, or one of the sheet's own printed
// cells.
const ENGINE = [
  ['N1 %', 'n1Min', 'n1Caut', 'n1Cont', 'n1Takeoff', 'n1Max', 'n1Trans', 'n1TransSec'],
  ['N2 %', 'n2Min', 'n2Caut', 'n2Cont', DASH, 'n2Max', 'n2Trans', 'n2TransSec'],
  ['ITT °C', DASH, DASH, 'ittCont', 'ittTakeoff', 'ittMax', 'ittTrans', 'ittTransSec'],
  ['TORQUE %', DASH, DASH, 'trqCont', 'trqTakeoff', 'trqMax', 'trqTrans', 'trqTransSec'],
];
const ENGINE_COLUMNS = ['Minimum', 'Cautionary', 'Continuous', 'Take-off', 'Maximum', 'Transient', 'Transient seconds'];

// The systems whose limits the NATOPS prints under the same headings (§4.4 to §4.11). A
// transient's time limit, and the one cautionary band with a condition, are footnotes under
// the grid, numbered on the cell as the T-54A sheet numbers its own.
const SYSTEMS = [
  ['NR POWER-ON %', 'nrOnMin', 'nrOnCaut', 'nrOnCont', 'nrOnMax', ['nrOnTrans', '(1)']],
  ['NR POWER-OFF %', 'nrOffMin', DASH, 'nrOffCont', 'nrOffMax', ['nrOffTrans', '(1)']],
  ['FUEL PRESS PSI', DASH, 'fuelPressCaut', 'fuelPressCont', 'fuelPressMax', DASH],
  ['ENG OIL PRESS PSI', 'engOilPMin', ['engOilPCaut', '(2)'], 'engOilPCont', 'engOilPMax', DASH],
  ['ENG OIL TEMP °C', DASH, DASH, 'engOilTCont', 'engOilTMax', ['engOilTTrans', '(3)']],
  ['XMSN OIL PRESS PSI', 'xmsnOilPMin', 'xmsnOilPCaut', 'xmsnOilPCont', 'xmsnOilPMax', DASH],
  ['XMSN OIL TEMP °C', DASH, DASH, 'xmsnOilTCont', 'xmsnOilTMax', DASH],
  ['GENERATOR A', DASH, DASH, 'genCont', 'genMax', ['genTrans', '(4)']],
  ['AUX GENERATOR A', DASH, DASH, 'auxGenCont', 'auxGenMax', ['auxGenTrans', '(4)']],
  ['HYDRAULIC PSI', 'hydMin', 'hydCaut', 'hydCont', 'hydMax', DASH],
];
const SYSTEMS_COLUMNS = ['Minimum', 'Cautionary', 'Continuous', 'Maximum', 'Transient'];

// §4.8: three cycles, each so many seconds on and off, then a long cool after the third.
const STARTER = [
  ['ON BATTERY', 'battOn', 'battOff', 'battCool'],
  ['WITH EXTERNAL POWER', 'extOn', 'extOff', 'extCool'],
];
const STARTER_COLUMNS = ['Seconds on', 'Seconds off', 'Minutes off after the third cycle'];

function TH73ALimits({ isGameActive = false, onGameComplete }) {
  const drill = useLimitsDrill(TH73A_LIMITS, TH73A_LIMIT_GROUPS, { isGameActive, onGameComplete });

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
      return <>{b(key, `${rowLabel} ${colLabel}`, 'sm')}<sup> {marker}</sup></>;
    }
    if (typeof spec === 'string') return b(spec, `${rowLabel} ${colLabel}`, 'fill');
    return spec;
  };

  const grid = (rows, columns, head) => (
    <div className="t44c-gridwrap">
      <table className="t44c-grid">
        <thead>
          {head}
        </thead>
        <tbody>
          {rows.map(([label, ...cells]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {cells.map((spec, i) => (
                <td key={columns[i]}>{cell(spec, label, columns[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="limits-eps-container t44c-page" onKeyDown={drill.onKeyDown}>
      <h1>TH-73A Operating Limits</h1>
      <p className="page-subtitle">
        Do not include units, just numbers. For values with a range use the format "min-max" or "min to max".
        There is no TH-73A limits exam sheet: this is pinksheetmafia's selection from NATOPS Chapter 4.
      </p>

      <div className="t44c-sheet">
        {grid(ENGINE, ENGINE_COLUMNS, (
          <>
            <tr>
              <th colSpan={8} className="t44c-banner">POWERPLANT LIMITATIONS (NATOPS §4.3)</th>
            </tr>
            <tr>
              <th>PARAMETER</th>
              <th>MINIMUM</th>
              <th>CAUTIONARY</th>
              <th>CONTINUOUS</th>
              <th>TAKE-OFF<br />(5 MIN)</th>
              <th>MAXIMUM<br />(1)</th>
              <th>TRANSIENT<br />(2)</th>
              <th>TRANSIENT<br />LIMIT (SEC)</th>
            </tr>
          </>
        ))}

        <div className="t44c-banner t44c-banner--section">NOTES</div>
        <ol className="t44c-notes">
          <li>N1, ITT and torque: maximum take-off, 5 minutes. N2: maximum.</li>
          <li>Transient must not be used intentionally.</li>
          <li>
            Starting ITT: maximum {b('ittStartMax', 'Starting ITT maximum', 'sm')} °C, transient{' '}
            {b('ittStartTrans', 'Starting ITT transient', 'sm')} °C (2 seconds between 980 °C and the transient limit).
          </li>
        </ol>

        <div className="t44c-cols">
          <section className="t44c-box">
            {/* The banner sits outside the table: the grid is `table-layout: fixed`, which sizes
                its columns from the first row, and a banner spanning them all would leave the
                label column an equal share, too narrow for "XMSN OIL PRESS PSI". */}
            <div className="t44c-banner t44c-banner--section">ROTOR, FUEL, OIL, ELECTRICAL AND HYDRAULIC LIMITATIONS (§4.4 TO §4.11)</div>
            {grid(SYSTEMS, SYSTEMS_COLUMNS, (
              <>
                <tr>
                  <th>SYSTEM</th>
                  <th>MINIMUM</th>
                  <th>CAUTIONARY</th>
                  <th>CONTINUOUS</th>
                  <th>MAXIMUM</th>
                  <th>TRANSIENT</th>
                </tr>
              </>
            ))}

            <ol className="t44c-notes">
              <li>Transient, 10 seconds.</li>
              <li>With N1 below 72%.</li>
              <li>Transient, 5 minutes with N1 at 61 ±1%.</li>
              <li>Transient, 5 seconds.</li>
            </ol>

            <div className="t44c-banner t44c-banner--section">FUEL QUANTITY (§4.5)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>PLANNED FUEL RESERVE (NO. 1 CELL): {b('fuelReserve', 'Planned fuel reserve', 'sm')} LB</li>
              <li>MINIMUM FUEL ON LANDING (NO. 1 CELL): {b('fuelMinLanding', 'Minimum fuel on landing', 'sm')} LB</li>
              <li>SIDEWARD FLIGHT OR CROSSWIND HOVER MAY FLAME OUT BELOW: {b('fuelSideward', 'Sideward flight flameout fuel', 'sm')} LB</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ENGINE STARTER DUTY CYCLE, THREE CYCLES (§4.8)</div>
            {grid(STARTER, STARTER_COLUMNS, (
              <>
                <tr>
                  <th>START</th>
                  <th>SEC ON</th>
                  <th>SEC OFF</th>
                  <th>MIN OFF AFTER<br />THE THIRD</th>
                </tr>
              </>
            ))}

            <div className="t44c-banner t44c-banner--section">SLOPE TAKEOFF AND LANDING (§4.15)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>NOSE-UP: {b('slopeNoseUp', 'Nose-up slope limit', 'xs')} DEG</li>
              <li>SIDE-UP: {b('slopeSideUp', 'Side-up slope limit', 'xs')} DEG</li>
              <li>NOSE-DOWN: {b('slopeNoseDown', 'Nose-down slope limit', 'xs')} DEG</li>
              <li>NOSE-DOWN (UNOBSTRUCTED TAIL): {b('slopeNoseDownClear', 'Nose-down slope limit with unobstructed tail', 'xs')} DEG</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">WEIGHT LIMITATIONS (§4.16)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>MAX GROSS WEIGHT FOR GROUND OPERATIONS: {b('gwGround', 'Maximum gross weight for ground operations')} LB</li>
              <li>MAXIMUM GROSS WEIGHT: {b('gwMax', 'Maximum gross weight')} LB</li>
              <li>MINIMUM GROSS WEIGHT FOR FLIGHT: {b('gwMin', 'Minimum gross weight for flight')} LB</li>
              <li>MAX GROSS WEIGHT WITH LOAD ON CARGO HOOK: {b('gwExternal', 'Maximum gross weight with external load')} LB</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ALTITUDE AND TEMPERATURE (§4.13, §4.14)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>MAXIMUM OPERATING ALTITUDE: {b('maxAltitude', 'Maximum operating altitude')} FT HP</li>
              <li>MINIMUM AMBIENT AIR TEMPERATURE: {b('oatMin', 'Minimum ambient air temperature', 'xs')} °C</li>
              <li>MAXIMUM SEA LEVEL AMBIENT AIR TEMPERATURE: {b('oatMax', 'Maximum sea level ambient air temperature', 'xs')} °C</li>
              <li>MAXIMUM DECREASES EVERY 1000 FT BY: {b('oatLapse', 'Temperature lapse per 1000 feet', 'xs')} °C</li>
            </ul>
          </section>

          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">AIRSPEED LIMITATIONS, KIAS (§4.12)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>V<sub>NE</sub> PLACARD, SEA LEVEL: {b('vnePlacard', 'VNE placard at sea level', 'sm')}</li>
              <li>V<sub>NE</sub> MAX IFR AIRSPEED (LESSER OF V<sub>NE</sub> POWER ON OR): {b('vneIfr', 'Maximum IFR airspeed', 'sm')}</li>
              <li>V<sub>MINI</sub> MIN IFR AIRSPEED: {b('vmini', 'Minimum IFR airspeed', 'sm')}</li>
              <li>V<sub>MIN APP</sub> MIN IFR APPROACH AIRSPEED: {b('vminApp', 'Minimum IFR approach airspeed', 'sm')}</li>
              <li>V<sub>MAX APP</sub> MAX IFR APPROACH AIRSPEED: {b('vmaxApp', 'Maximum IFR approach airspeed', 'sm')}</li>
              <li>MIN AUTOROTATION AIRSPEED (NO EXTERNAL REFS): {b('vMinAuto', 'Minimum airspeed in autorotation', 'sm')}</li>
              <li>MAX AIRSPEED WITH TORQUE 100 TO 108.5%: {b('vTakeoffPower', 'Maximum airspeed in the take-off power range', 'sm')}</li>
              <li>V<sub>NE</sub> ONE OR BOTH DOORS OPEN OR REMOVED: {b('vDoorsOpen', 'VNE with doors open or removed', 'sm')}</li>
              <li>V<sub>NE</sub> DURING DOORS OPENING AND CLOSING: {b('vDoorsMoving', 'VNE during door opening and closing', 'sm')}</li>
              <li>MAX SPEED, SEARCHLIGHT EXTENSION/RETRACTION: {b('vSearchlight', 'Maximum speed for searchlight operation', 'sm')}</li>
              <li>MAX TOUCHDOWN SPEED AFTER ENGINE FAILURE: {b('vTouchdown', 'Maximum touchdown speed after engine failure', 'sm')} KT</li>
              <li>ONE HELIPILOT INOPERATIVE, MAX AIRSPEED: {b('vOneHelipilot', 'Maximum airspeed with one helipilot inoperative', 'sm')}</li>
              <li>ONE HELIPILOT INOPERATIVE, MAX RATE OF CLIMB: {b('rocOneHelipilot', 'Maximum rate of climb with one helipilot inoperative', 'sm')} FPM</li>
              <li>FD ENGAGED, ANY HELIPILOT INOP, MAX AIRSPEED: {b('vFdHelipilotInop', 'Maximum airspeed with flight director and a helipilot inoperative', 'sm')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">HELIPILOT AND FLIGHT DIRECTOR (§4.18, §4.19)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>BOTH HELIPILOTS, FLY ATTENTIVE BELOW: {b('muhAttentive', 'Fly attentive below, both helipilots', 'sm')} FT AGL</li>
              <li>BOTH HELIPILOTS, FLY MANUALLY BELOW: {b('muhManual', 'Fly manually below, both helipilots', 'sm')} FT AGL</li>
              <li>ONE HELIPILOT INOP, FLY MANUALLY BELOW: {b('muhOneInop', 'Fly manually below, one helipilot inoperative', 'sm')} FT AGL</li>
              <li>FD MIN USE HEIGHT, CRUISE/CLIMB/DESCENT: {b('fdMuhCruise', 'Flight director minimum use height in cruise', 'sm')} FT AGL</li>
              <li>FD MIN USE HEIGHT, APPROACH: {b('fdMuhApproach', 'Flight director minimum use height on approach', 'sm')} FT AGL</li>
              <li>ILS STEEPEST APPROACH GRADIENT: {b('ilsGradient', 'Steepest ILS approach gradient', 'xs')} DEG</li>
              <li>ILS MAXIMUM RATE OF DESCENT: {b('ilsDescent', 'Maximum ILS rate of descent', 'sm')} FT/MIN</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ROTOR BRAKE AND CHIP BURNER (§4.20)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>ROTOR BRAKE ONLY AFTER SHUTDOWN WITH NR BELOW: {b('rotorBrakeNr', 'Rotor brake NR limit', 'xs')} %</li>
              <li>MAX CHIPS CLEARED PER DETECTION SYSTEM PER FLIGHT: {b('chipBurnerMax', 'Maximum chip burner activations per flight', 'xs')}</li>
            </ul>
            <div className="t44c-banner t44c-banner--section">PROHIBITED MANEUVERS (§4.24)</div>
            <ol className="t44c-rows t44c-rows--numbered">
              <li>{b('prohib1', 'Prohibited maneuver 1', 'xl')}</li>
              <li>{b('prohib2', 'Prohibited maneuver 2', 'xl')}</li>
              <li>{b('prohib3', 'Prohibited maneuver 3', 'xl')}</li>
            </ol>

            <div className="t44c-banner t44c-banner--section">PROHIBITED OPERATIONS (§4.23)</div>
            <ol className="t44c-rows t44c-rows--numbered">
              <li>OPERATING IN {b('prohibOp1', 'Prohibited operation 1', 'lg')}</li>
              <li>IFR OPERATIONS WITH {b('prohibOp2', 'Prohibited operation 2', 'xl')}</li>
            </ol>
          </section>
        </div>
      </div>

      <LimitsControls drill={drill} isGameActive={isGameActive} />
    </div>
  );
}

export default TH73ALimits;
