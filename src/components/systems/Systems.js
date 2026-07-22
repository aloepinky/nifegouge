import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import T6BHydraulicDiagram from './hyds/T6BHydraulicDiagram';
import T6BElectricalDiagram from './elec/T6BElectricalDiagram';
import T6BPropDiagram from './prop/T6BPropDiagram';

function Systems() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'hyds';

  return (
    <div>
      <div className="sub-navbar" style={{ marginBottom: 0 }}>
        <span
          className={activeTab === 'hyds' ? 'active' : ''}
          onClick={() => navigate('/tw4/systems/hyds')}
          style={{ cursor: 'pointer' }}
        >
          Hydraulics
        </span>
        <span
          className={activeTab === 'elec' ? 'active' : ''}
          onClick={() => navigate('/tw4/systems/elec')}
          style={{ cursor: 'pointer' }}
        >
          Electrical
        </span>
        <span
          className={activeTab === 'prop' ? 'active' : ''}
          onClick={() => navigate('/tw4/systems/prop')}
          style={{ cursor: 'pointer' }}
        >
          Propeller
        </span>
      </div>
      {activeTab === 'hyds' && <T6BHydraulicDiagram />}
      {activeTab === 'elec' && <T6BElectricalDiagram />}
      {activeTab === 'prop' && <T6BPropDiagram />}
    </div>
  );
}

export default Systems;
