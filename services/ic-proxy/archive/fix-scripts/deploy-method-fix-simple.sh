#!/bin/bash
# Simple Method Fix Deployment Script
# This script deploys the method name fix to the Digital Ocean server

# Configuration - REPLACE THESE VALUES
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"  # Digital Ocean IP

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== RhinoSpider IC Proxy Method Fix Deployment =====${NC}"

# Create the fix script
cat > fix-consumer-method.js << 'EOF'
// Fix Consumer Method Script
// This script fixes the method name in server.js and direct-storage-endpoint.js

const fs = require('fs');
const path = require('path');
const files = ['server.js', 'direct-storage-endpoint.js'];
const timestamp = Date.now();

// Process each file
files.forEach(filename => {
  if (!fs.existsSync(filename)) {
    console.log(`File ${filename} not found, skipping.`);
    return;
  }
  
  console.log(`Processing ${filename}...`);
  
  // Read file content
  const content = fs.readFileSync(filename, 'utf8');
  
  // Check if the incorrect method name exists
  const incorrectCount = (content.match(/submitScrapedContent/g) || []).length;
  console.log(`Found ${incorrectCount} occurrences of 'submitScrapedContent' in ${filename}`);
  
  if (incorrectCount > 0) {
    // Create backup
    const backupFile = `${filename}.bak.${timestamp}`;
    console.log(`Creating backup: ${backupFile}`);
    fs.writeFileSync(backupFile, content);
    
    // Replace method name
    const updatedContent = content.replace(/submitScrapedContent/g, 'submitScrapedData');
    
    // Write updated content
    console.log(`Writing updated content to ${filename}`);
    fs.writeFileSync(filename, updatedContent);
    
    // Verify replacement
    const correctCount = (updatedContent.match(/submitScrapedData/g) || []).length;
    console.log(`After replacement: ${correctCount} occurrences of 'submitScrapedData' in ${filename}`);
  } else {
    console.log(`No occurrences of incorrect method name in ${filename}, no changes needed.`);
  }
});

console.log('Fix completed successfully!');
EOF

# Create the remote execution script
cat > remote-fix.sh << 'EOF'
#!/bin/bash
# Remote Fix Execution Script

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Applying Method Fix on Server =====${NC}"

# Navigate to the IC proxy directory
cd /root/rhinospider-ic-proxy || { echo -e "${RED}IC proxy directory not found!${NC}"; exit 1; }

# Apply the fix
echo -e "${YELLOW}Applying method name fix...${NC}"
node fix-consumer-method.js

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to apply the fix. Check the logs for details.${NC}"
  exit 1
fi

# Restart the service
echo -e "${YELLOW}Restarting the IC proxy service...${NC}"
pm2 restart ic-proxy

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to restart the service. Please check manually.${NC}"
  exit 1
fi

echo -e "${GREEN}Method fix applied and service restarted successfully!${NC}"
echo -e "${GREEN}Please verify that the extension is now working correctly.${NC}"
EOF

# Make the remote script executable
chmod +x remote-fix.sh

# Step 1: Upload the fix script to the server
echo -e "${YELLOW}Step 1: Uploading fix script to the server...${NC}"
scp fix-consumer-method.js "$REMOTE_USER@$REMOTE_HOST:/root/rhinospider-ic-proxy/"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload the fix script. Please check your connection and credentials.${NC}"
  exit 1
fi

# Step 2: Upload the remote execution script
echo -e "${YELLOW}Step 2: Uploading remote execution script...${NC}"
scp remote-fix.sh "$REMOTE_USER@$REMOTE_HOST:/root/"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload the remote execution script. Please check your connection and credentials.${NC}"
  exit 1
fi

# Step 3: Execute the fix on the server
echo -e "${YELLOW}Step 3: Executing the fix on the server...${NC}"
ssh "$REMOTE_USER@$REMOTE_HOST" "chmod +x /root/remote-fix.sh && /root/remote-fix.sh"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to execute the fix on the server. Please check the server logs.${NC}"
  exit 1
fi

# Step 4: Clean up local files
echo -e "${YELLOW}Step 4: Cleaning up local files...${NC}"
rm fix-consumer-method.js remote-fix.sh

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}The consumer canister method name has been fixed on the server.${NC}"
echo -e "${YELLOW}Important: Before running this script, you need to:${NC}"
echo -e "${YELLOW}1. Replace 'your-digital-ocean-ip' with your actual server IP${NC}"
echo -e "${YELLOW}2. Make sure you have SSH access to the server${NC}"
echo -e "${YELLOW}3. Make the script executable with: chmod +x deploy-method-fix-simple.sh${NC}"
