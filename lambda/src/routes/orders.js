const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { ok, fail } = require('../lib/http');
const { broadcast } = require('../broadcast');
const { sendPush } = require('../push');
const { clearPushToken } = require('./users');

const VALID_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
const VALID_TYPES = ['dine_in', 'takeaway', 'delivery'];

const PUSH_STATUS_TEXT = {
  pending: 'is awaiting confirmation',
  accepted: 'has been accepted',
  preparing: 'is being prepared',
  ready: 'is ready',
  completed: 'has been completed',
  cancelled: 'has been cancelled',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function enrichOrder(order) {
  if (!order) return null;

  if (order.user_id) {
    const res = await db.doc.send(
      new db.GetCommand({ TableName: db.tables.users, Key: { id: order.user_id } })
    );
    const user = res.Item;
    order.user_name = user ? user.name : order.guest_name || 'Unknown';
    order.user_phone = user ? user.phone : '-';
  } else {
    order.user_name = order.guest_name || 'Walk-in';
    order.user_phone = '-';
  }
  return order;
}

async function enrichOrders(orders) {
  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const userMap = {};

  if (userIds.length > 0) {
    const res = await db.doc.send(
      new db.BatchGetCommand({
        RequestItems: { [db.tables.users]: { Keys: userIds.map((id) => ({ id })) } },
      })
    );
    for (const user of res.Responses?.[db.tables.users] || []) userMap[user.id] = user;
  }

  for (const order of orders) {
    const user = userMap[order.user_id];
    if (order.user_id && user) {
      order.user_name = user.name;
      order.user_phone = user.phone;
    } else {
      order.user_name = order.guest_name || 'Walk-in';
      order.user_phone = '-';
    }
  }
}

async function getMenuItems(items) {
  const map = {};
  const res = await db.doc.send(
    new db.BatchGetCommand({
      RequestItems: {
        [db.tables.menuItems]: {
          Keys: items.map((i) => ({ id: Number(i.menu_item_id) })),
        },
      },
    })
  );
  for (const item of res.Responses?.[db.tables.menuItems] || []) map[item.id] = item;
  return map;
}

async function buildOrder(orderData, source) {
  const {
    user_id,
    order_type,
    items,
    block,
    area,
    flat_number,
    room_number,
    special_instructions,
    guest_name,
    table_number,
  } = orderData;

  if (!items || items.length === 0) throw new HttpError(400, 'User, order type, and items required');
  if (!VALID_TYPES.includes(order_type)) throw new HttpError(400, 'Invalid order type');
  if (source === 'online' && !user_id) throw new HttpError(400, 'User required');

  const menuMap = await getMenuItems(items);
  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const menuItem = menuMap[Number(item.menu_item_id)];
    if (!menuItem) throw new HttpError(400, `Item ${item.menu_item_id} not found`);

    if (source === 'online') {
      const availKey = `available_${order_type}`;
      if (menuItem[availKey] === 0) {
        throw new HttpError(400, `${menuItem.name} is not available for ${order_type.replace('_', ' ')}`);
      }
    } else if (!menuItem.available) {
      throw new HttpError(400, `${menuItem.name} is currently unavailable`);
    }

    const itemPrice =
      source === 'online' && order_type === 'delivery' ? menuItem.price + 10 : menuItem.price;
    total += itemPrice * item.quantity;
    orderItems.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      price: itemPrice,
      quantity: item.quantity,
    });
  }

  const deliveryCharge = order_type === 'delivery' ? 20 : 0;
  total += deliveryCharge;

  const now = new Date().toISOString();
  return {
    id: (source === 'pos' ? 'POS-' : 'ORD-') + uuidv4().slice(0, 8).toUpperCase(),
    pk: 'ALL',
    user_id: source === 'online' ? user_id : null,
    order_type,
    source,
    status: source === 'pos' ? 'preparing' : 'pending',
    total_amount: total,
    delivery_charge: deliveryCharge,
    block: block || null,
    area: area || null,
    flat_number: flat_number || null,
    room_number: room_number || null,
    special_instructions: special_instructions || null,
    table_number: table_number || null,
    guest_name: guest_name || null,
    kot_number: await db.nextKotNumber(),
    items: orderItems,
    created_at: now,
    updated_at: now,
  };
}

