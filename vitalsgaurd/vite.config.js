import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/predict': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/explain-trend': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/integrated': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/store-report': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/appointments': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/alerts': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
});
