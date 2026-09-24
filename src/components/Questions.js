import React, { useState, useEffect, useCallback} from 'react';
import { call, post, readMirror } from './serverApi';

// The questions are read from the mirror lambda/discussApi keeps (questions.mjs), and every
// write goes to that function, which rebuilds the mirror before it answers.
const APPROVED_KEY = 'questions/nife/approved.json';
const PENDING_KEY = 'questions/nife/pending.json';
const ADMIN_TOKEN_KEY = 'qAdminToken';
const VOTER_KEY = 'qVoterId';

// This browser's voter id for community review: one vote per browser per pending question.
function voterId() {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function Questions() {
  const [allQuestions, setAllQuestions] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [attempts, setAttempts] = useState([]);
  
  // Pending questions state
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [isPendingQuestion, setIsPendingQuestion] = useState(false);
  const [pendingQuestionType, setPendingQuestionType] = useState(null); // 'new' or 'edit'
  
  // Edit pair tracking
  const [editPairOriginal, setEditPairOriginal] = useState(null);
  const [justCompletedOriginal, setJustCompletedOriginal] = useState(false);
  
  // UI state
  const [topic, setTopic] = useState('aero');
  const [lecture, setLecture] = useState('All');
  const [numQuestions, setNumQuestions] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answerChoices, setAnswerChoices] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  // Available lectures for current topic
  const [availableLectures, setAvailableLectures] = useState([]);
  
  // Review Mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [reviewAnswers, setReviewAnswers] = useState({});
  
  // Voting state for approved questions
  const [votedQuestions, setVotedQuestions] = useState(() => {
    const saved = localStorage.getItem('votedQuestions');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Voting state for pending questions (tracks if user voted and which way)
  const [votedPendingQuestions, setVotedPendingQuestions] = useState(() => {
    const saved = localStorage.getItem('votedPendingQuestions');
    return saved ? JSON.parse(saved) : {};
  });

  // Owner-written question explanations (keyed by questionId)
  const [explanations, setExplanations] = useState({});

  // Admin panel state
  const [isAdminEnabled, setIsAdminEnabled] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminPendingQuestions, setAdminPendingQuestions] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    try { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch { return ''; }
  });
  const [adminTokenDraft, setAdminTokenDraft] = useState('');
  const [adminError, setAdminError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('new');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [modalData, setModalData] = useState({
    topic: 'aero',
    lecture: '',
    question: '',
    correctAnswer: '',
    incorrectAnswer1: '',
    incorrectAnswer2: '',
    incorrectAnswer3: ''
  });

  const prepareAnswerOptions = useCallback((answers) => {
    const specialOptions = ['all of the above', 'none of the above'];
    const lastOptions = answers.filter(opt =>
      specialOptions.some(special => opt?.toString().toLowerCase().includes(special))
    );
    const otherOptions = answers.filter(opt =>
      !specialOptions.some(special => opt?.toString().toLowerCase().includes(special))
    );
    
    return [...shuffle(otherOptions), ...lastOptions];
  }, []);

  const shuffle = (array) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  // Update available lectures when topic changes or questions are loaded
  const updateAvailableLectures = useCallback((topicVal, questionsArray = allQuestions) => {
    const topicQuestions = questionsArray.filter(q => 
      q.topic?.toString().toLowerCase() === topicVal.toLowerCase()
    );
    
    // Get unique lecture numbers and sort them
    const lectures = [...new Set(
      topicQuestions
        .map(q => q.lecture)
        .filter(lec => lec !== undefined && lec !== null && lec !== '')
        .map(lec => String(lec))
    )].sort((a, b) => {
      // Try to sort numerically if possible
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Otherwise sort alphabetically
      return a.localeCompare(b);
    });
    
    setAvailableLectures(lectures);
  }, [allQuestions]);

  const loadQuestion = useCallback((index, indices = selectedQuestionIndices, questions = filteredQuestions) => {
    if (index >= indices.length) {
      setShowReview(true);
      return;
    }
    
    // If we just completed an original question and have an edit pair to show
    if (justCompletedOriginal && editPairOriginal) {
      const editQuestion = pendingQuestions.find(q => 
        q.originalQuestionId === editPairOriginal.questionId && 
        q.type === 'edit' &&
        !votedPendingQuestions[q.questionId]
      );
      
      if (editQuestion) {
        // Load the edited version
        setCurrentQuestion(editQuestion);
        setIsPendingQuestion(true);
        setPendingQuestionType('edit');
        setJustCompletedOriginal(false);
        
        const question = editQuestion.question;
        const correct = editQuestion.correctAnswer;
        const incorrect = [editQuestion.incorrectAnswer1, editQuestion.incorrectAnswer2, editQuestion.incorrectAnswer3].filter(Boolean);
        const allAnswers = prepareAnswerOptions([correct, ...incorrect]);
        
        setQuestionText(question);
        setAnswerChoices(allAnswers);
        setSelectedAnswer('');
        setIsAnswered(false);
        return;
      } else {
        // No edit available, clear the flags
        setJustCompletedOriginal(false);
        setEditPairOriginal(null);
      }
    }
    
    // Reset edit pair state
    setEditPairOriginal(null);
    
    // Every 5th question alternates: odd multiples = edit pair, even multiples = new question
    // e.g. Q5=edit, Q10=new, Q15=edit, Q20=new ...
    const slot = pendingQuestions.length > 0 ? Math.floor((index + 1) / 5) : 0;
    const isEvery5th = (index + 1) % 5 === 0 && slot > 0;
    const isEditSlot = isEvery5th && slot % 2 === 1;
    const isNewSlot  = isEvery5th && slot % 2 === 0;

    if (isEditSlot) {
      const editQuestions = pendingQuestions.filter(q =>
        q.type === 'edit' &&
        !votedPendingQuestions[q.questionId]
      );

      if (editQuestions.length > 0) {
        const editToShow = editQuestions[0];
        const originalQuestion =
          allQuestions.find(q => q.questionId === editToShow.originalQuestionId) ||
          allQuestions.find(q => q.originalQuestionId === editToShow.originalQuestionId);

        if (originalQuestion) {
          setCurrentQuestion(originalQuestion);
          setEditPairOriginal(originalQuestion);
          setIsPendingQuestion(false);
          setPendingQuestionType(null);

          const question = originalQuestion.question;
          const correct = originalQuestion.correctAnswer;
          const incorrect = [originalQuestion.incorrectAnswer1, originalQuestion.incorrectAnswer2, originalQuestion.incorrectAnswer3].filter(Boolean);
          const allAnswers = prepareAnswerOptions([correct, ...incorrect]);

          setQuestionText(question);
          setAnswerChoices(allAnswers);
          setSelectedAnswer('');
          setIsAnswered(false);
          return;
        }
      }
    }

    if (isNewSlot) {
      const newQuestions = pendingQuestions.filter(q =>
        q.type === 'new' &&
        !votedPendingQuestions[q.questionId]
      );

      if (newQuestions.length > 0) {
        const pendingQ = newQuestions[0];
        setCurrentQuestion(pendingQ);
        setIsPendingQuestion(true);
        setPendingQuestionType('new');

        const question = pendingQ.question;
        const correct = pendingQ.correctAnswer;
        const incorrect = [pendingQ.incorrectAnswer1, pendingQ.incorrectAnswer2, pendingQ.incorrectAnswer3].filter(Boolean);
        const allAnswers = prepareAnswerOptions([correct, ...incorrect]);

        setQuestionText(question);
        setAnswerChoices(allAnswers);
        setSelectedAnswer('');
        setIsAnswered(false);
        return;
      }
    }
    
    // Load a normal question
    loadNormalQuestion(index, indices, questions);
  }, [prepareAnswerOptions, selectedQuestionIndices, filteredQuestions, allQuestions, pendingQuestions, votedPendingQuestions, justCompletedOriginal, editPairOriginal]);

  const loadNormalQuestion = (index, indices, questions) => {
    const qData = questions[indices[index]];
    setCurrentQuestion(qData);
    setIsPendingQuestion(false);
    setPendingQuestionType(null);
    
    const question = qData.question;
    const correct = qData.correctAnswer;
    const incorrect = [qData.incorrectAnswer1, qData.incorrectAnswer2, qData.incorrectAnswer3].filter(Boolean);
    const allAnswers = prepareAnswerOptions([correct, ...incorrect]);
    
    setQuestionText(question);
    setAnswerChoices(allAnswers);
    setSelectedAnswer('');
    setIsAnswered(false);
  };

  const generateQuestions = useCallback((topicVal, lectureVal, n, questionsArray = allQuestions) => {
    const filtered = questionsArray.filter(q => {
      const topicMatch = q.topic?.toString().toLowerCase() === topicVal;
      const lectureMatch = lectureVal === 'All' || String(q.lecture) === lectureVal;
      return topicMatch && lectureMatch;
    });
    
    setFilteredQuestions(filtered);
    const total = filtered.length;
    let count = n;
    
    if (!n || n === 'All' || n > total) {
      count = total;
    }
    
    let indices = [];
    while (indices.length < count) {
      const rand = Math.floor(Math.random() * total);
      if (!indices.includes(rand)) {
        indices.push(rand);
      }
    }
    
    setSelectedQuestionIndices(indices);
    setCurrentIndex(0);
    setAttempts([]);
    setShowReview(false);
    setIsPendingQuestion(false);
    setPendingQuestionType(null);
    setEditPairOriginal(null);
    setJustCompletedOriginal(false);
    
    // Update available lectures for the new topic
    updateAvailableLectures(topicVal, questionsArray);
    
    // Fetch pending questions for the new topic
    fetchPendingQuestions(topicVal);
    
    if (indices.length > 0) {
      loadQuestion(0, indices, filtered);
    }
  }, [allQuestions, loadQuestion, updateAvailableLectures]);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    // Check for admin URL param and persist to localStorage
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin')) {
      localStorage.setItem('qAdmin', 'true');
    }
    if (localStorage.getItem('qAdmin') === 'true') {
      setIsAdminEnabled(true);
    }

    fetch('/explanations.json')
      .then(r => r.json())
      .then(data => { if (isMounted) setExplanations(data); })
      .catch(() => {});

    const initialLoad = async () => {
      if (isMounted) {
        await fetchQuestionsFromDB();
        // Initial pending questions fetch will happen in generateQuestions
      }
    };

    initialLoad();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load questions for review mode
  useEffect(() => {
    if (reviewMode && allQuestions.length > 0) {
      const filtered = allQuestions.filter(q => {
        const topicMatch = q.topic?.toString().toLowerCase() === topic;
        const lectureMatch = lecture === 'All' || String(q.lecture) === lecture;
        return topicMatch && lectureMatch;
      });
      
      // Prepare questions with randomized answers
      const preparedQuestions = filtered.map(q => {
        const correct = q.correctAnswer;
        const incorrect = [q.incorrectAnswer1, q.incorrectAnswer2, q.incorrectAnswer3].filter(Boolean);
        const allAnswers = prepareAnswerOptions([correct, ...incorrect]);
        return {
          ...q,
          preparedAnswers: allAnswers
        };
      });
      
      // Sort by lecture number if available
      preparedQuestions.sort((a, b) => {
        const lectureA = parseInt(a.lecture) || 0;
        const lectureB = parseInt(b.lecture) || 0;
        if (lectureA !== lectureB) return lectureA - lectureB;
        
        // Then by vote score
        const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
        const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
        return scoreB - scoreA;
      });
      
      setReviewQuestions(preparedQuestions);
    }
  }, [reviewMode, topic, lecture, allQuestions, prepareAnswerOptions]);

  // Toggle review mode
  const toggleReviewMode = () => {
    setReviewMode(!reviewMode);
    setExpandedQuestions(new Set());
    setReviewAnswers({});
    
    if (!reviewMode) {
      // Entering review mode - load questions for current topic
      const filtered = allQuestions.filter(q => {
        const topicMatch = q.topic?.toString().toLowerCase() === topic;
        const lectureMatch = lecture === 'All' || String(q.lecture) === lecture;
        return topicMatch && lectureMatch;
      });
      
      const preparedQuestions = filtered.map(q => {
        const correct = q.correctAnswer;
        const incorrect = [q.incorrectAnswer1, q.incorrectAnswer2, q.incorrectAnswer3].filter(Boolean);
        const allAnswers = prepareAnswerOptions([correct, ...incorrect]);
        return {
          ...q,
          preparedAnswers: allAnswers
        };
      });
      
      preparedQuestions.sort((a, b) => {
        const lectureA = parseInt(a.lecture) || 0;
        const lectureB = parseInt(b.lecture) || 0;
        if (lectureA !== lectureB) return lectureA - lectureB;
        
        const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
        const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
        return scoreB - scoreA;
      });
      
      setReviewQuestions(preparedQuestions);
    }else{
      generateQuestions(topic, lecture, numQuestions || allQuestions.length);
    }
  };

  // Handle question click in review mode
  const handleReviewQuestionClick = (questionId) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Handle answer selection in review mode
  const handleReviewAnswerSelect = (questionId, answer) => {
    setReviewAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const fetchQuestionsFromDB = async () => {
    try {
      const data = await readMirror(APPROVED_KEY);

      if (data && data.questions) {
        setAllQuestions(data.questions);
        setLoadState('ready');
        
        // Get unique topics
        const topics = [...new Set(
          data.questions
            .map(q => q.topic)
            .filter(topic => typeof topic === 'string' && topic.trim() !== '')
            .map(topic => topic.toString().toLowerCase())
        )];
        
        if (topics.length > 0) {
          const selectedTopic = topics[Math.floor(topics.length * Math.random())];
          setTopic(selectedTopic.trim());
          updateAvailableLectures(selectedTopic, data.questions);
          generateQuestions(selectedTopic, 'All', data.questions.length, data.questions);
        }
      } else {
        setLoadState('error');
      }
    } catch (err) {
      console.error('Error loading questions:', err);
      setLoadState('error');
    }
  };

  // Raw pending queue straight off the API. The quiz flow and the admin panel both read
  // it, but want different slices of it, so the filtering stays with each caller.
  const getPendingQuestions = async () => {
    const data = await readMirror(PENDING_KEY);
    return data && data.questions ? data.questions : null;
  };

  const fetchPendingQuestions = async (topicFilter = null) => {
    try {
      const questions = await getPendingQuestions();
      if (questions) {
        // Only show pending questions matching the current topic AND that the user
        // hasn't already voted on.
        const forTopic = (topicFilter || topic).toLowerCase();
        setPendingQuestions(questions.filter(q =>
          q.topic?.toString().toLowerCase() === forTopic &&
          !votedPendingQuestions[q.questionId]
        ));
      }
    } catch (err) {
      console.error('Error loading pending questions:', err);
    }
  };

  const fetchAdminPendingQuestions = async () => {
    setAdminLoading(true);
    try {
      const questions = await getPendingQuestions();
      if (questions) setAdminPendingQuestions(questions);
    } catch (err) {
      console.error('Error loading admin pending questions:', err);
    }
    setAdminLoading(false);
  };

  // Approve or reject from the admin panel. The server refuses without the admin token, which
  // is typed once into the panel and kept in this browser.
  const adminModerate = async (questionId, action) => {
    setAdminError('');
    try {
      await call('moderate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({ questionId, action })
      });
      await fetchAdminPendingQuestions();
      if (action === 'approve') await fetchQuestionsFromDB();
    } catch (err) {
      if (err.status === 401) {
        try { localStorage.removeItem(ADMIN_TOKEN_KEY); } catch { /* private mode */ }
        setAdminToken('');
        setAdminError('That admin token was not accepted.');
      } else {
        setAdminError(err.message);
        await fetchAdminPendingQuestions();
      }
    }
  };

  const saveAdminToken = () => {
    const token = adminTokenDraft.trim();
    if (!token) return;
    try { localStorage.setItem(ADMIN_TOKEN_KEY, token); } catch { /* private mode */ }
    setAdminToken(token);
    setAdminTokenDraft('');
    setAdminError('');
  };

  const toggleAdminMode = () => {
    const entering = !adminMode;
    setAdminMode(entering);
    if (entering) fetchAdminPendingQuestions();
  };

  const voteOnPendingQuestion = async (questionId, voteType, isEditImprovement = false) => {
    try {
      // For edits, voteType might be 'better' or 'worse'
      // For new questions, it's 'approve' or 'reject'
      
      // Get current vote counts from the pending question
      const pendingQ = pendingQuestions.find(q => q.questionId === questionId);
      if (!pendingQ) return;
      
      // Update vote counts locally
      let newApproveCount = pendingQ.approveCount || 0;
      let newRejectCount = pendingQ.rejectCount || 0;
      
      if (voteType === 'approve' || voteType === 'better') {
        newApproveCount++;
      } else {
        newRejectCount++;
      }
      
      // Update local storage to remember this vote
      const newVoted = { ...votedPendingQuestions };
      newVoted[questionId] = voteType;
      setVotedPendingQuestions(newVoted);
      localStorage.setItem('votedPendingQuestions', JSON.stringify(newVoted));
      
      // Update the pending question's counts locally
      setPendingQuestions(prev => prev.map(q => 
        q.questionId === questionId 
          ? { ...q, approveCount: newApproveCount, rejectCount: newRejectCount }
          : q
      ));
      
      // The server counts the vote and, at the threshold, approves or rejects the question
      // before it answers. A 409 means this one was already voted on from here, or already
      // decided; either way there is nothing left to do but move on.
      let result = null;
      try {
        result = await post('vote-pending-question', { questionId, vote: voteType, voter: voterId() });
      } catch (err) {
        if (err.status !== 409) throw err;
      }

      if (result && result.outcome === 'approved') {
        await fetchQuestionsFromDB();
        alert(isEditImprovement ? 'Edit approved and applied!' : 'Question approved and added to the database!');
      } else if (result && result.outcome === 'rejected') {
        alert(isEditImprovement ? 'Edit rejected by the community.' : 'Question rejected by the community.');
      }

      // Remove from pending questions list
      setPendingQuestions(prev => prev.filter(q => q.questionId !== questionId));
      
      // Only move to next question if this is a pending question that was answered
      if (isAnswered) {
        handleNextQuestion();
      }
      
    } catch (error) {
      console.error('Error voting on pending question:', error);
      alert('Failed to submit vote. Please try again.');
    }
  };

  const handleSubmitAnswer = () => {
    const correctAnswer = currentQuestion.correctAnswer;
    setIsAnswered(true);
    
    // Only record attempt for non-pending questions
    if (!isPendingQuestion) {
      setAttempts(prev => [...prev, {
        question: currentQuestion.question,
        chosen: selectedAnswer,
        correct: correctAnswer
      }]);
      
      // If this was the original in an edit pair, set flag to load the edit next
      if (editPairOriginal && currentQuestion.questionId === editPairOriginal.questionId) {
        setJustCompletedOriginal(true);
      }
    }
  };

  const handleNextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    loadQuestion(currentIndex + 1);
  };

  const handleReset = () => {
    setShowReview(false);
    setAttempts([]);
    generateQuestions(topic, lecture, numQuestions || allQuestions.length);
  };

  const handleTextareaChange = (e, field) => {
    e.target.style.height = e.target.scrollHeight + 'px';
    setModalData({...modalData, [field]: e.target.value});
  };

  const openSubmitModal = (mode = 'new', questionOverride = null) => {
    const q = questionOverride || currentQuestion;

    if (mode === 'edit' && q) {
      // If there's already a pending edit for this question, show it for voting instead
      const existingEdit = pendingQuestions.find(p =>
        p.type === 'edit' &&
        p.originalQuestionId === q.questionId &&
        !votedPendingQuestions[p.questionId]
      );

      if (existingEdit) {
        setReviewMode(false);
        setCurrentQuestion(existingEdit);
        setEditPairOriginal(q);
        setIsPendingQuestion(true);
        setPendingQuestionType('edit');
        setQuestionText(existingEdit.question);
        setAnswerChoices(prepareAnswerOptions(
          [existingEdit.correctAnswer, existingEdit.incorrectAnswer1,
           existingEdit.incorrectAnswer2, existingEdit.incorrectAnswer3].filter(Boolean)
        ));
        setSelectedAnswer('');
        setIsAnswered(false);
        return;
      }

      // No pending edit — open the submit modal pre-filled
      setModalMode(mode);
      setEditingQuestion(q);
      setModalData({
        topic: q.topic?.toString().toLowerCase() || topic,
        lecture: q.lecture || '',
        question: q.question || questionText,
        correctAnswer: q.correctAnswer || '',
        incorrectAnswer1: q.incorrectAnswer1 || '',
        incorrectAnswer2: q.incorrectAnswer2 || '',
        incorrectAnswer3: q.incorrectAnswer3 || ''
      });
    } else {
      setModalMode(mode);
      setEditingQuestion(null);
      setModalData({
        topic: topic,
        lecture: '',
        question: '',
        correctAnswer: '',
        incorrectAnswer1: '',
        incorrectAnswer2: '',
        incorrectAnswer3: ''
      });
    }

    setShowModal(true);
    setTimeout(() => {
      document.querySelectorAll('.modal textarea').forEach(t => {
        t.style.height = t.scrollHeight + 'px';
      });
    }, 0);
  };

  const submitModalQuestion = async () => {
    if (!modalData.question || !modalData.correctAnswer) {
      alert('Please complete all required fields.');
      return;
    }
    
    try {
      const endpoint = modalMode === 'edit' ? 'edit-question' : 'submit-question';
      const payload = {
        topic: modalData.topic,
        lecture: modalData.lecture,
        question: modalData.question,
        correctAnswer: modalData.correctAnswer,
        incorrectAnswer1: modalData.incorrectAnswer1,
        incorrectAnswer2: modalData.incorrectAnswer2,
        incorrectAnswer3: modalData.incorrectAnswer3,
        type: modalMode === 'edit' ? 'edit' : 'new'
      };
      
      if (modalMode === 'edit' && editingQuestion) {
        payload.originalQuestionId = editingQuestion.questionId;
      }
      
      await post(endpoint, payload);
      alert(modalMode === 'edit' ? 'Question edit submitted for review!' : 'Question submitted for review!');
      setShowModal(false);
      fetchPendingQuestions();
    } catch (error) {
      if (error.status === 409) {
        alert(error.message);
        setShowModal(false);
      } else if (error.status === 400) {
        alert(error.message);
      } else {
        alert('Failed to submit question: ' + error.message);
      }
    }
  };

  const handleVote = async (voteType) => {
    if (!currentQuestion || !currentQuestion.questionId) return;
    
    // If this is a pending question, use the pending vote system
    if (isPendingQuestion) {
      // Only allow voting after answering the question
      if (!isAnswered) return;
      
      const isEditVote = pendingQuestionType === 'edit';
      await voteOnPendingQuestion(currentQuestion.questionId, voteType, isEditVote);
      return;
    }
    
    // Normal voting behavior for approved questions - instant visual update
    const questionId = currentQuestion.questionId;
    const currentVote = votedQuestions[questionId];
    const isUnvoting = currentVote === voteType;
    
    // Update UI immediately
    const newVoted = { ...votedQuestions };
    if (isUnvoting) {
      delete newVoted[questionId];
    } else {
      newVoted[questionId] = voteType;
    }
    setVotedQuestions(newVoted);
    localStorage.setItem('votedQuestions', JSON.stringify(newVoted));
    
    // Update local state
    setAllQuestions(prevQuestions => prevQuestions.map(q => {
      if (q.questionId === questionId) {
        if (isUnvoting) {
          if (voteType === 'good') {
            return { ...q, upvotes: Math.max(0, (q.upvotes || 0) - 1) };
          } else {
            return { ...q, downvotes: Math.max(0, (q.downvotes || 0) - 1) };
          }
        } else if (currentVote && currentVote !== voteType) {
          if (voteType === 'good') {
            return { 
              ...q, 
              upvotes: (q.upvotes || 0) + 1,
              downvotes: Math.max(0, (q.downvotes || 0) - 1)
            };
          } else {
            return { 
              ...q, 
              upvotes: Math.max(0, (q.upvotes || 0) - 1),
              downvotes: (q.downvotes || 0) + 1
            };
          }
        } else {
          if (voteType === 'good') {
            return { ...q, upvotes: (q.upvotes || 0) + 1 };
          } else {
            return { ...q, downvotes: (q.downvotes || 0) + 1 };
          }
        }
      }
      return q;
    }));
    
    // Update current question for UI
    setCurrentQuestion(prevQuestion => {
      if (!prevQuestion || prevQuestion.questionId !== questionId) return prevQuestion;
      
      let updatedQuestion = { ...prevQuestion };
      if (isUnvoting) {
        if (voteType === 'good') {
          updatedQuestion.upvotes = Math.max(0, (updatedQuestion.upvotes || 0) - 1);
        } else {
          updatedQuestion.downvotes = Math.max(0, (updatedQuestion.downvotes || 0) - 1);
        }
      } else if (currentVote && currentVote !== voteType) {
        if (voteType === 'good') {
          updatedQuestion.upvotes = (updatedQuestion.upvotes || 0) + 1;
          updatedQuestion.downvotes = Math.max(0, (updatedQuestion.downvotes || 0) - 1);
        } else {
          updatedQuestion.upvotes = Math.max(0, (updatedQuestion.upvotes || 0) - 1);
          updatedQuestion.downvotes = (updatedQuestion.downvotes || 0) + 1;
        }
      } else {
        if (voteType === 'good') {
          updatedQuestion.upvotes = (updatedQuestion.upvotes || 0) + 1;
        } else {
          updatedQuestion.downvotes = (updatedQuestion.downvotes || 0) + 1;
        }
      }
      return updatedQuestion;
    });
    
    // Send to server quietly in the background (no await)
    // `previous` lets the server move a changed or withdrawn vote rather than add another.
    post('vote-question', {
      questionId,
      vote: isUnvoting ? null : voteType,
      previous: currentVote || null
    }).catch(error => {
      console.error('Error recording vote:', error);
    });
  };

  // Review Screen Component
  const ReviewScreen = () => {
    const correctCount = attempts.filter(a => a.chosen === a.correct).length;
    const total = attempts.length;
    
    return (
      <div className="review-screen">
        <h2>{topic.charAt(0).toUpperCase() + topic.slice(1)} Review</h2>
        <div style={{ marginBottom: '16px', fontWeight: '600' }}>
          Score: {correctCount} / {total}
        </div>
        
        {attempts.map((attempt, idx) => (
          <div key={idx} className="review-item">
            <div className="review-q">
              Q{idx + 1}. {attempt.question}
            </div>
            <div className={`review-a ${attempt.chosen !== attempt.correct ? 'wrong' : ''}`}>
              Your answer: {attempt.chosen || '(no selection)'}
            </div>
            {attempt.chosen !== attempt.correct && (
              <div className="review-correct">
                Correct: {attempt.correct}
              </div>
            )}
          </div>
        ))}
        
        <button className="review-reset" onClick={handleReset}>
          Reset
        </button>
      </div>
    );
  };

  // Submit / Edit question modal — shared by the review-mode and main returns
  const submitModal = showModal && (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && setShowModal(false)}>
      <div className="modal-content">
        <span className="close-button" onClick={() => setShowModal(false)}>&times;</span>
        <h2>{modalMode === 'edit' ? 'Edit Question' : 'Submit a New Question'}</h2>

        <div className="dropdown-row">
          <select
            value={modalData.topic}
            onChange={(e) => setModalData({...modalData, topic: e.target.value})}
          >
            <option value="aero">Aero</option>
            <option value="engines">Engines</option>
            <option value="frr">FR&R</option>
            <option value="nav">Nav</option>
            <option value="weather">Weather</option>
            <option value="ground">Ground School</option>
          </select>
          <input
            type="text"
            placeholder="Enter Lecture Number (optional)"
            value={modalData.lecture}
            onChange={(e) => setModalData({...modalData, lecture: e.target.value})}
          />
        </div>

        <div className="qa-box question-area">
          <label>
            <textarea
              placeholder="Enter your question here..."
              value={modalData.question}
              onChange={(e) => handleTextareaChange(e, 'question')}
            />
          </label>
        </div>

        <div className="qa-box">
          <form id="submitAnswerForm" className="radio-list">
            <label>
              <textarea
                placeholder="Correct Answer"
                value={modalData.correctAnswer}
                onChange={(e) => handleTextareaChange(e, 'correctAnswer')}
              />
            </label>
            <label>
              <textarea
                placeholder="Incorrect Answer 1"
                value={modalData.incorrectAnswer1}
                onChange={(e) => handleTextareaChange(e, 'incorrectAnswer1')}
              />
            </label>
            <label>
              <textarea
                placeholder="Incorrect Answer 2"
                value={modalData.incorrectAnswer2}
                onChange={(e) => handleTextareaChange(e, 'incorrectAnswer2')}
              />
            </label>
            <label>
              <textarea
                placeholder="Incorrect Answer 3"
                value={modalData.incorrectAnswer3}
                onChange={(e) => handleTextareaChange(e, 'incorrectAnswer3')}
              />
            </label>
          </form>
        </div>

        <button className="submitBtn" onClick={submitModalQuestion}>
          {modalMode === 'edit' ? 'Submit Edit' : 'Submit Question'}
        </button>
      </div>
    </div>
  );

  if (showReview) {
    return (
      <>
        <div className="page-container">
          <ReviewScreen />
        </div>
      </>
    );
  }

  // Review Mode UI
  if (reviewMode) {
    return (
      <>
      <div className="questions-container review-mode-container">
        {/* Review Mode Header */}
        <div className="review-mode-header">
          <button 
            className="review-mode-toggle"
            onClick={toggleReviewMode}
            style={{
              marginBottom: '15px',
              padding: '10px 20px',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              width: '100%'
            }}
          >
            Enter Test Mode
          </button>
          
          <div className="review-mode-controls" style={{ marginBottom: '20px' }}>
            <select 
              value={topic} 
              onChange={(e) => {
                setTopic(e.target.value);
                setLecture('All'); // Reset lecture to All when topic changes
                updateAvailableLectures(e.target.value);
              }}
              style={{
                padding: '10px 15px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #ccc'
              }}
            >
              <option value="aero">Aero</option>
              <option value="engines">Engines</option>
              <option value="frr">FR&R</option>
              <option value="nav">Nav</option>
              <option value="weather">Weather</option>
              <option value="ground">Ground School</option>
            </select>
            
            <select 
              value={lecture}
              onChange={(e) => setLecture(e.target.value)}
              style={{
                padding: '10px 15px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #ccc',
                marginLeft: '10px'
              }}
            >
              <option value="All">All Lectures</option>
              {availableLectures.map(lec => (
                <option key={lec} value={lec}>Lecture {lec}</option>
              ))}
            </select>
            
            <span style={{ 
              marginLeft: '20px', 
              fontSize: '16px', 
              color: '#666' 
            }}>
              {reviewQuestions.length} questions available
            </span>
          </div>
        </div>
        
        {/* Review Questions List */}
        <div className="review-questions-list" style={{
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          paddingRight: '10px'
        }}>
          {reviewQuestions.map((question, idx) => (
            <div 
              key={question.questionId}
              className="review-question-item"
              style={{
                marginBottom: '20px',
                border: '2px solid #ddd',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Question Header */}
              <div 
                className="review-question-header"
                onClick={() => handleReviewQuestionClick(question.questionId)}
                style={{
                  padding: '15px',
                  backgroundColor: expandedQuestions.has(question.questionId) ? '#f0f0f0' : '#f9f9f9',
                  cursor: 'pointer',
                  borderBottom: expandedQuestions.has(question.questionId) ? '1px solid #ddd' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontWeight: 'bold',
                    marginRight: '10px',
                    color: '#01202C'
                  }}>
                    Q{idx + 1}
                    {question.lecture && ` (Lecture ${question.lecture})`}
                  </span>
                  <div style={{ 
                    marginTop: '8px',
                    fontSize: '16px',
                    lineHeight: '1.5'
                  }}>
                    {question.question}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginLeft: '15px'
                }}>
                  <span style={{
                    fontSize: '20px',
                    transform: expandedQuestions.has(question.questionId) ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.3s'
                  }}>
                    ▼
                  </span>
                  {question.upvotes !== undefined && (
                    <span style={{
                      marginTop: '5px',
                      fontSize: '12px',
                      color: ((question.upvotes || 0) - (question.downvotes || 0)) >= 0 ? '#4CAF50' : '#f44336',
                      fontWeight: 'bold'
                    }}>
                      {((question.upvotes || 0) - (question.downvotes || 0)) >= 0 ? '+' : ''}
                      {(question.upvotes || 0) - (question.downvotes || 0)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Answers (shown when expanded) */}
              {expandedQuestions.has(question.questionId) && (
                <div 
                  className="review-answers"
                  style={{
                    padding: '15px',
                    backgroundColor: '#fff'
                  }}
                >
                  {question.preparedAnswers.map((answer, ansIdx) => {
                    const isSelected = reviewAnswers[question.questionId] === answer;
                    const isCorrect = answer === question.correctAnswer;
                    const showResult = isSelected;

                    return (
                      <div
                        key={ansIdx}
                        onClick={() => handleReviewAnswerSelect(question.questionId, answer)}
                        style={{
                          padding: '10px 15px',
                          margin: '8px 0',
                          border: '2px solid',
                          borderColor: showResult && isCorrect ? '#4CAF50' :
                                      showResult && !isCorrect ? '#f44336' :
                                      '#ddd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: showResult && isCorrect ? '#e8f5e9' :
                                         showResult && !isCorrect ? '#ffebee' :
                                         isSelected ? '#f5f5f5' : 'white',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            marginRight: '10px',
                            fontWeight: 'bold',
                            color: showResult && isCorrect ? '#4CAF50' :
                                   showResult && !isCorrect ? '#f44336' :
                                   '#666'
                          }}>
                            {String.fromCharCode(65 + ansIdx)}.
                          </span>
                          <span style={{
                            flex: 1,
                            color: showResult && !isCorrect ? '#999' : '#333'
                          }}>
                            {answer}
                          </span>
                          {showResult && isCorrect && (
                            <span style={{
                              color: '#4CAF50',
                              fontWeight: 'bold',
                              marginLeft: '10px'
                            }}>
                              ✓
                            </span>
                          )}
                          {showResult && !isCorrect && (
                            <span style={{
                              color: '#f44336',
                              fontWeight: 'bold',
                              marginLeft: '10px'
                            }}>
                              ✗
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => openSubmitModal('edit', question)}
                    style={{
                      marginTop: '12px',
                      padding: '8px 18px',
                      backgroundColor: '#01202C',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Edit Question
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {reviewQuestions.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '50px',
              color: '#999'
            }}>
              No questions available for this topic
            </div>
          )}
        </div>
      </div>

      {submitModal}
      </>
    );
  }

  // Admin panel
  if (adminMode) {
    // Group pending questions by originalQuestionId; standalone new questions get their own group
    const groups = {};
    adminPendingQuestions.forEach(q => {
      const key = q.originalQuestionId || q.questionId;
      if (!groups[key]) groups[key] = { originalId: q.originalQuestionId || null, edits: [] };
      groups[key].edits.push(q);
    });

    // Sort each group by net votes descending
    Object.values(groups).forEach(g => {
      g.edits.sort((a, b) =>
        ((b.approveCount || 0) - (b.rejectCount || 0)) - ((a.approveCount || 0) - (a.rejectCount || 0))
      );
    });

    const groupList = Object.entries(groups).sort((a, b) => b[1].edits.length - a[1].edits.length);

    return (
      <div className="questions-container review-mode-container">
        <button
          className="review-mode-toggle"
          onClick={toggleAdminMode}
          style={{ marginBottom: '15px', padding: '10px 20px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '100%', backgroundColor: '#5a0000' }}
        >
          Exit Admin Panel
        </button>

        <h3 style={{ marginBottom: '10px', color: '#333' }}>
          Admin Panel — {adminLoading ? 'Loading...' : `${adminPendingQuestions.length} pending questions`}
        </h3>

        {!adminToken && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', color: '#555', fontSize: '13px' }}>
            <input
              type="password"
              placeholder="Admin token"
              value={adminTokenDraft}
              onChange={(e) => setAdminTokenDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveAdminToken()}
            />
            <button onClick={saveAdminToken}>Save</button>
            <span>Approve and Reject need the admin token. It is kept in this browser.</span>
          </div>
        )}
        {adminError && <div style={{ marginBottom: '12px', color: '#c62828', fontSize: '14px' }}>{adminError}</div>}

        <div style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: '8px' }}>
          {groupList.map(([groupKey, group]) => {
            // Find the current approved/replaced original for context
            const originalApproved = allQuestions.find(q => q.questionId === groupKey);
            const groupLabel = originalApproved
              ? originalApproved.question
              : `Original ID: ${groupKey}`;

            return (
              <div key={groupKey} style={{ marginBottom: '28px', border: '2px solid #ccc', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Group header: the original question */}
                <div style={{ padding: '12px 15px', backgroundColor: '#f0f4f8', borderBottom: '1px solid #ccc' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    {group.edits.length} competing edit{group.edits.length !== 1 ? 's' : ''} •{' '}
                    {group.originalId ? `Editing original ${group.originalId}` : 'New question submission'}
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#01202C', fontSize: '14px' }}>
                    {originalApproved ? `ORIGINAL: ${groupLabel}` : group.edits[0]?.type === 'new' ? 'NEW QUESTION' : `(original no longer approved — may be replaced)`}
                  </div>
                  {originalApproved && (
                    <div style={{ fontSize: '13px', color: '#333', marginTop: '4px' }}>
                      ✓ Correct: {originalApproved.correctAnswer}
                    </div>
                  )}
                </div>

                {/* Each pending edit */}
                {group.edits.map(q => {
                  const net = (q.approveCount || 0) - (q.rejectCount || 0);
                  return (
                    <div key={q.questionId} style={{ padding: '12px 15px', borderBottom: '1px solid #eee', backgroundColor: net >= 2 ? '#f0fff4' : net <= -2 ? '#fff0f0' : 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#222', marginBottom: '6px' }}>{q.question}</div>
                          <div style={{ fontSize: '13px', color: '#2e7d32', marginBottom: '3px' }}>✓ {q.correctAnswer}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {new Date(q.submittedAt).toLocaleDateString()} •{' '}
                            <span style={{ color: net > 0 ? '#2e7d32' : net < 0 ? '#c62828' : '#666', fontWeight: 'bold' }}>
                              {net > 0 ? '+' : ''}{net} net ({q.approveCount || 0}✓ / {q.rejectCount || 0}✗)
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '80px' }}>
                          <button
                            onClick={() => adminModerate(q.questionId, 'approve')}
                            style={{ padding: '6px 12px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => adminModerate(q.questionId, 'reject')}
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

          {!adminLoading && adminPendingQuestions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              No pending questions — queue is clear!
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`questions-container ${isPendingQuestion ? 'pending-question-mode' : ''} ${editPairOriginal ? 'edit-pair-mode' : ''}`}>
        {/* Review Mode Toggle Button */}
        <button
          className="review-mode-toggle"
          onClick={toggleReviewMode}
          style={{
            marginBottom: '15px',
            padding: '10px 20px',
            backgroundColor: '#01202C',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            width: '100%'
          }}
        >
          Enter Review Mode
        </button>

        {isAdminEnabled && (
          <button
            onClick={toggleAdminMode}
            style={{ marginBottom: '10px', padding: '7px 16px', backgroundColor: '#5a0000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', width: '100%' }}
          >
            Admin Panel ({adminLoading ? '…' : adminPendingQuestions.length} pending)
          </button>
        )}

        <div className="dropdown-row">
          <select 
            value={topic} 
            onChange={(e) => {
              setTopic(e.target.value);
              setLecture('All'); // Reset lecture to All when topic changes
              generateQuestions(e.target.value, 'All', numQuestions);
            }}
          >
            <option value="aero">Aero</option>
            <option value="engines">Engines</option>
            <option value="frr">FR&R</option>
            <option value="nav">Nav</option>
            <option value="weather">Weather</option>
            <option value="ground">Ground School</option>
          </select>
          
          <select 
            value={lecture}
            onChange={(e) => {
              setLecture(e.target.value);
              generateQuestions(topic, e.target.value, numQuestions);
            }}
          >
            <option value="All">All Lectures</option>
            {availableLectures.map(lec => (
              <option key={lec} value={lec}>Lecture {lec}</option>
            ))}
          </select>
          
          <select 
            value={numQuestions}
            onChange={(e) => {
              setNumQuestions(e.target.value);
              generateQuestions(topic, lecture, parseInt(e.target.value));
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
            <button
              className="submitBtn"
              onClick={() => { setLoadState('loading'); fetchQuestionsFromDB(); }}
            >
              Try again
            </button>
          </div>
        )}

        {questionText && (
          <>
            <div className="qa-container">
              {/* Edit pair notification for original */}
              {editPairOriginal && !isPendingQuestion && (
                <div style={{ 
                  padding: '10px',
                  marginBottom: '15px',
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '5px',
                  color: '#1565c0',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  Original Question - An edited version will follow
                </div>
              )}
              
              {/* Pending question notification */}
              {isPendingQuestion && pendingQuestionType === 'new' && (
                <div style={{ 
                  padding: '10px',
                  marginBottom: '15px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '5px',
                  color: '#856404',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  Community Review: New Question - Please vote after answering
                  {currentQuestion && currentQuestion.approveCount !== undefined && (
                    <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                      Current: {currentQuestion.approveCount || 0} approvals, {currentQuestion.rejectCount || 0} rejections
                      (needs net +5 for approval)
                    </div>
                  )}
                </div>
              )}
              
              {/* Edit improvement notification */}
              {isPendingQuestion && pendingQuestionType === 'edit' && (
                <div style={{ 
                  padding: '10px',
                  marginBottom: '15px',
                  backgroundColor: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '5px',
                  color: '#2e7d32',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
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
              <div className="qa-box question-area">
                {questionText}
              </div>
              
              <div className="qa-box">
                <div className="radio-list">
                  {answerChoices.map((choice, idx) => (
                    <label 
                      key={idx}
                      className={
                        isAnswered && choice === currentQuestion.correctAnswer ? 'correct' :
                        isAnswered && selectedAnswer === choice && choice !== currentQuestion.correctAnswer ? 'wrong' :
                        !isAnswered && selectedAnswer === choice ? 'selected' : ''
                      }
                      onClick={() => !isAnswered && setSelectedAnswer(choice)}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={choice}
                        checked={selectedAnswer === choice}
                        onChange={() => {}}
                        disabled={isAnswered}
                      />
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
                  <button className="submitBtn" onClick={handleSubmitAnswer}>
                    Submit
                  </button>
                ) : !isPendingQuestion ? (
                  <button className="submitBtn" onClick={handleNextQuestion}>
                    {currentIndex + 1 >= selectedQuestionIndices.length ? 'Review' : 'Next Question'}
                  </button>
                ) : null}
              </div>
            </div>
            
            {/* Weather Figure PDF Button */}
            {topic === 'weather' && (
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <button 
                  className="submitBtn" 
                  onClick={() => setShowPdfModal(true)}
                  style={{ 
                    fontSize: '0.9em', 
                    padding: '8px 16px'
                  }}
                >
                  View Weather Figures
                </button>
              </div>
            )}
            
            {/* Vote Buttons - Required for pending questions after submit */}
            {(!isPendingQuestion || isAnswered) && (
              <div className="feedback-row">
                <button 
                  className={`thumb-btn up ${
                    isPendingQuestion 
                      ? votedPendingQuestions[currentQuestion?.questionId] === 'approve' || votedPendingQuestions[currentQuestion?.questionId] === 'better' ? 'active' : ''
                      : votedQuestions[currentQuestion?.questionId] === 'good' ? 'active' : ''
                  }`}
                  onClick={() => handleVote(pendingQuestionType === 'edit' ? 'better' : 'good')}
                  title={
                    isPendingQuestion 
                      ? (pendingQuestionType === 'edit' ? "Better than original" : "Approve question")
                      : "Good question"
                  }
                  disabled={isPendingQuestion && votedPendingQuestions[currentQuestion?.questionId]}
                >
                  <img src="/images/thumb.png" alt="Thumbs up" />
                  {isPendingQuestion && (
                    <span style={{ 
                      display: 'block', 
                      fontSize: '12px', 
                      marginTop: '5px',
                      color: 'white'
                    }}>
                      {pendingQuestionType === 'edit' ? 'Better' : 'Approve'}
                    </span>
                  )}
                </button>
                {!isPendingQuestion && currentQuestion && (
                  <span className={`vote-score ${((currentQuestion.upvotes || 0) - (currentQuestion.downvotes || 0)) >= 0 ? 'positive' : 'negative'}`}>
                    {((currentQuestion.upvotes || 0) - (currentQuestion.downvotes || 0)) >= 0 ? '+' : ''}
                    {(currentQuestion.upvotes || 0) - (currentQuestion.downvotes || 0)}
                  </span>
                )}
                <button 
                  className={`thumb-btn down ${
                    isPendingQuestion 
                      ? votedPendingQuestions[currentQuestion?.questionId] === 'reject' || votedPendingQuestions[currentQuestion?.questionId] === 'worse' ? 'active' : ''
                      : votedQuestions[currentQuestion?.questionId] === 'bad' ? 'active' : ''
                  }`}
                  onClick={() => handleVote(pendingQuestionType === 'edit' ? 'worse' : 'bad')}
                  title={
                    isPendingQuestion 
                      ? (pendingQuestionType === 'edit' ? "Worse than original" : "Reject question")
                      : "Bad question"
                  }
                  disabled={isPendingQuestion && votedPendingQuestions[currentQuestion?.questionId]}
                >
                  <img src="/images/thumb-down.png" alt="Thumbs down" />
                  {isPendingQuestion && (
                    <span style={{ 
                      display: 'block', 
                      fontSize: '12px', 
                      marginTop: '5px',
                      color: 'white'
                    }}>
                      {pendingQuestionType === 'edit' ? 'Worse' : 'Reject'}
                    </span>
                  )}
                </button>

              </div>
            )}

            {isPendingQuestion && pendingQuestionType === 'edit' && !votedPendingQuestions[currentQuestion?.questionId] && isAnswered && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    const newVoted = { ...votedPendingQuestions, [currentQuestion.questionId]: 'skip' };
                    setVotedPendingQuestions(newVoted);
                    localStorage.setItem('votedPendingQuestions', JSON.stringify(newVoted));
                    setPendingQuestions(prev => prev.filter(q => q.questionId !== currentQuestion.questionId));
                    handleNextQuestion();
                  }}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: 'transparent',
                    color: '#888',
                    border: '1px solid #888',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Skip
                </button>
              </div>
            )}
          </>
        )}

        {/* Edit Current Question Button - only for non-pending questions */}
        {currentQuestion && !isPendingQuestion && !editPairOriginal && (
          <button className="submitBtn" onClick={() => openSubmitModal('edit')}>
            Edit Current Question
          </button>
        )}
        
        {/* Submit New Question Button */}
        <button className="submitBtn" onClick={() => openSubmitModal('new')}>
          Submit a Question
        </button>
      </div>
      
      {submitModal}

      {/* Weather Figure PDF Modal */}
      {showPdfModal && (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && setShowPdfModal(false)}>
          <div className="modal-content" style={{ maxWidth: '95%', width: 'auto', height: '90vh', margin: '2.5vh auto', padding: '10px' }}>
            
            <span className="close-button" onClick={() => setShowPdfModal(false)}>&times;</span>
            <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Weather Figures</h2>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/Metars, Tafs, and station model.pdf';
                  link.download = 'Weather_Figures.pdf';
                  link.click();
                }}
              >
                Download PDF
              </button>
            </div>
            
            <div style={{ width: '100%', height: 'calc(90vh - 120px)'}}>
              <iframe
                src="/Metars, Tafs, and station model.pdf"
                title="Weather Figures PDF"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none' 
                }}
              >
                <p>Your browser does not support PDFs. 
                  <a href="/Metars, Tafs, and station model.pdf" target="_blank" rel="noopener noreferrer">
                    Click here to download the PDF
                  </a>
                </p>
              </iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Questions;