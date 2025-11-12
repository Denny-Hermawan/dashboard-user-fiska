// app/dashboard/laporan/tipe-produk/page.js

"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebaseConfig'; // Asumsi Anda punya useAuth hook
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { HiOutlineTag, HiOutlineCalendar, HiOutlineCollection, HiOutlineShoppingCart, HiOutlineCurrencyDollar } from 'react-icons/hi';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

// Helper untuk mengubah angka (0, 1, 2) menjadi nama tipe produk
// Sesuai dengan enum ProductType di Flutter
const getProductTypeName = (typeInt) => {
  switch (typeInt) {
    case 0: return 'Makanan';
    case 1: return 'Minuman';
    case 2: return 'Lainnya';
    default: return 'Tidak Diketahui';
  }
};

export default function LaporanTipeProduk() {
  const user = useAuth(); // Hook untuk mendapatkan user
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [tipeProdukSales, setTipeProdukSales] = useState([]);
  const [totalPenjualan, setTotalPenjualan] = useState(0);
  const [totalKuantitas, setTotalKuantitas] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, startDate, endDate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Ambil semua produk untuk mapping ID ke Tipe Produk
      const productsRef = collection(db, 'users', user.uid, 'products');
      const productsSnap = await getDocs(productsRef);
      const productMap = {};
      productsSnap.forEach(doc => {
        productMap[doc.id] = doc.data();
      });

      // 2. Ambil transaksi dalam rentang tanggal
      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const q = query(transactionsRef, 
        where('tanggal', '>=', startOfDay(startDate)),
        where('tanggal', '<=', endOfDay(endDate)),
        where('isRefunded', '==', false) // Hanya ambil yang tidak di-refund
      );
      
      const querySnapshot = await getDocs(q);
      const salesData = {};
      let totalSales = 0;
      let totalQty = 0;

      // 3. Proses transaksi
      querySnapshot.forEach(doc => {
        const transaction = doc.data();
        transaction.items.forEach(item => {
          if (!item.isComplimentary) { // Hanya hitung item yang tidak komplimen
            const product = productMap[item.produkIdString];
            
            // Ambil tipe produk (int) dari data produk
            const productTypeInt = product ? product.productType : -1; 
            // Konversi int ke nama (Makanan, Minuman, Lainnya)
            const tipeProduk = getProductTypeName(productTypeInt);

            const itemSubtotal = (item.produkHarga ?? 0) * item.jumlah;

            if (!salesData[tipeProduk]) {
              salesData[tipeProduk] = { total: 0, quantity: 0 };
            }
            salesData[tipeProduk].total += itemSubtotal;
            salesData[tipeProduk].quantity += item.jumlah;
          }
        });
      });

      // 4. Ubah format data untuk tabel
      const sortedTipeProduk = Object.entries(salesData).map(([name, data]) => ({
        name,
        ...data,
      }));

      // Urutkan berdasarkan total penjualan (terbanyak ke terkecil)
      sortedTipeProduk.sort((a, b) => b.total - a.total);
      
      setTipeProdukSales(sortedTipeProduk);

      // Hitung total keseluruhan
      setTotalPenjualan(sortedTipeProduk.reduce((acc, curr) => acc + curr.total, 0));
      setTotalKuantitas(sortedTipeProduk.reduce((acc, curr) => acc + curr.quantity, 0));

    } catch (error) {
      console.error("Error fetching report data: ", error);
    } finally {
      setLoading(false);
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center">
        <HiOutlineTag className="mr-3 text-cyan-600" />
        Laporan per Tipe Produk
      </h1>

      {/* Filter Tanggal */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow flex flex-col md:flex-row gap-4 items-center">
        <HiOutlineCalendar className="text-gray-600 h-6 w-6" />
        <div className="flex-grow">
          <label className="text-sm font-medium text-gray-700 mr-2">Dari:</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            dateFormat="dd/MM/yyyy"
            className="w-full md:w-auto p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div className="flex-grow">
          <label className="text-sm font-medium text-gray-700 mr-2">Sampai:</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(endOfDay(date))}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            dateFormat="dd/MM/yyyy"
            className="w-full md:w-auto p-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* Ringkasan Total */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow flex items-center">
          <HiOutlineCurrencyDollar className="h-8 w-8 text-green-500 mr-4" />
          <div>
            <p className="text-sm text-gray-600">Total Penjualan</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPenjualan)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-center">
          <HiOutlineShoppingCart className="h-8 w-8 text-blue-500 mr-4" />
          <div>
            <p className="text-sm text-gray-600">Total Kuantitas Terjual</p>
            <p className="text-2xl font-bold text-gray-800">{totalKuantitas} pcs</p>
          </div>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe Produk
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kuantitas Terjual
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Penjualan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tipeProdukSales.length > 0 ? (
                  tipeProdukSales.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{item.quantity} pcs</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{formatCurrency(item.total)}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                      Tidak ada data penjualan untuk rentang tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}