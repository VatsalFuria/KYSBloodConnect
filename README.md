# KYS Blood Connect

A volunteer coordination platform for routing blood-donation requests to nearby
volunteers. Runs entirely on Firebase Hosting, Firestore, and Firebase
Authentication — no backend server and, by design, no Cloud Functions in the
active deployment path.

## Architecture

The app is three static front ends served from Firebase Hosting, all reading
and writing directly to Firestore through security rules (no application
server):

| Surface            | Path            | Access                             |
| ------------------ | --------------- | ---------------------------------- |
| Public intake form | `/request.html` | Unauthenticated                    |
| Volunteer app      | `/`             | Google sign-in, admin-approved     |
| Admin console      | `/admin.html`   | Google sign-in, admin doc required |

All data validation and access control lives in `firestore.rules` — the
client code never trusts its own writes. Every workflow transition (claim,
on-the-way, done, drop, reject) is an explicit, narrowly-scoped rule function
so that a compromised or buggy client can't move a request into an invalid
state.

The project deliberately avoids Cloud Functions to stay on Firebase's no-cost
Spark plan (Cloud Functions requires the Blaze plan even within its free
invocation quota). See [Known limitations](#known-limitations) for what that
trade-off costs in features, and the options for lifting it.

## Tech stack

- Vanilla JS (ES modules), no framework, no bundler
- Firebase Firestore, Authentication (Google), Hosting
- Firebase JS SDK v10 (Compat SDK only in the messaging service worker)
- Config-driven forms: `REQUEST_SCHEMA` and `JOB_SCHEMA` generate both the
  public intake form and the volunteer/admin detail views from a single
  field definition

## Project structure

public/
index.html, app.js, app.css — volunteer app
Admin/ — admin console
Request/ — public intake form (disclaimer → form → success)
config/
requestSchema.js — public-facing field definitions
jobSchema.js — volunteer-workflow field definitions
fieldRenderers.js — shared input renderers (edit mode)
brandConfig.js — NGO identity + theme (see Branding)
firebase-config.js — Firebase project config + feature flags
firebase-messaging-sw.js — FCM background handler (currently unused, see below)
manifest.json — PWA manifest
firestore.rules — all access control and data validation
firestore.indexes.json

## Getting started

```bash
npm install --save-dev firebase-tools @firebase/rules-unit-testing jest
firebase login
firebase use --add
firebase emulators:start
```

Open `http://localhost:5000` (volunteer app), `/admin.html`, and
`/Request/request2.html` against the emulator. See `SETUP.md` for the full
production deployment sequence and free-plan safeguards.

## Configuration

**Feature flags and app behavior** — `public/firebase-config.js`
(`ENABLE_PUBLIC_INTAKE`, `ENABLE_FCM`, `ENABLE_ALERT_RELAY`,
`PUBLIC_SUBMISSION_COOLDOWN_SECONDS`, `MAX_ACTIVE_REQUESTS_QUERY`, etc.)

**Branding and theme** — `public/config/brandConfig.js` controls the org
name, logo, banner, and the app's color palette via CSS custom-property
overrides. `manifest.json`, page `<title>` tags, and the icon PNGs under
`public/icons/` are static and must be edited by hand to match.

**Form schema** — `public/config/requestSchema.js` (public intake fields)
and `public/config/jobSchema.js` (volunteer workflow fields). Changing either
requires a matching update to `firestore.rules` — see the comment at the top
of `requestSchema.js`.

## Data model

Single collection: `blood_requests`. Documents move through
`open → claimed → on_the_way → done`, or `open → rejected`, enforced by
narrow, single-purpose functions in `firestore.rules`
(`isClaimTransition`, `isDoneTransition`, etc.) so that each action can only
touch the fields it owns.

Supporting collections: `volunteers` (approval status, FCM token),
`admins` (uid-keyed, written manually via console — no self-service admin
creation).

## Testing

- Manual test checklist and Firestore-rules unit tests: see `tests/` and the
  testing section of the project wiki / internal docs.
- Run rules tests with `npm run test:rules` (requires the Firestore emulator).

## Deployment

```bash
firebase deploy --only hosting,firestore
```

`firebase.json` intentionally has no active Functions deployment target.
Do not deploy from an older config that reintroduces one without first
reading [Known limitations](#known-limitations).

## Known limitations

**Push notifications.** `ENABLE_FCM` and the FCM service worker are scaffolded
but not wired to fire automatically on new requests, because that requires
either a Cloud Function (Blaze plan) or a client-triggered relay through
`apps-script.js` (stays on Spark, more moving parts, best-effort delivery).

**File uploads.** Firebase Cloud Storage now requires the Blaze plan for any
usage, including the free tier (this changed in late 2024/2025). The
`hospitalLetter` field in the schema is present but not wired to a working
upload path in the current build.

Both are addressed with concrete implementation options in the project's
architecture notes.

## License

Add your organization's preferred license here.
