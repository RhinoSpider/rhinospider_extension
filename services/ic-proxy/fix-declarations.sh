#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Remote server details
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"
IC_PROXY_DIR="/root/rhinospider-ic-proxy"

# Function to print section headers
section() {
  echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Function to print status messages
status() {
  echo -e "${GREEN}$1${NC}"
}

# Function to print warnings
warning() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

# Function to print errors
error() {
  echo -e "${RED}ERROR: $1${NC}"
  exit 1
}

# Check if we can connect to the server
section "Checking server connection"
if ! ssh -q ${REMOTE_USER}@${REMOTE_HOST} exit; then
  error "Cannot connect to server. Please check your credentials and try again."
fi
status "Server connection successful"

# Create script to fix declaration files
section "Creating script to fix declaration files"
cat > fix-declarations.js << 'EOF'
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
EOF

status "Script created successfully"

# Copy the script to the server
section "Copying script to server"
scp fix-declarations.js ${REMOTE_USER}@${REMOTE_HOST}:${IC_PROXY_DIR}/

# Run the script on the server
section "Running script on server"
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${IC_PROXY_DIR} && node fix-declarations.js"

# Restart the service
section "Restarting IC Proxy service"
status "Restarting IC Proxy service..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl restart ic-proxy.service"

# Check service status
status "Checking IC Proxy service status..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl status ic-proxy.service"

section "Fix Complete"
status "Declaration files have been converted to CommonJS format"
status "IC Proxy service should now be running correctly"
