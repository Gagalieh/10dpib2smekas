// admin.js — Final integrated admin script for Admin — Kelas 11 DPIB 2
// - Compatible with the provided admin.html
// - Requires: config.js exporting `export const supabase = createClient(...)`
// - Features: auth, batch upload, quick upload, compress, manage photos (edit/delete/bulk), tags (add/rename/delete), news, events, memories (add/edit/delete + uploads), site settings, storage monitor, help
// - Enforces per-file upload limit (50 MB) and safe checks to avoid uncaught null errors
// - Exposes adminHelpers on window for debugging
//
// Install: place next to admin.html and config.js. Use modern browsers (ES modules).
//
// Author: assistant (adapted to user's requirements)

import { supabase } from "./config.js";
window.supabase = supabase; // expose for console debugging

/* =========================
   Configuration / Constants
   ========================= */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB per file
const PHOTO_BUCKET = "photos";
const NEWS_BUCKET = "news";
const MEMORIES_BUCKET = "memories2";

/* =========================
   Small utilities
   ========================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const safe = (v) => (v === undefined || v === null ? "" : v);
const fmtBytes = (b) => {
  if (!b) return "0 B";
  const units = ["B","KB","MB","GB","TB"];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(2)} ${units[i]}`;
};
const sanitizeFilename = (n) => (n || "").replace(/\s+/g, "_").replace(/[^\w\-.()]/g, "");
function toast(msg, type = "info", ms = 3500) {
  try {
    const root = document.getElementById("toasts") || document.body;
    const d = document.createElement("div");
    d.className = `admin-toast admin-toast-${type}`;
    d.textContent = msg;
    Object.assign(d.style, { position: "fixed", right: "18px", bottom: 18 + (type === "error" ? 0 : 0) + "px", zIndex: 99999, padding: "8px 12px", borderRadius: "8px", background: type === "error" ? "#FF6B6B" : type === "success" ? "#4BE3A2" : "#2b2f36", color: "#021018", fontWeight: 700 });
    root.appendChild(d);
    setTimeout(() => d.style.opacity = "0", ms - 300);
    setTimeout(() => d.remove(), ms);
  } catch (e){ console.warn("toast failed", e); }
}

/* =========================
   DOM references (match admin.html)
   ========================= */
const hamburger = $("#hamburger");
const sidebar = $("#sidebar");
const openLoginBtn = $("#openLoginBtn");
const logoutBtn = $("#logoutBtn");
const loginOverlay = $("#loginOverlay");
const loginEmail = $("#loginEmail");
const loginPassword = $("#loginPassword");
const loginBtn = $("#loginBtn");
const loginCloseBtn = $("#loginCloseBtn");
const statusSummary = $("#statusSummary");

const panelIds = [
  "panelDashboard","panelAddPhoto","panelManagePhotos","panelTags",
  "panelNews","panelEvents","panelMemories","panelSiteSettings",
  "panelStorage","panelHelp"
];

const statPhotos = $("#statPhotos");
const statNews = $("#statNews");
const statEvents = $("#statEvents");
const statMemories = $("#statMemories");
const storagePhotosBar = $("#storagePhotosBar");
const storageNewsBar = $("#storageNewsBar");
const storagePhotosText = $("#storagePhotosText");
const storageNewsText = $("#storageNewsText");

const quickFile = $("#quickFile");
const quickUploadBtn = $("#quickUploadBtn");

const photoFiles = $("#photoFiles");
const prepareBatchBtn = $("#prepareBatch");
const batchDetail = $("#batchDetail");

const manageSearch = $("#manageSearch");
const manageFilterTag = $("#manageFilterTag");
const manageSearchBtn = $("#manageSearchBtn");
const manageClearBtn = $("#manageClearBtn");
const managePhotosList = $("#managePhotosList");
const managePrev = $("#managePrev");
const manageNext = $("#manageNext");
const managePageInfo = $("#managePageInfo");
const managePager = $("#managePhotosPager");
const bulkSelectToggle = $("#bulkSelectToggle");
const bulkTagBtn = $("#bulkTagBtn");
const bulkDeleteBtn = $("#bulkDeleteBtn");

const newTagInput = $("#newTagInput");
const addTagBtn = $("#addTagBtn");
const tagListArea = $("#tagListArea");

const newsTitle = $("#newsTitle");
const newsContent = $("#newsContent");
const newsCover = $("#newsCover");
const addNewsBtn = $("#addNewsBtn");
const clearNewsBtn = $("#clearNewsBtn");
const newsListArea = $("#newsListArea");

const eventTitle = $("#eventTitle");
const eventDate = $("#eventDate");
const addEventBtn = $("#addEventBtn");
const clearEventBtn = $("#clearEventBtn");
const eventsListArea = $("#eventsListArea");

const memoryTitle = $("#memoryTitle");
const memoryDesc = $("#memoryDesc");
const memoryFiles = $("#memoryFiles");
const memoryDate = $("#memoryDate");
const memoryOrder = $("#memoryOrder");
const addMemoryBtn = $("#addMemoryBtn");
const clearMemoryBtn = $("#clearMemoryBtn");
const memoriesListArea = $("#memoriesListArea");
const memoriesAdminList = $("#memoriesAdminList");

const siteHeroTitle = $("#siteHeroTitle");
const siteHeroSubtitle = $("#siteHeroSubtitle");
const siteHeroImage = $("#siteHeroImage");
const saveHeroBtn = $("#saveHeroBtn");
const resetHeroBtn = $("#resetHeroBtn");
const siteFooterText = $("#siteFooterText");
const saveFooterBtn = $("#saveFooterBtn");
const resetFooterBtn = $("#resetFooterBtn");

const helpContent = $("#helpContent");

/* =========================
   State
   ========================= */
