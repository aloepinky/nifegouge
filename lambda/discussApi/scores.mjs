import { randomBytes } from 'node:crypto';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamo, CONFIG } from './clients.mjs';
import { HttpError, cleanText, parseBody, reply } from './http.mjs';

// The EPs/Limits leaderboard every school shares: arcade nicknames, no accounts, ranked on time.
//
// Every finished run is its own row and nothing is ever deleted. A board shows each player's
// best inside a window (this calendar month, this calendar year, all time, all UTC), and a
// player's best this month can be slower than their best ever, so keeping only a personal best
// would empty the monthly board of everyone who once had a good day.
//
// Table EPsLimitsScores: partition `board` ("NIFE#EPs"), sort `runId`, which begins with the
// time zero-padded so a partition reads fastest first and two equal times never collide. The
// boards are small, so the window and the best-per-player are worked out here rather than in a
// FilterExpression.

const SCHOOLS = ['NIFE', 'Primary', 'Advanced'];
const MODES = ['EPs', 'Limits', 'EPs_and_Limits'];
const PERIODS = ['month', 'year', 'all'];
const MIN_MS = 1000;
const MAX_MS = 2 * 60 * 60 * 1000;
const TOP = 10;
const MAX_IMPORT = 500;

// The fields a player types, as NIFE has always asked for them. Uppercased, like an arcade
// cabinet. The name takes five so the imported Primary usernames fit.
const FIELDS = { playerName: 5, country: 4, branch: 4, designator: 12, trainingClass: 12 };

const db = () => getDynamo();

function boardOf(school, mode) {
  if (!SCHOOLS.includes(school)) throw new HttpError(400, 'Unknown school');
  if (!MODES.includes(mode)) throw new HttpError(400, 'Unknown mode');
  return `${school}#${mode}`;
}

function cleanPlayer(body) {
  const out = {};
  for (const [field, max] of Object.entries(FIELDS)) {
    out[field] = cleanText(body[field], max).toUpperCase();
  }
  if (!/^[A-Z0-9]{1,5}$/.test(out.playerName)) throw new HttpError(400, 'A name is 1 to 5 letters or digits');
  return out;
}

function millis(value, what, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_MS || n > MAX_MS) throw new HttpError(400, `${what} is out of range`);
  return Math.round(n);
}

// Who a row belongs to: name, designator and class together, the rule NIFE's board has always
// used, so two players who share a nickname are still two players.
export function playerKey(r) {
  return [r.playerName, r.designator || '', r.trainingClass || ''].join('-');
}

function runId(ms, iso, tag) {
  return `${String(ms).padStart(10, '0')}#${iso}#${tag}`;
}

async function putRun(board, run, { tag, onlyNew = false } = {}) {
  const item = { board, runId: runId(run.elapsedTime, run.createdAt, tag), ...run };
  for (const k of Object.keys(item)) if (item[k] === undefined || item[k] === '') delete item[k];
  await db().send(new PutCommand({
    TableName: CONFIG.scoresTable,
    Item: item,
    ...(onlyNew ? {
      ConditionExpression: 'attribute_not_exists(#b)',
      ExpressionAttributeNames: { '#b': 'board' },
    } : {}),
  }));
}

async function runsOf(board) {
  const rows = [];
  let start;
  do {
    const out = await db().send(new QueryCommand({
      TableName: CONFIG.scoresTable,
      KeyConditionExpression: '#b = :b',
      ExpressionAttributeNames: { '#b': 'board' },
      ExpressionAttributeValues: { ':b': board },
      ...(start ? { ExclusiveStartKey: start } : {}),
    }));
    rows.push(...(out.Items || []));
    start = out.LastEvaluatedKey;
  } while (start);
  return rows;
}

// The first instant of the window, as an ISO string ('' for all time).
export function periodStart(period, now = new Date()) {
  if (period === 'month') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  if (period === 'year') return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  return '';
}

