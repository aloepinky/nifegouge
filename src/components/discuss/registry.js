import { useSyncExternalStore } from 'react';

// The item index, held in a module so the small synchronous consumers — the validator's
// dangling-link check, the slug datalist, the generated lists, search — keep the `getItem`-
// shaped access they always had. It is filled once by DiscussData from the mirror's
// items/index.json before any page renders, and touched again when a page is created or
// published. It holds metadata only: slug, title, revision and the flags. Page bodies come
// through discussApi.js.

let list = [];
let bySlug = new Map();
let version = 0;
const subscribers = new Set();

function notify() {
  version += 1;
  subscribers.forEach((fn) => fn());
}

export function setItemIndex(entries) {
  list = [...entries].sort((a, b) => a.title.localeCompare(b.title));
  bySlug = new Map(list.map((e) => [e.slug.toLowerCase(), e]));
  notify();
}

export function upsertItemMeta(meta) {
  const key = meta.slug.toLowerCase();
  const next = { ...(bySlug.get(key) || {}), ...meta };
  bySlug.set(key, next);
  list = [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));
  notify();
}

export function removeItemMeta(slug) {
  bySlug.delete(slug.toLowerCase());
  list = [...bySlug.values()];
  notify();
}

// Case-insensitive, like getItem was — a slug can arrive from the URL bar or the search box.
export function getItemMeta(slug) {
  return (slug && bySlug.get(slug.toLowerCase())) || null;
}

export function itemList() {
  return list;
}

export function indexVersion() {
  return version;
}

export function subscribeIndex(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// Re-renders a component whenever the index changes, so a datalist or a search index built
// from it is rebuilt after a page is created.
export function useItemIndexVersion() {
  return useSyncExternalStore(subscribeIndex, indexVersion, indexVersion);
}
