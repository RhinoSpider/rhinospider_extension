const fs = require('fs');
const path = require('path');

// Directories to process
const dirs = [
  'declarations/consumer',
  'declarations/admin',
  'declarations/storage'
];

// Process each directory
dirs.forEach(dir => {
  const didJsPath = path.join(dir, path.basename(dir) + '.did.js');
  console.log(`Processing ${didJsPath}...`);
  
  if (fs.existsSync(didJsPath)) {
    let content = fs.readFileSync(didJsPath, 'utf8');
    
    // Check if the file uses ES modules syntax
    if (content.includes('export const')) {
      console.log(`Converting ${didJsPath} to CommonJS format...`);
      
      // Replace 'export const idlFactory' with 'const idlFactory'
      content = content.replace(/export const idlFactory/g, 'const idlFactory');
      
      // Replace 'export const init' with 'const init'
      content = content.replace(/export const init/g, 'const init');
      
      // Add module.exports at the end
      content += '\n\nmodule.exports = { idlFactory, init };\n';
      
      // Write the modified content back to the file
      fs.writeFileSync(didJsPath, content, 'utf8');
      console.log(`${didJsPath} converted successfully.`);
    } else {
      console.log(`${didJsPath} is already in CommonJS format.`);
    }
  } else {
    console.log(`${didJsPath} does not exist.`);
  }
});

console.log('All declaration files processed successfully.');
