import React from 'react';
import BriefsPage from './briefs/BriefsPage';

// Advanced's Briefs page: the same page as Primary's and NIFE's at a third address,
// showing the briefs written for Advanced. It has no TOLD card on purpose: T-44C TOLD
// cards are done in maintenance, where students don't use PSM.
//
// A draft: routed and in the nav on a dev server only (see `briefs: 'draft'` in programs.js).

function T44CBriefs() {
  return <BriefsPage base="/t44c/briefs" school="Advanced" told={null} />;
}

export default T44CBriefs;
