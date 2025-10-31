// app/dashboard/transaksi/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, Timestamp, orderBy, getDocs, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

// --- Helper Functions ---

// Mengubah tanggal menjadi YYYY-MM-DD untuk input
const formatDateToInput = (date) => {
  return date.toISOString().split('T')[0];
};

// Default: 7 hari terakhir
const getSevenDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getTodayEnd = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

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

// Format Tanggal & Waktu Lengkap
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
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      <span className="text-sm font-medium text-gray-600">{message}</span>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
      📭
    </div>
    <p className="mt-4 text-sm font-medium text-gray-900">Tidak ada transaksi</p>
    <p className="mt-1 text-sm text-gray-500">Ubah filter Anda atau buat transaksi baru.</p>
  </div>
);

// Badge Status
const StatusBadge = ({ isRefunded }) => {
  return isRefunded ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
      Refund
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
      Selesai
    </span>
  );
};

// --- Main Page Component ---
export default function TransaksiPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- State untuk Filter ---
  const [filterStartDate, setFilterStartDate] = useState(formatDateToInput(getSevenDaysAgo()));
  const [filterEndDate, setFilterEndDate] = useState(formatDateToInput(getTodayEnd()));
  const [filterStatus, setFilterStatus] = useState('semua'); // 'semua', 'selesai', 'refund'

  // Cek Autentikasi
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

  // Fungsi Fetch Transaksi
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setTransactions([]);

    try {
      // Ubah string YYYY-MM-DD kembali ke Date object untuk query
      const startDate = new Date(filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);

      // Bangun query dasar
      let q = query(
        collection(db, "users", user.uid, "transactions"),
        where('tanggal', '>=', Timestamp.fromDate(startDate)),
        where('tanggal', '<=', Timestamp.fromDate(endDate)),
        orderBy('tanggal', 'desc'),
        limit(50) // Batasi 50 transaksi terbaru untuk performa
      );

      // Tambahkan filter status jika bukan 'semua'
      if (filterStatus === 'selesai') {
        q = query(q, where('isRefunded', '==', false));
      } else if (filterStatus === 'refund') {
        q = query(q, where('isRefunded', '==', true));
      }

      const querySnapshot = await getDocs(q);
      const txsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTransactions(txsData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      // Anda bisa menambahkan state untuk error handling di sini
    } finally {
      setIsLoading(false);
    }
  }, [user, filterStartDate, filterEndDate, filterStatus]);

  // Fetch data saat user pertama kali dimuat
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  const handleFilterApply = (e) => {
    e.preventDefault();
    fetchTransactions();
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Riwayat Transaksi</h1>

      {/* --- Filter Bar --- */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <form onSubmit={handleFilterApply} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
          {/* Tanggal Mulai */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Dari Tanggal
            </label>
            <input
              type="date"
              id="startDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              // TAMBAHKAN text-gray-900 DI SINI
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
            />
          </div>
          
          {/* Tanggal Akhir */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              Sampai Tanggal
            </label>
            <input
              type="date"
              id="endDate"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              // TAMBAHKAN text-gray-900 DI SINI
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
            />
          </div>

          {/* Filter Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              // TAMBAHKAN text-gray-900 DI SINI
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
            >
              <option value="semua">Semua</option>
              <option value="selesai">Selesai</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          {/* Tombol Terapkan */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Memuat...' : 'Terapkan Filter'}
          </button>
        </form>
      </div>

      {/* --- Tabel Hasil Transaksi --- */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Pelanggan</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tanggal</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipe Pesanan</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Metode Bayar</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                    
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tx.namaPelanggan || 'Umum'}</div>
                      <div className="text-xs text-gray-500">ID: {tx.id.substring(0, 6)}...</div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(tx.tanggal)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {tx.orderType || 'Offline'}
                    </td>
                    
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {tx.metodePembayaran || (tx.orderType === 'Online' ? tx.onlinePlatform : 'N/A')}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatRupiah(tx.total)}</span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <StatusBadge isRefunded={tx.isRefunded} />
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