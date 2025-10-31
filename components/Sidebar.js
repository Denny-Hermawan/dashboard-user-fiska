// components/Sidebar.js
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// --- Ikon Internal Sidebar ---
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
  </svg>
);

// Ikon untuk panah dropdown
const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);
// --- Akhir Ikon ---


// --- Komponen Link Biasa ---
const SidebarLink = ({ item, isExpanded, pathname, closeMobileSidebar }) => {
  const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
  
  return (
    <Link
      href={item.path}
      className={`
        group flex items-center rounded-xl text-sm font-medium
        transition-all duration-200 ease-in-out
        ${isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'}
        ${
          isActive
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
      onClick={closeMobileSidebar}
      title={!isExpanded ? item.name : ''}
    >
      <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {item.icon}
      </span>
      {isExpanded && (
        <>
          <span className="truncate">{item.name}</span>
          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
          )}
        </>
      )}
    </Link>
  );
};

// --- Komponen Dropdown Baru ---
const SidebarDropdown = ({ item, isExpanded, pathname, closeMobileSidebar }) => {
  // Cek apakah ada anak menu yang aktif
  const isChildActive = item.children.some(child => pathname.startsWith(child.path));
  
  // Buka dropdown secara default jika ada anak yang aktif
  const [isOpen, setIsOpen] = useState(isChildActive);

  if (!isExpanded) {
    // Jika sidebar diciutkan (collapsed), tampilkan semua anak sebagai link biasa
    return (
      <>
        {item.children.map(childItem => (
          <SidebarLink
            key={childItem.name}
            item={childItem}
            isExpanded={isExpanded}
            pathname={pathname}
            closeMobileSidebar={closeMobileSidebar}
          />
        ))}
      </>
    );
  }

  // Jika sidebar diperluas (expanded), tampilkan sebagai dropdown
  return (
    <div>
      {/* Tombol Induk (Parent) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group flex w-full items-center rounded-xl text-sm font-medium
          transition-all duration-200 ease-in-out gap-3 px-3 py-2.5
          ${
            isChildActive && !isOpen // Aktif tapi ditutup
              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
      >
        <span className={`transition-transform duration-200 ${isChildActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          {item.icon}
        </span>
        <span className="truncate flex-1 text-left">{item.name}</span>
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {/* Daftar Anak Menu (Children) */}
      {isOpen && (
        <div className="mt-1 space-y-1 pl-6"> 
          {item.children.map(childItem => (
            <SidebarLink
              key={childItem.name}
              item={childItem}
              isExpanded={isExpanded} // selalu true di sini
              pathname={pathname}
              closeMobileSidebar={closeMobileSidebar}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// --- Komponen Sidebar Utama (Menerima `menuGroups`) ---
const Sidebar = ({ isExpanded, isMobileOpen, toggleSidebar, setIsMobileOpen, menuGroups }) => {
  const pathname = usePathname();

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 flex flex-col
        border-r border-gray-100 bg-white
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        ${isExpanded ? 'w-64' : 'md:w-20 w-64'}
      `}
    >
      {/* Header Sidebar (Logo) */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-5">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-200">
                <Image
                  src="/assets/images/logo.png" // Path logo di folder public
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
              aria-label="Toggle sidebar"
            >
              <span className="md:hidden">
                <CloseIcon />
              </span>
              <span className="hidden md:block">
                <ChevronLeftIcon />
              </span>
            </button>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            className="mx-auto rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Expand sidebar"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
              <Image
                src="/assets/images/logo.png" // Path logo di folder public
                alt="Logo"
                width={16}
                height={16}
                onError={(e) => { e.target.style.display='none'; }}
              />
            </div>
          </button>
        )}
      </div>

      {/* --- Navigasi Menu Baru (Looping Grup) --- */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuGroups.map((group, index) => (
          <div key={index}>
            {/* Tampilkan Judul Grup jika sidebar expanded */}
            {isExpanded && group.title && (
              <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {group.title}
              </h3>
            )}
            {/* Render item-item di dalam grup */}
            <div className="space-y-1">
              {group.items.map((item) => (
                item.children ? (
                  // Jika item punya anak, render sebagai Dropdown
                  <SidebarDropdown
                    key={item.name}
                    item={item}
                    isExpanded={isExpanded}
                    pathname={pathname}
                    closeMobileSidebar={closeMobileSidebar}
                  />
                ) : (
                  // Jika tidak punya anak, render sebagai Link biasa
                  <SidebarLink
                    key={item.name}
                    item={item}
                    isExpanded={isExpanded}
                    pathname={pathname}
                    closeMobileSidebar={closeMobileSidebar}
                  />
                )
              ))}
            </div>
            {/* Pemisah antar grup */}
            {index < menuGroups.length - 1 && isExpanded && <hr className="my-3 border-gray-100" />}
          </div>
        ))}
      </nav>
      {/* --- Akhir Navigasi Menu Baru --- */}


      {/* Footer (Tidak berubah) */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4">
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
            <p className="text-xs font-semibold text-indigo-900">Butuh Bantuan?</p>
            <p className="mt-1 text-xs text-indigo-700">Hubungi support kami</p>
            <button className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-medium text-indigo-700 shadow-sm transition-shadow hover:shadow-md">
              Kontak Support
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;