const { ApiGatewayManagementApi } = require('@aws-sdk/client-apigatewaymanagementapi');
const db = require('./db');

let api = null;

function getApi() {
  if (!process.env.WS_ENDPOINT) return null;
  if (!api) api = new ApiGatewayManagementApi({ endpoint: process.env.WS_ENDPOINT });
  return api;
}

async function listConnections() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await db.doc.send(
      new db.ScanCommand({ TableName: db.tables.connections, ExclusiveStartKey })
    );
    items.push(...(res.Items || []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

// Broadcast a message to all WebSocket connections, or only to those that
// joined one of the given rooms. Rooms are stored as a comma-joined string
// attribute, e.g. "admin,kitchen".
//
//   broadcast('new-order', order)                      -> everyone
//   broadcast('order-alert', order, ['admin'])         -> admin room only
//   broadcast('kitchen-new-order', order, ['kitchen']) -> kitchen room only
//
// Best-effort: never throws, so a broadcast failure can't fail the caller
// (e.g. the order that triggered it is already persisted).
async function broadcast(event, data, rooms) {
  const gw = getApi();
  if (!gw) {
    console.log(`[ws] broadcast "${event}" skipped (WS_ENDPOINT not set)`);
    return;
  }

  try {
    const connections = await listConnections();
    const targets = rooms
      ? connections.filter((c) => (c.rooms || '').split(',').some((r) => rooms.includes(r)))
      : connections;

    const payload = JSON.stringify({ event, data });

    // Send concurrently; a slow/broken connection must not stall the others.
    const results = await Promise.all(
      targets.map((conn) =>
        gw.postToConnection({ ConnectionId: conn.connectionId, Data: payload }).then(
          () => null,
          (err) => ({
            conn,
            gone: err && (err.name === 'GoneException' || err.$metadata?.httpStatusCode === 410),
            err,
          })
        )
      )
    );

    for (const r of results) {
      if (!r) continue;
      if (r.gone) {
        try {
          await db.doc.send(
            new db.DeleteCommand({
              TableName: db.tables.connections,
              Key: { connectionId: r.conn.connectionId },
            })
          );
        } catch (e) {
          /* ignore */
        }
      } else {
        console.error('[ws] postToConnection failed', r.err);
      }
    }
  } catch (err) {
    console.error(`[ws] broadcast "${event}" failed`, err);
  }
}

module.exports = { broadcast };
