import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { generatedFor } from './GENERATED';
import { getItemMeta } from './registry';
import { useSyllabus } from './SyllabusContext';
import { rememberItem, refreshItem } from './discussApi';
import ItemLink from './ItemLink';
import { getSystemTab } from '../systems/systemTabs';
import { programLabel, withDefaultProgram } from './program';
import { getDraft, getRecord, saveDraft, clearDraft, clone } from './edit/draft';
import { allIds } from './edit/ids';
import { validate } from './edit/validate';
import { SlugOptions, ConfirmButton, resolveLink } from './edit/fields';
import { EditLink, HeadLink, DraftBanner } from './edit/EditLink';
import PublishDialog from './edit/PublishDialog';
import SectionEditor from './edit/SectionEditor';
import NumbersEditor from './edit/NumbersEditor';
import PageEditor from './edit/PageEditor';

// The one piece of inline markup the item data carries: `**bold**`. It exists for mnemonics —
// the C-R-A-F-T of a clearance readback, the L-D-D-H-A of an approach setup — where the point
// of the passage is the letters, and a reader who cannot see them has not got the mnemonic.
// Item files stay pure data because this is still a plain string; only the renderer knows what
// the asterisks mean. Do not grow this into a markdown dialect: bold is the whole vocabulary,
// and anything that wants more structure wants a subsection.
function inline(text) {
  if (typeof text !== 'string' || !text.includes('**')) return text;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (
    // eslint-disable-next-line react/no-array-index-key
    i % 2 ? <strong key={i}>{part}</strong> : part
  ));
}

// Superscript citation markers. `refs` is a list of reference numbers; each links to its
// entry in the References list at the foot of the page.
function Cite({ refs }) {
  if (!refs || !refs.length) return null;
  return (
    <sup className="discuss-cite">
      {refs.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && <span className="discuss-cite-sep">,</span>}
          <a href={`#ref-${n}`}>{n}</a>
        </React.Fragment>
      ))}
    </sup>
  );
}

// A section sourced entirely to the same reference is cited once at the end rather than
// on every bullet — repeating one marker down a nine-bullet list is noise, not rigor.
// An explicit `section.refs` wins, which is how a whole section is attributed to one page.
function sectionCite(section) {
  if (section.refs) return section.refs;
  // Subsection blocks count toward the collapse: a section whose every part traces to one
  // page of one publication is cited once at the foot, however it is subdivided.
  const blocks = [
    ...(section.paras || []),
    ...(section.items || []),
    ...(section.tables || []),
    ...(section.subsections || []).flatMap(
      (s) => [...(s.paras || []), ...(s.items || []), ...(s.tables || [])],
    ),
  ];
  const keys = blocks.map((b) => (b.refs || []).join(','));
  if (keys.length && keys[0] !== '' && keys.every((k) => k === keys[0])) {
    return blocks[0].refs;
  }
  return null;
}

// A See also or hatnote entry as a link: an item's page, or a link elsewhere ({ href, label }).
function EntryLink({ target }) {
  if (target.slug) return <ItemLink slug={target.slug}>{target.title}</ItemLink>;
  if (/^https?:/.test(target.href)) {
    return <a href={target.href} target="_blank" rel="noopener noreferrer">{target.label}</a>;
  }
  return <Link to={target.href}>{target.label}</Link>;
}

const entryKey = (t) => t.slug || t.href;

// MOS: where a section's topic has its own page, link it immediately under the heading.
function Hatnote({ slugs, label }) {
  const targets = (slugs || []).map(resolveLink).filter(Boolean);
  if (!targets.length) return null;
  return (
    <p className="discuss-hatnote">
      {label}:{' '}
      {targets.map((t, i) => (
        <React.Fragment key={entryKey(t)}>
          {i > 0 && ', '}
          <EntryLink target={t} />
        </React.Fragment>
      ))}
    </p>
  );
}

