import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('./package.json');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a clean manifest.json file
const manifest = {
  manifest_version: 3,
  name: 'RhinoSpider',
  description: 'RhinoSpider Extension',
  version: packageJson.version,
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png'
  },
  action: {
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },
  permissions: [
    'storage',
    'activeTab',
    'scripting',
    'tabs'
  ],
  host_permissions: [
    'https://*.ic0.app/*',
    'https://*.icp0.io/*',
    'http://localhost:4943/*'
  ],
  background: {
    service_worker: 'background.js',
    type: 'module'
  },
  web_accessible_resources: [{
    resources: ['ic-agent.js'],
    matches: ['<all_urls>']
  }],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
};

// Write the manifest.json file to the build directory
fs.writeFileSync(
  path.resolve(__dirname, 'build/manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);

// Delete content.js and content.js.map files if they exist
const contentJsPath = path.resolve(__dirname, 'build/content.js');
const contentJsMapPath = path.resolve(__dirname, 'build/content.js.map');

if (fs.existsSync(contentJsPath)) {
  fs.unlinkSync(contentJsPath);
  console.log('Deleted content.js file');
}

if (fs.existsSync(contentJsMapPath)) {
  fs.unlinkSync(contentJsMapPath);
  console.log('Deleted content.js.map file');
}

console.log('New manifest file created successfully.');
