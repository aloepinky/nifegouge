import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import T6BHydraulicDiagram from './hyds/T6BHydraulicDiagram';
import T6BPropDiagram from './prop/T6BPropDiagram';
import T6BElectricalDiagram from './elec/T6BElectricalDiagram';
import T6BObogsDiagram from './obogs/T6BObogsDiagram';
import T6BFuelDiagram from './fuel/T6BFuelDiagram';

// One entry per system: the :tab value, its nav label, and the diagram it renders.
// Adding a system is a single line here rather than three parallel edits.
// Oil sits between Propeller and Electrical when it ships — the diagram exists but is
// not finished, so its row and import are held back rather than shipping a half tab.
const TABS = [
  { id: 'hyds', label: 'Hydraulics', Diagram: T6BHydraulicDiagram },
  { id: 'prop', label: 'Propeller',  Diagram: T6BPropDiagram },
  { id: 'elec', label: 'Electrical', Diagram: T6BElectricalDiagram },
  { id: 'obogs', label: 'OBOGS',     Diagram: T6BObogsDiagram },
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
      <div className="sub-navbar sub-navbar--scrollable" style={{ marginBottom: 0 }}>
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
