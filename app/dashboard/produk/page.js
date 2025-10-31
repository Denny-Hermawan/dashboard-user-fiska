// app/dashboard/produk/page.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, query, orderBy, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import ProductModal from '@/components/ProductModal'; 

// ... (Ikon, helper, dan ProductModal tidak berubah) ...

// --- Kumpulan Ikon ---
const ProductIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const AddIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);
// Ikon untuk modal hapus
const WarningIcon = () => (
  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
// --- Akhir Kumpulan Ikon ---

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

// --- BARU: Komponen Modal Konfirmasi Hapus ---
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, productName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <WarningIcon />
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
  
  // --- BARU: State untuk modal hapus ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // --- BARU: Fungsi untuk Modal Hapus ---
  
  // 1. Panggil ini saat ikon sampah diklik
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // 2. Panggil ini saat modal ditutup (Batal)
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  // 3. Panggil ini saat tombol "Ya, Hapus" diklik
  const handleConfirmDelete = async () => {
    if (!user || !productToDelete) return;
    
    setIsDeleting(true); // Mulai loading hapus
    
    try {
      const productId = productToDelete.id;
      // Hapus dari koleksi utama
      const productRef = doc(db, "users", user.uid, "products", productId);
      await deleteDoc(productRef);
      
      // Hapus dari koleksi costing
      const costRef = doc(db, "users", user.uid, "product_costs", productId);
      await deleteDoc(costRef);
      
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Gagal menghapus produk.");
    } finally {
      setIsDeleting(false); // Selesai loading
      handleCloseDeleteModal(); // Tutup modal
    }
  };
  // --- AKHIR: Fungsi Modal Hapus ---

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Produk</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <AddIcon />
          <span>Tambah Produk</span>
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-6 text-center">Memuat produk...</p>
        ) : mergedProducts.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Belum ada produk. Silakan tambahkan.</p>
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
                {mergedProducts.map((prod) => (
                  <tr key={prod.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                          <ProductIcon />
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
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        // --- PERBARUI: Panggil handleDeleteClick ---
                        onClick={() => handleDeleteClick(prod)}
                        className="ml-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-700"
                        title="Hapus"
                      >
                        <DeleteIcon />
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

      {/* --- BARU: Render Modal Konfirmasi Hapus --- */}
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