const db = require('./db');

const COOLDOWN_MS = 30 * 1000;
const VALIDITY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getOtpRecord(phone) {
  const res = await db.doc.send(new db.GetCommand({ TableName: db.tables.otps, Key: { phone } }));
  return res.Item || null;
}

// Returns true when a new OTP may be issued for this phone.
async function canSend(phone) {
  const rec = await getOtpRecord(phone);
  if (rec && rec.sent_at && Date.now() - rec.sent_at < COOLDOWN_MS) return false;
  return true;
}

async function storeOtp(phone, otp) {
  const now = Date.now();
  await db.doc.send(
    new db.PutCommand({
      TableName: db.tables.otps,
      Item: {
        phone,
        otp,
        used: 0,
        attempts: 0,
        sent_at: now,
        expires_at: Math.floor((now + VALIDITY_MS) / 1000), // epoch seconds -> DynamoDB TTL
      },
    })
  );
}

async function verifyOtp(phone, otp) {
  const rec = await getOtpRecord(phone);
  if (!rec) return false;
  if (rec.used === 1) return false;
  if ((rec.attempts || 0) >= MAX_ATTEMPTS) return false;
  if (!rec.expires_at || rec.expires_at < Math.floor(Date.now() / 1000)) return false;
  if (String(rec.otp) !== String(otp)) {
    await db.doc.send(
      new db.UpdateCommand({
        TableName: db.tables.otps,
        Key: { phone },
        UpdateExpression: 'SET #a = :n',
        ExpressionAttributeNames: { '#a': 'attempts' },
        ExpressionAttributeValues: { ':n': (rec.attempts || 0) + 1 },
      })
    );
    return false;
  }

  await db.doc.send(
    new db.UpdateCommand({
      TableName: db.tables.otps,
      Key: { phone },
      UpdateExpression: 'SET #u = :one',
      ExpressionAttributeNames: { '#u': 'used' },
      ExpressionAttributeValues: { ':one': 1 },
    })
  );
  return true;
}

// The OTP is delivered in-app: the send-otp endpoint returns the code to the
// requesting client, which shows it as an in-app notification. Free, no SMS gateway.

module.exports = { generateOtp, canSend, storeOtp, verifyOtp };
