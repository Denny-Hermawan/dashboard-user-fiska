// app/dashboard/pengaturan/page.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebaseConfig"; // Pastikan storage di-ekspor
import Image from 'next/image';
import ReceiptTemplateEditor from '@/components/ReceiptTemplateEditor'; // <-- Impor komponen baru

// --- Ikon ---
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
);
const StoreIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
);
const AddressIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const PhoneIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);
const ReceiptIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
// --- Akhir Ikon ---


// --- JSON Template Struk Default (dari settings_service.dart) ---
const _defaultReceiptTemplateJson = `
{
  "kasir": {
    "header": [{"type": "logo", "align": "center", "style": "normal", "enabled": true}],
    "item_header": [{"type": "row", "cols": ["Item","Qty","Total"], "enabled": true}],
    "item_body": {"layout": [{"type": "row", "cols": ["{{item_name_line1}}", "{{item_quantity}}", "{{item_subtotal_formatted}}"], "enabled": true}]},
    "summary": [{"type": "summary_line", "label": "TOTAL", "value": "{{total_formatted}}", "style": "large_bold", "enabled": true}],
    "footer": [{"type": "text", "value": "Terima Kasih!", "align": "center", "style": "normal", "enabled": true}]
  },
  "dapur": {
    "header": [{"type": "text", "value": "PESANAN DAPUR", "align": "center", "style": "large_bold", "enabled": true}],
    "item_body": {"layout": [{"type": "data", "value": "{{item_quantity}}x {{item_name}}", "style": "large_bold", "enabled": true}]},
    "footer": [{"type": "cut", "enabled": true}]
  },
   "bar": {
     "header": [{"type": "text", "value": "PESANAN BAR", "align": "center", "style": "large_bold", "enabled": true}],
     "item_body": {"layout": [{"type": "data", "value": "{{item_quantity}}x {{item_name}}", "style": "large_bold", "enabled": true}]},
     "footer": [{"type": "cut", "enabled": true}]
  }
}
`;
// --- Akhir JSON Default ---


