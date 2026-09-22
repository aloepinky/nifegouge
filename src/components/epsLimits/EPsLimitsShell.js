import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Leaderboard from '../leaderboard/Leaderboard';
import { formatTime } from '../leaderboard/leaderboardApi';

// The EPs/Limits page every school shares: its tab bar, Game Mode, the timer with pause, and
// the leaderboard. What sits under each tab is the school's own (Primary's cockpit, NIFE's
// one-EP-at-a-time drill, each school's limits table); a tab is told whether a game is running
// and calls `onGameComplete` when its part of the exam is all correct.
//
// A game is the exam against the clock: EPs, Limits, or both, EPs first, the way the exam is
// handed out. The time stops only when every answer is right, which is why the board needs no
// score column.
//
//   school    'NIFE' | 'Primary', the leaderboard it posts to
//   basePath  '/nife/flight'; a tab's URL is basePath/tab
//   tabs      [{ id, label }], in bar order
//   epsTab, limitsTab   which tab ids a game drives
//   renderTab(id, { isGameActive, onGameComplete })   the tab's content; remounted per game

const GAME_MODES = [
  { id: 'EPs', label: 'EPs' },
  { id: 'Limits', label: 'Limits' },
  { id: 'EPs_and_Limits', label: 'EPs & Limits' },
];

function EPsLimitsShell({ school, basePath, tabs, epsTab, limitsTab, renderTab }) {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const setActiveTab = (t) => navigate(`${basePath}/${t}`);
  const [gameMode, setGameMode] = useState('EPs');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [pendingResult, setPendingResult] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const completedEPsRef = useRef(false);
  const epsTimeRef = useRef(null);
  const pauseStartRef = useRef(null);
  const pauseOffsetRef = useRef(0);

  useEffect(() => {
    let interval;
    if (isGameActive && gameStartTime && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - gameStartTime - pauseOffsetRef.current);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isGameActive, gameStartTime, isPaused]);

  const startGame = () => {
    completedEPsRef.current = false;
    epsTimeRef.current = null;
    setShowGameModal(false);
    pauseOffsetRef.current = 0;
    pauseStartRef.current = null;
    setIsPaused(false);
    setActiveTab(gameMode === 'Limits' ? limitsTab : epsTab);
    setElapsedTime(0);
    setGameKey((k) => k + 1);
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
    setPendingResult({ mode: gameMode, elapsedTime: totalMs, epsTime: epsSplit, limitsTime: limitsSplit });
    setShowLeaderboard(true);
  };

  const onGameComplete = () => {
    const total = Date.now() - gameStartTime - pauseOffsetRef.current;
    if (gameMode !== 'EPs_and_Limits') {
      endGame(total);
    } else if (!completedEPsRef.current) {
      completedEPsRef.current = true;
      epsTimeRef.current = total;
      setActiveTab(limitsTab);
    } else {
      endGame(total, epsTimeRef.current, total - epsTimeRef.current);
    }
  };

  const stopGame = () => {
    setIsGameActive(false);
    setIsPaused(false);
    pauseStartRef.current = null;
    pauseOffsetRef.current = 0;
    setElapsedTime(0);
    setGameStartTime(null);
    completedEPsRef.current = false;
    epsTimeRef.current = null;
  };

  const gameTabs = [epsTab, limitsTab];

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="sub-navbar sub-navbar--wrappable" style={{ marginBottom: 0 }}>
        <div className="sub-navbar-tabs">
          {tabs.map((t) => (
            <span
              key={t.id}
              className={activeTab === t.id ? 'active' : ''}
              onClick={() => !isGameActive && setActiveTab(t.id)}
              style={{ cursor: isGameActive ? 'default' : 'pointer' }}
            >
              {t.label}
            </span>
          ))}
        </div>
        {gameTabs.includes(activeTab) && (
          <div className="sub-navbar-controls">
            {isGameActive ? (
              <>
                <div className="game-timer" style={{ position: 'static' }}>
                  <span className="timer-label">Time: </span>
                  <span className="timer-display">{elapsedTime ? formatTime(elapsedTime) : '0:00.00'}</span>
                </div>
                <button className="sub-navbar-btn" onClick={pauseGame}>Pause</button>
                <button className="sub-navbar-btn danger" onClick={stopGame}>Exit</button>
              </>
            ) : (
              <>
                <button className="sub-navbar-btn" onClick={() => setShowGameModal(true)}>Game Mode</button>
                <button className="sub-navbar-btn" onClick={() => { setPendingResult(null); setShowLeaderboard(true); }}>
                  Leaderboard
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <React.Fragment key={gameKey}>
        {renderTab(activeTab, {
          isGameActive: isGameActive && gameTabs.includes(activeTab),
          onGameComplete,
        })}
      </React.Fragment>

      {showGameModal && (
        <div className="game-modal-overlay" onClick={() => setShowGameModal(false)}>
          <div className="game-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px', minWidth: '300px' }}>
            <h3 style={{ marginTop: 0, color: '#01202C' }}>Game Mode</h3>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Complete EPs and/or Limits with no errors. Your time is recorded when all answers are correct.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="game-mode" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }}>Mode</label>
              <select id="game-mode" value={gameMode} onChange={(e) => setGameMode(e.target.value)} className="game-mode-select" style={{ width: '100%' }}>
                {GAME_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
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
        <Leaderboard
          school={school}
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

export default EPsLimitsShell;
