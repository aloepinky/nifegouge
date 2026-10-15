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
// It wears the T-44C sheet's classes (`.t44c-*` in style.css), as the T-54A's does, and keeps
// their shape: one grid across the top, notes under it, then two boxed columns of rows. The
// NATOPS prints the engine, rotor, fuel pressure, oil, generator and hydraulic limits under the
// same headings (minimum, cautionary, continuous, maximum, transient), so they are all rows of
// the one top grid. A list of one-blank rows is right-aligned, as the T-44C's airspeed list is,
// so the blanks line up.
//
// Left out on purpose: the CG envelopes (charts), the hoist and cargo hook limits, the baggage
// compartment, minimum crew and the IFR equipment list.

const DASH = <span className="t44c-dash">---</span>;

// A row of the grid: the label, then its eight cells in column order, the NATOPS's own headings
// (§4.3 to §4.11): minimum, cautionary, continuous, take-off (5 minutes), maximum take-off
// (5 minutes), maximum, transient, and the transient's time limit. A cell is a field key,
// `[key, marker]` for a blank the sheet hangs a note on, or one of the sheet's own printed
// cells; a note's number is also printed on a row label, as the T-54A sheet prints "(8)" on
// Max Reverse. Every note has its number somewhere on the grid, and only those notes are
// printed. Every transient's time limit is asked, with its unit.
const GRID = [
  // §4.3
  ['N1 % (2)', 'n1Min', ['n1Caut', '(1)'], 'n1Cont', 'n1Takeoff', 'n1Max', DASH, 'n1Trans', 'n1TransTime'],
  ['N2 % (3)', 'n2Min', 'n2Caut', 'n2Cont', DASH, DASH, 'n2Max', 'n2Trans', 'n2TransTime'],
  ['ITT °C', DASH, DASH, 'ittCont', 'ittTakeoff', 'ittMax', DASH, 'ittTrans', 'ittTransTime'],
  ['ITT STARTING °C (4)', DASH, DASH, DASH, DASH, DASH, 'ittStartMax', 'ittStartTrans', 'ittStartTransTime'],
  ['TORQUE %', DASH, DASH, 'trqCont', 'trqTakeoff', 'trqMax', DASH, 'trqTrans', 'trqTransTime'],
  // §4.4
  ['NR POWER-ON %', 'nrOnMin', 'nrOnCaut', 'nrOnCont', DASH, DASH, 'nrOnMax', 'nrOnTrans', 'nrOnTransTime'],
  ['NR POWER-OFF % (5)', 'nrOffMin', DASH, 'nrOffCont', DASH, DASH, 'nrOffMax', 'nrOffTrans', 'nrOffTransTime'],
  // §4.5
  ['FUEL PRESS PSI', DASH, 'fuelPressCaut', 'fuelPressCont', DASH, DASH, 'fuelPressMax', DASH, DASH],
  // §4.6
  ['ENG OIL PRESS PSI', 'engOilPMin', ['engOilPCaut', '(6)'], 'engOilPCont', DASH, DASH, ['engOilPMax', '(7)'], DASH, DASH],
  ['ENG OIL TEMP °C', DASH, DASH, 'engOilTCont', DASH, DASH, 'engOilTMax', 'engOilTTrans', ['engOilTTransTime', '(8)']],
  // §4.7
  ['XMSN OIL PRESS PSI', 'xmsnOilPMin', 'xmsnOilPCaut', 'xmsnOilPCont', DASH, DASH, 'xmsnOilPMax', DASH, DASH],
  ['XMSN OIL TEMP °C', DASH, DASH, 'xmsnOilTCont', DASH, DASH, 'xmsnOilTMax', DASH, DASH],
  // §4.9, §4.10
  ['GENERATOR A', DASH, DASH, 'genCont', DASH, DASH, 'genMax', 'genTrans', 'genTransTime'],
  ['AUX GENERATOR A', DASH, DASH, 'auxGenCont', DASH, DASH, 'auxGenMax', 'auxGenTrans', 'auxGenTransTime'],
  // §4.11
  ['HYDRAULIC PSI', 'hydMin', 'hydCaut', 'hydCont', DASH, DASH, 'hydMax', DASH, DASH],
];

