import {
  GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDynamo, CONFIG } from './clients.mjs';
import { HttpError } from './http.mjs';

// DynamoDB access for both tables. Nothing here knows about HTTP or S3.
//
// DiscussItems: partition `slug` (S), sort `rev` (N).
//   rev 0      the meta row: { latestRev, title, flags: { maneuver?, stub?, generated?,
//              aircraft, school }, hidden?, updatedAt }
//   rev >= 1   a revision: { docJson, author, summary, createdAt, baseRev }
// A save is one transaction — put the revision, bump the meta row — so a lost race can never
// leave a revision without its meta bump, and the meta row is the single answer to "which
// revision is current".
//
// DiscussSyllabi: partition `syllabusId` (S), sort `rev` (N), every revision a row, `hidden`
// on the newest row takes the syllabus down. Unchanged from lambda/discussSyllabi.

const db = () => getDynamo();

const isConflict = (error) => error && (
  error.name === 'ConditionalCheckFailedException'
  || error.name === 'TransactionCanceledException'
);

// ---------------------------------------------------------------------------------------
// Items

export async function itemMeta(slug) {
  const result = await db().send(new GetCommand({
    TableName: CONFIG.itemsTable,
    Key: { slug, rev: 0 },
  }));
  return result.Item || null;
}

export async function itemRevision(slug, rev) {
  const result = await db().send(new GetCommand({
    TableName: CONFIG.itemsTable,
    Key: { slug, rev },
  }));
  return result.Item || null;
}

// The newest revision row of a visible item, with its meta, or null.
export async function newestItem(slug) {
  const meta = await itemMeta(slug);
  if (!meta || meta.hidden) return null;
  const row = await itemRevision(slug, meta.latestRev);
  return row ? { meta, row } : null;
}

// What the index carries about a page besides its title: the three flags, and the aircraft
// and school it is for.
export function flagsOf(item) {
  const flags = {};
  if (item.maneuver) flags.maneuver = true;
  if (item.stub) flags.stub = true;
  if (item.generated) flags.generated = item.generated;
  if (item.aircraft) flags.aircraft = item.aircraft;
  if (item.school) flags.school = item.school;
  return flags;
}

function revisionRow(slug, rev, item, { author, summary, baseRev }) {
  return {
    slug,
    rev,
    docJson: JSON.stringify(item),
    author: author || '',
    summary: summary || '',
    baseRev: baseRev == null ? rev - 1 : baseRev,
    createdAt: new Date().toISOString(),
  };
}

// First revision of a new item: the meta row and revision 1, both conditional on the slug
// being unused. Returns the rows written.
export async function createItem(slug, item, meta) {
  const row = revisionRow(slug, 1, item, { ...meta, baseRev: 0 });
  const metaRow = {
    slug,
    rev: 0,
    latestRev: 1,
    title: item.title,
    flags: flagsOf(item),
    updatedAt: row.createdAt,
  };
  try {
    await db().send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: CONFIG.itemsTable,
            Item: metaRow,
            ConditionExpression: 'attribute_not_exists(slug)',
          },
        },
        {
          Put: {
            TableName: CONFIG.itemsTable,
            Item: row,
            ConditionExpression: 'attribute_not_exists(slug)',
          },
        },
      ],
    }));
  } catch (error) {
    if (isConflict(error)) throw new HttpError(409, 'That slug is already taken');
    throw error;
  }
  return { meta: metaRow, row };
}

// A new revision of an existing item, conditional on `baseRev` still being the newest.
export async function saveItem(slug, baseRev, item, meta) {
  const rev = baseRev + 1;
  const row = revisionRow(slug, rev, item, { ...meta, baseRev });
  const flags = flagsOf(item);
  try {
    await db().send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: CONFIG.itemsTable,
            Item: row,
            ConditionExpression: 'attribute_not_exists(slug)',
          },
        },
        {
          Update: {
            TableName: CONFIG.itemsTable,
            Key: { slug, rev: 0 },
            UpdateExpression: 'SET latestRev = :rev, title = :title, flags = :flags, updatedAt = :at',
            ConditionExpression: 'latestRev = :base',
            ExpressionAttributeValues: {
              ':rev': rev,
              ':title': item.title,
              ':flags': flags,
              ':at': row.createdAt,
              ':base': baseRev,
            },
          },
        },
      ],
    }));
  } catch (error) {
    if (isConflict(error)) {
      const current = await itemMeta(slug);
      throw new HttpError(409, 'A newer revision exists', { rev: current ? current.latestRev : null });
    }
    throw error;
  }
  const metaRow = await itemMeta(slug);
  return { meta: metaRow, row };
}

