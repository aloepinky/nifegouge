import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useVarRowsScale } from '../useVarRowsScale';

function WhizWheel() {
  const [questionType, setQuestionType] = useState('Distance');
  const [tableData, setTableData] = useState([]);
  const [explanationText, setExplanationText] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
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
  useEffect(() => {
    const update = () => {
      const wrapper = wrapperRef.current;
      const container = wheelContainerRef.current;
      if (!wrapper || !container) return;
      const scale = Math.min(1, wrapper.offsetWidth / 600);
      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = 'top left';
      wrapper.style.height = `${600 * scale}px`;
    };
    const obs = new ResizeObserver(() => requestAnimationFrame(update));
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  useLayoutEffect(() => {
    updateScale();
  }, [tableData, updateScale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper functions
  const randBetween = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const turnToDegrees = (input) => {
    let mid = 360 * (Math.log10(input / Math.pow(10, Math.floor(Math.log10(input) - 1))) - 1);
    return mid * -1;
  };

  const tasFromCas = (temp, palt, cas) => {
    const x1 = 0.000167710133972731;
    const x2 = -0.0483548613736768;
    const x3 = 4.5070725375605;

    let psi = 101325 * Math.pow((288.15 / (288.15 - (6.5 / 1000) * (palt * 0.3048))), (9.80665 * 28.9644 / (8.31432 * 1000 * (-6.5 / 1000))));
    let qc = 101325 * (Math.pow((1 + 0.2 * Math.pow((0.514444444 * cas / 340.29), 2)), (7 / 2)) - 1);
    let m = Math.sqrt(5 * (Math.pow(qc / psi + 1, 2 / 7) - 1));
    let a = Math.sqrt(1.4 * 287.053 * (temp + 273.15));
    let tas = -x1 * Math.pow(m * a * 1.94384, 2) + (1 - x2) * (m * a * 1.94384) - x3;
    return tas;
  };

  const casFromTas = (temp, palt, tas) => {
    const x1 = 0.000167710133972731;
    const x2 = -0.0483548613736768;
    const x3 = 4.5070725375605;

    tas = (-(x2 - 1) - Math.sqrt(Math.pow((x2 - 1), 2) - 4 * x1 * (x3 + 0.514444444 * tas))) / (2 * x1);
    let a = Math.sqrt(1.4 * 287.053 * (temp + 273.15));
    let m = tas / a;
    let psi = 101325 * Math.pow((288.15 / (288.15 - (6.5 / 1000) * (palt * 0.3048))), (9.80665 * 28.9644 / (8.31432 * 1000 * (-6.5 / 1000))));
    let qc = psi * (Math.pow((1 + 0.2 * Math.pow(m, 2)), (7 / 2)) - 1);
    let cas = 340.29 * Math.sqrt(5 * (Math.pow(qc / 101325 + 1, 2 / 7) - 1)) * 1.94384;
    return cas;
  };

  const zuluLocal = (time, zd) => {
    let zulutime = ((Math.floor(time / 100) - zd) % 24);
    if (zulutime < 0) zulutime += 24;
    zulutime = zulutime * 100 + time % 100;
    return zulutime;
  };

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

  const insertDSTWheel = () => {
    const container = wheelContainerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const backImg = document.createElement('img');
    backImg.src = '/images/Back Wheel.webp';
    backImg.alt = 'Back Wheel';
    backImg.style.cssText = 'width: 500px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-0.1deg);';

    const frontImg = document.createElement('img');
    frontImg.src = '/images/Front Wheel.webp';
    frontImg.alt = 'Front Wheel';
    frontImg.style.cssText = 'width: 430px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-0.5deg);';

    container.appendChild(backImg);
    container.appendChild(frontImg);
  };

  const insertWindWheel = () => {
    const container = wheelContainerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const images = [
      { src: '/images/Back Wind Wheel.webp', alt: 'Back Wind Wheel', width: '500px', transform: 'rotate(0.1deg)' },
      { src: '/images/Middle Wind Wheel.webp', alt: 'Middle Wind Wheel', width: '442px' },
      { src: '/images/Front Wind Wheel.webp', alt: 'Front Wind Wheel', width: '376px' },
      { src: '/images/arrow.png', alt: 'Arrow', width: '500px', transform: 'scale(0.01)' },
      { src: '/images/hori.png', alt: 'Hori', width: '500px', transform: 'scale(0.01)' },
      { src: '/images/verti.png', alt: 'Verti', width: '500px', transform: 'scale(0.01)' },
      { src: '/images/dot.png', alt: 'Dot', width: '500px', transform: 'scale(0.01)' },
      { src: '/images/target.png', alt: 'Target', width: '500px', transform: 'scale(0.01)' }
    ];

    images.forEach(({ src, alt, width, transform = '' }) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.style.cssText = `width: ${width}; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) ${transform};`;
      container.appendChild(img);
    });
  };

  const insertHat = () => {
    const container = wheelContainerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const hatImg = document.createElement('img');
    hatImg.src = '/images/bottomhat.png';
    hatImg.style.cssText = 'position: absolute; top: 100px; left: 300px; width: 500px; z-index: 1;';
    container.appendChild(hatImg);

    // Add text fields for hat display
    const fields = [
      { id: 'depLocal', top: '10px', left: '75px' },
      { id: 'depZD', top: '40px', left: '100px' },
      { id: 'depZulu', top: '165px', left: '75px' },
      { id: 'ete', top: '165px', left: '250px' },
      { id: 'destLocal', top: '10px', left: '425px' },
      { id: 'destZD', top: '40px', left: '400px' },
      { id: 'destZulu', top: '165px', left: '425px' }
    ];

    fields.forEach(({ id, top, left }) => {
      const div = document.createElement('div');
      div.id = id;
      div.style.cssText = `position: absolute; top: ${top}; left: ${left}; width: 90px; padding: 4px; text-align: center; z-index: 2;`;
      container.appendChild(div);
    });
  };
  
  const insertDot = (r, t, tref, alt, scale) => {
    const container = wheelContainerRef.current;
    if (!container) return;
    
    let t2 = (t + 270 - tref) % 360;
    if (t2 < 0) t2 += 360;
    t2 = 360 - t2;
    
    const x = r * Math.cos(t2 * Math.PI / 180) * 2.2 * scale;
    const y = -r * Math.sin(t2 * Math.PI / 180) * 2.2 * scale;
    
    const img = container.querySelector(`img[alt="${alt}"]`);
    if (img) {
      img.style.transform = `translate(-50%, -50%) translateX(${x}px) translateY(${y}px)`;
    }
  };

  // Generate functions
  const generate = () => {
    clearInputFields();

    switch (questionType) {
      case "Distance":
      case "Speed":
      case "Time":
        generateDST(questionType);
        insertDSTWheel();
        break;
      case "Fuel Consumption":
        generateFuelConsume();
        insertDSTWheel();
        break;
      case "Fuel Conversions":
        generateFuelConvert();
        insertDSTWheel();
        break;
      case "Airspeed":
        generateAirspeed();
        insertDSTWheel();
        break;
      case "Preflight Winds":
        generatePreflight();
        insertWindWheel();
        break;
      case "In Flight Winds":
        generateInflight();
        insertWindWheel();
        break;
      case "Lollipop":
        generateLollipop();
        insertWindWheel();
        break;
      case "Time Conversion":
        generateTime();
        insertHat();
        break;
      default:
        alert("Question type not implemented");
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

    let time = dist / speed;
    let units = "";

    if (time > 1.66) {
      time = Number(time.toFixed(1));
      units = "hrs";
    } else if (time > 0.027) {
      time = time * 60;
      time = Number(time.toFixed(1));
      units = "mins";
    } else {
      time = time * 3600;
      time = Number(time.toFixed(1));
      units = "secs";
    }

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
    let time = fquan / fflow;
    let units = "";

    if (time > 1.66) {
      time = Number(time.toFixed(1));
      units = "hrs";
    } else if (time > 0.027) {
      time = time * 60;
      time = Number(time.toFixed(1));
      units = "mins";
    } else {
      time = time * 3600;
      time = Number(time.toFixed(1));
      units = "secs";
    }

    const vrand = Math.ceil(3 * Math.random());
    const urand = Math.random();
    let quan = urand < 0.25 ? gquan : fquan;
    let quanUnit = urand < 0.25 ? "gal" : "lbs";

    updateRow(0, { variable: 'Fuel Flow', value: fflow, unit: 'lbs per hour', solved: true, display: true });
    updateRow(1, { variable: 'Time', value: time, unit: units, solved: true, display: true });
    updateRow(2, { variable: 'Fuel Quantity', value: quan, unit: quanUnit, solved: true, display: true });

    updateRow(vrand - 1, { value: '', unit: '', solved: false });
    if (urand < 0.25) setExplanationText('Assume 6.8 lbs/gal');
  };

  const generateFuelConvert = () => {
    const rand = Math.random();
    let fweight = 6 + randBetween(4, 8) / 10;
    let flbs = rand < 0.5 ? randBetween(100, 999) * 10 : randBetween(20, 60) * 500;
    const fgal = Math.round(flbs / (10 * fweight)) * 10;
    const vrand = Math.ceil(2 * Math.random());

    updateRow(0, { variable: 'Fuel Weight', value: fweight, unit: 'lbs per gal', solved: true, display: true });
    updateRow(1, { variable: 'Fuel', value: flbs, unit: 'lbs', solved: true, display: true });
    updateRow(2, { variable: 'Fuel', value: fgal, unit: 'gals', solved: true, display: true });

    updateRow(vrand, { value: '', solved: false });
  };

  const generateAirspeed = () => {
    const rand = Math.random();
    const labels = ["CALT", "ALTIM", "TEMP", "PALT", "CAS", "TAS"];
    const units = ["ft", "inHg", "C", "ft", "kts", "kts"];

    let calt = rand < 0.5 ? randBetween(180, 999) * 10 : randBetween(20, 45) * 500;
    let cas = rand > 0.15 ? randBetween(22, 70) * 5 : randBetween(80, 100) * 5;
    let altim = Number((29.92 + randBetween(-23, 10) / 10).toFixed(2));
    let temp = randBetween(0, 9) * 5 - 25;
    let palt = Math.round((29.92 - altim) * 1000 + calt);
    let tas = Math.round(tasFromCas(temp, palt, cas));

    const values = [calt, altim, temp, palt, cas, tas];
    const vrand = Math.random();
    let hiddenIndex = vrand < 0.3 ? 4 : 5;
    if (rand <= 0.15) hiddenIndex = 5;
    values.forEach((value, i) => {
      if(i===3){value =''}
      updateRow(i, {
        variable: labels[i],
        value: i === hiddenIndex ? '' : value,
        unit: units[i],
        solved: i !== hiddenIndex,
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
    const units = ["° T", "kts", "° T", "kts", "ft", "kts", "kts", "° T", "kts"];

    const th = randBetween(0, 359);
    let tas = rand < 0.75 ? randBetween(100, 400) : randBetween(400, 950);
    let trk = rand < 0.5 ? th + randBetween(7, 9) * Math.sign(rand - 0.5) : th + randBetween(2, 6) * Math.sign(rand - 0.5);
    if (trk < 0 || trk > 360) trk = trk - Math.sign(trk) * 360;
    let gs = (rand < 0.125 || rand > 0.875) ? 
      tas + Math.round(randBetween(12, 30) * 2.5) * Math.sign(rand - 0.5) :
      tas + Math.round(randBetween(10, 50) * 0.5) * Math.sign(rand - 0.5);

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

    let time1 = randBetween(0, 23) * 100 + randBetween(0, 59);
    let duration = randBetween(2, 17) * 100 + randBetween(0, 59);
    let zd = randBetween(-12, 12);
    let zd2 = (zd + Math.floor(duration / 100) + randBetween(-3, 3) + 12) % 25 - 12;
    let zulutime = (time1 - zd * 100) % 2400;
    if (zulutime < 0) zulutime += 2400;
    let mins2 = zulutime % 100 + duration % 100;
    let hrs2 = Math.floor(zulutime / 100) + Math.floor(duration / 100) + Math.floor(mins2 / 60);
    let zulutime2 = (hrs2 * 100 + mins2 % 60) % 2400;
    let time2 = (zulutime2 + zd2 * 100) % 2400;
    if (time2 < 0) time2 += 2400;

    let durationText = Math.floor(duration / 100) + "+" + duration % 100;

    updateRow(0, { variable: 'Duration', value: durationText, solved: true });
    updateRow(1, { variable: 'ZD Departure', value: zd, solved: true });
    updateRow(2, { variable: 'ZD Arrival', value: zd2, solved: true });
    updateRow(3, { variable: 'Departure Time LT', value: time1.toString().padStart(4, "0"), unit: 'LT', solved: true });
    updateRow(4, { variable: 'Departure Time UTC', value: zulutime.toString().padStart(4, "0"), unit: 'UTC', solved: true });
    updateRow(5, { variable: 'Arrival Time UTC', value: zulutime2.toString().padStart(4, "0"), unit: 'UTC', solved: true });
    updateRow(6, { variable: 'Arrival Time LT', value: time2.toString().padStart(4, "0"), unit: 'LT', solved: true });

    const nums = [3, 4, 5, 6];
    const shuffled = nums.sort(() => 0.5 - Math.random());
    const indices = shuffled.slice(0, 3);
    indices.forEach(i => updateRow(i, { value: '', solved: false }));
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
        alert("Solve not implemented for this type");
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
    const container = wheelContainerRef.current;
    if (container) {
      const frontImg = container.querySelector('img[alt="Front Wheel"]');
      const backImg = container.querySelector('img[alt="Back Wheel"]');
      if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
    }
    
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
    const container = wheelContainerRef.current;
    if (container) {
      const frontImg = container.querySelector('img[alt="Front Wheel"]');
      const backImg = container.querySelector('img[alt="Back Wheel"]');
      if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
    }
    
    return [[speed, 1, speed]];
  };

  const solveTDS = (visualize = true) => {
    const dist = parseFloat(tableData[0].value);
    const speed = parseFloat(tableData[1].value);
    let time = dist / speed;
    let units = "";
    
    let explainTxt = "";
    if (time > 1.66) {
      time = Number(time.toFixed(1));
      units = "hrs";
      explainTxt = "Distance is much greater than speed, so use the 10 under speed and hrs";
    } else if (time > 0.027) {
      time *= 60;
      time = Number(time.toFixed(1));
      units = "mins";
      explainTxt = "Distance is not too small or large, so use the 60 under speed and mins";
    } else {
      time *= 3600;
      time = Number(time.toFixed(1));
      units = "secs";
      explainTxt = "Distance is much smaller than speed, so use the 36 under speed and secs";
    }
    if(!visualize){return [[time, 2, time]]}
    
    setExplanationText(explainTxt);
    updateRow(2, { value: time, unit: units, solved: true });
    
    const outerDeg = turnToDegrees(dist);
    const innerDeg = turnToDegrees(time);
    const container = wheelContainerRef.current;
    if (container) {
      const frontImg = container.querySelector('img[alt="Front Wheel"]');
      const backImg = container.querySelector('img[alt="Back Wheel"]');
      if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
    }
    
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
      
      let time = fquan / fflow;
      let unit = "";
      
      if (time > 1.66) {
        time = Number(time.toFixed(1));
        unit = "hrs";
        explainTxt = "Quantity is much greater than flow, so use the 10 under flow and hrs";
      } else if (time > 0.027) {
        time *= 60;
        time = Number(time.toFixed(1));
        unit = "mins";
        explainTxt = "Quantity is not too small or large, so use the 60 under flow and mins";
      } else {
        time *= 3600;
        time = Number(time.toFixed(1));
        unit = "secs";
        explainTxt = "Quantity is much smaller than flow, so use the 36 under flow and secs";
      }
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
      
      const fquan = Number((fflow * time).toFixed(1));
      if(!visualize){return [[fquan, 2, fquan]]}
      updateRow(2, { value: fquan, unit: "lbs", solved: true });
      
      outerDeg = turnToDegrees(fquan);
      innerDeg = turnToDegrees(time1);
    }else {
        outerDeg = 0;
        innerDeg = 0;
        if(!visualize){return}
        explainTxt = "Nothing's blank, nothing to solve";
    }
    
    setExplanationText(explainTxt);
    
    const container = wheelContainerRef.current;
    if (container) {
      const frontImg = container.querySelector('img[alt="Front Wheel"]');
      const backImg = container.querySelector('img[alt="Back Wheel"]');
      if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
    }
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
    const container = wheelContainerRef.current;
    if (container) {
      const frontImg = container.querySelector('img[alt="Front Wheel"]');
      const backImg = container.querySelector('img[alt="Back Wheel"]');
      if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
    }
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
    
    let palt = isNaN(calt) ? parseFloat(tableData[3].value) : (29.92 - altim) * 1000 + calt;
    
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

    const container = wheelContainerRef.current;
    if (container) {
      const frontImg = container.querySelector('img[alt="Front Wheel"]');
      const backImg = container.querySelector('img[alt="Back Wheel"]');
      if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
    }
  };

  const solvePreflight = (visualize = true) => {
    const tc = parseFloat(tableData[0].value);
    const tas = parseFloat(tableData[1].value);
    const dir = parseFloat(tableData[2].value);
    const kts = parseFloat(tableData[3].value);
    
    const xw = kts * Math.sin((dir - tc) * Math.PI / 180);
    const rawCaDeg = 180 / Math.PI * Math.asin(xw / tas);
    const ca = Math.round(rawCaDeg * Math.sign(rawCaDeg) * Math.sign(xw));
    const th = (tc + ca) % 360;
    const hwtw = Math.round(-kts * Math.cos((dir - tc) * Math.PI / 180));
    const gs = tas + hwtw;
    
    let xwText = Math.round(xw) < 0 ? Math.round(-xw) + " L" :
                 Math.round(xw) > 0 ? Math.round(xw) + " R" : "0";
    let caText = ca < 0 ? -ca + " L" : ca > 0 ? ca + " R" : "0";
    let hwtwText = hwtw < 0 ? -hwtw + " H" : hwtw > 0 ? hwtw + " T" : "0";
    if(!visualize){return [[xw, 4, 100], [ca, 5, 100], [th, 6, 100], [hwtw, 7, 150], [gs, 8, 200]]}
    
    updateRow(4, { value: xwText, solved: true });
    updateRow(5, { value: caText, solved: true });
    updateRow(6, { value: Math.round(th), solved: true });
    updateRow(7, { value: hwtwText, solved: true });
    updateRow(8, { value: gs, solved: true });
    
    // Update wind wheel visualization
    const container = wheelContainerRef.current;
    if (container) {
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
      
      const frontImg = container.querySelector('img[alt="Front Wind Wheel"]');
      const backImg = container.querySelector('img[alt="Back Wind Wheel"]');
      const arrowImg = container.querySelector('img[alt="Arrow"]');
      const horiImg = container.querySelector('img[alt="Hori"]');
      const vertiImg = container.querySelector('img[alt="Verti"]');
      if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
      if (arrowImg) arrowImg.style.transform = `translate(-50%, -50%) rotate(${arrowDeg+1}deg) scale(${scale})`;
      if (horiImg) horiImg.style.transform = `translate(-50%, -50%) translateY(${2.2*hwtw1}px) scale(${xw1/50})`;
      if (vertiImg) vertiImg.style.transform = `translate(-50%, -50%) translateX(${2.2*xw1}px) scale(${-hwtw1/50})`;
    }
  };

  const solveInflight = (visualize = true) => {
    const th = parseFloat(tableData[0].value);
    const tas = parseFloat(tableData[1].value);
    const trk = parseFloat(tableData[2].value);
    const gs = parseFloat(tableData[3].value);
    
    let da = trk - th;
    if (Math.abs(da) > 180) {
      da = da - Math.sign(da) * 360;
    }
    
    let xw = -1 * Math.sin(da * Math.PI / 180) * tas * Math.sign(da) * Math.sign(Math.sin(da * Math.PI / 180) * tas);
    let hwtw = gs - tas;
    
    let dir = 0;
    if (Math.sign(hwtw) > 0) {
      dir = Math.round((trk - 180) % 360 - Math.sign(xw) * (180 / Math.PI * Math.atan(Math.abs(xw / hwtw)))) % 360;
    } else {
      dir = Math.round(trk + Math.sign(xw) * (180 / Math.PI * Math.atan(Math.abs(xw / hwtw)))) % 360;
    }
    if (dir < 0) dir += 360;
    
    let vel = Math.round(Math.sqrt(xw * xw + hwtw * hwtw));
    
    let xwText = Math.round(xw) < 0 ? `${Math.round(-xw)} L` :
                 Math.round(xw) > 0 ? `${Math.round(xw)} R` : "0";
    let daText = Math.round(da) < 0 ? `${-Math.round(da)} L` : 
                 Math.round(da) > 0 ? `${Math.round(da)} R` : "0";
    let hwtwText = Math.round(hwtw) < 0 ? `${-Math.round(hwtw)} H` : 
                   Math.round(hwtw) > 0 ? `${Math.round(hwtw)} T` : "0";
    if(!visualize){return [[da, 4, 100], [xw, 5, 100], [hwtw, 6, 150], [dir, 7, 100], [vel, 8, 200]]}
    
    updateRow(4, { value: daText, solved: true });
    updateRow(5, { value: xwText, solved: true });
    updateRow(6, { value: hwtwText, solved: true });
    updateRow(7, { value: dir, solved: true });
    updateRow(8, { value: vel, solved: true });

    const container = wheelContainerRef.current;
    if (container) {
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
        
        const frontImg = container.querySelector('img[alt="Front Wind Wheel"]');
        const backImg = container.querySelector('img[alt="Back Wind Wheel"]');
        const arrowImg = container.querySelector('img[alt="Arrow"]');
        const horiImg = container.querySelector('img[alt="Hori"]');
        const vertiImg = container.querySelector('img[alt="Verti"]');
        
        if (frontImg) frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
        if (backImg) backImg.style.transform = `translate(-50%, -50%) rotate(${outerDeg}deg)`;
        if (arrowImg) arrowImg.style.transform = `translate(-50%, -50%) rotate(${arrowDeg+1}deg) scale(${scale})`;
        if (horiImg) horiImg.style.transform = `translate(-50%, -50%) translateY(${2.2*hwtw1}px) scale(${xw1/50})`;
        if (vertiImg) vertiImg.style.transform = `translate(-50%, -50%) translateX(${2.2*xw1}px) scale(${-hwtw1/50})`;
    }
  };

  const solveLollipop = (visualize = true) => {
    // First hide all vector visualizations
    const container = wheelContainerRef.current;
    if (container) {
      // Hide arrow and vector components
      ['Arrow', 'Hori', 'Verti'].forEach(alt => {
        const img = container.querySelector(`img[alt="${alt}"]`);
        if (img) img.style.transform = 'translate(-50%, -50%) scale(0.01)';
      });
    }
    let t1Raw = tableData[0].value.toString();
    let r1 = parseFloat(tableData[1].value);
    let t2 = parseFloat(tableData[2].value);
    let r2 = parseFloat(tableData[3].value);
    
    let t1 = 0;
    if (t1Raw.includes("TO")) {
      t1 = Number(t1Raw.match(/\d+/g).join("")) - 180;
    } else {
      t1 = Number(t1Raw.match(/\d+/g).join(""));
    }
    if (t1 < 0) t1 += 360;
    
    const x1 = r1 * Math.cos(t1 * Math.PI / 180);
    const y1 = r1 * Math.sin(-t1 * Math.PI / 180);
    const x2 = r2 * Math.cos(t2 * Math.PI / 180);
    const y2 = r2 * Math.sin(-t2 * Math.PI / 180);
    
    const r3 = Math.round(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2));
    let t3 = Math.round(Math.atan((y2 - y1) / (x2 - x1)) * 180 / Math.PI);
    if ((x2 - x1) < 0) t3 -= 180;
    if (t3 < 0) t3 += 360;
    t3 = 360 - t3;
    if(!visualize){return [[t3, 4, 100], [r3, 5, 100]]}
    
    updateRow(4, { value: t3, solved: true });
    updateRow(5, { value: r3, solved: true });

    // Update wheel visualization
    if (container) {
      const innerDeg = 360 - t3;
      const frontImg = container.querySelector('img[alt="Front Wind Wheel"]');
      if (frontImg) {
        frontImg.style.transform = `translate(-50%, -50%) rotate(${innerDeg}deg)`;
      }
      
      // Scale factor for dots
      const scale = (r1 > 70 || r2 > 70) ? 0.5 : 1;
      
      // Insert the TACAN position dots
      insertDot(r2, t2, t3, "Target", scale);
      insertDot(r1, t1, t3, "Dot", scale);
    }
  };

  const solveTime = (visualize = true) => {
    let duration = tableData[0].value;
    const [hours, minutes] = duration.split("+").map(Number);
    let zd = parseFloat(tableData[1].value);
    let zd2 = parseFloat(tableData[2].value);
    let time1 = 0;
    let zulutime = 0;
    let time2 = 0;
    let zulutime2 = 0;
    
    if (tableData[3].value !== '') {
      time1 = parseFloat(tableData[3].value);
      zulutime = zuluLocal(time1, zd);
      let mins2 = zulutime % 100 + minutes;
      let hrs2 = Math.floor(zulutime / 100) + hours + Math.floor(mins2 / 60);
      zulutime2 = (hrs2 * 100 + mins2 % 60) % 2400;
      time2 = zuluLocal(zulutime2, -zd2);
    } else if (tableData[4].value !== '') {
      zulutime = parseFloat(tableData[4].value);
      time1 = zuluLocal(zulutime, -zd);
      let mins2 = zulutime % 100 + minutes;
      let hrs2 = Math.floor(zulutime / 100) + hours + Math.floor(mins2 / 60);
      zulutime2 = (hrs2 * 100 + mins2 % 60) % 2400;
      time2 = zuluLocal(zulutime2, -zd2);
    } else if (tableData[5].value !== '') {
      zulutime2 = parseFloat(tableData[5].value);
      time2 = zuluLocal(zulutime2, -zd2);
      let mins2 = zulutime2 % 100 - minutes;
      let hrs = 0;
      if (mins2 < 0) {
        hrs = -1;
        mins2 += 60;
      }
      let hrs2 = Math.floor(zulutime2 / 100) - hours + hrs;
      if (hrs2 < 0) hrs2 += 24;
      zulutime = (hrs2 * 100 + mins2 % 60) % 2400;
      time1 = zuluLocal(zulutime, -zd);
    } else if (tableData[6].value !== '') {
      time2 = parseFloat(tableData[6].value);
      zulutime2 = zuluLocal(time2, zd2);
      let mins2 = zulutime2 % 100 - minutes;
      let hrs = 0;
      if (mins2 < 0) {
        hrs = -1;
        mins2 += 60;
      }
      let hrs2 = Math.floor(zulutime2 / 100) - hours + hrs;
      if (hrs2 < 0) hrs2 += 24;
      zulutime = (hrs2 * 100 + mins2 % 60) % 2400;
      time1 = zuluLocal(zulutime, -zd);
    }
  if(!visualize){return [[time1, 3, 50], [zulutime, 4, 50], [zulutime2, 5, 50], [time2, 6, 50]]}
    
    updateRow(3, { value: time1.toString().padStart(4, "0"), solved: true });
    updateRow(4, { value: zulutime.toString().padStart(4, "0"), solved: true });
    updateRow(5, { value: zulutime2.toString().padStart(4, "0"), solved: true });
    updateRow(6, { value: time2.toString().padStart(4, "0"), solved: true });
    
    // Update hat display
    const container = wheelContainerRef.current;
    if (container) {
      const depLocal = container.querySelector('#depLocal');
      const depZD = container.querySelector('#depZD');
      const depZulu = container.querySelector('#depZulu');
      const ete = container.querySelector('#ete');
      const destLocal = container.querySelector('#destLocal');
      const destZD = container.querySelector('#destZD');
      const destZulu = container.querySelector('#destZulu');
      
      if (depLocal) depLocal.textContent = time1.toString().padStart(4, "0") + " LT";
      if (depZD) depZD.textContent = "(" + tableData[1].value + ")";
      if (depZulu) depZulu.textContent = zulutime.toString().padStart(4, "0") + " UTC";
      if (ete) ete.textContent = tableData[0].value;
      if (destLocal) destLocal.textContent = time2.toString().padStart(4, "0") + " LT";
      if (destZD) destZD.textContent = "(" + tableData[2].value + ")";
      if (destZulu) destZulu.textContent = zulutime2.toString().padStart(4, "0") + " UTC";
    }
  };

  const checkWork = () => {
    const solutions = solve(false);
    if (!solutions || solutions.length === 0) return;
    setTableData(prev => {
        const newData = [...prev];

        solutions.forEach(([solution, rowIndex, denominator]) => {
        if (newData[rowIndex].solved) return;

        const userInput = newData[rowIndex].value;
        if (!userInput) return;

        let userValue = parseFloat(userInput);
        if (/[lLhH]/.test(userInput)) {
            userValue *= -1;
        }

        if (isNaN(userValue)) return;

        let percentError;
        if (solution === 0) {
            percentError = Math.abs(userValue) < 0.01 ? 0 : 100;
        } else {
            percentError = Math.abs(100 * (userValue - solution) / denominator);
        }

        if (percentError <= 2) {
            newData[rowIndex].bgColor = 'bg-green';
        } else if (percentError <= 5) {
            newData[rowIndex].bgColor = 'bg-yellow';
        } else {
            newData[rowIndex].bgColor = 'bg-red';
        }
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
        <button className="button" onClick={solve}>Solve</button>
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
              onChange={(e) => updateRow(row.index, { value: e.target.value, solved: e.target.value !== '' })}
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
              This is a computer estimate of the airspeed hairs on the Whiz Wheel. It is more accurate for lower CAS inputs, 
              especially between 110–350 kts, and calibrated altitudes below ~23,000 ft. Results become less reliable
              outside these ranges due to simplified atmospheric modeling. It's hard to make those little squiggles into equations.{' '}
              <a href="/Airspeeds.pdf" target="_blank" rel="noopener noreferrer">
                See Airspeeds.pdf for details →
              </a>
            </div>
          )}
        </div>
      )}

      <div ref={wrapperRef} className="wheel-scale-wrapper">
        <div className="Wheel-Container" ref={wheelContainerRef} id="wheel-container"></div>
      </div>
    </div>
  );
}

export default WhizWheel;