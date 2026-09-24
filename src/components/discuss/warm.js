import { warmMirror } from '../serverApi';
import { schoolNs } from '../programs';

// Starts the mirror reads a Discussion Items deep link will make, from the entry bundle, before
// the tab's own chunk has downloaded. Without it the page is a waterfall: the chunk, then the
// item index and the syllabus, then the page. With it the two overlap.
//
// Deliberately imports nothing from the tab itself — pulling in discussApi or SyllabusContext
// here would put the tab back in the entry bundle. So the ids are repeated: DELTA_ID and
// NIFE_SYLLABUS_ID in SyllabusContext.js, the page address in discussApi.js's keyOf, and the
// route prefixes in Discuss.js. A copy that drifts costs only a wasted read; the page still
// makes its own.

const MOUNTS = [
  { base: '/tw4/discuss', school: 'Primary', syllabusId: 'delta-primary' },
  { base: '/nife/discuss', school: 'NIFE', syllabusId: 'nife-flight' },
];

// First path segments under a mount that are not an item's slug.
const NOT_ITEMS = new Set(['e', 'b', 's', 'upload', 'edit', 'style']);

export function warmDiscuss(pathname) {
  const mount = MOUNTS.find((m) => pathname === m.base || pathname.startsWith(`${m.base}/`));
  if (!mount) return;
  warmMirror('items/index.json');
  warmMirror(`syllabi/${mount.syllabusId}.json`);

  const rest = pathname.slice(mount.base.length).split('/').filter(Boolean);
  if (rest.length === 0) {
    warmMirror('syllabi/index.json');
  } else if (rest.length === 1 && !NOT_ITEMS.has(rest[0])) {
    let slug;
    try {
      slug = decodeURIComponent(rest[0]).toLowerCase();
    } catch {
      return;
    }
    warmMirror(`items/${schoolNs(mount.school)}/${slug}.json`);
  }
}
