import { useNavigate } from 'react-router-dom';

function NIFEAbout() {
  const navigate = useNavigate();
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
      <h1 className="about-title">
        Welcome to <em>NIFE</em>
      </h1>

      <p className="about-text">
        This section is dedicated to NIFE training resources
      </p>

      <p className="about-text">
        Here you'll find problem generators and solvers (primarily for Navigation, plus Weather and FR&amp;R), EPs and Limits practice/TOLD cards for flight stage,
        as well as curated gouge documents/links and high-quality practice questions, all submitted and vetted by
        students who have successfully made it through NIFE.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/nife/questions')}>Questions</h2>
      <p className="about-text">
        A bank of ~450 community-vetted practice questions covering all major NIFE topics. Work through them in random order, filter by subject, and reveal answers when you need a hint.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/nife/docs')}>Docs</h2>
      <p className="about-text">
        Curated gouge documents and links submitted by students who have made it through NIFE. Covers study guides, quick-reference sheets, and other high-yield material.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/nife/nav')}>Problem Generator</h2>
      <p className="about-text">
        The navigation problem generator and solver including whiz wheel calculations, wind correction, fuel planning, and more. Work problems end-to-end or check your own work.
        The FR&amp;R generator allow you to test yourself on the VFR cruising altitudes and determing which runway to land on.
        The weather generator creates SETAI practice problems to help you for the test.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/nife/eps-limits')}>EPs/Limits</h2>
      <p className="about-text">
        The C172 emergency procedures one at a time, with the controls beside them, and the limits table as the exam prints it. Game mode times you through the lot and puts you on the leaderboard.
      </p>

      <h2 className="about-subtitle" style={navHeadingStyle} onClick={() => navigate('/nife/briefs')}>Briefs/TOLD</h2>
      <p className="about-text">
        The briefing guides and the TOLD card generator. Verify your performance data before stepping to the aircraft.
      </p>

      <p className="about-text" style={{marginTop: '20px'}}>
        The NIFE project is complete for now. I've personally written about 450 questions and 15 documents. Going forward,
        any corrections or new content will be left up to the current NIFE community.
        If you spot issues or have ideas for new features, please reach out at pinksheetmafia@gmail.com.
      </p>

      <p className="about-text">
        The value of this resource depends on the community:
      </p>
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

      <p className="about-text">
        Thanks,<br/>PinkSheetMafia
      </p>
    </div>
  );
}

export default NIFEAbout;
