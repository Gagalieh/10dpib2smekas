// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Your web app's Firebase configuration
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

// Initialize Firestore
const db = getFirestore(app);

// Export Firestore to use in other scripts
export { db };