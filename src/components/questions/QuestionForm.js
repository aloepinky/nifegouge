import React, { useEffect, useRef, useState } from 'react';
import { sendQuestion } from './questionsApi';
import { activeSections, formLectures } from './sections';

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
      explanation: question.explanation || '',
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
    explanation: '',
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
export default function QuestionForm({ mode, question, sections, defaultTopic, onClose, onDone }) {
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

  const topics = activeSections(sections);
  const section = sections.find((s) => s.id === data.topic);
  const lectures = formLectures(section);

  const submit = async () => {
    const problem = problemWith(data);
    if (problem) {
      setError(problem);
      return;
    }
    setSending(true);
    setError('');
    try {
      const lecture = section && !section.fallback && !lectures.some((l) => l.id === data.lecture) ? '' : data.lecture;
      const payload = { ...data, lecture, type: mode === 'edit' ? 'edit' : 'new' };
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
          <select aria-label="Topic" value={data.topic} onChange={(e) => setData((d) => ({ ...d, topic: e.target.value, lecture: '' }))}>
            {!topics.some((t) => t.id === data.topic) && <option value={data.topic} disabled>Choose a topic</option>}
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {section && section.fallback ? (
            <input
              type="text"
              placeholder="Enter Lecture Number (optional)"
              value={data.lecture}
              onChange={(e) => setData((d) => ({ ...d, lecture: e.target.value }))}
            />
          ) : lectures.length > 0 && (
            <select aria-label="Lecture" value={lectures.some((l) => l.id === data.lecture) ? data.lecture : ''} onChange={(e) => setData((d) => ({ ...d, lecture: e.target.value }))}>
              <option value="">No lecture</option>
              {lectures.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
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

        <div className="qa-box">
          <label style={{ display: 'block', fontSize: '14px', color: '#01202C', fontWeight: 600, marginBottom: '4px' }} htmlFor="question-why">
            Why is this the answer? <span style={{ fontWeight: 400, color: '#666' }}>(optional)</span>
          </label>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
            Students see this after they answer. Say where the answer comes from if you can.
          </div>
          <textarea
            id="question-why"
            placeholder="Explain the answer"
            value={data.explanation}
            onChange={set('explanation')}
            maxLength={1500}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={{ color: '#c62828', fontSize: '14px', margin: '8px 0' }}>{error}</div>}

        <button className="submitBtn" onClick={submit} disabled={sending}>
          {sending ? 'Sending…' : mode === 'edit' ? 'Submit Edit' : 'Submit Question'}
        </button>
      </div>
    </div>
  );
}
