// Inisialisasi Firebase dan Firestore sudah dilakukan di index.html, 
// jadi script.js tidak perlu banyak modifikasi.

// Menampilkan pesan dari Firestore
const getMessages = async () => {
    try {
        // Mendapatkan referensi koleksi
        const querySnapshot = await getDocs(collection(db, "confessMessages"));
        const messagesContainer = document.getElementById('confessMessages');
        messagesContainer.innerHTML = ''; // Clear previous messages

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const messageElement = document.createElement('div');
            messageElement.innerHTML = `
                <p><strong>${data.sender} to ${data.recipient}:</strong> ${data.message}</p>
            `;
            messagesContainer.appendChild(messageElement);
        });
    } catch (error) {
        console.error("Error getting messages: ", error);
    }
};

// Memanggil fungsi untuk menampilkan pesan setelah halaman dimuat
window.onload = getMessages;