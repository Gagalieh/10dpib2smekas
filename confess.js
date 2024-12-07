// Mengimpor Firestore dan db dari config.js
import { db } from './config.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Mendapatkan referensi ke koleksi "messages" di Firestore
const messagesRef = collection(db, "messages");

// Mendapatkan form dan kontainer untuk menampilkan pesan
const confessForm = document.getElementById("confessForm");
const confessMessagesContainer = document.getElementById("confessMessages");

// Fungsi untuk mengirim pesan ke Firestore
async function sendMessage(sender, recipient, message) {
    try {
        // Menambahkan pesan ke Firestore
        await addDoc(messagesRef, {
            sender: sender,
            recipient: recipient,
            message: message,
            timestamp: new Date() // Menambahkan timestamp agar pesan bisa diurutkan
        });
        console.log("Pesan terkirim!");
        // Menampilkan pesan yang terkirim tanpa perlu me-reload halaman
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
        confessMessagesContainer.innerHTML = ''; // Kosongkan kontainer sebelum menampilkan pesan baru
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

// Menangani pengiriman form Confess
confessForm.addEventListener("submit", (e) => {
    e.preventDefault();  // Mencegah halaman reload saat form disubmit

    // Mengambil nilai dari form
    const sender = document.getElementById("sender").value;
    const recipient = document.getElementById("recipient").value;
    const message = document.getElementById("message").value;

    // Cek apakah semua field diisi
    if (sender && recipient && message) {
        sendMessage(sender, recipient, message);  // Kirim pesan
    } else {
        alert("Semua kolom harus diisi!");  // Jika ada kolom yang kosong
    }

    confessForm.reset();  // Reset form setelah pengiriman pesan
});

// Menampilkan pesan saat halaman pertama kali dimuat
displayMessages();
