// app/register/page.js

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; // <-- BARU
import { auth, db } from "@/lib/firebaseConfig"; // <-- Import db
import { 
  HiOutlineUser, 
  HiOutlineMail, 
  HiOutlineLockClosed, 
  HiOutlineEye, 
  HiOutlineEyeOff, 
  HiOutlineOfficeBuilding, 
  HiOutlineLocationMarker, 
  HiOutlinePhone 
} from 'react-icons/hi';


// Template Struk Default (Disalin dari register_page.dart)
const _defaultReceiptTemplateJson = 
`{
  "kasir": {
    "header": [
      { "type": "logo", "align": "center", "style": "normal", "enabled": true },
      {"type": "data", "value": "{{store_name}}", "align": "center", "style": "bold", "enabled": true},
      {"type": "data", "value": "{{store_address}}", "align": "center", "style": "normal", "enabled": true},
      {"type": "data", "value": "{{store_phone}}", "align": "center", "style": "normal", "enabled": true},
      {"type": "horizontal_line", "char": "-", "enabled": true},
      {"type": "data", "value": "ID: {{transaction_id_short}} | Kasir: {{cashier_name}}", "align": "left", "style": "normal", "enabled": true},
      {"type": "data", "value": "Plgn: {{customer_name}}", "align": "left", "style": "normal", "enabled": true},
      {"type": "data", "value": "Tipe: {{order_type_display}}", "align": "left", "style": "normal", "enabled": true},
      {"type": "data", "value": "Waktu: {{transaction_time}}", "align": "left", "style": "normal", "enabled": true},
      {"type": "horizontal_line", "char": "-", "enabled": true}
    ],
    "item_header": [
       {"type": "row", "cols": ["Item","Qty","Total"], "widths": [7,1,4], "aligns": ["left", "center", "right"], "styles": ["bold", "bold", "bold"], "enabled": true },
       {"type": "horizontal_line", "char": ".", "enabled": true}
    ],
    "item_body": {
       "layout": [
         {"type": "row", "cols": ["{{item_name_line1}}", "{{item_quantity}}", "{{item_subtotal_formatted}}"], "widths": [7,1,4], "aligns": ["left", "center", "right"], "styles": ["normal", "normal", "normal"], "enabled": true},
         {"loop_variable": "item_name_other_lines", "element": {"type": "data", "value": "{{line}}", "align": "left", "style": "normal", "enabled": true}},
         {"condition": "{{has_note}}", "element": {"type": "data", "value": "  Note: {{item_note_short}}", "align": "left", "style": "normal", "enabled": true}}
       ],
       "complimentary_layout":[
         {"type": "row", "cols": ["{{item_name_line1}}", "{{item_quantity}}", "GRATIS"], "widths": [7,1,4], "aligns": ["left", "center", "right"], "styles": ["normal", "normal", "normal"], "enabled": true},
         {"loop_variable": "item_name_other_lines", "element": {"type": "data", "value": "{{line}}", "align": "left", "style": "normal", "enabled": true}},
         {"condition": "{{has_note}}", "element": {"type": "data", "value": "  Note: {{item_note_short}}", "align": "left", "style": "normal", "enabled": true}},
         {"type": "data", "value": "(GRATIS)", "align": "right", "style": "normal", "enabled": true}
       ]
    },
    "summary": [
      {"type": "horizontal_line", "char": "-", "enabled": true},
      {"type": "summary_line", "label": "Subtotal", "value": "{{gross_subtotal_formatted}}", "enabled": true},
      {"condition": "{{has_discount}}", "element": {"type": "summary_line", "label": "Diskon", "value": "-{{discount_formatted}}", "enabled": true}},
      {"condition": "{{has_compliment}}", "element": {"type": "summary_line", "label": "Compliment", "value": "-{{complimentary_value_formatted}}", "enabled": true}},
      {"type": "horizontal_line", "char": "=", "enabled": true},
      {"type": "summary_line", "label": "TOTAL", "value": "{{total_formatted}}", "style": "large_bold", "enabled": true},
      {"type": "horizontal_line", "char": "=", "enabled": true},
      {"type": "summary_line", "label": "Metode Bayar", "value": "{{payment_method}}", "enabled": true},
      {"condition": "{{is_cash_payment}}", "elements": [
        {"type": "summary_line", "label": "Dibayar (Tunai)", "value": "{{cash_received_formatted}}", "enabled": true},
        {"type": "summary_line", "label": "Kembali", "value": "{{change_formatted}}", "enabled": true}
      ]},
       {"condition": "{{is_not_cash_payment}}", "elements": [
         {"type": "summary_line", "label": "Dibayar", "value": "{{total_formatted}}", "enabled": true}
      ]},
      {"type": "horizontal_line", "char": "-", "enabled": true}
    ],
    "footer": [
      {"type": "text", "value": "Terima Kasih!", "align": "center", "style": "normal", "enabled": true},
      {"type": "text", "value": "Barang yang dibeli tidak dapat", "align": "center", "style": "normal", "enabled": true},
      {"type": "text", "value": "dikembalikan/ditukar.", "align": "center", "style": "normal", "enabled": true},
      {"type": "empty_line", "count": 2, "enabled": true},
      {"type": "cut", "enabled": true}
    ]
  },
  "dapur": {
     "header": [
        {"type": "text", "value": "PESANAN DAPUR", "align": "center", "style": "large_bold", "enabled": true},
        {"type": "horizontal_line", "char": "-", "enabled": true},
        {"type": "data", "value": "ID: {{transaction_id_short}}", "align": "left", "style": "large_bold", "enabled": true},
        {"type": "data", "value": "Pelanggan: {{customer_name}}", "align": "left", "style": "large_bold", "enabled": true},
        {"type": "data", "value": "Tipe: {{order_type_display}}", "align": "left", "style": "bold", "enabled": true},
        {"type": "data", "value": "Waktu: {{transaction_time_short}}", "align": "left", "style": "normal", "enabled": true},
        {"type": "data", "value": "Kasir: {{cashier_name}}", "align": "left", "style": "normal", "enabled": true},
        {"condition": "{{is_online_order}}", "element": {"type": "data", "value": "Platform: {{online_platform}}", "align": "left", "style": "bold", "enabled": true}},
        {"type": "horizontal_line", "char": "-", "enabled": true}
     ],
     "item_body": {
        "layout": [
          {"type": "data", "value": "{{item_quantity}}x {{item_name}}", "align": "left", "style": "large_bold", "enabled": true},
          {"condition": "{{has_note}}", "element": {"type": "data", "value": "  Note: {{item_note}}", "align": "left", "style": "bold", "enabled": true}},
          {"type": "horizontal_line", "char": ".", "enabled": true}
        ]
     },
     "footer": [
        {"type": "empty_line", "count": 2, "enabled": true},
        {"type": "cut", "enabled": true}
     ]
  },
   "bar": {
     "header": [
        {"type": "text", "value": "PESANAN BAR", "align": "center", "style": "large_bold", "enabled": true},
        {"type": "horizontal_line", "char": "-", "enabled": true},
        {"type": "data", "value": "ID: {{transaction_id_short}}", "align": "left", "style": "large_bold", "enabled": true},
        {"type": "data", "value": "Pelanggan: {{customer_name}}", "align": "left", "style": "large_bold", "enabled": true},
        {"type": "data", "value": "Tipe: {{order_type_display}}", "align": "left", "style": "bold", "enabled": true},
        {"type": "data", "value": "Waktu: {{transaction_time_short}}", "align": "left", "style": "normal", "enabled": true},
        {"type": "data", "value": "Kasir: {{cashier_name}}", "align": "left", "style": "normal", "enabled": true},
        {"condition": "{{is_online_order}}", "element": {"type": "data", "value": "Platform: {{online_platform}}", "align": "left", "style": "bold", "enabled": true}},
        {"type": "horizontal_line", "char": "-", "enabled": true}
     ],
     "item_body": {
        "layout": [
          {"type": "data", "value": "{{item_quantity}}x {{item_name}}", "align": "left", "style": "large_bold", "enabled": true},
          {"condition": "{{has_note}}", "element": {"type": "data", "value": "  Note: {{item_note}}", "align": "left", "style": "bold", "enabled": true}},
          {"type": "horizontal_line", "char": ".", "enabled": true}
        ]
     },
     "footer": [
        {"type": "empty_line", "count": 2, "enabled": true},
        {"type": "cut", "enabled": true}
     ]
  }
}`;

