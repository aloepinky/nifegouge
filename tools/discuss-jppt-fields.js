#!/usr/bin/env node
//
// Brings a published syllabus's Special Syllabus Requirements and syllabus notes into line with
// how the JPPT parser reads them now, as one ordinary revision per syllabus.
//
//   node tools/discuss-jppt-fields.js --dry-run          prints what would change, sends nothing
//   node tools/discuss-jppt-fields.js --write --author=Loevinger
//
//   --only=<id>      one syllabus (delta-primary, echo-syllabus-primary-76ae, nife-flight,
//                    t44c-p8, t44c-e2d)
//   --api=<url>      the API base (default: the production API Gateway stage)
//   --mirror=<url>   where the current document is read from (default: the bucket)
//   --dry-run        the default, said out loud; can't be combined with --write
//   --write          send the revisions; without it nothing is sent
//
// Against the local dev server: --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror
//
// What it writes, and nothing else:
//   events[].ssr            the event's SSRs (since 2026-09-30)
//   blocks[].ssr            SSRs the JPPT gives for the whole block
//   blocks[].syllabusNotes  the block's lettered notes, one string per item, letters dropped
//   events[].syllabusNotes  only the lines the notes give for that event ("FAM2101 Checklist
//                           procedures required: ..."); before 2026-10-01 every event carried
//                           its whole block's notes run together, and Delta's were paraphrased
//   blocks[].hxNote         words printed in the H/X cell instead of a number (FAM42's "See
//                           Syllabus Note c and d", G60's "G")
//   titles                  only where the old title is the corrected one plus stray text the
//                           header reader used to pick up from the number columns (FAM42, G08,
//                           G10, G60), on the block and on its events; a title that differs in
//                           any other way (Delta's hand-written "FAM ..." names) is left alone
//
// This is not a re-seed: the chart, the rows and everything else come from the live document,
// so every hand repair is kept, and it refuses to send if anything else would change.
// NIFE's syllabus was built by hand from the MCG, which the parser doesn't read, so its two SSRs
// are typed here and its notes are left alone.

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
if (WRITE && flag('dry-run')) {
  console.error('--write and --dry-run together: pick one');
  process.exit(1);
}
const ONLY = value('only');

const REFS = path.join(__dirname, '..', '_reference-docs');
const SYLLABI = [
  { id: 'delta-primary', pdf: path.join(REFS, 'T6b Primary', 'Fundamental References', 'Delta JPPT.pdf') },
  { id: 'echo-syllabus-primary-76ae', pdf: path.join(REFS, 'T6b Primary', 'Fundamental References', 'Echo JPPT.pdf') },
  // The MCG prints two SSRs, both in C41 (NASCINST 1542.1B, Ch. 4, block C41, c. Special
  // Syllabus Requirements); every other flight block says None.
  {
    id: 'nife-flight',
    fixed: {
      ssr: {
        C4101: 'CFI shall demonstrate the civilian box pattern.',
        C4102: 'Power off and power on stall shall be taken to a full stall for experience purposes.',
      },
      blockSsr: {},
      notes: null,
    },
  },
  { id: 't44c-p8', pdf: path.join(REFS, 'T44C Advanced', 'Fundamental References', '1542.168C CH-2.pdf') },
  { id: 't44c-e2d', pdf: path.join(REFS, 'T44C Advanced', 'Fundamental References', '1542.175D CH-1.pdf') },
];

// Summaries are cut at 200 characters, so the ruling comes first.
const SUMMARY = 'Block titles lose the H/X cell or event count stuck on the end (FAM42, G08, G10, G60); '
  + 'an H/X cell of words shows as H/X.';

const src = (rel) => loadSrc(path.join(__dirname, '..', 'src', 'components', 'discuss', 'jppt', rel));

