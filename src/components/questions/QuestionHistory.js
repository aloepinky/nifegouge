import React, { useEffect, useState } from 'react';
import { questionHistory } from './questionsApi';
import Confirm, { smallButton } from './Confirm';

// Earlier versions of one question, newest first, each with the score it had when an edit
// replaced it. Fetched when opened; most questions have none. `onRestore(rev)`, passed only by
// the admin panel, puts a Restore button on each version.
export default function QuestionHistory({ questionId, onClose, onRestore }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let live = true;
    questionHistory(questionId)
      .then((r) => { if (live) setState({ history: [...r.history].reverse() }); })
      .catch((err) => { if (live) setState({ error: err.message }); });
    return () => { live = false; };
  }, [questionId]);

  return (
    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--surface-f7fafb)', border: '1px solid var(--line-dde7ea)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: 'var(--ink-strong)', fontSize: '14px' }}>Earlier versions</strong>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-accent)', cursor: 'pointer', fontSize: '13px' }}>
          Hide
        </button>
      </div>
      {state.loading && <div style={{ fontSize: '13px', color: 'var(--ink-666666)' }}>Loading…</div>}
      {state.error && <div style={{ fontSize: '13px', color: 'var(--bad-text-c62828)' }}>{state.error}</div>}
      {state.history && state.history.length === 0 && (
        <div style={{ fontSize: '13px', color: 'var(--ink-666666)' }}>This question has not been edited since it was approved.</div>
      )}
      {state.history && state.history.map((h) => {
        const score = h.upvotes - h.downvotes;
        return (
          <div key={`${h.rev}-${h.until}`} style={{ padding: '8px 0', borderTop: '1px solid var(--line-e3eaec)', fontSize: '13px', color: 'var(--ink)' }}>
            <div style={{ color: 'var(--ink-666666)', marginBottom: '3px' }}>
              Version {h.rev}, replaced {h.until ? new Date(h.until).toLocaleDateString() : ''} with a score of {score >= 0 ? '+' : ''}{score}
            </div>
            <div>{h.question}</div>
            <div style={{ color: 'var(--ok-text-2e7d32)' }}>✓ {h.correctAnswer}</div>
            {h.explanation && <div style={{ fontStyle: 'italic', color: 'var(--ink-555555)', whiteSpace: 'pre-wrap' }}>{h.explanation}</div>}
            {onRestore && (
              <div style={{ marginTop: '6px' }}>
                <Confirm
                  label="Restore this version"
                  question="Make this the current version? The current one moves into history."
                  confirmLabel="Restore"
                  onConfirm={() => onRestore(h.rev)}
                  style={smallButton('var(--btn)')}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
