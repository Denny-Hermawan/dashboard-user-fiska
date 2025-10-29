// lib/firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3lsx5_T3-yYSW3pw3LcnFYGiO7T3pMNw", // Ganti dengan apiKey Anda
  authDomain: "project-fiska-app.firebaseapp.com", // Ganti dengan authDomain Anda
  projectId: "project-fiska-app", // Ganti dengan projectId Anda
  storageBucket: "project-fiska-app.firebasestorage.app", // Ganti dengan storageBucket Anda
  messagingSenderId: "589850420716", // Ganti dengan messagingSenderId Anda
  appId: "1:589850420716:web:7ba5ba615291f575f54cc9", // Ganti dengan appId Anda
  // measurementId opsional, bisa ditambahkan jika perlu Analytics
  measurementId: "G-8XDTDSRJLD" // Ganti dengan measurementId Anda
};

// Inisialisasi Firebase App (cek jika sudah ada)
let firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Ekspor service yang dibutuhkan
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);