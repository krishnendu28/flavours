const { ok } = require('../lib/http');

async function check() {
  return ok({ status: 'ok', timestamp: new Date().toISOString() });
}

module.exports = { check };
