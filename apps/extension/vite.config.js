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
      'ii-content.js',
      'ic-agent.js',
      'ic-deps.js'
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
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      global: 'globalThis'
    },
    build: {
      outDir: 'build',
      emptyOutDir: false,
      sourcemap: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          background: resolve(__dirname, 'src/background.js'),
          content: resolve(__dirname, 'src/content.js'),
          'ii-content': resolve(__dirname, 'src/ii-content.js'),
          'ic-agent': resolve(__dirname, 'src/ic-agent.js'),
          dashboard: resolve(__dirname, 'src/dashboard.js')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return 'background.js';
            }
            if (chunkInfo.name === 'content') {
              return 'content.js';
            }
            if (chunkInfo.name === 'ii-content') {
              return 'ii-content.js';
            }
            if (chunkInfo.name === 'ic-agent') {
              return 'ic-agent.js';
            }
            if (chunkInfo.name === 'dashboard') {
              return 'dashboard.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') {
              return 'assets/index.css';
            }
            if (assetInfo.name === 'popup.html') {
              return 'popup.html';
            }
            return 'assets/[name]-[hash][extname]';
          }
        }
      },
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true,
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      }
    },
    server: {
      port: 3000,
      strictPort: true,
      hmr: {
        port: 3000
      }
    }
  };
});
