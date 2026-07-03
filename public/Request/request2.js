// request2.js
// Handles the disclaimer → form → success flow, counter interactivity, and
// Firebase submission for request2.html.
// request2.html must load requestRender.js first (which renders the form),
// then this file.

import { FIREBASE_CONFIG, APP_CONFIG } from "../firebase-config.js";
import { REQUEST_SCHEMA } from "../config/requestSchema.js";
import { REQUEST_PAGE_CONFIG } from "../config/requestPageConfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDefaultJobData } from "../config/jobSchema.js";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const toastEl = document.getElementById("request-toast");
const cooldownKey = "ngo:last-blood-submit-at";

console.log("request.js loaded");

// ── Screens ──────────────────────────────────────────────────────────────
const screens = {
  disclaimer: document.getElementById("screen-disclaimer"),
  form: document.getElementById("screen-form"),
  success: document.getElementById("screen-success"),
};

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) =>
    el.classList.toggle("active", key === name),
  );
  window.scrollTo(0, 0);
}

// ── Disclaimer screen: render config + gate the continue button ──────────
const agreeCheckbox = document.getElementById("disclaimer-agree");
const continueBtn = document.getElementById("btn-disclaimer-continue");

function renderDisclaimer() {
  const cfg = REQUEST_PAGE_CONFIG.disclaimer;
  document.getElementById("disclaimer-kicker").textContent = cfg.kicker;
  document.getElementById("disclaimer-title").textContent = cfg.title;
  document.getElementById("disclaimer-intro").textContent = cfg.intro;

  const list = document.getElementById("disclaimer-points");
  list.innerHTML = "";
  cfg.points.forEach((point) => {
    const li = document.createElement("li");
    li.textContent = point;
    list.appendChild(li);
  });

  document.getElementById("disclaimer-agree-label").textContent =
    cfg.agreeLabel;
  continueBtn.textContent = cfg.continueLabel;
}

agreeCheckbox.addEventListener("change", () => {
  continueBtn.disabled = !agreeCheckbox.checked;
});

continueBtn.addEventListener("click", () => {
  if (!agreeCheckbox.checked) return;
  showScreen("form");
});

// ── Success screen: render config + reveal it after submission ───────────
function renderSuccessContent() {
  const cfg = REQUEST_PAGE_CONFIG.success;
  document.getElementById("success-title").textContent = cfg.title;
  document.getElementById("success-message").textContent = cfg.message;

  const list = document.getElementById("success-steps");
  list.innerHTML = "";
  cfg.steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    list.appendChild(li);
  });

  document.getElementById("success-support-note").textContent =
    cfg.supportNote ?? "";
  document.getElementById("btn-submit-another").textContent =
    cfg.submitAnotherLabel;
}

function showSuccessScreen(referenceId) {
  document.getElementById("success-reference").textContent = referenceId
    ? `Reference: ${referenceId}`
    : "";
  showScreen("success");
}

document.getElementById("btn-submit-another").addEventListener("click", () => {
  // Send back to the disclaimer rather than straight to the form —
  // reinforces "one submission per requirement" for anyone submitting
  // a second, different request in the same session.
  agreeCheckbox.checked = false;
  continueBtn.disabled = true;
  showScreen("disclaimer");
});

renderDisclaimer();
renderSuccessContent();

// ── Counter state ────────────────────────────────────────────────────────
// Mirrors the rendered <span> values since FormData can't read them.

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

// ── Form submission ──────────────────────────────────────────────────────
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
    if (APP_CONFIG.TEST) {
      console.log("Test mode: not submitting to Firestore.");
      console.log("Payload:", {
        ...getDefaultJobData(),
        ...payload,
        source: "blood_request_form",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      localStorage.setItem(cooldownKey, String(now));
      e.target.reset();
      resetCounters();
      showSuccessScreen("TEST-MODE");
      return;
    }

    const ref = await addDoc(collection(db, APP_CONFIG.COLLECTION_NAME), {
      ...getDefaultJobData(),
      ...payload,

      source: "blood_request_form",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    localStorage.setItem(cooldownKey, String(now));
    e.target.reset();
    resetCounters();
    showSuccessScreen(ref.id);
  } catch (err) {
    console.error(err);
    showToast(
      "Could not submit. Please try again. Error: " + (err.message || err),
    );
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
    setTimeout(() => toastEl.classList.add("hidden"), 300);
  }, duration);
}
