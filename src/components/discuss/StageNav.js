import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSyllabus } from './SyllabusContext';

// Stage, then block, then event — the syllabus as the JPPT orders it, so the path to an event
// is the path a student already knows. Native <details> carries the keyboard and screen-reader
// behaviour, so there is no state here beyond which stage a link arrived pointing at.
//
// Only the blocks that carry discuss items are listed, and only the stages holding one. The
// rest are not here at all — there is nothing in them to open. They appear on the course-flow
// chart, faded, which is where showing the sequence is the point.
function StageNav() {
  const s = useSyllabus();
  const { hash } = useLocation();
  const openStage = hash.replace('#', '').toUpperCase();

  return (
    <div className="discuss-stagenav">
      {s.navStages().map((stage) => {
        const blocks = s.briefedBlocksIn(stage.id);
        const events = blocks.reduce((n, b) => n + b.events.length, 0);
        return (
          <details
            key={stage.id}
            id={stage.id}
            className="discuss-stagenav-stage"
            open={stage.id === openStage}
          >
            <summary>
              <span className="discuss-stagenav-id">{stage.id}</span>
              <span className="discuss-stagenav-name">{stage.label}</span>
              <span className="discuss-stagenav-meta">
                {blocks.length} blocks · {events} events{stage.weight ? ` · ${stage.weight}` : ''}
              </span>
            </summary>

            {blocks.map((block) => {
              return (
                <details key={block.id} className="discuss-stagenav-block">
                  <summary>
                    <span className="discuss-stagenav-id">{block.id}</span>
                    <span className="discuss-stagenav-name">{block.title}</span>
                    <span className="discuss-stagenav-meta">
                      {block.media}
                      {block.hx != null ? ` · H/X ${block.hx}` : ''}
                      {` · ${block.events.length} `}
                      {block.events.length === 1 ? 'event' : 'events'}
                    </span>
                  </summary>

                  <ul className="discuss-stagenav-events">
                    {block.events.map((row) => {
                      const event = s.getEvent(row.id);
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
                          {/* No tag on an event without a row: the JPPT names no items for
                              it (G0101), so nothing is missing. */}
                          {event && (
                            <span className="discuss-tag discuss-tag--quiet">
                              {event.items.length} items
                            </span>
                          )}
                          {row.note && <span className="discuss-rownote">{row.note}</span>}
                        </li>
                      );
                    })}
                    <li className="discuss-stagenav-blocklink">
                      <Link to={s.blockPath(block.id)}>{block.id} block page</Link>
                    </li>
                  </ul>
                </details>
              );
            })}
          </details>
        );
      })}
    </div>
  );
}

export default StageNav;