let tagsCache = [];
let photosCache = [];
let managePage = 1;
const PER_PAGE = 24;
let bulkSelecting = false;
let bulkSelectedIds = new Set();

/* =========================
   UI Init
   ========================= */
function initUI() {
  // feather icons
  if (window.feather) feather.replace();

  hamburger?.addEventListener("click", () => sidebar?.classList.toggle("open"));
  openLoginBtn?.addEventListener("click", showLogin);
  loginCloseBtn?.addEventListener("click", hideLogin);
  loginBtn?.addEventListener("click", handleLogin);
  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    toast("Logout", "success");
    logoutBtn.style.display = "none"; openLoginBtn.style.display = "inline-block";
    showLogin();
  });

  $$(".menu-item").forEach(btn => btn.addEventListener("click", (e) => {
    $$(".menu-item").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.dataset.panel;
    if (panel) showPanel(panel);
  }));

  quickUploadBtn?.addEventListener("click", quickUploadHandler);
  prepareBatchBtn?.addEventListener("click", prepareBatch);
  manageSearchBtn?.addEventListener("click", () => { managePage = 1; renderManagePhotos(); });
  manageClearBtn?.addEventListener("click", () => { if (manageSearch) manageSearch.value=""; if (manageFilterTag) manageFilterTag.value=""; managePage=1; renderManagePhotos(); });
  managePrev?.addEventListener("click", () => { if (managePage > 1) { managePage--; renderManagePhotos(); }});
  manageNext?.addEventListener("click", () => { managePage++; renderManagePhotos(); });

  bulkSelectToggle?.addEventListener("click", toggleBulkSelect);
  bulkTagBtn?.addEventListener("click", bulkTagDialog);
  bulkDeleteBtn?.addEventListener("click", bulkDeleteConfirm);

  addTagBtn?.addEventListener("click", handleAddTag);
  addNewsBtn?.addEventListener("click", handleAddNews);
  addEventBtn?.addEventListener("click", handleAddEvent);
  addMemoryBtn?.addEventListener("click", handleAddMemory);

  saveHeroBtn?.addEventListener("click", handleSaveHero);
  saveFooterBtn?.addEventListener("click", handleSaveFooter);

  manageFilterTag?.addEventListener("change", () => { managePage = 1; renderManagePhotos(); });

  // default view
  document.querySelector('.menu-item[data-panel="panelDashboard"]')?.classList.add("active");
}

/* =========================
   Panels
   ========================= */
function hideAllPanels() {
  panelIds.forEach(id => {
    const el = $(`#${id}`);
    if (el) el.classList.add("hide");
  });
}
function showPanel(panelId) {
  hideAllPanels();
  const el = $(`#${panelId}`);
  if (!el) return;
  el.classList.remove("hide");
  switch (panelId) {
    case "panelDashboard": loadDashboard(); break;
    case "panelManagePhotos": loadManagePhotos(); break;
    case "panelTags": loadTags(); break;
    case "panelNews": loadNews(); break;
    case "panelEvents": loadEvents(); break;
    case "panelMemories": loadMemoriesAdmin(); break;
    case "panelSiteSettings": loadSiteSettings(); break;
    case "panelStorage": loadStorage(); break;
    case "panelHelp": loadHelp(); break;
    default: break;
  }
}

/* =========================
   Auth
   ========================= */
function showLogin() { if (loginOverlay) { loginOverlay.classList.remove("hide"); loginOverlay.style.display = "grid"; if (loginEmail) loginEmail.focus(); } }
function hideLogin() { if (loginOverlay) { loginOverlay.classList.add("hide"); loginOverlay.style.display = "none"; } }

async function handleLogin() {
  const email = loginEmail?.value?.trim();
  const password = loginPassword?.value;
  if (!email || !password) { toast("Isi email & password", "error"); return; }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { throw error; }
    toast("Login berhasil", "success");
    hideLogin();
    logoutBtn.style.display = "inline-block"; openLoginBtn.style.display = "none";
    await refreshAll();
  } catch (err) {
    console.error("login error", err);
    toast("Login gagal: " + (err.message || err), "error");
  }
}

/* =========================
   Dashboard & Storage
   ========================= */
async function loadDashboard() {
  try {
    const [p, n, e, m] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact" }),
      supabase.from("news").select("id", { count: "exact" }),
      supabase.from("events").select("id", { count: "exact" }),
      supabase.from("memories").select("id", { count: "exact" })
    ]);
    statPhotos && (statPhotos.textContent = p?.count ?? 0);
    statNews && (statNews.textContent = n?.count ?? 0);
    statEvents && (statEvents.textContent = e?.count ?? 0);
    statMemories && (statMemories.textContent = m?.count ?? 0);
    await loadStorage();
  } catch (err) { console.error("loadDashboard", err); }
}

async function loadStorage() {
  try {
    // list limited to 10000 - adjust if needed
    const photosRes = await supabase.storage.from(PHOTO_BUCKET).list("", { limit: 10000 }).catch(()=>({ data: [] }));
    const newsRes = await supabase.storage.from(NEWS_BUCKET).list("", { limit: 10000 }).catch(()=>({ data: [] }));
    const memRes = await supabase.storage.from(MEMORIES_BUCKET).list("", { limit: 10000 }).catch(()=>({ data: [] }));

    const photos = photosRes.data || [];
    const news = newsRes.data || [];
    const mems = memRes.data || [];

    const totalPhotos = photos.reduce((s, f) => s + (f?.metadata?.size || 0), 0);
    const totalNews = news.reduce((s, f) => s + (f?.metadata?.size || 0), 0);
    const totalMem = mems.reduce((s, f) => s + (f?.metadata?.size || 0), 0);

    const freeLimit = 500 * 1024 * 1024; // sample 500MB free-limit estimate
    if (storagePhotosBar) storagePhotosBar.style.width = `${Math.min((totalPhotos / freeLimit) * 100, 100)}%`;
    if (storageNewsBar) storageNewsBar.style.width = `${Math.min((totalNews / freeLimit) * 100, 100)}%`;
    if (storagePhotosText) storagePhotosText.textContent = fmtBytes(totalPhotos + totalMem);
    if (storageNewsText) storageNewsText.textContent = fmtBytes(totalNews);
  } catch (err) { console.error("loadStorage", err); }
}

