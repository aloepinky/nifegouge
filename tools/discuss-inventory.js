#!/usr/bin/env node
//
// Regenerates the discuss-item inventory: tools/discuss-inventory.md (read it) and
// tools/discuss-inventory.json (search it). Node, no dependencies, not part of the build.
//
//   node tools/discuss-inventory.js            # write both files
//   node tools/discuss-inventory.js --dry-run  # print the summary, write nothing
//
// What it is for: sweeping a newly added reference document across every discuss item. The
// inventory names each item, what it covers, which events brief it, which publications it
// already cites, and which of its blocks carry no citation at all — so a new publication can
// be checked against the whole set without opening 308 files to find out what is in them.
//
// It is generated, never hand-edited, for the same reason FLOW.js is: the registries move.
// A stale copy of this list is worse than no list, because it reads as a coverage map.
//
// The corpus lives on the server. It is read from the S3 mirror the site reads
// (tools/lib/discussCorpus.js), or from a local folder in the same layout with `--from=<dir>`.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { loadCorpus } = require('./lib/discussCorpus');
const OUT_MD = path.join(__dirname, 'discuss-inventory.md');
const OUT_JSON = path.join(__dirname, 'discuss-inventory.json');

const DRY = process.argv.includes('--dry-run');
const value = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

// ---------------------------------------------------------------------------------------
// Reading the corpus

async function main() {
const corpus = await loadCorpus({ from: value('from') });
const { syllabus } = corpus;
const EVENT_ROWS = syllabus.EVENT_ROWS;
const items = corpus.items;

const bySlug = new Map(items.map((i) => [i.data.slug, i]));

// ---------------------------------------------------------------------------------------
// Which events brief which item, and the stage/block each event sits in

const STAGE_LABEL = new Map(syllabus.STAGES.map((s) => [s.id, s.label]));

// Flow order: the order a student meets the events, taken from SYLLABUS's block order rather
// than from event-id arithmetic. Sorting by id would produce a sequence nobody flies.
const FLOW_ORDER = new Map();
{
  let n = 0;
  for (const block of syllabus.BLOCKS) {
    for (const ev of block.events) FLOW_ORDER.set(ev.id, n++);
  }
}

function eventContext(id) {
  const block = syllabus.blockOf(id);
  const stage = block ? block.stage : null;
  return {
    stage,
    stageLabel: STAGE_LABEL.get(stage) || null,
    block: block ? block.id : null,
    blockTitle: block ? block.title : null,
  };
}

// slug -> [{ event, title, label, ...context }]. `href` rows are not items and are collected
// separately: they have no page, so there is nothing outstanding to write about them.
const briefedBy = new Map();
const hrefRows = [];
// Label-only rows: JPPT items no page exists for yet. Not dangling, since they name no slug.
const unwrittenRows = [];
const unknownSlugs = new Set();

for (const ev of EVENT_ROWS) {
  for (const row of ev.items || []) {
    if (row.href) {
      hrefRows.push({ event: ev.id, label: row.label, href: row.href });
      continue;
    }
    if (!row.slug) {
      unwrittenRows.push({ event: ev.id, label: row.label });
      continue;
    }
    if (!bySlug.has(row.slug)) unknownSlugs.add(`${ev.id} → ${row.slug}`);
    if (!briefedBy.has(row.slug)) briefedBy.set(row.slug, []);
    briefedBy.get(row.slug).push({
      event: ev.id,
      title: ev.title,
      media: ev.media,
      label: row.label,
      order: FLOW_ORDER.has(ev.id) ? FLOW_ORDER.get(ev.id) : Number.MAX_SAFE_INTEGER,
      ...eventContext(ev.id),
    });
  }
}
for (const list of briefedBy.values()) list.sort((a, b) => a.order - b.order);

// ---------------------------------------------------------------------------------------
// Per-item shape: sections, citation coverage, search terms

// A "block" is one prose paragraph, one list element, one numbers row, one figure or one
// table — the
// granularity a reference marker attaches to. Cited means the block carries `refs`, or its
// section does (which is the collapsed single-SOURCE form).
function coverage(item) {
  let cited = 0;
  let uncited = 0;
  const uncitedIds = [];

  const count = (blocks, sectionCited, sectionId) => {
    for (const b of blocks || []) {
      const has = (b.refs && b.refs.length) || sectionCited;
      if (has) cited += 1;
      else {
        uncited += 1;
        uncitedIds.push(sectionId ? `${sectionId}/${b.id}` : b.id);
      }
    }
  };

  count(item.numbers, false, 'numbers');
  for (const s of item.sections || []) {
    const sectionCited = !!(s.refs && s.refs.length);
    count(s.paras, sectionCited, s.id);
    count(s.items, sectionCited, s.id);
    count(s.figures, sectionCited, s.id);
    count(s.tables, sectionCited, s.id);
  }
  return { cited, uncited, uncitedIds };
}

function worksOf(item) {
  const out = new Map();
  for (const r of item.references || []) {
    if (!out.has(r.work)) out.set(r.work, []);
    out.get(r.work).push([r.loc, r.pages].filter(Boolean).join(', '));
  }
  return out;
}

// The strings worth grepping a new publication for, when deciding whether it speaks to this
// item: the page title, every JPPT wording of it, and its section headings. Deduplicated
// case-insensitively, longest first, because that is the order you want to search in.
function searchTerms(item, events) {
  const seen = new Map();
  const add = (s) => {
    if (!s) return;
    const key = s.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, s.trim());
  };
  add(item.title);
  for (const e of events) add(e.label);
  for (const s of item.sections || []) add(s.title);
  return [...seen.values()].sort((a, b) => b.length - a.length);
}

