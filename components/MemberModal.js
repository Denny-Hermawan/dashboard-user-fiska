// components/MemberModal.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "sonner";

// Komponen Modal Pegawai (Form)
const MemberModal = ({ isOpen, onClose, member, userId }) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhoneNumber(member.phoneNumber);
    } else {
      setName('');
      setPhoneNumber('');
    }
  }, [member, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !name.trim() || !phoneNumber.trim() || !userId) {
      toast.error("Nama dan Nomor Telepon wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    const membersRef = collection(db, "users", userId, "members");
    const newNameTrimmed = name.trim();
    const newPhoneTrimmed = phoneNumber.trim();
    const newNameLowercase = newNameTrimmed.toLowerCase();
    
    try {
      // Cek duplikasi Nomor Telepon
      const q = query(membersRef, where("phoneNumber", "==", newPhoneTrimmed));
      const querySnapshot = await getDocs(q);
      
      let isDuplicate = false;
      if (!querySnapshot.empty) {
        if (member) { // Mode Edit
          isDuplicate = querySnapshot.docs.some(doc => doc.id !== member.id);
        } else { // Mode Tambah
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        toast.error(`Nomor Telepon "${newPhoneTrimmed}" sudah terdaftar.`);
        setIsSubmitting(false);
        return;
      }

      const memberData = { 
        name: newNameTrimmed,
        phoneNumber: newPhoneTrimmed,
        name_lowercase: newNameLowercase, // Untuk search
      };

      if (member) {
        // Update
        const memberRef = doc(db, "users", userId, "members", member.id);
        await updateDoc(memberRef, memberData);
        toast.success("Member berhasil diperbarui.");
      } else {
        // Add
        await addDoc(membersRef, { 
          ...memberData, 
          points: 0,
          joinDate: Timestamp.now(), // Set tanggal bergabung
          createdAt: Timestamp.now() 
        });
        toast.success(`Member "${newNameTrimmed}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      console.error("Error saving member:", err);
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
          {member ? 'Edit Member' : 'Tambah Member Baru'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-gray-700">Nama Member</label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Lengkap"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900"
              disabled={isSubmitting}
              required
            />
          </div>
           <div>
            <label htmlFor="member-phone" className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
            <input
              id="member-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Contoh: 0812xxxx"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 text-gray-900"
              disabled={isSubmitting}
              required
            />
          </div>
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

export default MemberModal;