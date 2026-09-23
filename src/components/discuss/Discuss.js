import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import useMenuDismiss from '../useMenuDismiss';
import ItemPage from './ItemPage';
import EventHub from './EventHub';
import BlockPage from './BlockPage';
import CourseFlow from './CourseFlow';
import StageNav from './StageNav';
import SearchBox from './SearchBox';
import HistoryPage from './HistoryPage';
import CreatePanel from './edit/CreatePanel';
import {
  DELTA_ID, STYLE_GUIDE_DRAFT, SyllabusContext, fromDoc, useSyllabus,
} from './SyllabusContext';
import { DISCUSS_BASE, DiscussBaseProvider, useDiscussBase } from './paths';
import { useRemoteSyllabus, useSyllabusList, useItem } from './discussApi';
import { DiscussDataProvider, useDiscussData, useBuiltInSyllabus } from './DiscussData';
import { programLabel, DEFAULT_PROGRAM } from './program';
import { isSchool } from '../programs';
import { SelectedSyllabusContext, recalledSyllabus, rememberSyllabus } from './RandomPage';

// The upload page and the flow editor carry the PDF parser and pdf.js, so they load only when
// someone opens them.
const UploadPage = lazy(() => import('./upload/UploadPage'));
const EditFlowPage = lazy(() => import('./upload/EditFlowPage'));
// Lazy for a second reason: while the guide is a draft it has no route on the deployed site,
// and this keeps it out of the bundle every reader downloads.
const StyleGuide = lazy(() => import('./StyleGuide'));

// A syllabus's name, then its school in quieter type: "Delta Syllabus Primary".
function SyllabusName({ name, school }) {
  return (
    <>
      <span>{name}</span>
      {school && <span className="discuss-syllabus-school">{school}</span>}
    </>
  );
}

