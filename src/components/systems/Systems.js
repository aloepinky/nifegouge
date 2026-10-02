import React, { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SYSTEM_TABS } from './systemTabs';

// The diagram each system renders. The :tab values and nav labels live in systemTabs.js,
// which the discuss item pages also read — they link to a system without importing its
// schematic. Adding a system is one line there and one line here. Each diagram is its own
// chunk, so opening one system doesn't download the other five.
const DIAGRAMS = {
  hyds: lazy(() => import('./hyds/T6BHydraulicDiagram')),
  prop: lazy(() => import('./prop/T6BPropDiagram')),
  oil: lazy(() => import('./oil/T6BOilDiagram')),
  elec: lazy(() => import('./elec/T6BElectricalDiagram')),
  obogs: lazy(() => import('./obogs/T6BObogsDiagram')),
  fuel: lazy(() => import('./fuel/T6BFuelDiagram')),
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
            onClick={() => navigate(`/primary/systems/${id}`)}
            style={{ cursor: 'pointer' }}
          >
            {label}
          </span>
        ))}
      </div>
      {/* Holds the page's height while a diagram's chunk loads, so the footer doesn't jump. */}
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <Diagram />
      </Suspense>
    </div>
  );
}

export default Systems;
