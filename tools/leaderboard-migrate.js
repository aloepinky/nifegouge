#!/usr/bin/env node
//
// Carries the two old EPs/Limits leaderboards onto the shared one (lambda/discussApi/scores.mjs,
// table EPsLimitsScores), through the admin `import-scores` operation. Each run keeps the date
// it was set, so a recent time still counts on the Monthly and Yearly boards.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/leaderboard-migrate.js --dry-run
//   DISCUSS_ADMIN_TOKEN=... node tools/leaderboard-migrate.js
//
// The old tables are read with the SDK, on whatever credentials it finds — `aws login`, a
// profile in ~/.aws, or the environment. Not the AWS CLI: on Windows it prints through a cp1252
// stdout and dies partway with "'charmap' codec can't encode characters" on a row holding
// anything outside that encoding, and one TW4Users class does. Exported files still work, and
// are the way in from a machine with no credentials at all (run these where the CLI is happy,
// such as CloudShell):
//
//   aws dynamodb scan --table-name FlightTestLeaderboard --output json > nife.json
//   aws dynamodb scan --table-name TW4TimeLeaderboard    --output json > tw4.json
//   aws dynamodb scan --table-name TW4Users              --output json > tw4-users.json
//   node tools/leaderboard-migrate.js --nife=nife.json --tw4=tw4.json --tw4-users=tw4-users.json
//
//   --api=<url>    the API base (default: the production API Gateway stage)
//   --region=<r>   where the old tables live (default: us-east-2)
//   --dry-run      print what would be imported, and send nothing
//
// What maps to what:
//   FlightTestLeaderboard  testType EPs | Limits | EPs_and_Limits   -> NIFE, same mode; every field
//   TW4TimeLeaderboard     testType TW4_EPs | TW4_Limits | TW4_EPs_and_Limits -> Primary; the
//                          username is the name, and branch and class come from TW4Users
// The Primary accounts' passwords and the Completions table are not carried over. The import is
// idempotent: a run already imported is skipped, so this can be rerun after a failure.

const fs = require('node:fs');
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const OPT = {
  api: value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss',
  nife: value('nife'),
  tw4: value('tw4'),
  tw4Users: value('tw4-users'),
  region: value('region') || process.env.AWS_REGION || 'us-east-2',
  dryRun: flag('dry-run'),
  token: process.env.DISCUSS_ADMIN_TOKEN || value('token'),
};

// DynamoDB's wire format ({ S: 'x' }, { N: '1' }) to plain values.
function plain(attr) {
  if (!attr || typeof attr !== 'object') return attr;
  if ('S' in attr) return attr.S;
  if ('N' in attr) return Number(attr.N);
  if ('BOOL' in attr) return attr.BOOL;
  if ('NULL' in attr) return null;
  if ('M' in attr) return Object.fromEntries(Object.entries(attr.M).map(([k, v]) => [k, plain(v)]));
  if ('L' in attr) return attr.L.map(plain);
  return attr;
}

const unwrap = (item) => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, plain(v)]));

let client;
const dynamo = () => {
  if (!client) client = new DynamoDBClient({ region: OPT.region });
  return client;
};

// A whole table, from a file exported earlier or from DynamoDB itself. The boards are small,
// but a scan still pages, and a half-read table would quietly import half a board.
async function scan(table, file) {
  if (file) return (JSON.parse(fs.readFileSync(file, 'utf8')).Items || []).map(unwrap);
  const items = [];
  let start;
  do {
    const out = await dynamo().send(new ScanCommand({ TableName: table, ExclusiveStartKey: start }));
    items.push(...(out.Items || []));
    start = out.LastEvaluatedKey;
  } while (start);
  return items.map(unwrap);
}

const nameOf = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'ANON';

async function nifeRuns() {
  return (await scan('FlightTestLeaderboard', OPT.nife)).map((r) => ({
    school: 'NIFE',
    mode: r.testType,
    elapsedTime: r.elapsedTime,
    epsTime: r.epsTime || undefined,
    limitsTime: r.limitsTime || undefined,
    playerName: nameOf(r.playerName),
    country: r.country,
    branch: r.branch,
    designator: r.designator,
    trainingClass: r.nifeClass,
    createdAt: r.timestamp,
  }));
}

async function tw4Runs() {
  const users = new Map((await scan('TW4Users', OPT.tw4Users)).map((u) => [u.username, u]));
  return (await scan('TW4TimeLeaderboard', OPT.tw4)).map((r) => {
    const u = users.get(r.username) || {};
    return {
      school: 'Primary',
      mode: String(r.testType).replace(/^TW4_/, ''),
      elapsedTime: r.elapsedTime,
      epsTime: r.epsTime || undefined,
      limitsTime: r.limitsTime || undefined,
      playerName: nameOf(r.username),
      branch: u.branch || '',
      trainingClass: u.trainingClass && u.trainingClass !== 'POOL' ? u.trainingClass : '',
      createdAt: r.timestamp,
    };
  });
}

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
  const runs = [...await nifeRuns(), ...await tw4Runs()];
  const byBoard = {};
  for (const r of runs) byBoard[`${r.school}#${r.mode}`] = (byBoard[`${r.school}#${r.mode}`] || 0) + 1;
  console.log(`${runs.length} runs:`, byBoard);
  const undated = runs.filter((r) => !r.createdAt);
  if (undated.length) console.log(`${undated.length} runs carry no date and will be refused.`);

  if (OPT.dryRun) {
    for (const r of runs.slice(0, 10)) console.log(' ', JSON.stringify(r));
    if (runs.length > 10) console.log(`  … and ${runs.length - 10} more`);
    return;
  }
  if (!OPT.token) throw new Error('Set DISCUSS_ADMIN_TOKEN');

  let imported = 0;
  let skipped = 0;
  for (let i = 0; i < runs.length; i += 200) {
    const out = await post('import-scores', { runs: runs.slice(i, i + 200) });
    imported += out.imported;
    skipped += out.skipped;
    for (const r of out.refused || []) console.log(`  refused: ${JSON.stringify(runs[i + r.index])} — ${r.error}`);
  }
  console.log(`Imported ${imported}, already there ${skipped}.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
