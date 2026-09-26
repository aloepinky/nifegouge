import React, { useState } from 'react';
import { activeSections, sectionName } from './sections';
import PendingCard from './PendingCard';

// Review pending: the questions and edits waiting on the community, one at a time, oldest
// first, for anyone who would rather clear the queue than wait for them to turn up in a quiz.
// Every topic unless one is picked. What this browser has voted on or skipped is not shown.

export default function PendingQueue({ pending, sections, threshold, seen, questions, onVoted, onExit }) {
  const [topic, setTopic] = useState('all');
  const waiting = pending.filter((q) => !seen[q.questionId] && (topic === 'all' || (q.topic || '').toLowerCase() === topic));
  const item = waiting[0];
  const original = item && item.type === 'edit' ? questions.find((q) => q.questionId === item.originalQuestionId) : null;
  const name = (id) => sectionName(sections, id);

  return (
    <div className="questions-container pending-question-mode">
      <button
        className="review-mode-toggle"
        onClick={onExit}
        style={{ marginBottom: '15px', padding: '10px 20px', backgroundColor: '#01202C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%' }}
      >
        Back to the Quiz
      </button>

      <div className="dropdown-row" style={{ alignItems: 'center' }}>
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">All Topics</option>
          {activeSections(sections).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span style={{ fontSize: '15px', color: '#003B4F' }}>
          {waiting.length === 0 ? 'Nothing waiting' : `${waiting.length} waiting for review`}
        </span>
      </div>

      {item ? (
        <PendingCard
          key={item.questionId}
          item={item}
          original={original}
          threshold={threshold}
          badge={name((item.topic || '').toLowerCase())}
          onDone={onVoted}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: '#003B4F' }}>
          {topic === 'all'
            ? 'You have been through everything waiting for review. Thank you.'
            : `Nothing waiting for review in ${name(topic)}.`}
        </div>
      )}
    </div>
  );
}
