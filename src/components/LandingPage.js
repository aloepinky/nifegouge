import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  // Preload images to prevent mobile display issues
  useEffect(() => {
    const imagesToPreload = [
      '/images/c172.jpg',
      '/images/t6b.jpg'
    ];

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-header">
        <h1>Welcome to <span className="pink-text">pinksheetmafia.com</span></h1>
        <p className="landing-explainer">
          This is a free, community-built, open-source resource designed to make naval aviation training less stressful.
          Select your school below to access study materials, interactive cockpits, checklists, and more.
        </p>
      </div>

      <div className="landing-buttons">
        <div
          className="landing-button"
          onClick={() => navigate('/nife/about')}
        >
          <div className="landing-button-fallback">NIFE</div>
          <img src="/images/c172.jpg" alt="NIFE - Cessna 172" />
          <div className="landing-button-label">NIFE</div>
        </div>

        <div
          className="landing-button"
          onClick={() => navigate('/tw4/about')}
        >
          <div className="landing-button-fallback">TW4 Primary</div>
          <img src="/images/t6b.jpg" alt="TW4 Primary - T-6B Texan II" />
          <div className="landing-button-label">TW4 Primary</div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;