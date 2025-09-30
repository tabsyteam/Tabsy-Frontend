/** @type {import('next').NextConfig} */
const nextConfig = {
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
  /* config options here */
};

module.exports = nextConfig;
