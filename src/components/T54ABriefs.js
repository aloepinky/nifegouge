import React from 'react';
import BriefsPage from './briefs/BriefsPage';

// The T-54A's Briefs page: the same page as the other schools', showing the briefs filed under
// the T-54A's own school word, so the T-44C's briefs are not here and these are not there. No
// TOLD card: TOLD sheets are picked up in maintenance with the ADB.

function T54ABriefs() {
  return <BriefsPage base="/t54a/briefs" school="T-54A" told={null} />;
}

export default T54ABriefs;
