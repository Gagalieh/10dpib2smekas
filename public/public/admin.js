// admin.js (replace penuh)
// Admin: login, upload, edit photo (metadata & replace file), delete, tag manager.
// Pastikan config.js nge-export db, auth, storage.

import { auth, db, storage } from './config.js';

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

/* elements */
const loginForm = document.getElementById('loginForm');
const authSection = document.getElementById('authSection');
const panel = document.getElementById('panel');
const logoutBtn = document.getElementById('logoutBtn');
const status = document.getElementById('status');

const uploadForm = document.getElementById('uploadForm');
const photoFile = document.getElementById('photoFile');
const photosList = document.getElementById('photosList');
const filterTags = document.getElementById('filterTags');
const applyFilterBtn = document.getElementById('applyFilter');

const newsForm = document.getElementById('newsForm');
const newsList = document.getElementById('newsList');

const newTagInput = document.getElementById('newTagInput');
const addTagBtn = document.getElementById('addTagBtn');
const globalTagsList = document.getElementById('globalTagsList');

/* edit modal elements */
const editModal = document.getElementById('editModal');
const editTitle = document.getElementById('editTitle');
const editDesc = document.getElementById('editDesc');
const editTags = document.getElementById('editTags');
const replaceFile = document.getElementById('replaceFile');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const deletePhotoBtn = document.getElementById('deletePhotoBtn');

let editingPhotoId = null;

/* util */
function setStatus(txt) { status.textContent = txt; console.log(txt); }

/* AUTH */
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = loginForm.email.value.trim();
  const pw = loginForm.password.value;
  try {
    setStatus('Login...');
    await signInWithEmailAndPassword(auth, email, pw);
    loginForm.reset();
  } catch (err) {
    setStatus('Login gagal: ' + err.message);
  }
});

logoutBtn.addEventListener('click', async () => { await signOut(auth); });

onAuthStateChanged(auth, user => {
  if (user) {
    authSection.classList.add('hidden');
    panel.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    loadPhotos();
    loadNews();
    loadGlobalTags();
  } else {
    authSection.classList.remove('hidden');
    panel.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
});

/* UPLOAD foto */
uploadForm.addEventListener('submit', async e => {
  e.preventDefault();
  const file = photoFile.files[0];
  if (!file) return alert('Pilih file gambar!');
  const title = document.getElementById('photoTitle').value.trim();
  const desc = document.getElementById('photoDesc').value.trim();
  const rawTags = document.getElementById('photoTags').value.trim();
  const tags = rawTags ? rawTags.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean) : [];

  const path = `photos/${Date.now()}_${file.name}`;
  const sRef = storageRef(storage, path);
  const up = uploadBytesResumable(sRef, file);
  setStatus('Mengunggah...');
  up.on('state_changed', null, err => setStatus('Upload error: ' + err.message), async () => {
    const url = await getDownloadURL(sRef);
    await addDoc(collection(db, 'photos'), { title, desc, tags, url, path, createdAt: serverTimestamp() });
    setStatus('Foto diupload.');
    uploadForm.reset();
    loadPhotos();
    // ensure tags exist in global tags collection
    for (const t of tags) await ensureTagExists(t);
  });
});

