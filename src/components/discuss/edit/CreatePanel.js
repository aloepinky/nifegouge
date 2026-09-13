import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Grow, useEscape } from './fields';
import { slugify } from './ids';
import { getItemMeta } from '../registry';
import { createItem, rememberItem, refreshSyllabus, getAuthor, setAuthor } from '../discussApi';
import { DISCUSS_BASE } from '../SyllabusContext';

// Makes a page. It starts as a stub — a title and where the next writer should look — and
// becomes a page through the page editor. With `link`, the event row that named the item is
// pointed at the new page in the same request, so the hub shows it without a second edit.
//
// Used from an event hub's "no page yet" row and from the not-found page for a typed slug.
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function CreatePanel({ slug: initialSlug, title: initialTitle, link, onCancel }) {
  const navigate = useNavigate();
  const [slug, setSlug] = useState(initialSlug || slugify(initialTitle || ''));
  const [title, setTitle] = useState(initialTitle || '');
  const [lead, setLead] = useState('');
  const [author, setAuthorField] = useState(getAuthor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEscape(onCancel || (() => {}));

  const clean = slug.trim().toLowerCase();
  const taken = clean && getItemMeta(clean);
  const badSlug = clean && !SLUG_RE.test(clean);
  const ready = clean && !taken && !badSlug && title.trim() && !busy;

  const create = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const name = author.trim();
    setAuthor(name);
    try {
      const result = await createItem({
        slug: clean,
        title: title.trim(),
        sourcingLead: lead.trim() || undefined,
        author: name,
        link: link || undefined,
      });
      const item = { slug: clean, title: title.trim(), stub: true };
      if (lead.trim()) item.sourcingLead = lead.trim();
      rememberItem({
        slug: clean, rev: 1, updatedAt: new Date().toISOString(), author: name, summary: 'Created the page', item,
      });
      if (link) await refreshSyllabus(link.syllabusId).catch(() => null);
      navigate(`${DISCUSS_BASE}/${clean}${link && result.linked ? `?from=${link.eventId}` : ''}`);
    } catch (err) {
      setError(err.status === 409
        ? 'A page with that slug already exists. Link it from the list instead, with [edit].'
        : `Not created. ${err.message}`);
      setBusy(false);
    }
  };

  return (
    <div className="discuss-editor discuss-create" role="group" aria-label="Create a page">
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="create-title">
          Page title <span className="discuss-editor-req">required</span>
        </label>
        <p className="discuss-editor-hint">
          A noun phrase in sentence case, even when the JPPT&apos;s wording is not one.
        </p>
        <Line
          id="create-title"
          value={title}
          onChange={(v) => {
            setTitle(v);
            if (!initialSlug) setSlug(slugify(v));
          }}
          maxLength={120}
        />
      </div>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="create-slug">Address</label>
        <p className="discuss-editor-hint">
          The page&apos;s permanent URL: <code>/tw4/discuss/{clean || 'slug'}</code>. Lowercase words
          joined by hyphens. It cannot change later without breaking links.
        </p>
        <Line id="create-slug" value={slug} onChange={setSlug} maxLength={80} />
        {taken && <p className="discuss-editor-warn">Taken: that address is already the page “{taken.title}”.</p>}
        {badSlug && <p className="discuss-editor-warn">Only lowercase letters, digits and single hyphens.</p>}
      </div>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="create-lead">Where to look</label>
        <p className="discuss-editor-hint">
          Optional. The publication and section the next writer should start from.
        </p>
        <Grow id="create-lead" value={lead} onChange={setLead} rows={2} />
      </div>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="create-author">Your name</label>
        <Line id="create-author" value={author} onChange={setAuthorField} placeholder="Optional" maxLength={40} />
      </div>
      {error && <p className="discuss-editor-warn">{error}</p>}
      <div className="discuss-editor-buttons">
        <button type="button" className="discuss-editor-save" onClick={create} disabled={!ready}>
          {busy ? 'Creating…' : 'Create page'}
        </button>
        {onCancel && (
          <button type="button" className="discuss-editor-cancel" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default CreatePanel;
