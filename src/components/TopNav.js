import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useMenuDismiss from './useMenuDismiss';

// The top bar: which program you are in, and which page of it you are on. Both are dropdowns
// rather than rows of tabs, because the row stopped fitting — TW4 has eight pages now, and the
// program list grows as the advanced aircraft arrive. Neither is a hamburger: each closed menu
// names where you are, so the bar still answers "what am I looking at" without being opened.

const PROGRAMS = [
  { id: 'nife', label: 'NIFE', aircraft: 'C172', home: '/nife/about', base: '/nife' },
  { id: 'tw4', label: 'Primary', aircraft: 'T-6B', home: '/tw4/about', base: '/tw4' },
];

const TABS = {
  nife: [
    { to: '/nife/about', label: 'About' },
    { to: '/nife/questions', label: 'Questions' },
    { to: '/nife/docs', label: 'Docs' },
    { to: '/nife/nav', label: 'Problem Generator' },
    { to: '/nife/flight', label: 'Flight' },
  ],
  tw4: [
    { to: '/tw4/about', label: 'About' },
    { to: '/tw4/eps-limits', label: 'EPs/Limits' },
    { to: '/tw4/docs', label: 'Docs' },
    { to: '/tw4/discuss', label: 'Discussion Items' },
    { to: '/tw4/briefs', label: 'Briefs/TOLD' },
    { to: '/tw4/courserules', label: 'Course Rules' },
    { to: '/tw4/systems', label: 'Systems' },
    { to: '/tw4/jetlog', label: 'Jet Log' },
  ],
};

const programName = (p) => `${p.label} - ${p.aircraft}`;

// The tab you are on: the longest `to` the path starts with, so /tw4/discuss/hud is still
// Discussion Items and /tw4/systems/fuel is still Systems.
function currentTab(tabs, pathname) {
  return tabs
    .filter((t) => pathname === t.to || pathname.startsWith(`${t.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0] || null;
}

// A menu that closes on a choice, and (through useMenuDismiss) on Escape or a click elsewhere.
function Dropdown({ name, current, align = 'left', children }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const trigger = useRef(null);
  useMenuDismiss(open, setOpen, wrap, trigger);

  return (
    <div className={`topnav-menu topnav-menu--${align}`} ref={wrap}>
      <button
        type="button"
        ref={trigger}
        className="topnav-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name}: ${current}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="topnav-current">{current}</span>
        <span className="topnav-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="topnav-panel" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const program = PROGRAMS.find((p) => pathname.startsWith(p.base)) || PROGRAMS[0];
  const tabs = TABS[program.id] || [];
  const tab = currentTab(tabs, pathname);

  return (
    <div className="navbar">
      <Dropdown name="Program" current={programName(program)}>
        {PROGRAMS.map((p) => (
          <button
            type="button"
            key={p.id}
            role="menuitem"
            className={`topnav-item${p.id === program.id ? ' active' : ''}`}
            onClick={() => navigate(p.home)}
          >
            {programName(p)}
          </button>
        ))}
      </Dropdown>

      <Link to="/" className="topnav-brand" aria-label="pinksheetmafia.com home">PSM</Link>

      <Dropdown name="Page" current={tab ? tab.label : 'Menu'} align="right">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            role="menuitem"
            className={`topnav-item${tab && t.to === tab.to ? ' active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </Dropdown>
    </div>
  );
}

export default TopNav;
