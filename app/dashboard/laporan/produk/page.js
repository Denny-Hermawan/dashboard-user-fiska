// app/dashboard/laporan/produk/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

// --- Ikon Baru (Material Design) ---
import {
  MdInbox,
  MdAttachMoney,
  MdInventory2,
  MdReceiptLong
} from 'react-icons/md';
// --- Akhir Ikon ---

// --- Helper Functions ---
const formatDateToInput = (date) => date.toISOString().split('T')[0];
const getToday = () => new Date();
const formatRupiah = (value) => {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// --- Helper Components ---
const LoadingSpinner = ({ message = "Memuat data..." }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"></div>
      <span className="text-sm font-medium text-gray-600">{message}</span>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="relative">
      {/* Animated background circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-32 w-32 animate-pulse rounded-full bg-cyan-100 opacity-20"></div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-24 w-24 animate-pulse rounded-full bg-cyan-200 opacity-30 animation-delay-150"></div>
      </div>
      {/* Icon */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-50 to-cyan-100">
        <MdInbox className="h-10 w-10 text-cyan-400" />
      </div>
    </div>
    <h3 className="mt-6 text-lg font-semibold text-gray-900">Belum Ada Data</h3>
    <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
      Tidak ada data penjualan pada rentang tanggal ini. Coba ubah filter tanggal.
    </p>
  </div>
);

const SummaryCard = ({ title, value, icon, className = '' }) => (
  <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        
        {/* --- INI BAGIAN YANG DIUBAH --- */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
          {icon}
        </div>
        {/* --- AKHIR PERUBAHAN --- */}

        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {/* --- PERBAIKAN: Ukuran font disamakan --- */}
          <p className="mt-1 text-3xl font-bold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  </div>
);

// --- Main Page Component ---
export default function LaporanProdukPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- State untuk Laporan ---
  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  const [reportData, setReportData] = useState([]); // Data tabel
  // KPI Disederhanakan
  const [kpi, setKpi] = useState({ totalSales: 0, totalTxn: 0, totalItems: 0 });

  // 1. Cek Autentikasi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace('/login');
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Fungsi Fetch Laporan
  const fetchReport = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setReportData([]);
    // Reset KPI
    setKpi({ totalSales: 0, totalTxn: 0, totalItems: 0 });

    try {
      // --- Langkah B: Fetch Transaksi berdasarkan rentang tanggal ---
      const dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);

      const txQuery = query(
        collection(db, "users", user.uid, "transactions"),
        where('tanggal', '>=', Timestamp.fromDate(dateStart)),
        where('tanggal', '<=', Timestamp.fromDate(dateEnd)),
        where('isRefunded', '==', false),
        orderBy('tanggal', 'desc')
      );
      
      const txSnap = await getDocs(txQuery);

      // --- [PERUBAHAN] Langkah C: Proses Data (Termasuk Distribusi Diskon) ---
      const productSummary = new Map(); // Kunci: product.id
      let grandTotalSales = 0; // Ini akan jadi Net Sales (dari tx.total)
      let grandTotalTxn = 0;
      let grandTotalItems = 0;

      txSnap.docs.forEach(txDoc => {
        const txData = txDoc.data();
        const txDiscount = txData.diskon || 0;
        const items = txData.items || [];
        
        grandTotalSales += txData.total || 0; // Hitung total omzet (NET) untuk KPI
        grandTotalTxn++; // Hitung total transaksi

        // Pass 1: Hitung subtotal kotor (sebelum diskon) dari item non-komplimen
        let txSubtotal = 0;
        items.forEach(item => {
          if (!item.isComplimentary) {
            txSubtotal += (item.produkHarga || 0) * (item.jumlah || 0);
          }
        });

        // Pass 2: Proses item dan distribusikan diskon
        items.forEach(item => {
          
          const productId = item.produkIdString; 
          if (!productId || item.isComplimentary) return; // Abaikan item komplimen

          const qty = item.jumlah || 0;
          const grossSales = (item.produkHarga || 0) * qty; 
          
          // Hitung proporsi diskon untuk item ini
          const itemProportion = (txSubtotal > 0) ? (grossSales / txSubtotal) : 0;
          const itemDiscount = txDiscount * itemProportion;
          const netSales = grossSales - itemDiscount; // Omzet bersih item
          
          grandTotalItems += qty; // Hitung total item terjual
          
          const summary = productSummary.get(productId) || {
            name: item.baseProdukNama || item.produkNama || 'Produk Dihapus',
            qty: 0,
            sales: 0, // Ini akan menyimpan Net Sales
          };
          
          summary.qty += qty;
          summary.sales += netSales; // <-- [PERUBAHAN] Menambahkan Net Sales
          
          productSummary.set(productId, summary);
        });
      });
      // --- AKHIR LANGKAH C ---
      
      setKpi({
        totalSales: grandTotalSales,
        totalTxn: grandTotalTxn,
        totalItems: grandTotalItems
      });
      
      // Urutkan berdasarkan Kuantitas (Qty) Terbanyak
      const sortedReport = Array.from(productSummary.values())
                                .sort((a, b) => b.qty - a.qty);
      setReportData(sortedReport);
      
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, startDate, endDate]);

  // 3. Fetch data saat user pertama kali dimuat atau filter berubah
  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user, fetchReport]);

  const handleFilterApply = (e) => {
    e.preventDefault();
    fetchReport();
  };
  
  return (
    <div className="space-y-6">
      {/* --- Filter Card --- */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {/* Judul Halaman */}
        <div className="border-b border-gray-100 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan per Produk</h1>
        </div>
        
        {/* Form Filter */}
        <form onSubmit={handleFilterApply} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Dari Tanggal</label>
            <input
              type="date" id="startDate" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Sampai Tanggal</label>
            <input
              type="date" id="endDate" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
            />
          </div>
          <button
            type="submit" disabled={isLoading}
            className="w-full rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Memuat...' : 'Terapkan Filter'}
          </button>
        </form>
      </div>
      {/* --- Akhir Filter Card --- */}


      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* [INFO] Kartu KPI ini sekarang menampilkan Omzet Bersih (setelah diskon) */}
        
        {/* --- PERUBAHAN IKON DI SINI --- */}
        <SummaryCard title="Total Omzet (Penjualan)" value={formatRupiah(kpi.totalSales)} icon={<MdAttachMoney className="w-7 h-7 text-white" />} />
        <SummaryCard title="Total Transaksi" value={kpi.totalTxn.toString()} icon={<MdReceiptLong className="w-7 h-7 text-white" />} />
        <SummaryCard title="Total Item Terjual" value={kpi.totalItems.toString()} icon={<MdInventory2 className="w-7 h-7 text-white" />} />
        {/* --- AKHIR PERUBAHAN --- */}
      
      </div>

      {/* --- Tabel Hasil Laporan --- */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : reportData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Produk</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Terjual (Qty)</th>
                  {/* [INFO] Kolom ini sekarang menampilkan Omzet Bersih (setelah diskon) */}
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reportData.map((item, index) => (
                  <tr key={item.name + index} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-cyan-700">{item.qty}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-700">{formatRupiah(item.sales)}</td>
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