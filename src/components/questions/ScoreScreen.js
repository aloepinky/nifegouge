import React from 'react';
import { TOPICS } from './questionsApi';

// The end of a quiz: the score, and every question with the answer given and, where it was
// wrong, the right one.
export default function ScoreScreen({ attempts, topic, onReset }) {
  const correct = attempts.filter((a) => a.chosen === a.correct).length;
  const name = (TOPICS.find((t) => t.id === topic) || { name: topic }).name;

  return (
    <div className="page-container">
      <div className="review-screen">
        <h2>{name} Review</h2>
        <div style={{ marginBottom: '16px', fontWeight: '600' }}>
          Score: {correct} / {attempts.length}
        </div>

        {attempts.map((a, idx) => (
          <div key={idx} className="review-item">
            <div className="review-q">Q{idx + 1}. {a.question}</div>
            <div className={`review-a ${a.chosen !== a.correct ? 'wrong' : ''}`}>
              Your answer: {a.chosen || '(no selection)'}
            </div>
            {a.chosen !== a.correct && <div className="review-correct">Correct: {a.correct}</div>}
          </div>
        ))}

        <button className="review-reset" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
}
