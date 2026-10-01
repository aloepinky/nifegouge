/**
 * Array of individual Quadfold divs
 * Each item is a function that takes props and returns a complete section
 *
 * Usage:
 * const quadDivs = getQuadDivs(props);
 * const singleQuad = quadDivs[0]; // Get a specific item
 */

// Define styles for Quad divs
const btFontSize = '10px'
const asFontSize = '10px'
const quadSectionStyle = {
  marginBottom: '6px',
  border: '1px solid #ddd',
  backgroundColor: '#f9f9f9',
  maxWidth: "350px",
  margin: '0 auto'
};

const quadHeaderStyle = {
  backgroundColor: '#000',
  color: 'white',
  padding: '6px 12px',
  fontSize: '12px',
  textAlign: 'left',
  borderBottom: '1px solid #000'
};

const quadStepStyle = {
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  gap: '0px',
  borderBottom: '1px solid #ddd',
  fontSize: '11px',
  backgroundColor: 'white',
  cursor: 'pointer'
};

const quadSubStepStyle = {
  padding: '2px 8px 4px 10px',
  fontSize: '9px',
  borderBottom: '1px solid #eee',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '4px',
  textAlign: 'right',
  cursor: 'pointer'
};

const nwcButtonStyle = {
  backgroundColor: '#000000ff',
  color: 'white',
  border: 'none',
  padding: '0px 0px',
  fontSize: '7px',
  fontWeight: 'bold',
  borderRadius: '3px',
  cursor: 'pointer',
  marginLeft: '2px',
  minWidth: '16px',
  height: '16px'
};

