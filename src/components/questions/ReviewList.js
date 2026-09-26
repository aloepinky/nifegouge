import React, { useMemo, useState } from 'react';
import { TOPICS, answerChoices, inFilter, lecturesIn, netScore } from './questionsApi';
import Explanation from './Explanation';
import QuestionHistory from './QuestionHistory';

// Review Mode: every question in a topic (and lecture) as a list, each opened to try it.

const selectStyle = { padding: '10px 15px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ccc' };

function byLectureThenScore(a, b) {
  const la = parseInt(a.lecture, 10) || 0;
  const lb = parseInt(b.lecture, 10) || 0;
  if (la !== lb) return la - lb;
  return netScore(b) - netScore(a);
}

export default function ReviewList({ questions, topic, lecture, onTopicChange, onLectureChange, onExit, onEdit }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [chosen, setChosen] = useState({});
  const [historyOf, setHistoryOf] = useState(null);

  const lectures = useMemo(() => lecturesIn(questions, topic), [questions, topic]);
  const listed = useMemo(() => questions
    .filter(inFilter(topic, lecture))
    .map((q) => ({ ...q, choices: answerChoices(q) }))
    .sort(byLectureThenScore), [questions, topic, lecture]);

  const toggle = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="questions-container review-mode-container">
      <div className="review-mode-header">
        <button
          className="review-mode-toggle"
          onClick={onExit}
          style={{ marginBottom: '15px', padding: '10px 20px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%' }}
        >
          Enter Test Mode
        </button>

        <div className="review-mode-controls" style={{ marginBottom: '20px' }}>
          <select value={topic} onChange={(e) => onTopicChange(e.target.value)} style={selectStyle}>
            {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={lecture} onChange={(e) => onLectureChange(e.target.value)} style={{ ...selectStyle, marginLeft: '10px' }}>
            <option value="All">All Lectures</option>
            {lectures.map((l) => <option key={l} value={l}>Lecture {l}</option>)}
          </select>
          <span style={{ marginLeft: '20px', fontSize: '16px', color: '#666' }}>
            {listed.length} questions available
          </span>
        </div>
      </div>

      <div className="review-questions-list" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '10px' }}>
        {listed.map((q, idx) => {
          const open = expanded.has(q.questionId);
          const score = netScore(q);
          return (
            <div
              key={q.questionId}
              className="review-question-item"
              style={{ marginBottom: '20px', border: '2px solid #ddd', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s ease' }}
            >
              <div
                className="review-question-header"
                onClick={() => toggle(q.questionId)}
                style={{
                  padding: '15px',
                  backgroundColor: open ? '#f0f0f0' : '#f9f9f9',
                  cursor: 'pointer',
                  borderBottom: open ? '1px solid #ddd' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 'bold', marginRight: '10px', color: '#01202C' }}>
                    Q{idx + 1}
                    {q.lecture && ` (Lecture ${q.lecture})`}
                  </span>
                  <div style={{ marginTop: '8px', fontSize: '16px', lineHeight: '1.5' }}>{q.question}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '15px' }}>
                  <span style={{ fontSize: '20px', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>▼</span>
                  {q.upvotes !== undefined && (
                    <span style={{ marginTop: '5px', fontSize: '12px', color: score >= 0 ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}>
                      {score >= 0 ? '+' : ''}{score}
                    </span>
                  )}
                </div>
              </div>

              {open && (
                <div className="review-answers" style={{ padding: '15px', backgroundColor: '#fff' }}>
                  {q.choices.map((answer, i) => {
                    const picked = chosen[q.questionId] === answer;
                    const right = answer === q.correctAnswer;
                    const tone = picked ? (right ? 'right' : 'wrong') : 'none';
                    return (
                      <div
                        key={i}
                        onClick={() => setChosen((prev) => ({ ...prev, [q.questionId]: answer }))}
                        style={{
                          padding: '10px 15px',
                          margin: '8px 0',
                          border: '2px solid',
                          borderColor: tone === 'right' ? '#4CAF50' : tone === 'wrong' ? '#f44336' : '#ddd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: tone === 'right' ? '#e8f5e9' : tone === 'wrong' ? '#ffebee' : 'white',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '10px', fontWeight: 'bold', color: tone === 'right' ? '#4CAF50' : tone === 'wrong' ? '#f44336' : '#666' }}>
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span style={{ flex: 1, color: tone === 'wrong' ? '#999' : '#333' }}>{answer}</span>
                          {tone === 'right' && <span style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: '10px' }}>✓</span>}
                          {tone === 'wrong' && <span style={{ color: '#f44336', fontWeight: 'bold', marginLeft: '10px' }}>✗</span>}
                        </div>
                      </div>
                    );
                  })}

                  {chosen[q.questionId] && <Explanation text={q.explanation} style={{ maxWidth: 'none' }} />}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onEdit(q)}
                      style={{ marginTop: '12px', padding: '8px 18px', backgroundColor: '#01202C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                    >
                      Edit Question
                    </button>
                    {(q.rev || 1) > 1 && (
                      <button
                        onClick={() => setHistoryOf(historyOf === q.questionId ? null : q.questionId)}
                        style={{ marginTop: '12px', padding: '8px 18px', backgroundColor: 'white', color: '#01202C', border: '1px solid #01202C', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                      >
                        History
                      </button>
                    )}
                  </div>
                  {historyOf === q.questionId && <QuestionHistory questionId={q.questionId} onClose={() => setHistoryOf(null)} />}
                </div>
              )}
            </div>
          );
        })}

        {listed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>No questions available for this topic</div>
        )}
      </div>
    </div>
  );
}
