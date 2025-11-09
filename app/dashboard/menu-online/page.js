// app/dashboard/menu-online/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import ProductOnlineModal from '@/components/ProductOnlineModal'; // Kita akan buat file ini selanjutnya

// --- Ikon Baru (Material Design) ---
import { MdInventory2, MdEdit, MdSearch, MdClear, MdVisibility, MdVisibilityOff } from 'react-icons/md';
// --- Akhir Ikon ---

// --- Helper Functions (Tidak Berubah) ---
const formatRupiah = (value) => {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// --- Komponen Switch Kustom (Toggle) ---
const AvailabilityToggle = ({ product, userId, onToggle, disabled }) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (disabled || isToggling) return;
    setIsToggling(true);
    
    const newStatus = !product.isAvailableOnline;
    const productRef = doc(db, "users", userId, "products", product.id);

    try {
      await updateDoc(productRef, {
        isAvailableOnline: newStatus
      });
      // Panggil callback onToggle agar state di parent juga update (opsional, tapi baik)
      onToggle(product.id, newStatus); 
      toast.success(`"${product.name}" sekarang ${newStatus ? 'ditampilkan' : 'disembunyikan'} online.`);
    } catch (err) {
      console.error("Error toggling availability:", err);
      toast.error("Gagal mengubah ketersediaan.");
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isToggling}
      className={`
        flex items-center justify-center w-24 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
        ${product.isAvailableOnline 
          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
        ${isToggling ? 'opacity-50 cursor-wait' : ''}
      `}
      title={product.isAvailableOnline ? 'Sembunyikan dari Menu Online' : 'Tampilkan di Menu Online'}
    >
      {isToggling ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
      ) : (
        product.isAvailableOnline ? (
          <>
            <MdVisibility className="w-4 h-4 mr-1.5" />
            Aktif
          </>
        ) : (
          <>
            <MdVisibilityOff className="w-4 h-4 mr-1.5" />
            Nonaktif
          </>
        )
      )}
    </button>
  );
};


// --- Komponen Halaman Utama ---
export default function MenuOnlinePage() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk modal edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // State untuk search
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- PERBAIKAN: State yang hilang ditambahkan di sini ---
  const [isUploading, setIsUploading] = useState(false);
  // --- AKHIR PERBAIKAN ---

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setProducts([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const productsRef = collection(db, "users", user.uid, "products");
    const q = query(productsRef, orderBy("name"));
    
    // Listener ini akan otomatis update UI jika data di Firestore berubah
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const prodsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prodsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast.error("Gagal memuat data produk.");
      setLoading(false);
    });
    return () => unsubscribeDb();
  }, [user]);

  // Fungsi Modal Edit
  const handleOpenModal = (product = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Callback untuk update state lokal setelah toggle (opsional, krn onSnapshot)
  const handleToggleStateUpdate = (productId, newStatus) => {
      setProducts(prevProducts => 
          prevProducts.map(p => 
              p.id === productId ? { ...p, isAvailableOnline: newStatus } : p
          )
      );
  };
  
  // Filter list produk berdasarkan search query (Nama atau Kategori)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Menu Online</h2>
        {/* Tombol Tambah Produk ditiadakan di halaman ini */}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama produk atau kategori..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        />
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MdSearch className="w-5 h-5 text-gray-400" />
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <MdClear className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-6 text-center">Memuat produk...</p>
        ) : products.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Belum ada produk. Silakan tambahkan di "Kelola Produk".</p>
        ) : filteredProducts.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Tidak ada produk yang cocok dengan "{searchQuery}".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Produk</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Kategori</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Harga Global</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Harga Online</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Status Online</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Edit Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredProducts.map((prod) => ( 
                  <tr key={prod.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                          <MdInventory2 className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{prod.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{prod.kategori}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 line-through">{formatRupiah(prod.harga)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-cyan-700">
                      {formatRupiah(prod.onlinePrice ?? prod.harga)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <AvailabilityToggle 
                        product={prod} 
                        userId={user.uid} 
                        onToggle={handleToggleStateUpdate}
                        disabled={isUploading}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(prod)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-cyan-100 hover:text-cyan-800"
                        title="Edit Harga & Opsi Online"
                      >
                        <MdEdit className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
         <ProductOnlineModal
           isOpen={isModalOpen}
           onClose={handleCloseModal}
           product={selectedProduct}
           userId={user?.uid}
         />
      )}
    </div>
  );
}