// app/page.tsx

"use client"; // Diperlukan untuk useEffect dan useRouter

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Gunakan 'next/navigation' untuk App Router
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig'; // Pastikan path ini benar

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // State untuk loading awal

  useEffect(() => {
    // Listener untuk memeriksa perubahan status login
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Jika pengguna sudah login, arahkan ke dashboard
        router.replace('/dashboard'); // Ganti dengan replace agar tidak bisa kembali ke halaman ini
      } else {
        // Jika pengguna belum login, arahkan ke halaman login
        router.replace('/login'); // Ganti dengan replace
      }
      // Set loading false setelah pengecekan awal selesai
      // Kita bisa tambahkan sedikit delay agar tidak terlalu cepat jika redirect
      // setTimeout(() => setLoading(false), 300); // Opsional delay
      setLoading(false); // Atau langsung set false
    });

    // Cleanup listener saat komponen unmount
    return () => unsubscribe();
  }, [router]); // Tambahkan router sebagai dependency

  // Tampilkan pesan loading selama pengecekan awal
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Memeriksa sesi...</p>
        {/* Anda bisa ganti dengan komponen spinner/loading yang lebih baik */}
      </div>
    );
  }

  // Seharusnya pengguna sudah diarahkan, return null atau fallback UI
  // Return null lebih baik jika redirect sudah pasti terjadi
  return null;

  /*
  // ATAU, jika ingin fallback UI (jarang diperlukan dengan replace):
  return (
    <div className="flex min-h-screen items-center justify-center">
       <p>Mengarahkan...</p>
     </div>
   );
  */
}