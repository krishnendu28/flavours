const { ApiGatewayManagementApi } = require('@aws-sdk/client-apigatewaymanagementapi');
const db = require('./db');

let api = null;

function getApi() {
  if (!process.env.WS_ENDPOINT) return null;
  if (!api) api = new ApiGatewayManagementApi({ endpoint: process.env.WS_ENDPOINT });
  return api;
}

async function listConnections() {
  const res = await db.doc.send(new db.ScanCommand({ TableName: db.tables.connections }));
  return res.Items || [];
}

// Broadcast a message to all WebSocket connections, or only to those that
// joined one of the given rooms. Rooms are stored as a comma-joined string
// attribute, e.g. "admin,kitchen".
//
//   broadcast('new-order', order)                      -> everyone
//   broadcast('order-alert', order, ['admin'])         -> admin room only
//   broadcast('kitchen-new-order', order, ['kitchen']) -> kitchen room only
async function broadcast(event, data, rooms) {
  const gw = getApi();
  if (!gw) {
    console.log(`[ws] broadcast "${event}" skipped (WS_ENDPOINT not set)`);
    return;
  }

  const connections = await listConnections();
  const targets = rooms
    ? connections.filter((c) => (c.rooms || '').split(',').some((r) => rooms.includes(r)))
    : connections;

  const payload = JSON.stringify({ event, data });

  for (const conn of targets) {
    try {
      await gw.postToConnection({ ConnectionId: conn.connectionId, Data: payload });
    } catch (err) {
      const gone =
        err && (err.name === 'GoneException' || err.$metadata?.httpStatusCode === 410);
      if (gone) {
        try {
          await db.doc.send(
            new db.DeleteCommand({
              TableName: db.tables.connections,
              Key: { connectionId: conn.connectionId },
            })
          );
        } catch (e) {
          /* ignore */
        }
      } else {
        console.error('[ws] postToConnection failed', err);
      }
    }
  }
}

module.exports = { broadcast };
