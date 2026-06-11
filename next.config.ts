import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdn.bubble.io',
      },
    ],
  },
};

export default nextConfig;
