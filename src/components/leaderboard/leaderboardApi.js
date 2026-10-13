import { call, post } from '../serverApi';

// The EPs/Limits leaderboard every school shares (lambda/discussApi/scores.mjs). No accounts:
// a player is the name, designator and class they type, remembered in this browser so the
// next submit is one click.

// NIFE's board asks for a designator because SNAs, SNFOs and AVPs all sit it. Everyone on the
// Primary and Advanced boards is an SNA, so those neither collect nor show one, and the player
// key there is name and class alone. The server applies the same rule (scores.mjs), so a row
// an old form submitted with a designator still keys the same way as a new one.
const DESIGNATOR_SCHOOLS = ['NIFE'];
export const asksDesignator = (school) => DESIGNATOR_SCHOOLS.includes(school);

// The player as a school's board knows them: the saved designator is dropped where the board
// does not ask for one, so the key and the submit agree with the server.
export function forSchool(p, school) {
  if (!p) return p;
  return asksDesignator(school) ? p : { ...p, designator: '' };
}

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
