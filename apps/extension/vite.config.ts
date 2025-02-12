import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.jsx'),
        background: resolve(__dirname, 'src/background.js'),
        auth: resolve(__dirname, 'src/auth/index.jsx')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
        format: 'es'
      }
    },
    outDir: 'build',
    target: 'es2020',
    minify: false, // Helps with debugging
    sourcemap: true,
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
