import { defineConfig } from 'vite';
import { resolve } from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      mode === 'extension' && crx({ manifest }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          background: resolve(__dirname, 'src/background.js'),
          'content-script': resolve(__dirname, 'content-script.js'), // Changed path to root directory
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
        external: ['chrome'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        './service-worker-adapter': resolve(__dirname, 'src/service-worker-adapter.js'),
      },
    },
  };
});
