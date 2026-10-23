import React, { useState } from 'react';
import { Line, useEscape } from './edit/fields';
import { WORKS } from './works';
import {
  chapterOf, markOutdated, reportName, reportOutdatedPub, useOutdated,
} from './outdated';

// What a reader sees and does with outdated marks (outdated.js holds the store and the
// matching). The links are dressed as the page's `[edit]` links, quiet furniture beside a
// heading; the tint on the section and the line under its heading are what say it is marked.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// `[mark outdated]` beside a heading, or `[marked outdated]` once this browser has, which takes
// the mark back.
export function MarkLink({ mine, what, onOpen, onTakeBack, disabled }) {
  return (
    <span className={`discuss-edit-link discuss-mark-link${disabled ? ' is-disabled' : ''}`}>
      <span className="discuss-edit-bracket">[</span>
      <button
        type="button"
        onClick={mine ? onTakeBack : onOpen}
        disabled={disabled}
        aria-label={mine ? `Take back your outdated mark on ${what}` : `Mark ${what} as outdated`}
        title={mine ? 'You marked this outdated. Click to take your mark back.' : undefined}
      >
        {mine ? 'marked outdated' : 'mark outdated'}
      </button>
      <span className="discuss-edit-bracket">]</span>
    </span>
  );
}

// Opened under a heading by its MarkLink: an optional word on what is out of date, and the mark.
export function MarkPanel({ school, slug, target, onClose }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEscape(onClose);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await markOutdated(school, slug, target, true, note.trim());
      onClose();
    } catch (err) {
      setError(`Not marked. ${err.message}`);
      setBusy(false);
    }
  };
  return (
    <div className="discuss-mark-panel" role="group" aria-label="Mark outdated">
      <Line
        value={note}
        onChange={setNote}
        placeholder="What is out of date? (optional)"
        maxLength={200}
        aria-label="What is out of date"
        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        autoFocus
      />
      <div className="discuss-editor-buttons">
        <button type="button" className="discuss-editor-save" onClick={send} disabled={busy}>
          {busy ? 'Marking…' : 'Mark outdated'}
        </button>
        <button type="button" className="discuss-editor-cancel" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
      {error && <p className="discuss-editor-warn">{error}</p>}
    </div>
  );
}

// The line under a marked heading: who marked it and which publications changed under it.
export function OutdatedNote({ state }) {
  if (!state || !state.level) return null;
  const parts = [];
  if (state.marks) {
    const notes = state.notes.map((n) => `“${n}”`).join(' ');
    parts.push(`Marked outdated by ${plural(state.marks, 'reader')}${notes ? `: ${notes}` : ''}`);
  }
  for (const p of state.pubs) {
    const note = (p.notes || []).length ? `: “${p.notes[p.notes.length - 1]}”` : '';
    parts.push(`${reportName(p)} reported updated${note}`);
  }
  return <p className="discuss-outdated-note">{parts.join('. ')}.</p>;
}

export const outdatedClass = (state) => (state && state.level ? ` discuss-outdated discuss-outdated--${state.level}` : '');

const SCOPES = [
  { id: 'section', label: 'A section' },
  { id: 'chapter', label: 'A chapter' },
  { id: 'pub', label: 'The whole publication' },
];

const WORK_NAMES = WORKS.map((w) => w.work).sort((a, b) => a.localeCompare(b));

