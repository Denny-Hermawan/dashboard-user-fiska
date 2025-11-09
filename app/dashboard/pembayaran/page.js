// app/dashboard/pembayaran/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { toast } from "sonner";
import Image from 'next/image';

// --- Ikon Baru (Material Design) ---
import { MdQrCode2, MdAccountBalance, MdEdit, MdDelete, MdAdd, MdCloudUpload, MdImageNotSupported } from 'react-icons/md';
// --- Akhir Ikon ---


// --- Komponen Modal Bank ---
const BankModal = ({ isOpen, onClose, bankAccount, userId }) => {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bankAccount) {
      setBankName(bankAccount.bankName);
      setAccountNumber(bankAccount.accountNumber);
      setAccountHolderName(bankAccount.accountHolderName);
    } else {
      setBankName('');
      setAccountNumber('');
      setAccountHolderName('');
    }
  }, [bankAccount, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !bankName.trim() || !accountNumber.trim() || !accountHolderName.trim() || !userId) {
        toast.error("Semua field wajib diisi.");
        return;
    }
    setIsSubmitting(true);

    const bankAccountsRef = collection(db, "users", userId, "bankAccounts");
    const bankData = {
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolderName: accountHolderName.trim(),
    };

    try {
      if (bankAccount) {
        // Update
        const bankRef = doc(db, "users", userId, "bankAccounts", bankAccount.id);
        await updateDoc(bankRef, bankData);
        toast.success("Rekening bank berhasil diperbarui.");
      } else {
        // Add
        await addDoc(bankAccountsRef, { ...bankData, createdAt: new Date() });
        toast.success("Rekening bank berhasil ditambahkan.");
      }
      onClose();
    } catch (err) {
      console.error("Error saving bank account:", err);
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
          {bankAccount ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Nama Bank (cth: BCA)</label>
            <input
              id="bankName" type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900"
              disabled={isSubmitting} required
            />
          </div>
           <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">Nomor Rekening</label>
            <input
              id="accountNumber" type="number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900"
              disabled={isSubmitting} required
            />
          </div>
           <div>
            <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700">Atas Nama (Pemilik Rek)</label>
            <input
              id="accountHolderName" type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900"
              disabled={isSubmitting} required
            />
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 disabled:bg-cyan-300">
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Komponen Halaman Utama ---
export default function PembayaranPage() {
  const [user, setUser] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [qrisPath, setQrisPath] = useState(null); // Ini akan berisi URL dari Storage
  const [loading, setLoading] = useState(true);
  
  // State Modal Bank
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);

  // State Upload QRIS
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [newQrisFile, setNewQrisFile] = useState(null);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setBankAccounts([]);
        setQrisPath(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Listener untuk Bank Accounts
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const bankAccountsRef = collection(db, "users", user.uid, "bankAccounts");
    const q = query(bankAccountsRef, orderBy("bankName"));

    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBankAccounts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bank accounts:", error);
      setLoading(false);
    });
    return () => unsubscribeDb();
  }, [user]);

  // Listener untuk QRIS (dari settings/config)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const settingsRef = doc(db, "users", user.uid, "settings", "config");
    
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().qrisImageUrl) {
        setQrisPath(docSnap.data().qrisImageUrl);
        setPreviewUrl(docSnap.data().qrisImageUrl); // Set preview ke gambar yg ada
      } else {
        setQrisPath(null);
        setPreviewUrl(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching QRIS path:", error);
      setLoading(false);
    });
    return () => unsubscribeSettings();
  }, [user]);


  const handleOpenBankModal = (bank = null) => {
    setSelectedBankAccount(bank);
    setIsBankModalOpen(true);
  };

  const handleCloseBankModal = () => {
    setIsBankModalOpen(false);
    setSelectedBankAccount(null);
  };

  const handleDeleteBank = (bankId, bankName) => {
    if (!user || !bankId) return;
    toast.confirm(`Yakin ingin menghapus rekening "${bankName}"?`, {
      description: 'Tindakan ini tidak dapat dibatalkan.',
      onOk: async () => {
        try {
          const bankRef = doc(db, "users", user.uid, "bankAccounts", bankId);
          await deleteDoc(bankRef);
          toast.success(`Rekening "${bankName}" berhasil dihapus.`);
        } catch (error) {
          console.error("Error deleting bank account:", error);
          toast.error("Gagal menghapus rekening.");
        }
      },
    });
  };

  // Handle pemilihan file QRIS
  const handleQrisFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewQrisFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Handle Upload dan Simpan QRIS
  const handleSaveQris = async () => {
    if (!user || !newQrisFile) {
        toast.info("Pilih file gambar QRIS terlebih dahulu.");
        return;
    }
    setIsUploading(true);
    
    try {
        const fileExtension = newQrisFile.name.split('.').pop();
        const storagePath = `users/${user.uid}/store_qris/qris.${fileExtension}`;
        const qrisStorageRef = ref(storage, storagePath);

        // 1. Upload file baru
        await uploadBytes(qrisStorageRef, newQrisFile);
        const downloadUrl = await getDownloadURL(qrisStorageRef);

        // 2. Simpan URL ke document settings/config
        const settingsRef = doc(db, "users", user.uid, "settings", "config");
        await setDoc(settingsRef, { qrisImageUrl: downloadUrl }, { merge: true });

        setQrisPath(downloadUrl);
        setNewQrisFile(null);
        toast.success("Gambar QRIS berhasil diunggah dan disimpan!");

    } catch (err) {
        console.error("Error uploading QRIS:", err);
        toast.error("Gagal mengunggah QRIS.");
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Bagian Kelola QRIS */}
      <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Kelola QRIS (Statis)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1">
             <p className="text-sm text-gray-600 mb-4">
              Unggah gambar QRIS statis Anda di sini. Gambar ini akan ditampilkan di kasir saat pelanggan memilih metode QRIS.
            </p>
            <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
              {previewUrl ? (
                <Image
                  src={previewUrl} alt="Preview QRIS"
                  width={192} height={192}
                  style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <MdImageNotSupported className="mx-auto h-12 w-12" />
                  <p className="text-xs mt-1">Belum ada QRIS</p>
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
             <label
                htmlFor="qrisUpload"
                className={`cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${isUploading ? 'bg-gray-400 text-white' : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'} transition-colors`}
              >
                <MdCloudUpload className="w-5 h-5" />
                {isUploading ? 'Mengunggah...' : (qrisPath ? 'Ganti Gambar QRIS' : 'Pilih Gambar QRIS')}
              </label>
              <input 
                id="qrisUpload" name="qrisUpload" type="file" className="sr-only" 
                accept="image/png, image/jpeg"
                onChange={handleQrisFileChange}
                disabled={isUploading}
              />
              {newQrisFile && (
                <button
                    onClick={handleSaveQris}
                    disabled={isUploading}
                    className="mt-4 w-full rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-cyan-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                >
                    {isUploading ? 'Menyimpan...' : 'Simpan QRIS Baru'}
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Bagian Kelola Rekening Bank */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-3xl font-bold text-gray-900">Kelola Rekening Bank</h2>
          <button
            onClick={() => handleOpenBankModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-cyan-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            <MdAdd className="w-5 h-5" />
            <span>Tambah Rekening</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          {loading ? (
            <p className="p-6 text-center">Memuat data rekening...</p>
          ) : bankAccounts.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Belum ada rekening bank. Silakan tambahkan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Bank</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nomor Rekening</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Atas Nama</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {bankAccounts.map((bank) => (
                    <tr key={bank.id} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                            <MdAccountBalance className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{bank.bankName}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{bank.accountNumber}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{bank.accountHolderName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenBankModal(bank)}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-cyan-100 hover:text-cyan-800"
                          title="Edit"
                        >
                          <MdEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBank(bank.id, bank.bankName)}
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
      </div>

      <BankModal
        isOpen={isBankModalOpen}
        onClose={handleCloseBankModal}
        bankAccount={selectedBankAccount}
        userId={user?.uid}
      />
    </div>
  );
}