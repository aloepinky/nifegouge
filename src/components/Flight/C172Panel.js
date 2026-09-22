import React, { useState } from 'react';

// NIFE's C172 control panel, either side of the EP on screen. Clicking a control writes that
// step into the EP (`fill(action, value)`, from EPDrill); a control that cycles (throttle,
// mixture, mags) rewrites the value of the step it just wrote. Each side keeps its own switch
// positions, and EPDrill remounts both whenever the EP or its answers are reset. `hint` is the
// action of the step Hint points at; the control that does it is ringed.

// ' epl-hint' on the control whose action is the hinted one. The mags key's START position
// writes "Cranking", so a Cranking hint rings the key.
const same = (a, b) => {
  const k = (x) => (/^cranking$/i.test(x || '') ? 'mags' : String(x || '').toLowerCase());
  return !!a && k(a) === k(b);
};
const ring = (hint, action) => (same(hint, action) ? ' epl-hint' : '');

const MAGS_ANGLES = { OFF: 270, LEFT: 315, RIGHT: 0, 'BOTH (Start if prop stopped)': 45, CONTINUE: 90 };

function snapMags(angle) {
  let best = 'OFF';
  let bestDiff = Infinity;
  for (const [name, a] of Object.entries(MAGS_ANGLES)) {
    let diff = Math.abs(angle - a);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) { best = name; bestDiff = diff; }
  }
  return best;
}

function Switch({ label, on, onClick, className = 'toggle-switch', hinted = '' }) {
  return (
    <div className={className}>
      <span className="switch-label">{label}</span>
      <div className={`switch-body vertical ${on ? 'on' : ''}${hinted}`} onClick={onClick}>
        <div className="switch-toggle" />
      </div>
    </div>
  );
}

const ACTIONS = [
  ['Airspeed', 'Airspeed', '68 KIAS'],
  ['TTNSLS', 'Turn Towards Nearest Suitable Landing Site'],
  ['Doors', 'Doors', 'UNLATCHED'],
  ['MAYDAY', 'Declare', 'MAYDAY'],
  ['Directional Control', 'Maintain Directional Control'],
  ['ESOD', 'Emergency Shutdown on Deck', 'EXECUTE'],
  ['Evacuate Aircraft', 'Aircraft', 'EVACUATE AS REQ'],
  ['Fire Extinguisher', 'Fire Extinguisher', 'ACTIVATE AS REQ'],
  ['Cabin Windows', 'Cabin Windows', 'OPEN AS REQ'],
  ['Land ASAP', 'Land As Soon As Possible'],
  ['Brakes', 'Brakes', 'AS REQ'],
];

