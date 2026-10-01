import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useVarRowsScale } from '../useVarRowsScale';
import {
  randBetween, turnToDegrees, tasFromCas, casFromTas, pressureAltitude, timeWithUnit, PER_HOUR,
  preflightWinds, inflightWinds, tacanPointToPoint, convertTimes, timeProblem, gradeAnswer,
} from './navMath';

// The faces and overlays of each wheel, centred in the box. `rest` is how each one sits
// before a solve turns or moves it; the wind overlays start shrunk out of sight.
const WHEELS = {
  dst: [
    { name: 'back', src: '/images/Back Wheel.webp', alt: 'Whiz wheel outer scale', className: 'whiz-img-500', rest: 'rotate(-0.1deg)' },
    { name: 'front', src: '/images/Front Wheel.webp', alt: 'Whiz wheel inner scale', className: 'whiz-img-430', rest: 'rotate(-0.5deg)' },
  ],
  wind: [
    { name: 'back', src: '/images/Back Wind Wheel.webp', alt: 'Wind side outer scale', className: 'whiz-img-500', rest: 'rotate(0.1deg)' },
    { name: 'middle', src: '/images/Middle Wind Wheel.webp', alt: 'Wind side middle scale', className: 'whiz-img-442', rest: '' },
    { name: 'front', src: '/images/Front Wind Wheel.webp', alt: 'Wind side compass rose', className: 'whiz-img-376', rest: '' },
    { name: 'arrow', src: '/images/arrow.png', alt: 'Wind vector', className: 'whiz-img-500', rest: 'scale(0.01)' },
    { name: 'hori', src: '/images/hori.png', alt: 'Crosswind component', className: 'whiz-img-500', rest: 'scale(0.01)' },
    { name: 'verti', src: '/images/verti.png', alt: 'Headwind or tailwind component', className: 'whiz-img-500', rest: 'scale(0.01)' },
    { name: 'dot', src: '/images/dot.png', alt: 'Your position', className: 'whiz-img-500', rest: 'scale(0.01)' },
    { name: 'target', src: '/images/target.png', alt: 'Target position', className: 'whiz-img-500', rest: 'scale(0.01)' },
  ],
};

// The boxes written onto the time conversion hat, each placed by its own class.
const HAT_FIELDS = ['depLocal', 'depZD', 'depZulu', 'ete', 'destLocal', 'destZD', 'destZulu'];

const WHEEL_FOR = {
  'Preflight Winds': 'wind',
  'In Flight Winds': 'wind',
  'Lollipop': 'wind',
  'Time Conversion': 'hat',
};

