// Menambahkan event listener untuk setiap gambar di galeri
document.querySelectorAll('.gallery-item img').forEach((img) => {
    img.addEventListener('click', (event) => {
        // Ambil URL gambar yang di-klik
        const imgSrc = event.target.src;

        // Menampilkan popup dengan gambar yang dipilih
        const popupContainer = document.createElement('div');
        popupContainer.classList.add('popup-container');

        // Membuat konten popup
        const popupContent = document.createElement('div');
        popupContent.classList.add('popup-content');
        
        // Membuat elemen gambar di dalam popup
        const popupImg = document.createElement('img');
        popupImg.src = imgSrc;
        popupContent.appendChild(popupImg);

        // Menambahkan tombol close
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close-btn');
        closeBtn.innerHTML = '&times;';
        popupContent.appendChild(closeBtn);

        // Menambahkan popup ke dalam halaman
        popupContainer.appendChild(popupContent);
        document.body.appendChild(popupContainer);

        // Menutup popup ketika tombol close di-klik
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(popupContainer);
        });

        // Menutup popup ketika mengklik area luar popup
        popupContainer.addEventListener('click', (event) => {
            if (event.target === popupContainer) {
                document.body.removeChild(popupContainer);
            }
        });
    });
});

// Fitur Confess Form (Menampilkan pesan yang dikirim)
const confessForm = document.getElementById('confessForm');
const confessMessages = document.getElementById('confessMessages');

confessForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Menghentikan pengiriman form secara default

    const sender = document.getElementById('sender').value;
    const recipient = document.getElementById('recipient').value;
    const message = document.getElementById('message').value;

    if (sender && recipient && message) {
        // Membuat elemen pesan baru
        const newMessage = document.createElement('div');
        newMessage.classList.add('message');

        // Menambahkan konten pesan
        newMessage.innerHTML = `
            <p><strong>Pengirim:</strong> ${sender}</p>
            <p><strong>Tujuan:</strong> ${recipient}</p>
            <p><strong>Pesan:</strong> ${message}</p>
            <small>${new Date().toLocaleString()}</small>
        `;

        // Menambahkan pesan ke bagian bawah daftar pesan
        confessMessages.appendChild(newMessage);

        // Mengosongkan form setelah pesan dikirim
        confessForm.reset();
    }
});
