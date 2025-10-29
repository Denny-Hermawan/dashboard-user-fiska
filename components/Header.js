// components/Header.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig"; // Sesuaikan path

// Ikon Hamburger Menu
const MenuIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
);
// Ikon Logout
const LogoutIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
);


// Terima onToggleSidebar
const Header = ({ title, onToggleSidebar }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Update user state
      if (!currentUser) {
        // Jangan redirect di sini, biarkan layout atau page yang handle
        console.log("User logged out or not logged in.");
      }
    });
    return () => unsubscribe();
  }, []); // Hanya run sekali saat mount

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Logout berhasil");
      // Redirect ke login setelah logout berhasil
      router.push('/login');
    } catch (error) {
      console.error("Error logout:", error);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm md:px-6">
      <div className="flex items-center">
        {/* Tombol Toggle Sidebar (hanya muncul di mobile/tablet) */}
        <button
          onClick={onToggleSidebar} // Panggil fungsi toggle
          className="mr-3 rounded p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden"
          aria-label="Toggle sidebar"
        >
           <MenuIcon />
        </button>

        {/* Judul Halaman */}
        <h1 className="text-lg md:text-xl font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Info User & Logout */}
      {user ? (
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden text-right sm:block">
            <p className="truncate text-sm font-medium text-gray-700" title={user.displayName || 'User'}>
              {user.displayName || 'Pengguna'}
            </p>
            <p className="truncate text-xs text-gray-500" title={user.email}>{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 rounded-md bg-red-50 p-2 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            title="Logout"
          >
             <LogoutIcon />
          </button>
        </div>
      ) : (
         // Placeholder jika user belum terload
         <div className="h-10 w-32 animate-pulse rounded bg-gray-200"></div>
      )}
    </header>
  );
};

export default Header;