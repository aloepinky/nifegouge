import React, { useState } from 'react';
import { Line, useEscape } from './fields';
import { saveItem, getAuthor, setAuthor } from '../discussApi';

// The step between a draft and the site, opened from the draft banner. Asks who and why,
// sends the page, and reports back: a new revision, a refusal naming what to fix, or a
// conflict when someone published first.
//
// `onPublished({ rev, updatedAt, lint })` and `onConflict(rev)` are the two ways out besides
// Cancel. The draft is untouched by this panel; ItemPage decides what to do with it.
//
// `marked` lists the parts of the page readers have marked outdated ({ id, title, changed }).
// The publisher ticks the ones the edit brings up to date, which clears their marks; a part the
// edit changed starts ticked.
function PublishDialog({ slug, baseRev, item, marked = [], onPublished, onConflict, onCancel }) {
  const [author, setAuthorField] = useState(getAuthor);
  const [summary, setSummary] = useState('');
  const [clearing, setClearing] = useState(() => new Set(marked.filter((m) => m.changed).map((m) => m.id)));
  const toggle = (id) => setClearing((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEscape(onCancel);

  const ready = summary.trim().length > 0 && !busy;

  const publish = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const name = author.trim();
    setAuthor(name);
    try {
      const clearOutdated = marked.map((m) => m.id).filter((id) => clearing.has(id));
      const result = await saveItem(slug, baseRev, item, { author: name, summary: summary.trim(), clearOutdated });
      onPublished({ ...result, author: name, summary: summary.trim() });
    } catch (err) {
      if (err.status === 409) {
        onConflict(err.data && err.data.rev);
        return;
      }
      setError(`Not published. ${err.message}`);
      setBusy(false);
    }
  };

  return (
    <div className="discuss-editor discuss-publish" role="group" aria-label="Publish this page">
      <p className="discuss-editor-hint">
        Publishing puts your edits on the site for everyone. Every revision is kept, so a
        mistake is undone from the page's history.
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
      {marked.length > 0 && (
        <fieldset className="discuss-editor-field discuss-publish-outdated">
          <legend className="discuss-editor-label">Marked outdated</legend>
          <p className="discuss-editor-hint">
            Tick the parts your edit brings up to date. Their outdated marks are cleared.
          </p>
          {marked.map((m) => (
            <label key={m.id} className="discuss-publish-outdated-row">
              <input type="checkbox" checked={clearing.has(m.id)} onChange={() => toggle(m.id)} />
              {' '}{m.title} is up to date
            </label>
          ))}
        </fieldset>
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
