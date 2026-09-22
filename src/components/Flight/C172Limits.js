import React, { useEffect, useRef, useState } from 'react';
import { gradeLimit } from '../../utils/answerUtils';
import { C172_LIMITS } from './c172Data';

// NIFE's limits table: the C172 limits exam as it is handed out, one box per blank. The table
// is markup because it is a recreation of the sheet; the answers are data (c172Data.js). A
// limits table is bespoke to its school's exam, so it keeps its own look (`.limits-table`) rather
// than Primary's.
//
// Primary's conveniences, the same as its T-6B table: Random mode walks the blanks one at a
// time in a shuffled order, each turning green and moving on the moment it is right (a Min and
// Max of one instrument stay together); Next Answer and All Answers fill blanks in; numbers
// compare as numbers and a range may be written "min-max" or "min to max". A game runs Random
// mode and ends when the last blank is right.

const KEYS = Object.keys(C172_LIMITS);

// Blanks that belong to one instrument (tachMin, tachMax) share the stem before Min, Normal or
// Max, and are asked together.
const stemOf = (key) => key.replace(/(Min|Normal|Max)$/, '');

function shuffledGroups(keys) {
  const groups = [];
  const at = new Map();
  for (const k of keys) {
    const stem = stemOf(k);
    if (!at.has(stem)) { at.set(stem, groups.length); groups.push([]); }
    groups[at.get(stem)].push(k);
  }
  for (let i = groups.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }
  return groups.flat();
}

function focusHint() {
  setTimeout(() => {
    const el = document.querySelector('.correct-answer-hint-input');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      if (el.select) el.select();
    }
  }, 100);
}

