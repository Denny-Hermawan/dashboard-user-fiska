// app/dashboard/membership/page.js
"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";

// --- Ikon Baru (Material Design) ---
import { MdCardMembership, MdEdit, MdDelete, MdAdd, MdSearch, MdClear, MdStar } from 'react-icons/md';
// --- Akhir Ikon ---

// --- Helper Format Tanggal ---
const formatJoinDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return '-';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

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

// Komponen Halaman Utama
export default function MembershipPage() {
  const [user, setUser] = useState(null);
  const [memberList, setMemberList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setMemberList([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Target koleksi 'members'
    const membersRef = collection(db, "users", user.uid, "members");
    const q = query(membersRef, orderBy("name"));

    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemberList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching members:", error);
      setLoading(false);
    });

    return () => unsubscribeDb();
  }, [user]);

  const handleOpenModal = (member = null) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  const handleDelete = (memberId, memberName) => {
    if (!user || !memberId) return;
    
    toast.confirm(`Yakin ingin menghapus member "${memberName}"?`, {
      description: 'Tindakan ini tidak dapat dibatalkan.',
      onOk: async () => {
        try {
          const memberRef = doc(db, "users", user.uid, "members", memberId);
          await deleteDoc(memberRef);
          toast.success(`Member "${memberName}" berhasil dihapus.`);
        } catch (error) {
          console.error("Error deleting member:", error);
          toast.error("Gagal menghapus member.");
        }
      },
    });
  };
  
  // Filter list member berdasarkan search query (Nama atau Nomor Telepon)
  const filteredMembers = memberList.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phoneNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Membership</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-cyan-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          <MdAdd className="w-5 h-5" />
          <span>Tambah Member</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau nomor telepon..."
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

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-6 text-center">Memuat data member...</p>
        ) : memberList.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Belum ada member. Silakan tambahkan.</p>
        ) : filteredMembers.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Tidak ada member yang cocok dengan "{searchQuery}".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nama Member</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">No. Telepon</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Poin</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Bergabung</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredMembers.map((member) => ( 
                  <tr key={member.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                          <MdCardMembership className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{member.phoneNumber}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-cyan-700">
                      <div className="flex items-center gap-1">
                        <MdStar className="w-4 h-4 text-yellow-500" />
                        {member.points || 0}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatJoinDate(member.joinDate)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(member)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-cyan-100 hover:text-cyan-800"
                        title="Edit"
                      >
                        <MdEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
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

      <MemberModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        member={selectedMember}
        userId={user?.uid}
      />
    </div>
  );
}