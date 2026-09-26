import React from 'react';
import { useSyllabus } from './SyllabusContext';
import { syllabusStats } from '../about/stats';

// What the syllabus on screen asks of a student, above its course-flow chart: the course
// length the publication prints in its Course Data, its flights and sims (every event numbered
// 2000 or above is one or the other), and its discuss items. Counted from the document
// (about/stats.js), so an edit to a block moves the numbers with it.
//
// A figure the document does not carry is left out: a syllabus uploaded before the parser read
// Course Data has no course length until one is added.
//
// `platform` is the community chosen above, for a syllabus that splits. The figures are then
// that community's: they genuinely differ, and the publication says so itself — 1542.168C
// prints a flight-training table per community, and a P-8 student flies 32 of the syllabus's
// 40 flights. The E-6 is the case to keep in mind: it has a chart and a CIN but no row in
// Course Data, so it shows no weeks and no training days rather than somebody else's.

const fmt = (n) => n.toLocaleString('en-US');

function CourseSummary({ platform = null }) {
  const s = useSyllabus();
  const doc = s && s.record && s.record.doc;
  if (!doc) return null;
  const st = syllabusStats(doc, platform);

  const figures = [
    st.weeks != null && { label: st.weeksLabel.toLowerCase(), value: st.weeks },
    st.trainingDays != null && { label: 'training days', value: st.trainingDays },
    { label: 'flights', value: st.flights },
    st.flightHours != null && { label: 'flight hours', value: st.flightHours },
    { label: 'sims', value: st.sims },
    { label: 'discuss items', value: st.discussItems },
  ].filter(Boolean);

  return (
    <section className="discuss-course" aria-label="Course summary">
      <dl className="discuss-course-figures">
        {figures.map((f) => (
          <div key={f.label} className="discuss-course-figure">
            <dt>{f.label}</dt>
            <dd>{fmt(f.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default CourseSummary;
