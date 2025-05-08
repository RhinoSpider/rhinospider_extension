const fs = require('fs');

// Read the original admin.ts file
const adminFile = fs.readFileSync('src/lib/admin.ts', 'utf8');

// Read the patch file
const patchContent = fs.readFileSync('src/lib/admin.ts.patch', 'utf8');

// Add the import at the top of the file
let updatedContent = adminFile;
if (!updatedContent.includes("import { wrapStorageResponse }")) {
  updatedContent = updatedContent.replace(
    "import { Principal } from '@dfinity/principal';",
    "import { Principal } from '@dfinity/principal';\nimport { wrapStorageResponse } from './storage-adapter';"
  );
}

// Replace the getScrapedDataDirect function
const getScrapedDataDirectRegex = /export async function getScrapedDataDirect[\s\S]*?^}$/m;
const getScrapedDataDirectMatch = patchContent.match(/export async function getScrapedDataDirect[\s\S]*?^}/m);

if (getScrapedDataDirectMatch) {
  updatedContent = updatedContent.replace(getScrapedDataDirectRegex, getScrapedDataDirectMatch[0]);
}

// Write the updated content back to the file
fs.writeFileSync('src/lib/admin.ts', updatedContent);

console.log('Successfully applied patch to admin.ts');