export default function PengaturanPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' atau 'template'

  // State untuk Tab Info Toko
  const [settings, setSettings] = useState({
    storeName: '',
    storeAddress: '',
    storePhone: '',
    logoUrl: '',
    receiptLogoWidth: 384,
  });
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // State untuk Tab Template Struk
  const [receiptTemplate, setReceiptTemplate] = useState(null); // Akan diisi object JSON

  // State UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // 1. Cek Autentikasi Pengguna
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setIsLoading(false);
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Ambil SEMUA Data Pengaturan dari Firestore
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const settingsRef = doc(db, "users", user.uid, "settings", "config");

    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Set state untuk Info Toko
        setSettings({
          storeName: data.storeName || '',
          storeAddress: data.storeAddress || '',
          storePhone: data.storePhone || '',
          logoUrl: data.logoUrl || '',
          receiptLogoWidth: data.receiptLogoWidth || 384,
        });
        setPreviewUrl(data.logoUrl || '');

        // Set state untuk Template Struk (parse JSON)
        try {
          const parsedTemplate = JSON.parse(data.receiptTemplateJson || _defaultReceiptTemplateJson);
          setReceiptTemplate(parsedTemplate);
        } catch (e) {
          console.error("Gagal parse template JSON, gunakan default:", e);
          setReceiptTemplate(JSON.parse(_defaultReceiptTemplateJson));
        }

      } else {
        // Dokumen belum ada, set semua default
        setSettings({
          storeName: 'Nama Toko Anda',
          storeAddress: 'Alamat Toko',
          storePhone: '',
          logoUrl: '',
          receiptLogoWidth: 384,
        });
        setPreviewUrl('');
        setReceiptTemplate(JSON.parse(_defaultReceiptTemplateJson));
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching settings:", err);
      setError("Gagal memuat pengaturan.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle perubahan input form Info Toko
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  // Handle pemilihan file logo
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Callback untuk update state template dari child component
  const handleTemplateChange = useCallback((newTemplate) => {
    setReceiptTemplate(newTemplate);
  }, []);

  // --- 3. Logika Simpan SEMUA Pengaturan ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!user || isSaving || isUploading) return;

    setIsSaving(true);
    setError(null);
    
    let finalLogoUrl = settings.logoUrl;

    try {
      // --- Langkah 3a: Upload Logo Baru (jika ada) ---
      if (newLogoFile) {
        setIsUploading(true);
        const fileExtension = newLogoFile.name.split('.').pop();
        const storagePath = `users/${user.uid}/store_logo/logo.${fileExtension}`;
        const logoStorageRef = ref(storage, storagePath);

        await uploadBytes(logoStorageRef, newLogoFile);
        finalLogoUrl = await getDownloadURL(logoStorageRef);
        
        setIsUploading(false);
        setNewLogoFile(null);
      }

      // --- Langkah 3b: Siapkan SEMUA data untuk disimpan ---
      const settingsRef = doc(db, "users", user.uid, "settings", "config");
      
      // Ubah template object kembali menjadi string JSON
      const finalTemplateJson = JSON.stringify(receiptTemplate, null, 2); // 'null, 2' untuk pretty-print

      const settingsToSave = {
        // Data dari Tab Info Toko
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        receiptLogoWidth: Number(settings.receiptLogoWidth) || 384,
        logoUrl: finalLogoUrl,
        // Data dari Tab Template Struk
        receiptTemplateJson: finalTemplateJson,
      };

      // Gunakan setDoc (bukan updateDoc) untuk membuat/menimpa
      await setDoc(settingsRef, settingsToSave, { merge: true });
      
      alert("Pengaturan berhasil disimpan!");

    } catch (err) {
      console.error("Error saving settings:", err);
      setError(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };
  
  // Tampilkan loading jika data belum siap
  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  // --- Komponen Tab Info Toko (dipisah agar rapi) ---
  const renderInfoTokoTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Kolom Kiri: Form Informasi */}
      <div className="lg:col-span-2 rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100 space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Informasi Toko</h2>
        
        {/* Nama Toko */}
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">Nama Toko</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><StoreIcon /></span>
            <input
              type="text" id="storeName" name="storeName"
              value={settings.storeName} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            />
          </div>
        </div>

        {/* Alamat Toko */}
        <div>
          <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700">Alamat Toko</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 top-0 flex items-center pl-3 pt-3"><AddressIcon /></span>
            <textarea
              id="storeAddress" name="storeAddress"
              value={settings.storeAddress} onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* Telepon Toko */}
        <div>
          <label htmlFor="storePhone" className="block text-sm font-medium text-gray-700">Telepon Toko</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><PhoneIcon /></span>
            <input
              type="tel" id="storePhone" name="storePhone"
              value={settings.storePhone} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Upload Logo */}
      <div className="lg:col-span-1 rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Logo Toko</h2>
        <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
          {previewUrl ? (
            <Image
              src={previewUrl} alt="Preview Logo"
              width={192} height={192}
              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
            />
          ) : (
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              <p className="text-xs mt-1">Tidak ada logo</p>
            </div>
          )}
        </div>
        <div>
          <label
            htmlFor="logoUpload"
            className={`cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${isUploading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} transition-colors`}
          >
            {isUploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : ( <UploadIcon /> )}
            {isUploading ? 'Mengunggah...' : (settings.logoUrl ? 'Ganti Logo' : 'Upload Logo')}
          </label>
          <input 
            id="logoUpload" name="logoUpload" type="file" className="sr-only" 
            accept="image/png, image/jpeg"
            onChange={handleLogoFileChange}
            disabled={isUploading || isSaving}
          />
        </div>
        <p className="text-xs text-gray-500 text-center">Gunakan format .PNG atau .JPG.</p>
        
        <hr className="my-2 border-gray-100" />

        {/* Lebar Logo Struk */}
        <div>
          <label htmlFor="receiptLogoWidth" className="block text-sm font-medium text-gray-700">Lebar Logo Struk (px)</label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><ReceiptIcon /></span>
            <input
              type="number" id="receiptLogoWidth" name="receiptLogoWidth"
              value={settings.receiptLogoWidth} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Default: **384** (kertas 58mm). Coba **576** (kertas 80mm).
          </p>
        </div>
      </div>
    </div>
  );

  // --- Komponen Tab Template Struk ---
  const renderTemplateStrukTab = () => (
    <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100">
      {receiptTemplate ? (
        <ReceiptTemplateEditor
          template={receiptTemplate}
          onChange={handleTemplateChange}
        />
      ) : (
        <p>Memuat editor template...</p>
      )}
    </div>
  );


  // --- Render Utama Halaman (dengan Tab) ---
  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
      
      {/* Navigasi Tab */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'info'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Info Toko & Logo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'template'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Template Struk
          </button>
        </nav>
      </div>

      {/* Konten Tab */}
      <div>
        {activeTab === 'info' ? renderInfoTokoTab() : renderTemplateStrukTab()}
      </div>

      {/* Tombol Simpan Global */}
      <div className="lg:col-span-3 pt-4 border-t border-gray-100">
        {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSaving || isUploading}
          className="w-full md:w-auto rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {(isSaving || isUploading) ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
        </button>
      </div>
      
    </form>
  );
}