// Delta is always offered; published syllabi join it from the mirror's list.
function SyllabusPicker() {
  const s = useSyllabus();
  const delta = useBuiltInSyllabus();
  const navigate = useNavigate();
  const base = useDiscussBase();
  const { school, syllabusId } = useDiscussData();
  // This tab's own syllabi only: a document for another school briefs pages this tab cannot
  // reach, and offering it would strand the reader.
  const published = useSyllabusList().filter((o) => o.id !== syllabusId && isSchool(o, school));
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const trigger = useRef(null);
  useMenuDismiss(open, setOpen, wrap, trigger);

  const options = [{ id: delta.id, name: delta.name, school: delta.school }, ...published];
  if (!options.some((o) => o.id === s.id)) options.push({ id: s.id, name: s.name, school: s.school });
  const current = options.find((o) => o.id === s.id);

  const choose = (id) => {
    setOpen(false);
    // Remembered before navigating: the bare All Events route opens the remembered syllabus.
    rememberSyllabus(id, school);
    navigate(id === syllabusId ? base : `${base}/s/${id}`);
  };

  return (
    <div className="discuss-syllabus">
      <div className="discuss-syllabus-menu" ref={wrap}>
        <button
          type="button"
          ref={trigger}
          className="discuss-syllabus-select"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Syllabus: ${current.name}${current.school ? ` ${current.school}` : ''}`}
          onClick={() => setOpen((v) => !v)}
        >
          <SyllabusName name={current.name} school={current.school} />
          <span className="discuss-syllabus-caret" aria-hidden="true">▾</span>
        </button>
        {open && (
          <ul className="discuss-syllabus-panel" role="listbox" aria-label="Syllabus">
            {options.map((o) => (
              <li key={o.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === s.id}
                  className="discuss-syllabus-option"
                  onClick={() => choose(o.id)}
                >
                  <SyllabusName name={o.name} school={o.school} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link to={`${base}/upload`} className="discuss-syllabus-submit">
        Submit a new JPPT
      </Link>
    </div>
  );
}

// All Events: the JPPT's own course-flow chart, then the syllabus as stage, block and event.
// There is no flat index of items — an item is reached through the event that briefs it, or
// through the search box, both of which carry the context an alphabetical list throws away.
function Index() {
  const s = useSyllabus();
  const base = useDiscussBase();
  // A syllabus small enough not to need the JPPT's course-flow chart carries no `flow`, and
  // CourseFlow renders nothing for it. The sentence about correcting the chart would then be
  // pointing at something that is not on the page.
  const hasChart = !!(s.flow && s.flow.NODES && s.flow.NODES.length);
  return (
    <div className="discuss-layout discuss-layout--plain discuss-layout--wide">
      <article className="discuss-page">
        <header className="discuss-head">
          <h1>Discussion Items</h1>
          <SyllabusPicker />
        </header>

        <p className="discuss-syllabus-note">
          {programLabel(s) ? `${programLabel(s)}${s.sourceDate ? `, ${s.sourceDate}` : ''}. ` : ''}
          {s.builtIn ? '' : 'Generated from an uploaded JPPT. '}
          {hasChart && (
            <>
              If the chart does not match the publication,{' '}
              <Link to={`${s.base}/edit`}>edit the flow</Link>.
            </>
          )}
          {s.rev ? ` Revision ${s.rev}.` : ''}
        </p>

        <CourseFlow />

        <section className="discuss-section">
          <h2>Stages</h2>
          <StageNav />
        </section>

        {/* The one place someone who has not opened a page yet is told the pages are theirs to
            fix, and where the guide to writing one lives. */}
        {STYLE_GUIDE_DRAFT && (
          <p className="discuss-foot">
            Anyone can edit these pages, and every revision is kept. The{' '}
            <Link to={`${base}/style`}>style guide</Link> says how a page is written and
            how its sources are cited.
          </p>
        )}
      </article>
    </div>
  );
}

function NotFound({ what, children }) {
  const s = useSyllabus();
  const base = useDiscussBase();
  return (
    <div className="discuss-layout discuss-layout--plain">
      <article className="discuss-page">
        <header className="discuss-head">
          <h1>No such {what}</h1>
          <p className="discuss-lede">
            {children || <Link to={s ? s.base : base}>Back to all discussion items</Link>}
          </p>
        </header>
      </article>
    </div>
  );
}

function Loading({ children = 'Loading…' }) {
  return (
    <div className="discuss-layout discuss-layout--plain">
      <article className="discuss-page">
        <p className="discuss-empty">{children}</p>
      </article>
    </div>
  );
}

function LoadFailed({ error, retry }) {
  return (
    <div className="discuss-layout discuss-layout--plain">
      <article className="discuss-page">
        <header className="discuss-head">
          <h1>Could not load the discussion items</h1>
          <p className="discuss-lede">{error.message}</p>
        </header>
        <div className="discuss-editor-buttons">
          <button type="button" className="discuss-editor-save" onClick={retry}>Try again</button>
        </div>
      </article>
    </div>
  );
}

// An item page, by slug. Missing pages offer to be created: the slug is already typed.
function ItemRoute({ slug }) {
  const it = useItem(slug);
  const delta = useBuiltInSyllabus();
  const base = useDiscussBase();
  if (it.status === 'loading' || it.status === 'none') return <Loading />;
  if (it.status === 'error') {
    return (
      <NotFound what="discussion item">
        {it.error.message}{' '}
        <button type="button" className="discuss-editor-secondary" onClick={it.reload}>Try again</button>
      </NotFound>
    );
  }
  if (it.status === 'missing') {
    return (
      <div className="discuss-layout discuss-layout--plain">
        <article className="discuss-page">
          <header className="discuss-head">
            <h1>No such discussion item</h1>
            <p className="discuss-lede">
              Nothing is published at <code>{base}/{slug}</code>. If the JPPT names it, it can be
              created here; otherwise <Link to={base}>back to all discussion items</Link>.
            </p>
          </header>
          <CreatePanel slug={slug.toLowerCase()} title="" program={delta} />
        </article>
      </div>
    );
  }
  return <ItemPage key={slug} record={it.record} />;
}

// Route shell. `event` distinguishes /tw4/discuss/e/:id from /tw4/discuss/:item — an item
// keeps one canonical URL, and event context rides along as ?from= rather than as a path
// segment, so there is only ever one URL to link, cite or edit.
//
// A generated syllabus lives under /tw4/discuss/s/:syllabus, with the same /b/ and /e/ pages
// beneath it. Item pages are never under it: every syllabus links the one canonical page.
function DiscussBody({ mode }) {
  const { event: eventId, item: slug, block: blockId, syllabus: routeSyllabusId } = useParams();
  const { builtIn: delta, matcher, school, syllabusId: builtInId, syllabusName } = useDiscussData();
  const root = useDiscussBase();
  const remote = useRemoteSyllabus(routeSyllabusId);
  const syllabus = useMemo(
    () => (routeSyllabusId
      ? (remote.status === 'ready' ? fromDoc(remote.record, { matcher, root }) : null)
      : delta),
    [routeSyllabusId, remote.status, remote.record, matcher, delta, root],
  );

  // A syllabus's own pages (All Events, a block, an event, its flow editor) record it as the
  // reader's choice; an item or history page, which belongs to no one syllabus, reads it back.
  const onItemPage = mode === 'item' || mode === 'history';
  // The bare All Events route opens the syllabus this reader last used, so a student on Echo
  // is not dropped back on Delta every time they open the tab. Choosing Delta in the picker
  // remembers Delta, which is what lets this route show it.
  const home = !mode && !routeSyllabusId ? recalledSyllabus(school) : null;
  const redirectTo = home && home !== builtInId ? `${root}/s/${home}` : null;
  useEffect(() => {
    if (!redirectTo && !onItemPage && mode !== 'upload' && syllabus) rememberSyllabus(syllabus.id, school);
  }, [redirectTo, onItemPage, mode, syllabus, school]);
  // A remembered syllabus that has since been taken down is forgotten, or the redirect above
  // would keep landing on its "no such syllabus" page.
  useEffect(() => {
    if (routeSyllabusId && remote.status === 'missing' && recalledSyllabus(school) === routeSyllabusId) rememberSyllabus(builtInId, school);
  }, [routeSyllabusId, remote.status, school, builtInId]);
  const recalled = onItemPage ? recalledSyllabus(school) : null;
  const recalledRemote = useRemoteSyllabus(recalled && recalled !== builtInId ? recalled : undefined);
  const selected = useMemo(() => {
    if (!onItemPage) return syllabus || delta;
    return recalledRemote.status === 'ready' ? fromDoc(recalledRemote.record, { matcher, root }) : delta;
  }, [onItemPage, syllabus, delta, recalledRemote.status, recalledRemote.record, matcher, root]);

  if (redirectTo) return <Navigate replace to={redirectTo} />;

  let body;
  if (routeSyllabusId && !syllabus) {
    body = remote.status === 'loading'
      ? <Loading />
      : (
        <NotFound what="syllabus">
          {remote.status === 'error' ? `${remote.error.message} ` : ''}
          <Link to={root} onClick={() => rememberSyllabus(builtInId, school)}>Back to {syllabusName}</Link>
        </NotFound>
      );
  } else if (mode === 'style') {
    body = <StyleGuide />;
  } else if (mode === 'upload') {
    body = <UploadPage />;
  } else if (mode === 'edit') {
    body = <EditFlowPage key={syllabus.id} record={syllabus.record} />;
  } else if (mode === 'event') {
    const event = syllabus.getEvent(eventId);
    body = event ? <EventHub key={eventId} event={event} /> : <NotFound what="event" />;
  } else if (mode === 'block') {
    const block = syllabus.getBlock(blockId);
    body = block ? <BlockPage key={blockId} block={block} /> : <NotFound what="block" />;
  } else if (mode === 'item') {
    body = <ItemRoute key={slug} slug={slug} />;
  } else if (mode === 'history') {
    body = <HistoryPage key={slug} slug={slug.toLowerCase()} />;
  } else {
    body = <Index />;
  }

  return (
    <SyllabusContext.Provider value={syllabus || delta}>
      <SelectedSyllabusContext.Provider value={selected}>
      <div className="discuss-wrap">
        {/* Not --scrollable: the results list is absolutely positioned and an overflow
            container would clip it. */}
        <div className="sub-navbar discuss-subnav">
          <Link to={(syllabus || delta).base} className={mode ? '' : 'active'}>All Events</Link>
          <SearchBox />
        </div>
        <Suspense fallback={<Loading />}>{body}</Suspense>
      </div>
      </SelectedSyllabusContext.Provider>
    </SyllabusContext.Provider>
  );
}

function Shell({ children }) {
  const base = useDiscussBase();
  return (
    <div className="discuss-wrap">
      <div className="sub-navbar discuss-subnav">
        <Link to={base}>All Events</Link>
      </div>
      {children}
    </div>
  );
}

// The routes, relative to wherever the tab is mounted. `mode` is what tells one from another
// inside DiscussBody — an item keeps one canonical URL, and event context rides as ?from=
// rather than as a path segment, so there is only ever one URL to link, cite or edit.
//
// A generated syllabus lives under `s/:syllabus`, with the same `b/` and `e/` pages beneath
// it. Item pages are never under it: every syllabus links the one canonical page.
//
// The `e`, `b`, `s`, `upload` and `edit` prefixes are what keep the bare `:item` catch-all
// from swallowing them, so it stays last and new routes are declared above it.
function DiscussRoutes() {
  return (
    <Routes>
      <Route path="e/:event" element={<DiscussBody mode="event" />} />
      <Route path="b/:block" element={<DiscussBody mode="block" />} />
      <Route path="upload" element={<DiscussBody mode="upload" />} />
      {/* A draft, on a dev server only. `Routes` ignores a non-element child, which is how a
          route is conditioned. */}
      {STYLE_GUIDE_DRAFT && <Route path="style" element={<DiscussBody mode="style" />} />}
      <Route path="edit" element={<DiscussBody mode="edit" />} />
      <Route path="s/:syllabus" element={<DiscussBody />} />
      <Route path="s/:syllabus/e/:event" element={<DiscussBody mode="event" />} />
      <Route path="s/:syllabus/b/:block" element={<DiscussBody mode="block" />} />
      <Route path="s/:syllabus/edit" element={<DiscussBody mode="edit" />} />
      <Route path=":item/history" element={<DiscussBody mode="history" />} />
      <Route path=":item" element={<DiscussBody mode="item" />} />
      <Route index element={<DiscussBody />} />
    </Routes>
  );
}

// The tab. Primary's is the default, so its mount passes nothing; NIFE's names its address,
// its school and its own syllabus. See paths.js and DiscussData.js.
function Discuss({
  base = DISCUSS_BASE,
  school = DEFAULT_PROGRAM.school,
  syllabusId = DELTA_ID,
  syllabusName = 'Delta Syllabus',
}) {
  return (
    <DiscussBaseProvider value={base}>
      <DiscussDataProvider
        school={school}
        syllabusId={syllabusId}
        syllabusName={syllabusName}
        renderLoading={() => <Shell><Loading /></Shell>}
        renderError={(error, retry) => <Shell><LoadFailed error={error} retry={retry} /></Shell>}
      >
        <DiscussRoutes />
      </DiscussDataProvider>
    </DiscussBaseProvider>
  );
}

export default Discuss;
