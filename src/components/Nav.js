import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WhizWheel from './Nav/WhizWheel';
import JetLog from './Nav/JetLog';
import FRR from './FRR';
import Weather from './Weather';

function Nav() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'nav';

  return (
    <>
      <div className="sub-navbar">
        <span
          className={activeTab === 'nav' ? 'active' : ''}
          onClick={() => navigate('/nife/nav/nav')}
          style={{ cursor: 'pointer' }}
        >
          Nav
        </span>
        <span
          className={activeTab === 'jetlog' ? 'active' : ''}
          onClick={() => navigate('/nife/nav/jetlog')}
          style={{ cursor: 'pointer' }}
        >
          Jet Log
        </span>
        <span
          className={activeTab === 'frr' ? 'active' : ''}
          onClick={() => navigate('/nife/nav/frr')}
          style={{ cursor: 'pointer' }}
        >
          FR&R
        </span>
        <span
          className={activeTab === 'weather' ? 'active' : ''}
          onClick={() => navigate('/nife/nav/weather')}
          style={{ cursor: 'pointer' }}
        >
          Weather
        </span>
      </div>

      {activeTab === 'nav' && <WhizWheel />}
      {activeTab === 'jetlog' && <JetLog />}
      {activeTab === 'frr' && <FRR />}
      {activeTab === 'weather' && <Weather />}
    </>
  );
}

export default Nav;
