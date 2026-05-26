import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LimitsEPs from './Flight/LimitsEPs';
import ToldCard from './Flight/ToldCard';

function Flight() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'limits';

  return (
    <>
      <div className="sub-navbar">
        <span
          className={activeTab === 'limits' ? 'active' : ''}
          onClick={() => navigate('/nife/flight/limits')}
          style={{ cursor: 'pointer' }}
        >
          Limits/EPs
        </span>
        <span
          className={activeTab === 'told' ? 'active' : ''}
          onClick={() => navigate('/nife/flight/told')}
          style={{ cursor: 'pointer' }}
        >
          TOLD Card
        </span>
      </div>

      {activeTab === 'limits' && <LimitsEPs />}
      {activeTab === 'told' && <ToldCard />}
    </>
  );
}

export default Flight;
