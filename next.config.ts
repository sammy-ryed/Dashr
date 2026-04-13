import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.3.153.190'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
    ],
  },
  serverExternalPackages: ['tesseract.js'],
  turbopack: {},
  // Turbopack removed — empty config caused aggressive parallel compilation
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable source maps in dev to drastically cut memory usage
      config.devtool = false;
    }
    // Limit parallelism to avoid CPU spikes
    config.parallelism = 2;
    return config;
  },
};

export default nextConfig;
