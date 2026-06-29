import { APP_CONFIG, FIREBASE_CONFIG } from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const form = document.getElementById("request-form");
const toastEl = document.getElementById("request-toast");
const submitBtn = document.getElementById("btn-submit-request");
const typeSelect = document.getElementById("type");
const accessCodeWrap = document.getElementById("access-code-wrap");

const cooldownKey = "ngo:last-public-submit-at";

initForm();

form.addEventListener("submit", async event => {
  event.preventDefault();

  const formData = new FormData(form);
  const now = Date.now();
  const lastSubmitAt = Number(localStorage.getItem(cooldownKey) || "0");
  const cooldownMs = APP_CONFIG.PUBLIC_SUBMISSION_COOLDOWN_SECONDS * 1000;

  if (!APP_CONFIG.ENABLE_PUBLIC_INTAKE) {
    showToast("Public intake is temporarily disabled.");
    return;
  }

  if (formData.get("website")) {
    showToast("Submission blocked.");
    return;
  }

  if (APP_CONFIG.ENABLE_ACCESS_CODE_MODE &&
      String(formData.get("accessCode") || "") !== APP_CONFIG.INTAKE_ACCESS_CODE) {
    showToast("Invalid access code.");
    return;
  }

  if (now - lastSubmitAt < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - lastSubmitAt)) / 1000);
    showToast(`Please wait ${remaining}s before submitting again.`);
    return;
  }

  const payload = buildPayload(formData);
  const validationError = validatePayload(payload);
  if (validationError) {
    showToast(validationError);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const ref = await addDoc(collection(db, "requests"), {
      ...payload,
      status: "open",
      claimedBy: null,
      claimedByUid: null,
      claimedAt: null,
      completionNotes: null,
      completedAt: null,
      source: "hosted_form",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    localStorage.setItem(cooldownKey, String(now));
    form.reset();
    showToast(`Request submitted. Reference: ${ref.id}`);

    if (APP_CONFIG.ENABLE_ALERT_RELAY && APP_CONFIG.ALERT_RELAY_URL) {
      triggerAlertRelay({ ...payload, requestId: ref.id }).catch(err => {
        console.warn("Optional alert relay failed:", err);
      });
    }
  } catch (err) {
    console.error(err);
    showToast("Could not submit request. Please try again later.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit request";
  }
});

function initForm() {
  APP_CONFIG.REQUEST_TYPES.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });

  if (APP_CONFIG.ENABLE_ACCESS_CODE_MODE) {
    accessCodeWrap.classList.remove("hidden");
  }
}

function buildPayload(formData) {
  return {
    requesterName: String(formData.get("requesterName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    type: String(formData.get("type") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    urgency: String(formData.get("urgency") || "normal"),
    notes: String(formData.get("notes") || "").trim()
  };
}

function validatePayload(payload) {
  if (!payload.requesterName || payload.requesterName.length > 100) return "Enter a valid name.";
  if (!payload.phone || payload.phone.length > 20) return "Enter a valid phone number.";
  if (!payload.type || payload.type.length > 80) return "Select a request type.";
  if (!payload.address || payload.address.length > 300) return "Enter a valid address.";
  if (!["normal", "urgent"].includes(payload.urgency)) return "Select a valid urgency.";
  if (payload.notes.length > 1000) return "Notes are too long.";
  if (!document.getElementById("confirmTrueRequest").checked) {
    return "Please confirm this is a genuine request.";
  }
  return "";
}

async function triggerAlertRelay(payload) {
  const response = await fetch(APP_CONFIG.ALERT_RELAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(APP_CONFIG.ALERT_RELAY_SECRET
        ? { "x-alert-secret": APP_CONFIG.ALERT_RELAY_SECRET }
        : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Relay failed with status ${response.status}`);
  }
}

function showToast(msg, duration = 4000) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, duration);
}