const inventory = items.map(({ file, data }) => {
  const events = briefedBy.get(data.slug) || [];
  const works = worksOf(data);
  const cov = coverage(data);
  const stages = [...new Set(events.map((e) => e.stage).filter(Boolean))];

  return {
    slug: data.slug,
    title: data.title,
    file,
    flags: [
      data.stub ? 'stub' : null,
      data.generated ? 'generated' : null,
      data.maneuver ? 'maneuver' : null,
      events.length === 0 ? 'orphan' : null,
    ].filter(Boolean),
    stages,
    events: events.map((e) => ({
      id: e.event, title: e.title, stage: e.stage, block: e.block, label: e.label,
    })),
    sections: (data.sections || []).map((s) => ({
      id: s.id,
      title: s.title,
      refs: s.refs || null,
      paras: (s.paras || []).length,
      items: (s.items || []).length,
      figures: (s.figures || []).map((f) => f.src),
      tables: (s.tables || []).map((t) => t.id),
      main: s.main || null,
      further: s.further || null,
    })),
    numbers: (data.numbers || []).map((n) => ({ label: n.label, value: n.value })),
    works: [...works.keys()].sort(),
    references: (data.references || []).map((r) => ({
      n: r.n, work: r.work, loc: r.loc || null, pages: r.pages || null,
    })),
    coverage: cov,
    seeAlso: data.seeAlso || [],
    sourcingLead: data.sourcingLead || null,
    lede: data.lede || null,
    terms: searchTerms(data, events),
  };
});

// ---------------------------------------------------------------------------------------
// Roll-ups

const byWork = new Map();
for (const it of inventory) {
  for (const w of it.works) {
    if (!byWork.has(w)) byWork.set(w, []);
    byWork.get(w).push(it.slug);
  }
}

const byStage = new Map();
for (const it of inventory) {
  const key = it.stages.length ? it.stages.join('+') : '(no event)';
  byStage.set(key, (byStage.get(key) || 0) + 1);
}

const summary = {
  items: inventory.length,
  written: inventory.filter((i) => !i.flags.includes('stub') && !i.flags.includes('generated')).length,
  stubs: inventory.filter((i) => i.flags.includes('stub')).length,
  generated: inventory.filter((i) => i.flags.includes('generated')).length,
  maneuvers: inventory.filter((i) => i.flags.includes('maneuver')).length,
  orphans: inventory.filter((i) => i.flags.includes('orphan')).length,
  tables: inventory.reduce((n, i) => n + i.sections.reduce((m, s) => m + s.tables.length, 0), 0),
  tableItems: inventory.filter((i) => i.sections.some((s) => s.tables.length)).length,
  uncitedItems: inventory.filter((i) => i.coverage.uncited > 0).length,
  uncitedBlocks: inventory.reduce((n, i) => n + i.coverage.uncited, 0),
  citedBlocks: inventory.reduce((n, i) => n + i.coverage.cited, 0),
  events: EVENT_ROWS.length,
  hrefRows: hrefRows.length,
  unwrittenRows: unwrittenRows.length,
};

// ---------------------------------------------------------------------------------------
// Output

const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|');

