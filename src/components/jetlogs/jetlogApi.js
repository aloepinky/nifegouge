import { useCallback, useEffect, useState } from 'react';
import { call, post, readMirror, makeStore } from '../serverApi';

// The jet log corpus over the network. The same server, bucket and revision model as the
// discuss pages; see ../serverApi for the transport they share.
//
// The list reads `jetlogs/index.json`, which carries a name, where each log is filed and its
// mode — enough to draw the whole tree, and about 3 KB. A jet log's document is fetched only
// when it is applied, and prefetched when a row is pointed at, so the click is usually
// instant. The alternative, one file of every document, is 58 KB today for a reader who
// applies nothing and grows with every syllabus added.

const records = makeStore();
const inflight = new Map();

// ---------------------------------------------------------------------------------------
// Reads

export const fetchJetLogIndex = () => readMirror('jetlogs/index.json');

// A just-published jet log is mirrored before the API answers, so the mirror is normally
// enough; the API is the fallback for the moment between.
export async function fetchJetLog(id) {
  const record = await readMirror(`jetlogs/${id.toLowerCase()}.json`);
  if (record) return record;
  try {
    return (await call(`get-jetlog?id=${encodeURIComponent(id)}`)).jetlog;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// Never moved backwards by a late response: a fetch begun before a publish must not overwrite
// the record that publish put here.
export function rememberJetLog(record) {
  if (!record) return;
  const key = record.id.toLowerCase();
  const current = records.get(key);
  if (!current || record.rev >= current.rev) records.set(key, record);
}

export const cachedJetLog = (id) => records.get(id.toLowerCase());

// One request per id at a time, errors swallowed: a prefetch that fails costs the click a
// second attempt and nothing else.
export function prefetchJetLog(id) {
  const key = id.toLowerCase();
  if (records.has(key) || inflight.has(key)) return;
  const run = fetchJetLog(key)
    .then((record) => { rememberJetLog(record); })
    .catch(() => {})
    .finally(() => inflight.delete(key));
  inflight.set(key, run);
}

// The document behind a row, from the cache when it is there. Throws when the server cannot
// be reached, so the caller can say so rather than doing nothing.
export async function loadJetLog(id) {
  const key = id.toLowerCase();
  const cached = records.get(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) {
    await pending;
    if (records.has(key)) return records.get(key);
  }
  const record = await fetchJetLog(key);
  rememberJetLog(record);
  return record;
}

// ---------------------------------------------------------------------------------------
// Writes. A 409 arrives as an Error carrying `.status` and `.data.rev`.

// -> { id, rev: 1, updatedAt }. The server mints the id from the name.
export const publishJetLog = (log, { author, summary } = {}) => post('publish-jetlog', { log, author, summary });

// -> { id, rev, updatedAt }; 409 when baseRev is no longer the newest.
export const saveJetLog = (id, baseRev, log, { author, summary } = {}) => post('save-jetlog', { id, baseRev, log, author, summary });

// -> { id, rev, updatedAt }. The old document comes back as a new revision on top.
export const restoreJetLog = (id, rev, { author, summary } = {}) => post('restore-jetlog', { id, rev, author, summary });

export const jetLogHistory = (id) => call(`jetlog-history?id=${encodeURIComponent(id)}`);

export const jetLogRevision = (id, rev) => call(`jetlog-revision?id=${encodeURIComponent(id)}&rev=${rev}`)
  .then((d) => d.revision);

// ---------------------------------------------------------------------------------------
// The list

// `{ status, logs, error, reload }`. The index is small and is refetched after every write,
// since the server mirrors what it wrote before answering.
export function useJetLogIndex() {
  const [state, setState] = useState({ status: 'loading', logs: [], error: null });

  const load = useCallback(() => {
    let alive = true;
    setState((s) => (s.status === 'ready' ? s : { ...s, status: 'loading' }));
    fetchJetLogIndex().then(
      (data) => {
        if (!alive) return;
        setState({ status: 'ready', logs: (data && data.logs) || [], error: null });
      },
      (error) => {
        if (!alive) return;
        setState({ status: 'error', logs: [], error });
      },
    );
    return () => { alive = false; };
  }, []);

  useEffect(load, [load]);

  return { ...state, reload: load };
}
