// config.js (ganti file lama)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBM3ptGPtAz97b1IzjrDp-IyOKQ7L31rk",
  authDomain: "dpib2admin.firebaseapp.com",
  projectId: "dpib2admin",
  storageBucket: "dpib2admin.firebasestorage.app",
  messagingSenderId: "91989067198",
  appId: "1:91989067198:web:3ba8e23a27526c31c225ef",
  measurementId: "G-JW12F05ZET"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