function RegisterPage() {
  const router = useRouter();

  // State Form
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPasswordObscured, setIsPasswordObscured] = useState(true);
  const [isConfirmPasswordObscured, setIsConfirmPasswordObscured] = useState(true);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    // Validasi
    if (!storeName || !storeAddress || !storePhone || !email || !password || !confirmPassword) {
      setError('Semua field wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Buat user di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        // 2. Kirim email verifikasi
        await sendEmailVerification(user);

        // 3. Simpan data toko awal ke Firestore
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
        await setDoc(settingsRef, {
          storeName: storeName.trim(),
          storeAddress: storeAddress.trim(),
          storePhone: storePhone.trim(),
          logoUrl: null,
          receiptLogoWidth: 384, // Default
          displaySize: 'medium', // Default
          receiptTemplateJson: _defaultReceiptTemplateJson,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });

        // 4. Logout paksa pengguna (agar wajib verifikasi)
        await signOut(auth);

        // 5. Arahkan kembali ke login dengan pesan sukses
        router.push('/login?status=registered');
      }
    } catch (error) {
      console.error("Error registrasi:", error.code);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email ini sudah terdaftar. Silakan gunakan email lain.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password terlalu lemah.');
      } else {
        setError('Gagal mendaftar. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (id, label, type, value, onChange, icon, placeholder) => (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </span>
        <input
          type={type}
          id={id}
          name={id}
          disabled={isLoading}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 text-black placeholder-gray-500"
        />
      </div>
    </div>
  );

  const renderPasswordInput = (id, label, value, onChange, isObscured, toggleObscured) => (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <HiOutlineLockClosed className="h-5 w-5 text-gray-400" />
        </span>
        <input
          type={isObscured ? 'password' : 'text'}
          id={id}
          name={id}
          disabled={isLoading}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 text-black placeholder-gray-500"
        />
        <button
          type="button"
          onClick={toggleObscured}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
        >
          {isObscured ? (
            <HiOutlineEyeOff className="h-5 w-5" />
          ) : (
            <HiOutlineEye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-100 via-white to-cyan-100 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg md:p-10">
        
        {/* Header */}
        <div className="mb-6 flex justify-center">
           <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 shadow-md">
             <Image
                src="/assets/images/logo.png"
                alt="Logo FISKA POS"
                width={40}
                height={40}
             />
           </div>
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800 md:text-3xl">
          Daftar Akun Baru
        </h1>
        <p className="mb-8 text-center text-sm text-gray-600 md:text-base">
          Buat akun FISKA POS Anda
        </p>

        {/* Notifikasi Error */}
        {error && (
          <p className="mb-4 rounded-md bg-red-100 p-3 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Form Registrasi */}
        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Informasi Toko */}
          <h2 className="text-lg font-semibold text-cyan-700">Informasi Toko</h2>
          <div className="grid grid-cols-1 gap-4">
            {renderInput('storeName', 'Nama Toko / Usaha', 'text', storeName, (e) => setStoreName(e.target.value), <HiOutlineOfficeBuilding className="h-5 w-5 text-gray-400" />, 'Contoh: Kedai Kopi Senja')}
            {renderInput('storeAddress', 'Alamat Toko', 'text', storeAddress, (e) => setStoreAddress(e.target.value), <HiOutlineLocationMarker className="h-5 w-5 text-gray-400" />, 'Contoh: Jl. Merdeka No. 10')}
            {renderInput('storePhone', 'Nomor Telepon Toko', 'tel', storePhone, (e) => setStorePhone(e.target.value), <HiOutlinePhone className="h-5 w-5 text-gray-400" />, 'Contoh: 08123456789')}
          </div>

          <hr className="my-6" />

          {/* Informasi Akun */}
          <h2 className="text-lg font-semibold text-cyan-700">Informasi Akun</h2>
          <div className="grid grid-cols-1 gap-4">
            {renderInput('email', 'Email', 'email', email, (e) => setEmail(e.target.value), <HiOutlineMail className="h-5 w-5 text-gray-400" />, 'anda@email.com')}
            {renderPasswordInput('password', 'Password', password, (e) => setPassword(e.target.value), isPasswordObscured, () => setIsPasswordObscured(!isPasswordObscured))}
            {renderPasswordInput('confirmPassword', 'Konfirmasi Password', confirmPassword, (e) => setConfirmPassword(e.target.value), isConfirmPasswordObscured, () => setIsConfirmPasswordObscured(!isConfirmPasswordObscured))}
          </div>

          <div className="pt-4">
            {/* Tombol Daftar */}
            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors duration-200 ease-in-out hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                isLoading ? 'cursor-wait' : ''
              }`}
            >
              {isLoading ? (
                <svg className="mr-2 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </div>
        </form>

        {/* Link kembali ke Login */}
        <p className="mt-8 text-center text-sm text-gray-600">
          Sudah punya akun?{' '}
          <Link href="/login">
            <span className={`font-medium text-cyan-600 hover:text-cyan-700 ${isLoading ? 'pointer-events-none opacity-60' : ''}`}>
              Login di sini
            </span>
          </Link>
        </p>

      </div>
    </div>
  );
}

export default RegisterPage;