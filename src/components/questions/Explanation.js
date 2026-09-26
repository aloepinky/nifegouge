import React from 'react';

// Why the answer is the answer, shown once a question has been answered. Nothing when a
// question has no explanation yet.
export default function Explanation({ text, style }) {
  if (!text) return null;
  return (
    <div className="explanation-text" style={{ marginTop: '16px', whiteSpace: 'pre-wrap', ...style }}>
      <strong className="explanation-heading">Explanation</strong>
      {text}
    </div>
  );
}