async function parse(pdf) {
  const { loadTextPages } = src('pdfText.js');
  const { extractSyllabus } = src('syllabusExtract.js');
  const syl = extractSyllabus(await loadTextPages(fs.readFileSync(pdf)));
  const pick = (rows, k) => Object.fromEntries(rows.filter((r) => r[k]).map((r) => [r.id, r[k]]));
  return {
    ssr: pick(syl.events, 'ssr'),
    blockSsr: pick(syl.blocks, 'ssr'),
    notes: { events: pick(syl.events, 'syllabusNotes'), blocks: pick(syl.blocks, 'syllabusNotes') },
    titles: pick(syl.blocks, 'title'),
    hxNote: pick(syl.blocks, 'hxNote'),
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
    blocks: doc.blocks.map(({ ssr, syllabusNotes, hxNote, title, events, ...b }) => ({
      ...b, events: events.map(({ title: t, ...e }) => e),
    })),
    events: doc.events.map(({ ssr, syllabusNotes, title, ...e }) => e),
  });
}

const setOrDrop = (row, k, v) => {
  if (v == null || (Array.isArray(v) && !v.length)) delete row[k];
  else row[k] = v;
};

function apply(doc, parsed, log) {
  const next = JSON.parse(JSON.stringify(doc));
  const have = new Set(next.events.map((e) => e.id));
  const missing = (what, map) => Object.keys(map).filter((id) => !have.has(id)).forEach((id) => {
    log(`  ! ${id} has ${what} but no event in this syllabus: ${map[id]}`);
  });
  missing('an SSR', parsed.ssr);
  if (parsed.notes) missing('notes', parsed.notes.events);

  // A title is corrected only where the old one is the new one with something stuck on the end.
  const fixed = {};
  if (parsed.titles) {
    next.blocks.forEach((b) => {
      const t = parsed.titles[b.id];
      if (t && b.title && b.title !== t && b.title.startsWith(`${t} `)) fixed[b.title] = t;
    });
    Object.entries(fixed).forEach(([was, now]) => log(`  title "${was}" -> "${now}"`));
  }
  const retitle = (row) => { if (row.title && fixed[row.title]) row.title = fixed[row.title]; };

  next.events.forEach((e) => {
    retitle(e);
    setOrDrop(e, 'ssr', parsed.ssr[e.id]);
    if (!parsed.notes) return;
    const was = e.syllabusNotes || null;
    const now = parsed.notes.events[e.id] || null;
    if (was !== now) log(`  ${e.id} event notes\n    was: ${was || '(none)'}\n    now: ${now || '(none)'}`);
    // Kept as null rather than dropped, as the flow editor writes a new event.
    e.syllabusNotes = now;
  });
  next.blocks.forEach((b) => {
    retitle(b);
    b.events.forEach(retitle);
    if (parsed.hxNote && b.hx == null) {
      if (parsed.hxNote[b.id] && b.hxNote !== parsed.hxNote[b.id]) log(`  ${b.id} H/X: ${parsed.hxNote[b.id]}`);
      setOrDrop(b, 'hxNote', parsed.hxNote[b.id]);
    }
    setOrDrop(b, 'ssr', parsed.blockSsr[b.id]);
    if (!parsed.notes) return;
    const list = parsed.notes.blocks[b.id] || [];
    if (JSON.stringify(b.syllabusNotes || []) !== JSON.stringify(list)) {
      log(`  ${b.id} block notes:${list.length ? '' : ' (none)'}`);
      list.forEach((t, i) => log(`    ${String.fromCharCode(97 + i)}. ${t}`));
    }
    setOrDrop(b, 'syllabusNotes', list);
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
    const [record, parsed] = await Promise.all([readMirror(`syllabi/${s.id}.json`), s.fixed || parse(s.pdf)]);
    const lines = [];
    const next = apply(record.doc, parsed, (l) => lines.push(l));
    const n = (rows, k) => rows.filter((r) => r[k]).length;
    console.log(`${s.id} rev ${record.rev}: SSRs on ${n(next.events, 'ssr')} events and ${n(next.blocks, 'ssr')} blocks; `
      + `notes on ${n(next.blocks, 'syllabusNotes')} blocks and ${n(next.events, 'syllabusNotes')} events`);
    console.log(lines.join('\n'));
    if (skeleton(next) !== skeleton(record.doc)) throw new Error(`${s.id}: something besides SSRs and notes changed; nothing sent`);
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
