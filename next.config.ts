import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["bcryptjs"],
  devIndicators: false,
  // Sandbox/gateway note: the app is reached through the Caddy gateway and
  // preview panel hostnames (not just "localhost"), which makes Next 16.4
  // block the /_next/hmr websocket as a cross-origin dev resource — and a
  // blocked HMR prevents client hydration entirely (infinite loading screen).
  // Allow dev resources from any origin so the preview works everywhere.
  allowedDevOrigins: ["127.0.0.1", "localhost", "**"],
};

export default nextConfig;
