# Flavours BOB — AWS Lambda Backend

Serverless replacement for the original Express + Socket.IO + SQLite backend.
Built with the Serverless Framework, DynamoDB for storage, API Gateway REST for
HTTP and API Gateway WebSockets for real-time push.

## What changed vs the old backend

| Old (Express)              | New (Lambda)                          |
| -------------------------- | ------------------------------------- |
| `better-sqlite3` file DB   | DynamoDB tables                       |
| `socket.io`                | API Gateway WebSockets (`$connect`, `$default`, `$disconnect`) |
| Express router             | Single `api` Lambda + path router     |
| Long-running server        | Stateless functions (pay per request) |
| Serves `public/` frontend  | No static serving (use S3/CloudFront or Vercel) |

## Project layout

```
lambda/
├── serverless.yml          # infra: functions, tables, IAM, WS API
├── src/
│   ├── handler.js          # REST entry point + route table
│   ├── ws.js               # WebSocket connect/disconnect/default handlers
│   ├── broadcast.js        # pushes events to WebSocket connections
│   ├── db.js               # DynamoDB document client + table names + counters
│   ├── otp.js              # OTP generate/store/verify (delivered in-app)
│   ├── lib/                # http helpers + tiny path router
│   └── routes/             # health, auth, admin, menu, orders
└── scripts/
    ├── seed-data.js        # menu data (21 categories, ~350 items)
    └── seed.js             # seeds DynamoDB tables + admin users
```

## DynamoDB tables

All prefixed with `TABLE_PREFIX` (default `flavours-bob-`):

- `users` — `id` (PK), GSI on `phone`
- `otps` — `phone` (PK), TTL on `expires_at`
- `categories` — `id` (PK)
- `menu-items` — `id` (PK), GSI `category-index`
- `orders` — `id` (PK), GSIs `all-orders-index` (`pk` → `created_at`) and `user-orders-index` (`user_id` → `created_at`); items stored inline
- `admins` — `username` (PK), bcrypt password
- `connections` — `connectionId` (PK), TTL 24h, `rooms` = comma-joined string
- `counters` — atomic counters (`menu_item_id`, `menu_item_code`, `kot:YYYY-MM-DD`)

## Deploy

```bash
cd lambda
npm install
# copy .env.example to .env and set AUTH_SECRET / TABLE_PREFIX
npm run deploy            # stage: dev
npm run deploy:prod       # stage: prod
npm run seed              # populate menu + admins (needs AWS creds + deployed tables)
```

Deploy prints `ApiUrl` and `WsUrl` in the stack outputs.

### Local development

```bash
npm run offline
```

`serverless-offline` runs the REST API on `:3001` and the WebSocket API on
`:3002`. For DynamoDB, either let it hit AWS (needs credentials) or set
`DYNAMODB_ENDPOINT` in your environment to a local instance, e.g.:

```
DYNAMODB_ENDPOINT=http://localhost:8000
```

## Frontend integration

### REST API

Both web apps (`client-user`, `client-admin`) read `import.meta.env.VITE_API_URL`
(defaults to `/api`). For local development Vite proxies `/api` to the
`serverless-offline` REST API on `:3001`, so no env is needed. When building for
production, point it at the stack's `ApiUrl` output:

```
VITE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/<stage>
```

### Real-time (WebSockets)

`client-user` and `client-admin` connect with a native `WebSocket` client
(`client-user/src/contexts/SocketContext.jsx` and
`client-admin/src/contexts/SocketContext.jsx`) — no Socket.IO. Configure the
endpoint at build time:

```
VITE_WS_URL=wss://<ws-api-id>.execute-api.<region>.amazonaws.com/<stage>   # = WsUrl output
```

Local development: leave `VITE_WS_URL` unset (defaults to `ws://localhost:3002`,
the `serverless-offline` WebSocket API). Also set `WS_ENDPOINT=http://localhost:3002`
in `lambda/.env` so `broadcast()` can push events to the offline WS server.

Admin rooms require a valid admin JWT (token from `POST /api/admin/login`, kept
in `localStorage['flavours_token']`). The client sends it with the join action:

```js
ws.send(JSON.stringify({ action: 'join-admin', token: '<admin JWT>' }));
ws.send(JSON.stringify({ action: 'join-kitchen', token: '<admin JWT>' }));
```

Incoming messages are `{ event, data }` and are dispatched to handlers registered
with `on(event, handler)`. Event names and payload shapes are identical to the
old Socket.IO events, so page code (buzzer hook, order lists, menu live-update)
works unchanged:

| event                    | audience     |
| ------------------------ | ------------ |
| `new-order`              | everyone     |
| `order-updated`          | everyone     |
| `menu-updated`           | everyone     |
| `menu-item-added`        | everyone     |
| `menu-item-deleted`      | everyone     |
| `order-alert`            | admin room   |
| `kitchen-new-order`      | kitchen room |
| `kitchen-order-updated`  | kitchen room |

### Push notifications (Expo / mobile app)

The mobile app (`app-user/`) registers its Expo push token with the backend:

```
PUT /api/users/push-token   (auth: user)
{ "token": "ExponentPushToken[...]" }
```

The server then pushes to the user when an order is placed and on every status
change (`accepted`, `preparing`, `ready`, `completed`, `cancelled`). Notifications
carry `{ type: 'order', orderId }` in `data` so the app can deep-link to the
tracking screen. Sending goes through the [Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/)
(HTTP/2 API at `https://exp.host/--/api/v2/push/send`, no auth required by default).

- Set `EXPO_PUSH_ACCESS_TOKEN` in the environment if **Push Security** is enabled
  in your EAS project settings.
- If a device reports `DeviceNotRegistered`, the token is removed from the user
  record so we stop sending to it.

> Note: remote push requires an Expo **development build** (it no longer works in
> Expo Go on Android from SDK 53). The app degrades gracefully to in-app OTP
> notifications otherwise.

## Removed features

- Static file serving (`public/`) — host the built frontends on S3+CloudFront or
  Vercel and point them at the API.
- In-memory OTP cooldown — now stored in the `otps` table (`sent_at`).
- SQLite migrations — schema lives in `serverless.yml`; new columns require a
  table migration or a new GSI.