function WhizWheel() {
  const [questionType, setQuestionType] = useState('Distance');
  const [tableData, setTableData] = useState([]);
  const [explanationText, setExplanationText] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  // Which wheel is drawn, where a solve has turned or moved its parts, and the hat's text.
  const [wheel, setWheel] = useState({ kind: 'dst', turns: {}, hat: {} });
const wheelContainerRef = useRef(null);
  const wrapperRef = useRef(null);
  const { wrapperRef: varRowsWrapperRef, innerRef: varRowsInnerRef, updateScale } = useVarRowsScale();

  // Auto-generate when question type changes, including on initial mount
  useEffect(() => {
    generate(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [questionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset note when leaving Airspeed
  useEffect(() => {
    if (questionType !== 'Airspeed') setNoteOpen(false);
  }, [questionType]);

  // Scale the wheel container to fit narrow viewports
  const fitWheel = useRef(() => {
    const wrapper = wrapperRef.current;
    const container = wheelContainerRef.current;
    if (!wrapper || !container) return;
    const scale = Math.min(1, wrapper.offsetWidth / 600);
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top left';
    wrapper.style.height = `${container.offsetHeight * scale}px`;
  }).current;

  useEffect(() => {
    const obs = new ResizeObserver(() => requestAnimationFrame(fitWheel));
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [fitWheel]);

  // The hat is a shorter box than the wheels.
  useLayoutEffect(fitWheel, [wheel.kind, fitWheel]);

  useLayoutEffect(() => {
    updateScale();
  }, [tableData, updateScale]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearInputFields = () => {
    setTableData(() => Array(10).fill(null).map(() => ({
      variable: '',
      value: '',
      unit: '',
      solved: false,
      display: false
    })));
    setExplanationText('');
  };

  const updateRow = (index, updates) => {
    setTableData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], ...updates };
      return newData;
    });
  };

  const setTurns = (turns) => {
    setWheel(prev => ({ ...prev, turns: { ...prev.turns, ...turns } }));
  };

  const showWheel = (kind) => {
    setWheel({ kind, turns: {}, hat: {} });
  };

  // Where a TACAN position sits on the wind side, as a transform for its marker.
  const dotAt = (r, t, tref, scale) => {
    let t2 = (t + 270 - tref) % 360;
    if (t2 < 0) t2 += 360;
    t2 = 360 - t2;

    const x = r * Math.cos(t2 * Math.PI / 180) * 2.2 * scale;
    const y = -r * Math.sin(t2 * Math.PI / 180) * 2.2 * scale;
    return `translate(-50%, -50%) translateX(${x}px) translateY(${y}px)`;
  };

  // Generate functions
  const generate = () => {
    clearInputFields();
    showWheel(WHEEL_FOR[questionType] || 'dst');

    switch (questionType) {
      case "Distance":
      case "Speed":
      case "Time":
        generateDST(questionType);
        break;
      case "Fuel Consumption":
        generateFuelConsume();
        break;
      case "Fuel Conversions":
        generateFuelConvert();
        break;
      case "Airspeed":
        generateAirspeed();
        break;
      case "Preflight Winds":
        generatePreflight();
        break;
      case "In Flight Winds":
        generateInflight();
        break;
      case "Lollipop":
        generateLollipop();
        break;
      case "Time Conversion":
        generateTime();
        break;
      default:
    }
  };

  const generateDST = (selectedType) => {
    const rand = Math.random();
    let speed = randBetween(22, 130) * 5;
    let dist = 0;

    if (rand < 0.2) dist = randBetween(2, 10) / 2;
    else if (rand < 0.4) dist = randBetween(2, 19) * 5;
    else if (rand < 0.9) dist = randBetween(22, 199) * 5;
    else dist = randBetween(20, 49) * 50;

    const { value: time, unit: units } = timeWithUnit(dist / speed);

    updateRow(0, { variable: 'Distance', value: dist, unit: 'nm', solved: true, display: true });
    updateRow(1, { variable: 'Speed', value: speed, unit: 'kts', solved: true, display: true });
    updateRow(2, { variable: 'Time', value: time, unit: units, solved: true, display: true });

    if (selectedType === "Distance") updateRow(0, { value: '', solved: false });
    else if (selectedType === "Speed") updateRow(1, { value: '', solved: false });
    else if (selectedType === "Time") updateRow(2, { value: '', solved: false });
  };

  const generateFuelConsume = () => {
    const rand = Math.random();
    let fflow = rand < 0.5 ? randBetween(27, 199) * 5 : randBetween(11, 50) * 100;
    let fquan = rand < 0.3 ? randBetween(100, 999) : rand < 0.9 ? randBetween(100, 999) * 10 : randBetween(20, 60) * 500;
    let gquan = Number((fquan / 6.8).toFixed(1));
    const { value: time, unit: units } = timeWithUnit(fquan / fflow);

    const vrand = Math.ceil(3 * Math.random());
    const urand = Math.random();
    let quan = urand < 0.25 ? gquan : fquan;
    let quanUnit = urand < 0.25 ? "gal" : "lbs";

    updateRow(0, { variable: 'Fuel Flow', value: fflow, unit: 'lbs per hour', solved: true, display: true });
    updateRow(1, { variable: 'Time', value: time, unit: units, solved: true, display: true });
    updateRow(2, { variable: 'Fuel Quantity', value: quan, unit: quanUnit, solved: true, display: true });

    updateRow(vrand - 1, { value: '', solved: false });
    if (urand < 0.25) setExplanationText('Assume 6.8 lbs/gal');
  };

  const generateFuelConvert = () => {
    const rand = Math.random();
    let fweight = 6 + randBetween(4, 8) / 10;
    let flbs = rand < 0.5 ? randBetween(100, 999) * 10 : randBetween(20, 60) * 500;
    const fgal = Math.round(flbs / (10 * fweight)) * 10;
    const vrand = Math.ceil(2 * Math.random());

    updateRow(0, { variable: 'Fuel Weight', value: fweight, unit: 'lbs per gal', solved: true, display: true });
    updateRow(1, { variable: 'Fuel (lbs)', value: flbs, unit: 'lbs', solved: true, display: true });
    updateRow(2, { variable: 'Fuel (gal)', value: fgal, unit: 'gals', solved: true, display: true });

    updateRow(vrand, { value: '', solved: false });
  };

  const generateAirspeed = () => {
    const rand = Math.random();
    const labels = ["CALT", "ALTIM", "TEMP", "PALT", "CAS", "TAS"];
    const units = ["ft", "inHg", "C", "ft", "kts", "kts"];

    let calt = rand < 0.5 ? randBetween(180, 999) * 10 : randBetween(20, 45) * 500;
    let cas = randBetween(22, 70) * 5;
    let altim = Number((29.92 + randBetween(-23, 10) / 10).toFixed(2));
    let temp = randBetween(0, 9) * 5 - 25;
    let palt = Math.round(pressureAltitude(calt, altim));
    let tas = Math.round(tasFromCas(temp, palt, cas));

    const values = [calt, altim, temp, palt, cas, tas];
    const vrand = Math.random();
    const hiddenIndex = vrand < 0.3 ? 4 : 5;
    values.forEach((value, i) => {
      updateRow(i, {
        variable: labels[i],
        value: i === hiddenIndex || i === 3 ? '' : value,
        unit: units[i],
        solved: i !== hiddenIndex && i !== 3,
        display: true
      });
    });
  };

  const generatePreflight = () => {
    const rand = Math.random();
    const labels = ["TC", "TAS", "DIR", "VEL", "XW", "CA", "TH", "HW/TW", "GS"];
    const units = ["° T", "kts", "° T", "kts", "kts", "° T", "° T", "kts", "kts"];

    let tas = rand < 0.75 ? randBetween(100, 400) : randBetween(400, 990);
    let kts = (rand < 0.125 || rand > 0.875) ? randBetween(12, 20) * 5 : randBetween(10, 50);
    let tc = randBetween(0, 359);
    let dir = randBetween(0, 72) * 5;

    [tc, tas, dir, kts].forEach((value, i) => {
      const rowIndex = i;
      updateRow(rowIndex, {
        variable: labels[rowIndex],
        value: value,
        unit: units[rowIndex],
        solved: true,
        display: true
      });
    });

    // Clear other wind calculation rows
    for (let i = 4; i < 9; i++) {
      updateRow(i, { variable: labels[i], unit: units[i], display: true });
    }
  };

  const generateInflight = () => {
    const rand = Math.random();
    const labels = ["TH", "TAS", "TRK", "GS", "DA", "XW", "HW/TW", "DIR", "VEL"];
    const units = ["° T", "kts", "° T", "kts", "°", "kts", "kts", "° T", "kts"];

    const th = randBetween(1, 360);
    const tas = rand < 0.75 ? randBetween(100, 400) : randBetween(400, 950);
    const drift = Math.random() < 0.5 ? randBetween(7, 9) : randBetween(2, 6);
    const driftSign = Math.random() < 0.5 ? -1 : 1;
    const trk = ((th + drift * driftSign) % 360 + 360) % 360 || 360;
    const wind = Math.random() < 0.25 ? Math.round(randBetween(12, 30) * 2.5) : Math.round(randBetween(10, 50) * 0.5);
    const gs = tas + wind * (Math.random() < 0.5 ? -1 : 1);

    [th, tas, trk, gs].forEach((value, i) => {
      updateRow(i, {
        variable: labels[i],
        value: value,
        unit: units[i],
        solved: true,
        display: true
      });
    });

    for (let i = 4; i < 9; i++) {
      updateRow(i, { variable: labels[i], unit: units[i], display: true });
    }
  };

  const generateLollipop = () => {
    const rand = Math.random();
    const labels = ["BDHI Reading", "BDHI Distance", "Target Radial", "Target Distance", "Course", "Distance"];
    const units = ["° M", "nm", "° M", "nm", "° M", "nm"];

    let bdhiC = randBetween(0, 359);
    let targetC = 0;
    if (rand < 0.5) {
      targetC = (bdhiC - 180 + randBetween(40, 180) * Math.sign(Math.random() - 0.5)) % 360;
      if (targetC < 0) targetC += 360;
      bdhiC = `${bdhiC} TO`;
    } else {
      targetC = (bdhiC + randBetween(40, 180) * Math.sign(Math.random() - 0.5)) % 360;
      if (targetC < 0) targetC += 360;
      bdhiC = `${bdhiC} FROM`;
    }

    let dist = Math.random() < 0.5 ? randBetween(20, 60) : randBetween(60, 130);
    let targdist = randBetween(10, 100);

    [bdhiC, dist, targetC, targdist].forEach((value, i) => {
      updateRow(i, {
        variable: labels[i],
        value: value,
        unit: units[i],
        solved: true,
        display: true
      });
    });

    updateRow(4, { variable: labels[4], unit: units[4], display: true });
    updateRow(5, { variable: labels[5], unit: units[5], display: true });
  };

  const generateTime = () => {
    for (let i = 0; i < 7; i++) {
      updateRow(i, { display: true });
    }

    const { duration, zd, zd2, times } = timeProblem();
    const hhmm = (t) => t.toString().padStart(4, "0");

    updateRow(0, { variable: 'Duration', value: duration, solved: true });
    updateRow(1, { variable: 'ZD Departure', value: zd, solved: true });
    updateRow(2, { variable: 'ZD Arrival', value: zd2, solved: true });
    updateRow(3, { variable: 'Departure Time LT', value: hhmm(times[0]), unit: 'LT', solved: true });
    updateRow(4, { variable: 'Departure Time UTC', value: hhmm(times[1]), unit: 'UTC', solved: true });
    updateRow(5, { variable: 'Arrival Time UTC', value: hhmm(times[2]), unit: 'UTC', solved: true });
    updateRow(6, { variable: 'Arrival Time LT', value: hhmm(times[3]), unit: 'LT', solved: true });

    const given = randBetween(3, 6);
    [3, 4, 5, 6].filter(i => i !== given).forEach(i => updateRow(i, { value: '', solved: false }));
  };

   // Solve functions
  const solve = (visualize = true) => {
    let solutions = null;
    switch (questionType) {
      case "Distance":
      case "Speed":
      case "Time":
        solutions = solveGenericDST(visualize);
        break;
      case "Fuel Consumption":
        solutions = solveFConsume(visualize);
        break;
      case "Fuel Conversions":
        solutions = solveFConvert(visualize);
        break;
      case "Airspeed":
        solutions = solveAirspeed(visualize);
        break;
      case "Preflight Winds":
        solutions = solvePreflight(visualize);
        break;
      case "In Flight Winds":
        solutions = solveInflight(visualize);
        break;
      case "Lollipop":
        solutions = solveLollipop(visualize);
        break;
      case "Time Conversion":
        solutions = solveTime(visualize);
        break;
      default:
    }
    return solutions;
  };

  const solveGenericDST = (visualize = true) => {
    if (!tableData[0].solved) {
      return solveDST(visualize);
    } else if (!tableData[1].solved) {
      return solveSTD(visualize);
    } else if (!tableData[2].solved) {
      return solveTDS(visualize);
    }
  };

  const solveDST = (visualize = true) => {
    const speed = parseFloat(tableData[1].value);
    const time1 = parseFloat(tableData[2].value);
    const unit = tableData[2].unit || "hrs";
    let time = time1;
    
    let explainTxt = "";
    if (unit === "secs") {
      time = time1 / 3600;
      explainTxt = "Secs so use the high speed scale 36 under speed";
    } else if (unit === "mins") {
      time = time1 / 60;
      explainTxt = "Mins so use the standard scale 60 under speed";
    } else {
      explainTxt = "Hrs so use the 10 under speed";
    }
    
    let dist = speed * time;
    dist = Number(dist.toFixed(1));
    if(!visualize){return [[dist, 0, dist]]}
    
    setExplanationText(explainTxt);
    updateRow(0, { value: dist, solved: true });
    
    // Update wheel rotation
    const outerDeg = turnToDegrees(dist);
    const innerDeg = turnToDegrees(time1);
    setTurns({
      front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
      back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
    });
    
    return [[dist, 0, dist]];
  };

  const solveSTD = (visualize = true) => {
    const dist = parseFloat(tableData[0].value);
    const time1 = parseFloat(tableData[2].value);
    const unit = tableData[2].unit || "hrs";
    let time = time1;
    let inner = 10;
    
    let explainTxt = "";
    if (unit === "secs") {
      time = time1 / 3600;
      inner = 36;
      explainTxt = "Secs so use the high speed scale 36 under speed";
    } else if (unit === "mins") {
      time = time1 / 60;
      inner = 60;
      explainTxt = "Mins so use the standard scale 60 under speed";
    } else {
      explainTxt = "Hrs so use the 10 under speed";
    }
    
    let speed = dist / time;
    speed = Number(speed.toFixed(1));
    if(!visualize){return [[speed, 1, speed]]}
    
    setExplanationText(explainTxt);
    updateRow(1, { value: speed, solved: true });
    
    const outerDeg = turnToDegrees(speed);
    const innerDeg = turnToDegrees(inner);
    setTurns({
      front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
      back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
    });
    
    return [[speed, 1, speed]];
  };

  const solveTDS = (visualize = true) => {
    const dist = parseFloat(tableData[0].value);
    const speed = parseFloat(tableData[1].value);
    const { value: time, unit: units } = timeWithUnit(dist / speed);
    const explainTxt = {
      hrs: "Distance is much greater than speed, so use the 10 under speed and hrs",
      mins: "Distance is not too small or large, so use the 60 under speed and mins",
      secs: "Distance is much smaller than speed, so use the 36 under speed and secs",
    }[units];
    if(!visualize){
      // Grade in whatever unit the student picked for the answer.
      const answer = dist / speed * (PER_HOUR[tableData[2].unit] || PER_HOUR[units]);
      return [[answer, 2, answer]];
    }

    setExplanationText(explainTxt);
    updateRow(2, { value: time, unit: units, solved: true });
    
    const outerDeg = turnToDegrees(dist);
    const innerDeg = turnToDegrees(time);
    setTurns({
      front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
      back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
    });
    
    return [[time, 2, time]];
  };

  const solveFConsume = (visualize = true) => {
    let qnum = -1;
    for (let i of [0, 1, 2]) {
      if (!tableData[i].solved) {
        qnum = i;
        break;
      }
    }
    
    let explainTxt = "";
    let outerDeg = 0;
    let innerDeg = 0;
    
    if (qnum === 0) {
      // Solve for fuel flow
      let fquan = parseFloat(tableData[2].value);
      const quanUnit = tableData[2].unit || "lbs";
      let time = parseFloat(tableData[1].value);
      const unit = tableData[1].unit;
      
      if (quanUnit === "gal") fquan *= 6.8;
      
      let inner = 10;
      if (unit === "secs") {
        time = time / 3600;
        inner = 36;
        explainTxt = "Secs so use the high speed scale 36 under flow rate";
      } else if (unit === "mins") {
        time = time / 60;
        inner = 60;
        explainTxt = "Mins so use the standard scale 60 under flow rate";
      } else {
        explainTxt = "Hrs so use the 10 under flow rate";
      }
      
      const fflow = Number((fquan / time).toFixed(1));
      if(!visualize){return [[fflow, 0, fflow]]}
      updateRow(0, { value: fflow, solved: true });
      
      outerDeg = turnToDegrees(fflow);
      innerDeg = turnToDegrees(inner);
      
    } else if (qnum === 1) {
      // Solve for time
      const fflow = parseFloat(tableData[0].value);
      let fquan = parseFloat(tableData[2].value);
      const quanUnit = tableData[2].unit || "lbs";
      if (quanUnit === "gal") fquan *= 6.8;
      
      const { value: time, unit } = timeWithUnit(fquan / fflow);
      explainTxt = {
        hrs: "Quantity is much greater than flow, so use the 10 under flow and hrs",
        mins: "Quantity is not too small or large, so use the 60 under flow and mins",
        secs: "Quantity is much smaller than flow, so use the 36 under flow and secs",
      }[unit];
      if(!visualize){return [[time, 1, time]]}
      
      updateRow(1, { value: time, unit: unit, solved: true });
      
      outerDeg = turnToDegrees(fquan);
      innerDeg = turnToDegrees(time);
      
    } else if (qnum === 2) {
      // Solve for fuel quantity
      const fflow = parseFloat(tableData[0].value);
      const time1 = parseFloat(tableData[1].value);
      const unit = tableData[1].unit;
      let time = time1;
      
      if (unit === "secs") {
        time = time1 / 3600;
        explainTxt = "Secs so use the high speed scale 36 under flow rate";
      } else if (unit === "mins") {
        time = time1 / 60;
        explainTxt = "Mins so use the standard scale 60 under flow rate";
      } else {
        explainTxt = "Hrs so use the 10 under flow rate";
      }
      
      const quanUnit = tableData[2].unit || "lbs";
      const fquanLbs = fflow * time;
      const fquan = Number((quanUnit === "gal" ? fquanLbs / 6.8 : fquanLbs).toFixed(1));
      if(!visualize){return [[fquan, 2, fquan]]}
      updateRow(2, { value: fquan, unit: quanUnit, solved: true });
      
      outerDeg = turnToDegrees(fquanLbs);
      innerDeg = turnToDegrees(time1);
    }else {
        outerDeg = 0;
        innerDeg = 0;
        if(!visualize){return}
        explainTxt = "Nothing's blank, nothing to solve";
    }
    
    setExplanationText(explainTxt);
    
    setTurns({
      front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
      back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
    });
  };

  const solveFConvert = (visualize = true) => {
    let qnum = -1;
    let outerDeg = 0;
    let innerDeg = 0;

    for (let i of [1, 2]) {
      if (!tableData[i].solved) {
        qnum = i;
        break;
      }
    }
    
    const fweight = parseFloat(tableData[0].value);
    
    if (qnum === 1) {
      const fgal = parseFloat(tableData[2].value);
      const flbs = Number((fgal * fweight).toFixed(1));
      if(!visualize){return [[flbs, 1, flbs]]}
      updateRow(1, { value: flbs, solved: true });
      
      outerDeg = turnToDegrees(flbs);
      innerDeg = turnToDegrees(fgal);
    } else if (qnum === 2) {
      const flbs = parseFloat(tableData[1].value);
      const fgal = Number((flbs / fweight).toFixed(1));
      if(!visualize){return [[fgal, 2, fgal]]}
      updateRow(2, { value: fgal, solved: true });
      
      outerDeg = turnToDegrees(flbs);
      innerDeg = turnToDegrees(fgal);
    }else{
        outerDeg = 0;
        innerDeg = 0;
        if(!visualize){return}
        setExplanationText("Nothing's blank, nothing to solve");
    }
    setTurns({
      front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
      back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
    });
  };

  const solveAirspeed = (visualize = true) => {
    let outerDeg = 0;
    let innerDeg = 0;
    const calt = parseFloat(tableData[0].value);
    const altim = parseFloat(tableData[1].value);
    const temp = parseFloat(tableData[2].value);
    
    let qnum = -1;
    if (!tableData[4].solved) qnum = 4;
    else if (!tableData[5].solved) qnum = 5;
    
    let palt = isNaN(calt) ? parseFloat(tableData[3].value) : pressureAltitude(calt, altim);
    
    if (qnum === 4) {
      const tas = parseFloat(tableData[5].value);
      let cas = casFromTas(temp, palt, tas);
      cas = Math.round(cas);
      if(!visualize){return [[palt, 3, palt], [cas, 4, cas]]}
      
      updateRow(3, { value: Math.round(palt), solved: true });
      updateRow(4, { value: cas, solved: true });

      const palt_k = palt / 1000;
      const inNum = 0.00510393 * Math.pow(palt_k, 2) - 1.13231 * palt_k + 75.00346;
      const logCAS = Math.log10(cas);
      const outnum = Math.pow(10, 1.696 * logCAS - 0.446626 * Math.pow(logCAS, 2) + 0.0752139 * Math.pow(logCAS, 3) - 0.72681);
        
      outerDeg = turnToDegrees(outnum);
      innerDeg = turnToDegrees(inNum);
    } else if (qnum === 5) {
      const cas = parseFloat(tableData[4].value);
      let tas = tasFromCas(temp, palt, cas);
      tas = Math.round(tas);
      if(!visualize){return [[palt, 3, palt], [tas, 5, tas]]}
      
      updateRow(3, { value: Math.round(palt), solved: true });
      updateRow(5, { value: tas, solved: true });

      const palt_k = palt / 1000;
      const inNum = 0.00510393 * Math.pow(palt_k, 2) - 1.13231 * palt_k + 75.00346;
      const logCAS = Math.log10(cas);
      const outnum = Math.pow(10, 1.696 * logCAS - 0.446626 * Math.pow(logCAS, 2) + 0.0752139 * Math.pow(logCAS, 3) - 0.72681);
        
      outerDeg = turnToDegrees(outnum);
      innerDeg = turnToDegrees(inNum);
    } else {
        if(!visualize){return}
        outerDeg = 0;
        innerDeg = 0;
    }

    setTurns({
      front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
      back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
    });
  };

  const solvePreflight = (visualize = true) => {
    const tc = parseFloat(tableData[0].value);
    const tas = parseFloat(tableData[1].value);
    const dir = parseFloat(tableData[2].value);
    const kts = parseFloat(tableData[3].value);
    
    const { xw, ca, th, hwtw, gs } = preflightWinds({ tc, tas, dir, kts });
    
    let xwText = Math.round(xw) < 0 ? Math.round(-xw) + " L" :
                 Math.round(xw) > 0 ? Math.round(xw) + " R" : "0";
    let caText = ca < 0 ? -ca + " L" : ca > 0 ? ca + " R" : "0";
    let hwtwText = hwtw < 0 ? -hwtw + " H" : hwtw > 0 ? hwtw + " T" : "0";
    if(!visualize){return [[xw, 4, 100], [ca, 5, 100], [th, 6, 100, 'deg'], [hwtw, 7, 150], [gs, 8, 200]]}
    
    updateRow(4, { value: xwText, solved: true });
    updateRow(5, { value: caText, solved: true });
    updateRow(6, { value: Math.round(th), solved: true });
    updateRow(7, { value: hwtwText, solved: true });
    updateRow(8, { value: gs, solved: true });
    
    // Update wind wheel visualization
    {
      const innerDeg = 360 - tc;
      const outerDeg = turnToDegrees(tas);
      const arrowDeg = (dir - tc + 360) % 360;
      let kts1 = kts;
      let xw1 = xw;
      let hwtw1 = hwtw;
      if (kts > 60) {
        kts1 = kts / 2;
        xw1 = xw / 2;
        hwtw1 = hwtw / 2;
      }
      const scale = kts1 / 50;
      
      setTurns({
        front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
        back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
        arrow: `translate(-50%, -50%) rotate(${arrowDeg+1}deg) scale(${scale})`,
        hori: `translate(-50%, -50%) translateY(${2.2*hwtw1}px) scale(${xw1/50})`,
        verti: `translate(-50%, -50%) translateX(${2.2*xw1}px) scale(${-hwtw1/50})`,
      });
    }
  };

  const solveInflight = (visualize = true) => {
    const th = parseFloat(tableData[0].value);
    const tas = parseFloat(tableData[1].value);
    const trk = parseFloat(tableData[2].value);
    const gs = parseFloat(tableData[3].value);
    
    const { da, xw, hwtw, dir, vel } = inflightWinds({ th, tas, trk, gs });
    
    let xwText = Math.round(xw) < 0 ? `${Math.round(-xw)} L` :
                 Math.round(xw) > 0 ? `${Math.round(xw)} R` : "0";
    let daText = Math.round(da) < 0 ? `${-Math.round(da)} L` : 
                 Math.round(da) > 0 ? `${Math.round(da)} R` : "0";
    let hwtwText = Math.round(hwtw) < 0 ? `${-Math.round(hwtw)} H` : 
                   Math.round(hwtw) > 0 ? `${Math.round(hwtw)} T` : "0";
    if(!visualize){return [[da, 4, 100], [xw, 5, 100], [hwtw, 6, 150], [dir, 7, 100, 'deg'], [vel, 8, 200]]}
    
    updateRow(4, { value: daText, solved: true });
    updateRow(5, { value: xwText, solved: true });
    updateRow(6, { value: hwtwText, solved: true });
    updateRow(7, { value: dir, solved: true });
    updateRow(8, { value: vel, solved: true });

    {
        const innerDeg = 360 - trk;
        const outerDeg = turnToDegrees(tas);
        let arrowDeg = (dir - trk + 360) % 360;
        
        // Scale factors for wind > 60kts
        let vel1 = vel;
        let xw1 = xw;
        let hwtw1 = hwtw;
        if (vel > 60) {
            vel1 = vel / 2;
            xw1 = xw / 2;
            hwtw1 = hwtw / 2;
        }
        const scale = vel1 / 50;
        
        setTurns({
            front: `translate(-50%, -50%) rotate(${innerDeg}deg)`,
            back: `translate(-50%, -50%) rotate(${outerDeg}deg)`,
            arrow: `translate(-50%, -50%) rotate(${arrowDeg+1}deg) scale(${scale})`,
            hori: `translate(-50%, -50%) translateY(${2.2*hwtw1}px) scale(${xw1/50})`,
            verti: `translate(-50%, -50%) translateX(${2.2*xw1}px) scale(${-hwtw1/50})`,
        });
    }
  };

  const solveLollipop = (visualize = true) => {
    const r1 = parseFloat(tableData[1].value);
    const t2 = parseFloat(tableData[2].value);
    const r2 = parseFloat(tableData[3].value);
    const { t1, course: t3, distance: r3 } = tacanPointToPoint({ bdhi: tableData[0].value, r1, t2, r2 });
    if(!visualize){return [[t3, 4, 100, 'deg'], [r3, 5, 100]]}
    
    updateRow(4, { value: t3, solved: true });
    updateRow(5, { value: r3, solved: true });

    // Turn the rose to the course and place the two TACAN positions; no wind vector here.
    const scale = (r1 > 70 || r2 > 70) ? 0.5 : 1;
    const hidden = 'translate(-50%, -50%) scale(0.01)';
    setTurns({
      front: `translate(-50%, -50%) rotate(${360 - t3}deg)`,
      arrow: hidden,
      hori: hidden,
      verti: hidden,
      target: dotAt(r2, t2, t3, scale),
      dot: dotAt(r1, t1, t3, scale),
    });
  };

  const solveTime = (visualize = true) => {
    const isGiven = (i) => tableData[i].solved && tableData[i].value !== '';
    const zd = parseFloat(tableData[1].value);
    const zd2 = parseFloat(tableData[2].value);
    const given = [3, 4, 5, 6].find(isGiven);
    if (given === undefined) return;
    const [time1, zulutime, zulutime2, time2] = convertTimes({
      duration: tableData[0].value, zd, zd2, given: given - 3, value: parseFloat(tableData[given].value),
    });
    if(!visualize){return [[time1, 3, 50, 'time'], [zulutime, 4, 50, 'time'], [zulutime2, 5, 50, 'time'], [time2, 6, 50, 'time']]}
    
    updateRow(3, { value: time1.toString().padStart(4, "0"), solved: true });
    updateRow(4, { value: zulutime.toString().padStart(4, "0"), solved: true });
    updateRow(5, { value: zulutime2.toString().padStart(4, "0"), solved: true });
    updateRow(6, { value: time2.toString().padStart(4, "0"), solved: true });
    
    // Update hat display
    setWheel(prev => ({
      ...prev,
      hat: {
        depLocal: time1.toString().padStart(4, "0") + " LT",
        depZD: "(" + tableData[1].value + ")",
        depZulu: zulutime.toString().padStart(4, "0") + " UTC",
        ete: tableData[0].value,
        destLocal: time2.toString().padStart(4, "0") + " LT",
        destZD: "(" + tableData[2].value + ")",
        destZulu: zulutime2.toString().padStart(4, "0") + " UTC",
      },
    }));
  };

  const checkWork = () => {
    const solutions = solve(false);
    if (!solutions || solutions.length === 0) return;
    setTableData(prev => {
      const newData = [...prev];

      solutions.forEach(([solution, rowIndex, denominator, kind]) => {
        const row = newData[rowIndex];
        if (row.solved) return;

        const userInput = String(row.value ?? '').trim();
        if (!userInput) return;

        const bgColor = gradeAnswer(userInput, solution, denominator, kind);
        if (bgColor) newData[rowIndex] = { ...row, bgColor };
      });

      return newData;
    });
  };

  return (
    <div className="whiz-container">
      <h1>Navigation</h1>

      <div className="whiz-controls">
        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
          className="question-type-select"
        >
          <option value="Distance">Distance</option>
          <option value="Speed">Speed</option>
          <option value="Time">Time</option>
          <option value="Fuel Consumption">Fuel Consumption</option>
          <option value="Fuel Conversions">Fuel Conversions</option>
          <option value="Airspeed">Airspeed</option>
          <option value="Preflight Winds">Preflight Winds</option>
          <option value="In Flight Winds">In Flight Winds</option>
          <option value="Lollipop">TACAN Point to Point</option>
          <option value="Time Conversion">Time Conversion</option>
        </select>
        <button className="button" onClick={generate}>Generate</button>
        <button className="button" onClick={checkWork}>Check</button>
        <button className="button" onClick={() => solve()}>Solve</button>
      </div>

      {(() => {
        const visibleRows = tableData
          .map((row, index) => ({ ...row, index }))
          .filter(row => row.display);
        const isTwoCol = visibleRows.length > 5;
        const splitIdx = isTwoCol ? Math.ceil(visibleRows.length / 2) : visibleRows.length;
        const col1 = visibleRows.slice(0, splitIdx);
        const col2 = visibleRows.slice(splitIdx);

        const renderRow = (row) => (
          <div key={row.index} className="var-row">
            <span className="var-label">{row.variable}</span>
            <input
              type="text"
              value={row.value ?? ''}
              onChange={(e) => updateRow(row.index, { value: e.target.value, solved: row.solved && e.target.value !== '', bgColor: undefined })}
              className={row.bgColor ?? ''}
            />
            <span className="var-unit">
              {row.index === 2 && (row.unit === 'hrs' || row.unit === 'mins' || row.unit === 'secs') ? (
                <select value={row.unit} onChange={(e) => updateRow(row.index, { unit: e.target.value })}>
                  <option value="hrs">hrs</option>
                  <option value="mins">mins</option>
                  <option value="secs">secs</option>
                </select>
              ) : row.index === 2 && row.unit === 'lbs' ? (
                <select value={row.unit} onChange={(e) => updateRow(row.index, { unit: e.target.value })}>
                  <option value="lbs">lbs</option>
                  <option value="gal">gal</option>
                </select>
              ) : (
                row.unit || ''
              )}
            </span>
          </div>
        );

        return (
          <div ref={varRowsWrapperRef} className="var-rows-wrapper">
            <div ref={varRowsInnerRef} className={`var-rows${isTwoCol ? ' var-rows-two-col' : ''}`}>
              <div className="var-col">{col1.map(renderRow)}</div>
              {isTwoCol && <div className="var-col">{col2.map(renderRow)}</div>}
            </div>
          </div>
        );
      })()}

      {explanationText && (
        <div className="explanation-text">{explanationText}</div>
      )}

      {questionType === 'Airspeed' && (
        <div className="airspeed-notice">
          <div className="airspeed-notice-header" onClick={() => setNoteOpen(o => !o)}>
            <strong>Note: Estimation errors</strong>
            <span className="airspeed-notice-toggle">{noteOpen ? '▲' : '▼'}</span>
          </div>
          {noteOpen && (
            <div className="airspeed-notice-body">
              These answers come from a computer estimate of the airspeed hairs on the whiz wheel, not from the wheel itself.{' '}
              <a href="/Airspeeds.pdf" target="_blank" rel="noopener noreferrer">
                See Airspeeds.pdf for details →
              </a>
            </div>
          )}
        </div>
      )}

      <div ref={wrapperRef} className="wheel-scale-wrapper">
        <div
          className={`Wheel-Container${wheel.kind === 'hat' ? ' whiz-hat-box' : ''}`}
          ref={wheelContainerRef}
        >
          {wheel.kind === 'hat' ? (
            <>
              <img src="/images/bottomhat.png" alt="" className="whiz-hat" />
              {HAT_FIELDS.map(id => (
                <div key={id} className={`whiz-hat-field whiz-hat-field--${id}`}>{wheel.hat[id]}</div>
              ))}
            </>
          ) : (
            WHEELS[wheel.kind].map(({ name, src, alt, className, rest }) => (
              <img
                key={`${wheel.kind}-${name}`}
                src={src}
                alt={alt}
                className={className}
                style={{ transform: wheel.turns[name] ?? `translate(-50%, -50%) ${rest}` }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default WhizWheel;