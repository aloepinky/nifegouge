import React, { useState } from 'react';
import { Line, useEscape } from './fields';
import { saveItem, getAuthor, setAuthor } from '../discussApi';

// The step between a draft and the site. Asks who and why, sends the page, and reports back:
// a new revision with any lint warnings, a refusal naming what to fix, or a conflict when
// someone published first.
//
// `onPublished({ rev, updatedAt, lint })` and `onConflict(rev)` are the two ways out besides
// Cancel. The draft is untouched by this panel; ItemPage decides what to do with it.
function PublishDialog({ slug, baseRev, item, onPublished, onConflict, onCancel }) {
  const [author, setAuthorField] = useState(getAuthor);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lintErrors, setLintErrors] = useState([]);
  useEscape(onCancel);

  const ready = summary.trim().length > 0 && !busy;

  const publish = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setLintErrors([]);
    const name = author.trim();
    setAuthor(name);
    try {
      const result = await saveItem(slug, baseRev, item, { author: name, summary: summary.trim() });
      onPublished({ ...result, author: name, summary: summary.trim() });
    } catch (err) {
      if (err.status === 409) {
        onConflict(err.data && err.data.rev);
        return;
      }
      const lint = err.data && err.data.lint;
      if (lint && lint.errors && lint.errors.length) setLintErrors(lint.errors);
      setError(`Not published. ${err.message}`);
      setBusy(false);
    }
  };

  return (
    <div className="discuss-editor discuss-publish" role="group" aria-label="Publish this page">
      <p className="discuss-editor-hint">
        Publishing puts your edits on the site for everyone, as revision {baseRev + 1}. Every
        revision is kept, so a mistake is undone from the page's history.
      </p>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="publish-author">Your name</label>
        <p className="discuss-editor-hint">Optional. Shown in the history beside your revision.</p>
        <Line id="publish-author" value={author} onChange={setAuthorField} placeholder="How you want to be credited" maxLength={40} />
      </div>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="publish-summary">
          What changed <span className="discuss-editor-req">required</span>
        </label>
        <Line
          id="publish-summary"
          value={summary}
          onChange={setSummary}
          placeholder="e.g. Corrected the flap limit from §4.3"
          maxLength={200}
          onKeyDown={(e) => { if (e.key === 'Enter') publish(); }}
        />
      </div>
      {lintErrors.length > 0 && (
        <ul className="discuss-editor-problems discuss-editor-problems--error">
          {lintErrors.map((e) => (
            <li key={`${e.rule}:${e.detail}`}>{e.rule}: {e.detail}</li>
          ))}
        </ul>
      )}
      {error && <p className="discuss-editor-warn">{error}</p>}
      <div className="discuss-editor-buttons">
        <button
          type="button"
          className="discuss-editor-save"
          onClick={publish}
          disabled={!ready}
          title={summary.trim() ? undefined : 'Say what you changed first'}
        >
          {busy ? 'Publishing…' : 'Publish'}
        </button>
        <button type="button" className="discuss-editor-cancel" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PublishDialog;
