import React, { useState } from 'react';

// Anyone can call a document or link outdated, either still useful or obsolete. A still-useful
// vote cancels an obsolete one, and the server stops listing an entry once the obsolete votes
// lead by REMOVE_AT (lambda/submitDoc/index.mjs holds the same number). The row itself is kept.
export const REMOVE_AT = 3;

// One or two outdated votes of either kind say Potentially Outdated; this many say Outdated.
export const CONFIRMED_AT = 3;

// Potentially Outdated lasts this long after the last outdated vote; nobody voting again in that
// time is taken as the question having gone away. Outdated does not expire.
export const OUTDATED_FOR_DAYS = 45;
const DAY = 24 * 60 * 60 * 1000;

export const isConfirmedOutdated = (item) =>
  Math.max(0, item.outdatedUseful || 0) + Math.max(0, item.outdatedObsolete || 0) >= CONFIRMED_AT;

export const isOutdated = (item) => {
  if (!(item.outdatedUseful > 0 || item.outdatedObsolete > 0)) return false;
  if (isConfirmedOutdated(item)) return true;
  return !!item.outdatedAt
    && Date.now() - new Date(item.outdatedAt).getTime() < OUTDATED_FOR_DAYS * DAY;
};

const readVotes = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
};

// One outdated vote per entry per browser, remembered like the thumbs are. `setItems` is the
// page's setter for the list the entry lives in; a vote updates the entry's counts in place and
// drops it from the list when the server says it is now removed.
export function useOutdatedVotes({ apiBase, endpoint, idField, storageKey, setItems }) {
  const [votes, setVotes] = useState(() => readVotes(storageKey));

  const cast = async (id, choice, note) => {
    const previous = votes[id] || null;
    const next = previous === choice ? null : choice;

    const response = await fetch(`${apiBase}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [idField]: id, voteType: 'outdated', choice: next, previous, note }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Vote failed');

    const saved = { ...votes };
    if (next) saved[id] = next;
    else delete saved[id];
    setVotes(saved);
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // The vote is recorded; only this browser's memory of it is lost.
    }

    setItems(items => data.removed
      ? items.filter(item => item[idField] !== id)
      : items.map(item => item[idField] === id
        ? {
          ...item,
          outdatedUseful: data.outdatedUseful,
          outdatedObsolete: data.outdatedObsolete,
          outdatedNote: data.outdatedNote,
          outdatedAt: data.outdatedAt,
        }
        : item));
    return data.removed;
  };

  return { votes, cast };
}

export function OutdatedBadge({ item }) {
  if (!isOutdated(item)) return null;
  const confirmed = isConfirmedOutdated(item);
  return (
    <span
      className={`outdated-badge${confirmed ? ' confirmed' : ''}`}
      title={item.outdatedNote || undefined}
    >
      {confirmed ? 'Outdated' : 'Potentially Outdated'}
    </span>
  );
}

// Sits under an entry's meta row: the reason and the counts when there are any, and the
// control for voting. Clicks stop here so a document row does not open its preview.
export function OutdatedControl({ item, vote, onVote }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const useful = Math.max(0, item.outdatedUseful || 0);
  const obsolete = Math.max(0, item.outdatedObsolete || 0);

  const choose = async (choice) => {
    setBusy(true);
    setMessage('');
    try {
      const removed = await onVote(choice, note);
      if (!removed) {
        setNote('');
        setOpen(false);
      }
    } catch {
      setMessage('That vote did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="outdated" onClick={(e) => e.stopPropagation()}>
      {isOutdated(item) && (
        <div className="outdated-summary">
          {item.outdatedNote && <span className="outdated-note">{item.outdatedNote}</span>}
          <span className="outdated-counts">
            {useful} still useful, {obsolete} obsolete
          </span>
        </div>
      )}

      {!open ? (
        <button type="button" className="outdated-toggle" onClick={() => setOpen(true)}>
          {vote ? `You voted: outdated, ${vote === 'useful' ? 'still useful' : 'obsolete'}` : 'Outdated?'}
        </button>
      ) : (
        <div className="outdated-panel">
          <input
            type="text"
            className="outdated-reason"
            placeholder="What changed? (optional)"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="outdated-choices">
            <button
              type="button"
              className={`outdated-choice ${vote === 'useful' ? 'selected' : ''}`}
              disabled={busy}
              onClick={() => choose('useful')}
            >
              {vote === 'useful' ? 'Take back: still useful' : 'Outdated, still useful'}
            </button>
            <button
              type="button"
              className={`outdated-choice ${vote === 'obsolete' ? 'selected' : ''}`}
              disabled={busy}
              onClick={() => choose('obsolete')}
            >
              {vote === 'obsolete' ? 'Take back: obsolete' : 'Obsolete, remove it'}
            </button>
            <button type="button" className="outdated-cancel" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          <div className="outdated-hint">
            Removed when obsolete is {REMOVE_AT} more than useful.
          </div>
          {message && <div className="outdated-message">{message}</div>}
        </div>
      )}
    </div>
  );
}
