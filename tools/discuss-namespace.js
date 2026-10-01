#!/usr/bin/env node
//
// Moves the discuss corpus onto school-namespaced keys, through the admin `namespace-items`
// operation, looping until nothing is left. One-time.
//
// A page used to be identified by its slug alone, which was enough while the site covered one
// school. It is not enough now: NIFE and Primary both brief a turn pattern, a CRM item and a
// power-off stall, and those are different pages about different aircraft. The stored key
// becomes `<school>/<slug>` — see lambda/discussApi/namespace.mjs.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-namespace.js --dry-run
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-namespace.js
//
//   --api=<url>     the API base (default: the production API Gateway stage)
//   --batch=N       pages per request (default 40; one request must fit the Lambda timeout)
//   --dry-run       report what would move and write nothing
//
// Against the local dev server: --api=http://localhost:8787/discuss with DISCUSS_ADMIN_TOKEN=dev.
//
// Nothing is deleted and nothing is overwritten. Each page is copied to its new key with every
// revision intact and the old rows stay where they are, so the site keeps reading them until
// the client cuts over — which is what makes this reversible. Running it twice is a no-op.
//
// Done (2026-09). The order was: deploy the Lambda with the legacy bare-address mirror on →
// run this → verify → deploy the client → turn the legacy mirror off. The Lambda no longer
// has that mirror, so this is a record of the migration rather than a step to repeat.

const { args, API_URL, apiPost } = require('./lib/cli');

const { flag, value } = args();

const OPT = {
  api: value('api') || API_URL,
  batch: Math.max(1, Math.min(200, Number(value('batch')) || 40)),
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

const post = (op, body) => apiPost(OPT.api, op, body, OPT.token);

async function main() {
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const body = { limit: OPT.batch, dryRun: OPT.dryRun };

  let moved = 0;
  let skipped = 0;
  let untagged = [];
  const examples = [];
  for (;;) {
    const out = await post('namespace-items', body);
    moved += out.moved;
    skipped += out.skipped;
    untagged = out.untagged || [];
    for (const e of (out.examples || [])) if (examples.length < 10) examples.push(e);
    process.stdout.write(`\r  ${OPT.dryRun ? 'would move' : 'moved'} ${moved}; ${out.remaining} to go   `);
    if (OPT.dryRun || !out.remaining) break;
  }

  console.log(`\n${OPT.dryRun ? '[dry run] ' : ''}${moved} pages moved, ${skipped} skipped`);
  for (const e of examples) console.log(`    ${e}`);

  // A page with no school cannot be placed, and is left alone rather than guessed at. There
  // should be none: the server has required the field since tag-program ran.
  if (untagged.length) {
    console.log(`\n  ${untagged.length} page(s) carry no school and were not moved:`);
    for (const slug of untagged) console.log(`    ${slug}`);
    console.log('  Tag them with tools/discuss-tag.js, then run this again.');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
