import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(client);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function getUserRecord(testType, username) {
    const result = await dynamodb.send(new QueryCommand({
        TableName: 'TW4TimeLeaderboard',
        KeyConditionExpression: 'testType = :t',
        FilterExpression: 'username = :u',
        ExpressionAttributeValues: { ':t': testType, ':u': username },
    }));
    return (result.Items || [])[0] || null;
}

async function upsertTimeRecord(testType, username, newTime) {
    const existing = await getUserRecord(testType, username);
    if (existing && existing.elapsedTime <= newTime) return; // existing record is equal or better
    if (existing) {
        await dynamodb.send(new DeleteCommand({
            TableName: 'TW4TimeLeaderboard',
            Key: { testType: existing.testType, elapsedTime: existing.elapsedTime },
        }));
    }
    await dynamodb.send(new PutCommand({
        TableName: 'TW4TimeLeaderboard',
        Item: {
            testType,
            elapsedTime: Number(newTime),
            username,
            score: 100,
            timestamp: new Date().toISOString(),
        },
    }));
}

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

        // Upsert main time record (only keeps personal best)
        await upsertTimeRecord(testType, upper, elapsedTime);

        // For combined runs, cross-post splits to solo leaderboards if they're personal bests
        if (testType === 'TW4_EPs_and_Limits') {
            if (epsTime) await upsertTimeRecord('TW4_EPs', upper, epsTime);
            if (limitsTime) await upsertTimeRecord('TW4_Limits', upper, limitsTime);
        }

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
