import React, { useCallback, useEffect, useState } from 'react';
import { getAdminToken, loadPending, moderate, setAdminToken } from './questionsApi';

// The pending queue for whoever holds the admin token: approve or reject directly, without
// waiting on the community vote. The token is typed once and kept in this browser; the server
// refuses both buttons without it.

export default function AdminPanel({ questions, onExit, onApproved }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(getAdminToken);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPending((await loadPending()).questions);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveToken = () => {
    const value = draft.trim();
    if (!value) return;
    setAdminToken(value);
    setToken(value);
    setDraft('');
    setError('');
  };

  const act = async (questionId, action) => {
    setError('');
    try {
      await moderate(token, questionId, action);
      await refresh();
      if (action === 'approve') onApproved();
    } catch (err) {
      if (err.status === 401) {
        setAdminToken('');
        setToken('');
        setError('That admin token was not accepted.');
      } else {
        setError(err.message);
        await refresh();
      }
    }
  };

  // Pending items grouped by the question they edit; a new submission is its own group.
  const groups = {};
  pending.forEach((q) => {
    const key = q.originalQuestionId || q.questionId;
    if (!groups[key]) groups[key] = { originalId: q.originalQuestionId || null, edits: [] };
    groups[key].edits.push(q);
  });
  const net = (q) => (q.approveCount || 0) - (q.rejectCount || 0);
  Object.values(groups).forEach((g) => g.edits.sort((a, b) => net(b) - net(a)));
  const groupList = Object.entries(groups).sort((a, b) => b[1].edits.length - a[1].edits.length);

  return (
    <div className="questions-container review-mode-container">
      <button
        className="review-mode-toggle"
        onClick={onExit}
        style={{ marginBottom: '15px', padding: '10px 20px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%', backgroundColor: '#5a0000' }}
      >
        Exit Admin Panel
      </button>

      <h3 style={{ marginBottom: '10px', color: '#333' }}>
        Admin Panel — {loading ? 'Loading...' : `${pending.length} pending questions`}
      </h3>

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
          <span>Approve and Reject need the admin token. It is kept in this browser.</span>
        </div>
      )}
      {error && <div style={{ marginBottom: '12px', color: '#c62828', fontSize: '14px' }}>{error}</div>}

      <div style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: '8px' }}>
        {groupList.map(([groupKey, group]) => {
          const original = questions.find((q) => q.questionId === groupKey);
          return (
            <div key={groupKey} style={{ marginBottom: '28px', border: '2px solid #ccc', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 15px', backgroundColor: '#f0f4f8', borderBottom: '1px solid #ccc' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  {group.edits.length} competing edit{group.edits.length !== 1 ? 's' : ''} •{' '}
                  {group.originalId ? `Editing original ${group.originalId}` : 'New question submission'}
                </div>
                <div style={{ fontWeight: 'bold', color: '#01202C', fontSize: '14px' }}>
                  {original
                    ? `ORIGINAL: ${original.question}`
                    : group.edits[0] && group.edits[0].type === 'new' ? 'NEW QUESTION' : '(original no longer approved — may be replaced)'}
                </div>
                {original && (
                  <div style={{ fontSize: '13px', color: '#333', marginTop: '4px' }}>✓ Correct: {original.correctAnswer}</div>
                )}
              </div>

              {group.edits.map((q) => {
                const score = net(q);
                return (
                  <div key={q.questionId} style={{ padding: '12px 15px', borderBottom: '1px solid #eee', backgroundColor: score >= 2 ? '#f0fff4' : score <= -2 ? '#fff0f0' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', color: '#222', marginBottom: '6px' }}>{q.question}</div>
                        <div style={{ fontSize: '13px', color: '#2e7d32', marginBottom: '3px' }}>✓ {q.correctAnswer}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {new Date(q.submittedAt).toLocaleDateString()} •{' '}
                          <span style={{ color: score > 0 ? '#2e7d32' : score < 0 ? '#c62828' : '#666', fontWeight: 'bold' }}>
                            {score > 0 ? '+' : ''}{score} net ({q.approveCount || 0}✓ / {q.rejectCount || 0}✗)
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '80px' }}>
                        <button
                          onClick={() => act(q.questionId, 'approve')}
                          style={{ padding: '6px 12px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => act(q.questionId, 'reject')}
                          style={{ padding: '6px 12px', backgroundColor: '#c62828', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {!loading && pending.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>No pending questions — queue is clear!</div>
        )}
      </div>
    </div>
  );
}
