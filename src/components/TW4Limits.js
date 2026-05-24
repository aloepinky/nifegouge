import React, { useState, useEffect, useRef } from 'react';

function TW4Limits({ isGameActive = false, onGameComplete }) {
  // Layout width parameters - adjust these to test different configurations

  const [limitsData, setLimitsData] = useState({});
  const [checkResults, setCheckResults] = useState({});
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [currentLimitIndex, setCurrentLimitIndex] = useState(0);
  const [limitIndices, setLimitIndices] = useState([]);
  const isGameActiveRef = useRef(isGameActive);
  useEffect(() => { isGameActiveRef.current = isGameActive; }, [isGameActive]);

  // Helper function to shuffle array with constraints
  const shuffleIndices = (arr) => {
    // Define groups that should appear together
    const groups = [
      // Notes
      ['note21', 'note22'], ['note41', 'note42'], ['note51', 'note52', 'note53'],
      ['note61', 'note62', 'note63'], ['note81', 'note82', 'note83'], ['note101', 'note102', 'note103'],
      // Operating limits table
      ['takeoffOilPressMin', 'takeoffOilPressMax'], ['takeoffOilTempMin', 'takeoffOilTempMax'],
      ['idleTorqueMin', 'idleTorqueMax'], ['idleN1GroundBottom', 'idleN1GroundTop'], ['idleNpGroundBottom', 'idleNpGroundTop'],
      ['idleOilTempGroundMin', 'idleOilTempGroundMax'], ['idleOilTempFlightMin', 'idleOilTempFlightMax'], ['idleOilTempCautionMin', 'idleOilTempCautionMax'],
      ['startITT5sec', 'startITTTime'], ['transientTorque5secMin', 'transientTorque5secMax', 'transientTorqueTime'],
      ['transientITT20sec', 'transientITTTime'], ['transientNp20sec', 'transientNpTime'],
      ['transientOilPressMin', 'transientOilPressMax'], ['transientOilTemp10minMin', 'transientOilTemp10minMax', 'transientOilTempTime'],
      // Acceleration limits
      ['symCleanPos', 'symCleanNeg'], ['symGearFlapsPos', 'symGearFlapsNeg'],
      ['asymCleanPos', 'asymCleanNeg'], ['asymGearFlapsPos', 'asymGearFlapsNeg'],
      // Other
      ['vmo', 'mmo'], ['iceFeet', 'iceType'], ['cockpitPress', 'cockpitPressTol'], ['hydCautionMin', 'hydCautionMax'],
      ['negOne', 'bankAngleChange']
    ];

    // Extract prohibited maneuvers in order
    const prohibitedManeuvers = [];
    const remaining = [];

    for (const item of arr) {
      if (item.startsWith('prohib')) {
        prohibitedManeuvers.push(item);
      } else {
        remaining.push(item);
      }
    }

    // Sort prohibited maneuvers to ensure they're in order
    prohibitedManeuvers.sort((a, b) => {
      const numA = parseInt(a.replace('prohib', ''));
      const numB = parseInt(b.replace('prohib', ''));
      return numA - numB;
    });

    // Process remaining items into groups and singles
    const groupedItems = [];
    const processed = new Set();

    // First, extract all groups
    for (const group of groups) {
      const presentItems = group.filter(item => remaining.includes(item));
      if (presentItems.length > 0) {
        groupedItems.push(presentItems);
        presentItems.forEach(item => processed.add(item));
      }
    }

    // Add remaining singles
    for (const item of remaining) {
      if (!processed.has(item)) {
        groupedItems.push([item]);
      }
    }

    // Shuffle the groups (not the items within groups)
    for (let i = groupedItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groupedItems[i], groupedItems[j]] = [groupedItems[j], groupedItems[i]];
    }

    // Insert prohibited maneuvers between groups (before flattening)
    const result = [];
    let prohibIndex = 0;

    if (prohibitedManeuvers.length > 0) {
      // Determine positions to insert prohibited maneuvers (at group boundaries)
      const totalSlots = groupedItems.length + prohibitedManeuvers.length;
      const prohibPositions = [];

      // Distribute prohibited maneuvers throughout the groups
      const interval = Math.floor(totalSlots / prohibitedManeuvers.length);
      for (let i = 0; i < prohibitedManeuvers.length; i++) {
        prohibPositions.push(Math.floor(Math.random() * (interval + 1)) + (i * interval));
      }

      // Build final array by inserting prohibited maneuvers between groups
      let groupIndex = 0;
      for (let i = 0; i < totalSlots; i++) {
        if (prohibPositions.includes(i) && prohibIndex < prohibitedManeuvers.length) {
          result.push(prohibitedManeuvers[prohibIndex]);
          prohibIndex++;
        } else if (groupIndex < groupedItems.length) {
          result.push(...groupedItems[groupIndex]);
          groupIndex++;
        }
      }
    } else {
      // No prohibited maneuvers, just flatten groups
      result.push(...groupedItems.flat());
    }

    console.log(result);
    return result;
  };

  // T-6B Limits Answer Keys
  const limitsAnswers = {
    // Engine Operating Limits Table
    takeoffTorque: '100',
    takeoffITT: '820',
    takeoffN1: '104',
    takeoffNp: '100',
    takeoffOilPressMin: '90',
    takeoffOilPressMax: '120',
    takeoffOilTempMin: '10',
    takeoffOilTempMax: '105',
    idleTorqueMin: '1',
    idleTorqueMax: '10',
    idleITT: '750',
    idleN1GroundBottom: '60',
    idleN1GroundTop: '61',
    idleN1Flight: '67',
    idleNpGroundBottom: '46',
    idleNpGroundTop: '50',
    idleOilPress: '90',
    idleOilTempGroundMin: '-40',
    idleOilTempGroundMax: '105',
    idleOilTempFlightMin: '10',
    idleOilTempFlightMax: '105',
    idleOilTempCautionMin: '106',
    idleOilTempCautionMax: '110',
    startITT5sec: '871-1000',
    startITTTime: '5',
    startOilPress: '200',
    startOilTemp: '-40',
    transientTorque5secMin: '101',
    transientTorque5secMax: '107',
    transientTorqueTime: '5',
    transientITT20sec: '821-870',
    transientITTTime: '20',
    transientN1: '104',
    transientNp20sec: '110',
    transientNpTime: '20',
    transientOilPressMin: '40',
    transientOilPressMax: '130',
    transientOilTemp10minMin: '106',
    transientOilTemp10minMax: '110',
    transientOilTempTime: '10',
    // Notes
    note21: "100",
    note22: "2",
    note41: "62",
    note42: "80",
    note51: "15",
    note52: "40",
    note53: "5",
    note61: "90",
    note62: "120",
    note63: "90",
    note71: "20",
    note81: "100",
    note82: "2",
    note83: "102",
    note101: "102",
    note102: "107",
    note103: "107",
    // Airspeed Limitations
    vleVfe: '150',
    vmo: '316',
    mmo: '0.67',
    turbPen: '207',
    // Prohibited Maneuvers
    prohib1: 'INVERTED STALLS',
    prohib2: 'INVERTED SPINS',
    prohib3: 'SPINS WITH PCL ABOVE IDLE',
    prohib4: 'SPINS WITH THE LANDING GEAR FLAPS OR SPEED BRAKE EXTENDED',
    prohib5: 'SPINS WITH PMU OFF',
    prohib6: 'AGGRAVATED SPINS PAST TWO TURNS',
    prohib7: 'SPINS BELOW 10000 FEET PRESSURE ALTITUDE',
    prohib8: 'SPINS ABOVE 22000 FEET PRESSURE ALTITUDE',
    prohib9: 'ABRUPT CROSS-CONTROLLED (SNAP) MANEUVERS',
    prohib10: 'AEROBATIC MANEUVERS SPINS OR STALLS WITH A FUEL IMBALANCE GREATER THAN 50 POUNDS BETWEEN WINGS',
    prohib11: 'TAIL SLIDES',
    iceFeet: '5000',
    iceType: 'LIGHT RIME',
    minBattVolt: '22.0',
    hydCautionMin: '1800',
    hydCautionMax: '3500',
    fuelCaution: '110',
    cockpitPress: '3.6',
    cockpitPressTol: '0.2',
    // Starter Cycle Limitations
    starterCycles: '20 SEC',
    coolingFirst: '30 SEC',
    coolingSecond: '2 MIN',
    coolingThird: '5 MIN',
    coolingFourth: '30 MIN',
    // Flight Maneuvering Limitations
    invertedFlight: '60',
    zeroG: '5',
    negG: '60',
    negG25: '30',
    minPosG: '60',
    // Acceleration Limitations
    symCleanPos: '7.0',
    symCleanNeg: '-3.5',
    symGearFlapsPos: '2.5',
    symGearFlapsNeg: '0.0',
    asymCleanPos: '4.7',
    asymCleanNeg: '-1.0',
    asymGearFlapsPos: '2.0',
    asymGearFlapsNeg: '0.0',
    negOne: '-1',
    bankAngleChange: '180',
    // Other Limitations
    minBattStart: '23.5',
    maxCrosswindDry: '25',
    maxCrosswindWet: '10',
    maxCrosswindIcy: '5',
    maxTailwind: '10',
    maxFuelFlow: '799'
  };

  // Helper function to check if an answer is correct
  const isCorrectAnswer = (userAnswer, field) => {
    // Normalize user answer
    let normalizedUserAnswer = userAnswer.replace(/[,\-–;()/ ]/g, '');

    // Get correct answer from limitsAnswers
    let correctAnswer = Array.isArray(limitsAnswers[field]) ? limitsAnswers[field].join('') : limitsAnswers[field];
    correctAnswer = correctAnswer.replace(/[,\-–;()/ ]/g, '');

    // Check if it's a range answer (e.g., "871-1000")
    const isRange = /\d\s*(to|-)\s*-?\d/.test(correctAnswer);

    if (isRange) {
      let normalizedUser = normalizedUserAnswer.toString().replace(/\s+/g, '').replace(/to/i, '-');
      let normalizedCorrect = correctAnswer.replace(/\s+/g, '').replace(/to/i, '-');

      if (normalizedUser === normalizedCorrect) {
        return 'correct';
      } else if (normalizedUserAnswer === '') {
        return '';
      } else {
        return 'incorrect';
      }
    } else {
      let normalizedUser = normalizedUserAnswer.toString().trim().toLowerCase();
      let normalizedCorrect = correctAnswer.toString().toLowerCase();

      // Only convert to float if the ENTIRE string is numeric
      const isUserNumeric = /^-?\d+\.?\d*$/.test(normalizedUser);
      const isCorrectNumeric = /^-?\d+\.?\d*$/.test(normalizedCorrect);

      normalizedUser = isUserNumeric ? parseFloat(normalizedUser) : normalizedUser;
      normalizedCorrect = isCorrectNumeric ? parseFloat(normalizedCorrect) : normalizedCorrect;

      if (normalizedUser === normalizedCorrect) {
        return 'correct';
      } else if (normalizedUserAnswer === '') {
        return '';
      } else {
        return 'incorrect';
      }
    }
  };

  const handleLimitsChange = (field, value) => {
    setLimitsData(prev => ({ ...prev, [field]: value }));

    // In random mode, check if answer is correct and auto-advance
    if (isRandomMode && field === limitIndices[currentLimitIndex]) {
      const result = isCorrectAnswer(value, field);

      if (result === 'correct') {
        setCheckResults(prev => ({ ...prev, [field]: 'correct' }));
        // Auto-advance after short delay
        setTimeout(() => {
          advanceToNextLimit();
        }, 300);
        return;
      }
    }

    setCheckResults(prev => ({ ...prev, [field]: '' }));
  };

  // Auto-start random mode when game begins
  useEffect(() => {
    if (isGameActive) {
      startRandomMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameActive]);

  const startRandomMode = () => {
    // Get all field keys
    const allFields = Object.keys(limitsAnswers);

    // Filter out already-correct fields
    const incompleteFields = allFields.filter(field => checkResults[field] !== 'correct');

    // Shuffle the incomplete fields
    const shuffled = shuffleIndices(incompleteFields);

    setLimitIndices(shuffled);
    setCurrentLimitIndex(0);
    setIsRandomMode(true);

    // Scroll to first field after state updates
    setTimeout(() => {
      // Find the highlighted input (it will have the correct-answer-hint-input class)
      const element = document.querySelector('.correct-answer-hint-input');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
        if (element.select) {
          element.select(); // Select all text in the input
        }
      }
    }, 100);
  };

  const stopRandomMode = () => {
    setIsRandomMode(false);
    setLimitIndices([]);
    setCurrentLimitIndex(0);
  };

  const advanceToNextLimit = () => {
    const nextIndex = currentLimitIndex + 1;

    if (nextIndex >= limitIndices.length) {
      stopRandomMode();
      if (isGameActiveRef.current) onGameComplete?.();
      return;
    }

    setCurrentLimitIndex(nextIndex);

    // Scroll to next field
    setTimeout(() => {
      // Find the highlighted input (it will have the correct-answer-hint-input class)
      const element = document.querySelector('.correct-answer-hint-input');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
        if (element.select) {
          element.select(); // Select all text in the input
        }
      }
    }, 100);
  };

  const checkAnswers = () => {
    const results = {};

    Object.keys(limitsAnswers).forEach(key => {
      const userAnswer = limitsData[key] || '';
      results[key] = isCorrectAnswer(userAnswer, key);
    });

    setCheckResults(results);

    if (isGameActive) {
      const allCorrect = Object.keys(limitsAnswers).every(key => results[key] === 'correct');
      if (allCorrect) onGameComplete?.();
    }
  };

  const resetAnswers = () => {
    setLimitsData({});
    setCheckResults({});
  };

  const nextAnswer = () => {
    // In random mode, fill the currently highlighted cell
    if (isRandomMode) {
      if (currentLimitIndex >= limitIndices.length) {
        return false; // No more fields in random mode
      }

      const currentField = limitIndices[currentLimitIndex];

      // Fill it with the correct answer
      setLimitsData(prev => ({
        ...prev,
        [currentField]: limitsAnswers[currentField]
      }));

      // Mark it as correct
      setCheckResults(prev => ({
        ...prev,
        [currentField]: 'correct'
      }));

      // Advance to next limit after short delay
      setTimeout(() => {
        advanceToNextLimit();
      }, 300);

      return true;
    }

    // Normal mode: find the first key in limitsAnswers that doesn't have data in limitsData
    const emptyKey = Object.keys(limitsAnswers).find(key => !limitsData[key]);
    if (!emptyKey){
      return false; // All answers are filled
    }

    // Fill it with the correct answer
    setLimitsData(prev => ({
      ...prev,
      [emptyKey]: limitsAnswers[emptyKey]
    }));

    // Mark it as checked
    setCheckResults(prev => ({
      ...prev,
      [emptyKey]: 'correct'
    }));

    return true; // There may be more empty fields
  };

  const allAnswers = () => {
    // Build complete state updates in memory
    const newLimitsData = { ...limitsData };
    const newCheckResults = { ...checkResults };

    // Fill all empty keys
    Object.keys(limitsAnswers).forEach(key => {
      if (!limitsData[key]) {
        newLimitsData[key] = limitsAnswers[key];
        newCheckResults[key] = 'correct';
      }
    });

    // Apply updates once
    setLimitsData(newLimitsData);
    setCheckResults(newCheckResults);
  };

  const getInputClass = (field) => {
    // Highlight current field in random mode
    if (isRandomMode && limitIndices[currentLimitIndex] === field) {
      return 'correct-answer-hint-input';
    }
    if (checkResults[field] === 'correct') return 'correct-answer';
    if (checkResults[field] === 'incorrect') return 'incorrect-answer';
    return '';
  };

  const limitTableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '-2px',
    border: '2px solid #000',
    widthMax: "700px"
  };

  const limitThStyle = {
    border: '1px solid #000',
    padding: '6px',
    backgroundColor: '#ddd',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '12px'
  };

  const limitTdStyle = {
    border: '1px solid #000',
    padding: '2px',
    textAlign: 'center',
    fontSize: '10px'
  };

  const inputStyle = {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #606060ff',
    background: 'white',
    textAlign: 'center',
    padding: '2px',
    fontSize: '11px',
    fontFamily: 'inherit'
  };

  return (
    <>
      <div className="limits-eps-container">
        <h1 style={{fontSize: '16px', marginBottom: '5px'}}>T-6B OPERATING LIMITATIONS</h1>
        
        <p className="page-subtitle" style={{fontSize: '11px', marginBottom: '10px'}}>
          For values with a range use the format "min-max" or "min to max"
        </p>
          <div className="limits-page">
            {/* ENGINE OPERATING LIMITS TABLE */}
            <table style={limitTableStyle}>
              <thead>
                <tr>
                  <th style={limitThStyle} colSpan="7">ENGINE OPERATING LIMITS TABLE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={limitTdStyle}>POWER SETTING</td>
                  <td style={limitTdStyle}>TORQUE %</td>
                  <td style={limitTdStyle}>ITT C MAX</td>
                  <td style={limitTdStyle}>N1 % (1)</td>
                  <td style={limitTdStyle}>NP % (4)</td>
                  <td style={limitTdStyle}>OIL PRESSURE psi</td>
                  <td style={limitTdStyle}>OIL TEMP C</td>
                </tr>
                <tr>
                  <td style={limitTdStyle}>TAKEOFF/MAX</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffTorque')} value={limitsData.takeoffTorque || ''} onChange={(e) => handleLimitsChange('takeoffTorque', e.target.value)} /> (8)</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffITT')} value={limitsData.takeoffITT || ''} onChange={(e) => handleLimitsChange('takeoffITT', e.target.value)} /> MAX</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffN1')} value={limitsData.takeoffN1 || ''} onChange={(e) => handleLimitsChange('takeoffN1', e.target.value)} /> MAX</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffNp')} value={limitsData.takeoffNp || ''} onChange={(e) => handleLimitsChange('takeoffNp', e.target.value)} /> MAX (2)</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffOilPressMin')} value={limitsData.takeoffOilPressMin || ''} onChange={(e) => handleLimitsChange('takeoffOilPressMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffOilPressMax')} value={limitsData.takeoffOilPressMax || ''} onChange={(e) => handleLimitsChange('takeoffOilPressMax', e.target.value)} /> (6)
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffOilTempMin')} value={limitsData.takeoffOilTempMin || ''} onChange={(e) => handleLimitsChange('takeoffOilTempMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('takeoffOilTempMax')} value={limitsData.takeoffOilTempMax || ''} onChange={(e) => handleLimitsChange('takeoffOilTempMax', e.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td style={limitTdStyle}>IDLE</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleTorqueMin')} value={limitsData.idleTorqueMin || ''} onChange={(e) => handleLimitsChange('idleTorqueMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleTorqueMax')} value={limitsData.idleTorqueMax || ''} onChange={(e) => handleLimitsChange('idleTorqueMax', e.target.value)} /> %(9) (ground)
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '25px'}} className={getInputClass('idleITT')} value={limitsData.idleITT || ''} onChange={(e) => handleLimitsChange('idleITT', e.target.value)} /> MAX</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '25px'}} className={getInputClass('idleN1GroundBottom')} value={limitsData.idleN1GroundBottom || ''} onChange={(e) => handleLimitsChange('idleN1GroundBottom', e.target.value)} /> <span style={{fontSize: '9px'}}>to</span>
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleN1GroundTop')} value={limitsData.idleN1GroundTop || ''} onChange={(e) => handleLimitsChange('idleN1GroundTop', e.target.value)} /><span style={{fontSize: '9px'}}>(ground)</span><br/>
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleN1Flight')} value={limitsData.idleN1Flight || ''} onChange={(e) => handleLimitsChange('idleN1Flight', e.target.value)} /> <span style={{fontSize: '9px'}}>Min (flight)</span>
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleNpGroundBottom')} value={limitsData.idleNpGroundBottom || ''} onChange={(e) => handleLimitsChange('idleNpGroundBottom', e.target.value)} /> to
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleNpGroundTop')} value={limitsData.idleNpGroundTop || ''} onChange={(e) => handleLimitsChange('idleNpGroundTop', e.target.value)} /> <br/>(ground)
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleOilPress')} value={limitsData.idleOilPress || ''} onChange={(e) => handleLimitsChange('idleOilPress', e.target.value)} /> Min</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleOilTempGroundMin')} value={limitsData.idleOilTempGroundMin || ''} onChange={(e) => handleLimitsChange('idleOilTempGroundMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleOilTempGroundMax')} value={limitsData.idleOilTempGroundMax || ''} onChange={(e) => handleLimitsChange('idleOilTempGroundMax', e.target.value)} /> (Grnd)<br/>
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleOilTempFlightMin')} value={limitsData.idleOilTempFlightMin || ''} onChange={(e) => handleLimitsChange('idleOilTempFlightMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleOilTempFlightMax')} value={limitsData.idleOilTempFlightMax || ''} onChange={(e) => handleLimitsChange('idleOilTempFlightMax', e.target.value)} /> (Flt)<br/>
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleOilTempCautionMin')} value={limitsData.idleOilTempCautionMin || ''} onChange={(e) => handleLimitsChange('idleOilTempCautionMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('idleOilTempCautionMax')} value={limitsData.idleOilTempCautionMax || ''} onChange={(e) => handleLimitsChange('idleOilTempCautionMax', e.target.value)} /> (7)
                  </td>
                </tr>
                <tr>
                  <td style={limitTdStyle}>START</td>
                  <td style={{...limitTdStyle, background: '#606060ff', fontWeight: 'bold'}}>- - -</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '90px'}} className={getInputClass('startITT5sec')} value={limitsData.startITT5sec || ''} onChange={(e) => handleLimitsChange('startITT5sec', e.target.value)} /> <br/>
                    (<input type="text" style={{...inputStyle, width: '20px'}} className={getInputClass('startITTTime')} value={limitsData.startITTTime || ''} onChange={(e) => handleLimitsChange('startITTTime', e.target.value)} />  sec)
                  </td>
                  <td style={{...limitTdStyle, background: '#606060ff', fontWeight: 'bold'}}>---</td>
                  <td style={{...limitTdStyle, background: '#606060ff', fontWeight: 'bold'}}>---</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('startOilPress')} value={limitsData.startOilPress || ''} onChange={(e) => handleLimitsChange('startOilPress', e.target.value)} /> Max</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('startOilTemp')} value={limitsData.startOilTemp || ''} onChange={(e) => handleLimitsChange('startOilTemp', e.target.value)} /> Min</td>
                </tr>
                <tr>
                  <td style={limitTdStyle}>TRANSIENT</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('transientTorque5secMin')} value={limitsData.transientTorque5secMin || ''} onChange={(e) => handleLimitsChange('transientTorque5secMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('transientTorque5secMax')} value={limitsData.transientTorque5secMax || ''} onChange={(e) => handleLimitsChange('transientTorque5secMax', e.target.value)} />  <br/>
                    (<input type="text" style={{...inputStyle, width: '20px'}} className={getInputClass('transientTorqueTime')} value={limitsData.transientTorqueTime || ''} onChange={(e) => handleLimitsChange('transientTorqueTime', e.target.value)} /> sec) (10)
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '90px'}} className={getInputClass('transientITT20sec')} value={limitsData.transientITT20sec || ''} onChange={(e) => handleLimitsChange('transientITT20sec', e.target.value)} />  <br/>
                   (<input type="text" style={{...inputStyle, width: '20px'}} className={getInputClass('transientITTTime')} value={limitsData.transientITTTime || ''} onChange={(e) => handleLimitsChange('transientITTTime', e.target.value)} /> sec)
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('transientN1')} value={limitsData.transientN1 || ''} onChange={(e) => handleLimitsChange('transientN1', e.target.value)} /> MAX</td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '25px'}} className={getInputClass('transientNp20sec')} value={limitsData.transientNp20sec || ''} onChange={(e) => handleLimitsChange('transientNp20sec', e.target.value)} />
                    <span style={{fontSize: '9px'}}>(</span><input type="text" style={{...inputStyle, width: '20px'}} className={getInputClass('transientNpTime')} value={limitsData.transientNpTime || ''} onChange={(e) => handleLimitsChange('transientNpTime', e.target.value)} /><span style={{fontSize: '9px'}}>sec) (3)</span>
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('transientOilPressMin')} value={limitsData.transientOilPressMin || ''} onChange={(e) => handleLimitsChange('transientOilPressMin', e.target.value)} /> to 
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('transientOilPressMax')} value={limitsData.transientOilPressMax || ''} onChange={(e) => handleLimitsChange('transientOilPressMax', e.target.value)} /> (5)
                  </td>
                  <td style={limitTdStyle}><input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('transientOilTemp10minMin')} value={limitsData.transientOilTemp10minMin || ''} onChange={(e) => handleLimitsChange('transientOilTemp10minMin', e.target.value)} /> to
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('transientOilTemp10minMax')} value={limitsData.transientOilTemp10minMax || ''} onChange={(e) => handleLimitsChange('transientOilTemp10minMax', e.target.value)} />  <br/>
                    (<input type="text" style={{...inputStyle, width: '20px'}} className={getInputClass('transientOilTempTime')} value={limitsData.transientOilTempTime || ''} onChange={(e) => handleLimitsChange('transientOilTempTime', e.target.value)} /> minutes)
                  </td>
                </tr>
              </tbody>
            </table>

            {/* NOTES TABLE */}
            <table style={limitTableStyle}>
              <thead>
                <tr>
                  <th style={limitThStyle} colSpan="2">NOTES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>1.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    N<sub>1</sub> values presented for PMU ON. With PMU OFF, N<sub>1</sub> may vary from these values.
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>2.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    With PMU OFF, permissible maximum N<sub>P</sub> is {' '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note21')} value={limitsData['note21'] || ''} onChange={(e) => handleLimitsChange('note21', e.target.value)} />{' +/- '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note22')} value={limitsData['note22'] || ''} onChange={(e) => handleLimitsChange('note22', e.target.value)} />{'%.'}
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>3.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    Permissible at any operating condition “power setting” for completion of an in-flight emergency. 
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>4.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    Avoid stabilized ground operation from{' '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note41')} value={limitsData['note41'] || ''} onChange={(e) => handleLimitsChange('note41', e.target.value)} />{' to '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note42')} value={limitsData['note42'] || ''} onChange={(e) => handleLimitsChange('note42', e.target.value)} />{'% '}N<sub>P</sub>
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>5.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    Operation in this range permitted only during aerobatics or spins, and{' '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note51')} value={limitsData['note51'] || ''} onChange={(e) => handleLimitsChange('note51', e.target.value)} />{' to '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note52')} value={limitsData['note52'] || ''} onChange={(e) => handleLimitsChange('note52', e.target.value)} />{' psi for '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note53')} value={limitsData['note53'] || ''} onChange={(e) => handleLimitsChange('note53', e.target.value)} />{' seconds with PCL at IDLE'}
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>6.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    Normal oil pressure during steady state conditions is{' '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note61')} value={limitsData['note61'] || ''} onChange={(e) => handleLimitsChange('note61', e.target.value)} />{' to '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note62')} value={limitsData['note62'] || ''} onChange={(e) => handleLimitsChange('note62', e.target.value)} />{' psi. Operation at oil pressure less than '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note63')} value={limitsData['note63'] || ''} onChange={(e) => handleLimitsChange('note63', e.target.value)} />{' '}
                     psi at flight idle or above is indicative of oil system malfunction. 
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>7.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    Acceptable for ground operation at and below{' '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note71')} value={limitsData['note71'] || ''} onChange={(e) => handleLimitsChange('note71', e.target.value)} />{'% torque'}
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>8.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    The PMU will govern maximum torque at{' '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note81')} value={limitsData['note81'] || ''} onChange={(e) => handleLimitsChange('note81', e.target.value)} />{' +/- '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note82')} value={limitsData['note82'] || ''} onChange={(e) => handleLimitsChange('note82', e.target.value)} />{' %. Torque above '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note83')} value={limitsData['note83'] || ''} onChange={(e) => handleLimitsChange('note83', e.target.value)} />{' '}
                    % at a constant PCL setting and steady flight is indicative of a governing system malfunction. 
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>9.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    Allowable torque range with N<sub>P</sub> stabilized and PCL at IDLE. 
                  </td>
                </tr>
                <tr>
                  <td style={{...limitTdStyle, width: '3%', fontWeight: 'bold'}}>10.</td>
                  <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>
                    With the PMU on, torque between{' '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note101')} value={limitsData['note101'] || ''} onChange={(e) => handleLimitsChange('note101', e.target.value)} />{' to '}
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note102')} value={limitsData['note102'] || ''} onChange={(e) => handleLimitsChange('note102', e.target.value)} />{' '}
                    % is possible following rapid PCL movement or aerobatic maneuvers. Torque above
                    <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('note103')} value={limitsData['note103'] || ''} onChange={(e) => handleLimitsChange('note103', e.target.value)} />{' '}
                    % is a limiting system malfunction.
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TWO COLUMN LAYOUT WITH SEPARATE TABLES */}
            <div style={{display: 'flex', gap: '0px', alignItems: 'flex-start'}}>
              {/* LEFT COLUMN */}
              <div style={{flex: 1}}>
                {/* AIRSPEED LIMITATIONS */}
                <table style={limitTableStyle}>
                  <thead>
                    <tr>
                      <th style={limitThStyle} colSpan="2">AIRSPEED LIMITATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">MAXIMUM AIRSPEED GEAR DOWN (V<sub>LE</sub>) & FLAP DOWN (V<sub>FE</sub>){' '}
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('vleVfe')} value={limitsData.vleVfe || ''} onChange={(e) => handleLimitsChange('vleVfe', e.target.value)} />{' KIAS'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">MAX OPERATING (V<sub>MO</sub>){' '}
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('vmo')} value={limitsData.vmo || ''} onChange={(e) => handleLimitsChange('vmo', e.target.value)} />{' KIAS '}
                        / MAX MACH (M<sub>MO</sub>){' '}
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('mmo')} value={limitsData.mmo || ''} onChange={(e) => handleLimitsChange('mmo', e.target.value)} />{' MACH'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">TURBULENT AIR PENETRATION SPEED, MAXIMUM:{' '}
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('turbPen')} value={limitsData.turbPen || ''} onChange={(e) => handleLimitsChange('turbPen', e.target.value)} />{' KIAS'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* PROHIBITED MANEUVERS */}
                <table style={limitTableStyle}>
                  <thead>
                    <tr>
                      <th style={{...limitThStyle, paddingTop: '20px', paddingBottom: '20px'}} colSpan="2">PROHIBITED MANEUVERS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">1. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib1')} value={limitsData.prohib1 || ''} onChange={(e) => handleLimitsChange('prohib1', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">2. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib2')} value={limitsData.prohib2 || ''} onChange={(e) => handleLimitsChange('prohib2', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">3. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib3')} value={limitsData.prohib3 || ''} onChange={(e) => handleLimitsChange('prohib3', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">4. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib4')} value={limitsData.prohib4 || ''} onChange={(e) => handleLimitsChange('prohib4', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">5. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib5')} value={limitsData.prohib5 || ''} onChange={(e) => handleLimitsChange('prohib5', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">6. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib6')} value={limitsData.prohib6 || ''} onChange={(e) => handleLimitsChange('prohib6', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">7. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib7')} value={limitsData.prohib7 || ''} onChange={(e) => handleLimitsChange('prohib7', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">8. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib8')} value={limitsData.prohib8 || ''} onChange={(e) => handleLimitsChange('prohib8', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">9. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib9')} value={limitsData.prohib9 || ''} onChange={(e) => handleLimitsChange('prohib9', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">
                        <span style={{display: 'inline'}}>10. </span>
                        <textarea
                          style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 30px)', height: 'auto', minHeight: '20px', resize: 'none', display: 'inline-block', verticalAlign: 'top', overflow: 'hidden'}}
                          className={getInputClass('prohib10')}
                          value={limitsData.prohib10 || ''}
                          onChange={(e) => {
                            handleLimitsChange('prohib10', e.target.value);
                            // Auto-resize height based on content
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">11. <input type="text" style={{...inputStyle, textAlign: 'left', width: 'calc(100% - 20px)'}} className={getInputClass('prohib11')} value={limitsData.prohib11 || ''} onChange={(e) => handleLimitsChange('prohib11', e.target.value)} /></td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">THE AIRCRAFT HAS BEEN APPROVED ONLY FOR TRANSIT THROUGH <input type="text" style={{...inputStyle, width: '50px'}} className={getInputClass('iceFeet')} value={limitsData.iceFeet || ''} onChange={(e) => handleLimitsChange('iceFeet', e.target.value)} /> FEET OF <input type="text" style={{...inputStyle, width: '90px'}} className={getInputClass('iceType')} value={limitsData.iceType || ''} onChange={(e) => handleLimitsChange('iceType', e.target.value)} /> ICE.</td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>MINIMUM BATTERY VOLTAGE:{' '}
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('minBattVolt')} value={limitsData.minBattVolt || ''} onChange={(e) => handleLimitsChange('minBattVolt', e.target.value)} />{' VOLTS'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">HYDRAULIC CAUTION: &lt; 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('hydCautionMin')} value={limitsData.hydCautionMin || ''} onChange={(e) => handleLimitsChange('hydCautionMin', e.target.value)} /> PSI, &gt; 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('hydCautionMax')} value={limitsData.hydCautionMax || ''} onChange={(e) => handleLimitsChange('hydCautionMax', e.target.value)} /> PSI
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">FUEL CAUTION LIGHT: &lt; 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('fuelCaution')} value={limitsData.fuelCaution || ''} onChange={(e) => handleLimitsChange('fuelCaution', e.target.value)} /> 
                        POUNDS IN RESPECTIVE WING TANK
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">COCKPIT PRESSURIZATION SCHEDULE LIMIT: 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('cockpitPress')} value={limitsData.cockpitPress || ''} onChange={(e) => handleLimitsChange('cockpitPress', e.target.value)} /> 
                        +/- <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('cockpitPressTol')} value={limitsData.cockpitPressTol || ''} onChange={(e) => handleLimitsChange('cockpitPressTol', e.target.value)} /> PSI</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{flex: 1}}>
                {/* STARTER CYCLE LIMITATIONS */}
                <table style={limitTableStyle}>
                  <thead>
                    <tr>
                      <th style={limitThStyle} colSpan="2">STARTER CYCLE LIMITATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">STARTER DUTY CYCLE IS LIMITED TO FOUR{' '}
                        <input type="text" style={{...inputStyle, width: '45px'}} className={getInputClass('starterCycles')} value={limitsData.starterCycles || ''} onChange={(e) => handleLimitsChange('starterCycles', e.target.value)} />{' '}
                        CYCLES
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">COOLING PERIOD AFTER FIRST STARTER CYCLE{' '}
                        <input type="text" style={{...inputStyle, width: '45px'}} className={getInputClass('coolingFirst')} value={limitsData.coolingFirst || ''} onChange={(e) => handleLimitsChange('coolingFirst', e.target.value)} /> 
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">COOLING PERIOD AFTER SECOND STARTER CYCLE{' '}
                        <input type="text" style={{...inputStyle, width: '45px'}} className={getInputClass('coolingSecond')} value={limitsData.coolingSecond || ''} onChange={(e) => handleLimitsChange('coolingSecond', e.target.value)} /> 
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">COOLING PERIOD AFTER THIRD STARTER CYCLE{' '}
                        <input type="text" style={{...inputStyle, width: '45px'}} className={getInputClass('coolingThird')} value={limitsData.coolingThird || ''} onChange={(e) => handleLimitsChange('coolingThird', e.target.value)} /> 
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">COOLING PERIOD AFTER FOURTH STARTER CYCLE{' '}
                        <input type="text" style={{...inputStyle, width: '45px'}} className={getInputClass('coolingFourth')} value={limitsData.coolingFourth || ''} onChange={(e) => handleLimitsChange('coolingFourth', e.target.value)} /> 
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/*FLIGHT MANUEVERING LIMITATIONS*/}
                <table style={limitTableStyle}>
                  <thead>
                    <tr>
                      <th style={limitThStyle} colSpan="2">FLIGHT MANUEVERING LIMITATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px', width: '70%'}}>INVERTED FLIGHT</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('invertedFlight')} value={limitsData.invertedFlight || ''} onChange={(e) => handleLimitsChange('invertedFlight', e.target.value)} />{' sec'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>INTENTIONAL ZERO G FLIGHT</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('zeroG')} value={limitsData.zeroG || ''} onChange={(e) => handleLimitsChange('zeroG', e.target.value)} />{' sec'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>NEGATIVE G OPERATIONS</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('negG')} value={limitsData.negG || ''} onChange={(e) => handleLimitsChange('negG', e.target.value)} />{' sec'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>DO NOT EXCEED -2.5 G FOR LONGER THAN</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('negG25')} value={limitsData.negG25 || ''} onChange={(e) => handleLimitsChange('negG25', e.target.value)} />{' sec'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>MIN. POS Gs UPRIGHT BEFORE ADDITIONAL NEG Gs </td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('minPosG')} value={limitsData.minPosG || ''} onChange={(e) => handleLimitsChange('minPosG', e.target.value)} />{' sec'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ACCELERATION LIMITATIONS */}
                <table style={limitTableStyle}>
                  <thead>
                    <tr>
                      <th style={limitThStyle} colSpan="2">ACCELERATION LIMITATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px', width: '60%'}}>SYMMETRIC CLEAN</td>
                      <td style={limitTdStyle}>+ <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('symCleanPos')} value={limitsData.symCleanPos || ''} onChange={(e) => handleLimitsChange('symCleanPos', e.target.value)} /> TO 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('symCleanNeg')} value={limitsData.symCleanNeg || ''} onChange={(e) => handleLimitsChange('symCleanNeg', e.target.value)} /> Gs
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>SYMMETRIC GEAR & FLAPS EXTENDED</td>
                      <td style={limitTdStyle}>+ <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('symGearFlapsPos')} value={limitsData.symGearFlapsPos || ''} onChange={(e) => handleLimitsChange('symGearFlapsPos', e.target.value)} /> TO 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('symGearFlapsNeg')} value={limitsData.symGearFlapsNeg || ''} onChange={(e) => handleLimitsChange('symGearFlapsNeg', e.target.value)} /> Gs
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>ASYMMETRIC CLEAN</td>
                      <td style={limitTdStyle}>+ <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('asymCleanPos')} value={limitsData.asymCleanPos || ''} onChange={(e) => handleLimitsChange('asymCleanPos', e.target.value)} /> TO 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('asymCleanNeg')} value={limitsData.asymCleanNeg || ''} onChange={(e) => handleLimitsChange('asymCleanNeg', e.target.value)} /> Gs
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>ASYMMETRIC GEAR & FLAPS EXTENDED</td>
                      <td style={limitTdStyle}>+ <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('asymGearFlapsPos')} value={limitsData.asymGearFlapsPos || ''} onChange={(e) => handleLimitsChange('asymGearFlapsPos', e.target.value)} /> TO 
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('asymGearFlapsNeg')} value={limitsData.asymGearFlapsNeg || ''} onChange={(e) => handleLimitsChange('asymGearFlapsNeg', e.target.value)} /> Gs
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}} colSpan="2">UNCOORDINATED ROLLING MANEUVERS INITIATED AT {' '}
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('negOne')} value={limitsData.negOne || ''} onChange={(e) => handleLimitsChange('negOne', e.target.value)} /> {' '}
                         G SHALL BE LIMITED TO A  {' '}
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('bankAngleChange')} value={limitsData.bankAngleChange || ''} onChange={(e) => handleLimitsChange('bankAngleChange', e.target.value)} /> {' '}
                        DEGREE BANK ANGLE CHANGE
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* OTHER LIMITATIONS */}
                <table style={limitTableStyle}>
                  <thead>
                    <tr>
                      <th style={limitThStyle} colSpan="2">OTHER LIMITATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px', width: '70%'}}>MIN VOLTAGE FOR BATTERY START</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('minBattStart')} value={limitsData.minBattStart || ''} onChange={(e) => handleLimitsChange('minBattStart', e.target.value)} />{' VOLTS'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>MAX CROSSWIND FOR DRY RUNWAY</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('maxCrosswindDry')} value={limitsData.maxCrosswindDry || ''} onChange={(e) => handleLimitsChange('maxCrosswindDry', e.target.value)} />{' KNOTS'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>MAX CROSSWIND FOR WET RUNWAY</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('maxCrosswindWet')} value={limitsData.maxCrosswindWet || ''} onChange={(e) => handleLimitsChange('maxCrosswindWet', e.target.value)} />{' KNOTS'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>MAX CROSSWIND FOR ICY RUNWAY</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('maxCrosswindIcy')} value={limitsData.maxCrosswindIcy || ''} onChange={(e) => handleLimitsChange('maxCrosswindIcy', e.target.value)} />{' KNOTS'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>MAX TAILWIND COMPONENT FOR TAKEOFF</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('maxTailwind')} value={limitsData.maxTailwind || ''} onChange={(e) => handleLimitsChange('maxTailwind', e.target.value)} />{' KNOTS'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{...limitTdStyle, textAlign: 'left', paddingLeft: '8px'}}>MAXIMUM FUEL FLOW</td>
                      <td style={limitTdStyle}>
                        <input type="text" style={{...inputStyle, width: '30px'}} className={getInputClass('maxFuelFlow')} value={limitsData.maxFuelFlow || ''} onChange={(e) => handleLimitsChange('maxFuelFlow', e.target.value)} />{' PPH OR LESS'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {isRandomMode && (
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            Random Mode: Limit {currentLimitIndex + 1} of {limitIndices.length}
          </div>
        )}
        {!isGameActive && (
          <div className="button-row" style={{ justifyContent: 'center', marginTop: '20px' }}>
            <button onClick={nextAnswer}>Next Answer</button>
            <button onClick={allAnswers}>All Answers</button>
            <button onClick={checkAnswers}>Check Answers</button>
            <button onClick={resetAnswers}>Reset</button>
            <button
              onClick={() => {
                if (isRandomMode) {
                  stopRandomMode();
                } else {
                  startRandomMode();
                }
              }}
              style={{
                backgroundColor: isRandomMode ? '#4CAF50' : '#f0f0f0',
                color: isRandomMode ? 'white' : 'black',
                fontWeight: isRandomMode ? 'bold' : 'normal',
                border: isRandomMode ? '2px solid #45a049' : '1px solid #ccc',
                boxShadow: isRandomMode ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Random Mode
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default TW4Limits;
