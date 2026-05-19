import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Handle proxy error
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Modify proxy request if needed
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Inspect proxy response if needed
          });
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    __APP_NAME__: JSON.stringify('FinTracker'),
  },
});
