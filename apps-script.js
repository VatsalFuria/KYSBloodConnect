// Optional alert relay for the free-plan architecture.
// This script is intentionally separated from Firestore writes:
// - Firestore remains the source of truth.
// - This relay is best-effort only for email/Telegram notifications.
// - If you expose this as a public Apps Script web app and call it from the browser,
//   do not treat the shared secret as a strong security boundary. It is client-visible.

function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    APP_URL: 'https://YOUR_PROJECT_ID.web.app/',
    ENABLE_EMAIL_ALERTS: 'false',
    ENABLE_TELEGRAM_ALERTS: 'false',
    VOLUNTEER_EMAIL_LIST: 'volunteers@example.org',
    TELEGRAM_BOT_TOKEN: 'BOT_TOKEN_HERE',
    TELEGRAM_CHAT_ID: 'CHAT_ID_HERE',
    ALERT_SHARED_SECRET: 'OPTIONAL_CLIENT_VISIBLE_SECRET'
  });
  Logger.log('Script properties saved.');
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('ALERT_SHARED_SECRET');
    const suppliedSecret = e?.parameter?.secret || getHeader_(e, 'x-alert-secret');

    if (secret && suppliedSecret !== secret) {
      return jsonResponse_(401, { ok: false, error: 'Unauthorized' });
    }

    const body = JSON.parse(e.postData.contents || '{}');
    const validationError = validateAlertPayload_(body);
    if (validationError) {
      return jsonResponse_(400, { ok: false, error: validationError });
    }

    if (isDuplicateAlert_(body.requestId)) {
      return jsonResponse_(200, { ok: true, duplicate: true });
    }

    if (props.getProperty('ENABLE_EMAIL_ALERTS') === 'true') {
      sendVolunteerEmailAlert_(props, body);
    }

    if (props.getProperty('ENABLE_TELEGRAM_ALERTS') === 'true') {
      sendTelegramAlert_(props, body);
    }

    markAlertSent_(body.requestId);
    return jsonResponse_(200, { ok: true });
  } catch (err) {
    Logger.log('Alert relay error: ' + err.toString());
    return jsonResponse_(500, { ok: false, error: 'Relay failed' });
  }
}

function testRelay() {
  const fakeRequest = {
    requestId: 'demo-request-1',
    requesterName: 'Test User',
    phone: '9876543210',
    type: 'Medicine delivery',
    address: '12 Test Street, Panvel',
    urgency: 'urgent',
    notes: 'Optional test note'
  };

  Logger.log(JSON.stringify(validateAlertPayload_(fakeRequest)));
  Logger.log(buildAlertMessage_(PropertiesService.getScriptProperties(), fakeRequest));
}

function sendVolunteerEmailAlert_(props, payload) {
  const to = props.getProperty('VOLUNTEER_EMAIL_LIST');
  if (!to) return;

  const subject = '[' + (payload.urgency === 'urgent' ? 'URGENT' : 'New') + '] NGO request: ' + payload.type;
  GmailApp.sendEmail(to, subject, buildAlertMessage_(props, payload));
}

function sendTelegramAlert_(props, payload) {
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;

  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  const message =
    (payload.urgency === 'urgent' ? 'URGENT REQUEST\n' : 'New request\n') +
    payload.type + '\n' +
    payload.address + '\n' +
    'Requester: ' + payload.requesterName + '\n' +
    'Phone: ' + payload.phone + '\n' +
    (payload.notes ? 'Notes: ' + payload.notes + '\n' : '') +
    'Open app: ' + normalizeAppUrl_(props.getProperty('APP_URL'));

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true
    }),
    muteHttpExceptions: true
  });
}

function buildAlertMessage_(props, payload) {
  return [
    'A new NGO request was submitted.',
    '',
    'Type: ' + payload.type,
    'Urgency: ' + payload.urgency,
    'Requester: ' + payload.requesterName,
    'Phone: ' + payload.phone,
    'Address: ' + payload.address,
    'Notes: ' + (payload.notes || '-'),
    '',
    'Request ID: ' + payload.requestId,
    'Volunteer app: ' + normalizeAppUrl_(props.getProperty('APP_URL'))
  ].join('\n');
}

function validateAlertPayload_(payload) {
  if (!payload || typeof payload !== 'object') return 'Missing payload';
  if (!payload.requestId || String(payload.requestId).length > 100) return 'Missing requestId';
  if (!payload.requesterName || String(payload.requesterName).length > 100) return 'Invalid requesterName';
  if (!payload.phone || String(payload.phone).length > 20) return 'Invalid phone';
  if (!payload.type || String(payload.type).length > 80) return 'Invalid type';
  if (!payload.address || String(payload.address).length > 300) return 'Invalid address';
  if (['normal', 'urgent'].indexOf(payload.urgency) === -1) return 'Invalid urgency';
  if (String(payload.notes || '').length > 1000) return 'Notes too long';
  return '';
}

function isDuplicateAlert_(requestId) {
  return CacheService.getScriptCache().get('alert:' + requestId) === '1';
}

function markAlertSent_(requestId) {
  CacheService.getScriptCache().put('alert:' + requestId, '1', 6 * 60 * 60);
}

function normalizeAppUrl_(url) {
  return url || 'https://YOUR_PROJECT_ID.web.app/';
}

function jsonResponse_(status, payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getHeader_(e, name) {
  const headers = e?.headers || {};
  const target = String(name || '').toLowerCase();
  for (const key in headers) {
    if (String(key).toLowerCase() === target) return headers[key];
  }
  return '';
}
