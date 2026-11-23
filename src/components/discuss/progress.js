import { useCallback, useSyncExternalStore } from 'react';

// Track progress: a student ticks off the boxes of a course-flow chart as they fly them. Kept in
// this browser only (localStorage, cleared with cookies and site data), never sent anywhere,
// and it changes nothing else on the chart: a ticked box links where it always did.
//
// Stored per syllabus as { '<chart>:<node id>': true }; `chart` is 'core' for the course flow
// and the community's id for a chart after the split.

const MODE_KEY = 'discussTrackProgress';
const keyOf = (syllabusId) => `discussProgress:${syllabusId}`;

const subs = new Set();
const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
const notify = () => subs.forEach((fn) => fn());

// useSyncExternalStore wants the same object back until something changes, so reads are cached
// by the raw string.
const cache = new Map();
function read(key) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { /* private mode: nothing kept */ }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value = {};
  try { value = (raw && JSON.parse(raw)) || {}; } catch { value = {}; }
  cache.set(key, { raw, value });
  return value;
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* nothing kept */ }
  notify();
}

if (typeof window !== 'undefined') {
  // Another tab ticking a box.
  window.addEventListener('storage', (e) => {
    if (e.key === MODE_KEY || (e.key && e.key.startsWith('discussProgress:'))) notify();
  });
}

const readMode = () => {
  try { return localStorage.getItem(MODE_KEY) === '1'; } catch { return false; }
};

// Whether the reader has the tracker on. Off by default.
export function useTracking() {
  const on = useSyncExternalStore(subscribe, readMode, () => false);
  const setOn = useCallback((next) => {
    try {
      if (next) localStorage.setItem(MODE_KEY, '1');
      else localStorage.removeItem(MODE_KEY);
    } catch { /* nothing kept */ }
    notify();
  }, []);
  return [on, setOn];
}

// The ticked boxes of one syllabus, and a toggle.
export function useProgress(syllabusId) {
  const key = keyOf(syllabusId || 'none');
  const done = useSyncExternalStore(subscribe, () => read(key), () => ({}));
  const toggle = useCallback((id) => {
    const next = { ...read(key) };
    if (next[id]) delete next[id];
    else next[id] = true;
    write(key, next);
  }, [key]);
  const clear = useCallback(() => write(key, {}), [key]);
  return { done, toggle, clear };
}

// The boxes a chart can tick: every drawn box but the flow connectors and START/END.
export function trackable(flow) {
  return ((flow && flow.NODES) || []).filter((n) => n.kind !== 'jump' && n.kind !== 'terminal');
}

export const progressId = (chart, node) => `${chart}:${node.id}`;
