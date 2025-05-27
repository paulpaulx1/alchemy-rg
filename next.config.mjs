// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: ['cdn.sanity.io'],
    },
    experimental: {
      turbo: {
        resolveAlias: {
          canvas: './empty-module.ts'
        }
      }
    }
  };
  
  // Use ES modules export instead of CommonJS
  export default nextConfig;