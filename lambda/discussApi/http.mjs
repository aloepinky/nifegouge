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
