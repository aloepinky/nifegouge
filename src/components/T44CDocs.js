import React from 'react';
import DocsPage from './docs/DocsPage';

// The T-44C's Documents page. The page itself is shared with NIFE's and Primary's (docs/DocsPage.js).
const T44C = {
  program: 't44c',
  topics: [
    { value: 'all', label: 'All Topics' },
    { value: 'systems', label: 'Systems' },
    { value: 'metro', label: 'Metro' },
    { value: 'aero', label: 'Aero' },
    { value: 'frr', label: 'FRR' },
    { value: 'fams', label: 'Fams' },
    { value: 'instruments', label: 'Instruments' },
  ],
  defaultTopic: 'systems',
  offerAll: false,
  storage: {
    votedDocs: 't44cVotedDocs',
    votedLinks: 't44cVotedLinks',
    outdatedDocs: 't44cOutdatedDocs',
    outdatedLinks: 't44cOutdatedLinks',
  },
};

function T44CDocs() {
  return <DocsPage school={T44C} />;
}

export default T44CDocs;
