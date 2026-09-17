import React, { useMemo, useState } from 'react';
import { getItemMeta } from '../registry';
import { useDiscussData } from '../DiscussData';
import { SlugOptions } from '../edit/fields';

// The items an upload could not tie to a page, one decision each.
//
// The generator links a wording to a page only when it is sure (jppt/matchItems.js): a JPPT
// phrasing that differs from Delta's by more than a plural is left as a "no page yet" row,
// and Echo left 32 of them. Most were pages all along — "Section emergencies" is Formation
// emergency procedures, "circling approach" is the Circling maneuver — and no threshold finds
// those without also linking things that merely share a word. A person reading the two
// wordings side by side decides in a second, so this is the step that asks them.
//
// Four answers, because there are four cases: the page exists under another wording, the item
// is one nobody has written yet, the wording covers more than one page, or the item wants no
// page at all. Nothing is required — an unselected item publishes as new, which is what it
// would have been anyway.
//
// **A row links one page.** So the third case is not a row with two pages; it is two rows.
// "SID/STAR" is the JPPT writing two items as one phrase, and the honest repair is to split
// it into an item that opens Standard instrument departure and an item that opens Standard
// terminal arrival. That means the wording changes — neither new item reads exactly as the
// JPPT prints it — which is the price of the item resolving at all, and cheaper than one row
// that has to pretend it means one of its two pages.

const key = (eventId, label) => `${eventId}|${label}`;

// Every row that resolves to nothing, deduped: one decision covers a wording repeated inside
// an event, and the rows it covers are carried along, because they are what it replaces. A row
// already marked as wanting no page is settled and stays out of the queue.
function unlinkedRows(doc) {
  const seen = new Set();
  const out = [];
  (doc.events || []).forEach((event) => {
    (event.items || []).forEach((row) => {
      if (row.slug || row.href || row.noPage) return;
      const k = key(event.id, row.label);
      if (seen.has(k)) return;
      seen.add(k);
      out.push({
        k,
        eventId: event.id,
        label: row.label,
        rows: event.items.filter((r) => r.label === row.label && !r.slug && !r.href && !r.noPage),
      });
    });
  });
  return out;
}

// `fallback` covers a wording box someone has emptied mid-edit: the row keeps the JPPT's
// wording rather than becoming an item with no name.
const rowFor = (part, fallback) => {
  const label = part.label.trim() || fallback;
  if (part.noPage) return { label, noPage: true };
  if (!part.to) return { label };
  return part.to.startsWith('/') ? { label, href: part.to } : { label, slug: part.to };
};

// An entry's rows, replaced in place by the rows it writes now. The rows it wrote last time
// are matched by identity rather than by their wording, so a split is free to rename its
// halves to anything, including a wording another item already uses.
function writeRows(doc, eventId, previous, rows) {
  return {
    ...doc,
    events: doc.events.map((event) => {
      if (event.id !== eventId) return event;
      const items = [];
      let placed = false;
      event.items.forEach((row) => {
        if (previous.includes(row)) {
          if (!placed) { rows.forEach((r) => items.push(r)); placed = true; }
          return;
        }
        items.push(row);
      });
      if (!placed) rows.forEach((r) => items.push(r));
      return { ...event, items };
    }),
  };
}

// Identity again: a decision holds only while the rows it wrote are still in the document.
// The flow editor's undo reaches these edits, and an undone decision has to offer itself
// again rather than claim something the document no longer says.
function stillThere(doc, eventId, rows) {
  const event = (doc.events || []).find((e) => e.id === eventId);
  return !!event && rows.every((r) => event.items.includes(r));
}

function pageTitle(slug) {
  const meta = getItemMeta(slug);
  return meta ? meta.title : null;
}

const nameOf = (to) => pageTitle(to) || to;

// "SID/STAR" splits at the slash it is already written with; anything else starts both halves
// from the JPPT's wording for the reader to cut up.
function splitLabel(label) {
  const parts = label.split(/\s*\/\s*/).filter(Boolean);
  return parts.length === 2 ? parts : [label, label];
}

