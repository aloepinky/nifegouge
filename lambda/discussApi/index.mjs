import { HEADERS, HttpError, fail, parseBody, reply, requireAdmin } from './http.mjs';
import {
  listSyllabiHandler, getSyllabusHandler, publishSyllabusHandler, saveSyllabusHandler,
  importSyllabusHandler, hideSyllabusHandler,
} from './syllabi.mjs';
import {
  getItemHandler, itemHistoryHandler, itemRevisionHandler, saveItemHandler, createItemHandler,
  restoreItemHandler, figureUploadUrlHandler, importItemsHandler, hideItemHandler,
} from './items.mjs';
import {
  rebuildItemsIndex, rebuildSyllabiIndex, remirrorSyllabi, mirrorItem,
} from './mirror.mjs';
import { listItemMetas, newestItem } from './store.mjs';

// The Discuss tab's API: item pages, syllabus documents, figure uploads, and the admin
// operations behind X-Admin-Token. One API Gateway resource, /discuss/{proxy+}, routes every
// op here; the op is the last path segment and is matched exactly.
//
// Reads by the site never come here. Every write mirrors what it changed to the public S3
// bucket (see mirror.mjs), and the browser fetches from there.
//
//   GET  list-syllabi                      -> { syllabi }
//   GET  get-syllabus?id=                  -> { syllabus }
//   POST publish-syllabus                  { name, doc, author? }                   -> { id, rev }
//   POST save-syllabus                     { id, baseRev, doc, name?, author?, summary? } -> { id, rev }; 409
//   GET  get-item?slug=                    -> { item }
//   GET  item-history?slug=                -> { latestRev, revisions }
//   GET  item-revision?slug=&rev=          -> { revision }
//   POST save-item                         { slug, baseRev, item, author?, summary }  -> { rev, lint }; 400 lint; 409
//   POST create-item                       { slug, title, sourcingLead?, author?, summary?, link? } -> { rev: 1, linked }
//   POST restore-item                      { slug, rev, author?, summary? }           -> { rev }
//   POST figure-upload-url                 { slug, name }                             -> { uploadUrl, publicUrl, key }
//   POST import-items        (admin)       { items, overwrite? }                      -> { imported, skipped }
//   POST import-syllabus     (admin)       { id, name, doc, replace? }                -> { id, rev }
//   POST hide-item           (admin)       { slug, hidden }
//   POST hide-syllabus       (admin)       { id, hidden }
//   POST rebuild-index       (admin)       { what?: 'items'|'syllabi'|'all', remirror?: bool } -> { items, syllabi }

async function rebuildIndexHandler(event) {
  const body = parseBody(event);
  const what = body.what || 'all';
  const out = {};
  if (what === 'items' || what === 'all') {
    if (body.remirror) {
      for (const meta of await listItemMetas()) {
        if (meta.hidden) continue;
        const found = await newestItem(meta.slug);
        if (found) await mirrorItem(found.meta, found.row);
      }
    }
    out.items = await rebuildItemsIndex();
  }
  if (what === 'syllabi' || what === 'all') {
    if (body.remirror) await remirrorSyllabi();
    out.syllabi = await rebuildSyllabiIndex();
  }
  return reply(200, { success: true, ...out });
}

const ROUTES = {
  'list-syllabi': { method: 'GET', run: listSyllabiHandler },
  'get-syllabus': { method: 'GET', run: getSyllabusHandler },
  'publish-syllabus': { method: 'POST', run: publishSyllabusHandler },
  'save-syllabus': { method: 'POST', run: saveSyllabusHandler },
  'get-item': { method: 'GET', run: getItemHandler },
  'item-history': { method: 'GET', run: itemHistoryHandler },
  'item-revision': { method: 'GET', run: itemRevisionHandler },
  'save-item': { method: 'POST', run: saveItemHandler },
  'create-item': { method: 'POST', run: createItemHandler },
  'restore-item': { method: 'POST', run: restoreItemHandler },
  'figure-upload-url': { method: 'POST', run: figureUploadUrlHandler },
  'import-items': { method: 'POST', admin: true, run: importItemsHandler },
  'import-syllabus': { method: 'POST', admin: true, run: importSyllabusHandler },
  'hide-item': { method: 'POST', admin: true, run: hideItemHandler },
  'hide-syllabus': { method: 'POST', admin: true, run: hideSyllabusHandler },
  'rebuild-index': { method: 'POST', admin: true, run: rebuildIndexHandler },
};

function opOf(event) {
  const proxy = event.pathParameters && event.pathParameters.proxy;
  const path = proxy || event.path || '';
  return path.split('/').filter(Boolean).pop() || '';
}

export const handler = async (event) => {
  const method = event.httpMethod || '';
  if (method === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  const op = opOf(event);
  const route = ROUTES[op];
  if (!route || route.method !== method) return fail(404, 'Endpoint not found');

  try {
    if (route.admin) requireAdmin(event);
    return await route.run(event);
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message, error.extra);
    console.error('Handler error:', error);
    return fail(500, 'Internal server error');
  }
};
