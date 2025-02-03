import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

// Load environment variables
const env = dotenv.config({ path: resolve(__dirname, '../../.env') }).parsed || {};

// Load package.json for version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

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
  }
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-extension',
      closeBundle: async () => {
        const outDir = resolve(__dirname, 'build');
        
        // Copy manifest
        await fs.writeJSON(resolve(outDir, 'manifest.json'), manifest, { spaces: 2 });
        
        // Copy icons
        const iconsDir = resolve(__dirname, 'public/icons');
        await fs.copy(iconsDir, resolve(outDir, 'icons'));

        // Copy HTML files
        await fs.copy(
          resolve(__dirname, 'popup.html'),
          resolve(outDir, 'popup.html')
        );

        console.log('Extension files copied successfully');
      }
    }
  ],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.jsx'),
        background: resolve(__dirname, 'src/background.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return 'assets/popup.css';
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    sourcemap: true,
    css: {
      modules: false
    }
  },
  define: {
    'process.env': env
  }
});
