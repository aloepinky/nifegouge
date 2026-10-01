import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useVarRowsScale } from './useVarRowsScale';
import { setai, gradeSetai } from './Nav/navMath';

function Weather() {
  const [depPressure, setDepPressure] = useState('');
  const [assignedAlt, setAssignedAlt] = useState('');
  const [arrivalElev, setArrivalElev] = useState('');
  const [arrivalPressure, setArrivalPressure] = useState('');
  const [situation, setSituation] = useState('');

  const [errorInput, setErrorInput] = useState('');
  const [trueAltInput, setTrueAltInput] = useState('');
  const [absAltInput, setAbsAltInput] = useState('');
  const [indAltInput, setIndAltInput] = useState('');

  const [errorClass, setErrorClass] = useState('');
  const [trueAltClass, setTrueAltClass] = useState('');
  const [absAltClass, setAbsAltClass] = useState('');
  const [indAltClass, setIndAltClass] = useState('');

  const { wrapperRef: varRowsWrapperRef, innerRef: varRowsInnerRef, updateScale } = useVarRowsScale();

  useLayoutEffect(() => {
    updateScale();
  }, [depPressure, updateScale]);

  const generate = () => {
    setErrorInput('');
    setTrueAltInput('');
    setAbsAltInput('');
    setIndAltInput('');
    setErrorClass('');
    setTrueAltClass('');
    setAbsAltClass('');
    setIndAltClass('');
    setSituation('');

    // Draw again until the aircraft ends up at least 1,000 ft above the arrival field.
    let dep, alt, elev, arr;
    do {
      dep = (Math.random() * 2.16 + 28.84).toFixed(2);
      alt = Math.floor(Math.random() * 70) * 100 + 3000;
      elev = Math.floor(Math.random() * 20) * 100 + 100;
      arr = (Math.random() * 2.16 + 28.84).toFixed(2);
    } while (setai({ depPres: +dep, assAlt: alt, fieldEle: elev, arrPres: +arr }).absolute < 1000);
    setDepPressure(dep);
    setAssignedAlt(alt);
    setArrivalElev(elev);
    setArrivalPressure(arr);
  };

  const answers = () => setai({
    depPres: parseFloat(depPressure),
    assAlt: parseFloat(assignedAlt),
    fieldEle: parseFloat(arrivalElev),
    arrPres: parseFloat(arrivalPressure),
  });

  const solve = () => {
    setErrorClass('');
    setTrueAltClass('');
    setAbsAltClass('');
    setIndAltClass('');

    const { situation: sit, error, trueAlt, absolute, indicated: indiAlt } = answers();

    setSituation(sit);
    setErrorInput(Math.round(error).toString());
    setTrueAltInput(Math.round(trueAlt).toString());
    setAbsAltInput(Math.round(absolute).toString());
    setIndAltInput(Math.round(indiAlt).toString());
  };

  const checkWork = () => {
    const { error, trueAlt, absolute, indicated } = answers();
    const correctAnswers = [error, trueAlt, absolute, indicated];
    const userAnswers = [errorInput, trueAltInput, absAltInput, indAltInput];
    const setClasses = [setErrorClass, setTrueAltClass, setAbsAltClass, setIndAltClass];
    for (let i = 0; i < 4; i++) setClasses[i](gradeSetai(userAnswers[i], correctAnswers[i]));
  };

  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="whiz-container">
      <h1>Weather</h1>

      <div className="whiz-controls">
        <button className="button" onClick={generate}>Generate</button>
        <button className="button" onClick={checkWork}>Check</button>
        <button className="button" onClick={solve}>Solve</button>
      </div>

      <div ref={varRowsWrapperRef} className="var-rows-wrapper">
        <div ref={varRowsInnerRef} className="var-rows var-rows-two-col">
          <div className="var-col">
            <div className="var-row">
              <span className="var-label">Departure Pressure</span>
              <span className="setai-value">{depPressure}</span>
              <span className="var-unit">inHg</span>
            </div>
            <div className="var-row">
              <span className="var-label">Assigned Altitude</span>
              <span className="setai-value">{assignedAlt}</span>
              <span className="var-unit">ft</span>
            </div>
            <div className="var-row">
              <span className="var-label">Arrival Field Elev</span>
              <span className="setai-value">{arrivalElev}</span>
              <span className="var-unit">ft</span>
            </div>
            <div className="var-row">
              <span className="var-label">Arrival Pressure</span>
              <span className="setai-value">{arrivalPressure}</span>
              <span className="var-unit">inHg</span>
            </div>
          </div>

          <div className="var-col">
            <div className="var-row">
              <span className="var-label"><b>S</b>ituation</span>
              <span className="setai-value">{situation}</span>
              <span className="var-unit"></span>
            </div>
            <div className="var-row">
              <span className="var-label"><b>E</b>rror</span>
              <input
                type="text"
                value={errorInput}
                onChange={(e) => setErrorInput(e.target.value)}
                className={errorClass}
              />
              <span className="var-unit">ft</span>
            </div>
            <div className="var-row">
              <span className="var-label"><b>T</b>rue Altitude</span>
              <input
                type="text"
                value={trueAltInput}
                onChange={(e) => setTrueAltInput(e.target.value)}
                className={trueAltClass}
              />
              <span className="var-unit">ft</span>
            </div>
            <div className="var-row">
              <span className="var-label"><b>A</b>bsolute Altitude</span>
              <input
                type="text"
                value={absAltInput}
                onChange={(e) => setAbsAltInput(e.target.value)}
                className={absAltClass}
              />
              <span className="var-unit">ft</span>
            </div>
            <div className="var-row">
              <span className="var-label"><b>I</b>ndicated Altitude</span>
              <input
                type="text"
                value={indAltInput}
                onChange={(e) => setIndAltInput(e.target.value)}
                className={indAltClass}
              />
              <span className="var-unit">ft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather;
