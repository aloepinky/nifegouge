import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { generatedFor } from './GENERATED';
import { getItemMeta } from './registry';
import { rowName, useSyllabus } from './SyllabusContext';
import { useDiscussBase } from './paths';
import RandomPage, { SelectedSyllabusContext } from './RandomPage';
import { rememberItem, refreshItem } from './discussApi';
import ItemLink from './ItemLink';
import { psmPage, psmLinksOf } from './psmPages';
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
import { NWC_LABELS } from './nwc';
import { citedDate } from './works';

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

// Where the page's subject is carried by another tab of this site — the interactive diagram
// of the system it is about, the memory limits, the course rules — close the lead with a link
// to it. The page itself then carries only what that tab does not.
//
// `psmLinks` is a list of paths; `psmLinksOf` reads the older `diagram` and `limits` fields
// for a page that has not been saved since the list replaced them.
//
// This is lead content, not a section: it never appears in the contents rail.
function PsmLinks({ item }) {
  const targets = psmLinksOf(item).map(psmPage).filter(Boolean);
  if (!targets.length) return null;
  return (
    <p className="discuss-diagram-link">
      Also on the site:{' '}
      {targets.map((t, i) => (
        <React.Fragment key={t.path}>
          {i > 0 && ', '}
          <Link to={t.path}>{t.label}</Link>
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
// The images a figure holds: several under `images`, or the one on the figure itself.
const figureImages = (f) => (
  Array.isArray(f.images) && f.images.length ? f.images : [{ src: f.src, alt: f.alt }]
);

// A figure holding several images shows one at a time in the figure's frame, with an arrow
// on each side to move through them and each image's own caption floated over its foot: a
// chart too long for one image, cut into pages, or a set of near-identical ones that belong
// in one place rather than stacked down the column. The figure's caption stays beneath the
// frame. The same idiom as the systems pages' photo carousel and Wikipedia's slideshow: the
// arrows are the control, not a row of buttons.
function Gallery({ images }) {
  const [at, setAt] = useState(0);
  const n = images.length;
  const shown = images[Math.min(at, n - 1)];
  const step = (d) => setAt((i) => (i + d + n) % n);
  return (
    <div
      className="discuss-gallery"
      role="group"
      aria-roledescription="carousel"
      aria-label="Images in this figure"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      }}
    >
      <img src={shown.src} alt={shown.alt} />
      <button
        type="button"
        className="discuss-gallery-arrow discuss-gallery-arrow--prev"
        onClick={() => step(-1)}
        aria-label="Previous image"
      >
        ‹
      </button>
      <button
        type="button"
        className="discuss-gallery-arrow discuss-gallery-arrow--next"
        onClick={() => step(1)}
        aria-label="Next image"
      >
        ›
      </button>
      <div className="discuss-gallery-foot" aria-live="polite">
        <span className="discuss-gallery-label">{shown.label || ''}</span>
        <span className="discuss-gallery-count">{at + 1} / {n}</span>
      </div>
    </div>
  );
}

// One figure. A single image is sized by its own shape (see `.discuss-figure` in style.css),
// which CSS cannot read off an <img>, so its natural width and aspect ratio are handed to the
// stylesheet as custom properties once it loads. Until then the figure takes the 75% cap.
// Whether a block inside a collapsed section still shows a marker of its own. The collapse says
// every part of this section traces to one reference, and a figure or table lifted from another
// section of the publication makes that untrue — the AIM's airspace diagram is printed in §3-2-1
// and sits on a page whose prose is §3-2-4's. A block carrying no refs of its own is covered by
// the SOURCE line, as it always was, so the nine figures that rely on that are unaffected.
const ownCite = (block, showCite, collapsed) => showCite
  || ((block.refs || []).length > 0 && (block.refs || []).join(',') !== (collapsed || []).join(','));

function Figure({ f, showCite, collapsed }) {
  const [size, setSize] = useState(null);
  const images = figureImages(f);
  const gallery = images.length > 1;
  const style = size ? { '--fig-w': `${size.w}px`, '--fig-ar': size.ar } : undefined;
  return (
    <figure className={`discuss-figure${gallery ? ' discuss-figure--gallery' : ''}`} style={style}>
      {gallery
        ? <Gallery images={images} />
        : (
          <img
            src={images[0].src}
            alt={images[0].alt}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
              if (w && h) setSize({ w, ar: w / h });
            }}
          />
        )}
      {f.caption && (
        <figcaption>
          {f.caption}
          {ownCite(f, showCite, collapsed) && <Cite refs={f.refs} />}
        </figcaption>
      )}
    </figure>
  );
}

function Figures({ figures, showCite, collapsed }) {
  if (!figures || !figures.length) return null;
  return figures.map((f) => (
    <Figure key={f.id} f={f} showCite={showCite} collapsed={collapsed} />
  ));
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
function Tables({ tables, showCite, collapsed }) {
  if (!tables || !tables.length) return null;
  return (
    <>
      {tables.map((t) => (
        <div className="discuss-table-wrap" key={t.id}>
          <table className={t.numeric ? 'discuss-table discuss-table--numeric' : 'discuss-table'} id={t.id}>
            {t.caption && (
              <caption>
                {t.caption}
                {ownCite(t, showCite, collapsed) && <Cite refs={t.refs} />}
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
function SectionBody({ block, showCite, collapsed }) {
  return (
    <>
      <Hatnote slugs={block.main} label="Main page" />
      <Hatnote slugs={block.further} label="Further information" />
      <Figures figures={block.figures} showCite={showCite} collapsed={collapsed} />
      <Tables tables={block.tables} showCite={showCite} collapsed={collapsed} />
      {(block.paras || []).map((para) => (
        <p className="discuss-para" key={para.id}>
          {inline(para.text)}
          {showCite && <Cite refs={para.refs} />}
        </p>
      ))}
      {block.items && block.items.length > 0 && (
        block.ep ? (
          <EpList items={block.items} showCite={showCite} />
        ) : block.numbered ? (
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

// An emergency procedure: numbered steps, with its notes, warnings and cautions drawn as they are
// on the EPs/Limits page. Every step carries an explicit `value` because an NWC at the top level
// is an <li> of the same list and must not take a number.
function EpList({ items, showCite }) {
  let step = 0;
  return (
    <ol className="discuss-list discuss-ep">
      {items.map((entry) => (
        entry.kind
          ? <Nwc key={entry.id} entry={entry} showCite={showCite} />
          : <Bullet key={entry.id} item={entry} showCite={showCite} value={++step} ep />
      ))}
    </ol>
  );
}

function Nwc({ entry, showCite }) {
  return (
    <li className={`discuss-nwc discuss-nwc--${entry.kind}`}>
      <strong className="discuss-nwc-label">{NWC_LABELS[entry.kind]}:</strong>{' '}
      {inline(entry.text)}
      {showCite && <Cite refs={entry.refs} />}
    </li>
  );
}

function Bullet({ item, showCite, value, ep }) {
  return (
    <li className="discuss-bullet" value={value}>
      {inline(item.text)}
      {showCite && <Cite refs={item.refs} />}
      {item.sub && item.sub.length > 0 && (
        <ul className="discuss-sublist">
          {item.sub.map((s) => (
            ep && s.kind
              ? <Nwc key={s.id} entry={s} showCite={showCite} />
              : <Bullet key={s.id} item={s} showCite={showCite} />
          ))}
        </ul>
      )}
    </li>
  );
}

// Prev/next name a neighbour the way the event's own list names it, since the strip is that
// list walked one row at a time. Hatnotes and See also still use the page's title, which is
// the page's own name rather than one event's name for it.
function itemName(row) {
  return rowName(row) || (getItemMeta(row.slug) || {}).title || '';
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
function GeneratedLists({ groups, syllabusName }) {
  const navigate = useNavigate();
  const base = useDiscussBase();
  if (!groups || !groups.length) return null;
  const many = groups.length > 1;
  // A random draw from the whole list the event gets, not only the part shown under
  // "All of the above and the following".
  const random = (g) => {
    const pick = g.entries[Math.floor(Math.random() * g.entries.length)];
    navigate(`${base}/${pick.item.slug}`);
  };
  return (
    <>
      {syllabusName && (
        <p className="discuss-note">Generated from {syllabusName}, the syllabus last opened.</p>
      )}
      {groups.map((g) => {
        const shown = g.added || g.entries;
        return (
          <section className="discuss-section" id={genId(g)} key={g.anchor.id}>
            <h2>
              {genTitle(g, many)}
              {g.entries.length > 0 && (
                <span className="discuss-edit-link">
                  <span className="discuss-edit-bracket">[</span>
                  <button type="button" onClick={() => random(g)}>random page</button>
                  <span className="discuss-edit-bracket">]</span>
                </span>
              )}
            </h2>
            {g.entries.length === 0 ? (
              <p className="discuss-para">
                No {genNoun(g)} pages are written for this scope yet.
              </p>
            ) : (
              <>
                {g.includesAbove && (
                  <p className="discuss-para">
                    {shown.length ? 'All of the above and the following:' : 'All of the above.'}
                  </p>
                )}
                {shown.length > 0 && (
                  <ul className="discuss-seealso">
                    {shown.map((e) => (
                      <li key={e.item.slug}>
                        <ItemLink slug={e.item.slug}>{e.item.title}</ItemLink>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        );
      })}
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
      <RandomPage current={item.slug} />
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
  const location = useLocation();
  const navigate = useNavigate();
  const s = useSyllabus();
  const base = useDiscussBase();
  // The generated lists are the one part of an item page that belongs to a syllabus rather
  // than to the page: "any previously discussed maneuver" has a different answer in every
  // syllabus that briefs it, and answering with Delta's events for a reader who came from
  // another one is simply the wrong list. So they are built against the syllabus the reader
  // last opened, which is the same choice Random page draws from. Everything else here
  // (?from=, Briefed on, prev/next) stays Delta.
  const gs = useContext(SelectedSyllabusContext) || s;
  const item = record.item;
  const rev = record.rev;
  const historyTo = `${base}/${item.slug}/history`;

  // The draft overlay. Discuss.js keys this component by slug, so navigating to another item
  // remounts and re-reads the store rather than carrying one page's edits onto the next.
  const [draft, setDraft] = useState(() => (readOnly ? null : getDraft(item.slug)));
  const [draftRecord, setDraftRecord] = useState(() => (readOnly ? null : getRecord(item.slug)));
  // Create page hands the writer straight into the form — the same one "write this page"
  // opens — because making a page and writing it are one job, and a stub screen in between is
  // a step nobody asked for. It arrives as navigation state rather than in the URL, since an
  // item has exactly one URL; the state is dropped once it has been read, so a reload of the
  // page does not open the form again.
  const [editing, setEditing] = useState(
    () => (!readOnly && location.state && location.state.write ? { kind: 'page' } : null)
  );
  const [publishing, setPublishing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [published, setPublished] = useState(false); // a publish just went through
  const [justSaved, setJustSaved] = useState(false);
  const bannerRef = useRef(null);

  // The form is open; the instruction to open it has been carried out and is cleared, so a
  // reload or a step back does not re-open it over whatever the writer did next.
  const openedFromCreate = location.state && location.state.write;
  useEffect(() => {
    if (openedFromCreate) navigate(`${location.pathname}${location.search}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedFromCreate]);

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
  const genGroups = view.stub ? null : generatedFor(view, params.get('from'), gs);
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
              <h2>No page written</h2>
              {view.sourcingLead && (
                <>
                  <p>Where an author could look:</p>
                  <p className="discuss-stub-lead">{view.sourcingLead}</p>
                </>
              )}
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
            <PsmLinks item={view} />
            {view.note && <p className="discuss-note">{view.note}</p>}
            <GeneratedLists
              groups={genGroups}
              syllabusName={gs.builtIn ? null : gs.name}
            />

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
                    <SectionBody block={section} showCite={!collapsed} collapsed={collapsed} />
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
                            <SectionBody block={sub} showCite={!collapsed && !subCite} collapsed={collapsed || subCite} />
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
                      {citedDate(ref) ? `, ${citedDate(ref)}` : ''}
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
