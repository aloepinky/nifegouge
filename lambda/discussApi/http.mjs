import { timingSafeEqual } from 'node:crypto';

// The response envelope, shared by every handler: `{ success: true, ... }` on the way out and
// `{ success: false, error }` on a refusal, the same shape lambda/discussSyllabi used and
// syllabusApi.js's `call()` already understands.

export const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export const reply = (statusCode, body) => ({
  statusCode,
  headers: HEADERS,
  body: JSON.stringify(body),
});

export const fail = (statusCode, error, extra = {}) => reply(statusCode, { success: false, error, ...extra });

// A handler refuses by throwing one of these; the router turns it into `fail()`. Anything else
// thrown is a 500 with no detail, since an internal message is not for the browser.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function parseBody(event) {
  if (event.body == null) return {};
  if (typeof event.body !== 'string') return event.body;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new HttpError(400, 'Body must be JSON');
  }
}

export function headerOf(event, name) {
  const headers = event.headers || {};
  const want = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === want) return headers[key];
  }
  return undefined;
}

// Free text from the browser: control characters out, whitespace collapsed, length capped.
export function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// What a revision records about itself: who (a display name, optional) and why.
export const cleanAuthor = (value) => cleanText(value, 40);
export const cleanSummary = (value) => cleanText(value, 200);

export const ok = (extra) => reply(200, { success: true, ...extra });

// A name made into an id: lowercase words joined by single hyphens, at most 40 characters, or
// `fallback` when nothing of the name survives.
export function slugify(text, fallback) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    || fallback;
}

// A jet log's or a brief's id, which is shaped like an item's slug.
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_ID = 60;

export const isId = (id) => typeof id === 'string' && ID_RE.test(id);

export function checkId(id) {
  if (typeof id !== 'string' || !id) throw new HttpError(400, 'id is required');
  if (id.length > MAX_ID) throw new HttpError(400, `An id is at most ${MAX_ID} characters`);
  if (!ID_RE.test(id)) throw new HttpError(400, 'An id is lowercase words joined by single hyphens');
  return id;
}

// `?id=` on a GET, lowercased.
export function idParam(event) {
  const params = event.queryStringParameters || {};
  const id = (params.id || '').toLowerCase();
  if (!id) throw new HttpError(400, 'id is required');
  return id;
}

// The aircraft and the school a page or a syllabus is for: "T-6B" and "Primary". Every page
// and every syllabus carries both, because a page with the same title can exist for another
// aircraft, and nothing but these two fields tells them apart. Free text, short.
export const MAX_TAG = 40;

export function cleanTag(value) {
  return cleanText(value, MAX_TAG);
}

// Reads the pair off a body, an item or a document; throws unless both are present.
export function requireProgram(source, what) {
  const aircraft = cleanTag(source && source.aircraft);
  const school = cleanTag(source && source.school);
  if (!aircraft) throw new HttpError(400, `${what} names no aircraft`);
  if (!school) throw new HttpError(400, `${what} names no school`);
  return { aircraft, school };
}

// Admin operations carry the token in a header. The comparison is constant-time, and a function
// with no token configured refuses everything rather than accepting anything.
export function requireAdmin(event) {
  const expected = process.env.DISCUSS_ADMIN_TOKEN || '';
  if (!expected) throw new HttpError(500, 'Admin token is not configured');
  const given = headerOf(event, 'X-Admin-Token') || '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Not authorised');
}
