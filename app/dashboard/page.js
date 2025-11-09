// app/dashboard/page.js
"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

// --- Ikon Baru (Material Design) ---
import {
  MdAttachMoney,
  MdReceiptLong,
  MdInventory2,
  MdLanguage,
  MdDashboard,
  MdInbox,
  MdClose
} from 'react-icons/md';
// --- Akhir Ikon ---


// --- Komponen-Komponen ---

// Loading Spinner (Warna diperbarui)
const LoadingSpinner = ({ message = "Memuat data..." }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"></div>
      <span className="text-sm font-medium text-gray-600">{message}</span>
    </div>
  </div>
);

// Summary Card (Warna & Ikon diperbarui)
const SummaryCard = ({ title, value, icon, trend = null, trendUp = false }) => (
  <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:shadow-lg hover:ring-cyan-100">
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
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 text-2xl text-cyan-700 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
    </div>
  </div>
);

// --- Modal untuk Semua Transaksi (Ikon & Warna diperbarui) ---
const AllTransactionsModal = ({ isOpen, onClose, transactions }) => {
  if (!isOpen) return null;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Konten Modal */}
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Semua Transaksi Hari Ini</h3>
            <p className="text-sm text-gray-500 mt-0.5">Total {transactions.length} transaksi</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title="Tutup"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Konten Scrollable (Tabel) */}
        <div className="overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Pelanggan</th>
                <th className="hidden px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 sm:table-cell">Waktu</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {transactions.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200 text-sm font-semibold text-cyan-800">
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
        
        {/* Footer Modal */}
        <div className="border-t border-gray-100 p-4 text-right">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Tutup
            </button>
        </div>
      </div>
    </div>
  );
};


