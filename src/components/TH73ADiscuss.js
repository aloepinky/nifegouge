import React from 'react';
import Discuss from './discuss/Discuss';
import { TH73A_SYLLABUS_ID } from './discuss/SyllabusContext';

// The TH-73A's Discussion Items tab. The TH-73A is a school of its own (`school: 'TH-73A'`), so
// its pages are written for its own NATOPS, pocket checklist, stage FTIs and the RWOP.
//
// Three syllabi share this mount, because they are three courses flown in one aircraft: the
// Advanced Helicopter SNA syllabus (CNATRAMCG 1542.186D, opened by default), the Intermediate
// Tilt-Rotor one (1542.188C) and the COPT-R/CORPS syllabus (the wing's SGTO 2.0). All three are
// `school: 'TH-73A'`, so all are offered by the syllabus picker and all read the one TH-73A page
// corpus: a discuss item briefed in two of them is one page.

// The school is stored as TH-73A to keep the corpus apart; the picker says which level each
// course is, as it does beside the T-44C's and the T-54A's.
const TAGS = { 'th73a-sna': 'Advanced', 'th73a-tr': 'Intermediate', 'th73a-coptr': 'Advanced' };

function TH73ADiscuss() {
  return (
    <Discuss
      base="/th73a/discuss"
      school="TH-73A"
      syllabusId={TH73A_SYLLABUS_ID}
      syllabusName="TH-73A SNA"
      syllabusTags={TAGS}
    />
  );
}

export default TH73ADiscuss;
