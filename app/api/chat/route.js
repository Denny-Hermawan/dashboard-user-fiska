// app/api/chat/route.js
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const serviceAccount = require('../../../serviceAccountKey.json');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Inisialisasi Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin SDK Terinisialisasi.");
  } catch (error) {
    console.error("❌ Gagal inisialisasi Firebase Admin:", error.message);
  }
}
const dbAdmin = admin.firestore();

// ---------------------------------
// [FUNGSI BARU] Deteksi Rentang Waktu dari Pertanyaan
// ---------------------------------
function detectTimeRange(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const today = new Date();
  
  // Helper untuk set waktu
  const setStartOfDay = (date) => {
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const setEndOfDay = (date) => {
    date.setHours(23, 59, 59, 999);
    return date;
  };
  
  // PATTERN: "dari [tanggal] sampai [tanggal/sekarang]"
  // Contoh: "dari 1 november sampai sekarang", "dari kemarin sampai hari ini"
  if (lowerPrompt.includes('dari') && (lowerPrompt.includes('sampai') || lowerPrompt.includes('hingga'))) {
    // Akan dihandle oleh logika di bawah
  }
  
  // HARI INI
  if (lowerPrompt.includes('hari ini') || lowerPrompt.includes('today')) {
    return {
      start: setStartOfDay(new Date(today)),
      end: setEndOfDay(new Date(today)),
      label: 'hari ini'
    };
  }
  
  // KEMARIN
  if (lowerPrompt.includes('kemarin') || lowerPrompt.includes('yesterday')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: setStartOfDay(yesterday),
      end: setEndOfDay(yesterday),
      label: 'kemarin'
    };
  }
  
  // MINGGU INI
  if (lowerPrompt.includes('minggu ini') || lowerPrompt.includes('this week')) {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Minggu = hari ke-0
    return {
      start: setStartOfDay(startOfWeek),
      end: setEndOfDay(new Date(today)),
      label: 'minggu ini'
    };
  }
  
  // BULAN INI
  if (lowerPrompt.includes('bulan ini') || lowerPrompt.includes('this month')) {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: setStartOfDay(startOfMonth),
      end: setEndOfDay(new Date(today)),
      label: 'bulan ini'
    };
  }
  
  // 7 HARI TERAKHIR
  if (lowerPrompt.includes('7 hari') || lowerPrompt.includes('seminggu terakhir')) {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    return {
      start: setStartOfDay(sevenDaysAgo),
      end: setEndOfDay(new Date(today)),
      label: '7 hari terakhir'
    };
  }
  
  // 30 HARI TERAKHIR
  if (lowerPrompt.includes('30 hari') || lowerPrompt.includes('sebulan terakhir')) {
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      start: setStartOfDay(thirtyDaysAgo),
      end: setEndOfDay(new Date(today)),
      label: '30 hari terakhir'
    };
  }
  
  // TANGGAL SPESIFIK dengan kata "sampai", "hingga", "s/d"
  const monthNames = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
    'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };
  
  for (const [monthName, monthIndex] of Object.entries(monthNames)) {
    if (lowerPrompt.includes(monthName)) {
      // Cek apakah ada kata "sampai", "hingga", "s/d", "sd", "sampai sekarang"
      const hasUntilKeyword = lowerPrompt.includes('sampai') || 
                             lowerPrompt.includes('hingga') || 
                             lowerPrompt.includes('s/d') || 
                             lowerPrompt.includes(' sd ') ||
                             lowerPrompt.includes('sekarang');
      
      // Cari angka di sekitar nama bulan
      const match = lowerPrompt.match(new RegExp(`(\\d+)\\s*${monthName}|${monthName}\\s*(\\d+)`));
      
      if (match) {
        const day = parseInt(match[1] || match[2]);
        const specificDate = new Date(today.getFullYear(), monthIndex, day);
        
        // Jika tanggal di masa depan, gunakan tahun lalu
        if (specificDate > today) {
          specificDate.setFullYear(today.getFullYear() - 1);
        }
        
        // Jika ada kata "sampai/hingga/sekarang" → dari tanggal tersebut sampai hari ini
        if (hasUntilKeyword) {
          return {
            start: setStartOfDay(specificDate),
            end: setEndOfDay(new Date(today)), // Sampai hari ini
            label: `${day} ${monthName} sampai sekarang`
          };
        } else {
          // Jika tidak ada → hanya tanggal spesifik itu saja
          return {
            start: setStartOfDay(specificDate),
            end: setEndOfDay(specificDate),
            label: `${day} ${monthName}`
          };
        }
      }
      
      // Jika hanya nama bulan tanpa tanggal
      // Cek apakah ada "sampai sekarang" atau sejenisnya
      if (hasUntilKeyword) {
        // "dari november sampai sekarang" = 1 november sampai hari ini
        const startOfMonth = new Date(today.getFullYear(), monthIndex, 1);
        if (startOfMonth > today) {
          startOfMonth.setFullYear(today.getFullYear() - 1);
        }
        return {
          start: setStartOfDay(startOfMonth),
          end: setEndOfDay(new Date(today)),
          label: `1 ${monthName} sampai sekarang`
        };
      } else {
        // "bulan november" = seluruh bulan november
        const startOfMonth = new Date(today.getFullYear(), monthIndex, 1);
        const endOfMonth = new Date(today.getFullYear(), monthIndex + 1, 0);
        
        if (startOfMonth > today) {
          startOfMonth.setFullYear(today.getFullYear() - 1);
          endOfMonth.setFullYear(today.getFullYear() - 1);
        }
        
        return {
          start: setStartOfDay(startOfMonth),
          end: setEndOfDay(endOfMonth),
          label: `bulan ${monthName}`
        };
      }
    }
  }
  
  // DEFAULT: BULAN INI (kalau tidak terdeteksi apa-apa)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    start: setStartOfDay(startOfMonth),
    end: setEndOfDay(new Date(today)),
    label: 'bulan ini (default)'
  };
}

