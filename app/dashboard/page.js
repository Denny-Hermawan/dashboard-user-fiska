// app/dashboard/page.js

"use client"; // <--- TAMBAHKAN BARIS INI DI PALING ATAS

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // Sesuaikan path
import { auth } from "@/lib/firebaseConfig"; // Untuk mendapatkan user saat ini
import { useEffect, useState } from "react";

function DashboardPage() {
  const [storeName, setStoreName] = useState("Memuat...");
  const [user, setUser] = useState(auth.currentUser); // Simpan user di state

  // Listener untuk perubahan status auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((newUser) => {
      setUser(newUser);
    });
    return () => unsubscribe(); // Cleanup listener saat komponen unmount
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      if (user) {
        // Path ke dokumen setting [lihat: lib/services/settings_service.dart]
        const settingsRef = doc(db, "users", user.uid, "settings", "config");
        try {
          const docSnap = await getDoc(settingsRef);
          if (docSnap.exists()) {
            setStoreName(docSnap.data().storeName || "Nama Toko Belum Diatur");
          } else {
            setStoreName("Pengaturan Belum Ada");
          }
        } catch (error) {
          console.error("Error ambil settings:", error);
          setStoreName("Gagal memuat");
        }
      } else {
         // Jika user logout atau belum login saat fetch
         setStoreName("Silakan login untuk melihat dashboard");
      }
    };

    fetchSettings();
  }, [user]); // Jalankan ulang jika user berubah (login/logout)

  // Tambahkan handling jika user belum login
  if (!user) {
    // Anda bisa return komponen loading atau redirect ke halaman login
    return (
      <div>
        <p>Memuat user atau silakan login...</p>
        {/* Tambahkan link ke halaman login jika perlu */}
      </div>
    );
  }

  // Tampilkan dashboard jika user sudah login
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Selamat datang, {user.displayName || 'Pengguna'}!</p>
      <p>Nama Toko Anda: {storeName}</p>
      {/* Tambahkan data lain di sini */}
    </div>
  );
}

export default DashboardPage;