import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import environment from 'vite-plugin-environment';

export default defineConfig({
  plugins: [
    react(),
    environment('all', { prefix: 'VITE_' })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'dfinity-vendor': ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/identity', '@dfinity/principal']
        }
      }
    }
  },
  server: {
    port: 5174,
    host: '127.0.0.1'
  },
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.DFX_NETWORK': '"local"'
  }
});