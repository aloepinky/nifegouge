import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import T6BHydraulicDiagram from './hyds/T6BHydraulicDiagram';
import T6BPropDiagram from './prop/T6BPropDiagram';
import T6BOilDiagram from './oil/T6BOilDiagram';
import T6BElectricalDiagram from './elec/T6BElectricalDiagram';
import T6BObogsDiagram from './obogs/T6BObogsDiagram';
import T6BFuelDiagram from './fuel/T6BFuelDiagram';
import { SYSTEM_TABS } from './systemTabs';

// The diagram each system renders. The :tab values and nav labels live in systemTabs.js,
// which the discuss item pages also read — they link to a system without importing its
// schematic. Adding a system is one line there and one line here.
const DIAGRAMS = {
  hyds: T6BHydraulicDiagram,
  prop: T6BPropDiagram,
  oil: T6BOilDiagram,
  elec: T6BElectricalDiagram,
  obogs: T6BObogsDiagram,
  fuel: T6BFuelDiagram,
};

const TABS = SYSTEM_TABS.map(t => ({ ...t, Diagram: DIAGRAMS[t.id] }));

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
