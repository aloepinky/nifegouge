import React, { useState } from 'react';
import TW4Cockpit from './TW4Cockpit';
import TW4Limits from './TW4Limits';

function TW4EPsLimits() {
  const [activeTab, setActiveTab] = useState('cockpit');

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="sub-navbar" style={{ marginBottom: 0 }}>
        <span
          className={activeTab === 'cockpit' ? 'active' : ''}
          onClick={() => setActiveTab('cockpit')}
          style={{ cursor: 'pointer' }}
        >
          EPs/Cockpit
        </span>
        <span
          className={activeTab === 'limits' ? 'active' : ''}
          onClick={() => setActiveTab('limits')}
          style={{ cursor: 'pointer' }}
        >
          Limits
        </span>
      </div>
      {activeTab === 'cockpit' && <TW4Cockpit />}
      {activeTab === 'limits' && <TW4Limits />}
    </div>
  );
}

export default TW4EPsLimits;
