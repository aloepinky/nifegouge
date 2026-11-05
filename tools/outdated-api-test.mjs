#!/usr/bin/env node
//
// End-to-end checks of the outdated marks in lambda/discussApi (outdated.mjs, and the parts of
// save-item that clear them and keep "Last updated"), run in process against the fakes in
// tools/lib/fakeAws.mjs: no server, no AWS account.
//
//   node tools/outdated-api-test.mjs
//
// Exits non-zero if any check fails.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAMBDA = path.join(ROOT, 'lambda', 'discussApi');

process.env.DISCUSS_ADMIN_TOKEN = 'test-token';

const load = (file) => import(pathToFileURL(file));
const { FakeDynamo, FakeS3 } = await load(path.join(ROOT, 'tools', 'lib', 'fakeAws.mjs'));
const { setClients } = await load(path.join(LAMBDA, 'clients.mjs'));
const { handler } = await load(path.join(LAMBDA, 'index.mjs'));

const mirrorDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outdated-test-'));
setClients({ dynamo: new FakeDynamo(null), s3: new FakeS3(mirrorDir) });

let failures = 0;
function ok(condition, message) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${message}`);
  if (!condition) failures += 1;
}

const quiet = (fn) => async (...args) => {
  const log = console.log;
  console.log = () => {};
  try { return await fn(...args); } finally { console.log = log; }
};

const op = quiet(async (name, { body, method = 'POST', headers = {} } = {}) => {
  const out = await handler({
    httpMethod: method,
    path: `/discuss/${name}`,
    pathParameters: { proxy: name },
    queryStringParameters: null,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? null : JSON.stringify(body),
  });
  return { status: out.statusCode, ...JSON.parse(out.body || '{}') };
});

const admin = { 'X-Admin-Token': 'test-token' };
const read = (key) => JSON.parse(fs.readFileSync(path.join(mirrorDir, key), 'utf8'));
const pause = () => new Promise((r) => setTimeout(r, 5));

const school = 'Primary';
const page = {
  slug: 'flap-limits',
  title: 'Flap limits',
  aircraft: 'T-6B',
  school,
  lede: 'The flap limits.',
  numbers: [{ id: 'nb-01', label: 'Flaps TO', value: '150 knots', refs: [1] }],
  sections: [
    {
      id: 'lim-01',
      title: 'Limits',
      paras: [{ id: 'p-01', text: 'Flaps.', refs: [1] }],
      subsections: [{ id: 'lim-02', title: 'Landing', paras: [{ id: 'p-02', text: 'Landing.', refs: [1] }] }],
    },
  ],
  references: [{ n: 1, work: 'NATOPS', loc: 'Ch. 4 — Operating Limitations', pages: 'p. 4-1' }],
};

// A second page citing NATOPS Ch. 4, so a report on it is not settled by clearing the first.
const other = {
  slug: 'flap-checks',
  title: 'Flap checks',
  aircraft: 'T-6B',
  school,
  lede: 'The flap checks.',
  sections: [{ id: 'chk-01', title: 'Checks', paras: [{ id: 'c-01', text: 'Check the flaps.', refs: [1] }] }],
  references: [{ n: 1, work: 'NATOPS', loc: 'Ch. 4 — Operating Limitations', pages: 'p. 4-2' }],
};

const imported = await op('import-items', { body: { items: [page, other] }, headers: admin });
ok(imported.status === 200, 'the page imports');

const A = 'browser-aaaa-1111';
const B = 'browser-bbbb-2222';
const mark = (body) => op('mark-outdated', { body: { school, slug: page.slug, ...body } });

let r = await mark({ target: 'lim-01', voter: A, note: 'New limit in IC 4' });
ok(r.status === 200 && r.outdated.pages['primary/flap-limits'].marks['lim-01'].n === 1, 'a section is marked');
ok(r.outdated.pages['primary/flap-limits'].marks['lim-01'].notes[0] === 'New limit in IC 4', 'the note is kept');
r = await mark({ target: 'lim-01', voter: A });
ok(r.outdated.pages['primary/flap-limits'].marks['lim-01'].n === 1, 'the same browser counts once');
r = await mark({ target: 'lim-01', voter: B });
ok(r.outdated.pages['primary/flap-limits'].marks['lim-01'].n === 2, 'a second browser adds a mark');
r = await mark({ target: 'lim-01', voter: B, on: false });
ok(r.outdated.pages['primary/flap-limits'].marks['lim-01'].n === 1, 'a mark is taken back');
r = await mark({ target: 'lim-02', voter: A });
ok(r.status === 200, 'a subsection can be marked');
r = await mark({ target: 'numbers', voter: A });
ok(r.status === 200, 'the Numbers box can be marked');
r = await mark({ target: 'references', voter: A });
ok(r.status === 404, 'the references cannot be marked');
r = await mark({ target: 'lim-01', voter: 'x' });
ok(r.status === 400, 'a mark needs a browser id');
r = await op('mark-outdated', { body: { school, slug: 'no-such-page', target: 'lim-01', voter: A } });
ok(r.status === 404, 'a mark needs a page');

const report = (body) => op('report-outdated-pub', { body: { school, work: 'NATOPS', ...body } });
r = await report({ scope: 'chapter', part: 'Ch. 4', voter: A, note: 'IC 4' });
ok(r.status === 200 && r.outdated.pubs.length === 1 && r.outdated.pubs[0].n === 1, 'a chapter is reported');
r = await report({ scope: 'chapter', part: 'chapter 4', voter: B });
ok(r.outdated.pubs.length === 1 && r.outdated.pubs[0].n === 2, 'the same chapter, typed differently, counts with it');
r = await report({ scope: 'chapter', part: '4', voter: B });
ok(r.already === true && r.outdated.pubs[0].n === 2, 'the same browser reports once');
r = await report({ scope: 'section', voter: A });
ok(r.status === 400, 'a section report names the section');
r = await report({ scope: 'pub', voter: A });
ok(r.status === 200 && r.outdated.pubs.length === 2, 'the whole publication can be reported');

// Last updated: a gouge-only revision keeps it; a content revision moves it.
let rec = read('items/primary/flap-limits.json');
const first = rec.contentUpdatedAt;
ok(first === rec.updatedAt, 'a page starts with Last updated at its revision');
await pause();
r = await op('save-item', {
  body: {
    slug: page.slug, school, baseRev: 1, summary: 'Added gouge', item: { ...page, gouge: [{ id: 'gg-01', text: 'Asked on FAM-2' }] },
  },
});
rec = read('items/primary/flap-limits.json');
ok(r.status === 200 && rec.rev === 2 && rec.contentUpdatedAt === first && rec.updatedAt !== first, 'a gouge-only revision leaves Last updated');

await pause();
const edited = { ...page, gouge: [{ id: 'gg-01', text: 'Asked on FAM-2' }], lede: 'The flap limits, current.' };
r = await op('save-item', {
  body: { slug: page.slug, school, baseRev: 2, summary: 'Updated the limit', item: edited, clearOutdated: ['lim-01'] },
});
rec = read('items/primary/flap-limits.json');
ok(r.status === 200 && rec.contentUpdatedAt !== first && rec.contentUpdatedAt === rec.updatedAt, 'a content revision moves Last updated');
const idx = read('outdated/index.json');
const marks = idx.pages['primary/flap-limits'];
ok(!marks.marks['lim-01'] && marks.marks['lim-02'] && marks.cleared['lim-01'], 'publishing clears the sections it names, and only those');

r = await mark({ target: 'lim-01', voter: A });
ok(r.outdated.pages['primary/flap-limits'].marks['lim-01'].n === 1, 'a browser can mark a cleared section again');

r = await op('save-item', {
  body: { slug: page.slug, school, baseRev: 3, summary: 'Rewrote it', item: edited, clearOutdated: ['*'] },
});
ok(Object.keys(r.outdated.pages['primary/flap-limits'].marks).length === 0 && r.outdated.pages['primary/flap-limits'].cleared['*'], "'*' clears the whole page");

const pubId = r.outdated.pubs.find((p) => p.scope === 'pub').id;
r = await op('hide-outdated-pub', { body: { id: pubId } });
ok(r.status === 401, 'taking a report down needs the admin token');
r = await op('hide-outdated-pub', { body: { id: pubId }, headers: admin });
ok(r.status === 200 && r.outdated.pubs.length === 1, 'an admin takes a report down');

r = await op('rebuild-index', { body: { what: 'outdated' }, headers: admin });
ok(r.status === 200 && r.outdated.pubs === 1, 'rebuild-index rebuilds the outdated mirror');

// Settling a publication report from a page that cites it takes it off every page.
const chapterId = read('outdated/index.json').pubs[0].id;
r = await op('save-item', {
  body: {
    slug: page.slug, school, baseRev: 4, summary: 'Cites the AIM now', resolvePubs: [chapterId],
    item: { ...edited, references: [{ n: 1, work: 'AIM', loc: '§1-1-9 — ILS', pages: 'p. 1-1-10' }] },
  },
});
ok(r.status === 200 && read('outdated/index.json').pubs.length === 1, 'a page that does not cite the publication cannot settle its report');
await mark({ target: 'lim-02', voter: B });
r = await op('save-item', {
  body: { slug: page.slug, school, baseRev: 5, summary: 'Caught up with IC 4', item: edited, clearOutdated: ['lim-02'], resolvePubs: [chapterId, 'nonsense'] },
});
ok(r.status === 200 && r.outdated.pubs.length === 0, 'a page that cites it settles the report everywhere');
ok(!r.outdated.pages['primary/flap-limits'].marks['lim-02'] && r.outdated.pages['primary/flap-limits'].cleared['lim-02'],
  'the sections ticked in the same publish are still cleared');
r = await report({ scope: 'chapter', part: 'Ch. 4', voter: A });
ok(r.already === false && r.outdated.pubs.length === 1 && r.outdated.pubs[0].n === 1, 'a settled report, made again, counts from one');

// Nobody ticks it: it settles itself once every part it tints, on every page, is up to date.
r = await op('save-item', {
  body: { slug: page.slug, school, baseRev: 6, summary: 'All current', item: edited, clearOutdated: ['*'] },
});
ok(r.status === 200 && read('outdated/index.json').pubs.length === 1, 'clearing one page leaves a report another page still shows');
r = await op('save-item', {
  body: { slug: other.slug, school, baseRev: 1, summary: 'Checks current', item: { ...other, lede: 'The flap checks, current.' }, clearOutdated: ['chk-01'] },
});
ok(r.status === 200 && r.outdated && r.outdated.pubs.length === 0, 'clearing the last part it tints settles the report everywhere');

// A vote after the clearing tints again, and the parts are worked out afresh.
r = await report({ scope: 'chapter', part: 'Ch. 4', voter: B });
ok(r.outdated.pubs.length === 1, 'reported again after settling, it shows again');
r = await op('save-item', {
  body: { slug: page.slug, school, baseRev: 7, summary: 'Checked again', item: edited, clearOutdated: ['*'] },
});
ok(read('outdated/index.json').pubs.length === 1, 'the earlier clearing of the other page no longer counts');

// The server's matching is the browser's: the same answers for the same references.
const { loadSrc } = await import(pathToFileURL(path.join(ROOT, 'tools', 'lib', 'loadSrc.js')));
const client = loadSrc(path.join(ROOT, 'src', 'components', 'discuss', 'outdated.js'));
const server = await load(path.join(LAMBDA, 'pubMatch.mjs'));
const refs = [
  { work: 'NATOPS', loc: 'Ch. 4 — Operating Limitations', pages: 'p. 4-1' },
  { work: 'NATOPS', loc: '§12.2.3 — CAS Caution Messages' },
  { work: 'AIM', loc: '§1-1-9 — ILS' },
  { work: 'FAM FTI', loc: '§606 — Approach', pages: 'p. 6-6' },
  { work: 'VNAV FTI', loc: 'Appendix A — Glossary' },
  { work: 'CNAF 3710', loc: 'Encl. (2) — Weather', pages: 'p. 2-1' },
  { work: 'TW-4 SOP', loc: 'Course Rules', pages: 'p. 7-3' },
];
const reports = [
  { work: 'NATOPS', scope: 'chapter', part: 'Ch. 4' }, { work: 'NATOPS', scope: 'chapter', part: '12' },
  { work: 'NATOPS', scope: 'section', part: '§12.2' }, { work: 'aim', scope: 'section', part: '1-1' },
  { work: 'FAM FTI', scope: 'pub', part: '' }, { work: 'FAM FTI', scope: 'chapter', part: '6' },
  { work: 'FAM FTI', scope: 'section', part: 'Approach' }, { work: 'VNAV FTI', scope: 'chapter', part: 'Appendix A' },
  { work: 'CNAF 3710', scope: 'chapter', part: 'encl 2' }, { work: 'TW-4 SOP', scope: 'chapter', part: '7' },
];
const disagree = [];
for (const ref of refs) for (const rep of reports) {
  if (client.refMatches(ref, rep) !== server.refMatches(ref, rep)) disagree.push(`${ref.work} ${ref.loc} / ${rep.work} ${rep.scope} ${rep.part}`);
}
ok(disagree.length === 0, `the server matches references as the browser does${disagree.length ? `: ${disagree.join('; ')}` : ''}`);

if (failures) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nall passed');
