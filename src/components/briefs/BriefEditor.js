import React, { useState } from 'react';
import { getAuthor, setAuthor } from '../serverApi';
import { ConfirmButton, Grow, Line, RowTools, move } from '../discuss/edit/fields';
import { saveBrief, rememberBrief, fetchBrief } from './briefApi';

// Editing a brief, one block at a time.
//
// A brief is plain text, so it is edited in plain text boxes: a name and a box of text, with
// `fixed` saying whether that text is always on screen or something to open. It means the same
// on an item as on a section, and a fixed section carries its text instead of items, since a
// row nothing opens is a row that does nothing when clicked. The one extra box — `subtext`,
// the lines the card keeps under a name whose words open behind it — is behind a switch,
// because five items in a brief have one and the rest never will.
//
// Every edit goes into a working copy of the brief; nothing reaches the site until Publish,
// which is one revision carrying the lot.

export const keyOf = (kind, id) => `${kind}:${id}`;

const LINES_HINT = 'Use two spaces at the start of a line for a tab. Put **double asterisks** around words to make them bold.';

function nextId(prefix, doc) {
  const ids = new Set();
  (doc.sections || []).forEach((s) => {
    ids.add(s.id);
    (s.items || []).forEach((it) => ids.add(it.id));
  });
  const re = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-(\\d+)$`);
  let max = 0;
  ids.forEach((id) => {
    const m = id.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `${prefix}-${max + 1}`;
}

export const newItem = (section, doc) => ({
  id: nextId(section.id, doc), label: '', text: '',
});

export const newSection = (doc) => ({
  id: nextId('section', doc), title: '', column: 1, items: [],
});

function Actions({ onSave, onCancel, remove, children }) {
  return (
    <div className="discuss-editor-buttons brief-form-buttons">
      <button type="button" className="discuss-editor-save" onClick={onSave}>Done</button>
      <button type="button" className="discuss-editor-cancel" onClick={onCancel}>Cancel</button>
      {children}
      {remove && (
        <ConfirmButton
          className="discuss-editor-remove-block"
          label={remove.label}
          question={remove.question}
          confirmLabel="Remove"
          onConfirm={remove.onConfirm}
        />
      )}
    </div>
  );
}

// A name and a box of text, with two switches over it. Fixed says the text is always on
// screen rather than something to open, exactly as it does on a section. Subtext is the rarer
// one — a few lines kept under the name of an item whose words open behind it — so its box
// stays out of the way until it is asked for.
function ItemFields({ item, onChange }) {
  const set = (patch) => onChange({ ...item, ...patch });
  const [showSubtext, setShowSubtext] = useState(() => !!(item.subtext || '').trim());
  return (
    <>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Title</label>
        <Line value={item.label} onChange={(v) => set({ label: v })} placeholder="What this item is called" />
      </div>
      <div className="discuss-editor-field discuss-editor-field--inline brief-switches">
        <label title="Always on screen, with nothing to open">
          <input
            type="checkbox"
            checked={!!item.fixed}
            onChange={(e) => set({ fixed: e.target.checked })}
          />{' '}
          Always open
        </label>
        {!item.fixed && (
          <label className="brief-switch-small" title="A few lines kept under the title, above what opens">
            <input
              type="checkbox"
              checked={showSubtext}
              onChange={(e) => {
                setShowSubtext(e.target.checked);
                if (!e.target.checked) set({ subtext: '' });
              }}
            />{' '}
            Subtitle
          </label>
        )}
      </div>
      {!item.fixed && showSubtext && (
        <div className="discuss-editor-field">
          <label className="discuss-editor-label">Subtitle</label>
          <Grow value={item.subtext} onChange={(v) => set({ subtext: v })} rows={2} />
          <p className="discuss-editor-hint">Kept under the title, always on screen. {LINES_HINT}</p>
        </div>
      )}
      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Text</label>
        <Grow value={item.text} onChange={(v) => set({ text: v })} rows={4} />
        <p className="discuss-editor-hint">
          {item.fixed
            ? 'Always on screen, under the title. '
            : 'An empty box leaves the item with nothing to open. '}
          {LINES_HINT}
        </p>
      </div>
    </>
  );
}

// One item on its own, from the edit link beside it.
export function ItemForm({ item, onSave, onCancel, onRemove }) {
  const [draft, setDraft] = useState(item);
  return (
    <div className="discuss-editor brief-form">
      <ItemFields item={draft} onChange={setDraft} />
      <Actions
        onSave={() => onSave({ ...draft, label: draft.label.trim() })}
        onCancel={onCancel}
        remove={{ label: 'Delete', question: 'Delete this item?', onConfirm: onRemove }}
      />
    </div>
  );
}

// A section, and the items in it. Each item's name is on screen to be edited or moved; opening
// one shows its two text boxes, so a whole section can be gone through without leaving the
// form. A fixed section has one box instead, and no items.
export function SectionForm({ section, doc, onSave, onCancel, onRemove }) {
  const [draft, setDraft] = useState(section);
  const [openItem, setOpenItem] = useState(null);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const items = draft.items || [];
  const setItem = (i, item) => set({ items: items.map((it, j) => (j === i ? item : it)) });

  const save = () => {
    const next = {
      ...draft,
      title: (draft.title || '').trim(),
      items: draft.fixed ? [] : items.map((it) => ({ ...it, label: (it.label || '').trim() })),
    };
    if (!next.break) delete next.break;
    if (!next.fixed) delete next.fixed;
    onSave(next);
  };

  return (
    <div className="discuss-editor brief-form">
      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Heading</label>
        <Line value={draft.title} onChange={(v) => set({ title: v })} />
      </div>
      <div className="discuss-editor-field discuss-editor-field--inline">
        <label>
          Column{' '}
          <select
            className="discuss-editor-line brief-edit-select"
            value={draft.column === 2 ? 2 : 1}
            onChange={(e) => set({ column: Number(e.target.value) })}
          >
            <option value={1}>Left</option>
            <option value={2}>Right</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={!!draft.break}
            onChange={(e) => set({ break: e.target.checked })}
          />{' '}
          New Page
        </label>
        <label title="One block of text that nobody opens or closes">
          <input
            type="checkbox"
            checked={!!draft.fixed}
            onChange={(e) => set({ fixed: e.target.checked })}
          />{' '}
          Always open
        </label>
      </div>

      {draft.fixed ? (
        <div className="discuss-editor-field">
          <label className="discuss-editor-label">Text</label>
          <Grow value={draft.text} onChange={(v) => set({ text: v })} rows={6} />
          <p className="discuss-editor-hint">The whole section, always on screen. {LINES_HINT}</p>
        </div>
      ) : (
        <>
          <div className="discuss-editor-field">
            <label className="discuss-editor-label">Subheading</label>
            <Grow value={draft.text} onChange={(v) => set({ text: v })} rows={1} placeholder="Usually empty" />
          </div>
          <div className="discuss-editor-field">
            <label className="discuss-editor-label">Items</label>
            {items.map((item, i) => (
              <div className="brief-edit-item" key={item.id}>
                <div className="discuss-editor-row discuss-editor-row--tight">
                  <button
                    type="button"
                    className="brief-link brief-edit-open"
                    aria-expanded={openItem === item.id}
                    onClick={() => setOpenItem(openItem === item.id ? null : item.id)}
                  >
                    {openItem === item.id ? '▼' : '▶'} {i + 1}.
                  </button>
                  <Line value={item.label} onChange={(v) => setItem(i, { ...item, label: v })} />
                  <RowTools
                    index={i}
                    count={items.length}
                    onMove={(from, to) => set({ items: move(items, from, to) })}
                    onRemove={(k) => set({ items: items.filter((_, j) => j !== k) })}
                    what="item"
                    confirmRemove
                  />
                </div>
                {openItem === item.id && (
                  <div className="brief-edit-itemfields">
                    <ItemFields item={item} onChange={(next) => setItem(i, next)} />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              className="discuss-editor-add"
              onClick={() => {
                const item = newItem(draft, doc);
                set({ items: [...items, item] });
                setOpenItem(item.id);
              }}
            >
              + item
            </button>
          </div>
        </>
      )}

      <Actions
        onSave={save}
        onCancel={onCancel}
        remove={{ label: 'Delete', question: 'Delete this section and everything in it?', onConfirm: onRemove }}
      />
    </div>
  );
}

// The title, the button's name, the program, who published the guide and when, and the note
// at the foot.
export function HeadForm({ doc, onSave, onCancel }) {
  const source = doc.source || {};
  const [draft, setDraft] = useState({
    title: doc.title,
    short: doc.short || '',
    aircraft: doc.aircraft || '',
    school: doc.school || '',
    unit: source.unit || '',
    date: source.date || '',
    note: doc.note || '',
  });
  const set = (key, v) => setDraft((d) => ({ ...d, [key]: v }));
  const save = () => {
    const { unit, date, ...head } = draft;
    const next = { ...doc, ...head };
    const rest = { ...source, unit: unit.trim(), date: date.trim() };
    if (!rest.unit) delete rest.unit;
    if (!rest.date) delete rest.date;
    if (Object.keys(rest).length) next.source = rest;
    else delete next.source;
    onSave(next);
  };
  return (
    <div className="discuss-editor brief-form">
      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Title</label>
        <Line value={draft.title} onChange={(v) => set('title', v)} />
      </div>
      <div className="discuss-editor-pair">
        <div>
          <label className="discuss-editor-label">Name on the button</label>
          <Line value={draft.short} onChange={(v) => set('short', v)} maxLength={40} />
        </div>
        <div>
          <label className="discuss-editor-label">Aircraft</label>
          <Line value={draft.aircraft} onChange={(v) => set('aircraft', v)} maxLength={40} />
        </div>
        <div>
          <label className="discuss-editor-label">School</label>
          <Line value={draft.school} onChange={(v) => set('school', v)} maxLength={40} />
        </div>
      </div>
      <div className="discuss-editor-pair">
        <div>
          <label className="discuss-editor-label">Wing/Squadron</label>
          <Line value={draft.unit} onChange={(v) => set('unit', v)} maxLength={40} placeholder="Who published the guide" />
        </div>
        <div>
          <label className="discuss-editor-label">Date it was made</label>
          <Line type="date" value={draft.date} onChange={(v) => set('date', v)} />
        </div>
      </div>
      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Note at the foot of the brief</label>
        <Grow value={draft.note} onChange={(v) => set('note', v)} rows={3} />
      </div>
      <Actions onSave={save} onCancel={onCancel} />
    </div>
  );
}

// What the page renders, tidied.
export function cleaned(doc) {
  return {
    ...doc,
    title: (doc.title || '').trim(),
    short: (doc.short || '').trim(),
    sections: (doc.sections || []).map((s) => ({
      ...s,
      title: (s.title || '').trim(),
      text: (s.text || '').trim(),
      items: (s.items || []).map((it) => {
        const item = { ...it, label: (it.label || '').trim(), text: (it.text || '').trim() };
        const subtext = (it.subtext || '').trim();
        if (subtext) item.subtext = subtext;
        else delete item.subtext;
        if (!item.fixed) delete item.fixed;
        return item;
      }),
    })),
  };
}

export function problems(doc) {
  const out = [];
  if (!(doc.title || '').trim()) out.push('The brief needs a title.');
  if (!(doc.aircraft || '').trim()) out.push('Say which aircraft the brief is for.');
  if (!(doc.school || '').trim()) out.push('Say which school the brief is for.');
  (doc.sections || []).forEach((s, i) => {
    const where = s.title || `Section ${i + 1}`;
    if (!(s.title || '').trim()) out.push(`Section ${i + 1} has no heading.`);
    if (s.fixed && !(s.text || '').trim()) out.push(`${where} is fixed but has no text in it.`);
    (s.items || []).forEach((it, j) => {
      if (!(it.label || '').trim()) out.push(`${where}, item ${j + 1} has no name.`);
      if (it.fixed && !(it.text || '').trim()) {
        out.push(`${where}, item ${j + 1} is fixed but has no text in it.`);
      }
    });
  });
  return out;
}

// The bar that stays on screen while editing: what publishing will do, and the two buttons
// that end it. Nothing reaches the site until Publish.
export function PublishBar({ record, doc, dirty, onPublished, onCancel, onEditHead }) {
  const [author, setAuthorField] = useState(getAuthor);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(null);

  const errors = problems(doc);
  const ready = dirty && !errors.length && summary.trim() && !busy;

  const publish = async (baseRev) => {
    setBusy(true);
    setError('');
    try {
      setAuthor(author.trim());
      const brief = cleaned(doc);
      const out = await saveBrief(record.id, baseRev, brief, { author: author.trim(), summary: summary.trim() });
      const fresh = {
        id: record.id, rev: out.rev, updatedAt: out.updatedAt, author: author.trim(), summary: summary.trim(), brief,
      };
      rememberBrief(fresh);
      onPublished(fresh);
    } catch (err) {
      setBusy(false);
      if (err.status === 409) setConflict(err.data && err.data.rev);
      else setError(`Not published. ${err.message}`);
    }
  };

  const loadTheirs = async () => {
    setBusy(true);
    try {
      rememberBrief(await fetchBrief(record.id));
      onCancel();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (conflict) {
    return (
      <div className="brief-publishbar brief-publishbar--conflict">
        <p>
          <strong>Somebody published this brief while you were editing it.</strong> Version
          {' '}{conflict} is on the site now; your edits are still on screen. Publishing yours
          keeps theirs in the history, where it can be restored.
        </p>
        <div className="discuss-editor-buttons">
          <ConfirmButton
            className="discuss-editor-save"
            label="Publish mine over it"
            question={`Publish over version ${conflict}?`}
            confirmLabel="Publish"
            onConfirm={() => publish(conflict)}
          />
          <ConfirmButton
            className="discuss-editor-cancel"
            label="Load theirs"
            question="Throw away your edits?"
            confirmLabel="Throw away"
            onConfirm={loadTheirs}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="brief-publishbar">
      <p className="brief-publishbar-lead">
        <strong>You are editing this brief.</strong> Use the edit links beside a heading or an
        item. Nothing changes on the site until you publish.
      </p>
      {errors.length > 0 && (
        <ul className="discuss-editor-problems discuss-editor-problems--error">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="brief-publishbar-row">
        <span>
          <label className="discuss-editor-label" htmlFor="brief-author">Your name</label>
          <Line id="brief-author" value={author} onChange={setAuthorField} placeholder="optional" maxLength={40} />
        </span>
        <span className="brief-publishbar-summary">
          <label className="discuss-editor-label" htmlFor="brief-summary">What you changed</label>
          <Line id="brief-summary" value={summary} onChange={setSummary} maxLength={200} />
        </span>
        <button
          type="button"
          className="discuss-editor-save"
          onClick={() => publish(record.rev)}
          disabled={!ready}
          title={!dirty ? 'Nothing has been changed yet' : !summary.trim() ? 'Say what you changed first' : ''}
        >
          {busy ? 'Publishing…' : 'Publish'}
        </button>
        {dirty ? (
          <ConfirmButton
            className="discuss-editor-cancel"
            label="Stop editing"
            question="Throw away your edits?"
            confirmLabel="Throw away"
            onConfirm={onCancel}
          />
        ) : (
          <button type="button" className="discuss-editor-cancel" onClick={onCancel}>Stop editing</button>
        )}
        <button type="button" className="brief-link" onClick={onEditHead}>title, note and buttons</button>
      </div>
      {error && <p className="discuss-editor-warn">{error}</p>}
    </div>
  );
}
