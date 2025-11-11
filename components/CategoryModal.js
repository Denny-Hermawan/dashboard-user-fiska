// components/CategoryModal.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "sonner";

// Komponen Modal Kategori (Form)
const CategoryModal = ({ isOpen, onClose, category, userId }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
    } else {
      setName('');
    }
  }, [category, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !name.trim() || !userId) return;

    setIsSubmitting(true);

    const categoriesRef = collection(db, "users", userId, "categories");
    const newNameTrimmed = name.trim();
    const newNameLowercase = newNameTrimmed.toLowerCase();
    
    try {
      // Cek duplikasi
      const q = query(categoriesRef, where("name_lowercase", "==", newNameLowercase));
      const querySnapshot = await getDocs(q);
      
      let isDuplicate = false;
      if (!querySnapshot.empty) {
        if (category) { // Mode Edit
          isDuplicate = querySnapshot.docs.some(doc => doc.id !== category.id);
        } else { // Mode Tambah
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        toast.error(`Kategori "${newNameTrimmed}" sudah ada.`);
        setIsSubmitting(false); 
        return; 
      }

      const categoryData = { 
        name: newNameTrimmed,
        name_lowercase: newNameLowercase
      };

      if (category) {
        // Update
        const categoryRef = doc(db, "users", userId, "categories", category.id);
        await updateDoc(categoryRef, categoryData);
        toast.success("Kategori berhasil diperbarui.");
      } else {
        // Add
        await addDoc(categoriesRef, { ...categoryData, createdAt: new Date() });
        toast.success(`Kategori "${newNameTrimmed}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      console.error("Error saving category:", err);
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
          {category ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Kategori"
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

export default CategoryModal;