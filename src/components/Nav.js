import React from 'react';
import { Link, useParams } from 'react-router-dom';
import WhizWheel from './Nav/WhizWheel';
import JetLog from './Nav/JetLog';
import FRR from './FRR';
import Weather from './Weather';

const TABS = [
  { id: 'nav', label: 'Nav', Page: WhizWheel },
  { id: 'jetlog', label: 'Jet Log', Page: JetLog },
  { id: 'frr', label: 'FR&R', Page: FRR },
  { id: 'weather', label: 'Weather', Page: Weather },
];

function Nav() {
  const { tab } = useParams();
  const active = TABS.find(t => t.id === tab) || TABS[0];
  const { Page } = active;

  return (
    <>
      {/* Four tabs: without this they shrink and their labels wrap to two lines on a
          narrow phone. Scrolling keeps them on one row. Real links, so they take the
          keyboard and open in a new tab. */}
      <div className="sub-navbar sub-navbar--scrollable">
        {TABS.map(({ id, label }) => (
          <Link
            key={id}
            to={`/nife/nav/${id}`}
            className={`sub-navbar-link${active.id === id ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <Page />
    </>
  );
}

export default Nav;
