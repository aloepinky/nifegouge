#!/usr/bin/env node
//
// End-to-end checks of the course rules ops in lambda/discussApi (courseRules.mjs), run in
// process against the fakes in tools/lib/fakeAws.mjs: no server, no AWS account.
//
//   node tools/courserules-api-test.mjs
//
// Exits non-zero if any check fails. Seeds from the document tools/courserules-seed.js builds,
// so the real document is what is checked for shape.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAMBDA = path.join(ROOT, 'lambda', 'discussApi');

process.env.DISCUSS_ADMIN_TOKEN = 'test-token';

const load = (file) => import(pathToFileURL(file));
const { FakeDynamo, FakeS3 } = await load(path.join(ROOT, 'tools', 'lib', 'fakeAws.mjs'));
const { setClients } = await load(path.join(LAMBDA, 'clients.mjs'));
const { handler } = await load(path.join(LAMBDA, 'index.mjs'));

const mirrorDir = fs.mkdtempSync(path.join(os.tmpdir(), 'courserules-test-'));
const seedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'courserules-seed-'));
setClients({ dynamo: new FakeDynamo(null), s3: new FakeS3(mirrorDir) });

execFileSync(process.execPath, [path.join(ROOT, 'tools', 'courserules-seed.js'), `--out=${seedDir}`], { stdio: 'ignore' });
const seed = JSON.parse(fs.readFileSync(path.join(seedDir, 'tw4.json'), 'utf8'));

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

const op = quiet(async (name, { body, method = 'POST', headers = {}, query } = {}) => {
  const out = await handler({
    httpMethod: method,
    path: `/discuss/${name}`,
    pathParameters: { proxy: name },
    queryStringParameters: query || null,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? null : JSON.stringify(body),
  });
  return { status: out.statusCode, ...JSON.parse(out.body || '{}') };
});

const admin = { 'X-Admin-Token': 'test-token' };
const mirror = () => JSON.parse(fs.readFileSync(path.join(mirrorDir, 'courserules', 'tw4.json'), 'utf8'));
const copy = (o) => JSON.parse(JSON.stringify(o));
const LEG = 'Routes-Arrivals-5';

// The document is keyed by the map's feature ids; a key the map no longer has is text nobody sees.
const { loadSrc } = createRequire(import.meta.url)('./lib/loadSrc.js');
const { crFeatures } = loadSrc(path.join(ROOT, 'src', 'components', 'CourseRulesFeatures.js'));
const orphans = [...Object.keys(seed.legs), ...Object.keys(seed.airfields)].filter((id) => !crFeatures[id]);
ok(!orphans.length, `every leg and card names a feature on the map (${orphans.join(', ') || 'none missing'})`);

// Import
let r = await op('import-courserules', { body: { id: 'tw4', doc: seed } });
ok(r.status === 401, `import needs the admin token (${r.status})`);
r = await op('import-courserules', { body: { id: 'tw4', doc: seed, author: 'Loevinger' }, headers: admin });
ok(r.status === 200 && r.rev === 1, `the seed imports as revision 1 (${r.status} ${r.error || ''})`);
ok(JSON.stringify(mirror().doc) === JSON.stringify(seed), 'the mirror holds the seed exactly');
ok(mirror().author === 'Loevinger', 'the import carries the author');
r = await op('import-courserules', { body: { id: 'tw4', doc: seed }, headers: admin });
ok(r.status === 409, `a second import is refused (${r.status})`);

// Save
const edited = copy(seed);
edited.legs[LEG].rule[0].text = 'Proceed at [[1500\']] MSL.';
r = await op('save-courserules', { body: { id: 'tw4', baseRev: 1, doc: edited } });
ok(r.status === 400 && /summary/.test(r.error), `a save needs a summary (${r.status})`);
r = await op('save-courserules', { body: { id: 'tw4', baseRev: 1, doc: edited, summary: 'New altitude', author: 'A Student' } });
ok(r.status === 200 && r.rev === 2, `a save is revision 2 (${r.status} ${r.error || ''})`);
ok(mirror().doc.legs[LEG].rule[0].text === 'Proceed at [[1500\']] MSL.' && mirror().summary === 'New altitude', 'the mirror shows the save');
r = await op('save-courserules', { body: { id: 'tw4', baseRev: 1, doc: seed, summary: 'Stale' } });
ok(r.status === 409 && r.rev === 2, `a stale save gets a 409 naming the newest (${r.status} ${r.rev})`);

// Shape
const bad = async (mutate, why) => {
  const doc = copy(edited);
  mutate(doc);
  const out = await op('save-courserules', { body: { id: 'tw4', baseRev: 2, doc, summary: 'x' } });
  ok(out.status === 400, `${why} is refused (${out.status} ${out.error || ''})`);
};
await bad((d) => { d.legs[LEG].rule[0].text = 'At [[1500 MSL.'; }, 'an unclosed blank');
await bad((d) => { d.legs[LEG].rule[0].text = 'At [[ ]] MSL.'; }, 'an empty blank');
await bad((d) => { d.legs[LEG].rule[0].text = 'At <b>1500</b> MSL.'; }, 'HTML in a rule');
await bad((d) => { d.legs['not a feature'] = { rule: [{ text: 'x' }] }; }, 'a key that is no map feature');
await bad((d) => { d.legs[LEG].comms = [{ radio: 'CH 8 UHF' }]; }, 'a radio call with no words');
await bad((d) => { delete d.school; }, 'a document with no school');
await bad((d) => { d.airfields['Point-default-0'].blocks[0].lines = ['']; }, 'an empty card line');

// History and restore
r = await op('courserules-history', { method: 'GET', query: { id: 'tw4' } });
ok(r.status === 200 && r.latestRev === 2 && r.revisions.map((x) => x.rev).join() === '2,1', `history lists both revisions (${r.revisions && r.revisions.map((x) => x.rev)})`);
ok(r.revisions[0].author === 'A Student' && r.revisions[0].summary === 'New altitude', 'history carries author and summary');
r = await op('courserules-revision', { method: 'GET', query: { id: 'tw4', rev: '1' } });
ok(r.status === 200 && JSON.stringify(r.revision.doc) === JSON.stringify(seed), 'revision 1 reads back as the seed');
r = await op('restore-courserules', { body: { id: 'tw4', rev: 2 } });
ok(r.status === 400, `restoring the current revision is refused (${r.status})`);
r = await op('restore-courserules', { body: { id: 'tw4', rev: 1, author: 'A Student' } });
ok(r.status === 200 && r.rev === 3, `restore publishes revision 3 (${r.status})`);
ok(JSON.stringify(mirror().doc) === JSON.stringify(seed) && mirror().summary === 'Restored revision 1', 'the mirror is the seed again');
r = await op('get-courserules', { method: 'GET', query: { id: 'tw4' } });
ok(r.status === 200 && r.rev === 3, `get-courserules reads the newest (${r.rev})`);

// Rebuild
fs.rmSync(path.join(mirrorDir, 'courserules'), { recursive: true, force: true });
r = await op('rebuild-index', { body: { what: 'courserules' }, headers: admin });
ok(r.courserules && r.courserules.tw4 === 3 && mirror().rev === 3, 'rebuild-index puts the mirror back');

fs.rmSync(mirrorDir, { recursive: true, force: true });
fs.rmSync(seedDir, { recursive: true, force: true });
console.log(failures ? `${failures} FAILED` : 'ALL PASS');
process.exit(failures ? 1 : 0);
