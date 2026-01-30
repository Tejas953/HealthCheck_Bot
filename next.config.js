/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  // Webpack configuration for handling native modules
  webpack: (config, { isServer }) => {
    // No custom externals needed
    return config;
  },
}

module.exports = nextConfig

