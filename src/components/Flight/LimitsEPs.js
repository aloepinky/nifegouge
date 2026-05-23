import React, { useState, useEffect, useRef } from 'react';
import { normalizeAnswer } from '../../utils/answerUtils';

function LimitsEPs() {
  const [showEPs, setShowEPs] = useState(false);
  const [limitsData, setLimitsData] = useState({});
  const [epsData, setEpsData] = useState({});
  const [checkResults, setCheckResults] = useState({});
  const [flapsPosition, setFlapsPosition] = useState(30);
  const [fuelSelector, setFuelSelector] = useState('BOTH');
  const [magsPosition, setMagsPosition] = useState('BOTH (Start if prop stopped)');
  const [switches, setSwitches] = useState({
    master: true,
    avionics: true,
    electrical: true,
    cabinHeat: true,
    vents: true
  });
  const [isDraggingMags, setIsDraggingMags] = useState(false);
  const [tempMagsAngle, setTempMagsAngle] = useState(0);
  const [throttleState, setThrottleState] = useState(2);
  const [mixtureState, setMixtureState] = useState(1);
  
  // Game Mode states
  const [showGameModal, setShowGameModal] = useState(false);
  const [gameMode, setGameMode] = useState('Limits');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameScore, setGameScore] = useState(null);
  const [completedLimits, setCompletedLimits] = useState(false);
  const [limitsTime, setLimitsTime] = useState(0);
  const [epsTime, setEpsTime] = useState(0);
  const timerInterval = useRef(null);

  //Leaderboard Variables
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState({});
    const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('Limits');
    const [showSubmitForm, setShowSubmitForm] = useState(false);
    const [submitFormData, setSubmitFormData] = useState({
        playerName: '',
        country: '',
        branch: '',
        designator: '',
        nifeClass: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customCountry, setCustomCountry] = useState('');
    const [customBranch, setCustomBranch] = useState('');
    const [customDesignator, setCustomDesignator] = useState('');

    const API_BASE_URL = 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod';

  // Answer keys
  const limitsAnswers = {
    tachMin: '2100-2450',
    tachMax: '2700',
    oilTempNormal: '100-245',
    oilTempMax: '245',
    oilPressMin: '25',
    oilPressNormal: '60-90',
    oilPressMax: '115',
    oilQuantMin: '6',
    oilQuantNormal: '6-7',
    oilQuantMax: '8',
    carbTemp: '-15 to 5',
    starterDuty: 'Crank 10 sec Cool 20 sec after 3 cycles 10 min cooling',
    maxWeight: '2550',
    baggage: '120',
    fuelCapacity: '43',
    maxCrosswind: '15',
    maxBank: '60',
    serviceCeiling: '14200',
    wingspan: '36',
    flapsUpMax: '3.8 to -1.52',
    flapsDownMax: '3 to 0',
    vne: '158',
    vno: '127',
    va: '105',
    vfe: '85',
    vy: '73',
    vx: '62',
    vglide: '68',
    vr: '55',
    vs: '50',
    vso: '40'
  };

  const epsAnswers = {
    efat1: 'Airspeed',
    efat1val: '68 KIAS',
    efat2: 'Turn Towards Nearest Suitable Landing Site',
    efat2val: '',
    efat3: 'Fuel Selector',
    efat3val: 'OFF',
    efat4: 'Mixture',
    efat4val: 'IDLE CUTOFF',
    efat5: 'Flaps',
    efat5val: 'AS REQ',
    efat6: 'Mags',
    efat6val: 'OFF',
    efat7: 'Master',
    efat7val: 'OFF',
    efat8: 'Doors',
    efat8val: 'UNLATCHED',
    efif1: 'Airspeed',
    efif1val: '68 KIAS',
    efif2: 'Turn towards nearest suitable landing site',
    efif2val: '',
    efif3: 'Fuel Selector',
    efif3val: 'BOTH',
    efif4: 'Mixture',
    efif4val: 'FULL RICH',
    efif5: 'Throttle',
    efif5val: 'FULL',
    efif6: 'Carb Heat',
    efif6val: 'ON',
    efif7: 'Mags',
    efif7val: 'BOTH (Start if prop stopped)',
    efif8: 'Master',
    efif8val: 'ON',
    efif9: 'Primer',
    efif9val: 'IN/LOCKED',
    efiff1: 'Fuel Selector',
    efiff1val: 'OFF',
    efiff2: 'Mixture',
    efiff2val: 'IDLE CUTOFF',
    efiff3: 'Declare',
    efiff3val: 'MAYDAY',
    efiff4: 'Master',
    efiff4val: 'OFF',
    efiff5: 'Cabin Heat / Air',
    efiff5val: 'OFF',
    efiff6: 'Turn Towards Nearest Suitable Landing Site',
    efiff6val: '',
    abort1: 'Throttle',
    abort1val: 'IDLE',
    abort2: 'Brakes',
    abort2val: 'AS REQ',
    abort3: 'Maintain Directional Control',
    abort3val: '',
    abort4: 'Emergency Shutdown on Deck',
    abort4val: 'EXECUTE',
    esd1: 'Fuel Selector',
    esd1val: 'OFF',
    esd2: 'Mixture',
    esd2val: 'IDLE CUTOFF',
    esd3: 'Mags',
    esd3val: 'OFF',
    esd4: 'Master',
    esd4val: 'OFF',
    esd5: 'Aircraft',
    esd5val: 'EVACUATE AS REQ',
    efds1: 'Cranking',
    efds1val: 'CONTINUE',
    efds2: 'Throttle',
    efds2val: '1700 RPM (5 sec)',
    efds3: 'Emergency Shutdown On Deck',
    efds3val: 'EXECUTE',
    efds4: 'Throttle',
    efds4val: 'FULL',
    efds5: 'Emergency Shutdown on Deck',
    efds5val: 'EXECUTE',
    elec1: 'Master',
    elec1val: 'OFF',
    elec2: 'Avionics Power Switch',
    elec2val: 'OFF',
    elec3: 'All Electrical Equipment',
    elec3val: 'OFF',
    elec4: 'Vents / Cabin Air',
    elec4val: 'CLOSED',
    elec5: 'Fire Extinguisher',
    elec5val: 'ACTIVATE AS REQ',
    elec6: 'Cabin Windows',
    elec6val: 'OPEN AS REQ',
    elec7: 'Land As Soon As Possible',
    elec7val: '',
  };

  // Timer effect
  useEffect(() => {
    if (isGameActive && gameStartTime) {
      timerInterval.current = setInterval(() => {
        setElapsedTime(Date.now() - gameStartTime);
      }, 10);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [isGameActive, gameStartTime]);

  // Check if all fields are filled
  const checkIfComplete = () => {
    const answers = showEPs ? epsAnswers : limitsAnswers;
    const data = showEPs ? epsData : limitsData;
    
    for (let key of Object.keys(answers)) {
      // Skip val fields if the main field is empty for EPs
      if (showEPs && key.endsWith('val')) {
        const baseKey = key.replace('val', '');
        if (!data[baseKey] || data[baseKey].trim() != '') {
          continue;
        }
      }
      if(key === "oilQuantMin"||key === "oilQuantMax"){continue;}
      if (!data[key] || data[key].trim().length < 2) {
        return false;
      }
    }
    return true;
  };

  // Calculate score
  const calculateScore = () => {
    const answers = showEPs ? epsAnswers : limitsAnswers;
    const data = showEPs ? epsData : limitsData;
    let correct = 0;
    let total = 0;

    Object.keys(answers).forEach(key => {
      // Skip val fields if the main field is empty for EPs
      if (showEPs && key.endsWith('val')) {
        const baseKey = key.replace('val', '');
        if (!data[baseKey] || data[baseKey].trim() === '') {
          return;
        }
      }
      
      total++;
      let userAnswer = data[key] || '';
      userAnswer = userAnswer.replace(/,/g, '');
      const correctAnswer = answers[key];
      
      const isRange = /\d\s*(to|-)\s*-?\d/.test(correctAnswer);
      
      if (isRange) {
        const normalizedUser = userAnswer.toString().replace(/\s+/g, '').replace(/to/i, '-');
        const normalizedCorrect = correctAnswer.replace(/\s+/g, '').replace(/to/i, '-');
        if (normalizedUser === normalizedCorrect) correct++;
      } else {
        const normalizedUser = userAnswer.toString().trim().toLowerCase();
        const normalizedCorrect = correctAnswer.toString().toLowerCase();
        if (normalizedUser === normalizedCorrect) correct++;
      }
    });

    return Math.round((correct / total) * 100);
  };

  // Start game
  const startGame = () => {
    resetAnswers()
    setShowGameModal(false);
    setIsGameActive(true);
    setGameStartTime(Date.now());
    setElapsedTime(0);
    setGameScore(null);
    setCompletedLimits(false);
  
    // Reset time tracking
    setLimitsTime(0);
    setEpsTime(0);
    
    // Reset data
    setLimitsData({});
    setEpsData({});
    setCheckResults({});
    
    // Set initial page based on game mode
    if (gameMode === 'EPs') {
      setShowEPs(true);
    } else {
      setShowEPs(false);
    }
  };

  // End game
  const endGame = () => {
    setIsGameActive(false);
    checkAnswers();
    const score = calculateScore();
    
    let gameData;
    if (gameMode === 'EPs_and_Limits') {
        gameData = {
        score,
        elapsedTime,
        limitsTime: limitsTime,
        epsTime: epsTime || (elapsedTime - limitsTime),
        totalTime: formatTime(elapsedTime),
        limitsTimeFormatted: formatTime(limitsTime),
        epsTimeFormatted: formatTime(epsTime || (elapsedTime - limitsTime)),
        gameMode
        };
    } else {
        gameData = {
        score,
        elapsedTime,
        totalTime: formatTime(elapsedTime),
        gameMode
        };
    }
    
    setGameScore(gameData);
  };

  // Format time display
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  // Check for completion in game mode
  useEffect(() => {
    if (isGameActive && checkIfComplete()) {
      if (gameMode === 'EPs_and_Limits') {
        if (!showEPs && !completedLimits) {
          // Just completed Limits, record time and move to EPs
          const limitsEnd = Date.now();
          setLimitsTime(limitsEnd - gameStartTime);
          setCompletedLimits(true);
          setShowEPs(true);
        } else if (showEPs) {
          // Completed EPs (and already did Limits)
          const totalTime = Date.now() - gameStartTime;
          const epsTimeTaken = totalTime - limitsTime;
          setEpsTime(epsTimeTaken);
          endGame();
        }
      } else if (gameMode === 'Limits') {
        const limitsEnd = Date.now();
        setLimitsTime(limitsEnd - gameStartTime);
        endGame();
        } else if (gameMode === 'EPs') {
        const epsEnd = Date.now();
        setEpsTime(epsEnd - gameStartTime);
        endGame();
        }
    }
  }, [limitsData, epsData, isGameActive, showEPs, gameMode, completedLimits]);

  // Auto-resize inputs based on content
  useEffect(() => {
    const resizeInput = (input) => {
      if (!input) return;
      
      // Create a temporary span to measure text width
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'nowrap';
      span.style.fontSize = window.getComputedStyle(input).fontSize;
      span.style.fontFamily = window.getComputedStyle(input).fontFamily;
      span.textContent = input.value || input.placeholder || '';
      
      document.body.appendChild(span);
      const textWidth = span.getBoundingClientRect().width;
      document.body.removeChild(span);
      
      // Set minimum widths and add padding
      const isFirstInput = input.parentElement?.children[0] === input;
      const minWidth = isFirstInput ? 100 : 60;
      const padding = -20; // Account for input padding
      const newWidth = Math.max(minWidth, textWidth + padding);
      
      input.style.width = `${newWidth}px`;
      input.style.flexBasis = `${newWidth}px`;
    };

    const handleInputChange = (e) => {
      resizeInput(e.target);
    };

    // Add event listeners to all EP inputs
    const epInputs = document.querySelectorAll('.ep-input-pair input');
    epInputs.forEach(input => {
      input.addEventListener('input', handleInputChange);
      // Initial resize
      resizeInput(input);
    });

    // Cleanup
    return () => {
      const epInputs = document.querySelectorAll('.ep-input-pair input');
      epInputs.forEach(input => {
        input.removeEventListener('input', handleInputChange);
      });
    };
  }, [epsData, showEPs]); // Re-run when data changes or when switching views
  
  // Find next appropriate input and populate it
  const populateNextEmptyInput = (action, value = '') => {
    const allFields = Object.keys(epsAnswers);
    
    // Find the most recently filled field (last non-empty field)
    let lastFilledField = null;
    for (let i = allFields.length - 1; i >= 0; i--) {
      const field = allFields[i];
      if (epsData[field] && epsData[field] !== '') {
        lastFilledField = field;
        break;
      }
    }
    
    // Check if the most recent entry is the same action
    if (lastFilledField && !lastFilledField.endsWith('val')) {
      // This is a main field, check if it matches our action
      if (epsData[lastFilledField] === action) {
        // Update the value field of this most recent entry
        const valField = lastFilledField + 'val';
        if (value && allFields.includes(valField)) {
          setEpsData(prev => ({ ...prev, [valField]: value }));
        }
        return; // Exit early, we updated the most recent field
      }
    } else if (lastFilledField && lastFilledField.endsWith('val')) {
      // Most recent field is a val field, check the corresponding main field
      const mainField = lastFilledField.replace('val', '');
      let lastCheck = epsData[mainField];
      if(lastCheck === "Cranking"){lastCheck = "Mags"}
      let currentCheck = action;
      if(currentCheck === "Cranking"){currentCheck = "Mags"}
      if (lastCheck === currentCheck) {
        // Update the value field of this most recent entry
        if (value) {
          setEpsData(prev => ({ ...prev, [mainField]: action,  [lastFilledField]: value }));
        }
        return; // Exit early, we updated the most recent field
      }
    }
    
    // No matching recent field found, find the next empty row (where main field is empty)
    for (let field of allFields) {
      if (!field.endsWith('val')) { // Only check main fields
        if (!epsData[field] || epsData[field] === '') {
          // This main field is empty, so this row is available
          setEpsData(prev => ({ ...prev, [field]: action }));
          
          // If we have a value, populate the corresponding val field
          if (value) {
            const valField = field + 'val';
            if (allFields.includes(valField)) {
              setEpsData(prev => ({ ...prev, [valField]: value }));
            }
          }
          break;
        }
      }
    }
  };

  const handleLimitsChange = (field, value) => {
    setLimitsData(prev => ({ ...prev, [field]: value }));
    setCheckResults(prev => ({ ...prev, [field]: '' }));
  };

  const handleEPsChange = (field, value) => {
    setEpsData(prev => ({ ...prev, [field]: value }));
    setCheckResults(prev => ({ ...prev, [field]: '' }));
  };

  const checkAnswers = () => {
    const results = {};
    const answers = showEPs ? epsAnswers : limitsAnswers;
    const data = showEPs ? epsData : limitsData;

    Object.keys(answers).forEach(key => {
      const rawUser = data[key] || '';
      const correctAnswer = answers[key];

      if (showEPs && key.endsWith('val')) {
        const baseKey = key.replace('val', '');
        const pairValue = data[baseKey] || '';

        if (pairValue.trim() === '') {
          results[key] = '';
          return;
        }
      }

      const isRange = /\d\s*(to|-)\s*-?\d/.test(correctAnswer);

      if (isRange) {
        const normalizedUser = rawUser.toString().toLowerCase().replace(/[,;()./]/g, '').replace(/\s+/g, '').replace(/to/i, '-');
        const normalizedCorrect = correctAnswer.toLowerCase().replace(/[,;()./]/g, '').replace(/\s+/g, '').replace(/to/i, '-');

        if (normalizedUser === normalizedCorrect) {
          results[key] = 'correct';
        } else if (normalizedUser === '') {
          results[key] = '';
        } else {
          results[key] = 'incorrect';
        }
      } else {
        const normalizedUser = normalizeAnswer(rawUser);
        const normalizedCorrect = normalizeAnswer(correctAnswer);

        if (normalizedUser === normalizedCorrect) {
          results[key] = 'correct';
        } else if (normalizedUser === '') {
          results[key] = '';
        } else {
          results[key] = 'incorrect';
        }
      }
    });

    setCheckResults(results);
  };

  const resetAnswers = () => {
    if (showEPs) {
      setEpsData({});
      setFlapsPosition(30);
      setFuelSelector('BOTH');
      setMagsPosition('BOTH (Start if prop stopped)');
      setSwitches({
        master: true,
        avionics: true,
        electrical: true,
        cabinHeat: true,
        vents: true});
      setIsDraggingMags(false);
      setTempMagsAngle(0);
      setThrottleState(2); // 0: Idle, 1: 1700 RPM (5 sec), 2: Full
      setMixtureState(1);
    } else {
      setLimitsData({});
    }
    setCheckResults({});
  };

  const deleteLastStep = () => {
    if (!showEPs) return; // Only works for EPs

    // Get all EP fields from the answers (same as used in populateNextEmptyInput)
    const allFields = Object.keys(epsAnswers);

    // Find the last filled field
    let lastFilledField = null;
    for (let i = allFields.length - 1; i >= 0; i--) {
      const field = allFields[i];
      if (epsData[field] && epsData[field] !== '') {
        lastFilledField = field;
        break;
      }
    }

    if (lastFilledField) {
      // Clear the last filled field
      setEpsData(prev => {
        const newData = { ...prev };
        
        if (lastFilledField.endsWith('val')) {
          // If it's a val field, also clear the corresponding main field
          const mainField = lastFilledField.replace('val', '');
          delete newData[mainField];
          delete newData[lastFilledField];
        } else {
          // If it's a main field, only clear that field
          delete newData[lastFilledField];
        }
        
        return newData;
      });
    }
  };

  const getInputClass = (field) => {
    if (checkResults[field] === 'correct') return 'correct-answer';
    if (checkResults[field] === 'incorrect') return 'incorrect-answer';
    return '';
  };

  // Control handlers
  const handleFuelSelector = (position) => {
    setFuelSelector(position);
    populateNextEmptyInput('Fuel Selector', position);
  };

  const handleSwitch = (name, displayName, value) => {
    setSwitches(prev => ({ ...prev, [name]: !prev[name] }));
    if(name === 'vents'){populateNextEmptyInput(displayName, !switches[name] ? 'ON' : 'CLOSED');}else{
    populateNextEmptyInput(displayName, !switches[name] ? 'ON' : 'OFF');}
  };

  const handleFlaps = (position) => {
    setFlapsPosition(position);
    populateNextEmptyInput('Flaps', 'As Req');
  };

  const handleThrottle = () => {
    const throttleStates = ['IDLE', '1700 RPM (5 sec)', 'FULL'];
    const nextState = (throttleState + 1) % throttleStates.length;
    setThrottleState(nextState);
    populateNextEmptyInput('Throttle', throttleStates[nextState]);
  };

  const handleMixture = () => {
    const mixtureStates = ['IDLE CUTOFF', 'FULL RICH'];
    const nextState = (mixtureState + 1) % mixtureStates.length;
    setMixtureState(nextState);
    populateNextEmptyInput('Mixture', mixtureStates[nextState]);
  };

  const getFuelRotation = () => {
    const positions = { 'OFF': 180, 'LEFT': 270, 'BOTH': 0, 'RIGHT': 90 };
    return positions[fuelSelector] || 0;
  };

  const getMagsRotation = () => {
    if (isDraggingMags) {
      return tempMagsAngle;
    }

    let positions = { 'OFF': 270, 'LEFT': 315, 'RIGHT': 0, 'BOTH (Start if prop stopped)': 45, 'CONTINUE': 90 };
    if(tempMagsAngle>270){
        positions = { 'OFF': 270, 'LEFT': 315, 'RIGHT': 360, 'BOTH (Start if prop stopped)': 45, 'CONTINUE': 90 };
    }
    return positions[magsPosition] || 0;
  };

  const snapToNearestMagsPosition = (angle) => {
    const positions = [
      { name: 'OFF', angle: 270 },    // W
      { name: 'LEFT', angle: 315 },   // NW
      { name: 'RIGHT', angle: 0 },    // N
      { name: 'BOTH (Start if prop stopped)', angle: 45 },    // NE
      { name: 'CONTINUE', angle: 90 }    // E
    ];
    let closest = positions[0];
    let minDiff = Math.abs(angle - positions[0].angle);

    // Handle angle wrapping for 0/360 degrees
    positions.forEach(pos => {
      let diff = Math.abs(angle - pos.angle);
      // Handle wraparound (e.g., 350 degrees is close to 10 degrees)
      if (diff > 180) {
        diff = 360 - diff;
      }
      if (diff < minDiff) {
        closest = pos;
        minDiff = diff;
      }
    });

    return closest.name;
  };

  const handleMagsMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingMags(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let finalAngle = tempMagsAngle;
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - centerX;
      const deltaY = moveEvent.clientY - centerY;
      
      // Calculate angle where top of screen (negative Y) is 0° (North)
      // Math.atan2 gives us angle from positive X axis, we need to convert to compass
      let mathAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      // Convert from math coordinates to compass coordinates:
      // Math: 0°=right, 90°=down  →  Compass: 0°=up, 90°=right
      let compassAngle = mathAngle + 90;
      
      // Normalize to 0-360 range
      if (compassAngle < 0) {
        compassAngle += 360;
      } else if (compassAngle >= 360) {
        compassAngle -= 360;
      }
      finalAngle = compassAngle
      if(compassAngle>=270 || compassAngle<=90){
        setTempMagsAngle(compassAngle);
      }else if(compassAngle>=180){
        setTempMagsAngle(270);
      }else{
        setTempMagsAngle(90);
      }
    };
    
    const handleMouseUp = () => {
      const finalPosition = snapToNearestMagsPosition(finalAngle);
      setMagsPosition(finalPosition);
      setIsDraggingMags(false);
      if (finalPosition === 'CONTINUE'){populateNextEmptyInput('Cranking', finalPosition);} else{
      populateNextEmptyInput('Mags', finalPosition);}
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

    const submitToLeaderboard = async () => {
        // Get final values (use custom if "OTHER" was selected)
        const finalCountry = submitFormData.country === 'OTHER' ? customCountry : submitFormData.country;
        const finalBranch = submitFormData.branch === 'OTHER' ? customBranch : submitFormData.branch;
        const finalDesignator = submitFormData.designator === 'OTHER' ? customDesignator : submitFormData.designator;
        
        if (!submitFormData.playerName || !finalCountry || 
            !finalBranch || !finalDesignator || !submitFormData.nifeClass) {
            alert('Please fill in all fields');
            return;
        }
        
        // Validate NIFE class format
        if (!/^\d{2}-\d{2}$/.test(submitFormData.nifeClass)) {
            alert('NIFE Class must be in format ##-## (e.g., 25-01)');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const payload = {
                testType: gameMode.replace(/ /g, '_'),
                elapsedTime: gameScore.elapsedTime,
                limitsTime: gameScore.limitsTime || null,
                epsTime: gameScore.epsTime || null,
                playerName: submitFormData.playerName,
                country: finalCountry,
                branch: finalBranch,
                designator: finalDesignator,
                nifeClass: submitFormData.nifeClass,
                score: 100
            };
            
            console.log('Submitting:', payload);
            
            const response = await fetch(`${API_BASE_URL}/submit-score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Score submitted successfully!');
                setShowSubmitForm(false);
                setGameScore(null);
                setIsGameActive(false);
                setSubmitFormData({ playerName: '', country: '', branch: '', designator: '', nifeClass: '' });
                viewLeaderboard();
            } else {
                alert('Failed to submit score: ' + data.error);
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            alert('Failed to submit score. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const viewLeaderboard = async () => {
        try {
            // Fetch data for all game modes
            const gameModes = ['Limits', 'EPs', 'EPs_and_Limits'];
            const allLeaderboardData = {};
            
            for (const mode of gameModes) {
                const response = await fetch(`${API_BASE_URL}/leaderboard?testType=${mode}`);
                const data = await response.json();
                
                if (response.ok) {
                    allLeaderboardData[mode] = data.leaderboard;
                } else {
                    allLeaderboardData[mode] = [];
                }
            }
            console.log(allLeaderboardData)
            setLeaderboardData(allLeaderboardData);
            setActiveLeaderboardTab(gameMode); // Set active tab to current game mode
            setShowLeaderboard(true);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            alert('Failed to load leaderboard');
        }
    };
  // Main render - wrapped in conditional to show controls only for EPs
  const mainContent = (
    <>
      <div className="title-with-game">
        <h1>{showEPs ? 'Emergency Procedures' : 'Aircraft Limits'}</h1>
        {!isGameActive && (
          <button className="game-mode-button" onClick={() => setShowGameModal(true)}>
            Game Mode
          </button>
        )}
        {isGameActive && (
          <div className="game-timer">
            <span className="timer-label">Time:</span>
            <span className="timer-display">{formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>
      
      {gameScore && !showSubmitForm && (
        <div className="game-score-display">
            <h2 style={{ 
            color: gameScore.score === 100 ? '#FFD700' : 
                    gameScore.score >= 90 ? '#4CAF50' : 
                    '#d32f2f'
            }}>
            Game Complete{gameScore.score === 100 ? '!!' : gameScore.score >= 90 ? '!' : ''}
            </h2>
            {gameMode === 'EPs_and_Limits' ? (
            <>
                <p><strong>Limits Time:</strong> {gameScore.limitsTimeFormatted}</p>
                <p><strong>EPs Time:</strong> {gameScore.epsTimeFormatted}</p>
                <p><strong>Total Time:</strong> {gameScore.totalTime}</p>
            </>
            ) : (
            <p><strong>Time:</strong> {gameScore.totalTime}</p>
            )}
            <p><strong>Score:</strong> {gameScore.score}%</p>
            {gameScore.score === 100 && (
            <button onClick={() => setShowSubmitForm(true)} style={{ marginRight: '10px' }}>
                Submit to Leaderboard
            </button>
            )}
            <button onClick={() => {
            setGameScore(null);
            setIsGameActive(false);
            }}>Close</button>
        </div>
      )}
      
      <p className="page-subtitle">
        {showEPs 
          ? 'EPs must be written verbatim. You can type in the step or click the corresponding control button'
          : 'Do not include units, just numbers. For values with a range use the format "min-max" or "min to max"'
        }
      </p>
      
      {!showEPs ? (
        // Limits Table (unchanged)
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
      ) : (
        // Emergency Procedures with Controls
        <div className="eps-with-controls">
          {/* Left Column - Emergency Actions & Engine Controls */}
          <div className="left-controls">
            <div className="control-section">
              <h4>Emergency Actions</h4>
              <div className="action-buttons">
                <button className="action-button" onClick={() => populateNextEmptyInput('Airspeed', '68 KIAS')}>
                  Airspeed
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Turn Towards Nearest Suitable Landing Site')}>
                  TTNSLS
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Doors', 'UNLATCHED')}>
                  Doors
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Declare', 'MAYDAY')}>
                  MAYDAY
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Maintain Directional Control')}>
                  Directional Control
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Emergency Shutdown on Deck', 'EXECUTE')}>
                  ESOD
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Aircraft', 'EVACUATE AS REQ')}>
                  Evacuate Aircraft
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Fire Extinguisher', 'ACTIVATE AS REQ')}>
                  Fire Extinguisher
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Cabin Windows', 'OPEN AS REQ')}>
                  Cabin Windows
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Land As Soon As Possible')}>
                  Land ASAP
                </button>
                <button className="action-button" onClick={() => populateNextEmptyInput('Brakes', 'AS REQ')}>
                  Brakes
                </button>
              </div>
            </div>

            <div className="control-section">
              <h4>Engine Controls</h4>
              <div className="engine-controls-layout">
                {/* Left: Primer Button */}
                <div className="engine-left">
                  <div className="primer-button" onClick={() => populateNextEmptyInput('Primer', 'IN/LOCKED')}>
                    PRIMER
                  </div>
                </div>
                
                {/* Center: Mags Dial */}
                <div className="engine-center">
                  <div className={`mags-dial ${isDraggingMags ? 'dragging' : ''}`}>
                    <div className="dial-base" onMouseDown={handleMagsMouseDown}>
                      <div className="dial-pointer" style={{ '--rotation': `${getMagsRotation()}deg`}}></div>
                      <div className="mags-positions">
                        <span className="mag-label mag-off">OFF</span>
                        <span className="mag-label mag-left">L</span>
                        <span className="mag-label mag-right">R</span>
                        <span className="mag-label mag-both">BOTH</span>
                        <span className="mag-label mag-start">START</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right: Horizontal Master/Avionics Switches */}
                <div className="engine-right">
                  <div className="horizontal-switches">
                    <div className="toggle-switch vertical">
                      <span className="switch-label">MASTER</span>
                      <div className={`switch-body vertical ${switches.master ? 'on' : ''}`} 
                           onClick={() => handleSwitch('master', 'Master', !switches.master)}>
                        <div className="switch-toggle"></div>
                      </div>
                    </div>
                    <div className="toggle-switch vertical">
                      <span className="switch-label">AVIONICS</span>
                      <div className={`switch-body vertical ${switches.avionics ? 'on' : ''}`}
                           onClick={() => handleSwitch('avionics', 'Avionics Power Switch', !switches.avionics)}>
                        <div className="switch-toggle"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Emergency Procedures */}
          <div className="eps-main-content">
            <div className="eps-container">
              <div className="eps-two-column">
                {/* Left Column EPs */}
                <div className="eps-column">
                  {/* ENG FAIL AFTER TAKEOFF */}
                  <div className="ep-section">
                    <h3>ENG FAIL AFTER TAKEOFF / FORCED LANDING</h3>
                    <div className="ep-steps">
                      {[1,2,3,4,5,6,7,8].map(num => (
                        <div key={`efat${num}`} className="ep-step">
                          *{num}. 
                          <div className="ep-input-pair">
                            <input type="text" className={getInputClass(`efat${num}`)} value={epsData[`efat${num}`] || ''} onChange={(e) => handleEPsChange(`efat${num}`, e.target.value)} />
                            <input type="text" className={getInputClass(`efat${num}val`)} value={epsData[`efat${num}val`] || ''} onChange={(e) => handleEPsChange(`efat${num}val`, e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ENGINE FAILURE IN FLIGHT */}
                  <div className="ep-section">
                    <h3>ENGINE FAILURE IN FLIGHT</h3>
                    <div className="ep-steps">
                      <div className="ep-step">*1. <div className="ep-input-pair"><input type="text" className={getInputClass('efif1')} value={epsData.efif1 || ''} onChange={(e) => handleEPsChange('efif1', e.target.value)} /><input type="text" className={getInputClass('efif1val')} value={epsData.efif1val || ''} onChange={(e) => handleEPsChange('efif1val', e.target.value)} /></div></div>
                      <div className="ep-step">*2. <div className="ep-input-pair"><input type="text" className={getInputClass('efif2')} value={epsData.efif2 || ''} onChange={(e) => handleEPsChange('efif2', e.target.value)} /><input type="text" className={getInputClass('efif2val')} value={epsData.efif2val || ''} onChange={(e) => handleEPsChange('efif2val', e.target.value)} /></div></div>
                      <div className="ep-step decision-point">• If Restart Will Be Attempted</div>
                      {[3,4,5,6,7,8,9].map(num => (
                        <div key={`efif${num}`} className="ep-step">
                          *{num}. 
                          <div className="ep-input-pair">
                            <input type="text" className={getInputClass(`efif${num}`)} value={epsData[`efif${num}`] || ''} onChange={(e) => handleEPsChange(`efif${num}`, e.target.value)} />
                            <input type="text" className={getInputClass(`efif${num}val`)} value={epsData[`efif${num}val`] || ''} onChange={(e) => handleEPsChange(`efif${num}val`, e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ENGINE FIRE IN FLIGHT */}
                  <div className="ep-section">
                    <h3>ENGINE FIRE IN FLIGHT</h3>
                    <div className="ep-steps">
                      {[1,2,3,4,5,6].map(num => (
                        <div key={`efiff${num}`} className="ep-step">
                          *{num}. 
                          <div className="ep-input-pair">
                            <input type="text" className={getInputClass(`efiff${num}`)} value={epsData[`efiff${num}`] || ''} onChange={(e) => handleEPsChange(`efiff${num}`, e.target.value)} />
                            <input type="text" className={getInputClass(`efiff${num}val`)} value={epsData[`efiff${num}val`] || ''} onChange={(e) => handleEPsChange(`efiff${num}val`, e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column EPs */}
                <div className="eps-column">
                  {/* ABORT TAKEOFF */}
                  <div className="ep-section">
                    <h3>ABORT TAKEOFF</h3>
                    <div className="ep-steps">
                      {[1,2,3].map(num => (
                        <div key={`abort${num}`} className="ep-step">
                          *{num}. 
                          <div className="ep-input-pair">
                            <input type="text" className={getInputClass(`abort${num}`)} value={epsData[`abort${num}`] || ''} onChange={(e) => handleEPsChange(`abort${num}`, e.target.value)} />
                            <input type="text" className={getInputClass(`abort${num}val`)} value={epsData[`abort${num}val`] || ''} onChange={(e) => handleEPsChange(`abort${num}val`, e.target.value)} />
                          </div>
                        </div>
                      ))}
                      <div className="ep-step decision-point">•IF DUE TO FIRE/ENG FAIL</div>
                      <div className="ep-step">*4. <div className="ep-input-pair"><input type="text" className={getInputClass('abort4')} value={epsData.abort4 || ''} onChange={(e) => handleEPsChange('abort4', e.target.value)} /><input type="text" className={getInputClass('abort4val')} value={epsData.abort4val || ''} onChange={(e) => handleEPsChange('abort4val', e.target.value)} /></div></div>
                    </div>
                  </div>

                  {/* EMERGENCY SHUTDOWN ON DECK */}
                  <div className="ep-section">
                    <h3>EMERGENCY SHUTDOWN ON DECK</h3>
                    <div className="ep-steps">
                      {[1,2,3,4,5].map(num => (
                        <div key={`esd${num}`} className="ep-step">
                          *{num}. 
                          <div className="ep-input-pair">
                            <input type="text" className={getInputClass(`esd${num}`)} value={epsData[`esd${num}`] || ''} onChange={(e) => handleEPsChange(`esd${num}`, e.target.value)} />
                            <input type="text" className={getInputClass(`esd${num}val`)} value={epsData[`esd${num}val`] || ''} onChange={(e) => handleEPsChange(`esd${num}val`, e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ENGINE FIRE DURING START */}
                  <div className="ep-section">
                    <h3>ENGINE FIRE DURING START</h3>
                    <div className="ep-steps">
                      <div className="ep-step">*1. <div className="ep-input-pair"><input type="text" className={getInputClass('efds1')} value={epsData.efds1 || ''} onChange={(e) => handleEPsChange('efds1', e.target.value)} /><input type="text" className={getInputClass('efds1val')} value={epsData.efds1val || ''} onChange={(e) => handleEPsChange('efds1val', e.target.value)} /></div></div>
                      <div className="ep-step note-text">Continue until engine starts or until mags selected off.</div>
                      <div className="ep-step decision-point">•IF ENGINE STARTS</div>
                      <div className="ep-step">*2. <div className="ep-input-pair"><input type="text" className={getInputClass('efds2')} value={epsData.efds2 || ''} onChange={(e) => handleEPsChange('efds2', e.target.value)} /><input type="text" className={getInputClass('efds2val')} value={epsData.efds2val || ''} onChange={(e) => handleEPsChange('efds2val', e.target.value)} /></div></div>
                      <div className="ep-step">*3. <div className="ep-input-pair"><input type="text" className={getInputClass('efds3')} value={epsData.efds3 || ''} onChange={(e) => handleEPsChange('efds3', e.target.value)} /><input type="text" className={getInputClass('efds3val')} value={epsData.efds3val || ''} onChange={(e) => handleEPsChange('efds3val', e.target.value)} /></div></div>
                      <div className="ep-step decision-point">•IF ENGINE FAILS TO START</div>
                      <div className="ep-step">*4. <div className="ep-input-pair"><input type="text" className={getInputClass('efds4')} value={epsData.efds4 || ''} onChange={(e) => handleEPsChange('efds4', e.target.value)} /><input type="text" className={getInputClass('efds4val')} value={epsData.efds4val || ''} onChange={(e) => handleEPsChange('efds4val', e.target.value)} /></div></div>
                      <div className="ep-step">*5. <div className="ep-input-pair"><input type="text" className={getInputClass('efds5')} value={epsData.efds5 || ''} onChange={(e) => handleEPsChange('efds5', e.target.value)} /><input type="text" className={getInputClass('efds5val')} value={epsData.efds5val || ''} onChange={(e) => handleEPsChange('efds5val', e.target.value)} /></div></div>
                    </div>
                  </div>

                  {/* ELEC FIRE IN FLIGHT */}
                  <div className="ep-section">
                    <h3>ELEC FIRE IN FLIGHT</h3>
                    <div className="ep-steps">
                      {[1,2,3,4].map(num => (
                        <div key={`elec${num}`} className="ep-step">
                          *{num}. 
                          <div className="ep-input-pair">
                            <input type="text" className={getInputClass(`elec${num}`)} value={epsData[`elec${num}`] || ''} onChange={(e) => handleEPsChange(`elec${num}`, e.target.value)} />
                            <input type="text" className={getInputClass(`elec${num}val`)} value={epsData[`elec${num}val`] || ''} onChange={(e) => handleEPsChange(`elec${num}val`, e.target.value)} />
                          </div>
                        </div>
                      ))}
                      <div className="ep-step decision-point">•IF FIRE REMAINS</div>
                      {[5,6,7].map(num => (
                        <div key={`elec${num}`} className="ep-step">
                          *{num}. 
                          <div className="ep-input-pair">
                            <input type="text" className={getInputClass(`elec${num}`)} value={epsData[`elec${num}`] || ''} onChange={(e) => handleEPsChange(`elec${num}`, e.target.value)} />
                            <input type="text" className={getInputClass(`elec${num}val`)} value={epsData[`elec${num}val`] || ''} onChange={(e) => handleEPsChange(`elec${num}val`, e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <p style={{ marginTop: '20px', fontSize: '0.9em', textAlign: 'center' }}>
                * DENOTES CRITICAL MEMORY ITEMS • DENOTES DECISION CONTINUATION
              </p>
            </div>
          </div>

          {/* Right Column - Flight Controls, Electrical & Cabin, Fuel Selector */}
          <div className="right-controls">
            <div className="control-section">
              <h4>Flight Controls</h4>
              <div className="circular-buttons">
                <div className="circular-button" onClick={() => populateNextEmptyInput('Carb Heat', 'ON')}>
                  CARB<br/>HEAT
                </div>
                <div className="button-with-state">
                  <div className={`circular-button throttle-state-${throttleState}`} onClick={handleThrottle}>
                    THROTTLE
                  </div>
                  <div className="button-state-text">{['IDLE', '1700 RPM', 'FULL'][throttleState]}</div>
                </div>
                <div className="button-with-state">
                  <div className={`circular-button mixture-state-${mixtureState}`} onClick={handleMixture}>
                    MIXTURE
                  </div>
                  <div className="button-state-text">{['IDLE CUTOFF', 'FULL RICH'][mixtureState]}</div>
                </div>
                <div className="flaps-vertical-control">
                  <div className="flaps-vertical-slider">
                    <div className="flaps-vertical-track"></div>
                    <div className="flaps-vertical-handle" 
                         style={{ top: `${100 - (flapsPosition / 30) * 100}%` }}
                         onMouseDown={(e) => {
                           e.preventDefault();
                           const sliderElement = e.currentTarget.parentElement;
                           const handleMouseMove = (e) => {
                             const rect = sliderElement.getBoundingClientRect();
                             const percent = Math.max(0, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100));
                             const position = Math.round((100 - percent) / 100 * 30);
                             handleFlaps(position);
                           };
                           const handleMouseUp = () => {
                             document.removeEventListener('mousemove', handleMouseMove);
                             document.removeEventListener('mouseup', handleMouseUp);
                           };
                           document.addEventListener('mousemove', handleMouseMove);
                           document.addEventListener('mouseup', handleMouseUp);
                         }}>
                    </div>
                  </div>
                  <div className="flaps-vertical-label">FLAPS</div>
                </div>
              </div>
            </div>

            <div className="control-section">
              <h4>Electrical & Cabin</h4>
              <div className="switch-row vertical-switches-style">
                <div className="toggle-switch">
                  <span className="switch-label">ALL ELEC</span>
                  <div className={`switch-body vertical ${switches.electrical ? 'on' : ''}`}
                       onClick={() => handleSwitch('electrical', 'All Electrical Equipment', !switches.electrical)}>
                    <div className="switch-toggle"></div>
                  </div>
                </div>
                <div className="toggle-switch">
                  <span className="switch-label">CABIN HEAT</span>
                  <div className={`switch-body vertical ${switches.cabinHeat ? 'on' : ''}`}
                       onClick={() => handleSwitch('cabinHeat', 'Cabin Heat / Air', !switches.cabinHeat)}>
                    <div className="switch-toggle"></div>
                  </div>
                </div>
                <div className="toggle-switch">
                  <span className="switch-label">VENTS</span>
                  <div className={`switch-body vertical ${switches.vents ? 'on' : ''}`}
                       onClick={() => handleSwitch('vents', 'Vents / Cabin Air', !switches.vents)}>
                    <div className="switch-toggle"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="control-section">
              <h4>Fuel Selector</h4>
              <div className="fuel-selector">
                <div className="dial-base" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                  const degrees = (angle * (180 / Math.PI) + 450) % 360;
                  
                  let position = 'BOTH';
                  if (degrees >= 315 || degrees < 45) position = 'BOTH';
                  else if (degrees < 135) position = 'RIGHT';
                  else if (degrees < 225) position = 'OFF';
                  else position = 'LEFT';
                  
                  handleFuelSelector(position);
                }}>
                  <div className="dial-pointer" style={{ '--rotation': `${getFuelRotation()}deg`, top: '10px'}}></div>
                  <span className="dial-label off">OFF</span>
                  <span className="dial-label left">LEFT</span>
                  <span className="dial-label both">BOTH</span>
                  <span className="dial-label right">RIGHT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
        <div className="button-row" style={{ justifyContent: 'center', marginTop: '20px' }}>
          {!isGameActive && (<button onClick={() => setShowEPs(!showEPs)}>
            Switch to {showEPs ? 'Limits' : 'Emergency Procedures'}
          </button>)}
          {!isGameActive && (<button onClick={checkAnswers}>Check Answers</button>)}
          {showEPs && <button onClick={deleteLastStep}>Delete Last Step</button>}
          {isGameActive && (<button onClick={endGame}>Stop Game</button>)}
          {!isGameActive && (<button onClick={resetAnswers}>Reset</button>)}
        </div>
    </>
  );

  return (
    <>
      <div className="limits-eps-container">
        {mainContent}
      </div>
      
      {/* Game Mode Modal */}
      {showGameModal && (
        <div className="game-modal-overlay">
          <div className="game-modal">
            <button className="game-modal-close" onClick={() => setShowGameModal(false)}>×</button>
            <h2>Game Mode</h2>
            <p style={{ 
                textAlign: 'center', 
                color: '#666', 
                margin: '-10px 0 20px 0',
                fontSize: '0.9em'
            }}>
                Score 100% to add yourself to the leaderboard!
            </p>
            
            <div className="game-modal-content">
              <label>Select Mode:</label>
              <select 
                value={gameMode} 
                onChange={(e) => setGameMode(e.target.value)}
                className="game-mode-select"
              >
                <option value="Limits">Limits</option>
                <option value="EPs">EPs</option>
                <option value="EPs_and_Limits">EPs and Limits</option>
              </select>
              
              <button className="game-button-secondary" onClick={viewLeaderboard}>
                View Leaderboard
              </button>
              
              <button className="game-button-primary" onClick={startGame}>
                Start
              </button>
            </div>
          </div>
        </div>
      )}

        {/*Add the submit form modal*/}
        {showSubmitForm && (
        <div className="game-modal-overlay">
            <div className="game-modal">
            <button className="game-modal-close" onClick={() => setShowSubmitForm(false)}>×</button>
            <h2>Submit to Leaderboard</h2>
            <p style={{ 
                textAlign: 'center', 
                color: '#666', 
                margin: '-10px 0 20px 0',
                fontSize: '0.9em'
            }}>
                Only your best score will be displayed
            </p>
            <div className="game-modal-content">
                <label>Name (4 chars):</label>
                <input
                type="text"
                value={submitFormData.playerName}
                onChange={(e) => setSubmitFormData({...submitFormData, playerName: e.target.value.slice(0, 4)})}
                className="game-mode-select"
                placeholder="ABCD"
                maxLength="4"
                />
                
                <label>Country:</label>
                {submitFormData.country === 'OTHER' ? (
                <input
                    type="text"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value.toUpperCase().slice(0, 4))}
                    className="game-mode-select"
                    placeholder="Enter country (4 chars)"
                    maxLength="4"
                    autoFocus
                />
                ) : (
                <select
                    value={submitFormData.country}
                    onChange={(e) => {
                    setSubmitFormData({...submitFormData, country: e.target.value});
                    if (e.target.value !== 'OTHER') setCustomCountry('');
                    }}
                    className="game-mode-select"
                >
                    <option value="">Select Country</option>
                    <option value="USA">USA</option>
                    <option value="ITA">ITA</option>
                    <option value="GBR">GBR</option>
                    <option value="CAN">CAN</option>
                    <option value="AUS">AUS</option>
                    <option value="GER">GER</option>
                    <option value="FRA">FRA</option>
                    <option value="NED">NED</option>
                    <option value="KSA">KSA</option>
                    <option value="SWE">SWE</option>
                    <option value="OTHER">Other...</option>
                </select>
                )}
                
                <label>Branch:</label>
                {submitFormData.branch === 'OTHER' ? (
                <input
                    type="text"
                    value={customBranch}
                    onChange={(e) => setCustomBranch(e.target.value.toUpperCase().slice(0, 4))}
                    className="game-mode-select"
                    placeholder="Enter branch (4 chars)"
                    maxLength="4"
                    autoFocus
                />
                ) : (
                <select
                    value={submitFormData.branch}
                    onChange={(e) => {
                    setSubmitFormData({...submitFormData, branch: e.target.value});
                    if (e.target.value !== 'OTHER') setCustomBranch('');
                    }}
                    className="game-mode-select"
                >
                    <option value="">Select Branch</option>
                    <option value="USN">USN</option>
                    <option value="USMC">USMC</option>
                    <option value="USCG">USCG</option>
                    <option value="NAVY">NAVY</option>
                    <option value="OTHER">Other...</option>
                </select>
                )}
                
                <label>Designator:</label>
                {submitFormData.designator === 'OTHER' ? (
                <input
                    type="text"
                    value={customDesignator}
                    onChange={(e) => setCustomDesignator(e.target.value.toUpperCase().slice(0, 5))}
                    className="game-mode-select"
                    placeholder="Enter designator (5 chars)"
                    maxLength="5"
                    autoFocus
                />
                ) : (
                <select
                    value={submitFormData.designator || ''}
                    onChange={(e) => {
                    setSubmitFormData({...submitFormData, designator: e.target.value});
                    if (e.target.value !== 'OTHER') setCustomDesignator('');
                    }}
                    className="game-mode-select"
                >
                    <option value="">Select Designator</option>
                    <option value="SNA">SNA</option>
                    <option value="SNFO">SNFO</option>
                    <option value="AVP">AVP</option>
                    <option value="OTHER">Other...</option>
                </select>
                )}
                
                <label>NIFE Class (##-##):</label>
                <input
                type="text"
                value={submitFormData.nifeClass}
                onChange={(e) => {
                    setSubmitFormData({...submitFormData, nifeClass: e.target.value});
                }}
                className="game-mode-select"
                placeholder="25-01"
                maxLength="5"
                />
                
                <button 
                className="game-button-primary" 
                onClick={submitToLeaderboard}
                disabled={isSubmitting}
                >
                {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
            </div>
            </div>
        </div>
        )}
        
        {/*// Add the leaderboard modal*/}
        {showLeaderboard && (
            <div className="game-modal-overlay">
                <div className="game-modal" style={{maxWidth: activeLeaderboardTab === 'EPs_and_Limits' ? '1000px' : '700px'}}>
                <button className="game-modal-close" onClick={() => setShowLeaderboard(false)}>×</button>
                <h2>Leaderboard</h2>
                
                {/* Leaderboard Tabs */}
                <div className="leaderboard-tabs">
                    {['Limits', 'EPs', 'EPs_and_Limits'].map(tab => (
                        <button
                            key={tab}
                            className={`leaderboard-tab ${activeLeaderboardTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveLeaderboardTab(tab)}
                        >
                            {tab.replaceAll('_', ' ')}
                        </button>
                    ))}
                </div>
                
                <div className="leaderboard-table">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Rank</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                        {activeLeaderboardTab === 'EPs_and_Limits' ? (
                            <>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Total</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Limits</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>EPs</th>
                            </>
                        ) : (
                            <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                        )}
                        <th style={{ padding: '8px', textAlign: 'left' }}>Des.</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Branch</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Class</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(leaderboardData[activeLeaderboardTab] || []).map((entry, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>#{entry.rank}</td>
                            <td style={{ padding: '8px' }}>{entry.playerName}</td>
                            {activeLeaderboardTab === 'EPs_and_Limits' ? (
                                <>
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{entry.formattedTime}</td>
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{entry.formattedLimitsTime || '-'}</td>
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{entry.formattedEpsTime || '-'}</td>
                                </>
                            ) : (
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{entry.formattedTime}</td>
                            )}
                            <td style={{ padding: '8px' }}>{entry.designator}</td>
                            <td style={{ padding: '8px' }}>{entry.branch}</td>
                            <td style={{ padding: '8px' }}>{entry.nifeClass}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                    {(!leaderboardData[activeLeaderboardTab] || leaderboardData[activeLeaderboardTab].length === 0) && (
                    <p style={{ textAlign: 'center', padding: '20px' }}>No scores yet. Be the first!</p>
                    )}
                </div>
                </div>
            </div>
        )}
    </>
  );
}

export default LimitsEPs;