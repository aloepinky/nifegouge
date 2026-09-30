import React from 'react';
import DocsPage from './docs/DocsPage';

// NIFE's Documents page. The page itself is shared with Primary's (docs/DocsPage.js).
const NIFE = {
  topics: [
    { value: 'all', label: 'All Topics' },
    { value: 'aero', label: 'Aero' },
    { value: 'engines', label: 'Engines' },
    { value: 'frr', label: 'FR&R' },
    { value: 'nav', label: 'Nav' },
    { value: 'weather', label: 'Weather' },
    { value: 'flight', label: 'Flight Stage' },
  ],
  defaultTopic: 'all',
  offerAll: true,
  storage: {
    votedDocs: 'votedDocs',
    votedLinks: 'votedLinks',
    outdatedDocs: 'outdatedDocs',
    outdatedLinks: 'outdatedLinks',
  },
};

function Docs() {
  return <DocsPage school={NIFE} />;
}

export default Docs;
