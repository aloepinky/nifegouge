#!/usr/bin/env node
//
// Prints the weekly community-activity report that the weeklyReport Lambda emails every Sunday
// (lambda/weeklyReport/report.mjs), and writes it as the HTML the email carries.
//
//   node tools/weekly-report.mjs                  the last 7 days
//   node tools/weekly-report.mjs --days=14
//   node tools/weekly-report.mjs --html=report.html
//   node tools/weekly-report.mjs --no-snapshot    leave the vote snapshot as it was
//   node tools/weekly-report.mjs --own=Loevinger,migration   whose activity is counted, not listed
//
// Votes are reported as the increase since the last run's totals. This keeps its own totals in
// _weekly-report/votes.json (gitignored), apart from the Lambda's, so running it locally never
// changes what the email says.
//
// Read-only against AWS. Talks to DynamoDB with your local AWS credentials.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport } from '../lambda/weeklyReport/report.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const until = new Date();
const STATE_DIR = join(ROOT, '_weekly-report');
const SNAPSHOT = join(STATE_DIR, 'votes.json');
const HTML_OUT = value('html', join(STATE_DIR, `report-${until.toISOString().slice(0, 10)}.html`));

let previous = null;
try { previous = JSON.parse(readFileSync(SNAPSHOT, 'utf8')); } catch { /* first run */ }

const report = await buildReport({
  db: DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' })),
  days: Number(value('days', 7)),
  until,
  own: value('own', 'Loevinger,migration').split(','),
  previous,
});

console.log(report.text);

mkdirSync(dirname(HTML_OUT), { recursive: true });
writeFileSync(HTML_OUT, report.html, 'utf8');
console.log(`HTML: ${HTML_OUT}`);

if (!flag('no-snapshot')) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify({ at: until.toISOString(), counts: report.counts }), 'utf8');
  console.log(`Vote totals saved for the next local run${previous ? ` (last saved ${new Date(previous.at).toDateString()})` : ''}.`);
}
