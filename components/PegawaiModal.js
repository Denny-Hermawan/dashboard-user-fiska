// components/PegawaiModal.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "sonner";

// Komponen Modal Pegawai (Form)
const PegawaiModal = ({ isOpen, onClose, pegawai, userId }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pegawai) {
      setName(pegawai.name);
    } else {
      setName('');
    }
  }, [pegawai, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !name.trim() || !userId) return;

    setIsSubmitting(true);

    // Koleksi diubah ke 'cashiers'
    const cashiersRef = collection(db, "users", userId, "cashiers");
    const newNameTrimmed = name.trim();
    const newNameLowercase = newNameTrimmed.toLowerCase();
    
    try {
      // Cek duplikasi
      const q = query(cashiersRef, where("name_lowercase", "==", newNameLowercase));
      const querySnapshot = await getDocs(q);
      
      let isDuplicate = false;
      if (!querySnapshot.empty) {
        if (pegawai) { // Mode Edit
          isDuplicate = querySnapshot.docs.some(doc => doc.id !== pegawai.id);
        } else { // Mode Tambah
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        toast.error(`Pegawai "${newNameTrimmed}" sudah ada.`);
        setIsSubmitting(false);
        return;
      }

      // Simpan nama (dan name_lowercase untuk search/cek duplikat)
      const pegawaiData = { 
        name: newNameTrimmed,
        name_lowercase: newNameLowercase
      };

      if (pegawai) {
        // Update
        const pegawaiRef = doc(db, "users", userId, "cashiers", pegawai.id);
        await updateDoc(pegawaiRef, pegawaiData);
        toast.success("Pegawai berhasil diperbarui.");
      } else {
        // Add
        await addDoc(cashiersRef, { ...pegawaiData, createdAt: new Date() });
        toast.success(`Pegawai "${newNameTrimmed}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      console.error("Error saving pegawai:", err);
      toast.error(err.message || "Gagal menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          {pegawai ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Pegawai"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900"
            disabled={isSubmitting}
            required
          />
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 disabled:bg-cyan-300"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PegawaiModal;