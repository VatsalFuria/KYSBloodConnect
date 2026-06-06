# NGO Request System - Free Plan Setup Guide

This version is designed to run on Firebase Hosting + Firestore + Auth without deploying Cloud Functions.

## Important Warnings
- Do not run `firebase deploy` from an older config that still includes Functions on a Spark/free project.
- This architecture avoids Blaze costs by removing Firebase Functions from the active deployment path.
- Public intake increases spam risk. Keep the anti-abuse controls enabled.
- Optional email/Telegram alerts are best-effort only. If you expose the Apps Script relay to the browser, do not treat its shared secret as strong authentication.

## What Works On The Free Plan
- Volunteer web app on Firebase Hosting
- Google sign-in for volunteers
- Firestore as the request database
- Public hosted intake form at `/request.html`
- Realtime volunteer queue while the app is open
- Optional alert relay skeleton through Apps Script for email and Telegram

## What Is Intentionally Disabled By Default
- Firebase Cloud Functions deployment
- FCM/web push alerts
- Alert relay calls from the public intake page
- Email alerts
- Telegram alerts
- Access-code intake mode

These are controlled through flags in `public/firebase-config.js` and Apps Script properties.

## 1. Firebase Project Setup
1. Create or reuse a Firebase project.
2. Enable:
   - Authentication -> Google
   - Firestore Database
   - Hosting
3. Keep the project on the free/Spark plan.
4. Copy your web app config into `public/firebase-config.js`.

## 2. Deploy Firestore Rules And Hosting
From the project root:

```bash
firebase login
firebase use --add
firebase deploy --only hosting,firestore
```

This repo's `firebase.json` no longer includes an active Functions deployment block, which prevents accidental free-plan failures.

## 3. Public Intake Page
The public intake page is served at:

```text
/request.html
```

Behavior included by default:
- required-field validation
- honeypot field
- client-side cooldown using local storage
- explicit "real request" confirmation checkbox
- no public Firestore reads

## 4. Volunteer App
The volunteer app remains at:

```text
/
```

Behavior included by default:
- Google sign-in
- single realtime listener on `requests`
- recent requests only, capped through `MAX_ACTIVE_REQUESTS_QUERY`
- claim / on-the-way / done / drop transitions enforced by Firestore rules

## 5. Feature Flags
Edit `public/firebase-config.js`.

Safe defaults:
- `ENABLE_PUBLIC_INTAKE: true`
- `ENABLE_FCM: false`
- `ENABLE_ALERT_RELAY: false`
- `ENABLE_EMAIL_ALERTS: false`
- `ENABLE_TELEGRAM_ALERTS: false`
- `ENABLE_ACCESS_CODE_MODE: false`

Usage-control flags:
- `PUBLIC_SUBMISSION_COOLDOWN_SECONDS`
- `MAX_ACTIVE_REQUESTS_QUERY`

## 6. Optional Apps Script Alert Relay
Use `apps-script.js` only if you want email or Telegram alerts.

Suggested flow:
1. Open Google Apps Script.
2. Paste `apps-script.js`.
3. Run `setScriptProperties()` once.
4. Fill in:
   - `APP_URL`
   - `VOLUNTEER_EMAIL_LIST`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
5. Deploy the script as a web app if you want browser-triggered relay calls.
6. Then enable the matching flags in `public/firebase-config.js`.

### Security warning
If the browser calls the Apps Script relay directly, any shared secret used there is exposed to the client. This relay should be treated as an operational convenience, not a trusted server boundary.

## 7. Firestore Usage Protection
This repo is tuned to avoid unnecessary reads/writes:
- one primary volunteer listener
- recent-request query cap
- no public request list
- no polling loops
- no automatic Functions fanout
- optional alert relay is non-blocking

Operational guidance:
- keep `MAX_ACTIVE_REQUESTS_QUERY` low unless you truly need more history
- if spam appears, raise the cooldown and enable access-code mode
- if abuse becomes serious, disable public intake temporarily and tighten rules

## 8. Manual Verification
1. Deploy `hosting` and `firestore`.
2. Open `/request.html` and submit a valid request.
3. Confirm the request appears in Firestore.
4. Sign into `/` as a volunteer and confirm the request appears.
5. Claim it, mark it on the way, and complete it.
6. Confirm invalid direct writes are rejected by Firestore rules.
7. If using Apps Script relay, test it with `testRelay()` before enabling browser calls.
