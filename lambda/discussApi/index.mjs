import { HEADERS, HttpError, fail, parseBody, reply, requireAdmin } from './http.mjs';
import {
  listSyllabiHandler, getSyllabusHandler, publishSyllabusHandler, saveSyllabusHandler,
  importSyllabusHandler, hideSyllabusHandler, renameSyllabusHandler,
} from './syllabi.mjs';
import {
  getItemHandler, itemHistoryHandler, itemRevisionHandler, saveItemHandler, createItemHandler,
  restoreItemHandler, figureUploadUrlHandler, importItemsHandler, hideItemHandler,
  setAuthorHandler,
} from './items.mjs';
import {
  getJetLogHandler, jetLogHistoryHandler, jetLogRevisionHandler, publishJetLogHandler,
  saveJetLogHandler, restoreJetLogHandler, importJetLogsHandler, hideJetLogHandler,
} from './jetlogs.mjs';
import {
  getBriefHandler, briefHistoryHandler, briefRevisionHandler, publishBriefHandler,
  saveBriefHandler, restoreBriefHandler, hideBriefHandler,
} from './briefs.mjs';
import {
  rebuildItemsIndex, rebuildSyllabiIndex, remirrorSyllabi, mirrorItem, rebuildJetLogsIndex,
  remirrorJetLogs, rebuildBriefsIndex, remirrorBriefs,
} from './mirror.mjs';
import { listItemMetas, newestItem } from './store.mjs';
import { leaderboardHandler, submitScoreHandler, importScoresHandler } from './scores.mjs';
import { tagProgramHandler } from './program.mjs';
import { namespaceItemsHandler } from './namespaceOp.mjs';

