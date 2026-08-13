const { verify } = require('./token');

function bearerToken(headers) {
  const raw = headers && (headers.Authorization || headers.authorization);
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1] : null;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Validates the Bearer token and returns its payload, or throws 401/403.
// roles: optional list of allowed roles, e.g. ['admin'].
function requireAuth(roles, ctx) {
  const payload = verify(bearerToken(ctx && ctx.headers));
  if (!payload) throw httpError(401, 'Authentication required');
  if (roles && !roles.includes(payload.role)) throw httpError(403, 'Forbidden');
  return payload;
}

module.exports = { bearerToken, requireAuth, httpError };