// Report that a publication has been updated. From a reference the publication is that
// reference's and the section and chapter are filled in from it; from the All Events page the
// reader picks the publication and types the part.
export function PubReportForm({ school, cited, onClose }) {
  const chapter = cited ? chapterOf(cited) : null;
  const [work, setWork] = useState(cited ? cited.work : '');
  const [scope, setScope] = useState('section');
  const [section, setSection] = useState(cited ? cited.loc || '' : '');
  const [chapterText, setChapterText] = useState(chapter ? chapter.label : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  useEscape(onClose);

  const part = scope === 'section' ? section.trim() : scope === 'chapter' ? chapterText.trim() : '';
  const ready = !!work && (scope === 'pub' || !!part) && !busy;
  const missing = !work ? 'Pick the publication first' : `Say which ${scope} first`;

  const send = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const { already } = await reportOutdatedPub({ school, work, scope, part, note: note.trim() });
      setDone(already
        ? 'You had already reported this. It is still marked.'
        : 'Reported. Every section citing it is now marked outdated.');
    } catch (err) {
      setError(`Not reported. ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="discuss-editor discuss-pub-report" role="status">
        <p className="discuss-editor-hint">{done}</p>
        <div className="discuss-editor-buttons">
          <button type="button" className="discuss-editor-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="discuss-editor discuss-pub-report" role="group" aria-label="Report an outdated publication">
      <p className="discuss-editor-hint">
        A new edition or change of a publication. Every section that cites the part that changed is
        marked outdated until someone brings it up to date.
      </p>
      {cited ? (
        <p className="discuss-pub-report-work">{work}</p>
      ) : (
        <div className="discuss-editor-field">
          <label className="discuss-editor-label" htmlFor="pub-report-work">Publication</label>
          <select
            id="pub-report-work"
            className="discuss-editor-select"
            value={work}
            onChange={(e) => setWork(e.target.value)}
          >
            <option value="">Pick one…</option>
            {WORK_NAMES.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      )}
      <fieldset className="discuss-editor-field discuss-pub-report-scope">
        <legend className="discuss-editor-label">What was updated</legend>
        {SCOPES.map((s) => (
          <label key={s.id} className="discuss-pub-report-choice">
            <input
              type="radio"
              name="pub-report-scope"
              value={s.id}
              checked={scope === s.id}
              onChange={() => setScope(s.id)}
            />
            {' '}{s.label}
          </label>
        ))}
      </fieldset>
      {scope === 'section' && (
        <div className="discuss-editor-field">
          <label className="discuss-editor-label" htmlFor="pub-report-section">Which section</label>
          <Line
            id="pub-report-section"
            value={section}
            onChange={setSection}
            placeholder="e.g. §403 or Ch. 4 — Operating Limitations"
            maxLength={120}
          />
        </div>
      )}
      {scope === 'chapter' && (
        <div className="discuss-editor-field">
          <label className="discuss-editor-label" htmlFor="pub-report-chapter">Which chapter</label>
          <Line
            id="pub-report-chapter"
            value={chapterText}
            onChange={setChapterText}
            placeholder="e.g. Ch. 4 or Appendix A"
            maxLength={40}
          />
        </div>
      )}
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="pub-report-note">What changed</label>
        <Line
          id="pub-report-note"
          value={note}
          onChange={setNote}
          placeholder="Optional. e.g. IC 4, new flap limit"
          maxLength={200}
        />
      </div>
      {error && <p className="discuss-editor-warn">{error}</p>}
      <div className="discuss-editor-buttons">
        <button
          type="button"
          className="discuss-editor-save"
          onClick={send}
          disabled={!ready}
          title={ready || busy ? undefined : missing}
        >
          {busy ? 'Reporting…' : 'Report'}
        </button>
        <button type="button" className="discuss-editor-cancel" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// `[mark pub as outdated]` on a reference, and the reports already made against it.
export function RefReports({ reports }) {
  if (!reports.length) return null;
  return (
    <span className="discuss-ref-outdated">
      {' '}Reported updated: {reports.map(reportName).join(', ')}.
    </span>
  );
}

// The All Events page: the reports made from this school's pages, and the way to make one.
export function OutdatedPubs({ school }) {
  const data = useOutdated();
  const [open, setOpen] = useState(false);
  const mine = (data.pubs || []).filter((p) => !p.school || p.school === school);
  return (
    <div className="discuss-outdated-pubs">
      {mine.length > 0 && (
        <p className="discuss-outdated-pubs-list">
          Reported updated:{' '}
          {mine.map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 && ', '}
              <span title={(p.notes || []).join(' · ') || undefined}>{reportName(p)}</span>
            </React.Fragment>
          ))}
          .
        </p>
      )}
      {open ? (
        <PubReportForm school={school} onClose={() => setOpen(false)} />
      ) : (
        <button type="button" className="discuss-editor-secondary discuss-outdated-pubs-button" onClick={() => setOpen(true)}>
          Report an outdated pub
        </button>
      )}
    </div>
  );
}
