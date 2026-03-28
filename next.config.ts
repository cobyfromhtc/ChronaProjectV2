import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Force fresh compilation
  experimental: {
    // @ts-ignore
    forcePrismaFresh: true,
  },
};

// Force cache invalidation - timestamp: 1711478400
export default nextConfig;