export const getQuadDivs = ({getInputClass, openChecklistModal, openNWCModal}) => {
  // Helper function to render NWC button if data exists for the step
    const renderNWCButton = (stepKey) => {
      if (openNWCModal && QUAD_NWC[stepKey]) {
        return (
          <button
            style={{...nwcButtonStyle, marginLeft: 'auto'}}
            onClick={(e) => {
              e.stopPropagation();
              openNWCModal(stepKey);
            }}
            title="View Notes, Warnings, and Cautions"
          >
            NWC
          </button>
        );
      }
      return null;
    };

  return [
    // 0. COCKPIT (ALL FLIGHTS)
    (
        <div key="qco" style={{display: 'flex', gap: '5px', alignItems: 'flex-start', justifyContent: 'center'}}>
            {/* LEFT CONTROLS */}
            <div style={{display: 'flex', flexDirection: 'column', width: '350px', minWidth: '250px'}}>
                <div key="qco" style={{...quadSectionStyle, maxWidth: 'none', width: '100%', margin: '0'}}>
                    <div style={quadHeaderStyle}>COCKPIT (ALL FLIGHTS)</div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco1" onClick={() => openChecklistModal(QUAD_ACTIONS.qco1, 'qco1')}>
                    <span className={getInputClass('qco1')}>1. Strap in ---------- COMPLETE</span>
                    {renderNWCButton('qco1')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco2" onClick={() => openChecklistModal(QUAD_ACTIONS.qco2, 'qco2')}>
                    <span className={getInputClass('qco2')}>2. BAT switch ---------- ON</span>
                    {renderNWCButton('qco2')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco3" onClick={() => openChecklistModal(QUAD_ACTIONS.qco3, 'qco3')}>
                    <span className={getInputClass('qco3')}>3. Regulator anti-suffocation valve ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco4" onClick={() => openChecklistModal(QUAD_ACTIONS.qco4, 'qco4')}>
                    <span className={getInputClass('qco4')}>4. External Power ---------- AS REQUIRED</span>
                    {renderNWCButton('qco4')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco5" onClick={() => openChecklistModal(QUAD_ACTIONS.qco5, 'qco5')}>
                    <span className={getInputClass('qco5')}>5. Seat height ---------- ADJUST</span>
                    {renderNWCButton('qco5')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco6" onClick={() => openChecklistModal(QUAD_ACTIONS.qco6, 'qco6')}>
                    <span className={getInputClass('qco6')}>6. Rudder pedals ---------- ADJUST</span>
                    {renderNWCButton('qco6')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco7" onClick={() => openChecklistModal(QUAD_ACTIONS.qco7, 'qco7')}>
                    <span className={getInputClass('qco7')}>7. Flight controls ---------- CHECK</span>
                    {renderNWCButton('qco7')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco8" onClick={() => openChecklistModal(QUAD_ACTIONS.qco8, 'qco8')}>
                    <span className={getInputClass('qco8')}>8. Fire detection system ---------- TEST (FIRE 1 and FIRE 2)</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco9" onClick={() => openChecklistModal(QUAD_ACTIONS.qco9, 'qco9')}>
                    <span className={getInputClass('qco9')}>9. Lamp test switch ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco10" onClick={() => openChecklistModal(QUAD_ACTIONS.qco10, 'qco10')}>
                    <span className={getInputClass('qco10')}>10. Flaps ---------- UP</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco11" onClick={() => openChecklistModal(QUAD_ACTIONS.qco11, 'qco11')}>
                    <span className={getInputClass('qco11')}>11. Exterior lights ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco12" onClick={() => openChecklistModal(QUAD_ACTIONS.qco12, 'qco12')}>
                    <span className={getInputClass('qco12')}>12. TRIM DISCONNECT switch ---------- NORM</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco13" onClick={() => openChecklistModal(QUAD_ACTIONS.qco13, 'qco13')}>
                    <span className={getInputClass('qco13')}>13. Interior lights ---------- AS REQUIRED</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco14" onClick={() => openChecklistModal(QUAD_ACTIONS.qco14, 'qco14')}>
                    <span className={getInputClass('qco14')}>14. TRIM AID switch ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco15" onClick={() => openChecklistModal(QUAD_ACTIONS.qco15, 'qco15')}>
                    <span className={getInputClass('qco15')}>15. Trim operation ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco16" onClick={() => openChecklistModal(QUAD_ACTIONS.qco16, 'qco16')}>
                    <span className={getInputClass('qco16')}>16. EMER LDG GR handle ---------- CHECK STOWED</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco17" onClick={() => openChecklistModal(QUAD_ACTIONS.qco17, 'qco17')}>
                    <span className={getInputClass('qco17')}>17. Clock ---------- SET</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco18" onClick={() => openChecklistModal(QUAD_ACTIONS.qco18, 'qco18')}>
                    <span className={getInputClass('qco18')}>18. UFCP lower panel switches ---------- SET</span>
                    </div>
                </div>
            </div>
            {/* Right CONTROLS */}
            <div style={{display: 'flex', flexDirection: 'column', width: '350px', minWidth: '250px'}}>
                <div key="qco" style={{...quadSectionStyle, maxWidth: 'none', width: '100%', margin: '0'}}>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco19" onClick={() => openChecklistModal(QUAD_ACTIONS.qco19, 'qco19')}>
                    <span className={getInputClass('qco19')}>19. Audio panel ---------- AS REQUIRED</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco20" onClick={() => openChecklistModal(QUAD_ACTIONS.qco20, 'qco20')}>
                    <span className={getInputClass('qco20')}>20. DEFOG switch ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco21" onClick={() => openChecklistModal(QUAD_ACTIONS.qco21, 'qco21')}>
                    <span className={getInputClass('qco21')}>21. ELT switch ---------- ARM</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco22" onClick={() => openChecklistModal(QUAD_ACTIONS.qco22, 'qco22')}>
                    <span className={getInputClass('qco22')}>22. PARKING BRAKE ---------- RESET</span>
                    {renderNWCButton('qco22')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco23" onClick={() => openChecklistModal(QUAD_ACTIONS.qco23, 'qco23')}>
                    <span className={getInputClass('qco23')}>23. Chocks ---------- REMOVED</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco24" onClick={() => openChecklistModal(QUAD_ACTIONS.qco24, 'qco24')}>
                    <span className={getInputClass('qco24')}>24. GEN switch ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco25" onClick={() => openChecklistModal(QUAD_ACTIONS.qco25, 'qco25')}>
                    <span className={getInputClass('qco25')}>25. FUEL BAL switch ---------- AUTO</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco26" onClick={() => openChecklistModal(QUAD_ACTIONS.qco26, 'qco26')}>
                    <span className={getInputClass('qco26')}>26. MANUAL FUEL BAL switch ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco27" onClick={() => openChecklistModal(QUAD_ACTIONS.qco27, 'qco27')}>
                    <span className={getInputClass('qco27')}>27. AVIONICS MASTER switch ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco28" onClick={() => openChecklistModal(QUAD_ACTIONS.qco28, 'qco28')}>
                    <span className={getInputClass('qco28')}>28. BUS TIE switch ---------- NORM</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco29" onClick={() => openChecklistModal(QUAD_ACTIONS.qco29, 'qco29')}>
                    <span className={getInputClass('qco29')}>29. PROBES ANTI-ICE switch ---------- CHECK, OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco30" onClick={() => openChecklistModal(QUAD_ACTIONS.qco30, 'qco30')}>
                    <span className={getInputClass('qco30')}>30. BOOST PUMP switch ---------- CHECK, ARM</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco31" onClick={() => openChecklistModal(QUAD_ACTIONS.qco31, 'qco31')}>
                    <span className={getInputClass('qco31')}>31. PMU switch ---------- NORM</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco32" onClick={() => openChecklistModal(QUAD_ACTIONS.qco32, 'qco32')}>
                    <span className={getInputClass('qco32')}>32. EVAP BLWR control ---------- AS REQUIRED</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco33" onClick={() => openChecklistModal(QUAD_ACTIONS.qco33, 'qco33')}>
                    <span className={getInputClass('qco33')}>33. AIR COND switch ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco34" onClick={() => openChecklistModal(QUAD_ACTIONS.qco34, 'qco34')}>
                    <span className={getInputClass('qco34')}>34. BLEED AIR INFLOW switch ---------- OFF</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco35" onClick={() => openChecklistModal(QUAD_ACTIONS.qco35, 'qco35')}>
                    <span className={getInputClass('qco35')}>35. PRESSURIZATION switch ---------- NORM</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco36" onClick={() => openChecklistModal(QUAD_ACTIONS.qco36, 'qco36')}>
                    <span className={getInputClass('qco36')}>36. RAM AIR FLOW switch ---------- AS REQUIRED</span>
                    {renderNWCButton('qco36')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: btFontSize}} data-step-key="qco37" onClick={() => openChecklistModal(QUAD_ACTIONS.qco37, 'qco37')}>
                    <span className={getInputClass('qco37')}>37. TEMP CONTROL switch ---------- AUTO</span>
                    </div>
                </div>
            </div>
        </div>
    ),      

    // 1. HIGH IOAT AT START (>80° C)
    (
      <div key="qhias" style={quadSectionStyle}>
        <div style={{...quadHeaderStyle, backgroundColor: '#d32f2f'}}>HIGH IOAT AT START (&gt;80° C)</div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias1')}>1. PCL ---------- VERIFY OFF</span>
          {renderNWCButton('qhias1')}
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias2')}>2. PMU ---------- RESET IF NECESSARY</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias3')}>3. PMU switch ---------- OFF</span>
          {renderNWCButton('qhias3')}
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias4')}>4. Propeller Area ---------- CLEAR</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias5')}>5. STARTER switch ---------- MANUAL FOR 20 SEC MAX</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias6')}>6. STARTER switch ---------- NORM</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias7')}>7. Repeat Steps 4-6 if IOAT is greater than 80°C</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias8')}>8. PMU switch ---------- NORM</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qhias9')}>9. Continue with Engine Start</span>
        </div>
      </div>
    ),

    // 2. ENGINE START (AUTO)
    (
      <div key="qestart" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>ENGINE START (AUTO)</div>
        <div style={quadStepStyle} data-step-key="qestart1" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart1, 'qestart1')}>
          <span className={getInputClass('qestart1')}>1. Canopy ---------- CLOSED AND LATCHED</span>
          {renderNWCButton('qestart1')}
        </div>
        <div style={quadStepStyle} data-step-key="qestart2" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart2, 'qestart2')}>
          <span className={getInputClass('qestart2')}>2. Navigation and anti-collision lights ---------- AS REQUIRED</span>
          {renderNWCButton('qestart2')}
        </div>
        <div style={quadStepStyle} data-step-key="qestart3" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart3, 'qestart3')}>
          <span className={getInputClass('qestart3')}>3. PMU FAIL/PMU STATUS message ---------- EXTINGUISHED</span>
          {renderNWCButton('qestart3')}
        </div>
        <div style={quadStepStyle} data-step-key="qestart4" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart4, 'qestart4')}>
          <span className={getInputClass('qestart4')}>4. PCL ---------- ADVANCE TO START POSITION</span>
          {renderNWCButton('qestart4')}
        </div>
        <div style={quadStepStyle} data-step-key="qestart5" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart5, 'qestart5')}>
          <span className={getInputClass('qestart5')}>5. Propeller area ---------- CLEAR</span>
        </div>
        <div style={quadStepStyle} data-step-key="qestart6" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart6, 'qestart6')}>
          <span className={getInputClass('qestart6')}>6. STARTER switch ---------- AUTO/RESET</span>
          {renderNWCButton('qestart6')}
        </div>
        <div style={quadStepStyle} data-step-key="qestart7" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart7, 'qestart7')}>
          <span className={getInputClass('qestart7')}>7. Engine Start ---------- MONITOR</span>
          {renderNWCButton('qestart7')}
        </div>
        <div style={quadStepStyle} data-step-key="qestart8" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart8, 'qestart8')}>
          <span className={getInputClass('qestart8')}>8. PCL ---------- ADVANCE PAST TWO CLICKS, THEN IDLE, AT OR ABOVE 60% N1</span>
          {renderNWCButton('qestart8')}
        </div>
        <div style={quadStepStyle} data-step-key="qestart9" onClick={() => openChecklistModal(QUAD_ACTIONS.qestart9, 'qestart9')}>
          <span className={getInputClass('qestart9')}>9. External power ---------- DISCONNECTED</span>
          {renderNWCButton('qestart9')}
        </div>
      </div>
    ),

    // 3. MOTORING RUN PROCEDURE
    (
      <div key="qmrp" style={quadSectionStyle}>
        <div style={{...quadHeaderStyle, backgroundColor: '#d32f2f'}}>MOTORING RUN PROCEDURE</div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qmrp1')}>1. PCL ---------- OFF</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qmrp2')}>2. IGNITION switch ---------- NORM</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qmrp3')}>3. Propeller area ---------- CLEAR</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qmrp4')}>4. STARTER switch ---------- MANUAL for 20 sec</span>
          {renderNWCButton('qmrp4')}
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qmrp5')}>5. STARTER switch ---------- NORM</span>
        </div>
      </div>
    ),

    // 4. Before Taxi
    (
        
        <div key="qas" style={{display: 'flex', gap: '5px', alignItems: 'flex-start', justifyContent: 'center'}}>
            {/* LEFT CONTROLS */}
            <div style={{display: 'flex', flexDirection: 'column', width: '350px', minWidth: '250px'}}>
                <div key="qas" style={{...quadSectionStyle, maxWidth: 'none', width: '100%', margin: '0'}}>
                    <div style={quadHeaderStyle}>BEFORE TAXI</div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas1" onClick={() => openChecklistModal(QUAD_ACTIONS.qas1, 'qas1')}>
                    <span className={getInputClass('qas1')}>1. GEN switch ---------- ON</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas2" onClick={() => openChecklistModal(QUAD_ACTIONS.qas2, 'qas2')}>
                    <span className={getInputClass('qas2')}>2. AUX BAT switch ---------- ON</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas3" onClick={() => openChecklistModal(QUAD_ACTIONS.qas3, 'qas3')}>
                    <span className={getInputClass('qas3')}>3. BLED AIR INFLOW switch ---------- NORM</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas4" onClick={() => openChecklistModal(QUAD_ACTIONS.qas4, 'qas4')}>
                    <span className={getInputClass('qas4')}>4. EVAP BLWR control ---------- AS REQUIRED</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas5" onClick={() => openChecklistModal(QUAD_ACTIONS.qas5, 'qas5')}>
                    <span className={getInputClass('qas5')}>5. AIR COND switch ---------- AS REQUIRED</span>
                    {renderNWCButton('qas5')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas6" onClick={() => openChecklistModal(QUAD_ACTIONS.qas6, 'qas6')}>
                    <span className={getInputClass('qas6')}>6. AVIONICS MASTER switch ---------- ON</span>
                    {renderNWCButton('qas6')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas7" onClick={() => openChecklistModal(QUAD_ACTIONS.qas7, 'qas7')}>
                    <span className={getInputClass('qas7')}>7. OBOGS supply lever ---------- ON</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas8" onClick={() => openChecklistModal(QUAD_ACTIONS.qas8, 'qas8')}>
                    <span className={getInputClass('qas8')}>8. Oxygen mask ---------- ON AND SECURE</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas9" onClick={() => openChecklistModal(QUAD_ACTIONS.qas9, 'qas9')}>
                    <span className={getInputClass('qas9')}>9. OBOGS ---------- CHECK</span>
                    {renderNWCButton('qas9')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas10" onClick={() => openChecklistModal(QUAD_ACTIONS.qas10, 'qas10')}>
                    <span className={getInputClass('qas10')}>10. Anti-G test ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas11" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11, 'qas11')}>
                    <span className={getInputClass('qas11')}>11. System test panel ---------- CHECK</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas11a" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11a, 'qas11a')}>
                    <span className={getInputClass('qas11a')}>a. Lamp test switch -------------------- CHECK</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas11b" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11b, 'qas11b')}>
                    <span className={getInputClass('qas11b')}>b. AOA system test switch -------------- TEST</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas11c" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11c, 'qas11c')}>
                    <span className={getInputClass('qas11c')}>c. ALT audio switch ----------------------- TEST</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas11d" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11d, 'qas11d')}>
                    <span className={getInputClass('qas11d')}>d. LDG GR audio switch ---------------- TEST</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas11e" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11e, 'qas11e')}>
                    <span className={getInputClass('qas11e')}>e. OVR SPD audio switch -------------- TEST</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas11f" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11f, 'qas11f')}>
                    <span className={getInputClass('qas11f')}>f. OVR G audio switch ------------------- TEST</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas11g" onClick={() => openChecklistModal(QUAD_ACTIONS.qas11g, 'qas11g')}>
                    <span className={getInputClass('qas11g')}>g. BINGO FUEL audio switch ---------- TEST</span>
                    </div>
                </div>
            </div>
            {/* Right CONTROLS */}
            <div style={{display: 'flex', flexDirection: 'column', width: '350px', minWidth: '250px'}}>
                <div key="qas" style={{...quadSectionStyle, maxWidth: 'none', width: '100%', margin: '0'}}>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas12" onClick={() => openChecklistModal(QUAD_ACTIONS.qas12, 'qas12')}>
                    <span className={getInputClass('qas12')}>12. Speed brake ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas13" onClick={() => openChecklistModal(QUAD_ACTIONS.qas13, 'qas13')}>
                    <span className={getInputClass('qas13')}>13. Flaps ---------- CHECK</span>
                    {renderNWCButton('qas13')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas14" onClick={() => openChecklistModal(QUAD_ACTIONS.qas14, 'qas14')}>
                    <span className={getInputClass('qas14')}>14. TRIM AID switch ---------- ON</span>
                    </div>
                    <div style={quadSubStepStyle}>
                    <span>(Verify TAD OFF extinguished & Rudder Trim set to T/O)</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas15" onClick={() => openChecklistModal(QUAD_ACTIONS.qas15, 'qas15')}>
                    <span className={getInputClass('qas15')}>15. Nosewheel steering ---------- ON</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas16" onClick={() => openChecklistModal(QUAD_ACTIONS.qas16, 'qas16')}>
                    <span className={getInputClass('qas16')}>16. PARKING BRAKE ---------- RELEASE</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas17" onClick={() => openChecklistModal(QUAD_ACTIONS.qas17, 'qas17')}>
                    <span className={getInputClass('qas17')}>17. Brakes ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas18" onClick={() => openChecklistModal(QUAD_ACTIONS.qas18, 'qas18')}>
                    <span className={getInputClass('qas18')}>18. TCAS ---------- ON/TEST</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas19" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19, 'qas19')}>
                    <span className={getInputClass('qas19')}>19. UFCP and MFD ---------- CHECK AND SET</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas19a" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19a, 'qas19a')}>
                    <span className={getInputClass('qas19a')}>a. Database, location, and alignment --- CHECK</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas19b" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19b, 'qas19b')}>
                    <span className={getInputClass('qas19b')}>b. UHF -------------------------------- AS REQUIRED</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas19c" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19c, 'qas19c')}>
                    <span className={getInputClass('qas19c')}>c. VHF -------------------------------- AS REQUIRED</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas19d" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19d, 'qas19d')}>
                    <span className={getInputClass('qas19d')}>d. VOR -------------------------------- AS REQUIRED</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas19e" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19e, 'qas19e')}>
                    <span className={getInputClass('qas19e')}>e. Transponder and FLT NO ------------------- SET</span>
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas19f" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19f, 'qas19f')}>
                    <span className={getInputClass('qas19f')} style={{flex: 1, textAlign: 'right'}}>f. FMS ------------------------- AS REQUIRED</span>
                    {renderNWCButton('qas19f')}
                    </div>
                    <div style={quadSubStepStyle} data-step-key="qas19g" onClick={() => openChecklistModal(QUAD_ACTIONS.qas19g, 'qas19g')}>
                    <span className={getInputClass('qas19g')} style={{flex: 1, textAlign: 'right'}}>g. Altitude, G, speed, fuel flags - AS REQUIRED</span>
                    {renderNWCButton('qas19g')}
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas20" onClick={() => openChecklistModal(QUAD_ACTIONS.qas20, 'qas20')}>
                    <span className={getInputClass('qas20')}>20. Flight instruments ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas21" onClick={() => openChecklistModal(QUAD_ACTIONS.qas21, 'qas21')}>
                    <span className={getInputClass('qas21')}>21. Altimeters ---------- SET AND CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas22" onClick={() => openChecklistModal(QUAD_ACTIONS.qas22, 'qas22')}>
                    <span className={getInputClass('qas22')}>22. EICAS display ---------- CHECK</span>
                    </div>
                    <div style={{...quadStepStyle, fontSize: asFontSize}} data-step-key="qas23" onClick={() => openChecklistModal(QUAD_ACTIONS.qas23, 'qas23')}>
                    <span className={getInputClass('qas23')}>23. Landing/taxi lights ---------- AS REQUIRED</span>
                    </div>
                </div>
            </div>
        </div>
    ),

    // 5. TAXI
    (
      <div key="qtaxi" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>TAXI</div>
        <div style={quadStepStyle} data-step-key="qtaxi1" onClick={() => openChecklistModal(QUAD_ACTIONS.qtaxi1, 'qtaxi1')}>
          <span className={getInputClass('qtaxi1')}>1. Transponder ---------- AS REQUIRED</span>
          {renderNWCButton('qtaxi1')}
        </div>
        <div style={quadStepStyle} data-step-key="qtaxi2" onClick={() => openChecklistModal(QUAD_ACTIONS.qtaxi2, 'qtaxi2')}>
          <span className={getInputClass('qtaxi2')}>2. Heading and turn and slip indicators ---------- CHECK</span>
        </div>
      </div>
    ),

    // 6. OVERSPEED GOVERNOR CHECK
    (
      <div key="qogc" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>OVERSPEED GOVERNOR CHECK</div>
        <div style={quadStepStyle} data-step-key="qogc1" onClick={() => openChecklistModal(QUAD_ACTIONS.qogc1, 'qogc1')}>
          <span className={getInputClass('qogc1')}>1. Brakes ---------- HOLD AS REQUIRED</span>
          {renderNWCButton('qogc1')}
        </div>
        <div style={quadStepStyle} data-step-key="qogc2" onClick={() => openChecklistModal(QUAD_ACTIONS.qogc2, 'qogc2')}>
          <span className={getInputClass('qogc2')}>2. PCL ---------- IDLE</span>
        </div>
        <div style={quadStepStyle} data-step-key="qogc3" onClick={() => openChecklistModal(QUAD_ACTIONS.qogc3, 'qogc3')}>
          <span className={getInputClass('qogc3')}>3. PMU switch ---------- OFF</span>
          {renderNWCButton('qogc3')}
        </div>
        <div style={quadStepStyle} data-step-key="qogc4" onClick={() => openChecklistModal(QUAD_ACTIONS.qogc4, 'qogc4')}>
          <span className={getInputClass('qogc4')}>4. PCL ---------- ADVANCE AND VERIFY NP STABILIZES at 100±2%</span>
          {renderNWCButton('qogc4')}
        </div>
        <div style={quadStepStyle} data-step-key="qogc5" onClick={() => openChecklistModal(QUAD_ACTIONS.qogc5, 'qogc5')}>
          <span className={getInputClass('qogc5')}>5. PCL ---------- ADVANCE AT LEAST AN ADDITIONAL 5% TORQUE AND VERIFY NP STABILIZES AT 100±2%</span>
        </div>
        <div style={quadStepStyle} data-step-key="qogc6" onClick={() => openChecklistModal(QUAD_ACTIONS.qogc6, 'qogc6')}>
          <span className={getInputClass('qogc6')}>6. PCL ---------- IDLE</span>
        </div>
        <div style={quadStepStyle} data-step-key="qogc7" onClick={() => openChecklistModal(QUAD_ACTIONS.qogc7, 'qogc7')}>
          <span className={getInputClass('qogc7')}>7. PMU switch ---------- NORM</span>
        </div>
      </div>
    ),

    // 7. BEFORE TAKEOFF
    (
      <div key="qbto" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>BEFORE TAKEOFF</div>
        <div style={quadStepStyle} data-step-key="qbto1" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto1, 'qbto1')}>
          <span className={getInputClass('qbto1')}>1. Minimum power by 60 KIAS ---------- COMPUTE</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto2" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto2, 'qbto2')}>
          <span className={getInputClass('qbto2')}>2. Speed brake ---------- RETRACTED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto3" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto3, 'qbto3')}>
          <span className={getInputClass('qbto3')}>3. Flaps ---------- TO</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto4" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto4, 'qbto4')}>
          <span className={getInputClass('qbto4')}>4. Trim ---------- SET FOR TAKEOFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto5" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto5, 'qbto5')}>
          <span className={getInputClass('qbto5')}>5. Fuel quantity and balance ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto6" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto6, 'qbto6')}>
          <span className={getInputClass('qbto6')}>6. Engine instruments ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto7" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto7, 'qbto7')}>
          <span className={getInputClass('qbto7')}>7. DVR control ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto8" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto8, 'qbto8')}>
          <span className={getInputClass('qbto8')}>8. Electrical system ---------- VERIFY &gt;27 volts &amp; +50 amps OR LESS</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto9" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto9, 'qbto9')}>
          <span className={getInputClass('qbto9')}>9. DEFOG switch ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbto10" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto10, 'qbto10')}>
          <span className={getInputClass('qbto10')}>10. Seat safety pin ---------- REMOVED AND STOWED (BOTH)</span>
          {renderNWCButton('qbto10')}
        </div>
        <div style={quadStepStyle} data-step-key="qbto11" onClick={() => openChecklistModal(QUAD_ACTIONS.qbto11, 'qbto11')}>
          <span className={getInputClass('qbto11')}>11. ISS mode selector ---------- AS REQUIRED</span>
        </div>
      </div>
    ),

    // 8. LINEUP CHECK
    (
      <div key="qlc" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>LINEUP CHECK</div>
        <div style={quadStepStyle} data-step-key="qlc1" onClick={() => openChecklistModal(QUAD_ACTIONS.qlc1, 'qlc1')}>
          <span className={getInputClass('qlc1')}>1. Exterior lights ---------- ON</span>
        </div>
        <div style={quadStepStyle} data-step-key="qlc2" onClick={() => openChecklistModal(QUAD_ACTIONS.qlc2, 'qlc2')}>
          <span className={getInputClass('qlc2')}>2. Transponder ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qlc3" onClick={() => openChecklistModal(QUAD_ACTIONS.qlc3, 'qlc3')}>
          <span className={getInputClass('qlc3')}>3. PROBES ANTI-ICE switch ---------- ON</span>
          {renderNWCButton('qlc3')}
        </div>
        <div style={quadStepStyle} data-step-key="qlc4" onClick={() => openChecklistModal(QUAD_ACTIONS.qlc4, 'qlc4')}>
          <span className={getInputClass('qlc4')}>4. Nosewheel steering ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qlc5" onClick={() => openChecklistModal(QUAD_ACTIONS.qlc5, 'qlc5')}>
          <span className={getInputClass('qlc5')}>5. EICAS display ---------- CHECK</span>
        </div>
      </div>
    ),

    // 9. AFTER TAKEOFF
    (
      <div key="qat" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>AFTER TAKEOFF</div>
        <div style={quadStepStyle} data-step-key="qat1" onClick={() => openChecklistModal(QUAD_ACTIONS.qat1, 'qat1')}>
          <span className={getInputClass('qat1')}>1. Gear ---------- AS REQUIRED</span>
          {renderNWCButton('qat1')}
        </div>
        <div style={quadStepStyle} data-step-key="qat2" onClick={() => openChecklistModal(QUAD_ACTIONS.qat2, 'qat2')}>
          <span className={getInputClass('qat2')}>2. Flaps ---------- UP</span>
          {renderNWCButton('qat2')}
        </div>
      </div>
    ),

    // 10. CLIMB (PASSING 10,000 FEET)
    (
      <div key="qclimb" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>CLIMB (PASSING 10,000 FEET)</div>
        <div style={quadStepStyle} data-step-key="qclimb1" onClick={() => openChecklistModal(QUAD_ACTIONS.qclimb1, 'qclimb1')}>
          <span className={getInputClass('qclimb1')}>1. OBOGS ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qclimb2" onClick={() => openChecklistModal(QUAD_ACTIONS.qclimb2, 'qclimb2')}>
          <span className={getInputClass('qclimb2')}>2. DEFOG switch ---------- AS REQUIRED</span>
          {renderNWCButton('qclimb2')}
        </div>
        <div style={quadStepStyle} data-step-key="qclimb3" onClick={() => openChecklistModal(QUAD_ACTIONS.qclimb3, 'qclimb3')}>
          <span className={getInputClass('qclimb3')}>3. Vent control lever ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qclimb4" onClick={() => openChecklistModal(QUAD_ACTIONS.qclimb4, 'qclimb4')}>
          <span className={getInputClass('qclimb4')}>4. Pressurization system ---------- CHECK</span>
          {renderNWCButton('qclimb4')}
        </div>
      </div>
    ),

    // 11. OPERATIONS CHECK
    (
      <div key="qoc" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>OPERATIONS CHECK</div>
        <div style={quadStepStyle} data-step-key="qoc1" onClick={() => openChecklistModal(QUAD_ACTIONS.qoc1, 'qoc1')}>
          <span className={getInputClass('qoc1')}>1. Hydraulic pressure ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qoc2" onClick={() => openChecklistModal(QUAD_ACTIONS.qoc2, 'qoc2')}>
          <span className={getInputClass('qoc2')}>2. Electrical systems ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qoc3" onClick={() => openChecklistModal(QUAD_ACTIONS.qoc3, 'qoc3')}>
          <span className={getInputClass('qoc3')}>3. Fuel quantity/balance ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qoc4" onClick={() => openChecklistModal(QUAD_ACTIONS.qoc4, 'qoc4')}>
          <span className={getInputClass('qoc4')}>4. OBOGS ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qoc5" onClick={() => openChecklistModal(QUAD_ACTIONS.qoc5, 'qoc5')}>
          <span className={getInputClass('qoc5')}>5. Engine instruments ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qoc6" onClick={() => openChecklistModal(QUAD_ACTIONS.qoc6, 'qoc6')}>
          <span className={getInputClass('qoc6')}>6. Pressurization ---------- CHECK</span>
        </div>
      </div>
    ),

    // 12. PRE-STALL, SPIN, AND AEROBATIC CHECKS
    (
      <div key="qpssa" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>PRE-STALL, SPIN, AND AEROBATIC CHECKS</div>
        <div style={quadStepStyle} data-step-key="qpssa1" onClick={() => openChecklistModal(QUAD_ACTIONS.qpssa1, 'qpssa1')}>
          <span className={getInputClass('qpssa1')}>1. Loose items ---------- STOWED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qpssa2" onClick={() => openChecklistModal(QUAD_ACTIONS.qpssa2, 'qpssa2')}>
          <span className={getInputClass('qpssa2')}>2. Engine instruments ---------- CHECKED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qpssa3" onClick={() => openChecklistModal(QUAD_ACTIONS.qpssa3, 'qpssa3')}>
          <span className={getInputClass('qpssa3')}>3. Fuel balance ---------- CHECK LESS THAN 50 POUNDS</span>
        </div>
      </div>
    ),

    // 13. DESCENT
    (
      <div key="qdesc" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>DESCENT</div>
        <div style={quadStepStyle} data-step-key="qdesc1" onClick={() => openChecklistModal(QUAD_ACTIONS.qdesc1, 'qdesc1')}>
          <span className={getInputClass('qdesc1')}>1. PFD ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qdesc2" onClick={() => openChecklistModal(QUAD_ACTIONS.qdesc2, 'qdesc2')}>
          <span className={getInputClass('qdesc2')}>2. Altimeters ---------- SET</span>
        </div>
        <div style={quadStepStyle} data-step-key="qdesc3" onClick={() => openChecklistModal(QUAD_ACTIONS.qdesc3, 'qdesc3')}>
          <span className={getInputClass('qdesc3')}>3. MASTER ARM switch ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qdesc4" onClick={() => openChecklistModal(QUAD_ACTIONS.qdesc4, 'qdesc4')}>
          <span className={getInputClass('qdesc4')}>4. DEFOG switch ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qdesc5" onClick={() => openChecklistModal(QUAD_ACTIONS.qdesc5, 'qdesc5')}>
          <span className={getInputClass('qdesc5')}>5. Vent control lever ---------- AS REQUIRED</span>
        </div>
      </div>
    ),

    // 14. BEFORE LANDING
    (
      <div key="qbl" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>BEFORE LANDING</div>
        <div style={quadStepStyle} data-step-key="qbl1" onClick={() => openChecklistModal(QUAD_ACTIONS.qbl1, 'qbl1')}>
          <span className={getInputClass('qbl1')}>1. DEFOG switch ---------- OFF</span>
          {renderNWCButton('qbl1')}
        </div>
        <div style={quadStepStyle} data-step-key="qbl2" onClick={() => openChecklistModal(QUAD_ACTIONS.qbl2, 'qbl2')}>
          <span className={getInputClass('qbl2')}>2. Engine instruments ---------- CHECK</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbl3" onClick={() => openChecklistModal(QUAD_ACTIONS.qbl3, 'qbl3')}>
          <span className={getInputClass('qbl3')}>3. Gear ---------- DOWN</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbl4" onClick={() => openChecklistModal(QUAD_ACTIONS.qbl4, 'qbl4')}>
          <span className={getInputClass('qbl4')}>4. Brakes ---------- CHECK, AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbl5" onClick={() => openChecklistModal(QUAD_ACTIONS.qbl5, 'qbl5')}>
          <span className={getInputClass('qbl5')}>5. FLAPS ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qbl6" onClick={() => openChecklistModal(QUAD_ACTIONS.qbl6, 'qbl6')}>
          <span className={getInputClass('qbl6')}>6. Speed brake ---------- RETRACTED</span>
          {renderNWCButton('qbl6')}
        </div>
      </div>
    ),

    // 15. FULL STOP/TAXI BACK CHECKLIST
    (
      <div key="qfstb" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>FULL STOP/TAXI BACK CHECKLIST</div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb1')}>1. PROBES ANTI-ICE switch ---------- OFF</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb2')}>2. Flaps ---------- TO</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb3')}>3. Trim ---------- Set for Takeoff</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb4')}>4. Transponder ---------- AS REQUIRED</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb5')}>5. Fuel quantity and balance ---------- CHECK</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb6')}>6. Engine instruments ---------- CHECK</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb7')}>7. DEFOG switch ---------- OFF</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb8')}>8. Minimum power by 60 KIAS ---------- COMPUTE</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb9')}>9. Exterior lights ---------- ON</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb10')}>10. Transponder ---------- AS REQUIRED</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb11')}>11. PROBES ANTI-ICE switch ---------- ON</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb12')}>12. Nose wheel steering ---------- OFF</span>
        </div>
        <div style={{...quadStepStyle, cursor: 'default'}}>
          <span className={getInputClass('qfstb13')}>13. EICAS display ---------- CHECK</span>
        </div>
      </div>
    ),

    // 16. AFTER LANDING
    (
      <div key="qal" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>AFTER LANDING</div>
        <div style={quadStepStyle} data-step-key="qal1" onClick={() => openChecklistModal(QUAD_ACTIONS.qal1, 'qal1')}>
          <span className={getInputClass('qal1')}>1. ISS mode selector ---------- SOLO OR CMD FWD</span>
          {renderNWCButton('qal1')}
        </div>
        <div style={quadStepStyle} data-step-key="qal2" onClick={() => openChecklistModal(QUAD_ACTIONS.qal2, 'qal2')}>
          <span className={getInputClass('qal2')}>2. Seat safety pin ---------- INSTALL</span>
          {renderNWCButton('qal2')}
        </div>
        <div style={quadStepStyle} data-step-key="qal3" onClick={() => openChecklistModal(QUAD_ACTIONS.qal3, 'qal3')}>
          <span className={getInputClass('qal3')}>3. PROBES ANTI-ICE switch ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qal4" onClick={() => openChecklistModal(QUAD_ACTIONS.qal4, 'qal4')}>
          <span className={getInputClass('qal4')}>4. Flaps ---------- UP</span>
        </div>
        <div style={quadStepStyle} data-step-key="qal5" onClick={() => openChecklistModal(QUAD_ACTIONS.qal5, 'qal5')}>
          <span className={getInputClass('qal5')}>5. Trim interrupt button ---------- DEPRESS</span>
        </div>
        <div style={quadStepStyle} data-step-key="qal6" onClick={() => openChecklistModal(QUAD_ACTIONS.qal6, 'qal6')}>
          <span className={getInputClass('qal6')}>6. Trim ---------- SET FOR TAKEOFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qal7" onClick={() => openChecklistModal(QUAD_ACTIONS.qal7, 'qal7')}>
          <span className={getInputClass('qal7')}>7. Transponder ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qal8" onClick={() => openChecklistModal(QUAD_ACTIONS.qal8, 'qal8')}>
          <span className={getInputClass('qal8')}>8. TCAS ---------- STBY</span>
        </div>
        <div style={quadStepStyle} data-step-key="qal9" onClick={() => openChecklistModal(QUAD_ACTIONS.qal9, 'qal9')}>
          <span className={getInputClass('qal9')}>9. BLEED AIR INFLOW switch ---------- OFF</span>
          {renderNWCButton('qal9')}
        </div>
      </div>
    ),

    // 17. ENGINE SHUTDOWN
    (
      <div key="qesd" style={quadSectionStyle}>
        <div style={quadHeaderStyle}>ENGINE SHUTDOWN</div>
        <div style={quadStepStyle} data-step-key="qesd1" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd1, 'qesd1')}>
          <span className={getInputClass('qesd1')}>1. PARKING BRAKE ---------- SET</span>
          {renderNWCButton('qesd1')}
        </div>
        <div style={quadStepStyle} data-step-key="qesd2" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd2, 'qesd2')}>
          <span className={getInputClass('qesd2')}>2. Landing and taxi lights ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd3" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd3, 'qesd3')}>
          <span className={getInputClass('qesd3')}>3. Transponder ---------- AS REQUIRED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd4" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd4, 'qesd4')}>
          <span className={getInputClass('qesd4')}>4. AVIONICS MASTER switch ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd5" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd5, 'qesd5')}>
          <span className={getInputClass('qesd5')}>5. RAM AIR FLOW switch ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd6" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd6, 'qesd6')}>
          <span className={getInputClass('qesd6')}>6. AIR COND switch ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd7" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd7, 'qesd7')}>
          <span className={getInputClass('qesd7')}>7. EVAP BLWR control ---------- OFF</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd8" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd8, 'qesd8')}>
          <span className={getInputClass('qesd8')}>8. Oxygen mask ---------- REMOVE</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd9" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd9, 'qesd9')}>
          <span className={getInputClass('qesd9')}>9. OBOGS ---------- OFF</span>
          {renderNWCButton('qesd9')}
        </div>
        <div style={quadStepStyle} data-step-key="qesd10" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd10, 'qesd10')}>
          <span className={getInputClass('qesd10')}>10. PCL ---------- IDLE &gt;60 SECONDS, THEN OFF</span>
          {renderNWCButton('qesd10')}
        </div>
        <div style={quadStepStyle} data-step-key="qesd11" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd11, 'qesd11')}>
          <span className={getInputClass('qesd11')}>11. CANOPY ---------- OPEN (AS REQUIRED)</span>
          {renderNWCButton('qesd11')}
        </div>
        <div style={quadStepStyle} data-step-key="qesd12" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd12, 'qesd12')}>
          <span className={getInputClass('qesd12')}>12. PMU STATUS message ---------- EXTINGUISHED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd13" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd13, 'qesd13')}>
          <span className={getInputClass('qesd13')}>13. FDR light ---------- EXTINGUISHED</span>
        </div>
        <div style={quadStepStyle} data-step-key="qesd14" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd14, 'qesd14')}>
          <span className={getInputClass('qesd14')}>14. Gust lock ---------- ENGAGE (AS REQUIRED)</span>
          {renderNWCButton('qesd14')}
        </div>
        <div style={quadStepStyle} data-step-key="qesd15" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd15, 'qesd15')}>
          <span className={getInputClass('qesd15')}>15. Interior/exterior lights ---------- OFF</span>
          {renderNWCButton('qesd15')}
        </div>
        <div style={quadStepStyle} data-step-key="qesd16" onClick={() => openChecklistModal(QUAD_ACTIONS.qesd16, 'qesd16')}>
          <span className={getInputClass('qesd16')}>16. GEN, BAT, and AUX BAT switches ---------- OFF</span>
        </div>
      </div>
    )
  ];
};

