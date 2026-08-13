const { matchRoute } = require('./lib/router');
const { respond, ok, fail } = require('./lib/http');
const { requireAuth } = require('./lib/auth');
const health = require('./routes/health');
const auth = require('./routes/auth');
const admin = require('./routes/admin');
const menu = require('./routes/menu');
const orders = require('./routes/orders');
const users = require('./routes/users');

// `auth: ['admin']` requires a valid admin token; `auth: ['user']` a user token.
const routes = [
  { method: 'GET', path: '/api/health', handler: health.check },

  { method: 'POST', path: '/api/auth/send-otp', handler: auth.sendOtp },
  { method: 'POST', path: '/api/auth/verify-otp', handler: auth.verifyOtp },

  { method: 'POST', path: '/api/admin/login', handler: admin.login },

  { method: 'GET', path: '/api/menu/categories', handler: menu.listCategories },
  { method: 'GET', path: '/api/menu/items', handler: menu.listItems },
  { method: 'GET', path: '/api/menu/items/:id', handler: menu.getItem },
  { method: 'PUT', path: '/api/menu/items/:id', handler: menu.updateItem, auth: ['admin'] },
  { method: 'POST', path: '/api/menu/items', handler: menu.createItem, auth: ['admin'] },
  { method: 'DELETE', path: '/api/menu/items/:id', handler: menu.deleteItem, auth: ['admin'] },

  { method: 'POST', path: '/api/orders', handler: orders.createOnline, auth: ['user'] },
  { method: 'GET', path: '/api/orders', handler: orders.listOrders, auth: ['admin'] },
  { method: 'GET', path: '/api/orders/user/:userId', handler: orders.getUserOrders, auth: ['user'] },
  { method: 'GET', path: '/api/orders/:id', handler: orders.getOrder, auth: ['user', 'admin'] },
  { method: 'PUT', path: '/api/orders/:id/status', handler: orders.updateStatus, auth: ['admin'] },

  { method: 'POST', path: '/api/pos/orders', handler: orders.createPos, auth: ['admin'] },

  { method: 'PUT', path: '/api/users/push-token', handler: users.savePushToken, auth: ['user'] },
];

function parseBody(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (err) {
    return {};
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, null);

  const match = matchRoute(event.httpMethod, event.path, routes);
  if (!match) return fail('Not found', 404);

  const ctx = {
    params: match.params,
    query: event.queryStringParameters || {},
    body: parseBody(event.body),
    headers: event.headers || {},
    auth: null,
  };

  try {
    if (match.auth) ctx.auth = requireAuth(match.auth, ctx);
    return await match.handler(ctx);
  } catch (err) {
    if (err.status) return fail(err.message, err.status);
    console.error('[api] handler error:', err);
    return fail('Internal server error', 500);
  }
};
