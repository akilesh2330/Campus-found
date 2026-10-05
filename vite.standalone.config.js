import viteConfig from './vite.config.js';

export default {
  ...viteConfig,
  server: {
    ...viteConfig.server,
    port: 5173,
    strictPort: true,
    hmr: {},
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: false },
    },
  },
};
