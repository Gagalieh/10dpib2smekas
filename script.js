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
// Ambil elemen popup dan close button
const popup = document.getElementById('popup-image');
const closePopup = document.querySelector('.close-popup');
const popupImg = document.getElementById('popup-img');

// Ambil semua gambar dengan class .popup-trigger
const popupTriggers = document.querySelectorAll('.popup-trigger');

// Menambahkan event listener pada setiap gambar untuk memicu popup
popupTriggers.forEach(trigger => {
    trigger.addEventListener('click', function() {
        const imageSource = this.src;
        popupImg.src = imageSource;  // Atur sumber gambar popup
        popup.style.display = 'flex'; // Tampilkan popup
    });
});

// Menutup popup saat klik tombol close
closePopup.addEventListener('click', () => {
    popup.style.display = 'none';
});

// Menutup popup saat klik di luar gambar
window.addEventListener('click', (event) => {
    if (event.target === popup) {
        popup.style.display = 'none';
    }
});
