import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const s3Client = new S3Client({ region: 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'nife-gouge-docs';

// An entry anyone has called outdated carries two counts: outdated but still useful, and
// obsolete. A still-useful vote cancels an obsolete one, and the entry drops off the page once
// the obsolete votes lead by REMOVE_AT. The row is kept, so tools/docs-status.js can undo it.
// outdatedAt is when the last outdated vote was cast; the page stops badging an entry 45 days
// after it (OUTDATED_FOR_DAYS in src/components/docs/Outdated.js).
const REMOVE_AT = 3;
const OUTDATED_CHOICES = ['useful', 'obsolete'];
const OUTDATED_NOTE_MAX = 200;

const isRemoved = (item) =>
    Math.max(0, item.outdatedObsolete || 0) - Math.max(0, item.outdatedUseful || 0) >= REMOVE_AT;

// Scan every page: a single Scan stops at 1 MB and would silently drop the rest.
async function scanAll(params) {
    const items = [];
    let ExclusiveStartKey;
    do {
        const result = await dynamodb.send(new ScanCommand({ ...params, ExclusiveStartKey }));
        items.push(...(result.Items || []));
        ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
}

// A school's rows. Rows from before the program attribute existed are NIFE's.
function programScan(TableName, program) {
    return program === 'nife'
        ? {
            TableName,
            FilterExpression: 'program = :prog OR attribute_not_exists(program)',
            ExpressionAttributeValues: { ':prog': 'nife' }
        }
        : { TableName, FilterExpression: 'program = :prog', ExpressionAttributeValues: { ':prog': program } };
}

// Two links are the same when they differ only in the parts a share button adds: the fragment,
// share and tracking parameters (Quizlet's ?i=&x=, Google's ?usp= and ?tab=), a leading www.,
// a trailing slash, or Google's /edit or /view. src/components/docs/linkKey.js is the same
// function; change both together.
const SHARE_PARAMS = /^(i|x|usp|tab|funnelUUID|fbclid|gclid|utm_\w+)$/i;

function linkKey(href) {
    let url;
    try {
        url = new URL(href);
    } catch {
        return String(href).trim().toLowerCase();
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let path = url.pathname.replace(/\/+$/, '');
    if (/(^|\.)google\.com$/.test(host)) path = path.replace(/\/(edit|view|preview)$/, '');
    const params = [...url.searchParams]
        .filter(([name]) => !SHARE_PARAMS.test(name))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}=${value}`)
        .join('&');
    return `${host}${path}${params ? `?${params}` : ''}`;
}

// A POST body, as lambda/discussApi/http.mjs reads one: none is an empty object, and one that is
// not JSON is the browser's mistake (a 400), not ours.
class BadBody extends Error {}

function parseBody(event) {
    if (event.body == null) return {};
    if (typeof event.body !== 'string') return event.body;
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    try {
        return JSON.parse(raw) ?? {};
    } catch {
        throw new BadBody();
    }
}

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    const path = event.path || '';
    const method = event.httpMethod || '';
    
    try {
        // Get presigned URL for upload
        if (path.includes('get-upload-url') && method === 'POST') {
            return await handleGetUploadUrl(parseBody(event), headers);
        }
        
        // Confirm successful upload
        if (path.includes('confirm-upload') && method === 'POST') {
            return await handleConfirmUpload(parseBody(event), headers);
        }
        
        // Get all documents
        if (path.includes('get-documents') && method === 'GET') {
            return await handleGetDocuments(event, headers);
        }
        
        // Get signed URL for viewing
        if (path.includes('get-document-url') && method === 'POST') {
            return await handleGetDocumentUrl(parseBody(event), headers);
        }
        
        // Submit link
        if (path.includes('submit-link') && method === 'POST') {
            return await handleLinkSubmission(parseBody(event), headers);
        }
        
        // Get links
        if (path.includes('get-links') && method === 'GET') {
            return await handleGetLinks(event, headers);
        }
        
        // Vote on document
        if (path.includes('vote-document') && method === 'POST') {
            return await handleVote('NIFEDocuments', 'docId', parseBody(event), headers);
        }
        
        // Vote on link
        if (path.includes('vote-link') && method === 'POST') {
            return await handleVote('NIFELinks', 'linkId', parseBody(event), headers);
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };
    } catch (error) {
        if (error instanceof BadBody) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Body must be JSON' })
            };
        }
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error'
            })
        };
    }
};

// Get presigned URL for direct S3 upload (doesn't save to DB yet)
async function handleGetUploadUrl(body, headers) {
    try {
        if (!body.fileName || !body.topic) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }
        
        // Generate unique key
        const program = body.program || 'nife';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const sanitizedFileName = body.fileName.replace(/[^a-z0-9.-]/gi, '_');
        const s3Key = `${program}/${body.topic}/${timestamp}-${randomId}-${sanitizedFileName}`;

        // Generate presigned URL for upload
        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            ContentType: body.mimeType || 'application/octet-stream',
            Metadata: {
                originalName: body.fileName,
                topic: body.topic,
                program: program,
                uploadedBy: body.uploadedBy || 'anonymous'
            }
        });
        
        const uploadUrl = await getSignedUrl(s3Client, putCommand, { 
            expiresIn: 3600 // URL expires in 1 hour
        });
        
        // Generate docId but DON'T save to DB yet
        const docId = `doc_${timestamp}_${randomId}`;
        
        // Return the upload URL and metadata - client will confirm after successful upload
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                uploadUrl: uploadUrl,
                docId: docId,
                s3Key: s3Key,
                // Send back metadata for confirmation step
                metadata: {
                    fileName: body.fileName,
                    topic: body.topic,
                    fileSize: body.fileSize || 0,
                    mimeType: body.mimeType || 'application/octet-stream',
                    program: program
                }
            })
        };
        
    } catch (error) {
        console.error('Error getting upload URL:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to get upload URL'
            })
        };
    }
}

// New function to confirm upload and save to DB
async function handleConfirmUpload(body, headers) {
    try {
        if (!body.docId || !body.s3Key || !body.metadata) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Missing upload confirmation data'
                })
            };
        }
        
        // Only what get-upload-url handed out: a fresh doc_<time>_<random> id, and a key under
        // the document's own school.
        const program = body.metadata.program || 'nife';
        if (typeof body.docId !== 'string' || !/^doc_\d+_[a-z0-9]+$/.test(body.docId)
            || typeof body.s3Key !== 'string' || !body.s3Key.startsWith(`${program}/`)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Invalid upload confirmation' })
            };
        }

        // Save metadata to DynamoDB only after confirmed S3 upload
        const docMetadata = {
            docId: body.docId,
            fileName: body.metadata.fileName,
            topic: body.metadata.topic,
            program,
            s3Key: body.s3Key,
            fileSize: body.metadata.fileSize,
            mimeType: body.metadata.mimeType,
            uploadedAt: new Date().toISOString(),
            uploadedBy: body.metadata.uploadedBy || 'anonymous',
            upvotes: 0,
            downvotes: 0
        };
        
        // A docId is confirmed once. A second confirm, replayed or crafted, would otherwise
        // replace the row and wipe its votes.
        try {
            await dynamodb.send(new PutCommand({
                TableName: 'NIFEDocuments',
                Item: docMetadata,
                ConditionExpression: 'attribute_not_exists(docId)'
            }));
        } catch (error) {
            if (error.name !== 'ConditionalCheckFailedException') throw error;
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ success: false, error: 'That upload is already confirmed' })
            };
        }
        
        console.log('Upload confirmed and saved to DB:', body.docId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Upload confirmed',
                docId: body.docId
            })
        };
        
    } catch (error) {
        console.error('Error confirming upload:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to confirm upload'
            })
        };
    }
}

async function handleGetDocuments(event, headers) {
    try {
        const program = event.queryStringParameters?.program || 'nife';

        const documents = (await scanAll(programScan('NIFEDocuments', program))).filter(item => !isRemoved(item));

        // Sort by upload date (newest first)
        documents.sort((a, b) => 
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
        
        console.log(`Found ${documents.length} documents`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                documents: documents
            })
        };
        
    } catch (error) {
        console.error('Error fetching documents:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to fetch documents'
            })
        };
    }
}

async function handleGetDocumentUrl(body, headers) {
    try {
        if (!body.docId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Missing document ID'
                })
            };
        }
        
        console.log('Getting document URL for:', body.docId);
        
        // Get document metadata from DynamoDB
        const getCommand = new GetCommand({
            TableName: 'NIFEDocuments',
            Key: { docId: body.docId }
        });
        
        const result = await dynamodb.send(getCommand);
        console.log('DynamoDB result:', result.Item);
        
        if (!result.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Document not found'
                })
            };
        }
        
        // Check if s3Key exists
        if (!result.Item.s3Key) {
            console.error('Document missing s3Key:', result.Item);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Document missing S3 reference'
                })
            };
        }
        
        // Generate presigned URL for viewing/downloading
        const getObjectCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: result.Item.s3Key
        });
        
        const url = await getSignedUrl(s3Client, getObjectCommand, { 
            expiresIn: 3600 // URL expires in 1 hour
        });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                url: url,
                fileName: result.Item.fileName,
                mimeType: result.Item.mimeType
            })
        };
        
    } catch (error) {
        console.error('Error getting document URL:', error);
        console.error('Error details:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to get document URL'
            })
        };
    }
}

async function handleLinkSubmission(body, headers) {
    try {
        if (!body.url || !body.title || !body.topic) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }

        const refuse = (statusCode, error, extra = {}) => ({
            statusCode,
            headers,
            body: JSON.stringify({ success: false, error, ...extra })
        });

        let url;
        try {
            url = new URL(body.url);
        } catch {
            return refuse(400, 'That is not a valid link');
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return refuse(400, 'Links must start with http:// or https://');
        }

        // One entry per link on a school's page. A link the page no longer lists (voted
        // obsolete) may come back.
        const program = body.program || 'nife';
        const key = linkKey(body.url);
        const existing = (await scanAll(programScan('NIFELinks', program)))
            .find(item => !isRemoved(item) && linkKey(item.url) === key);
        if (existing) {
            return refuse(409, `Already listed as "${existing.title}"`, { duplicateOf: existing.linkId });
        }

        const linkItem = {
            linkId: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: body.url,
            title: body.title.slice(0, 200),
            topic: body.topic,
            program,
            submittedAt: new Date().toISOString(),
            submittedBy: body.submittedBy || 'anonymous',
            upvotes: 0,
            downvotes: 0,
            domain: new URL(body.url).hostname
        };
        
        const putCommand = new PutCommand({
            TableName: 'NIFELinks',
            Item: linkItem
        });
        
        await dynamodb.send(putCommand);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Link submitted successfully',
                linkId: linkItem.linkId
            })
        };
        
    } catch (error) {
        console.error('Error submitting link:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to submit link'
            })
        };
    }
}

async function handleGetLinks(event, headers) {
    try {
        const program = event.queryStringParameters?.program || 'nife';

        const links = (await scanAll(programScan('NIFELinks', program))).filter(item => !isRemoved(item));
        const sortedLinks = links.sort((a, b) =>
            new Date(b.submittedAt) - new Date(a.submittedAt)
        );
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                links: sortedLinks
            })
        };
        
    } catch (error) {
        console.error('Error fetching links:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to fetch links'
            })
        };
    }
}

// A good or bad vote on a document (NIFEDocuments, docId) or a link (NIFELinks, linkId). Only
// an entry that exists is counted: an update with no condition would create a row for an unknown
// id, and a document row with no program lists under NIFE.
async function handleVote(TableName, keyName, body, headers) {
    try {
        const id = body[keyName];
        if (!id || !body.voteType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }

        if (body.voteType === 'outdated') {
            return await handleOutdatedVote(TableName, { [keyName]: id }, body, headers);
        }

        if (body.voteType !== 'good' && body.voteType !== 'bad') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Invalid vote' })
            };
        }

        const updateExpression = body.voteType === 'good'
            ? 'SET upvotes = if_not_exists(upvotes, :zero) + :one'
            : 'SET downvotes = if_not_exists(downvotes, :zero) + :one';

        const result = await dynamodb.send(new UpdateCommand({
            TableName,
            Key: { [keyName]: id },
            UpdateExpression: updateExpression,
            ConditionExpression: `attribute_exists(${keyName})`,
            ExpressionAttributeValues: {
                ':one': 1,
                ':zero': 0
            },
            ReturnValues: 'ALL_NEW'
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Vote recorded',
                upvotes: result.Attributes?.upvotes,
                downvotes: result.Attributes?.downvotes
            })
        };

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, error: 'Not found' })
            };
        }
        console.error('Error recording vote:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to record vote'
            })
        };
    }
}

const outdatedBody = (item) => JSON.stringify({
    success: true,
    outdatedUseful: Math.max(0, item.outdatedUseful || 0),
    outdatedObsolete: Math.max(0, item.outdatedObsolete || 0),
    outdatedNote: item.outdatedNote || '',
    outdatedAt: item.outdatedAt || null,
    removed: isRemoved(item)
});

// { choice, previous, note }: choice is this browser's new outdated vote, previous the one it
// had (either may be null, so a vote can be cast, switched or taken back). A note replaces the
// last one only when it says something.
async function handleOutdatedVote(TableName, Key, body, headers) {
    const choice = body.choice ?? null;
    const previous = body.previous ?? null;
    const valid = (v) => v === null || OUTDATED_CHOICES.includes(v);
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    if (!valid(choice) || !valid(previous) || note.length > OUTDATED_NOTE_MAX) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid outdated vote' })
        };
    }

    // A browser can remember a vote the table no longer counts (a count set by hand, say), and
    // taking that back must not drive the count below zero.
    const current = (await dynamodb.send(new GetCommand({ TableName, Key }))).Item;
    if (!current) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: 'Not found' })
        };
    }
    const count = { useful: current.outdatedUseful || 0, obsolete: current.outdatedObsolete || 0 };

    const delta = { useful: 0, obsolete: 0 };
    if (choice) delta[choice] += 1;
    if (previous && count[previous] > 0) delta[previous] -= 1;

    const adds = [];
    const sets = [];
    const values = {};
    if (delta.useful) { adds.push('outdatedUseful :du'); values[':du'] = delta.useful; }
    if (delta.obsolete) { adds.push('outdatedObsolete :do'); values[':do'] = delta.obsolete; }
    if (choice && note) { sets.push('outdatedNote = :note'); values[':note'] = note; }
    if (choice) { sets.push('outdatedAt = :at'); values[':at'] = new Date().toISOString(); }
    // Taking back a vote the table never counted leaves nothing to write; the browser still
    // forgets it.
    if (!adds.length && !sets.length) {
        return { statusCode: 200, headers, body: outdatedBody(current) };
    }

    const keyName = Object.keys(Key)[0];
    const expression = [sets.length && `SET ${sets.join(', ')}`, adds.length && `ADD ${adds.join(', ')}`]
        .filter(Boolean).join(' ');

    try {
        const result = await dynamodb.send(new UpdateCommand({
            TableName,
            Key,
            UpdateExpression: expression,
            ConditionExpression: `attribute_exists(${keyName})`,
            ExpressionAttributeValues: values,
            ReturnValues: 'ALL_NEW'
        }));
        return { statusCode: 200, headers, body: outdatedBody(result.Attributes || {}) };
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, error: 'Not found' })
            };
        }
        throw error;
    }
}