async function getUserPushToken(userId) {
  if (!userId) return null;
  const res = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.users, Key: { id: userId } })
  );
  return (res.Item && res.Item.push_token) || null;
}

// Push an update to the order's owner. Clears the stored token if the device
// is no longer registered so we stop sending to dead tokens.
async function notifyUser(order, title, body) {
  const token = await getUserPushToken(order.user_id);
  if (!token) return;
  const ticket = await sendPush(token, {
    title,
    body,
    data: { type: 'order', orderId: order.id },
  });
  if (ticket && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
    await clearPushToken(order.user_id);
  }
}

async function saveOrder(order) {
  await db.doc.send(new db.PutCommand({ TableName: db.tables.orders, Item: order }));
  const enriched = await enrichOrder(order);
  await broadcast('new-order', enriched);
  await broadcast('kitchen-new-order', enriched, ['kitchen']);
  await broadcast('order-alert', enriched, ['admin']);
  if (order.user_id) {
    await notifyUser(order, `Order ${order.id}`, 'Your order has been placed and is awaiting confirmation.');
  }
  return ok(enriched);
}

async function createOnline({ body, auth }) {
  try {
    // Identity comes from the verified token, never from the request body.
    const order = await buildOrder({ ...(body || {}), user_id: auth.sub }, 'online');
    return await saveOrder(order);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    throw err;
  }
}

async function createPos({ body }) {
  try {
    const order = await buildOrder(body || {}, 'pos');
    return await saveOrder(order);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    throw err;
  }
}

async function listOrders({ query }) {
  const { status, source, order_type } = query || {};

  const res = await db.doc.send(
    new db.QueryCommand({
      TableName: db.tables.orders,
      IndexName: 'all-orders-index',
      KeyConditionExpression: 'pk = :all',
      ExpressionAttributeValues: { ':all': 'ALL' },
      ScanIndexForward: false,
    })
  );

  let orders = res.Items || [];
  if (status) orders = orders.filter((o) => o.status === status);
  if (source) orders = orders.filter((o) => o.source === source);
  if (order_type) orders = orders.filter((o) => o.order_type === order_type);

  await enrichOrders(orders);
  return ok(orders);
}

async function getUserOrders({ params, auth }) {
  if (params.userId !== auth.sub) return fail('Forbidden', 403);

  const res = await db.doc.send(
    new db.QueryCommand({
      TableName: db.tables.orders,
      IndexName: 'user-orders-index',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': params.userId },
      ScanIndexForward: false,
    })
  );

  const orders = res.Items || [];
  await enrichOrders(orders);
  return ok(orders);
}

async function getOrder({ params, auth }) {
  const res = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.orders, Key: { id: params.id } })
  );
  if (!res.Item) return fail('Order not found', 404);

  const isAdmin = auth && auth.role === 'admin';
  const isOwner = res.Item.user_id && auth && res.Item.user_id === auth.sub;
  if (!isAdmin && !isOwner) return fail('Forbidden', 403);

  return ok(await enrichOrder(res.Item));
}

async function updateStatus({ params, body }) {
  const { status } = body || {};
  if (!VALID_STATUSES.includes(status)) {
    return fail('Invalid status', 400);
  }

  await db.doc.send(
    new db.UpdateCommand({
      TableName: db.tables.orders,
      Key: { id: params.id },
      UpdateExpression: 'SET #s = :status, updated_at = :updated',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': status, ':updated': new Date().toISOString() },
    })
  );

  const res = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.orders, Key: { id: params.id } })
  );
  if (!res.Item) return fail('Order not found', 404);

  const order = await enrichOrder(res.Item);
  await broadcast('order-updated', order);
  await broadcast('kitchen-order-updated', order, ['kitchen']);
  if (order.user_id) {
    await notifyUser(
      order,
      `Order ${order.id}`,
      `Your order ${PUSH_STATUS_TEXT[status] || 'was updated'}.`
    );
  }
  return ok(order);
}

module.exports = { createOnline, createPos, listOrders, getUserOrders, getOrder, updateStatus };
