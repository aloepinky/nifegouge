import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import TW4Told from '../TW4Told';
import { isSchool } from '../programs';
import { useBriefIndex, useBrief } from './briefApi';
import BriefView, { opens } from './BriefView';
import { HeadForm, PublishBar, keyOf } from './BriefEditor';
import BriefHistory from './BriefHistory';
import { BriefsBaseProvider, BRIEFS_BASE, useBriefsBase } from './paths';

// pdf.js is 110 KB gzipped; only someone uploading a guide should download it.
const BriefUpload = lazy(() => import('./BriefUpload'));

// /tw4/briefs: the mission briefing guides and the TOLD card.
//
// The briefs are community-edited documents on the discuss server, generated from an uploaded
// briefing guide PDF (see parseBriefGuide.js) and published like a jet log: every edit is a
// revision and the history is the undo. The page reads them from the mirror.
//
// The controls come in two weights on purpose. Choosing a brief or the TOLD card is what
// everyone does, so those are the big buttons; first letter mode, expand/collapse all, edit,
// history and upload are for the few, and sit underneath as small links.
//
// Edit puts the page into edit mode rather than swapping it for a form: the brief stays on
// screen, every heading and item grows an edit link, and the working copy is published in one
// revision from the bar at the top.

const TOLD_TITLE = 'T-6B TAKEOFF AND LANDING DATA (TOLD) CARD';
const FIRST_LETTER_KEY = 'briefFirstLetters';

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key, on) {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // Private mode: the toggle still works for this visit.
  }
}

const QUICK_LINKS = [
  ['https://fwb.metoc.navy.mil/', 'FWB (CAC)'],
  ['https://aviationweather.gov', 'Aviation Weather'],
  ['https://notams.aim.faa.gov/notamSearch/nsapp.html#/', 'NOTAMs (FAA)'],
  ['https://www.daip.jcs.mil/daip/mobile/index', 'NOTAMs (DAIP)'],
  ['https://tfr.faa.gov/tfr3/?page=map', 'TFRs'],
  ['https://www.usahas.com/', 'BASH'],
  ['https://tsharp.navsea.cloud.navy.mil/', 'TSHARP'],
];

