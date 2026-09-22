import { useCallback, useEffect, useState } from 'react';
import { call, post, readMirror, makeStore } from '../serverApi';

// The briefs corpus over the network. The same server, bucket and revision model as the
// discuss pages and the jet logs; see ../serverApi for the transport they share.
//
// `briefs/index.json` carries what the buttons draw (a short name, the program, the order),
// and a brief's document is fetched when it is opened. There are three today, so this is less
// about bytes than about the page drawing its buttons before the first brief has arrived.

const records = makeStore();

export const fetchBriefIndex = () => readMirror('briefs/index.json');

// A just-published brief is mirrored before the API answers, so the mirror is normally enough;
// the API is the fallback for the moment between.
export async function fetchBrief(id) {
  const record = await readMirror(`briefs/${id.toLowerCase()}.json`);
  if (record) return record;
  try {
    return (await call(`get-brief?id=${encodeURIComponent(id)}`)).brief;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// Never moved backwards by a late response: a fetch begun before a publish must not overwrite
// the record that publish put here.
export function rememberBrief(record) {
  if (!record) return;
  const key = record.id.toLowerCase();
  const current = records.get(key);
  if (!current || record.rev >= current.rev) records.set(key, record);
}

// ---------------------------------------------------------------------------------------
// Writes. A 409 arrives as an Error carrying `.status` and `.data.rev`.

export const publishBrief = (brief, { author, summary } = {}) => post('publish-brief', { brief, author, summary });

export const saveBrief = (id, baseRev, brief, { author, summary } = {}) => post('save-brief', {
  id, baseRev, brief, author, summary,
});

export const restoreBrief = (id, rev, { author, summary } = {}) => post('restore-brief', { id, rev, author, summary });

export const briefHistory = (id) => call(`brief-history?id=${encodeURIComponent(id)}`);

export const briefRevision = (id, rev) => call(`brief-revision?id=${encodeURIComponent(id)}&rev=${rev}`)
  .then((d) => d.revision);

// ---------------------------------------------------------------------------------------
// Hooks

// `{ status, briefs, error, reload }`, the buttons in index order.
export function useBriefIndex() {
  const [state, setState] = useState({ status: 'loading', briefs: [], error: null });

  const load = useCallback(() => {
    let alive = true;
    fetchBriefIndex().then(
      (data) => { if (alive) setState({ status: 'ready', briefs: (data && data.briefs) || [], error: null }); },
      (error) => { if (alive) setState((s) => ({ ...s, status: 'error', error })); },
    );
    return () => { alive = false; };
  }, []);

  useEffect(load, [load]);
  return { ...state, reload: load };
}

// `{ status, record, error, reload }` for one brief. A cached record shows at once and is
// revalidated behind it, the way the discuss pages load.
export function useBrief(id) {
  const [state, setState] = useState(() => {
    const cached = id && records.get(id.toLowerCase());
    return cached ? { status: 'ready', record: cached, error: null } : { status: 'loading', record: null, error: null };
  });
  const [tick, setTick] = useState(0);

  useEffect(() => records.subscribe((key) => {
    if (id && key === id.toLowerCase()) setState({ status: 'ready', record: records.get(key), error: null });
  }), [id]);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    const cached = records.get(id.toLowerCase());
    setState(cached ? { status: 'ready', record: cached, error: null } : { status: 'loading', record: null, error: null });
    fetchBrief(id).then(
      (record) => {
        if (!alive) return;
        if (!record) {
          setState({ status: 'missing', record: null, error: null });
          return;
        }
        rememberBrief(record);
        setState({ status: 'ready', record: records.get(id.toLowerCase()), error: null });
      },
      (error) => {
        if (alive && !cached) setState({ status: 'error', record: null, error });
      },
    );
    return () => { alive = false; };
  }, [id, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
