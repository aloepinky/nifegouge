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
    block.blkName,
  ].filter(Boolean);

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
          {block.prereqs && (
            <dl className="discuss-eventmeta">
              <dt>Prerequisites</dt>
              <dd>{block.prereqs}</dd>
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
