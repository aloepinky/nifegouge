import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MODES, PERIODS, fetchBoard, submitScore, playerKey, savedPlayer, savePlayer, formatTime,
} from './leaderboardApi';

// The EPs/Limits leaderboard, one modal for every school. Arcade rules: type a name and your
// details, no account, no password; the board ranks each player's best time in the window.
//
// `pendingResult` is a finished run ({ mode, elapsedTime, epsTime?, limitsTime? }); with one,
// the modal opens on the submit form, and without one it opens on the board.

const COUNTRIES = ['USA', 'ITA', 'GBR', 'CAN', 'AUS', 'GER', 'FRA', 'NED', 'KSA', 'SWE'];
const BRANCHES = ['USN', 'USMC', 'USCG', 'NAVY'];
const DESIGNATORS = ['SNA', 'SNFO', 'AVP'];
const OTHER = '__other';

const EMPTY_PLAYER = { playerName: '', country: '', branch: '', designator: '', trainingClass: '' };

// A select of the usual answers with "Other…", which swaps it for a short text box.
function ChoiceField({ id, label, options, value, onChange, max }) {
  const [typing, setTyping] = useState(() => !!value && !options.includes(value));
  return (
    <div className="lb-field">
      <label htmlFor={id}>{label}</label>
      {typing ? (
        <div className="lb-other">
          <input
            id={id}
            className="game-mode-select"
            value={value}
            maxLength={max}
            autoFocus
            onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, max))}
          />
          <button type="button" className="lb-link" onClick={() => { setTyping(false); onChange(''); }}>
            list
          </button>
        </div>
      ) : (
        <select
          id={id}
          className="game-mode-select"
          value={value}
          onChange={(e) => {
            if (e.target.value === OTHER) { setTyping(true); onChange(''); } else onChange(e.target.value);
          }}
        >
          <option value="">Choose…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
          <option value={OTHER}>Other…</option>
        </select>
      )}
    </div>
  );
}

function tagOf(e) {
  return [e.country, e.branch, e.designator, e.trainingClass].filter(Boolean).join(' · ');
}

function Row({ entry, me, combined }) {
  return (
    <tr className={me ? 'lb-me' : undefined}>
      <td className="lb-rank">{entry.rank}</td>
      <td>
        <div className="lb-name">{entry.playerName}</div>
        {tagOf(entry) && <div className="lb-tag">{tagOf(entry)}</div>}
      </td>
      <td className="lb-time">{formatTime(entry.elapsedTime)}</td>
      {combined && <td className="lb-split">{entry.epsTime ? formatTime(entry.epsTime) : '--'}</td>}
      {combined && <td className="lb-split">{entry.limitsTime ? formatTime(entry.limitsTime) : '--'}</td>}
    </tr>
  );
}

function Board({ data, me, combined }) {
  if (!data) return <p className="lb-empty">Loading…</p>;
  if (data.error) return <p className="lb-error">{data.error}</p>;
  if (!data.entries.length) return <p className="lb-empty">No times yet. Be the first.</p>;
  const cols = combined ? 5 : 3;
  return (
    <table className="lb-table">
      <thead>
        <tr>
          <th className="lb-rank">#</th>
          <th>Name</th>
          <th className="lb-time">Time</th>
          {combined && <th className="lb-split">EPs</th>}
          {combined && <th className="lb-split">Limits</th>}
        </tr>
      </thead>
      <tbody>
        {data.entries.map((e) => <Row key={e.player} entry={e} me={e.player === me} combined={combined} />)}
        {data.you && (
          <>
            <tr className="lb-sep"><td colSpan={cols}>···</td></tr>
            <Row entry={data.you} me combined={combined} />
          </>
        )}
      </tbody>
    </table>
  );
}

