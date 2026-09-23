// A page's identity is (school, slug), not slug alone.
//
// The corpus began as one school's, so `slug` was enough and became the DiscussItems partition
// key and the mirror path. It is not enough any more: NIFE and Primary both brief a turn
// pattern, a CRM item and a power-off stall, and they are different pages about different
// aircraft — the T-6B's turn pattern is two 30° angle of bank turns, the C172's is flown at 15°.
// Nine of NIFE's thirty-seven pages collide outright, and four more differ from a Primary page
// by a plural. Advanced is next.
//
// So the stored key carries the school: `primary/turn-pattern`, `nife/turn-pattern`. Three
// things are deliberately NOT changed by this:
//
//   - The slug a person types, a document carries, a URL shows, and `checkSlug` validates is
//     still the bare slug. The namespace is composed below that layer and never reaches a form,
//     a route or the regex. `/nife/discuss/turn-pattern` stays the address.
//   - The document is untouched. It already carries `school`, which the server requires, so the
//     key is derived from the document rather than stored twice.
//   - `seeAlso`, the `main`/`further` hatnotes and every cross-page link still hold bare slugs
//     and resolve inside the reader's own school.
//
// The school is normalized rather than mapped through a table of route ids, so nothing here
// has to know what the site's URLs look like.

export const schoolNs = (school) => String(school || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// (school, slug) -> the stored key. Throws nothing: callers have already run `checkSlug` on the
// slug and `requireProgram` on the document.
export function itemId(school, slug) {
  const ns = schoolNs(school);
  return ns ? `${ns}/${slug}` : slug;
}

// The inverse, tolerant of a key written before this existed. A legacy key has no separator and
// comes back as its own slug with an empty namespace, which is what lets a read fall back to it
// and the index keep printing the bare slug.
export function splitItemId(id) {
  const key = String(id || '');
  const cut = key.indexOf('/');
  if (cut < 0) return { ns: '', slug: key };
  return { ns: key.slice(0, cut), slug: key.slice(cut + 1) };
}

export const isNamespaced = (id) => String(id || '').includes('/');
