// app/dashboard/laporan/ringkasan/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Ikon ---
import {
  MdInbox,
  MdShowChart,
  MdDeliveryDining,
  MdReceiptLong,
  MdInventory2,
  MdKeyboardArrowDown,
  MdTrendingUp,
  MdTrendingDown,
  MdRemove
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

const formatCompactNumber = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}rb`;
  return value.toString();
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

// Enhanced Summary Card 
const SummaryCard = ({ title, value, icon }) => (
  <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-2xl text-cyan-700">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  </div>
);

// Progress Bar Component
const ProgressBar = ({ value, max, color = 'bg-cyan-600' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div 
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );
};

// Insight Card Component
const InsightCard = ({ icon, text, type = 'info' }) => {
  const bgColors = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200',
    danger: 'bg-red-50 border-red-200'
  };
  const textColors = {
    success: 'text-green-700',
    warning: 'text-orange-700',
    info: 'text-blue-700',
    danger: 'text-red-700'
  };
  
  return (
    <div className={`rounded-xl p-4 border ${bgColors[type]}`}>
      <div className="flex items-start gap-3">
        <div className={`${textColors[type]} mt-0.5`}>{icon}</div>
        <p className={`text-sm font-medium ${textColors[type]}`}>{text}</p>
      </div>
    </div>
  );
};

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
            <MdKeyboardArrowDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>
      
      {hasDetails && isOpen && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Rincian</h4>
          <ul className="space-y-2">
            {Object.entries(details).map(([key, total]) => (
              <li key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">• {key.toLowerCase()}</span>
                <span className={`text-sm font-medium ${colorClass}`}>{formatRupiah(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Chart colors
const CHART_COLORS = ['#0e7490', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#f97316', '#fb923c', '#fdba74'];

// --- Main Page Component ---
export default function RingkasanPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
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
  const [dailyTrend, setDailyTrend] = useState([]);

  const [showComplimentDetails, setShowComplimentDetails] = useState(false);
  const [showRefundDetails, setShowRefundDetails] = useState(false);

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

  const fetchReport = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setPaymentSummary({});
    setRefundSummary({});
    setComplimentSummary({});
    setDailyTrend([]);
    setKpi({ 
      totalSales: 0, totalTxn: 0, totalItems: 0, totalDiscount: 0, 
      totalCompliment: 0, totalRefund: 0, totalSalesOnline: 0, totalSalesOffline: 0
    });

    try {
      const dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);

      const txQuery = query(
        collection(db, "users", user.uid, "transactions"),
        where('tanggal', '>=', Timestamp.fromDate(dateStart)),
        where('tanggal', '<=', Timestamp.fromDate(dateEnd)),
        orderBy('tanggal', 'desc')
      );
      
      const txSnap = await getDocs(txQuery);

      let totalSales = 0, totalTxn = 0, totalItems = 0, totalDiscount = 0, 
          totalCompliment = 0, totalRefund = 0, totalSalesOnline = 0, totalSalesOffline = 0;
      const paymentMap = new Map();
      const refundMap = new Map();
      const complimentMap = new Map();
      const dailyMap = new Map();

      txSnap.docs.forEach(txDoc => {
        const data = txDoc.data();
        const method = data.metodePembayaran || 'N/A';
        const platform = data.onlinePlatform || 'Offline';
        const isOnline = data.orderType === 'Online';
        
        // Daily trend
        const txDate = data.tanggal?.toDate();
        if (txDate) {
          const dateKey = formatDateToInput(txDate);
          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, { date: dateKey, online: 0, offline: 0, total: 0 });
          }
        }

        if (data.isRefunded) {
          totalRefund += data.total || 0;
          const refundMethod = isOnline ? platform : method;
          refundMap.set(refundMethod, (refundMap.get(refundMethod) || 0) + (data.total || 0));
        } else {
          const saleAmount = data.total || 0;
          totalSales += saleAmount;
          totalTxn++;
          totalDiscount += data.diskon || 0;
          
          const paymentMethod = isOnline ? platform : method;
          paymentMap.set(paymentMethod, (paymentMap.get(paymentMethod) || 0) + saleAmount);

          if (isOnline) {
            totalSalesOnline += saleAmount;
            if (txDate) {
              const dateKey = formatDateToInput(txDate);
              const dayData = dailyMap.get(dateKey);
              if (dayData) {
                dayData.online += saleAmount;
                dayData.total += saleAmount;
              }
            }
          } else {
            totalSalesOffline += saleAmount;
            if (txDate) {
              const dateKey = formatDateToInput(txDate);
              const dayData = dailyMap.get(dateKey);
              if (dayData) {
                dayData.offline += saleAmount;
                dayData.total += saleAmount;
              }
            }
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
      
      setKpi({ 
        totalSales, totalTxn, totalItems, totalDiscount, 
        totalCompliment, totalRefund, totalSalesOnline, totalSalesOffline
      });
      setPaymentSummary(Object.fromEntries(Array.from(paymentMap.entries()).sort((a, b) => b[1] - a[1])));
      setRefundSummary(Object.fromEntries(Array.from(refundMap.entries()).sort((a, b) => b[1] - a[1])));
      setComplimentSummary(Object.fromEntries(Array.from(complimentMap.entries()).sort((a, b) => b[1] - a[1])));
      
      const sortedDaily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      setDailyTrend(sortedDaily);
      
    } catch (error) {
      console.error("Error fetching report:", error);
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
    setShowComplimentDetails(false);
    setShowRefundDetails(false);
    fetchReport();
  };

  // Calculate insights
  const avgDailySales = dailyTrend.length > 0 ? kpi.totalSales / dailyTrend.length : 0;
  const avgTransaction = kpi.totalTxn > 0 ? kpi.totalSales / kpi.totalTxn : 0;
  const onlinePercentage = kpi.totalSales > 0 ? (kpi.totalSalesOnline / kpi.totalSales) * 100 : 0;
  const refundRate = kpi.totalSales > 0 ? (kpi.totalRefund / (kpi.totalSales + kpi.totalRefund)) * 100 : 0;

  // Prepare pie chart data
  const pieData = Object.entries(paymentSummary).map(([name, value]) => ({
    name,
    value
  }));

  // Generate insights
  const insights = [];
  if (onlinePercentage > 50) {
    insights.push({
      type: 'success',
      icon: <MdTrendingUp className="w-5 h-5" />,
      text: `Penjualan online mendominasi ${onlinePercentage.toFixed(0)}% dari total penjualan`
    });
  }
  if (refundRate > 10) {
    insights.push({
      type: 'warning',
      icon: <MdTrendingDown className="w-5 h-5" />,
      text: `Tingkat refund tinggi: ${refundRate.toFixed(1)}% dari total transaksi`
    });
  }
  if (pieData.length > 0) {
    const topPayment = pieData[0];
    const topPercentage = (topPayment.value / kpi.totalSales) * 100;
    insights.push({
      type: 'info',
      icon: <MdShowChart className="w-5 h-5" />,
      text: `${topPayment.name} adalah metode pembayaran favorit (${topPercentage.toFixed(0)}%)`
    });
  }
  
  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="border-b border-gray-100 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Laporan Ringkasan</h1>
          <p className="mt-1 text-sm text-gray-500">Analisis komprehensif performa penjualan Anda</p>
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

      {isLoading ? (
        <LoadingSpinner />
      ) : kpi.totalTxn === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard 
              title="Total Penjualan" 
              value={formatRupiah(kpi.totalSales)} 
              icon={<MdShowChart className="w-6 h-6" />}
              colorClass="text-cyan-700"
            />
            <SummaryCard 
              title="Rata-rata/Transaksi" 
              value={formatRupiah(avgTransaction)} 
              icon={<MdReceiptLong className="w-6 h-6" />}
              colorClass="text-blue-600"
            />
            <SummaryCard 
              title="Total Transaksi" 
              value={kpi.totalTxn.toString()} 
              icon={<MdReceiptLong className="w-6 h-6" />}
              colorClass="text-purple-600"
            />
            <SummaryCard 
              title="Item Terjual" 
              value={kpi.totalItems.toString()} 
              icon={<MdInventory2 className="w-6 h-6" />}
              colorClass="text-green-600"
            />
          </div>


          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend Chart */}
            {dailyTrend.length > 1 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tren Penjualan Harian</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => formatCompactNumber(val)} />
                    <Tooltip 
                      formatter={(value) => formatRupiah(value)}
                      labelFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#0e7490" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="online" stroke="#06b6d4" strokeWidth={2} name="Online" />
                    <Line type="monotone" dataKey="offline" stroke="#67e8f9" strokeWidth={2} name="Offline" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            
          </div>

          {/* Online vs Offline Comparison */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Perbandingan Online vs Offline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MdDeliveryDining className="w-5 h-5 text-cyan-600" />
                    <span className="text-sm font-medium text-gray-700">Penjualan Online</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatRupiah(kpi.totalSalesOnline)}</span>
                </div>
                <ProgressBar value={kpi.totalSalesOnline} max={kpi.totalSales} color="bg-cyan-600" />
                <p className="mt-1 text-xs text-gray-500">{onlinePercentage.toFixed(1)}% dari total penjualan</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MdShowChart className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Penjualan Offline</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatRupiah(kpi.totalSalesOffline)}</span>
                </div>
                <ProgressBar value={kpi.totalSalesOffline} max={kpi.totalSales} color="bg-blue-600" />
                <p className="mt-1 text-xs text-gray-500">{(100 - onlinePercentage).toFixed(1)}% dari total penjualan</p>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rincian Lain-lain */}
            <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">Rincian Lain-lain</h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                <DetailRow
                  title="Total Diskon"
                  value={formatRupiah(kpi.totalDiscount)}
                  colorClass="text-orange-600"
                />
                
                <DetailRow
                  title="Total Komplimen"
                  value={formatRupiah(kpi.totalCompliment)}
                  colorClass="text-blue-600"
                  details={complimentSummary}
                  isOpen={showComplimentDetails}
                  onToggle={() => setShowComplimentDetails(!showComplimentDetails)}
                />
                
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
            
            {/* Rincian Metode Bayar */}
            <div className="lg:col-span-1 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">Rincian Metode Bayar</h3>
              </div>
              {Object.keys(paymentSummary).length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-gray-500">Tidak ada penjualan.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  <li className="flex items-center justify-between px-6 py-4 bg-cyan-50">
                    <span className="text-sm font-bold text-gray-900">Total Omzet</span>
                    <span className="text-sm font-bold text-cyan-700">{formatRupiah(kpi.totalSales)}</span>
                  </li>
                  {Object.entries(paymentSummary).map(([method, total]) => {
                    const percentage = (total / kpi.totalSales) * 100;
                    return (
                      <li key={method} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">{method.toLowerCase()}</span>
                          <span className="text-sm font-bold text-gray-700">{formatRupiah(total)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={total} max={kpi.totalSales} color="bg-cyan-500" />
                          <span className="text-xs text-gray-500 whitespace-nowrap">{percentage.toFixed(0)}%</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}