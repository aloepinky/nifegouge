import React from 'react';

/**
 * Array of individual Emergency Procedure divs
 * Each item is a function that takes props and returns a complete EP section
 *
 * Usage:
 * const epDivs = getEPDivs(props);
 * const singleEP = epDivs[4]; // Get a specific EP
 */

// Define styles for EP divs
const epSectionStyle = {
  marginBottom: '6px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  overflow: 'hidden',
  backgroundColor: '#f9f9f9',
  maxWidth: "350px",
  margin: '0 auto'
};

const epHeaderStyle = {
  backgroundColor: '#ef5350',
  color: 'white',
  padding: '6px 12px',
  fontWeight: 'bold',
  fontSize: '12px',
  textAlign: 'center',
  borderBottom: '1px solid #000'
};

const epStepStyle = {
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  gap: '0px',
  borderBottom: '1px solid #ddd',
  fontSize: '12px',
  fontWeight: 'bold',
  backgroundColor: 'white'
};

const epInputStyle = {
  flex: 1,
  padding: '2px',
  fontSize: '11px',
  border: '1px solid #ccc',
  borderRadius: '3px',
  fontFamily: 'inherit'
};

const decisionPointStyle = {
  fontStyle: 'italic',
  padding: '6px',
  backgroundColor: '#9e9e9e',
  color: 'white',
  fontSize: '11px'
};

const subStepStyle = {
  padding: '4px 12px 4px 32px',
  fontSize: '10px',
  borderBottom: '1px solid #eee',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px'
};

// NWC (Notes, Warnings, Cautions) data for EP steps

const nwcButtonStyle = {
  backgroundColor: '#ef5350',
  color: 'white',
  border: 'none',
  padding: '0px 0px',
  fontSize: '8px',
  fontWeight: 'bold',
  borderRadius: '3px',
  cursor: 'pointer',
  marginLeft: '2px',
  minWidth: '20px',
  height: '20px'
};

