#!/usr/bin/env node
//
// Takes a page off the site, through the admin `hide-item` operation: the page leaves the item
// index and the mirror, so nothing links to it and the search box no longer lists it. Nothing is
// deleted — the revisions stay in the table and `--show` puts the page back — which is the point
// of hiding rather than dropping a row.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-hide.js --slugs=tower-visit,exams
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-hide.js --slugs=tower-visit --show
//
//   --api=<url>      the API base (default: the production API Gateway stage)
//   --mirror=<url>   where the check for inbound links reads the corpus (default: the bucket)
//   --show           unhide instead of hide
//   --dry-run        report what would be sent, and send nothing
//
// A hidden page that another page still links to leaves a dead link, and an event row still
// pointing at it renders as "missing" rather than "no page yet". Both are reported before
// anything is sent, and both are yours to fix first — the event row wants the "needs no page"
// kind, the inbound link wants removing from the other page's See also or hatnote.
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
  slugs: value('slugs'),
  show: flag('show'),
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

const readMirror = async (key) => {
  const res = await fetch(`${OPT.mirror}/${key}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  return res.json();
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

// Every page that links to `slug`, and every syllabus event row still pointing at it. Read from
// the mirror rather than the table, because the mirror is what the site reads.
async function inbound(slugs) {
  const index = await readMirror('items/index.json');
  const pages = {};
  const rows = {};
  slugs.forEach((s) => { pages[s] = []; rows[s] = []; });
  for (const entry of index.items) {
    if (slugs.includes(entry.slug)) continue;
    const { item } = await readMirror(`items/${entry.slug}.json`);
    const text = JSON.stringify(item);
    slugs.forEach((s) => { if (text.includes(`"${s}"`)) pages[s].push(entry.slug); });
  }
  const { syllabi } = await readMirror('syllabi/index.json');
  for (const s of syllabi) {
    const { doc } = await readMirror(`syllabi/${s.id}.json`);
    (doc.events || []).forEach((e) => (e.items || []).forEach((r) => {
      if (slugs.includes(r.slug)) rows[r.slug].push(`${s.id} ${e.id}`);
    }));
  }
  return { pages, rows };
}

async function main() {
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const slugs = (OPT.slugs || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) throw new Error('--slugs= is required');

  if (!OPT.show) {
    const { pages, rows } = await inbound(slugs);
    slugs.forEach((s) => {
      if (pages[s].length) console.log(`${s}: still linked from ${pages[s].join(', ')}`);
      if (rows[s].length) console.log(`${s}: still listed by ${rows[s].join(', ')}`);
    });
  }

  for (const slug of slugs) {
    if (OPT.dryRun) { console.log(`would ${OPT.show ? 'show' : 'hide'} ${slug}`); continue; }
    await post('hide-item', { slug, hidden: !OPT.show });
    console.log(`${OPT.show ? 'shown' : 'hidden'}: ${slug}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
