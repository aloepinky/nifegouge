#!/usr/bin/env node
//
// Adds each event's Special Syllabus Requirements, read out of its JPPT, to a published
// syllabus as one ordinary revision. The parser has read them since 2026-09-30; the syllabi
// published before that carry none.
//
//   node tools/discuss-add-ssrs.js                       dry run: prints what would change
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-add-ssrs.js --write --author=Loevinger
//
//   --only=<id>      one syllabus (delta-primary, t44c-p8, t44c-e2d)
//   --api=<url>      the API base (default: the production API Gateway stage)
//   --mirror=<url>   where the current document is read from (default: the bucket)
//   --write          send the revisions; without it nothing is sent
//
// Against the local dev server: --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror
//
// This is not a re-seed. It reads the live document and changes one field, `ssr`, on events
// and blocks, so every hand repair to the chart and the rows is kept; it checks that before
// sending. Delta also had some SSRs typed into its syllabus notes by hand, and those sentences
// come out of the notes so the page doesn't say them twice. Every notes change is printed.

const fs = require('fs');
const path = require('path');
const { loadSrc } = require('./lib/loadSrc');

// pdf.js runs its worker in-process when this is loaded, as it does under Jest.
require('pdfjs-dist/legacy/build/pdf.worker.entry');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};

const API = value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss';
const MIRROR = value('mirror') || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com';
const AUTHOR = value('author');
const WRITE = flag('write');
const ONLY = value('only');

const REFS = path.join(__dirname, '..', '_reference-docs');
const SYLLABI = [
  { id: 'delta-primary', pdf: path.join(REFS, 'T6b Primary', 'Fundamental References', 'Delta JPPT.pdf') },
  { id: 't44c-p8', pdf: path.join(REFS, 'T44C Advanced', 'Fundamental References', '1542.168C CH-2.pdf') },
  { id: 't44c-e2d', pdf: path.join(REFS, 'T44C Advanced', 'Fundamental References', '1542.175D CH-1.pdf') },
];

const SUMMARY = 'Adds Special Syllabus Requirements from the JPPT to each event.';

// "Special syllabus requirement: the instructor demonstrates ..." and "Special syllabus
// requirements for F4103/F4104: ...", up to the end of that sentence.
const TYPED_SSR = /\s*Special syllabus requirements?(?: for [^:.]+)?:.*?\.(?=\s+[A-Z]|\s*$)/i;

const src = (rel) => loadSrc(path.join(__dirname, '..', 'src', 'components', 'discuss', 'jppt', rel));

async function parse(pdf) {
  const { loadTextPages } = src('pdfText.js');
  const { extractSyllabus } = src('syllabusExtract.js');
  const syl = extractSyllabus(await loadTextPages(fs.readFileSync(pdf)));
  return {
    events: Object.fromEntries(syl.events.filter((e) => e.ssr).map((e) => [e.id, e.ssr])),
    blocks: Object.fromEntries(syl.blocks.filter((b) => b.ssr).map((b) => [b.id, b.ssr])),
  };
}

async function readMirror(key) {
  const res = await fetch(`${MIRROR}/${key}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  return res.json();
}

// Everything but the fields this tool writes, so the check below can say nothing else moved.
function skeleton(doc) {
  return JSON.stringify({
    ...doc,
    blocks: doc.blocks.map(({ ssr, ...b }) => b),
    events: doc.events.map(({ ssr, syllabusNotes, ...e }) => e),
  });
}

function apply(doc, parsed, log) {
  const next = JSON.parse(JSON.stringify(doc));
  const have = new Set(next.events.map((e) => e.id));
  Object.keys(parsed.events).filter((id) => !have.has(id)).forEach((id) => {
    log(`  ! ${id} has an SSR but no event in this syllabus: ${parsed.events[id]}`);
  });
  next.events.forEach((e) => {
    const ssr = parsed.events[e.id] || null;
    if (ssr) e.ssr = ssr;
    else delete e.ssr;
    if (ssr && e.syllabusNotes && TYPED_SSR.test(e.syllabusNotes)) {
      const notes = e.syllabusNotes.replace(TYPED_SSR, '').trim();
      log(`  ${e.id} notes\n    was: ${e.syllabusNotes}\n    now: ${notes || '(none)'}`);
      e.syllabusNotes = notes || null;
    }
    if (ssr) log(`  ${e.id} SSR: ${ssr}`);
  });
  next.blocks.forEach((b) => {
    if (parsed.blocks[b.id]) {
      b.ssr = parsed.blocks[b.id];
      log(`  ${b.id} (block) SSR: ${b.ssr}`);
    } else {
      delete b.ssr;
    }
  });
  // A typed SSR left in notes means the event got none from the parser. Say so; don't touch it.
  next.events.filter((e) => !e.ssr && TYPED_SSR.test(e.syllabusNotes || '')).forEach((e) => {
    log(`  ! ${e.id} notes name an SSR the JPPT reading didn't find: ${e.syllabusNotes}`);
  });
  return next;
}

async function post(op, body) {
  const res = await fetch(`${API}/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON body */ }
  if (!res.ok || data.success === false) {
    const err = new Error(`${op}: ${data.error || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function main() {
  if (WRITE && !AUTHOR) throw new Error('--author= is required with --write (the user\'s name, never Claude\'s)');
  const list = ONLY ? SYLLABI.filter((s) => s.id === ONLY) : SYLLABI;
  if (!list.length) throw new Error(`${ONLY}: not one of ${SYLLABI.map((s) => s.id).join(', ')}`);
  for (const s of list) {
    // eslint-disable-next-line no-await-in-loop
    const [record, parsed] = await Promise.all([readMirror(`syllabi/${s.id}.json`), parse(s.pdf)]);
    const lines = [];
    const next = apply(record.doc, parsed, (l) => lines.push(l));
    const count = next.events.filter((e) => e.ssr).length;
    console.log(`${s.id} rev ${record.rev}: ${count} events and ${Object.keys(parsed.blocks).length} blocks get an SSR`);
    console.log(lines.join('\n'));
    if (skeleton(next) !== skeleton(record.doc)) throw new Error(`${s.id}: something besides ssr and notes changed; nothing sent`);
    if (JSON.stringify(next) === JSON.stringify(record.doc)) {
      console.log('  already up to date\n');
      continue;
    }
    if (!WRITE) {
      console.log('  (dry run; --write to send)\n');
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const { rev } = await post('save-syllabus', {
        id: s.id, baseRev: record.rev, name: record.name, doc: next, author: AUTHOR, summary: SUMMARY,
      });
      console.log(`  saved as rev ${rev}\n`);
    } catch (err) {
      if (err.status === 409) console.error(`  ${s.id}: someone saved a newer revision since it was read; run again.`);
      else throw err;
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
