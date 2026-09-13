import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Generated Discuss syllabi: a JPPT uploaded and parsed in the browser, its course flow fixed
// by hand, published with no review step. The PDF never reaches this function, only the
// syllabus document built from it.
//
// Table DiscussSyllabi: partition key syllabusId (S), sort key rev (N). Every save writes a new
// revision rather than overwriting, so a bad edit is rolled back by deleting its row, and a
// syllabus is taken down by setting `hidden` on its newest row.
//
//   GET  /discuss/list-syllabi              -> { syllabi: [{ id, name, rev, updatedAt }] }
//   GET  /discuss/get-syllabus?id=          -> { syllabus: { id, name, rev, updatedAt, doc } }
//   POST /discuss/publish-syllabus          { name, doc }          -> { id, rev: 1 }
//   POST /discuss/save-syllabus             { id, baseRev, doc, name? } -> { id, rev }
//                                           409 if baseRev is not the newest revision

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

const TABLE = process.env.DISCUSS_SYLLABI_TABLE || 'DiscussSyllabi';
const MAX_DOC_BYTES = 350 * 1024; // under DynamoDB's 400 KB item limit, with room for the rest
const MAX_NAME = 80;

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const fail = (statusCode, error) => reply(statusCode, { success: false, error });

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const path = event.path || '';
    const method = event.httpMethod || '';

    try {
        if (path.includes('list-syllabi') && method === 'GET') return await listSyllabi();
        if (path.includes('get-syllabus') && method === 'GET') return await getSyllabus(event);
        if (path.includes('publish-syllabus') && method === 'POST') return await publishSyllabus(event);
        if (path.includes('save-syllabus') && method === 'POST') return await saveSyllabus(event);
        return fail(404, 'Endpoint not found');
    } catch (error) {
        console.error('Handler error:', error);
        return fail(500, 'Internal server error');
    }
};

function parseBody(event) {
    try {
        return typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
    } catch (e) {
        return null;
    }
}

function cleanName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

// Shape, not content: enough that the site can render what comes back.
function checkDoc(doc) {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return 'doc must be an object';
    const flow = doc.flow;
    if (!flow || !Array.isArray(flow.NODES) || !Array.isArray(flow.EDGES)) return 'doc.flow needs NODES and EDGES';
    if (typeof flow.VIEWBOX !== 'string') return 'doc.flow.VIEWBOX must be a string';
    for (const key of ['stages', 'blocks', 'events']) {
        if (!Array.isArray(doc[key])) return `doc.${key} must be an array`;
    }
    for (const n of flow.NODES) {
        if (!n || typeof n.id !== 'string' || !['x', 'y', 'w', 'h'].every((k) => Number.isFinite(n[k]))) {
            return 'every flow node needs an id and a numeric x, y, w and h';
        }
    }
    for (const b of doc.blocks) {
        if (!b || typeof b.id !== 'string' || !Array.isArray(b.events)) return 'every block needs an id and events';
    }
    const json = JSON.stringify(doc);
    if (Buffer.byteLength(json, 'utf8') > MAX_DOC_BYTES) return 'the syllabus is too large to store';
    return null;
}

function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'syllabus';
}

async function newest(id) {
    const result = await dynamodb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'syllabusId = :id',
        ExpressionAttributeValues: { ':id': id },
        ScanIndexForward: false,
        Limit: 1
    }));
    return (result.Items || [])[0] || null;
}

async function listSyllabi() {
    const latest = new Map();
    let lastKey;
    do {
        const result = await dynamodb.send(new ScanCommand({
            TableName: TABLE,
            ProjectionExpression: 'syllabusId, rev, #n, createdAt, hidden',
            ExpressionAttributeNames: { '#n': 'name' },
            ExclusiveStartKey: lastKey
        }));
        for (const item of result.Items || []) {
            const cur = latest.get(item.syllabusId);
            if (!cur || item.rev > cur.rev) latest.set(item.syllabusId, item);
        }
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    const syllabi = [...latest.values()]
        .filter((item) => !item.hidden)
        .map((item) => ({ id: item.syllabusId, name: item.name, rev: item.rev, updatedAt: item.createdAt }))
        .sort((a, b) => a.name.localeCompare(b.name));
    return reply(200, { success: true, syllabi });
}

async function getSyllabus(event) {
    const id = (event.queryStringParameters || {}).id;
    if (!id) return fail(400, 'id is required');
    const item = await newest(id);
    if (!item || item.hidden) return fail(404, 'No such syllabus');
    return reply(200, {
        success: true,
        syllabus: {
            id: item.syllabusId,
            name: item.name,
            rev: item.rev,
            updatedAt: item.createdAt,
            doc: JSON.parse(item.docJson)
        }
    });
}

async function put(id, rev, name, doc) {
    await dynamodb.send(new PutCommand({
        TableName: TABLE,
        Item: {
            syllabusId: id,
            rev,
            name,
            docJson: JSON.stringify(doc),
            createdAt: new Date().toISOString()
        },
        // Two saves racing from the same base revision: the second finds its row taken.
        ConditionExpression: 'attribute_not_exists(syllabusId)'
    }));
}

async function publishSyllabus(event) {
    const body = parseBody(event);
    if (!body) return fail(400, 'Body must be JSON');
    const name = cleanName(body.name);
    if (!name) return fail(400, 'A name is required');
    const problem = checkDoc(body.doc);
    if (problem) return fail(400, problem);

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const suffix = Math.random().toString(16).slice(2, 6);
        const id = `${slugify(name)}-${suffix}`;
        try {
            await put(id, 1, name, body.doc);
            return reply(200, { success: true, id, rev: 1 });
        } catch (error) {
            if (error.name !== 'ConditionalCheckFailedException') throw error;
        }
    }
    return fail(500, 'Could not allocate an id; try again');
}

async function saveSyllabus(event) {
    const body = parseBody(event);
    if (!body) return fail(400, 'Body must be JSON');
    const { id, baseRev } = body;
    if (typeof id !== 'string' || !Number.isInteger(baseRev)) return fail(400, 'id and baseRev are required');
    const problem = checkDoc(body.doc);
    if (problem) return fail(400, problem);

    const current = await newest(id);
    if (!current || current.hidden) return fail(404, 'No such syllabus');
    if (current.rev !== baseRev) {
        return reply(409, { success: false, error: 'A newer revision exists', rev: current.rev });
    }
    const name = cleanName(body.name) || current.name;
    try {
        await put(id, baseRev + 1, name, body.doc);
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return reply(409, { success: false, error: 'A newer revision exists' });
        }
        throw error;
    }
    return reply(200, { success: true, id, rev: baseRev + 1 });
}