function QuickLinks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="brief-quicklinks">
      <button type="button" className="brief-section-title brief-quicklinks-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="brief-caret" aria-hidden="true">{open ? '▼' : '▶'}</span> QUICK LINKS
      </button>
      {open && (
        <ul className="brief-quicklinks-list">
          {QUICK_LINKS.map(([href, label]) => (
            <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{label}</a></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The big buttons: one per brief, then TOLD.
function Chooser({ briefs, active }) {
  const base = useBriefsBase();
  return (
    <nav className="brief-chooser" aria-label="Briefs">
      {briefs.map((b) => (
        <Link
          key={b.id}
          to={`${base}/${b.id}`}
          className={`brief-choice${active === b.id ? ' is-active' : ''}`}
          aria-current={active === b.id ? 'page' : undefined}
          title={b.title}
        >
          {b.short || b.title}
        </Link>
      ))}
      <Link
        to={`${base}/told`}
        className={`brief-choice brief-choice--told${active === 'told' ? ' is-active' : ''}`}
        aria-current={active === 'told' ? 'page' : undefined}
      >
        TOLD
      </Link>
    </nav>
  );
}

function Frame({ index, active, title, children }) {
  return (
    <div className="page-container brief-page">
      <h1 className="brief-title">{title}</h1>
      <Chooser briefs={index.briefs} active={active} />
      {index.status === 'error' && index.briefs.length === 0 && (
        <p className="discuss-editor-warn">The briefs could not be loaded. {index.error && index.error.message}</p>
      )}
      {children}
    </div>
  );
}

// The small row under the buttons. Every entry is a text link; first letters is the one
// toggle, and shows whether it is on.
function Tools({ id, firstLetter, onFirstLetter, onExpand, onCollapse, onEdit }) {
  const base = useBriefsBase();
  return (
    <div className="brief-tools">
      <button
        type="button"
        className={`brief-toggle${firstLetter ? ' is-on' : ''}`}
        aria-pressed={firstLetter}
        onClick={() => onFirstLetter(!firstLetter)}
        title="Show only the first letter of each word you say"
      >
        First letter mode {firstLetter ? 'on' : 'off'}
      </button>
      <span className="brief-tools-links">
        <button type="button" className="brief-link" onClick={onExpand}>expand all</button>
        <span aria-hidden="true">·</span>
        <button type="button" className="brief-link" onClick={onCollapse}>collapse all</button>
        <span aria-hidden="true">·</span>
        <button type="button" className="brief-link" onClick={onEdit}>edit</button>
        <span aria-hidden="true">·</span>
        <Link className="brief-link" to={`${base}/${id}/history`}>history</Link>
        <span aria-hidden="true">·</span>
        <Link className="brief-link" to={`${base}/upload`}>upload brief</Link>
      </span>
    </div>
  );
}

function BriefScreen({ id, index, firstLetter, setFirstLetter }) {
  const base = useBriefsBase();
  const { status, record, error } = useBrief(id);
  const [expanded, setExpanded] = useState({});
  // The working copy while editing: null when not editing, the whole brief when editing.
  const [draft, setDraft] = useState(null);
  const [openKey, setOpenKey] = useState(null);
  const entry = index.briefs.find((b) => b.id === id);
  const shown = draft || (record && record.brief);
  const title = (shown && shown.title) || (entry && entry.title) || '';

  const expandAll = () => {
    const all = {};
    shown.sections.forEach((s) => (s.items || []).forEach((it) => { if (opens(it)) all[it.id] = true; }));
    setExpanded(all);
  };

  const edit = draft ? {
    doc: draft,
    openKey,
    open: setOpenKey,
    close: () => setOpenKey(null),
    update: (fn) => setDraft((d) => fn(d)),
  } : null;

  const stopEditing = () => {
    setDraft(null);
    setOpenKey(null);
  };

  return (
    <Frame index={index} active={id} title={title}>
      {status === 'loading' && <p className="brief-status">Loading the brief…</p>}
      {status === 'error' && <p className="discuss-editor-warn">{error.message}</p>}
      {status === 'missing' && (
        <p className="brief-status">
          There is no brief at this address. <Link to={base}>See the briefs</Link>.
        </p>
      )}
      {record && (
        <>
          {draft ? (
            <PublishBar
              record={record}
              doc={draft}
              dirty={JSON.stringify(draft) !== JSON.stringify(record.brief)}
              onPublished={() => {
                stopEditing();
                index.reload();
              }}
              onCancel={stopEditing}
              onEditHead={() => setOpenKey(keyOf('head', id))}
            />
          ) : (
            <Tools
              id={id}
              firstLetter={firstLetter}
              onFirstLetter={setFirstLetter}
              onExpand={expandAll}
              onCollapse={() => setExpanded({})}
              onEdit={() => setDraft(record.brief)}
            />
          )}
          {draft && openKey === keyOf('head', id) && (
            <HeadForm
              doc={draft}
              onSave={(next) => { setDraft(next); setOpenKey(null); }}
              onCancel={() => setOpenKey(null)}
            />
          )}
          <QuickLinks />
          <BriefView
            brief={shown}
            expanded={expanded}
            onToggle={(itemId) => setExpanded((e) => ({ ...e, [itemId]: !e[itemId] }))}
            firstLetter={firstLetter}
            edit={edit}
          />
        </>
      )}
    </Frame>
  );
}

function BriefRoute(props) {
  const { brief } = useParams();
  return <BriefScreen key={brief} id={brief} {...props} />;
}

function HistoryRoute({ index }) {
  const { brief } = useParams();
  const entry = index.briefs.find((b) => b.id === brief);
  return (
    <Frame index={index} active={brief} title={`History: ${entry ? entry.short || entry.title : brief}`}>
      {/* The name on the page is the name on its button, which is what a reader calls it. */}
      <BriefHistory id={brief} title={entry && (entry.short || entry.title)} />
    </Frame>
  );
}

// /tw4/briefs itself: the first brief, at the address the site has always linked.
function DefaultRoute({ index, ...rest }) {
  const base = useBriefsBase();
  if (index.status === 'loading' && !index.briefs.length) {
    return <Frame index={index} title="Briefs"><p className="brief-status">Loading the briefs…</p></Frame>;
  }
  if (!index.briefs.length) {
    return (
      <Frame index={index} title="Briefs">
        <p className="brief-status">
          No briefs are published yet. <Link to={`${base}/upload`}>Upload a briefing guide</Link> to make them.
        </p>
      </Frame>
    );
  }
  return <BriefScreen key={index.briefs[0].id} id={index.briefs[0].id} index={index} {...rest} />;
}

// `base`, `school` and `told` are how another school mounts this page: NIFE's briefs are at
// /nife/briefs with the C172 TOLD card, and everything else is the same page.
//
// A brief names the school it is for, and each tab shows only its own. The corpus is one list
// on the server — the guides are uploaded to whichever tab the person is on — so this is what
// keeps a T-6B brief off the NIFE page.
function BriefsPage({
  base = BRIEFS_BASE, school = 'Primary', told = <TW4Told />, toldTitle = TOLD_TITLE,
}) {
  const all = useBriefIndex();
  const index = useMemo(
    () => ({ ...all, briefs: all.briefs.filter((b) => isSchool(b, school)) }),
    [all, school],
  );
  const [firstLetter, setFirstLetterState] = useState(() => readFlag(FIRST_LETTER_KEY));
  const setFirstLetter = (on) => {
    setFirstLetterState(on);
    writeFlag(FIRST_LETTER_KEY, on);
  };
  const shared = { index, firstLetter, setFirstLetter };

  return (
    <BriefsBaseProvider value={base}>
    <Routes>
      <Route path="told" element={<Frame index={index} active="told" title={toldTitle}>{told}</Frame>} />
      <Route
        path="upload"
        element={(
          <Frame index={index} title="Upload a briefing guide">
            <Suspense fallback={<p className="brief-status">Loading…</p>}>
              <BriefUpload index={index.briefs} school={school} onPublished={index.reload} />
            </Suspense>
          </Frame>
        )}
      />
      <Route path=":brief/history" element={<HistoryRoute index={index} />} />
      <Route path=":brief" element={<BriefRoute {...shared} />} />
      <Route index element={<DefaultRoute {...shared} />} />
    </Routes>
    </BriefsBaseProvider>
  );
}

export default BriefsPage;
