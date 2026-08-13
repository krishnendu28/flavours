// Expo Push Service client (HTTP/2 API, no auth required unless push security is enabled).
// https://docs.expo.dev/push-notifications/sending-notifications/

const PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const ACCESS_TOKEN = process.env.EXPO_PUSH_ACCESS_TOKEN || '';

// Best-effort push send. Resolves with the push ticket on a per-message error
// (so callers can react to e.g. DeviceNotRegistered), or null on success/failure.
async function sendPush(token, { title, body, data }) {
  if (!token) return null;

  const headers = { 'Content-Type': 'application/json' };
  if (ACCESS_TOKEN) headers.Authorization = `Bearer ${ACCESS_TOKEN}`;

  try {
    const res = await fetch(PUSH_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'orders',
      }),
    });

    const payload = await res.json().catch(() => ({}));
    const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    if (ticket && ticket.status === 'error') {
      console.warn('[push] ticket error:', ticket.message, ticket.details);
      return ticket;
    }
  } catch (err) {
    console.warn('[push] send failed:', err.message);
  }
  return null;
}

module.exports = { sendPush };
