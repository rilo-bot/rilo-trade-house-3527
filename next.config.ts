import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve modern formats; next/image negotiates the best one per browser.
    formats: ["image/avif", "image/webp"],
    // Remote hosts must be whitelisted or next/image throws at runtime.
    remotePatterns: [
      // Demo property photos — safe to remove once you use your own CDN.
      { protocol: "https", hostname: "images.unsplash.com" },
      // S3 listing images (any region/bucket).
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
