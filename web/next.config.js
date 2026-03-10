/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 