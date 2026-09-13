import { useEffect, useState, useSyncExternalStore } from 'react';
import { upsertItemMeta } from './registry';
import { DELTA_ID } from './SyllabusContext';

// Everything the Discuss tab reads and writes over the network.
//
// Reads come from the S3 mirror that lambda/discussApi keeps: pre-gzipped JSON, revalidated
// with an ETag on every load, no Lambda cold start between a click and a page. Writes go to
// the API and the mirror is updated before the response comes back, so a read after a write
// sees the write. Both bases can be pointed at tools/discuss-dev-server.js with the two
// REACT_APP_ variables.
//
// Errors are normalised the way syllabusApi.js did it: `.status` and `.data` on the Error so a
// caller can branch on a 404 or a 409 without parsing a message.

export const API_BASE_URL = process.env.REACT_APP_DISCUSS_API
  || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss';
export const MIRROR_BASE_URL = process.env.REACT_APP_DISCUSS_MIRROR
  || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com';

export { DELTA_ID };

// ---------------------------------------------------------------------------------------
// Transport

async function call(path, options) {
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

const post = (path, body) => call(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// null on a 404, which is how a missing page or a hidden one reads from the mirror.
async function readMirror(key) {
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

// ---------------------------------------------------------------------------------------
// Reads

export const fetchItemIndex = () => readMirror('items/index.json');
export const fetchItem = (slug) => readMirror(`items/${slug.toLowerCase()}.json`);
export const fetchSyllabusIndex = () => readMirror('syllabi/index.json');

// A just-published syllabus is mirrored before the API answers, so the mirror is normally
// enough; the API is the fallback for the moment between.
export async function fetchSyllabus(id) {
  const record = await readMirror(`syllabi/${id}.json`);
  if (record) return record;
  try {
    return (await call(`get-syllabus?id=${encodeURIComponent(id)}`)).syllabus;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export const getSyllabus = fetchSyllabus;

export function listSyllabi() {
  return fetchSyllabusIndex().then((d) => (d ? d.syllabi : []));
}

// ---------------------------------------------------------------------------------------
// A tiny store: one Map per kind, and subscribers so a write re-renders whoever is showing
// the thing written.

function makeStore() {
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

const items = makeStore();
const syllabi = makeStore();

// ---------------------------------------------------------------------------------------
// Items

export function rememberItem(record) {
  const key = record.slug.toLowerCase();
  items.set(key, record);
  upsertItemMeta({
    slug: record.slug,
    title: record.item.title,
    rev: record.rev,
    updatedAt: record.updatedAt,
    maneuver: record.item.maneuver || undefined,
    stub: record.item.stub || undefined,
    generated: record.item.generated || undefined,
  });
}

export function getCachedItem(slug) {
  return items.get(slug.toLowerCase()) || null;
}

// A mirror read that never moves the cache backwards: a fetch that started before a publish
// can land after it, and its older revision must not replace the newer one.
async function revalidateItem(key) {
  const record = await fetchItem(key);
  const current = items.get(key);
  if (!record) {
    if (current) items.delete(key);
    return null;
  }
  if (!current || record.rev > current.rev) items.set(key, record);
  return items.get(key) || record;
}

export function refreshItem(slug) {
  return revalidateItem(slug.toLowerCase());
}

const inflight = new Map();

export function prefetchItem(slug) {
  if (!slug) return;
  const key = slug.toLowerCase();
  if (items.has(key) || inflight.has(key)) return;
  const p = revalidateItem(key).catch(() => null).finally(() => inflight.delete(key));
  inflight.set(key, p);
}

// { status: 'none' | 'loading' | 'ready' | 'missing' | 'error', record, error, reload }.
// Stale-while-revalidate: a cached record renders at once and a background read replaces it
// only if the mirror has moved on.
export function useItem(slug) {
  const key = slug ? slug.toLowerCase() : null;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState(() => {
    if (!key) return { status: 'none' };
    const cached = items.get(key);
    return cached ? { status: 'ready', record: cached } : { status: 'loading' };
  });

  useEffect(() => {
    if (!key) {
      setState({ status: 'none' });
      return undefined;
    }
    let live = true;
    const cached = items.get(key);
    setState(cached ? { status: 'ready', record: cached } : { status: 'loading' });

    revalidateItem(key)
      .then((record) => {
        if (!live) return;
        if (!record) setState({ status: 'missing' });
        else setState({ status: 'ready', record });
      })
      .catch((error) => {
        if (live && !cached) setState({ status: 'error', error });
      });

    const unsubscribe = items.subscribe((changed) => {
      if (!live || changed !== key) return;
      const now = items.get(key);
      setState(now ? { status: 'ready', record: now } : { status: 'missing' });
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, [key, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

// -> { slug, rev, updatedAt, lint: { warnings } }
export function saveItem(slug, baseRev, item, { author, summary }) {
  return post('save-item', { slug, baseRev, item, author, summary });
}

// -> { slug, rev: 1, linked, syllabusRev?, linkError? }
export function createItem(body) {
  return post('create-item', body);
}

// -> { slug, rev, updatedAt }
export function restoreItem(slug, rev, { author, summary } = {}) {
  return post('restore-item', { slug, rev, author, summary });
}

// -> { latestRev, hidden, revisions: [{ rev, author, summary, createdAt, baseRev }] }
export function itemHistory(slug) {
  return call(`item-history?slug=${encodeURIComponent(slug)}`);
}

// -> { rev, author, summary, createdAt, baseRev, item }
export function itemRevision(slug, rev) {
  return call(`item-revision?slug=${encodeURIComponent(slug)}&rev=${rev}`).then((d) => d.revision);
}

// -> { uploadUrl, publicUrl, key }
export function figureUploadUrl(slug, name) {
  return post('figure-upload-url', { slug, name });
}

// ---------------------------------------------------------------------------------------
// Syllabi

export function rememberSyllabus(record) {
  syllabi.set(record.id, record);
}

export function getCachedSyllabus(id) {
  return syllabi.get(id) || null;
}

// Re-read one syllabus from the mirror; whoever shows it re-renders.
export async function refreshSyllabus(id) {
  const record = await fetchSyllabus(id);
  if (record) syllabi.set(id, record);
  else syllabi.delete(id);
  return record;
}

// -> { id, rev }
export function publishSyllabus(name, doc, { author, summary } = {}) {
  return post('publish-syllabus', { name, doc, author, summary });
}

// -> { id, rev }. A 409 means someone saved a newer revision since `baseRev` was loaded.
export function saveSyllabus(id, baseRev, doc, name, { author, summary } = {}) {
  return post('save-syllabus', { id, baseRev, doc, name, author, summary });
}

// Fetched once per session per syllabus and then served from the store, so moving between a
// syllabus's chart, block pages and event pages does not refetch it. A save or a refresh
// updates the store and every mounted reader.
export function useRemoteSyllabus(id) {
  const record = useSyncExternalStore(
    syllabi.subscribe,
    () => (id ? syllabi.get(id) : undefined),
    () => (id ? syllabi.get(id) : undefined),
  );
  const [state, setState] = useState(() => (id ? { status: record ? 'ready' : 'loading' } : { status: 'none' }));

  useEffect(() => {
    if (!id) {
      setState({ status: 'none' });
      return undefined;
    }
    if (syllabi.has(id)) {
      setState({ status: 'ready' });
      return undefined;
    }
    let live = true;
    setState({ status: 'loading' });
    fetchSyllabus(id)
      .then((found) => {
        if (!live) return;
        if (!found) {
          setState({ status: 'missing' });
          return;
        }
        syllabi.set(id, found);
        setState({ status: 'ready' });
      })
      .catch((error) => {
        if (live) setState({ status: error.status === 404 ? 'missing' : 'error', error });
      });
    return () => { live = false; };
  }, [id]);

  if (record) return { status: 'ready', record };
  if (state.status === 'ready') return { status: 'loading' };
  return state;
}

export function useSyllabusList() {
  const [list, setList] = useState([]);
  useEffect(() => {
    let live = true;
    listSyllabi()
      .then((rows) => { if (live) setList(rows); })
      // The dropdown still offers Delta Primary if the mirror is down; nothing else to say.
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return list;
}

// ---------------------------------------------------------------------------------------
// The display name a revision is attributed to. Optional, remembered in this browser.

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
