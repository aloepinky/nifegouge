import React, { useState, useEffect, useRef} from 'react';
import {getEPDivs, EP_LENGTHS, EP_ANSWERS, EP_NWC, EP_NWC_GROUPS, EP_NWC_HINTS, EP_FULL_LENGTHS, EP_FULL_ANSWERS, EP_TITLES, EP_FULL_TITLES} from './EPDivsData';
import {getQuadDivs, QUAD_LENGTHS, QUAD_ANSWERS, QUAD_ACTIONS, QUAD_TITLES, QUAD_NWC} from './QuadfoldData';
import { normalizeAnswer } from '../utils/answerUtils';

// stepKey -> ordered list of every NWC key in the same procedure
const NWC_GROUP_BY_KEY = {};
EP_NWC_GROUPS.forEach((group) => group.forEach((k) => { NWC_GROUP_BY_KEY[k] = group; }));

// Bubble styles shared by the full NWC bubbles and their collapsed preview
// chips so the chips visually match the bubble they expand into
const NWC_BUBBLE_STYLES = {
  warning: {
    backgroundColor: '#e6d4d4ff',
    color: 'black',
    border: '2px solid #ef5350',
    boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.3)',
    borderRadius: '4px'
  },
  caution: {
    backgroundColor: 'white',
    color: 'black',
    border: '3px dashed #ef5350',
    borderRadius: '4px'
  },
  note: {
    backgroundColor: 'white',
    color: 'black',
    border: '4px solid #ef5350',
    borderRadius: '4px'
  }
};

const NWC_CATEGORY_LABELS = { warning: 'Warning', caution: 'Caution', note: 'Note' };

