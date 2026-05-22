import React, { useState, useEffect } from 'react';

const B = '1px solid #000';

const AIRPORTS = { KNGP: 5000, KCRP: 6080, KVCT: 9111, KMFE: 7120, KHRL: 5950, KALI: 4490, KCLL: 5158, KSAT: 5519, KAUS: 9000, KROW: 10008, KALM: 9207};
const AIRPORT_KEYS = Object.keys(AIRPORTS);
const RCR_OPTIONS = ['', 'DRY', 'WET', 'ICY'];
const DEFAULT_APT = 'KNGP';

const mkInitial = () => ({
  grossWeightTO: '6900', grossWeightLDG: '6000',
  oatTO: '',             oatLDG: '',
  fieldPATO: '',         fieldPALDG: '',
  windTO: '0',           windLDG: '0',
  rcrTO: 'DRY',          rcrLDG: 'DRY',
  runwayLenTO: String(AIRPORTS[DEFAULT_APT]),
  runwayLenLDG: String(AIRPORTS[DEFAULT_APT]),
  takeoffDist: '',
  rotationSpeed: '93/115',
  appSpeedFlapsLDG_imm: '106', appSpeedFlapsLDG_dest: '99',
  ldgDistFlapsLDG_imm: '',     ldgDistFlapsLDG_dest: '',
  appSpeedFlapsTO_imm:  '112', appSpeedFlapsTO_dest:  '103',
  ldgDistFlapsTO_imm: '',      ldgDistFlapsTO_dest: '',
  appSpeedFlapsUp_imm:  '115', appSpeedFlapsUp_dest:  '108',
  ldgDistFlapsUp_imm: '',      ldgDistFlapsUp_dest: '',
});