/* =========================
   Tags
   ========================= */
async function loadTags() {
  try {
    const { data, error } = await supabase.from("tags").select("*").order("name", { ascending: true });
    if (error) throw error;
    tagsCache = (data || []).map(x => x.name);
    if (tagListArea) {
      tagListArea.innerHTML = "";
      (data || []).forEach(t => {
        const wrap = document.createElement("div");
        wrap.className = "tag-item";
        wrap.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${t.name}</strong> <span class="small muted">${t.created_at?new Date(t.created_at).toLocaleString():""}</span></div>
          <div style="display:flex;gap:8px"><button class="btn ghost btn-rename-tag" data-name="${t.name}">Rename</button><button class="btn ghost btn-delete-tag" data-name="${t.name}">Delete</button></div></div>`;
        tagListArea.appendChild(wrap);
      });
      $$(".btn-delete-tag").forEach(b => b.addEventListener("click", onDeleteTag));
      $$(".btn-rename-tag").forEach(b => b.addEventListener("click", onRenameTag));
    }
    if (manageFilterTag) manageFilterTag.innerHTML = `<option value="">Semua tag</option>${tagsCache.map(t=>`<option value="${t}">${t}</option>`).join("")}`;
  } catch (err) { console.error("loadTags", err); toast("Gagal muat tags", "error"); }
}

async function handleAddTag() {
  const v = (newTagInput?.value || "").trim().toLowerCase();
  if (!v) { toast("Isi nama tag", "error"); return; }
  try {
    await supabase.from("tags").upsert({ name: v });
    newTagInput.value = "";
    toast("Tag ditambahkan", "success");
    await loadTags();
  } catch (err) { console.error("addTag", err); toast("Gagal tambah tag", "error"); }
}

async function onDeleteTag(e) {
  const name = e.currentTarget.dataset.name;
  if (!confirm(`Hapus tag "${name}"? Ini juga akan menghapus tag dari semua foto.`)) return;
  try {
    await supabase.from("tags").delete().eq("name", name);
    const { data: all } = await supabase.from("photos").select("id,tags");
    for (const p of all || []) {
      if ((p.tags || []).includes(name)) {
        const newTags = (p.tags || []).filter(x => x !== name);
        await supabase.from("photos").update({ tags: newTags }).eq("id", p.id);
      }
    }
    toast("Tag dihapus", "success");
    await loadTags();
    await loadManagePhotoData();
    renderManagePhotos();
  } catch (err) { console.error("deleteTag", err); toast("Gagal hapus tag", "error"); }
}

async function onRenameTag(e) {
  const oldName = e.currentTarget.dataset.name;
  const newName = prompt("Nama baru untuk tag:", oldName);
  if (!newName || newName.trim() === "" || newName.trim() === oldName) return;
  const v = newName.trim().toLowerCase();
  try {
    // upsert new tag
    await supabase.from("tags").upsert({ name: v });
    // update photos
    const { data: all } = await supabase.from("photos").select("id,tags");
    for (const p of all || []) {
      if ((p.tags || []).includes(oldName)) {
        const updated = (p.tags || []).map(t => t === oldName ? v : t);
        await supabase.from("photos").update({ tags: Array.from(new Set(updated)) }).eq("id", p.id);
      }
    }
    // remove old tag
    await supabase.from("tags").delete().eq("name", oldName);
    toast("Tag diganti", "success");
    await loadTags();
    await loadManagePhotoData();
    renderManagePhotos();
  } catch (err) { console.error("renameTag", err); toast("Gagal rename tag", "error"); }
}

/* =========================
   Image compress helper (client-side)
   ========================= */
function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read error"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) resolve(file);
          else resolve(blob);
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* =========================
   Quick upload (single file)
   ========================= */
async function quickUploadHandler() {
  try {
    const f = quickFile?.files?.[0];
    if (!f) { toast("Pilih file dulu", "error"); return; }
    if (f.size > MAX_UPLOAD_BYTES) { toast(`File terlalu besar (${fmtBytes(f.size)}). Maks ${fmtBytes(MAX_UPLOAD_BYTES)}`, "error"); return; }
    toast("Uploading…", "info");
    const blob = await compressImage(f);
    if (blob.size > MAX_UPLOAD_BYTES) { toast(`Setelah kompres masih > limit (${fmtBytes(blob.size)})`, "error"); return; }
    const filename = `${Date.now()}_${sanitizeFilename(f.name)}`;
    const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(filename, blob, { contentType: blob.type || f.type });
    if (upErr) throw upErr;
    const url = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filename).data.publicUrl;
    await supabase.from("photos").insert({ title: f.name, description: "", tags: [], url, path: filename, created_at: new Date().toISOString() });
    toast("Upload cepat berhasil", "success");
    await refreshAll();
  } catch (err) {
    console.error("quick upload", err);
    toast("Gagal upload cepat", "error");
  }
}

/* =========================
   Batch prepare & upload (Add Photo)
   ========================= */
async function prepareBatch() {
  try {
    const files = Array.from(photoFiles?.files || []);
    if (!files.length) { toast("Pilih file terlebih dahulu", "error"); return; }
    await loadTags();
    batchDetail.innerHTML = "";
    files.forEach((file, idx) => {
      const card = document.createElement("div");
      card.className = "batch-item card";
      card.dataset.idx = idx;
      const url = URL.createObjectURL(file);
      const tagsHtml = tagsCache.map(t => `<label class="tag-chip"><input type="checkbox" value="${t}"> ${t}</label>`).join("");
      card.innerHTML = `
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img src="${url}" class="photo-thumb" style="width:140px;height:100px;object-fit:cover;border-radius:8px">
          <div style="flex:1">
            <input class="input batch-title" placeholder="Judul (opsional)">
            <textarea class="input batch-desc" rows="2" placeholder="Deskripsi (opsional)"></textarea>
            <div class="small muted" style="margin-top:6px">Pilih tags:</div>
            <div class="tag-checklist" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">${tagsHtml}</div>
            <div style="margin-top:8px"><div class="progress small"><div class="bar local-bar" style="width:0%"></div></div></div>
          </div>
        </div>
      `;
      batchDetail.appendChild(card);
    });
    if (!$("#uploadAllPhotosBtn")) {
      const btn = document.createElement("button");
      btn.id = "uploadAllPhotosBtn";
      btn.className = "btn";
      btn.textContent = "Upload Semua";
      batchDetail.parentElement.insertBefore(btn, batchDetail);
      btn.addEventListener("click", uploadAllPhotos);
    }
    toast("Form detail siap. Periksa tiap foto lalu tekan Upload Semua.", "success");
  } catch (err) {
    console.error("prepareBatch", err);
    toast("Gagal menyiapkan batch", "error");
  }
}

async function uploadAllPhotos() {
  const cards = Array.from(batchDetail.querySelectorAll(".batch-item"));
  if (!cards.length) { toast("Tidak ada file untuk diupload", "error"); return; }
  let success = 0;
  for (const card of cards) {
    const idx = parseInt(card.dataset.idx);
    const file = (photoFiles.files || [])[idx];
    const title = card.querySelector(".batch-title")?.value?.trim();
    const desc = card.querySelector(".batch-desc")?.value?.trim();
    const tags = Array.from(card.querySelectorAll(".tag-checklist input:checked")).map(i => i.value);
    const bar = card.querySelector(".local-bar");
    try {
      if (!file) { if (bar) bar.style.background = "red"; continue; }
      if (file.size > MAX_UPLOAD_BYTES) { toast(`File ${file.name} terlalu besar (${fmtBytes(file.size)}) — dilewati`, "error"); continue; }
      bar.style.width = "5%";
      const blob = await compressImage(file);
      if (blob.size > MAX_UPLOAD_BYTES) { toast(`Setelah kompres ${file.name} masih > limit — dilewati`, "error"); continue; }
      bar.style.width = "25%";
      const filename = `${Date.now()}_${sanitizeFilename(file.name)}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(filename, blob, { contentType: blob.type || file.type });
      if (upErr) throw upErr;
      bar.style.width = "70%";
      const url = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filename).data.publicUrl;
      const { error: insErr } = await supabase.from("photos").insert({
        title: title || null, description: desc || null, tags: tags || [], url, path: filename, created_at: new Date().toISOString()
      });
      if (insErr) {
        // rollback storage
        await supabase.storage.from(PHOTO_BUCKET).remove([filename]).catch(()=>{});
        throw insErr;
      }
      bar.style.width = "100%";
      success++;
    } catch (err) {
      console.error("uploadAllPhotos item err", err);
      if (bar) { bar.style.background = "red"; }
      toast("Gagal upload salah satu file", "error", 5000);
    }
  }
  batchDetail.innerHTML = "";
  $("#uploadAllPhotosBtn")?.remove();
  if (photoFiles) photoFiles.value = "";
  toast(`Upload selesai (${success}/${cards.length})`, "success");
  await loadManagePhotoData();
  renderManagePhotos();
}

/* =========================
   Manage photos
   ========================= */
async function loadManagePhotoData() {
  try {
    const { data, error } = await supabase.from("photos").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    photosCache = data || [];
  } catch (err) {
    console.error("loadManagePhotoData", err);
    toast("Gagal muat foto", "error");
  }
}

async function loadManagePhotos() {
  await loadManagePhotoData();
  renderManagePhotos();
}

function renderManagePhotos() {
  if (!managePhotosList) return;
  const q = (manageSearch?.value || "").toLowerCase();
  const tagFilter = (manageFilterTag?.value || "");
  let list = photosCache.slice();
  if (q) list = list.filter(p => ((safe(p.title) + " " + safe(p.description)).toLowerCase().includes(q)));
  if (tagFilter) list = list.filter(p => (p.tags || []).includes(tagFilter));
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  if (managePage > totalPages) managePage = totalPages;
  const start = (managePage - 1) * PER_PAGE;
  const pageItems = list.slice(start, start + PER_PAGE);

  managePhotosList.innerHTML = "";
  pageItems.forEach(p => {
    const div = document.createElement("div");
    div.className = "photo-card card";
    div.dataset.id = p.id;
    if (bulkSelectedIds.has(p.id)) div.classList.add("bulk-selected");
    div.innerHTML = `
      <img class="photo-thumb" src="${p.url || ""}" alt="">
      <div class="photo-meta">
        <div><strong>${safe(p.title) || "-"}</strong></div>
        <div class="small muted">${(p.tags || []).join(", ")}</div>
      </div>
      <div class="photo-actions">
        <div style="display:flex;gap:8px">
          <button class="btn-icon edit-photo" data-id="${p.id}" title="Edit"><i data-feather="edit"></i></button>
          <button class="btn-icon del-photo" data-id="${p.id}" title="Hapus"><i data-feather="trash-2"></i></button>
        </div>
      </div>
    `;
    // click toggles bulk select when active
    div.addEventListener("click", (ev) => {
      if (ev.target.closest(".btn-icon")) return;
      if (bulkSelecting) toggleBulkSelectId(p.id, div);
    });
    managePhotosList.appendChild(div);
  });
  feather.replace();
  managePager && managePager.classList.toggle("hidden", totalPages <= 1);
  managePageInfo && (managePageInfo.textContent = `${managePage} / ${totalPages}`);
  $$(".edit-photo").forEach(b => b.addEventListener("click", openEditPhotoModal));
  $$(".del-photo").forEach(b => b.addEventListener("click", handleDeletePhoto));
}

function toggleBulkSelect() {
  bulkSelecting = !bulkSelecting;
  bulkSelectedIds = new Set();
  bulkSelectToggle.classList.toggle("active", bulkSelecting);
  $$(".photo-card").forEach(c => c.classList.remove("bulk-selected"));
  toast(bulkSelecting ? "Bulk select ON" : "Bulk select OFF", "info", 1000);
}
function toggleBulkSelectId(id, el) {
  if (bulkSelectedIds.has(id)) { bulkSelectedIds.delete(id); el.classList.remove("bulk-selected"); }
  else { bulkSelectedIds.add(id); el.classList.add("bulk-selected"); }
}

async function bulkTagDialog() {
  if (!bulkSelectedIds.size) { toast("Pilih foto terlebih dahulu (Bulk Select)", "error"); return; }
  await loadTags();
  const input = prompt(`Masukkan tag (pisahkan koma) atau 'remove:tagname' untuk hapus.\nAvailable tags: ${tagsCache.join(", ")}`);
  if (input === null) return;
  const items = input.split(",").map(s => s.trim()).filter(Boolean);
  if (!items.length) return;
  try {
    for (const id of Array.from(bulkSelectedIds)) {
      const { data: p } = await supabase.from("photos").select("id,tags").eq("id", id).single();
      if (!p) continue;
      let newTags = Array.isArray(p.tags) ? [...p.tags] : [];
      for (const it of items) {
        if (it.startsWith("remove:")) { const r = it.split("remove:")[1]; newTags = newTags.filter(t => t !== r); }
        else { if (!newTags.includes(it)) newTags.push(it); }
      }
      newTags = Array.from(new Set(newTags));
      await supabase.from("photos").update({ tags: newTags }).eq("id", id);
      // ensure tags exist in tags table
      for (const t of newTags) { if (t) await supabase.from("tags").upsert({ name: t }); }
    }
    toast("Bulk tag berhasil", "success");
    bulkSelectedIds = new Set(); bulkSelecting = false;
    await loadManagePhotoData(); renderManagePhotos(); await loadTags();
  } catch (err) { console.error("bulkTag", err); toast("Gagal bulk tag", "error"); }
}

async function bulkDeleteConfirm() {
  if (!bulkSelectedIds.size) { toast("Tidak ada foto dipilih", "error"); return; }
  if (!confirm(`Hapus ${bulkSelectedIds.size} foto?`)) return;
  try {
    for (const id of Array.from(bulkSelectedIds)) {
      const { data } = await supabase.from("photos").select("path").eq("id", id).single();
      if (data?.path) await supabase.storage.from(PHOTO_BUCKET).remove([data.path]).catch(()=>{});
      await supabase.from("photos").delete().eq("id", id);
    }
    toast("Bulk delete selesai", "success");
    bulkSelectedIds = new Set(); bulkSelecting = false;
    await loadManagePhotoData(); renderManagePhotos();
  } catch (err) { console.error("bulkDelete", err); toast("Gagal bulk delete", "error"); }
}

function createModal(contentEl) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div class="modal-card"></div>`;
  modal.querySelector(".modal-card").appendChild(contentEl);
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  return modal;
}

async function openEditPhotoModal(ev) {
  try {
    const id = ev.currentTarget.dataset.id;
    const { data: p, error } = await supabase.from("photos").select("*").eq("id", id).single();
    if (error) throw error;
    const container = document.createElement("div");
    container.innerHTML = `
      <h3>Edit Foto</h3>
      <img src="${p.url || ''}" style="width:100%;height:240px;object-fit:cover;border-radius:8px">
      <input class="input edit-title" placeholder="Judul" value="${safe(p.title)}" style="margin-top:8px">
      <textarea class="input edit-desc" rows="3" placeholder="Deskripsi" style="margin-top:8px">${safe(p.description)}</textarea>
      <div class="small muted" style="margin-top:8px">Tags:</div>
      <div class="tag-edit-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
      <label class="input-file" style="margin-top:8px"><input class="replace-file" type="file" accept="image/*"><div class="file-label">Ganti file (opsional)</div></label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn save-photo" data-id="${p.id}">Simpan</button>
        <button class="btn ghost cancel-photo">Batal</button>
        <button class="btn ghost del-photo-perm" data-id="${p.id}" style="margin-left:auto;color:var(--danger)">Hapus</button>
      </div>
    `;
    const tagList = container.querySelector(".tag-edit-list");
    tagsCache.forEach(t => {
      const lab = document.createElement("label");
      lab.className = "tag-chip";
      lab.innerHTML = `<input type="checkbox" value="${t}" ${ (p.tags || []).includes(t) ? 'checked' : '' }> ${t}`;
      tagList.appendChild(lab);
    });
    const modal = createModal(container);
    container.querySelector(".cancel-photo").addEventListener("click", () => modal.remove());
    container.querySelector(".save-photo").addEventListener("click", async (e) => {
      try {
        const id = e.currentTarget.dataset.id;
        const title = container.querySelector(".edit-title").value.trim();
        const description = container.querySelector(".edit-desc").value.trim();
        const newTags = Array.from(tagList.querySelectorAll("input:checked")).map(i => i.value);
        const replaceFileInput = container.querySelector(".replace-file");
        if (replaceFileInput.files && replaceFileInput.files[0]) {
          const file = replaceFileInput.files[0];
          if (file.size > MAX_UPLOAD_BYTES) { toast(`File terlalu besar (${fmtBytes(file.size)})`, "error"); return; }
          const blob = await compressImage(file);
          if (blob.size > MAX_UPLOAD_BYTES) { toast(`Setelah kompres masih > limit`, "error"); return; }
          const newPath = `${Date.now()}_${sanitizeFilename(file.name)}`;
          const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(newPath, blob, { contentType: blob.type || file.type });
          if (upErr) throw upErr;
          const publicUrl = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(newPath).data.publicUrl;
          if (p.path) await supabase.storage.from(PHOTO_BUCKET).remove([p.path]).catch(()=>{});
          await supabase.from("photos").update({ title, description, tags: newTags, url: publicUrl, path: newPath }).eq("id", id);
        } else {
          await supabase.from("photos").update({ title, description, tags: newTags }).eq("id", id);
        }
        toast("Perubahan disimpan", "success");
        modal.remove();
        await loadManagePhotoData(); renderManagePhotos();
      } catch (err) { console.error("save edit", err); toast("Gagal menyimpan perubahan", "error"); }
    });
    container.querySelector(".del-photo-perm").addEventListener("click", async (ev) => {
      if (!confirm("Hapus foto ini permanen?")) return;
      const id = ev.currentTarget.dataset.id;
      try {
        const { data } = await supabase.from("photos").select("path").eq("id", id).single();
        if (data?.path) await supabase.storage.from(PHOTO_BUCKET).remove([data.path]).catch(()=>{});
        await supabase.from("photos").delete().eq("id", id);
        toast("Foto dihapus", "success");
        modal.remove();
        await loadManagePhotoData(); renderManagePhotos();
      } catch (err) { console.error("delete perm", err); toast("Gagal hapus foto", "error"); }
    });
  } catch (err) {
    console.error("openEditPhotoModal", err);
    toast("Gagal membuka editor foto", "error");
  }
}

async function handleDeletePhoto(ev) {
  try {
    const id = ev.currentTarget.dataset.id;
    if (!confirm("Hapus foto ini?")) return;
    const { data } = await supabase.from("photos").select("path").eq("id", id).single();
    if (data?.path) await supabase.storage.from(PHOTO_BUCKET).remove([data.path]).catch(()=>{});
    await supabase.from("photos").delete().eq("id", id);
    toast("Foto dihapus", "success");
    await loadManagePhotoData(); renderManagePhotos();
  } catch (err) { console.error("handleDeletePhoto", err); toast("Gagal hapus foto", "error"); }
}

/* =========================
   News
   ========================= */
async function handleAddNews() {
  try {
    const title = (newsTitle?.value || "").trim();
    const content = (newsContent?.value || "").trim();
    if (!title || !content) { toast("Isi judul & isi berita", "error"); return; }
    let imgUrl = null, imgPath = null;
    if (newsCover?.files && newsCover.files[0]) {
      const file = newsCover.files[0];
      if (file.size > MAX_UPLOAD_BYTES) { toast("Cover terlalu besar", "error"); return; }
      const blob = await compressImage(file);
      if (blob.size > MAX_UPLOAD_BYTES) { toast("Cover setelah kompres masih > limit", "error"); return; }
      const name = `${Date.now()}_${sanitizeFilename(file.name)}`;
      const { error } = await supabase.storage.from(NEWS_BUCKET).upload(name, blob, { contentType: blob.type || file.type });
      if (error) throw error;
      imgUrl = supabase.storage.from(NEWS_BUCKET).getPublicUrl(name).data.publicUrl;
      imgPath = name;
    }
    await supabase.from("news").insert({ title, content, image_url: imgUrl, image_path: imgPath, published_at: new Date().toISOString(), created_at: new Date().toISOString() });
    toast("Berita ditambahkan", "success");
    if (newsTitle) newsTitle.value = ""; if (newsContent) newsContent.value = ""; if (newsCover) newsCover.value = "";
    await loadNews();
  } catch (err) { console.error("handleAddNews", err); toast("Gagal tambah berita", "error"); }
}

async function loadNews() {
  try {
    const { data, error } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    if (newsListArea) {
      newsListArea.innerHTML = "";
      (data || []).forEach(n => {
        const div = document.createElement("div");
        div.className = "news-card";
        div.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><img src="${n.image_url||''}" style="width:120px;height:80px;object-fit:cover;border-radius:8px"><div style="flex:1"><div><strong>${safe(n.title)}</strong></div><div class="small muted">${new Date(n.published_at || n.created_at).toLocaleString()}</div></div><div style="display:flex;flex-direction:column;gap:6px"><button class="btn ghost del-news" data-id="${n.id}">Delete</button></div></div>`;
        newsListArea.appendChild(div);
      });
      $$(".del-news").forEach(b => b.addEventListener("click", async (ev) => {
        if (!confirm("Hapus berita?")) return;
        const id = ev.currentTarget.dataset.id;
        const { data } = await supabase.from("news").select("image_path").eq("id", id).single();
        if (data?.image_path) await supabase.storage.from(NEWS_BUCKET).remove([data.image_path]).catch(()=>{});
        await supabase.from("news").delete().eq("id", id);
        toast("Berita dihapus", "success");
        await loadNews();
      }));
    }
  } catch (err) { console.error("loadNews", err); toast("Gagal muat berita", "error"); }
}

