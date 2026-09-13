import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getItemMeta } from './registry';
import { rowKey, useSyllabus } from './SyllabusContext';
import ItemLink from './ItemLink';
import EventItemsEditor from './EventItemsEditor';
import CreatePanel from './edit/CreatePanel';
import { EditLink } from './edit/EditLink';
import { SlugOptions } from './edit/fields';

// Where an `href` row sends the reader, named for the badge beside it. There is more than
// one destination now — the EPs live on one tab and the course rules on another — so the
// badge is looked up rather than assumed. A path with no entry here renders no badge, which
// is the right failure: a wrong tab name is worse than none.
const HREF_TARGETS = {
  '/tw4/eps-limits': 'EPs & Limits',
  '/tw4/courserules': 'Course Rules',
};

// A JPPT wording as a page title: first letter up, the rest as written.
const sentenceCase = (label) => label.charAt(0).toUpperCase() + label.slice(1);

// One event: its JPPT metadata, then its discuss items in JPPT order. The hub holds no
// content of its own — each row links to the item's canonical page, tagged ?from= (Delta
// only) so the page can offer prev/next through this event's list.
function EventHub({ event }) {
  const s = useSyllabus();
  const [editing, setEditing] = useState(null); // 'list' | { create: row }
  const block = s.blockOf(event.id);
  const stage = block && s.getStage(block.stage);
  const inNav = stage && s.briefedBlocksIn(stage.id).length > 0;
  const meta = [event.block, event.media, event.hours != null && `${event.hours} hrs`].filter(Boolean);
  const busy = !!editing;
  const canEdit = !!s.record;

  return (
    <div className="discuss-layout discuss-layout--plain">
    <article className="discuss-page">
      <header className="discuss-head">
        {block && (
          <p className="discuss-crumb">
            {inNav && <><Link to={s.stagePath(stage.id)}>{stage.label}</Link> › </>}
            <Link to={s.blockPath(block.id)}>{block.id} {block.title}</Link>
          </p>
        )}
        <h1>
          {event.id} <span className="discuss-head-title">{event.title}</span>
        </h1>
        <p className="discuss-meta">{meta.join(' · ')}</p>
        {(event.prereqs || event.syllabusNotes) && (
          <dl className="discuss-eventmeta">
            {event.prereqs && <><dt>Prerequisites</dt><dd>{event.prereqs}</dd></>}
            {event.syllabusNotes && <><dt>Syllabus notes</dt><dd>{event.syllabusNotes}</dd></>}
          </dl>
        )}
      </header>

      <section className="discuss-section">
        <h2>
          Discuss Items
          {canEdit && editing !== 'list' && (
            <EditLink onClick={() => setEditing('list')} what="the list of items" disabled={busy} />
          )}
        </h2>
        {editing === 'list' ? (
          <EventItemsEditor
            event={event}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            {/* An event with no items is not an omission. FAM4501's JPPT entry reads, in full,
                "Per the ODO/FDO solo brief" — it names none, and an empty list would read as a
                page that had not been filled in. Say so instead. */}
            {event.items.length === 0 && (
              <p className="discuss-para">
                The JPPT names no discuss items for this event. What is briefed comes from the
                ODO/FDO solo brief and the syllabus notes above.
              </p>
            )}
            <ol className="discuss-itemlist">
              {event.items.map((row) => {
                // An `href` row has no page of its own — it is the JPPT's wording linking to
                // where that content already lives. Shown by the JPPT's label, since there is
                // no page title to prefer, and never tagged as outstanding work.
                if (row.href) {
                  return (
                    <li key={rowKey(row)}>
                      <Link to={row.href}>{row.label}</Link>
                      {HREF_TARGETS[row.href] && (
                        <span className="discuss-tag discuss-tag--quiet">{HREF_TARGETS[row.href]}</span>
                      )}
                    </li>
                  );
                }
                // A label-only row: the JPPT names it and nobody has a page for it yet. Creating
                // one starts a stub and points this row at it in the same step.
                if (!row.slug) {
                  const creating = editing && editing.create === rowKey(row);
                  return (
                    <li key={rowKey(row)}>
                      <span className="discuss-inert">{row.label}</span>
                      <span className="discuss-tag">no page yet</span>
                      {canEdit && !creating && (
                        <button
                          type="button"
                          className="discuss-create-page"
                          disabled={busy}
                          title={busy ? 'Finish or cancel the open editor first' : undefined}
                          onClick={() => setEditing({ create: rowKey(row) })}
                        >
                          Create page
                        </button>
                      )}
                      {creating && (
                        <CreatePanel
                          title={sentenceCase(row.label)}
                          link={{ syllabusId: s.id, eventId: event.id, label: row.label }}
                          onCancel={() => setEditing(null)}
                        />
                      )}
                    </li>
                  );
                }
                const item = getItemMeta(row.slug);
                return (
                  <li key={rowKey(row)}>
                    {/* The page's own title, not the event's JPPT label — an item is named
                        the same way everywhere it appears. `label` stays in the document as
                        the JPPT's verbatim wording and feeds the search aliases. */}
                    <ItemLink slug={row.slug} to={s.rowTo(row, event.id)}>{item ? item.title : row.label}</ItemLink>
                    {item && item.stub && <span className="discuss-tag">not written</span>}
                    {!item && <span className="discuss-tag discuss-tag--missing">missing</span>}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>
      <SlugOptions />
    </article>
    </div>
  );
}

export default EventHub;
