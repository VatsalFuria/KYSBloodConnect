import { FIREBASE_CONFIG, VAPID_KEY, APP_CONFIG } from "./firebase-config.js";
import {
  JOB_SCHEMA,
  createJob,
  createTestJob,
  getCardFields,
} from "./config/jobSchema.js";
import { REQUEST_SCHEMA } from "./config/requestSchema.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let allRequests = [];
let activeFilter = "active";
let activeRequest = null;
let unsubscribeRequests = null;
let messaging = null;

const screenAuth = document.getElementById("screen-auth");
const screenPending = document.getElementById("screen-pending");
const screenApp = document.getElementById("screen-app");
const btnSignin = document.getElementById("btn-google-signin");
const btnSignout = document.getElementById("btn-signout");
const cardsWrap = document.getElementById("cards-container");
const emptyState = document.getElementById("empty-state");
const badgeCount = document.getElementById("badge-count");
const sheetOverlay = document.getElementById("sheet-overlay");
const detailSheet = document.getElementById("detail-sheet");
const btnCloseSheet = document.getElementById("btn-close-sheet");
const toastEl = document.getElementById("toast");
const alertBanner = document.getElementById("alert-banner");
const alertBannerCopy = document.getElementById("alert-banner-copy");
const btnDismissAlertBanner = document.getElementById(
  "btn-dismiss-alert-banner",
);

btnSignin.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch((err) =>
    showToast("Sign-in failed: " + err.message),
  );
});

btnSignout.addEventListener("click", () => {
  if (unsubscribeRequests) unsubscribeRequests();
  signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    if (checkVolunteerAccess(user)) {
      showScreen("app");
      startListening();
      maybeShowAlertBanner();
      await initOptionalMessaging();
    } else {
      showScreen("pending");
    }
  } else {
    showScreen("auth");

    if (APP_CONFIG.TEST) {
      showScreen("app");
      console.log("TEST MODE: creating a test job");
      allRequests = [
        createTestJob(1, "open", null, null),
        createTestJob(2, "claimed", "Test Volunteer", "test-volunteer-uid"),
      ];
      console.log("Test job created:", allRequests);
      renderList();
      updateBadge();
    }
  }
});

/**
 * Checks whether the signed-in user can access the volunteer dashboard.
 */
function checkVolunteerAccess(user) {
  //check if admin has provided access, else add in requests for admin to approve
  return true;
}

/**
 * Starts the live Firestore listener for request updates.
 */
function startListening() {
  if (unsubscribeRequests) unsubscribeRequests();

  const q = APP_CONFIG.LIMIT_REQUEST_QUERY
    ? query(
        collection(db, APP_CONFIG.COLLECTION_NAME),
        orderBy("createdAt", "desc"),
        limit(APP_CONFIG.MAX_ACTIVE_REQUESTS_QUERY),
      )
    : query(
        collection(db, APP_CONFIG.COLLECTION_NAME),
        orderBy("createdAt", "desc"),
        limit(999),
      );
  unsubscribeRequests = onSnapshot(
    q,
    (snap) => {
      allRequests = snap.docs.map((d) => createJob(d.id, d.data()));
      renderList();
      updateBadge();
    },
    () => showToast("Failed to load requests"),
  );
}

/**
 * Renders the request cards for the currently selected filter.
 * Each request gets its html, and appended.
 * Calls openSheet() when a card is clicked to show the detail sheet.
 */
function renderList() {
  const filtered =
    activeFilter === "all"
      ? allRequests
      : allRequests.filter((r) => {
          if (activeFilter === "active") {
            return (
              r.status === "open" ||
              r.status === "claimed" ||
              r.status === "on_the_way"
            );
          }
          // else if (activeFilter === "claimed") {
          //   return r.status === "claimed" || r.status === "on_the_way";
          // }
          return r.status === activeFilter;
        });

  cardsWrap.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filtered.forEach((req) => {
    const card = document.createElement("div");
    card.className = `card card-${req.status}`;
    card.innerHTML = renderCard(req);
    card.addEventListener("click", () => openSheet(req.id));
    cardsWrap.appendChild(card);
  });
}

