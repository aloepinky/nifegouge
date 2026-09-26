#!/usr/bin/env node
//
// The two T-44C syllabus documents, published as the corpus of the /t44c/discuss mount:
//
//   t44c-p8    T-44C P-8 Advanced        CNATRAINST 1542.168C, 10 Sep 2024
//   t44c-e2d   T-44C E-2D Intermediate   CNATRAINST 1542.175D, 10 Jul 2025
//
// Both are `aircraft: 'T-44C'`, `school: 'Advanced'`. They are two courses flown in one
// aircraft and they share one page corpus, which is what the school pair decides; which
// community a student is going to is in the syllabus NAME, because neither title page says.
// 1542.168C is headed "T-44C Advanced Multi-Engine MPTS" and never mentions the P-8 outside
// its Course Data, and 1542.175D calls its own school Intermediate.
//
// `t44c-p8` has to exist before the tab will render at all: DiscussDataProvider treats the
// mount's built-in syllabus as required, so there is no bootstrapping a new school through the
// site's own upload page. That is why this tool exists, as tools/nife-syllabus.js does.
//
// IT SEEDS ONCE, AND REFUSES TO PUBLISH OVER A SYLLABUS THAT IS ALREADY THERE. The course flow
// is finished by hand in the flow editor — the tracer leaves a dozen connectors unresolved on
// each chart and says so in its warnings — and a re-import is the whole generated document, so
// it puts every one of them back and throws the repairs away. That happened: revisions 6 and 7
// of t44c-p8 and revision 6 of t44c-e2d were hand-fixed charts, and a re-run replaced them with
// the traced ones, silently, because the documents on disk had not changed and nothing said the
// live charts had. Nothing was lost for good — every revision is kept, and restoring one is a
// `save-syllabus` POST carrying that revision's doc — but the work had to be found first.
//
// So after the seed, a correction is an ordinary revision made on the site. If the parser
// itself improves and the generated document is genuinely better, publish it from the site's
// own upload page, where the chart is reviewed before it goes and the old one is a revision you
// can read beside it.
//
// Unlike nife-syllabus.js the documents are not written out here. They come from the
// publications through the browser parser, which is what the site itself runs:
//
//   T44C_DOCS_OUT=<dir> CI=true npx react-scripts test --watchAll=false --testPathPattern=jppt/t44c
//   DISCUSS_ADMIN_TOKEN=... node tools/t44c-syllabus.js --from=<dir>
//
// PowerShell sets the variables first; see CLAUDE.md. That test is also the regression test
// for the parse, so a document it writes is one whose block counts, event counts and community
// charts have just been checked against the publications.
//
//   --from=<dir>  where the generated documents are (default: beside the publications)
//   --api=<url>   the API base (default: the production API Gateway stage)
//   --only=<id>   publish just one of them
//   --dry-run     print what would be published and publish nothing

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};

const API = value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss';
const TOKEN = process.env.DISCUSS_ADMIN_TOKEN || value('token');
const FROM = value('from')
  || path.join(__dirname, '..', '_reference-docs', 'T44C Advanced', 'Fundamental References', 'generated');
const ONLY = value('only');

const IDS = ['t44c-p8', 't44c-e2d'];

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
      + `  To change it, edit it on the site: /t44c/discuss/s/${record.id}/edit`);
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
