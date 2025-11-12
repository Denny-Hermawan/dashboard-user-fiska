// app/dashboard/produk/page.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, query, orderBy, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import ProductModal from '@/components/ProductModal'; 
// --- BARU: Impor toast ---
import { toast } from "sonner";

// --- PERUBAHAN: Ikon menggunakan Material Design ---
import {
  MdInventory2,
  MdEdit,
  MdDelete,
  MdAdd,
  MdWarning,
  MdSearch,
  MdClear
} from 'react-icons/md';
// --- AKHIR PERUBAHAN IKON ---


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

const getProductTypeDisplayName = (typeIndex) => {
  switch (typeIndex) {
    case 0: return 'Makanan';
    case 1: return 'Minuman';
    case 2: return 'Lainnya';
    default: return 'Lainnya';
  }
};
// --- Akhir Helper Functions ---

// --- Komponen Modal Konfirmasi Hapus (Ikon diperbarui) ---
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, productName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            {/* --- PERUBAHAN IKON --- */}
            <MdWarning className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Hapus Produk</h3>
            <p className="mb-6 text-sm text-gray-600">
              Yakin ingin menghapus produk **"{productName}"**? Tindakan ini juga akan menghapus data costing-nya dan tidak dapat dibatalkan.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-red-300"
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- AKHIR: Komponen Modal Konfirmasi Hapus ---


export default function ProdukPage() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [productCosts, setProductCosts] = useState({});
  const [mergedProducts, setMergedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk modal edit/tambah
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // State untuk modal hapus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- BARU: State untuk search ---
  const [searchQuery, setSearchQuery] = useState('');

  // ... (useEffect untuk Auth, Products, dan Costs tidak berubah) ...
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setProducts([]);
        setProductCosts({});
        setMergedProducts([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const productsRef = collection(db, "users", user.uid, "products");
    const q = query(productsRef, orderBy("name"));
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const prodsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prodsData);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });
    return () => unsubscribeDb();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const costsRef = collection(db, "users", user.uid, "product_costs");
    const unsubscribeCosts = onSnapshot(costsRef, (snapshot) => {
      const costsData = {};
      snapshot.docs.forEach(doc => {
        costsData[doc.id] = doc.data().costing;
      });
      setProductCosts(costsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching product costs:", error);
      setLoading(false);
    });
    return () => unsubscribeCosts();
  }, [user]);

  useEffect(() => {
    const merged = products.map(prod => ({
      ...prod,
      costing: productCosts[prod.id] || 0
    }));
    setMergedProducts(merged);
  }, [products, productCosts]);

  // --- Fungsi Modal Edit/Tambah (Tidak Berubah) ---
  const handleOpenModal = (product = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // --- Fungsi untuk Modal Hapus (Tidak Berubah) ---
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };
  const handleConfirmDelete = async () => {
    if (!user || !productToDelete) return;
    setIsDeleting(true); 
    try {
      const productId = productToDelete.id;
      const productRef = doc(db, "users", user.uid, "products", productId);
      await deleteDoc(productRef);
      const costRef = doc(db, "users", user.uid, "product_costs", productId);
      await deleteDoc(costRef);
      // --- BARU: Gunakan toast notifikasi ---
      toast.success(`Produk "${productToDelete.name}" berhasil dihapus.`);
    } catch (error) {
      console.error("Error deleting product:", error);
      // --- BARU: Gunakan toast notifikasi ---
      toast.error("Gagal menghapus produk.");
    } finally {
      setIsDeleting(false); 
      handleCloseDeleteModal(); 
    }
  };
  // --- AKHIR: Fungsi Modal Hapus ---

  // --- BARU: Filter list produk berdasarkan search query (Nama atau Kategori) ---
  const filteredProducts = mergedProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Produk</h2>
        <button
          onClick={() => handleOpenModal()}
          // --- PERUBAHAN TEMA: dari indigo ke cyan ---
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-cyan-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          {/* --- PERUBAHAN IKON --- */}
          <MdAdd className="w-5 h-5" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {/* --- BARU: Search Bar --- */}
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
      {/* --- AKHIR SEARCH BAR --- */}


      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-6 text-center">Memuat produk...</p>
        ) : mergedProducts.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Belum ada produk. Silakan tambahkan.</p>
        // --- BARU: Kondisi jika search tidak ditemukan ---
        ) : filteredProducts.length === 0 ? (
           <p className="p-6 text-center text-gray-500">Tidak ada produk yang cocok dengan "{searchQuery}".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Produk</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Kategori</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Harga Pokok</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Harga Jual</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipe</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {/* --- PERUBAHAN: Iterasi menggunakan filteredProducts --- */}
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* --- PERUBAHAN TEMA: dari indigo ke cyan --- */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                          {/* --- PERUBAHAN IKON --- */}
                          <MdInventory2 className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{prod.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{prod.kategori}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-red-700">{formatRupiah(prod.costing)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-700">{formatRupiah(prod.harga)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{getProductTypeDisplayName(prod.productType)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(prod)}
                        // --- PERUBAHAN TEMA: dari indigo ke cyan ---
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-cyan-100 hover:text-cyan-800"
                        title="Edit"
                      >
                        {/* --- PERUBAHAN IKON --- */}
                        <MdEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(prod)}
                        className="ml-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-700"
                        title="Hapus"
                      >
                        {/* --- PERUBAHAN IKON --- */}
                        <MdDelete className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Produk (Tidak berubah) */}
      {isModalOpen && (
         <ProductModal
           isOpen={isModalOpen}
           onClose={handleCloseModal}
           product={selectedProduct}
           userId={user?.uid}
         />
      )}

      {/* Render Modal Konfirmasi Hapus (Tidak berubah) */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        productName={productToDelete?.name || ''}
        isDeleting={isDeleting}
      />

    </div>
  );
}