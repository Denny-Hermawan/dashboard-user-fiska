// app/api/chat/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

// Inisialisasi model Gemini dengan API key dari file .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
 try {
    // [PERBAIKAN] Gunakan model 'gemini-pro' yang standar
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 1. Ambil "prompt" (pertanyaan user) dari request body
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 2. Kirim prompt ke Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. Kembalikan jawaban dari Gemini ke client
    return NextResponse.json({ text: text });

  } catch (error) {
    
    // [PERUBAHAN 2] Kita buat log error di server lebih jelas
    console.error("--- ERROR DI /api/chat/route.js ---");
    console.error(error); // Ini akan menampilkan error detail di terminal
    console.error("-----------------------------------");
    
    // [PERUBAHAN 3] Kirim pesan error yang lebih spesifik ke chatbox
    let errorMessage = "Gagal memproses permintaan AI.";
    
    // Cek apakah errornya terkait API Key atau API yang tidak aktif
    if (error.message && error.message.includes('API key not valid')) {
       errorMessage = "Kunci API (API Key) Anda tidak valid. Mohon periksa kembali file .env.local.";
    } else if (error.message && (error.message.includes('permission denied') || error.message.includes('API not enabled'))) {
       errorMessage = "API tidak diaktifkan. Pastikan 'Generative Language API' sudah di-enable di Google Cloud Console dan billing mungkin diperlukan.";
    } else if (error.message && error.message.includes('location')) {
       errorMessage = "Maaf, layanan AI tidak tersedia di lokasi Anda saat ini.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}