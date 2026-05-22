import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const s3Client = new S3Client({ region: 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'nife-gouge-docs';

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
            return await handleGetUploadUrl(event, headers);
        }
        
        // Confirm successful upload
        if (path.includes('confirm-upload') && method === 'POST') {
            return await handleConfirmUpload(event, headers);
        }
        
        // Get all documents
        if (path.includes('get-documents') && method === 'GET') {
            return await handleGetDocuments(event, headers);
        }
        
        // Get signed URL for viewing
        if (path.includes('get-document-url') && method === 'POST') {
            return await handleGetDocumentUrl(event, headers);
        }
        
        // Submit link
        if (path.includes('submit-link') && method === 'POST') {
            return await handleLinkSubmission(event, headers);
        }
        
        // Get links
        if (path.includes('get-links') && method === 'GET') {
            return await handleGetLinks(event, headers);
        }
        
        // Vote on document
        if (path.includes('vote-document') && method === 'POST') {
            return await handleDocumentVote(event, headers);
        }
        
        // Vote on link
        if (path.includes('vote-link') && method === 'POST') {
            return await handleLinkVote(event, headers);
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };
    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Get presigned URL for direct S3 upload (doesn't save to DB yet)
async function handleGetUploadUrl(event, headers) {
    try {
        const body = JSON.parse(event.body);
        
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
                error: 'Failed to get upload URL',
                message: error.message
            })
        };
    }
}

// New function to confirm upload and save to DB
async function handleConfirmUpload(event, headers) {
    try {
        const body = JSON.parse(event.body);
        
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
        
        // Save metadata to DynamoDB only after confirmed S3 upload
        const docMetadata = {
            docId: body.docId,
            fileName: body.metadata.fileName,
            topic: body.metadata.topic,
            program: body.metadata.program || 'nife',
            s3Key: body.s3Key,
            fileSize: body.metadata.fileSize,
            mimeType: body.metadata.mimeType,
            uploadedAt: new Date().toISOString(),
            uploadedBy: body.metadata.uploadedBy || 'anonymous',
            upvotes: 0,
            downvotes: 0
        };
        
        await dynamodb.send(new PutCommand({
            TableName: 'NIFEDocuments',
            Item: docMetadata
        }));
        
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
                error: 'Failed to confirm upload',
                message: error.message
            })
        };
    }
}

async function handleGetDocuments(event, headers) {
    try {
        const program = event.queryStringParameters?.program || 'nife';

        const scanParams = { TableName: 'NIFEDocuments' };
        if (program === 'nife') {
            // Backward compat: items without a program attribute are NIFE
            scanParams.FilterExpression = 'program = :prog OR attribute_not_exists(program)';
            scanParams.ExpressionAttributeValues = { ':prog': 'nife' };
        } else {
            scanParams.FilterExpression = 'program = :prog';
            scanParams.ExpressionAttributeValues = { ':prog': program };
        }

        const scanCommand = new ScanCommand(scanParams);
        const result = await dynamodb.send(scanCommand);
        const documents = result.Items || [];
        
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
                error: 'Failed to fetch documents',
                message: error.message
            })
        };
    }
}

async function handleGetDocumentUrl(event, headers) {
    try {
        const body = JSON.parse(event.body);
        
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
                error: 'Failed to get document URL',
                message: error.message
            })
        };
    }
}

async function handleLinkSubmission(event, headers) {
    try {
        const body = JSON.parse(event.body);
        
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
        
        const linkItem = {
            linkId: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: body.url,
            title: body.title.slice(0, 200),
            topic: body.topic,
            program: body.program || 'nife',
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
                error: 'Failed to submit link',
                message: error.message
            })
        };
    }
}

async function handleGetLinks(event, headers) {
    try {
        const program = event.queryStringParameters?.program || 'nife';

        const scanParams = { TableName: 'NIFELinks' };
        if (program === 'nife') {
            scanParams.FilterExpression = 'program = :prog OR attribute_not_exists(program)';
            scanParams.ExpressionAttributeValues = { ':prog': 'nife' };
        } else {
            scanParams.FilterExpression = 'program = :prog';
            scanParams.ExpressionAttributeValues = { ':prog': program };
        }

        const scanCommand = new ScanCommand(scanParams);
        const result = await dynamodb.send(scanCommand);
        const sortedLinks = (result.Items || []).sort((a, b) =>
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
                error: 'Failed to fetch links',
                message: error.message
            })
        };
    }
}

async function handleDocumentVote(event, headers) {
    try {
        const body = JSON.parse(event.body);
        
        if (!body.docId || !body.voteType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Missing required fields' 
                })
            };
        }
        
        const updateExpression = body.voteType === 'good' 
            ? 'SET upvotes = if_not_exists(upvotes, :zero) + :one'
            : 'SET downvotes = if_not_exists(downvotes, :zero) + :one';
        
        const updateCommand = new UpdateCommand({
            TableName: 'NIFEDocuments',
            Key: { docId: body.docId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: {
                ':one': 1,
                ':zero': 0
            },
            ReturnValues: 'ALL_NEW'
        });
        
        const result = await dynamodb.send(updateCommand);
        
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
        console.error('Error recording vote:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to record vote',
                message: error.message
            })
        };
    }
}

async function handleLinkVote(event, headers) {
    try {
        const body = JSON.parse(event.body);
        
        if (!body.linkId || !body.voteType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Missing required fields' 
                })
            };
        }
        
        const updateExpression = body.voteType === 'good' 
            ? 'SET upvotes = if_not_exists(upvotes, :zero) + :one'
            : 'SET downvotes = if_not_exists(downvotes, :zero) + :one';
        
        const updateCommand = new UpdateCommand({
            TableName: 'NIFELinks',
            Key: { linkId: body.linkId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: {
                ':one': 1,
                ':zero': 0
            },
            ReturnValues: 'ALL_NEW'
        });
        
        const result = await dynamodb.send(updateCommand);
        
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
        console.error('Error recording vote:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to record vote',
                message: error.message
            })
        };
    }
}