// ---------------------------------
// [FUNGSI UPGRADE] Mengambil Data Toko dengan Rentang Fleksibel
// ---------------------------------
async function getStoreContext(userId, prompt) {
  if (!userId) {
    return "Data toko tidak tersedia (user tidak terautentikasi).";
  }

  try {
    console.log(`[Admin SDK] Mengambil data untuk user: ${userId}`);
    
    // 1. Deteksi rentang waktu dari pertanyaan
    const timeRange = detectTimeRange(prompt);
    console.log(`⏰ Rentang waktu terdeteksi: ${timeRange.label}`);
    console.log(`   Dari: ${timeRange.start.toLocaleDateString('id-ID')}`);
    console.log(`   Sampai: ${timeRange.end.toLocaleDateString('id-ID')}`);

    // 2. Query transaksi
    const txQuery = dbAdmin.collection("users").doc(userId).collection("transactions")
      .where('tanggal', '>=', Timestamp.fromDate(timeRange.start))
      .where('tanggal', '<=', Timestamp.fromDate(timeRange.end))
      .orderBy('tanggal', 'desc');
    
    const txSnap = await txQuery.get();

    // 3. Proses data transaksi
    let totalSales = 0; // Omzet bersih (yang dibayar customer)
    let totalGrossSales = 0; // Omzet kotor (termasuk komplimen)
    let totalTxn = 0;
    let totalRefund = 0;
    let totalDiscount = 0;
    let totalComplimentValue = 0; // BARU: Total nilai komplimen
    let totalComplimentItems = 0; // BARU: Total item komplimen
    let productSalesMap = new Map();
    let complimentProductMap = new Map(); // BARU: Track produk komplimen
    let cashierSalesMap = new Map();
    let paymentMethodMap = new Map();

    txSnap.forEach((doc) => {
      const data = doc.data();
      
      if (data.isRefunded) {
        totalRefund += data.total || 0;
      } else {
        totalSales += data.total || 0; // Omzet bersih
        totalTxn++;
        totalDiscount += data.diskon || 0;
        
        // Track payment method
        const paymentMethod = data.metodePembayaran || (data.orderType === 'Online' ? data.onlinePlatform : 'Lainnya');
        paymentMethodMap.set(paymentMethod, (paymentMethodMap.get(paymentMethod) || 0) + (data.total || 0));
        
        // Track cashier
        const cashierName = data.cashierName || 'Tidak diketahui';
        cashierSalesMap.set(cashierName, (cashierSalesMap.get(cashierName) || 0) + (data.total || 0));
        
        // Track items (TERMASUK komplimen untuk omzet kotor)
        (data.items || []).forEach(item => {
          const productName = item.baseProdukNama || item.produkNama || 'Produk Tidak Dikenal';
          const qty = item.jumlah || 0;
          const itemValue = (item.produkHarga || 0) * qty;
          
          if (item.isComplimentary) {
            // BARU: Track komplimen
            totalComplimentValue += itemValue;
            totalComplimentItems += qty;
            complimentProductMap.set(
              productName, 
              (complimentProductMap.get(productName) || 0) + qty
            );
          } else {
            // Track penjualan normal
            productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + qty);
          }
          
          // Hitung omzet kotor (semua item termasuk komplimen)
          totalGrossSales += itemValue;
        });
      }
    });

    // 4. Ambil data produk untuk info tambahan
    const productsSnap = await dbAdmin.collection("users").doc(userId).collection("products").get();
    const totalProducts = productsSnap.size;

    // 5. Format data menjadi teks konteks
    const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

    // Top 5 produk terlaris
    const topProducts = Array.from(productSalesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => `${name} (${qty} terjual)`)
      .join(', ');

    // BARU: Top produk komplimen
    const topComplimentProducts = Array.from(complimentProductMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => `${name} (${qty} item)`)
      .join(', ');

    // Top kasir
    const topCashier = Array.from(cashierSalesMap.entries())
      .sort((a, b) => b[1] - a[1])[0];

    // Metode pembayaran terpopuler
    const topPaymentMethod = Array.from(paymentMethodMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([method, total]) => `${method} (${formatRupiah(total)})`)
      .join(', ');

    const context = `
RENTANG WAKTU: ${timeRange.label} (${timeRange.start.toLocaleDateString('id-ID')} - ${timeRange.end.toLocaleDateString('id-ID')})

RINGKASAN PENJUALAN:
- Omzet Bersih (yang dibayar customer): ${formatRupiah(totalSales)}
- Omzet Kotor (termasuk komplimen): ${formatRupiah(totalGrossSales)}
- Total Transaksi: ${totalTxn}
- Total Refund: ${formatRupiah(totalRefund)}
- Total Diskon: ${formatRupiah(totalDiscount)}
- Rata-rata per Transaksi: ${formatRupiah(totalTxn > 0 ? totalSales / totalTxn : 0)}

KOMPLIMEN (GRATIS):
- Total Nilai Komplimen: ${formatRupiah(totalComplimentValue)}
- Total Item Komplimen: ${totalComplimentItems} item
- Produk Komplimen Terbanyak: ${topComplimentProducts || 'Tidak ada'}

CATATAN PENTING:
- Omzet BERSIH = Uang yang benar-benar masuk (${formatRupiah(totalSales)})
- Omzet KOTOR = Termasuk nilai komplimen (${formatRupiah(totalGrossSales)})
- Jika ditanya "total penjualan", maksudnya biasanya omzet BERSIH
- Komplimen adalah produk gratis yang tidak dibayar customer

PRODUK:
- Total Produk di Database: ${totalProducts}
- Top 5 Produk Terlaris (Berbayar): ${topProducts || 'Belum ada'}

KASIR:
- Top Kasir: ${topCashier ? `${topCashier[0]} dengan omzet ${formatRupiah(topCashier[1])}` : 'Belum ada data'}

METODE PEMBAYARAN:
- Top 3: ${topPaymentMethod || 'Belum ada'}
    `.trim();
    
    return context;

  } catch (error) {
    console.error("❌ Error fetching context:", error);
    return `Gagal mengambil data toko: ${error.message}`;
  }
}

