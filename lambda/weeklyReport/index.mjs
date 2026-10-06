import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { buildReport } from './report.mjs';

// Emails the weekly community-activity report (report.mjs). Run by an EventBridge Scheduler
// schedule every Sunday at 1800 Central; see README.md for the resources it needs.
//
// The vote totals from the last run are kept in a private bucket, not the public mirror bucket,
// so the next report can show the votes cast since. The totals are saved only after the email
// has gone, so a failed send is reported again, votes and all, by the next run.
//
// The AWS SDK comes with the Node.js runtime, as it does for discussApi, so there is no
// package.json or node_modules to ship.

const REGION = process.env.AWS_REGION || 'us-east-2';
const TO = process.env.REPORT_TO;
const FROM = process.env.REPORT_FROM || TO;
const BUCKET = process.env.REPORT_BUCKET || 'pinksheetmafia-reports';
const SNAPSHOT_KEY = 'weekly/votes.json';
const OWN = (process.env.REPORT_OWN || 'Loevinger,migration').split(',');

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });
const ses = new SESv2Client({ region: REGION });

async function readSnapshot() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: SNAPSHOT_KEY }));
    return JSON.parse(await res.Body.transformToString());
  } catch (error) {
    if (error.name === 'NoSuchKey') return null;
    throw error;
  }
}

// An invocation may pass { days, dryRun }: dryRun builds the report and returns it without
// sending or saving, which is how to look at it from the console.
export const handler = async (event = {}) => {
  if (!TO) throw new Error('REPORT_TO is not set');
  const until = new Date();
  const previous = await readSnapshot();
  // Pick up where the last sent report ended, unless that was over five weeks ago (a broken
  // schedule fixed late) or the invocation asks for a number of days.
  const since = !event.days && previous?.at && until - new Date(previous.at) < 35 * 864e5 ? previous.at : null;
  const report = await buildReport({ db, days: Number(event.days) || 7, since, until, own: OWN, previous });
  if (event.dryRun) return { subject: report.subject, text: report.text };

  await ses.send(new SendEmailCommand({
    FromEmailAddress: FROM,
    Destination: { ToAddresses: [TO] },
    Content: {
      Simple: {
        Subject: { Data: report.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: report.text, Charset: 'UTF-8' },
          Html: { Data: report.html, Charset: 'UTF-8' },
        },
      },
    },
  }));
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: SNAPSHOT_KEY,
    Body: JSON.stringify({ at: until.toISOString(), counts: report.counts, totals: report.totals }),
    ContentType: 'application/json',
  }));
  return { sent: report.subject };
};
