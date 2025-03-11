#!/bin/bash
# Clean Deployment Script for RhinoSpider IC Proxy
# This script performs a clean deployment of the IC proxy service to the Digital Ocean server

# Configuration
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"
REMOTE_DIR="/root/rhinospider-ic-proxy"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== RhinoSpider IC Proxy Clean Deployment =====${NC}"
echo -e "Remote Host: ${YELLOW}$REMOTE_HOST${NC}"
echo -e "Remote Directory: ${YELLOW}$REMOTE_DIR${NC}"

# Create a deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="ic-proxy-package.tar.gz"

# Copy necessary files to the temp directory
cp -r "$SCRIPT_DIR"/*.js "$TEMP_DIR"/ 
cp -r "$SCRIPT_DIR"/package.json "$TEMP_DIR"/
cp -r "$SCRIPT_DIR"/package-lock.json "$TEMP_DIR"/
cp -r "$SCRIPT_DIR"/declarations "$TEMP_DIR"/

# Create the tarball
tar -czf "$PACKAGE_NAME" -C "$TEMP_DIR" .

# Create the PM2 configuration file
echo -e "${YELLOW}Creating PM2 configuration file...${NC}"
cat > ic-proxy-ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ic-proxy',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        IC_HOST: 'https://icp0.io',
        CONSUMER_CANISTER_ID: 'tgyl5-yyaaa-aaaaj-az4wq-cai',
        STORAGE_CANISTER_ID: 'i2gk7-oyaaa-aaaao-a37cq-cai',
        API_PASSWORD: 'ffGpA2saNS47qr'
      }
    },
    {
      name: 'direct-storage-server',
      script: 'direct-storage-server.js',
      env: {
        NODE_ENV: 'production',
        DIRECT_PORT: 3002,
        PROXY_HOST: 'localhost',
        PROXY_PORT: 3001,
        API_PASSWORD: 'ffGpA2saNS47qr'
      }
    }
  ]
};
EOF

# Create a verification script to check endpoints
cat > verify-endpoints.js << 'EOF'
const fetch = require('node-fetch');

async function checkEndpoint(endpoint, method = 'GET', data = null) {
  const url = `http://localhost:3001${endpoint}`;
  console.log(`Checking ${method} ${url}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ffGpA2saNS47qr',
      'X-Device-ID': 'verify-script'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    return response.status;
  } catch (error) {
    console.error(`Error checking ${endpoint}: ${error.message}`);
    return 500;
  }
}

async function verifyEndpoints() {
  console.log('Verifying IC Proxy endpoints...');
  
  // Check health endpoint
  await checkEndpoint('/api/health');
  
  // Check consumer endpoints
  await checkEndpoint('/api/register-device', 'POST', { deviceId: 'verify-script' });
  await checkEndpoint('/api/consumer-submit', 'POST', { 
    url: 'https://example.com/verify',
    content: '<html><body>Test</body></html>',
    topicId: 'topic_test',
    deviceId: 'verify-script',
    status: 'completed'
  });
  
  // Check other endpoints
  await checkEndpoint('/api/topics', 'POST', {});
  
  console.log('Endpoint verification completed');
}

verifyEndpoints().catch(console.error);
EOF

# Create a remote setup script
cat > remote-setup.sh << 'EOF'
#!/bin/bash

# Stop and remove existing services
pm2 stop all
pm2 delete all

# Clean up existing directory
rm -rf /root/rhinospider-ic-proxy
mkdir -p /root/rhinospider-ic-proxy

# Extract the package
tar -xzf ic-proxy-package.tar.gz -C /root/rhinospider-ic-proxy

# Install dependencies
cd /root/rhinospider-ic-proxy
npm install --production

# Start services with PM2
pm2 start ic-proxy-ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup

# Verify endpoints
node verify-endpoints.js

# Show running services
pm2 list
EOF

# Deploy to the server
echo -e "${YELLOW}Deploying to server...${NC}"

# Step 1: Upload the package
echo -e "${YELLOW}Step 1: Uploading package to the server...${NC}"
scp "$PACKAGE_NAME" "$REMOTE_USER@$REMOTE_HOST:/root/"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload the package. Please check your connection and credentials.${NC}"
  exit 1
fi

# Step 2: Upload PM2 configuration
echo -e "${YELLOW}Step 2: Uploading PM2 configuration...${NC}"
scp ic-proxy-ecosystem.config.js "$REMOTE_USER@$REMOTE_HOST:/root/"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload PM2 configuration. Please check your connection and credentials.${NC}"
  exit 1
fi

# Step 3: Upload verification script
echo -e "${YELLOW}Step 3: Uploading verification script...${NC}"
scp verify-endpoints.js "$REMOTE_USER@$REMOTE_HOST:/root/"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload verification script. Please check your connection and credentials.${NC}"
  exit 1
fi

# Step 4: Upload and execute the remote setup script
echo -e "${YELLOW}Step 4: Uploading remote setup script...${NC}"
scp remote-setup.sh "$REMOTE_USER@$REMOTE_HOST:/root/"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload remote setup script. Please check your connection and credentials.${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 5: Executing remote setup script...${NC}"
ssh "$REMOTE_USER@$REMOTE_HOST" "chmod +x /root/remote-setup.sh && /root/remote-setup.sh"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to execute remote setup script. Please check the server logs.${NC}"
  exit 1
fi

# Clean up local files
echo -e "${YELLOW}Cleaning up local files...${NC}"
rm -rf "$TEMP_DIR" "$PACKAGE_NAME" "ic-proxy-ecosystem.config.js" "remote-setup.sh" "verify-endpoints.js"

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "The IC proxy service has been deployed to $REMOTE_HOST."
echo -e "You can check the status with: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 list'"
