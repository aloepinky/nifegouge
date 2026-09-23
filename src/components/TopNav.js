import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useMenuDismiss from './useMenuDismiss';
import { navPrograms, programName, DRAFT } from './programs';

// The top bar: which program you are in, and which page of it you are on. Both are dropdowns
// rather than rows of tabs, because the row stopped fitting — TW4 has eight pages now, and the
// program list grows as the advanced aircraft arrive. Neither is a hamburger: each closed menu
// names where you are, so the bar still answers "what am I looking at" without being opened.

// The program list is shared with everything else that names a school: see programs.js.

// A tab marked `draft` is shown on a dev server and left out of a production build, the way
// programs.js gates a draft program. The page it points at is unrouted there too.
const TABS = {
  nife: [
    { to: '/nife/about', label: 'About' },
    { to: '/nife/questions', label: 'Questions' },
    { to: '/nife/docs', label: 'Docs' },
    { to: '/nife/discuss', label: 'Discussion Items', draft: true },
    { to: '/nife/nav', label: 'Problem Generator' },
    { to: '/nife/eps-limits', label: 'EPs/Limits' },
    { to: '/nife/briefs', label: 'Briefs/TOLD' },
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
  t44c: [
    { to: '/t44c/eps-limits', label: 'EPs/Limits' },
  ],
};

const shownTabs = (tabs) => tabs.filter((t) => !t.draft || DRAFT);

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

// The wordmark's full size, and the smallest it is shrunk to before it gives way altogether.
const BRAND_PX = 26;
const BRAND_MIN_PX = 11;
const BRAND_GAP = 10; // clear space kept between the wordmark and either menu

// Sizes the wordmark to the room the two menus leave it. It is centred on the bar, so what it
// may use is twice the distance from the centre to the nearer menu. Measured at full size and
// scaled down in proportion, which is exact because the letter-spacing is in em.
function useBrandFit(bar, brand, deps) {
  useLayoutEffect(() => {
    const el = bar.current;
    const mark = brand.current;
    if (!el || !mark) return undefined;
    const fit = () => {
      const menus = el.querySelectorAll('.topnav-menu');
      if (menus.length < 2) return;
      const box = el.getBoundingClientRect();
      const centre = box.left + box.width / 2;
      const room = 2 * Math.min(
        centre - menus[0].getBoundingClientRect().right,
        menus[1].getBoundingClientRect().left - centre,
      ) - 2 * BRAND_GAP;
      mark.style.fontSize = `${BRAND_PX}px`;
      const full = mark.getBoundingClientRect().width;
      const px = Math.min(BRAND_PX, (BRAND_PX * room) / full);
      mark.style.fontSize = `${Math.max(px, BRAND_MIN_PX)}px`;
      mark.style.visibility = px < BRAND_MIN_PX ? 'hidden' : '';
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    el.querySelectorAll('.topnav-menu').forEach((m) => watch.observe(m));
    // The web font arriving changes every width measured here without resizing the bar.
    if (document.fonts) document.fonts.ready.then(fit);
    return () => watch.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bar = useRef(null);
  const brand = useRef(null);

  // Chosen from the programs the navigation offers, not from every program there is: a draft
  // program's routes do not exist on the live site, and picking it here would leave the bar
  // announcing a program whose pages render nothing.
  const offered = navPrograms();
  const program = offered.find((p) => pathname.startsWith(p.base)) || offered[0];
  const tabs = shownTabs(TABS[program.id] || []);
  const tab = currentTab(tabs, pathname);
  useBrandFit(bar, brand, [program.id, tab && tab.to]);

  return (
    <div className="navbar" ref={bar}>
      <Dropdown name="Program" current={programName(program)}>
        {navPrograms().map((p) => (
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

      {/* The P carries its own letter-spacing: see .topnav-brand-p for why the even one is wrong. */}
      <Link to="/" className="topnav-brand" ref={brand} aria-label="pinksheetmafia.com home">
        <span className="topnav-brand-p">P</span>SM
      </Link>

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
