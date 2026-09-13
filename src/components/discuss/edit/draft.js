// The draft overlay: an edited item, held in localStorage and merged over the published one
// at render time. No React — small named helpers over a raw key, the way
// TW4Leaderboard.js and TW4JetLog.js already do it in this app.
//
// Saving an editor sends the page straight to the server, so a draft exists only when a save
// did not go through: it is the copy kept in this browser until the edit is saved or
// discarded (edit/PublishDialog.js sends it). It records `baseRev`, the revision it started
// from, so a save against a page that moved on is refused with a 409 rather than overwriting.
import { allIds } from './ids';

const KEY = 'discussDrafts';

// Item data is pure JSON — no functions, no JSX, that is the whole point of the item files —
// so a round trip is a safe deep clone and works everywhere structuredClone does not.
export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    // Quota, private mode, a disabled store. The edit stays in the open editor for this
    // session, and saving it again is still the way it gets out.
    return false;
  }
}

// The edited item, or null. `record` gives the envelope instead, for the banner's timestamp
// and for the baseline the validator compares ids against.
export function getDraft(slug) {
  const rec = readAll()[slug];
  return rec ? rec.item : null;
}

export function getRecord(slug) {
  return readAll()[slug] || null;
}

export function hasDraft(slug) {
  return !!readAll()[slug];
}

// `published` and `baseRev` describe the revision the draft sits on. `baseIds` records the ids
// the edit started from, so a later save can tell a lost id from one that never existed;
// `baseRev` is what Publish sends as the revision it expects to replace. Both are set when the
// slug is first written and again when the draft is rebased onto a newer revision.
export function saveDraft(slug, item, published, baseRev) {
  const all = readAll();
  const existing = all[slug];
  const rebased = existing && baseRev != null && existing.baseRev !== baseRev;
  all[slug] = {
    item: clone(item),
    savedAt: new Date().toISOString(),
    baseIds: existing && !rebased ? existing.baseIds : allIds(published || item),
    baseRev: baseRev != null ? baseRev : (existing ? existing.baseRev : null),
  };
  return writeAll(all);
}

export function clearDraft(slug) {
  const all = readAll();
  delete all[slug];
  return writeAll(all);
}

export function listDrafts() {
  const all = readAll();
  return Object.keys(all).map((slug) => ({ slug, savedAt: all[slug].savedAt }));
}
