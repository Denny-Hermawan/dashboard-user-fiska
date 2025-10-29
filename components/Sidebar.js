// components/Sidebar.js
"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; // Untuk menandai menu aktif

// Impor ikon (contoh pakai placeholder, ganti dengan library ikon)
const DashboardIcon = () => <span>📊</span>;
const ReportIcon = () => <span>📄</span>;
const MenuIcon = () => <span>🍔</span>;
const CloseIcon = () => <span>✕</span>; // Ikon tutup

// Terima isOpen dan toggleSidebar
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const pathname = usePathname(); // Dapatkan path saat ini

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { name: 'Laporan', path: '/dashboard/laporan', icon: <ReportIcon /> }, // Contoh path
    { name: 'Menu', path: '/dashboard/menu', icon: <MenuIcon /> },       // Contoh path
    // Tambahkan item menu lain
  ];

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 flex
        w-64 flex-col overflow-y-auto border-r border-gray-200 bg-white
        transition-transform duration-300 ease-in-out md:static md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header Sidebar (Logo & Tombol Tutup Mobile) */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 shadow-md">
            <Image
              src="/images/logo.png" // Remove '/assets' // PASTIKAN PATH BENAR
              alt="Logo FISKA"
              width={24} height={24}
              onError={(e) => { e.target.style.display='none'; }}
            />
          </div>
          <span className="text-lg font-bold text-gray-800">FISKA POS</span>
        </div>
        {/* Tombol tutup hanya di mobile */}
        <button
          onClick={toggleSidebar}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Tutup sidebar"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Navigasi Menu */}
      <nav className="flex-1 px-4 py-2">
        <ul>
          {menuItems.map((item) => {
            // Cek apakah item menu saat ini aktif
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));

            return (
              <li key={item.name} className="mb-1">
                <Link
                  href={item.path}
                  className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-in-out hover:bg-gray-100 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold' // Style aktif
                      : 'text-gray-600' // Style non-aktif
                  }`}
                  onClick={() => {if (isOpen && window.innerWidth < 768) toggleSidebar()}} // Tutup di mobile saat item diklik
                >
                  <span className="mr-3 w-5 flex-shrink-0">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

       {/* Footer Sidebar (jika perlu) */}
       {/* <div className="p-4 border-t border-gray-200">Footer</div> */}
    </aside>
  );
};

export default Sidebar;