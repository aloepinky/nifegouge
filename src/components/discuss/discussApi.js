import { useEffect, useState, useSyncExternalStore } from 'react';
import { upsertItemMeta } from './registry';
import { DELTA_ID } from './SyllabusContext';
import { call, post, readMirror, savedMirror, makeStore } from '../serverApi';
import { schoolNs } from '../programs';
import { DEFAULT_PROGRAM } from './program';

// Everything the Discuss tab reads and writes over the network: what an item and a syllabus
// record are, how they are cached and when they are refetched. The transport under all of it
// — the two bases, the `.status`/`.data` error contract, the store factory and the author
// name — is shared with the jet log page and lives in ../serverApi.

export { DELTA_ID };
export { API_BASE_URL, MIRROR_BASE_URL, getAuthor, setAuthor } from '../serverApi';

// ---------------------------------------------------------------------------------------
// Which school's corpus this mount reads
//
// A page is identified by (school, slug), not slug alone: NIFE and Primary both brief a turn
// pattern, a CRM item and a power-off stall, and those are different pages about different
// aircraft. The stored address is `items/<school>/<slug>.json`.
//
// The school is held here, set once by the mount, rather than passed through the ~30 call
// sites that name a page — all of which go on passing a bare slug, because the bare slug is
// what a document carries and what a URL shows. registry.js already holds the item index in a
// module for the same reason.

let corpusSchool = DEFAULT_PROGRAM.school;

export function setCorpusSchool(next) {
  if (next) corpusSchool = next;
}

export const getCorpusSchool = () => corpusSchool;

// The cache key and the mirror path for a page of the current school. Cache keys carry the
// school too, so two schools' `turn-pattern` never share an entry.
const keyOf = (slug) => `${schoolNs(corpusSchool)}/${String(slug).toLowerCase()}`;

// ---------------------------------------------------------------------------------------
// Reads

export const fetchItemIndex = () => readMirror('items/index.json');
export const fetchItem = (slug) => readMirror(`items/${keyOf(slug)}.json`);
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

const items = makeStore();
const syllabi = makeStore();

// ---------------------------------------------------------------------------------------
// Items

export function rememberItem(record) {
  const key = keyOf(record.slug);
  items.set(key, record);
  upsertItemMeta({
    slug: record.slug,
    title: record.item.title,
    rev: record.rev,
    updatedAt: record.updatedAt,
    maneuver: record.item.maneuver || undefined,
    stub: record.item.stub || undefined,
    generated: record.item.generated || undefined,
    aircraft: record.item.aircraft || undefined,
    school: record.item.school || undefined,
  });
}

export function getCachedItem(slug) {
  return items.get(keyOf(slug)) || null;
}

// The copy of a page this browser saved on an earlier visit, put in the store so the page draws
// at once. useItem revalidates it straight after, as it does any cached record.
function seedItem(key) {
  if (!items.has(key)) {
    const saved = savedMirror(`items/${key}.json`);
    if (saved) items.seed(key, saved);
  }
  return items.get(key);
}

// A mirror read that never moves the cache backwards: a fetch that started before a publish
// can land after it, and its older revision must not replace the newer one.
async function revalidateItem(slug) {
  const key = keyOf(slug);
  const record = await fetchItem(slug);
  const current = items.get(key);
  if (!record) {
    if (current) items.delete(key);
    return null;
  }
  if (!current || record.rev > current.rev) items.set(key, record);
  return items.get(key) || record;
}

export function refreshItem(slug) {
  return revalidateItem(slug);
}

const inflight = new Map();

export function prefetchItem(slug) {
  if (!slug) return;
  const key = keyOf(slug);
  if (items.has(key) || inflight.has(key)) return;
  const p = revalidateItem(slug).catch(() => null).finally(() => inflight.delete(key));
  inflight.set(key, p);
}

// { status: 'none' | 'loading' | 'ready' | 'missing' | 'error', record, error, reload }.
// Stale-while-revalidate: a cached record renders at once and a background read replaces it
// only if the mirror has moved on.
export function useItem(slug) {
  const key = slug ? keyOf(slug) : null;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState(() => {
    if (!key) return { status: 'none' };
    const cached = seedItem(key);
    return cached ? { status: 'ready', record: cached } : { status: 'loading' };
  });

  useEffect(() => {
    if (!key) {
      setState({ status: 'none' });
      return undefined;
    }
    let live = true;
    const cached = seedItem(key);
    setState(cached ? { status: 'ready', record: cached } : { status: 'loading' });

    revalidateItem(slug)
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
  }, [key, slug, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

// -> { slug, rev, updatedAt }
export function saveItem(slug, baseRev, item, { author, summary }) {
  return post('save-item', { slug, baseRev, item, author, summary, school: corpusSchool });
}

// -> { slug, rev: 1, linked, syllabusRev?, linkError? }
export function createItem(body) {
  return post('create-item', body);
}

// -> { slug, rev, updatedAt }
export function restoreItem(slug, rev, { author, summary } = {}) {
  return post('restore-item', { slug, rev, author, summary, school: corpusSchool });
}

// -> { latestRev, hidden, revisions: [{ rev, author, summary, createdAt, baseRev }] }
export function itemHistory(slug) {
  return call(`item-history?slug=${encodeURIComponent(slug)}&school=${encodeURIComponent(corpusSchool)}`);
}

// -> { rev, author, summary, createdAt, baseRev, item }
export function itemRevision(slug, rev) {
  return call(`item-revision?slug=${encodeURIComponent(slug)}&rev=${rev}&school=${encodeURIComponent(corpusSchool)}`).then((d) => d.revision);
}

// -> { uploadUrl, publicUrl, key }
export function figureUploadUrl(slug, name) {
  return post('figure-upload-url', { slug, name, school: corpusSchool });
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

// Syllabi drawn from a copy saved on an earlier visit, not yet checked against the mirror.
const unchecked = new Set();

function seedSyllabus(id) {
  if (!id || syllabi.has(id)) return;
  const saved = savedMirror(`syllabi/${id}.json`);
  if (!saved) return;
  syllabi.seed(id, saved);
  unchecked.add(id);
}

// Fetched once per session per syllabus and then served from the store, so moving between a
// syllabus's chart, block pages and event pages does not refetch it. A save or a refresh
// updates the store and every mounted reader. A copy saved on an earlier visit is shown at once
// and re-read once in the background.
export function useRemoteSyllabus(id) {
  seedSyllabus(id);
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
    let live = true;
    if (syllabi.has(id)) {
      setState({ status: 'ready' });
      if (unchecked.has(id)) {
        unchecked.delete(id);
        fetchSyllabus(id)
          .then((found) => {
            if (!found) {
              syllabi.delete(id);
              if (live) setState({ status: 'missing' });
              return;
            }
            // Replaced only when it has moved on, so an unchanged syllabus is not rebuilt.
            const current = syllabi.get(id);
            if (!current || current.rev !== found.rev) syllabi.set(id, found);
          })
          // Offline: the saved copy stands, and the next visit tries again.
          .catch(() => {});
      }
      return () => { live = false; };
    }
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

