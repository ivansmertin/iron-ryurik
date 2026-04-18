import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  devIndicators: {
    position: "top-right",
  },
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
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
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default process.env.ANALYZE === "true"
  ? withBundleAnalyzer({ enabled: true })(nextConfig)
  : nextConfig;
