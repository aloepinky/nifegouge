import { call, post, readMirror } from '../serverApi';
import { legKey } from './rules';

// The course rules document over the network: read from the mirror, written through the
// discuss API (lambda/discussApi/courseRules.mjs). One document per wing; TW-4's is `tw4`.

export const RULES_ID = 'tw4';

// { rev, updatedAt, author, summary, doc }, or null before the document exists.
export const fetchCourseRules = (id = RULES_ID) => readMirror(`courserules/${id}.json`);

export const courseRulesHistory = (id = RULES_ID) => call(`courserules-history?id=${encodeURIComponent(id)}`);

export const courseRulesRevision = async (rev, id = RULES_ID) =>
  (await call(`courserules-revision?id=${encodeURIComponent(id)}&rev=${rev}`)).revision;

export const restoreCourseRules = (rev, author, id = RULES_ID) => post('restore-courserules', { id, rev, author });

// Publishes `edit(doc)` on top of `base`. When someone else has published since, the newest is
// read again, and if none of the legs this edit touches changed in between, the edit is put on
// top of it and published once more. A real clash is thrown with `.clash` naming the legs.
export async function publishEdit({ base, edit, touched, author, summary }) {
  const attempt = (record) => post('save-courserules', {
    id: RULES_ID, baseRev: record.rev, doc: edit(record.doc), author, summary,
  });
  try {
    return await attempt(base);
  } catch (err) {
    if (err.status !== 409) throw err;
    const newest = await fetchCourseRules();
    if (!newest) throw err;
    const clash = touched.filter((id) => legKey(base.doc, id) !== legKey(newest.doc, id));
    if (clash.length) {
      const error = new Error('Someone changed this while you were editing it.');
      error.clash = clash;
      error.newest = newest;
      throw error;
    }
    return attempt(newest);
  }
}
