#!/usr/bin/env node
//
// Takes a page off the site, through the admin `hide-item` operation: the page leaves the item
// index and the mirror, so nothing links to it and the search box no longer lists it. Nothing is
// deleted — the revisions stay in the table and `--show` puts the page back — which is the point
// of hiding rather than dropping a row.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-hide.js --slugs=tower-visit,exams
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-hide.js --slugs=tower-visit --school=Primary --show
//
//   --api=<url>      the API base (default: the production API Gateway stage)
//   --mirror=<url>   where the check for inbound links reads the corpus (default: the bucket)
//   --school=<name>  the pages' school (Primary, NIFE, Advanced); found from the index if left out
//   --show           unhide instead of hide (needs --school=)
//   --dry-run        report what would be sent, and send nothing
//
// A hidden page that another page still links to leaves a dead link, and an event row still
// pointing at it renders as "missing" rather than "no page yet". Both are reported before
// anything is sent, and both are yours to fix first — the event row wants the "needs no page"
// kind, the inbound link wants removing from the other page's See also or hatnote.
//
// Against the local dev server: --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror
// with DISCUSS_ADMIN_TOKEN=dev.

const { args, API_URL, MIRROR_URL, apiPost, readMirror: read } = require('./lib/cli');
const { itemPath, schoolNs } = require('./lib/discussCorpus');

const { flag, value } = args();

const OPT = {
  api: value('api') || API_URL,
  mirror: value('mirror') || MIRROR_URL,
  slugs: value('slugs'),
  school: value('school'),
  show: flag('show'),
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

const readMirror = (key) => read(OPT.mirror, key);
const post = (op, body) => apiPost(OPT.api, op, body, OPT.token);

// A page is (school, slug): NIFE and Primary may both have a `turn-pattern`. Each slug is
// matched to its school through the item index, or `--school=` says which. A hidden page is
// not in the index, so putting one back (`--show`) needs `--school=`.
function targetsOf(slugs, index) {
  return slugs.map((slug) => {
    if (OPT.school) return { slug, school: OPT.school };
    const hits = index.items.filter((e) => e.slug === slug);
    if (hits.length > 1) {
      throw new Error(`${slug}: ${hits.map((e) => e.school).join(' and ')} both have a page by that name; pass --school=`);
    }
    if (!hits.length) throw new Error(`${slug}: not in the item index; pass --school=`);
    return { slug, school: hits[0].school };
  });
}

// Every page that links to a target, and every syllabus event row still pointing at it. Read
// from the mirror rather than the table, because the mirror is what the site reads. Links hold
// bare slugs and resolve inside the reader's own school, so only that school's pages and
// syllabi can point at a target.
async function inbound(targets, index) {
  const pages = {};
  const rows = {};
  targets.forEach((t) => { pages[t.slug] = []; rows[t.slug] = []; });
  const sameSchool = (t, school) => schoolNs(school) === schoolNs(t.school);
  for (const entry of index.items) {
    const near = targets.filter((t) => sameSchool(t, entry.school) && t.slug !== entry.slug);
    if (!near.length) continue;
    const { item } = await readMirror(`items/${itemPath(entry)}.json`);
    const text = JSON.stringify(item);
    near.forEach((t) => { if (text.includes(`"${t.slug}"`)) pages[t.slug].push(entry.slug); });
  }
  const { syllabi } = await readMirror('syllabi/index.json');
  for (const s of syllabi) {
    const near = targets.filter((t) => !s.school || sameSchool(t, s.school));
    if (!near.length) continue;
    const { doc } = await readMirror(`syllabi/${s.id}.json`);
    (doc.events || []).forEach((e) => (e.items || []).forEach((r) => {
      if (near.some((t) => t.slug === r.slug)) rows[r.slug].push(`${s.id} ${e.id}`);
    }));
  }
  return { pages, rows };
}

async function main() {
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const slugs = (OPT.slugs || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) throw new Error('--slugs= is required');
  if (OPT.show && !OPT.school) throw new Error('--show needs --school=: a hidden page is not in the index');

  const index = OPT.show ? null : await readMirror('items/index.json');
  const targets = OPT.show ? slugs.map((slug) => ({ slug, school: OPT.school })) : targetsOf(slugs, index);

  if (!OPT.show) {
    const { pages, rows } = await inbound(targets, index);
    slugs.forEach((s) => {
      if (pages[s].length) console.log(`${s}: still linked from ${pages[s].join(', ')}`);
      if (rows[s].length) console.log(`${s}: still listed by ${rows[s].join(', ')}`);
    });
  }

  for (const { slug, school } of targets) {
    if (OPT.dryRun) { console.log(`would ${OPT.show ? 'show' : 'hide'} ${school}/${slug}`); continue; }
    await post('hide-item', { slug, school, hidden: !OPT.show });
    console.log(`${OPT.show ? 'shown' : 'hidden'}: ${school}/${slug}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
