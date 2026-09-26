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
//
// JetLogs: partition `logId` (S), sort `rev` (N), the same two-row shape as DiscussItems.
//   rev 0      { latestRev, title, flags: { group, folder, mode }, hidden?, updatedAt }
//   rev >= 1   { docJson, author, summary, createdAt, baseRev }
// The jet log's name is stored as `title` and its group, folder and mode inside `flags`,
// because `name`, `group` and `mode` are all DynamoDB reserved words. That leaves `hidden` as
// the only reserved word any expression here names, and it already has its alias.
//
// Briefs: partition `briefId` (S), sort `rev` (N), the same two-row shape.
//   rev 0      { latestRev, title, flags: { short, aircraft, school, order }, hidden?, updatedAt }

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

// Copies every row of an item to another key, preserving `rev`, `author`, `summary`, `baseRev`
// and `createdAt` — a page's history has to read the same under its new key as under its old
// one, and `restore` publishes an old document as a new revision, so the documents must come
// across too. This is what moves the corpus onto school-namespaced keys (see namespace.mjs).
//
// Its own query rather than `itemHistory`, whose projection drops `docJson`.
//
// The meta row is written last, so a run that dies half way leaves a destination with no meta
// row, which reads as absent and is simply redone. Refusing a destination that already has one
// is what makes the migration resumable and safe to run twice.
export async function copyItemRows(fromKey, toKey) {
  const meta = await itemMeta(fromKey);
  if (!meta) return null;
  if (await itemMeta(toKey)) return { copied: 0, already: true };

  let copied = 0;
  let lastKey;
  do {
    const result = await db().send(new QueryCommand({
      TableName: CONFIG.itemsTable,
      KeyConditionExpression: 'slug = :slug AND rev >= :one',
      ExpressionAttributeValues: { ':slug': fromKey, ':one': 1 },
      ExclusiveStartKey: lastKey,
    }));
    for (const row of (result.Items || [])) {
      await db().send(new PutCommand({
        TableName: CONFIG.itemsTable,
        Item: { ...row, slug: toKey },
      }));
      copied += 1;
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  await db().send(new PutCommand({ TableName: CONFIG.itemsTable, Item: { ...meta, slug: toKey } }));
  return { copied, already: false };
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

// Renames a syllabus on its newest row, in place: no revision, because the name is how the
// dropdown lists the document and not part of it. Older rows keep the name they were saved
// under, which is what History shows for them.
export async function setSyllabusName(id, name) {
  const newest = await newestSyllabus(id);
  if (!newest) throw new HttpError(404, 'No such syllabus');
  await db().send(new UpdateCommand({
    TableName: CONFIG.syllabiTable,
    Key: { syllabusId: id, rev: newest.rev },
    UpdateExpression: 'SET #n = :n',
    ExpressionAttributeNames: { '#n': 'name' },
    ExpressionAttributeValues: { ':n': name },
  }));
  return { ...newest, name };
}

// ---------------------------------------------------------------------------------------
// Jet logs and briefs
//
// Both are the Items shape with the partition key renamed: a meta row at rev 0 carrying the
// newest revision, a title and the flags the index draws, and one row per revision. The
// Items section above predates this and is written out by hand; the two corpora after it
// share one implementation rather than being a third and a fourth copy of it.

function revisionStore({ table, key, noun, titleOf, flagsOf }) {
  const tableName = () => CONFIG[table];

  async function meta(id) {
    const result = await db().send(new GetCommand({ TableName: tableName(), Key: { [key]: id, rev: 0 } }));
    return result.Item || null;
  }

  async function revision(id, rev) {
    const result = await db().send(new GetCommand({ TableName: tableName(), Key: { [key]: id, rev } }));
    return result.Item || null;
  }

  async function newest(id) {
    const m = await meta(id);
    if (!m || m.hidden) return null;
    const row = await revision(id, m.latestRev);
    return row ? { meta: m, row } : null;
  }

  function revisionRow(id, rev, doc, { author, summary, baseRev }) {
    return {
      [key]: id,
      rev,
      // Stringified exactly as it arrived. tools/jetlog-migrate.js --verify compares the
      // mirrored document against its source byte for byte, so nothing is normalised here.
      docJson: JSON.stringify(doc),
      author: author || '',
      summary: summary || '',
      baseRev: baseRev == null ? rev - 1 : baseRev,
      createdAt: new Date().toISOString(),
    };
  }

  async function create(id, doc, m) {
    const row = revisionRow(id, 1, doc, { ...m, baseRev: 0 });
    const metaRow = {
      [key]: id,
      rev: 0,
      latestRev: 1,
      title: titleOf(doc),
      flags: flagsOf(doc),
      updatedAt: row.createdAt,
    };
    const absent = `attribute_not_exists(${key})`;
    try {
      await db().send(new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: tableName(), Item: metaRow, ConditionExpression: absent } },
          { Put: { TableName: tableName(), Item: row, ConditionExpression: absent } },
        ],
      }));
    } catch (error) {
      if (isConflict(error)) throw new HttpError(409, 'That id is already taken');
      throw error;
    }
    return { meta: metaRow, row };
  }

  async function save(id, baseRev, doc, m) {
    const rev = baseRev + 1;
    const row = revisionRow(id, rev, doc, { ...m, baseRev });
    try {
      await db().send(new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName(),
              Item: row,
              ConditionExpression: `attribute_not_exists(${key})`,
            },
          },
          {
            Update: {
              TableName: tableName(),
              Key: { [key]: id, rev: 0 },
              UpdateExpression: 'SET latestRev = :rev, title = :title, flags = :flags, updatedAt = :at',
              ConditionExpression: 'latestRev = :base',
              ExpressionAttributeValues: {
                ':rev': rev,
                ':title': titleOf(doc),
                ':flags': flagsOf(doc),
                ':at': row.createdAt,
                ':base': baseRev,
              },
            },
          },
        ],
      }));
    } catch (error) {
      if (isConflict(error)) {
        const current = await meta(id);
        throw new HttpError(409, 'A newer revision exists', { rev: current ? current.latestRev : null });
      }
      throw error;
    }
    return { meta: await meta(id), row };
  }

  async function setHidden(id, hidden) {
    try {
      await db().send(new UpdateCommand({
        TableName: tableName(),
        Key: { [key]: id, rev: 0 },
        UpdateExpression: hidden ? 'SET #hidden = :h' : 'REMOVE #hidden',
        ConditionExpression: `attribute_exists(${key})`,
        ExpressionAttributeNames: { '#hidden': 'hidden' },
        ExpressionAttributeValues: hidden ? { ':h': true } : undefined,
      }));
    } catch (error) {
      if (isConflict(error)) throw new HttpError(404, `No such ${noun}`);
      throw error;
    }
  }

  // Newest first, without the documents.
  async function history(id) {
    const out = [];
    let lastKey;
    do {
      const result = await db().send(new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: `${key} = :id AND rev >= :one`,
        ExpressionAttributeValues: { ':id': id, ':one': 1 },
        ProjectionExpression: 'rev, author, summary, createdAt, baseRev',
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      }));
      out.push(...(result.Items || []));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return out;
  }

  async function listMetas() {
    const out = [];
    let lastKey;
    do {
      const result = await db().send(new ScanCommand({
        TableName: tableName(),
        FilterExpression: 'rev = :zero',
        ExpressionAttributeValues: { ':zero': 0 },
        ProjectionExpression: `${key}, latestRev, title, flags, #hidden, updatedAt`,
        ExpressionAttributeNames: { '#hidden': 'hidden' },
        ExclusiveStartKey: lastKey,
      }));
      out.push(...(result.Items || []));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return out.sort((a, b) => a[key].localeCompare(b[key]));
  }

  return { meta, revision, newest, create, save, setHidden, history, listMetas };
}

