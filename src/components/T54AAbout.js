import React from 'react';
import AboutPage from './about/AboutPage.js';
import { aboutTabs } from './about/tabs.js';
import { BriefStats, EpStats } from './about/SchoolStats.js';
import { epListStats } from './about/stats.js';
import { T54A_EPS, T54A_LIMITS } from './T54A/t54aData';
import photo from './T54A/images/t54a.webp';

// The T-54A's About page. A draft (T54A-DRAFT): routed and built only outside production, which
// is also why its figures are counted here rather than read from about/platforms.js, whose own
// T-54A row is required behind the same gate.
const PLATFORMS = [
  { aircraft: 'T-54A', eps: epListStats(T54A_EPS), limits: Object.keys(T54A_LIMITS).length },
];

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
      title={<>Welcome to <em>Advanced</em></>}
      intro="T-54A training resources. This program is just getting started — more pages are on the way."
      photo={photo}
      photoAlt="A T-54A in flight"
      // Too long for the banner: keep the nose and its wheel, let the tail go.
      photoCrop="right 52%"
      tabs={aboutTabs('t54a', CONTENT)}
      explainer={
        <>
          <p>This section is for the T-54A: the EPs and limits you are held to from memory, and the briefs.</p>
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