// Rewrites the display name on every revision of `slug` that carries `from`. Returns the
// revisions changed. The document rows are untouched; only who is shown beside them.
export async function setRevisionAuthor(slug, from, to) {
  const changed = [];
  for (const r of await itemHistory(slug)) {
    if ((r.author || '') !== from) continue;
    await db().send(new UpdateCommand({
      TableName: CONFIG.itemsTable,
      Key: { slug, rev: r.rev },
      UpdateExpression: 'SET author = :to',
      ConditionExpression: 'attribute_exists(slug)',
      ExpressionAttributeValues: { ':to': to },
    }));
    changed.push(r.rev);
  }
  return changed;
}

export async function setItemHidden(slug, hidden) {
  try {
    await db().send(new UpdateCommand({
      TableName: CONFIG.itemsTable,
      Key: { slug, rev: 0 },
      UpdateExpression: hidden ? 'SET #hidden = :h' : 'REMOVE #hidden',
      ConditionExpression: 'attribute_exists(slug)',
      ExpressionAttributeNames: { '#hidden': 'hidden' },
      ExpressionAttributeValues: hidden ? { ':h': true } : undefined,
    }));
  } catch (error) {
    if (isConflict(error)) throw new HttpError(404, 'No such item');
    throw error;
  }
}

// Newest first, without the documents.
export async function itemHistory(slug) {
  const out = [];
  let lastKey;
  do {
    const result = await db().send(new QueryCommand({
      TableName: CONFIG.itemsTable,
      KeyConditionExpression: 'slug = :slug AND rev >= :one',
      ExpressionAttributeValues: { ':slug': slug, ':one': 1 },
      ProjectionExpression: 'rev, author, summary, createdAt, baseRev',
      ScanIndexForward: false,
      ExclusiveStartKey: lastKey,
    }));
    out.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return out;
}

// Every meta row. The filter runs after the read, so this scans every revision row; trivial
// at this table's size, and the place to add a GSI if history ever grows into thousands.
export async function listItemMetas() {
  const out = [];
  let lastKey;
  do {
    const result = await db().send(new ScanCommand({
      TableName: CONFIG.itemsTable,
      FilterExpression: 'rev = :zero',
      ExpressionAttributeValues: { ':zero': 0 },
      ProjectionExpression: 'slug, latestRev, title, flags, #hidden, updatedAt',
      ExpressionAttributeNames: { '#hidden': 'hidden' },
      ExclusiveStartKey: lastKey,
    }));
    out.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------------------------------
// Syllabi

export async function newestSyllabus(id) {
  const result = await db().send(new QueryCommand({
    TableName: CONFIG.syllabiTable,
    KeyConditionExpression: 'syllabusId = :id',
    ExpressionAttributeValues: { ':id': id },
    ScanIndexForward: false,
    Limit: 1,
  }));
  return (result.Items || [])[0] || null;
}

export async function putSyllabus(id, rev, name, doc, { author, summary, baseRev } = {}) {
  const row = {
    syllabusId: id,
    rev,
    name,
    // Copied out of the document so the list scan can read them without the document.
    aircraft: doc.aircraft || '',
    school: doc.school || '',
    docJson: JSON.stringify(doc),
    author: author || '',
    summary: summary || '',
    baseRev: baseRev == null ? rev - 1 : baseRev,
    createdAt: new Date().toISOString(),
  };
  try {
    await db().send(new PutCommand({
      TableName: CONFIG.syllabiTable,
      Item: row,
      // Two saves racing from the same base revision: the second finds its row taken.
      ConditionExpression: 'attribute_not_exists(syllabusId)',
    }));
  } catch (error) {
    if (isConflict(error)) throw new HttpError(409, 'A newer revision exists');
    throw error;
  }
  return row;
}

// The newest row of every syllabus, hidden ones included; callers filter.
export async function listSyllabi() {
  const latest = new Map();
  let lastKey;
  do {
    const result = await db().send(new ScanCommand({
      TableName: CONFIG.syllabiTable,
      ProjectionExpression: 'syllabusId, rev, #n, createdAt, #hidden, aircraft, school',
      ExpressionAttributeNames: { '#n': 'name', '#hidden': 'hidden' },
      ExclusiveStartKey: lastKey,
    }));
    for (const row of result.Items || []) {
      const cur = latest.get(row.syllabusId);
      if (!cur || row.rev > cur.rev) latest.set(row.syllabusId, row);
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return [...latest.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function setSyllabusHidden(id, hidden) {
  const newest = await newestSyllabus(id);
  if (!newest) throw new HttpError(404, 'No such syllabus');
  await db().send(new UpdateCommand({
    TableName: CONFIG.syllabiTable,
    Key: { syllabusId: id, rev: newest.rev },
    UpdateExpression: hidden ? 'SET #hidden = :h' : 'REMOVE #hidden',
    ExpressionAttributeNames: { '#hidden': 'hidden' },
    ExpressionAttributeValues: hidden ? { ':h': true } : undefined,
  }));
  return { ...newest, hidden: hidden || undefined };
}
