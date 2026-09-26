#!/usr/bin/env node
//
// Creates the NIFE Questions section list (revision 1) from tools/question-sections-seed.json:
// the six topics and their lectures as the quiz had them hardcoded before they became
// editable. Run once; the server refuses a second import with a 409, and every change after
// that is made on the site (/nife/questions/sections).
//
//   DISCUSS_ADMIN_TOKEN=... node tools/question-sections-import.mjs [--api=<base>] [--dry-run]
//
// --api defaults to production; point it at tools/discuss-dev-server.js with
// --api=http://localhost:8787/discuss.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const API = arg('api', 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss');
const here = path.dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(fs.readFileSync(path.join(here, 'question-sections-seed.json'), 'utf8'));

console.log(`${doc.sections.length} sections: ${doc.sections.map((s) => `${s.name} (${s.lectures.length})`).join(', ')}`);
if (process.argv.includes('--dry-run')) process.exit(0);

const token = process.env.DISCUSS_ADMIN_TOKEN;
if (!token) {
  console.error('Set DISCUSS_ADMIN_TOKEN.');
  process.exit(1);
}
const res = await fetch(`${API}/import-question-sections`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
  body: JSON.stringify({ doc }),
});
const out = await res.json();
console.log(res.status, JSON.stringify(out));
process.exit(res.ok ? 0 : 1);
