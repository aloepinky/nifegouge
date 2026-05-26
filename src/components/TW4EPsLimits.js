import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TW4Cockpit from './TW4Cockpit';
import TW4Limits from './TW4Limits';
import TW4Leaderboard from './TW4Leaderboard';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

function TW4EPsLimits() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'cockpit';
  const setActiveTab = (t) => navigate(`/tw4/eps-limits/${t}`);
  const [gameMode, setGameMode] = useState('TW4_EPs');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [epsTime, setEpsTime] = useState(null);
  const [completedEPs, setCompletedEPs] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pendingResult, setPendingResult] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const elapsedRef = useRef(0);
  const completedEPsRef = useRef(false);
  const epsTimeRef = useRef(null);
  const pauseStartRef = useRef(null);
  const pauseOffsetRef = useRef(0);

  useEffect(() => {
    let interval;
    if (isGameActive && gameStartTime && !isPaused) {
      interval = setInterval(() => {
        const elapsed = Date.now() - gameStartTime - pauseOffsetRef.current;
        elapsedRef.current = elapsed;
        setElapsedTime(elapsed);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isGameActive, gameStartTime, isPaused]);

  const startGame = () => {
    setEpsTime(null);
    setCompletedEPs(false);
    completedEPsRef.current = false;
    epsTimeRef.current = null;
    setShowGameModal(false);
    pauseOffsetRef.current = 0;
    pauseStartRef.current = null;
    setIsPaused(false);
    if (gameMode === 'TW4_Limits') {
      setActiveTab('limits');
    } else {
      setActiveTab('cockpit');
    }
    setElapsedTime(0);
    elapsedRef.current = 0;
    setGameKey(k => k + 1);
    setGameStartTime(Date.now());
    setIsGameActive(true);
  };

  const pauseGame = () => {
    pauseStartRef.current = Date.now();
    setIsPaused(true);
  };

  const resumeGame = () => {
    if (pauseStartRef.current !== null) {
      pauseOffsetRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    setIsPaused(false);
  };

  const endGame = (totalMs, epsSplit, limitsSplit) => {
    setIsGameActive(false);
    setIsPaused(false);
    setPendingResult({
      testType: gameMode,
      elapsedTime: totalMs,
      epsTime: epsSplit ?? undefined,
      limitsTime: limitsSplit ?? undefined,
    });
    setShowLeaderboard(true);
  };

  const onGameComplete = () => {
    const now = Date.now();
    const total = now - gameStartTime - pauseOffsetRef.current;

    if (gameMode === 'TW4_EPs' || gameMode === 'TW4_Limits') {
      endGame(total, undefined, undefined);
    } else {
      // combined mode
      if (!completedEPsRef.current) {
        completedEPsRef.current = true;
        epsTimeRef.current = total;
        setEpsTime(total);
        setCompletedEPs(true);
        setActiveTab('limits');
      } else {
        const epsSplit = epsTimeRef.current;
        const limitsSplit = total - epsSplit;
        endGame(total, epsSplit, limitsSplit);
      }
    }
  };

  const stopGame = () => {
    setIsGameActive(false);
    setIsPaused(false);
    pauseStartRef.current = null;
    pauseOffsetRef.current = 0;
    setElapsedTime(0);
    elapsedRef.current = 0;
    setGameStartTime(null);
    setCompletedEPs(false);
    completedEPsRef.current = false;
    epsTimeRef.current = null;
    setEpsTime(null);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="sub-navbar sub-navbar--wrappable" style={{ marginBottom: 0 }}>
        <div className="sub-navbar-tabs">
          <span
            className={activeTab === 'cockpit' ? 'active' : ''}
            onClick={() => !isGameActive && setActiveTab('cockpit')}
            style={{ cursor: isGameActive ? 'default' : 'pointer' }}
          >
            EPs/Cockpit
          </span>
          <span
            className={activeTab === 'limits' ? 'active' : ''}
            onClick={() => !isGameActive && setActiveTab('limits')}
            style={{ cursor: isGameActive ? 'default' : 'pointer' }}
          >
            Limits
          </span>
        </div>
        <div className="sub-navbar-controls">
          {isGameActive ? (
            <>
              <div className="game-timer" style={{ position: 'static' }}>
                <span className="timer-label">Time: </span>
                <span className="timer-display">{formatTime(elapsedTime)}</span>
              </div>
              <button className="sub-navbar-btn" onClick={pauseGame}>Pause</button>
              <button className="sub-navbar-btn danger" onClick={stopGame}>Exit</button>
            </>
          ) : (
            <>
              <button className="sub-navbar-btn" onClick={() => setShowGameModal(true)}>Game Mode</button>
              <button
                className="sub-navbar-btn"
                onClick={() => { setPendingResult(null); setShowLeaderboard(true); }}
              >
                Leaderboard
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'cockpit' && (
        <TW4Cockpit
          key={gameKey}
          isGameActive={isGameActive && activeTab === 'cockpit'}
          onGameComplete={onGameComplete}
        />
      )}
      {activeTab === 'limits' && (
        <TW4Limits
          key={gameKey}
          isGameActive={isGameActive && activeTab === 'limits'}
          onGameComplete={onGameComplete}
        />
      )}

      {showGameModal && (
        <div className="game-modal-overlay" onClick={() => setShowGameModal(false)}>
          <div className="game-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '340px', minWidth: '300px' }}>
            <h3 style={{ marginTop: 0, color: '#01202C' }}>Game Mode</h3>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Complete EPs and/or Limits with no errors. Your time is recorded when all answers are correct.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }}>Mode</label>
              <select
                value={gameMode}
                onChange={e => setGameMode(e.target.value)}
                className="game-mode-select"
                style={{ width: '100%' }}
              >
                <option value="TW4_EPs">EPs</option>
                <option value="TW4_Limits">Limits</option>
                <option value="TW4_EPs_and_Limits">EPs &amp; Limits</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="game-button-secondary" onClick={() => setShowGameModal(false)}>Cancel</button>
              <button className="game-button-primary" onClick={startGame}>Start</button>
            </div>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <TW4Leaderboard
          pendingResult={pendingResult}
          onClose={() => { setShowLeaderboard(false); setPendingResult(null); }}
        />
      )}

      {isPaused && (
        <div className="game-modal-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
          <div className="game-modal" style={{ maxWidth: '320px', minWidth: '280px' }}>
            <h3 style={{ marginTop: 0, color: '#01202C' }}>Game Paused</h3>
            <p style={{ fontSize: '0.9em', color: '#666', margin: '0 0 16px' }}>
              Timer is stopped. Press Resume to continue.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="game-button-danger" onClick={stopGame}>Exit Game</button>
              <button className="game-button-primary" onClick={resumeGame}>Resume</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TW4EPsLimits;
