const db = require('../db');
const { ok, fail } = require('../lib/http');
const { broadcast } = require('../broadcast');

const SORT = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);

async function listCategories() {
  const res = await db.doc.send(new db.ScanCommand({ TableName: db.tables.categories }));
  return ok((res.Items || []).sort(SORT));
}

async function listItems({ query }) {
  const { category_id } = query || {};
  let items;

  if (category_id) {
    const res = await db.doc.send(
      new db.QueryCommand({
        TableName: db.tables.menuItems,
        IndexName: 'category-index',
        KeyConditionExpression: 'category_id = :cid',
        ExpressionAttributeValues: { ':cid': Number(category_id) },
      })
    );
    items = res.Items || [];
  } else {
    const res = await db.doc.send(new db.ScanCommand({ TableName: db.tables.menuItems }));
    items = res.Items || [];
  }

  items.sort((a, b) => (a.category_id - b.category_id) || (a.id - b.id));
  return ok(items);
}

async function getItem({ params }) {
  const res = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.menuItems, Key: { id: Number(params.id) } })
  );
  if (!res.Item) return fail('Item not found', 404);
  return ok(res.Item);
}

async function updateItem({ params, body }) {
  const id = Number(params.id);
  const existing = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.menuItems, Key: { id } })
  );
  if (!existing.Item) return fail('Item not found', 404);

  const {
    name,
    description,
    price,
    available,
    available_dine_in,
    available_takeaway,
    available_delivery,
    category_id,
    image_url,
    code,
  } = body || {};

  if (price !== undefined && (isNaN(price) || price < 0)) {
    return fail('Invalid price', 400);
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = Number(price);
  if (available !== undefined) updates.available = available;
  if (available_dine_in !== undefined) updates.available_dine_in = available_dine_in;
  if (available_takeaway !== undefined) updates.available_takeaway = available_takeaway;
  if (available_delivery !== undefined) updates.available_delivery = available_delivery;
  if (category_id !== undefined) updates.category_id = Number(category_id);
  if (image_url !== undefined) updates.image_url = image_url;
  if (code !== undefined) updates.code = Number(code);

  if (Object.keys(updates).length > 0) {
    const fields = Object.keys(updates);
    await db.doc.send(
      new db.UpdateCommand({
        TableName: db.tables.menuItems,
        Key: { id },
        UpdateExpression: 'SET ' + fields.map((_, i) => `#f${i} = :v${i}`).join(', '),
        ExpressionAttributeNames: Object.fromEntries(fields.map((f, i) => [`#f${i}`, f])),
        ExpressionAttributeValues: Object.fromEntries(fields.map((f, i) => [`:v${i}`, updates[f]])),
      })
    );
  }

  const updated = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.menuItems, Key: { id } })
  );
  await broadcast('menu-updated', updated.Item);
  return ok(updated.Item);
}

async function createItem({ body }) {
  const { name, description, price, category_id, image_url } = body || {};
  if (!name || price === undefined || price === null || !category_id) {
    return fail('Name, price, and category_id required', 400);
  }

  const item = {
    id: await db.nextCounter('menu_item_id'),
    name,
    description: description || '',
    price: Number(price),
    category_id: Number(category_id),
    image_url: image_url || null,
    code: await db.nextCounter('menu_item_code'),
    available: 1,
    available_dine_in: 1,
    available_takeaway: 1,
    available_delivery: 1,
    created_at: new Date().toISOString(),
  };

  await db.doc.send(new db.PutCommand({ TableName: db.tables.menuItems, Item: item }));
  await broadcast('menu-item-added', item);
  return ok(item);
}

async function deleteItem({ params }) {
  const id = Number(params.id);
  const existing = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.menuItems, Key: { id } })
  );
  if (!existing.Item) return fail('Item not found', 404);

  await db.doc.send(new db.DeleteCommand({ TableName: db.tables.menuItems, Key: { id } }));
  await broadcast('menu-item-deleted', { id });
  return ok({ success: true });
}

module.exports = { listCategories, listItems, getItem, updateItem, createItem, deleteItem };
