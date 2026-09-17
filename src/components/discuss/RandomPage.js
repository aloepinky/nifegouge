import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItemMeta } from './registry';
import { DISCUSS_BASE } from './SyllabusContext';

// "Random page", above an item page's contents. It draws from the syllabus the reader last
// chose, not from every page on the server: a student on a generated syllabus should land on
// a page that syllabus briefs.
//
// An item page is not under /s/:syllabus (an item has one URL for every syllabus), so the
// choice cannot come from the route. It is remembered in this browser whenever a syllabus's
// own pages are open, and read back here. Losing it is harmless: the draw falls back to Delta.

const KEY = 'discuss.selectedSyllabus';

export function rememberSyllabus(id) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch (err) {
    // Storage blocked or unavailable: the draw uses Delta.
  }
}

export function recalledSyllabus() {
  try {
    return window.localStorage.getItem(KEY);
  } catch (err) {
    return null;
  }
}

// The syllabus the reader chose, which on an item page is not the one in SyllabusContext:
// item pages keep reading Delta for ?from= and Briefed on.
export const SelectedSyllabusContext = createContext(null);

// Every written page the syllabus's events brief. Stubs have nothing to read, and the
// generated lists are indexes rather than pages.
function candidates(syllabus, current) {
  const slugs = new Set();
  syllabus.events.forEach((event) => event.items.forEach((row) => {
    if (!row.slug || row.slug === current) return;
    const meta = getItemMeta(row.slug);
    if (meta && !meta.stub && !meta.generated) slugs.add(row.slug);
  }));
  return [...slugs];
}

function RandomPage({ current }) {
  const navigate = useNavigate();
  const syllabus = useContext(SelectedSyllabusContext);
  if (!syllabus) return null;
  const pool = candidates(syllabus, current);
  if (!pool.length) return null;
  return (
    <button
      type="button"
      className="discuss-random"
      title={`Open a random page from ${syllabus.name}`}
      onClick={() => navigate(`${DISCUSS_BASE}/${pool[Math.floor(Math.random() * pool.length)]}`)}
    >
      Random page
    </button>
  );
}

export default RandomPage;
