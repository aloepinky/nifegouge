import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Discuss from './components/discuss/Discuss.js';
import { STYLE_GUIDE_DRAFT } from './components/discuss/SyllabusContext.js';
import TW4JetLog from './components/TW4JetLog.js';
import TW4Docs from './components/TW4Docs.js';
import Footer from './components/Footer.js';
import TopNav from './components/TopNav.js';

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
        <Route path="/tw4/discuss" element={<Discuss />} />
        <Route path="/tw4/discuss/e/:event" element={<Discuss mode="event" />} />
        <Route path="/tw4/discuss/b/:block" element={<Discuss mode="block" />} />
        <Route path="/tw4/discuss/upload" element={<Discuss mode="upload" />} />
        {/* A draft, on a dev server only. `Routes` ignores a non-element child, which is how a
            route is conditioned. */}
        {STYLE_GUIDE_DRAFT && <Route path="/tw4/discuss/style" element={<Discuss mode="style" />} />}
        <Route path="/tw4/discuss/edit" element={<Discuss mode="edit" />} />
        <Route path="/tw4/discuss/:item/history" element={<Discuss mode="history" />} />
        <Route path="/tw4/discuss/s/:syllabus" element={<Discuss />} />
        <Route path="/tw4/discuss/s/:syllabus/e/:event" element={<Discuss mode="event" />} />
        <Route path="/tw4/discuss/s/:syllabus/b/:block" element={<Discuss mode="block" />} />
        <Route path="/tw4/discuss/s/:syllabus/edit" element={<Discuss mode="edit" />} />
        <Route path="/tw4/discuss/:item" element={<Discuss mode="item" />} />
        <Route path="/tw4/jetlog" element={<TW4JetLog />} />
      </Routes>

      {!isLanding && <Footer />}
    </div>
  );
}

export default App;