function renderCard(req) {
  const fields = getCardFields();
  if (APP_CONFIG.TEST) console.log("Card fields:", fields);
  const byRole = Object.groupBy(fields, (f) => f.card.role);

  const title = (byRole.title || []).map((f) => req[f.id]).join("  |  ");
  const subtitle = (byRole.subtitle || []).map((f) => req[f.id]).join("  |  ");
  // const badges = (byRole.badge||[])
  //   .filter(f=>req[f.id])
  //   .map(f=>{
  //     const urgent = f.card.urgentIf?.(req[f.id]);
  //     return `<span class="urgency-badge ${urgent?'urgency-urgent':''}">${esc(req[f.id])}</span>`;
  //   }).join("");

  return `
    <div class="card-top">
      <span class="card-heading1">${esc(title)}</span>
      <span class="status-badge status-${req.status}">${statusLabel(req.status)}</span>
    </div>

    <div class="card-badges">
      ${req.bloodGroup.includes("-") ? `<span class="urgency-badge urgency-urgent">${esc(req.bloodGroup)}</span>` : ""}
    </div>


    <div class="card-meta">
      <span class="card-heading2">${esc(subtitle)}</span>
    </div>

    <div class="card-footer">
      <span class="card-time">${timeAgo(req.createdAt?.toDate?.())}</span>
      ${req.claimedBy ? `<div class="card-claimedBy">👤 ${esc(req.claimedBy)}</div>` : ""}
    </div>
  `;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderList();
  });
});

/**
 * Updates the open-request count badge.
 */
function updateBadge() {
  const openCount = allRequests.filter((r) => r.status === "open").length;
  badgeCount.textContent = "Open: " + openCount;
  badgeCount.classList.toggle("hidden", openCount === 0);
}

// /**
//  * Opens the detail sheet for a selected request.
//  * enables Volunteer actions
//  */
// function openSheet(requestId) {
//   const req = allRequests.find((r) => r.id === requestId);

//   if (!req) return;
//   activeRequest = req;

//   document.getElementById("d-type").textContent = req.bloodGroup;
//   const urgBadge = document.getElementById("d-urgency-badge");
//   urgBadge.textContent = req.urgency === "urgent" ? "Urgent" : "Normal";
//   urgBadge.className = `urgency-badge urgency-${req.urgency}`;

//   document.getElementById("d-name").textContent = req.patientName;
//   document.getElementById("d-phone").textContent = req.primaryMobile;
//   document.getElementById("d-address").textContent = req.area + ", " + req.hospitalName;

//   const notesRow = document.getElementById("d-notes-row");
//   if (req.remarks) {
//     document.getElementById("d-notes").textContent = req.remarks;
//     notesRow.classList.remove("hidden");
//   } else {
//     notesRow.classList.add("hidden");
//   }

//   const claimedRow = document.getElementById("d-claimed-row");
//   if (req.claimedBy) {
//     document.getElementById("d-claimed-by").textContent = req.claimedBy;
//     claimedRow.classList.remove("hidden");
//   } else {
//     claimedRow.classList.add("hidden");
//   }

//   document.getElementById("btn-call").href = `tel:${req.primaryMobile}`;
//   document.getElementById("btn-maps").href =
//     `https://maps.google.com/?q=${encodeURIComponent(req.area + ", " + req.hospitalName)}`;
//   document.getElementById("btn-whatsapp").href =
//     `https://wa.me/91${req.primaryMobile.replace(/\D/g, "")}`;

//   renderActions(req);

//   sheetOverlay.classList.remove("hidden");
//   detailSheet.classList.remove("hidden");
//   requestAnimationFrame(() => {
//     sheetOverlay.classList.add("visible");
//     detailSheet.classList.add("visible");
//   });
// }

