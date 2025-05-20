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
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks: (id) => {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // Create a chunk for each major dependency
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('@dfinity')) return 'vendor-dfinity';
            if (id.includes('axios')) return 'vendor-axios';
            return 'vendor'; // Other dependencies
          }
          // Split app code into logical chunks
          if (id.includes('/components/')) return 'ui';
          if (id.includes('/pages/')) return 'pages';
          if (id.includes('/hooks/')) return 'hooks';
          if (id.includes('/utils/')) return 'utils';
        },
      },
    },
    // Enable source maps for production
    sourcemap: true,
    // Use default minification (esbuild)
    minify: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});
