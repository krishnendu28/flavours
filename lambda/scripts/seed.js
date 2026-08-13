require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { categories, menuItems } = require('./seed-data');

async function setCounter(name, value) {
  await db.doc.send(new db.PutCommand({ TableName: db.tables.counters, Item: { name, value } }));
}

async function seed() {
  console.log('Seeding DynamoDB tables...');

  let catCount = 0;
  for (const cat of categories) {
    await db.doc.send(
      new db.PutCommand({
        TableName: db.tables.categories,
        Item: { id: cat.sort_order, name: cat.name, sort_order: cat.sort_order },
      })
    );
    catCount++;
  }

  let id = 1;
  let code = 1;
  const now = new Date().toISOString();
  for (const [catId, items] of Object.entries(menuItems)) {
    for (const item of items) {
      await db.doc.send(
        new db.PutCommand({
          TableName: db.tables.menuItems,
          Item: {
            id,
            category_id: Number(catId),
            name: item.name,
            description: item.desc,
            price: item.price,
            image_url: null,
            available: 1,
            available_dine_in: 1,
            available_takeaway: 1,
            available_delivery: 1,
            code,
            created_at: now,
          },
        })
      );
      id++;
      code++;
    }
  }

  await setCounter('menu_item_id', id - 1);
  await setCounter('menu_item_code', code - 1);

  const password = bcrypt.hashSync('admin123', 10);
  for (const username of ['admin', 'flavoursbob']) {
    await db.doc.send(
      new db.PutCommand({
        TableName: db.tables.admins,
        Item: { id: username, username, password },
      })
    );
  }

  console.log(`Seeding complete.`);
  console.log(`Categories: ${catCount}`);
  console.log(`Menu items: ${id - 1}`);
  console.log(`Admin login: admin / admin123`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
