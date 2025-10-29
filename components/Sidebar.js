// components/Sidebar.js
"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// Modern Icons
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ReportIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const ProductIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { name: 'Transaksi', path: '/dashboard/transaksi', icon: <TransactionIcon /> },
    { name: 'Produk', path: '/dashboard/produk', icon: <ProductIcon /> },
    { name: 'Laporan', path: '/dashboard/laporan', icon: <ReportIcon /> },
    { name: 'Menu', path: '/dashboard/menu', icon: <MenuIcon /> },
    { name: 'Pengaturan', path: '/dashboard/pengaturan', icon: <SettingsIcon /> },
  ];

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 flex
        w-64 flex-col border-r border-gray-100 bg-white
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header Sidebar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-200">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={20}
              height={20}
              onError={(e) => { e.target.style.display='none'; }}
            />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">FISKA</h2>
            <p className="text-xs text-gray-500">POS System</p>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Tutup sidebar"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`
                group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                transition-all duration-200 ease-in-out
                ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              onClick={() => {
                if (isOpen) toggleSidebar();
              }}
            >
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.name}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4">
        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
          <p className="text-xs font-semibold text-indigo-900">Butuh Bantuan?</p>
          <p className="mt-1 text-xs text-indigo-700">Hubungi support kami</p>
          <button className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-medium text-indigo-700 shadow-sm transition-shadow hover:shadow-md">
            Kontak Support
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;