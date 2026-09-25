import React, { useEffect, useRef, useState } from 'react';
import { TOPICS, sendQuestion } from './questionsApi';

const ANSWER_FIELDS = [
  ['correctAnswer', 'Correct Answer'],
  ['incorrectAnswer1', 'Incorrect Answer 1'],
  ['incorrectAnswer2', 'Incorrect Answer 2'],
  ['incorrectAnswer3', 'Incorrect Answer 3'],
];

function initialData(mode, question, defaultTopic) {
  if (mode === 'edit' && question) {
    return {
      topic: (question.topic || defaultTopic).toLowerCase(),
      lecture: question.lecture || '',
      question: question.question || '',
      correctAnswer: question.correctAnswer || '',
      incorrectAnswer1: question.incorrectAnswer1 || '',
      incorrectAnswer2: question.incorrectAnswer2 || '',
      incorrectAnswer3: question.incorrectAnswer3 || '',
    };
  }
  return {
    topic: defaultTopic,
    lecture: '',
    question: '',
    correctAnswer: '',
    incorrectAnswer1: '',
    incorrectAnswer2: '',
    incorrectAnswer3: '',
  };
}

// The same checks the server makes, so the common mistakes are caught before sending.
function problemWith(data) {
  if (!data.question.trim() || !data.correctAnswer.trim()) return 'Write the question and its correct answer.';
  const answers = ANSWER_FIELDS.map(([field]) => data[field].trim().toLowerCase()).filter(Boolean);
  if (answers.length < 2) return 'Add at least one incorrect answer.';
  if (new Set(answers).size !== answers.length) return 'Two of the answers are the same.';
  return '';
}

const grow = (el) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

// The submit / edit modal. `onDone(message)` is called once the server has the question;
// the modal then closes itself through `onClose`.
export default function QuestionForm({ mode, question, defaultTopic, onClose, onDone }) {
  const [data, setData] = useState(() => initialData(mode, question, defaultTopic));
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (box.current) box.current.querySelectorAll('textarea').forEach(grow);
  }, []);

  const set = (field) => (e) => {
    grow(e.target);
    setData((d) => ({ ...d, [field]: e.target.value }));
  };

  const submit = async () => {
    const problem = problemWith(data);
    if (problem) {
      setError(problem);
      return;
    }
    setSending(true);
    setError('');
    try {
      const payload = { ...data, type: mode === 'edit' ? 'edit' : 'new' };
      if (mode === 'edit') payload.originalQuestionId = question.questionId;
      await sendQuestion(mode === 'edit' ? 'edit-question' : 'submit-question', payload);
      onDone(mode === 'edit' ? 'Edit submitted for review.' : 'Question submitted for review.');
      onClose();
    } catch (err) {
      if (err.status === 409) {
        onDone(err.message, 'error');
        onClose();
      } else {
        setError(err.message);
        setSending(false);
      }
    }
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="modal-content" ref={box}>
        <span className="close-button" onClick={onClose}>&times;</span>
        <h2>{mode === 'edit' ? 'Edit Question' : 'Submit a New Question'}</h2>

        <div className="dropdown-row">
          <select value={data.topic} onChange={(e) => setData((d) => ({ ...d, topic: e.target.value }))}>
            {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="Enter Lecture Number (optional)"
            value={data.lecture}
            onChange={(e) => setData((d) => ({ ...d, lecture: e.target.value }))}
          />
        </div>

        <div className="qa-box question-area">
          <label>
            <textarea placeholder="Enter your question here..." value={data.question} onChange={set('question')} />
          </label>
        </div>

        <div className="qa-box">
          <div className="radio-list">
            {ANSWER_FIELDS.map(([field, label]) => (
              <label key={field}>
                <textarea placeholder={label} value={data[field]} onChange={set(field)} />
              </label>
            ))}
          </div>
        </div>

        {error && <div style={{ color: '#c62828', fontSize: '14px', margin: '8px 0' }}>{error}</div>}

        <button className="submitBtn" onClick={submit} disabled={sending}>
          {sending ? 'Sending…' : mode === 'edit' ? 'Submit Edit' : 'Submit Question'}
        </button>
      </div>
    </div>
  );
}
