import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import T6BHydraulicDiagram from './hyds/T6BHydraulicDiagram';
import T6BElectricalDiagram from './elec/T6BElectricalDiagram';
import T6BPropDiagram from './prop/T6BPropDiagram';
import T6BFuelDiagram from './fuel/T6BFuelDiagram';

// One entry per system: the :tab value, its nav label, and the diagram it renders.
// Adding a system is a single line here rather than three parallel edits.
const TABS = [
  { id: 'hyds', label: 'Hydraulics', Diagram: T6BHydraulicDiagram },
  { id: 'elec', label: 'Electrical', Diagram: T6BElectricalDiagram },
  { id: 'prop', label: 'Propeller',  Diagram: T6BPropDiagram },
  { id: 'fuel', label: 'Fuel',       Diagram: T6BFuelDiagram },
];

function Systems() {
  const { tab } = useParams();
  const navigate = useNavigate();
  // Fall back to the first system for a missing *or* unrecognized :tab, so a bad URL
  // never renders a nav bar over an empty page.
  const active = TABS.find(t => t.id === tab) || TABS[0];
  const { Diagram } = active;

  return (
    <div>
      <div className="sub-navbar" style={{ marginBottom: 0 }}>
        {TABS.map(({ id, label }) => (
          <span
            key={id}
            className={active.id === id ? 'active' : ''}
            onClick={() => navigate(`/tw4/systems/${id}`)}
            style={{ cursor: 'pointer' }}
          >
            {label}
          </span>
        ))}
      </div>
      <Diagram />
    </div>
  );
}

export default Systems;
