import { parseBody, reply } from './http.mjs';
import { listItemMetas, newestItem, copyItemRows } from './store.mjs';
import { mirrorItem, rebuildItemsIndex } from './mirror.mjs';
import { itemId, isNamespaced } from './namespace.mjs';

// Admin. Moves the corpus onto school-namespaced keys, so two schools can both have a
// `turn-pattern`. See namespace.mjs for why, and the plan for the cutover this sits inside.
//
//   POST namespace-items { limit?, dryRun? } -> { moved, skipped, remaining, examples }
//
// Bounded by `limit` (default 40) so one call fits the function's timeout, and `remaining`
// says how many are left; tools/discuss-namespace.js loops until it is zero. The shape is
// tag-program's, for the same reason.
//
// Nothing is deleted and nothing is overwritten. Each page is COPIED from its bare key to its
// namespaced one with every revision intact; the old rows stay exactly where they are, which
// is what makes this reversible — until the client cuts over, the site is still reading them.
// Running it twice is a no-op: a destination that already has a meta row is skipped.
//
// A page with no `school` cannot be placed and is skipped rather than guessed at. That should
// be none of them — the server has required the field since tag-program ran — and any that
// turn up are reported by slug so they can be tagged and the run repeated.

export async function namespaceItemsHandler(event) {
  const body = parseBody(event);
  const limit = Math.max(1, Math.min(200, Number(body.limit) || 40));
  const dryRun = !!body.dryRun;

  const all = await listItemMetas();
  const done = new Set(all.filter((m) => isNamespaced(m.slug)).map((m) => m.slug));

  // Candidates: a bare key whose namespaced twin does not exist yet. Hidden rows come too —
  // a page taken down keeps its history, and leaving it behind would strand it.
  const pending = all.filter((m) => {
    if (isNamespaced(m.slug)) return false;
    const school = (m.flags || {}).school;
    if (!school) return false;
    return !done.has(itemId(school, m.slug));
  });

  const untagged = all
    .filter((m) => !isNamespaced(m.slug) && !(m.flags || {}).school)
    .map((m) => m.slug);

  const moved = [];
  const skipped = [];
  for (const meta of pending.slice(0, limit)) {
    const to = itemId((meta.flags || {}).school, meta.slug);
    if (dryRun) { moved.push(`${meta.slug} -> ${to}`); continue; }
    const result = await copyItemRows(meta.slug, to);
    if (!result) { skipped.push(meta.slug); continue; }
    if (result.already) { skipped.push(meta.slug); continue; }
    // Mirror the new address straight away, so it is readable the moment it exists.
    if (!meta.hidden) {
      const found = await newestItem(to);
      if (found) await mirrorItem(found.meta, found.row);
    }
    moved.push(`${meta.slug} -> ${to} (${result.copied} revisions)`);
  }

  // The index prefers a namespaced row over its legacy twin, so rebuilding it after a batch
  // keeps it at one entry per page throughout.
  if (!dryRun && moved.length) await rebuildItemsIndex();

  return reply(200, {
    success: true,
    moved: moved.length,
    skipped: skipped.length,
    remaining: Math.max(0, pending.length - moved.length),
    untagged,
    examples: moved.slice(0, 5),
  });
}
