import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { timingSafeEqual } from 'node:crypto';
import { getDynamo, CONFIG } from './clients.mjs';
import { HEADERS, HttpError, headerOf, parseBody, reply } from './http.mjs';

// The site's own page-view counter, in place of Netlify Analytics. Netlify counts requests that
// reach its servers, and this is a single-page app: after the first load, moving between pages
// never reaches Netlify, so its page list is only the page people arrived on. The browser
// (src/components/pageviews.js) reports each page it settles on instead.
//
// Table PageViews: partition `day` ("2026-10-06", Central time, as the weekly report keeps it),
// sort `path`. One row per page per day holds `views` and `visitors`; the row whose path is
// TOTAL holds the day's totals. Every count is an atomic ADD, so nothing is read on the way in.
//
// A visitor is a browser on a day, decided in the browser: it says whether this is its first
// page of the day (`newDay`) and its first view of this page today (`newPage`). Nothing that
// identifies anyone is sent or stored, not even an IP address.
//
// The beacon is a text/plain POST, a "simple" request, so no CORS preflight is needed and API
// Gateway's OPTIONS answer is not involved. Nobody reads its response.
//
// `page-stats` is how the Google Sheet (tools/pageviews-sheet.gs) and the weekly report read the
// counts back. It takes X-Stats-Token (env STATS_TOKEN), a key that can only read these counts,
// so the sheet never holds the admin token; the admin token is accepted as well.

export const TOTAL = '#total';
const TIME_ZONE = 'America/Chicago';
const MAX_PATH = 160;
const MAX_DAYS = 92;
// The top of every address the site serves. Anything else (a mistyped link, a probe) is
// counted under one row rather than making a row of its own.
const PREFIXES = new Set(['nife', 'primary', 't44c', 't54a', 'tw4']);
const OTHER = '/(other)';
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|prerender/i;

const db = () => getDynamo();
const NOTHING = { statusCode: 204, headers: HEADERS, body: '' };

// The calendar day in Central time, YYYY-MM-DD.
export function dayOf(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// The path a view is counted under: no query or hash, no trailing slash, lowercase, and only
// under one of the site's own prefixes.
export function cleanPath(raw) {
  if (typeof raw !== 'string') return null;
  let p = raw.split(/[?#]/)[0].trim().toLowerCase();
  try { p = decodeURIComponent(p); } catch (e) { /* leave it encoded */ }
  if (!p.startsWith('/')) return null;
  p = p.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  if (p === '/') return p;
  if (p.length > MAX_PATH || !/^[a-z0-9/._~-]+$/.test(p)) return OTHER;
  if (!PREFIXES.has(p.split('/')[1])) return OTHER;
  return p;
}

async function add(day, path, views, visitors) {
  await db().send(new UpdateCommand({
    TableName: CONFIG.pageViewsTable,
    Key: { day, path },
    UpdateExpression: 'ADD #v :v, #u :u',
    ExpressionAttributeNames: { '#v': 'views', '#u': 'visitors' },
    ExpressionAttributeValues: { ':v': views, ':u': visitors },
  }));
}

// POST pageview { path, newDay, newPage }. Always answers 204: a beacon has nobody to tell.
export async function pageviewHandler(event) {
  let body = {};
  try { body = parseBody(event); } catch (e) { return NOTHING; }
  const path = cleanPath(body.path);
  const agent = headerOf(event, 'User-Agent') || '';
  if (!path || !agent || BOT.test(agent)) return NOTHING;
  const day = dayOf();
  await Promise.all([
    add(day, path, 1, body.newPage ? 1 : 0),
    add(day, TOTAL, 1, body.newDay ? 1 : 0),
  ]);
  return NOTHING;
}

function sameToken(given, expected) {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function requireStats(event) {
  const stats = headerOf(event, 'X-Stats-Token') || '';
  const admin = headerOf(event, 'X-Admin-Token') || '';
  if (sameToken(stats, process.env.STATS_TOKEN) || sameToken(admin, process.env.DISCUSS_ADMIN_TOKEN)) return;
  throw new HttpError(401, 'Not authorised');
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Every day from `from` to `to` inclusive, as YYYY-MM-DD.
export function daysBetween(from, to) {
  const out = [];
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = new Date(`${from}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// One day's rows: { day, views, visitors, pages: [{ path, views, visitors }] }, pages most
// viewed first.
export async function readDay(day) {
  const rows = [];
  let start;
  do {
    const out = await db().send(new QueryCommand({
      TableName: CONFIG.pageViewsTable,
      KeyConditionExpression: '#d = :d',
      ExpressionAttributeNames: { '#d': 'day' },
      ExpressionAttributeValues: { ':d': day },
      ...(start ? { ExclusiveStartKey: start } : {}),
    }));
    rows.push(...(out.Items || []));
    start = out.LastEvaluatedKey;
  } while (start);
  const total = rows.find((r) => r.path === TOTAL) || {};
  const pages = rows
    .filter((r) => r.path !== TOTAL)
    .map((r) => ({ path: r.path, views: r.views || 0, visitors: r.visitors || 0 }))
    .sort((a, b) => b.views - a.views || (a.path < b.path ? -1 : 1));
  return { day, views: total.views || 0, visitors: total.visitors || 0, pages };
}

// GET page-stats?from=YYYY-MM-DD&to=YYYY-MM-DD (to defaults to from; at most 92 days).
export async function pageStatsHandler(event) {
  requireStats(event);
  const q = event.queryStringParameters || {};
  const from = q.from || '';
  const to = q.to || from;
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || to < from) throw new HttpError(400, 'from and to are days, YYYY-MM-DD');
  const days = daysBetween(from, to);
  if (days.length > MAX_DAYS) throw new HttpError(400, `At most ${MAX_DAYS} days at a time`);
  return reply(200, { success: true, days: await Promise.all(days.map(readDay)) });
}
