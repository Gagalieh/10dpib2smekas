// Import fungsi-fungsi yang diperlukan dari SDK Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

// Konfigurasi Firebase untuk proyek Anda
const firebaseConfig = {
  apiKey: "AIzaSyCerjYAvrSiMNhcWUV9UMlnVRAKl_4bsG4", // Ganti dengan API Key Firebase Anda
  authDomain: "confessdatabase.firebaseapp.com", // Ganti dengan authDomain Firebase Anda
  projectId: "confessdatabase", // Ganti dengan projectId Firebase Anda
  storageBucket: "confessdatabase.appspot.com", // Ganti dengan storageBucket Firebase Anda
  messagingSenderId: "310928401216", // Ganti dengan messagingSenderId Firebase Anda
  appId: "1:310928401216:web:4be2fa651e75f20d5c10a5" // Ganti dengan appId Firebase Anda
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor inisialisasi Firebase untuk digunakan di file lain
export { app };
