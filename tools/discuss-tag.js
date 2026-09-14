#!/usr/bin/env node
//
// Stamps an aircraft and a school on every discuss page and every syllabus on the server
// that has neither, through the admin `tag-program` operation, looping until nothing is left.
// One-time, for the corpus written before the two fields existed; a page or a syllabus made
// on the site since then names both at creation.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-tag.js --aircraft=T-6B --school=Primary
//
//   --api=<url>     the API base (default: the production API Gateway stage)
//   --overwrite     retag everything, whatever it carries now
//   --dry-run       count what would be tagged and write nothing
//
// Against the local dev server: --api=http://localhost:8787/discuss with DISCUSS_ADMIN_TOKEN=dev.

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const OPT = {
  api: value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss',
  aircraft: value('aircraft'),
  school: value('school'),
  overwrite: flag('overwrite'),
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
  if (!OPT.aircraft || !OPT.school) throw new Error('--aircraft= and --school= are both required');
  const body = { aircraft: OPT.aircraft, school: OPT.school, overwrite: OPT.overwrite, dryRun: OPT.dryRun };
  let items = 0;
  let syllabi = 0;
  for (;;) {
    const out = await post('tag-program', body);
    items += out.items;
    syllabi += out.syllabi;
    process.stdout.write(`\r  ${OPT.dryRun ? 'would tag' : 'tagged'} ${items} pages, ${syllabi} syllabi; ${out.remaining} to go   `);
    if (OPT.dryRun || !out.remaining) break;
  }
  console.log(`\n${OPT.dryRun ? '[dry run] ' : ''}${OPT.aircraft} ${OPT.school}: ${items} pages, ${syllabi} syllabi`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
