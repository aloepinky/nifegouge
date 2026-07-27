import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { useVarRowsScale } from './useVarRowsScale';

function FRR() {
  const [questionType, setQuestionType] = useState('vfr');
  const [complexMode, setComplexMode] = useState(false);

  // VFR structured state
  const [airClass, setAirClass] = useState('');
  const [visibility, setVisibility] = useState('');
  const [cloudLayers, setCloudLayers] = useState([]); // [{ type, altitude }]
  const [heading, setHeading] = useState('');
  const [course, setCourse] = useState('');
  const [answerAlt, setAnswerAlt] = useState('');

  // Runway state
  const [questionText, setQuestionText] = useState('');
  const [answerChoices, setAnswerChoices] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const submitButtonText = isAnswered ? 'Next Question' : 'Submit';

  // Visualization state
  const [showArrow, setShowArrow] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);
  const [showCompassImg, setShowCompassImg] = useState(false);
  const [altitudeLines, setAltitudeLines] = useState([]);
  const [indicatorRotation, setIndicatorRotation] = useState(0);
  const [compassRotation, setCompassRotation] = useState(0);

  // Runway game state
  const [directionG, setDirectionG] = useState(null);
  const [toG, setToG] = useState(null);
  const [relativeG, setRelativeG] = useState(null);
  const [randPosiG, setRandPosiG] = useState(0);
  const [randPosi2G, setRandPosi2G] = useState(null);
  const [indicatorG, setIndicatorG] = useState(null);
  const [flagDirectionG, setFlagDirectionG] = useState(null);

  const { wrapperRef: varRowsWrapperRef, innerRef: varRowsInnerRef, updateScale } = useVarRowsScale();

  const wheelWrapperRef = useRef(null);
  const wheelContainerRef = useRef(null);

  useEffect(() => {
    const wrapper = wheelWrapperRef.current;
    const container = wheelContainerRef.current;
    if (!wrapper || !container) return;
    const applyScale = () => {
      const scale = Math.min(1, wrapper.offsetWidth / 500);
      container.style.transform = scale < 1 ? `scale(${scale})` : '';
      container.style.transformOrigin = 'top left';
      wrapper.style.height = `${500 * scale}px`;
    };
    applyScale();
    const obs = new ResizeObserver(() => requestAnimationFrame(applyScale));
    obs.observe(wrapper);
    return () => obs.disconnect();
  }, []);

  useLayoutEffect(() => {
    updateScale();
  }, [cloudLayers, answerAlt, updateScale]);

  const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const generateVfr = useCallback(() => {
    setAnswerAlt('');
    setAltitudeLines([]);

    let vis = randBetween(2, 8);
    const rand = Math.random();
    const airClassVal = rand < 0.1 ? "A" : "E";

    const cloudTypes = ["FEW", "SCT", "FEW", "SCT", "BKN", "OVC"];
    const layers = randBetween(2, 3);
    const newCloudLayers = [];
    let altitude = randBetween(30, 70) * 100;

    for (let i = 0; i < layers; i++) {
      let cloudIdx = randBetween(2, 5);
      if (i === 0) cloudIdx = randBetween(0, 3);
      newCloudLayers.push({ type: cloudTypes[cloudIdx], altitude });
      altitude += randBetween(10, 50) * 100;
    }
    newCloudLayers.push({ type: ["BKN", "OVC"][randBetween(0, 1)], altitude });

    let headingVal, courseVal;
    const headRand = Math.random();
    if (headRand < 0.3) {
      headingVal = randBetween(177, 183);
      courseVal = headingVal + randBetween(1, 6) * Math.sign(180.01 - headingVal);
    } else if (headRand < 0.6) {
      headingVal = randBetween(357, 363);
      courseVal = headingVal + randBetween(1, 6) * Math.sign(360.01 - headingVal);
    } else {
      headingVal = randBetween(0, 360);
      courseVal = headingVal + randBetween(-6, 6);
    }
    headingVal = headingVal % 360;
    courseVal = ((courseVal % 360) + 360) % 360;

    let ceilingAltitude = 1000000;
    for (const layer of newCloudLayers) {
      if ((layer.type === "BKN" || layer.type === "OVC") && layer.altitude < ceilingAltitude) {
        ceilingAltitude = layer.altitude;
      }
    }
    if (ceilingAltitude > 10400 && vis < 5) vis = 5;

    setAirClass(airClassVal);
    setVisibility(vis);
    setCloudLayers(newCloudLayers);
    setHeading(headingVal);
    setCourse(courseVal);
  }, []);

  const generateRunway = useCallback(() => {
    setSelectedAnswer('');
    setUserAnswer('');
    setIsAnswered(false);
    setShowArrow(false);
    setShowIndicator(false);
    setShowCompassImg(false);

    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const direction = randBetween(0, 7);
    const to = Math.random() <= 0.5;
    const relative = Math.random() <= 0.75;

    const relPositions = ["towards", "to the left of", "away from", "to the right of"];
    const randPosi = randBetween(0, 3);
    let relPosition = relPositions[randPosi];
    let randPosi2 = null;

    if (complexMode && Math.random() < 0.6) {
      randPosi2 = randBetween(0, 1) * 2 + (randPosi + 1) % 2;
      relPosition = relPosition + " and " + relPositions[randPosi2];
    }

    const aircraftPosi = to
      ? `Your aircraft is approaching the airfield heading towards the ${directions[direction]}.`
      : `Your aircraft is approaching the airfield from the ${directions[direction]}.`;

    const indicators = ["spar of the tetrahedron", "wind sock"];
    const indicator = randBetween(0, 1);
    let flagDirection = null;
    let flagPosi = "";

    if (relative) {
      flagPosi = ` The ${indicators[indicator]} is pointing, relative to your heading, ${relPosition} you.`;
    } else {
      flagDirection = randBetween(0, 7);
      if (!complexMode) flagDirection = randBetween(0, 3) * 2 + direction % 2;
      flagPosi = ` The ${indicators[indicator]} is pointing to the ${directions[flagDirection]}.`;
    }

    setQuestionText(aircraftPosi + flagPosi + " Which runway will you expect to use?");
    setDirectionG(direction);
    setToG(to);
    setRelativeG(relative);
    setRandPosiG(randPosi);
    setRandPosi2G(randPosi2);
    setIndicatorG(indicator);
    setFlagDirectionG(flagDirection);

    let options;
    if (!complexMode && direction % 2 === 0) {
      options = ["Runway 18", "Runway 27", "Runway 36", "Runway 09"];
    } else if (!complexMode) {
      options = ["Runway 23", "Runway 32", "Runway 05", "Runway 14"];
    } else {
      options = ["Runway 18", "Runway 23", "Runway 27", "Runway 32", "Runway 36", "Runway 05", "Runway 09", "Runway 14"];
    }
    setAnswerChoices(options);
  }, [complexMode]);

  const generate = useCallback(() => {
    if (questionType === 'vfr') generateVfr();
    else generateRunway();
  }, [questionType, generateVfr, generateRunway]);

  const solveVfr = () => {
    setAltitudeLines([]);

    if (airClass === "A") { setAnswerAlt("VFR not allowed (Class A)"); return; }
    if (visibility < 3) { setAnswerAlt("VFR not allowed (Vis < 3 SM)"); return; }

    let ceilingAltitude = 1000000;
    for (const layer of cloudLayers) {
      if ((layer.type === "BKN" || layer.type === "OVC") && layer.altitude < ceilingAltitude) {
        ceilingAltitude = layer.altitude;
      }
    }
    if (ceilingAltitude === 1000000) { setAnswerAlt("No ceiling found"); return; }

    const newLines = [];
    newLines.push({ lineAlt: ceilingAltitude, text: "", textAlt: ceilingAltitude, ceiling: ceilingAltitude });

    const clearance = ceilingAltitude < 10000 ? 500 : 1000;
    let firstAlt = ceilingAltitude - clearance;
    newLines.push({ lineAlt: firstAlt, text: `-${clearance}`, textAlt: firstAlt + clearance / 2, ceiling: ceilingAltitude });

    let finalAlt = Math.round(firstAlt / 1000) * 1000 - 500;
    const dif = finalAlt - firstAlt;
    if (dif !== 0) {
      newLines.push({ lineAlt: finalAlt, text: `${dif}`, textAlt: finalAlt - dif / 2, ceiling: ceilingAltitude });
    }

    const thousand = Math.floor(finalAlt / 1000);
    let adjust = false;
    if (course < 180) {
      if (thousand % 2 === 0) { finalAlt -= 1000; adjust = true; }
    } else {
      if (thousand % 2 === 1) { finalAlt -= 1000; adjust = true; }
    }
    if (adjust) {
      newLines.push({ lineAlt: finalAlt, text: "-1000", textAlt: finalAlt + 500, ceiling: ceilingAltitude });
    }

    setAltitudeLines(newLines);
    setAnswerAlt(`${finalAlt?.toLocaleString() ?? "N/A"} ft`);
  };

  const getRunwayIndex = () => {
    let direction = directionG;
    let randPosiAve = 2 * randPosiG;
    if (toG) direction = (direction + 4) % 8;
    if (randPosi2G != null) randPosiAve = randPosiG + randPosi2G;

    if (!relativeG) {
      return indicatorG === 0 ? (flagDirectionG + 4) % 8 : flagDirectionG;
    }
    let runwayindex = (direction + randPosiAve) % 8;
    if (indicatorG === 0) runwayindex = (runwayindex + 4) % 8;
    if ([randPosiG, randPosi2G].includes(0) && [randPosiG, randPosi2G].includes(3)) {
      runwayindex = (runwayindex + 4) % 8;
    }
    return runwayindex;
  };

  const calculateIndicatorRotation = () => {
    let direction = directionG;
    if (toG) direction = (direction + 4) % 8;
    const runwayindex = getRunwayIndex();
    let rotation = -45 * (direction - runwayindex);
    if (indicatorG === 1) rotation = (rotation + 180) % 360;
    return rotation;
  };

  const visualizeRunway = () => {
    if (toG === null) return;
    setIndicatorRotation(calculateIndicatorRotation());
    setShowArrow(true);
    setShowIndicator(true);
  };

  const insertCompass = () => {
    if (toG === null) return;
    let direction = directionG;
    if (toG) direction = (direction + 4) % 8;
    setCompassRotation(-45 * (direction - 4));
    setShowCompassImg(true);
  };

  const solveRunway = () => {
    const runways = ["Runway 18", "Runway 23", "Runway 27", "Runway 32", "Runway 36", "Runway 05", "Runway 09", "Runway 14"];
    setSelectedAnswer(runways[getRunwayIndex()]);
    setIsAnswered(true);
  };

  const handleSubmitClick = () => {
    if (!isAnswered) solveRunway();
    else generate();
  };

  const solve = () => {
    if (questionType === 'vfr') solveVfr();
    else solveRunway();
  };

  useEffect(() => { generate(); }, [questionType, complexMode, generate]);

  return (
    <div className="whiz-container">
      <h1>FR&R</h1>

      <div className="whiz-controls">
        {questionType === 'runway' && (
          <label className="frr-complex-label">
            <input
              type="checkbox"
              checked={complexMode}
              onChange={(e) => setComplexMode(e.target.checked)}
            />
            Complex
          </label>
        )}
        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
          className="question-type-select"
        >
          <option value="vfr">VFR Cruising Altitude</option>
          <option value="runway">Runway Indicators</option>
        </select>
        <button className="button" onClick={generate}>Generate</button>
        {questionType === 'vfr' && <button className="button" onClick={solve}>Solve</button>}
        {questionType === 'runway' && (
          <>
            <button className="button" onClick={visualizeRunway}>Visualize</button>
            <button className="button" onClick={insertCompass}>Compass</button>
          </>
        )}
      </div>

      {questionType === 'vfr' && (
        <div ref={varRowsWrapperRef} className="var-rows-wrapper">
          <div ref={varRowsInnerRef} className="var-rows var-rows-two-col">
            <div className="var-col">
              <div className="var-row" style={{ gap: '6px' }}>
                <span className="var-label" style={{ minWidth: '110px' }}>Airspace</span>
                <span style={{ minWidth: '60px' }}>Class {airClass}</span>
                <span style={{ minWidth: '24px', color: '#aaa' }}></span>
              </div>
              <div className="var-row" style={{ gap: '6px' }}>
                <span className="var-label" style={{ minWidth: '110px' }}>Visibility</span>
                <span style={{ minWidth: '60px' }}>{visibility}</span>
                <span style={{ minWidth: '24px', color: '#aaa' }}>SM</span>
              </div>
              <div className="var-row" style={{ gap: '6px' }}>
                <span className="var-label" style={{ minWidth: '110px' }}>Mag Heading</span>
                <span style={{ minWidth: '60px' }}>{heading}</span>
                <span style={{ minWidth: '24px', color: '#aaa' }}>°</span>
              </div>
              <div className="var-row" style={{ gap: '6px' }}>
                <span className="var-label" style={{ minWidth: '110px' }}>Mag Course</span>
                <span style={{ minWidth: '60px' }}>{course}</span>
                <span style={{ minWidth: '24px', color: '#aaa' }}>°</span>
              </div>
            </div>
            <div className="var-col">
              {cloudLayers.map((layer, i) => (
                <div key={i} className="var-row" style={{ gap: '6px' }}>
                  <span className="var-label" style={{ minWidth: '50px' }}>{layer.type}</span>
                  <span style={{ minWidth: '60px' }}>{layer.altitude.toLocaleString()}</span>
                  <span style={{ minWidth: '24px', color: '#aaa' }}>ft</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {questionType === 'vfr' && answerAlt && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{
            display: 'inline-block',
            padding: '10px 28px',
            border: '2px solid #4caf50',
            borderRadius: '8px',
            fontSize: '1.05em',
            fontWeight: 'bold',
          }}>
            Max VFR Cruising Altitude: {answerAlt}
          </span>
        </div>
      )}

      {questionType === 'runway' && (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div className="qa-box question-area" style={{ marginBottom: '12px' }}>
            {questionText}
          </div>
          {answerChoices.length > 0 && (
            <div className="qa-box">
              <div className="radio-list" id="answerForm">
                {answerChoices.map((choice, index) => (
                  <label
                    key={index}
                    className={
                      selectedAnswer && choice === selectedAnswer ? 'correct' :
                      selectedAnswer && userAnswer === choice && choice !== selectedAnswer ? 'wrong' :
                      !selectedAnswer && userAnswer === choice ? 'selected' : ''
                    }
                    onClick={() => { if (!selectedAnswer) setUserAnswer(choice); }}
                  >
                    <input
                      type="radio"
                      name="answerChoice"
                      value={choice}
                      checked={userAnswer === choice}
                      onChange={() => {}}
                      disabled={!!selectedAnswer}
                    />
                    {choice}
                  </label>
                ))}
                <button
                  type="button"
                  className="submitBtn"
                  onClick={handleSubmitClick}
                  style={{ marginTop: '10px' }}
                >
                  {submitButtonText}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={wheelWrapperRef} style={{ width: '100%', maxWidth: '500px', overflow: 'hidden', marginTop: '24px' }}>
      <div ref={wheelContainerRef} className="Wheel-Container" id="wheel-container" style={{ position: 'relative', width: '500px', height: '500px' }}>
        {questionType === 'vfr' && altitudeLines.length > 0 && altitudeLines.map((line, index) => (
          <React.Fragment key={index}>
            <div style={{
              position: 'absolute', left: '40px', right: '40px',
              top: `${15 + ((line.ceiling || 10000) - line.lineAlt) / 3500 * 500}px`,
              height: '2px', backgroundColor: '#000', zIndex: 3
            }} />
            <div style={{
              position: 'absolute', left: '2px',
              top: `${9 + ((line.ceiling || 10000) - line.lineAlt) / 3500 * 500}px`,
              fontSize: '12px', color: '#000', zIndex: 4
            }}>
              {line.lineAlt.toLocaleString()}
            </div>
            {line.text && (
              <div style={{
                position: 'absolute', left: '50%',
                top: `${10 + ((line.ceiling || 10000) - line.textAlt) / 3500 * 500}px`,
                transform: 'translateX(-50%)', fontSize: '12px', color: '#000', zIndex: 4
              }}>
                {line.text}
              </div>
            )}
          </React.Fragment>
        ))}

        {questionType === 'runway' && (
          <>
            {showCompassImg && (
              <img src="/images/heading.webp" alt="Compass" style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: `translate(-50%, -50%) rotate(${compassRotation}deg)`,
                width: '250px', zIndex: 5
              }} />
            )}
            {showArrow && (
              <img src="/images/arrowfrr.png" alt="Aircraft Arrow" style={{
                position: 'absolute', bottom: '100%', left: '50%',
                transform: 'translate(-50%, 150%)', width: '60px', zIndex: 10
              }} />
            )}
            {showIndicator && (
              <img
                src={indicatorG === 0 ? '/images/tetra.png' : '/images/sock.png'}
                alt={indicatorG === 0 ? 'Tetrahedron' : 'Windsock'}
                style={{
                  position: 'absolute', top: '5%', left: '10%',
                  transform: `rotate(${indicatorRotation}deg)`, width: '60px', zIndex: 11
                }}
              />
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default FRR;