// --- Helper (Tidak berubah) ---
const formatRupiah = (value) => {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

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

// --- Main Dashboard Component ---
function DashboardPageContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState("...");
  const [isLoading, setIsLoading] = useState(true);

  // Metrik KPI
  const [dailySales, setDailySales] = useState(0);
  const [dailyTxnCount, setDailyTxnCount] = useState(0);
  const [dailyItemsSold, setDailyItemsSold] = useState(0);
  const [dailyOnlineSales, setDailyOnlineSales] = useState(0);
  
  // --- State untuk Tabel & Modal ---
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allDailyTransactions, setAllDailyTransactions] = useState([]); // <-- BARU: Simpan semua
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- BARU: State modal

  // Ringkasan Samping
  const [topProducts, setTopProducts] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({});

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

  // --- Logika Fetch Data (Tidak Diubah) ---
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

      // --- Inisialisasi Kalkulasi ---
      let totalSales = 0;
      let txCount = 0;
      let totalItems = 0;
      let totalOnline = 0;
      const productSalesMap = new Map();
      const paymentMethodMap = new Map();
      const recentTxsData = [];
      const allTxsData = []; // <-- BARU: Array untuk semua transaksi

      transactionsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const txData = { id: docSnap.id, ...data };

        // --- BARU: Simpan SEMUA transaksi ---
        allTxsData.push(txData);
        
        // Simpan 5 transaksi terbaru untuk tabel dasbor
        if (recentTxsData.length < 5) {
          recentTxsData.push(txData);
        }

        // Hanya hitung jika tidak di-refund
        if (!data.isRefunded) {
          totalSales += data.total || 0;
          txCount++;

          if (data.orderType === 'Online') {
            totalOnline += data.total || 0;
            const platform = data.onlinePlatform || 'Online';
            paymentMethodMap.set(platform, (paymentMethodMap.get(platform) || 0) + (data.total || 0));
          } else {
            const method = data.metodePembayaran || 'Lainnya';
            paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + (data.total || 0));
          }

          if (data.items && Array.isArray(data.items)) {
            data.items.forEach(item => {
              const qty = item.jumlah || 0;
              totalItems += qty;
              const productName = item.baseProdukNama || item.produkNama || 'Produk Tidak Dikenal';
              productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + qty);
            });
          }
        }
      });

      // --- Set State Hasil Kalkulasi ---
      setDailySales(totalSales);
      setDailyTxnCount(txCount);
      setRecentTransactions(recentTxsData);
      setAllDailyTransactions(allTxsData); // <-- BARU: Set state semua transaksi
      setDailyItemsSold(totalItems);
      setDailyOnlineSales(totalOnline);

      const sortedProducts = Array.from(productSalesMap.entries()).sort((a, b) => b[1] - a[1]);
      setTopProducts(sortedProducts.slice(0, 5));

      const sortedPayments = Array.from(paymentMethodMap.entries()).sort((a, b) => b[1] - a[1]);
      setPaymentSummary(Object.fromEntries(sortedPayments));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStoreName("Gagal memuat");
      setDailySales(0);
      setDailyTxnCount(0);
      setDailyItemsSold(0);
      setDailyOnlineSales(0);
      setRecentTransactions([]);
      setAllDailyTransactions([]); // <-- BARU
      setTopProducts([]);
      setPaymentSummary({});
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !user) {
    return <LoadingSpinner message="Memuat dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card (Tema diperbarui) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-700 via-cyan-800 to-cyan-900 p-8 text-white shadow-xl">
         <div className="absolute right-0 top-0 h-64 w-64 translate-x-32 -translate-y-32 rounded-full bg-white opacity-10"></div>
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-24 translate-y-24 rounded-full bg-white opacity-10"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl"><MdDashboard /></span>
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

      {/* Summary Cards (Ikon diperbarui) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Penjualan Hari Ini" value={formatRupiah(dailySales)} icon={<MdAttachMoney />} />
        <SummaryCard title="Transaksi Hari Ini" value={dailyTxnCount.toString()} icon={<MdReceiptLong />} />
        <SummaryCard title="Produk Terjual (Hari Ini)" value={dailyItemsSold.toString()} icon={<MdInventory2 />} />
        <SummaryCard title="Penjualan Online (Hari Ini)" value={formatRupiah(dailyOnlineSales)} icon={<MdLanguage />} />
      </div>

      {/* Tata Letak Utama (Tidak berubah) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Kolom Utama (Transaksi & Produk) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* --- Transaksi Terbaru (Tema diperbarui) --- */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Transaksi Terbaru</h3>
                <p className="text-sm text-gray-500 mt-0.5">5 transaksi terakhir hari ini</p>
              </div>
              {/* --- TOMBOL DIPERBARUI --- */}
              <button 
                onClick={() => setIsModalOpen(true)} // <-- BARU: Buka modal
                className="rounded-lg bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
              >
                Lihat Semua
              </button>
            </div>

            {/* Tabel Transaksi Terbaru (Tema & Ikon diperbarui) */}
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <MdInbox className="h-16 w-16 text-gray-300" />
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
                        {/* Avatar diperbarui */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200 text-sm font-semibold text-cyan-800">
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

        {/* Kolom Samping (Ringkasan) (Tema diperbarui) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Produk Terlaris */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Produk Terlaris (Hari Ini)</h3>
            </div>
            {topProducts.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-500">Belum ada produk terjual hari ini.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {topProducts.map(([name, qty]) => (
                  <li key={name} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-48">{name}</p>
                      <p className="text-sm text-gray-500">Terjual</p>
                    </div>
                    <span className="text-lg font-bold text-cyan-700">{qty}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Metode Bayar */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Metode Bayar (Hari Ini)</h3>
            </div>
            {Object.keys(paymentSummary).length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-500">Belum ada pembayaran.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {Object.entries(paymentSummary).map(([method, total]) => (
                  <li key={method} className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm font-medium text-gray-900 capitalize">{method.toLowerCase()}</span>
                    <span className="text-sm font-bold text-gray-700">{formatRupiah(total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
        </div>

      </div> {/* Akhir grid 2 kolom */}
      
      {/* --- BARU: Render Modal --- */}
      <AllTransactionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transactions={allDailyTransactions}
      />
      
    </div>
  );
}

export default DashboardPageContent;