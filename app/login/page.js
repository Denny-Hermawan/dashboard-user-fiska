// app/login/page.js (atau .tsx)

"use client";

import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig"; // Sesuaikan path jika perlu
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import Image

function LoginPage() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null); // State untuk pesan error
  const [checkingAuth, setCheckingAuth] = useState(true); // State loading cek auth

  // Cek apakah user sudah login, jika iya, redirect ke dashboard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard'); // Langsung redirect jika sudah login
      } else {
        setCheckingAuth(false); // Selesai cek, user belum login
      }
    });
    return () => unsubscribe(); // Cleanup listener
  }, [router]);

  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError(null); // Reset error
    try {
      const result = await signInWithPopup(auth, provider);
      // Firebase listener (onAuthStateChanged) akan menangani redirect
      console.log("Login berhasil:", result.user.uid);
      // Tidak perlu redirect manual di sini karena listener akan aktif
    } catch (error) { // Tangkap error
      console.error("Error login Google:", error);
      // Tampilkan pesan error yang lebih user-friendly
      if (error?.code === 'auth/popup-closed-by-user') {
        setError("Login dibatalkan oleh pengguna.");
      } else if (error?.code === 'auth/cancelled-popup-request') {
         setError("Permintaan login kedua dibatalkan.");
      } else if (error?.code === 'auth/popup-blocked-by-browser') {
        setError("Popup login diblokir oleh browser. Izinkan popup untuk situs ini.");
      }
       else {
        setError("Terjadi kesalahan saat login. Silakan coba lagi.");
      }
      setIsSigningIn(false); // Hentikan loading jika error
    }
    // Tidak perlu setIsSigningIn(false) di sini jika sukses, karena akan redirect
  };

  // Tampilkan loading saat cek auth awal
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Memeriksa sesi...</p>
      </div>
    );
  }

  // Tampilan Halaman Login
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-cyan-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg md:p-10">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
           <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 shadow-md">
             {/* Ganti dengan path logo Anda jika ada */}
             <Image
                src="/assets/images/logo.png" // PASTIKAN PATH INI BENAR
                alt="Logo FISKA POS"
                width={40}
                height={40}
                onError={(e) => { e.currentTarget.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; e.currentTarget.style.display='none'; /* Fallback atau sembunyikan jika error */ }}
             />
           </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800 md:text-3xl">
          Masuk ke Dashboard
        </h1>
        <p className="mb-8 text-center text-sm text-gray-600 md:text-base">
          Gunakan akun Google Anda untuk melanjutkan.
        </p>

        {/* Tombol Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className={`relative flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            isSigningIn ? 'cursor-wait' : ''
          }`}
        >
          {isSigningIn ? (
            <svg className="mr-2 h-5 w-5 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
             <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
               <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
               <path fill="#FF3D00" d="M6.306 14.691c-1.291 2.404-2.064 5.093-2.064 7.938s.773 5.534 2.064 7.938l-5.657 5.657C.612 33.116 0 28.711 0 24s.612-9.116 2.649-12.938l5.657 3.63z"/>
               <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238c-1.956 1.346-4.464 2.179-7.219 2.179-5.557 0-10.318-3.714-11.996-8.718l-5.656 5.656C7.265 39.522 14.978 44 24 44z"/>
               <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.296-2.262 4.288-4.387 5.727l6.19 5.238C39.997 34.696 44 28.846 44 24c0-1.341-.138-2.65-.389-3.917z"/>
             </svg>
          )}
          {isSigningIn ? 'Memproses...' : 'Lanjutkan dengan Google'}
        </button>

        {/* Tampilkan Pesan Error */}
        {error && (
          <p className="mt-4 text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;