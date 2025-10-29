import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // Sesuaikan path
import { auth } from "@/lib/firebaseConfig"; // Untuk mendapatkan user saat ini
import { useEffect, useState } from "react";

function DashboardPage() {
  const [storeName, setStoreName] = useState("Memuat...");
  const user = auth.currentUser; // Dapatkan user yg login

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
         setStoreName("User tidak login");
      }
    };

    fetchSettings();
  }, [user]); // Jalankan ulang jika user berubah

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Selamat datang!</p>
      <p>Nama Toko Anda: {storeName}</p>
      {/* Tambahkan data lain di sini */}
    </div>
  );
}

export default DashboardPage;