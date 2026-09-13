#!/usr/bin/env node
//
// Lints the discuss items against the section-header rules and the FTI page shape. Node, no
// dependencies, not part of the build. Prints to stdout; exits non-zero if any error-level
// violation survives.
//
//   node tools/discuss-lint.js                  # lint everything
//   node tools/discuss-lint.js --stage=FAM      # only items citing the FAM FTI
//   node tools/discuss-lint.js --stage=none     # only items citing no FTI at all
//   node tools/discuss-lint.js --slug=slip      # one item
//   node tools/discuss-lint.js --headings-only  # skip the structural and prose checks
//   node tools/discuss-lint.js --prose-only     # only the prose checks
//   node tools/discuss-lint.js --list           # print the item slugs in scope and stop
//   node tools/discuss-lint.js --snapshot       # (re)write the id baseline, lint nothing
//   node tools/discuss-lint.js --from=<dir>     # read a local mirror folder, not the server
//
// WHY A HEADING LINTER. A section title is an index entry, not a sentence: it labels a body of
// knowledge rather than describing an action, answering a question or addressing the reader.
// "Flying it", "What it is", "When to recover" and "The limit of the procedure" all read as
// something said out loud. 788 distinct titles across 936 sections is far too many to hold in
// one head, so the rules are checked mechanically and the same way every time.
//
// WHY THE ID BASELINE IS A FILE. Section, paragraph, list and numbers ids are the seam the
// community edit layer attaches to, so renaming one orphans whatever a user wrote against it —
// which makes id drift the worst mistake available here and the one worth a dedicated check.
// The corpus is not in git, so HEAD has no copy of it to compare against. tools/discuss-ids.json
// is that copy: snapshot it before an editing pass, and every run afterwards reports an id that
// moved. Rewriting a title must never touch the id under it.
//
// WHERE THE CORPUS COMES FROM. The items live on the server. By default they are read from the
// S3 mirror the site itself reads (tools/lib/discussCorpus.js); `--from=<dir>` reads the same
// layout from a folder, which is what `tools/discuss-migrate.js --out` writes and what the dev
// server keeps under _discuss-dev/mirror.
//
// WHERE THE RULES LIVE. tools/lib/discussRules.mjs, shared with lambda/discussApi so that a
// save on the site and a run here report the same findings. This file is the reporting and
// the id baseline; it defines no rule of its own.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { loadCorpus } = require('./lib/discussCorpus');

const ROOT = path.resolve(__dirname, '..');
const IDS_FILE = path.join(__dirname, 'discuss-ids.json');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const OPT = {
  stage: value('stage'),
  slug: value('slug'),
  from: value('from'),
  headingsOnly: flag('headings-only'),
  proseOnly: flag('prose-only'),
  list: flag('list'),
  snapshot: flag('snapshot'),
  strict: flag('strict'),
};

function inScope(entry, ftiOf) {
  if (OPT.slug) return entry.data.slug === OPT.slug;
  if (!OPT.stage) return true;
  const ftis = ftiOf(entry.data);
  if (OPT.stage.toLowerCase() === 'none') return ftis.length === 0;
  return ftis.some((f) => f.toLowerCase() === OPT.stage.toLowerCase());
}

// A section id is an anchor: it is in the contents rail, it is what `#the-limit-of-the-
// procedure` resolves to, and it is what an edit is filed against. Losing one is an error
// however the title above it changed. A paragraph or list-element id inside a section is
// finer-grained, and rewriting a prose section into numbered steps genuinely retires its
// paragraphs — that is reported for review rather than failed.
function idViolations(entry, baseline, idsOf) {
  if (!baseline) return [];
  const before = baseline[entry.data.slug];
  if (!before) return [];
  const now = new Set(idsOf(entry.data));
  return before
    .filter((id) => !now.has(id))
    .map((id) => [id.includes('/') ? 'info' : 'error', 'id-drift', id]);
}

async function main() {
  const {
    idsOf, headingsOf, headingViolations, proseViolations, structureViolations, ftiOf,
  } = await import(pathToFileURL(path.join(__dirname, 'lib', 'discussRules.mjs')).href);

  const ALL = (await loadCorpus({ from: OPT.from })).items;

  if (OPT.snapshot) {
    const snap = {};
    for (const { data } of ALL) snap[data.slug] = idsOf(data);
    fs.writeFileSync(IDS_FILE, `${JSON.stringify(snap, null, 1)}\n`);
    const total = Object.values(snap).reduce((n, v) => n + v.length, 0);
    console.log(`snapshot: ${Object.keys(snap).length} items, ${total} ids -> ${path.relative(ROOT, IDS_FILE)}`);
    return 0;
  }

  const BASELINE = fs.existsSync(IDS_FILE)
    ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'))
    : null;

  const scope = ALL.filter((e) => inScope(e, ftiOf));

  if (OPT.list) {
    console.log(scope.map((e) => e.data.slug).join('\n'));
    return 0;
  }

  let errors = 0;
  let infos = 0;
  let headingCount = 0;
  let sectionCount = 0;
  const byRule = new Map();
  const bump = (rule) => byRule.set(rule, (byRule.get(rule) || 0) + 1);

  for (const entry of scope) {
    const item = entry.data;
    const lines = [];
    const seen = new Set();

    if (!OPT.proseOnly) {
      for (const h of headingsOf(item)) {
        sectionCount += 1;
        const v = headingViolations(h.title, item, seen);
        if (v.length) {
          headingCount += 1;
          errors += 1;
          v.forEach((r) => bump(r.split(':')[0]));
          lines.push(`  ${h.level === 3 ? 'sub-head' : 'heading '} '${h.title}'  [${v.join(', ')}]`);
        }
      }
    }

    if (!OPT.headingsOnly) {
      const checks = OPT.proseOnly
        ? proseViolations(item)
        : [...proseViolations(item), ...structureViolations(item), ...idViolations(entry, BASELINE, idsOf)];
      for (const [level, rule, detail] of checks) {
        if (level === 'error' || OPT.strict) errors += 1;
        else infos += 1;
        bump(rule);
        lines.push(`  ${level === 'error' || OPT.strict ? 'ERROR   ' : 'info    '} ${rule}  (${detail})`);
      }
    }

    if (lines.length) {
      console.log(item.slug);
      console.log(lines.join('\n'));
    }
  }

  const scopeLabel = OPT.slug
    ? OPT.slug
    : OPT.stage
      ? (OPT.stage.toLowerCase() === 'none' ? 'items citing no FTI' : `${OPT.stage} FTI items`)
      : 'all items';

  console.log();
  console.log(`${scope.length} items in scope (${scopeLabel}), ${sectionCount} sections`);
  console.log(`${headingCount} headings violate a rule; ${errors} errors, ${infos} advisory`);
  if (byRule.size) {
    console.log(
      [...byRule.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([r, n]) => `  ${String(n).padStart(4)}  ${r}`)
        .join('\n'),
    );
  }
  if (!BASELINE && !OPT.headingsOnly) {
    console.log(`\nno id baseline: run --snapshot to write ${path.relative(ROOT, IDS_FILE)}`);
  }

  return errors ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err.message || err);
    process.exit(2);
  },
);
