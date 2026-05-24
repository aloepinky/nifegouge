import React, { useState, useEffect } from 'react';

const TW4_API_BASE = 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod';

function formatTime(ms) {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

const TEST_TYPE_LABELS = {
  TW4_EPs: 'EPs',
  TW4_Limits: 'Limits',
  TW4_EPs_and_Limits: 'EPs & Limits',
};

const ALL_TEST_TYPES = ['TW4_EPs', 'TW4_Limits', 'TW4_EPs_and_Limits'];
const PERIODS = ['weekly', 'monthly', 'yearly'];

// ── LocalStorage helpers ──────────────────────────────────────────────────────

function getSavedUsername()  { return localStorage.getItem('tw4Username') || ''; }
function getSavedBranch()    { return localStorage.getItem('tw4Branch') || ''; }
function getSavedClass()     { return localStorage.getItem('tw4Class') || ''; }
function saveUsername(name)  { localStorage.setItem('tw4Username', name.toUpperCase()); }
function saveBranch(b)       { localStorage.setItem('tw4Branch', b); }
function saveClass(c)        { localStorage.setItem('tw4Class', c); }
function clearUsername()     { localStorage.removeItem('tw4Username'); }

// Only show class on leaderboard if it's set and not the default "POOL"
function profileTag(branch, trainingClass) {
  const cls = trainingClass && trainingClass !== 'POOL' ? trainingClass : '';
  return [branch, cls].filter(Boolean).join(' · ');
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '7px 10px', marginBottom: '10px',
  borderRadius: '4px', background: '#fff', color: '#333',
  border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.95em',
};

const labelStyle = {
  display: 'block', marginBottom: '4px', fontSize: '0.85em', color: '#555', fontWeight: '600',
};

const USER_ROW_BG = '#dbeeff';

// ── Table sub-components ──────────────────────────────────────────────────────

function NameCell({ entry }) {
  const tag = profileTag(entry.branch, entry.trainingClass);
  return (
    <td style={{ padding: '9px 10px' }}>
      <div style={{ fontWeight: '700', color: '#01202C' }}>{entry.username}</div>
      {tag && <div style={{ fontSize: '0.75em', color: '#888', marginTop: '2px' }}>{tag}</div>}
    </td>
  );
}

function SeparatorRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '4px 10px', textAlign: 'center', color: '#ccc', letterSpacing: '6px', borderBottom: '1px solid #eee', fontSize: '0.8em' }}>
        ···
      </td>
    </tr>
  );
}

function TimeTable({ leaderboard, userEntry, currentUser, combined }) {
  const entries = leaderboard || [];
  const colSpan = combined ? 5 : 3;

  if (entries.length === 0 && !userEntry) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>No entries yet.</p>;
  }

  const thStyle = { padding: '9px 10px', textAlign: 'left', fontWeight: '700', color: '#01202C' };

  return (
    <table className="leaderboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #ddd' }}>
          <th style={{ ...thStyle, width: '40px' }}>#</th>
          <th style={thStyle}>Name</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Time</th>
          {combined && <th style={{ ...thStyle, textAlign: 'right' }}>EPs</th>}
          {combined && <th style={{ ...thStyle, textAlign: 'right' }}>Limits</th>}
        </tr>
      </thead>
      <tbody>
        {entries.map(e => {
          const isMe = currentUser && e.username === currentUser;
          return (
            <tr key={e.rank} style={{ borderBottom: '1px solid #eee', background: isMe ? USER_ROW_BG : undefined }}>
              <td style={{ padding: '9px 10px', color: '#aaa', fontWeight: '600' }}>#{e.rank}</td>
              <NameCell entry={e} />
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600', color: '#01202C' }}>{e.formattedTime}</td>
              {combined && <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{e.formattedEpsTime || '--'}</td>}
              {combined && <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{e.formattedLimitsTime || '--'}</td>}
            </tr>
          );
        })}
        {userEntry && (
          <>
            <SeparatorRow colSpan={colSpan} />
            <tr style={{ borderBottom: '1px solid #eee', background: USER_ROW_BG }}>
              <td style={{ padding: '9px 10px', color: '#aaa', fontWeight: '600' }}>#{userEntry.rank}</td>
              <NameCell entry={userEntry} />
              <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600', color: '#01202C' }}>{userEntry.formattedTime}</td>
              {combined && <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{userEntry.formattedEpsTime || '--'}</td>}
              {combined && <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{userEntry.formattedLimitsTime || '--'}</td>}
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}

function CompletionTable({ leaderboard, userEntry, currentUser }) {
  const entries = leaderboard || [];

  if (entries.length === 0 && !userEntry) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>No entries yet.</p>;
  }

  const thStyle = { padding: '9px 10px', textAlign: 'left', fontWeight: '700', color: '#01202C' };

  return (
    <table className="leaderboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #ddd' }}>
          <th style={{ ...thStyle, width: '40px' }}>#</th>
          <th style={thStyle}>Name</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Completions</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(e => {
          const isMe = currentUser && e.username === currentUser;
          return (
            <tr key={e.rank} style={{ borderBottom: '1px solid #eee', background: isMe ? USER_ROW_BG : undefined }}>
              <td style={{ padding: '9px 10px', color: '#aaa', fontWeight: '600' }}>#{e.rank}</td>
              <NameCell entry={e} />
              <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '600', color: '#01202C' }}>{e.completions}</td>
            </tr>
          );
        })}
        {userEntry && (
          <>
            <SeparatorRow colSpan={3} />
            <tr style={{ borderBottom: '1px solid #eee', background: USER_ROW_BG }}>
              <td style={{ padding: '9px 10px', color: '#aaa', fontWeight: '600' }}>#{userEntry.rank}</td>
              <NameCell entry={userEntry} />
              <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '600', color: '#01202C' }}>{userEntry.completions}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}