/* =========================
   Events
   ========================= */
async function handleAddEvent() {
  try {
    const title = (eventTitle?.value || "").trim();
    const date = eventDate?.value;
    if (!title || !date) { toast("Isi judul & tanggal event", "error"); return; }
    await supabase.from("events").insert({ title, date_end: date, created_at: new Date().toISOString() });
    toast("Event ditambahkan", "success");
    if (eventTitle) eventTitle.value = ""; if (eventDate) eventDate.value = "";
    await loadEvents();
  } catch (err) { console.error("handleAddEvent", err); toast("Gagal tambah event", "error"); }
}

async function loadEvents() {
  try {
    const { data, error } = await supabase.from("events").select("*").order("date_end", { ascending: true });
    if (error) throw error;
    if (eventsListArea) {
      eventsListArea.innerHTML = "";
      (data || []).forEach(ev => {
        const div = document.createElement("div");
        div.className = "event-card";
        div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${safe(ev.title)}</strong><div class="small muted">${ev.date_end ? new Date(ev.date_end).toLocaleDateString() : ""}</div></div><div><button class="btn ghost del-event" data-id="${ev.id}">Delete</button></div></div>`;
        eventsListArea.appendChild(div);
      });
      $$(".del-event").forEach(b => b.addEventListener("click", async (ev) => {
        if (!confirm("Hapus event?")) return;
        await supabase.from("events").delete().eq("id", ev.currentTarget.dataset.id);
        toast("Event dihapus", "success");
        await loadEvents();
      }));
    }
  } catch (err) { console.error("loadEvents", err); toast("Gagal muat events", "error"); }
}

/* =========================
   Memories (add + admin controls)
   ========================= */
async function handleAddMemory() {
  try {
    const title = (memoryTitle?.value || "").trim();
    const desc = (memoryDesc?.value || "").trim();
    const files = Array.from(memoryFiles?.files || []);
    const date = memoryDate?.value || null;
    const order = parseInt(memoryOrder?.value || 0);

    if (!title) { toast("Isi judul memory", "error"); return; }

    // if no files, just insert empty photos array
    if (!files.length) {
      await supabase.from("memories").insert({ title, short_desc: desc || null, photos: [], event_date: date, "order": order || 0, visible: true, created_at: new Date().toISOString() });
      toast("Memory tanpa foto ditambahkan", "success");
      if (memoryTitle) memoryTitle.value = ""; if (memoryDesc) memoryDesc.value = ""; if (memoryFiles) memoryFiles.value = ""; if (memoryDate) memoryDate.value = ""; if (memoryOrder) memoryOrder.value = "";
      await loadMemoriesAdmin();
      return;
    }

    const uploaded = [];
    for (const file of files) {
      if (!file) continue;
      if (file.size > MAX_UPLOAD_BYTES) { toast(`File ${file.name} terlalu besar (${fmtBytes(file.size)}). Dilewati.`, "error"); continue; }
      const blob = await compressImage(file);
      if (blob.size > MAX_UPLOAD_BYTES) { toast(`File ${file.name} setelah kompres masih > limit. Dilewati.`, "error"); continue; }
      const filename = `${Date.now()}_${sanitizeFilename(file.name)}`;
      try {
        const { error } = await supabase.storage.from(MEMORIES_BUCKET).upload(filename, blob, { contentType: blob.type || file.type });
        if (error) throw error;
        const url = supabase.storage.from(MEMORIES_BUCKET).getPublicUrl(filename).data.publicUrl;
        uploaded.push({ url, path: filename });
      } catch (err) {
        console.error("mem upload err", err);
        try { await supabase.storage.from(MEMORIES_BUCKET).remove([filename]); } catch(e){}
        toast(`Gagal upload ${file.name}`, "error");
      }
    }

    await supabase.from("memories").insert({ title, short_desc: desc || null, photos: uploaded, event_date: date, "order": order || 0, visible: true, created_at: new Date().toISOString() });
    toast("Memory ditambahkan", "success");
    if (memoryTitle) memoryTitle.value = ""; if (memoryDesc) memoryDesc.value = ""; if (memoryFiles) memoryFiles.value = ""; if (memoryDate) memoryDate.value = ""; if (memoryOrder) memoryOrder.value = "";
    await loadMemoriesAdmin();
  } catch (err) { console.error("handleAddMemory", err); toast("Gagal tambah memory", "error"); }
}

async function loadMemoriesAdmin() {
  try {
    const { data, error } = await supabase.from("memories").select("*").order("order", { ascending: true });
    if (error) throw error;
    if (memoriesAdminList) {
      memoriesAdminList.innerHTML = "";
      (data || []).forEach(m => {
        const div = document.createElement("div");
        div.className = "memory-admin-row card";
        div.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><img src="${(m.photos && m.photos[0] && m.photos[0].url) || ''}" style="width:120px;height:80px;object-fit:cover;border-radius:8px"><div style="flex:1"><div><strong>${safe(m.title)}</strong></div><div class="small muted">${safe(m.short_desc)}</div></div><div style="display:flex;flex-direction:column;gap:8px"><button class="btn ghost edit-memory" data-id="${m.id}">Edit</button><button class="btn ghost del-memory" data-id="${m.id}">Delete</button></div></div>`;
        memoriesAdminList.appendChild(div);
      });
      $$(".del-memory").forEach(b => b.addEventListener("click", async (ev) => {
        if (!confirm("Hapus memory ini?")) return;
        const id = ev.currentTarget.dataset.id;
        const { data } = await supabase.from("memories").select("photos").eq("id", id).single();
        for (const p of (data.photos || [])) { if (p.path) await supabase.storage.from(MEMORIES_BUCKET).remove([p.path]).catch(()=>{}); }
        await supabase.from("memories").delete().eq("id", id);
        toast("Memory dihapus", "success");
        await loadMemoriesAdmin();
      }));
      $$(".edit-memory").forEach(b => b.addEventListener("click", openEditMemoryModal));
    }
  } catch (err) { console.error("loadMemoriesAdmin", err); toast("Gagal muat memories", "error"); }
}

