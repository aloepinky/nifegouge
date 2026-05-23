import React, { useState } from 'react';
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

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [mode, setMode] = useState('NIFE');

  const handleModeToggle = (newMode) => {
    setMode(newMode);
    setCurrentPage('about');
  };

  return (
    <div>
      {/* Navigation Bar - hidden on landing page */}
      {currentPage !== 'landing' && <div className="navbar">
        {/* Mode Toggle */}
        <div className="page-toggle-container">
          <span className={mode === 'NIFE' ? 'active' : ''} onClick={() => handleModeToggle('NIFE')}>
            NIFE
          </span>
          <div className="page-toggle-switch" onClick={() => handleModeToggle(mode === 'NIFE' ? 'TW4 Primary' : 'NIFE')}>
            <div className={`page-toggle-slider ${mode === 'TW4 Primary' ? 'right' : 'left'}`}></div>
          </div>
          <span className={mode === 'TW4 Primary' ? 'active' : ''} onClick={() => handleModeToggle('TW4 Primary')}>
            TW4 Primary
          </span>
        </div>

        {/* Navigation Links */}
        <div className="nav-links">
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage('about');
            }}
            className={currentPage === 'about' ? 'active' : ''}
          >
            About
          </a>
          {mode === 'NIFE' && (
            <>
              <a
                href="#questions"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage('questions');
                }}
                className={currentPage === 'questions' ? 'active' : ''}
              >
                Questions
              </a>
              <a
                href="#docs"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage('docs');
                }}
                className={currentPage === 'docs' ? 'active' : ''}
              >
                Docs
              </a>
              <a
                href="#nav"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage('nav');
                }}
                className={currentPage === 'nav' ? 'active' : ''}
              >
                Problem Generator
              </a>
              <a
                href="#flight"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage('flight');
                }}
                className={currentPage === 'flight' ? 'active' : ''}
              >
                Flight
              </a>
            </>
          )}
          {mode === 'TW4 Primary' && (
            <>
            <a
              href="#eps-limits"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('eps-limits');
              }}
              className={currentPage === 'eps-limits' ? 'active' : ''}
            >
              EPs/Limits
            </a>
            <a
              href="#tw4docs"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('tw4docs');
              }}
              className={currentPage === 'tw4docs' ? 'active' : ''}
            >
              Docs
            </a>
            <a
              href="#briefs"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('briefs');
              }}
              className={currentPage === 'briefs' ? 'active' : ''}
            >
              Briefs/TOLD
            </a>
            <a
              href="#courserules"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('courserules');
              }}
              className={currentPage === 'courserules' ? 'active' : ''}
            >
              Course Rules
            </a>
            <a
              href="#systems"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('systems');
              }}
              className={currentPage === 'systems' ? 'active' : ''}
            >
              Systems
            </a>
            <a
              href="#jetlog"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('jetlog');
              }}
              className={currentPage === 'jetlog' ? 'active' : ''}
            >
              Jet Log
            </a>
</>
          )}
        </div>
      </div>}

      {/* Page Content */}
      <>
        {currentPage === 'landing' && <LandingPage onSelectMode={handleModeToggle} />}
        {currentPage === 'about' && mode === 'NIFE' && <NIFEAbout onNavigate={setCurrentPage} />}
        {currentPage === 'about' && mode === 'TW4 Primary' && <TW4About onNavigate={setCurrentPage} />}
        {currentPage === 'questions' && mode === 'NIFE' && <Questions />}
        {currentPage === 'docs' && mode === 'NIFE' && <Docs />}
        {currentPage === 'nav' && mode === 'NIFE' && <Nav />}
        {currentPage === 'flight' && mode === 'NIFE' && <Flight />}
        {currentPage === 'tw4docs' && mode === 'TW4 Primary' && <TW4Docs />}
        {currentPage === 'eps-limits' && mode === 'TW4 Primary' && <TW4EPsLimits />}
        {currentPage === 'briefs' && mode === 'TW4 Primary' && <TW4Briefs />}
        {currentPage === 'courserules' && mode === 'TW4 Primary' && <CourseRules />}
        {currentPage === 'systems' && mode === 'TW4 Primary' && <Systems />}
        {currentPage === 'jetlog' && mode === 'TW4 Primary' && <TW4JetLog />}
      </>
    </div>
  );
}

export default App;