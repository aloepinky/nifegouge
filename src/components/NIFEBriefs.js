import React from 'react';
import BriefsPage from './briefs/BriefsPage';
import ToldCard from './Flight/ToldCard';

// NIFE's Briefs/TOLD page, laid out like Primary's: the briefs across the top, TOLD at the end.
// It is the same page at a second address, showing the briefs written for NIFE and the C172
// TOLD card in place of the T-6B's.

function NIFEBriefs() {
  return (
    <BriefsPage
      base="/nife/briefs"
      school="NIFE"
      told={<ToldCard />}
      toldTitle="NIFE TOLD CARD - WEIGHT AND BALANCE"
    />
  );
}

export default NIFEBriefs;
