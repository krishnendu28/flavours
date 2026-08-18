require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { generateOtp, storeOtp, verifyOtp, sendOtp } = require('./otp');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : '*',
    methods: ['GET', 'POST']
  }
});

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
const catchAllDir = path.join(__dirname, '..', 'public');

const PORT = process.env.PORT || 3001;

// ─── OTP ───────────────────────────────────────────────────

const otpCooldowns = {};

app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'Valid phone number required' });
  }

  const lastSent = otpCooldowns[phone];
  if (lastSent && Date.now() - lastSent < 30000) {
    return res.status(429).json({ error: 'Wait 30 seconds before requesting a new OTP' });
  }

  const otp = generateOtp();
  storeOtp(phone, otp);
  otpCooldowns[phone] = Date.now();

  // Fire-and-forget SMS delivery — never blocks the response
  sendOtp(phone, otp);

  res.json({ success: true, message: 'OTP sent' });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP required' });
  }

  if (!verifyOtp(phone, otp)) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, name, phone) VALUES (?, ?, ?)').run(id, name || 'Customer', phone);
    user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  } else if (name && name !== user.name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
    user.name = name;
  }

  res.json({ success: true, user: { id: user.id, name: user.name, phone: user.phone } });
});

// ─── ADMIN AUTH ────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ success: true, admin: { id: admin.id, username: admin.username } });
});

// ─── MENU ──────────────────────────────────────────────────
app.get('/api/menu/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json(cats);
});

app.get('/api/menu/items', (req, res) => {
  const { category_id } = req.query;
  let items;
  if (category_id) {
    items = db.prepare('SELECT * FROM menu_items WHERE category_id = ? ORDER BY id').all(category_id);
  } else {
    items = db.prepare('SELECT * FROM menu_items ORDER BY category_id, id').all();
  }
  res.json(items);
});

app.get('/api/menu/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

app.put('/api/menu/items/:id', (req, res) => {
  const { name, description, price, available, available_dine_in, available_takeaway, available_delivery, category_id, image_url, code } = req.body;
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  db.prepare(`UPDATE menu_items SET
    name = COALESCE(?, name),
    description = COALESCE(?, description),
    price = COALESCE(?, price),
    available = COALESCE(?, available),
    available_dine_in = COALESCE(?, available_dine_in),
    available_takeaway = COALESCE(?, available_takeaway),
    available_delivery = COALESCE(?, available_delivery),
    category_id = COALESCE(?, category_id),
    image_url = COALESCE(?, image_url),
    code = COALESCE(?, code)
    WHERE id = ?`
  ).run(name, description, price, available, available_dine_in, available_takeaway, available_delivery, category_id, image_url, code, req.params.id);

  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  io.emit('menu-updated', updated);
  res.json(updated);
});

app.post('/api/menu/items', (req, res) => {
  const { name, description, price, category_id, image_url } = req.body;
  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category_id required' });
  }
  const nextCode = db.prepare('SELECT COALESCE(MAX(code), 0) + 1 AS next FROM menu_items').get().next;
  const result = db.prepare('INSERT INTO menu_items (name, description, price, category_id, image_url, code) VALUES (?, ?, ?, ?, ?, ?)').run(name, description || '', price, category_id, image_url || null, nextCode);
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
  io.emit('menu-item-added', item);
  res.json(item);
});

app.delete('/api/menu/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  io.emit('menu-item-deleted', { id: parseInt(req.params.id) });
  res.json({ success: true });
});

// ─── ONLINE ORDERS ─────────────────────────────────────────
app.post('/api/orders', (req, res) => {
  const { user_id, order_type, items, block, area, flat_number, room_number, special_instructions } = req.body;
  if (!order_type || !items || items.length === 0) {
    return res.status(400).json({ error: 'Order type and items required' });
  }

  let total = 0;
  const orderItems = [];
  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(item.menu_item_id);
    if (!menuItem) return res.status(400).json({ error: `Item ${item.menu_item_id} not found` });
    const availKey = `available_${order_type}`;
    if (menuItem[availKey] === 0) return res.status(400).json({ error: `${menuItem.name} is not available for ${order_type.replace('_',' ')}` });
    const itemPrice = order_type === 'delivery' ? menuItem.price + 10 : menuItem.price;
    total += itemPrice * item.quantity;
    orderItems.push({ ...item, name: menuItem.name, price: itemPrice });
  }

  const deliveryCharge = order_type === 'delivery' ? 20 : 0;
  total += deliveryCharge;

  const orderId = 'ORD-' + uuidv4().slice(0, 8).toUpperCase();

  // Get next KOT number for the day
  const today = new Date().toISOString().slice(0, 10);
  const lastKot = db.prepare("SELECT MAX(kot_number) as last_kot FROM orders WHERE created_at LIKE ?").get(today + '%');
  const kotNumber = (lastKot?.last_kot || 0) + 1;

  const createOrder = db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, user_id, order_type, source, total_amount, delivery_charge, block, area, flat_number, room_number, special_instructions, kot_number)
      VALUES (?, ?, ?, 'online', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(orderId, user_id, order_type, total, deliveryCharge, block || null, area || null, flat_number || null, room_number || null, special_instructions || null, kotNumber);

    const insertOrderItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)');
    for (const item of orderItems) {
      insertOrderItem.run(orderId, item.menu_item_id, item.name, item.price, item.quantity);
    }
  });

  createOrder();

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  order.user_name = user ? user.name : 'Unknown';
  order.user_phone = user ? user.phone : 'Unknown';

  io.emit('new-order', order);
  io.to('kitchen').emit('kitchen-new-order', order);
  io.to('admin').emit('order-alert', order);

  res.json(order);
});

