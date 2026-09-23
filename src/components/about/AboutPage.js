import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AboutIcon from './aboutIcons.js';

/*
 * The About page every program shares: a photo masthead, the tabs as a large index,
 * and a preview panel holding the tab's own explanation. The preview is hidden on a
 * phone, where each row carries its blurb instead.
 *
 * tabs: [{ name, path, icon, blurb, more: [paragraph, ...] }]
 *
 * photoCrop is a CSS background-position. Every photo sits its subject somewhere different,
 * so a page sets its own to keep the aircraft clear of the title; the default suits a
 * subject already sitting right of centre.
 */
function AboutPage({ title, intro, photo, photoAlt, photoCrop = 'center 45%', tabs, explainer }) {
  const [selected, setSelected] = useState(0);
  const tab = tabs[selected];

  return (
    <div className="about-page">
      <div
        className="about-masthead"
        style={{ backgroundImage: `url(${photo})`, backgroundPosition: photoCrop }}
        role="img"
        aria-label={photoAlt}
      >
        <div className="about-mast-in">
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </div>

      <div className="about-index">
        <ul className="about-nav">
          {tabs.map((t, i) => (
            <li key={t.path}>
              <Link
                to={t.path}
                aria-current={i === selected ? 'true' : 'false'}
                onMouseEnter={() => setSelected(i)}
                onFocus={() => setSelected(i)}
              >
                <span className="about-nav-name">
                  <span className="about-nav-icon"><AboutIcon name={t.icon} /></span>
                  {t.name}
                </span>
              </Link>
              <p className="about-nav-blurb">{t.blurb}</p>
            </li>
          ))}
        </ul>

        <aside className="about-preview" aria-live="polite">
          <p className="about-preview-kicker">
            <span className="about-preview-icon"><AboutIcon name={tab.icon} size={18} /></span>
            About this tab
          </p>
          <h2>{tab.name}</h2>
          {tab.more.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <Link className="about-open" to={tab.path}>Open {tab.name} →</Link>
        </aside>
      </div>

      <details className="about-explainer">
        <summary>About this site</summary>
        <div className="about-explainer-body">{explainer}</div>
      </details>
    </div>
  );
}

export default AboutPage;
