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
  MdReceiptLong,
  MdClose, // <-- BARU: Untuk modal
  MdChevronRight // <-- BARU: Untuk baris tabel
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

// --- [BARU] Helper Format Waktu (dicopy dari laporan lain) ---
const formatDateTime = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return '-';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
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

const SummaryCard = ({ title, value, icon, className = '' }) => (
  <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 ${className}`}>
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-2xl text-cyan-700">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  </div>
);


// --- [BARU] Komponen Modal Rincian Transaksi ---
const TransactionDetailModal = ({ isOpen, onClose, productName, transactions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Rincian Transaksi - {productName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Menampilkan semua transaksi yang berisi produk ini</p>
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
          {transactions.length === 0 ? (
             <p className="p-10 text-center text-sm text-gray-500">Tidak ada rincian transaksi.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">ID Transaksi</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Pelanggan</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Waktu</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Qty</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {transactions.map((tx, index) => (
                  <tr key={tx.id + index} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-xs font-mono text-gray-500">{tx.id.substring(0, 8)}...</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{tx.customer}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatDateTime(tx.time)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-cyan-700">{tx.qty}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-700">{formatRupiah(tx.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
// --- [AKHIR] Komponen Modal ---


// --- Main Page Component ---
export default function LaporanProdukPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- State untuk Laporan ---
  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  const [reportData, setReportData] = useState([]); // Data tabel
  const [kpi, setKpi] = useState({ totalSales: 0, totalTxn: 0, totalItems: 0 });

  // --- [BARU] State untuk Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]); // Berisi daftar transaksi
  const [selectedProductName, setSelectedProductName] = useState('');
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
  // --- [DIPERBARUI] untuk mengambil data rincian transaksi ---
  const fetchReport = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setReportData([]);
    setKpi({ totalSales: 0, totalTxn: 0, totalItems: 0 });

    try {
      // Langkah A: Fetch Transaksi
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

      // --- [DIPERBARUI] Langkah C: Proses Data + Rincian Transaksi ---
      const productSummary = new Map();
      let grandTotalSales = 0;
      let grandTotalTxn = 0;
      let grandTotalItems = 0;

      txSnap.docs.forEach(txDoc => {
        const txData = txDoc.data();
        grandTotalSales += txData.total || 0;
        grandTotalTxn++;

        (txData.items || []).forEach(item => {
          
          const productId = item.produkIdString; 
          if (!productId || item.isComplimentary) return; 

          const qty = item.jumlah || 0;
          const sales = (item.produkHarga || 0) * qty; 
          
          grandTotalItems += qty;
          
          const summary = productSummary.get(productId) || {
            name: item.baseProdukNama || item.produkNama || 'Produk Dihapus',
            qty: 0,
            sales: 0,
            transactions: [] // <-- [BARU] Siapkan array untuk rincian
          };
          
          summary.qty += qty;
          summary.sales += sales;
          
          // --- [BARU] Tambahkan data rincian transaksi ---
          summary.transactions.push({
            id: txDoc.id,
            customer: txData.namaPelanggan || 'Umum',
            time: txData.tanggal, // Ini adalah Timestamp
            qty: qty,
            sales: sales
          });
          // --- [AKHIR BARU] ---
          
          productSummary.set(productId, summary);
        });
      });
      // --- AKHIR LANGKAH C ---
      
      setKpi({
        totalSales: grandTotalSales,
        totalTxn: grandTotalTxn,
        totalItems: grandTotalItems
      });
      
      const sortedReport = Array.from(productSummary.values())
                                .sort((a, b) => b.qty - a.qty);
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
  
  // --- [BARU] Fungsi untuk membuka modal ---
  const handleProductClick = (productData) => {
    // Urutkan transaksi dari yang terbaru
    const sortedTransactions = productData.transactions.sort(
      (a, b) => b.time.seconds - a.time.seconds
    );
    
    setModalData(sortedTransactions);
    setSelectedProductName(productData.name);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan per Produk</h1>

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

      {/* --- KPI Cards (Tidak berubah) --- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard title="Total Omzet (Penjualan)" value={formatRupiah(kpi.totalSales)} icon={<MdAttachMoney />} />
        <SummaryCard title="Total Transaksi" value={kpi.totalTxn.toString()} icon={<MdReceiptLong />} />
        <SummaryCard title="Total Item Terjual" value={kpi.totalItems.toString()} icon={<MdInventory2 />} />
      </div>

      {/* --- Tabel Hasil Laporan (DIPERBARUI) --- */}
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
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total Omzet</th>
                  <th className="relative px-6 py-3.5">
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reportData.map((item, index) => (
                  // --- [BARU] Baris tabel dibuat klikabel ---
                  <tr 
                    key={item.name + index} 
                    onClick={() => handleProductClick(item)} // <-- Aksi klik
                    className="transition-colors hover:bg-gray-50 cursor-pointer" // <-- Tambah cursor
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-cyan-700">{item.qty}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-700">{formatRupiah(item.sales)}</td>
                    {/* --- [BARU] Ikon panah untuk indikator --- */}
                    <td className="whitespace-nowrap px-6 py-4 text-right text-gray-400">
                      <MdChevronRight className="w-5 h-5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* --- [BARU] Render Modal --- */}
      <TransactionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productName={selectedProductName}
        transactions={modalData}
      />

    </div>
  );
}