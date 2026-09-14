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
//   --mirror=<url>   where --all reads the page list (default: the production bucket)
//   --dry-run        list the pages that would be sent and send nothing
//
// Against the local dev server: --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror
// with DISCUSS_ADMIN_TOKEN=dev.

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const OPT = {
  api: value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss',
  mirror: value('mirror') || process.env.DISCUSS_MIRROR_URL || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com',
  from: value('from'),
  to: value('to'),
  slugs: value('slugs'),
  all: flag('all'),
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

async function post(op, body) {
  const res = await fetch(`${OPT.api}/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': OPT.token },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON body */ }
  if (!res.ok || data.success === false) throw new Error(`${op}: ${data.error || `HTTP ${res.status}`}`);
  return data;
}

async function main() {
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  if (OPT.from == null || !OPT.to) throw new Error('--from= and --to= are both required');
  let slugs = OPT.slugs ? OPT.slugs.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (OPT.all) {
    const res = await fetch(`${OPT.mirror}/items/index.json`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`items/index.json: HTTP ${res.status}`);
    slugs = (await res.json()).items.map((i) => i.slug);
  }
  if (!slugs.length) throw new Error('--slugs= or --all is required');
  let pages = 0;
  let revs = 0;
  for (const slug of slugs) {
    if (OPT.dryRun) { console.log(`would send ${slug}`); continue; }
    const out = await post('set-author', { slug, from: OPT.from, to: OPT.to });
    if (out.revs.length) {
      pages += 1;
      revs += out.revs.length;
      console.log(`${slug}: rev ${out.revs.join(', ')}`);
    }
  }
  console.log(`${OPT.dryRun ? '[dry run] ' : ''}"${OPT.from}" -> "${OPT.to}": ${revs} revisions on ${pages} pages`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
