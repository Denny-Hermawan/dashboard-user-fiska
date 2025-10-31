// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tambahkan konfigurasi 'images' di sini
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;