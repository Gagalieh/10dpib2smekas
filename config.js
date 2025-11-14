// config.js (ganti file lama)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHdq8NtG03ZON3ND6qWaHCuoOzFr7PIsU",
  authDomain: "confessdata-a824c.firebaseapp.com",
  projectId: "confessdata-a824c",
  storageBucket: "confessdata-a824c.appspot.com",
  messagingSenderId: "1084283671185",
  appId: "1:1084283671185:web:96223afcaad4b8175f2530",
  measurementId: "G-7NHZ5GDTNT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
