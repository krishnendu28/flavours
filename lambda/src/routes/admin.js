const bcrypt = require('bcryptjs');
const db = require('../db');
const { ok, fail } = require('../lib/http');
const { issue } = require('../lib/token');

async function login({ body }) {
  const { username, password } = body || {};
  const res = await db.doc.send(
    new db.GetCommand({ TableName: db.tables.admins, Key: { username: username || '' } })
  );
  const admin = res.Item;

  if (!admin || !bcrypt.compareSync(password || '', admin.password)) {
    return fail('Invalid credentials', 401);
  }

  return ok({
    success: true,
    token: issue(admin.id, 'admin'),
    admin: { id: admin.id, username: admin.username },
  });
}

module.exports = { login };
