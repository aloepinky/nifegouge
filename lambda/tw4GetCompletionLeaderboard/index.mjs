import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(client);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { testType, period } = event.queryStringParameters || {};
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

        let leaderboard = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([username, completions], i) => ({ rank: i + 1, username, completions, branch: '', trainingClass: '' }));

        // Join with user profiles for branch/class
        if (leaderboard.length > 0) {
            const batchResult = await dynamodb.send(new BatchGetCommand({
                RequestItems: {
                    TW4Users: {
                        Keys: leaderboard.map(e => ({ username: e.username })),
                        ProjectionExpression: 'username, branch, trainingClass',
                    },
                },
            }));
            const profiles = {};
            for (const user of (batchResult.Responses?.TW4Users || [])) {
                profiles[user.username] = user;
            }
            leaderboard = leaderboard.map(e => ({
                ...e,
                branch: profiles[e.username]?.branch || '',
                trainingClass: profiles[e.username]?.trainingClass || '',
            }));
        }

        return { statusCode: 200, headers, body: JSON.stringify({ leaderboard }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to retrieve leaderboard' }) };
    }
};
