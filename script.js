const form = document.getElementById('confessForm');
const confessMessages = document.getElementById('confessMessages');

// Fungsi untuk mengirimkan pesan
form.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const sender = form.sender.value;
    const recipient = form.recipient.value;
    const message = form.message.value;
    
    fetch('/.netlify/functions/confess', {
        method: 'POST',
        body: JSON.stringify({ sender, recipient, message }),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadConfessMessages(); // Memuat pesan setelah pengiriman berhasil
        } else {
            alert('Gagal mengirim pesan');
        }
    });
});

// Fungsi untuk mengambil dan menampilkan pesan-pesan
function loadConfessMessages() {
    fetch('/.netlify/functions/confess')
    .then(response => response.json())
    .then(data => {
        confessMessages.innerHTML = ''; // Kosongkan div pesan sebelumnya
        data.messages.forEach(msg => {
            const div = document.createElement('div');
            div.classList.add('message');
            div.innerHTML = `<strong>${msg.sender} kepada ${msg.recipient}:</strong> ${msg.message}`;
            confessMessages.appendChild(div);
        });
    });
}

// Memuat pesan saat halaman dimuat pertama kali
window.onload = loadConfessMessages;