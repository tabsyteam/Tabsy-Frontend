/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience and error detection
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_CUSTOMER_APP_URL: process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'http://localhost:3001',
    NEXT_PUBLIC_ADMIN_APP_URL: process.env.NEXT_PUBLIC_ADMIN_APP_URL || 'http://localhost:3002',
  },


  // Configure webpack dev middleware options
  webpackDevMiddleware: (config) => {
    // Ensure requests are buffered during compilation
    config.writeToDisk = false;
    config.stats = 'errors-warnings';
    return config;
  },
};

module.exports = nextConfig;
