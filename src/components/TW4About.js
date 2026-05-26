import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function TW4About() {
  const navigate = useNavigate();
  // Preload images for EPs page to reduce load times
  useEffect(() => {
    const imagesToPreload = [
      '/images/croptop.png',
      '/images/left.png',
      '/images/right.png',
      '/images/stick.png',
      '/images/ldggrhandle.png',
      '/images/defog.png',
      '/images/parking.png'
    ];

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const navHeadingStyle = {
    fontSize: '18px',
    marginTop: '20px',
    marginBottom: '10px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  };

  return (
    <div className="page-container">
      <p className="about-text" style={{fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '-18px', marginBottom: '-15px', fontStyle: 'italic'}}>
        Tip: Scroll left/right through the tabs above if your screen is too narrow to display them all
      </p>
      <h1 className="about-title">
        Welcome to <em>TW4 Primary</em>
      </h1>

      <p className="about-text">
        This section is dedicated to TW4 Primary training resources (sorry Whiting)
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/tw4/eps-limits')}>EPs/Limits</h2>
      <p className="about-text">
        The EPs/Cockpit tab features a virtual interactive T-6 cockpit poster that serves as a comprehensive training tool for Emergency Procedures (EPs) and Quadfold checklists.
        By clicking through actual cockpit controls and following procedural flows, you can gain spatial awareness for where the controls are and start developing flow.
        Integrated Notes Warnings Cautions, expanded checklist items, and non-memory items allow for easy access to supplementary material. Or use Simple Mode to just review EPs and NWCs without the cockpit.
        Please refer to the instructions button on the top left for a more thorough explanation of how to use the virtual cockpit.
      </p>
      <p className="about-text">
        The Limits tab provides a virtual T-6B Operating Limitations table. You can quickly test yourself or learn the limits by revealing the answers when stuck.
        See if you can correctly answer all 106 limits in a random order!
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/tw4/docs')}>Docs</h2>
      <p className="about-text">
        The Docs page is a community-driven library of primary study materials.
        Find gouge, study guides, and useful references shared by fellow students.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/tw4/briefs')}>Briefs/TOLD</h2>
      <p className="about-text">
        The Briefs page allows you to practice the NATOPS brief for both Fam and Form. Clicking on a briefing item will reveal the associated
        expanded brief item in case you need a refresher or want to learn what is expected of you. 
        The TOLD card table automatically generates your TOLD card values to get you instantly ready for your brief. 
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/tw4/courserules')}>Course Rules</h2>
      <p className="about-text">
        The Course Rules page integrates an interactive course rule map with official text to help you build visual intuition while studying. You can build hypothetical flight paths and test yourself on associated
        course rules as you progress, quiz yourself on specific areas, or freely explore the Corpus Christi area's course rules.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/tw4/systems')}>Systems</h2>
      <p className="about-text">
        The Systems page features interactive diagrams for T-6B aircraft systems. Explore hydraulics, electrical, and more systems to come with annotated schematics
        that let you trace flows, understand relationships between components, and build systems knowledge for your systems briefs.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/tw4/jetlog')}>Jet Log</h2>
      <p className="about-text">
        The Jet Log page instantly generates a Jet Log and 1801 flight plan, automatically using and interpolating the appropriate NATOPS tables and referencing General Planning chapter 4. Makes flight planning take a fraction of the time!
      </p>

      <p className="about-text" style={{marginTop: '20px', fontStyle: 'italic'}}>
        This is a work in progress. More pages and content will be added over time. If you see any bugs PLEASE reach out personally at pinksheetmafia@gmail.com
      </p>

      <p className="about-text">
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

      <p className="about-text">
        Thanks,<br/>PinkSheetMafia
      </p>
    </div>
  );
}

export default TW4About;
