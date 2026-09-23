import React from 'react';

// One line icon per About page tab. Keys are what an About page's tab passes as `icon`.
const PATHS = {
  eps: <><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17h.01" /></>,
  systems: (
    <>
      <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 12H13V6h2.5M13 12v6h2.5" />
    </>
  ),
  brief: <><rect x="5" y="4" width="14" height="17" rx="1" /><path d="M9 4V2h6v2M8 10h8M8 14h8M8 18h4" /></>,
  map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v14M15 6v14" /></>,
  discuss: <><path d="M5 4h11l3 3v13H5Z" /><path d="M8 10h8M8 14h8M8 18h5" /></>,
  jetlog: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M3 14h18M9 4v16M15 4v16" /></>,
  docs: <><path d="M3 7h6l2 2h10v10H3Z" /><path d="M3 7V5h6l2 2" /></>,
  questions: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-.7.7-.7 1.3M12 17h.01" /></>,
  whiz: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M18 18l-2-2" /></>,
};

function AboutIcon({ name, size = 18 }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export default AboutIcon;