// --- Static styles (defined outside component so references are stable) ---
const S = {
  tbl:      { borderCollapse: 'collapse', width: '100%', maxWidth: '600px', margin: '0 auto', fontSize: '12px' },
  title:    { border: B, backgroundColor: '#ccc', fontWeight: 'bold', textAlign: 'center', fontSize: '13px', padding: '5px 8px' },
  section:  { border: B, backgroundColor: '#e0e0e0', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', padding: '4px 8px' },
  colHdr:   { border: B, backgroundColor: '#eeeeee', fontWeight: 'bold', textAlign: 'center', fontSize: '11px', padding: '4px 8px' },
  // Label/unit cells have only side borders — row lines come from input cells only
  lbl:      { borderLeft: B, borderRight: B, borderTop: 'none', borderBottom: 'none', fontWeight: 'bold', fontSize: '11px', verticalAlign: 'middle', padding: '5px 8px' },
  lblLast:  { borderLeft: B, borderRight: B, borderTop: 'none', borderBottom: B,      fontWeight: 'bold', fontSize: '11px', verticalAlign: 'middle', padding: '5px 8px' },
  unit:     { borderLeft: B, borderRight: B, borderTop: 'none', borderBottom: 'none', textAlign: 'left', fontSize: '11px', padding: '5px 4px', whiteSpace: 'nowrap' },
  unitLast: { borderLeft: B, borderRight: B, borderTop: 'none', borderBottom: B,      textAlign: 'left', fontSize: '11px', padding: '5px 4px', whiteSpace: 'nowrap' },
  inpCell:  { border: B, textAlign: 'center', padding: '3px 6px' },
  emptyR:   { borderRight: B, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' },
  emptyRLast:{ borderRight: B, borderTop: 'none', borderBottom: B, borderLeft: 'none' },
};

const inpStyle = { width: '100%', border: 'none', outline: 'none', padding: '2px 4px', fontSize: '12px', textAlign: 'center', backgroundColor: 'transparent' };
const selStyle = { width: '100%', border: 'none', outline: 'none', padding: '2px 0', fontSize: '11px', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'center' };
const aptSelStyle = { border: 'none', outline: 'none', fontSize: '10px', backgroundColor: 'transparent', cursor: 'pointer' };

// ── Takeoff distance chart (NATOPS T-6B Mar 2008, PA00D) ─────────────────────
// Panel 1: OAT × Field PA → baseline distance (1000 ft) — piecewise linear regression
// Each entry: [ranges, coeffs]; ranges[i]=[upper,lower] in x=−OAT; dist = m·x + b
const _TO_PA_KEYS = [-2, 0, 2, 4, 6, 8];
const _TO_PA_DATA = [
  /* −2k */ [[[12.5,-40],[-40,-50]],          [[-1/75,31/15],[-4/75,7/15]]],
  /*  0  */ [[[17.5,-35],[-35,-45],[-45,-50]], [[-0.0137143,2.3],[-0.067,.435],[-0.11,-1.5]]],
  /*  2k */ [[[20,-30],[-30,-41],[-41,-47.5]], [[-3/200,51/20],[-19/220,9/22],[-17/130,-367/260]]],
  /*  4k */ [[[23.5,-26],[-26,-37],[-37,-44]], [[-11/588,1701/588],[-51/550,533/550],[-1/7,-31/35]]],
  /*  6k */ [[[27.5,-20],[-20,-33],[-33,-40]], [[-1/50,33/10],[-1/10,17/10],[-11/70,-13/70]]],
  /*  8k */ [[[30,-15],[-15,-29],[-29,-36]],   [[-1/45,11/3],[-9/70,29/14],[-6/35,29/35]]],
];

// Rotation speeds vs weight (from chart inset table)
const _TO_RS_WT   = [5500, 6000, 6500, 6900];
const _TO_VR_VALS = [  82,   86,   90,   93];
const _TO_VO_VALS = [ 102,  106,  111,  115];

// Approach speeds vs weight by flap setting (KIAS)
const _APP_WT  = [5500, 6000, 6500, 6900];
const _APP_LDG = [  95,   99,  103,  106];
const _APP_TO  = [  99,  103,  108,  112];
const _APP_UP  = [ 103,  108,  112,  115];

function _lerp1(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let i = 0;
  while (i < xs.length - 2 && xs[i + 1] < x) i++;
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
  return ys[i] + t * (ys[i + 1] - ys[i]);
}

function _toBaseAtIdx(idx, x) {
  const [ranges, coeffs] = _TO_PA_DATA[idx];
  for (let i = 0; i < ranges.length; i++) {
    if (x <= ranges[i][0] && x >= ranges[i][1])
      return coeffs[i][0] * x + coeffs[i][1];
  }
  if (x > ranges[0][0]) return coeffs[0][0] * x + coeffs[0][1];
  const L = ranges.length - 1;
  return coeffs[L][0] * x + coeffs[L][1];
}

function calcTakeoffDist(oat_c, pa_ft, wt_lbs) {
  const x    = -oat_c;
  const pa_k = pa_ft / 1000;
  let base;
  if (pa_k <= _TO_PA_KEYS[0]) {
    base = _toBaseAtIdx(0, x);
  } else if (pa_k >= _TO_PA_KEYS[_TO_PA_KEYS.length - 1]) {
    base = _toBaseAtIdx(_TO_PA_KEYS.length - 1, x);
  } else {
    let i = 0;
    while (i < _TO_PA_KEYS.length - 2 && _TO_PA_KEYS[i + 1] < pa_k) i++;
    const paT = (pa_k - _TO_PA_KEYS[i]) / (_TO_PA_KEYS[i + 1] - _TO_PA_KEYS[i]);
    const baseLow  = _toBaseAtIdx(i, x);
    const baseHigh = _toBaseAtIdx(i + 1, x);
    base = baseLow + paT * (baseHigh - baseLow);
  }
  const baseAdjusted = (base - 0.2) / 30 * (wt_lbs / 100 - 39) + 0.2;
  return Math.round(baseAdjusted * 10) * 100;
}

function calcAppSpeed(wt_lbs, table) {
  return String(Math.round(_lerp1(_APP_WT, table, wt_lbs)));
}

function calcRotSpeed(wt_lbs) {
  const vr   = Math.round(_lerp1(_TO_RS_WT, _TO_VR_VALS, wt_lbs));
  const vobs = Math.round(_lerp1(_TO_RS_WT, _TO_VO_VALS, wt_lbs));
  return `${vr}/${vobs}`;
}
// ── Landing distance chart — Flaps LDG — Panel 1: OAT × Field PA ─────────────
// Single linear regression per PA level: dist (1000 ft) = m·(−OAT) + b
// PA keys are the same as _TO_PA_KEYS: [−2, 0, 2, 4, 6, 8]
const _LDG_PA_DATA = [
  /* −2k */ [-1/120, 46/15],
  /*  0  */ [-1/125, 3.2],
  /*  2k */ [-3/350, 47/14],
  /*  4k */ [-1/110, 3.53636],
  /*  6k */ [-0.01,  3.73],
  /*  8k */ [-0.01,  4],
];

function _interpPA(paData, oat_c, pa_ft) {
  const x    = -oat_c;
  const pa_k = pa_ft / 1000;
  const at = i => paData[i][0] * x + paData[i][1];
  if (pa_k <= _TO_PA_KEYS[0]) return at(0);
  if (pa_k >= _TO_PA_KEYS[_TO_PA_KEYS.length - 1]) return at(_TO_PA_KEYS.length - 1);
  let i = 0;
  while (i < _TO_PA_KEYS.length - 2 && _TO_PA_KEYS[i + 1] < pa_k) i++;
  const t = (pa_k - _TO_PA_KEYS[i]) / (_TO_PA_KEYS[i + 1] - _TO_PA_KEYS[i]);
  return at(i) + t * (at(i + 1) - at(i));
}

function calcLandingDist(oat_c, pa_ft, wt_lbs) {
  const base = (_interpPA(_LDG_PA_DATA, oat_c, pa_ft) + 0.55) / 89 * (wt_lbs / 100 + 20) - 0.55;
  return Math.round(base * 10) * 100;
}

function _applyWetLdg(distFt) {
  const k = distFt / 1000;
  return Math.round((36 * k / 25 - 781 / 2500) * 10) * 100;
}

function _applyWetFlapsTO(distFt) {
  const k = distFt / 1000;
  return Math.round((134 * k / 79 - 561 / 790) * 10) * 100;
}

function _applyWetFlapsUp(distFt) {
  const k = distFt / 1000;
  return Math.round((40 * k / 29 - 363 / 1450) * 10) * 100;
}
// ── Landing distance chart — Flaps TO — Panel 1: OAT × Field PA ──────────────
// Single linear regression per PA level: dist (1000 ft) = m·(−OAT) + b
const _LDG_TO_PA_DATA = [
  /* −2k */ [-0.0075, 3.1],
  /*  0  */ [-0.008,  3.26],
  /*  2k */ [-0.008,  3.44],
  /*  4k */ [-0.009,  3.6],
  /*  6k */ [-0.01,   3.8],
  /*  8k */ [-1/90,   61/15],
];

function calcLandingDistFlapsTO(oat_c, pa_ft, wt_lbs) {
  const base = (_interpPA(_LDG_TO_PA_DATA, oat_c, pa_ft) - 2.49) / (69 - 40) * (wt_lbs / 100 - 40) + 2.49;
  return Math.round(base * 10) * 100;
}
// ── Landing distance chart — Flaps UP — Panel 1: OAT × Field PA ──────────────
// Single linear regression per PA level: dist (1000 ft) = m·(−OAT) + b
const _LDG_UP_PA_DATA = [
  /* −2k */ [-0.01,   3.6],
  /*  0  */ [-0.01,   3.775],
  /*  2k */ [-0.01,   4],
  /*  4k */ [-0.0112, 4.2],
  /*  6k */ [-7/550,  49/11],
  /*  8k */ [-0.14,   4.78],
];

function calcLandingDistFlapsUp(oat_c, pa_ft, wt_lbs) {
  const base = (_interpPA(_LDG_UP_PA_DATA, oat_c, pa_ft) - 1.39) / 59 * (wt_lbs / 100 - 10) + 1.39;
  return Math.round(base * 10) * 100;
}
// ─────────────────────────────────────────────────────────────────────────────

function _calcLdgPair(calcFn, wetFn, wtTO, wtLDG, oatImm, paImm, oatDest, paDest, rcrTO, rcrLDG) {
  const dry = (wt, oat, pa) => (!isNaN(wt) && !isNaN(oat) && !isNaN(pa)) ? calcFn(oat, pa, wt) : null;
  const fmt = (d, rcr) => d === null || rcr === 'ICY' ? '' : rcr === 'WET' ? String(wetFn(d)) : String(d);
  return { imm: fmt(dry(wtTO, oatImm, paImm), rcrTO), dest: fmt(dry(wtLDG, oatDest, paDest), rcrLDG) };
}

function TW4Told() {
  const [airportTO,  setAirportTO]  = useState(DEFAULT_APT);
  const [airportLDG, setAirportLDG] = useState(DEFAULT_APT);
  const [fields, setFields] = useState(mkInitial);
  const [toDistMode, setToDistMode] = useState('50ft');

  const set = (key, val) => setFields(prev => ({ ...prev, [key]: val }));

  const changeAirportTO = apt => {
    setAirportTO(apt);
    setFields(prev => ({ ...prev, runwayLenTO: String(AIRPORTS[apt]) }));
  };
  const changeAirportLDG = apt => {
    setAirportLDG(apt);
    setFields(prev => ({ ...prev, runwayLenLDG: String(AIRPORTS[apt]) }));
  };
  const clearAll = () => {
    setAirportTO(DEFAULT_APT);
    setAirportLDG(DEFAULT_APT);
    setFields(mkInitial());
  };

  useEffect(() => {
    const wtTO  = parseFloat(fields.grossWeightTO);
    const wtLDG = parseFloat(fields.grossWeightLDG);
    setFields(prev => ({
      ...prev,
      rotationSpeed:         !isNaN(wtTO)  ? calcRotSpeed(wtTO)            : prev.rotationSpeed,
      appSpeedFlapsLDG_imm:  !isNaN(wtTO)  ? calcAppSpeed(wtTO,  _APP_LDG) : '',
      appSpeedFlapsTO_imm:   !isNaN(wtTO)  ? calcAppSpeed(wtTO,  _APP_TO)  : '',
      appSpeedFlapsUp_imm:   !isNaN(wtTO)  ? calcAppSpeed(wtTO,  _APP_UP)  : '',
      appSpeedFlapsLDG_dest: !isNaN(wtLDG) ? calcAppSpeed(wtLDG, _APP_LDG) : '',
      appSpeedFlapsTO_dest:  !isNaN(wtLDG) ? calcAppSpeed(wtLDG, _APP_TO)  : '',
      appSpeedFlapsUp_dest:  !isNaN(wtLDG) ? calcAppSpeed(wtLDG, _APP_UP)  : '',
    }));
  }, [fields.grossWeightTO, fields.grossWeightLDG]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const oat = parseFloat(fields.oatTO);
    const pa  = parseFloat(fields.fieldPATO);
    const wt  = parseFloat(fields.grossWeightTO);
    if (!isNaN(oat) && !isNaN(pa) && !isNaN(wt)) {
      setFields(prev => ({ ...prev, takeoffDist: String(calcTakeoffDist(oat, pa, wt)) }));
    } else {
      setFields(prev => ({ ...prev, takeoffDist: '' }));
    }
  }, [fields.oatTO, fields.fieldPATO, fields.grossWeightTO]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const wtTO    = parseFloat(fields.grossWeightTO);
    const wtLDG   = parseFloat(fields.grossWeightLDG);
    const oatImm  = parseFloat(fields.oatTO);
    const paImm   = parseFloat(fields.fieldPATO);
    const oatDest = parseFloat(fields.oatLDG);
    const paDest  = parseFloat(fields.fieldPALDG);
    const rcrTO   = fields.rcrTO;
    const rcrLDG  = fields.rcrLDG;
    const ldg = _calcLdgPair(calcLandingDist,        _applyWetLdg,     wtTO, wtLDG, oatImm, paImm, oatDest, paDest, rcrTO, rcrLDG);
    const fTO = _calcLdgPair(calcLandingDistFlapsTO,  _applyWetFlapsTO, wtTO, wtLDG, oatImm, paImm, oatDest, paDest, rcrTO, rcrLDG);
    const fUp = _calcLdgPair(calcLandingDistFlapsUp,  _applyWetFlapsUp, wtTO, wtLDG, oatImm, paImm, oatDest, paDest, rcrTO, rcrLDG);
    setFields(prev => ({
      ...prev,
      ldgDistFlapsLDG_imm:  ldg.imm,  ldgDistFlapsLDG_dest: ldg.dest,
      ldgDistFlapsTO_imm:   fTO.imm,  ldgDistFlapsTO_dest:  fTO.dest,
      ldgDistFlapsUp_imm:   fUp.imm,  ldgDistFlapsUp_dest:  fUp.dest,
    }));
  }, [fields.grossWeightTO, fields.grossWeightLDG, fields.oatTO, fields.fieldPATO, fields.oatLDG, fields.fieldPALDG, fields.rcrTO, fields.rcrLDG]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lowercase render helpers (not components — avoids remount on re-render)
  const ic = f => (
    <td style={S.inpCell}>
      <input style={inpStyle} value={fields[f]} onChange={e => set(f, e.target.value)} />
    </td>
  );
  const uc = (u, last, noRight = false) => {
    const style = last ? S.unitLast : S.unit;
    return <td style={noRight ? { ...style, borderRight: 'none' } : style}>{u}</td>;
  };
  const rc = f => (
    <td style={S.inpCell}>
      <select style={selStyle} value={fields[f]} onChange={e => set(f, e.target.value)}>
        {RCR_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </td>
  );

  // Two-column data row (CONDITIONS / LANDING sections)
  const row2 = (label, fTO, fLDG, unit, isRCR = false, last = false) => (
    <tr>
      <td style={last ? S.lblLast : S.lbl}>{label}</td>
      {isRCR ? rc(fTO) : ic(fTO)}
      {uc(unit, last)}
      {isRCR ? rc(fLDG) : ic(fLDG)}
      {uc(unit, last)}
    </tr>
  );

  // Single-column data row (TAKEOFF performance section)
  const row1 = (label, f, unit, last = false) => (
    <tr>
      <td style={last ? S.lblLast : S.lbl}>{label}</td>
      {ic(f)}
      {uc(unit, last, true)}
      <td colSpan={2} style={last ? S.emptyRLast : S.emptyR} />
    </tr>
  );

  return (
    <div style={{ padding: '10px 0', overflowX: 'auto' }}>
      <table style={S.tbl}>
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <tbody>
          <tr><td colSpan={5} style={S.title}>T-6B TAKEOFF AND LANDING DATA (TOLD) CARD</td></tr>
          <tr>
            <td colSpan={5} style={{ border: B, backgroundColor: '#f9f9f9', fontSize: '10px', textAlign: 'center', padding: '3px 8px', fontStyle: 'italic', color: '#555' }}>
              Auto-calculated values assume flat runway, zero wind, and non-ice conditions. Any other conditions must be manually calculated
            </td>
          </tr>

          {/* CONDITIONS */}
          <tr><td colSpan={5} style={S.section}>CONDITIONS</td></tr>
          <tr>
            <td style={S.colHdr}></td>
            <td colSpan={2} style={S.colHdr}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }} />
                <span>TAKEOFF</span>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <select style={aptSelStyle} value={airportTO} onChange={e => changeAirportTO(e.target.value)}>
                    {AIRPORT_KEYS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </td>
            <td colSpan={2} style={S.colHdr}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }} />
                <span>LANDING</span>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <select style={aptSelStyle} value={airportLDG} onChange={e => changeAirportLDG(e.target.value)}>
                    {AIRPORT_KEYS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </td>
          </tr>
          {row2('GROSS WEIGHT',             'grossWeightTO', 'grossWeightLDG', 'LBS')}
          {row2('OAT',                      'oatTO',         'oatLDG',         '°C')}
          {row2('FIELD PRESSURE ALTITUDE',  'fieldPATO',     'fieldPALDG',     'FT')}
          {row2('WIND COMPONENT',           'windTO',        'windLDG',        'KNOTS')}
          {row2('RUNWAY CONDITION READING', 'rcrTO',         'rcrLDG',         'RCR', true)}
          {row2('RUNWAY LENGTH',            'runwayLenTO',   'runwayLenLDG',   'FT')}

          {/* TAKEOFF performance */}
          <tr><td colSpan={5} style={S.section}>TAKEOFF</td></tr>
          <tr>
            <td style={S.lbl}>TAKEOFF DISTANCE</td>
            <td style={S.inpCell}>
              <input
                style={inpStyle}
                readOnly={toDistMode === 'noObs' && fields.takeoffDist !== ''}
                value={(() => {
                  const raw = parseFloat(fields.takeoffDist);
                  if (toDistMode === 'noObs' && !isNaN(raw))
                    return String(Math.round(((89 * raw) / 139 - 3 / 556) / 100) * 100);
                  return fields.takeoffDist;
                })()}
                onChange={e => toDistMode === '50ft' && set('takeoffDist', e.target.value)}
              />
            </td>
            {uc('FT', false, true)}
            <td style={{border: 'none', paddingLeft: '4px'}}>
              <select
                value={toDistMode}
                onChange={e => setToDistMode(e.target.value)}
                style={{fontSize: '0.72em', padding: '1px 2px', border: '1px solid #bbb', borderRadius: '2px', boxShadow: 'none'}}
              >
                <option value="50ft">50 ft obstacle (PCL)</option>
                <option value="noObs">No Obstacle (NATOPS)</option>
              </select>
            </td>
            <td style={S.emptyR} />
          </tr>
          {row1('ROTATION SPEED (VR/VOBS)',  'rotationSpeed', 'KIAS')}

          {/* LANDING performance */}
          <tr><td colSpan={5} style={S.section}>LANDING</td></tr>
          <tr>
            <td style={S.colHdr}></td>
            <td colSpan={2} style={S.colHdr}>IMMEDIATELY AFTER TAKEOFF</td>
            <td colSpan={2} style={S.colHdr}>DESTINATION</td>
          </tr>
          {row2('APPROACH SPEED FLAPS LDG', 'appSpeedFlapsLDG_imm', 'appSpeedFlapsLDG_dest', 'KIAS')}
          {row2('LANDING DISTANCE',          'ldgDistFlapsLDG_imm',  'ldgDistFlapsLDG_dest',  'FT')}
          {row2('APPROACH SPEED FLAPS TO',   'appSpeedFlapsTO_imm',  'appSpeedFlapsTO_dest',  'KIAS')}
          {row2('LANDING DISTANCE',          'ldgDistFlapsTO_imm',   'ldgDistFlapsTO_dest',   'FT')}
          {row2('APPROACH SPEED FLAPS UP',   'appSpeedFlapsUp_imm',  'appSpeedFlapsUp_dest',  'KIAS')}
          {row2('LANDING DISTANCE',          'ldgDistFlapsUp_imm',   'ldgDistFlapsUp_dest',   'FT',  false, true)}
        </tbody>
      </table>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button onClick={clearAll}>Clear All</button>
      </div>
    </div>
  );
}

export default TW4Told;
