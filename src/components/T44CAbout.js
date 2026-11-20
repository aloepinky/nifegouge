import React from 'react';
import AboutPage from './about/AboutPage.js';
import { aboutTabs } from './about/tabs.js';
import { BriefStats, EpStats, SyllabusStats } from './about/SchoolStats.js';
import { PLATFORMS as ALL_PLATFORMS } from './about/platforms.js';

// Advanced will train in several aircraft, each with its own EPs, limits and briefs, so its
// numbers are titled with the aircraft and a second platform has somewhere to go.
const PLATFORMS = ALL_PLATFORMS.t44c;

// Advanced's About page. A tab joins this index as soon as it is added to the program's tab list in programs.js, which
// the top bar reads too — see about/tabs.js.
const CONTENT = {
  '/t44c/eps-limits': {
    stats: <EpStats platforms={PLATFORMS} byAircraft />,
    icon: 'eps',
    blurb: 'An interactive T-44C cockpit for the EPs and normal procedures, and the operating limits sheet.',
    more: [
      'The EPs/Cockpit tab is an interactive T-44C cockpit for the EPs and NWCs, the normal procedures done from memory, the Hollywood checklists and the SSE cases. Critical action memory items are marked, as are the steps requiring the concurrence of both pilots.',
      'The Limits tab is the T-44C operating limits sheet to fill in from memory, with the answers a click away when you are stuck.',
    ],
  },
  '/t44c/docs': {
    icon: 'docs',
    blurb: 'Gouge, study guides and references shared by fellow students.',
    more: [
      'The Docs page is a community-driven library of T-44C study materials. Find gouge, study guides, and useful references shared by fellow students.',
    ],
  },
  '/t44c/discuss': {
    stats: <SyllabusStats school="Advanced" />,
    icon: 'discuss',
    blurb: 'What to say at the brief table, for every discuss item the syllabus names.',
    more: [
      'Two syllabi are flown in the T-44C: the multi-service Advanced syllabus and the E-2D Intermediate one. Pick yours from the dropdown; the pages themselves are shared, because the aircraft is.',
      'The Advanced syllabus splits after I4601, so its course flow carries a chart for each community — P-8, E-6, C-130, Coast Guard and tilt-rotor.',
    ],
  },
  '/t44c/briefs': {
    stats: <BriefStats school="Advanced" />,
    icon: 'brief',
    blurb: 'The T-44C briefs, for quick reference.',
    more: [
      'The Briefs page holds the T-44C briefs for quick reference.',
    ],
  },
  '/t44c/practice': {
    icon: 'flight',
    blurb: 'Fly a whole contact FAM step by step: course rules, comms, checklists and maneuvers.',
    more: [
      'The Practice Flight page chair flies an entire T-44C contact FAM to Seagull, Foxtrot or Cheetah and back to Navy Corpus or Cabaniss. Emphasis is placed on course rules, proper comms, checklist timing and maneuver flow.',
    ],
  },
  '/t44c/pattern': {
    icon: 'pattern',
    blurb: 'Watch a T-44C fly the VFR landing pattern in real time, with every call and FTI procedure.',
    more: [
      'Pattern Work chair flies around the landing pattern at Cabaniss or Navy Corpus over a drawing or satellite imagery. The PF, PM and Tower calls pop up, and the FTI procedures being flown are displayed.',
      'Pick the flap setting, single-engine pattern, the break, or one of the SSE Cases 1 to 5 with random prop and fire checks. Click any point on the pattern to target that section.',
    ],
  },
};

function T44CAbout() {
  return (
    <AboutPage
      title={<>Welcome to <em>T-44C Advanced</em></>}
      intro="T-44C training resources for E-2D Intermediate and ME Advanced."
      photo="/images/t44c.webp"
      photoAlt="A T-44C Pegasus"
      tabs={aboutTabs('t44c', CONTENT)}
      explainer={
        <>
          <p>
            This section is for the T-44C: the EPs and limits you are held to from memory, the
            discussion items for every syllabus event, the briefs, a practice FAM flight and the landing
            pattern.
          </p>
          <p>
            Everything here is built by students, so it is only as good as what gets contributed. If you
            see something wrong, or want to help write a page, reach out at pinksheetmafia@gmail.com.
          </p>
          <p>
            If you're comfortable with code, contribute directly via our{' '}
            <a
              href="https://github.com/aloepinky/nifegouge"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              open-source GitHub repo
            </a>.
          </p>
          <p>Thanks,<br />PinkSheetMafia</p>
        </>
      }
    />
  );
}

export default T44CAbout;
