import React from 'react';
import AboutPage from './about/AboutPage.js';
import { aboutTabs } from './about/tabs.js';
import { EpStats, BriefStats, SyllabusStats } from './about/SchoolStats.js';
import { PLATFORMS as ALL_PLATFORMS } from './about/platforms.js';

const PLATFORMS = ALL_PLATFORMS.nife;

// What this page says about each NIFE tab. The order and the names come from the program's tab
// list in programs.js, which the top bar reads too — see about/tabs.js.
const CONTENT = {
  '/nife/questions': {
    icon: 'questions',
    blurb: 'About 450 community-vetted practice questions across every NIFE topic.',
    more: [
      'A bank of ~450 community-vetted practice questions covering all major NIFE topics. Work through them in random order, filter by subject, and reveal answers when you need a hint.',
    ],
  },
  '/nife/nav': {
    icon: 'whiz',
    blurb: 'Navigation, FR&R and weather problems, generated and solved.',
    more: [
      'The navigation problem generator and solver including whiz wheel calculations, wind correction, fuel planning, and more. Work problems end-to-end or check your own work.',
      'The FR&R generator allow you to test yourself on the VFR cruising altitudes and determing which runway to land on. The weather generator creates SETAI practice problems to help you for the test.',
    ],
  },
  '/nife/docs': {
    icon: 'docs',
    blurb: 'Gouge documents and links from students who made it through NIFE.',
    more: [
      'Curated gouge documents and links submitted by students who have made it through NIFE. Covers study guides, quick-reference sheets, and other high-yield material.',
    ],
  },
  '/nife/eps-limits': {
    stats: <EpStats platforms={PLATFORMS} />,
    icon: 'eps',
    blurb: 'C172 emergency procedures one at a time, and the limits table.',
    more: [
      'The EPs tab drills the C172 emergency procedures one at a time, with the control panel beside them so you can find what each step calls for.',
      'The Limits tab is the C172 limits table to test yourself or learn by revealing the answers.',
    ],
  },
  '/nife/discuss': {
    stats: <SyllabusStats school="NIFE" />,
    icon: 'discuss',
    blurb: 'The NIFE flight-stage items, cited to the pubs and editable by anyone.',
    more: [
      'A Wikipedia style compendium of the NIFE flight-stage discussion items. Each item can be found through search, the stage list, or an event, and each page is built from the pubs with a citation on every block, so you can verify the information yourself.',
      'Anyone can edit any content, with a full history available to track changes. That way the community can ensure all content is up to date and accurate.',
    ],
  },
  '/nife/briefs': {
    stats: <BriefStats school="NIFE" />,
    icon: 'brief',
    blurb: 'The NIFE briefs, and a TOLD card that fills itself in.',
    more: [
      'The Briefs page holds the NIFE brief for quick reference.',
      'The TOLD card auto generates your weight and balance and performance numbers.',
    ],
  },
};

function NIFEAbout() {
  return (
    <AboutPage
      title={<>Welcome to <em>NIFE</em></>}
      intro="Problem generators, practice questions and gouge for NIFE, submitted and vetted by students who have made it through."
      photo="/images/c172.webp"
      photoAlt="A Cessna 172"
      photoCrop="center 32%"
      tabs={aboutTabs('nife', CONTENT)}
      explainer={
        <>
          <p>
            Here you'll find problem generators and solvers (primarily for Navigation, plus Weather and
            FR&amp;R), EPs and Limits practice/TOLD cards for flight stage, as well as curated gouge
            documents/links and high-quality practice questions, all submitted and vetted by students who
            have successfully made it through NIFE.
          </p>
          <p>
            The NIFE project is complete for now. I've personally written about 450 questions and 15
            documents. Going forward, any corrections or new content will be left up to the current NIFE
            community. If you spot issues or have ideas for new features, please reach out at
            pinksheetmafia@gmail.com.
          </p>
          <p>The value of this resource depends on the community:</p>
          <ul className="about-list">
            <li>Submit questions, docs, and links you think will help future students.</li>
            <li>Edit or downvote outdated or incorrect content.</li>
            <li>
              If you're comfortable with code, contribute directly via our{' '}
              <a
                href="https://github.com/aloepinky/nifegouge"
                target="_blank"
                rel="noopener noreferrer"
                className="about-link"
              >
                open-source GitHub repo
              </a>.
            </li>
          </ul>
          <p>Thanks,<br />PinkSheetMafia</p>
        </>
      }
    />
  );
}

export default NIFEAbout;
