const crypto = require('crypto');

// JWT-like HMAC-signed tokens (no external dependency).
// Payload: { sub, role, iat, exp } where sub is the user/admin id.

const SECRET = process.env.AUTH_SECRET || 'dev-only-insecure-secret';

function b64urlEncode(str) {
  return Buffer.from(str, 'utf8').toString('base64url');
}

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function sign(payload) {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verify(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const expected = crypto.createHmac('sha256', SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (expected !== parts[2]) return null;

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch (err) {
    return null;
  }

  if (!payload || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

// Issue a token. Default lifetime: 30 days for users, 24h for admins.
function issue(sub, role) {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = role === 'admin' ? 60 * 60 * 24 : 60 * 60 * 24 * 30;
  return sign({ sub, role, iat: now, exp: now + maxAge });
}

module.exports = { sign, verify, issue };
