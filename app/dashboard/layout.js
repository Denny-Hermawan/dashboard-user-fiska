// app/dashboard/layout.js
"use client";

import React, { useState } from 'react'; // Import React jika belum
import Sidebar from '@/components/Sidebar'; // Sesuaikan path jika perlu
import Header from '@/components/Header';   // Sesuaikan path jika perlu

export default function DashboardLayout({ children }) {
  // State untuk mengontrol visibilitas sidebar di layar kecil
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default tertutup di mobile

  // Fungsi untuk mengubah state sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Konten Utama */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Header: Berikan fungsi toggle */}
        <Header title="Dashboard" onToggleSidebar={toggleSidebar} />

        {/* Area konten yang bisa di-scroll */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Overlay gelap saat sidebar mobile terbuka (opsional) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black opacity-50 md:hidden"
          onClick={toggleSidebar} // Tutup sidebar saat overlay diklik
        ></div>
      )}
    </div>
  );
}