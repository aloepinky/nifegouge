import React from 'react';
import AboutPage from './about/AboutPage.js';
import { aboutTabs } from './about/tabs.js';
import { EpStats } from './about/SchoolStats.js';
import { PLATFORMS as ALL_PLATFORMS } from './about/platforms.js';
import photo from './TH73A/images/th73a.webp';

// The TH-73A's About page. Its EP figures (NWCs included) come from about/platforms.js, as the
// other schools' do, so the landing tile and this page count the same way.
//
// The table is read when the page renders, not when the module loads: under the dev server's
// hot reload an update to platforms.js can re-run this module before that table is initialised
// ("Cannot access 'PLATFORMS' before initialization"), and a read at module scope is what hit it.
const content = () => ({
  '/th73a/eps-limits': {
    stats: <EpStats platforms={ALL_PLATFORMS.th73a} byAircraft />,
    icon: 'eps',
    blurb: 'The TH-73A NATOPS memory items, and an operating limits sheet.',
    more: [
      'The EPs tab tests you on every TH-73A emergency procedure that has memory items: the asterisked steps of NATOPS Chapter 12, with the conditions the NATOPS prints between them.',
      'The Limits tab is an operating limits sheet to fill in from memory, with the answers a click away when you are stuck. There is no TH-73A limits exam sheet. This is a custom selection from NATOPS Chapter 4.',
    ],
  },
});

function TH73AAbout() {
  return (
    <AboutPage
      title={<>Welcome to <em>TH-73A Advanced</em></>}
      intro="TH-73A training resources for drilling the fundamentals."
      photo={photo}
      photoAlt="Two TH-73As in formation over the coast"
      // The lead aircraft flies nose-down over the trees, low in the frame: show the lower part,
      // nose included, and give up the sky.
      photoCrop="center 82%"
      tabs={aboutTabs('th73a', content())}
      explainer={
        <>
          <p>This section is for the TH-73A: the emergency procedure memory items and the operating limits you are held to from memory.</p>
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

export default TH73AAbout;
