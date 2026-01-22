/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'hnswlib-node'],
  },
  // Webpack configuration for handling native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'hnswlib-node': 'commonjs hnswlib-node',
      });
    }
    return config;
  },
}

module.exports = nextConfig

