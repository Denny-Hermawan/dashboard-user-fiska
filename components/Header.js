// components/Header.js
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

// --- Ikon ---
import { 
  MdMenu, 
  MdChevronRight, 
  MdLogout, 
  MdNotificationsNone,
  MdNotificationsActive, 
  MdAdd,
  MdInventory2,    
  MdCategory,        
  MdCardMembership,  
  MdPeople,
  MdAccountCircle, 
  MdReceiptLong,   
  MdUndo,          
  MdCardGiftcard   
} from 'react-icons/md';
// --- Akhir Ikon ---

const Header = ({ 
  title, 
  onToggleSidebar, 
  isSidebarExpanded, 
  // Props Tambah Cepat
  onQuickAddProduct,
  onQuickAddCategory,
  onQuickAddMember,
  onQuickAddPegawai,
  // Props Notifikasi
  notifications,
  onClearNotifications
}) => {
  const router = useRouter(); 
  const [user, setUser] = useState(null);
  
  // State untuk 3 Menu
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Refs untuk deteksi klik di luar
  const quickAddRef = useRef(null);
  const quickAddButtonRef = useRef(null);
  const notifRef = useRef(null);
  const notifButtonRef = useRef(null);
  const userMenuRef = useRef(null);
  const userMenuButtonRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Efek untuk menutup semua dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Cek Menu Tambah Cepat
      if (
        isQuickAddOpen &&
        quickAddRef.current && !quickAddRef.current.contains(event.target) &&
        quickAddButtonRef.current && !quickAddButtonRef.current.contains(event.target)
      ) {
        setIsQuickAddOpen(false);
      }
      
      // Cek Menu Notifikasi
      if (
        isNotifOpen &&
        notifRef.current && !notifRef.current.contains(event.target) &&
        notifButtonRef.current && !notifButtonRef.current.contains(event.target)
      ) {
        setIsNotifOpen(false);
      }

      // Cek Menu User
      if (
        isUserMenuOpen &&
        userMenuRef.current && !userMenuRef.current.contains(event.target) &&
        userMenuButtonRef.current && !userMenuButtonRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickAddOpen, isNotifOpen, isUserMenuOpen]); 


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error logout:", error);
    }
  };

  // Komponen Tombol Ikon (Helper)
  const IconButton = ({ onClick, icon, title, className = '', buttonRef = null }) => (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`
        relative flex h-10 w-10 items-center justify-center rounded-xl 
        text-gray-600 transition-colors
        hover:bg-gray-100 hover:text-gray-900 
        focus:outline-none focus:ring-2 focus:ring-cyan-500
        ${className}
      `}
      title={title}
    >
      {icon}
    </button>
  );

  // Fungsi untuk item dropdown Tambah Cepat
  const handleQuickAddItemClick = (action) => {
    action(); 
    setIsQuickAddOpen(false); 
  };
  
  // Fungsi untuk item dropdown Akun
  const handleUserMenuItemClick = (action) => {
    if (typeof action === 'string') {
      router.push(action); 
    } else {
      action();
    }
    setIsUserMenuOpen(false);
  };

  // Helper untuk Ikon Notifikasi
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return <MdReceiptLong className="w-5 h-5 text-green-600" />;
      case 'refund':
        return <MdUndo className="w-5 h-s text-red-600" />;
      case 'compliment':
        return <MdCardGiftcard className="w-5 h-5 text-blue-600" />;
      default:
        return <MdNotificationsNone className="w-5 h-5 text-gray-500" />;
    }
  };
  
  // Helper format waktu notifikasi
  const formatNotifTime = (date) => {
    const now = new Date();
    const diff = Math.round((now - date) / 1000); // detik
    if (diff < 60) return `${diff}d lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };


  return (
    <> 
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="flex h-20 items-center justify-between px-4 md:px-6">
          
          {/* Sisi Kiri: Toggle & Judul Halaman */}
          <div className="flex items-center gap-4">
            <IconButton
              onClick={onToggleSidebar}
              icon={isSidebarExpanded ? <MdMenu className="h-6 w-6" /> : <MdChevronRight className="h-6 w-6" />}
              title="Toggle sidebar"
              className={isSidebarExpanded ? 'md:hidden' : ''} 
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{title}</h1>
            </div>
          </div>

          {/* Sisi Kanan: Aksi & User */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* --- Tombol Aksi (Tambah Cepat & Notif) --- */}
              <div className="hidden sm:flex items-center gap-2">
                
                {/* --- Tombol Notifikasi --- */}
                <div className="relative">
                  <IconButton
                    buttonRef={notifButtonRef} 
                    onClick={() => setIsNotifOpen(prev => !prev)}
                    icon={notifications.length > 0 ? <MdNotificationsActive className="h-5 w-5 text-cyan-700" /> : <MdNotificationsNone className="h-5 w-5" />}
                    title="Notifikasi"
                    className={isNotifOpen ? 'bg-gray-100' : ''}
                  />
                  {notifications.length > 0 && (
                    <span className="pointer-events-none absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {notifications.length}
                    </span>
                  )}
                  {/* --- Panel Dropdown Notifikasi --- */}
                  {isNotifOpen && (
                    <div
                      ref={notifRef} 
                      className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] flex flex-col rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-30"
                    >
                      <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                        <button 
                          onClick={onClearNotifications}
                          className="text-xs font-medium text-cyan-700 hover:underline"
                        >
                          Tandai terbaca
                        </button>
                      </div>
                      <div className="overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-10 text-center text-sm text-gray-500">Tidak ada notifikasi baru.</p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notif) => (
                              <div key={notif.id} className="flex items-start gap-3 p-4 hover:bg-gray-50">
                                <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                                  <p className="text-xs text-gray-500">{notif.desc}</p>
                                </div>
                                <span className="text-xs text-gray-400">{formatNotifTime(notif.time)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* --- Tombol Tambah Cepat (Dropdown) --- */}
                <div className="relative">
                  <button
                    ref={quickAddButtonRef}
                    onClick={() => setIsQuickAddOpen(prev => !prev)} 
                    className={`
                      flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all
                      focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2
                      ${isQuickAddOpen 
                        ? 'bg-cyan-800 text-white' 
                        : 'bg-cyan-700 text-white hover:bg-cyan-800 hover:shadow-md'}
                    `}
                    title="Tambah Cepat"
                  >
                    <MdAdd className="w-5 h-5" />
                    <span className="hidden md:inline">Tambah Cepat</span>
                  </button>

                  {/* Panel Dropdown Tambah Cepat */}
                  {isQuickAddOpen && (
                    <div
                      ref={quickAddRef}
                      className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 z-30"
                    >
                      <button
                        onClick={() => handleQuickAddItemClick(onQuickAddProduct)}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <MdInventory2 className="w-5 h-5 text-cyan-700" />
                        <span>Tambah Produk Baru</span>
                      </button>
                      <button
                        onClick={() => handleQuickAddItemClick(onQuickAddCategory)}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <MdCategory className="w-5 h-5 text-cyan-700" />
                        <span>Tambah Kategori Baru</span>
                      </button>
                      <button
                        onClick={() => handleQuickAddItemClick(onQuickAddMember)}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <MdCardMembership className="w-5 h-5 text-cyan-700" />
                        <span>Tambah Member Baru</span>
                      </button>
                       <button
                        onClick={() => handleQuickAddItemClick(onQuickAddPegawai)}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <MdPeople className="w-5 h-5 text-cyan-700" />
                        <span>Tambah Pegawai Baru</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* --- User Info & Logout (Dropdown) --- */}
              <div className="relative">
                {/* Tombol Akun */}
                <button
                  ref={userMenuButtonRef}
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  className={`
                    flex items-center gap-3 rounded-xl p-1.5 transition-colors
                    hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500
                    ${isUserMenuOpen ? 'bg-gray-100' : ''}
                  `}
                  title="Akun Anda"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-700 to-cyan-800 text-sm font-bold text-white ring-2 ring-white shadow-lg">
                    {(user.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <div className="hidden items-center text-left sm:flex">
                    <div>
                      <p className="text-sm font-semibold text-gray-900" title={user.displayName || 'User'}>
                        {user.displayName || 'Pengguna'}
                      </p>
                      <p className="text-xs text-gray-500" title={user.email}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                </button>
                
                {/* Panel Dropdown Akun */}
                {isUserMenuOpen && (
                   <div
                      ref={userMenuRef} 
                      className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 z-30"
                    >
                      <div className="px-4 py-2.5 border-b border-gray-100 sm:hidden">
                        <p className="text-sm font-medium text-gray-900 truncate" title={user.displayName || 'User'}>
                          {user.displayName || 'Pengguna'}
                        </p>
                        <p className="text-xs text-gray-500 truncate" title={user.email}>
                          {user.email}
                        </p>
                      </div>
                      <div className="p-1">
                        <button
                          // --- INI PERUBAHANNYA: Menambahkan ?tab=akun ---
                          onClick={() => handleUserMenuItemClick('/dashboard/pengaturan?tab=akun')}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <MdAccountCircle className="w-5 h-5 text-gray-500" />
                          <span>Pengaturan Akun</span>
                        </button>
                        <button
                          onClick={() => handleUserMenuItemClick(() => setShowLogoutConfirm(true))}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <MdLogout className="w-5 h-5" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </div>
          ) : (
            // Skeleton loading
            <div className="flex gap-4">
              <div className="h-10 w-24 animate-pulse rounded-xl bg-gray-100"></div>
              <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-100"></div>
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100"></div>
            </div>
          )}
        </div>
      </header>
      
      {/* Modal Logout (Tidak berubah) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <MdLogout className="h-6 w-6 text-red-600" />
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
    </> 
  );
};

export default Header;