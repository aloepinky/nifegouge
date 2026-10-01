#!/usr/bin/env node
//
// Rewrites the display name on a page's revisions, through the admin `set-author` operation:
// every revision of the page authored `--from` is shown as `--to`. The documents are untouched
// and nothing is deleted; this is for a name that should never have been on a revision.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-set-author.js --from="Claude" --to="Loevinger" --slugs=a,b,c
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-set-author.js --from="Claude" --to="Loevinger" --all
//
//   --api=<url>      the API base (default: the production API Gateway stage)
//   --mirror=<url>   where the page list and each page's school are read (default: the production bucket)
//   --school=<name>  the named pages' school (Primary, NIFE, Advanced); found from the index if left out
//   --dry-run        list the pages that would be sent and send nothing
//
// Against the local dev server: --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror
// with DISCUSS_ADMIN_TOKEN=dev.

const { args, API_URL, MIRROR_URL, apiPost, readMirror } = require('./lib/cli');

const { flag, value } = args();

const OPT = {
  api: value('api') || API_URL,
  mirror: value('mirror') || MIRROR_URL,
  from: value('from'),
  to: value('to'),
  slugs: value('slugs'),
  school: value('school'),
  all: flag('all'),
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

const post = (op, body) => apiPost(OPT.api, op, body, OPT.token);

// A page is (school, slug): NIFE and Primary may both have a `turn-pattern`, and an op sent
// without a school reaches only the page's pre-namespace legacy row. So every page goes with
// its school, from the index for `--all` and for named slugs left without `--school=`.
async function pagesToSend() {
  const named = OPT.slugs ? OPT.slugs.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (!OPT.all && OPT.school) return named.map((slug) => ({ slug, school: OPT.school }));
  if (!OPT.all && !named.length) return [];
  const { items } = await readMirror(OPT.mirror, 'items/index.json');
  if (OPT.all) return items.map((i) => ({ slug: i.slug, school: i.school }));
  return named.map((slug) => {
    const hits = items.filter((i) => i.slug === slug);
    if (hits.length > 1) {
      throw new Error(`${slug}: ${hits.map((i) => i.school).join(' and ')} both have a page by that name; pass --school=`);
    }
    if (!hits.length) throw new Error(`${slug}: not in the item index; pass --school=`);
    return { slug, school: hits[0].school };
  });
}

async function main() {
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  if (OPT.from == null || !OPT.to) throw new Error('--from= and --to= are both required');
  const pagesIn = await pagesToSend();
  if (!pagesIn.length) throw new Error('--slugs= or --all is required');
  let pages = 0;
  let revs = 0;
  const missing = [];
  for (const { slug, school } of pagesIn) {
    if (OPT.dryRun) { console.log(`would send ${school}/${slug}`); continue; }
    let out;
    try {
      out = await post('set-author', { slug, school, from: OPT.from, to: OPT.to });
    } catch (err) {
      // One page the server cannot find is reported, and the rest still go.
      if (err.status !== 404) throw err;
      missing.push(`${school}/${slug}`);
      continue;
    }
    if (out.revs.length) {
      pages += 1;
      revs += out.revs.length;
      console.log(`${school}/${slug}: rev ${out.revs.join(', ')}`);
    }
  }
  if (missing.length) console.log(`not found: ${missing.join(', ')}`);
  console.log(`${OPT.dryRun ? '[dry run] ' : ''}"${OPT.from}" -> "${OPT.to}": ${revs} revisions on ${pages} pages`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
