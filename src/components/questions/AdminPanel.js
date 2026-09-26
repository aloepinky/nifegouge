import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminQuestions, bulkModerate, getAdminToken, loadPending, moderate, netScore,
  restoreVersion, setAdminToken, setQuestionStatus,
} from './questionsApi';
import Confirm, { smallButton } from './Confirm';
import EditDiff from './EditDiff';
import Explanation from './Explanation';
import QuestionHistory from './QuestionHistory';
import { sectionName } from './sections';

// The admin panel, for whoever holds the admin token. Three tabs:
//
//   Pending   decide what the community has not, one at a time or in bulk
//   Live      find a question in the quiz; hide it, or restore an earlier version
//   Removed   what is hidden or was rejected, each with the way back
//
// Nothing here deletes. Hide is undone from Removed, a rejection is sent back for another
// vote, a restored version is undone by restoring the one it replaced. The token is typed once
// and kept in this browser; the server refuses every button without it.

const LIVE_LIMIT = 50;

const tabStyle = (active) => ({
  padding: '8px 16px',
  border: 'none',
  borderBottom: active ? '3px solid #01202C' : '3px solid transparent',
  background: 'none',
  color: active ? '#01202C' : '#667',
  fontWeight: 'bold',
  fontSize: '14px',
  cursor: 'pointer',
});

const card = { padding: '12px 15px', border: '1px solid #d5dde0', borderRadius: '8px', marginBottom: '12px', background: 'white' };
const meta = { fontSize: '12px', color: '#777' };

function Answers({ q }) {
  return (
    <div style={{ fontSize: '13px', marginTop: '4px' }}>
      <div style={{ color: '#2e7d32' }}>✓ {q.correctAnswer}</div>
      {['incorrectAnswer1', 'incorrectAnswer2', 'incorrectAnswer3'].filter((k) => q[k]).map((k) => (
        <div key={k} style={{ color: '#666' }}>✗ {q[k]}</div>
      ))}
    </div>
  );
}

