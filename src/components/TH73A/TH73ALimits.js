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
// grid runs across the top; below it the left column is the systems (rotor, fuel, oils, starter,
// generators, hydraulics), slope, weight and the rotor brake and chip burner rules, and the right
// the airspeeds, altitude and temperature, helipilot and flight director, and the prohibited
// lists, split so the two columns run to about the same length.
//
// Left out on purpose: the CG envelopes (charts), the hoist and cargo hook limits, the baggage
// compartment, minimum crew and the IFR equipment list.

const DASH = <span className="t44c-dash">---</span>;

// A row of the engine grid: the label, then its seven cells in column order. A cell is a field
// key or one of the sheet's own printed cells.
const GRID = [
  ['N1 %', 'n1Min', 'n1Caut', 'n1Cont', 'n1Takeoff', 'n1Max', 'n1Trans', 'n1TransSec'],
  ['N2 %', 'n2Min', 'n2Caut', 'n2Cont', DASH, 'n2Max', 'n2Trans', 'n2TransSec'],
  ['ITT °C', DASH, DASH, 'ittCont', 'ittTakeoff', 'ittMax', 'ittTrans', 'ittTransSec'],
  ['TORQUE %', DASH, DASH, 'trqCont', 'trqTakeoff', 'trqMax', 'trqTrans', 'trqTransSec'],
];

