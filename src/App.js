import React from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import './style.css';
import Questions from './components/Questions';
import Nav from './components/Nav';
import Flight from './components/Flight.js';
import Docs from './components/Docs.js';
import TW4About from './components/TW4About.js';
import TW4EPsLimits from './components/TW4EPsLimits.js';
import TW4Briefs from './components/TW4Briefs.js';
import NIFEAbout from './components/NIFEAbout.js';
import LandingPage from './components/LandingPage.js';
import CourseRules from './components/TW4CourseRules.js';
import Systems from './components/systems/Systems.js';
import TW4JetLog from './components/TW4JetLog.js';
import TW4Docs from './components/TW4Docs.js';
import Footer from './components/Footer.js';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const isTW4 = location.pathname.startsWith('/tw4');
  const isNIFE = location.pathname.startsWith('/nife');
  const isLanding = location.pathname === '/';

  const navLinkClass = ({ isActive }) => isActive ? 'active' : '';

  return (
    <div>
      {!isLanding && (
        <div className="navbar">
          {/* Mode Toggle */}
          <div className="page-toggle-container">
            <span className={isNIFE ? 'active' : ''} onClick={() => navigate('/nife/about')}>
              NIFE
            </span>
            <div
              className="page-toggle-switch"
              onClick={() => navigate(isTW4 ? '/nife/about' : '/tw4/about')}
            >
              <div className={`page-toggle-slider ${isTW4 ? 'right' : 'left'}`}></div>
            </div>
            <span className={isTW4 ? 'active' : ''} onClick={() => navigate('/tw4/about')}>
              TW4 Primary
            </span>
          </div>

          {/* Navigation Links */}
          <div className="nav-links">
            <NavLink to={isNIFE ? '/nife/about' : '/tw4/about'} end className={navLinkClass}>
              About
            </NavLink>
            {isNIFE && (
              <>
                <NavLink to="/nife/questions" end className={navLinkClass}>Questions</NavLink>
                <NavLink to="/nife/docs" end className={navLinkClass}>Docs</NavLink>
                <NavLink to="/nife/nav" className={navLinkClass}>Problem Generator</NavLink>
                <NavLink to="/nife/flight" className={navLinkClass}>Flight</NavLink>
              </>
            )}
            {isTW4 && (
              <>
                <NavLink to="/tw4/eps-limits" className={navLinkClass}>EPs/Limits</NavLink>
                <NavLink to="/tw4/docs" end className={navLinkClass}>Docs</NavLink>
                <NavLink to="/tw4/briefs" end className={navLinkClass}>Briefs/TOLD</NavLink>
                <NavLink to="/tw4/courserules" end className={navLinkClass}>Course Rules</NavLink>
                <NavLink to="/tw4/systems" className={navLinkClass}>Systems</NavLink>
                <NavLink to="/tw4/jetlog" end className={navLinkClass}>Jet Log</NavLink>
              </>
            )}
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/nife" element={<Navigate to="/nife/about" replace />} />
        <Route path="/nife/about" element={<NIFEAbout />} />
        <Route path="/nife/questions" element={<Questions />} />
        <Route path="/nife/docs" element={<Docs />} />
        <Route path="/nife/nav" element={<Nav />} />
        <Route path="/nife/nav/:tab" element={<Nav />} />
        <Route path="/nife/flight" element={<Flight />} />
        <Route path="/nife/flight/:tab" element={<Flight />} />
        <Route path="/tw4" element={<Navigate to="/tw4/about" replace />} />
        <Route path="/tw4/about" element={<TW4About />} />
        <Route path="/tw4/eps-limits" element={<TW4EPsLimits />} />
        <Route path="/tw4/eps-limits/:tab" element={<TW4EPsLimits />} />
        <Route path="/tw4/docs" element={<TW4Docs />} />
        <Route path="/tw4/briefs" element={<TW4Briefs />} />
        <Route path="/tw4/courserules" element={<CourseRules />} />
        <Route path="/tw4/systems" element={<Systems />} />
        <Route path="/tw4/systems/:tab" element={<Systems />} />
        <Route path="/tw4/jetlog" element={<TW4JetLog />} />
      </Routes>

      {!isLanding && <Footer />}
    </div>
  );
}

export default App;
