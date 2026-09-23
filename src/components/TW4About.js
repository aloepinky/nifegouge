import React, { useEffect } from 'react';
import AboutPage from './about/AboutPage.js';
import { aboutTabs } from './about/tabs.js';

// What this page says about each Primary tab. The order and the names come from the program's
// tab list in programs.js, which the top bar reads too — see about/tabs.js.
const CONTENT = {
  '/tw4/eps-limits': {
    icon: 'eps',
    blurb: 'Fly the EPs and Quadfold through a clickable T-6 cockpit, then run all 106 limits.',
    more: [
      'The EPs/Cockpit tab features a virtual interactive T-6 cockpit poster that serves as a comprehensive training tool for Emergency Procedures (EPs) and Quadfold checklists. By clicking through actual cockpit controls and following procedural flows, you can gain spatial awareness for where the controls are and start developing flow. Integrated Notes Warnings Cautions, expanded checklist items, and non-memory items allow for easy access to supplementary material. Or use Simple Mode to just review EPs and NWCs without the cockpit.',
      'The Limits tab provides a virtual T-6B Operating Limitations table. You can quickly test yourself or learn the limits by revealing the answers when stuck. See if you can correctly answer all 106 limits in a random order!',
    ],
  },
  '/tw4/docs': {
    icon: 'docs',
    blurb: 'Gouge, study guides and references shared by fellow students.',
    more: [
      'The Docs page is a community-driven library of primary study materials. Find gouge, study guides, and useful references shared by fellow students.',
    ],
  },
  '/tw4/discuss': {
    icon: 'discuss',
    blurb: 'Every JPPT discuss item, cited to the pubs and editable by anyone.',
    more: [
      'A Wikipedia style compendium of the discussion items in primary. Each item can be found through search, the JPPT flow chart, or an event list. Each page is built from the pubs — NATOPS, the FTIs, the course rules and the squadron SOPs — with a citation on every block, so you can verify the information yourself.',
      'Anyone can edit any content, with a full history available to track changes. That way the community can ensure all content is up to date and accurate. Please help future SNAs and make changes where you see fit.',
    ],
  },
  '/tw4/briefs': {
    icon: 'brief',
    blurb: 'Practice the Fam and Form NATOPS brief; the TOLD card fills itself.',
    more: [
      'The Briefs page allows you to practice the NATOPS brief for both Fam and Form. Clicking on a briefing item will reveal the associated expanded brief item in case you need a refresher or want to learn what is expected of you. The TOLD card table automatically generates your TOLD card values to get you instantly ready for your brief.',
    ],
  },
  '/tw4/courserules': {
    icon: 'map',
    blurb: 'The Corpus Christi course rules on an interactive map, with the official text.',
    more: [
      "The Course Rules page integrates an interactive course rule map with official text to help you build visual intuition while studying. You can build hypothetical flight paths and test yourself on associated course rules as you progress, quiz yourself on specific areas, or freely explore the Corpus Christi area's course rules.",
    ],
  },
  '/tw4/systems': {
    icon: 'systems',
    blurb: 'Six live T-6B schematics: hydraulics, prop, oil, electrical, OBOGS, fuel.',
    more: [
      'The Systems page features interactive diagrams for T-6B aircraft systems. Explore hydraulics, electrical, and more systems to come with annotated schematics that let you trace flows, understand relationships between components, and build systems knowledge for your systems briefs.',
    ],
  },
  '/tw4/jetlog': {
    icon: 'jetlog',
    blurb: 'A jet log and 1801 flight plan, interpolated from the NATOPS tables.',
    more: [
      'The Jet Log page instantly generates a Jet Log and 1801 flight plan, automatically using and interpolating the appropriate NATOPS tables and referencing General Planning chapter 4. Makes flight planning take a fraction of the time!',
    ],
  },
};

function TW4About() {
  // Preload images for EPs page to reduce load times
  useEffect(() => {
    const imagesToPreload = [
      '/images/croptop.webp',
      '/images/left.webp',
      '/images/right.webp',
      '/images/stick.webp'
    ];

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <AboutPage
      title={<>Welcome to <em>Primary</em></>}
      intro="T-6B Primary training tools, built from a TW4 perspective."
      photo="/images/t6b.webp"
      photoAlt="A T-6B Texan II"
      tabs={aboutTabs('tw4', CONTENT)}
      explainer={
        <>
          <p>
            This section is dedicated to Primary training resources. It was made from a TW4 perspective
            so may have some inaccuracies for TW5.
          </p>
          <p>
            This is a work in progress. More pages and content will be added over time. If you see any
            bugs PLEASE reach out personally at pinksheetmafia@gmail.com
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

export default TW4About;
