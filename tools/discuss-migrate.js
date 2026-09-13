#!/usr/bin/env node
//
// Loads the discuss corpus into the server: the item files as DiscussItems revisions and the
// Delta registries as the `delta-primary` syllabus document. Talks only to the admin endpoints
// of lambda/discussApi, so the server's one write path also fills the S3 mirror. No AWS
// credentials are needed on this machine, only the admin token.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-migrate.js --dry-run
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-migrate.js --verify --fixtures
//
//   --api=<url>          the API base (default: the production API Gateway stage)
//   --mirror=<url>       where to verify against (default: the production bucket)
//   --items=<dir>        the item files (default: _reference-docs/discuss-items-archive/items,
//                        where they were moved once the server became the source)
//   --registries=<dir>   EVENTS.js, SYLLABUS.js, FLOW.js (default: src/components/discuss,
//                        falling back to the jppt/__fixtures__/delta copies)
//   --out=<dir>          write the mirror layout to a folder instead of posting
//   --overwrite          append a revision to items and a syllabus that already exist
//   --verify             after the import, read everything back from the mirror and compare
//   --fixtures           write jppt/__fixtures__/delta/ITEM_INDEX.json for the parser test
//   --batch=<n>          items per import request (default 20, max 50)
//   --dry-run            build everything, post nothing
//
// Against the local dev server:
//   node tools/discuss-dev-server.js --reset
//   DISCUSS_ADMIN_TOKEN=dev node tools/discuss-migrate.js --api=http://localhost:8787/discuss \
//     --mirror=http://localhost:8787/mirror --verify

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DISCUSS = path.join(ROOT, 'src', 'components', 'discuss');
const FIXTURES = path.join(DISCUSS, 'jppt', '__fixtures__', 'delta');
const DELTA_ID = 'delta-primary';
const DELTA_NAME = 'Delta Primary';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const OPT = {
  api: value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss',
  mirror: value('mirror') || process.env.DISCUSS_MIRROR_URL || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com',
  items: value('items') || [path.join(ROOT, '_reference-docs', 'discuss-items-archive', 'items'), path.join(DISCUSS, 'items')].find((d) => fs.existsSync(d)) || path.join(DISCUSS, 'items'),
  registries: value('registries'),
  out: value('out'),
  overwrite: flag('overwrite'),
  verify: flag('verify'),
  fixtures: flag('fixtures'),
  batch: Math.min(50, Math.max(1, Number(value('batch') || 20))),
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

// ---------------------------------------------------------------------------------------
// Reading the source files (the same strip-export-and-eval the other tools use)

function evalModule(file, returnExpr) {
  const src = fs.readFileSync(file, 'utf8');
  const body = src
    .replace(/^export default .*$/gm, '')
    .replace(/^export /gm, '');
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`${body}\nreturn (${returnExpr});`)();
  } catch (err) {
    throw new Error(`could not evaluate ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

function registriesDir() {
  if (OPT.registries) return path.resolve(OPT.registries);
  if (fs.existsSync(path.join(DISCUSS, 'EVENTS.js'))) return DISCUSS;
  return FIXTURES;
}

function readItems() {
  const dir = path.resolve(OPT.items);
  if (!fs.existsSync(dir)) throw new Error(`no item files at ${dir}`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  return files.map((f) => {
    const data = evalModule(path.join(dir, f), 'ITEM');
    if (data.slug !== path.basename(f, '.js')) {
      throw new Error(`${f} declares slug '${data.slug}'`);
    }
    return data;
  });
}

function buildDeltaDoc(dir) {
  const { STAGES, BLOCKS, hasDiscussItems } = evalModule(
    path.join(dir, 'SYLLABUS.js'),
    '{ STAGES, BLOCKS, hasDiscussItems }',
  );
  const events = evalModule(path.join(dir, 'EVENTS.js'), 'ALL');
  const flow = evalModule(path.join(dir, 'FLOW.js'), '{ VIEWBOX, NODES, LEGEND, EDGES }');
  return {
    version: 1,
    source: {
      instruction: 'CNATRAINST 1542.166D',
      date: '15 Jul 2024',
      flowPage: 'I-3',
      citation: 'CNATRAINST 1542.166D (15 Jul 2024), p. I-3',
    },
    stages: STAGES,
    // The doc carries `briefed` per block where the registry kept a NO_DISCUSS_ITEMS set.
    blocks: BLOCKS.map((b) => ({ ...b, briefed: hasDiscussItems(b) })),
    events,
    flow,
  };
}

// The index entry the server derives for an item; also the parser test's fixture shape.
function indexEntry(item) {
  const out = { slug: item.slug, title: item.title };
  if (item.maneuver) out.maneuver = true;
  if (item.stub) out.stub = true;
  if (item.generated) out.generated = item.generated;
  return out;
}

// ---------------------------------------------------------------------------------------
// Talking to the server

async function post(op, body) {
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const res = await fetch(`${OPT.api}/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': OPT.token },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON body */ }
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

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------------------

async function main() {
  const items = readItems();
  const regDir = registriesDir();
  const doc = buildDeltaDoc(regDir);
  const docBytes = Buffer.byteLength(JSON.stringify(doc), 'utf8');
  const itemBytes = items.reduce((n, i) => n + Buffer.byteLength(JSON.stringify(i), 'utf8'), 0);
  const largest = items.reduce((m, i) => Math.max(m, Buffer.byteLength(JSON.stringify(i), 'utf8')), 0);

  console.log(`${items.length} items from ${path.relative(ROOT, path.resolve(OPT.items))} (${itemBytes} bytes, largest ${largest})`);
  console.log(`Delta doc from ${path.relative(ROOT, regDir)}: ${doc.stages.length} stages, ${doc.blocks.length} blocks, ${doc.events.length} events, ${docBytes} bytes`);
  if (docBytes > 350 * 1024) throw new Error('the Delta document is over the 350 KB server limit');

  if (OPT.fixtures) {
    fs.mkdirSync(FIXTURES, { recursive: true });
    const file = path.join(FIXTURES, 'ITEM_INDEX.json');
    fs.writeFileSync(file, `${JSON.stringify(items.map(indexEntry), null, 1)}\n`);
    console.log(`wrote ${path.relative(ROOT, file)}`);
  }

  if (OPT.out) {
    const out = path.resolve(OPT.out);
    fs.mkdirSync(path.join(out, 'items'), { recursive: true });
    fs.mkdirSync(path.join(out, 'syllabi'), { recursive: true });
    const now = new Date().toISOString();
    for (const item of items) {
      fs.writeFileSync(path.join(out, 'items', `${item.slug}.json`), JSON.stringify({
        slug: item.slug, rev: 1, updatedAt: now, author: 'migration', summary: 'Imported', item,
      }));
    }
    fs.writeFileSync(path.join(out, 'items', 'index.json'), JSON.stringify({
      generatedAt: now,
      items: items.map((i) => ({ ...indexEntry(i), rev: 1, updatedAt: now })),
    }));
    fs.writeFileSync(path.join(out, 'syllabi', `${DELTA_ID}.json`), JSON.stringify({
      id: DELTA_ID, name: DELTA_NAME, rev: 1, updatedAt: now, doc,
    }));
    fs.writeFileSync(path.join(out, 'syllabi', 'index.json'), JSON.stringify({
      generatedAt: now, syllabi: [{ id: DELTA_ID, name: DELTA_NAME, rev: 1, updatedAt: now }],
    }));
    console.log(`wrote the mirror layout to ${path.relative(ROOT, out) || '.'}`);
    return;
  }

  if (OPT.dryRun) {
    console.log(`[dry run] would POST ${Math.ceil(items.length / OPT.batch)} import-items batches and import-syllabus to ${OPT.api}`);
    return;
  }

  let imported = 0;
  let skipped = 0;
  for (let i = 0; i < items.length; i += OPT.batch) {
    const batch = items.slice(i, i + OPT.batch);
    const result = await post('import-items', { items: batch, overwrite: OPT.overwrite });
    imported += result.imported.length;
    skipped += result.skipped.length;
    process.stdout.write(`\r  items ${Math.min(i + OPT.batch, items.length)}/${items.length}`);
  }
  console.log(`\n  imported ${imported}, skipped ${skipped}${skipped ? ' (pass --overwrite to add revisions)' : ''}`);

  try {
    const result = await post('import-syllabus', { id: DELTA_ID, name: DELTA_NAME, doc, replace: OPT.overwrite });
    console.log(`  syllabus ${DELTA_ID} rev ${result.rev}`);
  } catch (err) {
    if (!/exists/.test(err.message)) throw err;
    console.log(`  syllabus ${DELTA_ID} exists; not touched (pass --overwrite to add a revision)`);
  }

  const rebuilt = await post('rebuild-index', { what: 'all' });
  console.log(`  index: ${rebuilt.items} items, ${rebuilt.syllabi} syllabi`);

  if (OPT.verify) {
    console.log(`verifying against ${OPT.mirror}`);
    const index = await fetchJson(`${OPT.mirror}/items/index.json`);
    const problems = [];
    const listed = new Set((index ? index.items : []).map((e) => e.slug));
    for (const item of items) {
      if (!listed.has(item.slug)) problems.push(`${item.slug}: not in index`);
      const record = await fetchJson(`${OPT.mirror}/items/${item.slug}.json`);
      if (!record) problems.push(`${item.slug}: missing from the mirror`);
      else if (!same(record.item, item)) problems.push(`${item.slug}: mirror differs from the file`);
    }
    const delta = await fetchJson(`${OPT.mirror}/syllabi/${DELTA_ID}.json`);
    if (!delta) problems.push('delta-primary: missing from the mirror');
    else if (!same(delta.doc, doc)) problems.push('delta-primary: mirror differs from the registries');
    if (problems.length) {
      console.log(problems.join('\n'));
      process.exit(1);
    }
    console.log(`  ${items.length} items and the Delta document read back identical`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
