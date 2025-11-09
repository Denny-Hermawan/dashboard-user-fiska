// app/login/page.js

"use client";

import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig"; // Sesuaikan path jika perlu
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- Ikon Baru (React Icons) ---
import { FcGoogle } from 'react-icons/fc';
// --- Akhir Ikon ---

function LoginPage() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState(null); // Hapus <string | null>
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Login berhasil:", result.user.uid);
      // Listener onAuthStateChanged akan handle redirect
    } catch (error) { // Hapus : any
      console.error("Error login Google:", error);
      // Cek error code (contoh)
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Login dibatalkan oleh pengguna.");
      } else if (error.code === 'auth/cancelled-popup-request') {
         setError("Permintaan login kedua dibatalkan.");
      } else if (error.code === 'auth/popup-blocked-by-browser') {
        setError("Popup login diblokir oleh browser. Izinkan popup untuk situs ini.");
      } else {
        setError("Terjadi kesalahan saat login. Silakan coba lagi.");
      }
      setIsSigningIn(false);
    }
    // Tidak perlu setIsSigningIn(false) di akhir jika sukses karena akan redirect
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Memeriksa sesi...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-100 via-white to-cyan-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg md:p-10">
        <div className="mb-6 flex justify-center">
           <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 shadow-md">
             <Image
                src="/assets/images/logo.png" // PASTIKAN PATH INI BENAR
                alt="Logo FISKA POS"
                width={40}
                height={40}
                onError={(e) => { e.currentTarget.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; e.currentTarget.style.display='none'; }}
             />
           </div>
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800 md:text-3xl">
          Masuk ke Dashboard
        </h1>
        <p className="mb-8 text-center text-sm text-gray-600 md:text-base">
          Gunakan akun Google Anda untuk melanjutkan.
        </p>
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className={`relative flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            isSigningIn ? 'cursor-wait' : ''
          }`}
        >
          {isSigningIn ? (
            <svg className="mr-2 h-5 w-5 animate-spin text-cyan-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
             <FcGoogle className="mr-2 h-5 w-5" />
          )}
          {isSigningIn ? 'Memproses...' : 'Lanjutkan dengan Google'}
        </button>
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