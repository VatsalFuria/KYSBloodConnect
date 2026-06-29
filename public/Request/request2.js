// request2.js
// Handles counter interactivity and Firebase submission for request2.html.
// request2.html must load requestRender.js first (which renders the form),
// then this file.

import { FIREBASE_CONFIG, APP_CONFIG } from "../firebase-config.js";
import { REQUEST_SCHEMA } from "../config/requestSchema.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const toastEl = document.getElementById("request-toast");
const cooldownKey = "ngo:last-blood-submit-at";

// ── Counter state ────────────────────────────────────────────────────────────
// Mirrors the rendered <span> values since FormData can't read them.

console.log("request.js loaded");

const counterValues = {};

REQUEST_SCHEMA.sections.forEach((section) => {
  section.fields.forEach((field) => {
    if (field.type === "counter") {
      counterValues[field.id] = field.default ?? 0;
    }
  });
});

// Single delegated listener for all counter buttons (works even after render).
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-counter-field]");
  if (!btn) return;

  const fieldId = btn.dataset.counterField;
  const delta = btn.dataset.counterAction === "plus" ? 1 : -1;
  const field = findField(fieldId);
  const min = field?.min ?? 0;
  const max = field?.max ?? 99;

  counterValues[fieldId] = Math.min(
    Math.max((counterValues[fieldId] ?? 0) + delta, min),
    max,
  );

  const display = document.getElementById(fieldId);
  if (display) display.textContent = counterValues[fieldId];
});

// ── Form submission ──────────────────────────────────────────────────────────
// The form is created dynamically by requestRender.js which runs first.
// We attach via event delegation on document so timing is never an issue.
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "request-form") return;
  e.preventDefault();

  if (!APP_CONFIG.ENABLE_PUBLIC_INTAKE) {
    showToast("Blood request intake is temporarily disabled.");
    return;
  }

  const now = Date.now();
  const lastSubmitAt = Number(localStorage.getItem(cooldownKey) || "0");
  const cooldownMs = APP_CONFIG.PUBLIC_SUBMISSION_COOLDOWN_SECONDS * 1000;

  if (now - lastSubmitAt < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - lastSubmitAt)) / 1000);
    showToast(`Please wait ${remaining}s before submitting again.`);
    return;
  }

  const payload = collectPayload(new FormData(e.target));
  const error = validatePayload(payload);
  if (error) {
    showToast(error);
    return;
  }

  const submitBtn = e.target.querySelector("button[type=submit]");
  setSubmitting(submitBtn, true);

  try {
    console.log("Submitting payload:", payload);

    const ref = await addDoc(collection(db, "blood_requests"), {
      ...payload,
      status: "open",
      claimedBy: null,
      claimedByUid: null,
      claimedAt: null,
      completionNotes: null,
      completedAt: null,
      source: "blood_request_form",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    localStorage.setItem(cooldownKey, String(now));
    e.target.reset();
    resetCounters();
    showToast(`Submitted. Reference: ${ref.id}`);
  } catch (err) {
    console.error(err);
    showToast("Could not submit. Please try again.");
  } finally {
    setSubmitting(submitBtn, false);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function convertValue(field, raw) {
  switch (field.dataType) {
    case "string":
      return raw == null ? "" : String(raw).trim();

    case "int":
      return raw == null || raw === "" ? null : parseInt(raw, 10);

    case "float":
      return raw == null || raw === "" ? null : parseFloat(raw);

    case "boolean":
      return Boolean(raw);

    case "timestamp":
      return raw ? Timestamp.fromDate(new Date(raw)) : null;

    default:
      return raw;
  }
}

function collectPayload(formData) {
  const payload = {};

  REQUEST_SCHEMA.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === "counter") {
        payload[field.id] = counterValues[field.id];
        return;
      }

      if (field.type === "file") {
        payload[field.id] = null;
        return;
      }

      payload[field.id] = convertValue(field, formData.get(field.id));
    });
  });

  return payload;
}

function validatePayload(payload) {
  for (const section of REQUEST_SCHEMA.sections) {
    for (const field of section.fields) {
      if (!field.required || field.type === "counter" || field.type === "file")
        continue;
      if (!payload[field.id]) return `${field.label} is required.`;
    }
  }

  const totalUnits =
    (payload.pcvUnits ?? 0) + (payload.ffpUnits ?? 0) + (payload.sdpUnits ?? 0);
  if (totalUnits === 0)
    return "Specify at least one blood unit (PCV, FFP, or SDP).";

  if (payload.primaryMobile && !/^\d{10}$/.test(payload.primaryMobile)) {
    return "Primary mobile must be 10 digits.";
  }
  if (
    payload.alternateMobile &&
    payload.alternateMobile !== "" &&
    !/^\d{10}$/.test(payload.alternateMobile)
  ) {
    return "Alternate mobile must be 10 digits.";
  }

  return "";
}

function resetCounters() {
  REQUEST_SCHEMA.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type !== "counter") return;
      counterValues[field.id] = field.default ?? 0;
      const display = document.getElementById(field.id);
      if (display) display.textContent = counterValues[field.id];
    });
  });
}

function findField(id) {
  for (const section of REQUEST_SCHEMA.sections) {
    for (const field of section.fields) {
      if (field.id === id) return field;
    }
  }
  return null;
}

function setSubmitting(btn, isSubmitting) {
  if (!btn) return;
  btn.disabled = isSubmitting;
  btn.textContent = isSubmitting ? "Submitting…" : "Submit Request";
}

function showToast(msg, duration = APP_CONFIG.TOAST_DURATION * 1000) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, duration);
}
