// The small inputs every editor is built from.
//
// Controlled inputs over a single `onChange(value)`, which is the pattern the rest of the app
// already uses — TW4JetLog.js's `handleInputChange(cellId, value)` and ToldCard.js's
// two-key setter. No form library, no validation library; the editors own their own state and
// hand a finished object back on save.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { itemList, getItemMeta, useItemIndexVersion } from '../registry';
import { knownPrograms } from '../program';

// A link in See also or a hatnote is either a discussion item's slug or `{ href, label }`,
// the same shape an event row uses for a link elsewhere on the site. Resolved here for the
// editor's row and for ItemPage's rendering, so the two agree about what an entry means.
// -> { slug, title } | { href, label } | null
export function resolveLink(entry) {
  if (!entry) return null;
  if (typeof entry === 'object') {
    return entry.href ? { href: entry.href, label: entry.label || entry.href } : null;
  }
  const meta = getItemMeta(entry);
  return meta ? { slug: meta.slug, title: meta.title } : null;
}

export const looksLikeUrl = (text) => /^(https?:\/\/|\/)/.test((text || '').trim());

// Destructive actions ask in the page, never through window.confirm. The app has no native
// dialogs anywhere else, a browser dialog cannot say what is about to be lost, and the
// question belongs next to the thing being removed rather than in a box over the whole page.
export function ConfirmButton({ label, question, confirmLabel, className, onConfirm }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="discuss-editor-confirm">
      <span className="discuss-editor-confirm-q">{question}</span>
      <button
        type="button"
        className="discuss-editor-remove-block"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="discuss-editor-cancel" onClick={() => setAsking(false)}>
        Keep
      </button>
    </span>
  );
}

