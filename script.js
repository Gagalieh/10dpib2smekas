/* script.js — Filter modal menggunakan checkbox tag (auto), pagination, confess, popup, countdown
   Replace file lama dengan ini. Pastikan config.js mengekspor `db`.
*/

import { db } from "./config.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* ---------- Elemen dasar ---------- */
const toggleGalleryBtn = document.getElementById("toggleButton");
const gallery = document.getElementById("gallery");

const popup = document.getElementById("popup");
const popupImage = popup.querySelector(".popup-image");
const popupClose = popup.querySelector(".popup-close");

/* confess */
const confessForm = document.getElementById("confessForm");
const messagesBox = document.getElementById("confessMessages");
const toggleMessageBtn = document.getElementById("toggleMessage");
const confessMsgBox = document.getElementById("confessMessages");

/* countdown */
const targetDate = new Date("2025-07-14T07:00:00+07:00");

/* state */
let photosCache = [];
let availableTags = []; // list unique tags
let currentFilter = []; // selected tags
let filterModeAND = true; // checkbox in modal to toggle AND/OR

const ROWS = 2;
const COLS = 50;
const PER_PAGE = ROWS * COLS;
let currentPage = 1;
let totalPages = 1;

/* ---------- Modal & Filter UI (checkbox list) ---------- */
function ensureFilterButtonAndModal() {
  if (!document.getElementById("openFilterBtn")) {
    const btn = document.createElement("button");
    btn.id = "openFilterBtn";
    btn.textContent = "Filter";
    btn.style.marginLeft = "8px";
    toggleGalleryBtn.insertAdjacentElement("afterend", btn);
    btn.addEventListener("click", () => {
      const modal = document.getElementById("filterModal");
      if (modal) {
        populateAvailableTags(); // refresh tags each open
        modal.style.display = "flex";
      }
    });
  }

  if (!document.getElementById("filterModal")) {
    const modal = document.createElement("div");
    modal.id = "filterModal";
    modal.style = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:none;justify-content:center;align-items:center;z-index:1500;";

    modal.innerHTML = `
      <div style="width:95%;max-width:720px;background:#0b1220;padding:16px;border-radius:10px;color:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;color:#ff00cc">Pilih Tag</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <label style="color:#ddd;font-size:0.95rem"><input type="checkbox" id="modalMode" checked /> AND</label>
            <button id="applyModalFilter" style="padding:8px;border-radius:8px;background:#ff00cc;color:#fff;border:none">Terapkan</button>
            <button id="clearModalFilter" style="padding:8px;border-radius:8px;background:#444;color:#fff;border:none">Clear</button>
            <button id="closeModal" style="padding:8px;border-radius:8px;background:#333;color:#fff;border:none">Tutup</button>
          </div>
        </div>
        <div id="availableTagsWrap" style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;max-height:360px;overflow:auto;padding-top:8px"></div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeModal").addEventListener("click", () => modal.style.display = "none");
    document.getElementById("applyModalFilter").addEventListener("click", () => {
      // read checked checkboxes
      const checked = Array.from(document.querySelectorAll('.modal-tag-checkbox:checked')).map(c => c.value);
      currentFilter = checked;
      filterModeAND = document.getElementById("modalMode").checked;
      currentPage = 1;
      renderGallery();
      modal.style.display = "none";
    });
    document.getElementById("clearModalFilter").addEventListener("click", () => {
      document.querySelectorAll('.modal-tag-checkbox').forEach(c => c.checked = false);
      currentFilter = [];
      document.getElementById("modalMode").checked = true;
      filterModeAND = true;
      currentPage = 1;
      renderGallery();
    });
    // clicking outside modal content closes it
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
  }
}

/* ---------- Fetch photos & build tag list ---------- */
async function fetchPhotosFromFirestore() {
  try {
    const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const arr = [];
    const tagSet = new Set();
    snap.forEach(d => {
      const data = d.data();
      const tags = Array.isArray(data.tags) ? data.tags.map(t => t.toLowerCase()) : [];
      tags.forEach(t => tagSet.add(t));
      arr.push({
        id: d.id,
        title: data.title || "",
        desc: data.desc || "",
        tags,
        url: data.url || "",
        path: data.path || ""
      });
    });
    photosCache = arr;
    availableTags = Array.from(tagSet).sort();
    return arr;
  } catch (err) {
    console.error("fetchPhotosFromFirestore error:", err);
    photosCache = []; availableTags = [];
    return [];
  }
}

/* ---------- Populate modal tags as checkboxes ---------- */
function populateAvailableTags() {
  const wrap = document.getElementById("availableTagsWrap");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (!availableTags || availableTags.length === 0) {
    wrap.innerHTML = '<div style="color:#bbb">Belum ada tag.</div>';
    return;
  }
  availableTags.forEach(tag => {
    const id = `tag-${tag.replace(/\s+/g,'_')}`;
    const container = document.createElement("label");
    container.style = "display:inline-flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,0.02);cursor:pointer;color:#ddd";
    container.innerHTML = `<input type="checkbox" class="modal-tag-checkbox" value="${tag}" id="${id}" style="transform:scale(1.1)" /> <span style="color:#ff00cc">${escapeHtml(tag)}</span>`;
    // if tag already in currentFilter, check
    setTimeout(()=>{ // ensure checkbox exists before setting
      const cb = container.querySelector('input');
      if (cb && currentFilter.includes(tag)) cb.checked = true;
    },0);
    wrap.appendChild(container);
  });
}

/* ---------- Filtering logic ---------- */
function matchesFilter(item) {
  if (!currentFilter || currentFilter.length === 0) return true;
  const its = (item.tags || []).map(t => t.toLowerCase());
  if (filterModeAND) return currentFilter.every(f => its.includes(f));
  return currentFilter.some(f => its.includes(f));
}

/* ---------- Pagination & render ---------- */
function renderPaginationControls() {
  const existing = document.getElementById("paginationWrap");
  if (existing) existing.remove();

  const wrap = document.createElement("div");
  wrap.id = "paginationWrap";
  wrap.style = "display:flex;gap:8px;align-items:center;justify-content:center;margin:12px 0";

  const prev = document.createElement("button");
  prev.textContent = "Prev";
  prev.disabled = currentPage <= 1;
  prev.addEventListener("click", () => { currentPage = Math.max(1, currentPage - 1); renderGallery(); });

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = currentPage >= totalPages;
  next.addEventListener("click", () => { currentPage = Math.min(totalPages, currentPage + 1); renderGallery(); });

  const info = document.createElement("span");
  info.style = "color:#fff";
  info.textContent = `Halaman ${currentPage} / ${totalPages}`;

  wrap.appendChild(prev); wrap.appendChild(info); wrap.appendChild(next);
  gallery.parentNode.insertBefore(wrap, gallery.nextSibling);
}

function renderGallery() {
  const filtered = photosCache.filter(matchesFilter);
  totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  gallery.style.display = "grid";
  gallery.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  gallery.style.gap = "8px";
  gallery.innerHTML = "";

  if (slice.length === 0) {
    gallery.innerHTML = '<p style="color:#fff">Tidak ada foto.</p>';
    renderPaginationControls();
    return;
  }

  slice.forEach(item => {
    const card = document.createElement("div");
    card.className = "gallery-item";
    card.style = "background:transparent;padding:6px;border-radius:8px;display:flex;flex-direction:column;align-items:center";

    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.title || item.id;
    img.style = "width:100%;height:100%;object-fit:cover;cursor:pointer;border-radius:6px";
    img.addEventListener("click", () => {
      popup.style.display = "flex";
      popupImage.src = img.src;
      popupImage.alt = img.alt;
    });

    const tagsWrap = document.createElement("div");
    tagsWrap.style = "margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center";
    (item.tags || []).forEach(t => {
      const tagEl = document.createElement("span");
      tagEl.textContent = t;
      tagEl.style = "font-size:0.8rem;padding:4px 8px;border-radius:999px;background:rgba(255,0,204,0.06);color:#ff00cc;cursor:pointer";
      tagEl.addEventListener("click", (ev) => {
        ev.stopPropagation();
        // open modal and toggle that tag
        const modal = document.getElementById("filterModal");
        modal.style.display = "flex";
        // ensure tags checkboxes are populated and check this tag
        Array.from(document.querySelectorAll('.modal-tag-checkbox')).forEach(cb => {
          cb.checked = (cb.value === t) ? !cb.checked : cb.checked;
        });
      });
      tagsWrap.appendChild(tagEl);
    });

    card.appendChild(img);
    card.appendChild(tagsWrap);
    gallery.appendChild(card);
  });

  renderPaginationControls();
}

/* ---------- Initialize flow ---------- */
async function initGallery() {
  ensureFilterButtonAndModal();
  await fetchPhotosFromFirestore();
  populateAvailableTags(); // initial populate (modal exists)
  renderGallery();
}

/* ---------- Popup handlers ---------- */
popupClose.addEventListener("click", () => popup.style.display = "none");
popup.addEventListener("click", (e) => { if (e.target === popup) popup.style.display = "none"; });

/* ---------- Confess (simple) ---------- */
const messagesRef = collection(db, "messages");

toggleMessageBtn.addEventListener("click", () => {
  confessMsgBox.classList.toggle("hide");
  toggleMessageBtn.textContent = confessMsgBox.classList.contains("hide") ? "Buka Pesan" : "Tutup Pesan";
});

async function sendMessage(sender, recipient, message) {
  await addDoc(messagesRef, { sender, recipient, message, timestamp: new Date() });
  await displayMessages();
}

async function displayMessages() {
  const snap = await getDocs(collection(db, "messages"));
  messagesBox.innerHTML = "";
  snap.forEach(d => {
    const v = d.data();
    messagesBox.insertAdjacentHTML('beforeend', `<div class="message"><p><strong>Pengirim:</strong> ${escapeHtml(v.sender)}</p><p><strong>Tujuan :</strong> ${escapeHtml(v.recipient)}</p><p>${escapeHtml(v.message)}</p><small>${new Date(v.timestamp.seconds*1000).toLocaleString()}</small></div>`);
  });
}

confessForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const s = confessForm.sender.value.trim();
  const r = confessForm.recipient.value.trim();
  const m = confessForm.message.value.trim();
  if (s && r && m) { await sendMessage(s,r,m); confessForm.reset(); } else alert("Semua kolom harus diisi!");
});
displayMessages();

/* ---------- Utility ---------- */
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

/* ---------- Countdown ---------- */
function updateCountdown() {
  const now = new Date();
  const diff = targetDate - now;
  if (diff <= 0) {
    const el = document.getElementById("countdown"); if (el) el.innerHTML = "<h2>Selamat datang di sekolah!</h2>"; return;
  }
  const days = Math.floor(diff / (1000*60*60*24));
  const hours = Math.floor((diff / (1000*60*60)) % 24);
  const minutes = Math.floor((diff / (1000*60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const elDays = document.getElementById("days"), elHours = document.getElementById("hours"),
        elMinutes = document.getElementById("minutes"), elSeconds = document.getElementById("seconds");
  if (elDays) elDays.textContent = String(days).padStart(2,'0');
  if (elHours) elHours.textContent = String(hours).padStart(2,'0');
  if (elMinutes) elMinutes.textContent = String(minutes).padStart(2,'0');
  if (elSeconds) elSeconds.textContent = String(seconds).padStart(2,'0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

/* ---------- Start ---------- */
initGallery();
