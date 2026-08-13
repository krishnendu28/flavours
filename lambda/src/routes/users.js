const db = require('../db');
const { ok, fail } = require('../lib/http');

// Store the user's Expo push token so the server can notify them about order updates.
async function savePushToken({ body, auth }) {
  const { token } = body || {};
  if (!token || typeof token !== 'string') {
    return fail('Push token required', 400);
  }

  await db.doc.send(
    new db.UpdateCommand({
      TableName: db.tables.users,
      Key: { id: auth.sub },
      UpdateExpression: 'SET push_token = :token, push_token_updated_at = :ts',
      ExpressionAttributeValues: { ':token': token, ':ts': new Date().toISOString() },
    })
  );
  return ok({ success: true });
}

// Remove a user's push token (e.g. when the device is no longer registered).
async function clearPushToken(userId) {
  if (!userId) return;
  await db.doc.send(
    new db.UpdateCommand({
      TableName: db.tables.users,
      Key: { id: userId },
      UpdateExpression: 'REMOVE push_token',
    })
  );
}

module.exports = { savePushToken, clearPushToken };
