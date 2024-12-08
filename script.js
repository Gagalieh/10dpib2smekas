// Menangani popup gambar pada galeri
const galleryImages = document.querySelectorAll('.gallery-item img');
const popupContainer = document.createElement('div');
popupContainer.classList.add('popup-container');
document.body.appendChild(popupContainer);

galleryImages.forEach((image) => {
    image.addEventListener('click', (e) => {
        const imgSrc = e.target.src;
        popupContainer.innerHTML = `
            <div class="popup-content">
                <span class="close-btn">&times;</span>
                <img src="${imgSrc}" alt="Popup Image">
            </div>
        `;
        popupContainer.style.display = 'flex';

        // Menangani penutupan popup
        const closeBtn = popupContainer.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            popupContainer.style.display = 'none';
        });
    });
});

// Menangani pengiriman form "Confess"
const confessForm = document.getElementById('confessForm');
const confessMessagesContainer = document.getElementById('confessMessages');

confessForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Mencegah form submit secara default

    const sender = event.target.sender.value;
    const recipient = event.target.recipient.value;
    const message = event.target.message.value;

    // Membuat elemen pesan
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerHTML = `
        <p><strong>Pengirim:</strong> ${sender}</p>
        <p><strong>Tujuan:</strong> ${recipient}</p>
        <p><strong>Pesan:</strong> ${message}</p>
        <small>${new Date().toLocaleString()}</small>
    `;

    // Menambahkan pesan ke tampilan
    confessMessagesContainer.appendChild(messageElement);

    // Mengosongkan form setelah pengiriman
    confessForm.reset();
});
