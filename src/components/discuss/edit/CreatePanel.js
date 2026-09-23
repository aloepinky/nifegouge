import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Grow, ProgramFields, useEscape } from './fields';
import { withDefaultProgram } from '../program';
import { slugify } from './ids';
import { getItemMeta } from '../registry';
import { createItem, rememberItem, refreshSyllabus, getAuthor, setAuthor } from '../discussApi';
import { useDiscussBase } from '../paths';

// Makes a page. It starts as a placeholder — a title, and where an author could look — and
// opens in the page editor, where clearing the Placeholder flag and adding a section is what
// turns it into a page. With `link`, the event row that named the item is pointed at the new
// page in the same request, so the hub shows it without a second edit.
//
// Used from an event hub's "no page yet" row and from the not-found page for a typed slug.
// `program` is the aircraft and school to offer first: the syllabus's, where there is one.
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function CreatePanel({ slug: initialSlug, title: initialTitle, link, program: initialProgram, onCancel }) {
  const navigate = useNavigate();
  const base = useDiscussBase();
  const [slug, setSlug] = useState(initialSlug || slugify(initialTitle || ''));
  const [title, setTitle] = useState(initialTitle || '');
  const [program, setProgram] = useState(() => withDefaultProgram(initialProgram));
  const [lead, setLead] = useState('');
  const [author, setAuthorField] = useState(getAuthor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEscape(onCancel || (() => {}));

  const clean = slug.trim().toLowerCase();
  const taken = clean && getItemMeta(clean);
  const badSlug = clean && !SLUG_RE.test(clean);
  const ready = clean && !taken && !badSlug && title.trim() && program.aircraft.trim() && program.school.trim() && !busy;

  const create = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const name = author.trim();
    setAuthor(name);
    try {
      const aircraft = program.aircraft.trim();
      const school = program.school.trim();
      const result = await createItem({
        slug: clean,
        title: title.trim(),
        aircraft,
        school,
        sourcingLead: lead.trim() || undefined,
        author: name,
        link: link || undefined,
      });
      const item = { slug: clean, title: title.trim(), aircraft, school, stub: true };
      if (lead.trim()) item.sourcingLead = lead.trim();
      rememberItem({
        slug: clean, rev: 1, updatedAt: new Date().toISOString(), author: name, summary: 'Created the page', item,
      });
      if (link) await refreshSyllabus(link.syllabusId).catch(() => null);
      // Straight into the page form, which is what the new page's own "write this page"
      // opens. Creating a page and writing it are one job; the stub screen in between is a
      // step nobody asked for.
      navigate(
        `${base}/${clean}${link && result.linked ? `?from=${link.eventId}` : ''}`,
        { state: { write: true } },
      );
    } catch (err) {
      setError(err.status === 409
        ? 'A page with that address already exists. Link it from the list instead, with [edit].'
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
          The name the page is shown under everywhere on the site.
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
          The page&apos;s web address: <code>/tw4/discuss/{clean || 'page-name'}</code>. Lowercase
          words joined by hyphens. It cannot be changed later.
        </p>
        <Line id="create-slug" value={slug} onChange={setSlug} maxLength={80} />
        {taken && <p className="discuss-editor-warn">Taken: that address is already the page “{taken.title}”.</p>}
        {badSlug && <p className="discuss-editor-warn">Only lowercase letters, digits and single hyphens.</p>}
      </div>
      <ProgramFields idPrefix="create-program" value={program} onChange={setProgram} />
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="create-lead">Where to look</label>
        <p className="discuss-editor-hint">
          Optional. The publications and sections an author could start from.
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
