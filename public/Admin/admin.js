import { FIREBASE_CONFIG, APP_CONFIG } from "../firebase-config.js";
import { getAllRequestSchemaFields } from "../config/requestSchema.js";
import { JOB_SCHEMA, createJob } from "../config/jobSchema.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, collection, updateDoc, deleteDoc,
  serverTimestamp, writeBatch, query, orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const COLLECTION = APP_CONFIG.COLLECTION_NAME;

let currentUser = null;
let allDocsCache = []; // last analytics load, used for export
let rejectTargetId = null;

const screens = {
  auth: document.getElementById("screen-auth"),
  denied: document.getElementById("screen-denied"),
  admin: document.getElementById("screen-admin"),
};
const toastEl = document.getElementById("toast");

document.getElementById("btn-google-signin").addEventListener("click", () => {
  signInWithPopup(auth, new GoogleAuthProvider()).catch((err) =>
    showToast("Sign-in failed: " + err.message),
  );
});
document.getElementById("btn-signout").addEventListener("click", () => signOut(auth));
document.getElementById("btn-signout-denied").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) return showScreen("auth");

  const adminSnap = await getDoc(doc(db, "admins", user.uid));
  if (!adminSnap.exists()) return showScreen("denied");

  showScreen("admin");
  await Promise.all([loadPendingVolunteers(), loadOpenRequests()]);
});

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === name));
}

