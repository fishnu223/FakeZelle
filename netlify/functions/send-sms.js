const twilio = require('twilio');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function parseBody(event) {
  if (!event.body) return {};
  if (event.isBase64Encoded) {
    return JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'));
  }
  return JSON.parse(event.body);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = parseBody(event);
  } catch (e) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const to = String(payload.to || '').trim();
  const message = String(payload.message || '').trim();
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!to || !message) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing "to" or "message"' }) };
  }
  if (!/^\+[0-9]{7,15}$/.test(to)) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid "to" number (use E.164, e.g. +15551234567)' }) };
  }
  if (!accountSid || !authToken || !from) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'SMS not configured on server (check env vars)' }) };
  }
  if (message.length > 1600) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Message too long' }) };
  }

  const client = twilio(accountSid, authToken);
  try {
    const sent = await client.messages.create({ body: message, from, to });
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, sid: sent.sid }) };
  } catch (err) {
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: err.message || 'Twilio error' }) };
  }
};