// Where the page's subject is a system that has an interactive diagram, close the lead with
// a link to it. `diagram` is a systemTabs id, or a list of them for a page covering two
// systems (oil-and-propeller-systems). An id with no diagram behind it renders nothing, so
// naming a system the site has not drawn yet is inert rather than a dead link.
//
// This is lead content, not a section: it never appears in the contents rail.
function DiagramLink({ diagram }) {
  const ids = Array.isArray(diagram) ? diagram : diagram ? [diagram] : [];
  const targets = ids.map(getSystemTab).filter(Boolean);
  if (!targets.length) return null;
  return (
    <p className="discuss-diagram-link">
      {targets.length > 1 ? 'Systems diagrams' : 'Systems diagram'}:{' '}
      {targets.map((t, i) => (
        <React.Fragment key={t.id}>
          {i > 0 && ', '}
          <Link to={`/tw4/systems/${t.id}`}>{t.label}</Link>
        </React.Fragment>
      ))}
    </p>
  );
}

// Figures. A section carries `figures: [{ id, src, alt, caption, refs }]`; `src` is a path
// under public/, by convention `/discuss/<slug>/<name>.webp`. Some items are mostly a
// diagram — the visual signal set is the obvious one — and cannot be written as prose.
//
// `alt` is required and is not the caption: it describes the image for a reader who
// cannot see it, while the caption says what it is. A figure with no alt fails the
// validator rather than shipping unreadable.
function Figures({ figures, showCite }) {
  if (!figures || !figures.length) return null;
  return (
    <>
      {figures.map((f) => (
        <figure className="discuss-figure" key={f.id}>
          <img src={f.src} alt={f.alt} loading="lazy" />
          {f.caption && (
            <figcaption>
              {f.caption}
              {showCite && <Cite refs={f.refs} />}
            </figcaption>
          )}
        </figure>
      ))}
    </>
  );
}

