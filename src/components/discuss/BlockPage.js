import React from 'react';
import { Link } from 'react-router-dom';
import { useSyllabus } from './SyllabusContext';
import { programLabel } from './program';

// One training block: its JPPT metadata, then its events. The block holds no content of its
// own — the course-flow chart draws blocks rather than events, so this page is where a box
// like FAM4301-4 lands, and every row from here is one event's discuss items.
function BlockPage({ block }) {
  const s = useSyllabus();
  const stage = s.getStage(block.stage);
  // Academics, exams and ground training print "Discuss Items: None", so their events are
  // listed but not linked — the same rule the chart and the stage nav follow.
  const briefed = s.hasDiscussItems(block);
  const written = briefed ? block.events.filter((e) => s.getEvent(e.id)) : [];
  const inNav = stage && s.briefedBlocksIn(stage.id).length > 0;

  const meta = [
    stage && stage.label,
    block.media,
    block.hours != null && `${block.hours} hrs`,
    block.hx != null && `H/X ${block.hx}`,
    // An H/X cell holding words instead of a number: FAM42's "See Syllabus Note c and d".
    block.hx == null && block.hxNote && `H/X: ${block.hxNote}`,
    block.blkName,
  ].filter(Boolean);

  // The JPPT's syllabus notes are a lettered list for the whole block, so they live here rather
  // than on each event; an event's own notes (its id-led lines) are on its event page.
  const notes = Array.isArray(block.syllabusNotes) ? block.syllabusNotes : [];

  return (
    <div className="discuss-layout discuss-layout--plain">
      <article className="discuss-page">
        <header className="discuss-head">
          {stage && (
            <p className="discuss-crumb">
              {programLabel(s) && <>{programLabel(s)} › </>}
              {inNav ? <Link to={s.stagePath(stage.id)}>{stage.label}</Link> : stage.label}
            </p>
          )}
          <h1>
            {block.id} <span className="discuss-head-title">{block.title}</span>
          </h1>
          <p className="discuss-meta">{meta.join(' · ')}</p>
          {(block.prereqs || notes.length > 0 || block.ssr) && (
            <dl className="discuss-eventmeta">
              {block.prereqs && <><dt>Prerequisites</dt><dd>{block.prereqs}</dd></>}
              {notes.length === 1 && <><dt>Syllabus notes</dt><dd>{notes[0]}</dd></>}
              {notes.length > 1 && (
                <>
                  <dt>Syllabus notes</dt>
                  <dd>
                    <ol className="discuss-notes">
                      {notes.map((n, i) => <li key={i}>{n}</li>)}
                    </ol>
                  </dd>
                </>
              )}
              {block.ssr && <><dt>Special syllabus requirements</dt><dd>{block.ssr}</dd></>}
            </dl>
          )}
        </header>

        <section className="discuss-section">
          <h2>Events</h2>
          <ol className="discuss-itemlist">
            {block.events.map((row) => {
              const event = briefed ? s.getEvent(row.id) : null;
              return (
                <li key={row.id}>
                  {event ? (
                    <Link to={s.eventPath(row.id)}>{row.id}</Link>
                  ) : (
                    <span className="discuss-inert">{row.id}</span>
                  )}
                  {row.title && row.title !== block.title && (
                    <span className="discuss-rowtitle">{row.title}</span>
                  )}
                  {/* No tag on an event without items: nothing is missing from it. */}
                  {event && (
                    <span className="discuss-tag discuss-tag--quiet">
                      {event.items.length} items
                    </span>
                  )}
                  {row.note && <span className="discuss-rownote">{row.note}</span>}
                </li>
              );
            })}
          </ol>
          {written.length === 0 && (
            <p className="discuss-empty">
              {!briefed
                ? 'The JPPT lists no discuss items for this block.'
                : 'None of this block’s events has a page yet.'}
            </p>
          )}
        </section>
      </article>
    </div>
  );
}

export default BlockPage;
