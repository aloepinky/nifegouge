import React from 'react';
import AboutPage from './about/AboutPage.js';
import { aboutTabs } from './about/tabs.js';

// Advanced's About page. The program is being built: EPs/Limits is the one page so far, and a
// tab joins this index as soon as it is added to the program's tab list in programs.js, which
// the top bar reads too — see about/tabs.js.
const CONTENT = {
  '/t44c/eps-limits': {
    icon: 'eps',
    blurb: 'The T-44C critical action memory items, and the operating limits sheet.',
    more: [
      'The EPs tests you on each of the T-44C EPs and NWCs. Critical action memory items are marked, as are the steps requiring the concurrence of both pilots.',
      'The Limits tab is the T-44C operating limits sheet to fill in from memory, with the answers a click away when you are stuck.',
    ],
  },
};

function T44CAbout() {
  return (
    <AboutPage
      title={<>Welcome to <em>Advanced</em></>}
      intro="T-44C training resources. This program is just getting started — more pages are on the way."
      photo="/images/t44c.webp"
      photoAlt="A T-44C Pegasus"
      tabs={aboutTabs('t44c', CONTENT)}
      explainer={
        <>
          <p>
            This section is for the T-44C. It begins where NIFE and Primary began: with the EPs and
            limits you are held to from memory. Other tabs are to follow!
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