function TW4Cockpit({ isGameActive = false, onGameComplete }) {
  // Layout width parameters - adjust these to test different configurations
  const LAYOUT_GAP = '20px';            // Gap between columns
  const CONTAINER_MAX_WIDTH = '1500px';// Max width of container when showing EPs
  const SIDE_CONTROLS_WIDTH = '160px';  // Width of left and right image columns
  const CENTER_CONTENT_WIDTH = '650px'; // Max width of the EPs table content

  // Helper function to shuffle array (for randomized order)
  const shuffleIndices = (length) => {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  };

  const [inputData, setInputData] = useState({});
  const [checkResults, setCheckResults] = useState({});
  const [activeHints, setActiveHints] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentIndexArray, setCurrentIndexArray] = useState([shuffleIndices(20)]);
  const [isRandom, setisRandom] = useState(true);
  const [currentDivKey, setCurrentDivKey] = useState('epDivs');
  const [inputAnswers, setInputAnswers] = useState(EP_ANSWERS);
  const [inputLengths, setInputLengths] = useState(EP_LENGTHS);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistModalContent, setChecklistModalContent] = useState(null);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [autoNWC, setAutoNWC] = useState(false);
  const [showNWCModal, setShowNWCModal] = useState(false);
  const [nwcModalContent, setNwcModalContent] = useState(null);
  const [expandedNWC, setExpandedNWC] = useState({});
  const [revealedHints, setRevealedHints] = useState({});
  const [showAllHints, setShowAllHints] = useState(false);
  const [showEPNavDropdown, setShowEPNavDropdown] = useState(false);
  // 'full' or 'simplified' — full mode needs ~970px (center content + side
  // controls), so small/mobile screens start in simple mode
  const [cockpitMode, setCockpitMode] = useState(() =>
    window.innerWidth < 750 ? 'simplified' : 'full'
  );

  const modalBaseContentRef = useRef(null);
  const modalStepKeyRef = useRef(null);
  const prevCheckResultsRef = useRef({});

  useEffect(() => {
    if(isRandom) {
      setCurrentIndex(0)
      setCurrentIndexArray(shuffleIndices(20));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEPNavDropdown && !event.target.closest('.checklist-counter')) {
        setShowEPNavDropdown(false);
      }
    };

    if (showEPNavDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEPNavDropdown]);

  useEffect(() => {
    if (showChecklistModal && modalBaseContentRef.current && modalStepKeyRef.current) {
      const stepText = getStepText(modalStepKeyRef.current);
      setChecklistModalContent(
        <div>
          {modalBaseContentRef.current}
          {stepText && (
            <div style={{marginTop: '20px', padding: '10px', border: '2px solid #666', borderRadius: '8px', backgroundColor: '#f0f0f0'}}>
              <span className={getInputClass(modalStepKeyRef.current)}>{stepText}</span>
            </div>
          )}
        </div>
      );
    }
  }, [checkResults]);

  // Auto-expand logic: automatically advance to next empty field when current field is completed
  useEffect(() => {
    if (!autoExpanded || currentDivKey !== 'quadDivs' || !showChecklistModal) return;

    // Check if current field is checked/correct
    const currentField = modalStepKeyRef.current;
    if (currentField && (checkResults[currentField] === 'checked' || checkResults[currentField] === 'correct')) {
      // Find next empty field
      const { nextEmptyField } = findNextEmpty();

      if (nextEmptyField && QUAD_ACTIONS[nextEmptyField]) {
        // Auto-advance to next field
        setTimeout(() => {
          openChecklistModal(QUAD_ACTIONS[nextEmptyField], nextEmptyField);
        }, 300);
      } else {
        // No more empty fields - close modal
        setTimeout(() => {
          closeChecklistModal();
          setAutoExpanded(false);
        }, 500);
      }
    }
  }, [checkResults, autoExpanded, showChecklistModal, currentDivKey]);



  // Dictionary mapping clickable area IDs to their control arrays
  const clickableControls = {
    // Left panel
    'trimIndi' : ['Tri\u200Bm Indicator'],
    'floodLight' : ['floodLight'],
    'sideLight' : ['sideLight'],
    'instLight' : ['instLight'],
    'trimAid': ['tri\u200Bm aid'],
    'ldgLight': ['landing/'],
    'taxiLight': ['taxi light'],
    'anticollLight': ['anti-coll light', 'anti-collision lights', "/exterior lights"],
    'navLight': ['nav light'],
    'trimDisco': ['Tri\u200Bm Disconnect'],
    'flaps': ['flaps'],
    'pcl': ['PCL', 'Speed Brake', 'Accelerate', 'trim'],
    'altLdgGrTest': ['System test', 'alt audio', 'ldg gr audio'],
    'ovrSpdOvrGTest': ['System test', 'ovr spd audio', 'ovr g audio'],
    'aoaSystemTest': ['System test', 'AOA syst'],
    'bingoFuelTest': ['System test', 'bingo fuel audio'],
    'lampTest': ['System test', 'Lamp test'],
    'fireDetection': ['System test', 'Fire detection'],
    'seatHeight': ['sea\u200Bt height'],
    'auxBatTest': ['System test', 'AUX BAT TEST'],
    'cfs': ['CFS'],
    'prop': ['Prop'],
    'fdrlgt': ['FD\u200BR'],
    'firewall': ['Firewall'],
    'antiG': ['anti-g'],

    // Center top panel
    'masterArm': ['Master Arm'],
    'emerLdgGr': ['Emer Ldg Gr'],
    'flapIndi': ['Flap Indicator'],
    'gear': ['Gear'],
    'gearlgt': ['Gea\u200Br Light'],
    'brakes': ['Brakes', 'Rudder Pedals'],
    'com1': ['COM1'],
    'com2': ['COM2'],
    'navcom': ['NAVCOM'],
    'dme': ['DME'],
    'mkr': ['MKR'],
    'vox': ['VOX'],
    'emrnrm': ['EMR/NRM'],
    'ventcon': ['vent control lever'],
    'defog': ['Defog'],
    'elt': ['elt'],
    'parkingBrake': ['Parking Brake'],
    'navMenu': ['MFD ','database','location', 'alignment', "FMS"],
    'tcas': ['TCAS'],
    'tcasrng': ['TCA\u200BS Range'],
    'mastwarn': ["Master Warning"],
    'mastcaut': ["Master Caution"],
    'firelight': ["Fire Light"],
    'redaoa': ["Red Chevron"],
    'amberaoa': ["Amber Donut"],
    'greenaoa': ["Green Chevron"],
    'clock' : ['clock'],
    'aoaindi': ["AOA Indicator"],
    'airspeed': ['Airspeed', ', speed', 'Zoom', 'Glide', 'Accelerate', 'flight instruments', 'PFD'],
    'attitude': ['Attitude', 'flight instruments', 'PFD'],
    'altitude': ['Altitude', 'MSL', 'Climb', 'Descen', 'flight instruments', 'PFD'],
    'vsi': ['VSI'],
    'slipskid': ["slip skid"],
    'turni': ["turn indi"],
    'headi': ["Heading indi"],
    'greset': ['G Reset'],
    'fuelquan': ['Fuel Quantity', 'Fuel B\u200Balance'],
    'np': ['N\u200Bp'],
    'torque': ['Torque', "Engine Instruments"],
    'oilPress': ['Oil Press', "Engine Instruments"],
    'oilTemp': ['Oil Temp', "Engine Instruments"],
    'itt': ['ITT', "Engine Instruments", 'Engine Start -'],
    'n1': ['N1', "Engine Instruments"],
    'hydPress': ['Hyd Press', "Engine Instruments"],
    'bingo': ['Bingo Set'],
    'fuelflow': ['Fuel Flow'],
    'ioat': ['IOAT'],
    'voltamps': ['Volts', 'Amps'],
    'altdelta': ['P\u200Bressurization'],
    'uhf': ['uhf'],
    'vhf': ['vhf'],
    'vor': ['vor'],
    'transponder': ['transponder'],
    'pfdbut': ['flags'],
    'sysbut': ['System button'],
    'hudcage': ['hudcage'],
    'hudlgt': ['hudlgt'],
    'mfdrep': ['mfdrep'],
    'lgthud': ['lgthud'],
    'lgtufcp': ['lgtufcp'],
    'baroset': ['altimeter'],
    'bfi': ['BFI'],
    'bfiset': ['altimete2r'],
    'eicas': ['eicas'],

    // Center buttons
    'ege': ['egress'],
    'iss': ['iss'],
    'seat': ['Seat', 'Ejection Handle', 'strap'],
    'canopy': ['canopy'],
    'fittings': ['fi\u200Bttings', 'strap'],
    'mask': ['mask', 'regulator', 'oxygen hose'],
    'terminate': ['terminate'],
    'expo': ['external power'],
    'loose': ['loose items'],
    'stick': ['Attitude', 'Zoom', 'Glide', 'Controls', 'Descent', 'Climb', 'NWS', 'Nosewheel Steering', 'Nose wheel Steering', 'trim', 't\u200Brim', 'gust lock', 'Intercept', 'Turn'],
    'forcedLanding': ['forced landing', 'eject'],
    'pel': ['pel'],
    'elp': ['elp'],
    'airstart': ['airstart'],
    'greenRing': ['green ring'],
    'ttnsf': ['suitable'],
    'evacuate': ['evacuate'],
    'chocks': ['chocks'],
    'propeller': ['pro\u200Bp'],

    // Right panel
    'bat': ['bat\u200B'],
    'gen': ['gen'],
    'aux': ['AUX'],
    'starter': ['starter'],
    'ignition': ['ignition'],
    'fuelbal': ['Fuel Bal'],
    'manfuelbal': ['Fuel\u200B Bal'],
    'avionicsMaster': ['avionics master'],
    'bustie': ['Bus Tie'],
    'probeAntiI': ['Probes Anti-Ice'],
    'boostPump': ['Boost Pump'],
    'pmu': ['pmu'],
    'bleedAir': ['bled air inflow', 'bleed air inflow'],
    'evapBlwr': ['evap blwr'],
    'airCond': ['air cond'],
    'pressurization': ['Pressurization'],
    'ramair': ['Ram Air'],
    'tempcon': ['Temp Control'],
    'obogsFlow': ['OBOGS -', 'OBOGS  -', 'Flow I'],
    'obogsSupply': ['OBOGS -', 'supply'],
    'obogsConc': ['OBOGS -', 'concentration'],
    'obogsPress': ['OBOGS -', 'OBOGS pressure']
  };

  const handleInputsChange = (field, value) => {
    setInputData(prev => ({ ...prev, [field]: value }));
    setCheckResults(prev => ({ ...prev, [field]: '' }));
  };

  const refreshIndices = (currentDiv, random) => {
    const total = currentDiv.length;
    setCurrentIndex(0);

    if(random){
      setCurrentIndexArray(shuffleIndices(total));
    }else{
      setCurrentIndexArray([...Array(total).keys()]);
    }
  }

  const checkAnswers = () => {
    const results = {};
    const answers = inputAnswers;
    const data = inputData;

    Object.keys(answers).forEach(key => {
      const rawCorrect = Array.isArray(answers[key]) ? answers[key].join('') : answers[key];
      const normalizedUser = normalizeAnswer(data[key] || '');
      const normalizedCorrect = normalizeAnswer(rawCorrect);

      if (normalizedUser === normalizedCorrect) {
        results[key] = 'correct';
      } else if (normalizedUser === '') {
        results[key] = '';
      } else if (normalizedCorrect === '') {
        results[key] = 'correct';
      } else {
        const userWords = normalizedUser.split(' ').filter(Boolean);
        const correctWordSet = new Set(normalizedCorrect.split(' ').filter(Boolean));
        const isPartial = userWords.length > 0 && userWords.every(w => correctWordSet.has(w));
        results[key] = isPartial ? 'partial' : 'incorrect';
      }
    });

    setCheckResults(results);

    if (isGameActive) {
      const currentEPKey = divMap[currentDivKey][0][currentIndexArray[currentIndex]].key;
      const currentEPFields = Object.keys(answers).filter(k => k.startsWith(currentEPKey));
      const allCorrect = currentEPFields.length > 0 && currentEPFields.every(
        key => !answers[key] || results[key] === 'correct'
      );
      if (allCorrect) {
        if (currentIndex < currentIndexArray.length - 1) {
          setTimeout(() => {
            setCurrentIndex(ci => ci + 1);
            setInputData({});
            setCheckResults({});
            setActiveHints({});
            closeChecklistModal();
            closeNWCModal();
          }, 600);
        } else {
          onGameComplete?.();
        }
      }
    }
  };

  const resetAnswers = () => {
    setInputData({});
    setCheckResults({});
    setActiveHints({});
    setAutoExpanded(false);
    closeChecklistModal();
  };

  const getInputClass = (field) => {
    if (checkResults[field] === 'correct') return 'correct-answer';
    if (checkResults[field] === 'partial') return 'partial-answer';
    if (checkResults[field] === 'incorrect') return 'incorrect-answer';
    if (checkResults[field] === 'checked') return 'checked-answer';
    return '';
  };

  const getClickClass = (field, type = null) => {
    if (activeHints[field] === 'hint' && type === 'image') return 'correct-answer-hint-image';
    if (activeHints[field] === 'hint' && type === 'button') return 'correct-answer-hint-button';
    if (activeHints[field] === 'hint') return 'correct-answer-hint';
    if (type === 'button') return 'action-button';
    if(!type){return "click-style";}
    return '';
  };

  // Remove all styling from the page except for checked options
  const emptyResults = () => {
    return Object.fromEntries(
      Object.entries(checkResults).filter(([key, value]) =>
        !['partial', 'incorrect', 'correct'].includes(value)
      )
    );
  };

  const findNextEmpty = (nextKey = null) =>{
    if(nextKey){return{nextEmptyField: nextKey, emptyNum: null};}
    const results = checkResults;
    let currentKey = divMap[currentDivKey][0][currentIndexArray[currentIndex]].key;
    console.log(currentKey)
    const allFields = Object.keys(inputAnswers).filter(key => key.startsWith(currentKey));
    // Find the first non-empty field
    let nextEmptyField = null;
    let emptyNum = 0;
    for (let i = 0; i < allFields.length; i++) {
      const field = allFields[i];
      console.log(inputAnswers[field])
      if((inputData[field] === undefined || inputData[field] === ''||results[field] === 'partial') && inputAnswers[field] != "") {
        nextEmptyField = field;
        emptyNum = i;
        break;
      }
    }
    return{nextEmptyField, emptyNum};
  }

  // Find next appropriate input and try it
  const tryNextStep = (controls) => {
    const results = checkResults;
    const {nextEmptyField, emptyNum} = findNextEmpty();
    if(!nextEmptyField){return}
    if(results[nextEmptyField] === 'partial'){controls = [...controls, inputData[nextEmptyField]]}

    let correctAnswers = inputAnswers[nextEmptyField]

    // Find all matching answers in order
    const matchingAnswers = correctAnswers.filter(answer =>
      controls.some(control =>
        answer.toLowerCase().includes(control.toLowerCase()) ||
        control.toLowerCase().includes(answer.toLowerCase())
      )
    );

    if(matchingAnswers.length === correctAnswers.length){
      inputData[nextEmptyField] = matchingAnswers.join('');
      const results = emptyResults();
      results[nextEmptyField] = 'checked';
      setCheckResults(results);
      if(emptyNum + 1 === inputLengths[currentIndexArray[currentIndex]]){
        checkAnswers();
      }
    }else if (matchingAnswers.length > 0){
      inputData[nextEmptyField] = matchingAnswers.join('');
      const results = emptyResults();
      results[nextEmptyField] = 'partial';
      setCheckResults(results);
    }else{
      const results = emptyResults();
      results[nextEmptyField] = 'incorrect';
      setCheckResults(results);
    }
    if(Object.keys(activeHints).length > 0){
      removeDataHints((inputData[nextEmptyField] || '').toLowerCase(), nextEmptyField);
    }
  };
  
  const removeDataHints = (inputValue, nextEmptyField) =>{
    const matchingKeys = Object.keys(clickableControls).filter(key => {
      // Check if the key itself is in the input value
      if (inputValue.includes(key.toLowerCase())) {
        return true;
      }

      // Check if any control string in the array matches
      return clickableControls[key].some(control =>
        inputValue.includes(control.toLowerCase()) ||
        control.toLowerCase().includes(inputValue)
      );
    });
    giveHint(matchingKeys, nextEmptyField)
  };

  const nextAnswer = () =>{
    const {nextEmptyField, emptyNum} = findNextEmpty();
    console.log(nextEmptyField);
    setActiveHints({});
    if(!nextEmptyField){return}
    let correctAnswers = inputAnswers[nextEmptyField]
    inputData[nextEmptyField] = correctAnswers.join('');
    const results = emptyResults();
    results[nextEmptyField] = 'checked';
    setCheckResults(results);
    if(emptyNum + 1 === inputLengths[currentIndexArray[currentIndex]]){
      checkAnswers();
      return false
    }
    return true
  }

  const allAnswers = () =>{
    let continueLoop = true;
    while(continueLoop){
      continueLoop = nextAnswer();
    }
  }

  const giveHint = (matchingKeys = null, nextKey = null) =>{
    const {nextEmptyField, emptyNum} = findNextEmpty(nextKey);
    console.log(nextEmptyField)
    setActiveHints({});
    if(!nextEmptyField){return}
    let correctAnswer = inputAnswers[nextEmptyField].join('').toLowerCase();
    const matches ={};

    Object.keys(clickableControls).forEach(key => {
      const controls = clickableControls[key];
      const hasMatch = controls.some(control =>
        correctAnswer.includes(control.toLowerCase())
      );
      if (hasMatch) {
        matches[key] = 'hint';
      }
    });
    console.log(matchingKeys)
    if(matchingKeys){
      matchingKeys.forEach(key => {
        delete matches[key];
      });
    }
    setActiveHints(matches)
  }

  const openChecklistModal = (content, currentField = null) => {
    let { nextEmptyField } = findNextEmpty();
    if(currentField){nextEmptyField = currentField};
    const stepText = getStepText(nextEmptyField);

    modalBaseContentRef.current = content;
    modalStepKeyRef.current = nextEmptyField;

    console.log(nextEmptyField)
    setChecklistModalContent(
      <div>
        {content}
        {stepText && (
          <div style={{marginTop: '20px', padding: '10px', border: '2px solid #666', borderRadius: '8px', backgroundColor: '#f0f0f0'}}>
            <span className={getInputClass(nextEmptyField)}>{stepText}</span>
          </div>
        )}
      </div>
    );
    setShowChecklistModal(true);
  }

  const closeChecklistModal = () => {
    setShowChecklistModal(false);
    setChecklistModalContent(null);
    // Disable auto-expand when manually closing modal
    if (autoExpanded) {
      setAutoExpanded(false);
    }
  }

  const openNWCModal = (stepKey) => {
    const nwcData = EP_NWC[stepKey] || QUAD_NWC[stepKey];
    if (!nwcData) return;

    // Get the answer text for this step
    const rawAnswer = inputAnswers[stepKey] || '';
    let stepAnswer = rawAnswer;

    // Filter out answers that start with zero-width space
    if (Array.isArray(rawAnswer)) {
      const filtered = rawAnswer.filter(item => typeof item === 'string' && !item.startsWith('\u200B'));
      stepAnswer = filtered.length > 0 ? filtered.join('') : '';
    } else if (typeof rawAnswer === 'string' && rawAnswer.startsWith('\u200B')) {
      stepAnswer = '';
    }

    // EP keys: show every NWC in the procedure as collapsed previews, with
    // the clicked key's items highlighted
    let group = EP_NWC[stepKey] && NWC_GROUP_BY_KEY[stepKey];
    if (group) {
      // In memory mode, drop NWCs belonging to non-memory (full-mode-only)
      // steps; title/decision keys aren't in either answer set and stay
      if (currentDivKey === 'epDivs') {
        group = group.filter((key) => !(EP_FULL_ANSWERS.hasOwnProperty(key) && !EP_ANSWERS.hasOwnProperty(key)));
      }
      const items = [];
      let seq = 0;
      const hintFor = (key, plural, idx) => (EP_NWC_HINTS[key] ? EP_NWC_HINTS[key][plural][idx] : undefined);
      group.forEach((key) => {
        const data = EP_NWC[key];
        if (!data) return;
        // Same order the old single-step modal used: warnings, cautions, notes
        data.warnings.forEach((text, idx) => items.push({ seq: ++seq, key, category: 'warning', text, hint: hintFor(key, 'warnings', idx) }));
        data.cautions.forEach((text, idx) => items.push({ seq: ++seq, key, category: 'caution', text, hint: hintFor(key, 'cautions', idx) }));
        data.notes.forEach((text, idx) => items.push({ seq: ++seq, key, category: 'note', text, hint: hintFor(key, 'notes', idx) }));
      });

      const countFor = (keys) => {
        const counts = { notes: 0, warnings: 0, cautions: 0 };
        keys.forEach((key) => {
          const data = EP_NWC[key];
          if (!data) return;
          counts.notes += data.notes.length;
          counts.warnings += data.warnings.length;
          counts.cautions += data.cautions.length;
        });
        return counts;
      };

      setExpandedNWC({});
      setRevealedHints({});
      setShowAllHints(false);
      setNwcModalContent({
        mode: 'ep',
        stepKey,
        stepAnswer,
        items,
        epCounts: countFor(group),
        stepCounts: countFor([stepKey])
      });
      setShowNWCModal(true);
      return;
    }

    // Quadfold (and any ungrouped) keys keep the single-step display
    const renderNWCContent = () => {
      const content = [];

      // Render Warnings
      nwcData.warnings.forEach((warning, idx) => {
        content.push(
          <div key={`warning-${idx}`} style={{
            ...NWC_BUBBLE_STYLES.warning,
            padding: '10px',
            marginBottom: '10px',
            fontSize: '11px'
          }}>
            <strong style={{fontSize: '12px'}}>WARNING:</strong> {warning}
          </div>
        );
      });

      // Render Cautions
      nwcData.cautions.forEach((caution, idx) => {
        content.push(
          <div key={`caution-${idx}`} style={{
            ...NWC_BUBBLE_STYLES.caution,
            padding: '10px',
            marginBottom: '10px',
            fontSize: '11px'
          }}>
            <strong>CAUTION:</strong> {caution}
          </div>
        );
      });

      // Render Notes
      nwcData.notes.forEach((note, idx) => {
        content.push(
          <div key={`note-${idx}`} style={{
            ...NWC_BUBBLE_STYLES.note,
            padding: '10px',
            marginBottom: '10px',
            fontSize: '11px'
          }}>
            <strong>NOTE:</strong> {note}
          </div>
        );
      });

      return <div>{content}</div>;
    };

    setNwcModalContent({ mode: 'single', content: renderNWCContent(), stepAnswer });
    setShowNWCModal(true);
  }

  const closeNWCModal = () => {
    setShowNWCModal(false);
    setNwcModalContent(null);
  }

  const getStepText = (key) => {
    const element = document.querySelector(`[data-step-key="${key}"]`);
    if (element) {
      const span = element.querySelector('span');
      return span ? span.textContent : '';
    }
    return '';
  };

  const toggleAutoExpanded = () => {
    if (!autoExpanded) {
      // Activating auto-expand mode
      setAutoExpanded(true);
      // Find and open the first empty field
      const { nextEmptyField } = findNextEmpty();
      if (nextEmptyField && QUAD_ACTIONS[nextEmptyField]) {
        openChecklistModal(QUAD_ACTIONS[nextEmptyField], nextEmptyField);
      }
    } else {
      // Deactivating auto-expand mode
      setAutoExpanded(false);
      closeChecklistModal();
    }
  };

  const toggleAutoNWC = () => {
    setAutoNWC(!autoNWC);
  };

  //EP div structures retrieval
  const epDivs = getEPDivs({
    epsData: inputData,
    handleEPsChange: handleInputsChange,
    getInputClass,
    openNWCModal,
    fullMode: false
  });

  //Full EP div structures retrieval (includes non-memory items)
  const fullEpDivs = getEPDivs({
    epsData: inputData,
    handleEPsChange: handleInputsChange,
    getInputClass,
    openNWCModal,
    fullMode: true
  });

  //Quad div structures retrieval
  const quadDivs = getQuadDivs({
    getInputClass,
    openChecklistModal, 
    openNWCModal
  });

  //Map div elements to key for retrival
  const divMap = {
    'epDivs': [epDivs, EP_ANSWERS, EP_LENGTHS],
    'fullEpDivs': [fullEpDivs, EP_FULL_ANSWERS, EP_FULL_LENGTHS],
    'quadDivs': [quadDivs, QUAD_ANSWERS, QUAD_LENGTHS]
  };

    // Auto NWC logic: automatically show NWC when a step is completed via clicking controls
  useEffect(() => {
    if (!autoNWC) return;

    // Get all step keys for the current EP/checklist
    const currentKey = divMap[currentDivKey][0][currentIndexArray[currentIndex]].key;
    const currentEPFields = Object.keys(inputAnswers).filter(key => key.startsWith(currentKey));

    // Find steps that just became 'checked' or 'correct' (from clicking controls)
    const prevResults = prevCheckResultsRef.current;
    const newlyCompletedSteps = Object.keys(checkResults).filter(key => {
      // Only consider steps from the current EP
      if (!currentEPFields.includes(key)) return false;

      const currentStatus = checkResults[key];
      const prevStatus = prevResults[key];

      // Step is newly completed if it's now 'checked' or 'correct' and wasn't before
      return (currentStatus === 'checked' || currentStatus === 'correct') &&
             (prevStatus !== 'checked' && prevStatus !== 'correct');
    });

    if (newlyCompletedSteps.length > 0) {
      const lastCompletedStep = newlyCompletedSteps[newlyCompletedSteps.length - 1];

      // Check if this step has NWC data
      if (EP_NWC[lastCompletedStep] || QUAD_NWC[lastCompletedStep] ) {
        setTimeout(() => {
          openNWCModal(lastCompletedStep);
        }, 600);
      }
    }

    // Update the ref for next comparison
    prevCheckResultsRef.current = {...checkResults};
  }, [checkResults, autoNWC, currentDivKey, currentIndex, currentIndexArray, divMap, inputAnswers]);

  return (
    <>
      <div className="limits-eps-container" style={{maxWidth: CONTAINER_MAX_WIDTH}}>
        {/* Header with Instructions Button */}
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '100px', marginBottom: '5px'}}>
          <button onClick={() => setShowInstructions(true)}>
            Instructions
          </button>
          <h1 style={{fontSize: '20px', margin: '15px 0'}}>T-6B INTERACTIVE COCKPIT</h1>
          <button
            onClick={() => setCockpitMode(cockpitMode === 'full' ? 'simplified' : 'full')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: cockpitMode === 'full' ? '#01202C' : '#003B4F',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              minWidth: '100px'
            }}
          >
            {cockpitMode === 'full' ? 'Simple Mode' : 'Full Mode'}
          </button>
        </div>

        {/* Instructions Modal */}
        {showInstructions && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: 1000}}
            onClick={() => setShowInstructions(false)}
          >
            <div
              style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', 
                maxWidth: '600px', maxHeight: '80vh', overflow: 'auto', position: 'relative'}}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInstructions(false)}
                style={{position: 'absolute', top: '10px', right: '10px', fontSize: '24px',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#666'}}
              >
                &times;
              </button>
              <h2 style={{marginTop: 0, marginBottom: '20px'}}>How to Use the Interactive Cockpit</h2>
              <div style={{lineHeight: '1.6'}}>
                <h3 style={{fontSize: '14px', marginTop: '15px'}}>How It Works</h3>
                <ul>
                  <li>Each checklist step can be completed by clicking the correct control or button, including the skip button</li>
                  <li>For EPs, you can also type answers directly into the input fields</li>
                  <li><strong>Full EPs</strong> are the critical memory EPs including non memory items. Some items do not have a corresponding control and must be skipped</li>
                  <li>Clicking a correct control will automatically fill the entire step</li>
                  <li>Clicking on steps in the quadfold will reveal the corresponding expanded checklist item</li>
                  <li>Clicking on the ## of ## indicator will display a dropdown from which a specific checklist can be selected</li>
                  <li>A <span style={{backgroundColor: '#f8d0d0'}}>red</span> step means the incorrect control was clicked or inputted. EPs are verbatim!</li>
                  <li>A <span style={{backgroundColor: '#faf6be'}}>yellow</span> step means a part of the correct controls have been clicked or inputted</li>
                  <li>A <span style={{backgroundColor: '#d0f0d0'}}>green</span> or <span style={{backgroundColor: '#d0f3f8'}}>blue</span> step means the correct controls have been clicked or inputted</li>
                </ul>

                <h3 style={{fontSize: '14px', marginTop: '15px'}}>Buttons & Controls</h3>
                <ul>
                  <li><strong>Simple/Full Mode</strong> Toggle to remove/add cockpit poster and associated buttons</li>
                  <li><strong>NWC Buttons:</strong> Small buttons on individual steps that display Notes, Warnings, and Cautions relevant to that step.</li>
                  <li><strong>Hint:</strong> Highlights controls related to the current step</li>
                  <li><strong>Next Answer/Skip:</strong> Reveals and fills the next unanswered/unchecked step</li>
                  <li><strong>All Answers:</strong> Completes all remaining steps</li>
                  <li><strong>Check:</strong> Validates your answers (EPs only)</li>
                  <li><strong>Reset:</strong> Clears all answers and feedback</li>
                  <li><strong>Random/Sequential Order:</strong> Toggle between randomized and sequential checklist order (EPs only)</li>
                  <li><strong>Auto Expanded:</strong> Auto-displays and progresses through the expanded checklist for each step (Quadfold only)</li>
                  <li><strong>Auto NWC:</strong> Automatically shows NWC information when a step is completed by clicking controls</li>
                </ul>

                <h3 style={{fontSize: '14px', marginTop: '15px'}}>Navigation</h3>
                <ul>
                  <li>Use <strong>Previous/Next</strong> buttons to move between checklists</li>
                  <li>Switch between <strong>EPs</strong>, <strong>Full EPs</strong>, and <strong>Quadfold</strong> checklists using the toggle at the bottom</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="eps-page">
            {/* EPS LAYOUT WITH SIDE CONTROLS */}
            <div style={{display: 'flex', gap: LAYOUT_GAP, alignItems: 'flex-start', justifyContent: 'center'}}>
              {/* LEFT CONTROLS */}
              {cockpitMode === 'full' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0px', width: SIDE_CONTROLS_WIDTH, flexShrink: 1, minWidth: '80px'}}>
                {/* Left Panel Image with clickable overlay */}
                <div style={{position: 'relative', width: '100%'}}>
                  <img src="/images/left.png" alt="Left Control" style={{width: '100%', height: 'auto', display: 'block'}} />
                  <div
                    onClick={() => tryNextStep(clickableControls['trimIndi'])}
                    className = {getClickClass('trimIndi')} style={{top: '0.7%', left: '26%', width: '53%', height: '3.8%'}}
                    title="Trim Indicators"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['trimAid'])}
                    className = {getClickClass('trimAid')} style={{top: '7.4%', left: '76%', width: '9%', height: '1.5%'}}
                    title="Trim Aid"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['floodLight'])}
                    className={getClickClass('floodLight')} style={{top: '7.9%', left: '18%', width: '8%', height: '1.4%'}}
                    title="Flood Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['sideLight'])}
                    className={getClickClass('sideLight')} style={{top: '5.8%', left: '37%', width: '8%', height: '1.4%'}}
                    title="Side Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['instLight'])}
                    className={getClickClass('instLight')} style={{top: '7.9%', left: '56.5%', width: '8%', height: '1.4%'}}
                    title="Inst Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['ldgLight'])}
                    className={getClickClass('ldgLight')} style={{top: '10.8%', left: '14.8%', width: '9%', height: '2%'}}
                    title="LDG Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['taxiLight'])}
                    className={getClickClass('taxiLight')} style={{top: '11.1%', left: '30%', width: '9%', height: '1.5%'}}
                    title="Taxi Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['anticollLight'])}
                    className={getClickClass('anticollLight')} style={{top: '11.1%', left: '45.2%', width: '9%', height: '1.5%'}}
                    title="Anti-Coll Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['navLight'])}
                    className={getClickClass('navLight')} style={{top: '11.1%', left: '60.1%', width: '9%', height: '1.5%'}}
                    title="Nav Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['trimDisco'])}
                    className={getClickClass('trimDisco')} style={{top: '11%', left: '77.1%', width: '8.6%', height: '1.5%'}}
                    title="Trim Disconnect"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['flaps'])}
                    className={getClickClass('flaps')} style={{top: '23.1%', left: '62%', width: '35%', height: '4.7%'}}
                    title="Flaps"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['pcl'])}
                    className={getClickClass('pcl')} style={{top: '28%', left: '13%', width: '84%', height: '10%'}}
                    title="PCL/Speed Brake"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['altLdgGrTest'])}
                    className={getClickClass('altLdgGrTest')} style={{top: '38.9%', left: '11.9%', width: '9%', height: '1.5%'}}
                    title="ALT/LDG GR Test"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['ovrSpdOvrGTest'])}
                    className={getClickClass('ovrSpdOvrGTest')} style={{top: '38.9%', left: '28%', width: '9%', height: '1.5%'}}
                    title="OVR SPD/OVR G Test"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['aoaSystemTest'])}
                    className={getClickClass('aoaSystemTest')} style={{top: '41.9%', left: '11.9%', width: '9%', height: '1.5%'}}
                    title="AOA System Test"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['bingoFuelTest'])}
                    className={getClickClass('bingoFuelTest')} style={{top: '41.9%', left: '28%', width: '9%', height: '1.5%'}}
                    title="BINGO FUEL Test"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['lampTest'])}
                    className={getClickClass('lampTest')} style={{top: '44.6%', left: '11.9%', width: '9%', height: '1.5%'}}
                    title="Lamp Test"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['fireDetection'])}
                    className={getClickClass('fireDetection')} style={{top: '39%', left: '64.3%', width: '9%', height: '1.5%'}}
                    title="Fire Detection"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['seatHeight'])}
                    className={getClickClass('seatHeight')} style={{top: '40%', left: '78%', width: '9%', height: '1.5%'}}
                    title="Seat Height Adjust"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['auxBatTest'])}
                    className={getClickClass('auxBatTest')} style={{top: '44.4%', left: '63.5%', width: '9%', height: '1.5%'}}
                    title="AUX BAT Test"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['cfs'])}
                    className={getClickClass('cfs')} style={{top: '48.7%', left: '11%', width: '70%', height: '4%'}}
                    title="CFS"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['prop'])}
                    className={getClickClass('prop')} style={{top: '60.9%', left: '54.5%', width: '10%', height: '2%'}}
                    title="Prop Sys Circuit Breaker"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['fdrlgt'])}
                    className={getClickClass('fdrlgt')} style={{top: '84.25%', left: '41.5%', width: '13%', height: '2%'}}
                    title="FDR Lights"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['firewall'])}
                    className={getClickClass('firewall')} style={{top: '86.7%', left: '7%', width: '48%', height: '7.7%'}}
                    title="Firewall Shutoff Handle"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['antiG'])}
                    className={getClickClass('antiG')} style={{top: '95%', left: '43%', width: '18%', height: '3%'}}
                    title="Anti-G test"
                  />
                </div>
              </div>
              )}

              {/* CENTER - EPS CONTENT */}
              <div style={{
                flex: cockpitMode === 'simplified' ? '1' : `0 1 ${CENTER_CONTENT_WIDTH}`,
                width: cockpitMode === 'simplified' ? '100%' : CENTER_CONTENT_WIDTH,
                maxWidth: cockpitMode === 'simplified' ? '1200px' : CENTER_CONTENT_WIDTH,
                alignItems: 'center',
                flexShrink: 1,
                minWidth: '300px'
              }}>
                {cockpitMode === 'full' && (
                <>
                <div style={{position: 'relative', width: '100%'}}>
                  <img src="/images/croptop.png" alt="Top Control" style={{width: '100%', height: 'auto', display: 'block', minWidth: 0}} />
                  <div
                    onClick={() => tryNextStep(clickableControls['masterArm'])}
                    className={getClickClass('masterArm')} style={{top: '45.7%', left: '11.8%', width: '2.4%', height: '2.6%'}}
                        title="Master Arm"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['emerLdgGr'])}
                    className={getClickClass('emerLdgGr')} style={{top: '63.7%', left: '6%', width: '5.5%', height: '8%'}}
                        title="Emer Ldg Gr"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['flapIndi'])}
                    className={getClickClass('flapIndi')} style={{top: '66%', left: '12%', width: '5%', height: '6%'}}
                        title="Flap Indicator"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['gear'])}
                    className={getClickClass('gear')} style={{top: '78.5%', left: '6.2%', width: '4%', height: '8%'}}
                        title="Landing Gear"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['gearlgt'])}
                    className={getClickClass('gearlgt')} style={{top: '77.1%', left: '4.8%', width: '2.5%', height: '2.9%'}}
                        title="Landing Gear Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['gearlgt'])}
                    className={getClickClass('gearlgt')} style={{top: '75.3%', left: '8%', width: '2.5%', height: '2.9%'}}
                        title="Landing Gear Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['gearlgt'])}
                    className={getClickClass('gearlgt')} style={{top: '77.1%', left: '11.2%', width: '2.5%', height: '2.9%'}}
                        title="Landing Gear Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['brakes'])}
                    className={getClickClass('brakes')} style={{top: '70%', left: '19.8%', width: '18%', height: '27%'}}
                        title="Brakes"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['brakes'])}
                    className={getClickClass('brakes')} style={{top: '70%', left: '62%', width: '18%', height: '27%'}}
                        title="Brakes"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['com1'])}
                    className={getClickClass('com1')} style={{top: '68.2%', left: '43.1%', width: '1.3%', height: '1.5%'}}
                        title="COM1"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['com2'])}
                    className={getClickClass('com2')} style={{top: '68.2%', left: '47.2%', width: '1.3%', height: '1.5%'}}
                        title="COM2"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['navcom'])}
                    className={getClickClass('navcom')} style={{top: '68.1%', left: '51.35%', width: '1.3%', height: '1.5%'}}
                        title="NAV"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['dme'])}
                    className={getClickClass('dme')} style={{top: '70.3%', left: '43.1%', width: '1.3%', height: '1.5%'}}
                        title="DME"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['mkr'])}
                    className={getClickClass('mkr')} style={{top: '70.3%', left: '47.2%', width: '1.3%', height: '1.5%'}}
                        title="MKR"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['vox'])}
                    className={getClickClass('vox')} style={{top: '72.4%', left: '43.1%', width: '1.3%', height: '1.5%'}}
                        title="VOX"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['emrnrm'])}
                    className={getClickClass('emrnrm')} style={{top: '72.4%', left: '49.2%', width: '1.3%', height: '1.5%'}}
                        title="EMR/NRM"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['ventcon'])}
                    className={getClickClass('ventcon')} style={{top: '87%', left: '41.6%', width: '1.9%', height: '10.7%'}}
                        title="Vent Control Lever"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['defog'])}
                    className={getClickClass('defog')} style={{top: '90.7%', left: '45.3%', width: '2.5%', height: '3.2%'}}
                        title="Defog"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['elt'])}
                    className={getClickClass('elt')} style={{top: '62.6%', left: '88%', width: '1%', height: '1.6%'}}
                        title="ELT"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['parkingBrake'])}
                    className={getClickClass('parkingBrake')} style={{top: '72.1%', left: '90.7%', width: '2%', height: '9.5%'}}
                        title="Parking Brake"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['navMenu'])}
                    className={getClickClass('navMenu')} style={{top: '33.3%', left: '21.2%', width: '1.3%', height: '1.8%'}}
                        title="NAV Menu"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['mastwarn'])}
                    className={getClickClass('mastwarn')} style={{top: '13.5%', left: '30.1%', width: '2.3%', height: '1.6%'}}
                        title="Master Warn"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['mastcaut'])}
                    className={getClickClass('mastcaut')} style={{top: '13.5%', left: '34.75%', width: '2.3%', height: '1.6%'}}
                        title="Master Caut"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['firelight'])}
                    className={getClickClass('firelight')} style={{top: '9.8%', left: '32.6%', width: '2.1%', height: '2.3%'}}
                        title="Fire Light"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['redaoa'])}
                    className={getClickClass('redaoa')} style={{top: '4.3%', left: '31.6%', width: '1%', height: '1.3%'}}
                        title="AOA Red Chevron"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['amberaoa'])}
                    className={getClickClass('amberaoa')} style={{top: '2.45%', left: '31.6%', width: '1%', height: '1.3%'}}
                        title="AOA Amber Donut"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['greenaoa'])}
                    className={getClickClass('greenaoa')} style={{top: '0.5%', left: '31.6%', width: '1%', height: '1.3%'}}
                        title="AOA Green Donut"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['clock'])}
                    className={getClickClass('clock')} style={{top: '29.6%', left: '32.1%', width: '4%', height: '1.1%'}}
                        title="Clock"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['tcas'])}
                    className={getClickClass('tcas')} style={{top: '42.6%', left: '36.1%', width: '1.4%', height: '1.6%'}}
                        title="TCAS"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['tcasrng'])}
                    className={getClickClass('tcasrng')} style={{top: '50.1%', left: '36.1%', width: '1.4%', height: '1.6%'}}
                        title="RNG"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['aoaindi'])}
                    className={getClickClass('aoaindi')} style={{top: '38.7%', left: '41.6%', width: '1%', height: '9.6%'}}
                        title="AOA Indicator"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['airspeed'])}
                    className={getClickClass('airspeed')} style={{top: '38.7%', left: '42.8%', width: '1.7%', height: '9%'}}
                        title="Airspeed"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['attitude'])}
                    className={getClickClass('attitude')} style={{top: '39%', left: '46%', width: '7%', height: '7%'}}
                        title="Attitude"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['altitude'])}
                    className={getClickClass('altitude')} style={{top: '38.6%', left: '54.2%', width: '1.8%', height: '9%'}}
                        title="Altitude"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['vsi'])}
                    className={getClickClass('vsi')} style={{top: '38.6%', left: '56.1%', width: '1.7%', height: '9%'}}
                        title="VSI"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['slipskid'])}
                    className={getClickClass('slipskid')} style={{top: '46.8%', left: '49.4%', width: '0.5%', height: '0.6%'}}
                        title="Slip/Skid Indicator"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['turni'])}
                    className={getClickClass('turni')} style={{top: '47.7%', left: '47.9%', width: '3.5%', height: '0.5%'}}
                        title="Turn Indicator"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['headi'])}
                    className={getClickClass('headi')} style={{top: '50.8%', left: '45.4%', width: '8.5%', height: '10%'}}
                        title="Heading Indicator"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['greset'])}
                    className={getClickClass('greset')} style={{top: '50.1%', left: '58.5%', width: '1.4%', height: '1.3%'}}
                        title="G Reset"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['fuelquan'])}
                    className={getClickClass('fuelquan')} style={{top: '37.4%', left: '65.1%', width: '2.4%', height: '7.3%'}}
                        title="Fuel Quantity/Balance"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['np'])}
                    className={getClickClass('np')} style={{top: '37%', left: '73.7%', width: '2.7%', height: '1.3%'}}
                        title="NP"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['torque'])}
                    className={getClickClass('torque')} style={{top: '38.4%', left: '68.1%', width: '6.6%', height: '5%'}}
                        title="Torque"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['oilPress'])}
                    className={getClickClass('oilPress')} style={{top: '38.4%', left: '75%', width: '5.2%', height: '5%'}}
                        title="Oil Pressure"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['oilTemp'])}
                    className={getClickClass('oilTemp')} style={{top: '44.1%', left: '75%', width: '5.2%', height: '5.4%'}}
                        title="Oil Temperature"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['itt'])}
                    className={getClickClass('itt')} style={{top: '44.1%', left: '69.5%', width: '5.2%', height: '5.4%'}}
                        title="ITT"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['n1'])}
                    className={getClickClass('n1')} style={{top: '50%', left: '69.5%', width: '5.2%', height: '5.4%'}}
                        title="N1"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['hydPress'])}
                    className={getClickClass('hydPress')} style={{top: '50%', left: '75%', width: '5.2%', height: '5.4%'}}
                        title="Hyd Pressure"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['bingo'])}
                    className={getClickClass('bingo')} style={{top: '46.5%', left: '61.5%', width: '1.4%', height: '1.3%'}}
                        title="Bingo Fuel Set"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['fuelflow'])}
                    className={getClickClass('fuelflow')} style={{top: '48.5%', left: '64.5%', width: '4.5%', height: '0.6%'}}
                        title="Fuel Flow"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['ioat'])}
                    className={getClickClass('ioat')} style={{top: '49.4%', left: '64.5%', width: '4.5%', height: '0.7%'}}
                        title="IOAT"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['voltamps'])}
                    className={getClickClass('voltamps')} style={{top: '50.3%', left: '64.5%', width: '4.5%', height: '1.5%'}}
                        title="Volts/Amps"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['altdelta'])}
                    className={getClickClass('altdelta')} style={{top: '52%', left: '64.5%', width: '4.9%', height: '1.8%'}}
                        title="Cockpit Altitude/Delta P"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['uhf'])}
                    className={getClickClass('uhf')} style={{top: '3.7%', left: '46.4%', width: '1.3%', height: '1.4%'}}
                        title="UHF"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['vhf'])}
                    className={getClickClass('vhf')} style={{top: '6.2%', left: '46.4%', width: '1.3%', height: '1.4%'}}
                        title="VHF"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['vor'])}
                    className={getClickClass('vor')} style={{top: '8.6%', left: '46.4%', width: '1.3%', height: '1.4%'}}
                        title="VOR"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['transponder'])}
                    className={getClickClass('transponder')} style={{top: '11%', left: '46.4%', width: '1.3%', height: '1.4%'}}
                        title="Transponder"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['pfdbut'])}
                    className={getClickClass('pfdbut')} style={{top: '3.5%', left: '56.1%', width: '1.7%', height: '1.9%'}}
                        title="PFD Button"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['sysbut'])}
                    className={getClickClass('sysbut')} style={{top: '5.8%', left: '56.1%', width: '1.7%', height: '1.9%'}}
                        title="SYS Button"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['hudcage'])}
                    className={getClickClass('hudcage')} style={{top: '18.5%', left: '46.3%', width: '0.7%', height: '1.7%'}}
                        title="HUD CAGE Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['hudlgt'])}
                    className={getClickClass('hudlgt')} style={{top: '18.5%', left: '48.6%', width: '0.8%', height: '1.7%'}}
                        title="HUD LGT Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['mfdrep'])}
                    className={getClickClass('mfdrep')} style={{top: '22.3%', left: '48.6%', width: '0.8%', height: '1.7%'}}
                        title="MFD/UFCP Repeat/NORM"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['lgthud'])}
                    className={getClickClass('lgthud')} style={{top: '18.2%', left: '51.2%', width: '1.8%', height: '2.9%'}}
                        title="LGT-HUD"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['lgtufcp'])}
                    className={getClickClass('lgtufcp')} style={{top: '22%', left: '51.25%', width: '1.8%', height: '2.9%'}}
                        title="LGT-UFCP"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['baroset'])}
                    className={getClickClass('baroset')} style={{top: '22%', left: '57.7%', width: '1.8%', height: '2.9%'}}
                        title="BARO SET"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['bfi'])}
                    className={getClickClass('bfi')} style={{top: '20.5%', left: '63.2%', width: '8%', height: '8.6%'}}
                        title="BFI"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['bfiset'])}
                    className={getClickClass('bfiset')} style={{top: '29.5%', left: '70%', width: '1.6%', height: '2%'}}
                        title="BFI Baro Set"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['eicas'])}
                    className={getClickClass('eicas')} style={{top: '56.1%', left: '63.8%', width: '16.3%', height: '5%'}}
                        title="EICAS Warnings"
                  />
                </div>
                <div style={{display: 'flex', gap: '2px', alignItems: 'flex-start', justifyContent: 'center'}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0px', width: '37.5%', flexShrink: 1, minWidth: '100px'}}>
                    <div className="control-section" style = {{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px'}}>
                      <button className={getClickClass('ege', 'button')} onClick={() => tryNextStep(clickableControls['ege'])}>
                        EGE
                      </button>
                      <button className={getClickClass('iss', 'button')} onClick={() => tryNextStep(clickableControls['iss'])}>
                        ISS
                      </button>
                      <button className={getClickClass('seat', 'button')} onClick={() => tryNextStep(clickableControls['seat'])}>
                        Seat
                      </button>
                      <button className={getClickClass('canopy', 'button')} onClick={() => tryNextStep(clickableControls['canopy'])}>
                        Canopy
                      </button>
                      <button className={getClickClass('fittings', 'button')} onClick={() => tryNextStep(clickableControls['fittings'])}>
                        Fittings
                      </button>
                      <button className={getClickClass('mask', 'button')} onClick={() => tryNextStep(clickableControls['mask'])}>
                        Mask
                      </button>
                      <button className={getClickClass('terminate', 'button')} onClick={() => tryNextStep(clickableControls['terminate'])}>
                        Terminate Maneuver
                      </button>
                      <button className={getClickClass('expo', 'button')} onClick={() => tryNextStep(clickableControls['expo'])}>
                        External Power
                      </button>
                      <button className={getClickClass('loose', 'button')} onClick={() => tryNextStep(clickableControls['loose'])}>
                        Loose Items
                      </button>
                    </div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0px', width: '25%', flexShrink: 1, alignItems: 'center', minWidth: '60px'}}>
                    <div
                      className={getClickClass('stick', 'image')}
                      onClick={() => tryNextStep(clickableControls['stick'])}
                      title="Control Stick"
                      style={{cursor: 'pointer', display: 'inline-block', lineHeight: 0}}
                    >
                      <img src="/images/stick.png" alt="Control Stick"
                        style={{width: '100%', height: 'auto', display: 'block', minWidth: 0}}
                      />
                    </div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0px', width: '37.5%', flexShrink: 1, minWidth: '100px'}}>
                    <div className="control-section" style = {{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px'}}>
                      <button className={getClickClass('forcedLanding', 'button')} onClick={() => tryNextStep(clickableControls['forcedLanding'])}>
                        Forced Landing/Eject
                      </button>
                      <button className={getClickClass('pel', 'button')} onClick={() => tryNextStep(clickableControls['pel'])}>
                        PEL
                      </button>
                      <button className={getClickClass('elp', 'button')} onClick={() => tryNextStep(clickableControls['elp'])}>
                        ELP
                      </button>
                      <button className={getClickClass('airstart', 'button')} onClick={() => tryNextStep(clickableControls['airstart'])}>
                        Airstart
                      </button>
                      <button className={getClickClass('greenRing', 'button')} onClick={() => tryNextStep(clickableControls['greenRing'])}>
                        Green ring
                      </button>
                      <button className={getClickClass('ttnsf', 'button')} onClick={() => tryNextStep(clickableControls['ttnsf'])}>
                        TTNSF
                      </button>
                      <button className={getClickClass('evacuate', 'button')} onClick={() => tryNextStep(clickableControls['evacuate'])}>
                        Evacuate
                      </button>
                      <button className={getClickClass('chocks', 'button')} onClick={() => tryNextStep(clickableControls['chocks'])}>
                        Chocks
                      </button>
                      <button className={getClickClass('propeller', 'button')} onClick={() => tryNextStep(clickableControls['propeller'])}>
                        Propeller
                      </button>
                    </div>
                  </div>
                </div>
                </>
                )}

                <div style={{
                  width: '100%',
                  alignItems: 'center',
                  minHeight: '375px',
                  margin: '0 auto',
                  position: 'relative'
                }}>
                {/*The actual damn checklist*/}
                {divMap[currentDivKey][0][currentIndexArray[currentIndex]]}

                {/* Checklist Modal Overlay */}
                {showChecklistModal && checklistModalContent && (
                  <div style={{position: 'absolute', top: 0, left: `-${LAYOUT_GAP}`, right: `-${LAYOUT_GAP}`,
                    bottom: '-20px', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
                    alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, paddingTop: '10px',
                    paddingLeft: LAYOUT_GAP, paddingRight: LAYOUT_GAP, paddingBottom: '50px'}}
                    onClick={closeChecklistModal}
                  >
                    <div
                      style={{width: '100%', maxHeight: '100%', position: 'relative'}}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={closeChecklistModal}
                        style={{position: 'absolute', top: '3px', right: '2px', fontSize: '16px',
                          background: 'rgba(0, 0, 0, 0.7)', border: 'none', cursor: 'pointer', color: '#fff', zIndex: 101,
                          padding: '0 4px', lineHeight: '1'}}
                      >
                        &times;
                      </button>
                      {checklistModalContent}
                    </div>
                  </div>
                )}

                {/* NWC Modal Overlay */}
                {showNWCModal && nwcModalContent && (
                  <div style={{position: 'absolute', top: 0, left: `-${LAYOUT_GAP}`, right: `-${LAYOUT_GAP}`,
                    bottom: '-20px', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
                    alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, paddingTop: '10px',
                    paddingLeft: LAYOUT_GAP, paddingRight: LAYOUT_GAP, paddingBottom: '50px', overflowY: 'auto'}}
                    onClick={closeNWCModal}
                  >
                    <div
                      style={{width: '100%', maxWidth: '600px', maxHeight: '90%', position: 'relative',
                        backgroundColor: 'white', borderRadius: '8px', padding: '20px', overflowY: 'auto'}}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={closeNWCModal}
                        style={{position: 'absolute', top: '8px', right: '8px', fontSize: '24px',
                          background: 'transparent', border: 'none', cursor: 'pointer', color: '#333', zIndex: 101,
                          padding: '0 8px', lineHeight: '1', fontWeight: 'bold'}}
                      >
                        &times;
                      </button>
                      {nwcModalContent.mode === 'ep' ? (
                        <>
                          {/* Notes/Warnings/Cautions counts: N/W/C letters over the
                              whole-EP digits (black), clicked-step digits (grey) below */}
                          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '8px'}}>
                            {[['N', 'notes'], ['W', 'warnings'], ['C', 'cautions']].map(([letter, cat]) => (
                              <div key={cat} style={{textAlign: 'center'}}>
                                <div style={{fontSize: '11px', fontWeight: 'bold', color: 'black', lineHeight: 1.2}}>{letter}</div>
                                <div style={{fontSize: '22px', fontWeight: 'bold', color: 'black', lineHeight: 1.1}}>
                                  {nwcModalContent.epCounts[cat]}
                                </div>
                                <div style={{fontSize: '13px', color: '#aaa'}}>
                                  {nwcModalContent.stepCounts[cat]}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Clicked step's answer text with the "All Hints" toggle on its
                              right, bottom-aligned so it sits on the text's last line */}
                          <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '10px'}}>
                            <h2 style={{flex: 1, margin: 0, fontSize: '14px', textAlign: 'center', fontWeight: 'bold'}}>
                              {nwcModalContent.stepAnswer}
                            </h2>
                            <button
                              onClick={() => setShowAllHints(!showAllHints)}
                              style={{backgroundColor: showAllHints ? '#003B4F' : 'white',
                                color: showAllHints ? 'white' : '#003B4F', border: '1px solid #003B4F',
                                borderRadius: '4px', padding: '2px 8px', fontSize: '11px',
                                fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap'}}
                            >
                              All Hints
                            </button>
                          </div>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            {nwcModalContent.items.map((item) => {
                              const highlight = item.key === nwcModalContent.stepKey
                                ? {boxShadow: `0 0 0 3px #ffc107${item.category === 'warning' ? ', 4px 4px 8px rgba(0, 0, 0, 0.3)' : ''}`}
                                : {};
                              const toggle = () => setExpandedNWC((prev) => ({...prev, [item.seq]: !prev[item.seq]}));
                              const hintShown = showAllHints || revealedHints[item.seq];
                              return expandedNWC[item.seq] ? (
                                <div
                                  key={item.seq}
                                  onClick={toggle}
                                  style={{...NWC_BUBBLE_STYLES[item.category], ...highlight,
                                    padding: '10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer'}}
                                >
                                  <strong style={item.category === 'warning' ? {fontSize: '12px'} : undefined}>
                                    {item.seq}. {NWC_CATEGORY_LABELS[item.category].toUpperCase()}:
                                  </strong> {item.text}
                                </div>
                              ) : (
                                <button
                                  key={item.seq}
                                  onClick={toggle}
                                  style={{...NWC_BUBBLE_STYLES[item.category], ...highlight,
                                    padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', textAlign: 'left',
                                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', gap: '10px'}}
                                >
                                  <span>{item.seq}. {NWC_CATEGORY_LABELS[item.category]}</span>
                                  {item.hint && (
                                    hintShown ? (
                                      <span style={{fontWeight: 'normal', fontStyle: 'italic', color: '#555'}}>
                                        {item.hint}
                                      </span>
                                    ) : (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRevealedHints((prev) => ({...prev, [item.seq]: true}));
                                        }}
                                        style={{fontWeight: 'normal', fontStyle: 'italic', color: '#888',
                                          textDecoration: 'underline'}}
                                      >
                                        Hint
                                      </span>
                                    )
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <h2 style={{marginTop: 0, marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: 'bold'}}>
                            {nwcModalContent.stepAnswer}
                          </h2>
                          {nwcModalContent.content}
                        </>
                      )}
                    </div>
                  </div>
                )}
                </div>
                {(!isGameActive || process.env.NODE_ENV === 'development') && <div className="navigation-buttons">
                  <button onClick={() => {
                    setCurrentIndex(currentIndex-1);
                    setCheckResults(emptyResults());
                    setActiveHints({});
                    setAutoExpanded(false);
                    closeChecklistModal();
                    closeNWCModal();
                  }}
                    disabled={currentIndex === 0}>
                    Previous
                  </button>
                  <span
                    className="checklist-counter"
                    style={{
                      minWidth: '61px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      position: 'relative'
                    }}
                    onClick={() => {
                      setShowEPNavDropdown(!showEPNavDropdown);
                    }}
                  >
                    {currentIndex + 1} of {currentIndexArray.length}
                    {showEPNavDropdown && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'white',
                          border: '2px solid #333',
                          borderRadius: '4px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                          zIndex: 1000,
                          marginTop: '5px',
                          minWidth: '300px',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(currentDivKey === 'epDivs' ? EP_TITLES : currentDivKey === 'fullEpDivs' ? EP_FULL_TITLES : QUAD_TITLES).map((title, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: idx < (currentDivKey === 'epDivs' ? EP_TITLES : currentDivKey === 'fullEpDivs' ? EP_FULL_TITLES : QUAD_TITLES).length - 1 ? '1px solid #ddd' : 'none',
                              backgroundColor: currentIndexArray[currentIndex] === idx ? '#e3f2fd' : 'white',
                              fontSize: '11px',
                              fontWeight: currentIndexArray[currentIndex] === idx ? 'bold' : 'normal',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (currentIndexArray[currentIndex] !== idx) {
                                e.target.style.backgroundColor = '#f5f5f5';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentIndexArray[currentIndex] !== idx) {
                                e.target.style.backgroundColor = 'white';
                              }
                            }}
                            onClick={() => {
                              // Switch to sequential mode and navigate to selected checklist
                              setisRandom(false);
                              const sequentialArray = Array.from({length: inputLengths.length}, (_, i) => i);
                              setCurrentIndexArray(sequentialArray);
                              setCurrentIndex(idx);
                              setCheckResults(emptyResults());
                              setActiveHints({});
                              setAutoExpanded(false);
                              closeChecklistModal();
                              setShowEPNavDropdown(false);
                            }}
                          >
                            {idx + 1}. {title}
                          </div>
                        ))}
                      </div>
                    )}
                  </span>
                  <button onClick={() => {
                    setCurrentIndex(currentIndex+1);
                    setCheckResults(emptyResults());
                    setActiveHints({});
                    setAutoExpanded(false);
                    closeChecklistModal();
                    closeNWCModal();
                  }}
                    disabled={currentIndex === currentIndexArray.length - 1}>
                    Next
                  </button>
                </div>}
              </div>

              {/* RIGHT CONTROLS */}
              {cockpitMode === 'full' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0px', width: SIDE_CONTROLS_WIDTH, flexShrink: 1, minWidth: '80px'}}>

                {/* Right Panel Image with clickable overlay */}
                <div style={{position: 'relative', width: '100%'}}>
                  <img src="/images/right.png" alt="Right Control" style={{width: '100%', height: 'auto', display: 'block'}} />
                  <div
                    onClick={() => tryNextStep(clickableControls['bat'])}
                    className={getClickClass('bat')} style={{top: '1.5%', left: '20.3%', width: '10%', height: '2%'}}
                    title="BAT Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['gen'])}
                    className={getClickClass('gen')} style={{top: '1.5%', left: '38.6%', width: '10%', height: '2%'}}
                    title="GEN Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['aux'])}
                    className={getClickClass('aux')} style={{top: '1.5%', left: '55.8%', width: '10%', height: '2%'}}
                    title="AUX BAT Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['starter'])}
                    className={getClickClass('starter')} style={{top: '6.8%', left: '15.5%', width: '10%', height: '2%'}}
                    title="Starter Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['ignition'])}
                    className={getClickClass('ignition')} style={{top: '7.15%', left: '32.9%', width: '8%', height: '1.8%'}}
                    title="Ignition Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['fuelbal'])}
                    className={getClickClass('fuelbal')} style={{top: '7.1%', left: '49.5%', width: '9%', height: '2%'}}
                    title="FUEL BAL Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['manfuelbal'])}
                    className={getClickClass('manfuelbal')} style={{top: '7.1%', left: '69%', width: '9%', height: '2%'}}
                    title="MANUAL FUEL BAL Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['avionicsMaster'])}
                    className={getClickClass('avionicsMaster')} style={{top: '12%', left: '12.5%', width: '10%', height: '2.7%'}}
                    title="Avionics Master"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['bustie'])}
                    className={getClickClass('bustie')} style={{top: '12.6%', left: '30%', width: '8.2%', height: '2.4%'}}
                    title="Bus Tie"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['probeAntiI'])}
                    className={getClickClass('probeAntiI')} style={{top: '12.3%', left: '46%', width: '8.2%', height: '1.9%'}}
                    title="Probes Anti-Ice"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['boostPump'])}
                    className={getClickClass('boostPump')} style={{top: '12.3%', left: '60%', width: '10%', height: '2%'}}
                    title="Boost Pump Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['pmu'])}
                    className={getClickClass('pmu')} style={{top: '12.3%', left: '75.5%', width: '10%', height: '2%'}}
                    title="PMU Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['bleedAir'])}
                    className={getClickClass('bleedAir')} style={{top: '19.4%', left: '42%', width: '10%', height: '2%'}}
                    title="Bleed Air Inflow"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['evapBlwr'])}
                    className={getClickClass('evapBlwr')} style={{top: '18.7%', left: '11%', width: '20%', height: '3.3%'}}
                    title="EVAP BLWR"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['pressurization'])}
                    className={getClickClass('pressurization')} style={{top: '17.8%', left: '70%', width: '12%', height: '5.1%'}}
                    title="Pressurization Switch"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['airCond'])}
                    className={getClickClass('airCond')} style={{top: '23.9%', left: '8.8%', width: '10%', height: '2%'}}
                    title="Air Cond"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['tempcon'])}
                    className={getClickClass('tempcon')} style={{top: '24.4%', left: '27%', width: '26.5%', height: '4.6%'}}
                    title="Temp Control"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['ramair'])}
                    className={getClickClass('ramair')} style={{top: '25.8%', left: '72%', width: '8%', height: '1.4%'}}
                    title="Ram Air"
                  />
                  {/* OBOGS Controls Area */}
                  <div
                    onClick={() => tryNextStep(clickableControls['obogsFlow'])}
                    className={getClickClass('obogsFlow')} style={{top: '33.3%', left: '16.5%', width: '12.6%', height: '1.2%'}}
                    title="OBOGS Flow Indicator"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['obogsSupply'])}
                    className={getClickClass('obogsSupply')} style={{top: '35.7%', left: '76.5%', width: '10%', height: '4%'}}
                    title="OBOGS Supply Lever"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['obogsConc'])}
                    className={getClickClass('obogsConc')} style={{top: '35.7%', left: '44%', width: '10%', height: '4%'}}
                    title="OBOGS Concentration Lever"
                  />
                  <div
                    onClick={() => tryNextStep(clickableControls['obogsPress'])}
                    className={getClickClass('obogsPress')} style={{top: '35.7%', left: '11.5%', width: '10%', height: '4%'}}
                    title="OBOGS Pressure Lever"
                  />
                </div>
              </div>
              )}
            </div>
        </div>
        <div className="button-row" style={{ justifyContent: 'center', marginTop: '0px' }}>
          {(!isGameActive || process.env.NODE_ENV === 'development') && <>
            {(currentDivKey === 'epDivs' || currentDivKey === 'fullEpDivs') && <button style={{minWidth: '147px'}} onClick={() => {
              setisRandom(!isRandom);
              refreshIndices(divMap[currentDivKey][0], !isRandom);
              setInputData({});
              resetAnswers();}}>
              {isRandom ? "Random " : "Sequential "} Order
            </button>}
            {cockpitMode === 'full' && <button onClick={() => giveHint()}>Hint?</button>}
            <button onClick={nextAnswer}>Next Answer/Skip</button>
            <button onClick={allAnswers}>All Answers</button>
          </>}
          {(currentDivKey === 'epDivs' || currentDivKey === 'fullEpDivs') && <button onClick={checkAnswers}>Check</button>}
          {(!isGameActive || process.env.NODE_ENV === 'development') && <>
            <button onClick={resetAnswers}>Reset</button>
            {currentDivKey === 'quadDivs' && (
              <button
                onClick={toggleAutoExpanded}
                style={{
                  backgroundColor: autoExpanded ? '#4CAF50' : '#f0f0f0',
                  color: autoExpanded ? 'white' : 'black',
                  fontWeight: autoExpanded ? 'bold' : 'normal',
                  border: autoExpanded ? '2px solid #45a049' : '1px solid #ccc',
                  boxShadow: autoExpanded ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                Auto Expanded
              </button>
            )}
          </>}
          <button
            onClick={toggleAutoNWC}
            style={{
              backgroundColor: autoNWC ? '#4CAF50' : '#f0f0f0',
              color: autoNWC ? 'white' : 'black',
              fontWeight: autoNWC ? 'bold' : 'normal',
              border: autoNWC ? '2px solid #45a049' : '1px solid #ccc',
              boxShadow: autoNWC ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            Auto NWC
          </button>
        </div>
        {(!isGameActive || process.env.NODE_ENV === 'development') && <div style={{display: 'flex', justifyContent: 'center', marginTop: '10px'}}>
          <div style={{position: 'relative', height: '60px', width: '300px'}}>
            {/* Labels and circles container */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', width: '100%'}}>
              {/* Line */}
              <div style={{
                position: 'absolute',
                top: '32px',
                left: '10px',
                right: '10px',
                height: '2px',
                backgroundColor: '#333'
              }}></div>
              {/* EPs */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'absolute',
                  left: '-2px'
                }}
                onClick={() => {
                  setCurrentDivKey('epDivs');
                  refreshIndices(divMap['epDivs'][0], isRandom);
                  setInputAnswers(divMap['epDivs'][1]);
                  setInputLengths(divMap['epDivs'][2]);
                  resetAnswers();
                }}
              >
                <span style={{fontSize: '14px', marginBottom: '5px'}}>EPs</span>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #333',
                  backgroundColor: currentDivKey === 'epDivs' ? '#333' : '#fff',
                  transition: 'background-color 0.2s'
                }}></div>
              </div>
              {/* Full EPs */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'absolute',
                  left: '126px'
                }}
                onClick={() => {
                  setCurrentDivKey('fullEpDivs');
                  refreshIndices(divMap['fullEpDivs'][0], isRandom);
                  setInputAnswers(divMap['fullEpDivs'][1]);
                  setInputLengths(divMap['fullEpDivs'][2]);
                  resetAnswers();
                }}
              >
                <span style={{fontSize: '14px', marginBottom: '5px'}}>Full EPs</span>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #333',
                  backgroundColor: currentDivKey === 'fullEpDivs' ? '#333' : '#fff',
                  transition: 'background-color 0.2s'
                }}></div>
              </div>
              {/* Quadfold */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'absolute',
                  right: '-18px'
                }}
                onClick={() => {
                  setCurrentDivKey('quadDivs');
                  setisRandom(false);
                  refreshIndices(divMap['quadDivs'][0], false);
                  setInputAnswers(divMap['quadDivs'][1]);
                  setInputLengths(divMap['quadDivs'][2]);
                  resetAnswers();
                }}
              >
                <span style={{fontSize: '14px', marginBottom: '5px'}}>Quadfold</span>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #333',
                  backgroundColor: currentDivKey === 'quadDivs' ? '#333' : '#fff',
                  transition: 'background-color 0.2s'
                }}></div>
              </div>
            </div>
          </div>
        </div>}
      </div>
    </>
  );
}

export default TW4Cockpit;