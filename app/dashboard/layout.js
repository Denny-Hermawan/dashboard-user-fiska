// app/dashboard/layout.js
"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { usePathname } from 'next/navigation';
import Image from 'next/image'; 
import { Toaster } from "sonner"; 

// --- Kumpulan Ikon (React Icons) ---
import {
  MdDashboard,
  MdReceiptLong,
  MdSettings,
  MdInventory2,
  MdCategory,
  MdAssessment,
  MdTrendingUp,
  MdAttachMoney,
  MdPointOfSale,
  MdPeople,
  MdCardMembership,
  MdPayment,
  MdStorefront // <-- BARU: Ditambahkan
} from 'react-icons/md';
// --- Akhir Ikon ---

// --- Struktur Menu Baru (Laporan menjadi Dropdown) ---
const menuGroups = [
  {
    title: 'Operasional',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: <MdDashboard className="w-6 h-6" /> },
      { name: 'Transaksi', path: '/dashboard/transaksi', icon: <MdReceiptLong className="w-6 h-6" /> },
      { 
        name: 'Laporan', 
        icon: <MdAssessment className="w-6 h-6" />,
        children: [
          { name: 'Profitabilitas', path: '/dashboard/laporan/profitabilitas', icon: <MdAttachMoney className="w-6 h-6" /> },
          { name: 'Ringkasan', path: '/dashboard/laporan/ringkasan', icon: <MdTrendingUp className="w-6 h-6" /> },
          { name: 'Per Produk', path: '/dashboard/laporan/produk', icon: <MdInventory2 className="w-6 h-6" /> },
          { name: 'Per Kategori', path: '/dashboard/laporan/kategori', icon: <MdCategory className="w-6 h-6" /> },
          { name: 'Laporan Kasir', path: '/dashboard/laporan/kasir', icon: <MdPointOfSale className="w-6 h-6" /> },
        ]
      }
    ]
  },
  {
    title: 'Pengelolaan',
    items: [
      { 
        name: 'Kelola', 
        icon: <MdSettings className="w-6 h-6" />,
        children: [
          { name: 'Produk', path: '/dashboard/produk', icon: <MdInventory2 className="w-6 h-6" /> },
          // --- BARU: Link Menu Online ditambahkan di sini ---
          { name: 'Menu Online', path: '/dashboard/menu-online', icon: <MdStorefront className="w-6 h-6" /> },
          // --- AKHIR TAMBAHAN ---
          { name: 'Kategori', path: '/dashboard/menu', icon: <MdCategory className="w-6 h-6" /> },
          { name: 'Pegawai', path: '/dashboard/pegawai', icon: <MdPeople className="w-6 h-6" /> },
          { name: 'Membership', path: '/dashboard/membership', icon: <MdCardMembership className="w-6 h-6" /> },
          { name: 'Metode Bayar', path: '/dashboard/pembayaran', icon: <MdPayment className="w-6 h-6" /> },
          { name: 'Pengaturan', path: '/dashboard/pengaturan', icon: <MdSettings className="w-6 h-6" /> },
        ]
      }
    ]
  }
];

export default function DashboardLayout({ children }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pathname = usePathname();
  
  // --- Logika Title (Tidak berubah, masih berfungsi) ---
  const allMenuItems = menuGroups.flatMap(group => 
    group.items.flatMap(item => (item.children ? item.children : [item]))
  );
  allMenuItems.sort((a, b) => b.path.length - a.path.length);
  const currentMenuItem = allMenuItems.find(item => pathname.startsWith(item.path));
  const title = currentMenuItem ? currentMenuItem.name : "Dashboard";
  // --- Akhir Logika Title ---

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarExpanded(!isSidebarExpanded);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Toaster richColors position="top-right" />

      <Sidebar 
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileSidebarOpen}
        toggleSidebar={toggleSidebar}
        setIsMobileOpen={setIsMobileSidebarOpen}
        menuGroups={menuGroups} // <-- Kirim struktur grup baru
      />

      <div className={`
        flex flex-1 flex-col overflow-y-auto
        transition-all duration-300 ease-in-out
        ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}
      `}>
        <Header 
          title={title}
          onToggleSidebar={toggleSidebar}
          isSidebarExpanded={isSidebarExpanded}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}