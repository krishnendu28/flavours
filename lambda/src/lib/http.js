const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
  };
}

const ok = (data, status = 200) => respond(status, data);
const fail = (error, status = 400) => respond(status, { error });

module.exports = { respond, ok, fail, CORS };
