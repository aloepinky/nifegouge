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
// sort `path`. One row per page per day holds `views` and `visitors`. Rows whose key starts
// with `#` are not pages: `#total` holds the day's totals, `#school/<school>` and
// `#section/<section>` each school's and section's (since 2026-10-07). Every count is an
// atomic ADD, so nothing is read on the way in.
//
// A visitor is a browser on a day, decided in the browser: it says whether this is its first
// page of the day (`newDay`), its first view of this page today (`newPage`), and its first in
// this section and school (`newSection`, `newSchool`). Visitors can't be added up from pages
// (one reader of three Discuss pages is one Discuss visitor), which is why each level is
// counted. Nothing that identifies anyone is sent or stored, not even an IP address.
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
// Primary's old address is still Primary.
const SCHOOL_OF_PREFIX = { tw4: 'primary' };
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

// A page's section, its first two parts (/primary/discuss), and its school (primary). The
// browser works out the same two to say whether they are new to it today
// (src/components/pageviews.js); keep them alike.
export function sectionOf(path) {
  if (path === '/' || path === OTHER) return path;
  return path.split('/').slice(0, 3).join('/');
}

export function schoolOf(path) {
  if (path === '/') return 'landing';
  if (path === OTHER) return 'other';
  const prefix = path.split('/')[1];
  return SCHOOL_OF_PREFIX[prefix] || prefix;
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

// POST pageview { path, newDay, newPage, newSection, newSchool }. Always answers 204: a beacon has nobody to tell.
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
    add(day, `#section${sectionOf(path)}`, 1, body.newSection ? 1 : 0),
    add(day, `#school/${schoolOf(path)}`, 1, body.newSchool ? 1 : 0),
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

// One day's rows: { day, views, visitors, pages, sections, schools }, each list most viewed
// first. `sections` and `schools` are empty for a day before they were counted.
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
  const level = (test, name, key) => rows
    .filter(test)
    .map((r) => ({ [name]: key(r.path), views: r.views || 0, visitors: r.visitors || 0 }))
    .sort((a, b) => b.views - a.views || (a[name] < b[name] ? -1 : 1));
  return {
    day,
    views: total.views || 0,
    visitors: total.visitors || 0,
    pages: level((r) => !r.path.startsWith('#'), 'path', (p) => p),
    sections: level((r) => r.path.startsWith('#section/'), 'section', (p) => p.slice('#section'.length)),
    schools: level((r) => r.path.startsWith('#school/'), 'school', (p) => p.slice('#school/'.length)),
  };
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
