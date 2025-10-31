// app/dashboard/layout.js
"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { usePathname } from 'next/navigation';
import Image from 'next/image'; 

// --- Kumpulan Ikon ---
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const TransactionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ProductIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const CategoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

// --- BARU: Ikon untuk Laporan ---
const ReportIcon = () => ( // Ikon Induk Laporan
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const SummaryIcon = () => ( // Ikon Ringkasan
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const ProfitIcon = () => ( // Ikon Profit
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0c-1.11 0-2.08-.402-2.599-1M12 16v-1m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const CashierIcon = () => ( // Ikon Laporan Kasir
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
// --- Akhir Ikon ---

// --- Struktur Menu Baru (Laporan menjadi Dropdown) ---
const menuGroups = [
  {
    title: 'Operasional',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
      { name: 'Transaksi', path: '/dashboard/transaksi', icon: <TransactionIcon /> },
      // --- PERBARUI LAPORAN ---
      { 
        name: 'Laporan', 
        icon: <ReportIcon />,
        children: [
          { name: 'Profitabilitas', path: '/dashboard/laporan/profitabilitas', icon: <ProfitIcon /> },
          { name: 'Ringkasan', path: '/dashboard/laporan/ringkasan', icon: <SummaryIcon /> },
          { name: 'Per Produk', path: '/dashboard/laporan/produk', icon: <ProductIcon /> },
          { name: 'Per Kategori', path: '/dashboard/laporan/kategori', icon: <CategoryIcon /> },
          { name: 'Laporan Kasir', path: '/dashboard/laporan/kasir', icon: <CashierIcon /> },
        ]
      }
    ]
  },
  {
    title: 'Pengelolaan',
    items: [
      { 
        name: 'Kelola', 
        icon: <SettingsIcon />,
        children: [
          { name: 'Produk', path: '/dashboard/produk', icon: <ProductIcon /> },
          { name: 'Kategori', path: '/dashboard/menu', icon: <CategoryIcon /> },
          { name: 'Pengaturan', path: '/dashboard/pengaturan', icon: <SettingsIcon /> },
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