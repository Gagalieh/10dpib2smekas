// Menghubungkan Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDHdq8NtG03ZON3ND6qWaHCuoOzFr7PIsU",
    authDomain: "confessdata-a824c.firebaseapp.com",
    projectId: "confessdata-a824c",
    storageBucket: "confessdata-a824c.firebasestorage.app",
    messagingSenderId: "1084283671185",
    appId: "1:1084283671185:web:96223afcaad4b8175f2530",
    measurementId: "G-7NHZ5GDTNT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fungsi untuk mengirim pesan confess ke Firebase
const confessForm = document.getElementById("confessForm");

confessForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const sender = e.target.sender.value;
    const recipient = e.target.recipient.value;
    const message = e.target.message.value;

    try {
        // Menambahkan pesan ke Firestore
        const docRef = await addDoc(collection(db, "confessMessages"), {
            sender: sender,
            recipient: recipient,
            message: message,
            timestamp: new Date()
        });
        alert("Pesan berhasil dikirim!");
        confessForm.reset();
        loadConfessMessages(); // Memuat ulang pesan setelah mengirim
    } catch (e) {
        console.error("Error adding document: ", e);
    }
});

// Fungsi untuk menampilkan pesan yang telah dikirim
const loadConfessMessages = async () => {
    const messagesContainer = document.getElementById("confessMessages");
    messagesContainer.innerHTML = ''; // Clear existing messages

    const querySnapshot = await getDocs(collection(db, "confessMessages"));
    querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.innerHTML = `
            <p><strong>${messageData.sender} untuk ${messageData.recipient}</strong></p>
            <p>${messageData.message}</p>
            <small>Di kirim pada: ${new Date(messageData.timestamp.seconds * 1000).toLocaleString()}</small>
        `;
        messagesContainer.appendChild(messageElement);
    });
};

// Fungsi untuk toggle galeri album
function toggleGallery() {
    const galleryContainer = document.getElementById("gallery-container");
    galleryContainer.classList.toggle("hidden");
}

// Fungsi untuk toggle pesan
function toggleMessages() {
    const messagesContainer = document.getElementById("confessMessages");
    messagesContainer.classList.toggle("hidden");
}

// Memuat pesan confess pada saat halaman dimuat
document.addEventListener("DOMContentLoaded", loadConfessMessages);