// Each player's best run in the window, fastest first; a tie goes to whoever set it first.
export function standings(rows, since) {
  const best = new Map();
  for (const r of rows) {
    if (since && !(r.createdAt >= since)) continue;
    const key = playerKey(r);
    const held = best.get(key);
    if (!held || r.elapsedTime < held.elapsedTime
      || (r.elapsedTime === held.elapsedTime && r.createdAt < held.createdAt)) best.set(key, r);
  }
  return [...best.values()]
    .sort((a, b) => a.elapsedTime - b.elapsedTime || (a.createdAt < b.createdAt ? -1 : 1))
    .map((r, i) => ({
      rank: i + 1,
      player: playerKey(r),
      playerName: r.playerName,
      country: r.country || '',
      branch: r.branch || '',
      designator: r.designator || '',
      trainingClass: r.trainingClass || '',
      elapsedTime: r.elapsedTime,
      epsTime: r.epsTime,
      limitsTime: r.limitsTime,
      createdAt: r.createdAt,
    }));
}

export async function leaderboardHandler(event) {
  const q = event.queryStringParameters || {};
  const board = boardOf(q.school, q.mode);
  const period = PERIODS.includes(q.period) ? q.period : 'all';
  const all = standings(await runsOf(board), periodStart(period));
  const player = typeof q.player === 'string' ? q.player.toUpperCase() : '';
  const mine = player ? all.find((e) => e.player === player) : null;
  return reply(200, {
    success: true,
    board,
    period,
    entries: all.slice(0, TOP),
    you: mine && mine.rank > TOP ? mine : null,
    players: all.length,
  });
}

// One finished run. A combined run's two splits are runs in their own right, so they are
// posted to the EPs and Limits boards as well; the Primary board has always done this.
export async function submitScoreHandler(event) {
  const body = parseBody(event);
  const board = boardOf(body.school, body.mode);
  const player = cleanPlayer(body);
  const elapsedTime = millis(body.elapsedTime, 'The time');
  const combined = body.mode === 'EPs_and_Limits';
  const epsTime = combined ? millis(body.epsTime, 'The EPs split', { optional: true }) : undefined;
  const limitsTime = combined ? millis(body.limitsTime, 'The limits split', { optional: true }) : undefined;
  const createdAt = new Date().toISOString();
  const tag = randomBytes(2).toString('hex');

  await putRun(board, { ...player, elapsedTime, epsTime, limitsTime, createdAt }, { tag });
  if (epsTime) await putRun(boardOf(body.school, 'EPs'), { ...player, elapsedTime: epsTime, createdAt, split: true }, { tag });
  if (limitsTime) await putRun(boardOf(body.school, 'Limits'), { ...player, elapsedTime: limitsTime, createdAt, split: true }, { tag });
  return reply(200, { success: true, board, createdAt });
}

// Admin: carries the old boards' times over, keeping the date each was set. Idempotent: a run
// already imported (same board, time and date) is skipped, so a failed import can be rerun.
export async function importScoresHandler(event) {
  const body = parseBody(event);
  const runs = Array.isArray(body.runs) ? body.runs : [];
  if (!runs.length || runs.length > MAX_IMPORT) throw new HttpError(400, `Send 1 to ${MAX_IMPORT} runs`);
  let imported = 0;
  let skipped = 0;
  const refused = [];
  for (const [i, run] of runs.entries()) {
    try {
      const board = boardOf(run.school, run.mode);
      const when = new Date(run.createdAt);
      if (Number.isNaN(when.getTime())) throw new HttpError(400, 'No date');
      const row = {
        ...cleanPlayer(run),
        elapsedTime: millis(run.elapsedTime, 'The time'),
        epsTime: millis(run.epsTime, 'The EPs split', { optional: true }),
        limitsTime: millis(run.limitsTime, 'The limits split', { optional: true }),
        createdAt: when.toISOString(),
        imported: true,
      };
      await putRun(board, row, { tag: 'import', onlyNew: true });
      imported += 1;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') skipped += 1;
      else if (error instanceof HttpError) refused.push({ index: i, error: error.message });
      else throw error;
    }
  }
  return reply(200, { success: true, imported, skipped, refused });
}
