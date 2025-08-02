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
      crx({ manifest }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'pages/popup.html'),
          background: resolve(__dirname, 'src/background.js'),
          'content': resolve(__dirname, 'src/content.ts'),
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
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
      'process.env.ADMIN_CANISTER_ID': JSON.stringify('s6r66-wyaaa-aaaaj-az4sq-cai'),
      'process.env.STORAGE_CANISTER_ID': JSON.stringify('hhaip-uiaaa-aaaao-a4khq-cai'),
      'process.env.AUTH_CANISTER_ID': JSON.stringify('slwpt-xqaaa-aaaaj-az4ra-cai'),
      'process.env.II_URL': JSON.stringify('https://identity.ic0.app'),
      'process.env.IC_HOST': JSON.stringify('https://icp0.io'),
    },
  };
});
