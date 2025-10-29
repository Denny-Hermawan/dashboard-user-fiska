// app/dashboard/page.js
"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

// Loading Spinner
const LoadingSpinner = ({ message = "Memuat data..." }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      <span className="text-sm font-medium text-gray-600">{message}</span>
    </div>
  </div>
);

// Modern Summary Card
const SummaryCard = ({ title, value, icon, trend = null, trendUp = false }) => (
  <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:shadow-lg hover:ring-indigo-100">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 truncate">{value}</p>
        {trend && (
          <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            <svg className={`h-4 w-4 ${trendUp ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-2xl transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
    </div>
  </div>
);

// Format Rupiah
const formatRupiah = (value) => {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format Time
const formatTime = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return '-';
  try {
    return new Date(timestamp.seconds * 1000).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    console.error("Error formatting time:", e);
    return '-';
  }
};

// Main Dashboard Component
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
      const settingsPromise = getDoc(doc(db, "users", currentUser.uid, "settings", "config"));

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const transactionsQuery = query(
        collection(db, "users", currentUser.uid, "transactions"),
        where('tanggal', '>=', Timestamp.fromDate(todayStart)),
        where('tanggal', '<=', Timestamp.fromDate(todayEnd)),
        orderBy('tanggal', 'desc')
      );
      const transactionsPromise = getDocs(transactionsQuery);

      const [settingsSnap, transactionsSnap] = await Promise.all([settingsPromise, transactionsPromise]);

      setStoreName(settingsSnap.exists() ? (settingsSnap.data().storeName || "Belum Diatur") : "Belum Ada");

      let totalSales = 0;
      let txCount = 0;
      const recentTxsData = [];
      transactionsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.isRefunded) {
          totalSales += data.total || 0;
          txCount++;
        }
        if (recentTxsData.length < 5) {
          recentTxsData.push({ id: docSnap.id, ...data });
        }
      });
      setDailySales(totalSales);
      setDailyTxnCount(txCount);
      setRecentTransactions(recentTxsData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStoreName("Gagal memuat");
      setDailySales(0);
      setDailyTxnCount(0);
      setRecentTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !user) {
    return <LoadingSpinner message="Memuat dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-32 -translate-y-32 rounded-full bg-white opacity-10"></div>
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-24 translate-y-24 rounded-full bg-white opacity-10"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👋</span>
            <span className="text-sm font-medium opacity-90">Selamat Datang Kembali</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {user.displayName || 'Pengguna'}
          </h2>
          <p className="text-sm opacity-90">
            {storeName} • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Penjualan Hari Ini"
          value={formatRupiah(dailySales)}
          icon="💰"
        />
        <SummaryCard
          title="Transaksi Hari Ini"
          value={dailyTxnCount.toString()}
          icon="🛒"
        />
        <SummaryCard
          title="Produk Terjual"
          value="-"
          icon="📦"
        />
        <SummaryCard
          title="Stok Menipis"
          value="-"
          icon="⚠️"
        />
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Transaksi Terbaru</h3>
            <p className="text-sm text-gray-500 mt-0.5">5 transaksi terakhir hari ini</p>
          </div>
          <button className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100">
            Lihat Semua
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
              📭
            </div>
            <p className="mt-4 text-sm font-medium text-gray-900">Belum ada transaksi</p>
            <p className="mt-1 text-sm text-gray-500">Transaksi hari ini akan muncul di sini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Pelanggan</th>
                  <th className="hidden px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 sm:table-cell">Waktu</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-semibold text-indigo-700">
                          {(tx.namaPelanggan || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.namaPelanggan || '-'}</p>
                          <p className="text-xs text-gray-500 sm:hidden">{formatTime(tx.tanggal)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-gray-600 sm:table-cell">
                      {formatTime(tx.tanggal)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatRupiah(tx.total)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {tx.isRefunded ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                          Refund
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
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
      </div>
    </div>
  );
}

export default DashboardPageContent;