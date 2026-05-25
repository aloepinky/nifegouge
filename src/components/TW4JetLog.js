import React, { useState, useEffect, useMemo, useRef } from 'react';

const toHHMM = (mins) => {
  const m = Math.max(0, Math.round(mins));
  return String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0');
};

const cellFontSize = (val) => {
  const len = (val || '').length;
  if (len <= 7) return undefined;
  if (len <= 10) return '0.73em';
  if (len <= 13) return '0.61em';
  return '0.55em';
};

const narrowCellFontSize = (val) => {
  const len = (val || '').length;
  if (len <= 5) return undefined;
  if (len <= 8) return '0.85em';
  if (len <= 11) return '0.76em';
  return '0.57em';
};

function TW4JetLog() {
  const [mainRowCount, setMainRowCount] = useState(9);
  const [editRowsMode, setEditRowsMode] = useState(false);
  const [inputValues, setInputValues] = useState({'r0c4': '1', 'r0c6': '50', 'r0c7': '1050'});
  const [airports, setAirports] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [infoFields, setInfoFields] = useState({
    depElev: '', clncDel: '', gndCont: '', tower: '',
    destElev: '', destApcCont: '', destTower: '', destGndCont: '',
    alternate: '', altElev: '', altApcCont: '', altTower: '', altGndCont: '',
  });
  const [ttcData, setTtcData] = useState([]);
  const [cruiseData, setCruiseData] = useState([]);
  const [selectedAlt, setSelectedAlt] = useState(1000);
  const [depInput, setDepInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [clncFields, setClncFields] = useState({ ttc: '', fuel: '', dist: '', deltaT: '', oat: '', tasClimb: '', lbsPhClimb: '', tasCruise: '', lbsPhCruise: '', ias: '', climbDir: '', climbVel: '', cruiseDir: '', cruiseVel: '', magVar: '3E', vfrGsCalc: '210', vfrLbsPh: '', vfrAtis: '', vfrWindAtAlt: '', vfrClnc1a: '', vfrClnc1b: 'KNQI APP 119.9  FSS 122.2 (San Angelo)', vfrClnc2a: '', vfrClnc2b: 'TW2 DECON 308.2', vfrClnc3a: '', vfrClnc3b: 'Houston Center 128.12/350.3', vfrClnc4a: '', vfrClnc4b: 'ERAA:' });
  const [splitCells, setSplitCells] = useState({});
  const [showParams, setShowParams] = useState(false);
  const [params, setParams] = useState({
    startFuel: '1100',
    sttoTime: '1',
    sttoFuel: '50',
    holdTime: '15',
    approachTime: '10',
    approachFuel: '50',
    tngTime: '5',
    tngFuel: '25',
    stdReserve: '200',
  });
  const [routeBadges, setRouteBadges] = useState({});
  const [holdCells, setHoldCells] = useState({});
  const [pdfUrl, setPdfUrl] = useState(null);
  const [vfrMode, setVfrMode] = useState(false);
  const [vfrTng, setVfrTng] = useState({});
  const [vfrApr, setVfrApr] = useState({});
  const [sharedPresets, setSharedPresets] = useState([]);
  const [localPresets, setLocalPresets] = useState([]);
  const [showPresets, setShowPresets] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [presetName, setPresetName] = useState('');
  const [jetlogScale, setJetlogScale] = useState(1);
  const [showIntClimbSelector, setShowIntClimbSelector] = useState(false);
  const [intClimbs, setIntClimbs] = useState([]); // [{row: pairIdx, elev: '', alt: number}]
  const containerRef = useRef(null);

  // Alternate table rows use r200+ namespace so main table can grow freely
  const ALT_ROWS = [200, 202, 204, 206];

  const handleInputChange = (cellId, value) => {
    setInputValues(prev => ({ ...prev, [cellId]: value }));
  };

  useEffect(() => {
    fetch('/TTC.csv')
      .then(r => r.text())
      .then(text => {
        const rows = text.trim().split('\n').slice(3);
        const parsed = rows.map(row => {
          const p = row.split(',');
          return {
            alt: parseInt(p[0]),
            time: [p[1], p[2], p[3], p[4]].map(v => v.trim() === '' ? null : parseInt(v)),
            fuel: [p[5], p[6], p[7], p[8]].map(v => v.trim() === '' ? null : parseInt(v)),
            dist: [p[9], p[10], p[11], p[12]].map(v => v.trim() === '' ? null : parseInt(v)),
          };
        }).filter(r => !isNaN(r.alt));
        setTtcData(parsed);
      });
  }, []);

  useEffect(() => {
    fetch('/Cruise.csv')
      .then(r => r.text())
      .then(text => {
        const rows = text.trim().split('\n').slice(2);
        setCruiseData(rows.map(row => {
          const p = row.split(',');
          return { alt: parseInt(p[0]), oat: parseFloat(p[1]), ias: parseFloat(p[2]), tas: parseFloat(p[3]), ff: parseFloat(p[4]) };
        }).filter(r => !isNaN(r.alt)));
      });
  }, []);

  useEffect(() => {
    fetch('/Airport Info.csv')
      .then(r => r.text())
      .then(text => {
        const rows = text.trim().split('\n').slice(1);
        setAirports(rows.map(row => {
          const p = row.split(',');
          return { airport: p[0], elev: p[1], atis: p[2], clncDel: p[3], gndCont: p[4], tower: p[5], apcCont: p[6] };
        }));
      });
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openDropdown]);

  useEffect(() => {
    if (!vfrMode) return;
    const ete = formatVFREte((parseFloat(params.tngTime) || 5) * 60);
    const fuel = String(parseFloat(params.tngFuel) || 25);
    setInputValues(prev => {
      const next = { ...prev };
      for (const cellId of Object.keys(vfrTng)) {
        const match = cellId.match(/^r(\d+)c/);
        if (!match) continue;
        const row = parseInt(match[1]);
        next[`r${row}c4`] = ete;
        next[`r${row}c6`] = fuel;
      }
      return next;
    });
  }, [vfrMode, vfrTng, params.tngTime, params.tngFuel]);

  useEffect(() => {
    if (!vfrMode) return;
    const ete = String(parseFloat(params.approachTime) || 10);
    const fuel = String(parseFloat(params.approachFuel) || 50);
    setInputValues(prev => {
      const next = { ...prev };
      for (const row of ALT_ROWS) {
        if (vfrApr[`r${row}c0`]) {
          next[`r${row}c4`] = ete;
          next[`r${row}c6`] = fuel;
        }
      }
      return next;
    });
  }, [vfrMode, vfrApr, params.approachTime, params.approachFuel]);

  useEffect(() => {
    if (vfrMode) return;
    const entries = Object.entries(routeBadges).filter(
      ([cellId, badge]) => typeof badge === 'number' && /^r\d+c0$/.test(cellId)
    );
    if (!entries.length) return;
    setInputValues(prev => {
      const next = { ...prev };
      for (const [cellId, badge] of entries) {
        const row = parseInt(cellId.match(/\d+/)[0]);
        next[`r${row}c4`] = String(badge * (parseFloat(params.approachTime) || 0));
        next[`r${row}c6`] = String(badge * (parseFloat(params.approachFuel) || 0));
      }
      return next;
    });
  }, [vfrMode, routeBadges, params.approachTime, params.approachFuel]);

  // Derive a stable key from alt-row distances so the effect below re-runs only when dist changes.
  // c3 is the only column this effect reads; it never writes c3, so no infinite loop.
  const altDistKey = ALT_ROWS.map(r => inputValues[`r${r}c3`] || '').join(',');
  useEffect(() => {
    if (!vfrMode) return;
    const gs = parseFloat(clncFields.vfrGsCalc);
    if (isNaN(gs) || gs <= 0) return;
    let lbsPh = parseFloat(clncFields.vfrLbsPh);
    if (isNaN(lbsPh)) {
      const denom = 0.0213507*gs - 0.000097065*gs**2 + 1.50819e-7*gs**3 - 1.22171;
      if (denom > 0) lbsPh = Math.round(gs / denom);
      else return;
    }
    setInputValues(prev => {
      const next = { ...prev };
      for (const row of ALT_ROWS) {
        if (vfrApr[`r${row}c0`]) continue; // APR rows handled by their own effect
        const dist = parseFloat(prev[`r${row}c3`] || '');
        if (isNaN(dist) || dist <= 0) { next[`r${row}c4`] = ''; next[`r${row}c6`] = ''; continue; }
        const eteSecs = calcVFREte(dist, gs);
        if (!eteSecs) { next[`r${row}c4`] = ''; next[`r${row}c6`] = ''; continue; }
        next[`r${row}c4`] = String(Math.round(eteSecs / 60));
        next[`r${row}c6`] = String(calcVFRLegFuel(eteSecs, lbsPh));
      }
      return next;
    });
  }, [vfrMode, clncFields.vfrGsCalc, clncFields.vfrLbsPh, vfrApr, altDistKey]);

  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (el) setJetlogScale(Math.min(1, el.offsetWidth / 640));
    };
    update();
    const obs = new ResizeObserver(() => requestAnimationFrame(update));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch('/presets.json')
      .then(r => r.json())
      .then(data => {
        const presets = Array.isArray(data) ? data : [];
        setSharedPresets(presets);
        setCollapsedFolders(new Set(presets.map(p => p.folder).filter(Boolean)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tw4_jet_presets');
      if (saved) setLocalPresets(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    const startF = parseFloat(params.startFuel) || 0;
    const sttoF = parseFloat(params.sttoFuel) || 0;
    setInputValues(prev => ({
      ...prev,
      'r0c4': vfrMode ? formatVFREte((parseFloat(params.sttoTime) || 0) * 60) : params.sttoTime,
      'r0c6': params.sttoFuel,
      'r0c7': String(startF - sttoF),
    }));
  }, [params.startFuel, params.sttoFuel, params.sttoTime, vfrMode]);

  const cruiseGrouped = useMemo(() => {
    const groups = {};
    cruiseData.forEach(r => {
      if (!groups[r.alt]) groups[r.alt] = [];
      groups[r.alt].push(r);
    });
    return { groups, altList: Object.keys(groups).map(Number).sort((a, b) => a - b) };
  }, [cruiseData]);

  const parseElevation = (text) => {
    const clean = (text || '').replace(/,/g, '');
    const withApos = clean.match(/(\d+)'/);
    if (withApos) return parseInt(withApos[1]);
    const nums = clean.match(/\d+/g);
    return nums ? parseInt(nums[nums.length - 1]) : 0;
  };

  const parseMagVar = (val) => {
    if (!val || val.trim() === '') return 0;
    const upper = val.trim().toUpperCase();
    const match = upper.match(/^(-?\d*\.?\d+)([EW]?)$/);
    if (!match) return parseFloat(val) || 0;
    const num = parseFloat(match[1]);
    const dir = match[2];
    if (dir === 'E') return -num;
    if (dir === 'W') return num;
    return num;
  };

  const computeTTCValues = (alt, deltaT, depElevText) => {
    const dt = parseFloat(deltaT);
    if (isNaN(dt) || !alt || ttcData.length === 0) return { ttc: null, fuel: null, dist: null, tasClimb: '', lbsPhClimb: '' };
    const row = ttcData.reduce((best, r) =>
      Math.abs(r.alt - alt) < Math.abs(best.alt - alt) ? r : best
    );
    const deltaTOptions = [-20, 0, 10, 20];
    const interpRow = (r) => {
      if (dt <= deltaTOptions[0])
        return { time: r.time[0], fuel: r.fuel[0], dist: r.dist[0] };
      if (dt >= deltaTOptions[deltaTOptions.length - 1]) {
        const last = deltaTOptions.length - 1;
        return { time: r.time[last], fuel: r.fuel[last], dist: r.dist[last] };
      }
      let loI = 0;
      for (let i = 0; i < deltaTOptions.length - 1; i++) {
        if (dt >= deltaTOptions[i] && dt <= deltaTOptions[i + 1]) { loI = i; break; }
      }
      const hiI = loI + 1;
      const f = (dt - deltaTOptions[loI]) / (deltaTOptions[hiI] - deltaTOptions[loI]);
      const lerp = (arr) =>
        arr[loI] == null || arr[hiI] == null ? null : arr[loI] + f * (arr[hiI] - arr[loI]);
      return { time: lerp(r.time), fuel: lerp(r.fuel), dist: lerp(r.dist) };
    };
    const vals = interpRow(row);
    let ttc  = vals.time;
    let fuel = vals.fuel;
    let dist = vals.dist;
    const depElev = parseElevation(depElevText);
    if (depElev > 4999) {
      const roundedElev = Math.round(depElev / 1000) * 1000;
      const elevRow = ttcData.reduce((best, r) =>
        Math.abs(r.alt - roundedElev) < Math.abs(best.alt - roundedElev) ? r : best
      );
      const depVals = interpRow(elevRow);
      if (ttc  != null && depVals.time != null) ttc  -= depVals.time;
      if (fuel != null && depVals.fuel != null) fuel -= depVals.fuel;
      if (dist != null && depVals.dist != null) dist -= depVals.dist;
    }
    if (ttc  != null) ttc  = Math.round(ttc);
    if (fuel != null) fuel = Math.round(fuel);
    if (dist != null) dist = Math.round(dist);
    const tasClimb   = ttc != null && dist != null && ttc > 0 ? String(Math.round(60 * dist / ttc)) : '';
    const lbsPhClimb = ttc != null && fuel != null && ttc > 0 ? String(Math.round(60 * fuel / ttc)) : '';
    return { ttc, fuel, dist, tasClimb, lbsPhClimb };
  };

  const autoFillTTC = (deltaT, alt, depElevText) => {
    const vals = computeTTCValues(alt, deltaT, depElevText);
    setClncFields(prev => ({
      ...prev,
      ttc:  vals.ttc  != null ? String(vals.ttc)  : '',
      fuel: vals.fuel != null ? String(vals.fuel) : '',
      dist: vals.dist != null ? String(vals.dist) : '',
      tasClimb:   vals.tasClimb,
      lbsPhClimb: vals.lbsPhClimb,
    }));
  };

  const autoFillCruise = (oat, alt) => {
    const oatNum = parseFloat(oat);
    if (isNaN(oatNum) || !alt || cruiseData.length === 0) return;

    const { groups: altGroups, altList } = cruiseGrouped;

    // Interpolate (or clamp) within one altitude's rows by OAT
    const interpOat = (rows) => {
      const sorted = [...rows].sort((a, b) => a.oat - b.oat);
      if (oatNum <= sorted[0].oat) return sorted[0];
      if (oatNum >= sorted[sorted.length - 1].oat) return sorted[sorted.length - 1];
      let lo, hi;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (oatNum >= sorted[i].oat && oatNum <= sorted[i + 1].oat) {
          lo = sorted[i]; hi = sorted[i + 1]; break;
        }
      }
      const f = (oatNum - lo.oat) / (hi.oat - lo.oat);
      return {
        tas: lo.tas + f * (hi.tas - lo.tas),
        ff:  lo.ff  + f * (hi.ff  - lo.ff),
        ias: lo.ias + f * (hi.ias - lo.ias),
      };
    };

    const apply = (row) => setClncFields(prev => ({
      ...prev,
      tasCruise:   String(Math.round(row.tas)),
      lbsPhCruise: String(Math.round(row.ff)),
      ias:         String(Math.round(row.ias)),
    }));

    if (alt <= altList[0]) { apply(interpOat(altGroups[altList[0]])); return; }
    if (alt >= altList[altList.length - 1]) { apply(interpOat(altGroups[altList[altList.length - 1]])); return; }

    let lowAlt, highAlt;
    for (let i = 0; i < altList.length - 1; i++) {
      if (alt >= altList[i] && alt <= altList[i + 1]) {
        lowAlt = altList[i]; highAlt = altList[i + 1]; break;
      }
    }
    const altFrac = (alt - lowAlt) / (highAlt - lowAlt);
    const lo = interpOat(altGroups[lowAlt]);
    const hi = interpOat(altGroups[highAlt]);
    const interp = (a, b) => Math.round(a + altFrac * (b - a));
    setClncFields(prev => ({
      ...prev,
      tasCruise:   String(interp(lo.tas, hi.tas)),
      lbsPhCruise: String(interp(lo.ff,  hi.ff)),
      ias:         String(interp(lo.ias, hi.ias)),
    }));
  };

  const autoFillVFRCruise = (gs) => {
    const gsNum = parseFloat(gs);
    if (isNaN(gsNum) || gsNum <= 0) return;
    const denom = 0.0213507 * gsNum
      - 0.000097065 * gsNum ** 2
      + 1.50819e-7  * gsNum ** 3
      - 1.22171;
    if (denom <= 0) return;
    const ff = gsNum / denom;
    setClncFields(prev => ({ ...prev, vfrLbsPh: String(Math.round(ff)) }));
  };

  const setInfoField = (key, val) => setInfoFields(prev => ({...prev, [key]: val}));
  const cleanVal = val => (!val || val.trim() === '-') ? '' : val.trim();

  const selectAirport = (ap, type) => {
    if (type === 'dep') {
      const newDepElev = `${ap.airport} ${ap.elev}`;
      setInfoFields(prev => ({...prev,
        depElev: newDepElev,
        clncDel: cleanVal(ap.clncDel),
        gndCont: cleanVal(ap.gndCont),
        tower: cleanVal(ap.tower),
      }));
      if (clncFields.deltaT) autoFillTTC(clncFields.deltaT, selectedAlt, newDepElev);
      setClncFields(prev => ({...prev, vfrAtis: (ap.atis || '').trim()}));
      autoFillVFRCruise(clncFields.vfrGsCalc);
    } else if (type === 'dest') {
      setInfoFields(prev => ({...prev,
        destElev: `${ap.airport} ${ap.elev}`,
        destApcCont: cleanVal(ap.apcCont),
        destTower: cleanVal(ap.tower),
        destGndCont: cleanVal(ap.gndCont),
      }));
    } else if (type === 'alt') {
      setInfoFields(prev => ({...prev,
        alternate: ap.airport,
        altElev: cleanVal(ap.elev),
        altApcCont: cleanVal(ap.apcCont),
        altTower: cleanVal(ap.tower),
        altGndCont: cleanVal(ap.gndCont),
      }));
    }
    setOpenDropdown(null);
  };

  const renderAirportDropdown = (type) => openDropdown === type && (
    <div
      style={{position: 'absolute', zIndex: 200, background: 'white', border: '1px solid #999',
        maxHeight: '130px', overflowY: 'auto', minWidth: '160px', left: 0, top: '100%'}}
      onClick={e => e.stopPropagation()}
    >
      {airports.map(ap => (
        <div key={ap.airport}
          onClick={() => selectAirport(ap, type)}
          style={{padding: '3px 6px', cursor: 'pointer', fontSize: '0.75em', borderBottom: '1px solid #f0f0f0'}}
          onMouseEnter={e => e.currentTarget.style.background = '#e8f0fe'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          {ap.airport} {ap.elev}
        </div>
      ))}
    </div>
  );

  const formatEteSum = (mins) => {
    if (mins == null) return '';
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${h}+${String(m).padStart(2, '0')}`;
  };

  const calcVFREte = (dist, gs) => {
    if (!gs || gs <= 0 || isNaN(dist) || isNaN(gs)) return null;
    return Math.round(dist / gs * 3600 / 6) * 6;
  };

  const calcVFRLegFuel = (eteSecs, lbsPh) =>
    !isNaN(lbsPh) ? Math.ceil(Math.round(eteSecs / 60 * lbsPh / 60) / 5) * 5 : 0;

  const formatVFREte = (secs) => {
    if (secs == null || isNaN(secs)) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}+${String(s).padStart(2, '0')}`;
  };

  const formatVFREta = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h === 0) return `${m}+${String(s).padStart(2, '0')}`;
    return `${h}+${String(m).padStart(2, '0')}+${String(s).padStart(2, '0')}`;
  };

  const sumCells = (ids) => {
    const total = ids.reduce((acc, id) => {
      const raw = (splitCells[id]?.bottom ?? inputValues[id] ?? '');
      const num = parseFloat((raw).match(/-?\d+(\.\d+)?/)?.[0]);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    return total > 0 ? Math.round(total * 10) / 10 : null;
  };

  // Sums ETE cells that may contain "mm+ss" (VFR) or plain minutes (IFR/alt).
  // Returns total seconds, or null if all empty.
  const sumEteSecs = (ids) => {
    let totalSecs = 0;
    let any = false;
    for (const id of ids) {
      const val = (inputValues[id] || '').trim();
      if (!val) continue;
      any = true;
      const vfrMatch = val.match(/^(\d+)\+(\d{2})$/);
      if (vfrMatch) {
        totalSecs += parseInt(vfrMatch[1]) * 60 + parseInt(vfrMatch[2]);
      } else {
        const n = parseFloat(val.match(/-?\d+(\.\d+)?/)?.[0]);
        if (!isNaN(n)) totalSecs += Math.round(n * 60);
      }
    }
    return any ? totalSecs : null;
  };

  const renderFreqInput = (value, onChange) => {
    const match = value.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const main = match ? match[1].trim() : value;
    const qualifier = match ? match[2] : null;
    return (
      <div style={{position: 'relative'}}>
        <input type="text" value={main} onChange={onChange} />
        {qualifier && qualifier !== 'C' && (
          <span style={{position: 'absolute', top: -6, right: 2, fontSize: '0.75em', lineHeight: 1, color: '#555', pointerEvents: 'none'}}>
            {qualifier}
          </span>
        )}
        {qualifier === 'C' && (
          <img src="/ctaf.png" alt="CTAF" style={{position: 'absolute', top: -6, right: 1, width: 10, height: 10, pointerEvents: 'none'}} />
        )}
      </div>
    );
  };

  const renderFreqCell = (key, label, tdProps = {}) => (
    <td {...tdProps}>
      <span className="info-label">{label}</span>
      {renderFreqInput(infoFields[key] || '', (e) => setInfoField(key, e.target.value))}
    </td>
  );

  const renderCell = (cellId, rowSpan, colSpan) => {
    const val = inputValues[cellId] || '';
    if (splitCells[cellId]) {
      const { top, bottom } = splitCells[cellId];
      const longest = (top || '').length >= (bottom || '').length ? top : bottom;
      const splitFontSize = vfrMode ? '0.85em' : narrowCellFontSize(longest);
      const splitFontStyle = splitFontSize ? {fontSize: splitFontSize} : undefined;
      const handleSplitTopChange = (newTop) => {
        const slashParts = newTop.split('/').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (newTop.includes('/') && slashParts.length > 0) {
          const newBottom = String(Math.round(slashParts.reduce((a, b) => a + b, 0) * 10) / 10);
          setSplitCells(prev => ({...prev, [cellId]: {...prev[cellId], top: newTop, bottom: newBottom}}));
          setInputValues(prev => ({...prev, [cellId]: newBottom}));
        } else {
          setSplitCells(prev => ({...prev, [cellId]: {...prev[cellId], top: newTop}}));
        }
      };
      return (
        <td id={cellId} rowSpan={rowSpan || undefined} colSpan={colSpan || undefined} style={{padding: 0, border: '1px solid black', height: '1px', ...splitFontStyle}}>
          <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div style={{flex: 1, minHeight: 0, borderBottom: '1px solid #000', display: 'flex', alignItems: 'center', padding: '0 3px'}}>
              <input value={top} onChange={e => handleSplitTopChange(e.target.value)} style={{textAlign: 'center', width: '100%', boxSizing: 'border-box', ...splitFontStyle}} />
            </div>
            <div style={{flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', ...splitFontStyle}}>{bottom}</div>
          </div>
        </td>
      );
    }
    const fontSize = vfrMode ? '0.85em' : narrowCellFontSize(val);
    const fontStyle = fontSize ? {fontSize} : undefined;
    return (
      <td id={cellId} {...(rowSpan && { rowSpan })} {...(colSpan && { colSpan })}>
        <input
          value={val}
          onChange={(e) => handleInputChange(cellId, e.target.value)}
          style={fontStyle}
        />
      </td>
    );
  };

  const ROUTE_OPTIONS = ['Route', 'Direct To', '1 Approach', '2 Approaches', '3 Approaches', 'Hold', 'Note'];

  const handleRouteOption = (cellId, opt) => {
    setOpenDropdown(null);
    const topRow = parseInt(cellId.match(/^r(\d+)c0$/)?.[1]);
    const countMatch = opt.match(/^(\d+) Approach/);
    if (countMatch) {
      const count = parseInt(countMatch[1]);
      const aprEte = count * (parseFloat(params.approachTime) || 0);
      const aprFuel = count * (parseFloat(params.approachFuel) || 0);
      if (holdCells[cellId]) {
        const holdMins = parseFloat(params.holdTime) || 0;
        const lbsPh = parseFloat(clncFields.lbsPhCruise) || 0;
        const holdFuel = lbsPh > 0 ? Math.ceil(Math.round(holdMins * lbsPh / 60) / 5) * 5 : 0;
        const totalEte = aprEte + holdMins;
        const totalFuel = aprFuel + holdFuel;
        setSplitCells(prev => ({...prev,
          [`r${topRow}c4`]: { top: `${aprEte}/${holdMins}`, bottom: String(totalEte) },
          [`r${topRow}c6`]: { top: `${aprFuel}/${holdFuel}`, bottom: String(totalFuel) },
        }));
        setInputValues(prev => ({...prev, [`r${topRow}c4`]: String(totalEte), [`r${topRow}c6`]: String(totalFuel)}));
      } else {
        setInputValues(prev => ({...prev, [`r${topRow}c4`]: String(aprEte), [`r${topRow}c6`]: String(aprFuel)}));
      }
      setRouteBadges(prev => ({...prev, [cellId]: count}));
    } else if (opt === 'Hold') {
      const aprCount = routeBadges[cellId];
      const wasHeld = !!holdCells[cellId];
      if (typeof aprCount === 'number') {
        const aprEte = aprCount * (parseFloat(params.approachTime) || 0);
        const aprFuel = aprCount * (parseFloat(params.approachFuel) || 0);
        if (!wasHeld) {
          const holdMins = parseFloat(params.holdTime) || 0;
          const lbsPh = parseFloat(clncFields.lbsPhCruise) || 0;
          const holdFuel = lbsPh > 0 ? Math.ceil(Math.round(holdMins * lbsPh / 60) / 5) * 5 : 0;
          const totalEte = aprEte + holdMins;
          const totalFuel = aprFuel + holdFuel;
          setSplitCells(prev => ({...prev,
            [`r${topRow}c4`]: { top: `${aprEte}/${holdMins}`, bottom: String(totalEte) },
            [`r${topRow}c6`]: { top: `${aprFuel}/${holdFuel}`, bottom: String(totalFuel) },
          }));
          setInputValues(prev => ({...prev, [`r${topRow}c4`]: String(totalEte), [`r${topRow}c6`]: String(totalFuel)}));
        } else {
          setSplitCells(prev => { const n = {...prev}; delete n[`r${topRow}c4`]; delete n[`r${topRow}c6`]; return n; });
          setInputValues(prev => ({...prev, [`r${topRow}c4`]: String(aprEte), [`r${topRow}c6`]: String(aprFuel)}));
        }
      }
      setHoldCells(prev => { const n = {...prev}; if (n[cellId]) { delete n[cellId]; } else { n[cellId] = true; } return n; });
    } else if (opt === 'Note') {
      setRouteBadges(prev => ({...prev, [cellId]: 'N'}));
    } else if (opt === 'Direct To') {
      setInputValues(prev => ({...prev, [`${cellId}_a`]: 'D→'}));
      setRouteBadges(prev => { const n = {...prev}; delete n[cellId]; return n; });
    } else {
      setRouteBadges(prev => { const n = {...prev}; delete n[cellId]; return n; });
    }
  };

  const renderRouteToCell = (cellId) => {
    const aId = `${cellId}_a`;
    const bId = `${cellId}_b`;
    const dropKey = `route_${cellId}`;
    const badge = routeBadges[cellId];
    const isApproach = typeof badge === 'number';
    const isSingleInput = isApproach || badge === 'N';
    return (
      <td id={cellId} rowSpan={2} style={{verticalAlign: isSingleInput ? 'middle' : 'top', padding: '2px', position: 'relative'}}>
        {holdCells[cellId] && (
          <span style={{position: 'absolute', top: 2, [isApproach ? 'left' : 'right']: 3, fontSize: '0.65em', fontWeight: 'bold', color: '#333', pointerEvents: 'none', lineHeight: 1}}>H</span>
        )}
        {isApproach && (
          <span style={{position: 'absolute', top: 2, right: 3, fontSize: '0.65em', fontWeight: 'bold', color: '#333', pointerEvents: 'none', lineHeight: 1}}>
            {badge}
          </span>
        )}
        {isSingleInput ? (
          <div style={{position: 'relative', paddingRight: '14px', display: 'flex', alignItems: 'center'}}>
            <input
              value={inputValues[aId] || ''}
              onChange={e => handleInputChange(aId, e.target.value)}
              style={{textAlign: 'left', width: '100%', boxSizing: 'border-box', ...(cellFontSize(inputValues[aId]) ? {fontSize: cellFontSize(inputValues[aId])} : {fontSize: '1.1em'})}}
            />
            <span
              onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === dropKey ? null : dropKey); }}
              style={{position: 'absolute', bottom: 0, right: 0, cursor: 'pointer', userSelect: 'none', padding: '0 2px'}}
            >▾</span>
          </div>
        ) : (
          <div style={{position: 'relative', paddingRight: '14px'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
              <input
                value={inputValues[aId] || ''}
                onChange={e => handleInputChange(aId, e.target.value)}
                style={{textAlign: 'left', width: '100%', boxSizing: 'border-box', ...(cellFontSize(inputValues[aId]) && {fontSize: cellFontSize(inputValues[aId])})}}
              />
              <input
                value={inputValues[bId] || ''}
                onChange={e => handleInputChange(bId, e.target.value)}
                style={{textAlign: 'left', width: '100%', boxSizing: 'border-box', ...(cellFontSize(inputValues[bId]) && {fontSize: cellFontSize(inputValues[bId])})}}
              />
            </div>
            <span
              onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === dropKey ? null : dropKey); }}
              style={{position: 'absolute', bottom: 0, right: 0, cursor: 'pointer', userSelect: 'none', padding: '0 2px'}}
            >▾</span>
          </div>
        )}
        {openDropdown === dropKey && (
          <div
            style={{position: 'absolute', zIndex: 200, background: 'white', border: '1px solid #999',
              maxHeight: '150px', overflowY: 'auto', minWidth: '120px', left: 0, top: '100%'}}
            onClick={e => e.stopPropagation()}
          >
            {ROUTE_OPTIONS.map(opt => (
              <div key={opt}
                onClick={() => handleRouteOption(cellId, opt)}
                style={{padding: '3px 6px', cursor: 'pointer', fontSize: '0.75em', borderBottom: '1px solid #f0f0f0'}}
                onMouseEnter={e => e.currentTarget.style.background = '#e8f0fe'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </td>
    );
  };

  const vfrNameFontSize = (text) => {
    const len = (text || '').length;
    if (len <= 8) return '0.95em';
    if (len <= 11) return '0.78em';
    if (len <= 14) return '0.61em';
    return '0.50em';
  };

  const renderVFRCheckCell = (cellId, flagState, setFlagState, label, labelWidth) => {
    const aId = `${cellId}_a`;
    const bId = `${cellId}_b`;
    const isChecked = !!flagState[cellId];
    return (
      <td id={cellId} rowSpan={2} style={{verticalAlign: 'top', padding: '2px', position: 'relative'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '1px'}}>
          <input
            value={inputValues[aId] || ''}
            onChange={e => handleInputChange(aId, e.target.value)}
            placeholder="FP code"
            style={{textAlign: 'left', width: '100%', boxSizing: 'border-box', fontSize: '0.62em', padding: '1px 2px', height: '1.6em', background: 'transparent', border: 'none', outline: 'none'}}
          />
          <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}>
            <input
              value={inputValues[bId] || ''}
              onChange={e => handleInputChange(bId, e.target.value)}
              style={{textAlign: 'left', flex: 1, boxSizing: 'border-box', fontSize: vfrNameFontSize(inputValues[bId]), background: 'transparent', border: 'none', outline: 'none'}}
            />
            <label style={{cursor: 'pointer', fontSize: '0.65em', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '1px', flexShrink: 0}}>
              <span style={{minWidth: labelWidth, textAlign: 'right', display: 'inline-block'}}>{isChecked ? label : ''}</span>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={e => setFlagState(prev => {
                  const n = {...prev};
                  if (e.target.checked) n[cellId] = true; else delete n[cellId];
                  return n;
                })}
                style={{width: '10px', height: '10px', margin: 0}}
              />
            </label>
          </div>
        </div>
      </td>
    );
  };

  const pairHasData = (pairIdx) => {
    const top = pairIdx * 2;
    const bot = top + 1;
    const hasVal = (id) => (inputValues[id] || '').trim() !== '';
    if (hasVal(`r${top}c0_a`) || hasVal(`r${top}c0_b`)) return true;
    const otherTopCols = ['c1','c2','c3','c4','c5','c6','c7','c8'];
    const botCols = ['c0','c1','c2'];
    return (
      otherTopCols.some(col => hasVal(`r${top}${col}`)) ||
      botCols.some(col => hasVal(`r${bot}${col}`)) ||
      Object.keys(splitCells).some(k => k.startsWith(`r${top}c`) || k.startsWith(`r${bot}c`))
    );
  };

  const shiftKeysForInsert = (obj, insertAfterPairIdx) => {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      const m = key.match(/^r(\d+)(c.+)$/);
      if (!m) { result[key] = val; continue; }
      const rowNum = parseInt(m[1]);
      if (rowNum >= 200) { result[key] = val; continue; }
      const pairIdx = Math.floor(rowNum / 2);
      if (pairIdx > insertAfterPairIdx) {
        result[`r${(pairIdx + 1) * 2 + (rowNum % 2)}${m[2]}`] = val;
      } else {
        result[key] = val;
      }
    }
    return result;
  };

  const shiftKeysForDelete = (obj, deletePairIdx) => {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      const m = key.match(/^r(\d+)(c.+)$/);
      if (!m) { result[key] = val; continue; }
      const rowNum = parseInt(m[1]);
      if (rowNum >= 200) { result[key] = val; continue; }
      const pairIdx = Math.floor(rowNum / 2);
      if (pairIdx === deletePairIdx) continue;
      if (pairIdx > deletePairIdx) {
        result[`r${(pairIdx - 1) * 2 + (rowNum % 2)}${m[2]}`] = val;
      } else {
        result[key] = val;
      }
    }
    return result;
  };

  const handleInsertAfter = (insertAfterPairIdx) => {
    if (mainRowCount >= 20) return;
    setInputValues(prev => shiftKeysForInsert(prev, insertAfterPairIdx));
    setSplitCells(prev => shiftKeysForInsert(prev, insertAfterPairIdx));
    setHoldCells(prev => shiftKeysForInsert(prev, insertAfterPairIdx));
    setRouteBadges(prev => shiftKeysForInsert(prev, insertAfterPairIdx));
    setVfrTng(prev => shiftKeysForInsert(prev, insertAfterPairIdx));
    setIntClimbs(prev => prev.map(c =>
      c.row > insertAfterPairIdx ? { ...c, row: c.row + 1 } : c
    ));
    setMainRowCount(prev => prev + 1);
  };

  const handleDeletePair = (deletePairIdx) => {
    if (mainRowCount <= 1) return;
    setInputValues(prev => shiftKeysForDelete(prev, deletePairIdx));
    setSplitCells(prev => shiftKeysForDelete(prev, deletePairIdx));
    setHoldCells(prev => shiftKeysForDelete(prev, deletePairIdx));
    setRouteBadges(prev => shiftKeysForDelete(prev, deletePairIdx));
    setVfrTng(prev => shiftKeysForDelete(prev, deletePairIdx));
    setIntClimbs(prev =>
      prev
        .filter(c => c.row !== deletePairIdx)
        .map(c => c.row > deletePairIdx ? { ...c, row: c.row - 1 } : c)
    );
    setMainRowCount(prev => prev - 1);
  };

  const handleVFRSolve = () => {
    const gs = parseFloat(clncFields.vfrGsCalc);
    const lbsPh = parseFloat(clncFields.vfrLbsPh);
    const newVals = { ...inputValues };

    const sttoTimeMin = parseFloat(params.sttoTime) || 0;
    const sttoFuel = parseFloat(params.sttoFuel) || 0;
    const startFuel = parseFloat(params.startFuel) || 0;
    newVals['r0c4'] = formatVFREte(sttoTimeMin * 60);
    newVals['r0c6'] = String(sttoFuel);
    let efr = startFuel - sttoFuel;
    newVals['r0c7'] = String(efr);
    newVals['r0c5'] = '';

    let etaAccumSecs = 0;
    let firstActualSet = false;
    const mainRows = Array.from({ length: mainRowCount }, (_, i) => i * 2);

    for (let pairIdx = 1; pairIdx < mainRowCount; pairIdx++) {
      const row = pairIdx * 2;
      const cellId = `r${row}c0`;
      const isTng = !!vfrTng[cellId];
      const dist = parseFloat(inputValues[`r${row}c3`] || '');

      let eteSecs, legFuel;
      if (isTng) {
        eteSecs = (parseFloat(params.tngTime) || 5) * 60;
        legFuel = parseFloat(params.tngFuel) || 25;
      } else if (!isNaN(dist) && !isNaN(gs) && gs > 0) {
        eteSecs = calcVFREte(dist, gs);
        if (eteSecs == null) continue;
        legFuel = calcVFRLegFuel(eteSecs, lbsPh);
      } else {
        continue;
      }

      newVals[`r${row}c4`] = formatVFREte(eteSecs);
      newVals[`r${row}c6`] = String(legFuel);
      efr -= legFuel;
      newVals[`r${row}c7`] = String(efr);

      if (!firstActualSet) {
        newVals[`r${row}c5`] = '0+00';
        firstActualSet = true;
      } else {
        etaAccumSecs += eteSecs; // ETA = last ETA + this leg's ETE
        newVals[`r${row}c5`] = formatVFREta(etaAccumSecs);
      }
    }

    for (const row of ALT_ROWS) {
      const cellId = `r${row}c0`;
      const isApr = !!vfrApr[cellId];
      const dist = parseFloat(inputValues[`r${row}c3`] || '');
      let eteSecs, legFuel;
      if (isApr) {
        eteSecs = (parseFloat(params.approachTime) || 10) * 60;
        legFuel = parseFloat(params.approachFuel) || 50;
      } else if (!isNaN(dist) && !isNaN(gs) && gs > 0) {
        eteSecs = calcVFREte(dist, gs);
        if (eteSecs == null) continue;
        legFuel = calcVFRLegFuel(eteSecs, lbsPh);
      } else {
        continue;
      }
      newVals[`r${row}c4`] = String(Math.round(eteSecs / 60));
      newVals[`r${row}c6`] = String(legFuel);
      efr -= legFuel;
      newVals[`r${row}c7`] = String(efr);
    }

    // Continuation fuel: bottom-up pass; last stop shows contFuelStart (200), each row above adds that leg's fuel
    const allRowsBottomUp = [...[...ALT_ROWS].reverse(), ...[...mainRows].reverse()];
    let contFuel = parseFloat(params.stdReserve) || 200;
    for (const row of allRowsBottomUp) {
      const legFuelStr = (newVals[`r${row}c6`] || inputValues[`r${row}c6`] || '').trim();
      if (!legFuelStr) { newVals[`r${row}c8`] = ''; continue; }
      newVals[`r${row}c8`] = String(Math.round(contFuel));
      contFuel += parseFloat(legFuelStr) || 0;
    }

    setSplitCells({});
    setInputValues(newVals);
  };

  const handleSolve = (intClimbsOverride = null) => {
    if (vfrMode) { handleVFRSolve(); return; }
    const climbDistTotal = parseFloat(clncFields.dist);
    if (isNaN(climbDistTotal) || climbDistTotal <= 0) return;

    const magVar = parseMagVar(clncFields.magVar);
    const climbVEL = parseFloat(clncFields.climbVel);
    const climbTAS = parseFloat(clncFields.tasClimb);
    const correctedClimbDIR = parseFloat(clncFields.climbDir) + magVar;
    const cruiseVEL = parseFloat(clncFields.cruiseVel);
    const cruiseTAS = parseFloat(clncFields.tasCruise);
    const correctedCruiseDIR = parseFloat(clncFields.cruiseDir) + magVar;
    const lbsPhClimb = parseFloat(clncFields.lbsPhClimb);
    const lbsPhCruise = parseFloat(clncFields.lbsPhCruise);

    const calcGS = (tas, dir, vel, tc) => {
      if (isNaN(tas) || isNaN(dir) || isNaN(vel) || isNaN(tc)) return null;
      return Math.round(tas + (-vel * Math.cos((dir - tc) * Math.PI / 180)));
    };
    const calcETE = (dist, gs) => (gs > 0 ? Math.round(60 * dist / gs) : null);
    const calcFuel = (ete, lbsPh) => (ete != null && !isNaN(lbsPh) ? Math.ceil(Math.round(ete * lbsPh / 60) / 5) * 5 : null);

    const mainRows = Array.from({length: mainRowCount}, (_, i) => i * 2);

    // Build sections from sorted int climbs
    const effectiveIntClimbs = (intClimbsOverride ?? intClimbs).slice().sort((a, b) => a.row - b.row);
    const sectionStarts = [0, ...effectiveIntClimbs.map(c => c.row * 2)];

    // Climb data per section (section 0 = primary, section N = after Nth int climb)
    const sectionClimbData = [{ dist: climbDistTotal, climbTAS, lbsPhClimb }];
    for (const c of effectiveIntClimbs) {
      const vals = computeTTCValues(c.alt, clncFields.deltaT, c.elev);
      sectionClimbData.push({
        dist: vals.dist != null ? Math.max(0, vals.dist) : 0,
        climbTAS: vals.tasClimb ? parseFloat(vals.tasClimb) : cruiseTAS,
        lbsPhClimb: vals.lbsPhClimb ? parseFloat(vals.lbsPhClimb) : lbsPhCruise,
      });
    }

    // Find turnover row for each section (-1 means no climb distance → all cruise)
    const sectionTurnovers = sectionClimbData.map((sec, si) => {
      if (sec.dist <= 0) return { turnoverRow: -1, turnoverClimb: 0, turnoverCruise: 0 };
      const secStart = sectionStarts[si];
      const secEnd = si + 1 < sectionStarts.length ? sectionStarts[si + 1] : Infinity;
      let cumDist = 0, turnoverRow = null, turnoverClimb = 0, turnoverCruise = 0;
      for (const row of mainRows) {
        if (row < secStart || row >= secEnd) continue;
        const d = parseFloat(inputValues[`r${row}c3`] || '');
        if (isNaN(d) || d === 0) continue;
        if (cumDist + d > sec.dist) {
          turnoverRow = row;
          turnoverClimb = Math.round((sec.dist - cumDist) * 10) / 10;
          turnoverCruise = Math.round((d - turnoverClimb) * 10) / 10;
          break;
        }
        cumDist += d;
      }
      return { turnoverRow, turnoverClimb, turnoverCruise };
    });

    const newSplit = {};
    const newVals = { ...inputValues };
    const applyHold = (row, ete, fuel, holdMins) => {
      const holdFuel = calcFuel(holdMins, lbsPhCruise);
      const totalEte = ete + holdMins;
      const totalFuel = (fuel ?? 0) + (holdFuel ?? 0);
      newSplit[`r${row}c4`] = { top: `${ete}/${holdMins}`, bottom: String(totalEte) };
      newSplit[`r${row}c6`] = { top: `${fuel ?? ''}/${holdFuel ?? ''}`, bottom: String(totalFuel) };
      newVals[`r${row}c4`] = String(totalEte);
      newVals[`r${row}c6`] = String(totalFuel);
    };

    const applyTurnover = (row, d, climbGS, cruiseGS, climbDist, cruiseDist, lbsPhC, isHold, holdMins) => {
      newSplit[`r${row}c3`] = { top: `${climbDist}/${cruiseDist}`, bottom: String(d) };
      newSplit[`r${row}c8`] = { top: climbGS !== null ? String(climbGS) : '', bottom: cruiseGS !== null ? String(cruiseGS) : '' };
      const climbETE  = climbGS  !== null ? calcETE(climbDist,  climbGS)  : null;
      const cruiseETE = cruiseGS !== null ? calcETE(cruiseDist, cruiseGS) : null;
      const totalETE  = (climbETE ?? 0) + (cruiseETE ?? 0);
      const climbFuel  = calcFuel(climbETE,  lbsPhC);
      const cruiseFuel = calcFuel(cruiseETE, lbsPhCruise);
      const totalFuel  = (climbFuel ?? 0) + (cruiseFuel ?? 0);
      if (isHold) {
        const holdFuel = calcFuel(holdMins, lbsPhCruise);
        const grandETE  = totalETE + holdMins;
        const grandFuel = totalFuel + (holdFuel ?? 0);
        newSplit[`r${row}c4`] = { top: `${climbETE ?? ''}/${cruiseETE ?? ''}/${holdMins}`, bottom: String(grandETE) };
        newSplit[`r${row}c6`] = { top: `${climbFuel ?? ''}/${cruiseFuel ?? ''}/${holdFuel ?? ''}`, bottom: String(grandFuel) };
        newVals[`r${row}c4`] = String(grandETE);
        newVals[`r${row}c6`] = String(grandFuel);
      } else {
        newSplit[`r${row}c4`] = { top: `${climbETE ?? ''}/${cruiseETE ?? ''}`, bottom: String(totalETE) };
        newSplit[`r${row}c6`] = { top: `${climbFuel ?? ''}/${cruiseFuel ?? ''}`, bottom: String(totalFuel) };
        newVals[`r${row}c4`] = String(totalETE);
        newVals[`r${row}c6`] = String(totalFuel);
      }
    };

    for (const row of mainRows) {
      const d = parseFloat(inputValues[`r${row}c3`] || '');
      if (isNaN(d) || d === 0) continue;
      const tc = parseFloat((inputValues[`r${row}c2`] || '').replace(/[^\d.-]/g, ''));
      const isHold = !!holdCells[`r${row}c0`];
      const holdMins = parseFloat(params.holdTime) || 0;

      // Find which section this row belongs to
      let si = 0;
      for (let i = sectionStarts.length - 1; i >= 0; i--) {
        if (row >= sectionStarts[i]) { si = i; break; }
      }
      const sec = sectionClimbData[si];
      const { turnoverRow, turnoverClimb, turnoverCruise } = sectionTurnovers[si];

      if (turnoverRow === -1) {
        // No climb distance for this section — all cruise
        const gs = calcGS(cruiseTAS, correctedCruiseDIR, cruiseVEL, tc);
        if (gs !== null) {
          newVals[`r${row}c8`] = String(gs);
          const ete = calcETE(d, gs);
          if (ete !== null) {
            const fuel = calcFuel(ete, lbsPhCruise);
            if (isHold) { applyHold(row, ete, fuel, holdMins); }
            else { newVals[`r${row}c4`] = String(ete); if (fuel !== null) newVals[`r${row}c6`] = String(fuel); }
          }
        }
      } else if (turnoverRow === null || row < turnoverRow) {
        const gs = calcGS(sec.climbTAS, correctedClimbDIR, climbVEL, tc);
        if (gs !== null) {
          newVals[`r${row}c8`] = String(gs);
          const ete = calcETE(d, gs);
          if (ete !== null) {
            const fuel = calcFuel(ete, sec.lbsPhClimb);
            if (isHold) { applyHold(row, ete, fuel, holdMins); }
            else { newVals[`r${row}c4`] = String(ete); if (fuel !== null) newVals[`r${row}c6`] = String(fuel); }
          }
        }
      } else if (row === turnoverRow) {
        if (turnoverClimb <= 0) {
          // Climb completed in the previous row — treat this row as pure cruise
          const gs = calcGS(cruiseTAS, correctedCruiseDIR, cruiseVEL, tc);
          if (gs !== null) {
            newVals[`r${row}c8`] = String(gs);
            const ete = calcETE(d, gs);
            if (ete !== null) {
              const fuel = calcFuel(ete, lbsPhCruise);
              if (isHold) { applyHold(row, ete, fuel, holdMins); }
              else { newVals[`r${row}c4`] = String(ete); if (fuel !== null) newVals[`r${row}c6`] = String(fuel); }
            }
          }
        } else {
          const cGS = calcGS(sec.climbTAS, correctedClimbDIR, climbVEL, tc);
          const crGS = calcGS(cruiseTAS, correctedCruiseDIR, cruiseVEL, tc);
          if (cGS !== null || crGS !== null) {
            applyTurnover(row, d, cGS, crGS, turnoverClimb, turnoverCruise, sec.lbsPhClimb, isHold, holdMins);
          }
        }
      } else {
        const gs = calcGS(cruiseTAS, correctedCruiseDIR, cruiseVEL, tc);
        if (gs !== null) {
          newVals[`r${row}c8`] = String(gs);
          const ete = calcETE(d, gs);
          if (ete !== null) {
            const fuel = calcFuel(ete, lbsPhCruise);
            if (isHold) { applyHold(row, ete, fuel, holdMins); }
            else { newVals[`r${row}c4`] = String(ete); if (fuel !== null) newVals[`r${row}c6`] = String(fuel); }
          }
        }
      }
    }

    // Approach rows with a hold: recompute from params so Solve reflects current hold time
    const holdMinsConst = parseFloat(params.holdTime) || 0;
    for (const row of mainRows) {
      const cellId = `r${row}c0`;
      const aprCount = routeBadges[cellId];
      if (typeof aprCount === 'number' && holdCells[cellId]) {
        const aprEte  = aprCount * (parseFloat(params.approachTime) || 0);
        const aprFuel = aprCount * (parseFloat(params.approachFuel) || 0);
        applyHold(row, aprEte, aprFuel, holdMinsConst);
      }
    }

    // EFR chain: STTO departure fuel = 1100 - leg fuel, then decrement per leg
    const sttoFuel = parseFloat(newSplit['r0c6'] ? newSplit['r0c6'].bottom : newVals['r0c6'] || '');
    let runningEFR = !isNaN(sttoFuel) ? Math.round((parseFloat(params.startFuel) || 1100) - sttoFuel) : NaN;
    let lastTopEFR = NaN;
    if (!isNaN(runningEFR)) {
      newVals['r0c7'] = String(runningEFR);
      lastTopEFR = runningEFR;
      for (let i = 1; i < mainRows.length; i++) {
        const row = mainRows[i];
        const fuelStr = newSplit[`r${row}c6`] ? newSplit[`r${row}c6`].bottom : newVals[`r${row}c6`];
        const legFuel = parseFloat(fuelStr || '');
        if (isNaN(legFuel)) break;
        runningEFR = Math.round(runningEFR - legFuel);
        newVals[`r${row}c7`] = String(runningEFR);
        lastTopEFR = runningEFR;
      }
    }

    // Alternate route table — all cruise, EFR continues from lastTopEFR
    let altRunningEFR = lastTopEFR;
    for (const row of ALT_ROWS) {
      const d = parseFloat(inputValues[`r${row}c3`] || '');
      if (isNaN(d) || d === 0) continue;
      const tc = parseFloat((inputValues[`r${row}c2`] || '').replace(/[^\d.-]/g, ''));
      const gs = calcGS(cruiseTAS, correctedCruiseDIR, cruiseVEL, tc);
      if (gs !== null) {
        newVals[`r${row}c8`] = String(gs);
        const ete = calcETE(d, gs);
        if (ete !== null) {
          newVals[`r${row}c4`] = String(ete);
          const fuel = calcFuel(ete, lbsPhCruise);
          if (fuel !== null) {
            newVals[`r${row}c6`] = String(fuel);
            if (!isNaN(altRunningEFR)) {
              altRunningEFR = Math.round(altRunningEFR - fuel);
              newVals[`r${row}c7`] = String(altRunningEFR);
            }
          }
        }
      }
    }

    setSplitCells(newSplit);
    setInputValues(newVals);
  };

  const fuelDisplay = useMemo(() => {
    const eteCells = Array.from({length: mainRowCount}, (_, i) => `r${i * 2}c4`);
    const totalETE = sumCells(eteCells);
    if (totalETE == null) return '';
    const lbsPh = vfrMode ? parseFloat(clncFields.vfrLbsPh) : parseFloat(clncFields.lbsPhCruise);
    if (isNaN(lbsPh) || lbsPh === 0) return '';
    const efrCells = Array.from({length: mainRowCount}, (_, i) => `r${(mainRowCount - 1 - i) * 2}c7`);
    let finalEFR = null;
    for (const id of efrCells) {
      const v = parseFloat(inputValues[id] || '');
      if (!isNaN(v)) { finalEFR = v; break; }
    }
    if (finalEFR === null) return '';
    return formatEteSum(finalEFR / lbsPh * 60);
  }, [inputValues, clncFields.lbsPhCruise, clncFields.vfrLbsPh, vfrMode, mainRowCount]);

  const timeDisplay = useMemo(() => {
    const t = sumCells(ALT_ROWS.map(r => `r${r}c4`));
    return t != null ? formatEteSum(t) : '';
  }, [inputValues]);

  const fuelPlan = useMemo(() => {
    const approachFuelParam = parseFloat(params.approachFuel) || 0;
    const sttoFuelParam     = parseFloat(params.sttoFuel)     || 0;
    const startFuelParam    = parseFloat(params.startFuel)    || 0;
    const stdReserveParam   = parseFloat(params.stdReserve)   || 0;

    const readCell = (id) => {
      const v = parseFloat((inputValues[id] || '').match(/-?\d+(\.\d+)?/)?.[0]);
      return isNaN(v) ? 0 : v;
    };

    const mainRows = Array.from({length: mainRowCount}, (_, i) => i * 2);
    const totalTopFuel = mainRows.reduce((sum, row) => sum + readCell(`r${row}c6`), 0);
    const totalAltFuel = ALT_ROWS.reduce((sum, row) => sum + readCell(`r${row}c6`), 0);

    let item1, item2, item3;
    if (vfrMode) {
      // APR-checked alt rows → Approaches (item3); T&G stays in Route to Dest (item1)
      const aprFuel = ALT_ROWS.reduce((sum, row) =>
        vfrApr[`r${row}c0`] ? sum + readCell(`r${row}c6`) : sum, 0);
      item1 = totalTopFuel - sttoFuelParam;
      item2 = totalAltFuel - aprFuel;
      item3 = aprFuel;
    } else {
      const totalApproachCount = Object.values(routeBadges)
        .filter(b => typeof b === 'number')
        .reduce((sum, b) => sum + b, 0);
      item1 = totalTopFuel - sttoFuelParam - (totalApproachCount * approachFuelParam);
      item2 = totalAltFuel;
      item3 = approachFuelParam * (1 + totalApproachCount);
    }

    const item4 = item1 + item2 + item3;
    const item5 = Math.max(item4 * 0.1, stdReserveParam);
    const item6 = sttoFuelParam;
    const item7 = item4 + item5 + item6;
    const item8 = startFuelParam;
    const item9 = item8 - item7;

    const fmt = (v) => String(Math.round(v));
    return [
      [fmt(item1), fmt(item6)],
      [fmt(item2), fmt(item7)],
      [fmt(item3), fmt(item8)],
      [fmt(item4), fmt(item9)],
      [fmt(item5), null],
    ];
  }, [inputValues, routeBadges, vfrMode, vfrApr, params, mainRowCount]);

  const handleClear = () => {
    setInputValues(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        // Keep STTO pair (r0c*, r1c*) and fuel plan (fs_*); clear everything else
        if (/^r0c/.test(k) || /^r1c/.test(k) || k.startsWith('fs_')) {
          next[k] = v;
        }
      }
      return next;
    });
    setRouteBadges({});
    setHoldCells({});
    setSplitCells({});
    setVfrTng({});
    setVfrApr({});
    setShowIntClimbSelector(false);
    setIntClimbs([]);
  };

  const capturePreset = (name) => ({
    id: Date.now().toString(),
    name,
    mode: vfrMode ? 'VFR' : 'IFR',
    mainRowCount,
    inputValues: Object.fromEntries(
      Object.entries(inputValues).filter(([k]) => !/c[45678]$/.test(k))
    ),
    clncFields: { ...clncFields },
    routeBadges: { ...routeBadges },
    holdCells: { ...holdCells },
    vfrTng: { ...vfrTng },
    vfrApr: { ...vfrApr },
    selectedAlt,
    depInput,
    destInput,
    infoFields: { ...infoFields },
    intClimbs: [...intClimbs],
  });

  const applyPreset = (preset) => {
    const nextVfrMode = preset.mode === 'VFR';
    const nextVfrTng = preset.vfrTng || {};
    const nextVfrApr = preset.vfrApr || {};

    const startF = parseFloat(params.startFuel) || 0;
    const sttoF = parseFloat(params.sttoFuel) || 0;
    const nextInputValues = { ...(preset.inputValues || {}) };

    // STTO — params don't change on preset load so the STTO effect won't fire
    nextInputValues['r0c4'] = nextVfrMode ? formatVFREte((parseFloat(params.sttoTime) || 0) * 60) : params.sttoTime;
    nextInputValues['r0c6'] = params.sttoFuel;
    nextInputValues['r0c7'] = String(startF - sttoF);

    if (nextVfrMode) {
      // T&G rows
      const tngEte = formatVFREte((parseFloat(params.tngTime) || 5) * 60);
      const tngFuel = String(parseFloat(params.tngFuel) || 25);
      for (const [cellId, isTng] of Object.entries(nextVfrTng)) {
        if (!isTng) continue;
        const match = cellId.match(/^r(\d+)c/);
        if (!match) continue;
        const row = parseInt(match[1]);
        nextInputValues[`r${row}c4`] = tngEte;
        nextInputValues[`r${row}c6`] = tngFuel;
      }

      // APR rows
      const aprEte = String(parseFloat(params.approachTime) || 10);
      const aprFuel = String(parseFloat(params.approachFuel) || 50);
      for (const row of ALT_ROWS) {
        if (nextVfrApr[`r${row}c0`]) {
          nextInputValues[`r${row}c4`] = aprEte;
          nextInputValues[`r${row}c6`] = aprFuel;
        }
      }
    }

    setVfrMode(nextVfrMode);
    setMainRowCount(preset.mainRowCount || 9);
    setInputValues(nextInputValues);
    setClncFields(prev => ({ ...prev, ...(preset.clncFields || {}) }));
    setRouteBadges(preset.routeBadges || {});
    setVfrTng(nextVfrTng);
    setVfrApr(nextVfrApr);
    setSelectedAlt(preset.selectedAlt || 1000);
    setDepInput(preset.depInput || '');
    setDestInput(preset.destInput || '');
    setInfoFields(prev => ({ ...prev, ...(preset.infoFields || {}) }));
    setIntClimbs(preset.intClimbs ?? []);
    setShowIntClimbSelector(false);
    setSplitCells({});
    setHoldCells(preset.holdCells || {});
    setShowPresets(false);
  };

  const saveLocalPreset = (name) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    const allNames = localPresets.map(p => p.name?.toLowerCase());
    if (allNames.includes(trimmed.toLowerCase())) {
      alert(`A preset named "${trimmed}" already exists.`);
      return;
    }
    const preset = capturePreset(trimmed);
    const updated = [...localPresets, preset];
    setLocalPresets(updated);
    localStorage.setItem('tw4_jet_presets', JSON.stringify(updated));
    setPresetName('');
  };

  const deleteLocalPreset = (id) => {
    const updated = localPresets.filter(p => p.id !== id);
    setLocalPresets(updated);
    localStorage.setItem('tw4_jet_presets', JSON.stringify(updated));
  };

  const exportPresetFile = (name) => {
    if (!name.trim()) return;
    const preset = {
      ...capturePreset(name.trim()),
      id: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    };
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preset-${preset.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setPresetName('');
  };

  const renderVFRNotesCells = (top) => (
    <>
      <td rowSpan={2} style={{textAlign: 'center', border: '1px solid black', fontSize: '0.85em', verticalAlign: 'middle', padding: '1px 2px'}}>
        {inputValues[`r${top}c8`] || ''}
      </td>
      <td rowSpan={2} style={{fontSize: '0.75em'}}>
        <input
          value={inputValues[`r${top}c9`] || ''}
          onChange={e => handleInputChange(`r${top}c9`, e.target.value)}
          style={{fontSize: 'inherit'}}
        />
      </td>
    </>
  );

  const renderMainRowPair = (pairIdx) => {
    const top = pairIdx * 2;
    const bot = top + 1;
    const showIntCol = !vfrMode && (showIntClimbSelector || intClimbs.length > 0);
    const ic = intClimbs.find(c => c.row === pairIdx);
    return (
      <React.Fragment key={top}>
        <tr>
          {editRowsMode && (
            <td rowSpan={2} className="edit-minus-cell">
              <button className="delete-row-btn" onClick={() => handleDeletePair(pairIdx)}>⊖</button>
            </td>
          )}
          {vfrMode ? renderVFRCheckCell(`r${top}c0`, vfrTng, setVfrTng, 'T&G', '20px') : renderRouteToCell(`r${top}c0`)}
          {renderCell(`r${top}c1`)}
          {renderCell(`r${top}c2`, 2)}
          {renderCell(`r${top}c3`, 2)}
          {renderCell(`r${top}c4`, 2)}
          {renderCell(`r${top}c5`)}
          {renderCell(`r${top}c6`, 2)}
          {renderCell(`r${top}c7`)}
          {vfrMode ? renderVFRNotesCells(top) : renderCell(`r${top}c8`, 2)}
          {showIntCol && (
            <td rowSpan={2} style={{border: '1px solid black', padding: ic ? 0 : '2px', height: ic ? '1px' : undefined, textAlign: 'center', verticalAlign: 'middle'}}>
              {showIntClimbSelector ? (
                <input type="checkbox"
                  checked={!!ic}
                  onChange={() => {
                    if (ic) {
                      setIntClimbs(prev => prev.filter(c => c.row !== pairIdx));
                    } else {
                      setIntClimbs(prev => [...prev, { row: pairIdx, elev: '', alt: selectedAlt }]);
                    }
                    setShowIntClimbSelector(false);
                  }}
                />
              ) : ic ? (
                <div style={{display: 'flex', flexDirection: 'column', height: '100%', fontSize: '0.65em'}}>
                  <div style={{flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', padding: '0 3px'}}>
                    <input placeholder="Field elev." value={ic.elev}
                      onChange={e => setIntClimbs(prev => prev.map(c => c.row === pairIdx ? {...c, elev: e.target.value} : c))}
                      style={{width: '100%', boxSizing: 'border-box', height: '100%'}} />
                  </div>
                  <div style={{flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', padding: '0 2px'}}>
                    <select value={ic.alt}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        const next = intClimbs.map(c => c.row === pairIdx ? {...c, alt: v} : c);
                        setIntClimbs(next);
                        handleSolve(next);
                      }}
                      style={{fontSize: 'inherit', width: '100%', boxShadow: 'none', height: '100%', padding: '0'}}>
                      {Array.from({length: 31}, (_, i) => (i + 1) * 1000).map(a =>
                        <option key={a} value={a}>{Math.round(a / 1000)}k</option>)}
                    </select>
                  </div>
                </div>
              ) : null}
            </td>
          )}
        </tr>
        <tr>
          {renderCell(`r${bot}c0`)}
          {renderCell(`r${bot}c1`)}
          {renderCell(`r${bot}c2`)}
        </tr>
      </React.Fragment>
    );
  };

  const renderTotalRow = (tTop, tBot, distIds, eteIds, fuelIds, isAlt = false) => (
    <React.Fragment>
      <tr>
        {editRowsMode && <td rowSpan={2} className="edit-minus-cell" />}
        <td rowSpan={2} style={{fontSize: '1.5em', textAlign: 'center', padding: '1px 3px', border: '1px solid black'}}>Total</td>
        {renderCell(`r${tTop}c1`)}
        {renderCell(`r${tTop}c2`, 2)}
        <td id={`r${tTop}c3`} rowSpan={2} style={{textAlign: 'center', border: '1px solid black'}}>
          {sumCells(distIds) ?? ''}
        </td>
        <td id={`r${tTop}c4`} rowSpan={2} style={{textAlign: 'center', border: '1px solid black'}}>
          {vfrMode && !isAlt
            ? (() => { const secs = sumEteSecs(eteIds); return secs != null ? formatVFREta(secs) : ''; })()
            : formatEteSum(sumCells(eteIds))}
        </td>
        {renderCell(`r${tTop}c5`)}
        <td id={`r${tTop}c6`} rowSpan={2} style={{textAlign: 'center', border: '1px solid black'}}>
          {(() => { const s = sumCells(fuelIds); return s != null ? s + '#' : ''; })()}
        </td>
        {renderCell(`r${tTop}c7`)}
        {vfrMode ? <td rowSpan={2} colSpan={2} style={{border: '1px solid black'}} /> : renderCell(`r${tTop}c8`, 2)}
        {!isAlt && !vfrMode && (showIntClimbSelector || intClimbs.length > 0) && (
          <td rowSpan={2} style={{border: '1px solid black'}} />
        )}
      </tr>
      <tr>
        {renderCell(`r${tBot}c0`)}
        {renderCell(`r${tBot}c1`)}
        {renderCell(`r${tBot}c2`)}
      </tr>
    </React.Fragment>
  );

  const renderDivider = (insertAfterPairIdx) => (
    <tr key={`div-${insertAfterPairIdx}`} className="edit-divider-row">
      <td colSpan={20} className="edit-divider-cell" onClick={() => handleInsertAfter(insertAfterPairIdx)}>
        <span className="insert-row-btn">⊕</span>
      </td>
    </tr>
  );

  const mainDataRows = Array.from({length: mainRowCount}, (_, i) => i * 2);
  const mainTotalTop = mainRowCount * 2;
  const mainTotalBot = mainRowCount * 2 + 1;

  const generateFlightPlan = async () => {
    try {
      const { PDFDocument, PDFName, PDFArray, PDFString, StandardFonts, rgb, degrees } = await import('pdf-lib');
      const [pdfBytes, jlBytes] = await Promise.all([
        fetch('/DD-1801.pdf').then(r => r.arrayBuffer()),
        fetch(`/${vfrMode ? 'vfrflightlog' : 'ifrflightlog'}.pdf`).then(r => r.arrayBuffer()),
      ]);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      pdfDoc.context.trailerInfo.Encrypt = undefined;

      // Build field list by walking page annotations directly (bypasses encrypted form API)
      const fieldList = [];
      const ctx = pdfDoc.context;
      for (const page of pdfDoc.getPages()) {
        const annotsRaw = page.node.get(PDFName.of('Annots'));
        if (!annotsRaw) continue;
        let annots;
        try { annots = ctx.lookup(annotsRaw); } catch (_) { continue; }
        if (!annots || typeof annots.size !== 'function') continue;
        for (let i = 0; i < annots.size(); i++) {
          try {
            const annotDict = ctx.lookup(annots.get(i));
            if (!annotDict || typeof annotDict.get !== 'function') continue;
            const subtype = annotDict.get(PDFName.of('Subtype'));
            if (!subtype || subtype.toString() !== '/Widget') continue;
            const ft = annotDict.get(PDFName.of('FT'));
            if (!ft || ft.toString() !== '/Tx') continue;
            const rect = ctx.lookup(annotDict.get(PDFName.of('Rect')));
            if (!rect || typeof rect.get !== 'function') continue;
            const n = (obj) => { const r = ctx.lookup(obj); return typeof r?.asNumber === 'function' ? r.asNumber() : parseFloat(r?.toString() || '0'); };
            const x = n(rect.get(0)), y = n(rect.get(1)), x2 = n(rect.get(2)), y2 = n(rect.get(3));
            fieldList.push({ annotDict, x, y, w: x2 - x, h: y2 - y });
          } catch (_) {}
        }
      }

      const setVal = (entry, text) => {
        try { entry.annotDict.set(PDFName.of('V'), PDFString.of(text)); entry.annotDict.delete(PDFName.of('AP')); } catch (_) {}
      };

      const fillChars = (yLo, yHi, xLo, xHi, text, label) => {
        const cells = fieldList
          .filter(f => f.y >= yLo && f.y <= yHi && f.x >= xLo && f.x <= xHi)
          .sort((a, b) => a.x - b.x);
        if (label) console.log(`fillChars [${label}] matched ${cells.length} cells:`, cells.map(c => ({x: Math.round(c.x), y: Math.round(c.y)})));
        const groups = [];
        let lastX = -999;
        for (const c of cells) {
          if (c.x - lastX > 2) { groups.push([c]); lastX = c.x; }
          else groups[groups.length - 1].push(c);
        }
        for (let i = 0; i < Math.min(groups.length, text.length); i++)
          for (const c of groups[i]) setVal(c, text[i]);
      };

      const fillText = (yLo, yHi, xLo, xHi, text) => {
        for (const f of fieldList.filter(f => f.y >= yLo && f.y <= yHi && f.x >= xLo && f.x <= xHi))
          setVal(f, text);
      };

      // ── Compute values ──────────────────────────────────────────────

      // Speed: leading-0 + cruise TAS  e.g. TAS 230 → "0230"
      const tas = vfrMode
        ? Math.round(parseFloat(clncFields.vfrGsCalc) || 0)
        : Math.round(parseFloat(clncFields.tasCruise) || 0);
      const speedStr = 'N0' + String(tas).padStart(3, '0');

      // Level: VFR in vfr mode; A090 for 9,000 ft MSL, FL220 for 22,000 ft MSL
      const levelStr = vfrMode ? 'VFR' : (selectedAlt >= 18000
        ? 'FL' + String(Math.round(selectedAlt / 100)).padStart(3, '0')
        : 'A'  + String(Math.round(selectedAlt / 100)).padStart(3, '0'));

      // Airport codes: first word of each info field
      const code = (s) => (s || '').trim().split(/\s+/)[0].toUpperCase().substring(0, 4);
      const depAirport  = code(infoFields.depElev);
      const destAirport = code(infoFields.destElev);
      const altnAirport = code(infoFields.alternate);

      // Total EET from main route table (minutes → HHMM)
      const mainRowsArr = Array.from({length: mainRowCount}, (_, i) => i * 2);
      // VFR ETE stored as "mm+ss"; IFR stored as plain minutes
      const parseEteMins = (val) => {
        if (!val) return 0;
        const vfrMatch = val.match(/^(\d+)\+(\d{2})$/);
        if (vfrMatch) return parseInt(vfrMatch[1]) + parseInt(vfrMatch[2]) / 60;
        const n = parseFloat(val.match(/-?\d+(\.\d+)?/)?.[0]);
        return isNaN(n) ? 0 : n;
      };
      const totalETE = mainRowsArr.reduce((sum, row) => sum + parseEteMins(inputValues[`r${row}c4`] || ''), 0);
      const eetStr = toHHMM(totalETE);

      // Fuel endurance = total ETE + remaining fuel time (EFR ÷ lbs/hr)
      const lbsPh = vfrMode ? (parseFloat(clncFields.vfrLbsPh) || 0) : (parseFloat(clncFields.lbsPhCruise) || 0);
      let finalEFR = 0;
      for (let i = mainRowCount - 1; i >= 0; i--) {
        const v = parseFloat(inputValues[`r${i * 2}c7`] || '');
        if (!isNaN(v)) { finalEFR = v; break; }
      }
      const reserveMins = lbsPh > 0 ? finalEFR / lbsPh * 60 : 0;
      const fuelStr = toHHMM(totalETE + reserveMins);

      // Route string (Block 15c)
      const mm = (mins) => String(Math.round(mins)).padStart(2, '0');
      const routeParts = [];
      if (vfrMode) {
        const hasNums = (s) => /\d/.test(s);
        const vfrDest = destInput.trim().toUpperCase();
        // Find last non-T&G pairIdx that has a code (to check against destination)
        let lastNonTngIdx = -1;
        for (let pairIdx = 0; pairIdx < mainRowCount; pairIdx++) {
          const top = pairIdx * 2;
          const cellId = `r${top}c0`;
          const code = ((inputValues[`${cellId}_a`] || '') || (inputValues[`${cellId}_b`] || '')).trim();
          if (code && !vfrTng[cellId]) lastNonTngIdx = pairIdx;
        }
        let prevCode = null;
        for (let pairIdx = 0; pairIdx < mainRowCount; pairIdx++) {
          const top = pairIdx * 2;
          const cellId = `r${top}c0`;
          const aCode = (inputValues[`${cellId}_a`] || '').trim();
          const bCode = (inputValues[`${cellId}_b`] || '').trim();
          const code = aCode || bCode;
          const isTng = !!vfrTng[cellId];
          if (!code && !isTng) continue;
          // Skip last waypoint if it matches the destination
          if (!isTng && pairIdx === lastNonTngIdx && code.toUpperCase() === vfrDest) continue;
          if (isTng) {
            // Append T&G time suffix to the previous waypoint entry
            const suffix = `/D00+${mm(parseFloat(params.tngTime) || 5)}`;
            if (routeParts.length > 0) {
              routeParts[routeParts.length - 1] += suffix;
            }
          } else if (prevCode !== null && hasNums(prevCode) && hasNums(code)) {
            routeParts.push(code);
            prevCode = code;
          } else {
            routeParts.push(`DCT  ${code}`);
            prevCode = code;
          }
        }
      } else {
        const ifrDest = destInput.trim().toUpperCase();
        // Find last non-approach pairIdx with a botVal (to check against destination)
        let lastNonAprIdx = -1;
        for (let pairIdx = 0; pairIdx < mainRowCount; pairIdx++) {
          const top = pairIdx * 2;
          const cellId = `r${top}c0`;
          const botVal = (inputValues[`${cellId}_b`] || '').trim();
          if (botVal && typeof routeBadges[cellId] !== 'number') lastNonAprIdx = pairIdx;
        }
        // Collect entries first so consecutive same-route legs can be collapsed
        const ifrEntries = [];
        for (let pairIdx = 0; pairIdx < mainRowCount; pairIdx++) {
          const top = pairIdx * 2;
          const cellId = `r${top}c0`;
          const topVal = (inputValues[`${cellId}_a`] || '').trim();
          const botVal = (inputValues[`${cellId}_b`] || '').trim();
          const badge = routeBadges[cellId];
          const isApproach = typeof badge === 'number';
          const isHold = !!holdCells[cellId];
          const isDirect = !topVal || topVal === 'D→';
          if (isApproach) {
            const field = topVal && topVal !== 'D→' ? topVal : botVal;
            if (!field) continue;
            const eteMins = Math.round(parseFloat(inputValues[`r${top}c4`] || '') || 0);
            ifrEntries.push({ kind: 'approach', text: `DCT  ${field}/D00+${mm(eteMins)}` });
          } else {
            if (!botVal) continue;
            // Skip last waypoint if it matches the destination
            if (pairIdx === lastNonAprIdx && botVal.toUpperCase() === ifrDest) continue;
            const holdSuffix = isHold ? `/D00+${mm(parseFloat(params.holdTime) || 0)}` : '';
            ifrEntries.push({ kind: 'route', topVal, botVal, isDirect, isHold, holdSuffix });
          }
        }
        // Emit entries; collapse consecutive named-route legs sharing the same route to only the final destination
        let ei = 0;
        while (ei < ifrEntries.length) {
          const e = ifrEntries[ei];
          if (e.kind === 'approach') {
            routeParts.push(e.text);
            ei++;
          } else if (!e.isDirect && !e.isHold && e.topVal) {
            // Named route — scan ahead for consecutive legs on the same route
            let ej = ei + 1;
            while (ej < ifrEntries.length &&
                   ifrEntries[ej].kind === 'route' &&
                   !ifrEntries[ej].isDirect &&
                   !ifrEntries[ej].isHold &&
                   ifrEntries[ej].topVal === e.topVal) {
              ej++;
            }
            const last = ifrEntries[ej - 1];
            routeParts.push(`${e.topVal}  ${last.botVal}${last.holdSuffix}`);
            ei = ej;
          } else {
            routeParts.push(e.isDirect ? `DCT  ${e.botVal}${e.holdSuffix}` : `${e.topVal}  ${e.botVal}${e.holdSuffix}`);
            ei++;
          }
        }
      }
      routeParts.push('DCT');
      // Split route across two PDF lines; line 1 holds ~66 chars based on field width
      const LINE1_LIMIT = 66;
      const line1Parts = [], line2Parts = [];
      let line1Len = 0;
      for (const part of routeParts) {
        const addLen = (line1Parts.length > 0 ? 2 : 0) + part.length;
        if (line2Parts.length === 0 && line1Len + addLen <= LINE1_LIMIT) {
          line1Parts.push(part);
          line1Len += addLen;
        } else {
          line2Parts.push(part);
        }
      }
      const routeLine1 = line1Parts.join('  ');
      const routeLine2 = line2Parts.join('  ');

      // Other information string (Block 18)
      const now = new Date();
      const dof = String(now.getFullYear()).slice(2)
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0');
      const sep = '   '; // triple space
      const dleEntries = [];
      const apEntries = [];
      for (let pairIdx = 0; pairIdx < mainRowCount; pairIdx++) {
        const top = pairIdx * 2;
        const cellId = `r${top}c0`;
        const badge = routeBadges[cellId];
        const topVal = (inputValues[`${cellId}_a`] || '').trim();
        const botVal = (inputValues[`${cellId}_b`] || '').trim();
        if (holdCells[cellId] && botVal) {
          const hMins = Math.round(parseFloat(params.holdTime) || 0);
          dleEntries.push(`DLE/${botVal}${toHHMM(hMins)}`);
        }
        if (typeof badge === 'number' && badge > 0) {
          const field = topVal && topVal !== 'D→' ? topVal : botVal;
          if (field) apEntries.push(`${badge > 1 ? 'MULTIPLE APP' : 'APP'} ${field}`);
        }
      }
      const otherParts = ['PBN/B2C2D2S1', 'SUR/260B', `DOF/${dof}`, ...dleEntries, 'REG/166000', 'OPR/DOD'];
      if (apEntries.length > 0) otherParts.push(`RMK/REQUEST ${apEntries.join(' ')}`);
      const OTHER_LIMIT = 110;
      const other1Parts = [], other2Parts = [];
      let other1Len = 0;
      for (const part of otherParts) {
        const addLen = (other1Parts.length > 0 ? 3 : 0) + part.length;
        if (other2Parts.length === 0 && other1Len + addLen <= OTHER_LIMIT) {
          other1Parts.push(part);
          other1Len += addLen;
        } else {
          other2Parts.push(part);
        }
      }
      const otherLine1 = other1Parts.join(sep);
      const otherLine2 = other2Parts.join(sep);

      // ── Fill fields ─────────────────────────────────────────────────
      // Positions derived from raw PDF rect analysis (y = distance from bottom of page)

      // 8 Flight rules (I = IFR, V = VFR) — block 8, first cell of second char group at y≈671
      fillChars(610, 640, 405, 415, vfrMode ? 'V' : 'I');

      // 15a Speed
      fillChars(555, 578, 35, 110, speedStr);
      // 15b Level
      fillChars(555, 578, 135, 212, levelStr);
      // 13 Departure ICAO — logged so we can verify the match
      fillChars(580, 607, 35, 220, depAirport, 'DEP');
      // 16a Destination ICAO
      fillChars(416, 436, 92, 154, destAirport);
      // 16b Total EET
      fillChars(416, 436, 207, 269, eetStr);
      // 16c ALTN aerodrome
      fillChars(416, 436, 336, 399, altnAirport);
      // 15c Route line 1 (right of Level field)
      fillText(555, 578, 220, 600, routeLine1);
      // 15c Route line 2 (continuation line below)
      fillText(530, 553, 15, 600, routeLine2);
      // 18 Other information line 1
      fillText(387, 410, 35, 600, otherLine1);
      // 18 Other information line 2
      fillText(362, 385, 15, 600, otherLine2);
      // 19a Endurance
      fillText(212, 232, 62, 138, fuelStr);

      // ── Jet Log page ─────────────────────────────────────────────────
      const jlTemplateDoc = await PDFDocument.load(jlBytes);
      const [jlTemplatePage] = await pdfDoc.copyPages(jlTemplateDoc, [0]);
      pdfDoc.addPage(jlTemplatePage);
      const jlPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
      const jlFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Set DEBUG_COORDS = true to overlay red dots at every text anchor for calibration.
      // Generate the PDF, open page 2, compare dot positions to the blank form's fields,
      // then update the coordinate constants below and set DEBUG_COORDS = false.
      // DEBUG_COORDS = true: draws a green grid every 100 pt in VISUAL coordinates
      // (readable right-side-up in the landscape view) plus red/blue dots at each anchor.
      // Read coordinates off the grid, update the constants below, then set to false.
      const DEBUG_COORDS = false;

      // Page dimensions and rotation of the copied template page
      const jlW = jlPage.getWidth();   // PDF stored width  (612 for this form)
      const jlH = jlPage.getHeight();  // PDF stored height (792 for this form)
      const jlRot = jlPage.getRotation().angle; // 270 for this form
      console.log(`Jet log template: W=${jlW} H=${jlH} Rot=${jlRot}`);

      // Visual landscape dimensions after applying the page rotation
      const visW = (jlRot === 90 || jlRot === 270) ? jlH : jlW; // 792
      const visH = (jlRot === 90 || jlRot === 270) ? jlW : jlH; // 612

      // Transform from VISUAL coords (vx: 0=left, vy: 0=bottom of landscape display)
      // to PDF user-space coords.  Derived from Rot=270 corner analysis:
      //   visual(0,0)=bottom-left → PDF(0,792), visual(792,612)=top-right → PDF(612,0)
      const toP = (vx, vy) => {
        switch (jlRot) {
          case 270: return { x: vy,        y: jlH - vx };
          case 90:  return { x: jlW - vy,  y: vx       };
          case 180: return { x: jlW - vx,  y: jlH - vy };
          default:  return { x: vx,        y: vy        };
        }
      };

      // Text rotation so characters appear readable in the landscape display.
      // For Rot=270: normalRot=270 (baseline runs in visual +x = rightward).
      // flippedRot=90 produces upside-down text (fuel plan section).
      const normalRot  = jlRot;
      const flippedRot = (jlRot + 180) % 360;

      if (DEBUG_COORDS) {
        // Green grid every 100 pt in VISUAL coordinates — labels are readable right-side-up
        for (let gx = 100; gx < visW; gx += 100) {
          const p1 = toP(gx, 0); const p2 = toP(gx, visH);
          jlPage.drawLine({ start: p1, end: p2, thickness: 0.3, color: rgb(0, 0.7, 0) });
          const lp = toP(gx + 2, 6);
          jlPage.drawText(String(gx), { x: lp.x, y: lp.y, size: 5, font: jlFont, color: rgb(0, 0.6, 0), rotate: degrees(normalRot) });
        }
        for (let gy = 100; gy < visH; gy += 100) {
          const p1 = toP(0, gy); const p2 = toP(visW, gy);
          jlPage.drawLine({ start: p1, end: p2, thickness: 0.3, color: rgb(0, 0.7, 0) });
          const lp = toP(6, gy + 2);
          jlPage.drawText(String(gy), { x: lp.x, y: lp.y, size: 5, font: jlFont, color: rgb(0, 0.6, 0), rotate: degrees(normalRot) });
        }
        // Corner: red dot at visual bottom-left (0,0), blue at visual top-right
        const bl = toP(5, 5);
        jlPage.drawCircle({ x: bl.x, y: bl.y, size: 4, color: rgb(1, 0, 0) });
        const tr = toP(visW - 5, visH - 5);
        jlPage.drawCircle({ x: tr.x, y: tr.y, size: 4, color: rgb(0, 0.3, 1) });
      }

      const toWinAnsi = (s) => s
        .replace(/→/g, ' ->').replace(/←/g, '<-').replace(/↑/g, '^').replace(/↓/g, 'v')
        .replace(/[^\x00-\xFF]/g, '?');

      // All coordinates in draw/drawFlipped are VISUAL coordinates:
      //   vx: 0 = left edge of landscape page, increases rightward
      //   vy: 0 = bottom edge, increases upward
      // These match the green grid labels you see in the generated PDF.
      const draw = (vx, vy, text, size = 7) => {
        const str = toWinAnsi((text == null ? '' : String(text)).trim());
        const { x, y } = toP(vx, vy);
        if (str) jlPage.drawText(str, { x, y, size, font: jlFont, color: rgb(0, 0, 0), rotate: degrees(normalRot) });
        if (DEBUG_COORDS) jlPage.drawCircle({ x, y, size: 1.5, color: rgb(1, 0, 0) });
      };
      // drawFreq: like draw, but splits "xxx/yyy" onto two lines in VFR mode.
      const drawFreq = (vx, vy, text, size = 7, diff = 3) => {
        if (vfrMode && text && text.includes('/')) {
          const slashIdx = text.indexOf('/');
          draw(vx, vy + diff, text.slice(0, slashIdx).trim(), size);
          draw(vx, vy - diff, text.slice(slashIdx + 1).trim(), size);
        } else {
          draw(vx, vy, text, size);
        }
      };
      // drawFlipped: upside-down text for sections printed inverted on the blank form.
      // vx,vy is the visual RIGHT edge of the value (text extends visually leftward).
      // Blue dots in debug mode.
      const drawFlipped = (vx, vy, text, size = 10) => {
        const str = toWinAnsi((text == null ? '' : String(text)).trim());
        const { x, y } = toP(vx, vy);
        if (str) jlPage.drawText(str, { x, y, size, font: jlFont, color: rgb(0, 0, 0), rotate: degrees(flippedRot) });
        if (DEBUG_COORDS) jlPage.drawCircle({ x, y, size: 1.5, color: rgb(0, 0.3, 1) });
      };

      const iv = (id) => (inputValues[id] || '').trim();
      const sc = (id) => splitCells[id];

      // ── Coordinate constants (VISUAL landscape coords) ──────────────────
      // vx: 0 = left edge of landscape page, increases rightward  (max ≈ 792)
      // vy: 0 = bottom edge, increases upward                     (max ≈ 612)
      // Read values directly off the green grid labels.
      // IFR form layout:
      //   Left half  (vx 0–390):  header/info, clearance block, fuel plan (bottom, upside-down)
      //   Right half (vx 390–780): main flight log table (normal orientation)

      const IFR_C = {
        //Above table text
        tabletopY: 583, altSelX: 710, routeHeaderX: 420,
        // -- Left half: header rows (departure, destination, alternate) --
        // Section y=575-475; three airport-info rows at ~31pt pitch
        row1Y: 566, row2Y: 473, row3Y: 186, altRow2Y: 165,
        depX: 427,     clncDelX: 510, gndContX: 595, towerX: 685,
        destX: 435,    destApcX: 510, destTwrX: 595, destGndX: 697,
        altX: 425,     altApcX: 535,  altTwrX: 620,  altGndX: 685,
        altElevX: 460, altLevelX: 640,
        altRouteX: 535, altFuelX: 685, altTimeX: 723,
        // -- Clearance / performance block --
        clnc1Y: 515, clnc2Y: 503, clnc3Y: 490, clncWindY: 497,
        ttcX: 420,
        tasClimbX: 630, lbsPhClimbX: 715,
        climbWindX: 705, deltaTX: 697, oatX: 725,
        // -- Main flight log table (x=410-760, y=575-25) --
        mainFirstRowY: 445, mainRowPitch: 24,
        routeTopX: 420,
        identX: 480, cusX: 511, distX: 543, eteX: 570, etaX: 603, fuelX: 622, efrX: 655, gsX: 685,
        // -- Alternate route table (y=170-25) --
        altFirstRowY: 162, altRowPitch: 26,
        totDistX: 543, totEteX: 573, totFuelX: 625,
        // -- Fuel plan (UPSIDE DOWN — drawFlipped) --
        fpStartY: 50, fpPitch: 20, fpLeftX: 250, fpRightX: 55,
      };

      const VFR_C = {
        row1Y: 572, row2Y: 480, row3Y: 133, altRow2Y: 122,
        depX: 90,  clncDelX: 182, gndContX: 264, towerX: 340,
        destX: 80, destApcX: 165, destTwrX: 253, destGndX: 335,
        altX: 95,  altApcX: 180,  altTwrX: 260,  altGndX: 355,
        altElevX: 90, altLevelX: 260,
        altRouteX: 175, altFuelX: 330, altTimeX: 372,
        clnc1Y: 555, clnc2Y: 540, clnc3Y: 524, clnc4Y: 508, clncWindY: 446,
        altSelX: 18, gsCalcX: 280, lbsPhX: 375,
        atisX: 80, windAtAltX: 150,
        clnc1aX: 50, clnc1bX: 225, clnc2aX: 50, clnc2bX: 225,
        clnc3aX: 50, clnc3bX: 225, clnc4aX: 50, clnc4bX: 225,
        mainFirstRowY: 446, mainRowPitch: 20.5,
        routeTopX: 52,
        identX: 114, cusX: 140, distX: 165, eteX: 188, etaX: 214, fuelX: 245, efrX: 268, notesFuelX: 295, notesUserX: 350,
        altFirstRowY: 115, altRowPitch: 20.5,
        totDistX: 147, totEteX: 177, totFuelX: 229,
        fpStartY: 543, fpPitch: -20, fpLeftX: 510, fpRightX: 680, fpFontSize: 12,
        fpYOffsetsLeft:  [0, -33, -49, -66, -97],
        fpYOffsetsRight: [+14, -17, -33, -50],
      };

      const C = vfrMode ? VFR_C : IFR_C;

      //Altitude and route header
      const routeHeaderStr = [depInput.trim().toUpperCase(), destInput.trim().toUpperCase()].filter(Boolean).join(' -> ');
      if (routeHeaderStr && !vfrMode) draw(C.routeHeaderX, C.tabletopY, routeHeaderStr);
      // ── Header block ────────────────────────────────────────────────
      const freqFont = vfrMode ? 6 : 8;
      const superFreqFont = vfrMode ? 5 : 8;
      draw(C.depX,     C.row1Y, infoFields.depElev);
      drawFreq(C.clncDelX, C.row1Y, infoFields.clncDel, freqFont);
      drawFreq(C.gndContX, C.row1Y, infoFields.gndCont, freqFont);
      drawFreq(C.towerX,   C.row1Y, infoFields.tower, freqFont);

      draw(C.destX,    C.row2Y, infoFields.destElev);
      drawFreq(C.destApcX, C.row2Y, infoFields.destApcCont, freqFont);
      drawFreq(C.destTwrX, C.row2Y, infoFields.destTower, freqFont);
      drawFreq(C.destGndX, C.row2Y, infoFields.destGndCont, freqFont);

      draw(C.altX,     C.row3Y, infoFields.alternate);
      drawFreq(C.altApcX,  C.altRow2Y, infoFields.altApcCont, superFreqFont, 2);
      drawFreq(C.altTwrX,  C.altRow2Y, infoFields.altTower, superFreqFont, 2);
      drawFreq(C.altGndX,  C.altRow2Y, infoFields.altGndCont, superFreqFont, 2);

      // ── Clearance / performance block ────────────────────────────────
      if (vfrMode) {
        draw(C.gsCalcX,    C.clnc1Y + 1, clncFields.vfrGsCalc);
        draw(C.lbsPhX,     C.clnc1Y + 1, clncFields.vfrLbsPh);
        drawFreq(C.atisX,      C.clnc1Y + 4, clncFields.vfrAtis, freqFont);
        draw(C.windAtAltX, C.clnc2Y, clncFields.vfrWindAtAlt);
        draw(C.clnc1aX, C.clnc1Y - 16, clncFields.vfrClnc1a, 8);
        draw(C.clnc1bX, C.clnc1Y - 16, clncFields.vfrClnc1b, 8);
        draw(C.clnc2aX, C.clnc2Y - 16, clncFields.vfrClnc2a, 8);
        draw(C.clnc2bX, C.clnc2Y - 16, clncFields.vfrClnc2b, 8);
        draw(C.clnc3aX, C.clnc3Y - 16, clncFields.vfrClnc3a, 8);
        draw(C.clnc3bX, C.clnc3Y - 16, clncFields.vfrClnc3b, 8);
        draw(C.clnc4aX, C.clnc4Y - 16, clncFields.vfrClnc4a, 8);
        draw(C.clnc4bX, C.clnc4Y - 16, clncFields.vfrClnc4b, 8);
      } else {
        draw(C.altSelX, C.tabletopY, selectedAlt >= 18000
            ? `FL${String(Math.round(selectedAlt / 100)).padStart(3, '0')}`
            : `${selectedAlt.toLocaleString()}' MSL`);
      // Climb/Cruise TAS and LBs PH
        draw(C.tasClimbX, C.row1Y - 15, clncFields.tasClimb    ? `Climb: ${clncFields.tasClimb}`  : '');
        draw(C.tasClimbX, C.row1Y - 22, clncFields.tasCruise    ? `Cruise: ${clncFields.tasCruise}`  : '');
        draw(C.tasClimbX, C.row1Y - 33, clncFields.ias    ? `IAS: ${clncFields.ias}`  : '');
        draw(C.lbsPhClimbX, C.row1Y - 15, clncFields.lbsPhClimb    ? `Climb: ${clncFields.lbsPhClimb}`  : '');
        draw(C.lbsPhClimbX, C.row1Y - 22,clncFields.lbsPhCruise    ? `Cruise: ${clncFields.lbsPhCruise}`  : '');



        draw(C.ttcX,       C.clnc1Y, clncFields.ttc    ? `TTC: ${clncFields.ttc}`  : '');
        draw(C.ttcX,       C.clnc2Y, clncFields.fuel    ? `Fuel: ${clncFields.fuel}`  : '');
        draw(C.ttcX,       C.clnc3Y, clncFields.dist    ? `Dist: ${clncFields.dist}`  : '');
        draw(C.climbWindX,  C.clnc1Y,
          clncFields.climbDir  ? `Climb: ${clncFields.climbDir}/${clncFields.climbVel}`   : '');
        draw(C.climbWindX, C.clnc2Y,
          clncFields.cruiseDir ? `Cruise: ${clncFields.cruiseDir}/${clncFields.cruiseVel}` : '');
        draw(C.deltaTX,    C.clnc3Y, clncFields.deltaT ? `dT: ${clncFields.deltaT}` : '');
        draw(C.oatX,       C.clnc3Y, clncFields.oat    ? `OAT: ${clncFields.oat}`  : '');
      }

      // ── Main route table ─────────────────────────────────────────────
      const drawR = (vx, vy, text, size = 8) => draw(vx, vy, text, size);
      const drawAuto = (vx, vy, text, baseSize = 8) => {
        const len = (text || '').length;
        const size = len > 10 ? baseSize - 3 : len > 8 ? baseSize - 2 : len >= 6 ? baseSize - 1 : baseSize;
        drawR(vx, vy, text, Math.max(4, size));
      };
      for (let pairIdx = 0; pairIdx < mainRowCount; pairIdx++) {
        const topRow   = pairIdx * 2;
        const rowY     = C.mainFirstRowY - pairIdx * C.mainRowPitch;
        const cellCY   = rowY - C.mainRowPitch / 2;
        const splitOff = vfrMode ? Math.round(C.mainRowPitch * 0.2) + 1 : Math.round(C.mainRowPitch * 0.2);

        const routeFrom = pairIdx === 0 ? (iv(`r${topRow}c0_a`) || 'STTO') : iv(`r${topRow}c0_a`);
        const routeTo   = iv(`r${topRow}c0_b`);
        const identStr  = iv(`r${topRow}c1`);
        const identNum  = iv(`r${topRow+1}c0`);


        // ROUTE column
        if (vfrMode) {
          // c0_a is FP code (flight plan only — omit from jet log); c0_b is the place name
          const place = routeTo || (pairIdx === 0 ? 'STTO' : '');
          if (place.length > 10) {
            const sp = place.lastIndexOf(' ', 9);
            const cut = sp > 0 ? sp : 10;
            drawR(C.routeTopX, cellCY + splitOff, place.slice(0, cut));
            drawR(C.routeTopX, cellCY - splitOff, place.slice(cut).trimStart());
          } else {
            drawR(C.routeTopX, cellCY, place);
          }
        } else {
          if (routeTo) {
            drawR(C.routeTopX, cellCY + splitOff, routeFrom);
            drawR(C.routeTopX, cellCY - splitOff, routeTo);
          } else {
            drawR(C.routeTopX, cellCY, routeFrom);
          }
        }

        // Hold / approach indicators in top-right of the route cell
        if (!vfrMode) {
          if (holdCells[`r${topRow}c0`]) drawR(465, rowY - 4, 'H', 7);
          const aprBadge = routeBadges[`r${topRow}c0`];
          if (typeof aprBadge === 'number' && aprBadge > 0) {
            drawR(450, rowY - 4, aprBadge === 1 ? '1 APR' : `${aprBadge} APRS`, 6);
          }
        }

        // IDENT / TO column: two-line when both present, single-line centered otherwise
        if (identStr || identNum) {
          drawR(C.identX, cellCY + splitOff, identStr);
          drawR(C.identX-3, cellCY - splitOff, identNum);
        }

        drawR(C.cusX,  cellCY, iv(`r${topRow}c2`));
        drawR(C.distX, cellCY, iv(`r${topRow}c3`));

        const eteSplit = sc(`r${topRow}c4`);
        if (eteSplit) {
          drawAuto(C.eteX, cellCY + splitOff, eteSplit.top);
          drawAuto(C.eteX, cellCY - splitOff, eteSplit.bottom);
        } else {
          drawAuto(C.eteX, cellCY, iv(`r${topRow}c4`));
        }

        drawR(C.etaX, vfrMode ? cellCY + splitOff : cellCY, iv(`r${topRow}c5`));

        const fuelSplit = sc(`r${topRow}c6`);
        if (fuelSplit) {
          drawAuto(C.fuelX, cellCY + splitOff, fuelSplit.top);
          drawAuto(C.fuelX, cellCY - splitOff, fuelSplit.bottom);
        } else {
          drawAuto(C.fuelX, cellCY, iv(`r${topRow}c6`));
        }

        drawR(C.efrX, cellCY + splitOff, iv(`r${topRow}c7`));

        if (vfrMode) {
          drawR(C.notesFuelX, cellCY, iv(`r${topRow}c8`));
          drawR(C.notesUserX, cellCY, iv(`r${topRow}c9`));
        } else {
          const gsSplit = sc(`r${topRow}c8`);
          if (gsSplit) {
            drawR(C.gsX, cellCY + splitOff, gsSplit.top);
            drawR(C.gsX, cellCY - splitOff, gsSplit.bottom);
          } else {
            drawR(C.gsX, cellCY, iv(`r${topRow}c8`));
          }
          const pdIc = intClimbs.find(c => c.row === pairIdx);
          if (pdIc) {
            const altStr = '-> ' + (pdIc.alt >= 18000
              ? 'FL' + String(Math.round(pdIc.alt / 100)).padStart(3, '0')
              : pdIc.alt.toLocaleString() + "' MSL");
            drawR(710, cellCY, altStr, 7);
          }
        }
      }

      // Main totals row
      const jlMainRows = Array.from({length: mainRowCount}, (_, i) => i * 2);
      const jlTotDist = jlMainRows.reduce((s, r) => {
        const v = parseFloat((inputValues[`r${r}c3`] || '').match(/-?\d+(\.\d+)?/)?.[0]);
        return s + (isNaN(v) ? 0 : v);
      }, 0);
      const jlTotEte = jlMainRows.reduce((s, r) => s + parseEteMins(inputValues[`r${r}c4`] || ''), 0);
      const jlTotFuel = jlMainRows.reduce((s, r) => {
        const v = parseFloat((inputValues[`r${r}c6`] || '').match(/-?\d+(\.\d+)?/)?.[0]);
        return s + (isNaN(v) ? 0 : v);
      }, 0);
      const jlTotY  = vfrMode ?  C.mainFirstRowY - 14* C.mainRowPitch : C.mainFirstRowY - 9 * C.mainRowPitch;
      const jlTotCY = jlTotY - C.mainRowPitch / 2;
      const eteAdjust = vfrMode ? 0:5;
      drawR(C.routeTopX, jlTotCY, 'Total');
      drawR(C.distX,  jlTotCY, jlTotDist > 0 ? String(Math.round(jlTotDist)) : '');
      drawR(C.eteX-eteAdjust,   jlTotCY, jlTotEte  > 0 ? formatEteSum(jlTotEte)        : '');
      drawR(C.fuelX,  jlTotCY, jlTotFuel > 0 ? String(Math.round(jlTotFuel)) : '');

      // ── Alternate route table ─────────────────────────────────────────
      ALT_ROWS.forEach((topRow, altIdx) => {
        const rowY     = C.altFirstRowY - altIdx * C.altRowPitch;
        const cellCY   = rowY - C.altRowPitch / 2;
        const splitOff = Math.round(C.altRowPitch * 0.2);

        const routeFrom = iv(`r${topRow}c0_a`);
        const routeTo   = iv(`r${topRow}c0_b`);
        const identStr  = iv(`r${topRow}c1`);
        const identNum  = iv(`r${topRow+1}c0`);
        const eteAdjust = vfrMode ? 5:0;
        

        // ROUTE column
        if (vfrMode) {
          const place = routeTo;
          if (place.length > 10) {
            const sp = place.lastIndexOf(' ', 9);
            const cut = sp > 0 ? sp : 10;
            drawR(C.routeTopX, cellCY + splitOff, place.slice(0, cut));
            drawR(C.routeTopX, cellCY - splitOff, place.slice(cut).trimStart());
          } else {
            drawR(C.routeTopX, cellCY, place);
          }
        } else {
          if (routeTo) {
            drawR(C.routeTopX, cellCY + splitOff, routeFrom);
            drawR(C.routeTopX, cellCY - splitOff, routeTo);
          } else {
            drawR(C.routeTopX, cellCY, routeFrom);
          }
        }

        // IDENT / TO column: two-line when both present, single-line centered otherwise
        if (identStr || identNum) {
          drawR(C.identX, cellCY + splitOff, identStr);
          drawR(C.identX-3, cellCY - splitOff, identNum);
        }

        drawR(C.cusX,  cellCY, iv(`r${topRow}c2`));
        drawR(C.distX, cellCY, iv(`r${topRow}c3`));
        drawAuto(C.eteX + eteAdjust,  cellCY, iv(`r${topRow}c4`));
        drawR(C.etaX,  vfrMode ? cellCY + splitOff : cellCY, iv(`r${topRow}c5`));
        drawAuto(C.fuelX, cellCY, iv(`r${topRow}c6`));
        drawR(C.efrX,  cellCY + splitOff, iv(`r${topRow}c7`));
        if (vfrMode) {
          drawR(C.notesFuelX, cellCY, iv(`r${topRow}c8`));
          drawR(C.notesUserX, cellCY, iv(`r${topRow}c9`));
        } else {
          drawR(C.gsX, cellCY, iv(`r${topRow}c8`));
        }
      });

      // Alternate totals row
      const jlAltTotDist = ALT_ROWS.reduce((s, r) => {
        const v = parseFloat((inputValues[`r${r}c3`] || '').match(/-?\d+(\.\d+)?/)?.[0]);
        return s + (isNaN(v) ? 0 : v);
      }, 0);
      const jlAltTotEte = ALT_ROWS.reduce((s, r) => s + parseEteMins(inputValues[`r${r}c4`] || ''), 0);
      const jlAltTotFuel = ALT_ROWS.reduce((s, r) => {
        const v = parseFloat((inputValues[`r${r}c6`] || '').match(/-?\d+(\.\d+)?/)?.[0]);
        return s + (isNaN(v) ? 0 : v);
      }, 0);
      const jlAltTotY  = vfrMode ?  C.altFirstRowY - 3 * C.altRowPitch : C.altFirstRowY - 4 * C.altRowPitch;
      const jlAltTotCY = jlAltTotY - C.altRowPitch / 2;
      drawR(C.routeTopX, jlAltTotCY, 'Total');
      drawR(C.distX,  jlAltTotCY, jlAltTotDist > 0 ? String(Math.round(jlAltTotDist)) : '');
      drawR(C.eteX - eteAdjust,   jlAltTotCY, jlAltTotEte  > 0 ? formatEteSum(jlAltTotEte)         : '');
      drawR(C.fuelX,  jlAltTotCY, jlAltTotFuel > 0 ? String(Math.round(jlAltTotFuel)) : '');

      // ── Alternate header summary (elev/level on row3Y; route/fuel/time on row3Y-21) ──
      draw(C.altElevX,  C.altRow2Y,      infoFields.altElev);
      if (iv('altalt'))   draw(C.altLevelX, C.row3Y, iv('altalt'));
      if (iv('altroute')) draw(C.altRouteX, C.row3Y, iv('altroute'));
      if (fuelDisplay) draw(C.altFuelX, C.row3Y, fuelDisplay);
      if (jlAltTotEte > 0)  draw(C.altTimeX, C.row3Y, formatEteSum(jlAltTotEte));

      // ── Fuel plan (9 rows: 5 left, 4 right) ───────────────────────────
      fuelPlan.forEach(([leftVal, rightVal], i) => {
        const fyLeft  = C.fpStartY + (C.fpYOffsetsLeft  ? C.fpYOffsetsLeft[i]  : i * C.fpPitch);
        const fyRight = C.fpStartY + (C.fpYOffsetsRight ? C.fpYOffsetsRight[i] : i * C.fpPitch);
        const fpSize = C.fpFontSize || 7;
        if (vfrMode) {
          draw(C.fpLeftX,  fyLeft,  leftVal, fpSize);
          if (rightVal !== null) draw(C.fpRightX, fyRight, rightVal, fpSize);
        } else {
          drawFlipped(C.fpLeftX,  fyLeft, leftVal);
          if (rightVal !== null) drawFlipped(C.fpRightX, fyLeft, rightVal);
        }
      });

      // ── Save and display ─────────────────────────────────────────────
      const filled = await pdfDoc.save();
      const blob = new Blob([filled], { type: 'application/pdf' });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Failed to generate flight plan:', err);
    }
  };

  const handleKeyNav = (e) => {
    const { key } = e;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
    if (e.target.tagName !== 'INPUT') return;
    e.preventDefault();

    const allInputs = Array.from(e.currentTarget.querySelectorAll('input'));
    const current = e.target;
    const cr = current.getBoundingClientRect();
    const cx = (cr.left + cr.right) / 2;
    const cy = (cr.top  + cr.bottom) / 2;

    let best = null;
    let bestScore = Infinity;

    for (const inp of allInputs) {
      if (inp === current) continue;
      const r = inp.getBoundingClientRect();
      const rx = (r.left + r.right) / 2;
      const ry = (r.top  + r.bottom) / 2;
      const dx = rx - cx;
      const dy = ry - cy;
      let score;
      if      (key === 'ArrowUp'    && dy < -2)  score = (-dy) + Math.abs(dx) * 3;
      else if (key === 'ArrowDown'  && dy >  2)  score =   dy  + Math.abs(dx) * 3;
      else if (key === 'ArrowLeft'  && dx < 0)   score = (-dx) + Math.abs(dy) * 10;
      else if (key === 'ArrowRight' && dx > 0)   score =   dx  + Math.abs(dy) * 10;
      else continue;
      if (score < bestScore) { bestScore = score; best = inp; }
    }

    if (best) { best.focus(); best.select(); }
  };

  return (
    <div className="jetlog-container" ref={containerRef} onKeyDown={handleKeyNav}>
      {pdfUrl ? (
        <>
          <div style={{fontSize: '0.75em', color: '#e93333', textAlign: 'center', marginBottom: '2px', fontWeight: 'bold'}}>
            ROUTE MAY BE MORE VERBOSE THAN NECESSARY. MAKE ROUTE AS CONCISE AS POSSIBLE!
          </div>
          <div style={{textAlign: 'center', padding: '8px 0', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <button onClick={() => setPdfUrl(prev => { URL.revokeObjectURL(prev); return null; })}>← Return to Jet Log</button>
            <a href={pdfUrl} download="DD-1801.pdf" target="_blank" rel="noreferrer" style={{display: 'inline-block', padding: '4px 10px', background: '#e8e8e8', border: '1px solid #999', borderRadius: '3px', color: '#000', textDecoration: 'none', fontSize: '0.9em', cursor: 'pointer'}}>Open / Download PDF</a>
          </div>
          {jetlogScale >= 1 && (
            <iframe src={pdfUrl} style={{width: '100%', height: 'calc(100vh - 50px)', border: 'none', display: 'block'}} title="DD-1801 Flight Plan" />
          )}
        </>
      ) : (
      <>
      <div style={{fontSize: '0.68em', color: '#888', textAlign: 'center', marginBottom: '2px'}}>
        {vfrMode
          ? 'Input GS and Dist for each leg; check T&G/APR boxes as appropriate; and click Solve. Lbs/hr is auto calculated from GS for standard day sea level — if a different condition is desired, enter it manually. The "FP code" box should contain the radial-DME or lat/long definition of points as they will be written on the flight plan.'
          : 'Check that the Jet Log Parameters are set as you like. Input winds, ΔT, altitude, and OAT; MC and Dist for legs; mark approaches and holds as appropriate; and click solve. Input total distance into the DIST cell, the solver will split it into climb and cruise dist.'}
      </div>
      <div className="button-container" style={{justifyContent: 'center'}}>
        <button onClick={() => handleSolve()}>Solve</button>
        <button onClick={handleClear}>Clear</button>
        <button onClick={() => setEditRowsMode(prev => !prev)}>
          {editRowsMode ? 'Done' : 'Edit Rows'}
        </button>
        {!vfrMode && (
          <button onClick={() => setShowIntClimbSelector(prev => !prev)}>
            {showIntClimbSelector ? 'Done' : intClimbs.length > 0 ? `Int. Climbs (${intClimbs.length})` : 'Add Int. Climb'}
          </button>
        )}
        <button onClick={() => setShowParams(true)}>Parameters</button>
        <button onClick={() => setShowPresets(s => !s)}>Preset Routes</button>
        <button onClick={generateFlightPlan}>Generate Flight Plan + Jet Log</button>
        <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', cursor: 'pointer'}}
          onClick={() => { setVfrMode(m => { const next = !m; const newAlt = next ? 3000 : 1000; setSelectedAlt(newAlt); if (next) autoFillVFRCruise(clncFields.vfrGsCalc); return next; }); }}
        >
          <span style={{color: !vfrMode ? '#1e40af' : '#aaa', transition: 'color 0.2s'}}>IFR</span>
          <div style={{position: 'relative', width: '44px', height: '22px', backgroundColor: vfrMode ? '#1e40af' : '#888', borderRadius: '11px', transition: 'background-color 0.2s', flexShrink: 0}}>
            <div style={{position: 'absolute', top: '2px', left: vfrMode ? '24px' : '2px', width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'}} />
          </div>
          <span style={{color: vfrMode ? '#1e40af' : '#aaa', transition: 'color 0.2s'}}>VFR</span>
        </div>
      </div>

      <div className="jetlog-wrapper" style={jetlogScale < 1 ? {zoom: jetlogScale} : undefined}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
          <input type="text" value={depInput} onChange={e => { const v = e.target.value; setDepInput(v); const match = airports.find(ap => ap.airport.toUpperCase() === v.trim().toUpperCase()); if (match) selectAirport(match, 'dep'); }} style={{width: '70px', border: '1px solid #999', borderRadius: '3px', padding: '2px 4px', fontSize: '0.85em', backgroundColor: '#f4f4f4'}} />
          <span style={{fontSize: '1.1em'}}>→</span>
          <input type="text" value={destInput} onChange={e => { const v = e.target.value; setDestInput(v); const match = airports.find(ap => ap.airport.toUpperCase() === v.trim().toUpperCase()); if (match) selectAirport(match, 'dest'); }} style={{width: '70px', border: '1px solid #999', borderRadius: '3px', padding: '2px 4px', fontSize: '0.85em', backgroundColor: '#f4f4f4'}} />
        </div>
        <span style={{fontWeight: 'bold', fontSize: '0.85em'}}>FLIGHT LOG</span>
        <select value={selectedAlt} onChange={e => { const v = parseInt(e.target.value); setSelectedAlt(v); if (clncFields.deltaT) autoFillTTC(clncFields.deltaT, v, infoFields.depElev); if (clncFields.oat) autoFillCruise(clncFields.oat, v); if (vfrMode) autoFillVFRCruise(clncFields.vfrGsCalc); }} style={{fontSize: '0.8em', padding: '2px 4px', border: '1px solid #999', borderRadius: '3px', backgroundColor: '#f4f4f4'}}>
          {vfrMode ? (
            Array.from({length: 6}, (_, i) => 2000 + i * 500).map(alt => (
              <option key={alt} value={alt}>{alt.toLocaleString()}' AGL</option>
            ))
          ) : (
            <>
              {Array.from({length: 17}, (_, i) => (i + 1) * 1000).map(alt => (
                <option key={alt} value={alt}>{alt.toLocaleString()}' MSL</option>
              ))}
              {Array.from({length: 14}, (_, i) => 180 + i * 10).map(fl => (
                <option key={fl} value={fl * 100}>FL{fl}</option>
              ))}
            </>
          )}
        </select>
      </div>
      <table className="jetlog-info-table">
        <tbody>
          <tr>
            <td style={{position: 'relative'}}>
              <span className="info-label">DEP ELEV</span>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <input type="text" value={infoFields.depElev} onChange={e => { const v = e.target.value; const match = airports.find(ap => ap.airport.toUpperCase() === v.trim().toUpperCase()); if (match) { selectAirport(match, 'dep'); } else { setInfoField('depElev', v); if (clncFields.deltaT) autoFillTTC(clncFields.deltaT, selectedAlt, v); if (vfrMode) autoFillVFRCruise(clncFields.vfrGsCalc); } }} style={{flex: 1}} />
                <span onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'dep' ? null : 'dep'); }} style={{cursor: 'pointer', padding: '0 2px', userSelect: 'none'}}>▾</span>
              </div>
              {renderAirportDropdown('dep')}
            </td>
            {renderFreqCell('clncDel', 'CLNC DEL')}
            {renderFreqCell('gndCont', 'GND CONT')}
            {renderFreqCell('tower', 'TOWER')}
          </tr>
          {vfrMode ? (
            <tr>
              <td style={{verticalAlign: 'top'}}>
                <span className="info-label">ATIS</span>
                {renderFreqInput(clncFields.vfrAtis || '', e => setClncFields(prev => ({...prev, vfrAtis: e.target.value})))}
              </td>
              <td style={{verticalAlign: 'top'}}><span className="info-label">WIND AT ALT</span><input type="text" value={clncFields.vfrWindAtAlt} onChange={e => setClncFields(prev => ({...prev, vfrWindAtAlt: e.target.value}))} /></td>
              <td style={{verticalAlign: 'top'}}>
                <span className="info-label">TAS</span>
                <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '3px', marginTop: '2px'}}>
                  <span className="info-label" style={{whiteSpace: 'nowrap'}}>GS:</span>
                  <input type="text" style={{width: '42px'}} value={clncFields.vfrGsCalc} onChange={e => { const v = e.target.value; setClncFields(prev => ({...prev, vfrGsCalc: v})); autoFillVFRCruise(v); }} />
                </div>
              </td>
              <td style={{verticalAlign: 'top'}}>
                <span className="info-label">LBS PH</span>
                <input type="text" value={clncFields.vfrLbsPh} onChange={e => setClncFields(prev => ({...prev, vfrLbsPh: e.target.value}))} />
              </td>
            </tr>
          ) : (
            <tr>
              <td style={{verticalAlign: 'top'}}><span className="info-label">ALT CORR</span><input type="text" /></td>
              <td style={{verticalAlign: 'top'}}><span className="info-label">TIME OFF</span><input type="text" /></td>
              <td style={{verticalAlign: 'top'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <span className="info-label">TAS</span>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Climb:</span><input type="text" style={{width: '40px'}} value={clncFields.tasClimb} onChange={e => setClncFields(prev => ({...prev, tasClimb: e.target.value}))} /></div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Cruise:</span><input type="text" style={{width: '40px'}} value={clncFields.tasCruise} onChange={e => setClncFields(prev => ({...prev, tasCruise: e.target.value}))} /></div>
                  </div>
                </div>
              </td>
              <td style={{verticalAlign: 'top'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <span className="info-label">LBS PH</span>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Climb:</span><input type="text" style={{width: '40px'}} value={clncFields.lbsPhClimb} onChange={e => setClncFields(prev => ({...prev, lbsPhClimb: e.target.value}))} /></div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Cruise:</span><input type="text" style={{width: '40px'}} value={clncFields.lbsPhCruise} onChange={e => setClncFields(prev => ({...prev, lbsPhCruise: e.target.value}))} /></div>
                  </div>
                </div>
              </td>
            </tr>
          )}
          {vfrMode ? (
            <tr>
              <td colSpan={4} style={{height: '48px', verticalAlign: 'top'}}>
                <span className="info-label">CLEARANCE</span>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', padding: '2px', height: 'calc(100% - 14px)'}}>
                  {['1a','1b','2a','2b','3a','3b','4a','4b'].map(k => (
                    <input key={k} type="text" value={clncFields[`vfrClnc${k}`] || ''} onChange={e => setClncFields(prev => ({...prev, [`vfrClnc${k}`]: e.target.value}))} />
                  ))}
                </div>
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={4} style={{height: '48px', verticalAlign: 'top'}}>
                <div style={{display: 'flex', gap: '4px', marginTop: '2px', alignItems: 'stretch'}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1px'}}>
                    <span className="info-label">CLEARANCE</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>TTC:</span><input type="text" style={{width: '40px'}} value={clncFields.ttc} onChange={e => setClncFields(prev => ({...prev, ttc: e.target.value}))} /></div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Fuel:</span><input type="text" style={{width: '40px'}} value={clncFields.fuel} onChange={e => setClncFields(prev => ({...prev, fuel: e.target.value}))} /></div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Dist:</span><input type="text" style={{width: '40px'}} value={clncFields.dist} onChange={e => setClncFields(prev => ({...prev, dist: e.target.value}))} /></div>
                  </div>
                  <div style={{flex: 1, alignSelf: 'stretch'}} />
                  <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1px', paddingBottom: '45px', paddingRight: '28px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>IAS:</span><input type="text" style={{width: '36px'}} value={clncFields.ias} onChange={e => setClncFields(prev => ({...prev, ias: e.target.value}))} /></div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1px', paddingTop: '10px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><input type="text" placeholder="MAG VAR" className="magvar-input" style={{width: '30px', fontSize: '0.7em', textAlign: 'center'}} value={clncFields.magVar} onChange={e => setClncFields(prev => ({...prev, magVar: e.target.value}))} /><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Climb:</span><input type="text" placeholder="DIR" style={{width: '28px', backgroundColor: !clncFields.climbDir ? '#dbeafe' : ''}} value={clncFields.climbDir} onChange={e => setClncFields(prev => ({...prev, climbDir: e.target.value}))} /><input type="text" placeholder="VEL" style={{width: '28px', backgroundColor: !clncFields.climbVel ? '#dbeafe' : ''}} value={clncFields.climbVel} onChange={e => setClncFields(prev => ({...prev, climbVel: e.target.value}))} /></div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><div style={{width: '30px', flexShrink: 0}} /><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>Cruise:</span><input type="text" placeholder="DIR" style={{width: '28px', backgroundColor: !clncFields.cruiseDir ? '#dbeafe' : ''}} value={clncFields.cruiseDir} onChange={e => setClncFields(prev => ({...prev, cruiseDir: e.target.value}))} /><input type="text" placeholder="VEL" style={{width: '28px', backgroundColor: !clncFields.cruiseVel ? '#dbeafe' : ''}} value={clncFields.cruiseVel} onChange={e => setClncFields(prev => ({...prev, cruiseVel: e.target.value}))} /></div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}><div style={{width: '30px', flexShrink: 0}} /><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap'}}>ΔT:</span><input type="text" style={{width: '28px', backgroundColor: !clncFields.deltaT ? '#dbeafe' : ''}} value={clncFields.deltaT} onChange={e => { const v = e.target.value; setClncFields(prev => ({...prev, deltaT: v})); if (v) autoFillTTC(v, selectedAlt, infoFields.depElev); }} /><span className="info-label" style={{display: 'inline', whiteSpace: 'nowrap', marginLeft: '4px'}}>OAT:</span><input type="text" style={{width: '28px', backgroundColor: !clncFields.oat ? '#dbeafe' : ''}} value={clncFields.oat} onChange={e => { const v = e.target.value; setClncFields(prev => ({...prev, oat: v})); if (v) autoFillCruise(v, selectedAlt); }} /></div>
                  </div>
                </div>
              </td>
            </tr>
          )}
          <tr>
            <td style={{position: 'relative'}}>
              <span className="info-label">DEST ELEV</span>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <input type="text" value={infoFields.destElev} onChange={e => { const v = e.target.value; const match = airports.find(ap => ap.airport.toUpperCase() === v.trim().toUpperCase()); if (match) selectAirport(match, 'dest'); else setInfoField('destElev', v); }} style={{flex: 1}} />
                <span onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'dest' ? null : 'dest'); }} style={{cursor: 'pointer', padding: '0 2px', userSelect: 'none'}}>▾</span>
              </div>
              {renderAirportDropdown('dest')}
            </td>
            {renderFreqCell('destApcCont', 'APC CONT')}
            {renderFreqCell('destTower', 'TOWER')}
            {renderFreqCell('destGndCont', 'GND CONT')}
          </tr>
        </tbody>
      </table>

      <table className="jetlog-table">
        <colgroup>
          {editRowsMode && <col style={{width: '28px'}} />}
          <col style={{width: '23%'}} />
          {vfrMode ? (
            <>
              {Array.from({length: 7}, (_, i) => <col key={i} style={{width: '8.5%'}} />)}
              <col style={{width: '8%'}} />
              <col style={{width: '8%'}} />
            </>
          ) : (
            Array.from({length: 8}, (_, i) => <col key={i} style={{width: '9.625%'}} />)
          )}
          {!vfrMode && (showIntClimbSelector || intClimbs.length > 0) && (
            <col style={{width: '60px'}} />
          )}
        </colgroup>
        <thead>
          <tr>
            {editRowsMode && <th rowSpan="2" style={{width: '28px', padding: 0}} />}
            <th rowSpan="2">ROUTE<br/>TO</th>
            <th>IDENT</th>
            <th rowSpan="2">CUS</th>
            <th rowSpan="2">DIST</th>
            <th rowSpan="2">ETE</th>
            <th>ETA</th>
            <th rowSpan="2">LEG<br/>FUEL</th>
            <th>EFR</th>
            {vfrMode ? (
              <th colSpan="2" rowSpan="2">
                NOTES
                {inputValues['r0c8'] && <div style={{fontSize: '0.75em', fontWeight: 'normal', textAlign: 'left', paddingLeft: '2px'}}>{Math.round(parseFloat(inputValues['r0c8']) + (parseFloat(params.sttoFuel) || 0))}</div>}
              </th>
            ) : (
              <th rowSpan="2">GS</th>
            )}
            {!vfrMode && (showIntClimbSelector || intClimbs.length > 0) && (
              <th rowSpan="2" style={{fontSize: '0.7em'}}>NOTES</th>
            )}
          </tr>
          <tr>
            <th>CHAN</th>
            <th>ATA</th>
            <th>AFR</th>
          </tr>
        </thead>
        <tbody>
          {/* Pair 0: STTO */}
          <tr>
            {editRowsMode && <td rowSpan={2} className="edit-minus-cell" />}
            <td rowSpan={2} style={{fontSize: '1.5em', textAlign: 'center', padding: '1px 3px', border: '1px solid black'}}>STTO</td>
            {renderCell('r0c1')}
            {renderCell('r0c2', 2)}
            {renderCell('r0c3', 2)}
            {renderCell('r0c4', 2)}
            {renderCell('r0c5')}
            {renderCell('r0c6', 2)}
            {renderCell('r0c7')}
            {vfrMode ? renderVFRNotesCells(0) : renderCell('r0c8', 2)}
            {!vfrMode && (showIntClimbSelector || intClimbs.length > 0) && (
              <td rowSpan={2} style={{border: '1px solid black'}} />
            )}
          </tr>
          <tr>
            {renderCell('r1c0')}
            {renderCell('r1c1')}
            {renderCell('r1c2')}
          </tr>

          {/* Dynamic main route rows (pairs 1+) */}
          {editRowsMode && renderDivider(0)}
          {Array.from({length: mainRowCount - 1}, (_, idx) => {
            const pairIdx = idx + 1;
            return (
              <React.Fragment key={`fr-${pairIdx}`}>
                {renderMainRowPair(pairIdx)}
                {editRowsMode && renderDivider(pairIdx)}
              </React.Fragment>
            );
          })}

          {/* Main table Total row */}
          {renderTotalRow(
            mainTotalTop, mainTotalBot,
            mainDataRows.map(r => `r${r}c3`),
            mainDataRows.map(r => `r${r}c4`),
            mainDataRows.map(r => `r${r}c6`),
          )}
        </tbody>
      </table>

      <table className="jetlog-info-table">
        <colgroup>
          {Array.from({length: 40}).map((_, i) => <col key={i} style={{width: '2.5%'}} />)}
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={10} style={{position: 'relative'}}>
              <span className="info-label">ALTERNATE</span>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <input type="text" value={infoFields.alternate} onChange={e => { const v = e.target.value; const match = airports.find(ap => ap.airport.toUpperCase() === v.trim().toUpperCase()); if (match) selectAirport(match, 'alt'); else setInfoField('alternate', v); }} style={{flex: 1}} />
                <span onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'alt' ? null : 'alt'); }} style={{cursor: 'pointer', padding: '0 2px', userSelect: 'none'}}>▾</span>
              </div>
              {renderAirportDropdown('alt')}
            </td>
            <td colSpan={10}><span className="info-label">ROUTE</span><input type="text" value={inputValues['altroute'] || ''} onChange={e => handleInputChange('altroute', e.target.value)} /></td>
            <td colSpan={10}><span className="info-label">ALTITUDE</span><input type="text" placeholder="Hundreds of ft" value={inputValues['altalt'] || ''} onChange={e => handleInputChange('altalt', e.target.value)} /></td>
            <td colSpan={5}><span className="info-label">FUEL</span><div style={{textAlign: 'center', fontSize: '0.75em', paddingTop: '1px'}}>{fuelDisplay}</div></td>
            <td colSpan={5}><span className="info-label">TIME</span><div style={{textAlign: 'center', fontSize: '0.75em', paddingTop: '1px'}}>{timeDisplay}</div></td>
          </tr>
          <tr>
            <td colSpan={10}><span className="info-label">ALT ELEV</span><input type="text" value={infoFields.altElev} onChange={e => setInfoField('altElev', e.target.value)} /></td>
            {renderFreqCell('altApcCont', 'APC CONT', {colSpan: 10})}
            {renderFreqCell('altTower', 'TOWER', {colSpan: 10})}
            {renderFreqCell('altGndCont', 'GND CONT', {colSpan: 10})}
          </tr>
        </tbody>
      </table>

      <table className="jetlog-table">
        <colgroup>
          <col style={{width: '23%'}} />
          {vfrMode ? (
            <>
              {Array.from({length: 7}, (_, i) => <col key={i} style={{width: '8.5%'}} />)}
              <col style={{width: '8%'}} />
              <col style={{width: '8%'}} />
            </>
          ) : (
            Array.from({length: 8}, (_, i) => <col key={i} style={{width: '9.625%'}} />)
          )}
        </colgroup>
        <tbody>
          {/* Alternate route rows */}
          {ALT_ROWS.map(top => {
            const bot = top + 1;
            return (
              <React.Fragment key={top}>
                <tr>
                  {vfrMode ? renderVFRCheckCell(`r${top}c0`, vfrApr, setVfrApr, 'APR', '24px') : renderRouteToCell(`r${top}c0`)}
                  {renderCell(`r${top}c1`)}
                  {renderCell(`r${top}c2`, 2)}
                  {renderCell(`r${top}c3`, 2)}
                  {renderCell(`r${top}c4`, 2)}
                  {renderCell(`r${top}c5`)}
                  {renderCell(`r${top}c6`, 2)}
                  {renderCell(`r${top}c7`)}
                  {vfrMode ? renderVFRNotesCells(top) : renderCell(`r${top}c8`, 2)}
                </tr>
                <tr>
                  {renderCell(`r${bot}c0`)}
                  {renderCell(`r${bot}c1`)}
                  {renderCell(`r${bot}c2`)}
                </tr>
              </React.Fragment>
            );
          })}

          {/* Alternate table Total row */}
          {renderTotalRow(
            208, 209,
            ALT_ROWS.map(r => `r${r}c3`),
            ALT_ROWS.map(r => `r${r}c4`),
            ALT_ROWS.map(r => `r${r}c6`),
            true,
          )}
        </tbody>
      </table>

      <div style={{fontWeight: 'bold', textAlign: 'center', fontSize: '0.85em', marginTop: '6px', marginBottom: '1px', letterSpacing: '0.04em'}}>
        T-6B FUEL PLAN (Pounds of Fuel)
      </div>
      <table className="jetlog-table" style={{marginTop: '0'}}>
        <colgroup>
          <col style={{width: '40%'}} />
          <col style={{width: '10%'}} />
          <col style={{width: '40%'}} />
          <col style={{width: '10%'}} />
        </colgroup>
        <tbody>
          {(() => {
            const leftLabels  = ['1. CLIMB/ROUTE TO DEST', '2. ROUTE TO ALTERNATE', '3. APPROACHES', '4. TOTAL 1,2,3', '5. RESERVE 10% OF 4 (minimum 20 min @ max endurance 10,000 feet)'];
            const rightLabels = ['6. START/TAXI', '7. TOTAL REQUIRED (4,5,6)', '8. TOTAL FUEL ABOARD', '9. SPARE FUEL', null];
            return fuelPlan.map(([leftVal, rightVal], i) => (
              <tr key={i}>
                <td style={{padding: '1px 2px'}}>
                  <span className="info-label" style={{textAlign: 'left', display: 'block'}}>{leftLabels[i]}</span>
                </td>
                <td style={{padding: '1px 2px', textAlign: 'center', fontSize: '0.85em', verticalAlign: 'middle'}}>
                  {leftVal}
                </td>
                {rightVal !== null ? (
                  <React.Fragment>
                    <td style={{padding: '1px 2px'}}>
                      <span className="info-label" style={{textAlign: 'left', display: 'block'}}>{rightLabels[i]}</span>
                    </td>
                    <td style={{padding: '1px 2px', textAlign: 'center', fontSize: '0.85em', verticalAlign: 'middle'}}>
                      {rightVal}
                    </td>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <td style={{background: '#e8e8e8'}} />
                    <td style={{background: '#e8e8e8'}} />
                  </React.Fragment>
                )}
              </tr>
            ));
          })()}
        </tbody>
      </table>
      </div>

      {showParams && (
        <div
          style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'}}
          onClick={() => setShowParams(false)}
        >
          <div
            style={{background: 'white', borderRadius: '8px', padding: '24px 28px',
              minWidth: '300px', boxShadow: '0 6px 24px rgba(0,0,0,0.3)'}}
            onClick={e => e.stopPropagation()}
          >
            <div style={{fontWeight: 'bold', fontSize: '1em', marginBottom: '16px', textAlign: 'center', letterSpacing: '0.05em'}}>PARAMETERS</div>
            {[
              {label: 'Start Fuel (lbs)',        key: 'startFuel'},
              {label: 'STTO Time (min)',         key: 'sttoTime'},
              {label: 'STTO Fuel (lbs)',         key: 'sttoFuel'},
              {label: 'Hold Time (min)',         key: 'holdTime', vfrHide: true},
              {label: 'Approach Time (min)',     key: 'approachTime'},
              {label: 'Approach Fuel (lbs)',     key: 'approachFuel'},
              {label: 'T&G Time (min)',          key: 'tngTime', ifrHide: true},
              {label: 'T&G Fuel (lbs)',          key: 'tngFuel', ifrHide: true},
              {label: 'STD Reserve Fuel (lbs)', key: 'stdReserve'},
            ].filter(p => (!vfrMode || !p.vfrHide) && (vfrMode || !p.ifrHide)).map(({label, key}) => (
              <div key={key} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '16px'}}>
                <label style={{fontSize: '0.85em', whiteSpace: 'nowrap', color: '#333'}}>{label}</label>
                <input
                  type="text"
                  value={params[key]}
                  onChange={e => setParams(prev => ({...prev, [key]: e.target.value}))}
                  style={{width: '72px', textAlign: 'right', padding: '3px 5px'}}
                />
              </div>
            ))}
            <button
              onClick={() => setShowParams(false)}
              style={{marginTop: '12px', width: '100%'}}
            >Done</button>
          </div>
        </div>
      )}

      {showPresets && (
        <div
          style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'}}
          onClick={() => setShowPresets(false)}
        >
          <div
            style={{background: 'white', borderRadius: '8px', padding: '24px 28px',
              minWidth: '320px', maxHeight: '80vh', overflowY: 'auto',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)', color: '#333'}}
            onClick={e => e.stopPropagation()}
          >
            <div style={{fontWeight: 'bold', fontSize: '1em', marginBottom: '14px', textAlign: 'center', letterSpacing: '0.05em'}}>PRESETS</div>

            {sharedPresets.length > 0 && (
              <>
                <div style={{fontSize: '0.7em', fontWeight: 'bold', color: '#888', marginBottom: '6px', letterSpacing: '0.05em'}}>SHARED</div>
                {(() => {
                  const byFolder = {};
                  sharedPresets.forEach(p => {
                    const f = p.folder || '';
                    if (!byFolder[f]) byFolder[f] = [];
                    byFolder[f].push(p);
                  });
                  const folders = Object.keys(byFolder).filter(f => f !== '').sort();
                  const ungrouped = byFolder[''] || [];
                  const toggleFolder = (f) => setCollapsedFolders(prev => {
                    const next = new Set(prev);
                    if (next.has(f)) next.delete(f); else next.add(f);
                    return next;
                  });
                  const renderPresetRow = (p, indent) => (
                    <div key={p.id}
                      style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px',
                        cursor: 'pointer', padding: `2px 0 2px ${indent ? '14px' : '0'}`}}
                      onClick={() => { applyPreset(p); setShowPresets(false); }}
                    >
                      <span style={{fontSize: '0.65em', padding: '1px 5px', borderRadius: '3px',
                        background: p.mode === 'VFR' ? '#1e40af' : '#444', color: 'white', flexShrink: 0}}>
                        {p.mode}
                      </span>
                      <span style={{fontSize: '0.85em'}}>{p.name}</span>
                    </div>
                  );
                  return (
                    <>
                      {folders.map(folder => {
                        const isOpen = !collapsedFolders.has(folder);
                        return (
                          <div key={folder} style={{marginBottom: '2px'}}>
                            <div onClick={() => toggleFolder(folder)}
                              style={{display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                fontSize: '0.78em', fontWeight: '600', color: '#444', padding: '3px 2px',
                                userSelect: 'none', borderRadius: '3px'}}
                              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                            >
                              <span style={{fontSize: '0.85em', width: '8px', display: 'inline-block'}}>{isOpen ? '▾' : '▸'}</span>
                              {folder}
                            </div>
                            {isOpen && <div style={{marginTop: '2px'}}>{byFolder[folder].map(p => renderPresetRow(p, true))}</div>}
                          </div>
                        );
                      })}
                      {ungrouped.map(p => renderPresetRow(p, false))}
                    </>
                  );
                })()}
                <hr style={{margin: '10px 0', borderColor: '#e5e7eb'}} />
              </>
            )}

            <div style={{fontSize: '0.7em', fontWeight: 'bold', color: '#888', marginBottom: '6px', letterSpacing: '0.05em'}}>MY PRESETS</div>
            {localPresets.length === 0 && (
              <div style={{fontSize: '0.8em', color: '#aaa', marginBottom: '8px'}}>None saved yet.</div>
            )}
            {localPresets.map(p => (
              <div key={p.id} style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '3px 0'}}>
                <span style={{fontSize: '0.65em', padding: '1px 5px', borderRadius: '3px',
                  background: p.mode === 'VFR' ? '#1e40af' : '#444', color: 'white', flexShrink: 0}}>
                  {p.mode}
                </span>
                <span style={{flex: 1, fontSize: '0.85em', cursor: 'pointer'}} onClick={() => applyPreset(p)}>{p.name}</span>
                <button
                  onClick={() => deleteLocalPreset(p.id)}
                  style={{fontSize: '0.7em', padding: '1px 5px', background: '#fee2e2',
                    border: '1px solid #fca5a5', borderRadius: '3px', cursor: 'pointer', flexShrink: 0}}
                >✕</button>
              </div>
            ))}

            <hr style={{margin: '12px 0', borderColor: '#e5e7eb'}} />
            <div style={{fontSize: '0.75em', color: '#666', marginBottom: '6px'}}>Save current flight plan as preset:</div>
            <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
              <input
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveLocalPreset(presetName); }}
                placeholder="Preset name…"
                style={{flex: 1, minWidth: '120px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '4px'}}
              />
              <button onClick={() => saveLocalPreset(presetName)} style={{fontSize: '0.8em'}}>Save</button>
              {process.env.NODE_ENV === 'development' && (
                <button onClick={() => exportPresetFile(presetName)} style={{fontSize: '0.8em'}} title="Download JSON to add to shared library">Export ↓</button>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

export default TW4JetLog;
