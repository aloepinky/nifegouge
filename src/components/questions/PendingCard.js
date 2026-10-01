import React, { useMemo, useState } from 'react';
import { answerChoices, markPendingSeen, voteOnPending } from './questionsApi';
import Explanation from './Explanation';
import EditDiff from './EditDiff';

// One pending question, for the community to decide on: a new submission, or a proposed edit
// to a question already in the quiz. The student answers it first, as they would any question,
// because that is how a wrong key or an unclear stem shows itself. Then the explanation (for a
// new question) or what the edit changes, and the vote. Used between quiz questions as a bonus
// item and, one after another, in the Review pending view.
//
// `onDone({ vote, result, error })` once the student votes or skips; the card has already
// recorded a skip or a vote the server took in this browser, so it will not be offered again
// here. A vote that failed is not recorded.

// No box of its own: it sits on the yellow the whole review section already has.
const bannerStyle = {
  marginBottom: '10px',
  color: '#6b5200',
  textAlign: 'center',
  fontWeight: 'bold',
};

export default function PendingCard({ item, original, badge, onDone }) {
  const isEdit = item.type === 'edit';
  const choices = useMemo(() => answerChoices(item), [item]);
  const [selected, setSelected] = useState('');
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);

  const vote = async (what) => {
    if (busy) return;
    setBusy(true);
    if (what === 'skip') {
      markPendingSeen(item.questionId, what);
      onDone({ vote: what });
      return;
    }
    try {
      const result = await voteOnPending(item.questionId, what);
      // Seen only once the server has the vote (or already had it), so one that failed to
      // reach it is offered again.
      markPendingSeen(item.questionId, what);
      onDone({ vote: what, result });
    } catch (error) {
      onDone({ vote: what, error });
      setBusy(false);
    }
  };

  const up = isEdit ? 'better' : 'approve';
  const down = isEdit ? 'worse' : 'reject';

  return (
    <>
      <div className="qa-container">
        <div style={bannerStyle}>
          {isEdit
            ? 'Community review: Proposed edit. Answer it and decide if it is better than the current version.'
            : 'Community review: New question. Answer and decide if it should stay.'}
          <div style={{ fontSize: '0.9em', marginTop: '5px', fontWeight: 'normal' }}>
            {item.approveCount || 0} for, {item.rejectCount || 0} against.
          </div>
        </div>

        {badge && <span className="q-badge">{badge}</span>}
        <div className="qa-box question-area">{item.question}</div>

        <div className="qa-box">
          <div className="radio-list">
            {choices.map((choice, idx) => (
              <label
                key={idx}
                className={
                  answered && choice === item.correctAnswer ? 'correct'
                    : answered && selected === choice ? 'wrong'
                      : !answered && selected === choice ? 'selected' : ''
                }
                onClick={() => !answered && setSelected(choice)}
              >
                <input type="radio" name="pending-answer" value={choice} checked={selected === choice} onChange={() => {}} disabled={answered} />
                {choice}
              </label>
            ))}
          </div>

          {answered && !isEdit && <Explanation text={item.explanation} />}
          {answered && isEdit && <EditDiff original={original} edit={item} />}

          {!answered && (
            <button className="submitBtn" onClick={() => setAnswered(true)}>Submit</button>
          )}
        </div>
      </div>

      {answered && (
        <div className="feedback-row">
          <button className="thumb-btn up" onClick={() => vote(up)} disabled={busy} title={isEdit ? 'Better than the current version' : 'Add'}>
            <img src="/images/thumb.png" alt="" />
            <span style={{ display: 'block', fontSize: '12px', marginTop: '5px', color: 'white' }}>{isEdit ? 'Better' : 'Approve'}</span>
          </button>
          <button className="thumb-btn down" onClick={() => vote(down)} disabled={busy} title={isEdit ? 'Worse than the current version' : 'Keep out'}>
            <img src="/images/thumb-down.png" alt="" />
            <span style={{ display: 'block', fontSize: '12px', marginTop: '5px', color: 'white' }}>{isEdit ? 'Worse' : 'Reject'}</span>
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <button
          onClick={() => vote('skip')}
          disabled={busy}
          style={{ padding: '6px 16px', backgroundColor: 'transparent', color: '#666', border: '1px solid #999', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Skip
        </button>
      </div>
    </>
  );
}