export function C172LeftPanel({ fill, hint }) {
  const [switches, setSwitches] = useState({ master: true, avionics: true });
  const [mags, setMags] = useState('BOTH (Start if prop stopped)');
  const [dragAngle, setDragAngle] = useState(null);
  // Where the pointer rests. RIGHT is drawn at 360 rather than 0 when the key came to it from
  // the west, so the pointer turns the short way.
  const [rest, setRest] = useState(MAGS_ANGLES[mags]);

  const toggle = (name, label) => {
    const on = !switches[name];
    setSwitches((s) => ({ ...s, [name]: on }));
    fill(label, on ? 'ON' : 'OFF');
  };

  const magsRotation = () => (dragAngle !== null ? dragAngle : rest);

  const onMagsDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let final = MAGS_ANGLES[mags];
    const move = (m) => {
      let a = Math.atan2(m.clientY - cy, m.clientX - cx) * (180 / Math.PI) + 90;
      if (a < 0) a += 360;
      if (a >= 360) a -= 360;
      final = a;
      // The key turns from OFF (west) through north to START (east) and no further.
      setDragAngle(a >= 270 || a <= 90 ? a : a >= 180 ? 270 : 90);
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      const pos = snapMags(final);
      setMags(pos);
      setRest(pos === 'RIGHT' && final > 180 ? 360 : MAGS_ANGLES[pos]);
      setDragAngle(null);
      if (pos === 'CONTINUE') fill('Cranking', pos);
      else fill('Mags', pos);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  return (
    <div className="left-controls">
      <div className="control-section">
        <h4>Emergency Actions</h4>
        <div className="action-buttons">
          {ACTIONS.map(([label, action, value]) => (
            <button type="button" key={label} className={`action-button${ring(hint, action)}`} onClick={() => fill(action, value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-section">
        <h4>Engine Controls</h4>
        <div className="engine-controls-layout">
          <div className="engine-left">
            <div className={`primer-button${ring(hint, 'Primer')}`} onClick={() => fill('Primer', 'IN/LOCKED')}>PRIMER</div>
          </div>
          <div className="engine-center">
            <div className={`mags-dial ${dragAngle !== null ? 'dragging' : ''}`}>
              <div className={`dial-base${ring(hint, 'Mags')}`} onMouseDown={onMagsDown}>
                <div className="dial-pointer" style={{ '--rotation': `${magsRotation()}deg` }} />
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
          <div className="engine-right">
            <div className="horizontal-switches">
              <Switch className="toggle-switch vertical" label="MASTER" hinted={ring(hint, 'Master')} on={switches.master} onClick={() => toggle('master', 'Master')} />
              <Switch className="toggle-switch vertical" label="AVIONICS" hinted={ring(hint, 'Avionics Power Switch')} on={switches.avionics} onClick={() => toggle('avionics', 'Avionics Power Switch')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const THROTTLE = ['IDLE', '1700 RPM (5 sec)', 'FULL'];
const MIXTURE = ['IDLE CUTOFF', 'FULL RICH'];
const FUEL_ANGLES = { OFF: 180, LEFT: 270, BOTH: 0, RIGHT: 90 };

export function C172RightPanel({ fill, hint }) {
  const [throttle, setThrottle] = useState(2);
  const [mixture, setMixture] = useState(1);
  const [flaps, setFlaps] = useState(30);
  const [fuel, setFuel] = useState('BOTH');
  const [switches, setSwitches] = useState({ electrical: true, cabinHeat: true, vents: true });

  const toggle = (name, label) => {
    const on = !switches[name];
    setSwitches((s) => ({ ...s, [name]: on }));
    fill(label, on ? 'ON' : name === 'vents' ? 'CLOSED' : 'OFF');
  };

  const cycleThrottle = () => {
    const next = (throttle + 1) % THROTTLE.length;
    setThrottle(next);
    fill('Throttle', THROTTLE[next]);
  };

  const cycleMixture = () => {
    const next = (mixture + 1) % MIXTURE.length;
    setMixture(next);
    fill('Mixture', MIXTURE[next]);
  };

  const onFlapsDown = (e) => {
    e.preventDefault();
    const slider = e.currentTarget.parentElement;
    const move = (m) => {
      const rect = slider.getBoundingClientRect();
      const percent = Math.max(0, Math.min(80, ((m.clientY - rect.top) / rect.height) * 100));
      setFlaps(Math.round(((100 - percent) / 100) * 30));
      fill('Flaps', 'As Req');
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const onFuelClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const angle = Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2));
    const deg = (angle * (180 / Math.PI) + 450) % 360;
    const pos = deg >= 315 || deg < 45 ? 'BOTH' : deg < 135 ? 'RIGHT' : deg < 225 ? 'OFF' : 'LEFT';
    setFuel(pos);
    fill('Fuel Selector', pos);
  };

  return (
    <div className="right-controls">
      <div className="control-section">
        <h4>Flight Controls</h4>
        <div className="circular-buttons">
          <div className={`circular-button${ring(hint, 'Carb Heat')}`} onClick={() => fill('Carb Heat', 'ON')}>CARB<br />HEAT</div>
          <div className="button-with-state">
            <div className={`circular-button throttle-state-${throttle}${ring(hint, 'Throttle')}`} onClick={cycleThrottle}>THROTTLE</div>
            <div className="button-state-text">{['IDLE', '1700 RPM', 'FULL'][throttle]}</div>
          </div>
          <div className="button-with-state">
            <div className={`circular-button mixture-state-${mixture}${ring(hint, 'Mixture')}`} onClick={cycleMixture}>MIXTURE</div>
            <div className="button-state-text">{MIXTURE[mixture]}</div>
          </div>
          <div className="flaps-vertical-control">
            <div className="flaps-vertical-slider">
              <div className="flaps-vertical-track" />
              <div className={`flaps-vertical-handle${ring(hint, 'Flaps')}`} style={{ top: `${100 - (flaps / 30) * 100}%` }} onMouseDown={onFlapsDown} />
            </div>
            <div className="flaps-vertical-label">FLAPS</div>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h4>Electrical &amp; Cabin</h4>
        <div className="switch-row vertical-switches-style">
          <Switch label="ALL ELEC" hinted={ring(hint, 'All Electrical Equipment')} on={switches.electrical} onClick={() => toggle('electrical', 'All Electrical Equipment')} />
          <Switch label="CABIN HEAT" hinted={ring(hint, 'Cabin Heat / Air')} on={switches.cabinHeat} onClick={() => toggle('cabinHeat', 'Cabin Heat / Air')} />
          <Switch label="VENTS" hinted={ring(hint, 'Vents / Cabin Air')} on={switches.vents} onClick={() => toggle('vents', 'Vents / Cabin Air')} />
        </div>
      </div>

      <div className="control-section">
        <h4>Fuel Selector</h4>
        <div className="fuel-selector">
          <div className={`dial-base${ring(hint, 'Fuel Selector')}`} onClick={onFuelClick}>
            <div className="dial-pointer" style={{ '--rotation': `${FUEL_ANGLES[fuel] || 0}deg`, top: '10px' }} />
            <span className="dial-label off">OFF</span>
            <span className="dial-label left">LEFT</span>
            <span className="dial-label both">BOTH</span>
            <span className="dial-label right">RIGHT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