// The answers, one click each. A page suggestion is styled as a page and choosing it is the
// whole decision; the answers that are not pages sit beside them looking like what they are.
function Picker({ label, suggestions, taken, onChoose, onNew, onNone, onCancel, compact }) {
  const [other, setOther] = useState(false);
  const [typed, setTyped] = useState('');
  const slug = typed.trim().toLowerCase();
  const known = !!getItemMeta(slug);
  const offered = suggestions.filter((s) => !taken.includes(s.slug || s.href));
  const commit = () => { onChoose(slug); setTyped(''); setOther(false); };

  return (
    <div className="discuss-link-review-choose">
      {!compact && (
        <p className="discuss-link-review-ask">Which page should this item link to?</p>
      )}
      <div className="discuss-link-review-picks">
        {offered.map((s) => (
          <button
            type="button"
            key={s.slug || s.href}
            className="discuss-link-review-pick"
            onClick={() => onChoose(s.slug || s.href)}
          >
            {(s.slug && pageTitle(s.slug)) || s.href}
          </button>
        ))}
        {/* One button, not a button and a box: it opens the field, and once the field names a
            page it is the button that links it, labelled with the page it will open. */}
        <button
          type="button"
          className={`discuss-link-review-opt${other ? ' is-on' : ''}`}
          aria-expanded={other}
          onClick={() => (known ? commit() : setOther(!other))}
        >
          {known ? `Link ${pageTitle(slug)}` : (offered.length ? 'Other page' : 'Name the page')}
        </button>
        {onNew && (
          <button type="button" className="discuss-link-review-opt" onClick={onNew}>New page</button>
        )}
        {onNone && (
          <button type="button" className="discuss-link-review-opt" onClick={onNone}>No page</button>
        )}
        {onCancel && (
          <button type="button" className="discuss-link-review-opt" onClick={onCancel}>Never mind</button>
        )}
      </div>
      {other && (
        <div className="discuss-link-review-actions">
          <input
            type="text"
            className="discuss-editor-line discuss-link-review-slug"
            list="discuss-slug-options"
            value={typed}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            placeholder="start typing a page"
            aria-label={`The page ${label} means`}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && known) { e.preventDefault(); commit(); } }}
          />
          <span className="discuss-link-review-none">
            {known ? 'Press Enter, or the button above.' : 'Pick a page from the list.'}
          </span>
        </div>
      )}
    </div>
  );
}

// One half of a split item: its own wording, and its own page.
function Part({ part, index, matcher, taken, onLabel, onChoose, onClear, onRemove }) {
  const suggestions = useMemo(
    () => (matcher ? matcher.suggest(part.label) : []),
    [matcher, part.label],
  );
  return (
    <div className="discuss-link-review-part">
      <input
        type="text"
        className="discuss-editor-line discuss-link-review-wording"
        value={part.label}
        aria-label={`Wording of item ${index + 1}`}
        onChange={(e) => onLabel(e.target.value)}
      />
      {part.to ? (
        <p className="discuss-link-review-done">
          Opens {nameOf(part.to)}.
          <button type="button" className="discuss-link-review-undo" onClick={onClear}>Change</button>
          {onRemove && (
            <button type="button" className="discuss-link-review-undo" onClick={onRemove}>Remove</button>
          )}
        </p>
      ) : (
        <Picker
          label={part.label}
          suggestions={suggestions}
          taken={taken}
          compact
          onChoose={onChoose}
          onCancel={onRemove}
        />
      )}
    </div>
  );
}

