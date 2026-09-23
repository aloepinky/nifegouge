import React from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import './style.css';
import Questions from './components/Questions';
import Nav from './components/Nav';
import NIFEEPsLimits from './components/NIFEEPsLimits.js';
import NIFEBriefs from './components/NIFEBriefs.js';
import NIFEDiscuss from './components/NIFEDiscuss.js';
import { DRAFT } from './components/programs.js';
import Docs from './components/Docs.js';
import TW4About from './components/TW4About.js';
import TW4EPsLimits from './components/TW4EPsLimits.js';
import T44CEPsLimits from './components/T44CEPsLimits.js';
import BriefsPage from './components/briefs/BriefsPage';
import NIFEAbout from './components/NIFEAbout.js';
import LandingPage from './components/LandingPage.js';
import CourseRules from './components/TW4CourseRules.js';
import Systems from './components/systems/Systems.js';
import Discuss from './components/discuss/Discuss.js';
import TW4JetLog from './components/TW4JetLog.js';
import TW4Docs from './components/TW4Docs.js';
import Footer from './components/Footer.js';
import TopNav from './components/TopNav.js';

// /nife/flight/told is now on the Briefs/TOLD page; its other tabs are on EPs/Limits.
function FlightTabRedirect() {
  const { tab } = useParams();
  return <Navigate to={tab === 'told' ? '/nife/briefs/told' : `/nife/eps-limits/${tab}`} replace />;
}

function App() {
  const location = useLocation();

  const isLanding = location.pathname === '/';

  return (
    <div>
      {!isLanding && <TopNav />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/nife" element={<Navigate to="/nife/about" replace />} />
        <Route path="/nife/about" element={<NIFEAbout />} />
        <Route path="/nife/questions" element={<Questions />} />
        <Route path="/nife/docs" element={<Docs />} />
        <Route path="/nife/nav" element={<Nav />} />
        <Route path="/nife/nav/:tab" element={<Nav />} />
        <Route path="/nife/eps-limits" element={<NIFEEPsLimits />} />
        <Route path="/nife/eps-limits/:tab" element={<NIFEEPsLimits />} />
        <Route path="/nife/briefs/*" element={<NIFEBriefs />} />
        {/* Draft: shown on a dev server, absent from the live site — nav AND route, so a
            deep link cannot reach a half-written tab. See programs.js. */}
        {DRAFT && <Route path="/nife/discuss/*" element={<NIFEDiscuss />} />}
        {/* The Flight page was split into those two; its addresses are in the wild. */}
        <Route path="/nife/flight" element={<Navigate to="/nife/eps-limits" replace />} />
        <Route path="/nife/flight/:tab" element={<FlightTabRedirect />} />
        <Route path="/tw4" element={<Navigate to="/tw4/about" replace />} />
        <Route path="/tw4/about" element={<TW4About />} />
        <Route path="/tw4/eps-limits" element={<TW4EPsLimits />} />
        <Route path="/tw4/eps-limits/:tab" element={<TW4EPsLimits />} />
        <Route path="/tw4/docs" element={<TW4Docs />} />
        <Route path="/tw4/briefs/*" element={<BriefsPage />} />
        <Route path="/tw4/courserules" element={<CourseRules />} />
        <Route path="/tw4/systems" element={<Systems />} />
        <Route path="/tw4/systems/:tab" element={<Systems />} />
        <Route path="/tw4/discuss/*" element={<Discuss />} />
        <Route path="/tw4/jetlog" element={<TW4JetLog />} />
        {DRAFT && <Route path="/t44c" element={<Navigate to="/t44c/eps-limits" replace />} />}
        {DRAFT && <Route path="/t44c/eps-limits" element={<T44CEPsLimits />} />}
        {DRAFT && <Route path="/t44c/eps-limits/:tab" element={<T44CEPsLimits />} />}
      </Routes>

      {!isLanding && <Footer />}
    </div>
  );
}

export default App;
