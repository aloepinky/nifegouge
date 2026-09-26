#!/usr/bin/env node
//
// Reads and corrects the outdated votes on the Docs pages' documents and links. Anyone can vote
// an entry outdated from the page, still useful or obsolete, and the page stops listing it once
// the obsolete votes lead by 3 (REMOVE_AT in lambda/submitDoc/index.mjs). The row is never
// deleted, so this is how a removal nobody should have made is undone, and how an entry is marked
// outdated by hand.
//
//   node tools/docs-status.js --list                        every entry anyone has voted on
//   node tools/docs-status.js --list --find="course rules"  every entry whose title matches
//   node tools/docs-status.js --kind=link --id=link_... --useful=1 --note="Exam questions changed"
//   node tools/docs-status.js --kind=link --id=link_... --clear
//
//   --program=<p>   nife | tw4primary (default: both)
//   --useful=N / --obsolete=N   set that count exactly; either may be given alone
//   --note=<text>   the reason the page shows beside the badge
//   --clear         remove the votes and the note: the entry is current again
//   --dry-run       print what would be written, and write nothing
//
// Talks to DynamoDB directly with your local AWS credentials, the way the site cannot.

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const REMOVE_AT = 3;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const KINDS = {
  doc: { table: 'NIFEDocuments', key: 'docId', title: (r) => r.fileName, date: (r) => r.uploadedAt },
  link: { table: 'NIFELinks', key: 'linkId', title: (r) => r.title, date: (r) => r.submittedAt },
};

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

const scanAll = async (TableName) => {
  const items = [];
  let ExclusiveStartKey;
  do {
    const page = await db.send(new ScanCommand({ TableName, ExclusiveStartKey }));
    items.push(...(page.Items || []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
};

const stateOf = (r) => {
  const useful = r.outdatedUseful || 0;
  const obsolete = r.outdatedObsolete || 0;
  if (obsolete - useful >= REMOVE_AT) return 'REMOVED';
  if (!(useful > 0 || obsolete > 0)) return 'current';
  if (useful + obsolete >= 3) return 'OUTDATED';
  // Potentially Outdated drops off 45 days after the last vote (OUTDATED_FOR_DAYS in docs/Outdated.js).
  const age = Date.now() - new Date(r.outdatedAt || 0).getTime();
  return age < 45 * 24 * 60 * 60 * 1000 ? 'outdated' : 'expired';
};

async function list() {
  const program = value('program');
  const find = (value('find') || '').toLowerCase();
  for (const [kind, k] of Object.entries(KINDS)) {
    const rows = (await scanAll(k.table))
      .filter((r) => !program || (r.program || 'nife') === program)
      .filter((r) => (find ? (k.title(r) || '').toLowerCase().includes(find) : stateOf(r) !== 'current'))
      .sort((a, b) => (k.date(b) || '').localeCompare(k.date(a) || ''));
    console.log(`\n${kind}s (${rows.length})`);
    for (const r of rows) {
      console.log(`  ${stateOf(r).padEnd(8)} ${r[k.key]}  [${r.program || 'nife'}] ${k.title(r)}`);
      console.log(`           ${(k.date(r) || '').slice(0, 10)}  useful ${r.outdatedUseful || 0}, obsolete ${r.outdatedObsolete || 0}` +
        (r.outdatedAt ? `  last vote ${r.outdatedAt.slice(0, 10)}` : '') +
    (r.outdatedNote ? `  "${r.outdatedNote}"` : ''));
    }
  }
}

async function set() {
  const k = KINDS[value('kind')];
  const id = value('id');
  if (!k || !id) throw new Error('--kind=doc|link and --id=<id> are required');

  const params = { TableName: k.table, Key: { [k.key]: id }, ConditionExpression: `attribute_exists(${k.key})` };
  if (flag('clear')) {
    params.UpdateExpression = 'REMOVE outdatedUseful, outdatedObsolete, outdatedNote, outdatedAt';
  } else {
    const sets = [];
    const values = {};
    for (const [arg, attr] of [['useful', 'outdatedUseful'], ['obsolete', 'outdatedObsolete']]) {
      if (value(arg) === null) continue;
      const n = Number(value(arg));
      if (!Number.isInteger(n) || n < 0) throw new Error(`--${arg} must be a whole number`);
      sets.push(`${attr} = :${arg}`);
      values[`:${arg}`] = n;
    }
    if (value('note') !== null) {
      sets.push('outdatedNote = :note');
      values[':note'] = value('note').slice(0, 200);
    }
    // Setting counts is a vote as far as the badge is concerned: it runs 45 days from now.
    if (sets.length) {
      sets.push('outdatedAt = :at');
      values[':at'] = new Date().toISOString();
    }
    if (!sets.length) throw new Error('nothing to set: give --useful, --obsolete, --note or --clear');
    params.UpdateExpression = `SET ${sets.join(', ')}`;
    params.ExpressionAttributeValues = values;
  }

  if (flag('dry-run')) {
    console.log(JSON.stringify(params, null, 2));
    return;
  }
  const { Attributes: r } = await db.send(new UpdateCommand({ ...params, ReturnValues: 'ALL_NEW' }));
  console.log(`${stateOf(r)}  ${id}  ${k.title(r)}  useful ${r.outdatedUseful || 0}, obsolete ${r.outdatedObsolete || 0}` +
    (r.outdatedAt ? `  last vote ${r.outdatedAt.slice(0, 10)}` : '') +
    (r.outdatedNote ? `  "${r.outdatedNote}"` : ''));
}

(flag('list') ? list() : set()).catch((err) => {
  console.error(err.name === 'ConditionalCheckFailedException' ? 'No entry with that id.' : err.message);
  process.exit(1);
});
