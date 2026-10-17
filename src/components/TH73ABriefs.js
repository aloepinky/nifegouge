import React from 'react';
import BriefsPage from './briefs/BriefsPage';

// The TH-73A's Briefs page: the same page as the other schools', showing the briefs filed under
// the TH-73A's own school word. No TOLD card: the TH-73A's performance numbers come off the
// weight and balance sheet and the NATOPS charts, briefed under Flight Planning.

function TH73ABriefs() {
  return <BriefsPage base="/th73a/briefs" school="TH-73A" told={null} />;
}

export default TH73ABriefs;
