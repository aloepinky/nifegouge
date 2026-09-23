import React from 'react';
import Discuss from './discuss/Discuss';
import { NIFE_SYLLABUS_ID } from './discuss/SyllabusContext';

// NIFE's Discussion Items tab: the same tab as Primary's at a second address, showing the
// pages written for NIFE and the NIFE flight-stage syllabus in place of Delta.
//
// A page is identified by (school, slug), so NIFE has its own `turn-pattern`, `crm` and
// `power-off-stall` — different aircraft, different pages. See discuss/paths.js for the
// address and lambda/discussApi/namespace.mjs for how the two are stored apart.
//
// The NIFE syllabus carries no course-flow chart: the flight stage is six blocks and about
// twenty events, which the stage list shows better than a figure would.

function NIFEDiscuss() {
  return (
    <Discuss
      base="/nife/discuss"
      school="NIFE"
      syllabusId={NIFE_SYLLABUS_ID}
      syllabusName="NIFE Syllabus"
    />
  );
}

export default NIFEDiscuss;
