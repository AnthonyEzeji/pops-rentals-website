import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; otherwise Turbopack walks up and picks up an
  // unrelated lockfile in the user's home directory.
  turbopack: { root: import.meta.dirname },
  images: {
    // Vehicle photos live under /public or in Vercel Blob, and the optimizer
    // resizes both and serves them as WebP/AVIF. The allow-list is deliberately
    // only Blob's public hostname: a wider one would make the optimizer a proxy
    // for any host an admin pastes in. Other absolute URLs render unoptimized
    // instead (see src/lib/images.ts).
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