// ---------------------------------
// Cache untuk model
// ---------------------------------
let cachedAvailableModel = null;

async function getAvailableModels() {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
  console.log("🔍 Mengecek model yang tersedia...");
  
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const models = data.models || [];
    const generateModels = models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name);
    console.log("✅ Model tersedia:", generateModels);
    return generateModels;
  } catch (error) {
    console.error("❌ Error fetching models:", error.message);
    return [];
  }
}

async function getBestAvailableModel() {
  if (cachedAvailableModel) {
    console.log(`♻️ Menggunakan cached model: ${cachedAvailableModel}`);
    return cachedAvailableModel;
  }
  
  const availableModels = await getAvailableModels();
  if (availableModels.length === 0) {
    throw new Error("Tidak ada model yang tersedia untuk API key Anda");
  }
  
  const preferredModels = [
    'models/gemini-2.5-flash', 'models/gemini-2.0-flash',
    'models/gemini-1.5-flash-latest', 'models/gemini-1.5-flash',
    'models/gemini-2.5-pro', 'models/gemini-1.5-pro-latest',
    'models/gemini-1.5-pro', 'models/gemini-pro', 'models/gemini-1.0-pro',
  ];
  
  for (const preferred of preferredModels) {
    if (availableModels.includes(preferred)) {
      console.log(`✅ Model terpilih: ${preferred}`);
      cachedAvailableModel = preferred;
      return preferred;
    }
  }
  
  const fallbackModel = availableModels[0];
  console.log(`⚠️ Menggunakan fallback model: ${fallbackModel}`);
  cachedAvailableModel = fallbackModel;
  return fallbackModel;
}

