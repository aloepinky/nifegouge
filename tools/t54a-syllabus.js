#!/usr/bin/env node
//
// The T-54A syllabus document, published as the built-in syllabus of the /t54a/discuss mount:
//
//   t54a-me    T-54A    CNATRAINST 1542.198, 26 Mar 2025 (CH-1 31 Jul 2025)
//
// `aircraft: 'T-54A'`, `school: 'T-54A'`. The T-54A is a school of its own, so its pages are
// written for its own publications and stored apart from the T-44C's; a page both aircraft
// brief is the same slug in each, and offers a switch to the other (programs.js `twins`).
//
// The mount's built-in syllabus is required before the tab will render, so a new school cannot
// be bootstrapped through the site's upload page; that is why this tool exists, as
// tools/t44c-syllabus.js does for the T-44C.
//
// IT SEEDS ONCE, AND REFUSES TO PUBLISH OVER A SYLLABUS THAT IS ALREADY THERE. The traced chart
// is finished by hand in the flow editor, and a re-import would throw those repairs away; see
// the header of tools/t44c-syllabus.js for how that happened once. After the seed, a correction
// is an ordinary revision made on the site.
//
// The document comes from the publication through the browser parser, which is what the site
// itself runs, and the test that writes it is the regression test for the parse:
//
//   T54A_DOCS_OUT=<dir> CI=true npx react-scripts test --watchAll=false --testPathPattern=jppt/t54a
//   DISCUSS_ADMIN_TOKEN=... node tools/t54a-syllabus.js --from=<dir>
//
// PowerShell sets the variables first; see CLAUDE.md.
//
//   --from=<dir>  where the generated document is (default: beside the publication)
//   --api=<url>   the API base (default: the production API Gateway stage)
//   --dry-run     print what would be published and publish nothing

const fs = require('fs');
const path = require('path');

const { args, API_URL } = require('./lib/cli');

const { flag, value } = args();

const API = value('api') || API_URL;
const TOKEN = process.env.DISCUSS_ADMIN_TOKEN || value('token');
const FROM = value('from')
  || path.join(__dirname, '..', '_reference-docs', 'T-54A Advanced', 'generated');
const ONLY = value('only');

const IDS = ['t54a-me'];

function load(id) {
  const file = path.join(FROM, `${id}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`${file} is not there. Generate the documents first; see the header of this file.`);
  }
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!record.doc || !record.name) throw new Error(`${file} is not a { id, name, doc } record`);
  if (!record.doc.aircraft || !record.doc.school) {
    throw new Error(`${file} carries no aircraft and school; the server refuses a syllabus without both`);
  }
  return record;
}

function describe(record) {
  const { doc } = record;
  const events = doc.blocks.reduce((n, b) => n + b.events.length, 0);
  const rows = doc.events.reduce((n, e) => n + e.items.length, 0);
  const charts = (doc.postFlows || []).map((f) => f.label).join(', ') || 'none';
  return `${doc.blocks.length} blocks, ${events} events, ${doc.events.length} with items, `
    + `${rows} item rows, ${doc.flow.NODES.length} chart boxes, community charts: ${charts}`;
}

// No `replace`. The server refuses an import onto a syllabus that exists, and that refusal is
// the point of this tool rather than an obstacle in it: see the header.
async function publish(record) {
  const res = await fetch(`${API}/import-syllabus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': TOKEN },
    body: JSON.stringify({ id: record.id, name: record.name, doc: record.doc }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409) {
    throw new Error(`${record.id} is already published, so it was left alone. This tool only seeds.\n`
      + '  Its chart has been repaired by hand since, and re-importing would put the traced one back.\n'
      + `  To change it, edit it on the site: /t54a/discuss/edit`);
  }
  if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data.rev;
}

async function main() {
  const ids = ONLY ? [ONLY] : IDS;
  const records = ids.map(load);
  if (flag('dry-run')) {
    records.forEach((r) => {
      console.log(`${r.id}  "${r.name}"  ${r.doc.aircraft} ${r.doc.school}`);
      console.log(`   ${describe(r)}`);
      console.log(`   ${Math.round(Buffer.byteLength(JSON.stringify(r.doc), 'utf8') / 1024)} KB`);
    });
    return;
  }
  if (!TOKEN) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  let seeded = 0;
  for (const record of records) {
    try {
      // Sequential on purpose: each write rebuilds the syllabi index.
      // eslint-disable-next-line no-await-in-loop
      const rev = await publish(record);
      seeded += 1;
      console.log(`${record.id} rev ${rev}: ${describe(record)}`);
    } catch (err) {
      // One already up must not stop the other being seeded — that is the half-seeded case this
      // tool exists for, and it is exactly when the refusal above is most likely to fire.
      console.error(err.message || err);
    }
  }
  if (!seeded) console.log('Nothing seeded.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