// Export helper data
export const QUAD_ANSWERS = {
  // COCKPIT (ALL FLIGHTS)
  qco1: ["Strap in ---------- COMPLETE"],
  qco2: ["BAT\u200B switch ---------- ON", "\u200BVOLTS"],
  qco3: ["Regulator anti-suffocation valve ---------- CHECK"],
  qco4: ["External Power ---------- AS REQUIRED", "\u200BVOLTS"],
  qco5: ["Sea\u200Bt height ---------- ADJUST"],
  qco6: ["Rudder pedals ---------- ADJUST"],
  qco7: ["Flight controls ---------- CHECK"],
  qco8: ["Fire detection ", "Master Warning", "Fire Light"],
  qco9: ["Lamp test ", "Gear", "Gea\u200Br Light", "FD\u200BR", "Master Warning", "Fire Light", "Master Caution", "COM1", "COM2", "EICAS"],
  qco10: ["Flaps ---------- UP"],
  qco11: ["landing/", "taxi light", "anti-coll light", "nav light"],
  qco12: ["TRI\u200BM DISCONNECT switch ---------- NORM"],
  qco13: ['floodLight', 'sideLight', 'instLight'],
  qco14: ["TRI\u200BM AID switch ---------- OFF"],
  qco15: ["PCL", "NWS"],
  qco16: ["EMER LDG GR handle ---------- CHECK STOWED"],
  qco17: ["Clock ---------- SET"],
  qco18: ['hudcage', 'hudlgt', 'mfdrep', 'lgthud', 'lgtufcp'],
  qco19: ['COM1','COM2', 'NAVCOM', 'DME', 'MKR', 'VOX','EMR/NRM'],
  qco20: ["DEFOG switch ---------- OFF"],
  qco21: ["ELT switch ---------- ARM"],
  qco22: ["PARKING BRAKE ---------- RESET"],
  qco23: ["Chocks ---------- REMOVED"],
  qco24: ["GEN switch ---------- OFF"],
  qco25: ["FUEL BAL switch ---------- AUTO"],
  qco26: ["MANUAL FUEL\u200B BAL switch ---------- OFF"],
  qco27: ["AVIONICS MASTER switch ---------- OFF"],
  qco28: ["BUS TIE switch ---------- NORM"],
  qco29: ["PROBES ANTI-ICE switch ---------- CHECK, OFF", "EICAS"],
  qco30: ["BOOST PUMP switch ---------- CHECK, ARM", "EICAS", "VOLTS"],
  qco31: ["PMU switch ---------- NORM"],
  qco32: ["EVAP BLWR control ---------- AS REQUIRED"],
  qco33: ["AIR COND switch ---------- OFF"],
  qco34: ["BLEED AIR INFLOW switch ---------- OFF"],
  qco35: ["PRESSURIZATION switch ---------- NORM"],
  qco36: ["RAM AIR FLOW switch ---------- AS REQUIRED"],
  qco37: ["TEMP CONTROL switch ---------- AUTO"],

  // HIGH IOAT AT START
  qhias1: ["PCL ---------- VERIFY OFF"],
  qhias2: ["PMU ---------- RESET IF NECESSARY"],
  qhias3: ["PMU switch ---------- OFF"],
  qhias4: ["Pro\u200Bp\u200Beller Area ---------- CLEAR"],
  qhias5: ["STARTER switch ---------- MANUAL FOR 20 SEC MAX"],
  qhias6: ["STARTER switch ---------- NORM"],
  qhias7: ["Repeat Steps 4-6 if IOAT is greater than 80°C"],
  qhias8: ["PMU switch ---------- NORM"],
  qhias9: [""],

  // ENGINE START (AUTO)
  qestart1: ["Canopy ---------- CLOSED AND LATCHED", "\u200BEICAS", "\u200BMaster Warning"],
  qestart2: ["Navigation and anti-collision lights ---------- AS REQUIRED","\u200Banti-coll light", "\u200Bnav light"],
  qestart3: ["PMU FAIL/PMU STATUS message ---------- EXTINGUISHED","\u200BEICAS", "\u200Bpmu"],
  qestart4: ["PCL ---------- ADVANCE TO START POSITION", "\u200BEICAS"],
  qestart5: ["Pro\u200Bp\u200Beller area ---------- CLEAR"],
  qestart6: ["STARTER switch ---------- AUTO/RESET"],
  qestart7: ["Engine Start ---------- MONITOR","\u200BHyd Press", "\u200BITT", "\u200BN1", "\u200BEICAS", "\u200BFuel Flow"],
  qestart8: ["PCL ---------- ADVANCE PAST TWO CLICKS, THEN IDLE, AT OR ABOVE 60% N\u200B1","\u200BPCL", "\u200BN1", "\u200BITT"],
  qestart9: ["External power ---------- DISCONNECTED"],

  // MOTORING RUN PROCEDURE
  qmrp1: ["PCL ---------- OFF"],
  qmrp2: ["IGNITION switch ---------- NORM"],
  qmrp3: ["Pro\u200Bp\u200Beller area ---------- CLEAR"],
  qmrp4: ["STARTER switch ---------- MANUAL for 20 sec"],
  qmrp5: ["STARTER switch ---------- NORM"],

  // BEFORE TAXI
  qas1: ["GEN switch ---------- ON", "VOLTS"],
  qas2: ["AUX BAT switch ---------- ON"],
  qas3: ["BLED AIR INFLOW switch ---------- NORM"],
  qas4: ["EVAP BLWR control ---------- AS REQUIRED"],
  qas5: ["AIR COND switch ---------- AS REQUIRED"],
  qas6: ["AVIONICS MASTER switch ---------- ON"],
  qas7: ["OBOGS supply lever ---------- ON"],
  qas8: ["Oxyg\u200Ben mask ---------- ON AND SECURE"],
  qas9: ["OBOGS ---------- CHECK","\u200Bconcentration", "\u200BOBOGS pressure", "\u200Bflow i"],
  qas10: ["Anti-G test ---------- CHECK"],
  qas11: ["System test panel ---------- CHECK"],
  qas11a: ["Lamp test ", "Gear", "Gea\u200Br Light", "FD\u200BR", "Master Warning", "Fire Light", "Master Caution", "COM1", "COM2", "EICAS"],
  qas11b: ["AOA system \u200Btest switch ---------- CHECK", "Amber Donut", "Red Chevron", "Green Chevron", "AOA Indicator", "Controls"],
  qas11c: ["ALT audio switch ---------- CHECK"],
  qas11d: ["LDG GR audio switch ---------- CHECK"],
  qas11e: ["OVR SPD audio switch ---------- CHECK"],
  qas11f: ["OVR G audio switch ---------- CHECK"],
  qas11g: ["BINGO FUEL audio switch ---------- CHECK"],
  qas12: ["Speed brake ---------- CHECK", "EICAS"],
  qas13: ["Flaps ---------- CHECK", "\u200BFlap Indicator", "\u200BEICAS"],
  qas14: ["TRI\u200BM AID switch ---------- ON", "EICAS"],
  qas15: ["Nosewheel steering ---------- ON", "EICAS"],
  qas16: ["PARKING BRAKE ---------- RELEASE"],
  qas17: ["Brakes ---------- CHECK"],
  qas18: ["TCAS ---------- ON/TEST", "TCA\u200BS Range", "UHF"],
  qas19: ["UFCP and MFD ---------- CHECK AND SET"],
  qas19a: ["Database, location, and alignment --- CHECK"],
  qas19b: ["UHF -------------------------------- AS REQUIRED"],
  qas19c: ["VHF --------------------------------- AS REQUIRED"],
  qas19d: ["VOR -------------------------------- AS REQUIRED"],
  qas19e: ["Transponder and FLT NO ------------------- SET"],
  qas19f: ["FMS --------------------------------- AS REQUIRED"],
  qas19g: ["Altitud\u200Be, G, spee\u200Bd, fue\u200Bl flags - AS REQUIRED", "\u200BG Reset", "\u200BBingo Set", "\u200BSystem Button"],
  qas20: ["Flight instruments ---------- CHECK"],
  qas21: ["Altimeters ---------- SET AND CHECK", 'altimete2r'],
  qas22: ["EICAS display ---------- CHECK"],
  qas23: ["landing/", "taxi light"],

  // TAXI
  qtaxi1: ["Transponder ---------- AS REQUIRED"],
  qtaxi2: ["slip skid", "heading indi", "turn indi"],

  // OVERSPEED GOVERNOR CHECK
  qogc1: ["Brakes ---------- HOLD AS REQUIRED"],
  qogc2: ["PCL ---------- IDLE", "N1"],
  qogc3: ["PMU switch ---------- OFF", "\u200BN1", "\u200BMaster Warning", "\u200BMaster Caution"],
  qogc4: ["PCL ---------- ADVANCE AND VERIFY NP STABILIZES at 100±2%","\u200BPCL", "\u200BN\u200BP"],
  qogc5: ["PCL", "TORQUE", "N\u200BP"],
  qogc6: ["PCL ---------- IDLE", "N1"],
  qogc7: ["PMU switch ---------- NORM", "N1", "N\u200BP"],

  // BEFORE TAKEOFF
  qbto1: ["Torque"],
  qbto2: ["EICAS"],
  qbto3: ["Flaps ---------- TO", "Flap Indicator"],
  qbto4: ["Tri\u200Bm Indicator"],
  qbto5: ["Fuel quantity and balance ---------- CHECK", "EICAS"],
  qbto6: ["Engine instruments ---------- CHECK"],
  qbto7: ["DVR control ---------- AS REQUIRED"],
  qbto8: ["Electrical system ---------- VERIFY >27 volts & +50 amps OR LESS"],
  qbto9: ["DEFOG switch ---------- OFF"],
  qbto10: ["Seat safety pin ---------- REMOVED AND STOWED (BOTH)"],
  qbto11: ["ISS mode selector ---------- AS REQUIRED"],

  // LINEUP CHECK
  qlc1: ["landing/", "taxi light", "anti-coll light"],
  qlc2: ["Transponder ---------- AS REQUIRED"],
  qlc3: ["PROBES ANTI-ICE switch ---------- ON", "\u200BEICAS"],
  qlc4: ["Nosewheel steering ---------- OFF", "EICAS"],
  qlc5: ["EICAS display ---------- CHECK"],

  // AFTER TAKEOFF
  qat1: ["Gear ---------- AS REQUIRED", "\u200BAltitude", "\u200Bvsi"],
  qat2: ["Flaps ---------- UP", "\u200Bairspeed", "\u200BGea\u200Br Light", "\u200BGear"],

  // CLIMB (PASSING 10,000 FEET)
  qclimb1: ["concentration", "Flow I"],
  qclimb2: ["DEFOG switch ---------- AS REQUIRED"],
  qclimb3: ["Vent control lever ---------- AS REQUIRED"],
  qclimb4: ["P\u200Bressurization system ---------- CHECK"],

  // OPERATIONS CHECK
  qoc1: ["Hyd press"],
  qoc2: ["Volts"],
  qoc3: ["Fuel quantity/balance ---------- CHECK"],
  qoc4: ["Flow I"],
  qoc5: ["Engine instruments ---------- CHECK"],
  qoc6: ["P\u200Bressurization ---------- CHECK"],

  // PRE-STALL, SPIN, AND AEROBATIC CHECKS
  qpssa1: ["Loose items ---------- STOWED"],
  qpssa2: ["Engine instruments ---------- CHECKED"],
  qpssa3: ["Fuel b\u200Balance ---------- CHECK LESS THAN 50 POUNDS"],

  // DESCENT
  qdesc1: ["PFD ---------- CHECK", "BFI"],
  qdesc2: ["Altimeters ---------- SET", "altimete2r"],
  qdesc3: ["MASTER ARM switch ---------- AS REQUIRED"],
  qdesc4: ["DEFOG switch ---------- AS REQUIRED"],
  qdesc5: ["Vent control lever ---------- AS REQUIRED"],

  // BEFORE LANDING
  qbl1: ["DEFOG switch ---------- OFF"],
  qbl2: ["Engine instruments ---------- CHECK"],
  qbl3: ["Gear ---------- DOWN", "Gea\u200Br Light"],
  qbl4: ["Brakes ---------- CHECK, AS REQUIRED"],
  qbl5: ["FLAPS ---------- AS REQUIRED", "Flap Indicator"],
  qbl6: ["Speed brake ---------- RETRACTED","\u200BEICAS", "\u200BPCL"],

  // FULL STOP/TAXI BACK CHECKLIST
  qfstb1: ["PROBES ANTI-ICE switch ---------- OFF"],
  qfstb2: ["Flaps ---------- TO", "Flap Indicator"],
  qfstb3: ["Tri\u200Bm indicator"],
  qfstb4: ["Transponder ---------- AS REQUIRED"],
  qfstb5: ["Fuel quantity and balance ---------- CHECK"],
  qfstb6: ["Engine instruments ---------- CHECK"],
  qfstb7: ["DEFOG switch ---------- OFF"],
  qfstb8: ["TORQUE"],
  qfstb9: ["landing/", "taxi light", "anti-coll light", "nav light"],
  qfstb10: ["Transponder ---------- AS REQUIRED"],
  qfstb11: ["PROBES ANTI-ICE switch ---------- ON"],
  qfstb12: ["Nose wheel steering ---------- OFF"],
  qfstb13: ["EICAS display ---------- CHECK"],

  // AFTER LANDING
  qal1: ["ISS mode selector ---------- SOLO OR CMD FWD"],
  qal2: ["Seat safety pin ---------- INSTALL"],
  qal3: ["PROBES ANTI-ICE switch ---------- OFF", "EICAS", "Master Caution"],
  qal4: ["Flaps ---------- UP", "Flap Indicator"],
  qal5: ["T\u200Brim interrupt button ---------- DEPRESS", "EICAS" ,"tri\u200Bm aid"],
  qal6: ["Tri\u200Bm indicator"],
  qal7: ["Transponder ---------- AS REQUIRED"],
  qal8: ["TCAS ---------- STBY"],
  qal9: ["BLEED AIR INFLOW switch ---------- OFF"],

  // ENGINE SHUTDOWN
  qesd1: ["PARKING BRAKE ---------- SET"],
  qesd2: ["landing/", "taxi light"],
  qesd3: ["Transponder ---------- AS REQUIRED"],
  qesd4: ["AVIONICS MASTER switch ---------- OFF"],
  qesd5: ["RAM AIR FLOW switch ---------- OFF"],
  qesd6: ["AIR COND switch ---------- OFF"],
  qesd7: ["EVAP BLWR control ---------- OFF"],
  qesd8: ["Oxyg\u200Ben mask ---------- REMOVE"],
  qesd9: ["OBOGS  ---------- OFF", "\u200Bsupply", "\u200BOBOGS pressure", '\u200Bconcentration'],
  qesd10: ["PCL ---------- IDLE >60 SECONDS, THEN OFF", "\u200BITT", "\u200BN1", "\u200BFuel Flow"],
  qesd11: ["CANOPY ---------- OPEN (AS REQUIRED)"],
  qesd12: ["EICAS"],
  qesd13: ["FD\u200BR light ---------- EXTINGUISHED"],
  qesd14: ["Gust lock ---------- ENGAGE (AS REQUIRED)"],
  qesd15: ["Interior/exterior lights ---------- OFF", "\u200Blanding/", "\u200Btaxi light", "\u200Banti-coll light", "\u200Bnav light", '\u200BfloodLight', '\u200BsideLight', '\u200BinstLight'],
  qesd16: ['BAT\u200B, ', 'GEN, ', 'AND AUX BAT SWITCHES - OFF']

  // // BEFORE LEAVING AIRCRAFT
  // qbla1: ["CFS handle safety pins ---------- INSTALL"],
  // qbla2: ["DTS/DVR cartridge ---------- REMOVE (AS REQUIRED)"],
  // qbla3: ["ISS mode selector ---------- SOLO"],
  // qbla4: ["Oxyg\u200Ben hose and communication cord ---------- STOW WITH LOOP FORWARD"],
  // qbla5: ["HUD combiner cover ---------- INSTALL"],
  // qbla6: ["Wheel chocks ---------- INSTALL (AS REQUIRED)"],
  // qbla7: ["PARKING BRAKE ---------- AS REQUIRED"],
  // qbla8: ["Canopy ---------- CLOSED (AS REQUIRED)", "EICAS"],
  // qbla9: ["Exterior walk-around inspection ---------- VISUALLY CHECK"]
};

