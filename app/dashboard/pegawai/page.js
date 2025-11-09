// app/dashboard/pegawai/page.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";

// --- Ikon Baru (Material Design) ---
import { MdPeople, MdEdit, MdDelete, MdAdd, MdSearch, MdClear } from 'react-icons/md';
// --- Akhir Ikon ---

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
      // Cek duplikasi (mirip kategori, tapi cek di koleksi 'cashiers')
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

// Komponen Halaman Utama
export default function PegawaiPage() {
  const [user, setUser] = useState(null);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  
  // --- BARU: State untuk search ---
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setPegawaiList([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Target koleksi 'cashiers'
    const cashiersRef = collection(db, "users", user.uid, "cashiers");
    const q = query(cashiersRef, orderBy("name"));

    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPegawaiList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pegawai:", error);
      setLoading(false);
    });

    return () => unsubscribeDb();
  }, [user]);

  const handleOpenModal = (pegawai = null) => {
    setSelectedPegawai(pegawai);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPegawai(null);
  };

  const handleDelete = (pegawaiId, pegawaiName) => {
    if (!user || !pegawaiId) return;
    
    // Konfirmasi Hapus (logika sama seperti kategori)
    toast.confirm(`Yakin ingin menghapus pegawai "${pegawaiName}"?`, {
      description: 'Tindakan ini tidak dapat dibatalkan.',
      onOk: async () => {
        try {
          const pegawaiRef = doc(db, "users", user.uid, "cashiers", pegawaiId);
          await deleteDoc(pegawaiRef);
          toast.success(`Pegawai "${pegawaiName}" berhasil dihapus.`);
        } catch (error) {
          console.error("Error deleting pegawai:", error);
          toast.error("Gagal menghapus pegawai.");
        }
      },
    });
  };
  
  // --- BARU: Filter list pegawai berdasarkan search query ---
  const filteredPegawai = pegawaiList.filter(pegawai =>
    pegawai.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Pegawai</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-cyan-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          <MdAdd className="w-5 h-5" />
          <span>Tambah Pegawai</span>
        </button>
      </div>

      {/* --- BARU: Search Bar --- */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama pegawai..."
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
          <p className="p-6 text-center">Memuat data pegawai...</p>
        ) : pegawaiList.length === 0 ? ( // Cek list total
          <p className="p-6 text-center text-gray-500">Belum ada pegawai. Silakan tambahkan.</p>
        ) : filteredPegawai.length === 0 ? ( // Cek hasil filter
          <p className="p-6 text-center text-gray-500">Tidak ada pegawai yang cocok dengan "{searchQuery}".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Pegawai</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredPegawai.map((pegawai) => ( // Gunakan list terfilter
                  <tr key={pegawai.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                          <MdPeople className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{pegawai.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(pegawai)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-cyan-100 hover:text-cyan-800"
                        title="Edit"
                      >
                        <MdEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pegawai.id, pegawai.name)}
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

      <PegawaiModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        pegawai={selectedPegawai}
        userId={user?.uid}
      />
    </div>
  );
}