// A textarea that grows to its content, so a nine-line paragraph is not edited through a
// three-line window. Height is set from scrollHeight on every render the value changes.
export function Grow({ value, onChange, rows = 2, placeholder, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="discuss-editor-text"
      rows={rows}
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

export function Line({ value, onChange, placeholder, ...rest }) {
  return (
    <input
      type="text"
      className="discuss-editor-line"
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

// The citation picker: one toggle per reference the page declares. A page with no references
// shows the reason rather than an empty row, because "cite this" with nothing to cite reads
// as a broken control.
export function RefsPicker({ refs, references, onChange, label = 'Source' }) {
  const on = refs || [];
  const toggle = (n) => {
    const next = on.includes(n) ? on.filter((x) => x !== n) : [...on, n].sort((a, b) => a - b);
    onChange(next.length ? next : undefined);
  };
  return (
    <span className="discuss-refpick">
      <span className="discuss-refpick-label">{label}</span>
      {(references || []).length === 0 ? (
        <span className="discuss-editor-hint">no references on this page yet</span>
      ) : (
        references.map((r) => (
          <button
            type="button"
            key={r.n}
            className={`discuss-refpick-btn${on.includes(r.n) ? ' is-on' : ''}`}
            onClick={() => toggle(r.n)}
            title={`${r.work}${r.loc ? `, ${r.loc}` : ''}`}
          >
            {r.n}
          </button>
        ))
      )}
    </span>
  );
}

// Move up / move down / remove. Reordering is safe — it is renaming that orphans an
// annotation, and nothing here renames.
//
// `confirmRemove` arms the ✕ instead of firing it, for the rows where removal takes content
// with it: a section carries its paragraphs, a reference carries every marker citing it. A
// paragraph or a list element needs no arming — Cancel still un-does it.
export function RowTools({ index, count, onMove, onRemove, what = 'row', confirmRemove }) {
  const [armed, setArmed] = useState(false);
  return (
    <span className="discuss-editor-tools">
      <button
        type="button"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        title={`Move ${what} up`}
        aria-label={`Move ${what} up`}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(index, index + 1)}
        disabled={index === count - 1}
        title={`Move ${what} down`}
        aria-label={`Move ${what} down`}
      >
        ↓
      </button>
      <button
        type="button"
        className={`discuss-editor-remove${armed ? ' is-armed' : ''}`}
        onClick={() => {
          if (confirmRemove && !armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          onRemove(index);
        }}
        onBlur={() => setArmed(false)}
        title={armed ? `Confirm: remove this ${what} and its contents` : `Remove ${what}`}
        aria-label={armed ? `Confirm remove ${what}` : `Remove ${what}`}
      >
        {armed ? 'remove?' : '✕'}
      </button>
    </span>
  );
}

export function move(list, from, to) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

// A list of links — See also, and the two hatnote fields. One box takes either a page's
// address (a slug, with every page offered as you type) or a full link; a link grows a second
// box for the words to show. An unwritten slug can still be entered: linking a page that
// does not exist yet is how a red link works, and the validator warns rather than refusing.
export function SlugList({ slugs, onChange, label, hint }) {
  const list = slugs || [];
  const set = (i, value) => onChange(list.map((s, j) => (j === i ? value : s)));
  const add = () => onChange([...list, '']);
  const remove = (i) => {
    const next = list.filter((_, j) => j !== i);
    onChange(next.length ? next : undefined);
  };
  const setAddress = (i, text) => {
    const entry = list[i];
    if (looksLikeUrl(text)) set(i, { href: text, label: typeof entry === 'object' ? entry.label || '' : '' });
    else set(i, text);
  };

  return (
    <div className="discuss-editor-field">
      <label className="discuss-editor-label">{label}</label>
      {hint && <p className="discuss-editor-hint">{hint}</p>}
      {list.map((entry, i) => {
        const isUrl = typeof entry === 'object';
        const address = isUrl ? entry.href : entry;
        const target = isUrl ? null : getItemMeta(entry);
        return (
          // eslint-disable-next-line react/no-array-index-key
          <div className="discuss-editor-row discuss-editor-row--tight" key={i}>
            <input
              type="text"
              className="discuss-editor-line"
              list="discuss-slug-options"
              value={address || ''}
              placeholder="page address, or a link"
              onChange={(e) => setAddress(i, e.target.value)}
            />
            {isUrl ? (
              <input
                type="text"
                className="discuss-editor-line"
                value={entry.label || ''}
                placeholder="words to show for the link"
                aria-label="Words to show for the link"
                onChange={(e) => set(i, { ...entry, label: e.target.value })}
              />
            ) : (
              <span className={`discuss-editor-resolve${target ? '' : ' is-missing'}`}>
                {target ? target.title : entry ? 'no page at that address' : ''}
              </span>
            )}
            <RowTools
              index={i}
              count={list.length}
              onMove={(from, to) => onChange(move(list, from, to))}
              onRemove={remove}
              what="link"
            />
          </div>
        );
      })}
      <button type="button" className="discuss-editor-add" onClick={add}>
        + link
      </button>
    </div>
  );
}

// One datalist for every slug picker on the page. Rendered once by ItemPage; 305 options is
// a few kilobytes of DOM and the browser does the filtering. Rebuilt when a page is created.
export function SlugOptions() {
  useItemIndexVersion();
  return (
    <datalist id="discuss-slug-options">
      {itemList().map((it) => (
        <option value={it.slug} key={it.slug}>
          {it.title}
        </option>
      ))}
    </datalist>
  );
}

// Save / Cancel, plus whatever else an editor wants. Save is disabled while the validator
// reports an error, and the errors are printed above it rather than in an alert.
//
// Save commits to the draft, not to the site: publishing is a deliberate second step from the
// banner ItemPage scrolls to. The hint under the button says so, because a Save that is not
// the end of the job is the one thing every user reads wrong.
//
// `remove` is the optional destructive action beside Cancel — removing the section being
// edited — as `{ label, question, onConfirm }`.
export function EditorActions({ onSave, onCancel, errors, warnings, children, remove, draft }) {
  const hasErrors = (errors || []).length > 0;
  return (
    <div className="discuss-editor-actions">
      {hasErrors && (
        <ul className="discuss-editor-problems discuss-editor-problems--error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {(warnings || []).length > 0 && (
        <ul className="discuss-editor-problems">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {draft && (
        <p className="discuss-editor-hint">
          Save keeps your edits in this browser. Nothing changes on the site until you publish
          them, which is the next step.
        </p>
      )}
      <div className="discuss-editor-buttons">
        <button type="button" className="discuss-editor-save" onClick={onSave} disabled={hasErrors}>
          Save
        </button>
        <button type="button" className="discuss-editor-cancel" onClick={onCancel}>
          Cancel
        </button>
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
    </div>
  );
}

// Escape cancels an open editor, as it closes a dialog everywhere else on the web. An editor
// embedded in another passes nothing, and the outer one answers.
export function useEscape(onCancel) {
  const cb = useCallback(
    (e) => {
      if (e.key === 'Escape' && onCancel) onCancel();
    },
    [onCancel]
  );
  useEffect(() => {
    document.addEventListener('keydown', cb);
    return () => document.removeEventListener('keydown', cb);
  }, [cb]);
}

// Adding a block scrolls to it and puts the cursor in its first box. Returns the setter to
// call with the new block's id; the block wrapper carries it as `data-block`.
export function useFocusNew() {
  const [pending, setPending] = useState(null);
  useEffect(() => {
    if (!pending) return;
    setPending(null);
    const el = document.querySelector(`[data-block="${pending}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const input = el.querySelector('textarea, input:not([type=checkbox])');
    if (input) input.focus({ preventScroll: true });
  }, [pending]);
  return setPending;
}

export const BOLD_HINT = 'Put **double asterisks** around words to make them bold.';

// The aircraft and the school a page or a syllabus is for, side by side. Both are required
// wherever a page or a syllabus is made, and both are shown wherever it is edited. The
// suggestions are the values the pages already carry, so a second aircraft is typed once
// and picked ever after.
export function ProgramFields({ value, onChange, idPrefix = 'program', hint }) {
  useItemIndexVersion();
  const known = knownPrograms(itemList());
  const set = (key, v) => onChange({ aircraft: value.aircraft || '', school: value.school || '', [key]: v });
  return (
    <div className="discuss-editor-field">
      <div className="discuss-editor-pair">
        <div>
          <label className="discuss-editor-label" htmlFor={`${idPrefix}-aircraft`}>
            Aircraft <span className="discuss-editor-req">required</span>
          </label>
          <Line
            id={`${idPrefix}-aircraft`}
            value={value.aircraft}
            onChange={(v) => set('aircraft', v)}
            list={`${idPrefix}-aircraft-options`}
            placeholder="e.g. T-6B"
            maxLength={40}
          />
          <datalist id={`${idPrefix}-aircraft-options`}>
            {known.aircraft.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
        <div>
          <label className="discuss-editor-label" htmlFor={`${idPrefix}-school`}>
            School <span className="discuss-editor-req">required</span>
          </label>
          <Line
            id={`${idPrefix}-school`}
            value={value.school}
            onChange={(v) => set('school', v)}
            list={`${idPrefix}-school-options`}
            placeholder="e.g. Primary"
            maxLength={40}
          />
          <datalist id={`${idPrefix}-school-options`}>
            {known.schools.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
      </div>
      <p className="discuss-editor-hint">
        {hint || 'The aircraft and the school this page is for. A page with the same name can exist for another aircraft, and this is what tells them apart.'}
      </p>
    </div>
  );
}