// ─── HEALTH ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── POS ORDERS ────────────────────────────────────────────
app.post('/api/pos/orders', (req, res) => {
  const { order_type, items, table_number, guest_name, special_instructions, block, area, flat_number, room_number } = req.body;
  if (!order_type || !items || items.length === 0) {
    return res.status(400).json({ error: 'Order type and items required' });
  }

  let total = 0;
  const orderItems = [];
  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(item.menu_item_id);
    if (!menuItem) return res.status(400).json({ error: `Item ${item.menu_item_id} not found` });
    if (!menuItem.available) return res.status(400).json({ error: `${menuItem.name} is currently unavailable` });
    total += menuItem.price * item.quantity;
    orderItems.push({ ...item, name: menuItem.name, price: menuItem.price });
  }

  const orderId = 'POS-' + uuidv4().slice(0, 8).toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const lastKot = db.prepare("SELECT MAX(kot_number) as last_kot FROM orders WHERE created_at LIKE ?").get(today + '%');
  const kotNumber = (lastKot?.last_kot || 0) + 1;

  const createOrder = db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, user_id, order_type, source, status, total_amount, delivery_charge, block, area, flat_number, room_number, special_instructions, table_number, guest_name, kot_number)
      VALUES (?, NULL, ?, 'pos', 'preparing', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(orderId, order_type, total,
      block || null, area || null, flat_number || null, room_number || null,
      special_instructions || null, table_number || null, guest_name || null, kotNumber);

    const insertOrderItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)');
    for (const item of orderItems) {
      insertOrderItem.run(orderId, item.menu_item_id, item.name, item.price, item.quantity);
    }
  });

  createOrder();

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  order.user_name = guest_name || 'Walk-in';
  order.user_phone = '-';

  io.emit('new-order', order);
  io.to('kitchen').emit('kitchen-new-order', order);
  io.to('admin').emit('order-alert', order);

  res.json(order);
});

// ─── ORDERS ────────────────────────────────────────────────
app.get('/api/orders/user/:userId', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId);
  for (const order of orders) {
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  }
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  if (order.user_id) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);
    order.user_name = user ? user.name : (order.guest_name || 'Unknown');
    order.user_phone = user ? user.phone : '-';
  } else {
    order.user_name = order.guest_name || 'Walk-in';
    order.user_phone = '-';
  }
  res.json(order);
});

app.get('/api/orders', (req, res) => {
  const { status, source, order_type } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (source) { sql += ' AND source = ?'; params.push(source); }
  if (order_type) { sql += ' AND order_type = ?'; params.push(order_type); }
  sql += ' ORDER BY created_at DESC';

  const orders = db.prepare(sql).all(...params);
  for (const order of orders) {
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    if (order.user_id) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);
      order.user_name = user ? user.name : (order.guest_name || 'Unknown');
      order.user_phone = user ? user.phone : '-';
    } else {
      order.user_name = order.guest_name || 'Walk-in';
      order.user_phone = '-';
    }
  }
  res.json(orders);
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  if (order.user_id) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);
    order.user_name = user ? user.name : (order.guest_name || 'Unknown');
    order.user_phone = user ? user.phone : '-';
  } else {
    order.user_name = order.guest_name || 'Walk-in';
    order.user_phone = '-';
  }

  io.emit('order-updated', order);
  io.to('kitchen').emit('kitchen-order-updated', order);

  res.json(order);
});

// ─── SOCKET.IO ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  socket.on('join-admin', () => {
    socket.join('admin');
    console.log('[Socket] Admin joined room');
  });

  socket.on('join-kitchen', () => {
    socket.join('kitchen');
    console.log('[Socket] Kitchen joined room');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// ─── SPA CATCH-ALL ────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(catchAllDir, 'index.html'));
});

// ─── START ─────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Flavours BOB server running on http://localhost:${PORT}`);
});
