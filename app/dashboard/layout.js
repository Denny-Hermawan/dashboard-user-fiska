// app/dashboard/layout.js
"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { usePathname } from 'next/navigation';
import Image from 'next/image'; 
import { Toaster } from "sonner"; 
import { auth, db } from "@/lib/firebaseConfig"; 
import { onAuthStateChanged } from "firebase/auth"; 
import { collection, query, where, Timestamp, orderBy, onSnapshot } from "firebase/firestore";

// --- IMPOR SEMUA MODAL ---
import ProductModal from '@/components/ProductModal'; 
import CategoryModal from '@/components/CategoryModal';
import MemberModal from '@/components/MemberModal';
import PegawaiModal from '@/components/PegawaiModal';

// --- [BARU] IMPOR CHATBOT ---
import ChatbotButton from '@/components/ChatbotButton';

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
  MdStorefront,
  MdTag 
} from 'react-icons/md';
// --- Akhir Ikon ---

// --- Struktur Menu (Tidak berubah) ---
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
          { name: 'Per Tipe Produk', path: '/dashboard/laporan/tipe-produk', icon: <MdTag className="w-6 h-6" /> },
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
          { name: 'Menu Online', path: '/dashboard/menu-online', icon: <MdStorefront className="w-6 h-6" /> },
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
// --- Akhir Struktur Menu ---

export default function DashboardLayout({ children }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // --- State Modal Tambah Cepat ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isPegawaiModalOpen, setIsPegawaiModalOpen] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState(null);

  // --- STATE BARU UNTUK NOTIFIKASI ---
  const [notifications, setNotifications] = useState([]);

  const pathname = usePathname();
  
  // --- Logika Title (Tidak berubah) ---
  const allMenuItems = menuGroups.flatMap(group => 
    group.items.flatMap(item => (item.children ? item.children : [item]))
  );
  allMenuItems.sort((a, b) => b.path.length - a.path.length);
  const currentMenuItem = allMenuItems.find(item => pathname.startsWith(item.path));
  const title = currentMenuItem ? currentMenuItem.name : "Dashboard";
  // --- Akhir Logika Title ---

  // Efek untuk mendapatkan User ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setNotifications([]); // Hapus notif jika logout
      }
    });
    return () => unsubscribe();
  }, []);

  // --- EFEK BARU UNTUK LISTENER NOTIFIKASI ---
  useEffect(() => {
    if (!currentUserId) return;

    // Tentukan awal hari ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = Timestamp.fromDate(todayStart);

    // Query untuk transaksi HARI INI
    const q = query(
      collection(db, "users", currentUserId, "transactions"),
      where('tanggal', '>=', todayStartTimestamp),
      orderBy('tanggal', 'desc')
    );

    // onSnapshot adalah listener real-time
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = [];
      
      // Kita hanya peduli pada dokumen YANG BARU DITAMBAHKAN
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const doc = change.doc.data();
          const docId = change.doc.id;
          const time = doc.tanggal.toDate(); // Konversi ke Date object

          // 1. Cek Refund
          if (doc.isRefunded) {
            newNotifications.push({
              id: docId,
              type: 'refund',
              title: `Refund ${formatRupiah(doc.total)}`,
              desc: `Kasir: ${doc.cashierName || 'N/A'}`,
              time: time,
            });
          } else {
            // 2. Cek Order Baru (asumsi non-refund adalah order baru)
            newNotifications.push({
              id: docId,
              type: 'order',
              title: `Order Baru ${formatRupiah(doc.total)}`,
              desc: `Pelanggan: ${doc.namaPelanggan || 'Umum'}`,
              time: time,
            });
          }
          
          // 3. Cek Komplimen (di dalam item)
          (doc.items || []).forEach((item, index) => {
            if (item.isComplimentary) {
              newNotifications.push({
                id: `${docId}-${index}`,
                type: 'compliment',
                title: `Komplimen ${item.produkNama}`,
                desc: `Oleh: ${item.complimentaryAuthorizedBy || 'N/A'}`,
                time: time,
              });
            }
          });
        }
      });
      
      // Tambahkan notifikasi baru ke state (yang terbaru di atas)
      // Kita urutkan sekali lagi untuk memastikan urutan komplimen benar
      setNotifications(prev => 
          [...newNotifications, ...prev]
          .sort((a, b) => b.time - a.time)
      );
      
    }, (error) => {
      console.error("Error listening to transactions: ", error);
    });

    // Cleanup listener saat komponen unmount atau user berubah
    return () => unsubscribe();

  }, [currentUserId]);
  // --- AKHIR EFEK NOTIFIKASI ---


  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarExpanded(!isSidebarExpanded);
    }
  };
  
  // Helper format rupiah (dibutuhkan untuk notifikasi)
  const formatRupiah = (value) => {
    if (value == null || isNaN(value)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Toaster richColors position="top-right" />

      <Sidebar 
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileSidebarOpen}
        toggleSidebar={toggleSidebar}
        setIsMobileOpen={setIsMobileSidebarOpen}
        menuGroups={menuGroups}
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
          // Kirim fungsi Add Cepat
          onQuickAddProduct={() => setIsProductModalOpen(true)}
          onQuickAddCategory={() => setIsCategoryModalOpen(true)}
          onQuickAddMember={() => setIsMemberModalOpen(true)}
          onQuickAddPegawai={() => setIsPegawaiModalOpen(true)}
          // --- KIRIM PROPS NOTIFIKASI BARU ---
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        
        {/* --- Render Semua Modal (Tidak Berubah) --- */}
        {isProductModalOpen && (
          <ProductModal
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
            product={null} 
            userId={currentUserId}
          />
        )}
        {isCategoryModalOpen && (
          <CategoryModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            category={null}
            userId={currentUserId}
          />
        )}
        {isMemberModalOpen && (
          <MemberModal
            isOpen={isMemberModalOpen}
            onClose={() => setIsMemberModalOpen(false)}
            member={null}
            userId={currentUserId}
          />
        )}
        {isPegawaiModalOpen && (
          <PegawaiModal
            isOpen={isPegawaiModalOpen}
            onClose={() => setIsPegawaiModalOpen(false)}
            pegawai={null}
            userId={currentUserId}
          />
        )}
      </div>

      {/* --- [BARU] TAMBAHKAN TOMBOL CHAT DI SINI --- */}
      <ChatbotButton userId={currentUserId} />

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}