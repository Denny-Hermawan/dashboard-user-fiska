// components/ProductOnlineModal.js
"use client";

import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "sonner";
import { MdMonetizationOn, MdList } from 'react-icons/md';

// --- Helper Functions ---

// --- BARU: Fungsi formatRupiah ditambahkan di sini ---
const formatRupiah = (value) => {
  if (value == null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};
// --- AKHIR TAMBAHAN ---

// Helper format (Hanya untuk input/output)
const parseInputNumber = (input) => {
  return parseFloat(input.replace(/[^0-9]/g, '')) || 0;
};
const formatToInput = (value) => {
  return value?.toString() || '';
};

export default function ProductOnlineModal({ isOpen, onClose, product, userId }) {
  // State khusus untuk harga & opsi online
  const [onlinePrice, setOnlinePrice] = useState('');
  const [onlineOpsi, setOnlineOpsi] = useState([]); // Format: [{ nama: string, harga: string, globalHarga: string }]
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useEffect ini mengisi form modal berdasarkan data produk
  useEffect(() => {
    if (product) {
      // 1. Set harga online (fallback ke harga global jika null)
      const basePrice = product.onlinePrice != null ? product.onlinePrice : product.harga;
      setOnlinePrice(formatToInput(basePrice));

      // 2. Siapkan Opsi
      const globalOpsi = product.opsi || [];
      const savedOnlineOpsi = product.onlineOpsi || [];

      // 3. Buat map dari harga online yang tersimpan agar mudah dicari
      const onlinePriceMap = new Map(
        savedOnlineOpsi.map(o => [o.nama, o.harga])
      );

      // 4. Buat state form berdasarkan OPSI GLOBAL
      //    Ini memastikan semua opsi global tampil,
      //    lalu menimpanya dengan harga online jika ada.
      const newOpsiState = globalOpsi.map(globalOp => {
        const globalHarga = globalOp.harga || 0;
        const savedHarga = onlinePriceMap.get(globalOp.nama);

        return {
          nama: globalOp.nama || '', // Nama Opsi (read-only di form)
          harga: formatToInput(savedHarga != null ? savedHarga : globalHarga), // Harga Online (editable)
          globalHarga: formatToInput(globalHarga) // Harga Global (untuk helper)
        };
      });
      
      setOnlineOpsi(newOpsiState);
    }
  }, [product, isOpen]);


  const handleOpsiPriceChange = (index, value) => {
    const newOpsi = [...onlineOpsi];
    newOpsi[index].harga = value;
    setOnlineOpsi(newOpsi);
  };
  
  // Handle Simpan (Hanya update field online)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !userId || !product) return;

    setIsSubmitting(true);

    try {
      // 1. Validasi dan Parse Harga Online
      const finalOnlinePrice = parseInputNumber(onlinePrice);
      if (isNaN(finalOnlinePrice)) {
        throw new Error("Harga Produk Online tidak valid.");
      }

      // 2. Validasi dan Parse Opsi Online
      const finalOnlineOpsi = [];
      for (const op of onlineOpsi) {
        const finalHargaOpsi = parseInputNumber(op.harga);
        if (isNaN(finalHargaOpsi)) {
          throw new Error(`Harga untuk opsi "${op.nama}" tidak valid.`);
        }
        finalOnlineOpsi.push({
          nama: op.nama,
          harga: finalHargaOpsi // Simpan sebagai angka
        });
      }

      // 3. Siapkan data untuk di-update di Firestore
      const productRef = doc(db, "users", userId, "products", product.id);
      const dataToUpdate = {
        onlinePrice: finalOnlinePrice,
        onlineOpsi: finalOnlineOpsi,
        updatedAt: new Date(),
      };

      // 4. Update dokumen
      await updateDoc(productRef, dataToUpdate);
      
      toast.success(`Harga online "${product.name}" berhasil diperbarui.`);
      onClose();

    } catch (err) {
      console.error("Error saving online settings:", err);
      toast.error(err.message || "Gagal menyimpan pengaturan online.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="mb-2 text-lg font-bold text-gray-900">
          Edit Harga Online
        </h3>
        <p className="mb-6 text-sm text-gray-500">
          Untuk: <span className="font-medium text-gray-800">{product.name}</span>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Harga Produk Online */}
          <div>
            <label htmlFor="prod-online-price" className="text-sm font-medium text-gray-700">Harga Produk (Online)</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MdMonetizationOn className="w-5 h-5 text-gray-400" />
              </span>
              <input
                id="prod-online-price" type="number" 
                value={onlinePrice} 
                onChange={(e) => setOnlinePrice(e.target.value)}
                placeholder="Harga jual online"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                disabled={isSubmitting} required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {/* PANGGILAN FUNGSI YANG ERROR ADA DI SINI */}
              Harga Global: {formatRupiah(product.harga)}
            </p>
          </div>
            
          <hr className="my-6" />

          {/* Bagian Opsi Tambahan */}
          {onlineOpsi.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Harga Opsi (Khusus Online)</label>
              <p className="text-xs text-gray-500">Edit harga final jika opsi ini dipilih saat order online.</p>
              
              <div className="mt-3 space-y-3">
                {onlineOpsi.map((op, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {/* Nama Opsi (Read-only) */}
                    <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      {op.nama}
                    </div>
                    {/* Input Harga Online */}
                    <div className="relative w-36">
                       <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-500 text-sm">
                        Rp
                       </span>
                        <input
                          type="number" 
                          value={op.harga} 
                          onChange={(e) => handleOpsiPriceChange(index, e.target.value)}
                          placeholder="Harga Final"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-8 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900"
                          disabled={isSubmitting}
                        />
                         <p className="mt-1 text-xs text-gray-500 text-right">
                           {/* DAN DI SINI */}
                           Global: {formatRupiah(parseInputNumber(op.globalHarga))}
                        </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Tombol Aksi */}
          <div className="mt-6 flex gap-3 pt-4">
            <button
              type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit" disabled={isSubmitting}
              className="flex-1 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 disabled:bg-cyan-300"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Harga Online'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}