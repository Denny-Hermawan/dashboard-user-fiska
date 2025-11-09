// app/dashboard/laporan/kasir/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

// --- Ikon Baru (Material Design) ---
import {
  MdInbox,
  MdPointOfSale,
  MdAccessTime,
  MdEvent,
  MdReceiptLong,
  MdAttachMoney,
  MdUndo,
  MdPerson // <-- Ikon untuk kasir
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
    <p className="mt-4 text-sm font-medium text-gray-900">Tidak ada data sesi</p>
    <p className="mt-1 text-sm text-gray-500">Tidak ada sesi kasir yang ditemukan pada rentang tanggal ini.</p>
  </div>
);

// --- Komponen Kartu Sesi (Pengganti Tabel) ---
const SessionCard = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
      {/* Header Kartu */}
      <div 
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
            <MdPointOfSale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {/* --- Tampilkan Nama Kasir --- */}
              {session.cashierName || '(Sesi Lama)'}
            </p>
            <p className="text-xs text-gray-500">
              {session.totalTxn} Transaksi Selesai
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-sm font-bold text-gray-900">{formatRupiah(session.totalSales)}</span>
           <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
           </svg>
        </div>
      </div>

      {/* Detail Sesi (Expandable) */}
      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <MdEvent className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Mulai: {formatDateTime(session.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MdAccessTime className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Selesai: {formatDateTime(session.endTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MdReceiptLong className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Omzet: <span className="font-medium text-green-700">{formatRupiah(session.totalSales)}</span></span>
            </div>
             <div className="flex items-center gap-2">
              <MdUndo className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-600">Refund: <span className="font-medium text-red-700">{formatRupiah(session.totalRefund)}</span></span>
            </div>
            {/* --- Tampilkan Sesi ID --- */}
            <div className="flex items-center gap-2 md:col-span-2">
              <MdPerson className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Sesi ID: {session.sessionId}</span>
            </div>
          </div>
          
          <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Rincian Pembayaran (Omzet)</h4>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {Object.keys(session.paymentSummary).length > 0 ? (
              Object.entries(session.paymentSummary).map(([method, total]) => (
                <li key={method} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 capitalize">{method.toLowerCase()}</span>
                  <span className="text-sm font-bold text-gray-700">{formatRupiah(total)}</span>
                </li>
              ))
            ) : (
               <li className="px-4 py-3 text-sm text-gray-500 italic">Tidak ada rincian pembayaran.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};


// --- Main Page Component ---
export default function LaporanKasirPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- State untuk Laporan ---
  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  const [reportData, setReportData] = useState([]); // Data tabel

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

    try {
      const dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);

      const txQuery = query(
        collection(db, "users", user.uid, "transactions"),
        where('tanggal', '>=', Timestamp.fromDate(dateStart)),
        where('tanggal', '<=', Timestamp.fromDate(dateEnd)),
        orderBy('tanggal', 'asc') // PENTING: Urutkan menaik untuk dapat Start/End time
      );
      
      const txSnap = await getDocs(txQuery);

      // --- Langkah C: Proses Data (Agregasi per Sesi) ---
      const sessionsMap = new Map();

      txSnap.docs.forEach(txDoc => {
        const data = txDoc.data();
        const sessionId = data.sessionId || 'unknown';
        const txTime = data.tanggal;

        // Ambil sesi yang ada atau buat baru
        const session = sessionsMap.get(sessionId) || {
          sessionId: sessionId,
          startTime: txTime, // Karena diurut 'asc', transaksi pertama adalah startTime
          endTime: txTime, // Akan ditimpa oleh transaksi terakhir
          cashierName: data.cashierName || null, // Ambil nama kasir
          totalSales: 0,
          totalTxn: 0,
          totalRefund: 0,
          paymentSummary: new Map(),
        };

        // --- PERBAIKAN LOGIKA ADA DI SINI ---
        // Jika nama kasir di sesi ini masih null (dari transaksi lama),
        // coba ambil dari transaksi saat ini (yang mungkin data baru).
        if (session.cashierName == null && data.cashierName != null) {
          session.cashierName = data.cashierName;
        }
        // --- AKHIR PERBAIKAN ---

        // Selalu update endTime
        session.endTime = txTime;

        if (data.isRefunded) {
          session.totalRefund += data.total || 0;
        } else {
          session.totalSales += data.total || 0;
          session.totalTxn++;
          
          const method = (data.orderType === 'Online' ? data.onlinePlatform : data.metodePembayaran) || 'N/A';
          session.paymentSummary.set(method, (session.paymentSummary.get(method) || 0) + (data.total || 0));
        }
        
        sessionsMap.set(sessionId, session);
      });
      // --- AKHIR LANGKAH C ---
      
      // Ubah Map ke Array dan urutkan (sesi terbaru dulu)
      const sortedReport = Array.from(sessionsMap.values())
                                .sort((a, b) => b.startTime.seconds - a.startTime.seconds);
      
      // Ubah Map rincian bayar di dalam sesi menjadi Object
      const finalReport = sortedReport.map(session => ({
          ...session,
          paymentSummary: Object.fromEntries(session.paymentSummary.entries())
      }));

      setReportData(finalReport);
      
    } catch (error) {
      console.error("Error fetching session report:", error);
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
      <h1 className="text-3xl font-bold text-gray-900">Laporan Per Sesi Kasir</h1>

      {/* --- Filter Bar (Tema diperbarui) --- */}
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

      {/* --- Daftar Sesi (Pengganti Tabel) --- */}
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : reportData.length === 0 ? (
          <EmptyState />
        ) : (
          reportData.map((session) => (
            <SessionCard key={session.sessionId} session={session} />
          ))
        )}
      </div>

    </div>
  );
}