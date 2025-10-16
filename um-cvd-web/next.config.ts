import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for better performance and stability
  experimental: {
    optimizePackageImports: ['plotly.js-dist-min', 'react-plotly.js'],
  },
  // Improve build performance
  swcMinify: true,
  // Better error handling
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Better caching
  compress: true,
  // Improve development experience
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
};

export default nextConfig;
