// Pastikan Firebase SDK sudah diimport di index.html
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Menginisialisasi Firestore
const db = getFirestore();

// Referensi ke elemen form
const confessForm = document.getElementById('confessForm');
const confessMessagesContainer = document.getElementById('confessMessages');

// Menambahkan pesan baru ke Firestore
confessForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Mengambil data input dari form
    const sender = document.getElementById('sender').value;
    const recipient = document.getElementById('recipient').value;
    const message = document.getElementById('message').value;

    if (sender && recipient && message) {
        try {
            // Menyimpan pesan ke Firestore
            await addDoc(collection(db, "messages"), {
                sender: sender,
                recipient: recipient,
                message: message,
                timestamp: new Date()  // Menyimpan waktu pesan
            });
            alert("Pesan berhasil dikirim!");
            // Reset form setelah pesan dikirim
            confessForm.reset();
            loadMessages();  // Memuat ulang pesan setelah pengiriman
        } catch (e) {
            console.error("Error menambahkan dokumen: ", e);
            alert("Terjadi kesalahan saat mengirim pesan.");
        }
    } else {
        alert("Semua field harus diisi!");
    }
});

// Memuat pesan dari Firestore
async function loadMessages() {
    try {
        // Mendapatkan pesan dari Firestore
        const querySnapshot = await getDocs(collection(db, "messages"));
        confessMessagesContainer.innerHTML = ''; // Membersihkan pesan yang ada
        querySnapshot.forEach((doc) => {
            const messageData = doc.data();
            // Menambahkan elemen baru untuk setiap pesan
            const messageElement = document.createElement('div');
            messageElement.classList.add('confess-message');
            messageElement.innerHTML = `
                <strong>${messageData.sender}</strong> untuk <em>${messageData.recipient}</em><br>
                <p>${messageData.message}</p>
                <small>${new Date(messageData.timestamp.seconds * 1000).toLocaleString()}</small>
            `;
            confessMessagesContainer.appendChild(messageElement);
        });
    } catch (e) {
        console.error("Error mengambil pesan: ", e);
    }
}

// Memuat pesan saat halaman pertama kali dimuat
window.onload = loadMessages;
