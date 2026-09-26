import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DISPUTED_AT, answerChoices, inFilter, loadApproved, loadPending, netScore,
  pendingSeen, shuffle, voteOnQuestion,
} from './questions/questionsApi';
import { useNotice } from './questions/Notice';
import QuestionForm from './questions/QuestionForm';
import ReviewList from './questions/ReviewList';
import AdminPanel from './questions/AdminPanel';
import ScoreScreen from './questions/ScoreScreen';
import WeatherFigures from './questions/WeatherFigures';
import Explanation from './questions/Explanation';
import PendingCard from './questions/PendingCard';
import PendingQueue from './questions/PendingQueue';
import { activeSections, inUse, quizLectures, useSections } from './questions/sections';

// The NIFE Questions tab: the quiz, and the shell for Review Mode, Review pending, the admin
// panel and the submit/edit form, which live in ./questions/.
//
// A quiz is the N live questions drawn when it starts, and only those are numbered and scored.
// After every BONUS_EVERY of them, one question waiting on community review may be slipped in
// as a bonus: it is answered and voted on (or skipped), never counted, and never takes the
// place of a question that was drawn.

const BONUS_EVERY = 5;

function readStored(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

function Questions() {
  const [allQuestions, setAllQuestions] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [pending, setPending] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [seen, setSeen] = useState(pendingSeen);

  const [topic, setTopic] = useState('aero');
  const [lecture, setLecture] = useState('All');
  const [numQuestions, setNumQuestions] = useState('');

  // The quiz in progress
  const [quiz, setQuiz] = useState([]);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState('');
  const [answered, setAnswered] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [showScore, setShowScore] = useState(false);
  const [bonus, setBonus] = useState(null); // { item, then: 'advance' | 'resume' }

  const [view, setView] = useState('quiz'); // 'quiz' | 'review' | 'pending' | 'admin'
  const [votedQuestions, setVotedQuestions] = useState(() => readStored('votedQuestions'));
  const [isAdminEnabled, setIsAdminEnabled] = useState(false);
  const [form, setForm] = useState(null); // null | { mode: 'new' | 'edit', question }
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [notice, showNotice] = useNotice();

  const { sections, loaded: sectionsLoaded } = useSections();
  // The questions the section list has in use: a retired topic or lecture drops out of the
  // quiz, the review list and the review queue, and comes back if it is unretired.
  const usable = useMemo(() => allQuestions.filter(inUse(sections)), [allQuestions, sections]);
  const availableLectures = useMemo(() => quizLectures(sections, usable, topic), [sections, usable, topic]);
  const topicOptions = useMemo(() => activeSections(sections).filter((s) => (
    s.id === topic || usable.some((q) => (q.topic || '').toLowerCase() === s.id)
  )), [sections, usable, topic]);
  const unseen = useMemo(
    () => pending.filter((q) => !seen[q.questionId]).filter(inUse(sections)),
    [pending, seen, sections],
  );

  // The drawn question as it is now: votes change `allQuestions`, not the drawn copy.
  const drawn = quiz[index];
  const current = drawn && (allQuestions.find((q) => q.questionId === drawn.questionId) || drawn);

  const prepare = useCallback((q) => {
    setChoices(q ? answerChoices(q) : []);
    setSelected('');
    setAnswered(false);
  }, []);

  const startQuiz = useCallback((topicVal, lectureVal, n, questions) => {
    const pool = questions.filter(inFilter(topicVal, lectureVal));
    const count = !n || n > pool.length ? pool.length : n;
    const picked = shuffle(pool).slice(0, count);
    setQuiz(picked);
    setIndex(0);
    setAttempts([]);
    setShowScore(false);
    setBonus(null);
    prepare(picked[0]);
  }, [prepare]);

  const refreshPending = useCallback(async () => {
    try {
      const data = await loadPending();
      setPending(data.questions);
      setThreshold(data.threshold);
    } catch (err) {
      console.error('Error loading pending questions:', err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setAllQuestions(await loadApproved());
      setLoadState('ready');
    } catch (err) {
      console.error('Error loading questions:', err);
      setLoadState('error');
    }
  }, []);

  // The first quiz waits for both the questions and the section list, so it never starts on a
  // retired topic: a topic in use, with questions, at random.
  const started = useRef(false);
  const { questionId: linkedId } = useParams();
  const navigate = useNavigate();
  const [focusId, setFocusId] = useState(null);
  useEffect(() => {
    if (started.current || loadState !== 'ready' || !sectionsLoaded) return;
    started.current = true;
    const topics = activeSections(sections).map((s) => s.id)
      .filter((id) => usable.some((q) => (q.topic || '').toLowerCase() === id));
    if (!topics.length) return;
    const chosen = topics[Math.floor(topics.length * Math.random())];
    setTopic(chosen);
    startQuiz(chosen, 'All', 0, usable);
  }, [loadState, sectionsLoaded, sections, usable, startQuiz]);

  // /nife/questions/q/<id>: a link to one question, shared in a group chat, opens Review Mode on
  // it, open. A question that has since been hidden or retired says so rather than showing
  // nothing.
  const linkHandled = useRef(false);
  useEffect(() => {
    if (!linkedId || linkHandled.current || loadState !== 'ready' || !sectionsLoaded) return;
    linkHandled.current = true;
    const q = usable.find((x) => x.questionId === linkedId);
    if (!q) {
      showNotice('That question is no longer in the quiz.', 'error');
      return;
    }
    setTopic((q.topic || '').toLowerCase());
    setLecture('All');
    setFocusId(q.questionId);
    setView('review');
  }, [linkedId, loadState, sectionsLoaded, usable, navigate, showNotice]);

  useEffect(() => {
    // ?admin shows the admin panel button in this browser from now on; the server still
    // refuses its buttons without the token.
    try {
      if (new URLSearchParams(window.location.search).has('admin')) localStorage.setItem('qAdmin', 'true');
      if (localStorage.getItem('qAdmin') === 'true') setIsAdminEnabled(true);
    } catch { /* private mode */ }
    loadAll();
    refreshPending();
  }, [loadAll, refreshPending]);

  const restart = (topicVal = topic, lectureVal = lecture, n = parseInt(numQuestions, 10) || 0) => {
    startQuiz(topicVal, lectureVal, n, usable);
  };

  // The oldest pending item in this topic this browser has not dealt with, preferring the
  // lecture being quizzed.
  const pickBonus = () => {
    const inTopic = unseen.filter((q) => (q.topic || '').toLowerCase() === topic);
    return inTopic.find((q) => lecture !== 'All' && String(q.lecture) === lecture) || inTopic[0] || null;
  };

  const submitAnswer = () => {
    setAnswered(true);
    setAttempts((prev) => [...prev, {
      question: current.question,
      chosen: selected,
      correct: current.correctAnswer,
      explanation: current.explanation,
    }]);
  };

  const advance = () => {
    if (index + 1 >= quiz.length) {
      setShowScore(true);
      return;
    }
    setIndex(index + 1);
    prepare(quiz[index + 1]);
  };

  const next = () => {
    const item = (index + 1) % BONUS_EVERY === 0 ? pickBonus() : null;
    if (item) setBonus({ item, then: 'advance' });
    else advance();
  };

  // A vote or skip on a pending item, from a bonus in the quiz or from Review pending.
  const pendingDone = async ({ vote, result, error }) => {
    setSeen(pendingSeen());
    const isEdit = vote === 'better' || vote === 'worse';
    if (error) {
      showNotice('Your vote did not go through. Check your connection.', 'error');
    } else if (result && result.outcome === 'approved') {
      showNotice(isEdit ? 'That edit has been approved and applied.' : 'That question has been approved and added to the quiz.');
      loadAll();
    } else if (result && result.outcome === 'rejected') {
      showNotice(isEdit ? 'That edit was turned down by the community.' : 'That question was turned down by the community.');
    }
    if (vote !== 'skip') refreshPending();
    if (bonus) {
      const { then } = bonus;
      setBonus(null);
      if (then === 'advance') advance();
    }
  };

  const openForm = (mode, question = null) => {
    if (mode === 'edit' && question) {
      // Someone has already proposed an edit to this question: vote on that one first.
      const existing = unseen.find((p) => p.type === 'edit' && p.originalQuestionId === question.questionId);
      if (existing) {
        setView('quiz');
        setBonus({ item: existing, then: 'resume' });
        showNotice('Someone has already proposed an edit to this question. Have a look at it first.');
        return;
      }
    }
    setForm({ mode, question });
  };

  const formDone = (message, kind) => {
    showNotice(message, kind);
    refreshPending();
  };

  // A thumbs vote on a live question: the screen moves at once, the server is told after.
  const handleVote = (voteType) => {
    if (!current) return;
    const questionId = current.questionId;
    const previous = votedQuestions[questionId] || null;
    const nextVote = previous === voteType ? null : voteType;

    const newVoted = { ...votedQuestions };
    if (nextVote) newVoted[questionId] = nextVote;
    else delete newVoted[questionId];
    setVotedQuestions(newVoted);
    writeStored('votedQuestions', newVoted);

    const counter = { good: 'upvotes', bad: 'downvotes' };
    setAllQuestions((prev) => prev.map((q) => {
      if (q.questionId !== questionId) return q;
      const out = { ...q };
      if (previous) out[counter[previous]] = Math.max(0, (out[counter[previous]] || 0) - 1);
      if (nextVote) out[counter[nextVote]] = (out[counter[nextVote]] || 0) + 1;
      return out;
    }));

    voteOnQuestion(questionId, nextVote, previous).catch((error) => {
      console.error('Error recording vote:', error);
    });
  };

  const formModal = form && (
    <QuestionForm
      mode={form.mode}
      sections={sections}
      question={form.question}
      defaultTopic={topic}
      onClose={() => setForm(null)}
      onDone={formDone}
    />
  );

  const toQuiz = () => {
    setView('quiz');
    setFocusId(null);
    if (linkedId) navigate('/nife/questions', { replace: true });
    restart();
  };

  if (showScore) {
    return <ScoreScreen attempts={attempts} topic={topic} sections={sections} onReset={() => restart()} />;
  }

  if (view === 'review') {
    return (
      <>
        {notice && <div className="questions-container" style={{ paddingBottom: 0 }}>{notice}</div>}
        <ReviewList
          questions={usable}
          sections={sections}
          topic={topic}
          lecture={lecture}
          onTopicChange={(t) => { setTopic(t); setLecture('All'); }}
          onLectureChange={setLecture}
          onExit={toQuiz}
          onEdit={(q) => openForm('edit', q)}
          focusId={focusId}
          onCopied={(url) => showNotice(url ? `Copy this link: ${url}` : 'Link copied. Anyone who opens it lands on this question.')}
        />
        {formModal}
      </>
    );
  }

  if (view === 'pending') {
    return (
      <>
        {notice && <div className="questions-container" style={{ paddingBottom: 0 }}>{notice}</div>}
        <PendingQueue
          pending={pending.filter(inUse(sections))}
          sections={sections}
          threshold={threshold}
          seen={seen}
          questions={allQuestions}
          onVoted={pendingDone}
          onExit={() => setView('quiz')}
        />
      </>
    );
  }

  if (view === 'admin') {
    return (
      <AdminPanel
        questions={allQuestions}
        sections={sections}
        onExit={() => { setView('quiz'); refreshPending(); }}
        onChanged={() => loadAll()}
      />
    );
  }

  const score = current ? netScore(current) : 0;
  const disputed = answered && current && score <= DISPUTED_AT;
  const bonusOriginal = bonus && bonus.item.type === 'edit'
    ? allQuestions.find((q) => q.questionId === bonus.item.originalQuestionId)
    : null;

  return (
    <>
      <div className={`questions-container ${bonus ? 'pending-question-mode' : ''}`}>
        {notice}

        <button
          className="review-mode-toggle"
          onClick={() => setView('review')}
          style={{ marginBottom: '10px', padding: '10px 20px', backgroundColor: '#01202C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%' }}
        >
          Enter Review Mode
        </button>

        {unseen.length > 0 && (
          <button
            onClick={() => setView('pending')}
            style={{ marginBottom: '15px', padding: '8px 20px', backgroundColor: 'white', color: '#01202C', border: '2px solid #01202C', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', width: '100%' }}
          >
            Review pending questions ({unseen.length})
          </button>
        )}

        {isAdminEnabled && (
          <button
            onClick={() => setView('admin')}
            style={{ marginBottom: '10px', padding: '7px 16px', backgroundColor: '#5a0000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', width: '100%' }}
          >
            Admin Panel
          </button>
        )}

        <div className="dropdown-row">
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setLecture('All');
              restart(e.target.value, 'All');
            }}
          >
            {topicOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select
            value={lecture}
            onChange={(e) => {
              setLecture(e.target.value);
              restart(topic, e.target.value);
            }}
          >
            <option value="All">All Lectures</option>
            {availableLectures.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <select
            value={numQuestions}
            onChange={(e) => {
              setNumQuestions(e.target.value);
              restart(topic, lecture, parseInt(e.target.value, 10));
            }}
          >
            <option value="" disabled>No. of Questions</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="10000">All</option>
          </select>
        </div>

        <div style={{ textAlign: 'right', fontSize: '13px', margin: '-4px 0 10px' }}>
          <Link to="/nife/questions/sections" style={{ color: '#003B4F' }}>Topics or lectures out of date? Edit them</Link>
        </div>

        {loadState === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#003B4F' }}>Loading questions…</div>
        )}
        {loadState === 'error' && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#003B4F' }}>
            Could not load the questions. Check your connection.
            <button className="submitBtn" onClick={() => { setLoadState('loading'); loadAll(); }}>
              Try again
            </button>
          </div>
        )}
        {loadState === 'ready' && quiz.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#003B4F' }}>No questions in this topic yet.</div>
        )}

        {bonus && (
          <PendingCard
            key={bonus.item.questionId}
            item={bonus.item}
            original={bonusOriginal}
            threshold={threshold}
            badge="Bonus review"
            onDone={pendingDone}
          />
        )}

        {!bonus && current && (
          <>
            <div className="qa-container">
              <span className="q-badge">Q {index + 1}/{quiz.length}</span>
              <div className="qa-box question-area">{current.question}</div>

              <div className="qa-box">
                <div className="radio-list">
                  {choices.map((choice, idx) => (
                    <label
                      key={idx}
                      className={
                        answered && choice === current.correctAnswer ? 'correct'
                          : answered && selected === choice ? 'wrong'
                            : !answered && selected === choice ? 'selected' : ''
                      }
                      onClick={() => !answered && setSelected(choice)}
                    >
                      <input type="radio" name="answer" value={choice} checked={selected === choice} onChange={() => {}} disabled={answered} />
                      {choice}
                    </label>
                  ))}
                </div>

                {answered && <Explanation text={current.explanation} />}

                {disputed && (
                  <div style={{ marginTop: '14px', padding: '10px 12px', background: '#f3f7f8', border: '1px solid #cfdde2', borderRadius: '6px', fontSize: '14px', color: '#003B4F' }}>
                    Many students have marked this question down. If something in it is wrong or unclear, suggest an edit.
                    <button
                      onClick={() => openForm('edit', current)}
                      style={{ marginLeft: '10px', padding: '4px 12px', background: '#01202C', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Suggest an edit
                    </button>
                  </div>
                )}

                {!answered ? (
                  <button className="submitBtn" onClick={submitAnswer}>Submit</button>
                ) : (
                  <button className="submitBtn" onClick={next}>
                    {index + 1 >= quiz.length ? 'Review' : 'Next Question'}
                  </button>
                )}
              </div>
            </div>

            {topic === 'weather' && (
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <button className="submitBtn" onClick={() => setShowPdfModal(true)} style={{ fontSize: '0.9em', padding: '8px 16px' }}>
                  View Weather Figures
                </button>
              </div>
            )}

            <div className="feedback-row">
              <button
                className={`thumb-btn up ${votedQuestions[current.questionId] === 'good' ? 'active' : ''}`}
                onClick={() => handleVote('good')}
                title="Good question"
              >
                <img src="/images/thumb.png" alt="Thumbs up" />
              </button>
              <span className={`vote-score ${score >= 0 ? 'positive' : 'negative'}`}>
                {score >= 0 ? '+' : ''}{score}
              </span>
              <button
                className={`thumb-btn down ${votedQuestions[current.questionId] === 'bad' ? 'active' : ''}`}
                onClick={() => handleVote('bad')}
                title="Bad question"
              >
                <img src="/images/thumb-down.png" alt="Thumbs down" />
              </button>
            </div>

            <button className="submitBtn" onClick={() => openForm('edit', current)}>
              Edit Current Question
            </button>
          </>
        )}

        <button className="submitBtn" onClick={() => openForm('new')}>
          Submit a Question
        </button>
        <div style={{ textAlign: 'center', fontSize: '13px', marginTop: '6px' }}>
          <Link to="/nife/questions/upload" style={{ color: '#003B4F' }}>Have a spreadsheet or a Quizlet set? Upload many at once</Link>
        </div>
      </div>

      {formModal}
      {showPdfModal && <WeatherFigures onClose={() => setShowPdfModal(false)} />}
    </>
  );
}

export default Questions;
