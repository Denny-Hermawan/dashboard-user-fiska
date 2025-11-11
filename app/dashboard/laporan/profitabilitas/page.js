// app/dashboard/laporan/profitabilitas/page.js
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
  MdTrendingUp,
  MdClose,
  MdReceiptLong, // <-- Ikon baru
  MdOutlineDiscount // <-- Ikon baru
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
  <div className="flex flex-col items-center justify-center py-16">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
      <MdInbox className="h-12 w-12 text-gray-400" />
    </div>
    <p className="mt-4 text-sm font-medium text-gray-900">Tidak ada data</p>
    <p className="mt-1 text-sm text-gray-500">Tidak ada penjualan pada rentang tanggal ini.</p>
  </div>
);

// --- [DIPERBARUI] Summary Card ---
const SummaryCard = ({ title, value, icon, className = '', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick} // Tombol nonaktif jika tidak ada fungsi onClick
    suppressHydrationWarning={true} // Perbaikan untuk error ekstensi browser
    className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 text-left transition-all ${className} ${onClick ? 'hover:shadow-lg hover:ring-2 hover:ring-cyan-200 cursor-pointer' : 'cursor-default'}`}
  >
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-2xl text-cyan-700">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  </button>
);

// --- [DIPERBARUI] Komponen Modal Rincian Profit ---
const ProfitDetailModal = ({ isOpen, onClose, kpi }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Konten Modal Dibuat Lebih Kecil */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Rincian Laba Kotor</h3>
            <p className="text-sm text-gray-500 mt-0.5">Perhitungan profit Anda</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title="Tutup"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Konten Perhitungan */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <MdAttachMoney className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Total Omzet (Kotor)</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{formatRupiah(kpi.totalSales)}</span>
          </div>
          
          <div className="flex justify-between items-center rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <MdInventory2 className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">Total HPP (Harga Pokok)</span>
            </div>
            <span className="text-lg font-bold text-red-600">- {formatRupiah(kpi.totalCost)}</span>
          </div>

          {/* --- [BARU] Baris Rincian Diskon --- */}
          <div className="flex justify-between items-center rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <MdOutlineDiscount className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Total Diskon</span>
            </div>
            <span className="text-lg font-bold text-orange-600">- {formatRupiah(kpi.totalDiscount)}</span>
          </div>
          {/* --- [AKHIR] Baris Rincian Diskon --- */}
          
          {/* Garis Pemisah */}
          <hr className="my-2 border-gray-200 border-dashed" />
          
          {/* Hasil Akhir */}
          <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg ring-1 ring-green-200">
            <div className="flex items-center gap-3">
               <MdTrendingUp className="w-5 h-5 text-green-700" />
              <span className="text-base font-bold text-green-800">Total Profit (Laba Kotor)</span>
            </div>
            <span className="text-xl font-bold text-green-800">{formatRupiah(kpi.totalProfit)}</span>
          </div>
        </div>
        
        {/* Footer Modal */}
        <div className="border-t border-gray-100 bg-gray-50 p-4 text-right rounded-b-2xl">
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
// --- [AKHIR] Komponen Modal ---


// --- Main Page Component ---
export default function ProfitabilitasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk Laporan
  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  const [reportData, setReportData] = useState([]);
  
  // --- [DIPERBARUI] State KPI ---
  const [kpi, setKpi] = useState({ 
    totalSales: 0, 
    totalCost: 0, 
    totalDiscount: 0, // <-- BARU
    totalProfit: 0 
  });

  // State untuk Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // --- [AKHIR] State untuk Modal ---

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
  // --- [DIPERBARUI] untuk menghitung DISKON ---
  const fetchReport = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setReportData([]);
    setKpi({ totalSales: 0, totalCost: 0, totalDiscount: 0, totalProfit: 0 }); // <-- BARU

    try {
      // Langkah A: Fetch semua Product Costs
      const costsRef = collection(db, "users", user.uid, "product_costs");
      const costsSnap = await getDocs(costsRef);
      const productCostsMap = new Map();
      costsSnap.docs.forEach(doc => {
        productCostsMap.set(doc.id, doc.data().costing || 0);
      });

      // Langkah B: Fetch Transaksi
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

      // --- [DIPERBARUI] Langkah C: Proses Data ---
      const productSummary = new Map(); 
      let grandTotalSales = 0;
      let grandTotalCost = 0;
      let grandTotalDiscount = 0; // <-- BARU

      txSnap.docs.forEach(txDoc => {
        const txData = txDoc.data();
        
        // --- [BARU] Tambahkan total diskon dari transaksi ---
        grandTotalDiscount += txData.diskon || 0;
        // --- [AKHIR BARU] ---
        
        (txData.items || []).forEach(item => {
          
          const productId = item.produkIdString;
          if (!productId) return; 

          const qty = item.jumlah || 0;
          // Omzet kotor (Gross Sales) dari harga asli produk
          const sales = (item.produkHarga || 0) * qty;
          const cost = (productCostsMap.get(productId) || 0) * qty; 

          // Akumulasi untuk KPI Total
          grandTotalSales += sales;
          grandTotalCost += cost;
          
          // Akumulasi untuk Tabel Utama (per Produk)
          const summary = productSummary.get(productId) || {
            name: item.baseProdukNama || item.produkNama || 'Produk Dihapus',
            qty: 0,
            sales: 0,
            cost: 0,
            profit: 0
          };
          summary.qty += qty;
          summary.sales += sales;
          summary.cost += cost;
          // Profit di tabel ini adalah profit kotor PRODUK (Omzet - HPP)
          // Diskon tidak bisa diatribusikan per produk, jadi ini sudah benar
          summary.profit = summary.sales - summary.cost; 
          productSummary.set(productId, summary);
        });
      });
      // --- AKHIR LANGKAH C ---
      
      // --- [DIPERBARUI] Kalkulasi KPI ---
      setKpi({
        totalSales: grandTotalSales,
        totalCost: grandTotalCost,
        totalDiscount: grandTotalDiscount, // <-- BARU
        totalProfit: grandTotalSales - grandTotalCost - grandTotalDiscount // <-- DIPERBARUI
      });
      // --- [AKHIR] Kalkulasi KPI ---
      
      // Set data untuk tabel utama
      const sortedReport = Array.from(productSummary.values())
                                .sort((a, b) => b.profit - a.profit);
      setReportData(sortedReport);
      
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, startDate, endDate]);
  // --- [AKHIR] Fungsi Fetch Laporan ---


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
      <h1 className="text-3xl font-bold text-gray-900">Laporan Profitabilitas</h1>

      {/* --- Filter Bar (Tidak berubah) --- */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
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

      {/* --- KPI Cards (DIPERBARUI) --- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card Omzet (tidak bisa diklik) */}
        <SummaryCard 
          title="Total Omzet (Kotor)" 
          value={formatRupiah(kpi.totalSales)} 
          icon={<MdAttachMoney />}
        />
        {/* Card HPP (tidak bisa diklik) */}
        <SummaryCard 
          title="Total HPP (Harga Pokok)" 
          value={formatRupiah(kpi.totalCost)} 
          icon={<MdInventory2 />} 
          className="bg-red-50" 
        />
        {/* Card Profit (BISA DIKLIK) */}
        <SummaryCard 
          title="Total Profit (Laba Kotor)" 
          value={formatRupiah(kpi.totalProfit)} 
          icon={<MdTrendingUp />} 
          className="bg-green-50" 
          onClick={() => setIsModalOpen(true)} // <-- Hanya ini yang bisa diklik
        />
      </div>

      {/* --- Tabel Hasil Laporan (Ringkasan per Produk) --- */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
           <h3 className="text-lg font-bold text-gray-900">Ringkasan Profit per Produk</h3>
           <p className="text-sm text-gray-500 mt-0.5">Menampilkan profit kotor produk (Omzet Produk - HPP Produk), **sebelum** diskon transaksi.</p>
        </div>
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
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Omzet (Sales)</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">HPP (Cost)</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Profit (Produk)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reportData.map((item, index) => (
                  <tr key={item.name + index} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">{item.qty}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">{formatRupiah(item.sales)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-red-600">{formatRupiah(item.cost)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-green-700">{formatRupiah(item.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- [BARU] Render Modal Profit --- */}
      <ProfitDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        kpi={kpi}
      />

    </div>
  );
}