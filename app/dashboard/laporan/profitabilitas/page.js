// app/dashboard/laporan/profitabilitas/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

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
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      <span className="text-sm font-medium text-gray-600">{message}</span>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">📭</div>
    <p className="mt-4 text-sm font-medium text-gray-900">Tidak ada data</p>
    <p className="mt-1 text-sm text-gray-500">Tidak ada penjualan pada rentang tanggal ini.</p>
  </div>
);

const SummaryCard = ({ title, value, icon, className = '' }) => (
  <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 ${className}`}>
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl text-indigo-600">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  </div>
);

// --- Main Page Component ---
export default function ProfitabilitasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- State untuk Laporan ---
  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  const [reportData, setReportData] = useState([]); // Data tabel
  const [kpi, setKpi] = useState({ totalSales: 0, totalCost: 0, totalProfit: 0 });

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

  // 2. Fungsi Fetch Laporan (Gabungan)
  const fetchReport = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setReportData([]);
    setKpi({ totalSales: 0, totalCost: 0, totalProfit: 0 });

    try {
      // --- Langkah A: Fetch semua Product Costs ---
      const costsRef = collection(db, "users", user.uid, "product_costs");
      const costsSnap = await getDocs(costsRef);
      const productCostsMap = new Map();
      costsSnap.docs.forEach(doc => {
        productCostsMap.set(doc.id, doc.data().costing || 0);
      });

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

      // --- Langkah C: Proses Data (INI BAGIAN YANG DIPERBAIKI) ---
      const productSummary = new Map(); // Kunci: product.id
      let grandTotalSales = 0;
      let grandTotalCost = 0;

      txSnap.docs.forEach(txDoc => {
        const txData = txDoc.data();
        (txData.items || []).forEach(item => {
          
          // --- PERBAIKAN DI SINI ---
          const productId = item.produkIdString; // <-- Diganti dari 'produkId'
          if (!productId) return; 
          // --- AKHIR PERBAIKAN ---

          const qty = item.jumlah || 0;
          
          // --- PERBAIKAN DI SINI ---
          const sales = (item.produkHarga || 0) * qty; // <-- Diganti dari 'hargaFinal'
          // --- AKHIR PERBAIKAN ---
          
          const cost = (productCostsMap.get(productId) || 0) * qty; 

          grandTotalSales += sales;
          grandTotalCost += cost;
          
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
          summary.profit = summary.sales - summary.cost;
          
          productSummary.set(productId, summary);
        });
      });
      // --- AKHIR LANGKAH C ---
      
      setKpi({
        totalSales: grandTotalSales,
        totalCost: grandTotalCost,
        totalProfit: grandTotalSales - grandTotalCost
      });
      
      const sortedReport = Array.from(productSummary.values())
                                .sort((a, b) => b.profit - a.profit);
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
      <h1 className="text-3xl font-bold text-gray-900">Laporan Profitabilitas</h1>

      {/* --- Filter Bar (Tidak berubah) --- */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <form onSubmit={handleFilterApply} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Dari Tanggal</label>
            <input
              type="date" id="startDate" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Sampai Tanggal</label>
            <input
              type="date" id="endDate" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="submit" disabled={isLoading}
            className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Memuat...' : 'Terapkan Filter'}
          </button>
        </form>
      </div>

      {/* --- KPI Cards (Tidak berubah) --- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard title="Total Omzet (Penjualan)" value={formatRupiah(kpi.totalSales)} icon="💰" />
        <SummaryCard title="Total HPP (Harga Pokok)" value={formatRupiah(kpi.totalCost)} icon="📦" className="bg-red-50" />
        <SummaryCard title="Total Profit (Laba Kotor)" value={formatRupiah(kpi.totalProfit)} icon="📈" className="bg-green-50" />
      </div>

      {/* --- Tabel Hasil Laporan (Tidak berubah) --- */}
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
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Omzet (Sales)</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">HPP (Cost)</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Profit</th>
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

    </div>
  );
}