import React from 'react';
import DocsPage from './docs/DocsPage';

// The T-44C's Documents page. The page itself is shared with NIFE's and Primary's (docs/DocsPage.js).
const T44C = {
  program: 't44c',
  topics: [
    { value: 'all', label: 'All Topics' },
    { value: 'groundschool', label: 'Ground School' },
    { value: 'systems', label: 'Systems' },
    { value: 'contact', label: 'Contact' },
    { value: 'instruments', label: 'Instruments' },
    { value: 'navigation', label: 'Navigation' },
    { value: 'generalflight', label: 'General Flight' },
  ],
  defaultTopic: 'groundschool',
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