// ── Username claim panel ──────────────────────────────────────────────────────

function UsernamePanel({ onClaimed }) {
  const [mode, setMode] = useState('create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [branch, setBranch] = useState('');
  const [trainingClass, setTrainingClass] = useState(''); // empty = POOL default
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = e => {
    setUsername(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5));
    setError('');
  };

  const handleCreate = async () => {
    if (username.length !== 5) { setError('Username must be exactly 5 letters.'); return; }
    if (!password) { setError('Password is required.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${TW4_API_BASE}/tw4/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, branch: branch || undefined, trainingClass: trainingClass || undefined }),
      });
      if (res.status === 409) { setError('Username already taken. Try another or reclaim it.'); return; }
      if (!res.ok) { setError('Registration failed. Try again.'); return; }
      const data = await res.json();
      saveUsername(username);
      onClaimed(username, data.branch || '', data.trainingClass || '');
    } catch {
      setError('Network error. Try again.');
    } finally { setLoading(false); }
  };

  const handleReclaim = async () => {
    if (!username) { setError('Enter your username.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${TW4_API_BASE}/tw4/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 401) { setError('Incorrect username or password.'); return; }
      if (!res.ok) { setError('Verification failed. Try again.'); return; }
      const data = await res.json();
      saveUsername(username);
      onClaimed(username, data.branch || '', data.trainingClass || '');
    } catch {
      setError('Network error. Try again.');
    } finally { setLoading(false); }
  };

  const toggleBtnStyle = (active) => ({
    flex: 1, padding: '8px', cursor: 'pointer', borderRadius: '6px', fontWeight: '600',
    fontSize: '0.9em', border: '1px solid #003B4F',
    background: active ? '#003B4F' : 'transparent',
    color: active ? '#fff' : '#003B4F',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button style={toggleBtnStyle(mode === 'create')} onClick={() => { setMode('create'); setError(''); }}>Create</button>
        <button style={toggleBtnStyle(mode === 'reclaim')} onClick={() => { setMode('reclaim'); setError(''); }}>Reclaim</button>
      </div>

      {mode === 'create' && (
        <div>
          <p style={{ fontSize: '0.85em', color: '#666', marginTop: 0 }}>
            Choose a 5-letter username. Set a password to reclaim it on other devices.
          </p>
          <label style={labelStyle}>Username (5 letters)</label>
          <input value={username} onChange={handleUsernameChange} maxLength={5} placeholder="EAGLE" style={inputStyle} />
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" style={inputStyle} />
          <label style={labelStyle}>Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} placeholder="••••••••" style={inputStyle} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Branch <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span></label>
              <input value={branch} onChange={e => setBranch(e.target.value.toUpperCase().slice(0, 10))} placeholder="USN" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Class <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span></label>
              <input value={trainingClass} onChange={e => setTrainingClass(e.target.value.toUpperCase().slice(0, 10))} placeholder="POOL" style={inputStyle} />
            </div>
          </div>
          {error && <p style={{ color: '#e57373', fontSize: '0.85em', margin: '0 0 10px' }}>{error}</p>}
          <button className="game-button-primary" onClick={handleCreate} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating…' : 'Create Username'}
          </button>
        </div>
      )}

      {mode === 'reclaim' && (
        <div>
          <p style={{ fontSize: '0.85em', color: '#666', marginTop: 0 }}>
            Already have a username? Enter it and your password to restore it on this device.
          </p>
          <label style={labelStyle}>Username</label>
          <input value={username} onChange={handleUsernameChange} maxLength={5} placeholder="EAGLE" style={inputStyle} />
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" style={{ ...inputStyle, marginBottom: '12px' }} />
          {error && <p style={{ color: '#e57373', fontSize: '0.85em', margin: '0 0 10px' }}>{error}</p>}
          <button className="game-button-primary" onClick={handleReclaim} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Verifying…' : 'Reclaim Username'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Edit profile panel ────────────────────────────────────────────────────────

function EditProfilePanel({ username, currentBranch, currentClass, onSaved, onCancel }) {
  // Show empty if class is POOL (the default) so user types their real class
  const [branch, setBranch] = useState(currentBranch || '');
  const [trainingClass, setTrainingClass] = useState(currentClass === 'POOL' ? '' : (currentClass || ''));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!password) { setError('Password required to save.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${TW4_API_BASE}/tw4/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, branch, trainingClass: trainingClass || 'POOL' }),
      });
      if (res.status === 401) { setError('Incorrect password.'); return; }
      if (!res.ok) { setError('Update failed. Try again.'); return; }
      const data = await res.json();
      saveBranch(data.branch || '');
      saveClass(data.trainingClass || '');
      onSaved(data.branch || '', data.trainingClass || '');
    } catch {
      setError('Network error. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, color: '#01202C' }}>Edit Profile</h4>
      <p style={{ fontSize: '0.85em', color: '#666', marginTop: 0 }}>
        Update your branch and class. Password required to save.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Branch</label>
          <input value={branch} onChange={e => setBranch(e.target.value.toUpperCase().slice(0, 10))} placeholder="USN" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Class</label>
          <input value={trainingClass} onChange={e => setTrainingClass(e.target.value.toUpperCase().slice(0, 10))} placeholder="POOL" style={inputStyle} />
        </div>
      </div>
      <label style={labelStyle}>Password</label>
      <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" style={{ ...inputStyle, marginBottom: '12px' }} />
      {error && <p style={{ color: '#e57373', fontSize: '0.85em', margin: '0 0 10px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="game-button-secondary" onClick={onCancel} style={{ flex: 1, padding: '8px' }}>Cancel</button>
        <button className="game-button-primary" onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '8px' }}>
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-tab pill style ────────────────────────────────────────────────────────

const subTabStyle = (active) => ({
  padding: '3px 10px', cursor: 'pointer', borderRadius: '12px',
  background: active ? '#003B4F' : 'transparent',
  color: active ? '#fff' : '#003B4F',
  border: '1px solid #003B4F',
  fontSize: '0.82em', userSelect: 'none',
  fontWeight: active ? 'bold' : 'normal',
});

// ── Main component ────────────────────────────────────────────────────────────

function TW4Leaderboard({ pendingResult, onClose }) {
  const [mainTab, setMainTab] = useState(pendingResult ? 'submit' : 'time');
  const [timeTab, setTimeTab] = useState(pendingResult?.testType || 'TW4_EPs');
  const [completionTab, setCompletionTab] = useState(pendingResult?.testType || 'TW4_EPs');
  const [period, setPeriod] = useState('weekly');
  const [timeData, setTimeData] = useState({});
  const [completionData, setCompletionData] = useState({});
  const [loadingTime, setLoadingTime] = useState(false);
  const [loadingCompletion, setLoadingCompletion] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [submitError, setSubmitError] = useState('');
  const [savedUsername, setSavedUsername] = useState(getSavedUsername());
  const [savedBranch, setSavedBranch] = useState(getSavedBranch());
  const [savedClass, setSavedClass] = useState(getSavedClass());
  const [showEditProfile, setShowEditProfile] = useState(false);

  const fetchTimeLeaderboard = async (user = savedUsername) => {
    setLoadingTime(true);
    try {
      const userParam = user ? `&username=${encodeURIComponent(user)}` : '';
      const results = await Promise.all(
        ALL_TEST_TYPES.map(t =>
          fetch(`${TW4_API_BASE}/tw4/timeLeaderboard?testType=${t}${userParam}`)
            .then(r => r.json())
            .then(d => [t, { leaderboard: d.leaderboard || [], userEntry: d.userEntry || null }])
            .catch(() => [t, { leaderboard: [], userEntry: null }])
        )
      );
      setTimeData(Object.fromEntries(results));
    } finally { setLoadingTime(false); }
  };

  const fetchCompletionLeaderboard = async (p = period, user = savedUsername) => {
    setLoadingCompletion(true);
    try {
      const userParam = user ? `&username=${encodeURIComponent(user)}` : '';
      const results = await Promise.all(
        ALL_TEST_TYPES.map(t =>
          fetch(`${TW4_API_BASE}/tw4/completionLeaderboard?testType=${t}&period=${p}${userParam}`)
            .then(r => r.json())
            .then(d => [t, { leaderboard: d.leaderboard || [], userEntry: d.userEntry || null }])
            .catch(() => [t, { leaderboard: [], userEntry: null }])
        )
      );
      setCompletionData(Object.fromEntries(results));
    } finally { setLoadingCompletion(false); }
  };

  useEffect(() => {
    fetchTimeLeaderboard();
    fetchCompletionLeaderboard();
  }, []);

  useEffect(() => { fetchCompletionLeaderboard(period); }, [period]);

  const handleSubmit = async (username) => {
    setSubmitStatus('submitting'); setSubmitError('');
    try {
      const payload = {
        testType: pendingResult.testType,
        username,
        elapsedTime: pendingResult.elapsedTime,
        score: 100,
      };
      if (pendingResult.epsTime) payload.epsTime = pendingResult.epsTime;
      if (pendingResult.limitsTime) payload.limitsTime = pendingResult.limitsTime;

      const res = await fetch(`${TW4_API_BASE}/tw4/submitScore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setSubmitStatus('error'); setSubmitError('Submission failed. Try again.'); return; }
      setSubmitStatus('success');
      setTimeTab(pendingResult.testType);
      setMainTab('time');
      fetchTimeLeaderboard(username);
      fetchCompletionLeaderboard(period, username);
    } catch {
      setSubmitStatus('error');
      setSubmitError('Network error. Try again.');
    }
  };

  const handleUsernameClaimed = (username, branch, trainingClass) => {
    setSavedUsername(username);
    saveBranch(branch || '');
    saveClass(trainingClass || '');
    setSavedBranch(branch || '');
    setSavedClass(trainingClass || '');
  };

  const handleChangeUsername = () => {
    clearUsername();
    setSavedUsername('');
  };

  const profileFooter = mainTab !== 'submit' && !showEditProfile && savedUsername && (
    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '0.82em', color: '#888' }}>
      Playing as <strong style={{ color: '#333' }}>{savedUsername}</strong>
      {profileTag(savedBranch, savedClass) && <span> · {profileTag(savedBranch, savedClass)}</span>}
      {' — '}
      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowEditProfile(true)}>Edit Profile</span>
    </div>
  );

  const currentTimeData = timeData[timeTab] || { leaderboard: [], userEntry: null };
  const currentCompletionData = completionData[completionTab] || { leaderboard: [], userEntry: null };

  return (
    <div className="tw4-modal-overlay" onClick={onClose}>
      <div className="tw4-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#01202C' }}>EPs &amp; Limits Leaderboard</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4em', cursor: 'pointer', color: '#666', padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Edit Profile */}
        {showEditProfile && (
          <EditProfilePanel
            username={savedUsername}
            currentBranch={savedBranch}
            currentClass={savedClass}
            onSaved={(b, c) => { setSavedBranch(b); setSavedClass(c); setShowEditProfile(false); fetchTimeLeaderboard(); fetchCompletionLeaderboard(); }}
            onCancel={() => setShowEditProfile(false)}
          />
        )}

        {/* Submit flow */}
        {!showEditProfile && pendingResult && mainTab === 'submit' && (
          <div>
            <div style={{ background: '#f0f4f8', borderRadius: '8px', padding: '14px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>{TEST_TYPE_LABELS[pendingResult.testType]} — completed!</div>
              <div style={{ fontSize: '1.7em', fontFamily: 'monospace', fontWeight: '700', color: '#01202C' }}>{formatTime(pendingResult.elapsedTime)}</div>
              {pendingResult.epsTime && (
                <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                  EPs {formatTime(pendingResult.epsTime)} · Limits {formatTime(pendingResult.limitsTime)}
                </div>
              )}
            </div>

            {submitStatus === 'success' ? (
              <p style={{ color: '#388e3c', textAlign: 'center' }}>Score submitted!</p>
            ) : savedUsername ? (
              <div>
                <p style={{ textAlign: 'center', marginBottom: '4px', color: '#333' }}>
                  Submit as <strong>{savedUsername}</strong>?
                </p>
                <p style={{ textAlign: 'center', fontSize: '0.8em', color: '#888', marginTop: 0, marginBottom: '12px' }}>
                  {profileTag(savedBranch, savedClass) && <span>{profileTag(savedBranch, savedClass)} · </span>}
                  <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowEditProfile(true)}>Edit profile</span>
                  {' · '}
                  <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={handleChangeUsername}>Change username</span>
                </p>
                {submitStatus === 'error' && <p style={{ color: '#e57373', textAlign: 'center', fontSize: '0.85em' }}>{submitError}</p>}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="game-button-secondary" onClick={() => setMainTab('time')}>View Leaderboard</button>
                  <button className="game-button-primary" onClick={() => handleSubmit(savedUsername)} disabled={submitStatus === 'submitting'}>
                    {submitStatus === 'submitting' ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            ) : (
              <UsernamePanel onClaimed={(name, b, c) => { handleUsernameClaimed(name, b, c); handleSubmit(name); }} />
            )}

            {!savedUsername && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <span style={{ cursor: 'pointer', color: '#888', fontSize: '0.85em', textDecoration: 'underline' }} onClick={() => setMainTab('time')}>
                  Skip — just view leaderboard
                </span>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard tabs */}
        {!showEditProfile && mainTab !== 'submit' && (
          <div>
            <div className="leaderboard-tabs">
              <button className={`leaderboard-tab ${mainTab === 'time' ? 'active' : ''}`} onClick={() => setMainTab('time')}>Time</button>
              <button className={`leaderboard-tab ${mainTab === 'completions' ? 'active' : ''}`} onClick={() => setMainTab('completions')}>Completions</button>
            </div>

            {mainTab === 'time' && (
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {ALL_TEST_TYPES.map(t => (
                    <span key={t} style={subTabStyle(timeTab === t)} onClick={() => setTimeTab(t)}>{TEST_TYPE_LABELS[t]}</span>
                  ))}
                </div>
                {loadingTime
                  ? <p style={{ color: '#888', textAlign: 'center' }}>Loading…</p>
                  : <TimeTable
                      leaderboard={currentTimeData.leaderboard}
                      userEntry={currentTimeData.userEntry}
                      currentUser={savedUsername}
                      combined={timeTab === 'TW4_EPs_and_Limits'}
                    />}
              </div>
            )}

            {mainTab === 'completions' && (
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {PERIODS.map(p => (
                    <span key={p} style={subTabStyle(period === p)} onClick={() => setPeriod(p)}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {ALL_TEST_TYPES.map(t => (
                    <span key={t} style={subTabStyle(completionTab === t)} onClick={() => setCompletionTab(t)}>{TEST_TYPE_LABELS[t]}</span>
                  ))}
                </div>
                {loadingCompletion
                  ? <p style={{ color: '#888', textAlign: 'center' }}>Loading…</p>
                  : <CompletionTable
                      leaderboard={currentCompletionData.leaderboard}
                      userEntry={currentCompletionData.userEntry}
                      currentUser={savedUsername}
                    />}
              </div>
            )}

            {profileFooter}
          </div>
        )}
      </div>
    </div>
  );
}

export default TW4Leaderboard;
