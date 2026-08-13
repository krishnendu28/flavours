const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
} = require('@aws-sdk/lib-dynamodb');

const clientConfig = {};
if (process.env.DYNAMODB_ENDPOINT) clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
if (process.env.AWS_REGION) clientConfig.region = process.env.AWS_REGION;

const client = new DynamoDBClient(clientConfig);
const doc = DynamoDBDocumentClient.from(client);

const prefix = process.env.TABLE_PREFIX || 'flavours-bob';
const tables = {
  users: process.env.USERS_TABLE || `${prefix}-users`,
  otps: process.env.OTPS_TABLE || `${prefix}-otps`,
  categories: process.env.CATEGORIES_TABLE || `${prefix}-categories`,
  menuItems: process.env.MENU_ITEMS_TABLE || `${prefix}-menu-items`,
  orders: process.env.ORDERS_TABLE || `${prefix}-orders`,
  admins: process.env.ADMINS_TABLE || `${prefix}-admins`,
  connections: process.env.CONNECTIONS_TABLE || `${prefix}-connections`,
  counters: process.env.COUNTERS_TABLE || `${prefix}-counters`,
};

// Atomic increment of a named counter. Returns the new value.
async function nextCounter(name) {
  const res = await doc.send(
    new UpdateCommand({
      TableName: tables.counters,
      Key: { name },
      UpdateExpression: 'ADD #v :inc',
      ExpressionAttributeNames: { '#v': 'value' },
      ExpressionAttributeValues: { ':inc': 1 },
      ReturnValues: 'UPDATED_NEW',
    })
  );
  return res.Attributes.value;
}

// Daily KOT number, e.g. kot:2026-08-13 -> 1, 2, 3 ...
async function nextKotNumber() {
  const today = new Date().toISOString().slice(0, 10);
  return nextCounter(`kot:${today}`);
}

module.exports = {
  doc,
  tables,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  nextCounter,
  nextKotNumber,
};
