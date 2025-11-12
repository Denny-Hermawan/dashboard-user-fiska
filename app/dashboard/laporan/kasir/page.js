// app/dashboard/laporan/kasir/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';

// --- Ikon ---
import {
  MdInbox,
  MdPointOfSale,
  MdAccessTime,
  MdEvent,
  MdReceiptLong,
  MdAttachMoney,
  MdUndo,
  MdPerson,
  MdTrendingUp,
  MdEmojiEvents,
  MdSchedule
} from 'react-icons/md';

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

const formatDateTime = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return '-';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Hitung durasi sesi dalam menit
const calculateDuration = (startTime, endTime) => {
  if (!startTime?.seconds || !endTime?.seconds) return 0;
  const diff = (endTime.seconds - startTime.seconds) / 60;
  return Math.round(diff);
};

// Format durasi
const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} jam ${mins > 0 ? mins + ' menit' : ''}`;
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
    <h3 className="mt-6 text-lg font-semibold text-gray-900">Belum Ada Data Sesi</h3>
    <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
      Tidak ada sesi kasir yang ditemukan pada rentang tanggal ini. Coba ubah filter tanggal atau mulai sesi baru.
    </p>
    <div className="mt-6 flex gap-3">
      <button className="rounded-lg bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 transition-colors">
        Ubah Filter
      </button>
    </div>
  </div>
);

// --- Badge Component ---
const PerformanceBadge = ({ rank, isTopPerformer }) => {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 shadow-sm">
        <MdEmojiEvents className="h-4 w-4 text-white" />
        <span className="text-xs font-bold text-white">Top Performer</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 px-3 py-1">
        <MdEmojiEvents className="h-4 w-4 text-white" />
        <span className="text-xs font-semibold text-white">Rank #{rank}</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-300 to-orange-400 px-3 py-1">
        <MdEmojiEvents className="h-4 w-4 text-white" />
        <span className="text-xs font-semibold text-white">Rank #{rank}</span>
      </div>
    );
  }
  return null;
};

// --- Komponen Kartu Sesi (Redesigned) ---
const SessionCard = ({ session, rank, totalOmzet }) => {
  const [isOpen, setIsOpen] = useState(false);
  const duration = calculateDuration(session.startTime, session.endTime);
  const contribution = totalOmzet > 0 ? (session.totalSales / totalOmzet) * 100 : 0;
  const avgPerTxn = session.totalTxn > 0 ? session.totalSales / session.totalTxn : 0;
  
  return (
    <div className="group rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden hover:shadow-md hover:ring-cyan-200 transition-all duration-200">
      {/* Header Kartu - [FIXED] Dibuat responsif */}
      <div 
        // --- [PERBAIKAN] Header utama dibuat flex-col lalu sm:flex-row ---
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Avatar dengan gradien */}
          <div className="relative flex-shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
              <MdPointOfSale className="w-7 h-7 text-white" />
            </div>
            {rank <= 3 && (
              <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
                <span className="text-xs font-bold text-cyan-600">#{rank}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap"> {/* Tambah flex-wrap untuk badge */}
              <h3 className="text-base font-bold text-gray-900 truncate">
                {session.cashierName || 'Sesi Tanpa Nama'}
              </h3>
              <PerformanceBadge rank={rank} />
            </div>
            
            {/* --- [PERBAIKAN] Detail (transaksi & durasi) dibuat flex-col lalu sm:flex-row --- */}
            <div className="flex flex-col items-start sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <MdReceiptLong className="w-4 h-4" />
                <span className="font-medium">{session.totalTxn}</span>
                <span>transaksi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MdSchedule className="w-4 h-4" />
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Omzet Highlight */}
        {/* --- [PERBAIKAN] Dibuat full-width di mobile (mt-4) dan auto-width di sm --- */}
        <div className="flex items-center justify-between sm:justify-normal w-full sm:w-auto sm:gap-6 mt-4 sm:mt-0">
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{formatRupiah(session.totalSales)}</div>
            <div className="flex items-center justify-end gap-1 mt-1">
              <MdTrendingUp className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-medium text-cyan-600">{contribution.toFixed(1)}% kontribusi</span>
            </div>
          </div>
          
          <svg 
            className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {/* --- AKHIR PERBAIKAN HEADER --- */}


      {/* Progress Bar - Kontribusi Visual */}
      <div className="px-6 pb-4">
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(contribution, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Detail Sesi (Expandable) - Redesigned */}
      {isOpen && (
        <div className="border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white p-6">
          {/* Metrik Grid (Ini sudah responsif: 2 kolom -> 4 kolom) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <MdAttachMoney className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-gray-600">Rata-rata/Txn</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(avgPerTxn)}</p>
            </div>
            
            <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <MdUndo className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-gray-600">Total Refund</span>
              </div>
              <p className="text-lg font-bold text-red-600">{formatRupiah(session.totalRefund)}</p>
            </div>
            
            <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <MdEvent className="w-4 h-4 text-cyan-600" />
                <span className="text-xs font-medium text-gray-600">Mulai</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(session.startTime)}</p>
            </div>
            
            <div className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <MdAccessTime className="w-4 h-4 text-cyan-600" />
                <span className="text-xs font-medium text-gray-600">Selesai</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(session.endTime)}</p>
            </div>
          </div>
          
          {/* Rincian Pembayaran */}
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-cyan-600"></div>
              Breakdown Metode Pembayaran
            </h4>
            {Object.keys(session.paymentSummary).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(session.paymentSummary)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, total]) => {
                    const percentage = (total / session.totalSales) * 100;
                    return (
                      <div key={method} className="group/item">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900 capitalize">
                            {method.toLowerCase()}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{formatRupiah(total)}</span>
                            <span className="ml-2 text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4 text-center">Tidak ada data pembayaran</p>
            )}
          </div>

          {/* Session ID - Minimized */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">Session ID: {session.sessionId}</p>
          </div>
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

  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  const [reportData, setReportData] = useState([]);

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

  // 2. Fungsi Fetch Laporan (TIDAK DIUBAH)
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
        orderBy('tanggal', 'asc')
      );
      
      const txSnap = await getDocs(txQuery);

      const sessionsMap = new Map();

      txSnap.docs.forEach(txDoc => {
        const data = txDoc.data();
        const sessionId = data.sessionId || 'unknown';
        const txTime = data.tanggal;

        const session = sessionsMap.get(sessionId) || {
          sessionId: sessionId,
          startTime: txTime,
          endTime: txTime,
          cashierName: data.cashierName || null,
          totalSales: 0,
          totalTxn: 0,
          totalRefund: 0,
          paymentSummary: new Map(),
        };

        if (session.cashierName == null && data.cashierName != null) {
          session.cashierName = data.cashierName;
        }

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
      
      const sortedReport = Array.from(sessionsMap.values())
                                .sort((a, b) => b.totalSales - a.totalSales); // Sort by sales untuk ranking
      
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

  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user, fetchReport]);

  const handleFilterApply = (e) => {
    e.preventDefault();
    fetchReport();
  };

  // Hitung total omzet untuk percentage calculation
  const totalOmzet = reportData.reduce((sum, session) => sum + session.totalSales, 0);
  
  return (
    <div className="space-y-6">

      {/* Filter Tanggal (Ini sudah responsif: 1 kolom -> 3 kolom) */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 mb-6">
        <div className="border-b border-gray-100 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Laporan per Sesi Kasir</h1>
          <p className="mt-2 text-sm text-gray-600">Monitor performa setiap sesi kasir dan analisis kontribusi penjualan</p>
        </div>
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

      {/* Daftar Sesi dengan Ranking */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <LoadingSpinner />
          </div>
        ) : reportData.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <EmptyState />
          </div>
        ) : (
          reportData.map((session, index) => (
            <SessionCard 
              key={session.sessionId} 
              session={session} 
              rank={index + 1}
              totalOmzet={totalOmzet}
            />
          ))
        )}
      </div>

    </div>
  );
}