/* LOAD photos (dengan filter) */
async function loadPhotos() {
  photosList.innerHTML = '<p class="small">Memuat foto...</p>';
  const q = query(collection(db, 'photos'), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d => arr.push({ id: d.id, ...d.data() }));

  // filter jika ada
  const filter = filterTags.value.trim().toLowerCase();
  let filtered = arr;
  if (filter) {
    const wanted = filter.split(',').map(x => x.trim()).filter(Boolean);
    filtered = arr.filter(item => {
      const its = (item.tags || []).map(x=>x.toLowerCase());
      return wanted.every(w => its.includes(w));
    });
  }

  if (filtered.length === 0) { photosList.innerHTML = '<p class="small">Tidak ada foto.</p>'; return; }

  photosList.innerHTML = '';
  filtered.forEach(p => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <img src="${p.url}" alt="" style="max-width:150px;border-radius:8px;display:block;margin-bottom:6px" />
      <div class="meta">
        <strong>${escapeHtml(p.title || '(tanpa judul)')}</strong>
        <p class="small">${escapeHtml(p.desc || '')}</p>
        <p class="small">Tags: ${(p.tags || []).join(', ')}</p>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="editBtn" data-id="${p.id}">Edit</button>
        <button class="delBtn" data-id="${p.id}" data-path="${p.path}">Hapus</button>
      </div>
    `;
    photosList.appendChild(el);
  });

  // attach listeners
  document.querySelectorAll('.delBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const path = btn.dataset.path;
      if (!confirm('Yakin hapus foto?')) return;
      try {
        setStatus('Menghapus...');
        if (path) { const sRef = storageRef(storage, path); await deleteObject(sRef).catch(()=>{}); }
        await deleteDoc(doc(db, 'photos', id));
        setStatus('Foto dihapus.');
        loadPhotos();
      } catch (err) { setStatus('Error hapus: ' + err.message); }
    });
  });

  document.querySelectorAll('.editBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      editingPhotoId = id;
      // load doc
      const q = query(collection(db, 'photos'), where('__name__','==', id));
      const snap = await getDocs(q);
      let data = null;
      snap.forEach(d => data = d.data());
      if (!data) return alert('Data tidak ditemukan');
      editTitle.value = data.title || '';
      editDesc.value = data.desc || '';
      editTags.value = (data.tags || []).join(', ');
      replaceFile.value = '';
      editModal.style.display = 'flex';
    });
  });
}

/* EDIT save */
saveEditBtn.addEventListener('click', async () => {
  if (!editingPhotoId) return;
  setStatus('Menyimpan perubahan...');
  try {
    const title = editTitle.value.trim();
    const desc = editDesc.value.trim();
    const tags = editTags.value.trim() ? editTags.value.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean) : [];

    // jika ada file mengganti
    const file = replaceFile.files[0];
    let newUrl = null;
    let newPath = null;
    if (file) {
      const path = `photos/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const up = uploadBytesResumable(sRef, file);
      await new Promise((resolve,reject) => {
        up.on('state_changed', null, err=>reject(err), async () => {
          newUrl = await getDownloadURL(sRef);
          newPath = path;
          resolve();
        });
      });

      // ambil doc lama untuk hapus file lama
      const snap = await getDocs(query(collection(db,'photos'), where('__name__','==', editingPhotoId)));
      let oldPath = null;
      snap.forEach(d => { const dt = d.data(); oldPath = dt.path; });
      if (oldPath) { const oldRef = storageRef(storage, oldPath); await deleteObject(oldRef).catch(()=>{}); }
    }

    // update doc
    const docRef = doc(db, 'photos', editingPhotoId);
    const updateObj = { title, desc, tags };
    if (newUrl) { updateObj.url = newUrl; updateObj.path = newPath; }
    await updateDoc(docRef, updateObj);

    setStatus('Perubahan disimpan.');
    editModal.style.display = 'none';
    editingPhotoId = null;
    loadPhotos();
    // ensure tags exist
    for (const t of tags) await ensureTagExists(t);
    loadGlobalTags();
  } catch (err) {
    setStatus('Error simpan: ' + err.message);
  }
});

cancelEditBtn.addEventListener('click', () => { editModal.style.display = 'none'; editingPhotoId = null; });

deletePhotoBtn.addEventListener('click', async () => {
  if (!editingPhotoId) return;
  if (!confirm('Yakin hapus foto ini?')) return;
  try {
    // ambil doc untuk path
    const snap = await getDocs(query(collection(db,'photos'), where('__name__','==', editingPhotoId)));
    let oldPath = null;
    snap.forEach(d => { const dt = d.data(); oldPath = dt.path; });
    if (oldPath) { const oldRef = storageRef(storage, oldPath); await deleteObject(oldRef).catch(()=>{}); }
    await deleteDoc(doc(db, 'photos', editingPhotoId));
    setStatus('Foto dihapus.');
    editModal.style.display = 'none';
    editingPhotoId = null;
    loadPhotos();
  } catch (err) { setStatus('Error hapus: ' + err.message); }
});

