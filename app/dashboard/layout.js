// app/dashboard/layout.js
"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DashboardLayout({ children }) {
  // State untuk mengontrol sidebar: expanded (full) atau collapsed (icon only)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  // State untuk mobile: open atau close
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    // Di mobile: toggle open/close
    // Di desktop: toggle expanded/collapsed
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarExpanded(!isSidebarExpanded);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileSidebarOpen}
        toggleSidebar={toggleSidebar}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Konten Utama */}
      <div className={`
        flex flex-1 flex-col overflow-y-auto
        transition-all duration-300 ease-in-out
        ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}
      `}>
        {/* Header */}
        <Header 
          title="Dashboard" 
          onToggleSidebar={toggleSidebar}
          isSidebarExpanded={isSidebarExpanded}
        />

        {/* Area konten */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Overlay gelap hanya untuk mobile */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}