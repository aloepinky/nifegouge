#!/usr/bin/env node
//
// Sets the score of named questions directly in the NIFEQuestions table (local AWS credentials),
// for a score set by hand: the site has no op for it. The write is conditional on the row's `ver`,
// like every write the Lambda makes, so it can't overwrite a vote that lands in between. The
// mirror is not rebuilt here: run the admin `rebuild-index` op for 'questions' afterwards.
//
//   node tools/questions-set-score.mjs --ids=ids.txt --score=4 --dry-run
//   node tools/questions-set-score.mjs --ids=ids.txt --score=4

import fs from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const DRY = process.argv.includes('--dry-run');
const score = Number(arg('score'));
if (!arg('ids') || !Number.isInteger(score)) {
  console.error('Pass --ids=<file of question ids, one per line> and --score=<whole number>.');
  process.exit(1);
}
const ids = fs.readFileSync(arg('ids'), 'utf8').split(/\s+/).filter(Boolean);
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const TableName = 'NIFEQuestions';
const [up, down] = score >= 0 ? [score, 0] : [0, -score];

for (const questionId of ids) {
  const row = (await db.send(new GetCommand({ TableName, Key: { questionId } }))).Item;
  if (!row) { console.log(`${questionId}  not found`); continue; }
  const was = (row.upvotes || 0) - (row.downvotes || 0);
  if (row.status !== 'approved') { console.log(`${questionId}  is ${row.status}, left alone`); continue; }
  if (DRY) { console.log(`${questionId}  ${was} -> ${score}  (rev ${row.rev || 1})`); continue; }
  await db.send(new UpdateCommand({
    TableName,
    Key: { questionId },
    UpdateExpression: 'SET upvotes = :u, downvotes = :d, ver = :next',
    ConditionExpression: 'ver = :ver',
    ExpressionAttributeValues: { ':u': up, ':d': down, ':ver': row.ver, ':next': (row.ver || 0) + 1 },
  }));
  console.log(`${questionId}  ${was} -> ${score}`);
}
