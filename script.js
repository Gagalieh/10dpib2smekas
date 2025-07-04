/* ------------------------------------------
   1) Toggle GALERI (pakai GitHub API)
-------------------------------------------*/

// ========== CONFIG GitHub ==========
const GITHUB_USER = "Gagalieh";        // <- username GitHub
const GITHUB_REPO = "10dpib2smekas";   // <- nama repo
const IMAGE_DIR  = "images";           // folder gambar

// ========== ELEMENT ==========
const toggleGalleryBtn = document.getElementById("toggleButton");
const gallery          = document.getElementById("gallery");

// ========== Ambil file list dari GitHub & render ==========
async function loadGallery() {
  const api = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${IMAGE_DIR}`;
  try {
    const res  = await fetch(api);
    const list = await res.json();     // [{name, download_url, type} ...]

    list
      .filter(f => f.type === "file" && /\.(png|jpe?g|gif|webp)$/i.test(f.name))
      .forEach(f => {
        const item = document.createElement("div");
        item.className = "gallery-item";

        const img = document.createElement("img");
        img.src   = f.download_url;
        img.alt   = f.name;

        item.appendChild(img);
        gallery.appendChild(item);
      });
  } catch (err) {
    console.error("Galeri gagal dimuat:", err);
    gallery.innerHTML = "<p style='color:red'>Galeri tidak dapat dimuat.</p>";
  }
}

// ========== Tombol buka/tutup galeri ==========
toggleGalleryBtn.addEventListener("click", async () => {
  if (!gallery.dataset.loaded) {
    await loadGallery();
    gallery.dataset.loaded = "true";
  }
  gallery.classList.toggle("hidden");
  toggleGalleryBtn.textContent = gallery.classList.contains("hidden")
    ? "Buka Galeri"
    : "Tutup Galeri";
});


/* ------------------------------------------
   2) Toggle PESAN terkirim
-------------------------------------------*/
const toggleMessageBtn   = document.getElementById("toggleMessage");
const confessMsgBox      = document.getElementById("confessMessages");

toggleMessageBtn.addEventListener("click", () => {
  confessMsgBox.classList.toggle("hide");
  toggleMessageBtn.textContent = confessMsgBox.classList.contains("hide")
    ? "Buka Pesan"
    : "Tutup Pesan";
});


/* ------------------------------------------
   3) FIREBASE Confess (kirim & tampil)
-------------------------------------------*/
import {
  getFirestore, collection, addDoc, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const db          = getFirestore();
const messagesRef = collection(db, "messages");

const confessForm = document.getElementById("confessForm");
const messagesBox = document.getElementById("confessMessages");

// Kirim pesan
async function sendMessage(sender, recipient, message) {
  await addDoc(messagesRef, {
    sender, recipient, message,
    timestamp: new Date()
  });
  displayMessages();
}

// Tampil pesan
async function displayMessages() {
  const snap = await getDocs(messagesRef);
  messagesBox.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    messagesBox.insertAdjacentHTML(
      "beforeend",
      `<div class="message">
         <p><strong>Pengirim:</strong> ${d.sender}</p>
         <p><strong>Tujuan :</strong> ${d.recipient}</p>
         <p>${d.message}</p>
         <small>${new Date(d.timestamp.seconds*1000).toLocaleString()}</small>
       </div>`
    );
  });
}

// Submit form
confessForm.addEventListener("submit", async e => {
  e.preventDefault();
  const sender    = confessForm.sender.value.trim();
  const recipient = confessForm.recipient.value.trim();
  const message   = confessForm.message.value.trim();
  if (sender && recipient && message) {
    await sendMessage(sender, recipient, message);
    confessForm.reset();
  } else {
    alert("Semua kolom harus diisi!");
  }
});

// tampilkan pesan saat pertama load
displayMessages();
