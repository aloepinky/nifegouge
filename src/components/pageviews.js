import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from './serverApi';

// Counts page views for the site's own analytics (lambda/discussApi/pageviews.mjs). Netlify
// sees only the first page a visit loads; every page after that is drawn in the browser, so
// the browser has to say so.
//
// A view is counted once the address has settled for a moment, so a redirect (/nife to
// /nife/about) is one view of where it landed, not two. The query and hash are dropped on the
// server: /primary/discuss/x?from=N3101 is a view of /primary/discuss/x.
//
// A visitor is this browser on this day (Central time), remembered in localStorage: the first
// page of the day says `newDay`, the first view of each page that day `newPage`, and the first
// in each section (/primary/discuss) and school (primary) `newSection` and `newSchool`, worked
// out as lambda/discussApi/pageviews.mjs does. Nothing else about the reader is sent.
//
// Only the live site counts. A local copy talks to the live server, and its views would land in
// the real numbers; REACT_APP_PAGEVIEWS=on turns counting on locally, for the dev server.

const LIVE = ['pinksheetmafia.com', 'www.pinksheetmafia.com'];
const SETTLE_MS = 800;
const KEY = 'psm-pageviews';
const MAX_PATHS = 400;
const PREFIXES = ['nife', 'primary', 't44c', 't54a', 'tw4'];

const enabled = () => typeof window !== 'undefined'
  && (LIVE.includes(window.location.hostname) || process.env.REACT_APP_PAGEVIEWS === 'on')
  && !navigator.webdriver;

function today() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

// Kept in memory too, for a browser whose storage refuses: it then counts as a new visitor once
// per load rather than on every page.
let memory = null;

// The section and school a path counts under, as the server has them. An address outside the
// site's prefixes is the server's one (other) row.
function levels(path) {
  if (path === '/') return { section: '/', school: 'landing' };
  const parts = path.split('/');
  if (!PREFIXES.includes(parts[1])) return { section: '/(other)', school: 'other' };
  return { section: parts.slice(0, 3).join('/'), school: parts[1] === 'tw4' ? 'primary' : parts[1] };
}

function seen(path) {
  const day = today();
  const { section, school } = levels(path);
  let state = memory;
  try { state = JSON.parse(localStorage.getItem(KEY)) || state; } catch (e) { /* private mode */ }
  if (!state || state.day !== day || !Array.isArray(state.paths)) state = { day, paths: [] };
  const newDay = state.paths.length === 0;
  const fresh = (key) => {
    if (state.paths.includes(key)) return false;
    if (state.paths.length < MAX_PATHS) state.paths.push(key);
    return true;
  };
  const newPage = fresh(path);
  const newSection = fresh(`section:${section}`);
  const newSchool = fresh(`school:${school}`);
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  return { newDay, newPage, newSection, newSchool };
}

function send(pathname) {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const body = JSON.stringify({ path, ...seen(path) });
  const url = `${API_BASE_URL}/pageview`;
  // text/plain keeps it a simple request: no CORS preflight, and nobody reads the answer.
  const blob = new Blob([body], { type: 'text/plain' });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;
  } catch (e) { /* fall through */ }
  fetch(url, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } })
    .catch(() => {});
}

export function usePageViews() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!enabled()) return undefined;
    let sent = false;
    const flush = () => {
      if (sent) return;
      sent = true;
      send(pathname);
    };
    const timer = setTimeout(flush, SETTLE_MS);
    // Leaving within the moment still counts the page left.
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
    };
  }, [pathname]);
}
