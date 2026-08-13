const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { ok, fail } = require('../lib/http');
const { issue } = require('../lib/token');
const otp = require('../otp');

async function findUserByPhone(phone) {
  const res = await db.doc.send(
    new db.QueryCommand({
      TableName: db.tables.users,
      IndexName: 'phone-index',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': phone },
    })
  );
  return (res.Items || [])[0] || null;
}

async function sendOtp({ body }) {
  const { phone } = body || {};
  if (!phone || String(phone).length < 10) {
    return fail('Valid phone number required', 400);
  }

  if (!(await otp.canSend(phone))) {
    return fail('Wait 30 seconds before requesting a new OTP', 429);
  }

  const code = otp.generateOtp();
  await otp.storeOtp(phone, code);

  // Delivered in-app (no SMS gateway): the client shows this as a notification.
  return ok({ success: true, message: 'OTP sent', otp: code });
}

async function verifyOtp({ body }) {
  const { phone, otp: code, name } = body || {};
  if (!phone || !code) {
    return fail('Phone and OTP required', 400);
  }

  if (!(await otp.verifyOtp(phone, code))) {
    return fail('Invalid or expired OTP', 401);
  }

  let user = await findUserByPhone(phone);
  if (!user) {
    user = {
      id: uuidv4(),
      name: name || 'Customer',
      phone,
      created_at: new Date().toISOString(),
    };
    await db.doc.send(new db.PutCommand({ TableName: db.tables.users, Item: user }));
  } else if (name && name !== user.name) {
    await db.doc.send(
      new db.UpdateCommand({
        TableName: db.tables.users,
        Key: { id: user.id },
        UpdateExpression: 'SET #n = :name',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: { ':name': name },
      })
    );
    user.name = name;
  }

  return ok({
    success: true,
    token: issue(user.id, 'user'),
    user: { id: user.id, name: user.name, phone: user.phone },
  });
}

module.exports = { sendOtp, verifyOtp };