function LinkReview({ doc, onChange }) {
  const { matcher } = useDiscussData();
  // The queue is read once, so a row does not vanish from under the reader the moment they
  // decide it: what happened stays on screen with a way back.
  const [queue] = useState(() => unlinkedRows(doc));
  // What each entry has been made into: its parts, and the labels it wrote last time.
  const [state, setState] = useState({});

  const suggestions = useMemo(() => {
    const out = {};
    queue.forEach((entry) => {
      out[entry.k] = matcher ? matcher.suggest(entry.label) : [];
    });
    return out;
  }, [queue, matcher]);

  if (!queue.length) return null;

  // Write an entry's parts into the document, replacing whatever it wrote before.
  const put = (entry, parts) => {
    const st = state[entry.k];
    const rows = parts.map((p) => rowFor(p, entry.label));
    onChange(writeRows(doc, entry.eventId, (st && st.rows) || entry.rows, rows));
    setState({ ...state, [entry.k]: { parts, rows } });
  };

  const reset = (entry) => {
    const st = state[entry.k];
    onChange(writeRows(doc, entry.eventId, (st && st.rows) || entry.rows, [{ label: entry.label }]));
    const next = { ...state };
    delete next[entry.k];
    setState(next);
  };

  const settled = (entry) => {
    const st = state[entry.k];
    return st && stillThere(doc, entry.eventId, st.rows) ? st : null;
  };
  const done = queue.filter((entry) => settled(entry)).length;

  return (
    <section className="discuss-editor discuss-link-review">
      <SlugOptions />
      <p className="discuss-editor-hint">
        Each item below could not be definitively linked to an existing page. Below are options
        to indicate an item has an existing page but is worded differently, is new, refers to
        multiple pages, or does not need a page at all. Please select which is the case. Any
        unselected item will be assumed to be new. {done} of {queue.length} selected.
      </p>
      <ul className="discuss-link-review-list">
        {queue.map((entry) => {
          const st = settled(entry);
          const parts = st ? st.parts : null;
          const split = parts && parts.length > 1;
          const taken = parts ? parts.map((p) => p.to).filter(Boolean) : [];
          const first = parts && parts[0];

          const setPart = (i, patch) => put(entry, parts.map((p, j) => (j === i ? { ...p, ...patch } : p)));
          const addPart = () => {
            const [a, b] = splitLabel(first.label);
            put(entry, [{ ...first, label: a }, ...parts.slice(1), { label: b, to: '' }]);
          };

          return (
            <li key={entry.k} className="discuss-link-review-row">
              <p className="discuss-link-review-label">
                <strong>{entry.label}</strong>
                <span className="discuss-link-review-event">{entry.eventId}</span>
              </p>

              {!parts && (
                <Picker
                  label={entry.label}
                  suggestions={suggestions[entry.k] || []}
                  taken={[]}
                  onChoose={(to) => put(entry, [{ label: entry.label, to }])}
                  onNew={() => put(entry, [{ label: entry.label, to: '' }])}
                  onNone={() => put(entry, [{ label: entry.label, noPage: true }])}
                />
              )}

              {parts && !split && (
                <p className="discuss-link-review-done">
                  {first.noPage && 'Needs no page.'}
                  {!first.noPage && !first.to && 'A new page: it shows as an item waiting for one.'}
                  {!first.noPage && first.to && `Opens ${nameOf(first.to)}.`}
                  {first.to && (
                    <button type="button" className="discuss-link-review-undo" onClick={addPart}>
                      Link another page
                    </button>
                  )}
                  <button type="button" className="discuss-link-review-undo" onClick={() => reset(entry)}>
                    Change
                  </button>
                </p>
              )}

              {split && (
                <div className="discuss-link-review-parts">
                  <p className="discuss-link-review-ask">
                    Give each link a title. Try to adhere to the JPPT&apos;s verbiage as closely
                    as possible.
                  </p>
                  {parts.map((part, i) => (
                    <Part
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      part={part}
                      index={i}
                      matcher={matcher}
                      taken={taken}
                      onLabel={(v) => setPart(i, { label: v })}
                      onChoose={(to) => setPart(i, { to })}
                      onClear={() => setPart(i, { to: '' })}
                      onRemove={i > 0 ? () => put(entry, parts.filter((p, j) => j !== i)) : null}
                    />
                  ))}
                  <div className="discuss-link-review-actions">
                    <button type="button" className="discuss-link-review-opt" onClick={addPart}>
                      Link another page
                    </button>
                    <button type="button" className="discuss-link-review-opt" onClick={() => reset(entry)}>
                      Change
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default LinkReview;
