import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';

const client = new DynamoDBClient({ region: 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(client);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        let body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;
        const { username, password, branch, trainingClass } = body;

        if (!username || !password) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'username and password required' }) };
        }

        const upper = username.toUpperCase();

        const result = await dynamodb.send(new GetCommand({
            TableName: 'TW4Users',
            Key: { username: upper },
        }));

        if (!result.Item) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid username or password' }) };
        }

        const match = await bcrypt.compare(password, result.Item.passwordHash);
        if (!match) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid username or password' }) };
        }

        let currentBranch = result.Item.branch || '';
        let currentClass = result.Item.trainingClass || 'POOL';

        // Optionally update branch/trainingClass if provided
        if (branch !== undefined || trainingClass !== undefined) {
            const newBranch = branch !== undefined ? (branch.slice(0, 10).toUpperCase()) : currentBranch;
            const newClass = trainingClass !== undefined ? (trainingClass.slice(0, 10).toUpperCase() || 'POOL') : currentClass;

            await dynamodb.send(new UpdateCommand({
                TableName: 'TW4Users',
                Key: { username: upper },
                UpdateExpression: 'SET branch = :b, trainingClass = :c',
                ExpressionAttributeValues: { ':b': newBranch, ':c': newClass },
            }));

            currentBranch = newBranch;
            currentClass = newClass;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, branch: currentBranch, trainingClass: currentClass }),
        };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Verification failed' }) };
    }
};
