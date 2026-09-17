import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// The AWS clients, created on first use and replaceable. `setClients()` is how
// tools/discuss-dev-server.js runs this whole function against an in-memory table and a folder
// on disk, so every write path can be exercised on localhost before it touches an account.

const REGION = process.env.AWS_REGION || 'us-east-2';

const clients = { dynamo: null, s3: null, presign: null };

export function getDynamo() {
  if (!clients.dynamo) {
    clients.dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return clients.dynamo;
}

export function getS3() {
  if (!clients.s3) clients.s3 = new S3Client({ region: REGION });
  return clients.s3;
}

// `presign(command, expiresIn)` -> URL. Wrapped so the dev server can hand back a localhost URL.
export function presignPut(command, expiresIn) {
  if (clients.presign) return clients.presign(command, expiresIn);
  return getSignedUrl(getS3(), command, { expiresIn });
}

export function setClients(overrides) {
  Object.assign(clients, overrides);
}

export const CONFIG = {
  itemsTable: process.env.DISCUSS_ITEMS_TABLE || 'DiscussItems',
  syllabiTable: process.env.DISCUSS_SYLLABI_TABLE || 'DiscussSyllabi',
  jetLogsTable: process.env.JETLOGS_TABLE || 'JetLogs',
  bucket: process.env.DISCUSS_BUCKET || 'pinksheetmafia-discuss',
  // Where the browser reads the mirror. Overridable so a dev server can point at itself.
  mirrorUrl: process.env.DISCUSS_MIRROR_URL
    || `https://${process.env.DISCUSS_BUCKET || 'pinksheetmafia-discuss'}.s3.${REGION}.amazonaws.com`,
};
