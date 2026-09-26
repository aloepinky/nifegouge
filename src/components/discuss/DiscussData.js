import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchItemIndex, useRemoteSyllabus, setCorpusSchool } from './discussApi';
import { savedMirror } from '../serverApi';
import { setItemIndex, itemList, useItemIndexVersion } from './registry';
import { fromDoc, DELTA_ID } from './SyllabusContext';
import { buildMatcher } from './jppt/matchItems';
import { DEFAULT_PROGRAM } from './program';
import { isSchool } from '../programs';
import { useDiscussBase } from './paths';

// What every discuss page needs before it can render: the item index (titles and flags for
// every page, into registry.js) and the mount's own built-in syllabus document. Both come from
// the mirror in parallel, once per session; the index is held here so a route change does not
// fetch it again.
//
// A mount names its school and its built-in syllabus. Primary's is Delta, and is the default,
// so the tab this was written for passes nothing. The index is one file for the whole site and
// is fetched once, but registry.js is keyed by bare slug and holds ONE school's pages: NIFE and
// Primary both have a `turn-pattern`, and an index holding both would answer the wrong one to
// the validator's dangling-link check, the slug datalist, the generated lists and search.

const Ctx = createContext(null);

let indexPromise = null;
// The whole corpus index, every school's. Filtered per mount below.
let allItems = null;

// The index this browser saved on an earlier visit, taken once so the tab can draw before the
// mirror answers. loadIndex still runs and replaces it.
function savedIndex() {
  if (allItems) return allItems;
  const saved = savedMirror('items/index.json');
  if (saved && Array.isArray(saved.items)) allItems = saved.items;
  return allItems;
}

function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetchItemIndex().then((data) => {
      if (!data) throw new Error('The discussion items are not published yet.');
      allItems = data.items;
      return data;
    }).catch((err) => {
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

export function DiscussDataProvider({
  children,
  renderLoading,
  renderError,
  school = DEFAULT_PROGRAM.school,
  syllabusId = DELTA_ID,
  syllabusName = 'Delta Primary',
}) {
  // Set before anything below can fetch a page: discussApi composes a page's address from the
  // school, so a read that started under the previous mount's school would ask for the wrong
  // file. It is a module scalar and the route decides it, so it is set during render rather
  // than in an effect, which would run after the children had already asked.
  setCorpusSchool(school);

  const root = useDiscussBase();

  const [indexState, setIndexState] = useState(() => {
    const ready = savedIndex();
    if (ready) setItemIndex(ready.filter((entry) => isSchool(entry, school)));
    return { status: ready ? 'ready' : 'loading' };
  });
  const [tick, setTick] = useState(0);
  const remote = useRemoteSyllabus(syllabusId);
  const version = useItemIndexVersion();

  useEffect(() => {
    let live = true;
    // With a saved index on screen, the read below only freshens it, and a failure leaves the
    // saved one standing rather than replacing the tab with an error.
    const shown = savedIndex();
    if (shown) setItemIndex(shown.filter((entry) => isSchool(entry, school)));
    else setIndexState({ status: 'loading' });
    loadIndex().then(
      () => {
        if (!live) return;
        setItemIndex(allItems.filter((entry) => isSchool(entry, school)));
        setIndexState({ status: 'ready' });
      },
      (error) => { if (live && !shown) setIndexState({ status: 'error', error }); },
    );
    return () => { live = false; };
  }, [tick, school]);

  const builtIn = useMemo(
    () => (remote.status === 'ready' ? fromDoc(remote.record, { builtIn: true, root }) : null),
    [remote.status, remote.record, root],
  );

  // The phrase matcher an upload and a generated syllabus use to tie JPPT wordings to pages:
  // every label on the built-in syllabus and every page title.
  const matcher = useMemo(
    () => (builtIn ? buildMatcher(builtIn.events, itemList()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [builtIn, version],
  );

  const value = useMemo(
    () => ({ builtIn, matcher, builtInRecord: remote.record || null, school, syllabusId, syllabusName }),
    [builtIn, matcher, remote.record, school, syllabusId, syllabusName],
  );

  const failed = indexState.status === 'error'
    ? indexState.error
    : (remote.status === 'error' && remote.error)
      || (remote.status === 'missing' && new Error(`The ${syllabusName} syllabus is not published yet.`))
      || null;

  if (failed) return renderError(failed, () => setTick((t) => t + 1));
  if (!builtIn || indexState.status !== 'ready') return renderLoading();

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDiscussData() {
  return useContext(Ctx);
}

// The mount's own syllabus: Delta on the Primary tab, the NIFE document on NIFE's.
export function useBuiltInSyllabus() {
  return useContext(Ctx).builtIn;
}
