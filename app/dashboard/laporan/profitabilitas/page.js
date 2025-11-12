// app/dashboard/laporan/profitabilitas/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // Impor toast

// --- Impor Chart.js ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
// --- Akhir Impor Chart.js ---

// --- Ikon ---
import {
  MdInbox,
  MdAttachMoney,
  MdInventory2,
  MdTrendingUp,
  MdClose,
  MdReceiptLong,
  MdOutlineDiscount,
  MdWarning,
  MdStar,
  MdShowChart,
  MdExpandMore,
  MdExpandLess,
  MdInsights,
  MdBarChart,
  MdPieChart,
  MdStorage
} from 'react-icons/md';

// --- Registrasi Komponen Chart.js ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
// --- Akhir Registrasi ---


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

const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
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

// --- [PERBAIKAN] Enhanced Summary Card (dihapus 'badge') ---
const EnhancedSummaryCard = ({ title, value, subtitle, icon, className = '', onClick }) => {
  
  // Tentukan apakah ini kartu yang bisa diklik
  const isClickable = !!onClick;
  
  // Gunakan <button> jika bisa diklik, <div> jika tidak
  const CardComponent = isClickable ? 'button' : 'div';

  return (
    <CardComponent
      type={isClickable ? 'button' : undefined}
      onClick={isClickable ? onClick : undefined}
      disabled={isClickable ? !onClick : undefined}
      suppressHydrationWarning={true}
      className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 text-left transition-all ${className} ${isClickable ? 'hover:shadow-lg hover:ring-2 hover:ring-cyan-200 cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 text-2xl text-cyan-700 shadow-sm">{icon}</div>
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
            {/* Subtitle akan diisi secara dinamis dari parent */}
            {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {/* Badge dihapus dari sini */}
      </div>
    </CardComponent>
  );
};

// --- [PERBAIKAN] Insight Card (ditambah shadow-sm) ---
const InsightCard = ({ icon, title, description, type = 'info' }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className={`rounded-xl border-l-4 p-4 shadow-sm ${styles[type]}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 text-xl">{icon}</div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-sm mt-1 opacity-90">{description}</p>
        </div>
      </div>
    </div>
  );
};

// --- Product Performance Badge ---
const PerformanceBadge = ({ margin }) => {
  if (margin >= 50) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700"><MdStar className="w-3 h-3" /> Excellent</span>;
  } else if (margin >= 30) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700"><MdTrendingUp className="w-3 h-3" /> Good</span>;
  } else if (margin >= 15) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700"><MdShowChart className="w-3 h-3" /> Fair</span>;
  } else {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700"><MdWarning className="w-3 h-3" /> Low</span>;
  }
};

const ProfitDetailModal = ({ isOpen, onClose, kpi }) => {
  if (!isOpen) return null;
  
  const profitMargin = kpi.totalSales > 0 ? ((kpi.totalProfit / kpi.totalSales) * 100) : 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col">
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
          <div className="flex justify-between items-center rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <MdOutlineDiscount className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Total Diskon</span>
            </div>
            <span className="text-lg font-bold text-orange-600">- {formatRupiah(kpi.totalDiscount)}</span>
          </div>
          <hr className="my-2 border-gray-200 border-dashed" />
          <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg ring-1 ring-green-200">
            <div className="flex items-center gap-3">
               <MdTrendingUp className="w-5 h-5 text-green-700" />
              <span className="text-base font-bold text-green-800">Total Profit (Laba Kotor)</span>
            </div>
            <span className="text-xl font-bold text-green-800">{formatRupiah(kpi.totalProfit)}</span>
          </div>
          
          {/* Profit Margin */}
          <div className="mt-4 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Profit Margin</span>
              <span className="text-2xl font-bold text-cyan-700">{formatPercent(profitMargin)}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                style={{ width: `${Math.min(profitMargin, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
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

// --- Komponen Chart ---

// 1. Doughnut Chart untuk Komposisi Profit
const ProfitDoughnutChart = ({ kpi }) => {
  const data = {
    labels: ['Profit', 'HPP (Cost)', 'Diskon'],
    datasets: [
      {
        label: 'Komposisi Omzet',
        data: [kpi.totalProfit, kpi.totalCost, kpi.totalDiscount],
        backgroundColor: [
          'rgba(15, 118, 110, 0.8)',
          'rgba(220, 38, 38, 0.8)',
          'rgba(234, 88, 12, 0.8)',
        ],
        borderColor: [
          'rgba(15, 118, 110, 1)',
          'rgba(220, 38, 38, 1)',
          'rgba(234, 88, 12, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed != null) {
              label += formatRupiah(context.parsed);
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              label += ` (${percentage}%)`;
            }
            return label;
          }
        }
      }
    },
  };

  return <Doughnut data={data} options={options} />;
};

// 2. Bar Chart untuk Top Produk
const TopProductsBarChart = ({ reportData }) => {
  const top5Data = reportData.slice(0, 5);

  const data = {
    labels: top5Data.map(item => item.name),
    datasets: [
      {
        label: 'Profit',
        data: top5Data.map(item => item.profit),
        backgroundColor: 'rgba(20, 184, 166, 0.8)',
        borderColor: 'rgba(15, 118, 110, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return 'Profit: ' + formatRupiah(context.parsed.x);
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value) {
            return formatRupiah(value);
          },
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            weight: '500'
          }
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
};

// --- Main Page Component ---
export default function ProfitabilitasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [startDate, setStartDate] = useState(formatDateToInput(getToday()));
  const [endDate, setEndDate] = useState(formatDateToInput(getToday()));
  
  const [reportData, setReportData] = useState([]);
  const [kpi, setKpi] = useState({ 
    totalSales: 0, 
    totalCost: 0, 
    totalDiscount: 0,
    totalProfit: 0 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetailTable, setShowDetailTable] = useState(false);

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
    setReportData([]);
    setKpi({ totalSales: 0, totalCost: 0, totalDiscount: 0, totalProfit: 0 }); 

    try {
      const costsRef = collection(db, "users", user.uid, "product_costs");
      const costsSnap = await getDocs(costsRef);
      const productCostsMap = new Map();
      costsSnap.docs.forEach(doc => {
        productCostsMap.set(doc.id, doc.data().costing || 0);
      });

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

      const productSummary = new Map(); 
      let grandTotalSales = 0;
      let grandTotalCost = 0;
      let grandTotalDiscount = 0; 

      txSnap.docs.forEach(txDoc => {
        const txData = txDoc.data();
        grandTotalDiscount += txData.diskon || 0;
        
        (txData.items || []).forEach(item => {
          const productId = item.produkIdString;
          if (!productId) return; 

          const qty = item.jumlah || 0;
          const sales = (item.produkHarga || 0) * qty;
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
      
      setKpi({
        totalSales: grandTotalSales,
        totalCost: grandTotalCost,
        totalDiscount: grandTotalDiscount,
        totalProfit: grandTotalSales - grandTotalCost - grandTotalDiscount
      });
      
      const sortedReport = Array.from(productSummary.values())
                                .sort((a, b) => b.profit - a.profit);
      setReportData(sortedReport);
      
    } catch (error) {
      console.error("Error fetching report:", error);
      // [PERBAIKAN] Tambahkan notifikasi error jika query gagal (misal: karena indeks)
      toast.error("Gagal memuat data. (Error: " + error.code + ")", {
        description: "Query ini mungkin memerlukan indeks. Cek console (F12) untuk link pembuatan indeks."
      });
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

  // --- Generate Insights ---
  const generateInsights = () => {
    if (reportData.length === 0) return [];
    
    const insights = [];
    const topProduct = reportData[0];
    const profitMargin = kpi.totalSales > 0 ? ((kpi.totalProfit / kpi.totalSales) * 100) : 0;
    const topProductContribution = kpi.totalProfit > 0 ? ((topProduct.profit / kpi.totalProfit) * 100) : 0;
    
    // Insight 1: Top Product
    insights.push({
      icon: <MdStar />,
      title: `${topProduct.name} adalah Top Performer Anda`,
      description: `Berkontribusi ${formatPercent(topProductContribution)} dari total profit dengan ${formatRupiah(topProduct.profit)}. Pastikan stok selalu tersedia!`,
      type: 'success'
    });

    // Insight 2: Profit Margin
    if (profitMargin >= 40) {
      insights.push({
        icon: <MdTrendingUp />,
        title: 'Margin Profit Sangat Sehat',
        description: `Dengan margin ${formatPercent(profitMargin)}, bisnis Anda memiliki ruang yang baik untuk ekspansi dan promosi.`,
        type: 'success'
      });
    } else if (profitMargin < 20) {
      insights.push({
        icon: <MdWarning />,
        title: 'Margin Profit Perlu Ditingkatkan',
        description: `Margin ${formatPercent(profitMargin)} cukup rendah. Pertimbangkan untuk meninjau harga jual atau efisiensi biaya.`,
        type: 'warning'
      });
    }

    // Insight 3: Low Performers
    const lowPerformers = reportData.filter(p => {
      const margin = p.sales > 0 ? ((p.profit / p.sales) * 100) : 0;
      return margin < 15 && p.sales > 0;
    });
    
    if (lowPerformers.length > 0) {
      insights.push({
        icon: <MdWarning />,
        title: `${lowPerformers.length} Produk dengan Margin Rendah`,
        description: `Beberapa produk memiliki margin profit di bawah 15%. Evaluasi strategi pricing atau pertimbangkan untuk menghentikan produk tersebut.`,
        type: 'warning'
      });
    }

    return insights;
  };

  const insights = !isLoading && reportData.length > 0 ? generateInsights() : [];
  const profitMargin = kpi.totalSales > 0 ? ((kpi.totalProfit / kpi.totalSales) * 100) : 0;
  
  return (
    // [PERBAIKAN] Layout dikembalikan ke space-y-6 (latar belakang abu-abu)
    <div className="space-y-6">
      
      {/* Filter Bar (Header Card) */}
      {/* [PERBAIKAN] Menggunakan shadow-sm standar */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="border-b border-gray-100 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
             <MdTrendingUp className="w-8 h-8 text-cyan-700" />
             Laporan Profitabilitas
          </h1>
        </div>
        
        <form onSubmit={handleFilterApply} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="date" id="startDate" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="date" id="endDate" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
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


      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <EnhancedSummaryCard 
          title="Total Omzet" 
          value={formatRupiah(kpi.totalSales)} 
          subtitle="Penjualan kotor"
          icon={<MdAttachMoney />}
        />
        <EnhancedSummaryCard 
          title="Total HPP" 
          value={formatRupiah(kpi.totalCost)} 
          subtitle="Harga pokok produksi"
          icon={<MdInventory2 />} 
          className="bg-red-50" 
        />
        <EnhancedSummaryCard 
          title="Total Profit" 
          value={formatRupiah(kpi.totalProfit)}
          // --- [PERBAIKAN UTAMA DI SINI] ---
          subtitle={profitMargin > 0 ? `Laba kotor (${formatPercent(profitMargin)} margin)` : "Laba kotor"}
          // --- [AKHIR PERBAIKAN UTAMA] ---
          icon={<MdTrendingUp />} 
          className="bg-green-50" 
          onClick={() => setIsModalOpen(true)}
          // badge prop dihapus
        />
        <EnhancedSummaryCard 
          title="Total Diskon" 
          value={formatRupiah(kpi.totalDiscount)} 
          subtitle="Potongan harga"
          icon={<MdOutlineDiscount />} 
          className="bg-orange-50" 
        />
      </div>

      {/* Insights Section */}
      {!isLoading && insights.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 pb-4">
                <MdInsights className="w-5 h-5 text-cyan-700" />
                Smart Insights
              </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <InsightCard key={idx} {...insight} />
              ))}
            </div>
            </div>
        </div>
      )}

      {/* Charts Section */}
      {!isLoading && (kpi.totalSales > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* [PERBAIKAN SHADOW] shadow-sm */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MdBarChart className="w-5 h-5 text-cyan-700" />
                  Top 5 Produk Paling Profit
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Produk dengan kontribusi profit tertinggi</p>
              </div>
            </div>
            <div className="h-80 relative">
              <TopProductsBarChart reportData={reportData} />
            </div>
          </div>
          
          {/* [PERBAIKAN SHADOW] shadow-sm */}
          <div className="lg:col-span-1 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
             <div className="mb-4">
               <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <MdPieChart className="w-5 h-5 text-cyan-700" />
                 Komposisi Omzet
               </h3>
               <p className="text-sm text-gray-500 mt-0.5">Distribusi omzet Anda</p>
             </div>
             <div className="h-80 relative flex items-center justify-center">
              <ProfitDoughnutChart kpi={kpi} />
            </div>
          </div>
        </div>
      )}

      {/* Detail Table - Collapsible */}
      {/* [PERBAIKAN SHADOW] shadow-sm */}
      {!isLoading && reportData.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <button
            onClick={() => setShowDetailTable(!showDetailTable)}
            className="w-full p-6 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MdStorage className="w-5 h-5 text-cyan-700" />
                Detail Profit per Produk
                <span className="text-sm font-normal text-gray-500">({reportData.length} produk)</span>
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Klik untuk {showDetailTable ? 'sembunyikan' : 'tampilkan'} tabel detail
              </p>
            </div>
            {showDetailTable ? <MdExpandLess className="w-6 h-6 text-gray-400" /> : <MdExpandMore className="w-6 h-6 text-gray-400" />}
          </button>
          
          {showDetailTable && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Produk</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Performa</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Terjual</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Omzet</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">HPP</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Profit</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {reportData.map((item, index) => {
                    const margin = item.sales > 0 ? ((item.profit / item.sales) * 100) : 0;
                    return (
                      <tr key={item.name + index} className="transition-colors hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                                {index + 1}
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <PerformanceBadge margin={margin} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">{item.qty}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">{formatRupiah(item.sales)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-red-600">{formatRupiah(item.cost)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <span className="text-sm font-bold text-green-700">{formatRupiah(item.profit)}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-sm font-semibold ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                              {formatPercent(margin)}
                            </span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${margin >= 30 ? 'bg-green-500' : margin >= 15 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(margin, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && reportData.length === 0 && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <EmptyState />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <LoadingSpinner />
        </div>
      )}

      {/* Modal */}
      <ProfitDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        kpi={kpi}
      />

    </div>
  );
}