// Tables. A section carries `tables: [{ id, caption, cols, rows, refs, numeric }]`.
//
// The MOS default is prose and a list is already the exception to it; a table is the
// exception to the list, for content that is a matrix — two independent axes, or a lookup
// consulted under time pressure rather than read. Maximum holding speeds by altitude and
// field type is one; the airspace features matrix is one. A two-column list of parallel
// facts is not, and stays a list.
//
// `cols` is the header row and `rows` is an array of string arrays, each the same length as
// `cols`. Cells are plain strings and go through `inline`, so `**bold**` works and nothing
// else does — the item files stay pure data. The first cell of a row is its row header,
// which is what makes this a table to a screen reader rather than a grid of text.
//
// It scrolls inside its own container, like the Numbers infobox: the page body never
// scrolls horizontally and the airspace matrix is seven columns wide on a phone.
function Tables({ tables, showCite }) {
  if (!tables || !tables.length) return null;
  return (
    <>
      {tables.map((t) => (
        <div className="discuss-table-wrap" key={t.id}>
          <table className={t.numeric ? 'discuss-table discuss-table--numeric' : 'discuss-table'} id={t.id}>
            {t.caption && (
              <caption>
                {t.caption}
                {showCite && <Cite refs={t.refs} />}
              </caption>
            )}
            <thead>
              <tr>
                {t.cols.map((c) => (
                  <th scope="col" key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, r) => (
                // Rows have no ids of their own — the table is the addressable unit, and a
                // row header can legitimately repeat (an oil pressure band stated twice).
                // eslint-disable-next-line react/no-array-index-key
                <tr key={r}>
                  {row.map((cell, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    i === 0 ? <th scope="row" key={i}>{inline(cell)}</th> : <td key={i}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

// The prose-and-list body of a section or of one of its subsections. Identical either side of
// the heading level, which is the point: a subsection is a section that happens to sit inside
// another one, not a different kind of thing.
function SectionBody({ block, showCite }) {
  return (
    <>
      <Hatnote slugs={block.main} label="Main page" />
      <Hatnote slugs={block.further} label="Further information" />
      <Figures figures={block.figures} showCite={showCite} />
      <Tables tables={block.tables} showCite={showCite} />
      {(block.paras || []).map((para) => (
        <p className="discuss-para" key={para.id}>
          {inline(para.text)}
          {showCite && <Cite refs={para.refs} />}
        </p>
      ))}
      {block.items && block.items.length > 0 && (
        block.numbered ? (
          <ol className="discuss-list">
            {block.items.map((entry) => (
              <Bullet key={entry.id} item={entry} showCite={showCite} />
            ))}
          </ol>
        ) : (
          <ul className="discuss-list">
            {block.items.map((entry) => (
              <Bullet key={entry.id} item={entry} showCite={showCite} />
            ))}
          </ul>
        )
      )}
    </>
  );
}

function Bullet({ item, showCite }) {
  return (
    <li className="discuss-bullet">
      {inline(item.text)}
      {showCite && <Cite refs={item.refs} />}
      {item.sub && item.sub.length > 0 && (
        <ul className="discuss-sublist">
          {item.sub.map((s) => (
            <Bullet key={s.id} item={s} showCite={showCite} />
          ))}
        </ul>
      )}
    </li>
  );
}

// An item is named by its page title everywhere it appears — hub list, prev/next,
// hatnotes, See also. The event's `label` holds the JPPT's verbatim wording, which varies
// in case and punctuation between events, and is used for search aliases rather than
// display: one item, one name, however you arrived at it.
function itemName(row) {
  const item = getItemMeta(row.slug);
  return item ? item.title : row.label;
}

// A neighbour with no page yet is named but not linked.
function StripLink({ row, eventId, children }) {
  const s = useSyllabus();
  const to = s.rowTo(row, eventId);
  if (!to) return <span className="discuss-strip-end">{children}</span>;
  return row.slug ? <ItemLink slug={row.slug} to={to}>{children}</ItemLink> : <Link to={to}>{children}</Link>;
}

// The "you got here from event X" strip: position in that event's list, and prev/next
// through it. Absent when the page is visited by its canonical URL.
function EventStrip({ event, position }) {
  const s = useSyllabus();
  return (
    <nav className="discuss-strip" aria-label={`${event.id} discuss items`}>
      <Link className="discuss-strip-event" to={s.eventPath(event.id)}>
        {event.id} · {event.title}
      </Link>
      <span className="discuss-strip-pos">
        item {position.index + 1} of {position.total}
      </span>
      <span className="discuss-strip-nav">
        {position.prev ? (
          <StripLink row={position.prev} eventId={event.id}>← {itemName(position.prev)}</StripLink>
        ) : (
          <span className="discuss-strip-end">← start</span>
        )}
        {position.next ? (
          <StripLink row={position.next} eventId={event.id}>{itemName(position.next)} →</StripLink>
        ) : (
          <span className="discuss-strip-end">end →</span>
        )}
      </span>
    </nav>
  );
}

// "Any previously discussed maneuver" and its two relatives are lists of links rather than
// prose, generated from the syllabus so they cannot go stale. One block per event the list
// is generated against — on the canonical URL that is every event listing the item, because
// F4290 and CS4101 genuinely get different answers.
function GeneratedLists({ groups }) {
  if (!groups || !groups.length) return null;
  const many = groups.length > 1;
  return (
    <>
      {groups.map((g) => (
        <section className="discuss-section" id={genId(g)} key={g.anchor.id}>
          <h2>{genTitle(g, many)}</h2>
          {g.entries.length === 0 ? (
            <p className="discuss-para">
              No {genNoun(g)} pages are written for this scope yet.
            </p>
          ) : (
            <ul className="discuss-seealso">
              {g.entries.map((e) => (
                <li key={e.item.slug}>
                  <ItemLink slug={e.item.slug}>{e.item.title}</ItemLink>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

// I4490 generates a list of every item briefed earlier rather than only the maneuvers, so
// the noun the headings use comes from the group rather than being hardcoded.
function genNoun(g) {
  return g.noun || 'maneuver';
}

function genId(g) {
  return `${genNoun(g)}s-${g.anchor.id.toLowerCase()}`;
}

function genTitle(g, many) {
  if (many) return `Briefed before ${g.anchor.id}`;
  return genNoun(g) === 'item' ? 'Items' : 'Maneuvers';
}

// Left rail, section headings only. Sticky on wide screens; collapses above the article
// on a phone. The lead is not a numbered section, so its row is not numbered either.
function Contents({ item, extra, hasSeeAlso, hasRefs }) {
  return (
    <nav className="discuss-toc" aria-label="Contents">
      <h2>Contents</h2>
      <ol>
        <li>
          <a href="#top">(top)</a>
        </li>
        {/* A generated item has no sections of its own — its whole body is `extra`, the
            generated lists. Tolerate the absence rather than making every such item
            carry an empty array. */}
        {(item.sections || []).map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`}>{s.title}</a>
            {(s.subsections || []).length > 0 && (
              <ol>
                {s.subsections.map((sub) => (
                  <li key={sub.id}>
                    <a href={`#${sub.id}`}>{sub.title}</a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
        {(extra || []).map((row) => (
          <li key={row.id}>
            <a href={`#${row.id}`}>{row.title}</a>
          </li>
        ))}
        {hasSeeAlso && (
          <li>
            <a href="#see-also">See also</a>
          </li>
        )}
        {/* A page can be legitimately uncited — where no publication states the thing, the
            bare page is the warning. Do not print an empty References heading for it. */}
        {hasRefs && (
          <li>
            <a href="#references">References</a>
          </li>
        )}
      </ol>
    </nav>
  );
}

// MOS: infoboxes in the lead section are right-aligned. Values only — a label and a
// figure, nothing that reads as a sentence.
function NumbersBox({ numbers, onEdit, busy }) {
  return (
    <aside className="discuss-infobox" id="numbers" aria-label="Numbers">
      <div className="discuss-infobox-head">
        Numbers
        {onEdit && <EditLink onClick={onEdit} what="the Numbers box" disabled={busy} />}
      </div>
      <table>
        <tbody>
          {numbers.map((n, i) => {
            // Consecutive rows sharing a label print it once — two facts about the same
            // quantity read as one entry, not two.
            const repeat = i > 0 && numbers[i - 1].label === n.label;
            return (
              <tr key={n.id}>
                <th scope="row" aria-label={repeat ? n.label : undefined}>
                  {repeat ? '' : n.label}
                </th>
                <td>
                  {n.value}
                  <Cite refs={n.refs} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </aside>
  );
}

// Swap one section or subsection for another, or drop it. Matched on the id the editor was
// opened with, so a brand-new section that renames itself before its first save still lands
// in the right place.
function replaceBlock(item, id, next) {
  const sections = [];
  for (const s of item.sections || []) {
    if (s.id === id) {
      if (next) sections.push(next);
      continue;
    }
    if ((s.subsections || []).some((x) => x.id === id)) {
      const subs = next
        ? s.subsections.map((x) => (x.id === id ? next : x))
        : s.subsections.filter((x) => x.id !== id);
      sections.push({ ...s, subsections: subs.length ? subs : undefined });
      continue;
    }
    sections.push(s);
  }
  return { ...item, sections };
}

// `record` is the published page as the mirror serves it: { slug, rev, item, author,
// updatedAt }. `readOnly` renders it with no edit affordances, which is how an old revision
// is shown from the history page; `banner` is that page's note above the head. The page
// itself shows no revision number and no author: that is what the history page is for.
function ItemPage({ record, readOnly = false, banner = null }) {
  const [params] = useSearchParams();
  const s = useSyllabus();
  const item = record.item;
  const rev = record.rev;
  const historyTo = `/tw4/discuss/${item.slug}/history`;

  // The draft overlay. Discuss.js keys this component by slug, so navigating to another item
  // remounts and re-reads the store rather than carrying one page's edits onto the next.
  const [draft, setDraft] = useState(() => (readOnly ? null : getDraft(item.slug)));
  const [draftRecord, setDraftRecord] = useState(() => (readOnly ? null : getRecord(item.slug)));
  const [editing, setEditing] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [published, setPublished] = useState(false); // a publish just went through
  const [justSaved, setJustSaved] = useState(false);
  const bannerRef = useRef(null);

  const view = draft || item;
  const baseIds = draftRecord ? draftRecord.baseIds : allIds(item);
  const check = (next) => validate(next, baseIds);
  // A draft started against an older revision than the one now published.
  const draftBase = draftRecord && draftRecord.baseRev != null ? draftRecord.baseRev : rev;
  const behind = draft && draftBase !== rev;

  // Save commits to the draft and closes the editor. Publishing is a deliberate second step,
  // and the one step users skip: they read Save as the end of the job. So a save scrolls the
  // page to the banner that says otherwise and puts focus on its Publish button, which is
  // the difference between a warning and a warning that gets seen.
  // Sources added inside a section or Numbers editor arrive beside the block on Save and join
  // the page's list in the same commit, so the marker and its entry can never be published apart.
  const withRefs = (page, added) => (
    added && added.length ? { ...page, references: [...(page.references || []), ...added] } : page
  );

  const commit = (draftNext) => {
    // A page from before the aircraft and school fields existed is tagged with the
    // syllabus's on its next save, which is what the server requires of every page now.
    const next = { ...draftNext, ...withDefaultProgram(draftNext, s) };
    saveDraft(item.slug, next, item, draftBase);
    setDraft(clone(next));
    setDraftRecord(getRecord(item.slug));
    setEditing(null);
    setPublished(null);
    setJustSaved(true);
  };

  // Instant, and a tick late: closing the editor shortens the page by a screenful or more,
  // and the browser's clamp of the scroll position at that moment cancels a smooth scroll
  // started in the same frame. A jump after the layout has settled always lands. A timeout
  // rather than an animation frame, because a background tab runs no frames and the flag
  // has to reset either way; it resets inside the callback, since resetting first would
  // re-run this effect and its cleanup would cancel the timer before it fired.
  useEffect(() => {
    if (!justSaved) return undefined;
    const el = bannerRef.current;
    const timer = setTimeout(() => {
      setJustSaved(false);
      if (!el) return;
      el.scrollIntoView({ block: 'start' });
      const button = el.querySelector('.discuss-draft-publish');
      if (button) button.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const cancel = () => setEditing(null);

  // The draft has gone out: forget it here and let the store carry the new revision.
  const onPublished = (result) => {
    clearDraft(item.slug);
    rememberItem({
      slug: item.slug,
      rev: result.rev,
      updatedAt: result.updatedAt,
      author: result.author,
      summary: result.summary,
      item: clone(view),
    });
    setDraft(null);
    setDraftRecord(null);
    setPublishing(false);
    setConflict(false);
    setPublished(true);
  };

  const discard = () => {
    clearDraft(item.slug);
    setDraft(null);
    setDraftRecord(null);
    setEditing(null);
    setConflict(false);
  };

  // Someone published first. The draft stays; loading the newest revision rebases it, so the
  // next publish goes against what is actually on the site.
  const loadNewest = async () => {
    const newest = await refreshItem(item.slug);
    if (newest && draft) saveDraft(item.slug, draft, newest.item, newest.rev);
    setDraftRecord(getRecord(item.slug));
    setConflict(false);
    setPublishing(false);
  };

  // One editor open at a time, as a wiki does it. Rather than asking whether to throw away
  // what is in the open form, every other `[edit]` is disabled while it is open — the answer
  // to "can I edit two things at once" is visible instead of being a question.
  const open = (next) => setEditing(next);
  const busy = !!editing || publishing;

  // Every `[edit]` on the page goes through here, so a read-only rendering has none.
  const Edit = readOnly ? () => null : EditLink;

  const fromEvent = s.getEvent(params.get('from'));
  const position = s.positionIn(fromEvent, view.slug);
  const briefedIn = s.eventsListing(view.slug);
  const hasNumbers = !view.stub && view.numbers && view.numbers.length > 0;
  const seeAlso = (view.seeAlso || []).map(resolveLink).filter(Boolean);
  const genGroups = view.stub ? null : generatedFor(view, params.get('from'), s);
  const editingPage = editing && editing.kind === 'page';

  const head = (
    <>
      {banner}
      {draft && !readOnly && (
        <DraftBanner
          ref={bannerRef}
          savedAt={draftRecord && draftRecord.savedAt}
          behind={behind}
          publishing={publishing}
          onPublish={() => {
            setPublished(null);
            setPublishing(true);
          }}
          onDiscard={discard}
        />
      )}
      {publishing && !conflict && (
        <PublishDialog
          slug={item.slug}
          baseRev={draftBase}
          item={view}
          onPublished={onPublished}
          onConflict={() => setConflict(true)}
          onCancel={() => setPublishing(false)}
        />
      )}
      {conflict && (
        <div className="discuss-editor-notice">
          <p>
            <strong>Someone else published this page while you were editing.</strong> Your
            edits are kept in this browser. Load the newest version, check your changes
            against it, then publish again.
          </p>
          <div className="discuss-draft-actions">
            <ConfirmButton
              label="Load the newest version"
              question="Your edits stay and will sit on top of the newest version."
              confirmLabel="Load it"
              onConfirm={loadNewest}
            />
            <button type="button" onClick={() => setConflict(false)}>Not now</button>
          </div>
        </div>
      )}
      {published && (
        <div className="discuss-editor-notice">
          <p><strong>Published.</strong> Your edits are on the site.</p>
          <button type="button" onClick={() => setPublished(false)}>Close</button>
        </div>
      )}
      <header className="discuss-head" id="top">
        {programLabel(view) && <p className="discuss-crumb">{programLabel(view)}</p>}
        <h1>
          {view.title}
          <Edit onClick={() => open({ kind: 'page' })} what="this page" label="edit page" disabled={busy} />
          {!readOnly && <HeadLink to={historyTo} label="history" />}
        </h1>
        {briefedIn.length > 0 && (
          <p className="discuss-briefed-in">
            Briefed on{' '}
            {briefedIn.map((e, i) => (
              <React.Fragment key={e.id}>
                {i > 0 && ', '}
                <Link to={s.eventPath(e.id)}>{e.id}</Link>
              </React.Fragment>
            ))}
          </p>
        )}
      </header>
      {fromEvent && position && <EventStrip event={fromEvent} position={position} />}
      {!readOnly && <SlugOptions />}
    </>
  );

  const pageEditor = (
    <PageEditor item={view} onSave={commit} onCancel={cancel} check={check} />
  );

  // A stub has no body to edit — it becomes a page by clearing the stub flag in the page
  // editor and adding a section, which is why the page editor is reachable from here too.
  if (view.stub) {
    return (
      <div className="discuss-layout discuss-layout--plain">
        <article className="discuss-page">
          {head}
          {editingPage ? (
            pageEditor
          ) : (
            <section className="discuss-stub">
              <h2>Not written yet</h2>
              <p>Nobody has distilled this item.{view.sourcingLead ? " Where the next person should look:" : ""}</p>
              {view.sourcingLead && <p className="discuss-stub-lead">{view.sourcingLead}</p>}
              {!readOnly && (
                <p className="discuss-page-edit">
                  <Edit
                    onClick={() => open({ kind: 'page' })}
                    what="the page"
                    label="write this page"
                    disabled={busy}
                  />
                </p>
              )}
            </section>
          )}
        </article>
      </div>
    );
  }

  return (
    <div className="discuss-layout">
      <Contents
        item={view}
        extra={(genGroups || []).map((g) => ({ id: genId(g), title: genTitle(g, genGroups.length > 1) }))}
        hasSeeAlso={seeAlso.length > 0}
        hasRefs={!!(view.references && view.references.length)}
      />
      <article className="discuss-page">
        {head}

        {editingPage ? (
          pageEditor
        ) : (
          <>
            {hasNumbers &&
              (editing && editing.kind === 'numbers' ? (
                <NumbersEditor
                  item={view}
                  onSave={(rows, added) => commit(withRefs({ ...view, numbers: rows }, added))}
                  onCancel={cancel}
                  check={(rows, added) => check(withRefs({ ...view, numbers: rows }, added))}
                />
              ) : (
                <NumbersBox
                  numbers={view.numbers}
                  onEdit={readOnly ? null : () => open({ kind: 'numbers' })}
                  busy={busy}
                />
              ))}
            {view.lede && <p className="discuss-lede-para">{inline(view.lede)}</p>}
            <DiagramLink diagram={view.diagram} />
            {view.note && <p className="discuss-note">{view.note}</p>}
            <GeneratedLists groups={genGroups} />

            {(view.sections || []).map((section) => {
              const collapsed = sectionCite(section);
              const editingThis = editing && editing.kind === 'section' && editing.id === section.id;
              return (
                <section className="discuss-section" id={section.id} key={section.id}>
                  <h2>
                    {section.title}
                    {!editingThis && (
                      <Edit
                        onClick={() => open({ kind: 'section', id: section.id })}
                        what={section.title}
                        disabled={busy}
                      />
                    )}
                  </h2>
                  {editingThis ? (
                    <SectionEditor
                      section={section}
                      item={view}
                      onSave={(next, added) => commit(withRefs(replaceBlock(view, section.id, next), added))}
                      onCancel={cancel}
                      onRemove={() => commit(replaceBlock(view, section.id, null))}
                      check={(next, added) => check(withRefs(replaceBlock(view, section.id, next), added))}
                    />
                  ) : (
                    <SectionBody block={section} showCite={!collapsed} />
                  )}

                  {(section.subsections || []).map((sub) => {
                    const editingSub =
                      editing && editing.kind === 'section' && editing.id === sub.id;
                    // A subsection collapses on its own refs when the parent has not already
                    // collapsed on behalf of the whole section. Without this a subsection that
                    // carries `refs` renders no citation at all: the parent's SOURCE line is
                    // absent and the blocks inside it were never given markers of their own.
                    const subCite = collapsed ? null : sectionCite(sub);
                    return (
                      <section className="discuss-subsection" id={sub.id} key={sub.id}>
                        <h3>
                          {sub.title}
                          {!editingSub && (
                            <Edit
                              onClick={() => open({ kind: 'section', id: sub.id })}
                              what={sub.title}
                              disabled={busy}
                            />
                          )}
                        </h3>
                        {editingSub ? (
                          <SectionEditor
                            section={sub}
                            item={view}
                            isSub
                            onSave={(next, added) => commit(withRefs(replaceBlock(view, sub.id, next), added))}
                            onCancel={cancel}
                            onRemove={() => commit(replaceBlock(view, sub.id, null))}
                            check={(next, added) => check(withRefs(replaceBlock(view, sub.id, next), added))}
                          />
                        ) : (
                          <>
                            <SectionBody block={sub} showCite={!collapsed && !subCite} />
                            {subCite && (
                              <p className="discuss-section-cite">
                                Source
                                <Cite refs={subCite} />
                              </p>
                            )}
                          </>
                        )}
                      </section>
                    );
                  })}

                  {collapsed && !editingThis && (
                    <p className="discuss-section-cite">
                      Source
                      <Cite refs={collapsed} />
                    </p>
                  )}
                </section>
              );
            })}

            {seeAlso.length > 0 && (
              <section className="discuss-section" id="see-also">
                <h2>
                  See also
                  <Edit onClick={() => open({ kind: 'page' })} what="See also" disabled={busy} />
                </h2>
                <ul className="discuss-seealso">
                  {seeAlso.map((t) => (
                    <li key={entryKey(t)}>
                      <EntryLink target={t} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {view.references && view.references.length > 0 && (
              <section className="discuss-section discuss-refs" id="references">
                <h2>
                  References
                  <Edit onClick={() => open({ kind: 'page' })} what="the references" disabled={busy} />
                </h2>
                <ol className="discuss-ref-list">
                  {view.references.map((ref) => (
                    <li id={`ref-${ref.n}`} key={ref.n} value={ref.n}>
                      <span className="discuss-ref-work">{ref.work}</span>
                      {ref.loc ? `, ${ref.loc}` : ''}
                      {ref.pages ? `, ${ref.pages}` : ''}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* A page with no infobox, no See also or no references has no heading to hang
                an edit link on. This is the one place they can be added. */}
            {!readOnly && (
              <p className="discuss-page-edit">
                <Edit
                  onClick={() => open({ kind: 'page' })}
                  what="the page"
                  label="edit this page"
                  disabled={busy}
                />
                <HeadLink to={historyTo} label="history" />
              </p>
            )}
          </>
        )}
      </article>
    </div>
  );
}

export default ItemPage;
