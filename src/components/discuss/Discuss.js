import React, { Suspense, lazy, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ItemPage from './ItemPage';
import EventHub from './EventHub';
import BlockPage from './BlockPage';
import CourseFlow from './CourseFlow';
import StageNav from './StageNav';
import SearchBox from './SearchBox';
import HistoryPage from './HistoryPage';
import CreatePanel from './edit/CreatePanel';
import { DISCUSS_BASE, DELTA_ID, SyllabusContext, fromDoc, useSyllabus } from './SyllabusContext';
import { useRemoteSyllabus, useSyllabusList, useItem } from './discussApi';
import { DiscussDataProvider, useDiscussData, useDelta } from './DiscussData';

// The upload page and the flow editor carry the PDF parser and pdf.js, so they load only when
// someone opens them.
const UploadPage = lazy(() => import('./upload/UploadPage'));
const EditFlowPage = lazy(() => import('./upload/EditFlowPage'));

// Delta Primary is always offered; published syllabi join it from the mirror's list.
function SyllabusPicker() {
  const s = useSyllabus();
  const delta = useDelta();
  const navigate = useNavigate();
  const published = useSyllabusList().filter((o) => o.id !== DELTA_ID);

  const options = [{ id: delta.id, name: delta.name }, ...published];
  if (!options.some((o) => o.id === s.id)) options.push({ id: s.id, name: s.name });

  return (
    <div className="discuss-syllabus">
      <select
        className="discuss-syllabus-select"
        aria-label="Syllabus"
        value={s.id}
        onChange={(e) => {
          const id = e.target.value;
          navigate(id === DELTA_ID ? DISCUSS_BASE : `${DISCUSS_BASE}/s/${id}`);
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <Link to={`${DISCUSS_BASE}/upload`} className="discuss-syllabus-submit">
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
  return (
    <div className="discuss-layout discuss-layout--plain discuss-layout--wide">
      <article className="discuss-page">
        <header className="discuss-head">
          <h1>Discussion Items</h1>
          <SyllabusPicker />
        </header>

        <p className="discuss-syllabus-note">
          {s.builtIn ? '' : 'Generated from an uploaded JPPT. '}
          If the chart does not match the publication,{' '}
          <Link to={`${s.base}/edit`}>edit the flow</Link>.
          {s.rev ? ` Revision ${s.rev}.` : ''}
        </p>

        <CourseFlow />

        <section className="discuss-section">
          <h2>Stages</h2>
          <StageNav />
        </section>
      </article>
    </div>
  );
}

function NotFound({ what, children }) {
  const s = useSyllabus();
  return (
    <div className="discuss-layout discuss-layout--plain">
      <article className="discuss-page">
        <header className="discuss-head">
          <h1>No such {what}</h1>
          <p className="discuss-lede">
            {children || <Link to={s ? s.base : DISCUSS_BASE}>Back to all discussion items</Link>}
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
              Nothing is published at <code>/tw4/discuss/{slug}</code>. If the JPPT names it, it can be
              created here; otherwise <Link to={DISCUSS_BASE}>back to all discussion items</Link>.
            </p>
          </header>
          <CreatePanel slug={slug.toLowerCase()} title="" />
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
  const { event: eventId, item: slug, block: blockId, syllabus: syllabusId } = useParams();
  const { delta, matcher } = useDiscussData();
  const remote = useRemoteSyllabus(syllabusId);
  const syllabus = useMemo(
    () => (syllabusId ? (remote.status === 'ready' ? fromDoc(remote.record, { matcher }) : null) : delta),
    [syllabusId, remote.status, remote.record, matcher, delta],
  );

  let body;
  if (syllabusId && !syllabus) {
    body = remote.status === 'loading'
      ? <Loading />
      : (
        <NotFound what="syllabus">
          {remote.status === 'error' ? `${remote.error.message} ` : ''}
          <Link to={DISCUSS_BASE}>Back to Delta Primary</Link>
        </NotFound>
      );
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
      <div className="discuss-wrap">
        {/* Not --scrollable: the results list is absolutely positioned and an overflow
            container would clip it. */}
        <div className="sub-navbar discuss-subnav">
          <Link to={(syllabus || delta).base} className={mode ? '' : 'active'}>All Events</Link>
          <SearchBox />
        </div>
        <Suspense fallback={<Loading />}>{body}</Suspense>
      </div>
    </SyllabusContext.Provider>
  );
}

function Shell({ children }) {
  return (
    <div className="discuss-wrap">
      <div className="sub-navbar discuss-subnav">
        <Link to={DISCUSS_BASE}>All Events</Link>
      </div>
      {children}
    </div>
  );
}

function Discuss({ mode }) {
  return (
    <DiscussDataProvider
      renderLoading={() => <Shell><Loading /></Shell>}
      renderError={(error, retry) => <Shell><LoadFailed error={error} retry={retry} /></Shell>}
    >
      <DiscussBody mode={mode} />
    </DiscussDataProvider>
  );
}

export default Discuss;