function markdown() {
  const L = [];
  L.push('# Discuss item inventory');
  L.push('');
  L.push('Generated by `tools/discuss-inventory.js` — do not hand-edit. Regenerate with');
  L.push('`node tools/discuss-inventory.js`. The machine-readable form is');
  L.push('`tools/discuss-inventory.json`.');
  L.push('');
  L.push('This is the working list for sweeping a reference document across the whole item');
  L.push('set. For each item it gives the events that brief it, the publications it already');
  L.push('cites, and how many of its blocks carry no citation — an item with uncited blocks is');
  L.push('where a newly added publication is most likely to have something to say.');
  L.push('');
  L.push('**Uncited is not a defect.** Some claims have no publication behind them and are');
  L.push('written bare on purpose, so the missing marker warns the reader. The column says');
  L.push('where to look, not what to fix.');
  L.push('');

  L.push('## Totals');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push(`| Items | ${summary.items} |`);
  L.push(`| Written pages | ${summary.written} |`);
  L.push(`| Stubs | ${summary.stubs} |`);
  L.push(`| Generated lists | ${summary.generated} |`);
  L.push(`| Flagged \`maneuver\` | ${summary.maneuvers} |`);
  L.push(`| Reached only by search (no event lists them) | ${summary.orphans} |`);
  L.push(`| Events with content | ${summary.events} |`);
  L.push(`| \`href\` rows (not items) | ${summary.hrefRows} |`);
  L.push(`| Label-only rows (no page yet) | ${summary.unwrittenRows} |`);
  L.push(`| Tables | ${summary.tables} (in ${summary.tableItems} items) |`);
  L.push(`| Cited blocks | ${summary.citedBlocks} |`);
  L.push(`| Uncited blocks | ${summary.uncitedBlocks} (in ${summary.uncitedItems} items) |`);
  L.push('');

  L.push('## Publications cited');
  L.push('');
  L.push('| Work | Items |');
  L.push('|---|---|');
  for (const [work, slugs] of [...byWork.entries()].sort((a, b) => b[1].length - a[1].length)) {
    L.push(`| ${esc(work)} | ${slugs.length} |`);
  }
  L.push('');

  L.push('## Items');
  L.push('');
  L.push('Ordered by slug. `Uncited` counts paragraphs, list elements, numbers rows and');
  L.push('figures with no reference marker and no section-level `refs`.');
  L.push('');
  L.push('| Item | Slug | Stage | Events | Cites | Uncited | Flags |');
  L.push('|---|---|---|---|---|---|---|');
  for (const it of inventory) {
    L.push([
      '',
      esc(it.title),
      `\`${it.slug}\``,
      it.stages.join(', ') || '—',
      it.events.map((e) => e.id).join(' ') || '—',
      it.works.map(esc).join(', ') || '—',
      it.coverage.uncited || '',
      it.flags.join(', '),
      '',
    ].join(' | ').trim());
  }
  L.push('');

  L.push('## Search terms');
  L.push('');
  L.push('What to grep a new publication for, per item: the page title, every JPPT wording of');
  L.push('the item, and its section headings. Longest first.');
  L.push('');
  for (const it of inventory) {
    L.push(`- \`${it.slug}\` — ${it.terms.join(' · ')}`);
  }
  L.push('');

  L.push('## Stubs');
  L.push('');
  L.push('Items nobody has written yet. `sourcingLead` is where the next writer should look.');
  L.push('');
  for (const it of inventory.filter((i) => i.flags.includes('stub'))) {
    L.push(`### ${it.title}`);
    L.push('');
    L.push(`\`${it.slug}\` — briefed by ${it.events.map((e) => e.id).join(', ') || 'no event'}`);
    L.push('');
    if (it.sourcingLead) L.push(`> ${it.sourcingLead}`);
    L.push('');
  }

  L.push('## Items reached only by search');
  L.push('');
  L.push('Written, but no event lists them — there is no path to these but the search box.');
  L.push('');
  const orphans = inventory.filter((i) => i.flags.includes('orphan'));
  if (!orphans.length) L.push('None.');
  for (const it of orphans) L.push(`- ${it.title} (\`${it.slug}\`)`);
  L.push('');

  L.push('## JPPT items with no page');
  L.push('');
  L.push('Label-only event rows: the JPPT names the item and no page has been written for it.');
  L.push('');
  if (!unwrittenRows.length) L.push('None.');
  for (const r of unwrittenRows) L.push(`- ${r.event} — ${r.label}`);
  L.push('');

  if (unknownSlugs.size) {
    L.push('## Dangling event rows');
    L.push('');
    L.push('An event names a slug with no item file behind it.');
    L.push('');
    for (const u of unknownSlugs) L.push(`- ${u}`);
    L.push('');
  }

  return L.join('\n');
}

const md = markdown();
const json = JSON.stringify({ summary, works: Object.fromEntries(byWork), items: inventory }, null, 2);

if (DRY) {
  console.log(md.split('\n').slice(0, 60).join('\n'));
  console.log(`\n[dry run] would write ${path.relative(ROOT, OUT_MD)} (${md.length} bytes)`);
  console.log(`[dry run] would write ${path.relative(ROOT, OUT_JSON)} (${json.length} bytes)`);
} else {
  fs.writeFileSync(OUT_MD, `${md}\n`, 'utf8');
  fs.writeFileSync(OUT_JSON, `${json}\n`, 'utf8');
  console.log(`wrote ${path.relative(ROOT, OUT_MD)} and ${path.relative(ROOT, OUT_JSON)}`);
}

console.log(
  `\n${summary.items} items · ${summary.written} written · ${summary.stubs} stubs · `
  + `${summary.generated} generated · ${summary.uncitedBlocks} uncited blocks in ${summary.uncitedItems} items`,
);
for (const u of unknownSlugs) console.warn(`warning: dangling event row ${u}`);

}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(2);
});
