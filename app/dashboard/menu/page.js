// app/dashboard/menu/page.js
"use client"; 

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import CategoryModal from '@/components/CategoryModal'; // <-- IMPORT BARU

// --- Ikon Baru (Material Design) ---
import { MdCategory, MdEdit, MdDelete, MdAdd } from 'react-icons/md';
// --- Akhir Ikon ---

// --- KODE CategoryModal DARI SINI ... ---
// ...
// ... (HAPUS SEMUA KODE CategoryModal YANG ADA DI SINI)
// ...
// --- ... SAMPAI SINI DIHAPUS ---

// Komponen Halaman Utama
export default function MenuPage() {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setCategories([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const categoriesRef = collection(db, "users", user.uid, "categories");
    const q = query(categoriesRef, orderBy("name"));

    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const catsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(catsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      setLoading(false);
    });

    return () => unsubscribeDb();
  }, [user]);

  const handleOpenModal = (category = null) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleDelete = async (categoryId, categoryName) => {
    if (!user || !categoryId) return;
    
    // Cek apakah kategori dipakai
    try {
      const productsRef = collection(db, "users", user.uid, "products");
      const q = query(productsRef, where("kategori", "==", categoryName), orderBy("name"), limit(1));
      const productSnapshot = await getDocs(q);

      if (!productSnapshot.empty) {
        toast.error(`Gagal menghapus: Kategori "${categoryName}" masih digunakan oleh produk "${productSnapshot.docs[0].data().name}".`);
        return;
      }
      
      toast.confirm(`Yakin ingin menghapus kategori "${categoryName}"?`, {
        description: 'Tindakan ini tidak dapat dibatalkan.',
        onOk: async () => {
          try {
            const categoryRef = doc(db, "users", user.uid, "categories", categoryId);
            await deleteDoc(categoryRef);
            toast.success(`Kategori "${categoryName}" berhasil dihapus.`);
          } catch (error) {
            console.error("Error deleting category:", error);
            toast.error("Gagal menghapus kategori.");
          }
        },
      });
      
    } catch (error) {
      console.error("Error checking product usage:", error);
      toast.error("Gagal memeriksa penggunaan kategori.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Kategori</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-cyan-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          <MdAdd className="w-5 h-5" />
          <span>Tambah Kategori</span>
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-6 text-center">Memuat kategori...</p>
        ) : categories.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Belum ada kategori. Silakan tambahkan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Kategori</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {categories.map((cat) => (
                  <tr key={cat.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                          <MdCategory className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(cat)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-cyan-100 hover:text-cyan-800"
                        title="Edit"
                      >
                        <MdEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="ml-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-700"
                        title="Hapus"
                      >
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

      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        category={selectedCategory}
        userId={user?.uid}
      />
    </div>
  );
}