const COLUMNS = ['Minimum', 'Cautionary', 'Continuous', 'Take-off', 'Maximum take-off', 'Maximum', 'Transient', 'Transient time limit'];

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

  return (
    <div className="limits-eps-container t44c-page" onKeyDown={drill.onKeyDown}>
      <h1>TH-73A Operating Limits</h1>
      <p className="page-subtitle">
        Do not include units, just numbers, except a time limit, which is written with its unit ("30 SECONDS",
        "5 MINUTES"). For values with a range use the format "min-max" or "min to max".
        There is no TH-73A limits exam sheet. This is a custom selection from NATOPS Chapter 4.
      </p>

      <div className="t44c-sheet">
        <div className="t44c-gridwrap">
          <table className="t44c-grid">
            <thead>
              <tr>
                <th colSpan={9} className="t44c-banner">
                  POWERPLANT, ROTOR, FUEL, OIL, ELECTRICAL AND HYDRAULIC LIMITATIONS (NATOPS §4.3 TO §4.11)
                </th>
              </tr>
              <tr>
                <th>PARAMETER</th>
                <th>MINIMUM</th>
                <th>CAUTIONARY</th>
                <th>CONTINUOUS</th>
                <th>TAKE-OFF<br />(5 MIN)</th>
                <th>MAX TAKE-OFF<br />(5 MIN)</th>
                <th>MAXIMUM</th>
                <th>TRANSIENT</th>
                <th>TRANSIENT<br />TIME LIMIT</th>
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
        {/* The NATOPS's notes on these limits, verbatim, each numbered where it applies on the
            grid: 1, 6 and 8 are the qualifiers the NATOPS puts in the heading itself
            ("Cautionary (autorotation only)", "Cautionary (with N1 <72%)", "Transient (5 minutes
            with N1 at 61 ±1%)"); 3 is a caution. The figures in them are blanks, as the T-44C
            sheet asks the figures in its notes. A NATOPS note with no cell to hang on (§4.5.2's,
            on planned reserve and minimum fuel) is not printed. */}
        <ol className="t44c-notes">
          <li>Autorotation only.</li>
          <li>
            IDLE N1 may decrease below {b('note2N1Idle', 'Note 2 N1', 'sm')}% when the generator and other aircraft
            systems are turned on. This is normal.
          </li>
          <li>
            Caution: An N2 indication of {b('note3N2Indicated', 'Note 3 indicated N2', 'sm')}% corresponds with an
            actual N2 value of {b('note3ActualMin', 'Note 3 actual N2 minimum', 'sm')}% to{' '}
            {b('note3ActualMax', 'Note 3 actual N2 maximum', 'sm')}%. The N2 transient region begins at{' '}
            {b('note3TransientBegins', 'Note 3 N2 transient region', 'sm')}%. Protracted operation at N2 values of{' '}
            {b('note3Protracted', 'Note 3 protracted N2', 'sm')}% should be avoided to minimize the possibility of N2
            overspeed.
          </li>
          <li>
            A linear variation applies above {b('note4IttTen', 'Note 4 ITT ten seconds', 'sm')} °C, ten seconds, and{' '}
            {b('note4IttTwo', 'Note 4 ITT two seconds', 'sm')} °C, two seconds.
          </li>
          <li>Power-Off is an N2/NR split by {b('note5Split', 'Note 5 N2/NR split', 'xs')}% or more.</li>
          <li>With N1 &lt;{b('note6N1', 'Note 6 N1', 'xs')}%.</li>
          <li>
            During cold starting conditions the oil pressure can temporarily exceed{' '}
            {b('note7OilPress', 'Note 7 oil pressure', 'sm')} psi; it reduces as oil temperature increases.
          </li>
          <li>With N1 at {b('note8N1', 'Note 8 N1', 'xs')} ±1%.</li>
        </ol>

        <div className="t44c-cols">
          <section className="t44c-box">
            <div className="t44c-banner t44c-banner--section">FUEL QUANTITY (§4.5)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>PLANNED FUEL RESERVE (NO. 1 CELL): {b('fuelReserve', 'Planned fuel reserve', 'sm')} LB</li>
              <li>MINIMUM FUEL ON LANDING (NO. 1 CELL): {b('fuelMinLanding', 'Minimum fuel on landing', 'sm')} LB</li>
              <li>SIDEWARD FLIGHT OR CROSSWIND HOVER MAY FLAME OUT BELOW: {b('fuelSideward', 'Sideward flight flameout fuel', 'sm')} LB</li>
            </ul>

            <div className="t44c-banner t44c-banner--section">ENGINE STARTER LIMITATIONS (§4.8)</div>
            <ul className="t44c-rows">
              <li>
                ON BATTERY: {b('battOn', 'Battery start seconds on', 'xs')} SEC ON, {b('battOff', 'Battery start seconds off', 'xs')} SEC OFF, TWICE,
                THEN {b('battCool', 'Battery start cooling minutes', 'xs')} MINUTES OFF
              </li>
              <li>
                EXTERNAL POWER: {b('extOn', 'External power start seconds on', 'xs')} SEC ON, {b('extOff', 'External power start seconds off', 'xs')} SEC OFF, TWICE,
                THEN {b('extCool', 'External power start cooling minutes', 'xs')} MINUTES OFF
              </li>
            </ul>

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

            <div className="t44c-banner t44c-banner--section">ROTOR BRAKE AND CHIP BURNER (§4.20)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>ROTOR BRAKE ONLY AFTER SHUTDOWN WITH NR BELOW: {b('rotorBrakeNr', 'Rotor brake NR limit', 'xs')} %</li>
              <li>MAX CHIPS CLEARED PER DETECTION SYSTEM PER FLIGHT: {b('chipBurnerMax', 'Maximum chip burner activations per flight', 'xs')}</li>
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

            <div className="t44c-banner t44c-banner--section">ALTITUDE AND TEMPERATURE (§4.13, §4.14)</div>
            <ul className="t44c-rows t44c-rows--right">
              <li>MAXIMUM OPERATING ALTITUDE: {b('maxAltitude', 'Maximum operating altitude')} FT HP</li>
              <li>MINIMUM AMBIENT AIR TEMPERATURE: {b('oatMin', 'Minimum ambient air temperature', 'xs')} °C</li>
              <li>MAXIMUM SEA LEVEL AMBIENT AIR TEMPERATURE: {b('oatMax', 'Maximum sea level ambient air temperature', 'xs')} °C</li>
              <li>MAXIMUM DECREASES EVERY 1000 FT BY: {b('oatLapse', 'Temperature lapse per 1000 feet', 'xs')} °C</li>
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
