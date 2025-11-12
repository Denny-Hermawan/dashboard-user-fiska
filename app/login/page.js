// app/login/page.js

"use client";

import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signInWithEmailAndPassword, // <-- BARU
  sendPasswordResetEmail      // <-- BARU
} from "firebase/auth";
import { auth } from "@/lib/firebaseConfig"; 
import { useRouter, useSearchParams } from 'next/navigation'; // <-- Import useSearchParams
import Image from 'next/image';
import Link from 'next/link'; // <-- BARU

// --- Ikon Baru (React Icons) ---
import { FcGoogle } from 'react-icons/fc';
import { 
  HiOutlineMail, 
  HiOutlineLockClosed, 
  HiOutlineEye, 
  HiOutlineEyeOff 
} from 'react-icons/hi';
// --- Akhir Ikon ---

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // <-- Untuk pesan sukses registrasi

  // State untuk Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // State untuk Loading
  const [isSigningInEmail, setIsSigningInEmail] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  
  // State Error dan Sukses
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(''); // <-- BARU

  const [checkingAuth, setCheckingAuth] = useState(true);

  // Gabungkan state loading
  const isAnyLoading = isSigningInEmail || isSigningInGoogle;

  useEffect(() => {
    // Cek apakah ada pesan sukses dari halaman register
    if (searchParams.get('status') === 'registered') {
      setSuccessMessage('Registrasi berhasil! Silakan cek email Anda (termasuk folder Spam) untuk verifikasi sebelum login.');
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Jika login tapi email belum diverifikasi (KECUALI Google, karena Google pasti terverifikasi)
        if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
           setError('Email Anda belum diverifikasi. Silakan cek inbox (atau Spam).');
           auth.signOut(); // Logout paksa, sama seperti di Flutter
           setCheckingAuth(false);
        } else {
          router.replace('/dashboard');
        }
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router, searchParams]);

  const provider = new GoogleAuthProvider();

  // Handler Login Google
  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setError(null);
    setSuccessMessage('');
    try {
      await signInWithPopup(auth, provider);
      // Listener onAuthStateChanged akan handle redirect
    } catch (error) {
      console.error("Error login Google:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Login dibatalkan oleh pengguna.");
      } else {
        setError("Terjadi kesalahan saat login Google. Silakan coba lagi.");
      }
      setIsSigningInGoogle(false);
    }
  };

  // Handler Login Email
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    
    setIsSigningInEmail(true);
    setError(null);
    setSuccessMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user && !user.emailVerified) {
        // Berhasil login, TAPI belum verifikasi
        setError('Email Anda belum diverifikasi. Silakan cek inbox (atau Spam).');
        await auth.signOut(); // Logout paksa
      }
      // Jika berhasil DAN terverifikasi, onAuthStateChanged akan handle redirect

    } catch (error) {
      console.error("Error login Email:", error.code);
      let message;
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Email atau password salah.';
          break;
        case 'auth/invalid-email':
          message = 'Format email tidak valid.';
          break;
        case 'auth/user-disabled':
          message = 'Akun ini telah dinonaktifkan.';
          break;
        default:
          message = 'Gagal Login. Silakan coba lagi.';
      }
      setError(message);
    } finally {
      setIsSigningInEmail(false);
    }
  };

  // Handler Lupa Password
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Harap masukkan email Anda di kolom email terlebih dahulu.");
      return;
    }
    
    setError(null);
    setSuccessMessage(''); // Hapus pesan sukses lama

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Link reset password telah dikirim ke email Anda. Silakan cek inbox (atau Spam).');
    } catch (error) {
      console.error("Error Lupa Password:", error);
      if (error.code === 'auth/user-not-found') {
        setError("Email tidak terdaftar.");
      } else {
        setError("Gagal mengirim email reset password. Coba lagi nanti.");
      }
    }
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
        
        {/* Logo dan Judul */}
        <div className="mb-6 flex justify-center">
           <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 shadow-md">
             <Image
                src="/assets/images/logo.png"
                alt="Logo FISKA POS"
                width={40}
                height={40}
             />
           </div>
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800 md:text-3xl">
          Selamat Datang
        </h1>
        <p className="mb-8 text-center text-sm text-gray-600 md:text-base">
          Masuk ke akun FISKA POS Anda
        </p>

        {/* Notifikasi Error/Sukses */}
        {error && (
          <p className="mb-4 rounded-md bg-red-100 p-3 text-center text-sm text-red-700">
            {error}
          </p>
        )}
        {successMessage && (
          <p className="mb-4 rounded-md bg-green-100 p-3 text-center text-sm text-green-700">
            {successMessage}
          </p>
        )}

        {/* --- FORM LOGIN EMAIL BARU --- */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {/* Input Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <HiOutlineMail className="h-5 w-5 text-gray-400" />
              </span>
              <input
                type="email"
                id="email"
                name="email"
                disabled={isAnyLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anda@email.com"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 text-black placeholder-gray-500"
              />
            </div>
          </div>

          {/* Input Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <HiOutlineLockClosed className="h-5 w-5 text-gray-400" />
              </span>
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                id="password"
                name="password"
                disabled={isAnyLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 text-black placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {isPasswordVisible ? (
                  <HiOutlineEyeOff className="h-5 w-5" />
                ) : (
                  <HiOutlineEye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Lupa Password */}
          <div className="text-right">
            <button
              type="button"
              disabled={isAnyLoading}
              onClick={handleForgotPassword}
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60"
            >
              Lupa Password?
            </button>
          </div>

          {/* Tombol Login Email */}
          <button
            type="submit"
            disabled={isAnyLoading}
            className={`flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors duration-200 ease-in-out hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              isSigningInEmail ? 'cursor-wait' : ''
            }`}
          >
            {isSigningInEmail ? (
              <svg className="mr-2 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {isSigningInEmail ? 'Memproses...' : 'Login'}
          </button>
        </form>
        {/* --- AKHIR FORM LOGIN --- */}


        {/* --- Pemisah "ATAU" --- */}
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 flex-shrink text-sm font-medium text-gray-500">
            ATAU
          </span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        
        {/* Tombol Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isAnyLoading}
          className={`relative flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            isSigningInGoogle ? 'cursor-wait' : ''
          }`}
        >
          {isSigningInGoogle ? (
            <svg className="mr-2 h-5 w-5 animate-spin text-cyan-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
             <FcGoogle className="mr-2 h-5 w-5" />
          )}
          {isSigningInGoogle ? 'Memproses...' : 'Lanjutkan dengan Google'}
        </button>

        {/* --- Link ke Halaman Register --- */}
        <p className="mt-8 text-center text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link href="/register">
            <span className={`font-medium text-cyan-600 hover:text-cyan-700 ${isAnyLoading ? 'pointer-events-none opacity-60' : ''}`}>
              Daftar di sini
            </span>
          </Link>
        </p>

      </div>
    </div>
  );
}

export default LoginPage;