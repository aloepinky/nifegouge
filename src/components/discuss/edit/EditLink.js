// The editing affordances that sit in the reading view: the `[edit]` link beside a heading,
// its sibling `[history]`, and the banner that says a page is showing local edits.
//
// All quiet on purpose. A wiki's edit links are furniture — present on every heading,
// noticed only when you are looking for them — and the moment they compete with the prose
// for attention the page has stopped being a reference and started being an application.
import React from 'react';
import { Link } from 'react-router-dom';
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

// A route link dressed as an edit link, so `[history]` sits beside `[edit page]` and reads as
// the same kind of thing.
export function HeadLink({ to, label }) {
  return (
    <span className="discuss-edit-link">
      <span className="discuss-edit-bracket">[</span>
      <Link to={to}>{label}</Link>
      <span className="discuss-edit-bracket">]</span>
    </span>
  );
}

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

// Shown above the head whenever a draft is overlaying the published page. Saving publishes
// straight to the site, so a draft only exists when a save did not go through — a refusal, a
// dropped connection, a page reloaded mid-edit, or someone else saving first. Its whole job is
// to stop somebody reading their own unsent edit and believing it is what the site says.
// `behind` is set when the page has been published since the draft started.
export function DraftBanner({ savedAt, behind, onPublish, onDiscard }) {
  return (
    <div className="discuss-draft-banner">
      <p>
        <strong>You are reading edits that are not on the site yet.</strong> They are kept in
        this browser only{savedAt ? `, last kept ${when(savedAt)}` : ''}. Save them to the site,
        or discard them.
        {behind && (
          <>
            {' '}The page has been saved by someone else since these edits started; check your
            changes against it before saving.
          </>
        )}
      </p>
      <div className="discuss-draft-actions">
        <button type="button" onClick={onPublish}>
          Save to the site
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
