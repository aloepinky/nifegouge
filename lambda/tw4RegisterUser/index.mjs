import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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
        const { username, password } = body;

        if (!username || !password) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'username and password required' }) };
        }

        const upper = username.toUpperCase();
        if (!/^[A-Z]{5}$/.test(upper)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username must be exactly 5 letters A-Z' }) };
        }

        // Check if username is taken
        const existing = await dynamodb.send(new GetCommand({
            TableName: 'TW4Users',
            Key: { username: upper },
        }));

        if (existing.Item) {
            return { statusCode: 409, headers, body: JSON.stringify({ error: 'Username already taken' }) };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await dynamodb.send(new PutCommand({
            TableName: 'TW4Users',
            Item: { username: upper, passwordHash },
        }));

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Registration failed' }) };
    }
};