// ── 1. Volunteer approvals ─────────────────────────────────────────────────
async function loadPendingVolunteers() {
  const wrap = document.getElementById("pending-volunteers");
  wrap.innerHTML = "Loading…";

  const snap = await getDocs(collection(db, "volunteers"));
  const pending = snap.docs.filter((d) => d.data().approved !== true);

  if (pending.length === 0) {
    wrap.innerHTML = `<p class="admin-empty">No pending volunteers.</p>`;
    return;
  }

  wrap.innerHTML = "";
  pending.forEach((d) => {
    const v = d.data();
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div>
        <div class="admin-row-main">${esc(v.displayName || "(no name)")}</div>
        <div class="admin-row-sub">${esc(v.email || d.id)}</div>
      </div>
      <div class="admin-row-actions">
        <button class="btn btn-primary btn-sm" data-approve="${d.id}">Approve</button>
        <button class="btn btn-outline btn-sm" data-deny="${d.id}">Deny</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", () => approveVolunteer(btn.dataset.approve)),
  );
  wrap.querySelectorAll("[data-deny]").forEach((btn) =>
    btn.addEventListener("click", () => denyVolunteer(btn.dataset.deny)),
  );
}

async function approveVolunteer(uid) {
  try {
    await updateDoc(doc(db, "volunteers", uid), {
      approved: true,
      approvedBy: currentUser.displayName || currentUser.email || "Admin",
      approvedByUid: currentUser.uid,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast("Volunteer approved");
    loadPendingVolunteers();
  } catch (err) {
    showToast("Failed: " + err.message);
  }
}

async function denyVolunteer(uid) {
  if (!confirm("Remove this pending volunteer request? They can sign in again to reapply.")) return;
  try {
    await deleteDoc(doc(db, "volunteers", uid));
    showToast("Volunteer request removed");
    loadPendingVolunteers();
  } catch (err) {
    showToast("Failed: " + err.message);
  }
}

// ── 2. Reject requests ──────────────────────────────────────────────────────
async function loadOpenRequests() {
  const wrap = document.getElementById("open-requests");
  wrap.innerHTML = "Loading…";

  const snap = await getDocs(query(collection(db, COLLECTION), orderBy("createdAt", "desc")));
  const open = snap.docs.filter((d) => d.data().status === "open");

  if (open.length === 0) {
    wrap.innerHTML = `<p class="admin-empty">No open requests.</p>`;
    return;
  }

  wrap.innerHTML = "";
  open.forEach((d) => {
    const r = createJob(d.id, d.data());
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div>
        <div class="admin-row-main">${esc(r.bloodGroup)} — ${esc(r.patientName)}</div>
        <div class="admin-row-sub">${esc(r.hospitalName)}, ${esc(r.area)} · ${esc(r.primaryMobile)}</div>
      </div>
      <div class="admin-row-actions">
        <button class="btn btn-danger btn-sm" data-reject="${d.id}">Reject</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", () => openRejectSheet(btn.dataset.reject)),
  );
}

const rejectOverlay = document.getElementById("reject-overlay");
const rejectSheet = document.getElementById("reject-sheet");

function openRejectSheet(requestId) {
  rejectTargetId = requestId;
  document.getElementById("reject-reason").value = "Already resolved";
  document.getElementById("reject-note").value = "";
  rejectOverlay.classList.remove("hidden");
  rejectSheet.classList.remove("hidden");
  requestAnimationFrame(() => {
    rejectOverlay.classList.add("visible");
    rejectSheet.classList.add("visible");
  });
}

function closeRejectSheet() {
  rejectOverlay.classList.remove("visible");
  rejectSheet.classList.remove("visible");
  setTimeout(() => {
    rejectOverlay.classList.add("hidden");
    rejectSheet.classList.add("hidden");
    rejectTargetId = null;
  }, 280);
}

document.getElementById("btn-cancel-reject").addEventListener("click", closeRejectSheet);
rejectOverlay.addEventListener("click", closeRejectSheet);

document.getElementById("btn-confirm-reject").addEventListener("click", async () => {
  if (!rejectTargetId) return;
  const reason = document.getElementById("reject-reason").value;
  const note = document.getElementById("reject-note").value.trim();

  if (reason === "Other" && !note) {
    showToast("Add a note for \"Other\".");
    return;
  }

  try {
    await updateDoc(doc(db, COLLECTION, rejectTargetId), {
      status: "rejected",
      rejectedBy: currentUser.displayName || currentUser.email || "Admin",
      rejectedByUid: currentUser.uid,
      rejectedAt: serverTimestamp(),
      rejectionReason: reason,
      rejectionNote: note,
      updatedAt: serverTimestamp(),
    });
    showToast("Request rejected");
    closeRejectSheet();
    loadOpenRequests();
  } catch (err) {
    showToast("Failed: " + err.message);
  }
});

// ── 3. Analytics / Export / Archive ─────────────────────────────────────────
document.getElementById("btn-load-analytics").addEventListener("click", loadAnalytics);
document.getElementById("btn-export-csv").addEventListener("click", () => exportData("csv"));
document.getElementById("btn-export-json").addEventListener("click", () => exportData("json"));
document.getElementById("btn-clear-archived").addEventListener("click", clearArchivedRequests);

async function loadAnalytics() {
  const out = document.getElementById("analytics-output");
  out.innerHTML = "Loading…";

  const snap = await getDocs(collection(db, COLLECTION));
  allDocsCache = snap.docs.map((d) => createJob(d.id, d.data()));

  const byStatus = countBy(allDocsCache, "status");
  const byUrgency = countBy(allDocsCache, "urgency");
  const byBloodGroup = countBy(allDocsCache, "bloodGroup");

  const doneWithTimes = allDocsCache.filter(
    (r) => r.status === "done" && r.claimedAt?.toDate && r.completedAt?.toDate,
  );
  const avgHours = doneWithTimes.length
    ? (
        doneWithTimes.reduce(
          (sum, r) => sum + (r.completedAt.toDate() - r.claimedAt.toDate()) / 36e5,
          0,
        ) / doneWithTimes.length
      ).toFixed(1)
    : "—";

  const cards = [
    { label: "Total requests", value: allDocsCache.length },
    { label: "Open", value: byStatus.open || 0 },
    { label: "Claimed", value: byStatus.claimed || 0 },
    { label: "On the way", value: byStatus.on_the_way || 0 },
    { label: "Done", value: byStatus.done || 0 },
    { label: "Rejected", value: byStatus.rejected || 0 },
    { label: "Urgent", value: byUrgency.urgent || 0 },
    { label: "Avg. claim→done (hrs)", value: avgHours },
    ...Object.entries(byBloodGroup).map(([bg, n]) => ({ label: bg, value: n })),
  ];

  out.innerHTML = cards
    .map(
      (c) => `<div class="stat-card"><div class="stat-value">${c.value}</div><div class="stat-label">${esc(c.label)}</div></div>`,
    )
    .join("");

  document.getElementById("btn-export-csv").disabled = false;
  document.getElementById("btn-export-json").disabled = false;
  document.getElementById("btn-clear-archived").disabled = false;
}

function countBy(list, key) {
  return list.reduce((acc, item) => {
    const k = item[key] || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function exportData(format) {
  if (allDocsCache.length === 0) {
    showToast("Load analytics first.");
    return;
  }

  const rows = allDocsCache.map(flattenForExport);
  const filename = `ngo-requests-${new Date().toISOString().slice(0, 10)}.${format}`;
  const content = format === "csv" ? toCsv(rows) : JSON.stringify(rows, null, 2);
  const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${rows.length} records`);
}

function flattenForExport(job) {
  const flat = {};
  const allFields = [...getAllRequestSchemaFields(), ...JOB_SCHEMA];
  allFields.forEach((f) => {
    let v = job[f.id];
    if (v && typeof v.toDate === "function") v = v.toDate().toISOString();
    flat[f.id] = v ?? "";
  });
  flat.id = job.id;
  return flat;
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escapeCell(row[h])).join(",")));
  return lines.join("\n");
}

async function clearArchivedRequests() {
  const toDelete = allDocsCache.filter((r) => r.status === "done" || r.status === "rejected");
  if (toDelete.length === 0) {
    showToast("Nothing to clear.");
    return;
  }

  const confirmText = prompt(
    `This permanently deletes ${toDelete.length} done/rejected request(s) from Firestore.\n` +
      `Make sure you already exported them.\n\nType DELETE to confirm.`,
  );
  if (confirmText !== "DELETE") {
    showToast("Cancelled.");
    return;
  }

  try {
    for (let i = 0; i < toDelete.length; i += 450) {
      const chunk = toDelete.slice(i, i + 450);
      const batch = writeBatch(db);
      chunk.forEach((r) => batch.delete(doc(db, COLLECTION, r.id)));
      await batch.commit();
    }
    showToast(`Deleted ${toDelete.length} requests`);
    allDocsCache = [];
    document.getElementById("btn-export-csv").disabled = true;
    document.getElementById("btn-export-json").disabled = true;
    document.getElementById("btn-clear-archived").disabled = true;
    document.getElementById("analytics-output").innerHTML = "";
    loadOpenRequests();
  } catch (err) {
    showToast("Delete failed: " + err.message);
  }
}

// ── Utils ────────────────────────────────────────────────────────────────
function showToast(msg, duration = 3500) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, duration);
}

function esc(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}