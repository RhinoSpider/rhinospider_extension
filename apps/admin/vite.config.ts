import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@declarations': path.resolve(__dirname, '../../src/declarations'),
    },
  },
  envDir: path.resolve(__dirname, '../..'), // Look for .env in root directory
  define: {
    global: 'globalThis',
    'process.env.VITE_ADMIN_CANISTER_ID': JSON.stringify(process.env.VITE_ADMIN_CANISTER_ID),
    'process.env.VITE_STORAGE_CANISTER_ID': JSON.stringify(process.env.VITE_STORAGE_CANISTER_ID),
    'process.env.VITE_AUTH_CANISTER_ID': JSON.stringify(process.env.VITE_AUTH_CANISTER_ID),
    'process.env.VITE_II_URL': JSON.stringify(process.env.VITE_II_URL),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        chunkFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});
