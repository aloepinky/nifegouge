import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAMS, shown } from './programs';
import { useCourseWeeks } from './about/SchoolStats';

// The biggest numbers of each school, under its tile: how long the course is and what its
// EPs/Limits exam asks. Counted from the data (about/platforms.js, the syllabi on the mirror),
// never typed. Weeks are grouped by value, so Delta and Echo at 28 production weeks each show
// one 28; syllabi that differ show one figure each, named. A school with no syllabus shows no
// weeks and one with no NWCs (NIFE) no NWC count.
//
// The weeks come from a school's syllabi, so they are read through `shown` rather than off the
// flag: a draft Discussion Items tab is hidden on the live site, and its syllabi are published
// to the same server as everybody else's, so testing the flag for truth would print a course
// length here for a tab nobody can open.
//
// The EPs, limits and NWCs are counted from every EPs/Limits data file, which this page, the
// only one in the entry bundle, has no other use for. So about/platforms.js is imported when
// the page mounts, into a chunk of its own, and those figures show a dash (the NWCs nothing)
// until it lands. The About pages import it the ordinary way.
const fmt = (n) => n.toLocaleString('en-US');

// T54A-DRAFT: required inside the gate, so a production build neither emits the photo nor names it.
const T54A_PHOTO = process.env.NODE_ENV !== 'production' ? require('./T54A/images/t54a.webp') : null;

// One import for the session; a failed one is forgotten, so the next visit tries again.
let platformsLoad = null;
let platformsLoaded = null;
const loadPlatforms = () => {
  if (!platformsLoad) {
    platformsLoad = import('./about/platforms').then(
      (m) => { platformsLoaded = m.PLATFORMS; return m.PLATFORMS; },
      (err) => { platformsLoad = null; throw err; },
    );
  }
  return platformsLoad;
};

// "P-8, E-6, C-130, USCG, Tilt-Rotor" — plain commas. These are the communities flying one
// syllabus, not a sentence, and the "and" only lengthened a label that was already the widest
// thing under the tile.
const listOf = (names) => names.join(', ');

// `platforms` is this school's rows of about/platforms.js, or null while that is loading.
function SchoolHighlights({ id, platforms }) {
  const program = PROGRAMS.find((p) => p.id === id);
  const hasSyllabi = shown(program.discuss);
  const weeks = useCourseWeeks(program.label, hasSyllabi);
  const sum = (k) => (platforms
    ? platforms.reduce((n, p) => n + (k === 'limits' ? p.limits : p.eps[k] || 0), 0)
    : null);

  // A school whose syllabi run to different lengths names the communities each one covers, and
  // those names are long enough to shoulder the exam figures out of line. So they get a row of
  // their own, reading across the top with the EPs, limits and NWCs lined up beneath. On that
  // row the unit is said ONCE, at the left, and each figure sits over its own communities with
  // a rule between them: "weeks" on every group, spelled out with "and", ran wider than the
  // tile. One syllabus keeps its short label and its place in the row below.
  const named = !!weeks && weeks.length > 1;
  const lengths = [];
  if (hasSyllabi && !named) {
    // An empty list is a school whose syllabi carry no course length (or aren't published yet).
    lengths.push(weeks && weeks.length
      ? { key: `weeks-${weeks[0].weeks}`, value: weeks[0].weeks, label: weeks[0].label.toLowerCase() }
      : { key: 'weeks', value: null, label: 'weeks' });
  }
  const figures = [];
  figures.push({ key: 'eps', value: sum('eps'), label: 'EPs' });
  figures.push({ key: 'limits', value: sum('limits'), label: 'limits' });
  if (sum('nwcs')) figures.push({ key: 'nwcs', value: sum('nwcs'), label: 'NWCs' });

  const stat = (f) => (
    <div key={f.key} className="landing-stat">
      <dt>{f.label}</dt>
      <dd>{f.value == null ? '–' : fmt(f.value)}</dd>
    </div>
  );

  // Two lists rather than one with a spacer in it: a `dl` holds groups of dt and dd, and a
  // wrapper div that holds neither is not one of them. The unit word sits outside its `dl` for
  // the same reason — it belongs to every group on the row, so it is not a term of any of them.
  return (
    <div className="landing-stats-stack">
      {named && (
        <div className="landing-weeks">
          <span className="landing-weeks-unit">weeks,</span>
          <dl className="landing-stats landing-weeks-list">
            {weeks.map((w) => (
              <div key={w.weeks} className="landing-stat">
                <dt>{listOf(w.names)}</dt>
                <dd>{fmt(w.weeks)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <dl className="landing-stats">
        {!named && lengths.map(stat)}
        {figures.map(stat)}
      </dl>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState(platformsLoaded);
  useEffect(() => {
    let live = true;
    loadPlatforms().then((p) => { if (live) setPlatforms(p); }, () => {});
    return () => { live = false; };
  }, []);
  // Preload images to prevent mobile display issues
  useEffect(() => {
    const imagesToPreload = [
      '/images/c172.webp',
      '/images/t6b.webp',
      '/images/t44c.webp'
    ];

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-header">
        <h1>Welcome to <span className="pink-text">pinksheetmafia.com</span></h1>
        <p className="landing-explainer">
          This is a free, community-built, open-source resource designed to make naval aviation training less stressful.
          Select your school below to access study materials, interactive cockpits, checklists, and more.
        </p>
      </div>

      <div className="landing-buttons">
        <div className="landing-school">
          <div
            className="landing-button"
            onClick={() => navigate('/nife/about')}
          >
            <div className="landing-button-fallback">NIFE</div>
            <img src="/images/c172.webp" alt="NIFE - Cessna 172" />
            <div className="landing-button-label">NIFE</div>
          </div>
          <SchoolHighlights id="nife" platforms={platforms && platforms.nife} />
        </div>

        <div className="landing-school">
          <div
            className="landing-button"
            onClick={() => navigate('/tw4/about')}
          >
            <div className="landing-button-fallback">Primary</div>
            <img src="/images/t6b.webp" alt="Primary - T-6B Texan II" />
            <div className="landing-button-label">Primary</div>
          </div>
          <SchoolHighlights id="tw4" platforms={platforms && platforms.tw4} />
        </div>

        <div className="landing-school">
          <div
            className="landing-button"
            onClick={() => navigate('/t44c/about')}
          >
            {/* Named for the airframe, not just the stage: Advanced covers several schools. */}
            <div className="landing-button-fallback">T-44C Advanced</div>
            <img src="/images/t44c.webp" alt="T-44C Advanced - Pegasus" />
            <div className="landing-button-label">T-44C Advanced</div>
          </div>
          <SchoolHighlights id="t44c" platforms={platforms && platforms.t44c} />
        </div>

        {/* T54A-DRAFT */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="landing-school">
            <div
              className="landing-button"
              onClick={() => navigate('/t54a/about')}
            >
              <div className="landing-button-fallback">T-54A Advanced</div>
              <img src={T54A_PHOTO} alt="T-54A Advanced - King Air" />
              <div className="landing-button-label">T-54A Advanced</div>
            </div>
            <SchoolHighlights id="t54a" platforms={platforms && platforms.t54a} />
          </div>
        )}
      </div>
    </div>
  );
}

export default LandingPage;