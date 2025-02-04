import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import packageJson from './package.json';
import dotenv from 'dotenv';

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
      'pages/analytics/*',
      'pages/settings/*',
      'pages/profile/*',
      'pages/referrals/*',
      'assets/*'
    ],
    matches: ['<all_urls>']
  }]
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-html',
      closeBundle() {
        // Create pages directory
        const pagesDir = resolve(__dirname, 'build/pages');
        if (!fs.existsSync(pagesDir)) {
          fs.mkdirSync(pagesDir);
        }

        // Copy HTML files
        const pages = ['analytics', 'settings', 'profile', 'referrals'];
        pages.forEach(page => {
          const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RhinoSpider ${page.charAt(0).toUpperCase() + page.slice(1)}</title>
    <link rel="stylesheet" href="../assets/index-D8JTpqma.css" />
  </head>
  <body class="bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F]">
    <div id="root"></div>
    <script type="module" src="../assets/${page}.js"></script>
  </body>
</html>`;
          fs.writeFileSync(resolve(pagesDir, `${page}.html`), html);
        });

        // Write manifest.json
        fs.writeFileSync(
          resolve(__dirname, 'build/manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        // Copy icons
        const iconSizes = ['16', '48', '128'];
        if (!fs.existsSync(resolve(__dirname, 'build/icons'))) {
          fs.mkdirSync(resolve(__dirname, 'build/icons'));
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
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.js'),
        analytics: resolve(__dirname, 'src/pages/analytics-entry.jsx'),
        settings: resolve(__dirname, 'src/pages/settings-entry.jsx'),
        profile: resolve(__dirname, 'src/pages/profile-entry.jsx'),
        referrals: resolve(__dirname, 'src/pages/referrals-entry.jsx')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return '[name].js';
          }
          const name = chunkInfo.name.toLowerCase();
          return `assets/${name}.js`;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    'process.env': env
  }
});