// The Discuss tab's API: item pages, syllabus documents, figure uploads, the jet log and
// brief corpora, and the admin operations behind X-Admin-Token. One API Gateway resource,
// /discuss/{proxy+}, routes every op here; the op is the last path segment and is matched
// exactly.
//
// Jet logs share this function rather than getting their own because they share everything
// that matters: the revision model, the mirror bucket, the admin token and the deploy. The
// EPs/Limits leaderboard (scores.mjs) is here for the admin token, the deploy and the local
// fakes. Its board is the one read that comes to the Lambda rather than the mirror, because it
// is computed per window on request.
//
// Reads by the site never come here. Every write mirrors what it changed to the public S3
// bucket (see mirror.mjs), and the browser fetches from there.
//
//   GET  list-syllabi                      -> { syllabi }
//   GET  get-syllabus?id=                  -> { syllabus }
//   POST publish-syllabus                  { name, doc, author? }                   -> { id, rev }; doc carries aircraft and school
//   POST save-syllabus                     { id, baseRev, doc, name?, author?, summary? } -> { id, rev }; 409
//   GET  get-item?slug=                    -> { item }
//   GET  item-history?slug=                -> { latestRev, revisions }
//   GET  item-revision?slug=&rev=          -> { revision }
//   POST save-item                         { slug, baseRev, item, author?, summary }  -> { rev, updatedAt }; 400; 409
//   POST create-item                       { slug, title, aircraft, school, sourcingLead?, author?, summary?, link? } -> { rev: 1, linked }
//   POST restore-item                      { slug, rev, author?, summary? }           -> { rev }
//   POST figure-upload-url                 { slug, name }                             -> { uploadUrl, publicUrl, key }
//   POST import-items        (admin)       { items, overwrite? }                      -> { imported, skipped }
//   POST import-syllabus     (admin)       { id, name, doc, replace? }                -> { id, rev }
//   POST hide-item           (admin)       { slug, hidden }
//   POST set-author          (admin)       { slug, from, to }                            -> { revs }
//   POST hide-syllabus       (admin)       { id, hidden }
//   POST rename-syllabus     (admin)       { id, name }                               -> { id, rev, name }
//   GET  get-jetlog?id=                    -> { jetlog }
//   GET  jetlog-history?id=                -> { latestRev, revisions }
//   GET  jetlog-revision?id=&rev=          -> { revision }
//   POST publish-jetlog                    { log, author?, summary? }                 -> { id, rev: 1 }
//   POST save-jetlog                       { id, baseRev, log, author?, summary }     -> { id, rev, updatedAt }; 409
//   POST restore-jetlog                    { id, rev, author?, summary? }              -> { id, rev }
//   POST import-jetlogs      (admin)       { logs, overwrite? }                        -> { imported, skipped }
//   POST hide-jetlog         (admin)       { id, hidden }
//   GET  get-brief?id=                     -> { brief }
//   GET  brief-history?id=                 -> { latestRev, revisions }
//   GET  brief-revision?id=&rev=           -> { revision }
//   POST publish-brief                     { brief, author?, summary? }               -> { id, rev: 1 }; brief carries aircraft and school
//   POST save-brief                        { id, baseRev, brief, author?, summary }   -> { id, rev, updatedAt }; 409
//   POST restore-brief                     { id, rev, author?, summary? }              -> { id, rev }
//   POST hide-brief          (admin)       { id, hidden }
//   GET  leaderboard?school=&mode=&period=month|year|all&player= -> { entries, you, players }
//   POST submit-score                      { school, mode, elapsedTime, epsTime?, limitsTime?, playerName, country, branch, designator, trainingClass } -> { board, createdAt }
//   POST import-scores       (admin)       { runs: [{ school, mode, elapsedTime, createdAt, playerName, ... }] } -> { imported, skipped, refused }
//   POST rebuild-index      (admin)       { what?: 'items'|'syllabi'|'jetlogs'|'briefs'|'all', remirror?: bool } -> { items, syllabi, jetlogs, briefs }
//   POST tag-program         (admin)       { aircraft, school, limit?, overwrite?, dryRun? } -> { items, syllabi, remaining }

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
  if (what === 'jetlogs' || what === 'all') {
    if (body.remirror) await remirrorJetLogs();
    out.jetlogs = await rebuildJetLogsIndex();
  }
  if (what === 'briefs' || what === 'all') {
    if (body.remirror) await remirrorBriefs();
    out.briefs = await rebuildBriefsIndex();
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
  'set-author': { method: 'POST', admin: true, run: setAuthorHandler },
  'namespace-items': { method: 'POST', admin: true, run: namespaceItemsHandler },
  'hide-syllabus': { method: 'POST', admin: true, run: hideSyllabusHandler },
  'rename-syllabus': { method: 'POST', admin: true, run: renameSyllabusHandler },
  'get-jetlog': { method: 'GET', run: getJetLogHandler },
  'jetlog-history': { method: 'GET', run: jetLogHistoryHandler },
  'jetlog-revision': { method: 'GET', run: jetLogRevisionHandler },
  'publish-jetlog': { method: 'POST', run: publishJetLogHandler },
  'save-jetlog': { method: 'POST', run: saveJetLogHandler },
  'restore-jetlog': { method: 'POST', run: restoreJetLogHandler },
  'import-jetlogs': { method: 'POST', admin: true, run: importJetLogsHandler },
  'hide-jetlog': { method: 'POST', admin: true, run: hideJetLogHandler },
  'get-brief': { method: 'GET', run: getBriefHandler },
  'brief-history': { method: 'GET', run: briefHistoryHandler },
  'brief-revision': { method: 'GET', run: briefRevisionHandler },
  'publish-brief': { method: 'POST', run: publishBriefHandler },
  'save-brief': { method: 'POST', run: saveBriefHandler },
  'restore-brief': { method: 'POST', run: restoreBriefHandler },
  'hide-brief': { method: 'POST', admin: true, run: hideBriefHandler },
  'leaderboard': { method: 'GET', run: leaderboardHandler },
  'submit-score': { method: 'POST', run: submitScoreHandler },
  'import-scores': { method: 'POST', admin: true, run: importScoresHandler },
  'rebuild-index': { method: 'POST', admin: true, run: rebuildIndexHandler },
  'tag-program': { method: 'POST', admin: true, run: tagProgramHandler },
};

function opOf(event) {
  const proxy = event.pathParameters && event.pathParameters.proxy;
  const path = proxy || event.path || '';
  return path.split('/').filter(Boolean).pop() || '';
}

export const handler = async (event) => {
  const method = event.httpMethod || '';
  const op = opOf(event);
  const out = await dispatch(event, method, op);
  // One line per request in CloudWatch: what came in and what went out.
  console.log(`${method || '?'} ${op || event.path || '?'} -> ${out.statusCode}`);
  return out;
};

async function dispatch(event, method, op) {
  if (method === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

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
}