const COLUMNS = ['Minimum', 'Cautionary', 'Continuous', 'Take-off', 'Maximum', 'Transient', 'Transient seconds'];

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
    if (typeof spec === 'string') return b(spec, `${rowLabel} ${colLabel}`, 'fill');
    return spec;
  };

  return (
    <div className="limits-eps-container t44c-page" onKeyDown={drill.onKeyDown}>
      <h1>TH-73A Operating Limits</h1>
      <p className="page-subtitle">
        Do not include units, just numbers. For values with a range use the format "min-max" or "min to max".
        There is no TH-73A limits exam sheet: this is pinksheetmafia's selection from NATOPS Chapter 4.
      </p>

      <div className="t44c-sheet">
        <div className="t44c-gridwrap">
          <table className="t44c-grid">
            <thead>
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
          <li>N1, ITT and torque: maximum take-off, 5 minutes. N2: maximum.</li>
          <li>Transient must not be used intentionally.</li>
          <li>
            Starting ITT: maximum {b('ittStartMax', 'Starting ITT maximum', 'sm')} °C, transient{' '}
            {b('ittStartTrans', 'Starting ITT transient', 'sm')} °C (2 seconds between 980 °C and the transient limit).
          </li>
        </ol>

        <div className="t44c-cols">
          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">ROTOR LIMITATIONS, NR (§4.4)</div>
            <ul className="t44c-rows">
              <li>
                POWER-ON: MINIMUM {b('nrOnMin', 'NR power-on minimum', 'xs')} CAUTIONARY {b('nrOnCaut', 'NR power-on cautionary', 'sm')}
                <span className="t44c-subrow">
                  CONTINUOUS {b('nrOnCont', 'NR power-on continuous', 'sm')} MAXIMUM {b('nrOnMax', 'NR power-on maximum', 'xs')}{' '}
                  TRANSIENT (10 SEC) {b('nrOnTrans', 'NR power-on transient', 'xs')}
                </span>
              </li>
              <li>
                POWER-OFF: TRANSIENT (10 SEC) {b('nrOffTrans', 'NR power-off transient', 'xs')} MINIMUM {b('nrOffMin', 'NR power-off minimum', 'xs')}
                <span className="t44c-subrow">
                  CONTINUOUS {b('nrOffCont', 'NR power-off continuous', 'sm')} MAXIMUM {b('nrOffMax', 'NR power-off maximum', 'xs')}
                </span>
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">FUEL SYSTEM LIMITATIONS (§4.5)</div>
            <ul className="t44c-rows">
              <li>
                FUEL PRESSURE (PSI): CAUTIONARY {b('fuelPressCaut', 'Fuel pressure cautionary', 'sm')}{' '}
                CONTINUOUS {b('fuelPressCont', 'Fuel pressure continuous', 'sm')} MAXIMUM {b('fuelPressMax', 'Fuel pressure maximum', 'xs')}
              </li>
              <li>PLANNED FUEL RESERVE (NO. 1 CELL): {b('fuelReserve', 'Planned fuel reserve', 'sm')} LB</li>
              <li>MINIMUM FUEL ON LANDING (NO. 1 CELL): {b('fuelMinLanding', 'Minimum fuel on landing', 'sm')} LB</li>
              <li>
                SIDEWARD FLIGHT / CROSSWIND HOVER MAY FLAME OUT BELOW: {b('fuelSideward', 'Sideward flight flameout fuel', 'sm')} LB
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ENGINE OIL (§4.6)</div>
            <ul className="t44c-rows">
              <li>
                PRESSURE (PSI): MINIMUM {b('engOilPMin', 'Engine oil pressure minimum', 'xs')} CAUTIONARY (N1 &lt;72%) {b('engOilPCaut', 'Engine oil pressure cautionary', 'sm')}
                <span className="t44c-subrow">
                  CONTINUOUS {b('engOilPCont', 'Engine oil pressure continuous', 'sm')} MAXIMUM {b('engOilPMax', 'Engine oil pressure maximum', 'xs')}
                </span>
              </li>
              <li>
                TEMPERATURE (°C): CONTINUOUS {b('engOilTCont', 'Engine oil temperature continuous', 'sm')} MAXIMUM {b('engOilTMax', 'Engine oil temperature maximum', 'xs')}
                <span className="t44c-subrow">
                  TRANSIENT (5 MIN WITH N1 AT 61 ±1%) {b('engOilTTrans', 'Engine oil temperature transient', 'xs')}
                </span>
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">MAIN TRANSMISSION OIL (§4.7)</div>
            <ul className="t44c-rows">
              <li>
                PRESSURE (PSI): MINIMUM {b('xmsnOilPMin', 'Transmission oil pressure minimum', 'xs')} CONTINUOUS {b('xmsnOilPCont', 'Transmission oil pressure continuous', 'sm')}
                <span className="t44c-subrow">
                  CAUTIONARY {b('xmsnOilPCaut', 'Transmission oil pressure cautionary', 'sm')} MAXIMUM {b('xmsnOilPMax', 'Transmission oil pressure maximum', 'xs')}
                </span>
              </li>
              <li>
                TEMPERATURE (°C): CONTINUOUS {b('xmsnOilTCont', 'Transmission oil temperature continuous', 'sm')} MAXIMUM {b('xmsnOilTMax', 'Transmission oil temperature maximum', 'xs')}
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ENGINE STARTER LIMITATIONS (§4.8)</div>
            <ul className="t44c-rows">
              <li>
                ON BATTERY: {b('battOn', 'Battery start seconds on', 'xs')} SEC ON, {b('battOff', 'Battery start seconds off', 'xs')} SEC OFF, TWICE,
                <span className="t44c-subrow">THEN {b('battCool', 'Battery start cooling minutes', 'xs')} MINUTES OFF</span>
              </li>
              <li>
                WITH EXTERNAL POWER: {b('extOn', 'External power start seconds on', 'xs')} SEC ON, {b('extOff', 'External power start seconds off', 'xs')} SEC OFF, TWICE,
                <span className="t44c-subrow">THEN {b('extCool', 'External power start cooling minutes', 'xs')} MINUTES OFF</span>
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">GENERATOR LOAD LIMITATIONS (§4.9, §4.10)</div>
            <ul className="t44c-rows">
              <li>
                GENERATOR (A): CONTINUOUS {b('genCont', 'Generator load continuous', 'sm')} MAXIMUM {b('genMax', 'Generator load maximum', 'xs')}{' '}
                TRANSIENT (5 SEC) {b('genTrans', 'Generator load transient', 'xs')}
              </li>
              <li>
                AUXILIARY GENERATOR (A): CONTINUOUS {b('auxGenCont', 'Auxiliary generator load continuous', 'sm')} MAXIMUM {b('auxGenMax', 'Auxiliary generator load maximum', 'xs')}{' '}
                TRANSIENT (5 SEC) {b('auxGenTrans', 'Auxiliary generator load transient', 'xs')}
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">HYDRAULIC SYSTEM LIMITATIONS (§4.11)</div>
            <ul className="t44c-rows">
              <li>
                FLUID PRESSURE (PSI): MINIMUM {b('hydMin', 'Hydraulic pressure minimum', 'sm')} CAUTIONARY {b('hydCaut', 'Hydraulic pressure cautionary', 'wide')}
                <span className="t44c-subrow">
                  CONTINUOUS {b('hydCont', 'Hydraulic pressure continuous', 'wide')} MAXIMUM {b('hydMax', 'Hydraulic pressure maximum', 'sm')}
                </span>
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">SLOPE TAKEOFF AND LANDING (§4.15)</div>
            <ul className="t44c-rows">
              <li>NOSE-UP: {b('slopeNoseUp', 'Nose-up slope limit', 'xs')} DEG</li>
              <li>SIDE-UP: {b('slopeSideUp', 'Side-up slope limit', 'xs')} DEG</li>
              <li>NOSE-DOWN: {b('slopeNoseDown', 'Nose-down slope limit', 'xs')} DEG</li>
              <li>NOSE-DOWN (UNOBSTRUCTED TAIL): {b('slopeNoseDownClear', 'Nose-down slope limit with unobstructed tail', 'xs')} DEG</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">WEIGHT LIMITATIONS (§4.16)</div>
            <ul className="t44c-rows">
              <li>MAX GROSS WEIGHT FOR GROUND OPERATIONS: {b('gwGround', 'Maximum gross weight for ground operations')} LB</li>
              <li>MAXIMUM GROSS WEIGHT: {b('gwMax', 'Maximum gross weight')} LB</li>
              <li>MINIMUM GROSS WEIGHT FOR FLIGHT: {b('gwMin', 'Minimum gross weight for flight')} LB</li>
              <li>MAX GROSS WEIGHT WITH EXTERNAL LOAD ON CARGO HOOK: {b('gwExternal', 'Maximum gross weight with external load')} LB</li>
            </ul>
            <div className="t44c-banner t44c-banner--section">ROTOR BRAKE AND CHIP BURNER (§4.20)</div>
            <ul className="t44c-rows">
              <li>ROTOR BRAKE ONLY AFTER SHUTDOWN WITH NR BELOW: {b('rotorBrakeNr', 'Rotor brake NR limit', 'xs')} %</li>
              <li>MAX CHIPS CLEARED PER DETECTION SYSTEM PER FLIGHT: {b('chipBurnerMax', 'Maximum chip burner activations per flight', 'xs')}</li>
            </ul>
          </section>

          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">AIRSPEED LIMITATIONS, KIAS (§4.12)</div>
            <ul className="t44c-rows">
              <li>V<sub>NE</sub> PLACARD, SEA LEVEL: {b('vnePlacard', 'VNE placard at sea level', 'sm')}</li>
              <li>V<sub>NE</sub> MAX IFR AIRSPEED (LESSER OF V<sub>NE</sub> POWER ON OR): {b('vneIfr', 'Maximum IFR airspeed', 'sm')}</li>
              <li>V<sub>MINI</sub> MIN IFR AIRSPEED: {b('vmini', 'Minimum IFR airspeed', 'sm')}</li>
              <li>V<sub>MIN APP</sub> MIN IFR APPROACH AIRSPEED: {b('vminApp', 'Minimum IFR approach airspeed', 'sm')}</li>
              <li>V<sub>MAX APP</sub> MAX IFR APPROACH AIRSPEED: {b('vmaxApp', 'Maximum IFR approach airspeed', 'sm')}</li>
              <li>MIN AIRSPEED IN AUTOROTATION (NO CLOSE EXTERNAL REFERENCES): {b('vMinAuto', 'Minimum airspeed in autorotation', 'sm')}</li>
              <li>MAX AIRSPEED WITH TORQUE 100 TO 108.5%: {b('vTakeoffPower', 'Maximum airspeed in the take-off power range', 'sm')}</li>
              <li>V<sub>NE</sub> ONE OR BOTH DOORS OPEN OR REMOVED: {b('vDoorsOpen', 'VNE with doors open or removed', 'sm')}</li>
              <li>V<sub>NE</sub> DURING DOORS OPENING AND CLOSING: {b('vDoorsMoving', 'VNE during door opening and closing', 'sm')}</li>
              <li>MAX SPEED FOR SEARCHLIGHT EXTENSION, ORIENTATION AND RETRACTION: {b('vSearchlight', 'Maximum speed for searchlight operation', 'sm')}</li>
              <li>MAX FORWARD SPEED AT TOUCHDOWN AFTER ENGINE FAILURE: {b('vTouchdown', 'Maximum touchdown speed after engine failure', 'sm')} KT</li>
              <li>
                ONE HELIPILOT INOPERATIVE: MAX AIRSPEED {b('vOneHelipilot', 'Maximum airspeed with one helipilot inoperative', 'sm')}{' '}
                MAX RATE OF CLIMB {b('rocOneHelipilot', 'Maximum rate of climb with one helipilot inoperative', 'sm')} FPM
              </li>
              <li>FD ENGAGED OR COUPLED WITH ANY HELIPILOT INOPERATIVE: MAX AIRSPEED {b('vFdHelipilotInop', 'Maximum airspeed with flight director and a helipilot inoperative', 'sm')}</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ALTITUDE AND TEMPERATURE (§4.13, §4.14)</div>
            <ul className="t44c-rows">
              <li>MAXIMUM OPERATING ALTITUDE: {b('maxAltitude', 'Maximum operating altitude')} FT HP</li>
              <li>
                AMBIENT AIR TEMPERATURE (°C): MINIMUM {b('oatMin', 'Minimum ambient air temperature', 'xs')} MAXIMUM AT SEA LEVEL {b('oatMax', 'Maximum sea level ambient air temperature', 'xs')}
                <span className="t44c-subrow">MAXIMUM DECREASES {b('oatLapse', 'Temperature lapse per 1000 feet', 'xs')} °C EVERY 1000 FT</span>
              </li>
            </ul>

            <div className="t44c-banner t44c-banner--section">HELIPILOT AND FLIGHT DIRECTOR (§4.18, §4.19)</div>
            <ul className="t44c-rows">
              <li>
                BOTH HELIPILOTS: FLY ATTENTIVE BELOW {b('muhAttentive', 'Fly attentive below, both helipilots', 'sm')} FT AGL
                <span className="t44c-subrow">FLY MANUALLY BELOW {b('muhManual', 'Fly manually below, both helipilots', 'sm')} FT AGL</span>
              </li>
              <li>ONE HELIPILOT INOPERATIVE: FLY MANUALLY BELOW {b('muhOneInop', 'Fly manually below, one helipilot inoperative', 'sm')} FT AGL</li>
              <li>
                FD MINIMUM USE HEIGHT: CRUISE, CLIMB AND DESCENT {b('fdMuhCruise', 'Flight director minimum use height in cruise', 'sm')} FT AGL
                <span className="t44c-subrow">APPROACH {b('fdMuhApproach', 'Flight director minimum use height on approach', 'sm')} FT AGL</span>
              </li>
              <li>
                ILS: STEEPEST GRADIENT {b('ilsGradient', 'Steepest ILS approach gradient', 'xs')} DEG MAX RATE OF DESCENT {b('ilsDescent', 'Maximum ILS rate of descent', 'sm')} FT/MIN
              </li>
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
