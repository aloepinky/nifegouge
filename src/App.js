import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import './style.css';
import LandingPage from './components/LandingPage.js';
import Footer from './components/Footer.js';
import TopNav from './components/TopNav.js';
import { warmDiscuss } from './components/discuss/warm';

const Questions = lazy(() => import('./components/Questions'));
const Nav = lazy(() => import('./components/Nav'));
const NIFEEPsLimits = lazy(() => import('./components/NIFEEPsLimits.js'));
const NIFEBriefs = lazy(() => import('./components/NIFEBriefs.js'));
const NIFEDiscuss = lazy(() => import('./components/NIFEDiscuss.js'));
const Docs = lazy(() => import('./components/Docs.js'));
const TW4About = lazy(() => import('./components/TW4About.js'));
const TW4EPsLimits = lazy(() => import('./components/TW4EPsLimits.js'));
const T44CEPsLimits = lazy(() => import('./components/T44CEPsLimits.js'));
const T44CAbout = lazy(() => import('./components/T44CAbout.js'));
const BriefsPage = lazy(() => import('./components/briefs/BriefsPage'));
const NIFEAbout = lazy(() => import('./components/NIFEAbout.js'));
const CourseRules = lazy(() => import('./components/TW4CourseRules.js'));
const Systems = lazy(() => import('./components/systems/Systems.js'));
const Discuss = lazy(() => import('./components/discuss/Discuss.js'));
const TW4JetLog = lazy(() => import('./components/TW4JetLog.js'));
const TW4Docs = lazy(() => import('./components/TW4Docs.js'));

// Every page but the landing page is its own chunk, so opening one downloads that page and not
// the other sixteen: the entry bundle used to carry Leaflet, the course-rules map, the jet log
// and all six systems diagrams to someone who asked for a discussion item.
//
// A Discussion Items deep link also starts its mirror reads here, before its chunk arrives.
// Only on the first load: the reads are claimed by the first matching fetch, and on a later
// navigation the tab may already hold what they would return and never claim them.
warmDiscuss(window.location.pathname);

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

      <Suspense fallback={<div className="route-loading" />}>
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
        <Route path="/nife/discuss/*" element={<NIFEDiscuss />} />
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
        <Route path="/t44c" element={<Navigate to="/t44c/about" replace />} />
        <Route path="/t44c/about" element={<T44CAbout />} />
        <Route path="/t44c/eps-limits" element={<T44CEPsLimits />} />
        <Route path="/t44c/eps-limits/:tab" element={<T44CEPsLimits />} />
      </Routes>
      </Suspense>

      {!isLanding && <Footer />}
    </div>
  );
}

export default App;