function openEditMemoryModal(ev) {
  (async () => {
    try {
      const id = ev.currentTarget.dataset.id;
      const { data: m, error } = await supabase.from("memories").select("*").eq("id", id).single();
      if (error) throw error;
      const container = document.createElement("div");
      container.innerHTML = `
        <h3>Edit Memory</h3>
        <input class="input edit-memory-title" placeholder="Judul" value="${safe(m.title)}">
        <textarea class="input edit-memory-desc" rows="4" placeholder="Deskripsi">${safe(m.short_desc)}</textarea>
        <div class="small muted" style="margin-top:8px">Photos: (untuk mengganti foto, hapus memory lalu buat baru atau gunakan storage console)</div>
        <div style="display:flex;gap:8px;margin-top:10px"><button class="btn save-memory">Simpan</button><button class="btn ghost close-modal">Batal</button></div>
      `;
      const modal = createModal(container);
      container.querySelector(".close-modal").addEventListener("click", () => modal.remove());
      container.querySelector(".save-memory").addEventListener("click", async () => {
        const title = container.querySelector(".edit-memory-title").value.trim();
        const desc = container.querySelector(".edit-memory-desc").value.trim();
        try {
          await supabase.from("memories").update({ title, short_desc: desc }).eq("id", id);
          toast("Memory diperbarui", "success");
          modal.remove();
          await loadMemoriesAdmin();
        } catch (err) { console.error("save memory", err); toast("Gagal simpan memory", "error"); }
      });
    } catch (err) { console.error("openEditMemoryModal", err); toast("Gagal buka edit memory", "error"); }
  })();
}

