import React from 'react';
import BriefsPage from './briefs/BriefsPage';
import T44CTold from './T44C/T44CTold';

// Advanced's Briefs page: the same page as Primary's and NIFE's at a third address,
// showing the briefs written for Advanced and the VT-31 / VT-35 TOLD card, which carries its
// own title as the printed card does.

function T44CBriefs() {
  return <BriefsPage base="/t44c/briefs" school="Advanced" told={<T44CTold />} />;
}

export default T44CBriefs;
