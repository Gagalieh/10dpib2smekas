man pertama kali dimuat
window.onload = loadMessages;
// Menunggu DOM siap
document.addEventListener("DOMContentLoaded", function() {
    // Menambahkan event listener untuk menu navigasi
    const navLinks = document.querySelectorAll("nav a");
    navLinks.forEach(link => {
        link.addEventListener("click", function(event) {
            // Menghentikan link default dan menampilkan bagian terkait
            event.preventDefault();
            const targetSection = document.querySelector(link.getAttribute("href"));
            scrollToSection(targetSection);
        });
    });

    // Fungsi untuk menggulir ke bagian tertentu secara mulus
    function scrollToSection(section) {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // Galeri gambar - Menangani klik gambar untuk memperbesar
    const galleryItems = document.querySelectorAll(".gallery-item img");
    galleryItems.forEach(item => {
        item.addEventListener("click", function() {
            const imageUrl = item.src;
            openImageModal(imageUrl);
        });
    });

    // Fungsi untuk menampilkan gambar dalam modal
    function openImageModal(imageUrl) {
        const modal = document.createElement("div");
        modal.classList.add("modal");

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = "Gambar Besar";
        
        const closeButton = document.createElement("button");
        closeButton.textContent = "Tutup";
        closeButton.addEventListener("click", function() {
            modal.remove();
        });

        modal.appendChild(img);
        modal.appendChild(closeButton);
        document.body.appendChild(modal);
    }

    // News section - Menambahkan event listener pada link berita
    const newsLinks = document.querySelectorAll("#news a");
    newsLinks.forEach(link => {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            alert("Fitur ini sedang dalam pengembangan.");
        });
    });
});
