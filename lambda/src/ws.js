const db = require('./db');
const { verify } = require('./lib/token');

// Client sends: { "action": "join-admin", "token": "<admin JWT>" } or
// { "action": "join-kitchen", "token": "<admin JWT>" }.
// AWS routes every non-$connect/$disconnect message to $default.

function respond(statusCode, body) {
  return { statusCode, body: JSON.stringify(body) };
}

async function trackConnection(connectionId) {
  await db.doc.send(
    new db.PutCommand({
      TableName: db.tables.connections,
      Item: {
        connectionId,
        rooms: '',
        ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // expire after 24h
      },
    })
  );
}

async function joinRoom(connectionId, room) {
  const existing = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.connections, Key: { connectionId } })
  );
  const rooms = (existing.Item?.rooms || '')
    .split(',')
    .filter(Boolean);
  if (!rooms.includes(room)) rooms.push(room);

  await db.doc.send(
    new db.UpdateCommand({
      TableName: db.tables.connections,
      Key: { connectionId },
      UpdateExpression: 'SET #r = :rooms',
      ExpressionAttributeNames: { '#r': 'rooms' },
      ExpressionAttributeValues: { ':rooms': rooms.join(',') },
    })
  );
}

exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  await trackConnection(connectionId);
  console.log('[ws] connected:', connectionId);
  return respond(200, { connected: true });
};

exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    await db.doc.send(
      new db.DeleteCommand({ TableName: db.tables.connections, Key: { connectionId } })
    );
    console.log('[ws] disconnected:', connectionId);
  } catch (err) {
    console.warn('[ws] disconnect cleanup failed', err.message);
  }
  return respond(200, {});
};

exports.default = async (event) => {
  const connectionId = event.requestContext.connectionId;
  let message = {};
  try {
    message = JSON.parse(event.body || '{}');
  } catch (err) {
    // ignore malformed payloads
  }

  const action = message.action || '';
  if (action === 'join-admin' || action === 'join-kitchen') {
    // Restricted rooms are for restaurant staff only. Validate the caller's
    // admin token before granting access, otherwise anyone with the WSS URL
    // could subscribe to every order broadcast.
    const payload = verify(message.token);
    if (!payload || payload.role !== 'admin') {
      console.warn('[ws] rejected join:', connectionId, action);
      return respond(403, { error: 'Forbidden: admin token required' });
    }
    const room = action === 'join-admin' ? 'admin' : 'kitchen';
    await joinRoom(connectionId, room);
    console.log('[ws] connection joined room:', connectionId, room);
  }

  return respond(200, { ok: true });
};
