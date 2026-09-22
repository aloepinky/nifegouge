import { call, post } from '../serverApi';

// The EPs/Limits leaderboard both schools share (lambda/discussApi/scores.mjs). No accounts:
// a player is the name, designator and class they type, remembered in this browser so the
// next submit is one click.

export const MODES = [
  { id: 'EPs', label: 'EPs' },
  { id: 'Limits', label: 'Limits' },
  { id: 'EPs_and_Limits', label: 'EPs & Limits' },
];

export const PERIODS = [
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
  { id: 'all', label: 'All time' },
];

export function fetchBoard(school, mode, period, player) {
  const qs = new URLSearchParams({ school, mode, period });
  if (player) qs.set('player', player);
  return call(`leaderboard?${qs}`);
}

export function submitScore(run) {
  return post('submit-score', run);
}

// The same rule the server keys a player by, so the page can find its own row.
export function playerKey(p) {
  if (!p || !p.playerName) return '';
  return [p.playerName, p.designator || '', p.trainingClass || ''].join('-').toUpperCase();
}

const PLAYER_KEY = 'epsLimitsPlayer';

export function savedPlayer() {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function savePlayer(p) {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(p));
  } catch (e) {
    // Private windows refuse storage; the player just types it again next time.
  }
}

export function formatTime(ms) {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}
