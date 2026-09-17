import React, { useState } from 'react';
import { Line, RowTools, EditorActions, ConfirmButton, useEscape, move } from './edit/fields';
import { clone } from './edit/draft';
import { getItemMeta } from './registry';
import { saveSyllabus, rememberSyllabus, refreshSyllabus, getAuthor } from './discussApi';
import { useSyllabus } from './SyllabusContext';

// The list of discuss items an event briefs: what each one is called here, and what each
// resolves to. The name starts as the JPPT's wording and is editable, because it is what the
// event's list prints: one page can be listed under several names on one event (FAM1301 briefs
// ATF, ATS, CTS and MIF, all on one page) and the name is what tells them apart.
// A row is one of four shapes — a page (`slug`), a tab elsewhere on the site (`href`, called a
// PSM tab on screen because that is what a student calls it), an item nobody has written yet
// (label only), or one that wants no page (`noPage`) — and this editor keeps them exactly that
// shape. Saving publishes a new revision of the whole syllabus document, since the events live
// inside it.

const KINDS = [
  { value: 'page', label: 'page' },
  { value: 'href', label: 'PSM tab' },
  { value: 'none', label: 'no page yet' },
  { value: 'nopage', label: 'needs no page' },
];

const kindOf = (row) => (row.slug ? 'page' : row.href ? 'href' : row.noPage ? 'nopage' : 'none');

function normalise(rows) {
  return rows
    .map((r) => {
      const label = (r.label || '').trim();
      if (r.kind === 'page' && r.slug) return { slug: r.slug.trim().toLowerCase(), label };
      if (r.kind === 'href' && r.href) return { href: r.href.trim(), label };
      // "needs no page" is a decision, not an absence: the row stays, and the hub stops
      // offering to start a page for it.
      if (r.kind === 'nopage') return { label, noPage: true };
      return { label };
    })
    .filter((r) => r.label);
}

function EventItemsEditor({ event, onSaved, onCancel }) {
  const s = useSyllabus();
  const [rows, setRows] = useState(() => clone(event.items).map((r) => ({ ...r, kind: kindOf(r) })));
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(false);
  useEscape(onCancel);

  const set = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const errors = [];
  rows.forEach((r, i) => {
    if (!(r.label || '').trim()) errors.push(`Row ${i + 1} has no name.`);
    if (r.kind === 'page' && !(r.slug || '').trim()) errors.push(`Row ${i + 1} names no page.`);
    if (r.kind === 'href' && !/^\//.test((r.href || '').trim())) errors.push(`Row ${i + 1}: a PSM tab is the URL path after pinksheetmafia.com, starting with /.`);
  });
  if (!summary.trim()) errors.push('Say what you changed.');

  const save = async () => {
    if (errors.length || !s.record) return;
    setSaving(true);
    setError(null);
    const items = normalise(rows);
    const doc = {
      ...s.record.doc,
      events: s.record.doc.events.map((e) => (e.id === event.id ? { ...e, items } : e)),
    };
    try {
      const { rev } = await saveSyllabus(s.id, s.rev, doc, s.name, { author: getAuthor(), summary: summary.trim() });
      rememberSyllabus({ ...s.record, rev, doc });
      onSaved();
    } catch (err) {
      if (err.status === 409) {
        setConflict(true);
        setError('Someone saved a newer version of this syllabus while you were editing. Your rows are kept in this form.');
      } else {
        setError(`Not saved. ${err.message}`);
      }
      setSaving(false);
    }
  };

  const loadNewest = async () => {
    try {
      await refreshSyllabus(s.id);
      setConflict(false);
      setError(null);
    } catch (err) {
      setError(`Could not load the newest version. ${err.message}`);
    }
  };

  return (
    <div className="discuss-editor discuss-items-editor" role="group" aria-label={`Editing the items of ${event.id}`}>
      <p className="discuss-editor-hint">
        List the discussion items for this event and what each one links to, in the JPPT&apos;s
        order. The name is what the list shows, so start from the JPPT&apos;s wording and change
        it where that wording reads badly on screen or where two items share a page. If the item
        should link to a PSM tab, select PSM tab and input the corresponding URL path (the part
        after pinksheetmafia.com).
      </p>
      {rows.map((r, i) => {
        const meta = r.kind === 'page' && getItemMeta(r.slug);
        return (
          // eslint-disable-next-line react/no-array-index-key
          <div className="discuss-editor-row" key={i}>
            <Line value={r.label} onChange={(v) => set(i, { label: v })} placeholder="Name on this list" aria-label="Name on this list" />
            <select
              className="discuss-editor-line discuss-items-editor-kind"
              value={r.kind}
              aria-label="Resolves to"
              onChange={(e) => set(i, { kind: e.target.value })}
            >
              {KINDS.map((k) => <option value={k.value} key={k.value}>{k.label}</option>)}
            </select>
            {r.kind === 'page' && (
              <>
                <input
                  type="text"
                  className="discuss-editor-line"
                  list="discuss-slug-options"
                  value={r.slug || ''}
                  placeholder="item-slug"
                  aria-label="Page"
                  onChange={(e) => set(i, { slug: e.target.value })}
                />
                <span className={`discuss-editor-resolve${meta ? '' : ' is-missing'}`}>
                  {meta ? meta.title : r.slug ? 'no such page' : ''}
                </span>
              </>
            )}
            {r.kind === 'href' && (
              <Line value={r.href} onChange={(v) => set(i, { href: v })} placeholder="/tw4/eps-limits" aria-label="PSM tab" />
            )}
            <RowTools
              index={i}
              count={rows.length}
              onMove={(from, to) => setRows(move(rows, from, to))}
              onRemove={(j) => setRows(rows.filter((_, k) => k !== j))}
              what="item"
              confirmRemove
            />
          </div>
        );
      })}
      <button
        type="button"
        className="discuss-editor-add"
        onClick={() => setRows([...rows, { label: '', kind: 'none' }])}
      >
        + item
      </button>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label" htmlFor="items-summary">
          What changed <span className="discuss-editor-req">required</span>
        </label>
        <Line id="items-summary" value={summary} onChange={setSummary} maxLength={200} placeholder="e.g. Added the item Change 2 inserted" />
      </div>
      {error && <p className="discuss-editor-warn">{error}</p>}
      <EditorActions onSave={save} onCancel={onCancel} errors={saving ? ['Saving…'] : errors}>
        {conflict && (
          <ConfirmButton
            label="Load the newest version"
            question="Reload the syllabus underneath this form? Your rows stay as they are."
            confirmLabel="Load it"
            className="discuss-editor-secondary"
            onConfirm={loadNewest}
          />
        )}
      </EditorActions>
    </div>
  );
}

export default EventItemsEditor;
