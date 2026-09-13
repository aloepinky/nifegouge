// The small inputs every editor is built from.
//
// Controlled inputs over a single `onChange(value)`, which is the pattern the rest of the app
// already uses — TW4JetLog.js's `handleInputChange(cellId, value)` and ToldCard.js's
// two-key setter. No form library, no validation library; the editors own their own state and
// hand a finished object back on save.
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { itemList, getItemMeta, useItemIndexVersion } from '../registry';
import { getAuthor, setAuthor } from '../discussApi';

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

// A list of item slugs — See also, and the two hatnote fields. Entry is by typing a slug with
// a datalist of every item, so an unwritten slug can still be entered: linking a page that
// does not exist yet is how a red link works, and the validator warns rather than refusing.
export function SlugList({ slugs, onChange, label, hint }) {
  const list = slugs || [];
  const set = (i, value) => onChange(list.map((s, j) => (j === i ? value : s)));
  const add = () => onChange([...list, '']);
  const remove = (i) => {
    const next = list.filter((_, j) => j !== i);
    onChange(next.length ? next : undefined);
  };

  return (
    <div className="discuss-editor-field">
      <label className="discuss-editor-label">{label}</label>
      {hint && <p className="discuss-editor-hint">{hint}</p>}
      {list.map((slug, i) => {
        const target = getItemMeta(slug);
        return (
          // eslint-disable-next-line react/no-array-index-key
          <div className="discuss-editor-row discuss-editor-row--tight" key={i}>
            <input
              type="text"
              className="discuss-editor-line"
              list="discuss-slug-options"
              value={slug}
              placeholder="item-slug"
              onChange={(e) => set(i, e.target.value)}
            />
            <span className={`discuss-editor-resolve${target ? '' : ' is-missing'}`}>
              {target ? target.title : slug ? 'no such item' : ''}
            </span>
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
// With `publish`, Save is the whole job. The footer asks what changed (required, it is the
// history's one line about this revision) and who did it (optional, remembered), and the
// editor's `onSave` receives `{ author, summary }` to send with the page. There is no separate
// publish step: a Save button that leaves the page unsaved is the thing every user reads
// wrong. `saving` holds the button while the request is out, and `saveError` is the server's
// refusal — printed here, so the fix happens in the still-open form.
//
// `remove` is the optional destructive action beside Cancel — removing the section being
// edited — as `{ label, question, summary, onConfirm }`. Removal is a save too, so it goes out
// with the same name and summary; a removal with nothing typed in "what changed" gets the
// stated `summary`, since a removal describes itself.
export function EditorActions({
  onSave, onCancel, errors, warnings, children, publish, saving, saveError, remove,
}) {
  const id = useId();
  const [author, setAuthorField] = useState(() => (publish ? getAuthor() : ''));
  const [summary, setSummary] = useState('');
  const hasErrors = (errors || []).length > 0;
  const unsaid = publish && !summary.trim();
  const blocked = hasErrors || unsaid || !!saving;

  const meta = (fallback) => {
    const name = author.trim();
    setAuthor(name);
    return { author: name, summary: summary.trim() || fallback };
  };

  const save = () => {
    if (blocked) return;
    if (!publish) {
      onSave();
      return;
    }
    onSave(meta());
  };

  const lint = (saveError && saveError.lint) || [];

  return (
    <div className="discuss-editor-actions">
      {publish && (
        <div className="discuss-editor-publish">
          <div className="discuss-editor-field">
            <label className="discuss-editor-label" htmlFor={`${id}-summary`}>
              What changed <span className="discuss-editor-req">required</span>
            </label>
            <Line
              id={`${id}-summary`}
              value={summary}
              onChange={setSummary}
              maxLength={200}
              placeholder="e.g. Corrected the flap limit from §4.3"
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
            />
          </div>
          <div className="discuss-editor-field">
            <label className="discuss-editor-label" htmlFor={`${id}-author`}>Your name</label>
            <Line
              id={`${id}-author`}
              value={author}
              onChange={setAuthorField}
              maxLength={40}
              placeholder="Optional. Shown in the page's history"
            />
          </div>
          <p className="discuss-editor-hint">
            Saving puts your edits on the site for everyone. Every revision is kept, so a
            mistake is undone from the page's history.
          </p>
        </div>
      )}
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
      {lint.length > 0 && (
        <ul className="discuss-editor-problems discuss-editor-problems--error">
          {lint.map((e) => (
            <li key={`${e.rule}:${e.detail}`}>{e.rule}: {e.detail}</li>
          ))}
        </ul>
      )}
      {saveError && <p className="discuss-editor-warn">{saveError.message}</p>}
      <div className="discuss-editor-buttons">
        <button
          type="button"
          className="discuss-editor-save"
          onClick={save}
          disabled={blocked}
          title={unsaid && !hasErrors ? 'Say what you changed first' : undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="discuss-editor-cancel" onClick={onCancel} disabled={!!saving}>
          Cancel
        </button>
        {children}
        {remove && (
          <ConfirmButton
            className="discuss-editor-remove-block"
            label={remove.label}
            question={remove.question}
            confirmLabel="Remove"
            onConfirm={() => {
              if (saving) return;
              remove.onConfirm(publish ? meta(remove.summary) : undefined);
            }}
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

export const BOLD_HINT = 'Wrap a mnemonic in **asterisks** for bold. That is the only markup.';
