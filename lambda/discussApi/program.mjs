import { parseBody, reply, requireProgram } from './http.mjs';
import {
  listItemMetas, newestItem, saveItem, listSyllabi, newestSyllabus, putSyllabus,
} from './store.mjs';
import { mirrorItem, mirrorSyllabus, rebuildItemsIndex, rebuildSyllabiIndex } from './mirror.mjs';

// Admin. Stamps an aircraft and a school on every page and every syllabus that has neither,
// as a new revision each. The corpus was written for one aircraft and one school before the
// two fields existed, so this is how the existing rows get theirs; from then on a page or a
// syllabus cannot be created without them.
//
//   POST tag-program { aircraft, school, limit?, overwrite?, dryRun? }
//     -> { items, syllabi, remaining }
//
// Bounded by `limit` (default 40) so one call fits the function's timeout; `remaining` says
// how many pages are still untagged, and tools/discuss-tag.js loops until it is zero. With
// `overwrite`, every page and syllabus gets the pair, whatever it carried.

const SUMMARY = ({ aircraft, school }) => `Tagged ${aircraft} ${school}`;

const lacks = (thing, program, overwrite) => (
  overwrite
    ? thing.aircraft !== program.aircraft || thing.school !== program.school
    : !thing.aircraft || !thing.school
);

export async function tagProgramHandler(event) {
  const body = parseBody(event);
  const program = requireProgram(body, 'The request');
  const overwrite = !!body.overwrite;
  const limit = Math.max(1, Math.min(200, Number(body.limit) || 40));
  const dryRun = !!body.dryRun;

  // The meta row's flags carry the pair once a page is tagged, so the candidates are found
  // without reading a document.
  const metas = (await listItemMetas()).filter((m) => !m.hidden && lacks(m.flags || {}, program, overwrite));
  let items = 0;
  for (const meta of metas.slice(0, limit)) {
    if (dryRun) { items += 1; continue; }
    const found = await newestItem(meta.slug);
    if (!found) continue;
    const item = { ...JSON.parse(found.row.docJson), ...program };
    const saved = await saveItem(meta.slug, found.meta.latestRev, item, { author: 'migration', summary: SUMMARY(program) });
    await mirrorItem(saved.meta, saved.row);
    items += 1;
  }

  let syllabi = 0;
  for (const row of (await listSyllabi()).filter((r) => !r.hidden)) {
    const newest = await newestSyllabus(row.syllabusId);
    if (!newest || newest.hidden) continue;
    const doc = JSON.parse(newest.docJson);
    if (!lacks(doc, program, overwrite)) continue;
    if (dryRun) { syllabi += 1; continue; }
    const saved = await putSyllabus(row.syllabusId, newest.rev + 1, newest.name, { ...doc, ...program }, {
      author: 'migration', summary: SUMMARY(program), baseRev: newest.rev,
    });
    await mirrorSyllabus(saved);
    syllabi += 1;
  }

  if (!dryRun) {
    if (items) await rebuildItemsIndex();
    if (syllabi) await rebuildSyllabiIndex();
  }
  return reply(200, { success: true, items, syllabi, remaining: Math.max(0, metas.length - items) });
}
