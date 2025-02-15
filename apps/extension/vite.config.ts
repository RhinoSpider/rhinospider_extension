import { defineConfig } from 'vite';
import { resolve } from 'path';
import { writeFileSync, copyFileSync, mkdirSync } from 'fs';

// Custom plugin to copy files after build
const copyManifestPlugin = () => ({
  name: 'copy-manifest',
  closeBundle: () => {
    // Create build directory if it doesn't exist
    mkdirSync(resolve(__dirname, 'build'), { recursive: true });
    
    // Copy manifest
    copyFileSync(
      resolve(__dirname, 'manifest.json'),
      resolve(__dirname, 'build/manifest.json')
    );
    
    // Copy popup.html
    copyFileSync(
      resolve(__dirname, 'popup.html'),
      resolve(__dirname, 'build/popup.html')
    );
    
    // Copy icons
    mkdirSync(resolve(__dirname, 'build/icons'), { recursive: true });
    ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
      copyFileSync(
        resolve(__dirname, 'public/icons', icon),
        resolve(__dirname, 'build/icons', icon)
      );
    });
  }
});

export default defineConfig({
  plugins: [copyManifestPlugin()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.jsx'),
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/content.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
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
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.ADMIN_CANISTER_ID': JSON.stringify('s6r66-wyaaa-aaaaj-az4sq-cai'),
    'process.env.STORAGE_CANISTER_ID': JSON.stringify('smxjh-2iaaa-aaaaj-az4rq-cai'),
    'process.env.AUTH_CANISTER_ID': JSON.stringify('slwpt-xqaaa-aaaaj-az4ra-cai'),
    'process.env.II_URL': JSON.stringify('https://identity.ic0.app'),
    'process.env.IC_HOST': JSON.stringify('https://icp0.io')
  }
});
