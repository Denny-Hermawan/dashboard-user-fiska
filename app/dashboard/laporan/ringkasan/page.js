// app/dashboard/laporan/ringkasan/page.js
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

// --- Ikon Panah untuk Accordion ---
const ChevronDownIcon = ({ className = '' }) => (
  <svg className={`w-5 h-5 text-gray-400 transition-transform ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

// --- Komponen Baris Rincian (untuk Accordion) ---
const DetailRow = ({ title, value, colorClass, details, isOpen, onToggle }) => {
  const hasDetails = details && Object.keys(details).length > 0;

  return (
    <div className="py-4 px-6">
      <div 
        className={`flex items-center justify-between ${hasDetails ? 'cursor-pointer hover:bg-gray-50 -mx-6 px-6' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${colorClass}`}>{value}</span>
          {hasDetails && (
            <ChevronDownIcon className={isOpen ? 'rotate-180' : ''} />
          )}
        </div>
      </div>
      
      {/* Konten Accordion yang bisa expand */}
      {hasDetails && isOpen && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Rincian</h4>
          <ul className="space-y-2">
            {Object.entries(details).map(([key, total]) => (
              <li key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">· {key.toLowerCase()}</span>
                <span className={`text-sm font-medium ${colorClass}`}>{formatRupiah(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
export default function RingkasanPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk Filter
  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  // State untuk Laporan
  const [kpi, setKpi] = useState({
    totalSales: 0,
    totalTxn: 0,
    totalItems: 0,
    totalDiscount: 0,
    totalCompliment: 0,
    totalRefund: 0,
    totalSalesOnline: 0,
    totalSalesOffline: 0,
  });
  const [paymentSummary, setPaymentSummary] = useState({});
  const [refundSummary, setRefundSummary] = useState({});
  const [complimentSummary, setComplimentSummary] = useState({});

  // State untuk Accordion
  const [showComplimentDetails, setShowComplimentDetails] = useState(false);
  const [showRefundDetails, setShowRefundDetails] = useState(false);

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
    setPaymentSummary({});
    setRefundSummary({});
    setComplimentSummary({});
    setKpi({ 
      totalSales: 0, totalTxn: 0, totalItems: 0, totalDiscount: 0, 
      totalCompliment: 0, totalRefund: 0, totalSalesOnline: 0, totalSalesOffline: 0
    });

    try {
      // Tentukan rentang tanggal
      const dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);

      // Query semua transaksi dalam rentang tanggal
      const txQuery = query(
        collection(db, "users", user.uid, "transactions"),
        where('tanggal', '>=', Timestamp.fromDate(dateStart)),
        where('tanggal', '<=', Timestamp.fromDate(dateEnd)),
        orderBy('tanggal', 'desc')
      );
      
      const txSnap = await getDocs(txQuery);

      // Inisialisasi Kalkulasi
      let totalSales = 0, totalTxn = 0, totalItems = 0, totalDiscount = 0, 
          totalCompliment = 0, totalRefund = 0, totalSalesOnline = 0, totalSalesOffline = 0;
      const paymentMap = new Map();
      const refundMap = new Map();
      const complimentMap = new Map();

      txSnap.docs.forEach(txDoc => {
        const data = txDoc.data();
        const method = data.metodePembayaran || 'N/A';
        const platform = data.onlinePlatform || 'Offline';
        const isOnline = data.orderType === 'Online';

        if (data.isRefunded) {
          // Kalkulasi Refund
          totalRefund += data.total || 0;
          const refundMethod = isOnline ? platform : method;
          refundMap.set(refundMethod, (refundMap.get(refundMethod) || 0) + (data.total || 0));
        } else {
          // Kalkulasi Penjualan Selesai
          totalSales += data.total || 0;
          totalTxn++;
          totalDiscount += data.diskon || 0;
          
          const paymentMethod = isOnline ? platform : method;
          paymentMap.set(paymentMethod, (paymentMap.get(paymentMethod) || 0) + (data.total || 0));

          if (isOnline) {
            totalSalesOnline += data.total || 0;
          } else {
            totalSalesOffline += data.total || 0;
          }

          (data.items || []).forEach(item => {
            if (item.isComplimentary) {
              const complimentValue = (item.produkHarga || 0) * (item.jumlah || 0);
              totalCompliment += complimentValue;
              const authorizer = item.complimentaryAuthorizedBy || 'Tidak Diketahui';
              complimentMap.set(authorizer, (complimentMap.get(authorizer) || 0) + complimentValue);
            } else {
              totalItems += item.jumlah || 0;
            }
          });
        }
      });
      
      // Set State
      setKpi({ 
        totalSales, totalTxn, totalItems, totalDiscount, 
        totalCompliment, totalRefund, totalSalesOnline, totalSalesOffline
      });
      setPaymentSummary(Object.fromEntries(Array.from(paymentMap.entries()).sort((a, b) => b[1] - a[1])));
      setRefundSummary(Object.fromEntries(Array.from(refundMap.entries()).sort((a, b) => b[1] - a[1])));
      setComplimentSummary(Object.fromEntries(Array.from(complimentMap.entries()).sort((a, b) => b[1] - a[1])));
      
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, startDate, endDate]);

  // 3. Fetch data
  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user, fetchReport]);

  const handleFilterApply = (e) => {
    e.preventDefault();
    // Reset accordion saat filter
    setShowComplimentDetails(false);
    setShowRefundDetails(false);
    fetchReport();
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Laporan Ringkasan</h1>

      {/* --- Filter Bar --- */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <form onSubmit={handleFilterApply} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          {/* Tanggal Mulai */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Dari Tanggal</label>
            <input
              type="date" id="startDate" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          {/* Tanggal Akhir */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Sampai Tanggal</label>
            <input
              type="date" id="endDate" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          {/* Tombol Terapkan */}
          <button
            type="submit" disabled={isLoading}
            className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Memuat...' : 'Terapkan Filter'}
          </button>
        </form>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* --- KPI Cards --- */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Penjualan Offline" value={formatRupiah(kpi.totalSalesOffline)} icon="🏪" />
            <SummaryCard title="Penjualan Online" value={formatRupiah(kpi.totalSalesOnline)} icon="🌐" />
            <SummaryCard title="Total Transaksi" value={kpi.totalTxn.toString()} icon="🛒" />
            <SummaryCard title="Item Terjual" value={kpi.totalItems.toString()} icon="📦" />
          </div>

          {/* --- Rincian Laporan (Tata Letak Ditukar) --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* --- Kartu Lain-lain (Lebar & Modern) --- */}
            <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">Rincian Lain-lain</h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                
                {/* Baris Diskon (Simple) */}
                <DetailRow
                  title="Total Diskon"
                  value={formatRupiah(kpi.totalDiscount)}
                  colorClass="text-orange-600"
                />
                
                {/* Baris Komplimen (Expandable) */}
                <DetailRow
                  title="Total Komplimen"
                  value={formatRupiah(kpi.totalCompliment)}
                  colorClass="text-blue-600"
                  details={complimentSummary}
                  isOpen={showComplimentDetails}
                  onToggle={() => setShowComplimentDetails(!showComplimentDetails)}
                />
                
                {/* Baris Refund (Expandable) */}
                <DetailRow
                  title="Total Refund"
                  value={formatRupiah(kpi.totalRefund)}
                  colorClass="text-red-600"
                  details={refundSummary}
                  isOpen={showRefundDetails}
                  onToggle={() => setShowRefundDetails(!showRefundDetails)}
                />
              </div>
            </div>
            
            {/* --- Rincian Metode Bayar (Sempit) --- */}
            <div className="lg:col-span-1 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">Rincian Metode Bayar</h3>
              </div>
              {Object.keys(paymentSummary).length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-gray-500">Tidak ada penjualan.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {/* Total Omzet */}
                  <li className="flex items-center justify-between px-6 py-4 bg-gray-50">
                    <span className="text-sm font-bold text-gray-900">Total Omzet</span>
                    <span className="text-sm font-bold text-indigo-600">{formatRupiah(kpi.totalSales)}</span>
                  </li>
                  {/* Rincian per metode */}
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
        </>
      )}
    </div>
  );
}