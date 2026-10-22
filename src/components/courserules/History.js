import React, { useEffect, useState } from 'react';
import { ConfirmButton, useEscape } from '../discuss/edit/fields';
import { getAuthor } from '../serverApi';
import { changedLegs } from './rules';
import { courseRulesHistory, courseRulesRevision, restoreCourseRules } from './courseRulesApi';

// Every revision of the course rules, newest first. Nothing is ever deleted, so this is how a
// wrong edit is undone: Restore publishes an old revision as a new one on top, which keeps the
// history linear and leaves the restore itself undoable. "What changed" names the legs a
// revision changed from the one before it.

const when = (date) => {
  try {
    return new Date(date).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (err) {
    return '';
  }
};

function Changes({ rev, names }) {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    Promise.all([courseRulesRevision(rev), rev > 1 ? courseRulesRevision(rev - 1) : null]).then(
      ([now, before]) => { if (alive) setState({ status: 'ready', ids: before ? changedLegs(before.doc, now.doc) : null }); },
      (err) => { if (alive) setState({ status: 'error', error: err.message }); },
    );
    return () => { alive = false; };
  }, [rev]);
  if (state.status === 'loading') return <p className="discuss-editor-hint">Loading…</p>;
  if (state.status === 'error') return <p className="discuss-editor-warn">{state.error}</p>;
  if (!state.ids) return <p className="discuss-editor-hint">The first revision: the course rules as they were typed into the site.</p>;
  if (!state.ids.length) return <p className="discuss-editor-hint">No leg changed (the source line, or a restore of the same words).</p>;
  return <p className="discuss-editor-hint">Changed: {state.ids.map((id) => names[id] || id).join(', ')}</p>;
}

function History({ names, latestRev, onClose, onRestored }) {
  const [state, setState] = useState({ status: 'loading' });
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  useEscape(onClose);

  useEffect(() => {
    let alive = true;
    courseRulesHistory().then(
      (data) => { if (alive) setState({ status: 'ready', data }); },
      (err) => { if (alive) setState({ status: 'error', error: err.message }); },
    );
    return () => { alive = false; };
  }, [latestRev]);

  const restore = async (rev) => {
    setError('');
    try {
      await restoreCourseRules(rev, getAuthor());
      onRestored();
    } catch (err) {
      setError(`Not restored. ${err.message}`);
    }
  };

  return (
    <div className="discuss-editor cr-edit" role="group" aria-label="Course rules history">
      <div className="cr-edit-head">
        <h3 className="cr-edit-title">History</h3>
        <button type="button" className="discuss-editor-cancel" onClick={onClose}>Close</button>
      </div>
      {state.status === 'loading' && <p className="discuss-editor-hint">Loading…</p>}
      {state.status === 'error' && <p className="discuss-editor-warn">{state.error}</p>}
      {error && <p className="discuss-editor-warn">{error}</p>}
      {state.status === 'ready' && (
        <ol className="cr-history">
          {state.data.revisions.map((r) => (
            <li key={r.rev} className="cr-history-row">
              <div className="cr-history-line">
                <span className="cr-history-when">{when(r.createdAt)}</span>
                <span className="cr-history-who">{r.author || 'Anonymous'}</span>
                <span className="cr-history-what">{r.summary}</span>
              </div>
              <div className="cr-history-tools">
                <button type="button" className="discuss-editor-secondary" onClick={() => setOpen(open === r.rev ? null : r.rev)}>
                  {open === r.rev ? 'Hide' : 'What changed'}
                </button>
                {r.rev === state.data.latestRev ? (
                  <span className="cr-history-current">Current</span>
                ) : (
                  <ConfirmButton
                    className="discuss-editor-secondary"
                    label="Restore"
                    question="Put the course rules back as they were in this revision?"
                    confirmLabel="Restore"
                    onConfirm={() => restore(r.rev)}
                  />
                )}
              </div>
              {open === r.rev && <Changes rev={r.rev} names={names} />}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default History;
