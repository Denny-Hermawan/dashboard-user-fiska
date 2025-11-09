// components/ProductModal.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
// --- BARU: Impor toast ---
import { toast } from "sonner";

// --- Ikon Baru (Material Design) ---
import { MdDelete, MdAdd } from 'react-icons/md';
// --- Akhir Ikon ---

const productTypes = [
  { name: 'Makanan', value: 0 },
  { name: 'Minuman', value: 1 },
  { name: 'Lainnya', value: 2 },
];

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
  // const [error, setError] = useState(null); // Diganti toast
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
      toast.error("Gagal memuat kategori."); // Diganti toast
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
    // setError(null); // Tidak perlu
  }, [product, isOpen, categories]);

  // ... (Handler Opsi tidak berubah) ...
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
      toast.error("Nama, Harga Jual, dan Kategori wajib diisi."); 
      return;
    }
    const finalCosting = parseFloat(costing) || 0;
    if (isNaN(finalCosting) || finalCosting < 0) {
      toast.error("Harga Pokok (Costing) harus angka yang valid."); 
      return;
    }
    let finalOpsi = [];
    for (const op of opsi) {
      const namaOpsi = op.nama.trim();
      const hargaOpsi = parseFloat(op.harga);
      if (!namaOpsi || isNaN(hargaOpsi)) {
        toast.error(`Opsi "${namaOpsi || '?'}" memiliki data tidak valid.`);
        return;
      }
      finalOpsi.push({ nama: namaOpsi, harga: hargaOpsi });
    }
    setIsSubmitting(true);
    // setError(null); // Tidak perlu
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
      
      toast.success(product ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil disimpan!');
      onClose(); // Tutup modal setelah sukses

    } catch (err) {
      console.error("Error saving product:", err);
      toast.error(err.message || "Gagal menyimpan. Periksa kembali data Anda."); 
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="prod-harga" className="text-sm font-medium text-gray-700">Harga Jual</label>
                <input
                  id="prod-harga" type="number" value={harga} onChange={(e) => setHarga(e.target.value)}
                  placeholder="Contoh: 15000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
                  disabled={isSubmitting} required
                />
              </div>
            </div>
            
            {/* Kategori */}
            <div>
              <label htmlFor="prod-kategori" className="text-sm font-medium text-gray-700">Kategori</label>
              <select
                id="prod-kategori" value={kategori} onChange={(e) => setKategori(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
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
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
                      disabled={isSubmitting}
                    />
                    <input
                      type="number" value={op.harga} onChange={(e) => handleOpsiChange(index, 'harga', e.target.value)}
                      placeholder="Harga Final"
                      className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900" // <-- PERBAIKAN
                      disabled={isSubmitting}
                    />
                    <button
                      type="button" onClick={() => handleRemoveOpsi(index)} disabled={isSubmitting}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100" title="Hapus Opsi"
                    >
                      <MdDelete className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button" onClick={handleAddOpsi} disabled={isSubmitting}
                className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
              >
                <MdAdd className="w-5 h-5" />
                <span>Tambah Opsi</span>
              </button>
            </div>

            {/* {error && <p className="mt-4 text-sm text-red-600">{error}</p>} // Diganti toast */}
            
            {/* Tombol Aksi (Tema diperbarui) */}
            <div className="mt-6 flex gap-3 pt-4">
              <button
                type="button" onClick={onClose} disabled={isSubmitting}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit" disabled={isSubmitting || loadingCategories}
                className="flex-1 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 disabled:bg-cyan-300"
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