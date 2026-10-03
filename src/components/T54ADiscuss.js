import React from 'react';
import Discuss from './discuss/Discuss';
import { T54A_SYLLABUS_ID } from './discuss/SyllabusContext';

// The T-54A's Discussion Items tab. The T-54A is a school of its own (`school: 'T-54A'`), so its
// pages are written for its own NATOPS, FTI and checklist and stored apart from the T-44C's. Most
// of its discuss items are the T-44C's too, and such a page has the T-44C page's slug.

// The school is stored as T-54A to keep the corpora apart, but the course is Advanced, and the
// picker says so, as it does beside the T-44C's.
const TAGS = { 't54a-me': 'Advanced' };

function T54ADiscuss() {
  return (
    <Discuss
      base="/t54a/discuss"
      school="T-54A"
      syllabusId={T54A_SYLLABUS_ID}
      syllabusName="T-54A"
      syllabusTags={TAGS}
    />
  );
}

export default T54ADiscuss;
