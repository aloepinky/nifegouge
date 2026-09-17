#!/usr/bin/env node
//
// Loads the jet log corpus into the server. The seed is tools/jetlog-seed.json, which is the
// hand-maintained public/presets.json as it stood when the corpus moved to the server: the
// record of what was imported, and nothing the site reads. Talks only to the admin endpoints
// of lambda/discussApi, so the server's one write path also fills the S3 mirror.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/jetlog-migrate.js --dry-run
//   DISCUSS_ADMIN_TOKEN=... node tools/jetlog-migrate.js --verify
//
//   --api=<url>       the API base (default: the production API Gateway stage)
//   --mirror=<url>    where to verify against (default: the production bucket)
//   --seed=<file>     the source (default: tools/jetlog-seed.json)
//   --out=<dir>       write the mirror layout to a folder instead of posting
//   --overwrite       append a revision to jet logs that already exist
//   --verify          after the import, read everything back from the mirror and compare
//   --batch=<n>       logs per import request (default 20, max 50)
//   --dry-run         build everything, post nothing
//
// Against the local dev server:
//   node tools/discuss-dev-server.js --reset
//   DISCUSS_ADMIN_TOKEN=dev node tools/jetlog-migrate.js --api=http://localhost:8787/discuss \
//     --mirror=http://localhost:8787/mirror --verify
//
// --verify compares the mirrored document against the seed record byte for byte, which holds
// only because `import-jetlogs` stores what arrives unchanged. Normalising a field on the
// import path would mean applying the same rule a second time here, which is the reason the
// server does its cleaning on the browser's publish path alone.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// The flat folder each seed record carries, to the group and folder it becomes. A syllabus
// owns its own sims, so the group names the syllabus and the folder drops the prefix that
// said so; everything not tied to a syllabus event is gouge.
//
// Throwing on an unrecognised folder is deliberate: a hand-edit to the seed that invents one
// should stop the migration rather than file a record somewhere nobody looks.
const REMAP = {
  'Delta VNAV': ['Delta Syllabus Sims', 'VNAV'],
  'Delta I3100': ['Delta Syllabus Sims', 'I3100'],
  'Delta I3200': ['Delta Syllabus Sims', 'I3200'],
  'Delta I6100': ['Delta Syllabus Sims', 'I6100'],
  'Delta I6200': ['Delta Syllabus Sims', 'I6200'],
  'Delta I6300': ['Delta Syllabus Sims', 'I6300'],
  'Local Flights': ['Flight Gouge', 'Local Flights'],
  'Capstone Flights': ['Flight Gouge', 'Capstone Flights'],
};

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const OPT = {
  api: value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss',
  mirror: value('mirror') || process.env.DISCUSS_MIRROR_URL || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com',
  seed: value('seed') || path.join(ROOT, 'tools', 'jetlog-seed.json'),
  out: value('out'),
  overwrite: flag('overwrite'),
  verify: flag('verify'),
  batch: Math.min(50, Math.max(1, Number(value('batch') || 20))),
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// One seed record to one jet log document. `id` and `name` are kept as they are — the ids are
// human-meaningful (delta-n6101, nubin-13r-loop) and already slugs, so they are not reminted.
// Absent optional fields stay absent: presence is ragged across the corpus and inventing a
// `holdCells: {}` would be a difference between what the file said and what the site holds.
function toJetLog(record) {
  const filing = REMAP[record.folder];
  if (!filing) {
    throw new Error(`${record.id}: no group for folder "${record.folder}" — add it to REMAP`);
  }
  if (!ID_RE.test(record.id || '')) throw new Error(`${record.id}: not a slug`);
  if (record.mode !== 'VFR' && record.mode !== 'IFR') {
    throw new Error(`${record.id}: mode is "${record.mode}"`);
  }
  const { folder, ...rest } = record;
  return { ...rest, group: filing[0], folder: filing[1] };
}

async function post(op, body) {
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const res = await fetch(`${OPT.api}/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': OPT.token },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // A non-JSON body; the status is all there is to report.
  }
  if (!res.ok || data.success === false) {
    throw new Error(`${op}: ${data.error || `HTTP ${res.status}`}`);
  }
  return data;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

function writeMirror(dir, logs) {
  const jetlogs = path.join(dir, 'jetlogs');
  fs.mkdirSync(jetlogs, { recursive: true });
  for (const log of logs) {
    fs.writeFileSync(path.join(jetlogs, `${log.id}.json`), JSON.stringify({
      id: log.id,
      rev: 1,
      updatedAt: new Date().toISOString(),
      author: 'migration',
      summary: 'Imported',
      log,
    }, null, 2));
  }
  fs.writeFileSync(path.join(jetlogs, 'index.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    logs: logs.map((l) => ({
      id: l.id, name: l.name, group: l.group, folder: l.folder, mode: l.mode, rev: 1,
    })),
  }, null, 2));
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(OPT.seed, 'utf8'));
  if (!Array.isArray(seed)) throw new Error(`${OPT.seed} is not an array`);
  const logs = seed.map(toJetLog);

  const ids = new Set();
  for (const log of logs) {
    if (ids.has(log.id)) throw new Error(`duplicate id ${log.id}`);
    ids.add(log.id);
  }

  const byGroup = {};
  for (const log of logs) {
    byGroup[log.group] = byGroup[log.group] || {};
    byGroup[log.group][log.folder] = (byGroup[log.group][log.folder] || 0) + 1;
  }
  console.log(`${logs.length} jet logs from ${path.relative(ROOT, OPT.seed)}`);
  for (const group of Object.keys(byGroup)) {
    const folders = Object.entries(byGroup[group]).map(([f, n]) => `${f} (${n})`).join(', ');
    console.log(`  ${group}: ${folders}`);
  }

  if (OPT.out) {
    writeMirror(OPT.out, logs);
    console.log(`wrote the mirror layout to ${OPT.out}`);
    return;
  }

  if (OPT.dryRun) {
    console.log(`dry run: would post ${logs.length} jet logs to ${OPT.api}`);
    return;
  }

  let imported = 0;
  let skipped = 0;
  for (let i = 0; i < logs.length; i += OPT.batch) {
    const batch = logs.slice(i, i + OPT.batch);
    const out = await post('import-jetlogs', { logs: batch, overwrite: OPT.overwrite });
    imported += out.imported.length;
    skipped += out.skipped.length;
    process.stdout.write(`\r  imported ${imported}, skipped ${skipped}`);
  }
  process.stdout.write('\n');
  if (skipped) console.log(`  ${skipped} already existed; --overwrite appends a revision`);

  const rebuilt = await post('rebuild-index', { what: 'jetlogs' });
  console.log(`index rebuilt: ${rebuilt.jetlogs} jet logs`);

  if (!OPT.verify) return;

  const problems = [];
  const index = await fetchJson(`${OPT.mirror}/jetlogs/index.json`);
  if (!index) {
    problems.push('jetlogs/index.json is missing');
  } else if (index.logs.length !== logs.length) {
    problems.push(`index lists ${index.logs.length} jet logs, expected ${logs.length}`);
  }
  for (const log of logs) {
    const record = await fetchJson(`${OPT.mirror}/jetlogs/${log.id}.json`);
    if (!record) {
      problems.push(`jetlogs/${log.id}.json is missing`);
      continue;
    }
    if (!same(record.log, log)) problems.push(`jetlogs/${log.id}.json differs from the seed`);
  }
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`  ${p}`));
    process.exit(1);
  }
  console.log(`verified ${logs.length} jet logs against ${OPT.mirror}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
