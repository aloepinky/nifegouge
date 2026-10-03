import React from 'react';
import AboutPage from './about/AboutPage.js';
import { aboutTabs } from './about/tabs.js';
import { BriefStats, EpStats, SyllabusStats } from './about/SchoolStats.js';
import { PLATFORMS as ALL_PLATFORMS } from './about/platforms.js';
import photo from './T54A/images/t54a.webp';

// The T-54A's About page. Its EP figures (NWCs included) come from about/platforms.js, as the
// T-44C's do, so the landing tile and this page count the same way.
const PLATFORMS = ALL_PLATFORMS.t54a;

const CONTENT = {
  '/t54a/eps-limits': {
    stats: <EpStats platforms={PLATFORMS} byAircraft />,
    icon: 'eps',
    blurb: 'The T-54A critical action memory items, and the operating limits sheet.',
    more: [
      'The EPs tab tests you on each of the T-54A EPs. Critical action memory items are marked, as are the steps requiring the concurrence of both pilots.',
      'The Limits tab is the T-54A operating limits sheet to fill in from memory, with the answers a click away when you are stuck.',
    ],
  },
  '/t54a/discuss': {
    stats: <SyllabusStats school="T-54A" />,
    icon: 'discuss',
    blurb: 'What to say at the brief table, for every discuss item the syllabus names.',
    more: [
      'Every discuss item in the T-54A syllabus (CNATRAINST 1542.198) has a page, written from the T-54A NATOPS, its pocket checklist and the T-54A FTI, with a citation on every block so you can check it yourself.',
      'Find an item through the course flow chart, its event, or the search box. Anyone can fix a page with [edit].',
    ],
  },
  '/t54a/briefs': {
    stats: <BriefStats school="T-54A" />,
    icon: 'brief',
    blurb: 'The T-54A briefs, for quick reference.',
    more: [
      'The Briefs page holds the T-54A briefs for quick reference.',
    ],
  },
};

function T54AAbout() {
  return (
    <AboutPage
      title={<>Welcome to <em>T-54A Advanced</em></>}
      intro="T-54A training resources for drilling the fundamentals."
      photo={photo}
      photoAlt="A T-54A in flight"
      // Too long for the banner: keep the nose and its wheel, let the tail go.
      photoCrop="right 52%"
      tabs={aboutTabs('t54a', CONTENT)}
      explainer={
        <>
          <p>This section is for the T-54A: the EPs and limits you are held to from memory, the discussion items for every syllabus event, and the briefs.</p>
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

export default T54AAbout;
