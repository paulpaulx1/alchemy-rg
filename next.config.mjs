/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'image.mux.com' },
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  webpack: (config) => {
    // Disable Node canvas modules if used in client bundles
    config.resolve.alias.canvas = false;

    // ✅ Shim global Image for server build (prevents "Image is not defined")
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.beforeRun.tap('ShimImage', () => {
          if (typeof global.Image === 'undefined') {
            global.Image = function () {};
          }
        });
      },
    });

    return config;
  },

  // Optional debug header for ISR status
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'x-next-cache-status', value: 'true' }],
      },
    ];
  },
};

export default nextConfig;