function C172Limits({ isGameActive = false, onGameComplete }) {
  const [limitsData, setLimitsData] = useState({});
  const [checkResults, setCheckResults] = useState({});
  const [queue, setQueue] = useState(null); // the Random-mode order, or null when off
  const [at, setAt] = useState(0);
  const locked = useRef(null);

  const current = queue ? queue[at] : null;

  const stopRandom = () => { setQueue(null); setAt(0); };

  const startRandom = () => {
    const open = KEYS.filter((k) => checkResults[k] !== 'correct');
    if (!open.length) return;
    setQueue(shuffledGroups(open));
    setAt(0);
    focusHint();
  };

  useEffect(() => {
    if (isGameActive) startRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameActive]);

  const advance = () => {
    locked.current = null;
    if (at + 1 >= queue.length) {
      stopRandom();
      if (isGameActive) onGameComplete?.();
      return;
    }
    setAt(at + 1);
    focusHint();
  };

  const handleLimitsChange = (field, value) => {
    if (locked.current === field) return;
    setLimitsData((d) => ({ ...d, [field]: value }));
    if (field === current && gradeLimit(value, C172_LIMITS[field]) === 'correct') {
      locked.current = field;
      setCheckResults((r) => ({ ...r, [field]: 'correct' }));
      setTimeout(advance, 300);
      return;
    }
    setCheckResults((r) => ({ ...r, [field]: '' }));
  };

  const checkAnswers = () => {
    const results = {};
    for (const k of KEYS) results[k] = gradeLimit(limitsData[k], C172_LIMITS[k]);
    setCheckResults(results);
    if (isGameActive && KEYS.every((k) => results[k] === 'correct')) onGameComplete?.();
  };

  const nextAnswer = () => {
    const field = current || KEYS.find((k) => checkResults[k] !== 'correct');
    if (!field) return;
    setLimitsData((d) => ({ ...d, [field]: C172_LIMITS[field] }));
    setCheckResults((r) => ({ ...r, [field]: 'correct' }));
    if (current) { locked.current = field; setTimeout(advance, 300); }
  };

  const allAnswers = () => {
    setLimitsData({ ...C172_LIMITS });
    setCheckResults(Object.fromEntries(KEYS.map((k) => [k, 'correct'])));
    stopRandom();
  };

  const resetAnswers = () => {
    setLimitsData({});
    setCheckResults({});
    stopRandom();
  };

  const getInputClass = (field) => {
    if (field === current) return 'correct-answer-hint-input';
    if (checkResults[field] === 'correct') return 'correct-answer';
    if (checkResults[field] === 'incorrect') return 'incorrect-answer';
    return '';
  };

  // Enter in any answer box checks, on every EPs and limits page.
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') checkAnswers();
  };

  return (
    <div className="limits-eps-container" onKeyDown={onKeyDown}>
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
            <tr><td>Tachometer</td><td></td><td><input type="text" value={limitsData.tachMin || ''} onChange={(e) => handleLimitsChange('tachMin', e.target.value)} className={getInputClass('tachMin')} placeholder="RPM" /></td><td></td><td><input type="text" value={limitsData.tachMax || ''} onChange={(e) => handleLimitsChange('tachMax', e.target.value)} className={getInputClass('tachMax')} placeholder="RPM" /></td></tr>
            <tr><td>Oil Temp</td><td></td><td><input type="text" value={limitsData.oilTempNormal || ''} onChange={(e) => handleLimitsChange('oilTempNormal', e.target.value)} className={getInputClass('oilTempNormal')} placeholder="°F" /></td><td></td><td><input type="text" value={limitsData.oilTempMax || ''} onChange={(e) => handleLimitsChange('oilTempMax', e.target.value)} className={getInputClass('oilTempMax')} placeholder="°F" /></td></tr>
            <tr><td>Oil Press</td><td><input type="text" value={limitsData.oilPressMin || ''} onChange={(e) => handleLimitsChange('oilPressMin', e.target.value)} className={getInputClass('oilPressMin')} placeholder="PSI" /></td><td><input type="text" value={limitsData.oilPressNormal || ''} onChange={(e) => handleLimitsChange('oilPressNormal', e.target.value)} className={getInputClass('oilPressNormal')} placeholder="PSI" /></td><td></td><td><input type="text" value={limitsData.oilPressMax || ''} onChange={(e) => handleLimitsChange('oilPressMax', e.target.value)} className={getInputClass('oilPressMax')} placeholder="PSI" /></td></tr>
            <tr><td>Oil Quantity</td><td><input type="text" value={limitsData.oilQuantMin || ''} onChange={(e) => handleLimitsChange('oilQuantMin', e.target.value)} className={getInputClass('oilQuantMin')} placeholder="qts" /></td><td><input type="text" value={limitsData.oilQuantNormal || ''} onChange={(e) => handleLimitsChange('oilQuantNormal', e.target.value)} className={getInputClass('oilQuantNormal')} placeholder="qts" /></td><td></td><td><input type="text" value={limitsData.oilQuantMax || ''} onChange={(e) => handleLimitsChange('oilQuantMax', e.target.value)} className={getInputClass('oilQuantMax')} placeholder="qts" /></td></tr>
            <tr><td>Carb. Air Temp</td><td></td><td></td><td><input type="text" value={limitsData.carbTemp || ''} onChange={(e) => handleLimitsChange('carbTemp', e.target.value)} className={getInputClass('carbTemp')} placeholder="°C" style={{ width: '100%' }} /></td><td></td></tr>
            <tr><td>Starter Duty Cycle</td><td colSpan={4}><input type="text" value={limitsData.starterDuty || ''} onChange={(e) => handleLimitsChange('starterDuty', e.target.value)} className={getInputClass('starterDuty')} style={{ width: '100%' }} /></td></tr>
            <tr><td>Max Weight</td><td><input type="text" value={limitsData.maxWeight || ''} onChange={(e) => handleLimitsChange('maxWeight', e.target.value)} className={getInputClass('maxWeight')} placeholder="lbs" /></td></tr>
            <tr><td>Baggage Allowance</td><td><input type="text" value={limitsData.baggage || ''} onChange={(e) => handleLimitsChange('baggage', e.target.value)} className={getInputClass('baggage')} placeholder="lbs" /></td></tr>
            <tr><td>Fuel Capacity</td><td><input type="text" value={limitsData.fuelCapacity || ''} onChange={(e) => handleLimitsChange('fuelCapacity', e.target.value)} className={getInputClass('fuelCapacity')} placeholder="gal" /></td></tr>
            <tr><td>Max Crosswind</td><td><input type="text" value={limitsData.maxCrosswind || ''} onChange={(e) => handleLimitsChange('maxCrosswind', e.target.value)} className={getInputClass('maxCrosswind')} placeholder="kts" /></td></tr>
            <tr><td>Max Angle of Bank</td><td><input type="text" value={limitsData.maxBank || ''} onChange={(e) => handleLimitsChange('maxBank', e.target.value)} className={getInputClass('maxBank')} placeholder="°" /></td></tr>
            <tr><td>Service Ceiling</td><td><input type="text" value={limitsData.serviceCeiling || ''} onChange={(e) => handleLimitsChange('serviceCeiling', e.target.value)} className={getInputClass('serviceCeiling')} placeholder="ft" /></td></tr>
            <tr><td>Wingspan</td><td><input type="text" value={limitsData.wingspan || ''} onChange={(e) => handleLimitsChange('wingspan', e.target.value)} className={getInputClass('wingspan')} placeholder="ft" /></td></tr>
            <tr><td>Limit Load Factors:</td><td></td></tr>
            <tr><td>Flaps Up:</td><td><input type="text" value={limitsData.flapsUpMax || ''} onChange={(e) => handleLimitsChange('flapsUpMax', e.target.value)} className={getInputClass('flapsUpMax')} placeholder="+ to -" /></td></tr>
            <tr><td>Flaps Down:</td><td><input type="text" value={limitsData.flapsDownMax || ''} onChange={(e) => handleLimitsChange('flapsDownMax', e.target.value)} className={getInputClass('flapsDownMax')} placeholder="+ to -" /></td></tr>
            <tr><td>V<sub>NE</sub></td><td><input type="text" value={limitsData.vne || ''} onChange={(e) => handleLimitsChange('vne', e.target.value)} className={getInputClass('vne')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>NO</sub></td><td><input type="text" value={limitsData.vno || ''} onChange={(e) => handleLimitsChange('vno', e.target.value)} className={getInputClass('vno')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>A</sub></td><td><input type="text" value={limitsData.va || ''} onChange={(e) => handleLimitsChange('va', e.target.value)} className={getInputClass('va')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>FE</sub></td><td><input type="text" value={limitsData.vfe || ''} onChange={(e) => handleLimitsChange('vfe', e.target.value)} className={getInputClass('vfe')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>Y</sub></td><td><input type="text" value={limitsData.vy || ''} onChange={(e) => handleLimitsChange('vy', e.target.value)} className={getInputClass('vy')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>X</sub></td><td><input type="text" value={limitsData.vx || ''} onChange={(e) => handleLimitsChange('vx', e.target.value)} className={getInputClass('vx')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>glide</sub></td><td><input type="text" value={limitsData.vglide || ''} onChange={(e) => handleLimitsChange('vglide', e.target.value)} className={getInputClass('vglide')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>R</sub></td><td><input type="text" value={limitsData.vr || ''} onChange={(e) => handleLimitsChange('vr', e.target.value)} className={getInputClass('vr')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>S</sub></td><td><input type="text" value={limitsData.vs || ''} onChange={(e) => handleLimitsChange('vs', e.target.value)} className={getInputClass('vs')} placeholder="KIAS" /></td></tr>
            <tr><td>V<sub>SO</sub></td><td><input type="text" value={limitsData.vso || ''} onChange={(e) => handleLimitsChange('vso', e.target.value)} className={getInputClass('vso')} placeholder="KIAS" /></td></tr>
          </tbody>
        </table>
      </div>
      {queue && (
        <div className="epl-limits-progress">Random Mode: Limit {at + 1} of {queue.length}</div>
      )}
      {!isGameActive && (
        <div className="button-row" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button type="button" onClick={nextAnswer}>Next Answer</button>
          <button type="button" onClick={allAnswers}>All Answers</button>
          <button type="button" onClick={checkAnswers}>Check Answers</button>
          <button type="button" onClick={resetAnswers}>Reset</button>
          <button type="button" className={`epl-random${queue ? ' active' : ''}`} aria-pressed={!!queue}
            onClick={() => (queue ? stopRandom() : startRandom())}>
            Random Mode
          </button>
        </div>
      )}
    </div>
  );
}

export default C172Limits;
