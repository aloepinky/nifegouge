import React from 'react';
import DocsPage from './docs/DocsPage';

// The T-54A's Documents page. The page itself is shared with NIFE's and Primary's (docs/DocsPage.js).
const T54A = {
  program: 't54a',
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
    votedDocs: 't54aVotedDocs',
    votedLinks: 't54aVotedLinks',
    outdatedDocs: 't54aOutdatedDocs',
    outdatedLinks: 't54aOutdatedLinks',
  },
};

function T54ADocs() {
  return <DocsPage school={T54A} />;
}

export default T54ADocs;
