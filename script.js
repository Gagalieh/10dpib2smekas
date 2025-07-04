// script.js
const toggleButton = document.getElementById('toggleButton');
const gallery = document.getElementById('gallery');

toggleButton.addEventListener('click', () => {
  if (gallery.style.display === 'none' || gallery.style.display === '') {
    gallery.style.display = 'grid';
    toggleButton.textContent = 'Tutup Galeri';
  } else {
    gallery.style.display = 'none';
    toggleButton.textContent = 'Buka Galeri';
  }
})
// script.js
const toggleMessage = document.getElementById('toggleMessage');
const confessMessages = document.getElementById('confessMessages');

toggleMessage.addEventListener('click', () => {
  if (confessMessages.classList.contains('hide')) {
    confessMessages.classList.remove('hide');
    toggleMessage.textContent = 'Tutup Pesan';
  } else {
    confessMessages.classList.add('hide');
    toggleMessage.textContent = 'Buka Pesan';
  }
});
// Mengimpor Firestore SDK
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Mendapatkan referensi ke Firestore
const db = getFirestore();

// Mendapatkan referensi ke koleksi "messages"
const messagesRef = collection(db, "messages");

// Mendapatkan form dan tempat untuk menampilkan pesan
const confessForm = document.getElementById("confessForm");
const confessMessagesContainer = document.getElementById("confessMessages");

// Fungsi untuk mengirimkan pesan ke Firestore
async function sendMessage(sender, recipient, message) {
    try {
        // Menambahkan pesan baru ke Firestore
        await addDoc(messagesRef, {
            sender: sender,
            recipient: recipient,
            message: message,
            timestamp: new Date() // Timestamp untuk pengurutan
        });
        console.log("Pesan terkirim!");
        // Memperbarui tampilan dengan pesan terbaru
        displayMessages();
    } catch (error) {
        console.error("Error menambahkan pesan: ", error);
    }
}

// Fungsi untuk menampilkan semua pesan yang ada di Firestore
async function displayMessages() {
    try {
        // Mengambil semua pesan dari Firestore
        const querySnapshot = await getDocs(messagesRef);
        confessMessagesContainer.innerHTML = ''; // Mengosongkan kontainer sebelum menampilkan pesan baru
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const messageElement = document.createElement("div");
            messageElement.classList.add("message");
            messageElement.innerHTML = `
                <p><strong>Pengirim:</strong> ${data.sender}</p>
                <p><strong>Tujuan:</strong> ${data.recipient}</p>
                <p><strong>Pesan:</strong> ${data.message}</p>
                <p><small>Waktu: ${new Date(data.timestamp.seconds * 1000).toLocaleString()}</small></p>
                <hr>
            `;
            confessMessagesContainer.appendChild(messageElement);
        });
    } catch (error) {
        console.error("Error menampilkan pesan: ", error);
    }
}

// Menangani pengiriman formulir confess
confessForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const sender = document.getElementById("sender").value;
    const recipient = document.getElementById("recipient").value;
    const message = document.getElementById("message").value;

    if (sender && recipient && message) {
        sendMessage(sender, recipient, message);
    } else {
        alert("Semua kolom harus diisi!");
    }

    confessForm.reset(); // Reset form setelah pengiriman pesan
});

// Menampilkan pesan saat halaman pertama kali dimuat
displayMessages();

// ===== CONFIG =====
const GITHUB_USER = "Gagalieh";   // ← ganti
const GITHUB_REPO = "10dpib2smekas";       // ← ganti
const IMAGE_DIR   = "images";     // folder berisi gambar

// ===== ELEMENT =====
const gallery   = document.getElementById("gallery");
const toggleBtn = document.getElementById("toggleButton");

// ===== FETCH FILE LIST FROM GITHUB =====
async function loadGallery() {
  const api = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${IMAGE_DIR}`;
  try {
    const res  = await fetch(api);
    const list = await res.json();                   // [{name,download_url,type}, …]

    list
      .filter(f => f.type === "file" && /\.(png|jpe?g|gif|webp)$/i.test(f.name))
      .forEach(f => {
        const item = document.createElement("div");
        item.className = "gallery-item";

        const img  = document.createElement("img");
        img.src    = f.download_url;                 // raw.githubusercontent… link
        img.alt    = f.name;

        item.appendChild(img);
        gallery.appendChild(item);
      });
  } catch (err) {
    console.error("Galeri gagal dimuat:", err);
    gallery.innerHTML = "<p style='color:red'>Galeri tidak dapat dimuat.</p>";
  }
}

// ===== TOGGLE BUTTON (BUKA / TUTUP GALERI) =====
toggleBtn.addEventListener("click", async () => {
  // pertama kali ditekan → fetch gambar
  if (!gallery.dataset.loaded) {
    await loadGallery();
    gallery.dataset.loaded = "true";
  }

  gallery.classList.toggle("hidden");
  toggleBtn.textContent = gallery.classList.contains("hidden")
    ? "Buka Galeri"
    : "Tutup Galeri";
});