export const QUAD_LENGTHS = [37, 8, 9, 5, 37, 2, 7, 11, 5, 2, 4, 6, 3, 5, 6, 13, 9, 16]; //,9

export const QUAD_TITLES = [
  "COCKPIT (ALL FLIGHTS)",
  "HIGH IOAT AT START (>80° C)",
  "ENGINE START (AUTO)",
  "MOTORING RUN PROCEDURE",
  "BEFORE TAXI",
  "TAXI",
  "OVERSPEED GOVERNOR CHECK",
  "BEFORE TAKEOFF",
  "LINEUP CHECK",
  "AFTER TAKEOFF",
  "CLIMB (PASSING 10,000 FEET)",
  "OPERATIONS CHECK",
  "PRE-STALL, SPIN, AND AEROBATIC CHECKS",
  "DESCENT",
  "BEFORE LANDING",
  "FULL STOP/TAXI BACK CHECKLIST",
  "AFTER LANDING",
  "ENGINE SHUTDOWN"
];

// Helper function to generate action bubbles
const createActionBubbles = (bubbles, fontSizer = '11px') => (
  <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '100%'}}>
    {bubbles.map((bubble, idx) => (
      <div key={idx} style={{border: '2px solid #333', borderRadius: '12px', padding: '8px', backgroundColor: '#fff'}}>
        <div style={{fontSize: fontSizer, lineHeight: '1.4'}}>
          {Array.isArray(bubble) ? bubble.map((item, i) => {
            if (typeof item === 'string') {
              return <div key={i}>{item}</div>;
            } else if (item.bold) {
              return <div key={i} style={{fontWeight: 'bold', ...(item.center && {textAlign: 'center'})}}>{item.text}</div>;
            } else if (item.italic) {
              return <div key={i} style={{fontStyle: 'italic', ...(item.center && {textAlign: 'center'})}}>{item.text}</div>;
            } else if (item.highlight) {
              return <div key={i} style={{...(item.center && {textAlign: 'center'})}}><span style={{fontStyle: 'italic', backgroundColor: 'yellow'}}>{item.text}</span></div>;
            } else if (item.underline) {
              return <div key={i} style={{textDecoration: 'underline', ...(item.center && {textAlign: 'center'})}}>{item.text}</div>;
            }  else if (item.space) {
              return <div key={i} style={{height: '1em'}}></div>;
            } else if (item.text) {
              return <div key={i} style={{...(item.center && {textAlign: 'center'})}}>{item.text}</div>;
            }
            return null;
          }) : bubble}
        </div>
      </div>
    ))}
  </div>
);

// Reusable action content
const audioTestAction = createActionBubbles([
  [{text: 'Conduct checks c. thru g. and give one voice reponse at the end.', center: true},
  {text: 'Allow tones to silence before next challenge.', center: true}],
  [{text: 'Confirm altitude aural words.'}, {text: 'Confirm gear aural tone.'}, {text: 'Confirm over speed aural tone.'}, {text: 'Confirm over-g aural tone.'}, {text: 'Confirm bingo aural tone.'}],
  [{bold: true, text:'"Test"', center: true}]
]);

