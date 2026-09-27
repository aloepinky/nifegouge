import React from 'react';
import BriefsPage from './briefs/BriefsPage';

// Advanced's Briefs/TOLD page: the same page as Primary's and NIFE's at a third address,
// showing the briefs written for Advanced. There is no T-44C TOLD card yet, so the TOLD
// button is left off until one is built; pass it as `told` then.
//
// A draft: routed and in the nav on a dev server only (see `briefs: 'draft'` in programs.js).

function T44CBriefs() {
  return <BriefsPage base="/t44c/briefs" school="Advanced" told={null} />;
}

export default T44CBriefs;
