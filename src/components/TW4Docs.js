import React from 'react';
import DocsPage from './docs/DocsPage';

// Primary's Documents page. The page itself is shared with NIFE's (docs/DocsPage.js).
const PRIMARY = {
  program: 'tw4primary',
  topics: [
    { value: 'all', label: 'All Topics' },
    { value: 'groundschool', label: 'Ground School' },
    { value: 'instrumentgs', label: 'Instrument GS' },
    { value: 'fam', label: 'FAM' },
    { value: 'inst', label: 'INST' },
    { value: 'form', label: 'FORM' },
    { value: 'vnav', label: 'VNAV' },
    { value: 'cs', label: 'CS' },
    { value: 'generalflight', label: 'General Flight' },
  ],
  defaultTopic: 'groundschool',
  offerAll: false,
  storage: {
    votedDocs: 'tw4VotedDocs',
    votedLinks: 'tw4VotedLinks',
    outdatedDocs: 'tw4OutdatedDocs',
    outdatedLinks: 'tw4OutdatedLinks',
  },
};

function TW4Docs() {
  return <DocsPage school={PRIMARY} />;
}

export default TW4Docs;
