import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import packageJson from './package.json';
import dotenv from 'dotenv';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Load environment variables
const env = dotenv.config({ path: resolve(__dirname, '../../.env') }).parsed || {};

// Extension manifest
const manifest = {
  manifest_version: 3,
  name: 'RhinoSpider',
  description: 'RhinoSpider Extension',
  version: packageJson.version,
  action: {
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png'
  },
  permissions: ['storage', 'tabs'],
  background: {
    service_worker: 'background.js',
    type: 'module'
  },
  web_accessible_resources: [{
    resources: [
      'assets/*'
    ],
    matches: ['<all_urls>']
  }]
};

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
    {
      name: 'copy-html',
      closeBundle() {
        // Write manifest.json
        fs.writeFileSync(
          resolve(__dirname, 'build/manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        // Copy icons
        const iconSizes = ['16', '48', '128'];
        if (!fs.existsSync(resolve(__dirname, 'build/icons'))) {
          fs.mkdirSync(resolve(__dirname, 'build/icons'), { recursive: true });
        }
        iconSizes.forEach(size => {
          fs.copyFileSync(
            resolve(__dirname, `public/icons/icon${size}.png`),
            resolve(__dirname, `build/icons/icon${size}.png`)
          );
        });
      }
    }
  ],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.js'),
        popup: resolve(__dirname, 'popup.html'),
        analytics: resolve(__dirname, 'src/pages/analytics-entry.jsx'),
        settings: resolve(__dirname, 'src/pages/settings-entry.jsx'),
        profile: resolve(__dirname, 'src/pages/profile-entry.jsx'),
        referrals: resolve(__dirname, 'src/pages/referrals-entry.jsx')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(jpe?g|png|gif|svg|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name][extname]`;
          }
          if (/\.css$/i.test(assetInfo.name)) {
            return `assets/[name][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        format: 'es',
        sourcemap: true
      }
    },
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@dfinity/agent': resolve(__dirname, 'node_modules/@dfinity/agent'),
      '@dfinity/candid': resolve(__dirname, 'node_modules/@dfinity/candid'),
      '@dfinity/principal': resolve(__dirname, 'node_modules/@dfinity/principal'),
      '@dfinity/auth-client': resolve(__dirname, 'node_modules/@dfinity/auth-client'),
      '@dfinity/identity': resolve(__dirname, 'node_modules/@dfinity/identity'),
      '@dfinity/identity-secp256k1': resolve(__dirname, 'node_modules/@dfinity/identity-secp256k1')
    }
  },
  define: {
    'process.env': {
      ...env,
      NODE_ENV: JSON.stringify(process.env.NODE_ENV)
    }
  }
});
