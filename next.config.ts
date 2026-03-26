import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "icons.brapi.dev",
      },
    ],
  },
  css: {
    lightningcss: true,
  },
};

export default nextConfig;
