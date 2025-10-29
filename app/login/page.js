// app/login/page.js (atau pages/login.js)

"use client"; // Diperlukan jika Anda menggunakan Hooks seperti useState/useEffect atau event handler (onClick)

import React from 'react'; // Impor React jika belum
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig"; // Sesuaikan path jika perlu
// import { useRouter } from 'next/navigation'; // Untuk App Router
// import { useRouter } from 'next/router'; // Untuk Pages Router (jika Anda pakai ini)

// --- Definisikan Komponen React Anda ---
function LoginPage() {
  // const router = useRouter(); // Inisialisasi router jika perlu redirect
  const [isSigningIn, setIsSigningIn] = React.useState(false); // Contoh state

  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Login berhasil:", user.uid, user.displayName);
      // Arahkan ke dashboard setelah login
      // router.push('/dashboard'); // Contoh redirect
      // Jika Anda tidak menggunakan router di sini, pastikan
      // ada mekanisme lain (misal listener di layout) untuk redirect
    } catch (error) {
      console.error("Error login Google:", error);
      // Tampilkan pesan error ke pengguna (misalnya pakai state)
    } finally {
      // Pastikan setIsSigningIn dipanggil bahkan jika komponen sudah unmount
      // (Meskipun dalam kasus ini mungkin tidak perlu jika langsung redirect)
       if (typeof window !== 'undefined') { // Cek jika berjalan di client
         setIsSigningIn(false);
       }
    }
  };

  // --- Return JSX (Tampilan Halaman) ---
  return (
    <div>
      <h1>Halaman Login</h1>
      {isSigningIn ? (
        <p>Memproses login...</p>
      ) : (
        <button onClick={handleGoogleSignIn}>
          Login dengan Google
        </button>
      )}
      {/* Tambahkan elemen UI lainnya */}
    </div>
  );
}

// --- PASTIKAN ADA DEFAULT EXPORT UNTUK KOMPONEN ---
export default LoginPage;