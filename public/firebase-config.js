// Firebase Console -> Project Settings -> Your apps -> SDK setup & configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBYJUPnri_lLMFqmZ2-sEKDki-TGqVSYSo",
  authDomain: "kys-blood-connect.firebaseapp.com",
  projectId: "kys-blood-connect",
  storageBucket: "kys-blood-connect.firebasestorage.app",
  messagingSenderId: "1017049020883",
  appId: "1:1017049020883:web:dc8ad0dea46d399944d726",
};

// Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY =
  "BLleJzQzSXP_uWUaWhY6M5BNRSK9KYksHtlrVTSGFgo6OwqJ1s61G4Q7EZ5u0vWNomjsgN5uBf3v2sDDctL72a8";

// Free-plan-safe feature flags. Keep risky/expensive integrations disabled by default.
const APP_CONFIG = {
  ENABLE_PUBLIC_INTAKE: true,

  ENABLE_FCM: false,
  ENABLE_ALERT_RELAY: false,
  ENABLE_EMAIL_ALERTS: false,
  ENABLE_TELEGRAM_ALERTS: false,
  ALERT_RELAY_URL: "",
  ALERT_RELAY_SECRET: "",

  PUBLIC_SUBMISSION_COOLDOWN_SECONDS: 300,
  MAX_ACTIVE_REQUESTS_QUERY: 100,
  LIMIT_REQUEST_QUERY: true,
  TOAST_DURATION: 8, // seconds
  COLLECTION_NAME: "blood_requests", //ALSO CHANGE IN FIRESTORE RULES

  TEST: false,
};

export { FIREBASE_CONFIG, VAPID_KEY, APP_CONFIG };
