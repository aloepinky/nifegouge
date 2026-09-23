import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItemMeta } from './registry';
import { useDiscussBase } from './paths';
import { schoolNs } from '../programs';

// "Random page", above an item page's contents. It draws from the syllabus the reader last
// chose, not from every page on the server: a student on a generated syllabus should land on
// a page that syllabus briefs.
//
// An item page is not under /s/:syllabus (an item has one URL for every syllabus), so the
// choice cannot come from the route. It is remembered in this browser whenever a syllabus's
// own pages are open, and read back here. Losing it is harmless: the draw falls back to Delta.

// Keyed by school: each tab has its own syllabi, and a reader who last chose Echo on the
// Primary tab must not land on it from NIFE's, where it is not even offered.
const KEY = (school) => `discuss.selectedSyllabus.${schoolNs(school) || 'primary'}`;

export function rememberSyllabus(id, school) {
  try {
    window.localStorage.setItem(KEY(school), id);
  } catch (err) {
    // Storage blocked or unavailable: the draw uses the mount's own syllabus.
  }
}

export function recalledSyllabus(school) {
  try {
    return window.localStorage.getItem(KEY(school));
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
  const base = useDiscussBase();
  const syllabus = useContext(SelectedSyllabusContext);
  if (!syllabus) return null;
  const pool = candidates(syllabus, current);
  if (!pool.length) return null;
  return (
    <button
      type="button"
      className="discuss-random"
      title={`Open a random page from ${syllabus.name}`}
      onClick={() => navigate(`${base}/${pool[Math.floor(Math.random() * pool.length)]}`)}
    >
      Random page
    </button>
  );
}

export default RandomPage;