async function callGeminiAPI(finalPrompt) {
  try {
    const modelName = await getBestAvailableModel();
    const modelPath = modelName.startsWith('models/') ? modelName.substring(7) : modelName;
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelPath}:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log(`📡 Mengirim request ke: ${modelPath}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048, // Dinaikkan untuk jawaban lebih panjang
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error response:", errorText);
      cachedAvailableModel = null;
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Respons diterima dari Gemini");
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("❌ Struktur respons tidak valid");
      throw new Error('Respons AI kosong atau tidak valid');
    }
    
    return text;
    
  } catch (error) {
    cachedAvailableModel = null;
    throw error;
  }
}

// ---------------------------------
// Handler POST
// ---------------------------------
export async function POST(req) {
  try {
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY tidak ditemukan");
      return NextResponse.json({ 
        error: "Server tidak dikonfigurasi dengan benar. API Key tidak ditemukan." 
      }, { status: 500 });
    }

    const { prompt, userId } = await req.json();
    
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({ 
        error: "Prompt tidak boleh kosong" 
      }, { status: 400 });
    }

    console.log(`\n📝 Menerima prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    console.log(`👤 UserID: ${userId || 'Anonymous'}`);
    
    // Ambil data toko (sekarang dengan deteksi rentang waktu otomatis)
    const contextData = await getStoreContext(userId, prompt);
    console.log(`ℹ️ Konteks data diambil`);
    
    // Buat prompt yang lebih smart
    const finalPrompt = `
Anda adalah 'Asisten AI Fiska', asisten bisnis yang cerdas dan ramah untuk pemilik toko.

TUGAS ANDA:
- Jawab pertanyaan pemilik toko berdasarkan data yang tersedia
- Berikan insight dan analisis jika diminta
- Berikan saran praktis jika relevan

ATURAN PENTING:
1. Gunakan Bahasa Indonesia yang santai dan profesional
2. JANGAN MENGARANG data yang tidak ada
3. Jika data tidak tersedia untuk periode yang ditanyakan, jelaskan dengan jelas periode apa yang Anda punya datanya
4. Jangan sebutkan kata "konteks" atau "data yang diberikan" - anggap ini adalah pengetahuan Anda
5. Format angka dengan rupiah untuk mata uang
6. Berikan jawaban singkat kecuali diminta detail
7. Jika ditanya tentang tanggal/periode tertentu, cek apakah data untuk periode itu ada

PEMAHAMAN ISTILAH:
- "Total penjualan" / "omzet" / "pendapatan" = OMZET BERSIH (yang dibayar customer, TIDAK termasuk komplimen)
- "Omzet kotor" = Termasuk nilai komplimen
- "Komplimen" / "gratis" = Produk yang diberikan gratis, tidak dibayar customer
- Jika ditanya "apa itu sudah termasuk komplimen?", jelaskan perbedaan omzet bersih vs kotor

CONTOH JAWABAN YANG BAIK:
Q: "Berapa total penjualan bulan ini?"
A: "Total penjualan (omzet bersih) bulan ini adalah Rp XXX. Ini adalah uang yang benar-benar masuk dari customer, belum termasuk komplimen."

Q: "Itu sudah sama komplimen?"
A: "Tidak, angka itu adalah omzet BERSIH (Rp XXX), yaitu uang yang benar-benar dibayar customer. Jika dihitung dengan komplimen, omzet KOTOR kamu adalah Rp YYY. Selisihnya Rp ZZZ adalah nilai produk gratis yang kamu berikan."

[DATA TOKO]
${contextData}

[PERTANYAAN]
"${prompt}"

JAWABAN:
    `.trim();

    const text = await callGeminiAPI(finalPrompt);
    return NextResponse.json({ text: text });

  } catch (error) {
    console.error("\n--- ERROR DI /api/chat/route.js ---");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("-----------------------------------\n");
    
    let errorMessage = "Gagal memproses permintaan AI.";
    let statusCode = 500;
    const errMsg = error.message.toLowerCase();
    
    if (errMsg.includes('api key not valid') || errMsg.includes('api_key_invalid')) {
      errorMessage = "❌ API Key tidak valid.";
      statusCode = 401;
    } else if (errMsg.includes('tidak ada model yang tersedia')) {
      errorMessage = "❌ Tidak ada model AI yang tersedia.";
      statusCode = 503;
    } else if (errMsg.includes('quota') || errMsg.includes('rate limit')) {
      errorMessage = "⏳ Quota API habis. Tunggu 1 menit.";
      statusCode = 429;
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}