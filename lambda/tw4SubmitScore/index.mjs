import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

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
        const { testType, username, elapsedTime, epsTime, limitsTime, score } = body;

        if (!testType || !username || !elapsedTime || score !== 100) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing or invalid required fields' }) };
        }

        const upper = username.toUpperCase();

        // Verify username exists
        const userResult = await dynamodb.send(new GetCommand({
            TableName: 'TW4Users',
            Key: { username: upper },
        }));
        if (!userResult.Item) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unknown username' }) };
        }

        // Remove any existing time entry for this user + testType
        const existing = await dynamodb.send(new QueryCommand({
            TableName: 'TW4TimeLeaderboard',
            KeyConditionExpression: 'testType = :t',
            ExpressionAttributeValues: { ':t': testType },
        }));

        for (const item of existing.Items || []) {
            if (item.username === upper) {
                await dynamodb.send(new DeleteCommand({
                    TableName: 'TW4TimeLeaderboard',
                    Key: { testType: item.testType, elapsedTime: item.elapsedTime },
                }));
            }
        }

        // Insert best time record
        const timeItem = {
            testType,
            elapsedTime: Number(elapsedTime),
            username: upper,
            score: 100,
            timestamp: new Date().toISOString(),
        };
        if (epsTime) timeItem.epsTime = Number(epsTime);
        if (limitsTime) timeItem.limitsTime = Number(limitsTime);

        await dynamodb.send(new PutCommand({ TableName: 'TW4TimeLeaderboard', Item: timeItem }));

        // Record completion (every submission counts toward completion leaderboard)
        const iso = new Date().toISOString();
        await dynamodb.send(new PutCommand({
            TableName: 'TW4Completions',
            Item: {
                testType,
                sk: `${iso}#${upper}`,
                username: upper,
                elapsedTime: Number(elapsedTime),
            },
        }));

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Submission failed' }) };
    }
};
