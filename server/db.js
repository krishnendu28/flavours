const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.RENDER
  ? path.join('/tmp', 'flavours_bob.db')
  : path.join(__dirname, '..', 'flavours_bob.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    available INTEGER DEFAULT 1,
    available_dine_in INTEGER DEFAULT 1,
    available_takeaway INTEGER DEFAULT 1,
    available_delivery INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    order_type TEXT NOT NULL CHECK(order_type IN ('dine_in', 'takeaway', 'delivery')),
    source TEXT DEFAULT 'online' CHECK(source IN ('online', 'pos')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
    total_amount REAL NOT NULL,
    delivery_charge REAL DEFAULT 0,
    block TEXT,
    area TEXT,
    flat_number TEXT,
    room_number TEXT,
    special_instructions TEXT,
    table_number TEXT,
    guest_name TEXT,
    kot_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    menu_item_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
`);

// Migration: add new columns if they don't exist
const cols = db.prepare("PRAGMA table_info(menu_items)").all().map(c => c.name);
if (!cols.includes('available_dine_in')) {
  db.exec(`ALTER TABLE menu_items ADD COLUMN available_dine_in INTEGER DEFAULT 1`);
  db.exec(`ALTER TABLE menu_items ADD COLUMN available_takeaway INTEGER DEFAULT 1`);
  db.exec(`ALTER TABLE menu_items ADD COLUMN available_delivery INTEGER DEFAULT 1`);
  // Sync from existing 'available' column
  db.exec(`UPDATE menu_items SET available_dine_in = available, available_takeaway = available, available_delivery = available`);
  console.log('Migrated menu_items availability columns');
}

// Migration: add code column to menu_items
const menuCols = db.prepare("PRAGMA table_info(menu_items)").all().map(c => c.name);
if (!menuCols.includes('code')) {
  db.exec(`ALTER TABLE menu_items ADD COLUMN code INTEGER`);
  db.exec(`UPDATE menu_items SET code = id WHERE code IS NULL`);
  console.log('Migrated menu_items: added code column');
}

const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (!orderCols.includes('source')) {
  db.exec(`ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'online'`);
}
if (!orderCols.includes('table_number')) {
  db.exec(`ALTER TABLE orders ADD COLUMN table_number TEXT`);
}
if (!orderCols.includes('guest_name')) {
  db.exec(`ALTER TABLE orders ADD COLUMN guest_name TEXT`);
}
if (!orderCols.includes('kot_number')) {
  db.exec(`ALTER TABLE orders ADD COLUMN kot_number INTEGER`);
}
// Make user_id nullable for POS orders — recreate table if user_id is NOT NULL
if (orderCols.includes('user_id')) {
  const userIdInfo = db.prepare("PRAGMA table_info(orders)").all().find(c => c.name === 'user_id');
  if (userIdInfo && userIdInfo.notnull === 1) {
    console.log('Migrating orders table: making user_id nullable...');
    db.pragma('foreign_keys = OFF');
    db.exec(`DROP TABLE IF EXISTS orders_new`);
    db.exec(`CREATE TABLE orders_new (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      order_type TEXT NOT NULL,
      source TEXT DEFAULT 'online',
      status TEXT DEFAULT 'pending',
      total_amount REAL NOT NULL,
      delivery_charge REAL DEFAULT 0,
      block TEXT,
      area TEXT,
      flat_number TEXT,
      room_number TEXT,
      special_instructions TEXT,
      table_number TEXT,
      guest_name TEXT,
      kot_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.exec(`INSERT INTO orders_new (id, user_id, order_type, source, status, total_amount, delivery_charge, block, area, flat_number, room_number, special_instructions, created_at, updated_at)
      SELECT id, user_id, order_type, COALESCE(source,'online'), status, total_amount, delivery_charge, block, area, flat_number, room_number, special_instructions, created_at, updated_at FROM orders`);
    db.exec(`DROP TABLE orders`);
    db.exec(`ALTER TABLE orders_new RENAME TO orders`);
    db.pragma('foreign_keys = ON');
    console.log('Orders table migrated successfully');
  }
}

// Auto-seed from flavours_menu.json if database is empty (e.g. Render cold start)
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
if (catCount === 0) {
  console.log('Database empty — seeding from flavours_menu.json...');
  const menuPath = path.join(__dirname, '..', 'flavours_menu.json');
  if (fs.existsSync(menuPath)) {
    const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    const insertCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    const insertItem = db.prepare('INSERT INTO menu_items (category_id, name, description, price, image_url, available, available_dine_in, available_takeaway, available_delivery, code) VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1, ?)');
    const insertAdmin = db.prepare('INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)');

    let nextCode = 1;
    const seedAll = db.transaction(() => {
      let sortOrder = 0;
      for (const cat of menuData.categories) {
        insertCat.run(cat.category_name, sortOrder++);
        for (const item of cat.items) {
          const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
          const image = item.image && !item.image.includes('default.png') ? item.image : null;
          insertItem.run(cat.category_id, item.name, '', price, image, nextCode++);
        }
      }
      const adminPassword = bcrypt.hashSync('admin123', 10);
      insertAdmin.run('admin', adminPassword);
      insertAdmin.run('flavoursbob', adminPassword);
    });
    seedAll();
    console.log(`Seeded ${nextCode - 1} menu items from flavours_menu.json`);
  } else {
    console.error('flavours_menu.json not found — cannot seed');
  }
}

module.exports = db;
