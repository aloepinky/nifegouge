import React from 'react';
import Discuss from './discuss/Discuss';
import { T44C_P8_ID } from './discuss/SyllabusContext';

// Advanced's Discussion Items tab: the same tab as Primary's and NIFE's at a third address,
// showing the pages written for the T-44C and the Advanced syllabi in place of Delta.
//
// Two syllabi share this mount, because they are two courses flown in one aircraft: the
// multi-service Advanced syllabus (CNATRAINST 1542.168C, opened by default) and the E-2D
// Intermediate one (1542.175D). Both are `school: 'Advanced'`, so both are offered by the
// syllabus picker and both read the one T-44C page corpus — the aircraft's EPs, limits and
// systems are the same whichever community a student is going to. Which community they are
// going to is in the syllabus's name, since nothing else on the title page says.
//
// A page is identified by (school, slug), so Advanced has its own pages independent of
// NIFE's and Primary's. See discuss/paths.js for the address and
// lambda/discussApi/namespace.mjs for how the corpora are stored apart.

function T44CDiscuss() {
  return (
    <Discuss
      base="/t44c/discuss"
      school="Advanced"
      syllabusId={T44C_P8_ID}
      syllabusName="T-44C P-8 Advanced"
    />
  );
}

export default T44CDiscuss;
