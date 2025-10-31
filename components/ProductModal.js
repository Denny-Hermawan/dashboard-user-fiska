// components/ProductModal.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";

// ... (Definisi ikon tidak berubah) ...
const productTypes = [
  { name: 'Makanan', value: 0 },
  { name: 'Minuman', value: 1 },
  { name: 'Lainnya', value: 2 },
];
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

export default function ProductModal({ isOpen, onClose, product, userId }) {
  // ... (State tidak berubah) ...
  const [name, setName] = useState('');
  const [harga, setHarga] = useState('');
  const [costing, setCosting] = useState('0');
  const [kategori, setKategori] = useState('');
  const [points, setPoints] = useState('0');
  const [productType, setProductType] = useState(0); 
  const [opsi, setOpsi] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // ... (useEffect untuk kategori dan mengisi form tidak berubah) ...
  useEffect(() => {
    if (!userId) return;
    setLoadingCategories(true);
    const categoriesRef = collection(db, "users", userId, "categories");
    const q = query(categoriesRef, orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const catsData = snapshot.docs.map(doc => doc.data().name);
      setCategories(catsData);
      if (catsData.length > 0 && !product) {
        setKategori(catsData[0]);
      }
      setLoadingCategories(false);
    }, (err) => {
      console.error("Error fetching categories for modal:", err);
      setError("Gagal memuat kategori.");
      setLoadingCategories(false);
    });
    return () => unsubscribe();
  }, [userId, product]);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setHarga(product.harga?.toString() || '');
      setCosting(product.costing?.toString() || '0');
      setKategori(product.kategori || '');
      setPoints(product.points?.toString() || '0');
      setProductType(product.productType != null ? product.productType : 0);
      setOpsi(product.opsi ? product.opsi.map(o => ({ nama: o.nama || '', harga: o.harga?.toString() || '' })) : []);
    } else {
      setName('');
      setHarga('');
      setCosting('0');
      setPoints('0');
      setProductType(0);
      setOpsi([]);
      if (categories.length > 0) {
        setKategori(categories[0]);
      }
    }
    setError(null);
  }, [product, isOpen, categories]);

  // ... (Handler Opsi dan Submit tidak berubah) ...
  const handleAddOpsi = () => setOpsi([...opsi, { nama: '', harga: '' }]);
  const handleRemoveOpsi = (index) => {
    const newOpsi = [...opsi];
    newOpsi.splice(index, 1);
    setOpsi(newOpsi);
  };
  const handleOpsiChange = (index, field, value) => {
    const newOpsi = [...opsi];
    newOpsi[index][field] = value;
    setOpsi(newOpsi);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !name.trim() || !harga.trim() || !kategori || !userId) {
      setError("Nama, Harga Jual, dan Kategori wajib diisi.");
      return;
    }
    const finalCosting = parseFloat(costing) || 0;
    if (isNaN(finalCosting) || finalCosting < 0) {
      setError("Harga Pokok (Costing) harus angka yang valid.");
      return;
    }
    let finalOpsi = [];
    for (const op of opsi) {
      const namaOpsi = op.nama.trim();
      const hargaOpsi = parseFloat(op.harga);
      if (!namaOpsi || isNaN(hargaOpsi)) {
        setError(`Opsi "${namaOpsi || '?'}" memiliki data tidak valid.`);
        return;
      }
      finalOpsi.push({ nama: namaOpsi, harga: hargaOpsi });
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const productsRef = collection(db, "users", userId, "products");
      const productData = {
        name: name.trim(),
        harga: parseFloat(harga),
        kategori: kategori,
        points: parseInt(points, 10) || 0,
        productType: productType,
        opsi: finalOpsi,
        name_lowercase: name.trim().toLowerCase(),
        updatedAt: new Date(),
        isAvailableOnline: product?.isAvailableOnline ?? true,
        onlinePrice: product?.onlinePrice ?? null,
        onlineOpsi: product?.onlineOpsi ?? null,
      };
      let productId = product ? product.id : null;
      if (product) {
        const productRef = doc(db, "users", userId, "products", product.id);
        await updateDoc(productRef, productData);
      } else {
        const docRef = await addDoc(productsRef, { ...productData, createdAt: new Date() });
        productId = docRef.id;
      }
      if (productId) {
        const costRef = doc(db, "users", userId, "product_costs", productId);
        await setDoc(costRef, { costing: finalCosting }, { merge: true });
      } else {
        throw new Error("Gagal mendapatkan ID produk untuk menyimpan costing.");
      }
      onClose();
    } catch (err) {
      console.error("Error saving product:", err);
      setError("Gagal menyimpan. Periksa kembali data Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="mb-6 text-lg font-bold text-gray-900">
          {product ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h3>
        
        {loadingCategories ? (
          <p>Memuat kategori...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama Produk */}
            <div>
              <label htmlFor="prod-name" className="text-sm font-medium text-gray-700">Nama Produk</label>
              <input
                id="prod-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                disabled={isSubmitting} required
              />
            </div>

            {/* Harga & Kategori (Tambahkan Costing) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prod-costing" className="text-sm font-medium text-gray-700">Harga Pokok (Costing)</label>
                <input
                  id="prod-costing" type="number" value={costing} onChange={(e) => setCosting(e.target.value)}
                  placeholder="Contoh: 8000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="prod-harga" className="text-sm font-medium text-gray-700">Harga Jual</label>
                <input
                  id="prod-harga" type="number" value={harga} onChange={(e) => setHarga(e.target.value)}
                  placeholder="Contoh: 15000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                  disabled={isSubmitting} required
                />
              </div>
            </div>
            
            {/* Kategori */}
            <div>
              <label htmlFor="prod-kategori" className="text-sm font-medium text-gray-700">Kategori</label>
              <select
                id="prod-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                disabled={isSubmitting || categories.length === 0} required
              >
                {categories.length === 0 ? (
                  <option value="">Buat kategori dulu</option>
                ) : (
                  categories.map(catName => (
                    <option key={catName} value={catName}>{catName}</option>
                  ))
                )}
              </select>
            </div>

            {/* Tipe Produk & Poin */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               <div>
                <label htmlFor="prod-type" className="text-sm font-medium text-gray-700">Tipe Produk</label>
                <select
                  id="prod-type" value={productType} onChange={(e) => setProductType(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                  disabled={isSubmitting} required
                >
                  {productTypes.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="prod-points" className="text-sm font-medium text-gray-700">Poin (Opsional)</label>
                <input
                  id="prod-points" type="number" value={points} onChange={(e) => setPoints(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <hr className="my-6" />

            {/* Bagian Opsi Tambahan */}
            <div>
              <label className="text-sm font-medium text-gray-700">Opsi Tambahan (Opsional)</label>
              <p className="text-xs text-gray-500">Misal: Hot/Ice, Large/Small. Harga di sini adalah harga final jika opsi dipilih.</p>
              
              <div className="mt-3 space-y-3">
                {opsi.map((op, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text" value={op.nama} onChange={(e) => handleOpsiChange(index, 'nama', e.target.value)}
                      placeholder="Nama Opsi"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                      disabled={isSubmitting}
                    />
                    <input
                      type="number" value={op.harga} onChange={(e) => handleOpsiChange(index, 'harga', e.target.value)}
                      placeholder="Harga Final"
                      className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900" // <-- DITAMBAHKAN
                      disabled={isSubmitting}
                    />
                    <button
                      type="button" onClick={() => handleRemoveOpsi(index)} disabled={isSubmitting}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100" title="Hapus Opsi"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button" onClick={handleAddOpsi} disabled={isSubmitting}
                className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-indigo-400 px-4 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                <AddIcon />
                <span>Tambah Opsi</span>
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            
            {/* Tombol Aksi (Tidak berubah) */}
            <div className="mt-6 flex gap-3 pt-4">
              <button
                type="button" onClick={onClose} disabled={isSubmitting}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit" disabled={isSubmitting || loadingCategories}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}