import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(client);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

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
        const { testType, username } = event.queryStringParameters || {};
        if (!testType) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'testType required' }) };
        }

        // Fetch top 10
        const result = await dynamodb.send(new QueryCommand({
            TableName: 'TW4TimeLeaderboard',
            KeyConditionExpression: 'testType = :t',
            ExpressionAttributeValues: { ':t': testType },
            Limit: 10,
            ScanIndexForward: true,
        }));

        const items = result.Items || [];
        const leaderboardUsernames = items.map(i => i.username);
        const upper = username ? username.toUpperCase() : null;

        // Profile join for top 10
        const profileUsernames = upper && !leaderboardUsernames.includes(upper)
            ? [...leaderboardUsernames, upper]
            : leaderboardUsernames;
        const profiles = await getProfiles(profileUsernames);

        const leaderboard = items.map((item, i) => ({
            rank: i + 1,
            username: item.username,
            formattedTime: formatTime(item.elapsedTime),
            formattedEpsTime: item.epsTime ? formatTime(item.epsTime) : null,
            formattedLimitsTime: item.limitsTime ? formatTime(item.limitsTime) : null,
            branch: profiles[item.username]?.branch || '',
            trainingClass: profiles[item.username]?.trainingClass || '',
        }));

        // If username provided and not in top 10, find their rank
        let userEntry = null;
        if (upper && !leaderboardUsernames.includes(upper)) {
            // Find user's entry
            const userResult = await dynamodb.send(new QueryCommand({
                TableName: 'TW4TimeLeaderboard',
                KeyConditionExpression: 'testType = :t',
                FilterExpression: 'username = :u',
                ExpressionAttributeValues: { ':t': testType, ':u': upper },
            }));

            if (userResult.Items && userResult.Items.length > 0) {
                const userItem = userResult.Items[0];
                // Count how many entries are faster
                const fasterResult = await dynamodb.send(new QueryCommand({
                    TableName: 'TW4TimeLeaderboard',
                    KeyConditionExpression: 'testType = :t AND elapsedTime < :userTime',
                    ExpressionAttributeValues: { ':t': testType, ':userTime': userItem.elapsedTime },
                    Select: 'COUNT',
                }));
                const rank = (fasterResult.Count || 0) + 1;
                userEntry = {
                    rank,
                    username: upper,
                    formattedTime: formatTime(userItem.elapsedTime),
                    formattedEpsTime: userItem.epsTime ? formatTime(userItem.epsTime) : null,
                    formattedLimitsTime: userItem.limitsTime ? formatTime(userItem.limitsTime) : null,
                    branch: profiles[upper]?.branch || '',
                    trainingClass: profiles[upper]?.trainingClass || '',
                };
            }
        }

        return { statusCode: 200, headers, body: JSON.stringify({ leaderboard, userEntry }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to retrieve leaderboard' }) };
    }
};
