import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isExtension = mode === 'extension';
  
  return {
    plugins: [react()],
    build: {
      outDir: isExtension ? 'build' : 'dist',
      rollupOptions: isExtension ? {
        input: {
          popup: resolve(__dirname, 'index.html'),
          background: resolve(__dirname, 'src/background.js'),
        },
        output: {
          entryFileNames: '[name].js',
        },
      } : undefined,
    },
    server: {
      port: 3000,
      open: true,
    },
    define: {
      'process.env.VITE_IS_EXTENSION': JSON.stringify(isExtension),
    },
  };
});