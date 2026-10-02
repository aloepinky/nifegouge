#!/usr/bin/env node
//
// Renames a syllabus in the dropdown, through the admin `rename-syllabus` operation. The rename
// is added as a revision carrying the same document, so an editor who loaded the old name gets
// a 409 rather than putting it back. The syllabus's id, and with it every URL under
// /primary/discuss/s/, is unchanged.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-rename-syllabus.js --id=delta-primary --name="Delta Syllabus" --author=Loevinger
//
//   --author=<name>  the name the revision carries
//   --api=<url>      the API base (default: the production API Gateway stage)
//   --mirror=<url>   where the current name is read from (default: the bucket)
//   --dry-run        report what would be sent, and send nothing
//
// The school is not part of the name: the dropdown prints it after the name, so "Delta
// Syllabus" reads "Delta Syllabus Primary" there.
//
// Against the local dev server: --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror
// with DISCUSS_ADMIN_TOKEN=dev.

const { args, API_URL, MIRROR_URL, apiPost, readMirror: read } = require('./lib/cli');

const { flag, value } = args();

const OPT = {
  api: value('api') || API_URL,
  mirror: value('mirror') || MIRROR_URL,
  id: value('id'),
  name: value('name'),
  author: value('author') || '',
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

const readMirror = (key) => read(OPT.mirror, key);

const post = (op, body) => apiPost(OPT.api, op, body, OPT.token);

async function main() {
  if (!OPT.id) throw new Error('--id= is required');
  const name = (OPT.name || '').trim();
  if (!name) throw new Error('--name= is required');

  const { syllabi } = await readMirror('syllabi/index.json');
  const current = syllabi.find((s) => s.id === OPT.id);
  if (!current) throw new Error(`${OPT.id}: not in the syllabus list`);
  if (current.name === name) {
    console.log(`${OPT.id}: already named "${name}"`);
    return;
  }
  if (OPT.dryRun) {
    console.log(`would rename ${OPT.id}: "${current.name}" -> "${name}" (as rev ${current.rev + 1})`);
    return;
  }
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const out = await post('rename-syllabus', { id: OPT.id, name, author: OPT.author });
  console.log(`renamed ${OPT.id}: "${current.name}" -> "${out.name}" (rev ${out.rev})`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