export const getEPDivs = ({ epsData, handleEPsChange, getInputClass, openNWCModal, fullMode = false }) => {

  // Helper function to determine if a step should be rendered as display text (non-memory)
  const isNonMemoryStep = (stepKey) => {
    return fullMode && !EP_ANSWERS.hasOwnProperty(stepKey);
  };

  // Helper function to render either input or display text
  const renderStepContent = (stepKey, customStyle = {}) => {
    if (isNonMemoryStep(stepKey)) {
      // Non-memory item: display text
      const answer = EP_FULL_ANSWERS[stepKey]?.join(' ') || '';
      return <span className={getInputClass(stepKey)}>{answer}</span>;
    } else {
      // Memory item: input field
      return (
        <input
          type="text"
          style={{...epInputStyle, ...customStyle}}
          className={getInputClass(stepKey)}
          value={epsData[stepKey] || ''}
          onChange={(e) => handleEPsChange(stepKey, e.target.value)}
        />
      );
    }
  };

  // Helper function to render NWC button if data exists for the step
  const renderNWCButton = (stepKey, styleOverride = {}) => {
    if (openNWCModal && EP_NWC[stepKey]) {
      return (
        <button
          style={{...nwcButtonStyle, marginLeft: 'auto', ...styleOverride}}
          onClick={() => openNWCModal(stepKey)}
          title="View Notes, Warnings, and Cautions"
        >
          NWC
        </button>
      );
    }
    return null;
  };

  // EP title bar with an optional NWC button. The button sits in-flow (not
  // absolutely positioned) so long titles wrap around it instead of under it;
  // colors are inverted (white on red bar) to stand out from step buttons.
  const renderEPHeader = (title, nwcKey, styleOverride = {}) => (
    <div style={{...epHeaderStyle, ...styleOverride, display: 'flex', alignItems: 'center', gap: '6px'}}>
      <span style={{flex: 1, textAlign: 'center'}}>{title}</span>
      {renderNWCButton(nwcKey, {backgroundColor: 'white', color: '#ef5350', flexShrink: 0})}
    </div>
  );

  // Decision-tree subheader with an optional NWC button
  const renderDecision = (text, nwcKey) => (
    <div style={{...decisionPointStyle, display: 'flex', alignItems: 'center'}}>
      {text}
      {renderNWCButton(nwcKey)}
    </div>
  );

  return [
    // 0. ABORT START PROCEDURE
    (
      <div key="as" style={epSectionStyle}>
        {renderEPHeader('ABORT START PROCEDURE', 'asT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}> 1.</span>
          {renderStepContent('as1')}
          {renderNWCButton('as1')}
        </div>
        {fullMode && (
          <div style={epStepStyle}>
            <span style={{minWidth: '20px'}}> 2.</span>
            {renderStepContent('as2')}
            {renderNWCButton('as2')}
          </div>
        )}
      </div>
    ),

    // 1. MOTORING RUN PROCEDURE (Full mode only - all non-memory)
    fullMode && (
      <div key="mrp" style={epSectionStyle}>
        <div style={epHeaderStyle}>MOTORING RUN PROCEDURE</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('mrp1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('mrp2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('mrp3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('mrp4')}
          {renderNWCButton('mrp4')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>5.</span>
          {renderStepContent('mrp5')}
        </div>
      </div>
    ),

    // 2. EMERGENCY ENGINE SHUTDOWN ON THE GROUND
    (
      <div key="eesg" style={epSectionStyle}>
        <div style={epHeaderStyle}>EMERGENCY ENGINE SHUTDOWN ON THE GROUND</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('eesg1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('eesg2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('eesg3')}
        </div>
      </div>
    ),

    // 3. EMERGENCY GROUND EGRESS
    (
      <div key="ege" style={epSectionStyle}>
        {renderEPHeader('EMERGENCY GROUND EGRESS', 'egeT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('ege1')}
          {renderNWCButton('ege1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('ege2')}
          {renderNWCButton('ege2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('ege3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('ege4')}
        </div>
        <div style={decisionPointStyle}>IF CANOPY CANNOT BE OPENED OR SITUATION REQUIRES RIGHT SIDE EGRESS:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>5.</span>
          {renderStepContent('ege5')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>6.</span>
          {renderStepContent('ege6', {fontSize: '8px'})}
          {renderNWCButton('ege6')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>7.</span>
          {renderStepContent('ege7', {fontSize: '7px'})}
          {renderNWCButton('ege7')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>8.</span>
          {renderStepContent('ege8')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>9.</span>
          {renderStepContent('ege9')}
        </div>
      </div>
    ),

    // 4. ABORT
    (
      <div key="abort" style={epSectionStyle}>
        <div style={epHeaderStyle}>ABORT</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('abort1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('abort2')}
          {renderNWCButton('abort2')}
        </div>
      </div>
    ),

    // 5. ENGINE FAILURE IMMEDIATELY AFTER TAKEOFF
    (
      <div key="efiat" style={epSectionStyle}>
        {renderEPHeader('ENGINE FAILURE IMMEDIATELY AFTER TAKEOFF (SUFFICIENT RUNWAY REMAINING STRAIGHT AHEAD)', 'efiatT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('efiat1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('efiat2')}
          {renderNWCButton('efiat2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('efiat3')}
          {renderNWCButton('efiat3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('efiat4')}
        </div>
      </div>
    ),

    // 6. ENGINE FAILURE DURING FLIGHT
    (
      <div key="efdf" style={epSectionStyle}>
        {renderEPHeader('ENGINE FAILURE DURING FLIGHT', 'efdfT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('efdf1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('efdf2')}
          {renderNWCButton('efdf2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('efdf3')}
          {renderNWCButton('efdf3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('efdf4')}
          {renderNWCButton('efdf4')}
        </div>
        <div style={decisionPointStyle}>IF CONDITIONS DO NOT WARRANT AN AIRSTART:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>5.</span>
          {renderStepContent('efdf5')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>6.</span>
          {renderStepContent('efdf6')}
        </div>
      </div>
    ),

    // 7. IMMEDIATE AIRSTART
    (
      <div key="ia" style={epSectionStyle}>
        {renderEPHeader('IMMEDIATE AIRSTART (PMU NORM)', 'iaT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('ia1')}
          {renderNWCButton('ia1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('ia2')}
          {renderNWCButton('ia2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('ia3')}
          {renderNWCButton('ia3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('ia4', {fontSize: '10px'})}
        </div>
        <div style={decisionPointStyle}>IF AIRSTART IS UNSUCCESSFUL:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>5.</span>
          {renderStepContent('ia5')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>6.</span>
          {renderStepContent('ia6')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>7.</span>
          {renderStepContent('ia7')}
        </div>
        <div style={decisionPointStyle}>IF AIRSTART IS SUCCESSFUL:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>8.</span>
          {renderStepContent('ia8', {fontSize: '8px'})}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>9.</span>
          {renderStepContent('ia9')}
        </div>
        {fullMode && (
          <>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>10.</span>
              {renderStepContent('ia10')}
              {renderNWCButton('ia10')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>11.</span>
              {renderStepContent('ia11')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>12.</span>
              {renderStepContent('ia12')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>13.</span>
              {renderStepContent('ia13')}
              {renderNWCButton('ia13')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>14.</span>
              {renderStepContent('ia14')}
            </div>
          </>
        )}
      </div>
    ),

    // 8. UNCOMMANDED POWER CHANGES
    (
      <div key="upc" style={epSectionStyle}>
        <div style={epHeaderStyle}>UNCOMMANDED POWER CHANGES / LOSS OF POWER/ UNCOMMANDED PROPELLER FEATHER</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('upc1')}
          {renderNWCButton('upc1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('upc2')}
          {renderNWCButton('upc2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('upc3', {fontSize: '7px'})}
          {renderNWCButton('upc3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('upc4')}
          {renderNWCButton('upc4')}
        </div>
        <div style={decisionPointStyle}>IF POWER IS SUFFICIENT FOR CONTINUED FLIGHT:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>5.</span>
          {renderStepContent('upc5')}
        </div>
        {renderDecision('IF POWER IS INSUFFICIENT TO COMPLETE PEL:', 'upcD')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>6.</span>
          {renderStepContent('upc6')}
          {renderNWCButton('upc6')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>7.</span>
          {renderStepContent('upc7')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>8.</span>
          {renderStepContent('upc8')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>9.</span>
          {renderStepContent('upc9')}
        </div>
      </div>
    ),

    // 9. COMPRESSOR STALLS
    (
      <div key="cs" style={epSectionStyle}>
        <div style={epHeaderStyle}>COMPRESSOR STALLS</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('cs1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('cs2')}
          {renderNWCButton('cs2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('cs3')}
        </div>
        <div style={decisionPointStyle}>IF POWER IS SUFFICIENT FOR CONTINUED FLIGHT:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('cs4')}
        </div>
        <div style={decisionPointStyle}>IF POWER IS INSUFFICIENT TO COMPLETE PEL:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>5.</span>
          {renderStepContent('cs5')}
          {renderNWCButton('cs5')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>6.</span>
          {renderStepContent('cs6')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>7.</span>
          {renderStepContent('cs7')}
        </div>
      </div>
    ),

    // 10. INADVERTENT DEPARTURE FROM CONTROLLED FLIGHT
    (
      <div key="idcf" style={epSectionStyle}>
        <div style={{...epHeaderStyle, fontSize: '11px'}}>INADVERTENT DEPARTURE FROM CONTROLLED FLIGHT</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('idcf1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('idcf2')}
          {renderNWCButton('idcf2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('idcf3')}
          {renderNWCButton('idcf3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('idcf4')}
          {renderNWCButton('idcf4')}
        </div>
      </div>
    ),

    // 11. FIRE IN FLIGHT
    (
      <div key="fif" style={epSectionStyle}>
        <div style={epHeaderStyle}>FIRE IN FLIGHT</div>
        {renderDecision('IF FIRE IS CONFIRMED:', 'fifD')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('fif1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('fif2')}
        </div>
        <div style={decisionPointStyle}>IF FIRE IS EXTINGUISHED:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('fif3')}
        </div>
        <div style={decisionPointStyle}>IF FIRE DOES NOT EXTINGUISH OR FORCED LANDING IS IMPRACTICAL:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('fif4')}
        </div>
        <div style={decisionPointStyle}>IF FIRE IS NOT CONFIRMED:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>5.</span>
          {renderStepContent('fif5')}
          {renderNWCButton('fif5')}
        </div>
      </div>
    ),

    // 12. SMOKE AND FUME ELIMINATION/ELECTRICAL FIRE
    (
      <div key="sfe" style={epSectionStyle}>
        {renderEPHeader('SMOKE AND FUME ELIMINATION/ELECTRICAL FIRE', 'sfeT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('sfe1')}
        </div>
        <div style={subStepStyle}>
          <span style={{minWidth: '20px'}}>a.</span>
          {renderStepContent('sfe1a')}
        </div>
        <div style={subStepStyle}>
          <span style={{minWidth: '20px'}}>b.</span>
          {renderStepContent('sfe1b')}
        </div>
        <div style={subStepStyle}>
          <span style={{minWidth: '20px'}}>c.</span>
          {renderStepContent('sfe1c')}
        </div>
        {fullMode && (
          <>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>2.</span>
              {renderStepContent('sfe2')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>3.</span>
              {renderStepContent('sfe3')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>4.</span>
              {renderStepContent('sfe4')}
            </div>
            <div style={decisionPointStyle}>IF SMOKE/FIRE PERSISTS:</div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>5.</span>
              {renderStepContent('sfe5')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>6.</span>
              {renderStepContent('sfe6')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>7.</span>
              {renderStepContent('sfe7')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>8.</span>
              {renderStepContent('sfe8')}
            </div>
            <div style={decisionPointStyle}>IF FIRE CEASES:</div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>9.</span>
              {renderStepContent('sfe9')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>10.</span>
              {renderStepContent('sfe10')}
            </div>
          </>
        )}
      </div>
    ),

    // 13. CHIP DETECTOR WARNING
    (
      <div key="cdw" style={epSectionStyle}>
        <div style={epHeaderStyle}>CHIP DETECTOR WARNING</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('cdw1', {fontSize: '7px'})}
          {renderNWCButton('cdw1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('cdw2')}
        </div>
      </div>
    ),

    // 14. OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE
    (
      <div key="osm" style={epSectionStyle}>
        {renderEPHeader('OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE', 'osmT')}
        <div style={decisionPointStyle}>IF ONLY AMBER OIL PX caution ILLUMINATES:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('osm1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('osm2', {fontSize: '8px'})}
        </div>
        <div style={decisionPointStyle}>IF RED OIL PX WARNING ILLUMINATES AND/OR AMBER OIL PX CAUTION REMAINS ILLUMINATED FOR 5 SECONDS:</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('osm3', {fontSize: '7px'})}
          {renderNWCButton('osm3')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('osm4')}
        </div>
      </div>
    ),

    // 15. LOW FUEL PRESSURE
    (
      <div key="lfp" style={epSectionStyle}>
        <div style={epHeaderStyle}>LOW FUEL PRESSURE</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('lfp1')}
          {renderNWCButton('lfp1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('lfp2')}
          {renderNWCButton('lfp2')}
        </div>
      </div>
    ),

    // 16. HIGH FUEL FLOW
    (
      <div key="hff" style={epSectionStyle}>
        <div style={epHeaderStyle}>HIGH FUEL FLOW</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('hff1')}
          {renderNWCButton('hff1')}
        </div>
      </div>
    ),

    // 17. OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS
    (
      <div key="obogs" style={epSectionStyle}>
        {renderEPHeader('OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS', 'obogsT', {fontSize: '11px'})}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('obogs1')}
          {renderNWCButton('obogs1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('obogs2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('obogs3')}
        </div>
        {fullMode && (
          <>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>4.</span>
              {renderStepContent('obogs4')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>5.</span>
              {renderStepContent('obogs5')}
              {renderNWCButton('obogs5')}
            </div>
            <div style={decisionPointStyle}>Below 10,000 feet MSL:</div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>6.</span>
              {renderStepContent('obogs6')}
              {renderNWCButton('obogs6')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>7.</span>
              {renderStepContent('obogs7')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>8.</span>
              {renderStepContent('obogs8')}
              {renderNWCButton('obogs8')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>9.</span>
              {renderStepContent('obogs9')}
              {renderNWCButton('obogs9')}
            </div>
          </>
        )}
      </div>
    ),

    // 18. EJECT
    (
      <div key="eject" style={epSectionStyle}>
        <div style={epHeaderStyle}>EJECT</div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('eject1')}
          {renderNWCButton('eject1')}
        </div>
      </div>
    ),

    // 19. FORCED LANDING
    (
      <div key="fl" style={epSectionStyle}>
        {renderEPHeader('FORCED LANDING', 'flT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('fl1', {fontSize: '10px'})}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('fl2')}
          {renderNWCButton('fl2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('fl3', {fontSize: '7px'})}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>4.</span>
          {renderStepContent('fl4')}
          {renderNWCButton('fl4')}
        </div>
        {fullMode && (
          <>
            <div style={decisionPointStyle}>ACCOMPLISH THE FOLLOWING AS CONDITIONS PERMIT:</div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>5.</span>
              {renderStepContent('fl5')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>6.</span>
              {renderStepContent('fl6')}
              {renderNWCButton('fl6')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>7.</span>
              {renderStepContent('fl7')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>8.</span>
              {renderStepContent('fl8')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>9.</span>
              {renderStepContent('fl9')}
            </div>
          </>
        )}
      </div>
    ),

    // 20. PRECAUTIONARY EMERGENCY LANDING (PEL)
    (
      <div key="pel" style={epSectionStyle}>
        {renderEPHeader('PRECAUTIONARY EMERGENCY LANDING (PEL)', 'pelT')}
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>1.</span>
          {renderStepContent('pel1')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>2.</span>
          {renderStepContent('pel2')}
        </div>
        <div style={epStepStyle}>
          <span style={{minWidth: '20px'}}>3.</span>
          {renderStepContent('pel3')}
        </div>
        {fullMode && (
          <>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>4.</span>
              {renderStepContent('pel4')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>5.</span>
              {renderStepContent('pel5')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>6.</span>
              {renderStepContent('pel6')}
            </div>
            <div style={epStepStyle}>
              <span style={{minWidth: '20px'}}>7.</span>
              {renderStepContent('pel7')}
            </div>
          </>
        )}
      </div>
    )
  ].filter(Boolean);
};

// T-6B Emergency Procedures Answer Keys
export const EP_ANSWERS = {
  // GROUND EMERGENCIES
  // ABORT START PROCEDURE
  as1: ['PCL - OFF ', 'or STARTER switch - AUTO/RESET'],
  
  // EMERGENCY ENGINE SHUTDOWN ON THE GROUND
  eesg1: ['PCL - OFF'],
  eesg2: ['FIREWALL SHUTOFF HANDLE - PULL'],
  eesg3: ['EMERG\u200BENCY GROUND EGRESS - AS REQUIRED'],
  
  // EMERGENCY GROUND EGRESS
  ege1: ['ISS MODE SELECTOR - SOLO'],
  ege2: ['SEAT SAFETY PIN - INSTALL (BOTH)'],
  ege3: ['PARKING BRAKE - AS REQUIRED'],
  ege4: ['CANOPY - OPEN'],
  ege5: ['CFS HANDLE SAFETY PIN - REMOVE (BOTH)'],
  ege6: ['CFS HANDLE - ROTATE 90 DEGREES COUNTERCL\u200BOCKWISE AND PULL (BOTH)'],
  ege7: ['UPPER FI\u200BTTINGS, LOWER FI\u200BTTINGS, AND LEG RESTRAINT GARTERS - RELEASE (BOTH)'],
  ege8: ['BAT\u200B, ', 'GEN, ', 'AND AUX BAT SWITCHES - OFF'],
  ege9: ['EVACUATE AIRCRAFT'],
  
  // TAKEOFF EMERGENCIES
  // ABORT
  abort1: ['PCL - IDLE'],
  abort2: ['BRAKES - AS REQUIRED'],
  
  // ENGINE FAILURE IMMEDIATELY AFTER TAKEOFF
  efiat1: ['AIRSPEED - 110 KNOTS (MINIMUM)'],
  efiat2: ['PCL - AS REQUIRED'],
  efiat3: ['EMER LDG GR HANDLE - PULL (AS REQUIRED)'],
  efiat4: ['FLAPS - AS REQUIRED'],
  
  // IN-FLIGHT EMERGENCIES
  // ENGINE FAILURE DURING FLIGHT
  efdf1: ['ZOOM/GLIDE - 125 KNOTS (MINIMUM)'],
  efdf2: ['PCL - OFF'],
  efdf3: ['INTERCEPT ELP'],
  efdf4: ['AIRSTART - ATTEMPT IF WARRANTED'],
  efdf5: ['FIREWALL SHUTOFF HANDLE - PULL'],
  efdf6: ['EXECUTE FORCED LANDING OR EJECT'],
  
  // IMMEDIATE AIRSTART (PMU NORM)
  ia1: ['PCL - OFF'],
  ia2: ['STARTER SWITCH - AUTO/RESET'],
  ia3: ['PCL - IDLE, ', 'ABOVE 13% N1'],
  ia4: ['ENGINE INSTRUMENTS - MONITOR ITT, ', 'N1, ', 'AND OIL PRESSURE'],
  ia5: ['PCL - OFF'],
  ia6: ['FIREWALL SHUTOFF HANDLE - PULL'],
  ia7: ['EXECUTE FORCED LANDING OR EJECT'],
  ia8: ['PCL AS REQUIRED ', 'AFTER N1 REACHES IDLE RPM (APPROXIMATELY 67% N1)'],
  ia9: ['PEL - EXECUTE'],
  
  // UNCOMMANDED POWER CHANGES / LOSS OF POWER/ UNCOMMANDED PROPELLER FEATHER
  upc1: ['PCL - MID RANGE'],
  upc2: ['PMU SWITCH - OFF'],
  upc3: ['PROP SYS CIRCUIT BREAKER (Left Front Console) - PULL, ', 'IF N\u200Bp STABLE BELOW 40%'],
  upc4: ['PCL - AS REQUIRED'],
  upc5: ['PEL - EXECUTE'],
  upc6: ['PROP SYS CIRCUIT BREAKER - RESET, AS REQUIRED'],
  upc7: ['PCL - OFF'],
  upc8: ['FIREWALL SHUTOFF HANDLE - PULL'],
  upc9: ['EXECUTE FORCED LANDING OR EJECT'],
  
  // COMPRESSOR STALLS
  cs1: ['PCL - SLOWLY RETARD BELOW STALL THRESHOLD'],
  cs2: ['DEFOG SWITCH - ON'],
  cs3: ['PCL - SLOWLY ADVANCE (AS REQUIRED)'],
  cs4: ['PEL - EXECUTE'],
  cs5: ['PCL - OFF'],
  cs6: ['FIREWALL SHUTOFF HANDLE - PULL'],
  cs7: ['EXECUTE FORCED LANDING OR EJECT'],
  
  // INADVERTENT DEPARTURE FROM CONTROLLED FLIGHT
  idcf1: ['PCL - IDLE'],
  idcf2: ['CONTROLS - NEUTRAL'],
  idcf3: ['ALTITUDE - CHECK'],
  idcf4: ['RECOVER FROM UNUSUAL ATTITUDE'],
  
  // FIRE IN FLIGHT
  fif1: ['PCL - OFF'],
  fif2: ['FIREWALL SHUTOFF HANDLE - PULL'],
  fif3: ['FORCED LANDING - EXECUTE'],
  fif4: ['EJECT (BOTH)'],
  fif5: ['PEL - EXECUTE'],
  
  // SMOKE AND FUME ELIMINATION/ELECTRICAL FIRE
  sfe1: ['OBOGS - CHECK (BOTH)'],
  sfe1a: ['OBOGS supply lever - ON'],
  sfe1b: ['OBOGS concentration lever - MAX'],
  sfe1c: ['OBOGS pressure lever - EMERGE\u200BNCY'],
  
  // CHIP DETECTOR WARNING
  cdw1: ['PCL - MINIMUM NECESSARY TO INTERCEPT ELP; AVOID UNNECESSARY PCL MOVEMENTS'],
  cdw2: ['PEL - EXECUTE'],
  
  // OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE
  osm1: ['TERMINATE MANEUVER'],
  osm2: ['CHECK OIL PRESSURE; IF OIL PRESSURE IS NORMAL, CONTINUE OPERATIONS'],
  osm3: ['PCL - MINIMUM NECESSARY TO INTERCEPT ELP; AVOID UNNECESSARY PCL MOVEMENTS'],
  osm4: ['PEL - EXECUTE'],
  
  // LOW FUEL PRESSURE
  lfp1: ['PEL - EXECUTE'],
  lfp2: ['BOOST PUMP SWITCH - ON'],
  
  // HIGH FUEL FLOW
  hff1: ['PEL - EXECUTE'],
  
  // OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS
  obogs1: ['GREEN RING - PULL (AS REQUIRED) (BOTH)'],
  obogs2: ['DESCENT BELOW 10,000 FEET MSL - INITIATE'],
  obogs3: ['OBOGS SUPPLY LEVER - OFF (BOTH)'],
  
  // EJECT
  eject1: ['EJECTION HANDLE - PULL (BOTH)'],
  
  // LANDING EMERGENCIES
  // FORCED LANDING
  fl1: ['AIRSPEED - 125 KIAS PRIOR TO EXTENDING LANDING GEAR'],
  fl2: ['EMER LDG GR HANDLE - PULL (AS REQUIRED)'],
  fl3: ['AIRSPEED - 120 KIAS MINIMUM UNTIL INTERCEPTING FINAL; 110 KIAS MINIMUM ON FINAL'],
  fl4: ['FLAPS - AS REQUIRED'],
  
  // PRECAUTIONARY EMERGENCY LANDING (PEL)
  pel1: ['TURN TO NEAREST SUITABLE FIELD'],
  pel2: ['CLIMB OR ACCELERATE TO INTERCEPT ELP'],
  pel3: ['GEAR, ', 'FLAPS, ', 'SPEED BRAKE - UP']
};

export const EP_NWC = {
  asT: {
    notes: [
      "Note and report to maintenance the degree and duration of any overtemperature."
    ],
    warnings: [],
    cautions: []
  },
  as1: {
    notes: [
      "If start is initiated with PCL in the OFF position, abort by reselecting AUTO/RESET on the STARTER switch. If start is initiated with PCL out of the OFF position, but not past the IDLE gate, abort by placing the PCL to OFF or reselecting AUTO/RESET on the STARTER switch. If the PCL is past the IDLE gate, abort by placing the PCL to OFF."
    ],
    warnings: [],
    cautions: []
  },
  as2: {
    notes: [
      "During ground starts, certain parameters (weak battery, high OAT, high pre-start ITT, high density altitude, tailwind) may cause the PMU to abort a battery start attempt. Though these parameters are not directly monitored by the PMU, they cause a rate of rise in N1 and/or ITT that are indicative of an impending hung or hot start.",
      "If a battery start was aborted (PMU or manual abort), connect external power (if available) and perform Motoring Run Procedure. Subsequent starts may be attempted if no engine malfunctions are evident and no limits have been exceeded."
    ],
    warnings: [],
    cautions: [
      "If a start using external power is either aborted by the PMU, or manually aborted for a hot, hung, or no start, do not attempt subsequent starts.",
      "Repeated PMU aborted start attempts are indicative of engine malfunction."
    ]
  },
  mrp4: {
    notes: [
      "Observe starter duty cycle cool-down period."
    ],
    warnings: [],
    cautions: [
      "STARTER switch is not spring-loaded from MANUAL to NORM."
    ]
  },
  egeT: {
    notes: [
      "In a situation requiring immediate ground egress, the ejection system has the capability for 0/0 ejection."
    ],
    warnings: [],
    cautions: []
  },
  ege1: {
    notes: [],
    warnings: [
      "Failure to ensure that the ISS mode selector is set to SOLO may result in the inadvertent ejection of one or both seats."
    ],
    cautions: []
  },
  ege2: {
    notes: [],
    warnings: [
      "Failure to insert both ejection seat safety pins (if occupied) before ground egress may result in inadvertent activation of ejection sequence and subsequent injury or death when performing emergency ground egress."
    ],
    cautions: []
  },
  ege6: {
    notes: [],
    warnings: [
      "If the canopy fracturing system malfunctions in conjunction with a canopy latch failure in the locked position, ejection may be the only option remaining to exit the aircraft. Aircrew shall remove the ejection seat safety pin and ensure shoulder straps, lap straps, and leg restraint garters are still attached prior to pulling ejection handle.",
      "To prevent injury, ensure oxygen mask is on and visor is down prior to actuating the CFS system.",
      "Each internal CFS handle activates only the CFS charge for the respective transparency. Both internal CFS handles must be activated in order to fracture both transparencies (if required)."
    ],
    cautions: []
  },
  ege7: {
    notes: [
      "Oxygen hose, emergency oxygen hose, communication leads, and anti-G suit hose will pull free while vacating cockpit and leg restraint lines will pull through leg restraint garter D rings if released with quick-release lever."
    ],
    warnings: [],
    cautions: []
  },
  abort2: {
    notes: [],
    warnings: [
      "After a stop which required maximum effort braking and if overheated brakes are suspected, do not taxi into or park in a congested area until brakes have had sufficient time to cool. Do not set parking brake."
    ],
    cautions: []
  },
  efiatT: {
    notes: [],
    warnings: [
      "If insufficient runway remains to land straight ahead, consider immediate ejection.",
      "Do not sacrifice aircraft control while troubleshooting or lowering gear with emergency system."
    ],
    cautions: []
  },
  efiat2: {
    notes: [
      "The pilot should select IDLE to use the increased drag of the not yet feathered propeller or select OFF to reduce the sink rate."
    ],
    warnings: [],
    cautions: []
  },
  efiat3: {
    notes: [
      "With a loss of hydraulic pressure, landing gear and flaps cannot be lowered by normal means."
    ],
    warnings: [],
    cautions: []
  },
  efdfT: {
    notes: [
      "If experiencing uncommanded power changes/loss of power/uncommanded propeller feather or compressor stalls, refer to appropriate procedure."
    ],
    warnings: [],
    cautions: []
  },
  efdf2: {
    notes: [
      "Propeller will not feather unless the PCL is fully in OFF."
    ],
    warnings: [],
    cautions: []
  },
  efdf3: {
    notes: [],
    warnings: [
      "If a suitable landing surface is available, turn immediately to intercept the nearest suitable point on the ELP. Any delay could result in insufficient gliding distance to reach a landing surface.",
      "Do not delay decision to eject below 2000 feet AGL."
    ],
    cautions: []
  },
  efdf4: {
    notes: [
      "Crosscheck N1 against other engine indications to assess condition of engine and determine if an airstart is warranted. At 125 KIAS, an engine which has flamed out will rotate below 8% N1 and indicate 0% N1. The engine oil pressure indicator may display oil pressures up to 4 psi with or without the engine seized."
    ],
    warnings: [
      "Airstart procedure is not recommended below 2000 feet AGL, as primary attention should be to eject or safely recover the aircraft."
    ],
    cautions: []
  },
  iaT: {
    notes: [],
    warnings: [
      "Airstart attempts outside of the airstart envelope may be unsuccessful or result in engine overtemperature. Consideration should be given to ensure airstarts are attempted within the airstart envelope (125-200 KIAS for sea level to 15,000 feet, or 135-200 KIAS for 15,001 to 20,000 feet)."
    ],
    cautions: []
  },
  ia1: {
    notes: [],
    warnings: [
      "Do not delay ejection while attempting airstart at low altitude if below 2000 feet AGL.",
      "PCL must be in OFF to feather the propeller, and ensure proper starter, ignition, boost pump, and PMU operation during airstart."
    ],
    cautions: [
      "Ensure PCL is in OFF; otherwise, fuel may be prematurely introduced during start."
    ]
  },
  ia2: {
    notes: [],
    warnings: [],
    cautions: [
      "If N1 does not rise within 5 seconds, discontinue the airstart attempt and proceed to IF AIRSTART IS UNSUCCESSFUL due to suspected mechanical failure."
    ]
  },
  ia3: {
    notes: [],
    warnings: [
      "Movement of the PCL above IDLE before N1 stabilizes at approximately 67% will cause an increase in fuel flow which may cause engine failure due to a severe ITT overtemperature."
    ],
    cautions: [
      "If there is no rise in ITT within 10 seconds after fuel flow indications, place the PCL to OFF and abort the start."
    ]
  },
  ia10: {
    notes: [],
    warnings: [],
    cautions: [
      "Continuous operation with the BOOST PUMP switch in the ON position will cause damage to the engine-driven low pressure fuel pump. Upon landing, notify maintenance of the duration of flight with BOOST PUMP switch in the ON position."
    ]
  },
  ia13: {
    notes: [
      "If generator will not reset, verify the STARTER switch is in NORM. The starter will drain battery power in 10 minutes if left in MANUAL."
    ],
    warnings: [],
    cautions: []
  },
  upc1: {
    notes: [
      "Mid range is a physical PCL angle that approximates the midway position between IDLE and MAX.",
      "A PCL position above IDLE will provide the best chance for the engine to recover.",
      "A mid-range PCL position will minimize the potential of engine overtorque and/or overtemperature when the PMU is turned OFF."
    ],
    warnings: [],
    cautions: []
  },
  upc2: {
    notes: [],
    warnings: [],
    cautions: [
      "There is a potential for ITT limits to be exceeded if the PMU switch is turned OFF with ITT ≥820 °C.",
      "Ground idle will not be available during landing rollout and taxi. Plan for increased landing distances due to higher IDLE N1 (approximately 67%)."
    ]
  },
  upc3: {
    notes: [
      "With constant airspeed and torque, RPM can be considered stable if below 40% and no upward change for a 3-second period.",
      "If NP indicator is displaying red X's, switching the PMU to NORM and back OFF will reset the PMU and should restore the NP indication.",
      "Propeller should come out of feather within 15-20 seconds."
    ],
    warnings: [],
    cautions: []
  },
  upc4: {
    notes: [
      "The pilot should consider moving the PCL through the full range of motion to determine power available."
    ],
    warnings: [
      "If rate of descent (indicated on the VSI while stabilized at 125 KIAS with gear, flaps, and speed brake retracted and 4-6% torque) is greater than 1500 ft/min, increase torque as necessary (up to 131%) to achieve approximately 1350-1500 ft/min rate of descent. If engine power is insufficient to produce a rate of descent less than 1500 ft/min, set PCL to OFF."
    ],
    cautions: []
  },
  upc6: {
    notes: [],
    warnings: [
      "With the PROP SYS circuit breaker pulled and the PMU switch OFF, the feather dump solenoid will not be powered. The propeller will feather at a slower rate as oil pressure decreases and the feathering spring takes effect. Glide performance will be considerably reduced and it may not be possible to intercept or fly the emergency landing pattern."
    ],
    cautions: []
  },
  upcD: {
    notes: [],
    warnings: [],
    cautions: [
      "Consideration should be given to leaving the engine operating with PCL at mid range."
    ]
  },
  cs2: {
    notes: [
      "Setting the DEFOG switch to ON automatically selects high bleed air inflow and will alleviate back pressure on the engine compressor."
    ],
    warnings: [],
    cautions: []
  },
  cs5: {
    notes: [],
    warnings: [
      "When the engine is so underpowered that high rates of descent occur, any delay in shutting down the engine to feather the propeller may result in insufficient altitude to reach a suitable landing site."
    ],
    cautions: []
  },
  idcf2: {
    notes: [
      "Cycling of control positions or applying anti-spin controls prematurely can aggravate aircraft motion and significantly delay recovery."
    ],
    warnings: [
      "Improperly positioning the control stick/elevator aft of the neutral position may significantly delay or prevent the aircraft from recovering from an OCF/spin which could result in loss of aircraft and/or crew."
    ],
    cautions: []
  },
  idcf3: {
    notes: [],
    warnings: [
      "Recommended minimum altitude for ejection is 6000 feet AGL."
    ],
    cautions: []
  },
  idcf4: {
    notes: [],
    warnings: [],
    cautions: [
      "Power-on and inverted departures or spins will result in high loads on the engine and torque shaft. If an inverted or power-on departure is encountered, land as soon as conditions permit. The pilot should suspect possible engine damage and may experience unusual engine operation accompanied by low oil pressure or CHIP detector warning. In all cases of inverted or power-on departures, the engine shall be inspected by qualified maintenance personnel after flight."
    ]
  },
  fifD: {
    notes: [],
    warnings: [
      "Illumination of the fire warning light accompanied by one or more of the following indications is confirmation of an engine fire: smoke; flames; engine vibration; unusual sounds; high ITT; and fluctuating oil pressure, oil temperature, or hydraulic pressure."
    ],
    cautions: []
  },
  fif5: {
    notes: [],
    warnings: [
      "A fire warning light with no accompanying indication is not a confirmed fire. Do not shut down an engine for an unconfirmed fire.",
      "High engine compartment temperatures resulting from a bleed air leak may cause illumination of the fire warning light. Reducing the PCL setting towards IDLE will decrease the amount of bleed air and possibly extinguish the fire warning light; however, advancing the PCL might be required to intercept the ELP. Regardless of reducing or advancing the PCL, continue to investigate for indications confirming an engine fire.",
      "If the fire cannot be confirmed, the fire warning system may be at fault and should be tested as conditions permit. If only one fire loop annunciator is illuminated (top or bottom half only), a false fire indication may exist if the other loop tests good."],
    cautions: []
  },
  sfeT: {
    notes: [
      "If a faulty component can be identified as the source of smoke and fumes, turn defective unit off or pull respective circuit breaker. Circuit breakers for items on the hot battery bus are not accessible in flight.",
      "Selecting RAM/DUMP does not shut off bleed air inflow.",
      "Defog is turned off when RAM/DUMP is selected.",
      "Recover aircraft without electrical power if possible. If IMC penetration is required, turn the auxiliary battery on. Backup flight instrument and lighting, fire detection (FIRE 1 only), and VHF radio (tuning through standby VHF control unit) will be powered for approximately 30 minutes. Landing gear must be extended by emergency means. The flap lever is powered through the hot battery bus and should function as long as the main battery has not depleted. With normal flap extension and a loss of power to the battery bus, flaps will retract. Gear and flap indicators, as well as exterior lighting, will not be powered. Unless the faulty component has been isolated, further restoration of electrical power is not recommended.",
      "With the battery and generator off, the landing gear must be extended using the emergency landing gear extension system."
    ],
    warnings: [
      "Under varying conditions of fire and/or smoke where aircraft control is jeopardized, the pilot has the option of actuating CFS or ejecting.",
      "OBOGS will be inoperative once the main battery is depleted or with battery failure.",
      "To prevent injury, ensure oxygen mask is on and visor is down prior to actuating the CFS system."
    ],
    cautions: []
  },
  cdw1: {
    notes: [],
    warnings: [],
    cautions: [
      "Higher power settings may aggravate the existing condition."
    ]
  },
  osmT:{
    notes: ["Use this procedure for any of the following: red OIL PX annunciator illuminated, amber OIL PX annunciator illuminated, oil pressure fluctuations, oil temperature out of limits, or visibly confirmed leaking oil from the aircraft.",
      "If OIL PX warning illuminates and oil pressure indicates <5 psi, check OIL TRX circuit breaker on the battery bus circuit breaker panel (left front console). If the circuit breaker is open, it may be reset.",
      "Due to the sensitivity of the signal conditioning unit, a single, momentary illumination of the amber OIL PX caution while maneuvering is possible but may not indicate a malfunction.",
      "Illumination of both red and amber OIL PX message while the oil pressure gage indicates normal pressure indicates an SCU failure."
    ],
    warnings: [],
    cautions: []
  },
  osm3: {
    notes: [],
    warnings: [],
    cautions: [
      "Higher power settings may aggravate the existing condition."
    ]
  },
  lfp1: {
    notes: [
      "If the FUEL PX warning remains illuminated, the engine-driven high pressure fuel pump is suction feeding. Engine operation with high pressure pump suction feeding is limited to 10 hours."
    ],
    warnings: [],
    cautions: []
  },
  lfp2: {
    notes: [],
    warnings: [],
    cautions: [
      "Unless a greater emergency exists, do not reset BOOST PUMP circuit breaker (left front console) if open."
    ]
  },
  hff1: {
    notes: [],
    warnings: [
      "Higher power settings accompanied by high ITT may aggravate the existing condition. However, if ITT is within limits reducing power could result in engine flameout."
    ],
    cautions: []
  },
  obogs1: {
    notes: [
      "If physiological symptoms are recognized, immediate access to a pure and secure source of oxygen is the best course of action to expedite recovery. If the cockpit altitude is above 10,000 feet, pulling the GREEN RING is required since ambient cockpit air contains insufficient oxygen pressure to support physiological requirements. At a cockpit altitude of 10,000 feet or below, pulling the GREEN RING is optional as ambient cockpit air contains sufficient oxygen pressure to support physiological requirements.",
      "When the emergency oxygen system is actuated, high pressure air may make verbal communication with the other crewmember or ATC more difficult.",
      "Once activated, ejection seat emergency oxygen cannot be shut off and will provide oxygen flow until the cylinder is depleted (10 minutes). Since the emergency oxygen system is not regulated, it is normal for pressure to gradually decrease to the point it feels like the oxygen is depleted before reaching 10 minutes of use, however oxygen is still being supplied.",
      "Sharply pull the green ring up and aft to activate the emergency oxygen system. Several up and aft pull attempts may be required to fully activate oxygen flow.",
      "Pull force to activate the emergency oxygen system may be as high as 40 pounds."
    ],
    warnings: [
      "Emergency oxygen bottle provides approximately 10 minutes of oxygen. If aircraft pressure altitude is above 10,000 feet MSL, ensure the aircraft reaches an altitude of 10,000 feet MSL or lower prior to exhaustion of the emergency oxygen supply or the effects of hypoxia may incapacitate the crew.",
      "The OBOGS concentrator may malfunction resulting in zeolite dust in the breathing system without an illumination of the OBOGS FAIL light. Indications of this malfunction include respiratory irritation, coughing, or the presence of white dust in the oxygen mask. Inhalation of zeolite dust should be avoided."
    ],
    cautions: [
      "When breathing oxygen under increased pressure, breathe at a rate and depth slightly less than normal to preclude hyperventilation."
    ]
  },
  obogsT: {
    notes: [],
    warnings: [],
    cautions: [
      "Illumination of the OBOGS TEMP message indicates a failure of the OBOGS heat exchanger, and is considered a failure of the OBOGS system."
    ]
  },
  obogs5: {
    notes: [
      "As the emergency oxygen flow decreases, breathing through the CRU-60/P anti-suffocation valve will become increasingly noticeable and uncomfortable."
    ],
    warnings: [],
    cautions: []
  },
  obogs6: {
    notes: [
      "Selecting RAM/DUMP does not shut off bleed air inflow.",
      "Defog is turned off when RAM/DUMP is selected."
    ],
    warnings: [],
    cautions: []
  },
  obogs8: {
    notes: [],
    warnings: [
      "Oxygen mask must be on and secure before actuating CFS or initiating ejection."
    ],
    cautions: []
  },
  obogs9: {
    notes: [],
    warnings: [
      "If physiological symptoms persist and the pilot(s) feel unsafe to land, maintain below 10,000 feet MSL as long as practical before considering ejection."
    ],
    cautions: []
  },
  eject1: {
    notes: [
      "If ejecting at low speed, one or both sets of risers may remain velcroed together following seat separation. This may create a slight increase in descent rate and/or an uncommanded turn. Manually separate the risers if time permits. The steering lines (toggles) are located on the backside of each of the front risers. To counter any uncommanded turns, unstow the opposite steering line or use risers for controllability."
    ],
    warnings: [
      "To avoid injury, grasp handle and pull sharply toward abdomen, keeping elbows against the body.",
      "The emergency escape system incorporates an explosive canopy fracturing system. The force of detonation blows numerous shards and small fragments outward from the canopy and into the cockpit. Some metallic fragments may be extremely hot and may cause burns upon contact with the skin. Aircrew should ensure exposed skin is covered, the oxygen mask is on, and visor is down prior to ejection or actuating the CFS system to prevent injury from shards and hot fragments.",
      "When ejecting over mountainous terrain exceeding 8000 feet MSL, the manual override (MOR) handle should be used to manually separate from the seat and deploy the parachute."
    ],
    cautions: []
  },
  flT: {
    notes: [],
    warnings: [
      "Aircraft may float while approaching touchdown with the propeller feathered more than observed while conducting practice forced landing at 4-6% torque. Energy management is critical to achieving targeted touchdown position. Landing ground roll distance will increase with the propeller feathered.",
      "Landing on an unprepared surface may cause structural damage making it impossible to open the canopy or fracture it using the CFS.",
      "Engine failure or shutdown will completely disable the bleed air system. Depending on environmental conditions, this may cause significant canopy icing and/or fogging, and severely hamper visibility, especially from the rear cockpit."
    ],
    cautions: [
      "Ejection is recommended if a suitable landing area is not available. If circumstances dictate an emergency landing and ejection is not possible or the ejection system malfunctions, the pilot may perform an ELP to an unprepared surface or ditch the aircraft. The aircraft structure can survive either type of forced landing; however, the risk of injury increases significantly due to crash loads and the complexity of ground or water egress.",
      "Inducing yaw (side slipping) with a known engine/oil malfunction could result in impaired windshield visibility due to oil leakage spraying onto the windshield."]
  },
  fl2: {
    notes: [
      "Normal safe indications with electrical power, when the emergency extension system has been used to lower the gear, are two green main gear lights, two red main door lights, green nose gear light, and red light in handle."
    ],
    warnings: [
      "If landing on an unprepared surface or ditching, do not extend the landing gear. Flaps will not be available without emergency gear extension."
    ],
    cautions: []
  },
  fl4: {
    notes: [
      "Selecting either TO or LDG flaps will extend the flaps to the commanded position if the landing gear has been extended using the emergency extension system and if battery power is available.",
      "Landing gear/flap retraction is not possible when the emergency extension system has been used.",
      "Nose wheel steering is unavailable with an inoperative engine. Maintain directional control with rudder and differential braking."
    ],
    warnings: [
      "Do not lower flaps LDG until landing is assured. Drag will increase dramatically once landing flaps are lowered."
    ],
    cautions: []
  },
  fl6: {
    notes: [
      "Activating the ELT at a higher altitude will transmit emergency signal for a longer distance and could aid in rescue/recovery."
    ],
    warnings: [],
    cautions: []
  },
  pelT: {
    notes: [
      "Do not set the boost pump and ignition to ON for engine malfunctions, such as oil system, chip light, fire, or FOD. In these cases, turning the boost pump ON may provide an undesirable immediate relight.",
      "With uncontrollable high power, the pilot must shut down the engine once landing is assured."
    ],
    warnings: [
      "If the engine should fail while flying the PEL, refer to the Engine Failure During Flight checklist, and transition to the Forced Landing procedure.",
      "If rate of descent (indicated on the VSI while stabilized at 125 KIAS with gear, flaps, and speed brake retracted and 4 to 6% torque) is greater than 1500 ft/min, increase torque as necessary (up to 131%) to achieve approximately 1350 to 1500 ft/min rate of descent. If engine power is insufficient to produce a rate of descent less than 1500 ft/min, set PCL to OFF.",
      "Once on profile, if engine is vibrating excessively, or if indications of failure are imminent, set PCL to OFF.",
      "Engine failure or shutdown will completely disable the bleed air system. Depending on environmental conditions, this may cause significant canopy icing and/or fogging, severely hampering visibility, especially from the rear cockpit."
    ],
    cautions: [
      "Inducing yaw (side slipping) with a known engine/oil malfunction could result in impaired windshield visibility due to oil leakage spraying onto the windshield.",
      "At higher temperature and pressure altitudes, power response will be delayed. Airspeeds below 110 KIAS on ELP final, in combination with transitioning to a high flare, may lead to a hard landing resulting in landing gear component failure."
    ]
  }
};

export const EP_LENGTHS = [1, 3, 9, 2, 4, 6, 9, 9, 7, 4, 5, 4, 2, 4, 2, 1, 3, 1, 4, 3];

export const EP_TITLES = [
  "ABORT START PROCEDURE",
  "EMERGENCY ENGINE SHUTDOWN ON THE GROUND",
  "EMERGENCY GROUND EGRESS",
  "ABORT",
  "ENGINE FAILURE IMMEDIATELY AFTER TAKEOFF",
  "ENGINE FAILURE DURING FLIGHT",
  "IMMEDIATE AIRSTART (PMU NORM)",
  "UNCOMMANDED POWER CHANGES / LOSS OF POWER/ UNCOMMANDED PROPELLER FEATHER",
  "COMPRESSOR STALLS",
  "INADVERTENT DEPARTURE FROM CONTROLLED FLIGHT",
  "FIRE IN FLIGHT",
  "SMOKE AND FUME ELIMINATION/ELECTRICAL FIRE",
  "CHIP DETECTOR WARNING",
  "OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE",
  "LOW FUEL PRESSURE",
  "HIGH FUEL FLOW",
  "OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS",
  "EJECT",
  "FORCED LANDING",
  "PRECAUTIONARY EMERGENCY LANDING (PEL)"
];

// Full EP mode includes both memory and non-memory items
export const EP_FULL_ANSWERS = {
  // All existing EP answers
  ...EP_ANSWERS,

  // ABORT START PROCEDURE - Additional non-memory step
  as2: ['Perform Motoring Run Procedure'],

  // MOTORING RUN PROCEDURE - All non-memory steps
  mrp1: ['PCL - OFF'],
  mrp2: ['IGNITION switch - NORM'],
  mrp3: ['Pro\u200Bpe\u200Bller area - Clear'],
  mrp4: ['STARTER switch - MANUAL for 20 seconds'],
  mrp5: ['STARTER switch - NORM'],

  // SMOKE AND FUME ELIMINATION/ELECTRICAL FIRE - Additional non-memory steps
  sfe2: ['Descent below 10,000 ft MSL - Initiate (as required)'],
  sfe3: ['PRESSURIZATION switch - RAM/DUMP'],
  sfe4: ['BLEED AIR INFLOW switch - OFF'],
  sfe5: ['BAT\u200B', 'and GEN switches - OFF'],
  sfe6: ['AUX BAT switch - OFF (as required)'],
  sfe7: ['CFS handle safety pin - Remove (BOTH)'],
  sfe8: ['CFS - Rotate 90° counterc\u200Blockwise and pull (if necessary)'],
  sfe9: ['Restore electrical power - As required'],
  sfe10: ['Land as soon as possible'],

  // IMMEDIATE AIRSTART - Additional non-memory steps
  ia10: ['Confirm the position of the following: a. BOOST PUMP switch - ON', ' b. IGNITION switch - ON'],
  ia11: ['STARTER switch - NORM'],
  ia12: ['BLEED AIR INFLOW switch - NORM'],
  ia13: ['GEN switch - Verify ON, reset if necessary'],
  ia14: ['OBOGS - As required'],

  // OBOGS FAILURE - Additional non-memory steps
  obogs4: ['Emerg\u200Bency oxyge\u200Bn hose - Check (BOTH)'],
  obogs5: ['Rate and depth of breathing - Normalize (BOTH)'],
  obogs6: ['PRESSURIZATION switch - RAM/DUMP'],
  obogs7: ['BLEED AIR INFLOW switch - OFF'],
  obogs8: ['Oxyge\u200Bn mask - Remove (as required) (BOTH)'],
  obogs9: ['Land as soon as practical'],

  // FORCED LANDING - Additional non-memory steps
  fl5: ['Distress call - Transmit'],
  fl6: ['ELT switch - As required'],
  fl7: ['Transponder - 7700 (as required)'],
  fl8: ['Harness - Locked (BOTH)'],
  fl9: ['Emerg\u200Bency Ground Egress procedure - Execute (as required)'],

  // PRECAUTIONARY EMERGENCY LANDING - Additional non-memory steps
  pel4: ['Conduct a systematic check of aircraft and instruments for additional signs of impending engine failure'],
  pel5: ['BOOST PUMP switch - As required'],
  pel6: ['IGNITION switch - As required'],
  pel7: ['Plan to intercept emerg\u200Bency landing pattern at or below high key in appropriate configuration and a minimum airspeed of 120 KIAS']
};

export const EP_FULL_LENGTHS = [2, 5, 3, 9, 2, 4, 6, 14, 9, 7, 4, 5, 13, 2, 4, 2, 1, 9, 1, 9, 7];

export const EP_FULL_TITLES = [
  "ABORT START PROCEDURE",
  "MOTORING RUN PROCEDURE",
  "EMERGENCY ENGINE SHUTDOWN ON THE GROUND",
  "EMERGENCY GROUND EGRESS",
  "ABORT",
  "ENGINE FAILURE IMMEDIATELY AFTER TAKEOFF",
  "ENGINE FAILURE DURING FLIGHT",
  "IMMEDIATE AIRSTART (PMU NORM)",
  "UNCOMMANDED POWER CHANGES / LOSS OF POWER/ UNCOMMANDED PROPELLER FEATHER",
  "COMPRESSOR STALLS",
  "INADVERTENT DEPARTURE FROM CONTROLLED FLIGHT",
  "FIRE IN FLIGHT",
  "SMOKE AND FUME ELIMINATION/ELECTRICAL FIRE",
  "CHIP DETECTOR WARNING",
  "OIL SYSTEM MALFUNCTION OR LOW OIL PRESSURE",
  "LOW FUEL PRESSURE",
  "HIGH FUEL FLOW",
  "OBOGS FAILURE/OVERTEMP/PHYSIOLOGICAL SYMPTOMS",
  "EJECT",
  "FORCED LANDING",
  "PRECAUTIONARY EMERGENCY LANDING (PEL)"
];