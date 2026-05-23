import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

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

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const testType = event.queryStringParameters?.testType;
        if (!testType) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'testType required' }) };
        }

        const result = await dynamodb.send(new QueryCommand({
            TableName: 'TW4TimeLeaderboard',
            KeyConditionExpression: 'testType = :t',
            ExpressionAttributeValues: { ':t': testType },
            Limit: 10,
            ScanIndexForward: true,
        }));

        const leaderboard = (result.Items || []).map((item, i) => ({
            rank: i + 1,
            username: item.username,
            time: item.elapsedTime,
            epsTime: item.epsTime,
            limitsTime: item.limitsTime,
            formattedTime: formatTime(item.elapsedTime),
            formattedEpsTime: item.epsTime ? formatTime(item.epsTime) : null,
            formattedLimitsTime: item.limitsTime ? formatTime(item.limitsTime) : null,
        }));

        return { statusCode: 200, headers, body: JSON.stringify({ leaderboard }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to retrieve leaderboard' }) };
    }
};
