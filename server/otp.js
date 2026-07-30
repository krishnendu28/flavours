const db = require('./db');

const API_KEY = process.env.FAST2SMS_API_KEY;
const BASE_URL = 'https://www.fast2sms.com/dev/bulkV2';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function storeOtp(phone, otp) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  // Mark any existing unexpired OTPs as used
  db.prepare("UPDATE otps SET used = 1 WHERE phone = ? AND used = 0 AND expires_at > datetime('now')").run(phone);
  db.prepare('INSERT INTO otps (phone, otp, expires_at) VALUES (?, ?, ?)').run(phone, otp, expiresAt);
}

function verifyOtp(phone, otp) {
  const row = db.prepare("SELECT * FROM otps WHERE phone = ? AND otp = ? AND used = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1").get(phone, otp);
  if (!row) return false;
  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(row.id);
  return true;
}

async function sendOtp(phone, otp) {
  const msg = `Your Flavours BOB verification OTP is: ${otp}. Valid for 5 minutes.`;

  if (!API_KEY) {
    console.log(`[OTP] ${phone} -> ${otp} (no FAST2SMS_API_KEY set, printing to console only)`);
    return;
  }

  try {
    const params = new URLSearchParams({
      sender_id: 'FSTSMS',
      message: msg,
      language: 'english',
      route: 'p',
      numbers: phone,
    });

    const res = await fetch(`${BASE_URL}?${params}`, {
      method: 'GET',
      headers: { authorization: API_KEY },
    });

    const data = await res.json();
    if (data.return !== true) {
      console.error(`[OTP] Fast2SMS send failed for ${phone}:`, data.message);
    } else {
      console.log(`[OTP] Sent to ${phone} via Fast2SMS (${otp})`);
    }
  } catch (err) {
    console.error(`[OTP] Fast2SMS error for ${phone}:`, err.message);
  }
}

module.exports = { generateOtp, storeOtp, verifyOtp, sendOtp };
