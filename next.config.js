const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: process.env.BUILD_DIR || '.next',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  outputFileTracingRoot: __dirname,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    // next-intl/config resolves to this stub file that throws an error.
    // We replace it with our actual request config using webpack's alias.
    // This replicates exactly what createNextIntlPlugin() does internally,
    // without needing to import the plugin (which depends on broken @swc/core).
    const requestConfigPath = path.resolve(__dirname, 'src/i18n/request.ts');
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      // Alias the package specifier (works in most webpack setups)
      'next-intl/config': requestConfigPath,
      // Also alias the exact resolved file as a fallback
      [path.resolve(__dirname, 'node_modules/next-intl/dist/esm/production/config.js')]: requestConfigPath,
      [path.resolve(__dirname, 'node_modules/next-intl/dist/esm/development/config.js')]: requestConfigPath,
    };
    return config;
  },
};

module.exports = nextConfig;

