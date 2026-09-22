import React, { useState, useEffect } from 'react';

function ToldCard() {
  const [toldData, setToldData] = useState({
    basicEmptyWt: { weight: '', arm: '', moment: '' },
    pilotFront: { weight: '', arm: '37', moment: '' },
    rearSeat: { weight: '', arm: '73', moment: '' },
    baggage: { weight: '10', arm: '95', moment: '' },
    fuel: { weight: '228', arm: '48', moment: '' },
    rampWt: { weight: '', arm: '', moment: '' },
    startTaxiRunup: { weight: '7', arm: '48', moment: '' },
    takeoffWt: { weight: '', arm: '', moment: '' },
    estFuelBurn: { weight: '100', arm: '48', moment: '' },
    landingWt: { weight: '', arm: '', moment: '' }
  });

  const [isFirstStudent, setIsFirstStudent] = useState(true);

  // Calculate moments and summary rows when input values change
  useEffect(() => {
    const newData = { ...toldData };
    
    // Calculate pilot/front moment (auto-calculated)
    if (newData.pilotFront.weight && newData.pilotFront.arm) {
      const moment = parseFloat(newData.pilotFront.weight) * parseFloat(newData.pilotFront.arm);
      newData.pilotFront.moment = isNaN(moment) ? '' : moment.toFixed(0);
    } else {
      newData.pilotFront.moment = '';
    }
    
    // Calculate rear seat moment (auto-calculated)
    if (newData.rearSeat.weight && newData.rearSeat.arm) {
      const moment = parseFloat(newData.rearSeat.weight) * parseFloat(newData.rearSeat.arm);
      newData.rearSeat.moment = isNaN(moment) ? '' : moment.toFixed(0);
    } else {
      newData.rearSeat.moment = '';
    }
    
    // Calculate baggage moment (auto-calculated)
    if (newData.baggage.weight && newData.baggage.arm) {
      const moment = parseFloat(newData.baggage.weight) * parseFloat(newData.baggage.arm);
      newData.baggage.moment = isNaN(moment) ? '' : moment.toFixed(0);
    } else {
      newData.baggage.moment = '';
    }
    
    // Calculate fuel moment (auto-calculated)
    if (newData.fuel.weight && newData.fuel.arm) {
      const moment = parseFloat(newData.fuel.weight) * parseFloat(newData.fuel.arm);
      newData.fuel.moment = isNaN(moment) ? '' : moment.toFixed(0);
    } else {
      newData.fuel.moment = '';
    }
    
    // Calculate basic empty weight arm (auto-calculated from weight and moment)
    if (newData.basicEmptyWt.weight && newData.basicEmptyWt.moment) {
      const weight = parseFloat(newData.basicEmptyWt.weight);
      const moment = parseFloat(newData.basicEmptyWt.moment);
      if (weight > 0) {
        const arm = moment / weight;
        newData.basicEmptyWt.arm = isNaN(arm) ? '' : arm.toFixed(2);
      } else {
        newData.basicEmptyWt.arm = '';
      }
    } else {
      newData.basicEmptyWt.arm = '';
    }
    
    // Calculate start/taxi/runup moment (auto-calculated, but user can edit weight and arm)
    if (newData.startTaxiRunup.weight && newData.startTaxiRunup.arm) {
      const moment = parseFloat(newData.startTaxiRunup.weight) * parseFloat(newData.startTaxiRunup.arm);
      newData.startTaxiRunup.moment = isNaN(moment) ? '' : moment.toFixed(0);
    } else {
      newData.startTaxiRunup.moment = '';
    }
    
    // Calculate est fuel burn moment (auto-calculated, but user can edit weight and arm)
    if (newData.estFuelBurn.weight && newData.estFuelBurn.arm) {
      const moment = parseFloat(newData.estFuelBurn.weight) * parseFloat(newData.estFuelBurn.arm);
      newData.estFuelBurn.moment = isNaN(moment) ? '' : moment.toFixed(0);
    } else {
      newData.estFuelBurn.moment = '';
    }
    
    // Calculate ramp weight and moment (auto-calculated)
    const basicWeight = parseFloat(newData.basicEmptyWt.weight) || 0;
    const basicMoment = parseFloat(newData.basicEmptyWt.moment) || 0;
    const pilotWeight = parseFloat(newData.pilotFront.weight) || 0;
    const pilotMoment = parseFloat(newData.pilotFront.moment) || 0;
    const rearWeight = parseFloat(newData.rearSeat.weight) || 0;
    const rearMoment = parseFloat(newData.rearSeat.moment) || 0;
    const baggageWeight = parseFloat(newData.baggage.weight) || 0;
    const baggageMoment = parseFloat(newData.baggage.moment) || 0;
    const fuelWeight = parseFloat(newData.fuel.weight) || 0;
    const fuelMoment = parseFloat(newData.fuel.moment) || 0;
    
    const rampWeight = basicWeight + pilotWeight + rearWeight + baggageWeight + fuelWeight;
    const rampMoment = basicMoment + pilotMoment + rearMoment + baggageMoment + fuelMoment;
    
    if (rampWeight > 0) {
      newData.rampWt.weight = rampWeight.toFixed(0);
      newData.rampWt.moment = rampMoment.toFixed(0);
      const rampArm = rampMoment / rampWeight;
      newData.rampWt.arm = rampArm.toFixed(2);
    } else {
      newData.rampWt.weight = '';
      newData.rampWt.moment = '';
      newData.rampWt.arm = '';
    }
    
    // Calculate takeoff weight and moment (auto-calculated)
    const startTaxiWeight = parseFloat(newData.startTaxiRunup.weight) || 0;
    const startTaxiMoment = parseFloat(newData.startTaxiRunup.moment) || 0;
    const takeoffWeight = rampWeight - startTaxiWeight;
    const takeoffMoment = rampMoment - startTaxiMoment;
    
    if (takeoffWeight > 0) {
      newData.takeoffWt.weight = takeoffWeight.toFixed(0);
      newData.takeoffWt.moment = takeoffMoment.toFixed(0);
      const takeoffArm = takeoffMoment / takeoffWeight;
      newData.takeoffWt.arm = takeoffArm.toFixed(2);
    } else {
      newData.takeoffWt.weight = '';
      newData.takeoffWt.moment = '';
      newData.takeoffWt.arm = '';
    }
    
    // Calculate landing weight and moment (auto-calculated)
    const fuelBurnWeight = parseFloat(newData.estFuelBurn.weight) || 0;
    const fuelBurnMoment = parseFloat(newData.estFuelBurn.moment) || 0;
    const landingWeight = takeoffWeight - fuelBurnWeight;
    const landingMoment = takeoffMoment - fuelBurnMoment;
    
    if (landingWeight > 0) {
      newData.landingWt.weight = landingWeight.toFixed(0);
      newData.landingWt.moment = landingMoment.toFixed(0);
      const landingArm = landingMoment / landingWeight;
      newData.landingWt.arm = landingArm.toFixed(2);
    } else {
      newData.landingWt.weight = '';
      newData.landingWt.moment = '';
      newData.landingWt.arm = '';
    }
    
    setToldData(newData);
  }, [
    toldData.basicEmptyWt.weight,
    toldData.basicEmptyWt.moment,
    toldData.pilotFront.weight,
    toldData.pilotFront.arm,
    toldData.rearSeat.weight,
    toldData.rearSeat.arm,
    toldData.baggage.weight,
    toldData.baggage.arm,
    toldData.fuel.weight,
    toldData.fuel.arm,
    toldData.startTaxiRunup.weight,
    toldData.startTaxiRunup.arm,
    toldData.estFuelBurn.weight,
    toldData.estFuelBurn.arm
  ]);

  const handleInputChange = (category, field, value) => {
    setToldData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleStudentChange = (isFirst) => {
    setIsFirstStudent(isFirst);
    // Update fuel based on student position
    const fuelGallons = isFirst ? 38 : 21;
    const fuelWeight = fuelGallons * 6; // 6 lbs per gallon
    setToldData(prev => ({
      ...prev,
      fuel: {
        ...prev.fuel,
        weight: fuelWeight.toString()
      }
    }));
  };

  // The heading comes from the page above, as Primary's TOLD card has it.
  return (
    <div className="told-card-container">

      <div className="told-header">
        <div className="told-header-item">
          <label>Student Position: </label>
          <select 
            value={isFirstStudent ? 'first' : 'second'}
            onChange={(e) => handleStudentChange(e.target.value === 'first')}
          >
            <option value="first">1st Student (38 gal)</option>
            <option value="second">2nd Student (21 gal)</option>
          </select>
        </div>
      </div>

      <table className="told-table">
        <thead>
          <tr>
            <th colSpan="2">Weight & Balance</th>
            <th>Weight (lbs)</th>
            <th>Arm (in)</th>
            <th>Moment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Basic Empty Wt.</td>
            <td>
              <input 
                type="number"
                value={toldData.basicEmptyWt.weight}
                onChange={(e) => handleInputChange('basicEmptyWt', 'weight', e.target.value)}
                placeholder="From myflighttrain"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.basicEmptyWt.arm}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.basicEmptyWt.moment}
                onChange={(e) => handleInputChange('basicEmptyWt', 'moment', e.target.value)}
                placeholder="From myflighttrain"
              />
            </td>
          </tr>
          
          <tr>
            <td>2</td>
            <td>Pilot/Front Pax</td>
            <td>
              <input 
                type="number"
                value={toldData.pilotFront.weight}
                onChange={(e) => handleInputChange('pilotFront', 'weight', e.target.value)}
                placeholder="Actual weight"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.pilotFront.arm}
                onChange={(e) => handleInputChange('pilotFront', 'arm', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.pilotFront.moment}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
          
          <tr>
            <td>3</td>
            <td>Rear Seat</td>
            <td>
              <input 
                type="number"
                value={toldData.rearSeat.weight}
                onChange={(e) => handleInputChange('rearSeat', 'weight', e.target.value)}
                placeholder="If applicable"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.rearSeat.arm}
                onChange={(e) => handleInputChange('rearSeat', 'arm', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.rearSeat.moment}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
          
          <tr>
            <td>4</td>
            <td>Baggage</td>
            <td>
              <input 
                type="number"
                value={toldData.baggage.weight}
                onChange={(e) => handleInputChange('baggage', 'weight', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.baggage.arm}
                onChange={(e) => handleInputChange('baggage', 'arm', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.baggage.moment}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
          
          <tr>
            <td>5</td>
            <td>Fuel (6 lbs/gal)</td>
            <td>
              <input 
                type="number"
                value={toldData.fuel.weight}
                onChange={(e) => handleInputChange('fuel', 'weight', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.fuel.arm}
                onChange={(e) => handleInputChange('fuel', 'arm', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.fuel.moment}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
          
          <tr className="told-summary-row">
            <td>6</td>
            <td>Ramp Wt.</td>
            <td>
              <input 
                type="number"
                value={toldData.rampWt.weight}
                readOnly
                className="calculated-field"
                placeholder="Auto-sum"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.rampWt.arm}
                readOnly
                className="calculated-field"
                placeholder="Auto-CG"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.rampWt.moment}
                readOnly
                className="calculated-field"
                placeholder="Auto-sum"
              />
            </td>
          </tr>
          
          <tr>
            <td>7</td>
            <td>Start/Taxi/Runup</td>
            <td>
              <input 
                type="number"
                value={`-${toldData.startTaxiRunup.weight}`}
                onChange={(e) => {
                  const val = e.target.value.replace('-', '');
                  handleInputChange('startTaxiRunup', 'weight', val);
                }}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.startTaxiRunup.arm}
                onChange={(e) => handleInputChange('startTaxiRunup', 'arm', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={`-${toldData.startTaxiRunup.moment}`}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
          
          <tr className="told-summary-row">
            <td>8</td>
            <td>Takeoff Wt.</td>
            <td>
              <input 
                type="number"
                value={toldData.takeoffWt.weight}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.takeoffWt.arm}
                readOnly
                className="calculated-field"
                placeholder="Auto-CG"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.takeoffWt.moment}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
          
          <tr>
            <td>9</td>
            <td>Est. Fuel Burn</td>
            <td>
              <input 
                type="number"
                value={`-${toldData.estFuelBurn.weight}`}
                onChange={(e) => {
                  const val = e.target.value.replace('-', '');
                  handleInputChange('estFuelBurn', 'weight', val);
                }}
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.estFuelBurn.arm}
                onChange={(e) => handleInputChange('estFuelBurn', 'arm', e.target.value)}
              />
            </td>
            <td>
              <input 
                type="number"
                value={`-${toldData.estFuelBurn.moment}`}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
          
          <tr className="told-summary-row">
            <td>10</td>
            <td>Landing Wt.</td>
            <td>
              <input 
                type="number"
                value={toldData.landingWt.weight}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.landingWt.arm}
                readOnly
                className="calculated-field"
                placeholder="Auto-CG"
              />
            </td>
            <td>
              <input 
                type="number"
                value={toldData.landingWt.moment}
                readOnly
                className="calculated-field"
                placeholder="Auto-calc"
              />
            </td>
          </tr>
        </tbody>
      </table>
      
      <div className="told-notes">
        <h3>Instructions:</h3>
        <ul>
          <li>Line 1: Enter Basic Empty Weight and Moment from sw.myflighttrain.com → Schedules → Click on Tail Number</li>
          <li>Line 2: Enter total weight of front seat pilots (Instructor + Student actual weight)</li>
          <li>Line 3: Enter weight of any rear seat passenger (if applicable)</li>
          <li>Line 4: Baggage is pre-filled at 10 lbs (adjustable)</li>
          <li>Line 5: Fuel is calculated based on student position (38 gal for 1st, 21 gal for 2nd)</li>
          <li>Arms are pre-filled from POH standards (37, 73, 95, 48)</li>
          <li>Gray fields are automatically calculated</li>
          <li>Check CG limits using the POH charts</li>
        </ul>
      </div>
    </div>
  );
}

export default ToldCard;