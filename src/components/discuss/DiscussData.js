import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchItemIndex, useRemoteSyllabus } from './discussApi';
import { setItemIndex, itemList, useItemIndexVersion } from './registry';
import { fromDoc, DELTA_ID } from './SyllabusContext';
import { buildMatcher } from './jppt/matchItems';

// What every discuss page needs before it can render: the item index (titles and flags for
// every page, into registry.js) and the Delta Primary syllabus document. Both come from the
// mirror in parallel, once per session; the index is held here so a route change does not
// fetch it again.

const Ctx = createContext(null);

let indexPromise = null;
let indexLoaded = false;

function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetchItemIndex().then((data) => {
      if (!data) throw new Error('The discussion items are not published yet.');
      setItemIndex(data.items);
      indexLoaded = true;
      return data;
    }).catch((err) => {
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

export function DiscussDataProvider({ children, renderLoading, renderError }) {
  const [indexState, setIndexState] = useState(() => ({ status: indexLoaded ? 'ready' : 'loading' }));
  const [tick, setTick] = useState(0);
  const remote = useRemoteSyllabus(DELTA_ID);
  const version = useItemIndexVersion();

  useEffect(() => {
    let live = true;
    if (indexLoaded) {
      setIndexState({ status: 'ready' });
      return undefined;
    }
    setIndexState({ status: 'loading' });
    loadIndex().then(
      () => { if (live) setIndexState({ status: 'ready' }); },
      (error) => { if (live) setIndexState({ status: 'error', error }); },
    );
    return () => { live = false; };
  }, [tick]);

  const delta = useMemo(
    () => (remote.status === 'ready' ? fromDoc(remote.record, { builtIn: true }) : null),
    [remote.status, remote.record],
  );

  // The phrase matcher an upload and a generated syllabus use to tie JPPT wordings to pages:
  // every Delta label and every page title.
  const matcher = useMemo(
    () => (delta ? buildMatcher(delta.events, itemList()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delta, version],
  );

  const value = useMemo(() => ({ delta, matcher, deltaRecord: remote.record || null }), [delta, matcher, remote.record]);

  const failed = indexState.status === 'error'
    ? indexState.error
    : (remote.status === 'error' && remote.error)
      || (remote.status === 'missing' && new Error('The Delta Primary syllabus is not published yet.'))
      || null;

  if (failed) return renderError(failed, () => setTick((t) => t + 1));
  if (!delta || indexState.status !== 'ready') return renderLoading();

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDiscussData() {
  return useContext(Ctx);
}

export function useDelta() {
  return useContext(Ctx).delta;
}