/* =========================
   Site Settings
   ========================= */
async function loadSiteSettings() {
  try {
    const { data } = await supabase.from("site_settings").select("*");
    const map = {};
    (data || []).forEach(r => map[r.key] = r.value);
    const hero = map.hero || {};
    const footer = map.footer || {};
    if (siteHeroTitle) siteHeroTitle.value = hero.title || "";
    if (siteHeroSubtitle) siteHeroSubtitle.value = hero.subtitle || "";
    if (siteFooterText) siteFooterText.value = footer.text || "";
  } catch (err) { console.error("loadSiteSettings", err); }
}

async function handleSaveHero() {
  try {
    const title = (siteHeroTitle?.value || "").trim();
    const subtitle = (siteHeroSubtitle?.value || "").trim();
    let imageObj = null;
    if (siteHeroImage?.files && siteHeroImage.files[0]) {
      const file = siteHeroImage.files[0];
      if (file.size > MAX_UPLOAD_BYTES) { toast("Image terlalu besar", "error"); return; }
      const blob = await compressImage(file);
      if (blob.size > MAX_UPLOAD_BYTES) { toast("Image setelah kompres masih > limit", "error"); return; }
      const path = `${Date.now()}_${sanitizeFilename(file.name)}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || file.type });
      if (error) throw error;
      const url = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
      imageObj = { path, url };
    }
    const heroObj = { title, subtitle, image: imageObj };
    await supabase.from("site_settings").upsert({ key: "hero", value: heroObj });
    toast("Hero disimpan", "success");
    await loadSiteSettings();
  } catch (err) { console.error("handleSaveHero", err); toast("Gagal simpan hero", "error"); }
}

async function handleSaveFooter() {
  try {
    const text = (siteFooterText?.value || "").trim();
    await supabase.from("site_settings").upsert({ key: "footer", value: { text } });
    toast("Footer disimpan", "success");
    await loadSiteSettings();
  } catch (err) { console.error("handleSaveFooter", err); toast("Gagal simpan footer", "error"); }
}

/* =========================
   Help content
   ========================= */
function loadHelp() {
  if (!helpContent) return;
  helpContent.innerHTML = `
    <h3>Panduan Admin Lengkap</h3>
    <p>Di panel ini Anda dapat mengelola foto, berita, event, memories, dan pengaturan situs. Semua operasi tulis memerlukan login.</p>
    <h4>Upload Foto</h4>
    <ol>
      <li>Gunakan Add Photo untuk upload banyak foto sekaligus. Pilih file → Muat Detail → pilih tag/judul untuk masing-masing → Upload Semua.</li>
      <li>Setiap file dibatasi ${fmtBytes(MAX_UPLOAD_BYTES)}. File yang melebihi akan dilewati.</li>
    </ol>
    <h4>Kelola Foto</h4>
    <p>Gunakan Manage Photos untuk mencari, mengedit, dan menghapus foto. Aktifkan Bulk Select untuk memilih banyak item lalu gunakan Bulk Tag atau Bulk Delete.</p>
    <h4>Tags</h4>
    <p>Tambah, rename, dan hapus tag. Rename akan mengganti tag di semua foto.</p>
    <h4>Memories</h4>
    <p>Memories adalah koleksi foto berjudul/berdeskripsi. Untuk mengganti foto di memory, hapus memory lalu tambahkan yang baru atau gunakan Storage console.</p>
  `;
}

/* =========================
   Helpers & boot
   ========================= */
function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.remove()); }
async function refreshAll() { await Promise.all([loadTags(), loadManagePhotoData(), loadNews(), loadEvents(), loadMemoriesAdmin(), loadSiteSettings(), loadStorage()]); renderManagePhotos(); }

async function boot() {
  try {
    initUI();
    const { data } = await supabase.auth.getSession();
    if (data?.session) { logoutBtn.style.display = "inline-block"; openLoginBtn.style.display = "none"; }
    showPanel("panelDashboard");
    await refreshAll();
    toast("Admin siap", "success", 900);
  } catch (err) {
    console.error("boot", err);
    toast("Inisialisasi gagal", "error");
  }
}
boot();

/* =========================
   Expose helpers for console
   ========================= */
window.adminHelpers = {
  refreshAll,
  loadTags,
  loadManagePhotoData,
  renderManagePhotos,
  loadNews,
  loadEvents,
  loadMemoriesAdmin,
  loadSiteSettings,
  loadStorage,
  quickUploadHandler
};