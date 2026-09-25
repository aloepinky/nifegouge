import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TOPICS, answerChoices, inFilter, lecturesIn, loadApproved, loadPending, netScore,
  voteOnPending, voteOnQuestion,
} from './questions/questionsApi';
import { useNotice } from './questions/Notice';
import QuestionForm from './questions/QuestionForm';
import ReviewList from './questions/ReviewList';
import AdminPanel from './questions/AdminPanel';
import ScoreScreen from './questions/ScoreScreen';
import WeatherFigures from './questions/WeatherFigures';

// The NIFE Questions tab: the quiz, and the route shell for Review Mode, the admin panel and
// the submit/edit form, which live in ./questions/. The quiz's question selection, pending
// slots included, is still here; the plan's Phase 2 replaces it.

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
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [attempts, setAttempts] = useState([]);

  // Pending questions shown in the quiz
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [isPendingQuestion, setIsPendingQuestion] = useState(false);
  const [pendingQuestionType, setPendingQuestionType] = useState(null); // 'new' or 'edit'

  // Edit pair tracking
  const [editPairOriginal, setEditPairOriginal] = useState(null);
  const [justCompletedOriginal, setJustCompletedOriginal] = useState(false);

  const [topic, setTopic] = useState('aero');
  const [lecture, setLecture] = useState('All');
  const [numQuestions, setNumQuestions] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [choices, setChoices] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const [reviewMode, setReviewMode] = useState(false);
  const [votedQuestions, setVotedQuestions] = useState(() => readStored('votedQuestions'));
  const [votedPendingQuestions, setVotedPendingQuestions] = useState(() => readStored('votedPendingQuestions'));

  // Owner-written question explanations (keyed by questionId)
  const [explanations, setExplanations] = useState({});

  const [isAdminEnabled, setIsAdminEnabled] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [form, setForm] = useState(null); // null | { mode: 'new' | 'edit', question }
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [notice, showNotice] = useNotice();

  const availableLectures = useMemo(() => lecturesIn(allQuestions, topic), [allQuestions, topic]);

  const show = useCallback((q) => {
    setCurrentQuestion(q);
    setQuestionText(q.question);
    setChoices(answerChoices(q));
    setSelectedAnswer('');
    setIsAnswered(false);
  }, []);

  const loadQuestion = useCallback((index, indices = selectedQuestionIndices, questions = filteredQuestions) => {
    if (index >= indices.length) {
      setShowReview(true);
      return;
    }

    // If we just completed an original question and have an edit pair to show
    if (justCompletedOriginal && editPairOriginal) {
      const editQuestion = pendingQuestions.find((q) => (
        q.originalQuestionId === editPairOriginal.questionId && q.type === 'edit' && !votedPendingQuestions[q.questionId]
      ));
      setJustCompletedOriginal(false);
      if (editQuestion) {
        setIsPendingQuestion(true);
        setPendingQuestionType('edit');
        show(editQuestion);
        return;
      }
      setEditPairOriginal(null);
    }

    setEditPairOriginal(null);

    // Every 5th question alternates: odd multiples = edit pair, even multiples = new question
    // e.g. Q5=edit, Q10=new, Q15=edit, Q20=new ...
    const slot = pendingQuestions.length > 0 ? Math.floor((index + 1) / 5) : 0;
    const isEvery5th = (index + 1) % 5 === 0 && slot > 0;
    const isEditSlot = isEvery5th && slot % 2 === 1;
    const isNewSlot = isEvery5th && slot % 2 === 0;

    if (isEditSlot) {
      const edit = pendingQuestions.find((q) => q.type === 'edit' && !votedPendingQuestions[q.questionId]);
      const original = edit && (
        allQuestions.find((q) => q.questionId === edit.originalQuestionId)
        || allQuestions.find((q) => q.originalQuestionId === edit.originalQuestionId)
      );
      if (original) {
        setEditPairOriginal(original);
        setIsPendingQuestion(false);
        setPendingQuestionType(null);
        show(original);
        return;
      }
    }

    if (isNewSlot) {
      const fresh = pendingQuestions.find((q) => q.type === 'new' && !votedPendingQuestions[q.questionId]);
      if (fresh) {
        setIsPendingQuestion(true);
        setPendingQuestionType('new');
        show(fresh);
        return;
      }
    }

    setIsPendingQuestion(false);
    setPendingQuestionType(null);
    show(questions[indices[index]]);
  }, [selectedQuestionIndices, filteredQuestions, allQuestions, pendingQuestions, votedPendingQuestions, justCompletedOriginal, editPairOriginal, show]);

  const fetchPendingQuestions = useCallback(async (forTopic) => {
    try {
      const pending = await loadPending();
      // Only pending questions in this topic that this browser hasn't voted on.
      setPendingQuestions(pending.filter((q) => (
        (q.topic || '').toLowerCase() === forTopic && !votedPendingQuestions[q.questionId]
      )));
    } catch (err) {
      console.error('Error loading pending questions:', err);
    }
  }, [votedPendingQuestions]);

  const generateQuestions = useCallback((topicVal, lectureVal, n, questionsArray = allQuestions) => {
    const filtered = questionsArray.filter(inFilter(topicVal, lectureVal));
    setFilteredQuestions(filtered);
    const total = filtered.length;
    const count = !n || n === 'All' || n > total ? total : n;

    const indices = [];
    while (indices.length < count) {
      const rand = Math.floor(Math.random() * total);
      if (!indices.includes(rand)) indices.push(rand);
    }

    setSelectedQuestionIndices(indices);
    setCurrentIndex(0);
    setAttempts([]);
    setShowReview(false);
    setIsPendingQuestion(false);
    setPendingQuestionType(null);
    setEditPairOriginal(null);
    setJustCompletedOriginal(false);

    fetchPendingQuestions(topicVal);

    if (indices.length > 0) loadQuestion(0, indices, filtered);
  }, [allQuestions, loadQuestion, fetchPendingQuestions]);

  const fetchQuestionsFromDB = async () => {
    try {
      const questions = await loadApproved();
      setAllQuestions(questions);
      setLoadState('ready');

      const topics = [...new Set(questions
        .map((q) => q.topic)
        .filter((t) => typeof t === 'string' && t.trim() !== '')
        .map((t) => t.toLowerCase().trim()))];
      if (topics.length > 0) {
        const selected = topics[Math.floor(topics.length * Math.random())];
        setTopic(selected);
        generateQuestions(selected, 'All', questions.length, questions);
      }
    } catch (err) {
      console.error('Error loading questions:', err);
      setLoadState('error');
    }
  };

  // Initial load
  useEffect(() => {
    let isMounted = true;

    // ?admin shows the admin panel button in this browser from now on; the server still
    // refuses its buttons without the token.
    try {
      if (new URLSearchParams(window.location.search).has('admin')) localStorage.setItem('qAdmin', 'true');
      if (localStorage.getItem('qAdmin') === 'true') setIsAdminEnabled(true);
    } catch { /* private mode */ }

    fetch('/explanations.json')
      .then((r) => r.json())
      .then((data) => { if (isMounted) setExplanations(data); })
      .catch(() => {});

    fetchQuestionsFromDB();
    return () => { isMounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exitReviewMode = () => {
    setReviewMode(false);
    generateQuestions(topic, lecture, numQuestions || allQuestions.length);
  };

  const voteOnPendingQuestion = async (questionId, voteType, isEditImprovement) => {
    const newVoted = { ...votedPendingQuestions, [questionId]: voteType };
    setVotedPendingQuestions(newVoted);
    writeStored('votedPendingQuestions', newVoted);

    try {
      // The server counts the vote and, at the threshold, approves or rejects the question
      // before it answers. null means this one was already voted on from here, or already
      // decided; either way there is nothing left to do but move on.
      const result = await voteOnPending(questionId, voteType);
      if (result && result.outcome === 'approved') {
        await fetchQuestionsFromDB();
        showNotice(isEditImprovement ? 'That edit has been approved and applied.' : 'That question has been approved and added to the quiz.');
      } else if (result && result.outcome === 'rejected') {
        showNotice(isEditImprovement ? 'That edit was turned down by the community.' : 'That question was turned down by the community.');
      }
    } catch (error) {
      console.error('Error voting on pending question:', error);
      showNotice('Your vote did not go through. Check your connection.', 'error');
    }

    setPendingQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
    if (isAnswered) handleNextQuestion();
  };

  const handleSubmitAnswer = () => {
    setIsAnswered(true);
    if (isPendingQuestion) return;
    setAttempts((prev) => [...prev, {
      question: currentQuestion.question,
      chosen: selectedAnswer,
      correct: currentQuestion.correctAnswer,
    }]);
    // If this was the original in an edit pair, load the edit next
    if (editPairOriginal && currentQuestion.questionId === editPairOriginal.questionId) {
      setJustCompletedOriginal(true);
    }
  };

  const handleNextQuestion = () => {
    setCurrentIndex((prev) => prev + 1);
    loadQuestion(currentIndex + 1);
  };

  const handleReset = () => {
    setShowReview(false);
    setAttempts([]);
    generateQuestions(topic, lecture, numQuestions || allQuestions.length);
  };

  const openForm = (mode, question = null) => {
    if (mode === 'edit' && question) {
      // If there's already a pending edit for this question, show it for voting instead
      const existingEdit = pendingQuestions.find((p) => (
        p.type === 'edit' && p.originalQuestionId === question.questionId && !votedPendingQuestions[p.questionId]
      ));
      if (existingEdit) {
        setReviewMode(false);
        setEditPairOriginal(question);
        setIsPendingQuestion(true);
        setPendingQuestionType('edit');
        show(existingEdit);
        return;
      }
    }
    setForm({ mode, question });
  };

  const formDone = (message, kind) => {
    showNotice(message, kind);
    fetchPendingQuestions(topic);
  };

  const handleVote = (voteType) => {
    if (!currentQuestion || !currentQuestion.questionId) return;

    if (isPendingQuestion) {
      if (!isAnswered) return;
      voteOnPendingQuestion(currentQuestion.questionId, voteType, pendingQuestionType === 'edit');
      return;
    }

    // A live question: the screen moves at once, the server is told in the background.
    const questionId = currentQuestion.questionId;
    const previous = votedQuestions[questionId] || null;
    const next = previous === voteType ? null : voteType;

    const newVoted = { ...votedQuestions };
    if (next) newVoted[questionId] = next;
    else delete newVoted[questionId];
    setVotedQuestions(newVoted);
    writeStored('votedQuestions', newVoted);

    const counter = { good: 'upvotes', bad: 'downvotes' };
    const moved = (q) => {
      const out = { ...q };
      if (previous) out[counter[previous]] = Math.max(0, (out[counter[previous]] || 0) - 1);
      if (next) out[counter[next]] = (out[counter[next]] || 0) + 1;
      return out;
    };
    setAllQuestions((prev) => prev.map((q) => (q.questionId === questionId ? moved(q) : q)));
    setCurrentQuestion((prev) => (prev && prev.questionId === questionId ? moved(prev) : prev));

    voteOnQuestion(questionId, next, previous).catch((error) => {
      console.error('Error recording vote:', error);
    });
  };

  const skipPending = () => {
    const newVoted = { ...votedPendingQuestions, [currentQuestion.questionId]: 'skip' };
    setVotedPendingQuestions(newVoted);
    writeStored('votedPendingQuestions', newVoted);
    setPendingQuestions((prev) => prev.filter((q) => q.questionId !== currentQuestion.questionId));
    handleNextQuestion();
  };

  const formModal = form && (
    <QuestionForm
      mode={form.mode}
      question={form.question}
      defaultTopic={topic}
      onClose={() => setForm(null)}
      onDone={formDone}
    />
  );

  if (showReview) {
    return <ScoreScreen attempts={attempts} topic={topic} onReset={handleReset} />;
  }

  if (reviewMode) {
    return (
      <>
        {notice && <div className="questions-container" style={{ paddingBottom: 0 }}>{notice}</div>}
        <ReviewList
          questions={allQuestions}
          topic={topic}
          lecture={lecture}
          onTopicChange={(t) => { setTopic(t); setLecture('All'); }}
          onLectureChange={setLecture}
          onExit={exitReviewMode}
          onEdit={(q) => openForm('edit', q)}
        />
        {formModal}
      </>
    );
  }

  if (adminMode) {
    return <AdminPanel questions={allQuestions} onExit={() => setAdminMode(false)} onApproved={fetchQuestionsFromDB} />;
  }

  const score = currentQuestion ? netScore(currentQuestion) : 0;
  const pendingVote = votedPendingQuestions[currentQuestion?.questionId];

  return (
    <>
      <div className={`questions-container ${isPendingQuestion ? 'pending-question-mode' : ''} ${editPairOriginal ? 'edit-pair-mode' : ''}`}>
        {notice}

        <button
          className="review-mode-toggle"
          onClick={() => setReviewMode(true)}
          style={{ marginBottom: '15px', padding: '10px 20px', backgroundColor: '#01202C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%' }}
        >
          Enter Review Mode
        </button>

        {isAdminEnabled && (
          <button
            onClick={() => setAdminMode(true)}
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
              generateQuestions(e.target.value, 'All', numQuestions);
            }}
          >
            {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select
            value={lecture}
            onChange={(e) => {
              setLecture(e.target.value);
              generateQuestions(topic, e.target.value, numQuestions);
            }}
          >
            <option value="All">All Lectures</option>
            {availableLectures.map((lec) => <option key={lec} value={lec}>Lecture {lec}</option>)}
          </select>

          <select
            value={numQuestions}
            onChange={(e) => {
              setNumQuestions(e.target.value);
              generateQuestions(topic, lecture, parseInt(e.target.value, 10));
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

        {loadState === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#003B4F' }}>Loading questions…</div>
        )}
        {loadState === 'error' && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#003B4F' }}>
            Could not load the questions. Check your connection.
            <button className="submitBtn" onClick={() => { setLoadState('loading'); fetchQuestionsFromDB(); }}>
              Try again
            </button>
          </div>
        )}

        {questionText && (
          <>
            <div className="qa-container">
              {editPairOriginal && !isPendingQuestion && (
                <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '5px', color: '#1565c0', textAlign: 'center', fontWeight: 'bold' }}>
                  Original Question - An edited version will follow
                </div>
              )}

              {isPendingQuestion && pendingQuestionType === 'new' && (
                <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '5px', color: '#856404', textAlign: 'center', fontWeight: 'bold' }}>
                  Community Review: New Question - Please vote after answering
                  {currentQuestion && currentQuestion.approveCount !== undefined && (
                    <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                      Current: {currentQuestion.approveCount || 0} approvals, {currentQuestion.rejectCount || 0} rejections
                      (needs net +5 for approval)
                    </div>
                  )}
                </div>
              )}

              {isPendingQuestion && pendingQuestionType === 'edit' && (
                <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '5px', color: '#2e7d32', textAlign: 'center', fontWeight: 'bold' }}>
                  Edited Version - Is this an improvement?
                  {currentQuestion && currentQuestion.approveCount !== undefined && (
                    <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                      Current: {currentQuestion.approveCount || 0} say better, {currentQuestion.rejectCount || 0} say worse
                      (needs net +5 for approval)
                    </div>
                  )}
                </div>
              )}

              <span className="q-badge">
                Q {currentIndex + 1}/{selectedQuestionIndices.length}
              </span>
              <div className="qa-box question-area">{questionText}</div>

              <div className="qa-box">
                <div className="radio-list">
                  {choices.map((choice, idx) => (
                    <label
                      key={idx}
                      className={
                        isAnswered && choice === currentQuestion.correctAnswer ? 'correct'
                          : isAnswered && selectedAnswer === choice ? 'wrong'
                            : !isAnswered && selectedAnswer === choice ? 'selected' : ''
                      }
                      onClick={() => !isAnswered && setSelectedAnswer(choice)}
                    >
                      <input type="radio" name="answer" value={choice} checked={selectedAnswer === choice} onChange={() => {}} disabled={isAnswered} />
                      {choice}
                    </label>
                  ))}
                </div>

                {isAnswered && !isPendingQuestion && explanations[currentQuestion?.questionId] && (
                  <div className="explanation-text" style={{ marginTop: '16px' }}>
                    <strong className="explanation-heading">Explanation</strong>
                    {explanations[currentQuestion.questionId]}
                  </div>
                )}

                {!isAnswered ? (
                  <button className="submitBtn" onClick={handleSubmitAnswer}>Submit</button>
                ) : !isPendingQuestion ? (
                  <button className="submitBtn" onClick={handleNextQuestion}>
                    {currentIndex + 1 >= selectedQuestionIndices.length ? 'Review' : 'Next Question'}
                  </button>
                ) : null}
              </div>
            </div>

            {topic === 'weather' && (
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <button className="submitBtn" onClick={() => setShowPdfModal(true)} style={{ fontSize: '0.9em', padding: '8px 16px' }}>
                  View Weather Figures
                </button>
              </div>
            )}

            {/* Vote buttons: required for pending questions, once answered */}
            {(!isPendingQuestion || isAnswered) && (
              <div className="feedback-row">
                <button
                  className={`thumb-btn up ${
                    isPendingQuestion
                      ? (pendingVote === 'approve' || pendingVote === 'better' ? 'active' : '')
                      : (votedQuestions[currentQuestion?.questionId] === 'good' ? 'active' : '')
                  }`}
                  onClick={() => handleVote(isPendingQuestion ? (pendingQuestionType === 'edit' ? 'better' : 'approve') : 'good')}
                  title={isPendingQuestion ? (pendingQuestionType === 'edit' ? 'Better than original' : 'Approve question') : 'Good question'}
                  disabled={Boolean(isPendingQuestion && pendingVote)}
                >
                  <img src="/images/thumb.png" alt="Thumbs up" />
                  {isPendingQuestion && (
                    <span style={{ display: 'block', fontSize: '12px', marginTop: '5px', color: 'white' }}>
                      {pendingQuestionType === 'edit' ? 'Better' : 'Approve'}
                    </span>
                  )}
                </button>
                {!isPendingQuestion && currentQuestion && (
                  <span className={`vote-score ${score >= 0 ? 'positive' : 'negative'}`}>
                    {score >= 0 ? '+' : ''}{score}
                  </span>
                )}
                <button
                  className={`thumb-btn down ${
                    isPendingQuestion
                      ? (pendingVote === 'reject' || pendingVote === 'worse' ? 'active' : '')
                      : (votedQuestions[currentQuestion?.questionId] === 'bad' ? 'active' : '')
                  }`}
                  onClick={() => handleVote(isPendingQuestion ? (pendingQuestionType === 'edit' ? 'worse' : 'reject') : 'bad')}
                  title={isPendingQuestion ? (pendingQuestionType === 'edit' ? 'Worse than original' : 'Reject question') : 'Bad question'}
                  disabled={Boolean(isPendingQuestion && pendingVote)}
                >
                  <img src="/images/thumb-down.png" alt="Thumbs down" />
                  {isPendingQuestion && (
                    <span style={{ display: 'block', fontSize: '12px', marginTop: '5px', color: 'white' }}>
                      {pendingQuestionType === 'edit' ? 'Worse' : 'Reject'}
                    </span>
                  )}
                </button>
              </div>
            )}

            {isPendingQuestion && pendingQuestionType === 'edit' && !pendingVote && isAnswered && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  onClick={skipPending}
                  style={{ padding: '6px 16px', backgroundColor: 'transparent', color: '#888', border: '1px solid #888', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Skip
                </button>
              </div>
            )}
          </>
        )}

        {currentQuestion && !isPendingQuestion && !editPairOriginal && (
          <button className="submitBtn" onClick={() => openForm('edit', currentQuestion)}>
            Edit Current Question
          </button>
        )}

        <button className="submitBtn" onClick={() => openForm('new')}>
          Submit a Question
        </button>
      </div>

      {formModal}
      {showPdfModal && <WeatherFigures onClose={() => setShowPdfModal(false)} />}
    </>
  );
}

export default Questions;