function openSheet(requestId) {
  const job = allRequests.find((r) => r.id === requestId);

  if (!job) return;

  activeRequest = job;

  document.getElementById("sheet-title").textContent =
    `${job.bloodGroup} Blood Request`;

  const badge = document.getElementById("sheet-status-badge");

  badge.className = `status-badge status-${job.status}`;

  badge.textContent = statusLabel(job.status);

  renderSchemaSections(REQUEST_SCHEMA.sections, job);

  renderSchemaSections(
    [
      {
        id: "workflow",
        title: "Volunteer Workflow",
        fields: JOB_SCHEMA.filter((f) => f.detailVisible !== false),
      },
    ],
    job,
  );

  document.getElementById("btn-call").href = `tel:${job.primaryMobile}`;

  document.getElementById("btn-whatsapp").href =
    `https://wa.me/91${job.primaryMobile.replace(/\D/g, "")}`;

  document.getElementById("btn-maps").href =
    `https://maps.google.com/?q=${encodeURIComponent(
      `${job.hospitalName}, ${job.area}`,
    )}`;

  renderActions(job);

  sheetOverlay.classList.remove("hidden");
  detailSheet.classList.remove("hidden");

  requestAnimationFrame(() => {
    sheetOverlay.classList.add("visible");
    detailSheet.classList.add("visible");
  });
}

function renderSchemaSections(sections, job) {
  const container = document.getElementById("sheet-content");

  for (const section of sections) {
    const sectionEl = document.createElement("section");

    sectionEl.className = "detail-section";

    sectionEl.innerHTML = `<h3 class="detail-section-title">
                ${section.title}
            </h3>`;

    const grid = document.createElement("div");

    grid.className = "detail-grid";

    for (const field of section.fields) {
      grid.appendChild(
        createDetailRow(field, formatField(job[field.id], field)),
      );
    }

    sectionEl.appendChild(grid);

    container.appendChild(sectionEl);
  }
}

function createDetailRow(field, value) {
  const row = document.createElement("div");
  row.className = "detail-row" + (isLong(field) ? " full-width" : "");
  row.dataset.fieldId = field.id;

  const label = document.createElement("div");
  label.className = "detail-label";
  label.textContent = field.label;

  const display = document.createElement("div");
  const raw = value;
  display.className = "detail-value" + (raw === "—" ? " empty" : "");
  display.textContent = raw;

  row.appendChild(label);
  row.appendChild(display);

  return row;
}

function isLong(field) {
  return field.type === "textarea" || field.id === "hospitalName" || field.id === "requiredBefore";
}

function formatField(value, field) {
  if (value === null || value === undefined || value === "") return "—";

  switch (field.dataType) {
    case "timestamp":
      if (value.toDate) value = value.toDate();
      else if (value.seconds) value = new Date(value.seconds * 1000);

      return value.toLocaleString();

    default:
      return String(value);
  }
}

/**
 * Renders the available workflow actions for a request.
 */
function renderActions(req) {
  const area = document.getElementById("action-area");
  const notesWrap = document.getElementById("completion-notes-wrap");
  area.innerHTML = "";
  notesWrap.classList.add("hidden");

  const isMe = req.claimedByUid === currentUser?.uid;

  if (req.status === "open") {
    const btn = makeBtn("Claim this request", "btn-primary btn-block");
    btn.addEventListener("click", () => claimRequest(req.id));
    area.appendChild(btn);
  } else if (req.status === "claimed" && isMe) {
    notesWrap.classList.remove("hidden");

    const onWayBtn = makeBtn("Mark: On my way", "btn-outline btn-block");
    onWayBtn.addEventListener("click", () =>
      updateStatus(req.id, "on_the_way"),
    );
    area.appendChild(onWayBtn);

    const doneBtn = makeBtn("Mark as done", "btn-success btn-block");
    doneBtn.addEventListener("click", () => completeRequest(req.id));
    area.appendChild(doneBtn);

    const dropBtn = makeBtn("Drop claim", "btn-ghost btn-block");
    dropBtn.style.fontSize = "13px";
    dropBtn.addEventListener("click", () => dropClaim(req.id));
    area.appendChild(dropBtn);
  } else if (req.status === "claimed" && !isMe) {
    const info = document.createElement("p");
    info.style.cssText =
      "font-size:14px;color:#4b5563;text-align:center;padding:8px 0";
    info.textContent = `Claimed by ${req.claimedBy} - available if they drop it`;
    area.appendChild(info);
  } else if (req.status === "on_the_way" && isMe) {
    notesWrap.classList.remove("hidden");
    const doneBtn = makeBtn("Mark as done", "btn-success btn-block");
    doneBtn.addEventListener("click", () => completeRequest(req.id));
    area.appendChild(doneBtn);
  } else if (req.status === "done") {
    const info = document.createElement("p");
    info.style.cssText =
      "font-size:14px;color:#057a55;text-align:center;padding:8px 0;font-weight:600";
    info.textContent = "Completed";
    area.appendChild(info);
  }
}

