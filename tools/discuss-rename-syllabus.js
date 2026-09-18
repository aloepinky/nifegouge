#!/usr/bin/env node
//
// Renames a syllabus in the dropdown, through the admin `rename-syllabus` operation. The name
// is changed on the newest revision in place, so no revision is added and the syllabus's id,
// and with it every URL under /tw4/discuss/s/, is unchanged.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/discuss-rename-syllabus.js --id=delta-primary --name="Delta Syllabus"
//
//   --api=<url>      the API base (default: the production API Gateway stage)
//   --mirror=<url>   where the current name is read from (default: the bucket)
//   --dry-run        report what would be sent, and send nothing
//
// The school is not part of the name: the dropdown prints it after the name, so "Delta
// Syllabus" reads "Delta Syllabus Primary" there.
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
  id: value('id'),
  name: value('name'),
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
    console.log(`would rename ${OPT.id}: "${current.name}" -> "${name}" (rev ${current.rev} stays)`);
    return;
  }
  if (!OPT.token) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const out = await post('rename-syllabus', { id: OPT.id, name });
  console.log(`renamed ${OPT.id}: "${current.name}" -> "${out.name}" (rev ${out.rev})`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
