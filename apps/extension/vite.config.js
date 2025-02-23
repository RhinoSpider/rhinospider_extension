import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import packageJson from './package.json';
import dotenv from 'dotenv';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Load environment variables from the extension directory
const env = dotenv.config({ path: resolve(__dirname, '.env') }).parsed || {};

// Define environment variables for the build
const envDefines = {};
for (const key in env) {
  envDefines[`process.env.${key}`] = JSON.stringify(env[key]);
  envDefines[`import.meta.env.${key}`] = JSON.stringify(env[key]);
}

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
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content.js']
    },
    {
      matches: ['https://identity.ic0.app/*'],
      js: ['ii-content.js']
    }
  ],
  web_accessible_resources: [{
    resources: [
      'assets/*',
      'pages/*',
      'src/*',
      'icons/*',
      'ii-content.js'
    ],
    matches: ['<all_urls>']
  }]
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
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
          // Create build directory if it doesn't exist
          if (!fs.existsSync('build')) {
            fs.mkdirSync('build');
          }

          // Write manifest.json
          fs.writeFileSync(
            resolve(__dirname, 'build/manifest.json'),
            JSON.stringify(manifest, null, 2)
          );

          // Copy icons
          if (!fs.existsSync('build/icons')) {
            fs.mkdirSync('build/icons');
          }
          fs.readdirSync('public/icons').forEach(file => {
            fs.copyFileSync(`public/icons/${file}`, `build/icons/${file}`);
          });

          // Copy pages directory
          if (!fs.existsSync('build/pages')) {
            fs.mkdirSync('build/pages');
          }
          fs.readdirSync('pages').forEach(file => {
            fs.copyFileSync(`pages/${file}`, `build/pages/${file}`);
          });
        }
      }
    ],
    define: {
      ...envDefines,
      global: 'globalThis'
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background.js'),
          popup: resolve(__dirname, 'popup.html'),
          analytics: resolve(__dirname, 'src/pages/analytics-entry.jsx'),
          settings: resolve(__dirname, 'src/pages/settings-entry.jsx'),
          profile: resolve(__dirname, 'src/pages/profile-entry.jsx'),
          referrals: resolve(__dirname, 'src/pages/referrals-entry.jsx'),
          content: resolve(__dirname, 'src/content.js'),
          'ii-content': resolve(__dirname, 'src/ii-content.js'),
          dashboard: resolve(__dirname, 'src/dashboard.js'),
          'ic-agent': resolve(__dirname, 'src/ic-agent.js')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background' || chunkInfo.name === 'content' || chunkInfo.name === 'ii-content' || chunkInfo.name === 'ic-agent' || chunkInfo.name === 'dashboard') {
              return '[name].js';
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
      sourcemap: true,
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
    }
  };
});