export default function AdminPanel({ questions, sections, onExit, onChanged }) {
  const [tab, setTab] = useState('pending');
  const [token, setToken] = useState(getAdminToken);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const saveToken = () => {
    const value = draft.trim();
    if (!value) return;
    setAdminToken(value);
    setToken(value);
    setDraft('');
    setError('');
  };

  // Every admin call goes through here: a refused token is forgotten and asked for again.
  const run = useCallback(async (fn, message) => {
    setError('');
    setDone('');
    try {
      const out = await fn(token);
      if (message) setDone(typeof message === 'function' ? message(out) : message);
      onChanged();
      return out;
    } catch (err) {
      if (err.status === 401) {
        setAdminToken('');
        setToken('');
        setError('That admin token was not accepted.');
      } else {
        setError(err.message);
      }
      return null;
    }
  }, [token, onChanged]);

  return (
    <div className="questions-container review-mode-container">
      <button
        className="review-mode-toggle"
        onClick={onExit}
        style={{ marginBottom: '15px', padding: '10px 20px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%', backgroundColor: '#5a0000' }}
      >
        Exit Admin Panel
      </button>

      {!token && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', color: '#555', fontSize: '13px' }}>
          <input
            type="password"
            placeholder="Admin token"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveToken()}
          />
          <button onClick={saveToken}>Save</button>
          <span>Every button here needs the admin token. It is kept in this browser.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #ddd', marginBottom: '12px' }}>
        <button style={tabStyle(tab === 'pending')} onClick={() => setTab('pending')}>Pending</button>
        <button style={tabStyle(tab === 'live')} onClick={() => setTab('live')}>Live</button>
        <button style={tabStyle(tab === 'removed')} onClick={() => setTab('removed')}>Removed</button>
      </div>

      {error && <div style={{ marginBottom: '12px', color: '#c62828', fontSize: '14px' }}>{error}</div>}
      {done && <div style={{ marginBottom: '12px', color: '#003B4F', fontSize: '14px' }}>{done}</div>}

      <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: '8px' }}>
        {tab === 'pending' && <PendingTab questions={questions} sections={sections} run={run} />}
        {tab === 'live' && <LiveTab questions={questions} sections={sections} run={run} />}
        {tab === 'removed' && <RemovedTab token={token} sections={sections} run={run} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------

function PendingTab({ questions, sections, run }) {
  const [pending, setPending] = useState(null);
  const [picked, setPicked] = useState(() => new Set());

  const refresh = useCallback(async () => {
    const data = await loadPending();
    setPending(data.questions);
    setPicked(new Set());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const decide = async (fn, message) => {
    await run(fn, message);
    await refresh();
  };

  if (!pending) return <div style={meta}>Loading…</div>;
  if (pending.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No pending questions. The queue is clear.</div>;

  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const ids = [...picked];

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
        <span>{pending.length} pending, oldest first.</span>
        <button style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={() => setPicked(picked.size === pending.length ? new Set() : new Set(pending.map((q) => q.questionId)))}>
          {picked.size === pending.length ? 'Select none' : 'Select all'}
        </button>
        {ids.length > 0 && (
          <>
            <Confirm
              label={`Reject ${ids.length} selected`}
              question={`Reject ${ids.length}?`}
              confirmLabel="Reject"
              style={smallButton('#c62828')}
              onConfirm={() => decide((t) => bulkModerate(t, ids, 'reject'), (out) => `Rejected ${out.done.length}${out.skipped.length ? `, skipped ${out.skipped.length} already decided` : ''}.`)}
            />
            <Confirm
              label={`Approve ${ids.length} selected`}
              question={`Approve ${ids.length}?`}
              confirmLabel="Approve"
              style={smallButton('#2e7d32')}
              onConfirm={() => decide((t) => bulkModerate(t, ids, 'approve'), (out) => `Approved ${out.done.length}${out.skipped.length ? `, skipped ${out.skipped.length} already decided` : ''}.`)}
            />
          </>
        )}
      </div>

      {pending.map((q) => {
        const net = (q.approveCount || 0) - (q.rejectCount || 0);
        const original = q.type === 'edit' ? questions.find((o) => o.questionId === q.originalQuestionId) : null;
        return (
          <div key={q.questionId} style={card}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input type="checkbox" checked={picked.has(q.questionId)} onChange={() => toggle(q.questionId)} style={{ marginTop: '4px', width: '18px', minWidth: '18px', flex: '0 0 18px', padding: 0 }} aria-label="Select" />
              <div style={{ flex: 1 }}>
                <div style={meta}>
                  {q.type === 'edit' ? 'Proposed edit' : 'New question'} • {sectionName(sections, q.topic)}{q.lecture ? ` L${q.lecture}` : ''} •{' '}
                  {new Date(q.submittedAt).toLocaleDateString()} •{' '}
                  <span style={{ fontWeight: 'bold', color: net > 0 ? '#2e7d32' : net < 0 ? '#c62828' : '#666' }}>
                    {net > 0 ? '+' : ''}{net} ({q.approveCount || 0} for / {q.rejectCount || 0} against)
                  </span>
                </div>
                {q.type === 'edit' && original ? (
                  <EditDiff original={original} edit={q} />
                ) : (
                  <>
                    {q.type === 'edit' && (
                      <div style={{ ...meta, color: '#8a5a00', marginTop: '4px' }}>
                        The question this edits is no longer in the quiz. Approving it adds it as a question of its own.
                      </div>
                    )}
                    <div style={{ fontSize: '14px', color: '#222', marginTop: '6px' }}>{q.question}</div>
                    <Answers q={q} />
                    <Explanation text={q.explanation} style={{ maxWidth: 'none' }} />
                  </>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '80px' }}>
                <button style={smallButton('#2e7d32')} onClick={() => decide((t) => moderate(t, q.questionId, 'approve'), 'Approved.')}>Approve</button>
                <button style={smallButton('#c62828')} onClick={() => decide((t) => moderate(t, q.questionId, 'reject'), 'Rejected. It can be sent back for review from Removed.')}>Reject</button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------

function LiveTab({ questions, sections, run }) {
  const [search, setSearch] = useState('');
  const [historyOf, setHistoryOf] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const found = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return questions.filter((q) => (
      q.questionId.toLowerCase() === term
      || [q.question, q.correctAnswer, q.incorrectAnswer1, q.incorrectAnswer2, q.incorrectAnswer3]
        .some((t) => (t || '').toLowerCase().includes(term))
    ));
  }, [questions, search]);

  return (
    <>
      <input
        type="search"
        placeholder="Search the quiz by words or question id"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '15px', marginBottom: '12px' }}
      />
      {!search.trim() && <div style={meta}>{questions.length} questions in the quiz. Search to find one.</div>}
      {search.trim() && found.length === 0 && <div style={meta}>Nothing in the quiz matches.</div>}
      {found.length > LIVE_LIMIT && <div style={{ ...meta, marginBottom: '8px' }}>Showing {LIVE_LIMIT} of {found.length}. Search for more words to narrow it.</div>}

      {found.slice(0, LIVE_LIMIT).map((q) => {
        const score = netScore(q);
        return (
          <div key={q.questionId} style={card}>
            <div style={meta}>
              {sectionName(sections, q.topic)}{q.lecture ? ` L${q.lecture}` : ''} • {q.questionId} •{' '}
              <span style={{ fontWeight: 'bold', color: score >= 0 ? '#2e7d32' : '#c62828' }}>{score >= 0 ? '+' : ''}{score}</span>
              {(q.rev || 1) > 1 && ` • version ${q.rev}`}
            </div>
            <div style={{ fontSize: '14px', color: '#222', marginTop: '6px' }}>{q.question}</div>
            <Answers q={q} />
            <Explanation text={q.explanation} style={{ maxWidth: 'none' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              <Confirm
                label="Hide from the quiz"
                question="Take this question out of the quiz? It can be put back from Removed."
                confirmLabel="Hide"
                style={smallButton('#5a0000')}
                onConfirm={() => run((t) => setQuestionStatus(t, q.questionId, 'hidden'), 'Hidden. It is listed under Removed.')}
              />
              {(q.rev || 1) > 1 && (
                <button style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={() => setHistoryOf(historyOf === q.questionId ? null : q.questionId)}>
                  History
                </button>
              )}
            </div>
            {historyOf === q.questionId && (
              <QuestionHistory
                key={historyKey}
                questionId={q.questionId}
                onClose={() => setHistoryOf(null)}
                onRestore={async (rev) => {
                  await run((t) => restoreVersion(t, q.questionId, rev), `Version ${rev} restored. The version it replaced is in History.`);
                  setHistoryKey((k) => k + 1);
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------

const REMOVED = [
  { status: 'hidden', label: 'Hidden', back: 'approved', action: 'Put back in the quiz', says: 'Put back in the quiz.' },
  { status: 'rejected', label: 'Rejected', back: 'pending', action: 'Send back for review', says: 'Sent back to pending with its votes cleared.' },
];

function RemovedTab({ token, sections, run }) {
  const [which, setWhich] = useState('hidden');
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState('');
  const kind = REMOVED.find((k) => k.status === which);

  const refresh = useCallback(async () => {
    if (!token) return;
    setRows(null);
    setFailed('');
    try {
      setRows((await adminQuestions(token, which)).questions);
    } catch (err) {
      setFailed(err.status === 401 ? 'That admin token was not accepted.' : err.message);
    }
  }, [token, which]);
  useEffect(() => { refresh(); }, [refresh]);

  if (!token) return <div style={meta}>Enter the admin token above to see removed questions.</div>;

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {REMOVED.map((k) => (
          <button key={k.status} style={smallButton(which === k.status ? '#01202C' : 'white', which === k.status ? 'white' : '#01202C', '1px solid #01202C')} onClick={() => setWhich(k.status)}>
            {k.label}
          </button>
        ))}
      </div>
      {failed && <div style={{ color: '#c62828', fontSize: '14px' }}>{failed}</div>}
      {!rows && !failed && <div style={meta}>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Nothing {kind.label.toLowerCase()}.</div>}
      {rows && rows.map((q) => (
        <div key={q.questionId} style={card}>
          <div style={meta}>
            {q.type === 'edit' ? 'Edit' : 'Question'} • {sectionName(sections, q.topic)}{q.lecture ? ` L${q.lecture}` : ''} • {q.questionId}
            {q.hiddenAt && ` • hidden ${new Date(q.hiddenAt).toLocaleDateString()}`}
            {!q.hiddenAt && q.moderatedAt && ` • ${new Date(q.moderatedAt).toLocaleDateString()} by ${q.moderatedBy === 'community-threshold' ? 'community vote' : q.moderatedBy || 'unknown'}`}
            {q.rejectedReason === 'superseded' && ' • another edit of the same question was approved'}
          </div>
          <div style={{ fontSize: '14px', color: '#222', marginTop: '6px' }}>{q.question}</div>
          <Answers q={q} />
          <div style={{ marginTop: '10px' }}>
            <Confirm
              label={kind.action}
              question={`${kind.action}?`}
              confirmLabel={kind.status === 'hidden' ? 'Put back' : 'Send back'}
              style={smallButton('#01202C')}
              onConfirm={async () => {
                await run((t) => setQuestionStatus(t, q.questionId, kind.back), kind.says);
                refresh();
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}