/**
 * Creates a styled button element.
 */
function makeBtn(label, classes) {
  const b = document.createElement("button");
  b.className = `btn ${classes}`;
  b.textContent = label;
  return b;
}

btnCloseSheet.addEventListener("click", closeSheet);
sheetOverlay.addEventListener("click", closeSheet);

/**
 * Closes the request detail sheet and clears its temporary state.
 */
function closeSheet() {
  sheetOverlay.classList.remove("visible");
  detailSheet.classList.remove("visible");
  setTimeout(() => {
    sheetOverlay.classList.add("hidden");
    detailSheet.classList.add("hidden");
    document.getElementById("completion-notes").value = "";
    activeRequest = null;
  }, 280);
}

/**
 * Claims an open request for the current volunteer.
 */
async function claimRequest(requestId) {
  const btn = document.querySelector("#action-area .btn-primary");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Claiming...";
  }

  try {
    const ref = doc(db, APP_CONFIG.COLLECTION_NAME, requestId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Request not found");
      if (snap.data().status !== "open") throw new Error("Already claimed");

      tx.update(ref, {
        status: "claimed",
        claimedBy: currentUser.displayName || currentUser.email || "Volunteer",
        claimedByUid: currentUser.uid,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    showToast("Request claimed");
    closeSheet();
  } catch (err) {
    showToast(
      err.message === "Already claimed"
        ? "Someone else just claimed this - try another"
        : "Failed: " + err.message,
    );
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Claim this request";
    }
  }
}

/**
 * Updates the workflow status of a request.
 */
async function updateStatus(requestId, newStatus) {
  try {
    await updateDoc(doc(db, APP_CONFIG.COLLECTION_NAME, requestId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    showToast("Status updated");
    closeSheet();
  } catch (e) {
    showToast("Update failed");
  }
}

/**
 * Marks a request as completed with optional completion notes.
 */
async function completeRequest(requestId) {
  const notes = document.getElementById("completion-notes").value.trim();
  try {
    await updateDoc(doc(db, APP_CONFIG.COLLECTION_NAME, requestId), {
      status: "done",
      completionNotes: notes,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast("Marked as done");
    closeSheet();
  } catch (e) {
    showToast("Update failed");
  }
}

/**
 * Releases the current volunteer's claim and reopens the request.
 */
async function dropClaim(requestId) {
  if (!confirm("Drop your claim? It will go back to open.")) return;
  try {
    await updateDoc(doc(db, APP_CONFIG.COLLECTION_NAME, requestId), {
      status: "open",
      claimedBy: null,
      claimedByUid: null,
      claimedAt: null,
      updatedAt: serverTimestamp(),
    });
    showToast("Claim dropped");
    closeSheet();
  } catch (e) {
    showToast("Failed");
  }
}

/**
 * Initializes Firebase Cloud Messaging for volunteer alerts. Disabled, not configured because free plan limit.
 */
async function initOptionalMessaging() {
  if (!APP_CONFIG.ENABLE_FCM || !currentUser || !("serviceWorker" in navigator))
    return;

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );
    const messagingSdk =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");
    messaging = messagingSdk.getMessaging(app);

    if (Notification.permission === "granted") {
      await saveVolunteerToken(registration, messagingSdk.getToken);
    }

    messagingSdk.onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      showToast(`Alert: ${title || "New request"}${body ? ` - ${body}` : ""}`);
    });
  } catch (err) {
    console.warn("Optional FCM init failed:", err);
  }
}

/**
 * Saves the current volunteer's FCM token to Firestore.
 */
async function saveVolunteerToken(registration, getTokenFn) {
  try {
    const token = await getTokenFn(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    const tokenKey = `ngo:fcm:${currentUser.uid}`;
    if (localStorage.getItem(tokenKey) === token) return;

    await setDoc(
      doc(db, "volunteers", currentUser.uid),
      {
        fcmToken: token,
        displayName: currentUser.displayName || "",
        email: currentUser.email || "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    localStorage.setItem(tokenKey, token);
  } catch (err) {
    console.warn("Failed to persist FCM token:", err);
  }
}

/**
 * Shows the alert-delivery banner when it has not been dismissed.
 */
function maybeShowAlertBanner() {
  if (
    !alertBanner ||
    localStorage.getItem("ngo:alert-banner-dismissed") === "1"
  )
    return;

  const channels = [];
  if (APP_CONFIG.ENABLE_EMAIL_ALERTS) channels.push("email");
  if (APP_CONFIG.ENABLE_TELEGRAM_ALERTS) channels.push("Telegram");

  if (channels.length > 0) {
    alertBannerCopy.textContent = `Alerts are delivered through ${channels.join(" and ")}. Keep the app open for the live queue.`;
  } else {
    alertBannerCopy.textContent =
      "Mobile push is off on the free plan. Keep the app open for live updates, or enable the optional alert relay in config.";
  }

  alertBanner.classList.remove("hidden");
}

btnDismissAlertBanner?.addEventListener("click", () => {
  localStorage.setItem("ngo:alert-banner-dismissed", "1");
  alertBanner.classList.add("hidden");
});

/**
 * Switches the visible top-level screen.
 */
function showScreen(name) {
  screenAuth.classList.toggle("active", name === "auth");
  screenPending.classList.toggle("active", name === "pending");
  screenApp.classList.toggle("active", name === "app");
}

/**
 * Displays a temporary toast message.
 */
function showToast(msg, duration = 3000) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, duration);
}

/**
 * Escapes text for safe insertion into HTML templates.
 */
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Converts a request status code into display text.
 */
function statusLabel(status) {
  return (
    {
      open: "Open",
      claimed: "Claimed",
      on_the_way: "On the way",
      done: "Done",
    }[status] || status
  );
}

/**
 * Formats a date as a short relative time.
 */
function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// app.js — edit mode
import { renderInput } from "./config/fieldRenderers.js";

let editing = false;
const btnEditSheet = document.getElementById("btn-edit-sheet");
const editBar = document.getElementById("sheet-edit-bar");
const editableFields = getAllRequestSchemaFields(REQUEST_SCHEMA); // volunteer can edit request fields

btnEditSheet.addEventListener("click", () => {
  editing ? cancelEdit() : enterEdit();
});

function enterEdit() {
  if (!activeRequest) return;
  editing = true;
  editBar.classList.remove("hidden");

  editableFields.forEach(field => {
    const row = document.querySelector(`.detail-row[data-field-id="${field.id}"]`);
    if (!row) return;
    row.classList.add("editing");
    const html = renderInput(field, activeRequest[field.id]);
    if (!html) return; // e.g. file fields
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    row.appendChild(wrap.firstElementChild);
  });
}

function cancelEdit() {
  editing = false;
  editBar.classList.add("hidden");
  document.querySelectorAll(".detail-row.editing").forEach(row => {
    row.classList.remove("editing");
    row.querySelectorAll("input, select, textarea, .counter").forEach(el => el.remove());
  });
}

document.getElementById("btn-cancel-edit").addEventListener("click", cancelEdit);

document.getElementById("btn-save-edit").addEventListener("click", async () => {
  const updates = {};
  editableFields.forEach(field => {
    const el = document.getElementById(`edit-${field.id}`);
    if (!el) return;
    if (field.type === "counter") {
      updates[field.id] = parseInt(el.textContent, 10);
    } else if (field.type === "number") {
      updates[field.id] = el.value === "" ? null : parseInt(el.value, 10);
    } else if (field.type === "datetime") {
      updates[field.id] = el.value ? Timestamp.fromDate(new Date(el.value)) : null;
    } else {
      updates[field.id] = el.value.trim();
    }
  });

  try {
    await updateDoc(doc(db, APP_CONFIG.COLLECTION_NAME, activeRequest.id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    showToast("Request updated");
    cancelEdit();
    closeSheet();
  } catch (e) {
    showToast("Update failed: " + e.message);
  }
});

// counter +/- inside edit mode
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-edit-counter]");
  if (!btn) return;
  const span = document.getElementById(`edit-${btn.dataset.editCounter}`);
  const delta = btn.dataset.action === "plus" ? 1 : -1;
  span.textContent = Math.max(0, parseInt(span.textContent, 10) + delta);
});

btnEditSheet.classList.toggle("hidden", activeRequest.status === "claimed");
