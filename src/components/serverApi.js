// What the Discuss tab and the jet log page share of the network: one API base, one mirror
// base, the error contract, and the display name a revision is attributed to.
//
// Reads come from the S3 mirror that lambda/discussApi keeps: pre-gzipped JSON, revalidated
// with an ETag on every load, no Lambda cold start between a click and a page. Writes go to
// the API and the mirror is updated before the response comes back, so a read after a write
// sees the write. Both bases can be pointed at tools/discuss-dev-server.js with the two
// REACT_APP_ variables.
//
// This is the transport and nothing else. What a record is, how it is cached and when it is
// refetched belong to whoever owns the records — discuss/discussApi.js and jetlogs/jetlogApi.js.

export const API_BASE_URL = process.env.REACT_APP_DISCUSS_API
  || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss';
export const MIRROR_BASE_URL = process.env.REACT_APP_DISCUSS_MIRROR
  || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com';

// Errors are normalised: `.status` and `.data` on the Error, so a caller can branch on a 404
// or a 409 without parsing a message. A publish conflict reads its newest revision out of
// `.data.rev`, and both editors depend on that.
export async function call(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, options);
  } catch (err) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    // An empty or non-JSON body still has a status worth reporting.
  }
  if (!response.ok || data.success === false) {
    const error = new Error(data.error || `The server answered ${response.status}.`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const post = (path, body) => call(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// null on a 404, which is how a missing record or a hidden one reads from the mirror.
export async function readMirror(key) {
  let response;
  try {
    response = await fetch(`${MIRROR_BASE_URL}/${key}`, { cache: 'no-cache' });
  } catch (err) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) {
    const error = new Error(`The server answered ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

// A tiny store: one Map per kind, and subscribers so a write re-renders whoever is showing
// the thing written.
export function makeStore() {
  const map = new Map();
  const subs = new Set();
  return {
    get: (key) => map.get(key),
    has: (key) => map.has(key),
    set: (key, value) => {
      map.set(key, value);
      subs.forEach((fn) => fn(key));
    },
    delete: (key) => {
      map.delete(key);
      subs.forEach((fn) => fn(key));
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// ---------------------------------------------------------------------------------------
// The display name a revision is attributed to. Optional, remembered in this browser.
//
// One key for the whole site: someone who typed their name to publish a discuss page should
// not be asked for it again to publish a jet log. The key is named for where it started.

const AUTHOR_KEY = 'discussAuthor';

export function getAuthor() {
  try {
    return localStorage.getItem(AUTHOR_KEY) || '';
  } catch {
    return '';
  }
}

export function setAuthor(name) {
  try {
    if (name) localStorage.setItem(AUTHOR_KEY, name);
    else localStorage.removeItem(AUTHOR_KEY);
  } catch {
    // Private mode. The name still goes out with this publish.
  }
}
