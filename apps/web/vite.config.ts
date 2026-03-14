// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-router':    ['react-router-dom'],
          'vendor-redux':     ['@reduxjs/toolkit', 'react-redux'],
          'vendor-oauth':     ['@react-oauth/google'],
          'vendor-socket':    ['socket.io-client'],
          'vendor-utils':     ['zod'],
          'vendor-analytics': ['@vercel/analytics', '@vercel/speed-insights'],

          'vendor-react':     ['react', 'react-dom'],
          'vendor-charts':    ['recharts', 'd3'],
          'vendor-motion':    ['framer-motion'],
          'vendor-http':      ['axios'],
          'vendor-date':      ['date-fns'],
          'vendor-ui':        [
            'lucide-react',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
          'vendor-forms':     ['react-hook-form', '@hookform/resolvers'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      'localhost',
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.app',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});