import { useEffect, useState } from 'react';

// Light or dark: the whole site's colours come from the tokens at the top of style.css, chosen
// by the `data-theme` attribute on <html>. public/index.html sets the attribute before the first
// paint (from the saved choice, else the device setting); this module is everything after that.
//
// The attribute is always a concrete 'light' or 'dark', never 'auto', so the stylesheet needs
// one selector. "Follow the device" is simply the absence of a saved choice.

export const THEME_KEY = 'psm-theme';
const BRAND = '#01202C';

const QUERY = '(prefers-color-scheme: dark)';

function deviceTheme() {
  try {
    return window.matchMedia(QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function savedTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'dark' || t === 'light' ? t : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  // The browser chrome around the page (a phone's address bar) matches the nav bar in both modes.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BRAND);
}

export function currentTheme() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || t === 'light' ? t : savedTheme() || deviceTheme();
}

// The theme in force and a setter that saves the choice for this browser. With no saved choice
// the device setting is followed live, so flipping the phone to dark flips the page.
export function useTheme() {
  const [theme, setThemeState] = useState(currentTheme);

  useEffect(() => {
    if (savedTheme()) return undefined;
    let mq;
    try {
      mq = window.matchMedia(QUERY);
    } catch {
      return undefined;
    }
    const follow = () => {
      const t = mq.matches ? 'dark' : 'light';
      applyTheme(t);
      setThemeState(t);
    };
    mq.addEventListener('change', follow);
    return () => mq.removeEventListener('change', follow);
  }, [theme]);

  const setTheme = (t) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // Private window: the choice lasts until the page is left.
    }
    applyTheme(t);
    setThemeState(t);
  };

  return { theme, setTheme };
}
