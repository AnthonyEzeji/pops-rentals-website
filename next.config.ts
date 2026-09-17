import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; otherwise Turbopack walks up and picks up an
  // unrelated lockfile in the user's home directory.
  turbopack: { root: import.meta.dirname },
  images: {
    // Vehicle photos live under /public, so the optimizer resizes and serves
    // them as WebP/AVIF. No `remotePatterns` on purpose: that would make the
    // optimizer an open proxy for any host an admin pastes in. Admin-entered
    // absolute URLs render unoptimized instead (see src/lib/images.ts).
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
