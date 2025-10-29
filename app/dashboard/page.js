// app/dashboard/page.js

"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, Timestamp, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

// --- Helper Components ---

// Loading Spinner Component
const LoadingSpinner = ({ message = "Memuat data..." }) => (
  <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-sm">
    <svg className="h-6 w-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.75V6.25m0 11.5v1.5M4.75 12H6.25m11.5 0h1.5M6.34 6.34l1.06 1.06M16.6 16.6l1.06 1.06M6.34 17.66l1.06-1.06M16.6 7.4l1.06-1.06" />
    </svg>
    <span className="ml-3 text-sm font-medium text-gray-600">{message}</span>
  </div>
);

// Summary Card Component
const SummaryCard = ({ title, value, icon, change = null, changeColor = 'text-gray-500' }) => (
  <div className="rounded-lg bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {icon && <div className="text-xl text-gray-400">{icon}</div>}
    </div>
    <p className="mt-2 text-2xl font-bold text-gray-800 truncate">{value}</p>
    {change && (
      <p className={`mt-1 text-xs ${changeColor}`}>{change}</p>
    )}
  </div>
);

// Format Rupiah Helper
const formatRupiah = (value) => {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(value);
};

// Format Waktu Helper
const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '-';
    try {
        return new Date(timestamp.seconds * 1000).toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    } catch (e) {
        console.error("Error formatting time:", e);
        return '-';
    }
};

// --- Main Dashboard Page Component ---

function DashboardPageContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState("...");
  const [isLoading, setIsLoading] = useState(true);
  const [dailySales, setDailySales] = useState(0);
  const [dailyTxnCount, setDailyTxnCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace('/login');
      } else {
        setUser(currentUser);
        fetchAllDashboardData(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchAllDashboardData = async (currentUser) => {
     if (!currentUser) return;
     setIsLoading(true);
     try {
       // Fetch Settings
       const settingsPromise = getDoc(doc(db, "users", currentUser.uid, "settings", "config"));

       // Fetch Transactions Today
       const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
       const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
       const transactionsQuery = query(
         collection(db, "users", currentUser.uid, "transactions"),
         where('tanggal', '>=', Timestamp.fromDate(todayStart)),
         where('tanggal', '<=', Timestamp.fromDate(todayEnd)),
         orderBy('tanggal', 'desc'), // Order terbaru dulu
         // limit(5) // Limit di query jika hanya butuh 5
       );
       const transactionsPromise = getDocs(transactionsQuery);

       // Execute fetches in parallel
       const [settingsSnap, transactionsSnap] = await Promise.all([settingsPromise, transactionsPromise]);

       // Process Settings
       setStoreName(settingsSnap.exists() ? (settingsSnap.data().storeName || "Belum Diatur") : "Belum Ada");

       // Process Transactions
       let totalSales = 0;
       let txCount = 0;
       const recentTxsData = [];
       transactionsSnap.forEach((docSnap) => {
         const data = docSnap.data();
         if (!data.isRefunded) {
           totalSales += data.total || 0;
           txCount++;
         }
         // Ambil 5 transaksi terbaru untuk tabel
         if (recentTxsData.length < 5) {
             recentTxsData.push({ id: docSnap.id, ...data });
         }
       });
       setDailySales(totalSales);
       setDailyTxnCount(txCount);
       setRecentTransactions(recentTxsData);

       // --- Fetch data lain (produk terlaris, stok) bisa ditambahkan di sini ---

     } catch (error) {
       console.error("Error fetching dashboard data:", error);
       // Set error states if needed
       setStoreName("Gagal memuat");
       setDailySales(0); setDailyTxnCount(0); setRecentTransactions([]);
     } finally {
       setIsLoading(false);
     }
   };

  // Render Loading state
  if (isLoading || !user) {
    return <LoadingSpinner message="Memuat dashboard..." />;
  }

  // Render Dashboard Content
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Message */}
      <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white shadow-md">
        <h2 className="text-xl font-semibold">
          Selamat Datang, {user.displayName || 'Pengguna'}!
        </h2>
        <p className="mt-1 text-sm opacity-90">
          Ringkasan untuk toko: <span className="font-semibold">{storeName}</span>
        </p>
      </div>

      {/* Grid Kartu Ringkasan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <SummaryCard
          title="Penjualan Hari Ini"
          value={formatRupiah(dailySales)}
          icon="💰" // Emoji atau komponen ikon
          // change="+5% vs kemarin" // Contoh
          // changeColor="text-green-600" // Contoh
        />
        <SummaryCard
          title="Transaksi Hari Ini"
          value={dailyTxnCount.toString()}
          icon="🛒"
        />
        <SummaryCard title="Produk Terlaris" value="-" icon="⭐" />
        <SummaryCard title="Stok Menipis" value="0" icon="⚠️" />
      </div>

      {/* Tabel Transaksi Terbaru */}
      <div className="rounded-lg bg-white shadow-sm overflow-hidden">
        <h3 className="border-b border-gray-200 px-4 py-3 text-base font-semibold text-gray-800 md:px-6 md:py-4">
          Transaksi Terbaru
        </h3>
        {recentTransactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {isLoading ? 'Memuat transaksi...' : 'Belum ada transaksi hari ini.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">Pelanggan</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell md:px-6">Waktu</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 md:px-6">{tx.namaPelanggan || '-'}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 sm:table-cell md:px-6">
                      {formatTime(tx.tanggal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-800 md:px-6">{formatRupiah(tx.total)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-xs md:px-6">
                      {tx.isRefunded ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold leading-5 text-red-800">
                          Refund
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold leading-5 text-green-800">
                          Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
         {/* Tombol Lihat Semua (jika perlu) */}
         {recentTransactions.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-right md:px-6">
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    Lihat semua transaksi &rarr;
                </a>
            </div>
         )}
      </div>
    </div>
  );
}

export default DashboardPageContent;