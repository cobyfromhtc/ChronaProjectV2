import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TypeScript errors should be fixed, not ignored
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  reactStrictMode: false,
  
  // Enable experimental features
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
