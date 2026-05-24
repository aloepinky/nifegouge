import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(client);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function getProfiles(usernames) {
    if (usernames.length === 0) return {};
    const batchResult = await dynamodb.send(new BatchGetCommand({
        RequestItems: {
            TW4Users: {
                Keys: usernames.map(u => ({ username: u })),
                ProjectionExpression: 'username, branch, trainingClass',
            },
        },
    }));
    const profiles = {};
    for (const user of (batchResult.Responses?.TW4Users || [])) {
        profiles[user.username] = user;
    }
    return profiles;
}

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { testType, period, username } = event.queryStringParameters || {};
        if (!testType || !period) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'testType and period required' }) };
        }

        const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const result = await dynamodb.send(new QueryCommand({
            TableName: 'TW4Completions',
            KeyConditionExpression: 'testType = :t AND sk >= :cutoff',
            ExpressionAttributeValues: { ':t': testType, ':cutoff': cutoff },
        }));

        const counts = {};
        for (const item of result.Items || []) {
            counts[item.username] = (counts[item.username] || 0) + 1;
        }

        const allSorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([uname, completions], i) => ({ rank: i + 1, username: uname, completions }));

        const leaderboard = allSorted.slice(0, 10);
        const upper = username ? username.toUpperCase() : null;

        // Find user's entry if they're outside top 10
        let userEntry = null;
        if (upper && !leaderboard.find(e => e.username === upper)) {
            const found = allSorted.find(e => e.username === upper);
            if (found) userEntry = found;
        }

        // Profile join for top 10 + userEntry
        const toJoin = [...leaderboard, ...(userEntry ? [userEntry] : [])];
        const profiles = await getProfiles(toJoin.map(e => e.username));

        const withProfiles = (arr) => arr.map(e => ({
            ...e,
            branch: profiles[e.username]?.branch || '',
            trainingClass: profiles[e.username]?.trainingClass || '',
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                leaderboard: withProfiles(leaderboard),
                userEntry: userEntry ? withProfiles([userEntry])[0] : null,
            }),
        };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to retrieve leaderboard' }) };
    }
};
