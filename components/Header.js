// components/Header.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

// Modern Icons
const MenuIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const Header = ({ title, onToggleSidebar, isSidebarExpanded }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        console.log("User logged out or not logged in.");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Logout berhasil");
      router.push('/login');
    } catch (error) {
      console.error("Error logout:", error);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          {/* Toggle Button - Selalu tampil di mobile, tampil di desktop saat collapsed */}
          <button
            onClick={onToggleSidebar}
            className={`
              flex h-10 w-10 items-center justify-center rounded-xl 
              text-gray-600 transition-colors hover:bg-gray-100 
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              ${isSidebarExpanded ? 'md:hidden' : ''}
            `}
            aria-label="Toggle sidebar"
          >
            {isSidebarExpanded ? <MenuIcon /> : <ChevronRightIcon />}
          </button>

          {/* Title */}
          <div>
            <h1 className="text-lg font-bold text-gray-900 md:text-xl">{title}</h1>
            <p className="hidden text-xs text-gray-500 sm:block">Kelola bisnis Anda dengan mudah</p>
          </div>
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* User Avatar & Info */}
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900" title={user.displayName || 'User'}>
                  {user.displayName || 'Pengguna'}
                </p>
                <p className="text-xs text-gray-500" title={user.email}>
                  {user.email}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white ring-2 ring-white shadow-lg">
                {(user.displayName || 'U')[0].toUpperCase()}
              </div>
            </div>

            {/* Mobile Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-md sm:hidden">
              {(user.displayName || 'U')[0].toUpperCase()}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-all hover:bg-red-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Logout"
            >
              <LogoutIcon />
            </button>
          </div>
        ) : (
          <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-100"></div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <LogoutIcon />
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Keluar dari Akun?</h3>
            <p className="mb-6 text-sm text-gray-600">
              Anda akan keluar dari dashboard. Pastikan semua perubahan telah tersimpan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;