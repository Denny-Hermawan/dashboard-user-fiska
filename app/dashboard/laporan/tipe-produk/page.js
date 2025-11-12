// app/dashboard/laporan/tipe-produk/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
// --- [PERBAIKAN] Impor orderBy ---
import { collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // <-- [BARU] Impor toast untuk notifikasi error

import { 
  HiOutlineTag, 
  HiOutlineCalendar, 
  HiOutlineCollection, 
  HiOutlineShoppingCart, 
  HiOutlineCurrencyDollar 
} from 'react-icons/hi';
import {
  MdInbox,
  MdClose,
  MdChevronRight
} from 'react-icons/md';

// Helper Functions
const formatDateToInput = (date) => date.toISOString().split('T')[0];
const getToday = () => new Date();

const getProductTypeName = (typeInt) => {
  switch (typeInt) {
    case 0: return 'Makanan';
    case 1: return 'Minuman';
    case 2: return 'Lainnya';
    default: return 'Tidak Diketahui';
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};


// Komponen Loading Spinner
const LoadingSpinner = ({ message = "Memuat data..." }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"></div>
      <span className="text-sm font-medium text-gray-600">{message}</span>
    </div>
  </div>
);

// Komponen Modal Detail Produk
const ProductDetailModal = ({ isOpen, onClose, typeName, products }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Rincian Produk - {typeName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Daftar produk yang terjual dalam tipe ini</p>
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
          {products.length === 0 ? (
             <p className="p-10 text-center text-sm text-gray-500">Tidak ada rincian produk.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Produk</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Terjual (Qty)</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {products.map((prod, index) => (
                  <tr key={prod.name + index} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{prod.name}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-cyan-700">{prod.qty}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-700">{formatCurrency(prod.sales)}</td>
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


export default function LaporanTipeProduk() {
  const router = useRouter(); 
  const [user, setUser] = useState(null); 
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [tipeProdukSales, setTipeProdukSales] = useState([]);
  const [totalPenjualan, setTotalPenjualan] = useState(0);
  const [totalKuantitas, setTotalKuantitas] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]); 
  const [selectedTypeName, setSelectedTypeName] = useState('');
  
  // Logika Autentikasi
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

  // Set tanggal default di sisi klien
  useEffect(() => {
    const today = formatDateToInput(getToday());
    setStartDate(today);
    setEndDate(today);
  }, []);

  // fetchData dipindahkan ke atas
  const fetchData = useCallback(async () => {
    if (!user || !startDate || !endDate) return;
    setLoading(true);

    try {
      const productsRef = collection(db, 'users', user.uid, 'products');
      const productsSnap = await getDocs(productsRef);
      const productMap = {};
      productsSnap.forEach(doc => {
        productMap[doc.id] = doc.data();
      });

      const dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);

      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      
      // --- [PERBAIKAN] Query ini disamakan dengan Laporan Produk/Kategori ---
      const q = query(transactionsRef, 
        where('tanggal', '>=', Timestamp.fromDate(dateStart)),
        where('tanggal', '<=', Timestamp.fromDate(dateEnd)),
        where('isRefunded', '==', false),
        orderBy('tanggal', 'desc') // <-- DITAMBAHKAN AGAR SAMA
      );
      // --- [AKHIR PERBAIKAN] ---
      
      const querySnapshot = await getDocs(q);
      const salesData = {};
      let totalSales = 0;
      let totalQty = 0;

      querySnapshot.forEach(doc => {
        const transaction = doc.data();
        transaction.items.forEach(item => {
          if (!item.isComplimentary) { 
            const product = productMap[item.produkIdString];
            
            const productTypeInt = product ? product.productType : -1; 
            const tipeProduk = getProductTypeName(productTypeInt);

            const itemSubtotal = (item.produkHarga ?? 0) * item.jumlah;

            if (!salesData[tipeProduk]) {
              salesData[tipeProduk] = { 
                total: 0, 
                quantity: 0,
                products: new Map() 
              };
            }
            salesData[tipeProduk].total += itemSubtotal;
            salesData[tipeProduk].quantity += item.jumlah;

            const productName = item.baseProdukNama || item.produkNama || 'Produk Dihapus';
            const productSummary = salesData[tipeProduk].products.get(item.produkIdString) || {
              name: productName,
              qty: 0,
              sales: 0,
            };
            productSummary.qty += item.jumlah;
            productSummary.sales += itemSubtotal;
            salesData[tipeProduk].products.set(item.produkIdString, productSummary);
          }
        });
      });

      const sortedTipeProduk = Object.entries(salesData).map(([name, data]) => ({
        name,
        ...data,
      }));

      sortedTipeProduk.sort((a, b) => b.total - a.total);
      
      setTipeProdukSales(sortedTipeProduk);

      setTotalPenjualan(sortedTipeProduk.reduce((acc, curr) => acc + curr.total, 0));
      setTotalKuantitas(sortedTipeProduk.reduce((acc, curr) => acc + curr.quantity, 0));

    } catch (error)
    {
      console.error("Error fetching report data: ", error);
      toast.error("Gagal memuat data. (Error: " + error.code + ")", {
        description: "Query ini mungkin memerlukan indeks. Cek console (F12) untuk link pembuatan indeks."
      });
    } 
    finally {
      setLoading(false);
    }
  }, [user, startDate, endDate]); 

  useEffect(() => {
    if (user && startDate) {
      fetchData();
    }
  }, [user, fetchData, startDate, endDate]);

  const handleTypeClick = (typeData) => {
    const productsArray = Array.from(typeData.products.values())
                              .sort((a, b) => b.sales - a.sales); 
    
    setModalData(productsArray);
    setSelectedTypeName(typeData.name);
    setIsModalOpen(true);
  };
  
  const handleFilterApply = (e) => {
    e.preventDefault();
    fetchData();
  };

  if (!startDate || !endDate) {
    return <LoadingSpinner message="Menyiapkan halaman..." />;
  }

  return (
    <div className="space-y-6">

      {/* Filter Tanggal */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 mb-6">

        <div className="border-b border-gray-100 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan per Tipe Produk</h1>
        </div>

        <form onSubmit={handleFilterApply} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          {/* Tanggal Mulai */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Dari Tanggal</label>
            <input
              type="date" id="startDate" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
            />
          </div>
          {/* Tanggal Akhir */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Sampai Tanggal</label>
            <input
              type="date" id="endDate" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
            />
          </div>
          {/* Tombol Terapkan */}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Memuat...' : 'Terapkan Filter'}
          </button>
        </form>
      </div>


      {/* Ringkasan Total */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-100 flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl text-green-700 mr-4">
            <HiOutlineCurrencyDollar />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Penjualan</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPenjualan)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-100 flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-700 mr-4">
            <HiOutlineShoppingCart />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Kuantitas Terjual</p>
            <p className="text-2xl font-bold text-gray-800">{totalKuantitas} pcs</p>
          </div>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Tipe Produk
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Kuantitas Terjual
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Total Penjualan
                  </th>
                  <th scope="col" className="relative px-6 py-3.5">
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {tipeProdukSales.length > 0 ? (
                  tipeProdukSales.map((item, index) => (
                    <tr 
                      key={index} 
                      onClick={() => handleTypeClick(item)} 
                      className="hover:bg-gray-50 cursor-pointer" 
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-700">{item.quantity} pcs</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-700">{formatCurrency(item.total)}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-gray-400">
                        <MdChevronRight className="w-5 h-5" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      Tidak ada data penjualan untuk rentang tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Render Modal */}
      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        typeName={selectedTypeName}
        products={modalData}
      />
    </div>
  );
}