// functions/index.js
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest }         = require('firebase-functions/v2/https');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. NOTIFY VOLUNTEERS — triggers when a new request document is created
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.notifyVolunteers = onDocumentCreated('requests/{requestId}', async event => {
  const requestId = event.params.requestId;
  const data      = event.data?.data();
  if (!data) return;

  // Fetch all volunteer FCM tokens
  const volunteersSnap = await db.collection('volunteers').get();
  const tokens = volunteersSnap.docs
    .map(d => d.data().fcmToken)
    .filter(Boolean);

  if (tokens.length === 0) {
    console.log('No volunteer tokens found — skipping push');
    return;
  }

  const urgencyLabel = data.urgency === 'urgent' ? '🚨 URGENT: ' : '🔔 New request: ';
  const message = {
    notification: {
      title: `${urgencyLabel}${data.type}`,
      body:  `${data.address} — ${data.requesterName}`
    },
    data: {
      requestId,
      type:    data.type    || '',
      urgency: data.urgency || 'normal'
    },
    android: {
      priority: data.urgency === 'urgent' ? 'high' : 'normal',
      notification: { sound: 'default', channelId: 'ngo_requests' }
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } }
    }
  };

  // Send in batches of 500 (FCM limit)
  const batchSize = 500;
  const results = [];
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    try {
      const resp = await getMessaging().sendEachForMulticast({ ...message, tokens: batch });
      results.push(resp);

      // Remove stale tokens (unregistered devices)
      const staleTokens = [];
      resp.responses.forEach((r, idx) => {
        if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
          staleTokens.push(batch[idx]);
        }
      });
      if (staleTokens.length > 0) await removeStaleTokens(staleTokens);
    } catch (err) {
      console.error('FCM batch error:', err);
    }
  }

  const total    = results.reduce((s, r) => s + r.successCount, 0);
  const failures = results.reduce((s, r) => s + r.failureCount, 0);
  console.log(`Push sent — success: ${total}, failed: ${failures}`);
});

async function removeStaleTokens(staleTokens) {
  const snap = await db.collection('volunteers').get();
  const batch = db.batch();
  snap.docs.forEach(d => {
    if (staleTokens.includes(d.data().fcmToken)) {
      batch.update(d.ref, { fcmToken: FieldValue.delete() });
    }
  });
  await batch.commit();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. WEBHOOK — receives POST from Google Apps Script on form submission
//    URL: https://<region>-<project>.cloudfunctions.net/formWebhook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.formWebhook = onRequest(
  { cors: false },   // Only called by Apps Script server-side, no CORS needed
  async (req, res) => {
    // ── Security: shared secret header ─────────────────────────────────────
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      console.warn('Webhook: invalid secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body;
    if (!body || !body.requesterName || !body.type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ── Sanitize & write to Firestore ───────────────────────────────────────
    const requestData = {
      requesterName: String(body.requesterName || '').trim().slice(0, 100),
      phone:         String(body.phone         || '').trim().slice(0, 20),
      type:          String(body.type          || '').trim().slice(0, 80),
      address:       String(body.address       || '').trim().slice(0, 300),
      urgency:       ['urgent', 'normal'].includes(body.urgency) ? body.urgency : 'normal',
      notes:         String(body.notes         || '').trim().slice(0, 1000),
      status:        'open',
      createdAt:     FieldValue.serverTimestamp(),
      updatedAt:     FieldValue.serverTimestamp(),
      claimedBy:     null,
      claimedByUid:  null,
      claimedAt:     null,
      completionNotes: null,
      // Source tracking
      source:        'google_form'
    };

    try {
      const ref = await db.collection('requests').add(requestData);
      console.log('Request created from webhook:', ref.id);
      return res.status(200).json({ success: true, requestId: ref.id });
    } catch (err) {
      console.error('Firestore write error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. PUBLIC STATUS API — read-only endpoint for embedding or public dashboards
//    GET https://<region>-<project>.cloudfunctions.net/publicStatus
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.publicStatus = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const snap = await db.collection('requests')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const requests = snap.docs.map(d => {
      const data = d.data();
      return {
        id:            d.id,
        type:          data.type,
        address:       data.address,
        urgency:       data.urgency,
        status:        data.status,
        claimedBy:     data.claimedBy || null,
        createdAt:     data.createdAt?.toDate()?.toISOString() || null,
        // Omit requester phone/name for privacy on public endpoint
      };
    });

    res.set('Cache-Control', 'public, max-age=30');  // 30-second cache
    return res.status(200).json({ requests, count: requests.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch' });
  }
});
