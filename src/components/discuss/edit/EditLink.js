// The editing affordances that sit in the reading view: the `[edit]` link beside a heading,
// and the banner that says a page is showing local edits.
//
// Both are quiet on purpose. A wiki's edit links are furniture — present on every heading,
// noticed only when you are looking for them — and the moment they compete with the prose
// for attention the page has stopped being a reference and started being an application.
import React from 'react';
import { ConfirmButton } from './fields';

// `disabled` is set on every link but the one whose editor is open. One editor at a time is
// how a wiki works, and greying the others says so without a dialog asking whether to throw
// away what is in the open form.
export function EditLink({ onClick, what, label = 'edit', disabled }) {
  return (
    <span className={`discuss-edit-link${disabled ? ' is-disabled' : ''}`}>
      <span className="discuss-edit-bracket">[</span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={`Edit ${what}`}
        title={disabled ? 'Finish or cancel the open editor first' : undefined}
      >
        {label}
      </button>
      <span className="discuss-edit-bracket">]</span>
    </span>
  );
}

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

// Shown above the head whenever a draft is overlaying the published page. Its whole job is to
// stop somebody reading their own unsent edit and believing it is what the site says.
// `behind` names the revisions when the page has been published since the draft started.
export function DraftBanner({ savedAt, behind, onSource, onPublish, onDiscard }) {
  return (
    <div className="discuss-draft-banner">
      <p>
        <strong>You are reading your own edits.</strong> They are saved in this browser only
        until you publish them{savedAt ? `. Last saved ${when(savedAt)}` : ''}.
        {behind && (
          <>
            {' '}The page has been published since this draft started (revision {behind.from} to{' '}
            {behind.to}); check your changes against it before publishing.
          </>
        )}
      </p>
      <div className="discuss-draft-actions">
        <button type="button" onClick={onSource}>
          View source
        </button>
        <button type="button" onClick={onPublish}>
          Publish
        </button>
        <ConfirmButton
          label="Discard edits"
          question="Discard every edit on this page? There is no undo, and no copy anywhere else."
          confirmLabel="Discard"
          onConfirm={onDiscard}
        />
      </div>
    </div>
  );
}
