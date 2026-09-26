import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import './style.css';
import LandingPage from './components/LandingPage.js';
import Footer from './components/Footer.js';
import TopNav from './components/TopNav.js';
import { warmDiscuss } from './components/discuss/warm';
import { DRAFT } from './components/programs';

const loaders = [];

// React.lazy over a loader that is also kept for preloadPages. The import is memoized so the
// preload and the route share one promise.
function page(load) {
  let promise = null;
  const once = () => {
    if (!promise) {
      promise = load().catch((err) => {
        promise = null;
        throw err;
      });
    }
    return promise;
  };
  loaders.push(once);
  return lazy(once);
}

// Waits for the browser to be idle after the first page has loaded, then fetches every page
// chunk. A failed fetch is forgotten, so a click retries it.
function preloadPages() {
  const run = () => loaders.forEach((load) => load().catch(() => {}));
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  const start = () => idle(run, { timeout: 4000 });
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

const Questions = page(() => import('./components/Questions'));
const Nav = page(() => import('./components/Nav'));
const NIFEEPsLimits = page(() => import('./components/NIFEEPsLimits.js'));
const NIFEBriefs = page(() => import('./components/NIFEBriefs.js'));
const NIFEDiscuss = page(() => import('./components/NIFEDiscuss.js'));
const Docs = page(() => import('./components/Docs.js'));
const TW4About = page(() => import('./components/TW4About.js'));
const TW4EPsLimits = page(() => import('./components/TW4EPsLimits.js'));
const T44CEPsLimits = page(() => import('./components/T44CEPsLimits.js'));
const T44CAbout = page(() => import('./components/T44CAbout.js'));
const T44CDiscuss = page(() => import('./components/T44CDiscuss.js'));
const BriefsPage = page(() => import('./components/briefs/BriefsPage'));
const NIFEAbout = page(() => import('./components/NIFEAbout.js'));
const CourseRules = page(() => import('./components/TW4CourseRules.js'));
const Systems = page(() => import('./components/systems/Systems.js'));
const Discuss = page(() => import('./components/discuss/Discuss.js'));
const TW4JetLog = page(() => import('./components/TW4JetLog.js'));
const TW4Docs = page(() => import('./components/TW4Docs.js'));

// Every page but the landing page is its own chunk, so opening one downloads that page and not
// the other sixteen: the entry bundle used to carry Leaflet, the course-rules map, the jet log
// and all six systems diagrams to someone who asked for a discussion item.
//
// But a chunk fetched only on click makes every first click wait on the network, which is worse
// than the slow first load it replaced. So once the first page is up, the rest are downloaded in
// the background (preloadPages), and a click finds its page already here.
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

  useEffect(preloadPages, []);

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
        {/* Draft: shown on a dev server, absent from the live site — nav AND route, so a
            deep link cannot reach a half-written tab. See programs.js. */}
        {DRAFT && <Route path="/t44c/discuss/*" element={<T44CDiscuss />} />}
      </Routes>
      </Suspense>

      {!isLanding && <Footer />}
    </div>
  );
}

export default App;