// What the index carries about a jet log besides its name: where it is filed, and whether it
// is a VFR or an IFR log, which is the chip the list draws.
export function jetLogFlagsOf(log) {
  const flags = {};
  if (log.group) flags.group = log.group;
  if (log.folder) flags.folder = log.folder;
  if (log.mode) flags.mode = log.mode;
  return flags;
}

const jetLogs = revisionStore({
  table: 'jetLogsTable', key: 'logId', noun: 'jet log', titleOf: (log) => log.name, flagsOf: jetLogFlagsOf,
});

export const jetLogMeta = jetLogs.meta;
export const jetLogRevision = jetLogs.revision;
export const newestJetLog = jetLogs.newest;
export const createJetLog = jetLogs.create;
export const saveJetLog = jetLogs.save;
export const setJetLogHidden = jetLogs.setHidden;
export const jetLogHistory = jetLogs.history;
export const listJetLogMetas = jetLogs.listMetas;

// What the brief buttons draw rides in the index: the short name on the button, the program,
// and the order the buttons come in.
export function briefFlagsOf(brief) {
  const flags = { aircraft: brief.aircraft, school: brief.school };
  if (brief.short) flags.short = brief.short;
  if (Number.isFinite(brief.order)) flags.order = brief.order;
  return flags;
}

const briefs = revisionStore({
  table: 'briefsTable', key: 'briefId', noun: 'brief', titleOf: (brief) => brief.title, flagsOf: briefFlagsOf,
});

export const briefMeta = briefs.meta;
export const briefRevision = briefs.revision;
export const newestBrief = briefs.newest;
export const createBrief = briefs.create;
export const saveBrief = briefs.save;
export const setBriefHidden = briefs.setHidden;
export const briefHistory = briefs.history;
export const listBriefMetas = briefs.listMetas;

// The NIFE Questions tab's section list: one document (listId 'nife'), revisioned like a jet
// log. See questionSections.mjs.
const questionSections = revisionStore({
  table: 'questionSectionsTable', key: 'listId', noun: 'section list',
  titleOf: (doc) => `${doc.school || 'NIFE'} sections`, flagsOf: () => ({}),
});

export const questionSectionsMeta = questionSections.meta;
export const questionSectionsRevision = questionSections.revision;
export const newestQuestionSections = questionSections.newest;
export const createQuestionSections = questionSections.create;
export const saveQuestionSections = questionSections.save;
export const questionSectionsHistory = questionSections.history;
