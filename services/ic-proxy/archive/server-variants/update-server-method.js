// Update Server Method
// This script updates the server.js file to use the correct submitScrapedData method

const fs = require('fs');
const path = require('path');

// Path to the server.js file
const serverFilePath = path.join(__dirname, 'server.js');

// Read the server.js file
console.log(`Reading server file: ${serverFilePath}`);
let serverContent = fs.readFileSync(serverFilePath, 'utf8');

// Count occurrences of the incorrect method name
const incorrectMethodCount = (serverContent.match(/submitScrapedContent/g) || []).length;
console.log(`Found ${incorrectMethodCount} occurrences of 'submitScrapedContent'`);

// Replace all occurrences of submitScrapedContent with submitScrapedData
const updatedContent = serverContent.replace(/submitScrapedContent/g, 'submitScrapedData');

// Count occurrences of the correct method name after replacement
const correctMethodCount = (updatedContent.match(/submitScrapedData/g) || []).length;
console.log(`After replacement: ${correctMethodCount} occurrences of 'submitScrapedData'`);

// Create a backup of the original file
const backupFilePath = `${serverFilePath}.bak.${Date.now()}`;
console.log(`Creating backup at: ${backupFilePath}`);
fs.writeFileSync(backupFilePath, serverContent);

// Write the updated content back to the server.js file
console.log(`Writing updated content to: ${serverFilePath}`);
fs.writeFileSync(serverFilePath, updatedContent);

// Also check and update the direct-storage-endpoint.js file
const directStorageFilePath = path.join(__dirname, 'direct-storage-endpoint.js');
if (fs.existsSync(directStorageFilePath)) {
  console.log(`Reading direct storage file: ${directStorageFilePath}`);
  let directStorageContent = fs.readFileSync(directStorageFilePath, 'utf8');
  
  // Count occurrences of the incorrect method name
  const dsIncorrectMethodCount = (directStorageContent.match(/submitScrapedContent/g) || []).length;
  console.log(`Found ${dsIncorrectMethodCount} occurrences of 'submitScrapedContent' in direct-storage-endpoint.js`);
  
  if (dsIncorrectMethodCount > 0) {
    // Replace all occurrences of submitScrapedContent with submitScrapedData
    const updatedDsContent = directStorageContent.replace(/submitScrapedContent/g, 'submitScrapedData');
    
    // Create a backup of the original file
    const dsBackupFilePath = `${directStorageFilePath}.bak.${Date.now()}`;
    console.log(`Creating backup at: ${dsBackupFilePath}`);
    fs.writeFileSync(dsBackupFilePath, directStorageContent);
    
    // Write the updated content back to the file
    console.log(`Writing updated content to: ${directStorageFilePath}`);
    fs.writeFileSync(directStorageFilePath, updatedDsContent);
  }
}

console.log('Update completed successfully!');
console.log('Please restart the server for changes to take effect.');