function Leaderboard({ school, pendingResult, onClose }) {
  const [view, setView] = useState(pendingResult ? 'submit' : 'board');
  // The board opens on the run everyone comes for: the whole exam, all time. A submit shows the
  // mode just played instead.
  const [mode, setMode] = useState(pendingResult ? pendingResult.mode : 'EPs_and_Limits');
  const [period, setPeriod] = useState('all');
  const [boards, setBoards] = useState({});
  const [player, setPlayer] = useState(() => ({ ...EMPTY_PLAYER, ...(savedPlayer() || {}) }));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const me = playerKey(savedPlayer());

  // Each board is fetched once per opening; a submit clears the lot so they refetch.
  const requested = useRef(new Set());
  const load = useCallback((m, p) => {
    const key = `${m}|${p}`;
    if (requested.current.has(key)) return;
    requested.current.add(key);
    fetchBoard(school, m, p, playerKey(savedPlayer()))
      .then((data) => setBoards((b) => ({ ...b, [key]: data })))
      .catch((err) => setBoards((b) => ({ ...b, [key]: { error: err.message } })));
  }, [school]);

  useEffect(() => {
    if (view === 'board') load(mode, period);
  }, [view, mode, period, load]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (field) => (value) => { setPlayer((p) => ({ ...p, [field]: value })); setError(''); };

  const missing = !/^[A-Z0-9]{1,5}$/.test(player.playerName) ? 'a name of 1 to 5 letters'
    : !player.country ? 'a country'
      : !player.branch ? 'a branch'
        : !player.designator ? 'a designator'
          : !player.trainingClass.trim() ? 'a class' : '';

  const submit = async () => {
    if (missing) { setError(`Add ${missing}.`); return; }
    setStatus('sending');
    setError('');
    const clean = { ...player, trainingClass: player.trainingClass.trim().toUpperCase() };
    savePlayer(clean);
    try {
      await submitScore({ school, ...pendingResult, ...clean });
      setStatus('sent');
      requested.current.clear();
      setBoards({});
      setView('board');
      setPeriod('all');
    } catch (err) {
      setStatus('idle');
      setError(`Not submitted. ${err.message}`);
    }
  };

  const combined = mode === 'EPs_and_Limits';
  const modeLabel = (id) => (MODES.find((m) => m.id === id) || {}).label || id;

  return (
    <div className="game-modal-overlay" onClick={onClose}>
      <div className="game-modal lb-modal" role="dialog" aria-label="Leaderboard" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="game-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2>{school} EPs &amp; Limits Leaderboard</h2>

        {view === 'submit' && pendingResult && (
          <div className="game-modal-content">
            <div className="lb-result">
              <div className="lb-result-label">{modeLabel(pendingResult.mode)} complete</div>
              <div className="lb-result-time">{formatTime(pendingResult.elapsedTime)}</div>
              {pendingResult.epsTime && (
                <div className="lb-result-splits">
                  EPs {formatTime(pendingResult.epsTime)} · Limits {formatTime(pendingResult.limitsTime)}
                </div>
              )}
            </div>
            <div className="lb-field">
              <label htmlFor="lb-name">Name (up to 5 letters)</label>
              <input
                id="lb-name"
                className="game-mode-select"
                value={player.playerName}
                placeholder="ACE"
                maxLength={5}
                autoFocus={!player.playerName}
                onChange={(e) => set('playerName')(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
              />
            </div>
            <div className="lb-form-row">
              <ChoiceField id="lb-country" label="Country" options={COUNTRIES} value={player.country} onChange={set('country')} max={4} />
              <ChoiceField id="lb-branch" label="Branch" options={BRANCHES} value={player.branch} onChange={set('branch')} max={4} />
            </div>
            <div className="lb-form-row">
              <ChoiceField id="lb-designator" label="Designator" options={DESIGNATORS} value={player.designator} onChange={set('designator')} max={5} />
              <div className="lb-field">
                <label htmlFor="lb-class">Class</label>
                <input
                  id="lb-class"
                  className="game-mode-select"
                  value={player.trainingClass}
                  placeholder="25-01"
                  maxLength={8}
                  onChange={(e) => set('trainingClass')(e.target.value.toUpperCase().slice(0, 8))}
                />
              </div>
            </div>
            {error && <p className="lb-error">{error}</p>}
            <div className="lb-actions">
              <button type="button" className="game-button-secondary" onClick={() => setView('board')}>
                Just view the board
              </button>
              <button type="button" className="game-button-primary" onClick={submit} disabled={status === 'sending'}>
                {status === 'sending' ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {view === 'board' && (
          <div>
            {status === 'sent' && <p className="lb-sent">Submitted. Your best time in each window is the one that counts.</p>}
            <div className="lb-pills" role="tablist" aria-label="Test">
              {MODES.map((m) => (
                <button type="button" key={m.id} role="tab" aria-selected={mode === m.id}
                  className={`lb-pill${mode === m.id ? ' active' : ''}`} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="lb-pills" role="tablist" aria-label="Period">
              {PERIODS.map((p) => (
                <button type="button" key={p.id} role="tab" aria-selected={period === p.id}
                  className={`lb-pill lb-pill--quiet${period === p.id ? ' active' : ''}`} onClick={() => setPeriod(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <Board data={boards[`${mode}|${period}`]} me={me} combined={combined} />
            {pendingResult && status !== 'sent' && (
              <div className="lb-actions">
                <button type="button" className="game-button-primary" onClick={() => setView('submit')}>
                  Submit my time
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