export const QUAD_ACTIONS = {
  // 0. COCKPIT (ALL FLIGHTS)
  qco1: createActionBubbles([
    [{text:"Leg Garters, Lower Koch Fittings, Upper Koch Fittings, Anti-G Hose, 2 Oxygen Connections (1 Main, 1 Emergency), Helmet (Visor Down: Aircraft Only), ICS Cord, Chin Strap Connected. Gloves on."},
    {space: true}, {text: 'With parachute risers connected, lean forward to full extension of inertia reel straps and then sit back. If inertia reel straps do not fully retract (i.e. if the straps leave any slack), or if binding occurs, notify maintenance prior to flight.'}],
    [{bold: true, text: '"Complete"', center: true}, {space: true}, {highlight: true, text: '"Complete"', center: true}]
  ]),
  qco2: createActionBubbles([
    ["Check and report Battery Voltage.", {italic: true, text: "(Note: If rear cockpit turned Battery on first, take control by turning front cockpit Battery switch to On.)"}],
    [{bold: true, text: '"On. ____ Volts"', center: true}]
  ]),
  qco3: createActionBubbles([
    "Check Anti-Suffocation Valve by breathing into the oxygen mask. If valve is functioning properly, it will be possible to breathe through when you inhale deeply.",
    [{bold: true, text: '"Checked"', center: true}, {space: true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qco4: createActionBubbles([
    [{text:"Give connect signal to lineman."}, {space: true}, {text: 'GPU required if battery voltage is <23.5V.'}, {bold: true, text: 'DO NOT connect GPU If Battery <22.0V.'}, 
    {text: 'Give lineman a thumbs up signal once GPU voltage is indicated on the EICAS Display. If a lineman is not immediately available, continue with the checklist at instructor\'s discretion.'}],
    [{bold: true, text: '"Connected, _____ Volts"', center: true}, {space: true}, {text:'If conducting battery start:', center: true}, {bold: true, text: '"Not Required"', center: true}]
  ]),
  qco5: createActionBubbles([
    [{text:"Check to ensure the area between seat and side panels is free of obstructions prior to adjusting the seat. Ensure seat height allows a clear view of all displays."}, 
    {text: 'In the aircraft, use the HUD horizon line (purple line) as a reference on the horizon.'}],
    [{bold: true, text: '"Adjusted"', center: true}]
  ]),
  qco6: createActionBubbles([
    "Adjust the rudder pedals so that you can reach the rudder stops without locking your knee. If required, use the snubbers located under the seat to lengthen the blue leg restraint garters to allow for full rudder throw. Your heels will be on the deck and only toe pressure is used on the lower part of the rudder pedal. Heels will come off the deck only when applying brake pressure. Do not apply pressure to the rudder pedals when adjusting.",
    [{bold: true, text: '"Adjusted"', center: true}]
  ]),
  qco7: createActionBubbles([
    [{text:"Ensure all ground personnel and other cockpit are clear of flight controls and control surfaces. Visually check for free and correct movement.", underline: true},
    {text: 'Verify full control range is available at selected seat height. Move the stick left, right, forward, and aft while confirming the aileron and elevator movements are correct. Then rotate (sweep) the controls in a circular motion to ensure there is no binding. Check the rudder by gently applying full rudder in each direction. You will need to look over your left muster to confirm proper operation of the elevator and rudder.'},
    {text: 'Rear cockpit will perform same checks as front cockpit.', center: true}],
    [{bold: true, text: '"Clear"', center: true}, {text:'Conduct checks and report:', italic: true, center: true}, {bold: true, text: '"Free and Correct"', center: true}, {space: true}, {text:'Perform three-way change of controls', italic:true, center: true}, 
    {space: true}, {highlight: true, text: '"Clear"', center: true}, {text:'Conduct checks and report:', italic: true, center: true}, {highlight: true, text: '"Free and Correct"', center: true}, {space: true}, {text:'Perform three-way change of controls', italic:true, center: true}]
  ]),
  qco8: createActionBubbles([
    [{text:"Check that both bulbs in the upper half of the Fire Light illuminate, master warning and audio activate. Cancel master warning indication."}, 
    {text: "Check that both bulbs in the lower half of the Fire Light illuminate, master warning and audio activate. Cancel master warning indication."}],
    [{bold: true, text: '"Test One"', center: true}, {highlight: true, text: '"Test One"', center: true}, {space: true}, {bold: true, text: '"Test Two"', center: true}, {highlight: true, text: '"Test Two"', center: true}]
  ]),
  qco9: createActionBubbles([
    [{text:"Activate the lamp test in the front cockpit. Check for FDR lights [front cockpit only], red gear handle, red and green gear position lights, gear door lights, MASTER WARN and MASTER CAUT (cancel master warning and caution indications), Fire lights, COM1 and COM2 transmit illuminate, and LAMP TEST on EICAS then report…"},
    {text: '(Memory Aid: 3-7-3-2-1)'}, {text: 'Rear cockpit will perform the same and report...'}],
    [{bold: true, text: '"Checked"', center: true}, {space: true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qco10: createActionBubbles([
    "Check Flap Handle and indicator UP – if flaps are in the Takeoff (TO) or Landing (LDG) position, ensure the lineman and other pilot are aware as the flaps will move once the engine start is initiated.",
    [{bold: true, text: '"Up"', center: true}]
  ]),
  qco11: createActionBubbles([
    "Check all four toggle switches are Off.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco12: createActionBubbles([
    "Check switch to NORM in both cockpits.",
    [{bold: true, text: '"Norm"', center: true}, {highlight: true, text: '"Norm"', center: true}]
  ]),
  qco13: createActionBubbles([
    ["Flood, side and instrument lights as required", {italic: true, text: '(Note: Sim events require most lights to be on).'}],
    [{bold: true, text: '"Set"', center: true}]
  ]),
  qco14: createActionBubbles([
    "Check switch is Off.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco15: createActionBubbles([
    [{text:"Move Aileron Trim left, then right returning trim indicator back to green."}, {space: true}, 
    {text: "Move Elevator Trim up then down returning trim indicator back to green."},  {space: true},
    {text: "Move Rudder Trim right, then left leaving the indicator to the left of the green at approximately the 12 o'clock position. (This is a setup to check TAD operation in the Before Taxi checklist)."}],
    [{bold: true, text: '"Checked"', center: true}, {space: true}, {text:'Rear Cockpit will also check trim and report:', center: true},  {space: true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qco16: createActionBubbles([
    "Ensure full forward (in).",
    [{bold: true, text: '"Check Stowed"', center: true}]
  ]),
  qco17: createActionBubbles([
    "Ensure the digital clock is in either the correct Local Time or Elapsed Time function as required. Time is set using UFCP CLK button.",
    [{bold: true, text: '"Set"', center: true}]
  ]),
  qco18: createActionBubbles([
    [{text: "Check Switches in appropriate position."}, {space: true}, {text: "HUD TEXT/FPM UNCAGE/CAGE: Check CAGE."}, {space: true}, {text: "LGT NIGHT/DAY/AUTO HUD: Check AUTO HUD."}, {space: true}, 
    {text: "MFD/UFCP REPEAT NORM: Check NORM."}, {space: true}, {text: "LGT-HUD: As Required."}, {space: true}, {text: "LGT-UFCP: As Required."}, {italic: true, text: '(All switches in the DOWN position).'}],
    [{bold: true, text: '"Set"', center: true}]
  ]),
  qco19: createActionBubbles([
    [{text: "Check VOX button is out and turn to the one o'clock position, COM1 and COM2 buttons must be at the 12 o'clock position. Ensure that DME, NAV and MKR switches are IN and EMR/NRM toggle switch is set to NRM. Adjust interphone and headphone volume as desired."},
    {text: "The one o'clock position is a good starting point for audio controls."}],
    [{bold: true, text: '"Set"', center: true}]
  ]),
  qco20: createActionBubbles([
    "Check Defog switch OFF.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco21: createActionBubbles([
    "Check ELT switch ARM.",
    [{bold: true, text: '"Arm"', center: true}]
  ]),
  qco22: createActionBubbles([
    [{text:"Reset parking brake by releasing the parking brake handle then smoothly pump brakes several times. While holding pressure, set the parking brake by pulling and turning the parking brake lever 90º clockwise. This will prevent the aircraft from creeping forward on engine startup."},
    {bold: true, text: "Do not touch the parking brake handle shaft when actuating or releasing the parking brake as injury may occur."}],
    [{bold: true, text: '"Reset"', center: true}]
  ]),
  qco23: createActionBubbles([
    [{text: "Give the lineman the signal to remove the wheel chocks. Ensure that you are holding the brakes prior to the lineman removing the chocks."},
    {italic: true, text: "Keep hands above the canopy rail while lineman is under the aircraft."},
    {text: "If a lineman is not immediately available, continue with the checklist at the discretion of the instructor."}],
    [{bold: true, text: '"Removed"', center: true}]
  ]),
  qco24: createActionBubbles([
    "Check Generator switch OFF.",
    [{bold: true, text: '"Off"', center: true},   {highlight: true, text: '"Off"', center: true}]
  ]),
  qco25: createActionBubbles([
    "Check Fuel Balance switch AUTO.",
    [{bold: true, text: '"Auto"', center: true}]
  ]),
  qco26: createActionBubbles([
    "Check Manual Fuel Balance switch OFF.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco27: createActionBubbles([
    "Check Avionics Master switch OFF.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco28: createActionBubbles([
    "Check Bus Tie switch NORM.",
    [{bold: true, text: '"Norm"', center: true}]
  ]),
  qco29: createActionBubbles([
    [{text: "Turn switch ON, check ANTI-ICE advisory message on EICAS illuminates and amperage draw increases. Check that the L PHT and R PHT caution messages extinguish."},
     {text: "Turn switch OFF, check for the ANTI-ICE advisory message to extinguish and the L PHT and R PHT caution messages illuminate with associated decrease in amperage draw."}],
    [{bold: true, text: '"Checked, Off"', center: true}]
  ]),
  qco30: createActionBubbles([
    [{text: "Turn switch ON. Check BOOST PUMP advisory message illuminates and amperage draw increases."},
    {text: "Turn switch to the ARM position and check for advisory message to extinguish and decrease in amperage draw."}],
    [{bold: true, text: '"Checked, Arm"', center: true}]
  ]),
  qco31: createActionBubbles([
    "Check switch lever locked to NORM.",
    [{bold: true, text: '"Norm"', center: true}]
  ]),
  qco32: createActionBubbles([
    "Check the Evaporator Blower switch position. Keep OFF for battery starts.",
    [{bold: true, text: '"Off" or "On"', center: true},   {text:'(as required)', center: true}]
  ]),
  qco33: createActionBubbles([
    "Check the Air Conditioner switch OFF.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco34: createActionBubbles([
    "Check Bleed Air Inflow switch OFF.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco35: createActionBubbles([
    ["Check in guarded position.", {text: 'Note: If guard is in down position, switch is in NORM.'}], 
    [{bold: true, text: '"Norm"', center: true}]
  ]),
  qco36: createActionBubbles([
    "Check Ram Air Flow switch OFF.",
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qco37: createActionBubbles([
    "Check Temp Control dial in AUTO. (AUTO is a range from approximately the eight o'clock (COLD) through the four o'clock (HOT) position.)",
    [{bold: true, text: '"Auto"', center: true}]
  ]),
  
  // 2. ENGINE START (AUTO)
  qestart1: createActionBubbles([
    [{text:'a. Front cockpit crew member will check that both left and right canopy rail are clear of items (checklists, kneeboards, etc.) and that the canopy handle is in the open position then RESPOND….'},
    {text: 'Rear cockpit crew member will check both rails clear, then RESPOND….'},
    {text: 'b. Pull canopy lock release handle and hold, then pull canopy over center and release canopy lock release handle.'},
    {text: 'c. Ensure internal canopy handle is rotated to the full OPEN (aft) position and slowly lower canopy rail to canopy sill.'},
    {text: 'd. Rotate internal canopy handle forward with a slow steady motion until resistance is felt in lock mechanism (approximately ¾ ways forward).'},
    {text: 'e. Reverse direction just until pressure is relieved (approximately ½ ways back), then continue to rotate internal canopy handle forward to the LATCHED position.'},
    {text: 'f. Check proper engagement of canopy hooks by lifting lock release lever.'},
    {text: 'g. Ensure canopy light and Master Warning illuminate and internal canopy handle does not independently rotate aft.'},
    {text: 'h. Release lock release lever and extinguish Master Warning. Make sure canopy light extinguishes.'},
    {text: 'i. Check canopy lock by gently attempting to rotate internal canopy handle aft. When properly locked, internal canopy handle cannot be rotated aft without raising lock release lever. Verify mechanical green indicators visible.'},
    {text: 'j. Ensure minimum adequate canopy/helmet clearance by placing a closed fist on top of your helmet when adjusting seat height. Excessive seat height (helmet above canopy breakers) can result in fatal injury upon ejection.'}],
    [{bold: true, text: '"Rail clear"', center: true}, {highlight: true, text: '"Rail clear"', center: true}]
  ],'9px'),
  qestart2: createActionBubbles([
    "Turn navigation and anti-collision lights ON (anti-collision lights remain off at night until execution of the lineup checklist).",
    [{bold: true, text: '"On"', center: true}]
  ]),
  qestart3: createActionBubbles([
    "Check PMU fail warning and status caution messages are extinguished. If not, reset PMU by turning PMU to OFF then back to NORM.",
    [{bold: true, text: '"Extinguished"', center: true}]
  ]),
  qestart4: createActionBubbles([
    [{text: 'a. Smoothly advance to Start Ready position and ensure the ST READY advisory message remains illuminated for three seconds. If message goes out, do not start. Pull PCL back to cutoff and repeat step.'},
    {text: 'b. Once ST READY advisory message illuminates, hover hand above PCL (prevents inadvertent movement, but in position to abort start if required).', underline: true}],
    [{bold: true, text: '"Advance to start position"', center: true}]
  ]),
  qestart5: createActionBubbles([
    "Clear the area left, right, and forward of the propeller and then signal the lineman with the start signal. The lineman will act as fire watch.",
    [{bold: true, text: '"Clear"', center: true}]
  ]),
  qestart6: createActionBubbles([
    "Move starter switch to the AUTO/RESET position and release.",
    [{bold: true, text: '"Auto / Reset"', center: true}]
  ]),
  qestart7: createActionBubbles([
    [{text:'Monitor engine instruments for normal indications and the lineman during the start. Hydraulic pressure must climb to the normal range followed by N1 rotation. Indication of Fuel Flow must follow, with light-off occurring shortly thereafter. Call out \"Light-off\" with initial rise of ITT. ITT must rise steadily, peaking twice. Oil pressure will rise as well and N1 will accelerate to 60-61%. Call out \"N1 60%\" as appropriate. Ensure ST READY advisory message remains illuminated throughout.'},
    {italic: true, text: 'Note: ST READY message will change position on the EICAS during start.'}],
    [{bold: true, text: '"Light-off..."', center: true}, {space: true}, {bold: true, text: '"ITT; N1; ST READY; Lineman"', center: true}, {text:'(Repeat until N1 60%)', center: true}, {space: true}, {bold: true, text: '"N1 60%"', center: true}]
  ]),
  qestart8: createActionBubbles([
    [{text:'Upon N1 reaching 60%, advance PCL forward past idle stop (verify travel past idle by hearing two audible clicks) and retard PCL to idle stop.'},
    {italic: true, text: '(Note: Simulator only has one click passing idle gate).'}], 
    [{bold: true, text: '"Two clicks, Idle, Max ITT ______"', center: true}]
  ]),
  qestart9: createActionBubbles([
    [{text:"If used, signal lineman to disconnect external power. The voltage will drop when the external power unit is turned off. External power is not disconnected until the plane captain has disconnected the external power cord and has pulled it clear of the aircraft."},
    {space: true}, {bold: true, text: 'Keep hands above canopy rail and eyes on the lineman (use mirror as necessary) until clear.', center: true}],
    [{bold: true, text: '"Disconnected"', center: true}]
  ]),

  // 4. Before Taxi
  qas1: createActionBubbles([
    "Turn Generator switch ON and check GEN warning message is extinguished, 27 volts or greater and positive amps. Aft cockpit switch remains OFF.",
    [{bold: true, text: '"On"', center: true}]
  ]),
  qas2: createActionBubbles([
    "Set Aux Battery switch to ON.",
    [{bold: true, text: '"On"', center: true}]
  ]),
  qas3: createActionBubbles([
    "Set Bleed Air Inflow switch to NORM.",
    [{bold: true, text: '"Norm"', center: true}]
  ]),
  qas4: createActionBubbles([
    "Set Evaporator Blower rheostat to desired flow setting.",
    [{bold: true, text: '"On" or "Off"', center: true}, {text:'(As required)', center: true}]
  ]),
  qas5: createActionBubbles([
    "Set AIR COND switch to desired position and then select desired Temp Control setting.",
    [{bold: true, text: '"On" or "Off"', center: true}, {text:'(As required)', center: true}]
  ]),
  qas6: createActionBubbles([
    "Wait approximately 10 seconds after GEN switch ON before turning the Avionics Master switch ON. This will allow battery amperage to stabilize. Turn Avionics Master switch ON.",
    [{bold: true, text: '"On"', center: true}]
  ]),
  qas7: createActionBubbles([
    "Turn Green Supply Lever to the ON position.",
    [{bold: true, text: '"On"', center: true}]
  ]),
  qas8: createActionBubbles([
    "Don oxygen mask on and adjust as necessary",
    [{bold: true, text: '"On and secure"', center: true}, {highlight: true, text: '"On and secure"', center: true}]
  ]),
  qas9: createActionBubbles([
    [{text:'Turn white Concentration Lever to MAX (check for green light on) and then back to NORMAL. Set red lever to EMERGENCY and check for continuous positive pressure. Set lever back to NORMAL. Check for good blinker operation while taking several breaths with the pressure lever in the Normal position (when you take a breath, the white blinker will appear).'},
    {italic: true, text: '(Note: Blinker does not operate in the UTD/OFT).'}],
    [{bold: true, text: '"Normal, Normal, Good Blinker"', center: true},   {space: true},   {highlight: true, text: '"On, Normal, Normal, Good Blinker"', center: true}]
  ]),
  qas10: createActionBubbles([
    [{text: 'Depress the Anti G-Test switch and verify inflation of the G-Suit. The G-Suit must deflate when the test switch is released.'},
    {italic: true, text: '(Note: the G-Suit will not inflate in the simulator).'}], 
    [  {bold: true, text: '"Checked"', center: true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qas11: createActionBubbles([
    [{text: 'Activate the lamp test in the front cockpit. Check for FDR lights [front cockpit only], red gear handle, red and green gear position lights, gear door lights, MASTER WARN and MASTER CAUT (cancel master warning and caution indications), Fire lights, COM1 and COM2 transmit illuminate, and LAMP TEST on EICAS then report….'},
    {space:true}, {text: 'Rear cockpit will perform test and report….'}], 
    [{bold: true, text: '"Checked"', center: true}, {space:true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qas11a: createActionBubbles([
    [{text: 'Activate the lamp test in the front cockpit. Check for FDR lights [front cockpit only], red gear handle, red and green gear position lights, gear door lights, MASTER WARN and MASTER CAUT (cancel master warning and caution indications), Fire lights, COM1 and COM2 transmit illuminate, and LAMP TEST on EICAS then report….'},
    {space:true}, {text: 'Rear cockpit will perform test and report….'}], 
    [{bold: true, text: '"Checked"', center: true}, {space:true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qas11b: createActionBubbles([
    [{text: 'Conduct Low test (10.5 +/- 0.4 units).'}, {text: 'Conduct High test (18.0 +/- 0.4 units).'},
    {italic: true, text: 'Note: Pull the control stick slightly aft (off the forward stop) to prevent stick shaker stress on the control stick push pull rod.'}], 
    [{bold: true, text:'"Amber Donut, ___ units"', center: true}, {bold: true, text:'"Green Chevron, Stick Shaker, ___ units"', center: true}]
  ]),
  qas11c: audioTestAction,
  qas11d: audioTestAction,
  qas11e: audioTestAction,
  qas11f: audioTestAction,
  qas11g: audioTestAction,
  qas12: createActionBubbles([
    [{italic: true, text: 'Note:  Communication between the Aircrew and the Lineman is integral to the successful completion of the Speed Brake and Flap checks.  Remember that neither the Speed Brake nor the Flaps are visible from the cockpit.  To ensure the indicators are indicating correctly, we must rely on signals from the lineman.'},
    {text: "Give Lineman the speed brake signal, indicating that the speed brake is being extended."},
    {space:true}, {text: "Extend Speed Brake; check for advisory message on EICAS and thumbs up from Lineman."}],
    [{bold: true, text: '"Light On"', center: true}, {highlight: true, text: '"Light On"', center: true}]
  ]),
  qas13: createActionBubbles([
    [{italic: true, text: 'Note:  Communication between the Aircrew and the Lineman is integral to the successful completion of the Speed Brake and Flap checks.  Remember that neither the Speed Brake nor the Flaps are visible from the cockpit.  To ensure the indicators are indicating correctly, we must rely on signals from the lineman.'},
    {text: "Give Lineman the Flaps signal. Select flaps to LDG. Check the Flap Indicator for proper indication, thumbs up from the Lineman, and Speed Brake advisory message has extinguished."},
    {text: "Signal lineman for Takeoff Flaps (Flaps signal followed by making a \"T\" with both hands). Position Flaps to T/O and check flap indicator for proper indication as well as a thumbs up signal from the lineman."}, 
    {text: "Attempt to extend the Speed Brake with the Flaps at T/O position. The Speed Brake must remain up. Leave Flaps in the T/O position."},
    {text: "Rear Cockpit follows along with checks conducted and reports…."}],
    [{bold: true, text: '"Landing, Speed Brake Light Out"', center: true}, {space: true}, {bold: true, text: '"Takeoff"', center: true}, {space: true}, {bold: true, text: '"Speed Brake does not extend"', center: true}, {space: true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qas14: createActionBubbles([
    "Turn the TAD ON. The Rudder Trim indicators must move into the green position. The Aileron and Elevator Trim indicators must remain in the green position. The TAD OFF advisory message must extinguish.",
    [{bold: true, text: '"On"', center: true}]
  ]),
  qas15: createActionBubbles([
    "Select Nose Wheel Steering and confirm NWS ON advisory message illuminates on EICAS display.", 
    [{bold: true, text: '"On"', center: true}]
  ]),
  qas16: createActionBubbles([
    "Rotate handle 90º counterclockwise and EASE handle in.",
    [{bold: true, text: '"Released"', center: true}]
  ]),
  qas17: createActionBubbles([
    [{text: "F/C will conduct the first brake check then pass controls to the R/C for the second brake check."}, {space: true},
    {text: "Visually clear the area left, right, and forward of the aircraft then give the lineman the brake release signal. On the lineman's signal, release brakes and advance the PCL slightly (if required) to roll forward. Reapply brakes on the lineman's signal."},
    {space: true}, {text: "Set the parking brake whenever the aircraft is at a complete stop with the engine running."}],
    [{bold: true, text: '"Clear Left, Right and Forward"', center: true}, {italic:true, text:'F/C conducts check and reports:', center: true}, {bold: true, text: '"Checked"', center: true}, {italic: true, text:'Perform three way change of controls', center: true}, {space: true}, 
    {highlight: true, text: '"Clear, Left, Right and Forward"', center: true}, {italic:true, text:'R/C conducts check and reports:', center: true}, 
    {highlight: true, text: '"Checked"', center: true}, {italic:true, text:'Perform three way change of controls', center: true}, {italic:true, text:'(Salute and dismiss Lineman)', center: true}]
  ]),
  qas18: createActionBubbles([
    [{text: "From the NAV page, select the TCAS UFCP via left MFD LSK (R2). After the UFCP TCAS page comes up, turn on TCAS by pushing UFCP button (W1); TCAS will toggle from STBY to ON and report…"},
    {space: true}, {text: "Select NAV display to 10nm range by pressing LSK (R4) for better visual of traffic symbols during test. Press and hold Left MFD LSK (R2) for 1 second and release. Verify TCAS symbols appear on NAV display and aural test 'TAS SYSTEM TEST OK' and report…"}],
    [{bold: true, text: '"On"', center: true}, {space: true}, {bold: true, text: '"Tested"', center: true}]
  ]),
  qas19: createActionBubbles([
    [{text: "Center MFD set to PFD display mode. Right MFD set to EICAS display mode."}, {space: true},
    {text: "On left MFD, select menu, select INIT REF LSK (R6), select IDENT LSK (L1) and confirm FMS database date is current."}, {space: true},
    {text: "Select POS IDENT LSK (R6). Page 1 is used to cross check FMS GEO position with airfield GEO position. Ensure proper airfield is used as reference. Page 3 is used to confirm INS GEO position is aligned with FMS GEO position."}, {space: true},
    {text: "Select SETUP and disable SUA."}, {space: true},
    {text: "Acknowledge and clear all messages in the NAV page and FMS scratchpad."}],
    [{bold: true, text: '"Checked"', center: true}]
  ]),

  qas19a: createActionBubbles([
    [{text: "Center MFD set to PFD display mode. Right MFD set to EICAS display mode."}, {space: true},
    {text: "On left MFD, select menu, select INIT REF LSK (R6), select IDENT LSK (L1) and confirm FMS database date is current."}, {space: true},
    {text: "Select POS IDENT LSK (R6). Page 1 is used to cross check FMS GEO position with airfield GEO position. Ensure proper airfield is used as reference. Page 3 is used to confirm INS GEO position is aligned with FMS GEO position."}, {space: true},
    {text: "Select SETUP and disable SUA."}, {space: true},
    {text: "Acknowledge and clear all messages in the NAV page and FMS scratchpad."}],
    [{bold: true, text: '"Checked"', center: true}]
  ]),

  qas19b: createActionBubbles([
    [{text: "Inform IP you're switching (CH 1 UHF), copy ATIS and verify information is current within 1 hour of present time. Ensure Audio Panel COM1 button is out and adjust volume as required."},
    {text: "If your flight profile requires a clearance, inform IP you're switching Clearance (CH 2 UHF)"},
    {text: "Call Navy Corpus Clearance Delivery and put your flight plan clearance on request (Sample clearance call for the ZOMBIE1 flight plan (VFR to KINGS4 MOA))."},
    {text: "Clearance Delivery will provide clearance and transponder code (squawk). You are required to read back clearance and squawk. Sample read back is for ZOMBIE1 flight plan flight following."},
    {text: "Clearance Delivery will verify your read-back is correct."},
    {text: "If Clearance Delivery is not ready to provide your clearance and transponder code, attempt to pick up your clearance after completing the Before Takeoff Checklist."},
    {text: "Once complete with Clearance Delivery or if departing VFR without a clearance, inform IP you're switching to CH 3."}],
    [{bold: true, text: '"Switching ATIS"', center: true},
    {bold: true, text: '"Switching Clearance"', center: true},
    {bold:true, text: 'AC: "Clearance Delivery, (call sign), Zombie ONE on request, ready to copy"', center: true},
    {text: 'CLR: "(Call sign), for VFR flight following squawk XXXX"', center: true},
    {bold:true, text: 'AC: "(call sign), squawk XXXX"', center: true},
    {text: 'CLR: "(call sign), read-back correct"', center: true},
    {bold: true, text: '"Switching Channel 3"', center: true}]
  ], '10px'),

  qas19c: createActionBubbles([
    [{text: "Set to desired frequency. Typically, KNGP Ground CH 3 will be set or at IP discretion."}],
    [{bold: true, text: '"Set"', center: true}]
  ]),

  qas19d: createActionBubbles([
    [{text: "Set to desired frequency. Typically, CH 1 (114.0), the NGP VOR will be set."}],
    [{bold: true, text: '"Set"', center: true}]
  ]),

  qas19e: createActionBubbles([
    [{text: 'Set appropriate code from flight clearance or IAW AC ID number via UFCP (W4) key and ensure the transponder is set to "STBY."'}, {space: true},
    {text: '(AC IDs beginning with "7XX" will set "55XX" and "8XX" will set "56XX")'}, {space: true},
    {text: "Set appropriate FLT No. corresponding to your ACID into the FMS Route page (BOMRXXX)"}],
    [{bold: true, text: '"XXXX, Standby"', center: true}, {space: true},
    {bold: true, text: '"Flight Number Set"', center: true}]
  ]),

  qas19f: createActionBubbles([
    [{text: "This is a minimum recommended setup for a typical Contact flight. Subsequent setup will be dictated by type of sortie being flown."}, {space: true},
    {text: "- Load Route appropriate for the flight. Default flight plan KING4MOA."}, 
    {text: "- Left MFD set to NAV or TSD with range of 10NM"},
    {text: "- PFD source set to VOR."},
    {text: "- Bearing pointer #1 (green) set to VOR."},
    {text: "- CDI course set to runway heading."},
    {text: "- Heading bug set to departure heading."},
    {text: "- Bearing pointer #2 (cyan) set to FMS."}],
    [{bold: true, text: '"Set"', center: true}]
  ]),

  qas19g: createActionBubbles([
    [{text: "Zero the G meter and turn on numerical G read out."}, {space: true},
    {text: "Set fuel flags (Joker/Bingo) as briefed."}, {space: true},
    {text: "Set altitude to first expected level off."}, {space: true},
    {text: "Set speed bug as required."}],
    [{bold: true, text: '"Set"', center: true}]
  ]),

  qas20: createActionBubbles([
    [{text: "Check pitch, roll and heading indications, and no red X's. (A failed display will appear as a red X. Report any abnormal indication)."}],
    [{bold: true, text: '"Checked"', center: true}, {space: true}, {highlight: true, text: '"Checked"', center: true}]
  ]),

  qas21: createActionBubbles([
    [{text: "Set the local altimeter in the PFD and the BFI in both cockpits. Check to ensure the altimeter readouts are within 75' of local field elevation and within 75' of each other."}],
    [{bold: true, text: '"____ set and checked twice"', center: true}, {space: true}, {highlight: true, text: '"____set and checked twice"', center: true}]
  ]),

  qas22: createActionBubbles([
    [{text: "Check to ensure the Master Warning and Caution Lights are extinguished and EICAS Display is clear of all malfunctions."},
    {underline:true, text: "Verbalize any Warning, Caution, or Advisory messages. You must only have L PHT and R PHT INOP cautions and NWS ON."}],
    [{bold: true, text: '"(Report what is displayed), Checked"', center: true}, {space: true}, {highlight: true, text: '"(Report what is displayed), Checked"', center: true}]
  ]),

  qas23: createActionBubbles([
    [{text: "Turn Landing and Taxi Lights ON."}],
    [{bold: true, text: '"On"', center: true}]
  ]),

  // 5. TAXI
  qtaxi1: createActionBubbles([
    "At KNGP, verify Transponder is STBY. Set as required at other airfields.",
    [{bold: true, text: '"Standby"', center: true}]
  ]),
  qtaxi2: createActionBubbles([
    "Once clear of the line area and other aircraft, verify heading on the HSI and BFI, and confirm that the Side Slip, and Rate of Turn Indicators track appropriately during turns. Attempt to use expected turns in the taxi route to accomplish this check.",
    [{bold: true, text: '"Checked"', center: true}]
  ]),

  // 6. OVERSPEED GOVERNOR CHECK
  qogc1: createActionBubbles([
    [{text: "Ensure that you have firm brake pressure prior to the run-up. (Set the parking brake, pump the brakes until firm, but also continue to hold firm brake pressure to ensure the aircraft does not roll forward once the PCL is advanced)."}],
    [{bold: true, text: '"Hold"', center: true}]
  ]),
  qogc2: createActionBubbles([
    [{text: "Verify PCL is at IDLE and N1 is between 60-61%."}],
    [{bold: true, text: '"Idle"', center: true}]
  ]),
  qogc3: createActionBubbles([
    [{text: "Place the PMU switch to OFF. Verify idle N1 stabilizes at or above 60%."}, {space: true},
     {text: "The PMU FAIL and PMU STATUS messages will appear upon turning the PMU Off. Cancel the Master Warning and Caution Lights."}],
    [{bold: true, text: '"Off"', center: true}, {space: true}, {italic: true, text: 'Note: It is acceptable for N1 to make little or no change when turning off the PMU as long as it is within limits.', center: true}]
  ]),
  qogc4: createActionBubbles([
    [{text: "Slowly advance PCL to 100 +/- 2% NP and allow the engine to stabilize."},
    {text: "Verify that the propeller remains in the governed range with the PMU Off and 100 +/- 2%."}, {space: true},
    {bold: true, text: 'WARNING: Advancing the PCL prior to engine stabilization with the PMU OFF or advancing too rapidly may cause high ITT and engine over temperature.'}, {space: true},
    {italic: true, text: 'NOTE: At higher DA, less torque may be required to achieve 100%NP.'}],
    [{bold: true, text: '"100% NP"', center: true}]
  ]),
  qogc5: createActionBubbles([
    [{text: "Advance PCL at least an additional 5% Torque and verify NP remains 100 +/- 2%."}],
    [{bold: true, text: '"Within Limits"', center: true}]
  ]),
  qogc6: createActionBubbles([
    [{text: "Reduce PCL to Idle. Verify idle N1 stabilizes at 60% or above."}],
    [{bold: true, text: '"Idle"', center: true}]
  ]),
  qogc7: createActionBubbles([
    [{text: "Place the PMU switch to NORM. Verify PMU FAIL and PMU STATUS messages extinguish, NP returns to 46–50%, N1 returns to 60-61%."}],
    [{bold: true, text: '"Norm"', center: true}]
  ]),

  // 7. BEFORE TAKEOFF
  qbto1: createActionBubbles([
    [{text: "Compute minimum power for takeoff (Torque) using the appropriate chart in the PCL or Quad-Fold checklist."}],
    [{bold: true, text: '"100%"', center: true}, {text:'(Or whatever the chart indicates for the present IOAT reading and pressure altitude)', center: true}]
  ]),
  qbto2: createActionBubbles([
    [{text: "Ensure Speed Brake is retracted."}],
    [{bold: true, text: '"Retracted"', center: true}]
  ]),
  qbto3: createActionBubbles([
    [{text: "Ensure Flaps are set to Takeoff."}],
    [{bold: true, text: '"Takeoff"', center: true}]
  ]),
  qbto4: createActionBubbles([
    [{text: "Ensure Trim Indicators are all showing in their respective green ranges."}],
    [{bold: true, text: '"Set for Takeoff"', center: true}]
  ]),
  qbto5: createActionBubbles([
    [{text: "Check Fuel Quantity Totalizer. Verify fuel load is balanced and no FUEL BAL message is present on EICAS."}],
    [{bold: true, text: '"___ lbs, balanced"', center: true}]
  ]),
  qbto6: createActionBubbles([
    [{text: "Check all engine instruments on the EICAS Display are within normal operating limits."}],
    [{bold: true, text: '"Checked"', center: true}]
  ]),
  qbto7: createActionBubbles([
    [{text: "Not used at this time."}],
    [{bold: true, text: '"Not Required"', center: true}]
  ]),
  qbto8: createActionBubbles([
    [{text: "Verify 27 volts or greater and +50 amps or less."}],
    [{bold: true, text: '"____Volts, ___ Amps"', center: true}]
  ]),
  qbto9: createActionBubbles([
    [{text: "Check Defog Switch off."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qbto10: createActionBubbles([
    [{text: "Prior to pulling the Ejection Seat Safety Pin, verify that upper Koch fittings, lower Koch fittings and leg restraint garters are attached correctly. Ensure the pin safety streamer is free and clear of the ejection seat handle."}, {space: true},
    {text: 'With the "two-hand method" (one hand on the streamer and one on the pin) remove the Seat Safety Pin and stow in the canopy locking handle.'}, {space: true},
    {text: "If a Seat Safety Pin is dropped, refer to the IFG."}],
    [{bold: true, text: '"Attached six points, removed and stowed"', center: true}, {space: true}, {highlight: true, text: '"Attached six points, removed and stowed"', center: true}]
  ]),
  qbto11: createActionBubbles([
    [{text: "Verify ISS Mode Selector lever is locked in the desired detent. (Rear cockpit will position ISS to desired detent and report.)"}],
    [{highlight: true, text: '"Solo" or "Both"', center: true}, {highlight: true, text:'(As required)', center: true}, {space: true}, {bold: true, text: '"Roger Solo" or "Roger Both"', center: true}, {bold: true, text:'(As required)', center: true}]
  ]),

  // 8. LINEUP CHECK
  qlc1: createActionBubbles([
    [{text: "Ensure both Landing and Taxi Lights are ON. Turn ON anti-collision lights if they were off (night ops)."}],
    [{bold: true, text: '"On"', center: true}]
  ]),
  qlc2: createActionBubbles([
    [{text: "Select (W4) key on the UFCP. Use (W1) key to toggle from XPDRSBY (STANDBY) to XPDRACT (ACTIVE)."},
    {text: "Check W3 line to ensure ALT ON mode is engaged."}, {space: true}, {text: "Hold the checklist after this step if Tower has only cleared you to"},
    {bold: true, text: "Line up and Wait"}],
    [{bold: true, text: '"Active"', center: true}]
  ]),
  qlc3: createActionBubbles([
    [{text: "Turn ON Probes Anti-Ice switch. Check EICAS Display, ensure ANTI-ICE advisory light illuminates and the L PHT and R PHT messages extinguish."}, {space: true},
    {bold: true, text: 'CAUTION: Prolonged use of pitot and AOA heat while on the ground will damage the pitot and AOA heating elements.'},
    {text: "Hold the checklist after this step until aircraft is aligned on runway centerline and aircraft has been brought to a complete stop."}],
    [{bold: true, text: '"On"', center: true}]
  ]),
  qlc4: createActionBubbles([
    [{text: "Once aligned with runway centerline, roll slightly forward to ensure Nose Wheel is straight, come to a stop using even braking and hold the brakes."}, {space: true},
    {text: "Deactivate Nose Wheel Steering. Verify NWS ON status message on EICAS extinguishes."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qlc5: createActionBubbles([
    [{text: "Check EICAS Display. Verbalize any EICAS WARNING, CAUTION or ADVISORY messages."}],
    [{bold: true, text: '"(Report what is displayed), Checked"', center: true}, {space: true}, {highlight: true, text: '"(Report what is displayed), Checked"', center: true}]
  ]),

  // 9. AFTER TAKEOFF
  qat1: createActionBubbles([
    [{text: "Check for two positive rates of climb indicated on the Altimeter, the VSI or visually."}],
    [{bold: true, text: '"Two positive rates, Gear"', center: true}]
  ]),
  qat2: createActionBubbles([
    [{text: "Verify airspeed is above 110 KIAS and raise the flaps and then report…"},
    {text: "Verify gear position lights and gear handle light have extinguished and the flap indicator indicates up prior to 150 KIAS; then report…"},
    {text: "Rear cockpit verifies proper indications and reports…."}, {space: true},
    {text: "Once safely airborne with the gear and flaps up, comply with local departure procedures."}, {space: true},
    {text: "When directed by Tower, switch departure and check-in (Example for Kings 4 MOA). When directed by Tower, switch departure and check-in (Example for Kings 4 MOA)."},
    {text: "When desired, switch left MFD to TSD display to view MOA/Mustang working areas."}],
    [{bold: true, text: '"above 110, Flaps"', center: true}, {space: true}, {bold: true, text: '"Gear up, Flaps up, at ____knots"', center: true}, {highlight: true, text: '"Gear up, flaps up"', center: true},
    {bold:true, text: "Switching Channel 12", center: true}, {bold: true, text: "UHF: “Corpus Departure, (call sign), passing (altitude) off Navy Corpus, Kings 4”", center :true}]
  ]),

  // 10. CLIMB (PASSING 10,000 FEET)
  qclimb1: createActionBubbles([
    [{text: "Set Concentration Lever to MAX. Check flow indicator for normal operation"}],
    [{bold: true, text: '"MAX, Good Blinker"', center: true}, {space: true}, {highlight: true, text: '"MAX, Good Blinker"', center: true}]
  ]),
  qclimb2: createActionBubbles([
    [{text: "Set as required. (Normally Off)"}],
    [{bold: true, text: '"On" or "Off" (As required)', center: true}]
  ]),
  qclimb3: createActionBubbles([
    [{text: "Set as required."}],
    [{bold: true, text: '"Canopy" or "Foot" (As required)', center: true}]
  ]),
  qclimb4: createActionBubbles([
    [{text: "Check cockpit altitude and pressure differential. Cockpit must be pressurized to ~8k'."}],
    [{bold: true, text: '"Cockpit Altitude_____, Delta (Δ) P____"', center: true}]
  ]),

  // 11. OPERATIONS CHECK
  qoc1: createActionBubbles([
    [{text: "Check hydraulic pressure within limits of 3000 +/- 120 PSI."}],
    [{bold: true, text: '"_______ PSI"', center: true}]
  ]),
  qoc2: createActionBubbles([
    [{text: "Check volts between 28.0 – 28.5,"},
    {text: "Check amps between -2 – +50"}],
    [{bold: true, text: '"____Volts"', center: true},
    {bold: true, text: '"____Amps"', center: true}]
  ]),
  qoc3: createActionBubbles([
    [{text: "Check fuel quantity total and fuel load is balanced."}],
    [{bold: true, text: '"____lbs, balanced"', center: true}]
  ]),
  qoc4: createActionBubbles([
    [{text: "Check flow indicator for normal operation."}],
    [{bold: true, text: '"Good Blinker"', center: true}, {space: true}, {highlight: true, text: '"Good Blinker"', center: true}]
  ]),
  qoc5: createActionBubbles([
    [{text: "Check engine instruments on the EICAS Display for normal operating limits."}],
    [{bold: true, text: '"Checked"', center: true}]
  ]),
  qoc6: createActionBubbles([
    [{text: "Check cockpit altitude and pressure."}],
    [{bold: true, text: '"Cockpit Altitude ____, Delta (Δ) P____"', center: true}]
  ]),

  // 12. PRE-STALL, SPIN, AND AEROBATIC CHECKS
  qpssa1: createActionBubbles([
    [{text: "Ensure all publications and checklists are secured. Check seat straps secure and tightened."}],
    [{bold: true, text: '"Stowed"', center: true}, {space: true}, {highlight: true, text: '"Stowed"', center: true}]
  ]),
  qpssa2: createActionBubbles([
    [{text: "Check engine instruments on the EICAS Display for normal operating limits and no warning/caution messages illuminated on CAS Display."}],
    [{bold: true, text: '"Checked"', center: true}]
  ]),
  qpssa3: createActionBubbles([
    [{text: "Compare fuel tank levels to ensure you have less than a 50 lbs. imbalance."}],
    [{bold: true, text: '"Balanced, within 50 Pounds"', center: true}]
  ]),

  // 13. DESCENT
  qdesc1: createActionBubbles([
    [{text: "Check that the PFD and BFI displays match and there are no red X's indicating a fault. Ensure artificial horizon has not tumbled. Re-cage the BFI as required."}],
    [{bold: true, text: '"Checked"', center: true}, {space: true}, {highlight: true, text: '"Checked"', center: true}]
  ]),
  qdesc2: createActionBubbles([
    [{text: "Set local altimeter in the PFD and BFI."}],
    [{bold: true, text: '"____, set twice"', center: true}, {space: true}, {highlight: true, text: '"____, set twice"', center: true}]
  ]),
  qdesc3: createActionBubbles([
    [{text: "Check in safe position."}],
    [{bold: true, text: '"Safe"', center: true}]
  ]),
  qdesc4: createActionBubbles([
    [{text: "Set as required. (Normally Off)"}],
    [{bold: true, text: '"On" or "Off" (As required)', center: true}]
  ]),
  qdesc5: createActionBubbles([
    [{text: "Set as required."}],
    [{bold: true, text: '"Canopy" or "Foot"', center: true}, {text: "(As required)"}]
  ]),

  // 14. BEFORE LANDING
  qbl1: createActionBubbles([
    [{text: "Ensure the Defog is Off. (Engine performance decreases with defog on)"}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qbl2: createActionBubbles([
    [{text: "Check engine instruments on the EICAS Display for normal operating limits"}],
    [{bold: true, text: '"Checked"', center: true}]
  ]),
  qbl3: createActionBubbles([
    [{text: "Confirm that only three green annunciators are illuminated on the landing gear control panel."}],
    [{bold: true, text: '"Down"', center: true}, {space: true}, {highlight: true, text: '"Down"', center: true}]
  ]),
  qbl4: createActionBubbles([
    [{text: "Verify positive pressure by actuating toe brakes."}],
    [{bold: true, text: '"Checked"', center: true}]
  ]),
  qbl5: createActionBubbles([
    [{text: "Verify Flap Indicator corresponds to the position of the Flap Handle."}],
    [{bold: true, text: '"Up/Takeoff/Landing"', center: true}, {space: true}, {highlight: true, text: '"Up/Takeoff/Landing"', center: true}]
  ]),
  qbl6: createActionBubbles([
    [{text: "Check EICAS display to ensure the Speed Brake Light is extinguished."}],
    [{bold: true, text: '"Retracted"', center: true}]
  ]),

  // 15. AFTER LANDING
  qal1: createActionBubbles([
    [{text: "Verify ISS Mode Selector lever is locked in the desired detent. (Rear cockpit will position ISS to desired detent and report.)"}],
    [{highlight: true, text: '"Solo"', center: true}, {space: true}, {bold: true, text: '"Roger Solo"', center: true}]
  ]),
  qal2: createActionBubbles([
    [{text: 'Use the "two-hand method" to install the Seat Safety Pin. Ensure the pin is fully inserted to preclude inadvertent seat actuation.'}],
    [{bold: true, text: '"Installed"', center: true}, {space: true}, {highlight: true, text: '"Installed"', center: true}]
  ]),
  qal3: createActionBubbles([
    [{text: "Turn the Anti-Ice Switch off. Check EICAS display and ensure the ANTI ICE Advisory extinguishes and both L and R PHT INOP Cautions illuminate, acknowledge MASTER CAUTION."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qal4: createActionBubbles([
    [{text: "Select Flap Lever to Up. Check Flap Indicator indicates Up."}],
    [{bold: true, text: '"Up"', center: true}]
  ]),
  qal5: createActionBubbles([
    [{text: "Depress the Trim Interrupt button. Check EICAS Display to verify TRIM OFF and TAD OFF messages illuminated. Check TAD Switch moves to off."}],
    [{bold: true, text: '"Depressed"', center: true}]
  ]),
  qal6: createActionBubbles([
    [{text: "Adjust trim to place all three indicators into the green range."}],
    [{bold: true, text: '"Set for Takeoff"', center: true}]
  ]),
  qal7: createActionBubbles([
    [{text: "Set Transponder to STBY at KNGP. (After selecting XPDRSBY, select confirm to place in standby mode). Set as required at other airfields."}],
    [{bold: true, text: '"Standby"', center: true}]
  ]),
  qal8: createActionBubbles([
    [{text: "Set TCAS to the standby mode."}],
    [{bold: true, text: '"Standby"', center: true}]
  ]),
  qal9: createActionBubbles([
    [{text: "Turn off bleed air inflow switch."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),

  // 16. ENGINE SHUTDOWN
  qesd1: createActionBubbles([
    [{text: "Apply brakes and hold pressure while pulling and turning the parking brake lever 90° clockwise."}],
    [{bold: true, text: '"Set"', center: true}]
  ]),
  qesd2: createActionBubbles([
    [{text: "Turn off the landing and taxi lights."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qesd3: createActionBubbles([
    [{text: "Verify transponder in standby."}],
    [{bold: true, text: '"Standby"', center: true}]
  ]),
  qesd4: createActionBubbles([
    [{text: "If SOLO, record flight times. Place the Avionics Master switch to OFF."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qesd5: createActionBubbles([
    [{text: "Check Ram Air Inflow switch OFF."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qesd6: createActionBubbles([
    [{text: "Turn the Air Conditioner switch OFF."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qesd7: createActionBubbles([
    [{text: "Turn the Evaporator Blower control rheostat full counterclockwise to the OFF position."}],
    [{bold: true, text: '"Off"', center: true}, {space: true}, {highlight: true, text: '"Off"', center: true}]
  ]),
  qesd8: createActionBubbles([
    [{text: "Remove O2 mask"}],
    [{bold: true, text: '"Removed"', center: true}]
  ]),
  qesd9: createActionBubbles([
    [{text: "Ensure OBOGS pressure and concentration levers are in the normal position. Turn supply lever OFF."}],
    [{bold: true, text: '"Normal, Normal, off"', center: true}, {space: true}, {highlight: true, text: '"Normal, Normal, off"', center: true}]
  ]),
  qesd10: createActionBubbles([
    [{text: "Ensure PCL has been at IDLE for at least 60 seconds before setting the PCL to OFF. Monitor engine instruments to verify proper shutdown (ITT and N1 decreasing, fuel flow indicating zero)."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qesd11: createActionBubbles([
    [{text: "While the prop is winding down, ensure the canopy rails are clear of obstructions and open the canopy."}],
    [{bold: true, text: '"Rail Clear"', center: true}, {space: true}, {highlight: true, text: '"Rail Clear"', center: true}]
  ]),
  qesd12: createActionBubbles([
    [{text: "Ensure the PMU Status message is extinguished. (If a fault has been detected, the PMU Status message will illuminate 1 minute after touchdown; Notify maintenance if the light is present)."}],
    [{bold: true, text: '"Extinguished"', center: true}]
  ]),
  qesd13: createActionBubbles([
    [{text: "Check FDR Light status."}],
    [{bold: true, text: '"Extinguished"', center: true}]
  ]),
  qesd14: createActionBubbles([
    [{text: "Engage the gust lock (as required)."}, {space: true},
    {text: "To engage gust lock completely after installing pin depress the left rudder pedal until it locks."}, {space: true},
    {text: "(Note: DO NOT engage gust lock in SIM)"}],
    [{bold: true, text: '"Engaged"', center: true}]
  ]),
  qesd15: createActionBubbles([
    [{text: "Turn off interior lights as required. Secure the Navigation and Anti-Collision lights once the propeller comes to a stop."}],
    [{bold: true, text: '"Off"', center: true}]
  ]),
  qesd16: createActionBubbles([
    [{text: "Place the Generator, Battery and Aux Battery switches to OFF."}],
    [{bold: true, text: '"Off"', center: true}]
  ])
};

export const QUAD_NWC = {
  qco1: {
    notes: [
      "Prior to ingress, ensure that attachment shear ring in each leg restraint line is between snubber unit and leg restraint line floor bracket.",
      "Failure to route the lap straps under the anti-G hose may result in loss of air supply to anti-G suit, rendering anti-G suit inoperative."
    ],
    warnings: [
      "To prevent possible injury during ejection or emergency ground egress, adjust leg restraint garters and leg restraint lines to reduce slack and ensure tight fit around top of boot.",
      "A jammed inertia reel will prevent proper shoulder harness operation and increase the risk of injury during ejection.",
      "Failure to ensure ejection handle is in the upright position and harness straps are clear of the handle will result in an inability to initiate ejection.",
      "Failure to release the emergency oxygen hose from the elastic sidewall strap during strap-in may result in the loss of the emergency oxygen system after ejection."
    ],
    cautions: []
  },
  qco2: {
    notes: [
      "Typical EICAS messages which may be present on initial application of power are GEN, CANOPY, FUEL PX, OBOGS FAIL, OIL PX, ADC FAIL, XPDR FAIL, IAC2 FAIL, EHYD PX LO, L PHT INOP, R PHT INOP, CHK ENG, RPT FWD, IRS DEGD, STATUS/BIT, and TAD OFF. Aural warning and EICAS messages should stop flashing when MASTER WARN/MASTER CAUTION switchlights are depressed.",
      "The evaporator blower may provide a burst of air at battery turn on. Avionics filter capacitors that may not deplete prior to re-energizing the battery switch may cause this. This is normal."
    ],
    warnings: [],
    cautions: []
  },
  qco4: {
    notes: [
      "Using external power provides for lower ITT during engine starts and preserves battery life. Consider using external power if available. Also, consider using external power when motoring the engine."
    ],
    warnings: [],
    cautions: [
      "Do not connect external power if battery voltage is below 22.0 volts. Connecting external power could cause damage to the aircraft battery."
    ]
  },
  qco5: {
    notes: [],
    warnings: [],
    cautions: [
      "Make sure ejection seat pan and side consoles are clear of all lap straps, cords, and connections prior to adjusting seat height to prevent possible damage to seat or equipment."
    ]
  },
  qco6: {
    notes: [
      "Do not push rudder pedals while adjusting them."
    ],
    warnings: [],
    cautions: [
      "Use of excessive force while adjusting rudder pedals to full forward or full aft position may cause binding in the adjustment handle."
    ]
  },
  qco7: {
    notes: [],
    warnings: [
      "To prevent injury to ground crew, exercise caution when operating the speed brake or flight controls with ground crew present."
    ],
    cautions: []
  },
  qco22: {
    notes: [
      "Ensure parking brake is not inadvertently released by leg contact."
    ],
    warnings: [
      "Failure to ensure parking brake is properly set will result in aircraft creep upon engine start."
    ],
    cautions: []
  },
  qco36: {
    notes: [
      "For positive cockpit ventilation, place the RAM AIR FLOW switch to the NORM or HI position. For best cockpit cooling at altitudes below 7,500 feet MSL, set RAM AIR FLOW switch to OFF. Set temperature controller as required."
    ],
    warnings: [],
    cautions: []
  },
  qhias1: {
    notes: [
      "The EDM FAIL message indicates that the engine indicating system has accommodated a fault. Parameters with the EDM FAIL message which do not display red X's and/or missing pointers are functional and may be used normally."
    ],
    warnings: [],
    cautions: []
  },
  qhias3: {
    notes: [],
    warnings: [],
    cautions: [
      "Do not rotate the propeller by hand to reduce IOAT. Rotating the propeller without oil pressure can damage the engine. Slow and limited hand rotation of the propeller for inspection purposes is acceptable."
    ]
  },
  qestart1: {
    notes: [],
    warnings: [
      "Failure to properly latch the canopy could lead to canopy opening during flight, leading to a possible loss of control during flight and inability to eject.",
      "Failure to close the canopy prior to engine start may result in injury or damage to the aircraft due to exhaust and propwash.",
      "To prevent injury or damage to canopy, ensure canopy rail and locking lever are clear prior to closing canopy. Ensure canopy handle is in the open position prior to closing the canopy to prevent damage to the locking mechanism.",
      "Ensure minimum adequate canopy/helmet clearance by placing closed fist on top of helmet when adjusting seat height. Excessive seat height (helmet above canopy breakers) can result in fatal injury upon ejection."
    ],
    cautions: [
      "Avoid applying abrupt and/or excessive force to the canopy locking handle at all times. Excessive force in any direction may damage the canopy locking mechanism."
    ]
  },
  qestart2: {
    notes: [
      "Anti-collision strobes may be left off if operation is distracting, such as for ground operations at night."
    ],
    warnings: [],
    cautions: []
  },
  qestart3: {
    notes: [],
    warnings: [],
    cautions: [
      "With the PMU STATUS caution, the PMU auto abort function may be unavailable. Do not continue Engine Start (AUTO) procedures."
    ]
  },
  qestart4: {
    notes: [],
    warnings: [],
    cautions: [
      "Failure to ensure the ST READY light remains illuminated may result in engine damage due to loss of the automatic shutdown feature."
    ]
  },
  qestart6: {
    notes: [
      "Engine sounds associated with compressor instability during start are acceptable as long as PMU allows the start to continue.",
      "Aural tones are inaudible during engine start until the engine's gas generator indication (N1) is above 50%."
    ],
    warnings: [],
    cautions: [
      "Abort engine start if anything abnormal occurs during the start sequence, or severe damage could occur to the engine.",
      "Abort engine start if the PCL is inadvertently moved before N1 reaches 60%.",
      "If the ST READY advisory goes out once the start switch is placed to Auto/Reset, the start should be terminated to prevent potential engine damage."
    ]
  },
  qestart7: {
    notes: [
      "With the PCL in any position other than OFF, moving the PCL to OFF or reselecting the starter switch to AUTO/RESET at any time during the start sequence will terminate the start. If a start is initiated with the PCL in OFF, the start may be aborted by reselecting AUTO/RESET on the starter switch."
    ],
    warnings: [],
    cautions: [
      "If a start attempt is aborted (PMU or manual abort), execute Motoring Run Procedure in Section III."
    ]
  },
  qestart8: {
    notes: [],
    warnings: [
      "When moving the PCL forward past IDLE, verify travel past idle by hearing two audible clicks as the PCL is moved forward. Improper position of the PCL short of the two audible clicks could result in inadvertent engine shutdown.",
      "During ground operation and after the engine is started, if the PCL is inadvertently moved to cutoff and the engine is shutting down, do not attempt to relight the engine by moving the PCL to idle or severe damage could occur to the engine."
    ],
    cautions: []
  },
  qestart9: {
    notes: [],
    warnings: [
      "Ensure PCL, speed brake, and flight controls are not moved until ground crew is clear of aircraft."
    ],
    cautions: []
  },
  qmrp4: {
    notes: [
      "Observe starter duty cycle cool-down period."
    ],
    warnings: [],
    cautions: [
      "STARTER switch is not spring-loaded from MANUAL to NORM."
    ]
  },
  qas5: {
    notes: [
      "For best cockpit cooling, select AIR COND switch to ON, and RAM AIR FLOW switch to OFF. For positive cockpit ventilation below 7,500 feet MSL, place the RAM AIR FLOW switch to the NORM or HI position."
    ],
    warnings: [],
    cautions: []
  },
  qas6: {
    notes: [
      "After turning ON the GENERATOR switch, allow approximately 10 seconds before turning ON the AVIONICS MASTER switch to allow battery amperage to stabilize."
    ],
    warnings: [],
    cautions: []
  },
  qas9: {
    notes: [
      "After initial power-up, the OBOGS FAIL annunciator will be inhibited for 4 minutes during OBOGS monitor warmup."
    ],
    warnings: [],
    cautions: []
  },
  qas13: {
    notes: [],
    warnings: [
      "To prevent injury to ground crew, exercise caution when operating the speed brake or flight controls with ground crew present."
    ],
    cautions: []
  },
  qas19f: {
    notes: [
      "The Flight NO. on the FMS ROUTE page is transmitted as the aircraft call sign by the transponder."
    ],
    warnings: [],
    cautions: []
  },
  qas19g:{
    notes:[
      
      "The built-in test (BIT) feature provides an adequate test of the navigation equipment. The BIT does not provide a test of the antenna. The antenna may be checked by confirming reception of a local VOR/LOC signal by a positive ident.",
      "UHF reception may be degraded by blanking of the UHF antenna. This has been noted frequently when the aircraft is headed directly toward or away from the transmitting station. This may occur on all UHF frequencies until a fix is identified and implemented."
    ],
    warnings: [],
    cautions: []
  },
  qtaxi1: {
    notes: [],
    warnings: [
      "Failure of the nose wheel steering system may prevent the pilot from changing nose wheel direction without disengaging the system. If the nose wheel steering system fails to respond to pilot input, disengage nose wheel steering and use differential braking to maintain directional control while stopping the aircraft. Do not taxi with a known directional control problem.",
      "Taking off with a known failure of the nose wheel steering system may cause the nose wheel not to be centered upon retraction, resulting in damage to the aircraft and potential controllability issues on the subsequent landing."
    ],
    cautions: [
      "Minimum radius turns are possible through use of power, full rudder, and differential braking. To preclude unnecessary wear to nose wheel steering and tire, disengage nose wheel steering prior to executing sharp turns with differential braking. To re-engage nose wheel steering, actuate the nose wheel steering switch prior to applying opposite rudder. Failure to do so may result in nose wheel steering not engaging.",
      "To prevent ground resonance within the propeller, stabilized operation of the propeller in the 62-80% NP range is prohibited on the ground.",
      "If brake pressure appears to fade during application, or brakes are not responding as expected, fully release brakes then re-apply. Both crew members must fully release brakes for this to be effective."
    ]
  },
  qogc1: {
    notes: [
      "Any fault discovered during this check is reason for ground abort. Complete this check in a non-congested area. Monitor oil temperature, and attempt to park facing into the wind for extended ground operations.",
      "If conditions permit, park aircraft facing into the wind prior to beginning overspeed governor check to enhance oil cooling and reduce engine operating temperatures."
    ],
    warnings: [],
    cautions: []
  },
  qogc3: {
    notes: [
      "It is acceptable for N1 to make little or no change when turning off the PMU as long as it is in limits."
    ],
    warnings: [],
    cautions: []
  },
  qogc4: {
    notes: [
      "The PIU governing tolerance is 100 ± 2%.",
      "At higher density altitudes, less torque may be required to achieve 100% NP."
    ],
    warnings: [],
    cautions: [
      "Advancing the PCL prior to engine stabilizing with PMU OFF or too rapidly may cause high ITT and engine overtemperature."
    ]
  },
  qbto10: {
    notes:["The rear cockpit ejection seat safety pin will be removed with the ISS mode selector in the CMD FWD position during all sorties when non-rated personnel occupy the rear seat."],
    warnings: [
      "Prior to pulling ejection seat safety pin, ensure safety streamer is free and clear of ejection seat handle."
    ],
    cautions: []
  },
  qlc3: {
    notes: [],
    warnings: [],
    cautions: [
      "Prolonged use of pitot and AOA heat while on the ground will damage the pitot and AOA heating elements."
    ]
  },
  qat1: {
    notes: [
      "If climbout obstacles are a factor, rotate to 15° nose high on takeoff, raise gear, and maintain VOBS takeoff speed until clear of obstacles. Raise flaps when clear of obstacles (Figure A3-8)",
      "If remaining in the terminal area, this checklist should be accomplished in conjunction with the Before Landing checklist.",
      "The gear may be raised once a positive rate of climb is established. If remaining in the pattern, the pilot may leave the gear down, but must observe the maximum gear extended speed in Section V."
    ],
    warnings: [],
    cautions: []
  },
  qat2: {
    notes: [
      "If the flaps are set to LDG and the gear is raised, the gear warning horn will sound and cannot be canceled. Select flaps TO or UP to cancel the horn.",
      "To avoid excessive stick forces, trim nose down as aircraft accelerates to climb speed."
    ],
    warnings: [],
    cautions: []
  },
  qclimb2: {
    notes: [
      "With canopy defog ON, expect an increase in ITT of up to 40 °C for a given PCL setting. At high power settings, this may exceed engine ITT limitations. The PCL should be retarded to maintain operating limits. Cockpit noise will also increase. Performance will decrease with defog on. A DUCT TEMP indication is likely at climb or cruise power with canopy defog ON and cockpit temperature controller set to AUTO or MANUAL HOT. Refer to Environmental Systems Duct Overtemp procedure in Section III."
    ],
    warnings: [],
    cautions: []
  },
  qclimb4: {
    notes: [
      "If readings other than 3.6±0.2 psi are encountered at or above 18,069 feet PA, notify maintenance."
    ],
    warnings: [],
    cautions: []
  },
  qbl1: {
    notes: [
      "Prior to landing, set pressurization switch to DUMP if landing field elevation is above 7500 feet MSL."

    ],
    warnings: [],
    cautions: []
  },
  qbl6: {
    notes: [
      "Setting flaps to TO or LDG automatically retracts the speed brake.",
      "If conditions require, the pilot may select defog during climbout from missed approach, go around/waveoff, or touch and go."
    ],
    warnings: [],
    cautions: []
  },
  qal1: {
    notes: [],
    warnings: [
      "Both seats will eject if the ISS is in BOTH and an unpinned ejection handle is pulled, even if the other seat is pinned.",
      "With the ISS mode selector set to CMD FWD, the crewmember in the rear cockpit initiates ejection of the rear seat only, and the crewmember in the front cockpit initiates ejection for both front and rear seats with the rear seat ejecting first even if the rear seat ejection handle safety pin is installed."
    ],
    cautions: []
  },
  qal2: {
    notes: [],
    warnings: [
      "Ensure ejection seat safety pin is fully inserted to preclude inadvertent seat actuation.",
      "In the event of a dropped ejection seat safety pin, do not use the CFS handle safety pin to attempt to safe the ejection seat. The ejection seat safety pin and the CFS handle safety pin are not interchangeable. Using the CFS handle safety pin in place of the ejection seat safety pin could result in inadvertent seat actuation."
    ],
    cautions: []
  },
  qal9: {
    notes: [],
    warnings: [
      "After a landing which required maximum effort braking and if overheated brakes are suspected, do not taxi into or park in a congested area until the brakes have had sufficient time to cool. Do not set the parking brake."
    ],
    cautions: []
  },
  qfstb8: {
    notes: [
      "If the flaps are set to LDG and the gear is raised, the gear warning horn will sound and cannot be canceled. Select flaps TO or UP to cancel the horn.",
      "To avoid excessive stick forces, trim nose down as aircraft accelerates to climb speed."
    ],
    warnings: [],
    cautions: []
  },
  qesd1: {
    notes: [
      "Allow ITT to stabilize at idle for at least 1 minute prior to shutdown."
    ],
    warnings: [],
    cautions: [
      "Do not set parking brake when hot brakes are suspected."
    ]
  },
  qesd9: {
    notes: [],
    warnings: [],
    cautions: [
      "Failure to deactivate both OBOGS regulators will result in a drain on the battery even with all other electrical switches and controls off. This load will discharge the aircraft battery."
    ]
  },
  qesd10: {
    notes: [],
    warnings: [
      "When shutting the engine down, verify the PCL is fully in the OFF position to preclude engine damage. If the PCL is left in an intermediate position, fuel flow may continue and cause serious engine damage due to over temperature."
    ],
    cautions: []
  },
  qesd11: {
    notes: [],
    warnings: [],
    cautions: [
      "Exposure of the cockpit interior to rain and moisture may cause early degradation of avionics, interior corrosion, and prevent critical ejection and CFS components from functioning properly. The aircrew should delay opening the canopy until rain has ceased or ensure that the canopy is opened under cover if it is safe to do so. Exposure of the cockpit interior to rain and/or moisture shall be reported to maintenance."
    ]
  },
  qesd14: {
    notes: [],
    warnings: [],
    cautions: [
      "Make sure the rudder is locked in place. The rudder must be displaced to the left after the gust lock is engaged."
    ]
  },
  qesd15: {
    notes: [
      "Ensure that the propeller has stopped prior to securing the exterior strobes and/or navigation lights."
    ],
    warnings: [],
    cautions: []
  }
};