/* NEWS functions (unchanged) */
newsForm.addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('newsTitle').value.trim();
  const content = document.getElementById('newsContent').value.trim();
  const rawTags = document.getElementById('newsTags').value.trim();
  const tags = rawTags ? rawTags.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean) : [];
  const file = document.getElementById('newsImage').files[0];
  let imageUrl = '', imagePath = '';
  if (file) {
    const path = `news/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    const up = uploadBytesResumable(sRef, file);
    setStatus('Uploading image...');
    await new Promise((resolve,reject) => {
      up.on('state_changed', null, err => reject(err), async () => {
        imageUrl = await getDownloadURL(sRef);
        imagePath = path;
        resolve();
      });
    });
  }
  await addDoc(collection(db,'news'), { title, content, tags, imageUrl, imagePath, createdAt: serverTimestamp() });
  setStatus('Berita dipublikasikan.');
  newsForm.reset();
  loadNews();
});

/* load news & delete */
async function loadNews() {
  newsList.innerHTML = '<p class="small">Memuat berita...</p>';
  const q = query(collection(db,'news'), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
  if (arr.length===0) { newsList.innerHTML = '<p class="small">Belum ada berita.</p>'; return; }
  newsList.innerHTML = '';
  arr.forEach(n => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div class="meta"><strong>${escapeHtml(n.title)}</strong><p class="small">${(n.tags||[]).join(', ')}</p><p>${escapeHtml(n.content)}</p></div>
                    ${n.imageUrl?`<img src="${n.imageUrl}" style="max-width:120px;border-radius:8px;display:block;margin-top:6px" />`:''}
                    <div style="margin-top:8px"><button class="delNews" data-id="${n.id}" data-path="${n.imagePath||''}">Hapus Berita</button></div>`;
    newsList.appendChild(el);
  });
  document.querySelectorAll('.delNews').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id; const path = btn.dataset.path;
    if (!confirm('Hapus berita?')) return;
    try {
      if (path) { const r = storageRef(storage, path); await deleteObject(r).catch(()=>{}); }
      await deleteDoc(doc(db,'news', id));
      setStatus('Berita dihapus.'); loadNews();
    } catch (err) { setStatus('Error: ' + err.message); }
  }));
}

/* -------------------------
   Tag management (global tags collection)
   - collection 'tags' stores documents { name: 'fotbar' }
   - addTag, deleteTag (and propagate deletion from photos)
   ------------------------- */
async function loadGlobalTags() {
  globalTagsList.innerHTML = '<p class="small">Memuat tag...</p>';
  const q = query(collection(db,'tags'), orderBy('name','asc'));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
  if (arr.length === 0) { globalTagsList.innerHTML = '<p class="small">Belum ada tag.</p>'; return; }
  globalTagsList.innerHTML = '';
  arr.forEach(t => {
    const el = document.createElement('div');
    el.style = 'display:flex;gap:8px;align-items:center;margin-bottom:6px';
    el.innerHTML = `<div style="flex:1;color:#ddd">${escapeHtml(t.name)}</div><button class="delTagBtn" data-name="${t.name}">Hapus Tag</button>`;
    globalTagsList.appendChild(el);
  });
  document.querySelectorAll('.delTagBtn').forEach(btn => btn.addEventListener('click', async () => {
    const name = btn.dataset.name;
    if (!confirm('Hapus tag "'+name+'"? (akan menghapus tag dari semua foto)')) return;
    try {
      // delete from tags collection
      const q2 = query(collection(db,'tags'), where('name','==', name));
      const snap2 = await getDocs(q2);
      snap2.forEach(async d => { await deleteDoc(doc(db,'tags', d.id)); });
      // remove tag from all photos
      const q3 = query(collection(db,'photos'), where('tags','array-contains', name));
      const snap3 = await getDocs(q3);
      snap3.forEach(async d => {
        const newTags = (d.data().tags || []).filter(x => x !== name);
        await updateDoc(doc(db,'photos', d.id), { tags: newTags });
      });
      setStatus('Tag dihapus dan dihilangkan dari foto.');
      loadGlobalTags();
      loadPhotos();
    } catch (err) { setStatus('Error hapus tag: ' + err.message); }
  }));
}

async function ensureTagExists(name) {
  if (!name) return;
  name = name.toLowerCase();
  const q = query(collection(db,'tags'), where('name','==', name));
  const snap = await getDocs(q);
  if (!snap.empty) return;
  await addDoc(collection(db,'tags'), { name });
}

/* add tag button */
addTagBtn.addEventListener('click', async () => {
  const v = newTagInput.value.trim().toLowerCase();
  if (!v) return;
  await ensureTagExists(v);
  newTagInput.value = '';
  loadGlobalTags();
});

/* helper escapeHtml */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* initial load functions */
function initAdmin() { loadPhotos(); loadNews(); loadGlobalTags(); }
applyFilterBtn.addEventListener('click', loadPhotos);

/* helper for updateDoc usage - import updateDoc earlier */

/* start if authed handled by onAuthStateChanged */

