import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for server responses.
  compress: true,

  // Remove the X-Powered-By: Next.js header — minor security + saves bytes.
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Next.js content-hashes all static chunks — safe to cache forever.
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // PWA icons — cache aggressively, invalidated by sw.js version bump.
        source: "/:file(icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
